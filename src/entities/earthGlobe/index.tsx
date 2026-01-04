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
 *
 * MIGRATED TO TSL (Three.js Shading Language) - January 2026
 */

import { Ring, Sparkles, Sphere, useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef } from 'react';
import type { Group, Mesh } from 'three';
import {
  AdditiveBlending,
  BackSide,
  Color,
  FrontSide,
  MeshBasicMaterial,
  SphereGeometry,
  SRGBColorSpace,
  type Texture,
} from 'three';
import {
  abs,
  add,
  cameraPosition,
  dot,
  Fn,
  glslFn,
  max,
  mix,
  mul,
  normalize,
  positionWorld,
  pow,
  sin,
  smoothstep,
  sub,
  texture,
  transformedNormalWorld,
  uniform,
  uv,
  vec3,
  vec4,
} from 'three/tsl';
import { MeshBasicNodeMaterial } from 'three/webgpu';

import { useDisposeGeometries, useDisposeMaterials } from '../../hooks/useDisposeMaterials';
import { breathPhase } from '../breath/traits';

/**
 * Atmosphere halo configuration - pastel layers around the globe
 */
const ATMOSPHERE_LAYERS = [
  { scale: 1.08, color: '#f8d0a8', opacity: 0.08 }, // Inner: warm peach
  { scale: 1.14, color: '#b8e8d4', opacity: 0.05 }, // Middle: soft teal
  { scale: 1.22, color: '#c4b8e8', opacity: 0.03 }, // Outer: pale lavender
];

/**
 * Pre-allocated Color objects for shader uniforms
 * Hoisted to module level to avoid recreation on component remount
 */
const GLOW_COLOR = new Color('#efe5da'); // Very soft muted cream
const MIST_COLOR = new Color('#f0ebe6'); // Soft warm white

/**
 * GLSL noise function for mist shader (wrapped for TSL)
 */
const mistNoiseGLSL = glslFn(`
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

  float main(vec2 uv) {
    return noise(uv) * 0.5 + noise(uv * 2.0) * 0.3 + noise(uv * 4.0) * 0.2;
  }
`);

/**
 * Create globe material with TSL (textured with fresnel rim)
 */
function createGlobeMaterial(earthTexture: Texture) {
  const mat = new MeshBasicNodeMaterial();
  mat.side = FrontSide;

  // Uniforms
  const breathPhaseUniform = uniform(0);
  mat.userData.breathPhase = breathPhaseUniform;

  // Build color node
  const colorNode = Fn(() => {
    // Sample earth texture
    const texColor = texture(earthTexture, uv()).rgb;

    // Calculate view direction
    const normal = transformedNormalWorld;
    const viewDir = normalize(sub(cameraPosition, positionWorld));

    // Fresnel rim for atmospheric glow
    const fresnel = pow(sub(1.0, max(dot(normal, viewDir), 0.0)), 4.0);
    const rimColor = vec3(0.94, 0.9, 0.86); // Muted warm cream

    // Breathing modulation - subtle brightness shift
    const breathMod = add(1.0, mul(breathPhaseUniform, 0.06));
    const texColorModulated = mul(texColor, breathMod);

    // Blend texture with fresnel rim - very subtle
    const blendedColor = mix(texColorModulated, rimColor, mul(fresnel, 0.18));

    // Subtle top-down lighting - very gentle
    const topLight = mul(smoothstep(-0.2, 0.8, normal.y), 0.05);
    const lightColor = vec3(0.98, 0.95, 0.92);
    const finalColor = add(blendedColor, mul(lightColor, topLight));

    return vec4(finalColor, 1.0);
  })();

  mat.colorNode = colorNode;

  return mat;
}

/**
 * Create glow material with TSL (additive fresnel)
 */
function createGlowMaterial() {
  const mat = new MeshBasicNodeMaterial();
  mat.side = FrontSide;
  mat.transparent = true;
  mat.blending = AdditiveBlending;
  mat.depthWrite = false;

  // Uniforms
  const breathPhaseUniform = uniform(0);
  mat.userData.breathPhase = breathPhaseUniform;

  // Build color node
  const colorNode = Fn(() => {
    // Calculate view direction
    const normal = transformedNormalWorld;
    const viewDir = normalize(sub(cameraPosition, positionWorld));

    // Fresnel - softer edges with tighter falloff
    const fresnel = pow(sub(1.0, abs(dot(normal, viewDir))), 3.5);

    // Breathing pulse - gentler
    const pulse = add(1.0, mul(breathPhaseUniform, 0.2));

    // Final alpha
    const glowIntensity = 0.25;
    const alpha = mul(mul(fresnel, glowIntensity), pulse);

    const glowColor = vec3(GLOW_COLOR.r, GLOW_COLOR.g, GLOW_COLOR.b);
    return vec4(glowColor, alpha);
  })();

  mat.colorNode = colorNode;

  return mat;
}

