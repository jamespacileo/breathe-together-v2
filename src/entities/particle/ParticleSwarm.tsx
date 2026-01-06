/**
 * ParticleSwarm - Monument Valley inspired icosahedral shards
 *
 * Uses slot-based user ordering for visual stability:
 * - Users maintain their slot when others join/leave
 * - Fibonacci positions dynamically redistribute based on active count
 * - Smooth scale animations (0→1 on enter, 1→0 on exit)
 * - Smooth position animations when distribution changes
 * - Diff-based reconciliation for minimal disruption
 * - Reconciles immediately when presence changes (no phase gating)
 *
 * Performance: Uses InstancedMesh for batched rendering (2 draw calls: shards + cores)
 * Previously used separate Mesh objects (300 draw calls for 300 particles)
 */

import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { type MoodId, RENDER_LAYERS } from '../../constants';
import { getFibonacciSpherePoint } from '../../lib/collisionGeometry';
import { MONUMENT_VALLEY_PALETTE, NEON_MOOD_PALETTE } from '../../lib/colors';
import { breathPhase, orbitRadius } from '../breath/traits';
import { createShardMaterial, type ShardMaterialType } from './materials';
import { moodCountsToUsers, type Slot, SlotManager, type User } from './SlotManager';
import { computeSlotTargetDirections } from './swarmDistribution';
import { createUsersSignature } from './swarmUsers';

// Direct 1:1 mapping - each mood has exactly one neon color for vibrant edges
const MOOD_TO_COLOR: Record<MoodId, THREE.Color> = {
  gratitude: new THREE.Color(NEON_MOOD_PALETTE.gratitude),
  presence: new THREE.Color(NEON_MOOD_PALETTE.presence),
  release: new THREE.Color(NEON_MOOD_PALETTE.release),
  connection: new THREE.Color(NEON_MOOD_PALETTE.connection),
};

// Default color for empty slots (won't be visible due to scale=0)
const DEFAULT_COLOR = new THREE.Color(MONUMENT_VALLEY_PALETTE.presence);

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
  /**
   * Current user's session ID for tracking their shard.
   * When provided, enables the user's shard to be visually highlighted.
   */
  currentUserId?: string;
  /** Base radius for orbit @default 4.5 */
  baseRadius?: number;
  /**
   * Base size for shards.
   * Formula: shardSize = baseShardSize / sqrt(count), clamped to [min, max].
   * maxShardSize is auto-derived as baseShardSize / 5.
   * @default 12.5
   */
  baseShardSize?: number;
  /** Globe radius for minimum distance calculation @default 1.5 */
  globeRadius?: number;
  /** Buffer distance between shard surface and globe surface @default 0.3 */
  buffer?: number;
  /**
   * Minimum shard size (prevents tiny shards at high counts).
   * @default 0.15
   */
  minShardSize?: number;
  /**
   * Performance safety cap - maximum shards to render
   * Only kicks in at very high user counts to prevent GPU overload.
   * When capped, the first N users are shown (server order), ensuring the current
   * user is included when possible by replacing the last slot.
   * @default 1000
   */
  performanceCap?: number;
  /**
   * Show highlight on current user's shard (wireframe or glow effect).
   * Requires currentUserId to be set.
   * @default false
   */
  highlightCurrentUser?: boolean;
  /**
   * Style of highlight for current user's shard.
   * - 'wireframe': Adds a wireframe outline around the shard
   * - 'glow': Adds a subtle glow/pulse effect
   * - 'scale': Makes the user's shard slightly larger
   * @default 'wireframe'
   */
  highlightStyle?: 'wireframe' | 'glow' | 'scale';
  /**
   * Material type for shards.
   * - 'frosted': Custom shader with refraction (vibrant, best visual quality)
   * - 'simple': MeshPhysicalMaterial (transparent, good performance)
   * - 'transmission': drei MeshTransmissionMaterial (realistic glass)
   * @default 'frosted'
   */
  materialType?: ShardMaterialType;
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
 * Inner glow core sizing (relative to shard scale)
 */
const CORE_SCALE_FACTOR = 0.55;

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
 * Initial direction uses a large total for even distribution across all potential slots
 */
