/**
 * OrbitalGauges - Floating holographic data windows (HTML overlay)
 *
 * Features:
 * - Glassmorphism panels flanking the globe
 * - Real-time sync score display
 * - User count with mood breakdown
 * - Orbit radius visualization
 * - Holographic HUD aesthetic with neon accents
 *
 * Uses HTML/CSS overlay (not 3D) for crisp text rendering and accessibility.
 * Positioned using absolute positioning relative to viewport center.
 */

import { useCallback, useEffect, useRef } from 'react';
import { BREATH_TOTAL_CYCLE } from '../../constants';
import { getResponsiveFontSize, getResponsiveSpacing, useViewport } from '../../hooks/useViewport';
import { calculatePhaseInfo } from '../../lib/breathPhase';
import { PHASE_NAMES } from '../../styles/designTokens';

interface OrbitalGaugesProps {
  /** Current user count */
  userCount?: number;
  /** Current orbit radius */
  orbitRadius?: number;
  /** Enable gauges @default true */
  enabled?: boolean;
  /** Mood distribution (for future use) */
  moodDistribution?: Record<string, number>;
}

/**
 * Holographic gauge panel styles
 */
const panelStyle: React.CSSProperties = {
  background: 'rgba(252, 250, 246, 0.08)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(140, 200, 190, 0.2)',
  borderRadius: '16px',
  padding: '16px 20px',
  color: 'rgba(255, 255, 255, 0.9)',
  fontFamily: "'DM Sans', system-ui, sans-serif",
  boxShadow: `
    0 0 30px rgba(92, 179, 168, 0.1),
    inset 0 0 20px rgba(255, 255, 255, 0.03)
  `,
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.6rem',
  fontWeight: 500,
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  color: 'rgba(140, 200, 190, 0.8)',
  marginBottom: '6px',
};

const valueStyle: React.CSSProperties = {
  fontSize: '1.4rem',
  fontWeight: 300,
  letterSpacing: '0.05em',
  color: 'rgba(255, 255, 255, 0.95)',
  textShadow: '0 0 20px rgba(92, 179, 168, 0.5)',
};

const unitStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  fontWeight: 400,
  color: 'rgba(200, 180, 160, 0.7)',
  marginLeft: '4px',
};

/**
 * Calculate sync score based on how well users are following the rhythm
 * For now, returns a simulated score based on user count
 */
function calculateSyncScore(userCount: number, breathProgress: number): number {
  // Higher user count = better perceived sync (in reality would use heartbeat data)
  const baseScore = Math.min(userCount * 5, 80);
  // Add breath-phase variation for visual interest
  const breathBonus = Math.sin(breathProgress * Math.PI * 2) * 10 + 10;
  return Math.round(Math.min(baseScore + breathBonus, 100));
}

/**
 * OrbitalGauges - Renders floating holographic data panels
 */
export function OrbitalGauges({
  userCount = 1,
  orbitRadius = 4.0,
  enabled = true,
  moodDistribution: _moodDistribution,
}: OrbitalGaugesProps) {
  const { deviceType, isMobile } = useViewport();
  // Using refs for RAF updates, not React state (avoids re-renders)
  const phaseRef = useRef<HTMLSpanElement>(null);
  const syncRef = useRef<HTMLSpanElement>(null);

  // Responsive spacing
  const edgePadding = getResponsiveSpacing(deviceType, 16, 24, 32);
  const fontSize = getResponsiveFontSize(deviceType, 0.85, 1, 1.1);

  // RAF loop for smooth updates
  useEffect(() => {
    if (!enabled) return;

    let animationId: number;

    const update = () => {
      const now = Date.now() / 1000;
      const cycleTime = now % BREATH_TOTAL_CYCLE;
      const { phaseIndex, phaseProgress, accumulatedTime, phaseDuration } =
        calculatePhaseInfo(cycleTime);

      // Calculate overall cycle progress
      const phaseTime = phaseProgress * phaseDuration;
      const cycleProgress = (accumulatedTime + phaseTime) / BREATH_TOTAL_CYCLE;

      // Update sync score
      const score = calculateSyncScore(userCount, cycleProgress);
      if (syncRef.current) {
        syncRef.current.textContent = `${score}`;
      }

      // Update phase name
      if (phaseRef.current) {
        phaseRef.current.textContent = PHASE_NAMES[phaseIndex] ?? 'Breathe';
      }

      animationId = requestAnimationFrame(update);
    };

    update();
    return () => cancelAnimationFrame(animationId);
  }, [enabled, userCount]);

  // Memoized stop propagation
  const stopPropagation = useCallback((e: React.PointerEvent | React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  if (!enabled) return null;

  // Hide on mobile to reduce visual clutter
  if (isMobile) return null;

  return (
    <>
      {/* Left Panel - Sync Score */}
      <div
        className="orbital-gauge-left"
        style={{
          position: 'absolute',
          left: `${edgePadding + 8}px`,
          top: '50%',
          transform: 'translateY(-50%)',
          ...panelStyle,
          opacity: 0.9,
          transition: 'opacity 0.3s ease',
        }}
        onPointerDown={stopPropagation}
      >
        <div style={labelStyle}>Sync Score</div>
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <span ref={syncRef} style={{ ...valueStyle, fontSize: `${1.6 * fontSize}rem` }}>
            0
          </span>
          <span style={unitStyle}>%</span>
        </div>

        <div
          style={{
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: '1px solid rgba(140, 200, 190, 0.15)',
          }}
        >
          <div style={labelStyle}>Phase</div>
          <span ref={phaseRef} style={{ ...valueStyle, fontSize: `${fontSize}rem` }}>
            Inhale
          </span>
        </div>
      </div>

      {/* Right Panel - Presence Data */}
      <div
        className="orbital-gauge-right"
        style={{
          position: 'absolute',
          right: `${edgePadding + 8}px`,
          top: '50%',
          transform: 'translateY(-50%)',
          ...panelStyle,
          opacity: 0.9,
          transition: 'opacity 0.3s ease',
        }}
        onPointerDown={stopPropagation}
      >
        <div style={labelStyle}>Breathing Together</div>
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <span style={{ ...valueStyle, fontSize: `${1.6 * fontSize}rem` }}>{userCount}</span>
          <span style={unitStyle}>souls</span>
        </div>

        <div
          style={{
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: '1px solid rgba(140, 200, 190, 0.15)',
          }}
        >
          <div style={labelStyle}>Orbit Radius</div>
          <div style={{ display: 'flex', alignItems: 'baseline' }}>
            <span style={{ ...valueStyle, fontSize: `${fontSize}rem` }}>
              {orbitRadius.toFixed(1)}
            </span>
            <span style={unitStyle}>units</span>
          </div>
        </div>

        {/* Mini visualization - orbit indicator */}
        <div
          style={{
            marginTop: '12px',
            height: '4px',
            background: 'rgba(140, 200, 190, 0.2)',
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${((orbitRadius - 2.5) / 3.5) * 100}%`,
              height: '100%',
              background:
                'linear-gradient(90deg, rgba(92, 179, 168, 0.6), rgba(201, 160, 108, 0.6))',
              borderRadius: '2px',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>
    </>
  );
}

export default OrbitalGauges;
