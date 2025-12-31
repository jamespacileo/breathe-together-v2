/**
 * Breath entity - central state container for all breathing animations
 * Following Koota pattern where entities are composed of traits
 *
 * Architecture (Dec 2024): Only 4 core traits (no damping intermediates)
 * Also supports optional debug traits for manual breathing control in Triplex
 */

import { useWorld } from 'koota/react';
import { useEffect } from 'react';
import { useBreathDebug } from '../../contexts/breathDebug';
import {
  breathPhase,
  debugPhaseJump,
  debugPhaseOverride,
  debugTimeControl,
  orbitRadius,
  phaseType,
  rawProgress,
} from './traits';

/**
 * Component that spawns the breath entity once on mount
 * Must be rendered early in the app initialization
 */
export function BreathEntity() {
  const world = useWorld();
  const debugConfig = useBreathDebug();

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: ECS entity init + debug trait management requires multiple conditional branches
  useEffect(() => {
    try {
      // Check if it already exists
      let entity = world.queryFirst(breathPhase);

      if (!entity) {
        // Spawn breath entity with 4 core traits
        entity = world.spawn(breathPhase, phaseType, rawProgress, orbitRadius);
      }

      // ============================================================
      // DEBUG TRAIT MANAGEMENT
      // Add/update debug traits when debug context is present
      // Remove debug traits when debug context is disabled
      // ============================================================
      if (!debugConfig) {
        // Remove debug traits if debug context is disabled
        if (entity.has(debugPhaseOverride)) entity.remove(debugPhaseOverride);
        if (entity.has(debugTimeControl)) entity.remove(debugTimeControl);
        if (entity.has(debugPhaseJump)) entity.remove(debugPhaseJump);
      } else if (entity && world.has(entity)) {
        // Add debug traits if they don't exist
        if (!entity.has(debugPhaseOverride)) entity.add(debugPhaseOverride);
        if (!entity.has(debugTimeControl)) entity.add(debugTimeControl);
        if (!entity.has(debugPhaseJump)) entity.add(debugPhaseJump);

        // Update debug traits from context
        if (debugConfig.manualPhaseOverride !== undefined) {
          entity.set(debugPhaseOverride, {
            enabled: true,
            value: Math.max(0, Math.min(1, debugConfig.manualPhaseOverride)),
          });
        }

        if (debugConfig.isPaused !== undefined || debugConfig.timeScale !== undefined) {
          const current = entity.get(debugTimeControl);
          const manualTime = current?.manualTime ?? Date.now() / 1000;
          entity.set(debugTimeControl, {
            isPaused: debugConfig.isPaused ?? current?.isPaused ?? false,
            timeScale: debugConfig.timeScale ?? current?.timeScale ?? 1.0,
            manualTime,
          });
        }

        if (debugConfig.jumpToPhase !== undefined) {
          entity.set(debugPhaseJump, {
            targetPhase: debugConfig.jumpToPhase,
          });
        }
      }
    } catch (_e) {
      // Silently catch ECS errors during unmount/remount
    }

    return () => {
      // We don't destroy the breath entity here because it's a global singleton
      // and multiple components might depend on it. It will be cleaned up
      // when the world is destroyed.
    };
  }, [world, debugConfig]);

  return null; // This component renders nothing
}
