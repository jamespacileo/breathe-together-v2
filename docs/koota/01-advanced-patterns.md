# Koota: Advanced Patterns

Master advanced ECS patterns in Koota for optimal performance and clean architecture.

## Quick Reference

| Pattern | Use Case | Performance |
|---------|----------|-------------|
| **Query Caching** | Repeated queries in systems | ⭐⭐⭐⭐⭐ Critical |
| **useStore()** | Direct array access for updates | ⭐⭐⭐⭐⭐ Critical |
| **Factory Systems** | Reusable system factories with closures | ⭐⭐⭐⭐ Important |
| **Selective Traits** | Update subset of queried traits | ⭐⭐⭐ Useful |
| **for...of Iteration** | Efficient entity iteration | ⭐⭐⭐ Useful |

---

## Pattern 1: Query Caching

### The Problem

Every time you call `world.query(Position, Velocity)`, Koota internally:
1. Hashes the trait parameters
2. Looks up the hash in the query cache
3. Returns the cached query (if exists)

If you call the same query repeatedly per frame, you're doing step 1 multiple times needlessly.

### The Solution

Pre-create the query in module scope and pass it to subsequent calls:

```javascript
// ❌ INEFFICIENT - Hashes query parameters every frame
function updateMovement(world, dt) {
  world.query(Position, Velocity).updateEach(([pos, vel]) => {
    pos.x += vel.x * dt
    pos.y += vel.y * dt
  })
}

// ✅ EFFICIENT - Hashes query parameters once
import { cacheQuery } from 'koota'

const movementQuery = cacheQuery(Position, Velocity)

function updateMovement(world, dt) {
  world.query(movementQuery).updateEach(([pos, vel]) => {
    pos.x += vel.x * dt
    pos.y += vel.y * dt
  })
}
```

### Project Example

In **breathe-together-v2** (`src/providers.tsx`), the system pipeline pre-creates queries:

```typescript
// Systems in KootaSystems register their own queries
// Each system caches its query to avoid re-hashing per frame
const breathQuery = cacheQuery(BreathEntity)
const particleQuery = cacheQuery(Position, Velocity, ParticlePhysics)
```

### Key Benefits
- **Faster**: Skips hash computation every frame
- **Cleaner**: Queries are explicit at system level
- **Debuggable**: Easy to see what a system queries

---

## Pattern 2: Direct Store Access with useStore()

### The Problem

`updateEach()` is convenient but allocates intermediate arrays. For performance-critical updates (hundreds/thousands of entities), direct store access is faster.

### The Solution

Use `useStore()` to access the underlying trait storage arrays directly:

```javascript
// ❌ CONVENIENT but slower for many entities
world.query(Position, Velocity).updateEach(([pos, vel]) => {
  pos.x += vel.x * 0.1
  pos.y += vel.y * 0.1
})

// ✅ FAST - Direct array access, minimal allocation
world.query(Position, Velocity).useStore(
  ([position, velocity], entities) => {
    for (let i = 0; i < entities.length; i++) {
      const eid = entities[i].id()
      position.x[eid] += velocity.x[eid] * 0.1
      position.y[eid] += velocity.y[eid] * 0.1
    }
  }
)
```

### Understanding Trait Stores

Koota stores trait data in **array-of-structs** format for cache locality:

```
Traits are stored as separate arrays, indexed by entity ID:

position.x = [0, 1.5, 3.0, 4.5, ...]  // x for entities 0, 1, 2, 3
position.y = [0, 2.0, 1.5, 0.5, ...]  // y for entities 0, 1, 2, 3
velocity.x = [0.1, 0.2, 0.3, 0.4, ...]
velocity.y = [0.5, 0.6, 0.7, 0.8, ...]

// Access entity 2's position:
position.x[2] = 3.0
position.y[2] = 1.5
```

### Project Example

In **breathe-together-v2** (`src/entities/particle/systems.tsx`), the particle physics system uses `useStore()` for optimal performance with 300 particles:

```typescript
world.query(Position, Velocity, ParticlePhysics).useStore(
  ([position, velocity, physics], entities) => {
    // Ultra-fast, direct array manipulation
    for (let i = 0; i < entities.length; i++) {
      const eid = entities[i].id()

      // Calculate forces, update velocities
      const force = calculateForce(position, velocity, physics, eid, dt)
      velocity.x[eid] += force.x * dt
      velocity.y[eid] += force.y * dt

      // Update positions
      position.x[eid] += velocity.x[eid] * dt
      position.y[eid] += velocity.y[eid] * dt
    }
  }
)
```

