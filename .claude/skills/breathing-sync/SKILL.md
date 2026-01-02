---
name: breathing-sync
description: Create and validate breathing-synchronized features for breathe-together-v2. Mode 1 creates visual features responding to UTC-based global breathing cycle (inhale/hold/exhale/hold). Mode 2 validates and debugs why entities aren't responding visibly to breathing synchronization. Includes integration patterns, ECS trait querying, system registration, damping/easing, and systematic 8-point validation.
allowed-tools: [Read, Write, Edit, Glob, Grep, Bash(npm run dev:*), mcp__context7__*]
---

# Breath Synchronization Skill

Create and debug breathing-synchronized visual features for breathe-together-v2.

## Mode Selection

Choose your workflow:

- **[Mode 1: Create Breath-Synchronized Features](#mode-1-create)** — Build new entities/effects that respond to breathing
- **[Mode 2: Validate & Debug Breathing Synchronization](#mode-2-validate)** — Diagnose why entities aren't responding visibly

---

## Mode 1: Create Breath-Synchronized Features {#mode-1-create}

Create visual features that respond to the global UTC-based breathing cycle.

**Use this when:**
- Building a new component that should animate with breathing
- Adding particle effects, mesh animations, shader parameters, color transitions
- Integrating position/scale/opacity changes synced to breathing phases
- Creating phase-specific behaviors (inhale vs. exhale)

### Quick Start Interview

**1. Feature Type:** What are you creating?
- Visual effect (particles, glow, trails)
- Entity animation (size/scale/position)
- Shader effect (fresnel, crystallization)
- Color transition or gradient

**2. Breathing Response:** What should happen during **INHALE** (0-4s)?
- Size increases/decreases
- Position moves inward/outward
- Color shifts toward specific color
- Opacity changes
- Shader parameter adjusts

**3. Phase-Specific Behavior:** Any special behavior during **HOLD-IN** (4-11s)?
- Subtle micro-movement (damped oscillation)
- Reduced motion
- Color change
- No special behavior

### Core Concepts

See [Core Concepts Reference](../../reference/core-concepts.md) for:
- 19-second UTC breathing cycle (4-7-8 relaxation breathing)
- breathPhase 0-1 interpretation
- Phase types 0-3
- Phase-specific easing functions (easeInhale, easeExhale, damped oscillation)

### Integration Patterns

#### Pattern 1: Direct Calculation (Simplest)

Use `calculateBreathState()` directly in your system:

```typescript
import { calculateBreathState } from '@/lib/breathCalc';

export function mySystem(world: World, delta: number) {
  const entities = world.query([MyTrait]);
  const breathState = calculateBreathState(Date.now());

  entities.forEach((entity) => {
    const current = entity.get(MyTrait);

    // Use breathPhase (0-1) for scaling
    const scale = 1.0 + breathState.breathPhase * 0.5;

    // Use phaseType for logic
    if (breathState.phaseType === 0) {
      // INHALE phase
    } else if (breathState.phaseType === 2) {
      // EXHALE phase
    }

    entity.set(MyTrait, { ...current, scale });
  });
}
```

**Pros:** Simple, pure function, no dependencies
**Cons:** Recalculates every frame (negligible cost)

#### Pattern 2: Query Breath Trait (Recommended)

Query the global breath state from ECS:

```typescript
import { breathPhase, orbitRadius, sphereScale, crystallization } from '@/entities/breath/traits';

export function mySystem(world: World, delta: number) {
  // Get global breath state (updated by breathSystem in Phase 1)
  const breathEntity = world.queryFirst(breathPhase);
  if (!breathEntity) return;  // Not spawned yet

  const breath = breathEntity.get(breathPhase);
  const phase = breath.value;  // 0.0 - 1.0

  // Now use breath data in your logic
  const entities = world.query([MyTrait]);
  entities.forEach((entity) => {
    const scale = 1.0 + phase * 0.3;
    entity.set(MyTrait, { ...current, scale });
  });
}
```

**Pros:** Efficient (breath state pre-calculated), works with easing/damping
**Cons:** Requires ECS understanding

### Damping for Smooth Transitions

Use `easing.damp` from maath for smooth animations:

```typescript
import { easing } from 'maath';

// In your system (inside useFrame or system function)
DAMP_CONFIG.forEach(({ trait, targetTrait, speed }) => {
  const current = entity.get(trait);
  const target = entity.get(targetTrait);

  if (current && target) {
    const temp = { value: current.value };
    easing.damp(temp, 'value', target.value, speed, delta);
    entity.set(trait, { value: temp.value });
  }
});
```

**Speed Guide:**
- 0.1 (166ms): Very smooth, disconnected feel
- 0.2 (83ms): Balanced
- 0.3-0.5 (30-55ms): Responsive, recommended
- 1.0 (instant): Jerky, avoid

### Phase-Specific Behavior

Handle different behaviors for each breathing phase:

```typescript
const { phaseType } = breathEntity.get(phaseType);

switch (phaseType) {
  case 0: // INHALE: active inhalation (0-4s)
    // Move particles inward, expand sphere, accelerate
    break;
  case 1: // HOLD-IN: hold after inhale (4-8s)
    // Increase crystallization, reduce motion, stillness effect
    break;
  case 2: // EXHALE: active exhalation (8-12s)
    // Move particles outward, contract sphere, accelerate
    break;
  case 3: // HOLD-OUT: hold after exhale (12-16s)
    // Deep stillness, maximum crystallization
    break;
}
```

### System Registration

Register your system in `src/providers.tsx`:

```typescript
// In KootaSystems component
if (myFeatureEnabled) {
  mySystem(world, delta, deltaInFrameTime);  // Phase 2 or later (MUST be after Phase 1)
}
```

**Critical:** Must run AFTER `breathSystem` (Phase 1).

### Validation Checklist

When creating a breathing feature:

- [ ] **Integration:** Entity spawns, trait attached, system registered
- [ ] **Queries:** System queries breathPhase or related traits
- [ ] **Visibility:** Parameter change >20% for clear feedback
- [ ] **Smoothness:** Animation smooth at 60fps (no jitter)
- [ ] **Phase behavior:** Tested all 4 phases (inhale/hold-in/exhale/hold-out)
- [ ] **Easing:** Using easing.damp for smooth transitions
- [ ] **Performance:** DevTools shows 60fps, no memory leaks

---

## Mode 2: Validate & Debug Breathing Synchronization {#mode-2-validate}

Diagnose why an entity isn't responding visibly to breathing synchronization.

**Use this when:**
- An entity is supposed to animate but appears static
- Visual response is too subtle (barely perceptible)
- Response is jerky, delayed, or backwards
- Integrating a new breathing-synchronized entity
- After making fixes, confirming everything still works

### 8-Point Validation Checks

#### ✅ Check 1: Breath Entity Spawned

**File:** `src/app.tsx`, `src/levels/breathing.tsx`, or your scene component

**What to look for:**
```tsx
<BreathEntity />
```

**Why:** Without BreathEntity, no global breath state exists.

**If failing:**
1. Open your scene component (likely `src/levels/breathing.tsx`)
2. Add `<BreathEntity />` to the component tree
3. Verify inside `<KootaWorld>`

---

#### ✅ Check 2: Breath System Registered & Enabled

**File:** `src/providers.tsx` (lines 49-120, `KootaSystems` component)

**What to look for:**
```typescript
if (breathSystemEnabled) {
  breathSystem(world, delta);  // MUST be Phase 1 first
}
```

**Why:** breathSystem computes breathPhase, orbitRadius, sphereScale that all other systems depend on.

**If failing:**
1. Open `src/providers.tsx`
2. Verify `breathSystem` runs first (Phase 1)
3. Verify `breathSystemEnabled` is true
4. NEVER reorder phases

---

#### ✅ Check 3: Entity Queries Breath Traits

**File:** `src/entities/[yourEntity]/systems.tsx`

**What to look for:**
Your system should query at least one breath trait:
- `breathPhase` — Position within phase (0-1)
- `orbitRadius` — Particle orbit distance
- `sphereScale` — Central sphere size
- `crystallization` — Stillness effect

**Example:**
```typescript
const breathEntity = world.queryFirst(breathPhase);
if (!breathEntity) return;

const breath = breathEntity.get(breathPhase);
// Use breath.value
```

**If failing:**
1. Add breath trait query to your system
2. Read the trait value
3. Use it in calculations

---

#### ✅ Check 4: Entity System Registered & Enabled

**File:** `src/providers.tsx` (lines 49-120, `KootaSystems` component)

**What to look for:**
Your entity's system should be registered AFTER breathSystem:

```typescript
// Phase 1: breathSystem (first)
if (breathSystemEnabled) {
  breathSystem(world, delta);
}

// Phase 2+: Your entity system (later)
if (myEntityEnabled) {
  myEntitySystem(world, delta);
}
```

**If failing:**
1. Add system call to KootaSystems
2. Place AFTER breathSystem
3. Wrap with enabled condition

---

#### ✅ Check 5: Visual Parameter Ranges Adequate

**What to check:**
Parameters affecting visibility should have >20% variation.

**How to test:**
```
If breathPhase goes 0 → 1:
  Old: scale = 1.0 + breathPhase * 0.1  (±10%, barely visible)
  New: scale = 1.0 + breathPhase * 0.3  (±30%, clearly visible)
```

**Visibility threshold:** <20% = invisible, 20-30% = clear, >50% = exaggerated

**If failing:**
1. Find the multiplier (0.1 in example above)
2. Increase to 0.3-0.5
3. Re-test all 4 breathing phases

---

#### ✅ Check 6: Damping Constants Responsive

**What to check:**
Damping speed should be >0.2 for responsive feel.

**How to test:**
```
If speed = 0.1 → 166ms lag (feels disconnected)
If speed = 0.3 → 55ms lag (responsive, good)
```

**Damping equation:** `lag = -log(0.37) / speed ≈ 100 / speed` ms

**If failing:**
1. Find damping speed in system (usually 0.1)
2. Increase to 0.2-0.3
3. Test responsiveness

---

#### ✅ Check 7: Adaptive Quality Not Disabling Entity

**File:** Check for quality-level-based disabling

**If failing:**
1. Find quality checks in system
2. Ensure entity updates at all quality levels (optional: reduce quality of effect, not disable it)
3. Test with different quality settings

---

#### ✅ Check 8: Updates Every Frame

**File:** Your entity's system

**What to look for:**
System should update every frame:
- No `if (frame % 10 === 0)` conditions
- No `return` statements that skip updates
- System enabled flag is true

**If failing:**
1. Remove any frame-skipping logic
2. Verify enabled condition
3. Confirm system runs every frame

---

### Phase-by-Phase Validation

After passing 8 checks, test all 4 breathing phases:

**INHALE (0-4s):** breathPhase 0 → 1
- Entity contracts/shrinks? ✓
- Motion smooth and accelerates? ✓
- No jitter? ✓

**HOLD-IN (4-8s):** breathPhase ~1, crystallization 0.5 → 0.9
- Entity stays contracted? ✓
- Stillness effect visible? ✓
- Motion reduced? ✓

**EXHALE (8-12s):** breathPhase 1 → 0
- Entity expands/grows? ✓
- Motion mirrors INHALE? ✓
- Smooth transition? ✓

**HOLD-OUT (12-16s):** breathPhase ~0, crystallization 0.4 → 0.75
- Entity stays expanded? ✓
- Deep stillness visible? ✓

### Performance Validation

Run `npm run dev` and check:

- [ ] **FPS:** DevTools shows 60fps maintained
- [ ] **Memory:** Stable, no growing allocations
- [ ] **Draw calls:** Unchanged (or improved)
- [ ] **Console:** No new errors/warnings
- [ ] **Triplex:** Visual editor still works

### Validation Report Template

Document findings:

```
Entity: [Name]
Problem: [What was wrong]

Check Results:
✅ 1. Breath entity spawned
✅ 2. breathSystem enabled
✅ 3. Queries breathPhase
✅ 4. System registered
✅ 5. Visual range adequate (30% variation)
✅ 6. Damping responsive (0.3 speed)
✅ 7. Quality setting not disabling
✅ 8. Updates every frame

Phase Testing:
✅ INHALE: Smooth contraction
✅ HOLD-IN: Stillness visible
✅ EXHALE: Smooth expansion
✅ HOLD-OUT: Deep stillness

Performance:
✅ 60fps maintained
✅ Memory stable
✅ Draw calls: 2 (unchanged)
✅ No console errors

Conclusion: [Summary of validation result]
```

---

## Integration with Other Skills

### Relationship to fix-application
Use **Mode 2: Validate** when applying fixes from the [fix-application skill](../fix-application/SKILL.md) to confirm fixes work correctly.

### Relationship to ecs-entity
Use **Mode 1: Create** after creating new entities with the [ecs-entity skill](../ecs-entity/SKILL.md) to add breathing synchronization.

### Relationship to kaizen-improvement
Use **Mode 2: Validate** during [kaizen-improvement workflow](../workflows/kaizen-improvement/WORKFLOW.md) to verify optimizations maintain breathing synchronization.

---

## Reference Materials

- [Core Concepts Reference](../../reference/core-concepts.md) — Breathing cycle, breathPhase, phase types, easing
- [ECS Architecture Reference](../../reference/ecs-architecture.md) — System order, trait patterns, queries
- [Best Practices Reference](../../reference/best-practices.md) — R3F, ECS, Three.js patterns
- [examples.md](examples.md) — Real breathing-synchronized features
- [patterns.md](patterns.md) — Common synchronization patterns
- [reference.md](reference.md) — Detailed breathing concepts

---

Let's synchronize with the breath! 🫁
