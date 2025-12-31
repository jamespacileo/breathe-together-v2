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
 * - Top text: Y = +5.5 units (above particle orbit radius of 4.5)
 * - Bottom text: Y = -5.5 units (below particle orbit radius of 4.5)
 * - Z = +2 (slightly toward camera to prevent occlusion by particles)
 *
 * **Holographic effects:**
 * - Semi-transparent text with breathing-synced opacity
 * - Soft glow outline for ethereal depth
 * - Billboard mode (always faces camera)
 * - Subtle scale pulsing with breath
 *
 * **Why these positions are safe:**
 * - Globe center: (0, 0, 0) with radius ~1.5
 * - Particle orbit: radius 4.5 units (spherical distribution)
 * - At Y = ±5.5, text is outside the sphere formed by particles
 * - Z = +2 places text in front of most particles when viewed from camera
 */

// Vertical offset from center - places text safely outside particle orbit
const TEXT_Y_OFFSET = 5.5;

// Holographic color palette - warm whites with teal accent
const COLORS = {
  text: '#f5efe6', // Warm white - main text color
  glow: '#7ec8d4', // Teal accent - outline glow
  secondary: '#e8dfd0', // Softer warm - fallback
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
   * Must be greater than particle orbit radius (4.5) to avoid overlap.
   * @min 4.5
   * @max 10
   * @default 5.5
   */
  yOffset?: number;

  /**
   * Base font size for the text.
   * @min 0.3
   * @max 1.5
   * @default 0.55
   */
  fontSize?: number;

  /**
   * Depth position (Z axis). Positive = toward camera.
   * Higher values reduce occlusion risk from particles.
   * @min 0
   * @max 5
   * @default 2
   */
  zPosition?: number;

  /**
   * Letter spacing for the text.
   * Higher values create more spaced-out, elegant text.
   * @min 0
   * @max 0.5
   * @default 0.12
   */
  letterSpacing?: number;

  /**
   * Glow outline width around text.
   * Creates the holographic edge effect.
   * @min 0
   * @max 0.1
   * @default 0.02
   */
  glowWidth?: number;

  /**
   * Intensity of the glow effect (0-1).
   * Higher values create more visible glow.
   * @min 0
   * @max 1
   * @default 0.6
   */
  glowIntensity?: number;
}

/**
 * Single holographic text element with billboard and glow
 * Uses ref-based animation for smooth 60fps updates without React re-renders
 */
interface TextElementProps {
  text: string;
  position: [number, number, number];
  fontSize: number;
  letterSpacing: number;
  glowWidth: number;
  glowIntensity: number;
}

function HolographicTextElement({
  text,
  position,
  fontSize,
  letterSpacing,
  glowWidth,
  glowIntensity,
}: TextElementProps) {
  const groupRef = useRef<THREE.Group>(null);
  // biome-ignore lint/suspicious/noExplicitAny: Troika Text doesn't export proper types
  const textRef = useRef<any>(null);
  const { camera } = useThree();

  // Animation loop - updates billboard and opacity each frame
  useFrame(() => {
    if (!groupRef.current) return;

    // Billboard effect - text always faces camera
    groupRef.current.quaternion.copy(camera.quaternion);

    // Calculate breathing-synced opacity
    const now = Date.now() / 1000;
    const cycleTime = now % BREATH_TOTAL_CYCLE;
    const { phaseIndex, phaseProgress } = calculatePhaseInfo(cycleTime);
    const opacity = calculateOpacity(phaseIndex, phaseProgress);

    // Subtle scale animation
    const scale = 0.96 + opacity * 0.04;
    groupRef.current.scale.setScalar(scale);

    // Update text material opacity directly (Troika Text exposes material)
    if (textRef.current?.material) {
      textRef.current.material.opacity = opacity;
      // Troika uses outlineOpacity uniform
      if (textRef.current.material.uniforms?.outlineOpacity) {
        textRef.current.material.uniforms.outlineOpacity.value = opacity * glowIntensity;
      }
    }
  });

  if (!text) return null;

  return (
    <group ref={groupRef} position={position}>
      <Text
        ref={textRef}
        fontSize={fontSize}
        letterSpacing={letterSpacing}
        maxWidth={14}
        textAlign="center"
        anchorX="center"
        anchorY="middle"
        color={COLORS.text}
        fillOpacity={0} // Start invisible - animation loop controls this
        outlineColor={COLORS.glow}
        outlineWidth={glowWidth}
        outlineOpacity={0} // Start invisible
        // Uses Troika's default Inter font - clean and readable
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
 *
 * **Example:**
 * ```tsx
 * <Canvas>
 *   <PresentationControls>
 *     <EarthGlobe />
 *     <ParticleSwarm />
 *   </PresentationControls>
 *   <HolographicText3D />  {/* Outside rotation control *}
 * </Canvas>
 * ```
 */
function HolographicText3DComponent({
  yOffset = TEXT_Y_OFFSET,
  fontSize = 0.55,
  zPosition = 2,
  letterSpacing = 0.12,
  glowWidth = 0.02,
  glowIntensity = 0.6,
}: HolographicTextProps) {
  const prevPhaseRef = useRef(-1);
  const [currentMessage, setCurrentMessage] = useState({ top: '', bottom: '' });

  // Store subscriptions for message cycling
  const { getCurrentMessage, advanceCycle, setAmbientPool, enqueue, ambientPool } =
    useInspirationalTextStore(
      useShallow((state) => ({
        getCurrentMessage: state.getCurrentMessage,
        advanceCycle: state.advanceCycle,
        setAmbientPool: state.setAmbientPool,
        enqueue: state.enqueue,
        ambientPool: state.ambientPool,
      })),
    );

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

  // Update current message when it changes
  useEffect(() => {
    const message = getCurrentMessage();
    if (message) {
      setCurrentMessage(message);
    }
  }, [getCurrentMessage]);

  // Animation loop - track cycle completion to advance messages
  useFrame(() => {
    const now = Date.now() / 1000;
    const cycleTime = now % BREATH_TOTAL_CYCLE;
    const { phaseIndex } = calculatePhaseInfo(cycleTime);

    // Track cycle completion and advance queue
    if (phaseIndex === 0 && prevPhaseRef.current === 3) {
      advanceCycleRef.current();
      // Update message after advancing
      const newMessage = getCurrentMessage();
      if (newMessage) {
        setCurrentMessage(newMessage);
      }
    }
    prevPhaseRef.current = phaseIndex;
  });

  return (
    <group>
      {/* Top text - above the globe and particles */}
      <HolographicTextElement
        text={currentMessage.top}
        position={[0, yOffset, zPosition]}
        fontSize={fontSize}
        letterSpacing={letterSpacing}
        glowWidth={glowWidth}
        glowIntensity={glowIntensity}
      />

      {/* Bottom text - below the globe and particles */}
      <HolographicTextElement
        text={currentMessage.bottom}
        position={[0, -yOffset, zPosition]}
        fontSize={fontSize}
        letterSpacing={letterSpacing}
        glowWidth={glowWidth}
        glowIntensity={glowIntensity}
      />
    </group>
  );
}

export const HolographicText3D = memo(HolographicText3DComponent);
