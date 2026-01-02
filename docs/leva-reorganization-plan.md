# Leva Panel Reorganization Plan

## Executive Summary

Reorganize the Leva dev controls from 11 top-level folders to 6 hierarchical groups, reducing visual clutter and improving discoverability. Changes target `src/hooks/useDevControls.ts`.

## Current Problems

1. **Panel too tall** - 11 top-level folders exceed screen height on laptop displays
2. **Flat hierarchy** - no conceptual grouping makes scanning difficult
3. **Fragmented colors** - Background Colors, Globe Colors, and Lighting split across 3 folders
4. **Mixed concerns** - Debug tools intermixed with creative parameters
5. **Overwhelming Performance folder** - 8+ toggles in one group

## Proposed Structure

### Before (11 top-level folders)
```
Presets
Glass Effect
Atmosphere
Background Colors
Lighting
Globe Colors
Depth of Field
Environment
Drag & Rotate
Debug
Performance Monitor
Audio (from useAudioDevControls)
```

### After (6 top-level folders)
```
1. Presets (not collapsed) ─────────── Quick access to save/load
2. Visual (collapsed) ───────────────┐
   ├─ Materials (not collapsed)     │
   │  └─ Glass Effect               │ Consolidated appearance controls
   ├─ Colors (collapsed)            │
   │  ├─ Background                 │
   │  ├─ Globe                      │
   │  └─ Lighting                   │
   ├─ Atmosphere (collapsed)        │
   └─ Environment (collapsed) ──────┘
3. Camera (collapsed) ───────────────── Depth of Field controls
4. Interaction (collapsed) ──────────── Drag & Rotate controls
5. Debug (collapsed) ────────────────┐
   ├─ Visualization                 │ Developer-only tools
   └─ Performance ──────────────────┘
6. Audio (collapsed) ────────────────── Audio dev controls
```

## Detailed Folder Breakdown

### 1. Presets
**Status:** Keep unchanged, top-level, not collapsed
**Contents:** Save Current, Load Preset, Delete Preset, Reset to Defaults, Export All, Import
**Rationale:** Most frequently used controls, deserve prominent placement

---

### 2. Visual (NEW - consolidates 7 folders into 1)
**Collapsed by default** to save space
**Sub-folders:**

#### 2.1 Materials (not collapsed when Visual is expanded)
**Why not collapsed:** Primary creative controls, frequently adjusted

| Parameter | Current Location | Help Text Enhancement |
|-----------|-----------------|----------------------|
| `ior` | Glass Effect | **Current:** "Index of Refraction. Controls how much light bends through glass shards. 1.0 = no refraction (air), 1.5 = glass, 2.4 = diamond." ✅ Good<br>**Recommendation:** Add "**When to adjust:** Increase for stronger distortion (2.0+), decrease for subtle frosting (1.1-1.3)" |
| `glassDepth` | Glass Effect | **Current:** "Controls backface normal blending. Higher = thicker glass appearance with more internal distortion."<br>**Recommendation:** Clarify: "Simulates glass thickness. **0.0** = paper-thin (minimal distortion), **0.5** = medium glass (balanced), **1.0** = thick crystal (strong backface effects)" |

#### 2.2 Colors (collapsed)
**Why collapsed:** Secondary adjustments, spatial savings
**Sub-folders within Colors:**

**2.2.1 Background**
| Parameter | Current Location | Help Text |
|-----------|-----------------|-----------|
| `bgColorTop` | Background Colors | "Color at top of gradient. **Adjust for:** Time of day mood (cooler blues for dawn, warmer creams for noon)" |
| `bgColorHorizon` | Background Colors | "Color at horizon. **Adjust for:** Depth contrast (darker for dramatic, lighter for ethereal)" |

**2.2.2 Globe**
| Parameter | Current Location | Help Text |
|-----------|-----------------|-----------|
| `globeRingColor` | Globe Colors | "Equatorial ring color. **Typical:** Rose gold (#e8c4b8) complements Monument Valley palette" |
| `globeRingOpacity` | Globe Colors | "Ring transparency. **0.05** = barely visible, **0.15** = subtle (default), **0.3+** = prominent" |
| `globeAtmosphereTint` | Globe Colors | "Atmosphere halo tint. **Affects:** Warmth of glow around Earth" |

