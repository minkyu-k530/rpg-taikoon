import type { Upgrades } from './config';

/** localStorage 저장. 스키마가 바뀌면 version을 올리고 옛 저장은 버린다 */

const KEY = 'unjungcheon-bunsik';
const VERSION = 1;

export interface SaveData {
  version: number;
  day: number;
  money: number;
  upg: Upgrades;
  /** 주민 id별 구매 횟수 */
  visits: Record<string, number>;
  /** 이미 본 컷신 id */
  seenScenes: Record<string, true>;
  /** 누적 순이익과 본 결말 */
  totalProfit?: number;
  endingsSeen?: Record<string, true>;
  weather?: string;
  tomorrow?: string;
}

export function load(): SaveData | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<SaveData>;
    if (data.version !== VERSION) return null;
    if (typeof data.money !== 'number' || typeof data.day !== 'number') return null;
    if (!data.upg || !data.visits) return null;
    return { ...data, seenScenes: data.seenScenes ?? {} } as SaveData;
  } catch {
    // 손상된 저장은 조용히 버린다. 플레이어에게 보여 줄 이유가 없다
    return null;
  }
}

export function save(data: Omit<SaveData, 'version'>) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ version: VERSION, ...data }));
  } catch {
    // 사파리 프라이빗 모드 등에서 쓰기가 막힌다. 저장이 안 될 뿐 게임은 계속된다
  }
}

export function clear() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // 무시
  }
}
