/**
 * ParallaxCloudLayers - Multi-depth cloud layers for enhanced depth perception
 *
 * Creates multiple layers of soft clouds at different depths, each moving
 * at speeds proportional to their distance (parallax effect).
 *
 * Key techniques:
 * - Closer layers move faster, distant layers crawl slowly
 * - Color temperature shifts cooler with distance
 * - Opacity and blur increase with distance (atmospheric haze)
 * - Scale increases with distance to maintain apparent size
 *
 * This creates the illusion of vast space between layers.
 */

import { useFrame } from '@react-three/fiber';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

interface ParallaxCloudLayersProps {
  /** Base opacity @default 0.12 */
  opacity?: number;
  /** Enable parallax clouds @default true */
  enabled?: boolean;
}

const cloudVertexShader = `
  varying vec2 vUv;
  varying float vWorldY;

  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldY = worldPos.y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const cloudFragmentShader = `
  varying vec2 vUv;
  varying float vWorldY;
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uColor;
  uniform float uScrollSpeed;
  uniform float uDepthFade;

  // Simplex noise
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
    f += 0.2500 * snoise(p);
    return f / 0.75;
  }

  void main() {
    // Scrolling UV for cloud movement
    vec2 scrollUv = vUv + vec2(uTime * uScrollSpeed, 0.0);

    // Create soft cloud shapes
    float cloud1 = fbm(scrollUv * 2.0);
    float cloud2 = fbm(scrollUv * 1.5 + vec2(50.0, 30.0));

    float clouds = cloud1 * 0.6 + cloud2 * 0.4;
    clouds = smoothstep(0.2, 0.6, clouds);

    // Vertical fade - clouds mostly in upper portion
    float vertFade = smoothstep(-0.3, 0.2, vUv.y) * smoothstep(1.0, 0.7, vUv.y);

    // Horizontal soft edges
    float horizFade = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x);

    // Depth-based fade (atmospheric perspective)
    float depthAlpha = 1.0 - uDepthFade * 0.5;

    // Breathing sync
    float breathPhase = mod(uTime, 19.0) / 19.0;
    float breathMod = 0.8 + sin(breathPhase * 6.28) * 0.2;

    float alpha = clouds * vertFade * horizFade * uOpacity * depthAlpha * breathMod;

    gl_FragColor = vec4(uColor, alpha);
  }
`;

interface CloudLayerConfig {
  id: string;
  z: number;
  y: number;
  width: number;
  height: number;
  scrollSpeed: number;
  color: string;
  depthFade: number; // 0 = no fade, 1 = full atmospheric fade
  opacityMult: number;
}

// Cloud layers from front to back
// Further layers: slower, cooler colors, more faded
const CLOUD_LAYER_CONFIGS: CloudLayerConfig[] = [
  // Near layer - warm, fast, more opaque
  {
    id: 'cloud-near',
    z: -35,
    y: 8,
    width: 60,
    height: 25,
    scrollSpeed: 0.015,
    color: '#f8f0e8', // Warm white
    depthFade: 0,
    opacityMult: 1.0,
  },
  // Mid-near layer
  {
    id: 'cloud-mid-near',
    z: -50,
    y: 10,
    width: 80,
    height: 30,
    scrollSpeed: 0.008,
    color: '#f0ece8', // Slightly cooler
    depthFade: 0.25,
    opacityMult: 0.85,
  },
  // Mid layer
  {
    id: 'cloud-mid',
    z: -70,
    y: 12,
    width: 100,
    height: 35,
    scrollSpeed: 0.005,
    color: '#e8ece8', // Neutral
    depthFade: 0.5,
    opacityMult: 0.7,
  },
  // Far layer
  {
    id: 'cloud-far',
    z: -100,
    y: 14,
    width: 130,
    height: 40,
    scrollSpeed: 0.003,
    color: '#e0e4e8', // Cool tint
    depthFade: 0.75,
    opacityMult: 0.5,
  },
  // Distant layer - barely visible, atmospheric
  {
    id: 'cloud-distant',
    z: -140,
    y: 16,
    width: 160,
    height: 50,
    scrollSpeed: 0.001,
    color: '#d8dce0', // Desaturated cool
    depthFade: 1.0,
    opacityMult: 0.3,
  },
];

const CloudLayer = memo(function CloudLayer({
  config,
  baseOpacity,
}: {
  config: CloudLayerConfig;
  baseOpacity: number;
}) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(
    () => new THREE.PlaneGeometry(config.width, config.height),
    [config.width, config.height],
  );

  const material = useMemo(() => {
    const color = new THREE.Color(config.color);
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: baseOpacity * config.opacityMult },
        uColor: { value: color },
        uScrollSpeed: { value: config.scrollSpeed },
        uDepthFade: { value: config.depthFade },
      },
      vertexShader: cloudVertexShader,
      fragmentShader: cloudFragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }, [baseOpacity, config]);

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

  return (
    <mesh position={[0, config.y, config.z]} geometry={geometry} frustumCulled={false}>
      <primitive object={material} ref={materialRef} attach="material" />
    </mesh>
  );
});

export const ParallaxCloudLayers = memo(function ParallaxCloudLayers({
  opacity = 0.12,
  enabled = true,
}: ParallaxCloudLayersProps) {
  if (!enabled) return null;

  return (
    <group>
      {CLOUD_LAYER_CONFIGS.map((config) => (
        <CloudLayer key={config.id} config={config} baseOpacity={opacity} />
      ))}
    </group>
  );
});

export default ParallaxCloudLayers;
