/**
 * DistantMotes - Tiny particles at extreme distance for scale reference
 *
 * Creates very small, slowly drifting particles at great distance,
 * establishing the vastness of the space. Our brain interprets these
 * as massive objects far away, creating a sense of epic scale.
 *
 * Inspired by:
 * - Dust motes visible in sunbeams
 * - Distant stars/particles in Journey
 * - Scale reference objects in game design
 *
 * Performance: Single Points geometry with 200 particles
 */

import { useFrame } from '@react-three/fiber';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

interface DistantMotesProps {
  /** Number of motes @default 150 */
  count?: number;
  /** Base opacity @default 0.25 */
  opacity?: number;
  /** Enable motes @default true */
  enabled?: boolean;
}

const motesVertexShader = `
  attribute float aSize;
  attribute float aDepth;
  attribute float aPhase;
  varying float vAlpha;
  varying float vDepth;
  uniform float uTime;

  void main() {
    vDepth = aDepth;

    // Pulsing size
    float pulse = sin(uTime * 0.5 + aPhase * 6.28) * 0.2 + 1.0;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

    // Size decreases with depth (atmospheric perspective)
    float depthSizeFade = 1.0 - aDepth * 0.4;
    gl_PointSize = aSize * pulse * depthSizeFade * (600.0 / -mvPosition.z);

    // Alpha decreases with depth
    vAlpha = (1.0 - aDepth * 0.5) * pulse * 0.5;

    gl_Position = projectionMatrix * mvPosition;
  }
`;

const motesFragmentShader = `
  varying float vAlpha;
  varying float vDepth;
  uniform float uOpacity;
  uniform float uTime;

  void main() {
    // Soft circular point
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);
    if (dist > 0.5) discard;

    float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
    alpha *= alpha; // Softer falloff

    // Color shifts cooler with depth (atmospheric perspective)
    vec3 nearColor = vec3(1.0, 0.98, 0.95);   // Warm white
    vec3 farColor = vec3(0.9, 0.92, 0.95);    // Cool white
    vec3 color = mix(nearColor, farColor, vDepth);

    // Breathing sync
    float breathPhase = mod(uTime, 19.0) / 19.0;
    float breathMod = 0.6 + sin(breathPhase * 6.28) * 0.4;

    alpha *= vAlpha * uOpacity * breathMod;

    gl_FragColor = vec4(color, alpha);
  }
`;

export const DistantMotes = memo(function DistantMotes({
  count = 150,
  opacity = 0.25,
  enabled = true,
}: DistantMotesProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const animationData = useRef<{
    initialPositions: Float32Array;
    velocities: Float32Array;
    phases: Float32Array;
  } | null>(null);

  const { geometry, material } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const depths = new Float32Array(count);
    const phases = new Float32Array(count);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // Distribute in a wide, deep volume far from camera
      // More particles at greater distances for depth layering
      const depthBias = Math.random() ** 0.5; // Bias toward far
      const z = -40 - depthBias * 100; // -40 to -140

      const spreadX = 30 + Math.abs(z) * 0.8; // Wider spread at distance
      const spreadY = 20 + Math.abs(z) * 0.4;

      positions[i * 3] = (Math.random() - 0.5) * spreadX;
      positions[i * 3 + 1] = (Math.random() - 0.5) * spreadY + 5;
      positions[i * 3 + 2] = z;

      // Normalize depth to 0-1 range
      depths[i] = (Math.abs(z) - 40) / 100;

      // Size varies, smaller at distance
      sizes[i] = (0.8 + Math.random() * 0.8) * (1 - depths[i] * 0.3);

      // Random phase for desync
      phases[i] = Math.random();

      // Very slow drift velocities
      velocities[i * 3] = (Math.random() - 0.5) * 0.05;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.03;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
    }

    animationData.current = {
      initialPositions: new Float32Array(positions),
      velocities,
      phases,
    };

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aDepth', new THREE.BufferAttribute(depths, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: opacity },
      },
      vertexShader: motesVertexShader,
      fragmentShader: motesFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return { geometry: geo, material: mat };
  }, [count, opacity]);

  useFrame((state) => {
    if (!materialRef.current || !animationData.current) return;

    const time = state.clock.elapsedTime;
    materialRef.current.uniforms.uTime.value = time;

    // Animate positions with very slow drift
    const positionAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const { initialPositions, velocities, phases } = animationData.current;

    for (let i = 0; i < count; i++) {
      const phase = phases[i];

      // Multi-frequency slow drift
      const driftX =
        Math.sin(time * 0.1 + phase * 10) * velocities[i * 3] * 5 +
        Math.sin(time * 0.05 + phase * 5) * 0.3;

      const driftY =
        Math.sin(time * 0.08 + phase * 8) * velocities[i * 3 + 1] * 4 +
        Math.cos(time * 0.04 + phase * 3) * 0.2;

      const driftZ = Math.sin(time * 0.06 + phase * 6) * velocities[i * 3 + 2] * 2;

      positionAttr.setXYZ(
        i,
        initialPositions[i * 3] + driftX,
        initialPositions[i * 3 + 1] + driftY,
        initialPositions[i * 3 + 2] + driftZ,
      );
    }

    positionAttr.needsUpdate = true;
  });

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

export default DistantMotes;
