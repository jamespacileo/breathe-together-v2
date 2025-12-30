/**
 * BackgroundGradient - Monument Valley inspired gradient background
 *
 * Uses drei GradientTexture for a clean, smooth vertical gradient.
 * Multi-stop sunset gradient: warm peach → coral → dusty rose → lavender → soft sky blue
 */

import { GradientTexture } from '@react-three/drei';

export function BackgroundGradient() {
  return (
    <mesh renderOrder={-1000} frustumCulled={false} matrixAutoUpdate={false}>
      <planeGeometry args={[2, 2]} />
      <meshBasicMaterial depthTest={false} depthWrite={false} side={2}>
        <GradientTexture
          stops={[0, 0.25, 0.45, 0.65, 1]}
          colors={[
            '#fad1b3', // Warm peach (bottom)
            '#f5c0b8', // Soft coral
            '#ebc7d1', // Dusty rose/pink
            '#d9d1eb', // Soft lavender
            '#d1e0f5', // Soft sky blue (top)
          ]}
          size={1024}
        />
      </meshBasicMaterial>
    </mesh>
  );
}

export default BackgroundGradient;
