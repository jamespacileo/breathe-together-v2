/**
 * AfterimageEffect - Post-processing motion blur via frame feedback
 *
 * Creates a dreamy motion persistence effect by blending each frame
 * with a decayed version of the previous frame. Objects leave ghostly
 * trails as they move.
 *
 * This is the "quick win" approach - zero per-particle overhead,
 * applies to entire scene uniformly.
 *
 * Features:
 * - Single fullscreen pass (very cheap)
 * - Configurable decay rate
 * - Works on any moving objects
 * - Dreamy/ethereal aesthetic
 */

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

export interface AfterimageEffectProps {
  /**
   * Frame decay rate (0-1)
   * Higher = longer persistence
   * 0.92 = 8% fade per frame (~12 frames to fade)
   * @default 0.92
   */
  decay?: number;

  /**
   * Whether effect is enabled
   * @default true
   */
  enabled?: boolean;
}

// Fullscreen quad vertex shader
const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

// Afterimage fragment shader - blend current with decayed previous
const fragmentShader = /* glsl */ `
  uniform sampler2D tOld;
  uniform sampler2D tNew;
  uniform float decay;

  varying vec2 vUv;

  void main() {
    vec4 oldColor = texture2D(tOld, vUv);
    vec4 newColor = texture2D(tNew, vUv);

    // Blend: keep brighter of (decayed old, new)
    // This creates the trailing effect
    vec4 decayed = oldColor * decay;

    // Use max to keep bright pixels from both frames
    gl_FragColor = max(decayed, newColor);
  }
`;

/**
 * AfterimageEffect component
 *
 * Renders a fullscreen quad that blends current frame with previous,
 * creating motion trails for all moving objects.
 */
export function AfterimageEffect({ decay = 0.92, enabled = true }: AfterimageEffectProps) {
  const { gl, scene, camera, size } = useThree();

  // Two render targets for ping-pong buffering
  const renderTargets = useMemo(() => {
    const params = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
    };
    return [
      new THREE.WebGLRenderTarget(size.width, size.height, params),
      new THREE.WebGLRenderTarget(size.width, size.height, params),
    ];
  }, [size.width, size.height]);

  // Cleanup render targets
  useEffect(() => {
    return () => {
      renderTargets[0].dispose();
      renderTargets[1].dispose();
    };
  }, [renderTargets]);

  // Fullscreen quad for compositing
  const { quadScene, quadCamera, material } = useMemo(() => {
    const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quadScene = new THREE.Scene();

    const material = new THREE.ShaderMaterial({
      uniforms: {
        tOld: { value: null },
        tNew: { value: null },
        decay: { value: decay },
      },
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    quadScene.add(quad);

    return { quadScene, quadCamera, material };
  }, [decay]);

  // Update decay uniform when prop changes
  useEffect(() => {
    material.uniforms.decay.value = decay;
  }, [material, decay]);

  // Cleanup material and scene
  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  // Current buffer index for ping-pong
  const bufferIndex = useRef(0);

  // Render loop with afterimage effect
  useFrame(() => {
    if (!enabled) return;

    const readBuffer = renderTargets[bufferIndex.current];
    const writeBuffer = renderTargets[1 - bufferIndex.current];

    // 1. Render scene to write buffer
    gl.setRenderTarget(writeBuffer);
    gl.render(scene, camera);

    // 2. Composite: blend write buffer (new) with read buffer (old)
    material.uniforms.tOld.value = readBuffer.texture;
    material.uniforms.tNew.value = writeBuffer.texture;

    gl.setRenderTarget(null);
    gl.render(quadScene, quadCamera);

    // 3. Copy result back to read buffer for next frame
    gl.setRenderTarget(readBuffer);
    gl.render(quadScene, quadCamera);
    gl.setRenderTarget(null);

    // Swap buffers
    bufferIndex.current = 1 - bufferIndex.current;
  }, 1); // Priority 1 = run after main render

  return null;
}

export default AfterimageEffect;
