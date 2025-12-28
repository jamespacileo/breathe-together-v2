# Breath Synchronization Reference

Technical reference for breathing synchronization in breathe-together-v2.

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
  orbitRadius: number;      // 1.8-3.5 particle orbit radius
}
```

**Example Usage:**
```typescript
import { calculateBreathState } from '@/lib/breathCalc';

const breathState = calculateBreathState(Date.now());

console.log(breathState.breathPhase);    // 0.45 (45% through current phase)
console.log(breathState.phaseType);      // 0 (inhale phase)
console.log(breathState.sphereScale);    // 1.2 (scaled up during inhale)
```

**Performance:**
- Time: < 0.5ms per call
- Memory: Negligible (small object allocation)
- Safe to call: Every frame, multiple times

---

## Breath Traits (ECS Integration)

**Location:** `src/entities/breath/traits.tsx`

### Primary Trait: breathPhase

```typescript
export const breathPhase = trait<{ value: number }>();
```

Contains the current breath phase value (0-1).

### Full BreathPhase Trait

```typescript
export const breathPhase = trait<{
  breathPhase: number;      // 0-1: phase progression
  phaseType: number;        // 0-3: which phase
  rawProgress: number;      // 0-1: unsmoothed
  easedProgress: number;    // 0-1: with easing
  crystallization: number;  // 0-1: stillness effect
  sphereScale: number;      // sphere visual size
  orbitRadius: number;      // particle orbit
}>();
```

**Query Example:**
```typescript
const breathEntity = world.queryFirst(breathPhase);
if (!breathEntity) return;  // Not spawned yet

const breath = breathEntity.get(breathPhase);
console.log(breath.value);  // 0-1 current progression
```

---

## System Execution Order (Critical)

Located in `src/providers.tsx`, lines 49-120, inside `KootaSystems` component.

**Required order:**

1. **Phase 1 (LOGIC):** breathSystem
   - Calculates breath state from UTC time
   - Outputs: BreathPhase trait updated
   - All other systems depend on this

2. **Phase 2+ (All others):** Your entity systems
   - Read BreathPhase trait
   - Update entity behavior based on breath

**Critical rule:** DO NOT REORDER PHASES. System execution order prevents race conditions.

See [ECS Architecture Reference](../../reference/ecs-architecture.md) for full system order.

---

## BreathState Value Ranges

### By Phase

| Phase | Time | breathPhase | phaseType | orbitRadius | sphereScale | crystallization |
|-------|------|-------------|-----------|-------------|-------------|-----------------|
| INHALE | 0-4s | 0 → 1 | 0 | 3.5 → 1.8 | 0.6 → 1.4 | 0 |
| HOLD-IN | 4-8s | ~1.0 | 1 | ~1.8 | ~1.4 | 0.5 → 0.9 |
| EXHALE | 8-12s | 1 → 0 | 2 | 1.8 → 3.5 | 1.4 → 0.6 | 0 |
| HOLD-OUT | 12-16s | ~0.0 | 3 | ~3.5 | ~0.6 | 0.4 → 0.75 |

### breathPhase Interpretation

- **0** = Fully exhaled (particles expanded, sphere small)
- **0.5** = Halfway through phase
- **1** = Fully inhaled (particles contracted, sphere large)

### phaseType Interpretation

```typescript
switch (breathState.phaseType) {
  case 0: // INHALE - Active breathing in
  case 1: // HOLD-IN - Pause with full lungs (crystallization increases)
  case 2: // EXHALE - Active breathing out
  case 3: // HOLD-OUT - Pause with empty lungs (crystallization increases)
}
```

### Crystallization Interpretation

Stillness/peacefulness during hold phases:

```typescript
// During INHALE (phase 0): crystallization = 0
// During HOLD-IN (phase 1): crystallization increases 0.5 → 0.9
// During EXHALE (phase 2): crystallization = 0
// During HOLD-OUT (phase 3): crystallization increases 0.4 → 0.75
```

Use cases:
- Fade particles: `opacity = 1 - crystallization * 0.5`
- Blur shader: `blur = crystallization * 5`
- Reduce motion: `jitterAmount = 1 - crystallization * 0.8`

---

## Integration Patterns

### Pattern 1: Direct Calculation (Simplest)

```typescript
import { calculateBreathState } from '@/lib/breathCalc';

