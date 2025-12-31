/**
 * ParticleSwarm - Monument Valley inspired icosahedral shards
 *
 * Uses slot-based user ordering for visual stability:
 * - Users maintain their slot when others join/leave
 * - Fibonacci positions dynamically redistribute based on active count
 * - Smooth scale animations (0→1 on enter, 1→0 on exit)
 * - Smooth position animations when distribution changes
 * - Diff-based reconciliation for minimal disruption
 * - Updates only during hold phase, once per breathing cycle
 *
 * Rendering: Separate Mesh objects (not InstancedMesh) with per-vertex colors.
 * Rendered via RefractionPipeline 3-pass FBO system.
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { BREATH_TOTAL_CYCLE, type MoodId } from '../../constants';
import { MONUMENT_VALLEY_PALETTE } from '../../lib/colors';
import { breathPhase, orbitRadius, phaseType } from '../breath/traits';
import { createFrostedGlassMaterial } from './FrostedGlassMaterial';
import {
  getBreathingCycleIndex,
  isHoldPhase,
  moodCountsToUsers,
  SlotManager,
  type User,
} from './SlotManager';

// Direct 1:1 mapping - each mood has exactly one color
const MOOD_TO_COLOR: Record<MoodId, THREE.Color> = {
  gratitude: new THREE.Color(MONUMENT_VALLEY_PALETTE.gratitude),
  presence: new THREE.Color(MONUMENT_VALLEY_PALETTE.presence),
  release: new THREE.Color(MONUMENT_VALLEY_PALETTE.release),
  connection: new THREE.Color(MONUMENT_VALLEY_PALETTE.connection),
};

// Default color for empty slots (won't be visible due to scale=0)
const DEFAULT_COLOR = new THREE.Color(MONUMENT_VALLEY_PALETTE.presence);

/**
 * Apply per-vertex color to icosahedron geometry
 *
 * Sets vertex colors for all vertices in the geometry to the specified color.
 * Required for THREE.InstancedMesh with vertexColors enabled.
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
 * Update vertex colors on existing geometry (avoids full geometry recreation)
 *
 * @param geometry - Geometry with existing color attribute
 * @param color - New color to apply
 */
