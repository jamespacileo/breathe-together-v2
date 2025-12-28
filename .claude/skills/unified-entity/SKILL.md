---
name: unified-entity
description: Comprehensive entity skill for breathe-together-v2. Create new entities, improve existing ones, debug issues, and systematically review all entities. Covers ECS Architecture, Triplex Integration, Performance Tuning, and Debug Tools. Includes 3 entity archetypes (Visual-Only, Simple ECS, Complex ECS), 4 guided workflows, prompt-to-update learning system, and real-world templates from the codebase.
allowed-tools: [Read, Write, Edit, Glob, Grep, Task, AskUserQuestion]
---

# Unified Entity Skill for breathe-together-v2

## Overview

This is a **comprehensive entity skill** that consolidates all entity work into one skill:
- **Create** new entities (Visual-Only, Simple ECS, Complex ECS)
- **Improve** existing entities (Kaizen workflow + 4-angle assessment)
- **Debug** entity issues (Common gotchas + systematic troubleshooting)
- **Systematically Review** all entities with progress tracking

## Four Angles

Every entity is examined through **4 perspectives**:

1. **ECS Architecture** - Traits design, system patterns, execution order
2. **Triplex Integration** - Flat props, JSDoc annotations, scene threading
3. **Performance Tuning** - Instancing, shaders, quality presets
4. **Debug Tools** - Debug contexts, visualizations, manual controls

## Three Entity Archetypes

### Archetype A: Visual-Only Entity
**Pattern:** Single `index.tsx`, no ECS, extensive JSDoc
**Examples:** Lighting ✅, Environment ✅
**When to use:** Pure React Three Fiber components (lights, backgrounds, static visuals)

### Archetype B: Simple ECS Entity
**Pattern:** `index.tsx` + `traits.tsx` + `systems.tsx`, minimal state
**Examples:** Camera, Controller, Cursor
**When to use:** Game controllers, input handlers, simple behaviors

### Archetype C: Complex ECS Entity
**Pattern:** Full ECS + `config.ts`, rich state, contexts
**Examples:** BreathingSphere, ParticleSystem, Breath
**When to use:** Core visual features, breathing sync, particle effects, complex interactions

---

## Quick Start: Choose Your Operation

### 1️⃣ Create New Entity
Use when: Building a new entity from scratch

**Questions I'll ask:**
- What's the entity name? (PascalCase)
- Which archetype fits best? (Visual-Only / Simple ECS / Complex ECS)
- What props/state does it need?
- Should it sync with breathing?

**Outputs:**
- Complete entity files (index.tsx, traits.tsx, systems.tsx if ECS)
- Scene threading (breathing.tsx, .scene.tsx, .debug.scene.tsx)
- sceneDefaults.ts entries
- System registration in providers.tsx

**Workflow:** `workflows/create-entity.md`

---

### 2️⃣ Improve Existing Entity
Use when: Making an entity better (toggles, simplification, accessibility)

**The 6-phase Kaizen process:**
1. **Explore** - Understand current state, count props, measure accessibility
2. **Categorize Issues** - CRITICAL / HIGH / MEDIUM / NICE-TO-HAVE
3. **Gather Preferences** - I present options, you choose priorities
4. **Prioritize** - Impact/Effort matrix (DO FIRST → DO SECOND → DEFER)
5. **Implement** - Remove before adding, measure metrics
6. **Validate** - Verify improvements, document learnings

**Metrics tracked:**
- Total props (before → after)
- Triplex accessibility %
- Default value mismatches
- JSDoc completeness %
- Peer comparison

**Workflow:** `workflows/improve-entity.md`

**Real examples:**
- Environment: 16 → 14 props, 12.5% → 57% accessibility (Commit `8c7b4b7`)
- Lighting: 12 → 16 props, 16 lighting combinations (Commit `fa70554`)

---

### 3️⃣ Debug Entity Issues
Use when: Something's broken or misbehaving

**5 common issue categories:**
1. **ECS State Not Updating** - Traits/systems/query problems
2. **Three.js Render Mismatches** - Mesh sync issues
3. **Performance Issues** - FPS drops, optimization needed
4. **Breathing Synchronization** - Phase timing issues
5. **Triplex Props Missing** - Props don't appear in editor

**For each issue:**
- Symptoms checklist
- Debug steps to investigate
- Tools and techniques available
- Links to similar issues

**Workflow:** `workflows/debug-entity.md`

---

### 4️⃣ Systematically Review All Entities
Use when: Improving multiple entities with progress tracking

**Entities to review (9 total):**
- ✅ Lighting (done)
- ✅ Environment (done)
- ⏳ Land (pending)
- ⏳ BreathingSphere (pending)
- ⏳ ParticleSystem (pending)
- ⏳ Breath (pending)
- ⏳ Camera (pending)
- ⏳ Controller (pending)
- ⏳ Cursor (pending)

**For each entity:**
- 15 min: Exploration (count props, measure accessibility)
- 10 min: Prioritization (identify improvements)
- 5 min: User Decision (approve priority list)
- Variable: Implementation (execute improvements)
- 5 min: Documentation (record learnings)

