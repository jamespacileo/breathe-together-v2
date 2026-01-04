/**
 * GlowingOrbs - Floating ethereal light orbs (firefly effect)
 *
 * Creates soft glowing spheres that float gently through the scene,
 * like magical fireflies or floating lanterns.
 *
 * Features:
 * - Soft radial gradient glow effect
 * - Gentle floating motion with random paths
 * - Pulsing brightness synchronized with breathing
 * - Size variation for depth perception
 *
 * Performance: Uses Points geometry with custom shader, single draw call
 */

import { useFrame } from '@react-three/fiber';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

interface GlowingOrbsProps {
  /** Number of orbs @default 25 */
  count?: number;
  /** Maximum opacity @default 0.4 */
  opacity?: number;
  /** Size multiplier @default 1 */
  size?: number;
  /** Enable orbs @default true */
  enabled?: boolean;
}

// Shader for soft glowing orbs
const orbVertexShader = `
  attribute float aSize;
  attribute float aPhase;
  attribute vec3 aColor;
  varying float vPhase;
  varying vec3 vColor;
  uniform float uTime;
  uniform float uBaseSize;

  void main() {
    vPhase = aPhase;
    vColor = aColor;

    // Pulsing size based on phase
    float pulse = sin(uTime * 1.5 + aPhase * 6.28) * 0.3 + 1.0;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uBaseSize * pulse * (400.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const orbFragmentShader = `
  varying float vPhase;
  varying vec3 vColor;
  uniform float uOpacity;
  uniform float uTime;

  void main() {
    // Soft radial gradient
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);
    if (dist > 0.5) discard;

    // Core glow with soft falloff
    float glow = 1.0 - smoothstep(0.0, 0.5, dist);
    glow = pow(glow, 1.5); // Softer falloff

    // Subtle inner core (brighter center)
    float core = 1.0 - smoothstep(0.0, 0.15, dist);
    core = pow(core, 2.0);

    // Pulsing brightness
    float pulse = sin(uTime * 2.0 + vPhase * 6.28) * 0.3 + 0.7;

    // Breathing sync (19s cycle)
    float breathPhase = mod(uTime, 19.0) / 19.0;
    float breathMod = 0.6 + sin(breathPhase * 6.28) * 0.4;

    float alpha = (glow * 0.6 + core * 0.4) * pulse * breathMod * uOpacity;

    // Color with brighter core
    vec3 color = mix(vColor, vec3(1.0), core * 0.5);

    gl_FragColor = vec4(color, alpha);
  }
`;

// Soft pastel orb colors
const ORB_COLORS = [
  new THREE.Color('#ffd4e5'), // Soft pink
  new THREE.Color('#d4e5ff'), // Soft blue
  new THREE.Color('#e5ffd4'), // Soft green
  new THREE.Color('#fff4d4'), // Soft gold
  new THREE.Color('#e5d4ff'), // Soft purple
  new THREE.Color('#d4fff4'), // Soft cyan
  new THREE.Color('#ffe4d4'), // Soft peach
  new THREE.Color('#f4d4ff'), // Soft magenta
];

export const GlowingOrbs = memo(function GlowingOrbs({
  count = 25,
  opacity = 0.4,
  size = 1,
  enabled = true,
}: GlowingOrbsProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Store initial positions and velocities for animation
  const animationData = useRef<{
    initialPositions: Float32Array;
    velocities: Float32Array;
    phases: Float32Array;
  } | null>(null);

  // Create geometry and attributes
  const { geometry, material } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // Distribute orbs in a spherical volume around the scene
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 8 + Math.random() * 20; // 8 to 28 units from center

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta) * 0.5; // Flatten vertically
      const z = radius * Math.cos(phi) - 15; // Offset back

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Random sizes (smaller = further feeling)
      sizes[i] = 0.8 + Math.random() * 0.8;

      // Random phase for desync
      phases[i] = Math.random();

      // Random color from palette
      const color = ORB_COLORS[Math.floor(Math.random() * ORB_COLORS.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      // Gentle drift velocities
      velocities[i * 3] = (Math.random() - 0.5) * 0.3;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.2;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.15;
    }

    // Store for animation
    animationData.current = {
      initialPositions: new Float32Array(positions),
      velocities,
      phases,
    };

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: opacity },
        uBaseSize: { value: size * 25 },
      },
      vertexShader: orbVertexShader,
      fragmentShader: orbFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return { geometry: geo, material: mat };
  }, [count, opacity, size]);

  // Animate orbs
  useFrame((state) => {
    if (!pointsRef.current || !materialRef.current || !animationData.current) return;

    const time = state.clock.elapsedTime;
    materialRef.current.uniforms.uTime.value = time;

    // Update positions with gentle floating motion
    const positionAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const { initialPositions, velocities, phases } = animationData.current;

    for (let i = 0; i < count; i++) {
      const baseX = initialPositions[i * 3];
      const baseY = initialPositions[i * 3 + 1];
      const baseZ = initialPositions[i * 3 + 2];
      const phase = phases[i];

      // Multi-frequency floating motion
      const floatX =
        Math.sin(time * 0.3 + phase * 10) * velocities[i * 3] * 3 +
        Math.sin(time * 0.1 + phase * 5) * 0.5;

      const floatY =
        Math.sin(time * 0.25 + phase * 8) * velocities[i * 3 + 1] * 4 +
        Math.cos(time * 0.15 + phase * 3) * 0.3;

      const floatZ = Math.sin(time * 0.2 + phase * 6) * velocities[i * 3 + 2] * 2;

      positionAttr.setXYZ(i, baseX + floatX, baseY + floatY, baseZ + floatZ);
    }

    positionAttr.needsUpdate = true;
  });

  // Cleanup
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

export default GlowingOrbs;
