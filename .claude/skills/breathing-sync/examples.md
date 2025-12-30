# Breath Synchronization Examples

Real breathing-synchronized implementations from breathe-together-v2.

---

## Example 1: Simple Sphere Scaling (Direct Phase Mapping)

The most basic breath sync: sphere expands and contracts with breathing.

**File: `src/entities/breathingSphere/index.tsx`**

```typescript
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { breathPhase } from '@/entities/breath/traits';

export function BreathingSphere() {
  const meshRef = useRef<THREE.Mesh>(null);

  // Spawn as entity
  useEffect(() => {
    const entity = world.spawn();
    entity.set(BreathingSphereMarker, {});
    return () => world.despawn(entity.id);
  }, [world]);

  // Sync scale to breath phase every frame
  useFrame(() => {
    const breathEntity = world.queryFirst(breathPhase);
    if (!breathEntity) return;

    const breath = breathEntity.get(breathPhase);
    const targetScale = breath.sphereScale * 0.8; // 0.6-1.4 range

    meshRef.current.scale.setScalar(targetScale);
  });

  return (
    <group>
      <mesh ref={meshRef} geometry={geometry} material={material} />
    </group>
  );
}
```

**Integration in `src/providers.tsx`:**
```typescript
if (breathingSphereEnabled) {
  // Nothing needed — handled by useFrame in component
}
```

**Why it works:**
- ✅ Queries breathPhase trait directly
- ✅ Large visual range (0.6 → 1.4 = 130% change)
- ✅ No heavy damping (direct 1:1 mapping)
- ✅ Updates every frame (useFrame)

---

## Example 2: Inverse Particle Orbit (Eased System)

Particles move opposite to sphere: contract when sphere expands, with easing.

**File: `src/entities/particle/systems.tsx` (simplified)**

```typescript
import type { World } from 'koota';
import { easing } from 'maath';
import { breathPhase, targetOrbitRadius, orbitRadius } from '@/entities/breath/traits';
import { ParticlePosition, ParticleState } from './traits';

/**
 * Particle Physics System
 *
 * Inverse synchronization with easing:
 * - Queries breathPhase and orbitRadius
 * - Eases particle orbit radius toward target
 * - Particles contract when sphere expands
 */
export function particlePhysicsSystem(world: World, delta: number) {
  // Get global breath state
  const breathEntity = world.queryFirst(breathPhase);
  if (!breathEntity) return;

  const breath = breathEntity.get(breathPhase);
  const targetRadius = breath.orbitRadius; // 1.8-3.5

  // Update each particle position
  const entities = world.query([ParticleState, ParticlePosition]);

  entities.forEach((entity) => {
    const particle = entity.get(ParticleState);
    if (!particle) return;

    // Ease current radius toward target
    const temp = { value: particle.currentRadius };
    easing.damp(temp, 'value', targetRadius, 0.3, delta); // 55ms lag
    const radius = temp.value;

    // Calculate position on sphere orbit
    const angle = particle.angle;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    // Update particle position
    entity.set(ParticlePosition, { x, y: 0, z });
    entity.set(ParticleState, {
      ...particle,
      currentRadius: radius,
    });
  });
}
```

**Why it works:**
- ✅ Queries breath data from ECS
- ✅ Uses easing.damp for smooth transitions
- ✅ Responsive damping speed (0.3 = 55ms lag)
- ✅ Particles move opposite to sphere automatically

---

## Example 3: Phase-Specific Color (Conditional Logic)

Different colors and effects for each breathing phase.

**File: custom color system**

```typescript
import { calculateBreathState } from '@/lib/breathCalc';

export function getBreathColor(): string {
  const breath = calculateBreathState(Date.now());

  switch (breath.phaseType) {
    case 0: // INHALE - Active, energetic
      // Bright blue
      const inhaleBright = 200 + breath.easedProgress * 55;
      return `hsl(220, 100%, ${inhaleBright / 255 * 100}%)`;

    case 1: // HOLD-IN - Still, crystallized
      // White with increasing crystallization
      const holdInAlpha = 0.5 + breath.crystallization * 0.5;
      return `rgba(255, 255, 255, ${holdInAlpha})`;

    case 2: // EXHALE - Calming, gentle
      // Soft cyan
      return `hsl(190, 80%, 50%)`;

    case 3: // HOLD-OUT - Deep stillness
      // Very pale white
      const holdOutAlpha = 0.3 + breath.crystallization * 0.4;
      return `rgba(255, 255, 255, ${holdOutAlpha})`;

    default:
      return '#ffffff';
  }
}
```

**Why it works:**
- ✅ Direct calculation (calculateBreathState)
- ✅ Phase-specific logic (switch statement)
- ✅ Uses crystallization for stillness effect

