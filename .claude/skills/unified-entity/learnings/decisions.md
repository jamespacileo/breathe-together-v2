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
