/**
 * 게임 상수. 밸런싱 수치는 전부 여기 모은다.
 * 기준: docs/GDD.md 8장(경제 설계)
 */

/** 씬 좌표계: X = 산책로 방향, Z = 카메라에서 멀어지는 방향, 1 단위 = 1m */
export const LAYOUT = {
  /** 주민이 걸어 들어오고 나가는 X 경계. 화각 밖까지 넓히면 사람이 흩어져 보인다 */
  minX: -11,
  maxX: 11,
  /** 산책로 보행 레인 (Z 범위) */
  laneMinZ: -4.2,
  laneMaxZ: -1.7,
  /** 포장마차 위치 (카메라 기준 뒤쪽, -Z 방향을 바라봄) */
  stall: { x: 5, z: 0.6 },
  /** 카운터 앞면 Z */
  counterZ: -0.3,
  /** 난간 / 하천 / 건너편 */
  railZ: 2.4,
  riverNearZ: 3.0,
  riverFarZ: 13,
  buildingZ: 16,
} as const;

/** 줄 서는 위치 (0번이 맨 앞) */
export function queueSlot(i: number) {
  return { x: LAYOUT.stall.x - 0.3 - i * 0.85, z: -1.25 };
}

export const CONFIG = {
  /** 영업 1회 길이(초). GDD 6~8분이지만 프로토타입은 반복 검증을 위해 짧게 */
  dayLength: 150,
  startMoney: 20000,

  /** 붕어빵 */
  bake: {
    cost: 300,
    price: 1000,
    burntPrice: 700,
    /** 굽는 데 걸리는 총 시간(초) */
    time: 14,
    /** 뒤집기 창 [시작, 끝] — 놓치면 바삭한 붕어빵(싸게 팔림, 손실 아님) */
    flipWindow: [5, 9] as [number, number],
  },

  /** 어묵: 조작 없이 상시 판매. 손 놓고 봐도 가게가 돌아간다는 보장 */
  oden: { cost: 400, price: 1000 },

  /**
   * 손님.
   * 생산량(틀 2개 × 14초 = 150초에 21개)과 수요가 맞아야 줄이 터지지 않는다.
   * 지나가는 사람은 많고(군중 연출), 그중 사는 사람은 적게 잡는다.
   */
  spawnInterval: 2.5,
  maxVillagers: 22,
  buyChance: 0.18,
  /** 온풍기 레벨당 구매 확률 가산 */
  heaterBuyBonus: 0.05,
  browseChance: 0.3,
  /** 어묵 해금 시 어묵을 고를 확률 */
  odenPickChance: 0.45,
  queueMax: 6,
  /** 재고가 없을 때 기다려 주는 시간(초). 넘으면 화내지 않고 그냥 간다 */
  patience: 14,

  /** 업그레이드 */
  upgrades: {
    mold: { label: '붕어빵 틀', base: 18000, mult: 1.9, max: 6, desc: '한 번에 굽는 개수 +1' },
    sign: { label: '간판', base: 15000, mult: 2.2, max: 3, desc: '지나가는 사람 +30%' },
    heater: { label: '온풍기', base: 12000, mult: 2.0, max: 3, desc: '사 먹을 확률 +5%p' },
    oden: { label: '어묵탕', base: 25000, mult: 1, max: 1, desc: '조작 없이 팔리는 메뉴 해금' },
  },
  /** 시작 틀 개수 */
  baseMolds: 2,
} as const;

export type UpgradeKind = keyof typeof CONFIG.upgrades;

export function upgradeCost(kind: UpgradeKind, level: number) {
  const u = CONFIG.upgrades[kind];
  return Math.round((u.base * Math.pow(u.mult, level)) / 100) * 100;
}

/** 무료 에셋을 섞어도 톤이 깨지지 않게, 색은 이 팔레트에서만 뽑는다 (GDD 3-2) */
export const PALETTE = {
  skin: ['#e8c3a0', '#dcae87', '#c48f66', '#9a6a48'],
  top: ['#3b4a6b', '#5b3f52', '#2f5d50', '#6b4a2f', '#44506b', '#7a3f3f'],
  bottom: ['#2e3b4e', '#5a5f46', '#3a3f4a', '#394b3a', '#4a3b33', '#2b3a52'],
} as const;

export const pick = <T,>(arr: readonly T[]) => arr[(Math.random() * arr.length) | 0];
export const rand = (a: number, b: number) => a + Math.random() * (b - a);
