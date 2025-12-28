# Koota: Common Gotchas & Pitfalls

Avoid these common mistakes when working with Koota ECS.

## Gotcha 1: Forgetting to Cache Queries

### The Problem

```typescript
// ❌ DON'T DO THIS - Hashes query every frame
function updateMovement(world, dt) {
  for (let frame = 0; frame < 60; frame++) {
    world.query(Position, Velocity).updateEach(([pos, vel]) => {
      pos.x += vel.x * dt
    })
  }
}
```

### The Impact

- Performance degrades as entity count grows
- Hashing overhead accumulates
- CPU usage 10-30% higher than necessary

### The Solution

```typescript
// ✅ DO THIS - Cache the query
import { cacheQuery } from 'koota'

const positionVelocityQuery = cacheQuery(Position, Velocity)

function updateMovement(world, dt) {
  for (let frame = 0; frame < 60; frame++) {
    world.query(positionVelocityQuery).updateEach(([pos, vel]) => {
      pos.x += vel.x * dt
    })
  }
}
```

---

## Gotcha 2: Creating Objects in updateEach Loops

### The Problem

```typescript
// ❌ DON'T DO THIS - Allocates new Three.Vector3 every iteration
world.query(Position, Target).updateEach(([pos, target]) => {
  const direction = new THREE.Vector3(target.x - pos.x, target.y - pos.y, 0)
    .normalize()
  pos.x += direction.x * speed
  pos.y += direction.y * speed
})
```

### The Impact

- Garbage collection pressure
- Frame time spikes every 30-60 frames
- Memory usage grows continuously

### The Solution

```typescript
// ✅ DO THIS - Reuse objects
const tempVec = new THREE.Vector3()
const tempDir = new THREE.Vector3()

world.query(Position, Target).updateEach(([pos, target]) => {
  tempVec.set(target.x - pos.x, target.y - pos.y, 0)
  tempDir.copy(tempVec).normalize()
  pos.x += tempDir.x * speed
  pos.y += tempDir.y * speed
})
```

---

## Gotcha 3: Modifying Entities During Query Iteration

### The Problem

```typescript
// ❌ DON'T DO THIS - Modifying query results while iterating
world.query(Health).forEach((entity) => {
  const health = entity.get(Health)
  if (health.current <= 0) {
    entity.destroy()  // ← Modifying during iteration!
  }
})
```

### The Impact

- Undefined behavior
- Skipped entities
- Crashed queries

### The Solution

```typescript
// ✅ DO THIS - Collect entities first, then modify
const deadEntities: Entity[] = []

world.query(Health).forEach((entity) => {
  const health = entity.get(Health)
  if (health.current <= 0) {
    deadEntities.push(entity)
  }
})

// Now destroy them
deadEntities.forEach((entity) => {
  entity.destroy()
})
```

---

## Gotcha 4: Not Cleaning Up in React Effects

### The Problem

```typescript
// ❌ DON'T DO THIS - Memory leak, entity not destroyed
function PlayerComponent() {
  const world = useWorld()

  useEffect(() => {
    const player = world.spawn(Position, Health)
    // Missing return to cleanup!
  }, [world])

  return null
}
```

### The Impact

- Entities accumulate in memory
- World grows unbounded
- Performance degrades over time

### The Solution

```typescript
// ✅ DO THIS - Clean up on unmount
function PlayerComponent() {
  const world = useWorld()

  useEffect(() => {
    const player = world.spawn(Position, Health)

    return () => {
      player.destroy()  // Clean up
    }
  }, [world])

  return null
}
```

---

## Gotcha 5: Querying Without Traits

### The Problem

```typescript
// ❌ DON'T DO THIS - No trait requirements = all entities
function updateActive(world) {
  world.query().updateEach((entity) => {
    // This runs for EVERY entity in the world!
  })
}
```

### The Impact

- Unexpected performance degradation
- Updates affect unrelated entities
- Hard to debug

### The Solution

