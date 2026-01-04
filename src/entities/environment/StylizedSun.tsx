/**
 * StylizedSun - Monument Valley inspired celestial sun.
 *
 * Renders a stylized sun with warm gradients, soft rays, and subtle
 * breathing synchronization. Position tracks the real sun's location
 * based on UTC time.
 *
 * Features:
 * - Real astronomical positioning via RA/Dec calculations
 * - Multi-layered glow with warm gradient
 * - Animated corona/ray effects
 * - Breathing-synchronized pulsing
 * - Soft, dreamy aesthetic matching the meditation theme
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

import { calculateGMST, calculateSunPosition, celestialToCartesian } from '../../lib/astronomy';
import { breathPhase } from '../breath/traits';

interface StylizedSunProps {
  /** Enable sun rendering @default true */
  enabled?: boolean;
  /** Distance from center @default 90 */
  radius?: number;
  /** Sun disc size @default 8 */
  size?: number;
  /** Core color - warm golden @default '#fff8e7' */
  coreColor?: string;
  /** Corona color - warm orange @default '#ffcc80' */
  coronaColor?: string;
  /** Outer glow color @default '#ff9966' */
  glowColor?: string;
  /** Enable breathing sync @default true */
  breathSync?: boolean;
  /** Ray count @default 12 */
  rayCount?: number;
  /** Overall intensity @default 1 */
  intensity?: number;
}

/**
 * Custom shader for multi-layered sun glow
 */
const sunVertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;

  void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const sunFragmentShader = `
  uniform float time;
  uniform float breathPhase;
  uniform vec3 coreColor;
  uniform vec3 coronaColor;
  uniform vec3 glowColor;
  uniform float intensity;

  varying vec2 vUv;

  // Soft noise for corona variation
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    vec2 center = vUv - vec2(0.5);
    float dist = length(center);
    float angle = atan(center.y, center.x);

    // Breathing pulse - subtle expansion/contraction
    float breathPulse = 1.0 + breathPhase * 0.08;

    // Core disc - sharp bright center
    float core = smoothstep(0.15 * breathPulse, 0.05, dist);

    // Inner corona - soft warm glow
    float corona = smoothstep(0.35 * breathPulse, 0.1, dist) * 0.7;

    // Animated corona texture
    float coronaNoise = noise(vec2(angle * 3.0 + time * 0.5, dist * 10.0 - time * 0.3));
    corona *= (0.7 + coronaNoise * 0.3);

    // Outer glow - very soft falloff
    float outerGlow = smoothstep(0.5, 0.15, dist) * 0.4;

    // Ray effect - subtle radial streaks
    float rayAngle = mod(angle + time * 0.1, 3.14159 / 6.0);
    float rays = smoothstep(0.1, 0.0, abs(rayAngle - 3.14159 / 12.0)) * 0.15;
    rays *= smoothstep(0.5, 0.2, dist) * smoothstep(0.1, 0.2, dist);

    // Combine layers with colors
    vec3 color = coreColor * core;
    color += coronaColor * corona;
    color += glowColor * outerGlow;
    color += vec3(1.0, 0.95, 0.85) * rays;

    // Final alpha - soft circular falloff
    float alpha = core + corona * 0.8 + outerGlow * 0.5 + rays;
    alpha = clamp(alpha * intensity, 0.0, 1.0);

    // Subtle edge shimmer
    float shimmer = sin(time * 3.0 + angle * 8.0) * 0.05 + 0.95;
    alpha *= shimmer;

    gl_FragColor = vec4(color, alpha * smoothstep(0.5, 0.3, dist));
  }
`;

/**
 * Sun rays component - decorative radial lines
 */
