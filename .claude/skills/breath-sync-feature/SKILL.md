---
name: breath-sync-feature
deprecated: true
deprecated-message: "This skill has been consolidated into breathing-sync. Use breathing-sync Mode 1 for creating breathing features."
description: "[DEPRECATED] This skill has been consolidated into breathing-sync. Use breathing-sync Mode 1 to create breath-synchronized visual features."
allowed-tools: [Read, Write, Edit, Glob, Grep, Bash(ls:*)]
---

# ⚠️ DEPRECATED SKILL

This skill has been consolidated into **breathing-sync**.

## ⚠️ OUTDATED DOCUMENTATION WARNING

**The documentation below contains outdated information:**
- References **16-second box breathing** (current: 19-second 4-7-8 relaxation breathing)
- References **sphereScale** and **crystallization** traits (these no longer exist)
- See `../../reference/core-concepts.md` for current breathing cycle details
- See `src/entities/breath/traits.tsx` for current trait list

For current, accurate documentation, use the **breathing-sync** skill instead.

## Migration Guide

**To create breathing-synchronized features:** Use the `breathing-sync` skill and select **Mode 1 (Create)**

### What's Preserved
- ✅ All functionality preserved in breathing-sync Mode 1
- ✅ Same integration patterns with breathCalc.ts
- ✅ Same reference.md, examples.md, patterns.md
- ✅ No capability loss

### No Action Required
If you're currently using this skill, no changes are needed. It will continue to work. However, for future breathing features, use `breathing-sync` Mode 1 instead.

---

## Original Documentation

See: `.claude/skills/breathing-sync/SKILL.md` (Mode 1: Create)

## Overview

The core concept of breathe-together-v2 is **synchronizing all users globally** to a single breathing pattern without any network communication.

This skill helps you create features that:
- ✅ Respond to global UTC-based breathing cycle
- ✅ Use `breathCalc.ts` for pure, deterministic calculations
- ✅ Integrate with the ECS breath state system
- ✅ Create smooth, eased animations
- ✅ Handle phase-specific behaviors (inhale/hold/exhale/hold)
- ✅ Synchronize across all users worldwide

## The Breath Cycle: 16 Seconds

**Box breathing pattern (cycle repeats every 16 seconds):**

```
0-4s:    INHALE   (breathPhase: 0 → 1)
4-8s:    HOLD-IN  (breathPhase: 1, crystallization increases)
8-12s:   EXHALE   (breathPhase: 1 → 0)
12-16s:  HOLD-OUT (breathPhase: 0, crystallization increases)
```

**UTC Synchronization:**
All users calculate using `Date.now()` which is synchronized worldwide:
```
cyclePosition = Date.now() % 16000  // milliseconds in current cycle
```

At any given moment, all users see the **same breath phase**.

## Core Breath Data

From `src/lib/breathCalc.ts`:

```typescript
export interface BreathState {
  breathPhase: number;      // 0-1: position within phase (0=exhaled, 1=inhaled)
  phaseType: number;        // 0-3: 0=inhale, 1=hold-in, 2=exhale, 3=hold-out
  rawProgress: number;      // 0-1: raw progress without easing
  easedProgress: number;    // 0-1: smoothed with easing function
  crystallization: number;  // 0-1: stillness effect during holds
  sphereScale: number;      // 0.6-1.4: central sphere size (inverse of particles)
  orbitRadius: number;      // 1.2-2.8: particle orbit (inverse of sphere)
}
```

**Key pattern:** `breathPhase = 0` means **fully exhaled** (particles expanded, sphere small)
`breathPhase = 1` means **fully inhaled** (particles contracted, sphere large)

## Integration Patterns

### Pattern 1: Direct Calculation (Simplest)

Use `calculateBreathState()` directly:

```typescript
import { calculateBreathState } from '@/lib/breathCalc';

export function mySystem(world: World) {
  const entities = world.query([MyTrait]);
  const breathState = calculateBreathState(Date.now());

  entities.forEach((entity) => {
    // Use breath phase (0-1)
    const scale = 1 + breathState.breathPhase * 0.5;

    // Use phase type for logic
    if (breathState.phaseType === 0) {
      // Inhale phase: expand
    } else if (breathState.phaseType === 2) {
      // Exhale phase: contract
    }

    entity.set(MyTrait, { ...current, scale });
  });
}
```

**Pros:** Simple, pure function, no dependencies
**Cons:** Recalculates every frame (negligible cost)

### Pattern 2: Query Breath Trait (Recommended for Complex Systems)

Query the global breath state from ECS:

```typescript
import { BreathPhase } from '../entities/breath/traits';

export function mySystem(world: World) {
  // Get global breath state (updated by breathSystem in Phase 1)
  const breathQuery = world.query([BreathPhase]);
  if (breathQuery.length === 0) return;

  const [_, breath] = breathQuery[0];

  // Now use breath data
  const entities = world.query([MyTrait]);
  entities.forEach((entity) => {
    const scale = 1 + breath.breathPhase * 0.5;
    entity.set(MyTrait, { ...current, scale });
  });
}
```

**Pros:** Integrates with ECS, single source of truth
**Cons:** Slightly more complexity

## Synchronization Patterns

### Pattern 1: Direct Phase Mapping
Linearly map breathPhase (0-1) to a visual property:

```typescript
const breathState = calculateBreathState(Date.now());

// Example 1: Scale
const scale = 1 + breathState.breathPhase * 0.5;  // Ranges 1-1.5

// Example 2: Position
const yOffset = breathState.breathPhase * 2;  // Ranges 0-2 units

// Example 3: Color (HSL)
const hue = 200 + breathState.breathPhase * 30;  // Ranges 200-230°
```