**2.2.3 Lighting**
| Parameter | Current Location | Help Text Enhancement |
|-----------|-----------------|----------------------|
| `ambientLightColor` | Lighting | **Current:** Good ✅<br>**Add:** "**Interacts with:** Globe ring color, atmosphere tint (keep within same temperature)" |
| `ambientLightIntensity` | Lighting | **Current:** Good ✅<br>**Add:** "**Performance:** No impact; computed per-fragment" |
| `keyLightColor` | Lighting | **Current:** Good ✅ |
| `keyLightIntensity` | Lighting | **Current:** Good ✅<br>**Add:** "**Typical range:** Soft (0.5) → Balanced (0.8) → Dramatic (1.5+)" |

#### 2.3 Atmosphere (collapsed)
| Parameter | Current Location | Help Text Enhancement |
|-----------|-----------------|----------------------|
| `atmosphereColor` | Atmosphere | **Current:** Good ✅ |
| `atmosphereParticleSize` | Atmosphere | **Add:** "**Performance note:** Larger particles = more fill rate cost on mobile" |
| `atmosphereBaseOpacity` | Atmosphere | **Current:** Good ✅ |
| `atmosphereBreathingOpacity` | Atmosphere | **Current:** Good ✅<br>**Add:** "**Interacts with:** Base opacity (total = base + breathing at peak inhale)" |

#### 2.4 Environment (collapsed)
| Parameter | Current Location | Help Text Enhancement |
|-----------|-----------------|----------------------|
| `showClouds` | Environment | **Current:** Good ✅ |
| `showStars` | Environment | **Add:** "**Visibility:** Most noticeable with darker backgrounds (bgColorTop < #e0e0e0)" |
| `cloudOpacity` | Environment | **Current:** Good ✅ |
| `cloudSpeed` | Environment | **Current:** Good ✅ |

---

### 3. Camera
**Collapsed by default**
**Contents:** Depth of Field controls (moved from standalone folder)

| Parameter | Help Text Enhancement |
|-----------|----------------------|
| `enableDepthOfField` | **Add:** "**Performance cost:** ~2-3ms on mid-range GPUs" |
| `focusDistance` | **Current:** Good ✅<br>**Add:** "**Tip:** Use showOrbitBounds (Debug > Visualization) to visualize focus plane" |
| `focalRange` | **Add:** "**Scene context:** 8 = balanced for breathing meditation, 15+ = everything in focus" |
| `maxBlur` | **Add:** "**Interacts with:** Focal range (lower range = more blur visible)" |

---

### 4. Interaction
**Collapsed by default**
**Contents:** Drag & Rotate controls (moved from standalone folder)

| Parameter | Help Text Enhancement |
|-----------|----------------------|
| `dragSpeed` | **Current:** Good ✅ |
| `dragDamping` | **Add:** "**Recommendation:** Lower for responsive feel (0.08-0.12), higher for smooth cinematic (0.2-0.3)" |
| `dragMomentum` | **Current:** Good ✅ |
| `dragTimeConstant` | **Add:** "**iOS baseline:** 0.325s. Match for native app feel" |
| `dragVelocityMultiplier` | **Current:** Good ✅ |
| `dragMinVelocity` | **Add:** "**Typical:** 50px/s prevents accidental drift, 100px/s requires deliberate flick" |

---

### 5. Debug (consolidates 2 folders)
**Collapsed by default**
**Sub-folders:**

#### 5.1 Visualization
| Parameter | Current Location | Help Text Enhancement |
|-----------|-----------------|----------------------|
| `showOrbitBounds` | Debug | **Add:** "**Use case:** Verify particle breathing range matches orbitRadius setting" |
| `showPhaseMarkers` | Debug | **Add:** "**Shows:** Inhale/Hold/Exhale transition markers on timeline" |
| `showTraitValues` | Debug | **Add:** "**Displays:** Real-time ECS trait values (breathPhase, orbitRadius, sphereScale)" |

#### 5.2 Performance
| Parameter | Current Location | Help Text Enhancement |
|-----------|-----------------|----------------------|
| `showPerfMonitor` | Performance Monitor | **Rename to:** "Enable Monitor" |
| `perfPosition` | Performance Monitor | **Current:** Good ✅ |
| `perfMinimal` | Performance Monitor | **Add:** "**Use when:** Recording videos or reducing visual clutter" |
| `perfShowGraph` | Performance Monitor | **Add:** "**Tip:** Graphs show 60-frame history; useful for spotting stutter patterns" |
| `perfLogsPerSecond` | Performance Monitor | **Add:** "**Trade-off:** Higher sampling = more accurate stats but more overhead" |
| `perfAntialias` | Performance Monitor | **Add:** "Visual preference only; no impact on measurements" |
| `perfOverClock` | Performance Monitor | **Add:** "**Warning:** May add measurement overhead on low-end devices" |
| `perfDeepAnalyze` | Performance Monitor | **Add:** "**Shows:** GPU timing, draw calls, shader compilation time" |
| `perfMatrixUpdate` | Performance Monitor | **Add:** "**Normal range:** 300-500 for this scene (breathing + particles)" |

