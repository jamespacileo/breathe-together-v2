/**
 * SubtleGroundPlane - Very subtle ground reference for spatial anchoring
 *
 * Creates an extremely faint ground plane that provides:
 * - Spatial reference point
 * - Subtle reflection hint
 * - Depth anchor without being visually distracting
 *
 * Uses a radial gradient that fades to transparent at edges.
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { breathPhase } from '../breath/traits';

// Vertex shader
const groundVertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;

  void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Fragment shader with radial gradient
const groundFragmentShader = `
  uniform float uOpacity;
  uniform vec3 uColor;
  uniform float uBreathPhase;
  uniform float uTime;

  varying vec2 vUv;

  // Simple noise for subtle texture
  float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    // Radial distance from center
    vec2 center = vUv - 0.5;
    float dist = length(center) * 2.0;

    // Radial fade - strong falloff at edges
    float radialFade = 1.0 - smoothstep(0.3, 0.95, dist);

    // Subtle grid pattern
    vec2 grid = abs(fract(vUv * 40.0 - 0.5) - 0.5);
    float gridLine = 1.0 - smoothstep(0.0, 0.05, min(grid.x, grid.y));
    gridLine *= 0.15; // Very subtle

    // Subtle noise texture
    float n = noise(vUv * 100.0 + uTime * 0.01) * 0.1;

    // Breathing influence on opacity
    float breathEffect = 0.8 + uBreathPhase * 0.2;

    // Combine effects
    float alpha = (radialFade + gridLine * radialFade) * uOpacity * breathEffect;
    alpha += n * radialFade * 0.02;

    // Slight color variation toward edges (cooler)
    vec3 color = mix(uColor, uColor * 0.9, dist);

    gl_FragColor = vec4(color, alpha);
  }
`;

export interface SubtleGroundPlaneProps {
  /**
   * Enable ground plane
   * @default true
   */
  enabled?: boolean;
  /**
   * Y position of the ground
   * @default -8
   */
  yPosition?: number;
  /**
   * Ground plane size
   * @default 100
   */
  size?: number;
  /**
   * Base opacity (very low for subtlety)
   * @default 0.04
   */
  opacity?: number;
  /**
   * Ground color
   * @default '#e8e0d8'
   */
  color?: string;
}

/**
 * SubtleGroundPlane - Creates spatial anchor through faint ground reference
 *
 * Renders an extremely subtle ground plane with radial fade
 * to provide spatial orientation without visual distraction.
 */
export const SubtleGroundPlane = memo(function SubtleGroundPlane({
  enabled = true,
  yPosition = -8,
  size = 100,
  opacity = 0.04,
  color = '#e8e0d8',
}: SubtleGroundPlaneProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const world = useWorld();

  const geometry = useMemo(() => new THREE.PlaneGeometry(size, size, 1, 1), [size]);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: opacity },
        uColor: { value: new THREE.Color(color) },
        uBreathPhase: { value: 0 },
        uTime: { value: 0 },
      },
      vertexShader: groundVertexShader,
      fragmentShader: groundFragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }, [opacity, color]);

  // Animation
  useFrame((state) => {
    if (!materialRef.current) return;

    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;

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

  if (!enabled) return null;

  return (
    <mesh position={[0, yPosition, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={geometry}>
      <primitive object={material} ref={materialRef} attach="material" />
    </mesh>
  );
});

export default SubtleGroundPlane;
