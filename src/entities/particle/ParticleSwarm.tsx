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
 */
interface ShapeVisualState {
  /** Pool slot index (0 to MAX_POOL_SIZE-1) */
  poolIndex: number;
  /** Current status in lifecycle */
  status: ShapeStatus;
  /** Mood index (0-3) or -1 if idle/exiting */
  moodIndex: number;

  // Position animation (store start for proper easing)
  targetDirection: THREE.Vector3;
  startDirection: THREE.Vector3;
  currentDirection: THREE.Vector3;
  positionLerpProgress: number;

  // Color animation (store start for proper easing)
  startColor: THREE.Color;
  currentColor: THREE.Color;
  targetColor: THREE.Color;
  colorLerpProgress: number;

  // Scale animation (enter/exit) with stagger delay
  scale: number;
  targetScale: number;
  /** Stagger delay in seconds before animation starts */
  animationDelay: number;

  // Physics state
  currentRadius: number;
  velocity: number;
  previousTarget: number;
  orbitAngle: number;

  // Per-shape variation seeds
  phaseOffset: number;
  ambientSeed: number;
  rotationSpeedX: number;
  rotationSpeedY: number;
  baseScaleOffset: number;
  orbitSpeed: number;
  wobbleSeed: number;
}

interface ShardData {
  mesh: THREE.Mesh;
  geometry: THREE.IcosahedronGeometry;
}

// Physics constants
const SPRING_STIFFNESS = 6;
const SPRING_DAMPING = 4.5;
const EXPANSION_VELOCITY_BOOST = 2.5;
const AMBIENT_SCALE = 0.08;
const AMBIENT_Y_SCALE = 0.04;
const ORBIT_BASE_SPEED = 0.015;
const ORBIT_SPEED_VARIATION = 0.01;
const PERPENDICULAR_AMPLITUDE = 0.03;
const PERPENDICULAR_FREQUENCY = 0.35;
const MAX_PHASE_OFFSET = 0.04;

// Animation speeds
const ENTER_DURATION = 0.4; // seconds
const EXIT_DURATION = 0.3;
const COLOR_DURATION = 0.5;
const POSITION_DURATION = 0.6; // for redistribution
const STAGGER_DELAY = 0.06; // seconds between each shape in batch
const POSITION_THRESHOLD = 0.1; // minimum direction change to trigger animation

function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

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
 */
