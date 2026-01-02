/**
 * Cinematic Intro Module
 *
 * A cinematic landing experience with letterbox, title reveal, and CTA.
 */

export {
  CinematicProvider,
  useCinematicState,
  useCinematicStateRequired,
} from './CinematicContext';
export { CinematicFog } from './CinematicFog';
export { CinematicIntro } from './CinematicIntro';
export { Letterbox } from './Letterbox';
export { TitleReveal } from './TitleReveal';
export type { CinematicConfig, IntroPhase } from './types';
export { PHASE_SEQUENCE, PHASE_TIMING } from './types';
export { useCinematicPhase } from './useCinematicPhase';
export { useCinematicTimeline } from './useCinematicTimeline';
