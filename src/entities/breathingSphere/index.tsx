/**
 * BreathingSphere - Central sphere that scales with breathing
 * Inversely animated compared to particles (shrinks on exhale, grows on inhale)
 * Features a fresnel edge glow that intensifies with breathing
 * Entrance animation: scales from 0 with smooth overshoot
 */
import { useFrame } from '@react-three/fiber';
import { useRef, useMemo, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useWorld } from 'koota/react';
import { sphereScale, breathPhase } from '../breath/traits';
import {
	VISUALS,
	DEFAULT_SPHERE_CONFIG,
	type SphereConfig,
	type SphereVisualConfig,
	type SphereAnimationConfig,
	type SphereGeometryConfig,
	type SphereLayerConfig,
} from '../../constants';
import { useTriplexConfig } from '../../contexts/triplex';
import { createFresnelMaterial } from '../../lib/shaders';

interface BreathingSphereProps {
	/**
	 * Sphere base color (tinted by fresnel shader).
	 *
	 * Primary visual component color. Blends between color and white at edges
	 * based on fresnel effect (eye-glancing rays glow brighter).
	 *
	 * **When to adjust:** Create focal point contrast, align with brand palette
	 * **Typical range:** Muted (#4080ff, calm) → Standard (#4dd9e8, balanced) → Vibrant (#60a5fa, energetic)
	 * **Interacts with:** fresnelIntensityBase (controls edge glow), backgroundColor (must contrast)
	 *
	 * @type color
	 * @default "#4dd9e8"
	 */
	color?: string;

	/**
	 * Material transparency (alpha channel blending).
	 *
	 * Controls how translucent the sphere appears. Lower values create ethereal feel.
	 *
	 * **When to adjust:** Lower (0.05-0.2) for subtle appearance, higher (0.5-1.0) for solid presence
	 * **Typical range:** Very transparent (0.05) → Balanced (0.2) → Opaque (0.5) → Solid (1.0)
	 * **Interacts with:** backgroundColor, coreOpacityBase, auraOpacityBase
	 *
	 * @min 0
	 * @max 1
	 * @step 0.01
	 * @default 0.15
	 */
	opacity?: number;

	/**
	 * Geometry segment count (sphere surface smoothness).
	 *
	 * Higher values create smoother surface but increase GPU cost.
	 * Minimum 16 (visible facets), maximum 128 (very smooth).
	 *
	 * **When to adjust:** Lower (16-32) on mobile, higher (64+) for premium visual quality
	 * **Typical range:** Low detail (16, angular) → Medium (32, balanced) → High (64, smooth) → Ultra (128, very smooth)
	 * **Performance note:** Significant impact; each +16 segments ~1-2% GPU time
	 *
	 * @min 16
	 * @max 128
	 * @step 16
	 * @default 64
	 */
	segments?: number;

	/**
	 * Entrance animation delay (milliseconds before animating in).
	 *
	 * Time to wait after component mounts before starting entrance animation.
	 * Useful for staggered reveals or coordinating with other animations.
	 *
	 * **When to adjust:** 0 for immediate entrance, 100-500 for staggered/delayed reveal
	 * **Typical range:** Immediate (0) → Delayed (200, default) → Slow buildup (500+)
	 *
	 * @min 0
	 * @max 1000
	 * @step 50
	 * @default 200
	 */
	entranceDelayMs?: number;

	/**
	 * Entrance animation duration (milliseconds to complete the entrance).
	 *
	 * How long the entrance animation takes. Includes scale-up and overshoot.
	 *
	 * **When to adjust:** Faster (200-400) for snappy entrance, slower (800-1200) for graceful appearance
	 * **Typical range:** Fast (200, snappy) → Balanced (800, smooth) → Slow (1500+, graceful)
	 *
	 * @min 200
	 * @max 2000
	 * @step 100
	 * @default 800
	 */
	entranceDurationMs?: number;

