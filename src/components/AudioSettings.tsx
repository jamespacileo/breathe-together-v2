/**
 * AudioSettings - User-friendly audio controls for the settings modal
 *
 * Provides intuitive audio controls for end users:
 * - Master volume slider
 * - Nature soundscape selector with visual options
 * - Sound category toggles (ambient, breath sounds, chimes)
 *
 * Uses Tailwind CSS for styling consistency with SimpleGaiaUI
 */

import { Headphones, Music, TreePine, Volume2, VolumeX, Wind } from 'lucide-react';
import { useCallback, useContext, useMemo, useState } from 'react';
import { AudioContext } from '../audio/AudioProvider';
import { getNatureSoundIds } from '../audio/registry';
import { useViewport } from '../hooks/useViewport';
import { Slider } from './ui/Slider';

// Nature sound metadata for display
const NATURE_SOUND_INFO: Record<
  string,
  { label: string; icon: React.ReactNode; description: string }
> = {
  'nature/ocean': {
    label: 'Ocean',
    icon: <Wind size={16} />,
    description: 'Gentle waves on the shore',
  },
  'nature/forest': {
    label: 'Forest',
    icon: <TreePine size={16} />,
    description: 'Birds and rustling leaves',
  },
  'nature/rain': {
    label: 'Rain',
    icon: <Wind size={16} />,
    description: 'Soft rainfall',
  },
  'nature/wind': {
    label: 'Wind',
    icon: <Wind size={16} />,
    description: 'Gentle breeze',
  },
  'nature/night': {
    label: 'Night',
    icon: <Music size={16} />,
    description: 'Crickets and night sounds',
  },
};

