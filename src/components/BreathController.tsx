/**
 * BreathController - Production breathing controls.
 *
 * Provides pause and speed controls for breathing animation in production scenes.
 *
 * ## Production Use Cases
 *
 * - Pause button in UI
 * - Accessibility controls (slow breathing for users who need extra time)
 * - Custom breathing rhythms
 *
 * ## Debug Alternative
 *
 * For frame-by-frame scrubbing and manual phase control, use BreathDebugPanel instead
 * (debug scenes only).
 *
 * ## Precedence Rule
 *
 * If BreathDebugContext is also present (e.g., in debug scenes),
 * debug context takes priority and this component is silently ignored.
 */

import { useMemo } from 'react';
import {
  type BreathControllerConfig,
  BreathControllerProvider,
} from '../contexts/breathController';

interface BreathControllerProps {
  /**
   * Pause the breathing animation.
   *
   * @default false
   */
  isPaused?: boolean;

  /**
   * Time scale multiplier for breathing animation speed.
   *
   * 1.0 = normal speed, 2.0 = double speed, 0.5 = half speed
   *
   * **When to adjust:**
   * - **0.5:** Accessibility - users who need extra time to breathe
   * - **1.0:** Normal breathing pace
   * - **1.5-2.0:** Faster breathing for energetic sessions or re-energizing
   *
   * @min 0.1
   * @max 5.0
   * @step 0.1
   * @default 1.0
   */
  timeScale?: number;
}

/**
 * BreathController component.
 *
 * Renders nothing (utility component). Provides breathing controls via context.
 *
 * Use in production scenes:
 *
 * ```typescript
 * <BreathingLevel />
 * <BreathController isPaused={isPausedState} timeScale={1.0} />
 * ```
 *
 * Use with pause button:
 *
 * ```typescript
 * const [isPaused, setIsPaused] = useState(false);
 *
 * return (
 *   <>
 *     <BreathingLevel />
 *     <BreathController isPaused={isPaused} />
 *     <button onClick={() => setIsPaused(!isPaused)}>
 *       {isPaused ? 'Resume' : 'Pause'}
 *     </button>
 *   </>
 * );
 * ```
 */
export function BreathController({
  isPaused = false,
  timeScale = 1.0,
}: BreathControllerProps = {}) {
  const config = useMemo<BreathControllerConfig | null>(() => {
    // Only provide context if values are non-default
    if (!isPaused && timeScale === 1.0) return null;

    return {
      isPaused,
      timeScale,
    };
  }, [isPaused, timeScale]);

  // Render nothing - this is a context provider only
  if (!config) {
    return null;
  }

  return <BreathControllerProvider config={config}>{null}</BreathControllerProvider>;
}