### When to Use

- **Always**: Performance-critical systems (physics, particle updates)
- **Sometimes**: Medium-scale queries (100+ entities)
- **Skip**: Small queries (< 10 entities), clarity is more important

---

## Pattern 3: Factory System Pattern

### The Problem

Systems often need to capture values in closures (the world instance, configuration, temporary buffers). Creating these systems for each render cycle wastes memory.

### The Solution

Create a factory function that returns a memoized system function:

```javascript
// ✅ Factory Pattern - System created once, called every frame
function createVelocitySystem(world, config) {
  const query = cacheQuery(Position, Velocity)

  // Temporary buffers allocated once, reused
  const tempVec = new THREE.Vector3()

  // This function is created once and returned
  return (dt, time) => {
    query.updateEach(([pos, vel]) => {
      // Access captured variables
      pos.x += vel.x * config.friction * dt
      pos.y += vel.y * config.friction * dt
    })
  }
}

// Usage
const velocitySystem = createVelocitySystem(world, { friction: 0.98 })

// In render loop, just call the system
useFrame(({ clock }) => {
  velocitySystem(clock.getDelta(), clock.elapsedTime)
})
```

### Project Example

In **breathe-together-v2**, all systems follow the factory pattern (see `src/providers.tsx`):

```typescript
function createBreathSystem(world: World) {
  const query = cacheQuery(BreathEntity)

  return (dt: number, time: number) => {
    query.updateEach(([breathTrait]) => {
      const phase = calculateBreathPhase(time)
      breathTrait.phase = phase
    })
  }
}

// Then in KootaSystems:
const systems = [
  createBreathSystem(world),
  createParticlePhysicsSystem(world),
  // ... other systems
]
```

### Key Benefits

- **Memory**: Objects created once, not per frame
- **Clarity**: System logic is self-contained
- **Reusability**: Create multiple instances with different configs
- **Testing**: Easy to test in isolation

---

## Pattern 4: Selective Trait Updates

### The Problem

Sometimes you query multiple traits but only want to update a subset. This wastes processing.

### The Solution

Use `.select()` to specify which traits should be included in the update:

```javascript
// ❌ VERBOSE - Fetches all three traits
world.query(Position, Velocity, Mass).updateEach(
  ([position, velocity, mass]) => {
    // But we only want to update mass!
    mass.value += 1
  }
)

// ✅ EFFICIENT - Only fetch Mass
world.query(Position, Velocity, Mass).select(Mass).updateEach(
  ([mass]) => {
    mass.value += 1
  }
)
```

### Why It Matters

- Reduces memory allocation
- Clearer intent (what does this system actually care about?)
- Smaller update payloads
- Can enable compiler optimizations

### Real-World Example

```javascript
// Get all entities that have both Position and Health
// But only want to update Health (e.g., damage system)
world.query(Position, Health).select(Health).updateEach(
  ([health]) => {
    if (health.current > 0) {
      health.current -= 1
    }
  }
)
```

---

## Pattern 5: Efficient Iteration with for...of

### The Problem

JavaScript's `forEach` on large arrays allocates a function closure for each iteration. A standard `for` loop is faster.

### The Solution

Use `for...of` which compiles to a `for` loop without function overhead:

```javascript
// ✅ BETTER - Compiles to standard for loop
for (const entity of world.query(Position)) {
  const position = entity.get(Position)
  position.x += 1
}

// ✅ ALSO GOOD - Direct updateEach
world.query(Position).updateEach(([pos]) => {
  pos.x += 1
})

// ❌ SLOWER - Function closure per iteration
world.query(Position).forEach((entity) => {
  const position = entity.get(Position)
  position.x += 1
})
```

### When It Matters

- Performance-critical loops (100+ iterations per frame)
- Less important for small queries
- `updateEach()` is often clearest and well-optimized anyway

---

## Pattern 6: Lazy Entity Activation

### The Problem

Pre-spawning entities (for object pooling) means they exist from frame 1. You only want to activate some.

### The Solution

Use conditional traits or a dedicated "Active" trait:

