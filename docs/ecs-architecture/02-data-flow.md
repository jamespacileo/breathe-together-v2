# ECS: Data Flow & System Ordering

Understanding how data flows through your ECS systems.

## Data Flow Pattern

```
Frame Start
    ↓
[System 1] reads A, writes B
    ↓
[System 2] reads B, writes C
    ↓
[System 3] reads C, writes A
    ↓
Render
    ↓
Frame End
```

## The breathe-together-v2 Data Flow

```
BreathSystem
  Input: UTC time
  Output: BreathPhase, OrbitRadius
    ↓
ParticlePhysicsSystem
  Input: Position, Velocity, BreathPhase
  Output: Velocity (updated with forces)
    ↓
CursorPositionSystem
  Input: Mouse, Camera, Geometry
  Output: CursorPosition
    ↓
VelocityTowardsTargetSystem
  Input: Velocity, Position, CursorPosition
  Output: Velocity (updated with attraction)
    ↓
PositionFromVelocitySystem
  Input: Position, Velocity
  Output: Position (updated)
    ↓
MeshFromPositionSystem
  Input: Position, Mesh
  Output: Three.js objects synced
    ↓
CameraFollowSystem
  Input: Position, FocusEntity
  Output: Camera position
    ↓
Render Frame
```

## Critical Dependencies

Systems must run in order when:
- System B reads output from System A

```
PhysicsSystem writes Velocity
    ↓
VelocityTowardsTarget reads Velocity (must run after!)
```

## Independent Systems

Systems can run in any order when:
- No data dependencies

```
Systems reading different data can run in parallel (theoretically):
  InputSystem reads Input
  PhysicsSystem reads Position, Velocity
  RenderSystem reads Mesh
  (no interdependencies)
```

## Identifying Bottlenecks

Use this checklist:

1. Which system takes longest? (Profile with Triplex)
2. Does it query many entities?
3. Does it do expensive calculations?
4. Can it be split into smaller systems?
5. Can it run less frequently?

---

## Related Resources

- [Previous: Design Principles](./01-design-principles.md)
- [Next: Patterns](./03-patterns.md)
- [System Pipeline](../project-specific/01-system-pipeline.md)
