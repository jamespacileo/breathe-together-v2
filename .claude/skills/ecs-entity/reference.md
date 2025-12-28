# ECS Entity Patterns Reference

Complete specifications and patterns from codebase exploration for breathe-together-v2's Koota-based ECS architecture.

---

## System Execution Order (Critical!)

The 7-phase pipeline in `src/providers.tsx` (lines 49-120):

```
PHASE 1: LOGIC
├─ breathSystem
│  ├─ Input: UTC time (Date.now())
│  ├─ Output: BreathPhase, BreathConfig, orbitRadius, sphereScale
│  └─ Purpose: Calculate global breathing state (source of truth)

PHASE 2: PHYSICS
├─ particlePhysicsSystem
│  ├─ Input: BreathPhase (from Phase 1), Particle traits
│  ├─ Output: Particle Position, Velocity
│  └─ Purpose: Simulate particle dynamics responsive to breathing

PHASE 3: INPUT
├─ cursorPositionFromLandSystem
│  ├─ Input: Camera, Raycaster
│  ├─ Output: Cursor Position trait
│  └─ Purpose: Ray-cast from camera to find cursor position

PHASE 4: FORCES
├─ velocityTowardsTargetSystem
│  ├─ Input: Target position (cursor), Controllable entity
│  ├─ Output: Velocity trait
│  └─ Purpose: Apply movement toward target

PHASE 5: INTEGRATION
├─ positionFromVelocity
│  ├─ Input: Velocity (particles + controllables)
│  ├─ Output: Position traits updated
│  └─ Purpose: Integrate physics (Euler integration with delta time)

PHASE 6: RENDER SYNC
├─ meshFromPosition
│  ├─ Input: Position traits (all entities)
│  ├─ Output: Three.js mesh.position, mesh.scale
│  └─ Purpose: Sync ECS state to Three.js objects

PHASE 7: CAMERA
├─ cameraFollowFocused
│  ├─ Input: Focused entity Position (just updated by Phase 6)
│  ├─ Output: Camera position animation
│  └─ Purpose: Smoothly follow focused entity
```

**CRITICAL**: System order determines data dependencies. Never reorder without understanding data flow!

---

## Entity Type 1: Simple Marker Entity

**Purpose**: Minimal entity with just a marker trait for organization/tagging
**Examples**: Land, Camera, SpawnPoint
**Boilerplate**: ~50 lines total

### Complete Code

**src/entities/land/traits.tsx:**
```typescript
import { trait } from 'koota';

// Marker trait - just existence, no data
export const Land = trait();
```

**src/entities/land/index.tsx:**
```typescript
import { useWorld } from 'koota/react';
import { useEffect, useRef } from 'react';
import { Mesh } from '../../shared/traits';
import { Land as LandTrait } from './traits';

export function Land({ children }: { children?: React.ReactNode }) {
  const world = useWorld();
  const ref = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!ref.current) return;

    // Spawn entity with marker trait
    const entity = world.spawn(
      LandTrait,
      Mesh(ref.current)
    );

    return () => {
      entity.destroy();
    };
  }, [world]);

  return <group ref={ref}>{children}</group>;
}
```

**No systems.tsx needed** - Marker entities have no update logic.

### Integration

In `src/levels/breathing.tsx`:
```typescript
<Land>
  {/* Three.js components for land mesh */}
</Land>
```

No system registration needed in `providers.tsx`.

---

## Entity Type 2: Stateful Entity with Props

**Purpose**: Customizable visual entity that accepts props and spawns with data
**Examples**: ParticleSystem, BreathingSphere, Character
**Boilerplate**: ~200-300 lines (traits + component + system)

### Traits Definition

**src/entities/myEntity/traits.tsx:**
```typescript
import { trait } from 'koota';

// Marker for existence
export const MyEntity = trait();

// Custom traits with data
export const MyConfig = trait({
  speed: 1,
  scale: 1,
  color: '#ffffff',
});

export const MyState = trait({
  elapsed: 0,
  active: true,
});
```

### Component Implementation

