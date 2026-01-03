/**
 * HorizonGlow - Atmospheric glow at the distant horizon
 *
 * Creates a subtle luminous glow at the horizon line, suggesting
 * a vast world extending beyond the visible scene. This technique
 * is used in games like Journey to create a sense of epic scale.
 *
 * Features:
 * - Gradient glow fading from horizon upward
 * - Warm color at horizon, cool fade toward sky
 * - Subtle pulse synchronized with breathing
 * - Very far placement (-200 Z) for proper depth
 */

import { useFrame } from '@react-three/fiber';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

interface HorizonGlowProps {
  /** Base opacity @default 0.1 */
  opacity?: number;
  /** Enable glow @default true */
  enabled?: boolean;
}

const horizonVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const horizonFragmentShader = `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uOpacity;

  void main() {
    // Gradient from bottom (horizon) to top (sky)
    // Glow concentrated at bottom, fading upward
    float horizonGlow = 1.0 - vUv.y;
    horizonGlow = pow(horizonGlow, 2.5); // Concentrate at horizon

    // Secondary softer glow
    float softGlow = 1.0 - smoothstep(0.0, 0.6, vUv.y);

    // Combine glows
    float glow = horizonGlow * 0.7 + softGlow * 0.3;

    // Horizontal falloff at edges
    float horizFade = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x);
    glow *= horizFade;

    // Color gradient - warm at horizon, cooler higher up
    vec3 horizonColor = vec3(1.0, 0.95, 0.88);   // Warm golden white
    vec3 skyColor = vec3(0.92, 0.94, 0.98);      // Cool sky tint
    vec3 color = mix(horizonColor, skyColor, vUv.y);

    // Breathing sync - gentle pulse
    float breathPhase = mod(uTime, 19.0) / 19.0;
    float breathMod = 0.8 + sin(breathPhase * 6.28) * 0.2;

    // Subtle shimmer
    float shimmer = sin(vUv.x * 20.0 + uTime * 0.3) * 0.05 + 1.0;

    float alpha = glow * uOpacity * breathMod * shimmer;

    gl_FragColor = vec4(color, alpha);
  }
`;

export const HorizonGlow = memo(function HorizonGlow({
  opacity = 0.1,
  enabled = true,
}: HorizonGlowProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Wide plane at horizon
  const geometry = useMemo(() => new THREE.PlaneGeometry(300, 60), []);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: opacity },
      },
      vertexShader: horizonVertexShader,
      fragmentShader: horizonFragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
  }, [opacity]);

  useFrame((state) => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
  });

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  if (!enabled) return null;

  return (
    <mesh position={[0, -15, -200]} geometry={geometry} frustumCulled={false}>
      <primitive object={material} ref={materialRef} attach="material" />
    </mesh>
  );
});

export default HorizonGlow;
