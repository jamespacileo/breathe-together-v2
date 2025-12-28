# ECS Architecture Reference

Core Entity-Component-System (ECS) patterns used throughout breathe-together-v2 with Koota.

---

## 7-Phase System Execution Order

Systems run in strict order each frame. **Order is critical**—changing it breaks the system. Defined in `src/providers.tsx` (KootaSystems component, lines 49-120).

### Phase Diagram

```
Frame Start
    ↓
[Phase 1] breathSystem
    └─ Calculates: breathPhase, phaseType, orbitRadius, sphereScale, crystallization
    └─ Uses: UTC time (Date.now())
    └─ Outputs: Target values for all entities to follow
    ↓
[Phase 2] particlePhysicsSystem
    └─ Uses: breathPhase to calculate particle orbit positions
    └─ Outputs: Particle state updates
    ↓
[Phase 3] cursorPositionFromLand
    └─ Ray-casts cursor from camera to terrain
    └─ Outputs: Cursor world position
    ↓
[Phase 4] velocityTowardsTarget
    └─ Accelerates entities toward their targets
    └─ Uses: Velocity, Position traits
    └─ Outputs: Updated velocity
    ↓
[Phase 5] positionFromVelocity
    └─ Updates position based on velocity
    └─ Outputs: New position
    ↓
[Phase 6] meshFromPosition
    └─ Syncs Three.js transforms with ECS position data
    └─ Outputs: Transform matrices for rendering
    ↓
[Phase 7] cameraFollowFocused
    └─ Moves camera to follow selected entity
    ↓
Render (Three.js canvas update)
↓
Frame End
```

### Why Order Matters

| Dependency | Reason |
|-----------|--------|
| **Phase 1 first** | All other systems depend on breath data |
| **Physics before Position** | Must calculate new velocities before integrating positions |
| **Position before Mesh** | Meshes must sync to finalized positions |
| **Camera last** | Follows positioned entities |

**Critical Rule:** Do NOT reorder phases. This creates race conditions and stale data.

---

## Traits: The Data Layer

Traits are immutable data containers. Every entity has traits, every system reads/writes traits.

### Trait Immutability Pattern

**Always create a new object:**

```typescript
// ❌ WRONG - mutates the trait object
const trait = entity.get(MyTrait);
trait.value = newValue;

// ✅ CORRECT - creates new trait object
const current = entity.get(MyTrait);
entity.set(MyTrait, {
  ...current,           // Preserve existing properties
  value: newValue       // Update only what changed
});
```

**Why?** Koota's change detection relies on object identity. Immutability is how the ECS knows a trait changed.

### Common Traits

#### breathPhase Trait
```typescript
// Read from breath entity
const breathEntity = world.queryFirst(breathPhase);
const breath = breathEntity.get(breathPhase);
const phase = breath.value;  // 0.0 - 1.0
```

#### Position & Velocity Traits
```typescript
// Entity position
const pos = entity.get(Position);
// { x: number, y: number, z: number }

// Entity velocity for physics
const vel = entity.get(Velocity);
// { x: number, y: number, z: number }
```

#### Custom Traits
Define in entity-specific files (e.g., `src/entities/particle/traits.tsx`):

```typescript
import { trait } from 'koota';

export const particleColor = trait<{ r: number; g: number; b: number }>();
export const particleScale = trait<{ value: number }>();
```

---

## System Registration

Systems are registered in `src/providers.tsx` within the `KootaSystems` component.

### Pattern: Registering a System

```typescript
// In src/providers.tsx, KootaSystems component
world.addSystem(mySystem, {
  phase: PhaseType.PHYSICS,    // Which execution phase
  enabled: () => someCondition // Optional: when to run
});

// System function definition
function mySystem(world: World, delta: number) {
  // Query entities with specific traits
  const entities = world.query([TraitA, TraitB]);

  // Update each entity
  entities.forEach(entity => {
    const dataA = entity.get(TraitA);
    const dataB = entity.get(TraitB);

    // Calculate new values
    const newValue = dataA.value + dataB.value;

    // Update trait immutably
    entity.set(TraitA, {
      ...dataA,
      value: newValue
    });
  });
}
```

### Phase Types

```typescript
enum PhaseType {
  LOGIC = 1,       // Phase 1 - breathSystem, calculations
  PHYSICS = 2,     // Phase 2 - particlePhysicsSystem
  INPUT = 3,       // Phase 3 - cursorPositionFromLand
  FORCES = 4,      // Phase 4 - velocityTowardsTarget
  INTEGRATION = 5, // Phase 5 - positionFromVelocity
  RENDER_SYNC = 6, // Phase 6 - meshFromPosition
  CAMERA = 7       // Phase 7 - cameraFollowFocused
}
```

