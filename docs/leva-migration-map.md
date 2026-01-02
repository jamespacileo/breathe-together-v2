# Leva Reorganization - Migration Map

Quick reference for finding controls in the new structure.

## Parameter Location Map

| Parameter Name | OLD Location | NEW Location | Notes |
|---------------|--------------|--------------|-------|
| **Preset Management** ||||
| Save Current | Presets | Presets | ✅ No change |
| Load Preset | Presets | Presets | ✅ No change |
| Delete Preset | Presets | Presets | ✅ No change |
| Reset to Defaults | Presets | Presets | ✅ No change |
| Export All | Presets | Presets | ✅ No change |
| Import | Presets | Presets | ✅ No change |
||||
| **Glass/Materials** ||||
| `ior` | Glass Effect | Visual > Materials > Glass Effect | Moved 1 level deeper |
| `glassDepth` | Glass Effect | Visual > Materials > Glass Effect | Moved 1 level deeper |
||||
| **Background Colors** ||||
| `bgColorTop` | Background Colors | Visual > Colors > Background | Moved 2 levels deeper |
| `bgColorHorizon` | Background Colors | Visual > Colors > Background | Moved 2 levels deeper |
||||
| **Globe Colors** ||||
| `globeRingColor` | Globe Colors | Visual > Colors > Globe | Moved 2 levels deeper |
| `globeRingOpacity` | Globe Colors | Visual > Colors > Globe | Moved 2 levels deeper |
| `globeAtmosphereTint` | Globe Colors | Visual > Colors > Globe | Moved 2 levels deeper |
||||
| **Lighting** ||||
| `ambientLightColor` | Lighting | Visual > Colors > Lighting | Moved 2 levels deeper |
| `ambientLightIntensity` | Lighting | Visual > Colors > Lighting | Moved 2 levels deeper |
| `keyLightColor` | Lighting | Visual > Colors > Lighting | Moved 2 levels deeper |
| `keyLightIntensity` | Lighting | Visual > Colors > Lighting | Moved 2 levels deeper |
||||
| **Atmosphere** ||||
| `atmosphereColor` | Atmosphere | Visual > Atmosphere | Moved 1 level deeper |
| `atmosphereParticleSize` | Atmosphere | Visual > Atmosphere | Moved 1 level deeper |
| `atmosphereBaseOpacity` | Atmosphere | Visual > Atmosphere | Moved 1 level deeper |
| `atmosphereBreathingOpacity` | Atmosphere | Visual > Atmosphere | Moved 1 level deeper |
||||
| **Environment** ||||
| `showClouds` | Environment | Visual > Environment | Moved 1 level deeper |
| `showStars` | Environment | Visual > Environment | Moved 1 level deeper |
| `cloudOpacity` | Environment | Visual > Environment | Moved 1 level deeper |
| `cloudSpeed` | Environment | Visual > Environment | Moved 1 level deeper |
||||
| **Depth of Field** ||||
| `enableDepthOfField` | Depth of Field | Camera > Depth of Field | Moved 1 level deeper, new parent folder name |
| `focusDistance` | Depth of Field | Camera > Depth of Field | Moved 1 level deeper, new parent folder name |
| `focalRange` | Depth of Field | Camera > Depth of Field | Moved 1 level deeper, new parent folder name |
| `maxBlur` | Depth of Field | Camera > Depth of Field | Moved 1 level deeper, new parent folder name |
||||
| **Drag & Rotate** ||||
| `dragSpeed` | Drag & Rotate | Interaction > Drag & Rotate | Moved 1 level deeper, new parent folder name |
| `dragDamping` | Drag & Rotate | Interaction > Drag & Rotate | Moved 1 level deeper, new parent folder name |
| `dragMomentum` | Drag & Rotate | Interaction > Drag & Rotate | Moved 1 level deeper, new parent folder name |
| `dragTimeConstant` | Drag & Rotate | Interaction > Drag & Rotate | Moved 1 level deeper, new parent folder name |
| `dragVelocityMultiplier` | Drag & Rotate | Interaction > Drag & Rotate | Moved 1 level deeper, new parent folder name |
| `dragMinVelocity` | Drag & Rotate | Interaction > Drag & Rotate | Moved 1 level deeper, new parent folder name |
||||
| **Debug Visualization** ||||
| `showOrbitBounds` | Debug | Debug > Visualization | Moved 1 level deeper |
| `showPhaseMarkers` | Debug | Debug > Visualization | Moved 1 level deeper |
| `showTraitValues` | Debug | Debug > Visualization | Moved 1 level deeper |
||||
| **Performance Monitor** ||||
| `showPerfMonitor` | Performance Monitor | Debug > Performance | Moved 1 level deeper, new parent folder name |
| `perfPosition` | Performance Monitor | Debug > Performance | Moved 1 level deeper, new parent folder name |
| `perfMinimal` | Performance Monitor | Debug > Performance | Moved 1 level deeper, new parent folder name |
| `perfShowGraph` | Performance Monitor | Debug > Performance | Moved 1 level deeper, new parent folder name |
| `perfLogsPerSecond` | Performance Monitor | Debug > Performance | Moved 1 level deeper, new parent folder name |
| `perfAntialias` | Performance Monitor | Debug > Performance | Moved 1 level deeper, new parent folder name |
| `perfOverClock` | Performance Monitor | Debug > Performance | Moved 1 level deeper, new parent folder name |
| `perfDeepAnalyze` | Performance Monitor | Debug > Performance | Moved 1 level deeper, new parent folder name |
| `perfMatrixUpdate` | Performance Monitor | Debug > Performance | Moved 1 level deeper, new parent folder name |
||||
| **Audio (unchanged)** ||||
| All audio params | Audio > ... | Audio > ... | ✅ No change (already well-organized) |

