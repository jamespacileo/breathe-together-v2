/**
 * ProgressCircleOverlayHTML - SVG/HTML progress circle overlay
 *
 * An HTML-based overlay that sits outside the WebGL canvas, ensuring it's
 * never affected by Three.js post-processing effects like depth of field.
 *
 * Features:
 * - SVG circular progress ring (crisp vector graphics)
 * - Phase markers and labels around the ring
 * - User count text centered
 * - Breathing animation (expands on inhale, contracts on exhale)
 * - Synchronized with breathing cycle via UTC time
 *
 * Implementation follows InspirationalText pattern:
 * - RAF loop for 60fps animation (no React state)
 * - Direct DOM manipulation via refs
 * - CSS transforms for smooth scaling
 */

import { useEffect, useRef } from 'react';
import { BREATH_PHASES, BREATH_TOTAL_CYCLE } from '../constants';
import { calculatePhaseInfo } from '../lib/breathPhase';
import { Z_INDEX } from '../styles/designTokens';

// Phase configuration
const PHASE_NAMES = ['Inhale', 'Hold', 'Exhale', 'Hold'] as const;

const PHASE_DURATIONS = [
  BREATH_PHASES.INHALE,
  BREATH_PHASES.HOLD_IN,
  BREATH_PHASES.EXHALE,
  BREATH_PHASES.HOLD_OUT,
];

// Calculate cumulative start times for each phase
const PHASE_START_TIMES = PHASE_DURATIONS.reduce<number[]>((acc, _duration, index) => {
  if (index === 0) return [0];
  const lastStart = acc[index - 1] ?? 0;
  acc.push(lastStart + (PHASE_DURATIONS[index - 1] ?? 0));
  return acc;
}, []);

// Generate phase labels (only for phases with duration > 0)
const PHASE_LABELS = PHASE_DURATIONS.map((duration, index) => {
  const startTime = PHASE_START_TIMES[index] ?? 0;
  const progressPosition = startTime / BREATH_TOTAL_CYCLE;
  // Convert to angle (0 = top, clockwise)
  const angleDeg = progressPosition * 360;

  return {
    name: PHASE_NAMES[index] ?? 'Phase',
    angleDeg,
    phaseIndex: index,
    duration,
  };
}).filter((phase) => phase.duration > 0);

interface ProgressCircleOverlayHTMLProps {
  /** Base radius in viewport units @default 18 */
  baseRadius?: number;
  /** Expanded radius (inhale) in viewport units @default 22 */
  expandedRadius?: number;
  /** Ring stroke width @default 2 */
  strokeWidth?: number;
  /** Progress color @default '#c9a06c' */
  progressColor?: string;
  /** Muted color for inactive elements @default '#a08c78' */
  mutedColor?: string;
  /** User count to display @default 77 */
  userCount?: number;
  /** Show user count @default true */
  showUserCount?: boolean;
}

