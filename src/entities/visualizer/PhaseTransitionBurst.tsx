/**
 * PhaseTransitionBurst - Particle explosions triggered on breath phase transitions
 *
 * Inspired by: Beat-drop effects in music visualizers
 *
 * When the breath phase changes, particles burst outward (exhale) or inward (inhale).
 * Creates satisfying "breath beats" that mark each phase milestone.
 *
 * Burst behaviors per phase transition:
 * - → Inhale: Particles rush INWARD toward globe (gathering energy)
 * - → Hold-in: Particles freeze momentarily, then slowly orbit
 * - → Exhale: Particles EXPLODE outward (biggest burst - release!)
 * - → Hold-out: Particles gently settle and fade
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { useDisposeGeometries, useDisposeMaterials } from '../../hooks/useDisposeMaterials';
import { breathPhase, phaseType } from '../breath/traits';

/**
 * Particle colors per phase (Monument Valley palette)
 */
const PHASE_COLORS: Record<number, THREE.Color> = {
  0: new THREE.Color('#ffbe0b'), // Inhale: Warm Gold
  1: new THREE.Color('#06d6a0'), // Hold-in: Teal
  2: new THREE.Color('#118ab2'), // Exhale: Deep Blue
  3: new THREE.Color('#ef476f'), // Hold-out: Rose
};

/**
 * Burst configuration per phase type
 */
const BURST_CONFIGS: Record<
  number,
  {
    particleCount: number;
    speed: number;
    direction: 'inward' | 'outward' | 'orbit';
    lifetime: number;
    size: number;
  }
> = {
  0: {
    // Inhale - particles rush inward
    particleCount: 40,
    speed: 4.0,
    direction: 'inward',
    lifetime: 1.5,
    size: 0.08,
  },
  1: {
    // Hold-in - particles orbit gently
    particleCount: 20,
    speed: 0.5,
    direction: 'orbit',
    lifetime: 3.0,
    size: 0.06,
  },
  2: {
    // Exhale - BIG explosion outward
    particleCount: 80,
    speed: 6.0,
    direction: 'outward',
    lifetime: 2.0,
    size: 0.12,
  },
  3: {
    // Hold-out - gentle settling
    particleCount: 15,
    speed: 0.3,
    direction: 'orbit',
    lifetime: 2.5,
    size: 0.05,
  },
};

/**
 * Particle state
 */
interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  color: THREE.Color;
  active: boolean;
}

/**
 * Maximum total particles across all bursts
 */
const MAX_PARTICLES = 200;

/**
 * Particle shader with glow effect
 */
const particleVertexShader = `
attribute float size;
attribute vec3 particleColor;
attribute float alpha;

varying vec3 vColor;
varying float vAlpha;

void main() {
  vColor = particleColor;
  vAlpha = alpha;

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = size * (300.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const particleFragmentShader = `
varying vec3 vColor;
varying float vAlpha;

