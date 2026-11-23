import { useEffect, useState } from 'react';
import { CONFIG, type Upgrades } from './config';
import type { Look } from './residents';
import type { Weather } from './weather';
import { nightsLeft } from './story';
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
  upg: Upgrades;
  visits: Record<string, number>;
  tteokServings: number;
  weather: Weather;
  chapter: { no: number; title: string };
  nightsLeft: number | null;
  scene: Sim['scene'];
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
    visits: { ...sim.visits },
    tteokServings: sim.tteokPot.servings,
    weather: sim.weather,
    chapter: { no: sim.chapter.no, title: sim.chapter.title },
    nightsLeft: nightsLeft(sim.day),
    scene: sim.scene,
    report: sim.report,
  };
}

export interface CrowdMember {
  id: number;
  look: Look;
  name: string | null;
  speech: string | null;
}

/**
 * 주민 명단과 머리 위 글자만 10Hz로 동기화한다. 위치는 useFrame이 직접 읽는다.
 * 이름·대사가 바뀔 때만 리렌더하도록 직접 비교한다.
 */
export function useRoster(hz = 10): CrowdMember[] {
  const [roster, setRoster] = useState<CrowdMember[]>([]);
  useEffect(() => {
    const id = setInterval(() => {
      setRoster((prev) => {
        const next = sim.villagers.map((v) => ({
          id: v.id,
          look: v.look,
          name: v.name,
          speech: v.speech,
        }));
        const same =
          prev.length === next.length &&
          prev.every((p, i) => p.id === next[i].id && p.name === next[i].name && p.speech === next[i].speech);
        return same ? prev : next;
      });
    }, 1000 / hz);
    return () => clearInterval(id);
  }, [hz]);
  return roster;
}
