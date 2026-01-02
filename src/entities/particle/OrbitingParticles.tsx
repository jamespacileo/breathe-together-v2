/**
 * OrbitingParticles - Fibonacci Orbit Ring (Breathing Sash)
 *
 * A tilted ring of particles that orbits the globe, breathing in sync:
 * - Inhale: Ring contracts close to globe, slow rotation
 * - Hold: Gentle drift, peaceful stillness
 * - Exhale: Ring expands outward with accelerating spiral rotation
 *
 * Creates visual metaphor of breath as energy gathering and releasing.
 *
 * Performance: Uses InstancedMesh for single draw call
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { breathPhase, orbitRadius, phaseType } from '../breath/traits';

/**
 * Soft ethereal material for orbiting particles
 * Lighter and more translucent than main ParticleSwarm shards
 */
const orbitVertexShader = `
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vNormal = normalize(normalMatrix * normal);

  #ifdef USE_INSTANCING_COLOR
    // Instance color passed to fragment
  #endif

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

  // Soft fresnel glow - more pronounced for ethereal look
  float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 2.0);

  // Breathing luminosity - brighter during exhale (release)
  float exhalePhase = 1.0 - breathPhase;
  float breathLuminosity = 1.0 + exhalePhase * 0.3;

  // Soft pulsing glow synced to time
  float pulse = sin(time * 2.0) * 0.05 + 1.0;

  // Apply base color with effects
  vec3 color = baseColor * breathLuminosity * pulse;

  // Add soft white rim glow
  vec3 rimColor = vec3(1.0, 0.98, 0.95);
  color = mix(color, rimColor, fresnel * 0.4);

  // Soft inner glow during exhale
  float innerGlow = (1.0 - fresnel) * exhalePhase * 0.15;
  color += rimColor * innerGlow;

  // Final alpha with fresnel edge fade
  float alpha = opacity * (0.7 + fresnel * 0.3);

  gl_FragColor = vec4(color, alpha);
}
`;

function createOrbitMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      breathPhase: { value: 0 },
      time: { value: 0 },
      baseColor: { value: new THREE.Color('#e8dcd0') }, // Soft warm white
      opacity: { value: 0.85 },
    },
    vertexShader: orbitVertexShader,
    fragmentShader: orbitFragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false, // Proper transparency sorting
    blending: THREE.NormalBlending,
  });
}

/**
 * Get position on tilted ring using Fibonacci distribution
 *
 * @param index - Particle index (0 to count-1)
 * @param count - Total particles in ring
 * @param radius - Ring radius from center
 * @param tiltAngle - Ring tilt in radians (0 = horizontal, PI/2 = vertical)
 * @param rotationOffset - Additional rotation around Y axis
 */
function getRingPosition(
  index: number,
  count: number,
  radius: number,
  tiltAngle: number,
  rotationOffset: number,
): THREE.Vector3 {
  // Golden angle distribution around ring
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const angle = goldenAngle * index + rotationOffset;

  // Position on horizontal ring
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  const y = 0;

  // Create position vector
  const pos = new THREE.Vector3(x, y, z);

  // Rotate around X axis to tilt the ring
  const tiltQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), tiltAngle);
  pos.applyQuaternion(tiltQuat);

  return pos;
}

export interface OrbitingParticlesProps {
  /**
   * Number of particles in the ring.
   * @default 60
   * @min 20
   * @max 200
   */
  count?: number;

  /**
   * Particle size (radius of spheres).
   * @default 0.08
   * @min 0.02
   * @max 0.2
   */
  particleSize?: number;

  /**
   * Ring tilt angle in degrees from horizontal.
   * @default 25
   * @min 0
   * @max 45
   */
  tiltAngle?: number;

  /**
   * Minimum orbit radius (during inhale).
   * @default 2.2
   * @min 1.5
   * @max 3.0
   */
  minRadius?: number;

  /**
   * Maximum orbit radius (during exhale).
   * @default 5.5
   * @min 4.0
   * @max 8.0
   */
  maxRadius?: number;

  /**
   * Base rotation speed (radians per second).
   * @default 0.15
   * @min 0.05
   * @max 0.5
   */
  baseRotationSpeed?: number;

  /**
   * Exhale speed multiplier (rotation accelerates during exhale).
   * @default 2.5
   * @min 1.0
   * @max 5.0
   */
  exhaleSpeedMultiplier?: number;

  /**
   * Particle color (hex string).
   * @default '#e8dcd0'
   */
  color?: string;

  /**
   * Particle opacity.
   * @default 0.85
   * @min 0.3
   * @max 1.0
   */
  opacity?: number;
}

/**
 * Per-particle state for orbital animation
 */
interface ParticleState {
  /** Individual orbit speed variation */
  speedOffset: number;
  /** Phase offset for wave effect */
  phaseOffset: number;
  /** Perpendicular wobble seed */
  wobbleSeed: number;
  /** Y-axis vertical drift seed */
  verticalSeed: number;
}

