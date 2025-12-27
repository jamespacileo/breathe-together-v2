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
import { orbitRadius, breathPhase } from '../breath/traits';
import { usePresence } from '../../hooks/usePresence';
import { getMoodColorCounts } from '../../lib/colors';
import { generateFibonacciSphere, sphericalToCartesian } from '../../lib/fibonacciSphere';
import { VISUALS } from '../../constants';

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
	totalCount = VISUALS.PARTICLE_COUNT,
	particleSize = VISUALS.PARTICLE_SIZE,
	fillerColor = VISUALS.PARTICLE_FILLER_COLOR,
}: ParticleSystemProps) {
	const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
	const world = useWorld();

	// Get presence data from API (simulated: true for dev, false for production with backend)
	// In dev mode, MSW mocks the API with a stateful simulation of ~50 users
	const { moods } = usePresence({ simulated: false, pollInterval: 5000 });
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

	// Global orbit angle for synchronized particle rotation
	const globalAngleRef = useRef(0);
	// Store opacity values for smooth pulsing
	const opacityRef = useRef(new Float32Array(totalCount).fill(0.8));
	// Track current and target colors for smooth transitions
	const currentColorsRef = useRef<THREE.Color[]>([]);
	const gsapTimelineRef = useRef<gsap.core.Timeline | null>(null);
	// Reuse matrix object to avoid creating 300 new objects per frame
	const matrixRef = useRef(new THREE.Matrix4());

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

	// Set WebGL usage hint for frequently updated instance matrices
	useEffect(() => {
		if (instancedMeshRef.current) {
			instancedMeshRef.current.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
		}
	}, []);

	useFrame((state) => {
		if (!instancedMeshRef.current) return;

		// Get current breath state from entity via query
		const breathEntity = world.queryFirst(orbitRadius, breathPhase);
		if (!breathEntity) return;

		const radius = breathEntity.get(orbitRadius)?.value ?? VISUALS.PARTICLE_ORBIT_MAX;
		const phase = breathEntity.get(breathPhase)?.value ?? 0;
		const delta = state.clock.getDelta();

		// Calculate base opacity: pulse between 0.5 and 1.0 with breath phase
		// At inhale (phase=1): bright (1.0), at exhale (phase=0): dim (0.5)
		const baseOpacity = 0.5 + phase * 0.5;

		// Update global orbit angle for synchronized particle rotation
		// 15 rpm = π/2 rad/s = one complete rotation every 4 seconds
		globalAngleRef.current += (Math.PI / 2) * delta;

		const matrix = matrixRef.current;

		for (let i = 0; i < particles.length; i++) {
			const p = particles[i];

			// Convert spherical to cartesian coordinates
			// Uses original theta + global orbit rotation to maintain 3D distribution while orbiting
			// All particles use same angle for fluid, synchronized rotation
			const [x, y, z] = sphericalToCartesian(
				p.theta + globalAngleRef.current,
				p.phi,
				radius
			);

			// Calculate scale: particles closer to sphere (during inhale) are slightly larger
			// Base scale + breathing modulation (0.9x to 1.1x)
			const scaleModulation = 0.9 + phase * 0.2;
			const scale = p.size * particleSize * scaleModulation;

			// Update instance transformation matrix
			matrix.makeScale(scale, scale, scale);
			matrix.setPosition(x, y, z);

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
