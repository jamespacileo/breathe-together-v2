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
 * MIGRATED TO TSL (Three.js Shading Language) - January 2026
 *
 * Visual style: Monument Valley pastel aesthetic with soft, ethereal glow.
 * Uses drei's <Sphere>, <Ring>, and <Sparkles> components.
 */

// NOTE: Sparkles from drei uses ShaderMaterial - incompatible with WebGPU
import { Ring, Sphere, useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  BackSide,
  Color,
  FrontSide,
  type Group,
  type Mesh,
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
  transformedNormalView,
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
 * Creates a TSL-based textured globe material with fresnel rim glow
 */
function createGlobeMaterial(earthTexture: Texture) {
  const material = new MeshBasicNodeMaterial();
  material.side = FrontSide;

  // Uniforms
  const breathPhaseUniform = uniform(0);
  const earthTextureUniform = texture(earthTexture);

  // Store uniforms for external access
  material.userData.breathPhase = breathPhaseUniform;

  // Build color node using TSL
  const colorNode = Fn(() => {
    // Sample earth texture
    const texColor = earthTextureUniform.uv(uv()).rgb;

    // Fresnel rim for atmospheric glow
    const normal = transformedNormalView;
    // Calculate view direction from world position
    const viewDir = normalize(sub(cameraPosition, positionWorld));
    const fresnelBase = max(dot(normal, viewDir), 0.0);
    const fresnel = pow(sub(1.0, fresnelBase), 4.0); // Tighter falloff

    // Rim color - muted warm cream
    const rimColor = vec3(0.94, 0.9, 0.86);

    // Breathing modulation - subtle brightness shift
    const breathMod = add(1.0, mul(breathPhaseUniform, 0.06));
    const modulatedTex = mul(texColor, breathMod);

    // Blend texture with fresnel rim - very subtle
    const colorWithRim = mix(modulatedTex, rimColor, mul(fresnel, 0.18));

    // Subtle top-down lighting - very gentle
    const topLight = mul(smoothstep(-0.2, 0.8, normal.y), 0.05);
    const topLightColor = vec3(0.98, 0.95, 0.92);
    const finalColor = add(colorWithRim, mul(topLightColor, topLight));

    return vec4(finalColor, 1.0);
  })();

  material.colorNode = colorNode;

  return material;
}

/**
 * Creates a TSL-based glow material - additive blended fresnel glow
 */
function createGlowMaterial() {
  const material = new MeshBasicNodeMaterial();
  material.side = FrontSide;
  material.transparent = true;
  material.blending = AdditiveBlending;
  material.depthWrite = false;

  // Uniforms
  const glowColorUniform = uniform(GLOW_COLOR);
  const glowIntensityUniform = uniform(0.25);
  const breathPhaseUniform = uniform(0);

  // Store uniforms for external access
  material.userData.glowColor = glowColorUniform;
  material.userData.glowIntensity = glowIntensityUniform;
  material.userData.breathPhase = breathPhaseUniform;

  // Build color node using TSL
  const colorNode = Fn(() => {
    const normal = transformedNormalView;
    // Calculate view direction from world position
    const viewDir = normalize(sub(cameraPosition, positionWorld));

    // Fresnel - softer edges with tighter falloff
    const fresnel = pow(sub(1.0, abs(dot(normal, viewDir))), 3.5);

    // Breathing pulse - gentler
    const pulse = add(1.0, mul(breathPhaseUniform, 0.2));

    // Alpha with glow intensity and pulse
    const alpha = mul(mul(fresnel, glowIntensityUniform), pulse);

    return vec4(glowColorUniform.x, glowColorUniform.y, glowColorUniform.z, alpha);
  })();

  material.colorNode = colorNode;

  return material;
}

/**
 * Creates a TSL-based mist material - animated noise haze
 */
function createMistMaterial() {
  const material = new MeshBasicNodeMaterial();
  material.side = FrontSide;
  material.transparent = true;
  material.depthWrite = false;

  // Uniforms
  const timeUniform = uniform(0);
  const breathPhaseUniform = uniform(0);
  const mistColorUniform = uniform(MIST_COLOR);

  // Store uniforms for external access
  material.userData.time = timeUniform;
  material.userData.breathPhase = breathPhaseUniform;
  material.userData.mistColor = mistColorUniform;

  // Build color node using TSL
  const colorNode = Fn(() => {
    const normal = transformedNormalView;
    // Calculate view direction from world position
    const viewDir = normalize(sub(cameraPosition, positionWorld));

    // Fresnel for edge effect
    const fresnel = pow(sub(1.0, abs(dot(normal, viewDir))), 1.5);

    // Simple hash-based noise (TSL compatible)
    // Using UV with time offset for animated noise
    const noiseUV = add(mul(uv(), 4.0), mul(timeUniform, 0.02));

    // Simple sine-based noise approximation
    const n1 = mul(add(sin(mul(noiseUV.x, 12.9898)), sin(mul(noiseUV.y, 78.233))), 0.5);
    const n2 = mul(add(sin(mul(noiseUV.x, 25.9796)), sin(mul(noiseUV.y, 156.466))), 0.3);
    const n3 = mul(add(sin(mul(noiseUV.x, 51.9592)), sin(mul(noiseUV.y, 312.932))), 0.2);
    const noise = add(add(mul(n1, 0.5), mul(n2, 0.3)), mul(n3, 0.2));
    const noiseClamped = add(mul(noise, 0.5), 0.5); // Normalize to 0-1

    // Breathing modulation
    const breath = add(0.6, mul(breathPhaseUniform, 0.4));

    // Combine fresnel edge with noise
    const alpha = mul(mul(mul(fresnel, noiseClamped), 0.15), breath);

    return vec4(mistColorUniform.x, mistColorUniform.y, mistColorUniform.z, alpha);
  })();

  material.colorNode = colorNode;

  return material;
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
  // NOTE: Sparkle props temporarily unused - drei Sparkles incompatible with WebGPU
  // TODO: Re-enable when TSL-based sparkle effect is implemented
  _showSparkles = true,
  showRing = true,
  _sparkleCount = 60,
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

  // Create TSL materials
  const material = useMemo(() => createGlobeMaterial(earthTexture), [earthTexture]);

  const glowMaterial = useMemo(() => createGlowMaterial(), []);

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
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Animation loop requires multiple uniform updates, scale calculations, and rotation - refactoring would reduce readability
  useFrame((state) => {
    if (!groupRef.current) return;

    try {
      // Get breath phase for animation
      const breathEntity = world.queryFirst(breathPhase);
      if (breathEntity) {
        const phase = breathEntity.get(breathPhase)?.value ?? 0;

        // Update TSL material uniforms via userData
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

      {/* NOTE: Sparkles disabled - drei Sparkles uses ShaderMaterial incompatible with WebGPU */}
      {/* TODO: Create TSL-based sparkle effect for WebGPU compatibility */}
      {/* {showSparkles && (
        <Sparkles
          count={sparkleCount}
          size={4}
          scale={[radius * 3.5, radius * 3.5, radius * 3.5]}
          speed={0.25}
          opacity={0.45}
          color="#f8d0a8"
        />
      )} */}

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
