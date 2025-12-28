---
name: kaizen-improvement
description: Systematic continuous improvement workflow for breathe-together-v2 entities. Identify opportunities, prioritize by impact/effort, simplify code, and leave it better than you found it. Tailored for ECS architecture, Triplex integration, and breathing meditation UX patterns.
allowed-tools: [Read, Glob, Grep, Task, AskUserQuestion]
---

# Kaizen Improvement Workflow

## Overview

The Kaizen Improvement Workflow is a **6-phase systematic approach** to identifying, prioritizing, and implementing improvements to breathe-together-v2 entities. It emphasizes the "leave it better than you found it" philosophy, with focus on simplification, code reduction, and user experience.

This workflow was successfully applied to:
- **Environment Entity** (Commit `8c7b4b7`) - 3 issues fixed, 2 props removed, 3 toggles added
- **Lighting Entity** (Commit `fa70554`) - 4 toggles added, 16 lighting combinations enabled

### Key Principles

1. **Remove before adding** - Can we delete props instead of adding features?
2. **Simplify first** - Hardcode rarely-used values to reduce prop count
3. **Reduce cognitive load** - Fewer props = easier to understand and discover
4. **Measure everything** - Track before/after metrics (props, Triplex accessibility, default mismatches)
5. **Semantic controls** - Toggles beat intensity=0 workarounds
6. **Backward compatibility** - Default values protect existing behavior

---

## When to Use This Workflow

Use this workflow when:
- ✅ Improving existing entities (BreathingSphere, Lighting, Environment, ParticleSystem, etc.)
- ✅ Refactoring components for Triplex integration
- ✅ Consolidating duplicate code patterns
- ✅ Simplifying over-engineered interfaces
- ✅ Standardizing JSDoc quality across entities
- ✅ Adding missing toggles or enable/disable controls
- ✅ Fixing default value mismatches between JSDoc and code

Do NOT use this workflow for:
- ❌ Completely rewriting an entity from scratch (use component creation workflow)
- ❌ Adding entirely new entities (use ecs-entity or triplex-component workflow)
- ❌ Bug fixes unrelated to architecture (use standard bug fix process)
- ❌ Performance optimization without structural changes

---

## Phase 1: Comprehensive Entity Exploration

**Goal:** Understand current state without assumptions. Gather baseline metrics for comparison.

### Activities

#### 1.1 Read Entity Files
- Read `src/entities/[name]/index.tsx` - main component
- Read `src/entities/[name]/systems.tsx` (if exists) - ECS behavior
- Read `src/entities/[name]/traits.tsx` (if exists) - data structures
- Check `src/config/sceneDefaults.ts` - default values

#### 1.2 Count Props and Measure Accessibility
```bash
# Count total props in interface
grep -n "?: " src/entities/[name]/index.tsx | wc -l

# Count scene-level exposed props (in breathing.tsx, breathing.scene.tsx, breathing.debug.scene.tsx)
grep -c "[propName]=" src/levels/breathing.tsx
```

**Key Metrics:**
- **Total props**: Count all props in the interface
- **Scene-level exposed**: Count props passed through scene files
- **Accessibility %**: (exposed / total) × 100

Example from Environment:
```
Total props: 16
Scene-level: 2 (starsCount, floorColor)
Accessibility: 2/16 = 12.5%
```

#### 1.3 Identify Patterns
- Does it use config conversion pattern? (like `propsToLightingConfig()`)
- Does it have quality presets? (low/medium/high/custom)
- Does it have enable/disable toggles? (enableStars, enableKey, etc.)
- What's the JSDoc quality? (all props documented? @default? "When to adjust"?)

#### 1.4 Compare to Peer Entities
Create a comparison table:

| Feature | This Entity | Environment | Lighting | BreathingSphere |
|---------|------------|-------------|----------|-----------------|
| Total props | 16 | 14 | 16 | 12 |
| Scene-level % | 12.5% | 57% | 100% | 75% |
| Has toggles | No | Yes | Yes | No |
| JSDoc quality | Excellent | Excellent | Excellent | Good |

#### 1.5 Document Technical Debt
- Default value mismatches (JSDoc says X, code says Y)
- Over-engineered props (visual impact < 5%)
- Missing toggles or enable controls
- Limited Triplex accessibility
- Inconsistent JSDoc patterns vs peers

