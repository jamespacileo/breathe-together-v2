# Breath Synchronization Reference

Complete API reference for breathCalc.ts and breath ECS integration.

---

## breathCalc.ts Pure Function API

**Location:** `src/lib/breathCalc.ts`

```typescript
export function calculateBreathState(elapsedTime: number): BreathState
```

**Input:**
- `elapsedTime: number` - Any number (typically `Date.now()`)

**Output:**
```typescript
interface BreathState {
  breathPhase: number;      // 0-1 progression within phase
  phaseType: number;        // 0-3 (0=inhale, 1=hold-in, 2=exhale, 3=hold-out)
  rawProgress: number;      // 0-1 unsmoothed progress
  easedProgress: number;    // 0-1 with easing applied
  crystallization: number;  // 0-1 stillness during holds
  sphereScale: number;      // 0.6-1.4 sphere visual size
  orbitRadius: number;      // 1.2-2.8 particle orbit radius
}
```

**Example Usage:**
```typescript
import { calculateBreathState } from '@/lib/breathCalc';

// Calculate current breath state
const breathState = calculateBreathState(Date.now());

console.log(breathState.breathPhase);    // 0.45 (45% through current phase)
console.log(breathState.phaseType);      // 0 (inhale phase)
console.log(breathState.sphereScale);    // 1.2 (scaled up during inhale)
```

---

## Breath Cycle Specification

**Total cycle: 16 seconds (16,000 ms)**

| Phase | Duration | Time Range | breathPhase | Type | Purpose |
|-------|----------|-----------|------------|------|---------|
| Inhale | 4s | 0-4s | 0→1 | 0 | Expand, active |
| Hold-In | 4s | 4-8s | 1 | 1 | Stillness, crystallization |
| Exhale | 4s | 8-12s | 1→0 | 2 | Contract, active |
| Hold-Out | 4s | 12-16s | 0 | 3 | Stillness, crystallization |

---

## Breath Traits (ECS Integration)

**Location:** `src/entities/breath/traits.tsx`

```typescript
// Global breathing state
export const BreathPhase = trait({
  breathPhase: 0,      // 0-1: phase progression
  phaseType: 0,        // 0-3: which phase
  rawProgress: 0,      // 0-1: unsmoothed
  easedProgress: 0,    // 0-1: with easing
  crystallization: 0,  // 0-1: stillness effect
  sphereScale: 1,      // sphere visual size
  orbitRadius: 2,      // particle orbit
});

export const BreathConfig = trait({
  enabled: true,
  curveType: 'phase-based' as const,
});
```

**Query Example:**
```typescript
const breathQuery = world.query([BreathPhase]);
if (breathQuery.length > 0) {
  const [_, breath] = breathQuery[0];
  console.log(breath.breathPhase);  // 0-1 current progression
}
```

---

## Synchronization Data

### breathPhase (0-1)
Position within current phase:
- **0** = fully exhaled (particles expanded, sphere small)
- **0.5** = halfway through phase
- **1** = fully inhaled (particles contracted, sphere large)

```typescript
// Example: Scale increases with inhale
const scale = 1 + breathState.breathPhase * 0.5;
// At exhale: 1.0
// At inhale: 1.5
```

### phaseType (0-3)
Which phase is currently active:
- **0** = INHALE (active breathing in)
- **1** = HOLD-IN (pause with full lungs)
- **2** = EXHALE (active breathing out)
- **3** = HOLD-OUT (pause with empty lungs)

```typescript
if (breathState.phaseType === 0) {
  // Inhale: expand visualization
}
```

### easedProgress (0-1)
Smoothed version of position with acceleration/deceleration:

```typescript
// ❌ Jerky
const value1 = 1 + breathState.rawProgress * 0.5;

// ✅ Smooth
const value2 = 1 + breathState.easedProgress * 0.5;
```

Easing function used:
- **Inhale** (0-4s): easeOutQuart - fast start, slow end
- **Hold-In** (4-8s): easeInOutQuad - slow middle
- **Exhale** (8-12s): easeInSine - slow start, fast end
- **Hold-Out** (12-16s): easeInOutQuad - slow middle

### crystallization (0-1)
Stillness effect during hold phases:
- **0** during INHALE and EXHALE (active movement)
- **0.5-0.9** during HOLD-IN (increasing stillness)
- **0** during EXHALE transition
- **0.4-0.75** during HOLD-OUT (increasing stillness)

```typescript
// Use for opacity/blur (stillness = increased effect)
const opacity = 0.5 + breathState.crystallization * 0.5;
const blur = crystallization > 0 ? crystallization * 5 : 0;
```

### sphereScale (0.6-1.4)
Central sphere visual size (managed automatically):

```typescript
// Don't recalculate, use directly from breathState
mesh.scale.set(breath.sphereScale, breath.sphereScale, breath.sphereScale);
```

### orbitRadius (1.2-2.8)
Particle orbit radius (inverse of sphereScale):

```typescript
// Standard synchronization: particles and sphere move opposite
const particleRadius = breathState.orbitRadius;
const sphereScale = breathState.sphereScale;

// When sphere is large (1.4), particles are close (1.2)
// When sphere is small (0.6), particles are far (2.8)
```

---

## UTC Synchronization Guarantee

**How it works:**
```typescript
// All users worldwide
const ms_into_cycle = Date.now() % 16000;
```

