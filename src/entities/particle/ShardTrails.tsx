/**
 * ShardTrails - Ethereal motion trails for particle shards
 *
 * Creates soft, fading trails behind each shard that respond to breathing motion.
 * Trails are more prominent during exhale (expansion) when movement is most visible,
 * and fade during inhale (contraction) and hold phases.
 *
 * Implementation:
 * - Position history ring buffer per particle (configurable length)
 * - Uses THREE.Line with BufferGeometry for efficient rendering
 * - Custom shader material with additive blending for ethereal glow
 * - Alpha fades from head (1.0) to tail (0.0)
 * - Trail intensity scales with radial velocity (breathing motion)
 *
 * Performance:
 * - Single draw call per trail set using BufferGeometry
 * - Position updates only for visible particles
 * - GPU-accelerated fading via vertex colors
 *
 * @see https://tympanus.net/codrops/2019/01/17/interactive-particles-with-three-js/
 * @see https://discourse.threejs.org/t/particle-trail-effect/31642
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { breathPhase, orbitRadius, phaseType } from '../breath/traits';

export interface ShardTrailsProps {
  /**
   * Number of trail segments per particle.
   * Higher = longer trails, more GPU usage.
   * @min 2
   * @max 16
   * @default 8
   */
  trailLength?: number;

  /**
   * Maximum number of particles to track.
   * Should match ParticleSwarm's performanceCap.
   * @default 1000
   */
  maxParticles?: number;

  /**
   * Base opacity of trails (at the head, closest to particle).
   * @min 0
   * @max 1
   * @default 0.35
   */
  baseOpacity?: number;

  /**
   * Trail color - defaults to warm white for Monument Valley aesthetic.
   * @default '#faf5ef'
   */
  color?: string;

  /**
   * How quickly trails respond to particle movement.
   * Lower = smoother/laggier trails, higher = tighter following.
   * @min 0.5
   * @max 10
   * @default 4.0
   */
  trailSpeed?: number;

  /**
   * Minimum velocity threshold for trails to appear.
   * Prevents trails during slow/stationary movement.
   * @min 0
   * @max 1
   * @default 0.08
   */
  velocityThreshold?: number;

  /**
   * How much breathing motion intensifies trails.
   * 0 = constant trails, 1 = trails only visible during motion.
   * @min 0
   * @max 1
   * @default 0.6
   */
  breathingIntensity?: number;

  /**
   * Line width of trails (in pixels).
   * Note: WebGL line width is clamped on many GPUs.
   * @min 1
   * @max 5
   * @default 1.5
   */
  lineWidth?: number;

  /**
   * Reference to ParticleSwarm's InstancedMesh for position sampling.
   * If not provided, will attempt to find by name in scene.
   */
  particleMeshRef?: React.RefObject<THREE.InstancedMesh>;
}

/**
 * Per-particle trail state
 */
interface TrailState {
  /** Ring buffer of historical positions */
  positions: THREE.Vector3[];
  /** Current write index in ring buffer */
  writeIndex: number;
  /** Previous frame position for velocity calculation */
  prevPosition: THREE.Vector3;
  /** Smoothed velocity magnitude */
  velocity: number;
  /** Current opacity based on velocity and breath */
  opacity: number;
}

// Pre-allocated temp objects to avoid GC pressure
const _tempMatrix = new THREE.Matrix4();
const _tempPosition = new THREE.Vector3();
const _tempScale = new THREE.Vector3();
const _tempQuaternion = new THREE.Quaternion();
const _tempPrevPos = new THREE.Vector3();

/**
 * Vertex shader - passes position and alpha to fragment
 * Also calculates screen-space position for glow effect
 */
const trailVertexShader = `
attribute float alpha;
varying float vAlpha;
varying vec3 vWorldPosition;

void main() {
  vAlpha = alpha;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
}
`;

/**
 * Fragment shader - creates ethereal glow effect
 * Uses soft color with additive blending for wispy appearance
 */
const trailFragmentShader = `
uniform vec3 uColor;
uniform float uGlobalOpacity;
uniform float uBreathPhase;
varying float vAlpha;
varying vec3 vWorldPosition;

void main() {
  float finalAlpha = vAlpha * uGlobalOpacity;

  // Smooth cubic falloff for softer trail edges
  float smoothAlpha = finalAlpha * finalAlpha * (3.0 - 2.0 * finalAlpha);

  // Add subtle breathing luminosity pulse (synced with particles)
  float breathGlow = 1.0 + uBreathPhase * 0.15;

  // Ethereal color with warm tint
  vec3 glowColor = uColor * breathGlow;

  // Add soft rim glow effect for wispy appearance
  float rimIntensity = smoothAlpha * 0.3;
  glowColor += vec3(1.0, 0.98, 0.95) * rimIntensity;

  gl_FragColor = vec4(glowColor, smoothAlpha);
}
`;

