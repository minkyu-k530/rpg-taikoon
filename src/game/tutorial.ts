export type HintId = 'move' | 'flip' | 'clock' | 'upgrade' | 'book' | 'delivery';
export type HintAnchor = 'move' | 'mold' | 'clock' | 'upgrades' | 'book' | 'offer';

export interface Hint { id: HintId; anchor: HintAnchor; text: string; autoCloseSec?: number }

/** 표 순서 그대로. 우선순위가 곧 배열 순서다 */
export const HINTS: Hint[] = [
  { id: 'move', anchor: 'move', text: '방향키·WASD로 움직이고, 가까이 가서 E로 일한다' },
  { id: 'flip', anchor: 'mold', text: '노랗게 깜빡일 때 누르면 뒤집힌다' },
  { id: 'clock', anchor: 'clock', text: '이 숫자가 0이 되면 문을 닫는다. 서두를 건 없다', autoCloseSec: 8 },
  { id: 'upgrade', anchor: 'upgrades', text: '번 돈으로 가게를 키운다. 틀이 늘면 한 번에 더 굽는다. 안 사도 된다' },
  { id: 'book', anchor: 'book', text: '이름을 알게 된 사람은 여기 남는다' },
  { id: 'delivery', anchor: 'offer', text: '받으면 직접 들고 뛴다. 그동안 가게는 혼자 돈다. 안 받아도 아무 일 없다' },
];

/** 판단에 필요한 것만 받는다. Snapshot 전체에 묶이지 않게 */
export interface HintContext {
  day: number;
  open: boolean;
  inScene: boolean;
  delivering: boolean;
  deliveryResult: boolean;
  ending: boolean;
  overlayOpen: boolean;
  settlement: boolean;
  anyMoldInWindow: boolean;
  timeLeftRatio: number;
  knownRegulars: number;
  hasOffer: boolean;
}

/** 지금 띄울 안내 하나. 없으면 null. seen에 'off'가 있으면 항상 null */
export function pickHint(ctx: HintContext, seen: Record<string, true>): Hint | null {
  if (seen.off || ctx.inScene || ctx.delivering || ctx.deliveryResult || ctx.ending || ctx.overlayOpen) return null;
  if (ctx.open && ctx.day === 1 && !seen.move) return HINTS[0];
  if (ctx.open && ctx.anyMoldInWindow && !seen.flip) return HINTS[1];
  if (ctx.open && seen.flip && ctx.timeLeftRatio <= 0.5 && !seen.clock) return HINTS[2];
  if (ctx.settlement && !seen.upgrade) return HINTS[3];
  if (ctx.open && ctx.knownRegulars > 0 && !seen.book) return HINTS[4];
  if (ctx.open && ctx.hasOffer && !seen.delivery) return HINTS[5];
  return null;
}
