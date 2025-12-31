/**
 * ParticleSwarm - Monument Valley inspired icosahedral shards
 *
 * Uses separate Mesh objects (not InstancedMesh) to match reference exactly.
 * Each mesh has per-vertex color attribute for mood coloring.
 * Rendered via RefractionPipeline 3-pass FBO system.
 *
 * User Ordering System (Dec 2024):
 * - Supports ordered mood array where index = arrival order
 * - Slot-based positioning with smooth color/scale transitions
 * - Handles rapid updates gracefully (lerping blends naturally)
 * - No teleporting: positions stable, only colors/scales animate
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { MoodId } from '../../constants';
import { breathPhase, orbitRadius } from '../breath/traits';
import { createFrostedGlassMaterial } from './FrostedGlassMaterial';
import {
  EMPTY_SLOT,
  getMoodColor,
  getSlotFallbackColor,
  presenceToMoodArray,
} from './useUserOrdering';

/**
 * Apply per-vertex color to icosahedron geometry
 *
 * Sets vertex colors for all vertices in the geometry to the specified color.
 * Required for THREE.InstancedMesh with vertexColors enabled.
 *
 * **Implementation:** Creates Float32Array with RGB triplets for each vertex.
 * Icosahedron geometry has 12 vertices by default (detail level 0).
 *
 * **Performance:** Called once per unique shard geometry during initialization.
 * O(v) where v is vertex count.
 *
 * @param geometry - Icosahedron geometry to modify
 * @param color - Three.js color to apply to all vertices
 */
