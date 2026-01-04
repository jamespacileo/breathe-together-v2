/**
 * GalaxyBackground - Deep space shader background with subtle nebula effects
 *
 * Features:
 * - Deep space gradient (dark blue to purple to black)
 * - Procedural star field with varying brightness
 * - Subtle nebula clouds using FBM noise
 * - Milky Way band across the sky
 * - Vignette for depth
 */

import { useFrame } from '@react-three/fiber';
import { memo, useEffect, useMemo, useRef } from 'react';
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
uniform float milkyWayIntensity;
varying vec2 vUv;

// Simplex noise for nebula patterns
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
  float amp = 0.5;
  float freq = 1.0;
  for (int i = 0; i < 4; i++) {
    if (i >= octaves) break;
    f += amp * snoise(p * freq);
    freq *= 2.02;
    amp *= 0.5;
  }
  return f;
}

// Hash function for star placement
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Star field layer - creates procedural stars at different scales
float starField(vec2 uv, float scale, float threshold) {
  vec2 grid = floor(uv * scale);
  vec2 f = fract(uv * scale);

  float stars = 0.0;

  // Check 3x3 neighborhood for stars
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 neighbor = vec2(float(x), float(y));
      vec2 cellId = grid + neighbor;

      // Random position within cell
      float h = hash(cellId);
      vec2 starPos = vec2(hash(cellId + 0.1), hash(cellId + 0.2));

      // Only create star if hash passes threshold (controls density)
      if (h > threshold) {
        vec2 diff = neighbor + starPos - f;
        float dist = length(diff);

        // Star brightness varies by hash
        float brightness = smoothstep(0.04, 0.0, dist) * (0.5 + 0.5 * hash(cellId + 0.3));

        // Subtle twinkle
        float twinkle = 0.8 + 0.2 * sin(time * (2.0 + hash(cellId + 0.4) * 3.0) + h * 6.28);

        stars += brightness * twinkle;
      }
    }
  }

  return stars;
}

void main() {
  // Deep space base colors - Kurzgesagt purple theme
  // #0d0a1a = rgb(13, 10, 26) / 255 = (0.051, 0.039, 0.102)
  // #1a1040 = rgb(26, 16, 64) / 255 = (0.102, 0.063, 0.251)
  // #2d1b69 = rgb(45, 27, 105) / 255 = (0.176, 0.106, 0.412)
  vec3 spaceDeep = vec3(0.051, 0.039, 0.102);   // Deep purple-black (#0d0a1a)
  vec3 spaceMid = vec3(0.102, 0.063, 0.251);    // Dark purple-navy (#1a1040)
  vec3 spaceLight = vec3(0.176, 0.106, 0.412);  // Lighter purple (#2d1b69)

  // Vertical gradient for sky
  float y = vUv.y;
  vec3 spaceColor = mix(spaceDeep, spaceMid, smoothstep(0.0, 0.5, y));
  spaceColor = mix(spaceColor, spaceLight, smoothstep(0.3, 0.8, y) * 0.5);

  // Milky Way band - diagonal stripe across sky
  float milkyWayAngle = 0.3;
  vec2 rotatedUv = vec2(
    vUv.x * cos(milkyWayAngle) - vUv.y * sin(milkyWayAngle),
    vUv.x * sin(milkyWayAngle) + vUv.y * cos(milkyWayAngle)
  );

  // Milky Way noise
  float milkyNoise = fbm(rotatedUv * 3.0 + vec2(time * 0.01, 0.0), 3);
  float milkyBand = smoothstep(0.3, 0.5, rotatedUv.y) * smoothstep(0.7, 0.5, rotatedUv.y);
  milkyBand *= (0.5 + milkyNoise * 0.5);

  // Milky Way - Kurzgesagt purple-gold tint
  // #3d2080 = rgb(61, 32, 128) / 255 = (0.239, 0.125, 0.502)
  vec3 milkyColor = vec3(0.239, 0.125, 0.502); // Vibrant purple (#3d2080)
  spaceColor = mix(spaceColor, milkyColor, milkyBand * milkyWayIntensity * 0.4);

  // Nebula clouds - Kurzgesagt colored gas clouds
  vec2 nebulaUv1 = vUv * 2.0 + vec2(time * 0.005, time * 0.003);
  vec2 nebulaUv2 = vUv * 1.5 + vec2(-time * 0.003, time * 0.004);

  float nebula1 = fbm(nebulaUv1, 3);
  float nebula2 = fbm(nebulaUv2, 3);

  // Nebula colors - vibrant purple and golden accents (Kurzgesagt style)
  // Purple nebula: #3d2080 tinted
  // Gold accent: #ffb300 tinted (subtle warm glow)
  vec3 nebulaColor1 = vec3(0.24, 0.08, 0.32) * (nebula1 * 0.5 + 0.5);  // Purple
  vec3 nebulaColor2 = vec3(0.30, 0.20, 0.08) * (nebula2 * 0.5 + 0.5);  // Golden

  float nebulaMask = smoothstep(0.2, 0.6, nebula1 * nebula2 + 0.3);
  spaceColor += (nebulaColor1 + nebulaColor2) * nebulaMask * nebulaIntensity * 0.3;

  // Star layers - multiple scales for depth
  float stars = 0.0;
  stars += starField(vUv, 80.0, 0.97) * 0.8;   // Bright sparse stars
  stars += starField(vUv, 150.0, 0.95) * 0.5;  // Medium stars
  stars += starField(vUv, 300.0, 0.92) * 0.3;  // Dim dense stars
  stars += starField(vUv, 500.0, 0.88) * 0.15; // Very dim star dust

  // Star color - slight blue-white tint
  vec3 starColor = vec3(0.9, 0.95, 1.0);
  spaceColor += starColor * stars;

  // Vignette
  vec2 vignetteUv = vUv * 2.0 - 1.0;
  float vignette = 1.0 - dot(vignetteUv * 0.4, vignetteUv * 0.4);
  spaceColor *= mix(0.6, 1.0, vignette);

  gl_FragColor = vec4(spaceColor, 1.0);
}
`;

interface GalaxyBackgroundProps {
  /** Nebula cloud intensity @default 0.8 */
  nebulaIntensity?: number;
  /** Milky Way band intensity @default 0.6 */
  milkyWayIntensity?: number;
}

function GalaxyBackgroundComponent({
  nebulaIntensity = 0.8,
  milkyWayIntensity = 0.6,
}: GalaxyBackgroundProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(() => new PlaneGeometry(2, 2), []);

  const material = useMemo(() => {
    return new ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        nebulaIntensity: { value: nebulaIntensity },
        milkyWayIntensity: { value: milkyWayIntensity },
      },
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
      side: DoubleSide,
    });
  }, [nebulaIntensity, milkyWayIntensity]);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
  });

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

export const GalaxyBackground = memo(GalaxyBackgroundComponent);
export default GalaxyBackground;
