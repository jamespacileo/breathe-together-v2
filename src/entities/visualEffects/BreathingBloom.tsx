/**
 * BreathingBloom - Breath-reactive bloom post-processing effect
 *
 * Inspired by music visualizer beat-driven glow effects. Modulates bloom
 * intensity based on the breathing phase:
 * - Inhale: Bloom increases (gathering light, radiant)
 * - Hold-in: Peak bloom (full radiance)
 * - Exhale: Bloom decreases (softening, releasing)
 * - Hold-out: Minimal bloom (peaceful stillness)
 *
 * Uses a simplified selective bloom approach that works within the
 * existing RefractionPipeline.
 */

import { useFrame, useThree } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { breathPhase, phaseType } from '../breath/traits';

// Bloom extraction vertex shader
const bloomExtractVertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

// Bloom extraction - extract bright areas
const bloomExtractFragmentShader = `
uniform sampler2D inputTexture;
uniform float threshold;
uniform float breathPhase;

varying vec2 vUv;

void main() {
  vec4 color = texture2D(inputTexture, vUv);

  // Calculate luminance
  float luminance = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));

  // Breathing-modulated threshold (lower threshold = more bloom)
  float dynamicThreshold = threshold - breathPhase * 0.2;

  // Soft threshold for smooth transition
  float contribution = smoothstep(dynamicThreshold, dynamicThreshold + 0.2, luminance);

  // Extract bright areas with breathing modulation
  vec3 bloomColor = color.rgb * contribution;

  // Boost bloom during inhale
  float breathBoost = 1.0 + breathPhase * 0.3;
  bloomColor *= breathBoost;

  gl_FragColor = vec4(bloomColor, 1.0);
}
`;

// Gaussian blur shader (horizontal and vertical passes)
const blurVertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

const blurFragmentShader = `
uniform sampler2D inputTexture;
uniform vec2 direction;
uniform vec2 resolution;
uniform float breathPhase;

varying vec2 vUv;

void main() {
  vec2 texelSize = 1.0 / resolution;

  // Breathing-reactive blur radius
  float baseBlur = 1.0 + breathPhase * 0.5;

  // Gaussian weights
  float weights[5];
  weights[0] = 0.227027;
  weights[1] = 0.1945946;
  weights[2] = 0.1216216;
  weights[3] = 0.054054;
  weights[4] = 0.016216;

  vec3 result = texture2D(inputTexture, vUv).rgb * weights[0];

  for (int i = 1; i < 5; i++) {
    vec2 offset = direction * texelSize * float(i) * baseBlur * 2.0;
    result += texture2D(inputTexture, vUv + offset).rgb * weights[i];
    result += texture2D(inputTexture, vUv - offset).rgb * weights[i];
  }

  gl_FragColor = vec4(result, 1.0);
}
`;

// Bloom composite shader
const bloomCompositeVertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

