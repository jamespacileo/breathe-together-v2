# Koota: Observers and Events

Master reactive patterns with Koota observers for debugging, analytics, and decoupled architectures.

## Quick Reference

| Pattern | Scope | Use Case |
|---------|-------|----------|
| **onAdd** | World trait | Entity spawned |
| **onRemove** | World trait | Entity destroyed |
| **onChange** | World trait | Trait value changed |
| **onQueryAdd** | Query result | Entity matches query |
| **onQueryRemove** | Query result | Entity no longer matches |

---

## Pattern 1: onAdd - React to Trait Addition

### Basic Usage

```typescript
// React when any entity gets a Position trait
world.observer(Position).onAdd((entity, position) => {
  console.log(`Entity ${entity.id()} spawned at:`, position)
})
```

### Use Case: Entity Registration

```typescript
// Track all particles for cleanup
const particleIds = new Set()

world.observer(Particle).onAdd((entity) => {
  particleIds.add(entity.id())
  console.log(`Particle spawned, total:`, particleIds.size)
})

world.observer(Particle).onRemove((entity) => {
  particleIds.delete(entity.id())
  console.log(`Particle destroyed, total:`, particleIds.size)
})
```

### Real-World Example: breathe-together-v2

```typescript
// Track presence updates
world.observer(PresenceData).onAdd((entity, presence) => {
  // Add new user to UI
  updateUserList(entity.id(), presence.userId)

  // Play joining animation
  playJoiningSound()
})
```

---

## Pattern 2: onChange - React to Trait Changes

### Basic Usage

```typescript
// React when Health changes
world.observer(Health).onChange((entity, health, prevHealth) => {
  const damage = prevHealth.current - health.current
  console.log(`Entity ${entity.id()} took ${damage} damage`)
})
```

### Use Case: Animation Triggers

```typescript
// Play damage animation when health drops
world.observer(Health).onChange((entity, health, prevHealth) => {
  if (health.current < prevHealth.current) {
    triggerDamageAnimation(entity.id(), {
      damage: prevHealth.current - health.current
    })
  }

  if (health.current <= 0 && prevHealth.current > 0) {
    triggerDeathAnimation(entity.id())
  }
})
```

### Analytics Integration

```typescript
// Track all meaningful state changes
world.observer(PlayerState).onChange((entity, state, prevState) => {
  analytics.track('state_change', {
    entity: entity.id(),
    from: prevState.status,
    to: state.status,
    timestamp: Date.now()
  })
})
```

---

## Pattern 3: onRemove - React to Trait Removal

### Basic Usage

```typescript
// React when entities lose Health trait
world.observer(Health).onRemove((entity) => {
  console.log(`Entity ${entity.id()} is no longer damageable`)
})
```

### Use Case: Cleanup

```typescript
// Remove from tracking when entity is destroyed
world.observer(Position).onRemove((entity) => {
  spatialIndex.remove(entity.id())
  rendererPool.release(entity.id())
})
```

### Detect Entity Destruction

```typescript
// You can't detect full entity destruction directly,
// but you can watch a trait that's added to all entities
const TrackedForDeletion = trait({ id: '' })

// When spawned
world.spawn(Entity, TrackedForDeletion)

// When removed
world.observer(TrackedForDeletion).onRemove((entity) => {
  console.log('Entity fully destroyed:', entity.id())
})
```

---

## Pattern 4: onQueryAdd/onQueryRemove - Query-Level Events

### The Problem

Entities move in and out of queries as traits change. You need to react to these transitions:

```typescript
// ❌ INEFFICIENT - Query every frame to see what changed
const visibleParticles = world.query(Particle, Visible)
// How do we know if particles just became visible or invisible?
```

### The Solution

```typescript
// ✅ EFFICIENT - React to query changes
const visibleParticles = world.query(Particle, Visible)

visibleParticles.onAdd((entity) => {
  console.log('Particle became visible:', entity.id())
  renderer.enableParticle(entity.id())
})

visibleParticles.onRemove((entity) => {
  console.log('Particle is no longer visible:', entity.id())
  renderer.disableParticle(entity.id())
})
```

