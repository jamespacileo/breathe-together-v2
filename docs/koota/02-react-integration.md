# Koota: React Integration Patterns

Seamlessly integrate Koota ECS with React using hooks and context providers.

## Quick Reference

```typescript
// Setup
<WorldProvider world={world}>
  <YourApp />
</WorldProvider>

// In components
const world = useWorld()
const entities = useQuery(Position, Velocity)
const position = useTrait(entity, Position)
const { spawnPlayer, destroyEnemies } = useActions()
```

---

## Pattern 1: WorldProvider Setup

### The Problem

Multiple components need access to the same Koota world instance. Passing it as props gets tedious.

### The Solution

Wrap your app with `WorldProvider`:

```typescript
import { createWorld, WorldProvider } from 'koota/react'

// Create world once
const world = createWorld()

function App() {
  return (
    <WorldProvider world={world}>
      <Game />
    </WorldProvider>
  )
}

export default App
```

### How It Works

`WorldProvider` stores the world in React Context, making it available to all descendant components via hooks.

### Multiple Worlds (Advanced)

For complex apps, you can have multiple `WorldProvider` instances with different worlds:

```typescript
const gameWorld = createWorld()
const editorWorld = createWorld()

function App() {
  return (
    <>
      <WorldProvider world={gameWorld}>
        <GameView />
      </WorldProvider>

      <WorldProvider world={editorWorld}>
        <EditorView />
      </WorldProvider>
    </>
  )
}
```

### Project Example

In **breathe-together-v2** (`src/providers.tsx`):

```typescript
export function CanvasProvider({ children }: CanvasProviderProps) {
  const world = useMemo(() => createWorld(), [])

  return (
    <WorldProvider world={world}>
      <KootaSystems world={world}>
        {children}
      </KootaSystems>
    </WorldProvider>
  )
}
```

---

## Pattern 2: useWorld Hook

### The Problem

Components need to interact with the Koota world (spawn entities, query traits, etc.).

### The Solution

Use the `useWorld()` hook to access the world instance:

```typescript
function GameController() {
  const world = useWorld()

  useEffect(() => {
    // Spawn a player entity
    const player = world.spawn(Position, Velocity, Health)

    return () => {
      // Cleanup on unmount
      player.destroy()
    }
  }, [world])

  const handleJump = () => {
    const player = world.queryFirst(Position, IsPlayer)
    if (player) {
      const pos = player.get(Position)
      const vel = player.get(Velocity)
      vel.y += 10
    }
  }

  return <button onClick={handleJump}>Jump</button>
}
```

### Key Points

- `useWorld()` retrieves the world from the nearest `WorldProvider`
- Always memoize callbacks that use world to avoid infinite dependencies
- Cleanup with `.destroy()` in return of `useEffect`

### Common Queries

```typescript
const world = useWorld()

// Find first entity with traits
const player = world.queryFirst(Position, IsPlayer)

// Find all entities with traits
const enemies = world.query(Enemy, Health)

// Check if entity has trait
const hasHealth = player?.has(Health)

// Get trait value
const position = player?.get(Position)

// Set trait value
player?.set(Position, { x: 0, y: 0 })

// Add trait to entity
player?.add(Stunned)

// Remove trait from entity
player?.remove(Stunned)

// Destroy entity
player?.destroy()
```

---

## Pattern 3: useQuery Hook

### The Problem

Components need to reactively render a list of entities. When entities are spawned/destroyed, the list should update.

### The Solution

Use `useQuery()` to get a reactive list:

```typescript
function EnemyList() {
  // Reactively updates whenever an Enemy entity is added/removed
  const enemies = useQuery(Enemy, Health)

  return (
    <div>
      {enemies.map((entity) => (
        <EnemyView key={entity.id()} entity={entity} />
      ))}
    </div>
  )
}

function EnemyView({ entity }: { entity: Entity }) {
  const health = useTrait(entity, Health)

  if (!health) return null

  return <div>Health: {health.current}/{health.max}</div>
}
```

### How It Works

`useQuery()` returns an array of entities matching the trait combination. It re-renders when:
- New entities are spawned with those traits
- Entities are destroyed
- New entities lose those traits

### Performance Consideration

`useQuery()` creates a new array each time the matching entities change. For rendering large lists, consider using a virtual scroller (react-window, tanstack-virtual, etc.).

### Project Note

In **breathe-together-v2**, the hot path uses `world.query` inside `useFrame`
(`src/entities/particle/index.tsx`) to avoid `useQuery()` re-renders for hundreds
of particles. Prefer `useQuery()` for UI lists and small counts.

---

## Pattern 4: useTrait Hook

### The Problem

Components need to reactively read a single trait value. Updates to the trait should trigger re-renders.

### The Solution

Use `useTrait()` to observe trait changes:

```typescript
function PlayerUI({ playerId }: { playerId: string }) {
  const world = useWorld()
  const player = world.queryFirst(Position, IsPlayer)

  // Reactively track the Health trait
  const health = useTrait(player, Health)

  // This component re-renders whenever health changes
  if (!health) {
    return <div>Player has no health</div>
  }

  return (
    <div>
      <div>Health: {health.current}/{health.max}</div>
      <div>Stamina: {health.stamina}</div>
    </div>
  )
}
```

### Understanding Undefined

```typescript
const position = useTrait(entity, Position)

// undefined can mean two things:
// 1. entity is undefined
// 2. entity exists but doesn't have Position trait

// To disambiguate:
const entity = useQueryFirst(Position)

if (!entity) {
  return <div>No position entity found</div>
}

const position = useTrait(entity, Position)

if (!position) {
  // Now we know entity exists, but doesn't have Position
  return <div>Entity has no position</div>
}
```

