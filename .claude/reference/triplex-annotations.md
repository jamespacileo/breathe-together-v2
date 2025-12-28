# Triplex Visual Editor Annotations Reference

JSDoc annotations that enable Triplex visual editor integration for 3D component parameters.

---

## What is Triplex?

Triplex is a visual 3D component editor integrated into the dev server (`npm run dev`). It allows:
- Dragging components to reposition them
- Editing prop values in a visual inspector
- Hot-reloading changes instantly
- Testing different parameter values in real-time

**To open:** Run `npm run dev` and look for the Triplex panel in the browser.

---

## JSDoc Annotation Specification

Parameters become editable in Triplex through JSDoc annotations on component props:

### @min
**Minimum value for numeric parameters**

```typescript
/**
 * Scale multiplier for particles
 * @min 0
 * @default 1.2
 */
scale: number;
```

- Required for: numeric parameters
- Value: number (integer or float)
- Effect: Triplex input field won't accept values below this

### @max
**Maximum value for numeric parameters**

```typescript
/**
 * Breathing pulse intensity
 * @max 1
 * @default 0.6
 */
breathPulseIntensity: number;
```

- Required for: numeric parameters
- Value: number (integer or float)
- Effect: Triplex input field won't accept values above this

### @step
**Increment/decrement step size**

```typescript
/**
 * Particle rotation speed
 * @step 0.05
 * @default 0.3
 */
rotationSpeed: number;
```

- Recommended for: parameters with fine-tuning (like 0.05 increments)
- Value: number
- Effect: When using up/down arrows in Triplex, changes by this amount
- Tip: Use 0.01 or smaller for fine-tuned parameters (like damping speeds)

### @default
**Default value when component first loads**

```typescript
/**
 * Particle base scale
 * @default 1.0
 */
baseScale: number;
```

- Value: number or string (depending on parameter type)
- Effect: Triplex inspector shows this as starting value
- When to update: Change this if you alter the hardcoded default

---

## Complete Annotation Pattern

**Full example with all annotations:**

```typescript
/**
 * Breathing pulse intensity multiplier
 * Controls how much particles shrink/expand during breathing.
 *
 * @min 0 - No pulse effect
 * @max 1 - Maximum pulse (100% variation)
 * @step 0.05 - Fine-tuned adjustments
 * @default 0.6 - Clearly visible but not exaggerated
 *
 * Interacts with: breathPhase (0-1)
 * Formula: scale = 1.0 + (breathPhase * breathPulseIntensity)
 * At breathPhase=1: scale = 1.0 + 1 * 0.6 = 1.6 (60% larger)
 *
 * Performance: No impact (simple multiplication)
 * Quality levels: Unchanged across quality settings
 */
breathPulseIntensity: number;
```

---

## Common Parameter Patterns

### Visibility Parameters

For parameters that control visual intensity:

```typescript
/**
 * Particle opacity multiplier
 * @min 0 - Completely transparent
 * @max 1 - Fully opaque
 * @step 0.05
 * @default 0.8
 *
 * Visibility threshold: >0.2 for clear perception
 */
opacityMultiplier: number;
```

### Damping/Spring Parameters

For motion smoothness:

```typescript
/**
 * Breathing phase damping speed
 * Controls response time of particle motion
 * @min 0.1 - Very smooth (166ms lag)
 * @max 1 - Instant (no lag)
 * @step 0.05
 * @default 0.3 - Responsive but smooth (55ms lag)
 *
 * Interpretation:
 * - 0.1: Feels disconnected, motion lagging
 * - 0.3: Balanced, recommended
 * - 0.5+: Responsive, may feel twitchy
 */
dampingSpeed: number;
```

### Size/Scale Parameters

For visual dimensions:

```typescript
/**
 * Base particle scale
 * Multiplied by breathPhase for pulse effect
 * @min 0.1 - Very small (0.1-0.16 with pulse)
 * @max 2.0 - Very large (2.0-3.2 with pulse)
 * @step 0.1
 * @default 1.2
 *
 * Combined with breathPulseIntensity=0.6:
 * Min: 1.2 * (1 - 0.6) = 0.48
 * Max: 1.2 * (1 + 0.6) = 1.92
 */
baseScale: number;
```

### Color Parameters

For HSL values:

```typescript
/**
 * Hue rotation for color variation
 * @min 0 - No rotation (red)
 * @max 360 - Full spectrum
 * @step 15 - 24 distinct hues
 * @default 0
 *
 * Color visibility: Minimum 20° hue shift for perception
 */
hueShift: number;
```

---

## Updating Annotations When Parameters Change

When you modify a parameter value, update its JSDoc:

### Before a Fix

```typescript
/**
 * Breathing pulse intensity
 * @min 0
 * @max 1
 * @step 0.05
 * @default 0.2  // ← Too subtle, barely visible
 */
breathPulseIntensity: 0.2;
```

### After a Fix

```typescript
/**
 * Breathing pulse intensity
 * @min 0
 * @max 1
 * @step 0.05
 * @default 0.6  // ← Updated: now clearly visible
 */
breathPulseIntensity: 0.6;
```

**Don't forget:** Update @default to match the new hardcoded value!

---

## Triplex Compatibility Checklist

When modifying parameters, verify:

- [ ] JSDoc annotations exist for all numeric props
- [ ] @min/@max/@step values are reasonable (not too restrictive)
- [ ] @default matches the hardcoded default
- [ ] Comments explain what the parameter does
- [ ] "Interacts with" section documents dependencies
- [ ] Performance notes included (if relevant)
- [ ] Quality level impact documented (if quality-dependent)

### Testing in Triplex

After modifying annotations:

1. Run `npm run dev`
2. Open Triplex visual editor
3. Find the component in the sidebar
4. Verify:
   - [ ] All parameters appear in inspector
   - [ ] Min/max limits work (can't set values outside)
   - [ ] Step increments work (arrow keys increment correctly)
   - [ ] Default value is shown
   - [ ] Hot-reload works (changing value updates preview)

---

## Preservation Rules

**When making fixes, preserve JSDoc annotations:**

```typescript
// ✅ CORRECT: Keep JSDoc, update @default only
/**
 * Breathing pulse intensity
 * @min 0
 * @max 1
 * @step 0.05
 * @default 0.6  // ← Updated only this
 */
breathPulseIntensity: 0.6;

// ❌ WRONG: Lost annotations, Triplex can't edit
breathPulseIntensity: 0.6;
```

---

## Parameter Range Guidelines

### Visibility-Related Parameters

| Parameter Type | Min | Recommended | Max | Unit |
|---|---|---|---|---|
| Scale/size multiplier | 0.1 | 0.3-0.7 | 2.0 | relative |
| Opacity/alpha | 0 | 0.5-0.9 | 1 | 0-1 |
| Color hue | 0 | 20-30 | 360 | degrees |
| Position offset | 0 | 1.0-2.0 | 10 | units |

### Motion-Related Parameters

| Parameter Type | Min | Recommended | Max | Unit |
|---|---|---|---|---|
| Damping speed | 0.05 | 0.2-0.5 | 1.0 | scalar |
| Rotation speed | 0 | 0.1-0.5 | 5.0 | rad/s |
| Acceleration | 0 | 1.0-5.0 | 50 | units/s² |

### Quality/Performance Parameters

| Parameter Type | Min | Recommended | Max | Unit |
|---|---|---|---|---|
| Particle count | 0.1 | 0.5-1.0 | 2.0 | multiplier |
| Update frequency | 0.1 | 1.0 | 2.0 | multiplier |
| LOD distance | 0 | 5-20 | 100 | units |

---

## Integration Points

This reference is used by:
- [triplex-component skill](../skills/triplex-component/SKILL.md) - Creating editable components
- [fix-application skill](../skills/fix-application/SKILL.md) - Preserving annotations during fixes
- [kaizen-improvement workflow](../workflows/kaizen-improvement/WORKFLOW.md) - Fine-tuning parameters
- [ecs-entity skill](../skills/ecs-entity/SKILL.md) - Adding annotations to new traits

---

## Quick Checklist for Every JSDoc

When adding annotations to a parameter, include:

- [ ] Description: What does this parameter control?
- [ ] @min: Lowest sensible value
- [ ] @max: Highest sensible value
- [ ] @step: Fine-tuning increment (optional but recommended)
- [ ] @default: Current hardcoded default
- [ ] Interacts with: Other parameters that depend on this
- [ ] Formula: How is it used in calculations?
- [ ] Performance: Does it impact FPS/memory?
- [ ] Quality: Does quality level affect it?