export function ProgressCircleOverlayHTML({
  baseRadius = 18,
  expandedRadius = 22,
  strokeWidth = 2,
  progressColor = '#c9a06c',
  mutedColor = '#a08c78',
  userCount = 77,
  showUserCount = true,
}: ProgressCircleOverlayHTMLProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const progressPathRef = useRef<SVGCircleElement>(null);
  const indicatorRef = useRef<SVGCircleElement>(null);
  const labelRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const markerRefs = useRef<Map<number, SVGLineElement>>(new Map());

  // Previous values for change detection
  const prevPhaseRef = useRef<number>(-1);
  const currentRadiusRef = useRef<number>(baseRadius);

  // SVG viewBox size (centered at 0,0)
  const viewBoxSize = 100;
  const svgRadius = 35; // Base radius in SVG units
  const circumference = 2 * Math.PI * svgRadius;

  // RAF animation loop
  useEffect(() => {
    let animationId: number;
    let lastTime = 0;

    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: RAF animation loop updates multiple visual elements (scale, progress arc, indicator, phase labels) - all tightly coupled for smooth 60fps animation
    const updateAnimation = (time: number) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      const now = Date.now() / 1000;
      const cycleTime = now % BREATH_TOTAL_CYCLE;
      const { phaseIndex, phaseProgress, accumulatedTime, phaseDuration } =
        calculatePhaseInfo(cycleTime);

      // Calculate overall cycle progress (0-1)
      const cycleProgress = (accumulatedTime + phaseProgress * phaseDuration) / BREATH_TOTAL_CYCLE;

      // Calculate breathPhase (0 = exhaled/small, 1 = inhaled/large)
      // Phase 0 (Inhale): 0 → 1
      // Phase 1 (Hold-in): stays at 1
      // Phase 2 (Exhale): 1 → 0
      // Phase 3 (Hold-out): stays at 0
      let breathPhase: number;
      switch (phaseIndex) {
        case 0: // Inhale - expand from 0 to 1
          breathPhase = phaseProgress;
          break;
        case 1: // Hold-in - stay at 1
          breathPhase = 1;
          break;
        case 2: // Exhale - contract from 1 to 0
          breathPhase = 1 - phaseProgress;
          break;
        default: // Hold-out (phase 3) or unknown - stay at 0
          breathPhase = 0;
          break;
      }

      // ========== BREATHING SCALE ANIMATION ==========
      // breathPhase: 0 = exhaled (small), 1 = inhaled (large)
      const targetRadius = baseRadius + (expandedRadius - baseRadius) * breathPhase;

      // Smooth interpolation
      const lerpSpeed = 4.0;
      currentRadiusRef.current +=
        (targetRadius - currentRadiusRef.current) * Math.min(1, delta * lerpSpeed);

      const scale = currentRadiusRef.current / baseRadius;

      // Apply scale to container
      if (containerRef.current) {
        containerRef.current.style.transform = `translate(-50%, -50%) scale(${scale})`;
      }

      // ========== PROGRESS ARC ==========
      if (progressPathRef.current) {
        // strokeDashoffset: circumference = 0%, 0 = 100%
        const dashOffset = circumference * (1 - cycleProgress);
        progressPathRef.current.style.strokeDashoffset = String(dashOffset);

        // Opacity pulse with breathing
        const opacity = 0.5 + breathPhase * 0.4;
        progressPathRef.current.style.opacity = String(opacity * 0.85);
      }

      // ========== INDICATOR POSITION ==========
      if (indicatorRef.current) {
        // Convert progress to angle (start at top, go clockwise)
        const angleRad = -Math.PI / 2 + cycleProgress * Math.PI * 2;
        const indicatorX = viewBoxSize / 2 + Math.cos(angleRad) * svgRadius;
        const indicatorY = viewBoxSize / 2 + Math.sin(angleRad) * svgRadius;
        indicatorRef.current.setAttribute('cx', String(indicatorX));
        indicatorRef.current.setAttribute('cy', String(indicatorY));
      }

      // ========== PHASE LABELS & MARKERS ==========
      const isPhaseChanged = phaseIndex !== prevPhaseRef.current;
      if (isPhaseChanged) {
        prevPhaseRef.current = phaseIndex;

        // Update label styles
        for (const label of PHASE_LABELS) {
          const labelEl = labelRefs.current.get(label.phaseIndex);
          const markerEl = markerRefs.current.get(label.phaseIndex);
          const isActive = phaseIndex === label.phaseIndex;

          if (labelEl) {
            labelEl.style.color = isActive ? progressColor : mutedColor;
            labelEl.style.fontSize = isActive ? '0.75rem' : '0.6rem';
            labelEl.style.fontWeight = isActive ? '600' : '400';
            labelEl.style.opacity = isActive ? '1' : '0.6';
          }

          if (markerEl) {
            markerEl.style.stroke = isActive ? progressColor : mutedColor;
            markerEl.style.strokeWidth = isActive ? '3' : '2';
            markerEl.style.opacity = isActive ? '0.9' : '0.4';
          }
        }
      }

      animationId = requestAnimationFrame(updateAnimation);
    };

    animationId = requestAnimationFrame(updateAnimation);
    return () => cancelAnimationFrame(animationId);
  }, [baseRadius, expandedRadius, progressColor, mutedColor, circumference]);

  // Calculate label positions (in percentage from center)
  const labelRadius = 52; // Percentage from center

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: `${baseRadius * 2}vmin`,
        height: `${baseRadius * 2}vmin`,
        pointerEvents: 'none',
        zIndex: Z_INDEX.overlay - 1,
        willChange: 'transform',
      }}
    >
      {/* SVG Ring */}
      <svg
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
        aria-label="Breathing progress indicator"
        role="img"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          overflow: 'visible',
        }}
      >
        {/* Background ring (track) */}
        <circle
          cx={viewBoxSize / 2}
          cy={viewBoxSize / 2}
          r={svgRadius}
          fill="none"
          stroke={mutedColor}
          strokeWidth={strokeWidth}
          opacity={0.15}
        />

        {/* Progress arc */}
        <circle
          ref={progressPathRef}
          cx={viewBoxSize / 2}
          cy={viewBoxSize / 2}
          r={svgRadius}
          fill="none"
          stroke={progressColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: 'center',
            transition: 'stroke-dashoffset 0.1s ease-out',
          }}
        />

        {/* Progress indicator dot */}
        <circle
          ref={indicatorRef}
          cx={viewBoxSize / 2}
          cy={viewBoxSize / 2 - svgRadius}
          r={strokeWidth * 1.5}
          fill={progressColor}
          opacity={0.95}
        />

        {/* Phase markers (tick lines) */}
        {PHASE_LABELS.map((label) => {
          const angleRad = (-90 + label.angleDeg) * (Math.PI / 180);
          const innerR = svgRadius + strokeWidth / 2 + 1;
          const outerR = svgRadius + strokeWidth / 2 + 5;

          const x1 = viewBoxSize / 2 + Math.cos(angleRad) * innerR;
          const y1 = viewBoxSize / 2 + Math.sin(angleRad) * innerR;
          const x2 = viewBoxSize / 2 + Math.cos(angleRad) * outerR;
          const y2 = viewBoxSize / 2 + Math.sin(angleRad) * outerR;

          return (
            <line
              key={`marker-${label.phaseIndex}`}
              ref={(el) => {
                if (el) markerRefs.current.set(label.phaseIndex, el);
              }}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={mutedColor}
              strokeWidth={2}
              strokeLinecap="round"
              opacity={0.4}
            />
          );
        })}
      </svg>

      {/* Phase labels (HTML for better text rendering) */}
      {PHASE_LABELS.map((label) => {
        const angleRad = (-90 + label.angleDeg) * (Math.PI / 180);
        const x = 50 + Math.cos(angleRad) * labelRadius;
        const y = 50 + Math.sin(angleRad) * labelRadius;

        return (
          <div
            key={`label-${label.phaseIndex}`}
            ref={(el) => {
              if (el) labelRefs.current.set(label.phaseIndex, el);
            }}
            style={{
              position: 'absolute',
              left: `${x}%`,
              top: `${y}%`,
              transform: 'translate(-50%, -50%)',
              fontSize: '0.6rem',
              fontFamily: "'DM Sans', system-ui, sans-serif",
              fontWeight: 400,
              letterSpacing: '0.06em',
              color: mutedColor,
              opacity: 0.6,
              textTransform: 'capitalize',
              whiteSpace: 'nowrap',
              transition: 'color 0.3s ease, font-size 0.3s ease, opacity 0.3s ease',
            }}
          >
            {label.name}
          </div>
        );
      })}

      {/* Center text - user count */}
      {showUserCount && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '0.7rem',
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontWeight: 400,
            letterSpacing: '0.04em',
            color: mutedColor,
            opacity: 0.8,
            whiteSpace: 'nowrap',
          }}
        >
          {userCount} breathing
        </div>
      )}
    </div>
  );
}

export default ProgressCircleOverlayHTML;