function updateVertexColors(geometry: THREE.IcosahedronGeometry, color: THREE.Color): void {
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

/**
 * Calculate Fibonacci sphere point for even distribution
 *
 * Uses golden angle distribution for uniform coverage regardless of count.
 * Each point is evenly spaced on the sphere surface.
 *
 * @param index - Point index (0 to total-1)
 * @param total - Total number of points to distribute
 * @returns Normalized direction vector on unit sphere
 */
function getFibonacciSpherePoint(index: number, total: number): THREE.Vector3 {
  if (total <= 1) {
    // Single point goes to top of sphere
    return new THREE.Vector3(0, 1, 0);
  }

  // Golden angle in radians (137.5077... degrees)
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  // Y goes from 1 to -1 (top to bottom of sphere)
  const y = 1 - (index / (total - 1)) * 2;
  const radiusAtY = Math.sqrt(1 - y * y);

  const theta = goldenAngle * index;

  const x = Math.cos(theta) * radiusAtY;
  const z = Math.sin(theta) * radiusAtY;

  return new THREE.Vector3(x, y, z);
}

export interface ParticleSwarmProps {
  /**
   * Users to display as shards
   * Can be either:
   * - User[]: Individual users with id and mood
   * - Partial<Record<MoodId, number>>: Aggregate mood counts (legacy, converted internally)
   *
   * The number of shards dynamically matches the number of users.
   */
  users?: User[] | Partial<Record<MoodId, number>>;
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
  /** Minimum shard size (prevents tiny shards at high counts) @default 0.15 */
  minShardSize?: number;
  /**
   * Performance safety cap - maximum shards to render
   * Only kicks in at very high user counts to prevent GPU overload.
   * @default 1000
   */
  performanceCap?: number;
  /**
   * ID of the current user (for "YOU" indicator)
   * When provided, the shard position can be queried via onCurrentUserPosition callback
   */
  currentUserId?: string;
  /**
   * Callback to receive the current user's shard position getter
   * Called once on mount with a function that returns the current position
   */
  onCurrentUserPositionGetter?: (getter: () => THREE.Vector3 | null) => void;
}

interface ShardData {
  mesh: THREE.Mesh;
  /** Current direction (interpolated toward targetDirection) */
  direction: THREE.Vector3;
  /** Target direction from Fibonacci redistribution */
  targetDirection: THREE.Vector3;
  geometry: THREE.IcosahedronGeometry;
  currentMood: MoodId | null;
}

/**
 * Create holographic outline material
 * Classic game dev trick: backface rendering + additive blend + glow color
 */
function createOutlineMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color('#ffffff'),
    transparent: true,
    opacity: 0.25,
    side: THREE.BackSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

/**
 * Physics state for organic breathing animation
 *
 * Each shard has:
 * - Exponential lerp: smooth approach to target with no overshoot
 * - Phase offset: subtle wave effect (particles don't move in perfect lockstep)
 * - Ambient seed: unique floating pattern per shard
 * - Rotation speeds: per-shard variation for organic feel
 * - Scale offset: subtle size variation for depth
 * - Orbit: slow orbital drift around center
 * - Perpendicular: tangent wobble for organic floating feel
 */
interface ShardPhysicsState {
  /** Current interpolated radius (lerp-smoothed, no spring physics) */
  currentRadius: number;
  /** Phase offset for subtle wave effect (0-0.04 range, 4% max) */
  phaseOffset: number;
  /** Seed for ambient floating motion (unique per shard) */
  ambientSeed: number;
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
}

/**
 * Lerp speed for breathing animation
 * Controls how quickly particles follow the ECS target radius.
 */
const BREATH_LERP_SPEED = 6.0;

/**
 * Lerp speed for position redistribution
 * How quickly shards move to new Fibonacci positions when count changes.
 * Lower = smoother but slower transitions.
 */
const POSITION_LERP_SPEED = 3.0;

/**
 * Ambient floating motion constants
 */
const AMBIENT_SCALE = 0.08;
const AMBIENT_Y_SCALE = 0.04;

/**
 * Orbital drift constants
 */
const ORBIT_BASE_SPEED = 0.015;
const ORBIT_SPEED_VARIATION = 0.01;

/**
 * Perpendicular wobble constants
 */
const PERPENDICULAR_AMPLITUDE = 0.03;
const PERPENDICULAR_FREQUENCY = 0.35;

/**
 * Phase stagger for wave effect (4% of breath cycle)
 */
const MAX_PHASE_OFFSET = 0.04;

/**
 * Reusable Vector3 objects for animation loop
 * Pre-allocated to avoid garbage collection pressure
 */
const _tempOrbitedDir = new THREE.Vector3();
const _tempTangent1 = new THREE.Vector3();
const _tempTangent2 = new THREE.Vector3();
const _tempAmbient = new THREE.Vector3();
const _yAxis = new THREE.Vector3(0, 1, 0);
const _tempLerpDir = new THREE.Vector3();

/**
 * Normalize users input to User[] format
 * Handles both new format (User[]) and legacy format (mood counts)
 */
function normalizeUsers(users: User[] | Partial<Record<MoodId, number>> | undefined): User[] {
  if (!users) return [];

  // Check if it's an array (new format)
  if (Array.isArray(users)) {
    return users;
  }

  // Legacy format: convert mood counts to users
  return moodCountsToUsers(users);
}

export function ParticleSwarm({
  users,
  baseRadius = 4.5,
  baseShardSize = 4.0,
  globeRadius = 1.5,
  buffer = 0.3,
  maxShardSize = 0.6,
  minShardSize = 0.15,
  performanceCap = 1000,
  currentUserId,
  onCurrentUserPositionGetter,
}: ParticleSwarmProps) {
  const world = useWorld();
  const groupRef = useRef<THREE.Group>(null);
  const shardsRef = useRef<ShardData[]>([]);
  const physicsRef = useRef<ShardPhysicsState[]>([]);
  // Reusable vector for returning current user position
  const currentUserPositionRef = useRef(new THREE.Vector3());

  // Holographic outline for current user's shard
  const outlineMeshRef = useRef<THREE.Mesh | null>(null);
  const outlineMaterialRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const outlineGeometryRef = useRef<THREE.IcosahedronGeometry | null>(null);

  // Slot manager for stable user ordering
  const slotManagerRef = useRef<SlotManager | null>(null);
  if (!slotManagerRef.current) {
    slotManagerRef.current = new SlotManager();
  }

  // Pending users buffer (updated on prop change, reconciled during hold)
  const pendingUsersRef = useRef<User[]>([]);

  // Track previous hold phase to detect transitions
  const wasInHoldRef = useRef(false);

  // Track previous active count for position redistribution
  const prevActiveCountRef = useRef(0);

  // Normalize users input
  const normalizedUsers = useMemo(() => normalizeUsers(users), [users]);

  // Update pending users when props change
  useEffect(() => {
    pendingUsersRef.current = normalizedUsers;
  }, [normalizedUsers]);

  // Calculate shard size based on current user count
  // (dynamically adjusts, but clamped to min/max)
  const calculateShardSize = useCallback(
    (count: number) => {
      if (count === 0) return maxShardSize;
      const calculated = baseShardSize / Math.sqrt(count);
      return Math.min(Math.max(calculated, minShardSize), maxShardSize);
    },
    [baseShardSize, maxShardSize, minShardSize],
  );

  const minOrbitRadius = useMemo(
    () => globeRadius + maxShardSize + buffer,
    [globeRadius, maxShardSize, buffer],
  );

  // Create shared material (will be swapped by RefractionPipeline)
  const material = useMemo(() => createFrostedGlassMaterial(), []);

  // Create a shard at a specific index
  const createShardAtIndex = useCallback(
    (index: number, shardSize: number, totalForDistribution: number) => {
      const geometry = new THREE.IcosahedronGeometry(shardSize, 0);
      applyVertexColors(geometry, DEFAULT_COLOR);

      // Use actual total for Fibonacci distribution
      const direction = getFibonacciSpherePoint(index, totalForDistribution);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.useRefraction = true;
      mesh.position.copy(direction).multiplyScalar(baseRadius);
      mesh.lookAt(0, 0, 0);
      mesh.frustumCulled = false;

      // Initialize physics state
      const goldenRatio = (1 + Math.sqrt(5)) / 2;
      const rotSeedX = (index * 1.618 + 0.3) % 1;
      const rotSeedY = (index * 2.236 + 0.7) % 1;
      const scaleSeed = (index * goldenRatio + 0.5) % 1;
      const orbitSeed = (index * Math.PI + 0.1) % 1;

      const shard: ShardData = {
        mesh,
        direction: direction.clone(),
        targetDirection: direction.clone(),
        geometry,
        currentMood: null,
      };

      const physics: ShardPhysicsState = {
        currentRadius: baseRadius,
        phaseOffset: ((index * goldenRatio) % 1) * MAX_PHASE_OFFSET,
        ambientSeed: index * 137.508,
        rotationSpeedX: 0.7 + rotSeedX * 0.6,
        rotationSpeedY: 0.7 + rotSeedY * 0.6,
        baseScaleOffset: 0.9 + scaleSeed * 0.2,
        orbitAngle: 0,
        orbitSpeed: ORBIT_BASE_SPEED + (orbitSeed - 0.5) * 2 * ORBIT_SPEED_VARIATION,
        wobbleSeed: index * Math.E,
      };

      return { shard, physics };
    },
    [material, baseRadius],
  );

  // Ensure we have enough shards for all users (grows dynamically)
  const ensureShardCapacity = useCallback(
    (requiredCount: number) => {
      const group = groupRef.current;
      const shards = shardsRef.current;
      const physics = physicsRef.current;
      if (!group || requiredCount <= shards.length) return;

      // Apply performance cap only at very high counts
      const cappedCount = Math.min(requiredCount, performanceCap);
      const shardSize = calculateShardSize(cappedCount);

      for (let i = shards.length; i < cappedCount; i++) {
        // New shards use current active count for initial distribution
        const { shard, physics: physicsState } = createShardAtIndex(i, shardSize, cappedCount);
        group.add(shard.mesh);
        shard.mesh.scale.setScalar(0); // Start invisible
        shards.push(shard);
        physics.push(physicsState);
      }
    },
    [calculateShardSize, createShardAtIndex, performanceCap],
  );

  /**
   * Redistribute Fibonacci positions for stable slots (entering + active)
   * Called when count changes to maintain uniform sphere coverage
   * Exiting slots keep their position while fading out
   */
  const redistributePositions = useCallback((stableCount: number) => {
    const shards = shardsRef.current;
    if (stableCount === 0) return;

    // Update target directions for stable shards (not exiting)
    // Each stable slot gets a Fibonacci position based on its rank
    let stableIndex = 0;
    const slotManager = slotManagerRef.current;
    if (!slotManager) return;

    const slots = slotManager.slots;
    for (let i = 0; i < slots.length && i < shards.length; i++) {
      const slot = slots[i];
      const shard = shards[i];

      if (slot.state === 'entering' || slot.state === 'active') {
        // Stable slot - assign Fibonacci position based on rank among stable slots
        const newDirection = getFibonacciSpherePoint(stableIndex, stableCount);
        shard.targetDirection.copy(newDirection);
        stableIndex++;
      } else if (slot.state === 'exiting') {
        // Exiting slot - keep current position while fading out
        // Don't update targetDirection so it stays in place
      } else {
        // Empty slots keep their current direction (won't be visible anyway)
        shard.targetDirection.copy(shard.direction);
      }
    }
  }, []);

  // Initialize - no pre-allocation, shards created dynamically based on user count
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    // Clear previous children
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    // Start with empty arrays - shards created on demand
    shardsRef.current = [];
    physicsRef.current = [];

    // Initial reconciliation with current users
    const slotManager = slotManagerRef.current;
    if (slotManager) {
      const userCount = pendingUsersRef.current.length;

      // Create shards for initial users
      if (userCount > 0) {
        ensureShardCapacity(userCount);
      }

      slotManager.reconcile(pendingUsersRef.current);

      // Set initial stable count and redistribute
      const stableCount = slotManager.stableCount;
      prevActiveCountRef.current = stableCount;
      if (stableCount > 0) {
        redistributePositions(stableCount);
        // Snap to target positions immediately on init
        for (const shard of shardsRef.current) {
          shard.direction.copy(shard.targetDirection);
        }
      }
    }

    return () => {
      for (const shard of shardsRef.current) {
        shard.geometry.dispose();
        group.remove(shard.mesh);
      }
    };
  }, [ensureShardCapacity, redistributePositions]);

  // Cleanup material on unmount
  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  // Create holographic outline mesh for current user
  useEffect(() => {
    const group = groupRef.current;
    if (!group || !currentUserId) return;

    // Create outline geometry and material
    const shardSize = calculateShardSize(pendingUsersRef.current.length || 1);
    const outlineScale = 1.15; // Slightly larger than shard
    const geometry = new THREE.IcosahedronGeometry(shardSize * outlineScale, 0);
    const material = createOutlineMaterial();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.visible = false; // Hidden until user shard is positioned
    mesh.frustumCulled = false;

    outlineGeometryRef.current = geometry;
    outlineMaterialRef.current = material;
    outlineMeshRef.current = mesh;
    group.add(mesh);

    return () => {
      geometry.dispose();
      material.dispose();
      if (outlineMeshRef.current) {
        group.remove(outlineMeshRef.current);
      }
      outlineMeshRef.current = null;
      outlineMaterialRef.current = null;
      outlineGeometryRef.current = null;
    };
  }, [currentUserId, calculateShardSize]);

  // Register current user position getter
  useEffect(() => {
    if (!onCurrentUserPositionGetter || !currentUserId) return;

    const getPosition = (): THREE.Vector3 | null => {
      const slotManager = slotManagerRef.current;
      if (!slotManager) return null;

      const slot = slotManager.getSlotByUserId(currentUserId);
      if (!slot || slot.state === 'empty') return null;

      const shard = shardsRef.current[slot.index];
      if (!shard) return null;

      // Copy mesh world position to our reusable vector
      shard.mesh.getWorldPosition(currentUserPositionRef.current);
      return currentUserPositionRef.current;
    };

    onCurrentUserPositionGetter(getPosition);
  }, [onCurrentUserPositionGetter, currentUserId]);

  // Animation loop
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Particle physics simulation requires multiple force calculations (spring, wind, jitter, orbit) and slot lifecycle management - refactoring would reduce readability
  useFrame((state, delta) => {
    const currentShards = shardsRef.current;
    const physics = physicsRef.current;
    const slotManager = slotManagerRef.current;
    if (!slotManager || currentShards.length === 0) return;

    const clampedDelta = Math.min(delta, 0.1);
    const time = state.clock.elapsedTime;

    // Get breathing state from ECS
    // Query for all traits we access to ensure entity has them
    let targetRadius = baseRadius;
    let currentBreathPhase = 0;
    let currentPhaseType = 0;
    const breathEntity = world.queryFirst(orbitRadius, breathPhase, phaseType);
    if (breathEntity) {
      targetRadius = breathEntity.get(orbitRadius)?.value ?? baseRadius;
      currentBreathPhase = breathEntity.get(breathPhase)?.value ?? 0;
      currentPhaseType = breathEntity.get(phaseType)?.value ?? 0;
    }

    // Check if we should reconcile (during hold phase transition)
    const isInHold = isHoldPhase(currentPhaseType);
    const elapsedSeconds = Date.now() / 1000;
    const cycleIndex = getBreathingCycleIndex(elapsedSeconds, BREATH_TOTAL_CYCLE);

    // Reconcile only on transition INTO hold phase, once per cycle
    if (isInHold && !wasInHoldRef.current && slotManager.shouldReconcile(cycleIndex)) {
      // Ensure we have enough shards
      const requiredSlots = pendingUsersRef.current.length;
      ensureShardCapacity(requiredSlots);

      // Perform reconciliation
      slotManager.reconcile(pendingUsersRef.current);
      slotManager.markReconciled(cycleIndex);

      // Check if stable count changed - redistribute positions
      // Use stableCount (entering + active) so remaining shards move immediately
      // when a user leaves, rather than waiting for exit animation to complete
      const newStableCount = slotManager.stableCount;
      if (newStableCount !== prevActiveCountRef.current) {
        redistributePositions(newStableCount);
        prevActiveCountRef.current = newStableCount;
      }

      // Update shard colors based on slot moods
      const slots = slotManager.slots;
      for (let i = 0; i < slots.length && i < currentShards.length; i++) {
        const slot = slots[i];
        const shard = currentShards[i];

        if (slot.mood && slot.mood !== shard.currentMood) {
          const color = MOOD_TO_COLOR[slot.mood] ?? DEFAULT_COLOR;
          updateVertexColors(shard.geometry, color);
          shard.currentMood = slot.mood;
        }
      }
    }
    wasInHoldRef.current = isInHold;

    // Update slot animations
    slotManager.updateAnimations(clampedDelta);

    // Update shader uniforms
    if (material.uniforms) {
      material.uniforms.breathPhase.value = currentBreathPhase;
      material.uniforms.time.value = time;
    }

    // Position lerp factor for smooth redistribution
    const positionLerpFactor = 1 - Math.exp(-POSITION_LERP_SPEED * clampedDelta);

    // Update each shard with physics and slot scale
    const slots = slotManager.slots;
    for (let i = 0; i < currentShards.length; i++) {
      const shard = currentShards[i];
      const shardState = physics[i];
      const slot = i < slots.length ? slots[i] : null;

      // Get slot scale (0 if no slot or empty)
      const slotScale = slot && slot.state !== 'empty' ? slot.scale : 0;

      // Skip physics if slot is empty and scale is 0
      if (slotScale === 0 && shard.mesh.scale.x === 0) {
        continue;
      }

      // Lerp direction toward target (smooth position redistribution)
      _tempLerpDir.copy(shard.targetDirection).sub(shard.direction);
      if (_tempLerpDir.lengthSq() > 0.0001) {
        shard.direction.addScaledVector(_tempLerpDir, positionLerpFactor);
        shard.direction.normalize(); // Keep on unit sphere
      }

      // Physics calculations (same as before)
      const phaseOffsetAmount = shardState.phaseOffset * (baseRadius - minOrbitRadius);
      const targetWithOffset = targetRadius + phaseOffsetAmount;
      const clampedTarget = Math.max(targetWithOffset, minOrbitRadius);

      const lerpFactor = 1 - Math.exp(-BREATH_LERP_SPEED * clampedDelta);
      shardState.currentRadius += (clampedTarget - shardState.currentRadius) * lerpFactor;

      shardState.orbitAngle += shardState.orbitSpeed * clampedDelta;
      _tempOrbitedDir.copy(shard.direction).applyAxisAngle(_yAxis, shardState.orbitAngle);

      _tempTangent1.copy(_tempOrbitedDir).cross(_yAxis).normalize();
      if (_tempTangent1.lengthSq() < 0.001) {
        _tempTangent1.set(1, 0, 0);
      }
      _tempTangent2.copy(_tempOrbitedDir).cross(_tempTangent1).normalize();

      const wobblePhase = time * PERPENDICULAR_FREQUENCY * Math.PI * 2 + shardState.wobbleSeed;
      const wobble1 = Math.sin(wobblePhase) * PERPENDICULAR_AMPLITUDE;
      const wobble2 = Math.cos(wobblePhase * 0.7) * PERPENDICULAR_AMPLITUDE * 0.6;

      const seed = shardState.ambientSeed;
      _tempAmbient.set(
        Math.sin(time * 0.4 + seed) * AMBIENT_SCALE,
        Math.sin(time * 0.3 + seed * 0.7) * AMBIENT_Y_SCALE,
        Math.cos(time * 0.35 + seed * 1.3) * AMBIENT_SCALE,
      );

      shard.mesh.position
        .copy(_tempOrbitedDir)
        .multiplyScalar(shardState.currentRadius)
        .addScaledVector(_tempTangent1, wobble1)
        .addScaledVector(_tempTangent2, wobble2)
        .add(_tempAmbient);

      shard.mesh.rotation.x += 0.002 * shardState.rotationSpeedX;
      shard.mesh.rotation.y += 0.003 * shardState.rotationSpeedY;

      // Final scale: slot scale × breath scale × base offset
      const breathScale = 1.0 + currentBreathPhase * 0.05;
      const finalScale = slotScale * shardState.baseScaleOffset * breathScale;
      shard.mesh.scale.setScalar(finalScale);
    }

    // Update holographic outline for current user
    if (outlineMeshRef.current && currentUserId && slotManager) {
      const userSlot = slotManager.getSlotByUserId(currentUserId);
      if (userSlot && userSlot.state !== 'empty' && userSlot.index < currentShards.length) {
        const userShard = currentShards[userSlot.index];
        const outlineMesh = outlineMeshRef.current;

        // Match position and rotation of user's shard
        outlineMesh.position.copy(userShard.mesh.position);
        outlineMesh.rotation.copy(userShard.mesh.rotation);

        // Scale slightly larger than shard with breathing pulse
        const shardScale = userShard.mesh.scale.x;
        const outlineScale = shardScale * 1.08;
        outlineMesh.scale.setScalar(outlineScale);

        // Subtle pulse on outline opacity
        const pulse = 0.2 + 0.1 * Math.sin(time * 2.0);
        if (outlineMaterialRef.current) {
          outlineMaterialRef.current.opacity = pulse;
        }

        outlineMesh.visible = shardScale > 0.01;
      } else {
        outlineMeshRef.current.visible = false;
      }
    }
  });

  return <group ref={groupRef} name="Particle Swarm" />;
}

export default ParticleSwarm;
