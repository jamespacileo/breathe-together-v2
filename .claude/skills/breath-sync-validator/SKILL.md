---
name: breath-sync-validator
description: Validate and debug breathing synchronization for any entity in breathe-together-v2. Performs systematic checks across the 4 breathing phases (inhale/hold-in/exhale/hold-out) to identify why an entity might not be responding visibly to the global UTC-based breathing cycle. Checks ECS trait queries, system registration, visual parameter ranges, damping constants, and provides phase-by-phase behavior analysis. Works with any entity meant to be dynamically responsive to breathing (particles, meshes, shaders, animations, etc.).
allowed-tools: [Read, Grep, Glob, Bash(npm run dev:*)]
---

# Breath Sync Validator Skill

## Overview

This skill validates and debugs why an entity might not be visibly responding to the breathing synchronization cycle in breathe-together-v2.

**Use this when:**
- An entity is supposed to animate with breathing but appears static
- Visual response is too subtle (barely perceptible)
- Response is jerky or delayed
- Response is opposite what you expect
- You're integrating a new breathing-synchronized entity

**Expected output:** A detailed validation report identifying integration issues and specific recommendations with file:line references.

---

## Quick Start Interview

### 1. Entity Name
What entity are you validating? (e.g., "ParticleSystem", "CustomGlow", "BreathingSphere")

### 2. Problem Type
Which best describes the issue?
- **No visible response** — Entity doesn't animate with breathing at all
- **Subtle response** — Entity animates but changes are barely perceptible
- **Jerky/stuttering** — Animation is choppy or skips
- **Delayed response** — Animation lags behind breathing cycle
- **Opposite behavior** — Animates backwards (expands on exhale instead of inhale)

### 3. Expected Behavior
What should happen during **INHALE** (0-4s)?
- Size/scale should [increase/decrease/change]
- Position should [move inward/outward/upward]
- Color should [shift toward X color]
- [Other property] should [do something]

---

## Systematic Validation (8 Checks)

### ✅ Check 1: Breath Entity Spawned

**File to inspect:** `src/app.tsx`, `src/levels/breathing.tsx`, or your scene component

**What to look for:**
```tsx
// Should find somewhere:
<BreathEntity />
```

**Why:** Without `BreathEntity`, no global breath state exists for other systems to read.

**If missing:**
1. Open your scene component (likely `src/levels/breathing.tsx` or `src/app.tsx`)
2. Add `<BreathEntity />` to the component tree
3. Verify it's inside the same `<KootaWorld>` as your entity

**Reference:** `src/entities/breath/index.tsx` — BreathEntity component

---

### ✅ Check 2: Breath System Registered & Enabled

**File to inspect:** `src/providers.tsx` (lines 49-120, inside `KootaSystems` component)

**What to look for:**
```typescript
// Should find around line 63:
if (breathSystemEnabled) {
  breathSystem(world, delta);  // ← MUST RUN FIRST
}
```

**Why:** `breathSystem` computes the global breath state (breathPhase, orbitRadius, sphereScale, crystallization) that all other systems depend on. It MUST run in Phase 1 (LOGIC phase).

**If missing or disabled:**
1. Open `src/providers.tsx`
2. Find `KootaSystems` component
3. Verify `breathSystem` is called in the LOGIC phase (first phase)
4. Verify `breathSystemEnabled` prop is true
5. Never reorder phases — system execution order is critical

**Reference:** `src/entities/breath/systems.tsx` — breathSystem function definition

---

### ✅ Check 3: Entity Queries Breath Traits

**File to inspect:** `src/entities/[yourEntity]/index.tsx` or `src/entities/[yourEntity]/systems.tsx`

**What to look for:**
Your entity's system should query at least one of:
- `breathPhase` — Position within current phase (0-1)
- `orbitRadius` — Particle orbit radius (inverse to sphere scale)
- `sphereScale` — Central sphere size
- `crystallization` — Stillness effect during holds

**Pattern 1: Direct calculation in component**
```typescript
import { calculateBreathState } from '@/lib/breathCalc';

useFrame(() => {
  const breathState = calculateBreathState(Date.now());
  // Use breathState.breathPhase, .phaseType, etc.
});
```

