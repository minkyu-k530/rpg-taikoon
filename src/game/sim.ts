/**
 * 게임 시뮬레이션. React와 Three.js에 의존하지 않는 순수 로직이다.
 * 렌더러는 매 프레임 이 객체의 값을 읽기만 한다.
 */
import { CONFIG, LAYOUT, queueSlot, rand, upgradeCost, type UpgradeKind } from './config';
import { favorStage, RESIDENTS, RESIDENT_BY_ID, unlockedLines, type Look, type ResidentDef } from './residents';
import * as storage from './save';
import { rollWeather, WEATHER, type Weather } from './weather';

export type Phase = 'walk' | 'browse' | 'queue' | 'serve' | 'eat' | 'leave';
export type Intent = 'pass' | 'browse' | 'buy';
export type Menu = 'bungeoppang' | 'oden';

export interface Villager {
  id: number;
  residentId: string;
  look: Look;
  /** 이름이 보이려면 3회 이상 와야 한다 */
  name: string | null;
  x: number;
  z: number;
  vx: number;
  vz: number;
  speed: number;
  dir: 1 | -1;
  laneZ: number;
  phase: Phase;
  intent: Intent;
  menu: Menu;
  qty: number;
  timer: number;
  patience: number;
  decided: boolean;
  spotX: number;
  spotZ: number;
  facing: number;
  /** 걷기 애니메이션 위상 */
  anim: number;
  carrying: boolean;
  /** 머리 위에 띄울 대사. null이면 없음 */
  speech: string | null;
  speechUntil: number;
}

export interface Mold {
  baking: boolean;
  t: number;
  flipped: boolean;
  burnt: boolean;
  /** 다음 반죽까지 남은 시간. 틀이 전부 동시에 익으면 뒤집기가 한꺼번에 몰린다 */
  cooldown: number;
}

export interface Unlock {
  residentId: string;
  name: string;
  stage: number;
  stageLabel: string;
}

export interface DayReport {
  day: number;
  customers: number;
  sold: number;
  revenue: number;
  cost: number;
  profit: number;
  missed: number;
  shortfall: number;
  unlocks: Unlock[];
  weather: Weather;
  tomorrow: Weather;
}

export interface Upgrades {
  mold: number;
  sign: number;
  heater: number;
  oden: number;
}

const SEP_RADIUS_SQ = 0.81;
/** 말풍선 표시 시간(초) */
const SPEECH_TIME = 4.5;

/** 저장된 문자열을 날씨로 좁힌다. 손상된 값이 들어와도 기본값으로 떨어진다 */
function isWeather(v: string | undefined): v is Weather {
  return v === 'clear' || v === 'snow' || v === 'rain';
}

export class Sim {
  villagers: Villager[] = [];
  queue: Villager[] = [];
  molds: Mold[] = [];
  tray: { burnt: boolean }[] = [];

  money: number = CONFIG.startMoney;
  day = 1;
  dayTime = 0;
  open = true;
  report: DayReport | null = null;

  /** 오늘 날씨. 내일 날씨는 마감 때 미리 보여 준다 */
  weather: Weather = rollWeather();
  tomorrow: Weather = rollWeather();

  upg: Upgrades = { mold: 0, sign: 0, heater: 0, oden: 0 };
  /** shortfall: 손님이 원했지만 재고가 없어 못 준 개수. 날씨와 업그레이드 압력을 보여 주는 지표 */
  stats = { customers: 0, sold: 0, revenue: 0, cost: 0, missed: 0, shortfall: 0 };

  /** 주민 id별 누적 구매 횟수. 이 숫자가 단골 관계의 전부다 */
  visits: Record<string, number> = {};
  /** 오늘 올라간 단계 */
  todayUnlocks: Unlock[] = [];

  /** 시작 후 누적 시간(초). 말풍선 타이머에 쓴다 */
  clock = 0;

  private nextId = 1;
  private spawnTimer = 0;

  constructor() {
    this.resetMolds();
    this.restore();
  }

  // ---------------------------------------------------------------- 저장

