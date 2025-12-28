# Fix-Application Reference

Complete best practices and validation rules for applying fixes in breathe-together-v2.

---

## Library Best Practices

### React Three Fiber (@react-three/fiber)

#### useFrame Hook for Animations

**Pattern (Recommended):**
```typescript
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'

function AnimatedEntity() {
  const meshRef = useRef()

  useFrame((state, delta) => {
    // Direct mutation - no setState
    meshRef.current.position.x += delta
    meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime) * 0.5)
  })

  return <mesh ref={meshRef} />
}
```

**Why:**
- Direct mutation is performant (no React re-render overhead)
- Delta time ensures frame-rate independent motion
- State object provides clock, camera, scene access
- Per-frame updates are responsive and smooth

**Anti-patterns to avoid:**
```typescript
// ❌ setState in render loop - creates re-renders, inefficient
const [x, setX] = useState(0)
useFrame(() => setX(x + 0.1))

// ❌ Object creation in hot loop - GC pressure
useFrame(() => {
  ref.current.position.lerp(new THREE.Vector3(x, y, z), 0.1)
})

// ❌ Using interval instead of useFrame - not refresh-rate independent
useEffect(() => {
  const id = setInterval(() => {
    ref.current.position.x += 0.1
  }, 16)
  return () => clearInterval(id)
}, [])
```

#### Smooth Animation with Lerp

**Pattern:**
```typescript
import THREE from 'three'

useFrame(() => {
  const targetPos = active ? 100 : 0
  // Lerp smoothly toward target
  meshRef.current.position.x = THREE.MathUtils.lerp(
    meshRef.current.position.x,
    targetPos,
    0.1  // Speed factor (0-1, lower = slower/smoother)
  )
})
```

**When to use:**
- Smooth transitions between states
- Continuous damping/spring effects
- Responsive but not instant motion

#### Object Reuse in Hot Loops

**Pattern (Good):**
```typescript
const vec = new THREE.Vector3()

useFrame(() => {
  vec.set(x, y, z)
  ref.current.position.lerp(vec, 0.1)
})
```

**Pattern (Bad):**
```typescript
useFrame(() => {
  // ❌ Creates new Vector3 every frame - GC pressure
  ref.current.position.lerp(new THREE.Vector3(x, y, z), 0.1)
})
```

**Why:**
- Reusing objects minimizes garbage collection
- GC pauses cause frame drops (60fps → stuttering)
- Object allocation is expensive in tight loops

#### Instanced Mesh Performance

**When to use:**
- Many identical objects (particles, clones)
- Each instance has same geometry/material but different transforms

**Current usage in project:**
```typescript
// ParticleSystem uses InstancedMesh
// 300 particles = 1 draw call (instead of 300)
// Matrix updates are fast: setMatrixAt(index, matrix)
```

---

### Koota ECS Architecture

#### Trait Immutability

**Pattern (Correct):**
```typescript
// Traits are immutable - always create new object
const currentTrait = entity.get(MyTrait)
entity.set(MyTrait, {
  ...currentTrait,  // Spread current values
  changedProp: newValue,  // Update only what changed
})
```

**Why:**
- ECS relies on trait identity changes to detect updates
- Immutability prevents subtle bugs from shared references
- Required by Koota's change detection system

#### System Execution Order (Critical)

**Current order (src/providers.tsx lines 49-120):**
1. **Phase 1 (LOGIC):** breathSystem - Calculates global breath state
2. **Phase 2 (PHYSICS):** particlePhysicsSystem - Uses breath data for physics
3. **Phase 3 (INPUT):** cursorPositionFromLand - Ray cast
4. **Phase 4 (FORCES):** velocityTowardsTarget - Acceleration
5. **Phase 5 (INTEGRATION):** positionFromVelocity - Position updates
6. **Phase 6 (RENDER SYNC):** meshFromPosition - Visual updates
7. **Phase 7 (CAMERA):** cameraFollowFocused - Camera follow

**Why order matters:**
- breathSystem MUST run first (all other systems depend on it)
- Physics must run before position integration
- Visual updates must happen after positions finalize
- Reordering causes race conditions and stale data

**DO NOT REORDER PHASES** - this breaks the entire system.

#### Trait Queries

**Pattern (Good):**
```typescript
// Query once, use multiple times
const breathEntity = world.queryFirst(BreathPhase)
if (!breathEntity) return  // Handle missing

const breath = breathEntity.get(BreathPhase)
const phase = breath.breathPhase
const damping = breath.crystallization

// Use breath data multiple times
entities.forEach(entity => {
  const scale = 1 + phase * 0.5
  const opacity = 0.5 + damping * 0.5
  entity.set(MyTrait, { scale, opacity })
})
```

