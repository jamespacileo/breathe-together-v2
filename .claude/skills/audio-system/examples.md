# Audio System Examples

Real-world examples for common audio tasks.

## Example 1: Add an Ocean Soundscape

### Step 1: Get the file

Download or generate an ocean waves sound (120s seamless loop).

Place at: `public/audio/nature/ocean.mp3`

### Step 2: Add to registry

```typescript
// src/audio/registry.ts

'nature/ocean': {
  path: '/audio/nature/ocean.mp3',
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

### Step 3: Use it

```typescript
// In your component
const { setNatureSound } = useAudio();

// Enable ocean soundscape
setNatureSound('nature/ocean');

// Disable (no soundscape)
setNatureSound(null);
```

---

## Example 2: Add a Rising Inhale Tone

### Step 1: Get the file

Generate a 3-second rising tone (filter sweep upward).

Place at: `public/audio/breath/inhale-rise.mp3`

### Step 2: Add to registry

```typescript
// src/audio/registry.ts

'breath/inhale-rise': {
  path: '/audio/breath/inhale-rise.mp3',
  category: 'breath',
  triggerPhase: 0,        // Trigger on inhale start
  baseVolume: -6,
  fadeIn: 0.3,
  fadeOut: 0.5,
  breathSync: {
    volumeMin: 0.3,       // Start quiet
    volumeMax: 1.0,       // End loud
    followProgress: true, // Volume follows breath progress
  },
},
```

### What happens

1. User enters inhale phase (phaseType: 0)
2. System detects phase transition
3. `inhale-rise.mp3` starts playing
4. Volume ramps 30% → 100% over 3 seconds
5. Sound fades out naturally

---

## Example 3: Add an Ambient Drone

### Step 1: Get the file

Get a 60-second warm synth pad loop.

Place at: `public/audio/ambient/warm-pad.mp3`

### Step 2: Add to registry

```typescript
// src/audio/registry.ts

'ambient/warm-pad': {
  path: '/audio/ambient/warm-pad.mp3',
  category: 'ambient',
  loop: true,
  baseVolume: -12,
  fadeIn: 2,
  fadeOut: 2,
  // No breathSync - drones are constant
},
```

### What happens

1. When audio is enabled, all ambient sounds start
2. `warm-pad.mp3` loops forever at -12dB
3. Volume never changes (constant foundation)
4. When audio is disabled, fades out over 2 seconds

---

## Example 4: Add a Transition Bell

### Step 1: Get the file

Get a soft singing bowl strike (1.5s with natural decay).

Place at: `public/audio/chimes/bowl.mp3`

### Step 2: Add to registry

```typescript
// src/audio/registry.ts

'chimes/bowl': {
  path: '/audio/chimes/bowl.mp3',
  category: 'chimes',
  triggerPhase: 0,        // Play at inhale start
  baseVolume: -9,
  fadeIn: 0,              // Instant attack (natural bell)
  fadeOut: 0,             // Natural decay (no artificial fade)
},
```

### Step 3: Enable chimes

```typescript
// Chimes are disabled by default
// User must explicitly enable them
const { state } = useAudio();
// state.chimesEnabled must be true
```

---

## Example 5: Multiple Nature Soundscapes

### Registry entries

```typescript
// src/audio/registry.ts

