import { useEffect, useState } from 'react';
import { CONFIG } from './config';
import { Sim } from './sim';

/** 시뮬레이션 인스턴스는 하나. 렌더러는 이걸 읽기만 한다 */
export const sim = new Sim();

if (import.meta.env.DEV) {
  // 브라우저 콘솔에서 상태를 들여다보기 위한 개발용 핸들
  const devWindow = window as unknown as { __sim: Sim };
  devWindow.__sim = sim;
}

export interface Snapshot {
  money: number;
  day: number;
  timeLeft: number;
  open: boolean;
  tray: number;
  trayCap: number;
  queue: number;
  crowd: number;
  molds: { baking: boolean; t: number; flipped: boolean; burnt: boolean }[];
  upg: { mold: number; sign: number; heater: number; oden: number };
  report: Sim['report'];
}

/**
 * 매 프레임 React를 돌리면 60fps에서 리렌더가 터진다.
 * UI는 10Hz 스냅샷으로 충분하고, 3D 오브젝트는 useFrame에서 직접 갱신한다.
 */
export function useSnapshot(hz = 10): Snapshot {
  const [snap, setSnap] = useState<Snapshot>(read);
  useEffect(() => {
    const id = setInterval(() => setSnap(read()), 1000 / hz);
    return () => clearInterval(id);
  }, [hz]);
  return snap;
}

function read(): Snapshot {
  return {
    money: Math.round(sim.money),
    day: sim.day,
    timeLeft: Math.max(0, CONFIG.dayLength - sim.dayTime),
    open: sim.open,
    tray: sim.tray.length,
    trayCap: sim.trayCap,
    queue: sim.queue.length,
    crowd: sim.villagers.length,
    molds: sim.molds.map((m) => ({ baking: m.baking, t: m.t, flipped: m.flipped, burnt: m.burnt })),
    upg: { ...sim.upg },
    report: sim.report,
  };
}

export interface CrowdMember {
  id: number;
  skin: string;
  top: string;
  bottom: string;
  height: number;
}

/** 주민 명단(생성·소멸)만 10Hz로 동기화한다. 위치는 useFrame이 직접 읽는다 */
export function useRoster(hz = 10): CrowdMember[] {
  const [roster, setRoster] = useState<CrowdMember[]>([]);
  useEffect(() => {
    const id = setInterval(() => {
      setRoster((prev) => {
        const next = sim.villagers.map((v) => ({
          id: v.id,
          skin: v.skin,
          top: v.top,
          bottom: v.bottom,
          height: v.height,
        }));
        if (prev.length === next.length && prev.every((p, i) => p.id === next[i].id)) return prev;
        return next;
      });
    }, 1000 / hz);
    return () => clearInterval(id);
  }, [hz]);
  return roster;
}
