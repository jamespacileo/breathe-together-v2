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
 * Performance: Just 3 transparent planes, minimal GPU impact
 */

import { useFrame } from '@react-three/fiber';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

interface SubtleLightRaysProps {
  /** Maximum opacity of rays @default 0.04 */
  opacity?: number;
  /** Enable light rays @default true */
  enabled?: boolean;
}

// Shader for gradient light ray
const rayVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const rayFragmentShader = `
  varying vec2 vUv;
  uniform float uOpacity;
  uniform float uTime;
  uniform vec3 uColor;

  void main() {
    // Gradient from center outward (both X edges fade)
    float gradientX = 1.0 - abs(vUv.x - 0.5) * 2.0;
    gradientX = smoothstep(0.0, 0.8, gradientX);

    // Gradient from bottom to top
    float gradientY = smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.7, vUv.y);

    // Combine gradients
    float alpha = gradientX * gradientY;

    // Very subtle noise variation along the ray
    float noise = sin(vUv.y * 10.0 + uTime * 0.5) * 0.1 + 0.9;

    alpha *= noise * uOpacity;

    gl_FragColor = vec4(uColor, alpha);
  }
`;

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

// Ray configurations - multi-depth layers for enhanced depth perception
// Near rays (Z: -30 to -40) are brighter and warmer
// Far rays (Z: -80 to -120) are fainter and cooler
const RAY_CONFIGS: RayConfig[] = [
  // Near layer rays (warmest, brightest)
  {
    id: 'ray-near-main',
    position: [15, 8, -35],
    rotation: [0, 0, -0.4],
    scale: [6, 40, 1],
    color: '#fff8f0', // Warm white
    opacityMultiplier: 1.0,
    phaseOffset: 0,
    speed: 0.3,
  },
  {
    id: 'ray-near-secondary',
    position: [8, 5, -40],
    rotation: [0, 0, -0.35],
    scale: [4, 35, 1],
    color: '#ffe8d8', // Peachy warmth
    opacityMultiplier: 0.7,
    phaseOffset: 2.0,
    speed: 0.25,
  },
  {
    id: 'ray-near-tertiary',
    position: [22, 10, -30],
    rotation: [0, 0, -0.45],
    scale: [5, 45, 1],
    color: '#fff0e8', // Soft warm
    opacityMultiplier: 0.5,
    phaseOffset: 4.0,
    speed: 0.35,
  },
  // Mid-distance rays (neutral)
  {
    id: 'ray-mid-left',
    position: [-20, 12, -70],
    rotation: [0, 0, 0.3],
    scale: [8, 60, 1],
    color: '#f8f4f0', // Neutral warm
    opacityMultiplier: 0.4,
    phaseOffset: 1.5,
    speed: 0.2,
  },
  {
    id: 'ray-mid-right',
    position: [30, 15, -75],
    rotation: [0, 0, -0.5],
    scale: [7, 55, 1],
    color: '#f4f0f8', // Slight cool
    opacityMultiplier: 0.35,
    phaseOffset: 3.0,
    speed: 0.22,
  },
  // Far distance rays (coolest, faintest - suggest distant light source)
  {
    id: 'ray-far-main',
    position: [0, 20, -100],
    rotation: [0, 0, 0.1],
    scale: [12, 80, 1],
    color: '#e8f0f8', // Cool blue-white
    opacityMultiplier: 0.25,
    phaseOffset: 0.5,
    speed: 0.15,
  },
  {
    id: 'ray-far-left',
    position: [-35, 18, -110],
    rotation: [0, 0, 0.25],
    scale: [10, 70, 1],
    color: '#e4ecf4', // Cool
    opacityMultiplier: 0.18,
    phaseOffset: 2.5,
    speed: 0.12,
  },
  {
    id: 'ray-far-right',
    position: [40, 22, -120],
    rotation: [0, 0, -0.35],
    scale: [11, 75, 1],
    color: '#e0e8f0', // Coolest
    opacityMultiplier: 0.15,
    phaseOffset: 4.5,
    speed: 0.1,
  },
];

const LightRay = memo(function LightRay({
  config,
  baseOpacity,
}: {
  config: RayConfig;
  baseOpacity: number;
}) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);

  const material = useMemo(() => {
    const color = new THREE.Color(config.color);
    return new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: baseOpacity * config.opacityMultiplier },
        uTime: { value: config.phaseOffset },
        uColor: { value: color },
      },
      vertexShader: rayVertexShader,
      fragmentShader: rayFragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
  }, [config, baseOpacity]);

  // Animate ray opacity with gentle breathing
  useFrame((state) => {
    if (!materialRef.current) return;

    const time = state.clock.elapsedTime * config.speed + config.phaseOffset;

    // Gentle pulsing opacity
    const pulse = Math.sin(time) * 0.3 + 0.7; // 0.4 to 1.0
    materialRef.current.uniforms.uOpacity.value = baseOpacity * config.opacityMultiplier * pulse;
    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
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
        <LightRay key={config.id} config={config} baseOpacity={opacity} />
      ))}
    </group>
  );
});

export default SubtleLightRays;