// All nature sounds use the same pattern
'nature/ocean': {
  path: '/audio/nature/ocean.mp3',
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

'nature/forest': {
  path: '/audio/nature/forest.mp3',
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

'nature/rain': {
  path: '/audio/nature/rain.mp3',
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

### Switching between them

```typescript
const { setNatureSound } = useAudio();

// UI selector
<select onChange={(e) => setNatureSound(e.target.value || null)}>
  <option value="">None</option>
  <option value="nature/ocean">Ocean</option>
  <option value="nature/forest">Forest</option>
  <option value="nature/rain">Rain</option>
</select>
```

When switching, the AudioEngine:
1. Fades out current sound (3s)
2. Fades in new sound (3s)
3. Crossfade overlaps for smooth transition

---

## Example 6: Complete Registry File

```typescript
// src/audio/registry.ts

import { SoundDefinition } from './types';

export const SOUNDS: Record<string, SoundDefinition> = {
  // ─────────────────────────────────────────────────────
  // AMBIENT DRONES
  // Foundation layer, constant volume, loops forever
  // ─────────────────────────────────────────────────────
  'ambient/warm-pad': {
    path: '/audio/ambient/warm-pad.mp3',
    category: 'ambient',
    loop: true,
    baseVolume: -12,
    fadeIn: 2,
    fadeOut: 2,
  },

  'ambient/high-shimmer': {
    path: '/audio/ambient/high-shimmer.mp3',
    category: 'ambient',
    loop: true,
    baseVolume: -15,
    fadeIn: 2,
    fadeOut: 2,
  },

  // ─────────────────────────────────────────────────────
  // BREATH TONES
  // Triggered per phase, volume follows progress
  // ─────────────────────────────────────────────────────
  'breath/inhale': {
    path: '/audio/breath/inhale.mp3',
    category: 'breath',
    triggerPhase: 0,
    baseVolume: -6,
    fadeIn: 0.3,
    fadeOut: 0.5,
    breathSync: {
      volumeMin: 0.3,
      volumeMax: 1.0,
      followProgress: true,
    },
  },

  'breath/hold-in': {
    path: '/audio/breath/hold-in.mp3',
    category: 'breath',
    triggerPhase: 1,
    baseVolume: -9,
    fadeIn: 0.5,
    fadeOut: 0.5,
    breathSync: {
      volumeMin: 0.8,
      volumeMax: 1.0,
      followProgress: false,
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
      volumeMax: 0.3,       // End quiet (inverse)
      followProgress: true,
    },
  },

  'breath/hold-out': {
    path: '/audio/breath/hold-out.mp3',
    category: 'breath',
    triggerPhase: 3,
    baseVolume: -12,
    fadeIn: 0.3,
    fadeOut: 0.3,
    breathSync: {
      volumeMin: 0.5,
      volumeMax: 0.7,
      followProgress: false,
    },
  },

  // ─────────────────────────────────────────────────────
  // NATURE SOUNDSCAPES
  // One active at a time, volume breathes with cycle
  // ─────────────────────────────────────────────────────
  'nature/ocean': {
    path: '/audio/nature/ocean.mp3',
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

  'nature/forest': {
    path: '/audio/nature/forest.mp3',
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

  'nature/rain': {
    path: '/audio/nature/rain.mp3',
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

  // ─────────────────────────────────────────────────────
  // TRANSITION CHIMES (optional)
  // One-shot at phase boundaries
  // ─────────────────────────────────────────────────────
  'chimes/inhale-bell': {
    path: '/audio/chimes/inhale-bell.mp3',
    category: 'chimes',
    triggerPhase: 0,
    baseVolume: -9,
    fadeIn: 0,
    fadeOut: 0,
  },

  'chimes/exhale-bell': {
    path: '/audio/chimes/exhale-bell.mp3',
    category: 'chimes',
    triggerPhase: 2,
    baseVolume: -9,
    fadeIn: 0,
    fadeOut: 0,
  },
};

// ─────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────

export const getSoundsByCategory = (category: string) =>
  Object.entries(SOUNDS)
    .filter(([_, def]) => def.category === category)
    .map(([id, def]) => ({ id, ...def }));

export const getSoundIds = () => Object.keys(SOUNDS);

export const getNatureSounds = () =>
  getSoundsByCategory('nature').map(s => s.id);
```

---

## Example 7: Using the Audio Hook

```typescript
// In any component inside AudioProvider
import { useAudio } from '../audio';

function AudioControls() {
  const { state, setEnabled, setMasterVolume, setNatureSound } = useAudio();

  return (
    <div>
      {/* Enable/disable audio */}
      <button onClick={() => setEnabled(!state.enabled)}>
        {state.enabled ? '🔊 Audio On' : '🔇 Audio Off'}
      </button>

      {/* Master volume slider */}
      <input
        type="range"
        min={0}
        max={1}
        step={0.1}
        value={state.masterVolume}
        onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
      />

      {/* Nature sound selector */}
      <select
        value={state.natureSound || ''}
        onChange={(e) => setNatureSound(e.target.value || null)}
      >
        <option value="">No Nature Sound</option>
        <option value="nature/ocean">Ocean Waves</option>
        <option value="nature/forest">Forest</option>
        <option value="nature/rain">Rain</option>
      </select>
    </div>
  );
}
```

---

## Example 8: Audio in a 3D UI (uikit)

```typescript
// Using @react-three/uikit for 3D audio controls
import { Container, Text } from '@react-three/uikit';
import { useAudio } from '../audio';

function Audio3DControls() {
  const { state, setEnabled, setNatureSound } = useAudio();

  return (
    <Container flexDirection="row" gap={16}>
      <Container
        onClick={() => setEnabled(!state.enabled)}
        backgroundColor={state.enabled ? '#4A8A9A' : '#333'}
        padding={12}
        borderRadius={8}
      >
        <Text fontSize={14}>
          {state.enabled ? 'Sound On' : 'Sound Off'}
        </Text>
      </Container>

      {state.enabled && (
        <Container flexDirection="row" gap={8}>
          {['ocean', 'forest', 'rain'].map((sound) => (
            <Container
              key={sound}
              onClick={() => setNatureSound(`nature/${sound}`)}
              backgroundColor={
                state.natureSound === `nature/${sound}` ? '#4A8A9A' : '#333'
              }
              padding={8}
              borderRadius={4}
            >
              <Text fontSize={12}>{sound}</Text>
            </Container>
          ))}
        </Container>
      )}
    </Container>
  );
}
```
