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
 * Performance: Uses InstancedMesh for single draw call (1 draw call for all particles)
 * Previously used separate Mesh objects (300 draw calls for 300 particles)
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

  // ==========================================
  // BREATHING EFFECTS - Enhanced animation
  // ==========================================

  /** Minimum scale during exhale @default 0.85 */
  scaleMin?: number;
  /** Maximum scale during inhale @default 1.2 */
  scaleMax?: number;
  /** Minimum opacity during exhale @default 0.7 */
  opacityMin?: number;
  /** Maximum opacity during inhale @default 1.0 */
  opacityMax?: number;

  // Curl noise flow
  /** Enable curl noise flow @default true */
  enableCurlNoise?: boolean;
  /** Curl noise displacement strength @default 0.15 */
  curlNoiseStrength?: number;
  /** Curl noise animation speed @default 0.3 */
  curlNoiseSpeed?: number;
}

/**
 * Per-instance state for physics simulation
 */
interface InstanceState {
  /** Current direction (interpolated toward targetDirection) */
  direction: THREE.Vector3;
  /** Target direction from Fibonacci redistribution */
  targetDirection: THREE.Vector3;
  /** Current mood for color tracking */
  currentMood: MoodId | null;
  /** Current interpolated radius (lerp-smoothed) */
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
  /** Accumulated rotation X */
  rotationX: number;
  /** Accumulated rotation Y */
  rotationY: number;
}

/**
 * Lerp speed for breathing animation
 * Controls how quickly particles follow the ECS target radius.
 */
const BREATH_LERP_SPEED = 6.0;

/**
 * Lerp speed for position redistribution
 * How quickly shards move to new Fibonacci positions when count changes.
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
 * Reusable objects for animation loop (pre-allocated to avoid GC pressure)
 */
const _tempMatrix = new THREE.Matrix4();
const _tempPosition = new THREE.Vector3();
const _tempQuaternion = new THREE.Quaternion();
const _tempScale = new THREE.Vector3();
const _tempEuler = new THREE.Euler();
const _tempOrbitedDir = new THREE.Vector3();
const _tempTangent1 = new THREE.Vector3();
const _tempTangent2 = new THREE.Vector3();
const _tempAmbient = new THREE.Vector3();
const _yAxis = new THREE.Vector3(0, 1, 0);
const _tempLerpDir = new THREE.Vector3();
const _tempCurl = new THREE.Vector3();

/**
 * Simplex-style 3D noise for curl calculation
 * Simplified implementation for performance
 */
function noise3D(x: number, y: number, z: number): number {
  // Simple hash-based noise
  const hash = (n: number) => {
    const s = Math.sin(n) * 43758.5453;
    return s - Math.floor(s);
  };

  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);

  const fx = x - ix;
  const fy = y - iy;
  const fz = z - iz;

  // Smooth interpolation
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const uz = fz * fz * (3 - 2 * fz);

  // Hash corners
  const n000 = hash(ix + iy * 57 + iz * 113);
  const n100 = hash(ix + 1 + iy * 57 + iz * 113);
  const n010 = hash(ix + (iy + 1) * 57 + iz * 113);
  const n110 = hash(ix + 1 + (iy + 1) * 57 + iz * 113);
  const n001 = hash(ix + iy * 57 + (iz + 1) * 113);
  const n101 = hash(ix + 1 + iy * 57 + (iz + 1) * 113);
  const n011 = hash(ix + (iy + 1) * 57 + (iz + 1) * 113);
  const n111 = hash(ix + 1 + (iy + 1) * 57 + (iz + 1) * 113);

  // Trilinear interpolation
  const nx00 = n000 + ux * (n100 - n000);
  const nx10 = n010 + ux * (n110 - n010);
  const nx01 = n001 + ux * (n101 - n001);
  const nx11 = n011 + ux * (n111 - n011);

  const nxy0 = nx00 + uy * (nx10 - nx00);
  const nxy1 = nx01 + uy * (nx11 - nx01);

  return (nxy0 + uz * (nxy1 - nxy0)) * 2 - 1; // Map to -1..1
}

