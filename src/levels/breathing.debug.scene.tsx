/**
 * Debug Breathing Scene for Triplex Visual Editor
 *
 * Complete debug control over breathing animation with manual scrubbing,
 * pause/play, time scaling, and visual feedback helpers.
 *
 * Use in Triplex to:
 * 1. Scrub through breathing cycle frame-by-frame (manualPhase 0-1)
 * 2. Pause/play animation (isPaused toggle)
 * 3. Speed up/slow down breathing (timeScale 0.1-5.0)
 * 4. Jump to specific phases instantly (jumpToPhase 0-3)
 * 5. Visualize orbit bounds, phase transitions, and trait values
 * 6. Tweak all visual properties while debugging
 *
 * Note: Debug traits are only active when this scene is loaded.
 * Production app.tsx and breathing.tsx remain unaffected.
 */

import { BreathingLevel } from './breathing';
import { BreathDebugProvider, type BreathDebugConfig } from '../contexts/breathDebug';
import { BreathDebugVisuals } from '../components/BreathDebugVisuals';
import { useMemo } from 'react';

interface BreathingDebugSceneProps {
	// ============================================================
	// BREATHING DEBUG CONTROLS
	// ============================================================

	/**
	 * Enable manual breathing phase control
	 *
	 * When enabled, completely overrides UTC-based synchronization.
	 * Allows scrubbing through the breathing cycle via manualPhase slider.
	 *
	 * @default false
	 */
	enableManualControl?: boolean;

	/**
	 * Manual breath phase (0 = exhaled, 1 = inhaled)
	 *
	 * Only active when enableManualControl is true.
	 * Use this slider to scrub through the entire breathing cycle
	 * frame-by-frame for detailed visual inspection.
	 *
	 * @min 0
	 * @max 1
	 * @step 0.01
	 * @default 0.5
	 */
	manualPhase?: number;

	/**
	 * Pause breathing animation
	 *
	 * Freezes animation at current point. Combined with timeScale
	 * for detailed frame-by-frame analysis. Useful when combined
	 * with manualPhase for stepping through specific moments.
	 *
	 * @default false
	 */
	isPaused?: boolean;

	/**
	 * Time scale multiplier
	 *
	 * Speed up or slow down breathing animation:
	 * - 0.1: 10x slower (1/10 speed)
	 * - 0.5: 2x slower (half speed)
	 * - 1.0: Normal speed (default)
	 * - 2.0: 2x faster (double speed)
	 * - 5.0: 5x faster (for quick testing)
	 *
	 * @min 0.1
	 * @max 5.0
	 * @step 0.1
	 * @default 1.0
	 */
	timeScale?: number;

	/**
	 * Jump to specific breathing phase
	 *
	 * Instantly teleport to phase start:
	 * - 0: Inhale (3s)
	 * - 1: Hold-in (5s)
	 * - 2: Exhale (5s)
	 * - 3: Hold-out (3s)
	 *
	 * Automatically resets after applying. Use with manualPhase
	 * slider for fine-grained control within phases.
	 *
	 * @min 0
	 * @max 3
	 * @step 1
	 * @default 0
	 */
	jumpToPhase?: 0 | 1 | 2 | 3;

	// ============================================================
	// DEBUG VISUALIZATIONS
	// ============================================================

	/**
	 * Show particle orbit bounds
	 *
	 * Renders three wireframe spheres:
	 * - Green: Min orbit (particles on inhale, 1.5 units)
	 * - Red: Max orbit (particles on exhale, 3.5 units)
	 * - Yellow: Current orbit (updates with breathing)
	 *
	 * Helps visualize how much space particles occupy and
	 * ensure breathing animation feels proportional.
	 *
	 * @default false
	 */
	showOrbitBounds?: boolean;

