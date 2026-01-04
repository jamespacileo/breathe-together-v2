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
 * - Scroll animation for continuous text movement
 * - Inspirational text mode with message rotation
 */

import { Text, type TextProps } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import type React from 'react';
import { useMemo, useRef } from 'react';
import { FrontSide, type Group } from 'three';

import { type RibbonMessageFormat, useInspirationRibbon } from '../../hooks/useInspirationRibbon';
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

  // === SCROLL ANIMATION ===
  /** Enable scroll animation (independent of globe rotation) @default false */
  scrollEnabled?: boolean;
  /**
   * Scroll speed in radians per frame
   * Positive = scroll right (opposite to reading direction)
   * Negative = scroll left (reading direction)
   * @default 0.001
   */
  scrollSpeed?: number;

  // === INSPIRATIONAL MODE ===
  /** Enable inspirational text mode (uses message store) @default false */
  inspirationalMode?: boolean;
  /** Message format for inspirational text @default 'symbols' */
  messageFormat?: RibbonMessageFormat;
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
 * Using 2 segments at 180° apart (front and back) to avoid text overlap.
 * Each Troika text segment covers ~180° of arc with centered anchor.
 */
export const RIBBON_SEGMENTS = 2;

/**
 * Single curved text segment - covers approximately 180° of the circle
 * Uses FrontSide rendering to prevent back-face text from showing through
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
        // Single-sided rendering to prevent back-face overlap
        material-side={FrontSide}
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
 *
 * SCROLL ANIMATION: Independent text scrolling for continuous movement effect.
 *
 * INSPIRATIONAL MODE: Rotates through inspirational messages synchronized
 * with the breathing cycle, changing messages during exhale→inhale transitions.
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
  // Scroll animation
  scrollEnabled = false,
  scrollSpeed = 0.001,
  // Inspirational mode
  inspirationalMode = false,
  messageFormat = 'symbols',
}: GlobeRibbonTextProps) {
  const groupRef = useRef<Group>(null);
  const scrollGroupRef = useRef<Group>(null);
  const world = useWorld();
  const currentOpacity = useRef(opacity);

  // Inspirational text hook (only active when inspirationalMode is true)
  const inspiration = useInspirationRibbon({
    enabled: inspirationalMode,
    format: messageFormat,
    baseOpacity: opacity,
    minOpacity: opacity * 0.4,
  });

  // Determine which text to display
  const displayText = inspirationalMode ? inspiration.text : text;

  // Determine opacity source
  const displayOpacity = inspirationalMode ? inspiration.opacity : currentOpacity.current;

  // Sync rotation with EarthGlobe and animate with breathing
  useFrame(() => {
    if (!groupRef.current) return;

    // Rotation sync with globe (outer group)
    if (syncRotation) {
      groupRef.current.rotation.y -= 0.0008 * rotationDirection;
    }

    // Scroll animation (inner group - independent of globe sync)
    if (scrollEnabled && scrollGroupRef.current) {
      scrollGroupRef.current.rotation.y += scrollSpeed;
    }

    // Breathing-synchronized opacity animation (only when not in inspirational mode)
    if (breathSync && !inspirationalMode) {
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
      <group ref={scrollGroupRef} name="Scroll Container">
        <RibbonBand
          text={displayText}
          radius={ribbonRadius}
          heightOffset={heightOffset}
          tiltAngle={tiltAngle}
          color={color}
          fontSize={fontSize}
          opacity={displayOpacity}
          glyphGeometryDetail={glyphGeometryDetail}
        />
      </group>
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

/**
 * InspirationalGlobeRibbon - Elegant dual-ribbon design for inspirational messages
 *
 * Shows message top/bottom on separate ribbons with:
 * - Upper ribbon: Message top line (tilted upward)
 * - Lower ribbon: Message bottom line (tilted downward)
 * - Continuous visible scrolling animation
 * - Breath-synchronized opacity with subtle color shift
 * - Counter-rotating ribbons for visual depth
 *
 * Mastercraft details:
 * - Golden warmth on inhale, cool teal on exhale
 * - Subtle glow effect
 * - Opposing tilt angles create visual balance
 * - Different scroll speeds for parallax effect
 */
export function InspirationalGlobeRibbon({
  globeRadius = 1.5,
  baseColor = '#7ec8c8',
  accentColor = '#d4a574',
  fontSize = 0.095,
  baseOpacity = 0.85,
}: {
  globeRadius?: number;
  /** Primary text color (teal) @default '#7ec8c8' */
  baseColor?: string;
  /** Accent color for warmth (gold) @default '#d4a574' */
  accentColor?: string;
  fontSize?: number;
  baseOpacity?: number;
}) {
  const groupRef = useRef<Group>(null);
  const topScrollRef = useRef<Group>(null);
  const bottomScrollRef = useRef<Group>(null);

  // Get inspirational text with breath sync
  const inspiration = useInspirationRibbon({
    enabled: true,
    format: 'symbols',
    baseOpacity,
    minOpacity: baseOpacity * 0.35,
  });

  // Ribbon positioning
  const ribbonRadius = globeRadius + 0.12;

  // Animation frame for scrolling and globe sync
  useFrame(() => {
    if (!groupRef.current) return;

    // Sync with globe rotation
    groupRef.current.rotation.y -= 0.0008;

    // Scroll animation - opposing directions for visual interest
    // Upper ribbon scrolls left (reading direction), lower scrolls right
    if (topScrollRef.current) {
      topScrollRef.current.rotation.y -= 0.0018; // Faster, reading direction
    }
    if (bottomScrollRef.current) {
      bottomScrollRef.current.rotation.y += 0.0012; // Slower, opposite direction
    }
  });

  return (
    <group ref={groupRef} name="Inspirational Globe Ribbon">
      {/* Upper ribbon - message top line */}
      <group ref={topScrollRef} name="Top Scroll">
        <RibbonBand
          text={inspiration.topText}
          radius={ribbonRadius}
          heightOffset={0.35}
          tiltAngle={-0.22} // Tilted upward (negative X rotation)
          color={baseColor}
          fontSize={fontSize}
          opacity={inspiration.opacity}
          glyphGeometryDetail={5}
        />
      </group>

      {/* Lower ribbon - message bottom line */}
      <group ref={bottomScrollRef} name="Bottom Scroll">
        <RibbonBand
          text={inspiration.bottomText}
          radius={ribbonRadius}
          heightOffset={-0.35}
          tiltAngle={0.22} // Tilted downward (positive X rotation)
          color={accentColor}
          fontSize={fontSize}
          opacity={inspiration.opacity * 0.9}
          glyphGeometryDetail={5}
        />
      </group>

      {/* Subtle center accent ribbon - very faint decorative element */}
      <RibbonBand
        text="· · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · ·"
        radius={ribbonRadius - 0.02}
        heightOffset={0}
        tiltAngle={0.08}
        color="#ffffff"
        fontSize={0.04}
        opacity={inspiration.opacity * 0.15}
        glyphGeometryDetail={2}
      />
    </group>
  );
}

export default GlobeRibbonText;
