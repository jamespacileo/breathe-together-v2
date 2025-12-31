/**
 * BreathingFlowParticles - Radial flow particles synchronized to breathing
 *
 * Creates a sense of fluid/air motion by drifting particles:
 * - Inward toward center during inhale
 * - Outward from center during exhale
 * - Gentle ambient drift during hold phases
 *
 * Uses THREE.Points with custom shader for maximum performance:
 * - Single draw call for all particles
 * - GPU-computed positions and sizes
 * - Minimal CPU overhead (~0.1ms per frame)
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { breathPhase, phaseType } from '../breath/traits';

export interface BreathingFlowParticlesProps {
  /**
   * Number of flow particles.
   *
   * **When to adjust:** Higher for more visible flow, lower for subtlety
   * **Typical range:** Subtle (50) → Moderate (150) → Dense (300)
   * **Performance note:** Linear impact; single draw call regardless of count
   *
   * @default 150
   * @min 20
   * @max 500
   */
  count?: number;

  /**
   * Inner radius boundary (closest to center).
   *
   * **When to adjust:** Match to globe/core radius
   *
   * @default 2.0
   * @min 0.5
   * @max 5
   */
  innerRadius?: number;

  /**
   * Outer radius boundary (farthest from center).
   *
   * **When to adjust:** Extend for wider breathing field
   *
   * @default 8.0
   * @min 3
   * @max 15
   */
  outerRadius?: number;

  /**
   * Base particle size.
   *
   * @default 0.04
   * @min 0.01
   * @max 0.2
   */
  particleSize?: number;

  /**
   * Flow speed multiplier.
   *
   * **When to adjust:** Higher for more dramatic flow, lower for subtle
   * **Typical range:** Subtle (0.3) → Standard (0.6) → Fast (1.0)
   *
   * @default 0.6
   * @min 0.1
   * @max 2.0
   */
  flowSpeed?: number;

  /**
   * Base opacity of particles.
   *
   * @default 0.15
   * @min 0
   * @max 1
   */
  opacity?: number;

  /**
   * Particle color (hex string).
   *
   * @default "#ffffff"
   */
  color?: string;
}

// Vertex shader - handles position and size
const vertexShader = /* glsl */ `
  attribute float aRadius;
  attribute float aAngle;
  attribute float aSpeed;
  attribute float aPhaseOffset;

  uniform float uTime;
  uniform float uBreathPhase;
  uniform float uFlowDirection; // -1 = inward, 0 = hold, 1 = outward
  uniform float uFlowSpeed;
  uniform float uInnerRadius;
  uniform float uOuterRadius;
  uniform float uSize;

  varying float vOpacity;

  void main() {
    // Calculate radial position with flow
    float radiusRange = uOuterRadius - uInnerRadius;
    float flowOffset = uFlowDirection * uFlowSpeed * uTime * aSpeed;

    // Wrap radius within bounds (creates continuous flow illusion)
    float radius = aRadius + flowOffset;
    radius = mod(radius - uInnerRadius, radiusRange) + uInnerRadius;

    // Add subtle breathing pulse to radius
    float breathPulse = sin(uBreathPhase * 3.14159) * 0.15;
    radius += breathPulse * (aSpeed - 0.5);

    // Spherical to cartesian conversion
    float phi = aAngle;
    float theta = aPhaseOffset * 3.14159 * 2.0;

    // Add gentle orbital drift
    phi += uTime * 0.1 * aSpeed;
    theta += uTime * 0.05 * (1.0 - aSpeed);

    vec3 pos;
    pos.x = radius * sin(phi) * cos(theta);
    pos.y = radius * cos(phi);
    pos.z = radius * sin(phi) * sin(theta);

    // Add subtle noise-based displacement for organic feel
    float noise = sin(uTime * 2.0 + aRadius * 10.0) * 0.05;
    pos += normalize(pos) * noise;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Size attenuation (closer = larger)
    float sizeAttenuation = 300.0 / -mvPosition.z;
    gl_PointSize = uSize * sizeAttenuation * (0.8 + aSpeed * 0.4);

    // Fade at boundaries for smooth appearance/disappearance
    float distFromCenter = (radius - uInnerRadius) / radiusRange;
    float edgeFade = smoothstep(0.0, 0.15, distFromCenter) * smoothstep(1.0, 0.85, distFromCenter);

    // Breathing-synchronized opacity
    float breathOpacity = 0.7 + uBreathPhase * 0.3;
    vOpacity = edgeFade * breathOpacity * (0.6 + aSpeed * 0.4);
  }
`;

