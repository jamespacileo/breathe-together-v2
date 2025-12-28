/**
 * Centralized Scene Defaults & Metadata
 *
 * Single source of truth for all default values and configuration metadata.
 * Eliminates duplication and enables future tooling (e.g., auto-generating JSDoc).
 *
 * Organized by prop category:
 * - Visual properties (colors, opacity, geometry)
 * - Lighting properties (ambient, key, fill, rim)
 * - Breathing debug properties (manual control, visualization)
 * - Particle debug properties (geometry, scale, pulse)
 * - Quality presets (low/medium/high)
 */

import type { ParticleVisualConfig } from '../entities/particle/config';

/**
 * Property metadata structure.
 *
 * Provides contextual information about when and why to adjust a prop.
 */
export interface PropMetadata {
	/** Contextual guidance: when should this prop be adjusted? */
	whenToAdjust: string;
	/** Visual landmarks showing typical ranges with labels */
	typicalRange: string;
	/** Related props that this interacts with */
	interactsWith?: string[];
	/** Performance implications if relevant */
	performanceNote?: string;
}

// ============================================================================
// VISUAL DEFAULTS
// ============================================================================

export const VISUAL_DEFAULTS = {
	backgroundColor: {
		value: '#0a0a0a' as const,
		meta: {
			whenToAdjust:
				'Create focal point contrast, align with brand colors, establish mood (dark for calm, light for energetic)',
			typicalRange:
				'Very dark (#000000, depth) → Dark (#0a0a0a, default) → Medium (#404040, neutral) → Light (#808080, bright)',
			interactsWith: ['ambientIntensity', 'sphereColor'],
		} as PropMetadata,
	},
	sphereColor: {
		value: '#4080ff' as const,
		meta: {
			whenToAdjust:
				'Create visual focal point, align with brand palette, establish atmosphere',
			typicalRange:
				'Muted (#4080ff, calm) → Standard (#4dd9e8, balanced) → Vibrant (#60a5fa, energetic) → Glowing (#7dd3fc, intense)',
			interactsWith: ['backgroundColor', 'fresnelPower'],
		} as PropMetadata,
	},
	sphereOpacity: {
		value: 0.15 as const,
		meta: {
			whenToAdjust:
				'Lower (0.05-0.2) for subtle ethereal feel, higher (0.5-1.0) for solid presence',
			typicalRange:
				'Invisible (0.0) → Very transparent (0.1) → Balanced (0.5) → Fully opaque (1.0)',
			interactsWith: ['backgroundColor', 'particleColor'],
			performanceNote:
				'Transparency requires blending pass; no significant impact',
		} as PropMetadata,
	},
	sphereSegments: {
		value: 64 as const,
		meta: {
			whenToAdjust:
				'Lower (16-32) on mobile for performance, higher (64+) for premium visual quality',
			typicalRange:
				'Low detail (16, angular) → Medium (32, balanced) → High (64, smooth) → Ultra (128, very smooth)',
			performanceNote:
				'Significant GPU impact; each +16 segments ~1-2% more draw call time',
		} as PropMetadata,
	},
	starsCount: {
		value: 5000 as const,
		meta: {
			whenToAdjust:
				'1000-3000 for sparse (fast), 5000 for standard, 8000+ for dense (slower)',
			typicalRange:
				'Sparse (1000, individual stars) → Standard (5000, balanced) → Dense (10000, full field)',
			performanceNote:
				'Linear impact on initialization; no runtime cost after creation',
		} as PropMetadata,
	},
	floorColor: {
		value: '#0a0a1a' as const,
		meta: {
			whenToAdjust:
				'Darker (#0a0a1a) for focus on sphere, lighter (#1a3a5a) for more ground presence',
			typicalRange:
				'Very dark (#000000, recedes) → Dark (#0a0a1a, standard) → Medium (#1a3a5a, visible)',
			interactsWith: ['backgroundColor'],
		} as PropMetadata,
	},
	particleCount: {
		value: 300 as const,
		meta: {
			whenToAdjust:
				'50-150 for sparse (fast), 300 for standard (production), 500+ for dense visualization',
			typicalRange:
				'Minimal (50, individual particles) → Standard (300, production) → Dense (500, showcase)',
			performanceNote:
				'O(n) rendering via InstancedMesh; 300 = negligible, 500 = ~1-2% GPU cost',
		} as PropMetadata,
	},
} as const;

