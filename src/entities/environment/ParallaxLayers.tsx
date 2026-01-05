/**
 * ParallaxLayers - Multi-layer background with camera-reactive parallax
 *
 * Creates depth through motion parallax:
 * - Near layers move faster with camera
 * - Far layers move slower
 * - Creates strong sense of depth through relative motion
 *
 * Uses subtle gradient overlays at different depths.
 */

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

interface ParallaxLayersProps {
  /** Enable/disable parallax layers */
  enabled?: boolean;
  /** Overall opacity multiplier */
  opacity?: number;
  /** Parallax intensity (how much layers react to camera) */
  intensity?: number;
}

interface ParallaxLayerConfig {
  z: number;
  opacity: number;
  color: string;
  parallaxFactor: number; // How much this layer moves relative to camera (0-1)
  scale: number;
}

const LAYER_CONFIGS: ParallaxLayerConfig[] = [
  // Near layer - moves most with camera
  { z: -30, opacity: 0.08, color: '#f0e8e0', parallaxFactor: 0.3, scale: 80 },
  // Mid layer
  { z: -60, opacity: 0.06, color: '#e8e0d8', parallaxFactor: 0.15, scale: 120 },
  // Far layer - barely moves
  { z: -100, opacity: 0.04, color: '#e0d8d0', parallaxFactor: 0.05, scale: 180 },
  // Horizon layer - nearly static
  { z: -150, opacity: 0.03, color: '#d8d0c8', parallaxFactor: 0.02, scale: 250 },
];

const parallaxVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const parallaxFragmentShader = `
  uniform float uOpacity;
  uniform vec3 uColor;
  uniform float uTime;
  varying vec2 vUv;

  // Simple noise function for subtle texture
  float noise(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    // Radial gradient from center
    vec2 center = vec2(0.5, 0.5);
    float dist = distance(vUv, center);
    float gradient = 1.0 - smoothstep(0.0, 0.7, dist);

    // Very subtle noise texture
    float n = noise(vUv * 50.0 + uTime * 0.1) * 0.1 + 0.9;

    float alpha = gradient * n * uOpacity;

    gl_FragColor = vec4(uColor, alpha);
  }
`;

function ParallaxLayer({
  config,
  baseOpacity,
  intensity,
}: {
  config: ParallaxLayerConfig;
  baseOpacity: number;
  intensity: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { camera } = useThree();

  // Store initial position
  const basePosition = useMemo(() => new THREE.Vector3(0, 0, config.z), [config.z]);

  const geometry = useMemo(
    () => new THREE.PlaneGeometry(config.scale, config.scale * 0.6),
    [config.scale],
  );

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: config.opacity * baseOpacity },
        uColor: { value: new THREE.Color(config.color) },
        uTime: { value: 0 },
      },
      vertexShader: parallaxVertexShader,
      fragmentShader: parallaxFragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }, [config.opacity, config.color, baseOpacity]);

  // Parallax effect based on camera position
  useFrame((state) => {
    if (!meshRef.current || !materialRef.current) return;

    const time = state.clock.elapsedTime;
    materialRef.current.uniforms.uTime.value = time;

    // Get camera position offset from center
    const cameraOffset = new THREE.Vector3().copy(camera.position);

    // Apply parallax - layers move opposite to camera, scaled by parallaxFactor
    const parallaxOffset = cameraOffset.multiplyScalar(config.parallaxFactor * intensity);

    meshRef.current.position.x = basePosition.x - parallaxOffset.x;
    meshRef.current.position.y = basePosition.y - parallaxOffset.y;
    meshRef.current.position.z = basePosition.z;
  });

  // Cleanup
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  return (
    <mesh ref={meshRef} position={[0, 0, config.z]}>
      <primitive object={geometry} attach="geometry" />
      <primitive object={material} ref={materialRef} attach="material" />
    </mesh>
  );
}

export function ParallaxLayers({
  enabled = true,
  opacity = 1,
  intensity = 1,
}: ParallaxLayersProps) {
  if (!enabled) return null;

  return (
    <group name="parallax-layers">
      {LAYER_CONFIGS.map((config) => (
        <ParallaxLayer
          key={`parallax-z${config.z}`}
          config={config}
          baseOpacity={opacity}
          intensity={intensity}
        />
      ))}
    </group>
  );
}
