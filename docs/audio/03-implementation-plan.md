# Audio Implementation Plan

Minimal, extensible architecture for atmospheric sounds.

## Core Principle

**One registry, one system, clear extension points.**

All sound definitions live in a single registry file. The audio system reads breath state and plays sounds accordingly. Adding a new sound = add entry to registry + drop file in folder.

---

## Directory Structure

```
src/
├── audio/
│   ├── index.ts              # Public API: useAudio hook, AudioProvider
│   ├── registry.ts           # Sound definitions (THE place to add sounds)
│   ├── audioSystem.ts        # ECS system (reads breath, controls playback)
│   ├── AudioEngine.ts        # Tone.js wrapper (low-level audio control)
│   └── types.ts              # TypeScript interfaces
│
public/
└── audio/
    ├── ambient/              # Continuous drone files
    │   ├── pad-warm.mp3
    │   └── pad-high.mp3
    ├── breath/               # Phase-triggered files
    │   ├── inhale.mp3
    │   ├── hold-in.mp3
    │   ├── exhale.mp3
    │   └── hold-out.mp3
    ├── nature/               # Soundscape files
    │   ├── ocean.mp3
    │   ├── forest.mp3
    │   └── rain.mp3
    └── chimes/               # Transition chimes
        └── bell.mp3
```

---

## The Registry Pattern

### `src/audio/registry.ts`

Single source of truth for all sounds:

```typescript
import { SoundDefinition, SoundCategory } from './types';

/**
 * SOUND REGISTRY
 *
 * To add a new sound:
 * 1. Drop the file in public/audio/{category}/
 * 2. Add an entry below
 * 3. Done - the system picks it up automatically
 */
export const SOUNDS: Record<string, SoundDefinition> = {
  // ─────────────────────────────────────────────────────
  // AMBIENT DRONES (continuous, loop forever)
  // ─────────────────────────────────────────────────────
  'ambient/pad-warm': {
    path: '/audio/ambient/pad-warm.mp3',
    category: 'ambient',
    loop: true,
    baseVolume: -12,        // dB
    fadeIn: 2,              // seconds
    fadeOut: 2,
  },

  'ambient/pad-high': {
    path: '/audio/ambient/pad-high.mp3',
    category: 'ambient',
    loop: true,
    baseVolume: -15,
    fadeIn: 2,
    fadeOut: 2,
  },

  // ─────────────────────────────────────────────────────
  // BREATH TONES (triggered per phase)
  // ─────────────────────────────────────────────────────
  'breath/inhale': {
    path: '/audio/breath/inhale.mp3',
    category: 'breath',
    triggerPhase: 0,        // 0=inhale, 1=hold-in, 2=exhale, 3=hold-out
    baseVolume: -6,
    fadeIn: 0.3,
    fadeOut: 0.5,
    // Breath tones can define volume envelope sync
    breathSync: {
      volumeMin: 0.3,       // Volume at phase start
      volumeMax: 1.0,       // Volume at phase peak
      followProgress: true, // Volume follows easedProgress
    },
  },

  'breath/exhale': {
    path: '/audio/breath/exhale.mp3',
    category: 'breath',
    triggerPhase: 2,
    baseVolume: -6,
    fadeIn: 0.3,
    fadeOut: 0.8,
    breathSync: {
      volumeMin: 1.0,       // Start loud
      volumeMax: 0.3,       // End quiet (inverse of inhale)
      followProgress: true,
    },
  },

  // ─────────────────────────────────────────────────────
  // NATURE SOUNDSCAPES (one active at a time)
  // ─────────────────────────────────────────────────────
  'nature/ocean': {
    path: '/audio/nature/ocean.mp3',
    category: 'nature',
    loop: true,
    baseVolume: -15,
    fadeIn: 3,
    fadeOut: 3,
    // Nature sounds breathe with the cycle
    breathSync: {
      volumeMin: 0.7,
      volumeMax: 1.0,
      followProgress: false, // Uses phase-based envelope instead
      phaseVolumes: [0.85, 1.0, 0.85, 0.7], // Per-phase target volumes
    },
  },

  // ─────────────────────────────────────────────────────
  // CHIMES (one-shot, optional)
  // ─────────────────────────────────────────────────────
  'chimes/bell': {
    path: '/audio/chimes/bell.mp3',
    category: 'chimes',
    triggerPhase: 0,        // Trigger on inhale start
    baseVolume: -9,
    fadeIn: 0,              // Instant attack
    fadeOut: 0,             // Natural decay
  },
};

// Helper to get sounds by category
export const getSoundsByCategory = (category: SoundCategory) =>
  Object.entries(SOUNDS)
    .filter(([_, def]) => def.category === category)
    .map(([id, def]) => ({ id, ...def }));
```

