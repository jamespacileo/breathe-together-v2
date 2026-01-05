/**
 * DepthLayers - Multi-layer parallax elements for 3D depth perception
 *
 * Creates visual depth cues by rendering elements at various distances:
 * - Far layer: Distant nebula/cosmic clouds (z=-80 to -120)
 * - Mid layer: Atmospheric haze bands (z=-40 to -60)
 * - Near layer: Subtle floating particles (z=-15 to -25)
 *
 * Each layer moves with different parallax speeds when the scene rotates,
 * creating a convincing sense of infinite space around the globe.
 */

import { useFrame } from '@react-three/fiber';
import { memo, useMemo, useRef } from 'react';
import * as THREE from 'three';

// Vertex shader for parallax planes
const parallaxVertexShader = `
varying vec2 vUv;
varying float vDepth;

void main() {
  vUv = uv;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vDepth = -mvPosition.z;
  gl_Position = projectionMatrix * mvPosition;
}
`;

// Fragment shader for distant nebula clouds
const nebulaFragmentShader = `
uniform float time;
uniform vec3 color1;
uniform vec3 color2;
uniform float opacity;

varying vec2 vUv;

// Simplex noise for cloud patterns
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
  // Animated noise for nebula clouds
  vec2 uv = vUv * 2.0;
  float n1 = fbm(uv + time * 0.01);
  float n2 = fbm(uv * 1.5 - time * 0.008 + 50.0);

  // Create wispy cloud shapes
  float clouds = smoothstep(0.1, 0.6, n1 * 0.5 + n2 * 0.5);

  // Edge fade for smooth blending
  float edgeFade = smoothstep(0.0, 0.3, vUv.x) * smoothstep(1.0, 0.7, vUv.x);
  edgeFade *= smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.7, vUv.y);

  // Mix two colors for depth
  vec3 color = mix(color1, color2, n1 * 0.5 + 0.5);

  float alpha = clouds * edgeFade * opacity;
  gl_FragColor = vec4(color, alpha);
}
`;

// Fragment shader for atmospheric haze bands
const hazeFragmentShader = `
uniform float time;
uniform vec3 color;
uniform float opacity;

varying vec2 vUv;

void main() {
  // Horizontal bands with slight wave
  float wave = sin(vUv.x * 3.14159 * 2.0 + time * 0.1) * 0.05;
  float band = smoothstep(0.3, 0.5, vUv.y + wave) * smoothstep(0.7, 0.5, vUv.y + wave);

  // Edge fade
  float edgeFade = smoothstep(0.0, 0.4, vUv.x) * smoothstep(1.0, 0.6, vUv.x);

  float alpha = band * edgeFade * opacity;
  gl_FragColor = vec4(color, alpha);
}
`;

interface DepthLayersProps {
  /** Enable depth layers @default true */
  enabled?: boolean;
  /** Far nebula opacity @default 0.15 */
  nebulaOpacity?: number;
  /** Mid haze opacity @default 0.08 */
  hazeOpacity?: number;
}

/**
 * NebulaLayer - Distant cosmic cloud sprite
 */
const NebulaLayer = memo(function NebulaLayer({
  position,
  rotation,
  scale,
  color1,
  color2,
  opacity,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color1: string;
  color2: string;
  opacity: number;
}) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          color1: { value: new THREE.Color(color1) },
          color2: { value: new THREE.Color(color2) },
          opacity: { value: opacity },
        },
        vertexShader: parallaxVertexShader,
        fragmentShader: nebulaFragmentShader,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
    [color1, color2, opacity],
  );

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  return (
    <mesh position={position} rotation={rotation} scale={scale}>
      <planeGeometry args={[1, 1, 1, 1]} />
      <primitive object={material} ref={materialRef} attach="material" />
    </mesh>
  );
});

/**
 * HazeLayer - Atmospheric haze band
 */
const HazeLayer = memo(function HazeLayer({
  position,
  rotation,
  scale,
  color,
  opacity,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
  opacity: number;
}) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          color: { value: new THREE.Color(color) },
          opacity: { value: opacity },
        },
        vertexShader: parallaxVertexShader,
        fragmentShader: hazeFragmentShader,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [color, opacity],
  );

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  return (
    <mesh position={position} rotation={rotation} scale={scale}>
      <planeGeometry args={[1, 1, 1, 1]} />
      <primitive object={material} ref={materialRef} attach="material" />
    </mesh>
  );
});

/**
 * DepthLayers - Creates depth perception through parallax planes
 *
 * Places multiple transparent planes at various distances to create
 * a sense of vast space. All elements are inside MomentumControls
 * so they rotate with the scene, creating natural parallax motion.
 */
export const DepthLayers = memo(function DepthLayers({
  enabled = true,
  nebulaOpacity = 0.15,
  hazeOpacity = 0.08,
}: DepthLayersProps) {
  if (!enabled) return null;

  return (
    <group name="Depth Layers">
      {/* FAR LAYER: Distant nebulae (z = -80 to -120) */}
      {/* These create the sense of infinite space behind the globe */}

      {/* Large warm nebula - upper right */}
      <NebulaLayer
        position={[25, 15, -100]}
        rotation={[0, -0.3, 0.1]}
        scale={[60, 40, 1]}
        color1="#f8d4c8"
        color2="#e8c4d8"
        opacity={nebulaOpacity}
      />

      {/* Cool nebula - lower left */}
      <NebulaLayer
        position={[-30, -10, -90]}
        rotation={[0, 0.2, -0.1]}
        scale={[50, 35, 1]}
        color1="#c8d8f0"
        color2="#d4e8e8"
        opacity={nebulaOpacity * 0.8}
      />

      {/* Distant small nebula - center back */}
      <NebulaLayer
        position={[0, 5, -120]}
        rotation={[0.1, 0, 0]}
        scale={[80, 50, 1]}
        color1="#e8e4dc"
        color2="#dcd8e8"
        opacity={nebulaOpacity * 0.5}
      />

      {/* MID LAYER: Atmospheric haze bands (z = -40 to -60) */}
      {/* These add horizontal layering like distant mountain ranges */}

      {/* Upper haze band */}
      <HazeLayer
        position={[0, 20, -50]}
        rotation={[0, 0, 0]}
        scale={[100, 15, 1]}
        color="#f0e8e0"
        opacity={hazeOpacity}
      />

      {/* Lower haze band */}
      <HazeLayer
        position={[0, -15, -45]}
        rotation={[0.05, 0, 0]}
        scale={[90, 12, 1]}
        color="#e8e0d8"
        opacity={hazeOpacity * 0.7}
      />

      {/* Side haze - left */}
      <HazeLayer
        position={[-35, 0, -55]}
        rotation={[0, 0.4, 0.1]}
        scale={[40, 50, 1]}
        color="#dce8e4"
        opacity={hazeOpacity * 0.5}
      />

      {/* Side haze - right */}
      <HazeLayer
        position={[35, 5, -55]}
        rotation={[0, -0.4, -0.1]}
        scale={[40, 50, 1]}
        color="#e8dce4"
        opacity={hazeOpacity * 0.5}
      />
    </group>
  );
});

export default DepthLayers;
