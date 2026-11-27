import { useEffect, useRef } from 'react';
import type { Hint } from '../game/tutorial';
import { sim } from '../game/useSim';

export function Coach({ hint }: { hint: Hint | null }) {
  const bubble = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hint?.autoCloseSec) return;
    const durationMs = hint.autoCloseSec * 1000;
    let visibleMs = 0;
    let last = performance.now();
    const isVisible = () => document.visibilityState === 'visible' && bubble.current !== null && bubble.current.offsetParent !== null;
    let wasVisible = isVisible();

    const onVisibilityChange = () => {
      last = performance.now();
      wasVisible = isVisible();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    const timer = window.setInterval(() => {
      const now = performance.now();
      const visible = isVisible();
      if (visible && wasVisible) visibleMs += Math.min(now - last, 250);
      last = now;
      wasVisible = visible;
      if (visibleMs >= durationMs) {
        sim.markHint(hint.id);
        window.clearInterval(timer);
      }
    }, 250);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [hint?.id, hint?.autoCloseSec]);

  if (!hint) return null;
  return (
    <div ref={bubble} className={`coach coach-at-${hint.anchor}`} role="status">
      <p>{hint.text}</p>
      <button onClick={() => sim.markHint(hint.id)}>알겠다</button>
    </div>
  );
}
