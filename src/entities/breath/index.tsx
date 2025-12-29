/**
 * Breath entity - central state container for all breathing animations
 * Following Koota pattern where entities are composed of traits
 *
 * Also supports optional debug traits for manual breathing control in Triplex
 */

import { useWorld } from 'koota/react';
import { useEffect } from 'react';
import { useBreathCurveConfig } from '../../contexts/BreathCurveContext';
import { useBreathController } from '../../contexts/breathController';
import { useBreathDebug } from '../../contexts/breathDebug';
import {
  breathCurveConfig,
  breathPhase,
  crystallization,
  debugPhaseJump,
  debugPhaseOverride,
  debugTimeControl,
  easedProgress,
  orbitRadius,
  phaseType,
  rawProgress,
  sphereScale,
  targetBreathPhase,
  targetCrystallization,
  targetOrbitRadius,
  targetSphereScale,
  velocityBreathPhase,
  velocityCrystallization,
  velocityOrbitRadius,
  velocitySphereScale,
} from './traits';

/**
 * Component that spawns the breath entity once on mount
 * Must be rendered early in the app initialization
 * Also reads breath curve configuration from context
 */
export function BreathEntity() {
  const world = useWorld();
  const curveConfig = useBreathCurveConfig();
  const debugConfig = useBreathDebug();
  const controllerConfig = useBreathController();

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: ECS entity initialization with multiple trait setup steps
  useEffect(() => {
    try {
      // Check if it already exists
      let entity = world.queryFirst(breathPhase);

      if (!entity) {
        entity = world.spawn(
          breathPhase,
          targetBreathPhase,
          phaseType,
          rawProgress,
          easedProgress,
          orbitRadius,
          targetOrbitRadius,
          sphereScale,
          targetSphereScale,
          crystallization,
          targetCrystallization,
          velocityBreathPhase,
          velocityOrbitRadius,
          velocitySphereScale,
          velocityCrystallization,
          breathCurveConfig,
        );
      } else {
        // Ensure all new traits are added to existing entity (for hot-reloading/updates)
        if (!entity.has(targetBreathPhase)) entity.add(targetBreathPhase);
        if (!entity.has(velocityBreathPhase)) entity.add(velocityBreathPhase);
        if (!entity.has(rawProgress)) entity.add(rawProgress);
        if (!entity.has(easedProgress)) entity.add(easedProgress);
        if (!entity.has(targetOrbitRadius)) entity.add(targetOrbitRadius);
        if (!entity.has(velocityOrbitRadius)) entity.add(velocityOrbitRadius);
        if (!entity.has(targetSphereScale)) entity.add(targetSphereScale);
        if (!entity.has(velocitySphereScale)) entity.add(velocitySphereScale);
        if (!entity.has(targetCrystallization)) entity.add(targetCrystallization);
        if (!entity.has(velocityCrystallization)) entity.add(velocityCrystallization);
        if (!entity.has(breathCurveConfig)) entity.add(breathCurveConfig);
      }

      // Update curve config trait from context
      if (entity && world.has(entity)) {
        entity.set(breathCurveConfig, {
          curveType: curveConfig.curveType,
          waveDelta: curveConfig.waveDelta ?? 0.05,
        });
      }

      // ============================================================
      // DEBUG TRAIT MANAGEMENT
      // Add/update debug traits when debug context is present
      // ============================================================
      if (debugConfig && entity && world.has(entity)) {
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
      // ============================================================
      // BREATH CONTROLLER FALLBACK (Production)
      // Only apply if debug context is NOT present (debug takes priority)
      // ============================================================
      else if (controllerConfig && entity && world.has(entity)) {
        // Add debugTimeControl trait if it doesn't exist
        if (!entity.has(debugTimeControl)) entity.add(debugTimeControl);

        // Update time control from controller context
        const current = entity.get(debugTimeControl);
        const manualTime = current?.manualTime ?? Date.now() / 1000;
        entity.set(debugTimeControl, {
          isPaused: controllerConfig.isPaused ?? false,
          timeScale: controllerConfig.timeScale ?? 1.0,
          manualTime,
        });
      }
    } catch (_e) {
      // Silently catch ECS errors during unmount/remount
    }

    return () => {
      // We don't destroy the breath entity here because it's a global singleton
      // and multiple components might depend on it. It will be cleaned up
      // when the world is destroyed.
    };
  }, [world, curveConfig.curveType, curveConfig.waveDelta, debugConfig, controllerConfig]);

  return null; // This component renders nothing
}
