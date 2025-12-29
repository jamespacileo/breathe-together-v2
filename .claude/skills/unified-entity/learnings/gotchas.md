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

## Duplicate Defaults Cause Conflicts (Date: 2025-12-29)

**Symptom:** Triplex doesn't sync changes correctly; changing a prop in scene doesn't affect entity rendering

**Root cause:** Default values defined in both scene layer and entity layer create conflicts. When scene passes a default, it shadows the entity's default, breaking Triplex synchronization.

```typescript
// ❌ Bad - Duplicate defaults
// BreathingSphere.tsx
export function BreathingSphere({
  colorExhale = '#4A8A9A',  // Entity default
}: BreathingSphereProps = {}) {}

// breathing.tsx
export function BreathingLevel({
  sphereColorExhale = '#4A8A9A',  // Scene default (conflict!)
}: BreathingLevelProps = {}) {
  return <BreathingSphere colorExhale={sphereColorExhale} />;
}
```

**Solution:** Scene passes `undefined`, letting entity use its own default:

```typescript
// ✅ Good - Transparent Pass-Through
// breathing.tsx
export function BreathingLevel({
  sphereColorExhale,  // No default - lets entity use its own
}: PartialBreathingLevelProps = {}) {
  return <BreathingSphere colorExhale={sphereColorExhale} />;
}
```

**Prevention:**
- Scene owns only props it renders directly (backgroundColor, bloom)
- All entity props pass through undefined
- Verify no default redefinition at scene level
- Use Transparent Pass-Through pattern consistently
- Validate Triplex sync works correctly after changes

**Related:** Transparent Pass-Through Pattern (discoveries.md), sceneDefaults.ts integration, prop flow architecture

---

## Inconsistent JSDoc Makes Props Unclear (Date: 2025-12-29)

**Symptom:** Users don't know when to adjust a prop; Triplex help text is confusing or missing

**Root cause:** JSDoc varies across props/entities. Some props have rich contextual guidance, others only have technical descriptions. Users must infer when/why to use each prop.

```typescript
// ❌ Bad - Minimal JSDoc
/**
 * The intensity.
 * @default 0.4
 */
intensity?: number;

// ❌ Bad - Missing "When to adjust"
/**
 * Ambient light intensity.
 * @min 0 @max 1 @step 0.05
 * @default 0.4
 */
ambientIntensity?: number;

// ✅ Good - Complete standardized template
/**
 * Ambient light intensity (non-directional base illumination).
 *
 * Provides uniform lighting across entire scene. Foundation for all lighting.
 *
 * **When to adjust:** Dark backgrounds (0.4-0.6), light backgrounds (0.1-0.3)
 * **Typical range:** Dim (0.2) → Standard (0.4) → Bright (0.6)
 * **Interacts with:** backgroundColor, keyIntensity, fillIntensity
 * **Performance note:** No impact; computed per-fragment
 *
 * @min 0 @max 1 @step 0.05
 * @default 0.4 (production baseline: balanced visibility)
 */
ambientIntensity?: number;
```

**Solution:** Use standardized 7-section JSDoc template for ALL props:
1. Technical description (required)
2. Detailed explanation (optional)
3. "When to adjust" (recommended)
4. "Typical range" with visual landmarks (recommended)
5. "Interacts with" (recommended)
6. "Performance note" (optional)
7. Triplex annotations (required)

**Prevention:**
- Apply standardized template to all new props
- During entity improvements, update existing JSDoc to template
- Include visual landmarks (Dim/Standard/Bright) for numeric props
- Always document "When to adjust" for context
- Link related props in "Interacts with" section
- Verify consistency across entity before committing

**Related:** Standardized JSDoc Template (discoveries.md), triplex-component skill, visual landmarks guidance

---

## Default Mismatches Between Scene and sceneDefaults.ts (Date: 2025-12-29)

**Symptom:** Changing sceneDefaults.ts doesn't affect rendering; prop behaves differently in debug scene

**Root cause:** Defaults defined in multiple places (entity component, scene component, sceneDefaults.ts) get out of sync. No single source of truth.

**Solution:** Establish single source of truth based on criticality:
- **Critical props** → sceneDefaults.ts (backgroundColor, major visual props)
- **Other props** → Entity component (entity owns and documents its default)
- **Scene-rendered props only** → Scene component (backgroundColor, bloom)

```typescript
// ✅ Good pattern
// sceneDefaults.ts (critical defaults)
export const VISUAL_DEFAULTS = {
  backgroundColor: { value: '#0a0f1a' as const },
};

// BreathingSphere.tsx (entity-owned default)
export function BreathingSphere({
  colorExhale = '#4A8A9A',  // Entity owns this
}: BreathingSphereProps = {}) {}

// breathing.tsx (uses both)
export function BreathingLevel({
  backgroundColor = VISUAL_DEFAULTS.backgroundColor.value,
  sphereColorExhale,  // Passes undefined, entity uses its default
}: BreathingLevelProps = {}) {}
```

**Prevention:**
- Choose single source of truth per prop
- Critical props use sceneDefaults.ts
- Other props use entity defaults
- Never duplicate defaults
- Document which layer owns each prop
- Verify consistency during code review

**Related:** Centralized Defaults System (discoveries.md), Transparent Pass-Through Pattern, sceneDefaults.ts integration

---

## Cluttered Position Props (positionX, positionY, positionZ) (Date: 2025-12-29)

**Symptom:** Component props interface has 3+ position-related props; Triplex editor shows many position inputs; prop intent unclear

**Root cause:** Using flat scalar props (positionX, positionY, positionZ) instead of tuple types. Works but clutters the interface and loses type information about what values belong together.

```typescript
// ❌ Bad - Cluttered
interface Props {
  positionX?: number;
  positionY?: number;
  positionZ?: number;
  scaleX?: number;
  scaleY?: number;
  scaleZ?: number;
}
// Results in 6 separate inputs in Triplex, unclear relationship

// ✅ Good - Clean with tuples
interface Props {
  position?: [x: number, y: number, z: number];
  scale?: [x: number, y: number, z: number];
}
// Results in 2 grouped sets of 3 inputs in Triplex, clear relationships
```

**Solution:** Use tuple types for vector props:
- Position: `position?: [x: number, y: number, z: number]`
- Scale: `scale?: number | [x: number, y: number, z: number]` (flexible: uniform or per-axis)
- Rotation: `rotation?: [x: number, y: number, z: number]`
- Color: `color?: string | number | [r: number, g: number, b: number]` (multiple formats)

**Prevention:**
- Use tuples for any 3D vector (position, scale, rotation)
- Use tuples for color components (RGB)
- Consider flexible types with unions (uniform vs per-axis scale)
- Triplex automatically renders tuples as individual inputs
- User can switch between formats with "Switch Prop Type" action
- Results in cleaner interface with better UX

**Related:** Tuple Types for Vector Props (discoveries.md), Flat Props & Tuple Types (triplex-component skill)

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