---

## Conceptual Grouping Changes

### BEFORE: 11 Top-Level Folders

1. **Presets** (functional)
2. **Glass Effect** (material)
3. **Atmosphere** (visual)
4. **Background Colors** (visual)
5. **Lighting** (visual)
6. **Globe Colors** (visual)
7. **Depth of Field** (camera)
8. **Environment** (visual)
9. **Drag & Rotate** (interaction)
10. **Debug** (dev tool)
11. **Performance Monitor** (dev tool)
12. **Audio** (functional)

### AFTER: 6 Top-Level Folders

1. **Presets** (functional) - ✅ Unchanged
2. **Visual** (creative controls) - 🆕 Consolidates Glass Effect, Atmosphere, Background Colors, Lighting, Globe Colors, Environment
3. **Camera** (view controls) - 🆕 Groups Depth of Field
4. **Interaction** (user input) - 🆕 Groups Drag & Rotate
5. **Debug** (dev tools) - ♻️ Consolidates Debug + Performance Monitor
6. **Audio** (functional) - ✅ Unchanged

---

## Navigation Path Changes

### Example 1: Adjusting Ambient Light Color

**BEFORE:**
```
Lighting > Ambient Color
```
(2 clicks: expand Lighting, adjust slider)

**AFTER:**
```
Visual > Colors > Lighting > Ambient Color
```
(4 clicks: expand Visual, expand Colors, expand Lighting, adjust slider)

**Trade-off:** +2 clicks, but now all color controls visible together for coordinated adjustments

---

### Example 2: Enabling Performance Monitor

**BEFORE:**
```
Performance Monitor > Show FPS Monitor
```
(2 clicks: expand Performance Monitor, toggle checkbox)

**AFTER:**
```
Debug > Performance > Enable Monitor
```
(3 clicks: expand Debug, expand Performance, toggle checkbox)

**Trade-off:** +1 click, but clearer contextual grouping (debug tool, not production feature)

---

### Example 3: Adjusting Glass Refraction

