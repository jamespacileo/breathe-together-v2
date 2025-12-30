import { useEffect, useRef, useState } from 'react';
import { BREATH_PHASES, BREATH_TOTAL_CYCLE } from '../constants';
import { MONUMENT_VALLEY_PALETTE } from '../lib/colors';

// Phase configuration
const PHASE_NAMES = ['Inhale', 'Hold', 'Exhale', 'Hold'] as const;
const PHASE_DURATIONS = [
  BREATH_PHASES.INHALE,
  BREATH_PHASES.HOLD_IN,
  BREATH_PHASES.EXHALE,
  BREATH_PHASES.HOLD_OUT,
];

interface PhaseInfo {
  phaseIndex: number;
  phaseProgress: number;
  accumulatedTime: number;
  phaseDuration: number;
}

/**
 * Calculate current breathing phase from cycle time
 * Extracted to reduce cognitive complexity of the main update loop
 */
function calculatePhaseInfo(cycleTime: number): PhaseInfo {
  let accumulatedTime = 0;
  let phaseIndex = 0;

  for (let i = 0; i < PHASE_DURATIONS.length; i++) {
    const duration = PHASE_DURATIONS[i] ?? 0;
    if (cycleTime < accumulatedTime + duration) {
      phaseIndex = i;
      break;
    }
    accumulatedTime += duration;
  }

  const phaseDuration = PHASE_DURATIONS[phaseIndex] ?? 1;
  const phaseTime = cycleTime - accumulatedTime;
  const phaseProgress = Math.min(1, Math.max(0, phaseTime / phaseDuration));

  return { phaseIndex, phaseProgress, accumulatedTime, phaseDuration };
}

/**
 * Glassmorphism style generator - frosted glass effect
 */
const glassStyle = (opacity = 0.65): React.CSSProperties => ({
  background: `rgba(255, 253, 250, ${opacity})`,
  backdropFilter: 'blur(24px) saturate(1.2)',
  WebkitBackdropFilter: 'blur(24px) saturate(1.2)',
  border: '1px solid rgba(255, 255, 255, 0.25)',
  boxShadow: `
    0 8px 32px rgba(160, 140, 120, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.4),
    inset 0 -1px 0 rgba(160, 140, 120, 0.05)
  `,
});

interface GaiaUIProps {
  /** Particle count (harmony) */
  harmony: number;
  setHarmony: (v: number) => void;
  /** Index of Refraction - controls light bending through glass */
  ior: number;
  setIor: (v: number) => void;
  /** Glass depth - controls backface normal blending/distortion */
  glassDepth: number;
  setGlassDepth: (v: number) => void;
  /** Orbit radius - how far particles orbit from center */
  orbitRadius: number;
  setOrbitRadius: (v: number) => void;
  /** Shard size - maximum size of glass shards */
  shardSize: number;
  setShardSize: (v: number) => void;
  /** Atmosphere density - number of ambient floating particles */
  atmosphereDensity: number;
  setAtmosphereDensity: (v: number) => void;
}

