/**
 * BreathingHUD - Overlay UI showing breathing phase, timer, and user count
 * Displays current breathing state and presence information
 */
import { useEffect, useState } from 'react';
import { calculateBreathState, type BreathState } from '../lib/breathCalc';
import { usePresence } from '../hooks/usePresence';

const PHASE_NAMES = ['Inhale', 'Hold', 'Exhale', 'Hold'];
const PHASE_DESCRIPTIONS = [
	'Breathing In',
	'Holding Breath',
	'Breathing Out',
	'Resting',
];

export function BreathingHUD() {
	const [breathState, setBreathState] = useState<BreathState | null>(null);
	const { count: userCount } = usePresence({ simulated: false, pollInterval: 5000 });

	// Update breathing state every frame
	useEffect(() => {
		const updateBreath = () => {
			const elapsed = Date.now() / 1000;
			const state = calculateBreathState(elapsed);
			setBreathState(state);
		};

		// Initial update
		updateBreath();

		// Update on animation frame for smooth timer
		const animationId = requestAnimationFrame(function update() {
			updateBreath();
			requestAnimationFrame(update);
		});

		return () => cancelAnimationFrame(animationId);
	}, []);

	if (!breathState) return null;

	const phaseName = PHASE_NAMES[breathState.phaseType];
	const phaseDesc = PHASE_DESCRIPTIONS[breathState.phaseType];
	const phaseTimer = Math.ceil((1 - breathState.rawProgress) * 4);
	const cycleProgress = (breathState.phaseType * 4 + breathState.rawProgress) / 16;

	return (
		<div className="breathing-hud">
			{/* Top left - Breathing Phase */}
			<div className="hud-panel phase-panel">
				<div className="phase-name">{phaseName}</div>
				<div className="phase-desc">{phaseDesc}</div>
				<div className="phase-timer">{phaseTimer}s</div>
			</div>

			{/* Top right - User Count */}
			<div className="hud-panel users-panel">
				<div className="users-label">Users Breathing</div>
				<div className="users-count">{userCount}</div>
			</div>

			{/* Bottom - Cycle Progress Bar */}
			<div className="cycle-progress-bar">
				<div
					className="progress-fill"
					style={{ width: `${cycleProgress * 100}%` }}
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
				.breathing-hud {
					position: fixed;
					top: 0;
					left: 0;
					right: 0;
					bottom: 0;
					pointer-events: none;
					font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
					z-index: 100;
				}

				.hud-panel {
					position: absolute;
					background: rgba(5, 5, 20, 0.75);
					backdrop-filter: blur(10px);
					border: 1px solid rgba(126, 200, 212, 0.3);
					border-radius: 12px;
					padding: 20px;
					color: #7ec8d4;
					font-size: 14px;
					line-height: 1.5;
					min-width: 140px;
					box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
				}

				.phase-panel {
					top: 30px;
					left: 30px;
				}

				.phase-name {
					font-size: 24px;
					font-weight: bold;
					margin-bottom: 8px;
					color: #fff;
					letter-spacing: 0.5px;
				}

				.phase-desc {
					font-size: 11px;
					color: #7ec8d4;
					opacity: 0.8;
					text-transform: uppercase;
					letter-spacing: 1px;
					margin-bottom: 12px;
				}

				.phase-timer {
					font-size: 32px;
					font-weight: bold;
					font-variant-numeric: tabular-nums;
					color: #7ec8d4;
				}

				.users-panel {
					top: 30px;
					right: 30px;
					text-align: right;
				}

				.users-label {
					font-size: 11px;
					color: #7ec8d4;
					opacity: 0.8;
					text-transform: uppercase;
					letter-spacing: 1px;
					margin-bottom: 8px;
				}

				.users-count {
					font-size: 40px;
					font-weight: bold;
					color: #fff;
					font-variant-numeric: tabular-nums;
				}

				.cycle-progress-bar {
					position: absolute;
					bottom: 30px;
					left: 30px;
					right: 30px;
					height: 6px;
					background: rgba(126, 200, 212, 0.1);
					border-radius: 3px;
					overflow: hidden;
					border: 1px solid rgba(126, 200, 212, 0.2);
				}

				.progress-fill {
					height: 100%;
					background: linear-gradient(90deg, #7ec8d4, #4a90e2);
					transition: width 0.05s linear;
					border-radius: 3px;
				}

				.progress-markers {
					position: relative;
					height: 100%;
				}

				.marker {
					position: absolute;
					top: -8px;
					width: 1px;
					height: 22px;
					background: rgba(126, 200, 212, 0.4);
					font-size: 8px;
					color: rgba(126, 200, 212, 0.6);
					text-align: center;
					transform: translateX(-50%);
					line-height: 10px;
					letter-spacing: 0.5px;
					font-weight: bold;
				}

				/* Dark mode adjustments */
				@media (prefers-color-scheme: dark) {
					.hud-panel {
						background: rgba(5, 5, 20, 0.8);
						border-color: rgba(126, 200, 212, 0.4);
					}
				}

				/* Mobile responsiveness */
				@media (max-width: 768px) {
					.hud-panel {
						padding: 16px;
						font-size: 12px;
						min-width: 120px;
					}

					.phase-panel {
						top: 20px;
						left: 20px;
					}

					.users-panel {
						top: 20px;
						right: 20px;
					}

					.phase-name {
						font-size: 20px;
					}

					.phase-timer {
						font-size: 28px;
					}

					.users-count {
						font-size: 32px;
					}

					.cycle-progress-bar {
						bottom: 20px;
						left: 20px;
						right: 20px;
					}

					.marker {
						font-size: 7px;
						top: -6px;
						height: 18px;
						line-height: 9px;
					}
				}
			`}</style>
		</div>
	);
}
