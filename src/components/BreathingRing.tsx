/**
 * BreathingRing - Animated ring around the globe that pulses with breathing
 *
 * Features:
 * - Ring expands and contracts with breathing phase
 * - Glowing cyan/teal color matching the holographic UI style
 * - Subtle opacity pulse
 * - Integrates with ECS breathPhase trait
 *
 * Placed around the EarthGlobe to provide visual breathing feedback.
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { breathPhase } from '../entities/breath/traits';

// Ring configuration
const BASE_INNER_RADIUS = 1.8; // Slightly larger than globe (radius 1.5)
const BASE_OUTER_RADIUS = 2.0;
const EXPANSION_AMOUNT = 0.5; // How much the ring expands on exhale
const RING_SEGMENTS = 64;

// Colors - matches holographic UI style
const RING_COLOR = '#00ffff'; // Cyan to match YOU marker

// Vertex shader - simple passthrough with fresnel calculation
const ringVertexShader = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

// Fragment shader - glowing ring with fresnel edge
const ringFragmentShader = `
uniform vec3 ringColor;
uniform float opacity;
uniform float breathPhase;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  // Calculate ring glow - brightest in the middle of the ring
  float ringY = vUv.y; // 0 to 1 across the ring width
  float ringGlow = sin(ringY * 3.14159); // Peaks at center

  // Fresnel for edge glow
  vec3 viewDir = normalize(vViewPosition);
  float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 2.0);

  // Combine glow effects
  float glow = ringGlow * 0.8 + fresnel * 0.4;

  // Breathing pulse
  float breathPulse = 0.7 + breathPhase * 0.3;

  gl_FragColor = vec4(ringColor, opacity * glow * breathPulse);
}
`;

export interface BreathingRingProps {
  /** Whether to show the ring @default true */
  visible?: boolean;
  /** Base inner radius @default 1.8 */
  innerRadius?: number;
  /** Base outer radius @default 2.0 */
  outerRadius?: number;
  /** Ring color @default "#00ffff" */
  color?: string;
  /** Base opacity @default 0.6 */
  opacity?: number;
  /** Rotation plane - horizontal or vertical @default "horizontal" */
  plane?: 'horizontal' | 'vertical';
}

export function BreathingRing({
  visible = true,
  innerRadius = BASE_INNER_RADIUS,
  outerRadius = BASE_OUTER_RADIUS,
  color = RING_COLOR,
  opacity = 0.6,
  plane = 'horizontal',
}: BreathingRingProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const world = useWorld();

  // Create ring geometry
  const geometry = useMemo(
    () => new THREE.RingGeometry(innerRadius, outerRadius, RING_SEGMENTS),
    [innerRadius, outerRadius],
  );

  // Create pre-allocated color for shader uniform
  const ringColorObj = useMemo(() => new THREE.Color(color), [color]);

  // Create shader material
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          ringColor: { value: ringColorObj },
          opacity: { value: opacity },
          breathPhase: { value: 0 },
        },
        vertexShader: ringVertexShader,
        fragmentShader: ringFragmentShader,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [ringColorObj, opacity],
  );

  // Update color uniform when color prop changes
  useEffect(() => {
    material.uniforms.ringColor.value = ringColorObj;
  }, [material, ringColorObj]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  // Animation loop - scale ring with breathing and update shader
  useFrame(() => {
    if (!meshRef.current || !visible) return;

    try {
      const breathEntity = world.queryFirst(breathPhase);
      if (breathEntity) {
        const phase = breathEntity.get(breathPhase)?.value ?? 0;

        // Update shader uniform
        material.uniforms.breathPhase.value = phase;

        // Expand ring on exhale (phase 0 = exhaled, phase 1 = inhaled)
        // Invert so ring expands when breathing out
        const expansionPhase = 1 - phase;
        const scale = 1 + expansionPhase * EXPANSION_AMOUNT;
        meshRef.current.scale.setScalar(scale);
      }
    } catch {
      // Ignore ECS errors during unmount/remount
    }
  });

  if (!visible) return null;

  // Rotation based on plane
  const rotation: [number, number, number] =
    plane === 'horizontal' ? [Math.PI / 2, 0, 0] : [0, 0, 0];

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} rotation={rotation}>
      {/* Ring is a flat mesh, no children needed */}
    </mesh>
  );
}

export default BreathingRing;
