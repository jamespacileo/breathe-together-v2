# Claude Workflows

Reusable systematic processes for improving breathe-together-v2 codebase.

## Available Workflows

### Kaizen Improvement

**File:** `kaizen-improvement/WORKFLOW.md`

**Purpose:** Systematic continuous improvement workflow for existing entities using a 6-phase process.

**When to use:**
- Improving existing entities (Environment, Lighting, BreathingSphere, ParticleSystem, Camera, Controller, Cursor)
- Fixing default value mismatches
- Adding missing enable/disable toggles
- Simplifying over-engineered interfaces
- Improving Triplex accessibility
- Standardizing JSDoc quality

**Key phases:**
1. Comprehensive Exploration - Understand current state, gather metrics
2. Issue Identification - Categorize issues by severity (CRITICAL, HIGH, MEDIUM, NICE-TO-HAVE)
3. User Preference Gathering - Present options and get approval
4. Impact/Effort Prioritization - Use 2x2 matrix to order work
5. Implementation with Simplification - Remove before adding, hardcode rarely-used values
6. Review & Validation - Measure improvements and document lessons

**Time estimate:** 2-4 hours for comprehensive improvements, 30-45 minutes for quick wins

**Quick reference:** `kaizen-improvement/checklist.md` (printable checklist for each phase)

**Real examples:**
- Environment Entity: Fixed 3 default mismatches, removed 2 props, added 3 toggles (Commit `8c7b4b7`)
- Lighting Entity: Added 4 toggles for A/B testing lighting combinations (Commit `fa70554`)

**Key principles:**
- ✅ Remove before adding
- ✅ Simplify first (hardcode rarely-used values < 5% visual impact)
- ✅ Reduce cognitive load (fewer props = easier to understand)
- ✅ Measure everything (track before/after metrics)
- ✅ Backward compatibility (use defaults = true)
- ✅ Leave code better than you found it

---

## Quick Start

To improve an entity using the Kaizen Improvement workflow:

1. **Read the workflow:** `cat kaizen-improvement/WORKFLOW.md`
2. **Use the checklist:** `cat kaizen-improvement/checklist.md`
3. **Explore current state:** Count props, measure accessibility, identify issues
4. **Prioritize with user:** Present options, get approval on Must-Do vs Should-Do vs Nice-to-Have
5. **Implement:** Remove unused props first, then hardcode rarely-used values, then add new functionality
6. **Validate:** Collect metrics, commit with before/after comparison

Expected flow: Phase 1 (30-45 min) → Phase 2-4 (30-45 min) → Phase 5 (30-120 min) → Phase 6 (15 min)

---

## Workflows in Development

Additional workflows to be added:

- **Component Creation** - For building new Triplex-editable entities from scratch
- **Consolidation** - For merging duplicate patterns across entities
- **Performance Optimization** - For systematic performance improvements
- **Documentation** - For standardizing JSDoc and type annotations

---

## Integration with .claude/skills

These workflows complement existing skills in `.claude/skills/`:

- **triplex-component** - Use for creating NEW entities (Kaizen improves existing ones)
- **ecs-entity** - Use for understanding ECS patterns (Kaizen applies ECS knowledge)
- **breath-sync-feature** - Use for breathing-synchronized features (Kaizen can improve them)
- **breath-sync-validator** - Use for validating breath calculations (Kaizen applies improvements)

---

## Lessons Learned

From successful Kaizen improvements:

✅ **Default alignment matters** - Users trust JSDoc for defaults (fix mismatches first)
✅ **Toggle pattern scales** - Environment toggles → Lighting toggles (reusable pattern)
✅ **Hardcoding threshold: < 5%** - Visual impact so small it's imperceptible = hardcode
✅ **Triplex accessibility is surprising** - Users discovered 6 props they didn't know existed
✅ **Simplification > Addition** - Removing 2 props was more valuable than adding 3
✅ **Backward compatibility is critical** - defaults=true ensures no breaking changes

---

## Next Entities to Improve

Priority order based on Kaizen assessment:

1. **BreathingSphere** (~1.5 hours)
   - Add enableSphere toggle
   - Simplify dual config merge logic
   - Improve Triplex accessibility (currently ~75%)

2. **ParticleSystem** (~2 hours)
   - Create unified component (consolidate 3 files)
   - Expose Triplex props (currently 0% exposed)
   - Add particle geometry/detail toggles

3. **Camera** (~1 hour)
   - Standardize JSDoc format
   - Add zoom/fov prop exposure
   - Match Lighting/Environment pattern

4. **Controller** (~45 minutes)
   - Add JSDoc annotations
   - Expose movement speed props
   - Match pattern across entities

5. **Cursor** (~45 minutes)
   - Add customization props (size, color, opacity)
   - Add JSDoc annotations
   - Match pattern across entities

---

## Resources

- **Workflow Details:** `kaizen-improvement/WORKFLOW.md`
- **Quick Checklist:** `kaizen-improvement/checklist.md`
- **Exploration Template:** `kaizen-improvement/templates/exploration-template.md` (coming soon)
- **Case Study (Simplification):** `kaizen-improvement/case-studies/environment-entity.md` (coming soon)
- **Case Study (Extension):** `kaizen-improvement/case-studies/lighting-entity.md` (coming soon)

---

## Contributing

To add a new workflow:

1. Create `[workflow-name]/` directory
2. Add `[WORKFLOW-NAME].md` with YAML frontmatter
3. Add `checklist.md` for quick reference
4. Add `templates/` directory with reusable templates
5. Add `case-studies/` directory with examples
6. Update this README

---

## Philosophy

The Kaizen Improvement Workflow embodies "Kaizen" - continuous improvement, one small step at a time.

> "Leave code better than you found it. Fix one issue, simplify one prop, improve one user experience. Compound these small improvements across the codebase and you get a better product for everyone." - breathe-together-v2 development philosophy

Each improvement should satisfy:
- ✅ **Correctness**: Fix bugs, align defaults
- ✅ **Simplicity**: Reduce complexity, remove unused code
- ✅ **Consistency**: Match peer entities, standardize patterns
- ✅ **Discoverability**: Improve Triplex accessibility
- ✅ **User Value**: Enable new use cases, improve UX

---

## Status

Last updated: December 28, 2025

Successfully applied to:
- ✅ Environment Entity (8c7b4b7)
- ✅ Lighting Entity (fa70554)

Ready for: BreathingSphere, ParticleSystem, Camera, Controller, Cursor
