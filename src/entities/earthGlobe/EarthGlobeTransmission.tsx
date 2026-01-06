/**
 * EarthGlobeTransmission - Enhanced globe using drei's MeshTransmissionMaterial
 *
 * Features built-in:
 * - Physical transmission/refraction (IOR-based)
 * - Roughness for frosted glass appearance
 * - Thickness-based distortion
 * - Chromatic aberration
 * - Temporal reprojection for performance
 *
 * Best used with HDRI environment for realistic reflections.
 * Does NOT work with InstancedMesh (use for single globe only).
 */

import { MeshTransmissionMaterial, Ring, Sphere } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { useDisposeGeometries, useDisposeMaterials } from '../../hooks/useDisposeMaterials';
import { breathPhase } from '../breath/traits';
import { AtmosphericParticles } from '../particle/AtmosphericParticles';

/**
 * Atmosphere halo configuration - pastel layers around the globe
 */
const ATMOSPHERE_LAYERS = [
  { scale: 1.08, color: '#f8d0a8', opacity: 0.08 }, // Inner: warm peach
  { scale: 1.14, color: '#b8e8d4', opacity: 0.05 }, // Middle: soft teal
  { scale: 1.22, color: '#c4b8e8', opacity: 0.03 }, // Outer: pale lavender
];

/**
 * EarthGlobeTransmission component props
 */
interface EarthGlobeTransmissionProps {
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
  /**
   * Transmission amount (0 = opaque, 1 = fully transparent)
   * @min 0 @max 1 @step 0.05
   * @default 0.9
   */
  transmission?: number;
  /**
   * Surface roughness (0 = mirror, 1 = diffuse)
   * @min 0 @max 1 @step 0.05
   * @default 0.2
   */
  roughness?: number;
  /**
   * Index of refraction (1 = air, 1.5 = glass, 2.4 = diamond)
   * @min 1 @max 2.5 @step 0.1
   * @default 1.2
   */
  ior?: number;
  /**
   * Glass thickness - affects internal distortion
   * @min 0 @max 5 @step 0.1
   * @default 0.5
   */
  thickness?: number;
  /**
   * Chromatic aberration intensity
   * @min 0 @max 1 @step 0.05
   * @default 0.03
   */
  chromaticAberration?: number;
  /**
   * Distortion of the transmission
   * @min 0 @max 1 @step 0.05
   * @default 0.1
   */
  distortion?: number;
  /**
   * Speed of distortion animation
   * @min 0 @max 5 @step 0.1
   * @default 0.3
   */
  distortionScale?: number;
  /**
   * Temporal reprojection blend factor (performance optimization)
   * @min 0 @max 1 @step 0.1
   * @default 0.9
   */
  temporalDistortion?: number;
  /**
   * Base color tint
   * @default '#f8e8d8'
   */
  color?: string;
  /**
   * Resolution of transmission render (lower = faster but blurrier)
   * @min 64 @max 1024 @step 64
   * @default 256
   */
  transmissionSampler?: number;
}

/**
 * EarthGlobeTransmission - Renders a glass globe using MeshTransmissionMaterial
 */
export function EarthGlobeTransmission({
  radius = 1.5,
  resolution = 64,
  enableRotation = true,
  showAtmosphere = true,
  showSparkles = true,
  showRing = true,
  sparkleCount = 60,
  transmission = 0.9,
  roughness = 0.2,
  ior = 1.2,
  thickness = 0.5,
  chromaticAberration = 0.03,
  distortion = 0.1,
  distortionScale = 0.3,
  temporalDistortion = 0.9,
  color = '#f8e8d8',
  transmissionSampler = 256,
}: Partial<EarthGlobeTransmissionProps> = {}) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const atmosphereRefs = useRef<(THREE.Mesh | null)[]>([]);
  // biome-ignore lint/suspicious/noExplicitAny: MeshTransmissionMaterial doesn't export instance type in @react-three/drei
  const transmissionRef = useRef<any>(null);
  const world = useWorld();

  // Create memoized atmosphere geometries and materials
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

  // Create ring material
  const ringMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#e8c4b8',
        transparent: true,
        opacity: 0.15,
        side: THREE.FrontSide,
        depthWrite: false,
      }),
    [],
  );

  // Cleanup materials on unmount
  useDisposeMaterials([...atmosphereMaterials, ringMaterial]);
  useDisposeGeometries([atmosphereGeometry]);

  /**
   * Update globe scale, rotation, and material uniforms
   */
  useFrame((state) => {
    if (!groupRef.current) return;

    try {
      // Get breath phase for animation
      const breathEntity = world.queryFirst(breathPhase);
      if (breathEntity) {
        const phase = breathEntity.get(breathPhase)?.value ?? 0;

        // Update transmission material distortion with breathing
        if (transmissionRef.current) {
          transmissionRef.current.distortion = distortion * (1 + phase * 0.3);
        }

        // Subtle pulse: 1.0 to 1.06 (6% scale change)
        const scale = 1.0 + phase * 0.06;
        groupRef.current.scale.set(scale, scale, scale);

        // Animate atmosphere layers
        atmosphereRefs.current.forEach((mesh, i) => {
          if (mesh) {
            const phaseOffset = (i + 1) * 0.15;
            const delayedPhase = Math.max(0, phase - phaseOffset);
            const layerScale = ATMOSPHERE_LAYERS[i].scale + delayedPhase * 0.04;
            mesh.scale.set(layerScale, layerScale, layerScale);
          }
        });

        // Animate ring opacity
        ringMaterial.opacity = 0.12 + phase * 0.08;
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
    <group ref={groupRef} name="Earth Globe Transmission">
      {/* Core glass globe with MeshTransmissionMaterial */}
      <Sphere args={[radius, resolution, resolution]}>
        <MeshTransmissionMaterial
          ref={transmissionRef}
          transmission={transmission}
          roughness={roughness}
          ior={ior}
          thickness={thickness}
          chromaticAberration={chromaticAberration}
          distortion={distortion}
          distortionScale={distortionScale}
          temporalDistortion={temporalDistortion}
          color={color}
          resolution={transmissionSampler}
          samples={6}
          backside={true}
          backsideThickness={thickness * 0.5}
        />
      </Sphere>

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

      {/* Cloudlet aura */}
      {showSparkles && (
        <AtmosphericParticles
          count={Math.max(12, Math.round(sparkleCount * 0.35))}
          size={0.13}
          baseOpacity={0.07}
          breathingOpacity={0.07}
          color="#d6dde3"
          minRadius={radius * 3.2}
          maxRadius={radius * 4.6}
          minSpeed={0.01}
          maxSpeed={0.03}
          maxInclination={0.35}
          heightRange={0.9}
          sizeRange={[0.8, 1.7]}
          opacityRange={[0.4, 0.85]}
        />
      )}

      {/* Subtle equator ring */}
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

export default EarthGlobeTransmission;
