/**
 * Quality Settings UI Component
 *
 * Gear button in bottom-right corner that opens a settings panel
 * Shows FPS, quality level, and allows manual preset selection
 */

import { useEffect, useRef, useState } from 'react';
import { useQuality } from '../contexts/QualityContext';

/**
 * Settings panel with auto-hide on inactivity
 */
export function QualitySettings() {
  const { preset, setPreset, performanceMetrics } = useQuality();
  const [isOpen, setIsOpen] = useState(false);
  const hideTimeoutRef = useRef<number | undefined>(undefined);

  // Auto-hide after 5s of inactivity
  useEffect(() => {
    if (isOpen) {
      if (hideTimeoutRef.current) {
        window.clearTimeout(hideTimeoutRef.current);
      }
      hideTimeoutRef.current = window.setTimeout(() => {
        setIsOpen(false);
      }, 5000);

      return () => {
        if (hideTimeoutRef.current) {
          window.clearTimeout(hideTimeoutRef.current);
        }
      };
    }
  }, [isOpen]);

  const handleMouseEnter = () => {
    if (hideTimeoutRef.current) {
      window.clearTimeout(hideTimeoutRef.current);
    }
  };

  const handleMouseLeave = () => {
    const timeout = window.setTimeout(() => setIsOpen(false), 5000);
    hideTimeoutRef.current = timeout;
  };

  // Handle loading state during initial render
  if (!performanceMetrics) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: 'white',
          cursor: 'pointer',
          fontSize: 24,
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          padding: 0,
          opacity: 0.5,
        }}
        title="Quality Settings (loading)"
        aria-label="Quality Settings"
      >
        ⚙️
      </button>
    );
  }

  return (
    <>
      {/* Gear Icon Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'rgba(0, 0, 0, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: 'white',
          cursor: 'pointer',
          fontSize: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          transition: 'all 0.2s ease',
          padding: 0,
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        title="Quality Settings"
        aria-label="Quality Settings"
      >
        ⚙️
      </button>

      {/* Settings Panel */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: 80,
            right: 20,
            width: 280,
            background: 'rgba(0, 0, 0, 0.9)',
            border: '1px solid rgba(100, 200, 255, 0.3)',
            borderRadius: 8,
            padding: 16,
            color: '#ccc',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: 13,
            zIndex: 1000,
            lineHeight: 1.6,
            backdropFilter: 'blur(4px)',
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Title */}
          <div
            style={{
              fontWeight: 'bold',
              marginBottom: 12,
              fontSize: 14,
              color: '#fff',
            }}
          >
            Quality Settings
          </div>

          {/* Performance Metrics */}
          <div
            style={{
              marginBottom: 16,
              padding: 12,
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: 4,
              fontSize: 12,
            }}
          >
            <div style={{ marginBottom: 8 }}>
              <strong>FPS:</strong> {Math.round(performanceMetrics.averageFPS)}
            </div>
            <div style={{ marginBottom: 8 }}>
              <strong>Quality:</strong>{' '}
              <span
                style={{
                  textTransform: 'capitalize',
                  color:
                    performanceMetrics.qualityLevel === 'high'
                      ? '#51cf66'
                      : performanceMetrics.qualityLevel === 'low'
                        ? '#ff6b6b'
                        : '#ffd43b',
                }}
              >
                {performanceMetrics.qualityLevel}
              </span>
            </div>

            {/* Performance Bar */}
            <div
              style={{
                width: '100%',
                height: 4,
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: 2,
                overflow: 'hidden',
                marginTop: 8,
              }}
            >
              <div
                style={{
                  width: `${performanceMetrics.current * 100}%`,
                  height: '100%',
                  background: performanceMetrics.isThrottling ? '#ff6b6b' : '#51cf66',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>

          {/* Preset Dropdown */}
          <div style={{ marginBottom: 12 }}>
            <label
              htmlFor="preset-select"
              style={{
                display: 'block',
                marginBottom: 6,
                fontSize: 11,
                textTransform: 'uppercase',
                opacity: 0.7,
              }}
            >
              Preset
            </label>
            <select
              id="preset-select"
              value={preset}
              onChange={(e) => setPreset(e.target.value as 'low' | 'medium' | 'high')}
              style={{
                width: '100%',
                padding: '8px 10px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 4,
                color: '#fff',
                fontSize: 12,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <option value="auto">Auto (recommended)</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          {/* Description */}
          <div style={{ fontSize: 11, opacity: 0.6, lineHeight: 1.5 }}>
            {preset === 'auto' && 'Automatically adjusts quality based on frame rate'}
            {preset === 'low' && '100 particles, 32-segment sphere, minimal effects'}
            {preset === 'medium' && '200 particles, 64-segment sphere, full effects'}
            {preset === 'high' && '300 particles, 128-segment sphere, enhanced effects'}
          </div>

          {/* Footer Info */}
          {performanceMetrics.isThrottling && (
            <div
              style={{
                marginTop: 12,
                padding: 8,
                background: 'rgba(255, 107, 107, 0.2)',
                borderRadius: 4,
                fontSize: 11,
                color: '#ff8787',
                borderLeft: '3px solid #ff6b6b',
              }}
            >
              ⚠️ Low FPS detected. Consider lowering quality.
            </div>
          )}
        </div>
      )}
    </>
  );
}
