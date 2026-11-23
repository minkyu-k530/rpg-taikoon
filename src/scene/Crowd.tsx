import { useCallback, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Look } from '../game/residents';
import { sim, useRoster, type CrowdMember } from '../game/useSim';
import { textTexture } from './textSprite';

/**
 * 회색 박스 단계의 주민. 캡슐이 아니라 상의/하의/머리/소지품으로 나눈 이유는
 * "같은 사람이 또 왔다"를 플레이어가 알아볼 수 있어야 하기 때문이다 (GDD 7장).
 */
export function Crowd() {
  const roster = useRoster();
  const bodies = useRef(new Map<number, THREE.Group>());
  const limbs = useRef(new Map<number, Limbs>());

  const register = useCallback((id: number, g: THREE.Group | null) => {
    if (g) bodies.current.set(id, g);
    else {
      bodies.current.delete(id);
      limbs.current.delete(id);
    }
  }, []);

  const registerLimbs = useCallback((id: number, parts: Limbs) => {
    limbs.current.set(id, parts);
  }, []);

  useFrame(() => {
    for (const v of sim.villagers) {
      const g = bodies.current.get(v.id);
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

interface Limbs {
  la: THREE.Object3D;
  ra: THREE.Object3D;
  ll: THREE.Object3D;
  rl: THREE.Object3D;
}

function Villager({
  data,
  register,
  registerLimbs,
}: {
  data: CrowdMember;
  register: (id: number, g: THREE.Group | null) => void;
  registerLimbs: (id: number, parts: Limbs) => void;
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

  const look = data.look;
  return (
    <group ref={attach} scale={[1, look.height, 1]}>
      {/* 다리 — 회전축이 고관절에 오도록 group으로 감싼다 */}
      <group ref={ll} position={[-0.1, 0.72, 0]}>
        <mesh position={[0, -0.26, 0]} castShadow>
          <boxGeometry args={[0.15, 0.52, 0.16]} />
          <meshStandardMaterial color={look.bottom} roughness={0.9} />
        </mesh>
      </group>
      <group ref={rl} position={[0.1, 0.72, 0]}>
        <mesh position={[0, -0.26, 0]} castShadow>
          <boxGeometry args={[0.15, 0.52, 0.16]} />
          <meshStandardMaterial color={look.bottom} roughness={0.9} />
        </mesh>
      </group>

      {/* 상체 */}
      <mesh position={[0, 0.95, 0]} castShadow>
        <boxGeometry args={[0.38, 0.48, 0.24]} />
        <meshStandardMaterial color={look.top} roughness={0.85} />
      </mesh>

      {/* 팔 — 회전축은 어깨 */}
      <group ref={la} position={[-0.24, 1.15, 0]}>
        <mesh position={[0, -0.2, 0]} castShadow>
          <boxGeometry args={[0.1, 0.44, 0.12]} />
          <meshStandardMaterial color={look.top} roughness={0.85} />
        </mesh>
      </group>
      <group ref={ra} position={[0.24, 1.15, 0]}>
        <mesh position={[0, -0.2, 0]} castShadow>
          <boxGeometry args={[0.1, 0.44, 0.12]} />
          <meshStandardMaterial color={look.top} roughness={0.85} />
        </mesh>
      </group>

      {/* 머리 */}
      <mesh position={[0, 1.32, 0]} castShadow>
        <sphereGeometry args={[0.13, 12, 10]} />
        <meshStandardMaterial color={look.skin} roughness={0.8} />
      </mesh>

      <Headwear look={look} />
      {look.bag && <Bag color={look.bagColor} />}

      {data.name && <Label text={data.name} kind="name" y={1.62} height={0.17} />}
      {data.speech && <Label text={data.speech} kind="speech" y={1.92} height={0.22} />}
    </group>
  );
}

/** 모자와 머리. 20명이 각기 달라 보이게 하는 가장 싼 수단 */
function Headwear({ look }: { look: Look }) {
  switch (look.accessory) {
    case 'cap':
      return (
        <group position={[0, 1.4, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.135, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color={look.accessoryColor} roughness={0.9} />
          </mesh>
          <mesh position={[0, -0.01, -0.14]}>
            <boxGeometry args={[0.22, 0.02, 0.14]} />
            <meshStandardMaterial color={look.accessoryColor} roughness={0.9} />
          </mesh>
        </group>
      );
    case 'beanie':
      return (
        <mesh position={[0, 1.37, 0]} castShadow>
          <sphereGeometry args={[0.145, 10, 8]} />
          <meshStandardMaterial color={look.accessoryColor} roughness={1} />
        </mesh>
      );
    case 'helmet':
      return (
        <mesh position={[0, 1.36, 0]} castShadow>
          <sphereGeometry args={[0.155, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
          <meshStandardMaterial color={look.accessoryColor} roughness={0.4} metalness={0.1} />
        </mesh>
      );
    case 'hood':
      return (
        <mesh position={[0, 1.28, 0.07]} castShadow>
          <sphereGeometry args={[0.175, 10, 8]} />
          <meshStandardMaterial color={look.accessoryColor} roughness={1} />
        </mesh>
      );
    case 'bun':
      return (
        <group>
          <mesh position={[0, 1.36, 0]} castShadow>
            <sphereGeometry args={[0.14, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color={look.accessoryColor} roughness={1} />
          </mesh>
          <mesh position={[0, 1.42, 0.12]} castShadow>
            <sphereGeometry args={[0.07, 8, 6]} />
            <meshStandardMaterial color={look.accessoryColor} roughness={1} />
          </mesh>
        </group>
      );
    case 'long':
      return (
        <group>
          <mesh position={[0, 1.36, 0]} castShadow>
            <sphereGeometry args={[0.14, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color={look.accessoryColor} roughness={1} />
          </mesh>
          <mesh position={[0, 1.18, 0.1]} castShadow>
            <boxGeometry args={[0.24, 0.3, 0.1]} />
            <meshStandardMaterial color={look.accessoryColor} roughness={1} />
          </mesh>
        </group>
      );
    default:
      return (
        <mesh position={[0, 1.345, 0]} castShadow>
          <sphereGeometry args={[0.133, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#2a2420" roughness={1} />
        </mesh>
      );
  }
}

function Bag({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[0, 0.98, 0.2]} castShadow>
        <boxGeometry args={[0.26, 0.34, 0.14]} />
        <meshStandardMaterial color={color} roughness={0.95} />
      </mesh>
      <mesh position={[0, 1.16, 0.08]}>
        <boxGeometry args={[0.3, 0.06, 0.2]} />
        <meshStandardMaterial color={color} roughness={0.95} />
      </mesh>
    </group>
  );
}

/** 머리 위 이름표와 말풍선. 카메라를 항상 바라보는 스프라이트 */
function Label({ text, kind, y, height }: { text: string; kind: 'name' | 'speech'; y: number; height: number }) {
  const { texture, aspect } = useMemo(() => textTexture(text, kind), [text, kind]);
  return (
    <sprite position={[0, y, 0]} scale={[height * aspect, height, 1]}>
      <spriteMaterial map={texture} transparent depthTest={false} />
    </sprite>
  );
}
