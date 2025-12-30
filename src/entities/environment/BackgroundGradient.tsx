import { useEffect, useMemo } from 'react';
import { color, dot, fract, mix, sin, uv, vec2 } from 'three/tsl';
import { MeshBasicNodeMaterial } from 'three/webgpu';

/**
 * BackgroundGradient - Monument Valley inspired gradient background
 *
 * Refactored to Three Shader Language (TSL).
 */
export function BackgroundGradient() {
  const material = useMemo(() => {
    const top = color(0xfaf5ed);
    const bottom = color(0xf2d9cc);
    const t = uv().y.smoothstep(0, 1);
    const baseColor = mix(bottom, top, t);
    const noise = fract(sin(dot(uv(), vec2(12.9898, 78.233))).mul(43758.5453))
      .sub(0.5)
      .mul(0.03);

    const nodeMaterial = new MeshBasicNodeMaterial();
    nodeMaterial.colorNode = baseColor.add(noise);
    nodeMaterial.depthTest = false;
    nodeMaterial.depthWrite = false;
    nodeMaterial.side = 2; // DoubleSide
    return nodeMaterial;
  }, []);

  // GPU memory cleanup: dispose material on unmount
  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  return (
    <mesh material={material} frustumCulled={false} matrixAutoUpdate={false} renderOrder={-1000}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}

export default BackgroundGradient;
