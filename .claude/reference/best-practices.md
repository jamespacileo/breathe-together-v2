# Best Practices Reference

Core patterns and anti-patterns for writing performant, maintainable code in breathe-together-v2.

---

## React Three Fiber (R3F) Patterns

### useFrame Hook: Animation Best Practice

**Pattern (Correct):**
```typescript
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';

function AnimatedEntity() {
  const meshRef = useRef();

  useFrame((state, delta) => {
    // Direct mutation - NO state updates
    meshRef.current.position.x += delta * 0.5;
    meshRef.current.rotation.z += delta * 0.1;
  });

  return <mesh ref={meshRef} />;
}
```

**Why This Works:**
- Direct mutation is performant (no React re-render)
- `delta` is frame-time-independent (runs same speed at 60fps or 30fps)
- `state` provides `clock`, `camera`, `scene` access
- Per-frame updates are responsive and smooth

**Anti-patterns to Avoid:**

```typescript
// ❌ WRONG: setState in render loop causes re-renders and lag
const [x, setX] = useState(0);
useFrame(() => setX(x + 0.1));  // Triggers re-render every frame!

// ❌ WRONG: Object creation in hot loop = garbage collection pressure
useFrame(() => {
  ref.current.position.lerp(new THREE.Vector3(x, y, z), 0.1);
  // Creates new Vector3 every frame → GC pauses → frame drops
});

// ❌ WRONG: Using setInterval instead of useFrame
useEffect(() => {
  const id = setInterval(() => {
    ref.current.position.x += 0.1;  // Runs at fixed rate, not frame-rate independent
  }, 16);
  return () => clearInterval(id);
}, []);
```

---

### Smooth Transitions with Lerp

**Pattern:**
```typescript
import THREE from 'three';
import { useFrame } from '@react-three/fiber';

function SmoothTransition() {
  const meshRef = useRef();

  useFrame(() => {
    const targetX = active ? 5 : 0;
    // Smoothly lerp toward target
    meshRef.current.position.x = THREE.MathUtils.lerp(
      meshRef.current.position.x,
      targetX,
      0.1  // Speed: 0-1 (lower = slower/smoother)
    );
  });

  return <mesh ref={meshRef} />;
}
```

**When to Use:**
- Smooth state transitions
- Continuous damping/spring effects
- Responsive but not instant motion
- Perfect for breathing-synced animations

**Speed Parameter Guide:**
- 0.05: Very slow, smooth (heavy)
- 0.1: Smooth, responsive
- 0.2: Balanced (recommended)
- 0.3-0.5: Fast, responsive
- 1.0: Instant (jerky, avoid)

---

### Object Reuse in Hot Loops

**Pattern (Good):**
```typescript
// Create reusable vector OUTSIDE the loop
const tempVector = new THREE.Vector3();

function AnimatedMeshes() {
  useFrame(() => {
    meshes.forEach(mesh => {
      // Reuse vector instead of creating new one each frame
      tempVector.set(targetX, targetY, targetZ);
      mesh.position.lerp(tempVector, 0.1);
    });
  });

  return /* render meshes */;
}
```

**Pattern (Bad):**
```typescript
function AnimatedMeshes() {
  useFrame(() => {
    meshes.forEach(mesh => {
      // ❌ Creates new Vector3 every frame
      mesh.position.lerp(new THREE.Vector3(x, y, z), 0.1);
      // This triggers garbage collection every frame → frame drops
    });
  });

  return /* render meshes */;
}
```

**Why This Matters:**
- Object allocation is expensive in tight loops
- GC pauses cause frame drops (60fps → 30fps stuttering)
- Reusing prevents excessive garbage collection
- One Vector3 per system can handle 300+ particles

---

### Instanced Mesh Performance

**When to Use:**
- Many identical objects (particles, clones, grid items)
- Each instance has same geometry/material
- Different transforms (position, rotation, scale)

