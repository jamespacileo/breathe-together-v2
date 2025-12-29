import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { easing } from 'maath';
import { useEffect, useMemo, useRef } from 'react';
import { createNoise3D } from 'simplex-noise';
import * as THREE from 'three';
import type { MoodId } from '../../constants';
import { PARTICLE_PHYSICS, VISUALS } from '../../constants';
import { getMoodColorCounts, MOOD_METADATA } from '../../lib/colors';
import { generateFibonacciSphere } from '../../lib/fibonacciSphere';
import { breathPhase, crystallization, orbitRadius, sphereScale } from '../breath/traits';

const noise3D = createNoise3D();

// ============================================================================
// PARTICLE STYLE PRESET SYSTEM
// ============================================================================

type ParticleStyle = 'soft' | 'crystalline' | 'organic';
type GeometryType = 'plane' | 'icosahedron' | 'sphere';
type MaterialType = 'basic' | 'standard';
type BlendingMode = 'additive' | 'normal';

interface ParticleStyleConfig {
  geometry: GeometryType;
  geometryDetail: number;
  material: MaterialType;
  blending: BlendingMode;
  opacity: number;
  metalness: number;
  roughness: number;
  emissiveIntensity: number;
  depthWrite: boolean;
}

const PARTICLE_STYLE_PRESETS: Record<ParticleStyle, ParticleStyleConfig> = {
  soft: {
    geometry: 'icosahedron',
    geometryDetail: 2,
    material: 'basic',
    blending: 'additive',
    opacity: 0.6,
    metalness: 0,
    roughness: 1.0,
    emissiveIntensity: 0,
    depthWrite: false,
  },
  crystalline: {
    geometry: 'icosahedron',
    geometryDetail: 0,
    material: 'standard',
    blending: 'normal',
    opacity: 0.8,
    metalness: 0.7,
    roughness: 0.3,
    emissiveIntensity: 0.3,
    depthWrite: true,
  },
  organic: {
    geometry: 'sphere',
    geometryDetail: 10,
    material: 'standard',
    blending: 'normal',
    opacity: 0.7,
    metalness: 0.1,
    roughness: 0.7,
    emissiveIntensity: 0.2,
    depthWrite: true,
  },
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
   * **When to adjust:** Subtle particles (0.02-0.04), standard (0.05), prominent (0.08-0.12)
   * **Typical range:** Subtle (0.02) → Standard (0.05, balanced) → Prominent (0.1) → Large (0.15+)
   * **Interacts with:** maxScale (defines pulse range), breathPhase (current scale)
   * **Performance note:** No performance impact; just a multiplier
   *
   * @group "Visual Size"
   * @min 0.01 @max 0.2 @step 0.01
   * @default 0.05 (production baseline: balanced visibility without distraction)
   */
  minScale?: number;

  /**
   * Maximum particle scale (visual size multiplier).
   *
   * Peak size for particles at inhale phase. Particles pulse between minScale
   * and maxScale with breathing. Larger range creates more dramatic pulsing.
   * Should be >= minScale.
   *
   * **When to adjust:** Subtle pulse (0.06-0.08), standard (0.1), dramatic (0.15-0.2)
   * **Typical range:** Subtle (0.06) → Standard (0.1, balanced) → Dramatic (0.15) → Extreme (0.2+)
   * **Interacts with:** minScale (defines pulse range), breathPhase (current scale)
   * **Performance note:** No performance impact; just a multiplier
   *
   * @group "Visual Size"
   * @min 0.05 @max 0.5 @step 0.01
   * @default 0.1 (production baseline: noticeable but not distracting pulse)
   */
  maxScale?: number;

  /**
   * Minimum orbit radius (how close particles get during exhale).
   *
   * Particles spring toward this radius during exhale phase. Lower values bring
   * particles closer to the central sphere. Should be > sphere radius to avoid
   * z-fighting with sphere surface.
   *
   * **When to adjust:** Tight/intimate (0.5-0.8), standard (0.8-1.2), spacious (1.5-2.0)
   * **Typical range:** Tight (0.5) → Standard (0.8, production) → Spacious (1.5) → Distant (2.0)
   * **Interacts with:** sphereScale (sphere size), repulsionOffset (collision buffer), maxRadius (expansion range)
   * **Performance note:** No performance impact; affects spring target calculation only
   *
   * @group "Physics - Orbit"
   * @min 0.1 @max 2.0 @step 0.1
   * @default 0.8 (production baseline: close to sphere without collision)
   */
  minRadius?: number;

  /**
   * Maximum orbit radius (how far particles go during inhale).
   *
   * Particles spring toward this radius during inhale phase. Larger values create
   * expansive, breath-like motion. Difference between min/max defines the
   * breathing expansion range.
   *
   * **When to adjust:** Contained (3-4), standard (6), expansive (8-10)
   * **Typical range:** Contained (3) → Standard (6.0, production) → Expansive (8) → Extreme (10)
   * **Interacts with:** minRadius (defines expansion range), sphereScale (relative scale)
   * **Performance note:** No performance impact; affects spring target calculation only
   *
   * @group "Physics - Orbit"
   * @min 2.0 @max 10.0 @step 0.5
   * @default 6.0 (production baseline: balanced expansion feel)
   */
  maxRadius?: number;

  /**
   * Spring spread multiplier for orbit behavior.
   *
   * Affects how tightly particles spring to their target orbit. Higher values
   * create snappier, more responsive motion. Lower values create looser,
   * more organic drift. Multiplies the phase-reactive spring stiffness.
   *
   * **When to adjust:** Organic/loose (0.5-0.8), standard (1.0), tight/snappy (1.2-1.5)
   * **Typical range:** Loose (0.5) → Standard (1.0, balanced) → Tight (1.3) → Rigid (1.5+)
   * **Interacts with:** windStrength (combined with spring), breathPhase (stiffness varies by phase)
   * **Performance note:** No impact; just a multiplier on spring force
   *
   * @group "Physics - Orbit"
   * @min 0.1 @max 2.0 @step 0.1
   * @default 1.0 (production baseline: natural spring feel)
   */
  spread?: number;

  /**
   * Wind/turbulence strength multiplier for particle movement.
   *
   * Controls the intensity of simplex noise-based wind forces that create organic
   * drift and swirl. Wind is automatically dampened during hold phases (crystallization).
   * Higher values create more chaotic motion.
   *
   * **When to adjust:** Calm/meditative (0.3-0.7), standard (1.0), dynamic (1.3-1.8)
   * **Typical range:** Calm (0.5) → Standard (1.0, balanced) → Dynamic (1.5) → Chaotic (2.0)
   * **Interacts with:** jitterStrength (combined turbulence), crystallization (auto-dampening)
   * **Performance note:** ~0.5ms for 300 particles (3 noise evaluations per particle per frame)
   *
   * @group "Physics - Forces"
   * @min 0.0 @max 2.0 @step 0.1
   * @default 1.0 (production baseline: balanced organic motion)
   */
  windStrength?: number;

  /**
   * Jitter/shiver strength multiplier for high-frequency vibration.
   *
   * Adds subtle trembling motion to particles during hold phases. Intensity
   * increases with crystallization (0 during movement, max during holds).
   * Creates "held breath" visual effect. Uses prime frequencies (60/61/59 Hz)
   * on X/Y/Z axes to avoid alignment.
   *
   * **When to adjust:** Subtle (0.3-0.7), standard (1.0), pronounced (1.3-1.8)
   * **Typical range:** Subtle (0.5) → Standard (1.0, balanced) → Intense (1.5) → Extreme (2.0)
   * **Interacts with:** crystallization (amplifies during holds), windStrength (combined motion)
   * **Performance note:** Negligible; 3 sin() calls per particle per frame
   *
   * @group "Physics - Forces"
   * @min 0.0 @max 2.0 @step 0.1
   * @default 1.0 (production baseline: noticeable held-breath effect)
   */
  jitterStrength?: number;

  /**
   * Sphere repulsion strength multiplier.
   *
   * Prevents particles from entering the central sphere by applying outward
   * force when particles get too close. Higher values create "harder" sphere
   * boundary. Uses distance-squared optimization and power curve (exponent 2.0)
   * for realistic collision feel.
   *
   * **When to adjust:** Soft boundary (0.5-0.8), standard (1.0), hard boundary (1.2-1.5)
   * **Typical range:** Soft (0.5) → Standard (1.0, production) → Hard (1.3) → Rigid (1.5+)
   * **Interacts with:** repulsionOffset (boundary size), sphereScale (sphere size)
   * **Performance note:** Only evaluates when particles near sphere; typically 10-20% of particles per frame
   *
   * @group "Physics - Forces"
   * @min 0.0 @max 2.0 @step 0.1
   * @default 1.0 (production baseline: natural collision feel)
   */
  repulsionStrength?: number;

  /**
   * Additional radius beyond sphere for repulsion boundary.
   *
   * Defines how far from the sphere surface the repulsion force begins.
   * Larger values create a "bubble" of space around the sphere. Should be
   * slightly larger than maxScale to prevent particle-sphere overlap.
   *
   * **When to adjust:** Tight (0.2-0.3), standard (0.4-0.5), spacious (0.6-0.8)
   * **Typical range:** Tight (0.2) → Standard (0.4, production) → Spacious (0.6) → Wide (0.8)
   * **Interacts with:** repulsionStrength (force intensity), sphereScale (sphere size), maxScale (particle size)
   * **Performance note:** No impact; only affects distance threshold check
   *
   * @group "Physics - Forces"
   * @min 0.0 @max 2.0 @step 0.1
   * @default 0.4 (production baseline: prevents overlap with breathing expansion)
   */
  repulsionOffset?: number;

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

  /**
   * Brightness shift during crystallization/hold phases.
   *
   * Adds a brightness boost to particles during hold phases (crystallization = 1.0).
   * Creates visual emphasis on breath holds. Currently reserved for future enhancement.
   *
   * **When to adjust:** Subtle (0.1), standard (0.2), pronounced (0.3-0.4)
   * **Typical range:** Subtle (0.1) → Standard (0.2, baseline) → Bright (0.3) → Intense (0.5)
   * **Interacts with:** crystallization trait (current phase)
   * **Performance note:** Reserved for future use; currently no performance impact
   *
   * @group "Appearance"
   * @min 0.0 @max 0.5 @step 0.05
   * @default 0.2 (production baseline: reserved for future enhancement)
   */
  crystallizedShift?: number;

  /**
   * Per-mood color overrides for user particles.
   *
   * Allows customizing the color of particles for specific moods, overriding
   * the default colors from MOOD_METADATA. Only affects particles with that mood.
   * Colors interpolate smoothly when users change moods. Useful for testing,
   * theming, or visual debugging.
   *
   * **When to adjust:** Testing mood combinations, special event theming, debugging mood assignment
   * **Typical range:** Use hex colors (#RRGGBB) or CSS color names
   * **Interacts with:** users (determines particle-mood assignment), fillerColor (non-user particles)
   * **Performance note:** No impact; color assignment happens once per mood change (~1-2 times/minute)
   *
   * @group "Appearance"
   * @type color
   * @default undefined (uses MOOD_METADATA default colors)
   *
   * @example
   * ```tsx
   * <ParticleSwarm
   *   moodColors={{
   *     moment: '#ff0000',    // Override moment to red
   *     anxious: '#00ff00',   // Override anxious to green
   *   }}
   * />
   * ```
   */
  moodColors?: Partial<Record<MoodId, string>>;

  // ========== PARTICLE STYLE PRESETS ==========

  /**
   * Particle visual style preset.
   *
   * Controls geometry, material, and blending mode for distinct visual appearances:
   * - **soft**: Smooth icosahedron with additive blending (atmospheric glow, unlit)
   * - **crystalline**: Faceted icosahedron with PBR material (geometric, requires lighting)
   * - **organic**: Smooth sphere with PBR material (bioluminescent, requires lighting)
   *
   * **When to adjust:** Meditative scenes use 'soft', geometric/technical use 'crystalline', natural/organic use 'organic'
   * **Typical range:** soft (subtle) → crystalline (bold) → organic (natural)
   * **Interacts with:** particleGeometry/Material/Blending (granular overrides), scene lighting (standard materials require lights)
   * **Performance note:** 'standard' materials cost ~20% more GPU than 'basic' (PBR lighting calculations)
   *
   * ⚠️ **crystalline** and **organic** require scene lighting (Lighting component must be mounted)
   *
   * @group "Appearance"
   * @enum ["soft", "crystalline", "organic"]
   * @default 'soft' (production baseline: atmospheric meditation feel)
   */
  particleStyle?: ParticleStyle;

  /**
   * Particle geometry shape (overrides preset).
   *
   * @group "Appearance - Advanced"
   * @enum ["plane", "icosahedron", "sphere"]
   * @default undefined (uses preset value)
   */
  particleGeometry?: GeometryType;

  /**
   * Geometry detail level (overrides preset).
   *
   * - Planes: ignored
   * - Icosahedron: 0 = faceted (20 faces), 1 = smooth (80 faces), 2 = very smooth (320 faces)
   * - Sphere: number of segments (8 = low-poly, 16 = balanced, 32 = high-poly)
   *
   * @group "Appearance - Advanced"
   * @min 0 @max 32 @step 1
   * @default undefined (uses preset value)
   */
  particleDetailLevel?: number;

  /**
   * Material type (overrides preset).
   *
   * - **basic**: Unlit, simple shading (no lighting required)
   * - **standard**: PBR lighting (requires scene lighting, supports metalness/roughness)
   *
   * @group "Appearance - Advanced"
   * @enum ["basic", "standard"]
   * @default undefined (uses preset value)
   */
  particleMaterial?: MaterialType;

  /**
   * Blending mode (overrides preset).
   *
   * - **additive**: Colors add (glow/washout effect, good for dark backgrounds)
   * - **normal**: Standard alpha blending (solid colors, no washout)
   *
   * @group "Appearance - Advanced"
   * @enum ["additive", "normal"]
   * @default undefined (uses preset value)
   */
  particleBlending?: BlendingMode;

  /**
   * Particle opacity (overrides preset).
   *
   * @group "Appearance - Advanced"
   * @min 0.0 @max 1.0 @step 0.05
   * @default undefined (uses preset value)
   */
  particleOpacity?: number;

  /**
   * Metalness for standard material (overrides preset).
   *
   * Only applies when particleMaterial = 'standard'.
   * 0 = dielectric (wood/plastic), 1 = metal.
   *
   * @group "Appearance - Advanced"
   * @min 0.0 @max 1.0 @step 0.05
   * @default undefined (uses preset value)
   */
  particleMetalness?: number;

  /**
   * Roughness for standard material (overrides preset).
   *
   * Only applies when particleMaterial = 'standard'.
   * 0 = smooth/shiny, 1 = rough/diffuse.
   *
   * @group "Appearance - Advanced"
   * @min 0.0 @max 1.0 @step 0.05
   * @default undefined (uses preset value)
   */
  particleRoughness?: number;

  /**
   * Emissive intensity for standard material (overrides preset).
   *
   * Only applies when particleMaterial = 'standard'.
   * Adds self-glow using the particle's mood color. Boosts color visibility.
   *
   * @group "Appearance - Advanced"
   * @min 0.0 @max 1.0 @step 0.05
   * @default undefined (uses preset value)
   */
  particleEmissiveIntensity?: number;

  // ========== PHYSICS TOGGLES ==========

  /**
   * Enable wind/turbulence force.
   *
   * Simplex noise-based organic drift. Auto-dampens during hold phases.
   *
   * @group "Physics - Forces"
   * @default true
   */
  enableWind?: boolean;

  /**
   * Enable jitter/shiver force.
   *
   * High-frequency vibration during hold phases (crystallization).
   *
   * @group "Physics - Forces"
   * @default true
   */
  enableJitter?: boolean;

  /**
   * Enable sphere repulsion force.
   *
   * Prevents particles from entering the central breathing sphere.
   *
   * @group "Physics - Forces"
   * @default true
   */
  enableRepulsion?: boolean;

  /**
   * Enable buoyancy force.
   *
   * Subtle upward drift during inhale phase.
   *
   * @group "Physics - Forces"
   * @default true
   */
  enableBuoyancy?: boolean;

  /**
   * Enable particle scale pulse.
   *
   * Breathing-synchronized size changes (independent of physics forces).
   *
   * @group "Visual Size"
   * @default true
   */
  enablePulse?: boolean;
}

