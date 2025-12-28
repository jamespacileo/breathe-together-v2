# Breath Sync Validation Reference

Complete technical reference for validating breathing synchronization in breathe-together-v2.

---

## Breath System Architecture

### Global State Flow

```
Date.now() (UTC time)
    ↓
calculateBreathState(Date.now())  [pure function, src/lib/breathCalc.ts]
    ↓
returns BreathState object
    ↓
breathSystem stores in BreathPhase trait
    ↓
All other systems query BreathPhase and respond
```

**Key insight:** No network needed. UTC time is globally synchronized. All users calculate independently and see the same breath phase.

### System Execution Order (Critical)

Located in `src/providers.tsx`, lines 49-120, inside `KootaSystems` component:

1. **Phase 1 (LOGIC):** breathSystem
   - Input: Date.now()
   - Output: BreathPhase trait updated with current breath state
   - Must run first — all others depend on it

2. **Phase 2 (PHYSICS):** particlePhysicsSystem
   - Input: orbitRadius, sphereScale, crystallization from BreathPhase
   - Output: Particle positions updated based on orbit radius
   - Runs immediately after breathSystem

3. **Phase 3 (INPUT):** cursorPositionFromLand
   - Input: Camera, ray cast to land
   - Output: Cursor position

4. **Phase 4 (FORCES):** velocityTowardsTarget
   - Input: Target position, velocity
   - Output: Velocity updated toward target

5. **Phase 5 (INTEGRATION):** positionFromVelocity
   - Input: Velocity
   - Output: Position updated from velocity

6. **Phase 6 (RENDER SYNC):** meshFromPosition
   - Input: Position traits
   - Output: Three.js mesh transforms synchronized

7. **Phase 7 (CAMERA):** cameraFollowFocused
   - Input: Focused entity position
   - Output: Camera position updated

**Critical:** DO NOT REORDER PHASES. This order prevents race conditions and ensures data flows correctly.

---

## BreathState Interface

Returned by `calculateBreathState(Date.now())`:

```typescript
export interface BreathState {
  // Phase progression (0-1)
  breathPhase: number;        // Position in current phase (0=exhaled, 1=inhaled)

  // Phase type (0-3)
  phaseType: number;          // 0=INHALE, 1=HOLD-IN, 2=EXHALE, 3=HOLD-OUT

  // Progress values
  rawProgress: number;        // 0-1 linear, unsmoothed
  easedProgress: number;      // 0-1 with easing applied

  // Stillness during holds
  crystallization: number;    // 0-1 (0 during active phases, high during holds)

  // Visual values (pre-calculated for convenience)
  sphereScale: number;        // 0.6-1.4 (scales with breathPhase)
  orbitRadius: number;        // 1.2-2.8 (inverse to sphereScale)
}
```

### Value Ranges by Phase

| Phase | Time | breathPhase | phaseType | orbitRadius | sphereScale | crystallization |
|-------|------|-------------|-----------|-------------|-------------|-----------------|
| INHALE | 0-4s | 0 → 1 | 0 | 2.8 → 1.2 | 0.6 → 1.4 | 0 |
| HOLD-IN | 4-8s | ~1.0 | 1 | ~1.2 | ~1.4 | 0.5 → 0.9 |
| EXHALE | 8-12s | 1 → 0 | 2 | 1.2 → 2.8 | 1.4 → 0.6 | 0 |
| HOLD-OUT | 12-16s | ~0.0 | 3 | ~2.8 | ~0.6 | 0.4 → 0.75 |

### breathPhase Interpretation

- **0** = Fully exhaled (empty lungs, particles expanded, sphere small)
- **0.25** = 25% through current phase
- **0.5** = 50% through current phase (midpoint)
- **0.75** = 75% through current phase
- **1** = Fully inhaled (full lungs, particles contracted, sphere large)

**Note:** During HOLD-IN and HOLD-OUT phases, breathPhase stays constant while crystallization increases.

### phaseType Interpretation

```typescript
switch (breathState.phaseType) {
  case 0: // INHALE (0-4s)
    // Active breathing in
    // breathPhase goes from 0 to 1
    // Sphere expands, particles contract
    break;

  case 1: // HOLD-IN (4-8s)
    // Pause with full lungs
    // breathPhase stays near 1
    // Crystallization increases (0.5 → 0.9)
    break;

  case 2: // EXHALE (8-12s)
    // Active breathing out
    // breathPhase goes from 1 to 0
    // Sphere shrinks, particles expand
    break;

  case 3: // HOLD-OUT (12-16s)
    // Pause with empty lungs
    // breathPhase stays near 0
    // Crystallization increases (0.4 → 0.75)
    break;
}
```

### Easing Functions

Each phase uses specific easing:

