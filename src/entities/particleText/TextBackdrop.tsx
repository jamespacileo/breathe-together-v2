/**
 * TextBackdrop - Soft glowing backdrop for particle text
 *
 * Creates a dreamy, ethereal backdrop behind the text using:
 * - Soft radial gradient planes with vibrant colors
 * - Sparkles for additional visual interest
 * - Synchronized opacity with text breathing animation
 *
 * The backdrop appears slightly before the text and fades slightly after,
 * creating a "cloud emerging" effect that aids contrast.
 */

import { Sparkles } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { memo, useMemo, useRef } from 'react';
import * as THREE from 'three';

// Backdrop configuration
const BACKDROP_Z_OFFSET = -0.3; // Slightly behind text
const BACKDROP_SCALE = { width: 5, height: 1.2 }; // Wide and short for text
const SPARKLE_COUNT = 30;
const SPARKLE_SCALE = 4;

// Soft vibrant color palette (warm, dreamy tones)
const BACKDROP_COLORS = {
  top: {
    inner: '#e8d5c4', // Warm cream
    outer: '#d4a574', // Soft gold
  },
  bottom: {
    inner: '#c9d4dc', // Soft blue-gray
    outer: '#a8b5c4', // Dusty blue
  },
};

interface TextBackdropProps {
  /** Y position of the backdrop */
  y: number;
  /** Current opacity (0-1) */
  opacity: number;
  /** Which text line this is for ('top' | 'bottom') */
  position: 'top' | 'bottom';
  /** Z position of the text */
  textZ: number;
}

/**
 * Create a radial gradient texture
 */
function createGradientTexture(innerColor: string, outerColor: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, innerColor);
    gradient.addColorStop(0.5, `${innerColor}cc`); // Semi-transparent middle
    gradient.addColorStop(1, `${outerColor}00`); // Fully transparent edge
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function TextBackdropComponent({ y, opacity, position, textZ }: TextBackdropProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  // Create gradient texture based on position
  const texture = useMemo(() => {
    const colors = position === 'top' ? BACKDROP_COLORS.top : BACKDROP_COLORS.bottom;
    return createGradientTexture(colors.inner, colors.outer);
  }, [position]);

  // Sparkle color based on position
  const sparkleColor = position === 'top' ? '#f5e6d3' : '#d4e5f7';

  // Update opacity each frame
  useFrame(() => {
    if (materialRef.current) {
      // Backdrop fades in earlier and out later than text for "emerging" effect
      const adjustedOpacity = Math.min(1, opacity * 1.3) * 0.4; // Max 40% opacity
      materialRef.current.opacity = adjustedOpacity;
    }
  });

  return (
    <group position={[0, y, textZ + BACKDROP_Z_OFFSET]}>
      {/* Soft gradient backdrop plane */}
      <mesh ref={meshRef}>
        <planeGeometry args={[BACKDROP_SCALE.width, BACKDROP_SCALE.height]} />
        <meshBasicMaterial
          ref={materialRef}
          map={texture}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Sparkles for dreamy effect */}
      <Sparkles
        count={SPARKLE_COUNT}
        scale={[SPARKLE_SCALE, SPARKLE_SCALE * 0.3, 0.5]}
        size={2}
        speed={0.3}
        opacity={opacity * 0.5}
        color={sparkleColor}
      />
    </group>
  );
}

export const TextBackdrop = memo(TextBackdropComponent);
export default TextBackdrop;