```typescript
// ✅ DO THIS - Always specify traits
function updateActive(world) {
  world.query(Active, Position).updateEach(([pos]) => {
    // Only active entities with position
  })
}
```

---

## Gotcha 6: Assuming Query Order is Stable

### The Problem

```typescript
// ❌ DON'T DO THIS - Assuming stable order
const entities = world.query(Position)

for (let i = 0; i < entities.length; i++) {
  // indices might change between frames!
  renderParticle(i, entities[i])
}
```

### The Impact

- Particles jump positions unexpectedly
- Visual glitches when entities spawn/despawn
- Particle trails break

### The Solution

```typescript
// ✅ DO THIS - Use entity IDs or stable references
const entityMap = new Map()

world.query(Position).forEach((entity) => {
  const id = entity.id()
  const pos = entity.get(Position)
  entityMap.set(id, pos)
  render(id, pos)
})
```

---

## Gotcha 7: Trait Mutation Side Effects

### The Problem

```typescript
// ❌ DON'T DO THIS - Mutating trait object
function applyDamage(world, amount) {
  world.query(Health).forEach((entity) => {
    const health = entity.get(Health)
    health.current -= amount  // Directly mutate
  })
}

// Later, observers might not detect this change
entity.get(Health)  // Might be stale
```

### The Impact

- React components don't re-render
- Observers miss updates
- State becomes inconsistent

### The Solution

```typescript
// ✅ DO THIS - Use .set() to trigger observers
function applyDamage(world, amount) {
  world.query(Health).forEach((entity) => {
    const health = entity.get(Health)
    entity.set(Health, {
      ...health,
      current: health.current - amount
    })
  })
}
```

---

## Gotcha 8: useQuery Without Dependency Array

### The Problem

```typescript
// ❌ DON'T DO THIS - No dependency = runs constantly
function EnemyList() {
  const enemies = useQuery(Enemy)  // Missing dependencies!

  useEffect(() => {
    console.log('Enemies:', enemies.length)  // Logs every render
  })

  return <div>{enemies.length} enemies</div>
}
```

### The Impact

- Infinite re-renders
- Effects trigger unnecessarily
- Performance degradation

### The Solution

```typescript
// ✅ DO THIS - Proper dependencies
function EnemyList() {
  const enemies = useQuery(Enemy)

  useEffect(() => {
    console.log('Enemies changed:', enemies.length)
  }, [enemies.length])  // Depend on what matters

  return <div>{enemies.length} enemies</div>
}
```

---

## Gotcha 9: System Circular Dependencies

### The Problem

```typescript
// ❌ DON'T DO THIS - System A depends on B, B depends on A
const systemA = (world) => {
  const query = world.query(HasB)
  // ...
}

const systemB = (world) => {
  const query = world.query(HasA)
  // ...
}

// Which runs first?
```

### The Impact

- Undefined behavior
- One frame delayed responses
- Hard to debug state issues

### The Solution

```typescript
// ✅ DO THIS - Create a clear execution order
const systems = [
  createInputSystem(world),      // Read input
  createMovementSystem(world),   // Update position
  createCollisionSystem(world),  // Check collisions
  createDamageSystem(world),     // Apply damage
  createRenderSystem(world),     // Display results
]

// Systems run in order, no circular dependencies
```

---

## Gotcha 10: Not Excluding Excluded Entities

### The Problem

```typescript
// ❌ DON'T DO THIS - Queries include excluded entities accidentally
const entity = world.spawn(Position)
entity.add(IsExcluded)

const query = world.query(Position)
const hasEntity = query.some((e) => e === entity)

console.log(hasEntity)  // true! They're still there!
```

### The Impact

- Excluded entities are still processed
- Systems operate on unintended entities
- Debugging becomes confusing

### The Solution

```typescript
// ✅ DO THIS - Explicitly exclude in your queries
const query = world.query(Position).exclude(IsExcluded)
// or
const query = world.query(Position, NotExcluded)

// Now excluded entities won't appear
```

