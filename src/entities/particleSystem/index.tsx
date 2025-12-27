/**
 * ParticleSystem - User presence visualization
 * Each particle represents a user, colored by their current mood
 * Particles orbit in a Fibonacci sphere pattern, contracting on inhale
 */
import { useFrame } from '@react-three/fiber';
import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { useWorld } from 'koota/react';
import { getBreathEntity } from '../breath';
import { orbitRadius, breathPhase } from '../breath/traits';
import { usePresence } from '../../hooks/usePresence';
import { getMoodColorCounts } from '../../lib/colors';
import { generateFibonacciSphere, sphericalToCartesian } from '../../lib/fibonacciSphere';

const MAX_PARTICLES = 300;

interface ParticleSystemProps {
	/**
	 * Total particle count
	 * @min 50
	 * @max 500
	 * @step 50
	 */
	totalCount?: number;

	/**
	 * Particle size
	 * @min 0.02
	 * @max 0.3
	 * @step 0.01
	 */
	particleSize?: number;

	/**
	 * Filler particle color (when no users)
	 * @type color
	 */
	fillerColor?: string;
}

export function ParticleSystem({
	totalCount = 300,
	particleSize = 0.05,
	fillerColor = '#6B8A9C',
}: ParticleSystemProps) {
	const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
	const world = useWorld();

	// Get presence data from API (simulated: true for dev, false for production with backend)
	// In dev mode, generates 75 simulated users with diverse mood distribution
	// When backend is available, change to simulated: false
	const { moods } = usePresence({ simulated: true, pollInterval: 5000 });
	const colorCounts = useMemo(() => getMoodColorCounts(moods), [moods]);

	// Generate particle layout (Fibonacci sphere) - only recalculate when count changes
	const particles = useMemo(
		() => generateFibonacciSphere(totalCount),
		[totalCount]
	);

	// Assign colors: user particles first, then fillers
	const particleColors = useMemo(() => {
		const colors: THREE.Color[] = [];
		const filler = new THREE.Color(fillerColor);

		// Add user-colored particles
		for (const [hexColor, count] of Object.entries(colorCounts)) {
			const color = new THREE.Color(hexColor);
			for (let i = 0; i < count && colors.length < totalCount; i++) {
				colors.push(color);
			}
		}

		// Fill remaining with filler color
		while (colors.length < totalCount) {
			colors.push(filler);
		}

		return colors;
	}, [colorCounts, fillerColor, totalCount]);

	// Orbit angles (persists across frames for smooth animation)
	const anglesRef = useRef(new Float32Array(totalCount));
	// Store opacity values for smooth pulsing
	const opacityRef = useRef(new Float32Array(totalCount).fill(0.8));
	// Track current and target colors for smooth transitions
	const currentColorsRef = useRef<THREE.Color[]>([]);
	const gsapTimelineRef = useRef<gsap.core.Timeline | null>(null);

	// Initialize colors on first render
	if (currentColorsRef.current.length === 0) {
		currentColorsRef.current = particleColors.map((c) => c.clone());
	}

	// Handle color transitions when moods change
	useEffect(() => {
		if (gsapTimelineRef.current) {
			gsapTimelineRef.current.kill();
		}

		// Create intermediate color objects for GSAP animation
		const colorProxies = currentColorsRef.current.map((color) => ({
			r: color.r,
			g: color.g,
			b: color.b,
		}));

		const timeline = gsap.timeline();
		for (let i = 0; i < particleColors.length; i++) {
			const target = particleColors[i];
			timeline.to(
				colorProxies[i],
				{
					r: target.r,
					g: target.g,
					b: target.b,
					duration: 0.6,
					ease: 'power2.inOut',
					onUpdate: () => {
						currentColorsRef.current[i].setRGB(
							colorProxies[i].r,
							colorProxies[i].g,
							colorProxies[i].b
						);
					},
				},
				0 // Start all animations at the same time
			);
		}

		gsapTimelineRef.current = timeline;

		return () => {
			if (gsapTimelineRef.current) {
				gsapTimelineRef.current.kill();
			}
		};
	}, [particleColors]);

	useFrame((state) => {
		if (!instancedMeshRef.current) return;

		// Get current breath state from entity
		const breathEntity = getBreathEntity(world);
		const radius = breathEntity?.get(orbitRadius)?.value ?? 2.8;
		const phase = breathEntity?.get(breathPhase)?.value ?? 0;
		const delta = state.clock.getDelta();
		const time = state.clock.getElapsedTime();

		// Calculate base opacity: pulse between 0.5 and 1.0 with breath phase
		// At inhale (phase=1): bright (1.0), at exhale (phase=0): dim (0.5)
		const baseOpacity = 0.5 + phase * 0.5;

		const matrix = new THREE.Matrix4();

		for (let i = 0; i < particles.length; i++) {
			const p = particles[i];

			// Update orbit angle (continuous rotation)
			// 0.5 rad/s = ~86 rev/min base speed, clearly visible orbit, modulated by particle speed
			anglesRef.current[i] += 0.5 * p.orbitSpeed * delta;

			// Convert spherical to cartesian coordinates
			// Uses original theta + orbit rotation to maintain 3D distribution while orbiting
			const [x, y, z] = sphericalToCartesian(
				p.theta + anglesRef.current[i],
				p.phi,
				radius
			);

			// Add subtle random drift using sine waves with different frequencies per particle
			// Reduced amplitude to let orbit motion be primary - drift enhances but doesn't overpower
			const driftX = Math.sin(time * 0.3 + i * 0.5) * 0.04;
			const driftY = Math.cos(time * 0.25 + i * 0.7) * 0.04;
			const driftZ = Math.sin(time * 0.2 + i * 1.2) * 0.04;

			// Calculate scale: particles closer to sphere (during inhale) are slightly larger
			// Base scale + breathing modulation (0.9x to 1.1x)
			const scaleModulation = 0.9 + phase * 0.2;
			const scale = p.size * particleSize * scaleModulation;

			// Update instance transformation matrix with drift
			matrix.makeScale(scale, scale, scale);
			matrix.setPosition(x + driftX, y + driftY, z + driftZ);

			// Smooth opacity interpolation
			opacityRef.current[i] += (baseOpacity - opacityRef.current[i]) * 0.1;

			instancedMeshRef.current.setMatrixAt(i, matrix);
			// Use transitioning colors instead of static colors
			instancedMeshRef.current.setColorAt(i, currentColorsRef.current[i]);
		}

		instancedMeshRef.current.instanceMatrix.needsUpdate = true;
		if (instancedMeshRef.current.instanceColor) {
			instancedMeshRef.current.instanceColor.needsUpdate = true;
		}

		// Update material opacity (affects all particles uniformly)
		if (instancedMeshRef.current.material instanceof THREE.Material) {
			instancedMeshRef.current.material.opacity = opacityRef.current[0];
		}
	});

	return (
		<instancedMesh ref={instancedMeshRef} args={[undefined, undefined, totalCount]}>
			{/* Using lower segment count for better performance, soft appearance */}
			<icosahedronGeometry args={[1, 2]} />
			<meshBasicMaterial
				transparent
				depthWrite={false}
				blending={THREE.AdditiveBlending}
				fog={false}
			/>
		</instancedMesh>
	);
}
