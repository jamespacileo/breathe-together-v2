/**
 * HorizonPlane - Ground plane that fades into the horizon
 *
 * Creates a subtle sense of "ground" and "sky" meeting at a distant horizon.
 * Features:
 * - Large plane below the scene that fades to transparent at edges
 * - Subtle grid pattern that gets smaller toward horizon (perspective cue)
 * - Soft reflection/sheen that responds to breathing
 * - Gradient from visible near-field to invisible at horizon
 *
 * This grounds the globe in space without adding visual clutter.
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { memo, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { breathPhase } from '../breath/traits';

// Vertex shader for horizon plane
const horizonVertexShader = `
varying vec2 vUv;
varying vec3 vWorldPosition;
varying float vDistanceFromCenter;

void main() {
  vUv = uv;
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;

  // Distance from center for radial fade
  vDistanceFromCenter = length(worldPosition.xz);

  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

// Fragment shader for horizon plane with fade and subtle grid
const horizonFragmentShader = `
uniform float time;
uniform float breathPhase;
uniform vec3 planeColor;
uniform vec3 horizonColor;
uniform float gridOpacity;
uniform float fadeStart;
uniform float fadeEnd;

varying vec2 vUv;
varying vec3 vWorldPosition;
varying float vDistanceFromCenter;

// Subtle grid pattern
float grid(vec2 p, float size) {
  vec2 g = abs(fract(p / size - 0.5) - 0.5) / fwidth(p / size);
  return 1.0 - min(min(g.x, g.y), 1.0);
}

void main() {
  // Radial fade from center to edge
  float radialFade = 1.0 - smoothstep(fadeStart, fadeEnd, vDistanceFromCenter);

  // Additional fade based on UV (distance from camera)
  float distanceFade = smoothstep(0.8, 0.2, vUv.y);

  // Combine fades
  float totalFade = radialFade * distanceFade;

  // Base color - gradient from plane color to horizon color
  vec3 baseColor = mix(horizonColor, planeColor, totalFade * 0.5 + 0.5);

  // Subtle grid overlay - fades with distance
  float gridSize = 2.0; // Grid cell size
  float gridLine = grid(vWorldPosition.xz, gridSize);
  float fineGrid = grid(vWorldPosition.xz, gridSize * 0.25) * 0.3;

  // Grid fades more at distance
  float gridFade = totalFade * totalFade; // Quadratic falloff
  float gridPattern = (gridLine + fineGrid) * gridFade * gridOpacity;

  // Breathing shimmer - subtle brightness variation
  float shimmer = 1.0 + breathPhase * 0.05;

  // Final color with grid
  vec3 finalColor = baseColor * shimmer;
  finalColor += vec3(1.0) * gridPattern * 0.3;

  // Alpha based on total fade
  float alpha = totalFade * 0.4; // Max 40% opacity for subtlety

  gl_FragColor = vec4(finalColor, alpha);
}
`;

interface HorizonPlaneProps {
  /** Plane color (near camera) @default '#f0e8e0' */
  color?: string;
  /** Horizon color (at fade edge) @default '#f8f4f0' */
  horizonColor?: string;
  /** Plane size (radius) @default 100 */
  size?: number;
  /** Vertical position @default -3 */
  height?: number;
  /** Grid line opacity @default 0.15 */
  gridOpacity?: number;
  /** Fade start distance @default 10 */
  fadeStart?: number;
  /** Fade end distance @default 80 */
  fadeEnd?: number;
  /** Enable horizon plane @default true */
  enabled?: boolean;
}

/**
 * HorizonPlane - Subtle ground reference with horizon fade
 */
export const HorizonPlane = memo(function HorizonPlane({
  color = '#f0e8e0',
  horizonColor = '#f8f4f0',
  size = 100,
  height = -3,
  gridOpacity = 0.15,
  fadeStart = 10,
  fadeEnd = 80,
  enabled = true,
}: HorizonPlaneProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const world = useWorld();

  // Create shader material
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          breathPhase: { value: 0 },
          planeColor: { value: new THREE.Color(color) },
          horizonColor: { value: new THREE.Color(horizonColor) },
          gridOpacity: { value: gridOpacity },
          fadeStart: { value: fadeStart },
          fadeEnd: { value: fadeEnd },
        },
        vertexShader: horizonVertexShader,
        fragmentShader: horizonFragmentShader,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [color, horizonColor, gridOpacity, fadeStart, fadeEnd],
  );

  // Update uniforms
  useFrame((state) => {
    if (!materialRef.current) return;

    materialRef.current.uniforms.time.value = state.clock.elapsedTime;

    // Get breath phase from ECS
    try {
      const breathEntity = world.queryFirst(breathPhase);
      if (breathEntity) {
        const phase = breathEntity.get(breathPhase)?.value ?? 0;
        materialRef.current.uniforms.breathPhase.value = phase;
      }
    } catch {
      // Ignore ECS errors during hot reload
    }
  });

  if (!enabled) return null;

  return (
    <mesh position={[0, height, 0]} rotation={[-Math.PI / 2, 0, 0]} name="Horizon Plane">
      <planeGeometry args={[size * 2, size * 2, 1, 1]} />
      <primitive object={material} ref={materialRef} attach="material" />
    </mesh>
  );
});

export default HorizonPlane;
