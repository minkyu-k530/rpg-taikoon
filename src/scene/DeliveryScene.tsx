import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { COURSE, type Obstacle } from '../game/delivery';
import { SEASONS } from '../game/season';
import { sim, useSnapshot } from '../game/useSim';

/**
 * 배달 코스.
 *
 * 가게 씬과 같은 도형을 가로로 늘려 쓴다. 새로 만든 에셋은 없다.
 * 플레이어는 +X로 자동 전진하고 Z로만 피한다.
 */
export function DeliveryScene() {
  const snap = useSnapshot(2);
  const season = SEASONS[snap.season];
  const total = sim.delivery?.total ?? 300;

  return (
    <>
      <fog attach="fog" args={[season.fog, 22, 90]} />
      <color attach="background" args={[season.background]} />
      <hemisphereLight args={[season.sky, season.ground, 1.15]} />
      <directionalLight position={[-20, 18, -10]} intensity={0.75} color="#9dbcf0" />

      <CourseGround total={total} grass={season.grass} />
      <Railing total={total} />
      <Lamps total={total} />
      <Trees total={total} foliage={season.foliage} />
      <Skyline total={total} />
      <Obstacles />
      <Runner />
      <Goal total={total} />
      <ChaseCamera />
    </>
  );
}

/** 카메라는 뒤에서 따라간다. 좌우는 절반만 따라가야 어지럽지 않다 */
function ChaseCamera() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);

  useLayoutEffect(() => {
    const perspective = camera as THREE.PerspectiveCamera;
    perspective.fov = size.width / size.height < 0.95 ? 62 : 48;
    perspective.updateProjectionMatrix();
  }, [camera, size]);

  useFrame((_, dt) => {
    const d = sim.delivery;
    if (!d) return;
    const k = Math.min(1, dt * 6);
    const wantX = d.distance - 8.5;
    const wantZ = d.z * 0.45;
    camera.position.x += (wantX - camera.position.x) * k;
    camera.position.y += (4.1 - camera.position.y) * k;
    camera.position.z += (wantZ - camera.position.z) * k;
    camera.lookAt(d.distance + 7, 1.3 + d.height * 0.3, d.z * 0.7);
  });

  return null;
}

