# Learning System: Prompt-to-Update

This directory captures knowledge discovered while working with entities.

## How It Works

After completing any entity operation (create, improve, debug), I'll identify patterns and ask:

```
Operation complete! I discovered these patterns:

1. [Pattern description] (Entity: [name])
2. [Pattern description] (Entity: [name])
3. [Pattern description] (Entity: [name])

Add these to skill knowledge base?
- [ ] Yes, add all
- [ ] Let me choose which ones
- [ ] No, skip for now
```

When you approve, the discovery is added to this directory and becomes part of the skill's knowledge base for future entity work.

---

## Three Learning Categories

### gotchas.md
**Common pitfalls, edge cases, and mistakes**

**When to add:** After discovering something unexpected
- "Hardcoding floor material had no visual impact"
- "Enabling manual control requires stopPropagation on event"
- "Context override must use nullish coalescing (??), not ||"

**Format:**
```markdown
## [Title] (Entity: [name], Date: YYYY-MM-DD)

**Symptom:** How you first notice this issue
**Root cause:** Why it happens
**Solution:** How to fix or avoid it
**Related:** Links to similar gotchas or patterns
```

### decisions.md
**Design decisions and trade-offs**

**When to add:** After making an architectural choice
- "Why we use toggle props instead of intensity=0"
- "Why props-to-config conversion exists"
- "Why sceneDefaults.ts is centralized"

**Format:**
```markdown
## [Title] (Entity: [name], Date: YYYY-MM-DD)

**Question:** What design choice did we face?
**Options considered:** Alternative approaches
**Decision:** What we chose and why
**Trade-offs:** What we gave up
**Related:** Links to similar decisions
```

### discoveries.md
**New patterns, reusable solutions, better approaches**

**When to add:** After finding something useful for other entities
- "Enable/disable toggle pattern works great for multi-light entities"
- "Hardcoding < 5% visual impact reduces clutter"
- "Props-to-config conversion solves flat prop vs code clarity"

**Format:**
```markdown
## [Title] (Entity: [name], Date: YYYY-MM-DD)

**Context:** What situation led to this discovery?
**Pattern:** The pattern or solution
**How to apply:** Steps for using this on other entities
**Why it works:** Why this is better than alternatives
**Related:** Links to pattern documentation, other discoveries
```

---

## Examples

### Gotcha Example

```markdown
## HTML Elements Need <Html> Wrapper (Entity: BreathDebugVisuals, Date: 2024-10-28)

**Symptom:** Error: "Div is not part of the THREE namespace!"
**Root cause:** React Three Fiber Canvas only understands THREE.js objects. HTML needs wrapper.
**Solution:** Import Html from @react-three/drei, wrap HTML divs
**Code example:**
import { Html } from '@react-three/drei'

// ❌ WRONG
<div style={{ color: 'white' }}>Debug Info</div>

// ✅ CORRECT
<Html position={[0, 0, 0]} style={{ pointerEvents: 'none' }}>
  <div style={{ color: 'white' }}>Debug Info</div>
</Html>

**Related:** Entity: BreathDebugVisuals, Entity: ParticleDebugVisuals
```

### Decision Example

```markdown
## Why Enable/Disable Toggles Instead of Intensity=0 (Entity: Lighting, Date: 2024-10-20)

**Question:** How should users control whether a light is on or off?
**Options considered:**
1. Set intensity=0 (light still exists, just not visible)
2. Add enable/disable boolean toggle

**Decision:** Boolean toggles (option 2)
**Trade-offs:**
- PRO: Clear semantic intent (enabled vs disabled vs intensity level)
- PRO: Works for non-intensity features (position, color)
- PRO: Better Triplex UX (checkbox vs guessing intensity value)
- CON: One more prop per light (4 lights = 4 more props)

**Why:** Semantic clarity > prop reduction. Users understand intention better.

**Related:** Pattern: Enable/Disable Toggles (patterns.md)
**Metrics:** Lighting accessibility improved 100% → 100%, but clarity improved significantly
```

### Discovery Example

```markdown
## Hardcoding Props with <5% Visual Impact (Entity: Environment, Date: 2024-10-15)

**Context:** Environment had floorRoughness (always 1.0) and floorMetalness (always 0.0) props that nobody ever adjusted.
**Pattern:** Remove props with imperceptible visual impact by hardcoding values.
**How to apply:**
1. Check if prop is ever adjusted (survey users / git history)
2. Check visual impact of default vs alternative
3. If impact < 5%, hardcode the value
4. Remove prop from interface
5. Document hardcoded value in code comment

**Example from Environment:**
```typescript
// Before: 2 unnecessary props (floorRoughness, floorMetalness)
// After: Props hardcoded as roughness={1.0}, metalness={0.0}
// Result: 2 fewer props, zero visual impact
```

**Why it works:** Reduces cognitive load (fewer props = easier to understand). Users only see options that matter.

**Related:** Pattern: Hardcoding Values < 5% (patterns.md)
**Metrics:** Props 16 → 14 (12.5% reduction), zero visual difference
```

---

## How Learnings Inform Future Work

### When Creating New Entity
- Check **gotchas.md** for common mistakes
- Check **decisions.md** for design rationale (why did we choose toggles?)
- Check **discoveries.md** for reusable patterns

### When Improving Existing Entity
- Check **gotchas.md** to avoid known issues
- Check **decisions.md** to understand existing choices
- Check **discoveries.md** for patterns to apply

### When Debugging Issues
- Check **gotchas.md** first (issue might be known)
- Check **decisions.md** to understand constraints
- Check **discoveries.md** for workarounds

### When Capturing New Knowledge
1. **Gotcha?** → Add to gotchas.md
2. **Design choice?** → Add to decisions.md
3. **Reusable pattern?** → Add to discoveries.md

---

## Evolution Over Time

This learning system ensures the skill improves with use:

**Week 1 (Lighting improvements):**
- Discover: Toggle pattern works well
- Add to discoveries.md

**Week 2 (Environment improvements):**
- Find: Hardcoding < 5% impact reduces props
- Add to discoveries.md
- Apply learned toggle pattern to Environment

**Week 3 (BreathingSphere improvements):**
- Encounter: Koota reactivity issue with in-place mutations
- Add to gotchas.md
- Apply learned toggle pattern
- Apply learned hardcoding technique

**Future (Any new entity):**
- Check learnings first (what have we discovered?)
- Apply proven patterns (toggles, hardcoding, props-to-config)
- Avoid known gotchas (R3F HTML wrapper, Koota mutations, etc.)
- Discover new patterns and add to learnings

---

## Guidelines for Adding Learnings

✅ **DO:**
- Add unexpected discoveries
- Document "why" not just "what"
- Include code examples
- Link to related patterns/entities
- Include date and entity context

❌ **DON'T:**
- Add obvious knowledge (if it's in patterns.md or reference.md already, skip)
- Write vague descriptions
- Forget code examples
- Forget to link related content
- Lose the original entity context

---

## Current Knowledge Base

- **gotchas.md** - Empty (ready for discoveries)
- **decisions.md** - Empty (ready for design captures)
- **discoveries.md** - Empty (ready for patterns)

Each file will grow as we work with entities and capture learnings.
