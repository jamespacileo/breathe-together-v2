/**
 * RibbonSystem - Configurable globe ribbon text renderer
 *
 * A data-driven ribbon system that renders text ribbons around the globe
 * based on configuration. Supports:
 *
 * - Multiple layers at different heights (no overlap)
 * - Randomized colors, speeds, and tilts within ranges
 * - Breath-synchronized opacity
 * - Inspirational text integration
 * - Decorative accent ribbons
 *
 * Architecture follows AAA game dev patterns:
 * - Configuration defines behavior, not code
 * - Resolution happens once (or on config change)
 * - Rendering is stateless based on resolved props
 */

import { Text, type TextProps } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import type React from 'react';
import { useMemo, useRef } from 'react';
import { FrontSide, type Group } from 'three';

import { useInspirationRibbon } from '../../hooks/useInspirationRibbon';
import {
  DEFAULT_CONFIG,
  generateDotPattern,
  type ResolvedRibbon,
  type RibbonSystemConfig,
  resolveAllRibbons,
} from './ribbonConfig';

// =============================================================================
// Types
// =============================================================================

interface CurvedTextProps extends TextProps {
  curveRadius?: number;
}

const CurvedText = Text as React.FC<CurvedTextProps>;

interface RibbonSystemProps {
  /** Configuration override (defaults to DEFAULT_CONFIG) */
  config?: RibbonSystemConfig;
  /** Whether to show content ribbons (top/bottom messages) */
  showContent?: boolean;
  /** Whether to show decorative accent ribbons */
  showAccents?: boolean;
  /** Force re-resolution of random values */
  resolutionKey?: number;
}

// =============================================================================
// Constants
// =============================================================================

const RIBBON_SEGMENTS = 2;
const LETTER_SPACING = 0.08;

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Single curved text segment - covers ~180° of the circle
 */
function RibbonSegment({
  text,
  radius,
  color,
  fontSize,
  opacity,
  glyphDetail,
  rotationY,
  letterSpacing = LETTER_SPACING,
  fontWeight = 600,
}: {
  text: string;
  radius: number;
  color: string;
  fontSize: number;
  opacity: number;
  glyphDetail: number;
  rotationY: number;
  letterSpacing?: number;
  fontWeight?: number;
}) {
  const curveRadius = -radius;

  return (
    <group rotation={[0, rotationY, 0]}>
      <CurvedText
        fontSize={fontSize}
        color={color}
        anchorX="center"
        anchorY="middle"
        curveRadius={curveRadius}
        glyphGeometryDetail={glyphDetail}
        fillOpacity={opacity}
        position={[0, 0, radius]}
        letterSpacing={letterSpacing}
        fontWeight={fontWeight}
        material-side={FrontSide}
      >
        {text}
      </CurvedText>
    </group>
  );
}

/**
 * Full ribbon band - multiple segments for 360° coverage
 */
