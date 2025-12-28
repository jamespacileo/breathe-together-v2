# Issue Categorization & Prioritization Template

Use this template during **Phase 2: Issue Identification** and **Phase 4: Impact/Effort Prioritization** to systematically identify and order improvement opportunities.

---

## Issue Categorization

Categorize issues by severity and type. Use this framework to identify what needs to be fixed vs improved vs deferred.

### 🔴 CRITICAL Issues (Correctness & Functionality)

These issues break functionality or create confusion. **Priority: Must-Fix**

| Issue | Description | Impact | Fix Effort | Notes |
|-------|-------------|--------|-----------|-------|
| **Default Mismatch** | JSDoc @default doesn't match code | High: Users confused by actual vs documented | 5 min | List affected props: ___ |
| **Type Error** | TypeScript compilation error | High: Breaks builds | Varies | Error: ___ |
| **Missing Functionality** | Core feature cannot work | Critical | Medium | Example: ___ |
| **Broken Pattern** | Doesn't follow peer entity pattern | High: Inconsistency | Low-Medium | Different from: ___ |

**🔴 CRITICAL Count:** ___

---

### 🟡 HIGH Issues (Functionality & Usability)

These issues limit user options or make features hard to discover. **Priority: Should-Fix**

| Issue | Description | Impact | Fix Effort | Notes |
|-------|-------------|--------|-----------|-------|
| **Missing Toggle** | No enable/disable for optional feature | Medium: Requires workaround (e.g., intensity=0) | Low | Feature: ___ |
| **Low Triplex Accessibility** | Props hidden from scene level | Medium: Hard to adjust in editor | Depends | Props hidden: ___ |
| **Poor JSDoc** | Insufficient "when to adjust" guidance | Medium: Users don't know how to use | Low | Props affected: ___ |
| **Unused Props** | Props defined but never used | Low: Clutter interface | Low | Props to remove: ___ |

**🟡 HIGH Count:** ___

---

### 🟠 MEDIUM Issues (Code Quality & Simplification)

These issues reduce code clarity or maintainability. **Priority: Nice-to-Have or Quick Wins**

| Issue | Description | Impact | Fix Effort | Notes |
|-------|-------------|--------|-----------|-------|
| **Over-Engineering** | More complexity than needed for feature | Low-Medium: Harder to maintain | Medium-High | Example: ___ |
| **Redundant Props** | Multiple props controlling same thing | Low: Confusing interface | Low-Medium | Props: ___ |
| **Inconsistent Naming** | Props don't match peer entities | Low: Inconsistency | Low | Should be: ___ |
| **Hardcodeable Value** | Prop rarely adjusted, < 5% visual impact | Low: Clutter vs benefit low | Low | Prop: ___ |

**🟠 MEDIUM Count:** ___

---

### 🟢 NICE-TO-HAVE Issues (Enhancement & Polish)

These improve experience but aren't required. **Priority: Defer or Include as Quick Wins**

| Issue | Description | Impact | Fix Effort | Notes |
|-------|-------------|--------|-----------|-------|
| **Preset System** | Add quality presets (low/medium/high) | Low: Enhancement only | Medium-High | Presets: ___ |
| **Advanced Config** | Expose rarely-used advanced options | Low: Advanced feature | Medium | Options: ___ |
| **Documentation** | Add more detailed JSDoc examples | Low: Polish | Low | Needs: ___ |
| **Consolidation** | Merge duplicate patterns with peers | Low: Code cleanliness | Medium | Could merge: ___ |

**🟢 NICE-TO-HAVE Count:** ___

---

## Priority Matrix (Impact vs Effort)

Use this matrix to visualize which issues to tackle first.

```
                    LOW EFFORT              HIGH EFFORT
HIGH IMPACT    ┌─────────────────────┬─────────────────────┐
               │                     │                     │
               │     DO FIRST ✓      │    DO SECOND ✓      │
               │                     │                     │
               │ Quick Wins:         │ Plan Carefully:     │
               │ - Fix defaults      │ - Refactor configs  │
               │ - Add toggles       │ - Consolidate code  │
               │                     │                     │
               └─────────────────────┼─────────────────────┘
               │                     │                     │
LOW IMPACT     │   QUICK WINS ✓      │      DEFER ✗        │
               │                     │                     │
               │ Easy improvements:  │ Low priority:       │
               │ - Add JSDoc         │ - Advanced options  │
               │ - Fix typos         │ - Presets           │
               │                     │                     │
               └─────────────────────┴─────────────────────┘
```

### Your Issues on the Matrix

**HIGH IMPACT, LOW EFFORT (DO FIRST):**
1. [ ] ______________________________ (Why: _______________)
2. [ ] ______________________________ (Why: _______________)
3. [ ] ______________________________ (Why: _______________)

**HIGH IMPACT, HIGH EFFORT (DO SECOND):**
1. [ ] ______________________________ (Why: _______________)
2. [ ] ______________________________ (Why: _______________)

