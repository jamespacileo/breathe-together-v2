import * as THREE from 'three';
import {
  add,
  attribute,
  clamp,
  dot,
  float,
  fract,
  mix,
  modelViewMatrix,
  mul,
  pow,
  sin,
  sub,
  uniform,
  varying,
  vec3,
  vec4,
} from 'three/tsl';
import { MeshBasicNodeMaterial } from 'three/webgpu';

export interface EdgeMaterialOptions {
  trailFade: number;
  baseOpacity?: number;
  pulseStrength?: number;
  glowBoost?: number;
  depthFadePower?: number;
  noiseAmount?: number;
}

/**
 * Creates a TSL node-based material for particle edges and trails.
 * Replaces the custom GLSL ShaderMaterial.
 */
export function createEdgeMaterialTSL({
  trailFade,
  baseOpacity = 0.7,
  pulseStrength = 1.4,
  glowBoost = 2.6,
  depthFadePower = 1.5,
  noiseAmount = 0.18,
}: EdgeMaterialOptions): MeshBasicNodeMaterial {
  // Uniforms
  const uTime = uniform(float(0));
  const uBaseOpacity = uniform(float(baseOpacity));
  const uPulseStrength = uniform(float(pulseStrength));
  const uGlowBoost = uniform(float(glowBoost));
  const uTrailFade = uniform(float(trailFade));
  const uDepthRange = uniform(float(30));
  const uDepthFadePower = uniform(float(depthFadePower));
  const uNoiseAmount = uniform(float(noiseAmount));

  // Attributes (Instanced)
  const instanceSeed = attribute('instanceSeed', 'float');
  const instancePulse = attribute('instancePulse', 'float');
  const instanceColorNode = attribute('instanceColor', 'vec3');

  // Vertex Stage Logic
  // vViewZ = -mvPosition.z
  const positionLocal = attribute('position', 'vec3');
  // Need to include instanceMatrix in transform?
  // TSL handles instancing automatically in modelViewMatrix if support is enabled?
  // No, usually we need `instanceOffset` or similar if we are doing manual transforms,
  // but `modelViewMatrix` in TSL *should* handle instancing for `InstancedMesh`.
  const mPos = mul(modelViewMatrix, vec4(positionLocal, 1.0));
  const vViewZ = varying(sub(float(0), mPos.z));
  const vLocalPosition = varying(positionLocal);
  const vColor = varying(instanceColorNode); // Pass to fragment
  const vSeed = varying(instanceSeed);
  const vPulse = varying(instancePulse);

  // Fragment Stage Logic
  // float pulseSpeed = mix(0.8, 1.9, vPulse);
  const pulseSpeed = mix(float(0.8), float(1.9), vPulse);

  // float pulse = 0.5 + 0.5 * sin(time * pulseStrength * pulseSpeed + vSeed * 6.283185);
  const pulsePhase = add(mul(mul(uTime, uPulseStrength), pulseSpeed), mul(vSeed, float(6.283185)));
  const pulse = add(float(0.5), mul(sin(pulsePhase), float(0.5)));

  // float depthFactor = clamp(vViewZ / depthRange, 0.0, 1.0);
  const depthFactor = clamp(mul(vViewZ, pow(uDepthRange, float(-1.0))), float(0.0), float(1.0));

  // float depthAtten = pow(1.0 - depthFactor, depthFadePower);
  const depthAtten = pow(sub(float(1.0), depthFactor), uDepthFadePower);

  // Hash Noise - Standard GLSL pseudo-random function
  // Uses well-known magic numbers that produce high-quality noise distribution.
  // Source: Common shader technique, widely used since early WebGL (origin: Ashima Arts)
  // Formula: fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453)
  const noiseVec = vec3(12.9898, 78.233, 37.719);
  // noise input: vLocalPosition * 2.4 + vec3(vSeed, vSeed * 1.3, time * 0.15)
  const noiseInput = add(
    mul(vLocalPosition, float(2.4)),
    vec3(vSeed, mul(vSeed, float(1.3)), mul(uTime, float(0.15))),
  );
  const noiseDot = dot(noiseInput, noiseVec);
  const noise = fract(mul(sin(noiseDot), float(43758.5453)));

  // float jitter = mix(1.0 - noiseAmount * 0.5, 1.0 + noiseAmount, noise);
  const jitterMin = sub(float(1.0), mul(uNoiseAmount, float(0.5)));
  const jitterMax = add(float(1.0), uNoiseAmount);
  const jitter = mix(jitterMin, jitterMax, noise);

  // float flicker = mix(0.9, 1.15, noise);
  const flicker = mix(float(0.9), float(1.15), noise);

  // float intensity = (0.9 + vPulse * 0.4) * (1.0 + pulse * glowBoost) * depthAtten * flicker;
  const intensityBase = add(float(0.9), mul(vPulse, float(0.4)));
  const intensityGlow = add(float(1.0), mul(pulse, uGlowBoost));
  const intensity = mul(mul(mul(intensityBase, intensityGlow), depthAtten), flicker);

  // vec3 color = vColor * intensity;
  const finalColor = mul(vColor, intensity);

  // float alpha = baseOpacity * (0.45 + pulse * 0.65) * trailFade * depthAtten * jitter;
  const alphaPulse = add(float(0.45), mul(pulse, float(0.65)));
  const finalAlpha = mul(mul(mul(mul(uBaseOpacity, alphaPulse), uTrailFade), depthAtten), jitter);

  // Create Material
  const material = new MeshBasicNodeMaterial();
  material.colorNode = finalColor; // TSL handles vec3 -> vec4 auto? yes or we make vec4
  material.opacityNode = finalAlpha;
  material.transparent = true;
  material.depthWrite = false;
  material.depthTest = true;
  material.blending = THREE.AdditiveBlending;
  material.wireframe = true;

  // Store uniforms for animation/updates
  material.userData = {
    uTime,
    uBaseOpacity,
    uPulseStrength,
    uGlowBoost,
    uTrailFade,
    uDepthRange,
    uDepthFadePower,
    uNoiseAmount,
  };

  return material;
}
