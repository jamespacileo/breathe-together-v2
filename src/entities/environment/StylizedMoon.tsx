/**
 * StylizedMoon - Monument Valley inspired celestial moon.
 *
 * Renders a stylized moon with soft silver glow and subtle
 * breathing synchronization. Position tracks the real moon's location
 * based on UTC time, and shows accurate moon phase.
 *
 * Features:
 * - Real astronomical positioning via RA/Dec calculations
 * - Accurate moon phase display
 * - Multi-layered soft glow
 * - Breathing-synchronized pulsing
 * - Soft, dreamy aesthetic matching the meditation theme
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

import {
  calculateGMST,
  calculateMoonPosition,
  celestialToCartesian,
  getMoonPhase,
} from '../../lib/astronomy';
import { breathPhase } from '../breath/traits';

interface StylizedMoonProps {
  /** Enable moon rendering @default true */
  enabled?: boolean;
  /** Distance from center @default 24 */
  radius?: number;
  /** Moon disc size @default 4 */
  size?: number;
  /** Core color - soft white @default '#f5f5f5' */
  coreColor?: string;
  /** Glow color - silver blue @default '#c8d4e8' */
  glowColor?: string;
  /** Shadow color for dark side @default '#1a1a2e' */
  shadowColor?: string;
  /** Enable breathing sync @default true */
  breathSync?: boolean;
  /** Overall intensity @default 1.0 */
  intensity?: number;
  /** Show debug gizmo @default false */
  showGizmo?: boolean;
}

/**
 * Custom shader for moon with phase
 */
const moonVertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;

  void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const moonFragmentShader = `
  uniform float time;
  uniform float breathPhase;
  uniform float moonPhase;
  uniform vec3 coreColor;
  uniform vec3 glowColor;
  uniform vec3 shadowColor;
  uniform float intensity;

  varying vec2 vUv;

  void main() {
    vec2 center = vUv - vec2(0.5);
    float dist = length(center);
    float angle = atan(center.y, center.x);

    // Breathing pulse - subtle expansion/contraction
    float breathPulse = 1.0 + breathPhase * 0.05;

    // Moon disc - crisp bright center
    float disc = smoothstep(0.38 * breathPulse, 0.35, dist);

    // Calculate phase illumination
    // moonPhase: 0 = new moon, 0.5 = full moon, 1 = new moon again
    // We need to show which side is lit
    float phaseAngle = moonPhase * 2.0 * 3.14159;

    // Simulate terminator line based on phase
    // At new moon (0), the moon is dark
    // At full moon (0.5), the moon is fully lit
    // At first quarter (0.25), right half is lit
    // At last quarter (0.75), left half is lit
    float illumination = 1.0;

    if (moonPhase < 0.5) {
      // Waxing: right side lit, terminator moves left
      float terminatorX = cos(phaseAngle);
      illumination = smoothstep(-0.1, 0.1, center.x - terminatorX * 0.35);
    } else {
      // Waning: left side lit, terminator moves right
      float terminatorX = cos(phaseAngle);
      illumination = smoothstep(-0.1, 0.1, terminatorX * 0.35 - center.x);
    }

    // Soft outer glow
    float outerGlow = smoothstep(0.5, 0.25, dist) * 0.4;

    // Very subtle surface texture
    float texture = sin(center.x * 30.0 + center.y * 25.0) * 0.02 +
                   sin(center.x * 15.0 - center.y * 20.0) * 0.02;

    // Combine lit and shadow sides
    vec3 litColor = coreColor * (1.0 + texture);
    vec3 darkColor = shadowColor;
    vec3 discColor = mix(darkColor, litColor, illumination);

    // Combine layers with colors
    vec3 color = discColor * disc;
    color += glowColor * outerGlow * (0.3 + illumination * 0.7);

    // Final alpha - soft circular falloff
    float alpha = disc + outerGlow * 0.5;
    alpha = clamp(alpha * intensity, 0.0, 1.0);

    // Subtle shimmer
    float shimmer = sin(time * 2.0 + angle * 4.0) * 0.03 + 0.97;
    alpha *= shimmer;

    gl_FragColor = vec4(color, alpha * smoothstep(0.5, 0.35, dist));
  }
`;

