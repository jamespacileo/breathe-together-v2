/**
 * SettingsScreen Component
 * User preferences and app configuration
 */

import { useState } from 'react';
import type { MoodId } from '../constants';
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
import { MenuButton, MoodSelector, Panel, Slider } from './ui';

type SettingsTab = 'profile' | 'visuals' | 'audio' | 'about';

export function SettingsScreen() {
  const { goBack } = useAppNavigation();
  const { settings, updateSettings, updateVisuals, updateAudio, resetSettings } = useSettings();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'profile', label: 'Profile' },
    { id: 'visuals', label: 'Visuals' },
    { id: 'audio', label: 'Audio' },
    { id: 'about', label: 'About' },
  ];

  const handleReset = () => {
    resetSettings();
    setShowResetConfirm(false);
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: `linear-gradient(180deg, ${colors.background} 0%, ${colors.backgroundDark} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: spacing['2xl'],
        fontFamily: typography.fontFamily,
        color: colors.text,
        zIndex: 100,
        overflow: 'auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          width: '100%',
          maxWidth: '600px',
          display: 'flex',
          alignItems: 'center',
          marginBottom: spacing.xl,
        }}
      >
        <MenuButton onClick={goBack} variant="ghost" size="sm">
          <BackIcon />
        </MenuButton>
        <h1
          style={{
            flex: 1,
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.light,
            letterSpacing: typography.letterSpacing.wide,
            textTransform: 'uppercase',
            margin: 0,
            textAlign: 'center',
          }}
        >
          Settings
        </h1>
        <div style={{ width: '60px' }} /> {/* Spacer for alignment */}
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: spacing.sm,
          marginBottom: spacing.xl,
          padding: spacing.xs,
          background: colors.glass,
          borderRadius: borderRadius.lg,
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: `${spacing.sm} ${spacing.lg}`,
              fontSize: typography.fontSize.xs,
              fontWeight:
                activeTab === tab.id
                  ? typography.fontWeight.semibold
                  : typography.fontWeight.normal,
              textTransform: 'uppercase',
              letterSpacing: typography.letterSpacing.wide,
              background: activeTab === tab.id ? colors.accent : 'transparent',
              color: activeTab === tab.id ? '#fff' : colors.text,
              border: 'none',
              borderRadius: borderRadius.md,
              cursor: 'pointer',
              transition: transitions.fast,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <Panel
        variant="glassDark"
        padding="xl"
        style={{
          maxWidth: '600px',
          width: '100%',
        }}
      >
        {activeTab === 'profile' && (
          <ProfileSettings
            name={settings.name}
            setName={(name) => updateSettings({ name })}
            preferredMood={settings.preferredMood}
            setPreferredMood={(mood) => updateSettings({ preferredMood: mood })}
            stats={settings.stats}
          />
        )}
        {activeTab === 'visuals' && (
          <VisualSettings visuals={settings.visuals} updateVisuals={updateVisuals} />
        )}
        {activeTab === 'audio' && (
          <AudioSettings audio={settings.audio} updateAudio={updateAudio} />
        )}
        {activeTab === 'about' && <AboutSettings />}
      </Panel>

      {/* Reset button */}
      <div style={{ marginTop: spacing.xl }}>
        {!showResetConfirm ? (
          <MenuButton onClick={() => setShowResetConfirm(true)} variant="ghost" size="sm">
            Reset All Settings
          </MenuButton>
        ) : (
          <Panel variant="glass" padding="md" style={{ textAlign: 'center' }}>
            <p
              style={{
                fontSize: typography.fontSize.sm,
                color: colors.text,
                margin: 0,
                marginBottom: spacing.md,
              }}
            >
              Are you sure? This will reset all settings to defaults.
            </p>
            <div style={{ display: 'flex', gap: spacing.sm, justifyContent: 'center' }}>
              <MenuButton onClick={() => setShowResetConfirm(false)} variant="ghost" size="sm">
                Cancel
              </MenuButton>
              <MenuButton onClick={handleReset} variant="primary" size="sm">
                Reset
              </MenuButton>
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}

// Profile Settings
function ProfileSettings({
  name,
  setName,
  preferredMood,
  setPreferredMood,
  stats,
}: {
  name: string;
  setName: (name: string) => void;
  preferredMood: MoodId;
  setPreferredMood: (mood: MoodId) => void;
  stats: { totalSessions: number; totalMinutes: number; lastSessionDate: string | null };
}) {
  return (
    <>
      {/* Name */}
      <div style={{ marginBottom: spacing.xl }}>
        <label
          htmlFor="display-name"
          style={{
            display: 'block',
            fontSize: typography.fontSize.xs,
            fontWeight: typography.fontWeight.semibold,
            textTransform: 'uppercase',
            letterSpacing: typography.letterSpacing.wider,
            color: colors.text,
            marginBottom: spacing.sm,
          }}
        >
          Display Name
        </label>
        <input
          id="display-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name (optional)"
          style={{
            width: '100%',
            padding: spacing.md,
            fontSize: typography.fontSize.base,
            fontFamily: typography.fontFamily,
            background: colors.glass,
            border: `1px solid ${colors.border}`,
            borderRadius: borderRadius.lg,
            color: colors.text,
            outline: 'none',
            transition: transitions.normal,
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Mood */}
      <div style={{ marginBottom: spacing.xl }}>
        <div
          style={{
            display: 'block',
            fontSize: typography.fontSize.xs,
            fontWeight: typography.fontWeight.semibold,
            textTransform: 'uppercase',
            letterSpacing: typography.letterSpacing.wider,
            color: colors.text,
            marginBottom: spacing.md,
          }}
        >
          Default Mood
        </div>
        <MoodSelector
          selectedMood={preferredMood}
          onMoodChange={(mood) => setPreferredMood(mood)}
          layout="list"
        />
      </div>

      {/* Stats */}
      {stats.totalSessions > 0 && (
        <div
          style={{
            paddingTop: spacing.lg,
            borderTop: `1px solid ${colors.border}`,
          }}
        >
          <div
            style={{
              fontSize: typography.fontSize.xs,
              fontWeight: typography.fontWeight.semibold,
              textTransform: 'uppercase',
              letterSpacing: typography.letterSpacing.wider,
              color: colors.text,
              marginBottom: spacing.md,
            }}
          >
            Your Journey
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: spacing.md,
            }}
          >
            <StatCard label="Sessions" value={stats.totalSessions.toString()} />
            <StatCard label="Minutes" value={stats.totalMinutes.toString()} />
            <StatCard
              label="Last Session"
              value={
                stats.lastSessionDate
                  ? new Date(stats.lastSessionDate).toLocaleDateString()
                  : 'Never'
              }
            />
          </div>
        </div>
      )}
    </>
  );
}

// Visual Settings
function VisualSettings({
  visuals,
  updateVisuals,
}: {
  visuals: { harmony: number; refraction: number; breath: number; expansion: number };
  updateVisuals: (updates: Partial<typeof visuals>) => void;
}) {
  return (
    <>
      <Slider
        label="Harmony"
        value={visuals.harmony}
        onChange={(v) => updateVisuals({ harmony: v })}
        min={10}
        max={600}
        step={10}
        formatValue={(v) => v.toString()}
      />
      <Slider
        label="Refraction"
        value={visuals.refraction}
        onChange={(v) => updateVisuals({ refraction: v })}
        min={1.0}
        max={2.0}
        step={0.01}
        formatValue={(v) => v.toFixed(2)}
      />
      <Slider
        label="Breath Intensity"
        value={visuals.breath}
        onChange={(v) => updateVisuals({ breath: v })}
        min={0.05}
        max={1.5}
        step={0.05}
        formatValue={(v) => v.toFixed(2)}
      />
      <Slider
        label="Expansion"
        value={visuals.expansion}
        onChange={(v) => updateVisuals({ expansion: v })}
        min={0.5}
        max={5.0}
        step={0.1}
        formatValue={(v) => v.toFixed(1)}
      />
    </>
  );
}

// Audio Settings
function AudioSettings({
  audio,
  updateAudio,
}: {
  audio: { enabled: boolean; volume: number; guidanceVoice: boolean };
  updateAudio: (updates: Partial<typeof audio>) => void;
}) {
  return (
    <>
      {/* Audio toggle */}
      <ToggleRow
        label="Sound Effects"
        description="Ambient sounds during breathing"
        enabled={audio.enabled}
        onToggle={() => updateAudio({ enabled: !audio.enabled })}
      />

      {/* Volume slider */}
      {audio.enabled && (
        <div style={{ marginTop: spacing.lg, paddingLeft: spacing.lg }}>
          <Slider
            label="Volume"
            value={audio.volume}
            onChange={(v) => updateAudio({ volume: v })}
            min={0}
            max={1}
            step={0.1}
            formatValue={(v) => `${Math.round(v * 100)}%`}
          />
        </div>
      )}

      {/* Guidance voice toggle */}
      <ToggleRow
        label="Guidance Voice"
        description="Spoken breathing cues"
        enabled={audio.guidanceVoice}
        onToggle={() => updateAudio({ guidanceVoice: !audio.guidanceVoice })}
      />
    </>
  );
}

// About Settings
function AboutSettings() {
  return (
    <div style={{ textAlign: 'center' }}>
      <div
        style={{
          fontSize: typography.fontSize['2xl'],
          fontWeight: typography.fontWeight.light,
          letterSpacing: typography.letterSpacing.wide,
          marginBottom: spacing.md,
        }}
      >
        GAIA
      </div>
      <div
        style={{
          fontSize: typography.fontSize.sm,
          color: colors.textDim,
          marginBottom: spacing.xl,
        }}
      >
        Version 1.0.0
      </div>
      <p
        style={{
          fontSize: typography.fontSize.sm,
          color: colors.text,
          lineHeight: typography.lineHeight.relaxed,
          marginBottom: spacing.xl,
        }}
      >
        A global breathing meditation experience that synchronizes users around the world using UTC
        time. Breathe together, find peace together.
      </p>
      <div
        style={{
          fontSize: typography.fontSize.xs,
          color: colors.textDim,
          textTransform: 'uppercase',
          letterSpacing: typography.letterSpacing.wider,
        }}
      >
        Digital Artifact / 002
      </div>
    </div>
  );
}

// Toggle Row Component
function ToggleRow({
  label,
  description,
  enabled,
  onToggle,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        padding: spacing.md,
        marginBottom: spacing.sm,
        background: colors.glass,
        border: 'none',
        borderRadius: borderRadius.lg,
        cursor: 'pointer',
        textAlign: 'left',
      }}
      onClick={onToggle}
    >
      <div>
        <div
          style={{
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.medium,
            marginBottom: spacing.xs,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: typography.fontSize.xs,
            color: colors.textDim,
          }}
        >
          {description}
        </div>
      </div>
      <Toggle enabled={enabled} />
    </button>
  );
}

// Toggle Component
function Toggle({ enabled }: { enabled: boolean }) {
  return (
    <div
      style={{
        width: '44px',
        height: '24px',
        borderRadius: borderRadius.full,
        background: enabled ? colors.accent : colors.border,
        position: 'relative',
        transition: transitions.fast,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '2px',
          left: enabled ? '22px' : '2px',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          background: '#fff',
          boxShadow: shadows.sm,
          transition: transitions.fast,
        }}
      />
    </div>
  );
}

// Stat Card Component
function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: spacing.md,
        background: colors.glass,
        borderRadius: borderRadius.lg,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: typography.fontSize.lg,
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
          letterSpacing: typography.letterSpacing.wide,
          color: colors.textDim,
        }}
      >
        {label}
      </div>
    </div>
  );
}

// Back Icon
function BackIcon() {
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
      <title>Back</title>
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}
