/**
 * useInspirationInit - Initializes the inspirational text system
 *
 * Sets up the ambient message pool and queues the welcome intro
 * sequence for first-time visitors.
 *
 * Should be called once at app startup (typically in a provider or root component).
 */

import { useEffect } from 'react';
import { AMBIENT_MESSAGES, WELCOME_INTRO } from '../config/inspirationalSequences';
import { useInspirationalTextStore } from '../stores/inspirationalTextStore';

/**
 * Initialize the inspirational text system
 *
 * @example
 * ```tsx
 * function App() {
 *   useInspirationInit();
 *   return <BreathingLevel />;
 * }
 * ```
 */
export function useInspirationInit(): void {
  const setAmbientPool = useInspirationalTextStore((state) => state.setAmbientPool);
  const enqueue = useInspirationalTextStore((state) => state.enqueue);
  const hasPlayedIntro = useInspirationalTextStore((state) => state.hasPlayedIntro);

  useEffect(() => {
    // Set up the ambient message pool (always available)
    setAmbientPool(AMBIENT_MESSAGES);

    // Queue welcome intro for first-time visitors
    if (!hasPlayedIntro) {
      enqueue(WELCOME_INTRO);
    }
  }, [setAmbientPool, enqueue, hasPlayedIntro]);
}

export default useInspirationInit;