```typescript
// Phase 0 (INHALE): easeOutQuart
// Fast start, slow finish — feels like expanding naturally

// Phase 1 (HOLD-IN): easeInOutQuad
// Slow start, slow finish — smooth transition at peak

// Phase 2 (EXHALE): easeInSine
// Slow start, fast finish — feels like deflating naturally

// Phase 3 (HOLD-OUT): easeInOutQuad
// Slow start, slow finish — smooth transition at minimum
```

**Use:** `easedProgress` for smooth, natural-feeling animations. Use `rawProgress` for linear mechanical motion.

### Crystallization Interpretation

The `crystallization` parameter represents stillness/peacefulness during hold phases:

```typescript
// During INHALE (phase 0): crystallization = 0
const stillness0 = 0;

// During HOLD-IN (phase 1): crystallization increases
const stillness1_early = 0.5;   // early in hold
const stillness1_late = 0.9;    // late in hold

// During EXHALE (phase 2): crystallization = 0
const stillness2 = 0;

// During HOLD-OUT (phase 3): crystallization increases
const stillness3_early = 0.4;   // early in hold
const stillness3_late = 0.75;   // late in hold
```

**Use cases:**
- Fade particles: `opacity = 1 - crystallization * 0.5`
- Blur shader: `blur = crystallization * 5`
- Reduce jitter: `jitterAmount = 1 - crystallization * 0.8`
- Wind effect: `windForce = 1 - crystallization * 0.9`

---

## BreathPhase ECS Trait

Defined in `src/entities/breath/traits.tsx`:

```typescript
export const BreathPhase = trait({
  // Current breath state values
  breathPhase: 0,
  phaseType: 0,
  rawProgress: 0,
  easedProgress: 0,
  crystallization: 0,

  // Visual convenience values
  sphereScale: 1,
  orbitRadius: 2,
});

// Other breath traits
export const BreathConfig = trait({
  enabled: true,
  curveType: 'phase-based' as const,
});
```

### How to Query in Systems

```typescript
export function mySystem(world: World, delta: number) {
  // Query breath state
  const breathEntity = world.queryFirst(BreathPhase);
  if (!breathEntity) return;  // No BreathEntity spawned yet

  const breath = breathEntity.get(BreathPhase);

  // Access values
  const phase = breath.breathPhase;        // 0-1
  const phaseType = breath.phaseType;      // 0-3
  const stillness = breath.crystallization; // 0-1
  const orbitRadius = breath.orbitRadius;   // 1.2-2.8

  // Query your entities
  const entities = world.query([MyTrait]);
  entities.forEach(entity => {
    // Calculate new values from breath
    const newScale = 1 + phase * 0.5;
    entity.set(MyTrait, { ...current, scale: newScale });
  });
}
```

---

## Common Integration Patterns

### Pattern 1: Direct Phase Mapping (Simplest)

Use breathPhase directly as 0-1 progress value:

```typescript
const breathState = calculateBreathState(Date.now());

// Scale: expands with inhale
const scale = 1 + breathState.breathPhase * 0.5;  // 1.0 → 1.5

// Position: rises with inhale
const yOffset = breathState.breathPhase * 2;  // 0 → 2 units

// Opacity: increases with inhale
const opacity = 0.5 + breathState.breathPhase * 0.5;  // 0.5 → 1.0
```

**Use when:** One property that smoothly varies with breathing. Visual intensity matters more than phase-specific logic.

---

### Pattern 2: Inverse Synchronization

Use orbitRadius for particles (inverse to sphere):

```typescript
const breathState = calculateBreathState(Date.now());

// Particles contract when sphere expands (inverse motion)
const particleRadius = breathState.orbitRadius;  // 2.8 → 1.2

// Sphere expands when breathing in
const sphereScale = breathState.sphereScale;    // 0.6 → 1.4
```

**Use when:** Two complementary elements (particles ↔ sphere) that should move opposite. Visually balanced and meditative.

---

### Pattern 3: Phase-Specific Logic

Different behavior for each phase:

```typescript
const breathState = calculateBreathState(Date.now());

switch (breathState.phaseType) {
  case 0: // INHALE - Active, energetic
    color = '#4488ff';
    emission = 100 + breathState.easedProgress * 200;
    glow = 0.8;
    break;

  case 1: // HOLD-IN - Still, crystallized
    color = '#ffffff';
    emission = 50;
    glow = 0.3 + breathState.crystallization * 0.7;
    opacity = 0.5 + breathState.crystallization * 0.5;
    break;

  case 2: // EXHALE - Active, calming
    color = '#88ccff';
    emission = Math.max(50, 150 - breathState.easedProgress * 100);
    glow = 0.5;
    break;

  case 3: // HOLD-OUT - Still, deep
    color = '#ffffff';
    emission = 20;
    glow = 0.2 + breathState.crystallization * 0.5;
    opacity = 0.3 + breathState.crystallization * 0.4;
    break;
}
```

