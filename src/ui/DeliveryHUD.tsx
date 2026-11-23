import { useEffect, useRef } from 'react';
import { COURSE, OBSTACLES } from '../game/delivery';
import { sim, useSnapshot } from '../game/useSim';

/**
 * 배달 중 화면.
 *
 * 조작은 둘뿐이다 — 좌우, 점프 (docs/DELIVERY.md 3장).
 * 키보드와 터치를 같은 상태로 묶는다.
 *
 * 도착 결과는 가게 화면으로 돌아간 뒤에 띄운다(`ui/HUD.tsx`).
 * 여기서 띄우면 씬이 바뀌는 순간 결과 화면까지 같이 사라진다.
 */
export function DeliveryHUD() {
  useDeliveryInput();
  const snap = useSnapshot(12);
  const d = sim.delivery;

  // 도착하면 한 번만 정산한다
  useEffect(() => {
    if (d?.done && sim.delivery) sim.finishDelivery();
  }, [d?.done]);

  if (!d) return null;


  const hitFresh = d.lastHit && d.elapsed - d.lastHit.at < 1.2;
  return (
    <>
      <div className="hud-top">
        <div className="chip">
          <span className="chip-label">{d.clientName}에게</span>
          <span className="chip-time">{d.left}개</span>
        </div>
        <div className="chip small delivery-dist">
          {Math.round(d.distance)} / {d.total}m
        </div>
      </div>

      <div className="delivery-bar">
        <span className="delivery-fill" style={{ width: `${snap.deliveryProgress * 100}%` }} />
      </div>

      {hitFresh && <div className="delivery-hit">{OBSTACLES[d.lastHit!.kind].label}!</div>}

      <div className="delivery-pad">
        <button className="pad-btn" onPointerDown={() => sim.delivery?.moveTo(-COURSE.halfWidth)} onPointerUp={release}>
          ←
        </button>
        <button className="pad-btn jump" onPointerDown={() => sim.delivery?.doJump()}>
          점프
        </button>
        <button className="pad-btn" onPointerDown={() => sim.delivery?.moveTo(COURSE.halfWidth)} onPointerUp={release}>
          →
        </button>
      </div>
      <p className="hint delivery-hint">좌우로 피하고, 물웅덩이는 점프. 다 뺏겨도 도착은 한다.</p>
    </>
  );
}

function release() {
  const d = sim.delivery;
  if (d) d.moveTo(d.z);
}

/** 키보드와 화면 드래그를 같은 상태로 묶는다 */
function useDeliveryInput() {
  const drag = useRef<{ x: number; z: number; t: number; moved: boolean } | null>(null);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const d = sim.delivery;
      if (!d) return;
      if (e.key === 'ArrowLeft' || e.key === 'a') d.moveTo(-COURSE.halfWidth);
      else if (e.key === 'ArrowRight' || e.key === 'd') d.moveTo(COURSE.halfWidth);
      else if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') {
        e.preventDefault();
        d.doJump();
      }
    };
    const up = (e: KeyboardEvent) => {
      const d = sim.delivery;
      if (!d) return;
      if (['ArrowLeft', 'ArrowRight', 'a', 'd'].includes(e.key)) d.moveTo(d.z);
    };

    const pDown = (e: PointerEvent) => {
      const d = sim.delivery;
      if (!d) return;
      drag.current = { x: e.clientX, z: d.targetZ, t: performance.now(), moved: false };
    };
    const pMove = (e: PointerEvent) => {
      const d = sim.delivery;
      const g = drag.current;
      if (!d || !g) return;
      const dx = e.clientX - g.x;
      if (Math.abs(dx) > 8) g.moved = true;
      // 화면 가로 35%를 끌면 산책로 끝에서 끝까지
      d.moveTo(g.z + (dx / (window.innerWidth * 0.35)) * COURSE.halfWidth * 2);
    };
    const pUp = () => {
      const d = sim.delivery;
      const g = drag.current;
      drag.current = null;
      // 짧게 톡 치면 점프
      if (d && g && !g.moved && performance.now() - g.t < 260) d.doJump();
    };

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('pointerdown', pDown);
    window.addEventListener('pointermove', pMove);
    window.addEventListener('pointerup', pUp);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('pointerdown', pDown);
      window.removeEventListener('pointermove', pMove);
      window.removeEventListener('pointerup', pUp);
    };
  }, []);
}
