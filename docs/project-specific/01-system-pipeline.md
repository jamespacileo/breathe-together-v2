# System Pipeline Architecture

The 7-phase system execution pipeline that drives breathe-together-v2.

## Visual Pipeline

```mermaid
graph TD
    A["Phase 1: LOGIC<br/>BreathSystem<br/>Updates UTC-based breath state"] -->B["Phase 2: PHYSICS<br/>ParticlePhysicsSystem<br/>Calculates forces & velocities"]
    B -->C["Phase 3: INPUT<br/>CursorPositionFromLandSystem<br/>Ray-cast cursor position"]
    C -->D["Phase 4: FORCES<br/>VelocityTowardsTargetSystem<br/>Apply attractive forces"]
    D -->E["Phase 5: INTEGRATION<br/>PositionFromVelocity<br/>Update positions from velocity"]
    E -->F["Phase 6: RENDER<br/>MeshFromPositionSystem<br/>Sync Three.js transforms"]
    F -->G["Phase 7: CAMERA<br/>CameraFollowFocusedSystem<br/>Move camera to focus entity"]

    style A fill:#e1f5ff
    style B fill:#fff3e0
    style C fill:#f3e5f5
    style D fill:#fce4ec
    style E fill:#e8f5e9
    style F fill:#fff9c4
    style G fill:#f1f8e9
```

## Phase Description

### Phase 1: Logic

**System**: `breathSystem`
**Input**: UTC time (global, synchronized)
**Output**: breathPhase, orbitRadius, sphereScale, crystallization
**Purpose**: Calculate global breathing state

```typescript
// All users worldwide see the same breathing phase
const phase = (Date.now() % 16000) / 16000  // 0-1 over 16 seconds
const phaseType = Math.floor(phase * 4)     // 0=inhale, 1=hold-in, 2=exhale, 3=hold-out
```

**Key Trait**: `BreathEntity`

---

### Phase 2: Physics

**System**: `particlePhysicsSystem`
**Input**: Position, Velocity, ParticlePhysics traits
**Output**: Updated Velocity (forces applied)
**Purpose**: Apply forces to particles

```
For each particle:
  1. Calculate repulsion from other particles
  2. Apply spring forces toward orbit
  3. Apply damping
  4. Update velocity
```

**Key Traits**: `Position`, `Velocity`, `ParticlePhysics`

---

### Phase 3: Input

**System**: `cursorPositionFromLandSystem`
**Input**: Mouse position, camera, land mesh
**Output**: CursorPosition trait
**Purpose**: Ray-cast from camera through mouse to find cursor world position

```
Ray-casting:
  1. Project mouse coords to 3D ray
  2. Intersect with land geometry
  3. Store intersection point
```

**Key Trait**: `CursorPosition`

---

### Phase 4: Forces

**System**: `velocityTowardsTargetSystem`
**Input**: Position, Velocity, Target traits
**Output**: Updated Velocity (forces toward target)
**Purpose**: Move particles toward cursor

```
For each entity:
  1. Calculate direction to target
  2. Apply attractive force
  3. Add velocity
```

**Key Traits**: `Position`, `Velocity`, `Target`

---

### Phase 5: Integration

**System**: `positionFromVelocitySystem`
**Input**: Position, Velocity traits
**Output**: Updated Position
**Purpose**: Integrate velocity into position

```
For each entity:
  position += velocity * delta
  velocity *= damping  // Natural deceleration
```

**Key Traits**: `Position`, `Velocity`

---

### Phase 6: Render

**System**: `meshFromPositionSystem`
**Input**: Position, Mesh traits
**Output**: Three.js `mesh.position` synced
**Purpose**: Copy ECS Position data to Three.js objects

```
For each entity:
  mesh.position.copy(position)
  mesh.rotation.copy(rotation)
  mesh.scale.copy(scale)
```

**Key Traits**: `Position`, `Mesh`

---

### Phase 7: Camera

**System**: `cameraFollowFocusedSystem`
**Input**: Position traits, Focused entity
**Output**: Camera position updated
**Purpose**: Move camera to follow focused entity

```
Lerp camera toward focused entity:
  camera.position.lerp(focusedEntity.position, 0.1)
```

**Key Traits**: `Position`, `Focused`

---

## Data Dependencies Diagram

