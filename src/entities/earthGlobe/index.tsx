/**
 * EarthGlobe - Central core visualization (stylized textured earth)
 *
 * Features:
 * - Stylized earth texture with pastel teal oceans and warm landmasses
 * - Subtle pulse animation (1.0 → 1.06, 6% scale change)
 * - Slow Y-axis rotation
 * - Soft fresnel rim for atmospheric glow
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
  float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 3.0);
  vec3 rimColor = vec3(0.75, 0.92, 0.88); // Soft teal atmospheric glow

  // Breathing modulation - subtle brightness shift
  float breathMod = 1.0 + breathPhase * 0.08;
  texColor *= breathMod;

  // Blend texture with fresnel rim
  vec3 finalColor = mix(texColor, rimColor, fresnel * 0.35);

  // Subtle top-down lighting
  float topLight = smoothstep(-0.2, 0.8, vNormal.y) * 0.1;
  finalColor += vec3(1.0, 0.98, 0.95) * topLight;

  gl_FragColor = vec4(finalColor, 1.0);
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
}

/**
 * EarthGlobe - Renders a stylized textured earth as the central core
 */
export function EarthGlobe({
  radius = 1.5,
  resolution = 64,
  enableRotation = true,
}: Partial<EarthGlobeProps> = {}) {
  const meshRef = useRef<THREE.Mesh>(null);
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

  // Sphere geometry
  const geometry = useMemo(
    () => new THREE.SphereGeometry(radius, resolution, resolution),
    [radius, resolution],
  );

  // Cleanup GPU resources on unmount
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

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
        // Update shader uniform
        material.uniforms.breathPhase.value = phase;
        // Subtle pulse: 1.0 to 1.06 (6% scale change)
        const scale = 1.0 + phase * 0.06;
        meshRef.current.scale.set(scale, scale, scale);
      }

      // Slow rotation
      if (enableRotation) {
        meshRef.current.rotation.y -= 0.0008;
      }
    } catch {
      // Ignore ECS errors during unmount/remount in Triplex
    }
  });

  return (
    <mesh
      ref={meshRef}
      name="Earth Globe"
      geometry={geometry}
      material={material}
      frustumCulled={false}
    />
  );
}

export default EarthGlobe;