**Pattern 2: Query in ECS system**
```typescript
export function mySystem(world: World, delta: number) {
  // Query breath data
  const breathEntity = world.queryFirst(breathPhase, orbitRadius, sphereScale);
  if (!breathEntity) return;

  const breath = breathEntity.get(breathPhase);
  // Use breath.value or breath.targetValue

  // Query your entity
  const entities = world.query([MyTrait]);
  entities.forEach(entity => {
    // Use breath data to update entity
  });
}
```

**Why:** Your entity can't respond to breathing if it's not reading breath data.

**If missing:**
1. Open your entity's system file
2. Add query for breath traits
3. Use the breath data to calculate visual values
4. See `src/entities/particle/systems.tsx` for a complete example

**Reference:**
- `src/lib/breathCalc.ts` — calculateBreathState() function
- `src/entities/breath/traits.tsx` — BreathPhase trait definition

---

### ✅ Check 4: Entity System Registered & Enabled

**File to inspect:** `src/providers.tsx` (inside `KootaSystems` component)

**What to look for:**
```typescript
// Should find somewhere (usually Phase 2-6):
if (myEntitySystemEnabled) {
  myEntitySystem(world, delta);
}
```

**Why:** Without the system running each frame, breath data won't be applied to your entity.

**Phase guidelines:**
- **Phase 1 (LOGIC):** breathSystem only
- **Phase 2 (PHYSICS):** particlePhysicsSystem, velocity-based systems
- **Phase 3 (INPUT):** cursorPositionFromLand
- **Phase 4 (FORCES):** velocityTowardsTarget, acceleration systems
- **Phase 5 (INTEGRATION):** positionFromVelocity
- **Phase 6 (RENDER SYNC):** meshFromPosition, visual updates
- **Phase 7 (CAMERA):** cameraFollowFocused

**If missing or wrong phase:**
1. Find where your system is called in `KootaSystems`
2. Verify it's in the correct phase
3. Verify the enabled condition is true (or exists with correct name)
4. Systems in later phases have stale breath data — prefer early phases

**Reference:** `src/providers.tsx:49-120` — Complete system execution order

---

### ✅ Check 5: Visual Parameter Ranges

**File to inspect:** Entity config file or component props

**What to look for:**
Search for parameters that control visual intensity:

```typescript
// In particle config:
size: {
  base: 0.1,
  breathPulseIntensity: 0.3,  // ← Too low? (should be > 0.5)
}

// In mesh scaling:
const scale = 1 + breathState.breathPhase * 0.1;  // ← Too small? (should be 0.5+)

// In color shift:
const hue = 200 + breathState.breathPhase * 5;  // ← Too subtle? (should be 20+)
```

**Visibility thresholds:**
- **Pulse/scale intensity:** < 0.5 (50%) is usually invisible → aim for 1.0+
- **Orbit radius delta:** < 1.0 unit is subtle → aim for 1.5+
- **Opacity changes:** < 0.2 (20%) is barely visible → aim for 0.3+
- **Color shift:** < 20 hue degrees is subtle → aim for 30+

**If ranges are too small:**
1. Find the parameter definition
2. Increase the intensity/range
3. Test by running `npm run dev` and watching the entity during a breathing cycle
4. Aim for "clearly visible but not garish" — about 30-50% of max intensity

**Reference:**
- `src/entities/particle/config.ts` — Particle visual parameters
- `src/entities/breathingSphere/index.tsx` — Working scale example

---

### ✅ Check 6: Damping & Spring Constants

**File to inspect:** `src/entities/breath/systems.tsx` and any physics-related systems

**What to look for:**
Search for damping or spring speeds applied to breath-related traits:

```typescript
// In breathSystem damping:
{ trait: breathPhase, targetTrait: targetBreathPhase, speed: 0.1 },  // ← Too slow!
```

**Damping impact:**
- **speed: 0.05-0.1** — Very slow, heavily smoothed (hides visual response)
- **speed: 0.2-0.3** — Moderate, balanced smoothing
- **speed: 0.5+** — Fast, minimal smoothing (more responsive)