---

## Types

### `src/audio/types.ts`

```typescript
export type SoundCategory = 'ambient' | 'breath' | 'nature' | 'chimes' | 'ui';

export interface BreathSyncConfig {
  volumeMin: number;           // 0-1
  volumeMax: number;           // 0-1
  followProgress?: boolean;    // Tie volume to easedProgress
  phaseVolumes?: number[];     // [inhale, hold-in, exhale, hold-out] targets
}

export interface SoundDefinition {
  path: string;
  category: SoundCategory;
  loop?: boolean;
  baseVolume: number;          // dB (-20 to 0)
  fadeIn: number;              // seconds
  fadeOut: number;             // seconds
  triggerPhase?: number;       // 0-3, for phase-triggered sounds
  breathSync?: BreathSyncConfig;
}

export interface AudioState {
  enabled: boolean;
  masterVolume: number;        // 0-1
  ambientEnabled: boolean;
  breathEnabled: boolean;
  natureSound: string | null;  // e.g., 'nature/ocean' or null
  chimesEnabled: boolean;
}
```

---

## Audio System (ECS Integration)

### `src/audio/audioSystem.ts`

```typescript
import type { World } from 'koota';
import { phaseType, easedProgress, rawProgress } from '../entities/breath/traits';
import { AudioEngine } from './AudioEngine';
import { SOUNDS } from './registry';

let lastPhase = -1;

/**
 * Audio system - runs every frame after breathSystem
 * Reads breath state, updates audio parameters
 */
export function audioSystem(world: World, _delta: number, engine: AudioEngine) {
  if (!engine.isReady()) return;

  const breathEntity = world.queryFirst(phaseType, easedProgress, rawProgress);
  if (!breathEntity) return;

  const currentPhase = breathEntity.get(phaseType)?.value ?? 0;
  const progress = breathEntity.get(easedProgress)?.value ?? 0;

  // Phase transition detection
  if (currentPhase !== lastPhase) {
    engine.onPhaseChange(currentPhase, lastPhase);
    lastPhase = currentPhase;
  }

  // Update breath-synced parameters
  engine.updateBreathProgress(currentPhase, progress);
}
```

---

## Audio Engine (Tone.js Wrapper)

### `src/audio/AudioEngine.ts`

