/**
 * DepthLightRays - Enhanced god rays emanating from distant light source
 *
 * Creates depth-enhancing light rays that:
 * - Originate from a distant point (suggests depth)
 * - Use volumetric-style gradients
 * - Have breathing-synchronized pulsing
 * - Create strong depth cues through perspective
 *
 * Renders multiple ray planes at different depths for parallax.
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { SCENE_DEPTH } from '../../constants';
import { breathPhase } from '../breath/traits';

// Enhanced ray shader
const rayVertexShader = `
  varying vec2 vUv;
  varying float vDepth;

  void main() {
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vDepth = -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const rayFragmentShader = `
  uniform float uOpacity;
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uBreathPhase;
  uniform float uIntensity;

  varying vec2 vUv;
  varying float vDepth;

  void main() {
    // Cone gradient from bottom-center (light source)
    vec2 rayOrigin = vec2(0.5, 0.0);
    vec2 toUv = vUv - rayOrigin;

    // Angle-based falloff for ray shape
    float angle = atan(toUv.x, toUv.y);
    float rayPattern = cos(angle * 3.0) * 0.5 + 0.5;
    rayPattern = pow(rayPattern, 2.0);

    // Distance falloff from source
    float dist = length(toUv);
    float distFade = smoothstep(0.0, 1.2, dist) * smoothstep(1.5, 0.8, dist);

    // Vertical gradient (stronger at bottom)
    float verticalFade = smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.5, vUv.y);

    // Animated shimmer
    float shimmer = sin(vUv.y * 20.0 - uTime * 0.5) * 0.15 + 0.85;

    // Breathing pulse
    float breathPulse = 0.7 + uBreathPhase * 0.3;

    // Combine all effects
    float alpha = rayPattern * distFade * verticalFade * shimmer * breathPulse;
    alpha *= uOpacity * uIntensity;

    // Subtle color variation along ray
    vec3 color = mix(uColor, uColor * 1.1, vUv.y);

    gl_FragColor = vec4(color, alpha);
  }
`;

interface DepthRayConfig {
  id: string;
  /** Z position */
  zPosition: number;
  /** Position offset [x, y] */
  offset: [number, number];
  /** Scale [width, height] */
  scale: [number, number];
  /** Ray color */
  color: string;
  /** Opacity */
  opacity: number;
  /** Intensity multiplier */
  intensity: number;
  /** Animation phase offset */
  phaseOffset: number;
  /** Rotation (radians) */
  rotation: number;
}

// Ray configurations at different depths
const DEPTH_RAY_CONFIGS: DepthRayConfig[] = [
  {
    id: 'near-ray-1',
    zPosition: SCENE_DEPTH.LAYERS.NEAR_BG.z,
    offset: [10, 15],
    scale: [15, 40],
    color: '#fff8f0',
    opacity: 0.04,
    intensity: 1.0,
    phaseOffset: 0,
    rotation: -0.2,
  },
  {
    id: 'near-ray-2',
    zPosition: SCENE_DEPTH.LAYERS.NEAR_BG.z - 5,
    offset: [-8, 12],
    scale: [12, 35],
    color: '#ffe8d8',
    opacity: 0.03,
    intensity: 0.8,
    phaseOffset: 1.5,
    rotation: 0.15,
  },
  {
    id: 'mid-ray-1',
    zPosition: SCENE_DEPTH.LAYERS.MID_BG.z,
    offset: [15, 20],
    scale: [25, 60],
    color: '#fff0e8',
    opacity: 0.025,
    intensity: 0.9,
    phaseOffset: 0.8,
    rotation: -0.3,
  },
  {
    id: 'mid-ray-2',
    zPosition: SCENE_DEPTH.LAYERS.MID_BG.z - 10,
    offset: [-12, 18],
    scale: [20, 50],
    color: '#f8e8e0',
    opacity: 0.02,
    intensity: 0.7,
    phaseOffset: 2.0,
    rotation: 0.25,
  },
  {
    id: 'far-ray',
    zPosition: SCENE_DEPTH.LAYERS.FAR_BG.z,
    offset: [0, 25],
    scale: [40, 80],
    color: '#f0e8e0',
    opacity: 0.015,
    intensity: 0.6,
    phaseOffset: 1.2,
    rotation: 0,
  },
];

interface DepthRayProps {
  config: DepthRayConfig;
}

/**
 * Individual depth ray with animation
 */
const DepthRay = memo(function DepthRay({ config }: DepthRayProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const world = useWorld();

  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: config.opacity },
        uTime: { value: config.phaseOffset },
        uColor: { value: new THREE.Color(config.color) },
        uBreathPhase: { value: 0 },
        uIntensity: { value: config.intensity },
      },
      vertexShader: rayVertexShader,
      fragmentShader: rayFragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
  }, [config]);

  // Animation
  useFrame((state) => {
    if (!materialRef.current) return;

    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime + config.phaseOffset;

    // Breathing influence
    const breathEntity = world.queryFirst(breathPhase);
    if (breathEntity) {
      const phase = breathEntity.get(breathPhase)?.value ?? 0;
      materialRef.current.uniforms.uBreathPhase.value = phase;
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
      position={[config.offset[0], config.offset[1], config.zPosition]}
      rotation={[0, 0, config.rotation]}
      scale={[config.scale[0], config.scale[1], 1]}
      geometry={geometry}
    >
      <primitive object={material} ref={materialRef} attach="material" />
    </mesh>
  );
});

export interface DepthLightRaysProps {
  /**
   * Enable depth light rays
   * @default true
   */
  enabled?: boolean;
  /**
   * Global opacity multiplier
   * @default 1.0
   * @min 0
   * @max 2
   */
  opacity?: number;
}

/**
 * DepthLightRays - Creates depth through god ray effects
 *
 * Renders multiple light ray planes at different depths
 * to create volumetric lighting appearance and enhance depth.
 */
export const DepthLightRays = memo(function DepthLightRays({
  enabled = true,
  opacity = 1.0,
}: DepthLightRaysProps) {
  if (!enabled) return null;

  // Apply opacity multiplier
  const adjustedConfigs = DEPTH_RAY_CONFIGS.map((config) => ({
    ...config,
    opacity: config.opacity * opacity,
  }));

  return (
    <group name="DepthLightRays">
      {adjustedConfigs.map((config) => (
        <DepthRay key={config.id} config={config} />
      ))}
    </group>
  );
});

export default DepthLightRays;
