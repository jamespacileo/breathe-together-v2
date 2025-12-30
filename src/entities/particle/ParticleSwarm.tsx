import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef } from 'react';
import { createNoise3D } from 'simplex-noise';
import * as THREE from 'three';
import type { MoodId } from '../../constants';
import { PARTICLE_PHYSICS, VISUALS } from '../../constants';
import { MOOD_METADATA } from '../../lib/colors';
import { generateFibonacciSphere } from '../../lib/fibonacciSphere';
import { breathPhase, crystallization, orbitRadius, sphereScale } from '../breath/traits';

const noise3D = createNoise3D();

// ============================================================================
// GLASS MATERIAL SYSTEM
// ============================================================================

type MaterialType = 'physical';
type BlendingMode = 'normal';

interface GlassMaterialConfig {
  material: MaterialType;
  blending: BlendingMode;
  opacity: number;
  metalness: number;
  roughness: number;
  emissiveIntensity: number;
  depthWrite: boolean;
  transmission: number;
  thickness: number;
  ior: number;
  clearcoat: number;
  clearcoatRoughness: number;
}

const GLASS_MATERIAL: GlassMaterialConfig = {
  material: 'physical',
  blending: 'normal',
  opacity: 0.95, // Nearly opaque to see edge highlights
  metalness: 0.0, // Dielectric (glass)
  roughness: 0.15, // ✅ Glossy surface for sharp reflections on facets
  emissiveIntensity: 0.8, // ✅ Strong internal glow for mood-colored particles
  depthWrite: true,
  transmission: 0.5, // ✅ Less see-through, more edge-focused
  thickness: 0.6, // ✅ Thinner glass for sharper refraction
  ior: 1.5, // Standard glass IOR
  clearcoat: 1.0, // ✅ Maximum edge reflection coating
  clearcoatRoughness: 0.05, // ✅ Mirror-sharp edge highlights (neon effect)
};

interface ParticleSwarmProps {
  /**
   * Total number of particles in the swarm (user + filler).
   *
   * Determines the size of the Fibonacci sphere layout and total particle count.
   * Larger values create denser visual coverage but increase GPU load.
   * Layout regenerates on capacity change (expensive).
   *
   * **When to adjust:** Sparse scenes (150-200), standard (300), dense/showcase (400-600)
   * **Typical range:** Sparse (150) → Standard (300, balanced) → Dense (600) → Max (1000, performance risk)
   * **Interacts with:** particleDensity scene prop (150/300/600 presets)
   * **Performance note:** O(n) GPU cost for rendering; capacity change triggers full reallocation
   *
   * @group "Configuration"
   * @min 100 @max 1000 @step 50
   * @default 300 (production baseline: balanced visual density and performance)
   */
  capacity?: number;

  /**
   * User mood distribution (mood ID → count).
   *
   * Determines how many particles display each mood color. First N particles
   * (where N = sum of mood counts) are assigned mood colors sequentially,
   * remaining particles become filler. Colors interpolate smoothly on change.
   *
   * **When to adjust:** Pass from usePresence() hook for live data, or hardcode for testing/demos
   * **Typical range:** Sum should be < capacity for some filler particles to show
   * **Interacts with:** moodColors (color overrides), capacity (total available), fillerColor (remaining particles)
   * **Performance note:** Color reassignment is O(n) but only runs on mood change (typically 1-2 times per minute)
   *
   * @group "Configuration"
   * @default undefined (all particles use fillerColor)
   */
  users?: Partial<Record<MoodId, number>>;

  /**
   * Minimum particle scale (visual size multiplier).
   *
   * Base size for particles at exhale phase. Particles pulse between minScale
   * and maxScale with breathing rhythm. Final size also affected by user/filler
   * distinction (user 1.2x, filler 0.8x) and phase pulse.
   *
   * **When to adjust:** Small (0.1-0.13), medium (0.15), large (0.2-0.25)
   * **Typical range:** Small (0.1) → Medium (0.15, balanced) → Large (0.2) → XLarge (0.25+)
   * **Interacts with:** maxScale (defines pulse range), breathPhase (current scale)
   * **Performance note:** No performance impact; just a multiplier
   *
   * @group "Visual Size"
   * @min 0.05 @max 0.3 @step 0.01
   * @default 0.15 (production baseline: visible facets and edges on glass icosahedrons)
   */
  minScale?: number;

