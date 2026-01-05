/**
 * SubtleLightRays - Gentle god rays / light shafts effect
 *
 * Creates subtle diagonal light beams that slowly sweep across the scene,
 * giving a sense of ethereal, otherworldly atmosphere.
 *
 * These are NOT volumetric rays (expensive), but rather:
 * - Transparent gradient planes positioned at angles
 * - Animated opacity for gentle breathing effect
 * - Very subtle - users feel them more than see them
 *
 * MIGRATED TO TSL (Three.js Shading Language) - January 2026
 *
 * Performance: Just 3 transparent planes, minimal GPU impact
 */

import { useFrame } from '@react-three/fiber';
import { memo, useEffect, useMemo, useRef } from 'react';
import { AdditiveBlending, Color, DoubleSide, type Mesh, PlaneGeometry } from 'three';
import {
  abs,
  add,
  Fn,
  mul,
  positionGeometry,
  sin,
  smoothstep,
  sub,
  uniform,
  vec4,
} from 'three/tsl';
import { MeshBasicNodeMaterial } from 'three/webgpu';

interface SubtleLightRaysProps {
  /** Maximum opacity of rays @default 0.04 */
  opacity?: number;
  /** Enable light rays @default true */
  enabled?: boolean;
}

interface RayConfig {
  id: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
  opacityMultiplier: number;
  phaseOffset: number;
  speed: number;
}

// Ray configurations - positioned to create diagonal shafts from upper right
const RAY_CONFIGS: RayConfig[] = [
  {
    id: 'ray-main',
    position: [15, 8, -35],
    rotation: [0, 0, -0.4], // Tilted diagonal
    scale: [6, 40, 1],
    color: '#fff8f0', // Warm white
    opacityMultiplier: 1.0,
    phaseOffset: 0,
    speed: 0.3,
  },
  {
    id: 'ray-secondary',
    position: [8, 5, -40],
    rotation: [0, 0, -0.35],
    scale: [4, 35, 1],
    color: '#ffe8d8', // Peachy warmth
    opacityMultiplier: 0.7,
    phaseOffset: 2.0,
    speed: 0.25,
  },
  {
    id: 'ray-tertiary',
    position: [22, 10, -30],
    rotation: [0, 0, -0.45],
    scale: [5, 45, 1],
    color: '#fff0e8', // Soft warm
    opacityMultiplier: 0.5,
    phaseOffset: 4.0,
    speed: 0.35,
  },
];

/**
 * Creates a TSL-based light ray material
 */
function createLightRayMaterial(colorHex: string) {
  const material = new MeshBasicNodeMaterial();
  material.side = DoubleSide;
  material.transparent = true;
  material.depthWrite = false;
  material.blending = AdditiveBlending;

  // Uniforms for animation
  const opacityUniform = uniform(0.04);
  const timeUniform = uniform(0);
  const color = new Color(colorHex);
  const colorUniform = uniform(color);

  // Store uniforms for external access
  material.userData.opacity = opacityUniform;
  material.userData.time = timeUniform;
  material.userData.color = colorUniform;

  // Build color node using TSL
  // UV is derived from positionGeometry for a PlaneGeometry (ranges -0.5 to 0.5)
  const colorNode = Fn(() => {
    // Convert position to UV space (PlaneGeometry is centered, so add 0.5)
    const uv = add(positionGeometry.xy, 0.5);

    // Gradient from center outward (both X edges fade)
    const gradientX = sub(1.0, mul(abs(sub(uv.x, 0.5)), 2.0));
    const smoothGradientX = smoothstep(0.0, 0.8, gradientX);

    // Gradient from bottom to top
    const gradientY = mul(smoothstep(0.0, 0.3, uv.y), smoothstep(1.0, 0.7, uv.y));

    // Combine gradients
    const baseAlpha = mul(smoothGradientX, gradientY);

    // Very subtle noise variation along the ray
    const noise = add(mul(sin(add(mul(uv.y, 10.0), mul(timeUniform, 0.5))), 0.1), 0.9);

    // Final alpha with opacity uniform
    const alpha = mul(mul(baseAlpha, noise), opacityUniform);

    return vec4(colorUniform.x, colorUniform.y, colorUniform.z, alpha);
  })();

  material.colorNode = colorNode;

  return material;
}

const LightRay = memo(function LightRay({
  config,
  baseOpacity,
}: {
  config: RayConfig;
  baseOpacity: number;
}) {
  const meshRef = useRef<Mesh>(null);

  const geometry = useMemo(() => new PlaneGeometry(1, 1), []);

  const material = useMemo(() => {
    return createLightRayMaterial(config.color);
  }, [config.color]);

  // Animate ray opacity with gentle breathing
  useFrame((state) => {
    if (!material.userData.opacity) return;

    const time = state.clock.elapsedTime * config.speed + config.phaseOffset;

    // Gentle pulsing opacity
    const pulse = Math.sin(time) * 0.3 + 0.7; // 0.4 to 1.0
    material.userData.opacity.value = baseOpacity * config.opacityMultiplier * pulse;
    material.userData.time.value = state.clock.elapsedTime;
  });

  // Cleanup
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  return (
    <mesh
      ref={meshRef}
      position={config.position}
      rotation={config.rotation}
      scale={config.scale}
      geometry={geometry}
    >
      <primitive object={material} attach="material" />
    </mesh>
  );
});

export const SubtleLightRays = memo(function SubtleLightRays({
  opacity = 0.04,
  enabled = true,
}: SubtleLightRaysProps) {
  if (!enabled) return null;

  return (
    <group>
      {RAY_CONFIGS.map((config) => (
        <LightRay key={config.id} config={config} baseOpacity={opacity} />
      ))}
    </group>
  );
});

export default SubtleLightRays;