### Exploration Output

A current state assessment document including:
- Baseline metrics (total props, accessibility %, etc.)
- Comparison to peer entities
- Technical debt list (categorized by severity)

Example: See `.claude/workflows/kaizen-improvement/templates/exploration-template.md`

---

## Phase 2: Issue Identification and Categorization

**Goal:** Find improvement opportunities and prioritize by severity using color-coded categories.

### Issue Categories

#### 🔴 CRITICAL - Correctness Issues (Fix immediately)
- Default value mismatches (JSDoc @default ≠ code default)
- Type errors or undefined behaviors
- Broken backward compatibility
- Data corruption risks

Example from Environment:
```
🔴 floorOpacity: Code = 0.4, JSDoc = 0.5 (mismatch)
🔴 floorRoughness: Code = 1, JSDoc = 0.6 (mismatch)
🔴 floorMetalness: Code = 0, JSDoc = 0.2 (mismatch)
```

#### 🟡 HIGH - Missing Functionality (Improve UX)
- Missing enable/disable toggles
- Limited Triplex accessibility (< 50% exposed)
- Workarounds required (intensity=0 instead of toggles)
- Hard-to-discover props

Example from Lighting:
```
🟡 Cannot isolate individual lights (users need intensity=0 hack)
🟡 No way to test 2-point vs 3-point vs 4-point lighting
```

#### 🟠 MEDIUM - Over-Engineering (Simplify)
- Rarely-used props (< 5% visual impact)
- Props that clutter the interface
- Redundant material properties
- Complex nested configurations

Example from Environment:
```
🟠 floorRoughness: At 50% opacity, visual differences imperceptible
🟠 floorMetalness: Floor never looks metallic with current styling
```

#### 🟢 NICE-TO-HAVE - Consistency (Defer)
- Add presets for consistency
- Decouple constants for separation of concerns
- Update JSDoc formatting
- Add missing "Interacts with" notes

Example from Environment:
```
🟢 Add environment presets (minimal, standard, cosmic)
🟢 Decouple lightColor from BreathingSphere color
```

### Identification Process

Ask yourself these key questions:

**For CRITICAL issues:**
1. Is this a correctness problem? (YES → CRITICAL)
2. Does it break backward compatibility? (YES → CRITICAL)

**For HIGH issues:**
1. Can users accomplish their goal today? (NO → HIGH)
2. Do they need workarounds? (YES → HIGH)
3. Is this hard to discover in Triplex? (YES → HIGH)

**For MEDIUM issues:**
1. Is this rarely used (< 5% visual impact)? (YES → MEDIUM)
2. Does it clutter the interface? (YES → MEDIUM)
3. Can we simplify without losing functionality? (YES → MEDIUM)

**For NICE-TO-HAVE issues:**
1. Does this improve consistency with peers? (YES → NICE-TO-HAVE)
2. Is this low effort and optional? (YES → NICE-TO-HAVE)

### Categorization Output

A prioritized issue list with:
- 🔴 CRITICAL issues (fix count and type)
- 🟡 HIGH issues (fix count and type)
- 🟠 MEDIUM issues (fix count and type)
- 🟢 NICE-TO-HAVE issues (fix count and type)

Example structure:
```
🔴 CRITICAL (3): Default value mismatches
🟡 HIGH (2): Missing toggles, limited Triplex accessibility
🟠 MEDIUM (1): Over-engineered floor material
🟢 NICE-TO-HAVE (1): Add environment presets
```

---

## Phase 3: User Preference Gathering

**Goal:** Validate assumptions and get user buy-in before planning implementation.

### Approach

1. **Present findings** as multiple-choice options (3-4 max)
2. **Include effort estimates** (5 min, 30 min, 2 hours, etc.)
3. **Mark a recommended choice** (default option)
4. **Let user select** priorities and deselect nice-to-haves

### Option Presentation Format

```
Which improvements should we prioritize?

○ Option 1: Fix defaults, add toggles, simplify floor (45 min, CRITICAL+HIGH)
  - Fixes 3 default mismatches
  - Adds 3 enable/disable toggles
  - Removes 2 rarely-used props
  - Result: 16 → 14 props, +3 toggles

○ Option 2: Just fix defaults (5 min, CRITICAL only)
  - Fixes 3 default mismatches
  - No new functionality
  - Result: Props unchanged, correctness fixed

○ Option 3: Everything + environment presets (1.5 hours, all)
  - Do Option 1
  - Add 3 preset configurations
  - Result: Complete standardization
  - [DEFERRED - can add later]
```

