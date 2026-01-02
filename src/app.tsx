import { Stats } from '@react-three/drei';
import { Canvas, type ThreeToJSXElements } from '@react-three/fiber';
import { lazy, Suspense } from 'react';
import type * as THREE from 'three';
import { AudioProvider } from './audio';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BreathEntity } from './entities/breath';
import { CameraRig } from './entities/camera/CameraRig';
import { BreathingLevel } from './levels/breathing';
import { KootaSystems } from './providers';

// Lazy load admin panel (only loads when needed)
const AdminPanel = lazy(() => import('./pages/AdminPanel'));

// Extend R3F with Three.js types
declare module '@react-three/fiber' {
  interface ThreeElements extends ThreeToJSXElements<typeof THREE> {}
}

// Simple URL-based routing
function useCurrentPath(): string {
  return typeof window !== 'undefined' ? window.location.pathname : '/';
}

export function App() {
  const path = useCurrentPath();

  // Admin panel route
  if (path === '/admin') {
    return (
      <Suspense
        fallback={
          <div
            style={{
              minHeight: '100vh',
              background: '#1a1a1a',
              color: '#666',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Loading admin panel...
          </div>
        }
      >
        <AdminPanel />
      </Suspense>
    );
  }

  // Main breathing app
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
          <AudioProvider>
            <BreathEntity />
            <BreathingLevel />
          </AudioProvider>
        </KootaSystems>
      </Canvas>
    </ErrorBoundary>
  );
}