  private restore() {
    const data = storage.load();
    if (!data) return;
    this.day = data.day;
    this.money = data.money;
    this.upg = { ...this.upg, ...data.upg };
    this.visits = { ...data.visits };
    if (isWeather(data.weather)) this.weather = data.weather;
    if (isWeather(data.tomorrow)) this.tomorrow = data.tomorrow;
    this.resetMolds();
  }

  persist() {
    storage.save({
      day: this.day,
      money: this.money,
      upg: this.upg,
      visits: this.visits,
      weather: this.weather,
      tomorrow: this.tomorrow,
    });
  }

  resetProgress() {
    storage.clear();
    this.day = 1;
    this.money = CONFIG.startMoney;
    this.upg = { mold: 0, sign: 0, heater: 0, oden: 0 };
    this.visits = {};
    this.nextDay();
    this.day = 1;
  }

  // ---------------------------------------------------------------- 틀

  get moldCount() {
    return CONFIG.baseMolds + this.upg.mold;
  }

  get trayCap() {
    return 6 + this.moldCount;
  }

  private resetMolds() {
    this.molds = Array.from({ length: this.moldCount }, (_, i) => ({
      baking: false,
      t: 0,
      flipped: false,
      burnt: false,
      // 틀마다 시작을 어긋나게 둬야 뒤집기가 한 번에 몰리지 않는다
      cooldown: i * (CONFIG.bake.time / this.moldCount),
    }));
  }

  // ---------------------------------------------------------------- 루프

  tick(dt: number) {
    if (!this.open) return;
    // 탭 전환 등으로 dt가 튀면 시뮬레이션이 한 번에 점프한다. 상한을 건다
    dt = Math.min(dt, 0.1);

    this.clock += dt;
    this.dayTime += dt;
    this.updateMolds(dt);
    this.updateSpawn(dt);
    for (let i = this.villagers.length - 1; i >= 0; i--) {
      this.updateVillager(this.villagers[i], dt, i);
    }
    if (this.dayTime >= CONFIG.dayLength) this.closeDay();
  }

  private updateMolds(dt: number) {
    for (const m of this.molds) {
      if (!m.baking) {
        if (m.cooldown > 0) {
          m.cooldown -= dt;
          continue;
        }
        const canBake = this.tray.length < this.trayCap && this.money >= CONFIG.bake.cost;
        if (canBake) {
          m.baking = true;
          m.t = 0;
          m.flipped = false;
          m.burnt = false;
          this.money -= CONFIG.bake.cost;
          this.stats.cost += CONFIG.bake.cost;
        }
        continue;
      }
      m.t += dt;
      if (!m.flipped && m.t >= CONFIG.bake.flipWindow[1]) m.burnt = true;
      if (m.t >= CONFIG.bake.time) {
        this.tray.push({ burnt: m.burnt });
        m.baking = false;
        m.t = 0;
        m.cooldown = rand(0.4, 1.6);
      }
    }
  }

  /** 뒤집기. 창 밖에서 눌러도 벌점은 없다 — 이 게임에 실패는 없다 */
  flip(index: number) {
    const m = this.molds[index];
    if (!m || !m.baking || m.flipped) return false;
    const [a, b] = CONFIG.bake.flipWindow;
    if (m.t < a || m.t >= b) return false;
    m.flipped = true;
    return true;
  }

  // ---------------------------------------------------------------- 손님 생성

  /** 가족 같은 사이가 된 단골은 다른 손님을 데려온다 (GDD 7-2) */
  private get referralBonus() {
    let bonus = 0;
    for (const [id, v] of Object.entries(this.visits)) {
      if (favorStage(v) >= 4 && RESIDENT_BY_ID.get(id)?.name) bonus += 0.08;
    }
    return bonus;
  }

  private updateSpawn(dt: number) {
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;
    const rate = (1 + 0.3 * this.upg.sign + this.referralBonus) * WEATHER[this.weather].spawn;
    this.spawnTimer = (CONFIG.spawnInterval / rate) * rand(0.6, 1.4);
    if (this.villagers.length >= CONFIG.maxVillagers) return;
    const def = this.pickResident();
    if (def) this.villagers.push(this.makeVillager(def));
  }

