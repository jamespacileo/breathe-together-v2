/**
 * FrostedGlassMaterial - 3D Glass Effect using MeshTransmissionMaterial
 *
 * Creates a realistic frosted glass appearance with refraction, distortion,
 * and chromatic aberration. Based on the tutorial from:
 * https://blog.olivierlarose.com/tutorials/3d-glass-effect
 *
 * Properties control the glass appearance:
 * - thickness: Glass depth (0.2 = thin, 3.0 = thick)
 * - roughness: Surface roughness (0 = smooth, 1 = matte)
 * - transmission: Transparency (0 = opaque, 1 = fully transparent)
 * - ior: Index of refraction (1.0 = air, 1.5 = glass, 2.4 = diamond)
 * - chromaticAberration: Color separation effect (0 = none, 1 = max)
 * - backside: Enable backface rendering for hollow objects
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
   * @default 0.2 (production baseline: balanced glass depth)
   */
  thickness?: number;

  /**
   * Surface roughness - controls how matte or polished the glass appears.
   *
   * 0 = perfectly smooth mirror-like glass
   * 1 = completely matte frosted glass
   *
   * **When to adjust:** Polished look (0-0.1) for crystal clarity, frosted (0.3-0.5) for soft diffusion
   * **Typical range:** Polished (0) → Subtle (0.1) → Frosted (0.3) → Matte (0.5+)
   * **Interacts with:** transmission, thickness
   * **Performance note:** Higher values may impact performance on mobile
   *
   * @min 0
   * @max 1
   * @step 0.1
   * @default 0 (production baseline: smooth polished glass)
   */
  roughness?: number;

  /**
   * Transmission (transparency) - controls how much light passes through.
   *
   * 0 = completely opaque
   * 1 = fully transparent glass
   *
   * **When to adjust:** Subtle glass (0.7-0.8) for presence, invisible glass (0.95-1.0) for pure refraction
   * **Typical range:** Visible (0.5) → Semi-transparent (0.7) → Glass (0.9) → Invisible (1.0)
   * **Interacts with:** thickness, roughness, ior
   * **Performance note:** No significant impact
   *
   * @min 0
   * @max 1
   * @step 0.1
   * @default 1 (production baseline: fully transparent glass)
   */
  transmission?: number;

  /**
   * Index of Refraction (IOR) - controls how much light bends through the glass.
   *
   * Real-world reference values:
   * - 1.0 = air (no refraction)
   * - 1.3 = ice
   * - 1.5 = glass
   * - 2.4 = diamond
   *
   * **When to adjust:** Subtle refraction (1.1-1.3) for air-like, strong (1.5-2.0) for crystal effect
   * **Typical range:** Air (1.0) → Ice (1.3) → Glass (1.5) → Crystal (1.8) → Diamond (2.4)
   * **Interacts with:** thickness, chromaticAberration, transmission
   * **Performance note:** No significant impact
   *
   * @min 0
   * @max 3
   * @step 0.1
   * @default 1.2 (production baseline: subtle ice-like refraction)
   */
  ior?: number;

  /**
   * Chromatic Aberration - color separation effect from light refraction.
   *
   * Creates rainbow-like color fringing at edges, similar to a prism.
   * 0 = no color separation
   * 1 = maximum rainbow effect
   *
   * **When to adjust:** Subtle effect (0.01-0.03) for realism, artistic (0.1+) for dreamlike quality
   * **Typical range:** None (0) → Subtle (0.02) → Noticeable (0.05) → Artistic (0.1+)
   * **Interacts with:** ior, thickness
   * **Performance note:** Minimal impact on performance
   *
   * @min 0
   * @max 1
   * @step 0.01
   * @default 0.02 (production baseline: subtle prismatic effect)
   */
  chromaticAberration?: number;

  /**
   * Backside rendering - enables rendering of back faces for hollow objects.
   *
   * true = render both front and back faces (for hollow glass)
   * false = render only front faces (for solid glass)
   *
   * **When to adjust:** Enable for icosahedrons and hollow shapes, disable for solid objects
   * **Interacts with:** thickness, transmission
   * **Performance note:** Doubles fragment shader invocations when enabled
   *
   * @default true (production baseline: hollow icosahedron shards)
   */
  backside?: boolean;
}

export function FrostedGlassMaterial({
  thickness = 0.2,
  roughness = 0,
  transmission = 1,
  ior = 1.2,
  chromaticAberration = 0.02,
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
    thickness = 0.2,
    roughness = 0,
    transmission = 1,
    ior = 1.2,
    chromaticAberration = 0.02,
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
