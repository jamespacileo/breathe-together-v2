/**
 * RibbonSystem v2 - Message Pool Architecture
 *
 * Renders complete messages (both lines together) distributed around the globe.
 *
 * KEY FEATURES:
 * - Message instances: Each shows a complete two-line message
 * - Zone-based layout: Vertical bands prevent overlap
 * - Random angular distribution: Organic, natural placement
 * - Multi-source support: Inspiration, welcome (multi-language), decorative
 * - Breath-synchronized opacity
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
  type Message,
  type ResolvedInstance,
  type RibbonSystemConfig,
  resolveAllInstances,
  WELCOME_MESSAGES,
} from './ribbonConfig';

// =============================================================================
// Types
// =============================================================================

interface CurvedTextProps extends TextProps {
  curveRadius?: number;
}

const CurvedText = Text as React.FC<CurvedTextProps>;

interface RibbonSystemProps {
  /** Configuration override */
  config?: RibbonSystemConfig;
  /** Show inspiration message zones */
  showInspiration?: boolean;
  /** Show multi-language welcome zones */
  showWelcome?: boolean;
  /** Show decorative accents */
  showDecorative?: boolean;
  /** Force re-resolution of random values */
  resolutionKey?: number;
  /** Custom messages for 'custom' source zones */
  customMessages?: Message[];
}

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Single curved text element
 */
