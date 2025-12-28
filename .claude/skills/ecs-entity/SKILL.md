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
  scale?: number;
  color?: string;
}

export function MyEntity({ scale = 1, color = "#fff" }: Props) {
  const world = useWorld();
  const [x, y, z] = position;

  useEffect(() => {
    world.spawn(
      MyTrait,
      Mesh(ref.current),
      Position({ x, y, z }),
      Scale({ value: scale })
    );
  }, [scale, world, x, y, z]);

  return <group ref={ref}>{children}</group>;
}
```

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

## Triplex Annotations (for Tunable Props)

If your component will be edited in Triplex visual editor:

```typescript
interface MyEntityProps {
  /**
   * Component scale multiplier for all dimensions
   *
   * **When to adjust**: Increase to make entity more prominent, decrease for subtle effects
   * **Typical range**: 0.5-3.0 (values < 0.1 may be invisible)
   * **Interacts with**: positionZ (closer camera may need smaller scale)
   * **Performance note**: No performance impact
   *
   * @type slider
   * @min 0.1
   * @max 5
   * @step 0.1
   * @default 1
   */
  scale?: number;

  /**
   * Base color in hex format
   *
   * @type color
   * @default "#ffffff"
   */
  color?: string;
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
