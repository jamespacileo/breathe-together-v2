import { create } from 'zustand';

/**
 * Audio store for cross-Canvas audio state.
 *
 * This store exposes audio enabled state to HTML components outside the Canvas.
 * The AudioProvider inside the Canvas syncs with this store and handles
 * the actual audio engine initialization/control.
 *
 * Why a separate store?
 * - AudioProvider uses useFrame and useWorld, which require Canvas context
 * - TopRightControls renders outside Canvas (in HTML UI layer)
 * - Zustand provides shared state accessible from both contexts
 */

interface AudioStoreState {
  /** Whether audio is enabled (user has clicked to enable) */
  enabled: boolean;
  /** Whether audio is currently loading/initializing */
  isLoading: boolean;
  /** Whether the AudioProvider is mounted and ready */
  providerReady: boolean;
  /** Whether audio is unavailable (e.g., missing files, browser doesn't support) */
  isUnavailable: boolean;
  /** Reason why audio is unavailable (shown in tooltip) */
  unavailableReason: string | null;

  // Actions (called from UI)
  /** Request to toggle audio - AudioProvider listens and handles */
  requestToggle: () => void;

  // Internal actions (called from AudioProvider)
  /** Set enabled state (called by AudioProvider after actual toggle) */
  _setEnabled: (enabled: boolean) => void;
  /** Set loading state */
  _setLoading: (loading: boolean) => void;
  /** Mark provider as ready */
  _setProviderReady: (ready: boolean) => void;
  /** Set a pending toggle request (cleared by AudioProvider) */
  _toggleRequested: boolean;
  /** Clear the toggle request */
  _clearToggleRequest: () => void;
  /** Mark audio as unavailable with a reason */
  _setUnavailable: (reason: string | null) => void;
}

export const useAudioStore = create<AudioStoreState>((set) => ({
  enabled: false,
  isLoading: false,
  providerReady: false,
  isUnavailable: false,
  unavailableReason: null,
  _toggleRequested: false,

  requestToggle: () => {
    // Set flag that AudioProvider will pick up
    set({ _toggleRequested: true });
  },

  _setEnabled: (enabled) => set({ enabled }),
  _setLoading: (loading) => set({ isLoading: loading }),
  _setProviderReady: (ready) => set({ providerReady: ready }),
  _clearToggleRequest: () => set({ _toggleRequested: false }),
  _setUnavailable: (reason) => set({ isUnavailable: reason !== null, unavailableReason: reason }),
}));
