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
      {/* 가게를 지키는 사람. 비어 있는 노점은 아무리 예뻐도 죽은 화면이다 */}
      <Keeper x={S.x - 0.5} color="#4a5c6e" skin="#dcae87" />
      {snap.upg.helper > 0 && <Keeper x={S.x + 1.0} color="#6b4a2f" skin="#e8c3a0" offset={1.7} />}

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

      {/* 떡볶이 솥 */}
      {snap.upg.tteok > 0 && <TteokPot />}

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

      {/* 라디오 */}
      {snap.upg.radio > 0 && (
        <group position={[S.x + 1.5, 1.2, S.z + 0.5]}>
          <mesh castShadow>
            <boxGeometry args={[0.3, 0.18, 0.14]} />
            <meshStandardMaterial color="#6b5a44" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0, -0.08]}>
            <boxGeometry args={[0.16, 0.12, 0.01]} />
            <meshStandardMaterial color="#2a2420" emissive="#ffb257" emissiveIntensity={0.3} />
          </mesh>
        </group>
      )}

      {/* 화분 */}
      {snap.upg.planter > 0 &&
        [-2.6, 2.6].map((dx) => (
          <group key={dx} position={[S.x + dx, 0, S.z - 1.3]}>
            <mesh position={[0, 0.17, 0]} castShadow>
              <cylinderGeometry args={[0.24, 0.19, 0.34, 10]} />
              <meshStandardMaterial color="#6b4a35" roughness={1} />
            </mesh>
            <mesh position={[0, 0.46, 0]} castShadow>
              <sphereGeometry args={[0.28, 8, 6]} />
              <meshStandardMaterial color="#2a4030" roughness={1} />
            </mesh>
          </group>
        ))}

      {/* 테이블과 의자 */}
      {snap.upg.table > 0 && (
        <group position={[S.x - 3.4, 0, -2.1]}>
          <mesh position={[0, 0.72, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.5, 0.07, 0.8]} />
            <meshStandardMaterial color="#7d6244" roughness={0.9} />
          </mesh>
          {[-0.62, 0.62].map((dx) =>
            [-0.3, 0.3].map((dz) => (
              <mesh key={`${dx}:${dz}`} position={[dx, 0.35, dz]} castShadow>
                <boxGeometry args={[0.06, 0.7, 0.06]} />
                <meshStandardMaterial color="#4a3a2c" roughness={1} />
              </mesh>
            )),
          )}
          {[-1.05, 1.05].map((dx) => (
            <mesh key={dx} position={[dx, 0.42, 0]} castShadow>
              <boxGeometry args={[0.42, 0.08, 0.42]} />
              <meshStandardMaterial color="#6b4a35" roughness={0.95} />
            </mesh>
          ))}
        </group>
      )}

      {/* 전구 줄 — 마지막 겨울에 켜지는 불빛 */}
      {snap.upg.lights > 0 && <StringLights />}
    </group>
  );
}

/** 천막 앞을 가로지르는 전구 줄. 하나씩 조금씩 다르게 깜빡인다 */
function StringLights() {
  const bulbs = useMemo(
    () => Array.from({ length: 11 }, (_, i) => ({ x: -1.9 + i * 0.38, phase: Math.random() * 6.3 })),
    [],
  );
  const group = useRef<THREE.Group>(null);

  useFrame(() => {
    const t = performance.now() * 0.001;
    const children = group.current?.children ?? [];
    for (let i = 0; i < children.length; i++) {
      const mesh = children[i] as THREE.Mesh;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 1.1 + Math.sin(t * 1.4 + bulbs[i].phase) * 0.25;
    }
  });

  return (
    <>
      <mesh position={[S.x, 2.14, S.z - 1.16]}>
        <boxGeometry args={[4.1, 0.015, 0.015]} />
        <meshStandardMaterial color="#2a2a2a" roughness={1} />
      </mesh>
      <group ref={group}>
        {bulbs.map((b, i) => (
          <mesh key={i} position={[S.x + b.x, 2.06, S.z - 1.16]}>
            <sphereGeometry args={[0.045, 8, 6]} />
            <meshStandardMaterial color="#ffd9a0" emissive="#ffb257" emissiveIntensity={1.1} />
          </mesh>
        ))}
      </group>
      <pointLight position={[S.x, 2.0, S.z - 1.2]} color="#ffc98a" intensity={9} distance={9} decay={2} />
    </>
  );
}