// ============================================================================
// LIGHTING DEFAULTS
// ============================================================================

export const LIGHTING_DEFAULTS = {
	ambientIntensity: {
		value: 0.4 as const,
		meta: {
			whenToAdjust:
				'Dark backgrounds (0.4-0.6) for contrast, light backgrounds (0.1-0.3) to avoid washout',
			typicalRange:
				'Dim (0.2, deep shadows) → Standard (0.4, balanced) → Bright (0.6, reduced contrast) → Washed (0.8+, flat)',
			interactsWith: ['backgroundColor', 'keyIntensity'],
		} as PropMetadata,
	},
	ambientColor: {
		value: '#a8b8d0' as const,
		meta: {
			whenToAdjust:
				'Change mood: cool blue (calm, meditative), warm orange (energetic, warm)',
			typicalRange:
				'Cool (#4080ff, calming) → Neutral (#ffffff, balanced) → Warm (#ff9900, energetic)',
			interactsWith: ['backgroundColor', 'keyColor'],
		} as PropMetadata,
	},
	keyPosition: {
		value: [2, 3, 5] as const,
		meta: {
			whenToAdjust:
				'Adjust for different time-of-day effects or to spotlight specific parts of sphere',
			typicalRange:
				'Front-right ([2, 3, 5]) → Right side ([5, 2, 0]) → Left side ([-5, 3, 2])',
			interactsWith: ['keyIntensity', 'rimColor'],
			performanceNote:
				'No impact; lighting computed per-fragment',
		} as PropMetadata,
	},
	keyIntensity: {
		value: 1.2 as const,
		meta: {
			whenToAdjust:
				'0.8-1.2 for gentle, 1.2-1.8 for dramatic, >2.0 for blown-out highlights',
			typicalRange:
				'Subtle (0.8, soft) → Standard (1.2, balanced) → Dramatic (1.8, strong) → Extreme (2.0+, blown-out)',
			interactsWith: ['ambientIntensity', 'fillIntensity'],
		} as PropMetadata,
	},
	keyColor: {
		value: '#ffffff' as const,
		meta: {
			whenToAdjust:
				'Match theme: cool blue for meditative, warm for energetic',
			typicalRange:
				'Cool (#4080ff, calm) → Neutral (#ffffff, balanced) → Warm (#ff9900, warm)',
			interactsWith: ['keyPosition', 'fillColor'],
		} as PropMetadata,
	},
	fillPosition: {
		value: [-2, -1, -3] as const,
		meta: {
			whenToAdjust:
				'Adjust distance/angle for different fill ratio (how much shadow fill vs key drama)',
			typicalRange:
				'Far away ([-5, -3, -5], hard shadows) → Balanced ([-2, -1, -3], natural) → Close ([-1, 1, -1], soft fills)',
			interactsWith: ['fillIntensity', 'keyPosition'],
		} as PropMetadata,
	},
	fillIntensity: {
		value: 0.3 as const,
		meta: {
			whenToAdjust:
				'0.1-0.2 for drama, 0.3-0.5 for softness, >0.5 for very flat appearance',
			typicalRange:
				'Hard (0.1, deep shadows) → Balanced (0.3, natural) → Soft (0.5, reduced contrast) → Flat (0.8+, no shadows)',
			interactsWith: ['keyIntensity', 'ambientIntensity'],
		} as PropMetadata,
	},
	fillColor: {
		value: '#ffffff' as const,
		meta: {
			whenToAdjust:
				'Create color contrast: if key is warm orange, fill should be cool blue',
			typicalRange:
				'Warm (#ff9900) → Neutral (#ffffff) → Cool (#4080ff)',
			interactsWith: ['keyColor', 'fillIntensity'],
		} as PropMetadata,
	},
	rimPosition: {
		value: [0, -5, -5] as const,
		meta: {
			whenToAdjust:
				'Vary angle for different rim position; up/down for different edge definition',
			typicalRange:
				'Behind ([0, -5, -5]) → High rim ([0, 5, -5], top edge) → Side rim ([5, 0, -5], side edge)',
			interactsWith: ['rimIntensity'],
		} as PropMetadata,
	},
	rimIntensity: {
		value: 0.5 as const,
		meta: {
			whenToAdjust:
				'0.1-0.3 for subtle edge, 0.5-0.8 for strong glow effect',
			typicalRange:
				'Subtle (0.2, soft edge) → Balanced (0.5, clear separation) → Strong (0.8, dramatic glow) → Extreme (1.0+, blown-out rim)',
			interactsWith: ['rimColor', 'backgroundColor'],
		} as PropMetadata,
	},
	rimColor: {
		value: '#ffffff' as const,
		meta: {
			whenToAdjust:
				'Match theme: pale cyan for cool/calm, pale orange for warm/energetic',
			typicalRange:
				'Cool (#4080ff) → Neutral (#ffffff) → Warm (#ff9900)',
			interactsWith: ['rimPosition', 'rimIntensity'],
		} as PropMetadata,
	},
} as const;

