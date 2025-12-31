import { Text } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { memo, useEffect, useRef, useState } from 'react';
import type * as THREE from 'three';
import { useShallow } from 'zustand/shallow';
import { AMBIENT_MESSAGES, WELCOME_INTRO } from '../config/inspirationalSequences';
import { BREATH_TOTAL_CYCLE } from '../constants';
import { calculatePhaseInfo } from '../lib/breathPhase';
import { easeExhale, easeInhaleText } from '../lib/easing';
import { useInspirationalTextStore } from '../stores/inspirationalTextStore';

/**
 * Holographic 3D Text - In-scene inspirational messages
 *
 * Displays text as 3D holographic elements within the Three.js scene,
 * positioned safely above and below the main breathing visualization
 * to avoid overlap with the globe and particles.
 *
 * **Safe positioning strategy:**
 * - Top text: Y = +4.5 units (at particle orbit edge)
 * - Bottom text: Y = -4.5 units (at particle orbit edge)
 * - Z = +5 (forward toward camera to render in front of everything)
 *
 * **Holographic effects:**
 * - Semi-transparent text with breathing-synced opacity
 * - Soft glow outline for ethereal depth
 * - Billboard mode (always faces camera)
 * - Subtle scale pulsing with breath
 *
 * **Rendering notes:**
 * - Must be placed OUTSIDE RefractionPipeline to avoid FBO issues
 * - Uses drei's Text (Troika) with fillOpacity for smooth animation
 */

// Vertical offset from center - places text safely outside particle orbit
const TEXT_Y_OFFSET = 4.5;

// Text color palette - darker for better legibility
const COLORS = {
  text: '#4a3f35', // Dark warm brown - high contrast
  glow: '#c9a06c', // Gold accent - subtle outline
  secondary: '#5a4d42', // Medium brown - fallback
};

/**
 * Calculate text opacity based on breathing phase
 * Mirrors the DOM InspirationalText behavior for consistency
 */
function calculateOpacity(phaseIndex: number, phaseProgress: number): number {
  switch (phaseIndex) {
    case 0: // Inhale - fade in with breathing curve
      return easeInhaleText(phaseProgress);
    case 1: // Hold-in - fully visible
      return 1;
    case 2: // Exhale - fade out with breathing curve
      return 1 - easeExhale(phaseProgress);
    case 3: // Hold-out - hidden
      return 0;
    default:
      return 0;
  }
}

interface HolographicTextProps {
  /**
   * Vertical offset from center for text placement.
   * Positive = above center, negative = below center.
   * @min 3
   * @max 8
   * @default 4.5
   */
  yOffset?: number;

  /**
   * Base font size for the text.
   * @min 0.3
   * @max 2
   * @default 0.8
   */
  fontSize?: number;

  /**
   * Depth position (Z axis). Positive = toward camera.
   * Higher values reduce occlusion risk from particles.
   * @min 0
   * @max 10
   * @default 5
   */
  zPosition?: number;

  /**
   * Letter spacing for the text.
   * Lower values improve legibility for short words.
   * @min 0
   * @max 0.2
   * @default 0.05
   */
  letterSpacing?: number;

  /**
   * Glow outline width around text.
   * Creates the holographic edge effect. Thinner = sharper text.
   * @min 0
   * @max 0.05
   * @default 0.015
   */
  glowWidth?: number;

  /**
   * Intensity of the glow effect (0-1).
   * Lower values improve text legibility.
   * @min 0
   * @max 1
   * @default 0.5
   */
  glowIntensity?: number;
}

/**
 * Single holographic text element with billboard and glow
 * Uses Troika's fillOpacity prop for opacity control
 */
interface TextElementProps {
  text: string;
  position: [number, number, number];
  fontSize: number;
  letterSpacing: number;
  glowWidth: number;
  opacity: number;
  glowOpacity: number;
}

function HolographicTextElement({
  text,
  position,
  fontSize,
  letterSpacing,
  glowWidth,
  opacity,
  glowOpacity,
}: TextElementProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  // Billboard effect - text always faces camera
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.quaternion.copy(camera.quaternion);
      // Subtle scale animation based on opacity
      const scale = 0.96 + opacity * 0.04;
      groupRef.current.scale.setScalar(scale);
    }
  });

  if (!text) return null;

  return (
    <group ref={groupRef} position={position}>
      <Text
        fontSize={fontSize}
        letterSpacing={letterSpacing}
        maxWidth={14}
        textAlign="center"
        anchorX="center"
        anchorY="middle"
        color={COLORS.text}
        fillOpacity={opacity}
        outlineColor={COLORS.glow}
        outlineWidth={glowWidth}
        outlineOpacity={glowOpacity}
      >
        {text.toUpperCase()}
      </Text>
    </group>
  );
}

