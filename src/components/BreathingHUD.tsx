/**
 * BreathingHUD - Overlay UI showing breathing phase, timer, and user count
 * Refined with golden ratio typography, color temperature journey, and layered shadows
 * Minimal masterclass design with precision mathematics
 *
 * Performance Optimization (Dec 2024):
 * - Removed useState from RAF loop (was causing 60fps React re-renders)
 * - Now reads breath state directly from Koota world (single source of truth)
 * - Updates DOM directly via useRef (no React reconciliation)
 * - User count still uses usePresence hook (optimized with 5s polling)
 */

import { useWorld } from 'koota/react';
import { useEffect, useRef } from 'react';
import { breathPhase, phaseType } from '../entities/breath/traits';
import { usePresence } from '../hooks/usePresence';
import { BASE_COLORS } from '../lib/colors';

const PHASE_NAMES = ['Inhale', 'Hold', 'Exhale', 'Hold'];
const PHASE_DESCRIPTIONS = ['Breathing In', 'Holding Breath', 'Breathing Out', 'Resting'];

export function BreathingHUD() {
  // Refs for DOM elements (no React state, direct DOM updates)
  const phaseNameRef = useRef<HTMLDivElement>(null);
  const phaseDescRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Track previous phase for transition detection (doesn't trigger re-renders)
  const prevPhaseRef = useRef<number>(-1);
  const mounted = useRef(false);

  // Get Koota world for reading breath state
  const world = useWorld();
  const { count: userCount } = usePresence({ simulated: false, pollInterval: 5000 });

  // RAF loop that updates DOM directly (no React re-renders)
  useEffect(() => {
    mounted.current = true;

    // Helper: Update phase name and description on transition
    const updatePhaseText = (phaseTypeValue: number) => {
      if (phaseNameRef.current) {
        phaseNameRef.current.innerText = PHASE_NAMES[phaseTypeValue];
        phaseNameRef.current.style.animation = 'none';
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        phaseNameRef.current.offsetHeight; // Force reflow
        phaseNameRef.current.style.animation = 'phaseNameEnter 300ms 100ms ease-out forwards';
      }

      if (phaseDescRef.current) {
        phaseDescRef.current.innerText = PHASE_DESCRIPTIONS[phaseTypeValue];
        phaseDescRef.current.style.animation = 'none';
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        phaseDescRef.current.offsetHeight; // Force reflow
        phaseDescRef.current.style.animation = 'phaseNameEnter 300ms 100ms ease-out forwards';
      }
    };

    // Helper: Update timer display based on progress
    const updateTimer = (rawProgress: number) => {
      if (timerRef.current) {
        const phaseTimer = Math.ceil((1 - rawProgress) * 4);
        timerRef.current.innerText = `${phaseTimer}s`;
      }
    };

    // Helper: Update progress bar based on cycle position
    const updateProgressBar = (currentPhaseType: number, rawProgress: number) => {
      if (progressBarRef.current) {
        const cycleProgress = (currentPhaseType * 4 + rawProgress * 4) / 16;
        progressBarRef.current.style.width = `${cycleProgress * 100}%`;
      }
    };

    const updateLoop = () => {
      // Query breath entity from Koota world
      const breathEntity = world.queryFirst(breathPhase, phaseType);
      if (!breathEntity) {
        requestAnimationFrame(updateLoop);
        return;
      }

      // Get current breath state from ECS (single source of truth)
      const currentPhaseType = breathEntity.get(phaseType)?.value ?? 0;

      // Calculate rawProgress (0-1 within current phase)
      const elapsed = Date.now() / 1000;
      const cycleTime = elapsed % 16; // 16-second breathing cycle
      const phaseStartTime = currentPhaseType * 4;
      const rawProgress = ((cycleTime - phaseStartTime + 16) % 4) / 4;

      // Update phase text only on transition
      if (currentPhaseType !== prevPhaseRef.current) {
        prevPhaseRef.current = currentPhaseType;
        updatePhaseText(currentPhaseType);
      }

      // Update timer and progress bar every frame
      updateTimer(rawProgress);
      updateProgressBar(currentPhaseType, rawProgress);

      // Schedule next frame
      requestAnimationFrame(updateLoop);
    };

    // Start the loop
    requestAnimationFrame(updateLoop);

    return () => {
      mounted.current = false;
    };
  }, [world]);

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
          <div className="marker" style={{ left: '0%' }} title="Inhale" aria-label="Inhale phase">
            I
          </div>
          <div className="marker" style={{ left: '25%' }} title="Hold" aria-label="Hold phase">
            H
          </div>
          <div className="marker" style={{ left: '50%' }} title="Exhale" aria-label="Exhale phase">
            E
          </div>
          <div className="marker" style={{ left: '75%' }} title="Hold" aria-label="Hold phase">
            H
          </div>
        </div>
      </div>

      <style>{`
				/**
				 * Minimal Masterclass Design Refinement
				 * Golden Ratio: 8, 13, 21, 34, 55, 89 (fibonacci)
				 * Typography: 10px → 13px → 21px → 34px → 55px (golden ratio 1.618)
				 * Colors: Warmer backgrounds, temperature-aware palette
				 * Shadows: Layered, colored for depth
				 * Motion: Entrance animations + phase transitions with choreography
				 */

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

				.breathing-hud {
					position: fixed;
					top: 0;
					left: 0;
					right: 0;
					bottom: 0;
					pointer-events: none;
					font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;
					z-index: 100;
				}

				.hud-panel {
					position: absolute;
					background: ${BASE_COLORS.panelBg};
					backdrop-filter: blur(20px);
					border: 1px solid ${BASE_COLORS.panelBorder};
					border-radius: 13px;
					padding: 21px 34px;
					color: ${BASE_COLORS.textAccent};
					font-size: 13px;
					line-height: 1.6;
					min-width: 140px;
					box-shadow:
						0 2px 8px rgba(10, 8, 22, 0.4),
						0 8px 24px rgba(74, 144, 226, 0.08),
						0 16px 48px rgba(10, 8, 22, 0.6);
				}

				.phase-panel {
					top: 34px;
					left: 34px;
					animation: hudEnterTop 600ms 600ms ease-out forwards;
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
					font-weight: 450;
					margin-bottom: 13px;
					color: ${BASE_COLORS.textPrimary};
					letter-spacing: -0.01em;
					animation: phaseNameEnter 300ms 100ms ease-out forwards;
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
					animation: hudEnterTop 600ms 700ms ease-out forwards;
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
					border-radius: 4px;
					overflow: hidden;
					border: 1px solid rgba(126, 200, 212, 0.15);
					animation: hudEnterBottom 600ms 800ms ease-out forwards;
				}

				.progress-fill {
					height: 100%;
					background: linear-gradient(90deg, #4a90e2 0%, #7ec8d4 50%, #9fd9e8 100%);
					transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
					border-radius: 4px;
					position: relative;
				}

				.progress-fill::after {
					content: '';
					position: absolute;
					right: 0;
					top: 0;
					width: 20px;
					height: 100%;
					background: linear-gradient(90deg, transparent, rgba(159, 217, 232, 0.6));
					filter: blur(8px);
					animation: progressPulse 1.5s ease-in-out infinite;
				}

				@keyframes progressPulse {
					0%, 100% { opacity: 0.4; }
					50% { opacity: 1; }
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
