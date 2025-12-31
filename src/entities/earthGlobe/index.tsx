/**
 * EarthGlobe - Central core visualization (stylized textured earth)
 *
 * Features:
 * - Stylized earth texture with pastel teal oceans and warm landmasses
 * - Subtle pulse animation (1.0 → 1.06, 6% scale change)
 * - Slow Y-axis rotation
 * - Soft fresnel rim for atmospheric glow
 * - Layered atmosphere halo (3 pastel-colored translucent spheres)
 * - Inner glow (additive blended fresnel for warm light bloom)
 * - Animated mist layer (noise-based haze that breathes)
 * - Sparkle aura (visible floating dust particles)
 * - Equator ring (subtle rose gold accent ring)
 *
 * Visual style: Monument Valley pastel aesthetic with soft, ethereal glow.
 * Uses drei's <Sphere>, <Ring>, and <Sparkles> components.
 */

import { Ring, Sparkles, Sphere, useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { useDisposeGeometries, useDisposeMaterials } from '../../hooks/useDisposeMaterials';
import { breathPhase } from '../breath/traits';

// Vertex shader for textured globe with fresnel
const globeVertexShader = `
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec2 vUv;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vUv = uv;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

// Fragment shader - texture with fresnel rim glow
const globeFragmentShader = `
uniform sampler2D earthTexture;
uniform float breathPhase;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec2 vUv;

void main() {
  // Sample earth texture
  vec3 texColor = texture2D(earthTexture, vUv).rgb;

  // Fresnel rim for atmospheric glow
  vec3 viewDir = normalize(vViewPosition);
  float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 4.0); // Tighter falloff
  vec3 rimColor = vec3(0.94, 0.90, 0.86); // Muted warm cream, closer to background

  // Breathing modulation - subtle brightness shift
  float breathMod = 1.0 + breathPhase * 0.06;
  texColor *= breathMod;

  // Blend texture with fresnel rim - very subtle
  vec3 finalColor = mix(texColor, rimColor, fresnel * 0.18);

  // Subtle top-down lighting - very gentle
  float topLight = smoothstep(-0.2, 0.8, vNormal.y) * 0.05;
  finalColor += vec3(0.98, 0.95, 0.92) * topLight;

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

// Glow shader - cheap additive fresnel glow
const glowVertexShader = `
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

const glowFragmentShader = `
uniform vec3 glowColor;
uniform float glowIntensity;
uniform float breathPhase;

varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vec3 viewDir = normalize(vViewPosition);
  // Fresnel - softer edges with tighter falloff
  float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 3.5);
  // Breathing pulse - gentler
  float pulse = 1.0 + breathPhase * 0.2;
  float alpha = fresnel * glowIntensity * pulse;
  gl_FragColor = vec4(glowColor, alpha);
}
`;

// Mist shader - subtle animated noise haze
const mistVertexShader = `
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec2 vUv;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vUv = uv;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

const mistFragmentShader = `
uniform float time;
uniform float breathPhase;
uniform vec3 mistColor;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec2 vUv;

// Simple noise function
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
  vec3 viewDir = normalize(vViewPosition);
  float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 1.5);

  // Animated noise for misty effect
  vec2 uv = vUv * 4.0 + time * 0.02;
  float n = noise(uv) * 0.5 + noise(uv * 2.0) * 0.3 + noise(uv * 4.0) * 0.2;

  // Breathing modulation
  float breath = 0.6 + breathPhase * 0.4;

  // Combine fresnel edge with noise
  float alpha = fresnel * n * 0.15 * breath;

  gl_FragColor = vec4(mistColor, alpha);
}
`;

/**
 * Atmosphere halo configuration - pastel layers around the globe
 */
const ATMOSPHERE_LAYERS = [
  { scale: 1.08, color: '#f8d0a8', opacity: 0.08 }, // Inner: warm peach
  { scale: 1.14, color: '#b8e8d4', opacity: 0.05 }, // Middle: soft teal
  { scale: 1.22, color: '#c4b8e8', opacity: 0.03 }, // Outer: pale lavender
];

/**
 * Pre-allocated Color objects for shader uniforms
 * Hoisted to module level to avoid recreation on component remount
 */
const GLOW_COLOR = new THREE.Color('#efe5da'); // Very soft muted cream
const MIST_COLOR = new THREE.Color('#f0ebe6'); // Soft warm white

/**
 * EarthGlobe component props
 */
interface EarthGlobeProps {
  /** Core radius @default 1.5 */
  radius?: number;
  /** Resolution of the sphere (segments) @default 64 */
  resolution?: number;
  /** Enable continuous Y-axis rotation @default true */
  enableRotation?: boolean;
  /** Show atmosphere halo layers @default true */
  showAtmosphere?: boolean;
  /** Show sparkle aura @default true */
  showSparkles?: boolean;
  /** Show equator ring @default true */
  showRing?: boolean;
  /** Sparkle count @default 60 */
  sparkleCount?: number;
  /** Show inner glow effect @default true */
  showGlow?: boolean;
  /** Show mist/haze layer @default true */
  showMist?: boolean;
}

/**
 * EarthGlobe - Renders a stylized textured earth as the central core
 * Uses drei's <Sphere> component for automatic geometry management
 */
