import * as THREE from 'three';

/**
 * Creates a shader material that renders world-space normals to a render target.
 * Used for capturing back-face geometry data for refraction calculations.
 *
 * The output texture stores normals as RGB values (x, y, z → r, g, b).
 * Normals are encoded from [-1, 1] range to [0, 1] color range.
 */
export function createBackfaceMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vWorldNormal;

      void main() {
        // Transform normal to world space
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldNormal = normalize(mat3(modelMatrix) * normal);

        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,

    fragmentShader: `
      varying vec3 vWorldNormal;

      void main() {
        // Encode world normal as color (range [0, 1])
        // Normals are in range [-1, 1], so scale to [0, 1]
        vec3 normalColor = vWorldNormal * 0.5 + 0.5;

        gl_FragColor = vec4(normalColor, 1.0);
      }
    `,

    side: THREE.BackSide, // CRITICAL: Only render back faces
    depthWrite: true,
    depthTest: true,
  });
}
