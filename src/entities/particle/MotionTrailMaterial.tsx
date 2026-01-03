/**
 * MotionTrailMaterial - Shader for velocity-based motion trails
 *
 * Creates elegant "comet tail" streaks behind moving shards:
 * - Geometry stretches along velocity direction
 * - Opacity gradient from front (solid) to back (transparent)
 * - Subtle color shift toward cooler tones in the trail
 *
 * Inspired by:
 * - Codrops High-Speed Light Trails tutorial
 * - Monument Valley's ethereal visual style
 *
 * Performance: Uses InstancedMesh for single draw call
 */

import * as THREE from 'three';

// Vertex shader - stretches geometry along velocity and passes data to fragment
const trailVertexShader = `
// Per-instance velocity attribute (radial direction * speed)
attribute vec3 instanceVelocity;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vColor;
varying float vTrailFade;  // 0 at front (shard), 1 at back (trail end)

uniform float trailLength;
uniform float breathPhase;

void main() {
  vNormal = normalize(normalMatrix * normal);

  // Use instance color from InstancedMesh
  #ifdef USE_INSTANCING_COLOR
    vColor = instanceColor;
  #else
    vColor = vec3(0.85, 0.75, 0.65);
  #endif

  // Calculate trail stretch based on velocity magnitude
  float velocityMag = length(instanceVelocity);
  vec3 velocityDir = velocityMag > 0.001 ? normalize(instanceVelocity) : vec3(0.0);

  // Transform velocity to local space for consistent stretching
  vec3 localVelocityDir = (inverse(instanceMatrix) * vec4(velocityDir, 0.0)).xyz;
  localVelocityDir = normalize(localVelocityDir);

  // Determine which vertices are "behind" the shard (opposite to velocity)
  // Vertices with negative dot product with velocity get stretched backward
  float behindAmount = -dot(normalize(position), localVelocityDir);
  behindAmount = max(behindAmount, 0.0);

  // Stretch back vertices along velocity direction
  float stretchAmount = behindAmount * velocityMag * trailLength;

  // Apply stretch in world space (after instance transform)
  vec4 worldPos = instanceMatrix * vec4(position, 1.0);
  worldPos.xyz -= velocityDir * stretchAmount;

  // Pass trail fade to fragment (0 = front/shard, 1 = back/trail)
  vTrailFade = behindAmount * min(velocityMag * 2.0, 1.0);

  vec4 mvPosition = viewMatrix * worldPos;
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

// Fragment shader - applies opacity gradient and subtle color shift
const trailFragmentShader = `
uniform float breathPhase;
uniform float time;
uniform float trailOpacity;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vColor;
varying float vTrailFade;

void main() {
  vec3 viewDir = normalize(vViewPosition);

  // Fresnel rim effect - softer for trails
  float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 2.0);

  // Base color with subtle desaturation toward trail end
  vec3 baseColor = vColor;

  // Shift color cooler/more ethereal in the trail
  vec3 trailTint = vec3(0.9, 0.95, 1.0);  // Slight blue-white shift
  vec3 colorWithTint = mix(baseColor, baseColor * trailTint, vTrailFade * 0.4);

  // Add soft rim glow
  vec3 rimColor = vec3(0.98, 0.96, 0.94);
  vec3 finalColor = mix(colorWithTint, rimColor, fresnel * 0.2);

  // Opacity: fade from front to back, with fresnel edge softening
  float baseOpacity = trailOpacity * (1.0 - vTrailFade * 0.7);
  float edgeFade = 1.0 - fresnel * 0.3;

  // Breathing luminosity pulse
  float breathLuminosity = 1.0 + breathPhase * 0.08;
  finalColor *= breathLuminosity;

  gl_FragColor = vec4(finalColor, baseOpacity * edgeFade);
}
`;

export interface MotionTrailMaterialOptions {
  /** Maximum trail length multiplier @default 2.5 */
  trailLength?: number;
  /** Base opacity of the trail @default 0.18 */
  trailOpacity?: number;
}

/**
 * Creates a shader material for motion trails
 *
 * The material expects an `instanceVelocity` attribute to be set on the geometry.
 */
export function createMotionTrailMaterial(
  options: MotionTrailMaterialOptions = {},
): THREE.ShaderMaterial {
  const { trailLength = 2.5, trailOpacity = 0.18 } = options;

  return new THREE.ShaderMaterial({
    uniforms: {
      breathPhase: { value: 0 },
      time: { value: 0 },
      trailLength: { value: trailLength },
      trailOpacity: { value: trailOpacity },
    },
    vertexShader: trailVertexShader,
    fragmentShader: trailFragmentShader,
    defines: { USE_INSTANCING_COLOR: '' },
    transparent: true,
    depthWrite: false, // Trails don't write to depth for proper blending
    blending: THREE.AdditiveBlending, // Soft, glowing overlap
    side: THREE.DoubleSide, // Trails need both sides visible
  });
}
