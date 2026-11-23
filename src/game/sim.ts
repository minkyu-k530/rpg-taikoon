/**
 * 게임 시뮬레이션. React와 Three.js에 의존하지 않는 순수 로직이다.
 * 렌더러는 매 프레임 이 객체의 값을 읽기만 한다.
 */
import {
  CONFIG,
  emptyUpgrades,
  LAYOUT,
  queueSlot,
  rand,
  upgradeCost,
  type UpgradeKind,
  type Upgrades,
} from './config';
import { Delivery } from './delivery';
import { favorStage, RESIDENTS, RESIDENT_BY_ID, unlockedLines, type Look, type ResidentDef } from './residents';
import * as storage from './save';
import { rollWeather, WEATHER, type Weather } from './weather';
import { chapterForDay, CHAPTERS, FINAL_DAY, SCENE_BY_DAY, type Chapter, type Scene } from './story';
import { HANDOVER_NEEDS, MOVE_PROFIT, type EndingId } from './endings';
import { SEASONS } from './season';
import type { SimEvent } from './audio';

export type Phase = 'walk' | 'browse' | 'queue' | 'serve' | 'eat' | 'leave';
export type Intent = 'pass' | 'browse' | 'buy';
export type Menu = 'bungeoppang' | 'oden' | 'tteok';

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
  /** 알바가 이 반죽에 손을 댔는가. 한 번만 시도한다 */
  helperTried: boolean;
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

export type { Upgrades } from './config';

/** 배달 한 번의 결과 */
export interface DeliveryResult {
  /** 받은 돈 */
  revenue: number;
  /** 무사히 전한 개수 */
  delivered: number;
  /** 길에서 잃은 개수 */
  lost: number;
  /** 들고 나간 개수 */
  carried: number;
  clientId: string;
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

  /** 80일 동안 벌어들인 누적 순이익. 결말 B 조건 */
  totalProfit = 0;
  /** 마지막 밤에 결말을 고르는 중 */
  choosingEnding = false;
  /** 고른 결말. null이면 아직 */
  ending: EndingId | null = null;
  /** 지금까지 본 결말들. 2회차에서 회색으로 남는다 */
  endingsSeen: Partial<Record<EndingId, true>> = {};

  /** 오늘 날씨. 내일 날씨는 마감 때 미리 보여 준다 */
  weather: Weather = rollWeather(SEASONS[CHAPTERS[0].season].weather);
  tomorrow: Weather = rollWeather(SEASONS[CHAPTERS[0].season].weather);

  upg: Upgrades = emptyUpgrades();
  /** shortfall: 손님이 원했지만 재고가 없어 못 준 개수. 날씨와 업그레이드 압력을 보여 주는 지표 */
  stats = { customers: 0, sold: 0, revenue: 0, cost: 0, missed: 0, shortfall: 0 };

  /** 떡볶이 솥. 한 번 끓이면 batch 그릇이 나오고, 다 팔리면 다시 끓인다 */
  tteokPot = { cooking: false, t: 0, servings: 0 };

  /** 주민 id별 누적 구매 횟수. 이 숫자가 단골 관계의 전부다 */
  visits: Record<string, number> = {};
  /** 오늘 올라간 단계 */
  todayUnlocks: Unlock[] = [];

  /** 시작 후 누적 시간(초). 말풍선 타이머에 쓴다 */
  clock = 0;

  /** 지금 재생 중인 컷신. 시뮬레이션은 이것과 무관하게 계속 돈다 */
  scene: Scene | null = null;
  /** 이미 본 컷신. 2회차에서 건너뛰는 데 쓴다 */
  seenScenes: Record<string, true> = {};

  /**
   * 지금 나가 있는 배달. null이면 가게에 있다.
   * 배달 중에도 아래 tick()은 그대로 돈다 — 자리를 비우는 대가가 이 모드의 핵심이다 (docs/DELIVERY.md)
   */
  delivery: Delivery | null = null;
  /** 오늘 배달을 다녀왔는가. 하루 한 번 */
  deliveredToday = false;
  /** 방금 돌아온 배달의 결과. 화면에 띄워 둘 동안만 남는다 */
  deliveryResult: DeliveryResult | null = null;