function RibbonBand({
  text,
  radius,
  heightOffset,
  tiltAngle,
  color,
  fontSize,
  opacity,
  glyphDetail,
  letterSpacing,
  fontWeight,
}: {
  text: string;
  radius: number;
  heightOffset: number;
  tiltAngle: number;
  color: string;
  fontSize: number;
  opacity: number;
  glyphDetail: number;
  letterSpacing?: number;
  fontWeight?: number;
}) {
  const rotationStep = (2 * Math.PI) / RIBBON_SEGMENTS;
  const segmentRotations = useMemo(
    () => Array.from({ length: RIBBON_SEGMENTS }, (_, i) => i * rotationStep),
    [rotationStep],
  );

  return (
    <group position={[0, heightOffset, 0]} rotation={[tiltAngle, 0, 0]}>
      {segmentRotations.map((rotationY) => (
        <RibbonSegment
          key={`segment-${rotationY.toFixed(4)}`}
          text={text}
          radius={radius}
          color={color}
          fontSize={fontSize}
          opacity={opacity}
          glyphDetail={glyphDetail}
          rotationY={rotationY}
          letterSpacing={letterSpacing}
          fontWeight={fontWeight}
        />
      ))}
    </group>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * RibbonSystem - Main ribbon rendering component
 *
 * Renders all enabled layers from configuration with:
 * - Breath-synchronized opacity
 * - Per-layer scroll animation
 * - Inspirational text for content layers
 * - Generated patterns for decorative layers
 */
export function RibbonSystem({
  config = DEFAULT_CONFIG,
  showContent = true,
  showAccents = true,
  resolutionKey = 0,
}: RibbonSystemProps) {
  // Refs for animation
  const groupRef = useRef<Group>(null);
  const scrollRefs = useRef<Map<string, Group>>(new Map());

  // Resolve ribbons from config (memoized, re-resolves on key change)
  const resolvedRibbons = useMemo(() => {
    // Use resolutionKey to force re-resolution when changed (triggers new random values)
    void resolutionKey;
    return resolveAllRibbons(config);
  }, [config, resolutionKey]);

  // Filter ribbons based on visibility props
  const visibleRibbons = useMemo(() => {
    return resolvedRibbons.filter((ribbon) => {
      if (ribbon.layer.purpose === 'decorative') return showAccents;
      return showContent;
    });
  }, [resolvedRibbons, showContent, showAccents]);

  // Get inspirational text with breath sync
  const inspiration = useInspirationRibbon({
    enabled: showContent,
    format: 'symbols',
    baseOpacity: 1.0,
    minOpacity: 0.35,
  });

  // Generate decorative pattern
  const decorativeText = useMemo(() => generateDotPattern(45), []);

  // Get text for a ribbon based on its purpose
  const getTextForRibbon = (ribbon: ResolvedRibbon): string => {
    switch (ribbon.layer.purpose) {
      case 'top':
        return inspiration.topText;
      case 'bottom':
        return inspiration.bottomText;
      case 'combined':
        return inspiration.text;
      case 'decorative':
        return decorativeText;
      default:
        return '';
    }
  };

  // Animation loop
  useFrame(() => {
    if (!groupRef.current) return;

    // Sync with globe rotation
    groupRef.current.rotation.y -= config.globeSyncSpeed;

    // Per-ribbon scroll animation
    for (const ribbon of visibleRibbons) {
      const scrollGroup = scrollRefs.current.get(ribbon.layer.id);
      if (scrollGroup) {
        const speed =
          config.baseScrollSpeed * ribbon.scrollSpeedMultiplier * ribbon.layer.scrollDirection;
        scrollGroup.rotation.y += speed;
      }
    }
  });

  // Create ref getter for each ribbon
  const getScrollRef = (layerId: string) => {
    return (el: Group | null) => {
      if (el) {
        scrollRefs.current.set(layerId, el);
      } else {
        scrollRefs.current.delete(layerId);
      }
    };
  };

  return (
    <group ref={groupRef} name="Ribbon System">
      {visibleRibbons.map((ribbon) => {
        const text = getTextForRibbon(ribbon);
        const opacity =
          ribbon.layer.purpose === 'decorative'
            ? inspiration.opacity * 0.5 // Decorative ribbons more subtle
            : inspiration.opacity;

        return (
          <group
            key={ribbon.layer.id}
            ref={getScrollRef(ribbon.layer.id)}
            name={`Scroll-${ribbon.layer.id}`}
          >
            <RibbonBand
              text={text}
              radius={ribbon.radius}
              heightOffset={ribbon.layer.height}
              tiltAngle={ribbon.layer.baseTilt + ribbon.tiltOffset}
              color={ribbon.color}
              fontSize={ribbon.fontSize}
              opacity={opacity * ribbon.style.opacity.base}
              glyphDetail={ribbon.style.glyphDetail}
              letterSpacing={ribbon.style.letterSpacing}
              fontWeight={ribbon.style.fontWeight}
            />
          </group>
        );
      })}
    </group>
  );
}

export default RibbonSystem;
