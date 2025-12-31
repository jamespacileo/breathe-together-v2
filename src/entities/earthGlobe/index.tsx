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
 *
 * Visual style: Monument Valley pastel aesthetic with soft, ethereal glow.
 * Uses drei's <Sphere>, <Ring>, and <Sparkles> components.
 */

import { Ring, Sparkles, Sphere, useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { BREATH_TOTAL_CYCLE } from '../../constants';
import { calculateAnticipation, calculatePhaseInfo } from '../../lib/breathPhase';
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

// Mist shader - subtle animated noise haze with anticipation quickening
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
uniform float anticipation; // 0-1, intensifies near phase transitions
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

  // ANTICIPATION EFFECT: Mist quickening
  // Speed multiplier: 1x normal → 2.5x at peak anticipation
  float speedMultiplier = 1.0 + anticipation * 1.5;

  // Animated noise for misty effect - faster when anticipating
  vec2 uv = vUv * 4.0 + time * 0.02 * speedMultiplier;
  float n = noise(uv) * 0.5 + noise(uv * 2.0) * 0.3 + noise(uv * 4.0) * 0.2;

  // Breathing modulation
  float breath = 0.6 + breathPhase * 0.4;

  // ANTICIPATION EFFECT: Subtle intensity increase
  // Mist "gathers" before transition - slightly more visible
  float anticipationIntensity = 1.0 + anticipation * 0.25;

  // Combine fresnel edge with noise
  float alpha = fresnel * n * 0.15 * breath * anticipationIntensity;

  gl_FragColor = vec4(mistColor, alpha);
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
  /** Sparkle count @default 60 */
  sparkleCount?: number;
  /** Show inner glow effect @default true */
  showGlow?: boolean;
  /** Show mist/haze layer @default true */
  showMist?: boolean;
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

  // Create mist material - animated noise haze with anticipation
  const mistMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          breathPhase: { value: 0 },
          anticipation: { value: 0 }, // Anticipation intensity 0-1
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

  /**
   * Update globe scale, rotation, and shader uniforms
   * Includes anticipation effects for phase transition hints
   */
  useFrame((state) => {
    if (!groupRef.current) return;

    try {
      // Calculate anticipation from UTC time (same source as breathing)
      const now = Date.now() / 1000;
      const cycleTime = now % BREATH_TOTAL_CYCLE;
      const phaseInfo = calculatePhaseInfo(cycleTime);
      const anticipation = calculateAnticipation(phaseInfo);

      // Get breath phase for animation
      const breathEntity = world?.queryFirst?.(breathPhase);
      if (breathEntity) {
        const phase = breathEntity.get?.(breathPhase)?.value ?? 0;

        // Update shader uniforms
        material.uniforms.breathPhase.value = phase;
        glowMaterial.uniforms.breathPhase.value = phase;
        mistMaterial.uniforms.breathPhase.value = phase;
        mistMaterial.uniforms.time.value = state.clock.elapsedTime;
        mistMaterial.uniforms.anticipation.value = anticipation.easedAnticipation;

        // Subtle pulse: 1.0 to 1.06 (6% scale change)
        const scale = 1.0 + phase * 0.06;
        groupRef.current.scale.set(scale, scale, scale);

        // ANTICIPATION EFFECT: Atmosphere deepening
        // Layers pulse/intensify slightly before transitions
        atmosphereRefs.current.forEach((mesh, i) => {
          if (mesh) {
            const phaseOffset = (i + 1) * 0.15; // Each layer slightly delayed
            const delayedPhase = Math.max(0, phase - phaseOffset);

            // Anticipation makes layers slightly larger/more visible
            const anticipationScale = anticipation.easedAnticipation * 0.015 * (i + 1);
            const layerScale = ATMOSPHERE_LAYERS[i].scale + delayedPhase * 0.04 + anticipationScale;
            mesh.scale.set(layerScale, layerScale, layerScale);

            // Also pulse opacity slightly
            const baseMaterial = mesh.material as THREE.MeshBasicMaterial;
            const baseOpacity = ATMOSPHERE_LAYERS[i].opacity;
            baseMaterial.opacity = baseOpacity + anticipation.easedAnticipation * 0.03;
          }
        });

        // ANTICIPATION EFFECT: Ring pulse sweep
        // A soft glow "pulse" travels around the ring as transition approaches
        if (ringRef.current) {
          const ringMaterial = ringRef.current.material as THREE.MeshBasicMaterial;

          // Base breathing opacity
          const baseOpacity = 0.12 + phase * 0.08; // 12% to 20%

          // Anticipation glow: intensifies as we approach transition
          // Creates a "charging up" effect
          const anticipationGlow = anticipation.easedAnticipation * 0.15;

          // Subtle pulse effect during anticipation (quick oscillation)
          const pulseOscillation = anticipation.isAnticipating
            ? Math.sin(state.clock.elapsedTime * 8) * 0.03 * anticipation.easedAnticipation
            : 0;

          ringMaterial.opacity = baseOpacity + anticipationGlow + pulseOscillation;

          // ANTICIPATION EFFECT: Color temperature shift
          // Ring warms slightly before inhale, cools before exhale
          if (anticipation.isAnticipating && anticipation.nextPhaseIndex === 0) {
            // Before inhale: warm golden tint
            ringMaterial.color.setHex(0xf0c8a8); // Warmer rose gold
          } else if (anticipation.isAnticipating && anticipation.nextPhaseIndex === 2) {
            // Before exhale: cool down slightly
            ringMaterial.color.setHex(0xd8c4c8); // Cooler lavender-rose
          } else {
            // Default rose gold
            ringMaterial.color.setHex(0xe8c4b8);
          }
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
    </group>
  );
}

export default EarthGlobe;
