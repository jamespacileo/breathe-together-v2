/**
 * Radial Breathing HUD - Circular progress ring around the breathing sphere
 *
 * Design Philosophy:
 * - Single focal point: All information radiates from center (minimal eye movement)
 * - Breathing metaphor: Circle = lungs expanding/contracting (intuitive)
 * - Minimal visual weight: Ring is delicate, doesn't compete with 3D sphere
 * - Organic feel: Curves and rotation feel natural, not digital
 *
 * Performance:
 * - Direct DOM updates via refs (no React re-renders)
 * - SVG stroke-dashoffset animation for smooth progress
 * - <0.5ms per frame overhead
 */

import { useRef } from 'react';
import { BREATH_TOTAL_CYCLE } from '../constants';
import { useBreathPhaseDisplay } from '../hooks/useBreathPhaseDisplay';
import { usePresence } from '../hooks/usePresence';

export function RadialBreathingHUD() {
  const timerRef = useRef<HTMLDivElement>(null);
  const phaseNameRef = useRef<HTMLDivElement>(null);
  const progressArcRef = useRef<SVGCircleElement>(null);

  useBreathPhaseDisplay({
    timerRef,
    phaseNameRef,
    progressArcRef,
  });

  const { count: userCount } = usePresence();

  const radius = 90;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="radial-hud">
      <svg className="breathing-ring" viewBox="0 0 200 200" aria-hidden="true">
        {/* Background ring (always visible) */}
        <circle
          className="ring-bg"
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="rgba(126, 200, 212, 0.1)"
          strokeWidth="3"
        />

        {/* Progress ring (animates with breath cycle) */}
        <circle
          ref={progressArcRef}
          className="ring-progress"
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="url(#breathGradient)"
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          transform="rotate(-90 100 100)"
        />

        {/* Breathing cycle gradient: teal → cyan → warm sand */}
        <defs>
          <linearGradient id="breathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6ba8a8" />
            <stop offset="50%" stopColor="#4dd9e8" />
            <stop offset="100%" stopColor="#d4a574" />
          </linearGradient>
        </defs>
      </svg>

      {/* Phase name - Inhale | Hold | Exhale | Hold */}
      <div ref={phaseNameRef} className="phase-name">
        Inhale
      </div>

      {/* Timer - Countdown for current phase */}
      <div ref={timerRef} className="timer">
        4
      </div>

      {/* User count - How many people are breathing together */}
      <div className="user-count">{userCount} breathing together</div>

      <style>{`
        .radial-hud {
          position: fixed;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          z-index: 100;
          font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;
        }

        .breathing-ring {
          position: absolute;
          width: 300px;
          height: 300px;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          filter: drop-shadow(0 0 20px rgba(126, 200, 212, 0.1));
        }

        /* Smooth animation for ring progress */
        .ring-progress {
          transition: stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Phase name - positioned above ring */
        .phase-name {
          position: absolute;
          top: calc(50% - 180px);
          font-family: 'Crimson Pro', Georgia, serif;
          font-size: 18px;
          font-weight: 500;
          color: #fffef7;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          opacity: 0;
          animation: phaseNameFade 300ms ease-out forwards;
          text-shadow: 0 0 10px rgba(126, 200, 212, 0.2);
        }

        /* Timer - positioned below ring */
        .timer {
          position: absolute;
          top: calc(50% + 120px);
          font-size: 48px;
          font-weight: 300;
          color: #7ec8d4;
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.02em;
        }

        /* User count - positioned at bottom */
        .user-count {
          position: absolute;
          bottom: 40px;
          font-size: 14px;
          color: #b8a896;
          opacity: 0.7;
          transition: opacity 0.3s ease;
        }

        /* Entrance animation for phase name */
        @keyframes phaseNameFade {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Responsive adjustments for mobile */
        @media (max-width: 768px) {
          .breathing-ring {
            width: 240px;
            height: 240px;
          }

          .phase-name {
            top: calc(50% - 140px);
            font-size: 16px;
          }

          .timer {
            top: calc(50% + 100px);
            font-size: 40px;
          }

          .user-count {
            bottom: 30px;
            font-size: 12px;
          }
        }

        /* Respect prefers-reduced-motion */
        @media (prefers-reduced-motion: reduce) {
          .ring-progress {
            transition: none;
          }

          .phase-name {
            animation: none;
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