// ============================================================================
// ENVIRONMENT DEFAULTS
// ============================================================================

export const ENVIRONMENT_DEFAULTS = {
	enableStars: {
		value: true as const,
		meta: {
			whenToAdjust:
				'Disable for minimal aesthetic, enable for space atmosphere',
			typicalRange: 'false (minimal) → true (atmospheric)',
			interactsWith: ['starsCount'],
		} as PropMetadata,
	},
	enableFloor: {
		value: true as const,
		meta: {
			whenToAdjust:
				'Disable for floating aesthetic, enable for grounded feel',
			typicalRange: 'false (floating) → true (grounded)',
			interactsWith: ['floorColor', 'floorOpacity'],
		} as PropMetadata,
	},
	floorOpacity: {
		value: 0.5 as const,
		meta: {
			whenToAdjust:
				'0.3-0.5 for subtle reference, 0.7+ for visible presence',
			typicalRange:
				'Ghost-like (0.2) → Subtle (0.5) → Visible (0.8)',
			interactsWith: ['backgroundColor'],
		} as PropMetadata,
	},
	enablePointLight: {
		value: true as const,
		meta: {
			whenToAdjust:
				'Disable for directional-only lighting, enable for ambient glow',
			typicalRange: 'false (directional only) → true (pulsing ambient)',
			interactsWith: ['lightIntensityMin', 'lightIntensityRange'],
		} as PropMetadata,
	},
	lightIntensityMin: {
		value: 0.5 as const,
		meta: {
			whenToAdjust:
				'0.2-0.5 for subtle glow, 0.8-1.5 for prominent, 2.0+ for bright',
			typicalRange:
				'Subtle (0.2) → Standard (0.5) → Prominent (1.0) → Bright (2.0+)',
			interactsWith: ['lightIntensityRange'],
		} as PropMetadata,
	},
	lightIntensityRange: {
		value: 1.5 as const,
		meta: {
			whenToAdjust:
				'0.5-1.0 for subtle breathing, 1.5-2.5 for pronounced pulse',
			typicalRange:
				'Subtle (0.5) → Moderate (1.5) → Strong (2.5) → Extreme (3.0+)',
		} as PropMetadata,
	},
} as const;

// ============================================================================
// BREATHING DEBUG DEFAULTS
// ============================================================================

