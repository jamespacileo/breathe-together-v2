/**
 * EarthGlobe - Central core visualization (stylized textured earth)
 *
 * Features:
 * - Stylized earth texture with pastel teal oceans and warm landmasses
 * - Visible pulse animation (1.0 → 1.10, 10% scale change)
 * - Slow Y-axis rotation
 * - Soft fresnel rim for atmospheric glow
 * - Layered atmosphere halo (3 pastel-colored translucent spheres)
 * - Inner glow (additive blended fresnel for warm light bloom)
 * - Animated mist layer (noise-based haze that breathes)
 * - Cloudlet aura (soft orbital haze)
 * - Equator ring (subtle rose gold accent ring)
 *
 * Visual style: Monument Valley pastel aesthetic with soft, ethereal glow.
 * Uses TSL (Three.js Shading Language) for all materials.
 */

import { Ring, Sphere, useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { color, float, vec3 } from 'three/tsl';
import { MeshBasicNodeMaterial } from 'three/webgpu';

import { useDisposeGeometries, useDisposeMaterials } from '../../hooks/useDisposeMaterials';
import { breathPhase } from '../breath/traits';
import { AtmosphericParticles } from '../particle/AtmosphericParticles';
import { useGlobeMaterialsTSL } from './GlobeMaterialTSL';

/**
 * Atmosphere halo configuration - pastel layers around the globe
 */
const ATMOSPHERE_LAYERS = [
  { scale: 1.08, color: '#f8d0a8', opacity: 0.15 }, // Inner: warm peach (more visible)
  { scale: 1.14, color: '#b8e8d4', opacity: 0.1 }, // Middle: soft teal (more visible)
  { scale: 1.22, color: '#c4b8e8', opacity: 0.06 }, // Outer: pale lavender (more visible)
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
  /** Show cloudlet aura @default true */
  showSparkles?: boolean;
  /** Show equator ring @default true */
  showRing?: boolean;
  /** Cloudlet count @default 60 */
  sparkleCount?: number;
  /** Show inner glow effect @default true */
  showGlow?: boolean;
  /** Show mist/haze layer @default true */
  showMist?: boolean;
}

/**
 * EarthGlobe - Renders a stylized textured earth as the central core
 * Uses TSL materials for WebGPU-ready rendering.
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

  // Use TSL materials hook
  const { globeMaterial, glowMaterial, mistMaterial, updateBreathPhase } =
    useGlobeMaterialsTSL(earthTexture);

  // Create TSL atmosphere materials (MeshBasicNodeMaterial)
  const atmosphereMaterials = useMemo(
    () =>
      ATMOSPHERE_LAYERS.map((layer) => {
        const mat = new MeshBasicNodeMaterial();
        mat.colorNode = vec3(new THREE.Color(layer.color));
        mat.opacityNode = float(layer.opacity);
        mat.transparent = true;
        mat.side = THREE.BackSide;
        mat.depthWrite = false;
        return mat;
      }),
    [],
  );

  // Create TSL ring material
  const ringMaterial = useMemo(() => {
    const mat = new MeshBasicNodeMaterial();
    mat.colorNode = color('#e8c4b8');
    mat.opacityNode = float(0.15); // Base opacity
    mat.transparent = true;
    mat.side = THREE.FrontSide;
    mat.depthWrite = false;
    return mat;
  }, []);

  // Create memoized atmosphere geometry to prevent GPU leaks
  const atmosphereGeometry = useMemo(() => new THREE.SphereGeometry(radius, 32, 32), [radius]);

  // Cleanup all materials on unmount using helper hook
  // Note: globeMaterial, glowMaterial, mistMaterial are managed by the hook
  useDisposeMaterials([...atmosphereMaterials, ringMaterial]);

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

        // Update TSL uniforms via hook
        updateBreathPhase(phase);

        // Visible pulse: 1.0 to 1.10 (10% scale change)
        const scale = 1.0 + phase * 0.1;
        groupRef.current.scale.set(scale, scale, scale);

        // Animate atmosphere layers with slight phase offset for organic feel
        for (let i = 0; i < atmosphereRefs.current.length; i++) {
          const mesh = atmosphereRefs.current[i];
          if (!mesh) continue;

          const phaseOffset = (i + 1) * 0.15;
          const delayedPhase = Math.max(0, phase - phaseOffset);
          const layerScale = ATMOSPHERE_LAYERS[i].scale + delayedPhase * 0.04;
          mesh.scale.setScalar(layerScale);
        }

        // Ring opacity animation skipped: TSL opacityNode is fixed, would need uniform
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
      <Sphere args={[radius, resolution, resolution]} material={globeMaterial} />

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
      {showGlow && <Sphere args={[radius * 1.02, 32, 32]} material={glowMaterial} />}

      {/* Mist layer - animated noise haze */}
      {showMist && <Sphere args={[radius * 1.15, 32, 32]} material={mistMaterial} />}

      {/* Cloudlet aura - soft orbital haze */}
      {showSparkles && (
        <AtmosphericParticles
          count={Math.max(12, Math.round(sparkleCount * 0.35))}
          size={0.14}
          baseOpacity={0.08}
          breathingOpacity={0.08}
          color="#d6dde3"
          minRadius={radius * 3.2}
          maxRadius={radius * 4.6}
          minSpeed={0.01}
          maxSpeed={0.03}
          maxInclination={0.35}
          heightRange={0.9}
          sizeRange={[0.8, 1.8]}
          opacityRange={[0.4, 0.9]}
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
