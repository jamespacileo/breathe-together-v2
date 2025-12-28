# Core Concepts Reference

Fundamental concepts shared across all Claude skills. These are the building blocks for understanding breathe-together-v2 architecture.

---

## UTC-Based Global Breathing Synchronization

### The 16-Second Cycle

All users worldwide breathe together using the same **16-second box breathing pattern**, synchronized via UTC time:

```
0-4s:   INHALE   (breathPhase: 0 → 1)
4-8s:   HOLD-IN  (breathPhase: 1.0)
8-12s:  EXHALE   (breathPhase: 1 → 0)
12-16s: HOLD-OUT (breathPhase: 0.0)
```

**Key Implementation:**
```typescript
const elapsed = (Date.now() / 1000) % BREATH_TOTAL_CYCLE;
// All users at same elapsed time = synchronized breathing
```

**Why UTC?** No server coordination needed. Every device calculates the same breath state independently.

---

## breathPhase: The Core Value

**breathPhase** is the normalized position within the current cycle phase:

| Value | Meaning | Visual |
|-------|---------|--------|
| 0.0 | Start of phase (exhale complete, or hold just starting) | Particles expanded, sphere small |
| 0.5 | Middle of phase | Mid-transition |
| 1.0 | End of phase (fully inhaled, or hold complete) | Particles contracted, sphere large |

**Usage:**
```typescript
// In any system, read breathPhase from breathEntity
const breath = breathEntity.get(breathPhase);
const phase = breath.value;  // 0.0 - 1.0

// Scale effect: shrink on inhale
const scale = 1.0 + phase * 0.5;  // 1.0 → 1.5 during exhale
```

---

## Phase Types (0-3)

Four discrete phases in the breathing cycle:

```typescript
enum PhaseType {
  INHALE = 0,    // 0-4s: Active inhalation
  HOLD_IN = 1,   // 4-8s: Hold after inhale
  EXHALE = 2,    // 8-12s: Active exhalation
  HOLD_OUT = 3   // 12-16s: Hold after exhale
}
```

**How to use:**
```typescript
const { phaseType } = breathEntity.get(phaseType);

switch (phaseType) {
  case 0: // INHALE - particles moving inward
  case 1: // HOLD_IN - crystallization increasing
  case 2: // EXHALE - particles moving outward
  case 3: // HOLD_OUT - deep stillness
}
```

---

## Associated Breath Values

The breathing system calculates these alongside breathPhase:

### orbitRadius
**Range:** 1.8 (inhale) → 3.5 (exhale)
- Controls how far particles orbit from center
- Inverse to breathPhase: shrinks during inhale, grows during exhale
- Used by particle physics system

### sphereScale
**Range:** 0.6 (inhale) → 1.4 (exhale)
- Central sphere size
- Inverse to breathPhase: expands while particles contract
- Creates visual harmony (expanding sphere, contracting particles)

### crystallization
**Range:** 0.4 - 0.9
- Shader parameter controlling particle movement smoothness
- Increases during hold phases (more stillness)
- Decreases during active inhalation/exhalation

---

## Easing Functions

Breath transitions use smooth easing for natural, meditation-appropriate motion:

### easeInOutQuad
The primary easing function for breath phase transitions:

```
0%:    ████░░░░░░  (slow start)
25%:   ██████░░░░  (accelerating)
50%:   ████████░░  (peak speed)
75%:   ██████░░░░  (decelerating)
100%:  ████████░░  (slow finish)
```

**Effect:** Breathing feels natural, not robotic or jerky.

### Damping with Easing

The `easing.damp` function (from maath) applies damping to smooth transitions:

```typescript
const currentValue = 0;
const targetValue = 1;
const speed = 0.3;  // 0.3 speed = ~55ms lag
easing.damp(object, 'value', targetValue, speed, deltaTime);
```

**Damping Speed Interpretation:**
- **0.1 (166ms lag):** Very smooth, but feels disconnected
- **0.2 (83ms lag):** Balanced, good for animations
- **0.3-0.5 (30-55ms lag):** Responsive, preferred for breathing
- **1.0 (no lag):** Instant, jerky—avoid

---

## Visual Parameter Visibility

When tuning parameters that affect visibility:

### Perception Threshold
- **<15% change:** Usually invisible
- **15-20% change:** Barely visible, unreliable
- **20-30% change:** Clearly visible ✅
- **30-50% change:** Obviously visible
- **>50% change:** May feel exaggerated

**Rule of thumb:** Target 20-30% parameter variation for clear visual feedback without overshooting.

### Example: Particle Pulse
```typescript
// Too subtle (10% = barely visible)
scale = 1.0 + breathPhase * 0.1;

// Good visibility (30% = clearly visible)
scale = 1.0 + breathPhase * 0.3;

// Exaggerated (50% = too bouncy)
scale = 1.0 + breathPhase * 0.5;
```

---

## Key Takeaways

1. **UTC Time** drives everything—no server coordination needed
2. **breathPhase (0-1)** is the core value; multiply it for effects
3. **Phase Types (0-3)** tell you *which* phase of breathing
4. **Damping** (easing.damp with speed) smooths transitions naturally
5. **Easing functions** (easeInOutQuad) ensure meditation-appropriate motion
6. **Visibility thresholds** matter: aim for 20-30% parameter change
7. **Crystallization** increases during holds for deeper stillness effect

---

## Integration Points

This reference is used by:
- [breath-synchronization skill](../skills/breath-synchronization/SKILL.md) - Creating/validating breathing features
- [ECS Architecture reference](./ecs-architecture.md) - Understanding breath system execution
- [fix-application skill](../skills/fix-application/SKILL.md) - Parameter tuning for breathing effects
- [kaizen-improvement workflow](../workflows/kaizen-improvement/WORKFLOW.md) - Optimizing breathing integration
