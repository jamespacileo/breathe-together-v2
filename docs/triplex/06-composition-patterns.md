# Triplex Entity Composition Patterns

## Overview

This guide establishes recommended patterns for composing Triplex-integrated entities while maintaining Triplex's static analysis compatibility and minimizing redundant default declarations.

**Core Principle:** Entity components own canonical defaults. Scenes re-declare defaults only when:
1. Triplex static analysis visibility is needed (scene is primary edit target), OR
2. Intentionally overriding for scene-specific use cases (with documented reason)

---

## Why We Have Redundant Defaults

### Triplex's Static Analysis Constraint

Triplex requires literal default values directly in function parameter signatures to perform static analysis. This means:

```typescript
// ✅ WORKS: Triplex can analyze this
export function Lighting({ ambientIntensity = 0.15 }: LightingProps) { }

// ❌ BREAKS: Triplex static analysis fails
const DEFAULT_AMBIENT = 0.15;
export function Lighting({ ambientIntensity = DEFAULT_AMBIENT }: LightingProps) { }
```

Result: **Intentional redundancy** - Entity components declare defaults, and scenes re-declare the same defaults for Triplex visibility.

### Why This Is Acceptable

- **Documented:** This guide explains the pattern
- **Maintainable:** Comments require justification for any deviations
- **Validated:** Inline comments ensure scene defaults match entity defaults
- **Triplex UX:** Default visibility in scene files makes editing intuitive

---

## Pattern 1: Entity Owns Defaults (Production Baseline)

### When to Use
- Primary Triplex-edited scenes (breathing.tsx, breathing.scene.tsx)
- Default is "production baseline" - apply to all scenes unless overriding
- Triplex sidebar should show all available controls

### Option 1A: Entity Owns Defaults (No Scene Re-Declaration)

**Use for:** Internal compositions, non-Triplex scenes, helper components

```typescript
// Entity: src/entities/lighting/index.tsx
export function Lighting({
  ambientIntensity = 0.15, // Canonical default
  ambientColor = '#a8b8d0',
  // ... full JSDoc
}: LightingProps = {}) {
  // Uses ambientIntensity directly
}

// Scene: src/levels/breathing.tsx
export function BreathingLevel(props: Partial<BreathingLevelProps> = {}) {
  const {
    backgroundColor = '#0a0f1a',
    ...lightingProps  // No defaults re-declared here
  } = props;

  return (
    <>
      <Lighting {...lightingProps} />  // Entities handle their own defaults
    </>
  );
}
```

**Pros:**
- Cleanest code (DRY principle)
- Single source of truth
- No redundancy

**Cons:**
- Entity defaults less visible in scene file
- Triplex requires exploring entity to see defaults
- May confuse developers about defaults

### Option 1B: Re-Declare for Triplex Visibility (**RECOMMENDED FOR PRIMARY SCENES**)

**Use for:** Triplex-edited scenes that need explicit default visibility