**Pattern (Bad):**
```typescript
// ❌ Query multiple times (unnecessary overhead)
const breath1 = world.queryFirst(BreathPhase).get(BreathPhase)
const breath2 = world.queryFirst(BreathPhase).get(BreathPhase)  // Redundant

// ❌ Store reference to trait object (breaks immutability)
const breathRef = world.queryFirst(BreathPhase)
// Later: breathRef.value = newValue (WRONG - mutating)
```

---

### Three.js Performance

#### Geometry & Material Reuse

**Pattern:**
```typescript
// Create once, reuse
const geometry = new THREE.IcosahedronGeometry(1, 2)
const material = new THREE.MeshStandardMaterial({ color: 0xff0000 })

// Create multiple meshes with same geometry/material
for (let i = 0; i < 300; i++) {
  const mesh = new THREE.Mesh(geometry, material)
  scene.add(mesh)
}
```

**Why:**
- Shared geometry = shared buffer data
- Shared material = reused shaders
- Reduces VRAM usage and draw call cost

#### Update Flags

**Pattern:**
```typescript
// Tell Three.js to recalculate when geometry changes
geometry.attributes.position.needsUpdate = true

// Tell Three.js to recalculate when material properties change
material.map.needsUpdate = true
material.needsUpdate = true
```

**When to use:**
- After modifying geometry attributes
- After changing texture
- After changing material properties
- Only if Three.js doesn't detect changes automatically

---

## Validation Rules

### Breathing Synchronization Fixes

**Must run breath-sync-validator** to check:
1. BreathEntity spawned in scene
2. breathSystem runs in Phase 1
3. Entity queries breath traits
4. Entity system registered in correct phase
5. Visual parameter ranges adequate (>20% change)
6. Damping constants responsive (>0.2 speed)
7. Adaptive quality not disabling entity
8. Entity updates every frame

**Phase-specific validation:**

| Phase | breathPhase | Expected |
|-------|-----------|----------|
| INHALE (0-4s) | 0→1 | orbitRadius 3.5→1.8, sphereScale 0.6→1.4 |
| HOLD-IN (4-8s) | ~1 | Particles contracted, crystallization 0.5→0.9 |
| EXHALE (8-12s) | 1→0 | orbitRadius 1.8→3.5, sphereScale 1.4→0.6 |
| HOLD-OUT (12-16s) | ~0 | Particles expanded, crystallization 0.4→0.75 |

**Parameter range checks:**

| Parameter | Minimum Visible | Recommended | Unit |
|-----------|-----------------|-------------|------|
| Scale multiplier | 0.15 | 0.3-0.5 | ± % |
| Opacity change | 0.15 | 0.3-0.5 | ± % |
| Position offset | 0.5 | 1.0-2.0 | units |
| Color hue | 10° | 20-30° | degrees |
| Damping speed | - | >0.2 | scalar (0-1) |

**Damping speed interpretation:**

| Speed | Lag Time | Feel | Use When |
|-------|----------|------|----------|
| 0.05 | 200ms | Very sluggish, hides motion | ❌ Avoid |
| 0.1 | 166ms | Heavy smoothing, disconnected | ⚠️ Check fix |
| 0.2 | 83ms | Moderate, balanced | ✅ OK |
| 0.3-0.5 | 30-55ms | Responsive, smooth | ✅ Preferred |
| 1.0 | 0ms | No smoothing, jerky | ❌ Avoid |

**Visual feedback expectations:**
- Visible change: ≥20% parameter variation
- Smooth motion: No jitter, consistent 60fps
- Responsive: Lag <100ms, feels synchronized
- Natural: Eased curves, not linear motion

---

### ECS Architecture Validation

**Trait Immutability:**
- [ ] Never mutate trait object directly
- [ ] Always create new object with `entity.set(Trait, {...})`
- [ ] Preserve existing values with spread operator
- [ ] Only change what needs changing

**System Registration:**
- [ ] System function added to KootaSystems component
- [ ] Correct phase for dependencies (breath first, visuals last)
- [ ] Enabled condition works correctly
- [ ] No circular dependencies between systems

**Data Flow:**
- [ ] Systems read from correct phase (have fresh data)
- [ ] Systems write to traits immutably
- [ ] No side effects outside of entity updates
- [ ] Query results used correctly

---

### React Three Fiber Validation

**useFrame Usage:**
- [ ] Using direct mutation (not setState)
- [ ] Not creating objects in loop
- [ ] Proper ref usage with `useRef()`
- [ ] Delta time used for frame-rate independence