### Real-World Example: Frustum Culling

```typescript
// Track entities inside camera frustum
function setupFrustumTracking(world, camera) {
  const inFrustum = world.query(Position, Visible)

  inFrustum.onAdd((entity) => {
    // Enable rendering for this entity
    renderer.enableEntity(entity.id())
  })

  inFrustum.onRemove((entity) => {
    // Disable rendering to save GPU time
    renderer.disableEntity(entity.id())
  })

  // Update frustum each frame
  return (dt) => {
    updateFrustumCulling(world, camera, inFrustum)
  }
}
```

### breathe-together-v2 Note

For MVP, we avoid quality-based observers and keep particle rendering fixed.
Use observers only for clear event-driven needs (e.g., input, analytics, debug
overlays).

---

## Pattern 5: Event Subscription Lifecycle Management

### The Problem

Observers and query subscriptions must be cleaned up, or they leak memory:

```typescript
// ❌ MEMORY LEAK - Never unsubscribes
function setupTracking(world) {
  world.observer(Health).onAdd((entity) => {
    console.log('Entity has health')
  })
  // Missing unsubscribe!
}

// Called multiple times
setupTracking(world)
setupTracking(world)
setupTracking(world)

// Now onAdd fires 3 times for each entity!
```

### The Solution

Always save and use unsubscribe functions:

```typescript
// ✅ PROPER CLEANUP
function setupTracking(world) {
  const unsubAdd = world.observer(Health).onAdd((entity) => {
    console.log('Entity has health')
  })

  const unsubRemove = world.observer(Health).onRemove((entity) => {
    console.log('Entity lost health')
  })

  // Return cleanup function
  return () => {
    unsubAdd()
    unsubRemove()
  }
}

// Usage with React
function HealthTracker() {
  const world = useWorld()

  useEffect(() => {
    const cleanup = setupTracking(world)
    return cleanup  // Clean up on unmount
  }, [world])

  return null
}
```

### Factory Pattern for Observers

```typescript
// Create a reusable observer manager
function createHealthSystem(world) {
  const subscriptions = []

  // Track health changes
  subscriptions.push(
    world.observer(Health).onChange((entity, health) => {
      console.log(`Health changed: ${health.current}`)
    })
  )

  // Track deaths
  subscriptions.push(
    world.observer(Health).onRemove((entity) => {
      console.log('Entity died')
    })
  )

  // Return cleanup
  return () => {
    subscriptions.forEach((unsub) => unsub())
  }
}

// Usage
const cleanup = createHealthSystem(world)

// Later
cleanup()  // Clean up all subscriptions at once
```

---

## Pattern 6: Use Cases - Debugging, Logging, Analytics

### Debugging System

```typescript
// Enable/disable debugging
const DEBUG = true

function setupDebugObservers(world) {
  if (!DEBUG) return

  // Log all spawns
  world.observer(Position).onAdd((entity) => {
    console.log(`[SPAWN] Entity ${entity.id()} at:`, entity.get(Position))
  })

  // Log all movements
  world.observer(Position).onChange((entity, pos, prevPos) => {
    const distance = Math.hypot(
      pos.x - prevPos.x,
      pos.y - prevPos.y
    )
    if (distance > 0.1) {
      console.log(`[MOVE] Entity ${entity.id()} moved ${distance.toFixed(2)}u`)
    }
  })

  // Log all deaths
  world.observer(Health).onRemove((entity) => {
    console.log(`[DEATH] Entity ${entity.id()}`)
  })
}
```

### Analytics System