export function EarthGlobe({
  radius = 1.5,
  resolution = 64,
  enableRotation = true,
  showAtmosphere = true,
  showSparkles = true,
  showRing = true,
  sparkleCount = 60,
  showGlow = true,
  showMist = true,
}: Partial<EarthGlobeProps> = {}) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const atmosphereRefs = useRef<(THREE.Mesh | null)[]>([]);
  const world = useWorld();

  // Load earth texture using drei's useTexture hook
  const earthTexture = useTexture('/textures/earth-texture.png');

  // Configure texture
  useEffect(() => {
    earthTexture.colorSpace = THREE.SRGBColorSpace;
    earthTexture.anisotropy = 16;
  }, [earthTexture]);

  // Create shader material with texture
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          earthTexture: { value: earthTexture },
          breathPhase: { value: 0 },
        },
        vertexShader: globeVertexShader,
        fragmentShader: globeFragmentShader,
        side: THREE.FrontSide,
      }),
    [earthTexture],
  );

  // Create glow material - additive blended fresnel glow
  // Uses pre-allocated GLOW_COLOR from module level
  const glowMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          glowColor: { value: GLOW_COLOR },
          glowIntensity: { value: 0.25 },
          breathPhase: { value: 0 },
        },
        vertexShader: glowVertexShader,
        fragmentShader: glowFragmentShader,
        side: THREE.FrontSide,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );

  // Create mist material - animated noise haze
  // Uses pre-allocated MIST_COLOR from module level
  const mistMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          breathPhase: { value: 0 },
          mistColor: { value: MIST_COLOR },
        },
        vertexShader: mistVertexShader,
        fragmentShader: mistFragmentShader,
        side: THREE.FrontSide,
        transparent: true,
        depthWrite: false,
      }),
    [],
  );

  // Create memoized atmosphere geometries and materials to prevent GPU leaks
  const atmosphereGeometry = useMemo(() => new THREE.SphereGeometry(radius, 32, 32), [radius]);

  const atmosphereMaterials = useMemo(
    () =>
      ATMOSPHERE_LAYERS.map(
        (layer) =>
          new THREE.MeshBasicMaterial({
            color: layer.color,
            transparent: true,
            opacity: layer.opacity,
            side: THREE.BackSide,
            depthWrite: false,
          }),
      ),
    [],
  );

  // Create memoized ring material to prevent GPU leak
  const ringMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#e8c4b8',
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [],
  );

  // Cleanup all materials on unmount using helper hook
  useDisposeMaterials([material, glowMaterial, mistMaterial, ...atmosphereMaterials, ringMaterial]);

  // Cleanup geometries on unmount
  useDisposeGeometries([atmosphereGeometry]);

  /**
   * Update globe scale, rotation, and shader uniforms
   */
  useFrame((state) => {
    if (!groupRef.current) return;

    try {
      // Get breath phase for animation
      const breathEntity = world.queryFirst(breathPhase);
      if (breathEntity) {
        const phase = breathEntity.get(breathPhase)?.value ?? 0;
        // Update shader uniforms
        material.uniforms.breathPhase.value = phase;
        glowMaterial.uniforms.breathPhase.value = phase;
        mistMaterial.uniforms.breathPhase.value = phase;
        mistMaterial.uniforms.time.value = state.clock.elapsedTime;

        // Subtle pulse: 1.0 to 1.06 (6% scale change)
        const scale = 1.0 + phase * 0.06;
        groupRef.current.scale.set(scale, scale, scale);

        // Animate atmosphere layers with slight phase offset for organic feel
        atmosphereRefs.current.forEach((mesh, i) => {
          if (mesh) {
            const phaseOffset = (i + 1) * 0.15; // Each layer slightly delayed
            const delayedPhase = Math.max(0, phase - phaseOffset);
            const layerScale = ATMOSPHERE_LAYERS[i].scale + delayedPhase * 0.04;
            mesh.scale.set(layerScale, layerScale, layerScale);
          }
        });

        // Animate ring opacity with breathing (use memoized material directly)
        ringMaterial.opacity = 0.12 + phase * 0.08; // 12% to 20%
      }

      // Slow rotation
      if (enableRotation) {
        groupRef.current.rotation.y -= 0.0008;
      }

      // Ring rotates slightly faster and tilted
      if (ringRef.current) {
        ringRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.1) * 0.05;
      }
    } catch {
      // Ignore ECS errors during unmount/remount in Triplex
    }
  });

  return (
    <group ref={groupRef} name="Earth Globe">
      {/* Core textured globe */}
      <Sphere args={[radius, resolution, resolution]} material={material} frustumCulled={false} />

      {/* Layered atmosphere halo - soft pastel glow rings */}
      {showAtmosphere &&
        ATMOSPHERE_LAYERS.map((layer, i) => (
          <mesh
            key={`atmosphere-${layer.color}`}
            ref={(el) => {
              atmosphereRefs.current[i] = el;
            }}
            scale={layer.scale}
            geometry={atmosphereGeometry}
            material={atmosphereMaterials[i]}
          />
        ))}

      {/* Inner glow - additive blended fresnel */}
      {showGlow && (
        <Sphere args={[radius * 1.02, 32, 32]} material={glowMaterial} frustumCulled={false} />
      )}

      {/* Mist layer - animated noise haze */}
      {showMist && (
        <Sphere args={[radius * 1.15, 32, 32]} material={mistMaterial} frustumCulled={false} />
      )}

      {/* Soft sparkle aura - floating dust particles (more visible) */}
      {showSparkles && (
        <Sparkles
          count={sparkleCount}
          size={4}
          scale={[radius * 3.5, radius * 3.5, radius * 3.5]}
          speed={0.25}
          opacity={0.45}
          color="#f8d0a8"
        />
      )}

      {/* Subtle equator ring - rose gold accent */}
      {showRing && (
        <Ring
          ref={ringRef}
          args={[radius * 1.6, radius * 1.65, 64]}
          rotation={[Math.PI / 2, 0, 0]}
          material={ringMaterial}
        />
      )}
    </group>
  );
}

export default EarthGlobe;
