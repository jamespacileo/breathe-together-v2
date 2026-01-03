/**
 * TextDissolutionParticles - Rising particles that appear during text dissolution
 *
 * When exhale phase begins, particles spawn from the text area and rise upward,
 * creating a beautiful "release" effect that ties into the breathing theme.
 *
 * Features:
 * - Particles spawn at random positions within a rectangular area
 * - Rise upward with slight horizontal drift (wind effect)
 * - Fade out as they rise
 * - Scale decreases over lifetime
 * - Synchronized to exhale phase
 */

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

interface TextDissolutionParticlesProps {
  /** Dissolution progress (0 = no particles, 1 = fully dissolved) */
  progress: number;
  /** Width of the spawn area */
  width?: number;
  /** Height of the spawn area */
  height?: number;
  /** Number of particles */
  count?: number;
  /** Particle color */
  color?: string;
  /** Rise speed multiplier */
  riseSpeed?: number;
}

// Particle state for physics simulation
interface ParticleState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  lifetime: number;
  maxLifetime: number;
  initialY: number;
  seed: number;
}

// Reusable vectors to avoid GC pressure
const _tempPosition = new THREE.Vector3();
const _tempColor = new THREE.Color();

export function TextDissolutionParticles({
  progress,
  width = 3,
  height = 0.8,
  count = 50,
  color = '#c9a06c',
  riseSpeed = 1.0,
}: TextDissolutionParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const particleStatesRef = useRef<ParticleState[]>([]);
  const prevProgressRef = useRef(0);

  // Create geometry and initial attributes
  const { geometry, positions, opacities, sizes } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const posArray = new Float32Array(count * 3);
    const opacityArray = new Float32Array(count);
    const sizeArray = new Float32Array(count);

    // Initialize all particles as invisible
    for (let i = 0; i < count; i++) {
      posArray[i * 3] = 0;
      posArray[i * 3 + 1] = 0;
      posArray[i * 3 + 2] = 0;
      opacityArray[i] = 0;
      sizeArray[i] = 0;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    geo.setAttribute('opacity', new THREE.BufferAttribute(opacityArray, 1));
    geo.setAttribute('size', new THREE.BufferAttribute(sizeArray, 1));

    return {
      geometry: geo,
      positions: posArray,
      opacities: opacityArray,
      sizes: sizeArray,
    };
  }, [count]);

  // Initialize particle states
  useMemo(() => {
    particleStatesRef.current = [];
    for (let i = 0; i < count; i++) {
      particleStatesRef.current.push({
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        lifetime: 0,
        maxLifetime: 0,
        initialY: 0,
        seed: Math.random() * 1000,
      });
    }
  }, [count]);

  // Custom shader material for particles with per-particle opacity
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uGlowColor: { value: new THREE.Color('#ffffff') },
      },
      vertexShader: /* glsl */ `
        attribute float opacity;
        attribute float size;
        varying float vOpacity;

        void main() {
          vOpacity = opacity;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform vec3 uGlowColor;
        varying float vOpacity;

        void main() {
          // Circular particle with soft edge
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);

          // Soft circular falloff
          float alpha = smoothstep(0.5, 0.2, dist) * vOpacity;

          // Glow effect
          vec3 finalColor = mix(uColor, uGlowColor, smoothstep(0.3, 0.0, dist) * 0.3);

          gl_FragColor = vec4(finalColor, alpha);
          if (alpha < 0.01) discard;
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, [color]);

  // Spawn a particle at a random position within the text area
  const spawnParticle = (state: ParticleState) => {
    // Random position within spawn area
    state.position.set(
      (Math.random() - 0.5) * width,
      (Math.random() - 0.5) * height,
      (Math.random() - 0.5) * 0.2,
    );
    state.initialY = state.position.y;

    // Upward velocity with slight horizontal drift
    state.velocity.set(
      (Math.random() - 0.5) * 0.3,
      0.5 + Math.random() * 0.5,
      (Math.random() - 0.5) * 0.1,
    );

    // Random lifetime
    state.maxLifetime = 1.5 + Math.random() * 1.0;
    state.lifetime = 0;
  };

  // Animation loop
  useFrame((_, delta) => {
    if (!pointsRef.current) return;

    const states = particleStatesRef.current;
    const clampedDelta = Math.min(delta, 0.1);

    // Detect progress increase (exhale starting/continuing)
    const progressDelta = progress - prevProgressRef.current;
    const isExhaling = progressDelta > 0 && progress > 0;
    prevProgressRef.current = progress;

    // Spawn rate based on progress
    const spawnChance = isExhaling ? 0.4 : 0;

    for (let i = 0; i < count; i++) {
      const state = states[i];

      // Check if we should spawn a new particle
      if (state.lifetime >= state.maxLifetime || state.maxLifetime === 0) {
        if (Math.random() < spawnChance * clampedDelta * 60) {
          spawnParticle(state);
        } else {
          // Keep particle hidden
          positions[i * 3] = 0;
          positions[i * 3 + 1] = -100; // Off-screen
          positions[i * 3 + 2] = 0;
          opacities[i] = 0;
          sizes[i] = 0;
          continue;
        }
      }

      // Update lifetime
      state.lifetime += clampedDelta;
      const lifetimeProgress = state.lifetime / state.maxLifetime;

      // Apply velocity with some wind wobble
      const windPhase = state.seed + state.lifetime * 2;
      const windX = Math.sin(windPhase) * 0.1;

      state.position.x += (state.velocity.x + windX) * clampedDelta * riseSpeed;
      state.position.y += state.velocity.y * clampedDelta * riseSpeed;
      state.position.z += state.velocity.z * clampedDelta * riseSpeed;

      // Update buffer attributes
      positions[i * 3] = state.position.x;
      positions[i * 3 + 1] = state.position.y;
      positions[i * 3 + 2] = state.position.z;

      // Fade out over lifetime with easeOutQuad
      const fadeProgress = 1 - lifetimeProgress;
      opacities[i] = fadeProgress * fadeProgress * 0.8;

      // Size decreases over lifetime
      sizes[i] = (1 - lifetimeProgress * 0.5) * 0.08;
    }

    // Flag buffers as needing update
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.opacity.needsUpdate = true;
    geometry.attributes.size.needsUpdate = true;
  });

  // Cleanup on unmount
  useMemo(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  // Don't render if not dissolving
  if (progress <= 0) return null;

  return <points ref={pointsRef} geometry={geometry} material={material} />;
}

export default TextDissolutionParticles;