```typescript
// Entity: src/entities/lighting/index.tsx
export function Lighting({
  ambientIntensity = 0.15, // Canonical default
  ambientColor = '#a8b8d0',
  // ... full JSDoc
}: LightingProps = {}) {
  // Implementation
}

// Scene: src/levels/breathing.tsx
/**
 * BreathingLevel - Main breathing meditation scene
 *
 * TRIPLEX COMPOSITION PATTERN:
 * This scene re-declares entity defaults for Triplex static analysis visibility.
 * These defaults MUST match the canonical defaults in entity components (see links below).
 *
 * Only override defaults here when this scene specifically needs different values.
 * See docs/triplex/06-composition-patterns.md for full guidelines.
 */
export function BreathingLevel({
  // Scene-specific defaults
  backgroundColor = '#0a0f1a',

  // Lighting defaults (MUST match src/entities/lighting/index.tsx:143-150)
  ambientIntensity = 0.15,
  ambientColor = '#a8b8d0',
  keyIntensity = 0.2,
  keyColor = '#e89c5c',
  fillIntensity = 0.12,
  fillColor = '#4A7B8A',
  rimIntensity = 0.08,
  rimColor = '#6BA8B5',

  // Sphere defaults (MUST match src/entities/breathingSphere/index.tsx:180-188)
  sphereColorExhale = '#4A8A9A',
  sphereColorInhale = '#D4A574',
  sphereScaleMin = 0.3,
  sphereScaleMax = 0.7,
  sphereCoreStiffness = 3.0,
  sphereMainResponsiveness = 1.0,
  sphereAuraElasticity = 0.5,
  sphereOpacity = 0.12,
  sphereDetail = 3,

  // ... other props
}: Partial<BreathingLevelProps> = {}) {
  return (
    <>
      <Lighting
        ambientIntensity={ambientIntensity}
        ambientColor={ambientColor}
        keyIntensity={keyIntensity}
        keyColor={keyColor}
        fillIntensity={fillIntensity}
        fillColor={fillColor}
        rimIntensity={rimIntensity}
        rimColor={rimColor}
      />
      <BreathingSphere
        sphereColorExhale={sphereColorExhale}
        sphereColorInhale={sphereColorInhale}
        sphereScaleMin={sphereScaleMin}
        sphereScaleMax={sphereScaleMax}
        sphereCoreStiffness={sphereCoreStiffness}
        sphereMainResponsiveness={sphereMainResponsiveness}
        sphereAuraElasticity={sphereAuraElasticity}
        sphereOpacity={sphereOpacity}
        sphereDetail={sphereDetail}
      />
    </>
  );
}
```

**Pros:**
- Triplex defaults visible in scene file
- Easy to discover what's configurable
- Explicit "this is the production baseline"
- Scene file is self-documenting

**Cons:**
- Redundant with entity defaults
- Risk of drift if defaults diverge

**Mitigation:** Comments clearly state "MUST match" and link to entity file. Linting can catch mismatches.

---

## Pattern 2: Scene Overrides for Specific Use Case

### When to Use
- Creating a variant scene (debug, preset, theme)
- Scene intentionally uses different defaults than production
- Override must be documented with reason

### Implementation

```typescript
// src/levels/breathing.debug.scene.tsx
/**
 * BreathingDebugScene - Debug variant with enhanced visibility
 *
 * COMPOSITION PATTERN: Scene Overrides
 * This scene only declares properties that differ from the production baseline.
 * All other props use entity defaults (see BreathingLevel for baseline).
 */
export function BreathingDebugScene({
  // Override for debug: higher opacity for better visibility during development
  // Entity default: 0.12 | Debug value: 0.25
  sphereOpacity = 0.25,

  // Override for debug: disable bloom threshold to see all emissions
  // Entity default: 1.0 | Debug value: 0.1
  bloomThreshold = 0.1,

  // All other props use entity defaults (no declaration needed)
  // Example: sphereColorExhale, sphereColorInhale, ambientIntensity, etc.
  ...restProps
}: Partial<BreathingDebugSceneProps> = {}) {
  return (
    <>
      <BreathingLevel
        sphereOpacity={sphereOpacity}
        bloomThreshold={bloomThreshold}
        {...restProps}
      />
      <BreathDebugPanel />
    </>
  );
}
```

### Key Guidelines

1. **Comment each override with reason:**
   ```typescript
   // OVERRIDE: Higher opacity helps debug sphere behavior (entity default: 0.12)
   sphereOpacity = 0.25,
   ```

2. **Include entity default for reference:**
   ```typescript
   // OVERRIDE: Stricter threshold for debug (entity default: 1.0)
   bloomThreshold = 0.1,
   ```

3. **Only declare what differs:**
   - Don't re-declare all 30+ props if only changing 2
   - Let entity defaults apply to everything else
   - Use prop spreading for the rest

---

## Pattern 3: Prop Spreading with Filtering (Advanced)

### When to Use
- Composing 3+ entities with many props each
- Need fine-grained control over which props go to which entity
- Entity prop groups have distinct namespaces (e.g., `sphere*`, `lighting*`)

### Implementation