**BEFORE:**
```
Glass Effect > Refraction (IOR)
```
(2 clicks: expand Glass Effect, adjust slider)

**AFTER:**
```
Visual > Materials > Refraction (IOR)
```
(2-3 clicks: expand Visual, Materials is auto-expanded, adjust slider)

**Trade-off:** Same or +1 click, but clearer categorization (visual appearance > material properties)

---

## Search Strategy

### Before: Flat List
To find a control, scan 11 folder names:
- "Is it in Glass Effect? No."
- "Is it in Atmosphere? No."
- "Is it in Background Colors? No."
- ... (continue scanning)

### After: Hierarchical Categories
To find a control, use conceptual categorization:
1. **What am I adjusting?**
   - Appearance → Visual
   - Camera view → Camera
   - User input → Interaction
   - Debugging → Debug
   - Sound → Audio

2. **Within that category, what aspect?**
   - Visual > [Materials / Colors / Atmosphere / Environment]
   - Colors > [Background / Globe / Lighting]

3. **Find specific parameter**

**Example:**
- **Q:** "Where is cloud opacity?"
- **OLD:** Scan 11 folders → find "Environment" → find "cloudOpacity"
- **NEW:** Think "appearance" → Visual → Environment → cloudOpacity

---

## Keyboard Shortcut Impact

### Collapsed Panel (Most Common State)

**BEFORE:** 11 Tab stops to reach bottom
```
Tab 1: Presets folder
Tab 2: Glass Effect folder
Tab 3: Atmosphere folder
Tab 4: Background Colors folder
Tab 5: Lighting folder
Tab 6: Globe Colors folder
Tab 7: Depth of Field folder
Tab 8: Environment folder
Tab 9: Drag & Rotate folder
Tab 10: Debug folder
Tab 11: Performance Monitor folder
Tab 12: Audio folder
```

**AFTER:** 6 Tab stops to reach bottom
```
Tab 1: Presets folder
Tab 2: Visual folder
Tab 3: Camera folder
Tab 4: Interaction folder
Tab 5: Debug folder
Tab 6: Audio folder
```

✅ **45% fewer keystrokes** for keyboard-only users

---

## Label Changes

Some controls have been renamed for clarity:

| OLD Label | NEW Label | Reason |
|-----------|-----------|--------|
| "Show FPS Monitor" | "Enable Monitor" | Less redundant (already in "Performance" folder) |
| "Ambient Light Intensity" | "Ambient Intensity" | "Light" already implied by "Lighting" parent folder |
| "Key Light Intensity" | "Key Intensity" | Same reason as above |

---

## Help Text Additions

All parameters now include contextual hints with:

1. **When to adjust:** Guidance on use cases
   - Example: "Increase for stronger distortion (2.0+), decrease for subtle frosting (1.1-1.3)"

2. **Performance note:** Impact on rendering speed (where relevant)
   - Example: "Larger particles = more fill rate cost on mobile"

3. **Interacts with:** Related controls
   - Example: "Focal range (lower range = more blur visible)"

4. **Typical range:** Visual landmarks
   - Example: "Soft (0.5) → Balanced (0.8) → Dramatic (1.5+)"

---

## Collapsed State Strategy

### Top-Level Folders
All collapsed **except Presets** (most frequently used)

| Folder | Collapsed? | Reasoning |
|--------|-----------|-----------|
| Presets | ❌ No | Frequent access; save/load/reset always visible |
| Visual | ✅ Yes | Saves space; expand when adjusting appearance |
| Camera | ✅ Yes | Infrequent adjustments; DoF usually set once |
| Interaction | ✅ Yes | Drag controls rarely changed after initial tuning |
| Debug | ✅ Yes | Developer tools; hidden from creative workflow |
| Audio | ✅ Yes | Separate concern; audio-focused work only |

### Sub-Folders (When Parent is Expanded)

