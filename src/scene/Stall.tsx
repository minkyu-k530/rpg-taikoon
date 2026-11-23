import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CONFIG, LAYOUT } from '../game/config';
import { sim, useSnapshot } from '../game/useSim';

const S = LAYOUT.stall;

const COLOR_IDLE = new THREE.Color('#2f2a26');
const COLOR_RAW = new THREE.Color('#d8c08a');
const COLOR_BAKED = new THREE.Color('#c8863c');
const COLOR_FLIP = new THREE.Color('#ffd45e');
const COLOR_BURNT = new THREE.Color('#4e2d18');

/** 붕어빵 틀 위치. 4개씩 두 줄 */
function moldPos(i: number): [number, number, number] {
  const col = i % 4;
  const row = (i / 4) | 0;
  return [S.x - 1.2 + col * 0.52, 1.1, S.z - 0.45 + row * 0.46];
}

export function Stall() {
  const snap = useSnapshot();

  return (
    <group>
      {/* 몸체 */}
      <mesh position={[S.x, 0.52, S.z]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 1.04, 1.5]} />
        <meshStandardMaterial color="#6a4a33" roughness={0.9} />
      </mesh>
      {/* 상판 */}
      <mesh position={[S.x, 1.07, S.z - 0.1]} castShadow receiveShadow>
        <boxGeometry args={[3.5, 0.08, 1.9]} />
        <meshStandardMaterial color="#8c6a4a" roughness={0.75} />
      </mesh>

      {/* 기둥 4개 */}
      {[
        [-1.6, -0.85],
        [1.6, -0.85],
        [-1.6, 0.75],
        [1.6, 0.75],
      ].map(([dx, dz], i) => (
        <mesh key={i} position={[S.x + dx, 1.6, S.z + dz]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 1.2, 6]} />
          <meshStandardMaterial color="#4a4a4a" roughness={0.6} metalness={0.3} />
        </mesh>
      ))}

      {/* 천막 */}
      <mesh position={[S.x, 2.26, S.z - 0.05]} castShadow>
        <boxGeometry args={[3.9, 0.12, 2.3]} />
        <meshStandardMaterial color="#c2552f" roughness={0.85} />
      </mesh>
      <mesh position={[S.x, 2.02, S.z - 1.14]}>
        <boxGeometry args={[3.9, 0.4, 0.06]} />
        <meshStandardMaterial color="#d2643a" roughness={0.85} />
      </mesh>

      {/* 포장마차 안쪽 등 — 이 게임의 색을 결정하는 광원 */}
      <pointLight
        position={[S.x, 1.95, S.z - 0.1]}
        color="#ffb257"
        intensity={22}
        distance={18}
        decay={2}
        castShadow
        shadow-mapSize={[512, 512]}
      />
      <mesh position={[S.x, 2.12, S.z - 0.1]}>
        <sphereGeometry args={[0.09, 8, 8]} />
        <meshBasicMaterial color="#ffd9a0" />
      </mesh>

      {/* 붕어빵 틀 */}
      {snap.molds.map((_, i) => (
        <Mold key={i} index={i} />
      ))}

      {/* 진열대 */}
      <Tray count={snap.tray} />

      {/* 어묵 솥 */}
      {snap.upg.oden > 0 && (
        <group position={[S.x + 1.25, 1.12, S.z - 0.3]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.32, 0.3, 0.26, 16]} />
            <meshStandardMaterial color="#3d4248" roughness={0.5} metalness={0.5} />
          </mesh>
          <mesh position={[0, 0.14, 0]}>
            <cylinderGeometry args={[0.29, 0.29, 0.02, 16]} />
            <meshStandardMaterial color="#c9a36a" emissive="#5a3d14" roughness={0.4} />
          </mesh>
        </group>
      )}

      {/* 간판 */}
      {snap.upg.sign > 0 && (
        <group position={[S.x, 2.75, S.z - 1.0]}>
          <mesh>
            <boxGeometry args={[2.2 + snap.upg.sign * 0.3, 0.5, 0.08]} />
            <meshStandardMaterial
              color="#2b2320"
              emissive="#ff8a3d"
              emissiveIntensity={0.35 + snap.upg.sign * 0.15}
              roughness={0.7}
            />
          </mesh>
        </group>
      )}

      {/* 온풍기 */}
      {snap.upg.heater > 0 && (
        <mesh position={[S.x - 2.1, 0.35, S.z - 0.9]} castShadow>
          <boxGeometry args={[0.4, 0.7, 0.4]} />
          <meshStandardMaterial color="#555" emissive="#ff4d1a" emissiveIntensity={0.5} roughness={0.6} />
        </mesh>
      )}
    </group>
  );
}

/** 틀 하나. 색은 매 프레임 sim에서 직접 읽어 갱신한다 (리렌더 없음) */
function Mold({ index }: { index: number }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const pos = useMemo(() => moldPos(index), [index]);
  const tmp = useMemo(() => new THREE.Color(), []);

  useFrame(() => {
    const m = sim.molds[index];
    const material = mat.current;
    if (!m || !material) return;
    const [a, b] = CONFIG.bake.flipWindow;
    if (!m.baking) {
      material.color.copy(COLOR_IDLE);
      material.emissiveIntensity = 0;
      return;
    }
    if (!m.flipped && m.t >= a && m.t < b) {
      // 뒤집기 창: 깜빡여서 "지금이야"를 알린다
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.012);
      material.color.copy(COLOR_FLIP);
      material.emissive.copy(COLOR_FLIP);
      material.emissiveIntensity = 0.3 + pulse * 0.7;
      return;
    }
    material.emissiveIntensity = 0;
    const p = Math.min(1, m.t / CONFIG.bake.time);
    const target = m.burnt ? COLOR_BURNT : COLOR_BAKED;
    material.color.copy(tmp.copy(COLOR_RAW).lerp(target, p));
  });

  return (
    <mesh
      position={pos}
      castShadow
      onClick={(e) => {
        e.stopPropagation();
        sim.flip(index);
      }}
    >
      <cylinderGeometry args={[0.18, 0.18, 0.07, 14]} />
      <meshStandardMaterial ref={mat} color="#2f2a26" emissive="#000000" roughness={0.55} metalness={0.2} />
    </mesh>
  );
}

/** 진열대에 쌓인 붕어빵 */
function Tray({ count }: { count: number }) {
  const shown = Math.min(count, 12);
  return (
    <group position={[S.x - 1.35, 1.14, S.z + 0.45]}>
      <mesh receiveShadow>
        <boxGeometry args={[1.2, 0.04, 0.6]} />
        <meshStandardMaterial color="#7d6244" roughness={0.9} />
      </mesh>
      {Array.from({ length: shown }, (_, i) => {
        const col = i % 4;
        const row = ((i / 4) | 0) % 2;
        const layer = (i / 8) | 0;
        return (
          <mesh key={i} position={[-0.42 + col * 0.28, 0.07 + layer * 0.08, -0.14 + row * 0.28]} castShadow>
            <boxGeometry args={[0.22, 0.07, 0.13]} />
            <meshStandardMaterial color="#d79a4e" roughness={0.7} />
          </mesh>
        );
      })}
    </group>
  );
}
