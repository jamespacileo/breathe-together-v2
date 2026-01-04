/**
 * PresenceConstellation - User count as constellation of stars
 *
 * Represents the number of users breathing together as tiny glowing
 * dots arranged in a constellation pattern around the globe.
 *
 * Features:
 * - Each user = one star point
 * - Fibonacci sphere distribution for even coverage
 * - Subtle drift animation
 * - Breath-synchronized pulse
 * - Warm peach color matching atmosphere
 */

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { BREATH_PHASES, BREATH_TOTAL_CYCLE } from '../../constants';

interface PresenceConstellationProps {
  /** Number of users to display @default 42 */
  count?: number;
  /** Globe radius for positioning @default 1.5 */
  globeRadius?: number;
  /** Shell radius offset @default 0.8 */
  shellOffset?: number;
  /** Point size @default 0.02 */
  pointSize?: number;
  /** Color @default '#f8d0a8' */
  color?: string;
  /** Override breath phase for testing (0-1) */
  testBreathPhase?: number;
  /** Whether to use test values */
  useTestValues?: boolean;
}

/**
 * Generate Fibonacci sphere points for even distribution
 */
function generateFibonacciSphere(count: number, radius: number): Float32Array {
  const positions = new Float32Array(count * 3);
  const goldenRatio = (1 + Math.sqrt(5)) / 2;
  const angleIncrement = Math.PI * 2 * goldenRatio;

  for (let i = 0; i < count; i++) {
    const t = i / count;
    const inclination = Math.acos(1 - 2 * t);
    const azimuth = angleIncrement * i;

    const x = Math.sin(inclination) * Math.cos(azimuth) * radius;
    const y = Math.sin(inclination) * Math.sin(azimuth) * radius;
    const z = Math.cos(inclination) * radius;

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }

  return positions;
}

/**
 * Create shader material for constellation points
 */
function createConstellationMaterial(color: string) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uTime: { value: 0 },
      uBreathPhase: { value: 0 },
      uPointSize: { value: 3.0 },
    },
    vertexShader: `
      uniform float uTime;
      uniform float uBreathPhase;
      uniform float uPointSize;

      attribute float aOffset;

      varying float vAlpha;

      void main() {
        // Subtle drift based on individual offset
        float drift = sin(uTime * 0.5 + aOffset * 6.28) * 0.02;
        vec3 pos = position + normalize(position) * drift;

        // Breath-synchronized radial pulse
        float breathPulse = sin(uBreathPhase * 3.14159) * 0.05;
        pos += normalize(position) * breathPulse;

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;

        // Size attenuation
        gl_PointSize = uPointSize * (300.0 / -mvPosition.z);

        // Alpha varies with breath
        vAlpha = 0.6 + 0.4 * sin(uBreathPhase * 3.14159 + aOffset * 3.14159);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;

      varying float vAlpha;

      void main() {
        // Circular point with soft edge
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);
        float alpha = 1.0 - smoothstep(0.3, 0.5, dist);

        // Glow effect
        float glow = exp(-dist * 4.0) * 0.5;

        gl_FragColor = vec4(uColor, (alpha + glow) * vAlpha);
      }
    `,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

export function PresenceConstellation({
  count = 42,
  globeRadius = 1.5,
  shellOffset = 0.8,
  pointSize = 0.02,
  color = '#f8d0a8',
  testBreathPhase,
  useTestValues = false,
}: PresenceConstellationProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Cap count at reasonable maximum
  const actualCount = Math.min(Math.max(count, 1), 200);
  const radius = globeRadius + shellOffset;

  // Generate geometry
  const { geometry, material } = useMemo(() => {
    const positions = generateFibonacciSphere(actualCount, radius);

    // Random offset for each point (for variation)
    const offsets = new Float32Array(actualCount);
    for (let i = 0; i < actualCount; i++) {
      offsets[i] = Math.random();
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aOffset', new THREE.BufferAttribute(offsets, 1));

    const mat = createConstellationMaterial(color);
    mat.uniforms.uPointSize.value = pointSize * 100;

    return { geometry: geo, material: mat };
  }, [actualCount, radius, color, pointSize]);

  // Cleanup
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  // Animation
  useFrame((state) => {
    if (!materialRef.current) return;

    const mat = materialRef.current;
    mat.uniforms.uTime.value = state.clock.elapsedTime;

    if (useTestValues) {
      mat.uniforms.uBreathPhase.value = testBreathPhase ?? 0;
    } else {
      // Calculate breath phase from UTC
      const now = Date.now() / 1000;
      const cycleTime = now % BREATH_TOTAL_CYCLE;

      // Convert to 0-1 breath phase (inhale peaks at 1, exhale at 0)
      let breathPhase = 0;
      if (cycleTime < BREATH_PHASES.INHALE) {
        breathPhase = cycleTime / BREATH_PHASES.INHALE;
      } else if (cycleTime < BREATH_PHASES.INHALE + BREATH_PHASES.HOLD_IN) {
        breathPhase = 1;
      } else {
        const exhaleProgress =
          (cycleTime - BREATH_PHASES.INHALE - BREATH_PHASES.HOLD_IN) / BREATH_PHASES.EXHALE;
        breathPhase = 1 - exhaleProgress;
      }

      mat.uniforms.uBreathPhase.value = breathPhase;
    }
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <primitive object={material} ref={materialRef} attach="material" />
    </points>
  );
}
