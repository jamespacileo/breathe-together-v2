/**
 * RibbonSystem v3 - Horizontal Ribbons with Multi-Radius Depth
 *
 * Renders single-line messages on horizontal bands parallel to the equator.
 * Multiple radius layers create 3D depth (inner/outer shells).
 *
 * KEY FEATURES:
 * - Horizontal ribbons (no tilt) for clean visuals
 * - Single-line messages with elegant separator
 * - Multi-radius layers for parallax depth
 * - UTC timeline event support
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
  formatMessage,
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
  /** Show inspiration zones */
  showInspiration?: boolean;
  /** Show welcome zones */
  showWelcome?: boolean;
  /** Show decorative zones */
  showDecorative?: boolean;
  /** Force re-resolution */
  resolutionKey?: number;
  /** Custom messages */
  customMessages?: Message[];
}

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Single curved text ribbon - horizontal band around the globe
 */
function RibbonText({
  text,
  radius,
  color,
  fontSize,
  opacity,
  glyphDetail,
  letterSpacing,
  fontWeight,
  rotationY = 0,
}: {
  text: string;
  radius: number;
  color: string;
  fontSize: number;
  opacity: number;
  glyphDetail: number;
  letterSpacing: number;
  fontWeight: number;
  rotationY?: number;
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
 * Message instance - single message at specific height/radius with 360° coverage
 */
function MessageRibbon({
  text,
  instance,
  opacity,
}: {
  text: string;
  instance: ResolvedInstance;
  opacity: number;
}) {
  const { style, color, fontSize, height, radius, angularPosition } = instance;
  const finalOpacity = opacity * style.opacity.base;

  // Two segments for 360° coverage (front and back)
  const segments = [0, Math.PI];

  return (
    <group position={[0, height, 0]} rotation={[0, angularPosition, 0]}>
      {segments.map((segmentRotation) => (
        <RibbonText
          key={segmentRotation}
          text={text}
          radius={radius}
          color={color}
          fontSize={fontSize}
          opacity={finalOpacity}
          glyphDetail={style.glyphDetail}
          letterSpacing={style.letterSpacing}
          fontWeight={style.fontWeight}
          rotationY={segmentRotation}
        />
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
  const groupRef = useRef<Group>(null);
  const scrollRefs = useRef<Map<string, Group>>(new Map());

  // Resolve instances
  const instances = useMemo(() => {
    void resolutionKey;
    return resolveAllInstances(config);
  }, [config, resolutionKey]);

  // Filter by visibility
  const visibleInstances = useMemo(() => {
    return instances.filter((inst) => {
      switch (inst.zone.source) {
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
  }, [instances, showInspiration, showWelcome, showDecorative, customMessages.length]);

  const maxInstances = config.maxInstances ?? Number.POSITIVE_INFINITY;
  const renderedInstances = useMemo(() => {
    if (!Number.isFinite(maxInstances) || maxInstances <= 0) return [];
    if (visibleInstances.length <= maxInstances) return visibleInstances;
    return visibleInstances.slice(0, maxInstances);
  }, [visibleInstances, maxInstances]);

  // Get inspiration with breath sync
  const inspiration = useInspirationRibbon({
    enabled: showInspiration,
    format: 'symbols',
    baseOpacity: 1.0,
    minOpacity: 0.35,
  });

  // Decorative pattern
  const decorativeText = useMemo(() => generateDotPattern(50), []);

  // Get formatted text for instance
  const getTextForInstance = (inst: ResolvedInstance): string => {
    const separator = config.messageSeparator;

    switch (inst.zone.source) {
      case 'inspiration': {
        const msg: Message = {
          line1: inspiration.topText || 'Breathe',
          line2: inspiration.bottomText || 'Together',
        };
        return formatMessage(msg, separator);
      }
      case 'welcome': {
        const idx = inst.instanceIndex % WELCOME_MESSAGES.length;
        return formatMessage(WELCOME_MESSAGES[idx], separator);
      }
      case 'decorative':
        return decorativeText;
      case 'custom': {
        if (customMessages.length === 0) return '';
        const idx = inst.instanceIndex % customMessages.length;
        return formatMessage(customMessages[idx], separator);
      }
      default:
        return '';
    }
  };

  // Animation
  useFrame(() => {
    if (!groupRef.current) return;

    // Globe sync
    groupRef.current.rotation.y -= config.globeSyncSpeed;

    // Per-zone scroll
    for (const inst of renderedInstances) {
      const scrollGroup = scrollRefs.current.get(inst.zone.id);
      if (scrollGroup) {
        const speed =
          config.baseScrollSpeed * inst.scrollSpeedMultiplier * inst.zone.scrollDirection;
        scrollGroup.rotation.y += speed;
      }
    }
  });

  // Group by zone
  const byZone = useMemo(() => {
    const map = new Map<string, ResolvedInstance[]>();
    for (const inst of renderedInstances) {
      const arr = map.get(inst.zone.id) || [];
      arr.push(inst);
      map.set(inst.zone.id, arr);
    }
    return map;
  }, [renderedInstances]);

  const getScrollRef = (zoneId: string) => (el: Group | null) => {
    if (el) scrollRefs.current.set(zoneId, el);
    else scrollRefs.current.delete(zoneId);
  };

  return (
    <group ref={groupRef} name="RibbonSystem">
      {Array.from(byZone.entries()).map(([zoneId, zoneInstances]) => (
        <group key={zoneId} ref={getScrollRef(zoneId)} name={`Zone-${zoneId}`}>
          {zoneInstances.map((inst) => {
            const text = getTextForInstance(inst);
            const isDecorative = inst.zone.source === 'decorative';
            const opacity = isDecorative ? inspiration.opacity * 0.4 : inspiration.opacity;

            return (
              <MessageRibbon
                key={`${zoneId}-${inst.instanceIndex}`}
                text={text}
                instance={inst}
                opacity={opacity}
              />
            );
          })}
        </group>
      ))}
    </group>
  );
}

export default RibbonSystem;
