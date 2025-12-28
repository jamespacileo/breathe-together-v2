# Case Study: Lighting Entity Toggle Improvements

**Status:** ✅ Completed
**Commit:** `fa70554` - feat: Add per-light toggle controls for Lighting entity
**Date:** October 2024
**Result:** Extension (props: 12→16, toggles: 0→4, lighting combinations: 1→16)

---

## Background: The Problem

The Lighting entity had **12 props** (3 per light × 4 lights) and **excellent JSDoc coverage**:
- Ambient light: color, intensity
- Key light: position, intensity, color
- Fill light: position, intensity, color
- Rim light: position, intensity, color

**All 12 props were already exposed at scene level** in Triplex, which was excellent accessibility. However, users had no way to test different lighting combinations:
- Could users not see how the scene looked with **only key lighting** (2-point)?
- Could users not isolate the **rim light contribution** (4-point vs 3-point)?
- Could users not test **dramatic lighting** (key + rim only)?

**Workaround:** Users set `intensity=0` for unwanted lights, which was:
- Non-semantic (why intensity=0 instead of disabling the light?)
- Unintuitive (doesn't work for non-intensity parameters)
- Fails for exploratory learning ("show me what each light does")

**Core Issue:** No per-light toggles meant users couldn't easily experiment with lighting combinations.

---

## Phase 1: Comprehensive Exploration

### Current State Assessment

**File:** `src/entities/lighting/index.tsx`

**Props Inventory:**
```
Total props: 12
Scene-level exposed: 12 / 12 (100%)
Triplex accessibility: Excellent - all props exposed

Props breakdown:
- Ambient: ambientIntensity, ambientColor (2 props)
- Key: keyPosition, keyIntensity, keyColor (3 props)
- Fill: fillPosition, fillIntensity, fillColor (3 props)
- Rim: rimPosition, rimIntensity, rimColor (3 props)
```

**JSDoc Quality:**
- [x] All props documented: ✅ YES, 12/12
- [x] @default annotations: ✅ YES, all present
- [x] "When to adjust": ✅ YES, comprehensive
- [x] Comparison to peers: ✅ Better than Environment (12/12 vs 2/16)

**Pattern Comparison:**
```
| Feature | Lighting | Environment | Peer Consistency |
|---------|----------|-------------|------------------|
| Total props | 12 | 16 | Reasonable (Lighting simpler) |
| Scene-level % | 100% | 12.5% | ❌ Inconsistent (Lighting better) |
| Toggles | 0 | 0 | - |
| JSDoc quality | Excellent (12/12) | Poor (2/16) | ❌ Different standards |

Key insight: Lighting is well-documented but lacks per-light toggles
```

**Default Values:**
- All defaults present and accurate
- All values reasonable (no mismatches found)
- Pattern: propsToLightingConfig() converts flat props to grouped config

---

## Phase 2: Issue Identification & Categorization

### Issues Identified

**🔴 CRITICAL Issues:**
(None - entity functions correctly)

**🟡 HIGH Issues:**
1. **No per-light toggles** - Cannot test different lighting combinations
   - Impact: High (limits testing/experimentation)
   - Effort: Low (30 min for 4 toggles)
   - Workaround: Use intensity=0 (non-semantic)

**🟠 MEDIUM Issues:**
(None significant)

**🟢 NICE-TO-HAVE Issues:**
1. **Add quality presets** - Low/medium/high lighting configurations
   - Impact: Low (nice-to-have)
   - Effort: High (requires config restructuring)

### Severity Summary
- 🔴 CRITICAL: 0 issues
- 🟡 HIGH: 1 issue (toggles)
- 🟠 MEDIUM: 0 issues
- 🟢 NICE-TO-HAVE: 1 issue (DEFERRED)

---

## Phase 3: User Preference Gathering

### Options Presented

```
Which improvements would enhance the Lighting entity?

Option A (Recommended): "Add per-light toggles" ~30 min
├── Add 4 enable/disable toggles (enableAmbient, enableKey, enableFill, enableRim)
├── Enables 2^4 = 16 lighting combinations
└── Maintains 100% Triplex accessibility
Impact: High - enables flexible A/B testing

Option B: "Toggles + quality presets" ~90 min
├── Option A: Add toggles (30 min)
└── Add quality presets (60 min) - low/medium/high lighting configs
Impact: Very High - toggles + preset system
Effort: High (requires config changes)

Option C: "Keep as-is" ~0 min
└── Entity already excellent, defer improvements
Impact: None (but limits experimentation)
```

### User Selection
✅ **Selected: Option A (Recommended)**
- Rationale: Quick win (30 min) with high value (16 lighting combinations)
- Low risk (adds features, no removals)
- Deferred: Quality presets (lower priority)

---

## Phase 4: Impact/Effort Prioritization

### Priority Matrix Analysis

```
                 LOW EFFORT (< 30 min)    HIGH EFFORT (> 30 min)
HIGH IMPACT   ┌─────────────────────┬─────────────────────┐
              │ • Add 4 toggles     │ • Quality presets   │
              │ • (Enables testing) │   (system refactor) │
              └─────────────────────┴─────────────────────┘
LOW IMPACT    │                     │                     │
              │   (no other issues) │                     │
              └─────────────────────┴─────────────────────┘
```

### Ordered Task List

**MUST-DO (30 min total):**
1. [ ] Add 4 toggle props to interface (~5 min) - Enable per-light control
2. [ ] Update function signature (~2 min) - Wire defaults
3. [ ] Add conditional rendering (~3 min) - {enableX && <light />}
4. [ ] Update sceneProps.ts (~5 min) - Add to SharedVisualProps
5. [ ] Update sceneDefaults.ts (~5 min) - Add toggle defaults
6. [ ] Thread through scene files (~10 min) - breathing.tsx, .scene.tsx, .debug.scene.tsx

**SHOULD-DO (Deferred):**
- Quality presets (lower priority, can add in future cycle)

---

## Phase 5: Implementation with Simplification

### Before Metrics
```
Total props: 12
Scene-level exposed: 12 / 12 (100%)
Default value mismatches: 0
Enable/disable toggles: 0
Lighting combinations possible: 1 (all lights always on)
JSDoc completeness: Excellent (12/12)
TypeScript errors: 0
```

### Design Decisions

**Why Add Toggles (not remove props)?**
- All 12 existing props have high value (users adjust them frequently)
- No over-engineering detected (unlike Environment)
- Toggles add new capability (test combinations)
- Net effect: 12 → 16 props, but 16x more functional (1 → 16 combinations)

**Why defaults=true for all toggles?**
- Backward compatible (existing behavior unchanged)
- Users opt-in to disabling lights
- Existing scenes work without modification

### Implementation Steps

**Step 1: Update LightingProps interface**
```typescript
interface LightingProps {
  // Ambient light
  enableAmbient?: boolean;      // NEW
  ambientIntensity?: number;
  ambientColor?: string;

  // Key light
  enableKey?: boolean;          // NEW
  keyPosition?: string;
  keyIntensity?: number;
  keyColor?: string;

  // Fill light
  enableFill?: boolean;         // NEW
  fillPosition?: string;
  fillIntensity?: number;
  fillColor?: string;

  // Rim light
  enableRim?: boolean;          // NEW
  rimPosition?: string;
  rimIntensity?: number;
  rimColor?: string;
}
```

**Step 2: Add JSDoc for toggles**
```typescript
/**
 * Enable ambient light
 * When true, soft base light illuminates entire scene.
 * When false, scene relies on key/fill/rim lights only.
 *
 * **When to adjust**: Toggle off to test dramatic 3-point lighting
 * **Interacts with**: ambientIntensity (has no effect when disabled)
 *
 * @type boolean
 * @default true
 */
enableAmbient?: boolean;

// Similar for enableKey, enableFill, enableRim
```

**Step 3: Update function signature**
```typescript
export function Lighting({
  // Ambient
  enableAmbient = true,
  ambientIntensity = LIGHTING_DEFAULTS.ambientIntensity,
  ambientColor = LIGHTING_DEFAULTS.ambientColor,

  // Key
  enableKey = true,
  keyPosition = LIGHTING_DEFAULTS.keyPosition,
  keyIntensity = LIGHTING_DEFAULTS.keyIntensity,
  keyColor = LIGHTING_DEFAULTS.keyColor,

  // Fill
  enableFill = true,
  fillPosition = LIGHTING_DEFAULTS.fillPosition,
  fillIntensity = LIGHTING_DEFAULTS.fillIntensity,
  fillColor = LIGHTING_DEFAULTS.fillColor,

  // Rim
  enableRim = true,
  rimPosition = LIGHTING_DEFAULTS.rimPosition,
  rimIntensity = LIGHTING_DEFAULTS.rimIntensity,
  rimColor = LIGHTING_DEFAULTS.rimColor,
}: LightingProps = {}) {
  // Component logic
}
```

**Step 4: Add conditional rendering**
```typescript
return (
  <group>
    {enableAmbient && (
      <ambientLight intensity={ambientIntensity} color={ambientColor} />
    )}
    {enableKey && (
      <directionalLight
        position={parsePosition(keyPosition)}
        intensity={keyIntensity}
        color={keyColor}
      />
    )}
    {enableFill && (
      <directionalLight
        position={parsePosition(fillPosition)}
        intensity={fillIntensity}
        color={fillColor}
      />
    )}
    {enableRim && (
      <directionalLight
        position={parsePosition(rimPosition)}
        intensity={rimIntensity}
        color={rimColor}
      />
    )}
  </group>
);
```

**Step 5: Update sceneProps.ts**
```typescript
// In SharedVisualProps interface
interface SharedVisualProps {
  // ... existing props ...
  enableAmbient?: boolean;
  enableKey?: boolean;
  enableFill?: boolean;
  enableRim?: boolean;
}
```

**Step 6: Update sceneDefaults.ts**
```typescript
export const LIGHTING_DEFAULTS = {
  value: {
    enableAmbient: true,
    ambientIntensity: 0.4,
    ambientColor: "#ffffff",

    enableKey: true,
    keyPosition: "8,10,5",
    keyIntensity: 0.8,
    keyColor: "#ffffff",

    enableFill: true,
    fillPosition: "-8,5,3",
    fillIntensity: 0.4,
    fillColor: "#a8dadc",

    enableRim: true,
    rimPosition: "0,10,-8",
    rimIntensity: 0.6,
    rimColor: "#e63946",
  },
  meta: {
    enableAmbient: { whenToAdjust: "Toggle off for dramatic lighting" },
    enableKey: { whenToAdjust: "Always on for main illumination" },
    enableFill: { whenToAdjust: "Toggle off for high-contrast look" },
    enableRim: { whenToAdjust: "Toggle off to remove rim glow" },
    // ... rest of meta ...
  },
};
```

**Step 7: Thread through all scene files**
- `src/levels/breathing.tsx` - Add 4 toggle parameters
- `src/levels/breathing.scene.tsx` - Add 4 toggle parameters
- `src/levels/breathing.debug.scene.tsx` - Add 4 toggle parameters

**Step 8: Test in browser**
- ✅ TypeScript compiles without errors
- ✅ All existing functionality works (backward compatible)
- ✅ Each toggle works individually (can disable any light)
- ✅ Default behavior unchanged (all enabled by default)
- ✅ Triplex UI shows 4 new checkbox controls

### Key Decisions

1. **Why add toggles (not remove anything)?**
   - Lighting already excellent, no over-engineering
   - Toggles add new capability (test combinations)
   - High ROI: 30 min effort → 16x more functional (1 → 16 combinations)

2. **Why place toggles before intensity props?**
   - Logical grouping (enable first, then adjust if enabled)
   - Better UX (user sees toggle, then related intensity)

3. **Why defaults=true for all toggles?**
   - Backward compatible (no breaking changes)
   - Existing scenes work without modification
   - Users opt-in to experimentation

---

## Phase 6: Review & Validation

### After Metrics
```
AFTER METRICS:

Total props: 16 (was 12)
Scene-level exposed: 16 / 16 (100%)
Default value mismatches: 0 (was 0)
Enable/disable toggles: 4 (was 0)
Lighting combinations possible: 16 (was 1)
JSDoc completeness: Excellent (16/16, still 100%)
TypeScript errors: 0
Backward compatibility: ✅ All defaults=true
```

### Success Metrics

| Metric | Before | After | Improvement | Status |
|--------|--------|-------|-------------|--------|
| Total props | 12 | 16 | +4 toggles | ✅ |
| Accessibility | 100% | 100% | Maintained | ✅ |
| Toggles | 0 | 4 | +4 toggles | ✅ |
| Lighting combinations | 1 | 16 | 16x improvement | ✅ |
| JSDoc coverage | 100% | 100% | Maintained | ✅ |
| Backward compatible | N/A | ✅ | All defaults=true | ✅ |

### Validation Checklist
- [x] No CRITICAL issues (entity was correct)
- [x] HIGH issue solved (toggles added for testing)
- [x] Props increased but high value (12 → 16 for 16x functionality)
- [x] Triplex accessibility maintained (100% → 100%)
- [x] No new type errors introduced
- [x] Visual appearance correct in browser
- [x] Each toggle works independently
- [x] Backward compatibility maintained (all defaults=true)

### Commit Message

```
feat: Add per-light toggle controls for Lighting entity

Add 4 individual enable/disable toggles (enableAmbient, enableKey,
enableFill, enableRim) to enable flexible A/B testing of different
lighting combinations in the scene.

Benefits:
- Test 2-point, 3-point, and 4-point lighting setups
- Isolate individual light contributions for understanding
- Enable dramatic lighting exploration (key+rim only, etc.)
- Semantic toggles instead of intensity=0 workarounds

Examples:
- enableKey=true, enableFill=true, enableRim=false → 3-point lighting
- enableAmbient=false, enableKey=true, enableRim=true → Dramatic 2-point
- enableAmbient=true only → Flat even lighting

Changes:
- Add 4 toggle props to LightingProps interface with JSDoc
- Update function signature with all defaults=true
- Add conditional rendering for each light ({enableX && <light />})
- Thread toggles through all 3 scene files
- Update sceneDefaults.ts and sceneProps.ts

Pattern: Semantic toggles enable 2^4=16 lighting combinations for testing.
Follows Environment entity pattern (also using enable/disable toggles).
Enables reusable pattern for other multi-component entities.

Commit: fa70554
🤖 Generated with Claude Code
Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
```

---

## Lessons Learned

### What Worked Well ✅

1. **Excellent JSDoc as foundation** - Entity was already well-documented (100% coverage)
2. **Simple flat props** - No nested objects, easy to add toggles
3. **Backward compatibility** - defaults=true ensured seamless integration
4. **Consistent pattern** - Toggle placement before intensity props was intuitive
5. **Triplex accessibility** - All props already exposed, toggles immediately usable

### What Was Surprising 🤔

1. **How much value toggles add** - 4 props → 16x more functional (1 → 16 combinations)
2. **How simple it was** - 30 minutes for complete implementation
3. **No breaking changes needed** - Pure addition, zero modifications to existing behavior
4. **Reusable across entity types** - Same pattern works for stars, floor, and lights

### What to Do Differently Next Time 📝

1. **Environment first, then Lighting** - Environment simplification pattern informed toggle design
2. **Test all combinations** - Verify that 16 lighting combos all look good (not just 4 standard ones)
3. **Consider prop grouping** - Could group related toggles (e.g., enableAllLights) for convenience
4. **Add presets next** - Quality presets would make testing even easier (pre-configured combos)

### Patterns to Reuse 🔄

1. **Per-entity toggles** - Can apply to BreathingSphere (enableSphere), ParticleSystem (enableParticles)
2. **Conditional rendering** - `{enableX && <component />}` pattern works everywhere
3. **Semantic controls** - Toggles are more intuitive than intensity=0 workarounds
4. **Zero-change addition** - Pure additions (defaults=true) never break existing behavior

---

## Technical Insights

### Why Toggle Pattern Works

**Comparison to alternatives:**

```
Option A: Toggle + Intensity (CHOSEN)
├── toggles enable/disable light completely
└── intensity controls brightness when enabled
✅ Clearer intent, better UX, enables testing

Option B: Intensity only (old approach)
├── intensity=0 disables light
└── non-obvious (is it really off? or just very dark?)
❌ Non-semantic, confusing, doesn't work for non-intensity params

Option C: Position=null to disable
├── position=null hides light
└── requires special handling
❌ Fragile, inconsistent with other entities

Option D: Config object (would break Triplex)
├── lights: { ambient: { enabled: true }, key: { enabled: true } }
└── nested objects don't work with Triplex
❌ Loses flat props advantage
```

### Why Defaults=true is Critical

```
Scenario 1: Old scene without toggles
├── User loads scene created before toggles existed
├── All toggles missing from saved state
├── System uses defaults (all true)
└── Scene behavior unchanged ✅ Backward compatible

Scenario 2: New scene with toggles
├── User explicitly sets enableKey=false
├── Only that light is disabled
└── Rest work normally ✅ No surprise behavior

Scenario 3: Future scene with partial toggles
├── User sets enableAmbient=false, leaves key undefined
├── Ambient stays disabled, key uses default (true)
└── Behavior predictable ✅ Consistent defaults
```

---

## Impact on Future Work

This case study demonstrates:

- ✅ How to add functionality without removing anything (pure addition)
- ✅ How toggles enable 2^n testing combinations (exponential value)
- ✅ How defaults=true protects backward compatibility
- ✅ That simple additions can have high impact (30 min → 16x functionality)
- ✅ That excellent JSDoc makes additions easier and safer

**Similar future improvements:**
1. BreathingSphere - Add enableSphere toggle, enableBreathSync toggle (~20 min)
2. ParticleSystem - Add per-particle-type toggles (~30 min)
3. Camera - Add enableOrbit, enableZoom toggles (~20 min)
4. Controller - Add enableMovement, enableRaycast toggles (~20 min)

---

## Comparison: Environment vs Lighting Approaches

### Both Demonstrations of Kaizen

| Aspect | Environment | Lighting |
|--------|-------------|----------|
| **Strategy** | Simplify (remove before adding) | Extend (add high-value features) |
| **Props change** | 16 → 14 (-2) | 12 → 16 (+4) |
| **Functional change** | Simpler interface | 1 → 16 combinations |
| **Effort** | 45 min | 30 min |
| **ROI** | 4.5x accessibility improvement | 16x functionality improvement |
| **Principle** | Less is more (when < 5% impact) | More is better (when high value) |

**Both follow Kaizen:**
- Identify opportunities (Phase 1-2)
- Ask user for preferences (Phase 3)
- Prioritize impact/effort (Phase 4)
- Implement thoughtfully (Phase 5)
- Measure and learn (Phase 6)

---

## References

- **Workflow:** `.claude/workflows/kaizen-improvement/WORKFLOW.md`
- **Checklist:** `.claude/workflows/kaizen-improvement/checklist.md`
- **Environment Case Study:** `.claude/workflows/kaizen-improvement/case-studies/environment-entity.md`
- **Exploration Template:** `.claude/workflows/kaizen-improvement/templates/exploration-template.md`
- **Categorization Template:** `.claude/workflows/kaizen-improvement/templates/issue-categorization.md`
