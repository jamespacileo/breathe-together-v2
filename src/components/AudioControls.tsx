/**
 * AudioControls - UI for enabling and controlling audio
 *
 * Simple button that enables audio (required for browser autoplay policy)
 * and provides access to audio settings.
 */

import { useState } from 'react';
import { getNatureSoundIds, useAudio } from '../audio';

interface AudioControlsProps {
  /** Design tokens for consistent styling */
  colors: {
    text: string;
    textDim: string;
    border: string;
    glass: string;
    accent: string;
  };
  /** Common label style */
  labelStyle: React.CSSProperties;
  /** Common input style */
  inputStyle: React.CSSProperties;
  /** Stop propagation handler */
  stopPropagation: (e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => void;
}

export function AudioControls({
  colors,
  labelStyle,
  inputStyle,
  stopPropagation,
}: AudioControlsProps) {
  const { state, setEnabled, setMasterVolume, setNatureSound } = useAudio();
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleAudio = async () => {
    setIsLoading(true);
    try {
      await setEnabled(!state.enabled);
    } finally {
      setIsLoading(false);
    }
  };

  const natureSounds = getNatureSoundIds();

  // Count loaded sounds
  const loadedCount = Object.values(state.loadingStates).filter((s) => s.loaded).length;
  const totalCount = Object.keys(state.loadingStates).length;

  return (
    <div>
      {/* Enable/Disable Button */}
      <button
        type="button"
        onClick={handleToggleAudio}
        onPointerDown={stopPropagation}
        disabled={isLoading}
        style={{
          width: '100%',
          background: state.enabled ? colors.accent : colors.glass,
          border: `1px solid ${colors.border}`,
          padding: '10px 16px',
          borderRadius: '8px',
          fontSize: '0.65rem',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          fontWeight: 500,
          color: state.enabled ? '#fff' : colors.text,
          cursor: isLoading ? 'wait' : 'pointer',
          marginBottom: '14px',
          transition: 'all 0.3s ease',
          opacity: isLoading ? 0.7 : 1,
        }}
      >
        {isLoading
          ? 'Loading...'
          : state.enabled
            ? `Sound On (${loadedCount}/${totalCount})`
            : 'Enable Sound'}
      </button>

      {/* Controls (only show when enabled) */}
      {state.enabled && (
        <>
          {/* Master Volume */}
          <label style={{ marginBottom: '14px', display: 'block' }}>
            <div style={labelStyle}>
              <span>Volume</span>
              <span style={{ fontWeight: 400 }}>{Math.round(state.masterVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={state.masterVolume}
              onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
              onPointerDown={stopPropagation}
              style={inputStyle}
            />
          </label>

          {/* Nature Soundscape */}
          <label style={{ display: 'block' }}>
            <div style={labelStyle}>
              <span>Soundscape</span>
            </div>
            <select
              value={state.natureSound || ''}
              onChange={(e) => setNatureSound(e.target.value || null)}
              onPointerDown={stopPropagation}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: `1px solid ${colors.border}`,
                background: colors.glass,
                color: colors.text,
                fontSize: '0.7rem',
                cursor: 'pointer',
                appearance: 'none',
              }}
            >
              <option value="">None</option>
              {natureSounds.map((id) => {
                const name = id.replace('nature/', '');
                const isLoaded = state.loadingStates[id]?.loaded;
                return (
                  <option key={id} value={id} disabled={!isLoaded}>
                    {name.charAt(0).toUpperCase() + name.slice(1)}
                    {!isLoaded ? ' (missing)' : ''}
                  </option>
                );
              })}
            </select>
          </label>

          {/* Missing sounds notice */}
          {totalCount > 0 && loadedCount < totalCount && (
            <div
              style={{
                marginTop: '12px',
                padding: '8px',
                background: 'rgba(200, 150, 100, 0.1)',
                borderRadius: '6px',
                fontSize: '0.55rem',
                color: colors.textDim,
                lineHeight: 1.4,
              }}
            >
              {totalCount - loadedCount} sound(s) missing.
              <br />
              Check console for details.
            </div>
          )}
        </>
      )}
    </div>
  );
}
