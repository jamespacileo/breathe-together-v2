# Breath Synchronization Patterns Catalog

Common synchronization approaches and when to use each.

---

## Pattern 1: Direct Phase Mapping

**When:** Single property that smoothly varies with breathing

**Implementation:**
```typescript
const breathState = calculateBreathState(Date.now());
const value = min + breathState.breathPhase * (max - min);
```

**Examples:**
- Sphere scale: 0.6 → 1.4
- Particle orbit: 1.8 → 3.5
- Opacity: 0.3 → 1.0
- Glow intensity: 0.3 → 1.5

**Pros:** Simple, smooth, natural
**Cons:** Same speed all phases (no acceleration)

---

## Pattern 2: Inverse Motion

**When:** Two systems move opposite (particles ↔ sphere)

**Implementation:**
```typescript
const sphere_scale = 0.6 + breathState.breathPhase * 0.8;      // 0.6-1.4
const particle_radius = 3.5 - breathState.breathPhase * 1.7;   // 3.5-1.8
```

**Characteristics:**
- When sphere large (1.4), particles close (1.8)
- When sphere small (0.6), particles far (3.5)
- Creates balanced, meditative effect

**Pros:** Visually balanced, creates focus/expansion rhythm
**Cons:** Requires careful value selection

---

## Pattern 3: Phase-Specific Logic

**When:** Different behavior for each phase (inhale ≠ exhale)

**Implementation:**
```typescript
switch (breathState.phaseType) {
  case 0: // INHALE
    // Active expansion
    break;
  case 1: // HOLD-IN
    // Transition to stillness
    break;
  case 2: // EXHALE
    // Active contraction
    break;
  case 3: // HOLD-OUT
    // Deep stillness
    break;
}
```

**Examples:**
- Color changes per phase
- Emission rates per phase
- Different animations per phase
- Phase-specific sound effects

**Pros:** Detailed control, matches breathing experience
**Cons:** More complexity, must handle transitions

---

## Pattern 4: Eased vs Raw Progress

**When:** Need smooth acceleration/deceleration

**Smooth (Eased):**
```typescript
const value = min + breathState.easedProgress * range;
```

**Linear (Raw):**
```typescript
const value = min + breathState.rawProgress * range;
```

**Characteristics:**
- **Eased:** Feels natural, accelerates/decelerates
- **Raw:** Linear, predictable, mechanical

**Pros (Eased):** Natural breathing motion
**Cons:** More computation (negligible)

---

## Pattern 5: Crystallization Effect

**When:** Enhance stillness during hold phases

**Implementation:**
```typescript
const crystallization = breathState.crystallization;  // 0-1 during holds

if (crystallization > 0) {
  // Apply stillness effect
  opacity = 0.5 + crystallization * 0.5;  // Fade during holds
  blur = crystallization * 5;              // Blur during holds
  scale = scale * (1 - crystallization * 0.1);  // Slightly shrink
}
```

**Examples:**
- Particle fadeout during holds
- Shader blur effect during holds
- Opacity changes during holds

**Pros:** Adds meditation depth, emphasizes breath pauses
**Cons:** Uses additional parameter

---

## Pattern 6: Time-Based Offset

**When:** Multiple entities phase-offset for visual interest

**Implementation:**
```typescript
export function offsetBreathState(timeMs: number, delayMs: number): BreathState {
  // Shift breath state by delay (in phase units)
  const shiftedTime = timeMs - delayMs;
  return calculateBreathState(shiftedTime);
}

// Usage:
const particle1 = calculateBreathState(Date.now());              // No offset
const particle2 = calculateBreathState(Date.now() - 1000);       // 1s behind
const particle3 = calculateBreathState(Date.now() - 2000);       // 2s behind
```

**Characteristics:**
- Creates wave pattern across particles
- All synchronized but staggered
- Still globally sync (same phase offset everywhere)

**Pros:** Visual interest, group choreography
**Cons:** More complex to manage

---

## Pattern 7: Perlin Noise + Breath

**When:** Organic variation + synchronization

**Implementation:**
```typescript
import { createNoise3D } from 'simplex-noise';

const noise = createNoise3D();
const breathState = calculateBreathState(Date.now());

// Combine noise for organic variation
const noise_value = noise(
  Date.now() * 0.001,  // Time input
  breath.breathPhase * 10,  // Breath phase input
  0
);

const final_value = 0.5 * breathState.breathPhase + 0.5 * noise_value;
```

**Characteristics:**
- Synchronized breathing
- Organic variation within sync
- Still globally deterministic

**Pros:** Natural complexity, still synchronized
**Cons:** Adds noise calculation cost

---

## Pattern 8: Multi-Property Sync

**When:** Update 5+ properties from breath state

