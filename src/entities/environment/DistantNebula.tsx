/**
 * DistantNebula - Far background cosmic clouds for depth and vastness
 *
 * Creates layered nebula-like formations at extreme distance,
 * giving the scene a sense of being in a vast cosmic space.
 *
 * Techniques used:
 * - Multiple depth layers with parallax movement
 * - Atmospheric perspective (reduced saturation/contrast with distance)
 * - Slow, subtle animation for organic feel
 * - Breathing-synchronized luminosity
 *
 * Inspired by Journey's atmospheric layering and Monument Valley's sense of scale.
 */

import { useFrame } from '@react-three/fiber';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

interface DistantNebulaProps {
  /** Base opacity @default 0.15 */
  opacity?: number;
  /** Enable nebula @default true */
  enabled?: boolean;
}

const nebulaVertexShader = `
  varying vec2 vUv;
  varying float vDepth;
  uniform float uParallaxOffset;

  void main() {
    vUv = uv;

    // Apply parallax offset based on layer
    vec3 pos = position;
    pos.x += uParallaxOffset * 0.1;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    vDepth = -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const nebulaFragmentShader = `
  varying vec2 vUv;
  varying float vDepth;
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform float uLayerDepth;

  // Simplex noise for organic cloud patterns
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

  // FBM for layered noise
  float fbm(vec2 p) {
    float f = 0.0;
    f += 0.5000 * snoise(p); p *= 2.02;
    f += 0.2500 * snoise(p); p *= 2.03;
    f += 0.1250 * snoise(p);
    return f / 0.875;
  }

  void main() {
    // Scale UV based on layer depth (further = larger scale = slower detail)
    float depthScale = 1.0 + uLayerDepth * 0.5;
    vec2 scaledUv = vUv * depthScale;

    // Animate UV very slowly for drift
    vec2 animUv = scaledUv + vec2(uTime * 0.01, uTime * 0.005);

    // Create cloud-like patterns with multiple octaves
    float noise1 = fbm(animUv * 1.5);
    float noise2 = fbm(animUv * 0.8 + vec2(100.0, 50.0));
    float noise3 = fbm(animUv * 2.5 + vec2(uTime * 0.02, 0.0));

    // Combine noises for nebula texture
    float nebula = noise1 * 0.5 + noise2 * 0.35 + noise3 * 0.15;
    nebula = smoothstep(0.1, 0.7, nebula);

    // Vignette - fade at edges
    vec2 center = vUv - 0.5;
    float vignette = 1.0 - dot(center * 1.2, center * 1.2);
    vignette = smoothstep(0.0, 0.5, vignette);

    // Atmospheric perspective - further layers are more desaturated
    float atmosphereFade = 1.0 - uLayerDepth * 0.3;

    // Color mixing based on noise
    vec3 color = mix(uColor1, uColor2, noise2);

    // Desaturate with distance (atmospheric perspective)
    vec3 desatColor = vec3(dot(color, vec3(0.299, 0.587, 0.114)));
    color = mix(color, desatColor, uLayerDepth * 0.4);

    // Breathing synchronization (19s cycle)
    float breathPhase = mod(uTime, 19.0) / 19.0;
    float breathMod = 0.7 + sin(breathPhase * 6.28) * 0.3;

    // Final alpha
    float alpha = nebula * vignette * uOpacity * atmosphereFade * breathMod;

    gl_FragColor = vec4(color, alpha);
  }
`;

interface NebulaLayerConfig {
  id: string;
  depth: number; // 0 = closest, 1 = furthest
  z: number;
  scale: number;
  color1: string;
  color2: string;
  speed: number;
}

// Multiple layers at different depths for parallax effect
const NEBULA_LAYERS: NebulaLayerConfig[] = [
  // Closest layer - more saturated, faster movement
  {
    id: 'nebula-near',
    depth: 0,
    z: -60,
    scale: 50,
    color1: '#d4c8e8', // Soft lavender
    color2: '#e8d4c8', // Warm peach
    speed: 0.015,
  },
  // Middle layer
  {
    id: 'nebula-mid',
    depth: 0.5,
    z: -80,
    scale: 70,
    color1: '#c8d4e8', // Soft blue
    color2: '#d8c8d4', // Dusty rose
    speed: 0.008,
  },
  // Furthest layer - desaturated, slowest
  {
    id: 'nebula-far',
    depth: 1,
    z: -120,
    scale: 100,
    color1: '#d8d4d0', // Warm gray
    color2: '#d0d4d8', // Cool gray
    speed: 0.004,
  },
];

const NebulaLayer = memo(function NebulaLayer({
  config,
  baseOpacity,
}: {
  config: NebulaLayerConfig;
  baseOpacity: number;
}) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(
    () => new THREE.PlaneGeometry(config.scale, config.scale * 0.6),
    [config.scale],
  );

  const material = useMemo(() => {
    const color1 = new THREE.Color(config.color1);
    const color2 = new THREE.Color(config.color2);
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: baseOpacity * (1 - config.depth * 0.3) },
        uColor1: { value: color1 },
        uColor2: { value: color2 },
        uLayerDepth: { value: config.depth },
        uParallaxOffset: { value: 0 },
      },
      vertexShader: nebulaVertexShader,
      fragmentShader: nebulaFragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
  }, [config.color1, config.color2, config.depth, baseOpacity]);

  useFrame((state) => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime * config.speed * 10;
  });

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  return (
    <mesh
      ref={meshRef}
      position={[0, 5 - config.depth * 3, config.z]}
      geometry={geometry}
      frustumCulled={false}
    >
      <primitive object={material} ref={materialRef} attach="material" />
    </mesh>
  );
});

export const DistantNebula = memo(function DistantNebula({
  opacity = 0.15,
  enabled = true,
}: DistantNebulaProps) {
  if (!enabled) return null;

  return (
    <group>
      {NEBULA_LAYERS.map((config) => (
        <NebulaLayer key={config.id} config={config} baseOpacity={opacity} />
      ))}
    </group>
  );
});

export default DistantNebula;