```mermaid
graph LR
    subgraph Inputs["Inputs"]
        Time["UTC Time"]
        Mouse["Mouse Position"]
        Cam["Camera"]
    end

    subgraph Systems["Systems"]
        S1["Breath<br/>Phase 1"]
        S2["Physics<br/>Phase 2"]
        S3["Cursor<br/>Phase 3"]
        S4["Velocity<br/>Phase 4"]
        S5["Position<br/>Phase 5"]
        S6["Render<br/>Phase 6"]
        S7["Camera<br/>Phase 7"]
    end

    subgraph Traits["Traits (State)"]
        BP["BreathPhase"]
        Pos["Position"]
        Vel["Velocity"]
        CP["CursorPos"]
        Mesh["Mesh"]
        Foc["Focused"]
    end

    Time -->|"Global state"| S1
    S1 -->|"Updates"| BP

    Mouse -->|"Ray-cast"| S3
    Cam -->|"Camera matrix"| S3
    S3 -->|"Updates"| CP

    Pos -->|"Query"| S2
    Vel -->|"Query"| S2
    S2 -->|"Updates"| Vel

    Vel -->|"Query"| S4
    CP -->|"Target"| S4
    S4 -->|"Updates"| Vel

    Vel -->|"Query"| S5
    Pos -->|"Query"| S5
    S5 -->|"Updates"| Pos

    Pos -->|"Query"| S6
    Mesh -->|"Query"| S6
    S6 -->|"Syncs"| Mesh

    Pos -->|"Query"| S7
    Foc -->|"Which entity"| S7

    style BP fill:#e1f5ff
    style Pos fill:#fff3e0
    style Vel fill:#fff3e0
    style CP fill:#f3e5f5
    style Mesh fill:#fff9c4
```

---

## Critical Execution Order

Order matters because later systems depend on earlier outputs:

| Phase | System | Why This Order |
|-------|--------|---|
| 1 | Breath | Must run first - sets global state |
| 2 | Physics | Needs Position/Velocity before updating velocity |
| 3 | Cursor | Needs camera state (not dependent on physics) |
| 4 | Velocity | MUST come after Physics (reads updated velocities!) |
| 5 | Position | MUST come after Velocity (reads updated velocities!) |
| 6 | Render | MUST come after Position (syncs to mesh) |
| 7 | Camera | MUST come after Position (follows entity) |

### What Breaks If Order Changes?

```typescript
// ❌ If Physics runs after Velocity:
// Velocity system reads old physics forces
// Physics overwrites velocity updates
// Result: Particles move incorrectly

// ❌ If Render runs before Position:
// Mesh sees old position values
// Visual lag (one frame behind)

// ❌ If Camera runs before Render:
// Camera follows position from previous frame
// Notchy camera movement
```

---

## File Locations

| System | File | Line |
|--------|------|------|
| breathSystem | `src/entities/breath/systems.tsx` | - |
| particlePhysicsSystem | `src/entities/particle/systems.tsx` | - |
| cursorPositionFromLandSystem | `src/entities/cursor/systems.tsx` | - |
| velocityTowardsTargetSystem | `src/shared/systems.tsx` | - |
| positionFromVelocitySystem | `src/shared/systems.tsx` | - |
| meshFromPositionSystem | `src/shared/systems.tsx` | - |
| cameraFollowFocusedSystem | `src/entities/camera/systems.tsx` | - |

Execution order defined in: `src/providers.tsx` → `KootaSystems` component

---

## Profiling the Pipeline

Use Triplex performance metrics:

```
Phase 1 Breath:        0.2ms ✓
Phase 2 Physics:       1.5ms ⚠ (Largest!)
Phase 3 Cursor:        0.1ms ✓
Phase 4 Velocity:      0.3ms ✓
Phase 5 Position:      0.2ms ✓
Phase 6 Render:        8.0ms ⚠ (Syncing to 300 meshes!)
Phase 7 Camera:        0.1ms ✓
---
Total:                11.4ms (90 FPS headroom on 60 FPS target)
```

Optimization opportunities:
- Phase 2 (Physics): Reduce particle count for lower-end devices
- Phase 6 (Render): Uses `setMatrixAt` - already optimized

---

## System Debugging

Disable systems individually to isolate issues:

```typescript
<Canvas>
  <KootaSystems
    breathSystemEnabled={true}       // Disable to freeze breathing
    particlePhysicsEnabled={true}    // Disable to stop particle movement
    cursorEnabled={true}             // Disable to freeze cursor
    velocitySystemEnabled={true}     // Disable to stop velocity updates
    positionSystemEnabled={true}     // Disable to freeze all positions
    renderSystemEnabled={true}       // Disable to see invisible entities
    cameraSystemEnabled={true}       // Disable to freeze camera
  />
</Canvas>
```

---

## Related Resources

- [Koota ECS Patterns](../koota/01-advanced-patterns.md)
- [ECS Data Flow](../ecs-architecture/02-data-flow.md)
- [Next: Adaptive Quality System](./02-adaptive-quality.md)
