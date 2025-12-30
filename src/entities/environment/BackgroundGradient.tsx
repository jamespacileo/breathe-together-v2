/**
 * BackgroundGradient - Monument Valley inspired gradient background
 *
 * Uses drei GradientTexture for a clean, smooth vertical gradient.
 * Cream (top) to soft terracotta/peach (bottom).
 */

import { GradientTexture } from '@react-three/drei';

export function BackgroundGradient() {
  return (
    <mesh renderOrder={-1000} frustumCulled={false} matrixAutoUpdate={false}>
      <planeGeometry args={[2, 2]} />
      <meshBasicMaterial depthTest={false} depthWrite={false} side={2}>
        <GradientTexture stops={[0, 1]} colors={['#f2d9cc', '#faf5ed']} size={1024} />
      </meshBasicMaterial>
    </mesh>
  );
}

export default BackgroundGradient;
