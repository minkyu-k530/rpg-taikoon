import { useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Environment } from './scene/Environment';
import { Stall } from './scene/Stall';
import { Crowd } from './scene/Crowd';
import { HUD } from './ui/HUD';
import { sim } from './game/useSim';

export default function App() {
  return (
    <div className="app">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ fov: 38, near: 0.1, far: 220, position: [-4.5, 6.4, -13] }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.15;
        }}
      >
        <CameraRig />
        <Ticker />
        <Environment />
        <Stall />
        <Crowd />
      </Canvas>
      <HUD />
    </div>
  );
}

function Ticker() {
  useFrame((_, delta) => sim.tick(delta));
  return null;
}

/** 세로 화면에서는 카메라를 뒤로 빼서 포장마차와 줄이 같이 들어오게 한다 */
function CameraRig() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);

  useEffect(() => {
    const aspect = size.width / size.height;
    const portrait = aspect < 0.95;
    // 세로 화면은 화각을 넓혀야 산책로가 담긴다. 시선을 높게 둬야 건너편 오피스가 프레임에 들어온다
    const perspective = camera as THREE.PerspectiveCamera;
    perspective.fov = portrait ? 54 : 40;
    perspective.position.set(-4.2, portrait ? 4.6 : 3.6, portrait ? -15 : -11.5);
    perspective.lookAt(3.4, 2.1, 0.5);
    perspective.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}