export const BREATHING_DEBUG_DEFAULTS = {
	enableManualControl: {
		value: false as const,
		meta: {
			whenToAdjust:
				'Enable for detailed frame-by-frame visual inspection and animation debugging',
			typicalRange: 'false (synchronized) → true (manual control)',
			interactsWith: ['manualPhase'],
		} as PropMetadata,
	},
	manualPhase: {
		value: 0.5 as const,
		meta: {
			whenToAdjust:
				'Scrub to specific points: 0.25 (quarter way), 0.5 (halfway), 0.75 (three-quarters)',
			typicalRange:
				'Start (0.0, fully exhaled) → Half (0.5, middle) → End (1.0, fully inhaled)',
			interactsWith: ['enableManualControl', 'timeScale'],
		} as PropMetadata,
	},
	isPaused: {
		value: false as const,
		meta: {
			whenToAdjust:
				'Pause at key moments: inhale/exhale transitions, peak breathing',
			typicalRange: 'false (playing) → true (paused)',
			interactsWith: ['manualPhase', 'timeScale'],
		} as PropMetadata,
	},
	timeScale: {
		value: 1.0 as const,
		meta: {
			whenToAdjust:
				'0.1-0.5 for slow-motion analysis, 2.0-5.0 for quick iteration',
			typicalRange:
				'Very slow (0.1, 10x slower) → Normal (1.0, realtime) → Fast (5.0, 5x faster)',
			interactsWith: ['isPaused', 'manualPhase'],
		} as PropMetadata,
	},
	jumpToPhase: {
		value: undefined,
		meta: {
			whenToAdjust:
				'Jump to analyze specific phases: 0 (inhale), 2 (exhale), etc.',
			typicalRange:
				'Inhale (0) → Hold-in (1) → Exhale (2) → Hold-out (3)',
			interactsWith: ['manualPhase'],
		} as PropMetadata,
	},
	showOrbitBounds: {
		value: false as const,
		meta: {
			whenToAdjust:
				'Enable to visualize particle orbit range and breathing proportions',
			typicalRange: 'false (hidden) → true (visible orbits)',
		} as PropMetadata,
	},
	showPhaseMarkers: {
		value: false as const,
		meta: {
			whenToAdjust:
				'Enable to learn/verify cycle timing and phase transitions',
			typicalRange: 'false (hidden) → true (visible markers)',
		} as PropMetadata,
	},
	showTraitValues: {
		value: false as const,
		meta: {
			whenToAdjust:
				'Enable to inspect exact animation state and validate algorithm',
			typicalRange: 'false (hidden) → true (visible stats)',
		} as PropMetadata,
	},
} as const;

// ============================================================================
// PARTICLE DEBUG DEFAULTS
// ============================================================================

export const PARTICLE_DEBUG_DEFAULTS = {
	userParticleGeometry: {
		value: 'icosahedron' as const,
		meta: {
			whenToAdjust:
				'icosahedron (smooth, balanced), sphere (rounder), box (blocky), octahedron (8-sided), tetrahedron (4-sided)',
			typicalRange:
				'icosahedron (smooth, balanced) → sphere (rounder) → box (blocky) → octahedron/tetrahedron (angular)',
			interactsWith: ['userParticleDetail'],
			performanceNote:
				'All geometries have similar cost; choice is purely visual',
		} as PropMetadata,
	},
	userParticleDetail: {
		value: 2 as const,
		meta: {
			whenToAdjust:
				'0-1 on mobile for performance, 2-3 for balanced, 4 for premium quality',
			typicalRange:
				'Low (0, angular) → Medium (2, balanced) → High (4, smooth)',
			interactsWith: ['userParticleGeometry'],
			performanceNote:
				'Moderate impact; higher detail increases vertex buffer size',
		} as PropMetadata,
	},
	userParticleScale: {
		value: 1.2 as const,
		meta: {
			whenToAdjust:
				'0.5-0.8 (small, de-emphasized), 1.0-1.5 (prominent), 2.0+ (very large)',
			typicalRange:
				'Small (0.5) → Standard (1.2, default) → Large (2.0)',
			interactsWith: ['fillerParticleScale', 'particleCount'],
		} as PropMetadata,
	},
	userParticlePulse: {
		value: 0.2 as const,
		meta: {
			whenToAdjust:
				'0.0 for static presence, 0.1-0.2 for subtle pulse, 0.3+ for strong breathing effect',
			typicalRange:
				'Static (0.0) → Subtle (0.1) → Standard (0.2) → Strong (0.5)',
			interactsWith: ['sphereScale', 'timeScale'],
			performanceNote: 'No impact; computed in shader',
		} as PropMetadata,
	},
	fillerParticleGeometry: {
		value: 'icosahedron' as const,
		meta: {
			whenToAdjust:
				'Match userParticleGeometry for consistency, or choose differently for visual distinction',
			typicalRange:
				'icosahedron (match user particles) → sphere/box (distinct style)',
			interactsWith: ['fillerParticleDetail', 'userParticleGeometry'],
		} as PropMetadata,
	},
	fillerParticleDetail: {
		value: 2 as const,
		meta: {
			whenToAdjust:
				'Same as userParticleDetail; typically should match for visual consistency',
			typicalRange:
				'Low (0, angular) → Medium (2, balanced) → High (4, smooth)',
			interactsWith: ['fillerParticleGeometry'],
		} as PropMetadata,
	},
	fillerParticleScale: {
		value: 0.8 as const,
		meta: {
			whenToAdjust:
				'0.5-0.7 (small, visually recede), 0.8-1.0 (similar to users)',
			typicalRange:
				'Small (0.5) → Standard (0.8, default) → Large (1.5)',
			interactsWith: ['userParticleScale'],
			performanceNote:
				'Should be visually distinct; typically 60-70% of user scale',
		} as PropMetadata,
	},
	fillerParticlePulse: {
		value: 0.1 as const,
		meta: {
			whenToAdjust:
				'Typically lower than userParticlePulse to de-emphasize filler particles',
			typicalRange:
				'Static (0.0) → Subtle (0.1, default) → Strong (0.5)',
			interactsWith: ['userParticlePulse'],
		} as PropMetadata,
	},
	showParticleTypes: {
		value: false as const,
		meta: {
			whenToAdjust:
				'Enable to visualize orbit separation and particle distribution',
			typicalRange: 'false (hidden) → true (visible orbits)',
		} as PropMetadata,
	},
	showParticleStats: {
		value: false as const,
		meta: {
			whenToAdjust:
				'Enable to monitor particle status and adaptive quality throttling',
			typicalRange: 'false (hidden) → true (visible stats)',
		} as PropMetadata,
	},
} as const;

