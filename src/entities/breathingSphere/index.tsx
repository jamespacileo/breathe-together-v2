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
import { VISUALS } from '../../constants';

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

// Enhanced Fresnel shader material with organic vertex displacement
const createEnhancedSphereMaterial = (noiseIntensity: number = 0.05) => new THREE.ShaderMaterial({
	transparent: true,
	depthWrite: false,
	side: THREE.DoubleSide,
	uniforms: {
		uColor: { value: new THREE.Color() },
		uOpacity: { value: 0.15 },
		uFresnelIntensity: { value: 1.0 },
		uTime: { value: 0 },
		uNoiseIntensity: { value: noiseIntensity },
		uBreathPhase: { value: 0 },
		uChromaticAberration: { value: 0.02 },
	},
	vertexShader: `
		varying vec3 vNormal;
		varying vec3 vWorldPosition;
		varying float vNoise;
		uniform float uTime;
		uniform float uNoiseIntensity;
		uniform float uBreathPhase;

		// Simple 3D Noise function (Simplex-like)
		vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
		vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
		vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
		vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
		float snoise(vec3 v) {
			const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
			const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
			vec3 i  = floor(v + dot(v, C.yyy) );
			vec3 x0 =   v - i + dot(i, C.xxx) ;
			vec3 g = step(x0.yzx, x0.xyz);
			vec3 l = 1.0 - g;
			vec3 i1 = min( g.xyz, l.zxy );
			vec3 i2 = max( g.xyz, l.zxy );
			vec3 x1 = x0 - i1 + C.xxx;
			vec3 x2 = x0 - i2 + C.yyy;
			vec3 x3 = x0 - D.yyy;
			i = mod289(i);
			vec4 p = permute( permute( permute(
						i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
					+ i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
					+ i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
			float n_ = 0.142857142857;
			vec3  ns = n_ * D.wyz - D.xzx;
			vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
			vec4 x_ = floor(j * ns.z);
			vec4 y_ = floor(j - 7.0 * x_ );
			vec4 x = x_ *ns.x + ns.yyyy;
			vec4 y = y_ *ns.x + ns.yyyy;
			vec4 h = 1.0 - abs(x) - abs(y);
			vec4 b0 = vec4( x.xy, y.xy );
			vec4 b1 = vec4( x.zw, y.zw );
			vec4 s0 = floor(b0)*2.0 + 1.0;
			vec4 s1 = floor(b1)*2.0 + 1.0;
			vec4 sh = -step(h, vec4(0.0));
			vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
			vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
			vec3 p0 = vec3(a0.xy,h.x);
			vec3 p1 = vec3(a0.zw,h.y);
			vec3 p2 = vec3(a1.xy,h.z);
			vec3 p3 = vec3(a1.zw,h.w);
			vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
			p0 *= norm.x;
			p1 *= norm.y;
			p2 *= norm.z;
			p3 *= norm.w;
			vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
			m = m * m;
			return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
		}

		void main() {
			vNormal = normalize(normalMatrix * normal);
			
			// Add noise displacement
			float noise = snoise(position * 1.5 + uTime * 0.2);
			vNoise = noise;
			
			// Displacement increases with breath phase
			float displacement = noise * uNoiseIntensity * (1.0 + uBreathPhase * 1.0);
			vec3 newPosition = position + normal * displacement;
			
			vec4 worldPosition = modelMatrix * vec4(newPosition, 1.0);
			vWorldPosition = worldPosition.xyz;
			gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
		}
	`,
	fragmentShader: `
		uniform vec3 uColor;
		uniform float uOpacity;
		uniform float uFresnelIntensity;
		uniform float uTime;
		uniform float uChromaticAberration;
		varying vec3 vNormal;
		varying vec3 vWorldPosition;
		varying float vNoise;

		void main() {
			vec3 viewDir = normalize(cameraPosition - vWorldPosition + 0.00001);
			float dotProduct = dot(viewDir, vNormal);

			// Dual-layer fresnel for nuanced edge glow
			float fresnelSoft = pow(1.0 - clamp(abs(dotProduct), 0.0, 1.0), 2.0);   // Wider, softer
			float fresnelSharp = pow(1.0 - clamp(abs(dotProduct), 0.0, 1.0), 5.0);  // Tighter, sharper
			float fresnel = mix(fresnelSoft, fresnelSharp, 0.3);                     // 70% soft + 30% sharp

			// Subtle shimmer based on noise
			float shimmer = vNoise * 0.1;

			// Procedural chromatic aberration (RGB channel offset)
			vec3 chromaticColor;
			chromaticColor.r = mix(uColor, vec3(1.0), fresnel * uFresnelIntensity * 0.7 * (1.0 + uChromaticAberration)).r;
			chromaticColor.g = mix(uColor, vec3(1.0), fresnel * uFresnelIntensity * 0.7).g;
			chromaticColor.b = mix(uColor, vec3(1.0), fresnel * uFresnelIntensity * 0.7 * (1.0 - uChromaticAberration)).b;

			// Final color with chromatic aberration and shimmer
			vec3 finalColor = chromaticColor + shimmer;

			// Opacity modulation
			float finalOpacity = uOpacity + (fresnel * uFresnelIntensity * 0.4);

			gl_FragColor = vec4(finalColor, clamp(finalOpacity, 0.0, 1.0));
		}
	`,
});

