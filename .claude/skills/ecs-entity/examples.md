# Real-World ECS Entity Examples

Complete code from breathe-together-v2's actual entities. Copy these patterns for your new entities.

---

## Example 1: State-Only Entity (Breath)

The simplest pattern - pure logic, no visual component. This is the global state source.

**File: `src/entities/breath/traits.tsx`**
```typescript
import { trait } from 'koota';

/**
 * Global breathing state - source of truth for all visuals
 * Updated by breathSystem every frame using UTC time
 * All users see same phase due to Date.now() synchronization
 */
export const BreathPhase = trait({
  breathPhase: 0,      // 0-1: progression through current phase
  phaseType: 0,        // 0-3: 0=inhale, 1=hold-in, 2=exhale, 3=hold-out
  rawProgress: 0,      // 0-1: raw progress without easing
  easedProgress: 0,    // 0-1: smoothed progress with easing
  crystallization: 0,  // Stillness effect during holds
  sphereScale: 1,      // Central sphere scale (inverse of particles)
  orbitRadius: 2,      // Particle orbit radius (inverse of sphere)
});

export const BreathConfig = trait({
  enabled: true,
  curveType: 'phase-based' as const,
});
```

**File: `src/entities/breath/index.tsx`**
```typescript
import { useEffect } from 'react';
import { useWorld } from 'koota/react';
import { BreathPhase, BreathConfig } from './traits';

/**
 * Breath Entity - Global State Container
 *
 * Creates a singleton entity that holds the global breathing state.
 * The breathSystem updates this every frame based on UTC time.
 * Returns null - purely logical entity with no visual representation.
 */
export function BreathEntity() {
  const world = useWorld();

  useEffect(() => {
    // Only create once (singleton)
    let entity = world.queryFirst(BreathPhase);

    if (!entity) {
      entity = world.spawn(
        BreathPhase.add({
          breathPhase: 0,
          phaseType: 0,
          rawProgress: 0,
          easedProgress: 0,
          crystallization: 0,
          sphereScale: 1,
          orbitRadius: 2,
        }),
        BreathConfig.add({
          enabled: true,
          curveType: 'phase-based',
        })
      );
    }
  }, [world]);

  // No visual - purely logical state
  return null;
}
```

**File: `src/entities/breath/systems.tsx`**
```typescript
import type { World } from 'koota';
import { calculateBreathState } from '../../lib/breathCalc';
import { BreathPhase, BreathConfig } from './traits';

/**
 * Breath System - Phase 1: LOGIC
 *
 * Calculates global breathing state from UTC time.
 * Runs FIRST because all other systems depend on this output.
 *
 * All users globally see the same phase at the same time
 * because Date.now() is synchronized worldwide.
 */
export function breathSystem(world: World, delta: number) {
  // Get or create breath state entity
  let entity = world.queryFirst(BreathPhase);

  if (!entity) {
    entity = world.spawn(BreathPhase, BreathConfig);
  }

  // Pure calculation from UTC time (no props, no input)
  const breathState = calculateBreathState(Date.now());

  // Update breath state trait with calculated values
  entity.set(BreathPhase, {
    breathPhase: breathState.breathPhase,
    phaseType: breathState.phaseType,
    rawProgress: breathState.rawProgress,
    easedProgress: breathState.easedProgress,
    crystallization: breathState.crystallization,
    sphereScale: breathState.sphereScale,
    orbitRadius: breathState.orbitRadius,
  });
}
```

**Integration in `src/providers.tsx`:**
```typescript
import { breathSystem } from './entities/breath/systems';

export function KootaSystems({
  breathSystemEnabled = true, // <-- Add toggle
  // ... other systems
}) {
  const world = useWorld();

  useFrame((state, delta) => {
    // ============================================================
    // PHASE 1: LOGIC - Calculate global state (source of truth)
    // ============================================================
    if (breathSystemEnabled) {
      breathSystem(world, delta); // <-- Runs FIRST
    }

    // ... Phase 2-7 follow ...
  });
}
```

**Used in scene:**
```typescript
// In src/levels/breathing.tsx
export function BreathingScene() {
  return (
    <Canvas>
      <BreathEntity /> {/* Invisible - just sets up state */}
      {/* Other visual components use breath state */}
    </Canvas>
  );
}
```

---

## Example 2: Stateful Visual Entity (BreathingSphere)

A complex visual entity with 25+ Triplex-tunable props. Shows all patterns.

