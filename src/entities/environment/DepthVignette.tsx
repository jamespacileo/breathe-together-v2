/**
 * DepthVignette - Screen-space vignette for depth focus
 *
 * Creates a radial darkening effect that:
 * - Draws focus to the center (globe)
 * - Suggests depth through edge darkening
 * - Creates cinematic framing
 *
 * Rendered as a screen-space overlay using a full-screen quad.
 */

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { SCENE_DEPTH } from '../../constants';

interface DepthVignetteProps {
  /** Enable/disable vignette */
  enabled?: boolean;
  /** Vignette intensity (0-1) */
  intensity?: number;
  /** Inner radius where vignette starts (0-1) */
  radius?: number;
  /** Softness of the vignette edge */
  softness?: number;
  /** Vignette color (default: black) */
  color?: string;
}

const vignetteVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const vignetteFragmentShader = `
  uniform float uIntensity;
  uniform float uRadius;
  uniform float uSoftness;
  uniform vec3 uColor;
  varying vec2 vUv;

  void main() {
    vec2 center = vec2(0.5, 0.5);
    float dist = distance(vUv, center);

    // Calculate vignette with smooth falloff
    float vignette = smoothstep(uRadius, uRadius + uSoftness, dist);
    vignette *= uIntensity;

    gl_FragColor = vec4(uColor, vignette);
  }
`;

export function DepthVignette({
  enabled = true,
  intensity,
  radius,
  softness,
  color = '#1a1510',
}: DepthVignetteProps) {
  const { INTENSITY, RADIUS, SOFTNESS } = SCENE_DEPTH.VIGNETTE;

  const finalIntensity = intensity ?? INTENSITY;
  const finalRadius = radius ?? RADIUS;
  const finalSoftness = softness ?? SOFTNESS;

  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uIntensity: { value: finalIntensity },
      uRadius: { value: finalRadius },
      uSoftness: { value: finalSoftness },
      uColor: { value: new THREE.Color(color) },
    }),
    [finalIntensity, finalRadius, finalSoftness, color],
  );

  // Cleanup shader material on unmount
  useEffect(() => {
    return () => {
      materialRef.current?.dispose();
    };
  }, []);

  if (!enabled) return null;

  return (
    <mesh ref={meshRef} frustumCulled={false} renderOrder={999}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vignetteVertexShader}
        fragmentShader={vignetteFragmentShader}
        uniforms={uniforms}
        transparent
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}