  /**
   * 명부에서 한 명 뽑는다. 이미 거리에 있는 사람은 제외한다.
   * 단골 후보에 가중치를 더 주지 않으면 얼굴이 익을 만큼 자주 오지 않는다.
   */
  private pickResident(): ResidentDef | null {
    const present = new Set(this.villagers.map((v) => v.residentId));
    const pool = RESIDENTS.filter((r) => !present.has(r.id));
    if (pool.length === 0) return null;
    const total = pool.reduce((s, r) => s + r.weight, 0);
    let roll = Math.random() * total;
    for (const r of pool) {
      roll -= r.weight;
      if (roll <= 0) return r;
    }
    return pool[pool.length - 1];
  }

  private makeVillager(def: ResidentDef): Villager {
    const dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
    const roll = Math.random();
    const visits = this.visits[def.id] ?? 0;
    const stage = favorStage(visits);
    // 단골일수록 사러 올 확률이 높다. 관계가 수치로 돌아오는 유일한 지점
    const buyChance =
      (CONFIG.buyChance + CONFIG.heaterBuyBonus * this.upg.heater + (def.name ? stage * 0.08 : 0)) *
      WEATHER[this.weather].buy;
    const intent: Intent =
      roll < buyChance ? 'buy' : roll < buyChance + CONFIG.browseChance ? 'browse' : 'pass';
    const menu: Menu =
      this.upg.oden > 0 && Math.random() < CONFIG.odenPickChance ? 'oden' : 'bungeoppang';
    return {
      id: this.nextId++,
      residentId: def.id,
      look: def.look,
      name: def.name && stage >= 1 ? def.name : null,
      x: dir === 1 ? LAYOUT.minX : LAYOUT.maxX,
      z: rand(LAYOUT.laneMinZ, LAYOUT.laneMaxZ),
      vx: 0,
      vz: 0,
      speed: def.look.speed,
      dir,
      laneZ: rand(LAYOUT.laneMinZ, LAYOUT.laneMaxZ),
      phase: 'walk',
      intent,
      menu,
      qty: 1 + ((Math.random() * 3) | 0),
      timer: 0,
      patience: CONFIG.patience,
      decided: false,
      spotX: 0,
      spotZ: 0,
      facing: dir === 1 ? Math.PI / 2 : -Math.PI / 2,
      anim: Math.random() * 10,
      carrying: false,
      speech: null,
      speechUntil: 0,
    };
  }

  // ---------------------------------------------------------------- 보행

  /**
   * 목표를 향해 이동. 반환값은 목표까지 남은 거리.
   * 줄을 선 손님끼리는 분리력을 거의 끈다. 켜 두면 서로 밀어내서
   * 맨 앞 손님이 카운터에 닿지 못하고 영원히 제자리에서 진동한다.
   */
  private move(v: Villager, dt: number, tx: number, tz: number, slow = false): number {
    const dx = tx - v.x;
    const dz = tz - v.z;
    const d = Math.hypot(dx, dz) || 1e-6;
    const sp = v.speed * (slow ? 0.55 : 1);
    let wx = (dx / d) * sp;
    let wz = (dz / d) * sp;

    const lining = v.phase === 'queue' || v.phase === 'serve';
    const sepForce = lining ? 0.12 : 0.85;
    // 분리력: 서로 비껴가게 만든다. 이게 없으면 사람들이 겹쳐 지나간다
    for (const o of this.villagers) {
      if (o === v) continue;
      const ox = v.x - o.x;
      const oz = v.z - o.z;
      const d2 = ox * ox + oz * oz;
      if (d2 < SEP_RADIUS_SQ && d2 > 1e-4) {
        const inv = 1 / Math.sqrt(d2);
        wx += ox * inv * sepForce;
        wz += oz * inv * sepForce;
      }
    }

    const k = Math.min(1, dt * 5);
    v.vx += (wx - v.vx) * k;
    v.vz += (wz - v.vz) * k;
    v.x += v.vx * dt;
    v.z += v.vz * dt;

    const spd = Math.hypot(v.vx, v.vz);
    if (spd > 0.08) v.facing = Math.atan2(v.vx, v.vz);
    v.anim += spd * dt * 3.4;
    return d;
  }