// ============================================================================
// EXPERIMENTAL BREATHING CURVE DEFAULTS
// ============================================================================

export const EXPERIMENTAL_DEFAULTS = {
	curveType: {
		value: 'phase-based' as const,
		meta: {
			whenToAdjust:
				'Compare algorithms using waveDelta fine-tuning',
			typicalRange:
				'phase-based (production) → rounded-wave (experimental)',
			interactsWith: ['waveDelta'],
		} as PropMetadata,
	},
	waveDelta: {
		value: 0.05 as const,
		meta: {
			whenToAdjust:
				'0.01-0.03 for sharp pauses (box-like), 0.05 for balanced, 0.1-0.2 for smooth (nearly sinusoidal)',
			typicalRange:
				'Very sharp (0.01, box-like) → Balanced (0.05, natural) → Smooth (0.2, flowing)',
			interactsWith: ['curveType'],
		} as PropMetadata,
	},
	showCurveInfo: {
		value: false as const,
		meta: {
			whenToAdjust:
				'Enable when comparing phase-based vs rounded-wave to visualize differences',
			typicalRange: 'false (hidden) → true (visible info overlay)',
		} as PropMetadata,
	},
} as const;

// ============================================================================
// QUALITY PRESETS
// ============================================================================

/**
 * Quality preset definitions.
 *
 * Each preset auto-configures 20+ underlying props for optimal tradeoffs.
 * - **low**: Mobile-friendly (~100 particles, reduced lighting quality)
 * - **medium**: Production default (~300 particles, balanced quality)
 * - **high**: High-end visuals (~500 particles, enhanced effects)
 * - **custom**: Manual control - all advanced props unlocked
 */