```typescript
// Track game events for analytics
class GameAnalytics {
  constructor(world) {
    this.world = world
    this.startTime = Date.now()
  }

  setup() {
    // Track entities spawned
    this.world.observer(Player).onAdd(() => {
      this.track('player_spawned')
    })

    // Track state changes
    this.world.observer(PlayerState).onChange((entity, state, prev) => {
      if (state.level > prev.level) {
        this.track('level_up', { newLevel: state.level })
      }

      if (state.score > prev.score) {
        this.track('score_change', {
          oldScore: prev.score,
          newScore: state.score,
          gained: state.score - prev.score
        })
      }
    })

    // Track deaths
    this.world.observer(Health).onRemove((entity) => {
      this.track('entity_died', { entityId: entity.id() })
    })
  }

  track(event, data = {}) {
    const payload = {
      event,
      data,
      timestamp: Date.now(),
      elapsed: Date.now() - this.startTime
    }

    console.log('[ANALYTICS]', payload)
    // Send to analytics backend
    // fetch('/api/analytics', { method: 'POST', body: JSON.stringify(payload) })
  }
}

// Usage
const analytics = new GameAnalytics(world)
analytics.setup()
```

### Logging System

```typescript
// Structured logging with observer pattern
class GameLogger {
  constructor(world) {
    this.world = world
    this.logs = []
  }

  setup() {
    // Log all entity events
    this.world.observer(Health).onAdd((entity) => {
      this.log('entity.health.added', { entity: entity.id() })
    })

    this.world.observer(Health).onChange((entity, health, prev) => {
      if (health.current < prev.current) {
        this.log('entity.damaged', {
          entity: entity.id(),
          damage: prev.current - health.current
        })
      }
    })

    this.world.observer(Health).onRemove((entity) => {
      this.log('entity.died', { entity: entity.id() })
    })
  }

  log(category, details) {
    const entry = {
      category,
      details,
      timestamp: new Date().toISOString(),
      frame: this.world.frame
    }

    this.logs.push(entry)

    // Keep only last 1000 logs
    if (this.logs.length > 1000) {
      this.logs.shift()
    }
  }

  exportLogs() {
    return JSON.stringify(this.logs, null, 2)
  }
}
```

---

## Pattern 7: Performance Considerations

### Observer Overhead

```typescript
// Observers have minimal overhead (~0.1ms per observer)
// But many observers can add up

// ❌ EXPENSIVE - 300 observers
for (let i = 0; i < 300; i++) {
  world.observer(SomeValue).onAdd(() => {
    // This adds observer overhead
  })
}

// ✅ EFFICIENT - Batch observers
const observers = []
for (let i = 0; i < 300; i++) {
  observers.push({
    trait: SomeValue,
    callback: () => {}
  })
}

// Subscribe to single observer that dispatches
world.observer(SomeValue).onAdd((entity) => {
  observers.forEach((obs) => obs.callback(entity))
})
```

### Selective Observation

```typescript
// Only observe when needed
class OptimizedSystem {
  constructor(world) {
    this.world = world
    this.isActive = false
    this.subscription = null
  }

  activate() {
    if (this.isActive) return

    this.isActive = true
    this.subscription = this.world.observer(Position).onChange(() => {
      // Handle position changes
    })
  }

  deactivate() {
    if (!this.isActive) return

    this.isActive = false
    this.subscription?.()  // Unsubscribe
  }
}
```

---

## Advanced: Chained Observers

```typescript
// React to multiple trait changes in sequence
class AdvancedTracking {
  constructor(world) {
    this.world = world
  }

  trackPlayerProgression() {
    // When player levels up
    this.world.observer(Level).onChange((entity, level, prevLevel) => {
      if (level.value > prevLevel.value) {
        // New trait gets added when leveling
        this.world.observer(NewAbility).onAdd((entity) => {
          console.log('Player learned new ability!')
          playLevelUpAnimation()
        })
      }
    })
  }
}
```

---

## Related Resources

- [Koota Documentation](https://github.com/pmndrs/koota)
- [Observer Pattern (Design Patterns)](https://refactoring.guru/design-patterns/observer)
- [React Lifecycle Patterns](https://react.dev/learn/lifecycle-of-reactive-effects)
- [Previous: Advanced Patterns](./01-advanced-patterns.md)
- [Next: React Integration](./02-react-integration.md)
