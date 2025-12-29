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

## Key Principle: Flat Props & Tuple Types for Triplex

**Triplex works best with flat props and tuple types:**

```typescript
// ✅ GOOD - Flat props + Tuple Types (Triplex UI)
interface Props {
  position?: [number, number, number];  // Renders as 3 number inputs
  scale?: [number, number, number];     // Renders as 3 number inputs
  color?: string;                       // Color picker
  opacity?: number;                     // Slider
}

// ✅ GOOD - Flat scalar props when more control needed
interface Props {
  positionX?: number;
  positionY?: number;
  positionZ?: number;
  scaleX?: number;
  scaleY?: number;
  scaleZ?: number;
}

// ❌ BAD - Nested objects (Triplex cannot edit)
interface Props {
  position?: { x: number; y: number; z: number };  // Not editable in Triplex
  scale?: { x: number; y: number; z: number };
  color?: { r: number; g: number; b: number };
}
```

**Tuple types for common patterns:**

```typescript
interface Props {
  // Position (3D vector) - renders as 3 inputs
  position?: [x: number, y: number, z: number];

  // Scale - can use same tuple or separate props if fine control needed
  scale?: [x: number, y: number, z: number];

  // Rotation (Euler angles)
  rotation?: [x: number, y: number, z: number];

  // Color - use string, not tuple
  color?: string;
}
```

**Inside the component, use tuple values directly:**

```typescript
function MyComponent(props: Props) {
  const position = props.position ?? [0, 0, 0];
  const scale = props.scale ?? [1, 1, 1];
  const rotation = props.rotation ?? [0, 0, 0];

  return <mesh position={position} scale={scale} rotation={rotation} />;
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

## Standardized JSDoc Template for Triplex

Triplex components require comprehensive JSDoc for optimal editor experience and user guidance.

### Complete Template (7 Sections)

```typescript
/**
 * [One-line technical description of what the prop does]
 *
 * [Optional: 1-2 sentence detailed explanation of behavior, units, or context]
 *
 * **When to adjust:** [Contextual guidance - when should user change this?]
 * **Typical range:** [Visual landmarks with labels, e.g., "Dim (0.2) → Standard (0.4) → Bright (0.6)"]
 * **Interacts with:** [Comma-separated list of related props]
 * **Performance note:** [Optional: only if significant impact]
 *
 * @min [minimum value for numeric props]
 * @max [maximum value for numeric props]
 * @step [increment step for numeric props]
 * @type [color|number|boolean|string]
 * @enum [array of valid values for string union types]
 * @default [default value with optional context]
 */
propertyName?: type;
```

### Section-by-Section Breakdown

#### 1. Technical Description (Required)
- One line, technical but clear
- What the prop controls, not why you'd use it
- Include units if applicable (seconds, pixels, 0-1 range)

**Example:** "Ambient light intensity (non-directional base illumination)."

#### 2. Detailed Explanation (Optional)
- 1-2 sentences max
- Clarify behavior, coordinate systems, or calculations
- Only include if technical description needs more context

**Example:** "Provides uniform lighting across entire scene. Foundation for all lighting. Lower = darker shadows, higher = flatter appearance."

#### 3. "When to adjust" (Highly Recommended)
- Contextual guidance for when user should change this
- Use specific scenarios, not generic advice
- Examples: "Dark backgrounds need X, light backgrounds need Y"

**Example:** "Dark backgrounds (0.4-0.6) for contrast, light backgrounds (0.1-0.3) to avoid washout"

#### 4. "Typical range" (Highly Recommended for Numeric Props)
- Visual landmarks with descriptive labels
- Format: `Label1 (value) → Label2 (value, modifier) → Label3 (value)`
- Use words that describe the visual result: Dim, Bright, Subtle, Dramatic

**Example:** "Dim (0.2) → Standard (0.4, balanced) → Bright (0.6) → Washed (0.8+)"

#### 5. "Interacts with" (Recommended)
- List related props (comma-separated)
- Only include direct relationships
- Helps users discover related settings

**Example:** "backgroundColor, keyIntensity, fillIntensity"

#### 6. "Performance note" (Optional, Only If Significant)
- Include only if prop has noticeable performance impact
- Be specific: "Linear cost", "Quadratic scaling", "No impact"
- Example: "Each level quadruples face count"

**Example:** "Linear cost; 5000→10000 doubles initialization"

#### 7. Triplex Annotations (Required Where Applicable)
- `@min/@max/@step`: Numeric sliders
- `@type color`: Color pickers
- `@enum`: Dropdowns for string unions
- `@default`: Shown in editor, include context if helpful

### Real Examples from Codebase

**Ambient Light (Visual Prop):**
```typescript
/**
 * Ambient light intensity (non-directional base illumination).
 *
 * Provides uniform lighting across entire scene. Foundation for all lighting.
 * Lower = darker shadows, higher = flatter appearance.
 *
 * **When to adjust:** Dark backgrounds (0.4-0.6) for contrast, light backgrounds (0.1-0.3) to avoid washout
 * **Typical range:** Dim (0.2) → Standard (0.4, balanced) → Bright (0.6) → Washed (0.8+)
 * **Interacts with:** backgroundColor, keyIntensity, fillIntensity
 * **Performance note:** No impact; computed per-fragment
 *
 * @min 0
 * @max 1
 * @step 0.05
 * @default 0.4
 */