/**
 * Create trail material with additive blending for ethereal glow
 */
function createTrailMaterial(color: string): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uGlobalOpacity: { value: 0.3 },
      uBreathPhase: { value: 0 },
    },
    vertexShader: trailVertexShader,
    fragmentShader: trailFragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false, // Don't occlude other objects
    side: THREE.DoubleSide,
  });
}

/**
 * ShardTrails component - renders ethereal motion trails behind particle shards
 */
export function ShardTrails({
  trailLength = 8,
  maxParticles = 1000,
  baseOpacity = 0.35,
  color = '#faf5ef',
  trailSpeed = 4.0,
  velocityThreshold = 0.08,
  breathingIntensity = 0.6,
  lineWidth = 1.5,
  particleMeshRef,
}: ShardTrailsProps) {
  const world = useWorld();
  const lineRef = useRef<THREE.LineSegments>(null);
  const trailStatesRef = useRef<TrailState[]>([]);
  const particleMeshSearchRef = useRef<THREE.InstancedMesh | null>(null);
  const frameCountRef = useRef(0);

  // Create geometry with positions and alpha for all trail segments
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();

    // Each particle has (trailLength - 1) line segments
    // Each segment needs 2 vertices (start, end)
    const segmentsPerParticle = trailLength - 1;
    const totalVertices = maxParticles * segmentsPerParticle * 2;

    const positions = new Float32Array(totalVertices * 3);
    const alphas = new Float32Array(totalVertices);

    // Initialize all positions to origin (will be updated in animation loop)
    positions.fill(0);

    // Initialize alpha values (will be dynamically updated)
    alphas.fill(0);

    const positionAttr = new THREE.BufferAttribute(positions, 3);
    const alphaAttr = new THREE.BufferAttribute(alphas, 1);

    // Mark as dynamic for frequent updates
    positionAttr.usage = THREE.DynamicDrawUsage;
    alphaAttr.usage = THREE.DynamicDrawUsage;

    geo.setAttribute('position', positionAttr);
    geo.setAttribute('alpha', alphaAttr);

    return geo;
  }, [trailLength, maxParticles]);

  // Create material
  const material = useMemo(() => createTrailMaterial(color), [color]);

  // Initialize trail states
  useEffect(() => {
    const states: TrailState[] = [];
    for (let i = 0; i < maxParticles; i++) {
      const positions: THREE.Vector3[] = [];
      for (let j = 0; j < trailLength; j++) {
        positions.push(new THREE.Vector3());
      }
      states.push({
        positions,
        writeIndex: 0,
        prevPosition: new THREE.Vector3(),
        velocity: 0,
        opacity: 0,
      });
    }
    trailStatesRef.current = states;
  }, [maxParticles, trailLength]);

  // Update material color when prop changes
  useEffect(() => {
    if (material.uniforms) {
      material.uniforms.uColor.value.set(color);
    }
  }, [color, material]);

  // Update material opacity when prop changes
  useEffect(() => {
    if (material.uniforms) {
      material.uniforms.uGlobalOpacity.value = baseOpacity;
    }
  }, [baseOpacity, material]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  // Animation loop
  useFrame((state, delta) => {
    const line = lineRef.current;
    const trailStates = trailStatesRef.current;
    if (!line || trailStates.length === 0) return;

    const clampedDelta = Math.min(delta, 0.1);

    // Find particle mesh (either from ref or by searching scene)
    let particleMesh: THREE.InstancedMesh | null = null;

    if (particleMeshRef?.current) {
      particleMesh = particleMeshRef.current;
    } else if (!particleMeshSearchRef.current) {
      // Search for ParticleSwarm mesh by name (throttled search)
      frameCountRef.current++;
      if (frameCountRef.current % 30 === 0) {
        state.scene.traverse((obj) => {
          if (obj.name === 'Particle Swarm' && obj instanceof THREE.InstancedMesh) {
            particleMeshSearchRef.current = obj;
          }
        });
      }
    }

    particleMesh = particleMeshRef?.current ?? particleMeshSearchRef.current;

    if (!particleMesh) return;

    // Get breathing state from ECS for intensity modulation
    let currentBreathPhase = 0;
    let currentPhaseType = 0;
    const breathEntity = world.queryFirst(orbitRadius, breathPhase, phaseType);
    if (breathEntity) {
      currentBreathPhase = breathEntity.get(breathPhase)?.value ?? 0;
      currentPhaseType = breathEntity.get(phaseType)?.value ?? 0;
    }

    // Update shader uniform for breathing glow
    if (material.uniforms) {
      material.uniforms.uBreathPhase.value = currentBreathPhase;
    }

    // Calculate breath-based intensity multiplier
    // Trails are strongest during exhale (phaseType 2) when particles spread out
    // and during inhale (phaseType 0) when particles contract
    const isMovingPhase = currentPhaseType === 0 || currentPhaseType === 2;
    const breathIntensityMultiplier = isMovingPhase ? 1.0 : 1.0 - breathingIntensity * 0.7; // Reduce during hold phases

    const positionAttr = geometry.attributes.position as THREE.BufferAttribute;
    const alphaAttr = geometry.attributes.alpha as THREE.BufferAttribute;
    const positions = positionAttr.array as Float32Array;
    const alphas = alphaAttr.array as Float32Array;

    const segmentsPerParticle = trailLength - 1;
    const particleCount = Math.min(particleMesh.count, maxParticles);

    // Speed factor for position history update
    const historyUpdateRate = trailSpeed * clampedDelta;

    // Update each particle's trail
    for (let i = 0; i < particleCount; i++) {
      const trailState = trailStates[i];

      // Get current particle position from InstancedMesh
      particleMesh.getMatrixAt(i, _tempMatrix);
      _tempMatrix.decompose(_tempPosition, _tempQuaternion, _tempScale);

      // Skip if particle is scaled to 0 (invisible)
      if (_tempScale.x < 0.01) {
        // Zero out this particle's trail segments
        const baseVertexIndex = i * segmentsPerParticle * 2;
        for (let s = 0; s < segmentsPerParticle * 2; s++) {
          alphas[baseVertexIndex + s] = 0;
        }
        continue;
      }

      // Calculate velocity from position change
      _tempPrevPos.copy(trailState.prevPosition);
      const velocityMagnitude = _tempPosition.distanceTo(_tempPrevPos) / clampedDelta;

      // Smooth velocity
      trailState.velocity += (velocityMagnitude - trailState.velocity) * 0.2;

      // Update previous position
      trailState.prevPosition.copy(_tempPosition);

      // Update position history ring buffer
      // Write new position at current write index
      trailState.positions[trailState.writeIndex].copy(_tempPosition);
      trailState.writeIndex = (trailState.writeIndex + 1) % trailLength;

      // Calculate trail opacity based on velocity and breathing
      const velocityFactor = Math.min(trailState.velocity / 2.0, 1.0);
      const aboveThreshold = velocityFactor > velocityThreshold ? 1.0 : 0.0;
      const targetOpacity = aboveThreshold * velocityFactor * breathIntensityMultiplier;

      // Smooth opacity changes
      trailState.opacity += (targetOpacity - trailState.opacity) * historyUpdateRate;

      // Write trail segments to geometry
      const baseVertexIndex = i * segmentsPerParticle * 2;

      for (let s = 0; s < segmentsPerParticle; s++) {
        // Read from ring buffer in reverse order (newest to oldest)
        const readIndex1 = (trailState.writeIndex - 1 - s + trailLength) % trailLength;
        const readIndex2 = (trailState.writeIndex - 2 - s + trailLength) % trailLength;

        const pos1 = trailState.positions[readIndex1];
        const pos2 = trailState.positions[readIndex2];

        const vertexIndex = baseVertexIndex + s * 2;

        // Segment start (newer position)
        positions[vertexIndex * 3] = pos1.x;
        positions[vertexIndex * 3 + 1] = pos1.y;
        positions[vertexIndex * 3 + 2] = pos1.z;

        // Segment end (older position)
        positions[vertexIndex * 3 + 3] = pos2.x;
        positions[vertexIndex * 3 + 4] = pos2.y;
        positions[vertexIndex * 3 + 5] = pos2.z;

        // Alpha fades along trail (head = 1, tail = 0)
        const segmentProgress = s / segmentsPerParticle;
        const segmentAlpha = (1.0 - segmentProgress) * trailState.opacity;

        alphas[vertexIndex] = segmentAlpha;
        alphas[vertexIndex + 1] = segmentAlpha * 0.7; // End of segment slightly dimmer
      }
    }

    // Zero out unused particle trails
    for (let i = particleCount; i < maxParticles; i++) {
      const baseVertexIndex = i * segmentsPerParticle * 2;
      for (let s = 0; s < segmentsPerParticle * 2; s++) {
        alphas[baseVertexIndex + s] = 0;
      }
    }

    positionAttr.needsUpdate = true;
    alphaAttr.needsUpdate = true;
  });

  return (
    <lineSegments ref={lineRef} geometry={geometry} material={material} frustumCulled={false}>
      <primitive object={material} attach="material" />
    </lineSegments>
  );
}

export default ShardTrails;