function SunRays({
  count,
  size,
  color,
  breathPhase,
}: {
  count: number;
  size: number;
  color: string;
  breathPhase: number;
}) {
  const raysRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (raysRef.current) {
      raysRef.current.rotation.z = state.clock.elapsedTime * 0.05;
    }
  });

  const rays = useMemo(() => {
    const rayData: { id: string; angle: number; length: number; width: number }[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      // Alternating long/short rays
      const length = i % 2 === 0 ? size * 1.8 : size * 1.2;
      const width = i % 2 === 0 ? 0.15 : 0.08;
      rayData.push({ id: `ray-${i}`, angle, length, width });
    }
    return rayData;
  }, [count, size]);

  const rayColor = useMemo(() => new THREE.Color(color), [color]);

  return (
    <group ref={raysRef}>
      {rays.map((ray) => {
        const pulseLength = ray.length * (1 + breathPhase * 0.1);
        return (
          <mesh
            key={ray.id}
            position={[Math.cos(ray.angle) * size * 0.6, Math.sin(ray.angle) * size * 0.6, -0.1]}
            rotation={[0, 0, ray.angle]}
          >
            <planeGeometry args={[pulseLength, ray.width]} />
            <meshBasicMaterial
              color={rayColor}
              transparent
              opacity={0.15}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}

export const StylizedSun = memo(function StylizedSun({
  enabled = true,
  radius = 90,
  size = 8,
  coreColor = '#fff8e7',
  coronaColor = '#ffcc80',
  glowColor = '#ff9966',
  breathSync = true,
  rayCount = 12,
  intensity = 1,
}: StylizedSunProps) {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const world = useWorld();

  // Calculate sun position based on real astronomical data
  const sunPosition = useMemo(() => {
    const now = new Date();
    const gmst = calculateGMST(now);
    const sunData = calculateSunPosition(now);
    const [x, y, z] = celestialToCartesian(sunData.ra, sunData.dec, radius, gmst);
    return new THREE.Vector3(x, y, z);
  }, [radius]);

  // Shader material with uniforms
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        breathPhase: { value: 0.5 },
        coreColor: { value: new THREE.Color(coreColor) },
        coronaColor: { value: new THREE.Color(coronaColor) },
        glowColor: { value: new THREE.Color(glowColor) },
        intensity: { value: intensity },
      },
      vertexShader: sunVertexShader,
      fragmentShader: sunFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
  }, [coreColor, coronaColor, glowColor, intensity]);

  // Get breath phase value
  const [currentBreathPhase, setCurrentBreathPhase] = useState(0.5);

  // Animate sun
  useFrame((state) => {
    if (!enabled || !materialRef.current) return;

    // Update time
    materialRef.current.uniforms.time.value = state.clock.elapsedTime;

    // Update breath phase from ECS
    if (breathSync) {
      try {
        const breathEntity = world.queryFirst(breathPhase);
        if (breathEntity) {
          const phase = breathEntity.get(breathPhase)?.value ?? 0.5;
          materialRef.current.uniforms.breathPhase.value = phase;
          setCurrentBreathPhase(phase);
        }
      } catch (_e) {
        // Silently catch ECS errors during unmount/remount in Triplex
      }
    }

    // Make sun always face camera (billboard effect)
    if (groupRef.current) {
      groupRef.current.lookAt(state.camera.position);
    }
  });

  // Cleanup
  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  // Store material ref
  useEffect(() => {
    materialRef.current = material;
  }, [material]);

  if (!enabled) return null;

  return (
    <group ref={groupRef} position={sunPosition}>
      {/* Main sun disc with shader */}
      <mesh>
        <planeGeometry args={[size * 2, size * 2]} />
        <primitive object={material} attach="material" />
      </mesh>

      {/* Decorative rays */}
      <SunRays count={rayCount} size={size} color={coronaColor} breathPhase={currentBreathPhase} />

      {/* Outer soft glow halo */}
      <mesh position={[0, 0, -0.2]}>
        <circleGeometry args={[size * 2.5, 32]} />
        <meshBasicMaterial
          color={glowColor}
          transparent
          opacity={0.08}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Very soft ambient haze */}
      <mesh position={[0, 0, -0.3]}>
        <circleGeometry args={[size * 4, 32]} />
        <meshBasicMaterial
          color="#fff5eb"
          transparent
          opacity={0.03}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
});