**LOW IMPACT, LOW EFFORT (QUICK WINS):**
1. [ ] ______________________________ (Why: _______________)
2. [ ] ______________________________ (Why: _______________)

**LOW IMPACT, HIGH EFFORT (DEFER):**
1. [ ] ______________________________ [DEFER] (Why: _______________)
2. [ ] ______________________________ [DEFER] (Why: _______________)

---

## Decision Criteria

Use these criteria to help categorize and prioritize issues:

### For CRITICAL Issues
Ask: **Can this entity work without fixing this?**
- No → CRITICAL (fix it)
- Yes → Move to HIGH

### For HIGH Issues
Ask: **Do users need this to effectively use the entity?**
- Yes → HIGH (should fix)
- No → Move to MEDIUM

### For MEDIUM Issues
Ask: **Is this a quick win or significant effort?**
- Quick win (< 20 min) → Include in scope
- Significant (> 20 min) → Consider deferring

### For NICE-TO-HAVE Issues
Ask: **Will this improve user experience significantly?**
- Yes → Include if time permits
- No → Defer to future improvement cycle

---

## Impact Assessment

For each issue, estimate its impact:

### Impact Scoring

**HIGH Impact** = Affects functionality, correctness, or user experience significantly
- Examples: Default mismatches, missing toggles, broken patterns
- Score: 8-10 points

**MEDIUM Impact** = Improves code quality or consistency
- Examples: Over-engineering, inconsistent naming, JSDoc gaps
- Score: 4-7 points

**LOW Impact** = Nice-to-have improvements
- Examples: Documentation polish, advanced options, presets
- Score: 1-3 points

### Effort Scoring

**LOW Effort** = 5-20 minutes
- Examples: Fix defaults, add toggles, write JSDoc
- Score: 1-2 points

**MEDIUM Effort** = 20-60 minutes
- Examples: Refactor patterns, update multiple files, add JSDoc comprehensively
- Score: 3-4 points

**HIGH Effort** = 60+ minutes
- Examples: Consolidate code, redesign patterns, major refactors
- Score: 5-6 points

### ROI Score (Impact ÷ Effort)

| Issue | Impact | Effort | ROI | Priority |
|-------|--------|--------|-----|----------|
| Default fix | 9 | 1 | 9.0 | ⭐⭐⭐ DO FIRST |
| Add toggle | 8 | 2 | 4.0 | ⭐⭐ DO SECOND |
| JSDoc update | 5 | 1 | 5.0 | ⭐⭐ QUICK WIN |
| Refactor config | 7 | 4 | 1.75 | Defer |

---

## Issue Tracking Table

Track all identified issues in one place:

| # | Issue | Category | Impact | Effort | ROI | Priority | Status |
|---|-------|----------|--------|--------|-----|----------|--------|
| 1 | Default mismatch (floorOpacity) | 🔴 CRITICAL | 9 | 1 | 9.0 | Must-Do | - |
| 2 | Missing enableFloor toggle | 🟡 HIGH | 8 | 2 | 4.0 | Must-Do | - |
| 3 | Floor material over-engineered | 🟠 MEDIUM | 6 | 2 | 3.0 | Should-Do | - |
| 4 | Low Triplex accessibility | 🟡 HIGH | 7 | 3 | 2.3 | Should-Do | - |
| 5 | Add quality presets | 🟢 NICE-TO-HAVE | 3 | 4 | 0.75 | [DEFER] | - |

---

## Prioritized Task List

Based on matrix analysis and ROI scoring, create your prioritized task list:

### MUST-DO (High Impact, Low Effort)

**Total estimated effort:** ___ minutes

```
1. ______________________________ (~___ min)
   - Reason: High impact, quick fix
   - Dependencies: _______________

2. ______________________________ (~___ min)
   - Reason: High impact, quick fix
   - Dependencies: _______________

3. ______________________________ (~___ min)
   - Reason: High impact, quick fix
   - Dependencies: _______________
```

### SHOULD-DO (Medium Priority)

**Total estimated effort:** ___ minutes

```
4. ______________________________ (~___ min)
   - Reason: Good ROI, unlocks features
   - Dependencies: _______________

5. ______________________________ (~___ min)
   - Reason: Consistency, good pattern
   - Dependencies: _______________
```

### NICE-TO-HAVE (Defer)

**Total estimated effort:** ___ minutes [DEFERRED]

```
6. ______________________________ (~___ min)
   - Reason: Low ROI, can skip this cycle
   - Dependencies: _______________
```

---

## Next Steps

This categorization is complete when you can answer:

- [ ] How many CRITICAL issues? (should be < 5)
- [ ] What's the top 3 Must-Do items? (CRITICAL + HIGH with low effort)
- [ ] What's the ROI of top items? (should be > 2.0)
- [ ] Total Must-Do effort? (should be < 1 hour)
- [ ] Is everything critical fixed in Must-Do? (yes/no)

**Proceed to:** Phase 3: User Preference Gathering (ask user to approve Must-Do priority)
