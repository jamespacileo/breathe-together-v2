/**
 * BreathRays - Light rays that pulse with breathing
 *
 * Enhanced version of SubtleLightRays with breath synchronization:
 * - Rays intensify during inhale (gathering energy)
 * - Rays soften during exhale (releasing)
 * - Subtle color temperature shift with breath phase
 *
 * Positioned to create diagonal shafts from behind the globe
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { breathPhase } from '../breath/traits';

export interface BreathRaysProps {
  /**
   * Maximum opacity of rays
   * @default 0.08
   * @min 0
   * @max 0.2
   */
  opacity?: number;

  /**
   * Number of ray beams
   * @default 5
   * @min 2
   * @max 8
   */
  rayCount?: number;

  /**
   * Base color (warm white)
   * @default '#fff8f0'
   */
  color?: string;

  /**
   * Inhale color shift (cooler)
   * @default '#f0f8ff'
   */
  inhaleColor?: string;

  /**
   * Enable breath rays
   * @default true
   */
  enabled?: boolean;
}

// Shader for gradient light ray with breath sync
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
  uniform float uBreathPhase;
  uniform vec3 uBaseColor;
  uniform vec3 uInhaleColor;

  void main() {
    // Gradient from center outward (both X edges fade)
    float gradientX = 1.0 - abs(vUv.x - 0.5) * 2.0;
    gradientX = smoothstep(0.0, 0.8, gradientX);

    // Gradient from bottom to top
    float gradientY = smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.7, vUv.y);

    // Combine gradients
    float alpha = gradientX * gradientY;

    // Noise variation along the ray
    float noise = sin(vUv.y * 8.0 + uTime * 0.3) * 0.15 + 0.85;

    // Breath-based intensity modulation
    // Rays brighten during inhale
    float breathIntensity = 0.6 + uBreathPhase * 0.4;

    alpha *= noise * uOpacity * breathIntensity;

    // Color shift based on breath
    vec3 color = mix(uBaseColor, uInhaleColor, uBreathPhase * 0.5);

    gl_FragColor = vec4(color, alpha);
  }
`;

interface RayConfig {
  id: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  phaseOffset: number;
}

// Generate ray configurations
function generateRayConfigs(count: number): RayConfig[] {
  const configs: RayConfig[] = [];

  for (let i = 0; i < count; i++) {
    const t = i / (count - 1); // 0 to 1
    const spreadAngle = -0.5 + t * 0.2; // -0.5 to -0.3 radians

    configs.push({
      id: `ray-${i}`,
      position: [8 + t * 15, 5 + t * 6, -30 - t * 10],
      rotation: [0, 0, spreadAngle],
      scale: [3 + t * 3, 30 + t * 15, 1],
      phaseOffset: t * 3,
    });
  }

  return configs;
}

const BreathRay = memo(function BreathRay({
  config,
  baseOpacity,
  baseColor,
  inhaleColor,
}: {
  config: RayConfig;
  baseOpacity: number;
  baseColor: string;
  inhaleColor: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const world = useWorld();

  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: baseOpacity },
        uTime: { value: config.phaseOffset },
        uBreathPhase: { value: 0 },
        uBaseColor: { value: new THREE.Color(baseColor) },
        uInhaleColor: { value: new THREE.Color(inhaleColor) },
      },
      vertexShader: rayVertexShader,
      fragmentShader: rayFragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
  }, [baseOpacity, baseColor, inhaleColor, config.phaseOffset]);

  useFrame((state) => {
    if (!meshRef.current) return;

    const mat = meshRef.current.material as THREE.ShaderMaterial;
    mat.uniforms.uTime.value = state.clock.elapsedTime;

    const breathEntity = world.queryFirst(breathPhase);
    if (breathEntity) {
      const phase = breathEntity.get(breathPhase)?.value ?? 0;
      mat.uniforms.uBreathPhase.value = phase;
    }
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
      material={material}
    />
  );
});

/**
 * BreathRays - Breathing-synchronized light rays
 */
export const BreathRays = memo(function BreathRays({
  opacity = 0.08,
  rayCount = 5,
  color = '#fff8f0',
  inhaleColor = '#f0f8ff',
  enabled = true,
}: BreathRaysProps) {
  const configs = useMemo(() => generateRayConfigs(rayCount), [rayCount]);

  if (!enabled) return null;

  return (
    <group>
      {configs.map((config) => (
        <BreathRay
          key={config.id}
          config={config}
          baseOpacity={opacity}
          baseColor={color}
          inhaleColor={inhaleColor}
        />
      ))}
    </group>
  );
});

export default BreathRays;