**Example:**
- 10:00:00 UTC: User A sees breathPhase = 0.3
- 10:00:00 UTC: User B sees breathPhase = 0.3 (same!)
- 10:00:00 UTC: User C sees breathPhase = 0.3 (same!)

No network communication needed because:
1. All users have synchronized system clocks (NTP)
2. UTC time is global (not local time)
3. Calculation is deterministic (same input = same output)

---

## Common Calculation Patterns

### 1. Direct Phase Mapping
```typescript
const breathState = calculateBreathState(Date.now());

// Scale: expand when inhaling
const scale = 1 + breathState.breathPhase * 0.5;

// Color: shift hue with breathing
const hue = 200 + breathState.easedProgress * 30;

// Position: rise and fall
const yOffset = Math.sin(breathState.breathPhase * Math.PI) * 2;
```

### 2. Inverse Mapping
```typescript
// Particles: contract when sphere expands
const particleScale = 1 - breathState.breathPhase * 0.5;

// Opacity: fade out during hold
const opacity = breathState.phaseType % 2 === 0 ? 1 : 0.5;
```

### 3. Phase-Specific Logic
```typescript
switch (breathState.phaseType) {
  case 0: // INHALE - Active, bright
    color = '#4488ff';
    glow = 1.0;
    break;
  case 1: // HOLD-IN - Still, crystallized
    color = '#ffffff';
    glow = 0.3 + breathState.crystallization * 0.7;
    break;
  case 2: // EXHALE - Active, calm
    color = '#88ccff';
    glow = 0.5;
    break;
  case 3: // HOLD-OUT - Still, deep
    color = '#ffffff';
    glow = 0.2 + breathState.crystallization * 0.5;
    break;
}
```

### 4. Smooth Transitions
```typescript
// Use easedProgress for natural motion
const position = breathState.easedProgress * 10;  // Smooth 0-10

// Compare to jerky
const positionJerky = breathState.rawProgress * 10;  // Linear 0-10
```

---

## Integration Points

### In ECS Systems
```typescript
import type { World } from 'koota';
import { BreathPhase } from '../entities/breath/traits';

export function mySystem(world: World, delta: number) {
  // Get global breath state
  const breathQuery = world.query([BreathPhase]);
  if (breathQuery.length === 0) return;

  const [_, breath] = breathQuery[0];

  // Use breath data to update entities
  const entities = world.query([MyTrait]);
  entities.forEach((entity) => {
    const newValue = 1 + breath.breathPhase * 0.5;
    entity.set(MyTrait, { ...current, value: newValue });
  });
}
```

### In Components (Direct Calculation)
```typescript
import { useFrame } from '@react-three/fiber';
import { calculateBreathState } from '@/lib/breathCalc';

export function MyComponent() {
  const ref = useRef();

  useFrame(() => {
    const breathState = calculateBreathState(Date.now());
    ref.current.scale.set(
      breathState.sphereScale,
      breathState.sphereScale,
      breathState.sphereScale
    );
  });

  return <mesh ref={ref} />;
}
```

---

## Performance

### breathCalc.ts Calculation
- **Time:** < 1ms per call
- **Cost:** Negligible (pure math, no allocations)
- **Safe to call every frame:** Yes

```typescript
// This is fine - called 60 times/second
useFrame(() => {
  const state = calculateBreathState(Date.now());  // ~0.01ms
  // ...
});
```

### ECS Query
- **Time:** < 1ms for single entity
- **Cost:** Negligible
- **Safe to call every frame:** Yes

```typescript
// This is fine - very fast query
const breathQuery = world.query([BreathPhase]);  // ~0.01ms
```

---

## Testing & Debugging

### Verify Synchronization
```typescript
// Log breath state at specific times
const states = [0, 4000, 8000, 12000, 16000].map(t => calculateBreathState(t));

// Should see:
// t=0:     breathPhase=0, phaseType=0 (start of inhale)
// t=4000:  breathPhase≈1, phaseType=1 (start of hold-in)
// t=8000:  breathPhase≈0, phaseType=2 (start of exhale)
// t=12000: breathPhase≈0, phaseType=3 (start of hold-out)
// t=16000: breathPhase=0, phaseType=0 (cycle repeats)
```

### Verify Global Sync
```typescript
// All users should calculate identically
const time = Date.now();
console.log(calculateBreathState(time));

// Same output everywhere at same time
```

---

## Real-World Examples

See **[examples.md](examples.md)** for:
- BreathingSphere synchronization
- ParticleSystem orbit control
- Crystallization shader effects
- Phase-specific color transitions
- Inverse motion patterns

---

## FAQ

**Q: Do I need network communication for sync?**
A: No! UTC time is globally synchronized. All users calculate independently and get the same result.

**Q: What if users have wrong system clock?**
A: They'll be slightly out of sync. Not our problem - user responsibility to keep clock correct.

**Q: Can I use custom easing?**
A: Yes, for your own features. But core breathing cycle uses fixed easing (optimized for meditation).

**Q: How precise is the sync?**
A: Within ~10ms due to client system clock accuracy. Good enough for visual synchronization.

**Q: What if I only want to sync part of my feature?**
A: Query breath state but apply selective properties:
```typescript
const breath = queryBreath();
entity.set(MyTrait, {
  ...current,
  scale: 1 + breath.breathPhase * 0.5,  // Synced
  rotation: current.rotation,             // Not synced
});
```
