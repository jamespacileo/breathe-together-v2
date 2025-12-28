# ECS: Design Principles

Foundation concepts for the Entity-Component-System architecture.

## Core Principle: Composition Over Inheritance

### The ECS Way

```
❌ Inheritance (old way):
class Entity
  class Player extends Entity
    class RunningPlayer extends Player

✅ ECS (new way):
Entity = Position + Velocity + Health
Entity = Position + Velocity + IsEnemy
Entity = Position + Velocity  (minimal entity)
```

### Benefits

1. **Flexibility**: Any combination of traits works
2. **Reusability**: Components used in unexpected ways
3. **Simplicity**: No complex inheritance hierarchies
4. **Performance**: Data layout optimized for cache

---

## Core Concepts

### Entities

Unique identifiers representing objects in the world:

```typescript
const player = world.spawn()      // Entity ID
const enemy = world.spawn()       // Another entity
const projectile = world.spawn()  // Another entity

// Entities are just IDs - they don't inherently do anything
// Traits define what an entity is
```

### Traits (Components)

Pure data containers - **no logic**:

```typescript
// ✅ Good trait (data only)
const Position = trait({ x: 0, y: 0, z: 0 })
const Health = trait({ current: 100, max: 100 })
const Velocity = trait({ x: 0, y: 0, z: 0 })

// ❌ Bad trait (has methods)
const Bad = trait({
  x: 0,
  moveTo(x, y) { this.x = x }  // ← Methods belong in systems!
})
```

### Systems

Pure functions that operate on traits:

```typescript
// ✅ Good system (pure function)
function movementSystem(world, dt) {
  world.query(Position, Velocity).updateEach(([pos, vel]) => {
    pos.x += vel.x * dt
  })
}

// ❌ Bad system (side effects)
function badSystem(world) {
  world.query(Position).forEach((entity) => {
    // This looks like it works, but creating new objects
    // causes garbage collection pressure
    const newPos = new Position({ x: Math.random() })
  })
}
```

---

## Design Pattern: Component Combinations

### Simple Entities

```
Particle:
  - Position
  - Velocity

Player:
  - Position
  - Velocity
  - Health
  - Input

Projectile:
  - Position
  - Velocity
  - Damage
  - LifeTimer
```

### Trait Relationships

Some traits only make sense together:

```
✅ Good combinations:
  Position + Velocity  (both movement)
  Health + Armor       (both defense)
  Position + Mesh      (both visual)

⚠️ Question these:
  Health + Damage      (Who applies damage?)
  Velocity + Target    (Who uses target?)
```

---

## System Design

### Single Responsibility

Each system does one job:

```typescript
// ✅ Good - Clear job
const damageSystem = (world) => {
  world.query(Damage, Health).updateEach(([dmg, health]) => {
    health.current -= dmg.amount
  })
}

// ❌ Bad - Multiple jobs
const badSystem = (world) => {
  // Applies damage...
  world.query(Damage, Health).updateEach(([dmg, health]) => {
    health.current -= dmg.amount
  })

  // ...and removes dead entities...
  world.query(Health).forEach((entity) => {
    if (entity.get(Health).current <= 0) {
      entity.destroy()
    }
  })

  // ...and plays sounds
  if (damageApplied) {
    playSound('hit.mp3')
  }
}
```

### System Communication

Systems communicate **only through traits**:

```
System A updates Position trait
    ↓
System B reads Position trait
    ↓
System B updates Velocity trait
    ↓
System C reads Velocity trait

No direct system-to-system calls!
```

---

## Anti-Patterns to Avoid

### 1. God Objects

```typescript
// ❌ Don't do this - Entity has everything
const everything = trait({
  position: { x: 0, y: 0 },
  velocity: { x: 0, y: 0 },
  health: 100,
  armor: 20,
  damage: 10,
  // ... 50 more properties
})

// ✅ Do this - Separate traits
const Position = trait({ x: 0, y: 0 })
const Velocity = trait({ x: 0, y: 0 })
const Health = trait({ current: 100 })
// ... etc
```

### 2. Coupling Systems

```typescript
// ❌ Don't - Systems depend on each other
const systemA = (world) => {
  world.query(Data).updateEach(([d]) => {
    d.value = 42
  })
}

const systemB = (world) => {
  // Assumes systemA ran first!
  world.query(Data).forEach((entity) => {
    if (entity.get(Data).value !== 42) throw Error()
  })
}

// ✅ Do - Systems are independent
const systemA = (world) => {
  world.query(InputA).updateEach(([input]) => {
    // Process input
  })
}

const systemB = (world) => {
  world.query(InputB).updateEach(([input]) => {
    // Process input independently
  })
}
```

### 3. Logic in Traits

```typescript
// ❌ Don't - Trait with methods
const Player = trait({
  health: 100,
  takeDamage(amount) {  // ← NO!
    this.health -= amount
  }
})

// ✅ Do - Logic in systems
const damageSystem = (world) => {
  world.query(Health, Damage).updateEach(([health, damage]) => {
    health.current -= damage.amount
  })
}
```

---

## Best Practices

1. **Make traits small and focused**
   - Position should only have x, y, z
   - Don't add velocity to Position trait

2. **Name traits for their purpose**
   - `Position` not `Pos`
   - `Health` not `HP`
   - `Velocity` not `Vel`

3. **Create tags for zero-data traits**
   - `IsAlive` instead of `Alive: boolean`
   - `InvisibleEntity` instead of `visibility: false`

4. **Keep systems pure**
   - Same input → Same output
   - No side effects (except updating traits)
   - Easy to test and reason about

5. **Order systems by dependency**
   - Input systems first
   - Physics/logic systems second
   - Rendering systems last

---

## Trait Naming Convention

```
Data:        Lowercase (position, velocity, health)
Query:       PascalCase (Position, Velocity, Health)
Systems:     camelCase + 'System' (movementSystem, damageSystem)
Flags/Tags:  Is/Has prefix (IsAlive, HasShield, CanJump)
```

---

## Related Resources

- [ECS FAQ](https://github.com/SanderMertens/ecs-faq)
- [Koota Documentation](https://github.com/pmndrs/koota)
- [Previous: README](../README.md)
- [Next: Data Flow](./02-data-flow.md)