### User Selection Outcomes

- ✓ Selected: "Fix defaults, add toggles, simplify floor"
- ✓ Selected: "Expose props at scene level"
- ○ Deferred: "Environment presets" (can add later)

### Preference Output

User-approved priority list specifying:
- Which Must-Do items (CRITICAL + selected HIGH)
- Which Should-Do items (selected MEDIUM)
- Which are deferred (NICE-TO-HAVE)

---

## Phase 4: Impact/Effort Prioritization

**Goal:** Maximize value and minimize waste using a 2x2 matrix.

### The Prioritization Matrix

```
                HIGH IMPACT
              /
            /
HIGH EFFORT /______________ DO SECOND
          / │                    │
         /  │ Refactor dual config │ Comprehensive redesign
        /   │ merge logic (1 hour) │
       /    │ Particle consolidate │
      /     │ (2 hours)            │
     /      │                      │
    /       │                      │
   /        │                      │
  /         │______________________│
LOW EFFORT  │    DO FIRST          │ DO WITH CAUTION
            │                      │
            │ Fix defaults (5m)    │
            │ Add toggles (30m)    │ Add presets (1h)
            │ Simplify props (15m) │ Decouple constants (5m)
            │                      │
            │______________________|
            LOW IMPACT            HIGH IMPACT
```

### Decision Criteria

#### Impact Scoring

- **Correctness fixes** = HIGHEST (fixes bugs, prevents future issues)
- **User-facing functionality** = HIGH (improves UX, enables new features)
- **Code quality** = MEDIUM (reduces complexity, improves maintainability)
- **Consistency** = LOW (nice-to-have, improves learning curve)

#### Effort Scoring

- **< 15 minutes** = LOW (typos, quick fixes)
- **15-60 minutes** = MEDIUM (new props, simple refactors)
- **> 60 minutes** = HIGH (major consolidations, complex refactors)

### Prioritization Rules

1. **DO FIRST** (High Impact, Low Effort)
   - These are your quick wins
   - Implement immediately
   - Example: Fix defaults (5 min, critical)

2. **DO SECOND** (High Impact, High Effort)
   - Plan carefully
   - May require breaking changes
   - Example: Refactor config merge logic (1 hour)

3. **DO WITH CAUTION** (Low Impact, High Effort)
   - Verify high ROI before starting
   - May not be worth the effort
   - Example: Add environment presets (1 hour) - defer to later

4. **SKIP** (Low Impact, Low Effort)
   - Could be nice but low value
   - Only do if effort is truly minimal
   - Example: JSDoc typo fixes (combine with other work)

### Prioritization Output

An ordered task list divided into:

```
MUST-DO (45 minutes):
1. Fix default values (5 min) - CRITICAL correctness
2. Add enable/disable toggles (30 min) - HIGH user demand
3. Simplify floor material (15 min) - MEDIUM complexity reduction

SHOULD-DO (30 minutes):
4. Expose more props at scene level (30 min) - HIGH Triplex UX

NICE-TO-HAVE (defer):
- Add environment presets (1 hour) - LOW impact, can add later
- Decouple light color (5 min) - LOW impact, combine with other work
```

---

## Phase 5: Implementation with Simplification

**Goal:** Execute improvements while reducing complexity (not just adding features).

### The Simplification-First Principle

Before ADDING a new prop:

1. **Can we remove this prop instead?**
   ```
   ❌ User wants more control of floor reflectivity
   ✅ Solution: Remove floorRoughness and floorMetalness (not remove floorColor)
   ```

2. **Can we hardcode rarely-used values?**
   ```
   ❌ Expose floorRoughness prop for rare adjustments
   ✅ Hardcode to roughness={1} (matte finish, perfect for 50% opacity)
   ```

3. **Will removing this reduce cognitive load?**
   ```
   ❌ 16 props feels overwhelming
   ✅ 14 props (after removing floor material props) = easier to understand
   ```

### Implementation Checklist

