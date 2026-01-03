/**
 * InspirationalText3D - Breath-synchronized 3D text with bloom reveal effect
 *
 * Displays inspirational messages that materialize from center outward during
 * inhale, hold fully visible during hold phase, then dissolve into rising
 * particles during exhale.
 *
 * Features:
 * - Radial bloom reveal synchronized to inhale phase
 * - Stable visibility during hold phase
 * - Particle dissolution during exhale
 * - Uses drei's Text component for crisp SDF text rendering
 * - Integrated with ECS breath system via Koota
 *
 * Architecture:
 * - Reads breath state from ECS (breathPhase, phaseType traits)
 * - Maps phase to reveal/dissolve progress
 * - Custom shader handles the visual effects
 * - TextDissolutionParticles handles exhale particles
 */

import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type * as THREE from 'three';
import { useInspirationText } from '../../hooks/useInspirationText';
import { easeExhale, easeInhale } from '../../lib/easing';
import { breathPhase, phaseType } from '../breath/traits';
import { type BloomRevealMaterialUniforms, createBloomRevealMaterial } from './BloomRevealMaterial';
import { TextDissolutionParticles } from './TextDissolutionParticles';

export interface InspirationalText3DProps {
  /** Y position offset for the text group @default 0 */
  yOffset?: number;
  /** Z position (distance from camera) @default 3 */
  zPosition?: number;
  /** Font size @default 0.35 */
  fontSize?: number;
  /** Text color @default '#f5f0e6' */
  color?: string;
  /** Glow color for bloom effect @default '#c9a06c' */
  glowColor?: string;
  /** Glow intensity @default 0.6 */
  glowIntensity?: number;
  /** Gap between top and bottom text @default 2.5 */
  textGap?: number;
  /** Enable particle dissolution effect @default true */
  enableParticles?: boolean;
}

export function InspirationalText3D({
  yOffset = 0,
  zPosition = 3,
  fontSize = 0.35,
  color = '#f5f0e6',
  glowColor = '#c9a06c',
  glowIntensity = 0.6,
  textGap = 2.5,
  enableParticles = true,
}: InspirationalText3DProps) {
  const world = useWorld();
  const groupRef = useRef<THREE.Group>(null);

  // Animation state for particles
  const [dissolveProgress, setDissolveProgress] = useState(0);

  // Fetch inspirational message
  const { message } = useInspirationText();

  // Create materials using factory function
  const topMaterial = useMemo(
    () => createBloomRevealMaterial(color, glowColor, glowIntensity),
    [color, glowColor, glowIntensity],
  );

  const bottomMaterial = useMemo(
    () => createBloomRevealMaterial(color, glowColor, glowIntensity),
    [color, glowColor, glowIntensity],
  );

  // Cleanup materials on unmount
  useEffect(() => {
    return () => {
      topMaterial.dispose();
      bottomMaterial.dispose();
    };
  }, [topMaterial, bottomMaterial]);

  // Animation loop - sync with ECS breath system
  useFrame((state) => {
    // Query breath entity from ECS
    const breathEntity = world.queryFirst(breathPhase, phaseType);
    if (!breathEntity) return;

    const currentPhase = breathEntity.get(breathPhase)?.value ?? 0;
    const currentPhaseType = breathEntity.get(phaseType)?.value ?? 0;

    // Calculate reveal and dissolve progress based on phase
    // Phase 0: Inhale (reveal 0→1)
    // Phase 1: Hold-in (reveal 1, dissolve 0)
    // Phase 2: Exhale (reveal 1→0 via dissolve)
    // Phase 3: Hold-out (hidden)

    let reveal = 0;
    let dissolve = 0;

    switch (currentPhaseType) {
      case 0: // Inhale - reveal from center
        // currentPhase goes 0→1 during inhale
        reveal = easeInhale(currentPhase);
        dissolve = 0;
        break;

      case 1: // Hold-in - fully visible
        reveal = 1;
        dissolve = 0;
        break;

      case 2: // Exhale - dissolve into particles
        // During exhale, currentPhase goes 1→0
        // We want dissolve to go 0→1
        reveal = 1;
        dissolve = easeExhale(1 - currentPhase);
        break;

      case 3: // Hold-out - hidden
        reveal = 0;
        dissolve = 1;
        break;
    }

    setDissolveProgress(dissolve);

    // Update shader uniforms
    const time = state.clock.elapsedTime;

    topMaterial.uniforms.uRevealProgress.value = reveal;
    topMaterial.uniforms.uDissolveProgress.value = dissolve;
    topMaterial.uniforms.uTime.value = time;

    bottomMaterial.uniforms.uRevealProgress.value = reveal;
    bottomMaterial.uniforms.uDissolveProgress.value = dissolve;
    bottomMaterial.uniforms.uTime.value = time;

    // Subtle scale pulse during hold
    if (groupRef.current && currentPhaseType === 1) {
      const pulse = 1 + Math.sin(time * 2) * 0.01;
      groupRef.current.scale.setScalar(pulse);
    } else if (groupRef.current) {
      groupRef.current.scale.setScalar(1);
    }
  });

  // Format message - use defaults if no message
  const topText = message?.top || 'PRESENCE';
  const bottomText = message?.bottom || 'CONNECTED ACROSS THE WORLD';

  // Calculate text widths for particle spawn areas
  const topWidth = topText.length * fontSize * 0.6;
  const bottomWidth = bottomText.length * fontSize * 0.5;

  return (
    <group ref={groupRef} position={[0, yOffset, zPosition]}>
      {/* Top text */}
      <group position={[0, textGap / 2, 0]}>
        <Text
          fontSize={fontSize}
          letterSpacing={0.15}
          textAlign="center"
          anchorX="center"
          anchorY="middle"
          maxWidth={8}
          material={topMaterial}
        >
          {topText}
        </Text>

        {/* Dissolution particles for top text */}
        {enableParticles && (
          <TextDissolutionParticles
            progress={dissolveProgress}
            width={topWidth}
            height={fontSize * 1.5}
            count={30}
            color={glowColor}
          />
        )}
      </group>

      {/* Bottom text */}
      <group position={[0, -textGap / 2, 0]}>
        <Text
          fontSize={fontSize * 0.85}
          letterSpacing={0.12}
          textAlign="center"
          anchorX="center"
          anchorY="middle"
          maxWidth={10}
          material={bottomMaterial}
        >
          {bottomText}
        </Text>

        {/* Dissolution particles for bottom text */}
        {enableParticles && (
          <TextDissolutionParticles
            progress={dissolveProgress}
            width={bottomWidth}
            height={fontSize * 1.2}
            count={40}
            color={glowColor}
          />
        )}
      </group>
    </group>
  );
}

export default InspirationalText3D;