---

## Example 4: Debugging a Non-Responsive Entity

Common issue: entity is supposed to breathe but appears static.

**Problem code (before):**
```typescript
// In particle system:
const scale = 1.0 + phase * 0.1;  // Only 10% change = invisible!

// Damping speed too high:
easing.damp(target, 'value', newValue, 0.1, delta);  // 166ms lag!
```

**Validation approach:**
```typescript
// Step 1: Check breath entity exists
const breathEntity = world.queryFirst(breathPhase);
console.log('BreathEntity spawned:', !!breathEntity);  // Should be true

// Step 2: Log breath values
if (breathEntity) {
  const breath = breathEntity.get(breathPhase);
  console.log('Breath phase:', breath.breathPhase, 'Type:', breath.phaseType);
}

// Step 3: Test with exaggerated parameter
const testScale = 1.0 + phase * 2.0;  // 200% change = very visible
console.log('Test scale:', testScale);  // Should be 1.0 → 3.0

// Step 4: Monitor all 4 phases during 16-second cycle
```

**Fixed code (after):**
```typescript
// Increased parameter visibility
const scale = 1.0 + phase * 0.3;  // 30% change = clearly visible!

// Reduced damping for responsiveness
easing.damp(target, 'value', newValue, 0.3, delta);  // 55ms lag
```

---

## Example 5: Validating Integration After Fix

After applying a fix, run through validation checklist:

**SKILL Mode 2 validation:**

```
✅ Check 1: Breath entity spawned
   → <BreathEntity /> found in src/levels/breathing.tsx

✅ Check 2: Breath system enabled
   → breathSystem runs in Phase 1 (src/providers.tsx:63)

✅ Check 3: Entity queries breath traits
   → System queries breathPhase and reads it

✅ Check 4: Entity system registered
   → particlePhysicsSystem added to KootaSystems (Phase 2)

✅ Check 5: Visual parameter ranges adequate
   → Before: scale = 1.0 + 0.1 * phase (±10%, invisible)
   → After: scale = 1.0 + 0.3 * phase (±30%, visible)

✅ Check 6: Damping constants responsive
   → Before: speed = 0.1 (166ms lag, disconnected)
   → After: speed = 0.3 (55ms lag, responsive)

✅ Check 7: Quality not disabling entity
   → Particles render at all quality levels

✅ Check 8: Updates every frame
   → useFrame (component) or system loop (ECS)

Performance:
✅ 60fps maintained
✅ Memory stable
✅ Draw calls: 2 (unchanged)
✅ No console errors

Phase Testing:
✅ INHALE (0-4s): Particles contract smoothly
✅ HOLD-IN (4-8s): Stillness visible, crystallization increases
✅ EXHALE (8-12s): Particles expand smoothly
✅ HOLD-OUT (12-16s): Deep stillness
```

---

## Pattern Comparison

### When to Use Each Pattern

| Pattern | When to Use | Example |
|---------|-----------|---------|
| Direct calculation | Simple, one-off effects | Color calculation |
| Query trait | Complex systems, reused state | Particle physics |
| Phase-specific logic | Different behaviors per phase | Color transitions |
| Eased transitions | Smooth, natural motion | Orbit radius changes |

### Example Comparison Table

| Example | Pattern | File | Lines | Complexity |
|---------|---------|------|-------|------------|
| BreathingSphere | Direct mapping | `breathingSphere/index.tsx` | ~15 | Low |
| ParticleSystem | Eased query | `particle/systems.tsx` | ~40 | Medium |
| Color system | Phase logic | Custom helper | ~20 | Medium |

---

## Integration Checklist

When implementing a breathing-synchronized feature:

- [ ] **Entity spawning** — Component spawns with `world.spawn()`
- [ ] **Trait attachment** — Entity has breathing-related traits
- [ ] **System registration** — System added to KootaSystems in correct phase
- [ ] **Breath query** — System queries breathPhase or related traits
- [ ] **Parameter visibility** — Change >20% for clear perception
- [ ] **Easing/smoothing** — Natural, meditation-appropriate motion
- [ ] **Phase testing** — All 4 phases tested and validated
- [ ] **Performance** — 60fps maintained, no new warnings

---

## Real-World References

**Working implementations:**
- `src/entities/breathingSphere/` — Direct sphere scaling
- `src/entities/particle/` — Inverse particle orbit
- `src/entities/breath/systems.tsx` — breathSystem calculation
- `src/lib/breathCalc.ts` — Pure breath calculation

**Validation example:**
- See [fix-application/examples.md](../fix-application/examples.md#example-1) for "Particle Breathing Visibility Fix" with complete before/after and validation

---

Let's create breathing-synchronized features! 🫁
