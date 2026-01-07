/**
 * StylizedSunTSL - TSL implementation of Monument Valley inspired celestial sun
 *
 * Converts the multi-layered GLSL sun shader to TSL nodes for WebGL2/WebGPU compatibility.
 *
 * Features:
 * - Core disc with breathing pulse
 * - Animated corona with procedural noise
 * - Soft outer glow
 * - Radial ray streaks (12 segments)
 * - Edge shimmer animation
 * - Breathing-synchronized expansion
 *
 * This is the most complex shader in the migration, combining:
 * - Polar coordinate conversion (new coordinates.ts utility)
 * - Value noise (existing noise.ts utility)
 * - Multiple smoothstep layers
 * - Breathing modulation (existing breathing.ts utility)
 * - Additive blending for atmospheric glow
 *
 * Dependencies:
 * - createPolarCoordinatesNode from lib/tsl/coordinates.ts (NEW)
 * - createRadialRepeatNode from lib/tsl/coordinates.ts (NEW)
 * - createValueNoiseNode from lib/tsl/noise.ts (existing)
 * - createBreathingPulseNode from lib/tsl/breathing.ts (existing)
 */

import { useFrame } from '@react-three/fiber';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  abs,
  add,
  clamp,
  color,
  float,
  mul,
  sin,
  smoothstep,
  sub,
  uniform,
  uv,
  vec2,
  vec3,
} from 'three/tsl';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import { getMaterialUserData, setMaterialUserData } from '../../lib/three/materialUserData';
// Shared TSL utilities
import { createBreathingPulseNode } from '../../lib/tsl/breathing';
import { createPolarCoordinatesNode, createRadialRepeatNode } from '../../lib/tsl/coordinates';
import { createValueNoiseNode } from '../../lib/tsl/noise';

interface StylizedSunMaterialTSLProps {
  /** Core color - warm golden @default '#ffcd4a' */
  coreColor?: string;
  /** Corona color - warm peach @default '#ffe680' */
  coronaColor?: string;
  /** Outer glow color - soft orange @default '#ffd966' */
  glowColor?: string;
  /** Overall intensity @default 0.7 */
  intensity?: number;
  /** Current breath phase (0-1) */
  breathPhase?: number;
}

/**
 * StylizedSunMaterialTSL - TSL node-based material for the sun disc
 *
 * GLSL equivalent (from StylizedSun.tsx lines 89-130):
 * ```glsl
 * vec2 center = vUv - vec2(0.5);
 * float dist = length(center);
 * float angle = atan(center.y, center.x);
 * float breathPulse = 1.0 + breathPhase * 0.08;
 *
 * // Core disc
 * float core = smoothstep(0.15 * breathPulse, 0.05, dist);
 *
 * // Corona with noise
 * float corona = smoothstep(0.35 * breathPulse, 0.1, dist) * 0.7;
 * float coronaNoise = noise(vec2(angle * 3.0 + time * 0.5, dist * 10.0 - time * 0.3));
 * corona *= (0.7 + coronaNoise * 0.3);
 *
 * // Outer glow
 * float outerGlow = smoothstep(0.5, 0.15, dist) * 0.4;
 *
 * // Radial rays
 * float rayAngle = mod(angle + time * 0.1, PI / 6.0);
 * float rays = smoothstep(0.1, 0.0, abs(rayAngle - PI / 12.0)) * 0.15;
 * rays *= smoothstep(0.5, 0.2, dist) * smoothstep(0.1, 0.2, dist);
 *
 * // Combine layers
 * vec3 color = coreColor * core + coronaColor * corona + glowColor * outerGlow + vec3(1.0, 0.95, 0.85) * rays;
 * float alpha = core + corona * 0.8 + outerGlow * 0.5 + rays;
 *
 * // Edge shimmer
 * float shimmer = sin(time * 3.0 + angle * 8.0) * 0.05 + 0.95;
 * alpha *= shimmer * smoothstep(0.5, 0.3, dist);
 * ```
 */