function createInitialState(poolIndex: number): ShapeVisualState {
  const goldenRatio = (1 + Math.sqrt(5)) / 2;
  const i = poolIndex;
  const fallbackColor = getSlotFallbackColor(i);

  return {
    poolIndex,
    status: 'idle',
    moodIndex: -1,

    targetDirection: new THREE.Vector3(0, 1, 0),
    startDirection: new THREE.Vector3(0, 1, 0),
    currentDirection: new THREE.Vector3(0, 1, 0),
    positionLerpProgress: 1,

    startColor: fallbackColor.clone(),
    currentColor: fallbackColor.clone(),
    targetColor: fallbackColor.clone(),
    colorLerpProgress: 1,

    scale: 0,
    targetScale: 0,
    animationDelay: 0,

    currentRadius: 4.5,
    velocity: 0,
    previousTarget: 4.5,
    orbitAngle: 0,

    phaseOffset: ((i * goldenRatio) % 1) * MAX_PHASE_OFFSET,
    ambientSeed: i * 137.508,
    rotationSpeedX: 0.7 + ((i * 1.618 + 0.3) % 1) * 0.6,
    rotationSpeedY: 0.7 + ((i * 2.236 + 0.7) % 1) * 0.6,
    baseScaleOffset: 0.9 + ((i * goldenRatio + 0.5) % 1) * 0.2,
    orbitSpeed: ORBIT_BASE_SPEED + (((i * Math.PI + 0.1) % 1) - 0.5) * 2 * ORBIT_SPEED_VARIATION,
    wobbleSeed: i * Math.E,
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

      // Update color if mood changed (store start for proper lerping)
      if (prevArray[i] !== newArray[i]) {
        state.startColor.copy(state.currentColor);
        state.targetColor = getMoodColor(newArray[i]);
        state.colorLerpProgress = 0;
        state.moodIndex = newArray[i];
      }

      // Only animate position if movement exceeds threshold
      fibonacciDirection(i, newCount, _tempVec3);
      const distance = state.currentDirection.distanceTo(_tempVec3);
      if (distance > POSITION_THRESHOLD) {
        state.startDirection.copy(state.currentDirection);
        state.targetDirection.copy(_tempVec3);
        state.positionLerpProgress = 0;
      } else {
        // Small movement - just snap
        state.targetDirection.copy(_tempVec3);
        state.currentDirection.copy(_tempVec3);
        state.positionLerpProgress = 1;
      }
    }

    // Shrinking: mark excess slots as exiting with stagger
    for (let i = newCount; i < prevCount && i < MAX_POOL_SIZE; i++) {
      const state = states[i];
      if (state.status === 'active' || state.status === 'entering') {
        state.status = 'exiting';
        state.targetScale = 0;
        // Stagger: shapes at higher indices exit later
        state.animationDelay = (i - newCount) * STAGGER_DELAY;
      }
    }

    // Growing: mark new slots as entering with stagger
    for (let i = prevCount; i < newCount && i < MAX_POOL_SIZE; i++) {
      const state = states[i];
      state.status = 'entering';
      state.moodIndex = newArray[i];
      fibonacciDirection(i, newCount, state.targetDirection);
      state.currentDirection.copy(state.targetDirection);
      state.startDirection.copy(state.targetDirection);
      state.positionLerpProgress = 1;
      state.targetColor = getMoodColor(newArray[i]);
      state.currentColor.copy(state.targetColor);
      state.startColor.copy(state.targetColor);
      state.colorLerpProgress = 1;
      state.scale = 0;
      state.targetScale = 1;
      // Stagger: shapes at higher indices enter later
      state.animationDelay = (i - prevCount) * STAGGER_DELAY;
    }

    prevMoodArrayRef.current = [...newArray];
  }, [moodArray]);

  // Animation loop
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Physics + animations require interleaved calculations
  useFrame((frameState, delta) => {
    const pool = poolRef.current;
    const states = statesRef.current;
    if (pool.length === 0) return;

    const clampedDelta = Math.min(delta, 0.1);
    const time = frameState.clock.elapsedTime;

    // Animation speeds
    const enterSpeed = 1 / ENTER_DURATION;
    const exitSpeed = 1 / EXIT_DURATION;
    const colorSpeed = 1 / COLOR_DURATION;
    const positionSpeed = 1 / POSITION_DURATION;

    // Get breathing state
    let targetRadius = baseRadius;
    let currentBreathPhase = 0;
    try {
      const breathEntity = world.queryFirst(orbitRadius);
      if (breathEntity) {
        targetRadius = breathEntity.get(orbitRadius)?.value ?? baseRadius;
        currentBreathPhase = breathEntity.get(breathPhase)?.value ?? 0;
      }
    } catch {
      // Ignore ECS errors
    }

    // Update material uniforms
    if (material.uniforms) {
      material.uniforms.breathPhase.value = currentBreathPhase;
      material.uniforms.time.value = time;
    }

    // Update each shape
    for (let i = 0; i < MAX_POOL_SIZE; i++) {
      const shard = pool[i];
      const state = states[i];

      if (state.status === 'idle') {
        shard.mesh.scale.setScalar(0);
        continue;
      }

      // === STAGGER DELAY (countdown before animation starts) ===
      if (state.animationDelay > 0) {
        state.animationDelay = Math.max(0, state.animationDelay - clampedDelta);
      }

      // === SCALE ANIMATION (respects stagger delay) ===
      if (state.status === 'entering') {
        if (state.animationDelay <= 0) {
          state.scale = Math.min(1, state.scale + clampedDelta * enterSpeed);
          if (state.scale >= 1) {
            state.scale = 1;
            state.status = 'active';
          }
        }
      } else if (state.status === 'exiting') {
        if (state.animationDelay <= 0) {
          state.scale = Math.max(0, state.scale - clampedDelta * exitSpeed);
          if (state.scale <= 0) {
            state.scale = 0;
            state.status = 'idle';
            state.moodIndex = -1;
          }
        }
      }

      // === COLOR ANIMATION (proper start→target lerp with easing) ===
      if (state.colorLerpProgress < 1) {
        state.colorLerpProgress = Math.min(1, state.colorLerpProgress + clampedDelta * colorSpeed);
        const t = easeOutQuad(state.colorLerpProgress);
        state.currentColor.lerpColors(state.startColor, state.targetColor, t);
        updateVertexColors(shard.geometry, state.currentColor);
      }

      // === POSITION ANIMATION (proper start→target lerp with easing) ===
      if (state.positionLerpProgress < 1) {
        state.positionLerpProgress = Math.min(
          1,
          state.positionLerpProgress + clampedDelta * positionSpeed,
        );
        const t = easeInOutQuad(state.positionLerpProgress);
        state.currentDirection.lerpVectors(state.startDirection, state.targetDirection, t);
      }

      // === PHYSICS ===
      const offsetBreathPhase = currentBreathPhase + state.phaseOffset;
      const phaseTargetRadius =
        targetRadius + (1 - offsetBreathPhase) * (baseRadius - targetRadius) * 0.15;
      const clampedTarget = Math.max(phaseTargetRadius, minOrbitRadius);

      const targetDelta = clampedTarget - state.previousTarget;
      if (targetDelta > 0.001) {
        state.velocity += targetDelta * EXPANSION_VELOCITY_BOOST;
      }
      state.previousTarget = clampedTarget;

      const springForce = (clampedTarget - state.currentRadius) * SPRING_STIFFNESS;
      const dampingForce = -state.velocity * SPRING_DAMPING;
      state.velocity += (springForce + dampingForce) * clampedDelta;
      state.currentRadius += state.velocity * clampedDelta;

      // Orbital drift (reuse temp vectors to avoid allocation)
      state.orbitAngle += state.orbitSpeed * clampedDelta;
      _tempVec3.copy(state.currentDirection).applyAxisAngle(_orbitAxis, state.orbitAngle);

      // Perpendicular wobble (reuse temp tangent vectors)
      _tangent1.copy(_tempVec3).cross(_upVector).normalize();
      if (_tangent1.lengthSq() < 0.001) _tangent1.set(1, 0, 0);
      _tangent2.copy(_tempVec3).cross(_tangent1).normalize();

      const wobblePhase = time * PERPENDICULAR_FREQUENCY * Math.PI * 2 + state.wobbleSeed;
      const wobble1 = Math.sin(wobblePhase) * PERPENDICULAR_AMPLITUDE;
      const wobble2 = Math.cos(wobblePhase * 0.7) * PERPENDICULAR_AMPLITUDE * 0.6;

      // Ambient floating (reuse temp vector)
      const seed = state.ambientSeed;
      _ambientOffset.set(
        Math.sin(time * 0.4 + seed) * AMBIENT_SCALE,
        Math.sin(time * 0.3 + seed * 0.7) * AMBIENT_Y_SCALE,
        Math.cos(time * 0.35 + seed * 1.3) * AMBIENT_SCALE,
      );

      // Final position
      shard.mesh.position
        .copy(_tempVec3)
        .multiplyScalar(state.currentRadius)
        .addScaledVector(_tangent1, wobble1)
        .addScaledVector(_tangent2, wobble2)
        .add(_ambientOffset);

      // Rotation
      shard.mesh.rotation.x += 0.002 * state.rotationSpeedX;
      shard.mesh.rotation.y += 0.003 * state.rotationSpeedY;

      // Final scale with breathing, enter/exit, and dynamic shard size
      const breathScale = 1.0 + currentBreathPhase * 0.05;
      const enterExitScale =
        state.status === 'entering' ? easeOutBack(state.scale) : easeOutQuad(state.scale);
      const finalScale =
        state.baseScaleOffset * breathScale * enterExitScale * shardScaleFactorRef.current;
      shard.mesh.scale.setScalar(finalScale);
    }
  });

  return <group ref={groupRef} name="Particle Swarm" />;
}

export default ParticleSwarm;
