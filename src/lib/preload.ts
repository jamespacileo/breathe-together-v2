import { useTexture } from '@react-three/drei';

/**
 * Preload all assets used by the application.
 *
 * This file should be imported early in the app initialization (before Canvas mounts)
 * to trigger asset loading in the background. This eliminates Suspense delays
 * when components that use these assets are first rendered.
 *
 * drei's preload functions add assets to an internal cache that useTexture,
 * useGLTF, etc. check before initiating new loads.
 */

// Textures
useTexture.preload('/textures/earth-texture.png');

// Add more assets as needed:
// useGLTF.preload('/models/some-model.glb');
// useCubeTexture.preload(['px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png']);

/**
 * Export a dummy value so the import has a side effect.
 * This ensures the preload calls execute when this module is imported.
 */
export const ASSETS_PRELOADED = true;
