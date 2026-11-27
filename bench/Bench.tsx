import { useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Environment } from '../src/scene/Environment';
import { Stall } from '../src/scene/Stall';
import { createCharacterGeometry, makeCharacter } from './character';
import { createMeasure, type BenchResult } from './measure';

export interface BenchOptions { n: number; v: number; shadows: boolean; scene: boolean; sec: number }

function MovingCharacters({ options, onVertices, onLive, onResult }: { options: BenchOptions; onVertices: (count: number) => void; onLive: (fps: number) => void; onResult: (result: BenchResult) => void }) {
  const geometry = useMemo(() => createCharacterGeometry(options.v), [options.v]);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: '#b2a694', roughness: 0.85 }), []);
  const actors = useMemo(() => Array.from({ length: options.n }, (_, i) => {
    const actor = makeCharacter(geometry, material);
    actor.mesh.position.set(0, 0, -3.8 + Math.floor(i / 20) * 0.7);
    actor.mixer.setTime((i * 0.37) % 1);
    return actor;
  }), [geometry, material, options.n]);

  useEffect(() => {
    onVertices(geometry.getAttribute('position').count);
    return () => { geometry.dispose(); material.dispose(); actors.forEach(({ mesh, mixer }) => { mixer.stopAllAction(); mixer.uncacheRoot(mesh); }); };
  }, [actors, geometry, material, onVertices]);

  return <>{actors.map(({ mesh }, i) => <primitive key={i} object={mesh} />)}<FrameDriver options={options} vertices={geometry.getAttribute('position').count} actors={actors} onLive={onLive} onResult={onResult} /></>;
}

function CameraRig() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  useEffect(() => {
    const aspect = size.width / size.height;
    const portrait = aspect < 0.95;
    const perspective = camera as THREE.PerspectiveCamera;
    perspective.fov = portrait ? 54 : 40;
    perspective.position.set(-4.2, portrait ? 4.6 : 3.6, portrait ? -15 : -11.5);
    perspective.lookAt(3.4, 2.1, 0.5);
    perspective.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

function FrameDriver({ options, vertices, actors, onLive, onResult }: { options: BenchOptions; vertices: number; actors: ReturnType<typeof makeCharacter>[]; onLive: (fps: number) => void; onResult: (result: BenchResult) => void }) {
  const gl = useThree((state) => state.gl);
  const measure = useMemo(() => createMeasure(options.sec, gl, { n: options.n, targetVertices: options.v, actualVertices: vertices, shadows: options.shadows, scene: options.scene }, onLive, onResult, (camera) => {
    camera.updateMatrixWorld();
    const frustum = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    const sphere = new THREE.Sphere();
    let visible = 0;
    for (const { mesh } of actors) {
      sphere.copy(mesh.geometry.boundingSphere!).applyMatrix4(mesh.matrixWorld);
      if (frustum.intersectsSphere(sphere)) visible++;
    }
    return visible;
  }), [actors, gl, onLive, onResult, options, vertices]);
  useFrame((state, delta) => {
    const started = performance.now();
    const portrait = state.size.width / state.size.height < 0.95;
    const left = portrait ? -0.75 : -2;
    const right = portrait ? 4.75 : 9;
    const span = right - left;
    const now = started * 0.001;
    for (let i = 0; i < actors.length; i++) {
      const { mesh, mixer } = actors[i];
      mixer.update(delta);
      const phase = (now * 0.65 + i * 0.37) % (2 * span);
      const forward = phase < span;
      const x = forward ? left + phase : right - (phase - span);
      const reverse = i % 2 === 1;
      mesh.position.x = reverse ? left + right - x : x;
      mesh.rotation.y = (forward !== reverse ? 1 : -1) * Math.PI / 2;
    }
    gl.render(state.scene, state.camera);
    const ended = performance.now();
    measure(ended, ended - started, state.camera);
  }, 1);
  return null;
}

export function Bench({ options }: { options: BenchOptions }) {
  const [fps, setFps] = useState(0);
  const [vertices, setVertices] = useState(0);
  const [result, setResult] = useState<BenchResult | null>(null);
  return (
    <>
      <Canvas shadows={options.shadows} dpr={[1, 2]} camera={{ fov: 38, near: 0.1, far: 220, position: [-4.5, 6.4, -13] }} onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.15; }} style={{ position: 'fixed', inset: 0 }}>
        <CameraRig />
        {options.scene ? <><Environment /><Stall /></> : <><ambientLight intensity={1.2} /><directionalLight position={[-14, 16, -10]} intensity={1} castShadow /><mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[70, 30]} /><meshStandardMaterial color="#39342e" /></mesh></>}
        <MovingCharacters options={options} onVertices={setVertices} onLive={setFps} onResult={setResult} />
      </Canvas>
      <aside style={{ position: 'fixed', top: 8, left: 8, maxWidth: 'min(440px, calc(100vw - 16px))', maxHeight: 'calc(100vh - 16px)', overflow: 'auto', padding: 12, background: '#101820e8', color: 'white', font: '14px system-ui', zIndex: 1 }}>
        <strong>엔진 검증</strong> · {fps.toFixed(1)} fps<br />
        {options.n}명 · 목표 {options.v} / 실제 {vertices} 정점 · {result ? '완료' : '측정 중'}
        {result && <table style={{ marginTop: 8, borderCollapse: 'collapse' }}><tbody>{Object.entries(result).map(([key, value]) => <tr key={key}><th style={{ textAlign: 'left', padding: '3px 10px 3px 0' }}>{key}</th><td>{String(value)}</td></tr>)}</tbody></table>}
      </aside>
    </>
  );
}