export const QUALITY_PRESETS = {
	low: {
		particleCount: 100,
		sphereSegments: 32,
		ambientIntensity: 0.5,
		keyIntensity: 1.0,
		starsCount: 2000,
		userParticleScale: 1.0,
		fillerParticleScale: 0.6,
		description: 'Low: Mobile-friendly • 100 particles • Basic lighting',
	},
	medium: {
		particleCount: 300,
		sphereSegments: 64,
		ambientIntensity: 0.4,
		keyIntensity: 1.2,
		starsCount: 5000,
		userParticleScale: 1.2,
		fillerParticleScale: 0.8,
		description: 'Medium: Balanced • 300 particles • Production quality',
	},
	high: {
		particleCount: 500,
		sphereSegments: 128,
		ambientIntensity: 0.3,
		keyIntensity: 1.5,
		starsCount: 8000,
		userParticleScale: 1.4,
		fillerParticleScale: 1.0,
		description: 'High: Premium visuals • 500 particles • Enhanced effects',
	},
	custom: {
		description: 'Custom: Manual control • All advanced props unlocked',
	},
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract just the values from defaults objects.
 *
 * Useful for spreading into component props.
 *
 * @example
 * const props = { ...getDefaultValues(VISUAL_DEFAULTS) };
 */
export function getDefaultValues<T extends Record<string, { value: unknown }>>(
	defaults: T
): Record<keyof T, any> {
	const result: Record<string, any> = {};
	for (const [key, entry] of Object.entries(defaults)) {
		result[key] = (entry as any).value;
	}
	return result as Record<keyof T, any>;
}

/**
 * Create default prop values suitable for spreading into components.
 *
 * Combines visual, lighting, breathing, and particle defaults.
 */
export function createDefaultSceneProps(): Record<string, any> {
	return {
		...getDefaultValues(VISUAL_DEFAULTS),
		...getDefaultValues(LIGHTING_DEFAULTS),
		...getDefaultValues(BREATHING_DEBUG_DEFAULTS),
		...getDefaultValues(PARTICLE_DEBUG_DEFAULTS),
		...getDefaultValues(EXPERIMENTAL_DEFAULTS),
	};
}

/**
 * Apply a quality preset to a set of props.
 *
 * Merges preset values with existing props, allowing user overrides.
 *
 * @example
 * const props = applyPreset({}, 'low');
 * const customProps = applyPreset({ backgroundColor: '#fff' }, 'high');
 */
export function applyPreset(
	props: Record<string, any>,
	preset: 'low' | 'medium' | 'high'
): Record<string, any> {
	const presetConfig = QUALITY_PRESETS[preset];
	return {
		...props,
		particleCount: presetConfig.particleCount,
		sphereSegments: presetConfig.sphereSegments,
		ambientIntensity: presetConfig.ambientIntensity,
		keyIntensity: presetConfig.keyIntensity,
		starsCount: presetConfig.starsCount,
		userParticleScale: presetConfig.userParticleScale,
		fillerParticleScale: presetConfig.fillerParticleScale,
	};
}

/**
 * Create particle visual configs from debug defaults.
 *
 * Returns properly-typed ParticleVisualConfig objects.
 *
 * @example
 * const { userConfig, fillerConfig } = createParticleConfigs();
 */
export function createParticleConfigs() {
	const userConfig: ParticleVisualConfig = {
		geometry: {
			type: PARTICLE_DEBUG_DEFAULTS.userParticleGeometry.value,
			size: 1,
			detail: PARTICLE_DEBUG_DEFAULTS.userParticleDetail.value,
		},
		material: {
			type: 'basic',
			transparent: true,
			depthWrite: false,
			blending: 2 as any, // THREE.AdditiveBlending
		},
		size: {
			baseScale: PARTICLE_DEBUG_DEFAULTS.userParticleScale.value,
			breathPulseIntensity: PARTICLE_DEBUG_DEFAULTS.userParticlePulse.value,
		},
	};

	const fillerConfig: ParticleVisualConfig = {
		geometry: {
			type: PARTICLE_DEBUG_DEFAULTS.fillerParticleGeometry.value,
			size: 1,
			detail: PARTICLE_DEBUG_DEFAULTS.fillerParticleDetail.value,
		},
		material: {
			type: 'basic',
			transparent: true,
			depthWrite: false,
			blending: 2 as any, // THREE.AdditiveBlending
		},
		size: {
			baseScale: PARTICLE_DEBUG_DEFAULTS.fillerParticleScale.value,
			breathPulseIntensity: PARTICLE_DEBUG_DEFAULTS.fillerParticlePulse.value,
		},
	};

	return { userConfig, fillerConfig };
}

/**
 * Export all defaults as single object for convenience.
 */
export const ALL_DEFAULTS = {
	visual: VISUAL_DEFAULTS,
	lighting: LIGHTING_DEFAULTS,
	breathingDebug: BREATHING_DEBUG_DEFAULTS,
	particleDebug: PARTICLE_DEBUG_DEFAULTS,
	experimental: EXPERIMENTAL_DEFAULTS,
} as const;
