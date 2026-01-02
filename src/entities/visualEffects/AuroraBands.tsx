/**
 * AuroraBands - Breathing-synchronized aurora rings around the globe
 *
 * Inspired by music visualizer concentric ring effects. Multiple glowing rings
 * encircle the globe at different latitudes, each pulsing with a slight phase
 * offset to create a wave effect traveling up/down the sphere.
 *
 * Visual style: Ethereal, translucent bands with aurora borealis coloring.
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { breathPhase } from '../breath/traits';

// Aurora band vertex shader
const auroraVertexShader = `
varying vec3 vNormal;
varying vec3 vViewPosition;
varying float vY;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vY = position.y;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

// Aurora band fragment shader - creates flowing, translucent aurora effect
const auroraFragmentShader = `
uniform float time;
uniform float breathPhase;
uniform float phaseOffset;
uniform vec3 color1;
uniform vec3 color2;
uniform float opacity;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying float vY;

// Simple noise for aurora shimmer
float hash(float n) {
  return fract(sin(n) * 43758.5453);
}

float noise(float x) {
  float i = floor(x);
  float f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(hash(i), hash(i + 1.0), f);
}

void main() {
  vec3 viewDir = normalize(vViewPosition);

  // Fresnel for edge glow
  float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 2.0);

  // Apply phase offset for wave effect
  float offsetBreath = breathPhase + phaseOffset;

  // Pulsing intensity based on breathing
  float pulse = 0.5 + 0.5 * sin(offsetBreath * 3.14159);

  // Aurora shimmer - flowing noise pattern
  float shimmer = noise(vY * 10.0 + time * 2.0) * 0.3 + 0.7;

  // Vertical wave pattern
  float wave = sin(vY * 8.0 + time * 1.5 + offsetBreath * 6.28) * 0.2 + 0.8;

  // Color gradient based on breathing phase
  vec3 color = mix(color1, color2, offsetBreath);

  // Add iridescent shimmer
  float iridescence = sin(vY * 20.0 + time * 3.0) * 0.1;
  color += vec3(iridescence, iridescence * 0.5, -iridescence);

  // Final alpha with all effects combined
  float alpha = fresnel * pulse * shimmer * wave * opacity;

  // Boost brightness slightly
  color *= 1.2;

  gl_FragColor = vec4(color, alpha);
}
`;

// Aurora band configuration - each band has unique colors and phase offset
const AURORA_BANDS = [
  {
    latitude: 0.7, // Near top
    scale: 1.8,
    color1: '#ff6b9d', // Pink
    color2: '#c44569', // Deep rose
    phaseOffset: 0.0,
    opacity: 0.25,
  },
  {
    latitude: 0.35, // Upper middle
    scale: 2.0,
    color1: '#06d6a0', // Teal
    color2: '#1fab89', // Darker teal
    phaseOffset: 0.15,
    opacity: 0.22,
  },
  {
    latitude: 0.0, // Equator
    scale: 2.2,
    color1: '#4ecdc4', // Cyan
    color2: '#45b7aa', // Darker cyan
    phaseOffset: 0.3,
    opacity: 0.2,
  },
  {
    latitude: -0.35, // Lower middle
    scale: 2.0,
    color1: '#a8e6cf', // Mint
    color2: '#88d8b0', // Darker mint
    phaseOffset: 0.45,
    opacity: 0.22,
  },
  {
    latitude: -0.7, // Near bottom
    scale: 1.8,
    color1: '#ffd93d', // Golden
    color2: '#f4c430', // Darker gold
    phaseOffset: 0.6,
    opacity: 0.25,
  },
];

interface AuroraBandsProps {
  /** Enable aurora bands @default true */
  enabled?: boolean;
  /** Base radius of bands @default 1.6 */
  baseRadius?: number;
  /** Overall opacity multiplier @default 1.0 */
  opacityMultiplier?: number;
  /** Animation speed @default 1.0 */
  speed?: number;
}

export function AuroraBands({
  enabled = true,
  baseRadius = 1.6,
  opacityMultiplier = 1.0,
  speed = 1.0,
}: AuroraBandsProps) {
  const world = useWorld();
  const groupRef = useRef<THREE.Group>(null);

  // Create geometries and materials for each band
  const { bands, materials } = useMemo(() => {
    const bands: THREE.Mesh[] = [];
    const materials: THREE.ShaderMaterial[] = [];

    for (const config of AURORA_BANDS) {
      // Create torus geometry for the band
      const geometry = new THREE.TorusGeometry(
        baseRadius * config.scale,
        0.08, // Tube radius (thin bands)
        16, // Radial segments
        64, // Tubular segments
      );

      const material = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          breathPhase: { value: 0 },
          phaseOffset: { value: config.phaseOffset },
          color1: { value: new THREE.Color(config.color1) },
          color2: { value: new THREE.Color(config.color2) },
          opacity: { value: config.opacity * opacityMultiplier },
        },
        vertexShader: auroraVertexShader,
        fragmentShader: auroraFragmentShader,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.y = config.latitude * baseRadius * 1.5;
      mesh.rotation.x = Math.PI / 2; // Lay flat

      bands.push(mesh);
      materials.push(material);
    }

    return { bands, materials };
  }, [baseRadius, opacityMultiplier]);

  // Setup and cleanup
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    // Add all bands to group
    for (const band of bands) {
      group.add(band);
    }

    return () => {
      // Cleanup
      for (const band of bands) {
        group.remove(band);
        band.geometry.dispose();
      }
      for (const material of materials) {
        material.dispose();
      }
    };
  }, [bands, materials]);

  // Animation loop
  useFrame((state) => {
    if (!enabled) return;

    const time = state.clock.elapsedTime * speed;

    // Get breath phase from ECS
    let currentBreathPhase = 0;
    try {
      const breathEntity = world.queryFirst(breathPhase);
      if (breathEntity) {
        currentBreathPhase = breathEntity.get(breathPhase)?.value ?? 0;
      }
    } catch {
      // Ignore ECS errors
    }

    // Update all band materials
    for (let i = 0; i < materials.length; i++) {
      const material = materials[i];
      const band = bands[i];
      const config = AURORA_BANDS[i];

      material.uniforms.time.value = time;
      material.uniforms.breathPhase.value = currentBreathPhase;

      // Subtle scale breathing with phase offset
      const offsetPhase = currentBreathPhase + config.phaseOffset;
      const scaleMultiplier = 1.0 + Math.sin(offsetPhase * Math.PI) * 0.08;
      band.scale.setScalar(scaleMultiplier);

      // Gentle rotation for flow effect
      band.rotation.z = time * 0.1 * (i % 2 === 0 ? 1 : -1);
    }
  });

  if (!enabled) return null;

  return <group ref={groupRef} name="Aurora Bands" />;
}

export default AuroraBands;
