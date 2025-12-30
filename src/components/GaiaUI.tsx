import { MONUMENT_VALLEY_PALETTE } from '../lib/colors';

interface GaiaUIProps {
  harmony: number;
  setHarmony: (v: number) => void;
  refraction: number;
  setRefraction: (v: number) => void;
  breath: number;
  setBreath: (v: number) => void;
  expansion: number;
  setExpansion: (v: number) => void;
}

/**
 * GaiaUI - Minimalistic premium overlay.
 *
 * Features:
 * - Upper-left title: ARTIFACTS // GAIA
 * - Lower-right controls: Harmony, Refraction, Breath, Space
 * - Bottom legend: Joy, Peace, Solitude, Love
 */
export function GaiaUI({
  harmony,
  setHarmony,
  refraction,
  setRefraction,
  breath,
  setBreath,
  expansion,
  setExpansion,
}: GaiaUIProps) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        color: '#5b5b5b',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        zIndex: 100,
      }}
    >
      {/* Title */}
      <div
        style={{
          position: 'absolute',
          top: '30px',
          left: '30px',
        }}
      >
        <h1
          style={{
            fontSize: '0.9rem',
            fontWeight: 500,
            margin: 0,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            opacity: 0.6,
            color: '#8c7b6c',
          }}
        >
          Artifacts {/* Gaia */}
        </h1>
      </div>

      {/* Controls */}
      <div
        style={{
          position: 'absolute',
          bottom: '30px',
          right: '30px',
          background: 'rgba(255, 255, 255, 0.6)',
          padding: '24px',
          borderRadius: '16px',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.8)',
          fontSize: '0.75rem',
          pointerEvents: 'auto',
          width: '220px',
          boxShadow: '0 20px 50px rgba(138, 131, 124, 0.1)',
        }}
      >
        <div style={{ marginBottom: '18px' }}>
          <label
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px',
              opacity: 0.8,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontWeight: 600,
              color: '#8c7b6c',
            }}
          >
            <span>Harmony</span> <span>{harmony}</span>
          </label>
          <input
            type="range"
            min="10"
            max="600"
            step="10"
            value={harmony}
            onChange={(e) => setHarmony(parseInt(e.target.value, 10))}
            style={{ width: '100%', accentColor: '#8c7b6c' }}
          />
        </div>

        <div style={{ marginBottom: '18px' }}>
          <label
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px',
              opacity: 0.8,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontWeight: 600,
              color: '#8c7b6c',
            }}
          >
            <span>Refraction</span>
          </label>
          <input
            type="range"
            min="1.0"
            max="2.0"
            step="0.01"
            value={refraction}
            onChange={(e) => setRefraction(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#8c7b6c' }}
          />
        </div>

        <div style={{ marginBottom: '18px' }}>
          <label
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px',
              opacity: 0.8,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontWeight: 600,
              color: '#8c7b6c',
            }}
          >
            <span>Breath</span>
          </label>
          <input
            type="range"
            min="0.05"
            max="1.5"
            step="0.05"
            value={breath}
            onChange={(e) => setBreath(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#8c7b6c' }}
          />
        </div>

        <div style={{ marginBottom: '18px' }}>
          <label
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px',
              opacity: 0.8,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontWeight: 600,
              color: '#8c7b6c',
            }}
          >
            <span>Space</span>
          </label>
          <input
            type="range"
            min="0.5"
            max="5.0"
            step="0.1"
            value={expansion}
            onChange={(e) => setExpansion(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#8c7b6c' }}
          />
        </div>

        {/* Legend */}
        <div
          style={{
            marginTop: '20px',
            paddingTop: '15px',
            borderTop: '1px solid rgba(140, 123, 108, 0.1)',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
            fontSize: '0.65rem',
            opacity: 0.9,
            color: '#8c7b6c',
            fontWeight: 500,
            letterSpacing: '0.05em',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: MONUMENT_VALLEY_PALETTE.joy,
              }}
            ></div>{' '}
            Joy
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: MONUMENT_VALLEY_PALETTE.peace,
              }}
            ></div>{' '}
            Peace
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: MONUMENT_VALLEY_PALETTE.solitude,
              }}
            ></div>{' '}
            Solitude
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: MONUMENT_VALLEY_PALETTE.love,
              }}
            ></div>{' '}
            Love
          </span>
        </div>
      </div>
    </div>
  );
}