/**
 * Consolidated ParticleSwarm - handles physics, color sync, and rendering in one component.
 * All particles respond to global breathing cycle synchronized via breath entity.
 */
export function ParticleSwarm({
  capacity = 300,
  users,
  minScale = 0.25,
  maxScale = 0.5,
  minRadius = 0.8,
  maxRadius = 6.0,
  spread = 1.0,
  windStrength = 1.0,
  jitterStrength = 1.0,
  repulsionStrength = 1.0,
  repulsionOffset = 0.4,
  fillerColor = '#6B8A9C',
  crystallizedShift = 0.2,
  moodColors,
  particleStyle = 'soft',
  particleGeometry,
  particleDetailLevel,
  particleMaterial,
  particleBlending,
  particleOpacity,
  particleMetalness,
  particleRoughness,
  particleEmissiveIntensity,
  enableWind = true,
  enableJitter = true,
  enableRepulsion = true,
  enableBuoyancy = true,
  enablePulse = true,
}: ParticleSwarmProps = {}) {
  const world = useWorld();

  // Resolve style configuration (preset + overrides)
  const styleConfig = PARTICLE_STYLE_PRESETS[particleStyle];
  const resolvedStyle: ParticleStyleConfig = {
    geometry: particleGeometry ?? styleConfig.geometry,
    geometryDetail: particleDetailLevel ?? styleConfig.geometryDetail,
    material: particleMaterial ?? styleConfig.material,
    blending: particleBlending ?? styleConfig.blending,
    opacity: particleOpacity ?? styleConfig.opacity,
    metalness: particleMetalness ?? styleConfig.metalness,
    roughness: particleRoughness ?? styleConfig.roughness,
    emissiveIntensity: particleEmissiveIntensity ?? styleConfig.emissiveIntensity,
    depthWrite: styleConfig.depthWrite,
  };

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
      const defaultBrightness = particleStyle === 'soft' ? 0.4 : 0.7;
      brightness[i] = defaultBrightness; // Default to filler
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
  }, [capacity, fillerColor, particleStyle]);

  // Update colors when users data changes
  useEffect(() => {
    if (!users) {
      // No user data, all particles are filler
      const fillerCol = new THREE.Color(fillerColor);
      const defaultBrightness = particleStyle === 'soft' ? 0.4 : 0.7;
      for (let i = 0; i < capacity; i++) {
        data.targetColors[i * 3 + 0] = fillerCol.r;
        data.targetColors[i * 3 + 1] = fillerCol.g;
        data.targetColors[i * 3 + 2] = fillerCol.b;
        data.brightness[i] = defaultBrightness;
      }
      return;
    }

    let idx = 0;

    // Assign mood colors to user particles (in order)
    for (const [moodId, count] of Object.entries(users)) {
      // Check for mood color override, otherwise use MOOD_METADATA default
      const moodColor =
        moodColors?.[moodId as MoodId] ?? MOOD_METADATA[moodId as MoodId]?.color ?? '#7EC8D4';
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
    const fillerBrightness = particleStyle === 'soft' ? 0.4 : 0.7;
    while (idx < capacity) {
      data.targetColors[idx * 3 + 0] = fillerCol.r;
      data.targetColors[idx * 3 + 1] = fillerCol.g;
      data.targetColors[idx * 3 + 2] = fillerCol.b;
      data.brightness[idx] = fillerBrightness;
      idx++;
    }
  }, [users, capacity, fillerColor, data, moodColors, particleStyle]);

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
      const targetRadius =
        minRadius + (maxRadius - minRadius) * (currentOrbitRadius / VISUALS.PARTICLE_ORBIT_MAX);
      const targetX = rest[i * 3 + 0] * targetRadius;
      const targetY = rest[i * 3 + 1] * targetRadius;
      const targetZ = rest[i * 3 + 2] * targetRadius;

      tempForce.x += (targetX - pos[i * 3 + 0]) * springStiffness * spread;
      tempForce.y += (targetY - pos[i * 3 + 1]) * springStiffness * spread;
      tempForce.z += (targetZ - pos[i * 3 + 2]) * springStiffness * spread;

      // 2. Wind force (Simplex noise, dampened by crystallization)
      if (enableWind) {
        const windBaseStrength =
          PARTICLE_PHYSICS.WIND_BASE_STRENGTH * (1 - currentCryst) * windStrength;
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
      }

      // 3. Jitter force (High-freq sin, amplified by crystallization)
      if (enableJitter) {
        const jitterBaseStrength = currentCryst * VISUALS.JITTER_STRENGTH * jitterStrength;
        if (jitterBaseStrength > PARTICLE_PHYSICS.FORCE_THRESHOLD) {
          const jx = Math.sin(time * PARTICLE_PHYSICS.JITTER_FREQUENCY_X + s) * jitterBaseStrength;
          const jy =
            Math.sin(
              time * PARTICLE_PHYSICS.JITTER_FREQUENCY_Y +
                s +
                PARTICLE_PHYSICS.JITTER_PHASE_OFFSET_Y,
            ) * jitterBaseStrength;
          const jz =
            Math.sin(
              time * PARTICLE_PHYSICS.JITTER_FREQUENCY_Z +
                s +
                PARTICLE_PHYSICS.JITTER_PHASE_OFFSET_Z,
            ) * jitterBaseStrength;

          tempForce.x += jx;
          tempForce.y += jy;
          tempForce.z += jz;
        }
      }

      // 4. Sphere repulsion (Distance-squared optimization)
      if (enableRepulsion) {
        const repulsionRadius = currentSphereScale + repulsionOffset;
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
            repulsionStrength;

          tempForce.x += (pos[i * 3 + 0] / dist) * push;
          tempForce.y += (pos[i * 3 + 1] / dist) * push;
          tempForce.z += (pos[i * 3 + 2] / dist) * push;
        }
      }

      // 5. Buoyancy (subtle upward drift)
      if (enableBuoyancy) {
        tempForce.y += buoyancyStrength;
      }

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

      // Set emissive for standard materials (crystalline/organic presets)
      if (resolvedStyle.material === 'standard' && resolvedStyle.emissiveIntensity > 0) {
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat.emissive) {
          mat.emissive.setRGB(
            data.colors[i * 3 + 0] * resolvedStyle.emissiveIntensity,
            data.colors[i * 3 + 1] * resolvedStyle.emissiveIntensity,
            data.colors[i * 3 + 2] * resolvedStyle.emissiveIntensity,
          );
          mat.emissiveIntensity = resolvedStyle.emissiveIntensity;
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

  // Create geometry based on resolved style
  const geometry = useMemo(() => {
    switch (resolvedStyle.geometry) {
      case 'plane':
        return new THREE.PlaneGeometry(1, 1);
      case 'sphere':
        return new THREE.SphereGeometry(
          1,
          resolvedStyle.geometryDetail,
          resolvedStyle.geometryDetail,
        );
      case 'icosahedron':
      default:
        return new THREE.IcosahedronGeometry(1, resolvedStyle.geometryDetail);
    }
  }, [resolvedStyle.geometry, resolvedStyle.geometryDetail]);

  // Create material based on resolved style
  const material = useMemo(() => {
    const blendingMode =
      resolvedStyle.blending === 'additive' ? THREE.AdditiveBlending : THREE.NormalBlending;

    if (resolvedStyle.material === 'basic') {
      return new THREE.MeshBasicMaterial({
        transparent: true,
        depthWrite: resolvedStyle.depthWrite,
        blending: blendingMode,
        opacity: resolvedStyle.opacity,
      });
    } else {
      // 'standard'
      return new THREE.MeshStandardMaterial({
        transparent: true,
        depthWrite: resolvedStyle.depthWrite,
        blending: blendingMode,
        opacity: resolvedStyle.opacity,
        metalness: resolvedStyle.metalness,
        roughness: resolvedStyle.roughness,
      });
    }
  }, [
    resolvedStyle.material,
    resolvedStyle.blending,
    resolvedStyle.opacity,
    resolvedStyle.metalness,
    resolvedStyle.roughness,
    resolvedStyle.depthWrite,
  ]);

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
