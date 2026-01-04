/**
 * BreathingProgressRing - Holographic torus ring showing breathing progress
 *
 * A glowing ring around the globe that fills/empties with the breathing cycle.
 * Acts as the primary visual feedback for breathing progress.
 *
 * Features:
 * - Circular progress indicator as 3D geometry
 * - Phase-specific colors (gold=inhale, teal=hold, rose=exhale)
 * - Fresnel edge glow for holographic effect
 * - Breath-synchronized via ECS breathPhase trait
 */

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { BREATH_PHASES, BREATH_TOTAL_CYCLE } from '../../constants';

// Phase colors matching Monument Valley palette
const PHASE_COLORS = {
  inhale: new THREE.Color('#c9a06c'), // Warm gold
  holdIn: new THREE.Color('#7ec5c4'), // Soft teal
  exhale: new THREE.Color('#d4a0a0'), // Warm rose
  holdOut: new THREE.Color('#a89888'), // Muted gray
};

interface BreathingProgressRingProps {
  /** Globe radius for positioning @default 1.5 */
  globeRadius?: number;
  /** Ring thickness @default 0.015 */
  thickness?: number;
  /** Ring tube radius @default 0.008 */
  tubeRadius?: number;
  /** Height offset from equator @default 0 */
  heightOffset?: number;
  /** Base opacity @default 0.85 */
  opacity?: number;
  /** Override progress for testing (0-1) */
  testProgress?: number;
  /** Override phase type for testing (0-3) */
  testPhaseType?: number;
  /** Whether to use test values instead of ECS */
  useTestValues?: boolean;
}

/**
 * Shader material for the progress ring with Fresnel glow
 */
function createProgressRingMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0 },
      uPhaseProgress: { value: 0 },
      uColor: { value: PHASE_COLORS.inhale },
      uNextColor: { value: PHASE_COLORS.holdIn },
      uOpacity: { value: 0.85 },
      uTime: { value: 0 },
      uFresnelPower: { value: 2.5 },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      varying float vAngle;

      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;

        // Calculate angle around the ring (0 to 2PI)
        vAngle = atan(position.x, position.z) + 3.14159265;

        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform float uProgress;
      uniform float uPhaseProgress;
      uniform vec3 uColor;
      uniform vec3 uNextColor;
      uniform float uOpacity;
      uniform float uTime;
      uniform float uFresnelPower;

      varying vec3 vNormal;
      varying vec3 vViewPosition;
      varying float vAngle;

      void main() {
        // Fresnel effect for edge glow
        vec3 viewDir = normalize(vViewPosition);
        float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), uFresnelPower);

        // Calculate if this fragment is in the "filled" portion
        float normalizedAngle = vAngle / (2.0 * 3.14159265);
        float filled = step(normalizedAngle, uProgress);

        // Smooth edge at progress boundary
        float edgeSoftness = 0.02;
        float edgeGlow = 1.0 - smoothstep(uProgress - edgeSoftness, uProgress, normalizedAngle);
        edgeGlow *= smoothstep(uProgress - edgeSoftness * 3.0, uProgress - edgeSoftness, normalizedAngle);

        // Color interpolation between current and next phase
        vec3 baseColor = mix(uColor, uNextColor, uPhaseProgress * 0.3);

        // Filled portion is bright, unfilled is dim
        float brightness = mix(0.15, 1.0, filled);
        brightness += edgeGlow * 0.5; // Extra glow at leading edge

        // Subtle pulse animation
        float pulse = 0.95 + 0.05 * sin(uTime * 2.0);

        // Combine base color with fresnel glow
        vec3 glowColor = baseColor * 1.5;
        vec3 finalColor = mix(baseColor, glowColor, fresnel * 0.6) * brightness * pulse;

        // Final opacity with fresnel boost
        float alpha = (uOpacity + fresnel * 0.2) * (0.3 + brightness * 0.7);

        gl_FragColor = vec4(finalColor, alpha);
      }
    `,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/**
 * Calculate overall progress through the 19-second breathing cycle
 */
function calculateCycleProgress(phaseTypeValue: number, phaseProgress: number): number {
  const phaseDurations = [
    BREATH_PHASES.INHALE,
    BREATH_PHASES.HOLD_IN,
    BREATH_PHASES.EXHALE,
    BREATH_PHASES.HOLD_OUT,
  ];

  let elapsed = 0;
  for (let i = 0; i < phaseTypeValue; i++) {
    elapsed += phaseDurations[i];
  }
  elapsed += phaseProgress * phaseDurations[phaseTypeValue];

  return elapsed / BREATH_TOTAL_CYCLE;
}

export function BreathingProgressRing({
  globeRadius = 1.5,
  thickness = 0.015,
  tubeRadius = 0.008,
  heightOffset = 0,
  opacity = 0.85,
  testProgress,
  testPhaseType,
  useTestValues = false,
}: BreathingProgressRingProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  // Create geometry and material
  const geometry = useMemo(() => {
    return new THREE.TorusGeometry(globeRadius + thickness, tubeRadius, 16, 128);
  }, [globeRadius, thickness, tubeRadius]);

  const material = useMemo(() => createProgressRingMaterial(), []);

  // Cleanup on unmount
  // biome-ignore lint/correctness/useExhaustiveDependencies: cleanup runs once on unmount
  useMemo(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, []);

  useFrame((state, _delta) => {
    if (!materialRef.current) return;

    const mat = materialRef.current;
    mat.uniforms.uTime.value = state.clock.elapsedTime;
    mat.uniforms.uOpacity.value = opacity;

    let currentPhaseType = 0;
    let phaseProgress = 0;
    let cycleProgress = 0;

    if (useTestValues) {
      // Use test values for deterministic testing
      currentPhaseType = testPhaseType ?? 0;
      phaseProgress = testProgress ?? 0;
      cycleProgress = calculateCycleProgress(currentPhaseType, phaseProgress);
    } else {
      // Calculate from UTC time (globally synchronized)
      const now = Date.now() / 1000;
      const cycleTime = now % BREATH_TOTAL_CYCLE;
      cycleProgress = cycleTime / BREATH_TOTAL_CYCLE;

      // Determine phase
      if (cycleTime < BREATH_PHASES.INHALE) {
        currentPhaseType = 0;
        phaseProgress = cycleTime / BREATH_PHASES.INHALE;
      } else if (cycleTime < BREATH_PHASES.INHALE + BREATH_PHASES.HOLD_IN) {
        currentPhaseType = 1;
        phaseProgress = (cycleTime - BREATH_PHASES.INHALE) / BREATH_PHASES.HOLD_IN;
      } else {
        currentPhaseType = 2;
        phaseProgress =
          (cycleTime - BREATH_PHASES.INHALE - BREATH_PHASES.HOLD_IN) / BREATH_PHASES.EXHALE;
      }
    }

    // Update progress uniform
    mat.uniforms.uProgress.value = cycleProgress;
    mat.uniforms.uPhaseProgress.value = phaseProgress;

    // Update colors based on phase
    const phaseColors = [
      PHASE_COLORS.inhale,
      PHASE_COLORS.holdIn,
      PHASE_COLORS.exhale,
      PHASE_COLORS.holdOut,
    ];
    const nextPhaseColors = [
      PHASE_COLORS.holdIn,
      PHASE_COLORS.exhale,
      PHASE_COLORS.holdOut,
      PHASE_COLORS.inhale,
    ];

    mat.uniforms.uColor.value = phaseColors[currentPhaseType];
    mat.uniforms.uNextColor.value = nextPhaseColors[currentPhaseType];
  });

  return (
    <group>
      {/* Debug: Simple visible torus */}
      <mesh position={[0, heightOffset, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[globeRadius + thickness, tubeRadius * 3, 16, 64]} />
        <meshBasicMaterial color="#c9a06c" transparent opacity={0.8} />
      </mesh>

      {/* Original shader-based ring (may have issues) */}
      <mesh
        ref={ringRef}
        geometry={geometry}
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, heightOffset, 0]}
      >
        <primitive object={material} ref={materialRef} attach="material" />
      </mesh>
    </group>
  );
}