export function GaiaUI({
  harmony,
  setHarmony,
  ior,
  setIor,
  glassDepth,
  setGlassDepth,
  orbitRadius,
  setOrbitRadius,
  shardSize,
  setShardSize,
  atmosphereDensity,
  setAtmosphereDensity,
}: GaiaUIProps) {
  const [isControlsOpen, setIsControlsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [hasEntered, setHasEntered] = useState(false);

  // Phase indicator refs for RAF updates (no React re-renders)
  const phaseNameRef = useRef<HTMLSpanElement>(null);
  const phaseContainerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<HTMLSpanElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  // Entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setHasEntered(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Phase indicator RAF loop (60fps updates without React state)
  useEffect(() => {
    let animationId: number;
    let prevPhase = -1;

    const updatePhase = () => {
      const now = Date.now() / 1000;
      const cycleTime = now % BREATH_TOTAL_CYCLE;
      const { phaseIndex, phaseProgress, accumulatedTime, phaseDuration } =
        calculatePhaseInfo(cycleTime);
      const phaseTime = phaseProgress * phaseDuration;

      // Update phase name on transition
      if (phaseIndex !== prevPhase) {
        prevPhase = phaseIndex;
        if (phaseNameRef.current) {
          phaseNameRef.current.textContent = PHASE_NAMES[phaseIndex] ?? 'Breathe';
        }
      }

      // Update timer (countdown)
      if (timerRef.current) {
        const remaining = Math.ceil((1 - phaseProgress) * phaseDuration);
        timerRef.current.textContent = `${remaining}`;
      }

      // Update progress bar
      if (progressRef.current) {
        const cycleProgress = (accumulatedTime + phaseTime) / BREATH_TOTAL_CYCLE;
        progressRef.current.style.width = `${cycleProgress * 100}%`;
      }

      // === PHASE BREATHING ANIMATION ===
      // Scale and opacity based on breathing phase
      if (phaseContainerRef.current) {
        const isHoldPhase = phaseIndex === 1 || phaseIndex === 3;
        const isInhale = phaseIndex === 0;

        // Calculate breath-responsive scale
        // Inhale: grows 1.0 → 1.15, Exhale: shrinks 1.15 → 1.0, Hold: stays at 1.05
        let scale: number;
        let textOpacity: number;

        if (isHoldPhase) {
          // During hold: subtle pulse, slightly dimmed
          scale = 1.05 + Math.sin(now * 2) * 0.02;
          textOpacity = 0.7;
        } else if (isInhale) {
          // During inhale: grow with breath
          scale = 1.0 + phaseProgress * 0.15;
          textOpacity = 0.8 + phaseProgress * 0.2;
        } else {
          // During exhale: shrink with breath
          scale = 1.15 - phaseProgress * 0.15;
          textOpacity = 1.0 - phaseProgress * 0.2;
        }

        phaseContainerRef.current.style.transform = `translateX(-50%) scale(${scale})`;
        phaseContainerRef.current.style.opacity = `${textOpacity}`;
      }

      animationId = requestAnimationFrame(updatePhase);
    };

    updatePhase();
    return () => cancelAnimationFrame(animationId);
  }, []);

  // Focus Mode: Fade out UI after inactivity
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const resetInactivity = () => {
      setIsVisible(true);
      clearTimeout(timeout);
      // Only fade out if controls are closed
      if (!isControlsOpen) {
        timeout = setTimeout(() => setIsVisible(false), 5000);
      }
    };

    window.addEventListener('mousemove', resetInactivity);
    window.addEventListener('mousedown', resetInactivity);
    window.addEventListener('keydown', resetInactivity);

    resetInactivity();

    return () => {
      window.removeEventListener('mousemove', resetInactivity);
      window.removeEventListener('mousedown', resetInactivity);
      window.removeEventListener('keydown', resetInactivity);
      clearTimeout(timeout);
    };
  }, [isControlsOpen]);

  // Design Tokens - refined warm palette with glassmorphism
  const colors = {
    text: '#6b5d52', // Warm brown text
    textDim: '#9a8a7a', // Warm dim text
    textGlow: '#d4b896', // Subtle warm glow
    border: 'rgba(180, 160, 140, 0.15)', // Warm glass border
    glass: 'rgba(255, 253, 250, 0.55)', // Frosted glass base
    accent: '#c9a06c', // Warm gold accent
    accentGlow: 'rgba(201, 160, 108, 0.35)', // Accent glow
    rimLight: 'rgba(255, 255, 255, 0.4)', // Glass rim highlight
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.65rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.15em',
    color: colors.text,
    marginBottom: '8px',
    display: 'flex',
    justifyContent: 'space-between',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    accentColor: colors.accent,
    cursor: 'pointer',
    height: '4px',
    borderRadius: '2px',
    appearance: 'none',
    background: colors.border,
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: '16px',
    paddingBottom: '16px',
    borderBottom: `1px solid ${colors.border}`,
  };

  // Stop pointer/touch events from propagating to PresentationControls
  const stopPropagation = (e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        color: colors.text,
        fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif",
        zIndex: 100,
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Upper-Left: Museum Label Title - Glassmorphism */}
      <div
        onPointerDown={stopPropagation}
        onTouchStart={stopPropagation}
        style={{
          position: 'absolute',
          top: '32px',
          left: '32px',
          pointerEvents: 'auto',
          opacity: hasEntered ? 1 : 0,
          transform: `translateY(${hasEntered ? 0 : -8}px)`,
          transition: 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}
      >
        <div
          style={{
            ...glassStyle(0.45),
            padding: '14px 20px',
            borderRadius: '16px',
          }}
        >
          <div
            style={{
              fontSize: '0.5rem',
              letterSpacing: '0.35em',
              textTransform: 'uppercase',
              marginBottom: '6px',
              color: colors.textDim,
              fontWeight: 500,
            }}
          >
            Digital Artifact / 002
          </div>
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: '1.1rem',
              fontWeight: 400,
              margin: 0,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: colors.text,
            }}
          >
            Gaia Breathing
          </h1>
        </div>
      </div>

      {/* Bottom-Right: Collapsible Controls */}
      <div
        style={{
          position: 'absolute',
          bottom: '40px',
          right: '40px',
          pointerEvents: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '12px',
          opacity: hasEntered ? 1 : 0,
          transform: `translateY(${hasEntered ? 0 : 10}px)`,
          transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.2s',
        }}
      >
        {/* Toggle Button - Glassmorphism pill */}
        <button
          type="button"
          onClick={() => setIsControlsOpen(!isControlsOpen)}
          onPointerDown={stopPropagation}
          onPointerMove={stopPropagation}
          onTouchStart={stopPropagation}
          onTouchMove={stopPropagation}
          style={{
            ...glassStyle(0.6),
            padding: '10px 20px',
            borderRadius: '24px',
            fontSize: '0.6rem',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            fontWeight: 500,
            color: colors.text,
            cursor: 'pointer',
            transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            pointerEvents: 'auto',
          }}
        >
          {isControlsOpen ? 'Close' : 'Tune'}
        </button>

        {/* Controls Panel - Glassmorphism frosted glass */}
        <div
          onPointerDown={stopPropagation}
          onPointerMove={stopPropagation}
          onPointerUp={stopPropagation}
          onTouchStart={stopPropagation}
          onTouchMove={stopPropagation}
          onTouchEnd={stopPropagation}
          style={{
            ...glassStyle(0.7),
            padding: isControlsOpen ? '24px' : '0px',
            borderRadius: '20px',
            width: '260px',
            maxHeight: isControlsOpen ? '600px' : '0px',
            overflow: 'hidden',
            opacity: isControlsOpen ? 1 : 0,
            transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            border: isControlsOpen
              ? '1px solid rgba(255, 255, 255, 0.25)'
              : '1px solid transparent',
          }}
        >
          {/* === PARTICLES SECTION === */}
          <div style={sectionStyle}>
            <div
              style={{
                fontSize: '0.55rem',
                color: colors.textDim,
                marginBottom: '12px',
                letterSpacing: '0.2em',
              }}
            >
              PARTICLES
            </div>

            {/* Harmony - Particle Count */}
            <label style={{ marginBottom: '14px', display: 'block' }}>
              <div style={labelStyle}>
                <span>Harmony</span>
                <span style={{ fontWeight: 400 }}>{harmony}</span>
              </div>
              <input
                type="range"
                min="12"
                max="200"
                step="1"
                value={harmony}
                onChange={(e) => setHarmony(parseInt(e.target.value, 10))}
                style={inputStyle}
              />
            </label>

            {/* Shard Size */}
            <label style={{ marginBottom: '14px', display: 'block' }}>
              <div style={labelStyle}>
                <span>Shard Size</span>
                <span style={{ fontWeight: 400 }}>{shardSize.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.2"
                step="0.02"
                value={shardSize}
                onChange={(e) => setShardSize(parseFloat(e.target.value))}
                style={inputStyle}
              />
            </label>

            {/* Orbit Radius */}
            <label style={{ display: 'block' }}>
              <div style={labelStyle}>
                <span>Orbit</span>
                <span style={{ fontWeight: 400 }}>{orbitRadius.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="2.0"
                max="8.0"
                step="0.1"
                value={orbitRadius}
                onChange={(e) => setOrbitRadius(parseFloat(e.target.value))}
                style={inputStyle}
              />
            </label>
          </div>

          {/* === GLASS SECTION === */}
          <div style={sectionStyle}>
            <div
              style={{
                fontSize: '0.55rem',
                color: colors.textDim,
                marginBottom: '12px',
                letterSpacing: '0.2em',
              }}
            >
              GLASS
            </div>

            {/* IOR - Index of Refraction */}
            <label style={{ marginBottom: '14px', display: 'block' }}>
              <div style={labelStyle}>
                <span>Refraction</span>
                <span style={{ fontWeight: 400 }}>{ior.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="2.5"
                step="0.01"
                value={ior}
                onChange={(e) => setIor(parseFloat(e.target.value))}
                style={inputStyle}
              />
            </label>

            {/* Glass Depth */}
            <label style={{ display: 'block' }}>
              <div style={labelStyle}>
                <span>Depth</span>
                <span style={{ fontWeight: 400 }}>{glassDepth.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.01"
                value={glassDepth}
                onChange={(e) => setGlassDepth(parseFloat(e.target.value))}
                style={inputStyle}
              />
            </label>
          </div>

          {/* === ATMOSPHERE SECTION === */}
          <div style={{ marginBottom: '16px' }}>
            <div
              style={{
                fontSize: '0.55rem',
                color: colors.textDim,
                marginBottom: '12px',
                letterSpacing: '0.2em',
              }}
            >
              ATMOSPHERE
            </div>

            {/* Atmosphere Density */}
            <label style={{ display: 'block' }}>
              <div style={labelStyle}>
                <span>Density</span>
                <span style={{ fontWeight: 400 }}>{atmosphereDensity}</span>
              </div>
              <input
                type="range"
                min="0"
                max="300"
                step="10"
                value={atmosphereDensity}
                onChange={(e) => setAtmosphereDensity(parseInt(e.target.value, 10))}
                style={inputStyle}
              />
            </label>
          </div>

          {/* Mood Legend */}
          <div
            style={{
              paddingTop: '16px',
              borderTop: `1px solid ${colors.border}`,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
            }}
          >
            {Object.entries(MONUMENT_VALLEY_PALETTE).map(([name, color]) => (
              <div
                key={name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.55rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  opacity: 0.8,
                }}
              >
                <div
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: color,
                  }}
                />
                {name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Centered Phase Indicator - Breathing Animation */}
      <div
        ref={phaseContainerRef}
        style={{
          position: 'absolute',
          bottom: '44px',
          left: '50%',
          transform: `translateX(-50%) translateY(${hasEntered ? 0 : 16}px)`,
          opacity: hasEntered ? 0.9 : 0,
          transition: hasEntered ? 'none' : 'all 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '14px',
          willChange: 'transform, opacity',
        }}
      >
        {/* Phase Name + Timer - with subtle glass pill */}
        <div
          style={{
            ...glassStyle(0.4),
            display: 'flex',
            alignItems: 'baseline',
            gap: '12px',
            padding: '12px 24px',
            borderRadius: '32px',
          }}
        >
          <span
            ref={phaseNameRef}
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: '1.6rem',
              fontWeight: 300,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: colors.text,
              textShadow: `0 2px 16px ${colors.accentGlow}`,
            }}
          >
            Inhale
          </span>
          <span
            ref={timerRef}
            style={{
              fontFamily: "'DM Sans', system-ui, sans-serif",
              fontSize: '1rem',
              fontWeight: 300,
              color: colors.textDim,
              minWidth: '1.2em',
              textAlign: 'center',
              opacity: 0.75,
            }}
          >
            4
          </span>
        </div>

        {/* Progress Bar - edge-anchored full width */}
        <div
          style={{
            width: '120px',
            height: '2px',
            background: 'rgba(180, 160, 140, 0.2)',
            borderRadius: '1px',
            overflow: 'hidden',
            boxShadow: `0 0 12px ${colors.accentGlow}`,
          }}
        >
          <div
            ref={progressRef}
            style={{
              height: '100%',
              width: '0%',
              background: `linear-gradient(90deg, ${colors.accent}, ${colors.textGlow})`,
              borderRadius: '1px',
              transition: 'width 0.08s linear',
              boxShadow: `0 0 8px ${colors.accent}`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
