/**
 * 배달 원정 (docs/DELIVERY.md).
 *
 * 가게와 마찬가지로 React·Three.js를 모르는 순수 로직이다.
 * 가게 시뮬레이션은 이것과 **동시에 계속 돈다** — 자리를 비우는 대가가 이 모드의 전부다.
 */

export type ObstacleKind = 'bike' | 'scooter' | 'puddle' | 'bench' | 'raccoon';

export interface Obstacle {
  id: number;
  kind: ObstacleKind;
  /** 코스 시작점에서의 거리(m) */
  x: number;
  /** 산책로 좌우 위치(m) */
  z: number;
  /** 충돌 반경 */
  r: number;
  hit: boolean;
  /** 이미 지나친 장애물. 콤보를 두 번 세지 않는다 */
  passed: boolean;
}

export interface ObstacleDef {
  /** 맞으면 떨어뜨리는 개수 */
  loss: number;
  /** 점프로 넘을 수 있는가 */
  jumpable: boolean;
  label: string;
}

export const OBSTACLES: Record<ObstacleKind, ObstacleDef> = {
  bike: { loss: 1, jumpable: false, label: '자전거' },
  scooter: { loss: 1, jumpable: false, label: '전동킥보드' },
  puddle: { loss: 1, jumpable: true, label: '물웅덩이' },
  bench: { loss: 1, jumpable: false, label: '벤치' },
  raccoon: { loss: 2, jumpable: false, label: '너구리' },
};

export const COURSE = {
  /** 산책로 좌우 한계 */
  halfWidth: 2.4,
  /** 달리는 속도(m/s) */
  speed: 7,
  /** 좌우로 붙는 속도 */
  strafe: 6.5,
  /** 점프 한 번에 걸리는 시간(초) */
  jumpTime: 0.62,
  jumpHeight: 1.15,
  /** 충돌 뒤 무적 시간. 한 장애물에 연달아 맞는 걸 막는다 */
  graceTime: 0.5,
  /** 맞으면 잠깐 느려진다 */
  stumbleTime: 0.45,
  stumbleSpeed: 0.45,
} as const;

export class Delivery {
  /** 코스 길이(m) */
  readonly total: number;
  /** 부탁한 사람 */
  readonly clientId: string;
  readonly clientName: string;
  /** 5장 특별 배달인가 */
  readonly special: boolean;

  /** 지금까지 달린 거리 */
  distance = 0;
  /** 산책로 좌우 위치 */
  z = 0;
  /** 입력으로 들어온 목표 위치 */
  targetZ = 0;
  /** 점프 남은 시간. 0이면 땅 */
  jump = 0;
  /** 비틀거리는 남은 시간 */
  stumble = 0;
  /** 충돌 무적 남은 시간 */
  grace = 0;
  /** 달린 시간 */
  elapsed = 0;

  /** 들고 나온 개수 */
  readonly carried: number;
  /** 남은 개수 */
  left: number;
  /** 떨어뜨린 개수 */
  lost = 0;
  /** 마지막으로 맞은 장애물. 화면에 잠깐 띄운다 */
  lastHit: { kind: ObstacleKind; at: number } | null = null;

  /**
   * 연속으로 피한 장애물 수. 맞으면 0으로 돌아간다.
   * 도착할 때 최고 기록만큼 보너스를 준다 — 조심히 달릴 이유를 만든다
   */
  combo = 0;
  bestCombo = 0;

  obstacles: Obstacle[] = [];
  done = false;

  /** 소리를 울리기 위한 통로. 로직은 오디오를 모른다 */
  onEvent: ((e: 'jump' | 'hit' | 'arrive') => void) | null = null;

  constructor(opts: { count: number; clientId: string; clientName: string; special?: boolean }) {
    this.carried = opts.count;
    this.left = opts.count;
    this.clientId = opts.clientId;
    this.clientName = opts.clientName;
    this.special = opts.special ?? false;
    this.total = this.special ? 480 : 300;
    this.obstacles = makeCourse(this.total);
  }

  get progress() {
    return Math.min(1, this.distance / this.total);
  }

  get grounded() {
    return this.jump <= 0;
  }

  /** 점프 높이(m) */
  get height() {
    if (this.jump <= 0) return 0;
    const p = 1 - this.jump / COURSE.jumpTime;
    return Math.sin(p * Math.PI) * COURSE.jumpHeight;
  }