**Current Implementation:**
```typescript
// ParticleSystem uses InstancedMesh
// 300 particles = 1 draw call (instead of 300)
const geometry = new THREE.IcosahedronGeometry(1, 2);
const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const instances = new THREE.InstancedMesh(geometry, material, 300);

// Update individual particle transforms
const matrix = new THREE.Matrix4();
particles.forEach((particle, i) => {
  matrix.compose(particle.position, particle.quaternion, particle.scale);
  instances.setMatrixAt(i, matrix);
});
instances.instanceMatrix.needsUpdate = true;
```

**Performance Impact:**
- 300 separate meshes: 300 draw calls
- 1 instanced mesh: 1 draw call (100x improvement)
- Memory: Shared geometry/material
- Update cost: O(n) matrix updates (still fast)

---

## ECS Architecture Patterns

### Trait Immutability Pattern

**Correct:**
```typescript
// Always create new trait object
const current = entity.get(MyTrait);
entity.set(MyTrait, {
  ...current,        // Preserve existing values
  changedProp: newValue,  // Update only what changed
});
```

**Wrong:**
```typescript
// ❌ Mutates the trait object (breaks change detection)
const trait = entity.get(MyTrait);
trait.value = newValue;

// ❌ Or storing reference and mutating later
const ref = entity.get(MyTrait);
ref.value = newValue;  // Change not detected
```

**Why?** Koota's change detection relies on object identity. Immutability is how systems know a trait changed.

---

### System Dependencies: Execution Order

**Know your dependencies:**

If your system needs data from another system, it must run AFTER that system.

```typescript
// breathSystem (Phase 1) outputs: breathPhase, orbitRadius, sphereScale
// particlePhysicsSystem (Phase 2) inputs: breathPhase, orbitRadius
// → particlePhysicsSystem MUST be Phase 2 (after Phase 1)

// ✅ CORRECT: Reads data from previous phases
world.addSystem(particlePhysicsSystem, { phase: PhaseType.PHYSICS });  // Phase 2

// ❌ WRONG: Would run before breathSystem calculates data
world.addSystem(particlePhysicsSystem, { phase: PhaseType.LOGIC });   // Phase 1
```

---

### Query Efficiency

**Query once per frame:**

```typescript
// ✅ GOOD: Query result cached
const entities = world.query([TraitA, TraitB]);
console.log("Found", entities.length, "entities");
entities.forEach(e => {
  // Process
});

// ❌ BAD: Queries multiple times (4 separate queries!)
const count = world.query([TraitA, TraitB]).length;
const first = world.queryFirst([TraitA, TraitB]);
const all = world.query([TraitA, TraitB]);
const last = world.query([TraitA, TraitB])[0];
```

---

### No Side Effects Outside of Entity Updates

**Correct:**
```typescript
function mySystem(world: World, delta: number) {
  // Only modifies entity traits
  const entities = world.query([Position, Velocity]);
  entities.forEach(e => {
    const pos = e.get(Position);
    const vel = e.get(Velocity);
    e.set(Position, {
      x: pos.x + vel.x * delta,
      y: pos.y + vel.y * delta,
      z: pos.z + vel.z * delta,
    });
  });
}
```

**Wrong:**
```typescript
function mySystem(world: World) {
  console.log("System ran");  // ❌ Side effect
  localStorage.setItem("data", "value");  // ❌ Side effect
  fetch("/api/data");  // ❌ Side effect
  setState(newValue);  // ❌ React state

  // Systems should ONLY update entities
}
```

---

## Three.js Performance

### Geometry & Material Reuse

**Pattern:**
```typescript
// Create once
const geometry = new THREE.IcosahedronGeometry(1, 2);
const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });

// Reuse many times
for (let i = 0; i < 300; i++) {
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
}
```

**Why:**
- Shared geometry = shared buffer data
- Shared material = reused shaders
- Reduces VRAM usage significantly
- Reduces draw call cost