	/**
	 * Procedural noise displacement intensity on sphere surface.
	 *
	 * Applies Perlin noise to vertex positions for organic, wavy surface appearance.
	 * Higher values create more dramatic deformation.
	 *
	 * **When to adjust:** 0.0 for smooth sphere, 0.05-0.1 for subtle waves, 0.15+ for dramatic organic effect
	 * **Typical range:** Smooth (0.0) → Subtle (0.05, default) → Wavy (0.1) → Dramatic (0.2+)
	 * **Performance note:** Minimal impact; computed in vertex shader
	 *
	 * @min 0
	 * @max 0.2
	 * @step 0.01
	 * @default 0.05
	 */
	noiseIntensity?: number;

	/**
	 * Base fresnel glow intensity (non-breathing edge effect).
	 *
	 * Controls the constant edge glow brightness. Fresh nef effect makes edges brighter
	 * when viewed at glancing angles (Schlick's approximation).
	 *
	 * **When to adjust:** 0.3-0.6 for subtle glow, 0.8-1.2 for prominent edges, 1.5+ for dramatic rim
	 * **Typical range:** Subtle (0.3, understated) → Balanced (0.6, natural) → Dramatic (1.0, prominent) → Extreme (1.5+, blown-out)
	 * **Interacts with:** fresnelIntensityRange (dynamic component), sphereColor
	 *
	 * @min 0
	 * @max 2
	 * @step 0.1
	 * @default 0.6
	 */
	fresnelIntensityBase?: number;

	/**
	 * Fresnel glow breathing modulation range.
	 *
	 * How much the edge glow intensifies/dims with breathing cycle.
	 * Adds dynamic visual effect synchronized with breath phase.
	 *
	 * **When to adjust:** 0.2-0.5 for subtle breathing effect, 0.8-1.2 for pronounced modulation
	 * **Typical range:** Subtle (0.2) → Moderate (0.6, default) → Strong (1.0) → Extreme (1.5+)
	 * **Interacts with:** fresnelIntensityBase (adds to base value)
	 *
	 * @min 0
	 * @max 2
	 * @step 0.1
	 * @default 0.8
	 */
	fresnelIntensityRange?: number;

	/**
	 * Core sphere scale (inner bright sphere).
	 *
	 * Controls the size of the bright inner sphere (core layer) relative to overall sphere.
	 * Smaller values (0.2-0.4) create subtle core, larger values (0.6+) create prominent core.
	 *
	 * **When to adjust:** 0.2-0.3 for subtle inner glow, 0.4-0.6 for balanced, 0.8+ for dominant core
	 * **Typical range:** Subtle (0.2) → Balanced (0.4, default) → Prominent (0.6) → Dominant (0.8+)
	 * **Interacts with:** coreOpacityBase, auraScale (should be smaller than aura)
	 *
	 * @min 0.1
	 * @max 1
	 * @step 0.05
	 * @default 0.4
	 */
	coreScale?: number;

	/**
	 * Core sphere base opacity (non-breathing).
	 *
	 * Baseline transparency of the inner core layer. Additional opacity comes from
	 * coreOpacityRange modulation during breathing.
	 *
	 * **When to adjust:** 0.05-0.15 for subtle glow, 0.2-0.35 for prominent core, 0.4+ for solid inner sphere
	 * **Typical range:** Subtle (0.1) → Balanced (0.2, default) → Prominent (0.35) → Solid (0.5+)
	 *
	 * @min 0
	 * @max 1
	 * @step 0.05
	 * @default 0.2
	 */
	coreOpacityBase?: number;

	/**
	 * Core sphere breathing opacity modulation range.
	 *
	 * How much core opacity changes with breathing cycle. Creates pulsing inner glow effect.
	 *
	 * **When to adjust:** 0.1-0.2 for subtle pulse, 0.3-0.5 for pronounced breathing effect
	 * **Typical range:** Subtle (0.1) → Moderate (0.2, default) → Strong (0.4) → Extreme (0.6+)
	 *
	 * @min 0
	 * @max 1
	 * @step 0.05
	 * @default 0.3
	 */
	coreOpacityRange?: number;

