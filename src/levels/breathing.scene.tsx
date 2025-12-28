/**
 * Experimental Breathing Scene for Triplex Visual Editor
 *
 * Dedicated scene file for exploring different breathing algorithms and visual tuning.
 * Allows A/B testing of curve types (phase-based vs rounded-wave) with live graph.
 *
 * Use in Triplex to:
 * 1. Toggle between "phase-based" and "rounded-wave" breathing curves
 * 2. Adjust "waveDelta" to control pause sharpness on rounded-wave
 * 3. See real-time visual effect on sphere and particles
 * 4. Compare breathing rhythm and crystallization patterns
 * 5. Test all BreathingLevel visual props (colors, lighting, particles)
 *
 * Note: This scene runs independently from production app.tsx.
 * Changes here don't affect the main app. Use when satisfied to update breathing.tsx.
 */

import { BreathingLevel } from './breathing';
import { BreathCurveProvider } from '../contexts/BreathCurveContext';

interface BreathingSceneProps {
	/**
	 * Breathing curve algorithm to use
	 *
	 * - **phase-based**: Current production algorithm
	 *   Discrete phases with custom easing per segment
	 *   Predictable, well-tuned, production-ready
	 *
	 * - **rounded-wave**: Experimental algorithm
	 *   Continuous arctangent-smoothed wave
	 *   Natural pause points, smoother transitions
	 *   Subjectively feels more natural for some users
	 *
	 * @default "phase-based"
	 */
	curveType?: 'phase-based' | 'rounded-wave';

	/**
	 * Rounded wave pause sharpness (rounded-wave only)
	 *
	 * Controls how pronounced the pauses are at breathing peaks.
	 * Only affects "rounded-wave" curve type.
	 *
	 * - 0.01: Extremely sharp pauses (very square-like)
	 * - 0.05: Balanced (recommended, default)
	 * - 0.1: Softer pauses (more flowing)
	 * - 0.2: Minimal pauses (nearly sinusoidal)
	 *
	 * @min 0.01
	 * @max 0.2
	 * @step 0.01
	 * @default 0.05
	 */
	waveDelta?: number;

	/**
	 * Show live curve comparison graph overlay
	 *
	 * Displays current breathing phase and curve type in corner.
	 * Helps visualize the difference between algorithms.
	 *
	 * @default false
	 */
	showCurveInfo?: boolean;

	// All BreathingLevel props are also exposed for visual tuning

	/**
	 * Scene background color
	 * @type color
	 */
	backgroundColor?: string;

	/**
	 * Sphere color
	 * @type color
	 */
	sphereColor?: string;

	/**
	 * Sphere material opacity
	 * @min 0
	 * @max 1
	 * @step 0.01
	 */
	sphereOpacity?: number;

	/**
	 * Sphere geometry segments (detail level)
	 * @min 16
	 * @max 128
	 * @step 16
	 */
	sphereSegments?: number;

	/**
	 * Ambient light intensity
	 * @min 0
	 * @max 1
	 * @step 0.05
	 */
	ambientIntensity?: number;

	/**
	 * Ambient light color
	 * @type color
	 */
	ambientColor?: string;

	/**
	 * Key light position (x, y, z)
	 * @type vector3
	 */
	keyPosition?: [number, number, number];

	/**
	 * Key light intensity
	 * @min 0
	 * @max 2
	 * @step 0.1
	 */
	keyIntensity?: number;

	/**
	 * Key light color
	 * @type color
	 */
	keyColor?: string;

	/**
	 * Fill light position (opposite side)
	 * @type vector3
	 */
	fillPosition?: [number, number, number];

	/**
	 * Fill light intensity (shadow softness)
	 * @min 0
	 * @max 1
	 * @step 0.05
	 */
	fillIntensity?: number;

	/**
	 * Fill light color
	 * @type color
	 */
	fillColor?: string;

	/**
	 * Rim light position (edge definition)
	 * @type vector3
	 */
	rimPosition?: [number, number, number];

	/**
	 * Rim light intensity (edge glow)
	 * @min 0
	 * @max 1
	 * @step 0.05
	 */
	rimIntensity?: number;

	/**
	 * Rim light color
	 * @type color
	 */
	rimColor?: string;

	/**
	 * Number of background stars
	 * @min 1000
	 * @max 10000
	 * @step 500
	 */
	starsCount?: number;

	/**
	 * Floor color
	 * @type color
	 */
	floorColor?: string;

	/**
	 * Number of particles
	 * @min 50
	 * @max 500
	 * @step 50
	 */
	particleCount?: number;
}

/**
 * Experimental breathing scene combining curve selection with BreathingLevel
 *
 * Wraps BreathingLevel with BreathCurveProvider to inject curve type selection
 * into the breath system. Allows visual experimentation and comparison.
 */
export function BreathingScene({
	curveType = 'phase-based',
	waveDelta = 0.05,
	showCurveInfo = false,
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
}: BreathingSceneProps = {}) {
	return (
		<BreathCurveProvider config={{ curveType, waveDelta }}>
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

			{/* Optional: Debug overlay showing current curve type and configuration */}
			{showCurveInfo && (
				<div
					style={{
						position: 'fixed',
						top: 20,
						right: 20,
						background: 'rgba(0, 0, 0, 0.8)',
						border: '1px solid rgba(100, 200, 255, 0.5)',
						borderRadius: 8,
						padding: 16,
						color: '#64c8ff',
						fontFamily: 'monospace',
						fontSize: 12,
						zIndex: 1000,
						lineHeight: 1.6,
					}}
				>
					<div style={{ fontWeight: 'bold', marginBottom: 8 }}>
						Breathing Curve Config
					</div>
					<div>Type: {curveType}</div>
					<div>Wave Delta: {waveDelta.toFixed(3)}</div>
					<div style={{ fontSize: 10, marginTop: 8, opacity: 0.6 }}>
						{curveType === 'phase-based' && (
							<>
								Phase-based: Production curve
								<br />
								Discrete phases, custom easing
							</>
						)}
						{curveType === 'rounded-wave' && (
							<>
								Rounded-wave: Experimental curve
								<br />
								Continuous arctangent smoothing
								<br />
								{waveDelta < 0.03 && 'Sharp pauses (δ < 0.03)'}
								{waveDelta >= 0.03 && waveDelta < 0.08 && 'Balanced pauses (δ ~ 0.05)'}
								{waveDelta >= 0.08 && 'Smooth transitions (δ > 0.08)'}
							</>
						)}
					</div>
				</div>
			)}
		</BreathCurveProvider>
	);
}
