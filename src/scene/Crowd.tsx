import { useCallback, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { sim, useRoster, type CrowdMember } from '../game/useSim';

/**
 * 회색 박스 단계의 주민. 캡슐이 아니라 상의/하의/머리로 나눈 이유는
 * 20명이 "각자 다른 사람"으로 보이는지를 지금 검증해야 하기 때문이다.
 */
export function Crowd() {
  const roster = useRoster();
  const refs = useRef(new Map<number, THREE.Group>());
  const limbs = useRef(new Map<number, { la: THREE.Object3D; ra: THREE.Object3D; ll: THREE.Object3D; rl: THREE.Object3D }>());

  const register = useCallback((id: number, g: THREE.Group | null) => {
    if (g) refs.current.set(id, g);
    else {
      refs.current.delete(id);
      limbs.current.delete(id);
    }
  }, []);

  const registerLimbs = useCallback(
    (id: number, parts: { la: THREE.Object3D; ra: THREE.Object3D; ll: THREE.Object3D; rl: THREE.Object3D } | null) => {
      if (parts) limbs.current.set(id, parts);
    },
    [],
  );

  useFrame(() => {
    for (const v of sim.villagers) {
      const g = refs.current.get(v.id);
      if (!g) continue;
      const speed = Math.hypot(v.vx, v.vz);
      const gait = Math.min(1, speed / 1.3);
      g.position.set(v.x, Math.abs(Math.sin(v.anim * 2)) * 0.035 * gait, v.z);
      // 급회전하면 기계처럼 보인다. 회전은 항상 보간한다
      const diff = ((v.facing - g.rotation.y + Math.PI) % (Math.PI * 2)) - Math.PI;
      g.rotation.y += diff * 0.15;

      const l = limbs.current.get(v.id);
      if (l) {
        const swing = Math.sin(v.anim * 2) * 0.55 * gait;
        l.la.rotation.x = swing;
        l.ra.rotation.x = -swing;
        l.ll.rotation.x = -swing * 0.8;
        l.rl.rotation.x = swing * 0.8;
      }
    }
  });

  return (
    <>
      {roster.map((m) => (
        <Villager key={m.id} data={m} register={register} registerLimbs={registerLimbs} />
      ))}
    </>
  );
}

function Villager({
  data,
  register,
  registerLimbs,
}: {
  data: CrowdMember;
  register: (id: number, g: THREE.Group | null) => void;
  registerLimbs: (
    id: number,
    parts: { la: THREE.Object3D; ra: THREE.Object3D; ll: THREE.Object3D; rl: THREE.Object3D } | null,
  ) => void;
}) {
  const la = useRef<THREE.Group>(null);
  const ra = useRef<THREE.Group>(null);
  const ll = useRef<THREE.Group>(null);
  const rl = useRef<THREE.Group>(null);

  const attach = useCallback(
    (g: THREE.Group | null) => {
      register(data.id, g);
      if (g && la.current && ra.current && ll.current && rl.current) {
        registerLimbs(data.id, { la: la.current, ra: ra.current, ll: ll.current, rl: rl.current });
      }
    },
    [data.id, register, registerLimbs],
  );

  const h = data.height;
  return (
    <group ref={attach} scale={[1, h, 1]}>
      {/* 다리 — 회전축이 고관절에 오도록 group으로 감싼다 */}
      <group ref={ll} position={[-0.1, 0.72, 0]}>
        <mesh position={[0, -0.26, 0]} castShadow>
          <boxGeometry args={[0.15, 0.52, 0.16]} />
          <meshStandardMaterial color={data.bottom} roughness={0.9} />
        </mesh>
      </group>
      <group ref={rl} position={[0.1, 0.72, 0]}>
        <mesh position={[0, -0.26, 0]} castShadow>
          <boxGeometry args={[0.15, 0.52, 0.16]} />
          <meshStandardMaterial color={data.bottom} roughness={0.9} />
        </mesh>
      </group>
      {/* 상체 */}
      <mesh position={[0, 0.95, 0]} castShadow>
        <boxGeometry args={[0.38, 0.48, 0.24]} />
        <meshStandardMaterial color={data.top} roughness={0.85} />
      </mesh>
      {/* 팔 — 회전축은 어깨 */}
      <group ref={la} position={[-0.24, 1.15, 0]}>
        <mesh position={[0, -0.2, 0]} castShadow>
          <boxGeometry args={[0.1, 0.44, 0.12]} />
          <meshStandardMaterial color={data.top} roughness={0.85} />
        </mesh>
      </group>
      <group ref={ra} position={[0.24, 1.15, 0]}>
        <mesh position={[0, -0.2, 0]} castShadow>
          <boxGeometry args={[0.1, 0.44, 0.12]} />
          <meshStandardMaterial color={data.top} roughness={0.85} />
        </mesh>
      </group>
      {/* 머리 */}
      <mesh position={[0, 1.32, 0]} castShadow>
        <sphereGeometry args={[0.13, 12, 10]} />
        <meshStandardMaterial color={data.skin} roughness={0.8} />
      </mesh>
    </group>
  );
}