	/**
	 * Aura sphere scale (outer glowing layer).
	 *
	 * Controls the size of outer aura layer that extends beyond the main sphere.
	 * Creates soft glow effect with gradual falloff.
	 *
	 * **When to adjust:** 1.2-1.5 for subtle aura, 1.8-2.2 for prominent glow, 2.5+ for extensive bloom
	 * **Typical range:** Subtle (1.2) → Balanced (1.5, default) → Prominent (2.0) → Extensive (2.5+)
	 * **Interacts with:** auraOpacityBase (together control glow size/intensity), coreScale (aura should be larger)
	 *
	 * @min 1
	 * @max 3
	 * @step 0.1
	 * @default 1.5
	 */
	auraScale?: number;

	/**
	 * Aura sphere base opacity (non-breathing glow).
	 *
	 * Baseline transparency of outer aura layer. Typically very low (0.01-0.05) to create
	 * soft, diffuse glow effect.
	 *
	 * **When to adjust:** 0.005-0.02 for subtle glow, 0.03-0.1 for prominent bloom
	 * **Typical range:** Very subtle (0.01, barely visible) → Subtle (0.02, default) → Visible (0.05) → Prominent (0.1+)
	 *
	 * @min 0
	 * @max 0.2
	 * @step 0.01
	 * @default 0.02
	 */
	auraOpacityBase?: number;

	/**
	 * Aura sphere breathing opacity modulation range.
	 *
	 * How much outer aura opacity changes with breathing cycle.
	 * Creates expanding/contracting glow effect.
	 *
	 * **When to adjust:** 0.02-0.05 for subtle breathing, 0.08-0.15 for dramatic bloom pulse
	 * **Typical range:** Subtle (0.02) → Moderate (0.05, default) → Strong (0.1) → Dramatic (0.15+)
	 *
	 * @min 0
	 * @max 0.2
	 * @step 0.01
	 * @default 0.05
	 */
	auraOpacityRange?: number;

	/**
	 * Main sphere geometry detail/complexity level.
	 *
	 * Controls vertex density of the main sphere geometry. Higher = more vertices = smoother
	 * surface but more GPU memory and computation.
	 *
	 * **When to adjust:** Lower (16, mobile) for performance, higher (48-64) for premium quality
	 * **Typical range:** Low (16, minimal facets) → Medium (32, balanced) → High (48, smooth) → Ultra (64+, very smooth)
	 * **Performance note:** Moderate impact on memory and rendering
	 *
	 * @min 16
	 * @max 64
	 * @step 8
	 * @default 32
	 */
	mainGeometryDetail?: number;

	/**
	 * Chromatic aberration strength (RGB channel fringing).
	 *
	 * Applies physics-inspired RGB fringing effect on sphere edges. Creates iridescent appearance
	 * as if looking through prism or chromatic lens.
	 *
	 * **When to adjust:** 0.0 for clean edges, 0.01-0.03 for subtle iridescence, 0.05+ for dramatic prism effect
	 * **Typical range:** None (0.0) → Subtle (0.02, default) → Visible (0.05) → Dramatic (0.08+)
	 * **Performance note:** Minimal impact; computed in fragment shader
	 *
	 * @min 0
	 * @max 0.1
	 * @step 0.005
	 * @default 0.02
	 */
	chromaticAberration?: number;

	/**
	 * Enable organic glow pulse overlay on breathing cycle.
	 *
	 * When true, adds an additional sine-wave pulsing glow on top of breathing synchronization.
	 * Creates more organic, living appearance rather than strict breathing sync.
	 *
	 * **When to adjust:** Enable for living/organic feel, disable (false) for strict breathing sync
	 * **Typical range:** false (breathing-only) → true (organic pulsing, default)
	 * **Interacts with:** organicPulseSpeed, organicPulseIntensity
	 *
	 * @default true
	 */
	enableOrganicPulse?: boolean;

	/**
	 * Organic pulse sine wave frequency (Hz).
	 *
	 * Speed of organic glow pulsing (cycles per second). Only active when enableOrganicPulse is true.
	 * 0.5 = slow undulating pulse, 2.0 = rapid pulsing.
	 *
	 * **When to adjust:** 0.3-0.6 for slow meditative pulse, 1.0-1.5 for balanced, 2.0+ for rapid pulsing
	 * **Typical range:** Very slow (0.1, nearly static) → Slow (0.5, meditative) → Moderate (1.0, balanced) → Fast (2.0+, rapid)
	 * **Interacts with:** enableOrganicPulse (must be true to have effect), organicPulseIntensity
	 *
	 * @min 0.1
	 * @max 2
	 * @step 0.1
	 * @default 0.5
	 */
	organicPulseSpeed?: number;

