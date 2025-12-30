# User Shape Animation Implementation Plan

**Branch:** `claude/animate-user-shapes-6LMiA`
**Updated:** 2025-12-30
**Status:** Ready for implementation

## Overview

Animate the arrival and departure of user shapes (ParticleSwarm shards) with breath-synchronized animations, and randomize the color order for visual variety.

## Current System Analysis

### ParticleSwarm Component (src/entities/particle/ParticleSwarm.tsx)

**Current behavior:**
- Creates icosahedral shards representing users with mood-based colors
- Colors follow deterministic order (grouped by mood via `buildColorDistribution`)
- When user count changes, **all shards are recreated** (line 119-146)
- No animation - shapes instantly appear/disappear

**Key architecture:**
- Uses separate `THREE.Mesh` objects (not InstancedMesh) for per-vertex color support
- Fibonacci sphere distribution for even spatial placement
- Breathing animation via ECS `orbitRadius` trait (updated each frame)
- Frosted glass material with refraction pipeline

### New Breathing System (Merged from Main)

**Relevant traits (src/entities/breath/traits.tsx):**
- `breathPhase` (0-1) - main animation driver
- `phaseType` (0-3) - phase index (0=inhale, 1=hold-in, 2=exhale, 3=hold-out)
- `rawProgress` (0-1) - progress within current phase
- `orbitRadius` - particle orbit radius

**Easing functions (src/lib/breathCalc.ts):**
- `controlledBreathCurve()` - raised cosine ramps with linear plateau
- `easeInhale()` - 25% start ramp, 50% linear, 25% end ramp
- `easeExhale()` - 20% start ramp, 50% linear, 30% end ramp (asymmetric for relaxation)

**Phase info helper (src/lib/breathPhase.ts):**
- `calculatePhaseInfo(cycleTime)` - returns `{ phaseIndex, phaseProgress, accumulatedTime, phaseDuration }`

## Implementation Strategy

### Phase 1: Color Randomization (Simple)

**Goal:** Randomize color order to prevent mood clustering

**Implementation:**
1. Add Fisher-Yates shuffle to `buildColorDistribution()` (ParticleSwarm.tsx:55-67)
2. Shuffle the color array after building it from mood counts
3. Test with different mock presence data

**Code location:** `src/entities/particle/ParticleSwarm.tsx:55-67`

**Expected result:** Colors evenly mixed around sphere instead of grouped by mood

**Complexity:** Low (5 lines of code)

---

### Phase 2: Lifecycle State Machine (Foundation)

**Goal:** Track shard state to enable animations

**Implementation:**

1. **Extend ShardData interface** (line 86-90):
```typescript
interface ShardData {
  mesh: THREE.Mesh;
  direction: THREE.Vector3;
  geometry: THREE.IcosahedronGeometry;
  // NEW FIELDS
  state: 'spawning' | 'active' | 'removing';
  spawnTime: number;        // Date.now() when state changed
  targetScale: number;      // Final scale (calculated from shardSize)
  lifecycleId: string;      // Stable ID for diffing (uuid or index-based)
}
```

2. **Initialize lifecycle fields** in shard creation (line 119-146):
```typescript
const shard: ShardData = {
  mesh,
  direction,
  geometry,
  state: 'spawning',
  spawnTime: Date.now(),
  targetScale: 1.0,
  lifecycleId: `shard-${i}`,
};
```

3. **State transitions:**
   - `spawning` → `active`: After 2s animation completes
   - `active` → `removing`: When user count decreases
   - `removing` → deleted: After 2s animation completes

**Complexity:** Low (interface changes + initialization)

---

### Phase 3: Incremental Shard Diffing (Core Logic)

