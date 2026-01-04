/**
 * CosmicDust - Ambient cosmic particles floating in space
 *
 * Features:
 * - Distributed particles across a spherical volume
 * - Gentle drifting animation
 * - Breathing-synchronized opacity/brightness
 * - Color variation (blue, purple, white dust)
 * - Efficient Points geometry (single draw call)
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { memo, useEffect, useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  type Points,
  ShaderMaterial,
} from 'three';
import { useViewport } from '../../hooks/useViewport';
import { breathPhase } from '../breath/traits';

const vertexShader = `
attribute float size;
attribute vec3 customColor;
attribute float phase;
uniform float time;
uniform float breathPhase;
varying vec3 vColor;
varying float vAlpha;

void main() {
  vColor = customColor;

  // Drift animation
  vec3 pos = position;
  float driftSpeed = 0.02;
  pos.x += sin(time * driftSpeed + phase * 6.28) * 0.5;
  pos.y += cos(time * driftSpeed * 0.7 + phase * 4.0) * 0.3;
  pos.z += sin(time * driftSpeed * 0.5 + phase * 5.0) * 0.4;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

  // Size with distance attenuation and breathing (reduced size)
  float sizeMultiplier = 0.6 + breathPhase * 0.2;
  gl_PointSize = size * sizeMultiplier * (200.0 / -mvPosition.z);

  // Alpha varies with breathing - much more subtle (0.1 to 0.25 range)
  float twinkle = 0.7 + 0.3 * sin(time * 2.0 + phase * 6.28);
  vAlpha = twinkle * (0.1 + breathPhase * 0.15);

  gl_Position = projectionMatrix * mvPosition;
}
`;

const fragmentShader = `
varying vec3 vColor;
varying float vAlpha;

void main() {
  // Soft circular particle
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);
  float alpha = smoothstep(0.5, 0.1, dist) * vAlpha;

  if (alpha < 0.01) discard;

  gl_FragColor = vec4(vColor, alpha);
}
`;

interface CosmicDustProps {
  /** Number of dust particles @default 200 */
  count?: number;
  /** Sphere radius for distribution @default 60 */
  radius?: number;
  /** Minimum inner radius (avoid center) @default 15 */
  innerRadius?: number;
  /** Particle size @default 0.8 */
  size?: number;
  /** Enable breathing sync @default true */
  breathingSync?: boolean;
}

function CosmicDustComponent({
  count = 200,
  radius = 60,
  innerRadius = 15,
  size = 0.8,
  breathingSync = true,
}: CosmicDustProps) {
  const world = useWorld();
  const pointsRef = useRef<Points>(null);
  const { isMobile } = useViewport();

  // Adjust count for mobile
  const actualCount = isMobile ? Math.floor(count * 0.5) : count;

  // Create geometry with positions, colors, sizes, and phases
  const { geometry, material } = useMemo(() => {
    const positions = new Float32Array(actualCount * 3);
    const colors = new Float32Array(actualCount * 3);
    const sizes = new Float32Array(actualCount);
    const phases = new Float32Array(actualCount);

    // Dust color palette - Kurzgesagt cosmic dust colors
    // Using palette: cosmicDust.blue (#7c4dff), cosmicDust.purple (#b388ff),
    // cosmicDust.white (#e8e8ff), cosmicDust.gold (#ffe082)
    const colorPalette = [
      new Color('#7c4dff'), // Kurzgesagt purple-blue
      new Color('#b388ff'), // Kurzgesagt light purple
      new Color('#e8e8ff'), // Kurzgesagt blue-white
      new Color('#ffe082'), // Kurzgesagt soft gold
      new Color('#9b8bff'), // Brighter purple (linesBright)
      new Color('#ffb300'), // Golden amber accent
    ];

    for (let i = 0; i < actualCount; i++) {
      // Random spherical distribution with inner radius exclusion
      const phi = Math.random() * Math.PI * 2;
      const cosTheta = Math.random() * 2 - 1;
      const sinTheta = Math.sqrt(1 - cosTheta * cosTheta);

      // Random radius between inner and outer
      const r = innerRadius + Math.random() * (radius - innerRadius);

      positions[i * 3] = r * sinTheta * Math.cos(phi);
      positions[i * 3 + 1] = r * sinTheta * Math.sin(phi);
      positions[i * 3 + 2] = r * cosTheta;

      // Random color from palette
      const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      // Random size variation
      sizes[i] = size * (0.5 + Math.random() * 1.0);

      // Random phase for animation offset
      phases[i] = Math.random();
    }

    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(positions, 3));
    geo.setAttribute('customColor', new BufferAttribute(colors, 3));
    geo.setAttribute('size', new BufferAttribute(sizes, 1));
    geo.setAttribute('phase', new BufferAttribute(phases, 1));

    const mat = new ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        breathPhase: { value: 0.5 },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
    });

    return { geometry: geo, material: mat };
  }, [actualCount, radius, innerRadius, size]);

  // Animation loop
  useFrame((state) => {
    if (!material) return;

    material.uniforms.time.value = state.clock.elapsedTime;

    // Get breath phase
    let currentBreathPhase = 0.5;
    if (breathingSync) {
      try {
        const breathEntity = world.queryFirst(breathPhase);
        if (breathEntity) {
          currentBreathPhase = breathEntity.get(breathPhase)?.value ?? 0.5;
        }
      } catch (_e) {
        // ECS errors during unmount
      }
    }

    material.uniforms.breathPhase.value = currentBreathPhase;
  });

  // Cleanup
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  return <points ref={pointsRef} geometry={geometry} material={material} />;
}

export const CosmicDust = memo(CosmicDustComponent);
export default CosmicDust;