**Why high damping hides response:** A damping speed of 0.1 means it takes ~10 frames to reach the target. At 60fps, that's 166ms of lag — the entire breath phase is over.

**If damping is too high:**
1. Locate the damping configuration
2. Increase the speed value (0.1 → 0.3 → 0.5)
3. Test responsiveness — increased speed = faster visual response
4. Balance: too fast = jittery, too slow = invisible

**Note on physics damping:** Separate from breath damping. Check particle physics drag/damping too.

**Reference:**
- `src/entities/breath/systems.tsx` — breath phase damping
- `src/entities/particle/systems.tsx` — particle physics damping

---

### ✅ Check 7: Adaptive Quality Disabling

**File to inspect:** Your entity implementation or quality context

**What to look for:**
Check if adaptive quality might be disabling your entity in low-quality mode:

```typescript
// In ParticleSpawner (example):
active({ value: i < activeCount }),  // ← This might be 0 if activeCount is 0
```

**In QualityContext, check:**
- Low quality might reduce particle count to 0
- Low quality might disable complex visual effects
- Check what happens to `activeCount` in low quality

**If quality is disabling your entity:**
1. Open your entity component
2. Check for quality-based conditions
3. Temporarily override: `active({ value: true })` to test
4. If entity appears with override, quality is the issue
5. Adjust quality thresholds in `src/contexts/QualityContext.tsx`

**Reference:**
- `src/contexts/QualityContext.tsx` — Quality settings
- `src/components/QualitySettings.tsx` — Quality UI
- `src/entities/particle/index.tsx:ParticleSpawner` — Particle quality handling

---

### ✅ Check 8: Frame Update Frequency

**File to inspect:** Component (useFrame) or system (system loop)

**What to look for:**
Verify your entity updates every frame:

**In components:**
```typescript
useFrame(() => {
  // ← This runs every frame
  const breathState = calculateBreathState(Date.now());
  // Apply breathState to entity
});
```

**In systems:**
```typescript
export function mySystem(world: World, delta: number) {
  // ← This is called every frame by KootaSystems
  const entities = world.query([MyTrait]);
  entities.forEach(entity => {
    // Update entity
  });
}
```

**Common issues:**
- `useFrame` not used → entity only updates when props change
- System not registered → not called every frame
- Conditional update → skips frames under certain conditions

**If update frequency is wrong:**
1. Component-based: add `useFrame(() => { ... })`
2. System-based: verify system is registered in `KootaSystems`
3. Remove any frame-skipping conditions
4. Test: entity should animate smoothly every frame

**Reference:**
- `src/entities/particle/index.tsx:ParticleRenderer` — Good useFrame example
- `src/entities/particle/systems.tsx` — System-based update example

---

## Phase-by-Phase Behavior Analysis

For each breathing phase, verify your entity responds as expected.

### Phase 0: INHALE (0-4s)

**Time range:** 0-4000ms into 16-second cycle

**Expected breath state:**
```
breathPhase: 0 → 1 (progress from 0 to 100%)
phaseType: 0 (INHALE)
rawProgress: 0 → 1 (linear)
easedProgress: 0 → 1 (eased - fast start, slow end)
orbitRadius: 2.8 → 1.2 (particles contract)
sphereScale: 0.6 → 1.4 (sphere expands)
crystallization: 0 (no stillness effect)
```

**What your entity SHOULD do:**
- ✅ Size/scale increases (if using breathPhase directly)
- ✅ Position moves inward (if using orbitRadius - particles)
- ✅ Color shifts toward "inhale" color (if phaseType-based)
- ✅ Emission/glow increases (if using breathing)
- ✅ Movement is smooth and accelerates

**To verify:**
1. Run `npm run dev`
2. Watch your entity from 0-4s of the breathing cycle
3. You should see clear expansion or movement
4. If nothing visible: Check Checks 1-6 above

**Visual examples:**
- Sphere: grows from 0.6 to 1.4 scale (230% increase)
- Particles: move from 2.8 to 1.2 units from center (57% closer)
- Custom entity: your min→max range based on breathPhase

---

### Phase 1: HOLD-IN (4-8s)

**Time range:** 4000-8000ms into 16-second cycle

