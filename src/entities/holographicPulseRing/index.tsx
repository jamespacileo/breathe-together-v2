/**
 * HolographicPulseRing - Expanding holographic ring effect around the globe
 *
 * Features:
 * - Multiple concentric rings that pulse with breathing
 * - Exhale: rings expand outward like puddles/ripples
 * - Inhale: rings contract inward toward globe
 * - Hold phases: in-place shimmer/oscillation animation
 * - Holographic aesthetic with fresnel glow, scanlines, and chromatic effects
 *
 * Inspired by:
 * - Music reactive holographic visualizers
 * - Sci-fi HUD expanding ring animations
 * - Water puddle ripple physics
 *
 * Technical approach:
 * - Uses RingGeometry for each concentric ring
 * - Custom ShaderMaterial for holographic effects
 * - Breathing phase drives ring scale (radius expansion/contraction)
 * - Hold phases use time-based animation for in-place shimmer
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { useDisposeGeometries, useDisposeMaterials } from '../../hooks/useDisposeMaterials';
import { breathPhase, phaseType, rawProgress } from '../breath/traits';

// ============================================================================
// SHADER CODE
// ============================================================================

/**
 * Vertex shader - passes UV and position for fragment calculations
 * Adds slight vertical displacement based on distance for "floating" effect
 */
const vertexShader = `
varying vec2 vUv;
varying float vDistance;

uniform float time;
uniform float breathPhase;
uniform float waveHeight;

void main() {
  vUv = uv;

  // Calculate distance from center (0.5, 0.5)
  vec2 center = vec2(0.5);
  vDistance = distance(uv, center) * 2.0;

  // Slight vertical wave based on distance and time
  vec3 pos = position;
  float wave = sin(vDistance * 6.28318 - time * 2.0) * waveHeight * (1.0 - breathPhase * 0.5);
  pos.y += wave;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

/**
 * Fragment shader - holographic ring effect with breathing synchronization
 *
 * Effects:
 * 1. Concentric rings with soft falloff
 * 2. Fresnel-like glow at ring edges
 * 3. Animated scanlines for holographic look
 * 4. Chromatic aberration for sci-fi feel
 * 5. Breathing-synchronized opacity and color
 */
const fragmentShader = `
uniform float time;
uniform float breathPhase;
uniform float phaseType;
uniform float rawProgress;
uniform vec3 baseColor;
uniform vec3 accentColor;
uniform float ringCount;
uniform float ringThickness;
uniform float glowIntensity;
uniform float scanlineIntensity;
uniform float scanlineSpeed;
uniform float opacity;

varying vec2 vUv;
varying float vDistance;

// Soft step function for smoother transitions
float softStep(float edge0, float edge1, float x) {
  float t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}

// Create a single ring with soft edges
float ring(float dist, float radius, float thickness) {
  float inner = radius - thickness * 0.5;
  float outer = radius + thickness * 0.5;
  float fade = thickness * 0.3;

  float innerFade = softStep(inner - fade, inner, dist);
  float outerFade = 1.0 - softStep(outer, outer + fade, dist);

  return innerFade * outerFade;
}

// Scanline pattern for holographic effect
float scanlines(vec2 uv, float time) {
  float scan = sin(uv.y * 80.0 + time * scanlineSpeed) * 0.5 + 0.5;
  scan = pow(scan, 8.0); // Sharp scanlines
  return scan * scanlineIntensity;
}

// Fresnel-like glow based on ring edge
float fresnelGlow(float dist, float radius, float thickness) {
  float edge = abs(dist - radius);
  float glow = 1.0 - smoothstep(0.0, thickness * 1.5, edge);
  return pow(glow, 2.0) * glowIntensity;
}

