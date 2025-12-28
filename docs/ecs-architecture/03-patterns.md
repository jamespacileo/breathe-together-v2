# ECS: Patterns & Advanced Techniques

Proven patterns for building robust ECS systems.

## Pattern 1: Target/Current Value Pairs

Smooth transitions without direct mutation:

```typescript
// Define paired traits
const Position = trait({ x: 0, y: 0, z: 0 })
const TargetPosition = trait({ x: 0, y: 0, z: 0 })

// System that lerps toward target
function movementSystem(world) {
  world.query(Position, TargetPosition).updateEach(([pos, target]) => {
    pos.x += (target.x - pos.x) * 0.1
    pos.y += (target.y - pos.y) * 0.1
    pos.z += (target.z - pos.z) * 0.1
  })
}

// Set target, position follows smoothly
entity.set(TargetPosition, { x: 10, y: 20, z: 30 })
```

## Pattern 2: Delta-Based Physics

Refresh-rate independent movement:

```typescript
const SPEED = 5  // units per second

function movementSystem(world, dt) {  // dt = delta time
  world.query(Velocity, Position).updateEach(([vel, pos]) => {
    pos.x += vel.x * SPEED * dt  // Delta-independent
  })
}

// 60 FPS: dt ≈ 0.016, movement ≈ 0.08 units
// 144 FPS: dt ≈ 0.007, movement ≈ 0.035 units per frame
// Result: Same speed across all framerates
```

## Pattern 3: Trait Pools

Pre-allocate traits for pooled entities:

```typescript
class EntityPool {
  entities: Entity[] = []

  constructor(world: World, count: number) {
    for (let i = 0; i < count; i++) {
      const entity = world.spawn(Position, Velocity, Particle)
      entity.remove(Active)  // Deactivate
      this.entities.push(entity)
    }
  }

  acquire(): Entity | null {
    return this.entities.pop() ?? null
  }

  release(entity: Entity) {
    entity.remove(Active)
    this.entities.push(entity)
  }
}

// Usage
const particlePool = new EntityPool(world, 1000)
const particle = particlePool.acquire()
// use particle...
particlePool.release(particle)
```

## Pattern 4: Event Traits

Transient data for one-frame events:

```typescript
// Event trait (data only)
const Damaged = trait({ amount: 0, source: null })
const DamageEvent = trait({ active: false })

// System 1: Create damage events
function damageSystem(world) {
  world.query(Projectile, Health).updateEach(([proj, health]) => {
    if (collides(proj, health)) {
      // Create event
      health.damaged = true
      health.damageAmount = proj.damage
    }
  })
}

// System 2: React to damage events
function damageResponseSystem(world) {
  world.query(Health).forEach((entity) => {
    const health = entity.get(Health)
    if (health.damaged) {
      health.current -= health.damageAmount
      health.damaged = false  // Clear for next frame
    }
  })
}
```

## Pattern 5: Condition-Based Queries

Use traits as condition flags:

```typescript
const Active = trait({ flag: true })
const Dead = trait({})

// Query only active, non-dead entities
world.query(Active, Position)
  .exclude(Dead)
  .updateEach(([pos]) => {
    // Only active entities update
  })
```

## Pattern 6: System Composition

Combine systems into logical groups:

```typescript
function createPhysicsGroup(world) {
  return [
    createVelocitySystem(world),
    createCollisionSystem(world),
    createConstraintSystem(world),
  ]
}

function createRenderingGroup(world) {
  return [
    createMeshSyncSystem(world),
    createAnimationSystem(world),
    createParticleSystem(world),
  ]
}

// Use in main loop
const systems = [
  ...createPhysicsGroup(world),
  ...createRenderingGroup(world),
]

useFrame(({ clock }) => {
  systems.forEach(system => system(clock.getDelta()))
})
```

## Pattern 7: Lazy Evaluation

Defer expensive operations until needed:

```typescript
const CameraFocus = trait({ entityId: null })
const CameraFollowLazy = trait({ targetId: null, computed: false })

function cameraComputeSystem(world) {
  world.query(CameraFollowLazy).forEach((entity) => {
    if (!entity.get(CameraFollowLazy).computed) {
      const target = world.getEntityById(entity.get(CameraFollowLazy).targetId)
      entity.set(CameraFollowLazy, { ...entity.get(CameraFollowLazy), computed: true })
    }
  })
}
```

## Pattern 8: Hierarchical Systems

Parent-child relationships:

```typescript
const Parent = trait({ parentId: null })
const Child = trait({ childrenIds: [] })

function hierarchySystem(world) {
  world.query(Parent, Position).updateEach(([parent, pos]) => {
    const parentEntity = world.getEntityById(parent.parentId)
    if (parentEntity) {
      const parentPos = parentEntity.get(Position)
      pos.x = parentPos.x + parent.offset.x
      pos.y = parentPos.y + parent.offset.y
    }
  })
}
```

---

## Related Resources

- [Koota Advanced Patterns](../koota/01-advanced-patterns.md)
- [Previous: Data Flow](./02-data-flow.md)
- [Project Pipeline](../project-specific/01-system-pipeline.md)
