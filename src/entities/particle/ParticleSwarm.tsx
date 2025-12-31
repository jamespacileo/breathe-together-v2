/**
 * ParticleSwarm - Monument Valley inspired icosahedral shards
 *
 * Uses separate Mesh objects (not InstancedMesh) to match reference exactly.
 * Each mesh has per-vertex color attribute for mood coloring.
 * Rendered via RefractionPipeline 3-pass FBO system.
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { MoodId } from '../../constants';
import { MONUMENT_VALLEY_PALETTE } from '../../lib/colors';
import { breathPhase, orbitRadius } from '../breath/traits';
import { createFrostedGlassMaterial } from './FrostedGlassMaterial';

// Convert palette to THREE.Color array for random selection
const MOOD_COLORS = [
  new THREE.Color(MONUMENT_VALLEY_PALETTE.joy),
  new THREE.Color(MONUMENT_VALLEY_PALETTE.peace),
  new THREE.Color(MONUMENT_VALLEY_PALETTE.solitude),
  new THREE.Color(MONUMENT_VALLEY_PALETTE.love),
];

const MOOD_TO_COLOR: Record<MoodId, THREE.Color> = {
  grateful: new THREE.Color(MONUMENT_VALLEY_PALETTE.joy),
  celebrating: new THREE.Color(MONUMENT_VALLEY_PALETTE.joy),
  moment: new THREE.Color(MONUMENT_VALLEY_PALETTE.peace),
  here: new THREE.Color(MONUMENT_VALLEY_PALETTE.peace),
  anxious: new THREE.Color(MONUMENT_VALLEY_PALETTE.solitude),
  processing: new THREE.Color(MONUMENT_VALLEY_PALETTE.solitude),
  preparing: new THREE.Color(MONUMENT_VALLEY_PALETTE.love),
};

/**
 * Build color distribution array from presence data
 *
 * Converts mood counts into an array of Three.js Color instances, where each
 * user is represented by their mood color. This array is used for distributing
 * colors across particle shards.
 *
 * **Example:**
 * ```ts
 * const users = { calm: 3, energized: 2 };
 * // Returns: [calmColor, calmColor, calmColor, energizedColor, energizedColor]
 * ```
 *
 * **Performance:** Linear time O(n) where n is total user count. Called once
 * per presence update (typically ~1-5 times per minute).
 *
 * @param users - Mood distribution from presence data (e.g., { calm: 5, energized: 3 })
 * @returns Array of colors, one per user. Empty array if no users.
 */
function buildColorDistribution(users: Partial<Record<MoodId, number>> | undefined): THREE.Color[] {
  if (!users) return [];

  const colorDistribution: THREE.Color[] = [];
  for (const [moodId, moodCount] of Object.entries(users)) {
    const color = MOOD_TO_COLOR[moodId as MoodId];
    if (color) {
      for (let i = 0; i < (moodCount ?? 0); i++) {
        colorDistribution.push(color);
      }
    }
  }
  return colorDistribution;
}

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

export interface ParticleSwarmProps {
  /** Number of shards (default 48 matches reference) */
  count?: number;
  /** Users by mood for color distribution */
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

  // === Intro Animation Props ===

  /**
   * Enable staggered reveal animation on mount.
   *
   * When enabled, shards animate from center outward with staggered timing
   * creating a beautiful "bloom" welcome effect.
   *
   * @default true
   */
  enableIntroAnimation?: boolean;

  /**
   * Total duration of the intro animation in seconds.
   *
   * All shards will complete their reveal within this window.
   * Individual shard timing is distributed across this duration.
   *
   * @default 3.0
   * @min 0.5
   * @max 8.0
   */
  introDuration?: number;

  /**
   * Per-shard reveal animation duration in seconds.
   *
   * How long each individual shard takes to animate from hidden to visible.
   * Overlaps with other shards based on stagger timing.
   *
   * @default 1.2
   * @min 0.2
   * @max 3.0
   */
  introShardDuration?: number;