/**
 * HolographicText3D - Main component for 3D inspirational text
 *
 * Renders breathing-synchronized holographic text above and below
 * the main scene elements. Text is positioned outside the particle
 * orbit sphere to prevent overlap.
 *
 * **Integration:**
 * Place inside Canvas but OUTSIDE the PresentationControls group
 * so text doesn't rotate with user interaction.
 */
function HolographicText3DComponent({
  yOffset = TEXT_Y_OFFSET,
  fontSize = 1.0,
  zPosition = 5,
  letterSpacing = 0.02,
  glowWidth = 0,
  glowIntensity = 0,
}: HolographicTextProps) {
  const prevPhaseRef = useRef(-1);
  const [currentMessage, setCurrentMessage] = useState({ top: '', bottom: '' });
  const [opacity, setOpacity] = useState(0);

  // Store subscriptions for message cycling
  // Subscribe to currentSequence and ambientIndex to trigger re-renders when message changes
  const {
    getCurrentMessage,
    advanceCycle,
    setAmbientPool,
    enqueue,
    ambientPool,
    currentSequence,
    ambientIndex,
  } = useInspirationalTextStore(
    useShallow((state) => ({
      getCurrentMessage: state.getCurrentMessage,
      advanceCycle: state.advanceCycle,
      setAmbientPool: state.setAmbientPool,
      enqueue: state.enqueue,
      ambientPool: state.ambientPool,
      currentSequence: state.currentSequence,
      ambientIndex: state.ambientIndex,
    })),
  );

  // Suppress unused variable warnings - these subscriptions trigger re-renders
  void currentSequence;
  void ambientIndex;

  // Store advanceCycle in ref to avoid stale closure
  const advanceCycleRef = useRef(advanceCycle);
  advanceCycleRef.current = advanceCycle;

  // Initialize store on mount
  useEffect(() => {
    if (ambientPool.length === 0) {
      setAmbientPool(AMBIENT_MESSAGES);
      enqueue(WELCOME_INTRO);
    }
  }, [ambientPool.length, setAmbientPool, enqueue]);

  // Update message whenever store state changes (currentSequence or ambientIndex)
  // biome-ignore lint/correctness/useExhaustiveDependencies: currentSequence and ambientIndex are intentionally included to trigger re-renders when store state changes, even though they're not directly used in the effect body
  useEffect(() => {
    const message = getCurrentMessage();
    if (message) {
      setCurrentMessage(message);
    }
  }, [getCurrentMessage, currentSequence, ambientIndex]);

  // Animation loop - update opacity and track cycle completion
  useFrame(() => {
    const now = Date.now() / 1000;
    const cycleTime = now % BREATH_TOTAL_CYCLE;
    const { phaseIndex, phaseProgress } = calculatePhaseInfo(cycleTime);

    // Calculate and set opacity
    const newOpacity = calculateOpacity(phaseIndex, phaseProgress);
    setOpacity(newOpacity);

    // Track cycle completion and advance queue
    // The message update is handled by the useEffect watching currentSequence/ambientIndex
    if (phaseIndex === 0 && prevPhaseRef.current === 3) {
      advanceCycleRef.current();
    }
    prevPhaseRef.current = phaseIndex;
  });

  const glowOpacity = opacity * glowIntensity;

  return (
    <group>
      {/* Top text - above the globe and particles */}
      <HolographicTextElement
        text={currentMessage.top}
        position={[0, yOffset, zPosition]}
        fontSize={fontSize}
        letterSpacing={letterSpacing}
        glowWidth={glowWidth}
        opacity={opacity}
        glowOpacity={glowOpacity}
      />

      {/* Bottom text - below the globe and particles */}
      <HolographicTextElement
        text={currentMessage.bottom}
        position={[0, -yOffset, zPosition]}
        fontSize={fontSize}
        letterSpacing={letterSpacing}
        glowWidth={glowWidth}
        opacity={opacity}
        glowOpacity={glowOpacity}
      />
    </group>
  );
}

export const HolographicText3D = memo(HolographicText3DComponent);
