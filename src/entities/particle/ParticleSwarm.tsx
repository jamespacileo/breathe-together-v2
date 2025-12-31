/**
 * ParticleSwarm - Monument Valley inspired icosahedral shards
 *
 * Pool-based architecture with dynamic Fibonacci positioning:
 * - Mood array is the sole source of truth (no separate count)
 * - Shapes animate in/out smoothly with deferred compaction
 * - Positions recalculate dynamically based on active user count
 * - Pre-allocated pool for performance (no runtime allocation)
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { breathPhase, orbitRadius } from '../breath/traits';
import { createFrostedGlassMaterial } from './FrostedGlassMaterial';
import { getMoodColor, getSlotFallbackColor } from './useUserOrdering';

/** Maximum shapes in pool - pre-allocated for performance */
const MAX_POOL_SIZE = 150;

/** Fixed geometry size - scaling done at render time to avoid pool recreation */
const GEOMETRY_BASE_SIZE = 0.5;

/** Reusable temp vectors to avoid allocation in animation loop */
const _tempVec3 = new THREE.Vector3();
const _upVector = new THREE.Vector3(0, 1, 0);
const _orbitAxis = new THREE.Vector3(0, 1, 0);
const _tangent1 = new THREE.Vector3();
const _tangent2 = new THREE.Vector3();
const _ambientOffset = new THREE.Vector3();

/** Shape lifecycle status */
type ShapeStatus = 'idle' | 'entering' | 'active' | 'exiting';

/**
 * Visual state for each shape in the pool
 * Simplified: direct lerping, no progress tracking, no stagger delay
 */
interface ShapeVisualState {
  /** Pool slot index (0 to MAX_POOL_SIZE-1) */
  poolIndex: number;
  /** Current status in lifecycle */
  status: ShapeStatus;
  /** Mood index (0-3) or -1 if idle/exiting */
  moodIndex: number;

  // Position - direct lerp (no start/progress tracking)
  targetDirection: THREE.Vector3;
  currentDirection: THREE.Vector3;

  // Color - direct lerp (no start/progress tracking)
  currentColor: THREE.Color;
  targetColor: THREE.Color;

  // Scale - simple linear animation
  scale: number;
  targetScale: number;

  // Physics state (simplified)
  currentRadius: number;
  orbitAngle: number;

  // Per-shape variation (single seed derives all)
  seed: number;
  baseScaleOffset: number;
}

interface ShardData {
  mesh: THREE.Mesh;
  geometry: THREE.IcosahedronGeometry;
}

// Animation lerp speeds (per second) - direct lerping, no progress tracking
const SCALE_LERP_SPEED = 8; // Fast scale in/out
const COLOR_LERP_SPEED = 6; // Color transitions
const POSITION_LERP_SPEED = 5; // Position redistribution

// Physics constants (simplified - no spring, just orbit)
const RADIUS_LERP_SPEED = 4;
const AMBIENT_SCALE = 0.08;
const AMBIENT_Y_SCALE = 0.04;
const ORBIT_BASE_SPEED = 0.015;
const PERPENDICULAR_AMPLITUDE = 0.03;
const PERPENDICULAR_FREQUENCY = 0.35;

/**
 * Calculate Fibonacci sphere direction for given index and total count
 * @param out - Output vector to avoid allocation
 */
function fibonacciDirection(index: number, total: number, out: THREE.Vector3): THREE.Vector3 {
  if (total === 0) {
    out.set(0, 1, 0);
    return out;
  }
  const phi = Math.acos(-1 + (2 * index + 1) / total);
  const theta = Math.sqrt(total * Math.PI) * phi;
  out.setFromSphericalCoords(1, phi, theta);
  return out;
}

/**
 * Apply per-vertex color to geometry
 */
