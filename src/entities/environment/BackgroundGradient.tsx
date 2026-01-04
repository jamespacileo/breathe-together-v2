/**
 * BackgroundGradient - Monument Valley inspired animated gradient background
 *
 * Renders as a fullscreen quad behind all other content with:
 * - Multi-stop pastel gradient (sky blue → dusty rose → apricot → coral)
 * - Animated procedural clouds using FBM noise
 * - Subtle vignette effect
 */

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import type * as THREE from 'three';
import { DoubleSide, PlaneGeometry, ShaderMaterial } from 'three';

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.9999, 1.0);
}
`;

const fragmentShader = `
uniform float time;
uniform float depthIntensity;      // Controls overall depth effect strength
uniform float horizonPosition;     // Where the horizon sits (0-1, default 0.35)
uniform float perspectiveStrength; // Strength of radial perspective lines
uniform float groundFade;          // How much ground fades to horizon
varying vec2 vUv;

// Simplex noise functions for cloud-like patterns
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

// Optimized FBM with 2 octaves (was 4) - 50% cheaper, nearly identical visual
float fbm(vec2 p) {
  float f = 0.0;
  f += 0.5000 * snoise(p); p *= 2.02;
  f += 0.2500 * snoise(p);
  return f / 0.75;
}

// Radial perspective grid - creates converging lines toward horizon center
float perspectiveGrid(vec2 uv, float horizon) {
  // Center point where lines converge (horizon center)
  vec2 center = vec2(0.5, horizon);
  vec2 toCenter = uv - center;

  // Distance from center (for fading)
  float dist = length(toCenter);

  // Angle from center (for radial lines)
  float angle = atan(toCenter.y, toCenter.x);

  // Create radial lines (32 lines around the circle)
  float radialLines = abs(sin(angle * 16.0));
  radialLines = smoothstep(0.85, 1.0, radialLines); // Make lines thin

  // Concentric circles (distance rings) - perspective spacing
  // Closer rings are more spaced, distant rings compress
  float perspectiveDist = pow(dist, 0.7); // Non-linear for perspective feel
  float rings = abs(sin(perspectiveDist * 20.0));
  rings = smoothstep(0.9, 1.0, rings);

  // Combine - lines fade toward center (horizon) and edges
  float grid = max(radialLines, rings * 0.5);
  grid *= smoothstep(0.0, 0.15, dist); // Fade near center
  grid *= smoothstep(0.8, 0.4, dist);  // Fade at edges

  // Only show in lower portion (ground area)
  grid *= smoothstep(horizon + 0.1, horizon - 0.1, uv.y);

  return grid;
}

// Ground plane effect - simulates receding ground with atmospheric perspective
float groundPlane(vec2 uv, float horizon) {
  // Below horizon = ground
  float groundMask = smoothstep(horizon + 0.05, horizon - 0.2, uv.y);

  // Distance from viewer (bottom = close, horizon = far)
  float depth = 1.0 - smoothstep(0.0, horizon, uv.y);

  // Radial distance from center bottom (vanishing point perspective)
  vec2 groundCenter = vec2(0.5, 0.0);
  float radialDist = length(uv - groundCenter);

  // Combine for ground intensity
  return groundMask * depth;
}