**File: `src/entities/breathingSphere/traits.tsx` (simplified)**
```typescript
import { trait } from 'koota';

export const BreathingSphere = trait();

export const SphereConfig = trait({
  // Visual properties
  opacity: 1,
  chromaticAberration: 0.02,
  fresnelIntensityBase: 0.3,
  fresnelIntensityMax: 1.0,

  // Geometry
  segments: 64,
  radius: 1,

  // Animation
  entranceDelayMs: 0,
  entranceIsActive: true,

  // Breath sync
  breathSyncEnabled: true,
});

export const SphereState = trait({
  elapsedMs: 0,
  isEntering: true,
});
```

**File: `src/entities/breathingSphere/index.tsx`**
```typescript
import { useWorld } from 'koota/react';
import { useEffect, useRef } from 'react';
import { Mesh, Position, Scale } from '../../shared/traits';
import { BreathingSphere as BreathingSphereEntity, SphereConfig, SphereState } from './traits';

/**
 * Breathing Sphere Component - Main Visual Entity
 *
 * A 3D sphere that responds to global breathing cycle.
 * Scales inverse to particles (shrinks when they expand, and vice versa).
 * All props are Triplex-editable with comprehensive annotations.
 */
interface BreathingSphereProps {
  /**
   * Sphere opacity (0 = fully transparent, 1 = opaque)
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
   * Chromatic aberration effect intensity
   * Creates subtle color separation on edges
   *
   * **When to adjust**: Increase for surreal/dreamy effect, 0 for pure white sphere
   * **Typical range**: 0-0.05
   * **Interacts with**: opacity (aberration visible at >0.3)
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
   * Base Fresnel glow intensity (at sphere sides)
   *
   * @type slider
   * @min 0
   * @max 1
   * @step 0.05
   * @default 0.3
   */
  fresnelIntensityBase?: number;

  /**
   * Maximum Fresnel glow intensity (during peak breathing)
   *
   * @type slider
   * @min 0
   * @max 2
   * @step 0.1
   * @default 1.0
   */
  fresnelIntensityMax?: number;

  /**
   * Sphere geometry segments (quality)
   * Higher = smoother but slower
   *
   * @type slider
   * @min 16
   * @max 256
   * @step 8
   * @default 64
   */
  segments?: number;

  /**
   * Base sphere radius
   *
   * @type slider
   * @min 0.5
   * @max 3
   * @step 0.1
   * @default 1
   */
  radius?: number;

  /**
   * Entrance animation delay in milliseconds
   *
   * @type slider
   * @min 0
   * @max 2000
   * @step 100
   * @default 0
   */
  entranceDelayMs?: number;

  /**
   * Enable breathing synchronization
   *
   * @type boolean
   * @default true
   */
  breathSyncEnabled?: boolean;
}

export function BreathingSphere({
  opacity = 0.7,
  chromaticAberration = 0.02,
  fresnelIntensityBase = 0.3,
  fresnelIntensityMax = 1.0,
  segments = 64,
  radius = 1,
  entranceDelayMs = 0,
  breathSyncEnabled = true,
}: BreathingSphereProps = {}) {
  const world = useWorld();
  const ref = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!ref.current) return;

    let entity = world.queryFirst(BreathingSphereEntity);

    if (!entity) {
      entity = world.spawn(
        BreathingSphereEntity,
        Mesh(ref.current),
        Position({ x: 0, y: 0, z: 0 }),
        Scale({ x: 1, y: 1, z: 1 }),
        SphereConfig({
          opacity,
          chromaticAberration,
          fresnelIntensityBase,
          fresnelIntensityMax,
          segments,
          radius,
          entranceDelayMs,
          entranceIsActive: entranceDelayMs > 0,
          breathSyncEnabled,
        }),
        SphereState({
          elapsedMs: 0,
          isEntering: entranceDelayMs > 0,
        })
      );

      ref.current.userData.entity = entity;
    } else {
      // Update config when props change
      entity.set(SphereConfig, {
        opacity,
        chromaticAberration,
        fresnelIntensityBase,
        fresnelIntensityMax,
        segments,
        radius,
        entranceDelayMs,
        entranceIsActive: entranceDelayMs > 0,
        breathSyncEnabled,
      });
    }

    return () => {
      if (entity) entity.destroy();
    };
  }, [
    world,
    opacity,
    chromaticAberration,
    fresnelIntensityBase,
    fresnelIntensityMax,
    segments,
    radius,
    entranceDelayMs,
    breathSyncEnabled,
  ]);

  return (
    <group ref={ref}>
      <mesh>
        <sphereGeometry args={[radius, segments, segments]} />
        <meshStandardMaterial
          transparent
          opacity={opacity}
          color="#ffffff"
          emissive="#4488ff"
        />
      </mesh>
    </group>
  );
}
```

