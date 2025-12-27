import { useFrame } from '@react-three/fiber';
import { useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useWorld } from 'koota/react';
import type { Entity } from 'koota';
import { easing } from 'maath';
import { Position, Velocity, Acceleration, Mass } from '../../shared/traits';
import { restPosition, offset, color, targetColor, size, ownerId, seed, index } from './traits';
import { breathPhase } from '../breath/traits';
import { usePresence } from '../../hooks/usePresence';
import { getMoodColorCounts } from '../../lib/colors';
import { generateFibonacciSphere, sphericalToCartesian } from '../../lib/fibonacciSphere';
import { VISUALS } from '../../constants';

/**
 * ParticleSpawner - Manages particle entities based on presence
 */
export function ParticleSpawner({ totalCount = VISUALS.PARTICLE_COUNT }) {
	const world = useWorld();
	const { moods } = usePresence({ simulated: false, pollInterval: 5000 });
	
	// Generate base layout
	const layout = useMemo(() => generateFibonacciSphere(totalCount), [totalCount]);

	useEffect(() => {
		const entities: Entity[] = [];
		const fillerColor = new THREE.Color(VISUALS.PARTICLE_FILLER_COLOR);

		for (let i = 0; i < totalCount; i++) {
			const p = layout[i];
			const [x, y, z] = sphericalToCartesian(p.theta, p.phi, VISUALS.PARTICLE_ORBIT_MAX);
			
			const entity = world.spawn(
				Position({ x, y, z }),
				Velocity({ x: 0, y: 0, z: 0 }),
				Acceleration({ x: 0, y: 0, z: 0 }),
				Mass({ value: 1 }),
				restPosition({ x: x / VISUALS.PARTICLE_ORBIT_MAX, y: y / VISUALS.PARTICLE_ORBIT_MAX, z: z / VISUALS.PARTICLE_ORBIT_MAX }),
				offset({ x: 0, y: 0, z: 0 }),
				color({ r: fillerColor.r, g: fillerColor.g, b: fillerColor.b }),
				targetColor({ r: fillerColor.r, g: fillerColor.g, b: fillerColor.b }),
				size({ value: p.size }),
				seed({ value: Math.random() * 1000 }),
				ownerId({ value: 'filler' }),
				index({ value: i })
			);
			entities.push(entity);
		}

		return () => {
			entities.forEach(e => { e.destroy(); });
		};
	}, [world, layout, totalCount]);

	// Update target colors based on moods
	useEffect(() => {
		const colorCounts = getMoodColorCounts(moods);
		const particles = world.query(targetColor, ownerId, index);
		
		// Sort by index to ensure stable mapping
		const sortedParticles = [...particles].sort((a, b) => {
			const indexA = a.get(index)?.value ?? 0;
			const indexB = b.get(index)?.value ?? 0;
			return indexA - indexB;
		});
		
		let particleIdx = 0;
		const fillerColor = new THREE.Color(VISUALS.PARTICLE_FILLER_COLOR);

		// Assign user colors
		for (const [hexColor, count] of Object.entries(colorCounts)) {
			const c = new THREE.Color(hexColor);
			for (let i = 0; i < count && particleIdx < totalCount; i++) {
				const entity = sortedParticles[particleIdx];
				if (entity) {
					entity.set(targetColor, { r: c.r, g: c.g, b: c.b });
					entity.set(ownerId, { value: 'user' });
				}
				particleIdx++;
			}
		}

		// Assign filler colors
		while (particleIdx < totalCount) {
			const entity = sortedParticles[particleIdx];
			if (entity) {
				entity.set(targetColor, { r: fillerColor.r, g: fillerColor.g, b: fillerColor.b });
				entity.set(ownerId, { value: 'filler' });
			}
			particleIdx++;
		}
	}, [moods, world, totalCount]);

	return null;
}

/**
 * ParticleRenderer - Renders all particle entities using InstancedMesh
 */
export function ParticleRenderer({ totalCount = VISUALS.PARTICLE_COUNT }) {
	const meshRef = useRef<THREE.InstancedMesh>(null);
	const world = useWorld();
	const matrix = useMemo(() => new THREE.Matrix4(), []);
	const colorObj = useMemo(() => new THREE.Color(), []);

	useFrame((_, delta) => {
		if (!meshRef.current) return;

		const particles = world.query(Position, color, targetColor, size, index);
		const breath = world.queryFirst(breathPhase);
		const phase = breath?.get(breathPhase)?.value ?? 0;

		let colorNeedsUpdate = false;

		particles.forEach((entity) => {
			const pos = entity.get(Position);
			const c = entity.get(color);
			const tc = entity.get(targetColor);
			const sizeTrait = entity.get(size);
			const indexTrait = entity.get(index);

			if (!pos || !c || !tc || !sizeTrait || !indexTrait) return;

			const s = sizeTrait.value;
			const i = indexTrait.value;

			// 1. Smooth color bleeding
			if (c.r !== tc.r || c.g !== tc.g || c.b !== tc.b) {
				easing.damp(c, 'r', tc.r, VISUALS.PARTICLE_COLOR_DAMPING, delta);
				easing.damp(c, 'g', tc.g, VISUALS.PARTICLE_COLOR_DAMPING, delta);
				easing.damp(c, 'b', tc.b, VISUALS.PARTICLE_COLOR_DAMPING, delta);
				colorNeedsUpdate = true;
			}

			// 2. Calculate scale with breath pulse
			const pulse = 1.0 + phase * 0.2;
			const finalScale = s * VISUALS.PARTICLE_SIZE * pulse;

			matrix.makeScale(finalScale, finalScale, finalScale);
			matrix.setPosition(pos.x, pos.y, pos.z);
			meshRef.current?.setMatrixAt(i, matrix);

			if (colorNeedsUpdate) {
				colorObj.setRGB(c.r, c.g, c.b);
				meshRef.current?.setColorAt(i, colorObj);
			}
		});

		meshRef.current.instanceMatrix.needsUpdate = true;
		if (colorNeedsUpdate && meshRef.current.instanceColor) {
			meshRef.current.instanceColor.needsUpdate = true;
		}
	});

	return (
		<instancedMesh ref={meshRef} args={[undefined, undefined, totalCount]}>
			<icosahedronGeometry args={[1, 2]} />
			<meshBasicMaterial
				transparent
				depthWrite={false}
				blending={THREE.AdditiveBlending}
			/>
		</instancedMesh>
	);
}
