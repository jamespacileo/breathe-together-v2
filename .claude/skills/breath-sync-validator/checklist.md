# Breath Sync Validation Checklist

Quick reference guide for manually validating breathing synchronization.

---

## Pre-Check Prep

- [ ] Entity name: ________________
- [ ] Problem type: ☐ No response ☐ Subtle ☐ Jerky ☐ Delayed ☐ Opposite
- [ ] Running: `npm run dev` ✅
- [ ] Watching entity during 0-4s INHALE phase

---

## The 8 Checks

### Check 1: Breath Entity Spawned

**File:** `src/levels/breathing.tsx` (or scene component)

**Search for:**
```tsx
<BreathEntity />
```

**Status:**
- [ ] Found ✅
- [ ] Missing ❌ → Add to component tree

---

### Check 2: Breath System Registered

**File:** `src/providers.tsx` (lines 49-120)

**Search for:**
```typescript
if (breathSystemEnabled) {
  breathSystem(world, delta);
}
```

**Line number:** ________

**Status:**
- [ ] Found in Phase 1 ✅
- [ ] Found in wrong phase ⚠️
- [ ] Missing ❌

---

### Check 3: Entity Queries Breath Traits

**File:** Entity system or component

**Search for any of:**
- `world.queryFirst(BreathPhase)`
- `world.queryFirst(breathPhase, ...)`
- `calculateBreathState(Date.now())`

**Pattern found:**
```typescript
_________________________________________________________________
```

**Status:**
- [ ] Queries breath ✅
- [ ] Missing query ❌ → Add trait query

---

### Check 4: Entity System Registered

**File:** `src/providers.tsx` (inside KootaSystems)

**Search for:**
```typescript
if (myEntitySystemEnabled) {
  myEntitySystem(world, delta);
}
```

**Line number:** ________

**Phase:** ☐ Phase 1 ☐ Phase 2 ☐ Phase 3 ☐ Phase 4 ☐ Phase 5 ☐ Phase 6 ☐ Phase 7

**Status:**
- [ ] Found ✅
- [ ] Wrong phase ⚠️
- [ ] Missing ❌ → Add to KootaSystems

---

### Check 5: Visual Parameter Ranges

**File:** Entity config or component

**Search for visual parameters:**
- Scale multiplier: ________
- Opacity range: ________
- Position offset: ________
- Color shift: ________
- Pulse intensity: ________

**Visibility check:**

| Parameter | Value | Minimum | Status |
|-----------|-------|---------|--------|
| Scale | ±____% | 20% | ☐ ☐ |
| Opacity | ±____% | 20% | ☐ ☐ |
| Position | _____ units | 0.5 units | ☐ ☐ |
| Color | _____ degrees | 15 degrees | ☐ ☐ |

**Status:**
- [ ] All adequate ✅
- [ ] Some too subtle ⚠️ → Increase by 2-5x
- [ ] All invisible ❌ → Major increase needed

---

### Check 6: Damping Constants

**File:** `src/entities/breath/systems.tsx` and physics systems

**Search for damping:**
```typescript
{ trait: breathPhase, targetTrait: targetBreathPhase, speed: ____ }
```

**Damping speed values found:**
- breathPhase speed: ________
- [Other]: ________

**Speed analysis:**

| Speed | Effect | Status |
|-------|--------|--------|
| < 0.1 | Very sluggish | ⚠️ Too slow |
| 0.1-0.2 | Sluggish | ⚠️ Might hide response |
| 0.3-0.5 | Balanced | ✅ Good |
| > 0.5 | Responsive | ✅ Very good |

**Status:**
- [ ] Speeds adequate (> 0.2) ✅
- [ ] Some too heavy (< 0.2) ⚠️ → Increase to 0.3-0.5
- [ ] All missing damping ❌ → Add spring damping

---

### Check 7: Adaptive Quality Check

**File:** Entity component

**Search for quality conditions:**
```typescript
const quality = useQuality();
if (quality === 'low') {
  // disables entity?
}
```

**Or check for:**
```typescript
active({ value: i < activeCount })
```

**Current behavior at different quality levels:**
- Low quality: ________________________________
- Medium quality: ______________________________
- High quality: ________________________________

**Status:**
- [ ] Always rendered ✅
- [ ] Disabled in low quality ⚠️ (might be OK)
- [ ] Disabled in all qualities ❌ → Check quality context

