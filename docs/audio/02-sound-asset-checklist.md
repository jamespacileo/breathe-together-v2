# Sound Asset Checklist

Track progress on gathering sound files. Two passes:
1. **Placeholder**: Free/stock sounds for development testing
2. **Final**: Custom-generated or high-quality licensed sounds

## Status Legend
- [ ] Not started
- [P] Placeholder found
- [x] Final version ready

---

## 1. Ambient Drone Layer

These play continuously as the foundation. Should occupy **low-mid frequencies (60-400Hz)**.

| Status | File | Frequency Range | Duration | Description | Placeholder Sources |
|--------|------|-----------------|----------|-------------|---------------------|
| [ ] | `ambient-pad-warm.mp3` | 60-200Hz | 60s loop | Deep warm synth pad, C2 root, slow gentle oscillation | Freesound: "meditation drone", "synth pad loop" |
| [ ] | `ambient-pad-high.mp3` | 800-2kHz | 60s loop | Ethereal shimmer, C4+G4 harmonics, airy texture | Freesound: "ambient shimmer", "ethereal pad" |
| [ ] | `ambient-om-drone.mp3` | 130-140Hz | 120s loop | Om frequency (136.1Hz), grounding hum | Freesound: "om drone", "tibetan bowl drone" |

**Mixing notes:**
- Layer 1-2 drones maximum at once
- Keep combined level at -12dB to leave headroom
- These should feel like "audio wallpaper" - present but not attention-grabbing

---

## 2. Breath-Synchronized Tones

Triggered at phase transitions. Should occupy **mid frequencies (400-1.5kHz)** to sit above drones.

| Status | File | Phase | Duration | Description | Fade Behavior | Placeholder Sources |
|--------|------|-------|----------|-------------|---------------|---------------------|
| [ ] | `breath-inhale.mp3` | Inhale | 3s | Rising tone, filter opens, hopeful feeling | Fade in 0.3s, natural decay | Freesound: "rising tone", "breath sound ascending" |
| [ ] | `breath-hold-in.mp3` | Hold-in | 5s | Stable sustained tone, subtle shimmer | Fade in 0.5s, fade out 0.5s | Freesound: "sustained note", "hold tone" |
| [ ] | `breath-exhale.mp3` | Exhale | 5s | Falling tone, filter closes, releasing | Fade in 0.3s, natural decay | Freesound: "descending tone", "exhale sound" |
| [ ] | `breath-hold-out.mp3` | Hold-out | 3s | Near-silence, quiet anticipation | Fade in 0.3s, fade out 0.3s | Freesound: "quiet ambient", "silence texture" |

**Mixing notes:**
- These should "breathe" with the user - volume envelope matches breath intensity
- Peak at -6dB during inhale/exhale, -18dB during holds
- Use gentle attack/release (300-500ms) to avoid harsh transitions

---

## 3. Nature Soundscapes

Optional ambient layer. User selects one at a time. **Broadband (full spectrum)** but mixed quietly.

| Status | File | Duration | Description | Loop Strategy | Placeholder Sources |
|--------|------|----------|-------------|---------------|---------------------|
| [ ] | `nature-ocean.mp3` | 120s | Gentle waves lapping, no seagulls/voices | Seamless loop, breath-sync volume modulation | Freesound: "ocean waves calm", "sea ambient" |
| [ ] | `nature-forest.mp3` | 120s | Distant birds, rustling leaves, peaceful | Seamless loop, breath-sync volume modulation | Freesound: "forest ambience", "woodland birds" |
| [ ] | `nature-rain.mp3` | 120s | Soft rainfall on leaves, no thunder | Seamless loop, breath-sync volume modulation | Freesound: "gentle rain", "rain on leaves" |
| [ ] | `nature-wind.mp3` | 120s | Gentle breeze, occasional soft gusts | Seamless loop, breath-sync volume modulation | Freesound: "gentle wind", "breeze ambient" |
| [ ] | `nature-night.mp3` | 120s | Crickets, distant owl, peaceful night | Seamless loop, breath-sync volume modulation | Freesound: "night ambience", "crickets peaceful" |

**Breath-sync volume modulation (critical for long sounds):**
```
Inhale:  Volume ramps 70% → 100% over 3s (fade in with breath)
Hold-in: Volume holds at 100%
Exhale:  Volume ramps 100% → 70% over 5s (fade out with breath)
Hold-out: Volume holds at 70% (quiet but present)
```

**Mixing notes:**
- Nature sounds at -15dB max (background layer)
- Apply gentle low-pass filter (cut above 8kHz) to soften harshness
- Only ONE nature soundscape active at a time

---

## 4. Transition Chimes (Optional)

Short one-shots at phase boundaries. **High frequencies (2-6kHz)** to cut through.

| Status | File | Trigger | Duration | Description | Placeholder Sources |
|--------|------|---------|----------|-------------|---------------------|
| [ ] | `chime-inhale.mp3` | → Inhale | 1.5s | Soft rising bell, hopeful | Freesound: "meditation bell", "singing bowl" |
| [ ] | `chime-exhale.mp3` | → Exhale | 1.5s | Soft falling bell, releasing | Freesound: "bell descending", "chime down" |
| [ ] | `chime-hold.mp3` | → Hold | 0.8s | Very subtle ping, stillness marker | Freesound: "subtle ping", "soft chime" |

