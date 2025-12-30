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
            '#f2a680', // Warm terracotta/orange (bottom)
            '#eb998c', // Soft coral/salmon
            '#d9a6b8', // Dusty rose/mauve
            '#c0b8d9', // Soft lavender
            '#b3c7e6', // Soft sky blue (top)
          ]}
          size={1024}
        />
      </meshBasicMaterial>
    </mesh>
  );
}

export default BackgroundGradient;
