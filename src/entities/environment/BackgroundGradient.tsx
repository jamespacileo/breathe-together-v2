/**
 * BackgroundGradient - Creamy neutral gradient background
 *
 * Uses drei GradientTexture for a clean, smooth vertical gradient.
 * Warm cream at bottom transitioning to soft ivory at top.
 */

import { GradientTexture } from '@react-three/drei';

export function BackgroundGradient() {
  return (
    <mesh renderOrder={-1000} frustumCulled={false} matrixAutoUpdate={false}>
      <planeGeometry args={[2, 2]} />
      <meshBasicMaterial depthTest={false} depthWrite={false} side={2}>
        <GradientTexture
          stops={[0, 1]}
          colors={[
            '#f5ede0', // Warm cream (bottom)
            '#faf8f2', // Soft ivory (top)
          ]}
          size={1024}
        />
      </meshBasicMaterial>
    </mesh>
  );
}

export default BackgroundGradient;
