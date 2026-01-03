/**
 * GlobeRibbonText - Curved text ribbon wrapping around the globe
 *
 * Uses drei's Text component with Troika's curveRadius for cylindrical text curvature.
 * The text wraps around the globe like a ribbon/banner, synchronized with globe rotation.
 *
 * KEY FEATURES:
 * - Cylindrical curved text using curveRadius prop
 * - Auto-repeating text to fill full 360° circumference
 * - Auto-rotation synced with EarthGlobe (0.0008 rad/frame)
 * - Breathing-synchronized opacity animation
 * - Multiple ribbon positions (equator, tilted bands)
 */

import { Text, type TextProps } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import type React from 'react';
import { useMemo, useRef } from 'react';
import type { Group } from 'three';

import { breathPhase } from '../breath/traits';

/**
 * Extended TextProps with Troika's curveRadius support
 * @see https://protectwise.github.io/troika/troika-three-text/
 *
 * curveRadius: Defines a cylindrical radius along which the text's plane will be curved.
 * Positive = concave (center in front), Negative = convex (center behind)
 */
interface CurvedTextProps extends TextProps {
  curveRadius?: number;
}

/**
 * Calculate how many times to repeat text to fill circumference
 * @param text - The base text to repeat
 * @param radius - Cylinder radius
 * @param fontSize - Font size in 3D units
 * @param letterSpacing - Letter spacing multiplier
 * @returns Number of repetitions needed to fill 360°
 */
export function calculateTextRepetitions(
  text: string,
  radius: number,
  fontSize: number,
  letterSpacing: number = 0.08,
): number {
  // Circumference of the cylinder
  const circumference = 2 * Math.PI * radius;

  // Approximate character width (fontSize * ~0.5 for average char width + letterSpacing)
  const avgCharWidth = fontSize * (0.5 + letterSpacing);

  // Total width of text
  const textWidth = text.length * avgCharWidth;

  // How many repetitions needed to fill circumference (add 1 for seamless wrap)
  const repetitions = Math.ceil(circumference / textWidth) + 1;

  return Math.max(1, repetitions);
}

/**
 * Generate repeated text to fill full circumference
 */
export function generateFullCircleText(
  baseText: string,
  radius: number,
  fontSize: number,
  letterSpacing: number = 0.08,
): string {
  const repetitions = calculateTextRepetitions(baseText, radius, fontSize, letterSpacing);
  return Array(repetitions).fill(baseText).join(' ');
}

/**
 * GlobeRibbonText component props
 */
interface GlobeRibbonTextProps {
  /** Text to display on the ribbon @default "✦ BREATHE TOGETHER ✦ BREATHE TOGETHER ✦ BREATHE TOGETHER ✦" */
  text?: string;
  /** Globe radius for positioning @default 1.5 */
  globeRadius?: number;
  /** Height offset from equator (positive = above, negative = below) @default 0 */
  heightOffset?: number;
  /** Tilt angle in radians @default 0.15 */
  tiltAngle?: number;
  /** Text color @default "#5eb3b2" */
  color?: string;
  /** Font size @default 0.12 */
  fontSize?: number;
  /** Base opacity @default 0.8 */
  opacity?: number;
  /** Whether to sync rotation with globe @default true */
  syncRotation?: boolean;
  /** Whether to animate opacity with breathing @default true */
  breathSync?: boolean;
  /** Rotation direction (1 = same as globe, -1 = opposite) @default 1 */
  rotationDirection?: 1 | -1;
  /** Glyph geometry detail for smoother curves @default 4 */
  glyphGeometryDetail?: number;
}

/**
 * Single ribbon band with curved text
 */
/**
 * CurvedText - Text component with curveRadius support
 * Uses type assertion since drei's types don't expose Troika's curveRadius prop
 */
const CurvedText = Text as React.FC<CurvedTextProps>;

const LETTER_SPACING = 0.08;

/**
 * Number of segments to render around the circle for full 360° coverage.
 * More segments = smoother coverage but more render cost.
 * 4 segments at 90° each provides good coverage with minimal overlap.
 */
export const RIBBON_SEGMENTS = 4;

/**
 * Single curved text segment - covers approximately 90° of the circle
 */
function RibbonSegment({
  text,
  radius,
  color,
  fontSize,
  opacity,
  glyphGeometryDetail,
  rotationY,
}: {
  text: string;
  radius: number;
  color: string;
  fontSize: number;
  opacity: number;
  glyphGeometryDetail: number;
  rotationY: number;
}) {
  // curveRadius: negative = convex (text curves outward, center behind text)
  const curveRadius = -radius;

  return (
    <group rotation={[0, rotationY, 0]}>
      <CurvedText
        fontSize={fontSize}
        color={color}
        anchorX="center"
        anchorY="middle"
        curveRadius={curveRadius}
        glyphGeometryDetail={glyphGeometryDetail}
        fillOpacity={opacity}
        // Position text at z = radius so it sits on the sphere surface
        position={[0, 0, radius]}
        letterSpacing={LETTER_SPACING}
        fontWeight={600}
      >
        {text}
      </CurvedText>
    </group>
  );
}

/**
 * Full ribbon band - renders multiple segments around the circle for 360° coverage
 */
