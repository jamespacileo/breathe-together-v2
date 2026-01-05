/**
 * DepthVignette - Screen-space vignette with depth-aware darkening
 *
 * Creates a vignette effect that:
 * - Darkens edges of the screen
 * - Focuses attention on the center (globe)
 * - Adds subtle color shift at edges (cooler tones)
 * - Responds to breathing phase
 *
 * Renders as a screen-space overlay using OrthographicCamera.
 */

import { useFrame, useThree } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { breathPhase } from '../breath/traits';

// Vignette shader
const vignetteVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.9999, 1.0);
  }
`;

const vignetteFragmentShader = `
  uniform float uIntensity;
  uniform float uSoftness;
  uniform vec3 uColor;
  uniform float uBreathPhase;
  uniform float uAspect;

  varying vec2 vUv;

  void main() {
    // Correct for aspect ratio
    vec2 uv = vUv;
    uv.x = (uv.x - 0.5) * uAspect + 0.5;

    // Distance from center
    vec2 center = uv - 0.5;
    float dist = length(center);

    // Vignette falloff
    float vignette = smoothstep(uSoftness, uSoftness + 0.3, dist);

    // Breathing influence - vignette pulses with breath
    float breathEffect = 1.0 - uBreathPhase * 0.15;
    vignette *= breathEffect;

    // Final intensity
    float alpha = vignette * uIntensity;

    // Slight color shift toward cooler at edges
    vec3 color = mix(uColor, uColor * vec3(0.9, 0.95, 1.05), dist);

    gl_FragColor = vec4(color, alpha);
  }
`;

export interface DepthVignetteProps {
  /**
   * Enable vignette effect
   * @default true
   */
  enabled?: boolean;
  /**
   * Vignette intensity (0-1)
   * @default 0.35
   * @min 0
   * @max 1
   */
  intensity?: number;
  /**
   * Vignette softness (higher = softer edge)
   * @default 0.4
   * @min 0.1
   * @max 0.8
   */
  softness?: number;
  /**
   * Vignette color
   * @default '#1a1510'
   */
  color?: string;
}

/**
 * DepthVignette - Screen-space vignette for depth focus
 *
 * Renders a full-screen vignette overlay that darkens edges
 * and draws attention to the center of the scene.
 */
export const DepthVignette = memo(function DepthVignette({
  enabled = true,
  intensity = 0.35,
  softness = 0.4,
  color = '#1a1510',
}: DepthVignetteProps) {
  const { size } = useThree();
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const world = useWorld();

  const geometry = useMemo(() => new THREE.PlaneGeometry(2, 2), []);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uIntensity: { value: intensity },
        uSoftness: { value: softness },
        uColor: { value: new THREE.Color(color) },
        uBreathPhase: { value: 0 },
        uAspect: { value: 1 },
      },
      vertexShader: vignetteVertexShader,
      fragmentShader: vignetteFragmentShader,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
  }, [intensity, softness, color]);

  // Update aspect ratio
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uAspect.value = size.width / size.height;
    }
  }, [size]);

  // Animation
  useFrame(() => {
    if (!materialRef.current) return;

    // Breathing influence
    const breathEntity = world.queryFirst(breathPhase);
    if (breathEntity) {
      const phase = breathEntity.get(breathPhase)?.value ?? 0;
      materialRef.current.uniforms.uBreathPhase.value = phase;
    }
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
    <mesh renderOrder={999} frustumCulled={false} geometry={geometry}>
      <primitive object={material} ref={materialRef} attach="material" />
    </mesh>
  );
});

export default DepthVignette;
