---
name: triplex-component
description: Create or enhance Triplex-editable 3D components with comprehensive JSDoc annotations, performance tuning props, and quality preset integration. Generates flat props interfaces for Triplex compatibility, adds @min/@max/@step/@default directives, creates detailed "when to adjust" and "interacts with" documentation, integrates with adaptive quality system, and follows breathe-together-v2's centralized config patterns. Supports instanced rendering props, shader parameters, particle system configurations, and responsive visual effects. Auto-generates sceneDefaults.ts entries and quality preset mappings.
allowed-tools: [Read, Write, Edit, Glob, Grep, Bash(ls:*)]
---

# Create Triplex-Editable Component

## Overview

Triplex is the visual editor for React Three Fiber components. Components with **flat props** and **JSDoc annotations** become fully interactive in the Triplex UI.

This skill helps you:
- ✅ Generate flat props interfaces (Triplex requirement)
- ✅ Add comprehensive JSDoc annotations (@min, @max, @step, @default)
- ✅ Write "When to adjust", "Typical range", "Interacts with" guidance
- ✅ Integrate with quality preset system (low/medium/high)
- ✅ Sync with `src/config/sceneDefaults.ts`
- ✅ Create performant, Triplex-optimized components

## Key Principle: Flat Props for Triplex

**Triplex works best with flat prop structures:**

```typescript
// ✅ GOOD - Flat props (Triplex UI)
interface Props {
  positionX?: number;
  positionY?: number;
  positionZ?: number;
  scaleX?: number;
  scaleY?: number;
  scaleZ?: number;
  colorR?: number;
  colorG?: number;
  colorB?: number;
}

// ❌ BAD - Nested objects (Triplex struggles)
interface Props {
  position?: { x: number; y: number; z: number };
  scale?: { x: number; y: number; z: number };
  color?: { r: number; g: number; b: number };
}
```

**Inside the component, group them:**

```typescript
function MyComponent(props: Props) {
  // Internal grouping for readability
  const position = [props.positionX ?? 0, props.positionY ?? 0, props.positionZ ?? 0];
  const scale = [props.scaleX ?? 1, props.scaleY ?? 1, props.scaleZ ?? 1];
  const color = `rgb(${(props.colorR ?? 1) * 255},${(props.colorG ?? 1) * 255},${(props.colorB ?? 1) * 255})`;

  return <mesh position={position} scale={scale} />;
}
```

## Guided Interview

To generate comprehensive Triplex props, answer these questions:

### 1. Component Type
- **Particle System** - Multiple instances, optimization critical
- **Mesh/Geometry** - Single 3D object, focus on visual tuning
- **Shader-Based** - Custom GLSL, parameter tweaking
- **Instanced Rendering** - Hundreds of objects, performance props
- **Lighting** - Lights, shadows, atmospheric effects

### 2. Prop Categories

**Visual Properties** (appearance):
- Colors (RGB, hex)
- Opacity/transparency
- Texture/material properties
- Glow/emission intensity

**Geometry** (shape):
- Dimensions (width, height, depth)
- Segments/resolution
- Complexity factors

**Animation** (motion):
- Speed multipliers
- Duration/timing
- Easing/curve type
- Entrance/exit effects

**Physics** (forces):
- Mass, friction, restitution
- Spring constants
- Damping factors

**Performance** (optimization):
- Quality levels
- Instance counts
- Culling distances
- LOD (level of detail)

### 3. Quality Preset Integration

How should quality affect this component?
- **Low**: Fewer particles, lower resolution, reduced effects
- **Medium**: Balanced, default experience
- **High**: Maximum quality, no optimizations

### 4. Triplex Annotation Requirements

For EACH prop you add, provide:

```typescript
/**
 * One-line description of what this prop does
 *
 * **When to adjust**: Context about when/why to change this
 * **Typical range**: Visual landmarks (e.g., "50-200 for background, 500+ for focal")
 * **Interacts with**: Other props that affect/are affected by this one
 * **Performance note**: GPU/CPU cost if significant
 *
 * @type [color|vector3|slider|boolean] (if not obvious from TypeScript)
 * @min [number]
 * @max [number]
 * @step [increment]
 * @default [value]
 */
```

---

## Annotation Reference

See [reference.md](reference.md) for **complete Triplex annotation specification** with 40+ examples.

### Quick Annotation Examples

**Slider Property:**
```typescript
/**
 * Particle emission rate (particles per second)
 *
 * **When to adjust**: Increase for denser clouds, decrease for subtle effects
 * **Typical range**: 50-200 for background, 500+ for focal effects
 * **Interacts with**: particleLifetime (rate * lifetime = total count)
 * **Performance note**: >500/sec impacts mobile
 *
 * @type slider
 * @min 0
 * @max 1000
 * @step 10
 * @default 100
 */
emissionRate?: number;
```

**Color Property:**
```typescript
/**
 * Primary color in hex format
 *
 * @type color
 * @default "#ffffff"
 */
color?: string;
```

**Vector3 (as three floats):**
```typescript
/**
 * Position X coordinate
 * @min -10
 * @max 10
 * @step 0.1
 * @default 0
 */
positionX?: number;
```

**Boolean:**
```typescript
/**
 * Enable breathing synchronization
 * When disabled, component ignores global breath cycle
 *
 * @type boolean
 * @default true
 */
breathSyncEnabled?: boolean;
```

---

## sceneDefaults.ts Integration

Triplex components should sync with centralized config:

**File: `src/config/sceneDefaults.ts`**
```typescript
export const SCENE_DEFAULTS = {
  myComponent: {
    low: { particleCount: 50, segments: 32, detail: 0.5 },
    medium: { particleCount: 200, segments: 64, detail: 1.0 },
    high: { particleCount: 500, segments: 128, detail: 2.0 },
  },
};

export function getDefaultValues(preset: 'low' | 'medium' | 'high') {
  return SCENE_DEFAULTS.myComponent[preset];
}
```

**In your component:**
```typescript
import { SCENE_DEFAULTS, useQuality } from '../config/sceneDefaults';

function MyComponent({ particleCount, ...props }: Props) {
  const quality = useQuality();
  const config = SCENE_DEFAULTS.myComponent[quality];

  // Use prop if provided, fall back to quality preset
  const effectiveCount = particleCount ?? config.particleCount;

  return <mesh />;
}
```

---

## Complete Annotation Example

Real annotation from `src/entities/breathingSphere/index.tsx`:

```typescript
interface BreathingSphereProps {
  /**
   * Sphere opacity (0 = transparent, 1 = opaque)
   *
   * **When to adjust**: Reduce for subtle meditation focus, increase for prominence
   * **Typical range**: 0.3-1.0
   * **Interacts with**: fresnelIntensityMax (higher intensity needs lower opacity)
   * **Performance note**: No GPU impact
   *
   * @type slider
   * @min 0
   * @max 1
   * @step 0.05
   * @default 0.7
   */
  opacity?: number;

  /**
   * Chromatic aberration effect intensity (color edge separation)
   *
   * **When to adjust**: Increase for surreal/dreamy effect, 0 for pure white
   * **Typical range**: 0-0.05
   * **Interacts with**: opacity (effect visible at >0.3 opacity)
   * **Performance note**: ~2-3% GPU cost per 0.01 intensity
   *
   * @type slider
   * @min 0
   * @max 0.1
   * @step 0.005
   * @default 0.02
   */
  chromaticAberration?: number;

  /**
   * Base Fresnel glow intensity (sides of sphere)
   *
   * @type slider
   * @min 0
   * @max 1
   * @step 0.05
   * @default 0.3
   */
  fresnelIntensityBase?: number;

  /**
   * Maximum Fresnel glow during peak breathing
   *
   * @type slider
   * @min 0
   * @max 2
   * @step 0.1
   * @default 1.0
   */
  fresnelIntensityMax?: number;

  /**
   * Sphere geometry segments (quality/smoothness)
   * Higher = smoother but slower
   *
   * **When to adjust**: Increase for close-up, decrease for distant/background
   * **Typical range**: 32-128 (64 is balanced)
   * **Performance note**: O(n²) impact on geometry complexity
   *
   * @type slider
   * @min 16
   * @max 256
   * @step 8
   * @default 64
   */
  segments?: number;

  /**
   * Breath synchronization enabled
   * When true, sphere scale follows global breathing cycle
   *
   * @type boolean
   * @default true
   */
  breathSyncEnabled?: boolean;
}
```

---

## Component Template

See [templates/](templates/) for copy-paste starting points:
- `triplex-props-template.tsx` - Basic flat props interface
- `jsdoc-annotation-template.md` - Annotation format guide
- `quality-preset-template.ts` - Quality integration example

---

## Common Triplex Pitfalls

### ❌ Complex Type Props
```typescript
// Don't do this
interface Props {
  position?: THREE.Vector3;
  config?: { a: number; b: string };
}
```

Triplex can't edit complex types. Use flat scalar props instead.

### ❌ Missing Annotations
```typescript
// Don't do this
interface Props {
  scale: number;  // No @min/@max/@step
}
```

Triplex creates a generic number input. Add annotations for proper UI.

### ❌ Unused Props
```typescript
// Don't do this
interface Props {
  unusedProp?: number;  // Prop never used
}
```

Clean up unused props to keep Triplex UI focused.

### ✅ Good Triplex Props
- Flat, scalar types (number, string, boolean)
- Well-documented with @min/@max/@step
- Used in actual rendering logic
- Synced with sceneDefaults.ts

---

## Testing in Triplex

1. **Run Triplex**: `npm run dev` then open Triplex UI
2. **Open your component** in Triplex
3. **Verify props appear** in sidebar
4. **Check UI controls** match your annotations
5. **Test ranges**: min/max values should be accessible
6. **Test defaults**: @default should appear as initial value

If props don't appear or controls look wrong, check:
- Props are flat (not nested objects)
- No TypeScript errors (`npm run typecheck`)
- Annotations are valid JSDoc format
- Component is in `.triplex/config.json` scan paths

---

## Reference Documentation

For complete specifications and patterns:

- **[reference.md](reference.md)** - Complete Triplex annotation spec with 40+ examples
- **[examples.md](examples.md)** - Real components from breathe-together-v2
- **[templates/](templates/)** - Copy-paste starting points

---

## Workflow

1. **Check existing patterns** in `src/entities/*/index.tsx`
2. **Use the appropriate template** from `templates/`
3. **Add comprehensive JSDoc** for each prop
4. **Map to sceneDefaults.ts** for quality presets
5. **Test in Triplex** (`npm run dev`)
6. **Refine based on Triplex UI** (adjust @min/@max/@step as needed)

---

## Questions?

Ask about:
- Prop value ranges and defaults
- Quality preset thresholds
- How props interact with each other
- Performance implications of props
- Triplex UI customization

Let's make your component Triplex-perfect! 🎨
