/**
 * MainMenuScreen Component
 * Central hub for navigating the Gaia app
 */

import type { MoodId } from '../constants';
import { useAppNavigation } from '../contexts/appNavigation';
import { useSettings } from '../hooks/useSettings';
import { getMonumentValleyMoodColor } from '../lib/colors';
import { borderRadius, colors, spacing, typography } from '../styles/designTokens';
import { MenuButton, Panel } from './ui';

/**
 * Mood display names
 */
const MOOD_LABELS: Record<MoodId, string> = {
  moment: 'Present',
  anxious: 'Seeking Calm',
  processing: 'Processing',
  preparing: 'Preparing',
  grateful: 'Grateful',
  celebrating: 'Celebrating',
  here: 'Just Here',
};

export function MainMenuScreen() {
  const { navigate } = useAppNavigation();
  const { settings } = useSettings();

  const greeting = getGreeting();
  const displayName = settings.name || 'Traveler';
  const moodColor = getMonumentValleyMoodColor(settings.preferredMood);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: `linear-gradient(180deg, ${colors.background} 0%, ${colors.backgroundDark} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing['2xl'],
        fontFamily: typography.fontFamily,
        color: colors.text,
        zIndex: 100,
      }}
    >
      {/* Header */}
      <div
        style={{
          position: 'absolute',
          top: spacing['2xl'],
          left: spacing['2xl'],
          right: spacing['2xl'],
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        {/* Title */}
        <div>
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
            }}
          >
            Gaia Breathing
          </h1>
        </div>

        {/* Settings button */}
        <MenuButton onClick={() => navigate('settings')} variant="ghost" size="sm">
          <SettingsIcon />
        </MenuButton>
      </div>

      {/* Main content */}
      <Panel
        variant="glassDark"
        padding="xl"
        style={{
          maxWidth: '400px',
          width: '100%',
          textAlign: 'center',
        }}
      >
        {/* Greeting */}
        <div style={{ marginBottom: spacing['2xl'] }}>
          <div
            style={{
              fontSize: typography.fontSize.sm,
              color: colors.textDim,
              marginBottom: spacing.sm,
            }}
          >
            {greeting}
          </div>
          <h2
            style={{
              fontSize: typography.fontSize['2xl'],
              fontWeight: typography.fontWeight.light,
              letterSpacing: typography.letterSpacing.wide,
              margin: 0,
            }}
          >
            {displayName}
          </h2>
        </div>

        {/* Current mood indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.sm,
            marginBottom: spacing['2xl'],
            padding: spacing.md,
            background: colors.glass,
            borderRadius: borderRadius.lg,
          }}
        >
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: moodColor,
              boxShadow: `0 0 8px ${moodColor}40`,
            }}
          />
          <span
            style={{
              fontSize: typography.fontSize.sm,
              textTransform: 'uppercase',
              letterSpacing: typography.letterSpacing.wide,
            }}
          >
            {MOOD_LABELS[settings.preferredMood]}
          </span>
        </div>

        {/* Main action button */}
        <MenuButton onClick={() => navigate('breathing')} variant="primary" size="lg" fullWidth>
          Begin Session
        </MenuButton>

        {/* Stats */}
        {settings.stats.totalSessions > 0 && (
          <div
            style={{
              marginTop: spacing.xl,
              paddingTop: spacing.lg,
              borderTop: `1px solid ${colors.border}`,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: spacing.lg,
            }}
          >
            <StatItem label="Sessions" value={settings.stats.totalSessions.toString()} />
            <StatItem label="Minutes" value={settings.stats.totalMinutes.toString()} />
          </div>
        )}
      </Panel>

      {/* Bottom navigation */}
      <div
        style={{
          position: 'absolute',
          bottom: spacing['2xl'],
          display: 'flex',
          gap: spacing.lg,
        }}
      >
        <MenuButton onClick={() => navigate('settings')} variant="secondary" size="sm">
          Settings
        </MenuButton>
      </div>
    </div>
  );
}

// Stat item component
function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div
        style={{
          fontSize: typography.fontSize.xl,
          fontWeight: typography.fontWeight.light,
          color: colors.accent,
          marginBottom: spacing.xs,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: typography.fontSize.xs,
          textTransform: 'uppercase',
          letterSpacing: typography.letterSpacing.wider,
          color: colors.textDim,
        }}
      >
        {label}
      </div>
    </div>
  );
}

// Settings icon
function SettingsIcon() {
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
      <title>Settings</title>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

// Get time-based greeting
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'Deep in the night';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}