#### Pre-Implementation
- [ ] All 6 phases of exploration complete
- [ ] User has approved priority list
- [ ] Decision trees reviewed (should I add/remove this prop?)
- [ ] Breaking changes identified (if any)
- [ ] Backward compatibility strategy determined

#### During Implementation
- [ ] Start with removals (delete unused props)
- [ ] Then hardcode rarely-used values
- [ ] Then add new functionality
- [ ] Update JSDoc for all changed props
- [ ] Thread props through all scene files
- [ ] Maintain default values for backward compatibility

#### Post-Implementation
- [ ] TypeScript compiles without new errors (run `npm run typecheck`)
- [ ] No breaking changes to public API
- [ ] Triplex shows new props correctly (visual check in browser)
- [ ] Default behavior unchanged (visual confirmation in 3D editor)
- [ ] Commit message explains changes and rationale

### Example: Environment Simplification

**Step 1: Remove Rarely-Used Props**
```typescript
// BEFORE (16 props)
floorColor: string           // ✓ Used for theming
floorOpacity: number         // ✓ Used for subtlety
floorRoughness: number       // ✗ Visual impact < 5% at 50% opacity
floorMetalness: number       // ✗ Never looks metallic
floorSize: number            // ✓ Used occasionally

// AFTER (14 props)
floorColor: string           // ✓
floorOpacity: number         // ✓
// floorRoughness: REMOVED    // ✗
// floorMetalness: REMOVED    // ✗
floorSize: number            // ✓
```

**Step 2: Hardcode Removed Values**
```typescript
<meshStandardMaterial
  color={floorColor}
  transparent
  opacity={floorOpacity}
  roughness={1}              // Hardcoded (matte finish)
  metalness={0}              // Hardcoded (non-metallic)
/>
```

**Step 3: Add New Toggles**
```typescript
// NEW: 3 enable/disable toggles
enableStars: boolean         // NEW
enableFloor: boolean         // NEW
enablePointLight: boolean    // NEW
```

**Result:**
- Props: 16 → 14 (deleted 2) → 17 (added 3) = net +1
- But now 3 toggles enable selective disabling (higher functional value)
- Reduced cognitive load (fewer obscure material props)

### Testing Checklist

- [ ] TypeScript: `npm run typecheck` passes
- [ ] Triplex: New props appear in sidebar with correct types
- [ ] Triplex: @min, @max, @step annotations work correctly
- [ ] Browser: Visual appearance unchanged (if defaults correct)
- [ ] Backward compatibility: Old projects still work (defaults = true)
- [ ] Scene files: All 3 scene files pass props through correctly

---

## Phase 6: Review and Validate Improvements

**Goal:** Measure success and document lessons for future improvements.

### Success Metrics

Track before/after for these metrics:

#### 1. Correctness
- **Default mismatches**: 3 → 0
  - Every prop's code default must match JSDoc @default
  - Use for: Validation in future changes

#### 2. Simplicity
- **Total prop count**: 16 → 14 (12.5% reduction)
  - Lower count = easier to understand
  - Use for: Cognitive load assessment

#### 3. Flexibility
- **Enable/disable toggles**: 0 → 3
  - Each toggle represents a composable configuration
  - Use for: Feature completeness

#### 4. Accessibility
- **Triplex exposure**: 2/16 (12.5%) → 8/14 (57%) = 4x improvement
  - Track: (scene-level props / total props) × 100
  - Use for: UX discoverability

#### 5. Consistency
- **Pattern matching**: Compared to Lighting/BreathingSphere
  - Do toggles follow same pattern?
  - Does JSDoc format match peers?
  - Use for: Team standards alignment

### Example Metrics from Environment

```
BEFORE                          AFTER                      IMPROVEMENT
─────────────────────────────────────────────────────────────────────
Correctness
├─ Default mismatches: 3        ├─ Default mismatches: 0   ✅ Fixed 100%
│
Simplicity
├─ Total props: 16              ├─ Total props: 14          ✅ -2 props (-12.5%)
│  ├─ Over-engineered: 4        │  ├─ Over-engineered: 2    ✅ Simplified
│  └─ Exposed: 2/16 (12.5%)     │  └─ Exposed: 8/14 (57%)   ✅ 4x improvement
│
Flexibility
├─ Toggles: 0                   ├─ Toggles: 3               ✅ +3 toggles
│  └─ Combinations: 1           │  └─ Combinations: 8       ✅ 8x more flexible
│
Accessibility
├─ Scene-level: 12.5%           ├─ Scene-level: 57%         ✅ 4x discoverable
│
Consistency
└─ Like Lighting?: No           └─ Like Lighting?: Yes      ✅ Patterns match
```

