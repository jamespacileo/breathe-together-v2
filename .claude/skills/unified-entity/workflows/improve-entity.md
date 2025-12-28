# Improve Existing Entity Workflow

Systematically improve an existing entity using 6-phase Kaizen methodology with 4-angle assessment.

**Time estimate:** 1.5 - 3 hours depending on entity complexity

---

## Quick Start

1. **Tell me the entity name** - Which entity do you want to improve?
2. **I'll explore** - Gather metrics and identify opportunities
3. **I'll present options** - Show improvement opportunities with effort estimates
4. **You choose** - Approve priority list (what's most important?)
5. **We implement** - Make improvements following Kaizen principles
6. **I'll capture learnings** - Add discoveries to skill knowledge base

---

## The 6 Phases

### Phase 1: Comprehensive Exploration

**Goal:** Understand current state without assumptions. Gather baseline metrics.

**Activities:**
- Read entity files (index.tsx, traits.tsx, systems.tsx, config.ts if exists)
- Count props and measure Triplex accessibility (% exposed at scene level)
- Assess 4 angles:
  - ECS Architecture: Trait patterns, system design
  - Triplex Integration: Props structure, JSDoc quality, scene threading
  - Performance: Instancing, shader optimization, quality presets
  - Debug Tools: Debug contexts, manual controls, visualizations
- Compare to peer entities
- Document technical debt

**Metrics to collect:**
```
Total props: ___
Scene-level exposed: ___ / ___ (___%)
Default value mismatches: ___
Enable/disable toggles: ___
Over-engineered props: ___
JSDoc completeness: (Excellent / Good / Fair / Poor)
Peer comparison: (Better / Same / Worse)
```

**Output:** Current state assessment with specific issues identified

---

### Phase 2: Issue Identification & Categorization

**Goal:** Find improvement opportunities and prioritize by severity.

**Categorize issues:**
- **🔴 CRITICAL** - Correctness (default mismatches, type errors, broken patterns)
- **🟡 HIGH** - Usability (missing toggles, low Triplex accessibility, confusing props)
- **🟠 MEDIUM** - Code quality (over-engineering, clutter, JSDoc gaps)
- **🟢 NICE-TO-HAVE** - Consistency (presets, consolidation, refactoring)

**Key questions:**
1. What's broken or inconsistent? (CRITICAL)
2. What's hard to use or discover? (HIGH)
3. What's over-engineered or redundant? (MEDIUM)
4. What would improve consistency? (NICE-TO-HAVE)

**Output:** Prioritized issue list with impact/effort assessment

---

### Phase 3: User Preference Gathering

**Goal:** Validate assumptions and get user buy-in before implementation.

**I'll present options:**
- Option A (Recommended) - Focus on CRITICAL + HIGH issues, basic improvements
- Option B - Option A + more comprehensive improvements
- Option C - Defer some improvements to next cycle

**For each option:**
- List improvements (CRITICAL issues to fix, HIGH improvements to make)
- Estimate effort (minutes to hours)
- Estimate impact (props reduction, accessibility improvement, toggles added)

**You choose:**
- Select which improvements to prioritize
- I implement your approved list

**Output:** User-approved priority list for implementation

---

### Phase 4: Impact/Effort Prioritization

**Goal:** Maximize value, minimize waste by ordering tasks.

**Priority matrix:**

```
                 LOW EFFORT          HIGH EFFORT
HIGH IMPACT   ┌──────────────┬──────────────┐
              │ DO FIRST ✓   │ DO SECOND ✓  │
              └──────────────┼──────────────┘
LOW IMPACT    │ QUICK WINS ✓ │ DEFER ✗      │
              └──────────────┴──────────────┘
```

**Ordered task list:**
1. **MUST-DO** (CRITICAL + HIGH with low effort) - Required fixes + quick wins
2. **SHOULD-DO** (HIGH impact, reasonable effort) - Nice to include if time permits
3. **DEFER** (LOW impact or HIGH effort) - Save for next cycle

**Output:** Ordered task list with effort estimates

---

### Phase 5: Implementation with Simplification

**Goal:** Execute improvements while reducing complexity.

**Kaizen principles:**
- **Remove before adding** - Can we delete props instead of adding features?
- **Simplify first** - Hardcode rarely-used props (< 5% visual impact)
- **Reduce cognitive load** - Fewer props = easier to understand
- **Leave it better** - Every change should improve the codebase

**Implementation steps:**
1. **Remove unnecessary props** - Delete unused or hardcodeable props
2. **Add new features** - Toggles, better JSDoc, scene threading
3. **Update all 3 scenes** - Thread props through breathing.tsx, .scene.tsx, .debug.scene.tsx
4. **Update config** - sceneDefaults.ts, sceneProps.ts, system registration
5. **Test in browser** - Visual check, Triplex validation, TypeScript check

**Testing checklist:**
- [ ] `npm run typecheck` passes (no new errors)
- [ ] Visual appearance unchanged or improved
- [ ] New props appear in Triplex sidebar
- [ ] Default behavior preserved (backward compatible)
- [ ] Triplex annotations work (@min/@max/@step/@default)

**Output:** Working implementation with reduced complexity

---

### Phase 6: Review & Validation

**Goal:** Measure success and document learnings.

**Collect after-metrics:**
```
AFTER METRICS:

Total props: ___
Scene-level exposed: ___ / ___ (___%)
Default mismatches: ___
Toggles: ___
Over-engineered: ___
JSDoc completeness: (Excellent / Good / Fair / Poor)
```

**Measure improvements:**

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Total props | ___ | ___ | ___% change |
| Accessibility | ___% | ___% | ___x improvement |
| Default mismatches | ___ | ___ | ___ fixed |
| Toggles | ___ | ___ | ___ added |
| Over-engineered | ___ | ___ | ___ removed |

**Validation checklist:**
- [ ] All CRITICAL issues fixed (100%)
- [ ] All HIGH issues addressed or deferred with justification
- [ ] Props reduced or maintained (not added without reason)
- [ ] Triplex accessibility improved or maintained
- [ ] No new type errors introduced
- [ ] Visual appearance correct in 3D editor
- [ ] Backward compatibility maintained
- [ ] Commit message includes metrics

**Commit message pattern:**
```
feat: [Improvement description for Entity]

[Detailed description of what improved]

Benefits:
- [Benefit 1]
- [Benefit 2]
- [Benefit 3]

Changes:
- [File: change description]
- [File: change description]

Before/After metrics:
- Props: X → Y (Z% reduction)
- Accessibility: X% → Y% (Zx improvement)
- Toggles: X → Y

Related: [Reference kaizen-improvement, other entities improved]

🤖 Generated with Claude Code
```

**Document learnings:**
- What worked well?
- What was surprising?
- What to do differently next time?
- Patterns to reuse on other entities?

**Output:** Validated improvements, metrics, learnings captured

---

## Common Improvements Across Entities

### Quick Wins (5-30 min each)
- Fix default value mismatches
- Add missing JSDoc annotations
- Add enable/disable toggles
- Expose hidden props to scene level

### Medium Improvements (30 min - 2 hours)
- Refactor props-to-config conversion
- Update JSDoc comprehensively
- Add quality preset integration
- Simplify over-engineered interfaces

### Larger Improvements (2+ hours)
- Consolidate duplicate patterns
- Refactor systems architecture
- Implement debug context
- Major simplification effort

---

## 4-Angle Assessment During Exploration

### Angle 1: ECS Architecture
**Questions:**
- Are trait patterns clean and consistent?
- Do systems follow execution order?
- Is there unnecessary state?
- Can we simplify trait design?

### Angle 2: Triplex Integration
**Questions:**
- Are props flat (not nested)?
- Is JSDoc comprehensive?
- Are all props exposed at scene level?
- Do prop names follow conventions?

### Angle 3: Performance Tuning
**Questions:**
- Are we using instanced rendering correctly?
- Are shaders optimized?
- Do quality presets exist?
- Can we reduce geometry complexity?

### Angle 4: Debug Tools
**Questions:**
- Are debug contexts in place?
- Do debug scenes exist?
- Are there visual overlays?
- Can users manually control state?

---

## When to Use This Workflow

✅ Improving existing entities (BreathingSphere, ParticleSystem, etc.)
✅ Refactoring for Triplex integration
✅ Simplifying over-engineered interfaces
✅ Adding missing toggles or controls
✅ Fixing default value mismatches
✅ Standardizing JSDoc quality

❌ Creating entirely new entities (use create-entity workflow)
❌ Bug fixes unrelated to architecture (use debug-entity workflow)
❌ Performance optimization without structural changes (use optimize guides)

---

## Real Examples

### Environment Entity Improvement
- Before: 16 props, 12.5% accessibility, 3 default mismatches
- After: 14 props (12.5% reduction), 57% accessibility (4.5x improvement), 0 mismatches
- Commit: `8c7b4b7`

### Lighting Entity Improvement
- Before: 12 props, no toggles, 1 lighting combination possible
- After: 16 props (added 4 toggles), 16 lighting combinations
- Commit: `fa70554`

---

## Next Steps

1. **Identify entity to improve** - Which entity needs work?
2. **Run Phase 1** - I'll explore and gather metrics
3. **Review findings** - Look at what I discovered
4. **Select improvements** - You choose what to prioritize
5. **Execute** - Implement the approved list
6. **Capture learnings** - What did we discover?

Ready to improve an entity? Let me know which one!
