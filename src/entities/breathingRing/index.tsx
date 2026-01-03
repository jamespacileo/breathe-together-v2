/**
 * BreathingRing - 3D breathing progress indicator around the globe
 *
 * A minimal, elegant ring that shows breathing progress:
 * - Arc fills during inhale, empties during exhale
 * - Subtle glow that intensifies with breath
 * - Positioned at globe equator for visual connection
 *
 * Uses shader-based arc rendering for smooth animation.
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { BREATH_TOTAL_CYCLE } from '../../constants';
import { calculatePhaseInfo } from '../../lib/breathPhase';
import { breathPhase, phaseType } from '../breath/traits';

// Vertex shader
const vertexShader = `
varying vec2 vUv;
varying float vAngle;

void main() {
  vUv = uv;
  // Calculate angle from UV (0-1 maps to 0-2PI)
  vAngle = uv.x * 3.14159265 * 2.0;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Fragment shader - arc with breathing progress
const fragmentShader = `
uniform float progress;      // 0-1 arc fill amount
uniform float breathPhase;   // 0-1 breathing phase
uniform float glowIntensity; // Current glow level
uniform vec3 color;
uniform float opacity;

varying vec2 vUv;
varying float vAngle;

void main() {
  // Progress determines how much of the ring is visible
  // Arc fills from left (angle=PI) to right (angle=0 or 2PI)
  float arcProgress = progress;

  // Normalize angle to 0-1 range, starting from left
  float normalizedAngle = vUv.x;

  // Sharp cutoff for arc edge with slight softness
  float edge = smoothstep(arcProgress - 0.02, arcProgress, normalizedAngle);
  float arcAlpha = 1.0 - edge;

  // Add subtle glow effect based on breathing
  float glow = glowIntensity * (0.5 + breathPhase * 0.5);

  // Core color with breathing warmth shift
  vec3 coreColor = color;
  // Slightly warmer on inhale
  coreColor = mix(coreColor, coreColor * 1.1, breathPhase * 0.3);

  // Final alpha combines arc visibility with base opacity
  float finalAlpha = arcAlpha * opacity * (0.6 + glow * 0.4);

  // Fade at the very ends for softer appearance
  float endFade = smoothstep(0.0, 0.05, normalizedAngle) * smoothstep(1.0, 0.95, normalizedAngle);
  finalAlpha *= endFade;

  gl_FragColor = vec4(coreColor, finalAlpha);
}
`;

interface BreathingRingProps {
  /** Inner radius of the ring @default 1.75 */
  innerRadius?: number;
  /** Outer radius of the ring @default 1.8 */
  outerRadius?: number;
  /** Ring color @default '#c9a06c' (gold) */
  color?: string;
  /** Base opacity @default 0.4 */
  opacity?: number;
  /** Y position offset @default -0.1 */
  yOffset?: number;
  /** Enable the ring @default true */
  enabled?: boolean;
}

export function BreathingRing({
  innerRadius = 1.75,
  outerRadius = 1.8,
  color = '#c9a06c',
  opacity = 0.4,
  yOffset = -0.1,
  enabled = true,
}: BreathingRingProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const world = useWorld();

  // Create ring geometry
  const geometry = useMemo(() => {
    return new THREE.RingGeometry(innerRadius, outerRadius, 128, 1);
  }, [innerRadius, outerRadius]);

  // Create shader material
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        progress: { value: 0 },
        breathPhase: { value: 0 },
        glowIntensity: { value: 0.3 },
        color: { value: new THREE.Color(color) },
        opacity: { value: opacity },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
  }, [color, opacity]);

  // Calculate arc progress based on breathing phase
  const getArcProgress = () => {
    const now = Date.now() / 1000;
    const cycleTime = now % BREATH_TOTAL_CYCLE;
    const { phaseIndex, phaseProgress } = calculatePhaseInfo(cycleTime);

    let arcProgress = 0;

    switch (phaseIndex) {
      case 0: // Inhale - fill from 0 to 1
        arcProgress = phaseProgress;
        break;
      case 1: // Hold-in - stay at 1
        arcProgress = 1;
        break;
      case 2: // Exhale - empty from 1 to 0
        arcProgress = 1 - phaseProgress;
        break;
      case 3: // Hold-out - stay at 0
        arcProgress = 0;
        break;
    }

    return { arcProgress, phaseIndex };
  };

  // Animation loop
  useFrame(() => {
    if (!materialRef.current) return;

    try {
      // Get breathing state from ECS
      const breathEntity = world.queryFirst(breathPhase, phaseType);
      const phase = breathEntity?.get(breathPhase)?.value ?? 0;

      // Calculate arc progress
      const { arcProgress, phaseIndex } = getArcProgress();

      // Update uniforms
      materialRef.current.uniforms.progress.value = arcProgress;
      materialRef.current.uniforms.breathPhase.value = phase;

      // Glow intensity based on phase
      let glowIntensity = 0.3;
      if (phaseIndex === 0) {
        // Inhale - increasing glow
        glowIntensity = 0.3 + arcProgress * 0.5;
      } else if (phaseIndex === 1) {
        // Hold-in - gentle pulse
        const pulse = Math.sin(Date.now() / 400) * 0.1 + 0.1;
        glowIntensity = 0.7 + pulse;
      } else if (phaseIndex === 2) {
        // Exhale - fading glow
        glowIntensity = 0.5 * (1 - arcProgress);
      }

      materialRef.current.uniforms.glowIntensity.value = glowIntensity;
    } catch {
      // Silently catch ECS errors during unmount/remount
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
    <mesh
      geometry={geometry}
      material={material}
      rotation={[Math.PI / 2, 0, 0]}
      position={[0, yOffset, 0]}
      renderOrder={10}
    >
      <primitive object={material} ref={materialRef} attach="material" />
    </mesh>
  );
}

export default BreathingRing;
