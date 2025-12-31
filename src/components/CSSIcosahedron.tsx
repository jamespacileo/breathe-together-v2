/**
 * CSSIcosahedron - A pure CSS geometric shape approximating an icosahedron
 *
 * Creates visual continuity between the mood selector and the 3D particle system.
 * Uses CSS transforms and clip-paths to create a faceted gem-like appearance.
 *
 * The shape is technically a hexagonal prism with angled faces, which reads
 * as "crystalline/geometric" while being performant pure CSS.
 */

import { memo, useMemo, useRef } from 'react';

interface CSSIcosahedronProps {
  /** Color of the icosahedron */
  color: string;
  /** Size in pixels */
  size?: number;
  /** Whether the shape is currently selected/active */
  isActive?: boolean;
  /** Enable gentle rotation animation */
  animated?: boolean;
  /** Glow intensity (0-1) */
  glowIntensity?: number;
  /** Additional className */
  className?: string;
}

/**
 * Adjusts the brightness of a hex color using THREE.Color for accuracy
 */
function adjustBrightness(hex: string, percent: number): string {
  // Remove # if present
  const cleanHex = hex.replace('#', '');

  // Parse RGB values
  const r = Number.parseInt(cleanHex.substring(0, 2), 16);
  const g = Number.parseInt(cleanHex.substring(2, 4), 16);
  const b = Number.parseInt(cleanHex.substring(4, 6), 16);

  // Adjust brightness
  const adjust = (value: number) => {
    const adjusted = value + (255 * percent) / 100;
    return Math.max(0, Math.min(255, Math.round(adjusted)));
  };

  const newR = adjust(r);
  const newG = adjust(g);
  const newB = adjust(b);

  // Convert back to hex
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

function CSSIcosahedronComponent({
  color,
  size = 24,
  isActive = false,
  animated = false,
  glowIntensity = 0.4,
  className = '',
}: CSSIcosahedronProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Memoize brightness-adjusted colors to avoid recalculating on every render
  const { baseColor, lightColor, darkColor } = useMemo(
    () => ({
      baseColor: color,
      lightColor: adjustBrightness(color, 30),
      darkColor: adjustBrightness(color, -20),
    }),
    [color],
  );

  const glowStyle = isActive
    ? {
        filter: `drop-shadow(0 0 ${size * 0.4}px ${color}80) drop-shadow(0 0 ${size * 0.2}px ${color}60)`,
      }
    : {
        filter: `drop-shadow(0 0 ${size * 0.2 * glowIntensity}px ${color}40)`,
      };

  // CSS animation style for rotation (replaces RAF loop)
  const animationStyle: React.CSSProperties = animated
    ? {
        animation: 'cssIcosahedronRotate 20s linear infinite',
      }
    : {};

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: size,
        height: size,
        position: 'relative',
        transition: isActive ? 'filter 0.3s ease' : undefined,
        ...glowStyle,
        ...animationStyle,
      }}
    >
      {/* Main hexagonal shape with gradient for depth */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(135deg, ${lightColor} 0%, ${baseColor} 50%, ${darkColor} 100%)`,
          clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
          transform: 'scale(0.95)',
        }}
      />

      {/* Inner facet highlight */}
      <div
        style={{
          position: 'absolute',
          inset: '15%',
          background: `linear-gradient(180deg, ${lightColor}90 0%, transparent 60%)`,
          clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
          opacity: 0.6,
        }}
      />

      {/* Edge highlight for 3D effect */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'transparent',
          clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
          boxShadow: `inset 1px 1px 2px ${lightColor}40, inset -1px -1px 2px ${darkColor}40`,
          transform: 'scale(0.95)',
        }}
      />
    </div>
  );
}

// Wrap with React.memo to prevent unnecessary re-renders
export const CSSIcosahedron = memo(CSSIcosahedronComponent);

/**
 * MiniIcosahedronPreview - Animated preview showing breathing-synced icosahedron
 * Uses CSS animation instead of RAF for better performance
 */
interface MiniIcosahedronPreviewProps {
  color: string;
  label?: string;
}

function MiniIcosahedronPreviewComponent({
  color,
  label = 'Your presence',
}: MiniIcosahedronPreviewProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px 20px',
        background: 'rgba(255, 255, 255, 0.25)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.3)',
      }}
    >
      {/* CSS animation for breathing pulse - replaces RAF loop */}
      <div
        style={{
          animation: 'cssIcosahedronBreathPulse 16s ease-in-out infinite',
        }}
      >
        <CSSIcosahedron color={color} size={28} animated glowIntensity={0.6} />
      </div>
      <div>
        <div
          style={{
            fontSize: '0.65rem',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'rgba(90, 77, 66, 0.7)',
            marginBottom: '2px',
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: '0.75rem',
            color: 'rgba(90, 77, 66, 0.9)',
            fontWeight: 500,
          }}
        >
          Breathing with others
        </div>
      </div>
    </div>
  );
}

// Wrap with React.memo to prevent unnecessary re-renders
export const MiniIcosahedronPreview = memo(MiniIcosahedronPreviewComponent);