  /**
   * 일어난 일을 바깥에 알린다. 지금은 소리만 듣고 있다.
   * 시뮬레이션이 오디오를 import 해서 직접 울리면 테스트에서 분리가 안 된다
   */
  onEvent: ((e: SimEvent) => void) | null = null;

  private emit(e: SimEvent) {
    this.onEvent?.(e);
  }

  private nextId = 1;
  private spawnTimer = 0;

  constructor() {
    this.resetMolds();
    this.restore();
    this.maybeStartScene();
  }

  get chapter(): Chapter {
    return chapterForDay(this.day);
  }

  /** 그날의 컷신이 있고 아직 본 적 없으면 띄운다 */
  private maybeStartScene() {
    const s = SCENE_BY_DAY.get(this.day);
    if (s && !this.seenScenes[s.id]) this.scene = s;
  }

  endScene() {
    if (this.scene) this.seenScenes[this.scene.id] = true;
    this.scene = null;
    this.persist();
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
    this.seenScenes = { ...data.seenScenes };
    this.totalProfit = data.totalProfit ?? 0;
    this.endingsSeen = { ...data.endingsSeen };
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
      seenScenes: this.seenScenes,
      totalProfit: this.totalProfit,
      endingsSeen: this.endingsSeen,
    });
  }

  /** 설정의 '저장 지우기'. 기록까지 전부 없앤다 */
  resetProgress() {
    storage.clear();
    this.visits = {};
    this.seenScenes = {};
    this.endingsSeen = {};
    this.newRun();
    storage.clear();
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
      helperTried: false,
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
    this.updateTteok(dt);
    this.delivery?.tick(dt);
    this.updateSpawn(dt);
    for (let i = this.villagers.length - 1; i >= 0; i--) {
      this.updateVillager(this.villagers[i], dt, i);
    }
    if (this.dayTime >= CONFIG.dayLength) this.closeDay();
  }

  /** 떡볶이는 뒤집기 같은 조작이 없다. 오래 끓고, 다 팔리면 다시 끓는다 */
  private updateTteok(dt: number) {
    if (this.upg.tteok === 0) return;
    const pot = this.tteokPot;
    if (pot.cooking) {
      pot.t += dt;
      if (pot.t >= CONFIG.tteok.time) {
        pot.cooking = false;
        pot.t = 0;
        pot.servings = CONFIG.tteok.batch;
      }
      return;
    }
    if (pot.servings > 0) return;
    const batchCost = CONFIG.tteok.cost * CONFIG.tteok.batch;
    if (this.money < batchCost) return;
    this.money -= batchCost;
    this.stats.cost += batchCost;
    pot.cooking = true;
    pot.t = 0;
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
          m.helperTried = false;
          this.money -= CONFIG.bake.cost;
          this.stats.cost += CONFIG.bake.cost;
        }
        continue;
      }
      m.t += dt;
      this.tryHelperFlip(m);
      if (!m.flipped && m.t >= CONFIG.bake.flipWindow[1]) m.burnt = true;
      if (m.t >= CONFIG.bake.time) {
        this.tray.push({ burnt: m.burnt });
        m.baking = false;
        m.t = 0;
        m.cooldown = rand(0.4, 1.6);
      }
    }
  }

  /**
   * 알바의 자동 뒤집기.
   * Lv1은 가끔 놓친다. 그래야 직접 뒤집는 쪽이 여전히 이득이고,
   * 플레이어가 "구경만 해도 되는 상태"를 돈으로 사는 선택이 의미를 갖는다.
   */
  private tryHelperFlip(m: Mold) {
    if (this.upg.helper === 0 || m.flipped || m.helperTried) return;
    const [start, end] = CONFIG.bake.flipWindow;
    const reactAt = Math.min(start + CONFIG.helperDelay, end - 0.3);
    if (m.t < reactAt) return;
    m.helperTried = true;
    if (Math.random() < CONFIG.helperAccuracy[this.upg.helper]) {
      m.flipped = true;
      this.emit('flip');
    }
  }

  /** 뒤집기. 창 밖에서 눌러도 벌점은 없다 — 이 게임에 실패는 없다 */
  flip(index: number) {
    // 배달 나가 있으면 뒤집을 사람이 없다. 알바가 있으면 알바가 대신한다
    if (this.delivery) return false;
    const m = this.molds[index];
    if (!m || !m.baking || m.flipped) return false;
    const [a, b] = CONFIG.bake.flipWindow;
    if (m.t < a || m.t >= b) return false;
    m.flipped = true;
    this.emit('flip');
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

  /** 꾸미기가 올려 주는 유입 */
  private get decorSpawn() {
    return this.upg.planter * 0.1 + this.upg.lights * 0.12;
  }

  /** 꾸미기가 올려 주는 체류 시간 배율 */
  private get decorLinger() {
    return 1 + this.upg.table * 0.35 + this.upg.lights * 0.12;
  }

  /** 꾸미기가 올려 주는 구매 확률(절대값 가산) */
  private get decorBuy() {
    return this.upg.radio * 0.03;
  }

  private updateSpawn(dt: number) {
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;
    const rate = (1 + 0.3 * this.upg.sign + this.referralBonus + this.decorSpawn) * WEATHER[this.weather].spawn;
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

  /** 해금된 메뉴 중에서 고른다. 비싼 떡볶이를 먼저 묻고, 그다음 어묵, 나머지는 붕어빵 */
  private pickMenu(): Menu {
    if (this.upg.tteok > 0 && Math.random() < CONFIG.tteokPickChance) return 'tteok';
    if (this.upg.oden > 0 && Math.random() < CONFIG.odenPickChance) return 'oden';
    return 'bungeoppang';
  }

  private makeVillager(def: ResidentDef): Villager {
    const dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
    const roll = Math.random();
    const visits = this.visits[def.id] ?? 0;
    const stage = favorStage(visits);
    // 단골일수록 사러 올 확률이 높다. 관계가 수치로 돌아오는 유일한 지점
    const buyChance =
      (CONFIG.buyChance + CONFIG.heaterBuyBonus * this.upg.heater + this.decorBuy + (def.name ? stage * 0.08 : 0)) *
      WEATHER[this.weather].buy;
    const intent: Intent =
      roll < buyChance ? 'buy' : roll < buyChance + CONFIG.browseChance ? 'browse' : 'pass';
    const menu = this.pickMenu();
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
          v.timer = rand(5, 9) * WEATHER[this.weather].linger * this.decorLinger;
          if (this.upg.table > 0) {
            // 테이블이 있으면 앉아서 먹는다. 가게 앞이 북적여 보인다
            v.spotX = LAYOUT.stall.x - 3.4 + rand(-0.5, 0.5);
            v.spotZ = -2.1 + rand(-0.3, 0.3);
          } else {
            v.spotX = LAYOUT.stall.x + rand(-5, 3);
            v.spotZ = rand(-3.4, -2.6);
          }
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

    if (v.menu === 'tteok') {
      // 떡볶이는 한 사람이 한 그릇. 솥이 비면 다 끓을 때까지 기다린다
      if (this.tteokPot.servings === 0) return false;
      this.tteokPot.servings--;
      n = 1;
      revenue = CONFIG.tteok.price;
      this.money += revenue;
    } else if (v.menu === 'oden') {
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
    this.emit('sale');
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
      this.emit('unlock');
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
    this.emit('dayEnd');
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
    this.totalProfit += this.report.profit;
    this.persist();
  }

  get isFinalDay() {
    return this.day >= FINAL_DAY;
  }

  /**
   * 결말을 고를 수 있는지. 못 고르면 왜 못 고르는지 같이 돌려준다.
   * 숨기지 않는 게 원칙이다 (docs/STORY.md 4장)
   */
  endingStatus(id: EndingId): { available: boolean; reason: string | null } {
    if (id === 'move') {
      const short = MOVE_PROFIT - this.totalProfit;
      if (short > 0) return { available: false, reason: `누적 순이익이 ${short.toLocaleString('ko-KR')}원 모자란다` };
    }
    if (id === 'handover') {
      if (this.upg.helper < HANDOVER_NEEDS.helper) return { available: false, reason: '알바를 Lv.2까지 쓰지 않았다' };
      if (this.upg.tteok < HANDOVER_NEEDS.tteok) return { available: false, reason: '떡볶이 솥이 없다' };
      if (this.upg.sign < HANDOVER_NEEDS.sign) {
        return { available: false, reason: `간판이 Lv.${this.upg.sign}다. Lv.${HANDOVER_NEEDS.sign}까지 올려야 한다` };
      }
    }
    return { available: true, reason: null };
  }

  // ---------------------------------------------------------------- 배달

  /** 한 번에 들고 나갈 수 있는 최대 개수 */
  static readonly DELIVERY_MAX = 8;
  /** 배달 단가. 가게에서 파는 값의 2.5배 */
  static readonly DELIVERY_PRICE = 2500;

  /** 지금 배달을 나갈 수 있는가 */
  canDeliver() {
    return !this.delivery && this.open && !this.deliveredToday && this.tray.length >= 3;
  }

  startDelivery(clientId: string, clientName: string, special = false) {
    if (!this.canDeliver()) return false;
    const count = Math.min(Sim.DELIVERY_MAX, this.tray.length);
    this.tray.splice(0, count);
    this.delivery = new Delivery({ count, clientId, clientName, special });
    return true;
  }

  /** 도착. 들고 간 것 중 남은 만큼 판다 */
  finishDelivery(): DeliveryResult | null {
    const d = this.delivery;
    if (!d) return null;
    const revenue = d.left * Sim.DELIVERY_PRICE;
    this.money += revenue;
    this.stats.revenue += revenue;
    this.stats.sold += d.left;
    if (d.left > 0) this.stats.customers++;
    this.deliveredToday = true;
    this.delivery = null;
    this.deliveryResult = { revenue, delivered: d.left, lost: d.lost, carried: d.carried, clientId: d.clientId };
    this.persist();
    return this.deliveryResult;
  }

  /** 결과 화면을 닫는다. 이때 비로소 가게 화면으로 돌아온다 */
  closeDeliveryResult() {
    this.deliveryResult = null;
  }

  chooseEnding(id: EndingId) {
    if (!this.endingStatus(id).available) return false;
    this.ending = id;
    this.endingsSeen[id] = true;
    this.choosingEnding = false;
    this.persist();
    return true;
  }

  /** 2회차. 관계와 본 것은 남기고 날짜만 되돌린다 (docs/STORY.md 6장) */
  newRun() {
    this.day = 1;
    this.money = CONFIG.startMoney;
    this.upg = emptyUpgrades();
    this.totalProfit = 0;
    this.ending = null;
    this.choosingEnding = false;
    this.dayTime = 0;
    this.open = true;
    this.report = null;
    this.stats = { customers: 0, sold: 0, revenue: 0, cost: 0, missed: 0, shortfall: 0 };
    this.todayUnlocks = [];
    this.villagers = [];
    this.queue = [];
    this.tray = [];
    this.tteokPot = { cooking: false, t: 0, servings: 0 };
    this.resetMolds();
    this.maybeStartScene();
    this.persist();
  }

  nextDay() {
    this.day++;
    this.weather = this.tomorrow;
    // 내일 날씨는 내일이 속한 계절로 뽑는다. 장이 넘어가는 날 계절이 바뀐다
    this.tomorrow = rollWeather(SEASONS[chapterForDay(this.day + 1).season].weather);
    this.dayTime = 0;
    this.open = true;
    this.report = null;
    this.stats = { customers: 0, sold: 0, revenue: 0, cost: 0, missed: 0, shortfall: 0 };
    this.todayUnlocks = [];
    this.delivery = null;
    this.deliveredToday = false;
    this.villagers = [];
    this.queue = [];
    this.tray = [];
    this.tteokPot = { cooking: false, t: 0, servings: 0 };
    this.resetMolds();
    this.maybeStartScene();
    this.persist();
  }

  // ---------------------------------------------------------------- 업그레이드

  canBuy(kind: UpgradeKind) {
    const u = CONFIG.upgrades[kind];
    if (this.day < u.unlockDay) return false;
    const level = this.upg[kind];
    if (level >= u.max) return false;
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