```javascript
// Define an Active trait
const Active = trait({ flag: true })

// Spawn but don't activate
const pooledEntity = world.spawn(Position, Velocity)
pooledEntity.remove(Active)

// Later, activate when needed
if (needEntity) {
  pooledEntity.add(Active)
  pooledEntity.set(Position, { x: 10, y: 20 })
}

// Systems only query active entities
world.query(Active, Position, Velocity).updateEach(
  ([pos, vel]) => {
    // Only runs on active entities
  }
)
```

### Project Example

In **breathe-together-v2**, particles use this pattern for adaptive quality:

```typescript
const Quality = trait({ level: 'high' })
const Inactive = trait({ hidden: true })

// 300 particles pre-spawned but only 100 active
const particles = world.query(Position, Velocity, Quality)
  .exclude(Inactive)  // Only active particles
  .updateEach(...)
```

---

## Pattern 7: Data-Driven Configuration

### The Problem

Hard-coded constants in systems make them rigid and hard to tune.

### The Solution

Pass configuration objects to factory functions:

```javascript
function createPhysicsSystem(world, config) {
  const query = cacheQuery(Position, Velocity)

  return (dt) => {
    query.updateEach(([pos, vel]) => {
      // Use config values
      vel.x *= config.damping
      vel.y *= config.damping

      pos.x += vel.x * config.timescale * dt
      pos.y += vel.y * config.timescale * dt
    })
  }
}

// Easy to experiment with different configs
const slowPhysics = createPhysicsSystem(world, {
  damping: 0.95,
  timescale: 0.5
})

const fastPhysics = createPhysicsSystem(world, {
  damping: 0.98,
  timescale: 1.0
})
```

---

## Pattern 8: System Toggling for Debugging

### The Problem

During development, you want to enable/disable systems to debug issues. Hard-coded systems can't be toggled.

### The Solution

Use conditional system invocation:

```typescript
interface SystemConfig {
  breathEnabled: boolean
  physicsEnabled: boolean
  renderingEnabled: boolean
}

function KootaSystems({ config }: { config: SystemConfig }) {
  const world = useWorld()

  useFrame((state) => {
    if (config.breathEnabled) breathSystem(world, state.clock)
    if (config.physicsEnabled) physicsSystem(world, state.clock)
    if (config.renderingEnabled) renderingSystem(world, state.clock)
  })
}

// Usage
<KootaSystems config={{
  breathEnabled: true,
  physicsEnabled: debugMode ? true : true,
  renderingEnabled: true
}} />
```

### Project Example

In **breathe-together-v2** (`src/providers.tsx`), Triplex can toggle systems for debugging:

```typescript
// From Triplex configuration
const systemToggles = {
  breathSystemEnabled: true,
  particlePhysicsSystemEnabled: true,
  cursorPositionFromLandEnabled: true,
  // ... more toggles
}

// Systems only run if enabled
if (systemToggles.breathSystemEnabled) {
  breathSystem(world, time)
}
```

---

---

## Pattern 9: World Observers (onAdd, onRemove, onChange)

### The Problem

Sometimes you need to react to trait changes globally (e.g., debugging, analytics, logging). Without observers, you'd need to scatter callbacks throughout your code.

### The Solution

Use world-level observers for trait lifecycle events:

```typescript
// Monitor when Position trait is added to any entity
world.observer(Position).onAdd((entity, position) => {
  console.log(`Entity ${entity.id()} received Position:`, position)
})

// Monitor when Position changes
world.observer(Position).onChange((entity, position, prevPosition) => {
  console.log(`Entity ${entity.id()} moved from`, prevPosition, 'to', position)
})

// Monitor when Position is removed
world.observer(Position).onRemove((entity, position) => {
  console.log(`Entity ${entity.id()} lost Position`)
})
```

### Use Cases

```typescript
// 1. Debugging: Log all entity spawns
world.observer(Position).onAdd((entity) => {
  console.log('[DEBUG] Spawned entity:', entity.id())
})

// 2. Analytics: Track velocity changes
world.observer(Velocity).onChange((entity, vel) => {
  analytics.track('velocity_change', {
    entity_id: entity.id(),
    speed: Math.hypot(vel.x, vel.y)
  })
})

// 3. Cleanup: Remove related data when trait is removed
world.observer(ParticlePhysics).onRemove((entity) => {
  // Clean up any particle rendering data
  particleRenderer.removeParticle(entity.id())
})
```

### Key Benefits

