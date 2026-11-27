import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CONFIG, LAYOUT } from '../game/config';
import { sim } from '../game/useSim';

type Action = { kind: 'mold'; index: number } | { kind: 'serve' } | { kind: 'hawk' } | { kind: 'delivery' };
type Nearby = { x: number; z: number; action: Action; label: string };
type PlayerHandle = { x: number; z: number; facing: number; interaction: string | null; action: Action | null };

const P = LAYOUT.player;
const controls = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyE', 'Space', 'ShiftLeft', 'ShiftRight']);

function blocked() {
  const el = document.activeElement as HTMLElement | null;
  const typing = el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));
  return !!typing || !sim.open || !!sim.scene || !!sim.delivery || !!sim.deliveryResult || sim.choosingEnding || !!sim.ending || !!document.querySelector('.overlay');
}

function collides(x: number, z: number) {
  const b = P.stallBlock;
  return x > b.minX - P.radius && x < b.maxX + P.radius && z > b.minZ - P.radius && z < b.maxZ + P.radius;
}

function nearest(x: number, z: number): Nearby | null {
  const spots: Nearby[] = [];
  for (let i = 0; i < sim.molds.length; i++) {
    const m = sim.molds[i];
    const [a, b] = CONFIG.bake.flipWindow;
    const action: Action = { kind: 'mold', index: i };
    const label = m.baking && !m.flipped && m.t >= a && m.t < b ? 'E 뒤집기' : '굽는 중';
    const moldX = LAYOUT.stall.x - 1.2 + (i % 4) * 0.52;
    spots.push({ x: moldX, z: 1.9 + ((i / 4) | 0) * 0.24, action, label });
    spots.push({ x: moldX, z: -1.28 - ((i / 4) | 0) * 0.22, action, label });
  }
  spots.push({ ...P.counter, action: sim.deliveryOffer ? { kind: 'delivery' } : { kind: 'serve' },
    label: sim.deliveryOffer ? 'E 배달 받기' : sim.queue.length ? 'E 손님 받기' : '손님 기다리는 중' });
  spots.push({ ...P.hawk, action: { kind: 'hawk' }, label: sim.clock < sim.hawkReadyAt ? `호객 ${Math.ceil(sim.hawkReadyAt - sim.clock)}초` : 'E 호객' });
  let best: Nearby | null = null;
  let bestDist = P.interactRadius * P.interactRadius;
  for (const spot of spots) {
    const d = (x - spot.x) ** 2 + (z - spot.z) ** 2;
    if (d < bestDist) { best = spot; bestDist = d; }
  }
  return best;
}

function interact(action: Action | null) {
  if (!action) return;
  if (action.kind === 'mold') { if (sim.flip(action.index)) sim.markHint('flip'); }
  else if (action.kind === 'serve') sim.serveNow();
  else if (action.kind === 'hawk') sim.hawk();
  else if (sim.acceptDelivery()) sim.markHint('delivery');
}