---

## Gotcha 11: Sharing Trait Objects Between Entities

### The Problem

```typescript
// ❌ DON'T DO THIS - Same object shared between entities
const sharedHealth = { current: 100, max: 100 }

const player1 = world.spawn(Health)
player1.set(Health, sharedHealth)

const player2 = world.spawn(Health)
player2.set(Health, sharedHealth)  // ← SAME object!

// Damage player1
player1.get(Health).current = 50

// player2 also takes damage!
console.log(player2.get(Health).current)  // 50
```

### The Impact

- Entities affect each other unexpectedly
- Debugging is a nightmare
- Data corruption

### The Solution

```typescript
// ✅ DO THIS - Create new objects
const player1 = world.spawn(Health)
player1.set(Health, { current: 100, max: 100 })

const player2 = world.spawn(Health)
player2.set(Health, { current: 100, max: 100 })  // Different object

// Now they're independent
```

---

## Gotcha 12: Not Understanding Trait Immutability

### The Problem

```typescript
// ❌ DON'T DO THIS - Assuming traits are mutable references
const entity = world.spawn(Position)
entity.set(Position, { x: 0, y: 0 })

const pos = entity.get(Position)
pos.x = 10  // Mutate directly

// Later...
const pos2 = entity.get(Position)
console.log(pos2.x)  // 0 or 10? Undefined!
```

### The Impact

- Updates don't persist
- State becomes inconsistent
- React observers miss updates

### The Solution

```typescript
// ✅ DO THIS - Use .set() for updates
const entity = world.spawn(Position)

entity.set(Position, { x: 0, y: 0 })

// To update, always use .set()
entity.set(Position, { x: 10, y: 0 })

// Or use updateEach
world.query(Position).updateEach(([pos]) => {
  pos.x = 10  // This is safe within updateEach
})
```

---

## Gotcha 13: Changed() Modifier Resets After Query

### The Problem

```typescript
// ❌ DON'T DO THIS - Changed() resets between queries
const changed1 = world.query(Position, Changed(Position))
  .count()  // Returns 5

const changed2 = world.query(Position, Changed(Position))
  .count()  // Returns 0! Changed() already processed
```

### The Impact

- Changed queries seem inconsistent
- Different systems get different results if they query in wrong order
- Difficult to debug

### The Solution

```typescript
// ✅ DO THIS - Cache Changed queries
import { cacheQuery } from 'koota'

const changedPositionQuery = cacheQuery(Position, Changed(Position))

function system1(world) {
  // All systems use same cached query
  const count = world.query(changedPositionQuery).count()
  console.log('Changed:', count)  // Returns 5
}

function system2(world) {
  const count = world.query(changedPositionQuery).count()
  console.log('Changed:', count)  // Also returns 5
}

// In frame update
system1(world)  // Processes changed entities
system2(world)  // Same entities
world.update()  // Reset happens after frame
```

---

## Gotcha 14: World Traits Not Included in Queries

### The Problem

```typescript
// ❌ DON'T DO THIS - World traits aren't queried
const worldEntity = world.spawn(GameSettings)
worldEntity.set(GameSettings, { volume: 0.5 })

// This won't find the world entity!
const entities = world.query(GameSettings)
  .count()  // Returns 0
```

### The Impact

- Can't iterate over world traits in queries
- Settings must be accessed directly from the world entity
- Inconsistent access patterns

### The Solution

```typescript
// ✅ DO THIS - Access world traits directly
const worldEntity = world.spawn(GameSettings)

// Access directly
const settings = worldEntity.get(GameSettings)
console.log('Volume:', settings.volume)

// If you need to iterate including world, spawn as regular entity
// But don't add it to scene rendering
const settings = world.spawn(GameSettings, Metadata)
settings.set(Metadata, { isWorldEntity: true, noRender: true })

// Now you can query it
world.query(GameSettings, Metadata).updateEach(([settings]) => {
  // Process all settings including world
})
```

---

