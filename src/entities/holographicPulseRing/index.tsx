/**
 * HolographicPulseRing - Expanding holographic rings around the globe
 *
 * Inspired by holographic music reactive visualizers and sci-fi UI displays.
 * Creates concentric rings that:
 * - Expand outward like puddles during exhale
 * - Contract inward during inhale
 * - Shimmer in-place during hold phases
 *
 * Visual style: Iridescent holographic with Fresnel glow, scanlines, and color cycling.
 *
 * References:
 * - Anderson Mancini's threejs-holographic-material (Fresnel + scanlines)
 * - Three.js Journey Hologram Shader (stripes pattern)
 * - Iridescent shader techniques (HSL color cycling based on view angle)
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { useDisposeGeometries, useDisposeMaterials } from '../../hooks/useDisposeMaterials';
import { breathPhase, phaseType, rawProgress } from '../breath/traits';

// =============================================================================
// GLSL Shaders
// =============================================================================

/**
 * Vertex shader - passes position and normal data for Fresnel calculation
 */
const vertexShader = `
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec2 vUv;
varying float vRadialDist;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vUv = uv;

  // Calculate radial distance from center for ring effects
  vRadialDist = length(position.xy);

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

/**
 * Fragment shader - creates holographic effect with:
 * - Iridescent color cycling (rainbow based on view angle + time)
 * - Fresnel edge glow
 * - Animated scanlines
 * - Pulse wave patterns that ripple outward
 */
const fragmentShader = `
uniform float time;
uniform float breathPhase;
uniform float phaseType;
uniform float rawProgress;
uniform float ringIndex;
uniform float ringCount;
uniform vec3 baseColor;
uniform float opacity;
uniform float signalSpeed;
uniform float scanlineSize;
uniform float fresnelIntensity;
uniform float hologramBrightness;
uniform float iridescenceIntensity;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec2 vUv;
varying float vRadialDist;

// HSL to RGB conversion for iridescent colors
vec3 hsl2rgb(float h, float s, float l) {
  vec3 rgb = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return l + s * (rgb - 0.5) * (1.0 - abs(2.0 * l - 1.0));
}

