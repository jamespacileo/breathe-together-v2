/**
 * Skydome - Large sphere surrounding the scene for infinite sky feeling
 *
 * Features:
 * - Gradient from horizon to zenith (warmer at horizon, cooler at top)
 * - Subtle animated clouds painted on the dome
 * - Very distant placement (radius 150+) to avoid parallax with near objects
 * - Inner-facing normals (renders on inside of sphere)
 *
 * This provides a visual "container" for the scene that suggests infinite space
 * while maintaining the Monument Valley pastel aesthetic.
 */

import { useFrame } from '@react-three/fiber';
import { memo, useMemo, useRef } from 'react';
import * as THREE from 'three';

// Skydome vertex shader
const skydomeVertexShader = `
varying vec3 vWorldPosition;
varying vec3 vNormal;
varying vec2 vUv;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);

  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;

  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

// Skydome fragment shader - gradient sky with subtle clouds
const skydomeFragmentShader = `
uniform float time;
uniform vec3 zenithColor;
uniform vec3 horizonColor;
uniform vec3 nadirColor;
uniform float cloudDensity;
uniform float cloudSpeed;

varying vec3 vWorldPosition;
varying vec3 vNormal;
varying vec2 vUv;

// Simplex noise for clouds
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

float fbm(vec2 p) {
  float f = 0.0;
  f += 0.5000 * snoise(p); p *= 2.02;
  f += 0.2500 * snoise(p); p *= 2.03;
  f += 0.1250 * snoise(p);
  return f / 0.875;
}

void main() {
  // Get vertical position for gradient (-1 = nadir, 0 = horizon, 1 = zenith)
  vec3 direction = normalize(vWorldPosition);
  float elevation = direction.y;

  // Sky gradient - three-way blend
  vec3 skyColor;
  if (elevation > 0.0) {
    // Above horizon: blend horizon to zenith
    float t = smoothstep(0.0, 0.8, elevation);
    skyColor = mix(horizonColor, zenithColor, t);
  } else {
    // Below horizon: blend horizon to nadir (ground reflection)
    float t = smoothstep(0.0, -0.5, elevation);
    skyColor = mix(horizonColor, nadirColor, t);
  }

  // Cloud layer - only above horizon
  if (elevation > -0.1) {
    // Convert direction to UV for cloud sampling
    vec2 cloudUv = vec2(
      atan(direction.z, direction.x) / (2.0 * 3.14159) + 0.5,
      elevation * 0.5 + 0.5
    );

    // Animated cloud noise
    vec2 animatedUv = cloudUv * 3.0 + vec2(time * cloudSpeed, 0.0);
    float clouds = fbm(animatedUv);

    // Second cloud layer moving differently
    vec2 animatedUv2 = cloudUv * 2.0 - vec2(time * cloudSpeed * 0.7, time * 0.01);
    float clouds2 = fbm(animatedUv2 + 50.0);

    // Combine and threshold for wispy effect
    float cloudPattern = smoothstep(0.2, 0.6, (clouds + clouds2) * 0.5);

    // Fade clouds near horizon and zenith
    float cloudMask = smoothstep(-0.1, 0.2, elevation) * smoothstep(0.9, 0.4, elevation);
    cloudPattern *= cloudMask * cloudDensity;

    // Cloud color - slightly brighter than sky
    vec3 cloudColor = mix(skyColor, vec3(1.0, 0.99, 0.97), 0.5);

    // Blend clouds into sky
    skyColor = mix(skyColor, cloudColor, cloudPattern);
  }

  gl_FragColor = vec4(skyColor, 1.0);
}
`;

interface SkydomeProps {
  /** Zenith color (top of sky) @default '#e8e4f0' */
  zenithColor?: string;
  /** Horizon color (where sky meets "ground") @default '#f8f0e8' */
  horizonColor?: string;
  /** Nadir color (below horizon - reflected ground) @default '#f0e8e0' */
  nadirColor?: string;
  /** Dome radius @default 200 */
  radius?: number;
  /** Cloud density (0-1) @default 0.15 */
  cloudDensity?: number;
  /** Cloud animation speed @default 0.01 */
  cloudSpeed?: number;
  /** Enable skydome @default true */
  enabled?: boolean;
}

/**
 * Skydome - Large gradient sphere for infinite sky illusion
 */
export const Skydome = memo(function Skydome({
  zenithColor = '#e8e4f0',
  horizonColor = '#f8f0e8',
  nadirColor = '#f0e8e0',
  radius = 200,
  cloudDensity = 0.15,
  cloudSpeed = 0.01,
  enabled = true,
}: SkydomeProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Create geometry with inverted normals (render inside)
  const geometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(radius, 64, 32);
    // Flip faces to render inside
    geo.scale(-1, 1, 1);
    return geo;
  }, [radius]);

  // Create shader material
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          zenithColor: { value: new THREE.Color(zenithColor) },
          horizonColor: { value: new THREE.Color(horizonColor) },
          nadirColor: { value: new THREE.Color(nadirColor) },
          cloudDensity: { value: cloudDensity },
          cloudSpeed: { value: cloudSpeed },
        },
        vertexShader: skydomeVertexShader,
        fragmentShader: skydomeFragmentShader,
        side: THREE.FrontSide, // Front side because normals are inverted
        depthWrite: false,
      }),
    [zenithColor, horizonColor, nadirColor, cloudDensity, cloudSpeed],
  );

  // Animate time
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  if (!enabled) return null;

  return (
    <mesh geometry={geometry} name="Skydome">
      <primitive object={material} ref={materialRef} attach="material" />
    </mesh>
  );
});

export default Skydome;