export const StylizedSunMaterialTSL = memo(function StylizedSunMaterialTSL({
  coreColor = '#ffcd4a',
  coronaColor = '#ffe680',
  glowColor = '#ffd966',
  intensity = 0.5,
  breathPhase = 0.5,
}: StylizedSunMaterialTSLProps) {
  const materialRef = useRef<MeshBasicNodeMaterial>(null);

  // Create TSL material
  const material = useMemo(() => {
    // TSL Uniforms
    const uTime = uniform(float(0));
    const uBreathPhase = uniform(float(breathPhase));
    const uIntensity = uniform(float(intensity));

    // Get UV coordinates
    const uvCoord = uv();

    // ═══════════════════════════════════════════════════════════════
    // Convert to polar coordinates (r, θ)
    // GLSL: vec2 center = vUv - vec2(0.5); float dist = length(center); float angle = atan(center.y, center.x);
    // TSL: Use new coordinate utility
    // ═══════════════════════════════════════════════════════════════
    const { r: dist, theta: angle } = createPolarCoordinatesNode(uvCoord);

    // ═══════════════════════════════════════════════════════════════
    // Breathing pulse - subtle expansion/contraction
    // GLSL: float breathPulse = 1.0 + breathPhase * 0.08;
    // TSL: Use shared breathing utility
    // ═══════════════════════════════════════════════════════════════
    const breathPulse = createBreathingPulseNode(uBreathPhase, 0.08);

    // ═══════════════════════════════════════════════════════════════
    // Layer 1: Core disc - sharp bright center
    // GLSL: float core = smoothstep(0.15 * breathPulse, 0.05, dist);
    // ═══════════════════════════════════════════════════════════════
    const core = smoothstep(mul(float(0.15), breathPulse), float(0.05), dist);

    // ═══════════════════════════════════════════════════════════════
    // Layer 2: Inner corona - soft warm glow with animated noise
    // GLSL: float corona = smoothstep(0.35 * breathPulse, 0.1, dist) * 0.7;
    //       float coronaNoise = noise(vec2(angle * 3.0 + time * 0.5, dist * 10.0 - time * 0.3));
    //       corona *= (0.7 + coronaNoise * 0.3);
    // ═══════════════════════════════════════════════════════════════
    const coronaBase = mul(smoothstep(mul(float(0.35), breathPulse), float(0.1), dist), float(0.7));

    // Animated corona texture using value noise
    const coronaNoiseUV = vec2(
      add(mul(angle, float(3.0)), mul(uTime, float(0.5))), // Rotate with time
      sub(mul(dist, float(10.0)), mul(uTime, float(0.3))), // Drift inward
    );
    const coronaNoise = createValueNoiseNode(coronaNoiseUV);

    // Modulate corona with noise (0.7 to 1.0 range)
    const coronaTextured = mul(coronaBase, add(float(0.7), mul(coronaNoise, float(0.3))));

    // ═══════════════════════════════════════════════════════════════
    // Layer 3: Outer glow - very soft falloff
    // GLSL: float outerGlow = smoothstep(0.5, 0.15, dist) * 0.4;
    // ═══════════════════════════════════════════════════════════════
    const outerGlow = mul(smoothstep(float(0.5), float(0.15), dist), float(0.4));

    // ═══════════════════════════════════════════════════════════════
    // Layer 4: Radial ray streaks (12 segments)
    // GLSL: float rayAngle = mod(angle + time * 0.1, PI / 6.0);
    //       float rays = smoothstep(0.1, 0.0, abs(rayAngle - PI / 12.0)) * 0.15;
    //       rays *= smoothstep(0.5, 0.2, dist) * smoothstep(0.1, 0.2, dist);
    // TSL: Use new radial repeat utility
    // ═══════════════════════════════════════════════════════════════
    const rotatedAngle = add(angle, mul(uTime, float(0.1))); // Rotate rays slowly
    const rayAngle = createRadialRepeatNode(rotatedAngle, 12); // 12 radial segments

    // Ray intensity peaks at center of each segment
    const centerAngle = float(Math.PI / 12); // Half of segment width (2π/12 / 2)
    const rayIntensity = mul(
      smoothstep(float(0.1), float(0.0), abs(sub(rayAngle, centerAngle))),
      float(0.15),
    );

    // Fade rays based on distance (visible ring from 0.1 to 0.5)
    const rayMask = mul(
      smoothstep(float(0.5), float(0.2), dist),
      smoothstep(float(0.1), float(0.2), dist),
    );
    const rays = mul(rayIntensity, rayMask);

    // ═══════════════════════════════════════════════════════════════
    // Combine all layers with colors
    // GLSL: vec3 color = coreColor * core;
    //       color += coronaColor * corona;
    //       color += glowColor * outerGlow;
    //       color += vec3(1.0, 0.95, 0.85) * rays;
    // ═══════════════════════════════════════════════════════════════
    const coreColorVec = color(coreColor);
    const coronaColorVec = color(coronaColor);
    const glowColorVec = color(glowColor);
    const rayColorVec = vec3(1.0, 0.95, 0.85); // Warm white for rays

    const finalColor = add(
      add(
        add(mul(coreColorVec.rgb, core), mul(coronaColorVec.rgb, coronaTextured)),
        mul(glowColorVec.rgb, outerGlow),
      ),
      mul(rayColorVec, rays),
    );

    // ═══════════════════════════════════════════════════════════════
    // Final alpha - combine all layers
    // GLSL: float alpha = core + corona * 0.8 + outerGlow * 0.5 + rays;
    //       alpha = clamp(alpha * intensity, 0.0, 1.0);
    // ═══════════════════════════════════════════════════════════════
    const alphaBase = add(
      add(add(core, mul(coronaTextured, float(0.8))), mul(outerGlow, float(0.5))),
      rays,
    );
    const alphaWithIntensity = mul(alphaBase, uIntensity);

    // ═══════════════════════════════════════════════════════════════
    // Edge shimmer - subtle animation
    // GLSL: float shimmer = sin(time * 3.0 + angle * 8.0) * 0.05 + 0.95;
    //       alpha *= shimmer * smoothstep(0.5, 0.3, dist);
    // ═══════════════════════════════════════════════════════════════
    const shimmer = add(
      mul(sin(add(mul(uTime, float(3.0)), mul(angle, float(8.0)))), float(0.05)),
      float(0.95),
    );
    const edgeFade = smoothstep(float(0.5), float(0.3), dist);
    const finalAlpha = clamp(
      mul(mul(alphaWithIntensity, shimmer), edgeFade),
      float(0.0),
      float(1.0),
    );

    // Create material
    const mat = new MeshBasicNodeMaterial();
    mat.colorNode = color(finalColor);
    mat.opacityNode = finalAlpha;
    mat.transparent = true;
    mat.depthWrite = false;
    mat.side = THREE.DoubleSide;
    mat.blending = THREE.AdditiveBlending;

    // Store uniforms for animation
    setMaterialUserData(mat, { uTime, uBreathPhase, uIntensity });

    return mat;
  }, [coreColor, coronaColor, glowColor, intensity, breathPhase]);

  // Animate time and breath phase uniforms
  useFrame((state) => {
    if (!materialRef.current) return;

    const userData = getMaterialUserData<{
      uTime?: { value: number };
      uBreathPhase?: { value: number };
    }>(materialRef.current);
    if (userData?.uTime) {
      userData.uTime.value = state.clock.elapsedTime;
    }
    if (userData?.uBreathPhase) {
      userData.uBreathPhase.value = breathPhase;
    }
  });

  // Cleanup
  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  return <primitive object={material} ref={materialRef} attach="material" />;
});

export default StylizedSunMaterialTSL;
