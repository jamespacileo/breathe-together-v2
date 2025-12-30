/**
 * EarthGlobe - Central core visualization (stylized textured earth)
 *
 * Features:
 * - Stylized earth texture with pastel teal oceans and warm landmasses
 * - Subtle pulse animation (1.0 → 1.06, 6% scale change)
 * - Slow Y-axis rotation
 * - Soft fresnel rim for atmospheric glow
 * - Layered atmosphere halo (3 pastel-colored translucent spheres)
 * - Sparkle aura (floating dust particles around the globe)
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
 * Atmosphere halo configuration - pastel layers around the globe
 */
const ATMOSPHERE_LAYERS = [
  { scale: 1.08, color: '#f8d0a8', opacity: 0.08 }, // Inner: warm peach
  { scale: 1.14, color: '#b8e8d4', opacity: 0.05 }, // Middle: soft teal
  { scale: 1.22, color: '#c4b8e8', opacity: 0.03 }, // Outer: pale lavender
];

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
  /** Sparkle count @default 40 */
  sparkleCount?: number;
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
  sparkleCount = 40,
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

  // Cleanup material on unmount (Sphere handles geometry disposal)
  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  /**
   * Update globe scale, rotation, and shader uniforms
   */
  useFrame((state) => {
    if (!groupRef.current) return;

    try {
      // Get breath phase for animation
      const breathEntity = world?.queryFirst?.(breathPhase);
      if (breathEntity) {
        const phase = breathEntity.get?.(breathPhase)?.value ?? 0;
        // Update shader uniform
        material.uniforms.breathPhase.value = phase;
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

        // Animate ring opacity with breathing
        if (ringRef.current) {
          const ringMaterial = ringRef.current.material as THREE.MeshBasicMaterial;
          ringMaterial.opacity = 0.12 + phase * 0.08; // 12% to 20%
        }
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
          >
            <sphereGeometry args={[radius, 32, 32]} />
            <meshBasicMaterial
              color={layer.color}
              transparent
              opacity={layer.opacity}
              side={THREE.BackSide}
              depthWrite={false}
            />
          </mesh>
        ))}

      {/* Soft sparkle aura - floating dust particles */}
      {showSparkles && (
        <Sparkles
          count={sparkleCount}
          size={2}
          scale={[radius * 3, radius * 3, radius * 3]}
          speed={0.3}
          opacity={0.2}
          color="#f8d0a8"
        />
      )}

      {/* Subtle equator ring - rose gold accent */}
      {showRing && (
        <Ring ref={ringRef} args={[radius * 1.6, radius * 1.65, 64]} rotation={[Math.PI / 2, 0, 0]}>
          <meshBasicMaterial
            color="#e8c4b8"
            transparent
            opacity={0.15}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </Ring>
      )}
    </group>
  );
}

export default EarthGlobe;