**src/entities/myEntity/index.tsx:**
```typescript
import { useWorld } from 'koota/react';
import { useEffect, useRef } from 'react';
import { Position, Velocity, Mesh } from '../../shared/traits';
import { MyEntity as MyEntityTrait, MyConfig, MyState } from './traits';

interface MyEntityProps {
  /**
   * Speed multiplier for movement
   * @type slider
   * @min 0
   * @max 5
   * @step 0.1
   * @default 1
   */
  speed?: number;

  /**
   * Scale of the entity
   * @type slider
   * @min 0.1
   * @max 3
   * @step 0.1
   * @default 1
   */
  scale?: number;

  /**
   * Base color in hex
   * @type color
   * @default "#ffffff"
   */
  color?: string;

  /**
   * Position in 3D space
   * @type vector3
   * @default [0, 0, 0]
   */
  position?: [x: number, y: number, z: number];
}

export function MyEntity({
  speed = 1,
  scale = 1,
  color = '#ffffff',
  position = [0, 0, 0],
}: MyEntityProps = {}) {
  const world = useWorld();
  const ref = useRef<THREE.Group>(null);
  const [x, y, z] = position;

  // Update config when props change
  useEffect(() => {
    if (!ref.current) return;

    // Get or create entity
    let entity = world.queryFirst(MyEntityTrait);

    if (!entity) {
      // Create new entity with all traits
      entity = world.spawn(
        MyEntityTrait,
        Mesh(ref.current),
        Position({ x, y, z }),
        Velocity({ x: 0, y: 0, z: 0 }),
        MyConfig({ speed, scale, color }),
        MyState({ elapsed: 0, active: true })
      );

      // Store reference for updates
      ref.current.userData.entity = entity;
    } else {
      // Update config if props changed
      entity.set(MyConfig, { speed, scale, color });
      entity.set(Position, { x, y, z });
    }

    return () => {
      if (entity) entity.destroy();
    };
  }, [world, speed, scale, color, x, y, z]);

  return (
    <group ref={ref}>
      {/* Three.js components */}
    </group>
  );
}
```

### System Implementation

**src/entities/myEntity/systems.tsx:**
```typescript
import type { World } from 'koota';
import { MyEntity, MyConfig, MyState } from './traits';
import { Position, Velocity } from '../../shared/traits';

// Direct pattern (simple logic)
export function myEntitySystem(world: World, delta: number) {
  const entities = world.query([MyEntity, MyConfig, MyState, Position]);

  entities.forEach((entity) => {
    const config = entity.get(MyConfig);
    const state = entity.get(MyState);
    const pos = entity.get(Position);

    if (!config || !state || !pos) return;

    if (!config.speed) return; // Skip if disabled

    // Update elapsed time
    const newElapsed = state.elapsed + delta;

    // Update state
    entity.set(MyState, { ...state, elapsed: newElapsed });
  });
}

// Closure pattern (with expensive setup)
export function myEntitySystemWithSetup(world: World) {
  // One-time expensive initialization
  const noise = createNoise3D();
  const baseFrequency = 0.5;

  return (delta: number, time: number) => {
    const entities = world.query([MyEntity, MyConfig, MyState]);

    entities.forEach((entity) => {
      const config = entity.get(MyConfig);
      const state = entity.get(MyState);

      if (!config || !state) return;

      // Use Perlin noise for smooth animation
      const noiseSample = noise(
        time * baseFrequency,
        state.elapsed,
        0
      );

      entity.set(MyState, {
        ...state,
        elapsed: state.elapsed + delta,
      });
    });
  };
}
```

### System Registration

**In src/providers.tsx:**
```typescript
import { myEntitySystem } from './entities/myEntity/systems';

export function KootaSystems({
  myEntitySystemEnabled = true, // <-- Add toggle
  // ... other props
}) {
  const world = useWorld();

  useFrame((state, delta) => {
    // ... Phase 1-3 ...

    // Phase 4: FORCES - Add your system here (or appropriate phase)
    if (myEntitySystemEnabled) {
      myEntitySystem(world, delta);
    }

    // ... Phase 5-7 ...
  });
}
```

---

## Entity Type 3: State-Only Entity

**Purpose**: Pure logic entity with no visual rendering (returns null)
**Examples**: Breath, GameController, GlobalTimer
**Boilerplate**: ~100 lines (traits + component)

### Complete Implementation

**src/entities/breath/traits.tsx:**
```typescript
import { trait } from 'koota';

export const BreathPhase = trait({
  breathPhase: 0,      // 0-1 (0 = exhaled, 1 = inhaled)
  phaseType: 0,        // 0-3 (inhale, hold-in, exhale, hold-out)
  orbitRadius: 2.0,    // Particle orbit
  sphereScale: 1.0,    // Central sphere
  crystallization: 0,  // Stillness effect
});

export const BreathConfig = trait({
  enabled: true,
  curveType: 'phase-based' as const,
});
```