---

### Update Flags: Tell Three.js When to Recalculate

**When to use:**
```typescript
// After modifying geometry attributes
geometry.attributes.position.needsUpdate = true;

// After changing texture
material.map.needsUpdate = true;
material.needsUpdate = true;

// After changing material properties
light.shadow.map.needsUpdate = true;
```

**When NOT needed:**
- Position/rotation/scale on mesh (Three.js detects automatically)
- Viewport size changes (handled by canvas)
- Color uniform changes (shader re-runs automatically)

---

## Breathing Synchronization Patterns

### Parameter Visibility Thresholds

For breathing effects to be noticeable:

```
Parameter change < 15%  → Invisible
Parameter change 15-20% → Barely visible, unreliable
Parameter change 20-30% → ✅ Clearly visible
Parameter change 30-50% → Obvious
Parameter change > 50%  → May feel exaggerated
```

**Rule of thumb:** Target 20-30% parameter variation for clear visual feedback without overshooting.

### Damping Speed for Breath Response

For breathing animations to feel natural:

```typescript
// Too slow: Feels disconnected
speed: 0.1  // 166ms lag → doesn't track breathing

// Balanced: Smooth and responsive ✅
speed: 0.2-0.3  // 83-55ms lag → good feel

// Too fast: May feel twitchy
speed: 0.5-1.0  // 30-0ms lag → jerky
```

### Easing Functions for Smooth Transitions

Always use easing, never linear:

```typescript
// ✅ Natural, meditation-appropriate
easeInOutQuad(t)  // Slow start, peak, slow finish

// ❌ Jerky, robotic
Linear interpolation (t)  // Constant speed throughout
```

---

## Performance Optimization Checklist

When optimizing systems:

### Profiling
- [ ] Use DevTools Performance tab
- [ ] Identify bottlenecks (60fps vs drops)
- [ ] Measure FPS before and after
- [ ] Check memory for leaks (stable growth?)

### Common Optimizations
- [ ] Reduce draw calls (use instanced mesh)
- [ ] Reuse objects (no object creation in hot loops)
- [ ] Cache query results (don't query every frame)
- [ ] Remove unnecessary updates (check enabled conditions)
- [ ] Reduce particle count at lower quality
- [ ] Use LOD (level-of-detail) for distant objects

### Validation After Optimization
- [ ] FPS maintained or improved
- [ ] No visual degradation
- [ ] Memory stable (no growing leaks)
- [ ] Animation smoothness preserved
- [ ] No new console errors

---

## Anti-Patterns to Avoid

| Anti-Pattern | Problem | Solution |
|---|---|---|
| setState in useFrame | Triggers re-renders, kills FPS | Use direct mutation |
| Object creation in loops | Garbage collection pauses | Reuse objects outside loops |
| Multiple queries per frame | Unnecessary overhead | Cache query results |
| Mutating trait objects | Breaks change detection | Always entity.set() |
| Side effects in systems | Breaks determinism | Only modify entities |
| Reordering phases | Race conditions | NEVER change phase order |
| Linear easing for breathing | Feels robotic | Always use easeInOutQuad |
| Parameters <20% change | Invisible | Target 20-30% variation |
| Damping speed <0.1 | Feels disconnected | Use 0.2-0.5 |
| Three.js warnings ignored | Future bugs | Fix warnings immediately |

---

## Integration Points

This reference is used by:
- [fix-application skill](../skills/fix-application/SKILL.md) - Applying fixes correctly
- [breath-synchronization skill](../skills/breath-synchronization/SKILL.md) - Breathing integration
- [ecs-entity skill](../skills/ecs-entity/SKILL.md) - Creating systems
- [kaizen-improvement workflow](../workflows/kaizen-improvement/WORKFLOW.md) - Performance tuning
- [triplex-component skill](../skills/triplex-component/SKILL.md) - Component creation