**File: `src/entities/breathingSphere/systems.tsx`** (simplified)
```typescript
import type { World } from 'koota';
import { BreathingSphere, SphereConfig, SphereState } from './traits';
import { Scale } from '../../shared/traits';
import { BreathPhase } from '../breath/traits';

/**
 * Breathing Sphere System - Phase 2-6
 *
 * Synchronizes sphere scale to global breathing cycle.
 * Inverse motion: shrinks when particles expand (and vice versa).
 * Uses eased progress for smooth animation.
 */
export function breathingSphereSystem(world: World, delta: number) {
  // Get global breath state
  const breathQuery = world.query([BreathPhase]);
  if (breathQuery.length === 0) return;

  const [_, breath] = breathQuery[0];

  // Update sphere visual
  const sphereQuery = world.query([BreathingSphere, SphereConfig, Scale]);

  sphereQuery.forEach((entity) => {
    const config = entity.get(SphereConfig);
    const scale = entity.get(Scale);

    if (!config || !scale || !config.breathSyncEnabled) return;

    // Scale is controlled by breath phase
    // breathPhase = 0 → sphere small (0.6x)
    // breathPhase = 1 → sphere large (1.4x)
    const newScale = breath.sphereScale;

    entity.set(Scale, { x: newScale, y: newScale, z: newScale });
  });
}
```

**Integration in `src/providers.tsx`:**
```typescript
import { breathingSphereSystem } from './entities/breathingSphere/systems';

export function KootaSystems({
  breathingSphereSystemEnabled = true,
  // ...
}) {
  useFrame((state, delta) => {
    // Phase 1: Breath system...
    // Phase 2: Particle physics...
    // ...
    // Phase 6: RENDER SYNC
    if (breathingSphereSystemEnabled) {
      breathingSphereSystem(world, delta);
    }
    meshFromPosition(world, delta);
  });
}
```

---

## Example 3: Physics Entity (Particle System)

Complex entity with 300 particles, physics forces, and Triplex debugging.

See `src/entities/particle/index.tsx` and `src/entities/particle/systems.tsx` for the full implementation.

Key patterns:
- **Instanced mesh** for 300 particles (single draw call)
- **Force-based physics** (spring, repulsion, attraction, damping)
- **Breath synchronization** (orbit radius changes with breath)
- **Particle colors** from global presence data
- **Debug props** for tuning particle behavior

---

## Complete Entity Checklist

When creating a new entity, use this checklist:

### Files
- [ ] `src/entities/[MyEntity]/index.tsx` - React component
- [ ] `src/entities/[MyEntity]/traits.tsx` - Trait definitions
- [ ] `src/entities/[MyEntity]/systems.tsx` - Update logic (if needed)

### Component Implementation
- [ ] Export default component with TypeScript props
- [ ] Add JSDoc with `@type`, `@min`, `@max`, `@step`, `@default` for Triplex
- [ ] Use `useWorld()` from koota/react
- [ ] Spawn entity in useEffect
- [ ] Cleanup on unmount with entity.destroy()
- [ ] Return `null` for state-only entities

### Traits
- [ ] Define all traits as `trait()` objects
- [ ] Use TypeScript for type safety
- [ ] Document complex traits with JSDoc

### Systems
- [ ] Implement as pure function: `(world: World, delta: number) => void`
- [ ] Or use closure pattern: `(world: World) => (delta: number, time: number) => void`
- [ ] Query required traits
- [ ] Immutable updates: `entity.set(Trait, { ...current, changed: value })`
- [ ] No side effects outside Koota

### Integration
- [ ] Import system in `src/providers.tsx`
- [ ] Add toggle prop to `KootaSystems`
- [ ] Add system call in correct phase (see execution order)
- [ ] Add entity to scene in `src/levels/breathing.tsx`

---

## Next Steps

1. Copy the pattern that matches your entity type
2. Replace `MyEntity`, `MyTrait`, etc. with your names
3. Implement your specific logic
4. Test in Triplex: `npm run dev`
5. Verify system order hasn't changed in `providers.tsx`

Happy building! 🚀
