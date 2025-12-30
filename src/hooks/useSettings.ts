/**
 * User Settings Hook
 * Persists user preferences to localStorage
 */

import { useCallback, useEffect, useState } from 'react';
import type { MoodId } from '../constants';

/**
 * User settings interface
 */
export interface UserSettings {
  /** User's display name */
  name: string;
  /** Preferred mood for breathing sessions */
  preferredMood: MoodId;
  /** Visual settings */
  visuals: {
    harmony: number;
    refraction: number;
    breath: number;
    expansion: number;
  };
  /** Audio settings */
  audio: {
    enabled: boolean;
    volume: number;
    guidanceVoice: boolean;
  };
  /** Session statistics */
  stats: {
    totalSessions: number;
    totalMinutes: number;
    lastSessionDate: string | null;
  };
}

const SETTINGS_KEY = 'gaia-user-settings';

/**
 * Default settings for new users
 */
const DEFAULT_SETTINGS: UserSettings = {
  name: '',
  preferredMood: 'moment',
  visuals: {
    harmony: 300,
    refraction: 1.5,
    breath: 0.5,
    expansion: 2.0,
  },
  audio: {
    enabled: true,
    volume: 0.7,
    guidanceVoice: true,
  },
  stats: {
    totalSessions: 0,
    totalMinutes: 0,
    lastSessionDate: null,
  },
};

/**
 * Load settings from localStorage
 */
function loadSettings(): UserSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<UserSettings>;
      // Merge with defaults to handle schema migrations
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        visuals: { ...DEFAULT_SETTINGS.visuals, ...parsed.visuals },
        audio: { ...DEFAULT_SETTINGS.audio, ...parsed.audio },
        stats: { ...DEFAULT_SETTINGS.stats, ...parsed.stats },
      };
    }
  } catch {
    // Return defaults if localStorage is unavailable or corrupted
  }
  return DEFAULT_SETTINGS;
}

/**
 * Save settings to localStorage
 */
function saveSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

/**
 * Hook for managing user settings with localStorage persistence
 */
export function useSettings() {
  const [settings, setSettingsState] = useState<UserSettings>(loadSettings);

  // Persist settings whenever they change
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  /**
   * Update specific settings (shallow merge)
   */
  const updateSettings = useCallback((updates: Partial<UserSettings>) => {
    setSettingsState((current) => ({
      ...current,
      ...updates,
    }));
  }, []);

  /**
   * Update visual settings
   */
  const updateVisuals = useCallback((updates: Partial<UserSettings['visuals']>) => {
    setSettingsState((current) => ({
      ...current,
      visuals: { ...current.visuals, ...updates },
    }));
  }, []);

  /**
   * Update audio settings
   */
  const updateAudio = useCallback((updates: Partial<UserSettings['audio']>) => {
    setSettingsState((current) => ({
      ...current,
      audio: { ...current.audio, ...updates },
    }));
  }, []);

  /**
   * Record a completed session
   */
  const recordSession = useCallback((durationMinutes: number) => {
    setSettingsState((current) => ({
      ...current,
      stats: {
        totalSessions: current.stats.totalSessions + 1,
        totalMinutes: current.stats.totalMinutes + durationMinutes,
        lastSessionDate: new Date().toISOString(),
      },
    }));
  }, []);

  /**
   * Reset all settings to defaults
   */
  const resetSettings = useCallback(() => {
    setSettingsState(DEFAULT_SETTINGS);
  }, []);

  return {
    settings,
    updateSettings,
    updateVisuals,
    updateAudio,
    recordSession,
    resetSettings,
  };
}
