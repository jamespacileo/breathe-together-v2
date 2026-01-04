/**
 * Centralized Particle Physics Configuration
 *
 * Single source of truth for all particle swarm physics parameters.
 * Values are defined relative to globe radius for intuitive tuning.
 *
 * Key concept: All distances are expressed as multiples of globe radius
 * to maintain visual consistency when globe size changes.
 */

/**
 * Globe Configuration
 * The central sphere on which the earth texture is rendered
 */
export const GLOBE_CONFIG = {
  /** Radius of the globe sphere (where earth texture is rendered) */
  RADIUS: 1.5,
} as const;

/**
 * Particle Orbit Configuration
 * Distances are expressed relative to globe radius
 */
export const PARTICLE_ORBIT_CONFIG = {
  /**
   * Distance from globe SURFACE on inhale (closest approach)
   * Expressed as a multiple of globe radius
   * 0.5 = half a globe radius from surface
   */
  INHALE_SURFACE_DISTANCE_RATIO: 0.5,

  /**
   * Distance from globe SURFACE on exhale (farthest point)
   * Expressed as a multiple of globe radius
   * 3.0 = three globe radii from surface
   */
  EXHALE_SURFACE_DISTANCE_RATIO: 3.0,

  /**
   * Calculated orbit radii (from globe center)
   * MIN = globe radius + (inhale ratio × globe radius)
   * MAX = globe radius + (exhale ratio × globe radius)
   */
  get MIN_ORBIT_RADIUS() {
    return GLOBE_CONFIG.RADIUS * (1 + this.INHALE_SURFACE_DISTANCE_RATIO);
  },
  get MAX_ORBIT_RADIUS() {
    return GLOBE_CONFIG.RADIUS * (1 + this.EXHALE_SURFACE_DISTANCE_RATIO);
  },
} as const;

/**
 * Shard Sizing Configuration
 * Controls the size of individual particle shards
 */
export const SHARD_SIZE_CONFIG = {
  /** Base size used in calculation: size = baseSize / sqrt(count) */
  BASE_SIZE: 4.0,
  /** Maximum shard size (prevents oversized shards at low counts) */
  MAX_SIZE: 0.12,
  /** Minimum shard size (prevents tiny shards at high counts) */
  MIN_SIZE: 0.05,
  /** Buffer distance between shard surface and globe surface */
  BUFFER: 0.03,
} as const;

/**
 * Breath-Synchronized Scaling
 * Shards change size based on breath phase for dynamic composition
 */
export const BREATH_SCALE_CONFIG = {
  /** Scale multiplier at exhale (breathPhase=0, far from globe) */
  EXHALE_SCALE: 1.4,
  /** Scale multiplier at inhale (breathPhase=1, close to globe) */
  INHALE_SCALE: 0.6,
  /**
   * Calculate breath scale for a given phase
   * Interpolates between EXHALE_SCALE and INHALE_SCALE
   */
  getBreathScale(breathPhase: number): number {
    return this.EXHALE_SCALE - breathPhase * (this.EXHALE_SCALE - this.INHALE_SCALE);
  },
} as const;

/**
 * Keplerian Physics Configuration
 * Controls orbital velocity based on radius (v = √(GM/r))
 */
export const KEPLERIAN_CONFIG = {
  /** Base gravitational parameter (GM combined) */
  BASE_GM: 1.2,
  /** Reference radius for velocity normalization */
  REFERENCE_RADIUS: 4.5,
  /** How much breath phase affects apparent mass (0-1) */
  BREATH_MASS_MODULATION: 0.6,
  /** Minimum velocity multiplier (prevents stalling at large radii) */
  MIN_VELOCITY_FACTOR: 0.3,
  /** Maximum velocity multiplier (prevents excessive speed at small radii) */
  MAX_VELOCITY_FACTOR: 4.0,
  /** Base orbital drift speed (rad/s) */
  BASE_ORBIT_SPEED: 0.04,
  /** Per-shard speed variation (±) */
  ORBIT_SPEED_VARIATION: 0.02,
} as const;

