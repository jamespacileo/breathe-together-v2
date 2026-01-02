import { useFrame } from '@react-three/fiber';
import { type ReactNode, useRef } from 'react';
import * as THREE from 'three';

interface FadeGroupProps {
  children: ReactNode;
  /**
   * Opacity/progress value (0-1) controlling the fade-in animation.
   * - At 0: Group is invisible (scale 0)
   * - At 0.1+: Group becomes visible and starts scaling up
   * - At 1: Group is fully visible (scale 1)
   */
  opacity: number;
  /**
   * Initial scale when fade begins (before full visibility).
   * Creates a subtle "grow-in" effect.
   * @default 0.85
   */
  initialScale?: number;
  /**
   * Whether the fade-in animation is enabled.
   * When false, group renders at full scale immediately.
   * @default true
   */
  enabled?: boolean;
  /** Optional name for the group (useful for debugging) */
  name?: string;
}

/**
 * FadeGroup - Wrapper for staggered fade-in animations on 3D entities.
 *
 * Provides a smooth "grow-in" effect by animating scale from initialScale to 1
 * based on the provided opacity value. The group is invisible until opacity > 0.1,
 * then smoothly scales up as opacity increases to 1.
 *
 * This approach works with any child content without requiring modifications
 * to internal materials or shaders.
 *
 * @example
 * ```tsx
 * const fadeIn = useSceneFadeIn(sceneReady);
 *
 * <FadeGroup opacity={fadeIn.environment}>
 *   <Environment />
 * </FadeGroup>
 *
 * <FadeGroup opacity={fadeIn.globe}>
 *   <EarthGlobe />
 * </FadeGroup>
 * ```
 */
export function FadeGroup({
  children,
  opacity,
  initialScale = 0.85,
  enabled = true,
  name,
}: FadeGroupProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Animate scale based on opacity for smooth grow-in
  useFrame(() => {
    if (!groupRef.current || !enabled) return;

    // Calculate target scale based on opacity
    // Scale goes from initialScale (at opacity 0.1) to 1.0 (at opacity 1.0)
    const targetScale = enabled ? initialScale + (1 - initialScale) * Math.min(opacity, 1) : 1;

    // Smooth interpolation for scale (lerp with high factor for quick response)
    const currentScale = groupRef.current.scale.x;
    const newScale = THREE.MathUtils.lerp(currentScale, targetScale, 0.15);
    groupRef.current.scale.setScalar(newScale);

    // Visibility threshold - hide until opacity crosses 0.05
    groupRef.current.visible = !enabled || opacity > 0.05;
  });

  // If disabled, render children directly at full scale
  if (!enabled) {
    return <group name={name}>{children}</group>;
  }

  return (
    <group ref={groupRef} name={name} scale={initialScale} visible={opacity > 0.05}>
      {children}
    </group>
  );
}
