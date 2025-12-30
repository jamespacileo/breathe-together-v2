/**
 * SessionOverlay Component
 * Minimal in-session overlay with menu access and session controls
 */

import { useEffect, useState } from 'react';
import { useAppNavigation } from '../contexts/appNavigation';
import { useSettings } from '../hooks/useSettings';
import {
  borderRadius,
  colors,
  shadows,
  spacing,
  transitions,
  typography,
} from '../styles/designTokens';
import { MenuButton, Panel } from './ui';

export function SessionOverlay() {
  const { navigate } = useAppNavigation();
  const { recordSession } = useSettings();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [sessionStartTime] = useState(Date.now());

  // Focus mode: fade out UI after inactivity
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const resetInactivity = () => {
      setIsVisible(true);
      clearTimeout(timeout);
      if (!isMenuOpen) {
        timeout = setTimeout(() => setIsVisible(false), 5000);
      }
    };

    window.addEventListener('mousemove', resetInactivity);
    window.addEventListener('mousedown', resetInactivity);
    window.addEventListener('keydown', resetInactivity);
    window.addEventListener('touchstart', resetInactivity);

    resetInactivity();

    return () => {
      window.removeEventListener('mousemove', resetInactivity);
      window.removeEventListener('mousedown', resetInactivity);
      window.removeEventListener('keydown', resetInactivity);
      window.removeEventListener('touchstart', resetInactivity);
      clearTimeout(timeout);
    };
  }, [isMenuOpen]);

  const handleEndSession = () => {
    // Record session duration
    const durationMinutes = Math.round((Date.now() - sessionStartTime) / 60000);
    if (durationMinutes > 0) {
      recordSession(durationMinutes);
    }
    navigate('main-menu');
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        fontFamily: typography.fontFamily,
        zIndex: 100,
        opacity: isVisible ? 1 : 0,
        transition: `opacity ${transitions.slower}`,
      }}
    >
      {/* Top-left: Title */}
      <div
        style={{
          position: 'absolute',
          top: spacing['2xl'],
          left: spacing['2xl'],
          pointerEvents: 'auto',
        }}
      >
        <div
          style={{
            fontSize: typography.fontSize.xs,
            letterSpacing: typography.letterSpacing.widest,
            textTransform: 'uppercase',
            color: colors.textDim,
            marginBottom: spacing.xs,
          }}
        >
          Digital Artifact / 002
        </div>
        <h1
          style={{
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.light,
            letterSpacing: typography.letterSpacing.wide,
            textTransform: 'uppercase',
            margin: 0,
            color: colors.text,
          }}
        >
          Gaia Breathing
        </h1>
      </div>

      {/* Top-right: Menu button */}
      <div
        style={{
          position: 'absolute',
          top: spacing['2xl'],
          right: spacing['2xl'],
          pointerEvents: 'auto',
        }}
      >
        <button
          type="button"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          style={{
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: colors.glass,
            backdropFilter: 'blur(20px)',
            border: `1px solid ${colors.border}`,
            borderRadius: borderRadius.lg,
            cursor: 'pointer',
            transition: transitions.normal,
            color: colors.text,
          }}
        >
          {isMenuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      {/* Session menu popup */}
      {isMenuOpen && (
        <div
          style={{
            position: 'absolute',
            top: spacing['2xl'],
            right: spacing['2xl'],
            marginTop: '50px',
            pointerEvents: 'auto',
          }}
        >
          <Panel
            variant="glassDark"
            padding="lg"
            style={{
              minWidth: '200px',
              boxShadow: shadows.lg,
            }}
          >
            <div
              style={{
                fontSize: typography.fontSize.xs,
                fontWeight: typography.fontWeight.semibold,
                textTransform: 'uppercase',
                letterSpacing: typography.letterSpacing.wider,
                color: colors.textDim,
                marginBottom: spacing.md,
              }}
            >
              Session Menu
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
              <MenuButton
                onClick={() => {
                  setIsMenuOpen(false);
                  navigate('settings');
                }}
                variant="ghost"
                fullWidth
              >
                Settings
              </MenuButton>
              <MenuButton onClick={handleEndSession} variant="secondary" fullWidth>
                End Session
              </MenuButton>
            </div>
          </Panel>
        </div>
      )}

      {/* Click outside to close menu */}
      {isMenuOpen && (
        <button
          type="button"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'auto',
            background: 'transparent',
            border: 'none',
            cursor: 'default',
          }}
          onClick={() => setIsMenuOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setIsMenuOpen(false)}
          aria-label="Close menu"
        />
      )}
    </div>
  );
}

// Menu Icon
function MenuIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <title>Menu</title>
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

// Close Icon
function CloseIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <title>Close</title>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
