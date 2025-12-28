# Breath Sync Validation Examples

Real validation reports and how to fix common issues in breathe-together-v2.

---

## Example 1: Validating ParticleSystem (Current Issue)

**Entity:** ParticleSystem (user + filler particles)
**Suspected Issue:** Visual response too subtle
**Date:** 2025-12-28

### Summary
⚠️ Issues found: 2
**Root cause:** Low pulse intensity + heavy damping hiding visual response

---

### Integration Checks

- ✅ Check 1: Breath entity spawned
  - Found: `<BreathEntity />` in `src/levels/breathing.tsx`

- ✅ Check 2: Breath system registered & enabled
  - Found: `breathSystem` runs in Phase 1 (LOGIC)
  - Location: `src/providers.tsx:63`

- ✅ Check 3: Entity queries breath traits
  - Found: `ParticleRenderer` queries `breathPhase` every frame
  - Location: `src/entities/particle/index.tsx:250`
  - Found: `particlePhysicsSystem` queries `orbitRadius, sphereScale`
  - Location: `src/entities/particle/systems.tsx:45`

- ✅ Check 4: Entity system registered & enabled
  - Found: `particlePhysicsSystem` runs in Phase 2 (PHYSICS)
  - Location: `src/providers.tsx:97`
  - Found: `ParticleRenderer` updates in useFrame every frame
  - Location: `src/entities/particle/index.tsx:225`

- ⚠️ Check 5: Visual parameter ranges adequate
  - Found: `breathPulseIntensity: 0.3` in particle config
  - **Issue:** 0.3 (30%) is below visibility threshold (should be > 0.5)
  - Recommendation: Increase to 0.8-1.0 for clear visibility

- ⚠️ Check 6: Damping constants reasonable
  - Found: `{ trait: breathPhase, targetTrait: targetBreathPhase, speed: 0.1 }`
  - Location: `src/entities/breath/systems.tsx:line ~145`
  - **Issue:** speed 0.1 creates 100-150ms lag (too heavy)
  - Impact: Breath changes smoothed over entire phase, hiding response
  - Recommendation: Increase to 0.3-0.5 for responsive motion

