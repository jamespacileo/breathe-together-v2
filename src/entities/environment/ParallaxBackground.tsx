/**
 * ParallaxBackground - Multi-layer parallax background system
 *
 * Creates depth perception through parallax movement:
 * - Multiple background layers at different Z-depths
 * - Each layer moves at different speeds based on camera/scene rotation
 * - Creates strong depth illusion through differential motion
 *
 * Uses subtle gradient/noise layers that respond to scene rotation.
 */

import { useFrame, useThree } from '@react-three/fiber';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { SCENE_DEPTH } from '../../constants';

// Parallax layer shader
const parallaxVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const parallaxFragmentShader = `
  uniform float uTime;
  uniform float uOpacity;
  uniform vec2 uOffset;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform float uNoiseScale;

  varying vec2 vUv;

  // Simple noise
  float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  float smoothNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float a = noise(i);
    float b = noise(i + vec2(1.0, 0.0));
    float c = noise(i + vec2(0.0, 1.0));
    float d = noise(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float f = 0.0;
    f += 0.5 * smoothNoise(p); p *= 2.0;
    f += 0.25 * smoothNoise(p); p *= 2.0;
    f += 0.125 * smoothNoise(p);
    return f / 0.875;
  }

  void main() {
    // Apply parallax offset
    vec2 uv = vUv + uOffset;

    // Noise pattern
    float n = fbm(uv * uNoiseScale + uTime * 0.01);

    // Color gradient
    vec3 color = mix(uColor1, uColor2, n);

    // Radial fade
    vec2 center = vUv - 0.5;
    float radialFade = 1.0 - smoothstep(0.3, 0.7, length(center));

    float alpha = n * radialFade * uOpacity * 0.5;

    gl_FragColor = vec4(color, alpha);
  }
`;

interface ParallaxLayerConfig {
  id: string;
  /** Z position */
  zPosition: number;
  /** Scale */
  scale: number;
  /** Parallax multiplier (how much offset per rotation) */
  parallaxFactor: number;
  /** Base opacity */
  opacity: number;
  /** Color 1 */
  color1: string;
  /** Color 2 */
  color2: string;
  /** Noise scale */
  noiseScale: number;
}

// Parallax layer configurations
const PARALLAX_CONFIGS: ParallaxLayerConfig[] = [
  {
    id: 'near-parallax',
    zPosition: SCENE_DEPTH.LAYERS.NEAR_BG.z - 5,
    scale: 35,
    parallaxFactor: 0.15,
    opacity: 0.06,
    color1: '#f0e8e0',
    color2: '#e8e0d8',
    noiseScale: 3.0,
  },
  {
    id: 'mid-parallax',
    zPosition: SCENE_DEPTH.LAYERS.MID_BG.z - 5,
    scale: 55,
    parallaxFactor: 0.08,
    opacity: 0.04,
    color1: '#e8e4e0',
    color2: '#e0e4e8',
    noiseScale: 2.0,
  },
  {
    id: 'far-parallax',
    zPosition: SCENE_DEPTH.LAYERS.FAR_BG.z - 5,
    scale: 80,
    parallaxFactor: 0.04,
    opacity: 0.025,
    color1: '#e0e0e4',
    color2: '#d8e0e8',
    noiseScale: 1.5,
  },
];

interface ParallaxLayerProps {
  config: ParallaxLayerConfig;
}

/**
 * Individual parallax layer with camera-responsive offset
 */
const ParallaxLayer = memo(function ParallaxLayer({ config }: ParallaxLayerProps) {
  const { camera } = useThree();
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);

  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), []);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: config.opacity },
        uOffset: { value: new THREE.Vector2(0, 0) },
        uColor1: { value: new THREE.Color(config.color1) },
        uColor2: { value: new THREE.Color(config.color2) },
        uNoiseScale: { value: config.noiseScale },
      },
      vertexShader: parallaxVertexShader,
      fragmentShader: parallaxFragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }, [config]);

  // Track camera rotation for parallax
  const lastCameraRotation = useRef(new THREE.Euler());

  // Animation and parallax calculation
  useFrame((state) => {
    if (!materialRef.current || !groupRef.current) return;

    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;

    // Calculate parallax offset based on camera rotation difference
    const rotationDelta = new THREE.Vector2(
      (camera.rotation.y - lastCameraRotation.current.y) * config.parallaxFactor,
      (camera.rotation.x - lastCameraRotation.current.x) * config.parallaxFactor,
    );

    // Accumulate offset
    const currentOffset = materialRef.current.uniforms.uOffset.value;
    currentOffset.x += rotationDelta.x;
    currentOffset.y += rotationDelta.y;

    // Slow decay back to center
    currentOffset.x *= 0.995;
    currentOffset.y *= 0.995;

    lastCameraRotation.current.copy(camera.rotation);
  });

  // Cleanup
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  return (
    <group ref={groupRef} position={[0, 0, config.zPosition]}>
      <mesh scale={[config.scale, config.scale, 1]} geometry={geometry}>
        <primitive object={material} ref={materialRef} attach="material" />
      </mesh>
    </group>
  );
});

export interface ParallaxBackgroundProps {
  /**
   * Enable parallax background
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
 * ParallaxBackground - Creates depth through parallax motion
 *
 * Renders multiple background layers that move at different speeds
 * in response to camera movement, creating parallax depth effect.
 */
export const ParallaxBackground = memo(function ParallaxBackground({
  enabled = true,
  opacity = 1.0,
}: ParallaxBackgroundProps) {
  if (!enabled) return null;

  // Apply opacity multiplier
  const adjustedConfigs = PARALLAX_CONFIGS.map((config) => ({
    ...config,
    opacity: config.opacity * opacity,
  }));

  return (
    <group name="ParallaxBackground">
      {adjustedConfigs.map((config) => (
        <ParallaxLayer key={config.id} config={config} />
      ))}
    </group>
  );
});

export default ParallaxBackground;
