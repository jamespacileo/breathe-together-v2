/**
 * EarthGlobe - Central core visualization (stylized textured earth)
 *
 * Features:
 * - Stylized earth texture with pastel teal oceans and warm landmasses
 * - Subtle pulse animation (1.0 → 1.06, 6% scale change)
 * - Slow Y-axis rotation
 * - Soft fresnel rim for atmospheric glow
 * - Layered atmosphere halo (3 pastel-colored translucent spheres)
 * - Inner glow (additive blended fresnel for warm light bloom)
 * - Animated mist layer (noise-based haze that breathes)
 * - Sparkle aura (visible floating dust particles)
 * - Equator ring (subtle rose gold accent ring)
 * - Orbiting cloud layer (wispy weather patterns that drift above the surface)
 * - Orbiting satellites with trails (colorful objects circling the globe)
 * - Optional flight paths (subtle orbital ring guides)
 *
 * Visual style: Monument Valley pastel aesthetic with soft, ethereal glow.
 * Uses drei's <Sphere>, <Ring>, <Sparkles>, <Cloud>, <Clouds>, and <Trail> components.
 */

import { Cloud, Clouds, Ring, Sparkles, Sphere, Trail, useTexture } from '@react-three/drei';
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
  float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 4.0); // Tighter falloff
  vec3 rimColor = vec3(0.94, 0.90, 0.86); // Muted warm cream, closer to background

  // Breathing modulation - subtle brightness shift
  float breathMod = 1.0 + breathPhase * 0.06;
  texColor *= breathMod;

  // Blend texture with fresnel rim - very subtle
  vec3 finalColor = mix(texColor, rimColor, fresnel * 0.18);

  // Subtle top-down lighting - very gentle
  float topLight = smoothstep(-0.2, 0.8, vNormal.y) * 0.05;
  finalColor += vec3(0.98, 0.95, 0.92) * topLight;

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

// Glow shader - cheap additive fresnel glow
const glowVertexShader = `
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

const glowFragmentShader = `
uniform vec3 glowColor;
uniform float glowIntensity;
uniform float breathPhase;

varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vec3 viewDir = normalize(vViewPosition);
  // Fresnel - softer edges with tighter falloff
  float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 3.5);
  // Breathing pulse - gentler
  float pulse = 1.0 + breathPhase * 0.2;
  float alpha = fresnel * glowIntensity * pulse;
  gl_FragColor = vec4(glowColor, alpha);
}
`;

// Mist shader - subtle animated noise haze
const mistVertexShader = `
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

const mistFragmentShader = `
uniform float time;
uniform float breathPhase;
uniform vec3 mistColor;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec2 vUv;

// Simple noise function
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
  vec3 viewDir = normalize(vViewPosition);
  float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 1.5);

  // Animated noise for misty effect
  vec2 uv = vUv * 4.0 + time * 0.02;
  float n = noise(uv) * 0.5 + noise(uv * 2.0) * 0.3 + noise(uv * 4.0) * 0.2;

  // Breathing modulation
  float breath = 0.6 + breathPhase * 0.4;

  // Combine fresnel edge with noise
  float alpha = fresnel * n * 0.15 * breath;

  gl_FragColor = vec4(mistColor, alpha);
}
`;

/**
 * Orbiting satellite configuration - satellites with trails
 */
interface OrbitingSatelliteProps {
  radius: number;
  speed: number;
  inclination: number;
  startAngle: number;
  color: string;
  size: number;
}

/**
 * OrbitingSatellite - A small glowing object that orbits the globe with a trail
 */
function OrbitingSatellite({
  radius,
  speed,
  inclination,
  startAngle,
  color,
  size,
}: OrbitingSatelliteProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;

    const time = state.clock.elapsedTime;
    const angle = startAngle + time * speed;

    // Calculate position on inclined orbit - hugging the surface
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = Math.sin(angle) * Math.sin(inclination) * radius * 0.15;

    meshRef.current.position.set(x, y, z);
  });

  return (
    <Trail width={size * 1.5} length={4} color={color} attenuation={(t) => t * t} decay={2}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[size, 6, 6]} />
        <meshBasicMaterial color={color} transparent opacity={0.7} />
      </mesh>
    </Trail>
  );
}

/**
 * GlobeCloudLayer - Wispy clouds that float just above the globe surface
 */
interface GlobeCloudLayerProps {
  radius: number;
  opacity?: number;
  speed?: number;
}

function GlobeCloudLayer({ radius, opacity = 0.25, speed = 0.2 }: GlobeCloudLayerProps) {
  const cloudsRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (cloudsRef.current) {
      // Very slow rotation for subtle drift
      cloudsRef.current.rotation.y = state.clock.elapsedTime * 0.008 * speed;
    }
  });

  const cloudDist = radius * 1.02; // Just barely above the surface

  return (
    <group ref={cloudsRef}>
      <Clouds material={THREE.MeshBasicMaterial}>
        {/* Small wisp near equator */}
        <Cloud
          position={[cloudDist * 0.8, 0.1, cloudDist * 0.4]}
          opacity={opacity * 0.6}
          speed={speed * 0.5}
          segments={6}
          bounds={[radius * 0.2, radius * 0.05, radius * 0.15]}
          volume={0.8}
          color="#ffffff"
          fade={8}
        />
        {/* Another small wisp */}
        <Cloud
          position={[-cloudDist * 0.5, cloudDist * 0.3, cloudDist * 0.6]}
          opacity={opacity * 0.5}
          speed={speed * 0.4}
          segments={5}
          bounds={[radius * 0.15, radius * 0.04, radius * 0.12]}
          volume={0.6}
          color="#f8f8f8"
          fade={6}
        />
      </Clouds>
    </group>
  );
}

