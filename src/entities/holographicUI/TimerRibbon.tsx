/**
 * TimerRibbon - Curved countdown timer below the globe
 *
 * Shows seconds remaining in the current breathing phase as a
 * curved text ribbon positioned below the globe.
 *
 * Features:
 * - Large oldstyle numeral for readability
 * - Curved to follow globe contour
 * - Fades out during hold phases (optional)
 * - Gold glow matching design system
 */

import { Text, type TextProps } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import type React from 'react';
import { useRef, useState } from 'react';
import * as THREE from 'three';

import { BREATH_PHASES, BREATH_TOTAL_CYCLE } from '../../constants';

// Extended Text props to include curveRadius
interface CurvedTextProps extends TextProps {
  curveRadius?: number;
}
const CurvedText = Text as React.FC<CurvedTextProps>;

interface TimerRibbonProps {
  /** Globe radius for positioning @default 1.5 */
  globeRadius?: number;
  /** Height below globe center (negative) @default -1.6 */
  height?: number;
  /** Font size @default 0.2 */
  fontSize?: number;
  /** Whether to hide during hold phases @default false */
  hideOnHold?: boolean;
  /** Override seconds for testing */
  testSeconds?: number;
  /** Override phase for testing (0=inhale, 1=hold, 2=exhale) */
  testPhaseIndex?: number;
  /** Whether to use test values */
  useTestValues?: boolean;
}

export function TimerRibbon({
  globeRadius = 1.5,
  height = -1.6,
  fontSize = 0.2,
  hideOnHold = false,
  testSeconds,
  testPhaseIndex,
  useTestValues = false,
}: TimerRibbonProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [displayText, setDisplayText] = useState('4');
  const opacityRef = useRef(1);
  const lastSecond = useRef(-1);

  useFrame((_state, delta) => {
    let seconds = 0;
    let phaseIndex = 0;

    if (useTestValues) {
      seconds = testSeconds ?? 4;
      phaseIndex = testPhaseIndex ?? 0;
    } else {
      // Calculate from UTC time
      const now = Date.now() / 1000;
      const cycleTime = now % BREATH_TOTAL_CYCLE;

      if (cycleTime < BREATH_PHASES.INHALE) {
        phaseIndex = 0;
        seconds = Math.ceil(BREATH_PHASES.INHALE - cycleTime);
      } else if (cycleTime < BREATH_PHASES.INHALE + BREATH_PHASES.HOLD_IN) {
        phaseIndex = 1;
        seconds = Math.ceil(BREATH_PHASES.INHALE + BREATH_PHASES.HOLD_IN - cycleTime);
      } else {
        phaseIndex = 2;
        seconds = Math.ceil(BREATH_TOTAL_CYCLE - cycleTime);
      }
    }

    // Update text only when second changes
    if (seconds !== lastSecond.current) {
      lastSecond.current = seconds;
      setDisplayText(String(seconds));
    }

    // Handle opacity for hold phase via group visibility
    const targetOpacity = hideOnHold && phaseIndex === 1 ? 0.3 : 1.0;
    opacityRef.current = THREE.MathUtils.lerp(opacityRef.current, targetOpacity, delta * 5);

    // Apply opacity via scale (simple fade effect)
    if (groupRef.current) {
      groupRef.current.visible = opacityRef.current > 0.1;
    }
  });

  const radius = globeRadius + 0.2;

  return (
    <group ref={groupRef} position={[0, height, radius]}>
      <CurvedText
        fontSize={fontSize}
        color="#c9a06c"
        anchorX="center"
        anchorY="middle"
        curveRadius={-radius}
        fontWeight={300}
        fillOpacity={1}
        material-transparent={true}
        material-depthWrite={false}
        outlineWidth={0.005}
        outlineColor="#8b7a6a"
        outlineOpacity={0.3}
      >
        {displayText}
      </CurvedText>
    </group>
  );
}
