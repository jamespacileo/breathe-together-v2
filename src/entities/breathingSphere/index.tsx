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
import { createFresnelMaterial } from '../../lib/shaders';
// @ts-ignore - Triplex providers at root level, imported for dev/visual editing only
import { useTriplexConfig } from '../../.triplex/providers';

interface BreathingSphereProps {
	/**
	 * Sphere color
	 * @type color
	 */
	color?: string;

	/**
	 * Material opacity
	 * @min 0
	 * @max 1
	 * @step 0.01
	 */
	opacity?: number;

	/**
	 * Geometry segments (detail level)
	 * @min 16
	 * @max 128
	 * @step 16
	 */
	segments?: number;

	/**
	 * Entrance animation delay in milliseconds
	 * @min 0
	 * @max 1000
	 * @step 50
	 */
	entranceDelayMs?: number;

	/**
	 * Entrance animation duration in milliseconds
	 * @min 200
	 * @max 2000
	 * @step 100
	 */
	entranceDurationMs?: number;

	/**
	 * Noise displacement intensity
	 * @min 0
	 * @max 0.2
	 * @step 0.01
	 */
	noiseIntensity?: number;

	/**
	 * Base fresnel intensity (edge glow)
	 * @min 0
	 * @max 2
	 * @step 0.1
	 */
	fresnelIntensityBase?: number;

	/**
	 * Fresnel intensity range (breathing modulation)
	 * @min 0
	 * @max 2
	 * @step 0.1
	 */
	fresnelIntensityRange?: number;

	/**
	 * Core sphere scale multiplier
	 * @min 0.1
	 * @max 1
	 * @step 0.05
	 */
	coreScale?: number;

	/**
	 * Core sphere base opacity
	 * @min 0
	 * @max 1
	 * @step 0.05
	 */
	coreOpacityBase?: number;

	/**
	 * Core sphere opacity range (breathing modulation)
	 * @min 0
	 * @max 1
	 * @step 0.05
	 */
	coreOpacityRange?: number;

	/**
	 * Aura sphere scale multiplier
	 * @min 1
	 * @max 3
	 * @step 0.1
	 */
	auraScale?: number;

	/**
	 * Aura sphere base opacity
	 * @min 0
	 * @max 0.2
	 * @step 0.01
	 */
	auraOpacityBase?: number;

	/**
	 * Aura sphere opacity range (breathing modulation)
	 * @min 0
	 * @max 0.2
	 * @step 0.01
	 */
	auraOpacityRange?: number;

	/**
	 * Main sphere geometry detail level
	 * @min 16
	 * @max 64
	 * @step 8
	 */
	mainGeometryDetail?: number;

	/**
	 * Chromatic aberration strength (RGB channel fringing on edges)
	 * @min 0
	 * @max 0.1
	 * @step 0.005
	 */
	chromaticAberration?: number;

	/**
	 * Enable organic glow pulsing overlay on breath cycle
	 */
	enableOrganicPulse?: boolean;

	/**
	 * Organic pulse speed (sine wave frequency)
	 * @min 0.1
	 * @max 2
	 * @step 0.1
	 */
	organicPulseSpeed?: number;

	/**
	 * Organic pulse intensity (amplitude)
	 * @min 0
	 * @max 0.2
	 * @step 0.01
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
