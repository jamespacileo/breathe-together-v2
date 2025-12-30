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

// Fragment shader - watercolor-style texture with fresnel rim glow
// Features: posterization, edge softening, color bleeding, breathing modulation
const globeFragmentShader = `
uniform sampler2D earthTexture;
uniform float breathPhase;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec2 vUv;

void main() {
  // Sample earth texture at multiple offsets for color bleeding effect
  vec3 texColor = texture2D(earthTexture, vUv).rgb;

  // WATERCOLOR EFFECT 1: Color bleeding (sample nearby pixels and blend)
  vec2 bleedOffset = vec2(0.004, 0.004);
  vec3 bleedColor1 = texture2D(earthTexture, vUv + bleedOffset).rgb;
  vec3 bleedColor2 = texture2D(earthTexture, vUv - bleedOffset).rgb;
  vec3 bleedColor3 = texture2D(earthTexture, vUv + vec2(bleedOffset.x, -bleedOffset.y)).rgb;
  texColor = mix(texColor, (bleedColor1 + bleedColor2 + bleedColor3) / 3.0, 0.15);

  // WATERCOLOR EFFECT 2: Posterization (reduce color levels for painted look)
  // More levels on inhale (clearer), fewer on exhale (softer)
  float levels = 5.0 + breathPhase * 3.0; // Range: 5 → 8 levels
  texColor = floor(texColor * levels + 0.5) / levels;

  // WATERCOLOR EFFECT 3: Edge darkening (watercolor paint pools at edges)
  vec3 viewDir = normalize(vViewPosition);
  float edgeFactor = 1.0 - pow(max(dot(vNormal, viewDir), 0.0), 0.6);
  texColor *= 0.88 + (1.0 - edgeFactor) * 0.12; // Darken edges subtly

  // Fresnel rim for atmospheric glow
  float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 3.0);
  vec3 rimColor = vec3(0.75, 0.92, 0.88); // Soft teal atmospheric glow

  // Breathing modulation - subtle brightness shift
  float breathMod = 1.0 + breathPhase * 0.08;
  texColor *= breathMod;

  // Blend texture with fresnel rim (breathing-modulated intensity)
  float rimIntensity = 0.3 + breathPhase * 0.15; // 0.3 → 0.45 range
  vec3 finalColor = mix(texColor, rimColor, fresnel * rimIntensity);

  // WATERCOLOR EFFECT 4: Soft paper texture overlay
  float paperNoise = fract(sin(dot(vUv * 100.0, vec2(12.9898, 78.233))) * 43758.5453);
  paperNoise = (paperNoise - 0.5) * 0.03;
  finalColor += paperNoise;

  // Subtle top-down lighting (breathing-modulated)
  float topLight = smoothstep(-0.2, 0.8, vNormal.y) * (0.08 + breathPhase * 0.04);
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