**Expected breath state:**
```
breathPhase: ~1.0 (stays at peak of inhale)
phaseType: 1 (HOLD-IN)
orbitRadius: ~1.2 (particles stay contracted)
sphereScale: ~1.4 (sphere stays expanded)
crystallization: 0.5 → 0.9 (increases during hold)
```

**What your entity SHOULD do:**
- ✅ Size/scale stays constant (or uses crystallization)
- ✅ Position stays constant (particles don't move)
- ✅ Movement velocity decreases (if damped by crystallization)
- ✅ Wind/turbulence reduces (calmer motion)
- ✅ Opacity/blur may increase (stillness effect)

**To verify:**
1. Watch your entity from 4-8s of the cycle
2. Should see less movement than INHALE phase
3. Should feel "held" or "still"
4. If entity still moving wildly: Check dampingconstants (Check 6)

**Crystallization effect:**
If your entity uses crystallization, apply like:
```typescript
const crystal = breathState.crystallization;
const opacity = 0.5 + crystal * 0.5;  // Fades during hold
const blur = crystal * 5;              // Blurs during hold
const jitter = 1 - crystal * 0.8;      // Jitter reduces
```

---

### Phase 2: EXHALE (8-12s)

**Time range:** 8000-12000ms into 16-second cycle

**Expected breath state:**
```
breathPhase: 1 → 0 (progress from 100% to 0%)
phaseType: 2 (EXHALE)
rawProgress: 0 → 1 (linear)
easedProgress: 0 → 1 (eased - slow start, fast end)
orbitRadius: 1.2 → 2.8 (particles expand)
sphereScale: 1.4 → 0.6 (sphere shrinks)
crystallization: 0 (no stillness effect)
```

**What your entity SHOULD do:**
- ✅ Size/scale decreases (opposite of INHALE)
- ✅ Position moves outward (if using orbitRadius - particles)
- ✅ Color shifts toward "exhale" color (if phaseType-based)
- ✅ Emission/glow decreases (calmer)
- ✅ Movement is smooth and accelerates (like INHALE but reversed)

**To verify:**
1. Watch your entity from 8-12s of the cycle
2. Should see clear contraction or outward movement
3. Should be mirror of INHALE phase
4. If behavior is inverted: Check scale/range calculations

**Common mistake:**
If entity contracts during INHALE and expands during EXHALE (opposite), check:
```typescript
// ❌ Wrong (inverted):
const scale = max - breathState.breathPhase * range;

// ✅ Right:
const scale = min + breathState.breathPhase * range;
```

---

### Phase 3: HOLD-OUT (12-16s)

**Time range:** 12000-16000ms into 16-second cycle

**Expected breath state:**
```
breathPhase: ~0.0 (stays at low point of exhale)
phaseType: 3 (HOLD-OUT)
orbitRadius: ~2.8 (particles stay expanded)
sphereScale: ~0.6 (sphere stays small)
crystallization: 0.4 → 0.75 (increases during hold)
```

**What your entity SHOULD do:**
- ✅ Size/scale stays constant (at minimum)
- ✅ Position stays constant (particles don't move)
- ✅ Movement velocity decreases (crystallization)
- ✅ Wind/turbulence reduces (very calm)
- ✅ Color very faded (deep stillness - if phaseType-based)
- ✅ Opacity very low (if crystallization-based)

**To verify:**
1. Watch your entity from 12-16s of the cycle
2. Should be opposite of HOLD-IN (holding at exhale instead of inhale)
3. Should be very still and calm
4. If entity is active: Check crystallization dampening

**Then it repeats:** At 16s, cycle returns to 0ms and INHALE starts again.

---

## Common Issues & Fixes

### Issue 1: No Visible Response at All

**Symptoms:**
- Entity doesn't animate at all
- Looks completely static across all 4 phases
- Breathing is happening but entity ignores it

**Root causes (in order of likelihood):**

**Cause A: Breath Entity not spawned**
- Check: Is `<BreathEntity />` in your scene? (Check 1)
- Fix: Add `<BreathEntity />` to `src/levels/breathing.tsx`

**Cause B: System not registered**
- Check: Is your system in `src/providers.tsx`? (Check 4)
- Fix: Add system to `KootaSystems` component

**Cause C: Not querying breath traits**
- Check: Does your system/component read breath data? (Check 3)
- Fix: Add breath trait query and use the data

**Cause D: System disabled**
- Check: Is `systemEnabled` condition true? (Check 4)
- Fix: Check component props, verify `enabled={true}`

**Debug steps:**
1. Add a console.log in your system to verify it's running
2. Add a console.log to print breath data
3. Verify both print every frame
4. If one doesn't: go back to its check

---

### Issue 2: Very Subtle Response (Barely Visible)

**Symptoms:**
- Entity does animate but changes are hard to see
- Have to look very closely to notice breathing
- Might look like nothing's happening at normal viewing distance

**Root causes (in order of likelihood):**

**Cause A: Pulse intensity too low**
- Check: Visual parameter ranges (Check 5)
- Example: `breathPulseIntensity: 0.3` (30%) is barely visible
- Fix: Increase to `0.8` or `1.0` (80-100%)

**Cause B: Damping too heavy**
- Check: Damping speed constants (Check 6)
- Example: `speed: 0.1` smooths changes over 166ms
- Fix: Increase speed to `0.3` or `0.5`

**Cause C: Parameter range too small**
- Check: Min/max values in visual calculation (Check 5)
- Example: `scale = 1 + breathPhase * 0.1` only ranges 1.0-1.1 (10% change)
- Fix: Increase multiplier: `scale = 1 + breathPhase * 0.5` (50% change)

**Cause D: Physics drag hiding motion**
- Check: Particle physics damping (Check 6)
- Example: Particle physics might have separate drag smoothing orbit radius changes
- Fix: Reduce particle physics damping or increase breath effect intensity

**Debug steps:**
1. Increase parameter range by 5x and test
2. If entity suddenly visible: issue was parameter range
3. Reduce damping speed and test
4. If entity becomes jerky but more visible: issue was damping

---

### Issue 3: Jerky/Stuttering Response

**Symptoms:**
- Animation skips or stutters
- Not smooth over the 4-second phase
- Looks choppy or discontinuous

**Root causes:**

**Cause A: Not updating every frame**
- Check: useFrame or system loop (Check 8)
- Fix: Add useFrame if missing, verify system is called each frame

**Cause B: Using rawProgress instead of easedProgress**
- Check: Which progress value are you using?
- Example: `rawProgress` is linear (constant speed)
- Fix: Use `easedProgress` for smooth acceleration/deceleration
- Or add easing yourself: `easeInOutQuad(rawProgress)`

**Cause C: Spring/damping too light**
- Check: Spring constant (not damping speed, opposite)
- If you have a spring force, it might be too weak
- Fix: Increase spring stiffness or reduce damping

**Debug steps:**
1. Verify useFrame is called every frame
2. Switch from rawProgress to easedProgress
3. Test both and compare smoothness

---

### Issue 4: Delayed Response

**Symptoms:**
- Entity animations lag behind breathing
- Takes a moment to respond to breathing changes
- 1-2 second delay noticed

**Root causes:**

**Cause A: Damping too heavy**
- Check: Damping speed constant (Check 6)
- Example: `speed: 0.05` creates 200+ms lag
- Fix: Increase speed to `0.3` or `0.5`

**Cause B: System runs too late**
- Check: Which phase your system runs in (Check 4)
- Running in Phase 6 vs Phase 2 = 4 phases of delay (~67ms per phase)
- Fix: Move system to earlier phase (Phase 2-3 preferred)

**Cause C: Using cached/stale breath data**
- Check: How do you get breath state?
- Example: Storing breath value in state and not updating every frame
- Fix: Call `calculateBreathState(Date.now())` directly in useFrame/system

**Debug steps:**
1. Reduce damping speed and test
2. Check what phase your system runs in
3. Move system to Phase 2 if possible
4. Verify you're reading fresh breath data (Date.now())

---

### Issue 5: Response Opposite Expected

**Symptoms:**
- Entity expands during exhale instead of inhale
- Particles move outward when they should move inward
- All behavior reversed

**Root causes:**

**Cause A: Inverse calculation wrong**
- Check: Min/max or formula (Check 5)
- Example: `max - breathPhase * range` instead of `min + breathPhase * range`
- Fix: Reverse the formula or invert breathPhase: `1 - breathPhase`

**Cause B: Using wrong trait value**
- Check: Which breath trait are you reading? (Check 3)
- Particles should use `orbitRadius` (inverse)
- Sphere should use `sphereScale` (direct)
- Fix: Use correct trait for your entity type

**Cause C: Phase type condition inverted**
- Check: Phase-based logic (Check 5)
- Example: `if (phaseType === 2)` means EXHALE, not INHALE
- Fix: Verify phase numbers: 0=INHALE, 1=HOLD-IN, 2=EXHALE, 3=HOLD-OUT

**Debug steps:**
1. During INHALE, manually check what breathPhase value is
2. Verify your calculation produces expected min/max
3. Check which trait you're reading (orbitRadius vs breathPhase)
4. Add console.log for both before/after calculation

---

## Validation Report Template

After performing all 8 checks and phase analysis, generate a report:

```markdown
# Breath Sync Validation Report: [EntityName]

## Summary
✅ All checks passed / ⚠️ Issues found: [count]

## Integration Checks

- [✅/❌] Check 1: Breath entity spawned
- [✅/❌] Check 2: Breath system registered & enabled
- [✅/❌] Check 3: Entity queries breath traits
- [✅/❌] Check 4: Entity system registered & enabled
- [✅/❌] Check 5: Visual parameter ranges adequate
- [✅/❌] Check 6: Damping constants reasonable
- [✅/❌] Check 7: Adaptive quality not disabling entity
- [✅/❌] Check 8: Entity updates every frame

## Parameter Analysis

- **Pulse/scale intensity:** [value] (Recommended: > 0.5 for visibility)
- **Orbit radius delta:** [value] units (Recommended: > 1.0)
- **Damping speed:** [value] (Recommended: > 0.2 for responsiveness)
- **Quality impact:** [none/low/medium/high]

## Phase Behavior Analysis

### Phase 0: INHALE (0-4s)
**Expected:** [what should happen]
**Actual code:** [what entity does]
**Status:** ✅ Correct / ⚠️ Issue

### Phase 1: HOLD-IN (4-8s)
**Expected:** [stillness, crystallization increases]
**Actual code:** [what entity does]
**Status:** ✅ Correct / ⚠️ Issue

### Phase 2: EXHALE (8-12s)
**Expected:** [reverse of INHALE]
**Actual code:** [what entity does]
**Status:** ✅ Correct / ⚠️ Issue

### Phase 3: HOLD-OUT (12-16s)
**Expected:** [stillness at exhale point]
**Actual code:** [what entity does]
**Status:** ✅ Correct / ⚠️ Issue

## Recommendations

1. [Specific fix with file:line reference]
2. [Another fix with impact assessment]
3. [Debug suggestion or test to verify]

## Code Locations

- Entity component: `[file:path]`
- System: `[file:path]`
- Config/traits: `[file:path]`
- Registration: `src/providers.tsx:line`

## Next Steps

1. Apply recommendations 1-3
2. Rebuild and test with `npm run dev`
3. Verify entity animates smoothly across all 4 phases
4. If issues persist, re-run checks on modified files
```

---

## Reference & Further Reading

See the following for comprehensive details:

- **[reference.md](reference.md)** — Complete breath system architecture and API
- **[examples.md](examples.md)** — Real validation reports and fixes
- **[checklist.md](checklist.md)** — Quick reference for manual validation

---

## Tips for Success

1. **Start with a working baseline** — Compare unknown entity to BreathingSphere (proven to work)
2. **Check in order** — Don't skip checks; missing Check 1 wastes time debugging Check 8
3. **Use console.log liberally** — Print breath state and entity values every frame to debug
4. **Test at 60fps** — Run `npm run dev` with DevTools performance profiling
5. **Increase visibility** — Temporarily increase parameter ranges 5-10x to test integration
6. **Compare to BreathingSphere** — It's the canonical working example (see `src/entities/breathingSphere/index.tsx`)

---

Let's validate and debug your breathing synchronization! 🫁
