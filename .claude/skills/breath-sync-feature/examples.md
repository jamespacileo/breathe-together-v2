# Breath Synchronization Examples

Real implementations from breathe-together-v2.

---

## Example 1: Simple Sphere Scaling (Direct Phase Mapping)

The most basic breath sync: sphere expands and contracts.

**File: `src/entities/breathingSphere/systems.tsx`**
```typescript
import type { World } from 'koota';
import { BreathPhase } from '../breath/traits';
import { BreathingSphere, SphereConfig } from './traits';
import { Scale } from '../../shared/traits';

/**
 * Breathing Sphere System
 *
 * Simplest breath sync: scale directly maps to breathPhase
 * breathPhase=0 (exhaled) → scale=0.6 (small)
 * breathPhase=1 (inhaled) → scale=1.4 (large)
 */
export function breathingSphereSystem(world: World, delta: number) {
  // Get global breath state (calculated by breathSystem in Phase 1)
  const breathQuery = world.query([BreathPhase]);
  if (breathQuery.length === 0) return;

  const [_, breath] = breathQuery[0];

  // Update sphere visual
  const sphereQuery = world.query([BreathingSphere, SphereConfig, Scale]);

  sphereQuery.forEach((entity) => {
    const config = entity.get(SphereConfig);
    if (!config || !config.breathSyncEnabled) return;

    // Direct mapping: use sphere scale from breath calculation
    const newScale = breath.sphereScale;  // 0.6-1.4

    entity.set(Scale, {
      x: newScale,
      y: newScale,
      z: newScale,
    });
  });
}
```

**Integration in `src/providers.tsx`:**
```typescript
if (breathingSphereSystemEnabled) {
  breathingSphereSystem(world, delta);
}
```

---

## Example 2: Inverse Particle Orbit (Phase-Based)

Particles move opposite to sphere: contract when sphere expands.

**File: `src/entities/particle/systems.tsx` (simplified)**
```typescript
import type { World } from 'koota';
import { BreathPhase } from '../breath/traits';
import { ParticleTrait, ParticleState } from './traits';

/**
 * Particle Physics System
 *
 * Inverse synchronization:
 * - Sphere large (breathPhase=1) → Particles close (orbitRadius=1.2)
 * - Sphere small (breathPhase=0) → Particles far (orbitRadius=2.8)
 */
export function particlePhysicsSystem(world: World) {
  // Get global breath state
  const breathQuery = world.query([BreathPhase]);
  if (breathQuery.length === 0) return;

  const [_, breath] = breathQuery[0];

  // Update each particle position
  const entities = world.query([ParticleTrait, ParticleState]);

  entities.forEach((entity) => {
    const particle = entity.get(ParticleTrait);
    const state = entity.get(ParticleState);

    if (!particle || !state) return;

    // Use breath orbit radius (automatically inverse)
    const radius = breath.orbitRadius;  // 1.2-2.8

    // Calculate position on sphere orbit
    const angle = state.angle;  // Per-particle rotation
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    // Update position
    entity.set(ParticleState, {
      ...state,
      x,
      z,
      // y remains 0 (particles on equator)
    });
  });
}
```

**Key insight:** `breathOrbitRadius` is automatically inverse to `sphereScale`, so particles naturally contract/expand opposite to sphere.

---

## Example 3: Phase-Specific Color (Conditional Logic)

Different colors for each phase - brightest on inhale, calmest on exhale.

**File: custom color system**
```typescript
import { calculateBreathState } from '@/lib/breathCalc';

export function getBreathColor(): string {
  const breath = calculateBreathState(Date.now());

  switch (breath.phaseType) {
    case 0: // INHALE - Active, energetic
      // Bright blue, intensifying
      const inhaleIntensity = breath.easedProgress;
      const inhaleBrightness = 200 + inhaleIntensity * 55;
      return `hsl(220, 100%, ${inhaleBrightness / 255 * 100}%)`;

    case 1: // HOLD-IN - Still, crystallized
      // White with increasing crystallization
      const holdInAlpha = 0.5 + breath.crystallization * 0.5;
      return `rgba(255, 255, 255, ${holdInAlpha})`;

    case 2: // EXHALE - Calming, gentle
      // Soft cyan
      const exhaleIntensity = 1 - breath.easedProgress;
      return `hsl(190, 80%, ${40 + exhaleIntensity * 20}%)`;

    case 3: // HOLD-OUT - Deep stillness
      // Very pale white
      const holdOutAlpha = 0.3 + breath.crystallization * 0.4;
      return `rgba(255, 255, 255, ${holdOutAlpha})`;

    default:
      return '#ffffff';
  }
}
```

**Usage in component:**
```typescript
useFrame(() => {
  const color = getBreathColor();
  material.color.setStyle(color);
});
```

---

## Example 4: Crystallization Effect (Shader Parameter)

Stillness effect during hold phases using shader parameter.

