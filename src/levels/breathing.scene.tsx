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
 *
 * Uses shared types from src/types/sceneProps.ts for DRY consistency.
 */

import { BreathingLevel } from './breathing';
import { BreathCurveProvider } from '../contexts/BreathCurveContext';
import type { BreathingSceneProps } from '../types/sceneProps';
import { getDefaultValues, VISUAL_DEFAULTS, LIGHTING_DEFAULTS, EXPERIMENTAL_DEFAULTS } from '../config/sceneDefaults';

// Merge all defaults for convenient spreading
const DEFAULT_PROPS = {
	...getDefaultValues(VISUAL_DEFAULTS),
	...getDefaultValues(LIGHTING_DEFAULTS),
	...getDefaultValues(EXPERIMENTAL_DEFAULTS),
} as const;

/**
 * Experimental breathing scene combining curve selection with BreathingLevel
 *
 * Wraps BreathingLevel with BreathCurveProvider to inject curve type selection
 * into the breath system. Allows visual experimentation and comparison.
 */
export function BreathingScene({
	// Experimental curve props
	curveType = DEFAULT_PROPS.curveType,
	waveDelta = DEFAULT_PROPS.waveDelta,
	showCurveInfo = DEFAULT_PROPS.showCurveInfo,

	// Visual defaults
	backgroundColor = DEFAULT_PROPS.backgroundColor,
	sphereColor = DEFAULT_PROPS.sphereColor,
	sphereOpacity = DEFAULT_PROPS.sphereOpacity,
	sphereSegments = DEFAULT_PROPS.sphereSegments,

	// Lighting - Ambient defaults
	ambientIntensity = DEFAULT_PROPS.ambientIntensity,
	ambientColor = DEFAULT_PROPS.ambientColor,

	// Lighting - Key defaults
	keyPosition = DEFAULT_PROPS.keyPosition,
	keyIntensity = DEFAULT_PROPS.keyIntensity,
	keyColor = DEFAULT_PROPS.keyColor,

	// Lighting - Fill defaults
	fillPosition = DEFAULT_PROPS.fillPosition,
	fillIntensity = DEFAULT_PROPS.fillIntensity,
	fillColor = DEFAULT_PROPS.fillColor,

	// Lighting - Rim defaults
	rimPosition = DEFAULT_PROPS.rimPosition,
	rimIntensity = DEFAULT_PROPS.rimIntensity,
	rimColor = DEFAULT_PROPS.rimColor,

	// Environment defaults
	starsCount = DEFAULT_PROPS.starsCount,
	floorColor = DEFAULT_PROPS.floorColor,

	// Particle defaults
	particleCount = DEFAULT_PROPS.particleCount,
}: Partial<BreathingSceneProps> = {}) {
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