**Performance:**
- [ ] No console errors/warnings
- [ ] 60fps maintained in DevTools
- [ ] Memory stable (no growing leaks)
- [ ] Instanced mesh draw calls unchanged

**Integration:**
- [ ] Works within Canvas context
- [ ] Refs properly connected
- [ ] Effects cleanup correctly
- [ ] No stale closures

---

### Triplex Visual Editor Validation

**JSDoc Annotations:**
```typescript
/**
 * Breathing pulse intensity multiplier
 * @min 0
 * @max 1
 * @step 0.05
 * @default 0.3
 */
breathPulseIntensity: number;
```

**Preservation:**
- [ ] @min/@max/@step annotations unchanged
- [ ] @default values updated if parameter changed
- [ ] JSDoc comments retained for clarity
- [ ] Triplex editor still shows parameters

**Testing:**
- [ ] Open Triplex visual editor
- [ ] Verify component still appears
- [ ] Check parameters editable
- [ ] Adjust values and verify hot-reload works

---

## Common Validation Scenarios

### Scenario 1: Parameter Tuning for Visibility

**Validation steps:**
```
1. Run breath-sync-validator on entity
   → Confirm Checks 1-4 pass (integration correct)
   → Check 5 shows current range
   → If <20% variation, visibility issue confirmed

2. Increase parameter by 2-3x (moderate approach)

3. Run npm run dev and test
   → Watch all 4 breathing phases
   → Verify smooth motion (not jerky)
   → Confirm clear visual change

4. Check performance
   → DevTools FPS: should still be 60
   → No new console errors
   → Memory stable

5. Re-run breath-sync-validator
   → All checks should still pass
   → Visual range now adequate (>20%)
```

### Scenario 2: Reducing Heavy Damping

**Validation steps:**
```
1. Identify damping speed (locate in breath/systems.tsx)
   → Current speed: 0.1 (166ms lag)

2. Increase speed to 0.3 (moderate approach)
   → New lag: 55ms (3x faster)
   → Still smooth (not instant)

3. Run npm run dev and test
   → Watch for jitter (increased lag response)
   → Verify responsive (not sluggish)
   → Check animation smoothness

4. Performance validation
   → DevTools: 60fps maintained
   → No frame drops
   → Smooth easing throughout

5. Run breath-sync-validator
   → Check 6: Damping constants reasonable (✅)
   → Phase behavior: responsive and smooth (✅)
```

### Scenario 3: Library Pattern Replacement

**Validation steps:**
```
1. Research in Context7
   → Search for library pattern
   → Compare with current implementation
   → Check community examples

2. Validate equivalence
   → Same behavior? (test with console.log)
   → Same performance? (or better?)
   → Same code clarity? (simpler?)

3. Apply change with comments
   → Document why library pattern is better
   → Link to Context7 documentation
   → Keep reference to old pattern in comment

4. Test thoroughly
   → Run dev server
   → Verify all entity behaviors work
   → Check performance unchanged or improved

5. Code review
   → Ensure pattern follows library recommendations
   → Check for missing edge cases
   → Validate error handling
```

---

## Integration Points

### With breath-sync-validator

**When to call:**
- Any fix affecting particles, sphere, or breathing motion
- Any fix involving damping or parameter tuning
- Confirms breathing synchronization still works

**Expected checks passed:**
- ✅ Check 1: Breath entity spawned
- ✅ Check 2: breathSystem in Phase 1
- ✅ Check 3: Entity queries breath traits
- ✅ Check 4: Entity system registered
- ✅ Check 5: Visual ranges adequate
- ✅ Check 6: Damping constants responsive
- ✅ Check 7: Quality not disabling
- ✅ Check 8: Updates every frame

### With Context7

**When to use:**
- Before writing any custom code
- To find library patterns
- To verify best practices
- To research similar implementations

**Libraries to search:**
- `/pmndrs/react-three-fiber` - Animation, components, patterns
- `/mrdoob/three.js` - Graphics, geometry, materials
- `/skybrian/maath` - Easing, damping, math utilities

### With ECS-Entity Skill (Future)

**When to use:**
- Any fix affecting system behavior
- New trait definitions needed
- System execution order issues
- Data flow validation

---

## Reference URLs

### Context7 Documentation
- React Three Fiber: `/pmndrs/react-three-fiber`
- Three.js: `/mrdoob/three.js`
- Koota: (check library docs when available)

### Project Files
- Breath validation: `.claude/skills/breath-sync-validator/SKILL.md`
- ECS patterns: `CLAUDE.md` in project root
- System order: `src/providers.tsx` lines 49-120
- Breath calculation: `src/lib/breathCalc.ts`

---

Let's fix with confidence! 🚀
