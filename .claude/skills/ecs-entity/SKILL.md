---
name: ecs-entity
description: Create a new ECS entity for the breathe-together-v2 project with complete Koota traits, systems, React component, and Triplex annotations. Scaffolds the full entity pattern including index.tsx (R3F component), traits.tsx (Koota data containers), systems.tsx (update logic), and auto-registers systems in providers.tsx. Handles both visual entities (Three.js meshes) and state-only entities (breath, controller). Supports marker entities, stateful entities with props, and complex trait configurations. Automatically generates JSDoc annotations for Triplex compatibility with proper @min/@max/@step/@default directives.
allowed-tools: [Read, Write, Edit, Glob, Grep, Bash(ls:*)]
---

# Create ECS Entity for breathe-together-v2

## Overview

The breathe-together-v2 project uses a **Koota-based ECS (Entity-Component-System)** architecture where React components spawn themselves as entities with traits (data) and systems (pure functions) handle updates.

This skill scaffolds complete entities with:
- ✅ React component in `src/entities/[name]/index.tsx`
- ✅ Trait definitions in `src/entities/[name]/traits.tsx`
- ✅ System functions in `src/entities/[name]/systems.tsx` (optional)
- ✅ Auto-registration in `src/providers.tsx`
- ✅ Triplex annotations for visual components

## Quick Start: Guided Interview

To create a new entity, I need to understand a few things:

### 1. Entity Name (PascalCase)
Example: `Particle`, `Enemy`, `Portal`, `Controller`

### 2. Entity Type
Choose one:
- **Marker Entity** - Minimal, just existence flag
  - Example: `Land`, `Camera`
  - Features: One trait only, no systems

- **Stateful Entity with Props** - Customizable visual/logical entity
  - Example: `ParticleSystem`, `BreathingSphere`, `Character`
  - Features: Props interface, multiple traits, optional systems

- **State-Only Entity** - Pure logic, no visual rendering (returns null)
  - Example: `Breath`, `GameController`, `TimeManager`
  - Features: Hidden entity, provides global state via traits

### 3. Visual or Non-Visual?
- Visual: Renders Three.js meshes/groups (use `<group ref={meshRef}>`)
- Non-visual: Returns `null`, purely logic

### 4. Which Traits to Include?
Common traits from `src/shared/traits.tsx`:
- **Position** - 3D position (x, y, z)
- **Velocity** - 3D velocity for movement
- **Mesh** - Reference to Three.js object
- **Scale** - Size/scale factor

Custom traits can be defined with:
- Marker traits (just existence)
- Value traits (single number)
- Vector3 traits (x, y, z)
- RGB color traits
- Complex config traits (nested properties)

### 5. Props Interface (if Stateful)
What parameters should the component accept?

Examples:
```typescript
interface Props {
  position?: [x: number, y: number, z: number];
  scale?: number;
  color?: string;
  particleCount?: number;
}
```

### 6. System Functions Needed?
Does this entity need update logic? (Most do!)

Examples:
- **Physics System** - Applies forces, updates velocity/position
- **Animation System** - Updates scale/rotation over time
- **Behavior System** - State machine, decision logic
- **Rendering System** - Syncs ECS state to Three.js

### 7. System Placement (Execution Order)
Where should this system run in the 7-phase pipeline?

See [reference.md](reference.md) for the complete system execution order.

---

## Three Entity Patterns

See [reference.md](reference.md) for complete pattern specifications with full code.

### Pattern A: Simple Marker Entity
```typescript
// traits.tsx
export const MyMarker = trait();

// index.tsx
export function MyEntity() {
  const world = useWorld();
  useEffect(() => {
    world.spawn(MyMarker, Mesh(ref.current));
    // ...
  }, [world]);

  return <group ref={ref}>{children}</group>;
}
```

