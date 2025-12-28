# Discoveries: New Patterns and Reusable Solutions

Novel patterns, reusable solutions, and better approaches discovered while working with entities.

---

## Format

```markdown
## [Pattern/Solution Title] (Entity: [entity-name], Date: YYYY-MM-DD)

**Context:** What situation led to this discovery?
**Pattern/Solution:** The pattern or approach
**How to apply:** Steps for using this on other entities
**Why it works:** Why this is better than alternatives
**Example code:** Concrete implementation example
**Metrics:** Impact before/after (if applicable)
**Related:** Links to pattern documentation, decision rationale, other entities
```

---

## How to Add

After discovering a useful pattern or solution:

1. Describe the situation that led to discovery
2. Explain the pattern or solution
3. Provide steps for applying to other entities
4. Explain why it's effective
5. Include code example
6. Document metrics (if measurable)
7. Link to related content

Example:

```markdown
## Hardcoding Props with <5% Visual Impact (Entity: Environment, Date: 2024-10-15)

**Context:** Environment entity had floorRoughness (always 1.0) and floorMetalness (always 0.0) props that nobody adjusted.
**Pattern/Solution:** Remove props with imperceptible visual impact by hardcoding values.
**How to apply:**
1. Identify rarely-used props (check git history, user feedback)
2. Test visual impact if default changed by ±50%
3. If impact < 5%, mark as hardcodable
4. Hardcode in component
5. Remove from interface
6. Document decision in code

**Why it works:**
- Reduces cognitive load (fewer options = easier to understand)
- No visual impact to users
- Simplifies Triplex editor (fewer confusing props)
- Reduces prop threading (3 fewer scene file changes)

**Example code:**
```typescript
export function Environment(props: EnvironmentProps) {
  return (
    <mesh>
      <meshStandardMaterial
        roughness={1}    // Always matte (hardcoded, was configurable)
        metalness={0}    // Always non-metallic (hardcoded, was configurable)
      />
    </mesh>
  );
}
```

**Metrics:**
- Props: 16 → 14 (12.5% reduction)
- Triplex clarity: Improved (fewer options)
- Visual impact: 0 (imperceptible)
- User complaints: 0

**Related:** Pattern: Hardcoding Values < 5% (patterns.md), Entity: Lighting (similar consideration)
```

---

## Discovery Template

Use this as a starting point for new discoveries:

```markdown
## [Pattern/Solution Title] (Entity: [entity-name], Date: YYYY-MM-DD)

**Context:**
**Pattern/Solution:**
**How to apply:**
**Why it works:**
**Example code:**
```typescript
// Example implementation
```

**Metrics:**
**Related:**
```

---

## Types of Discoveries

**Pattern:** Reusable approach (e.g., enable/disable toggles)
**Solution:** Fix for a problem (e.g., hardcoding <5% impact)
**Optimization:** Performance improvement (e.g., closure pattern in useFrame)
**Best Practice:** Should-always-do (e.g., scene threading)
**Anti-pattern:** Should-never-do (e.g., nested props for Triplex)

---

## Notes

- This file grows as we discover useful patterns
- Check this file when working on new entities
- Apply discovered patterns to prevent duplication
- Share discoveries with other developers
- Use to refactor existing code (apply new patterns to old entities)
