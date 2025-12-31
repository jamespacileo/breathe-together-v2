/**
 * ParticleSwarm - Monument Valley inspired icosahedral shards
 *
 * Uses slot-based user ordering for visual stability:
 * - Users are assigned to slots in arrival order
 * - Smooth scale animations on enter (0→1) and exit (1→0)
 * - Reconciliation happens only during hold phases (once per breathing cycle)
 * - Diff-based updates minimize visual disruption
 *
 * Rendered via RefractionPipeline 3-pass FBO system.
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { BREATH_TOTAL_CYCLE, type MoodId } from '../../constants';
import { MONUMENT_VALLEY_PALETTE } from '../../lib/colors';
import { breathPhase, orbitRadius, phaseType } from '../breath/traits';
import { createFrostedGlassMaterial } from './FrostedGlassMaterial';
import { calculateCycleNumber, SlotManager, SlotState, type User } from './SlotManager';

// Convert palette to THREE.Color for rendering
const MOOD_TO_COLOR: Record<MoodId, THREE.Color> = {
  gratitude: new THREE.Color(MONUMENT_VALLEY_PALETTE.gratitude),
  presence: new THREE.Color(MONUMENT_VALLEY_PALETTE.presence),
  release: new THREE.Color(MONUMENT_VALLEY_PALETTE.release),
  connection: new THREE.Color(MONUMENT_VALLEY_PALETTE.connection),
};

// Fallback colors for empty slots (used during initialization)
const FALLBACK_COLORS = Object.values(MOOD_TO_COLOR);

/**
 * Apply per-vertex color to icosahedron geometry
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

export interface ParticleSwarmProps {
  /**
   * Array of users with unique IDs and moods.
   * The swarm dynamically adapts to this array - one shard per user.
   * Users are assigned to slots in arrival order for visual stability.
   */
  users?: User[];
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
  /** Performance ceiling - maximum supported users @default 1000 */
  maxUsers?: number;
}

interface ShardData {
  mesh: THREE.Mesh;
  direction: THREE.Vector3;
  geometry: THREE.IcosahedronGeometry;
}

/**
 * Physics state for organic breathing animation
 */
interface ShardPhysicsState {
  /** Current interpolated radius */
  currentRadius: number;
  /** Phase offset for subtle wave effect */
  phaseOffset: number;
  /** Seed for ambient floating motion */
  ambientSeed: number;
  /** Per-shard rotation speed multiplier X axis */
  rotationSpeedX: number;
  /** Per-shard rotation speed multiplier Y axis */
  rotationSpeedY: number;
  /** Base scale offset for depth variation */
  baseScaleOffset: number;
  /** Current orbit angle offset (radians) */
  orbitAngle: number;
  /** Per-shard orbit speed */
  orbitSpeed: number;
  /** Seed for perpendicular wobble phase */
  wobbleSeed: number;
  /** Current direction (animated toward target) */
  currentDirection: THREE.Vector3;
  /** Target direction for dynamic Fibonacci redistribution */
  targetDirection: THREE.Vector3;
}

// Animation constants
const BREATH_LERP_SPEED = 6.0;
const DIRECTION_LERP_SPEED = 3.0; // Slower for smooth position transitions
const AMBIENT_SCALE = 0.08;
const AMBIENT_Y_SCALE = 0.04;
const ORBIT_BASE_SPEED = 0.015;
const ORBIT_SPEED_VARIATION = 0.01;
const PERPENDICULAR_AMPLITUDE = 0.03;
const PERPENDICULAR_FREQUENCY = 0.35;
const MAX_PHASE_OFFSET = 0.04;

/**
 * Calculate Fibonacci sphere direction for uniform distribution
 *
 * @param index Position index (0 to count-1)
 * @param count Total number of points to distribute
 * @returns Normalized direction vector
 */
function calculateFibonacciDirection(index: number, count: number): THREE.Vector3 {
  if (count <= 0) return new THREE.Vector3(0, 1, 0);
  const phi = Math.acos(-1 + (2 * index + 1) / count);
  const theta = Math.sqrt(count * Math.PI) * phi;
  return new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
}

// Pre-allocated vectors for animation loop
const _tempOrbitedDir = new THREE.Vector3();
const _tempTangent1 = new THREE.Vector3();
const _tempTangent2 = new THREE.Vector3();
const _tempAmbient = new THREE.Vector3();
const _yAxis = new THREE.Vector3(0, 1, 0);

/** Performance ceiling for maximum users */
const MAX_USERS_CEILING = 1000;

