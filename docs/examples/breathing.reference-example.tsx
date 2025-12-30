/**
 * REFERENCE EXAMPLE: Triplex Composition Patterns (Refactored)
 *
 * This file demonstrates recommended patterns for composing Triplex-integrated entities.
 * Refactored to use literal defaults and reduced prop surface.
 *
 * Key Principles:
 * 1. Literal defaults in function signatures (Triplex requirement)
 * 2. Single Source of Truth: Entity owns its defaults
 * 3. Scene pass-through: Scene never redeclares entity defaults
 *
 * See docs/triplex/06-composition-patterns.md for full guidelines.
 */

import { BreathingSphere } from '../../src/entities/breathingSphere';
import { Environment } from '../../src/entities/environment';
import type { BreathingDebugSceneProps, BreathingLevelProps } from '../../src/types/sceneProps';

// ============================================================================
// PATTERN: Entity Owns Defaults (RECOMMENDED)
// ============================================================================

/**
 * RECOMMENDED PATTERN: Entity Owns Defaults
 *
 * Use when:
 * - Scene is the primary edit target in Triplex
 * - You want to avoid default drift between scene and entity
 *
 * Advantage: Single source of truth. Clean scene code.
 * Disadvantage: Entity defaults not visible in scene file (but visible in Triplex).
 */
export function RecommendedScene() {
  return (
    <>
      <Environment />

      <BreathingSphere />
    </>
  );
}

// ============================================================================
// PATTERN: Debug Scene with Intentional Overrides
// ============================================================================

/**
 * PATTERN: Debug Scene with Intentional Overrides
 *
 * Use when:
 * - Creating a variant scene (debug, preset, theme)
 * - Scene intentionally uses different defaults
 */
export function DebugScene({ ...restProps }: Partial<BreathingDebugSceneProps> = {}) {
  return <RecommendedScene {...restProps} />;
}

// ============================================================================
// ANTI-PATTERNS: What NOT to Do
// ============================================================================

/**
 * ❌ ANTI-PATTERN: Non-Literal Defaults
 *
 * Problem: Breaks Triplex static analysis. Triplex can't resolve variables
 * in function signatures.
 */
// const DEFAULTS = { opacity: 0.12 };
// export function AntiPatternNonLiteral({
//   opacity = DEFAULTS.opacity, // ❌ BREAKS TRIPLEX
// }: any) { ... }

/**
 * ❌ ANTI-PATTERN: Redundant Defaults
 *
 * Problem: Duplicating entity defaults in the scene. If the entity default
 * changes, the scene default becomes stale and confusing.
 */
export function AntiPatternRedundantDefaults({
  // ❌ BAD: Duplicated from BreathingSphere
  sphereOpacity = 0.12,
}: {
  sphereOpacity?: number;
} = {}) {
  return <BreathingSphere mainOpacity={sphereOpacity} />;
}
