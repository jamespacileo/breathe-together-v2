/**
 * GlobeBloom - Visual transformation when group reaches high sync
 *
 * "When a certain number of users are in sync, the globe itself could undergo
 * a transformation—perhaps blooming into a complex 'flower of life' or a
 * high-density 'star' that reflects the collective energy of the group."
 *
 * Features:
 * - Geometric "flower of life" pattern overlay
 * - Pulsing energy rings that expand with high sync
 * - Star-like emanating rays
 * - Intensity scales with user count and sync level
 *
 * Activated when:
 * - User count exceeds threshold (default: 10)
 * - Group is breathing in sync (high breathPhase coherence)
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { useDisposeGeometries, useDisposeMaterials } from '../../hooks/useDisposeMaterials';
import { breathPhase } from '../breath/traits';

/**
 * Configuration
 */
const BLOOM_CONFIG = {
  /** Minimum user count to activate bloom */
  minUsers: 5,
  /** Full bloom user count */
  fullBloomUsers: 20,
  /** Number of flower petals/rays */
  petalCount: 12,
  /** Inner radius (just outside globe) */
  innerRadius: 1.7,
  /** Maximum bloom radius */
  maxRadius: 2.4,
  /** Base opacity when active */
  baseOpacity: 0.15,
  /** Maximum opacity at full bloom */
  maxOpacity: 0.5,
};

/**
 * Colors for bloom effect
 */
const BLOOM_COLORS = {
  /** Primary ray color - ethereal gold */
  primary: new THREE.Color('#d4a574'),
  /** Secondary glow - soft teal */
  secondary: new THREE.Color('#8fd4c8'),
  /** Center glow - warm white */
  center: new THREE.Color('#fff8f0'),
};

/**
 * Ray/petal shader - emanating light beams
 */
const rayVertexShader = `
varying vec2 vUv;
varying vec3 vPosition;

void main() {
  vUv = uv;
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const rayFragmentShader = `
uniform float breathPhase;
uniform float bloomIntensity;
uniform float time;
uniform vec3 primaryColor;
uniform vec3 secondaryColor;

varying vec2 vUv;
varying vec3 vPosition;

void main() {
  // Distance from center for radial fade
  float dist = length(vPosition.xz);

  // Radial fade - stronger at center
  float radialFade = 1.0 - smoothstep(0.0, 2.0, dist);

  // Breathing pulse
  float pulse = 0.7 + breathPhase * 0.3;

  // Color gradient from center outward
  vec3 color = mix(secondaryColor, primaryColor, dist / 2.0);

  // Time-based shimmer
  float shimmer = sin(time * 2.0 + dist * 3.0) * 0.1 + 0.9;

  // Final alpha with bloom intensity
  float alpha = radialFade * pulse * shimmer * bloomIntensity;

  gl_FragColor = vec4(color * pulse, alpha);
}
`;

/**
 * Flower of life ring shader
 */
const flowerVertexShader = `
varying vec2 vUv;
varying vec3 vNormal;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const flowerFragmentShader = `
uniform float breathPhase;
uniform float bloomIntensity;
uniform float time;
uniform vec3 color;

varying vec2 vUv;
varying vec3 vNormal;

void main() {
  // Rotating pattern
  float angle = atan(vNormal.z, vNormal.x) + time * 0.1;

  // Flower pattern - overlapping circles
  float pattern = 0.0;
  for (float i = 0.0; i < 6.0; i++) {
    float theta = i * 3.14159 / 3.0 + time * 0.05;
    vec2 center = vec2(cos(theta), sin(theta)) * 0.3;
    float circle = smoothstep(0.35, 0.3, length(vUv - 0.5 - center));
    pattern = max(pattern, circle);
  }
  // Center circle
  pattern = max(pattern, smoothstep(0.35, 0.3, length(vUv - 0.5)));

  // Breathing modulation
  float pulse = 0.6 + breathPhase * 0.4;

  // Final color
  vec3 finalColor = color * pulse;
  float alpha = pattern * bloomIntensity * pulse * 0.5;

  gl_FragColor = vec4(finalColor, alpha);
}
`;

interface GlobeBloomProps {
  /** Current user count */
  userCount?: number;
  /** Enable bloom effect @default true */
  enabled?: boolean;
  /** Intensity multiplier @default 1.0 */
  intensity?: number;
}

/**
 * GlobeBloom - Renders collective energy bloom effect around globe
 */