  private exitX(v: Villager) {
    return v.dir === 1 ? LAYOUT.maxX + 2 : LAYOUT.minX - 2;
  }

  private remove(index: number) {
    const v = this.villagers[index];
    const q = this.queue.indexOf(v);
    if (q >= 0) this.queue.splice(q, 1);
    this.villagers.splice(index, 1);
  }

  private updateVillager(v: Villager, dt: number, index: number) {
    if (v.speech && this.clock > v.speechUntil) v.speech = null;

    switch (v.phase) {
      case 'walk': {
        this.move(v, dt, this.exitX(v), v.laneZ);
        if (!v.decided && Math.abs(v.x - LAYOUT.stall.x) < 5.5) {
          v.decided = true;
          if (v.intent === 'buy' && this.queue.length < CONFIG.queueMax) {
            v.phase = 'queue';
            this.queue.push(v);
          } else if (v.intent === 'browse') {
            v.phase = 'browse';
            v.timer = rand(2.5, 5.5);
            v.spotX = LAYOUT.stall.x + rand(-2.6, 1.4);
            v.spotZ = rand(-1.9, -1.4);
          }
        }
        if (v.x > LAYOUT.maxX + 1.5 || v.x < LAYOUT.minX - 1.5) this.remove(index);
        break;
      }

      case 'browse': {
        const d = this.move(v, dt, v.spotX, v.spotZ, true);
        if (d < 0.35) {
          v.vx *= 0.8;
          v.vz *= 0.8;
          v.facing = Math.atan2(LAYOUT.stall.x - v.x, LAYOUT.stall.z - v.z);
          v.timer -= dt;
          if (v.timer <= 0) {
            // 구경하다 마음이 바뀌는 사람이 있다
            if (this.tray.length > 0 && Math.random() < 0.25 && this.queue.length < CONFIG.queueMax) {
              v.phase = 'queue';
              v.intent = 'buy';
              this.queue.push(v);
            } else {
              v.phase = 'walk';
            }
          }
        }
        break;
      }

      case 'queue': {
        const idx = this.queue.indexOf(v);
        const slot = queueSlot(Math.max(0, idx));
        const d = this.move(v, dt, slot.x, slot.z, true);
        if (d < 0.55) {
          v.facing = Math.atan2(LAYOUT.stall.x - v.x, LAYOUT.stall.z - v.z);
          if (idx === 0) {
            v.phase = 'serve';
            v.timer = 0.7;
          }
        }
        break;
      }

      case 'serve': {
        v.vx *= 0.85;
        v.vz *= 0.85;
        v.timer -= dt;
        if (v.timer > 0) break;
        if (this.serveFront(v)) {
          const q = this.queue.indexOf(v);
          if (q >= 0) this.queue.splice(q, 1);
          v.phase = 'eat';
          v.carrying = true;
          v.timer = rand(5, 9) * WEATHER[this.weather].linger;
          v.spotX = LAYOUT.stall.x + rand(-5, 3);
          v.spotZ = rand(-3.4, -2.6);
        } else {
          // 재고가 없다. 기다려 주다가 조용히 떠난다 (호감도 변화 없음)
          v.patience -= dt;
          if (v.patience <= 0) {
            this.stats.missed++;
            this.stats.shortfall += v.qty;
            const q = this.queue.indexOf(v);
            if (q >= 0) this.queue.splice(q, 1);
            v.phase = 'leave';
          }
        }
        break;
      }

      case 'eat': {
        const d = this.move(v, dt, v.spotX, v.spotZ, true);
        if (d < 0.4) {
          v.vx *= 0.8;
          v.vz *= 0.8;
          v.facing = Math.atan2(LAYOUT.stall.x - v.x, LAYOUT.stall.z - v.z);
          v.timer -= dt;
          if (v.timer <= 0) {
            v.carrying = false;
            v.phase = 'leave';
          }
        }
        break;
      }

      case 'leave': {
        this.move(v, dt, this.exitX(v), v.laneZ);
        if (v.x > LAYOUT.maxX + 1.5 || v.x < LAYOUT.minX - 1.5) this.remove(index);
        break;
      }
    }
  }