---

### 6. Audio
**Keep existing structure unchanged**
**Already well-organized** with sub-folders: Categories, Layer Volumes, Breath Sync, Actions, Debug

## Implementation Plan

### Phase 1: Backup & Preparation
1. Create git branch: `feature/leva-reorganization`
2. Backup current `useDevControls.ts` to `useDevControls.legacy.ts`
3. Document current behavior with screenshots

### Phase 2: Restructure Folders
1. Update folder nesting in `useControls()` schema
2. Adjust `collapsed` states according to new hierarchy
3. Update `order` properties to match new structure

### Phase 3: Enhance Help Text
1. Add "When to adjust" context to primary controls
2. Add "Typical range" landmarks for numeric params
3. Add "Interacts with" hints for related controls
4. Add "Performance note" where relevant

### Phase 4: Testing
1. Verify all controls still update state correctly
2. Check preset save/load functionality
3. Test panel height fits on 1080p laptop screen (when collapsed)
4. Validate help text clarity with fresh eyes

### Phase 5: Documentation
1. Update CLAUDE.md with new structure
2. Add migration notes for existing saved presets (if schema changes)
3. Screenshot new panel layout for future reference

## Code Changes Required

### File: `src/hooks/useDevControls.ts`

**Changes:**
1. Wrap related folders in parent folders (e.g., `Visual: folder({ Materials: folder(...), Colors: folder(...) })`)
2. Update `collapsed` boolean for each folder level
3. Reorder parameters to match new hierarchy
4. Update `hint` strings with enhanced help text
5. Adjust `order` property on top-level folders

**Estimated LOC changes:** ~150 lines modified (mostly restructuring, not new logic)

## Benefits

### For Developers
- **Faster iteration:** Related controls grouped logically
- **Less scrolling:** 6 top-level folders vs. 11 (fits laptop screens)
- **Better onboarding:** New team members understand organization faster

### For Artists/Designers
- **Clearer mental model:** Visual > Colors > Background (intuitive path)
- **Contextual help:** "When to adjust" guides decision-making
- **Reduced overwhelm:** Debug tools hidden from creative workflow

### For Maintenance
- **Scalability:** Easy to add new controls within existing hierarchy
- **Consistency:** Color controls all in one place (easier to refactor)
- **Discoverability:** New parameters have clear "home" location

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Saved presets break | Add migration script to rename keys if folder structure changes schema |
| Deeper nesting = more clicks | Keep most-used folders (Materials) not collapsed by default |
| Help text bloat | Use concise language; aim for <20 words per hint |
| Team disagrees on grouping | Start with this proposal, iterate based on feedback |

## Open Questions

1. **Should Performance Monitor be split further?** (e.g., Display vs. Analysis sub-folders)
2. **Should we add a "Favorites" top-level folder** for frequently adjusted params?
3. **Should color pickers support HSL mode** for easier hue shifts?
4. **Should we add visual thumbnails** for preset buttons? (Leva supports custom components)

## Alternative Considered

**Option B: Feature-Based Grouping**
```
1. Presets
2. Glass Effect (Materials, Depth of Field)
3. Atmosphere (Particles, Environment, Clouds, Stars)
4. Colors & Lighting (All color controls)
5. Interaction (Camera, Drag & Rotate)
6. Debug
```

**Why rejected:** Mixes abstraction levels (Glass Effect is specific, Atmosphere is broad)

## Success Metrics

After implementation, we should see:
- [ ] Panel height reduced by 30%+ (when all collapsed)
- [ ] Related controls (e.g., all color pickers) accessible within 2 clicks
- [ ] Zero confusion about where to find a control (validated via team survey)
- [ ] Help text answers "when" question, not just "what"

---

**Next Steps:**
1. Review this proposal with team
2. Get approval on folder structure
3. Implement Phase 1-3 (backup, restructure, enhance)
4. Test and iterate based on feedback