  /**
   * Starting radius for shards during intro animation.
   *
   * Shards animate from this radius outward to their orbit position.
   * 0 = start at center, higher = start closer to final position.
   *
   * @default 0.5
   * @min 0
   * @max 3.0
   */
  introStartRadius?: number;
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
 * - Intro animation: staggered reveal timing per shard
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

  // === Intro Animation State ===

  /** Staggered delay before this shard starts revealing (seconds) */
  introDelay: number;
  /** Initial random rotation for visual variety during reveal */
  introRotationOffset: THREE.Euler;
  /** Latitude angle (phi) on fibonacci sphere - used for bloom wave effect */
  latitude: number;
  /** Longitude angle (theta) on fibonacci sphere - used for spiral direction */
  longitude: number;
  /** Spiral rotation amount during intro (radians) */
  introSpiralAmount: number;
  /** Vertical offset during intro (world units) */
  introVerticalDrop: number;
  /** Tumble speed multiplier during intro (faster spin while emerging) */
  introTumbleSpeed: number;
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
 * Phase stagger for wave effect
 *
 * Small offset per particle creates flowing wave during breath transitions
 * Kept small (3-5%) to maintain "breathing together" feel
 */
const MAX_PHASE_OFFSET = 0.04; // 4% of breath cycle

/**
 * Easing function for smooth intro animation
 *
 * Custom ease-out-expo for a satisfying "bloom" feel:
 * - Starts fast (immediate visual feedback)
 * - Gradually slows (settles naturally into position)
 * - Asymptotic approach (never jarring stop)
 */
function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - 2 ** (-10 * t);
}

/**
 * Easing function for scale animation
 *
 * Custom ease-out-back for "pop" effect:
 * - Slight overshoot gives satisfying bounce
 * - Settles to final scale naturally
 */
function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

/**
 * Organic easing function for opacity fade-in
 *
 * Custom smooth curve inspired by natural breathing rhythm:
 * - Slow start (gentle emergence from nothing)
 * - Accelerates through middle (building presence)
 * - Soft landing (settles naturally into full opacity)
 *
 * Uses sine-based ease-in-out with slight asymmetry
 * to feel more alive and less mechanical
 */
function easeOrganicFade(t: number): number {
  // Combine sine easing with subtle cubic acceleration
  // Creates a "breathing" feel to the fade
  const sineEase = -(Math.cos(Math.PI * t) - 1) / 2;
  const cubicBoost = t * t * (3 - 2 * t); // Smoothstep

  // Blend: 70% sine (organic), 30% smoothstep (subtle acceleration)
  return sineEase * 0.7 + cubicBoost * 0.3;
}

/**
 * Global intro animation state
 *
 * Tracks animation start time and completion status
 * Shared across all shards for synchronized timing
 */
interface IntroAnimationState {
  /** Animation start time (clock.elapsedTime at mount) */
  startTime: number;
  /** Whether intro animation has completed */
  isComplete: boolean;
  /** Whether we've initialized the start time */
  isInitialized: boolean;
}

