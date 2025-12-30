import { useEffect, useState } from 'react';
import { MONUMENT_VALLEY_PALETTE } from '../lib/colors';

interface GaiaUIProps {
  harmony: number;
  setHarmony: (v: number) => void;
}

export function GaiaUI({ harmony, setHarmony }: GaiaUIProps) {
  const [isControlsOpen, setIsControlsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

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
        style={{
          position: 'absolute',
          top: '40px',
          left: '40px',
          pointerEvents: 'auto',
        }}
      >
        <div style={{ opacity: 0.8 }}>
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
        }}
      >
        {/* Toggle Button */}
        <button
          type="button"
          onClick={() => setIsControlsOpen(!isControlsOpen)}
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

        {/* Controls Panel */}
        <div
          style={{
            background: colors.glass,
            backdropFilter: 'blur(40px)',
            padding: isControlsOpen ? '24px' : '0px',
            borderRadius: '24px',
            border: `1px solid ${isControlsOpen ? colors.border : 'transparent'}`,
            width: '240px',
            maxHeight: isControlsOpen ? '450px' : '0px',
            overflow: 'hidden',
            opacity: isControlsOpen ? 1 : 0,
            transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 20px 50px rgba(138, 131, 124, 0.08)',
          }}
        >
          <div style={{ marginBottom: '20px' }}>
            {/* biome-ignore lint/a11y/noLabelWithoutControl: Input is associated via wrapper structure */}
            <label style={labelStyle}>
              <span>Harmony</span>
              <span style={{ fontWeight: 400 }}>{harmony}</span>
            </label>
            <input
              type="range"
              min="10"
              max="600"
              step="10"
              value={harmony}
              onChange={(e) => setHarmony(parseInt(e.target.value, 10))}
              style={inputStyle}
            />
          </div>

          {/* Mood Legend */}
          <div
            style={{
              marginTop: '10px',
              paddingTop: '20px',
              borderTop: `1px solid ${colors.border}`,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
            }}
          >
            {Object.entries(MONUMENT_VALLEY_PALETTE).map(([name, color]) => (
              <div
                key={name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.6rem',
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
    </div>
  );
}