### Pattern B: Stateful Entity with Props
```typescript
interface Props {
  position?: [x: number, y: number, z: number];  // Tuple type - renders as 3 inputs
  scale?: number | [x: number, y: number, z: number];  // Mixed type - scalar or tuple
  color?: string;  // Color prop
}

export function MyEntity({
  position = [0, 0, 0],
  scale = 1,
  color = "#fff"
}: Props = {}) {
  const world = useWorld();

  useEffect(() => {
    world.spawn(
      MyTrait,
      Mesh(ref.current),
      Position({ x: position[0], y: position[1], z: position[2] }),
      Scale({ value: typeof scale === 'number' ? scale : scale[0] })
    );
  }, [scale, world, position]);

  return <group ref={ref} position={position}>{children}</group>;
}
```

**Tuple Types for Props:**
- Use `[number, number, number]` for position, scale, rotation
- Use `[r: number, g: number, b: number]` for RGB colors
- Use `number | [x: number, y: number, z: number]` for flexible scale (uniform or per-axis)
- Triplex automatically renders tuples as individual inputs

### Pattern C: State-Only Entity
```typescript
export function MyEntity() {
  const world = useWorld();

  useEffect(() => {
    let entity = world.queryFirst(MyTrait);
    if (!entity) {
      entity = world.spawn(MyTrait, MyConfigTrait);
    }
  }, [world]);

  return null; // No visual rendering
}
```

---

## Trait Definition Patterns

See [reference.md](reference.md) for complete trait patterns.

Common patterns:

```typescript
import { trait } from 'koota';

// Marker trait (existence only)
export const MyMarker = trait();

// Simple value
export const Speed = trait({ value: 1 });

// Vector3-like
export const Position = trait({ x: 0, y: 0, z: 0 });

// RGB Color
export const Color = trait({ r: 1, g: 1, b: 1 });

// Complex config
export const Config = trait({
  enabled: true,
  curve: 'linear' as 'linear' | 'ease-in' | 'ease-out',
  duration: 1000,
});
```

---

## System Function Patterns

See [reference.md](reference.md) for complete system patterns.

Basic structure:

```typescript
import type { World } from 'koota';

export function mySystem(world: World, delta: number) {
  // Query entities with these traits
  const entities = world.query([MyTrait, Position]);

  // Update each entity
  entities.forEach((entity) => {
    const myData = entity.get(MyTrait);
    const pos = entity.get(Position);

    if (!myData || !pos) return;

    // Update trait (immutable)
    entity.set(MyTrait, { ...myData, value: newValue });
  });
}
```

Closure pattern (for expensive setup):

```typescript
export function mySystem(world: World) {
  // One-time setup (expensive calculations)
  const noise = createNoise3D();

  // Return per-frame function
  return (delta: number, time: number) => {
    const entities = world.query([MyTrait]);
    // ...
  };
}
```

---

## System Registration in providers.tsx

When you create a system, it must be registered in the 7-phase pipeline.

Import and add to `KootaSystems`:

```typescript
// 1. Import the system
import { mySystem } from "./entities/myEntity/systems";

// 2. Add to component props (optional toggle)
export function KootaSystems({
  mySystemEnabled = true, // <-- Add this
  // ... other props
}) {
  const world = useWorld();

  // 3. Create if closure pattern
  const mySys = useMemo(() => mySystem(world), [world]);

  useFrame((state, delta) => {
    // Add system call at correct position in execution order
    // See providers.tsx lines 49-120 for placement
    if (mySystemEnabled) {
      mySystem(world, delta); // Direct call
      // OR
      mySys(delta, state.clock.elapsedTime); // Closure pattern
    }
  });
}
```

---

## Standardized JSDoc Template

All entity props must follow the comprehensive JSDoc format for Triplex integration and user guidance.

### Complete Template

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

### Real Examples

**Visual Prop (Color):**
```typescript
/**
 * Sphere color at exhale (cool/calming phase).
 *
 * Main and aura layers lerp between exhale→inhale colors during breathing cycle.
 * Controls the cool tone at the end of exhalation.
 *
 * **When to adjust:** Cooler blues/teals for meditation, warmer tones for energy
 * **Typical range:** Cool Teal (#4A8A9A, default) → Neutral → Warm Orange
 * **Interacts with:** colorInhale (defines the breathing color journey)
 * **Performance note:** No impact; computed per-frame
 *
 * @type color
 * @default "#4A8A9A"
 */
colorExhale?: string;
```

**Performance Prop (Count):**
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