	/**
	 * Show phase transition markers
	 *
	 * Renders colored torus rings at cardinal points.
	 * Active marker lights up as you progress through phases:
	 * - Green: Inhale (top)
	 * - Blue: Hold-in (right)
	 * - Red: Exhale (bottom)
	 * - Yellow: Hold-out (left)
	 *
	 * Useful for learning the cycle or verifying phase timing.
	 *
	 * @default false
	 */
	showPhaseMarkers?: boolean;

	/**
	 * Show real-time trait values overlay
	 *
	 * Displays current numerical values in top-left corner:
	 * - Phase: 0-1 within current phase
	 * - Type: Current phase name (Inhale, Hold-in, etc.)
	 * - Orbit: Current particle orbit radius
	 * - Scale: Current sphere scale multiplier
	 *
	 * Essential for understanding exact animation state
	 * and validating breathing algorithm behavior.
	 *
	 * @default false
	 */
	showTraitValues?: boolean;

	// ============================================================
	// VISUAL PROPERTIES (inherited from BreathingLevel)
	// ============================================================

	/**
	 * Scene background color
	 * @type color
	 * @default #0a1628
	 */
	backgroundColor?: string;

	/**
	 * Sphere color
	 * @type color
	 * @default #4dd9e8
	 */
	sphereColor?: string;

	/**
	 * Sphere material opacity
	 * @min 0
	 * @max 1
	 * @step 0.01
	 * @default 0.15
	 */
	sphereOpacity?: number;

	/**
	 * Sphere geometry segments (detail level)
	 * @min 16
	 * @max 128
	 * @step 16
	 * @default 64
	 */
	sphereSegments?: number;

	/**
	 * Ambient light intensity
	 * @min 0
	 * @max 1
	 * @step 0.05
	 * @default 0.4
	 */
	ambientIntensity?: number;

	/**
	 * Ambient light color
	 * @type color
	 * @default #ffffff
	 */
	ambientColor?: string;

	/**
	 * Key light position (x, y, z)
	 * @type vector3
	 * @default [2, 3, 2]
	 */
	keyPosition?: [number, number, number];

	/**
	 * Key light intensity
	 * @min 0
	 * @max 2
	 * @step 0.1
	 * @default 1.2
	 */
	keyIntensity?: number;

	/**
	 * Key light color
	 * @type color
	 * @default #ffffff
	 */
	keyColor?: string;

	/**
	 * Fill light position (opposite side)
	 * @type vector3
	 * @default [-2, 1, -2]
	 */
	fillPosition?: [number, number, number];

	/**
	 * Fill light intensity (shadow softness)
	 * @min 0
	 * @max 1
	 * @step 0.05
	 * @default 0.3
	 */
	fillIntensity?: number;

	/**
	 * Fill light color
	 * @type color
	 * @default #ffffff
	 */
	fillColor?: string;

	/**
	 * Rim light position (edge definition)
	 * @type vector3
	 * @default [0, 1, -3]
	 */
	rimPosition?: [number, number, number];

	/**
	 * Rim light intensity (edge glow)
	 * @min 0
	 * @max 1
	 * @step 0.05
	 * @default 0.5
	 */
	rimIntensity?: number;

	/**
	 * Rim light color
	 * @type color
	 * @default #ffffff
	 */
	rimColor?: string;

	/**
	 * Number of background stars
	 * @min 1000
	 * @max 10000
	 * @step 500
	 * @default 5000
	 */
	starsCount?: number;

	/**
	 * Floor color
	 * @type color
	 * @default #0d1b2a
	 */
	floorColor?: string;

	/**
	 * Number of particles
	 * @min 50
	 * @max 500
	 * @step 50
	 * @default 300
	 */
	particleCount?: number;
}

/**
 * Debug breathing scene with full manual controls
 *
 * Wraps BreathingLevel with BreathDebugProvider to inject debug configuration
 * into the breath system. Includes visual debug helpers for understanding
 * animation state in real-time.
 */