// Simple noise for shimmer effect
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
  // === FRESNEL EFFECT ===
  // Creates glowing edges characteristic of holograms
  vec3 viewDir = normalize(vViewPosition);
  float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 3.0);
  fresnel = mix(0.3, 1.0, fresnel) * fresnelIntensity;

  // === IRIDESCENT COLOR ===
  // Color shifts based on view angle and time, like oil on water
  float hueShift = fresnel * 0.5 + time * 0.1 + ringIndex * 0.15;
  vec3 iridescentColor = hsl2rgb(mod(hueShift, 1.0), 0.8, 0.6);

  // === SCANLINES ===
  // Horizontal lines that move, giving holographic display feel
  float scanlineY = vUv.y * scanlineSize;
  float scanline = smoothstep(0.4, 0.5, fract(scanlineY + time * signalSpeed));
  scanline = mix(0.7, 1.0, scanline);

  // === RADIAL PULSE WAVES ===
  // Concentric rings that ripple outward/inward based on breathing
  float pulsePhase = time * 2.0 + ringIndex * 0.5;
  float radialWave = sin(vRadialDist * 8.0 - pulsePhase) * 0.5 + 0.5;

  // === BREATHING-REACTIVE ANIMATION ===
  float breathEffect = 1.0;
  float shimmer = 1.0;

  // phaseType: 0=inhale, 1=hold-in, 2=exhale, 3=hold-out
  if (phaseType < 0.5) {
    // INHALE: Energy gathering, subtle pulsing toward center
    float inhaleWave = sin(vRadialDist * 12.0 + time * 4.0) * 0.5 + 0.5;
    breathEffect = mix(0.8, 1.2, inhaleWave * (1.0 - rawProgress));
  } else if (phaseType < 1.5) {
    // HOLD-IN: Energized shimmer, anticipation
    float noiseVal = noise(vUv * 20.0 + time * 3.0);
    shimmer = 1.0 + noiseVal * 0.4 * sin(time * 8.0);
    breathEffect = 1.0 + sin(time * 6.0) * 0.15;
  } else if (phaseType < 2.5) {
    // EXHALE: Ripples expanding outward like breath
    float exhaleWave = sin(vRadialDist * 6.0 - time * 3.0 - rawProgress * 4.0) * 0.5 + 0.5;
    breathEffect = mix(1.0, 1.4, exhaleWave * rawProgress);
    // Add secondary ripple
    float ripple2 = sin(vRadialDist * 10.0 - time * 5.0) * 0.5 + 0.5;
    breathEffect += ripple2 * 0.2 * rawProgress;
  } else {
    // HOLD-OUT: Calm, subtle ambient shimmer
    float calmNoise = noise(vUv * 10.0 + time);
    shimmer = 1.0 + calmNoise * 0.15 * sin(time * 2.0);
    breathEffect = 0.9 + sin(time * 1.5) * 0.1;
  }

  // === FINAL COLOR COMPOSITION ===
  // Blend base color with iridescent effect
  vec3 color = mix(baseColor, iridescentColor, iridescenceIntensity);

  // Apply scanlines
  color *= scanline;

  // Apply breathing effect
  color *= breathEffect * shimmer;

  // Apply fresnel glow
  color += fresnel * iridescentColor * 0.5;

  // Apply radial wave pattern
  color *= mix(0.8, 1.0, radialWave * 0.3);

  // Brightness adjustment
  color *= hologramBrightness;

  // Edge fade for soft ring edges
  float edgeFade = smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.9, vUv.x);

  // Alpha: combine fresnel, scanlines, and opacity
  float alpha = opacity * fresnel * scanline * edgeFade * breathEffect;

  // Clamp and output
  gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
}
`;

// =============================================================================
// Component Props
// =============================================================================

interface HolographicPulseRingProps {
  /**
   * Number of concentric rings
   * @min 1 @max 8 @step 1
   * @default 4
   */
  ringCount?: number;

  /**
   * Base radius of the innermost ring (should be larger than globe)
   * @min 1.5 @max 5.0 @step 0.1
   * @default 2.0
   */
  baseRadius?: number;

  /**
   * Spacing between rings
   * @min 0.1 @max 1.0 @step 0.05
   * @default 0.4
   */
  ringSpacing?: number;

  /**
   * Width of each ring
   * @min 0.02 @max 0.3 @step 0.01
   * @default 0.08
   */
  ringWidth?: number;

  /**
   * Base color of the holographic effect (teal matches app aesthetic)
   * @default "#4dd9e8"
   */
  baseColor?: string;

  /**
   * Overall opacity
   * @min 0.0 @max 1.0 @step 0.05
   * @default 0.6
   */
  opacity?: number;

  /**
   * Speed of scanline animation
   * @min 0.0 @max 2.0 @step 0.1
   * @default 0.5
   */
  signalSpeed?: number;

  /**
   * Number of scanlines across the ring
   * @min 1 @max 30 @step 1
   * @default 12
   */
  scanlineSize?: number;

  /**
   * Intensity of Fresnel edge glow
   * @min 0.0 @max 2.0 @step 0.1
   * @default 1.2
   */
  fresnelIntensity?: number;

  /**
   * Overall brightness multiplier
   * @min 0.5 @max 3.0 @step 0.1
   * @default 1.5
   */
  hologramBrightness?: number;

  /**
   * Intensity of rainbow iridescence effect
   * @min 0.0 @max 1.0 @step 0.05
   * @default 0.4
   */
  iridescenceIntensity?: number;

  /**
   * How much rings expand during exhale (multiplier)
   * @min 1.0 @max 2.0 @step 0.05
   * @default 1.3
   */
  exhaleExpansion?: number;

  /**
   * How much rings contract during inhale (multiplier)
   * @min 0.5 @max 1.0 @step 0.05
   * @default 0.85
   */
  inhaleContraction?: number;
}

// =============================================================================
// Component
// =============================================================================

/**
 * HolographicPulseRing - Renders concentric holographic rings around the globe
 * that respond to breathing phases with expansion/contraction/shimmer effects.
 */
export function HolographicPulseRing({
  ringCount = 4,
  baseRadius = 2.0,
  ringSpacing = 0.4,
  ringWidth = 0.08,
  baseColor = '#4dd9e8',
  opacity = 0.6,
  signalSpeed = 0.5,
  scanlineSize = 12,
  fresnelIntensity = 1.2,
  hologramBrightness = 1.5,
  iridescenceIntensity = 0.4,
  exhaleExpansion = 1.3,
  inhaleContraction = 0.85,
}: HolographicPulseRingProps = {}) {
  const groupRef = useRef<THREE.Group>(null);
  const world = useWorld();

  // Parse base color once
  const colorObj = useMemo(() => new THREE.Color(baseColor), [baseColor]);

  // Create ring geometries and materials for each ring
  const rings = useMemo(() => {
    return Array.from({ length: ringCount }, (_, i) => {
      const innerRadius = baseRadius + i * ringSpacing;
      const outerRadius = innerRadius + ringWidth;

      // RingGeometry(innerRadius, outerRadius, thetaSegments, phiSegments)
      const geometry = new THREE.RingGeometry(innerRadius, outerRadius, 128, 1);

      const material = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          breathPhase: { value: 0 },
          phaseType: { value: 0 },
          rawProgress: { value: 0 },
          ringIndex: { value: i },
          ringCount: { value: ringCount },
          baseColor: { value: colorObj },
          opacity: { value: opacity },
          signalSpeed: { value: signalSpeed },
          scanlineSize: { value: scanlineSize },
          fresnelIntensity: { value: fresnelIntensity },
          hologramBrightness: { value: hologramBrightness },
          iridescenceIntensity: { value: iridescenceIntensity },
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      return { id: `holo-ring-${i}`, geometry, material, baseInnerRadius: innerRadius };
    });
  }, [
    ringCount,
    baseRadius,
    ringSpacing,
    ringWidth,
    colorObj,
    opacity,
    signalSpeed,
    scanlineSize,
    fresnelIntensity,
    hologramBrightness,
    iridescenceIntensity,
  ]);

  // Cleanup on unmount
  const geometries = useMemo(() => rings.map((r) => r.geometry), [rings]);
  const materials = useMemo(() => rings.map((r) => r.material), [rings]);
  useDisposeGeometries(geometries);
  useDisposeMaterials(materials);

  // Animation frame - update shader uniforms and ring scales
  useFrame((state) => {
    if (!groupRef.current) return;

    try {
      // Get breath state from ECS
      const breathEntity = world.queryFirst(breathPhase);
      if (!breathEntity) return;

      const phase = breathEntity.get(breathPhase)?.value ?? 0;
      const currentPhaseType = breathEntity.get(phaseType)?.value ?? 0;
      const progress = breathEntity.get(rawProgress)?.value ?? 0;

      const time = state.clock.elapsedTime;

      // Update each ring
      rings.forEach((ring, i) => {
        const { material } = ring;
        const mesh = groupRef.current?.children[i] as THREE.Mesh;

        // Update shader uniforms
        material.uniforms.time.value = time;
        material.uniforms.breathPhase.value = phase;
        material.uniforms.phaseType.value = currentPhaseType;
        material.uniforms.rawProgress.value = progress;

        // Calculate scale based on breathing phase
        let scale = 1.0;

        // phaseType: 0=inhale, 1=hold-in, 2=exhale, 3=hold-out
        if (currentPhaseType === 0) {
          // INHALE: Contract inward (scale decreases as phase progresses)
          // phase goes 0->1 during inhale, we want rings to shrink
          scale = THREE.MathUtils.lerp(1.0, inhaleContraction, phase);
        } else if (currentPhaseType === 1) {
          // HOLD-IN: Subtle pulse in place at contracted state
          const holdPulse = Math.sin(time * 4.0 + i * 0.5) * 0.03;
          scale = inhaleContraction + holdPulse;
        } else if (currentPhaseType === 2) {
          // EXHALE: Expand outward like ripples (scale increases)
          // phase goes 1->0 during exhale, progress goes 0->1
          // We want rings to expand as exhale progresses
          scale = THREE.MathUtils.lerp(inhaleContraction, exhaleExpansion, progress);

          // Staggered ripple effect - outer rings expand slightly delayed
          const rippleDelay = i * 0.08;
          const delayedProgress = Math.max(0, progress - rippleDelay);
          scale = THREE.MathUtils.lerp(inhaleContraction, exhaleExpansion, delayedProgress);
        } else {
          // HOLD-OUT: Gentle ambient motion at expanded state
          const restPulse = Math.sin(time * 2.0 + i * 0.3) * 0.02;
          scale = exhaleExpansion + restPulse;
        }

        // Apply scale to mesh
        if (mesh) {
          mesh.scale.setScalar(scale);
        }
      });
    } catch {
      // Ignore ECS errors during unmount/remount in Triplex
    }
  });

  return (
    <group ref={groupRef} name="Holographic Pulse Rings" rotation={[Math.PI / 2, 0, 0]}>
      {rings.map((ring) => (
        <mesh key={ring.id} geometry={ring.geometry} material={ring.material} />
      ))}
    </group>
  );
}

export default HolographicPulseRing;