- ✅ Check 7: Adaptive quality not disabling entity
  - Found: Particle count reduced in low quality, but particles still rendered
  - Status: OK (adaptive quality present but doesn't fully disable)

- ✅ Check 8: Entity updates every frame
  - Confirmed: `useFrame` in ParticleRenderer
  - Confirmed: `particlePhysicsSystem` runs every frame
  - Status: OK

---

### Parameter Analysis

| Parameter | Value | Issue | Recommendation |
|-----------|-------|-------|-----------------|
| Pulse intensity | 0.3 (30%) | Too subtle | Increase to 0.8+ (80%+) |
| Orbit radius delta | 1.6 units | Adequate | Keep as-is |
| Breath damping speed | 0.1 | Too heavy | Increase to 0.3-0.5 |
| Quality impact | Low | None | Monitor at low quality |

**Visibility breakdown:**
- Particle scale: 30% × 1.6 units orbit change = ~0.48 unit movement
- At distance ~2 units, this is 24% of orbit radius
- At typical viewing distance, **barely perceptible**

---

### Phase Behavior Analysis

#### Phase 0: INHALE (0-4s, breathPhase 0→1)

**Expected:**
- breathPhase: 0 → 1 (progress from 0% to 100%)
- orbitRadius: 2.8 → 1.2 (particles move inward 1.6 units)
- sphereScale: 0.6 → 1.4 (sphere expands)
- Particles should show clear inward movement
- Sphere should show clear expansion

**Actual code:**
```typescript
// ParticleRenderer:
const pulse = 1.0 + phase * 0.3;  // 1.0 → 1.3 (only 30% scale change)

// particlePhysicsSystem:
const radius = breathState.orbitRadius;  // 2.8 → 1.2 (correct)
// BUT smoothed by:
const targetOrbit = calculateTarget(radius);
smoothDamp(currentOrbit, targetOrbit, speed: 0.1);  // 150ms lag
```

**Status:** ⚠️ Movement happens but extremely subtle

**Evidence:**
- With damping speed 0.1 at 60fps:
  - Frame 1: orbitRadius = 2.8
  - Frame 2: orbitRadius ≈ 2.77 (only 1% toward target)
  - Frame 3: orbitRadius ≈ 2.74 (cumulative 2%)
  - ...takes ~10 frames (166ms) to reach 63% of target
  - Phase only lasts 4 seconds (4000ms), so sees ~1.5% change before HOLD-IN starts

**Visible effect:** Barely noticeable slow drift inward (invisible at normal viewing distance)

#### Phase 1: HOLD-IN (4-8s, breathPhase ~1)

**Expected:**
- Particles stay at contracted position (orbitRadius ~1.2)
- Sphere stays large (sphereScale ~1.4)
- Crystallization increases (0.5 → 0.9) — should feel still

**Actual code:**
```typescript
// Particles held at targetOrbit (correct)
// Crystallization increases, but particles not responding to it
// No visible "stillness" effect in particle behavior
```

**Status:** ✅ Technically correct but no visual feedback of stillness

#### Phase 2: EXHALE (8-12s, breathPhase 1→0)

**Expected:**
- orbitRadius: 1.2 → 2.8 (particles move outward 1.6 units)
- sphereScale: 1.4 → 0.6 (sphere shrinks)
- Clear outward movement

**Actual code:**
```typescript
// Same heavy damping (speed: 0.1) smooths motion
// Particles slowly drift outward over 4-second phase
// Only ~1.5% visible change due to damping
```

**Status:** ⚠️ Motion happens but invisible

#### Phase 3: HOLD-OUT (12-16s, breathPhase ~0)

**Expected:**
- Particles at expanded position (orbitRadius ~2.8)
- Sphere small (sphereScale ~0.6)
- Crystallization increases — deep stillness

**Actual code:**
```typescript
// Same as HOLD-IN but at opposite end
// Particles held at expanded position
// No visible stillness feedback
```

**Status:** ✅ Technically correct but no visual feedback

---

### Root Cause Analysis

**Why particles appear non-responsive:**

1. **Low pulse intensity (30%):** Only 30% scale change = very subtle
2. **Heavy damping (speed 0.1):** 150ms lag means changes are stretched over entire phase and nearly imperceptible
3. **Combined effect:** 30% × stretched-over-time = almost invisible

**Physics:**
- 16-second cycle = 2-second per phase
- Damping speed 0.1 = 150ms to reach 63%
- So particles reach only ~63% of target before phase ends
- Then next phase starts moving opposite direction
- Net effect: particles oscillate barely-visibly

**Proof:**
```
INHALE (0-4s):        Moves from 2.8 to ~1.9 (reaches only ~40% of target)
HOLD-IN (4-8s):       Stays ~1.9 (too slow to reach 1.2)
EXHALE (8-12s):       Starts moving back out from 1.9 (doesn't complete exhale)
HOLD-OUT (12-16s):    Stays ~2.0 (never reaches full exhale expansion)
```

Result: Very small oscillation between 1.9 and 2.1 units (invisible at scale 2.5)

---

### Recommendations

**Recommendation 1: Increase breathPulseIntensity**
- File: `src/entities/particle/config.ts`
- Change: `breathPulseIntensity: 0.3` → `breathPulseIntensity: 1.0`
- Impact: Increases scale variation from 30% to 100% (10x more visible)
- Effort: 1 line change
- Risk: Low (just visual, no logic change)

**Recommendation 2: Increase breath phase damping speed**
- File: `src/entities/breath/systems.tsx` (line ~145)
- Change: `speed: 0.1` → `speed: 0.5` (or 0.3 for moderate)
- Impact: Reduces lag from 150ms to 30-50ms (3-5x more responsive)
- Effort: 1 line change
- Risk: Low (affects breathing feel slightly, probably improvement)

**Recommendation 3: Debug visualization**
- Temporarily add visual debug info
- Show orbit radius min/max bounds
- Show current particle distance from center
- Verify actual motion is happening (it is, but invisible)

**Recommendation 4: Physics damping check**
- File: `src/entities/particle/systems.tsx`
- Check if particle physics have separate drag smoothing
- May need to adjust if very heavy drag is compounding breath damping

---

### Code Locations

- Entity component: `src/entities/particle/index.tsx` (ParticleRenderer line 250, ParticleSpawner)
- System: `src/entities/particle/systems.tsx` (particlePhysicsSystem line 45)
- Config: `src/entities/particle/config.ts` (breathPulseIntensity)
- Breath damping: `src/entities/breath/systems.tsx` (line ~145)
- Registration: `src/providers.tsx:97` (particlePhysicsSystem registration)

---

### Next Steps

1. **Apply Recommendation 1:** Increase breathPulseIntensity to 1.0
2. **Apply Recommendation 2:** Increase damping speed to 0.3-0.5
3. **Run:** `npm run dev` and test
4. **Observe:** During INHALE (0-4s), watch particles move noticeably inward
5. **Verify:** All 4 phases show clear, smooth motion
6. **Compare:** Motion should now be comparable to BreathingSphere visibility

---

## Example 2: Validating BreathingSphere (Working Baseline)

**Entity:** BreathingSphere
**Status:** ✅ Baseline working example
**Why it works:** Direct 1:1 mapping, no heavy damping

### Summary
✅ All checks passed — This is the gold standard for breathing response

---

### Integration Checks

- ✅ Check 1: Breath entity spawned
- ✅ Check 2: Breath system registered & enabled
- ✅ Check 3: Entity queries breath traits (queries sphereScale directly)
- ✅ Check 4: Entity system registered (uses useFrame in component)
- ✅ Check 5: Visual parameter ranges (0.6 → 1.4 scale = 130% change)
- ✅ Check 6: No heavy damping (direct 1:1 mapping, no smoothing layer)
- ✅ Check 7: Always rendered (no quality disabling)
- ✅ Check 8: Updates every frame (useFrame)

---

### Key Success Factors

```typescript
// src/entities/breathingSphere/index.tsx
useFrame(() => {
  const breath = world.queryFirst(BreathPhase);
  if (!breath) return;

  const breathData = breath.get(BreathPhase);

  // ✅ Directly use sphereScale (pre-calculated, optimal range)
  const targetScale = breathData.sphereScale * entranceScale;

  // ✅ Apply directly to mesh (no intermediate smoothing)
  meshRef.current.scale.setScalar(targetScale);
});
```

**Why this works:**
1. **Large visual range:** sphereScale goes 0.6 → 1.4 (130% change)
2. **Direct mapping:** No smoothing layer between breath data and visual
3. **Pre-calculated:** Uses sphereScale (already optimized for visuals)
4. **Every frame:** useFrame ensures responsive updates
5. **No damping:** Direct 1:1 response to breath changes

---

### Phase Response

| Phase | sphereScale | Visual Result |
|-------|------------|---------------|
| INHALE | 0.6 → 1.4 | Clear expansion (230% size increase) |
| HOLD-IN | ~1.4 | Stays expanded, clearly visible |
| EXHALE | 1.4 → 0.6 | Clear shrinking (230% size decrease) |
| HOLD-OUT | ~0.6 | Stays small, clearly visible |

**Comparison to particles:** 130% change is immediately visible, whereas particles' 30% change with heavy damping is nearly invisible.

---

### What NOT to do (Bad Examples)

#### ❌ Bad Example 1: Heavy damping on sphere

```typescript
// If we applied same damping to sphere:
const targetScale = breath.sphereScale;
smoothDamp(currentScale, targetScale, speed: 0.1);  // ❌ BAD

// Result: Sphere would respond weakly like particles
// Solution: Remove damping layer, use direct mapping
```

#### ❌ Bad Example 2: Using breathPhase instead of sphereScale

```typescript
// If we calculated scale ourselves:
const scale = 0.6 + breath.breathPhase * 0.8;  // ❌ BAD (wasteful)

// Better: Use pre-calculated sphereScale
const scale = breath.sphereScale;  // ✅ GOOD
```

---

### Lesson for ParticleSystem

To fix ParticleSystem, make it more like BreathingSphere:

1. **Increase visual intensity** (like sphere's 130% range)
2. **Remove heavy damping** (or significantly reduce it)
3. **Use pre-calculated values** (orbitRadius is already optimal)
4. **Apply directly** without intermediate smoothing

---

## Example 3: Fixing Subtle Response (Common Pattern)

**Scenario:** Entity animates but changes are barely noticeable
**Timeline:** How to debug and fix

### Step 1: Diagnosis

```typescript
// Add this to your system to understand current behavior
const breathEntity = world.queryFirst(BreathPhase);
const breath = breathEntity.get(BreathPhase);

const parameterDelta = maxValue - minValue;
const visibilityPercent = (parameterDelta / maxValue) * 100;

console.log(`
Parameter change: ${parameterDelta} units
Max value: ${maxValue}
Visibility: ${visibilityPercent.toFixed(1)}%
${visibilityPercent < 20 ? '⚠️ TOO SUBTLE (< 20%)' : '✅ Adequate (> 20%)'}
`);
```

### Step 2: Increase Visual Range (5x test)

```typescript
// Temporarily increase all visual multipliers by 5x
const testMode = true;

const baseIntensity = 0.3;
const intensity = testMode ? baseIntensity * 5 : baseIntensity;

const scale = 1 + breath.breathPhase * intensity;
// testMode: 1.0 → 2.5 (150% change, highly visible)
// normal: 1.0 → 1.3 (30% change, subtle)
```

### Step 3: Test visibility

- Run `npm run dev`
- With testMode=true, entity should be obviously animated
- If visible now: original range was too small
- If still invisible: integration issue (not visual range)

### Step 4: Fix accordingly

**If became visible:**
```typescript
// Original was too subtle, increase by 2-3x instead of 5x
const intensity = 0.3 * 2.5;  // 75% change (clearly visible)
```

**If still invisible:**
- Go back to Checks 1-4 (integration issue)
- Not a visual range problem

---

## Example 4: Opposite Behavior Fix

**Scenario:** Entity expands during exhale instead of inhale

### Diagnosis

```typescript
// Add debug log during INHALE phase
if (breathState.phaseType === 0) {
  console.log('INHALE: expected scale UP, actual:', scale);
}
```

**If scale is decreasing:** Inverse is backwards.

### Fix Pattern 1: Invert breathPhase

```typescript
// ❌ Wrong (inverts during active phases)
const scale = 1 + (1 - breathState.breathPhase) * 0.5;

// ✅ Right (use breathPhase directly for INHALE expansion)
const scale = 1 + breathState.breathPhase * 0.5;
```

### Fix Pattern 2: Check trait value

```typescript
// ❌ Wrong if reading orbitRadius for sphere
const sphereScale = breathState.orbitRadius;  // WRONG - inverse!

// ✅ Right - use matching trait
const sphereScale = breathState.sphereScale;  // CORRECT
```

### Fix Pattern 3: Verify phase type condition

```typescript
// ❌ Wrong condition
if (breathState.phaseType === 2) {  // EXHALE
  // Trying to expand on exhale - backwards!
  scale = maxValue;
}

// ✅ Right condition
if (breathState.phaseType === 0) {  // INHALE
  // Expand on inhale - correct!
  scale = maxValue;
}
```

---

## Example 5: System Order Issue (Rare)

**Scenario:** Entity sometimes shows old breath data

### Root Cause

ParticleSystem runs in Phase 2 but tries to query a trait updated in Phase 4:

```typescript
// providers.tsx (WRONG ORDER)
breathSystem();               // Phase 1 ✅
particlePhysicsSystem();      // Phase 2 (reads breath) ✅
customSystem();               // Phase 3
velocityTowardsTarget();      // Phase 4 (updates breath trait)
positionFromVelocity();       // Phase 5
// ^ particlePhysicsSystem read in Phase 2, but data updated in Phase 4!
```

### Fix

Move system to correct phase:

```typescript
// providers.tsx (CORRECT ORDER)
breathSystem();               // Phase 1 (updates breath)
particlePhysicsSystem();      // Phase 2 (reads breath immediately after) ✅
// ^ Perfect - reads fresh data
```

---

## Validation Report Template

Use this template when creating your own validation report:

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
- [✅/❌] Check 7: Adaptive quality not disabling
- [✅/❌] Check 8: Entity updates every frame

## Parameter Analysis
[Table with current values vs recommendations]

## Phase Behavior
[4 phases with expected vs actual]

## Recommendations
1. [Specific fix with file:line]
2. [Another fix]

## Next Steps
1. Apply fixes
2. Test with npm run dev
3. Verify motion in all 4 phases
4. Compare to BreathingSphere baseline
```

---

Let's fix those breathing entities! 🫁
