---
name: ecs-entity
description: Create ECS entities for breathe-together-v2 with complete Koota traits, systems, React components, and Triplex annotations. Scaffolds index.tsx, traits.tsx, systems.tsx, and registers in providers.tsx. Handles visual entities (Three.js meshes) and state-only entities (breath, controller). Supports marker, stateful, and complex trait configurations. Generates JSDoc annotations with @min/@max/@step/@default directives for Triplex compatibility.
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

### Pattern A: Marker Entity (Minimal)
Simple entity with just existence flag. Example: `Land`, `Camera`

See: `templates/marker-entity-template.tsx`

### Pattern B: Stateful Entity with Props
Visual or logical entity with configuration. Example: `BreathingSphere`, `ParticleSystem`

See: `templates/stateful-entity-template.tsx`

### Pattern C: State-Only Entity
Pure logic, no 3D rendering. Example: `Breath`, `GameController`

See: `templates/state-only-entity-template.tsx`

---

## Trait Definitions

See: `templates/traits-template.tsx`

Common patterns: marker traits, value traits, Vector3 traits, RGB colors, complex configs

---

## System Functions

See: `templates/system-template.tsx`

Two patterns:
- **Direct:** `export function mySystem(world: World, delta: number)`
- **Closure:** `export function mySystem(world: World) { return (delta, time) => { ... } }`

### System Registration in providers.tsx

Import and add to `KootaSystems`:

```typescript
import { mySystem } from "./entities/myEntity/systems";

export function KootaSystems({ mySystemEnabled = true }) {
  const world = useWorld();
  const mySys = useMemo(() => mySystem(world), [world]);

  useFrame((state, delta) => {
    if (mySystemEnabled) {
      mySystem(world, delta); // or mySys(delta, state.clock.elapsedTime);
    }
  });
}
```

---

## JSDoc Template for Props

All entity props follow this format for Triplex integration:

See: `templates/jsdoc-template.md` for comprehensive guidelines with real examples

**Quick template:**
```typescript
/**
 * [One-line technical description]
 *
 * **When to adjust:** [Contextual scenarios]
 * **Typical range:** [Visual landmarks, e.g., "Dim (0.2) → Standard (0.4) → Bright (0.6)"]
 * **Interacts with:** [Related props]
 *
 * @min X @max Y @step Z @default value
 */
propertyName?: type;
```

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
