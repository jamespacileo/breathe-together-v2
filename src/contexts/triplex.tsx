import type { ReactNode } from 'react';
import { BreathEntity } from '../entities/breath';
import { KootaSystems, RootProviders } from '../providers';

/**
 * Global Provider
 *
 * Root provider that wraps the entire application with Koota ECS world setup
 * and Triplex integration. Must be outside Canvas.
 *
 * Provides:
 * - RootProviders: For Koota WorldProvider (ECS state)
 *
 * @example
 * ```tsx
 * <GlobalProvider>
 *   <Canvas>
 *     <CanvasProvider>...</CanvasProvider>
 *   </Canvas>
 * </GlobalProvider>
 * ```
 */
export function GlobalProvider({ children }: { children: ReactNode }) {
  return <RootProviders>{children}</RootProviders>;
}

/**
 * Canvas Provider
 *
 * Provider for the Three.js Canvas. Wraps systems and entities for Triplex editing.
 * Controls which ECS systems are enabled.
 *
 * @example
 * ```tsx
 * <CanvasProvider breathSystemEnabled={true}>
 *   <YourSceneComponent />
 * </CanvasProvider>
 * ```
 */
export function CanvasProvider({
  breathSystemEnabled = true,
  children,
  particlePhysicsSystemEnabled = true,
}: {
  /**
   * Enable breath system (UTC-synced breathing animation)
   *
   * Controls global breathing state calculation (phase, orbit radius, sphere scale).
   * Disable to freeze breathing animation for easier inspection in Triplex.
   *
   * @default true
   */
  breathSystemEnabled?: boolean;

  /**
   * Children to render inside Canvas
   */
  children: ReactNode;

  /**
   * Enable particle physics system
   *
   * @default true
   */
  particlePhysicsSystemEnabled?: boolean;
}) {
  return (
    <KootaSystems
      breathSystemEnabled={breathSystemEnabled}
      particlePhysicsSystemEnabled={particlePhysicsSystemEnabled}
    >
      <BreathEntity />
      {children}
    </KootaSystems>
  );
}
