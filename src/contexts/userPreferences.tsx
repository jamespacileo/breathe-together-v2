/**
 * User Preferences Context
 * Manages user settings with localStorage persistence
 */

import { createContext, type ReactNode, useCallback, useContext, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

/**
 * User preferences interface
 */
export interface UserPreferences {
  /** User's display name */
  userName: string;
  /** Sound effects enabled */
  soundEnabled: boolean;
  /** Haptic feedback enabled (mobile) */
  hapticsEnabled: boolean;
  /** Show breathing guide text */
  showGuideText: boolean;
  /** Visual theme */
  theme: 'light' | 'dark' | 'auto';
  /** Notification reminders enabled */
  remindersEnabled: boolean;
  /** Preferred session duration in minutes */
  sessionDuration: number;
  /** Visual quality preset */
  qualityPreset: 'low' | 'medium' | 'high' | 'ultra';
}

/**
 * Default preferences for new users
 */
export const DEFAULT_PREFERENCES: UserPreferences = {
  userName: '',
  soundEnabled: true,
  hapticsEnabled: true,
  showGuideText: true,
  theme: 'auto',
  remindersEnabled: false,
  sessionDuration: 5,
  qualityPreset: 'high',
};

/**
 * User preferences actions interface
 */
export interface UserPreferencesActions {
  /** Update a single preference */
  updatePreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
  /** Update multiple preferences at once */
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  /** Reset all preferences to defaults */
  resetPreferences: () => void;
}

const UserPreferencesContext = createContext<(UserPreferences & UserPreferencesActions) | null>(
  null,
);

/**
 * Hook to access user preferences
 * @throws Error if used outside UserPreferencesProvider
 */
export function useUserPreferences(): UserPreferences & UserPreferencesActions {
  const context = useContext(UserPreferencesContext);
  if (!context) {
    throw new Error('useUserPreferences must be used within a UserPreferencesProvider');
  }
  return context;
}

/**
 * User Preferences Provider
 * Manages user settings with localStorage persistence
 */
export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useLocalStorage<UserPreferences>(
    'gaia-user-preferences',
    DEFAULT_PREFERENCES,
  );

  const updatePreference = useCallback(
    <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
      setPreferences((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    [setPreferences],
  );

  const updatePreferences = useCallback(
    (updates: Partial<UserPreferences>) => {
      setPreferences((prev) => ({
        ...prev,
        ...updates,
      }));
    },
    [setPreferences],
  );

  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
  }, [setPreferences]);

  const value = useMemo(
    () => ({
      ...preferences,
      updatePreference,
      updatePreferences,
      resetPreferences,
    }),
    [preferences, updatePreference, updatePreferences, resetPreferences],
  );

  return (
    <UserPreferencesContext.Provider value={value}>{children}</UserPreferencesContext.Provider>
  );
}