  /** 맨 앞 손님에게 판매. 팔았으면 true */
  private serveFront(v: Villager): boolean {
    let n = 0;
    let revenue = 0;

    if (v.menu === 'oden') {
      n = v.qty;
      revenue = n * CONFIG.oden.price;
      this.money += revenue - n * CONFIG.oden.cost;
      this.stats.cost += n * CONFIG.oden.cost;
    } else {
      if (this.tray.length === 0) return false;
      n = Math.min(v.qty, this.tray.length);
      this.stats.shortfall += v.qty - n;
      for (let i = 0; i < n; i++) {
        const item = this.tray.shift()!;
        revenue += item.burnt ? CONFIG.bake.burntPrice : CONFIG.bake.price;
      }
      this.money += revenue;
    }

    this.stats.revenue += revenue;
    this.stats.sold += n;
    this.stats.customers++;
    this.recordVisit(v);
    return true;
  }

  /** 관계 갱신. 단계가 오르면 대사가 열린다 */
  private recordVisit(v: Villager) {
    const def = RESIDENT_BY_ID.get(v.residentId);
    if (!def) return;
    const before = this.visits[v.residentId] ?? 0;
    const after = before + 1;
    this.visits[v.residentId] = after;
    if (!def.name) return;

    const prevStage = favorStage(before);
    const stage = favorStage(after);
    if (stage > prevStage) {
      const unlock: Unlock = {
        residentId: def.id,
        name: def.name,
        stage,
        stageLabel: ['모르는 사람', '눈에 익음', '단골', '아는 사이', '가족 같은'][stage],
      };
      this.todayUnlocks.push(unlock);
      v.name = def.name;
    }

    const lines = unlockedLines(def, after);
    if (lines.length > 0 && Math.random() < 0.75) {
      v.speech = lines[(Math.random() * lines.length) | 0];
      v.speechUntil = this.clock + SPEECH_TIME;
    }
  }

  // ---------------------------------------------------------------- 하루

  private closeDay() {
    this.open = false;
    this.report = {
      day: this.day,
      customers: this.stats.customers,
      sold: this.stats.sold,
      revenue: this.stats.revenue,
      cost: this.stats.cost,
      profit: this.stats.revenue - this.stats.cost,
      missed: this.stats.missed,
      shortfall: this.stats.shortfall,
      unlocks: this.todayUnlocks,
      weather: this.weather,
      tomorrow: this.tomorrow,
    };
    this.persist();
  }

  nextDay() {
    this.day++;
    this.weather = this.tomorrow;
    this.tomorrow = rollWeather();
    this.dayTime = 0;
    this.open = true;
    this.report = null;
    this.stats = { customers: 0, sold: 0, revenue: 0, cost: 0, missed: 0, shortfall: 0 };
    this.todayUnlocks = [];
    this.villagers = [];
    this.queue = [];
    this.tray = [];
    this.resetMolds();
    this.persist();
  }

  // ---------------------------------------------------------------- 업그레이드

  canBuy(kind: UpgradeKind) {
    const level = this.upg[kind];
    if (level >= CONFIG.upgrades[kind].max) return false;
    return this.money >= upgradeCost(kind, level);
  }

  buy(kind: UpgradeKind) {
    if (!this.canBuy(kind)) return false;
    this.money -= upgradeCost(kind, this.upg[kind]);
    this.upg[kind]++;
    if (kind === 'mold') this.resetMolds();
    this.persist();
    return true;
  }
}