**Behavior Prop (Physics):**
```typescript
/**
 * Core layer responsiveness curve (stiffness).
 *
 * Exponent for the core expansion curve: breathPhase^coreStiffness.
 * Higher = stiffer/slower early expansion (cubic-like), lower = elastic/instant expansion.
 *
 * **When to adjust:** Higher (3-5) for stiff/delayed response, lower (0.5-1) for elastic/quick
 * **Typical range:** Elastic (0.5) → Balanced (2.0) → Stiff (3.0, default) → Very Stiff (4.0)
 * **Interacts with:** mainResponsiveness, auraElasticity (layer coordination)
 * **Performance note:** No impact; computed per-frame
 *
 * @min 0
 * @max 5
 * @step 0.1
 * @default 3.0
 */
coreStiffness?: number;
```

### JSDoc Section Guidelines

1. **Technical Description** (Required) - One line, technical but clear
2. **Detailed Explanation** (Optional) - 1-2 sentences for complex behavior
3. **"When to adjust"** (Highly Recommended) - Contextual scenarios
4. **"Typical range"** (Highly Recommended) - Visual landmarks with labels
5. **"Interacts with"** (Recommended) - Related props (discoverability)
6. **"Performance note"** (Optional) - Only if significant impact
7. **Triplex Annotations** (Required) - @min/@max/@step/@type/@enum/@default

---

## Scene Threading Pattern

Entities should be integrated into the 3-level scene hierarchy:

### Scene Structure

```
src/levels/
├── breathing.tsx              # Production scene (minimal props)
├── breathing.scene.tsx        # Experimental scene (preset exploration)
└── breathing.debug.scene.tsx  # Debug scene (all controls, manual phase)
```

### Transparent Pass-Through Pattern

**Key principle:** Scene-level components should NOT redefine entity defaults.

**Good Pattern:**
```typescript
// breathing.tsx (Production Scene)
export function BreathingLevel({
  backgroundColor = '#0a0f1a',  // Scene-owned (rendered by scene)
  bloom = 'subtle',             // Scene-owned (scene-level post-processing)

  // Pass-through (no defaults!) - let entities use their own
  sphereColorExhale,
  lightingPreset,
  environmentPreset,
}: Partial<BreathingLevelProps> = {}) {
  return (
    <>
      <color attach="background" args={[backgroundColor]} />

      {/* Entity components use their own defaults */}
      <BreathingSphere colorExhale={sphereColorExhale} />
      <Lighting preset={lightingPreset} />
      <Environment preset={environmentPreset} />
    </>
  );
}
```

**Why this works:**
- Single source of truth for each entity's defaults
- No conflicts between scene and entity layers
- Triplex changes flow correctly
- Easy to reason about ownership

### Prop Flow

**Entity (BreathingSphere):**
```typescript
export function BreathingSphere({
  colorExhale = '#4A8A9A',  // Entity owns its default
  colorInhale = '#D4A574',
  // ...
}: BreathingSphereProps = {}) {
  // Implementation
}
```

**Scene (BreathingLevel):**
```typescript
export function BreathingLevel({
  sphereColorExhale,  // undefined, passes through to entity
  // ...
}) {
  return <BreathingSphere colorExhale={sphereColorExhale} />;
}
```

**Result:** Entity default is used unless explicitly overridden at scene level.

---

## Centralized Defaults System

Entity defaults should reference centralized configuration for consistency.

### sceneDefaults.ts Structure

**Location:** `src/config/sceneDefaults.ts`

```typescript
export const VISUAL_DEFAULTS = {
  backgroundColor: {
    value: '#0a0f1a' as const,
    when: 'Base scene background color. Deep space aesthetic for meditation.',
    typical: 'Deep Space (#0a0f1a) → Medium (#1a2030) → Light (#2a3040)',
    interacts: ['ambientIntensity', 'keyIntensity', 'fillIntensity'],
    performance: 'No impact; static color',
  },
  sphereColorExhale: {
    value: '#4A8A9A' as const,
    when: 'Cooler blues/teals for meditation, warmer tones for energy',
    typical: 'Cool Teal (#4A8A9A, default) → Neutral → Warm Orange',
    interacts: ['sphereColorInhale'],
    performance: 'No impact; computed per-frame',
  },
  // ...
};

export const getDefaultValues = () => ({
  backgroundColor: VISUAL_DEFAULTS.backgroundColor.value,
  sphereColorExhale: VISUAL_DEFAULTS.sphereColorExhale.value,
  // ...
});
```

