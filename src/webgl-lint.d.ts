/**
 * Type declarations for webgl-lint
 *
 * webgl-lint is a JavaScript library that provides runtime validation
 * of WebGL API usage. It has no official TypeScript types.
 */

declare module 'webgl-lint' {
  /**
   * Default export that initializes WebGL linting.
   * When imported, it automatically wraps WebGL contexts to add validation.
   */
  const webglLint: unknown;
  export default webglLint;
}