void main() {
  // Circular particle with soft edges
  vec2 center = gl_PointCoord - 0.5;
  float dist = length(center);

  // Soft circle with glow
  float circle = 1.0 - smoothstep(0.3, 0.5, dist);
  float glow = exp(-dist * 4.0) * 0.5;

  float alpha = (circle + glow) * vAlpha;

  if (alpha < 0.01) discard;

  gl_FragColor = vec4(vColor, alpha);
}
`;

interface PhaseTransitionBurstProps {
  /** Enable/disable the effect @default true */
  enabled?: boolean;
  /** Intensity multiplier (affects particle count and speed) @default 1.0 */
  intensity?: number;
  /** Global opacity @default 1.0 */
  opacity?: number;
}

/**
 * PhaseTransitionBurst - Spawns particle bursts on breath phase transitions
 */
export function PhaseTransitionBurst({
  enabled = true,
  intensity = 1.0,
  opacity = 1.0,
}: PhaseTransitionBurstProps) {
  const world = useWorld();
  const pointsRef = useRef<THREE.Points>(null);
  const prevPhaseRef = useRef<number>(-1);

  // Particle pool
  const particles = useRef<Particle[]>(
    Array.from({ length: MAX_PARTICLES }, () => ({
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      life: 0,
      maxLife: 1,
      size: 0.1,
      color: new THREE.Color('#ffffff'),
      active: false,
    })),
  );

  // Create geometry with attributes
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();

    // Position attribute
    const positions = new Float32Array(MAX_PARTICLES * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Size attribute
    const sizes = new Float32Array(MAX_PARTICLES);
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Color attribute
    const colors = new Float32Array(MAX_PARTICLES * 3);
    geo.setAttribute('particleColor', new THREE.BufferAttribute(colors, 3));

    // Alpha attribute
    const alphas = new Float32Array(MAX_PARTICLES);
    geo.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

    return geo;
  }, []);

  // Create shader material
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {},
        vertexShader: particleVertexShader,
        fragmentShader: particleFragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );

  // Cleanup
  useDisposeGeometries([geometry]);
  useDisposeMaterials([material]);

  // Find inactive particle slots
  const getInactiveParticles = (count: number): number[] => {
    const slots: number[] = [];
    for (let i = 0; i < MAX_PARTICLES && slots.length < count; i++) {
      if (!particles.current[i].active) {
        slots.push(i);
      }
    }
    return slots;
  };

  // Spawn burst of particles
  const spawnBurst = (currentPhaseType: number) => {
    const config = BURST_CONFIGS[currentPhaseType];
    const particleCount = Math.floor(config.particleCount * intensity);
    const slots = getInactiveParticles(particleCount);
    const color = PHASE_COLORS[currentPhaseType];

    for (const slot of slots) {
      const particle = particles.current[slot];

      // Random position on sphere surface
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 2.0 + Math.random() * 0.5;

      particle.position.set(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi),
      );

      // Velocity based on burst direction
      const direction = particle.position.clone().normalize();
      const speed = config.speed * (0.7 + Math.random() * 0.6);

      switch (config.direction) {
        case 'inward':
          particle.velocity.copy(direction).multiplyScalar(-speed);
          break;
        case 'outward':
          particle.velocity.copy(direction).multiplyScalar(speed);
          // Add some tangential spread for explosion effect
          particle.velocity.x += (Math.random() - 0.5) * speed * 0.3;
          particle.velocity.y += (Math.random() - 0.5) * speed * 0.3;
          particle.velocity.z += (Math.random() - 0.5) * speed * 0.3;
          break;
        case 'orbit': {
          // Tangential velocity for orbiting
          const tangent = new THREE.Vector3(-direction.z, 0, direction.x).normalize();
          particle.velocity.copy(tangent).multiplyScalar(speed);
          break;
        }
      }

      particle.life = config.lifetime;
      particle.maxLife = config.lifetime;
      particle.size = config.size * (0.8 + Math.random() * 0.4);
      particle.color.copy(color);
      particle.active = true;
    }
  };

  useFrame((_, delta) => {
    if (!enabled || !pointsRef.current) return;

    try {
      // Get current breath state
      const breathEntity = world.queryFirst(breathPhase);
      if (!breathEntity) return;

      const currentPhaseType = breathEntity.get(phaseType)?.value ?? 0;

      // Detect phase transition
      if (prevPhaseRef.current !== -1 && currentPhaseType !== prevPhaseRef.current) {
        spawnBurst(currentPhaseType);
      }
      prevPhaseRef.current = currentPhaseType;

      // Update particles
      const positions = geometry.attributes.position.array as Float32Array;
      const sizes = geometry.attributes.size.array as Float32Array;
      const colors = geometry.attributes.particleColor.array as Float32Array;
      const alphas = geometry.attributes.alpha.array as Float32Array;

      for (let i = 0; i < MAX_PARTICLES; i++) {
        const particle = particles.current[i];

        if (!particle.active) {
          alphas[i] = 0;
          continue;
        }

        // Update life
        particle.life -= delta;
        if (particle.life <= 0) {
          particle.active = false;
          alphas[i] = 0;
          continue;
        }

        // Apply velocity with drag
        particle.position.add(particle.velocity.clone().multiplyScalar(delta));
        particle.velocity.multiplyScalar(0.98); // Drag

        // Update position attribute
        positions[i * 3] = particle.position.x;
        positions[i * 3 + 1] = particle.position.y;
        positions[i * 3 + 2] = particle.position.z;

        // Update size (shrink slightly over time)
        const lifeRatio = particle.life / particle.maxLife;
        sizes[i] = particle.size * lifeRatio;

        // Update color
        colors[i * 3] = particle.color.r;
        colors[i * 3 + 1] = particle.color.g;
        colors[i * 3 + 2] = particle.color.b;

        // Update alpha (fade out with easing)
        const fadeProgress = 1 - lifeRatio;
        alphas[i] = opacity * (1 - fadeProgress * fadeProgress);
      }

      // Mark attributes as needing update
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.size.needsUpdate = true;
      geometry.attributes.particleColor.needsUpdate = true;
      geometry.attributes.alpha.needsUpdate = true;
    } catch {
      // Ignore ECS errors during unmount/remount in Triplex
    }
  });

  if (!enabled) return null;

  return (
    <points ref={pointsRef} geometry={geometry} material={material} name="Phase Transition Burst" />
  );
}

export default PhaseTransitionBurst;