  moveTo(z: number) {
    this.targetZ = clamp(z, -COURSE.halfWidth, COURSE.halfWidth);
  }

  nudge(dir: -1 | 1) {
    this.moveTo(this.targetZ + dir * 1.2);
  }

  doJump() {
    if (this.jump > 0) return false;
    this.jump = COURSE.jumpTime;
    this.onEvent?.('jump');
    return true;
  }

  tick(dt: number) {
    if (this.done) return;
    dt = Math.min(dt, 0.05);
    this.elapsed += dt;

    if (this.jump > 0) this.jump = Math.max(0, this.jump - dt);
    if (this.stumble > 0) this.stumble = Math.max(0, this.stumble - dt);
    if (this.grace > 0) this.grace = Math.max(0, this.grace - dt);

    const speed = COURSE.speed * (this.stumble > 0 ? COURSE.stumbleSpeed : 1);
    this.distance += speed * dt;

    // 좌우는 목표 위치로 부드럽게 따라간다. 즉시 순간이동하면 피하는 맛이 없다
    const dz = this.targetZ - this.z;
    const step = Math.sign(dz) * Math.min(Math.abs(dz), COURSE.strafe * dt);
    this.z += step;

    this.checkHits();

    if (this.distance >= this.total) {
      this.distance = this.total;
      this.done = true;
      this.onEvent?.('arrive');
    }
  }

  private checkHits() {
    for (const o of this.obstacles) {
      if (o.hit || o.passed) continue;
      // 지나쳤으면 피한 것이다
      if (o.x < this.distance - 0.8) {
        o.passed = true;
        this.combo++;
        if (this.combo > this.bestCombo) this.bestCombo = this.combo;
        continue;
      }
      if (this.grace > 0) continue;
      if (Math.abs(o.x - this.distance) > 0.7) continue;
      if (Math.abs(o.z - this.z) > o.r) continue;
      // 물웅덩이는 뛰어넘을 수 있다
      if (OBSTACLES[o.kind].jumpable && this.height > 0.35) continue;
      o.hit = true;
      o.passed = true;
      this.combo = 0;
      this.grace = COURSE.graceTime;
      this.stumble = COURSE.stumbleTime;
      const loss = Math.min(this.left, OBSTACLES[o.kind].loss);
      this.left -= loss;
      this.lost += loss;
      this.lastHit = { kind: o.kind, at: this.elapsed };
      this.onEvent?.('hit');
      return;
    }
  }
}

/**
 * 코스 생성.
 *
 * 앞쪽 25m는 비워 둔다 — 시작하자마자 맞으면 조작을 배울 틈이 없다.
 * 뒤로 갈수록 간격을 좁혀 조금씩 바빠지게 만든다.
 */
function makeCourse(total: number): Obstacle[] {
  const out: Obstacle[] = [];
  let x = 25;
  let id = 1;
  while (x < total - 12) {
    const t = x / total;
    // 간격: 처음 24m → 끝 13m.
    // 18→9로 잡았더니 능숙하게 피해도 5개 중 2개만 도착했다. 피할 수 있어야 피하는 맛이 난다
    const gap = 24 - t * 11;
    x += gap * (0.75 + Math.random() * 0.5);
    if (x >= total - 12) break;

    const kind = pickKind(t);
    const r = kind === 'puddle' ? 1.3 : kind === 'bench' ? 1.0 : 0.85;
    // 피할 자리는 반드시 남긴다. 양쪽 끝을 다 막지 않는다
    const z = (Math.random() * 2 - 1) * (COURSE.halfWidth - r * 0.5);
    out.push({ id: id++, kind, x, z, r, hit: false, passed: false });
  }
  return out;
}

function pickKind(t: number): ObstacleKind {
  const roll = Math.random();
  // 너구리는 후반에 더 자주 나온다. 가장 아픈 장애물이라 뒤로 미룬다
  const raccoon = 0.08 + t * 0.14;
  if (roll < raccoon) return 'raccoon';
  if (roll < raccoon + 0.26) return 'bike';
  if (roll < raccoon + 0.46) return 'scooter';
  if (roll < raccoon + 0.74) return 'puddle';
  return 'bench';
}

function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}