**Goal:** Only add/remove shards that changed (don't recreate all)

**Current problem:**
- `useMemo([count, users, ...])` recreates all shards when any dependency changes
- This prevents smooth animations (all shards reset)

**Solution:**

1. **Replace useMemo with useEffect** for shard management:
```typescript
// Store previous count to detect changes
const prevCountRef = useRef(count);
const prevUsersRef = useRef(users);

useEffect(() => {
  const prevCount = prevCountRef.current;
  const delta = count - prevCount;

  if (delta > 0) {
    // ADD new shards
    addShards(delta, users);
  } else if (delta < 0) {
    // REMOVE excess shards (mark as 'removing')
    removeShards(Math.abs(delta));
  }

  // UPDATE colors if user mood distribution changed
  if (usersChanged(prevUsersRef.current, users)) {
    updateShardColors(users);
  }

  prevCountRef.current = count;
  prevUsersRef.current = users;
}, [count, users]);
```

2. **Helper functions:**
   - `addShards(count, users)` - create new shards in 'spawning' state
   - `removeShards(count)` - mark oldest shards as 'removing'
   - `updateShardColors(users)` - rebuild color distribution and apply to existing shards
   - `usersChanged(prev, current)` - deep equality check on mood counts

3. **Shard removal strategy:**
   - Option A: Remove shards with lowest spawnTime (FIFO - oldest first)
   - Option B: Remove random shards (most visually interesting)
   - **Recommendation:** Option A (FIFO) for predictable behavior

**Complexity:** Medium (requires diffing logic and helper functions)

---

### Phase 4: Breath-Synchronized Scale Animation

**Goal:** Animate shard scale based on lifecycle state

**Implementation:**

1. **Add animation logic to useFrame** (after line 180):
```typescript
useFrame(() => {
  const currentShards = shardsRef.current;
  if (currentShards.length === 0) return;

  const now = Date.now();
  const ANIMATION_DURATION = 2000; // 2 seconds (half breath cycle)

  // ... existing breathing radius logic ...

  // Update each shard
  for (const shard of currentShards) {
    // --- LIFECYCLE ANIMATION ---
    const elapsed = now - shard.spawnTime;
    const progress = Math.min(elapsed / ANIMATION_DURATION, 1);

    if (shard.state === 'spawning') {
      // Scale from 0 → targetScale using easeInhale curve
      const easedProgress = easeInhale(progress);
      shard.mesh.scale.setScalar(easedProgress * shard.targetScale);

      if (progress >= 1) {
        shard.state = 'active';
      }
    }
    else if (shard.state === 'removing') {
      // Scale from targetScale → 0 using easeExhale curve
      const easedProgress = easeExhale(progress);
      const reverseProgress = 1 - easedProgress;
      shard.mesh.scale.setScalar(reverseProgress * shard.targetScale);

      if (progress >= 1) {
        // Mark for deletion (handled in cleanup pass)
        shard.state = 'removed' as any; // temp state
      }
    }

    // --- POSITION & ROTATION (existing) ---
    shard.mesh.position.copy(shard.direction).multiplyScalar(currentRadius);
    shard.mesh.rotation.x += 0.002;
    shard.mesh.rotation.y += 0.003;
  }

  // Cleanup removed shards
  shardsRef.current = currentShards.filter(s => s.state !== 'removed');
});
```

2. **Import easing functions:**
```typescript
import { easeInhale, easeExhale } from '../../lib/breathCalc';
```

**Notes:**
- Uses same easing curves as breathing for visual consistency
- 2-second duration = half breath cycle (4s inhale, 4s exhale)
- Scale animation happens independently of breathing radius animation

**Complexity:** Medium (animation loop logic + state management)

---

### Phase 5: Staggered Arrivals (Polish)

**Goal:** When multiple users join, animate them sequentially for visual interest

**Implementation:**

1. **Add stagger delay to addShards():**
```typescript
function addShards(count: number, users: Partial<Record<MoodId, number>>) {
  const STAGGER_DELAY = 80; // ms between each arrival
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const shard = createShard({
      // ... geometry, mesh setup ...
      state: 'spawning',
      spawnTime: now + (i * STAGGER_DELAY),
      targetScale: 1.0,
    });
    shardsRef.current.push(shard);
  }
}
```

2. **Tuning:**
   - 80ms delay × 48 shards = 3.84s wave effect
   - Can adjust STAGGER_DELAY for faster/slower wave (50-150ms range)

**Expected result:**
- Single user joins: instant spawn
- 10 users join: 0.8s wave effect
- 48 users join: 3.8s wave rippling around sphere

**Complexity:** Low (just add delay offset to spawnTime)

---

### Phase 6: GPU Memory Cleanup (Critical)

**Goal:** Ensure removed shards properly dispose GPU resources

**Implementation:**

1. **Modify shard removal to dispose geometry:**
```typescript
// In useFrame cleanup pass (after animation)
const removedShards = currentShards.filter(s => s.state === 'removed');
for (const shard of removedShards) {
  // Dispose GPU resources
  shard.geometry.dispose();
  // Remove from scene
  groupRef.current?.remove(shard.mesh);
}

// Update ref with only active shards
shardsRef.current = currentShards.filter(s => s.state !== 'removed');
```

2. **Verify material sharing:**
   - Material is created once and shared across all shards (line 116)
   - Only dispose material on component unmount (already handled in line 174-178)
   - Geometries are unique per shard → must dispose individually

**Complexity:** Low (add disposal calls)

---

## Testing Plan

### Test Cases

1. **Color Randomization:**
   - Create scene with 48 users (12 per mood type)
   - Verify colors are mixed (not grouped by mood)
   - Refresh multiple times - order should change

2. **Single User Arrival:**
   - Start with 0 users
   - Increase to 1 user
   - Verify smooth 2s scale animation (0 → 1)

3. **Multiple Users Arrival:**
   - Start with 0 users
   - Increase to 48 users
   - Verify staggered wave effect (3.8s total)
   - Confirm all shards reach full scale

4. **Single User Departure:**
   - Start with 48 users
   - Decrease to 47 users
   - Verify smooth 2s scale animation (1 → 0)
   - Confirm shard is removed from scene

5. **Multiple Users Departure:**
   - Start with 48 users
   - Decrease to 24 users
   - Verify 24 shards animate out
   - Confirm no memory leaks (check DevTools)

6. **Rapid Changes:**
   - Simulate rapid user joins/leaves (GaiaUI slider)
   - Verify no state corruption
   - Confirm smooth transitions

7. **Mood Distribution Changes:**
   - Keep count constant (48)
   - Change mood distribution (e.g., all grateful → all anxious)
   - Verify colors update without recreating shards

### Performance Benchmarks

- **Target:** 60fps with 96 shards (dense mode)
- **Memory:** No growth over 5 minutes of arrivals/departures
- **Animation smoothness:** No visible jitter or pops

---

## Technical Decisions & Rationale

### Why 2-second animation duration?
- Half of a full breath phase (4s inhale/exhale)
- Feels natural without being too slow or fast
- Aligns with breathing rhythm

### Why Fisher-Yates shuffle over interleaved distribution?
- True randomization prevents predictable patterns
- Simpler implementation (5 lines vs 20 lines)
- Users don't need perfectly balanced distribution

### Why scale animation over opacity/position?
- Scale is GPU-accelerated (no shader recompilation)
- More visually dramatic (clear "pop in" effect)
- Doesn't conflict with frosted glass material (opacity is shader-based)

### Why FIFO removal order?
- Predictable behavior for debugging
- "Oldest first" makes logical sense
- Can easily switch to random if desired

### Why incremental diffing over full recreation?
- Preserves shard identity (no flicker)
- Enables smooth animations (state is preserved)
- Better performance (only create/destroy what changed)

---

## Implementation Order

1. ✅ **Phase 1:** Color randomization (quick win, visible improvement)
2. **Phase 2:** Lifecycle state machine (foundation)
3. **Phase 3:** Incremental diffing (enables animations)
4. **Phase 4:** Scale animation (core feature)
5. **Phase 5:** Staggered arrivals (polish)
6. **Phase 6:** GPU cleanup (critical for production)

**Estimated implementation time:** 2-3 hours
**Estimated testing time:** 1 hour

---

## Future Enhancements (Out of Scope)

- **Phase-locked transitions:** Queue arrivals/departures at breath phase boundaries
- **Spiral arrival:** Shards spiral outward from globe surface
- **Mood-based animation speeds:** Different moods animate at different rates
- **Sound effects:** Subtle chime on shard spawn/removal
- **Particle trails:** Leave brief trail during spawn animation

---

## Success Criteria

- ✅ Colors randomized on each presence update
- ✅ Smooth 2s scale animation for arrivals/departures
- ✅ Staggered effect for multiple simultaneous joins
- ✅ No visual flicker or state corruption
- ✅ No GPU memory leaks over extended use
- ✅ Maintains 60fps with 96 shards
- ✅ Feels integrated with breathing meditation aesthetic

---

## Notes

- All animations use existing `easeInhale`/`easeExhale` curves from breathCalc.ts
- No new dependencies required
- Backwards compatible (no breaking changes to props)
- Can toggle animations on/off via feature flag if needed
