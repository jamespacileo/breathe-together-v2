/**
 * GalaxyBackground - Stylized space background with nebula and distant stars
 *
 * Features:
 * - Deep space gradient (black → deep blue → purple)
 * - Animated nebula clouds using layered FBM noise
 * - Dense star field with varying brightness
 * - Subtle cosmic dust particles
 * - Milky Way band effect
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
uniform float nebulaIntensity;
uniform float starDensity;
varying vec2 vUv;

// Hash functions for star generation
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float hash3(vec3 p) {
  return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
}

// Simplex noise for nebula
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

// FBM for nebula clouds
float fbm(vec2 p, int octaves) {
  float f = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  for (int i = 0; i < 5; i++) {
    if (i >= octaves) break;
    f += amplitude * snoise(p * frequency);
    frequency *= 2.02;
    amplitude *= 0.5;
  }
  return f;
}

// Star layer - creates dense star field
float stars(vec2 uv, float scale, float threshold) {
  vec2 grid = floor(uv * scale);
  vec2 gridUv = fract(uv * scale);

  float starValue = 0.0;

  // Check current cell and neighbors for smooth appearance
  for (int x = -1; x <= 1; x++) {
    for (int y = -1; y <= 1; y++) {
      vec2 neighbor = grid + vec2(float(x), float(y));
      float h = hash(neighbor);

      if (h > threshold) {
        // Star position within cell
        vec2 starPos = vec2(hash(neighbor + 0.1), hash(neighbor + 0.2));
        vec2 diff = gridUv - starPos - vec2(float(x), float(y));
        float dist = length(diff);

        // Star brightness based on hash
        float brightness = smoothstep(0.03, 0.0, dist) * (h - threshold) / (1.0 - threshold);

        // Twinkle effect
        float twinkle = 0.7 + 0.3 * sin(time * (2.0 + h * 3.0) + h * 100.0);
        brightness *= twinkle;

        starValue = max(starValue, brightness);
      }
    }
  }

  return starValue;
}

void main() {
  vec2 uv = vUv;

  // === BASE SPACE COLOR ===
  // Deep gradient from black at edges to dark blue in center
  vec3 spaceBlack = vec3(0.02, 0.02, 0.04);
  vec3 spaceDeepBlue = vec3(0.03, 0.04, 0.08);
  vec3 spacePurple = vec3(0.06, 0.03, 0.08);

  // Radial gradient from center
  vec2 center = uv - 0.5;
  float radialDist = length(center);

  vec3 baseColor = mix(spaceDeepBlue, spaceBlack, smoothstep(0.0, 0.7, radialDist));

  // === MILKY WAY BAND ===
  // Diagonal band across the screen
  float milkyWayAngle = 0.4; // Tilt angle
  vec2 rotatedUv = vec2(
    uv.x * cos(milkyWayAngle) - uv.y * sin(milkyWayAngle),
    uv.x * sin(milkyWayAngle) + uv.y * cos(milkyWayAngle)
  );

  // Band intensity based on distance from center line
  float bandDist = abs(rotatedUv.y - 0.5);
  float milkyWayMask = smoothstep(0.3, 0.0, bandDist) * 0.5;

  // Add noise to milky way
  float milkyNoise = fbm(rotatedUv * 3.0 + time * 0.01, 4);
  milkyWayMask *= (0.5 + 0.5 * milkyNoise);

  vec3 milkyWayColor = vec3(0.12, 0.1, 0.15) * milkyWayMask * nebulaIntensity;

  // === NEBULA CLOUDS ===
  // Multiple layered nebula with different colors
  vec2 nebulaUv1 = uv * 2.0 + vec2(time * 0.008, time * 0.003);
  vec2 nebulaUv2 = uv * 1.5 + vec2(-time * 0.005, time * 0.01) + 100.0;
  vec2 nebulaUv3 = uv * 2.5 + vec2(time * 0.003, -time * 0.007) + 200.0;

  float nebula1 = fbm(nebulaUv1, 4);
  float nebula2 = fbm(nebulaUv2, 3);
  float nebula3 = fbm(nebulaUv3, 4);

  // Nebula colors - cosmic palette
  vec3 nebulaPurple = vec3(0.15, 0.05, 0.2);   // Deep purple
  vec3 nebulaTeal = vec3(0.05, 0.12, 0.18);    // Cosmic teal
  vec3 nebulaRose = vec3(0.18, 0.06, 0.12);    // Space rose
  vec3 nebulaBlue = vec3(0.04, 0.08, 0.15);    // Deep blue

  // Create nebula masks
  float nebulaMask1 = smoothstep(0.2, 0.6, nebula1) * smoothstep(0.7, 0.3, radialDist);
  float nebulaMask2 = smoothstep(0.3, 0.7, nebula2) * smoothstep(0.8, 0.4, radialDist);
  float nebulaMask3 = smoothstep(0.15, 0.55, nebula3) * smoothstep(0.6, 0.25, radialDist);

  // Combine nebula layers
  vec3 nebulaColor = vec3(0.0);
  nebulaColor += nebulaPurple * nebulaMask1 * 0.6;
  nebulaColor += nebulaTeal * nebulaMask2 * 0.4;
  nebulaColor += nebulaRose * nebulaMask3 * 0.3;
  nebulaColor += nebulaBlue * milkyWayMask * 0.5;

  nebulaColor *= nebulaIntensity;

  // === STAR FIELD ===
  // Multiple star layers for depth
  float starField = 0.0;

  // Dense small stars
  starField += stars(uv, 150.0 * starDensity, 0.97) * 0.6;

  // Medium stars
  starField += stars(uv + 0.5, 80.0 * starDensity, 0.985) * 0.8;

  // Bright sparse stars
  starField += stars(uv + 1.0, 40.0 * starDensity, 0.995) * 1.0;

  // Very bright rare stars
  starField += stars(uv + 1.5, 20.0 * starDensity, 0.998) * 1.2;

  // Star color - slight blue/white tint
  vec3 starColor = vec3(0.9, 0.95, 1.0) * starField;

  // Some stars have color variation
  float colorVariation = hash(floor(uv * 50.0));
  if (colorVariation > 0.9) {
    starColor *= vec3(1.0, 0.9, 0.8); // Warm yellow
  } else if (colorVariation > 0.8) {
    starColor *= vec3(0.8, 0.9, 1.0); // Cool blue
  }

  // === COSMIC DUST ===
  float dust = fbm(uv * 8.0 + time * 0.02, 3);
  dust = smoothstep(0.4, 0.6, dust) * 0.03;
  vec3 dustColor = vec3(0.1, 0.08, 0.12) * dust * nebulaIntensity;

  // === COMBINE ALL LAYERS ===
  vec3 finalColor = baseColor;
  finalColor += milkyWayColor;
  finalColor += nebulaColor;
  finalColor += dustColor;
  finalColor += starColor;

  // Subtle vignette for depth
  float vignette = 1.0 - smoothstep(0.4, 1.0, radialDist) * 0.3;
  finalColor *= vignette;

  // Gamma correction for better color reproduction
  finalColor = pow(finalColor, vec3(0.95));

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

interface GalaxyBackgroundProps {
  /** Nebula cloud intensity (0-1) @default 1.0 */
  nebulaIntensity?: number;
  /** Star density multiplier @default 1.0 */
  starDensity?: number;
}

export function GalaxyBackground({
  nebulaIntensity = 1.0,
  starDensity = 1.0,
}: GalaxyBackgroundProps = {}) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Create geometry with useMemo for proper disposal
  const geometry = useMemo(() => new PlaneGeometry(2, 2), []);

  const material = useMemo(() => {
    return new ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        nebulaIntensity: { value: nebulaIntensity },
        starDensity: { value: starDensity },
      },
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
      side: DoubleSide,
    });
  }, [nebulaIntensity, starDensity]);

  // Animate time uniform
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
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

export default GalaxyBackground;
