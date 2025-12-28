# Kaizen Improvement Checklist

Quick reference checklist for running through the 6-phase workflow.

---

## Phase 1: Comprehensive Exploration ✓

- [ ] Read entity files (index.tsx, systems.tsx, traits.tsx)
- [ ] Read src/config/sceneDefaults.ts for defaults
- [ ] Count total props in interface
- [ ] Count scene-level exposed props (in breathing.tsx, breathing.scene.tsx, breathing.debug.scene.tsx)
- [ ] Calculate accessibility % = (exposed / total) × 100
- [ ] Document JSDoc quality (all props documented? @default? "When to adjust"?)
- [ ] Identify default value mismatches (JSDoc @default vs code default)
- [ ] Compare to peer entities (Environment, Lighting, BreathingSphere)
- [ ] List technical debt items

### Metrics Baseline

Record these BEFORE starting implementation:

```
Total props: ___
Scene-level exposed: ___ / ___ = ___% accessibility
Default value mismatches: ___
Missing toggles: ___
Over-engineered props: ___
JSDoc quality: □ Excellent □ Good □ Fair □ Poor
Triplex accessibility vs peers: Better □  Same ■  Worse □
```

---

## Phase 2: Issue Identification & Categorization ✓

### Issue Count

- [ ] 🔴 CRITICAL issues identified: ___ (correctness, default mismatches)
- [ ] 🟡 HIGH issues identified: ___ (missing functionality, Triplex access)
- [ ] 🟠 MEDIUM issues identified: ___ (over-engineering, clutter)
- [ ] 🟢 NICE-TO-HAVE identified: ___ (consistency, deferred)

### Issue Details

**🔴 CRITICAL:**
- [ ] Issue 1: _______________
- [ ] Issue 2: _______________
- [ ] Issue 3: _______________

**🟡 HIGH:**
- [ ] Issue 1: _______________
- [ ] Issue 2: _______________

**🟠 MEDIUM:**
- [ ] Issue 1: _______________

**🟢 NICE-TO-HAVE:**
- [ ] Issue 1: _______________

---

## Phase 3: User Preference Gathering ✓

- [ ] Present 3-4 options with effort estimates
- [ ] Mark one option as "Recommended"
- [ ] Include impact summary for each option
- [ ] Get user approval on priority selections
- [ ] Document user selections

### User Approval Record

```
User selected:
□ Option 1 (Must-Do): ___________________ (~___ min)
□ Option 2 (Should-Do): ___________________ (~___ min)
□ Option 3 (Deferred): ___________________ (~___ min) [DEFERRED]
```

---

## Phase 4: Impact/Effort Prioritization ✓

- [ ] Categorize issues into 2x2 matrix
  - [ ] High Impact, Low Effort (DO FIRST)
  - [ ] High Impact, High Effort (DO SECOND)
  - [ ] Low Impact, Low Effort (QUICK WINS)
  - [ ] Low Impact, High Effort (DEFER)

### Task Ordering

**MUST-DO (estimate total: ___ min):**
1. [ ] Task: _________________ (~___ min) - Reason: _____________
2. [ ] Task: _________________ (~___ min) - Reason: _____________
3. [ ] Task: _________________ (~___ min) - Reason: _____________

**SHOULD-DO (estimate total: ___ min):**
4. [ ] Task: _________________ (~___ min) - Reason: _____________
5. [ ] Task: _________________ (~___ min) - Reason: _____________

**NICE-TO-HAVE (defer):**
- [ ] Task: _________________ (~___ min) [DEFERRED]
- [ ] Task: _________________ (~___ min) [DEFERRED]

---

## Phase 5: Implementation with Simplification ✓

### Pre-Implementation

- [ ] All 4 phases complete and documented
- [ ] User has approved priority list
- [ ] Breaking changes identified
- [ ] Backward compatibility strategy determined

### During Implementation - Removals First

- [ ] Identify props to remove (< 5% visual impact, rarely used)
- [ ] Props to remove: _________________, _________________, _________________
- [ ] Delete prop definitions from interface
- [ ] Hardcode removed values in component
- [ ] Remove from sceneDefaults.ts
- [ ] Remove from sceneProps.ts
- [ ] Test in browser (visual appearance unchanged)

### During Implementation - Hardcoding

- [ ] Identify rarely-used values to hardcode
- [ ] Values: _________________, _________________, _________________
- [ ] Hardcode in JSX/component
- [ ] Document reason in comments

### During Implementation - New Props

- [ ] Add to interface with JSDoc
- [ ] Update function signature with defaults
- [ ] Add conditional rendering (if toggles)
- [ ] Add to sceneDefaults.ts with metadata
- [ ] Add to sceneProps.ts interface
- [ ] Thread through breathing.tsx
- [ ] Thread through breathing.scene.tsx
- [ ] Thread through breathing.debug.scene.tsx