	/**
	 * Organic pulse amplitude (intensity of pulsing effect).
	 *
	 * How much the glow brightness oscillates. Higher values create more pronounced
	 * pulsing effect. Only active when enableOrganicPulse is true.
	 *
	 * **When to adjust:** 0.01-0.05 for subtle undulation, 0.08-0.15 for pronounced pulsing
	 * **Typical range:** Subtle (0.02, nearly undetectable) → Moderate (0.05, default) → Strong (0.1) → Extreme (0.15+)
	 *
	 * @min 0
	 * @max 0.2
	 * @step 0.01
	 * @default 0.05
	 */
	organicPulseIntensity?: number;
}

/**
 * Helper function to convert flat props to grouped config object
 * Maintains Triplex compatibility (props interface stays flat) while
 * organizing values internally for better code readability
 */
function propsToConfig(props: BreathingSphereProps): SphereConfig {
	return {
		visuals: {
			opacity: props.opacity ?? DEFAULT_SPHERE_CONFIG.visuals.opacity,
			chromaticAberration: props.chromaticAberration ?? DEFAULT_SPHERE_CONFIG.visuals.chromaticAberration,
			fresnelIntensityBase: props.fresnelIntensityBase ?? DEFAULT_SPHERE_CONFIG.visuals.fresnelIntensityBase,
			fresnelIntensityRange: props.fresnelIntensityRange ?? DEFAULT_SPHERE_CONFIG.visuals.fresnelIntensityRange,
		},
		animation: {
			entranceDelayMs: props.entranceDelayMs ?? DEFAULT_SPHERE_CONFIG.animation.entranceDelayMs,
			entranceDurationMs: props.entranceDurationMs ?? DEFAULT_SPHERE_CONFIG.animation.entranceDurationMs,
			enableOrganicPulse: props.enableOrganicPulse ?? DEFAULT_SPHERE_CONFIG.animation.enableOrganicPulse,
			organicPulseSpeed: props.organicPulseSpeed ?? DEFAULT_SPHERE_CONFIG.animation.organicPulseSpeed,
			organicPulseIntensity: props.organicPulseIntensity ?? DEFAULT_SPHERE_CONFIG.animation.organicPulseIntensity,
		},
		geometry: {
			segments: props.segments ?? DEFAULT_SPHERE_CONFIG.geometry.segments,
			mainGeometryDetail: props.mainGeometryDetail ?? DEFAULT_SPHERE_CONFIG.geometry.mainGeometryDetail,
		},
		layers: {
			coreScale: props.coreScale ?? DEFAULT_SPHERE_CONFIG.layers.coreScale,
			coreOpacityBase: props.coreOpacityBase ?? DEFAULT_SPHERE_CONFIG.layers.coreOpacityBase,
			coreOpacityRange: props.coreOpacityRange ?? DEFAULT_SPHERE_CONFIG.layers.coreOpacityRange,
			auraScale: props.auraScale ?? DEFAULT_SPHERE_CONFIG.layers.auraScale,
			auraOpacityBase: props.auraOpacityBase ?? DEFAULT_SPHERE_CONFIG.layers.auraOpacityBase,
			auraOpacityRange: props.auraOpacityRange ?? DEFAULT_SPHERE_CONFIG.layers.auraOpacityRange,
		},
	};
}

