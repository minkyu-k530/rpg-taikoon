import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { sim } from '../game/useSim';
import type { Weather as WeatherKind } from '../game/weather';

const FIELD = {
  width: 34,
  depth: 16,
  height: 9,
  /** 카메라 쪽으로 조금 당겨야 화면 앞에서도 입자가 보인다 */
  centerZ: -2,
};

const COUNT = { clear: 0, snow: 900, rain: 1400 } as const;

/**
 * 눈과 비.
 *
 * 입자는 React 바깥에서 돈다. 날씨가 바뀔 때만 버퍼를 다시 채우고,
 * 매 프레임은 BufferAttribute를 직접 갱신한다.
 */
export function Weather() {
  const snow = useRef<THREE.Points>(null);
  const rain = useRef<THREE.LineSegments>(null);
  const current = useRef<WeatherKind>(sim.weather);

  const snowGeo = useMemo(() => makePointGeometry(COUNT.snow), []);
  const rainGeo = useMemo(() => makeLineGeometry(COUNT.rain), []);
  const snowVel = useMemo(() => makeVelocities(COUNT.snow, 0.5, 1.1, 0.35), []);
  const rainVel = useMemo(() => makeVelocities(COUNT.rain, 9, 13, 0.6), []);

  useLayoutEffect(() => {
    snowGeo.computeBoundingSphere();
    rainGeo.computeBoundingSphere();
  }, [snowGeo, rainGeo]);

  useFrame((_, dt) => {
    const step = Math.min(dt, 0.05);
    current.current = sim.weather;
    const w = current.current;

    if (snow.current) {
      snow.current.visible = w === 'snow';
      if (w === 'snow') fallPoints(snowGeo, snowVel, step, true);
    }
    if (rain.current) {
      rain.current.visible = w === 'rain';
      if (w === 'rain') fallLines(rainGeo, rainVel, step);
    }
  });

  return (
    <group position={[0, 0, FIELD.centerZ]}>
      <points ref={snow} geometry={snowGeo} frustumCulled={false}>
        <pointsMaterial size={0.09} color="#e8eefb" transparent opacity={0.85} sizeAttenuation depthWrite={false} />
      </points>
      <lineSegments ref={rain} geometry={rainGeo} frustumCulled={false}>
        <lineBasicMaterial color="#9fc0e8" transparent opacity={0.35} depthWrite={false} />
      </lineSegments>
      <WetGround />
    </group>
  );
}

/** 비 오는 날의 젖은 바닥. 가로등 빛이 길게 번진다 */
function WetGround() {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (mesh.current) mesh.current.visible = sim.weather === 'rain';
  });
  return (
    <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -1.6 - FIELD.centerZ]}>
      <planeGeometry args={[70, 9]} />
      <meshStandardMaterial color="#1a1f27" roughness={0.18} metalness={0.6} transparent opacity={0.75} />
    </mesh>
  );
}

function makePointGeometry(count: number) {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * FIELD.width;
    pos[i * 3 + 1] = Math.random() * FIELD.height;
    pos[i * 3 + 2] = (Math.random() - 0.5) * FIELD.depth;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return geo;
}

/** 빗줄기는 선분 하나당 점 두 개 */
function makeLineGeometry(count: number) {
  const pos = new Float32Array(count * 6);
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * FIELD.width;
    const y = Math.random() * FIELD.height;
    const z = (Math.random() - 0.5) * FIELD.depth;
    pos[i * 6] = x;
    pos[i * 6 + 1] = y;
    pos[i * 6 + 2] = z;
    pos[i * 6 + 3] = x + 0.03;
    pos[i * 6 + 4] = y + 0.42;
    pos[i * 6 + 5] = z;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return geo;
}

interface Velocities {
  fall: Float32Array;
  drift: Float32Array;
}

function makeVelocities(count: number, min: number, max: number, drift: number): Velocities {
  const fall = new Float32Array(count);
  const side = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    fall[i] = min + Math.random() * (max - min);
    side[i] = (Math.random() - 0.5) * drift;
  }
  return { fall, drift: side };
}

function fallPoints(geo: THREE.BufferGeometry, vel: Velocities, dt: number, sway: boolean) {
  const attr = geo.getAttribute('position') as THREE.BufferAttribute;
  const arr = attr.array as Float32Array;
  const t = performance.now() * 0.001;
  for (let i = 0; i < vel.fall.length; i++) {
    const o = i * 3;
    arr[o + 1] -= vel.fall[i] * dt;
    // 눈은 좌우로 흔들려야 눈처럼 보인다
    arr[o] += (sway ? Math.sin(t * 1.3 + i) * 0.25 : 0) * vel.drift[i] * dt * 10;
    if (arr[o + 1] < 0) {
      arr[o + 1] = FIELD.height;
      arr[o] = (Math.random() - 0.5) * FIELD.width;
      arr[o + 2] = (Math.random() - 0.5) * FIELD.depth;
    }
  }
  attr.needsUpdate = true;
}

function fallLines(geo: THREE.BufferGeometry, vel: Velocities, dt: number) {
  const attr = geo.getAttribute('position') as THREE.BufferAttribute;
  const arr = attr.array as Float32Array;
  for (let i = 0; i < vel.fall.length; i++) {
    const o = i * 6;
    const drop = vel.fall[i] * dt;
    arr[o + 1] -= drop;
    arr[o + 4] -= drop;
    if (arr[o + 1] < 0) {
      const x = (Math.random() - 0.5) * FIELD.width;
      const z = (Math.random() - 0.5) * FIELD.depth;
      arr[o] = x;
      arr[o + 1] = FIELD.height;
      arr[o + 2] = z;
      arr[o + 3] = x + 0.03;
      arr[o + 4] = FIELD.height + 0.42;
      arr[o + 5] = z;
    }
  }
  attr.needsUpdate = true;
}
