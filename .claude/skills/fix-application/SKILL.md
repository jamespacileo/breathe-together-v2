---
name: fix-application
description: Apply fixes to entities/components with best practice validation. Searches library docs for simpler patterns, checks for built-in features, validates fixes maintain performance and architectural integrity. Integrates with breath-synchronization skill for breathing-related fixes. Works with parameter tuning, library pattern replacement, and performance optimization.
allowed-tools: [Read, Write, Edit, Grep, Glob, Bash(npm run dev:*), mcp__context7__*]
---

# Fix-Application Skill

## Overview

Apply targeted fixes to your codebase while ensuring they follow best practices, maintain performance, and don't break architectural patterns.

**Use this skill when:**
- Visual parameters feel wrong (too subtle, too exaggerated)
- You want to replace custom code with simpler library patterns
- You need to optimize performance in specific areas
- You want to validate fixes maintain consistency with project patterns

**Expected outcome:** Clear implementation plan with before/after code, validation steps, and testing strategy.

---

## Quick Start Interview

Before diving in, answer these three questions to clarify the fix scope:

### 1. What Needs Fixing?

**Examples:**
- Visual feature (particles, sphere, shader effect)
- System behavior (physics, animation, performance)
- Architecture pattern (trait usage, system integration)
- Integration issue (missing queries, wrong parameters)

**Your answer:** ___________________________________________

### 2. Current vs Expected Behavior

**Describe the gap:**
- **Current:** What's happening now?
- **Expected:** What should happen?
- **Impact:** How noticeable is the issue?

**Your answer:** ___________________________________________

### 3. Suspected Cause

**Initial hypothesis:**
- Is it a parameter/configuration issue?
- Is there a simpler pattern in the library?
- Is it a performance/optimization issue?
- Is it an integration/missing connection?

**Your answer:** ___________________________________________

---

## 6-Phase Workflow

### Phase 1: Problem Identification

**Goal:** Understand the issue in detail

**Steps:**
1. Read the entity/component implementation
2. Identify which files are involved
3. Understand the current data flow
4. List specific lines that might need changes
5. Document current parameter values

**Output:**
- [ ] Entity/component files identified
- [ ] Current parameter values documented
- [ ] Data flow understood
- [ ] Suspected problem lines identified

---

### Phase 2: Library Documentation Check

**Goal:** Find simpler patterns before writing custom code

**Steps:**
1. **Identify relevant libraries:**
   - Is it a React Three Fiber (@react-three/fiber) issue? → Search R3F docs
   - Is it an ECS (Koota) issue? → Search Koota patterns
   - Is it a Three.js issue? → Search Three.js patterns
   - Is it animation/math? → Search Maath or THREE.Math

2. **Search Context7 for documentation:**
   ```
   Use mcp__context7__resolve-library-id to find library ID
   Use mcp__context7__get-library-docs to fetch docs
   Look for code examples matching your use case
   ```

3. **Check for built-in features:**
   - Are you implementing something the library already does?
   - Is there a simpler way using library utilities?
   - What do popular community examples do?

4. **Identify best practices violations:**
   - Do you follow recommended patterns?
   - Are you using deprecated approaches?
   - Could the code be simpler/cleaner?

**Output:**
- [ ] Library documentation researched
- [ ] Built-in features checked
- [ ] Best practices identified
- [ ] No simpler alternative found (or alternative documented)

---

## JSDoc Validation Checklist

When preserving or updating component JSDoc, validate against the standardized template.

### Required Sections

✅ **Technical Description** - One-line summary of what prop does
✅ **Triplex Annotations** - @min/@max/@step/@type/@enum/@default where applicable

### Highly Recommended Sections

✅ **"When to adjust"** - Contextual guidance for when to change this prop
✅ **"Typical range"** - Visual landmarks with descriptive labels (Dim/Standard/Bright)
✅ **"Interacts with"** - List of related props (comma-separated)

### Optional Sections

⚪ **Detailed Explanation** - Only if technical description needs more context
⚪ **"Performance note"** - Only if significant performance impact

### Validation Examples

**❌ Bad JSDoc (Missing Contextual Guidance):**
```typescript
/**
 * The intensity.
 * @default 0.4
 */
intensity?: number;
```

