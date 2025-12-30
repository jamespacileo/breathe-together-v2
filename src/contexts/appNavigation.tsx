/**
 * App Navigation Context
 * Manages scene transitions between onboarding, main menu, breathing, and settings
 */

import { createContext, type ReactNode, useCallback, useContext, useState } from 'react';

/**
 * Available scenes in the app
 */
export type AppScene = 'onboarding' | 'main-menu' | 'breathing' | 'settings';

/**
 * Navigation context interface
 */
export interface AppNavigationContextValue {
  /** Current active scene */
  currentScene: AppScene;
  /** Previous scene (for back navigation) */
  previousScene: AppScene | null;
  /** Navigate to a specific scene */
  navigate: (scene: AppScene) => void;
  /** Go back to previous scene */
  goBack: () => void;
  /** Check if this is the first app launch */
  isFirstLaunch: boolean;
  /** Mark onboarding as complete */
  completeOnboarding: () => void;
}

const AppNavigationContext = createContext<AppNavigationContextValue | null>(null);

const ONBOARDING_COMPLETE_KEY = 'gaia-onboarding-complete';

/**
 * Hook to access app navigation
 */
export function useAppNavigation(): AppNavigationContextValue {
  const context = useContext(AppNavigationContext);
  if (!context) {
    throw new Error('useAppNavigation must be used within AppNavigationProvider');
  }
  return context;
}

/**
 * Provider component for app navigation
 */
export function AppNavigationProvider({ children }: { children: ReactNode }) {
  // Check if onboarding was completed previously
  const hasCompletedOnboarding = () => {
    try {
      return localStorage.getItem(ONBOARDING_COMPLETE_KEY) === 'true';
    } catch {
      return false;
    }
  };

  const isFirstLaunch = !hasCompletedOnboarding();

  // Determine initial scene based on first launch status
  const [currentScene, setCurrentScene] = useState<AppScene>(
    isFirstLaunch ? 'onboarding' : 'main-menu',
  );
  const [previousScene, setPreviousScene] = useState<AppScene | null>(null);

  const navigate = useCallback((scene: AppScene) => {
    setCurrentScene((current) => {
      setPreviousScene(current);
      return scene;
    });
  }, []);

  const goBack = useCallback(() => {
    if (previousScene) {
      setCurrentScene(previousScene);
      setPreviousScene(null);
    }
  }, [previousScene]);

  const completeOnboarding = useCallback(() => {
    try {
      localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    } catch {
      // Silently fail if localStorage is unavailable
    }
    navigate('main-menu');
  }, [navigate]);

  return (
    <AppNavigationContext.Provider
      value={{
        currentScene,
        previousScene,
        navigate,
        goBack,
        isFirstLaunch,
        completeOnboarding,
      }}
    >
      {children}
    </AppNavigationContext.Provider>
  );
}
