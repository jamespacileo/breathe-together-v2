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
 * MIGRATED TO TSL (Three.js Shading Language) - January 2026
 *
 * Performance: Uses Points geometry with single draw call
 */

import { useFrame } from '@react-three/fiber';
import { memo, useEffect, useMemo, useRef } from 'react';
import { AdditiveBlending, BufferAttribute, BufferGeometry, type Points } from 'three';
import {
  add,
  attribute,
  Discard,
  div,
  Fn,
  modelViewMatrix,
  mul,
  pointUV,
  positionGeometry,
  pow,
  sin,
  step,
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

/**
 * Creates a TSL-based dust particle material
 */
function createDustMaterial(baseSize: number, baseOpacity: number) {
  const material = new PointsNodeMaterial();
  material.transparent = true;
  material.depthWrite = false;
  material.blending = AdditiveBlending;

  // Uniforms
  const timeUniform = uniform(0);
  const sizeUniform = uniform(baseSize * 100);
  const opacityUniform = uniform(baseOpacity);

  // Store uniforms for external access
  material.userData.time = timeUniform;
  material.userData.size = sizeUniform;
  material.userData.opacity = opacityUniform;

  // Get custom attributes
  const aOpacity = attribute('aOpacity');
  const aSparklePhase = attribute('aSparklePhase');

  // Vertex shader: point size based on distance
  material.positionNode = Fn(() => {
    return positionGeometry;
  })();

  // Point size calculation
  const sizeNode = Fn(() => {
    // Calculate view position for distance-based sizing
    const mvPosition = modelViewMatrix.mul(vec4(positionGeometry, 1.0));
    const dist = mvPosition.z.negate();
    return mul(sizeUniform, div(300.0, dist));
  })();

  material.sizeNode = sizeNode;

  // Fragment shader: soft circular particle with sparkle
  const colorNode = Fn(() => {
    // Circular particle using pointUV (gl_PointCoord equivalent)
    // pointUV is 0-1 across the point sprite
    const coord = sub(mul(pointUV, 2.0), 1.0); // Convert to -1 to 1
    const distSq = add(mul(coord.x, coord.x), mul(coord.y, coord.y));

    // Discard pixels outside the circle
    Discard(step(1.0, distSq));

    // Soft circular falloff (1 at center, 0 at edge)
    const circularFalloff = sub(1.0, pow(distSq, 0.5));

    const vOpacity = aOpacity;

    // Calculate sparkle effect
    const sparkleRaw = add(
      mul(sin(add(mul(timeUniform, 2.0), mul(aSparklePhase, 6.28))), 0.5),
      0.5,
    );
    const sparkle = mul(pow(sparkleRaw, 8.0), 0.3); // Make sparkle rare and brief

    // Base alpha from attribute and uniform, with circular falloff
    const baseAlpha = mul(mul(vOpacity, opacityUniform), circularFalloff);

    // Add sparkle to alpha
    const alpha = add(baseAlpha, mul(sparkle, 0.5));

    // Warm dust color (slightly golden)
    const baseColor = vec3(1.0, 0.98, 0.94);

    // Sparkle makes it whiter
    const sparkleColor = add(baseColor, mul(sparkle, 0.06));

    return vec4(sparkleColor, alpha);
  })();

  material.colorNode = colorNode;

  return material;
}

export const AmbientDust = memo(function AmbientDust({
  count = 80,
  opacity = 0.15,
  size = 0.015,
  enabled = true,
}: AmbientDustProps) {
  const pointsRef = useRef<Points>(null);

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

  // Create material
  const material = useMemo(() => {
    return createDustMaterial(size, opacity);
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
      <primitive object={material} attach="material" />
    </points>
  );
});

export default AmbientDust;