export const StylizedMoon = memo(function StylizedMoon({
  enabled = true,
  radius = 24,
  size = 4,
  coreColor = '#f5f5f5',
  glowColor = '#c8d4e8',
  shadowColor = '#1a1a2e',
  breathSync = true,
  intensity = 1.0,
  showGizmo = false,
}: StylizedMoonProps) {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const world = useWorld();

  // Calculate initial moon position and phase
  const { moonPosition, initialPhase } = useMemo(() => {
    const now = new Date();
    const gmst = calculateGMST(now);
    const moonData = calculateMoonPosition(now);
    const [x, y, z] = celestialToCartesian(moonData.ra, moonData.dec, radius, gmst);
    const phase = getMoonPhase(now);
    return {
      moonPosition: new THREE.Vector3(x, y, z),
      initialPhase: phase,
    };
  }, [radius]);

  // Shader material with uniforms
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        breathPhase: { value: 0.5 },
        moonPhase: { value: initialPhase },
        coreColor: { value: new THREE.Color(coreColor) },
        glowColor: { value: new THREE.Color(glowColor) },
        shadowColor: { value: new THREE.Color(shadowColor) },
        intensity: { value: intensity },
      },
      vertexShader: moonVertexShader,
      fragmentShader: moonFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
  }, [coreColor, glowColor, shadowColor, intensity, initialPhase]);

  // Get breath phase value
  const [_currentBreathPhase, setCurrentBreathPhase] = useState(0.5);

  // Track last position update time to throttle astronomical calculations
  const lastPositionUpdateRef = useRef(0);
  const UPDATE_INTERVAL = 60; // Update position every 60 seconds (moon moves slowly)

  // Animate moon
  useFrame((state) => {
    if (!enabled || !materialRef.current) return;

    // Update time
    materialRef.current.uniforms.time.value = state.clock.elapsedTime;

    // Update moon position periodically
    const currentTime = state.clock.elapsedTime;
    if (currentTime - lastPositionUpdateRef.current > UPDATE_INTERVAL) {
      lastPositionUpdateRef.current = currentTime;

      // Recalculate moon position based on current time
      const now = new Date();
      const gmst = calculateGMST(now);
      const moonData = calculateMoonPosition(now);
      const [x, y, z] = celestialToCartesian(moonData.ra, moonData.dec, radius, gmst);

      // Update group position
      if (groupRef.current) {
        groupRef.current.position.set(x, y, z);
      }

      // Update moon phase
      const phase = getMoonPhase(now);
      materialRef.current.uniforms.moonPhase.value = phase;
    }

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

    // Make moon always face camera (billboard effect)
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
    <group ref={groupRef} position={moonPosition}>
      {/* Main moon disc with shader */}
      <mesh>
        <planeGeometry args={[size * 2, size * 2]} />
        <primitive object={material} attach="material" />
      </mesh>

      {/* Outer soft glow halo */}
      <mesh position={[0, 0, -0.1]}>
        <circleGeometry args={[size * 1.8, 32]} />
        <meshBasicMaterial
          color={glowColor}
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Very soft ambient haze */}
      <mesh position={[0, 0, -0.2]}>
        <circleGeometry args={[size * 3, 32]} />
        <meshBasicMaterial
          color="#e8e8f0"
          transparent
          opacity={0.05}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Debug gizmo - wireframe sphere and axes */}
      {showGizmo && (
        <>
          {/* Wireframe sphere showing moon bounds */}
          <mesh>
            <sphereGeometry args={[size, 16, 16]} />
            <meshBasicMaterial color="#8888ff" wireframe transparent opacity={0.6} />
          </mesh>

          {/* Axes helper for orientation */}
          <axesHelper args={[size * 1.5]} />

          {/* Distance indicator ring */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[size * 0.9, size * 1.1, 32]} />
            <meshBasicMaterial color="#8888ff" transparent opacity={0.3} side={THREE.DoubleSide} />
          </mesh>
        </>
      )}
    </group>
  );
});