export function GlobeBloom({ userCount = 1, enabled = true, intensity = 1.0 }: GlobeBloomProps) {
  const groupRef = useRef<THREE.Group>(null);
  const world = useWorld();

  // Calculate bloom intensity based on user count
  const bloomIntensity = useMemo(() => {
    if (userCount < BLOOM_CONFIG.minUsers) return 0;
    const range = BLOOM_CONFIG.fullBloomUsers - BLOOM_CONFIG.minUsers;
    const normalized = Math.min((userCount - BLOOM_CONFIG.minUsers) / range, 1);
    return normalized * intensity;
  }, [userCount, intensity]);

  // Create ray geometry (pie slices emanating from center)
  const rayGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    const uvs: number[] = [];

    const angleStep = (Math.PI * 2) / BLOOM_CONFIG.petalCount;
    const halfWidth = angleStep * 0.3; // Ray width

    for (let i = 0; i < BLOOM_CONFIG.petalCount; i++) {
      const centerAngle = i * angleStep;

      // Triangle from center outward
      // Center point
      positions.push(0, 0, 0);
      uvs.push(0.5, 0);

      // Left edge at max radius
      positions.push(
        Math.cos(centerAngle - halfWidth) * BLOOM_CONFIG.maxRadius,
        0,
        Math.sin(centerAngle - halfWidth) * BLOOM_CONFIG.maxRadius,
      );
      uvs.push(0, 1);

      // Right edge at max radius
      positions.push(
        Math.cos(centerAngle + halfWidth) * BLOOM_CONFIG.maxRadius,
        0,
        Math.sin(centerAngle + halfWidth) * BLOOM_CONFIG.maxRadius,
      );
      uvs.push(1, 1);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.computeVertexNormals();

    return geometry;
  }, []);

  // Create flower ring geometry
  const flowerGeometry = useMemo(
    () => new THREE.TorusGeometry(BLOOM_CONFIG.innerRadius + 0.2, 0.15, 8, 64),
    [],
  );

  // Create materials
  const rayMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          breathPhase: { value: 0 },
          bloomIntensity: { value: bloomIntensity },
          time: { value: 0 },
          primaryColor: { value: BLOOM_COLORS.primary },
          secondaryColor: { value: BLOOM_COLORS.secondary },
        },
        vertexShader: rayVertexShader,
        fragmentShader: rayFragmentShader,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [bloomIntensity],
  );

  const flowerMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          breathPhase: { value: 0 },
          bloomIntensity: { value: bloomIntensity },
          time: { value: 0 },
          color: { value: BLOOM_COLORS.center },
        },
        vertexShader: flowerVertexShader,
        fragmentShader: flowerFragmentShader,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [bloomIntensity],
  );

  // Cleanup
  useDisposeMaterials([rayMaterial, flowerMaterial]);
  useDisposeGeometries([rayGeometry, flowerGeometry]);

  // Animation
  useFrame((state) => {
    if (!groupRef.current || !enabled || bloomIntensity === 0) return;

    try {
      const breathEntity = world.queryFirst(breathPhase);
      if (breathEntity) {
        const phase = breathEntity.get(breathPhase)?.value ?? 0;
        const time = state.clock.elapsedTime;

        // Update uniforms
        rayMaterial.uniforms.breathPhase.value = phase;
        rayMaterial.uniforms.bloomIntensity.value = bloomIntensity;
        rayMaterial.uniforms.time.value = time;

        flowerMaterial.uniforms.breathPhase.value = phase;
        flowerMaterial.uniforms.bloomIntensity.value = bloomIntensity;
        flowerMaterial.uniforms.time.value = time;

        // Scale pulse with breath
        const scale = 1.0 + phase * 0.1 * bloomIntensity;
        groupRef.current.scale.set(scale, scale, scale);

        // Slow rotation
        groupRef.current.rotation.y = time * 0.03;
      }
    } catch {
      // Ignore ECS errors
    }
  });

  // Don't render if not enabled or no bloom
  if (!enabled || bloomIntensity === 0) return null;

  return (
    <group ref={groupRef} name="Globe Bloom">
      {/* Emanating rays */}
      <mesh geometry={rayGeometry} material={rayMaterial} rotation={[-Math.PI / 2, 0, 0]} />

      {/* Flower of life ring */}
      <mesh
        geometry={flowerGeometry}
        material={flowerMaterial}
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, 0.1, 0]}
      />

      {/* Secondary ring - offset */}
      <mesh
        geometry={flowerGeometry}
        material={flowerMaterial}
        rotation={[Math.PI / 2, 0, Math.PI / 12]}
        position={[0, -0.1, 0]}
        scale={0.9}
      />
    </group>
  );
}

export default GlobeBloom;