function applyVertexColors(geometry: THREE.BufferGeometry, color: THREE.Color): void {
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
 * Update vertex colors in-place
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

/**
 * Initialize visual state for a pool slot
 * Simplified: single seed derives all variation, no progress tracking
 */
function createInitialState(poolIndex: number): ShapeVisualState {
  const goldenRatio = (1 + Math.sqrt(5)) / 2;
  const fallbackColor = getSlotFallbackColor(poolIndex);

  return {
    poolIndex,
    status: 'idle',
    moodIndex: -1,

    // Position - direct lerp
    targetDirection: new THREE.Vector3(0, 1, 0),
    currentDirection: new THREE.Vector3(0, 1, 0),

    // Color - direct lerp
    currentColor: fallbackColor.clone(),
    targetColor: fallbackColor.clone(),

    // Scale
    scale: 0,
    targetScale: 0,

    // Physics
    currentRadius: 4.5,
    orbitAngle: 0,

    // Single seed derives all per-shape variation
    seed: poolIndex * goldenRatio,
    baseScaleOffset: 0.9 + ((poolIndex * goldenRatio + 0.5) % 1) * 0.2,
  };
}

export interface ParticleSwarmProps {
  /**
   * Ordered mood array - each element is a mood index (0-3)
   * Array length determines number of visible shapes
   * No -1 values needed - just pass the active moods
   */
  moodArray: number[];
  /** Base radius for orbit @default 4.5 */
  baseRadius?: number;
  /** Maximum shard size @default 0.5 */
  maxShardSize?: number;
  /** Globe radius for minimum distance @default 1.5 */
  globeRadius?: number;
  /** Buffer between shards and globe @default 0.3 */
  buffer?: number;
}

export function ParticleSwarm({
  moodArray,
  baseRadius = 4.5,
  maxShardSize = 0.5,
  globeRadius = 1.5,
  buffer = 0.3,
}: ParticleSwarmProps) {
  const world = useWorld();
  const groupRef = useRef<THREE.Group>(null);
  const poolRef = useRef<ShardData[]>([]);
  const statesRef = useRef<ShapeVisualState[]>([]);
  const prevMoodArrayRef = useRef<number[]>([]);
  const shardScaleFactorRef = useRef(1);

  // Dynamic shard scale factor based on user count (computed at render time, not pool creation)
  const activeCount = moodArray.length;
  const shardScaleFactor = useMemo(
    () => Math.min(4.0 / Math.sqrt(Math.max(activeCount, 1)), maxShardSize) / GEOMETRY_BASE_SIZE,
    [activeCount, maxShardSize],
  );
  // Update ref for animation loop access (avoids stale closure)
  shardScaleFactorRef.current = shardScaleFactor;
  const minOrbitRadius = globeRadius + maxShardSize + buffer;

  // Create shared material (stable reference)
  const material = useMemo(() => createFrostedGlassMaterial(), []);

  // Initialize pool ONCE on mount (no shardSize dependency - scale at render time)
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    // Create pool of reusable shapes with fixed geometry size
    const pool: ShardData[] = [];
    const states: ShapeVisualState[] = [];

    for (let i = 0; i < MAX_POOL_SIZE; i++) {
      const geometry = new THREE.IcosahedronGeometry(GEOMETRY_BASE_SIZE, 0);
      const fallbackColor = getSlotFallbackColor(i);
      applyVertexColors(geometry, fallbackColor);

      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.useRefraction = true;
      mesh.frustumCulled = false;
      mesh.scale.setScalar(0); // Start invisible
      mesh.visible = true;

      group.add(mesh);
      pool.push({ mesh, geometry });
      states.push(createInitialState(i));
    }

    poolRef.current = pool;
    statesRef.current = states;

    return () => {
      for (const shard of pool) {
        shard.geometry.dispose();
        group.remove(shard.mesh);
      }
    };
  }, [material]); // ← Removed shardSize - pool created once!

  // Cleanup material on unmount
  useEffect(() => {
    return () => material.dispose();
  }, [material]);

  // Handle mood array changes - simple index-based identity (array[i] = slot[i])
  // Simplified: no stagger, no progress tracking - direct lerping handles smoothness
  useEffect(() => {
    const states = statesRef.current;
    const prevArray = prevMoodArrayRef.current;
    const newArray = moodArray;

    if (states.length === 0) return;

    const prevCount = prevArray.length;
    const newCount = newArray.length;
    const persistCount = Math.min(prevCount, newCount);

    // Update persisting slots (0 to persistCount-1)
    for (let i = 0; i < persistCount; i++) {
      const state = states[i];

      // Update target color if mood changed (lerp handles smooth transition)
      if (prevArray[i] !== newArray[i]) {
        state.targetColor = getMoodColor(newArray[i]);
        state.moodIndex = newArray[i];
      }

      // Update target position (lerp handles smooth transition)
      fibonacciDirection(i, newCount, state.targetDirection);
    }

    // Shrinking: mark excess slots as exiting (no stagger - lerp is smooth enough)
    for (let i = newCount; i < prevCount && i < MAX_POOL_SIZE; i++) {
      const state = states[i];
      if (state.status === 'active' || state.status === 'entering') {
        state.status = 'exiting';
        state.targetScale = 0;
      }
    }

    // Growing: mark new slots as entering (no stagger - instant position, lerp scale)
    for (let i = prevCount; i < newCount && i < MAX_POOL_SIZE; i++) {
      const state = states[i];
      state.status = 'entering';
      state.moodIndex = newArray[i];
      // New shapes start at their final position (no position lerp needed)
      fibonacciDirection(i, newCount, state.targetDirection);
      state.currentDirection.copy(state.targetDirection);
      // Set color immediately (no lerp needed for new shapes)
      state.targetColor = getMoodColor(newArray[i]);
      state.currentColor.copy(state.targetColor);
      // Scale animates from 0
      state.scale = 0;
      state.targetScale = 1;
    }

    prevMoodArrayRef.current = [...newArray];
  }, [moodArray]);

  // Animation loop - simplified with direct lerping (no progress tracking)
  useFrame((frameState, delta) => {
    const pool = poolRef.current;
    const states = statesRef.current;
    if (pool.length === 0) return;

    const dt = Math.min(delta, 0.1);
    const time = frameState.clock.elapsedTime;

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
      // Ignore ECS errors during hot reload
    }

    // Update material uniforms
    if (material.uniforms) {
      material.uniforms.breathPhase.value = currentBreathPhase;
      material.uniforms.time.value = time;
    }

    // Update each shape with direct lerping
    for (let i = 0; i < MAX_POOL_SIZE; i++) {
      const shard = pool[i];
      const state = states[i];

      // Skip idle shapes
      if (state.status === 'idle') {
        shard.mesh.scale.setScalar(0);
        continue;
      }

      // === SCALE (direct lerp toward target) ===
      const scaleDiff = state.targetScale - state.scale;
      if (Math.abs(scaleDiff) > 0.001) {
        state.scale += scaleDiff * Math.min(1, dt * SCALE_LERP_SPEED);
      } else {
        state.scale = state.targetScale;
      }

      // Transition states when scale animation completes
      if (state.status === 'entering' && state.scale >= 0.99) {
        state.scale = 1;
        state.status = 'active';
      } else if (state.status === 'exiting' && state.scale <= 0.01) {
        state.scale = 0;
        state.status = 'idle';
        state.moodIndex = -1;
      }

      // === COLOR (direct lerp toward target) ===
      state.currentColor.lerp(state.targetColor, Math.min(1, dt * COLOR_LERP_SPEED));
      updateVertexColors(shard.geometry, state.currentColor);

      // === POSITION (direct lerp toward target) ===
      state.currentDirection.lerp(state.targetDirection, Math.min(1, dt * POSITION_LERP_SPEED));

      // === RADIUS (direct lerp toward breathing-modulated target) ===
      const phaseOffset = (state.seed * 0.04) % 0.04; // Derive from single seed
      const modulatedRadius = targetRadius + (1 - currentBreathPhase - phaseOffset) * 0.15;
      const clampedTarget = Math.max(modulatedRadius, minOrbitRadius);
      state.currentRadius +=
        (clampedTarget - state.currentRadius) * Math.min(1, dt * RADIUS_LERP_SPEED);

      // === ORBITAL MOTION (derive speeds from single seed) ===
      const orbitSpeed = ORBIT_BASE_SPEED + (((state.seed * 0.1) % 0.01) - 0.005);
      state.orbitAngle += orbitSpeed * dt;
      _tempVec3.copy(state.currentDirection).applyAxisAngle(_orbitAxis, state.orbitAngle);

      // Perpendicular wobble
      _tangent1.copy(_tempVec3).cross(_upVector).normalize();
      if (_tangent1.lengthSq() < 0.001) _tangent1.set(1, 0, 0);
      _tangent2.copy(_tempVec3).cross(_tangent1).normalize();

      const wobblePhase = time * PERPENDICULAR_FREQUENCY * Math.PI * 2 + state.seed;
      const wobble1 = Math.sin(wobblePhase) * PERPENDICULAR_AMPLITUDE;
      const wobble2 = Math.cos(wobblePhase * 0.7) * PERPENDICULAR_AMPLITUDE * 0.6;

      // Ambient floating (derive from single seed)
      const ambientSeed = state.seed * 137.508;
      _ambientOffset.set(
        Math.sin(time * 0.4 + ambientSeed) * AMBIENT_SCALE,
        Math.sin(time * 0.3 + ambientSeed * 0.7) * AMBIENT_Y_SCALE,
        Math.cos(time * 0.35 + ambientSeed * 1.3) * AMBIENT_SCALE,
      );

      // Final position
      shard.mesh.position
        .copy(_tempVec3)
        .multiplyScalar(state.currentRadius)
        .addScaledVector(_tangent1, wobble1)
        .addScaledVector(_tangent2, wobble2)
        .add(_ambientOffset);

      // Rotation (derive speeds from single seed)
      const rotX = 0.7 + ((state.seed * 1.618 + 0.3) % 1) * 0.6;
      const rotY = 0.7 + ((state.seed * 2.236 + 0.7) % 1) * 0.6;
      shard.mesh.rotation.x += 0.002 * rotX;
      shard.mesh.rotation.y += 0.003 * rotY;

      // Final scale = base variation × breathing pulse × enter/exit × dynamic shard size
      const breathScale = 1.0 + currentBreathPhase * 0.05;
      const finalScale =
        state.baseScaleOffset * breathScale * state.scale * shardScaleFactorRef.current;
      shard.mesh.scale.setScalar(finalScale);
    }
  });

  return <group ref={groupRef} name="Particle Swarm" />;
}

export default ParticleSwarm;
