import { Stats } from '@react-three/drei';
import { Canvas, type CanvasProps } from '@react-three/fiber';
import { lazy, Suspense, useCallback, useRef } from 'react';
import { AudioProvider } from './audio';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BreathEntity } from './entities/breath';
import { CameraRig } from './entities/camera/CameraRig';
import { useViewport } from './hooks/useViewport';
import { BreathingLevel, BreathingLevelUI } from './levels/breathing';
import { KootaSystems } from './providers';
// Import WebGPU/TSL setup - extends R3F with node materials
import { createWebGPURenderer } from './webgpu-setup';

// Lazy load admin panel (only loads when needed)
const AdminPanel = lazy(() => import('./pages/AdminPanel'));

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
 * Now uses WebGPU renderer with TSL (Three.js Shading Language) support.
 * TSL materials use viewportSharedTexture for refraction effects.
 *
 * @see https://r3f.docs.pmnd.rs/api/canvas#extracting-events
 * @see https://github.com/mrdoob/three.js/wiki/Three.js-Shading-Language
 */
export function App() {
  // biome-ignore lint/style/noNonNullAssertion: R3F eventSource requires non-null ref; ref is always assigned before Canvas renders
  const containerRef = useRef<HTMLDivElement>(null!);
  const path = useCurrentPath();
  const { isMobile, isTablet } = useViewport();

  // Create WebGPU renderer factory with TSL support
  // Falls back to WebGL backend if WebGPU is not available
  const glFactory = useCallback(
    () =>
      createWebGPURenderer({
        antialias: !isMobile && !isTablet,
        alpha: true,
        powerPreference: isMobile ? 'low-power' : 'high-performance',
      }),
    [isMobile, isTablet],
  );

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
        {/* 3D Canvas with WebGPU/TSL support */}
        {/* frameloop="demand" enables on-demand rendering for battery savings */}
        {/* Scene invalidates via invalidate() in KootaSystems useFrame */}
        <Canvas
          eventSource={containerRef}
          eventPrefix="client"
          frameloop="demand"
          shadows={false}
          camera={{ position: [0, 0, 10], fov: 45 }}
          // R3F v9 supports async gl factory for WebGPU - type assertion needed
          // biome-ignore lint/suspicious/noExplicitAny: R3F v9 WebGPU async factory support not fully typed
          gl={glFactory() as any}
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
