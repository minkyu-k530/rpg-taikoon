import { useCallback, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Environment } from './scene/Environment';
import { Weather } from './scene/Weather';
import { Stall } from './scene/Stall';
import { Crowd } from './scene/Crowd';
import { Player } from './scene/Player';
import { HUD } from './ui/HUD';
import { DeliveryScene } from './scene/DeliveryScene';
import { DeliveryHUD } from './ui/DeliveryHUD';
import { sim, useSnapshot } from './game/useSim';
import { audio } from './game/audio';

export default function App() {
  const [playerPrompt, setPlayerPrompt] = useState<string | null>(null);
  const onPromptChange = useCallback((value: string | null) => setPlayerPrompt(value), []);
  // 브라우저는 첫 입력 전에는 소리를 막는다. 어디를 누르든 그때 오디오를 깨운다
  useEffect(() => {
    sim.onEvent = (e) => audio.play(e);
    const wake = () => audio.start();
    window.addEventListener('pointerdown', wake);
    window.addEventListener('keydown', wake);
    return () => {
      window.removeEventListener('pointerdown', wake);
      window.removeEventListener('keydown', wake);
    };
  }, []);

  // 배달 중에는 씬과 HUD가 통째로 바뀐다. 가게 시뮬레이션은 뒤에서 계속 돈다
  const delivering = useSnapshot(6).delivering;

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
        <Ticker />
        {delivering ? (
          <DeliveryScene />
        ) : (
          <>
            <CameraRig />
            <Environment />
            <Stall />
            <Player onPromptChange={onPromptChange} />
            <Crowd />
            <Weather />
          </>
        )}
      </Canvas>
      {delivering ? <DeliveryHUD /> : <HUD playerPrompt={playerPrompt} />}
    </div>
  );
}

function Ticker() {
  useFrame((_, delta) => {
    sim.tick(delta);
    const baking = sim.molds.filter((m) => m.baking).length / Math.max(1, sim.molds.length);
    audio.update(sim.weather, baking);
  });
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
