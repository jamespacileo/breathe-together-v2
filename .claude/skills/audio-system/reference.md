# Audio System Reference

Technical reference for the audio system architecture.

## Design Principles

### 1. Audio Supports the Experience

The breathing meditation is primarily visual. Audio enhances but never replaces:
- Visual cues remain the primary guide for breathing
- Users can disable audio entirely without losing functionality
- Audio should feel like a natural extension, not an overlay

### 2. Everything Breathes Together

Just as particles and the sphere respond to breath phases, audio should too:
- Volume modulates with the breath cycle
- Filter frequencies can sweep with inhale/exhale
- Reverb/space can expand during holds

### 3. Layered Simplicity

Multiple simple layers create rich texture:
- Base: Ambient drone (constant foundation)
- Middle: Nature soundscape (breathes subtly)
- Top: Breath tones (phase-triggered accents)
- Optional: Transition chimes (punctuation)

### 4. Minimal Configuration

The registry pattern keeps things simple:
- One file defines all sounds
- Sensible defaults mean most fields are optional
- Adding a sound = drop file + one registry entry

---

## Sound Categories

### Ambient (`ambient/`)

**Purpose:** Foundational layer that plays continuously.

**Characteristics:**
- Loop: Always `true`
- Volume: Constant (no breath sync)
- Frequency: Low-mid (60-400Hz)
- Texture: Warm, enveloping, unobtrusive

**Examples:**
- Deep synth pad
- Om drone
- Earth rumble
- Tibetan bowl sustain

**Mixing:** -12dB base, maximum 2 layers simultaneously

---

### Breath (`breath/`)

**Purpose:** Phase-synchronized tones that mirror the breathing action.

**Characteristics:**
- Loop: Usually `false` (plays once per trigger)
- Volume: Swells with progress (quiet→loud→quiet)
- Frequency: Mid (400Hz-1.5kHz)
- Texture: Clear, directional, responsive

**Examples:**
- Rising tone (inhale)
- Sustained shimmer (hold)
- Falling tone (exhale)
- Quiet anticipation (hold-out)

**Mixing:** -18dB quiet, peaks at -6dB during active phases

---

### Nature (`nature/`)

**Purpose:** Environmental soundscape that creates ambiance.

**Characteristics:**
- Loop: Always `true`
- Volume: Breathes with cycle (70%→100%→70%)
- Frequency: Broadband but filtered (cut above 8kHz)
- Texture: Natural, immersive, variable

**Examples:**
- Ocean waves
- Forest birds
- Gentle rain
- Soft wind
- Night crickets

**Mixing:** -15dB base, only ONE active at a time

---

### Chimes (`chimes/`)

**Purpose:** Optional markers at phase transitions.

**Characteristics:**
- Loop: Always `false`
- Volume: Brief accent
- Frequency: High (2-6kHz)
- Texture: Clear, bell-like, natural decay

**Examples:**
- Singing bowl strike
- Soft bell
- Crystal ping

**Mixing:** -9dB, disabled by default

---

### UI (`ui/`)

**Purpose:** Interface feedback for buttons and controls.

**Characteristics:**
- Loop: Never
- Volume: Subtle
- Frequency: Mid-high
- Texture: Tactile, quick, unobtrusive

**Examples:**
- Toggle on/off
- Slider adjustment
- Menu interaction

**Mixing:** -12dB, very short duration (<0.3s)

---

## Breath Synchronization Patterns

### Pattern 1: Phase Trigger (One-Shot)

Sound plays once when entering a phase.

```typescript
{
  triggerPhase: 0,  // Play when entering inhale
  loop: false,
}
```

**Timeline:**
```
Phase:    | Inhale | Hold-In | Exhale | Hold-Out |
Sound:    |▶️ play  |         |        |          |
          |~~~~~~~~decay~~~~~>|        |          |
```

---

### Pattern 2: Progress-Following Volume

Volume follows `easedProgress` within each phase.

```typescript
{
  breathSync: {
    volumeMin: 0.3,
    volumeMax: 1.0,
    followProgress: true,
  },
}
```

**Timeline (Inhale phase, progress 0→1):**
```
Progress: 0.0 -------- 0.5 -------- 1.0
Volume:   0.3 -------- 0.65 ------- 1.0
          ↑ quiet     ↑ mid        ↑ loud
```

**Use case:** Rising/falling tones that mirror breath intensity

---

### Pattern 3: Phase-Specific Volumes

Different target volume per phase, with smooth transitions.

```typescript
{
  breathSync: {
    phaseVolumes: [0.85, 1.0, 0.85, 0.7],
    //            inhale hold-in exhale hold-out
  },
}
```

**Timeline:**
```
Phase:    | Inhale | Hold-In | Exhale | Hold-Out |
Volume:   |  0.85  |   1.0   |  0.85  |   0.7    |
          |  ↗     |  peak   |   ↘    |  quiet   |
```