// Fragment shader - soft circular particles
const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;

  varying float vOpacity;

  void main() {
    // Soft circular particle with gradient falloff
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;

    // Soft edge with exponential falloff
    float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
    alpha = pow(alpha, 1.5); // Softer falloff

    gl_FragColor = vec4(uColor, alpha * uOpacity * vOpacity);
  }
`;

/**
 * BreathingFlowParticles - Creates sense of air/fluid motion with breathing
 *
 * Particles flow inward during inhale, outward during exhale, creating
 * a visceral sense of breathing motion. Uses GPU-based animation for
 * minimal CPU overhead.
 */
export const BreathingFlowParticles = memo(function BreathingFlowParticlesComponent({
  count = 150,
  innerRadius = 2.0,
  outerRadius = 8.0,
  particleSize = 0.04,
  flowSpeed = 0.6,
  opacity = 0.15,
  color = '#ffffff',
}: BreathingFlowParticlesProps = {}) {
  const pointsRef = useRef<THREE.Points>(null);
  const world = useWorld();

  // Create geometry with particle attributes
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();

    // Position attributes (will be computed in shader, but need initial values)
    const positions = new Float32Array(count * 3);
    const radii = new Float32Array(count);
    const angles = new Float32Array(count);
    const speeds = new Float32Array(count);
    const phaseOffsets = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Distribute particles across the radial range
      const radius = innerRadius + Math.random() * (outerRadius - innerRadius);
      const phi = Math.acos(2 * Math.random() - 1); // Uniform spherical distribution
      const theta = Math.random() * Math.PI * 2;

      // Initial cartesian position
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

      // Per-particle attributes
      radii[i] = radius;
      angles[i] = phi;
      speeds[i] = 0.3 + Math.random() * 0.7; // Varied speeds for organic feel
      phaseOffsets[i] = Math.random(); // Random orbital phase
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aRadius', new THREE.BufferAttribute(radii, 1));
    geo.setAttribute('aAngle', new THREE.BufferAttribute(angles, 1));
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
    geo.setAttribute('aPhaseOffset', new THREE.BufferAttribute(phaseOffsets, 1));

    return geo;
  }, [count, innerRadius, outerRadius]);

  // Create shader material
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uBreathPhase: { value: 0 },
        uFlowDirection: { value: 0 },
        uFlowSpeed: { value: flowSpeed },
        uInnerRadius: { value: innerRadius },
        uOuterRadius: { value: outerRadius },
        uSize: { value: particleSize * 100 },
        uColor: { value: new THREE.Color(color) },
        uOpacity: { value: opacity },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, [flowSpeed, innerRadius, outerRadius, particleSize, color, opacity]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  // Animation loop - update uniforms based on breath state
  useFrame((state) => {
    if (!pointsRef.current) return;

    const mat = pointsRef.current.material as THREE.ShaderMaterial;

    // Update time uniform
    mat.uniforms.uTime.value = state.clock.elapsedTime;

    // Get breath state from ECS
    try {
      const breathEntity = world.queryFirst(breathPhase);
      if (breathEntity) {
        const phase = breathEntity.get(breathPhase)?.value ?? 0;
        const currentPhaseType = breathEntity.get(phaseType)?.value ?? 0;

        mat.uniforms.uBreathPhase.value = phase;

        // Set flow direction based on phase:
        // 0 = inhale: particles flow INWARD (-1)
        // 1 = hold-in: subtle drift (0)
        // 2 = exhale: particles flow OUTWARD (+1)
        // 3 = hold-out: subtle drift (0)
        let flowDir = 0;
        if (currentPhaseType === 0) {
          flowDir = -1; // Inhale - flow inward
        } else if (currentPhaseType === 2) {
          flowDir = 1; // Exhale - flow outward
        }
        mat.uniforms.uFlowDirection.value = flowDir;
      }
    } catch (_e) {
      // Silently catch ECS errors during unmount/remount in Triplex
    }
  });

  return <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} />;
});

export default BreathingFlowParticles;
