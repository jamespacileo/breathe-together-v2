/**
 * AtmosphericParticles - Ambient cloud-like particles orbiting the globe
 *
 * Features:
 * - Soft cloudlets distributed in orbital bands
 * - Breathing-synchronized opacity
 * - Warm gray color (#8c7b6c) for Monument Valley aesthetic
 *
 * Uses a custom THREE.Points shader for soft, cloud-like sprites
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { RENDER_LAYERS } from '../../constants';
import { breathPhase } from '../breath/traits';

export interface AtmosphericParticlesProps {
  /**
   * Number of floating particles.
   *
   * @default 100
   * @min 10
   * @max 500
   */
  count?: number;

  /**
   * Base particle size.
   *
   * @default 0.08
   * @min 0.01
   * @max 0.5
   */
  size?: number;

  /**
   * Base opacity (before breathing modulation).
   *
   * @default 0.1
   * @min 0
   * @max 1
   */
  baseOpacity?: number;

  /**
   * Breathing opacity range (added to baseOpacity).
   *
   * @default 0.15
   * @min 0
   * @max 1
   */
  breathingOpacity?: number;

  /**
   * Particle color (hex string).
   *
   * @default '#8c7b6c'
   */
  color?: string;

  /** Minimum orbit radius @default 4.2 */
  minRadius?: number;
  /** Maximum orbit radius @default 7.2 */
  maxRadius?: number;
  /** Minimum angular speed (radians/sec) @default 0.025 */
  minSpeed?: number;
  /** Maximum angular speed (radians/sec) @default 0.085 */
  maxSpeed?: number;
  /** Maximum orbital inclination in radians @default 0.6 */
  maxInclination?: number;
  /** Vertical band height range @default 1.4 */
  heightRange?: number;
  /** Per-particle size multiplier range @default [0.7, 2.3] */
  sizeRange?: [number, number];
  /** Per-particle opacity multiplier range @default [0.35, 1.0] */
  opacityRange?: [number, number];
}

/**
 * AtmosphericParticles - Floating ambient particles
 *
 * Creates an ethereal swarm of cloudlets orbiting the central globe,
 * with slow drift and breathing-synchronized opacity modulation.
 *
 * Wrapped with React.memo to prevent re-renders from parent component updates.
 */