export function Player({ onPromptChange }: { onPromptChange: (value: string | null) => void }) {
  const body = useRef<THREE.Group>(null);
  const la = useRef<THREE.Group>(null);
  const ra = useRef<THREE.Group>(null);
  const ll = useRef<THREE.Group>(null);
  const rl = useRef<THREE.Group>(null);
  const keys = useRef(new Set<string>());
  const pos = useRef<{ x: number; z: number }>({ ...P.start });
  const facing = useRef(Math.PI);
  const anim = useRef(0);
  const prompt = useRef<string | null>(null);
  const active = useRef<Action | null>(null);
  const handle = useRef<PlayerHandle>({ ...P.start, facing: Math.PI, interaction: null, action: null });

  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as { __player: PlayerHandle }).__player = handle.current;
    const down = (e: KeyboardEvent) => {
      if (!controls.has(e.code) || blocked()) return;
      e.preventDefault();
      if ((e.code === 'KeyE' || e.code === 'Space') && !e.repeat) interact(active.current);
      keys.current.add(e.code);
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    const blur = () => keys.current.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
      onPromptChange(null);
    };
  }, [onPromptChange]);

  useFrame((_, rawDt) => {
    const g = body.current;
    if (!g) return;
    const canMove = !blocked();
    const k = keys.current;
    const dx = canMove ? Number(k.has('KeyD') || k.has('ArrowRight')) - Number(k.has('KeyA') || k.has('ArrowLeft')) : 0;
    const dz = canMove ? Number(k.has('KeyW') || k.has('ArrowUp')) - Number(k.has('KeyS') || k.has('ArrowDown')) : 0;
    const moving = dx !== 0 || dz !== 0;
    if (moving) {
      const len = Math.hypot(dx, dz);
      const step = Math.min(rawDt, 0.1) * (k.has('ShiftLeft') || k.has('ShiftRight') ? P.runSpeed : P.walkSpeed);
      const nx = THREE.MathUtils.clamp(pos.current.x + dx / len * step, P.bounds.minX, P.bounds.maxX);
      if (!collides(nx, pos.current.z)) pos.current.x = nx;
      const nz = THREE.MathUtils.clamp(pos.current.z + dz / len * step, P.bounds.minZ, Math.min(P.bounds.maxZ, LAYOUT.railZ - P.radius));
      if (!collides(pos.current.x, nz)) pos.current.z = nz;
      const target = Math.atan2(dx, dz);
      let diff = ((target - facing.current + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      facing.current += diff * Math.min(1, rawDt * 9);
      if (!sim.seenHints.move) sim.markHint('move');
    }
    const gait = moving ? 1 : 0;
    anim.current += rawDt * (moving ? 8 : 2);
    const swing = Math.sin(anim.current) * 0.55 * gait;
    if (la.current) la.current.rotation.x = swing;
    if (ra.current) ra.current.rotation.x = -swing;
    if (ll.current) ll.current.rotation.x = -swing * 0.8;
    if (rl.current) rl.current.rotation.x = swing * 0.8;
    g.position.set(pos.current.x, Math.abs(Math.sin(anim.current)) * 0.035 * gait, pos.current.z);
    g.rotation.y = facing.current;
    const spot = canMove ? nearest(pos.current.x, pos.current.z) : null;
    active.current = spot?.action ?? null;
    const label = spot?.label ?? null;
    if (label !== prompt.current) { prompt.current = label; onPromptChange(label); }
    Object.assign(handle.current, { ...pos.current, facing: facing.current, interaction: label, action: active.current });
  });

  return <group ref={body}>
    <mesh position={[0, 0.46, 0]} castShadow><boxGeometry args={[0.34, 0.92, 0.2]} /><meshStandardMaterial color="#2e3b4e" /></mesh>
    <mesh position={[0, 1.08, 0]} castShadow><boxGeometry args={[0.42, 0.5, 0.26]} /><meshStandardMaterial color="#4a5c6e" /></mesh>
    <mesh position={[0, 0.78, 0.15]}><boxGeometry args={[0.36, 0.5, 0.03]} /><meshStandardMaterial color="#d8d2c4" /></mesh>
    <group ref={la} position={[-0.26, 1.28, 0]}><mesh position={[0, -0.2, 0]} castShadow><boxGeometry args={[0.1, 0.46, 0.12]} /><meshStandardMaterial color="#4a5c6e" /></mesh></group>
    <group ref={ra} position={[0.26, 1.28, 0]}><mesh position={[0, -0.2, 0]} castShadow><boxGeometry args={[0.1, 0.46, 0.12]} /><meshStandardMaterial color="#4a5c6e" /></mesh></group>
    <group ref={ll} position={[-0.13, 0.06, 0]}><mesh position={[0, -0.2, 0]} castShadow><boxGeometry args={[0.12, 0.42, 0.14]} /><meshStandardMaterial color="#2e3b4e" /></mesh></group>
    <group ref={rl} position={[0.13, 0.06, 0]}><mesh position={[0, -0.2, 0]} castShadow><boxGeometry args={[0.12, 0.42, 0.14]} /><meshStandardMaterial color="#2e3b4e" /></mesh></group>
    <mesh position={[0, 1.46, 0]} castShadow><sphereGeometry args={[0.13, 12, 10]} /><meshStandardMaterial color="#dcae87" /></mesh>
    <mesh position={[0, 1.5, 0]} castShadow><sphereGeometry args={[0.138, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#c2552f" /></mesh>
  </group>;
}