ambientIntensity?: number;
```

**Stars Count (Performance Prop):**
```typescript
/**
 * Number of stars in starfield.
 *
 * Higher = denser starfield with more depth cues.
 *
 * **When to adjust:** Lower for performance on mobile, higher for immersion on desktop
 * **Typical range:** Sparse (1000) → Balanced (5000, default) → Dense (10000)
 * **Interacts with:** enableStars (only applies if enabled)
 * **Performance note:** Linear cost; 5000→10000 doubles initialization
 *
 * @min 1000
 * @max 10000
 * @step 500
 * @default 5000
 */
starsCount?: number;
```

**Preset (String Union):**
```typescript
/**
 * Lighting mood preset.
 *
 * - **warm**: Golden hour feel, sunrise/sunset mood (amber key, warm fill)
 * - **cool**: Blue-tinted, calm meditation feel (teal key, cool fill)
 * - **neutral**: Balanced studio lighting (white key, neutral ambient)
 * - **dramatic**: High contrast, cinematic (bright key, dark ambient)
 *
 * **When to adjust:** Match emotional tone of scene or time of day
 * **Typical range:** Preset provides 80% of desired look, intensity fine-tunes
 * **Interacts with:** intensity (global multiplier), individual light overrides
 *
 * @enum ["warm", "cool", "neutral", "dramatic"]
 * @default "neutral"
 */
preset?: 'warm' | 'cool' | 'neutral' | 'dramatic';
```

**Tuple Type (Position):**
```typescript
/**
 * Position in 3D space (x, y, z coordinates).
 *
 * Triplex renders as three separate number inputs. Cleaner than positionX/positionY/positionZ props.
 *
 * **When to adjust:** Move entity closer/farther from camera, left/right, up/down
 * **Typical range:** Depends on scene scale (e.g., ±10 for 20-unit scene)
 * **Interacts with:** Camera position, scale (larger objects need more space)
 *
 * @default [0, 0, 0] (center of scene)
 */
position?: [x: number, y: number, z: number];
```

**Mixed Type (Scale - Uniform or Per-Axis):**
```typescript
/**
 * Scale in 3D space (uniform multiplier or per-axis).
 *
 * Triplex renders unified control: switch between single number (uniform) or tuple (per-axis) using "Switch Prop Type" action.
 *
 * **When to adjust:** Make entity larger/smaller uniformly, or stretch along specific axes
 * **Typical range:** 0.1 (tiny) → 1.0 (normal) → 5.0 (huge)
 * **Interacts with:** position (scaled objects may need position adjustment)
 *
 * @default 1 (uniform: no scaling) or [1, 1, 1] (per-axis: no scaling)
 */
scale?: number | [x: number, y: number, z: number];
```

**Mixed Type (Color - Hex, Number, or RGB):**
```typescript
/**
 * Color in multiple formats (hex string, number, or RGB tuple).
 *
 * Triplex renders with unified control: switch between formats using "Switch Prop Type" action.
 * - String: hex format (#RRGGBB)
 * - Number: decimal (0xRRGGBB)
 * - Tuple: RGB as [0-1, 0-1, 0-1]
 *
 * **When to adjust:** Change entity color or tint
 * **Typical formats:** String (intuitive), Number (compact), Tuple (shader-friendly)
 *
 * @default "#ffffff" (white) or 0xffffff or [1, 1, 1]
 */
color?: string | number | [r: number, g: number, b: number];
```

**Tuple Type (Rotation):**
```typescript
/**
 * Rotation in radians (x, y, z Euler angles).
 *
 * Triplex renders as three separate number inputs. Use radians (0 to 2π, or -π to π).
 *
 * **When to adjust:** Rotate entity around axes, tilt, spin
 * **Typical range:** 0 (no rotation) → π/2 (90°) → π (180°)
 * **Interacts with:** position (rotation center is entity's origin)
 *
 * @default [0, 0, 0] (no rotation)
 */
rotation?: [x: number, y: number, z: number];
```

### 171+ Prop Documentation System

The breathe-together-v2 codebase maintains a comprehensive prop inventory:

**Prop Locations:**
- **17 visual props** - `src/entities/breathingSphere/index.tsx:20-181`
  - colorExhale, colorInhale, opacity, scaleRange, coreStiffness, mainResponsiveness, auraElasticity, detail

- **9 lighting props** - `src/entities/lighting/index.tsx:13-152`
  - preset, intensity, ambientIntensity, ambientColor, keyIntensity, keyColor, fillIntensity, fillColor, rimIntensity, rimColor

- **13 environment props** - `src/entities/environment/index.tsx:13-174`
  - enableStars, starsCount, enableFloor, floorColor, floorOpacity, enablePointLight, lightIntensityMin, lightIntensityRange, preset, enableSparkles, sparklesCount

- **7 particle config props** - `src/entities/particle/config.ts`
  - Geometry (detail, segments), Material (metalness, roughness), Size (minScale, maxScale, spread)

**Centralized defaults:** `src/config/sceneDefaults.ts`
- VISUAL_DEFAULTS - backgroundColor, sphere colors, opacity
- LIGHTING_DEFAULTS - preset, intensity, individual light configs
- POST_PROCESSING_DEFAULTS - bloom settings

All props follow the standardized JSDoc template above.

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
