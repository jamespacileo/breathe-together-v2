import { type CSSProperties, useCallback, useState } from 'react';
import {
  SessionCompleteModal,
  type SessionConfig,
  type SessionStats,
  SettingsPanel,
  type SettingsState,
  TitleCard,
  WelcomeModal,
} from './components';

/**
 * Overlay container style - positions UI layer above 3D canvas
 * Uses pointer-events: none on container so canvas remains interactive,
 * child components set pointer-events: auto on their interactive areas.
 */
const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 100, // Above canvas
  pointerEvents: 'none',
};

export interface GaiaUIOverlayProps {
  /** Show welcome modal on first load */
  showWelcome?: boolean;
  /** Current user count for display */
  userCount?: number;
  /** Called when session starts */
  onSessionStart?: (config: SessionConfig) => void;
  /** Called when settings change */
  onSettingsChange?: (settings: SettingsState) => void;
}

const DEFAULT_SETTINGS: SettingsState = {
  harmony: 200,
  refraction: 1.5,
  breath: 0.5,
  expansion: 2.0,
  audioEnabled: false,
  hapticsEnabled: false,
};

/**
 * GaiaUIOverlay - Main UI overlay component
 *
 * Combines all DOM-based UI elements:
 * - Title card (upper left)
 * - Settings panel (bottom right)
 * - Welcome modal (on first load)
 * - Session complete modal (after session ends)
 */
export function GaiaUIOverlay({
  showWelcome = false,
  userCount = 0,
  onSessionStart,
  onSettingsChange,
}: GaiaUIOverlayProps) {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [welcomeOpen, setWelcomeOpen] = useState(showWelcome);
  const [sessionActive, setSessionActive] = useState(!showWelcome);
  const [sessionCompleteOpen, setSessionCompleteOpen] = useState(false);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);

  const handleSettingsChange = useCallback(
    (changes: Partial<SettingsState>) => {
      const newSettings = { ...settings, ...changes };
      setSettings(newSettings);
      onSettingsChange?.(newSettings);
    },
    [settings, onSettingsChange],
  );

  const handleSessionStart = useCallback(
    (config: SessionConfig) => {
      setWelcomeOpen(false);
      setSessionActive(true);
      onSessionStart?.(config);
    },
    [onSessionStart],
  );

  // Reserved for future use when session timer completes
  const _handleSessionComplete = useCallback((stats: SessionStats) => {
    setSessionActive(false);
    setSessionStats(stats);
    setSessionCompleteOpen(true);
  }, []);

  const handleNewSession = useCallback(() => {
    setSessionCompleteOpen(false);
    setWelcomeOpen(true);
  }, []);

  const handleCloseComplete = useCallback(() => {
    setSessionCompleteOpen(false);
    setSessionActive(true);
  }, []);

  return (
    <div style={overlayStyle}>
      {/* Title Card - always visible */}
      <TitleCard />

      {/* Settings Panel - visible during active session */}
      {sessionActive && (
        <SettingsPanel settings={settings} onSettingsChange={handleSettingsChange} />
      )}

      {/* Welcome Modal */}
      <WelcomeModal open={welcomeOpen} onStart={handleSessionStart} userCount={userCount} />

      {/* Session Complete Modal */}
      {sessionStats && (
        <SessionCompleteModal
          open={sessionCompleteOpen}
          onClose={handleCloseComplete}
          onNewSession={handleNewSession}
          stats={sessionStats}
        />
      )}
    </div>
  );
}

// Export session complete handler for use in parent components
export type { SessionStats, SessionConfig };
