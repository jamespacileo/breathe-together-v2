/**
 * RippleWaves - Expanding spherical pulse rings on breath transitions
 *
 * Features:
 * - Concentric rings that expand outward from the globe
 * - Triggered on phase transitions (inhale→hold, exhale→hold)
 * - Soft glow that fades as rings expand
 * - Additive blending for ethereal look
 *
 * Implementation: Ring geometry with animated scale and opacity
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { phaseType } from '../breath/traits';

export interface RippleWavesProps {
  /**
   * Maximum radius of ripple expansion
   * @default 8
   * @min 4
   * @max 15
   */
  maxRadius?: number;

  /**
   * Starting radius (near globe surface)
   * @default 2
   * @min 1
   * @max 4
   */
  startRadius?: number;

  /**
   * Ripple color
   * @default '#88ccff'
   */
  color?: string;

  /**
   * Maximum opacity at start
   * @default 0.4
   * @min 0
   * @max 1
   */
  opacity?: number;

  /**
   * Duration of ripple animation in seconds
   * @default 3
   * @min 1
   * @max 6
   */
  duration?: number;

  /**
   * Enable ripple waves
   * @default true
   */
  enabled?: boolean;
}

interface Ripple {
  id: number;
  startTime: number;
  phaseType: number; // 0=inhale, 1=hold-in, 2=exhale, 3=hold-out
}

// Shader for smooth ring with glow
const ringVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ringFragmentShader = `
  varying vec2 vUv;
  uniform float uOpacity;
  uniform vec3 uColor;
  uniform float uProgress;

  void main() {
    // Ring shape - thin band at center of UV
    float ring = abs(vUv.y - 0.5);
    float ringAlpha = smoothstep(0.5, 0.3, ring) * smoothstep(0.0, 0.15, ring);

    // Fade out as ripple expands
    float fadeOut = 1.0 - uProgress;
    fadeOut = fadeOut * fadeOut; // Quadratic falloff

    // Soft edge along the circumference
    float circumference = smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.9, vUv.x);

    float alpha = ringAlpha * fadeOut * circumference * uOpacity;

    gl_FragColor = vec4(uColor, alpha);
  }
`;

const RippleRing = memo(function RippleRing({
  ripple,
  currentTime,
  startRadius,
  maxRadius,
  color,
  opacity,
  duration,
  onComplete,
}: {
  ripple: Ripple;
  currentTime: number;
  startRadius: number;
  maxRadius: number;
  color: string;
  opacity: number;
  duration: number;
  onComplete: (id: number) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Create ring geometry (torus-like)
  const geometry = useMemo(() => {
    // Use a tube/torus geometry for the ring
    return new THREE.TorusGeometry(1, 0.02, 8, 64);
  }, []);

  const material = useMemo(() => {
    const colorObj = new THREE.Color(color);
    return new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: opacity },
        uColor: { value: colorObj },
        uProgress: { value: 0 },
      },
      vertexShader: ringVertexShader,
      fragmentShader: ringFragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
  }, [color, opacity]);

  useFrame(() => {
    if (!meshRef.current) return;

    const elapsed = currentTime - ripple.startTime;
    const progress = Math.min(elapsed / duration, 1);

    if (progress >= 1) {
      onComplete(ripple.id);
      return;
    }

    // Eased expansion
    const easedProgress = 1 - (1 - progress) ** 3;
    const radius = startRadius + (maxRadius - startRadius) * easedProgress;

    meshRef.current.scale.setScalar(radius);
    (meshRef.current.material as THREE.ShaderMaterial).uniforms.uProgress.value = progress;
  });

  // Cleanup
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  // Color based on phase type
  const phaseColor = useMemo(() => {
    switch (ripple.phaseType) {
      case 0:
        return '#88ddff'; // Inhale - light blue
      case 1:
        return '#aaffaa'; // Hold-in - soft green
      case 2:
        return '#ffaa88'; // Exhale - warm orange
      case 3:
        return '#ddaaff'; // Hold-out - soft purple
      default:
        return color;
    }
  }, [ripple.phaseType, color]);

  // Update material color
  useEffect(() => {
    const colorObj = new THREE.Color(phaseColor);
    material.uniforms.uColor.value = colorObj;
  }, [phaseColor, material]);

  return (
    <mesh ref={meshRef} rotation={[Math.PI / 2, 0, 0]} geometry={geometry}>
      <primitive object={material} attach="material" />
    </mesh>
  );
});

/**
 * RippleWaves - Phase transition pulse effects
 */
export const RippleWaves = memo(function RippleWaves({
  maxRadius = 8,
  startRadius = 2,
  color = '#88ccff',
  opacity = 0.4,
  duration = 3,
  enabled = true,
}: RippleWavesProps) {
  const world = useWorld();
  const ripplesRef = useRef<Ripple[]>([]);
  const lastPhaseRef = useRef<number>(-1);
  const nextIdRef = useRef(0);
  const clockRef = useRef(0);

  // Note: Ripples are managed via refs to avoid re-render cascades

  const removeRipple = useCallback((id: number) => {
    ripplesRef.current = ripplesRef.current.filter((r) => r.id !== id);
  }, []);

  useFrame((state) => {
    clockRef.current = state.clock.elapsedTime;

    const phaseEntity = world.queryFirst(phaseType);
    if (!phaseEntity) return;

    const currentPhase = phaseEntity.get(phaseType)?.value ?? 0;

    // Spawn ripple on phase change
    if (lastPhaseRef.current !== -1 && lastPhaseRef.current !== currentPhase) {
      const newRipple: Ripple = {
        id: nextIdRef.current++,
        startTime: state.clock.elapsedTime,
        phaseType: currentPhase,
      };
      ripplesRef.current = [...ripplesRef.current, newRipple];
    }

    lastPhaseRef.current = currentPhase;
  });

  if (!enabled) return null;

  return (
    <group>
      {ripplesRef.current.map((ripple) => (
        <RippleRing
          key={ripple.id}
          ripple={ripple}
          currentTime={clockRef.current}
          startRadius={startRadius}
          maxRadius={maxRadius}
          color={color}
          opacity={opacity}
          duration={duration}
          onComplete={removeRipple}
        />
      ))}
    </group>
  );
});

export default RippleWaves;