export function BreathingSphere({
	opacity = VISUALS.SPHERE_OPACITY,
	entranceDelayMs = 200,
	entranceDurationMs = 800,
	noiseIntensity = 0.05,
	fresnelIntensityBase = 0.6,
	fresnelIntensityRange = 0.8,
	coreScale = 0.4,
	coreOpacityBase = 0.2,
	coreOpacityRange = 0.3,
	auraScale = 1.5,
	auraOpacityBase = 0.02,
	auraOpacityRange = 0.05,
	mainGeometryDetail = 32,
	chromaticAberration = 0.02,
	enableOrganicPulse = true,
	organicPulseSpeed = 0.5,
	organicPulseIntensity = 0.05,
}: BreathingSphereProps = {}) {
	const triplexConfig = useTriplexConfig?.();

	// Create config object from flat props (for internal organization)
	// If Triplex context is available, merge its sphereConfig with prop overrides
	const config = useMemo(() => {
		const baseConfig = triplexConfig?.sphereConfig ?? propsToConfig({
			opacity, entranceDelayMs, entranceDurationMs, noiseIntensity,
			fresnelIntensityBase, fresnelIntensityRange, coreScale, coreOpacityBase,
			coreOpacityRange, auraScale, auraOpacityBase, auraOpacityRange,
			mainGeometryDetail, chromaticAberration, enableOrganicPulse,
			organicPulseSpeed, organicPulseIntensity,
		});
		// Allow props to override context config
		return propsToConfig({
			opacity: opacity !== VISUALS.SPHERE_OPACITY ? opacity : undefined,
			entranceDelayMs, entranceDurationMs, noiseIntensity,
			fresnelIntensityBase, fresnelIntensityRange, coreScale, coreOpacityBase,
			coreOpacityRange, auraScale, auraOpacityBase, auraOpacityRange,
			mainGeometryDetail, chromaticAberration, enableOrganicPulse,
			organicPulseSpeed, organicPulseIntensity,
		}) ?? baseConfig;
	}, [
		triplexConfig,
		opacity, entranceDelayMs, entranceDurationMs, noiseIntensity,
		fresnelIntensityBase, fresnelIntensityRange, coreScale, coreOpacityBase,
		coreOpacityRange, auraScale, auraOpacityBase, auraOpacityRange,
		mainGeometryDetail, chromaticAberration, enableOrganicPulse,
		organicPulseSpeed, organicPulseIntensity,
	]);

	const meshRef = useRef<THREE.Mesh>(null);
	const coreRef = useRef<THREE.Mesh>(null);
	const auraRef = useRef<THREE.Mesh>(null);
	const entranceStartTimeRef = useRef<number | null>(null);
	const [mounted, setMounted] = useState(false);

	const materialRef = useRef(createFresnelMaterial(noiseIntensity));
	const coreMaterialRef = useRef(
		new THREE.MeshPhongMaterial({
			transparent: true,
			opacity: 0.6,
			shininess: 100,
			blending: THREE.AdditiveBlending,
		})
	);
	const auraMaterialRef = useRef(createFresnelMaterial(noiseIntensity * 2.5));

	// Track entrance animation
	useEffect(() => {
		setMounted(true);
	}, []);

	const world = useWorld();

	// Pre-allocate colors for lerping to avoid GC pressure
	const exhaleColor = useMemo(() => new THREE.Color(VISUALS.SPHERE_COLOR_EXHALE), []);
	const inhaleColor = useMemo(() => new THREE.Color(VISUALS.SPHERE_COLOR_INHALE), []);

	useFrame((state) => {
		if (!meshRef.current || !materialRef.current) return;

		// Initialize entrance start time on first frame
		if (mounted && entranceStartTimeRef.current === null) {
			entranceStartTimeRef.current = state.clock.elapsedTime;
		}

		// Get current breath state from entity via query
		const breathEntity = world.queryFirst(sphereScale, breathPhase);
		if (!breathEntity) return;

		const targetScale = breathEntity.get(sphereScale)?.value ?? 1;
		const breathPhaseValue = breathEntity.get(breathPhase)?.value ?? 0;

		// Calculate entrance animation
		let entranceScale = 1;
		if (entranceStartTimeRef.current !== null) {
			const entranceStart = entranceStartTimeRef.current + config.animation.entranceDelayMs / 1000;
			const entranceEnd = entranceStart + config.animation.entranceDurationMs / 1000;
			const currentTime = state.clock.elapsedTime;

			if (currentTime < entranceEnd) {
				// Entrance in progress - ease-out with overshoot
				const entranceProgress = Math.min((currentTime - entranceStart) / (config.animation.entranceDurationMs / 1000), 1);
				// Back.out easing (overshoot effect)
				const c1 = 1.70158;
				const c3 = c1 + 1;
				entranceScale =
					entranceProgress === 0
						? 0
						: 1 +
							c3 * Math.pow(entranceProgress - 1, 3) +
							c1 * Math.pow(entranceProgress - 1, 2);
				entranceScale = Math.max(0, entranceScale);
			}
		}

		// Update uniforms
		const time = state.clock.elapsedTime;
		const color = materialRef.current.uniforms.uColor.value
			.copy(exhaleColor)
			.lerp(inhaleColor, breathPhaseValue);

		materialRef.current.uniforms.uTime.value = time;
		materialRef.current.uniforms.uBreathPhase.value = breathPhaseValue;
		materialRef.current.uniforms.uChromaticAberration.value = config.visuals.chromaticAberration;

		// Enhance glow pulsing with organic overlay
		let fresnelValue = config.visuals.fresnelIntensityBase + breathPhaseValue * config.visuals.fresnelIntensityRange;
		if (config.animation.enableOrganicPulse) {
			const organicPulse = Math.sin(time * config.animation.organicPulseSpeed) * config.animation.organicPulseIntensity;
			fresnelValue += organicPulse;
			fresnelValue = Math.max(
				config.visuals.fresnelIntensityBase * 0.5,
				Math.min(config.visuals.fresnelIntensityBase + config.visuals.fresnelIntensityRange + config.animation.organicPulseIntensity * 2, fresnelValue)
			);
		}
		materialRef.current.uniforms.uFresnelIntensity.value = fresnelValue;
		materialRef.current.uniforms.uOpacity.value = config.visuals.opacity;

		// 1. Core: Solid, dense center. Stiff expansion (late bloom).
		const coreCurve = 0.7 + 0.3 * Math.pow(breathPhaseValue, 2.5);
		const finalCoreScale = VISUALS.SPHERE_SCALE_MIN * coreCurve * config.layers.coreScale;

		if (coreRef.current) {
			coreRef.current.scale.setScalar(finalCoreScale * entranceScale);
			coreMaterialRef.current.opacity =
				(config.layers.coreOpacityBase + breathPhaseValue * config.layers.coreOpacityRange) * entranceScale;
			coreMaterialRef.current.color.copy(color);
		}

		// 2. Main: Standard response.
		meshRef.current.scale.setScalar(targetScale * entranceScale);

		// 3. Aura: Elastic, airy outer shell. Early expansion (filling up).
		const auraCurve = 1.0 + 1.2 * Math.pow(breathPhaseValue, 0.5);
		const finalAuraScale = VISUALS.SPHERE_SCALE_MIN * auraCurve * config.layers.auraScale;

		if (auraRef.current) {
			auraRef.current.scale.setScalar(finalAuraScale * entranceScale);

			// Update Aura Shader Uniforms
			const auraMaterial = auraMaterialRef.current as THREE.ShaderMaterial;
			auraMaterial.uniforms.uTime.value = time;
			auraMaterial.uniforms.uBreathPhase.value = breathPhaseValue;
			auraMaterial.uniforms.uColor.value.copy(color);
			auraMaterial.uniforms.uOpacity.value =
				(config.layers.auraOpacityBase + breathPhaseValue * config.layers.auraOpacityRange) * entranceScale;
			auraMaterial.uniforms.uFresnelIntensity.value = fresnelValue * 0.5;
		}
	});

	return (
		<group>
			{/* Main Sphere with organic displacement */}
			<mesh ref={meshRef}>
				<icosahedronGeometry args={[1, mainGeometryDetail]} />
				<primitive object={materialRef.current} attach="material" />
			</mesh>

			{/* Inner Core - Glowing center */}
			<mesh ref={coreRef}>
				<sphereGeometry args={[1, 32, 32]} />
				<primitive object={coreMaterialRef.current} attach="material" />
			</mesh>

			{/* Outer Aura - Soft atmospheric glow */}
			<mesh ref={auraRef}>
				<icosahedronGeometry args={[1, mainGeometryDetail]} />
				<primitive object={auraMaterialRef.current} attach="material" />
			</mesh>
		</group>
	);
}
