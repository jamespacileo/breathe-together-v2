---
name: audio-system
description: Manage atmospheric audio for breathe-together-v2. Add new sounds, configure breath synchronization, adjust mixing, and debug audio issues. Includes registry pattern, Tone.js integration, and breath-phase volume envelopes. Covers ambient drones, breath tones, nature soundscapes, and transition chimes.
allowed-tools: [Read, Write, Edit, Glob, Grep, Bash(npm:*)]
---

# Audio System Skill

Manage atmospheric audio that enhances the breathing meditation experience.

## Design Intent & Goals

### Core Philosophy

Audio in breathe-together-v2 is **atmospheric, not instructional**. The sounds should:

1. **Support, not lead** - Audio enhances the visual breathing cues, never replaces them
2. **Breathe with the user** - Volume, filters, and textures respond to breath phases
3. **Create presence** - Ambient layers make the space feel alive and inhabited
4. **Remain optional** - The app works perfectly without audio; it's an enhancement layer

### Emotional Goals

| Phase | Feeling | Audio Response |
|-------|---------|----------------|
| Inhale | Expansion, hope, gathering | Volume rises, filters open, brightness increases |
| Hold-in | Stillness, presence, fullness | Stable, sustained, subtle shimmer |
| Exhale | Release, letting go, softening | Volume falls, filters close, warmth increases |
| Hold-out | Quiet, anticipation, emptiness | Near-silence, gentle presence, space |

### Technical Goals

- **Seamless loops** - No audible click or gap when sounds repeat
- **Smooth transitions** - All parameter changes use ramping (no harsh cuts)
- **Layered mixing** - Multiple sounds blend without clashing
- **Performance** - Audio processing doesn't impact 60fps rendering

---

## Mode Selection

Choose your workflow:

- **[Mode 1: Add a New Sound](#mode-1-add)** - Drop a file, register it, done
- **[Mode 2: Configure Breath Sync](#mode-2-breath-sync)** - Make sounds respond to breathing
- **[Mode 3: Adjust Mixing](#mode-3-mixing)** - Balance volume levels and frequencies
- **[Mode 4: Debug Audio Issues](#mode-4-debug)** - Fix playback, sync, or mixing problems

---

## Mode 1: Add a New Sound {#mode-1-add}

Adding a sound is a 2-step process.

### Step 1: Drop the File

Place your audio file in the correct folder:

```
public/audio/
├── ambient/     # Continuous drones (loop forever)
├── breath/      # Phase-triggered tones (play once per phase)
├── nature/      # Soundscape layers (one active at a time)
├── chimes/      # Transition markers (optional, short one-shots)
└── ui/          # Interface feedback (button clicks, toggles)
```

**File Requirements:**
- Format: MP3 (compatibility) or OGG (quality)
- Sample rate: 44.1kHz
- Bit rate: 128-192kbps
- Channels: Stereo
- Peak level: -3dB (headroom for mixing)
- Loops: Must be seamless (no click at boundary)

### Step 2: Register in Registry

Open `src/audio/registry.ts` and add an entry:

```typescript
// ─────────────────────────────────────────────────────
// NATURE SOUNDSCAPES
// ─────────────────────────────────────────────────────
'nature/waterfall': {
  path: '/audio/nature/waterfall.mp3',
  category: 'nature',
  loop: true,
  baseVolume: -15,      // dB (quieter = more negative)
  fadeIn: 3,            // seconds
  fadeOut: 3,           // seconds
  breathSync: {
    volumeMin: 0.7,     // Volume during hold-out (quietest)
    volumeMax: 1.0,     // Volume during hold-in (loudest)
    phaseVolumes: [0.85, 1.0, 0.85, 0.7], // Per-phase targets
  },
},
```

### Registry Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `path` | string | Yes | URL path from public folder |
| `category` | string | Yes | `ambient`, `breath`, `nature`, `chimes`, `ui` |
| `loop` | boolean | No | True for continuous sounds |
| `baseVolume` | number | Yes | Base level in dB (-20 to 0) |
| `fadeIn` | number | Yes | Attack time in seconds |
| `fadeOut` | number | Yes | Release time in seconds |
| `triggerPhase` | number | No | 0-3, for phase-triggered sounds |
| `breathSync` | object | No | Breath synchronization config |

### Done!

The audio system automatically loads and manages the new sound.

---

## Mode 2: Configure Breath Sync {#mode-2-breath-sync}

Make sounds respond to the breathing cycle.

### Option A: Phase-Triggered Sounds

Play a sound when entering a specific phase:

```typescript
'breath/inhale': {
  path: '/audio/breath/inhale.mp3',
  category: 'breath',
  triggerPhase: 0,      // 0=inhale, 1=hold-in, 2=exhale, 3=hold-out
  baseVolume: -6,
  fadeIn: 0.3,
  fadeOut: 0.5,
},
```

### Option B: Progress-Following Volume

Volume follows `easedProgress` (0→1) within each phase:

```typescript
'breath/inhale': {
  // ...
  breathSync: {
    volumeMin: 0.3,       // Start quiet
    volumeMax: 1.0,       // End loud
    followProgress: true, // Volume = min + (max-min) * progress
  },
},
```

**Use for:** Rising tones, falling tones, swells

### Option C: Phase-Specific Volumes

Different target volume for each phase (with smooth transitions):

```typescript
'nature/ocean': {
  // ...
  breathSync: {
    volumeMin: 0.7,
    volumeMax: 1.0,
    followProgress: false,
    phaseVolumes: [0.85, 1.0, 0.85, 0.7],
    //             ↑      ↑     ↑      ↑
    //           inhale hold-in exhale hold-out
  },
},
```

**Use for:** Nature soundscapes, ambient drones

### Breath Phase Reference

| Phase | Index | Duration | breathPhase | Feeling |
|-------|-------|----------|-------------|---------|
| Inhale | 0 | 3s | 0→1 | Rising, expanding |
| Hold-in | 1 | 5s | ~1 | Full, still |
| Exhale | 2 | 5s | 1→0 | Falling, releasing |
| Hold-out | 3 | 3s | ~0 | Empty, quiet |

---

## Mode 3: Adjust Mixing {#mode-3-mixing}

Balance sounds so they work together pleasantly.

### Volume Hierarchy

Follow this relative loudness:

```
Layer                    Base Volume    During Breath Peak
─────────────────────────────────────────────────────────
Master                   -3dB           -3dB
├─ Ambient Drones        -12dB          -12dB (constant)
├─ Breath Tones          -18dB          -6dB (swells)
├─ Nature Soundscape     -18dB          -12dB (breathes)
└─ Chimes                -15dB          -9dB (punctuates)
```

### Frequency Allocation

Avoid sounds competing in the same frequency range:

```
         Low          Mid-Low       Mid          Mid-High      High
         60-200Hz     200-400Hz     400-1.5kHz   1.5-4kHz      4-8kHz
         ─────────────────────────────────────────────────────────────
Drones   ████████████ ████████                               (low)
Breath                             ████████████ ████████     (mid)
Nature   ░░░░░░░░░░░░ ░░░░░░░░░░░░ ░░░░░░░░░░░░ ░░░░░░░░░░░░ (filtered)
Chimes                                          ████████████ (high)
```

### Mixing Rules

1. **Maximum 4 simultaneous layers** - Master + 3 sound sources
2. **Only 1 nature soundscape at a time** - Crossfade when switching
3. **Drones are constant** - They don't respond to breathing (foundation)
4. **Breath tones peak during active phases** - Inhale/exhale are loudest
5. **Nature sounds "breathe"** - Volume modulates 70%→100%→70%

### Adjusting Volume

Change `baseVolume` in registry (in dB):

| dB | Perception |
|----|------------|
| 0 | Maximum (too loud) |
| -6 | Loud |
| -12 | Medium |
| -18 | Quiet |
| -24 | Very quiet |

---

## Mode 4: Debug Audio Issues {#mode-4-debug}

### Issue: Sound Not Playing

**Check 1:** Is the file in the correct folder?
```bash
ls public/audio/{category}/
```

**Check 2:** Is the path correct in registry?
```typescript
// Path must match exactly (case-sensitive)
path: '/audio/nature/ocean.mp3',  // Starts with /
```

**Check 3:** Is the category enabled?
```typescript
// In AudioProvider state
ambientEnabled: true,   // For 'ambient' category
breathEnabled: true,    // For 'breath' category
natureSound: 'nature/ocean',  // For 'nature' category (not null)
chimesEnabled: true,    // For 'chimes' category
```

**Check 4:** Has user interacted?
```
Browser autoplay policy requires user interaction before audio.
The "Enable Audio" button must be clicked first.
```

### Issue: Sound Too Quiet/Loud

Adjust `baseVolume` in registry:
```typescript
baseVolume: -12,  // Try -9 for louder, -15 for quieter
```

### Issue: Sound Clicks at Loop Point

The audio file needs editing:
1. Open in audio editor (Audacity, Logic, etc.)
2. Find the loop point
3. Apply crossfade at start/end
4. Re-export with seamless loop

### Issue: Breath Sync Not Working

**Check 1:** Does the sound have `breathSync` config?
```typescript
breathSync: {
  volumeMin: 0.7,
  volumeMax: 1.0,
  // ...
},
```

**Check 2:** Is the sound playing? (check console for errors)

**Check 3:** Is the volume range large enough?
```typescript
// Too subtle (10% difference)
volumeMin: 0.9, volumeMax: 1.0

// Noticeable (30% difference)
volumeMin: 0.7, volumeMax: 1.0
```

### Issue: Sounds Clashing

Two sounds are fighting in the same frequency range:

1. **Identify the clash** - Listen for "muddy" or "harsh" mix
2. **Check frequency allocation** - See chart above
3. **Reduce one sound's volume** - Lower the less important layer
4. **Apply filtering** - Add low-pass to nature sounds (cut highs)

---

## File Structure

```
src/audio/
├── index.ts              # Public API exports
├── registry.ts           # ★ Sound definitions (ADD SOUNDS HERE)
├── types.ts              # TypeScript interfaces
├── audioSystem.ts        # ECS system (reads breath, controls playback)
├── AudioEngine.ts        # Tone.js wrapper
└── AudioProvider.tsx     # React context + useAudio hook

public/audio/
├── ambient/              # Continuous drones
├── breath/               # Phase-triggered tones
├── nature/               # Soundscape options
├── chimes/               # Transition markers
└── ui/                   # Interface feedback
```

---

## Quick Reference: Adding Common Sound Types

### Ambient Drone (loops forever, constant volume)

```typescript
'ambient/my-drone': {
  path: '/audio/ambient/my-drone.mp3',
  category: 'ambient',
  loop: true,
  baseVolume: -12,
  fadeIn: 2,
  fadeOut: 2,
},
```

### Breath Tone (triggered per phase, volume follows progress)

```typescript
'breath/my-inhale': {
  path: '/audio/breath/my-inhale.mp3',
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
```

### Nature Soundscape (loops, volume breathes with cycle)

```typescript
'nature/my-nature': {
  path: '/audio/nature/my-nature.mp3',
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

### Transition Chime (one-shot, plays at phase boundary)

```typescript
'chimes/my-bell': {
  path: '/audio/chimes/my-bell.mp3',
  category: 'chimes',
  triggerPhase: 0,
  baseVolume: -9,
  fadeIn: 0,
  fadeOut: 0,
},
```

---

## Integration with Other Skills

### Relationship to breathing-sync

Audio synchronization uses the same breath traits (`breathPhase`, `phaseType`, `easedProgress`) as visual synchronization. The patterns are analogous:
- Visual: Scale/opacity modulated by breathPhase
- Audio: Volume/filter modulated by breathPhase

### Relationship to ecs-entity

The audio system integrates with ECS via `audioSystem` running after `breathSystem` in the pipeline. It queries breath traits the same way visual entities do.

---

## Reference Materials

- [01-audio-architecture-plan.md](../../../docs/audio/01-audio-architecture-plan.md) - Architecture decisions
- [02-sound-asset-checklist.md](../../../docs/audio/02-sound-asset-checklist.md) - Sound file checklist
- [03-implementation-plan.md](../../../docs/audio/03-implementation-plan.md) - Implementation phases

---

## Troubleshooting Checklist

When audio isn't working:

- [ ] File exists in `public/audio/{category}/`
- [ ] Path in registry matches exactly (with leading `/`)
- [ ] Category is enabled in AudioProvider state
- [ ] User has clicked "Enable Audio" button
- [ ] No console errors related to audio loading
- [ ] `baseVolume` is not too quiet (try -6 to test)
- [ ] If breath-synced, `breathSync` config is present
- [ ] Volume range is noticeable (min/max differ by >20%)

---

Let's make it sound beautiful! 🎵