**✅ Good JSDoc (Complete Template):**
```typescript
/**
 * Ambient light intensity (non-directional base illumination).
 *
 * **When to adjust:** Dark backgrounds (0.4-0.6), light backgrounds (0.1-0.3)
 * **Typical range:** Dim (0.2) → Standard (0.4) → Bright (0.6)
 * **Interacts with:** backgroundColor, keyIntensity
 *
 * @min 0 @max 1 @step 0.05
 * @default 0.4 (balanced visibility)
 */
ambientIntensity?: number;
```

### Cross-Reference Checklist

When fixing props, reference their documentation location:

✅ **Cite specific files and line numbers:**
- `src/entities/breathingSphere/index.tsx:180-187` (sphere color props)
- `src/entities/lighting/index.tsx:143-152` (lighting props)
- `src/entities/environment/index.tsx:189-201` (environment props)

✅ **Link to centralized defaults if applicable:**
- `src/config/sceneDefaults.ts` - VISUAL_DEFAULTS, LIGHTING_DEFAULTS

✅ **Verify 171+ prop system structure:**
- 17 visual props in breathingSphere
- 9 lighting props in lighting
- 13 environment props in environment
- 7 particle config props

### sceneDefaults.ts Pattern Validation

Check for single source of truth violations:

❌ **Duplicate Defaults (Bad):**
```typescript
// constants.ts
export const SPHERE_COLOR = '#4A8A9A';

// BreathingSphere.tsx
export function BreathingSphere({
  colorExhale = '#4A8A9A',  // Duplicate!
}) {}

// BreathingLevel.tsx
export function BreathingLevel({
  sphereColorExhale = '#4A8A9A',  // Triple duplicate!
}) {}
```

✅ **Single Source of Truth (Good):**
```typescript
// BreathingSphere.tsx (entity owns default)
export function BreathingSphere({
  colorExhale = '#4A8A9A',
}) {}

// BreathingLevel.tsx (scene passes through)
export function BreathingLevel({
  sphereColorExhale,  // undefined, lets entity use its default
}) {
  return <BreathingSphere colorExhale={sphereColorExhale} />;
}
```

### Transparent Pass-Through Validation

Verify scene components follow the pattern:

✅ **Scene owns only what it renders directly:**
- backgroundColor (rendered by scene)
- bloom settings (scene-level post-processing)

✅ **Scene passes through entity props as undefined:**
- sphereColorExhale, lightingPreset, environmentPreset

✅ **Entity components use their own defaults:**
- No default redefinition at scene level

---

### Phase 3: Fix Design

**Goal:** Design the fix with clear rationale

**Steps:**
1. **Identify fix type:**
   - **Parameter tuning:** Adjust numbers (visibility, damping, intensity)
   - **Library replacement:** Use built-in feature instead of custom code
   - **Performance optimization:** Reduce complexity, improve efficiency

2. **Propose concrete changes:**
   - Show before and after code
   - Explain each change with "why"
   - List files to modify

3. **Compare approaches:**
   - **Conservative:** Minimal change, safer
   - **Moderate:** Balanced change, recommended
   - **Bold:** Aggressive change, maximum impact

4. **Identify trade-offs:**
   - What's gained? (visibility, simplicity, performance)
   - What's lost? (smoothness, subtlety, feature set)
   - Are there edge cases?

**Output:**
- [ ] Fix type identified
- [ ] Specific changes proposed (with line numbers)
- [ ] Before/after code shown
- [ ] Approach chosen (conservative/moderate/bold) with rationale
- [ ] Trade-offs documented

---

### Phase 4: Validation Planning

**Goal:** Ensure fix won't break anything

**Checklist:**
- [ ] **Library docs searched** - Used Context7 to check for simpler patterns
- [ ] **Built-in features explored** - Confirmed no better alternative exists
- [ ] **ECS best practices** - Traits immutable, systems in correct phase, no side effects
- [ ] **R3F best practices** - useFrame mutation, no object creation in hot loops, proper refs
- [ ] **Triplex compatibility** - JSDoc annotations preserved, Triplex visual editor works
- [ ] **Performance impact** - FPS/memory/draw calls analyzed
- [ ] **Breathing sync** - If breathing-related: will run breath-sync-validator
- [ ] **Testing strategy** - Know exactly what to test post-fix

**For breathing-related fixes specifically:**
- Will run breath-sync-validator to check:
  - All 8 integration checks pass
  - Phase-by-phase behavior is correct
  - Visual parameter ranges are adequate
  - Damping constants reasonable