export function mySystem(world: World, delta: number) {
  const breathState = calculateBreathState(Date.now());
  const scale = 1 + breathState.breathPhase * 0.5;

  const entities = world.query([MyTrait]);
  entities.forEach(entity => {
    const current = entity.get(MyTrait);
    entity.set(MyTrait, { ...current, scale });
  });
}
```

**Pros:** Simple, pure function, no dependencies
**Cons:** Recalculates every frame (negligible cost)

### Pattern 2: Query Breath Trait (Recommended)

```typescript
import { breathPhase } from '@/entities/breath/traits';

export function mySystem(world: World, delta: number) {
  const breathEntity = world.queryFirst(breathPhase);
  if (!breathEntity) return;

  const breath = breathEntity.get(breathPhase);
  const phase = breath.value;  // 0.0 - 1.0

  const entities = world.query([MyTrait]);
  entities.forEach(entity => {
    const scale = 1.0 + phase * 0.3;
    entity.set(MyTrait, { ...current, scale });
  });
}
```

**Pros:** Efficient, works with easing/damping
**Cons:** Requires ECS understanding

### Pattern 3: Phase-Specific Logic

```typescript
const breathState = calculateBreathState(Date.now());

switch (breathState.phaseType) {
  case 0: // INHALE - Active, energetic
    color = '#4488ff';
    glow = 0.8;
    break;
  case 1: // HOLD-IN - Still, crystallized
    color = '#ffffff';
    glow = 0.3 + breathState.crystallization * 0.7;
    break;
  case 2: // EXHALE - Active, calming
    color = '#88ccff';
    glow = 0.5;
    break;
  case 3: // HOLD-OUT - Still, deep
    color = '#ffffff';
    glow = 0.2 + breathState.crystallization * 0.5;
    break;
}
```

---

## Debugging Techniques

### Technique 1: Console Logging Breath State

```typescript
export function mySystem(world: World, delta: number) {
  const breathEntity = world.queryFirst(breathPhase);
  if (!breathEntity) return;

  const breath = breathEntity.get(breathPhase);

  console.log({
    time: Date.now() % 16000,
    phase: breath.phaseType,
    breathPhase: breath.breathPhase.toFixed(2),
    orbitRadius: breath.orbitRadius.toFixed(2),
    crystallization: breath.crystallization.toFixed(2),
  });
}
```

### Technique 2: Verify Synchronization

All users should see identical breath state at same time:

```typescript
const now = Date.now();
const state1 = calculateBreathState(now);
const state2 = calculateBreathState(now);

console.assert(state1.breathPhase === state2.breathPhase);  // Always true
```

### Technique 3: Test Each Phase

```typescript
const phases = [
  { ms: 0, expected: 'INHALE start' },
  { ms: 2000, expected: 'INHALE mid' },
  { ms: 4000, expected: 'HOLD-IN start' },
  { ms: 6000, expected: 'HOLD-IN mid' },
  { ms: 8000, expected: 'EXHALE start' },
  { ms: 10000, expected: 'EXHALE mid' },
  { ms: 12000, expected: 'HOLD-OUT start' },
  { ms: 14000, expected: 'HOLD-OUT mid' },
];

phases.forEach(({ ms, expected }) => {
  const state = calculateBreathState(ms);
  console.log(`${expected} → phase: ${state.phaseType}, breathPhase: ${state.breathPhase.toFixed(2)}`);
});
```

### Technique 4: Temporarily Increase Parameters

To verify integration is working:

```typescript
// In your entity system:
const testMode = true;

const scale = 1 + (testMode ? 2.0 : 0.5) * breathPhase;
// testMode: scale 1.0 → 3.0 (200% change, highly visible)
// normal: scale 1.0 → 1.5 (50% change, normal)