function CourseGround({ total, grass }: { total: number; grass: string }) {
  const len = total + 80;
  return (
    <group position={[len / 2 - 30, 0, 0]}>
      {/* 산책로 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[len, COURSE.halfWidth * 2 + 1.6]} />
        <meshStandardMaterial color="#39342e" roughness={1} />
      </mesh>
      {/* 천변 둔치 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 7]}>
        <planeGeometry args={[len, 10]} />
        <meshStandardMaterial color={grass} roughness={1} />
      </mesh>
      {/* 하천 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 18]}>
        <planeGeometry args={[len, 16]} />
        <meshStandardMaterial color="#0c161f" roughness={0.12} metalness={0.75} />
      </mesh>
      {/* 반대편 둔치 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, -8]}>
        <planeGeometry args={[len, 10]} />
        <meshStandardMaterial color={grass} roughness={1} />
      </mesh>
    </group>
  );
}

/** 난간 기둥은 수가 많아 인스턴싱한다 */
function Railing({ total }: { total: number }) {
  const posts = useMemo(() => {
    const out: number[] = [];
    for (let x = -20; x < total + 40; x += 2.6) out.push(x);
    return out;
  }, [total]);
  const ref = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    posts.forEach((x, i) => {
      m.setPosition(x, 0.48, COURSE.halfWidth + 0.9);
      ref.current?.setMatrixAt(i, m);
    });
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
  }, [posts]);

  const len = total + 80;
  return (
    <group>
      <mesh position={[len / 2 - 30, 0.92, COURSE.halfWidth + 0.9]}>
        <boxGeometry args={[len, 0.07, 0.07]} />
        <meshStandardMaterial color="#3c4248" roughness={0.6} metalness={0.4} />
      </mesh>
      <instancedMesh ref={ref} args={[undefined, undefined, posts.length]} frustumCulled={false}>
        <boxGeometry args={[0.07, 0.95, 0.07]} />
        <meshStandardMaterial color="#343a40" roughness={0.6} metalness={0.4} />
      </instancedMesh>
    </group>
  );
}

function Lamps({ total }: { total: number }) {
  const xs = useMemo(() => {
    const out: number[] = [];
    for (let x = 0; x < total + 30; x += 12) out.push(x);
    return out;
  }, [total]);
  return (
    <>
      {xs.map((x) => (
        <group key={x} position={[x, 0, COURSE.halfWidth + 1.4]}>
          <mesh position={[0, 1.7, 0]}>
            <cylinderGeometry args={[0.07, 0.09, 3.4, 6]} />
            <meshStandardMaterial color="#2c3238" roughness={0.7} metalness={0.4} />
          </mesh>
          <mesh position={[0, 3.45, -0.4]}>
            <boxGeometry args={[0.34, 0.14, 0.8]} />
            <meshStandardMaterial color="#1f2429" emissive="#ffd9a0" emissiveIntensity={1.5} />
          </mesh>
          <pointLight position={[0, 3.2, -0.5]} color="#ffcf96" intensity={11} distance={13} decay={2} />
        </group>
      ))}
    </>
  );
}

function Trees({ total, foliage }: { total: number; foliage: string }) {
  const trees = useMemo(() => {
    const out: { x: number; z: number; h: number; r: number }[] = [];
    for (let x = -10; x < total + 30; x += 7) {
      out.push({
        x: x + (Math.random() - 0.5) * 3,
        z: -(COURSE.halfWidth + 2 + Math.random() * 3),
        h: 2.6 + Math.random() * 1.6,
        r: 0.7 + Math.random() * 0.4,
      });
    }
    return out;
  }, [total]);
  return (
    <>
      {trees.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]}>
          <mesh position={[0, t.h / 2, 0]}>
            <cylinderGeometry args={[0.1, 0.14, t.h, 5]} />
            <meshStandardMaterial color="#2a241e" roughness={1} />
          </mesh>
          <mesh position={[0, t.h + t.r * 0.5, 0]}>
            <sphereGeometry args={[t.r, 7, 5]} />
            <meshStandardMaterial color={foliage} roughness={1} />
          </mesh>
        </group>
      ))}
    </>
  );
}

/** 건너편 오피스. 달릴수록 가까워진다 — 목적지가 눈에 보여야 한다 */
function Skyline({ total }: { total: number }) {
  const buildings = useMemo(() => {
    const out: { x: number; z: number; w: number; h: number; d: number; lit: number }[] = [];
    for (let x = -20; x < total + 60; x += 11) {
      out.push({
        x: x + (Math.random() - 0.5) * 4,
        z: 30 + Math.random() * 14,
        w: 6 + Math.random() * 6,
        h: 10 + Math.random() * 16,
        d: 8 + Math.random() * 6,
        lit: 0.35 + Math.random() * 0.3,
      });
    }
    return out;
  }, [total]);

  const windows = useMemo(() => {
    const out: [number, number, number][] = [];
    for (const b of buildings) {
      const cols = Math.max(2, Math.floor(b.w / 1.6));
      const rows = Math.max(3, Math.floor(b.h / 2.1));
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          if (Math.random() > b.lit) continue;
          out.push([b.x - b.w / 2 + 0.8 + c * (b.w / cols), 1.4 + r * (b.h / rows), b.z - b.d / 2 - 0.06]);
        }
      }
    }
    return out;
  }, [buildings]);

  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    windows.forEach((p, i) => {
      m.setPosition(p[0], p[1], p[2]);
      ref.current?.setMatrixAt(i, m);
    });
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
  }, [windows]);

  return (
    <group>
      {buildings.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2, b.z]}>
          <boxGeometry args={[b.w, b.h, b.d]} />
          <meshStandardMaterial color="#1c2431" roughness={1} />
        </mesh>
      ))}
      <instancedMesh ref={ref} args={[undefined, undefined, Math.max(1, windows.length)]} frustumCulled={false}>
        <planeGeometry args={[0.72, 1.05]} />
        <meshBasicMaterial color="#ffdcab" fog={false} side={THREE.DoubleSide} />
      </instancedMesh>
    </group>
  );
}

