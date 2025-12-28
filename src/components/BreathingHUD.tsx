/**
 * BreathingHUD - Overlay UI showing breathing phase, timer, and user count
 * Refined with golden ratio typography, color temperature journey, and layered shadows
 * Minimal masterclass design with precision mathematics
 *
 * Performance Optimization (Dec 2024):
 * - Removed useState from RAF loop (was causing 60fps React re-renders)
 * - Now reads breath state directly from Koota world (single source of truth)
 * - Updates DOM directly via useRef (no React reconciliation)
 * - User count uses simulated presence data for MVP
 */

import { useRef } from 'react';
import { useBreathPhaseDisplay } from '../hooks/useBreathPhaseDisplay';
import { usePresence } from '../hooks/usePresence';
import { BASE_COLORS } from '../lib/colors';

export function BreathingHUD() {
  // Refs for DOM elements (no React state, direct DOM updates)
  const phaseNameRef = useRef<HTMLDivElement>(null);
  const phaseDescRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Manage breath phase display updates via RAF loop
  useBreathPhaseDisplay({
    phaseNameRef,
    phaseDescRef,
    timerRef,
    progressBarRef,
  });

  // Get user count from presence (optimized with 5s polling)
  const { count: userCount } = usePresence();

  return (
    <div className="breathing-hud">
      {/* Top left - Breathing Phase */}
      <div className="hud-panel phase-panel">
        <div className="phase-label">Breathing Phase</div>
        <div ref={phaseNameRef} className="phase-name">
          Inhale
        </div>
        <div ref={phaseDescRef} className="phase-desc">
          Breathing In
        </div>
        <div ref={timerRef} className="phase-timer">
          4s
        </div>
      </div>

      {/* Top right - User Count */}
      <div className="hud-panel users-panel">
        <div className="users-label">Users Breathing</div>
        <div className="users-count">{userCount}</div>
      </div>

      {/* Bottom - Cycle Progress Bar */}
      <div className="cycle-progress-bar">
        <div
          ref={progressBarRef}
          className="progress-fill"
          role="progressbar"
          aria-valuenow={0}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Breathing cycle progress"
        />
        <div className="progress-markers">
          <div className="marker" style={{ left: '0%' }} title="Inhale">
            I
          </div>
          <div className="marker" style={{ left: '25%' }} title="Hold">
            H
          </div>
          <div className="marker" style={{ left: '50%' }} title="Exhale">
            E
          </div>
          <div className="marker" style={{ left: '75%' }} title="Hold">
            H
          </div>
        </div>
      </div>

      <style>{`
				/**
				 * Organic & Natural Design Refinement
				 * Golden Ratio: 8, 13, 21, 34, 55, 89 (fibonacci)
				 * Typography: Crimson Pro (serif) + DM Sans (sans)
				 * Colors: Warm-cool balance with earthy accents
				 * Shadows: Organic layered depth with color
				 * Motion: Breathing synchronized animations
				 */

				@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@300;400;500&family=DM+Sans:wght@400;500&display=swap');

				@keyframes hudEnterTop {
					from {
						opacity: 0;
						transform: translateY(-20px);
					}
					to {
						opacity: 1;
						transform: translateY(0);
					}
				}

				@keyframes hudEnterBottom {
					from {
						opacity: 0;
						transform: translateY(20px);
					}
					to {
						opacity: 1;
						transform: translateY(0);
					}
				}

				@keyframes phaseNameExit {
					from {
						opacity: 1;
						transform: translateY(0);
					}
					to {
						opacity: 0;
						transform: translateY(-5px);
					}
				}

				@keyframes phaseNameEnter {
					from {
						opacity: 0;
						transform: translateY(5px);
					}
					to {
						opacity: 1;
						transform: translateY(0);
					}
				}

				@keyframes panelBreathPulseWarm {
					0%, 100% {
						background: rgba(18, 16, 22, 0.45);
						box-shadow:
							inset 0 1px 0 rgba(255, 254, 247, 0.04),
							0 4px 12px rgba(212, 165, 116, 0.08),
							0 8px 32px rgba(10, 8, 22, 0.5),
							0 20px 60px rgba(10, 8, 22, 0.7);
					}
					50% {
						background: rgba(24, 20, 18, 0.52);
						box-shadow:
							inset 0 1px 0 rgba(255, 254, 247, 0.05),
							0 4px 12px rgba(212, 165, 116, 0.12),
							0 8px 32px rgba(10, 8, 22, 0.5),
							0 20px 60px rgba(10, 8, 22, 0.7),
							0 0 48px rgba(212, 165, 116, 0.10);
					}
				}

				@keyframes panelBreathPulseCool {
					0%, 100% {
						background: rgba(18, 16, 22, 0.45);
						box-shadow:
							inset 0 1px 0 rgba(255, 254, 247, 0.04),
							0 4px 12px rgba(126, 200, 212, 0.08),
							0 8px 32px rgba(10, 8, 22, 0.5),
							0 20px 60px rgba(10, 8, 22, 0.7);
					}
					50% {
						background: rgba(16, 18, 22, 0.52);
						box-shadow:
							inset 0 1px 0 rgba(255, 254, 247, 0.05),
							0 4px 12px rgba(126, 200, 212, 0.12),
							0 8px 32px rgba(10, 8, 22, 0.5),
							0 20px 60px rgba(10, 8, 22, 0.7),
							0 0 48px rgba(126, 200, 212, 0.10);
					}
				}

				.breathing-hud {
					position: fixed;
					top: 0;
					left: 0;
					right: 0;
					bottom: 0;
					pointer-events: none;
					font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;
					z-index: 100;
				}

				.hud-panel {
					position: absolute;
					background: ${BASE_COLORS.panelBg};
					backdrop-filter: blur(40px);
					border: 1px solid ${BASE_COLORS.panelBorder};
					border-radius: 16px;
					padding: 21px 34px;
					color: ${BASE_COLORS.textAccent};
					font-size: 13px;
					line-height: 1.6;
					min-width: 140px;
					box-shadow:
						inset 0 1px 0 rgba(255, 254, 247, 0.04),
						0 4px 12px rgba(126, 200, 212, 0.08),
						0 8px 32px rgba(10, 8, 22, 0.5),
						0 20px 60px rgba(10, 8, 22, 0.7);
				}

				.phase-panel {
					top: 34px;
					left: 34px;
					animation: hudEnterTop 600ms 600ms ease-out forwards;
					border-color: ${BASE_COLORS.panelBorderWarm};
					animation: hudEnterTop 600ms 600ms ease-out forwards, panelBreathPulseWarm 16s ease-in-out infinite;
				}

				.phase-label {
					font-size: 10px;
					color: ${BASE_COLORS.textSecondary};
					opacity: 0.75;
					text-transform: uppercase;
					letter-spacing: 0.08em;
					margin-bottom: 8px;
					font-weight: 500;
				}

				.phase-name {
					font-size: 21px;
					font-weight: 500;
					margin-bottom: 13px;
					color: ${BASE_COLORS.textPrimary};
					letter-spacing: 0.02em;
					font-family: 'Crimson Pro', Georgia, serif;
					animation: phaseNameEnter 300ms 100ms ease-out forwards;
					text-shadow: 0 0 20px rgba(126, 200, 212, 0.2);
				}

				.phase-desc {
					font-size: 10px;
					color: ${BASE_COLORS.textSecondary};
					opacity: 0.75;
					text-transform: uppercase;
					letter-spacing: 0.08em;
					margin-bottom: 13px;
					font-weight: 500;
					animation: phaseNameEnter 300ms 100ms ease-out forwards;
				}

				.phase-timer {
					font-size: 34px;
					font-weight: 400;
					font-variant-numeric: tabular-nums;
					color: ${BASE_COLORS.textAccent};
					letter-spacing: -0.03em;
					transform: translateY(-0.05em);
				}

				.users-panel {
					top: 34px;
					right: 34px;
					text-align: right;
					animation: hudEnterTop 600ms 700ms ease-out forwards, panelBreathPulseCool 16s ease-in-out infinite;
				}

				.users-label {
					font-size: 10px;
					color: ${BASE_COLORS.textSecondary};
					opacity: 0.75;
					text-transform: uppercase;
					letter-spacing: 0.08em;
					margin-bottom: 13px;
					font-weight: 500;
				}

				.users-count {
					font-size: 55px;
					font-weight: 300;
					color: ${BASE_COLORS.textPrimary};
					font-variant-numeric: tabular-nums;
					letter-spacing: -0.04em;
					transform: translateY(-0.08em);
				}

				.cycle-progress-bar {
					position: absolute;
					bottom: 34px;
					left: 34px;
					right: 34px;
					height: 8px;
					background: rgba(126, 200, 212, 0.1);
					border-radius: 6px;
					overflow: hidden;
					border: 1px solid rgba(126, 200, 212, 0.12);
					animation: hudEnterBottom 600ms 800ms ease-out forwards;
				}

				.progress-fill {
					height: 100%;
					background: linear-gradient(90deg, #6ba8a8 0%, #4dd9e8 50%, #d4a574 100%);
					transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
					border-radius: 4px;
					position: relative;
				}

				.progress-fill::after {
					content: '';
					position: absolute;
					right: 0;
					top: -2px;
					width: 30px;
					height: calc(100% + 4px);
					background: linear-gradient(90deg, transparent, rgba(212, 165, 116, 0.5));
					filter: blur(12px);
					animation: breathPulse 4s ease-in-out infinite;
				}

				@keyframes breathPulse {
					0%, 100% { opacity: 0.4; }
					25% { opacity: 0.6; }
					50% { opacity: 1; }
					75% { opacity: 0.6; }
				}

				.progress-markers {
					position: absolute;
					top: 0;
					left: 0;
					right: 0;
					height: 100%;
					pointer-events: none;
				}

				.marker {
					position: absolute;
					top: -10px;
					width: 1px;
					height: 28px;
					background: rgba(126, 200, 212, 0.3);
					font-size: 9px;
					color: rgba(126, 200, 212, 0.5);
					text-align: center;
					transform: translateX(-50%);
					line-height: 14px;
					letter-spacing: 0.5px;
					font-weight: 500;
				}

				@media (prefers-reduced-motion: reduce) {
					.progress-fill,
					.progress-fill::after {
						transition: none;
						animation: none;
					}
				}

				@media (max-width: 768px) {
					.hud-panel {
						padding: 13px 21px;
						font-size: 12px;
						min-width: 120px;
					}

					.phase-panel {
						top: 21px;
						left: 21px;
					}

					.users-panel {
						top: 21px;
						right: 21px;
					}

					.phase-name {
						font-size: 18px;
						margin-bottom: 8px;
					}

					.phase-timer {
						font-size: 28px;
					}

					.users-count {
						font-size: 44px;
					}

					.cycle-progress-bar {
						bottom: 21px;
						left: 21px;
						right: 21px;
						height: 6px;
					}

					.marker {
						font-size: 8px;
						top: -8px;
						height: 24px;
						line-height: 12px;
					}
				}
			`}</style>
    </div>
  );
}