void main() {
  vec2 center = vec2(0.5);
  float dist = distance(vUv, center) * 2.0;

  // === BREATHING ANIMATION ===
  // breathPhase: 0 = exhaled (rings expanded), 1 = inhaled (rings contracted)
  // We invert for visual: high breathPhase = rings closer to center

  float expansionFactor = 1.0 - breathPhase;

  // During hold phases (1 or 3), add subtle oscillation
  float holdOscillation = 0.0;
  if (phaseType == 1.0 || phaseType == 3.0) {
    // Underdamped oscillation during hold
    float dampedAmp = 0.02 * exp(-rawProgress * 2.0);
    holdOscillation = dampedAmp * sin(rawProgress * 12.566);
  }

  expansionFactor += holdOscillation;

  // === RING PATTERN ===
  float rings = 0.0;
  float glow = 0.0;

  for (float i = 0.0; i < 5.0; i++) {
    if (i >= ringCount) break;

    // Each ring has different base radius, all scale with breathing
    float baseRadius = 0.15 + i * 0.18;

    // Animate radius based on breathing (expand on exhale, contract on inhale)
    float animatedRadius = baseRadius * (0.5 + expansionFactor * 0.8);

    // Add ripple phase offset for puddle-like wave propagation
    float phaseOffset = i * 0.15;
    float rippleTime = time * 0.5 - phaseOffset;
    float ripple = sin(rippleTime) * 0.02 * (1.0 + expansionFactor);
    animatedRadius += ripple;

    // Thickness decreases for outer rings
    float thickness = ringThickness * (1.0 - i * 0.15);

    // Combine ring and its glow
    rings += ring(dist, animatedRadius, thickness) * (1.0 - i * 0.12);
    glow += fresnelGlow(dist, animatedRadius, thickness) * (1.0 - i * 0.15);
  }

  // === SCANLINES ===
  float scan = scanlines(vUv, time);

  // === COLOR MIXING ===
  // Base color shifts toward accent during exhale
  vec3 color = mix(baseColor, accentColor, expansionFactor * 0.6);

  // Add chromatic aberration effect (subtle color separation)
  float chromaOffset = 0.003 * (1.0 + expansionFactor);
  vec3 chromaColor = vec3(
    color.r * (1.0 + chromaOffset),
    color.g,
    color.b * (1.0 - chromaOffset)
  );

  // Combine all effects
  float intensity = rings + glow * 0.5 + scan * rings * 0.3;

  // Breathing modulates overall opacity
  float breathOpacity = 0.4 + expansionFactor * 0.6; // More visible during exhale

  // Hold phase shimmer - pulsing brightness
  float shimmer = 1.0;
  if (phaseType == 1.0 || phaseType == 3.0) {
    shimmer = 0.85 + 0.15 * sin(time * 8.0);
  }

  // Final alpha with distance falloff
  float distanceFade = 1.0 - smoothstep(0.7, 1.0, dist);
  float alpha = intensity * opacity * breathOpacity * shimmer * distanceFade;

  // Clamp to prevent over-saturation
  alpha = clamp(alpha, 0.0, 1.0);

  gl_FragColor = vec4(chromaColor * (1.0 + glow * 0.3), alpha);
}
`;

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * HolographicPulseRing props
 */
interface HolographicPulseRingProps {
  /**
   * Inner radius of the ring plane
   * @default 1.8
   */
  innerRadius?: number;

  /**
   * Outer radius of the ring plane
   * @default 6.0
   */
  outerRadius?: number;

  /**
   * Number of concentric rings to display (1-5)
   * @default 4
   */
  ringCount?: number;

  /**
   * Thickness of each ring band (0.01-0.2)
   * @default 0.08
   */
  ringThickness?: number;

  /**
   * Base hologram color (teal/cyan for sci-fi look)
   * @default '#4dd9e8'
   */
  baseColor?: string;

  /**
   * Accent color for exhale emphasis
   * @default '#88ffcc'
   */
  accentColor?: string;

  /**
   * Fresnel glow intensity at ring edges
   * @default 0.6
   */
  glowIntensity?: number;

  /**
   * Scanline visibility (0-1)
   * @default 0.3
   */
  scanlineIntensity?: number;

  /**
   * Scanline animation speed
   * @default 3.0
   */
  scanlineSpeed?: number;

  /**
   * Base opacity of the effect
   * @default 0.7
   */
  opacity?: number;

  /**
   * Vertical wave amplitude during animation
   * @default 0.05
   */
  waveHeight?: number;

  /**
   * Y position (height above ground)
   * @default 0
   */
  yPosition?: number;

  /**
   * Enable/disable the effect
   * @default true
   */
  enabled?: boolean;
}

/**
 * HolographicPulseRing - Renders expanding holographic rings synchronized with breathing
 */
export function HolographicPulseRing({
  innerRadius = 1.8,
  outerRadius = 6.0,
  ringCount = 4,
  ringThickness = 0.08,
  baseColor = '#4dd9e8',
  accentColor = '#88ffcc',
  glowIntensity = 0.6,
  scanlineIntensity = 0.3,
  scanlineSpeed = 3.0,
  opacity = 0.7,
  waveHeight = 0.05,
  yPosition = 0,
  enabled = true,
}: HolographicPulseRingProps = {}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const world = useWorld();

  // Parse colors
  const baseColorVec = useMemo(() => new THREE.Color(baseColor), [baseColor]);
  const accentColorVec = useMemo(() => new THREE.Color(accentColor), [accentColor]);

  // Create ring geometry - flat disc with hole in center
  const geometry = useMemo(
    () => new THREE.RingGeometry(innerRadius, outerRadius, 128, 1),
    [innerRadius, outerRadius],
  );

  // Create shader material with all uniforms
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          breathPhase: { value: 0 },
          phaseType: { value: 0 },
          rawProgress: { value: 0 },
          baseColor: { value: baseColorVec },
          accentColor: { value: accentColorVec },
          ringCount: { value: ringCount },
          ringThickness: { value: ringThickness },
          glowIntensity: { value: glowIntensity },
          scanlineIntensity: { value: scanlineIntensity },
          scanlineSpeed: { value: scanlineSpeed },
          opacity: { value: opacity },
          waveHeight: { value: waveHeight },
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [
      baseColorVec,
      accentColorVec,
      ringCount,
      ringThickness,
      glowIntensity,
      scanlineIntensity,
      scanlineSpeed,
      opacity,
      waveHeight,
    ],
  );

  // Update uniform values when props change
  useEffect(() => {
    material.uniforms.baseColor.value = baseColorVec;
    material.uniforms.accentColor.value = accentColorVec;
    material.uniforms.ringCount.value = ringCount;
    material.uniforms.ringThickness.value = ringThickness;
    material.uniforms.glowIntensity.value = glowIntensity;
    material.uniforms.scanlineIntensity.value = scanlineIntensity;
    material.uniforms.scanlineSpeed.value = scanlineSpeed;
    material.uniforms.opacity.value = opacity;
    material.uniforms.waveHeight.value = waveHeight;
  }, [
    material,
    baseColorVec,
    accentColorVec,
    ringCount,
    ringThickness,
    glowIntensity,
    scanlineIntensity,
    scanlineSpeed,
    opacity,
    waveHeight,
  ]);

  // Cleanup GPU resources on unmount
  useDisposeMaterials([material]);
  useDisposeGeometries([geometry]);

  // Animation frame - update shader uniforms with breath data
  useFrame((state) => {
    if (!meshRef.current || !enabled) return;

    try {
      // Get breath entity data
      const breathEntity = world.queryFirst(breathPhase);
      if (breathEntity) {
        const phase = breathEntity.get(breathPhase)?.value ?? 0;
        const type = breathEntity.get(phaseType)?.value ?? 0;
        const progress = breathEntity.get(rawProgress)?.value ?? 0;

        // Update shader uniforms
        material.uniforms.time.value = state.clock.elapsedTime;
        material.uniforms.breathPhase.value = phase;
        material.uniforms.phaseType.value = type;
        material.uniforms.rawProgress.value = progress;
      }
    } catch {
      // Silently catch ECS errors during unmount/remount in Triplex
    }
  });

  if (!enabled) return null;

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, yPosition, 0]}
      name="Holographic Pulse Ring"
    />
  );
}

export default HolographicPulseRing;
