# Entity Exploration Template: [EntityName]

Use this template during **Phase 1: Comprehensive Exploration** to systematically document the current state of an entity.

---

## Entity Overview

**File:** `src/entities/[entity-name]/index.tsx`

**Description:** [Brief description of what this entity does in the scene]

**Related files:**
- Systems: `src/entities/[entity-name]/systems.tsx`
- Traits: `src/entities/[entity-name]/traits.tsx` (if applicable)
- Config: `src/config/sceneDefaults.ts` (SCENE_DEFAULTS.[entity-name])

---

## Props Inventory

### Total Props Count
- **Total props in interface:** ___
- **Scene-level exposed props:** ___ / ___ (___%)
- **Triplex accessibility:** ___% (scene-level / total)

### Missing Scene-Level Props
List props that exist in interface but aren't exposed at scene level:

| Prop Name | Type | Used In | Reason Hidden |
|-----------|------|---------|----------------|
| example1  | number | component | Never adjusted |
| example2  | string | renderer  | Internal only  |

---

## JSDoc Quality Assessment

### Documentation Completeness
- [ ] All props have JSDoc comments?
- [ ] All props have @default annotations?
- [ ] All props have "When to adjust" guidance?
- [ ] All props have "Interacts with" notes?
- [ ] All props have "Typical range" recommendations?

### JSDoc Quality Score
- [ ] Excellent - All 5 elements documented
- [ ] Good - 3-4 elements documented
- [ ] Fair - 1-2 elements documented
- [ ] Poor - No documentation

---

## Default Value Analysis

Check if JSDoc @default annotations match actual code defaults.

| Prop Name | Code Default | JSDoc @default | Match? | Impact |
|-----------|--------------|----------------|--------|--------|
| prop1     | 0.5          | 0.5            | ✓      | Safe   |
| prop2     | 0.4          | 0.5            | ✗      | CRITICAL - mismatch |
| prop3     | undefined    | 1.0            | ✗      | HIGH - mismatch |

### Mismatch Summary
- **Total mismatches:** ___
- **Severity:** [ ] None [ ] Low [ ] Medium [ ] High [ ] Critical

---

## Pattern Analysis

### Config Conversion Pattern
Does this entity convert props to internal config?

**Yes / No**

If yes:
- Function name: `_______________`
- Input: Props interface
- Output: `_______________`
- Complexity: [ ] Simple (1-1 mapping) [ ] Moderate (grouping/merging) [ ] Complex (heavy transformation)

### Quality Preset Integration
Does entity use quality presets (low/medium/high)?

**Yes / No**

If yes:
- Entry in SCENE_DEFAULTS: `_______________`
- Presets defined: [ ] Low [ ] Medium [ ] High [ ] Custom
- Props affected: _______________

### Enable/Disable Toggles
Does entity have enable/disable toggles?

**Yes / No**

If yes, list them:
- [ ] _______________
- [ ] _______________
- [ ] _______________

If no, identify candidates:
- Could benefit from: _______________
- Reason: _______________

---

## Comparison to Peer Entities

Compare this entity to similar entities to identify consistency issues.

**Peer entities:** [List 1-2 comparable entities]

| Feature              | This Entity | Peer A | Peer B | Status |
|----------------------|-------------|--------|--------|--------|
| Total props          | ___        | ___    | ___    | ✓ / ⚠️ / ✗ |
| Scene-level % | ___% | ___% | ___% | ✓ / ⚠️ / ✗ |
| Toggles              | ___ | ___ | ___ | ✓ / ⚠️ / ✗ |
| JSDoc quality        | ___ | ___ | ___ | ✓ / ⚠️ / ✗ |
| Config pattern       | ___ | ___ | ___ | ✓ / ⚠️ / ✗ |

**Consistency Assessment:**
- [ ] Excellent match to peers
- [ ] Good, minor differences
- [ ] Some gaps, should align
- [ ] Significant differences

---

## Technical Debt Inventory

### Over-Engineering
Are there props or configurations that are unnecessarily complex?

**Examples:**

| Feature | Props Involved | Complexity | Can Simplify? |
|---------|----------------|-----------|----|
| Material config | _____, _____ | ___  | Yes / No |
| Animation settings | _____, _____ | ___ | Yes / No |

### Unused Props
Are there props defined but never actually used in rendering or logic?

- [ ] Prop: `_______________` (defined but unused)
- [ ] Prop: `_______________` (defined but unused)

### Confusing Abstractions
Are there patterns that are hard to understand?

- Abstraction: _______________
- Issue: _______________
- Recommended: _______________

---

## Integration Points

### Where This Entity Is Used

**Scene files that reference this entity:**
- [ ] `src/levels/breathing.tsx` - Line: ___
- [ ] `src/levels/breathing.scene.tsx` - Line: ___
- [ ] `src/levels/breathing.debug.scene.tsx` - Line: ___
- [ ] Other: _______________

### Props Threaded Through Scenes

Track which props are exposed at scene level vs internal only:

**Exposed at scene level (Triplex editable):**
```
enableFeature, featureColor, featureIntensity, ...
```

**Internal only (hardcoded):**
```
internalCache, tempConfig, ...
```

---

## Key Findings Summary

### Strengths ✓
- What's working well in this entity?
1. _______________
2. _______________
3. _______________

### Opportunities for Improvement ⚠️
- What could be better?
1. _______________
2. _______________
3. _______________

### Critical Issues 🔴
- What needs to be fixed?
1. _______________
2. _______________

---

## Metrics Baseline

Record these BEFORE starting implementation:

```
Entity: [entity-name]
Date: [date]

BEFORE METRICS:

Total props: ___
Scene-level exposed: ___ / ___ (___%)
Default value mismatches: ___
Enable/disable toggles: ___
Over-engineered features: ___
JSDoc completeness: [ ] Excellent [ ] Good [ ] Fair [ ] Poor
TypeScript errors: ___
Triplex accessibility vs peers: [ ] Better [ ] Same [ ] Worse

Peer Comparison:
- vs [Peer A]: [___% difference]
- vs [Peer B]: [___% difference]
```

---

## Next Steps

This exploration is complete when you can answer:

- [ ] How many total props does this entity have?
- [ ] What % of props are exposed at scene level (Triplex editable)?
- [ ] Are JSDoc defaults correct?
- [ ] Does this entity match peer entities in structure/patterns?
- [ ] What are the top 3 improvement opportunities?
- [ ] Are there props that could be removed (< 5% visual impact)?
- [ ] Are there props that could be hardcoded?

**Proceed to:** Phase 2: Issue Identification & Categorization (use issue-categorization.md template)