### Commit Message Pattern

Use this format to document improvements and rationale:

```
feat: [Category] [What was done]

[1-3 sentence summary of the improvement]

Benefits:
- [Quantified benefit 1]
- [Quantified benefit 2]
- [Quantified benefit 3]

Changes:
- [What was removed] (simplification)
- [What was hardcoded] (reduction)
- [What was added] (functionality)
- [Files modified]

Before: [metrics]
After: [metrics]
Impact: [specific improvement]

Follows [Entity] pattern for consistency.

🤖 Generated with Claude Code (https://claude.com/claude-code)

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
```

### Example Commit from Lighting

```
feat: Add per-light toggle controls for Lighting entity

Add 4 individual enable/disable toggles (enableAmbient, enableKey,
enableFill, enableRim) to enable flexible A/B testing of lighting
configurations in Triplex.

Benefits:
- Test 2-point, 3-point, and custom lighting combinations (16 total)
- Isolate individual light contributions for understanding
- Semantic toggles (no intensity=0 hacks)

Changes:
- Add 4 toggle props to LightingProps interface with JSDoc
- Add conditional rendering for each light ({enableX && <light />})
- Thread toggles through breathing.tsx, breathing.scene.tsx, breathing.debug.scene.tsx
- Update sceneProps.ts and sceneDefaults.ts

Before: 12 props, no toggles
After: 16 props, 4 toggles, 16 combinations
Impact: Enables A/B testing use case, matches Environment pattern

Follows Environment entity toggle pattern.

🤖 Generated with Claude Code
Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
```

### Lessons Learned Documentation

After completion, document:
1. **What worked well** - Patterns, tools, decisions that saved time
2. **What was surprising** - Unexpected complexity or simplicity
3. **What to do differently** - Adjustments for future improvements
4. **Templates to reuse** - Patterns that could apply to other entities

Example from Environment:
```
LESSONS LEARNED

✅ What worked well:
- Default alignment with JSDoc (correctness first)
- Toggle pattern from Environment → applied to Lighting
- Hardcoding rarely-used props (visual impact < 5%)

🤔 Surprising:
- Users discovered 6 props in Triplex that they didn't know existed
- After simplification, props were EASIER to discover (57% vs 12.5%)
- Removing 2 props was more valuable than adding 3

🔧 Next time:
- Measure Triplex accessibility BEFORE prioritization
- Hardcode threshold: < 5% visual impact = hardcode
- Check default mismatches FIRST (always CRITICAL)
```

---

## Decision Trees

Use these trees when deciding whether to add or remove props.

### Should I Add This Prop?

```
START: User requested this prop
  │
  ├─ Is it critical for functionality?
  │  ├─ NO → Consider removing something instead
  │  └─ YES →
  │      │
  │      ├─ Is it frequently adjusted (> 20% of users)?
  │      │  ├─ NO → Can we hardcode? (< 5% visual impact)
  │      │  │         ├─ YES → Hardcode it, DON'T add prop
  │      │  │         └─ NO → Continue...
  │      │  └─ YES →
  │      │      │
  │      │      ├─ Can it be hardcoded?
  │      │      │  ├─ YES → Hardcode instead
  │      │      │  └─ NO →
  │      │      │      │
  │      │      │      ├─ Does it reduce complexity?
  │      │      │      │  ├─ NO → Reconsider
  │      │      │      │  └─ YES →
  │      │      │      │      │
  │      │      │      │      └─ Is it for future-proofing?
  │      │      │      │          ├─ YES → Don't add (YAGNI)
  │      │      │      │          └─ NO → ✅ ADD IT
  │
  └─ DECISION:
     ├─ ✅ ADD if: Critical + frequent + not hardcodable + reduces complexity
     ├─ 🔶 CONSIDER if: High impact but can wait for consolidation
     └─ ❌ DON'T ADD if: Rare use case, premature optimization, or future-proofing
```

### Should I Remove This Prop?

