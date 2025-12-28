# Gotchas: Common Pitfalls and Edge Cases

Common mistakes and unexpected behaviors discovered while working with entities.

---

## Format

```markdown
## [Issue Title] (Entity: [entity-name], Date: YYYY-MM-DD)

**Symptom:** How you first notice this issue
**Root cause:** Why it happens
**Solution:** How to fix or avoid it
**Prevention:** How to prevent this in future entities
**Related:** Links to similar issues, gotchas, or documentation
```

---

## How to Add

After discovering a gotcha while working with an entity:

1. Describe the symptom (what went wrong?)
2. Explain the root cause (why did it happen?)
3. Provide the solution (how to fix it?)
4. Add prevention steps (how to avoid next time?)
5. Link to related documentation

Example:

```markdown
## HTML Elements Require <Html> Wrapper (Entity: BreathDebugVisuals, Date: 2024-10-28)

**Symptom:** Error: "Div is not part of the THREE namespace!"
**Root cause:** R3F Canvas only understands THREE.js objects, not HTML
**Solution:** Wrap HTML divs with <Html> from @react-three/drei
**Prevention:** Always use Html wrapper when rendering HTML in Canvas
**Related:** R3F namespace documentation, component creation guide
```

---

## Discovery Template

Use this as a starting point for new gotchas:

```markdown
## [Issue Title] (Entity: [entity-name], Date: YYYY-MM-DD)

**Symptom:**
**Root cause:**
**Solution:**
**Prevention:**
**Related:**
```

---

## Notes

- This file grows as we discover gotchas
- Each entry prevents future issues
- Check this file when debugging
- Apply prevention steps to all future entities