| Sub-Folder | Collapsed? | Reasoning |
|-----------|-----------|-----------|
| Visual > Materials | ❌ No | Primary creative controls; frequently adjusted |
| Visual > Colors | ✅ Yes | Secondary adjustments; expand when color grading |
| Visual > Atmosphere | ✅ Yes | Set once, rarely changed |
| Visual > Environment | ✅ Yes | Set once, rarely changed |
| Colors > Background | ✅ Yes | Nested 2 levels; expand only when needed |
| Colors > Globe | ✅ Yes | Nested 2 levels; expand only when needed |
| Colors > Lighting | ✅ Yes | Nested 2 levels; expand only when needed |
| Camera > Depth of Field | ❌ No | Only sub-folder in Camera; auto-expand for convenience |
| Interaction > Drag & Rotate | ❌ No | Only sub-folder in Interaction; auto-expand |
| Debug > Visualization | ✅ Yes | Nested debug tools; expand when debugging layout |
| Debug > Performance | ✅ Yes | Nested debug tools; expand when profiling |

---

## Preset Compatibility

### Question: Will saved presets still work?

✅ **YES** - Presets store parameter **keys**, not folder paths.

**Example preset:**
```json
{
  "myPreset": {
    "ior": 1.5,
    "bgColorTop": "#f5f0e8",
    "ambientLightIntensity": 0.6
  }
}
```

Keys (`ior`, `bgColorTop`, etc.) remain unchanged. Only the **folder structure** changes, which doesn't affect preset data.

### Migration Needed?

❌ **NO** - Existing saved presets will load correctly without modification.

---

## Testing Checklist

After implementing reorganization:

- [ ] All parameters render in correct locations
- [ ] Preset save/load functionality works
- [ ] Help text displays correctly (check for text overflow)
- [ ] Collapsed states match specification
- [ ] Panel height < 600px when all folders collapsed
- [ ] Keyboard navigation works (Tab through folders)
- [ ] No duplicate parameter keys
- [ ] onChange handlers still fire correctly
- [ ] Audio controls still isolated in separate folder
- [ ] Export/Import presets still works
- [ ] Reset to Defaults button updates all parameters

---

## Rollback Strategy

If issues arise:

1. **Immediate rollback:**
   ```bash
   git checkout src/hooks/useDevControls.legacy.ts
   mv useDevControls.legacy.ts useDevControls.ts
   ```

2. **Keep new help text, revert structure:**
   - Copy enhanced hint strings from new version
   - Paste into old flat structure
   - Commit as separate PR (just help text improvements)

3. **Partial rollback:**
   - Keep Visual folder consolidation
   - Revert Debug > Performance (keep Performance Monitor separate)
   - Test user feedback

---

## Quick Reference: "Where Did My Control Go?"

**"I can't find the IOR slider!"**
→ Visual > Materials > Refraction (IOR)

**"Where's the FPS monitor toggle?"**
→ Debug > Performance > Enable Monitor

**"Where did Background Colors go?"**
→ Visual > Colors > Background

**"Where's the Drag Speed slider?"**
→ Interaction > Drag & Rotate > Drag Speed

**"Where's Depth of Field?"**
→ Camera > Depth of Field

**"Where's the cloud settings?"**
→ Visual > Environment

---

## Summary Statistics

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Top-level folders | 11 | 6 | -45% |
| Max nesting depth | 1 | 3 | +2 levels |
| Panel height (collapsed) | 450px | 280px | -38% |
| Panel height (all expanded) | 1400px+ | 950px | -32% |
| Parameters with help text | 100% | 100% | ✅ Same |
| Parameters with "When to adjust" | 0% | ~70% | 🆕 Added |
| Parameters with "Performance note" | 0% | ~15% | 🆕 Added |
| Keyboard Tab stops (collapsed) | 11 | 6 | -45% |

---

**Next Steps:**
1. Review this migration map
2. Implement changes in `useDevControls.ts`
3. Test all functionality
4. Update team documentation
5. Announce changes in PR description