/** 도착 지점 표시 */
function Goal({ total }: { total: number }) {
  return (
    <group position={[total, 0, 0]}>
      <mesh position={[0, 2.2, 0]}>
        <boxGeometry args={[0.25, 4.4, COURSE.halfWidth * 2 + 1]} />
        <meshStandardMaterial color="#2b2320" emissive="#ffb257" emissiveIntensity={0.5} transparent opacity={0.35} />
      </mesh>
      <pointLight position={[0, 2.4, 0]} color="#ffb257" intensity={14} distance={14} decay={2} />
    </group>
  );
}

function Obstacles() {
  const snap = useSnapshot(4);
  const list = sim.delivery?.obstacles ?? [];
  // 10Hz 스냅샷으로는 '맞았다'가 늦게 반영된다. 매 프레임 visible만 직접 끈다
  const refs = useRef(new Map<number, THREE.Group>());
  useFrame(() => {
    for (const o of sim.delivery?.obstacles ?? []) {
      const g = refs.current.get(o.id);
      if (g) g.visible = !o.hit;
    }
  });

  return (
    <>
      {list.map((o) => (
        <group
          key={`${snap.day}:${o.id}`}
          ref={(g) => {
            if (g) refs.current.set(o.id, g);
            else refs.current.delete(o.id);
          }}
          position={[o.x, 0, o.z]}
        >
          <ObstacleMarker o={o} />
          <ObstacleMesh o={o} />
        </group>
      ))}
    </>
  );
}

/** 밤길이라 실루엣만으로는 안 보인다. 바닥에 표식을 깔아 멀리서도 읽히게 한다 */
function ObstacleMarker({ o }: { o: Obstacle }) {
  const warn = o.kind === 'raccoon' ? '#ff8a6a' : o.kind === 'puddle' ? '#6fb6ff' : '#ffc27a';
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
      <ringGeometry args={[o.r * 0.78, o.r * 1.02, 20]} />
      <meshBasicMaterial color={warn} transparent opacity={0.45} fog={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

function ObstacleMesh({ o }: { o: Obstacle }) {
  switch (o.kind) {
    case 'bike':
      return (
        <group rotation={[0, Math.PI / 2, 0]}>
          {[-0.45, 0.45].map((dz) => (
            <mesh key={dz} position={[0, 0.32, dz]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.3, 0.045, 6, 14]} />
              <meshStandardMaterial color="#3a4048" roughness={0.5} metalness={0.4} />
            </mesh>
          ))}
          <mesh position={[0, 0.58, 0]}>
            <boxGeometry args={[0.1, 0.1, 1.0]} />
            <meshStandardMaterial color="#6a3f3f" roughness={0.6} />
          </mesh>
          <mesh position={[0, 1.05, -0.1]}>
            <boxGeometry args={[0.32, 0.8, 0.26]} />
            <meshStandardMaterial color="#44506b" roughness={0.9} />
          </mesh>
        </group>
      );
    case 'scooter':
      return (
        <group>
          <mesh position={[0, 0.12, 0]}>
            <boxGeometry args={[0.9, 0.08, 0.26]} />
            <meshStandardMaterial color="#2f3640" roughness={0.6} />
          </mesh>
          <mesh position={[0.35, 0.6, 0]}>
            <boxGeometry args={[0.06, 1.0, 0.06]} />
            <meshStandardMaterial color="#555b63" roughness={0.5} metalness={0.4} />
          </mesh>
          <mesh position={[0.35, 1.1, 0]}>
            <boxGeometry args={[0.08, 0.06, 0.44]} />
            <meshStandardMaterial color="#555b63" roughness={0.5} metalness={0.4} />
          </mesh>
        </group>
      );
    case 'puddle':
      return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
          <circleGeometry args={[o.r, 14]} />
          <meshStandardMaterial color="#16222e" roughness={0.1} metalness={0.8} />
        </mesh>
      );
    case 'bench':
      return (
        <group>
          <mesh position={[0, 0.45, 0]}>
            <boxGeometry args={[0.5, 0.1, 1.7]} />
            <meshStandardMaterial color="#4a3a2c" roughness={1} />
          </mesh>
          <mesh position={[-0.2, 0.7, 0]}>
            <boxGeometry args={[0.08, 0.45, 1.7]} />
            <meshStandardMaterial color="#4a3a2c" roughness={1} />
          </mesh>
        </group>
      );
    case 'raccoon':
      return (
        <group>
          <mesh position={[0, 0.26, 0]}>
            <sphereGeometry args={[0.26, 8, 6]} />
            <meshStandardMaterial color="#4a4640" roughness={1} />
          </mesh>
          <mesh position={[-0.22, 0.38, 0]}>
            <sphereGeometry args={[0.17, 8, 6]} />
            <meshStandardMaterial color="#5a564e" roughness={1} />
          </mesh>
          {/* 눈가의 검은 띠 */}
          <mesh position={[-0.3, 0.4, 0]}>
            <boxGeometry args={[0.1, 0.09, 0.3]} />
            <meshStandardMaterial color="#1c1a18" roughness={1} />
          </mesh>
          <mesh position={[0.26, 0.4, 0]} rotation={[0, 0, 0.5]}>
            <cylinderGeometry args={[0.05, 0.08, 0.5, 6]} />
            <meshStandardMaterial color="#3a3630" roughness={1} />
          </mesh>
        </group>
      );
  }
}

