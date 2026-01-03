/**
 * AuroraEffect - Subtle northern lights effect in the background
 *
 * Creates gentle aurora borealis-like waves that shimmer across the
 * upper portion of the scene, adding a mystical, ethereal quality.
 *
 * Features:
 * - Soft pastel color waves (lavender, teal, pink)
 * - Undulating vertical curtain effect
 * - Breathing-synchronized intensity
 * - Extremely subtle for meditation ambiance
 *
 * Performance: Single fullscreen shader quad, minimal GPU impact
 */

import { useFrame } from '@react-three/fiber';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

interface AuroraEffectProps {
  /** Maximum opacity @default 0.08 */
  opacity?: number;
  /** Animation speed @default 0.3 */
  speed?: number;
  /** Enable aurora @default true */
  enabled?: boolean;
}

const auroraVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const auroraFragmentShader = `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uOpacity;

  // Simplex noise for organic movement
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m; m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  void main() {
    // Only visible in upper portion of screen
    float heightMask = smoothstep(0.4, 0.95, vUv.y);
    if (heightMask < 0.01) discard;

    // Create vertical curtain waves
    float waveX = vUv.x * 3.0;
    float wave1 = snoise(vec2(waveX + uTime * 0.15, uTime * 0.1)) * 0.5 + 0.5;
    float wave2 = snoise(vec2(waveX * 1.5 + uTime * 0.1 + 5.0, uTime * 0.08 + 10.0)) * 0.5 + 0.5;
    float wave3 = snoise(vec2(waveX * 0.8 + uTime * 0.12 + 10.0, uTime * 0.06)) * 0.5 + 0.5;

    // Vertical streaking effect
    float streak1 = pow(wave1, 2.0) * smoothstep(0.3, 0.7, wave2);
    float streak2 = pow(wave2, 2.5) * smoothstep(0.4, 0.8, wave3);
    float streak3 = pow(wave3, 2.0) * smoothstep(0.35, 0.75, wave1);

    // Pastel aurora colors
    vec3 colorLavender = vec3(0.82, 0.78, 0.92);  // #d1c7eb
    vec3 colorTeal = vec3(0.75, 0.92, 0.88);      // #bfebe1
    vec3 colorPink = vec3(0.95, 0.80, 0.85);      // #f2ccd9
    vec3 colorMint = vec3(0.78, 0.92, 0.82);      // #c7ebd1

    // Mix colors based on waves
    vec3 color1 = mix(colorLavender, colorTeal, wave1);
    vec3 color2 = mix(colorPink, colorMint, wave2);
    vec3 finalColor = mix(color1, color2, wave3);

    // Combine streaks
    float aurora = streak1 * 0.4 + streak2 * 0.35 + streak3 * 0.25;

    // Horizontal fade at edges
    float edgeFade = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x);

    // Breathing synchronization (19s cycle)
    float breathPhase = mod(uTime, 19.0) / 19.0;
    float breathMod = 0.5 + sin(breathPhase * 6.28) * 0.5;

    // Final alpha
    float alpha = aurora * heightMask * edgeFade * breathMod * uOpacity;

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

export const AuroraEffect = memo(function AuroraEffect({
  opacity = 0.08,
  speed = 0.3,
  enabled = true,
}: AuroraEffectProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(() => new THREE.PlaneGeometry(80, 40), []);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: opacity },
      },
      vertexShader: auroraVertexShader,
      fragmentShader: auroraFragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
  }, [opacity]);

  // Animate aurora
  useFrame((state) => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime * speed;
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
    <mesh position={[0, 12, -50]} rotation={[0, 0, 0]} geometry={geometry} frustumCulled={false}>
      <primitive object={material} ref={materialRef} attach="material" />
    </mesh>
  );
});

export default AuroraEffect;
