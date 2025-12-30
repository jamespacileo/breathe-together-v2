# Audio Architecture Plan for breathe-together-v2

This document outlines the architecture, library selection, sound design, and implementation plan for adding atmospheric audio to the breathing meditation app.

## 1. Architecture Decision

### Recommended Approach: Hybrid Audio System

Given the ECS architecture and breathing synchronization requirements, we recommend a **hybrid approach**:

1. **Tone.js** for ambient soundscapes and breath-synchronized audio
   - Advanced scheduling aligns perfectly with 16-second breathing cycle
   - Built-in synthesizers for generative ambient tones
   - Envelope generators sync naturally with `easedProgress` trait
   - Effects chain (reverb, delay, filters) for atmospheric depth

2. **Howler.js** for one-shot sound effects
   - Lightweight (7KB) for occasional audio cues
   - Excellent cross-browser compatibility
   - Simple API for UI feedback sounds

### Why NOT @react-three/drei PositionalAudio?

While drei's PositionalAudio is great for 3D spatial audio tied to mesh positions, our use case is:
- **Global ambient audio** (not position-dependent)
- **Breath-synchronized parameters** (not camera-distance based)
- **Continuous soundscapes** (not proximity triggers)

The drei PositionalAudio could be added later for spatial presence particles (e.g., each user's particle makes subtle sounds), but the core atmospheric audio should use Tone.js.

## 2. System Integration

### File Structure

```
src/
├── entities/
│   └── audio/
│       ├── index.tsx           # AudioEntity component (initializes audio context)
│       ├── systems.tsx         # audioSystem (runs every frame)
│       ├── traits.tsx          # Audio state traits
│       ├── sounds/
│       │   ├── ambient.ts      # Ambient drone/pad configurations
│       │   ├── breath.ts       # Breath-sync sound configurations
│       │   └── effects.ts      # Reverb, delay, filter chains
│       └── hooks/
│           └── useAudioContext.ts  # Audio context provider hook
├── contexts/
│   └── AudioContext.tsx        # React context for audio state
└── public/
    └── audio/
        ├── ambient/            # Ambient soundscape files
        ├── breath/             # Breath cue audio files
        └── nature/             # Nature sound files
```

### ECS Integration Pattern

```typescript
// src/entities/audio/traits.tsx
import { trait } from 'koota';

// Master audio state
export const audioEnabled = trait({ value: false });
export const masterVolume = trait({ value: 0.7 });

// Breath-synced parameters (0-1, smoothed)
export const breathAudioIntensity = trait({ value: 0 });
export const filterCutoff = trait({ value: 0.5 });
export const reverbWet = trait({ value: 0.3 });

// Phase-specific triggers
export const phaseTransition = trait({ from: 0, to: 0 }); // Tracks phase changes
```

### System Execution

```typescript
// In providers.tsx - add after breathSystem
useFrame((_state, delta) => {
  if (breathSystemEnabled) {
    breathSystem(world, delta);
    audioSystem(world, delta);  // Audio follows breath
  }
});
```

## 3. Sound Categories & Asset Requirements

### 3.1 Ambient Drone Layer (Continuous)

**Purpose:** Foundational atmospheric soundscape that plays continuously, modulated by breath phase.

| Sound | Description | Duration | Format |
|-------|-------------|----------|--------|
| `ambient-pad-01.mp3` | Deep, warm synth pad (C2, gentle oscillation) | 60s loop | Stereo, 128kbps |
| `ambient-pad-02.mp3` | Ethereal high harmonics (C4+G4, subtle shimmer) | 60s loop | Stereo, 128kbps |
| `ambient-drone-earth.mp3` | Low rumble reminiscent of earth/wind | 120s loop | Stereo, 128kbps |

**Generation Prompts (for AI music tools like Suno, Udio, or Stable Audio):**

```
Prompt 1 - Deep Pad:
"Ambient meditation pad, deep warm synthesizer drone in C major,
very slow oscillation, no melody, no rhythm, seamless loop,
60 seconds, suitable for breathing meditation, low frequencies
emphasized, gentle and calming, spa-like atmosphere"

Prompt 2 - High Harmonics:
"Ethereal ambient shimmer, high frequency pad, crystal-like
harmonics in C and G, airy and spacious, no beat, seamless loop,
60 seconds, meditation background, angelic choir-like texture"

Prompt 3 - Earth Drone:
"Deep earth tone ambient drone, low rumbling texture like wind
through mountains, grounding and stable, no melody, meditative,
120 seconds seamless loop, 432Hz tuning preferred"
```

### 3.2 Breath-Synchronized Sounds

**Purpose:** Audio cues that respond to breath phases (inhale/hold/exhale/hold).

| Sound | Phase | Description | Duration | Trigger |
|-------|-------|-------------|----------|---------|
| `breath-inhale-rise.mp3` | Inhale (0-3s) | Rising tone, filtered sweep upward | 3s | Phase start |
| `breath-hold-sustain.mp3` | Hold-in (3-8s) | Stable harmonic, slight vibrato | 5s | Phase start |
| `breath-exhale-fall.mp3` | Exhale (8-13s) | Falling tone, filter sweep downward | 5s | Phase start |
| `breath-hold-release.mp3` | Hold-out (13-16s) | Subtle release, quiet anticipation | 3s | Phase start |

**Generation Prompts:**

```
Prompt - Inhale Rise:
"Gentle rising tone for breathing inhale, soft synthesizer
sweeping upward over 3 seconds, starts quiet and builds slightly,
filter opening, hopeful and expansive feeling, meditation sound"

Prompt - Hold Sustain:
"Calm sustained tone for breath hold, stable harmonic drone,
very subtle vibrato, peaceful and still, 5 seconds, meditation
breathing exercise audio cue, neither rising nor falling"

Prompt - Exhale Fall:
"Soft descending tone for breathing exhale, gentle filter
closing over 5 seconds, releasing and relaxing feeling,
synthesizer gliding downward, meditation sound effect"

Prompt - Hold Release:
"Quiet anticipation tone for breath hold, minimal sound,
soft presence, 3 seconds, preparing for next inhale,
subtle pad, meditation breathing pause audio"
```

### 3.3 Nature Soundscapes (Optional Layer)

**Purpose:** Natural ambient sounds that can be mixed in for different "environments."

| Sound | Environment | Description | Duration |
|-------|-------------|-------------|----------|
| `nature-ocean-waves.mp3` | Ocean | Gentle waves, no seagulls | 120s loop |
| `nature-forest-birds.mp3` | Forest | Distant birds, rustling leaves | 120s loop |
| `nature-rain-soft.mp3` | Rain | Soft rainfall, no thunder | 120s loop |
| `nature-wind-gentle.mp3` | Wind | Gentle breeze, occasional gusts | 120s loop |
| `nature-night-crickets.mp3` | Night | Crickets, peaceful night | 120s loop |

**Generation Prompts:**

```
Prompt - Ocean Waves:
"Gentle ocean waves ambient sound, calm beach atmosphere,
rhythmic waves lapping shore, no seagulls or voices,
peaceful meditation background, 120 seconds seamless loop,
high quality field recording style"

Prompt - Forest:
"Forest ambience, distant bird songs, gentle rustling leaves,
peaceful woodland atmosphere, no wind noise, meditation
background, 120 seconds seamless loop, calming nature sounds"

Prompt - Soft Rain:
"Soft rainfall ambient sound, gentle rain on leaves, no thunder,
cozy and calming, meditation background, 120 seconds seamless
loop, ASMR-like rain texture, peaceful"

Prompt - Gentle Wind:
"Gentle wind ambient sound, soft breeze through trees,
occasional light gusts, peaceful and airy, meditation
background, 120 seconds seamless loop, no harsh sounds"

Prompt - Night Crickets:
"Peaceful night ambience, distant crickets, occasional owl,
starry night feeling, meditation background, 120 seconds
seamless loop, calm and serene nighttime sounds"
```

### 3.4 Transition Chimes (Phase Boundaries)

**Purpose:** Subtle audio cues at phase transitions (optional, disabled by default).

| Sound | Transition | Description |
|-------|------------|-------------|
| `chime-inhale-start.mp3` | → Inhale | Soft rising bell, hopeful |
| `chime-exhale-start.mp3` | → Exhale | Soft falling bell, releasing |
| `chime-hold-start.mp3` | → Hold | Very subtle ping, stillness |

**Generation Prompts:**

```
Prompt - Rising Bell:
"Single soft bell chime, gentle rising tone, meditation bell,
peaceful and hopeful, 1.5 seconds with natural decay,
not harsh or startling, suitable for breathing exercise cue"

Prompt - Falling Bell:
"Single soft bell chime, gentle falling tone, meditation bell,
releasing and calming, 1.5 seconds with natural decay,
soothing transition sound"

Prompt - Stillness Ping:
"Very subtle ping sound, almost imperceptible, meditation
marker sound, 0.5 seconds, minimal and zen-like,
Tibetan singing bowl style, quiet"
```

### 3.5 Binaural/Generative Tones (Synthesized)

**Purpose:** Generated in real-time using Tone.js synthesizers. No audio files needed.

| Tone | Frequency | Description |
|------|-----------|-------------|
| Theta Binaural | 4-8 Hz difference | Deep relaxation, meditation state |
| Alpha Binaural | 8-12 Hz difference | Calm focus, light meditation |
| Base Drone | 136.1 Hz | "Om" frequency, grounding tone |

**Implementation (Tone.js):**

```typescript
// Binaural beat generator
const leftOsc = new Tone.Oscillator(136.1, 'sine').toDestination();
const rightOsc = new Tone.Oscillator(140.1, 'sine').toDestination(); // 4Hz difference

// Modulate frequency based on breath phase
useFrame(() => {
  const breathEntity = world.queryFirst(easedProgress);
  const progress = breathEntity?.get(easedProgress)?.value ?? 0;

  // Sweep frequency during inhale/exhale
  leftOsc.frequency.value = 136.1 + (progress * 10); // 136-146 Hz
});
```

## 4. Audio Mixing Architecture

### Layer Stack (Bottom to Top)

```
┌─────────────────────────────────────────────────────────┐
│  Master Output (masterVolume trait)                      │
├─────────────────────────────────────────────────────────┤
│  Reverb Bus (Space/depth)                               │
├─────────────────────────────────────────────────────────┤
│  Layer 4: Transition Chimes (if enabled)    [0-10%]     │
├─────────────────────────────────────────────────────────┤
│  Layer 3: Breath-Sync Tones                 [20-30%]    │
├─────────────────────────────────────────────────────────┤
│  Layer 2: Nature Soundscape (selectable)    [30-40%]    │
├─────────────────────────────────────────────────────────┤
│  Layer 1: Ambient Drone Pad                 [40-50%]    │
└─────────────────────────────────────────────────────────┘
```

### Breath-Reactive Parameters

| Parameter | Inhale | Hold-In | Exhale | Hold-Out |
|-----------|--------|---------|--------|----------|
| Filter Cutoff | Opens (↑) | Stable (high) | Closes (↓) | Stable (low) |
| Reverb Wet | Decreases | Stable | Increases | Stable (high) |
| Volume Envelope | Rises | Sustain | Falls | Quiet |
| Pitch Modulation | +cents | Stable | -cents | Stable |

## 5. User Controls (Triplex-Editable Props)

```typescript
interface AudioProps {
  /**
   * Enable/disable all audio
   * @default false
   */
  audioEnabled?: boolean;

  /**
   * Master volume (0-1)
   * @min 0 @max 1 @step 0.05
   * @default 0.7
   */
  masterVolume?: number;

  /**
   * Ambient drone volume
   * @min 0 @max 1 @step 0.05
   * @default 0.5
   */
  ambientVolume?: number;

  /**
   * Breath-sync sounds volume
   * @min 0 @max 1 @step 0.05
   * @default 0.3
   */
  breathVolume?: number;

  /**
   * Nature soundscape selection
   * @enum ["none", "ocean", "forest", "rain", "wind", "night"]
   * @default "none"
   */
  natureSoundscape?: 'none' | 'ocean' | 'forest' | 'rain' | 'wind' | 'night';

  /**
   * Nature soundscape volume
   * @min 0 @max 1 @step 0.05
   * @default 0.3
   */
  natureVolume?: number;

  /**
   * Enable phase transition chimes
   * @default false
   */
  enableChimes?: boolean;

  /**
   * Enable binaural beats
   * @default false
   */
  enableBinaural?: boolean;

  /**
   * Binaural beat frequency difference (Hz)
   * @min 2 @max 12 @step 0.5
   * @default 4
   */
  binauralFrequency?: number;
}
```

## 6. Implementation Phases

### Phase 1: Foundation (MVP)
- [ ] Install Tone.js dependency
- [ ] Create AudioEntity component with audio context initialization
- [ ] Implement audioSystem that reads breath traits
- [ ] Add basic ambient drone layer
- [ ] Add master volume control

### Phase 2: Breath Synchronization
- [ ] Implement filter sweeps tied to breath phase
- [ ] Add breath-sync audio files
- [ ] Create phase transition detection
- [ ] Add envelope generators for smooth transitions

### Phase 3: Soundscapes
- [ ] Add nature soundscape layers
- [ ] Implement soundscape selection UI
- [ ] Add crossfade between soundscapes

### Phase 4: Advanced Features
- [ ] Binaural beat generator
- [ ] Transition chimes (optional)
- [ ] Spatial audio for presence particles
- [ ] Audio visualization integration

## 7. Dependencies to Add

```bash
npm install tone howler
npm install --save-dev @types/howler
```

**Bundle size impact:**
- Tone.js: ~300KB (tree-shakeable to ~150KB)
- Howler.js: ~7KB (core) + ~2KB (spatial plugin)

## 8. Performance Considerations

1. **Audio Context Lazy Initialization**: Don't create AudioContext until user interacts (browser autoplay policy)

2. **Smooth Parameter Updates**: Use Tone.js signal smoothing instead of raw value assignment
   ```typescript
   filter.frequency.rampTo(newValue, 0.1); // 100ms ramp
   ```

3. **Memoize Audio Nodes**: Create Tone.js nodes in useEffect, not useFrame

4. **Dispose on Unmount**: All Tone.js nodes must call `.dispose()` on cleanup

5. **Suspend When Hidden**: Pause audio context when tab is hidden
   ```typescript
   document.addEventListener('visibilitychange', () => {
     if (document.hidden) Tone.Transport.pause();
     else Tone.Transport.start();
   });
   ```

## 9. Audio File Specifications

| Property | Requirement |
|----------|-------------|
| Format | MP3 (widest compatibility) or OGG (better quality/size) |
| Sample Rate | 44.1kHz or 48kHz |
| Bit Rate | 128-192kbps (balance quality/size) |
| Channels | Stereo (for spatial effects) |
| Normalization | -3dB peak (headroom for mixing) |
| Loop Points | Seamless (no click at loop boundary) |

## 10. Sources & References

- [Tone.js Documentation](https://tonejs.github.io/)
- [Howler.js](https://howlerjs.com/)
- [Web Audio API Best Practices (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)
- [How to Add Audio to React Three Fiber](https://waelyasmina.net/articles/how-to-add-audio-to-a-react-three-fiber-app/)
- [@react-three/drei PositionalAudio](https://drei.docs.pmnd.rs/abstractions/positional-audio)