function RibbonBand({
  text,
  radius,
  heightOffset,
  tiltAngle,
  color,
  fontSize,
  opacity,
  glyphGeometryDetail,
}: {
  text: string;
  radius: number;
  heightOffset: number;
  tiltAngle: number;
  color: string;
  fontSize: number;
  opacity: number;
  glyphGeometryDetail: number;
}) {
  // Calculate rotation step for each segment (360° / RIBBON_SEGMENTS)
  const rotationStep = (2 * Math.PI) / RIBBON_SEGMENTS;

  // Generate segment rotations
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
          glyphGeometryDetail={glyphGeometryDetail}
          rotationY={rotationY}
        />
      ))}
    </group>
  );
}

/**
 * GlobeRibbonText - Renders curved text ribbons around the globe
 *
 * Uses Troika's curveRadius feature (exposed via drei's Text) to create
 * cylindrical text that wraps around the globe like a ribbon.
 *
 * ROTATION SYNC: Matches EarthGlobe's auto-rotation (0.0008 rad/frame) so
 * ribbons stay aligned as the globe rotates.
 *
 * BREATHING SYNC: Opacity pulses with the breathing cycle for visual harmony.
 */
export function GlobeRibbonText({
  text = '✦ BREATHE TOGETHER ✦ BREATHE TOGETHER ✦ BREATHE TOGETHER ✦',
  globeRadius = 1.5,
  heightOffset = 0,
  tiltAngle = 0.15,
  color = '#5eb3b2',
  fontSize = 0.12,
  opacity = 0.8,
  syncRotation = true,
  breathSync = true,
  rotationDirection = 1,
  glyphGeometryDetail = 4,
}: GlobeRibbonTextProps) {
  const groupRef = useRef<Group>(null);
  const world = useWorld();
  const currentOpacity = useRef(opacity);

  // Sync rotation with EarthGlobe and animate with breathing
  useFrame(() => {
    if (!groupRef.current) return;

    // Rotation sync with globe
    if (syncRotation) {
      groupRef.current.rotation.y -= 0.0008 * rotationDirection;
    }

    // Breathing-synchronized opacity animation
    if (breathSync) {
      try {
        const breathEntity = world.queryFirst(breathPhase);
        if (breathEntity) {
          const phase = breathEntity.get(breathPhase)?.value ?? 0;
          // Opacity ranges from opacity*0.7 to opacity*1.0 based on breath phase
          currentOpacity.current = opacity * (0.7 + phase * 0.3);
        }
      } catch {
        // Ignore ECS errors during unmount/remount in Triplex
      }
    }
  });

  // Ribbon positioned slightly outside the globe
  const ribbonRadius = globeRadius + 0.1;

  return (
    <group ref={groupRef} name="Globe Ribbon Text">
      <RibbonBand
        text={text}
        radius={ribbonRadius}
        heightOffset={heightOffset}
        tiltAngle={tiltAngle}
        color={color}
        fontSize={fontSize}
        opacity={currentOpacity.current}
        glyphGeometryDetail={glyphGeometryDetail}
      />
    </group>
  );
}

/**
 * GlobeRibbonTextMultiple - Multiple ribbon bands for richer visual effect
 *
 * Creates 2-3 ribbons at different heights/angles for a more dynamic look.
 */
export function GlobeRibbonTextMultiple({
  globeRadius = 1.5,
  primaryText = '✦ BREATHE TOGETHER ✦ BREATHE TOGETHER ✦ BREATHE TOGETHER ✦',
  secondaryText = '· ONE BREATH · ONE WORLD · ONE MOMENT ·',
  primaryColor = '#5eb3b2',
  secondaryColor = '#d4a574',
  syncRotation = true,
  breathSync = true,
}: {
  globeRadius?: number;
  primaryText?: string;
  secondaryText?: string;
  primaryColor?: string;
  secondaryColor?: string;
  syncRotation?: boolean;
  breathSync?: boolean;
}) {
  const groupRef = useRef<Group>(null);
  const world = useWorld();

  // Sync rotation with EarthGlobe
  useFrame(() => {
    if (!groupRef.current || !syncRotation) return;
    groupRef.current.rotation.y -= 0.0008;
  });

  const ribbonRadius = globeRadius + 0.1;

  // Get current breath phase for opacity animation
  let currentPhase = 0.5;
  if (breathSync) {
    try {
      const breathEntity = world.queryFirst(breathPhase);
      if (breathEntity) {
        currentPhase = breathEntity.get(breathPhase)?.value ?? 0.5;
      }
    } catch {
      // Ignore ECS errors
    }
  }

  const baseOpacity = 0.6 + currentPhase * 0.3;

  return (
    <group ref={groupRef} name="Globe Ribbon Text Multiple">
      {/* Primary ribbon - equator level, slight tilt */}
      <RibbonBand
        text={primaryText}
        radius={ribbonRadius}
        heightOffset={0}
        tiltAngle={0.12}
        color={primaryColor}
        fontSize={0.11}
        opacity={baseOpacity}
        glyphGeometryDetail={4}
      />

      {/* Secondary ribbon - above equator, opposite tilt */}
      <RibbonBand
        text={secondaryText}
        radius={ribbonRadius}
        heightOffset={0.45}
        tiltAngle={-0.18}
        color={secondaryColor}
        fontSize={0.08}
        opacity={baseOpacity * 0.7}
        glyphGeometryDetail={4}
      />

      {/* Tertiary ribbon - below equator */}
      <RibbonBand
        text={secondaryText}
        radius={ribbonRadius}
        heightOffset={-0.45}
        tiltAngle={0.22}
        color={secondaryColor}
        fontSize={0.08}
        opacity={baseOpacity * 0.7}
        glyphGeometryDetail={4}
      />
    </group>
  );
}

export default GlobeRibbonText;
