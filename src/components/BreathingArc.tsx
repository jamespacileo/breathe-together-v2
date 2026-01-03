/**
 * BreathingArc - Visual breathing progress indicator
 *
 * Displays a semicircular arc at the bottom of the screen that
 * fills/empties with the breathing cycle, providing intuitive
 * visual feedback of where you are in the breath.
 *
 * - Inhale: Arc fills from left to right (gold glow)
 * - Hold-in: Arc stays full with gentle pulse
 * - Exhale: Arc empties from right to left
 * - Hold-out: Arc stays empty (minimal state)
 *
 * Uses RAF loop for smooth 60fps updates without React re-renders.
 */

import { useCallback, useEffect, useRef } from 'react';
import { BREATH_TOTAL_CYCLE } from '../constants';
import { useViewport } from '../hooks/useViewport';
import { calculatePhaseInfo } from '../lib/breathPhase';

interface BreathingArcProps {
  /** Arc width in pixels @default 200 (mobile: 160) */
  width?: number;
  /** Arc stroke width @default 3 */
  strokeWidth?: number;
  /** Show the arc @default true */
  enabled?: boolean;
}

// Colors
const GOLD = 'rgba(201, 160, 108, 1)';
const GOLD_GLOW = 'rgba(201, 160, 108, 0.6)';
const TRACK_COLOR = 'rgba(201, 160, 108, 0.12)';

export function BreathingArc({
  width: propWidth,
  strokeWidth = 3,
  enabled = true,
}: BreathingArcProps) {
  const arcRef = useRef<SVGCircleElement>(null);
  const glowRef = useRef<SVGCircleElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { isMobile, isTablet } = useViewport();

  // Responsive width
  const width = propWidth ?? (isMobile ? 140 : isTablet ? 170 : 200);
  const height = width * 0.35; // Shallow arc

  // SVG arc calculations
  const radius = width * 0.45;
  const circumference = Math.PI * radius; // Half circle

  // Calculate arc progress based on current phase
  const getArcProgress = useCallback(() => {
    const now = Date.now() / 1000;
    const cycleTime = now % BREATH_TOTAL_CYCLE;
    const { phaseIndex, phaseProgress } = calculatePhaseInfo(cycleTime);

    let arcProgress = 0;

    switch (phaseIndex) {
      case 0: // Inhale - fill from 0 to 1
        arcProgress = phaseProgress;
        break;
      case 1: // Hold-in - stay at 1 with subtle pulse
        arcProgress = 1;
        break;
      case 2: // Exhale - empty from 1 to 0
        arcProgress = 1 - phaseProgress;
        break;
      case 3: // Hold-out - stay at 0
        arcProgress = 0;
        break;
    }

    return { arcProgress, phaseIndex, phaseProgress };
  }, []);

  // RAF animation loop
  useEffect(() => {
    if (!enabled) return;

    let animationId: number;

    const animate = () => {
      const { arcProgress, phaseIndex, phaseProgress } = getArcProgress();

      if (arcRef.current && glowRef.current) {
        // Update stroke-dashoffset for arc fill
        // Offset = circumference means empty, offset = 0 means full
        const offset = circumference * (1 - arcProgress);
        arcRef.current.style.strokeDashoffset = `${offset}`;
        glowRef.current.style.strokeDashoffset = `${offset}`;

        // Glow intensity based on phase
        let glowOpacity = 0.3;
        if (phaseIndex === 0) {
          // Inhale - increasing glow
          glowOpacity = 0.3 + phaseProgress * 0.4;
        } else if (phaseIndex === 1) {
          // Hold-in - pulsing glow
          const pulse = Math.sin(Date.now() / 500) * 0.15 + 0.15;
          glowOpacity = 0.6 + pulse;
        } else if (phaseIndex === 2) {
          // Exhale - fading glow
          glowOpacity = 0.5 * (1 - phaseProgress);
        }

        glowRef.current.style.opacity = `${glowOpacity}`;
      }

      // Update container glow based on arc fill
      if (containerRef.current) {
        const glowIntensity = arcProgress * 0.5;
        containerRef.current.style.filter = `drop-shadow(0 0 ${8 + glowIntensity * 12}px ${GOLD_GLOW})`;
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationId);
  }, [enabled, circumference, getArcProgress]);

  if (!enabled) return null;

  return (
    <div
      ref={containerRef}
      className="pointer-events-none"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        transition: 'filter 0.3s ease-out',
      }}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ overflow: 'visible' }}
        role="img"
        aria-label="Breathing progress indicator"
      >
        {/* Track (background arc) */}
        <path
          d={`M ${width * 0.05} ${height} A ${radius} ${radius} 0 0 1 ${width * 0.95} ${height}`}
          fill="none"
          stroke={TRACK_COLOR}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Glow layer */}
        <circle
          ref={glowRef}
          cx={width / 2}
          cy={height + radius * 0.1}
          r={radius}
          fill="none"
          stroke={GOLD_GLOW}
          strokeWidth={strokeWidth + 4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          style={{
            filter: 'blur(6px)',
            transform: 'rotate(180deg)',
            transformOrigin: `${width / 2}px ${height + radius * 0.1}px`,
          }}
        />

        {/* Active arc */}
        <circle
          ref={arcRef}
          cx={width / 2}
          cy={height + radius * 0.1}
          r={radius}
          fill="none"
          stroke={GOLD}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          style={{
            transform: 'rotate(180deg)',
            transformOrigin: `${width / 2}px ${height + radius * 0.1}px`,
            transition: 'stroke-dashoffset 0.05s linear',
          }}
        />
      </svg>
    </div>
  );
}

export default BreathingArc;
