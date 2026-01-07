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
 * Performance: Uses InstancedMesh for batched rendering (shards + glowing edges + trails)
 * Previously used separate Mesh objects (300 draw calls for 300 particles)
 */

import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { MoodId } from '../../constants';
import { getFibonacciSpherePoint } from '../../lib/collisionGeometry';
import { MONUMENT_VALLEY_PALETTE, NEON_MOOD_PALETTE } from '../../lib/colors';
import { breathPhase, orbitRadius } from '../breath/traits';
import { createShardMaterial } from './materials';
import { createEdgeMaterialTSL } from './ParticleEdgeMaterialTSL';
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
   * Toggle shard shells + edge glow visibility
   * @default true
   */
  showShardShells?: boolean;
}

/**
 * Per-instance state for physics simulation.
 * Each shard maintains its own animation state for smooth, independent motion.
 */
interface InstanceState {
  /** Current direction vector (unit vector, interpolated toward targetDirection) */
  direction: THREE.Vector3;
  /** Target direction from Fibonacci redistribution (unit vector) */
  targetDirection: THREE.Vector3;
  /** Current mood for color tracking (null when slot is empty) */
  currentMood: MoodId | null;
  /** Current interpolated radius in world units (lerp-smoothed toward ECS orbitRadius) */
  currentRadius: number;
  /** Phase offset for subtle wave effect (0-0.04 range, creates staggered breathing) */
  phaseOffset: number;
  /** Seed for ambient floating motion (0-1 range, unique per shard, deterministic) */
  ambientSeed: number;
  /** Per-shard rotation speed multiplier X axis (0.7-1.3 range, creates variation) */
  rotationSpeedX: number;
  /** Per-shard rotation speed multiplier Y axis (0.7-1.3 range, creates variation) */
  rotationSpeedY: number;
  /** Base scale offset for depth variation (0.85-1.15 range, adds visual depth) */
  baseScaleOffset: number;
  /** Edge scale variation for less uniform wireframes (0.95-1.08 range) */
  edgeScaleOffset: number;
  /** Current orbit angle offset in radians (accumulates over time for drift) */
  orbitAngle: number;
  /** Per-shard orbit speed in radians/second (ORBIT_BASE_SPEED ± variation) */
  orbitSpeed: number;
  /** Seed for perpendicular wobble phase (0-2π range, creates unique wobble timing) */
  wobbleSeed: number;
  /** Accumulated rotation around X axis in radians (tumbling animation) */
  rotationX: number;
  /** Accumulated rotation around Y axis in radians (tumbling animation) */
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
 * Edge glow sizing and trails
 */
const EDGE_SCALE = 1.12;
const TRAIL_COUNT = 5;
const GLOBE_VISUAL_SCALE = 1.35;
const MAX_SHARD_SCALE = 1.2;

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

function getSlotScale(slot: Slot | null): number {
  if (!slot) return 0;
  return slot.state !== 'empty' ? slot.scale : 0;
}

function markInstanceColorNeedsUpdate(meshes: Array<THREE.InstancedMesh | null | undefined>) {
  for (const mesh of meshes) {
    if (mesh?.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }
}

function markInstanceMatrixNeedsUpdate(meshes: Array<THREE.InstancedMesh | null | undefined>) {
  for (const mesh of meshes) {
    if (mesh) {
      mesh.instanceMatrix.needsUpdate = true;
    }
  }
}

/**
 * Compose and return a matrix from position/quaternion/scale for instanced rendering.
 */
function composeInstanceMatrix(
  matrix: THREE.Matrix4,
  position: THREE.Vector3,
  quaternion: THREE.Quaternion,
  scale: THREE.Vector3,
): THREE.Matrix4 {
  matrix.compose(position, quaternion, scale);
  return matrix;
}

function setColorForIndex(
  meshes: Array<THREE.InstancedMesh | null | undefined>,
  index: number,
  color: THREE.Color,
) {
  for (const mesh of meshes) {
    mesh?.setColorAt(index, color);
  }
}

function writeBaseInstanceMatrix({
  mesh,
  index,
  state,
  slotScale,
  useStoredRotation,
}: {
  mesh: THREE.InstancedMesh;
  index: number;
  state: InstanceState;
  slotScale: number;
  useStoredRotation: boolean;
}) {
  _tempPosition.copy(state.direction).multiplyScalar(state.currentRadius);
  if (useStoredRotation) {
    _tempEuler.set(state.rotationX, state.rotationY, 0);
    _tempQuaternion.setFromEuler(_tempEuler);
  } else {
    _tempQuaternion.identity();
  }

  _tempScale.setScalar(slotScale * state.baseScaleOffset);
  composeInstanceMatrix(_tempMatrix, _tempPosition, _tempQuaternion, _tempScale);
  mesh.setMatrixAt(index, _tempMatrix);
}

function writeEdgeAndTrailsMatrix({
  edgeMesh,
  trailMeshes,
  index,
  state,
  slotScale,
  useStoredRotation,
  setDefaultColors,
  trailHistory,
}: {
  edgeMesh: THREE.InstancedMesh;
  trailMeshes: Array<THREE.InstancedMesh | null>;
  index: number;
  state: InstanceState;
  slotScale: number;
  useStoredRotation: boolean;
  setDefaultColors: boolean;
  trailHistory: THREE.Matrix4[][];
}) {
  _tempPosition.copy(state.direction).multiplyScalar(state.currentRadius);
  if (useStoredRotation) {
    _tempEuler.set(state.rotationX, state.rotationY, 0);
    _tempQuaternion.setFromEuler(_tempEuler);
  } else {
    _tempQuaternion.identity();
  }

  _tempScale.setScalar(slotScale * state.baseScaleOffset * state.edgeScaleOffset * EDGE_SCALE);
  composeInstanceMatrix(_tempMatrix, _tempPosition, _tempQuaternion, _tempScale);
  edgeMesh.setMatrixAt(index, _tempMatrix);

  const history = trailHistory[index];
  if (!history) return;

  for (let t = 0; t < history.length; t++) {
    history[t].copy(_tempMatrix);
    const trailMesh = trailMeshes[t];
    if (trailMesh) {
      trailMesh.setMatrixAt(index, history[t]);
      if (setDefaultColors) {
        trailMesh.setColorAt(index, DEFAULT_COLOR);
      }
    }
  }
}

function writeHaloInstanceMatrix({
  haloMesh,
  index,
  state,
  slotScale,
  useStoredRotation,
}: {
  haloMesh: THREE.InstancedMesh;
  index: number;
  state: InstanceState;
  slotScale: number;
  useStoredRotation: boolean;
}) {
  _tempPosition.copy(state.direction).multiplyScalar(state.currentRadius);
  if (useStoredRotation) {
    _tempEuler.set(state.rotationX, state.rotationY, 0);
    _tempQuaternion.setFromEuler(_tempEuler);
  } else {
    _tempQuaternion.identity();
  }

  _tempScale.setScalar(
    slotScale * state.baseScaleOffset * state.edgeScaleOffset * EDGE_SCALE * 1.12,
  );
  composeInstanceMatrix(_tempMatrix, _tempPosition, _tempQuaternion, _tempScale);
  haloMesh.setMatrixAt(index, _tempMatrix);
}

function initializeInstanceMatrices({
  performanceCap,
  slots,
  states,
  mesh,
  edgeMesh,
  haloMesh,
  trailMeshes,
  trailHistory,
  useStoredRotation,
  setDefaultColors,
}: {
  performanceCap: number;
  slots: readonly Slot[];
  states: InstanceState[];
  mesh: THREE.InstancedMesh;
  edgeMesh: THREE.InstancedMesh | null;
  haloMesh: THREE.InstancedMesh | null;
  trailMeshes: Array<THREE.InstancedMesh | null>;
  trailHistory: THREE.Matrix4[][];
  useStoredRotation: boolean;
  setDefaultColors: boolean;
}) {
  for (let i = 0; i < performanceCap; i++) {
    const state = states[i];
    if (!state) continue;

    const slot = i < slots.length ? slots[i] : null;
    const slotScale = getSlotScale(slot);

    writeBaseInstanceMatrix({ mesh, index: i, state, slotScale, useStoredRotation });

    if (setDefaultColors) {
      setColorForIndex([mesh, edgeMesh, haloMesh], i, DEFAULT_COLOR);
    }

    if (edgeMesh) {
      writeEdgeAndTrailsMatrix({
        edgeMesh,
        trailMeshes,
        index: i,
        state,
        slotScale,
        useStoredRotation,
        setDefaultColors,
        trailHistory,
      });
    }

    if (haloMesh) {
      writeHaloInstanceMatrix({ haloMesh, index: i, state, slotScale, useStoredRotation });
    }
  }
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
    edgeScaleOffset: 0.96 + scaleSeed * 0.08,
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
  showShardShells = true,
}: ParticleSwarmProps) {
  const world = useWorld();
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
  const edgeMeshRef = useRef<THREE.InstancedMesh>(null);
  const haloMeshRef = useRef<THREE.InstancedMesh>(null);
  const trailMeshesRef = useRef<Array<THREE.InstancedMesh | null>>([]);
  const wireframeRef = useRef<THREE.LineSegments>(null);
  const glowMeshRef = useRef<THREE.Mesh>(null);
  const instanceStatesRef = useRef<InstanceState[]>([]);
  const trailHistoryRef = useRef<THREE.Matrix4[][]>([]);
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
    // Hard limit: Keep shards outside the full visible globe (including atmosphere/glow)
    const visualGlobeRadius = globeRadius * GLOBE_VISUAL_SCALE;
    const maxShardExtent = shardSize * MAX_SHARD_SCALE;
    return visualGlobeRadius + maxShardExtent + buffer;
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

  // Create shared material with instancing support
  const material = useMemo(() => createShardMaterial(), []);

  const edgeMaterial = useMemo(
    () =>
      createEdgeMaterialTSL({
        trailFade: 1.0,
        baseOpacity: 1.05,
        pulseStrength: 1.35,
        glowBoost: 5.2,
        depthFadePower: 0.95,
        noiseAmount: 0.08,
      }),
    [],
  );
  const haloMaterial = useMemo(
    () =>
      createEdgeMaterialTSL({
        trailFade: 0.5,
        baseOpacity: 0.3,
        pulseStrength: 1.05,
        glowBoost: 2.6,
        depthFadePower: 1.2,
        noiseAmount: 0.06,
      }),
    [],
  );

  const trailMaterials = useMemo(
    () =>
      Array.from({ length: TRAIL_COUNT }, (_, index) =>
        createEdgeMaterialTSL({
          trailFade: 0.6 / (index + 1),
          baseOpacity: 0.45,
          pulseStrength: 1.1,
          glowBoost: 2.4,
          depthFadePower: 1.0,
          noiseAmount: 0.08,
        }),
      ),
    [],
  );

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
      edgeMesh?: THREE.InstancedMesh | null,
      haloMesh?: THREE.InstancedMesh | null,
      trailMeshes: Array<THREE.InstancedMesh | null> = [],
    ) => {
      const colorMeshes: Array<THREE.InstancedMesh | null | undefined> = [
        mesh,
        edgeMesh,
        haloMesh,
        ...trailMeshes,
      ];

      for (let i = 0; i < slots.length && i < states.length; i++) {
        const slot = slots[i];
        const instanceState = states[i];
        if (!slot.mood || slot.mood === instanceState.currentMood) continue;
        const color = MOOD_TO_COLOR[slot.mood] ?? DEFAULT_COLOR;
        setColorForIndex(colorMeshes, i, color);
        instanceState.currentMood = slot.mood;
      }

      markInstanceColorNeedsUpdate(colorMeshes);
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
        applySlotColors(
          mesh,
          slotManager.slots,
          instanceStatesRef.current,
          edgeMeshRef.current,
          haloMeshRef.current,
          trailMeshesRef.current,
        );
      }