/**
 * 떡볶이 솥. 끓는 동안 표면이 일렁이고, 남은 그릇 수에 따라 색이 달라진다.
 * 솥이 비면 눈에 띄게 어두워져서 "지금 없다"를 멀리서도 알 수 있다.
 */
function TteokPot() {
  const surface = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(() => {
    const pot = sim.tteokPot;
    const t = performance.now() * 0.001;
    if (surface.current) {
      surface.current.position.y = pot.cooking ? 0.14 + Math.sin(t * 5) * 0.006 : 0.13;
    }
    if (mat.current) {
      const hot = pot.servings > 0 ? 1 : pot.cooking ? 0.45 : 0.15;
      mat.current.emissiveIntensity = 0.25 + hot * 0.55;
      mat.current.color.setRGB(0.62 * hot + 0.08, 0.16 * hot + 0.04, 0.1 * hot + 0.03);
    }
  });

  return (
    <group position={[S.x - 1.65, 1.12, S.z - 0.3]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.36, 0.33, 0.24, 18]} />
        <meshStandardMaterial color="#2f3439" roughness={0.45} metalness={0.55} />
      </mesh>
      <mesh ref={surface} position={[0, 0.14, 0]}>
        <cylinderGeometry args={[0.33, 0.33, 0.02, 18]} />
        <meshStandardMaterial ref={mat} color="#9e2a18" emissive="#8a1f10" emissiveIntensity={0.5} roughness={0.35} />
      </mesh>
    </group>
  );
}


/**
 * 카운터 뒤에 선 사람. 굽는 틀이 있으면 팔을 움직이고, 없으면 가볍게 흔들린다.
 * 손님 모델과 달리 걷지 않으므로 여기서 따로 그린다.
 */
function Keeper({ x, color, skin, offset = 0 }: { x: number; color: string; skin: string; offset?: number }) {
  const arm = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);

  useFrame(() => {
    const t = performance.now() * 0.001 + offset;
    const working = sim.molds.some((m) => m.baking);
    if (arm.current) {
      // 굽는 중에는 손을 놀리고, 아니면 거의 멈춰 있다
      arm.current.rotation.x = working ? Math.sin(t * 3.4) * 0.5 - 0.3 : Math.sin(t * 0.8) * 0.06;
    }
    if (body.current) body.current.position.y = Math.sin(t * 0.9) * 0.012;
  });

  return (
    <group ref={body} position={[x, 0, S.z + 0.45]} rotation={[0, Math.PI, 0]}>
      <mesh position={[0, 0.46, 0]} castShadow>
        <boxGeometry args={[0.34, 0.92, 0.2]} />
        <meshStandardMaterial color="#2e3b4e" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.08, 0]} castShadow>
        <boxGeometry args={[0.42, 0.5, 0.26]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      {/* 앞치마 */}
      <mesh position={[0, 0.78, -0.15]}>
        <boxGeometry args={[0.36, 0.5, 0.03]} />
        <meshStandardMaterial color="#d8d2c4" roughness={1} />
      </mesh>
      <group ref={arm} position={[-0.26, 1.28, 0]}>
        <mesh position={[0, -0.2, -0.04]} castShadow>
          <boxGeometry args={[0.1, 0.46, 0.12]} />
          <meshStandardMaterial color={color} roughness={0.85} />
        </mesh>
      </group>
      <mesh position={[0.26, 1.08, 0]} castShadow>
        <boxGeometry args={[0.1, 0.46, 0.12]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.46, 0]} castShadow>
        <sphereGeometry args={[0.13, 12, 10]} />
        <meshStandardMaterial color={skin} roughness={0.8} />
      </mesh>
      {/* 두건 */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <sphereGeometry args={[0.138, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#c2552f" roughness={1} />
      </mesh>
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
