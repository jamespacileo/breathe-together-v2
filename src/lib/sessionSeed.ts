/**
 * Session Seed - Temporal fingerprinting for unique session experiences
 *
 * Master Craftsman Detail:
 * Each session gets a unique seed based on when the user arrives.
 * This creates subtle, imperceptible variation so no two sessions feel identical.
 *
 * Users never notice this consciously, but:
 * - Morning visit at 10:00:23 feels different from 10:00:47
 * - Particles have slightly different orbital patterns
 * - Animation timing has micro-variations
 *
 * The seed is stable for the entire session (computed once at module load).
 */

/**
 * Session seed: 0-1 value based on arrival time
 * Uses millisecond precision for fine-grained uniqueness
 */
export const SESSION_SEED = (() => {
  const now = Date.now();
  // Use multiple time scales for rich variation:
  // - Minute position (0-59999ms) for primary variation
  // - Hour position for secondary variation
  // Combined using golden ratio for even distribution
  const minutePosition = (now % 60000) / 60000;
  const hourPosition = ((now % 3600000) / 3600000) * 0.618;

  // Combine and normalize to 0-1
  return (minutePosition + hourPosition) % 1;
})();

/**
 * Generate a session-specific offset for animation timing
 *
 * @param baseValue - The base animation value
 * @param variationRange - Maximum variation as percentage (default 2%)
 * @returns Adjusted value with session-specific offset
 */
export function applySessionVariation(baseValue: number, variationRange = 0.02): number {
  const variation = (SESSION_SEED - 0.5) * 2 * variationRange;
  return baseValue * (1 + variation);
}

/**
 * Generate a deterministic pseudo-random value for a given index
 * Combines session seed with index for consistent per-element variation
 *
 * @param index - Element index (e.g., particle number)
 * @returns 0-1 value unique to this session and index
 */
export function getSessionIndexSeed(index: number): number {
  const goldenRatio = 1.618033988749;
  return (SESSION_SEED + index * goldenRatio) % 1;
}

/**
 * Apply session variation to orbit speeds
 * Shards orbit slightly differently each session
 *
 * @param baseSpeed - Base orbit speed
 * @param index - Shard index
 * @returns Session-adjusted orbit speed
 */
export function getSessionOrbitSpeed(baseSpeed: number, index: number): number {
  const indexSeed = getSessionIndexSeed(index);
  // ±2% variation based on session + index
  const variation = (indexSeed - 0.5) * 0.04;
  return baseSpeed * (1 + variation);
}