```
START: Prop identified as possibly removable
  │
  ├─ Is it ever used by anyone?
  │  ├─ NO → ✅ REMOVE (dead code)
  │  └─ YES →
  │      │
  │      ├─ Is it critical for any use case?
  │      │  ├─ YES → Keep it
  │      │  └─ NO →
  │      │      │
  │      │      ├─ Can users work around it?
  │      │      │  ├─ YES → Continue...
  │      │      │  └─ NO → Keep it
  │      │      │      │
  │      │      │      ├─ Does it clutter the interface?
  │      │      │      │  ├─ NO → Keep it
  │      │      │      │  └─ YES →
  │      │      │      │      │
  │      │      │      │      ├─ Can we hardcode the value?
  │      │      │      │      │  ├─ YES (< 5% visual impact) → ✅ HARDCODE
  │      │      │      │      │  └─ NO → Keep it
  │      │      │      │      │      │
  │      │      │      │      │      └─ Does it match peer entities?
  │      │      │      │      │          ├─ NO → ✅ REMOVE (inconsistent)
  │      │      │      │      │          └─ YES → Keep it
  │
  └─ DECISION:
     ├─ ✅ REMOVE if: Unused, clutters interface, can hardcode, or inconsistent
     ├─ 🔶 CONSIDER if: Low impact, matches peers, but rarely adjusted
     └─ ❌ KEEP if: Critical, frequently used, or different for good reason
```

---

## Integration with Existing Workflows

This workflow complements existing .claude/skills:

### Related Skills

- **triplex-component**: Use for creating NEW entities with Triplex props
  - When to use: Starting a new component from scratch
  - Related: Same JSDoc pattern and Triplex format

- **ecs-entity**: Use for understanding ECS patterns and systems
  - When to use: Understanding how traits and systems work
  - Related: Exploration phase uses ECS knowledge

- **breath-sync-feature**: Use for implementing breathing-synchronized features
  - When to use: Adding breathing-related animations
  - Related: Can apply kaizen workflow to improve existing breath systems

### Data Flow

```
Kaizen Workflow ← Identifies improvements
        ↓
Phase 1-4: Plan improvements
        ↓
Phase 5: Implementation (may reference triplex-component for JSDoc patterns)
        ↓
Phase 6: Validation & metrics
        ↓
Result: Improved entity ready for production
```

---

## Tips and Tricks

### Tip 1: Metrics Baseline
Always collect baseline metrics BEFORE starting:
```bash
# Count props quickly
grep -c "?: " src/entities/[name]/index.tsx

# Find default mismatches (if any)
grep "@default" src/entities/[name]/index.tsx | head -5
```

### Tip 2: The "Invisible 20%"
About 20% of props are used 80% of the time. Identify the "boring" 80%:
- These are great candidates for hardcoding
- Example: floorRoughness and floorMetalness (< 5% visual impact)

### Tip 3: Test in Triplex Early
Don't wait until the end to check Triplex:
- Add new props one at a time
- Verify they appear in sidebar
- Check @min/@max/@step annotations work
- Catch type errors early

### Tip 4: Commit Incrementally
Don't wait until you're done to commit:
- Commit after Phase 5 is complete
- Include before/after metrics in commit message
- Makes it easy to revert if issues arise

### Tip 5: Ask "Why?" Not "Why Not?"
When considering removals:
- **Bad**: "Why would anyone need floorMetalness?"
- **Good**: "Is floorMetalness creating value > its cognitive cost?"

---

## Common Patterns & Anti-Patterns

### ✅ Good Patterns

**Pattern: Enable/Disable Toggles**
```typescript
// Instead of hardcoding or opacity=0 workarounds
enableStars: boolean = true
enableFloor: boolean = true
enablePointLight: boolean = true

// Conditional rendering
{enableStars && <Stars {...props} />}
{enableFloor && <mesh>...</mesh>}
{enablePointLight && <pointLight {...props} />}
```
**Why:** Semantic, discoverable, enables A/B testing

**Pattern: Config Conversion with Helper**
```typescript
function propsToLightingConfig(props: LightingProps): LightingConfig {
  return {
    ambient: {
      intensity: props.ambientIntensity ?? DEFAULT_LIGHTING_CONFIG.ambient.intensity,
      color: props.ambientColor ?? DEFAULT_LIGHTING_CONFIG.ambient.color,
    },
    // ...
  };
}
```
**Why:** Flat props for Triplex, organized config internally

