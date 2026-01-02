/**
 * PhaseTransitionPulse - Visual ripple effect on breath phase transitions
 *
 * Inspired by music visualizer beat detection effects. When the breath phase
 * transitions (inhale→hold, hold→exhale, exhale→inhale), emits a beautiful
 * ripple wave that propagates outward from the center.
 *
 * Each phase transition has a distinct color:
 * - Inhale→Hold: Golden pulse (gathering energy)
 * - Hold→Exhale: Soft teal release wave (letting go)
 * - Exhale→Inhale: Warm rose renewal shimmer (fresh start)
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { phaseType } from '../breath/traits';

// Ripple vertex shader
const rippleVertexShader = `
varying vec2 vUv;
varying vec3 vPosition;

void main() {
  vUv = uv;
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Ripple fragment shader - creates expanding ring effect
const rippleFragmentShader = `
uniform float time;
uniform float rippleProgress;
uniform vec3 rippleColor;
uniform float rippleIntensity;

varying vec2 vUv;
varying vec3 vPosition;

void main() {
  // Calculate distance from center in 3D space (using xz plane for horizontal ring)
  float dist = length(vPosition.xz);

  // Ring parameters
  float ringRadius = rippleProgress * 8.0; // Expands outward
  float ringWidth = 0.3 + rippleProgress * 0.5; // Ring gets thicker as it expands

  // Smooth ring shape
  float ring = smoothstep(ringRadius - ringWidth, ringRadius, dist)
             - smoothstep(ringRadius, ringRadius + ringWidth, dist);

  // Fade out as it expands
  float fade = 1.0 - rippleProgress;
  fade = fade * fade; // Quadratic falloff

  // Add some wave distortion for organic feel
  float wave = sin(dist * 10.0 - time * 5.0) * 0.15 + 0.85;

  // Final alpha
  float alpha = ring * fade * rippleIntensity * wave;

  // Fresnel-like edge glow
  float edgeGlow = pow(ring, 2.0) * 0.3;
  vec3 finalColor = rippleColor + vec3(edgeGlow);

  gl_FragColor = vec4(finalColor, alpha);
}
`;

// Phase transition colors (Monument Valley palette)
const TRANSITION_COLORS = {
  inhaleToHold: new THREE.Color('#ffbe0b'), // Golden - energy gathered
  holdToExhale: new THREE.Color('#06d6a0'), // Teal - letting go
  exhaleToInhale: new THREE.Color('#ef476f'), // Rose - renewal
  holdOutToInhale: new THREE.Color('#118ab2'), // Blue - peaceful reset
};

interface RippleState {
  active: boolean;
  progress: number;
  color: THREE.Color;
  intensity: number;
}

interface PhaseTransitionPulseProps {
  /** Enable the effect @default true */
  enabled?: boolean;
  /** Base intensity of ripples @default 0.6 */
  intensity?: number;
  /** Duration of ripple animation in seconds @default 1.5 */
  duration?: number;
}

export function PhaseTransitionPulse({
  enabled = true,
  intensity = 0.6,
  duration = 1.5,
}: PhaseTransitionPulseProps) {
  const world = useWorld();
  const meshRef = useRef<THREE.Mesh>(null);
  const prevPhaseTypeRef = useRef<number>(-1);
  const rippleStateRef = useRef<RippleState>({
    active: false,
    progress: 0,
    color: TRANSITION_COLORS.inhaleToHold,
    intensity: 0,
  });

  // Create shader material
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          rippleProgress: { value: 0 },
          rippleColor: { value: TRANSITION_COLORS.inhaleToHold },
          rippleIntensity: { value: 0 },
        },
        vertexShader: rippleVertexShader,
        fragmentShader: rippleFragmentShader,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );

  // Create geometry - large horizontal plane
  const geometry = useMemo(() => new THREE.PlaneGeometry(20, 20, 64, 64), []);

  // Cleanup
  useEffect(() => {
    return () => {
      material.dispose();
      geometry.dispose();
    };
  }, [material, geometry]);

  // Animation loop
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Phase transition detection requires multiple conditional checks for each transition type - refactoring would reduce readability
  useFrame((state, delta) => {
    if (!enabled || !meshRef.current) return;

    const clampedDelta = Math.min(delta, 0.1);
    const time = state.clock.elapsedTime;
    const ripple = rippleStateRef.current;

    // Get current phase type from ECS
    let currentPhaseType = 0;
    try {
      const breathEntity = world.queryFirst(phaseType);
      if (breathEntity) {
        currentPhaseType = breathEntity.get(phaseType)?.value ?? 0;
      }
    } catch {
      // Ignore ECS errors during unmount
    }

    // Detect phase transition
    if (prevPhaseTypeRef.current !== -1 && prevPhaseTypeRef.current !== currentPhaseType) {
      // Start new ripple
      ripple.active = true;
      ripple.progress = 0;
      ripple.intensity = intensity;

      // Set color based on transition type
      const prevPhase = prevPhaseTypeRef.current;
      const newPhase = currentPhaseType;

      if (prevPhase === 0 && newPhase === 1) {
        // Inhale → Hold-in
        ripple.color = TRANSITION_COLORS.inhaleToHold;
      } else if (prevPhase === 1 && newPhase === 2) {
        // Hold-in → Exhale
        ripple.color = TRANSITION_COLORS.holdToExhale;
      } else if (prevPhase === 2 && newPhase === 0) {
        // Exhale → Inhale (no hold-out in 4-7-8)
        ripple.color = TRANSITION_COLORS.exhaleToInhale;
      } else if (prevPhase === 2 && newPhase === 3) {
        // Exhale → Hold-out (if present)
        ripple.color = TRANSITION_COLORS.holdToExhale;
      } else if (prevPhase === 3 && newPhase === 0) {
        // Hold-out → Inhale
        ripple.color = TRANSITION_COLORS.holdOutToInhale;
      }
    }
    prevPhaseTypeRef.current = currentPhaseType;

    // Animate active ripple
    if (ripple.active) {
      ripple.progress += clampedDelta / duration;

      if (ripple.progress >= 1) {
        ripple.active = false;
        ripple.progress = 0;
        ripple.intensity = 0;
      }
    }

    // Update shader uniforms
    material.uniforms.time.value = time;
    material.uniforms.rippleProgress.value = ripple.progress;
    material.uniforms.rippleColor.value = ripple.color;
    material.uniforms.rippleIntensity.value = ripple.active ? ripple.intensity : 0;
  });

  if (!enabled) return null;

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.5, 0]}
      frustumCulled={false}
    />
  );
}

export default PhaseTransitionPulse;