// Reusable objects (avoid GC pressure)
const _tempMatrix = new THREE.Matrix4();
const _tempPosition = new THREE.Vector3();
const _tempQuaternion = new THREE.Quaternion();
const _tempScale = new THREE.Vector3();

/**
 * OrbitingParticles - Breathing ring of particles around the globe
 */
export const OrbitingParticles = memo(function OrbitingParticlesComponent({
  count = 60,
  particleSize = 0.08,
  tiltAngle = 25,
  minRadius = 2.2,
  maxRadius = 5.5,
  baseRotationSpeed = 0.15,
  exhaleSpeedMultiplier = 2.5,
  color = '#e8dcd0',
  opacity = 0.85,
}: OrbitingParticlesProps = {}) {
  const world = useWorld();
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const rotationRef = useRef(0);
  const particleStatesRef = useRef<ParticleState[]>([]);

  // Convert tilt to radians
  const tiltRad = (tiltAngle * Math.PI) / 180;

  // Create geometry (small spheres for soft look)
  const geometry = useMemo(() => {
    return new THREE.SphereGeometry(particleSize, 8, 6);
  }, [particleSize]);

  // Create material
  const material = useMemo(() => {
    const mat = createOrbitMaterial();
    mat.uniforms.baseColor.value = new THREE.Color(color);
    mat.uniforms.opacity.value = opacity;
    return mat;
  }, [color, opacity]);

  // Initialize particle states
  useEffect(() => {
    const states: ParticleState[] = [];
    const goldenRatio = (1 + Math.sqrt(5)) / 2;

    for (let i = 0; i < count; i++) {
      states.push({
        speedOffset: (((i * goldenRatio) % 1) - 0.5) * 0.3, // ±15% speed variation
        phaseOffset: ((i * goldenRatio) % 1) * 0.08, // ±4% phase offset
        wobbleSeed: i * 137.508,
        verticalSeed: i * Math.E,
      });
    }
    particleStatesRef.current = states;
  }, [count]);

  // Initialize instance matrices
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    _tempQuaternion.identity();
    _tempScale.setScalar(1);

    for (let i = 0; i < count; i++) {
      const pos = getRingPosition(i, count, minRadius, tiltRad, 0);
      _tempMatrix.compose(pos, _tempQuaternion, _tempScale);
      mesh.setMatrixAt(i, _tempMatrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
  }, [count, minRadius, tiltRad]);

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

    const breathEntity = world.queryFirst(breathPhase, orbitRadius, phaseType);
    if (breathEntity) {
      currentBreathPhase = breathEntity.get(breathPhase)?.value ?? 0;
      currentPhaseType = breathEntity.get(phaseType)?.value ?? 0;
    }

    // Calculate current radius (inverted: contracts on inhale, expands on exhale)
    // breathPhase: 0 = exhaled (expanded), 1 = inhaled (contracted)
    const radiusRange = maxRadius - minRadius;
    const currentRadius = maxRadius - currentBreathPhase * radiusRange;

    // Calculate rotation speed based on phase
    // Exhale (phaseType 2) = faster rotation for "release" feeling
    // Hold phases = slower, peaceful drift
    let speedMultiplier = 1.0;
    if (currentPhaseType === 2) {
      // Exhale: accelerate based on how far into exhale we are
      const exhaleProgress = 1.0 - currentBreathPhase;
      speedMultiplier = 1.0 + (exhaleSpeedMultiplier - 1.0) * exhaleProgress;
    } else if (currentPhaseType === 1 || currentPhaseType === 3) {
      // Hold phases: slow down for peaceful stillness
      speedMultiplier = 0.5;
    }

    // Update global rotation
    rotationRef.current += baseRotationSpeed * speedMultiplier * clampedDelta;

    // Update shader uniforms
    if (material.uniforms) {
      material.uniforms.breathPhase.value = currentBreathPhase;
      material.uniforms.time.value = time;
    }

    // Update each particle
    for (let i = 0; i < count; i++) {
      const particleState = states[i];

      // Individual speed with variation
      const individualRotation = rotationRef.current * (1 + particleState.speedOffset);

      // Get base ring position
      const pos = getRingPosition(i, count, currentRadius, tiltRad, individualRotation);

      // Add subtle perpendicular wobble
      const wobblePhase = time * 0.5 + particleState.wobbleSeed;
      const wobbleAmount = 0.05 + currentBreathPhase * 0.03; // Less wobble when contracted
      pos.x += Math.sin(wobblePhase) * wobbleAmount;
      pos.z += Math.cos(wobblePhase * 0.7) * wobbleAmount * 0.8;

      // Subtle vertical breathing motion
      const verticalPhase = time * 0.3 + particleState.verticalSeed;
      pos.y += Math.sin(verticalPhase) * 0.03;

      // Scale variation based on breathing (slightly larger during exhale)
      const breathScale = 1.0 + (1.0 - currentBreathPhase) * 0.15;
      _tempScale.setScalar(breathScale);

      // Compose matrix
      _tempQuaternion.identity();
      _tempMatrix.compose(pos, _tempQuaternion, _tempScale);
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