function CurvedTextLine({
  text,
  radius,
  color,
  fontSize,
  opacity,
  glyphDetail,
  rotationY,
  letterSpacing,
  fontWeight,
}: {
  text: string;
  radius: number;
  color: string;
  fontSize: number;
  opacity: number;
  glyphDetail: number;
  rotationY: number;
  letterSpacing: number;
  fontWeight: number;
}) {
  return (
    <group rotation={[0, rotationY, 0]}>
      <CurvedText
        fontSize={fontSize}
        color={color}
        anchorX="center"
        anchorY="middle"
        curveRadius={-radius}
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
 * Complete message instance - renders both lines together
 */
function MessageInstance({
  line1,
  line2,
  instance,
  opacity,
}: {
  line1: string;
  line2: string;
  instance: ResolvedInstance;
  opacity: number;
}) {
  const { zone, style, color, fontSize, tilt, height, radius, angularPosition } = instance;
  const lineSpacing = zone.lineSpacing;
  const finalOpacity = opacity * style.opacity.base;

  // Two segments for 360° coverage
  const segmentOffsets = [0, Math.PI];

  return (
    <group position={[0, height, 0]} rotation={[tilt, angularPosition, 0]}>
      {segmentOffsets.map((segmentOffset) => (
        <group key={`seg-${segmentOffset}`} rotation={[0, segmentOffset, 0]}>
          {/* Line 1 (top) */}
          <group position={[0, lineSpacing / 2, 0]}>
            <CurvedTextLine
              text={line1}
              radius={radius}
              color={color}
              fontSize={fontSize}
              opacity={finalOpacity}
              glyphDetail={style.glyphDetail}
              rotationY={0}
              letterSpacing={style.letterSpacing}
              fontWeight={style.fontWeight}
            />
          </group>
          {/* Line 2 (bottom) */}
          <group position={[0, -lineSpacing / 2, 0]}>
            <CurvedTextLine
              text={line2}
              radius={radius}
              color={color}
              fontSize={fontSize * 0.85} // Slightly smaller for hierarchy
              opacity={finalOpacity * 0.9}
              glyphDetail={style.glyphDetail}
              rotationY={0}
              letterSpacing={style.letterSpacing}
              fontWeight={style.fontWeight}
            />
          </group>
        </group>
      ))}
    </group>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function RibbonSystem({
  config = DEFAULT_CONFIG,
  showInspiration = true,
  showWelcome = false,
  showDecorative = true,
  resolutionKey = 0,
  customMessages = [],
}: RibbonSystemProps) {
  // Refs for animation
  const groupRef = useRef<Group>(null);
  const scrollRefs = useRef<Map<string, Group>>(new Map());

  // Resolve instances from config
  const resolvedInstances = useMemo(() => {
    // Use resolutionKey to force re-resolution
    void resolutionKey;
    return resolveAllInstances(config);
  }, [config, resolutionKey]);

  // Filter instances by visibility
  const visibleInstances = useMemo(() => {
    return resolvedInstances.filter((instance) => {
      switch (instance.zone.source) {
        case 'inspiration':
          return showInspiration;
        case 'welcome':
          return showWelcome;
        case 'decorative':
          return showDecorative;
        case 'custom':
          return customMessages.length > 0;
        default:
          return true;
      }
    });
  }, [resolvedInstances, showInspiration, showWelcome, showDecorative, customMessages.length]);

  // Get inspiration text with breath sync
  const inspiration = useInspirationRibbon({
    enabled: showInspiration,
    format: 'symbols',
    baseOpacity: 1.0,
    minOpacity: 0.35,
  });

  // Generate decorative pattern
  const decorativeText = useMemo(() => generateDotPattern(45), []);

  // Get message for an instance based on its source
  const getMessageForInstance = (instance: ResolvedInstance): Message => {
    switch (instance.zone.source) {
      case 'inspiration':
        return {
          line1: inspiration.topText || 'Breathe',
          line2: inspiration.bottomText || 'Together',
        };
      case 'welcome': {
        // Cycle through welcome messages based on instance index
        const welcomeIndex = instance.instanceIndex % WELCOME_MESSAGES.length;
        return WELCOME_MESSAGES[welcomeIndex];
      }
      case 'decorative':
        return {
          line1: decorativeText,
          line2: '',
        };
      case 'custom': {
        const customIndex = instance.instanceIndex % customMessages.length;
        return customMessages[customIndex] || { line1: '', line2: '' };
      }
      default:
        return { line1: '', line2: '' };
    }
  };

  // Animation loop
  useFrame(() => {
    if (!groupRef.current) return;

    // Sync with globe rotation
    groupRef.current.rotation.y -= config.globeSyncSpeed;

    // Per-zone scroll animation
    for (const instance of visibleInstances) {
      const scrollGroup = scrollRefs.current.get(instance.zone.id);
      if (scrollGroup) {
        const speed =
          config.baseScrollSpeed * instance.scrollSpeedMultiplier * instance.zone.scrollDirection;
        scrollGroup.rotation.y += speed;
      }
    }
  });

  // Group instances by zone for scroll animation
  const instancesByZone = useMemo(() => {
    const map = new Map<string, ResolvedInstance[]>();
    for (const instance of visibleInstances) {
      const existing = map.get(instance.zone.id) || [];
      existing.push(instance);
      map.set(instance.zone.id, existing);
    }
    return map;
  }, [visibleInstances]);

  // Create ref setter for zones
  const getScrollRef = (zoneId: string) => (el: Group | null) => {
    if (el) {
      scrollRefs.current.set(zoneId, el);
    } else {
      scrollRefs.current.delete(zoneId);
    }
  };

  return (
    <group ref={groupRef} name="RibbonSystem">
      {Array.from(instancesByZone.entries()).map(([zoneId, instances]) => {
        const firstInstance = instances[0];
        if (!firstInstance) return null;

        return (
          <group key={zoneId} ref={getScrollRef(zoneId)} name={`Zone-${zoneId}`}>
            {instances.map((instance) => {
              const message = getMessageForInstance(instance);
              const isDecorative = instance.zone.source === 'decorative';
              const opacity = isDecorative ? inspiration.opacity * 0.5 : inspiration.opacity;

              return (
                <MessageInstance
                  key={`${zoneId}-${instance.instanceIndex}`}
                  line1={message.line1}
                  line2={message.line2}
                  instance={instance}
                  opacity={opacity}
                />
              );
            })}
          </group>
        );
      })}
    </group>
  );
}

export default RibbonSystem;
