/**
 * BreathStreams - Curved particle streams flowing with breath
 *
 * Creates visible "wind lines" that flow toward the globe during inhale
 * and away during exhale, making the invisible breath visible.
 *
 * Features:
 * - Multiple streams distributed around the globe (Fibonacci sphere)
 * - Particles flow along bezier curves
 * - Direction reverses based on breath phase
 * - Opacity fades at stream ends for soft appearance
 * - Monument Valley color palette (warm gold with teal accents)
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { breathPhase, phaseType } from '../breath/traits';

export interface BreathStreamsProps {
  /** Number of streams distributed around the globe @default 8 */
  streamCount?: number;
  /** Particles per stream @default 24 */
  particlesPerStream?: number;
  /** Inner radius (closest to globe) @default 2.0 */
  innerRadius?: number;
  /** Outer radius (farthest from globe) @default 5.5 */
  outerRadius?: number;
  /** Particle size @default 0.04 */
  particleSize?: number;
  /** Base opacity @default 0.6 */
  opacity?: number;
  /** Primary color (inhale streams) @default '#c9a06c' */
  primaryColor?: string;
  /** Secondary color (exhale accent) @default '#4dd9e8' */
  secondaryColor?: string;
  /** Enable component @default true */
  enabled?: boolean;
}

/**
 * Calculate Fibonacci sphere point for even distribution
 */
function getFibonacciSpherePoint(index: number, total: number): THREE.Vector3 {
  if (total <= 1) {
    return new THREE.Vector3(0, 1, 0);
  }

  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const y = 1 - (index / (total - 1)) * 2;
  const radiusAtY = Math.sqrt(1 - y * y);
  const theta = goldenAngle * index;

  return new THREE.Vector3(Math.cos(theta) * radiusAtY, y, Math.sin(theta) * radiusAtY);
}

// Pre-allocated vectors for animation loop
const _tempPosition = new THREE.Vector3();
const _tempDirection = new THREE.Vector3();
const _tempTangent = new THREE.Vector3();
const _yAxis = new THREE.Vector3(0, 1, 0);

/**
 * Per-stream state for animation
 */
interface StreamState {
  /** Base direction from Fibonacci distribution */
  direction: THREE.Vector3;
  /** Perpendicular tangent for curve offset */
  tangent: THREE.Vector3;
  /** Random phase offset for variation */
  phaseOffset: number;
  /** Random curve amplitude */
  curveAmplitude: number;
  /** Slow orbital drift angle */
  orbitAngle: number;
  /** Per-stream orbit speed */
  orbitSpeed: number;
}