export function BreathingDebugScene({
	// Debug Controls
	enableManualControl = false,
	manualPhase = 0.5,
	isPaused = false,
	timeScale = 1.0,
	jumpToPhase,

	// Debug Visualizations
	showOrbitBounds = false,
	showPhaseMarkers = false,
	showTraitValues = false,

	// Visual Properties
	backgroundColor,
	sphereColor,
	sphereOpacity,
	sphereSegments,
	ambientIntensity,
	ambientColor,
	keyPosition,
	keyIntensity,
	keyColor,
	fillPosition,
	fillIntensity,
	fillColor,
	rimPosition,
	rimIntensity,
	rimColor,
	starsCount,
	floorColor,
	particleCount,
}: BreathingDebugSceneProps = {}) {
	// Build debug config from props
	const debugConfig = useMemo<BreathDebugConfig | null>(() => {
		// Only create config if we have at least one debug property set
		const hasDebugProps =
			enableManualControl ||
			isPaused ||
			timeScale !== 1.0 ||
			jumpToPhase !== undefined ||
			showOrbitBounds ||
			showPhaseMarkers ||
			showTraitValues;

		if (!hasDebugProps) {
			return null;
		}

		return {
			// Manual Controls
			manualPhaseOverride: enableManualControl ? manualPhase : undefined,
			isPaused,
			timeScale,
			jumpToPhase,

			// Visual Debug
			showOrbitBounds,
			showPhaseMarkers,
			showTraitValues,
		};
	}, [
		enableManualControl,
		manualPhase,
		isPaused,
		timeScale,
		jumpToPhase,
		showOrbitBounds,
		showPhaseMarkers,
		showTraitValues,
	]);

	return (
		<BreathDebugProvider config={debugConfig}>
			<BreathingLevel
				backgroundColor={backgroundColor}
				sphereColor={sphereColor}
				sphereOpacity={sphereOpacity}
				sphereSegments={sphereSegments}
				ambientIntensity={ambientIntensity}
				ambientColor={ambientColor}
				keyPosition={keyPosition}
				keyIntensity={keyIntensity}
				keyColor={keyColor}
				fillPosition={fillPosition}
				fillIntensity={fillIntensity}
				fillColor={fillColor}
				rimPosition={rimPosition}
				rimIntensity={rimIntensity}
				rimColor={rimColor}
				starsCount={starsCount}
				floorColor={floorColor}
				particleCount={particleCount}
			/>

			{/* Debug Visualizations */}
			<BreathDebugVisuals
				showOrbitBounds={showOrbitBounds}
				showPhaseMarkers={showPhaseMarkers}
				showTraitValues={showTraitValues}
			/>

			{/* Debug Control Info Overlay */}
			{(enableManualControl ||
				isPaused ||
				timeScale !== 1.0 ||
				jumpToPhase !== undefined) && (
				<div
					style={{
						position: 'fixed',
						top: 20,
						left: 20,
						background: 'rgba(0, 0, 0, 0.85)',
						border: '1px solid rgba(255, 200, 0, 0.6)',
						borderRadius: 8,
						padding: 16,
						color: '#ffc800',
						fontFamily: 'monospace',
						fontSize: 12,
						zIndex: 1000,
						lineHeight: 1.6,
						maxWidth: 300,
					}}
				>
					<div style={{ fontWeight: 'bold', marginBottom: 8 }}>
						Breath Debug Controls
					</div>
					{enableManualControl && (
						<div>Phase: {manualPhase.toFixed(3)}</div>
					)}
					{isPaused && <div>Status: ⏸ PAUSED</div>}
					{timeScale !== 1.0 && (
						<div>Speed: {timeScale.toFixed(1)}x</div>
					)}
					{jumpToPhase !== undefined && (
						<div>Jump: {['Inhale', 'Hold-in', 'Exhale', 'Hold-out'][jumpToPhase]}</div>
					)}
					<div
						style={{
							fontSize: 10,
							marginTop: 8,
							opacity: 0.7,
							color: '#ffcc99',
						}}
					>
						Debug traits active.
						<br />
						Production app unaffected.
					</div>
				</div>
			)}
		</BreathDebugProvider>
	);
}

export default BreathingDebugScene;