function applyVertexColors(geometry: THREE.IcosahedronGeometry, color: THREE.Color): void {
  const vertexCount = geometry.attributes.position.count;
  const colors = new Float32Array(vertexCount * 3);
  for (let c = 0; c < colors.length; c += 3) {
    colors[c] = color.r;
    colors[c + 1] = color.g;
    colors[c + 2] = color.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

/**
 * Update existing vertex colors in-place (no allocation)
 *
 * Mutates the geometry's color attribute directly.
 * Much more efficient than recreating geometry for color changes.
 *
 * @param geometry - Geometry with existing color attribute
 * @param color - New color to apply
 */
function updateVertexColors(geometry: THREE.BufferGeometry, color: THREE.Color): void {
  const colorAttr = geometry.attributes.color;
  if (!colorAttr) return;

  const colors = colorAttr.array as Float32Array;
  for (let c = 0; c < colors.length; c += 3) {
    colors[c] = color.r;
    colors[c + 1] = color.g;
    colors[c + 2] = color.b;
  }
  colorAttr.needsUpdate = true;
}

export interface ParticleSwarmProps {
  /** Number of shards (default 48 matches reference) */
  count?: number;
  /**
   * Ordered mood array - index = arrival order, value = mood index (0-6) or -1 for empty
   * When provided, takes precedence over `users` prop for coloring
   */
  moodArray?: number[];
  /** Users by mood for color distribution (legacy, use moodArray for ordered display) */
  users?: Partial<Record<MoodId, number>>;
  /** Base radius for orbit @default 4.5 */
  baseRadius?: number;
  /** Base size for shards @default 4.0 */
  baseShardSize?: number;
  /** Globe radius for minimum distance calculation @default 1.5 */
  globeRadius?: number;
  /** Buffer distance between shard surface and globe surface @default 0.3 */
  buffer?: number;
  /** Maximum shard size cap (prevents oversized shards at low counts) @default 0.6 */
  maxShardSize?: number;
  /** Color transition duration in seconds @default 0.5 */
  colorTransitionDuration?: number;
  /** Enter/exit scale animation duration in seconds @default 0.3 */
  scaleTransitionDuration?: number;
}

interface ShardData {
  mesh: THREE.Mesh;
  direction: THREE.Vector3;
  geometry: THREE.IcosahedronGeometry;
}

/**
 * Physics state for organic breathing animation
 *
 * Each shard has independent spring physics + ambient motion for natural feel:
 * - Spring physics: smooth transitions with settling on holds
 * - Phase offset: subtle wave effect (particles don't move in perfect lockstep)
 * - Ambient seed: unique floating pattern per shard
 * - Rotation speeds: per-shard variation for organic feel
 * - Scale offset: subtle size variation for depth
 * - Orbit: slow orbital drift around center
 * - Perpendicular: tangent wobble for organic floating feel
 * - Color state: current/target color with lerp progress (user ordering system)
 * - Active state: enter/exit scale animation (user ordering system)
 */
interface ShardPhysicsState {
  /** Current interpolated radius (spring-smoothed) */
  currentRadius: number;
  /** Radial velocity for spring physics */
  velocity: number;
  /** Phase offset for subtle wave effect (0-0.05 range) */
  phaseOffset: number;
  /** Seed for ambient floating motion (unique per shard) */
  ambientSeed: number;
  /** Previous frame's target radius (for detecting expansion) */
  previousTarget: number;
  /** Per-shard rotation speed multiplier X axis (0.7-1.3 range) */
  rotationSpeedX: number;
  /** Per-shard rotation speed multiplier Y axis (0.7-1.3 range) */
  rotationSpeedY: number;
  /** Base scale offset for depth variation (0.85-1.15 range) */
  baseScaleOffset: number;
  /** Current orbit angle offset (radians, accumulates over time) */
  orbitAngle: number;
  /** Per-shard orbit speed (radians/second) */
  orbitSpeed: number;
  /** Seed for perpendicular wobble phase */
  wobbleSeed: number;

  // User ordering color animation state
  /** Current displayed color (interpolated) */
  currentColor: THREE.Color;
  /** Target color (lerping towards) */
  targetColor: THREE.Color;
  /** Color lerp progress (0 = start transition, 1 = at target) */
  colorLerpProgress: number;
  /** Mood index for this slot (-1 for empty) */
  moodIndex: number;

  // User ordering active/scale state
  /** Whether slot is currently visible (has user) */
  isActive: boolean;
  /** Target active state (for animation) */
  targetActive: boolean;
  /** Scale animation progress (0 = hidden, 1 = full size) */
  activeProgress: number;
}

/**
 * Spring physics constants for relaxed breathing feel
 *
 * Tuned for controlled relaxation breathing:
 * - Stiffness: responsive but not instant (follows breath naturally)
 * - Damping: settles quickly on holds without oscillation
 * - Expansion boost: immediate response when exhale begins
 */
const SPRING_STIFFNESS = 6; // Lower = more lag, higher = snappier
const SPRING_DAMPING = 4.5; // Lower = oscillates, higher = settles faster

/**
 * Expansion velocity boost for immediate exhale response
 *
 * When target radius increases (exhale starts), inject outward velocity
 * proportional to target change. This overcomes spring lag and makes
 * the exhale expansion feel immediate rather than delayed.
 *
 * The boost is asymmetric - only applied during expansion (exhale),
 * not contraction (inhale), for a more natural "release" feel.
 */
const EXPANSION_VELOCITY_BOOST = 2.5; // Multiplier for expansion velocity injection

/**
 * Ambient floating motion constants
 *
 * Secondary motion layer - particles "float" even during holds
 * Creates alive, breathing atmosphere without disrupting synchronization
 */
const AMBIENT_SCALE = 0.08; // Maximum ambient offset
const AMBIENT_Y_SCALE = 0.04; // Vertical motion is more subtle

/**
 * Orbital drift constants
 *
 * Very slow rotation around center - shards gradually orbit the globe
 * Kept subtle (0.01-0.03 rad/s) to avoid dizziness
 */
const ORBIT_BASE_SPEED = 0.015; // Base orbit speed (radians/second)
const ORBIT_SPEED_VARIATION = 0.01; // ±variation per shard

/**
 * Perpendicular wobble constants
 *
 * Small movement tangent to radial direction - adds organic "floating" feel
 * Distinct from orbital motion (faster frequency, smaller amplitude)
 */
const PERPENDICULAR_AMPLITUDE = 0.03; // Maximum tangent offset (subtle)
const PERPENDICULAR_FREQUENCY = 0.35; // Oscillation speed (Hz, slower = softer)

/**
 * Phase stagger for wave effect
 *
 * Small offset per particle creates flowing wave during breath transitions
 * Kept small (3-5%) to maintain "breathing together" feel
 */
const MAX_PHASE_OFFSET = 0.04; // 4% of breath cycle

/**
 * Easing function for smooth color/scale transitions
 * easeOutQuad: fast start, slow finish - feels natural for "settling"
 */
function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

/**
 * Easing function for scale animations
 * easeOutBack: slight overshoot for bouncy feel
 */
function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

export function ParticleSwarm({
  count = 48,
  moodArray: moodArrayProp,
  users,
  baseRadius = 4.5,
  baseShardSize = 4.0,
  globeRadius = 1.5,
  buffer = 0.3,
  maxShardSize = 0.6,
  colorTransitionDuration = 0.5,
  scaleTransitionDuration = 0.3,
}: ParticleSwarmProps) {
  const world = useWorld();
  const groupRef = useRef<THREE.Group>(null);
  const shardsRef = useRef<ShardData[]>([]);
  const physicsRef = useRef<ShardPhysicsState[]>([]);
  const prevMoodArrayRef = useRef<number[]>([]);

  // Calculate shard size (capped to prevent oversized shards at low counts)
  const shardSize = useMemo(
    () => Math.min(baseShardSize / Math.sqrt(count), maxShardSize),
    [baseShardSize, count, maxShardSize],
  );
  const minOrbitRadius = useMemo(
    () => globeRadius + shardSize + buffer,
    [globeRadius, shardSize, buffer],
  );

  // Create shared material (will be swapped by RefractionPipeline)
  const material = useMemo(() => createFrostedGlassMaterial(), []);

  // Compute effective mood array from either prop
  const effectiveMoodArray = useMemo(() => {
    if (moodArrayProp) {
      // Pad or truncate to count
      const result = [...moodArrayProp];
      while (result.length < count) {
        result.push(EMPTY_SLOT);
      }
      return result.slice(0, count);
    }
    // Convert users object to mood array (legacy mode)
    return presenceToMoodArray(users, count);
  }, [moodArrayProp, users, count]);

  // Create shards with initial per-vertex colors
  // biome-ignore lint/correctness/useExhaustiveDependencies: effectiveMoodArray intentionally excluded - colors are updated dynamically via processMoodArrayChanges, not by recreating shards
  const shards = useMemo(() => {
    const result: ShardData[] = [];

    for (let i = 0; i < count; i++) {
      const geometry = new THREE.IcosahedronGeometry(shardSize, 0);

      // Get initial color from mood array or fallback
      const moodIndex = effectiveMoodArray[i] ?? EMPTY_SLOT;
      const initialColor =
        moodIndex !== EMPTY_SLOT ? getMoodColor(moodIndex) : getSlotFallbackColor(i);
      applyVertexColors(geometry, initialColor);

      // Fibonacci sphere distribution
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;
      const direction = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);

      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.useRefraction = true; // Mark for RefractionPipeline
      mesh.position.copy(direction).multiplyScalar(baseRadius);
      mesh.lookAt(0, 0, 0);
      mesh.frustumCulled = false;

      // Set initial visibility based on mood
      const isActive = moodIndex !== EMPTY_SLOT;
      mesh.visible = true; // Always visible, scale handles appearance
      mesh.scale.setScalar(isActive ? 1 : 0);

      result.push({ mesh, direction, geometry });
    }

    return result;
  }, [count, shardSize, material, baseRadius]); // Note: removed effectiveMoodArray dependency

  // Add meshes to group and initialize physics state
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    // Clear previous children
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    // Add new shards and initialize physics state
    const physicsStates: ShardPhysicsState[] = [];
    for (let i = 0; i < shards.length; i++) {
      const shard = shards[i];
      group.add(shard.mesh);

      // Initialize physics state with staggered phase offsets
      // Use golden ratio distribution for even visual spread
      const goldenRatio = (1 + Math.sqrt(5)) / 2;

      // Per-shard rotation speed variation (0.7-1.3 range)
      // Uses different seeds for X and Y to avoid synchronized rotation
      const rotSeedX = (i * 1.618 + 0.3) % 1; // Golden ratio offset
      const rotSeedY = (i * 2.236 + 0.7) % 1; // sqrt(5) offset
      const rotationSpeedX = 0.7 + rotSeedX * 0.6;
      const rotationSpeedY = 0.7 + rotSeedY * 0.6;

      // Base scale offset for depth (0.9-1.1 range) - subtle size variation
      const scaleSeed = (i * goldenRatio + 0.5) % 1;
      const baseScaleOffset = 0.9 + scaleSeed * 0.2;

      // Orbital drift speed variation - all shards orbit same direction to prevent overlap
      // Small speed variation creates gentle relative drift between neighbors
      const orbitSeed = (i * Math.PI + 0.1) % 1;
      const orbitSpeed = ORBIT_BASE_SPEED + (orbitSeed - 0.5) * 2 * ORBIT_SPEED_VARIATION;

      // Wobble seed for perpendicular motion phase offset
      const wobbleSeed = i * Math.E; // e-based offset for unique phases

      // Initialize color state from mood array
      const moodIndex = effectiveMoodArray[i] ?? EMPTY_SLOT;
      const initialColor =
        moodIndex !== EMPTY_SLOT ? getMoodColor(moodIndex) : getSlotFallbackColor(i);
      const isActive = moodIndex !== EMPTY_SLOT;

      physicsStates.push({
        currentRadius: baseRadius,
        velocity: 0,
        phaseOffset: ((i * goldenRatio) % 1) * MAX_PHASE_OFFSET,
        ambientSeed: i * 137.508, // Golden angle in degrees for unique patterns
        previousTarget: baseRadius,
        rotationSpeedX,
        rotationSpeedY,
        baseScaleOffset,
        orbitAngle: 0,
        orbitSpeed,
        wobbleSeed,

        // Color animation state
        currentColor: initialColor.clone(),
        targetColor: initialColor.clone(),
        colorLerpProgress: 1, // Start fully transitioned
        moodIndex,

        // Active/scale state
        isActive,
        targetActive: isActive,
        activeProgress: isActive ? 1 : 0,
      });
    }

    shardsRef.current = shards;
    physicsRef.current = physicsStates;
    prevMoodArrayRef.current = [...effectiveMoodArray];

    // Cleanup on unmount
    return () => {
      for (const shard of shards) {
        shard.geometry.dispose();
        group.remove(shard.mesh);
      }
    };
  }, [shards, baseRadius, effectiveMoodArray]);

  // Cleanup material on unmount
  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  // Handle mood array changes - update target colors and active states
  const processMoodArrayChanges = useCallback((newMoodArray: number[]) => {
    const physics = physicsRef.current;
    const prevMoodArray = prevMoodArrayRef.current;

    for (let i = 0; i < physics.length; i++) {
      const state = physics[i];
      const oldMood = prevMoodArray[i] ?? EMPTY_SLOT;
      const newMood = newMoodArray[i] ?? EMPTY_SLOT;

      if (oldMood === newMood) continue;

      const wasEmpty = oldMood === EMPTY_SLOT;
      const isNowEmpty = newMood === EMPTY_SLOT;

      if (wasEmpty && !isNowEmpty) {
        // Enter: slot was empty, now has user
        state.moodIndex = newMood;
        state.targetColor = getMoodColor(newMood);
        state.currentColor.copy(state.targetColor); // Instant color on enter
        state.colorLerpProgress = 1;
        state.targetActive = true;
        // activeProgress will animate 0→1 in useFrame
      } else if (!wasEmpty && isNowEmpty) {
        // Exit: slot had user, now empty
        state.moodIndex = EMPTY_SLOT;
        state.targetActive = false;
        // Keep current color during fade out
        // activeProgress will animate 1→0 in useFrame
      } else {
        // Color change: both have users but different moods
        state.moodIndex = newMood;
        state.targetColor = getMoodColor(newMood);
        state.colorLerpProgress = 0; // Start lerping
      }
    }

    prevMoodArrayRef.current = [...newMoodArray];
  }, []);

  // Watch for mood array changes
  useEffect(() => {
    if (physicsRef.current.length > 0) {
      processMoodArrayChanges(effectiveMoodArray);
    }
  }, [effectiveMoodArray, processMoodArrayChanges]);

  // Animation loop - spring physics + ambient motion + shader updates + color/scale transitions
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Physics simulation + color/scale animations require multiple interleaved calculations - splitting would reduce readability
  useFrame((state, delta) => {
    const currentShards = shardsRef.current;
    const physics = physicsRef.current;
    if (currentShards.length === 0 || physics.length === 0) return;

    // Cap delta to prevent physics explosion on tab switch
    const clampedDelta = Math.min(delta, 0.1);
    const time = state.clock.elapsedTime;

    // Animation speeds
    const colorSpeed = 1 / colorTransitionDuration;
    const scaleSpeed = 1 / scaleTransitionDuration;

    // Get breathing state from ECS
    let targetRadius = baseRadius;
    let currentBreathPhase = 0;
    try {
      const breathEntity = world.queryFirst(orbitRadius);
      if (breathEntity) {
        targetRadius = breathEntity.get(orbitRadius)?.value ?? baseRadius;
        currentBreathPhase = breathEntity.get(breathPhase)?.value ?? 0;
      }
    } catch {
      // Ignore ECS errors during unmount/remount in Triplex
    }

    // Update shader material uniforms for all shards
    // (shared material means updating once affects all)
    if (material.uniforms) {
      material.uniforms.breathPhase.value = currentBreathPhase;
      material.uniforms.time.value = time;
    }

    // Update each shard with spring physics + ambient motion + color/scale transitions
    for (let i = 0; i < currentShards.length; i++) {
      const shard = currentShards[i];
      const shardState = physics[i];

      // === COLOR TRANSITION ===
      if (shardState.colorLerpProgress < 1) {
        shardState.colorLerpProgress = Math.min(
          1,
          shardState.colorLerpProgress + clampedDelta * colorSpeed,
        );
        const t = easeOutQuad(shardState.colorLerpProgress);
        shardState.currentColor.lerpColors(
          shardState.currentColor,
          shardState.targetColor,
          // Use incremental lerp for smoother animation
          t < 0.99 ? clampedDelta * colorSpeed * 3 : 1,
        );
        // Update vertex colors
        updateVertexColors(shard.geometry, shardState.currentColor);
      }

      // === ACTIVE/SCALE TRANSITION ===
      let activeScale = 1;
      if (shardState.targetActive && shardState.activeProgress < 1) {
        // Animating in (enter)
        shardState.activeProgress = Math.min(
          1,
          shardState.activeProgress + clampedDelta * scaleSpeed,
        );
        activeScale = easeOutBack(shardState.activeProgress);
        if (shardState.activeProgress >= 1) {
          shardState.isActive = true;
        }
      } else if (!shardState.targetActive && shardState.activeProgress > 0) {
        // Animating out (exit)
        shardState.activeProgress = Math.max(
          0,
          shardState.activeProgress - clampedDelta * scaleSpeed,
        );
        activeScale = easeOutQuad(shardState.activeProgress);
        if (shardState.activeProgress <= 0) {
          shardState.isActive = false;
        }
      } else {
        activeScale = shardState.isActive ? 1 : 0;
      }

      // Apply phase offset for wave effect
      // This creates subtle stagger in breathing motion
      const offsetBreathPhase = currentBreathPhase + shardState.phaseOffset;

      // Calculate target radius with phase offset applied
      // Map breath phase (0-1) to orbit radius range
      // breathPhase 0 = exhaled (max radius), breathPhase 1 = inhaled (min radius)
      const phaseTargetRadius =
        targetRadius + (1 - offsetBreathPhase) * (baseRadius - targetRadius) * 0.15;

      // Clamp target to prevent penetrating globe
      const clampedTarget = Math.max(phaseTargetRadius, minOrbitRadius);

      // Detect expansion (exhale) and apply velocity boost for immediate response
      // This overcomes spring lag so exhale feels like an immediate "release"
      const targetDelta = clampedTarget - shardState.previousTarget;
      if (targetDelta > 0.001) {
        // Expanding outward (exhale starting) - inject outward velocity
        shardState.velocity += targetDelta * EXPANSION_VELOCITY_BOOST;
      }
      shardState.previousTarget = clampedTarget;

      // Spring physics: F = -k(x - target) - c*v
      const springForce = (clampedTarget - shardState.currentRadius) * SPRING_STIFFNESS;
      const dampingForce = -shardState.velocity * SPRING_DAMPING;
      const totalForce = springForce + dampingForce;

      // Integrate velocity and position
      shardState.velocity += totalForce * clampedDelta;
      shardState.currentRadius += shardState.velocity * clampedDelta;

      // Update orbital drift angle
      shardState.orbitAngle += shardState.orbitSpeed * clampedDelta;

      // Apply orbital rotation to direction vector (rotate around Y axis)
      // This creates a slow drift around the center globe
      const orbitedDirection = shard.direction
        .clone()
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), shardState.orbitAngle);

      // Compute perpendicular wobble (tangent to radial direction)
      // Get two perpendicular vectors using cross products
      const up = new THREE.Vector3(0, 1, 0);
      const tangent1 = orbitedDirection.clone().cross(up).normalize();
      // Handle edge case when direction is parallel to up
      if (tangent1.lengthSq() < 0.001) {
        tangent1.set(1, 0, 0);
      }
      const tangent2 = orbitedDirection.clone().cross(tangent1).normalize();

      // Perpendicular wobble with unique phase per shard
      const wobblePhase = time * PERPENDICULAR_FREQUENCY * Math.PI * 2 + shardState.wobbleSeed;
      const wobble1 = Math.sin(wobblePhase) * PERPENDICULAR_AMPLITUDE;
      const wobble2 = Math.cos(wobblePhase * 0.7) * PERPENDICULAR_AMPLITUDE * 0.6;

      // Ambient floating motion (secondary layer)
      // Uses different frequencies per axis for organic feel
      const seed = shardState.ambientSeed;
      const ambientX = Math.sin(time * 0.4 + seed) * AMBIENT_SCALE;
      const ambientY = Math.sin(time * 0.3 + seed * 0.7) * AMBIENT_Y_SCALE;
      const ambientZ = Math.cos(time * 0.35 + seed * 1.3) * AMBIENT_SCALE;

      // Compute final position: orbited direction + spring radius + tangent wobble + ambient
      shard.mesh.position
        .copy(orbitedDirection)
        .multiplyScalar(shardState.currentRadius)
        .addScaledVector(tangent1, wobble1)
        .addScaledVector(tangent2, wobble2)
        .add(new THREE.Vector3(ambientX, ambientY, ambientZ));

      // Per-shard rotation with variation (base: 0.002 X, 0.003 Y × speed multipliers)
      shard.mesh.rotation.x += 0.002 * shardState.rotationSpeedX;
      shard.mesh.rotation.y += 0.003 * shardState.rotationSpeedY;

      // Subtle scale breathing - shards pulse slightly with breath (3-8% range)
      // Combined with base scale offset for depth variation AND active scale
      const breathScale = 1.0 + currentBreathPhase * 0.05; // 0-5% breath pulse
      const finalScale = shardState.baseScaleOffset * breathScale * activeScale;
      shard.mesh.scale.setScalar(finalScale);
    }
  });

  return <group ref={groupRef} name="Particle Swarm" />;
}

export default ParticleSwarm;