function createInstanceState(index: number, baseRadius: number, totalSlots: number): InstanceState {
  const goldenRatio = (1 + Math.sqrt(5)) / 2;
  const rotSeedX = (index * 1.618 + 0.3) % 1;
  const rotSeedY = (index * 2.236 + 0.7) % 1;
  const scaleSeed = (index * goldenRatio + 0.5) % 1;
  const orbitSeed = (index * Math.PI + 0.1) % 1;

  // Initialize with even distribution across all slots to prevent clustering
  const direction = getFibonacciSpherePoint(index, totalSlots);

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
  currentUserId,
  baseRadius = 4.5,
  baseShardSize = 12.5, // Updated from 4.0 to match TUNING_DEFAULTS
  globeRadius = 1.5,
  buffer = 0.3,
  minShardSize = 0.15,
  performanceCap = 1000,
  highlightCurrentUser = false,
  highlightStyle = 'wireframe',
  materialType = 'frosted',
}: ParticleSwarmProps) {
  const world = useWorld();
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
  const coreMeshRef = useRef<THREE.InstancedMesh>(null);
  const wireframeRef = useRef<THREE.LineSegments>(null);
  const glowMeshRef = useRef<THREE.Mesh>(null);
  const instanceStatesRef = useRef<InstanceState[]>([]);
  const labelGroupRef = useRef<THREE.Group>(null);

  // Track current user's slot index (-1 if not found)
  const currentUserSlotIndexRef = useRef<number>(-1);

  // Slot manager for stable user ordering
  const slotManagerRef = useRef<SlotManager | null>(null);
  if (!slotManagerRef.current) {
    slotManagerRef.current = new SlotManager();
  }

  // Latest users buffer (read inside useFrame without effect lag)
  const latestUsersRef = useRef<User[]>([]);
  const latestUsersSignatureRef = useRef<string>('');

  // Track last users signature applied to slot manager
  const lastSyncedSignatureRef = useRef<string>('');

  // Normalize users input
  const normalizedUsers = useMemo(() => normalizeUsers(users), [users]);

  // Cap displayed users for performance while keeping current user visible when possible
  const displayUsers = useMemo(() => {
    if (!normalizedUsers.length) return [];
    const cap = Math.max(0, performanceCap);
    if (cap === 0 || normalizedUsers.length <= cap) return normalizedUsers;

    const capped = normalizedUsers.slice(0, cap);
    if (!currentUserId) return capped;

    const currentIndex = normalizedUsers.findIndex((user) => user.id === currentUserId);
    if (currentIndex === -1) return capped;
    if (capped.some((user) => user.id === currentUserId)) return capped;

    // Ensure local user is represented by replacing the last slot
    capped[capped.length - 1] = normalizedUsers[currentIndex];
    return capped;
  }, [normalizedUsers, performanceCap, currentUserId]);

  const displayUsersSignature = createUsersSignature(displayUsers);

  // Keep latest users snapshot/signature in refs (synchronous assignment to avoid stale frames)
  latestUsersRef.current = displayUsers;
  latestUsersSignatureRef.current = displayUsersSignature;

  // Auto-derive maxShardSize from baseShardSize (maintains 1/5 ratio)
  const maxShardSize = baseShardSize / 5;

  // Calculate shard size based on current user count
  const shardSize = useMemo(() => {
    const count = displayUsers.length || 1;
    const calculated = baseShardSize / Math.sqrt(count);
    return Math.min(Math.max(calculated, minShardSize), maxShardSize);
  }, [displayUsers.length, baseShardSize, minShardSize, maxShardSize]);

  /**
   * Calculate minimum orbit radius - ONLY the hard globe collision constraint.
   * Shards must never penetrate the globe surface.
   */
  const minOrbitRadius = useMemo(() => {
    // Hard limit: Globe collision prevention only
    return globeRadius + shardSize + buffer;
  }, [globeRadius, shardSize, buffer]);

  /**
   * Calculate ideal spacing radius - the radius at which full-size shards fit without overlap.
   * This is a SOFT constraint - if breathing radius is smaller, shards will scale down.
   *
   * For Fibonacci sphere with N particles at radius R:
   *   minimum spacing ≈ R × 1.95 / sqrt(N)
   * For no collision: R > (2 × shardSize + wobbleMargin) × sqrt(N) / 1.95
   *
   * The wobbleMargin accounts for PERPENDICULAR_AMPLITUDE and AMBIENT_SCALE motion.
   */
  const idealSpacingRadius = useMemo(() => {
    const count = displayUsers.length || 1;
    // Fibonacci spacing factor: worst-case minimum is ~1.95 / sqrt(N) of radius
    // Wobble margin: 2 × (PERPENDICULAR_AMPLITUDE + AMBIENT_SCALE) ≈ 0.22
    const wobbleMargin = 0.22;
    const fibonacciSpacingFactor = 1.95;
    const requiredSpacing = 2 * shardSize + wobbleMargin;
    return (requiredSpacing * Math.sqrt(count)) / fibonacciSpacingFactor;
  }, [displayUsers.length, shardSize]);

  // Create shared geometry (single geometry for all instances)
  const geometry = useMemo(() => {
    return new THREE.IcosahedronGeometry(shardSize, 0);
  }, [shardSize]);

  const coreGeometry = useMemo(() => {
    return new THREE.SphereGeometry(shardSize, 16, 16);
  }, [shardSize]);

  // Create shared material with instancing support
  const materialVariant = useMemo(() => createShardMaterial(materialType), [materialType]);
  const material = materialVariant.material;
  const usesRefractionPipeline = materialVariant.usesRefractionPipeline;

  const coreMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
      vertexColors: true,
      toneMapped: false,
    });
  }, []);

  // Create wireframe geometry and material for user highlight
  const wireframeGeometry = useMemo(() => {
    // Slightly larger than shard for visible outline
    const geo = new THREE.IcosahedronGeometry(shardSize * 1.15, 0);
    return new THREE.EdgesGeometry(geo);
  }, [shardSize]);

  const wireframeMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
      linewidth: 2,
    });
  }, []);

  // Create glow geometry and material for user highlight (glow style)
  const glowGeometry = useMemo(() => {
    // Larger sphere for glow effect
    return new THREE.SphereGeometry(shardSize * 2.0, 16, 16);
  }, [shardSize]);

  const glowMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide, // Render inside-out for halo effect
    });
  }, []);

  /**
   * Redistribute Fibonacci positions for stable slots (entering + active)
   * Memoized to avoid useEffect re-runs - only depends on refs
   */
  const redistributePositions = useCallback(() => {
    const states = instanceStatesRef.current;
    const slotManager = slotManagerRef.current;
    if (!slotManager) return;

    const slots = slotManager.slots;
    if (slots.length === 0) return;
    const fallbackDirections = states.map((state) => state.direction);
    const targets = computeSlotTargetDirections(slots, fallbackDirections);

    for (let i = 0; i < slots.length && i < states.length; i++) {
      const target = targets[i];
      if (target) {
        states[i].targetDirection.copy(target);
      }
    }
  }, []);

  const updateCurrentUserSlot = useCallback(
    (slotManager: SlotManager) => {
      if (!currentUserId) return;
      const userSlot = slotManager.getSlotByUserId(currentUserId);
      currentUserSlotIndexRef.current = userSlot ? userSlot.index : -1;
    },
    [currentUserId],
  );

  const applySlotColors = useCallback(
    (
      mesh: THREE.InstancedMesh,
      slots: readonly Slot[],
      states: InstanceState[],
      coreMesh?: THREE.InstancedMesh | null,
    ) => {
      for (let i = 0; i < slots.length && i < states.length; i++) {
        const slot = slots[i];
        const instanceState = states[i];
        if (slot.mood && slot.mood !== instanceState.currentMood) {
          const color = MOOD_TO_COLOR[slot.mood] ?? DEFAULT_COLOR;
          mesh.setColorAt(i, color);
          if (coreMesh) {
            coreMesh.setColorAt(i, color);
          }
          instanceState.currentMood = slot.mood;
        }
      }
      if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
      }
      if (coreMesh?.instanceColor) {
        coreMesh.instanceColor.needsUpdate = true;
      }
    },
    [],
  );

  const syncUsers = useCallback(
    (
      mesh: THREE.InstancedMesh,
      usersToSync: User[],
      options: {
        snapDirections?: boolean;
        forceRedistribute?: boolean;
        applyColors?: boolean;
      } = {},
    ) => {
      const slotManager = slotManagerRef.current;
      if (!slotManager) return 0;

      const reconciliation = slotManager.reconcile(usersToSync);
      const stableCount = slotManager.stableCount;
      const shouldRedistribute =
        options.forceRedistribute || reconciliation.added > 0 || reconciliation.removed > 0;

      if (stableCount > 0 && shouldRedistribute) {
        redistributePositions();
        if (options.snapDirections) {
          for (const state of instanceStatesRef.current) {
            state.direction.copy(state.targetDirection);
          }
        }
      }
      updateCurrentUserSlot(slotManager);
      if (options.applyColors !== false) {
        applySlotColors(mesh, slotManager.slots, instanceStatesRef.current, coreMeshRef.current);
      }

      return stableCount;
    },
    [applySlotColors, redistributePositions, updateCurrentUserSlot],
  );

  // Track if this is the first initialization
  const isInitializedRef = useRef(false);

  // Initialize instance states (only when instance count changes)
  useEffect(() => {
    const states: InstanceState[] = [];
    for (let i = 0; i < performanceCap; i++) {
      states.push(createInstanceState(i, baseRadius, performanceCap));
    }
    instanceStatesRef.current = states;
    isInitializedRef.current = false;
  }, [performanceCap, baseRadius]);

  // Initialize the InstancedMesh with current animation state
  // biome-ignore lint/correctness/useExhaustiveDependencies: geometry/material MUST be dependencies because r3f recreates the InstancedMesh when args change
  useEffect(() => {
    const mesh = instancedMeshRef.current;
    const coreMesh = coreMeshRef.current;
    if (!mesh) return;

    const slotManager = slotManagerRef.current;
    if (!slotManager) return;

    // Determine if this is initial setup or a mesh rebuild
    const isInitialSetup = !isInitializedRef.current;
    isInitializedRef.current = true;

    if (isInitialSetup) {
      // INITIAL SETUP: Start with a fresh slot reconciliation
      const usersForInit = latestUsersRef.current;
      syncUsers(mesh, usersForInit, {
        snapDirections: true,
        forceRedistribute: true,
        applyColors: false,
      });

      lastSyncedSignatureRef.current = createUsersSignature(usersForInit);

      // Initialize instance matrices after snapping to target positions
      _tempQuaternion.identity();
      const slots = slotManager.slots;
      const states = instanceStatesRef.current;

      for (let i = 0; i < performanceCap; i++) {
        const state = states[i];
        const slot = i < slots.length ? slots[i] : null;
        const slotScale = slot && slot.state !== 'empty' ? slot.scale : 0;

        if (state) {
          _tempPosition.copy(state.direction).multiplyScalar(state.currentRadius);
          _tempScale.setScalar(slotScale * state.baseScaleOffset);
          _tempMatrix.compose(_tempPosition, _tempQuaternion, _tempScale);
          mesh.setMatrixAt(i, _tempMatrix);
          mesh.setColorAt(i, DEFAULT_COLOR);
          if (coreMesh) {
            _tempScale.setScalar(slotScale * state.baseScaleOffset * CORE_SCALE_FACTOR);
            _tempMatrix.compose(_tempPosition, _tempQuaternion, _tempScale);
            coreMesh.setMatrixAt(i, _tempMatrix);
            coreMesh.setColorAt(i, DEFAULT_COLOR);
          }
        }
      }
    } else {
      // REBUILD: Preserve current animation state for mesh recreation
      // Use currentRadius and current slot states instead of resetting
      const usersForRebuild = latestUsersRef.current;
      syncUsers(mesh, usersForRebuild, {
        snapDirections: false,
        forceRedistribute: true,
        applyColors: false,
      });
      lastSyncedSignatureRef.current = createUsersSignature(usersForRebuild);

      const slots = slotManager.slots;
      const states = instanceStatesRef.current;

      for (let i = 0; i < performanceCap; i++) {
        const state = states[i];
        const slot = i < slots.length ? slots[i] : null;
        const slotScale = slot && slot.state !== 'empty' ? slot.scale : 0;

        if (state) {
          // Use currentRadius (preserves breathing animation state)
          _tempPosition.copy(state.direction).multiplyScalar(state.currentRadius);
          _tempEuler.set(state.rotationX, state.rotationY, 0);
          _tempQuaternion.setFromEuler(_tempEuler);
          _tempScale.setScalar(slotScale * state.baseScaleOffset);
          _tempMatrix.compose(_tempPosition, _tempQuaternion, _tempScale);
          mesh.setMatrixAt(i, _tempMatrix);
          if (coreMesh) {
            _tempScale.setScalar(slotScale * state.baseScaleOffset * CORE_SCALE_FACTOR);
            _tempMatrix.compose(_tempPosition, _tempQuaternion, _tempScale);
            coreMesh.setMatrixAt(i, _tempMatrix);
          }
        }
      }
    }

    applySlotColors(mesh, slotManager.slots, instanceStatesRef.current, coreMesh);

    mesh.instanceMatrix.needsUpdate = true;
    if (coreMesh) {
      coreMesh.instanceMatrix.needsUpdate = true;
      if (coreMesh.instanceColor) {
        coreMesh.instanceColor.needsUpdate = true;
      }
    }
  }, [
    performanceCap,
    baseRadius,
    geometry,
    coreGeometry,
    material,
    coreMaterial,
    applySlotColors,
    syncUsers,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      geometry.dispose();
      coreGeometry.dispose();
      material.dispose();
      coreMaterial.dispose();
      wireframeGeometry.dispose();
      wireframeMaterial.dispose();
      glowGeometry.dispose();
      glowMaterial.dispose();
    };
  }, [
    geometry,
    coreGeometry,
    material,
    coreMaterial,
    wireframeGeometry,
    wireframeMaterial,
    glowGeometry,
    glowMaterial,
  ]);

  // Track if we've already signaled for screenshots
  const hasSignaledRef = useRef(false);
  const signalDelayRef = useRef(0);

  // Animation loop
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Physics simulation requires multiple force calculations and slot lifecycle management
  useFrame((state, delta) => {
    const mesh = instancedMeshRef.current;
    const coreMesh = coreMeshRef.current;
    const states = instanceStatesRef.current;
    const slotManager = slotManagerRef.current;
    if (!mesh || !slotManager || states.length === 0) return;

    const clampedDelta = Math.min(delta, 0.1);
    const time = state.clock.elapsedTime;

    // Get breathing state from ECS
    let targetRadius = baseRadius;
    let currentBreathPhase = 0;
    const breathEntity = world.queryFirst(orbitRadius, breathPhase);
    if (breathEntity) {
      targetRadius = breathEntity.get(orbitRadius)?.value ?? baseRadius;
      currentBreathPhase = breathEntity.get(breathPhase)?.value ?? 0;
    }

    // Reconcile whenever the users snapshot changes
    const usersSnapshot = latestUsersRef.current;
    const usersSignature = latestUsersSignatureRef.current;
    if (usersSignature !== lastSyncedSignatureRef.current) {
      const isFirstSync = lastSyncedSignatureRef.current.length === 0;
      syncUsers(mesh, usersSnapshot, {
        snapDirections: isFirstSync,
      });
      lastSyncedSignatureRef.current = usersSignature;
    }

    // Signal for E2E screenshot tests - fires once when shards become fully visible
    // Wait for 1.0s of full visibility to ensure RefractionPipeline has initialized and rendered
    if (
      !hasSignaledRef.current &&
      slotManager.fullyActiveCount > 0 &&
      slotManager.fullyActiveCount === displayUsers.length
    ) {
      signalDelayRef.current += clampedDelta;
      if (signalDelayRef.current > 1.0) {
        console.log('[SCREENSHOT_READY]', slotManager.fullyActiveCount, 'shards fully visible');
        hasSignaledRef.current = true;
      }
    } else {
      signalDelayRef.current = 0;
    }

    // Update slot animations
    slotManager.updateAnimations(clampedDelta);

    // Update shader uniforms (only if material needs them)
    if ('uniforms' in material && material.uniforms) {
      const uniforms = material.uniforms as Record<string, { value: unknown }>;
      if (materialVariant.needsBreathPhaseUpdate && 'breathPhase' in uniforms) {
        uniforms.breathPhase.value = currentBreathPhase;
      }
      if (materialVariant.needsTimeUpdate && 'time' in uniforms) {
        uniforms.time.value = time;
      }
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
        if (coreMesh) {
          coreMesh.setMatrixAt(i, _tempMatrix);
        }
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

      // Update rotation
      instanceState.rotationX += 0.002 * instanceState.rotationSpeedX;
      instanceState.rotationY += 0.003 * instanceState.rotationSpeedY;
      _tempEuler.set(instanceState.rotationX, instanceState.rotationY, 0);
      _tempQuaternion.setFromEuler(_tempEuler);

      // Calculate spacing scale factor: shrink shards when orbit radius < ideal spacing radius
      // This prevents overlap when many users are present and orbit contracts during breathing
      const spacingScaleFactor =
        instanceState.currentRadius < idealSpacingRadius
          ? Math.max(0.3, instanceState.currentRadius / idealSpacingRadius)
          : 1.0;

      // Final scale: slot scale × breath scale × spacing scale × base offset
      const breathScale = 1.0 + currentBreathPhase * 0.05;
      const finalScale =
        slotScale * instanceState.baseScaleOffset * breathScale * spacingScaleFactor;
      _tempScale.setScalar(finalScale);

      // Compose and set matrix
      _tempMatrix.compose(_tempPosition, _tempQuaternion, _tempScale);
      mesh.setMatrixAt(i, _tempMatrix);
      if (coreMesh) {
        _tempScale.setScalar(finalScale * CORE_SCALE_FACTOR);
        _tempMatrix.compose(_tempPosition, _tempQuaternion, _tempScale);
        coreMesh.setMatrixAt(i, _tempMatrix);
      }
    }

    // Update instance count for rendering optimization
    mesh.count = Math.max(1, visibleCount);
    mesh.instanceMatrix.needsUpdate = true;
    if (coreMesh) {
      coreMesh.count = mesh.count;
      coreMesh.instanceMatrix.needsUpdate = true;
    }

    // Update highlight position for current user
    const wireframe = wireframeRef.current;
    const glowMesh = glowMeshRef.current;
    const labelGroup = labelGroupRef.current;
    const userSlotIndex = currentUserSlotIndexRef.current;

    if (highlightCurrentUser && userSlotIndex >= 0 && userSlotIndex < states.length) {
      const slot = userSlotIndex < slots.length ? slots[userSlotIndex] : null;
      const slotScale = slot && slot.state !== 'empty' ? slot.scale : 0;

      if (slotScale > 0.001) {
        // Get the current user's shard matrix
        mesh.getMatrixAt(userSlotIndex, _tempMatrix);
        _tempMatrix.decompose(_tempPosition, _tempQuaternion, _tempScale);

        // Update label position (above the shard)
        const labelOffset = shardSize * 3;
        if (labelGroup) {
          labelGroup.position.set(_tempPosition.x, _tempPosition.y + labelOffset, _tempPosition.z);
          labelGroup.visible = true;
        }

        // Style-specific rendering
        if (highlightStyle === 'wireframe') {
          // Wireframe outline
          if (wireframe) {
            wireframe.position.copy(_tempPosition);
            wireframe.quaternion.copy(_tempQuaternion);
            wireframe.scale.copy(_tempScale);
            wireframe.visible = true;
            wireframeMaterial.opacity = 0.8;
          }
          if (glowMesh) glowMesh.visible = false;
        } else if (highlightStyle === 'glow') {
          // Pulsing glow sphere
          if (glowMesh) {
            const pulse = 0.3 + Math.sin(time * 3) * 0.15;
            glowMaterial.opacity = pulse;
            glowMesh.position.copy(_tempPosition);
            glowMesh.scale.setScalar(1.0 + Math.sin(time * 2) * 0.1);
            glowMesh.visible = true;
          }
          // Also show wireframe but dimmer
          if (wireframe) {
            wireframe.position.copy(_tempPosition);
            wireframe.quaternion.copy(_tempQuaternion);
            wireframe.scale.copy(_tempScale);
            wireframe.visible = true;
            wireframeMaterial.opacity = 0.4;
          }
        } else if (highlightStyle === 'scale') {
          // Scale up with wireframe
          if (wireframe) {
            wireframe.position.copy(_tempPosition);
            wireframe.quaternion.copy(_tempQuaternion);
            wireframe.scale.copy(_tempScale).multiplyScalar(1.3);
            wireframe.visible = true;
            wireframeMaterial.opacity = 0.8;
          }
          if (glowMesh) glowMesh.visible = false;
        }
      } else {
        // Shard not visible
        if (wireframe) wireframe.visible = false;
        if (glowMesh) glowMesh.visible = false;
        if (labelGroup) labelGroup.visible = false;
      }
    } else {
      // Highlight disabled or user not found
      if (wireframe) wireframe.visible = false;
      if (glowMesh) glowMesh.visible = false;
      if (labelGroup) labelGroup.visible = false;
    }
  });

  const applyRefractionLayer = useCallback(
    (mesh?: THREE.InstancedMesh | null) => {
      const target = mesh ?? instancedMeshRef.current;
      if (!target) return;

      target.renderOrder = 1;
      if (usesRefractionPipeline) {
        target.layers.enable(RENDER_LAYERS.PARTICLES);
      } else {
        target.layers.disable(RENDER_LAYERS.PARTICLES);
      }
      target.userData.useRefraction = usesRefractionPipeline;
    },
    [usesRefractionPipeline],
  );

  useEffect(() => {
    applyRefractionLayer();
  }, [applyRefractionLayer]);

  const applyCoreRenderState = useCallback((mesh?: THREE.InstancedMesh | null) => {
    const target = mesh ?? coreMeshRef.current;
    if (!target) return;

    target.renderOrder = 0;
    target.layers.disable(RENDER_LAYERS.PARTICLES);
  }, []);

  useEffect(() => {
    applyCoreRenderState();
    const wireframe = wireframeRef.current;
    const glowMesh = glowMeshRef.current;
    if (wireframe) {
      wireframe.renderOrder = 2;
    }
    if (glowMesh) {
      glowMesh.renderOrder = 2;
    }
  }, [applyCoreRenderState]);

  return (
    <>
      <instancedMesh
        ref={coreMeshRef}
        args={[coreGeometry, coreMaterial, performanceCap]}
        frustumCulled={false}
        name="Particle Swarm Core"
        onUpdate={(mesh) => applyCoreRenderState(mesh)}
      />
      <instancedMesh
        ref={instancedMeshRef}
        args={[geometry, material, performanceCap]}
        frustumCulled={false}
        name="Particle Swarm"
        onUpdate={(mesh) => applyRefractionLayer(mesh)}
      />
      {/* Highlight elements for current user's shard */}
      {highlightCurrentUser && (
        <>
          {/* Wireframe outline */}
          <lineSegments
            ref={wireframeRef}
            geometry={wireframeGeometry}
            material={wireframeMaterial}
            visible={false}
            name="User Shard Wireframe"
          />
          {/* Glow sphere (for glow style) */}
          <mesh
            ref={glowMeshRef}
            geometry={glowGeometry}
            material={glowMaterial}
            visible={false}
            name="User Shard Glow"
          />
          {/* "You" label above the shard */}
          <group ref={labelGroupRef} visible={false} name="User Shard Label">
            <Html center>
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.75)',
                  color: '#ffffff',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  whiteSpace: 'nowrap',
                  border: '1px solid rgba(255, 255, 255, 0.5)',
                  pointerEvents: 'none',
                }}
              >
                You
              </div>
            </Html>
          </group>
        </>
      )}
    </>
  );
}

export default ParticleSwarm;
