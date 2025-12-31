import { BREATH_PHASES, BREATH_TOTAL_CYCLE } from '../constants';

interface BreathingProgressRingProps {
  /** Current phase index (0=inhale, 1=hold, 2=exhale) */
  phaseIndex: number;
  /** Progress within current phase (0-1) */
  phaseProgress: number;
  /** Ring size in pixels */
  size?: number;
  /** Stroke width */
  strokeWidth?: number;
}

// Phase colors - warm palette
const PHASE_COLORS = {
  inhale: 'rgba(201, 160, 108, 0.9)', // Gold
  hold: 'rgba(180, 150, 100, 0.7)', // Muted gold
  exhale: 'rgba(160, 140, 120, 0.6)', // Warm gray
  background: 'rgba(160, 140, 120, 0.15)', // Subtle background
};

// Phase names for stable keys
const PHASE_KEYS = ['inhale', 'hold', 'exhale'] as const;

// Calculate arc angles for each phase based on duration
const PHASE_DURATIONS = [BREATH_PHASES.INHALE, BREATH_PHASES.HOLD_IN, BREATH_PHASES.EXHALE];
const PHASE_ANGLES = PHASE_DURATIONS.map((d) => (d / BREATH_TOTAL_CYCLE) * 360);

// Cumulative start angles (starting from top = -90 degrees)
const PHASE_START_ANGLES: number[] = [-90];
for (let i = 1; i < PHASE_ANGLES.length; i++) {
  PHASE_START_ANGLES.push(PHASE_START_ANGLES[i - 1] + PHASE_ANGLES[i - 1]);
}

/**
 * BreathingProgressRing - Segmented circular progress showing all breathing phases.
 *
 * Displays 3 segments proportional to 4/7/8 durations:
 * - Inhale (4s) - brightest
 * - Hold (7s) - medium
 * - Exhale (8s) - subtle
 *
 * Current phase fills with progress, completed phases stay filled.
 */
export function BreathingProgressRing({
  phaseIndex,
  phaseProgress,
  size = 320,
  strokeWidth = 4,
}: BreathingProgressRingProps) {
  const center = size / 2;
  const radius = (size - strokeWidth) / 2 - 8; // Slight padding

  // Convert polar to cartesian
  const polarToCartesian = (angle: number) => {
    const radians = (angle * Math.PI) / 180;
    return {
      x: center + radius * Math.cos(radians),
      y: center + radius * Math.sin(radians),
    };
  };

  // Create arc path
  const createArc = (startAngle: number, endAngle: number) => {
    const start = polarToCartesian(startAngle);
    const end = polarToCartesian(endAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  };

  // Get phase color
  const getPhaseColor = (index: number) => {
    const colors = [PHASE_COLORS.inhale, PHASE_COLORS.hold, PHASE_COLORS.exhale];
    return colors[index] ?? PHASE_COLORS.background;
  };

  return (
    <svg
      width={size}
      height={size}
      role="img"
      aria-label="Breathing progress"
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
      }}
    >
      <title>Breathing progress - 4/7/8 pattern</title>

      {/* Background ring segments */}
      {PHASE_KEYS.map((key, i) => {
        const angle = PHASE_ANGLES[i];
        const startAngle = PHASE_START_ANGLES[i];
        const endAngle = startAngle + angle - 2; // Small gap between segments
        return (
          <path
            key={`bg-${key}`}
            d={createArc(startAngle, endAngle)}
            fill="none"
            stroke={PHASE_COLORS.background}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        );
      })}

      {/* Completed phases (fully filled) */}
      {PHASE_KEYS.map((key, i) => {
        if (i >= phaseIndex) return null; // Only show completed phases
        const angle = PHASE_ANGLES[i];
        const startAngle = PHASE_START_ANGLES[i];
        const endAngle = startAngle + angle - 2;
        return (
          <path
            key={`complete-${key}`}
            d={createArc(startAngle, endAngle)}
            fill="none"
            stroke={getPhaseColor(i)}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            style={{ transition: 'stroke 0.3s ease' }}
          />
        );
      })}

      {/* Current phase (partial fill based on progress) */}
      {phaseIndex < PHASE_ANGLES.length && (
        <path
          d={createArc(
            PHASE_START_ANGLES[phaseIndex],
            PHASE_START_ANGLES[phaseIndex] + (PHASE_ANGLES[phaseIndex] - 2) * phaseProgress,
          )}
          fill="none"
          stroke={getPhaseColor(phaseIndex)}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          style={{ transition: 'stroke 0.1s linear' }}
        />
      )}

      {/* Phase duration labels (subtle) */}
      {PHASE_KEYS.map((key, i) => {
        const duration = PHASE_DURATIONS[i];
        // Position label at center of each segment
        const midAngle = PHASE_START_ANGLES[i] + PHASE_ANGLES[i] / 2;
        const labelRadius = radius + 20;
        const pos = {
          x: center + labelRadius * Math.cos((midAngle * Math.PI) / 180),
          y: center + labelRadius * Math.sin((midAngle * Math.PI) / 180),
        };
        const isActive = i === phaseIndex;
        return (
          <text
            key={`label-${key}`}
            x={pos.x}
            y={pos.y}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: isActive ? '14px' : '11px',
              fontWeight: isActive ? 500 : 400,
              fill: isActive ? '#4a3f35' : '#9a8a7a',
              opacity: isActive ? 1 : 0.6,
              transition: 'all 0.3s ease',
            }}
          >
            {duration}s
          </text>
        );
      })}
    </svg>
  );
}