**Use when:** Different visual behavior per phase. Allows rich, phase-aware animations.

---

### Pattern 4: Easing for Smooth Motion

Use easedProgress instead of rawProgress:

```typescript
const breathState = calculateBreathState(Date.now());

// ❌ Jerky (raw linear motion)
const scale1 = 1 + breathState.rawProgress * 0.5;

// ✅ Smooth (eased motion with acceleration/deceleration)
const scale2 = 1 + breathState.easedProgress * 0.5;
```

**Use when:** Animation should feel natural and organic. Easing creates acceleration/deceleration that mimics real breathing.

---

### Pattern 5: Crystallization Effect

Enhance stillness during hold phases:

```typescript
const breathState = calculateBreathState(Date.now());
const crystal = breathState.crystallization;

// During holds: fade, blur, reduce motion
if (crystal > 0) {
  // Fade particles
  opacity = 0.5 + crystal * 0.5;  // 0.5 → 1.0

  // Blur effect
  blur = crystal * 5;              // 0 → 5px

  // Reduce scale
  scale = baseScale * (1 - crystal * 0.1);  // Shrink slightly

  // Reduce movement
  windForce = baseWind * (1 - crystal);  // Calmer
}
```

**Use when:** Hold phases should feel distinct and still. Emphasizes meditation aspect.

---

## Expected Value Ranges

### Visibility Thresholds

| Property | Minimum Visible | Recommended | Maximum |
|----------|-----------------|-------------|---------|
| Scale multiplier | ±0.15 (15%) | ±0.3-0.5 (30-50%) | ±1.0 (100%) |
| Opacity change | ±0.15 (15%) | ±0.3-0.5 (30-50%) | ±1.0 (100%) |
| Position offset | ±0.5 units | ±1.0-2.0 units | ±5.0+ units |
| Color hue shift | ±10° | ±20-30° | ±60°+ |
| Blur radius | ±1px | ±2-5px | ±10px+ |

**Rule of thumb:** If parameter change is less than 20%, humans won't perceive it. Aim for 30-50% change for clear visual feedback.

---

### Damping Speed Guidelines

| Speed | Effect | Use Case |
|-------|--------|----------|
| 0.05 | Very sluggish, 200+ms lag | Avoid (hides breathing) |
| 0.1 | Sluggish, 100-150ms lag | Heavy smoothing (ParticleSystem currently) |
| 0.2 | Moderate, 50-80ms lag | Balanced smoothing |
| 0.3 | Responsive, 30-50ms lag | Good for most cases |
| 0.5+ | Very responsive, <20ms lag | For subtle or multiple effects |
| 1.0 | No smoothing | Direct, jerky response |

**Speed formula:** Response time ≈ 1000ms × (1 - speed) / 60fps

**Current issue:** ParticleSystem has speed: 0.1 in breathSystem, causing 100-150ms lag that hides breathing response.

---

## Debugging Techniques

### Technique 1: Console Logging Breath State

```typescript
export function mySystem(world: World, delta: number) {
  const breathEntity = world.queryFirst(BreathPhase);
  if (!breathEntity) return;

  const breath = breathEntity.get(BreathPhase);

  // Log every frame (will be spammy but useful)
  console.log({
    time: Date.now() % 16000,
    phase: breath.phaseType,
    breathPhase: breath.breathPhase.toFixed(2),
    orbitRadius: breath.orbitRadius.toFixed(2),
    crystallization: breath.crystallization.toFixed(2),
  });
}
```

**Output:**
```
{ time: 2000, phase: 0, breathPhase: '0.50', orbitRadius: '2.00', crystallization: '0.00' }
{ time: 2050, phase: 0, breathPhase: '0.51', orbitRadius: '1.99', crystallization: '0.00' }
...
```

### Technique 2: Verify Sync Across Users (Simulate)

```typescript
// All these should return same breathPhase at same time
const now = Date.now();
const state1 = calculateBreathState(now);
const state2 = calculateBreathState(now);
const state3 = calculateBreathState(now);

console.assert(
  state1.breathPhase === state2.breathPhase &&
  state2.breathPhase === state3.breathPhase
);  // Should always be true (sync verified)
```

### Technique 3: Test Each Phase

```typescript
// Test each phase at key times
const phases = [
  { ms: 0, expected: 'INHALE start (phase 0, breathPhase 0)' },
  { ms: 2000, expected: 'INHALE mid (phase 0, breathPhase 0.5)' },
  { ms: 4000, expected: 'HOLD-IN start (phase 1, breathPhase 1)' },
  { ms: 6000, expected: 'HOLD-IN mid (phase 1, breathPhase 1)' },
  { ms: 8000, expected: 'EXHALE start (phase 2, breathPhase 1)' },
  { ms: 10000, expected: 'EXHALE mid (phase 2, breathPhase 0.5)' },
  { ms: 12000, expected: 'HOLD-OUT start (phase 3, breathPhase 0)' },
  { ms: 14000, expected: 'HOLD-OUT mid (phase 3, breathPhase 0)' },
];

phases.forEach(({ ms, expected }) => {
  const state = calculateBreathState(ms);
  console.log(`${expected} → phase: ${state.phaseType}, breathPhase: ${state.breathPhase.toFixed(2)}`);
});
```

