import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { LAYOUT } from '../game/config';

/**
 * 판교 운중천 산책로. 회색 박스 단계라 전부 기본 도형이지만
 * 조명·안개·건너편 불빛은 지금 잡아 둔다. 잔잔함은 여기서 절반이 나온다.
 */
export function Environment() {
  return (
    <>
      {/* 밤이지만 읽혀야 한다. 안개는 멀리 밀고, 하늘빛을 올려 실루엣을 살린다 */}
      <fog attach="fog" args={['#141d2b', 24, 95]} />
      <color attach="background" args={['#0e141f']} />

      {/* 달빛 */}
      <hemisphereLight args={['#44618f', '#161d18', 1.1]} />
      <directionalLight
        position={[-14, 16, -10]}
        intensity={0.8}
        color="#9dbcf0"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-26}
        shadow-camera-right={26}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-camera-near={1}
        shadow-camera-far={60}
      />

      <Ground />
      <River />
      <Railing />
      <Lamps />
      <Trees />
      <Foreground />
      <FarBuildings />
    </>
  );
}

function Ground() {
  return (
    <group>
      {/* 산책로 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -1.6]} receiveShadow>
        <planeGeometry args={[70, 9]} />
        <meshStandardMaterial color="#39342e" roughness={1} />
      </mesh>
      {/* 포장마차가 선 흙바닥 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 1.4]} receiveShadow>
        <planeGeometry args={[70, 2.6]} />
        <meshStandardMaterial color="#2e2a24" roughness={1} />
      </mesh>
      {/* 카메라 앞쪽 잔디 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -9]} receiveShadow>
        <planeGeometry args={[70, 8]} />
        <meshStandardMaterial color="#20291f" roughness={1} />
      </mesh>
    </group>
  );
}

function River() {
  const streaks = useMemo(
    () =>
      Array.from({ length: 26 }, () => ({
        x: (Math.random() - 0.5) * 50,
        z: LAYOUT.riverNearZ + Math.random() * (LAYOUT.riverFarZ - LAYOUT.riverNearZ),
        w: 0.18 + Math.random() * 0.4,
        l: 2 + Math.random() * 5,
        o: 0.07 + Math.random() * 0.14,
      })),
    [],
  );
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, (LAYOUT.riverNearZ + LAYOUT.riverFarZ) / 2]}>
        <planeGeometry args={[80, LAYOUT.riverFarZ - LAYOUT.riverNearZ]} />
        <meshStandardMaterial color="#0c161f" roughness={0.12} metalness={0.75} />
      </mesh>
      {/* 건너편 불빛이 물에 번진 느낌. 반사 대신 띠로 흉내낸다 */}
      {streaks.map((s, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[s.x, -0.04, s.z]}>
          <planeGeometry args={[s.w, s.l]} />
          <meshBasicMaterial color="#ffc27a" transparent opacity={s.o} />
        </mesh>
      ))}
      {/* 건너편 둔치 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, LAYOUT.riverFarZ + 2.5]}>
        <planeGeometry args={[80, 6]} />
        <meshStandardMaterial color="#1b2420" roughness={1} />
      </mesh>
    </group>
  );
}

function Railing() {
  const posts = useMemo(() => Array.from({ length: 25 }, (_, i) => -30 + i * 2.5), []);
  return (
    <group position={[0, 0, LAYOUT.railZ]}>
      <mesh position={[0, 0.92, 0]} castShadow>
        <boxGeometry args={[62, 0.07, 0.07]} />
        <meshStandardMaterial color="#3c4248" roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[62, 0.05, 0.05]} />
        <meshStandardMaterial color="#343a40" roughness={0.6} metalness={0.4} />
      </mesh>
      {posts.map((x) => (
        <mesh key={x} position={[x, 0.48, 0]} castShadow>
          <boxGeometry args={[0.07, 0.95, 0.07]} />
          <meshStandardMaterial color="#343a40" roughness={0.6} metalness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function Lamps() {
  const xs = [-22, -14, -6, 2, 12, 20];
  return (
    <>
      {xs.map((x) => (
        <group key={x} position={[x, 0, 1.9]}>
          <mesh position={[0, 1.7, 0]} castShadow>
            <cylinderGeometry args={[0.07, 0.09, 3.4, 8]} />
            <meshStandardMaterial color="#2c3238" roughness={0.7} metalness={0.4} />
          </mesh>
          <mesh position={[0, 3.45, -0.3]}>
            <boxGeometry args={[0.34, 0.14, 0.7]} />
            <meshStandardMaterial color="#1f2429" emissive="#ffd9a0" emissiveIntensity={1.4} />
          </mesh>
          <pointLight position={[0, 3.3, -0.3]} color="#ffcf96" intensity={8} distance={11} decay={2} />
        </group>
      ))}
    </>
  );
}

/**
 * 카메라 바로 앞 소품. 비어 있던 전경을 채워 화면에 깊이를 만든다.
 * 산책로 건너편(관찰자 쪽) 벤치와 덤불이라는 설정.
 */
function Foreground() {
  const bushes = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        x: -13 + i * 2.1 + (Math.random() - 0.5) * 1.4,
        z: -7.4 + Math.random() * 1.2,
        r: 0.45 + Math.random() * 0.35,
      })),
    [],
  );
  return (
    <group>
      {[-7.5, 2.5].map((x) => (
        <group key={x} position={[x, 0, -6.4]}>
          <mesh position={[0, 0.45, 0]} castShadow>
            <boxGeometry args={[1.9, 0.1, 0.5]} />
            <meshStandardMaterial color="#4a3a2c" roughness={1} />
          </mesh>
          <mesh position={[0, 0.68, 0.22]} castShadow>
            <boxGeometry args={[1.9, 0.45, 0.08]} />
            <meshStandardMaterial color="#4a3a2c" roughness={1} />
          </mesh>
          {[-0.8, 0.8].map((dx) => (
            <mesh key={dx} position={[dx, 0.22, 0]} castShadow>
              <boxGeometry args={[0.1, 0.44, 0.44]} />
              <meshStandardMaterial color="#2a2f35" roughness={0.8} />
            </mesh>
          ))}
        </group>
      ))}
      {/* 쓰레기통 */}
      <mesh position={[-2.2, 0.35, -6.6]} castShadow>
        <cylinderGeometry args={[0.26, 0.22, 0.7, 10]} />
        <meshStandardMaterial color="#2d342c" roughness={0.9} />
      </mesh>
      {bushes.map((b, i) => (
        <mesh key={i} position={[b.x, b.r * 0.7, b.z]} castShadow>
          <sphereGeometry args={[b.r, 7, 5]} />
          <meshStandardMaterial color="#1b2a1d" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

function Trees() {
  const trees = useMemo(() => {
    const out: { x: number; z: number; h: number; r: number }[] = [];
    for (let i = 0; i < 16; i++) {
      const x = -26 + i * 3.6 + (Math.random() - 0.5) * 1.2;
      // 포장마차 앞을 가리면 게임이 안 보인다
      if (x > 0.5 && x < 10.5) continue;
      out.push({ x, z: 1.9 + Math.random() * 0.4, h: 2.4 + Math.random() * 1.4, r: 0.6 + Math.random() * 0.35 });
    }
    return out;
  }, []);
  return (
    <>
      {trees.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]}>
          <mesh position={[0, t.h / 2, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.14, t.h, 6]} />
            <meshStandardMaterial color="#2a241e" roughness={1} />
          </mesh>
          <mesh position={[0, t.h + t.r * 0.5, 0]} castShadow>
            <sphereGeometry args={[t.r, 8, 6]} />
            <meshStandardMaterial color="#1d2a1f" roughness={1} />
          </mesh>
        </group>
      ))}
    </>
  );
}