```typescript
import * as Tone from 'tone';
import { SOUNDS, getSoundsByCategory } from './registry';
import type { AudioState, SoundDefinition } from './types';

/**
 * Low-level audio control
 * Wraps Tone.js, handles loading, playback, mixing
 */
export class AudioEngine {
  private players: Map<string, Tone.Player> = new Map();
  private masterGain: Tone.Gain;
  private ready = false;
  private state: AudioState;

  constructor(initialState: AudioState) {
    this.state = initialState;
    this.masterGain = new Tone.Gain(initialState.masterVolume).toDestination();
  }

  async init() {
    await Tone.start();
    await this.loadSounds();
    this.ready = true;
  }

  private async loadSounds() {
    const loadPromises = Object.entries(SOUNDS).map(async ([id, def]) => {
      const player = new Tone.Player({
        url: def.path,
        loop: def.loop ?? false,
        volume: def.baseVolume,
        fadeIn: def.fadeIn,
        fadeOut: def.fadeOut,
      }).connect(this.masterGain);

      await player.load(def.path);
      this.players.set(id, player);
    });

    await Promise.all(loadPromises);
  }

  isReady() {
    return this.ready;
  }

  // Called on phase transitions
  onPhaseChange(newPhase: number, oldPhase: number) {
    // Trigger phase-specific sounds
    for (const [id, def] of Object.entries(SOUNDS)) {
      if (def.triggerPhase === newPhase && this.isCategoryEnabled(def.category)) {
        this.players.get(id)?.start();
      }
    }
  }

  // Called every frame with breath progress
  updateBreathProgress(phase: number, progress: number) {
    for (const [id, def] of Object.entries(SOUNDS)) {
      if (!def.breathSync || !this.isCategoryEnabled(def.category)) continue;

      const player = this.players.get(id);
      if (!player || player.state !== 'started') continue;

      // Calculate target volume based on breath sync config
      let targetVolume: number;
      if (def.breathSync.followProgress) {
        // Volume follows eased progress within phase
        const { volumeMin, volumeMax } = def.breathSync;
        targetVolume = volumeMin + (volumeMax - volumeMin) * progress;
      } else if (def.breathSync.phaseVolumes) {
        // Volume snaps to phase-specific target (with smoothing)
        targetVolume = def.breathSync.phaseVolumes[phase];
      } else {
        continue;
      }

      // Smooth volume transition
      player.volume.rampTo(def.baseVolume + Tone.gainToDb(targetVolume), 0.1);
    }
  }

  private isCategoryEnabled(category: string): boolean {
    switch (category) {
      case 'ambient': return this.state.ambientEnabled;
      case 'breath': return this.state.breathEnabled;
      case 'nature': return this.state.natureSound !== null;
      case 'chimes': return this.state.chimesEnabled;
      default: return true;
    }
  }

  // Public controls
  setMasterVolume(volume: number) {
    this.state.masterVolume = volume;
    this.masterGain.gain.rampTo(volume, 0.1);
  }

  setNatureSound(soundId: string | null) {
    // Stop current nature sound
    if (this.state.natureSound) {
      this.players.get(this.state.natureSound)?.stop();
    }
    // Start new one
    this.state.natureSound = soundId;
    if (soundId) {
      this.players.get(soundId)?.start();
    }
  }

  startAmbient() {
    getSoundsByCategory('ambient').forEach(({ id }) => {
      this.players.get(id)?.start();
    });
  }

  stopAll() {
    this.players.forEach(player => player.stop());
  }

  dispose() {
    this.players.forEach(player => player.dispose());
    this.masterGain.dispose();
  }
}
```

---

## React Integration

### `src/audio/index.ts`

```typescript
export { useAudio, AudioProvider } from './AudioProvider';
export { SOUNDS, getSoundsByCategory } from './registry';
export type { AudioState, SoundCategory } from './types';
```

### `src/audio/AudioProvider.tsx`