- **Reactive patterns**: Update UI automatically when world state changes
- **Debugging**: Easy to trace entity lifecycle
- **Analytics**: Track game events without polluting system code
- **Decoupling**: Systems don't need to know about observers

### Pro Tip: Unsubscribing from Observers

```typescript
// Save the unsubscribe function
const unsubscribe = world.observer(Health).onRemove((entity) => {
  console.log('Entity died:', entity.id())
})

// Later, stop observing
unsubscribe()
```

---

## Pattern 10: Query Event Subscriptions (onQueryAdd, onQueryRemove)

### The Problem

You want to be notified when entities enter/leave a specific query result. For example, when an enemy becomes visible on camera, or leaves the scene.

### The Solution

Subscribe to query-level events:

```typescript
// Monitor when entities matching a query are added
const visibleEnemies = world.query(Enemy, Visible)

visibleEnemies.onAdd((entity) => {
  console.log('Enemy became visible:', entity.id())
  // Start rendering, play sound, etc.
})

visibleEnemies.onRemove((entity) => {
  console.log('Enemy left visible area:', entity.id())
  // Stop rendering, play fade sound, etc.
})
```

### Real-World Example

```typescript
// Track active particles for UI
const activeParticles = world.query(Particle, Active)

activeParticles.onAdd((entity) => {
  activeParticleCount++
  updateParticleCountUI(activeParticleCount)
})

activeParticles.onRemove((entity) => {
  activeParticleCount--
  updateParticleCountUI(activeParticleCount)
})

// In breathe-together-v2: Track visible particles based on quality
const visibleParticles = world.query(Particle, Quality).filter(
  (entity) => entity.get(Quality).level !== 'hidden'
)

visibleParticles.onAdd((entity) => {
  renderer.addParticle(entity.id())
})

visibleParticles.onRemove((entity) => {
  renderer.removeParticle(entity.id())
})
```

### Pro Tip: Memory Management

Always unsubscribe to prevent memory leaks:

```typescript
const visibleEnemies = world.query(Enemy, Visible)

const unsubAdd = visibleEnemies.onAdd(() => { /* ... */ })
const unsubRemove = visibleEnemies.onRemove(() => { /* ... */ })

// Cleanup in React effect
useEffect(() => {
  return () => {
    unsubAdd()
    unsubRemove()
  }
}, [])
```

---

## Pattern 11: World-Level Traits for Global State

### The Problem

Sometimes you need global state that's not tied to entities (e.g., game settings, time scale, audio volume). Should you create a fake "world" entity, or store state outside Koota?

### The Solution

Use world-level traits for truly global configuration:

```typescript
// Define global traits
const GameSettings = trait({ timescale: 1.0, audioVolume: 1.0 })
const GameState = trait({ paused: false, level: 1 })

// Attach to a special "world" entity
const worldEntity = world.spawn(GameSettings, GameState)

// Access globally
const settings = worldEntity.get(GameSettings)
console.log('Time scale:', settings.timescale)

// Update globally
worldEntity.set(GameSettings, {
  timescale: 0.5,
  audioVolume: 1.0
})

// Systems can query for global state
world.query(Position, GameSettings).updateEach(
  ([pos, settings]) => {
    // Update all positions with time scale
    pos.x += vel.x * settings.timescale
  }
)
```

### Project Example: breathe-together-v2

```typescript
// Define quality and performance settings as world traits
const QualitySetting = trait({
  particleCount: 300,
  resolution: 1.0,
  shadowsEnabled: true
})

const PerformanceState = trait({
  fps: 60,
  gpuLoad: 0.5,
  lastQualityChangeTime: 0
})

// Spawn as world state
const perfWorld = world.spawn(QualitySetting, PerformanceState)

// Systems use global quality
world.query(Position, Velocity, QualitySetting).updateEach(
  ([pos, vel, quality]) => {
    // Skip some particles if quality is low
    if (quality.particleCount < 100) {
      // Reduce simulation complexity
    }
  }
)
```

### Key Benefits

- **Centralized**: All systems can access global state consistently
- **Observable**: Track changes to game settings via observers
- **Type-safe**: Full TypeScript support for global config
- **Reactive**: Systems automatically adapt when settings change

---

## Pattern 12: Query Modifiers (Changed, Added, Or)

### The Problem

Default queries match all entities with specific traits. But sometimes you need:
- Entities that **changed** this frame
- Entities that were **just added**
- Entities matching **any of** multiple trait combinations (union queries)

