# Core Concepts Reference

Fundamental concepts shared across all Claude skills. These are the building blocks for understanding breathe-together-v2 architecture.

---

## UTC-Based Global Breathing Synchronization

### The 19-Second Cycle (4-7-8 Relaxation Breathing)

All users worldwide breathe together using the same **19-second 4-7-8 relaxation breathing pattern** (Dr. Andrew Weil's technique), synchronized via UTC time:

```
0-4s:   INHALE   (breathPhase: 0 → 1) - 4 seconds
4-11s:  HOLD-IN  (breathPhase: 1.0 with subtle oscillation) - 7 seconds
11-19s: EXHALE   (breathPhase: 1 → 0) - 8 seconds
(No HOLD-OUT - immediate transition to next inhale)
```

**Key Implementation:**
```typescript
const elapsed = (Date.now() / 1000) % BREATH_TOTAL_CYCLE;  // BREATH_TOTAL_CYCLE = 19
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
  INHALE = 0,    // 0-4s: Active inhalation (4 seconds)
  HOLD_IN = 1,   // 4-11s: Hold after inhale (7 seconds)
  EXHALE = 2,    // 11-19s: Active exhalation (8 seconds)
  HOLD_OUT = 3   // Not used in 4-7-8 pattern (0 seconds)
}
```

**How to use:**
```typescript
const { phaseType } = breathEntity.get(phaseType);

switch (phaseType) {
  case 0: // INHALE - particles moving inward
  case 1: // HOLD_IN - subtle oscillation for organic feel
  case 2: // EXHALE - particles moving outward
  case 3: // HOLD_OUT - not used in 4-7-8 pattern
}
```

---

## Associated Breath Values

The breathing system calculates these alongside breathPhase:

### orbitRadius
**Range:** 2.5 (inhale) → 6.0 (exhale)
- Controls how far particles orbit from center
- Inverse to breathPhase: shrinks during inhale, grows during exhale
- Used by ParticleSwarm component
- Defined in `VISUALS.PARTICLE_ORBIT_MIN` and `VISUALS.PARTICLE_ORBIT_MAX` in `src/constants.ts`

### rawProgress
**Range:** 0.0 → 1.0
- Raw progress within the current phase (before easing applied)
- Used by HUD for timer countdown and progress visualization
- Linear progression through each phase

**Note:** Previous versions had `sphereScale` and `crystallization` traits. These have been removed in the current architecture. Visual effects are now achieved through direct calculation based on `breathPhase`.

---

## Easing Functions

Breath transitions use phase-specific easing for natural, meditation-appropriate motion:

### easeInhale
Gentle acceleration for natural filling sensation (used during INHALE phase)

### easeExhale
Viscous damping for controlled release (used during EXHALE phase)

### Damped Harmonic Oscillator
During HOLD phases, subtle micro-movement is added using an underdamped harmonic oscillator:

```typescript
const dampedAmplitude = AMPLITUDE * Math.exp(-DAMPING * progress);
breathPhase = 1 - dampedAmplitude * Math.sin(progress * Math.PI * 2 * FREQUENCY);
```

**Effect:** Breathing feels natural and organic - nothing in nature is perfectly still. The subtle oscillation during holds creates a more lifelike experience.

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
2. **19-second 4-7-8 cycle** (4s inhale, 7s hold, 8s exhale, 0s hold-out)
3. **breathPhase (0-1)** is the core value; multiply it for effects
4. **Phase Types (0-3)** tell you *which* phase of breathing
5. **Phase-specific easing** (easeInhale, easeExhale, damped oscillation) creates natural motion
6. **Damping** (easing.damp with speed) smooths transitions naturally
7. **Visibility thresholds** matter: aim for 20-30% parameter change
8. **Subtle oscillation** during holds creates organic feel (damped harmonic oscillator)

---

## Integration Points

This reference is used by:
- [breath-synchronization skill](../skills/breath-synchronization/SKILL.md) - Creating/validating breathing features
- [ECS Architecture reference](./ecs-architecture.md) - Understanding breath system execution
- [fix-application skill](../skills/fix-application/SKILL.md) - Parameter tuning for breathing effects
- [kaizen-improvement workflow](../workflows/kaizen-improvement/WORKFLOW.md) - Optimizing breathing integration