**src/entities/breath/index.tsx:**
```typescript
import { useEffect } from 'react';
import { useWorld } from 'koota/react';
import { BreathPhase, BreathConfig } from './traits';

export function BreathEntity() {
  const world = useWorld();

  useEffect(() => {
    // Check if breath already exists
    let entity = world.queryFirst(BreathPhase);

    if (!entity) {
      // Create global breath state entity
      entity = world.spawn(
        BreathPhase.add({
          breathPhase: 0,
          phaseType: 0,
          orbitRadius: 2.0,
          sphereScale: 1.0,
          crystallization: 0,
        }),
        BreathConfig.add({
          enabled: true,
          curveType: 'phase-based',
        })
      );
    }
  }, [world]);

  // State-only entities don't render anything
  return null;
}
```

**src/entities/breath/systems.tsx:**
```typescript
import type { World } from 'koota';
import { calculateBreathState } from '../../lib/breathCalc';
import { BreathPhase, BreathConfig } from './traits';

export function breathSystem(world: World, delta: number) {
  // Get or create breath entity
  let entity = world.queryFirst(BreathPhase);

  if (!entity) {
    entity = world.spawn(
      BreathPhase,
      BreathConfig
    );
  }

  // Calculate breath state from UTC time
  const breathState = calculateBreathState(Date.now());

  // Update trait with calculated values
  entity.set(BreathPhase, {
    breathPhase: breathState.breathPhase,
    phaseType: breathState.phaseType,
    orbitRadius: breathState.orbitRadius,
    sphereScale: breathState.sphereScale,
    crystallization: breathState.crystallization,
  });
}
```

### Integration

**In src/levels/breathing.tsx:**
```typescript
<BreathEntity /> {/* Invisible, just sets up global state */}
```

**In src/providers.tsx:**
```typescript
import { breathSystem } from './entities/breath/systems';

export function KootaSystems({
  breathSystemEnabled = true,
  // ...
}) {
  useFrame((state, delta) => {
    // Phase 1: LOGIC - Breath system runs FIRST (source of truth)
    if (breathSystemEnabled) {
      breathSystem(world, delta);
    }
    // ... rest of phases ...
  });
}
```

---

## Trait Definition Patterns

### Marker Trait (No Data)
```typescript
export const MyMarker = trait();
```

### Value Trait (Single Number)
```typescript
export const Speed = trait({ value: 1 });
export const Health = trait({ hp: 100, maxHp: 100 });
```

### Vector3 Trait
```typescript
export const Position = trait({ x: 0, y: 0, z: 0 });
export const Velocity = trait({ x: 0, y: 0, z: 0 });
export const Scale = trait({ x: 1, y: 1, z: 1 });
```

### RGB Color Trait
```typescript
export const Color = trait({ r: 1, g: 1, b: 1 });
```

### Complex Config Trait
```typescript
export const PhysicsConfig = trait({
  mass: 1,
  friction: 0.1,
  restitution: 0.8,
  constraints: {
    minVelocity: -10,
    maxVelocity: 10,
  },
});
```

### Type-Safe Traits
```typescript
type CurveType = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';

export const AnimationConfig = trait({
  duration: 1000,
  curve: 'ease-in-out' as CurveType,
  loop: false,
  delay: 0,
});
```

---

## Common Query Patterns

### Single Trait
```typescript
const entities = world.query([MyTrait]);
```

### Multiple Traits
```typescript
const entities = world.query([MyTrait, Position, Velocity]);
```

### With Filter
```typescript
const entities = world.query([MyTrait, MyConfig]);
entities.forEach((entity) => {
  const config = entity.get(MyConfig);
  if (!config.enabled) return; // Skip disabled
  // ... process
});
```

### Query First (Singleton)
```typescript
const globalState = world.queryFirst(GlobalStateTrait);
if (globalState) {
  const state = globalState.get(GlobalStateTrait);
}
```

---

## File Organization Checklist

For a complete entity, create:

- ✅ `src/entities/[MyEntity]/index.tsx` - Component + spawning
- ✅ `src/entities/[MyEntity]/traits.tsx` - Trait definitions
- ✅ `src/entities/[MyEntity]/systems.tsx` - Update logic (if needed)
- ✅ Import system in `src/providers.tsx`
- ✅ Add toggle prop to `KootaSystems`
- ✅ Add system call in correct phase (lines 49-120)
- ✅ Add to scene in `src/levels/breathing.tsx`

---

## Real-World Examples in Codebase

See **[examples.md](examples.md)** for complete real-world entities from breathe-together-v2:
- `src/entities/breath/` - State-only, global synchronization
- `src/entities/particleSystem/` - Complex physics with 300 particles
- `src/entities/breathingSphere/` - Visual entity with 25+ Triplex props
- `src/entities/camera/` - Camera control and animation