/**
 * Ambient Motion Configuration
 * Subtle floating motion for organic feel
 */
export const AMBIENT_MOTION_CONFIG = {
  /** Horizontal floating amplitude */
  SCALE: 0.04,
  /** Vertical floating amplitude (half of horizontal) */
  Y_SCALE: 0.02,
  /** Perpendicular wobble amplitude */
  WOBBLE_AMPLITUDE: 0.015,
  /** Wobble frequency (Hz) */
  WOBBLE_FREQUENCY: 0.35,
  /** Phase offset for wave effect (as fraction of breath cycle) */
  MAX_PHASE_OFFSET: 0.04,
  /**
   * Wobble margin for collision calculations
   * = 2 × (WOBBLE_AMPLITUDE + SCALE)
   */
  get WOBBLE_MARGIN() {
    return 2 * (this.WOBBLE_AMPLITUDE + this.SCALE);
  },
} as const;

/**
 * Animation Smoothing
 */
export const ANIMATION_CONFIG = {
  /** How fast particles follow breathing radius changes */
  BREATH_LERP_SPEED: 6.0,
  /** How fast shards move to new positions when count changes */
  POSITION_LERP_SPEED: 3.0,
} as const;

/**
 * Performance Configuration
 */
export const PERFORMANCE_CONFIG = {
  /** Maximum number of shards to render (safety cap) */
  MAX_SHARD_COUNT: 1000,
  /** Fibonacci spacing factor for collision prevention */
  FIBONACCI_SPACING_FACTOR: 1.95,
} as const;

/**
 * Helper: Calculate expected orbit radius for a given breath phase
 * @param breathPhase 0 = exhaled (far), 1 = inhaled (close)
 * @returns Orbit radius from globe center
 */
export function calculateExpectedOrbitRadius(breathPhase: number): number {
  const min = PARTICLE_ORBIT_CONFIG.MIN_ORBIT_RADIUS;
  const max = PARTICLE_ORBIT_CONFIG.MAX_ORBIT_RADIUS;
  return max - breathPhase * (max - min);
}

/**
 * Helper: Calculate expected surface distance for a given breath phase
 * @param breathPhase 0 = exhaled (far), 1 = inhaled (close)
 * @returns Distance from globe surface
 */
export function calculateExpectedSurfaceDistance(breathPhase: number): number {
  return calculateExpectedOrbitRadius(breathPhase) - GLOBE_CONFIG.RADIUS;
}

/**
 * Derived constants for backwards compatibility with existing code
 * These values are computed from the config above
 */
export const DERIVED_CONSTANTS = {
  /** Min orbit radius in world units (for VISUALS.PARTICLE_ORBIT_MIN) */
  PARTICLE_ORBIT_MIN: PARTICLE_ORBIT_CONFIG.MIN_ORBIT_RADIUS,
  /** Max orbit radius in world units (for VISUALS.PARTICLE_ORBIT_MAX) */
  PARTICLE_ORBIT_MAX: PARTICLE_ORBIT_CONFIG.MAX_ORBIT_RADIUS,
} as const;

// Log derived values for debugging
if (typeof window !== 'undefined' && import.meta.env?.DEV) {
  console.log('[ParticlePhysics] Config loaded:', {
    globeRadius: GLOBE_CONFIG.RADIUS,
    inhaleSurfaceDistance:
      GLOBE_CONFIG.RADIUS * PARTICLE_ORBIT_CONFIG.INHALE_SURFACE_DISTANCE_RATIO,
    exhaleSurfaceDistance:
      GLOBE_CONFIG.RADIUS * PARTICLE_ORBIT_CONFIG.EXHALE_SURFACE_DISTANCE_RATIO,
    minOrbitRadius: PARTICLE_ORBIT_CONFIG.MIN_ORBIT_RADIUS,
    maxOrbitRadius: PARTICLE_ORBIT_CONFIG.MAX_ORBIT_RADIUS,
  });
}
