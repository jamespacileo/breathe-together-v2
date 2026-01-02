import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { BREATH_TOTAL_CYCLE } from '../../constants';
import { calculateBreathState } from '../../lib/breathCalc';
import { calculatePhaseInfo } from '../../lib/breathPhase';

/**
 * Phase colors for ambient glow
 * Subtle variations to enhance mood without distraction
 */
const GLOW_COLORS = {
  inhale: new THREE.Color('#7ec8d4'), // Teal - expansion
  holdIn: new THREE.Color('#d4a574'), // Gold - fullness
  exhale: new THREE.Color('#d4847e'), // Coral - release
  holdOut: new THREE.Color('#9ab4c8'), // Cool blue - stillness
};

// Vertex shader for radial gradient with soft edges
const glowVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Fragment shader for soft radial glow
const glowFragmentShader = `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uInnerRadius;
  uniform float uOuterRadius;
  varying vec2 vUv;

  void main() {
    // Calculate distance from center (0.5, 0.5)
    vec2 center = vec2(0.5);
    float dist = distance(vUv, center) * 2.0; // Normalize to 0-1

    // Create soft radial gradient
    // Inner region is transparent (globe area)
    // Middle region fades in (glow)
    // Outer region fades out
    float innerFade = smoothstep(uInnerRadius, uInnerRadius + 0.15, dist);
    float outerFade = 1.0 - smoothstep(uOuterRadius - 0.2, uOuterRadius, dist);

    float alpha = innerFade * outerFade * uOpacity;

    // Add subtle noise for organic feel
    float noise = fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453);
    alpha *= 0.95 + noise * 0.05;

    gl_FragColor = vec4(uColor, alpha);
  }
`;

export interface AmbientGlowHaloProps {
  /** Enable/disable the glow */
  enabled?: boolean;
  /** Base size of the glow plane */
  size?: number;
  /** Minimum scale (exhale - contracted) */
  scaleMin?: number;
  /** Maximum scale (inhale - expanded) */
  scaleMax?: number;
  /** Base opacity */
  opacity?: number;
  /** Inner radius of glow (0-1, center cutout for globe) */
  innerRadius?: number;
  /** Outer radius of glow (0-1, outer edge) */
  outerRadius?: number;
  /** Z position (behind globe) */
  zOffset?: number;
}

/**
 * AmbientGlowHalo - A soft radial glow that expands/contracts with breathing.
 *
 * Creates an ethereal backdrop behind the globe that breathes with the user.
 * The glow expands during inhale (welcoming energy) and contracts during
 * exhale (releasing tension).
 *
 * Uses a shader-based approach for smooth gradients and optimal performance.
 */
export function AmbientGlowHalo({
  enabled = true,
  size = 12,
  scaleMin = 0.85,
  scaleMax = 1.15,
  opacity = 0.35,
  innerRadius = 0.15,
  outerRadius = 0.9,
  zOffset = -2,
}: AmbientGlowHaloProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Create shader material
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: glowVertexShader,
      fragmentShader: glowFragmentShader,
      uniforms: {
        uColor: { value: new THREE.Color(GLOW_COLORS.inhale) },
        uOpacity: { value: opacity },
        uInnerRadius: { value: innerRadius },
        uOuterRadius: { value: outerRadius },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }, [opacity, innerRadius, outerRadius]);

  // Create plane geometry
  const geometry = useMemo(() => new THREE.PlaneGeometry(size, size), [size]);

  // Cleanup
  useMemo(() => {
    return () => {
      material.dispose();
      geometry.dispose();
    };
  }, [material, geometry]);

  useFrame(() => {
    if (!enabled || !meshRef.current) return;

    // Use UTC time for global synchronization
    const utcTime = Date.now() / 1000;
    const cycleTime = utcTime % BREATH_TOTAL_CYCLE;
    const { phaseIndex } = calculatePhaseInfo(cycleTime);
    const { breathPhase } = calculateBreathState(utcTime);

    // Scale based on breath phase (inverted - expand on inhale)
    // breathPhase: 0 = exhaled, 1 = inhaled
    const scale = scaleMin + breathPhase * (scaleMax - scaleMin);
    meshRef.current.scale.setScalar(scale);

    // Update color based on phase
    let targetColor: THREE.Color;
    switch (phaseIndex) {
      case 0:
        targetColor = GLOW_COLORS.inhale;
        break;
      case 1:
        targetColor = GLOW_COLORS.holdIn;
        break;
      case 2:
        targetColor = GLOW_COLORS.exhale;
        break;
      case 3:
        targetColor = GLOW_COLORS.holdOut;
        break;
      default:
        targetColor = GLOW_COLORS.inhale;
    }

    // Smooth color transition
    (material.uniforms.uColor.value as THREE.Color).lerp(targetColor, 0.05);

    // Pulse opacity slightly with breathing
    const opacityPulse = opacity * (0.9 + breathPhase * 0.2);
    material.uniforms.uOpacity.value = opacityPulse;
  });

  if (!enabled) return null;

  return (
    <mesh ref={meshRef} position={[0, 0, zOffset]}>
      <primitive object={geometry} attach="geometry" />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
