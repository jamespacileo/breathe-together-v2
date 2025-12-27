/**
 * BreathingSphere - Central sphere that scales with breathing
 * Inversely animated compared to particles (shrinks on exhale, grows on inhale)
 * Features a fresnel edge glow that intensifies with breathing
 */
import { useFrame } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
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
}

// Fresnel shader material for ethereal edge glow
const FresnelMaterial = new THREE.ShaderMaterial({
	transparent: true,
	depthWrite: true,
	side: THREE.DoubleSide,
	uniforms: {
		color: { value: new THREE.Color() },
		opacity: { value: 0.15 },
		fresnelIntensity: { value: 1.0 },
	},
	vertexShader: `
		varying vec3 vNormal;
		varying vec3 vWorldPosition;
		void main() {
			vNormal = normalize(normalMatrix * normal);
			vec4 worldPosition = modelMatrix * vec4(position, 1.0);
			vWorldPosition = worldPosition.xyz;
			gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
		}
	`,
	fragmentShader: `
		uniform vec3 color;
		uniform float opacity;
		uniform float fresnelIntensity;
		varying vec3 vNormal;
		varying vec3 vWorldPosition;

		void main() {
			vec3 viewDir = normalize(cameraPosition - vWorldPosition + 0.00001);
			float dotProduct = dot(viewDir, vNormal);
			float fresnel = pow(1.0 - clamp(abs(dotProduct), 0.0, 1.0), 2.5);

			// Base color with fresnel edge glow
			vec3 finalColor = mix(color, vec3(1.0), clamp(fresnel * fresnelIntensity * 0.6, 0.0, 1.0));
			float finalOpacity = opacity + (fresnel * fresnelIntensity * 0.4);

			gl_FragColor = vec4(finalColor, clamp(finalOpacity, 0.0, 1.0));
		}
	`,
});

export function BreathingSphere({
	color = VISUALS.SPHERE_COLOR_INHALE,
	opacity = VISUALS.SPHERE_OPACITY,
	segments = VISUALS.SPHERE_SEGMENTS,
}: BreathingSphereProps) {
	const meshRef = useRef<THREE.Mesh>(null);
	const materialRef = useRef(FresnelMaterial.clone());
	const world = useWorld();
	const sphereColor = useMemo(() => new THREE.Color(color), [color]);

	// Pre-allocate colors for lerping to avoid GC pressure
	const exhaleColor = useMemo(() => new THREE.Color(VISUALS.SPHERE_COLOR_EXHALE), []);
	const inhaleColor = useMemo(() => new THREE.Color(VISUALS.SPHERE_COLOR_INHALE), []);

	// Initialize material with proper color
	materialRef.current.uniforms.color.value = sphereColor;
	materialRef.current.uniforms.opacity.value = opacity;

	useFrame(() => {
		if (!meshRef.current || !materialRef.current) return;

		// Get current breath state from entity via query
		const breathEntity = world.queryFirst(sphereScale, breathPhase);
		if (!breathEntity) return;

		const targetScale = breathEntity.get(sphereScale)?.value ?? 1;
		const breathPhaseValue = breathEntity.get(breathPhase)?.value ?? 0;

		// Direct scale assignment - easing is already handled in breathCalc
		meshRef.current.scale.setScalar(targetScale);

		// Update fresnel intensity based on breath phase
		// Peaks during inhale (phase=1), lowest during exhale (phase=0)
		const fresnelIntensity = 0.6 + breathPhaseValue * 0.8;
		materialRef.current.uniforms.fresnelIntensity.value = fresnelIntensity;

		// Update sphere color based on breath phase
		// Energy cycle: exhale (deep blue) → inhale (bright cyan)
		materialRef.current.uniforms.color.value.copy(exhaleColor).lerp(inhaleColor, breathPhaseValue);
	});

	return (
		<mesh ref={meshRef}>
			<sphereGeometry args={[1, segments, segments]} />
			<primitive object={materialRef.current} attach="material" />
		</mesh>
	);
}
