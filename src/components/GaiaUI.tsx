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

      // Determine current phase
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

  // Design Tokens
  const colors = {
    text: '#8c7b6c',
    textDim: '#b8a896',
    border: 'rgba(140, 123, 108, 0.15)',
    glass: 'rgba(250, 248, 243, 0.7)',
    accent: '#d4a574',
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
        fontFamily: 'system-ui, -apple-system, sans-serif',
        zIndex: 100,
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 1s ease',
      }}
    >
      {/* Upper-Left: Museum Label Title */}
      <div
        onPointerDown={stopPropagation}
        onTouchStart={stopPropagation}
        style={{
          position: 'absolute',
          top: '40px',
          left: '40px',
          pointerEvents: 'auto',
          opacity: hasEntered ? 0.8 : 0,
          transform: `translateY(${hasEntered ? 0 : -10}px)`,
          transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '0.6rem',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              marginBottom: '4px',
              color: colors.textDim,
            }}
          >
            Digital Artifact / 002
          </div>
          <h1
            style={{
              fontSize: '1.2rem',
              fontWeight: 300,
              margin: 0,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            Gaia <span style={{ fontWeight: 600, opacity: 0.5 }}>{/*  */}</span> Breathing
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
        {/* Toggle Button */}
        <button
          type="button"
          onClick={() => setIsControlsOpen(!isControlsOpen)}
          onPointerDown={stopPropagation}
          onPointerMove={stopPropagation}
          onTouchStart={stopPropagation}
          onTouchMove={stopPropagation}
          style={{
            background: colors.glass,
            border: `1px solid ${colors.border}`,
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '0.65rem',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: colors.text,
            cursor: 'pointer',
            backdropFilter: 'blur(20px)',
            transition: 'all 0.3s ease',
            pointerEvents: 'auto',
          }}
        >
          {isControlsOpen ? 'Close Settings' : 'Tune Aesthetic'}
        </button>

        {/* Controls Panel - stop propagation to prevent scene rotation while dragging sliders */}
        <div
          onPointerDown={stopPropagation}
          onPointerMove={stopPropagation}
          onPointerUp={stopPropagation}
          onTouchStart={stopPropagation}
          onTouchMove={stopPropagation}
          onTouchEnd={stopPropagation}
          style={{
            background: colors.glass,
            backdropFilter: 'blur(40px)',
            padding: isControlsOpen ? '24px' : '0px',
            borderRadius: '24px',
            border: `1px solid ${isControlsOpen ? colors.border : 'transparent'}`,
            width: '260px',
            maxHeight: isControlsOpen ? '600px' : '0px',
            overflow: 'hidden',
            opacity: isControlsOpen ? 1 : 0,
            transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 20px 50px rgba(138, 131, 124, 0.08)',
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
            <div style={{ marginBottom: '14px' }}>
              {/* biome-ignore lint/a11y/noLabelWithoutControl: Input is associated via wrapper structure */}
              <label style={labelStyle}>
                <span>Harmony</span>
                <span style={{ fontWeight: 400 }}>{harmony}</span>
              </label>
              <input
                type="range"
                min="12"
                max="200"
                step="1"
                value={harmony}
                onChange={(e) => setHarmony(parseInt(e.target.value, 10))}
                style={inputStyle}
              />
            </div>

            {/* Shard Size */}
            <div style={{ marginBottom: '14px' }}>
              {/* biome-ignore lint/a11y/noLabelWithoutControl: Input is associated via wrapper structure */}
              <label style={labelStyle}>
                <span>Shard Size</span>
                <span style={{ fontWeight: 400 }}>{shardSize.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min="0.1"
                max="1.2"
                step="0.02"
                value={shardSize}
                onChange={(e) => setShardSize(parseFloat(e.target.value))}
                style={inputStyle}
              />
            </div>

            {/* Orbit Radius */}
            <div>
              {/* biome-ignore lint/a11y/noLabelWithoutControl: Input is associated via wrapper structure */}
              <label style={labelStyle}>
                <span>Orbit</span>
                <span style={{ fontWeight: 400 }}>{orbitRadius.toFixed(1)}</span>
              </label>
              <input
                type="range"
                min="2.0"
                max="8.0"
                step="0.1"
                value={orbitRadius}
                onChange={(e) => setOrbitRadius(parseFloat(e.target.value))}
                style={inputStyle}
              />
            </div>
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
            <div style={{ marginBottom: '14px' }}>
              {/* biome-ignore lint/a11y/noLabelWithoutControl: Input is associated via wrapper structure */}
              <label style={labelStyle}>
                <span>Refraction</span>
                <span style={{ fontWeight: 400 }}>{ior.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min="1.0"
                max="2.5"
                step="0.01"
                value={ior}
                onChange={(e) => setIor(parseFloat(e.target.value))}
                style={inputStyle}
              />
            </div>

            {/* Glass Depth */}
            <div>
              {/* biome-ignore lint/a11y/noLabelWithoutControl: Input is associated via wrapper structure */}
              <label style={labelStyle}>
                <span>Depth</span>
                <span style={{ fontWeight: 400 }}>{glassDepth.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.01"
                value={glassDepth}
                onChange={(e) => setGlassDepth(parseFloat(e.target.value))}
                style={inputStyle}
              />
            </div>
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
            <div>
              {/* biome-ignore lint/a11y/noLabelWithoutControl: Input is associated via wrapper structure */}
              <label style={labelStyle}>
                <span>Density</span>
                <span style={{ fontWeight: 400 }}>{atmosphereDensity}</span>
              </label>
              <input
                type="range"
                min="0"
                max="300"
                step="10"
                value={atmosphereDensity}
                onChange={(e) => setAtmosphereDensity(parseInt(e.target.value, 10))}
                style={inputStyle}
              />
            </div>
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

      {/* Centered Phase Indicator */}
      <div
        style={{
          position: 'absolute',
          bottom: '48px',
          left: '50%',
          transform: `translateX(-50%) translateY(${hasEntered ? 0 : 20}px)`,
          opacity: hasEntered ? 1 : 0,
          transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        {/* Phase Name + Timer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '12px',
          }}
        >
          <span
            ref={phaseNameRef}
            style={{
              fontFamily: "'Cormorant Garamond', 'Georgia', serif",
              fontSize: '1.4rem',
              fontWeight: 300,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: colors.text,
            }}
          >
            Inhale
          </span>
          <span
            ref={timerRef}
            style={{
              fontFamily: "'DM Sans', system-ui, sans-serif",
              fontSize: '1rem',
              fontWeight: 400,
              color: colors.textDim,
              minWidth: '1.2em',
              textAlign: 'center',
            }}
          >
            4
          </span>
        </div>

        {/* Progress Bar */}
        <div
          style={{
            width: '120px',
            height: '2px',
            background: colors.border,
            borderRadius: '1px',
            overflow: 'hidden',
          }}
        >
          <div
            ref={progressRef}
            style={{
              height: '100%',
              width: '0%',
              background: colors.accent,
              borderRadius: '1px',
              transition: 'width 0.05s linear',
            }}
          />
        </div>
      </div>
    </div>
  );
}
