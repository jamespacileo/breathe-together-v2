import { Stats } from '@react-three/drei';
import { Canvas, type ThreeToJSXElements } from '@react-three/fiber';
import { lazy, Suspense, useMemo, useRef } from 'react';
import type * as THREE from 'three';
import { AudioProvider } from './audio';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BreathEntity } from './entities/breath';
import { CameraRig } from './entities/camera/CameraRig';
import { useViewport } from './hooks/useViewport';
import { BreathingLevel, BreathingLevelUI } from './levels/breathing';
import { KootaSystems } from './providers';

// Preload assets before Canvas mounts (side-effect import)
// ES modules execute synchronously - this runs before App component renders
// drei's useTexture.preload() adds to internal cache checked by useTexture
import './lib/preload';

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

/**
 * App - Root component with proper event handling architecture.
 *
 * Uses the R3F recommended eventSource pattern:
 * - Canvas receives events via shared parent (eventSource)
 * - Canvas automatically gets pointer-events: none
 * - HTML UI renders as siblings, naturally receiving events
 * - No need for exclusion zones or complex cursor management
 *
 * Scene Loading Strategy (Organic Reveal):
 * - Scene is visible immediately with camera close to globe
 * - Fog hides distant elements during loading
 * - Globe breathing animation acts as the loading indicator
 * - When assets load, camera pulls back and fog recedes
 * - No separate loading UI - the scene IS the loading experience
 *
 * @see https://r3f.docs.pmnd.rs/api/canvas#extracting-events
 */
export function App() {
  // biome-ignore lint/style/noNonNullAssertion: R3F eventSource requires non-null ref; ref is always assigned before Canvas renders
  const containerRef = useRef<HTMLDivElement>(null!);
  const path = useCurrentPath();
  const { isMobile, isTablet } = useViewport();

  // Disable antialias on mobile/tablet for 5-10% performance improvement
  const glConfig = useMemo(
    () => ({
      antialias: !isMobile && !isTablet,
      alpha: true,
      localClippingEnabled: true,
      // Reduce pixel ratio on mobile for better performance
      pixelRatio: isMobile ? Math.min(window.devicePixelRatio, 2) : window.devicePixelRatio,
    }),
    [isMobile, isTablet],
  );

  // Note: gl.compile() for shader precompilation was removed because:
  // 1. Suspense-wrapped components (EarthGlobe with useTexture) aren't in scene yet
  // 2. The organic reveal (fog + camera animation) handles loading UX gracefully
  // 3. Shaders compile naturally as fog recedes and elements become visible

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
      {/* Shared event source - both Canvas and HTML UI are children */}
      <div ref={containerRef} className="relative w-full h-full">
        {/* 3D Canvas - receives events via eventSource, has pointer-events: none */}
        {/* Scene is visible immediately - organic reveal via camera/fog animation */}
        <Canvas
          eventSource={containerRef}
          eventPrefix="client"
          shadows={false}
          camera={{ position: [0, 0, 4], fov: 45 }}
          gl={glConfig}
          dpr={isMobile ? [1, 2] : [1, 2]}
          className="!absolute inset-0"
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

        {/* HTML UI - siblings of Canvas, naturally receive pointer events */}
        <BreathingLevelUI />
      </div>
    </ErrorBoundary>
  );
}
