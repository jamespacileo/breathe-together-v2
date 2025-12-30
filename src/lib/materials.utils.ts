import * as THREE from 'three';
import type { NodeMaterial } from 'three/webgpu';

/**
 * Common transparent material properties for consistency across entities
 */
const TRANSPARENT_DEFAULTS = {
  transparent: true,
  opacity: 0.8,
  depthWrite: false,
  side: THREE.DoubleSide,
} as const;

/**
 * Apply transparent material defaults to any Three.js material
 * Ensures consistent transparent rendering across components
 *
 * @param material Material to configure
 * @returns The configured material
 *
 * @example
 * ```typescript
 * const material = new THREE.MeshPhysicalMaterial({ color: 0xffffff });
 * applyTransparentDefaults(material);
 * ```
 */
export function applyTransparentDefaults<T extends THREE.Material>(material: T): T {
  material.transparent = TRANSPARENT_DEFAULTS.transparent;
  material.opacity = TRANSPARENT_DEFAULTS.opacity;
  material.depthWrite = TRANSPARENT_DEFAULTS.depthWrite;
  material.side = TRANSPARENT_DEFAULTS.side;
  return material;
}

/**
 * Factory for creating shader materials with transparent defaults
 * Combines common shader patterns with consistent transparency
 *
 * @param shaderCode Shader configuration (vertexShader, fragmentShader)
 * @param uniforms Optional uniform definitions
 * @returns Configured ShaderMaterial
 *
 * @example
 * ```typescript
 * const material = createTransparentShaderMaterial({
 *   vertexShader: 'void main() { ... }',
 *   fragmentShader: 'void main() { ... }'
 * });
 * ```
 */
export function createTransparentShaderMaterial(
  shaderCode: {
    vertexShader: string;
    fragmentShader: string;
  },
  uniforms?: Record<string, THREE.IUniform>,
): THREE.ShaderMaterial {
  const material = new THREE.ShaderMaterial({
    vertexShader: shaderCode.vertexShader,
    fragmentShader: shaderCode.fragmentShader,
    uniforms,
    ...TRANSPARENT_DEFAULTS,
  });

  return material;
}

/**
 * Apply transparent properties to NodeMaterial (TSL-based)
 * Ensures WebGPU-compatible materials have proper transparency
 *
 * @param material NodeMaterial to configure
 * @returns The configured material
 *
 * @example
 * ```typescript
 * const material = new NodeMaterial();
 * applyTransparentNodeProperties(material);
 * ```
 */
export function applyTransparentNodeProperties(material: NodeMaterial): NodeMaterial {
  material.transparent = TRANSPARENT_DEFAULTS.transparent;
  material.opacity = TRANSPARENT_DEFAULTS.opacity;
  material.depthWrite = TRANSPARENT_DEFAULTS.depthWrite;
  material.side = TRANSPARENT_DEFAULTS.side;
  return material;
}
