/**
 * Transmission Material for Particle Shards
 *
 * Custom shader for glass-like transmission with:
 * - Fresnel edge effect for realistic glass appearance
 * - Subtle mood color tint through the glass
 * - Edge glow with mood color
 * - Per-instance colors via vertex colors
 *
 * Note: This is a simplified glass shader, not true transmission.
 * For true refraction, use the polished or frosted materials.
 */

import * as THREE from 'three';

export interface TransmissionMaterialConfig {
  /**
   * Roughness (0 = mirror-like, 1 = matte)
   * Affects transmission clarity
   * @default 0.1
   */
  roughness?: number;
}

/**
 * Create transmission material for glass-like shards
 * Returns a ShaderMaterial compatible with InstancedMesh
 */
export function createTransmissionMaterial(
  config: TransmissionMaterialConfig = {},
): THREE.Material {
  const { roughness = 0.1 } = config;

  const glassVertexShader = `
    #include <common>
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec3 vColor;

    void main() {
      #ifdef USE_INSTANCING
        vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        vec3 transformedNormal = mat3(normalMatrix) * mat3(instanceMatrix) * normal;
      #else
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vec3 transformedNormal = normalMatrix * normal;
      #endif

      vNormal = normalize(transformedNormal);

      // Use instance color from InstancedMesh (set via setColorAt)
      #ifdef USE_INSTANCING_COLOR
        vColor = instanceColor;
      #else
        vColor = vec3(1.0);
      #endif

      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  const glassFragmentShader = `
    uniform float uRoughness;

    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec3 vColor;

    void main() {
      vec3 viewDir = normalize(vViewPosition);
      vec3 normal = normalize(vNormal);

      // Fresnel effect for glass edges (more realistic curve)
      float fresnelPower = 3.0;
      float fresnel = pow(1.0 - abs(dot(normal, viewDir)), fresnelPower);

      // Glass transparency: very transparent in center, more visible at edges
      // Roughness affects base transparency (rougher = less transparent)
      float baseAlpha = mix(0.12, 0.5, fresnel) * (1.0 - uRoughness * 0.3);

      // Subtle mood color tint through the glass
      vec3 colorTint = mix(vec3(1.0), vColor, 0.25);

      // Edge glow with mood color (creates colored rim lighting)
      vec3 edgeGlow = vColor * fresnel * 0.3;

      // Combine glass base with edge glow
      vec3 finalColor = colorTint + edgeGlow;

      // Final alpha with transparency boost
      float finalAlpha = baseAlpha * 0.85;

      gl_FragColor = vec4(finalColor, finalAlpha);
    }
  `;

  const material = new THREE.ShaderMaterial({
    vertexShader: glassVertexShader,
    fragmentShader: glassFragmentShader,
    uniforms: {
      uRoughness: { value: roughness },
    },
    defines: {
      USE_INSTANCING_COLOR: '',
    },
    transparent: true,
    side: THREE.FrontSide,
    depthWrite: true,
    depthTest: true,
    blending: THREE.NormalBlending,
  });

  return material;
}