export function ParticleSwarm({
  count = 48,
  users,
  baseRadius = 4.5,
  baseShardSize = 4.0,
  globeRadius = 1.5,
  buffer = 0.3,
  maxShardSize = 0.6,
  // Intro animation props
  enableIntroAnimation = true,
  introDuration = 3.0,
  introShardDuration = 1.2,
  introStartRadius = 0.5,
}: ParticleSwarmProps) {
  const world = useWorld();
  const groupRef = useRef<THREE.Group>(null);
  const shardsRef = useRef<ShardData[]>([]);
  const physicsRef = useRef<ShardPhysicsState[]>([]);
  const introRef = useRef<IntroAnimationState>({
    startTime: 0,
    isComplete: !enableIntroAnimation,
    isInitialized: false,
  });

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

  // Create shards with per-vertex colors
  const shards = useMemo(() => {
    const result: ShardData[] = [];
    const colorDistribution = buildColorDistribution(users);

    for (let i = 0; i < count; i++) {
      const geometry = new THREE.IcosahedronGeometry(shardSize, 0);

      // Apply per-vertex color from distribution or random fallback
      const mood =
        colorDistribution[i] ?? MOOD_COLORS[Math.floor(Math.random() * MOOD_COLORS.length)];
      applyVertexColors(geometry, mood);

      // Fibonacci sphere distribution
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;
      const direction = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);

      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.useRefraction = true; // Mark for RefractionPipeline
      mesh.position.copy(direction).multiplyScalar(baseRadius);
      mesh.lookAt(0, 0, 0);
      mesh.frustumCulled = false;

      result.push({ mesh, direction, geometry });
    }

    return result;
  }, [count, users, baseRadius, shardSize, material]);

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

    // Calculate stagger timing for intro animation
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    const staggerWindow = introDuration - introShardDuration; // Time window for stagger distribution

    for (let i = 0; i < shards.length; i++) {
      const shard = shards[i];
      group.add(shard.mesh);

      // Calculate fibonacci sphere angles for this shard
      // phi = latitude (0 at top pole, PI at bottom pole)
      // theta = longitude (wraps around)
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;

      // Initialize mesh visibility for intro animation
      if (enableIntroAnimation) {
        shard.mesh.scale.setScalar(0); // Start invisible
        shard.mesh.position.copy(shard.direction).multiplyScalar(introStartRadius);
      }

      // Per-shard rotation speed variation (0.7-1.3 range)
      // Uses different seeds for X and Y to avoid synchronized rotation
      const rotSeedX = (i * 1.618 + 0.3) % 1; // Golden ratio offset
      const rotSeedY = (i * 2.236 + 0.7) % 1; // sqrt(5) offset
      const rotationSpeedX = 0.7 + rotSeedX * 0.6;
      const rotationSpeedY = 0.7 + rotSeedY * 0.6;

      // Base scale offset for depth (0.9-1.1 range) - subtle size variation
      const scaleSeed = (i * goldenRatio + 0.5) % 1;
      const baseScaleOffset = 0.9 + scaleSeed * 0.2;

      // === LATITUDE-BASED BLOOM STAGGER ===
      // Shards reveal in waves from poles to equator, creating a "blooming flower" effect
      // Distance from equator: 0 at equator (phi = PI/2), 1 at poles (phi = 0 or PI)
      const normalizedLatitude = Math.abs(phi - Math.PI / 2) / (Math.PI / 2); // 0 at equator, 1 at poles

      // Poles reveal first, equator last - creates expanding ring effect
      // Add slight randomness to prevent perfect synchronization
      const latitudeJitter = (Math.random() - 0.5) * 0.15;
      const introDelay = (1 - normalizedLatitude + latitudeJitter) * staggerWindow * 0.8;

      // Random rotation offset for visual variety during intro
      const introRotationOffset = new THREE.Euler(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
      );

      // === SPIRAL MOTION PARAMETERS ===
      // Each shard spirals outward during reveal - direction based on hemisphere
      // Northern hemisphere spirals clockwise, southern counter-clockwise
      const hemisphere = phi < Math.PI / 2 ? 1 : -1;
      const introSpiralAmount = hemisphere * (Math.PI * 0.5 + Math.random() * Math.PI * 0.3);

      // === VERTICAL DROP ===
      // Shards start slightly below their final position and rise up
      // Amount varies by latitude - equator shards drop more
      const introVerticalDrop = -0.8 - (1 - normalizedLatitude) * 0.6 + Math.random() * 0.3;

      // === TUMBLE SPEED ===
      // Faster tumbling during reveal, slows to normal rotation speed
      const introTumbleSpeed = 3 + Math.random() * 2; // 3-5x faster during intro

      physicsStates.push({
        currentRadius: enableIntroAnimation ? introStartRadius : baseRadius,
        velocity: 0,
        phaseOffset: ((i * goldenRatio) % 1) * MAX_PHASE_OFFSET,
        ambientSeed: i * 137.508, // Golden angle in degrees for unique patterns
        previousTarget: baseRadius,
        rotationSpeedX,
        rotationSpeedY,
        baseScaleOffset,
        introDelay: Math.max(0, introDelay), // Ensure non-negative
        introRotationOffset,
        latitude: phi,
        longitude: theta,
        introSpiralAmount,
        introVerticalDrop,
        introTumbleSpeed,
      });
    }

    // Reset intro animation state
    introRef.current = {
      startTime: 0,
      isComplete: !enableIntroAnimation,
      isInitialized: false,
    };

    shardsRef.current = shards;
    physicsRef.current = physicsStates;

    // Cleanup on unmount
    return () => {
      for (const shard of shards) {
        shard.geometry.dispose();
        group.remove(shard.mesh);
      }
    };
  }, [
    shards,
    baseRadius,
    enableIntroAnimation,
    introDuration,
    introShardDuration,
    introStartRadius,
    count,
  ]);

  // Cleanup material on unmount
  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  // Animation loop - intro animation + spring physics + ambient motion + shader updates
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Animation loop requires multiple force calculations (spring, ambient, intro reveal) + per-shard state management - refactoring would reduce readability and performance
  useFrame((state, delta) => {
    const currentShards = shardsRef.current;
    const physics = physicsRef.current;
    const intro = introRef.current;
    if (currentShards.length === 0 || physics.length === 0) return;

    // Cap delta to prevent physics explosion on tab switch
    const clampedDelta = Math.min(delta, 0.1);
    const time = state.clock.elapsedTime;

    // Initialize intro animation start time on first frame
    if (!intro.isInitialized && enableIntroAnimation) {
      intro.startTime = time;
      intro.isInitialized = true;
    }

    // Calculate intro animation elapsed time
    const introElapsed = time - intro.startTime;

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

    // Calculate global intro opacity with organic easing
    // This creates a soft "emerging from the void" effect for the whole swarm
    let globalOpacity = 1;
    if (enableIntroAnimation && !intro.isComplete) {
      // Opacity fades in over the first portion of the intro duration
      // Slightly faster than the full duration so shards are visible during their reveals
      const opacityDuration = introDuration * 0.6; // 60% of intro duration
      const opacityProgress = Math.min(introElapsed / opacityDuration, 1);
      globalOpacity = easeOrganicFade(opacityProgress);
    }

    // Update shader material uniforms for all shards
    // (shared material means updating once affects all)
    if (material.uniforms) {
      material.uniforms.breathPhase.value = currentBreathPhase;
      material.uniforms.time.value = time;
      material.uniforms.opacity.value = globalOpacity;
    }

    // Track if all shards have completed their intro animation
    let allIntroComplete = true;

    // Update each shard with intro animation + spring physics + ambient motion
    for (let i = 0; i < currentShards.length; i++) {
      const shard = currentShards[i];
      const shardState = physics[i];

      // === INTRO ANIMATION ===
      // Calculate per-shard intro progress based on staggered delay
      let introProgress = 1; // 1 = fully revealed (normal state)

      if (enableIntroAnimation && !intro.isComplete) {
        // Time since this shard's intro should start
        const shardElapsed = introElapsed - shardState.introDelay;

        if (shardElapsed < 0) {
          // Shard hasn't started revealing yet
          introProgress = 0;
          allIntroComplete = false;
        } else if (shardElapsed < introShardDuration) {
          // Shard is currently animating
          const rawProgress = shardElapsed / introShardDuration;
          introProgress = easeOutExpo(rawProgress);
          allIntroComplete = false;
        }
        // else: shardElapsed >= introShardDuration → introProgress = 1 (complete)
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

      // === PHYSICS (only when intro is progressing or complete) ===
      if (introProgress > 0) {
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

        // Integrate velocity and position (scaled by intro progress for smooth transition)
        shardState.velocity += totalForce * clampedDelta * introProgress;
        shardState.currentRadius += shardState.velocity * clampedDelta;

        // During intro, blend from intro start radius to physics-driven radius
        if (introProgress < 1) {
          const introRadius =
            introStartRadius + (shardState.currentRadius - introStartRadius) * introProgress;
          shardState.currentRadius = introRadius;
        }
      }

      // Ambient floating motion (secondary layer, scaled by intro progress)
      // Uses different frequencies per axis for organic feel
      const seed = shardState.ambientSeed;
      const ambientScale = introProgress; // Fade in ambient motion with intro
      const ambientX = Math.sin(time * 0.4 + seed) * AMBIENT_SCALE * ambientScale;
      const ambientY = Math.sin(time * 0.3 + seed * 0.7) * AMBIENT_Y_SCALE * ambientScale;
      const ambientZ = Math.cos(time * 0.35 + seed * 1.3) * AMBIENT_SCALE * ambientScale;

      // === POSITION CALCULATION ===
      if (introProgress < 1) {
        // During intro: apply spiral motion + vertical rise + radial expansion

        // Inverse progress for "remaining animation" calculations
        const remainingProgress = 1 - introProgress;

        // Spiral: rotate the direction vector around Y axis
        // Amount decreases as shard approaches final position
        const spiralAngle = shardState.introSpiralAmount * remainingProgress * remainingProgress;
        const spiralDirection = shard.direction.clone();
        spiralDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), spiralAngle);

        // Vertical rise: start below, rise to final Y position
        // Uses smooth ease-out for natural settling
        const verticalOffset = shardState.introVerticalDrop * remainingProgress * remainingProgress;

        // Combine: spiral direction × radius + vertical offset + ambient
        shard.mesh.position
          .copy(spiralDirection)
          .multiplyScalar(shardState.currentRadius)
          .add(new THREE.Vector3(ambientX, ambientY + verticalOffset, ambientZ));
      } else {
        // After intro: normal position (direction × radius + ambient)
        shard.mesh.position
          .copy(shard.direction)
          .multiplyScalar(shardState.currentRadius)
          .add(new THREE.Vector3(ambientX, ambientY, ambientZ));
      }

      // === ROTATION ===
      if (introProgress < 1) {
        // During intro: dynamic tumbling that slows as shard settles

        // Inverse progress for "remaining animation" calculations
        const remainingProgress = 1 - introProgress;

        // Tumble speed decreases as shard approaches final position
        // Starts fast (introTumbleSpeed), ends at normal speed (1x)
        const currentTumbleSpeed = 1 + (shardState.introTumbleSpeed - 1) * remainingProgress;

        // Random starting offset blends out as intro completes
        const offsetFade = remainingProgress * remainingProgress; // Quadratic fade
        const baseRotX = shardState.introRotationOffset.x * offsetFade;
        const baseRotY = shardState.introRotationOffset.y * offsetFade;
        const baseRotZ = shardState.introRotationOffset.z * offsetFade * 0.5; // Less Z tumble

        // Apply time-based rotation with tumble speed multiplier
        shard.mesh.rotation.x =
          baseRotX + time * 0.3 * shardState.rotationSpeedX * currentTumbleSpeed;
        shard.mesh.rotation.y =
          baseRotY + time * 0.4 * shardState.rotationSpeedY * currentTumbleSpeed;
        shard.mesh.rotation.z = baseRotZ + time * 0.15 * currentTumbleSpeed;
      } else {
        // After intro: normal continuous rotation
        shard.mesh.rotation.x += 0.002 * shardState.rotationSpeedX;
        shard.mesh.rotation.y += 0.003 * shardState.rotationSpeedY;
      }

      // === SCALE ===
      // Subtle scale breathing - shards pulse slightly with breath (3-8% range)
      // Combined with base scale offset for depth variation
      const breathScale = 1.0 + currentBreathPhase * 0.05; // 0-5% breath pulse
      const normalScale = shardState.baseScaleOffset * breathScale;

      if (introProgress < 1) {
        // During intro: animate scale from 0 to normal with "pop" effect
        const scaleProgress = easeOutBack(introProgress);
        shard.mesh.scale.setScalar(normalScale * scaleProgress);
      } else {
        // After intro: normal breathing scale
        shard.mesh.scale.setScalar(normalScale);
      }
    }

    // Mark intro as complete once all shards have finished
    if (enableIntroAnimation && allIntroComplete && !intro.isComplete) {
      intro.isComplete = true;
    }
  });

  return <group ref={groupRef} name="Particle Swarm" />;
}

export default ParticleSwarm;
