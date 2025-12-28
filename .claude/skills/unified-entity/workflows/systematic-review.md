# Systematic Entity Review Workflow

Review and improve all 9 entities in breathe-together-v2 with progress tracking.

**Time estimate:** 7-10 hours for all entities (or improve them incrementally)

---

## Entity Inventory

**Current Status:**

| Entity | Type | Status | Priority | Est. Effort |
|--------|------|--------|----------|-------------|
| Lighting | Visual-Only | ✅ Done | — | — |
| Environment | Visual-Only | ✅ Done | — | — |
| Land | Visual-Only | ⏳ Pending | 3 (Low) | 30 min |
| BreathingSphere | Complex ECS | ⏳ Pending | 1 (High) | 1.5 hours |
| ParticleSystem | Complex ECS | ⏳ Pending | 1 (High) | 2 hours |
| Breath | Complex ECS | ⏳ Pending | 2 (Medium) | 1 hour |
| Camera | Simple ECS | ⏳ Pending | 2 (Medium) | 45 min |
| Controller | Simple ECS | ⏳ Pending | 2 (Medium) | 45 min |
| Cursor | Simple ECS | ⏳ Pending | 2 (Medium) | 45 min |

**Total pending effort:** 7.5 hours

---

## Systematic Review Process

### For Each Entity:

**Phase 1: Exploration (15 min)**
- Count props: total vs scene-level
- Measure Triplex accessibility %
- Assess JSDoc quality
- Compare to peer entities
- List technical debt items

**Phase 2: Prioritization (10 min)**
- Identify CRITICAL issues
- Count HIGH issues
- Note MEDIUM improvements
- Estimate effort

**Phase 3: User Decision (5 min)**
- Present improvement options
- Get approval on priority

**Phase 4: Implementation (variable)**
- Execute approved improvements
- Follow improve-entity workflow
- Update sceneDefaults.ts, sceneProps.ts
- Test in Triplex

**Phase 5: Documentation (5 min)**
- Record metrics (before → after)
- Document learnings
- Add to learnings/discoveries.md

**Total per entity:** 35 min + implementation time

---

## Recommended Order

### Tier 1 (High Value, Complex): 3.5 hours
1. **BreathingSphere** - Core visual, 23 props, complex state
   - Improvements: Triplex accessibility, JSDoc, debug support
   - Effort: 1.5 hours

2. **ParticleSystem** - Performance critical, 2 files, complex config
   - Improvements: Unified component, consolidation, toggles
   - Effort: 2 hours

### Tier 2 (Medium Value, Simpler): 2.5 hours
3. **Breath** - State-only entity, simple trait system
   - Improvements: System organization, consistency
   - Effort: 1 hour

4. **Camera** - Simple behavior, minimal props
   - Improvements: JSDoc, pattern consistency
   - Effort: 45 min

5. **Controller** - Input handling
   - Improvements: JSDoc, standardization
   - Effort: 45 min

### Tier 3 (Low Value, Quick): 1.5 hours
6. **Cursor** - Visual feedback, minimal config
   - Improvements: JSDoc, consistency
   - Effort: 45 min

7. **Land** - Terrain, static visual
   - Improvements: Toggle support, simplification
   - Effort: 30 min

---

## Progress Tracking

Use this table to track systematic review progress:

```markdown
| Entity | Archetype | Before Props | After Props | Accessibility | Toggles | Status | Commit | Notes |
|--------|-----------|--------------|-------------|---------------|---------|--------|--------|-------|
| Lighting | Visual-Only | 15 | 16 | 100% → 100% | 4 added | ✅ | fa70554 | Toggles for A/B testing |
| Environment | Visual-Only | 16 | 14 | 12.5% → 57% | 3 added | ✅ | 8c7b4b7 | Simplified floor, improved accessibility |
| Land | Visual-Only | ? | ? | ? | ? | ⏳ | — | Pending |
| BreathingSphere | Complex ECS | ? | ? | ? | ? | ⏳ | — | Pending |
| ParticleSystem | Complex ECS | ? | ? | ? | ? | ⏳ | — | Pending |
| Breath | Complex ECS | ? | ? | ? | ? | ⏳ | — | Pending |
| Camera | Simple ECS | ? | ? | ? | ? | ⏳ | — | Pending |
| Controller | Simple ECS | ? | ? | ? | ? | ⏳ | — | Pending |
| Cursor | Simple ECS | ? | ? | ? | ? | ⏳ | — | Pending |
```

---

## Learnings Across All Entities

As we systematically review, patterns will emerge:

**Applied patterns:**
- Enable/disable toggles (Lighting → Environment → others?)
- Hardcoding < 5% impact (Environment → others?)
- Props-to-config conversion (BreathingSphere → ParticleSystem?)
- Scene threading best practices (all entities)

**New discoveries:**
- Document unexpected findings
- Capture gotchas
- Record design decisions
- Identify reusable solutions

---

## Success Metrics

After systematic review:

**Codebase Quality:**
- ✅ All 9 entities follow consistent patterns
- ✅ No default value mismatches
- ✅ All props documented with JSDoc
- ✅ Triplex accessibility > 50% for all entities

**User Experience:**
- ✅ Enable/disable toggles where applicable
- ✅ Scene threading complete for all entities
- ✅ Debug contexts for complex entities
- ✅ Quality presets for performance-critical entities

**Knowledge Base:**
- ✅ learnings/ files populated with discoveries
- ✅ patterns/ documented with real examples
- ✅ examples/ updated with all entity types
- ✅ templates/ proven with all archetypes

---

## How to Start

1. **Choose first entity** - Start with BreathingSphere (high value, complex)
2. **Run Phase 1** - I'll explore and gather metrics
3. **I'll present options** - Show improvements (usually 3-5 opportunities)
4. **You select** - Approve what to implement
5. **I'll implement** - Execute improvements
6. **Document** - Record metrics and learnings

**Result:** BreathingSphere improved with metrics, learnings captured, patterns identified for other entities

Repeat for remaining 8 entities in recommended order.

---

## Long-Term View

This systematic review is an investment in consistency:

**Week 1:** Lighting ✅, Environment ✅
**Week 2:** BreathingSphere, ParticleSystem, Breath
**Week 3:** Camera, Controller, Cursor, Land
**Outcome:**
- 9/9 entities follow consistent patterns
- Learnings captured for future development
- Templates proven and refined
- New developers have clear examples

---

## Next Steps

Ready to systematically improve all entities?

1. Let me know which entity to start with
2. I'll explore and present improvement options
3. You select what to prioritize
4. We implement and capture learnings

Let's start! Which entity should we improve first?
