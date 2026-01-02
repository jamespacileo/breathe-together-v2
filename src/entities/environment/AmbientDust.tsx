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
 */

import { useFrame } from '@react-three/fiber';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

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

// Custom shader for dust with varying opacity and subtle sparkle
const dustVertexShader = `
  attribute float aOpacity;
  attribute float aSparklePhase;
  varying float vOpacity;
  varying float vSparkle;
  uniform float uTime;
  uniform float uSize;

  void main() {
    vOpacity = aOpacity;

    // Subtle sparkle effect - some particles catch light
    float sparkle = sin(uTime * 2.0 + aSparklePhase * 6.28) * 0.5 + 0.5;
    sparkle = pow(sparkle, 8.0); // Make sparkle rare and brief
    vSparkle = sparkle * 0.3; // Max 30% extra brightness

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uSize * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const dustFragmentShader = `
  varying float vOpacity;
  varying float vSparkle;
  uniform float uBaseOpacity;

  void main() {
    // Soft circular particle
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);
    if (dist > 0.5) discard;

    // Soft falloff
    float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
    alpha *= vOpacity * uBaseOpacity;

    // Add sparkle
    alpha += vSparkle * 0.5;

    // Warm dust color (slightly golden)
    vec3 color = vec3(1.0, 0.98, 0.94);

    // Sparkle makes it whiter
    color = mix(color, vec3(1.0), vSparkle);

    gl_FragColor = vec4(color, alpha);
  }
`;

export const AmbientDust = memo(function AmbientDust({
  count = 80,
  opacity = 0.15,
  size = 0.015,
  enabled = true,
}: AmbientDustProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Store initial positions for drift calculation
  const initialPositions = useRef<Float32Array | null>(null);

  // Create geometry and attributes
  const { geometry, positions, velocities } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
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

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aOpacity', new THREE.BufferAttribute(op, 1));
    geo.setAttribute('aSparklePhase', new THREE.BufferAttribute(sp, 1));

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
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: size * 100 },
        uBaseOpacity: { value: opacity },
      },
      vertexShader: dustVertexShader,
      fragmentShader: dustFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, [size, opacity]);

  // Animate dust particles
  useFrame((state) => {
    if (!pointsRef.current || !materialRef.current || !initialPositions.current) return;

    const time = state.clock.elapsedTime;

    // Update time uniform for sparkle
    materialRef.current.uniforms.uTime.value = time;

    // Update positions with gentle drift
    const positionAttr = geometry.getAttribute('position') as THREE.BufferAttribute;

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
