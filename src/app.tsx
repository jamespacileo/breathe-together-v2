import { Stats } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { BreathingHUD3D } from './components/BreathingHUD3D';
import { BreathEntity } from './entities/breath';
import { CameraRig } from './entities/camera/CameraRig';
import { BreathingLevel } from './levels/breathing';
import { KootaSystems } from './providers';

export function App() {
  return (
    <Canvas shadows camera={{ position: [0, 0, 10], fov: 45 }} gl={{ localClippingEnabled: true }}>
      <Stats />
      <CameraRig />
      <KootaSystems breathSystemEnabled={true}>
        <BreathEntity />
        <BreathingLevel />
        <BreathingHUD3D />
      </KootaSystems>
    </Canvas>
  );
}