/**
 * Create mist material with TSL (animated noise haze)
 */
function createMistMaterial() {
  const mat = new MeshBasicNodeMaterial();
  mat.side = FrontSide;
  mat.transparent = true;
  mat.depthWrite = false;

  // Uniforms
  const timeUniform = uniform(0);
  const breathPhaseUniform = uniform(0);
  mat.userData.time = timeUniform;
  mat.userData.breathPhase = breathPhaseUniform;

  // Build color node
  const colorNode = Fn(() => {
    // Calculate view direction
    const normal = transformedNormalWorld;
    const viewDir = normalize(sub(cameraPosition, positionWorld));

    // Fresnel edge
    const fresnel = pow(sub(1.0, abs(dot(normal, viewDir))), 1.5);

    // Animated UV for noise
    const animatedUv = add(mul(uv(), 4.0), mul(timeUniform, 0.02));

    // Get noise value from GLSL function
    const noiseValue = mistNoiseGLSL(animatedUv);

    // Breathing modulation
    const breath = add(0.6, mul(breathPhaseUniform, 0.4));

    // Combine fresnel edge with noise
    const alpha = mul(mul(mul(fresnel, noiseValue), 0.15), breath);

    const mistColor = vec3(MIST_COLOR.r, MIST_COLOR.g, MIST_COLOR.b);
    return vec4(mistColor, alpha);
  })();

  mat.colorNode = colorNode;

  return mat;
}

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
  const groupRef = useRef<Group>(null);
  const ringRef = useRef<Mesh>(null);
  const atmosphereRefs = useRef<(Mesh | null)[]>([]);
  const world = useWorld();

  // Load earth texture using drei's useTexture hook
  const earthTexture = useTexture('/textures/earth-texture.png');

  // Configure texture
  useEffect(() => {
    earthTexture.colorSpace = SRGBColorSpace;
    earthTexture.anisotropy = 16;
  }, [earthTexture]);

  // Create TSL globe material with texture
  const material = useMemo(() => createGlobeMaterial(earthTexture), [earthTexture]);

  // Create TSL glow material - additive blended fresnel glow
  const glowMaterial = useMemo(() => createGlowMaterial(), []);

  // Create TSL mist material - animated noise haze
  const mistMaterial = useMemo(() => createMistMaterial(), []);

  // Create memoized atmosphere geometries and materials to prevent GPU leaks
  const atmosphereGeometry = useMemo(() => new SphereGeometry(radius, 32, 32), [radius]);

  const atmosphereMaterials = useMemo(
    () =>
      ATMOSPHERE_LAYERS.map(
        (layer) =>
          new MeshBasicMaterial({
            color: layer.color,
            transparent: true,
            opacity: layer.opacity,
            side: BackSide,
            depthWrite: false,
          }),
      ),
    [],
  );

  // Create memoized ring material to prevent GPU leak
  const ringMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        color: '#e8c4b8',
        transparent: true,
        opacity: 0.15,
        side: FrontSide, // Ring only viewed from above, no backface needed
        depthWrite: false,
      }),
    [],
  );

  // Cleanup all materials on unmount using helper hook
  useDisposeMaterials([material, glowMaterial, mistMaterial, ...atmosphereMaterials, ringMaterial]);

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

        // Update TSL shader uniforms via userData
        if (material.userData.breathPhase) {
          material.userData.breathPhase.value = phase;
        }
        if (glowMaterial.userData.breathPhase) {
          glowMaterial.userData.breathPhase.value = phase;
        }
        if (mistMaterial.userData.breathPhase) {
          mistMaterial.userData.breathPhase.value = phase;
        }
        if (mistMaterial.userData.time) {
          mistMaterial.userData.time.value = state.clock.elapsedTime;
        }

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

        // Animate ring opacity with breathing (use memoized material directly)
        ringMaterial.opacity = 0.12 + phase * 0.08; // 12% to 20%
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
      <Sphere args={[radius, resolution, resolution]} material={material} />

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
