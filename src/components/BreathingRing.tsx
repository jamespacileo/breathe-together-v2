import { useEffect, useRef } from 'react';
import { BREATH_PHASES, BREATH_TOTAL_CYCLE } from '../constants';
import { calculatePhaseInfo } from '../lib/breathPhase';
import { UI_COLORS } from '../styles/designTokens';

/**
 * BreathingRing - Minimal circular breathing progress tracker
 *
 * Features:
 * - Circular progress ring that fills as the breathing cycle progresses
 * - Four phase markers (Inhale, Hold, Exhale, Hold) as thick measurement lines
 * - Muted color for inactive elements, amber/gold for active
 * - RAF-based animation for smooth 60fps updates
 *
 * Design:
 * - Markers extend outward from the ring like gauge measurement marks
 * - Active phase text uses gold accent color
 * - Inactive phase text uses muted color
 * - Progress ring fills clockwise from top (12 o'clock position)
 */

// Phase positions around the ring (in degrees, clockwise from top)
// Based on phase durations from BREATH_PHASES
const PHASE_ANGLES = {
  inhale: 0, // Top (12 o'clock) - 0°
  holdIn: (BREATH_PHASES.INHALE / BREATH_TOTAL_CYCLE) * 360, // After inhale
  exhale:
    ((BREATH_PHASES.INHALE + BREATH_PHASES.HOLD_IN) / BREATH_TOTAL_CYCLE) * 360, // After hold-in
  holdOut:
    ((BREATH_PHASES.INHALE + BREATH_PHASES.HOLD_IN + BREATH_PHASES.EXHALE) /
      BREATH_TOTAL_CYCLE) *
    360, // After exhale
};

interface BreathingRingProps {
  /** Ring diameter in pixels @default 280 */
  size?: number;
  /** Ring stroke width @default 2 */
  strokeWidth?: number;
  /** Marker line length (extends outward) @default 12 */
  markerLength?: number;
  /** Marker line thickness @default 2 */
  markerThickness?: number;
}

export function BreathingRing({
  size = 280,
  strokeWidth = 2,
  markerLength = 12,
  markerThickness = 2,
}: BreathingRingProps) {
  const progressRef = useRef<SVGCircleElement>(null);
  const markerRefs = useRef<(SVGLineElement | null)[]>([]);
  const textRefs = useRef<(SVGTextElement | null)[]>([]);

  // Calculate ring geometry
  const center = size / 2;
  const radius = center - strokeWidth / 2 - markerLength - 20; // Leave room for markers and text
  const circumference = 2 * Math.PI * radius;

  // Colors
  const colors = {
    muted: UI_COLORS.text.dim,
    active: UI_COLORS.accent.gold,
    ring: UI_COLORS.border.default,
    ringActive: UI_COLORS.accent.goldLight,
  };

  // Phase labels and their angles
  const phases = [
    { label: 'Inhale', angle: PHASE_ANGLES.inhale, index: 0 },
    { label: 'Hold', angle: PHASE_ANGLES.holdIn, index: 1 },
    { label: 'Exhale', angle: PHASE_ANGLES.exhale, index: 2 },
    { label: 'Hold', angle: PHASE_ANGLES.holdOut, index: 3 },
  ];

  // Calculate position on ring given angle (0° = top, clockwise)
  const getPosition = (angle: number, r: number) => {
    const radians = ((angle - 90) * Math.PI) / 180; // -90 to start from top
    return {
      x: center + r * Math.cos(radians),
      y: center + r * Math.sin(radians),
    };
  };

  // RAF loop for smooth progress animation
  useEffect(() => {
    let animationId: number;

    const updateRing = () => {
      const now = Date.now() / 1000;
      const cycleTime = now % BREATH_TOTAL_CYCLE;
      const { phaseIndex } = calculatePhaseInfo(cycleTime);

      // Calculate overall cycle progress (0-1)
      const cycleProgress = cycleTime / BREATH_TOTAL_CYCLE;

      // Update progress ring
      if (progressRef.current) {
        const offset = circumference * (1 - cycleProgress);
        progressRef.current.style.strokeDashoffset = String(offset);
      }

      // Update markers and text colors based on active phase
      phases.forEach((_phase, i) => {
        const isActive = i === phaseIndex;
        const marker = markerRefs.current[i];
        const text = textRefs.current[i];

        if (marker) {
          marker.style.stroke = isActive ? colors.active : colors.muted;
          marker.style.opacity = isActive ? '1' : '0.5';
        }
        if (text) {
          text.style.fill = isActive ? colors.active : colors.muted;
          text.style.opacity = isActive ? '1' : '0.6';
        }
      });

      animationId = requestAnimationFrame(updateRing);
    };

    updateRing();
    return () => cancelAnimationFrame(animationId);
  }, [circumference, colors.active, colors.muted, phases]);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
      }}
    >
      {/* Background ring (muted) */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={colors.ring}
        strokeWidth={strokeWidth}
        opacity={0.3}
      />

      {/* Progress ring (active) */}
      <circle
        ref={progressRef}
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={colors.ringActive}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference}
        style={{
          transform: 'rotate(-90deg)',
          transformOrigin: 'center',
          transition: 'stroke-dashoffset 0.1s linear',
        }}
      />

      {/* Phase markers - thick lines extending outward */}
      {phases.map((phase, i) => {
        const innerPos = getPosition(phase.angle, radius - markerLength / 2);
        const outerPos = getPosition(phase.angle, radius + markerLength);

        return (
          <line
            key={`marker-${phase.label}-${phase.index}`}
            ref={(el) => {
              markerRefs.current[i] = el;
            }}
            x1={innerPos.x}
            y1={innerPos.y}
            x2={outerPos.x}
            y2={outerPos.y}
            stroke={colors.muted}
            strokeWidth={markerThickness}
            strokeLinecap="round"
            opacity={0.5}
          />
        );
      })}

      {/* Phase labels */}
      {phases.map((phase, i) => {
        // Position text outside the markers
        const textRadius = radius + markerLength + 18;
        const pos = getPosition(phase.angle, textRadius);

        // Determine text anchor based on position
        let textAnchor: 'start' | 'middle' | 'end' = 'middle';
        let dy = '0.35em';

        // Adjust text anchor based on angle for better positioning
        if (phase.angle > 45 && phase.angle < 135) {
          textAnchor = 'start'; // Right side
        } else if (phase.angle > 225 && phase.angle < 315) {
          textAnchor = 'end'; // Left side
        }

        // Adjust vertical position for top/bottom
        if (phase.angle < 45 || phase.angle > 315) {
          dy = '-0.2em'; // Top - move text up
        } else if (phase.angle > 135 && phase.angle < 225) {
          dy = '0.9em'; // Bottom - move text down
        }

        return (
          <text
            key={`text-${phase.label}-${phase.index}`}
            ref={(el) => {
              textRefs.current[i] = el;
            }}
            x={pos.x}
            y={pos.y}
            textAnchor={textAnchor}
            dy={dy}
            fill={colors.muted}
            fontSize="11"
            fontFamily="'DM Sans', system-ui, sans-serif"
            fontWeight={500}
            letterSpacing="0.05em"
            opacity={0.6}
            style={{ textTransform: 'capitalize' }}
          >
            {phase.label}
          </text>
        );
      })}
    </svg>
  );
}