### The Solution

Use query modifiers for advanced filtering:

```typescript
import { Changed, Added, Or } from 'koota'

// 1. Only entities where Position changed this frame
const movedEntities = world.query(Position, Changed(Position))
  .updateEach(([pos]) => {
    console.log('Position changed:', pos)
  })

// 2. Only entities added this frame
const newEntities = world.query(Position, Added(Position))
  .updateEach(([pos]) => {
    console.log('New entity spawned with Position')
  })

// 3. Union query: Entities with (Health OR Shield)
const damageable = world.query(Or(Health, Shield))
  .updateEach((entity) => {
    // This runs for entities with Health OR Shield (or both)
  })

// 4. Combine modifiers
const changedMovingEntities = world.query(
  Position,
  Velocity,
  Changed(Velocity)
).updateEach(([pos, vel]) => {
  // Only entities whose velocity changed this frame
})
```

### Real-World Examples

```typescript
// Particle physics: Only update particles that moved
world.query(Position, Velocity, Changed(Position))
  .useStore(([pos, vel], entities) => {
    // Ultra-fast: only iterates changed particles
    for (const eid of entities) {
      updateParticleRendering(eid, pos.x[eid], pos.y[eid])
    }
  })

// Damage system: Only process entities that took damage this frame
world.query(Health, Changed(Health))
  .updateEach(([health]) => {
    if (health.current < health.max) {
      playDamageAnimation()
    }
  })

// Spawn system: React to newly spawned particles
world.query(Particle, Added(Particle))
  .updateEach((entity) => {
    particleRenderer.initializeParticle(entity.id())
  })
```

### Pro Tip: Changed() Modifier Behavior

**Important:** The `Changed()` modifier **resets after each query execution**. This means:

```typescript
// First query picks up changed entities
const changed1 = world.query(Position, Changed(Position)).count() // Returns 5

// Second query in same frame returns 0
const changed2 = world.query(Position, Changed(Position)).count() // Returns 0

// Reset occurs automatically between frames
```

Always cache changed queries if you need them multiple times in one frame:

```typescript
const changedPositionQuery = cacheQuery(Position, Changed(Position))

function system1(world) {
  const count = world.query(changedPositionQuery).count()
  console.log('Changed positions:', count)
}

function system2(world) {
  // Safe: uses cached query, returns same count
  const count = world.query(changedPositionQuery).count()
}
```

---

## Pro Tip: world.reset() vs world.destroy()

### The Difference

When should you reset the entire world vs destroying entities one-by-one?

```typescript
// world.destroy() - Removes all entities
world.destroy()
// Clears all entities, traits, systems
// But world object still exists and can be reused

// world.reset() - Clears traits while keeping world structure
world.reset()
// Useful for: Restarting game, level changes
// Faster than destroy() because structure stays intact
```

### Use Cases

```typescript
// Level change: Reset world state
function loadNewLevel(levelData) {
  world.reset()  // Clear all entities

  // Spawn new level entities
  const terrain = world.spawn(Terrain, Collider)
  const player = world.spawn(Player, Position, Health)
}

// Game restart
function restartGame() {
  world.destroy()  // Clean everything
  initializeWorld()  // Create fresh world
}

// Performance: Reset is faster for frequent resets
for (let restart = 0; restart < 1000; restart++) {
  world.reset()  // ~1ms each
}
```

### Memory Implications

```typescript
// Destroy: Frees all memory
world.destroy()
// World object has no entities, traits, or systems

// Reset: Keeps internal structure
world.reset()
// World object retains allocation pools for quick respawn

// For single-level games: destroy() is cleaner
// For multi-level games: reset() is faster
```

---

## Related Resources

- [Koota Documentation](https://github.com/pmndrs/koota)
- [Context7: Koota Code Examples](https://context7.com/pmndrs/koota)
- [Previous: Design Principles](../ecs-architecture/01-design-principles.md)
- [Next: React Integration](./02-react-integration.md)

---

## Pro Tips Summary

1. **Always cache queries** that are used in systems
2. **Use useStore()** for 100+ entity updates
3. **Factory pattern** for reusable, configured systems
4. **Selective traits** reduce memory and clarify intent
5. **for...of** is faster than forEach in hot loops
6. **Lazy activation** enables object pooling strategies
7. **Data-driven configs** make systems flexible
8. **System toggles** aid debugging without code changes