      return stableCount;
    },
    [applySlotColors, redistributePositions, updateCurrentUserSlot],
  );

  // Track if this is the first initialization
  const isInitializedRef = useRef(false);

  // Initialize instance states (only when instance count changes)
  useEffect(() => {
    // Dispose old instance attributes before creating new ones
    // (geometry.dispose() doesn't automatically dispose BufferAttributes in all Three.js versions)
    const oldSeedAttr = geometry.getAttribute('instanceSeed');
    const oldPulseAttr = geometry.getAttribute('instancePulse');
    if (oldSeedAttr) {
      geometry.deleteAttribute('instanceSeed');
    }
    if (oldPulseAttr) {
      geometry.deleteAttribute('instancePulse');
    }

    const states: InstanceState[] = [];
    const seeds = new Float32Array(performanceCap);
    const pulses = new Float32Array(performanceCap);
    const trails: THREE.Matrix4[][] = [];
    for (let i = 0; i < performanceCap; i++) {
      const state = createInstanceState(i, baseRadius, performanceCap);
      states.push(state);
      seeds[i] = (state.ambientSeed * 0.001) % 1;
      pulses[i] = (state.ambientSeed * 0.37) % 1;
      trails[i] = Array.from({ length: TRAIL_COUNT }, () => new THREE.Matrix4());
    }
    instanceStatesRef.current = states;
    trailHistoryRef.current = trails;
    geometry.setAttribute('instanceSeed', new THREE.InstancedBufferAttribute(seeds, 1));
    geometry.setAttribute('instancePulse', new THREE.InstancedBufferAttribute(pulses, 1));
    isInitializedRef.current = false;
  }, [performanceCap, baseRadius, geometry]);

  // Initialize the InstancedMesh with current animation state
  // biome-ignore lint/correctness/useExhaustiveDependencies: geometry/material MUST be dependencies because r3f recreates the InstancedMesh when args change
  useEffect(() => {
    const mesh = instancedMeshRef.current;
    const edgeMesh = edgeMeshRef.current;
    const haloMesh = haloMeshRef.current;
    const trailMeshes = trailMeshesRef.current;
    if (!mesh) return;

    const slotManager = slotManagerRef.current;
    if (!slotManager) return;

    // Determine if this is initial setup or a mesh rebuild
    const isInitialSetup = !isInitializedRef.current;
    isInitializedRef.current = true;

    const usersForSetup = latestUsersRef.current;
    syncUsers(mesh, usersForSetup, {
      snapDirections: isInitialSetup,
      forceRedistribute: true,
      applyColors: false,
    });
    lastSyncedSignatureRef.current = createUsersSignature(usersForSetup);

    initializeInstanceMatrices({
      performanceCap,
      slots: slotManager.slots,
      states: instanceStatesRef.current,
      mesh,
      edgeMesh,
      haloMesh,
      trailMeshes,
      trailHistory: trailHistoryRef.current,
      useStoredRotation: !isInitialSetup,
      setDefaultColors: isInitialSetup,
    });

    applySlotColors(
      mesh,
      slotManager.slots,
      instanceStatesRef.current,
      edgeMesh,
      haloMesh,
      trailMeshes,
    );

    markInstanceMatrixNeedsUpdate([mesh, edgeMesh, haloMesh, ...trailMeshes]);
  }, [
    performanceCap,
    baseRadius,
    geometry,
    material,
    edgeMaterial,
    haloMaterial,
    trailMaterials,
    applySlotColors,
    syncUsers,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Delete instance attributes before geometry disposal
      // (geometry.dispose() doesn't automatically dispose BufferAttributes in all Three.js versions)
      geometry.deleteAttribute('instanceSeed');
      geometry.deleteAttribute('instancePulse');
      geometry.dispose();
      material.dispose();
      edgeMaterial.dispose();
      haloMaterial.dispose();
      for (const trailMaterial of trailMaterials) {
        trailMaterial.dispose();
      }
      wireframeGeometry.dispose();
      wireframeMaterial.dispose();
      glowGeometry.dispose();
      glowMaterial.dispose();
    };
  }, [
    geometry,
    material,
    edgeMaterial,
    haloMaterial,
    trailMaterials,
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
    const edgeMesh = edgeMeshRef.current;
    const haloMesh = haloMeshRef.current;
    const trailMeshes = trailMeshesRef.current;
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
    // Wait for 1.0s of full visibility to ensure steady state
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

    // Edge materials handle their own timing/pulse.
    const depthRange = Math.max(18, baseRadius * 12);

    if ('userData' in edgeMaterial && edgeMaterial.userData) {
      const edgeUniforms = edgeMaterial.userData as Record<string, { value: unknown }>;
      if ('uTime' in edgeUniforms) {
        edgeUniforms.uTime.value = time;
      }
      if ('uDepthRange' in edgeUniforms) {
        edgeUniforms.uDepthRange.value = depthRange;
      }
    }
    if ('userData' in haloMaterial && haloMaterial.userData) {
      const haloUniforms = haloMaterial.userData as Record<string, { value: unknown }>;
      if ('uTime' in haloUniforms) {
        haloUniforms.uTime.value = time;
      }
      if ('uDepthRange' in haloUniforms) {
        haloUniforms.uDepthRange.value = depthRange;
      }
    }
    for (const trailMaterial of trailMaterials) {
      if ('userData' in trailMaterial && trailMaterial.userData) {
        const trailUniforms = trailMaterial.userData as Record<string, { value: unknown }>;
        if ('uTime' in trailUniforms) {
          trailUniforms.uTime.value = time;
        }
        if ('uDepthRange' in trailUniforms) {
          trailUniforms.uDepthRange.value = depthRange;
        }
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
        if (edgeMesh) {
          edgeMesh.setMatrixAt(i, _tempMatrix);
        }
        if (haloMesh) {
          haloMesh.setMatrixAt(i, _tempMatrix);
        }
        const history = trailHistoryRef.current[i];
        if (history) {
          for (let t = 0; t < history.length; t++) {
            history[t].copy(_tempMatrix);
            const trailMesh = trailMeshes[t];
            if (trailMesh) {
              trailMesh.setMatrixAt(i, history[t]);
            }
          }
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
      if (edgeMesh) {
        _tempScale.setScalar(finalScale * EDGE_SCALE * instanceState.edgeScaleOffset);
        _tempMatrix.compose(_tempPosition, _tempQuaternion, _tempScale);
        edgeMesh.setMatrixAt(i, _tempMatrix);
        const history = trailHistoryRef.current[i];
        if (history) {
          for (let t = history.length - 1; t >= 1; t--) {
            history[t].copy(history[t - 1]);
          }
          history[0].copy(_tempMatrix);
          for (let t = 0; t < history.length; t++) {
            const trailMesh = trailMeshes[t];
            if (trailMesh) {
              _tempMatrix.copy(history[t]);
              _tempMatrix.decompose(_tempPosition, _tempQuaternion, _tempScale);
              _tempScale.multiplyScalar(1 - (t + 1) * 0.05);
              _tempMatrix.compose(_tempPosition, _tempQuaternion, _tempScale);
              trailMesh.setMatrixAt(i, _tempMatrix);
            }
          }
        }
      }
      if (haloMesh) {
        _tempScale.setScalar(finalScale * EDGE_SCALE * instanceState.edgeScaleOffset * 1.12);
        _tempMatrix.compose(_tempPosition, _tempQuaternion, _tempScale);
        haloMesh.setMatrixAt(i, _tempMatrix);
      }
    }

    // Update instance count for rendering optimization
    mesh.count = Math.max(1, visibleCount);
    mesh.instanceMatrix.needsUpdate = true;
    if (edgeMesh) {
      edgeMesh.count = mesh.count;
      edgeMesh.instanceMatrix.needsUpdate = true;
    }
    if (haloMesh) {
      haloMesh.count = mesh.count;
      haloMesh.instanceMatrix.needsUpdate = true;
    }
    for (const trailMesh of trailMeshes) {
      if (trailMesh) {
        trailMesh.count = mesh.count;
        trailMesh.instanceMatrix.needsUpdate = true;
      }
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

  const applyShardRenderState = useCallback((mesh?: THREE.InstancedMesh | null, order = 1) => {
    const target = mesh ?? instancedMeshRef.current;
    if (!target) return;

    target.renderOrder = order;
  }, []);

  const applyEdgeRenderState = useCallback((mesh?: THREE.InstancedMesh | null, order = 2) => {
    if (!mesh) return;
    mesh.renderOrder = order;
  }, []);

  useEffect(() => {
    applyShardRenderState();
    applyEdgeRenderState(edgeMeshRef.current, TRAIL_COUNT + 2);
    applyEdgeRenderState(haloMeshRef.current, TRAIL_COUNT + 1);
    trailMeshesRef.current.forEach((trailMesh, index) => {
      if (trailMesh) {
        applyEdgeRenderState(trailMesh, 2 + index);
      }
    });
    const wireframe = wireframeRef.current;
    const glowMesh = glowMeshRef.current;
    if (wireframe) {
      wireframe.renderOrder = TRAIL_COUNT + 3;
    }
    if (glowMesh) {
      glowMesh.renderOrder = TRAIL_COUNT + 3;
    }
  }, [applyShardRenderState, applyEdgeRenderState]);

  return (
    <>
      <instancedMesh
        ref={instancedMeshRef}
        args={[geometry, material, performanceCap]}
        frustumCulled={false}
        name="Particle Swarm"
        visible={showShardShells}
        onUpdate={(mesh) => applyShardRenderState(mesh, 1)}
      />
      <instancedMesh
        ref={edgeMeshRef}
        args={[geometry, edgeMaterial, performanceCap]}
        frustumCulled={false}
        name="Particle Swarm Edges"
        visible={showShardShells}
        onUpdate={(mesh) => applyEdgeRenderState(mesh, TRAIL_COUNT + 2)}
      />
      <instancedMesh
        ref={haloMeshRef}
        args={[geometry, haloMaterial, performanceCap]}
        frustumCulled={false}
        name="Particle Swarm Halo"
        visible={showShardShells}
        onUpdate={(mesh) => applyEdgeRenderState(mesh, TRAIL_COUNT + 1)}
      />
      {trailMaterials.map((trailMaterial, index) => (
        <instancedMesh
          // biome-ignore lint/suspicious/noArrayIndexKey: Stable trail ordering
          key={`trail-${index}`}
          ref={(mesh) => {
            trailMeshesRef.current[index] = mesh;
          }}
          args={[geometry, trailMaterial, performanceCap]}
          frustumCulled={false}
          name={`Particle Swarm Trail ${index + 1}`}
          visible={showShardShells}
          onUpdate={(mesh) => applyEdgeRenderState(mesh, 2 + index)}
        />
      ))}
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
