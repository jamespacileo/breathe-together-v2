/**
 * BreathingSphere - Central sphere that scales with breathing
 * Inversely animated compared to particles (shrinks on exhale, grows on inhale)
 * Features a fresnel edge glow that intensifies with breathing
 */
import { useFrame } from '@react-three/fiber';
import gsap from 'gsap';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useWorld } from 'koota/react';
import { getBreathEntity } from '../breath';
import { sphereScale, breathPhase } from '../breath/traits';

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
		varying vec3 vPosition;
		void main() {
			vNormal = normalize(normalMatrix * normal);
			vPosition = position;
			gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
		}
	`,
	fragmentShader: `
		uniform vec3 color;
		uniform float opacity;
		uniform float fresnelIntensity;
		varying vec3 vNormal;
		varying vec3 vPosition;

		void main() {
			vec3 viewDir = normalize(cameraPosition - vPosition);
			float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 2.5);

			// Base color with fresnel edge glow
			vec3 finalColor = mix(color, vec3(1.0), fresnel * fresnelIntensity * 0.6);
			float finalOpacity = opacity + (fresnel * fresnelIntensity * 0.4);

			gl_FragColor = vec4(finalColor, finalOpacity);
		}
	`,
});

export function BreathingSphere({
	color = '#7ec8d4',
	opacity = 0.15,
	segments = 64,
}: BreathingSphereProps) {
	const meshRef = useRef<THREE.Mesh>(null);
	const materialRef = useRef(FresnelMaterial.clone());
	const world = useWorld();
	const sphereColor = useMemo(() => new THREE.Color(color), [color]);

	// Initialize material with proper color
	materialRef.current.uniforms.color.value = sphereColor;
	materialRef.current.uniforms.opacity.value = opacity;

	useFrame(() => {
		if (!meshRef.current || !materialRef.current) return;

		// Get current breath state from entity
		const breathEntity = getBreathEntity(world);
		const targetScale = breathEntity?.get(sphereScale)?.value ?? 1;
		const breathPhaseValue = breathEntity?.get(breathPhase)?.value ?? 0;

		// GSAP smooth interpolation to target scale
		// duration: 0.1s = 6 frames at 60fps = smooth transition
		gsap.to(meshRef.current.scale, {
			x: targetScale,
			y: targetScale,
			z: targetScale,
			duration: 0.1,
			ease: 'none', // Easing already handled by breathCalc
		});

		// Update fresnel intensity based on breath phase
		// Peaks during inhale (phase=1), lowest during exhale (phase=0)
		const fresnelIntensity = 0.6 + breathPhaseValue * 0.8;
		materialRef.current.uniforms.fresnelIntensity.value = fresnelIntensity;
	});

	return (
		<mesh ref={meshRef}>
			<sphereGeometry args={[1, segments, segments]} />
			<primitive object={materialRef.current} attach="material" />
		</mesh>
	);
}
