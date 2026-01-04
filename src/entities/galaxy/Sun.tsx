/**
 * Sun - Stylized sun with corona and glow effects
 *
 * Features:
 * - Bright glowing core sphere
 * - Multi-layer corona/glow effect
 * - Subtle pulsing animation synced to breathing
 * - Light rays emanating outward
 * - Provides actual scene lighting
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { memo, useEffect, useMemo, useRef } from 'react';
import type * as THREE from 'three';
import {
  AdditiveBlending,
  BackSide,
  Color,
  FrontSide,
  type Mesh,
  MeshBasicMaterial,
  ShaderMaterial,
  SphereGeometry,
} from 'three';
import { breathPhase } from '../breath/traits';

// Corona glow shader
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
uniform vec3 glowColor;
uniform float intensity;
uniform float falloff;
uniform float time;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vec3 viewDir = normalize(vViewPosition);
  float rim = 1.0 - max(0.0, dot(vNormal, viewDir));

  // Fresnel-based glow with falloff
  float glow = pow(rim, falloff);

  // Subtle pulsing
  float pulse = 0.95 + 0.05 * sin(time * 0.5);

  // Slight noise variation for corona texture
  float noise = 0.9 + 0.1 * sin(time * 2.0 + rim * 10.0);

  float finalIntensity = glow * intensity * pulse * noise;

  gl_FragColor = vec4(glowColor, finalIntensity);
}
`;

interface SunProps {
  /** Position in 3D space @default [60, 40, -80] */
  position?: [number, number, number];
  /** Core radius @default 8 */
  radius?: number;
  /** Core color - Kurzgesagt warm white @default '#fff8e0' */
  coreColor?: string;
  /** Corona/glow color - Kurzgesagt golden amber @default '#ffb300' */
  coronaColor?: string;
  /** Light intensity multiplier @default 1.0 */
  lightIntensity?: number;
  /** Enable breathing sync @default true */
  breathingSync?: boolean;
}

function SunComponent({
  position = [60, 40, -80],
  radius = 8,
  coreColor = '#fff8e0', // Kurzgesagt bright warm white
  coronaColor = '#ffb300', // Kurzgesagt golden amber
  lightIntensity = 1.0,
  breathingSync = true,
}: SunProps) {
  const world = useWorld();
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<Mesh>(null);
  const corona1Ref = useRef<Mesh>(null);
  const corona2Ref = useRef<Mesh>(null);
  const corona3Ref = useRef<Mesh>(null);

  // Core geometry and material
  const coreGeometry = useMemo(() => new SphereGeometry(radius, 32, 24), [radius]);
  const coreMaterial = useMemo(() => {
    return new MeshBasicMaterial({
      color: new Color(coreColor),
      transparent: false,
    });
  }, [coreColor]);

  // Corona layers with different sizes and falloffs
  const coronaGeometries = useMemo(() => {
    return [
      new SphereGeometry(radius * 1.3, 32, 24),
      new SphereGeometry(radius * 1.8, 24, 18),
      new SphereGeometry(radius * 2.5, 16, 12),
    ];
  }, [radius]);

  const coronaMaterials = useMemo(() => {
    const baseColor = new Color(coronaColor);
    return [
      new ShaderMaterial({
        uniforms: {
          glowColor: { value: baseColor },
          intensity: { value: 0.8 },
          falloff: { value: 2.0 },
          time: { value: 0 },
        },
        vertexShader: coronaVertexShader,
        fragmentShader: coronaFragmentShader,
        transparent: true,
        blending: AdditiveBlending,
        side: FrontSide,
        depthWrite: false,
      }),
      new ShaderMaterial({
        uniforms: {
          glowColor: { value: baseColor.clone().multiplyScalar(0.7) },
          intensity: { value: 0.5 },
          falloff: { value: 3.0 },
          time: { value: 0 },
        },
        vertexShader: coronaVertexShader,
        fragmentShader: coronaFragmentShader,
        transparent: true,
        blending: AdditiveBlending,
        side: FrontSide,
        depthWrite: false,
      }),
      new ShaderMaterial({
        uniforms: {
          glowColor: { value: baseColor.clone().multiplyScalar(0.4) },
          intensity: { value: 0.3 },
          falloff: { value: 4.0 },
          time: { value: 0 },
        },
        vertexShader: coronaVertexShader,
        fragmentShader: coronaFragmentShader,
        transparent: true,
        blending: AdditiveBlending,
        side: BackSide,
        depthWrite: false,
      }),
    ];
  }, [coronaColor]);

  // Update corona materials with time and breathing
  const updateCoronaMaterials = (
    materials: ShaderMaterial[],
    time: number,
    phase: number,
    intensity: number,
  ) => {
    const intensities = [0.8, 0.5, 0.3];
    materials.forEach((material, index) => {
      material.uniforms.time.value = time;
      material.uniforms.intensity.value = intensities[index] * (0.85 + phase * 0.3) * intensity;
    });
  };

  // Animation loop
  useFrame((state) => {
    const time = state.clock.elapsedTime;

    // Get breath phase
    let currentBreathPhase = 0.5;
    if (breathingSync) {
      try {
        const breathEntity = world.queryFirst(breathPhase);
        if (breathEntity) {
          currentBreathPhase = breathEntity.get(breathPhase)?.value ?? 0.5;
        }
      } catch (_e) {
        // ECS errors during unmount
      }
    }

    // Update corona shader uniforms
    updateCoronaMaterials(coronaMaterials, time, currentBreathPhase, lightIntensity);

    // Gentle rotation for the sun
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.0002;
    }

    // Core brightness pulsing
    if (coreRef.current) {
      const brightness = 0.9 + currentBreathPhase * 0.2;
      (coreRef.current.material as MeshBasicMaterial).color.setRGB(
        brightness,
        brightness * 0.97,
        brightness * 0.88,
      );
    }
  });

  // Cleanup
  useEffect(() => {
    return () => {
      coreGeometry.dispose();
      coreMaterial.dispose();
      for (const geo of coronaGeometries) geo.dispose();
      for (const mat of coronaMaterials) mat.dispose();
    };
  }, [coreGeometry, coreMaterial, coronaGeometries, coronaMaterials]);

  return (
    <group ref={groupRef} position={position}>
      {/* Core sun sphere */}
      <mesh ref={coreRef} geometry={coreGeometry} material={coreMaterial} />

      {/* Corona glow layers */}
      <mesh ref={corona1Ref} geometry={coronaGeometries[0]} material={coronaMaterials[0]} />
      <mesh ref={corona2Ref} geometry={coronaGeometries[1]} material={coronaMaterials[1]} />
      <mesh ref={corona3Ref} geometry={coronaGeometries[2]} material={coronaMaterials[2]} />

      {/* Directional light from sun - illuminates scene */}
      <directionalLight
        position={[0, 0, 0]}
        intensity={1.2 * lightIntensity}
        color="#fff5e6"
        castShadow={false}
      />

      {/* Point light for local illumination */}
      <pointLight
        position={[0, 0, 0]}
        intensity={50 * lightIntensity}
        color="#ffeecc"
        distance={200}
        decay={2}
      />
    </group>
  );
}

export const Sun = memo(SunComponent);
export default Sun;
