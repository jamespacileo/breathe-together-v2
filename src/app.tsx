import { Canvas } from '@react-three/fiber';
import { BreathingHUD } from './components/BreathingHUD';
import { BreathEntity } from './entities/breath';
import { CameraRig } from './entities/camera/CameraRig';
import { BreathingLevel } from './levels/breathing';
import { KootaSystems } from './providers';

export function App() {
  return (
    <>
      <Canvas shadows camera={{ position: [0, 0, 10], fov: 45 }}>
        <CameraRig />
        <KootaSystems breathSystemEnabled={true}>
          <BreathEntity />
          <BreathingLevel />
        </KootaSystems>
      </Canvas>
      <BreathingHUD />
    </>
  );
}
