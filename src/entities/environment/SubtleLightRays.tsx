/**
 * SubtleLightRays - Gentle god rays / light shafts effect using TSL
 *
 * Creates subtle diagonal light beams using TSL (Three.js Shading Language) nodes.
 *
 * Features:
 * - MeshBasicNodeMaterial with TSL nodes
 * - Animated opacity via uniform
 * - GPU resource disposal
 *
 * Performance: 3 transparent planes
 */

import { useFrame } from '@react-three/fiber';
import { memo, useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  add,
  color,
  float,
  mul,
  sin,
  smoothstep,
  sub,
  abs as tslAbs,
  uniform,
  uv,
  vec3,
} from 'three/tsl';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import { useDisposeOnUnmount } from '../../hooks/useDisposeOnUnmount';
import { getMaterialUserData, setMaterialUserData } from '../../lib/three/materialUserData';

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

const LightRayTSL = memo(function LightRayTSL({
  config,
  baseOpacity,
}: {
  config: RayConfig;
  baseOpacity: number;
}) {
  const materialRef = useRef<MeshBasicNodeMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);

  const material = useMemo(() => {
    // TSL Uniforms
    const uOpacity = uniform(float(baseOpacity * config.opacityMultiplier));
    const uTime = uniform(float(config.phaseOffset));
    const uColor = uniform(vec3(new THREE.Color(config.color)));

    // UV coordinate node
    const uvCoord = uv();

    // ═══════════════════════════════════════════════════════════════
    // Gradient X: Center outward (both X edges fade)
    // GLSL: float gradientX = 1.0 - abs(vUv.x - 0.5) * 2.0;
    //       gradientX = smoothstep(0.0, 0.8, gradientX);
    // ═══════════════════════════════════════════════════════════════
    const gradientXRaw = sub(float(1.0), mul(tslAbs(sub(uvCoord.x, float(0.5))), float(2.0)));
    const gradientX = smoothstep(float(0.0), float(0.8), gradientXRaw);

    // ═══════════════════════════════════════════════════════════════
    // Gradient Y: Bottom to top
    // GLSL: float gradientY = smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.7, vUv.y);
    // ═══════════════════════════════════════════════════════════════
    const gradientY = mul(
      smoothstep(float(0.0), float(0.3), uvCoord.y),
      smoothstep(float(1.0), float(0.7), uvCoord.y),
    );

    // ═══════════════════════════════════════════════════════════════
    // Subtle noise variation along the ray
    // GLSL: float noise = sin(vUv.y * 10.0 + uTime * 0.5) * 0.1 + 0.9;
    // ═══════════════════════════════════════════════════════════════
    const noiseValue = add(
      mul(sin(add(mul(uvCoord.y, float(10.0)), mul(uTime, float(0.5)))), float(0.1)),
      float(0.9),
    );

    // ═══════════════════════════════════════════════════════════════
    // Combine gradients and noise
    // GLSL: float alpha = gradientX * gradientY * noise * uOpacity;
    // ═══════════════════════════════════════════════════════════════
    const alpha = mul(mul(mul(gradientX, gradientY), noiseValue), uOpacity);

    // Create TSL material
    const mat = new MeshBasicNodeMaterial();
    mat.colorNode = color(uColor);
    mat.opacityNode = alpha;
    mat.transparent = true;
    mat.depthWrite = false;
    mat.side = THREE.DoubleSide;
    mat.blending = THREE.AdditiveBlending;

    // Store uniforms for animation
    setMaterialUserData(mat, { uOpacity, uTime, uColor });

    return mat;
  }, [config, baseOpacity]);

  useDisposeOnUnmount(geometry, material);

  // Animate ray opacity with gentle breathing
  useFrame((state) => {
    if (!materialRef.current) return;

    const time = state.clock.elapsedTime * config.speed + config.phaseOffset;

    // Gentle pulsing opacity (0.4 to 1.0)
    const pulse = Math.sin(time) * 0.3 + 0.7;
    const targetOpacity = baseOpacity * config.opacityMultiplier * pulse;

    // Update uniforms via userData
    const userData = getMaterialUserData<{
      uOpacity?: { value: number };
      uTime?: { value: number };
    }>(materialRef.current);
    if (userData?.uOpacity) {
      userData.uOpacity.value = targetOpacity;
    }
    if (userData?.uTime) {
      userData.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={config.position}
      rotation={config.rotation}
      scale={config.scale}
      geometry={geometry}
    >
      <primitive object={material} ref={materialRef} attach="material" />
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
        <LightRayTSL key={config.id} config={config} baseOpacity={opacity} />
      ))}
    </group>
  );
});

export default SubtleLightRays;
