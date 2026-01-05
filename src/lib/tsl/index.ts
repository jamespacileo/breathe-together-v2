/**
 * TSL (Three.js Shading Language) Shared Nodes
 *
 * This module provides reusable TSL node factories for common shader patterns
 * used throughout the application. Using shared nodes ensures:
 *
 * 1. Consistency - Same visual effects everywhere
 * 2. Maintainability - Update in one place, applies everywhere
 * 3. Type Safety - TypeScript-aware shader composition
 * 4. Renderer Agnostic - Same code compiles to WebGL2 (GLSL) and WebGPU (WGSL)
 *
 * @see https://github.com/mrdoob/three.js/wiki/Three.js-Shading-Language
 */

export * from './breathing';
export * from './fresnel';
export * from './gradient';
export * from './noise';
export * from './viewDirection';