/** 달리는 주인공과 들고 있는 쟁반 */
function Runner() {
  const body = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const tray = useRef<THREE.Group>(null);

  useFrame(() => {
    const d = sim.delivery;
    const g = body.current;
    if (!d || !g) return;
    g.position.set(d.distance, d.height, d.z);
    // 피하는 쪽으로 몸을 기울인다
    const lean = (d.targetZ - d.z) * 0.22;
    g.rotation.z = -lean;
    g.rotation.y = -Math.PI / 2 + lean * 0.5;

    const swing = Math.sin(d.distance * 2.6) * (d.grounded ? 0.8 : 0.25);
    if (legL.current) legL.current.rotation.x = swing;
    if (legR.current) legR.current.rotation.x = -swing;
    if (tray.current) tray.current.position.y = 1.0 + Math.abs(Math.sin(d.distance * 2.6)) * 0.03;
  });

  const left = sim.delivery?.left ?? 0;
  return (
    <group ref={body}>
      {/* 달리는 사람이 안 보이면 피할 수가 없다. 따라다니는 약한 빛 하나 */}
      <pointLight position={[0, 3, -1.5]} color="#ffd9b0" intensity={16} distance={9} decay={2} />
      <group ref={legL} position={[-0.1, 0.72, 0]}>
        <mesh position={[0, -0.26, 0]}>
          <boxGeometry args={[0.15, 0.52, 0.16]} />
          <meshStandardMaterial color="#2e3b4e" roughness={0.9} />
        </mesh>
      </group>
      <group ref={legR} position={[0.1, 0.72, 0]}>
        <mesh position={[0, -0.26, 0]}>
          <boxGeometry args={[0.15, 0.52, 0.16]} />
          <meshStandardMaterial color="#2e3b4e" roughness={0.9} />
        </mesh>
      </group>
      <mesh position={[0, 0.98, 0]}>
        <boxGeometry args={[0.42, 0.52, 0.26]} />
        <meshStandardMaterial color="#4a5c6e" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.8, -0.15]}>
        <boxGeometry args={[0.36, 0.5, 0.03]} />
        <meshStandardMaterial color="#d8d2c4" roughness={1} />
      </mesh>
      <mesh position={[0, 1.4, 0]}>
        <sphereGeometry args={[0.13, 12, 10]} />
        <meshStandardMaterial color="#dcae87" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.44, 0]}>
        <sphereGeometry args={[0.138, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#c2552f" roughness={1} />
      </mesh>

      {/* 들고 있는 쟁반. 남은 개수만큼 쌓인다 */}
      <group ref={tray} position={[0, 1.0, -0.3]}>
        <mesh>
          <boxGeometry args={[0.5, 0.04, 0.34]} />
          <meshStandardMaterial color="#7d6244" roughness={0.9} />
        </mesh>
        {Array.from({ length: Math.min(left, 8) }, (_, i) => (
          <mesh key={i} position={[-0.16 + (i % 3) * 0.16, 0.06 + ((i / 3) | 0) * 0.07, -0.08 + (i % 2) * 0.12]}>
            <boxGeometry args={[0.14, 0.06, 0.09]} />
            <meshStandardMaterial color="#d79a4e" roughness={0.7} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
