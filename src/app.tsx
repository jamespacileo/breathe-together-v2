import { Stats } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { BreathingHUD3D } from './components/BreathingHUD3D';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BreathEntity } from './entities/breath';
import { CameraRig } from './entities/camera/CameraRig';
import { BreathingLevel } from './levels/breathing';
import { KootaSystems } from './providers';

export function App() {
  return (
    <ErrorBoundary>
      <Canvas
        shadows={false}
        camera={{ position: [0, 5, 22], fov: 40 }}
        gl={{ localClippingEnabled: true }}
      >
        <Stats />
        <CameraRig />
        <KootaSystems breathSystemEnabled={true}>
          <BreathEntity />
          <BreathingLevel />
          <BreathingHUD3D />
        </KootaSystems>
      </Canvas>
    </ErrorBoundary>
  );
}