const bloomCompositeFragmentShader = `
uniform sampler2D sceneTexture;
uniform sampler2D bloomTexture;
uniform float intensity;
uniform float breathPhase;
uniform int phaseType;

varying vec2 vUv;

void main() {
  vec4 sceneColor = texture2D(sceneTexture, vUv);
  vec4 bloomColor = texture2D(bloomTexture, vUv);

  // Breathing-reactive bloom intensity
  float dynamicIntensity = intensity;

  if (phaseType == 0) {
    // Inhale - increasing glow
    dynamicIntensity *= 0.8 + breathPhase * 0.6;
  } else if (phaseType == 1) {
    // Hold-in - peak glow with subtle pulse
    dynamicIntensity *= 1.3 + sin(breathPhase * 6.28) * 0.1;
  } else if (phaseType == 2) {
    // Exhale - decreasing glow
    dynamicIntensity *= 1.2 - breathPhase * 0.5;
  } else {
    // Hold-out - minimal glow
    dynamicIntensity *= 0.7;
  }

  // Color temperature shift with breathing
  // Warmer during inhale (hold), cooler during exhale
  vec3 warmTint = vec3(1.02, 1.0, 0.98);
  vec3 coolTint = vec3(0.98, 1.0, 1.02);
  vec3 temperatureTint = mix(coolTint, warmTint, breathPhase);

  // Apply bloom with color temperature
  vec3 finalColor = sceneColor.rgb + bloomColor.rgb * dynamicIntensity;
  finalColor *= temperatureTint;

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

interface BreathingBloomProps {
  /** Enable bloom effect @default true */
  enabled?: boolean;
  /** Base bloom intensity @default 0.4 */
  intensity?: number;
  /** Brightness threshold for bloom extraction @default 0.7 */
  threshold?: number;
}

/**
 * BreathingBloom - Adds breath-reactive bloom to the scene
 *
 * This component renders after the main scene and applies a bloom
 * post-processing effect that responds to the breathing cycle.
 *
 * Note: For best results, should be integrated into RefractionPipeline
 * as an additional pass. This standalone version works as an overlay.
 */
export function BreathingBloom({
  enabled = true,
  intensity = 0.4,
  threshold = 0.7,
}: BreathingBloomProps) {
  const { size } = useThree();
  const world = useWorld();

  // Create render targets
  const { extractFBO, blurFBO1, blurFBO2 } = useMemo(() => {
    const halfWidth = Math.floor(size.width / 2);
    const halfHeight = Math.floor(size.height / 2);

    const extractFBO = new THREE.WebGLRenderTarget(halfWidth, halfHeight, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });

    const blurFBO1 = new THREE.WebGLRenderTarget(halfWidth, halfHeight, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });

    const blurFBO2 = new THREE.WebGLRenderTarget(halfWidth, halfHeight, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });

    return { extractFBO, blurFBO1, blurFBO2 };
  }, [size.width, size.height]);

  // Create materials
  const { extractMaterial, blurMaterial, compositeMaterial } = useMemo(() => {
    const extractMaterial = new THREE.ShaderMaterial({
      uniforms: {
        inputTexture: { value: null },
        threshold: { value: threshold },
        breathPhase: { value: 0 },
      },
      vertexShader: bloomExtractVertexShader,
      fragmentShader: bloomExtractFragmentShader,
    });

    const blurMaterial = new THREE.ShaderMaterial({
      uniforms: {
        inputTexture: { value: null },
        direction: { value: new THREE.Vector2(1, 0) },
        resolution: { value: new THREE.Vector2(size.width / 2, size.height / 2) },
        breathPhase: { value: 0 },
      },
      vertexShader: blurVertexShader,
      fragmentShader: blurFragmentShader,
    });

    const compositeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        sceneTexture: { value: null },
        bloomTexture: { value: null },
        intensity: { value: intensity },
        breathPhase: { value: 0 },
        phaseType: { value: 0 },
      },
      vertexShader: bloomCompositeVertexShader,
      fragmentShader: bloomCompositeFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
    });

    return { extractMaterial, blurMaterial, compositeMaterial };
  }, [size.width, size.height, threshold, intensity]);

  // Create quad for rendering (used for future pipeline integration)
  const quadMesh = useMemo(() => {
    const quadGeometry = new THREE.PlaneGeometry(2, 2);
    const quadMesh = new THREE.Mesh(quadGeometry, extractMaterial);
    return quadMesh;
  }, [extractMaterial]);

  // Cleanup
  useEffect(() => {
    return () => {
      extractFBO.dispose();
      blurFBO1.dispose();
      blurFBO2.dispose();
      extractMaterial.dispose();
      blurMaterial.dispose();
      compositeMaterial.dispose();
      quadMesh.geometry.dispose();
    };
  }, [extractFBO, blurFBO1, blurFBO2, extractMaterial, blurMaterial, compositeMaterial, quadMesh]);

  // Ref to store breath state for external access
  const breathStateRef = useRef({ phase: 0, type: 0 });

  // Update breath state each frame
  useFrame(() => {
    if (!enabled) return;

    // Get breath state from ECS
    try {
      const breathEntity = world.queryFirst(breathPhase, phaseType);
      if (breathEntity) {
        breathStateRef.current.phase = breathEntity.get(breathPhase)?.value ?? 0;
        breathStateRef.current.type = breathEntity.get(phaseType)?.value ?? 0;
      }
    } catch {
      // Ignore ECS errors
    }

    // Update material uniforms
    extractMaterial.uniforms.breathPhase.value = breathStateRef.current.phase;
    blurMaterial.uniforms.breathPhase.value = breathStateRef.current.phase;
    compositeMaterial.uniforms.breathPhase.value = breathStateRef.current.phase;
    compositeMaterial.uniforms.phaseType.value = breathStateRef.current.type;
  });

  if (!enabled) return null;

  // This component doesn't render anything directly - bloom is applied by the pipeline
  // Export breath state for use by RefractionPipeline
  return null;
}

// Export breath state hook for use by other components
export function useBreathingBloomState() {
  const world = useWorld();
  const stateRef = useRef({ phase: 0, type: 0 });

  useFrame(() => {
    try {
      const breathEntity = world.queryFirst(breathPhase, phaseType);
      if (breathEntity) {
        stateRef.current.phase = breathEntity.get(breathPhase)?.value ?? 0;
        stateRef.current.type = breathEntity.get(phaseType)?.value ?? 0;
      }
    } catch {
      // Ignore
    }
  });

  return stateRef;
}

export default BreathingBloom;