**File: shader-based component**
```typescript
import { calculateBreathState } from '@/lib/breathCalc';

export function getCrystallizationEffect(): {
  opacity: number;
  blur: number;
  particleOpacity: number;
} {
  const breath = calculateBreathState(Date.now());
  const crystal = breath.crystallization;  // 0-1

  // During active phases (inhale/exhale), crystallization is 0
  // During hold phases, crystallization ramps from 0.4-0.75

  return {
    // Opacity increases during holds (crystallization)
    opacity: 0.5 + crystal * 0.5,  // 0.5 → 1.0

    // Blur increases during holds
    blur: crystal > 0 ? crystal * 5 : 0,  // 0 → 5px

    // Particles fade slightly during holds
    particleOpacity: 1 - crystal * 0.3,  // 1.0 → 0.7
  };
}
```

**In Fragment Shader:**
```glsl
void main() {
  vec3 color = texture(sampler, vUv).rgb;

  // Apply crystallization blur and opacity
  color = mix(color, vec3(1.0), u_crystallization * 0.3);

  gl_FragColor = vec4(color, u_opacity);
}
```

---

## Example 5: Multi-Property Synchronization

Update multiple properties from single breath calculation.

**File: complex system**
```typescript
import type { World } from 'koota';
import { calculateBreathState } from '@/lib/breathCalc';
import { MyTrait, MyVisualState } from './traits';

export function myComplexSystem(world: World) {
  const breath = calculateBreathState(Date.now());
  const entities = world.query([MyTrait, MyVisualState]);

  entities.forEach((entity) => {
    const trait = entity.get(MyTrait);
    if (!trait) return;

    // Calculate multiple outputs from single breath state
    const scale = 1 + breath.breathPhase * 0.5;              // Expand/contract
    const rotation = breath.breathPhase * Math.PI * 2;       // Spin with breathing
    const emission = 100 * (1 - breath.breathPhase);         // Inverse emission
    const glow = 0.3 + breath.easedProgress * 0.7;           // Smooth glow
    const opacity = 0.5 + breath.crystallization * 0.5;      // Crystallization

    // Update all at once
    entity.set(MyVisualState, {
      scale,
      rotation,
      emission,
      glow,
      opacity,
    });
  });
}
```

---

## Real-World Locations

In breathe-together-v2 codebase:

- `src/entities/breath/systems.tsx` - Core breathSystem (Phase 1)
- `src/entities/breathingSphere/systems.tsx` - Sphere scaling example
- `src/entities/particle/systems.tsx` - Inverse orbit sync
- `src/lib/breathCalc.ts` - Pure calculation function
- `test-breath-calc.js` - Synchronization validation

---

## Testing Your Implementation

### 1. Verify Sync Across Time
```typescript
// Should all return same breathPhase
const now = Date.now();
const state1 = calculateBreathState(now);
const state2 = calculateBreathState(now);
const state3 = calculateBreathState(now);

console.log(
  state1.breathPhase === state2.breathPhase &&
  state2.breathPhase === state3.breathPhase
);  // true
```

### 2. Verify Phase Sequence
```typescript
// Check phase progression over 16 seconds
for (let t = 0; t <= 16000; t += 1000) {
  const state = calculateBreathState(t);
  console.log(`t=${t}ms: phase=${state.phaseType}, breathPhase=${state.breathPhase.toFixed(2)}`);
}

// Should see:
// t=0ms:     phase=0, breathPhase=0.00 (exhaled)
// t=4000ms:  phase=1, breathPhase=1.00 (inhaled)
// t=8000ms:  phase=2, breathPhase=1.00 (still inhaled)
// t=12000ms: phase=3, breathPhase=0.00 (exhaled)
// t=16000ms: phase=0, breathPhase=0.00 (cycle repeats)
```

### 3. Verify Inverse Motion
```typescript
const breath = calculateBreathState(Date.now());

const sphereScale = breath.sphereScale;
const particleRadius = breath.orbitRadius;

// At inhale (breathPhase=1):
// sphereScale should be ~1.4 (large)
// orbitRadius should be ~1.2 (small) - INVERSE

// At exhale (breathPhase=0):
// sphereScale should be ~0.6 (small)
// orbitRadius should be ~2.8 (large) - INVERSE

console.assert(
  (breathPhase > 0.5)
    ? (sphereScale > 1 && particleRadius < 2)
    : (sphereScale < 1 && particleRadius > 2)
);
```

---

## Common Mistakes

❌ **Wrong:** Using local time instead of UTC
```typescript
// DON'T do this
const cyclePos = new Date().getTime() % 16000;  // Uses local milliseconds
```

✅ **Right:** Using UTC time
```typescript
const cyclePos = Date.now() % 16000;  // Uses UTC
```

---

❌ **Wrong:** Recalculating breath in every property assignment
```typescript
const breath1 = calculateBreathState(Date.now());
const breath2 = calculateBreathState(Date.now());  // Slight time difference!

// breath1 and breath2 might differ slightly
```

✅ **Right:** Calculate once, use multiple times
```typescript
const breath = calculateBreathState(Date.now());
const scale = 1 + breath.breathPhase * 0.5;
const rotation = breath.breathPhase * Math.PI;
const opacity = 0.5 + breath.crystallization * 0.5;
```

---

## Next Steps

1. Pick a property to synchronize (scale, color, position, etc.)
2. Choose direct or inverse mapping
3. Implement in system or component
4. Test with other users (if available)
5. Verify all see same phase at same time

See [reference.md](reference.md) for complete API and [patterns.md](patterns.md) for more patterns.

Let's synchronize globally! 🌍
