import { Stats } from '@react-three/drei';
import { Canvas, extend, type ThreeToJSXElements } from '@react-three/fiber';
import * as THREE from 'three';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PostProcessing } from './effects/PostProcessing';
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
        camera={{ position: [0, 0, 10], fov: 45 }}
        gl={{ antialias: true, alpha: true, localClippingEnabled: true }}
      >
        {import.meta.env.DEV && <Stats />}
        <CameraRig />
        <KootaSystems breathSystemEnabled={true}>
          <BreathEntity />
          <BreathingLevel />
          {/* Post-processing effects: Bloom, Vignette, Noise - breathing synchronized */}
          <PostProcessing />
        </KootaSystems>
      </Canvas>
    </ErrorBoundary>
  );
}