## Gotcha 15: Observer Memory Leaks (Missing Unsubscribe)

### The Problem

```typescript
// ❌ DON'T DO THIS - Observer never unsubscribes
function setupPlayerObserver(world) {
  world.observer(Health).onRemove((entity) => {
    console.log('Player died:', entity.id())
  })
  // Missing unsubscribe!
}

// Called multiple times
setupPlayerObserver(world)
setupPlayerObserver(world)
setupPlayerObserver(world)

// Now death is logged 3 times!
// Observer callbacks never cleaned up
```

### The Impact

- Multiple callbacks fire for same event
- Memory usage grows with each subscription
- Unpredictable behavior
- Difficult to debug

### The Solution

```typescript
// ✅ DO THIS - Always unsubscribe
function setupPlayerObserver(world) {
  const unsubscribe = world.observer(Health).onRemove((entity) => {
    console.log('Player died:', entity.id())
  })

  // Return unsubscribe function for cleanup
  return unsubscribe
}

// In React component
function PlayerComponent() {
  const world = useWorld()
  const [unsubscribe, setUnsubscribe] = useState(null)

  useEffect(() => {
    const unsub = setupPlayerObserver(world)
    setUnsubscribe(() => unsub)

    return () => {
      unsub()  // Cleanup on unmount
    }
  }, [world])

  return null
}
```

---

## Pro Tip: Use Or() for Union Queries

### The Problem

Without union queries, you can't easily match multiple trait combinations:

```typescript
// ❌ VERBOSE - Have to do manual filtering
const healthyEntities = world.query(Health).filter(
  (e) => e.get(Health).current > 0
)

const shieldedEntities = world.query(Shield).filter(
  (e) => e.get(Shield).active
)

// Now need to combine results manually
const allDamageable = [...healthyEntities, ...shieldedEntities]
```

### The Solution

```typescript
// ✅ EFFICIENT - Use Or() for union queries
import { Or } from 'koota'

// Get all entities with Health OR Shield (or both)
const damageable = world.query(Or(Health, Shield))
  .updateEach((entity) => {
    // Process any entity that can take damage
  })

// Combine with other traits
const movingDamageable = world.query(Or(Health, Shield), Velocity)
  .updateEach(([velocity]) => {
    // Only moving entities that can be damaged
  })

// Triple union
const anyArmor = world.query(Or(Health, Shield, Armor))
  .updateEach((entity) => {
    // Entities with any defensive trait
  })
```

### Real-World Example

```typescript
// Damage system in a game
function applyDamage(world, damageAmount) {
  // Hit anything with health or shield
  world.query(Or(Health, Shield)).updateEach((entity) => {
    if (entity.has(Health)) {
      const health = entity.get(Health)
      entity.set(Health, {
        ...health,
        current: health.current - damageAmount
      })
    } else if (entity.has(Shield)) {
      const shield = entity.get(Shield)
      entity.set(Shield, {
        ...shield,
        strength: shield.strength - damageAmount
      })
    }
  })
}
```

---

## Gotcha Summary Checklist

- [ ] All system queries are cached
- [ ] No object creation in loop iterations
- [ ] Entities modified outside loop iterations
- [ ] React cleanup functions destroy entities
- [ ] Queries always specify required traits
- [ ] Not relying on entity order stability
- [ ] Using `.set()` for trait updates, not mutation
- [ ] useQuery has proper dependency arrays
- [ ] No circular system dependencies
- [ ] Excluded entities properly filtered
- [ ] Each entity has its own trait objects
- [ ] Understanding trait immutability patterns
- [ ] Changed() queries cached to avoid resets
- [ ] Not querying world-level traits directly
- [ ] All observers properly unsubscribed
- [ ] Using Or() for union queries instead of manual filtering

---

## Related Resources

- [Koota Best Practices](https://github.com/pmndrs/koota)
- [Previous: Performance](./03-performance.md)
- [Next: ECS Architecture](../ecs-architecture/01-design-principles.md)
