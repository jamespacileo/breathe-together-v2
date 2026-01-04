/**
 * Sun - Stylized sun with glowing corona and subtle pulsation
 *
 * Features:
 * - Multi-layered glow effect for realistic corona
 * - Subtle breathing-synchronized pulsation
 * - Lens flare rays
 * - Positioned accurately relative to scene center
 */

import { useFrame } from '@react-three/fiber';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

interface SunProps {
  /** Sun position in world space @default [60, 30, -40] */
  position?: [number, number, number];
  /** Core sun radius @default 4 */
  radius?: number;
  /** Sun color (core) @default '#fff8e0' */
  coreColor?: string;
  /** Corona color @default '#ffaa33' */
  coronaColor?: string;
  /** Overall intensity @default 1.0 */
  intensity?: number;
  /** Enable subtle pulsation @default true */
  pulsate?: boolean;
  /** Enable visibility @default true */
  visible?: boolean;
}

// Sun core shader - solid glowing center
const coreVertexShader = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

const coreFragmentShader = `
uniform vec3 coreColor;
uniform float time;
uniform float intensity;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

// Simple noise for surface detail
float noise(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec3 viewDir = normalize(vViewPosition);
  float fresnel = 1.0 - abs(dot(viewDir, vNormal));

  // Core glow - brightest at center
  float coreBrightness = 1.0 - fresnel * 0.3;

  // Surface granulation effect
  vec2 surfaceUv = vUv * 20.0 + time * 0.1;
  float granulation = noise(surfaceUv) * 0.1;

  // Subtle pulsation
  float pulse = 1.0 + sin(time * 0.5) * 0.02;

  vec3 color = coreColor * coreBrightness * intensity * pulse;
  color += granulation * coreColor * 0.5;

  // Edge darkening for limb effect
  float limb = smoothstep(0.0, 0.5, fresnel);
  color *= (1.0 - limb * 0.2);

  gl_FragColor = vec4(color, 1.0);
}
`;

// Corona glow shader - outer atmosphere
const coronaVertexShader = `
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

const coronaFragmentShader = `
uniform vec3 coronaColor;
uniform float time;
uniform float intensity;

varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vec3 viewDir = normalize(vViewPosition);
  float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 3.0);

  // Corona brightness peaks at edges
  float coronaBrightness = fresnel * intensity;

  // Subtle animated variation
  float variation = sin(time * 0.3) * 0.1 + 1.0;

  vec3 color = coronaColor * coronaBrightness * variation;

  // Fade to transparent at inner edge
  float alpha = fresnel * 0.8;

  gl_FragColor = vec4(color, alpha);
}
`;

// Ray shader for lens flare effect
const rayVertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const rayFragmentShader = `
uniform float time;
uniform float intensity;
uniform vec3 rayColor;

varying vec2 vUv;