```typescript
// src/levels/breathing.tsx
export function BreathingLevel(props: Partial<BreathingLevelProps> = {}) {
  const {
    // Scene-specific props (kept at scene level)
    backgroundColor = '#0a0f1a',

    // Extract entity-specific prop groups for spreading
    // Lighting props (all starting with no prefix, handled separately)
    ambientIntensity = 0.15,
    ambientColor = '#a8b8d0',
    keyIntensity = 0.2,
    keyColor = '#e89c5c',

    // Sphere props (all prefixed with sphere*)
    sphereColorExhale = '#4A8A9A',
    sphereColorInhale = '#D4A574',
    sphereOpacity = 0.12,

    // Environment props (environment-related)
    preset = 'studio',
    enableStars = true,

    // Particle props
    particleCount = 300,

    ...otherProps
  } = props;

  return (
    <>
      <color attach="background" args={[backgroundColor]} />

      <Lighting
        ambientIntensity={ambientIntensity}
        ambientColor={ambientColor}
        keyIntensity={keyIntensity}
        keyColor={keyColor}
      />

      <BreathingSphere
        sphereColorExhale={sphereColorExhale}
        sphereColorInhale={sphereColorInhale}
        sphereOpacity={sphereOpacity}
      />

      <Environment preset={preset} enableStars={enableStars} />

      <group>
        <ParticleSpawner totalCount={particleCount} />
        <ParticleRenderer totalCount={particleCount} />
      </group>
    </>
  );
}
```

**When to use pattern 3:** Only if prop count is excessive (30+) and you need clear organization. Current codebase uses explicit prop passing (better readability).

---

## Anti-Patterns: What NOT to Do

### ❌ Anti-Pattern 1: Undocumented Default Divergence

```typescript
// BAD: Different default with no explanation
export function BreathingLevel({
  sphereOpacity = 0.18, // Entity default: 0.12 - WHY IS THIS DIFFERENT?
}: Partial<BreathingLevelProps> = {}) {
```

**Fix:** Always document overrides with reason:
```typescript
// OVERRIDE: Slightly higher opacity for production (entity default: 0.12)
sphereOpacity = 0.18,
```

### ❌ Anti-Pattern 2: Importing Constants for Defaults

```typescript
// BAD: Breaks Triplex static analysis
import { LIGHTING_DEFAULTS } from '../config';

export function BreathingLevel({
  ambientIntensity = LIGHTING_DEFAULTS.ambientIntensity, // ❌ FAILS TRIPLEX
}: Partial<BreathingLevelProps> = {}) {
```

**Fix:** Use literal values only:
```typescript
// GOOD: Triplex can analyze this
export function BreathingLevel({
  ambientIntensity = 0.15, // ✅ WORKS
}: Partial<BreathingLevelProps> = {}) {
```

### ❌ Anti-Pattern 3: Declaring ALL Props When Only Overriding One

```typescript
// BAD: Redundant declaration for props not being overridden
export function DebugScene({
  sphereOpacity = 0.25,        // Override - good
  sphereColorExhale = '#4A8A9A',  // Not overriding - REMOVE THIS
  sphereColorInhale = '#D4A574',  // Not overriding - REMOVE THIS
  sphereScaleMin = 0.3,        // Not overriding - REMOVE THIS
  // ... 20 more props not being changed
}: Partial<BreathingDebugSceneProps> = {}) {
```

**Fix:** Only declare properties you're actually changing:
```typescript
// GOOD: Only override what differs
export function DebugScene({
  sphereOpacity = 0.25, // Override
  // Everything else uses entity defaults
  ...restProps
}: Partial<BreathingDebugSceneProps> = {}) {
  return <BreathingLevel sphereOpacity={sphereOpacity} {...restProps} />;
}
```

---

## Decision Tree for Developers

Use this flowchart when creating or modifying a scene:

```
Am I creating a new scene?
├─ YES
│  ├─ Will this be the primary scene edited in Triplex?
│  │  ├─ YES → Use Pattern 1B (re-declare entity defaults for Triplex visibility)
│  │  └─ NO → Use Pattern 1A (entity owns defaults, no re-declaration)
│  └─ Does this scene need different defaults than production?
│     ├─ YES → Use Pattern 2 (override with comments)
│     └─ NO → Use Pattern 1A or 1B depending on Triplex visibility needs
│
└─ NO (Modifying existing scene)
   ├─ Do I need to change a default?
   │  ├─ For this scene only → Add override with comment (Pattern 2)
   │  └─ For all scenes → Change entity default, then update scene if Pattern 1B
   │
   └─ Just adding a new entity prop?
      └─ Follow existing pattern in that scene file
         (breathing.tsx uses Pattern 1B → add to function signature + pass to component)
```