export function ParticleSwarm({
  users = [],
  baseRadius = 4.5,
  baseShardSize = 4.0,
  globeRadius = 1.5,
  buffer = 0.3,
  maxShardSize = 0.6,
  maxUsers = MAX_USERS_CEILING,
}: ParticleSwarmProps) {
  const world = useWorld();
  const groupRef = useRef<THREE.Group>(null);
  const shardsRef = useRef<ShardData[]>([]);
  const physicsRef = useRef<ShardPhysicsState[]>([]);
  const slotManagerRef = useRef<SlotManager>(new SlotManager());
  const lastPhaseTypeRef = useRef<number>(-1);

  // Shard count = user count (capped at performance ceiling)
  // One shard per user, no pre-allocation
  const shardCount = useMemo(() => {
    return Math.min(users.length, maxUsers);
  }, [users.length, maxUsers]);

  // Calculate shard size based on user count
  const shardSize = useMemo(
    () => Math.min(baseShardSize / Math.sqrt(Math.max(shardCount, 1)), maxShardSize),
    [baseShardSize, shardCount, maxShardSize],
  );

  const minOrbitRadius = useMemo(
    () => globeRadius + shardSize + buffer,
    [globeRadius, shardSize, buffer],
  );

  // Create shared material
  const material = useMemo(() => createFrostedGlassMaterial(), []);

  // Initialize slot manager when shard count changes
  useEffect(() => {
    slotManagerRef.current.initialize(shardCount);
  }, [shardCount]);

  // Create shards - one per user, dynamically sized
  const shards = useMemo(() => {
    const result: ShardData[] = [];

    for (let i = 0; i < shardCount; i++) {
      const geometry = new THREE.IcosahedronGeometry(shardSize, 0);

      // Start with a fallback color (will be updated based on user mood)
      const fallbackColor = FALLBACK_COLORS[i % FALLBACK_COLORS.length];
      applyVertexColors(geometry, fallbackColor);

      // Fibonacci sphere distribution for uniform coverage
      const phi = Math.acos(-1 + (2 * i + 1) / shardCount);
      const theta = Math.sqrt(shardCount * Math.PI) * phi;
      const direction = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);

      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.useRefraction = true;
      mesh.position.copy(direction).multiplyScalar(baseRadius);
      mesh.lookAt(0, 0, 0);
      mesh.frustumCulled = false;
      mesh.visible = true; // All shards visible (one per user)

      result.push({ mesh, direction, geometry });
    }

    return result;
  }, [shardCount, shardSize, baseRadius, material]);

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
    const goldenRatio = (1 + Math.sqrt(5)) / 2;

    for (let i = 0; i < shards.length; i++) {
      const shard = shards[i];
      group.add(shard.mesh);

      // Initialize physics state
      const rotSeedX = (i * 1.618 + 0.3) % 1;
      const rotSeedY = (i * 2.236 + 0.7) % 1;
      const scaleSeed = (i * goldenRatio + 0.5) % 1;
      const orbitSeed = (i * Math.PI + 0.1) % 1;

      // Initialize direction from shard's initial Fibonacci position
      const initialDirection = shard.direction.clone();

      physicsStates.push({
        currentRadius: baseRadius,
        phaseOffset: ((i * goldenRatio) % 1) * MAX_PHASE_OFFSET,
        ambientSeed: i * 137.508,
        rotationSpeedX: 0.7 + rotSeedX * 0.6,
        rotationSpeedY: 0.7 + rotSeedY * 0.6,
        baseScaleOffset: 0.9 + scaleSeed * 0.2,
        orbitAngle: 0,
        orbitSpeed: ORBIT_BASE_SPEED + (orbitSeed - 0.5) * 2 * ORBIT_SPEED_VARIATION,
        wobbleSeed: i * Math.E,
        currentDirection: initialDirection,
        targetDirection: initialDirection.clone(),
      });
    }

    shardsRef.current = shards;
    physicsRef.current = physicsStates;

    // Cleanup on unmount
    return () => {
      for (const shard of shards) {
        shard.geometry.dispose();
        group.remove(shard.mesh);
      }
    };
  }, [shards, baseRadius]);

  // Cleanup material on unmount
  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  // Queue users for reconciliation (changes applied during hold phase)
  useEffect(() => {
    slotManagerRef.current.queueUpdate(users);
  }, [users]);

  // Animation loop
  useFrame((state, delta) => {
    const currentShards = shardsRef.current;
    const physics = physicsRef.current;
    const slotManager = slotManagerRef.current;
    if (currentShards.length === 0 || physics.length === 0) return;

    const clampedDelta = Math.min(delta, 0.1);
    const time = state.clock.elapsedTime;

    // Get breathing state from ECS
    let targetRadius = baseRadius;
    let currentBreathPhase = 0;
    let currentPhaseType = 0;
    try {
      const breathEntity = world.queryFirst(orbitRadius);
      if (breathEntity) {
        targetRadius = breathEntity.get(orbitRadius)?.value ?? baseRadius;
        currentBreathPhase = breathEntity.get(breathPhase)?.value ?? 0;
        currentPhaseType = breathEntity.get(phaseType)?.value ?? 0;
      }
    } catch {
      // Ignore ECS errors during unmount/remount in Triplex
    }

    // Detect phase transitions for reconciliation timing
    const cycleNumber = calculateCycleNumber(time, BREATH_TOTAL_CYCLE);
    const wasNotHold = lastPhaseTypeRef.current !== 1 && lastPhaseTypeRef.current !== 3;
    const isHoldNow = currentPhaseType === 1 || currentPhaseType === 3;
    const enteredHoldPhase = wasNotHold && isHoldNow;

    // Reconcile users during hold phase (once per breathing cycle)
    if (enteredHoldPhase && slotManager.shouldReconcile(currentPhaseType, cycleNumber)) {
      slotManager.reconcile(undefined, cycleNumber);
    }

    lastPhaseTypeRef.current = currentPhaseType;

    // Update slot animations
    slotManager.updateAnimations(clampedDelta);

    // Update shader material uniforms
    if (material.uniforms) {
      material.uniforms.breathPhase.value = currentBreathPhase;
      material.uniforms.time.value = time;
    }

    // Get visible slots for dynamic Fibonacci redistribution
    const visibleIndices = slotManager.getVisibleSlotIndices();
    const visibleCount = visibleIndices.length;

    // Build a map of slot index → Fibonacci index for uniform distribution
    const slotToFibonacciIndex = new Map<number, number>();
    for (let fibIdx = 0; fibIdx < visibleIndices.length; fibIdx++) {
      slotToFibonacciIndex.set(visibleIndices[fibIdx], fibIdx);
    }

    // Update each shard based on slot state
    const slots = slotManager.getSlots();
    for (let i = 0; i < currentShards.length; i++) {
      const shard = currentShards[i];
      const shardState = physics[i];
      const slot = slots[i];

      // Get slot-based scale (0 for empty, animated for entering/exiting)
      const slotScale = slotManager.getSlotScale(i);

      // Update visibility based on slot state
      shard.mesh.visible = slotScale > 0.001;

      if (!shard.mesh.visible) {
        continue; // Skip physics for invisible shards
      }

      // Update color if mood changed
      const slotMood = slotManager.getSlotMood(i);
      if (slotMood && slot?.state !== SlotState.EMPTY) {
        const moodColor = MOOD_TO_COLOR[slotMood];
        applyVertexColors(shard.geometry, moodColor);
      }

      // Calculate target Fibonacci direction based on visible count
      const fibonacciIndex = slotToFibonacciIndex.get(i);
      if (fibonacciIndex !== undefined && visibleCount > 0) {
        const newTarget = calculateFibonacciDirection(fibonacciIndex, visibleCount);
        shardState.targetDirection.copy(newTarget);
      }

      // Smoothly lerp current direction toward target direction
      const directionLerpFactor = 1 - Math.exp(-DIRECTION_LERP_SPEED * clampedDelta);
      shardState.currentDirection.lerp(shardState.targetDirection, directionLerpFactor);
      shardState.currentDirection.normalize();

      // Physics calculations
      const phaseOffsetAmount = shardState.phaseOffset * (baseRadius - minOrbitRadius);
      const targetWithOffset = targetRadius + phaseOffsetAmount;
      const clampedTarget = Math.max(targetWithOffset, minOrbitRadius);

      const lerpFactor = 1 - Math.exp(-BREATH_LERP_SPEED * clampedDelta);
      shardState.currentRadius += (clampedTarget - shardState.currentRadius) * lerpFactor;

      // Update orbital drift using current direction (not fixed shard.direction)
      shardState.orbitAngle += shardState.orbitSpeed * clampedDelta;
      _tempOrbitedDir
        .copy(shardState.currentDirection)
        .applyAxisAngle(_yAxis, shardState.orbitAngle);

      // Perpendicular wobble
      _tempTangent1.copy(_tempOrbitedDir).cross(_yAxis).normalize();
      if (_tempTangent1.lengthSq() < 0.001) {
        _tempTangent1.set(1, 0, 0);
      }
      _tempTangent2.copy(_tempOrbitedDir).cross(_tempTangent1).normalize();

      const wobblePhase = time * PERPENDICULAR_FREQUENCY * Math.PI * 2 + shardState.wobbleSeed;
      const wobble1 = Math.sin(wobblePhase) * PERPENDICULAR_AMPLITUDE;
      const wobble2 = Math.cos(wobblePhase * 0.7) * PERPENDICULAR_AMPLITUDE * 0.6;

      // Ambient floating
      const seed = shardState.ambientSeed;
      _tempAmbient.set(
        Math.sin(time * 0.4 + seed) * AMBIENT_SCALE,
        Math.sin(time * 0.3 + seed * 0.7) * AMBIENT_Y_SCALE,
        Math.cos(time * 0.35 + seed * 1.3) * AMBIENT_SCALE,
      );

      // Position composition
      shard.mesh.position
        .copy(_tempOrbitedDir)
        .multiplyScalar(shardState.currentRadius)
        .addScaledVector(_tempTangent1, wobble1)
        .addScaledVector(_tempTangent2, wobble2)
        .add(_tempAmbient);

      // Rotation
      shard.mesh.rotation.x += 0.002 * shardState.rotationSpeedX;
      shard.mesh.rotation.y += 0.003 * shardState.rotationSpeedY;

      // Scale: combine breathing pulse, depth variation, and slot animation
      const breathScale = 1.0 + currentBreathPhase * 0.05;
      const finalScale = shardState.baseScaleOffset * breathScale * slotScale;
      shard.mesh.scale.setScalar(finalScale);
    }
  });

  return <group ref={groupRef} name="Particle Swarm" />;
}

export default ParticleSwarm;