  /**
   * Maximum particle scale (visual size multiplier).
   *
   * Peak size for particles at inhale phase. Particles pulse between minScale
   * and maxScale with breathing. Larger range creates more dramatic pulsing.
   * Should be >= minScale.
   *
   * **When to adjust:** Small pulse (0.2-0.25), medium (0.3), large (0.35-0.4)
   * **Typical range:** Small (0.2) → Medium (0.3, balanced) → Large (0.35) → XLarge (0.4+)
   * **Interacts with:** minScale (defines pulse range), breathPhase (current scale)
   * **Performance note:** No performance impact; just a multiplier
   *
   * @group "Visual Size"
   * @min 0.1 @max 0.6 @step 0.01
   * @default 0.3 (production baseline: prominent ice crystal appearance at inhale)
   */
  maxScale?: number;

  /**
   * Motion intensity multiplier (wind + jitter combined).
   *
   * Unified control for particle motion intensity. Controls both wind (organic drift)
   * and jitter (held-breath vibration) simultaneously. Values < 1.0 create calm,
   * meditative motion; values > 1.0 create energetic, dynamic motion.
   *
   * **When to adjust:** Calm/meditative (0.5-0.8), standard (1.0), energetic (1.2-1.8)
   * **Typical range:** Calm (0.5) → Standard (1.0, balanced) → Dynamic (1.5) → Chaotic (2.0+)
   * **Interacts with:** crystallization (wind auto-dampens during holds)
   * **Performance note:** No impact; just multipliers on force calculations
   *
   * @group "Physics - Forces"
   * @min 0.0 @max 2.0 @step 0.1
   * @default 1.0 (production baseline: standard motion)
   */
  motionIntensity?: number;

  /**
   * Spring responsiveness multiplier (spread tightness).
   *
   * Controls how snappily particles respond to breathing phase changes. Higher values
   * create tight, responsive motion following breath; lower values create loose,
   * organic drift. Preset-specific base values are multiplied by this.
   *
   * **When to adjust:** Loose/organic (0.5-0.8), standard (1.0), tight/snappy (1.2-1.5)
   * **Typical range:** Loose (0.5) → Standard (1.0, balanced) → Tight (1.2) → Rigid (1.5+)
   * **Interacts with:** breathPhase (spring target)
   * **Performance note:** No impact; just a multiplier on spring force
   *
   * @group "Physics - Orbit"
   * @min 0.5 @max 1.5 @step 0.1
   * @default 1.0 (production baseline: natural spring feel)
   */
  spreadTightness?: number;

  /**
   * Hex color for filler particles (non-user particles).
   *
   * Filler particles appear when total capacity exceeds user count.
   * They provide ambient background presence and fill visual gaps.
   * Default is a muted teal (#6B8A9C) for subtle presence.
   *
   * **When to adjust:** Match scene background (dark: lighter filler, light: darker filler)
   * **Typical range:** Muted colors work best (low saturation, mid-brightness)
   * **Interacts with:** moodColors (user colors), capacity vs user count (filler count)
   * **Performance note:** No impact; color set once on mount
   *
   * @group "Appearance"
   * @type color
   * @default '#6B8A9C' (production baseline: muted teal for ambient presence)
   */
  fillerColor?: string;
}

/**
 * Consolidated ParticleSwarm - handles physics, color sync, and rendering in one component.
 * All particles respond to global breathing cycle synchronized via breath entity.
 */