**Mixing notes:**
- Chimes at -9dB (audible but not jarring)
- Long natural reverb tail (2-3s decay)
- Disabled by default - optional feature

---

## 5. UI Feedback Sounds (Optional)

Micro-interactions for buttons/toggles. **Very short, subtle.**

| Status | File | Trigger | Duration | Description | Placeholder Sources |
|--------|------|---------|----------|-------------|---------------------|
| [ ] | `ui-toggle-on.mp3` | Enable audio | 0.2s | Soft "pop" or gentle click | Freesound: "soft click", "ui pop" |
| [ ] | `ui-toggle-off.mp3` | Disable audio | 0.2s | Softer reverse pop | Freesound: "click off", "toggle sound" |
| [ ] | `ui-slider.mp3` | Volume change | 0.1s | Tiny tick (optional) | Freesound: "slider tick" |

**Mixing notes:**
- UI sounds at -12dB
- Should feel tactile but not interrupt meditation

---

## Mixing Guidelines: Making It All Sound Good Together

### Frequency Allocation (avoid clashing)

```
         Low          Mid-Low       Mid          Mid-High      High
         60-200Hz     200-400Hz     400-1.5kHz   1.5-4kHz      4-8kHz
         ─────────────────────────────────────────────────────────────
Drones   ████████████ ████████
Breath                             ████████████ ████████
Nature   ░░░░░░░░░░░░ ░░░░░░░░░░░░ ░░░░░░░░░░░░ ░░░░░░░░░░░░ (filtered)
Chimes                                          ████████████ ████████
```

### Volume Hierarchy (relative levels)

```
Layer                    Base Level    During Breath Peak
─────────────────────────────────────────────────────────
Master                   -3dB          -3dB
├─ Ambient Drones        -12dB         -12dB (constant)
├─ Breath Tones          -18dB         -6dB (swells)
├─ Nature Soundscape     -18dB         -12dB (breathes)
└─ Chimes                -15dB         -9dB (punctuates)
```

### Fade Envelope Templates

**For continuous sounds (drones, nature):**
```
                    Inhale    Hold-In    Exhale    Hold-Out
                    (3s)      (5s)       (5s)      (3s)
Volume %    100 ─── ╱─────────────────╲
             70 ───╱                   ╲──────────────────
                   ↑                   ↑
               Fade In 0.5s        Fade Out 0.8s
```

**For breath tones (triggered each phase):**
```
Inhale Tone:     ╱╲___  (attack 0.3s, decay 2.7s)
Hold-In Tone:    ╱──╲   (attack 0.5s, sustain 4s, release 0.5s)
Exhale Tone:     ╱╲___  (attack 0.3s, decay 4.7s)
Hold-Out Tone:   ╱─╲    (attack 0.3s, sustain 2.4s, release 0.3s)
```

### Crossfade Rules

1. **Soundscape switching**: 3s crossfade between nature sounds
2. **Audio enable/disable**: 1s fade in/out for master
3. **Phase transitions**: Use envelope generators, not hard cuts
4. **Never** have more than 4 simultaneous sound sources

---

## Placeholder Sound Sources

### Free (Attribution Required)
- **Freesound.org** - Large library, search terms provided above
- **BBC Sound Effects** - High quality, free for personal use
- **Zapsplat.com** - Free tier available

### Free (No Attribution)
- **Pixabay Audio** - Royalty-free, no attribution
- **Mixkit.co** - Free sound effects
- **Uppbeat.io** - Free tier for ambient

### Paid (Higher Quality)
- **Artlist.io** - Subscription, meditation category
- **Epidemic Sound** - High quality ambiences
- **Splice** - Individual sound purchases

---

## Audio File Specifications

| Property | Requirement | Notes |
|----------|-------------|-------|
| Format | MP3 or OGG | MP3 for compatibility, OGG for quality |
| Sample Rate | 44.1kHz | Standard web audio |
| Bit Rate | 128-192kbps | Balance quality/size |
| Channels | Stereo | Required for spatial effects |
| Peak Level | -3dB | Headroom for mixing |
| Loop Points | Seamless | Critical for ambient sounds |
| Total Size | <10MB all files | Keep bundle reasonable |

---

## Progress Tracker

### Pass 1: Placeholders (Development)
- [ ] Find and download placeholder for each sound
- [ ] Test in application with mixing levels
- [ ] Verify fade in/out behavior works
- [ ] Confirm no frequency clashing
- [ ] Check total audio bundle size

### Pass 2: Final Sounds (Production)
- [ ] Generate or license final ambient drones
- [ ] Generate or license final breath tones
- [ ] Generate or license final nature soundscapes
- [ ] Generate or license final chimes (if using)
- [ ] Final mix balance pass
- [ ] User testing for pleasantness

---

## Quick Reference: What to Search For

Copy-paste these search terms:

**Freesound.org searches:**
```
Drones:     "meditation drone loop" OR "ambient pad seamless"
Breath:     "breath sound effect rising" OR "exhale tone"
Ocean:      "ocean waves calm loop" -seagull -voice
Forest:     "forest ambience birds" -traffic -highway
Rain:       "gentle rain loop" -thunder -storm
Wind:       "soft wind breeze loop" -harsh -storm
Night:      "night crickets peaceful" -traffic
Chimes:     "meditation bell soft" OR "singing bowl gentle"
```

**Pixabay searches:**
```
"meditation ambient", "breathing exercise music", "nature sounds calm"
```
