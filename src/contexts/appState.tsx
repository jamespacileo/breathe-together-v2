/**
 * App State Context
 * Manages global application state including current screen and navigation
 */

import { createContext, type ReactNode, useCallback, useContext, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

/**
 * Available screens in the application
 */
export type AppScreen = 'menu' | 'onboarding' | 'breathing' | 'settings';

/**
 * App state interface
 */
export interface AppState {
  /** Currently active screen */
  currentScreen: AppScreen;
  /** Whether user has completed the onboarding flow */
  hasCompletedOnboarding: boolean;
}

/**
 * App state actions interface
 */
export interface AppStateActions {
  /** Navigate to a specific screen */
  navigateTo: (screen: AppScreen) => void;
  /** Mark onboarding as completed */
  completeOnboarding: () => void;
  /** Reset onboarding (for testing) */
  resetOnboarding: () => void;
  /** Start breathing session (navigates to breathing screen) */
  startBreathing: () => void;
  /** Return to main menu */
  goToMenu: () => void;
  /** Open settings */
  openSettings: () => void;
}

const AppStateContext = createContext<(AppState & AppStateActions) | null>(null);

/**
 * Hook to access app state and navigation
 * @throws Error if used outside AppStateProvider
 */
export function useAppState(): AppState & AppStateActions {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}

/**
 * App State Provider
 * Manages screen routing and onboarding state with localStorage persistence
 */
export function AppStateProvider({ children }: { children: ReactNode }) {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useLocalStorage(
    'gaia-onboarding-completed',
    false,
  );

  const [currentScreen, setCurrentScreen] = useLocalStorage<AppScreen>(
    'gaia-current-screen',
    // If onboarding not completed, start there; otherwise show menu
    hasCompletedOnboarding ? 'menu' : 'onboarding',
  );

  const navigateTo = useCallback(
    (screen: AppScreen) => {
      // Don't allow navigating away from onboarding until completed
      if (!hasCompletedOnboarding && screen !== 'onboarding') {
        return;
      }
      setCurrentScreen(screen);
    },
    [hasCompletedOnboarding, setCurrentScreen],
  );

  const completeOnboarding = useCallback(() => {
    setHasCompletedOnboarding(true);
    setCurrentScreen('menu');
  }, [setHasCompletedOnboarding, setCurrentScreen]);

  const resetOnboarding = useCallback(() => {
    setHasCompletedOnboarding(false);
    setCurrentScreen('onboarding');
  }, [setHasCompletedOnboarding, setCurrentScreen]);

  const startBreathing = useCallback(() => {
    if (hasCompletedOnboarding) {
      setCurrentScreen('breathing');
    }
  }, [hasCompletedOnboarding, setCurrentScreen]);

  const goToMenu = useCallback(() => {
    if (hasCompletedOnboarding) {
      setCurrentScreen('menu');
    }
  }, [hasCompletedOnboarding, setCurrentScreen]);

  const openSettings = useCallback(() => {
    if (hasCompletedOnboarding) {
      setCurrentScreen('settings');
    }
  }, [hasCompletedOnboarding, setCurrentScreen]);

  const value = useMemo(
    () => ({
      currentScreen,
      hasCompletedOnboarding,
      navigateTo,
      completeOnboarding,
      resetOnboarding,
      startBreathing,
      goToMenu,
      openSettings,
    }),
    [
      currentScreen,
      hasCompletedOnboarding,
      navigateTo,
      completeOnboarding,
      resetOnboarding,
      startBreathing,
      goToMenu,
      openSettings,
    ],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}