/** 건너편 오피스. 켜진 창이 "아직 야근 중"을 배경만으로 설명한다 (GDD 5장) */
function FarBuildings() {
  const buildings = useMemo(() => {
    const out: { x: number; w: number; h: number; d: number; z: number }[] = [];
    let x = -34;
    while (x < 34) {
      const w = 5 + Math.random() * 6;
      const h = 7 + Math.random() * 11;
      out.push({ x: x + w / 2, w, h, d: 7 + Math.random() * 5, z: LAYOUT.buildingZ + 14 + Math.random() * 10 });
      x += w + 1.2 + Math.random() * 2.5;
    }
    return out;
  }, []);

  const windows = useMemo(() => {
    const out: { p: [number, number, number]; lit: boolean }[] = [];
    for (const b of buildings) {
      const cols = Math.max(2, Math.floor(b.w / 1.5));
      const rows = Math.max(3, Math.floor(b.h / 2.0));
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          out.push({
            p: [
              b.x - b.w / 2 + 0.75 + c * (b.w / cols),
              1.2 + r * (b.h / rows),
              b.z - b.d / 2 - 0.06,
            ],
            lit: Math.random() < 0.52,
          });
        }
      }
    }
    return out;
  }, [buildings]);

  const litRef = useRef<THREE.InstancedMesh>(null);
  const darkRef = useRef<THREE.InstancedMesh>(null);
  const lit = useMemo(() => windows.filter((w) => w.lit), [windows]);
  const dark = useMemo(() => windows.filter((w) => !w.lit), [windows]);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    lit.forEach((w, i) => {
      m.setPosition(w.p[0], w.p[1], w.p[2]);
      litRef.current?.setMatrixAt(i, m);
    });
    dark.forEach((w, i) => {
      m.setPosition(w.p[0], w.p[1], w.p[2]);
      darkRef.current?.setMatrixAt(i, m);
    });
    if (litRef.current) litRef.current.instanceMatrix.needsUpdate = true;
    if (darkRef.current) darkRef.current.instanceMatrix.needsUpdate = true;
  }, [lit, dark]);

  return (
    <group>
      {buildings.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2, b.z]}>
          <boxGeometry args={[b.w, b.h, b.d]} />
          <meshStandardMaterial color="#1c2431" roughness={1} />
        </mesh>
      ))}
      {/* InstancedMesh는 원점 기준 바운딩으로 컬링되고, 평면 뒷면은 그려지지 않는다 (TS-003) */}
      <instancedMesh ref={litRef} args={[undefined, undefined, Math.max(1, lit.length)]} frustumCulled={false}>
        <planeGeometry args={[0.72, 1.05]} />
        <meshBasicMaterial color="#ffdcab" fog={false} side={THREE.DoubleSide} />
      </instancedMesh>
      <instancedMesh ref={darkRef} args={[undefined, undefined, Math.max(1, dark.length)]} frustumCulled={false}>
        <planeGeometry args={[0.72, 1.05]} />
        <meshBasicMaterial color="#232c3a" side={THREE.DoubleSide} />
      </instancedMesh>
    </group>
  );
}