export function ParticleSwarm({
  capacity = 300,
  users,
  minScale = 0.15,
  maxScale = 0.3,
  fillerColor = '#6B8A9C',
  motionIntensity = 1.0,
  spreadTightness = 1.0,
}: Partial<ParticleSwarmProps> = {}) {
  const world = useWorld();

  // Glass material configuration (icosahedron geometry detail: 1 = 80 faces)
  const GEOMETRY_DETAIL = 1;

  const meshRef = useRef<THREE.InstancedMesh>(null);
  const fillerMeshRef = useRef<THREE.InstancedMesh>(null);
  const matrixRef = useRef(new THREE.Matrix4());
  const colorRef = useRef(new THREE.Color());

  // Allocate data structures once per capacity change
  const data = useMemo(() => {
    const layout = generateFibonacciSphere(capacity);

    const positions = new Float32Array(capacity * 3);
    const velocities = new Float32Array(capacity * 3);
    const restPositions = new Float32Array(capacity * 3);
    const seeds = new Float32Array(capacity);
    const colors = new Float32Array(capacity * 3);
    const targetColors = new Float32Array(capacity * 3);
    const brightness = new Float32Array(capacity);
    const sizes = new Float32Array(capacity);

    // Initialize rest positions (unit sphere from Fibonacci layout)
    for (let i = 0; i < capacity; i++) {
      const p = layout[i];
      // p is { theta, phi, distance } from sphere generation
      const x = Math.cos(p.theta) * Math.sin(p.phi);
      const y = Math.cos(p.phi);
      const z = Math.sin(p.theta) * Math.sin(p.phi);

      restPositions[i * 3 + 0] = x;
      restPositions[i * 3 + 1] = y;
      restPositions[i * 3 + 2] = z;

      seeds[i] = Math.random() * 1000;
      sizes[i] = 1.0;
      brightness[i] = 0.7; // Default to filler (glass particles)
    }

    // Initialize colors to filler
    const fillerCol = new THREE.Color(fillerColor);
    for (let i = 0; i < capacity; i++) {
      colors[i * 3 + 0] = fillerCol.r;
      colors[i * 3 + 1] = fillerCol.g;
      colors[i * 3 + 2] = fillerCol.b;
      targetColors[i * 3 + 0] = fillerCol.r;
      targetColors[i * 3 + 1] = fillerCol.g;
      targetColors[i * 3 + 2] = fillerCol.b;
    }

    return {
      positions,
      velocities,
      restPositions,
      seeds,
      colors,
      targetColors,
      brightness,
      sizes,
    };
  }, [capacity, fillerColor]);

  // Update colors when users data changes
  useEffect(() => {
    if (!users) {
      // No user data, all particles are filler
      const fillerCol = new THREE.Color(fillerColor);
      const fillerBrightness = 0.7; // Glass particles
      for (let i = 0; i < capacity; i++) {
        data.targetColors[i * 3 + 0] = fillerCol.r;
        data.targetColors[i * 3 + 1] = fillerCol.g;
        data.targetColors[i * 3 + 2] = fillerCol.b;
        data.brightness[i] = fillerBrightness;
      }
      return;
    }

    let idx = 0;

    // Assign mood colors to user particles (in order)
    for (const [moodId, count] of Object.entries(users)) {
      // Use MOOD_METADATA color for mood
      const moodColor = MOOD_METADATA[moodId as MoodId]?.color ?? '#7EC8D4';
      const col = new THREE.Color(moodColor);

      for (let i = 0; i < count && idx < capacity; i++, idx++) {
        data.targetColors[idx * 3 + 0] = col.r;
        data.targetColors[idx * 3 + 1] = col.g;
        data.targetColors[idx * 3 + 2] = col.b;
        data.brightness[idx] = 1.0;
      }
    }

    // Assign filler color to remaining particles
    const fillerCol = new THREE.Color(fillerColor);
    const fillerBrightness = 0.7; // Glass material brightness
    while (idx < capacity) {
      data.targetColors[idx * 3 + 0] = fillerCol.r;
      data.targetColors[idx * 3 + 1] = fillerCol.g;
      data.targetColors[idx * 3 + 2] = fillerCol.b;
      data.brightness[idx] = fillerBrightness;
      idx++;
    }
  }, [users, capacity, fillerColor, data]);

  // Physics + rendering loop
  useFrame((state, delta) => {
    const userMesh = meshRef.current;
    const fillerMesh = fillerMeshRef.current;
    if (!userMesh || !fillerMesh) return;

    // Query breath entity for current state
    const breathEntity = world.queryFirst(orbitRadius, sphereScale, crystallization, breathPhase);
    if (!breathEntity) return;

    const orbitRadiusTrait = breathEntity.get(orbitRadius);
    const sphereScaleTrait = breathEntity.get(sphereScale);
    const crystallizationTrait = breathEntity.get(crystallization);
    const breathPhaseTrait = breathEntity.get(breathPhase);

    if (!orbitRadiusTrait || !sphereScaleTrait || !crystallizationTrait) return;

    const currentOrbitRadius = orbitRadiusTrait.value;
    const currentSphereScale = sphereScaleTrait.value;
    const currentCryst = crystallizationTrait.value;
    const phase = breathPhaseTrait?.value ?? 0;

    // Calculate dynamic parameters based on breath phase
    const targetStiffness =
      phase * VISUALS.SPRING_STIFFNESS_INHALE + (1 - phase) * VISUALS.SPRING_STIFFNESS_EXHALE;
    const targetDrag =
      phase * VISUALS.PARTICLE_DRAG_INHALE + (1 - phase) * VISUALS.PARTICLE_DRAG_EXHALE;
    const springStiffness = targetStiffness;
    const drag = targetDrag ** (delta * 60); // Frame-rate independent

    const buoyancyStrength = phase * 0.05;
    const time = state.clock.elapsedTime;

    const tempForce = new THREE.Vector3();

    // Physics integration for each particle
    for (let i = 0; i < capacity; i++) {
      const rest = data.restPositions;
      const pos = data.positions;
      const vel = data.velocities;
      const s = data.seeds[i];

      tempForce.set(0, 0, 0);

      // 1. Spring force to orbit radius
      const MIN_RADIUS = 0.8;
      const MAX_RADIUS = 6.0;
      const targetRadius =
        MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * (currentOrbitRadius / VISUALS.PARTICLE_ORBIT_MAX);
      const targetX = rest[i * 3 + 0] * targetRadius;
      const targetY = rest[i * 3 + 1] * targetRadius;
      const targetZ = rest[i * 3 + 2] * targetRadius;

      tempForce.x += (targetX - pos[i * 3 + 0]) * springStiffness * spreadTightness;
      tempForce.y += (targetY - pos[i * 3 + 1]) * springStiffness * spreadTightness;
      tempForce.z += (targetZ - pos[i * 3 + 2]) * springStiffness * spreadTightness;

      // 2. Wind force (Simplex noise, dampened by crystallization)
      const windBaseStrength =
        PARTICLE_PHYSICS.WIND_BASE_STRENGTH * (1 - currentCryst) * motionIntensity;
      if (windBaseStrength > PARTICLE_PHYSICS.FORCE_THRESHOLD) {
        const nx =
          noise3D(
            pos[i * 3 + 0] * PARTICLE_PHYSICS.WIND_FREQUENCY_SCALE,
            pos[i * 3 + 1] * PARTICLE_PHYSICS.WIND_FREQUENCY_SCALE,
            time * PARTICLE_PHYSICS.WIND_TIME_SCALE + s,
          ) * windBaseStrength;
        const ny =
          noise3D(
            pos[i * 3 + 1] * PARTICLE_PHYSICS.WIND_FREQUENCY_SCALE,
            pos[i * 3 + 2] * PARTICLE_PHYSICS.WIND_FREQUENCY_SCALE,
            time * PARTICLE_PHYSICS.WIND_TIME_SCALE + s + PARTICLE_PHYSICS.WIND_NOISE_OFFSET_X,
          ) * windBaseStrength;
        const nz =
          noise3D(
            pos[i * 3 + 2] * PARTICLE_PHYSICS.WIND_FREQUENCY_SCALE,
            pos[i * 3 + 0] * PARTICLE_PHYSICS.WIND_FREQUENCY_SCALE,
            time * PARTICLE_PHYSICS.WIND_TIME_SCALE + s + PARTICLE_PHYSICS.WIND_NOISE_OFFSET_Y,
          ) * windBaseStrength;

        tempForce.x += nx;
        tempForce.y += ny;
        tempForce.z += nz;
      }

      // 3. Jitter force (High-freq sin, amplified by crystallization)
      const jitterBaseStrength = currentCryst * VISUALS.JITTER_STRENGTH * motionIntensity;
      if (jitterBaseStrength > PARTICLE_PHYSICS.FORCE_THRESHOLD) {
        const jx = Math.sin(time * PARTICLE_PHYSICS.JITTER_FREQUENCY_X + s) * jitterBaseStrength;
        const jy =
          Math.sin(
            time * PARTICLE_PHYSICS.JITTER_FREQUENCY_Y + s + PARTICLE_PHYSICS.JITTER_PHASE_OFFSET_Y,
          ) * jitterBaseStrength;
        const jz =
          Math.sin(
            time * PARTICLE_PHYSICS.JITTER_FREQUENCY_Z + s + PARTICLE_PHYSICS.JITTER_PHASE_OFFSET_Z,
          ) * jitterBaseStrength;

        tempForce.x += jx;
        tempForce.y += jy;
        tempForce.z += jz;
      }

      // 4. Sphere repulsion (Distance-squared optimization)
      const REPULSION_OFFSET = 0.4;
      const REPULSION_STRENGTH = 1.0;
      const repulsionRadius = currentSphereScale + REPULSION_OFFSET;
      const repulsionRadiusSq = repulsionRadius * repulsionRadius;
      const distSq =
        pos[i * 3 + 0] * pos[i * 3 + 0] +
        pos[i * 3 + 1] * pos[i * 3 + 1] +
        pos[i * 3 + 2] * pos[i * 3 + 2];

      if (distSq < repulsionRadiusSq && distSq > 0.001) {
        const dist = Math.sqrt(distSq);
        const repulsionFactor = (repulsionRadius - dist) / repulsionRadius;
        const push =
          repulsionFactor ** VISUALS.REPULSION_POWER *
          VISUALS.REPULSION_STRENGTH *
          PARTICLE_PHYSICS.REPULSION_STRENGTH_MULTIPLIER *
          REPULSION_STRENGTH;

        tempForce.x += (pos[i * 3 + 0] / dist) * push;
        tempForce.y += (pos[i * 3 + 1] / dist) * push;
        tempForce.z += (pos[i * 3 + 2] / dist) * push;
      }

      // 5. Buoyancy (subtle upward drift)
      tempForce.y += buoyancyStrength;

      // Integration (mass = 1.0)
      vel[i * 3 + 0] = (vel[i * 3 + 0] + tempForce.x * delta) * drag;
      vel[i * 3 + 1] = (vel[i * 3 + 1] + tempForce.y * delta) * drag;
      vel[i * 3 + 2] = (vel[i * 3 + 2] + tempForce.z * delta) * drag;

      pos[i * 3 + 0] += vel[i * 3 + 0] * delta;
      pos[i * 3 + 1] += vel[i * 3 + 1] * delta;
      pos[i * 3 + 2] += vel[i * 3 + 2] * delta;

      // Color interpolation
      const c = data.colors;
      const tc = data.targetColors;
      c[i * 3 + 0] +=
        (tc[i * 3 + 0] - c[i * 3 + 0]) *
        (1 - (1 - 0.1) ** (delta * VISUALS.PARTICLE_COLOR_DAMPING));
      c[i * 3 + 1] +=
        (tc[i * 3 + 1] - c[i * 3 + 1]) *
        (1 - (1 - 0.1) ** (delta * VISUALS.PARTICLE_COLOR_DAMPING));
      c[i * 3 + 2] +=
        (tc[i * 3 + 2] - c[i * 3 + 2]) *
        (1 - (1 - 0.1) ** (delta * VISUALS.PARTICLE_COLOR_DAMPING));
    }

    // Render particles
    const matrix = matrixRef.current;
    const color = colorRef.current;

    let userIdx = 0;
    let fillerIdx = 0;

    for (let i = 0; i < capacity; i++) {
      const isUser = data.brightness[i] > 0.5;
      const mesh = isUser ? userMesh : fillerMesh;
      const idx = isUser ? userIdx++ : fillerIdx++;

      if (idx >= capacity) continue;

      // Calculate scale with pulse
      const pulse = 1.0 + phase * (isUser ? 0.6 : 0.3);
      const swarmScale = minScale + (maxScale - minScale) * phase;
      const finalScale = data.sizes[i] * swarmScale * (isUser ? 1.2 : 0.8) * pulse;

      // Update matrix
      matrix.makeScale(finalScale, finalScale, finalScale);
      matrix.setPosition(
        data.positions[i * 3 + 0],
        data.positions[i * 3 + 1],
        data.positions[i * 3 + 2],
      );
      mesh.setMatrixAt(idx, matrix);

      // Update color with brightness
      const brightness = data.brightness[i];
      color.setRGB(
        data.colors[i * 3 + 0] * brightness,
        data.colors[i * 3 + 1] * brightness,
        data.colors[i * 3 + 2] * brightness,
      );
      mesh.setColorAt(idx, color);

      // Set emissive color for glass material
      if (GLASS_MATERIAL.emissiveIntensity > 0) {
        const mat = mesh.material as THREE.MeshPhysicalMaterial;
        if (mat.emissive) {
          mat.emissive.setRGB(
            data.colors[i * 3 + 0] * GLASS_MATERIAL.emissiveIntensity,
            data.colors[i * 3 + 1] * GLASS_MATERIAL.emissiveIntensity,
            data.colors[i * 3 + 2] * GLASS_MATERIAL.emissiveIntensity,
          );
          mat.emissiveIntensity = GLASS_MATERIAL.emissiveIntensity;
        }
      }
    }

    userMesh.count = userIdx;
    fillerMesh.count = fillerIdx;

    userMesh.instanceMatrix.needsUpdate = true;
    fillerMesh.instanceMatrix.needsUpdate = true;

    if (userMesh.instanceColor) userMesh.instanceColor.needsUpdate = true;
    if (fillerMesh.instanceColor) fillerMesh.instanceColor.needsUpdate = true;
  });

  // Create icosahedron geometry (detail: 1 = 80 faceted faces for visible edges)
  const geometry = useMemo(() => {
    return new THREE.IcosahedronGeometry(1, GEOMETRY_DETAIL);
  }, []);

  // Create glass material with vibrant neon edges
  const material = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      transparent: true,
      depthWrite: GLASS_MATERIAL.depthWrite,
      blending: THREE.NormalBlending,
      opacity: GLASS_MATERIAL.opacity,
      metalness: GLASS_MATERIAL.metalness,
      roughness: GLASS_MATERIAL.roughness,
      transmission: GLASS_MATERIAL.transmission,
      thickness: GLASS_MATERIAL.thickness,
      ior: GLASS_MATERIAL.ior,
      clearcoat: GLASS_MATERIAL.clearcoat,
      clearcoatRoughness: GLASS_MATERIAL.clearcoatRoughness,
    });
  }, []);

  return (
    <group name="Particle System">
      <instancedMesh name="User Particles" ref={meshRef} args={[geometry, material, capacity]} />
      <instancedMesh
        name="Filler Particles"
        ref={fillerMeshRef}
        args={[geometry, material, capacity]}
      />
    </group>
  );
}

export type { ParticleSwarmProps };
