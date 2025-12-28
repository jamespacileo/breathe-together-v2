import { createContext, useContext, type ReactNode, useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { KootaSystems, RootProviders } from "../providers";
import { BreathEntity } from "../entities/breath";
import type {
  SphereConfig,
  LightingConfig,
} from "../constants";
import {
  DEFAULT_SPHERE_CONFIG,
  LOW_QUALITY_SPHERE_CONFIG,
  HIGH_QUALITY_SPHERE_CONFIG,
} from "../constants";

/**
 * Triplex Configuration Context
 * Allows Triplex props to be passed down to entities for dynamic configuration
 */
export interface TriplexConfigContext {
  particleScale: number;
  qualityPreset: 'low' | 'medium' | 'high';
  sphereConfig: SphereConfig;
}

export const TriplexConfig = createContext<TriplexConfigContext | null>(null);

/**
 * Hook to access Triplex configuration from within entities
 * Returns null in production (when not inside Triplex provider)
 * Entities should provide fallback defaults
 */
export function useTriplexConfig(): TriplexConfigContext | null {
  return useContext(TriplexConfig);
}

/**
 * Global Provider
 *
 * Root provider that wraps the entire application with TanStack Query client,
 * Koota ECS world setup, and Triplex configuration. Must be outside Canvas.
 *
 * Provides:
 * - QueryClientProvider: For TanStack Query hooks (usePresence, etc.)
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
  // Create QueryClient with disabled fetching for Triplex
  // (IS_TRIPLEX detection in usePresence.ts ensures simulated mode)
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            enabled: false, // Disable auto-fetching in Triplex
            retry: false,
          },
        },
      }),
    []
  );

  return (
    <QueryClientProvider client={queryClient}>
      <RootProviders>{children}</RootProviders>
    </QueryClientProvider>
  );
}

/**
 * Canvas Provider
 *
 * Provider for the Three.js Canvas. Wraps systems and entities with Triplex configuration.
 * Controls which ECS systems are enabled and provides fine-grained visual quality tuning.
 *
 * @example
 * ```tsx
 * <CanvasProvider
 *   breathSystemEnabled={true}
 *   qualityPreset="high"
 *   particleScale={1.5}
 * >
 *   <YourSceneComponent />
 * </CanvasProvider>
 * ```
 */
export function CanvasProvider({
  breathSystemEnabled = true,
  cameraFollowFocusedSystem = false,
  children,
  cursorPositionFromLandSystem = false,
  particlePhysicsSystemEnabled = true,
  positionFromVelocitySystem = false,
  velocityTowardsTargetSystem = false,
  particleScale = 1.0,
  qualityPreset = "medium",
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
   * Enable camera follow system
   *
   * @default false
   */
  cameraFollowFocusedSystem?: boolean;

  /**
   * Children to render inside Canvas
   */
  children: ReactNode;

  /**
   * Enable cursor position tracking system
   *
   * @default false
   */
  cursorPositionFromLandSystem?: boolean;

  /**
   * Enable particle physics system
   *
   * @default true
   */
  particlePhysicsSystemEnabled?: boolean;

  /**
   * Enable position-from-velocity system
   *
   * @default false
   */
  positionFromVelocitySystem?: boolean;

  /**
   * Enable velocity towards target system
   *
   * @default false
   */
  velocityTowardsTargetSystem?: boolean;

  /**
   * Particle rendering scale multiplier
   *
   * Scales particle count and size. Useful for performance testing.
   * - 0.5 = half particle count
   * - 1.0 = normal (default)
   * - 2.0 = double particle count
   *
   * @min 0.1
   * @max 2.0
   * @step 0.1
   * @default 1.0
   */
  particleScale?: number;

  /**
   * Visual quality preset
   *
   * **Low**: 100 particles, 32-segment sphere, minimal effects
   * **Medium**: 200 particles, 64-segment sphere, full effects (default)
   * **High**: 300+ particles, 128-segment sphere, enhanced effects
   *
   * @default "medium"
   */
  qualityPreset?: "low" | "medium" | "high";
}) {
  // Map quality preset to scale factor (low: 0.5x, medium: 1x, high: 2x)
  const particleScaleFromPreset =
    qualityPreset === "low" ? 0.5 : qualityPreset === "high" ? 2.0 : 1.0;
  const finalParticleScale = particleScale * particleScaleFromPreset;

  // Map quality preset to sphere configuration
  const sphereConfig =
    qualityPreset === "low"
      ? LOW_QUALITY_SPHERE_CONFIG
      : qualityPreset === "high"
        ? HIGH_QUALITY_SPHERE_CONFIG
        : DEFAULT_SPHERE_CONFIG;

  return (
    <TriplexConfig.Provider
      value={{ particleScale: finalParticleScale, qualityPreset, sphereConfig }}
    >
      <KootaSystems
        breathSystemEnabled={breathSystemEnabled}
        cameraFollowFocusedSystem={cameraFollowFocusedSystem}
        cursorPositionFromLandSystem={cursorPositionFromLandSystem}
        particlePhysicsSystemEnabled={particlePhysicsSystemEnabled}
        positionFromVelocitySystem={positionFromVelocitySystem}
        velocityTowardsTargetSystem={velocityTowardsTargetSystem}
      >
        <BreathEntity />
        {children}
      </KootaSystems>
    </TriplexConfig.Provider>
  );
}