**Progress tracking:** Markdown table with status, metrics, commits

**Workflow:** `workflows/systematic-review.md`

---

## Learning System: Prompt-to-Update

After any operation, I'll ask:

```
Operation complete! I discovered these patterns:

1. [Pattern description] (Entity: [name])
2. [Pattern description] (Entity: [name])
3. [Pattern description] (Entity: [name])

Add these to skill knowledge base?
- [ ] Yes, add all
- [ ] Choose which ones
- [ ] No, skip
```

**Knowledge captures:**
- **gotchas.md** - Common mistakes, edge cases
- **decisions.md** - Design choices with rationale
- **discoveries.md** - New patterns, reusable solutions

This ensures the skill evolves based on real-world discoveries!

---

## Documentation Structure

- **SKILL.md** (this file) - Overview and quick start
- **reference.md** - Complete technical reference (all 4 angles)
- **patterns.md** - Reusable patterns and anti-patterns
- **examples.md** - Real code from Lighting, Environment, BreathingSphere
- **templates/** - Starting points for each archetype
- **workflows/** - Detailed workflows (create, improve, debug, systematic review)
- **checklists/** - Quality gates for each operation
- **learnings/** - Captured knowledge (gotchas, decisions, discoveries)

---

## Key Features

### 🎯 Comprehensive Coverage
- All 4 angles (ECS, Triplex, Performance, Debug)
- All 3 archetypes (templates for each)
- All 4 operations (create, improve, debug, review)

### 📚 Learn from Examples
- Real code from breathe-together-v2 entities
- Before/after comparisons
- Metrics showing improvements

### 🧠 Learning System
- Prompt-to-update captures discoveries
- Knowledge base grows with each operation
- Gotchas prevent future issues

### 📊 Metrics-Driven
- Props count before/after
- Triplex accessibility measurements
- Default value mismatch tracking
- Peer entity comparisons

### 🔗 Integration
- Integrates ecs-entity patterns (ECS Architecture angle)
- Integrates triplex-component patterns (Triplex Integration angle)
- Integrates kaizen-improvement workflow (Improve operation)
- References existing skills for deep dives

---

## Getting Started

### I want to...

**Create a new entity:**
1. Read `templates/` for archetype templates
2. Follow `workflows/create-entity.md`
3. Check `checklists/creation-checklist.md` for validation

**Improve an existing entity:**
1. Tell me the entity name
2. I'll explore and present improvement options
3. Follow `workflows/improve-entity.md` (6-phase Kaizen)
4. I'll capture learnings in `learnings/`

**Debug an issue:**
1. Tell me what's broken
2. I'll match to `workflows/debug-entity.md` issue category
3. We'll follow systematic troubleshooting steps
4. I'll capture the gotcha in `learnings/gotchas.md`

**Review all entities:**
1. Follow `workflows/systematic-review.md`
2. Track progress through all 9 entities
3. Metrics and learnings captured for each

---

## Related Documentation

- **[reference.md](reference.md)** - Complete technical specifications for all 4 angles
- **[patterns.md](patterns.md)** - Reusable patterns and what to avoid
- **[examples.md](examples.md)** - Real entity implementations from the codebase
- **[workflows/](workflows/)** - Detailed step-by-step workflows
- **[checklists/](checklists/)** - Quality gates and validation checklists
- **[learnings/](learnings/)** - Captured knowledge base

---

## Quick Reference

**File Paths to Know:**
- Lighting entity: `src/entities/lighting/index.tsx`
- Camera entity: `src/entities/camera/index.tsx`
- BreathingSphere: `src/entities/breathingSphere/index.tsx`
- Centralized config: `src/config/sceneDefaults.ts`
- Type definitions: `src/types/sceneProps.ts`
- Scene files: `src/levels/breathing.tsx`, `.scene.tsx`, `.debug.scene.tsx`

**System Execution Order (breathe-together-v2):**
1. breathSystem - Updates breath phase, radius, scale
2. cursorPositionFromLandSystem - Raycasts cursor
3. velocityTowardsTargetSystem - Applies velocity
4. positionFromVelocity - Updates positions
5. meshFromPosition - Syncs Three.js
6. cameraFollowFocusedSystem - Moves camera

---

## What You Can Do With This Skill

✅ Create new entities following breathe-together-v2 patterns
✅ Improve existing entities with Kaizen methodology
✅ Debug entity issues systematically
✅ Review all entities with progress tracking
✅ Learn patterns from real examples
✅ Capture discoveries to improve the skill
✅ Get metrics showing improvements
✅ Maintain consistency across entities

---

## Next Steps

1. **Choose an operation** - Create, Improve, Debug, or Systematic Review
2. **Follow the workflow** - Each operation has detailed steps
3. **Ask questions** - I'll gather info through guided questions
4. **Implement together** - I'll help with code changes
5. **Capture learnings** - Discoveries improve the skill for future use

Let me know which operation you'd like to start with! 🚀