/**
 * FlightPath - A subtle curved line showing an orbital route
 */
interface FlightPathProps {
  radius: number;
  inclination: number;
  color: string;
  opacity?: number;
}

function FlightPath({ radius, inclination, color, opacity = 0.15 }: FlightPathProps) {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const segments = 64;

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = Math.sin(angle) * Math.sin(inclination) * radius * 0.3;
      pts.push(new THREE.Vector3(x, y, z));
    }

    return pts;
  }, [radius, inclination]);

  const lineGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return geometry;
  }, [points]);

  // Cleanup geometry on unmount
  useEffect(() => {
    return () => {
      lineGeometry.dispose();
    };
  }, [lineGeometry]);

  return (
    <line>
      <primitive object={lineGeometry} attach="geometry" />
      <lineBasicMaterial color={color} transparent opacity={opacity} linewidth={1} />
    </line>
  );
}

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
  /** Sparkle count @default 60 */
  sparkleCount?: number;
  /** Show inner glow effect @default true */
  showGlow?: boolean;
  /** Show mist/haze layer @default true */
  showMist?: boolean;
  /** Show orbiting clouds layer @default true */
  showClouds?: boolean;
  /** Cloud layer opacity @default 0.25 */
  cloudOpacity?: number;
  /** Show orbiting satellites with trails @default true */
  showSatellites?: boolean;
  /** Number of satellites @default 2 */
  satelliteCount?: number;
  /** Show flight path lines @default false */
  showFlightPaths?: boolean;
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
  sparkleCount = 60,
  showGlow = true,
  showMist = true,
  showClouds = true,
  cloudOpacity = 0.25,
  showSatellites = true,
  satelliteCount = 2,
  showFlightPaths = false,
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

  // Create glow material - additive blended fresnel glow
  const glowMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          glowColor: { value: new THREE.Color('#efe5da') }, // Very soft muted cream
          glowIntensity: { value: 0.25 },
          breathPhase: { value: 0 },
        },
        vertexShader: glowVertexShader,
        fragmentShader: glowFragmentShader,
        side: THREE.FrontSide,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );

  // Create mist material - animated noise haze
  const mistMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          breathPhase: { value: 0 },
          mistColor: { value: new THREE.Color('#f0ebe6') }, // Soft warm white
        },
        vertexShader: mistVertexShader,
        fragmentShader: mistFragmentShader,
        side: THREE.FrontSide,
        transparent: true,
        depthWrite: false,
      }),
    [],
  );

  // Cleanup materials on unmount
  useEffect(() => {
    return () => {
      material.dispose();
      glowMaterial.dispose();
      mistMaterial.dispose();
    };
  }, [material, glowMaterial, mistMaterial]);

  // Generate satellite configurations based on count
  const satelliteConfigs = useMemo(() => {
    const configs: OrbitingSatelliteProps[] = [];
    const colors = ['#ffffff', '#f0e8e0']; // Subtle white/cream only
    const orbitRadius = radius * 1.08; // Just above the surface

    for (let i = 0; i < satelliteCount; i++) {
      configs.push({
        radius: orbitRadius + i * 0.03, // Minimal spacing
        speed: 0.08 + i * 0.02, // Slower, calmer speeds
        inclination: Math.PI / 8 + i * 0.2, // Gentle inclinations
        startAngle: (Math.PI * 2 * i) / satelliteCount,
        color: colors[i % colors.length],
        size: 0.02, // Tiny dots
      });
    }

    return configs;
  }, [radius, satelliteCount]);

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
        // Update shader uniforms
        material.uniforms.breathPhase.value = phase;
        glowMaterial.uniforms.breathPhase.value = phase;
        mistMaterial.uniforms.breathPhase.value = phase;
        mistMaterial.uniforms.time.value = state.clock.elapsedTime;

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

      {/* Inner glow - additive blended fresnel */}
      {showGlow && (
        <Sphere args={[radius * 1.02, 32, 32]} material={glowMaterial} frustumCulled={false} />
      )}

      {/* Mist layer - animated noise haze */}
      {showMist && (
        <Sphere args={[radius * 1.15, 32, 32]} material={mistMaterial} frustumCulled={false} />
      )}

      {/* Soft sparkle aura - floating dust particles (more visible) */}
      {showSparkles && (
        <Sparkles
          count={sparkleCount}
          size={4}
          scale={[radius * 3.5, radius * 3.5, radius * 3.5]}
          speed={0.25}
          opacity={0.45}
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

      {/* Orbiting clouds layer - wispy weather patterns */}
      {showClouds && <GlobeCloudLayer radius={radius} opacity={cloudOpacity} speed={0.2} />}

      {/* Flight path lines - subtle orbital guides */}
      {showFlightPaths &&
        satelliteConfigs.map((config, i) => (
          <FlightPath
            key={`flight-path-${config.color}-${i}`}
            radius={config.radius}
            inclination={config.inclination}
            color={config.color}
            opacity={0.12}
          />
        ))}

      {/* Orbiting satellites with trails - planes/satellites circling the globe */}
      {showSatellites &&
        satelliteConfigs.map((config, i) => (
          <OrbitingSatellite key={`satellite-${config.color}-${i}`} {...config} />
        ))}
    </group>
  );
}

export default EarthGlobe;