export const BreathStreams = memo(function BreathStreams({
  streamCount = 8,
  particlesPerStream = 24,
  innerRadius = 2.0,
  outerRadius = 5.5,
  particleSize = 0.04,
  opacity = 0.6,
  primaryColor = '#c9a06c',
  secondaryColor = '#4dd9e8',
  enabled = true,
}: BreathStreamsProps) {
  const world = useWorld();
  const pointsRef = useRef<THREE.Points>(null);

  // Total particle count
  const totalParticles = streamCount * particlesPerStream;

  // Initialize stream states
  const streamStates = useMemo(() => {
    const states: StreamState[] = [];
    for (let i = 0; i < streamCount; i++) {
      const direction = getFibonacciSpherePoint(i, streamCount);

      // Calculate tangent perpendicular to direction
      const tangent = new THREE.Vector3();
      tangent.crossVectors(direction, _yAxis).normalize();
      if (tangent.lengthSq() < 0.001) {
        tangent.set(1, 0, 0);
      }

      states.push({
        direction: direction.clone(),
        tangent: tangent.clone(),
        phaseOffset: Math.random() * Math.PI * 2,
        curveAmplitude: 0.2 + Math.random() * 0.3,
        orbitAngle: 0,
        orbitSpeed: 0.02 + Math.random() * 0.02,
      });
    }
    return states;
  }, [streamCount]);

  // Create geometry with positions and colors
  const { geometry, positionAttr, opacityAttr } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(totalParticles * 3);
    const colors = new Float32Array(totalParticles * 3);
    const opacities = new Float32Array(totalParticles);

    // Parse colors
    const primary = new THREE.Color(primaryColor);
    const secondary = new THREE.Color(secondaryColor);

    // Initialize positions and colors
    for (let streamIdx = 0; streamIdx < streamCount; streamIdx++) {
      for (let particleIdx = 0; particleIdx < particlesPerStream; particleIdx++) {
        const idx = streamIdx * particlesPerStream + particleIdx;

        // Initial position (will be updated in animation)
        positions[idx * 3] = 0;
        positions[idx * 3 + 1] = 0;
        positions[idx * 3 + 2] = 0;

        // Blend color based on particle position in stream
        const t = particleIdx / (particlesPerStream - 1);
        const color = primary.clone().lerp(secondary, t * 0.3);
        colors[idx * 3] = color.r;
        colors[idx * 3 + 1] = color.g;
        colors[idx * 3 + 2] = color.b;

        // Opacity fades at ends
        const edgeFade = Math.sin(t * Math.PI);
        opacities[idx] = edgeFade * opacity;
      }
    }

    const posAttr = new THREE.BufferAttribute(positions, 3);
    const colAttr = new THREE.BufferAttribute(colors, 3);
    const opAttr = new THREE.BufferAttribute(opacities, 1);

    geo.setAttribute('position', posAttr);
    geo.setAttribute('color', colAttr);
    geo.setAttribute('opacity', opAttr);

    return { geometry: geo, positionAttr: posAttr, opacityAttr: opAttr };
  }, [totalParticles, streamCount, particlesPerStream, primaryColor, secondaryColor, opacity]);

  // Create shader material for point rendering with per-vertex opacity
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uSize: { value: particleSize * 100 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      vertexShader: `
        attribute float opacity;
        varying vec3 vColor;
        varying float vOpacity;
        uniform float uSize;
        uniform float uPixelRatio;

        void main() {
          vColor = color;
          vOpacity = opacity;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = uSize * uPixelRatio * (1.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vOpacity;

        void main() {
          // Soft circular point
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;

          float alpha = smoothstep(0.5, 0.2, dist) * vOpacity;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });
  }, [particleSize]);

  // Cleanup
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  // Animation
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Animation loop requires multiple phase-dependent calculations for stream positioning and flow direction
  useFrame((state) => {
    if (!enabled || !pointsRef.current) return;

    const time = state.clock.elapsedTime;
    const positions = positionAttr.array as Float32Array;
    const opacities = opacityAttr.array as Float32Array;

    // Get breath state from ECS
    let currentBreathPhase = 0.5;
    let currentPhaseType = 0;
    const breathEntity = world.queryFirst(breathPhase, phaseType);
    if (breathEntity) {
      try {
        currentBreathPhase = breathEntity.get(breathPhase)?.value ?? 0.5;
        currentPhaseType = breathEntity.get(phaseType)?.value ?? 0;
      } catch (_e) {
        // Silently catch ECS errors during unmount/remount
      }
    }

    // Determine flow direction based on phase
    // Inhale (0) & hold-in (1): flow inward (positive direction along stream)
    // Exhale (2) & hold-out (3): flow outward (negative direction)
    const isInhaling = currentPhaseType === 0 || currentPhaseType === 1;
    const flowSpeed = isInhaling ? 1.0 : -1.0;

    // Stream visibility based on breath phase
    // Streams are more visible during active breathing, fade during holds
    const isHold = currentPhaseType === 1 || currentPhaseType === 3;
    const phaseOpacityMult = isHold ? 0.4 : 1.0;

    for (let streamIdx = 0; streamIdx < streamCount; streamIdx++) {
      const streamState = streamStates[streamIdx];

      // Update orbital drift
      streamState.orbitAngle += streamState.orbitSpeed * 0.016;

      // Apply orbit to direction
      _tempDirection.copy(streamState.direction);
      _tempDirection.applyAxisAngle(_yAxis, streamState.orbitAngle);

      for (let particleIdx = 0; particleIdx < particlesPerStream; particleIdx++) {
        const idx = streamIdx * particlesPerStream + particleIdx;

        // Normalized position along stream (0 = inner, 1 = outer)
        const baseT = particleIdx / (particlesPerStream - 1);

        // Animate position along stream with flow
        const flowOffset = (time * 0.5 * flowSpeed + streamState.phaseOffset) % 1;
        let t = (baseT + flowOffset) % 1;
        if (t < 0) t += 1;

        // Radius interpolation
        const radius = THREE.MathUtils.lerp(innerRadius, outerRadius, t);

        // Curve offset (sine wave perpendicular to direction)
        const curvePhase = t * Math.PI * 2 + time * 0.3;
        const curveOffset = Math.sin(curvePhase) * streamState.curveAmplitude;

        // Calculate position
        _tempPosition.copy(_tempDirection).multiplyScalar(radius);
        _tempTangent.copy(streamState.tangent).applyAxisAngle(_yAxis, streamState.orbitAngle);
        _tempPosition.addScaledVector(_tempTangent, curveOffset);

        positions[idx * 3] = _tempPosition.x;
        positions[idx * 3 + 1] = _tempPosition.y;
        positions[idx * 3 + 2] = _tempPosition.z;

        // Opacity: fade at ends + breath phase modulation
        const edgeFade = Math.sin(t * Math.PI);
        const breathFade = 0.5 + currentBreathPhase * 0.5; // Brighter during inhale
        opacities[idx] = edgeFade * opacity * phaseOpacityMult * breathFade;
      }
    }

    positionAttr.needsUpdate = true;
    opacityAttr.needsUpdate = true;
  });

  if (!enabled) return null;

  return <points ref={pointsRef} geometry={geometry} material={material} name="Breath Streams" />;
});

export default BreathStreams;
