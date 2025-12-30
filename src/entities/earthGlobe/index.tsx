/**
 * EarthGlobe - Central core visualization (stylized textured earth)
 *
 * Features:
 * - Stylized earth texture with pastel teal oceans and warm landmasses
 * - Subtle pulse animation (1.0 → 1.06, 6% scale change)
 * - Slow Y-axis rotation
 * - Soft fresnel rim for atmospheric glow
 * - Outer atmospheric halo (second sphere with inverted normals)
 * - Breathing-synced inner glow pulse
 */

import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

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

// Fragment shader - texture with fresnel rim glow and breathing inner glow
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
  float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 3.0);
  vec3 rimColor = vec3(0.75, 0.92, 0.88); // Soft teal atmospheric glow

  // Enhanced breathing modulation with inner glow pulse
  // Creates subtle luminosity that pulses from core
  float breathMod = 1.0 + breathPhase * 0.12;

  // Inner glow: brighter at center (where normal faces camera)
  float innerGlow = max(dot(vNormal, viewDir), 0.0);
  float glowPulse = breathPhase * 0.15 * innerGlow;
  vec3 glowColor = vec3(0.95, 0.98, 0.92); // Warm white inner glow

  texColor = texColor * breathMod + glowColor * glowPulse;

  // Enhanced fresnel rim - intensifies slightly during inhale
  float breathFresnel = fresnel * (1.0 + breathPhase * 0.2);
  vec3 finalColor = mix(texColor, rimColor, breathFresnel * 0.4);

  // Subtle top-down lighting
  float topLight = smoothstep(-0.2, 0.8, vNormal.y) * 0.1;
  finalColor += vec3(1.0, 0.98, 0.95) * topLight;

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

// Atmospheric halo shader - renders on inverted normals sphere outside globe
const atmosphereVertexShader = `
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

const atmosphereFragmentShader = `
uniform float breathPhase;
uniform vec3 glowColor;
uniform float glowIntensity;

varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vec3 viewDir = normalize(vViewPosition);

  // Inverted fresnel - glow at edges where normal faces away from camera
  float fresnel = pow(max(dot(vNormal, viewDir), 0.0), 1.5);

  // Breathing modulation - atmosphere "breathes" with globe
  float breathMod = 0.6 + breathPhase * 0.4;

  // Soft falloff
  float alpha = fresnel * glowIntensity * breathMod;
  alpha = smoothstep(0.0, 1.0, alpha);

  // Color with subtle warm shift during inhale
  vec3 finalGlow = mix(glowColor, vec3(0.9, 0.95, 0.85), breathPhase * 0.15);

  gl_FragColor = vec4(finalGlow, alpha * 0.5);
}
`;

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
  /** Atmospheric halo color @default '#bfe8e0' (soft teal) */
  atmosphereColor?: string;
  /** Atmospheric glow intensity @default 0.7 */
  atmosphereIntensity?: number;
  /** Size multiplier for atmosphere sphere @default 1.15 */
  atmosphereScale?: number;
}

/**
 * EarthGlobe - Renders a stylized textured earth as the central core
 */
export function EarthGlobe({
  radius = 1.5,
  resolution = 64,
  enableRotation = true,
  atmosphereColor = '#bfe8e0',
  atmosphereIntensity = 0.7,
  atmosphereScale = 1.15,
}: Partial<EarthGlobeProps> = {}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  const world = useWorld();

  // Load earth texture
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

  // Create atmospheric halo material (inverted normals for outer glow)
  const atmosphereMaterial = useMemo(() => {
    const color = new THREE.Color(atmosphereColor);
    return new THREE.ShaderMaterial({
      uniforms: {
        breathPhase: { value: 0 },
        glowColor: { value: color },
        glowIntensity: { value: atmosphereIntensity },
      },
      vertexShader: atmosphereVertexShader,
      fragmentShader: atmosphereFragmentShader,
      side: THREE.BackSide, // Render inside faces (inverted normals effect)
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, [atmosphereColor, atmosphereIntensity]);

  // Sphere geometry
  const geometry = useMemo(
    () => new THREE.SphereGeometry(radius, resolution, resolution),
    [radius, resolution],
  );

  // Atmosphere geometry (slightly larger)
  const atmosphereGeometry = useMemo(
    () => new THREE.SphereGeometry(radius * atmosphereScale, 32, 32),
    [radius, atmosphereScale],
  );

  // Cleanup GPU resources on unmount
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
      atmosphereGeometry.dispose();
      atmosphereMaterial.dispose();
    };
  }, [geometry, material, atmosphereGeometry, atmosphereMaterial]);

  /**
   * Update globe scale, rotation, and shader uniforms
   */
  useFrame(() => {
    if (!meshRef.current) return;

    try {
      // Get breath phase for animation
      const breathEntity = world?.queryFirst?.(breathPhase);
      if (breathEntity) {
        const phase = breathEntity.get?.(breathPhase)?.value ?? 0;

        // Update globe shader uniform
        material.uniforms.breathPhase.value = phase;

        // Update atmosphere shader uniform
        atmosphereMaterial.uniforms.breathPhase.value = phase;

        // Subtle pulse: 1.0 to 1.06 (6% scale change)
        const scale = 1.0 + phase * 0.06;
        meshRef.current.scale.set(scale, scale, scale);

        // Atmosphere scales slightly more for breathing effect
        if (atmosphereRef.current) {
          const atmosScale = 1.0 + phase * 0.08;
          atmosphereRef.current.scale.set(atmosScale, atmosScale, atmosScale);
        }
      }

      // Slow rotation
      if (enableRotation) {
        meshRef.current.rotation.y -= 0.0008;
        // Atmosphere rotates slightly slower for parallax depth
        if (atmosphereRef.current) {
          atmosphereRef.current.rotation.y -= 0.0006;
        }
      }
    } catch {
      // Ignore ECS errors during unmount/remount in Triplex
    }
  });

  return (
    <group name="Earth Globe Group">
      {/* Atmospheric halo (rendered first, behind globe) */}
      <mesh
        ref={atmosphereRef}
        name="Atmosphere Halo"
        geometry={atmosphereGeometry}
        material={atmosphereMaterial}
        frustumCulled={false}
      />
      {/* Main globe */}
      <mesh
        ref={meshRef}
        name="Earth Globe"
        geometry={geometry}
        material={material}
        frustumCulled={false}
      />
    </group>
  );
}

export default EarthGlobe;