**Output:**
- [ ] All validation checks planned
- [ ] Testing strategy defined
- [ ] Edge cases identified
- [ ] Rollback plan documented

---

### Phase 5: Application

**Goal:** Apply fix with clear documentation

**Steps:**
1. **Apply changes** to identified files
2. **Add inline comments** explaining "why" for clarity
3. **Update JSDoc** annotations if parameters changed
4. **Document changes** with before/after code snippets
5. **Preserve Triplex** visual editor compatibility

**Code comment pattern:**
```typescript
// BEFORE: Parameter too subtle (±10% variation)
breathPulseIntensity: 0.2,

// AFTER: Clearly visible (±30% variation) - increased for better visual feedback
// during breathing cycle. Remains smooth at 60fps with eased motion.
breathPulseIntensity: 0.6,
```

**Output:**
- [ ] All files modified
- [ ] Comments added explaining changes
- [ ] JSDoc updated (if applicable)
- [ ] Triplex compatibility verified

---

### Phase 6: Testing

**Goal:** Verify fix works and doesn't break anything

**Steps:**
1. **Run dev server:**
   ```bash
   npm run dev
   ```

2. **Visual validation:**
   - Watch the fixed entity/component in action
   - Check all relevant behaviors/phases
   - Verify smoothness and responsiveness
   - Compare to baseline (e.g., BreathingSphere for breathing fixes)

3. **Performance validation:**
   - Check FPS in DevTools
   - Monitor for console errors/warnings
   - Verify no new memory leaks
   - Check draw calls unchanged

4. **Integration validation:**
   - Run breath-sync-validator if breathing-related
   - Check ECS systems still work
   - Verify no side effects
   - Test edge cases

5. **Generate validation report:**
   - Document what was tested
   - Show before/after comparison
   - List any issues found

**Output:**
- [ ] Dev server runs successfully
- [ ] Visual test passed
- [ ] Performance validated (60fps maintained)
- [ ] All integration checks passed
- [ ] Validation report generated

---

## Validation Checklist

Use this checklist for every fix you apply:

### Integration & Architecture

See [Best Practices Reference](../../reference/best-practices.md) for detailed patterns.

- [ ] Library docs searched for simpler pattern (Context7)
- [ ] Built-in features explored before custom code
- [ ] ECS best practices maintained (see [ECS Architecture Reference](../../reference/ecs-architecture.md))
- [ ] React Three Fiber best practices maintained (see [Best Practices Reference](../../reference/best-practices.md))

### Compatibility & Documentation
- [ ] Triplex visual editor annotations preserved (JSDoc @min/@max/@step)
- [ ] Comments added explaining "why" of changes
- [ ] Before/after code documented
- [ ] Files listed for this fix
- [ ] Rollback strategy documented

### Performance & Testing
- [ ] Performance impact assessed:
  - [ ] FPS impact analyzed
  - [ ] Memory impact assessed
  - [ ] Draw calls checked (should be unchanged)
  - [ ] Build still compiles without errors
- [ ] Testing strategy defined and executed:
  - [ ] Visual validation completed
  - [ ] Performance validation completed
  - [ ] Integration checks passed
  - [ ] Breathing sync validated (if applicable)

---

## Integration with Other Skills

### Breath-Synchronization Integration

**When to use:** Any fix affecting particles, sphere, or breathing-related behavior

**How it works:**
```
Your fix → breath-synchronization Mode 2 (Validate) → get 8-point validation report
                                                    → phase-by-phase behavior analysis
                                                    → parameter range verification
                                                    → damping constant check
```

**Result:** Confidence that fix maintains breathing synchronization correctness

See [breath-synchronization skill](../breath-synchronization/SKILL.md) for validation details.

### ECS-Entity Integration

**When to use:** Any fix affecting systems, traits, or entity behavior

**How it works:**
```
Your fix → verify ECS patterns → ensure trait immutability
                               → check system order
                               → validate data flow
```

### Triplex-Component Integration

**When to use:** Any fix affecting visual parameters or Triplex-editable components

**How it works:**
```
Your fix → preserve JSDoc annotations (@min/@max/@step)
        → maintain visual editor compatibility
        → ensure Triplex can modify parameters
```

---

## Common Fix Patterns

### Pattern 1: Parameter Tuning

