# Decisions: Design Choices and Trade-Offs

Architectural and design decisions made while working with entities, with rationale and trade-offs.

---

## Format

```markdown
## [Decision Title] (Entity: [entity-name], Date: YYYY-MM-DD)

**Question:** What design choice did we face?
**Options considered:**
- Option 1: Description, effort, pros/cons
- Option 2: Description, effort, pros/cons
- Option 3: Description, effort, pros/cons

**Decision:** What we chose and why
**Trade-offs:** What we gave up / gained
**Related:** Links to similar decisions, patterns, entities
```

---

## How to Add

After making a significant design decision:

1. Frame the question (what choice did we face?)
2. List alternative options with trade-offs
3. State your decision and reasoning
4. Acknowledge what was sacrificed
5. Link to related content

Example:

```markdown
## Why Enable/Disable Toggles Instead of Intensity=0 (Entity: Lighting, Date: 2024-10-20)

**Question:** How should users control whether optional lights are on/off?
**Options considered:**
- Option 1: intensity=0 (existing light, just dim)
  - Pros: No new props
  - Cons: Non-obvious intent, doesn't work for all properties, 0 != disabled
- Option 2: enable/disable toggle boolean
  - Pros: Clear intent, works for all properties, semantic meaning
  - Cons: +1 prop per light
- Option 3: Multiple preset configs
  - Pros: Pre-tested combinations
  - Cons: High effort, less flexibility

**Decision:** Option 2 (enable/disable toggles)
**Trade-offs:**
- We gain: Clear semantic meaning, works universally, enables 2^n combinations
- We lose: Simplicity (one more prop per entity)

**Related:** Pattern: Enable/Disable Toggles, Entity: Lighting, Entity: Environment
```

---

## Transparent Pass-Through vs Scene Redefinition (Date: 2025-12-29)

**Question:** Should scene components (breathing.tsx) define default values for entity props, or should they pass undefined and let entities use their own defaults?

**Options considered:**
- Option 1: Scene defines all defaults (redefines in scene layer)
  - Pros: All defaults in one place (breathing.tsx)
  - Cons: Duplicate defaults, conflicts between scene and entity, confusing ownership
- Option 2: Entity defines defaults, scene passes undefined (Transparent Pass-Through)
  - Pros: Single source of truth, clear ownership, no conflicts, correct Triplex sync
  - Cons: Defaults scattered across files, need discipline to maintain
- Option 3: Centralized sceneDefaults.ts (both layers reference)
  - Pros: True single source of truth
  - Cons: Extra indirection, more complex setup

**Decision:** Option 2 (Transparent Pass-Through) with Option 3 for critical defaults

**Trade-offs:**
- We gain: Clear ownership, single source of truth per entity, no default conflicts, correct Triplex sync
- We lose: Need for discipline to avoid duplicate defaults, slightly scattered defaults
- Optional: Use Option 3 (sceneDefaults.ts) for critical values to achieve true centralization

**Related:** Transparent Pass-Through Pattern (discoveries.md), Scene Threading Pattern, sceneDefaults.ts integration

---

## Scene Threading: 3-Level Hierarchy (Date: 2025-12-29)

**Question:** How should we organize scene files for production, experimental, and debug scenarios?

**Options considered:**
- Option 1: Single scene file with all toggles
  - Pros: One file to maintain
  - Cons: Confusing UI with 50+ props, mixing concerns
- Option 2: Separate files for each purpose (3-level threading)
  - Pros: Clear separation, focused controls, progressive disclosure
  - Cons: Need to maintain 3 files
- Option 3: Component composition with feature flags
  - Pros: Flexible combinations
  - Cons: Complex dependency management

**Decision:** Option 2 (Scene Threading: breathing.tsx → .scene.tsx → .debug.scene.tsx)

**Trade-offs:**
- We gain: Clear separation of concerns, focused UI, progressive disclosure, better user experience
- We lose: Need to maintain 3 related files (mitigated by clear patterns)

**Scene levels:**
1. **breathing.tsx** (production): Only scene-owned props (backgroundColor, bloom)
2. **breathing.scene.tsx** (experimental): Adds preset exploration and quality testing
3. **breathing.debug.scene.tsx** (debug): All controls, manual phase, particle stats

**Related:** Scene Threading Pattern (discoveries.md), Transparent Pass-Through Pattern, ecs-entity skill

---

## Tuple Types vs Flat Scalar Props for Vectors (Date: 2025-12-29)

**Question:** For vector properties (position, scale, rotation), should we use tuples `[x: number, y: number, z: number]` or flat scalar props `positionX, positionY, positionZ`?

**Options considered:**
- Option 1: Flat scalar props (positionX, positionY, positionZ)
  - Pros: Traditional approach, works fine
  - Cons: Clutters interface (6 props for position+scale), unclear relationships, poor Triplex UX
- Option 2: Tuple types `[x: number, y: number, z: number]`
  - Pros: Clean interface, type-safe, Triplex renders as grouped inputs, obvious intent
  - Cons: Need to destruct tuple in component (minor)
- Option 3: Mixed/union types `number | [x: number, y: number, z: number]`
  - Pros: Flexible (uniform scale OR per-axis), single prop covers both cases
  - Cons: Need conditional logic in component (typeof check)

**Decision:** Option 2 (Tuple types) as default, Option 3 (Union types) when flexibility needed

**Trade-offs:**
- We gain: Clean interface, better Triplex UX, type safety, fewer props (6→2 for position+scale)
- We lose: Traditional flat prop approach (minimal impact)
- Optional: Use union types for scale/rotation when both uniform and per-axis control make sense

**Patterns:**
```typescript
// Standard vectors (position, rotation)
position?: [x: number, y: number, z: number];
rotation?: [x: number, y: number, z: number];

// Flexible vectors (scale can be uniform or per-axis)
scale?: number | [x: number, y: number, z: number];

// Multiple formats (color in hex, number, or RGB)
color?: string | number | [r: number, g: number, b: number];
```

**Related:** Tuple Types for Vector Props (discoveries.md), Flat Props & Tuple Types (triplex-component skill)

---

## Discovery Template

Use this as a starting point for new decisions:

```markdown
## [Decision Title] (Entity: [entity-name], Date: YYYY-MM-DD)

**Question:**
**Options considered:**

**Decision:**
**Trade-offs:**
**Related:**
```

---

## Notes

- This file grows as we make architectural decisions
- Each decision documents our rationale
- Check this file to understand WHY things are the way they are
- Use to inform new entity designs (avoid repeating old debates)