---

## Validating Your Implementation

### Checklist for New Scene

Before marking a scene as complete, verify:

- [ ] **Default Declarations Documented**
  - Scene defaults have comments showing entity source
  - Example: `// Matches Lighting default (src/entities/lighting/index.tsx:143)`

- [ ] **Overrides Are Justified**
  - Every default different from entity has a comment explaining why
  - Example: `// DEBUG OVERRIDE: Higher opacity for visibility (entity: 0.12)`

- [ ] **No Broken Triplex Analysis**
  - All defaults are literal values (numbers, strings, booleans)
  - No `import` statements in default values
  - All JSDoc annotations still present

- [ ] **Props Match Between Scene and Entity**
  - No prop name mismatches (e.g., `sphereColor` → `color`)
  - Types match (optional in scene, optional in entity)

- [ ] **Related Overrides Are Grouped**
  - If overriding sphere opacity, consider if sphere colors should also change
  - Scene variants should be cohesive (not random property mutations)

---

## Examples from breathe-together-v2

### ✅ Good Example: breathing.tsx (Pattern 1B)

```typescript
/**
 * BreathingLevel - Main breathing meditation scene
 *
 * TRIPLEX COMPOSITION PATTERN:
 * This scene re-declares entity defaults for Triplex static analysis visibility.
 * These defaults MUST match the canonical defaults in entity components.
 */
export function BreathingLevel({
  // Visual defaults
  backgroundColor = '#0a0f1a',
  sphereColorExhale = '#4A8A9A', // Matches BreathingSphere (line 180)
  sphereColorInhale = '#D4A574', // Matches BreathingSphere (line 181)
  // ...
}: Partial<BreathingLevelProps> = {}) {
```

✅ Documented as Triplex visibility layer
✅ Comments reference entity file
✅ All defaults match entities

### ✅ Good Example: breathing.debug.scene.tsx (Pattern 2)

```typescript
export function BreathingDebugScene({
  // DEBUG OVERRIDE: Higher opacity for visibility
  sphereOpacity = 0.25, // Entity default: 0.12

  // Other props use entity defaults (no declaration)
  ...restProps
}: Partial<BreathingDebugSceneProps> = {}) {
  return (
    <>
      <BreathingLevel sphereOpacity={sphereOpacity} {...restProps} />
      <BreathDebugPanel />
    </>
  );
}
```

✅ Override documented with reason
✅ Entity default referenced
✅ No unnecessary re-declarations

---

## FAQ

**Q: Why not just use Pattern 1A everywhere?**
A: Triplex editing is easier when defaults are visible in the scene file. Pattern 1A requires exploring entity files to see available props.

**Q: What if entity defaults change?**
A: Pattern 1B requires updating scene defaults too. Document why they should match in comments. Consider linting to catch divergence.

**Q: Can I use Pattern 3 (prop spreading) instead?**
A: Yes, if you have 30+ props and need organization. Current codebase uses explicit prop passing for clarity. Choose based on your file size.

**Q: What if I need different defaults for different Triplex edit targets?**
A: Create separate scene files (e.g., `breathing.tsx` for production, `breathing.debug.scene.tsx` for debug). Each file applies its own pattern.

**Q: How do I know which entity defaults to use?**
A: Read the entity component's JSDoc and function signature. Example: `src/entities/lighting/index.tsx:143-150` shows all lighting defaults.

---

## Summary

| Pattern | When to Use | Default Source | Redundancy |
|---------|-----------|---------------|-|
| 1A | Internal compositions, non-Triplex | Entity only | None (DRY) |
| 1B | Primary Triplex scenes | Scene re-declares | Intentional (documented) |
| 2 | Variants/debug scenes | Override specific props | Only what differs |
| 3 | Many props, need organization | Explicit groups | Same as 1B/2 |

**Rule of Thumb:** Start with Pattern 1B for Triplex-edited scenes. If you find yourself declaring 30+ props, consider Pattern 1A or 3.