### Real-World Example

```typescript
function HealthBar({ entityId }: { entityId: string }) {
  const world = useWorld()
  const entity = world.getEntityById(entityId)
  const health = useTrait(entity, Health)

  if (!health) return null

  const percent = (health.current / health.max) * 100

  return (
    <div className="health-bar">
      <div className="fill" style={{ width: `${percent}%` }} />
      <span>{health.current}</span>
    </div>
  )
}
```

---

## Pattern 5: useActions Hook

### The Problem

Components need to trigger world changes (spawn entities, trigger events, etc.) without direct world access or passing callbacks.

### The Solution

Define actions using `createActions()` and use them via `useActions()`:

```typescript
// Define actions (outside component)
const gameActions = createActions((world) => ({
  spawnPlayer: () => {
    const player = world.spawn(Position, Velocity, IsPlayer)
    player.set(Position, { x: 0, y: 0 })
    return player
  },

  destroyAllEnemies: () => {
    world.query(Enemy).forEach((enemy) => {
      enemy.destroy()
    })
  },

  resetLevel: () => {
    // Clear all entities
    world.query().forEach((entity) => {
      entity.destroy()
    })
  },

  pauseGame: () => {
    // Add pause trait to all entities
    world.query().forEach((entity) => {
      entity.add(Paused)
    })
  },
}))

// In component
function GameControls() {
  const { spawnPlayer, destroyAllEnemies, resetLevel, pauseGame } = useActions()

  return (
    <div>
      <button onClick={spawnPlayer}>Spawn Player</button>
      <button onClick={destroyAllEnemies}>Clear Enemies</button>
      <button onClick={resetLevel}>Reset</button>
      <button onClick={pauseGame}>Pause</button>
    </div>
  )
}
```

### How It Works

1. `createActions()` creates a closure over the world
2. You can call world methods inside action functions
3. `useActions()` retrieves the bound actions from context
4. Components call actions without directly accessing world

### Benefits

- **Decoupling**: Components don't directly touch the world
- **Consistency**: Actions are defined once, used everywhere
- **Reusability**: Actions work with any `WorldProvider`
- **Testability**: Actions are pure functions that can be tested

### Project Example

In **breathe-together-v2** (potential future use):

```typescript
const breatheActions = createActions((world) => ({
  toggleBreath: () => {
    const breath = world.queryFirst(BreathEntity)
    if (breath?.has(Paused)) {
      breath.remove(Paused)
    } else {
      breath?.add(Paused)
    }
  },
}))
```

---

## Pattern 6: Conditional Rendering with useQuery

### The Problem

Render UI based on whether certain entities exist.

### The Solution

```typescript
function GameUI() {
  const players = useQuery(Position, IsPlayer)
  const gameOverEntities = useQuery(GameOver)

  // Show game over screen if any GameOver entity exists
  if (gameOverEntities.length > 0) {
    return <GameOverScreen />
  }

  // Show nothing if no player
  if (players.length === 0) {
    return <WaitingForPlayer />
  }

  return (
    <div>
      <HealthBar entity={players[0]} />
      <Score />
    </div>
  )
}
```

---

## Pattern 7: Derived State from Traits

### The Problem

You want to compute derived values from trait data (e.g., health percentage).

### The Solution

Use `useMemo()` with trait values:

```typescript
function PlayerStats({ entity }: { entity: Entity }) {
  const health = useTrait(entity, Health)
  const stamina = useTrait(entity, Stamina)

  // Compute derived values
  const healthPercent = useMemo(() => {
    if (!health) return 0
    return (health.current / health.max) * 100
  }, [health])

  const staminaPercent = useMemo(() => {
    if (!stamina) return 0
    return (stamina.current / stamina.max) * 100
  }, [stamina])

  return (
    <div>
      <div>Health: {healthPercent.toFixed(0)}%</div>
      <div>Stamina: {staminaPercent.toFixed(0)}%</div>
    </div>
  )
}
```

---

## Pattern 8: Debugging Component Queries

### The Problem

How do you see what entities exist in the world?

### The Solution

Create a debug component:

```typescript
function WorldDebug() {
  const world = useWorld()
  const [entities, setEntities] = useState([])
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null)

  useEffect(() => {
    // Update every frame
    const updateDebug = () => {
      const all = Array.from(world.query())
      setEntities(all)
    }

    const frame = setInterval(updateDebug, 500)
    return () => clearInterval(frame)
  }, [world])

  return (
    <div style={{ position: 'fixed', bottom: 0, right: 0, fontSize: 12 }}>
      <div>Entities: {entities.length}</div>
      <select onChange={(e) => setSelectedEntity(entities[parseInt(e.target.value)])}>
        {entities.map((ent, i) => (
          <option key={ent.id()} value={i}>
            {ent.id()}
          </option>
        ))}
      </select>

      {selectedEntity && (
        <div>
          <div>ID: {selectedEntity.id()}</div>
          <div>Traits: {JSON.stringify(selectedEntity.traits())}</div>
        </div>
      )}
    </div>
  )
}
```

---

## Related Resources

- [Koota React Hooks Documentation](https://github.com/pmndrs/koota#react)
- [Previous: Advanced Patterns](./01-advanced-patterns.md)
- [Next: Performance](./03-performance.md)

---

## Pro Tips

1. **Always wrap app with `WorldProvider`** before using hooks
2. **Use `useQuery()` for lists**, `useTrait()` for single values
3. **Disambiguate undefined** with entity checks
4. **Define actions at module scope**, not in components
5. **Use `useMemo()` for derived state** to avoid recalculations
6. **Keep components small** - one query per component is cleaner
7. **Test actions independently** from components
