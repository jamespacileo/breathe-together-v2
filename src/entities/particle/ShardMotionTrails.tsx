/**
 * ShardMotionTrails - Velocity-based motion trails for ParticleSwarm shards
 *
 * Creates elegant "comet tail" streaks as shards move in and out during breathing:
 * - During inhale: trails stream outward (behind contracting shards)
 * - During exhale: trails stream inward (behind expanding shards)
 * - During holds: trails fade to minimal visibility
 *
 * Implementation based on:
 * - Codrops High-Speed Light Trails (instanced geometry stretching)
 * - Maxime Heckel's particle systems (FBO-inspired velocity tracking)
 *
 * Performance: Single additional draw call with instanced rendering.
 * Uses additive blending for ethereal glow effect.
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { type MoodId, RENDER_LAYERS } from '../../constants';
import { MONUMENT_VALLEY_PALETTE } from '../../lib/colors';
import { breathPhase, orbitRadius, phaseType } from '../breath/traits';

// Trail color palette - slightly cooler/more ethereal than shard colors
const TRAIL_COLORS: Record<MoodId, THREE.Color> = {
  gratitude: new THREE.Color(MONUMENT_VALLEY_PALETTE.gratitude).multiplyScalar(0.9),
  presence: new THREE.Color(MONUMENT_VALLEY_PALETTE.presence).multiplyScalar(0.9),
  release: new THREE.Color(MONUMENT_VALLEY_PALETTE.release).multiplyScalar(0.9),
  connection: new THREE.Color(MONUMENT_VALLEY_PALETTE.connection).multiplyScalar(0.9),
};

const DEFAULT_TRAIL_COLOR = new THREE.Color(MONUMENT_VALLEY_PALETTE.presence).multiplyScalar(0.85);

/**
 * Trail vertex shader
 *
 * Creates a subtle elongation effect by stretching vertices opposite to
 * the direction of motion. Uses a simple approach that works in local space.
 */
const trailVertexShader = `
// Per-instance: radial velocity (negative = contracting, positive = expanding)
attribute float instanceRadialVelocity;
// Per-instance: radial direction in world space
attribute vec3 instanceDirection;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vColor;
varying float vTrailFade;
varying float vVelocityMag;

uniform float trailLength;
uniform float velocityScale;

void main() {
  // Instance color
  #ifdef USE_INSTANCING_COLOR
    vColor = instanceColor;
  #else
    vColor = vec3(0.85, 0.8, 0.75);
  #endif

  // Velocity magnitude determines trail intensity
  float velMag = abs(instanceRadialVelocity) * velocityScale;
  vVelocityMag = clamp(velMag, 0.0, 1.5);

  // Get world position of this vertex
  vec4 worldPos = instanceMatrix * vec4(position, 1.0);

  // Get center of this instance in world space
  vec4 centerWorld = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);

  // Direction from center to this vertex (in world space)
  vec3 vertexDir = normalize(worldPos.xyz - centerWorld.xyz);

  // Radial direction (pointing outward from origin)
  vec3 radialDir = normalize(instanceDirection);

  // Trail direction is opposite to movement:
  // - Positive velocity (expanding) = trail points inward (toward center)
  // - Negative velocity (contracting) = trail points outward (away from center)
  vec3 trailDir = -sign(instanceRadialVelocity) * radialDir;

  // How much this vertex aligns with the trail direction
  // Vertices pointing in trail direction get stretched
  float alignment = dot(vertexDir, trailDir);
  float stretchFactor = max(alignment, 0.0);

  // Apply stretch along trail direction
  float stretchAmount = stretchFactor * velMag * trailLength;
  worldPos.xyz += trailDir * stretchAmount;

  // Trail fade: higher for stretched vertices
  vTrailFade = stretchFactor * smoothstep(0.0, 0.5, velMag);

  // Transform normal (use original, not stretched)
  vNormal = normalize(normalMatrix * normal);

  vec4 mvPosition = viewMatrix * worldPos;
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

/**
 * Trail fragment shader
 *
 * Creates an ethereal, glowing trail effect with:
 * - Soft fresnel edges
 * - Color shift toward white in the trail
 * - Smooth opacity falloff
 */
const trailFragmentShader = `
uniform float breathPhase;
uniform float time;
uniform float baseOpacity;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vColor;
varying float vTrailFade;
varying float vVelocityMag;

