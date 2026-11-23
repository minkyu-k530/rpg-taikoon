import * as THREE from 'three';

/**
 * 글자를 캔버스에 그려 스프라이트 텍스처로 만든다.
 * 같은 문장은 몇 명이 동시에 말해도 텍스처 하나만 만든다.
 */

export interface TextTexture {
  texture: THREE.CanvasTexture;
  /** 월드 단위 폭 (높이 1 기준) */
  aspect: number;
}

const cache = new Map<string, TextTexture>();

const STYLE = {
  name: { font: 600, size: 34, pad: 14, bg: 'rgba(14,20,31,0.78)', fg: '#efe6d8', radius: 10 },
  speech: { font: 500, size: 32, pad: 18, bg: 'rgba(252,246,236,0.94)', fg: '#1a1d24', radius: 14 },
} as const;

export function textTexture(text: string, kind: keyof typeof STYLE): TextTexture {
  const key = `${kind}:${text}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const s = STYLE[kind];
  const scale = 2;
  const measure = document.createElement('canvas').getContext('2d')!;
  const font = `${s.font} ${s.size}px 'Pretendard', -apple-system, 'Apple SD Gothic Neo', sans-serif`;
  measure.font = font;
  const w = Math.ceil(measure.measureText(text).width) + s.pad * 2;
  const h = s.size + s.pad * 1.3;

  const canvas = document.createElement('canvas');
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);
  ctx.font = font;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';

  roundRect(ctx, 0.5, 0.5, w - 1, h - 1, s.radius);
  ctx.fillStyle = s.bg;
  ctx.fill();

  ctx.fillStyle = s.fg;
  ctx.fillText(text, w / 2, h / 2 + 1);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  const made = { texture, aspect: w / h };
  cache.set(key, made);
  return made;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