```typescript
import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useWorld, useFrame } from '@react-three/fiber';
import { AudioEngine } from './AudioEngine';
import { audioSystem } from './audioSystem';
import type { AudioState } from './types';

const defaultState: AudioState = {
  enabled: false,
  masterVolume: 0.7,
  ambientEnabled: true,
  breathEnabled: true,
  natureSound: null,
  chimesEnabled: false,
};

const AudioContext = createContext<{
  state: AudioState;
  setEnabled: (enabled: boolean) => void;
  setMasterVolume: (volume: number) => void;
  setNatureSound: (sound: string | null) => void;
} | null>(null);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const world = useWorld();
  const engineRef = useRef<AudioEngine | null>(null);
  const [state, setState] = useState<AudioState>(defaultState);

  // Initialize engine on first user interaction
  const setEnabled = useCallback(async (enabled: boolean) => {
    if (enabled && !engineRef.current) {
      engineRef.current = new AudioEngine(state);
      await engineRef.current.init();
      engineRef.current.startAmbient();
    }
    setState(s => ({ ...s, enabled }));
  }, [state]);

  // Run audio system every frame
  useFrame((_, delta) => {
    if (state.enabled && engineRef.current) {
      audioSystem(world, delta, engineRef.current);
    }
  });

  // Cleanup
  useEffect(() => {
    return () => engineRef.current?.dispose();
  }, []);

  const setMasterVolume = useCallback((volume: number) => {
    engineRef.current?.setMasterVolume(volume);
    setState(s => ({ ...s, masterVolume: volume }));
  }, []);

  const setNatureSound = useCallback((sound: string | null) => {
    engineRef.current?.setNatureSound(sound);
    setState(s => ({ ...s, natureSound: sound }));
  }, []);

  return (
    <AudioContext.Provider value={{ state, setEnabled, setMasterVolume, setNatureSound }}>
      {children}
    </AudioContext.Provider>
  );
}

export const useAudio = () => {
  const ctx = useContext(AudioContext);
  if (!ctx) throw new Error('useAudio must be used within AudioProvider');
  return ctx;
};
```

---

## Usage in Scene

```typescript
// src/levels/breathing.tsx
import { AudioProvider, useAudio } from '../audio';

function AudioControls() {
  const { state, setEnabled, setNatureSound } = useAudio();

  return (
    <group>
      {/* Button to enable audio (required for browser autoplay) */}
      <mesh onClick={() => setEnabled(!state.enabled)}>
        {/* ... */}
      </mesh>
    </group>
  );
}

export function BreathingLevel() {
  return (
    <AudioProvider>
      <Environment />
      <BreathingSphere />
      <ParticleSwarm />
      <AudioControls />
    </AudioProvider>
  );
}
```

---

## How to Add a New Sound

### Step 1: Drop file in correct folder
```
public/audio/nature/waterfall.mp3
```

### Step 2: Add entry to registry
```typescript
// src/audio/registry.ts
'nature/waterfall': {
  path: '/audio/nature/waterfall.mp3',
  category: 'nature',
  loop: true,
  baseVolume: -15,
  fadeIn: 3,
  fadeOut: 3,
  breathSync: {
    volumeMin: 0.7,
    volumeMax: 1.0,
    phaseVolumes: [0.85, 1.0, 0.85, 0.7],
  },
},
```

### Step 3: Done
The system auto-loads and manages it.

---

## Implementation Phases

### Phase 1: Foundation (MVP)
- [ ] Install `tone` dependency
- [ ] Create `src/audio/` directory structure
- [ ] Implement `types.ts`
- [ ] Implement `registry.ts` with 1-2 placeholder sounds
- [ ] Implement `AudioEngine.ts` (basic playback)
- [ ] Implement `AudioProvider.tsx`
- [ ] Add enable/disable button to scene

### Phase 2: Breath Sync
- [ ] Implement `audioSystem.ts` with phase detection
- [ ] Add breath-sync volume modulation
- [ ] Add phase-triggered sounds
- [ ] Test with placeholder breath tones

### Phase 3: Nature Soundscapes
- [ ] Add nature sound registry entries
- [ ] Implement soundscape switching with crossfade
- [ ] Add UI for soundscape selection

### Phase 4: Polish
- [ ] Add transition chimes (optional)
- [ ] Fine-tune mixing levels
- [ ] Add loading states
- [ ] Error handling for failed loads

---

## Extension Points

| Want to add... | Where to modify |
|----------------|-----------------|
| New sound file | `registry.ts` + drop file |
| New sound category | `types.ts` → `SoundCategory`, `AudioEngine.ts` → `isCategoryEnabled` |
| New breath-sync behavior | `types.ts` → `BreathSyncConfig`, `AudioEngine.ts` → `updateBreathProgress` |
| New audio effect (reverb, etc.) | `AudioEngine.ts` → add Tone.js effect chain |
| UI controls | `AudioProvider.tsx` → add new setter, expose in context |