if (testMode) {
  console.log('TEST MODE: Scale parameters increased 4x for visibility');
}
```

If entity becomes visible with testMode=true, issue is parameter visibility. If still invisible, issue is integration.

---

## Performance Considerations

### breathCalc.ts Cost
- Time: < 0.5ms per call
- Safe to call: Every frame, multiple times
- Cost of 300 particles: < 1ms total

### System Query Cost
- Time: < 0.1ms per system
- Safe to query: Every frame, multiple systems

### Overall Breathing System Cost
- breathSystem itself: ~0.2ms
- All systems querying breath: < 0.5ms
- Total overhead: < 1ms per frame

**Conclusion:** Breathing synchronization has negligible performance cost. Increase visual parameters liberally.

---

## Troubleshooting Decision Tree

```
Entity not responding to breathing?
├─ Check 1: Is <BreathEntity /> spawned?
│  └─ No → Add to src/levels/breathing.tsx
├─ Check 2: Does breathSystem run in Phase 1?
│  └─ No → Verify src/providers.tsx lines 49-120
├─ Check 3: Does entity query breath traits?
│  └─ No → Add breath trait query to system
├─ Check 4: Is entity system registered?
│  └─ No → Add to src/providers.tsx KootaSystems
├─ Check 5: Are visual ranges large enough (>20%)?
│  └─ No → Increase parameter multiplier
├─ Check 6: Is damping too heavy (<0.2)?
│  └─ Yes → Increase speed to 0.3+
├─ Check 7: Is low quality disabling entity?
│  └─ Yes → Check quality context settings
└─ Check 8: Does entity update every frame?
   └─ No → Add useFrame or verify system loop
```

---

## Real-World Examples

### BreathingSphere (Working Example)

Located: `src/entities/breathingSphere/index.tsx`

```typescript
const meshRef = useRef<THREE.Mesh>(null);

useFrame(() => {
  const breath = world.queryFirst(breathPhase);
  if (!breath) return;

  const breathData = breath.get(breathPhase);
  const targetScale = breathData.sphereScale * entranceScale;

  meshRef.current.scale.setScalar(targetScale);
});
```

**Why it works:**
- ✅ Queries breathPhase trait
- ✅ Large visual range (0.6 → 1.4 = 130% change)
- ✅ No heavy damping (direct 1:1 mapping)

### ParticleSystem (Integration Pattern)

Located: `src/entities/particle/index.tsx` + `systems.tsx`

Uses both breath phase (for pulsing) and orbit radius (for motion):

```typescript
// In physics system:
const radius = breathState.orbitRadius;  // 1.8 → 3.5
const scale = 1.0 + phase * 0.3;         // Size pulse with breathing
```

---

## FAQ

**Q: Do I need network communication for sync?**
A: No! UTC time is globally synchronized. All users calculate independently and get the same result.

**Q: What if a user's clock is wrong?**
A: They'll be out of sync. Not our problem—user responsibility to keep clock correct.

**Q: How precise is the sync?**
A: Within ~10ms due to client system clock accuracy. Good enough for visual synchronization.

**Q: Can I use custom easing?**
A: Yes, for your own features. Core breathing cycle uses fixed easing (optimized for meditation).

**Q: What if I only want to sync part of my feature?**
A: Query breath state but apply selectively:
```typescript
const breath = world.queryFirst(breathPhase);
entity.set(MyTrait, {
  ...current,
  scale: 1 + breath.value * 0.5,  // Synced
  rotation: current.rotation,      // Not synced
});
```

---

## References

**Source files:**
- `src/lib/breathCalc.ts` — Pure breath calculation
- `src/entities/breath/traits.tsx` — ECS trait definitions
- `src/entities/breath/systems.tsx` — breathSystem implementation
- `src/providers.tsx` — System registration (lines 49-120)

**Related references:**
- [Core Concepts Reference](../../reference/core-concepts.md) — Breathing cycle details
- [ECS Architecture Reference](../../reference/ecs-architecture.md) — System order and traits
- [Best Practices Reference](../../reference/best-practices.md) — R3F, ECS, Three.js patterns

---

Let's synchronize with the breath! 🫁
