import { Stats } from '@react-three/drei';
import { Canvas, extend, type ThreeToJSXElements } from '@react-three/fiber';
import * as THREE from 'three';
import { BreathingHUD3D } from './components/BreathingHUD3D';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BreathEntity } from './entities/breath';
import { CameraRig } from './entities/camera/CameraRig';
import { BreathingLevel } from './levels/breathing';
import { KootaSystems } from './providers';

// Extend R3F with Three.js types (cast required per R3F v9 migration guide)
declare module '@react-three/fiber' {
  interface ThreeElements extends ThreeToJSXElements<typeof THREE> {}
}
// biome-ignore lint/suspicious/noExplicitAny: R3F v9 migration guide requires casting THREE to any for extend()
extend(THREE as any);

export function App() {
  return (
    <ErrorBoundary>
      <Canvas
        shadows={false}
        camera={{ position: [0, 5, 22], fov: 40 }}
        gl={{ antialias: true, alpha: true, localClippingEnabled: true }}
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