/**
 * Calculate curl noise displacement
 * Creates divergence-free (swirling) motion
 */
function curlNoise(x: number, y: number, z: number, time: number, out: THREE.Vector3): void {
  const eps = 0.0001;
  const t = time * 0.5;

  // Partial derivatives
  const dx =
    (noise3D(x, y + eps, z + t) - noise3D(x, y - eps, z + t)) / (2 * eps) -
    (noise3D(x, y, z + eps + t) - noise3D(x, y, z - eps + t)) / (2 * eps);

  const dy =
    (noise3D(x, y, z + eps + t) - noise3D(x, y, z - eps + t)) / (2 * eps) -
    (noise3D(x + eps, y, z + t) - noise3D(x - eps, y, z + t)) / (2 * eps);

  const dz =
    (noise3D(x + eps, y, z + t) - noise3D(x - eps, y, z + t)) / (2 * eps) -
    (noise3D(x, y + eps, z + t) - noise3D(x, y - eps, z + t)) / (2 * eps);

  out.set(dx, dy, dz);
}

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

/**
 * Initialize instance state with physics parameters
 */
function createInstanceState(index: number, baseRadius: number): InstanceState {
  const goldenRatio = (1 + Math.sqrt(5)) / 2;
  const rotSeedX = (index * 1.618 + 0.3) % 1;
  const rotSeedY = (index * 2.236 + 0.7) % 1;
  const scaleSeed = (index * goldenRatio + 0.5) % 1;
  const orbitSeed = (index * Math.PI + 0.1) % 1;

  const direction = getFibonacciSpherePoint(index, 1);

  return {
    direction: direction.clone(),
    targetDirection: direction.clone(),
    currentMood: null,
    currentRadius: baseRadius,
    phaseOffset: ((index * goldenRatio) % 1) * MAX_PHASE_OFFSET,
    ambientSeed: index * 137.508,
    rotationSpeedX: 0.7 + rotSeedX * 0.6,
    rotationSpeedY: 0.7 + rotSeedY * 0.6,
    baseScaleOffset: 0.9 + scaleSeed * 0.2,
    orbitAngle: 0,
    orbitSpeed: ORBIT_BASE_SPEED + (orbitSeed - 0.5) * 2 * ORBIT_SPEED_VARIATION,
    wobbleSeed: index * Math.E,
    rotationX: 0,
    rotationY: 0,
  };
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
  // Breathing effects
  scaleMin = 0.85,
  scaleMax = 1.2,
  opacityMin = 0.7,
  opacityMax = 1.0,
  // Curl noise
  enableCurlNoise = true,
  curlNoiseStrength = 0.15,
  curlNoiseSpeed = 0.3,
}: ParticleSwarmProps) {
  const world = useWorld();
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
  const instanceStatesRef = useRef<InstanceState[]>([]);

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

  // Debug: Log when users prop changes
  useEffect(() => {
    console.log('[ParticleSwarm] users prop changed:', {
      rawUsersLength: Array.isArray(users) ? users.length : 'not array',
      normalizedLength: normalizedUsers.length,
      sampleUser: normalizedUsers[0],
    });
  }, [users, normalizedUsers]);

  // Update pending users when props change
  useEffect(() => {
    pendingUsersRef.current = normalizedUsers;
    console.log('[ParticleSwarm] pendingUsersRef updated:', normalizedUsers.length);
  }, [normalizedUsers]);

  // Calculate minimum orbit radius based on globe + shard size
  const minOrbitRadius = useMemo(
    () => globeRadius + maxShardSize + buffer,
    [globeRadius, maxShardSize, buffer],
  );

  // Calculate shard size based on current user count
  const shardSize = useMemo(() => {
    const count = normalizedUsers.length || 1;
    const calculated = baseShardSize / Math.sqrt(count);
    return Math.min(Math.max(calculated, minShardSize), maxShardSize);
  }, [normalizedUsers.length, baseShardSize, minShardSize, maxShardSize]);

  // Create shared geometry (single geometry for all instances)
  const geometry = useMemo(() => {
    return new THREE.IcosahedronGeometry(shardSize, 0);
  }, [shardSize]);

  // Create shared material with instancing support
  const material = useMemo(() => createFrostedGlassMaterial(true), []);

  /**
   * Redistribute Fibonacci positions for stable slots (entering + active)
   * Memoized to avoid useEffect re-runs - only depends on refs
   */
  const redistributePositions = useCallback((stableCount: number) => {
    const states = instanceStatesRef.current;
    const slotManager = slotManagerRef.current;
    if (!slotManager || stableCount === 0) return;

    let stableIndex = 0;
    const slots = slotManager.slots;

    for (let i = 0; i < slots.length && i < states.length; i++) {
      const slot = slots[i];
      const state = states[i];

      if (slot.state === 'entering' || slot.state === 'active') {
        const newDirection = getFibonacciSpherePoint(stableIndex, stableCount);
        state.targetDirection.copy(newDirection);
        stableIndex++;
      } else if (slot.state === 'exiting') {
        // Exiting slot - keep current position while fading out
      } else {
        // Empty slots keep their current direction
        state.targetDirection.copy(state.direction);
      }
    }
  }, []);

  // Initialize instance states
  useEffect(() => {
    const states: InstanceState[] = [];
    for (let i = 0; i < performanceCap; i++) {
      states.push(createInstanceState(i, baseRadius));
    }
    instanceStatesRef.current = states;
  }, [performanceCap, baseRadius]);

  // Initialize the InstancedMesh with default matrices and colors
  // biome-ignore lint/correctness/useExhaustiveDependencies: geometry/material MUST be dependencies because r3f recreates the InstancedMesh when args change, requiring re-initialization
  useEffect(() => {
    const mesh = instancedMeshRef.current;
    if (!mesh) return;

    // Initialize all instances to scale 0 (invisible)
    _tempScale.setScalar(0);
    _tempQuaternion.identity();

    for (let i = 0; i < performanceCap; i++) {
      const state = instanceStatesRef.current[i];
      if (state) {
        _tempPosition.copy(state.direction).multiplyScalar(baseRadius);
        _tempMatrix.compose(_tempPosition, _tempQuaternion, _tempScale);
        mesh.setMatrixAt(i, _tempMatrix);
        mesh.setColorAt(i, DEFAULT_COLOR);
      }
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }

    // Initial reconciliation
    // NOTE: Use normalizedUsers directly here, NOT pendingUsersRef.current
    // pendingUsersRef is updated in a separate useEffect that may not have run yet
    // This ensures the initial render has the correct number of particles
    const slotManager = slotManagerRef.current;
    const usersForInit =
      pendingUsersRef.current.length > 0 ? pendingUsersRef.current : normalizedUsers;

    console.log('[ParticleSwarm] Init effect running:', {
      pendingUsersLength: pendingUsersRef.current.length,
      normalizedUsersLength: normalizedUsers.length,
      usersForInitLength: usersForInit.length,
      meshExists: !!mesh,
      slotManagerExists: !!slotManager,
    });

    if (slotManager) {
      slotManager.reconcile(usersForInit);
      const stableCount = slotManager.stableCount;
      prevActiveCountRef.current = stableCount;

      console.log('[ParticleSwarm] After reconcile:', {
        stableCount,
        slotsLength: slotManager.slots.length,
        firstSlot: slotManager.slots[0],
      });

      if (stableCount > 0) {
        redistributePositions(stableCount);
        // Snap to target positions immediately on init
        for (const state of instanceStatesRef.current) {
          state.direction.copy(state.targetDirection);
        }
      }
    }
  }, [performanceCap, baseRadius, redistributePositions, geometry, material]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  // Debug frame counter for throttled logging
  const frameCountRef = useRef(0);

  // Animation loop
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Physics simulation requires multiple force calculations and slot lifecycle management
  useFrame((state, delta) => {
    const mesh = instancedMeshRef.current;
    const states = instanceStatesRef.current;
    const slotManager = slotManagerRef.current;
    if (!mesh || !slotManager || states.length === 0) return;

    const clampedDelta = Math.min(delta, 0.1);
    const time = state.clock.elapsedTime;

    // Throttled debug log (every 120 frames ~2 seconds at 60fps)
    frameCountRef.current++;
    if (frameCountRef.current % 120 === 1) {
      const nonEmptySlots = slotManager.slots.filter((s) => s.state !== 'empty');
      // Find first slot with scale > 0
      const firstVisibleSlot = slotManager.slots.find((s) => s.scale > 0.01);
      const firstVisibleIndex = firstVisibleSlot ? slotManager.slots.indexOf(firstVisibleSlot) : -1;
      // Get corresponding instance state
      const firstVisibleState = firstVisibleIndex >= 0 ? states[firstVisibleIndex] : null;

      console.log('[ParticleSwarm] Frame update:', {
        frame: frameCountRef.current,
        stableCount: slotManager.stableCount,
        nonEmptySlots: nonEmptySlots.length,
        pendingUsers: pendingUsersRef.current.length,
        meshCount: mesh.count,
        slotsArrayLength: slotManager.slots.length,
        firstVisibleIndex,
        firstVisibleSlot: firstVisibleSlot
          ? { state: firstVisibleSlot.state, scale: firstVisibleSlot.scale }
          : null,
        firstVisibleState: firstVisibleState
          ? {
              direction: firstVisibleState.direction.toArray(),
              currentRadius: firstVisibleState.currentRadius,
            }
          : null,
      });
    }

    // Get breathing state from ECS
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
      slotManager.reconcile(pendingUsersRef.current);
      slotManager.markReconciled(cycleIndex);

      const newStableCount = slotManager.stableCount;
      if (newStableCount !== prevActiveCountRef.current) {
        redistributePositions(newStableCount);
        prevActiveCountRef.current = newStableCount;
      }

      // Update instance colors based on slot moods
      const slots = slotManager.slots;
      for (let i = 0; i < slots.length && i < states.length; i++) {
        const slot = slots[i];
        const instanceState = states[i];

        if (slot.mood && slot.mood !== instanceState.currentMood) {
          const color = MOOD_TO_COLOR[slot.mood] ?? DEFAULT_COLOR;
          mesh.setColorAt(i, color);
          instanceState.currentMood = slot.mood;
        }
      }
      if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
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

    // Update each instance
    const slots = slotManager.slots;
    let visibleCount = 0;

    for (let i = 0; i < states.length; i++) {
      const instanceState = states[i];
      const slot = i < slots.length ? slots[i] : null;

      // Get slot scale (0 if no slot or empty)
      const slotScale = slot && slot.state !== 'empty' ? slot.scale : 0;

      // Track visible instances for count optimization
      if (slotScale > 0.001) {
        visibleCount = i + 1;
      }

      // Skip physics if invisible
      if (slotScale === 0) {
        // Set scale to 0 to hide
        _tempScale.setScalar(0);
        mesh.getMatrixAt(i, _tempMatrix);
        _tempMatrix.decompose(_tempPosition, _tempQuaternion, _tempScale);
        _tempScale.setScalar(0);
        _tempMatrix.compose(_tempPosition, _tempQuaternion, _tempScale);
        mesh.setMatrixAt(i, _tempMatrix);
        continue;
      }

      // Lerp direction toward target (smooth position redistribution)
      _tempLerpDir.copy(instanceState.targetDirection).sub(instanceState.direction);
      if (_tempLerpDir.lengthSq() > 0.0001) {
        instanceState.direction.addScaledVector(_tempLerpDir, positionLerpFactor);
        instanceState.direction.normalize();
      }

      // Physics calculations
      const phaseOffsetAmount = instanceState.phaseOffset * (baseRadius - minOrbitRadius);
      const targetWithOffset = targetRadius + phaseOffsetAmount;
      const clampedTarget = Math.max(targetWithOffset, minOrbitRadius);

      const lerpFactor = 1 - Math.exp(-BREATH_LERP_SPEED * clampedDelta);
      instanceState.currentRadius += (clampedTarget - instanceState.currentRadius) * lerpFactor;

      instanceState.orbitAngle += instanceState.orbitSpeed * clampedDelta;
      _tempOrbitedDir
        .copy(instanceState.direction)
        .applyAxisAngle(_yAxis, instanceState.orbitAngle);

      _tempTangent1.copy(_tempOrbitedDir).cross(_yAxis).normalize();
      if (_tempTangent1.lengthSq() < 0.001) {
        _tempTangent1.set(1, 0, 0);
      }
      _tempTangent2.copy(_tempOrbitedDir).cross(_tempTangent1).normalize();

      const wobblePhase = time * PERPENDICULAR_FREQUENCY * Math.PI * 2 + instanceState.wobbleSeed;
      const wobble1 = Math.sin(wobblePhase) * PERPENDICULAR_AMPLITUDE;
      const wobble2 = Math.cos(wobblePhase * 0.7) * PERPENDICULAR_AMPLITUDE * 0.6;

      const seed = instanceState.ambientSeed;
      _tempAmbient.set(
        Math.sin(time * 0.4 + seed) * AMBIENT_SCALE,
        Math.sin(time * 0.3 + seed * 0.7) * AMBIENT_Y_SCALE,
        Math.cos(time * 0.35 + seed * 1.3) * AMBIENT_SCALE,
      );

      // Calculate final position
      _tempPosition
        .copy(_tempOrbitedDir)
        .multiplyScalar(instanceState.currentRadius)
        .addScaledVector(_tempTangent1, wobble1)
        .addScaledVector(_tempTangent2, wobble2)
        .add(_tempAmbient);

      // Add curl noise displacement (organic swirling motion)
      if (enableCurlNoise && curlNoiseStrength > 0) {
        const curlTime = time * curlNoiseSpeed;
        curlNoise(
          _tempPosition.x * 0.3,
          _tempPosition.y * 0.3,
          _tempPosition.z * 0.3,
          curlTime,
          _tempCurl,
        );
        // Modulate curl strength by breath phase - more swirling during transitions
        const breathMod = 0.5 + Math.sin(currentBreathPhase * Math.PI) * 0.5;
        _tempPosition.addScaledVector(_tempCurl, curlNoiseStrength * breathMod);
      }

      // Update rotation
      instanceState.rotationX += 0.002 * instanceState.rotationSpeedX;
      instanceState.rotationY += 0.003 * instanceState.rotationSpeedY;
      _tempEuler.set(instanceState.rotationX, instanceState.rotationY, 0);
      _tempQuaternion.setFromEuler(_tempEuler);

      // Enhanced breathing animation: scale from scaleMin to scaleMax
      const breathScale = scaleMin + currentBreathPhase * (scaleMax - scaleMin);
      const finalScale = slotScale * instanceState.baseScaleOffset * breathScale;
      _tempScale.setScalar(finalScale);

      // Compose and set matrix
      _tempMatrix.compose(_tempPosition, _tempQuaternion, _tempScale);
      mesh.setMatrixAt(i, _tempMatrix);
    }

    // Update instance count for rendering optimization
    mesh.count = Math.max(1, visibleCount);
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={instancedMeshRef}
      args={[geometry, material, performanceCap]}
      frustumCulled={false}
      name="Particle Swarm"
      userData={{ useRefraction: true }}
    />
  );
}

export default ParticleSwarm;