void main() {
  // === SKY COLORS (upper portion) ===
  vec3 skyTop = vec3(0.96, 0.94, 0.91);       // #f5f0e8 Warm cream
  vec3 skyMid = vec3(0.98, 0.95, 0.90);       // #faf2e6 Soft ivory
  vec3 horizonColor = vec3(1.0, 0.97, 0.93);  // Bright warm white at horizon

  // === GROUND COLORS (lower portion) ===
  vec3 groundNear = vec3(0.92, 0.88, 0.82);   // Warmer, slightly darker near viewer
  vec3 groundFar = vec3(0.98, 0.95, 0.91);    // Fades to sky color at horizon

  // Vertical position
  float y = vUv.y;

  // === HORIZON-BASED GRADIENT ===
  // Above horizon: sky gradient
  // Below horizon: ground gradient with atmospheric perspective

  float horizonY = horizonPosition;

  // Sky gradient (above horizon)
  float skyT = smoothstep(horizonY, 1.0, y);
  vec3 skyGradient = mix(horizonColor, skyTop, skyT);

  // Ground gradient (below horizon) - atmospheric perspective
  // Near ground is warmer/darker, far ground fades to horizon color
  float groundT = smoothstep(0.0, horizonY, y);
  // Non-linear for perspective (ground appears to recede faster near horizon)
  groundT = pow(groundT, 0.6 + groundFade * 0.4);
  vec3 groundGradient = mix(groundNear, horizonColor, groundT);

  // Blend sky and ground at horizon
  float horizonBlend = smoothstep(horizonY - 0.08, horizonY + 0.08, y);
  vec3 baseColor = mix(groundGradient, skyGradient, horizonBlend);

  // === RADIAL DEPTH GRADIENT ===
  // Center of scene (where globe is) should feel like focal point
  // Creates subtle "depth tunnel" effect
  vec2 center = vec2(0.5, 0.45); // Slightly above center where globe sits
  float radialDist = length(vUv - center);

  // Subtle radial darkening toward edges (depth of field feel)
  float radialDepth = smoothstep(0.0, 0.7, radialDist);
  baseColor = mix(baseColor, baseColor * 0.97, radialDepth * depthIntensity * 0.2);

  // Very subtle lightening toward center (focal point) - reduced to not wash out distant shapes
  float centerGlow = 1.0 - smoothstep(0.0, 0.3, radialDist);
  baseColor = mix(baseColor, vec3(1.0, 0.99, 0.97), centerGlow * depthIntensity * 0.05);

  // === PERSPECTIVE GRID (very subtle) ===
  if (perspectiveStrength > 0.001) {
    float grid = perspectiveGrid(vUv, horizonY);
    vec3 gridColor = vec3(0.85, 0.82, 0.78); // Subtle warm gray
    baseColor = mix(baseColor, gridColor, grid * perspectiveStrength * 0.15);
  }

  // === GROUND PLANE SHADING ===
  float ground = groundPlane(vUv, horizonY);
  // Ground gets slightly more saturated/warm near viewer
  vec3 groundTint = vec3(0.98, 0.94, 0.88);
  baseColor = mix(baseColor, groundTint, ground * groundFade * 0.2);

  // === ANIMATED CLOUDS ===
  vec2 cloudUv = vUv * vec2(2.0, 1.0) + vec2(time * 0.015, 0.0);
  float clouds = fbm(cloudUv * 2.5);

  vec2 cloudUv2 = vUv * vec2(1.5, 0.8) + vec2(time * 0.01 + 50.0, time * 0.003);
  float clouds2 = fbm(cloudUv2 * 2.0);

  // Clouds fade toward ground (they're in the sky)
  float cloudMask = smoothstep(0.2, 0.55, clouds * 0.5 + clouds2 * 0.5);
  cloudMask *= smoothstep(horizonY - 0.1, horizonY + 0.2, y); // Fade below horizon
  cloudMask *= smoothstep(0.95, 0.6, y); // Fade at top

  vec3 cloudColor = vec3(1.0, 0.99, 0.97);
  vec3 color = mix(baseColor, cloudColor, cloudMask * 0.15);

  // === ATMOSPHERIC HAZE AT HORIZON ===
  // Very subtle brightening at horizon line (atmospheric scattering)
  // Reduced intensity to not wash out distant shapes
  float horizonHaze = exp(-pow((y - horizonY) * 10.0, 2.0));
  color = mix(color, vec3(1.0, 0.98, 0.95), horizonHaze * depthIntensity * 0.06);

  // === VIGNETTE (depth of field) ===
  vec2 vignetteUv = vUv * 2.0 - 1.0;
  float vignette = 1.0 - dot(vignetteUv * 0.2, vignetteUv * 0.2);
  color *= mix(0.94, 1.0, vignette);

  // === SUBTLE PAPER TEXTURE ===
  float noise = (fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.008;
  color += noise;

  gl_FragColor = vec4(color, 1.0);
}
`;

interface BackgroundGradientProps {
  /**
   * Overall depth effect intensity.
   * Higher values = more pronounced depth cues.
   * @min 0 @max 1 @step 0.1
   * @default 0.7
   */
  depthIntensity?: number;
  /**
   * Horizon line position (0 = bottom, 1 = top).
   * Lower values = more ground visible, higher = more sky.
   * @min 0.2 @max 0.6 @step 0.05
   * @default 0.35
   */
  horizonPosition?: number;
  /**
   * Strength of subtle perspective grid lines.
   * 0 = no grid, 1 = visible grid. Keep very low for ethereal feel.
   * @min 0 @max 1 @step 0.1
   * @default 0
   */
  perspectiveStrength?: number;
  /**
   * How much the ground fades toward horizon (atmospheric perspective).
   * Higher = more dramatic depth fade.
   * @min 0 @max 1 @step 0.1
   * @default 0.5
   */
  groundFade?: number;
}

export function BackgroundGradient({
  depthIntensity = 0.7,
  horizonPosition = 0.35,
  perspectiveStrength = 0,
  groundFade = 0.5,
}: BackgroundGradientProps = {}) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Create geometry with useMemo for proper disposal
  const geometry = useMemo(() => new PlaneGeometry(2, 2), []);

  const material = useMemo(() => {
    return new ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        depthIntensity: { value: depthIntensity },
        horizonPosition: { value: horizonPosition },
        perspectiveStrength: { value: perspectiveStrength },
        groundFade: { value: groundFade },
      },
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
      side: DoubleSide,
    });
  }, [depthIntensity, horizonPosition, perspectiveStrength, groundFade]);

  // Animate time uniform and update other uniforms
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
      // Update uniforms if props change
      materialRef.current.uniforms.depthIntensity.value = depthIntensity;
      materialRef.current.uniforms.horizonPosition.value = horizonPosition;
      materialRef.current.uniforms.perspectiveStrength.value = perspectiveStrength;
      materialRef.current.uniforms.groundFade.value = groundFade;
    }
  });

  // Cleanup geometry and material on unmount
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  return (
    <mesh renderOrder={-1000} frustumCulled={false} geometry={geometry}>
      <primitive object={material} ref={materialRef} attach="material" />
    </mesh>
  );
}

export default BackgroundGradient;
