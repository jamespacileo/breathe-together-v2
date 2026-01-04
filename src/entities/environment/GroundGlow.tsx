/**
 * GroundGlow - Subtle radial gradient beneath the globe for spatial grounding
 *
 * Unlike stage mode's grid, this is a soft, ethereal glow that:
 * - Provides vertical spatial reference without hard edges
 * - Creates subtle "ground plane" perception
 * - Enhances the floating-in-space aesthetic with warmth
 *
 * Rendered as a simple disc with radial gradient material.
 */

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

interface GroundGlowProps {
  /** Enable the ground glow @default true */
  enabled?: boolean;
  /** Glow color @default '#f8e8d8' */
  color?: string;
  /** Maximum opacity at center @default 0.15 */
  opacity?: number;
  /** Radius of the glow disc @default 12 */
  radius?: number;
  /** Y position (height below globe) @default -4 */
  yPosition?: number;
  /** Pulse with breathing @default true */
  breathSync?: boolean;
}

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform vec3 glowColor;
uniform float opacity;
uniform float breathPhase;

varying vec2 vUv;

void main() {
  // Calculate distance from center (0.5, 0.5)
  vec2 center = vUv - 0.5;
  float dist = length(center) * 2.0; // 0 at center, 1 at edge

  // Soft radial falloff with smooth edges
  float falloff = 1.0 - smoothstep(0.0, 1.0, dist);
  falloff = falloff * falloff; // Quadratic for softer center

  // Subtle breath-synchronized pulsing
  float breathPulse = 1.0 + sin(breathPhase * 3.14159 * 2.0) * 0.1;

  // Final opacity with breathing
  float finalOpacity = opacity * falloff * breathPulse;

  // Warm glow color with slight gradient toward edges
  vec3 edgeColor = glowColor * 0.8; // Slightly darker at edges
  vec3 finalColor = mix(edgeColor, glowColor, falloff);

  gl_FragColor = vec4(finalColor, finalOpacity);
}
`;

export function GroundGlow({
  enabled = true,
  color = '#f8e8d8',
  opacity = 0.15,
  radius = 12,
  yPosition = -4,
  breathSync = true,
}: GroundGlowProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(() => new THREE.CircleGeometry(radius, 64), [radius]);

  const material = useMemo(() => {
    const glowColor = new THREE.Color(color);
    return new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: glowColor },
        opacity: { value: opacity },
        breathPhase: { value: 0 },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }, [color, opacity]);

  // Update uniforms when props change
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.glowColor.value.set(color);
      materialRef.current.uniforms.opacity.value = opacity;
    }
  }, [color, opacity]);

  // Animate breath phase
  useFrame(() => {
    if (!materialRef.current || !breathSync) return;

    // Calculate breath phase from UTC time (synchronized globally)
    const cycleLength = 19000; // 19 seconds total
    const msInCycle = Date.now() % cycleLength;
    const breathPhase = msInCycle / cycleLength;

    materialRef.current.uniforms.breathPhase.value = breathPhase;
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
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, yPosition, 0]} geometry={geometry}>
      <primitive object={material} ref={materialRef} attach="material" />
    </mesh>
  );
}

export default GroundGlow;
