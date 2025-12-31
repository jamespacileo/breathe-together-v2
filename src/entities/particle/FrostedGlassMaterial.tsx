/**
 * FrostedGlassMaterial - Enhanced shader material for icosahedral shards
 *
 * Features subtle visual effects that users won't consciously notice but will feel:
 * - Soft fresnel rim glow (edge lighting like the globe)
 * - Breathing luminosity pulse (subtle brightness variation)
 * - Per-vertex mood colors with gentle saturation boost
 * - Subtle inner glow on exhale phase
 *
 * For the refraction effect to work:
 * 1. Mesh must have userData.useRefraction = true
 * 2. Mesh geometry must have a 'color' attribute with per-vertex mood colors
 * 3. RefractionPipeline must be present in the scene tree
 */

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

// Vertex shader - passes normals and colors to fragment
const shardVertexShader = `
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vColor;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vColor = color;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

// Fragment shader - fresnel rim + breathing luminosity + phase cues
const shardFragmentShader = `
uniform float breathPhase;
uniform float phaseType;    // 0=inhale, 1=hold-in, 2=exhale, 3=hold-out
uniform float rawProgress;  // 0-1 progress within current phase
uniform float time;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vColor;

void main() {
  vec3 viewDir = normalize(vViewPosition);

  // === PHASE-AWARE FRESNEL RIM ===
  // Edge glow intensity varies by phase to help users identify current state:
  // - Inhale: Sharp, defined edges (gathering energy)
  // - Hold-in: Bright glow (full presence, peak luminosity)
  // - Exhale: Soft, ethereal edges (releasing)
  // - Hold-out: Minimal glow (calm, settled)
  float baseFresnelPower = 2.5;
  float fresnelIntensity = 0.25;

  if (phaseType < 0.5) {
    // Inhale: sharper edges, moderate glow
    baseFresnelPower = 3.0;
    fresnelIntensity = 0.30;
  } else if (phaseType < 1.5) {
    // Hold-in: soft edges, brightest glow
    baseFresnelPower = 2.0;
    fresnelIntensity = 0.40;
  } else if (phaseType < 2.5) {
    // Exhale: very soft, ethereal glow
    baseFresnelPower = 2.2;
    fresnelIntensity = 0.35;
  } else {
    // Hold-out: minimal glow
    baseFresnelPower = 3.5;
    fresnelIntensity = 0.15;
  }

  float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), baseFresnelPower);

  // === TRANSITION PULSE ===
  // Brief brightness flash at phase start (first 15% of each phase)
  // Helps users notice when phases change
  float transitionPulse = 0.0;
  if (rawProgress < 0.15) {
    // Quick pulse: ramp up then down over 15% of phase
    float pulseT = rawProgress / 0.15;
    transitionPulse = sin(pulseT * 3.14159) * 0.15; // 15% brightness boost
  }

  // === COLOR TEMPERATURE SHIFT ===
  // Subtle warm/cool shift by phase:
  // - Inhale: Warm (gathering, energizing)
  // - Hold-in: Neutral-warm (full, present)
  // - Exhale: Cool (releasing, calming)
  // - Hold-out: Neutral-cool (resting)
  vec3 warmShift = vec3(0.04, 0.02, -0.02);  // Add red/yellow, reduce blue
  vec3 coolShift = vec3(-0.02, 0.01, 0.04);  // Reduce red, add blue

  vec3 temperatureShift = vec3(0.0);
  if (phaseType < 0.5) {
    // Inhale: gradually warm up
    temperatureShift = warmShift * rawProgress;
  } else if (phaseType < 1.5) {
    // Hold-in: stay warm
    temperatureShift = warmShift * 0.8;
  } else if (phaseType < 2.5) {
    // Exhale: transition warm to cool
    temperatureShift = mix(warmShift * 0.5, coolShift, rawProgress);
  } else {
    // Hold-out: stay cool
    temperatureShift = coolShift * 0.6;
  }

  // === BASE LUMINOSITY ===
  // Breathing luminosity pulse - subtle brightness shift
  float breathLuminosity = 1.0 + breathPhase * 0.12 + transitionPulse;

  // Subtle saturation boost based on viewing angle
  float facingBoost = max(dot(vNormal, viewDir), 0.0) * 0.08;

  // Apply mood color with luminosity, temperature shift
  vec3 baseColor = vColor * breathLuminosity + temperatureShift;

  // === RIM GLOW ===
  // Rim color also shifts with temperature
  vec3 rimColor = vec3(0.98, 0.96, 0.94) + temperatureShift * 0.5;
  vec3 colorWithRim = mix(baseColor, rimColor, fresnel * fresnelIntensity);

  // Subtle inner luminance - varies by phase
  float innerGlowBase = 0.05;
  if (phaseType < 1.5) {
    // Inhale/Hold-in: stronger inner glow
    innerGlowBase = 0.07;
  }
  float innerGlow = (1.0 - fresnel) * innerGlowBase * (1.0 + breathPhase * 0.3);
  colorWithRim += vec3(1.0, 0.98, 0.95) * innerGlow;

  // Slight desaturation toward edges for atmospheric feel
  vec3 desaturated = vec3(dot(colorWithRim, vec3(0.299, 0.587, 0.114)));
  vec3 finalColor = mix(desaturated, colorWithRim, 0.85 + facingBoost);

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

interface FrostedGlassMaterialProps {
  /** Base color for non-refraction fallback @default '#ffffff' */
  color?: string;
}

export function FrostedGlassMaterial({ color = '#ffffff' }: FrostedGlassMaterialProps) {
  // Simple placeholder material - actual rendering uses RefractionPipeline shaders
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color,
        vertexColors: true, // Enable per-vertex colors
      }),
    [color],
  );

  // GPU memory cleanup
  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  return <primitive object={material} attach="material" />;
}

/**
 * Creates an enhanced frosted glass shader material for icosahedral shards
 *
 * Returns a ShaderMaterial with:
 * - Fresnel rim glow (soft edge lighting)
 * - Breathing luminosity (synced brightness pulse)
 * - Per-vertex color support
 */
export function createFrostedGlassMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      breathPhase: { value: 0 },
      phaseType: { value: 0 },
      rawProgress: { value: 0 },
      time: { value: 0 },
    },
    vertexShader: shardVertexShader,
    fragmentShader: shardFragmentShader,
    vertexColors: true,
    side: THREE.FrontSide,
  });
}