---

### Check 8: Frame Update Frequency

**File:** Entity component or system

**For components, search for:**
```typescript
useFrame(() => {
  // update here
})
```

**For systems, verify it's called in KootaSystems each frame.**

**Status:**
- [ ] Uses useFrame ✅
- [ ] System registered in KootaSystems ✅
- [ ] No frame skip logic ✅
- [ ] Updates every frame ✅
- [ ] Missing updates ❌ → Add useFrame

---

## Phase-by-Phase Quick Test

Run this while watching entity during breathing cycle:

### Phase 0: INHALE (0-4s)

- [ ] **Size increases** (or position moves inward)
  - Clear visible change? ☐ Yes ☐ Barely ☐ No
- [ ] **Smooth motion** (not jerky)
  - Smooth? ☐ Yes ☐ Somewhat ☐ No
- [ ] **Color shifts** (if applicable)
  - Visible? ☐ Yes ☐ Barely ☐ No

### Phase 1: HOLD-IN (4-8s)

- [ ] **Motion slows** (crystallization effect)
  - Noticeable? ☐ Yes ☐ Barely ☐ No
- [ ] **Stays at peak** (doesn't continue moving)
  - Held? ☐ Yes ☐ Somewhat ☐ No

### Phase 2: EXHALE (8-12s)

- [ ] **Size decreases** (or position moves outward)
  - Clear visible change? ☐ Yes ☐ Barely ☐ No
- [ ] **Reverse of INHALE** (mirror motion)
  - Symmetric? ☐ Yes ☐ Somewhat ☐ No

### Phase 3: HOLD-OUT (12-16s)

- [ ] **Motion slows** (crystallization effect)
  - Noticeable? ☐ Yes ☐ Barely ☐ No
- [ ] **Stays at minimum** (fully contracted/exhaled)
  - Held? ☐ Yes ☐ Somewhat ☐ No

---

## Issue Diagnosis

**If nothing is visible in any phase:**

Go through Checks 1-4 in order:
1. [ ] BreathEntity spawned?
2. [ ] breathSystem running?
3. [ ] Entity querying breath?
4. [ ] Entity system running?

If all ✅: Problem is in Check 5-8.

**If barely visible in all phases:**

Priority order:
1. [ ] Check 5: Increase visual range by 2-5x
2. [ ] Check 6: Reduce damping from 0.1 to 0.3
3. [ ] Check 7: Test with quality = 'high'

**If jerky/stuttering:**

Priority order:
1. [ ] Check 8: Verify updates every frame
2. [ ] Check 6: Look for discrete steps in damping
3. [ ] Use `easedProgress` instead of `rawProgress`

**If opposite direction:**

Check:
1. [ ] Using correct trait? (particles use `orbitRadius`, sphere uses `sphereScale`)
2. [ ] Formula inverted? (should be `min + phase * range`, not `max - phase * range`)
3. [ ] Phase type wrong? (phaseType 0 = INHALE, 2 = EXHALE)

**If delayed (1-2s lag):**

Check:
1. [ ] Damping too heavy? (speed < 0.2)
2. [ ] System runs too late? (Phase 6 instead of Phase 2)
3. [ ] Using fresh Date.now()? (not cached breath value)

---

## Quick Fixes (One-Liners)

### Increase visual intensity 2x
```typescript
// Before:
const pulse = 1.0 + phase * 0.3;

// After:
const pulse = 1.0 + phase * 0.6;
```

### Reduce damping lag 3x
```typescript
// Before:
{ trait: breathPhase, targetTrait: targetBreathPhase, speed: 0.1 }

// After:
{ trait: breathPhase, targetTrait: targetBreathPhase, speed: 0.3 }
```

### Fix inverted scale
```typescript
// Before (shrinks on inhale):
const scale = 1.4 - breathState.breathPhase * 0.8;

// After (expands on inhale):
const scale = 0.6 + breathState.breathPhase * 0.8;
```

### Add missing useFrame
```typescript
// Before: (no animation)
return <mesh ref={meshRef} />;

// After:
useFrame(() => {
  const breath = world.queryFirst(BreathPhase);
  if (!breath) return;
  const data = breath.get(BreathPhase);
  meshRef.current.scale.set(data.sphereScale, data.sphereScale, data.sphereScale);
});
return <mesh ref={meshRef} />;
```

---

## Comparison to Gold Standard

**BreathingSphere** is the proven working example.

Compare your entity to it:

| Aspect | BreathingSphere | Your Entity | Match? |
|--------|-----------------|------------|--------|
| Visual range | 0.6→1.4 (130%) | ______→______ | ☐ ☐ |
| Damping | None (direct) | ________ | ☐ ☐ |
| Update method | useFrame | ________ | ☐ ☐ |
| Trait used | sphereScale | ________ | ☐ ☐ |
| Visibility | Very clear | ________ | ☐ ☐ |

**If your entity doesn't match:**
- Visual range too small? Increase it
- Has damping? Remove or reduce
- Not in useFrame? Add it
- Using wrong trait? Switch to correct one
- Can't see motion? Increase range 5x to test

---

## Before/After Validation

### Before Fixes

- Visual response: ☐ None ☐ Barely visible ☐ Visible ☐ Clear ☐ Excessive
- Smoothness: ☐ Jerky ☐ Choppy ☐ OK ☐ Smooth
- Lag: ☐ 1+ sec ☐ 500ms ☐ 200ms ☐ 50ms ☐ None
- Phases: ☐ All wrong ☐ Some correct ☐ Mostly correct ☐ All correct

### After Fixes

- Visual response: ☐ None ☐ Barely visible ☐ Visible ☐ Clear ☐ Excessive
- Smoothness: ☐ Jerky ☐ Choppy ☐ OK ☐ Smooth
- Lag: ☐ 1+ sec ☐ 500ms ☐ 200ms ☐ 50ms ☐ None
- Phases: ☐ All wrong ☐ Some correct ☐ Mostly correct ☐ All correct

**Goal:** All should be "Clear" + "Smooth" + "None" lag + "All correct"

---

## Files to Know

| File | Purpose | Line | Check |
|------|---------|------|-------|
| `src/levels/breathing.tsx` | Scene component | - | 1 |
| `src/app.tsx` | App root | - | 1 |
| `src/providers.tsx` | System registration | 49-120 | 2,4 |
| `src/entities/breath/systems.tsx` | Breath logic | ~145 | 6 |
| `src/entities/[entity]/index.tsx` | Your entity | - | 3,5,8 |
| `src/entities/[entity]/systems.tsx` | Your system | - | 3,4 |
| `src/entities/[entity]/config.ts` | Your config | - | 5 |
| `src/lib/breathCalc.ts` | Breath calc | - | Ref |
| `src/entities/breathingSphere/index.tsx` | Gold standard | - | Compare |

---

## Red Flags

- [ ] Breath entity not spawned → Critical, fix first
- [ ] breathSystem not in Phase 1 → Critical, breaks everything
- [ ] Entity not querying breath → Critical, can't respond
- [ ] Visual range < 15% → Usually means no response
- [ ] Damping speed < 0.1 → Causes lag
- [ ] No useFrame in component → Doesn't update
- [ ] Opposite behavior in all phases → Inverted calculation

---

## Success Checklist

When done, all should be true:

- [ ] All 8 checks pass ✅
- [ ] Phase 0 (INHALE): Visible expansion/inward motion
- [ ] Phase 1 (HOLD-IN): Clear pause/stillness
- [ ] Phase 2 (EXHALE): Visible contraction/outward motion
- [ ] Phase 3 (HOLD-OUT): Clear pause/stillness
- [ ] Motion is smooth (not jerky)
- [ ] Response is immediate (no lag)
- [ ] Visible effect is "clearly visible but not garish"
- [ ] Matches BreathingSphere baseline quality

**When all ✅:** Entity is successfully breathing! 🫁

---

## Quick Reference

**Quick Test Command:**
```bash
npm run dev  # Watch entity during 16-second breathing cycle
```

**Golden Rule:**
> If entity doesn't animate, fix Checks 1-4 (integration).
> If animates but subtle, fix Check 5 (visual range) or Check 6 (damping).

**Compare To:**
```
BreathingSphere = gold standard
ParticleSystem = needs fixes
You = work in progress
```

**Time to Fix:**
- Checks 1-4 (integration): 5-10 min each
- Check 5 (visual range): 1 min (just increase multiplier)
- Check 6 (damping): 1 min (just increase speed)
- Check 7-8: 2-5 min each

**Total:** Usually fixable in 10-20 minutes

---

Let's make those entities breathe visibly! 🫁
