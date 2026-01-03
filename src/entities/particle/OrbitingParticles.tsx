/**
 * OrbitingParticles - Breathing Cloud Ring
 *
 * A dramatic band of cloud-like particles orbiting the globe:
 * - Inhale: Particles gather close to globe in a tight ring
 * - Hold: Gentle drift, peaceful stillness
 * - Exhale: Particles fan out and expand in a beautiful spiral release
 *
 * Creates visual metaphor of breath as energy gathering and releasing.
 *
 * Performance: Uses InstancedMesh for single draw call
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { breathPhase, phaseType } from '../breath/traits';

/**
 * Glowing ethereal material for cloud-like particles
 */
const orbitVertexShader = `
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vNormal = normalize(normalMatrix * normal);

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

const orbitFragmentShader = `
uniform float breathPhase;
uniform float time;
uniform vec3 baseColor;
uniform float opacity;

varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vec3 viewDir = normalize(vViewPosition);

  // Strong fresnel glow for cloud-like appearance
  float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 1.5);

  // Breathing luminosity - much brighter during exhale
  float exhalePhase = 1.0 - breathPhase;
  float breathLuminosity = 1.0 + exhalePhase * 0.5;

  // Soft pulsing glow
  float pulse = sin(time * 1.5) * 0.08 + 1.0;

  // Apply base color with effects
  vec3 color = baseColor * breathLuminosity * pulse;

  // Strong white rim glow for cloud effect
  vec3 rimColor = vec3(1.0, 0.99, 0.97);
  color = mix(color, rimColor, fresnel * 0.6);

  // Inner glow during exhale - particles "light up" as they release
  float innerGlow = (1.0 - fresnel) * exhalePhase * 0.25;
  color += rimColor * innerGlow;

  // Alpha: more opaque in center, fades at edges
  float alpha = opacity * (0.6 + fresnel * 0.4);

  gl_FragColor = vec4(color, alpha);
}
`;

function createOrbitMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      breathPhase: { value: 0 },
      time: { value: 0 },
      baseColor: { value: new THREE.Color('#f5ebe0') },
      opacity: { value: 0.9 },
    },
    vertexShader: orbitVertexShader,
    fragmentShader: orbitFragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending, // Additive for glowing cloud effect
  });
}

export interface OrbitingParticlesProps {
  /**
   * Number of particles in the ring.
   * @default 80
   * @min 30
   * @max 200
   */
  count?: number;

  /**
   * Particle size (radius of spheres).
   * @default 0.12
   * @min 0.05
   * @max 0.3
   */
  particleSize?: number;

  /**
   * Ring tilt angle in degrees from horizontal.
   * @default 20
   * @min 0
   * @max 45
   */
  tiltAngle?: number;

  /**
   * Minimum orbit radius (during inhale - close to globe).
   * @default 1.8
   * @min 1.5
   * @max 2.5
   */
  minRadius?: number;

  /**
   * Maximum orbit radius (during exhale - expanded outward).
   * @default 6.0
   * @min 4.0
   * @max 10.0
   */
  maxRadius?: number;

  /**
   * Vertical spread of the band (creates thickness).
   * @default 0.8
   * @min 0.2
   * @max 2.0
   */
  bandHeight?: number;

  /**
   * Base rotation speed (radians per second).
   * @default 0.25
   * @min 0.1
   * @max 0.6
   */
  baseRotationSpeed?: number;

  /**
   * Exhale speed multiplier (rotation accelerates during exhale).
   * @default 3.0
   * @min 1.5
   * @max 5.0
   */
  exhaleSpeedMultiplier?: number;

  /**
   * Particle color (hex string).
   * @default '#f5ebe0'
   */
  color?: string;

  /**
   * Particle opacity.
   * @default 0.9
   * @min 0.5
   * @max 1.0
   */
  opacity?: number;
}

/**
 * Per-particle state for orbital animation
 */
interface ParticleState {
  /** Base angle position in ring (radians) */
  baseAngle: number;
  /** Individual orbit speed variation (-0.3 to +0.3) */
  speedOffset: number;
  /** Vertical offset within band (-1 to 1) */
  verticalOffset: number;
  /** Radial offset variation */
  radialOffset: number;
  /** Phase offset for staggered breathing */
  phaseOffset: number;
  /** Wobble animation seed */
  wobbleSeed: number;
  /** Scale variation (0.7 to 1.3) */
  scaleVariation: number;
}

// Reusable objects (avoid GC pressure)
const _tempMatrix = new THREE.Matrix4();
const _tempQuaternion = new THREE.Quaternion();
const _tempScale = new THREE.Vector3();
const _tiltQuat = new THREE.Quaternion();
const _tempPos = new THREE.Vector3();

/**
 * OrbitingParticles - Breathing cloud band around the globe
 */
export const OrbitingParticles = memo(function OrbitingParticlesComponent({
  count = 80,
  particleSize = 0.12,
  tiltAngle = 20,
  minRadius = 1.8,
  maxRadius = 6.0,
  bandHeight = 0.8,
  baseRotationSpeed = 0.25,
  exhaleSpeedMultiplier = 3.0,
  color = '#f5ebe0',
  opacity = 0.9,
}: OrbitingParticlesProps = {}) {
  const world = useWorld();
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const rotationRef = useRef(0);
  const particleStatesRef = useRef<ParticleState[]>([]);

  // Convert tilt to radians and create quaternion
  const tiltRad = (tiltAngle * Math.PI) / 180;

  // Create geometry - larger spheres for visibility
  const geometry = useMemo(() => {
    return new THREE.SphereGeometry(particleSize, 12, 8);
  }, [particleSize]);

  // Create glowing material
  const material = useMemo(() => {
    const mat = createOrbitMaterial();
    mat.uniforms.baseColor.value = new THREE.Color(color);
    mat.uniforms.opacity.value = opacity;
    return mat;
  }, [color, opacity]);

  // Initialize particle states with varied positions in band
  useEffect(() => {
    const states: ParticleState[] = [];
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < count; i++) {
      // Distribute evenly around ring using golden angle
      const baseAngle = goldenAngle * i;

      // Varied vertical position within band (gaussian-ish distribution)
      const verticalRandom = ((i * goldenRatio * 3.7) % 1) * 2 - 1;
      const verticalOffset = verticalRandom * Math.abs(verticalRandom); // Concentrate toward center

      // Radial variation for cloud-like spread
      const radialOffset = (((i * goldenRatio * 2.3) % 1) - 0.5) * 0.4;

      // Speed variation
      const speedOffset = (((i * goldenRatio) % 1) - 0.5) * 0.6;

      // Phase offset for wave effect (staggered breathing)
      const phaseOffset = ((i * goldenRatio * 1.5) % 1) * 0.15;

      // Scale variation
      const scaleVariation = 0.7 + ((i * goldenRatio * 4.1) % 1) * 0.6;

      states.push({
        baseAngle,
        speedOffset,
        verticalOffset,
        radialOffset,
        phaseOffset,
        wobbleSeed: i * 137.508,
        scaleVariation,
      });
    }
    particleStatesRef.current = states;
  }, [count]);

  // Initialize instance matrices
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    _tiltQuat.setFromAxisAngle(new THREE.Vector3(1, 0, 0), tiltRad);
    _tempQuaternion.identity();
    _tempScale.setScalar(1);

    for (let i = 0; i < count; i++) {
      const state = particleStatesRef.current[i];
      if (!state) continue;

      const radius = minRadius * (1 + state.radialOffset);
      _tempPos.set(
        Math.cos(state.baseAngle) * radius,
        state.verticalOffset * bandHeight * 0.5,
        Math.sin(state.baseAngle) * radius,
      );
      _tempPos.applyQuaternion(_tiltQuat);

      _tempScale.setScalar(state.scaleVariation);
      _tempMatrix.compose(_tempPos, _tempQuaternion, _tempScale);
      mesh.setMatrixAt(i, _tempMatrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
  }, [count, minRadius, tiltRad, bandHeight]);

  // Cleanup
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  // Animation loop
  useFrame((state, delta) => {
    const mesh = meshRef.current;
    const states = particleStatesRef.current;
    if (!mesh || states.length === 0) return;

    const clampedDelta = Math.min(delta, 0.1);
    const time = state.clock.elapsedTime;

    // Get breathing state from ECS
    let currentBreathPhase = 0;
    let currentPhaseType = 0;

    const breathEntity = world.queryFirst(breathPhase, phaseType);
    if (breathEntity) {
      currentBreathPhase = breathEntity.get(breathPhase)?.value ?? 0;
      currentPhaseType = breathEntity.get(phaseType)?.value ?? 0;
    }

    // Calculate rotation speed based on phase
    let speedMultiplier = 1.0;
    if (currentPhaseType === 2) {
      // Exhale: accelerate as breath releases
      const exhaleProgress = 1.0 - currentBreathPhase;
      speedMultiplier = 1.0 + (exhaleSpeedMultiplier - 1.0) * exhaleProgress * exhaleProgress;
    } else if (currentPhaseType === 1 || currentPhaseType === 3) {
      // Hold phases: gentle drift
      speedMultiplier = 0.4;
    } else if (currentPhaseType === 0) {
      // Inhale: slowing down as particles gather
      speedMultiplier = 0.7 + currentBreathPhase * 0.3;
    }

    // Update global rotation
    rotationRef.current += baseRotationSpeed * speedMultiplier * clampedDelta;

    // Update shader uniforms
    if (material.uniforms) {
      material.uniforms.breathPhase.value = currentBreathPhase;
      material.uniforms.time.value = time;
    }

    // Prepare tilt quaternion once
    _tiltQuat.setFromAxisAngle(new THREE.Vector3(1, 0, 0), tiltRad);

    // Base radius calculation
    // breathPhase: 1 = inhaled (contracted close), 0 = exhaled (expanded far)
    const radiusRange = maxRadius - minRadius;
    const baseRadius = maxRadius - currentBreathPhase * radiusRange;

    // Band height expands during exhale (fan out effect)
    const currentBandHeight = bandHeight * (0.5 + (1.0 - currentBreathPhase) * 1.5);

    // Update each particle
    for (let i = 0; i < count; i++) {
      const particleState = states[i];

      // Staggered breath phase for wave effect
      const staggeredPhase = Math.max(
        0,
        Math.min(1, currentBreathPhase + particleState.phaseOffset * (1 - currentBreathPhase)),
      );

      // Individual rotation with speed variation
      const individualRotation = rotationRef.current * (1 + particleState.speedOffset);
      const angle = particleState.baseAngle + individualRotation;

      // Radius with individual variation and breathing
      const particleRadius = baseRadius * (1 + particleState.radialOffset);

      // Wobble animation - more pronounced during exhale
      const wobbleIntensity = 0.1 + (1.0 - currentBreathPhase) * 0.15;
      const wobblePhase = time * 0.8 + particleState.wobbleSeed;
      const wobbleX = Math.sin(wobblePhase) * wobbleIntensity;
      const wobbleZ = Math.cos(wobblePhase * 0.7) * wobbleIntensity * 0.8;

      // Position on ring
      _tempPos.set(
        Math.cos(angle) * particleRadius + wobbleX,
        particleState.verticalOffset * currentBandHeight,
        Math.sin(angle) * particleRadius + wobbleZ,
      );

      // Apply tilt
      _tempPos.applyQuaternion(_tiltQuat);

      // Additional vertical float
      const floatOffset = Math.sin(time * 0.5 + particleState.wobbleSeed * 0.1) * 0.08;
      _tempPos.y += floatOffset;

      // Scale: larger during exhale, smaller when contracted
      const breathScale = 0.7 + (1.0 - staggeredPhase) * 0.6;
      const finalScale = particleState.scaleVariation * breathScale;
      _tempScale.setScalar(finalScale);

      // Compose and set matrix
      _tempQuaternion.identity();
      _tempMatrix.compose(_tempPos, _tempQuaternion, _tempScale);
      mesh.setMatrixAt(i, _tempMatrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, count]}
      frustumCulled={false}
      name="Orbiting Particles"
    />
  );
});

export default OrbitingParticles;