export function BreathingSphere({
	color = VISUALS.SPHERE_COLOR_INHALE,
	opacity = VISUALS.SPHERE_OPACITY,
	segments = VISUALS.SPHERE_SEGMENTS,
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
}: BreathingSphereProps) {
	const meshRef = useRef<THREE.Mesh>(null);
	const coreRef = useRef<THREE.Mesh>(null);
	const auraRef = useRef<THREE.Mesh>(null);
	const entranceStartTimeRef = useRef<number | null>(null);
	const [mounted, setMounted] = useState(false);

	const materialRef = useRef(createEnhancedSphereMaterial(noiseIntensity));
	const coreMaterialRef = useRef(
		new THREE.MeshBasicMaterial({
			transparent: true,
			opacity: 0.4,
			blending: THREE.AdditiveBlending,
		})
	);
	const auraMaterialRef = useRef(
		new THREE.MeshBasicMaterial({
			transparent: true,
			opacity: 0.05,
			side: THREE.BackSide,
			blending: THREE.AdditiveBlending,
		})
	);

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
			const entranceStart = entranceStartTimeRef.current + entranceDelayMs / 1000;
			const entranceEnd = entranceStart + entranceDurationMs / 1000;
			const currentTime = state.clock.elapsedTime;

			if (currentTime < entranceEnd) {
				// Entrance in progress - ease-out with overshoot
				const entranceProgress = Math.min((currentTime - entranceStart) / (entranceDurationMs / 1000), 1);
				// Back.out easing (overshoot effect)
				const c1 = 1.70158;
				const c3 = c1 + 1;
				entranceScale = entranceProgress === 0 ? 0 : 1 + c3 * Math.pow(entranceProgress - 1, 3) + c1 * Math.pow(entranceProgress - 1, 2);
				entranceScale = Math.max(0, entranceScale);
			}
		}

		// Update uniforms
		materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
		materialRef.current.uniforms.uBreathPhase.value = breathPhaseValue;
		materialRef.current.uniforms.uChromaticAberration.value = chromaticAberration;

		// Enhance glow pulsing with organic overlay
		let fresnelValue = fresnelIntensityBase + breathPhaseValue * fresnelIntensityRange;
		if (enableOrganicPulse) {
			// Add subtle organic pulse (overlaid on breath cycle)
			const organicPulse = Math.sin(state.clock.elapsedTime * organicPulseSpeed) * organicPulseIntensity;
			fresnelValue += organicPulse;
			// Clamp to prevent over/under glow
			fresnelValue = Math.max(fresnelIntensityBase * 0.5, Math.min(fresnelIntensityBase + fresnelIntensityRange + organicPulseIntensity * 2, fresnelValue));
		}
		materialRef.current.uniforms.uFresnelIntensity.value = fresnelValue;

		materialRef.current.uniforms.uColor.value
			.copy(exhaleColor)
			.lerp(inhaleColor, breathPhaseValue);
		materialRef.current.uniforms.uOpacity.value = opacity;

		// Update main mesh with entrance scale applied
		meshRef.current.scale.setScalar(targetScale * entranceScale);

		// Update core (pulses slightly differently)
		if (coreRef.current) {
			coreRef.current.scale.setScalar(targetScale * coreScale * entranceScale);
			coreMaterialRef.current.opacity = (coreOpacityBase + breathPhaseValue * coreOpacityRange) * entranceScale;
			coreMaterialRef.current.color.copy(materialRef.current.uniforms.uColor.value);
		}

		// Update aura (larger, softer)
		if (auraRef.current) {
			auraRef.current.scale.setScalar(targetScale * auraScale * entranceScale);
			auraMaterialRef.current.opacity = (auraOpacityBase + breathPhaseValue * auraOpacityRange) * entranceScale;
			auraMaterialRef.current.color.copy(materialRef.current.uniforms.uColor.value);
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
				<sphereGeometry args={[1, 32, 32]} />
				<primitive object={auraMaterialRef.current} attach="material" />
			</mesh>
		</group>
	);
}