**Pattern: JSDoc with Context**
```typescript
/**
 * Ambient light intensity.
 *
 * **When to adjust:** Dark backgrounds (0.4-0.6), light backgrounds (0.1-0.3)
 * **Typical range:** Dim (0.2) → Standard (0.4) → Bright (0.6) → Washed (0.8+)
 * **Interacts with:** backgroundColor, keyIntensity
 *
 * @min 0
 * @max 1
 * @step 0.05
 * @default 0.4
 */
ambientIntensity?: number;
```
**Why:** Users understand when/why to adjust, not just what it does

### ❌ Anti-Patterns to Avoid

**Anti-Pattern: Workarounds Instead of Toggles**
```typescript
// ❌ DON'T: Users must set intensity=0 to disable
ambientIntensity={disabled ? 0 : 0.4}

// ✅ DO: Semantic toggle
{enableAmbient && <ambientLight ... />}
```

**Anti-Pattern: Future-Proofing**
```typescript
// ❌ DON'T: "We might need this someday"
floorRoughness?: number  // rarely used, barely visible
floorMetalness?: number  // never looks metallic

// ✅ DO: Remove it, add if actually needed
// Hardcode to roughness={1}, metalness={0}
```

**Anti-Pattern: Nested Configs**
```typescript
// ❌ DON'T: Nested objects (Triplex struggles)
position?: { x: number; y: number; z: number }

// ✅ DO: Flat props (Triplex friendly)
positionX?: number
positionY?: number
positionZ?: number
// Convert internally: const position = [positionX, positionY, positionZ]
```

**Anti-Pattern: Adding Without Removing**
```typescript
// ❌ DON'T: Just keep adding props
// Props: 10 → 15 → 20 → 25...

// ✅ DO: Remove first, then add
// Props: 16 → 14 (removed 2) → 17 (added 3) = net +1 but higher value
```

---

## Troubleshooting

### Issue: "TypeScript won't compile after changes"

**Cause:** Props passed to scene files but not threaded through all layers.

**Solution:**
1. Check all 3 scene files updated (breathing.tsx, breathing.scene.tsx, breathing.debug.scene.tsx)
2. Run `npm run typecheck` to see specific errors
3. Thread props through BreathingLevel → Lighting/Environment

### Issue: "New props don't appear in Triplex"

**Cause:** Props not added to sceneDefaults.ts or sceneProps.ts types.

**Solution:**
1. Add to sceneDefaults.ts with metadata
2. Add to sceneProps.ts interface
3. Reload Triplex in browser

### Issue: "Visual appearance changed after updating defaults"

**Cause:** Aligned code default with JSDoc @default (like floorOpacity: 0.4 → 0.5).

**Solution:**
1. This is expected (fixing incorrect default)
2. Verify in Triplex that visual change is correct
3. If this is a breaking change, note in commit message

### Issue: "I'm not sure if a prop is used"

**Solution:**
```bash
# Search for prop usage across codebase
grep -r "propName" src/ --include="*.tsx" --include="*.ts"

# Count occurrences
grep -r "propName" src/ --include="*.tsx" --include="*.ts" | wc -l
```

If 0 occurrences (except definition), it's dead code → remove it.

---

## Resources

- **Template:** See `.claude/workflows/kaizen-improvement/templates/exploration-template.md`
- **Checklist:** See `.claude/workflows/kaizen-improvement/checklist.md`
- **Case Study (Simplification):** `.claude/workflows/kaizen-improvement/case-studies/environment-entity.md`
- **Case Study (Extension):** `.claude/workflows/kaizen-improvement/case-studies/lighting-entity.md`

---

## Conclusion

The Kaizen Improvement Workflow is a systematic approach to incremental codebase improvement with focus on:

✅ **Simplification** - Remove before adding
✅ **Metrics** - Measure everything, celebrate improvements
✅ **User Involvement** - Validate priorities with stakeholders
✅ **Quality** - Never leave code worse than you found it
✅ **Consistency** - Follow peer entity patterns

By applying this workflow across all entities (BreathingSphere, ParticleSystem, Camera, Controller, Cursor), breathe-together-v2 becomes more discoverable, maintainable, and user-friendly.

**Remember:** You're not done improving until the metrics are better than when you started.