void main() {
  vec3 viewDir = normalize(vViewPosition);

  // Soft fresnel rim - gentler than shards for ethereal feel
  float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 1.5);

  // Ethereal color treatment:
  // - Base color at core
  // - Shifts toward white/warm tint at trail end
  vec3 trailTint = vec3(1.0, 0.98, 0.96);  // Warm white
  vec3 baseColor = mix(vColor, trailTint, vTrailFade * 0.6);

  // Add a subtle glow effect
  vec3 glowColor = vColor * 1.2;
  baseColor = mix(baseColor, glowColor, fresnel * 0.3);

  // Breathing luminosity - trails glow slightly with breath
  float breathGlow = 1.0 + breathPhase * 0.08;
  baseColor *= breathGlow;

  // Opacity calculation:
  // 1. Velocity-based: stronger trails when moving faster
  float velocityOpacity = smoothstep(0.05, 0.4, vVelocityMag);

  // 2. Fade along trail length (front=solid, back=transparent)
  float fadeOpacity = 1.0 - vTrailFade * 0.9;

  // 3. Soft edges via fresnel
  float edgeOpacity = mix(0.8, 1.0, 1.0 - fresnel);

  // Combine all opacity factors
  float finalOpacity = baseOpacity * velocityOpacity * fadeOpacity * edgeOpacity;

  // Ensure trails are only visible when there's movement
  finalOpacity *= step(0.02, vVelocityMag);

  gl_FragColor = vec4(baseColor, finalOpacity);
}
`;

/**
 * Create trail material with configurable parameters
 *
 * Uses additive blending for an ethereal, glowing effect.
 * Trails don't write to depth buffer for proper layering.
 */
function createTrailMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      breathPhase: { value: 0 },
      time: { value: 0 },
      trailLength: { value: 2.0 }, // Moderate stretch
      velocityScale: { value: 5.0 }, // Sensitivity to velocity
      baseOpacity: { value: 0.25 }, // Subtle but visible
    },
    vertexShader: trailVertexShader,
    fragmentShader: trailFragmentShader,
    defines: { USE_INSTANCING_COLOR: '' },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

// Reusable temp objects to avoid GC
const _tempMatrix = new THREE.Matrix4();
const _tempPosition = new THREE.Vector3();
const _tempQuaternion = new THREE.Quaternion();
const _tempScale = new THREE.Vector3();

export interface ShardMotionTrailsProps {
  /**
   * Reference to the main ParticleSwarm InstancedMesh
   * Used to read positions and colors from the shards
   */
  shardMeshRef: React.RefObject<THREE.InstancedMesh | null>;

  /**
   * Number of instances to render (should match shard count)
   * @default 1000
   */
  instanceCount?: number;

  /**
   * Scale multiplier for trail geometry relative to shards
   * @default 1.0
   */
  trailScale?: number;

  /**
   * Maximum trail length (velocity multiplier)
   * @default 3.0
   */
  trailLength?: number;

  /**
   * Base opacity of trails
   * @default 0.22
   */
  baseOpacity?: number;

  /**
   * Velocity sensitivity - how quickly trails respond to movement
   * @default 8.0
   */
  velocityScale?: number;

  /**
   * User moods for coloring (synced with ParticleSwarm)
   */
  instanceMoods?: (MoodId | null)[];
}

export function ShardMotionTrails({
  shardMeshRef,
  instanceCount = 1000,
  trailScale = 1.0,
  trailLength = 3.0,
  baseOpacity = 0.22,
  velocityScale = 8.0,
  instanceMoods = [],
}: ShardMotionTrailsProps) {
  const world = useWorld();
  const trailMeshRef = useRef<THREE.InstancedMesh>(null);

  // Track previous radius values to compute velocity
  const prevRadiiRef = useRef<Float32Array>(new Float32Array(instanceCount));
  const velocitiesRef = useRef<Float32Array>(new Float32Array(instanceCount));
  const directionsRef = useRef<Float32Array>(new Float32Array(instanceCount * 3));

  // Create trail geometry (slightly elongated icosahedron for better stretching)
  const geometry = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(0.5 * trailScale, 1);
    // Add custom attributes for velocity and direction
    const velAttr = new THREE.InstancedBufferAttribute(new Float32Array(instanceCount), 1);
    const dirAttr = new THREE.InstancedBufferAttribute(new Float32Array(instanceCount * 3), 3);
    geo.setAttribute('instanceRadialVelocity', velAttr);
    geo.setAttribute('instanceDirection', dirAttr);
    return geo;
  }, [instanceCount, trailScale]);

  // Create trail material
  const material = useMemo(() => {
    const mat = createTrailMaterial();
    mat.uniforms.trailLength.value = trailLength;
    mat.uniforms.baseOpacity.value = baseOpacity;
    mat.uniforms.velocityScale.value = velocityScale;
    return mat;
  }, [trailLength, baseOpacity, velocityScale]);

  // Initialize instance colors based on moods
  useEffect(() => {
    const mesh = trailMeshRef.current;
    if (!mesh) return;

    for (let i = 0; i < instanceCount; i++) {
      const mood = instanceMoods[i];
      const color = mood ? TRAIL_COLORS[mood] : DEFAULT_TRAIL_COLOR;
      mesh.setColorAt(i, color);
    }

    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }, [instanceCount, instanceMoods]);

  // Cleanup
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  // Animation loop - sync with shards and compute velocities
  useFrame((state, delta) => {
    const trailMesh = trailMeshRef.current;
    const shardMesh = shardMeshRef.current;
    if (!trailMesh || !shardMesh) return;

    const clampedDelta = Math.min(delta, 0.1);
    const time = state.clock.elapsedTime;

    // Get breath state from ECS
    let currentBreathPhase = 0;
    const breathEntity = world.queryFirst(orbitRadius, breathPhase, phaseType);
    if (breathEntity) {
      currentBreathPhase = breathEntity.get(breathPhase)?.value ?? 0;
    }

    // Update material uniforms
    material.uniforms.breathPhase.value = currentBreathPhase;
    material.uniforms.time.value = time;

    // Get attribute buffers
    const velAttr = geometry.getAttribute(
      'instanceRadialVelocity',
    ) as THREE.InstancedBufferAttribute;
    const dirAttr = geometry.getAttribute('instanceDirection') as THREE.InstancedBufferAttribute;
    const velocities = velocitiesRef.current;
    const prevRadii = prevRadiiRef.current;
    const directions = directionsRef.current;

    // Sync with shard mesh and compute velocities
    const shardCount = shardMesh.count;
    trailMesh.count = shardCount;

    for (let i = 0; i < shardCount; i++) {
      // Copy matrix from shard mesh
      shardMesh.getMatrixAt(i, _tempMatrix);
      _tempMatrix.decompose(_tempPosition, _tempQuaternion, _tempScale);

      // Compute current radius
      const currentRadius = _tempPosition.length();

      // Compute radial velocity (change in radius per second)
      const prevRadius = prevRadii[i] || currentRadius;
      const velocity = (currentRadius - prevRadius) / clampedDelta;

      // Smooth velocity for less jittery trails
      const smoothedVelocity = velocities[i] * 0.7 + velocity * 0.3;
      velocities[i] = smoothedVelocity;
      prevRadii[i] = currentRadius;

      // Store direction (normalized position)
      if (currentRadius > 0.01) {
        directions[i * 3] = _tempPosition.x / currentRadius;
        directions[i * 3 + 1] = _tempPosition.y / currentRadius;
        directions[i * 3 + 2] = _tempPosition.z / currentRadius;
      }

      // Update attribute buffers
      velAttr.array[i] = smoothedVelocity;
      dirAttr.array[i * 3] = directions[i * 3];
      dirAttr.array[i * 3 + 1] = directions[i * 3 + 1];
      dirAttr.array[i * 3 + 2] = directions[i * 3 + 2];

      // Set trail matrix (same position as shard, slightly smaller scale)
      _tempScale.multiplyScalar(0.95);
      _tempMatrix.compose(_tempPosition, _tempQuaternion, _tempScale);
      trailMesh.setMatrixAt(i, _tempMatrix);
    }

    // Mark attributes as needing update
    velAttr.needsUpdate = true;
    dirAttr.needsUpdate = true;
    trailMesh.instanceMatrix.needsUpdate = true;
  });

  // Set render layer
  useEffect(() => {
    const mesh = trailMeshRef.current;
    if (mesh) {
      mesh.layers.enable(RENDER_LAYERS.EFFECTS);
    }
  }, []);

  return (
    <instancedMesh
      ref={trailMeshRef}
      args={[geometry, material, instanceCount]}
      frustumCulled={false}
      renderOrder={-1}
      name="Shard Motion Trails"
    />
  );
}
