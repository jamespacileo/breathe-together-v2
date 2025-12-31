/**
 * InspirationalParticleText - Store-Connected Particle Text
 *
 * Wrapper component that connects ParticleText3D to the inspirational text store.
 * Handles message initialization, cycle advancement, and RAF-based opacity.
 *
 * This is the drop-in 3D alternative to src/components/InspirationalText.tsx
 */

import { memo, useEffect, useRef } from 'react';
import { useShallow } from 'zustand/shallow';
import { AMBIENT_MESSAGES, WELCOME_INTRO } from '../../config/inspirationalSequences';
import { BREATH_TOTAL_CYCLE } from '../../constants';
import { calculatePhaseInfo } from '../../lib/breathPhase';
import { useInspirationalTextStore } from '../../stores/inspirationalTextStore';
import { ParticleText3D } from './ParticleText3D';

/**
 * InspirationalParticleText - 3D particle text connected to inspirational text store
 *
 * Features:
 * - Auto-initializes ambient message pool and welcome intro
 * - Advances message queue on breathing cycle completion
 * - Renders text as 3D particles via ParticleText3D
 *
 * @example
 * ```tsx
 * // In a scene component inside Canvas:
 * <InspirationalParticleText />
 * ```
 */
function InspirationalParticleTextComponent() {
  const prevPhaseRef = useRef(-1);

  // Consolidated store selector - single subscription with shallow comparison
  const {
    getCurrentMessage,
    advanceCycle,
    setAmbientPool,
    enqueue,
    ambientPool,
    currentSequence,
    ambientIndex,
  } = useInspirationalTextStore(
    useShallow((state) => ({
      getCurrentMessage: state.getCurrentMessage,
      advanceCycle: state.advanceCycle,
      setAmbientPool: state.setAmbientPool,
      enqueue: state.enqueue,
      ambientPool: state.ambientPool,
      currentSequence: state.currentSequence,
      ambientIndex: state.ambientIndex,
    })),
  );

  // Store advanceCycle in ref to avoid stale closure
  const advanceCycleRef = useRef(advanceCycle);
  advanceCycleRef.current = advanceCycle;

  // Initialize store on mount - set ambient pool and queue intro if first visit
  useEffect(() => {
    // Only initialize if ambient pool is empty (first mount)
    if (ambientPool.length === 0) {
      setAmbientPool(AMBIENT_MESSAGES);
      // Queue welcome intro - store handles playOnce logic
      enqueue(WELCOME_INTRO);
    }
  }, [ambientPool.length, setAmbientPool, enqueue]);

  // RAF loop for cycle advancement (no DOM updates needed - Three.js handles rendering)
  useEffect(() => {
    let animationId: number;

    const updateCycle = () => {
      const now = Date.now() / 1000;
      const cycleTime = now % BREATH_TOTAL_CYCLE;
      const { phaseIndex } = calculatePhaseInfo(cycleTime);

      // Track cycle completion and advance queue
      if (phaseIndex === 0 && prevPhaseRef.current === 3) {
        advanceCycleRef.current();
      }
      prevPhaseRef.current = phaseIndex;

      animationId = requestAnimationFrame(updateCycle);
    };

    updateCycle();
    return () => cancelAnimationFrame(animationId);
  }, []); // Empty deps - advanceCycleRef is stable and updated each render

  // Get current message from store
  // Note: Re-renders when currentSequence or ambientIndex changes (subscribed above)
  const quote = getCurrentMessage() ?? { top: '', bottom: '' };

  // Suppress unused variable warnings - these subscriptions trigger re-renders
  void currentSequence;
  void ambientIndex;

  return <ParticleText3D topText={quote.top} bottomText={quote.bottom} />;
}

export const InspirationalParticleText = memo(InspirationalParticleTextComponent);
export default InspirationalParticleText;
