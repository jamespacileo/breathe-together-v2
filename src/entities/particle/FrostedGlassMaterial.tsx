/**
 * FrostedGlassMaterial - 3D Gem Effect using MeshTransmissionMaterial
 *
 * Creates a gem-like crystal appearance with refraction, transparency,
 * and prismatic chromatic aberration. Optimized for soft pastel colors.
 * Based on the tutorial from:
 * https://blog.olivierlarose.com/tutorials/3d-glass-effect
 *
 * Properties control the gem appearance:
 * - thickness: Gem depth (0.6 = crystal-like, 3.0 = thick gem)
 * - roughness: Surface finish (0 = polished, 1 = matte)
 * - transmission: Transparency (1 = fully transparent gem)
 * - ior: Index of refraction (1.8 = crystal, 2.4 = diamond)
 * - chromaticAberration: Prismatic rainbow effect (0.06 = noticeable sparkle)
 * - backside: Enable backface rendering for hollow gems
 */

import type { MeshTransmissionMaterialProps as DreiMeshTransmissionMaterialProps } from '@react-three/drei';
import { MeshTransmissionMaterial } from '@react-three/drei';
import { useEffect, useRef } from 'react';

interface FrostedGlassMaterialProps {
  /**
   * Glass thickness - controls the depth of the material.
   *
   * Higher values create thicker glass with more pronounced refraction.
   * Lower values create thin, delicate glass.
   *
   * **When to adjust:** Thick shards (0.3-0.5) for bold presence, thin shards (0.1-0.2) for delicate look
   * **Typical range:** Thin (0.1) → Standard (0.2) → Medium (0.5) → Thick (1.0+)
   * **Interacts with:** ior, transmission, chromaticAberration
   * **Performance note:** Minimal impact on performance
   *
   * @min 0
   * @max 3
   * @step 0.05
   * @default 0.6 (gem-like depth with pronounced refraction)
   */
  thickness?: number;

  /**
   * Surface roughness - controls how matte or polished the gem appears.
   *
   * 0 = perfectly smooth polished gem surface
   * 1 = completely matte frosted crystal
   *
   * **When to adjust:** Polished gems (0) for sparkle and clarity, frosted (0.3-0.5) for soft diffusion
   * **Typical range:** Polished (0) → Subtle (0.1) → Frosted (0.3) → Matte (0.5+)
   * **Interacts with:** transmission, thickness
   * **Performance note:** Higher values may impact performance on mobile
   *
   * @min 0
   * @max 1
   * @step 0.1
   * @default 0 (polished crystal surface for maximum sparkle)
   */
  roughness?: number;

  /**
   * Transmission (transparency) - controls how much light passes through the gem.
   *
   * 0 = completely opaque
   * 1 = fully transparent crystal
   *
   * **When to adjust:** Translucent gems (0.7-0.8) for color depth, transparent (0.95-1.0) for pure refraction
   * **Typical range:** Visible (0.5) → Semi-transparent (0.7) → Crystal (0.9) → Invisible (1.0)
   * **Interacts with:** thickness, roughness, ior
   * **Performance note:** No significant impact
   *
   * @min 0
   * @max 1
   * @step 0.1
   * @default 1 (fully transparent gem for maximum light play)
   */
  transmission?: number;

  /**
   * Index of Refraction (IOR) - controls how much light bends through the gem.
   *
   * Real-world reference values:
   * - 1.0 = air (no refraction)
   * - 1.3 = ice
   * - 1.5 = glass
   * - 1.8 = crystal/quartz
   * - 2.4 = diamond
   *
   * **When to adjust:** Subtle refraction (1.1-1.3) for water-like, strong (1.8-2.4) for gem sparkle
   * **Typical range:** Air (1.0) → Ice (1.3) → Glass (1.5) → Crystal (1.8) → Diamond (2.4)
   * **Interacts with:** thickness, chromaticAberration, transmission
   * **Performance note:** No significant impact
   *
   * @min 0
   * @max 3
   * @step 0.1
   * @default 1.8 (crystal-like refraction for gem appearance)
   */
  ior?: number;

  /**
   * Chromatic Aberration - prismatic rainbow effect at gem edges.
   *
   * Creates rainbow-like color separation as light refracts through the gem.
   * 0 = no color separation
   * 1 = maximum prismatic rainbow
   *
   * **When to adjust:** Subtle sparkle (0.02-0.04) for realism, artistic gems (0.06-0.15) for dreamlike quality
   * **Typical range:** None (0) → Subtle (0.02) → Noticeable (0.06) → Artistic (0.1+)
   * **Interacts with:** ior, thickness
   * **Performance note:** Minimal impact on performance
   *
   * @min 0
   * @max 1
   * @step 0.01
   * @default 0.06 (noticeable prismatic effect for gem sparkle)
   */
  chromaticAberration?: number;

  /**
   * Backside rendering - enables rendering of back faces for hollow gems.
   *
   * true = render both front and back faces (for hollow crystal shards)
   * false = render only front faces (for solid gems)
   *
   * **When to adjust:** Enable for icosahedrons and hollow shapes, disable for solid objects
   * **Interacts with:** thickness, transmission
   * **Performance note:** Doubles fragment shader invocations when enabled
   *
   * @default true (hollow icosahedron gem shards)
   */
  backside?: boolean;
}

export function FrostedGlassMaterial({
  thickness = 0.6,
  roughness = 0,
  transmission = 1,
  ior = 1.8,
  chromaticAberration = 0.06,
  backside = true,
}: FrostedGlassMaterialProps) {
  // biome-ignore lint/suspicious/noExplicitAny: MeshTransmissionMaterial doesn't export instance type in @react-three/drei
  const materialRef = useRef<any>(null);

  // GPU memory cleanup
  useEffect(() => {
    return () => {
      materialRef.current?.dispose();
    };
  }, []);

  return (
    <MeshTransmissionMaterial
      ref={materialRef}
      thickness={thickness}
      roughness={roughness}
      transmission={transmission}
      ior={ior}
      chromaticAberration={chromaticAberration}
      backside={backside}
      // Performance optimizations
      samples={6} // Lower sample count for better performance
      resolution={512} // Lower resolution for better mobile performance
    />
  );
}

/**
 * Creates a frosted glass material instance for imperative use
 */
export function createFrostedGlassMaterial(
  props?: FrostedGlassMaterialProps,
): DreiMeshTransmissionMaterialProps {
  const {
    thickness = 0.6,
    roughness = 0,
    transmission = 1,
    ior = 1.8,
    chromaticAberration = 0.06,
    backside = true,
  } = props ?? {};

  return {
    thickness,
    roughness,
    transmission,
    ior,
    chromaticAberration,
    backside,
    samples: 6,
    resolution: 512,
  };
}
