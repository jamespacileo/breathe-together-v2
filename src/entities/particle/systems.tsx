import type { World } from 'koota';
import { restPosition, seed } from './traits';
import { Position, Velocity, Acceleration, Mass } from '../../shared/traits';
import { orbitRadius, sphereScale, crystallization } from '../breath/traits';
import { Vector3 } from 'three';
import { createNoise3D } from 'simplex-noise';
import { VISUALS } from '../../constants';

const tempVec3 = new Vector3();
const tempForce = new Vector3();
const noise3D = createNoise3D();

/**
 * System that handles particle physics:
 * 1. Attraction to orbit (rest position)
 * 2. Wind/Turbulence (Simplex noise) - Dampened by crystallization
 * 3. Jitter/Shiver - Increased by crystallization
 * 4. Sphere Repulsion - Optimized with distSq
 * 5. Integration - Frame-rate independent drag
 */
export function particlePhysicsSystem(world: World) {
	const particles = world.query(Position, Velocity, Acceleration, Mass, restPosition, seed);
	
	return (dt: number, time: number) => {
		const breathEntity = world.queryFirst(orbitRadius, sphereScale, crystallization);
		if (!breathEntity) return;

		const orbitRadiusTrait = breathEntity.get(orbitRadius);
		const sphereScaleTrait = breathEntity.get(sphereScale);
		const crystallizationTrait = breathEntity.get(crystallization);
		
		if (!orbitRadiusTrait || !sphereScaleTrait || !crystallizationTrait) return;

		const currentOrbitRadius = orbitRadiusTrait.value;
		const currentSphereScale = sphereScaleTrait.value;
		const currentCryst = crystallizationTrait.value;

		// Physics constants from VISUALS
		const springStiffness = VISUALS.SPRING_STIFFNESS;
		const drag = Math.pow(VISUALS.PARTICLE_DRAG, dt * 60);
		const windStrength = 0.2 * (1 - currentCryst); // Wind dies down as things crystallize
		const jitterStrength = currentCryst * VISUALS.JITTER_STRENGTH;
		
		const repulsionRadius = currentSphereScale + 0.8;
		const repulsionRadiusSq = repulsionRadius * repulsionRadius;

		particles.forEach((entity) => {
			const pos = entity.get(Position);
			const vel = entity.get(Velocity);
			const acc = entity.get(Acceleration);
			const massTrait = entity.get(Mass);
			const rest = entity.get(restPosition);
			const seedTrait = entity.get(seed);

			if (!pos || !vel || !acc || !massTrait || !rest || !seedTrait) return;

			const mass = massTrait.value;
			const s = seedTrait.value;

			tempForce.set(0, 0, 0);

			// 1. Target Orbit Force (Spring toward target radius)
			tempVec3.set(rest.x, rest.y, rest.z).multiplyScalar(currentOrbitRadius);
			
			tempForce.x += (tempVec3.x - pos.x) * springStiffness;
			tempForce.y += (tempVec3.y - pos.y) * springStiffness;
			tempForce.z += (tempVec3.z - pos.z) * springStiffness;

			// 2. Wind / Turbulence (Simplex noise)
			if (windStrength > 0.001) {
				const nx = noise3D(pos.x * 0.5, pos.y * 0.5, time * 0.2 + s) * windStrength;
				const ny = noise3D(pos.y * 0.5, pos.z * 0.5, time * 0.2 + s + 100) * windStrength;
				const nz = noise3D(pos.z * 0.5, pos.x * 0.5, time * 0.2 + s + 200) * windStrength;
				tempForce.x += nx;
				tempForce.y += ny;
				tempForce.z += nz;
			}

			// 3. Jitter / Shiver (High frequency vibration during holds)
			if (jitterStrength > 0.001) {
				const jx = Math.sin(time * 60 + s) * jitterStrength;
				const jy = Math.sin(time * 61 + s + 10) * jitterStrength;
				const jz = Math.sin(time * 59 + s + 20) * jitterStrength;
				tempForce.x += jx;
				tempForce.y += jy;
				tempForce.z += jz;
			}

			// 4. Sphere Repulsion (Optimized with distSq)
			const distSq = pos.x * pos.x + pos.y * pos.y + pos.z * pos.z;
			if (distSq < repulsionRadiusSq) {
				const dist = Math.sqrt(distSq);
				const repulsion = (repulsionRadius - dist) / repulsionRadius;
				// Power-based curve for "harder" feel
				const push = Math.pow(repulsion, VISUALS.REPULSION_POWER) * VISUALS.REPULSION_STRENGTH * 20;
				tempForce.x += (pos.x / dist) * push;
				tempForce.y += (pos.y / dist) * push;
				tempForce.z += (pos.z / dist) * push;
			}

			// 5. Integration
			acc.x = tempForce.x / mass;
			acc.y = tempForce.y / mass;
			acc.z = tempForce.z / mass;

			vel.x = (vel.x + acc.x * dt) * drag;
			vel.y = (vel.y + acc.y * dt) * drag;
			vel.z = (vel.z + acc.z * dt) * drag;

			pos.x += vel.x * dt;
			pos.y += vel.y * dt;
			pos.z += vel.z * dt;
		});
	};
}
