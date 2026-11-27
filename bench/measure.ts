import type * as THREE from 'three';

export interface BenchResult {
  n: number;
  targetVertices: number;
  actualVertices: number;
  shadows: boolean;
  scene: boolean;
  seconds: number;
  samples: number;
  averageFps: number;
  p95FrameMs: number;
  minimumFps: number;
  averageWorkMs: number;
  p95WorkMs: number;
  visibleCharacters: number;
  calls: number;
  triangles: number;
  renderer: string;
}

declare global {
  interface Window { __benchResult?: BenchResult }
}

export function rendererName(gl: THREE.WebGLRenderer) {
  const context = gl.getContext();
  const debug = context.getExtension('WEBGL_debug_renderer_info');
  return debug
    ? String(context.getParameter(debug.UNMASKED_RENDERER_WEBGL))
    : String(context.getParameter(context.RENDERER));
}

export function createMeasure(seconds: number, gl: THREE.WebGLRenderer, meta: Omit<BenchResult, 'seconds' | 'samples' | 'averageFps' | 'p95FrameMs' | 'minimumFps' | 'averageWorkMs' | 'p95WorkMs' | 'visibleCharacters' | 'calls' | 'triangles' | 'renderer'>, onLive: (fps: number) => void, onResult: (result: BenchResult) => void, visibleCount: (camera: THREE.Camera) => number) {
  const started = performance.now();
  const intervals: number[] = [];
  const workTimes: number[] = [];
  let last = 0;
  let lastLive = 0;
  let finished = false;
  return (now: number, workMs: number, camera: THREE.Camera) => {
    if (finished) return;
    if (now - started < 3000) return;
    if (last === 0) { last = now; return; }
    const interval = now - last;
    last = now;
    if (interval <= 0) return;
    intervals.push(interval);
    workTimes.push(workMs);
    if (now - lastLive >= 500) {
      onLive(1000 / interval);
      lastLive = now;
    }
    if (now - started < 3000 + seconds * 1000) return;
    finished = true;
    const sorted = [...intervals].sort((a, b) => a - b);
    const sortedWork = [...workTimes].sort((a, b) => a - b);
    const elapsed = intervals.reduce((sum, ms) => sum + ms, 0);
    const result: BenchResult = {
      ...meta, seconds, samples: intervals.length,
      averageFps: intervals.length * 1000 / elapsed,
      p95FrameMs: sorted[Math.ceil(sorted.length * 0.95) - 1],
      minimumFps: 1000 / sorted[sorted.length - 1],
      averageWorkMs: workTimes.reduce((sum, ms) => sum + ms, 0) / workTimes.length,
      p95WorkMs: sortedWork[Math.ceil(sortedWork.length * 0.95) - 1],
      visibleCharacters: visibleCount(camera),
      calls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      renderer: rendererName(gl),
    };
    window.__benchResult = result;
    onResult(result);
  };
}