**Implementation:**
```typescript
export interface BreathSyncState {
  scale: number;
  rotation: number;
  opacity: number;
  emission: number;
  glow: number;
}

export function calculateBreathSync(timeMs: number): BreathSyncState {
  const breath = calculateBreathState(timeMs);

  return {
    scale: 1 + breath.breathPhase * 0.5,
    rotation: breath.breathPhase * Math.PI * 2,
    opacity: 0.5 + breath.crystallization * 0.5,
    emission: 100 * (1 - breath.breathPhase),
    glow: 0.3 + breath.easedProgress * 0.7,
  };
}

// Usage:
const sync = calculateBreathSync(Date.now());
entity.scale.copy(new Vector3(sync.scale, sync.scale, sync.scale));
entity.rotation.z = sync.rotation;
material.opacity = sync.opacity;
// etc.
```

**Pros:** Organized, reusable, single calculation
**Cons:** Slightly more setup

---

## Pattern 9: Quality-Dependent Sync

**When:** Different sync ranges for low/medium/high quality

**Implementation:**
```typescript
const quality = useQuality();  // 'low' | 'medium' | 'high'

const range = {
  low: 0.2,      // Scale 1.0-1.2
  medium: 0.5,   // Scale 1.0-1.5
  high: 1.0,     // Scale 1.0-2.0
}[quality];

const scale = 1 + breathState.breathPhase * range;
```

**Characteristics:**
- More dramatic effects on high quality
- Subtle effects on low quality
- Still synchronized globally

**Pros:** Performance scaling without breaking sync
**Cons:** Different visual experience per quality

---

## Pattern 10: Conditional Sync

**When:** Sync only when certain conditions met

**Implementation:**
```typescript
const breathState = calculateBreathState(Date.now());

// Only sync if enabled
if (props.breathSyncEnabled) {
  scale = 1 + breathState.breathPhase * 0.5;
} else {
  scale = 1;  // Static
}

// Only sync if visible
if (isVisible) {
  opacity = 0.5 + breathState.crystallization * 0.5;
} else {
  opacity = 0;  // Hidden regardless
}

// Only sync if not animating
if (!isAnimating) {
  position.y = breathState.breathPhase * 2;
} else {
  position.y = animationTarget.y;  // Other animation takes priority
}
```

**Pros:** Flexible, can override sync when needed
**Cons:** Must manage state carefully

---

## Pattern Selection Guide

| Want to... | Use Pattern | Reason |
|-----------|-----------|--------|
| Expand/contract with breath | Direct Phase Mapping | Simple, natural |
| Balance two elements | Inverse Motion | Visual harmony |
| Different actions per phase | Phase-Specific Logic | Maximum control |
| Smooth motion | Eased Progress | Natural feel |
| Emphasize stillness | Crystallization | Meditation depth |
| Visual variety | Time-Based Offset | Group choreography |
| Organic feel | Perlin Noise + Breath | Natural complexity |
| Many properties | Multi-Property Sync | Organization |
| Scale visuals | Quality-Dependent | Performance scaling |
| Override behavior | Conditional Sync | Flexibility |

---

## Combining Patterns

**Example 1: Direct Mapping + Crystallization**
```typescript
const breathState = calculateBreathState(Date.now());

// Direct scale mapping
const baseScale = 1 + breathState.breathPhase * 0.5;

// Add crystallization effect
const crystal = breathState.crystallization;
const finalScale = baseScale * (1 - crystal * 0.1);  // Slightly shrink during holds

return finalScale;
```

**Example 2: Phase-Specific + Eased Progress**
```typescript
switch (breathState.phaseType) {
  case 0: // INHALE - Accelerating
    color = interpolate(startColor, inhaleColor, breathState.easedProgress);
    break;
  case 2: // EXHALE - Different easing
    color = interpolate(inhaleColor, exhaleColor, breathState.easedProgress);
    break;
}
```

**Example 3: Multi-Property + Quality-Dependent**
```typescript
const quality = useQuality();
const range = { low: 0.3, medium: 0.5, high: 1.0 }[quality];

return {
  scale: 1 + breathState.breathPhase * (range * 0.5),
  rotation: breathState.breathPhase * Math.PI * (range * 2),
  opacity: 0.5 + breathState.crystallization * (range * 0.5),
};
```

---

## Performance Considerations

All patterns are fast:
- **breathCalc** < 1ms per call
- **Switch statements** < 0.01ms
- **Math operations** < 0.01ms
- **Total overhead** < 1ms per 100 entities

Safe to use extensively without performance concerns.

---

## Testing Patterns

```typescript
// Verify pattern produces expected values
function testPattern(pattern: string, timePoints: number[]) {
  timePoints.forEach((ms) => {
    const result = applyPattern(pattern, ms);
    console.log(`Pattern ${pattern} at ${ms}ms: ${result}`);
  });
}

testPattern('direct-mapping', [0, 4000, 8000, 12000, 16000]);
testPattern('inverse-motion', [0, 4000, 8000, 12000, 16000]);
testPattern('phase-specific', [2000, 6000, 10000, 14000]);
```

---

See [examples.md](examples.md) for real implementation code for each pattern.
