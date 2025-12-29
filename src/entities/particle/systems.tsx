import type { World } from 'koota';
import { easing } from 'maath';
import { createNoise3D } from 'simplex-noise';
import { Vector3 } from 'three';
import { PARTICLE_PHYSICS, VISUALS } from '../../constants';
import { Acceleration, Mass, Position, Velocity } from '../../shared/traits';
import { breathPhase, crystallization, orbitRadius, sphereScale } from '../breath/traits';
import {
  color,
  JitterBehaviorTrait,
  OrbitBehaviorTrait,
  parentSwarm,
  RepulsionBehaviorTrait,
  restPosition,
  seed,
  targetColor,
  WindBehaviorTrait,
} from './traits';

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
  const particles = world.query(
    Position,
    Velocity,
    Acceleration,
    Mass,
    restPosition,
    seed,
    parentSwarm,
  );

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

    const phase = breathEntity.get(breathPhase)?.value ?? 0;

    particles.forEach((entity) => {
      const pos = entity.get(Position);
      const vel = entity.get(Velocity);
      const acc = entity.get(Acceleration);
      const massTrait = entity.get(Mass);
      const rest = entity.get(restPosition);
      const seedTrait = entity.get(seed);
      const parent = entity.get(parentSwarm);

      if (!pos || !vel || !acc || !massTrait || !rest || !seedTrait) return;

      // Get swarm behaviors if available
      const swarmEntity = parent?.value;
      if (!swarmEntity || !world.has(swarmEntity)) return;

      const orbit = swarmEntity.get(OrbitBehaviorTrait);
      const wind = swarmEntity.get(WindBehaviorTrait);
      const jitter = swarmEntity.get(JitterBehaviorTrait);
      const repulsion = swarmEntity.get(RepulsionBehaviorTrait);

      // Physics constants from VISUALS and PARTICLE_PHYSICS
      const targetStiffness =
        phase * VISUALS.SPRING_STIFFNESS_INHALE + (1 - phase) * VISUALS.SPRING_STIFFNESS_EXHALE;
      const targetDrag =
        phase * VISUALS.PARTICLE_DRAG_INHALE + (1 - phase) * VISUALS.PARTICLE_DRAG_EXHALE;

      const springStiffness = targetStiffness;
      const drag = targetDrag ** (dt * 60);

      // Subtle upward buoyancy that follows the breath (stronger on inhale)
      const buoyancyStrength = phase * 0.05;

      const mass = massTrait.value;
      const s = seedTrait.value;

      tempForce.set(0, 0, 0);

      // 1. Target Orbit Force (Spring toward target radius)
      if (orbit) {
        const { minRadius, maxRadius, spread } = orbit;
        const targetRadius =
          minRadius + (maxRadius - minRadius) * (currentOrbitRadius / VISUALS.PARTICLE_ORBIT_MAX);
        tempVec3.set(rest.x, rest.y, rest.z).multiplyScalar(targetRadius);

        tempForce.x += (tempVec3.x - pos.x) * springStiffness * spread;
        tempForce.y += (tempVec3.y - pos.y) * springStiffness * spread;
        tempForce.z += (tempVec3.z - pos.z) * springStiffness * spread;
      }

      // 2. Wind / Turbulence (Simplex noise)
      if (wind) {
        const windStrength =
          PARTICLE_PHYSICS.WIND_BASE_STRENGTH * (1 - currentCryst) * wind.strength;
        if (windStrength > PARTICLE_PHYSICS.FORCE_THRESHOLD) {
          const nx =
            noise3D(
              pos.x * PARTICLE_PHYSICS.WIND_FREQUENCY_SCALE,
              pos.y * PARTICLE_PHYSICS.WIND_FREQUENCY_SCALE,
              time * PARTICLE_PHYSICS.WIND_TIME_SCALE + s,
            ) * windStrength;
          const ny =
            noise3D(
              pos.y * PARTICLE_PHYSICS.WIND_FREQUENCY_SCALE,
              pos.z * PARTICLE_PHYSICS.WIND_FREQUENCY_SCALE,
              time * PARTICLE_PHYSICS.WIND_TIME_SCALE + s + PARTICLE_PHYSICS.WIND_NOISE_OFFSET_X,
            ) * windStrength;
          const nz =
            noise3D(
              pos.z * PARTICLE_PHYSICS.WIND_FREQUENCY_SCALE,
              pos.x * PARTICLE_PHYSICS.WIND_FREQUENCY_SCALE,
              time * PARTICLE_PHYSICS.WIND_TIME_SCALE + s + PARTICLE_PHYSICS.WIND_NOISE_OFFSET_Y,
            ) * windStrength;
          tempForce.x += nx;
          tempForce.y += ny;
          tempForce.z += nz;
        }
      }

      // 3. Jitter / Shiver (High frequency vibration during holds)
      if (jitter) {
        const jitterStrength = currentCryst * VISUALS.JITTER_STRENGTH * jitter.strength;
        if (jitterStrength > PARTICLE_PHYSICS.FORCE_THRESHOLD) {
          const jx = Math.sin(time * PARTICLE_PHYSICS.JITTER_FREQUENCY_X + s) * jitterStrength;
          const jy =
            Math.sin(
              time * PARTICLE_PHYSICS.JITTER_FREQUENCY_Y +
                s +
                PARTICLE_PHYSICS.JITTER_PHASE_OFFSET_Y,
            ) * jitterStrength;
          const jz =
            Math.sin(
              time * PARTICLE_PHYSICS.JITTER_FREQUENCY_Z +
                s +
                PARTICLE_PHYSICS.JITTER_PHASE_OFFSET_Z,
            ) * jitterStrength;
          tempForce.x += jx;
          tempForce.y += jy;
          tempForce.z += jz;
        }
      }

      // 4. Sphere Repulsion (Optimized with distSq)
      if (repulsion) {
        const repulsionRadius = currentSphereScale + repulsion.radiusOffset;
        const repulsionRadiusSq = repulsionRadius * repulsionRadius;
        const distSq = pos.x * pos.x + pos.y * pos.y + pos.z * pos.z;

        if (distSq < repulsionRadiusSq) {
          const dist = Math.sqrt(distSq);
          const repulsionFactor = (repulsionRadius - dist) / repulsionRadius;
          // Power-based curve for "harder" feel
          const push =
            repulsionFactor ** VISUALS.REPULSION_POWER *
            VISUALS.REPULSION_STRENGTH *
            PARTICLE_PHYSICS.REPULSION_STRENGTH_MULTIPLIER *
            repulsion.strength;
          tempForce.x += (pos.x / dist) * push;
          tempForce.y += (pos.y / dist) * push;
          tempForce.z += (pos.z / dist) * push;
        }
      }

      // 4.5. Breath Buoyancy (Subtle vertical drift)
      tempForce.y += buoyancyStrength;

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

      // Update Koota with new position and velocity for rendering
      entity.set(Position, pos);
      entity.set(Velocity, vel);
    });
  };
}

/**
 * System that handles particle color transitions:
 * 1. Smoothly interpolates current color toward targetColor
 */
export function particleColorSystem(world: World) {
  const particles = world.query(color, targetColor);

  return (dt: number) => {
    particles.forEach((entity) => {
      const c = entity.get(color);
      const tc = entity.get(targetColor);

      if (!c || !tc) return;

      // Interpolate current color toward target
      easing.damp(c, 'r', tc.r, VISUALS.PARTICLE_COLOR_DAMPING, dt);
      easing.damp(c, 'g', tc.g, VISUALS.PARTICLE_COLOR_DAMPING, dt);
      easing.damp(c, 'b', tc.b, VISUALS.PARTICLE_COLOR_DAMPING, dt);
    });
  };
}