export const AtmosphericParticles = memo(function AtmosphericParticlesComponent({
  count = 100,
  size = 0.08,
  baseOpacity = 0.15,
  breathingOpacity = 0.2,
  color = '#8c7b6c',
  minRadius = 4.2,
  maxRadius = 7.2,
  minSpeed = 0.025,
  maxSpeed = 0.085,
  maxInclination = 0.6,
  heightRange = 1.4,
  sizeRange = [0.7, 2.3],
  opacityRange = [0.35, 1.0],
}: AtmosphericParticlesProps = {}) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const world = useWorld();

  // Set layers on mount
  useEffect(() => {
    if (pointsRef.current) {
      pointsRef.current.layers.set(RENDER_LAYERS.EFFECTS);
    }
  }, []);

  const particleData = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const opacities = new Float32Array(count);
    const radii = new Float32Array(count);
    const inclinations = new Float32Array(count);
    const speeds = new Float32Array(count);
    const baseAngles = new Float32Array(count);
    const heightOffsets = new Float32Array(count);
    const phaseOffsets = new Float32Array(count);

    const radiusMin = Math.min(minRadius, maxRadius);
    const radiusMax = Math.max(minRadius, maxRadius);
    const speedMin = Math.min(minSpeed, maxSpeed);
    const speedMax = Math.max(minSpeed, maxSpeed);
    const [sizeMin, sizeMax] = sizeRange;
    const [opacityMin, opacityMax] = opacityRange;

    for (let i = 0; i < count; i++) {
      const radius = radiusMin + Math.random() * (radiusMax - radiusMin);
      const angle = Math.random() * Math.PI * 2;
      const speed = speedMin + Math.random() * (speedMax - speedMin);
      const inclination = (Math.random() - 0.5) * maxInclination;
      const heightOffset = (Math.random() - 0.5) * heightRange;
      const phaseOffset = Math.random() * Math.PI * 2;
      const particleSize = size * (sizeMin + Math.random() * (sizeMax - sizeMin));

      radii[i] = radius;
      baseAngles[i] = angle;
      speeds[i] = speed;
      inclinations[i] = inclination;
      heightOffsets[i] = heightOffset;
      phaseOffsets[i] = phaseOffset;
      sizes[i] = particleSize;
      opacities[i] = opacityMin + Math.random() * (opacityMax - opacityMin);

      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = heightOffset;

      const cosTilt = Math.cos(inclination);
      const sinTilt = Math.sin(inclination);
      const zTilt = z * cosTilt - y * sinTilt;
      const yTilt = z * sinTilt + y * cosTilt;

      positions[i * 3] = x;
      positions[i * 3 + 1] = yTilt;
      positions[i * 3 + 2] = zTilt;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aOpacity', new THREE.BufferAttribute(opacities, 1));

    return {
      geometry,
      positions,
      radii,
      inclinations,
      speeds,
      baseAngles,
      heightOffsets,
      phaseOffsets,
    };
  }, [
    count,
    size,
    minRadius,
    maxRadius,
    minSpeed,
    maxSpeed,
    maxInclination,
    heightRange,
    sizeRange[0],
    sizeRange[1],
    opacityRange[0],
    opacityRange[1],
  ]);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: baseOpacity },
        uColor: { value: new THREE.Color(color) },
        uSize: { value: size * 120 },
      },
      vertexShader: `
        attribute float aSize;
        attribute float aOpacity;
        varying float vOpacity;
        uniform float uSize;

        void main() {
          vOpacity = aOpacity;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uSize * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vOpacity;
        uniform float uOpacity;
        uniform vec3 uColor;

        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          float alpha = 1.0 - smoothstep(0.15, 0.55, dist);
          alpha = pow(alpha, 1.6);
          alpha *= vOpacity * uOpacity;
          if (alpha < 0.01) discard;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
  }, [baseOpacity, color, size]);

  useEffect(() => {
    material.uniforms.uOpacity.value = baseOpacity;
  }, [baseOpacity, material]);

  useEffect(() => {
    material.uniforms.uColor.value.set(color);
  }, [color, material]);

  useEffect(() => {
    material.uniforms.uSize.value = size * 120;
  }, [size, material]);

  // Update opacity and orbital positions
  useFrame((state) => {
    if (!pointsRef.current || !materialRef.current) return;

    const time = state.clock.elapsedTime;
    materialRef.current.uniforms.uTime.value = time;
    const breathEntity = world.queryFirst(breathPhase);
    if (breathEntity && materialRef.current) {
      const phase = breathEntity.get(breathPhase)?.value ?? 0;
      materialRef.current.uniforms.uOpacity.value = baseOpacity + phase * breathingOpacity;
    }

    const { positions, radii, inclinations, speeds, baseAngles, heightOffsets, phaseOffsets } =
      particleData;
    const positionAttr = particleData.geometry.getAttribute('position') as THREE.BufferAttribute;

    for (let i = 0; i < count; i++) {
      const radiusBreath = 1 + Math.sin(time * 0.2 + phaseOffsets[i]) * 0.015;
      const radius = radii[i] * radiusBreath;
      const angle = baseAngles[i] + time * speeds[i];

      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const bob = Math.sin(time * 0.35 + phaseOffsets[i]) * 0.35;
      const y = heightOffsets[i] + bob;

      const cosTilt = Math.cos(inclinations[i]);
      const sinTilt = Math.sin(inclinations[i]);
      const zTilt = z * cosTilt - y * sinTilt;
      const yTilt = z * sinTilt + y * cosTilt;

      positions[i * 3] = x;
      positions[i * 3 + 1] = yTilt;
      positions[i * 3 + 2] = zTilt;
    }

    positionAttr.needsUpdate = true;
  });

  useEffect(() => {
    return () => {
      particleData.geometry.dispose();
      material.dispose();
    };
  }, [particleData.geometry, material]);

  return (
    <points ref={pointsRef} geometry={particleData.geometry} frustumCulled={false}>
      <primitive object={material} ref={materialRef} attach="material" />
    </points>
  );
});
