/**
 * LightBeams - Soft radiant beams emanating from the globe
 *
 * Features:
 * - Subtle volumetric-style light rays from the globe center
 * - Breath-synchronized intensity (brighter on exhale)
 * - Slow rotation for ethereal movement
 * - Custom shader for smooth gradient falloff
 *
 * Visual style: Gentle god rays creating a sense of inner radiance
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useDisposeGeometries, useDisposeMaterials } from '../../hooks/useDisposeMaterials';
import { breathPhase } from '../breath/traits';

// Vertex shader - positions beam planes
const beamVertexShader = `
varying vec2 vUv;
varying float vFade;

void main() {
  vUv = uv;
  // Fade based on distance from center
  vFade = position.y;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Fragment shader - soft gradient beam
const beamFragmentShader = `
uniform vec3 beamColor;
uniform float opacity;
uniform float breathPhase;

varying vec2 vUv;
varying float vFade;

void main() {
  // Horizontal gradient - bright center, fading edges
  float centerFade = 1.0 - abs(vUv.x - 0.5) * 2.0;
  centerFade = pow(centerFade, 2.0);

  // Vertical gradient - fades out with distance
  float distanceFade = 1.0 - vUv.y;
  distanceFade = pow(distanceFade, 1.5);

  // Breathing modulation - beams brighten on inhale
  float breathMod = 0.5 + breathPhase * 0.5;

  float alpha = centerFade * distanceFade * opacity * breathMod;

  gl_FragColor = vec4(beamColor, alpha);
}
`;

/**
 * Beam configuration - each beam has unique angle and parameters
 */
const BEAM_CONFIGS = [
  { angle: 0, length: 8, width: 0.4, opacity: 0.03 },
  { angle: Math.PI / 3, length: 7, width: 0.35, opacity: 0.025 },
  { angle: (2 * Math.PI) / 3, length: 9, width: 0.45, opacity: 0.02 },
  { angle: Math.PI, length: 7.5, width: 0.3, opacity: 0.025 },
  { angle: (4 * Math.PI) / 3, length: 8.5, width: 0.4, opacity: 0.02 },
  { angle: (5 * Math.PI) / 3, length: 7, width: 0.35, opacity: 0.03 },
];

export interface LightBeamsProps {
  /** Enable/disable @default true */
  enabled?: boolean;
  /** Beam color @default '#fff5e8' */
  color?: string;
  /** Overall opacity multiplier @default 1.0 */
  opacityMultiplier?: number;
  /** Rotation speed @default 0.02 */
  rotationSpeed?: number;
}

/**
 * LightBeams - Renders soft radiant beams from the globe center
 */
export const LightBeams = memo(function LightBeamsComponent({
  enabled = true,
  color = '#fff5e8',
  opacityMultiplier = 1.0,
  rotationSpeed = 0.02,
}: LightBeamsProps) {
  const groupRef = useRef<THREE.Group>(null);
  const world = useWorld();

  // Create beam geometries - simple planes
  const geometries = useMemo(
    () =>
      BEAM_CONFIGS.map((config) => {
        const geo = new THREE.PlaneGeometry(config.width, config.length, 1, 8);
        // Shift pivot to bottom center
        geo.translate(0, config.length / 2, 0);
        return geo;
      }),
    [],
  );

  // Create shader materials
  const materials = useMemo(
    () =>
      BEAM_CONFIGS.map(
        (config) =>
          new THREE.ShaderMaterial({
            uniforms: {
              beamColor: { value: new THREE.Color(color) },
              opacity: { value: config.opacity * opacityMultiplier },
              breathPhase: { value: 0 },
            },
            vertexShader: beamVertexShader,
            fragmentShader: beamFragmentShader,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          }),
      ),
    [color, opacityMultiplier],
  );

  // Cleanup
  useDisposeGeometries(geometries);
  useDisposeMaterials(materials);

  // Update shader uniforms when color changes
  useEffect(() => {
    const colorObj = new THREE.Color(color);
    materials.forEach((mat) => {
      mat.uniforms.beamColor.value = colorObj;
    });
  }, [color, materials]);

  useFrame((state) => {
    if (!enabled || !groupRef.current) return;

    try {
      const breathEntity = world.queryFirst(breathPhase);
      const phase = breathEntity?.get(breathPhase)?.value ?? 0;

      // Update all material uniforms
      materials.forEach((mat) => {
        mat.uniforms.breathPhase.value = phase;
      });

      // Slow rotation for ethereal movement
      groupRef.current.rotation.y += rotationSpeed * 0.01;
      // Subtle wobble
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.05;
    } catch {
      // Ignore ECS errors during unmount/remount
    }
  });

  if (!enabled) return null;

  return (
    <group ref={groupRef} name="Light Beams">
      {BEAM_CONFIGS.map((config, i) => (
        <mesh
          key={`beam-${config.angle}`}
          geometry={geometries[i]}
          material={materials[i]}
          rotation={[0, config.angle, 0]}
          position={[0, 0, 0]}
        />
      ))}
    </group>
  );
});

export default LightBeams;