interface AudioSettingsProps {
  /** Stop propagation handler for pointer events */
  stopPropagation: (e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => void;
}

export function AudioSettings({ stopPropagation }: AudioSettingsProps) {
  // Use useContext directly to handle missing provider gracefully
  const audio = useContext(AudioContext);
  const { isMobile } = useViewport();
  const [isLoading, setIsLoading] = useState(false);

  const natureSounds = useMemo(() => getNatureSoundIds(), []);

  // Handle audio enable/disable
  const handleToggleAudio = useCallback(async () => {
    if (!audio) return;
    setIsLoading(true);
    try {
      // biome-ignore lint/nursery/useAwaitThenable: AudioProvider.setEnabled() is async (returns Promise<void>)
      await audio.setEnabled(!audio.state.enabled);
    } finally {
      setIsLoading(false);
    }
  }, [audio]);

  // Handle nature sound selection
  const handleNatureSound = useCallback(
    (soundId: string | null) => {
      if (!audio) return;
      audio.setNatureSound(soundId);
    },
    [audio],
  );

  // Handle volume change
  const handleVolumeChange = useCallback(
    (volume: number) => {
      if (!audio) return;
      audio.setMasterVolume(volume);
    },
    [audio],
  );

  // If no audio provider, show placeholder
  if (!audio) {
    return (
      <div className="text-center text-warm-gray text-[0.8rem] py-4 opacity-60">
        Audio is not available
      </div>
    );
  }

  const { state } = audio;

  return (
    <div className="space-y-5">
      {/* Audio Enable/Disable Toggle */}
      <button
        type="button"
        onClick={handleToggleAudio}
        onPointerDown={stopPropagation}
        disabled={isLoading}
        className={`w-full flex items-center justify-center gap-2.5 p-[14px_20px] rounded-2xl
          text-[0.75rem] uppercase tracking-[0.08em] font-semibold cursor-pointer
          transition-all duration-300 ease-smooth border
          ${isLoading ? 'opacity-60 cursor-wait' : ''}
          ${
            state.enabled
              ? 'bg-accent-gold text-white border-accent-gold shadow-[0_4px_20px_rgba(201,160,108,0.3)]'
              : 'bg-glass text-warm-gray border-border hover:border-accent-gold/40'
          }`}
      >
        {state.enabled ? (
          <Volume2 size={18} strokeWidth={1.8} />
        ) : (
          <VolumeX size={18} strokeWidth={1.8} />
        )}
        {isLoading ? 'Loading...' : state.enabled ? 'Sound Enabled' : 'Enable Sound'}
      </button>

      {/* Volume Slider - Only show when enabled */}
      {state.enabled && (
        <div className="animate-fade-in">
          <Slider
            label="Volume"
            value={state.masterVolume}
            onValueChange={handleVolumeChange}
            min={0}
            max={1}
            step={0.05}
            displayValue={`${Math.round(state.masterVolume * 100)}%`}
          />
        </div>
      )}

      {/* Nature Soundscape Selection - Only show when enabled */}
      {state.enabled && (
        <div className="animate-fade-in">
          <div className="text-[0.65rem] uppercase tracking-[0.1em] text-warm-gray mb-3 flex items-center gap-2">
            <Headphones size={12} />
            Soundscape
          </div>

          {/* None option */}
          <button
            type="button"
            onClick={() => handleNatureSound(null)}
            onPointerDown={stopPropagation}
            className={`w-full text-left p-[12px_16px] mb-2 rounded-xl
              transition-all duration-200 ease-smooth cursor-pointer border
              ${
                state.natureSound === null
                  ? 'bg-accent-gold/10 border-accent-gold/40 text-warm-brown'
                  : 'bg-glass border-border text-warm-gray hover:border-accent-gold/30'
              }`}
          >
            <div className="flex items-center gap-3">
              <VolumeX size={16} className="opacity-60" />
              <span className="text-[0.8rem]">No Soundscape</span>
            </div>
          </button>

          {/* Nature sound options */}
          <div className={`grid gap-2 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {natureSounds.map((soundId) => {
              const info = NATURE_SOUND_INFO[soundId];
              const isLoaded = state.loadingStates[soundId]?.loaded;
              const isSelected = state.natureSound === soundId;

              if (!info) return null;

              return (
                <button
                  key={soundId}
                  type="button"
                  onClick={() => handleNatureSound(soundId)}
                  onPointerDown={stopPropagation}
                  disabled={!isLoaded}
                  className={`text-left p-[12px_14px] rounded-xl
                    transition-all duration-200 ease-smooth cursor-pointer border
                    ${!isLoaded ? 'opacity-40 cursor-not-allowed' : ''}
                    ${
                      isSelected
                        ? 'bg-accent-gold/10 border-accent-gold/40 text-warm-brown'
                        : 'bg-glass border-border text-warm-gray hover:border-accent-gold/30'
                    }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`${isSelected ? 'text-accent-gold' : 'opacity-60'}`}>
                      {info.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[0.75rem] font-medium truncate">{info.label}</div>
                      <div className="text-[0.6rem] opacity-70 truncate">{info.description}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Sound Category Toggles - Only show when enabled */}
      {state.enabled && (
        <div className="animate-fade-in pt-3 border-t border-border">
          <div className="text-[0.65rem] uppercase tracking-[0.1em] text-warm-gray mb-3">
            Sound Layers
          </div>
          <div className="space-y-2">
            {/* Ambient toggle */}
            <label className="flex items-center justify-between p-[10px_14px] rounded-xl bg-glass border border-border cursor-pointer hover:border-accent-gold/30 transition-colors">
              <span className="text-[0.75rem] text-warm-gray">Ambient Drones</span>
              <input
                type="checkbox"
                checked={state.ambientEnabled}
                onChange={(e) => audio.setAmbientEnabled(e.target.checked)}
                onPointerDown={stopPropagation}
                className="w-4 h-4 accent-accent-gold cursor-pointer"
              />
            </label>

            {/* Breath sounds toggle */}
            <label className="flex items-center justify-between p-[10px_14px] rounded-xl bg-glass border border-border cursor-pointer hover:border-accent-gold/30 transition-colors">
              <span className="text-[0.75rem] text-warm-gray">Breath Sounds</span>
              <input
                type="checkbox"
                checked={state.breathEnabled}
                onChange={(e) => audio.setBreathEnabled(e.target.checked)}
                onPointerDown={stopPropagation}
                className="w-4 h-4 accent-accent-gold cursor-pointer"
              />
            </label>

            {/* Chimes toggle */}
            <label className="flex items-center justify-between p-[10px_14px] rounded-xl bg-glass border border-border cursor-pointer hover:border-accent-gold/30 transition-colors">
              <span className="text-[0.75rem] text-warm-gray">Transition Chimes</span>
              <input
                type="checkbox"
                checked={state.chimesEnabled}
                onChange={(e) => audio.setChimesEnabled(e.target.checked)}
                onPointerDown={stopPropagation}
                className="w-4 h-4 accent-accent-gold cursor-pointer"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