---

## Entity Queries

Querying is how systems find entities to update.

### Query Patterns

**Query first entity:**
```typescript
const breathEntity = world.queryFirst(breathPhase);
if (!breathEntity) return;  // Handle missing

const breath = breathEntity.get(breathPhase);
```

**Query all entities with trait combination:**
```typescript
// Find all particles
const particles = world.query([particlePosition, particleScale]);

particles.forEach(particle => {
  const pos = particle.get(particlePosition);
  const scale = particle.get(particleScale);
  // Update...
});
```

**Query with filtering:**
```typescript
// Find active entities
const activeEntities = world.query([Position, Velocity])
  .filter(entity => entity.get(isActive)?.value);
```

### Important: Cache Query Results

```typescript
// ✅ GOOD - query once per frame
const entities = world.query([TraitA]);
entities.forEach(e => {
  // Process each
});

// ❌ BAD - queries multiple times (inefficient)
const first = world.queryFirst(TraitA);
const all = world.query([TraitA]);
const count = world.query([TraitA]).length;
```

---

## Data Flow Example: Breathing Particles

Trace how data flows through phases:

```
Frame 156 (at 2.45s of breathing cycle)
├─ Phase 1 (breathSystem)
│  ├─ Input: Date.now() = 1735343445234
│  ├─ Calculate: elapsed = 2.45s, breathPhase = 0.6125 (INHALE phase 61%)
│  ├─ Output: breathEntity.breathPhase = 0.6125, orbitRadius = 2.7
│
├─ Phase 2 (particlePhysicsSystem)
│  ├─ Input: breathPhase = 0.6125, orbitRadius = 2.7
│  ├─ Calculate: targetOrbitRadius = 2.7
│  ├─ Damp toward: current orbit radius lerps toward 2.7
│  ├─ Output: particle orbitRadius trait updated
│
├─ Phase 4 (velocityTowardsTarget)
│  ├─ Input: Particle position, target position (from orbit)
│  ├─ Calculate: direction and acceleration
│  ├─ Output: Velocity trait updated
│
├─ Phase 5 (positionFromVelocity)
│  ├─ Input: Particle position, velocity
│  ├─ Calculate: newPosition = position + velocity * delta
│  ├─ Output: Position trait updated
│
├─ Phase 6 (meshFromPosition)
│  ├─ Input: Position trait
│  ├─ Sync: Set mesh.position.x/y/z from Position
│  ├─ Output: Three.js mesh position updated
│
└─ Render
   └─ Particle visible at new position
```

---

## Best Practices

### 1. System Dependencies

Know which traits are populated by which systems:

```typescript
// If your system needs breathPhase, you depend on breathSystem
// Must run AFTER phase 1
world.addSystem(mySystem, { phase: PhaseType.PHYSICS });  // ✅ Phase 2+

// ❌ This would fail (phase before breath is calculated)
world.addSystem(mySystem, { phase: PhaseType.LOGIC });
```

### 2. Query Errors

Handle missing entities gracefully:

```typescript
const breathEntity = world.queryFirst(breathPhase);
if (!breathEntity) {
  // Entity not spawned yet, skip this frame
  return;
}

const breath = breathEntity.get(breathPhase);
if (!breath) {
  // Trait not attached, skip
  return;
}
```

### 3. No Circular Dependencies

Systems cannot depend on each other in a circle:

```
breathSystem → particlePhysics → velocity → position → mesh
(one direction only)

// ❌ BAD: mesh cannot read breathPhase directly in same phase
// ✅ GOOD: mesh reads trait that was updated by breathSystem
```

### 4. No Side Effects Outside of Entity Updates

Systems should only modify entity traits, never:
- React state
- DOM elements (except through Three.js)
- Global variables
- Network requests

```typescript
// ❌ Wrong
function badSystem(world: World) {
  console.log("This system ran");  // Side effect
  localStorage.setItem("data", "value");  // Side effect
}

// ✅ Correct
function goodSystem(world: World) {
  const entities = world.query([MyTrait]);
  entities.forEach(e => {
    e.set(MyTrait, { /* updated value */ });
  });
}
```

---

## Integration Points

This reference is used by:
- [ecs-entity skill](../skills/ecs-entity/SKILL.md) - Creating new entities
- [fix-application skill](../skills/fix-application/SKILL.md) - Fixing system behavior
- [kaizen-improvement workflow](../workflows/kaizen-improvement/WORKFLOW.md) - System optimization
- [breath-synchronization skill](../skills/breath-synchronization/SKILL.md) - Breathing integration