**When to use:** Visual parameter feels wrong (too subtle or too exaggerated)

**Example:** Particle breathing visibility issue
```typescript
// BEFORE: barely visible
breathPulseIntensity: 0.2,  // ±10% variation

// AFTER: clearly visible
breathPulseIntensity: 0.6,  // ±30% variation
```

**Validation approach:**
- Increase by 5x to test visibility threshold
- Use breath-sync-validator to check parameter ranges
- Verify >20% variation for clear visual feedback
- Test smooth motion at 60fps

**Success criteria:**
- Visual change clearly perceptible
- Animation remains smooth
- No performance impact

---

### Pattern 2: Library Pattern Replacement

**When to use:** Custom code could use simpler library feature

**Example:** Custom easing instead of built-in lerp
```typescript
// BEFORE: custom implementation
position.x += (target - position.x) * 0.1;

// AFTER: library native
position.x = THREE.MathUtils.lerp(position.x, target, 0.1);
```

**Validation approach:**
- Search Context7 for library patterns
- Compare for correctness and performance
- Check community examples
- Verify compatibility with existing code

**Success criteria:**
- Simpler code (fewer lines)
- Same or better performance
- No behavior change

---

### Pattern 3: Performance Optimization

**When to use:** Performance bottleneck identified in profiling

**Example:** Reduce damping lag for responsiveness
```typescript
// BEFORE: slow response
{ trait: breathPhase, targetTrait: targetBreathPhase, speed: 0.1 }  // 166ms lag

// AFTER: faster response
{ trait: breathPhase, targetTrait: targetBreathPhase, speed: 0.3 }  // 55ms lag
```

**Validation approach:**
- Profile with DevTools to confirm bottleneck
- Measure impact of fix
- Check for new issues (jitter, lag)
- Verify FPS improvement

**Success criteria:**
- Performance improved (FPS increase or lag reduction)
- No visual degradation
- Smooth animation maintained

---

## Before & After Template

When documenting a fix, use this template:

```markdown
## Example: [Fix Name]

**Problem:** [What was wrong]

**Investigation:** [What you found]

**Approach:** [Conservative/Moderate/Bold - why chosen]

### Files Changed
1. `path/file.ts:line` - Change description

### Changes

**Before:**
```typescript
[original code]
```

**After:**
```typescript
[new code]
// Added comment explaining why
```

**Rationale:** [Why this change]

### Validation Results
- [✅/⚠️] Check 1
- [✅/⚠️] Check 2
- etc.

### Performance Impact
- FPS: [before] → [after]
- Memory: [before] → [after]
- Draw calls: [unchanged/changed why]
```

---

## Rollback Strategy

For every fix, document how to revert:

```markdown
## If Issues Occur

**Animation too exaggerated:**
- Reduce breathPulseIntensity by 0.1 until balanced
- Test at 0.5, 0.4 if needed

**Full Rollback:**
[Show original values for all changed lines]
```

---

## Tips for Success

1. **Search first** - Always check Context7 and library docs before custom code
2. **Measure impact** - Use DevTools to quantify performance before/after
3. **Test thoroughly** - Run dev server and verify all 4 phases/behaviors
4. **Document why** - Comments should explain decision, not just what code does
5. **Preserve compatibility** - Maintain Triplex annotations and ECS patterns
6. **Rollback plan** - Always know how to undo a fix if needed
7. **Ask validators** - Use breath-synchronization Mode 2 for breathing fixes, ECS checks for systems

---

## Reference Materials

**Skill-specific:**
- **[reference.md](reference.md)** — Best practices for R3F, Koota, Three.js
- **[examples.md](examples.md)** — Real fixes from breathe-together-v2

**Shared references:**
- **[Best Practices Reference](../../reference/best-practices.md)** — R3F, ECS, Three.js patterns
- **[ECS Architecture Reference](../../reference/ecs-architecture.md)** — System order, traits, queries
- **[Core Concepts Reference](../../reference/core-concepts.md)** — Breathing cycle, breathPhase
- **[Triplex Annotations Reference](../../reference/triplex-annotations.md)** — JSDoc specification

**Related skills:**
- **[breath-synchronization skill](../breath-synchronization/SKILL.md)** — Mode 2 for breathing validation
- **Context7** — Library documentation for pattern research

---

Let's apply fixes with confidence! 🚀