### Technique 4: Temporarily Increase Parameter Ranges

To verify integration without changing damping:

```typescript
// In your entity system:
const testMode = true;  // Set to false when fixed

const scale = 1 + (testMode ? 2.0 : 0.5) * breath.breathPhase;
// testMode: scale 1.0 → 3.0 (200% change, highly visible)
// normal: scale 1.0 → 1.5 (50% change, normal)

if (testMode) {
  console.log('TEST MODE: Scale parameters increased 4x for visibility');
}
```

If entity becomes visible with testMode=true, issue is parameter visibility. If still invisible, issue is integration.

---

## Performance Considerations

### breathCalc.ts Calculation

```typescript
const state = calculateBreathState(Date.now());
```

- **Time:** < 0.5ms per call
- **Memory:** Negligible (small object allocation)
- **Safe to call:** Every frame, multiple times
- **Cost of 300 particles:** < 1ms total

### System Query Performance

```typescript
const breathEntity = world.queryFirst(BreathPhase);
const entities = world.query([ParticleTrait]);
```

- **Time:** < 0.1ms per system
- **Cost of many queries:** Negligible for < 1000 entities
- **Safe to query:** Every frame, multiple systems

### Overall Breathing System Cost

- breathSystem itself: ~0.2ms
- All systems querying breath: < 0.5ms
- Total overhead: < 1ms per frame (60fps = no issue)

**Conclusion:** Breathing synchronization has negligible performance cost. Increase visual parameters liberally without performance concern.

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
├─ Check 5: Are visual ranges large enough (>0.5)?
│  └─ No → Increase parameter multiplier
├─ Check 6: Is damping too heavy (<0.2)?
│  └─ Yes → Increase speed to 0.3+
├─ Check 7: Is low quality disabling entity?
│  └─ Yes → Check quality context settings
└─ Check 8: Does entity update every frame?
   └─ No → Add useFrame or verify system loop
```

---

## Real-World Comparison

### BreathingSphere (Working Example)

Located: `src/entities/breathingSphere/index.tsx`

```typescript
// Simple, effective breathing animation
const meshRef = useRef<THREE.Mesh>(null);

useFrame(() => {
  const breath = world.queryFirst(BreathPhase);
  if (!breath) return;

  const breathData = breath.get(BreathPhase);
  const targetScale = breathData.sphereScale * entranceScale;

  meshRef.current.scale.setScalar(targetScale);
});
```

**Why it works:**
1. ✅ Uses BreathPhase trait directly (Check 2)
2. ✅ Queries breath data every frame (Check 3, 8)
3. ✅ Uses sphereScale value (appropriate for sphere)
4. ✅ No heavy damping (direct 1:1 mapping)
5. ✅ Large visual range (0.6 → 1.4 = 130% change)

### ParticleSystem (Currently Subtle)

Located: `src/entities/particle/index.tsx`

```typescript
// Particles ARE responding, but too subtle
const pulse = 1.0 + phase * config.size.breathPulseIntensity;
// breathPulseIntensity: 0.3 → only 30% change (barely visible)

// In particlePhysicsSystem:
const radius = breathState.orbitRadius;  // Correct value
// BUT heavily smoothed by:
// - breathPhase damping speed: 0.1 (100-150ms lag)
// - physics drag smoothing motion further
```

**Issues identified:**
1. ⚠️ breathPulseIntensity 0.3 too low (Check 5)
2. ⚠️ breathPhase damping speed 0.1 too heavy (Check 6)
3. ⚠️ Physics drag further smoothing response (Check 6)

**Fixes needed:**
1. Increase breathPulseIntensity from 0.3 to 1.0
2. Increase damping speed from 0.1 to 0.3-0.5
3. Possibly reduce physics drag or compensate

---

## References

- **Main calculations:** `src/lib/breathCalc.ts`
- **System definition:** `src/entities/breath/systems.tsx`
- **Trait definitions:** `src/entities/breath/traits.tsx`
- **System registration:** `src/providers.tsx` (lines 49-120)
- **Working example:** `src/entities/breathingSphere/index.tsx`
- **Particle implementation:** `src/entities/particle/index.tsx` + `systems.tsx`
- **Project guide:** `/CLAUDE.md` — Architecture and patterns

---

Let's get those particles breathing visibly! 🫁