### Usage in Entity Components

**Import defaults:**
```typescript
import { VISUAL_DEFAULTS } from '../../config/sceneDefaults';

export function BreathingSphere({
  colorExhale = VISUAL_DEFAULTS.sphereColorExhale.value,
  colorInhale = VISUAL_DEFAULTS.sphereColorInhale.value,
  // ...
}: BreathingSphereProps = {}) {
  // Implementation
}
```

**Benefits:**
- Single source of truth for defaults
- Metadata enables AI suggestions
- Centralized validation
- Easy to maintain consistency

### Prop Documentation Inventory

The codebase maintains **171+ documented props** across entities:

- **17 visual props** - `src/entities/breathingSphere/index.tsx` (colorExhale, opacity, scaleRange, etc.)
- **9 lighting props** - `src/entities/lighting/index.tsx` (ambientIntensity, keyIntensity, etc.)
- **13 environment props** - `src/entities/environment/index.tsx` (enableStars, starsCount, preset, etc.)
- **7 particle config props** - `src/entities/particle/config.ts` (geometry, material, size categories)

All props follow the standardized JSDoc template with complete contextual guidance.

---

## Triplex Annotations (for Tunable Props)

If your component will be edited in Triplex visual editor:

```typescript
interface MyEntityProps {
  /**
   * Position in 3D space (x, y, z coordinates).
   *
   * Triplex renders as three separate number inputs.
   *
   * **When to adjust**: Move entity around the scene
   * **Typical range**: Depends on scene scale (e.g., ±10 for 20-unit scene)
   * **Interacts with**: Camera position, scale
   *
   * @default [0, 0, 0]
   */
  position?: [x: number, y: number, z: number];

  /**
   * Component scale (uniform or per-axis).
   *
   * Use single number for uniform scaling, or tuple for per-axis control.
   * Triplex lets you switch between formats with "Switch Prop Type" action.
   *
   * **When to adjust**: Increase to make entity larger, decrease for smaller
   * **Typical range**: 0.1 (tiny) → 1.0 (normal) → 5.0 (huge)
   * **Interacts with**: position (scaled objects may need position adjustment)
   *
   * @default 1 (uniform) or [1, 1, 1] (per-axis)
   */
  scale?: number | [x: number, y: number, z: number];

  /**
   * Base color in multiple formats (hex, number, or RGB tuple).
   *
   * Triplex lets you switch between formats with "Switch Prop Type" action.
   *
   * @default "#ffffff"
   */
  color?: string | number | [r: number, g: number, b: number];
}
```

---

## File Structure After Creation

```
src/entities/[MyEntity]/
├── index.tsx           # React component + entity spawning
├── traits.tsx          # Koota trait definitions
└── systems.tsx         # Update logic (optional)
```

Each entity is self-contained and follows the same pattern.

---

## Complete Reference

For detailed specifications, patterns, and real-world examples, see:

- **[reference.md](reference.md)** - Complete ECS patterns from codebase exploration
  - All three entity types with full code
  - Trait definition patterns (20+ examples)
  - System query patterns (common combinations)
  - System execution order explanation

- **[examples.md](examples.md)** - Real examples from breathe-together-v2
  - `src/entities/breath/` - State-only entity
  - `src/entities/particle/` - Complex stateful entity
  - `src/entities/breathingSphere/` - Triplex-tunable entity
  - Side-by-side before/after code

---

## Next Steps

After I generate your entity files, you'll need to:

1. **Add entity to your scene** in `src/levels/breathing.tsx` or debug scene
2. **Test in Triplex** by running `npm run dev`
3. **Add to README** if it's a major system component

---

## Questions?

If anything is unclear, ask for details about:
- Specific trait patterns you need
- System execution order placement
- Triplex annotation requirements
- How to integrate with existing systems

Let's build your entity! 🚀