**Use case:** Nature soundscapes that "breathe" with the cycle

---

### Pattern 4: Constant (No Sync)

Sound plays at constant volume, unaffected by breathing.

```typescript
{
  // No breathSync field
  baseVolume: -12,
}
```

**Use case:** Foundation drone that anchors the mix

---

## Volume and dB Reference

### dB to Perceived Loudness

| dB | Multiplier | Perception |
|----|------------|------------|
| 0 | 1.0 | Maximum (clipping risk) |
| -3 | 0.71 | Very loud |
| -6 | 0.5 | Loud |
| -9 | 0.35 | Moderate |
| -12 | 0.25 | Medium |
| -15 | 0.18 | Quiet |
| -18 | 0.13 | Very quiet |
| -24 | 0.06 | Barely audible |

### Recommended Levels

| Layer | Base dB | Peak dB | Notes |
|-------|---------|---------|-------|
| Master | -3 | -3 | Headroom for mixing |
| Ambient | -12 | -12 | Constant foundation |
| Breath | -18 | -6 | Swells during active phases |
| Nature | -15 | -12 | Breathes subtly |
| Chimes | -9 | -9 | Brief accents |
| UI | -12 | -12 | Quick feedback |

---

## Fade Timing Reference

### Recommended Fade Durations

| Sound Type | Fade In | Fade Out | Notes |
|------------|---------|----------|-------|
| Ambient drone | 2s | 2s | Slow, unnoticeable |
| Breath tone (inhale) | 0.3s | 0.5s | Quick attack, gentle release |
| Breath tone (exhale) | 0.3s | 0.8s | Quick attack, longer release |
| Nature soundscape | 3s | 3s | Gradual, immersive |
| Transition chime | 0s | 0s | Natural bell decay |
| UI feedback | 0s | 0s | Instant |

### Crossfade Between Soundscapes

When switching nature sounds, use 3s crossfade:
```
Sound A: ████████████╲_______________
Sound B: _______________╱████████████
         |--- 3s ---|
```

---

## Frequency Spectrum Allocation

### Why Frequency Separation Matters

When two sounds occupy the same frequency range, they compete ("mask" each other). The result sounds muddy or harsh.

### Recommended Ranges

| Layer | Low (60-200) | Mid-Low (200-400) | Mid (400-1.5k) | Mid-High (1.5-4k) | High (4-8k) |
|-------|--------------|-------------------|----------------|-------------------|-------------|
| Ambient | ████ | ████ | | | |
| Breath | | | ████ | ████ | |
| Nature | ░░░░ | ░░░░ | ░░░░ | ░░░░ | (filtered) |
| Chimes | | | | ████ | ████ |

- ████ = Primary content
- ░░░░ = Reduced (filtered or quieter)

### Filtering Nature Sounds

Apply low-pass filter to nature sounds (cut above 8kHz) to:
1. Reduce harshness
2. Create sense of distance
3. Leave space for chimes

---

## Audio Context and Browser Policies

### Autoplay Policy

Modern browsers block audio until user interaction. The pattern:

```typescript
// Audio stays suspended until clicked
const enableAudio = async () => {
  await Tone.start();  // Resumes AudioContext
  // Now audio can play
};

// Button onClick triggers this
<button onClick={enableAudio}>Enable Audio</button>
```

### Visibility API

Pause audio when tab is hidden to save resources:

```typescript
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    Tone.Transport.pause();
  } else {
    Tone.Transport.start();
  }
});
```

---

## Performance Considerations

### Loading Strategy

1. **Lazy load** - Don't load audio until user enables it
2. **Progressive load** - Load ambient first, then others
3. **Preload critical** - Buffer breath tones fully before use

### Memory Management

- Tone.js players must be `.dispose()`d on unmount
- Audio buffers can be large (1-2MB per minute of stereo audio)
- Target: <10MB total for all audio files

### CPU Impact

- Audio runs on separate thread (Web Audio API)
- Per-frame volume updates are cheap (~0.1ms)
- Avoid creating/destroying audio nodes frequently

---

## Testing Audio

### Manual Testing Checklist

- [ ] Audio enables after button click
- [ ] Ambient drone plays continuously
- [ ] Breath tones trigger at correct phases
- [ ] Nature soundscape loops seamlessly
- [ ] Volume breathes with the cycle
- [ ] No clicks or pops at loop points
- [ ] Sounds blend pleasantly (no clashing)
- [ ] Audio pauses when tab hidden
- [ ] Audio resumes when tab visible
- [ ] Master volume control works
- [ ] Soundscape switching crossfades

### Browser Testing

Test on:
- Chrome (primary target)
- Firefox
- Safari (may have different autoplay behavior)
- Mobile browsers (touch to enable)