### Pattern 2: Inverse Synchronization
Common pattern: **particles expand while sphere shrinks** (and vice versa)

```typescript
const breathState = calculateBreathState(Date.now());

// Sphere shrinks when breathing in (inverse)
const sphereScale = 1.4 - breathState.breathPhase * 0.8;  // 1.4 → 0.6

// Particles expand when breathing in
const particleRadius = 1.2 + breathState.breathPhase * 1.6;  // 1.2 → 2.8
```

### Pattern 3: Phase-Specific Behavior
Trigger different logic based on which phase:

```typescript
const breathState = calculateBreathState(Date.now());

switch (breathState.phaseType) {
  case 0: // INHALE
    // Expand, contract particles, glow
    color = '#4488ff';
    emission = 100 + breathState.easedProgress * 200;
    break;

  case 1: // HOLD-IN
    // Hold state, use crystallization for stillness
    color = '#ffffff';
    emission = 50;
    stillness = breathState.crystallization;  // 0.5 → 0.9
    break;

  case 2: // EXHALE
    // Contract, expand particles, calm glow
    color = '#88ccff';
    emission = Math.max(50, 150 - breathState.easedProgress * 100);
    break;

  case 3: // HOLD-OUT
    // Hold state, deep stillness
    color = '#ffffff';
    emission = 20;
    stillness = breathState.crystallization;  // 0.4 → 0.75
    break;
}
```

### Pattern 4: Eased Transitions (Smooth Animation)

Use `easedProgress` instead of raw progress:

```typescript
const breathState = calculateBreathState(Date.now());

// ❌ Jerky (raw progress)
const scale1 = 1 + breathState.rawProgress * 0.5;

// ✅ Smooth (eased progress)
const scale2 = 1 + breathState.easedProgress * 0.5;
```

The easing function (easeOutQuart, easeInSine, etc.) creates acceleration/deceleration
for natural-feeling breathing motion.

## Real-World Examples

### Example 1: Particle Orbit (Simple)

```typescript
export function particleOrbitSystem(world: World) {
  const breathState = calculateBreathState(Date.now());
  const entities = world.query([ParticleTrait, Position]);

  entities.forEach((entity) => {
    const particle = entity.get(ParticleTrait);

    // Orbit radius inverse to sphere (standard pattern)
    const radius = 2.8 - breathState.breathPhase * 1.6;  // 2.8 → 1.2

    // Calculate orbit position (simplified)
    const angle = particle.angle;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    entity.set(Position, { x, y: 0, z });
  });
}
```

### Example 2: Crystallization Effect (Complex)

```typescript
export function crystalizationSystem(world: World) {
  const breathState = calculateBreathState(Date.now());
  const entities = world.query([ShaderTrait]);

  entities.forEach((entity) => {
    const shader = entity.get(ShaderTrait);

    // Use crystallization (0 during inhale/exhale, high during holds)
    const crystal = breathState.crystallization;

    // Blend visual effect based on crystallization
    const opacity = 0.5 + crystal * 0.5;  // 0.5 → 1.0 during holds
    const blur = 1 - crystal * 0.8;        // 1.0 → 0.2 during holds

    entity.set(ShaderTrait, {
      ...shader,
      opacity,
      blur,
    });
  });
}
```

## Guided Interview

To create a breath-synchronized feature:

### 1. What Visual Property to Animate?
- **Size/Scale** - Expand/contract with breathing
- **Position** - Move up/down with breathing
- **Opacity** - Fade in/out with breath
- **Color** - Shift hue with breath
- **Emission** - Particle emission with breath
- **Rotation** - Spin synchronized to breath
- **Multiple** - Combine several properties

### 2. Breathing Direction?
- **Direct** - Increases with inhale (0 → 1)
- **Inverse** - Decreases with inhale (1 → 0)
- **Stillness** - Uses crystallization during holds

### 3. Easing?
- **Linear** - Uniform speed (use `rawProgress`)
- **Smooth** - Accelerating/decelerating (use `easedProgress`)
- **Phase-Specific** - Different per phase (use `phaseType`)

### 4. Range?
- **Min value** - When fully exhaled (breathPhase = 0)
- **Max value** - When fully inhaled (breathPhase = 1)
- **Crystallization range** - Stillness effect during holds

## Implementation Checklist

When creating breath-synchronized feature:

- [ ] Determine which property to animate
- [ ] Choose direct or inverse synchronization
- [ ] Decide on easing (raw vs eased progress)
- [ ] Calculate value range (min when exhaled, max when inhaled)
- [ ] Query breath state (direct calculation or ECS trait)
- [ ] Update trait/property with calculated value
- [ ] Add to correct system phase (usually Phase 2-6)
- [ ] Test with different phases (inhale, hold, exhale)
- [ ] Verify all users see same phase at same time

## Quick Reference

See the following for comprehensive patterns and examples:

- **[reference.md](reference.md)** - Complete breathCalc.ts API and all breath traits
- **[examples.md](examples.md)** - Real components from breathe-together-v2
- **[patterns.md](patterns.md)** - Catalog of common synchronization approaches

---

## Key Takeaways

1. **UTC Time = Global Sync** - All users calculate from Date.now(), no network needed
2. **BreathPhase 0-1** - Position within phase (0=exhaled, 1=inhaled)
3. **Inverse Motion** - Particles ↔ Sphere create balanced breathing
4. **Easing** - smooths abrupt transitions, creates natural motion
5. **Crystallization** - Stillness effect during holds (not during active breathing)

Questions? See [reference.md](reference.md) and [examples.md](examples.md) for comprehensive details.

Let's make it breathe! 🫁
