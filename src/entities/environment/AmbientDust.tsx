/**
 * AmbientDust - Subtle floating dust particles for depth and atmosphere
 *
 * These are the "mastercraft" details users might not consciously notice,
 * but create a sense of living, breathing space.
 *
 * Features:
 * - Very subtle, nearly invisible floating particles
 * - Parallax movement (closer particles move faster)
 * - Gentle random drift with breathing synchronization
 * - Catch light occasionally for subtle sparkle
 *
 * Performance: Uses Points geometry with single draw call
 *
 * MIGRATED TO TSL (Three.js Shading Language) - January 2026
 */

import { useFrame } from '@react-three/fiber';
import { memo, useEffect, useMemo, useRef } from 'react';
import { AdditiveBlending, BufferAttribute, BufferGeometry, type Points } from 'three';
import {
  add,
  attribute,
  div,
  Fn,
  float,
  length,
  mix,
  mul,
  pointUV,
  positionView,
  pow,
  sin,
  smoothstep,
  sub,
  uniform,
  vec3,
  vec4,
} from 'three/tsl';
import { PointsNodeMaterial } from 'three/webgpu';

interface AmbientDustProps {
  /** Number of dust particles @default 80 */
  count?: number;
  /** Maximum opacity (very subtle) @default 0.15 */
  opacity?: number;
  /** Size of dust motes @default 0.015 */
  size?: number;
  /** Enable dust @default true */
  enabled?: boolean;
}

export const AmbientDust = memo(function AmbientDust({
  count = 80,
  opacity = 0.15,
  size = 0.015,
  enabled = true,
}: AmbientDustProps) {
  const pointsRef = useRef<Points>(null);
  const materialRef = useRef<PointsNodeMaterial>(null);

  // Store initial positions for drift calculation
  const initialPositions = useRef<Float32Array | null>(null);

  // Create geometry and attributes
  const { geometry, positions, velocities } = useMemo(() => {
    const geo = new BufferGeometry();
    const pos = new Float32Array(count * 3);
    const op = new Float32Array(count);
    const sp = new Float32Array(count);
    const vel = new Float32Array(count * 3); // Drift velocities

    for (let i = 0; i < count; i++) {
      // Distribute in a wide, shallow volume
      // More particles in the middle-ground depth
      const x = (Math.random() - 0.5) * 40;
      const y = (Math.random() - 0.5) * 25;
      const z = -10 - Math.random() * 40; // -10 to -50

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      // Random opacity (some barely visible, some slightly more visible)
      op[i] = 0.3 + Math.random() * 0.7;

      // Random sparkle phase
      sp[i] = Math.random();

      // Gentle drift velocities (mostly horizontal, slight vertical)
      vel[i * 3] = (Math.random() - 0.5) * 0.02; // X drift
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.01; // Y drift
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.005; // Z drift
    }

    geo.setAttribute('position', new BufferAttribute(pos, 3));
    geo.setAttribute('aOpacity', new BufferAttribute(op, 1));
    geo.setAttribute('aSparklePhase', new BufferAttribute(sp, 1));

    return {
      geometry: geo,
      positions: pos,
      velocities: vel,
    };
  }, [count]);

  // Store initial positions
  useEffect(() => {
    initialPositions.current = new Float32Array(positions);
  }, [positions]);

  // Create TSL material
  const material = useMemo(() => {
    const mat = new PointsNodeMaterial();
    mat.transparent = true;
    mat.depthWrite = false;
    mat.blending = AdditiveBlending;

    // Uniforms
    const timeUniform = uniform(0);
    const sizeUniform = uniform(size * 100);
    const baseOpacityUniform = uniform(opacity);

    // Store for external access
    mat.userData.time = timeUniform;
    mat.userData.size = sizeUniform;
    mat.userData.baseOpacity = baseOpacityUniform;

    // Custom attributes
    const aOpacity = attribute('aOpacity');
    const aSparklePhase = attribute('aSparklePhase');

    // Point size calculation (varies with distance)
    // gl_PointSize = uSize * (300.0 / -mvPosition.z)
    const pointSizeNode = Fn(() => {
      const mvZ = positionView.z;
      return mul(sizeUniform, div(300.0, float(mvZ).negate()));
    })();

    mat.sizeNode = pointSizeNode;

    // Color and alpha calculation
    const colorNode = Fn(() => {
      // Calculate sparkle in fragment for variation
      const sparkleRaw = add(
        mul(sin(add(mul(timeUniform, 2.0), mul(aSparklePhase, 6.28))), 0.5),
        0.5,
      );
      const sparkle = mul(pow(sparkleRaw, 8.0), 0.3); // Rare brief sparkle, max 30%

      // Soft circular particle using pointUV (gl_PointCoord equivalent)
      const center = sub(pointUV, 0.5);
      const dist = length(center);

      // Soft falloff
      const alphaFalloff = sub(1.0, smoothstep(0.0, 0.5, dist));
      const alphaBase = mul(mul(alphaFalloff, aOpacity), baseOpacityUniform);

      // Add sparkle to alpha
      const alpha = add(alphaBase, mul(sparkle, 0.5));

      // Warm dust color (slightly golden)
      const baseColor = vec3(1.0, 0.98, 0.94);

      // Sparkle makes it whiter
      const finalColor = mix(baseColor, vec3(1.0, 1.0, 1.0), sparkle);

      return vec4(finalColor, alpha);
    })();

    mat.colorNode = colorNode;

    return mat;
  }, [size, opacity]);

  // Animate dust particles
  useFrame((state) => {
    if (!pointsRef.current || !material.userData.time || !initialPositions.current) return;

    const time = state.clock.elapsedTime;

    // Update time uniform for sparkle
    material.userData.time.value = time;

    // Update positions with gentle drift
    const positionAttr = geometry.getAttribute('position') as BufferAttribute;

    for (let i = 0; i < count; i++) {
      const baseX = initialPositions.current[i * 3];
      const baseY = initialPositions.current[i * 3 + 1];
      const baseZ = initialPositions.current[i * 3 + 2];

      // Gentle sinusoidal drift based on particle's unique velocity
      const driftX =
        Math.sin(time * 0.3 + i * 0.1) * velocities[i * 3] * 20 + Math.sin(time * 0.1) * 0.5; // Global drift

      const driftY =
        Math.sin(time * 0.2 + i * 0.15) * velocities[i * 3 + 1] * 20 + Math.cos(time * 0.08) * 0.2;

      const driftZ = Math.sin(time * 0.15 + i * 0.2) * velocities[i * 3 + 2] * 10;

      positionAttr.setXYZ(i, baseX + driftX, baseY + driftY, baseZ + driftZ);
    }

    positionAttr.needsUpdate = true;
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  if (!enabled) return null;

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
      <primitive object={material} ref={materialRef} attach="material" />
    </points>
  );
});

export default AmbientDust;