void main() {
  vec2 center = vUv - 0.5;
  float angle = atan(center.y, center.x);
  float dist = length(center);

  // Create ray pattern
  float rays = sin(angle * 8.0 + time * 0.2) * 0.5 + 0.5;
  rays = pow(rays, 4.0);

  // Fade from center
  float fade = smoothstep(0.5, 0.0, dist);

  // Additional subtle rays
  float rays2 = sin(angle * 16.0 - time * 0.3) * 0.5 + 0.5;
  rays2 = pow(rays2, 8.0) * 0.3;

  float alpha = (rays + rays2) * fade * intensity * 0.3;

  gl_FragColor = vec4(rayColor, alpha);
}
`;

export const Sun = memo(function Sun({
  position = [60, 30, -40],
  radius = 4,
  coreColor = '#fff8e0',
  coronaColor = '#ffaa33',
  intensity = 1.0,
  pulsate = true,
  visible = true,
}: SunProps) {
  const groupRef = useRef<THREE.Group>(null);
  const coreMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const coronaMaterial1Ref = useRef<THREE.ShaderMaterial>(null);
  const coronaMaterial2Ref = useRef<THREE.ShaderMaterial>(null);
  const coronaMaterial3Ref = useRef<THREE.ShaderMaterial>(null);
  const rayMaterialRef = useRef<THREE.ShaderMaterial>(null);

  // Create geometries
  const coreGeometry = useMemo(() => new THREE.SphereGeometry(radius, 32, 32), [radius]);
  const corona1Geometry = useMemo(() => new THREE.SphereGeometry(radius * 1.2, 32, 32), [radius]);
  const corona2Geometry = useMemo(() => new THREE.SphereGeometry(radius * 1.5, 32, 32), [radius]);
  const corona3Geometry = useMemo(() => new THREE.SphereGeometry(radius * 2.0, 32, 32), [radius]);
  const rayGeometry = useMemo(() => new THREE.PlaneGeometry(radius * 8, radius * 8), [radius]);

  // Create materials
  const coreMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          coreColor: { value: new THREE.Color(coreColor) },
          time: { value: 0 },
          intensity: { value: intensity },
        },
        vertexShader: coreVertexShader,
        fragmentShader: coreFragmentShader,
      }),
    [coreColor, intensity],
  );

  const createCoronaMaterial = useCallback(
    (intensityMultiplier: number) =>
      new THREE.ShaderMaterial({
        uniforms: {
          coronaColor: { value: new THREE.Color(coronaColor) },
          time: { value: 0 },
          intensity: { value: intensity * intensityMultiplier },
        },
        vertexShader: coronaVertexShader,
        fragmentShader: coronaFragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    [coronaColor, intensity],
  );

  const coronaMaterial1 = useMemo(() => createCoronaMaterial(1.0), [createCoronaMaterial]);
  const coronaMaterial2 = useMemo(() => createCoronaMaterial(0.6), [createCoronaMaterial]);
  const coronaMaterial3 = useMemo(() => createCoronaMaterial(0.3), [createCoronaMaterial]);

  const rayMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          intensity: { value: intensity },
          rayColor: { value: new THREE.Color(coreColor) },
        },
        vertexShader: rayVertexShader,
        fragmentShader: rayFragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [coreColor, intensity],
  );

  // Animation
  useFrame((state) => {
    if (!pulsate) return;

    const time = state.clock.elapsedTime;

    if (coreMaterialRef.current) {
      coreMaterialRef.current.uniforms.time.value = time;
    }
    if (coronaMaterial1Ref.current) {
      coronaMaterial1Ref.current.uniforms.time.value = time;
    }
    if (coronaMaterial2Ref.current) {
      coronaMaterial2Ref.current.uniforms.time.value = time;
    }
    if (coronaMaterial3Ref.current) {
      coronaMaterial3Ref.current.uniforms.time.value = time;
    }
    if (rayMaterialRef.current) {
      rayMaterialRef.current.uniforms.time.value = time;
    }
  });

  // Cleanup
  useEffect(() => {
    return () => {
      coreGeometry.dispose();
      corona1Geometry.dispose();
      corona2Geometry.dispose();
      corona3Geometry.dispose();
      rayGeometry.dispose();
      coreMaterial.dispose();
      coronaMaterial1.dispose();
      coronaMaterial2.dispose();
      coronaMaterial3.dispose();
      rayMaterial.dispose();
    };
  }, [
    coreGeometry,
    corona1Geometry,
    corona2Geometry,
    corona3Geometry,
    rayGeometry,
    coreMaterial,
    coronaMaterial1,
    coronaMaterial2,
    coronaMaterial3,
    rayMaterial,
  ]);

  if (!visible) return null;

  return (
    <group ref={groupRef} position={position}>
      {/* Core sun */}
      <mesh geometry={coreGeometry}>
        <primitive object={coreMaterial} ref={coreMaterialRef} attach="material" />
      </mesh>

      {/* Corona layers (rendered from back to front) */}
      <mesh geometry={corona3Geometry}>
        <primitive object={coronaMaterial3} ref={coronaMaterial3Ref} attach="material" />
      </mesh>
      <mesh geometry={corona2Geometry}>
        <primitive object={coronaMaterial2} ref={coronaMaterial2Ref} attach="material" />
      </mesh>
      <mesh geometry={corona1Geometry}>
        <primitive object={coronaMaterial1} ref={coronaMaterial1Ref} attach="material" />
      </mesh>

      {/* Lens flare rays - billboard facing camera */}
      <mesh geometry={rayGeometry} rotation={[0, 0, 0]}>
        <primitive object={rayMaterial} ref={rayMaterialRef} attach="material" />
      </mesh>

      {/* Point light for scene illumination */}
      <pointLight color={coreColor} intensity={intensity * 2} distance={200} decay={2} />
    </group>
  );
});

export default Sun;