### Post-Implementation - Testing

- [ ] `npm run typecheck` passes (no new errors)
- [ ] Visual check in Triplex (new props appear)
- [ ] Triplex annotations work (@min, @max, @step, @default)
- [ ] Default behavior unchanged (visual check in browser)
- [ ] Backward compatibility maintained (all defaults = true)

---

## Phase 6: Review & Validation ✓

### Collect After-Implementation Metrics

```
AFTER METRICS:

Total props: ___
Scene-level exposed: ___ / ___ = ___% accessibility
Default value mismatches: ___
Enable/disable toggles: ___
Over-engineered props: ___
JSDoc quality: □ Excellent □ Good □ Fair □ Poor
```

### Measure Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Total props | ___ | ___ | ___% change |
| Accessibility | ___% | ___% | ___x improvement |
| Default mismatches | ___ | ___ | ___ fixed |
| Toggles | ___ | ___ | ___ added |
| Over-engineered | ___ | ___ | ___ removed |

### Validation Checklist

- [ ] All CRITICAL issues fixed (100%)
- [ ] All HIGH issues fixed or deferred with justification
- [ ] Props reduced or maintained (not increased without reason)
- [ ] Triplex accessibility improved or maintained
- [ ] No new type errors introduced
- [ ] Visual appearance correct in 3D editor
- [ ] Backward compatibility maintained
- [ ] Commit message includes before/after metrics

### Document Lessons Learned

- [ ] **What worked well:** _______________________________________________
- [ ] **What was surprising:** _______________________________________________
- [ ] **What to do differently next time:** _______________________________________________
- [ ] **Patterns to reuse:** _______________________________________________

### Commit

- [ ] Stage all changes: `git add [files]`
- [ ] Write descriptive commit message with metrics
- [ ] Include "Before: X props, After: Y props"
- [ ] Include "Commits: [hash from Environment/Lighting for reference]"
- [ ] Commit: `git commit -m "..."`
- [ ] Verify: `git log --oneline -1` shows your commit

---

## Quick Reference: Decision Trees

### Should I Add This Prop?

```
Is it critical? YES → Is it frequently adjusted (>20% users)?
  YES → Can we hardcode? NO → Does it reduce complexity?
    YES → ADD ✅
    NO → RECONSIDER
  NO → Can we hardcode? YES → HARDCODE, DON'T ADD ✅
       NO → CONTINUE
Is it for future-proofing? NO → CONSIDER ADDING
  YES → DON'T ADD ❌
```

### Should I Remove This Prop?

```
Is it ever used? NO → REMOVE ✅
  YES → Is it critical? NO → Can users work around it?
    NO → KEEP
    YES → Does it clutter interface?
      NO → KEEP
      YES → Can we hardcode? YES → HARDCODE ✅
             NO → Does it match peers?
               NO → REMOVE ✅
               YES → KEEP
  YES → KEEP
```

---

## Common Gotchas

- ❌ **Forgot Phase 3:** Implement without user input → user rejects changes
- ❌ **Only added, never removed:** Props 10 → 15 → 20... (no simplification)
- ❌ **Hardcoded too much:** Removed configurable values that users needed
- ❌ **Forgot to thread props:** Added to interface but missing from scene files
- ❌ **Skipped Triplex validation:** New props don't appear in editor
- ❌ **Changed defaults:** Broke backward compatibility (use defaults: true)
- ❌ **Forgot before/after metrics:** Can't show improvement to team

---

## Success Indicators

You've succeeded when:

✅ All CRITICAL issues are fixed (0 mismatches, 0 type errors)
✅ Props count decreased OR new props have high value
✅ Triplex accessibility improved
✅ All toggles work correctly in browser
✅ Before/after metrics show clear improvement
✅ Team can understand changes from commit message
✅ No regression in visual appearance or functionality

---

## Time Estimates

Typical workflow duration:

| Phase | Time | Notes |
|-------|------|-------|
| Phase 1: Exploration | 30-45 min | Read files, count props, compare |
| Phase 2: Categorization | 15-30 min | Identify issues, prioritize |
| Phase 3: User Preferences | 5-10 min | Present options, get approval |
| Phase 4: Prioritization | 10-15 min | Create 2x2 matrix, order tasks |
| Phase 5: Implementation | 30-120 min | Execute based on Must-Do items |
| Phase 6: Validation | 10-20 min | Collect metrics, commit |
| **TOTAL** | **2-4 hours** | **For comprehensive improvement** |

Quick wins (like Environment defaults): **30-45 minutes**
Medium improvements (like Lighting toggles): **1-1.5 hours**
Large refactors: **2-4 hours**

---

## See Also

- **Main workflow:** WORKFLOW.md (detailed 6-phase process)
- **Exploration template:** templates/exploration-template.md
- **Case study (remove):** case-studies/environment-entity.md
- **Case study (add):** case-studies/lighting-entity.md
