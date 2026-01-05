/**
 * NebulaLayers - Volumetric nebula/cloud effects at different depths
 *
 * Creates painterly, galaxy-like nebula effects using layered
 * transparent meshes with noise-based coloring:
 *
 * - Inner wisps: Close to action, animated, breath-responsive
 * - Mid clouds: Slow drift, painterly appearance
 * - Distant nebula: Static, creates backdrop depth
 *
 * Uses shader-based noise for organic, evolving patterns.
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { SCENE_DEPTH } from '../../constants';
import { breathPhase } from '../breath/traits';

// Vertex shader for nebula
const nebulaVertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;

  void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Fragment shader for nebula effect
const nebulaFragmentShader = `
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform float uNoiseScale;
  uniform float uBreathPhase;

  varying vec2 vUv;
  varying vec3 vPosition;

  // Simplex noise
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m; m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  float fbm(vec2 p) {
    float f = 0.0;
    f += 0.5000 * snoise(p); p *= 2.02;
    f += 0.2500 * snoise(p); p *= 2.03;
    f += 0.1250 * snoise(p);
    return f / 0.875;
  }

  void main() {
    // Animated noise coordinates
    vec2 noiseCoord = vUv * uNoiseScale + vec2(uTime * 0.02, uTime * 0.01);

    // Multiple noise layers for complex patterns
    float noise1 = fbm(noiseCoord);
    float noise2 = fbm(noiseCoord * 1.5 + 100.0);

    // Combine noises
    float combinedNoise = noise1 * 0.6 + noise2 * 0.4;
    combinedNoise = smoothstep(0.1, 0.6, combinedNoise);

    // Color gradient based on noise
    vec3 color = mix(uColor1, uColor2, combinedNoise);

    // Radial falloff from center
    vec2 center = vUv - 0.5;
    float radialFade = 1.0 - smoothstep(0.2, 0.5, length(center));

    // Breathing influence
    float breathEffect = 0.8 + uBreathPhase * 0.2;

    // Final alpha
    float alpha = combinedNoise * radialFade * uOpacity * breathEffect;

    gl_FragColor = vec4(color, alpha);
  }
`;

interface NebulaLayerConfig {
  id: string;
  /** Z position */
  zPosition: number;
  /** Scale (size) of the nebula plane */
  scale: number;
  /** Base opacity */
  opacity: number;
  /** Primary color */
  color1: string;
  /** Secondary color */
  color2: string;
  /** Noise scale (higher = more detailed) */
  noiseScale: number;
  /** Animation speed multiplier */
  animationSpeed: number;
  /** Y offset */
  yOffset: number;
}

// Nebula layer configurations
const NEBULA_CONFIGS: NebulaLayerConfig[] = [
  {
    id: 'inner-wisps',
    zPosition: SCENE_DEPTH.LAYERS.NEAR_BG.z,
    scale: 30,
    opacity: 0.08,
    color1: '#f8d4c4',
    color2: '#d4c8e8',
    noiseScale: 2.0,
    animationSpeed: 1.0,
    yOffset: 5,
  },
  {
    id: 'mid-clouds',
    zPosition: SCENE_DEPTH.LAYERS.MID_BG.z,
    scale: 50,
    opacity: 0.06,
    color1: '#e8d4c8',
    color2: '#c8d8e8',
    noiseScale: 1.5,
    animationSpeed: 0.5,
    yOffset: 0,
  },
  {
    id: 'far-nebula',
    zPosition: SCENE_DEPTH.LAYERS.FAR_BG.z,
    scale: 80,
    opacity: 0.04,
    color1: '#d8d0c8',
    color2: '#c8d4e0',
    noiseScale: 1.0,
    animationSpeed: 0.2,
    yOffset: -5,
  },
  {
    id: 'deep-backdrop',
    zPosition: SCENE_DEPTH.LAYERS.DEEP_BG.z,
    scale: 120,
    opacity: 0.025,
    color1: '#d0ccc8',
    color2: '#c0c8d8',
    noiseScale: 0.8,
    animationSpeed: 0.1,
    yOffset: -10,
  },
];

interface NebulaLayerProps {
  config: NebulaLayerConfig;
}

/**
 * Individual nebula layer with shader-based animation
 */
const NebulaLayer = memo(function NebulaLayer({ config }: NebulaLayerProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const world = useWorld();

  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: config.opacity },
        uColor1: { value: new THREE.Color(config.color1) },
        uColor2: { value: new THREE.Color(config.color2) },
        uNoiseScale: { value: config.noiseScale },
        uBreathPhase: { value: 0 },
      },
      vertexShader: nebulaVertexShader,
      fragmentShader: nebulaFragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
  }, [config]);

  // Animation
  useFrame((state) => {
    if (!materialRef.current) return;

    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime * config.animationSpeed;

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
      position={[0, config.yOffset, config.zPosition]}
      scale={[config.scale, config.scale, 1]}
      geometry={geometry}
    >
      <primitive object={material} ref={materialRef} attach="material" />
    </mesh>
  );
});

export interface NebulaLayersProps {
  /**
   * Enable nebula layers
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
 * NebulaLayers - Creates depth through layered nebula effects
 *
 * Renders multiple shader-based nebula planes at different depths
 * with organic, evolving patterns for atmospheric depth.
 */
export const NebulaLayers = memo(function NebulaLayers({
  enabled = true,
  opacity = 1.0,
}: NebulaLayersProps) {
  if (!enabled) return null;

  // Apply opacity multiplier
  const adjustedConfigs = NEBULA_CONFIGS.map((config) => ({
    ...config,
    opacity: config.opacity * opacity,
  }));

  return (
    <group name="NebulaLayers">
      {adjustedConfigs.map((config) => (
        <NebulaLayer key={config.id} config={config} />
      ))}
    </group>
  );
});

export default NebulaLayers;
