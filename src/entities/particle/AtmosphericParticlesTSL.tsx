/**
 * AtmosphericParticlesTSL - TSL Implementation
 *
 * Ambient cloud-like particles using WebGPU-compatible TSL nodes.
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  attribute,
  color,
  float,
  length,
  modelViewMatrix,
  mul,
  pointUV,
  pow,
  smoothstep,
  sub,
  uniform,
  vec4,
} from 'three/tsl';
import { PointsNodeMaterial } from 'three/webgpu';
import { RENDER_LAYERS } from '../../constants';
import { breathPhase } from '../breath/traits';

export interface AtmosphericParticlesProps {
  count?: number;
  size?: number;
  baseOpacity?: number;
  breathingOpacity?: number;
  color?: string;
  minRadius?: number;
  maxRadius?: number;
  minSpeed?: number;
  maxSpeed?: number;
  maxInclination?: number;
  heightRange?: number;
  sizeRange?: [number, number];
  opacityRange?: [number, number];
}

export const AtmosphericParticlesTSL = memo(function AtmosphericParticlesTSL({
  count = 100,
  size = 0.08,
  baseOpacity = 0.15,
  breathingOpacity = 0.2,
  color: colorHex = '#8c7b6c',
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
  const materialRef = useRef<PointsNodeMaterial>(null);
  const world = useWorld();

  // Set layers on mount
  useEffect(() => {
    if (pointsRef.current) {
      (pointsRef.current as THREE.Object3D).layers.set(RENDER_LAYERS.EFFECTS);
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
    sizeRange,
    opacityRange,
  ]);

  const material = useMemo(() => {
    // Uniforms
    const uOpacity = uniform(float(baseOpacity));
    const uSize = uniform(float(size * 120));
    const uColor = uniform(color(colorHex));

    // Attributes
    const aSize = attribute('aSize', 'float');
    const aOpacity = attribute('aOpacity', 'float');

    // ═══════════════════════════════════════════════════════════════
    // Vertex Stage Logic (Point Size)
    // GLSL: gl_PointSize = aSize * uSize * (300.0 / -mvPosition.z);
    // ═══════════════════════════════════════════════════════════════
    const positionLocal = attribute('position', 'vec3');
    const mvPosition = mul(modelViewMatrix, vec4(positionLocal, 1.0));
    // Calculate point size based on perspective
    // Note: In TSL PointsNodeMaterial, sizeNode drives the point size
    const pointSize = mul(
      mul(aSize, uSize),
      mul(float(300.0), pow(sub(float(0.0), mvPosition.z), float(-1.0))),
    );

    // ═══════════════════════════════════════════════════════════════
    // Fragment Stage Logic (Soft Circle)
    // GLSL:
    // vec2 center = gl_PointCoord - 0.5;
    // float dist = length(center);
    // float alpha = 1.0 - smoothstep(0.15, 0.55, dist);
    // alpha = pow(alpha, 1.6);
    // alpha *= vOpacity * uOpacity;
    // ═══════════════════════════════════════════════════════════════
    // Access point coordinates (0..1)
    // TSL: pointUV is available from three/tsl

    const center = sub(pointUV, float(0.5));
    const dist = length(center);
    const alphaBase = sub(float(1.0), smoothstep(float(0.15), float(0.55), dist));
    const alphaPow = pow(alphaBase, float(1.6));
    const finalAlpha = mul(mul(alphaPow, aOpacity), uOpacity);

    // Discard if too transparent
    // TSL doesn't have explicit discard yet in all contexts, but setting alpha to 0 works for transparency
    // We can use a conditional or just rely on transparency

    const mat = new PointsNodeMaterial();
    mat.colorNode = uColor;
    mat.opacityNode = finalAlpha;
    mat.sizeNode = pointSize;
    mat.transparent = true;
    mat.depthWrite = false;
    mat.blending = THREE.NormalBlending;

    // Store uniforms in userData for animation
    mat.userData = {
      uOpacity,
      uTime: uniform(float(0)), // Not used in shader but kept for consistency if needed
    };

    return mat;
  }, [baseOpacity, colorHex, size]);

  // Update uniforms
  useEffect(() => {
    if (materialRef.current?.userData?.uOpacity) {
      materialRef.current.userData.uOpacity.value = baseOpacity;
    }
  }, [baseOpacity]);

  // Animation Loop
  useFrame((state) => {
    if (!pointsRef.current || !materialRef.current) return;

    const time = state.clock.elapsedTime;

    // Breath sync
    const breathEntity = world.queryFirst(breathPhase);
    if (breathEntity && materialRef.current.userData.uOpacity) {
      const phase = breathEntity.get(breathPhase)?.value ?? 0;
      materialRef.current.userData.uOpacity.value = baseOpacity + phase * breathingOpacity;
    }

    // Update particles (CPU side physics, same as original)
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

  return (
    <points
      ref={pointsRef}
      geometry={particleData.geometry}
      material={material}
      frustumCulled={false}
    />
  );
});
