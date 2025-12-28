# Triplex: Koota Integration (2025)

Leverage Triplex's 2025 ECS integration for powerful debugging and visual system configuration.

## New APIs (2025)

Triplex now has experimental APIs for Koota ECS integration:

- **`createSystem()`** - Create named, debuggable systems
- **`injectSystems()`** - Inject systems into components with Triplex props

---

## Pattern 1: createSystem() for Named Systems

Create systems that appear in Triplex debugger:

```typescript
import { createSystem } from '@triplex/api'

// Create a named system for debugging
const breathSystem = createSystem('BreathSystem', (world, { time }) => {
  const query = cacheQuery(BreathEntity)
  query.updateEach(([breath]) => {
    const phase = calculateBreathPhase(time)
    breath.phase = phase
  })
})

// System appears in Triplex with this name
// Can be toggled on/off in editor
// Can set breakpoints in debugger
```

---

## Pattern 2: injectSystems() for Props-Driven Systems

Inject systems into components, making them configurable via Triplex:

```typescript
import { injectSystems } from '@triplex/api'

function ParticleSystem({ physicsEnabled = true, renderEnabled = true }) {
  const world = useWorld()

  injectSystems(world, [
    {
      name: 'ParticlePhysics',
      enabled: physicsEnabled,  // ← Toggle in Triplex!
      system: (world, { delta }) => {
        updatePhysics(world, delta)
      }
    },
    {
      name: 'ParticleRender',
      enabled: renderEnabled,  // ← Toggle in Triplex!
      system: (world) => {
        updateRender(world)
      }
    }
  ])

  return null
}

// In Triplex, props become toggleable controls
// <ParticleSystem physicsEnabled={true} renderEnabled={true} />
```

---

## Pattern 3: Post-Processing with Triplex

2025 feature: Render post-processing effects visible in Triplex editor:

```typescript
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'

function SceneWithEffects({ bloomStrength = 1 }) {
  return (
    <>
      <Canvas>
        <Scene />

        <EffectComposer>
          <Bloom
            intensity={bloomStrength}  {/* Adjust in Triplex */}
            luminanceThreshold={0.0}
            luminanceSmoothing={0.9}
          />
          <Vignette darkness={0.5} />
        </EffectComposer>
      </Canvas>
    </>
  )
}

// In Triplex, adjust bloomStrength slider in real-time
// Effect updates immediately in preview
```

---

## Pattern 4: Transform Controls with Props Sync

2025 Update: Transform controls now flush updates through props:

```typescript
function EditableComponent({ position = [0, 0, 0], rotation = [0, 0, 0] }) {
  const meshRef = useRef()

  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.position.set(...position)
      meshRef.current.rotation.set(...rotation)
    }
  }, [position, rotation])

  return (
    <TransformControls>
      <mesh ref={meshRef}>
        <boxGeometry />
        <meshStandardMaterial />
      </mesh>
    </TransformControls>
  )
}

// In Triplex:
// 1. Drag mesh to move it
// 2. Triplex updates position prop
// 3. Component re-renders with new position
// 4. Changes persist in code
```

---

## Pattern 5: WebXR Support (2025)

View components in VR/AR with Triplex:

```typescript
function VRComponent() {
  const { gl } = useThree()

  // Triplex automatically detects WebXR support
  // "Open in VR" button appears if headset available

  return (
    <mesh>
      <boxGeometry />
      <meshStandardMaterial />
    </mesh>
  )
}

// Usage:
// 1. Edit component in Triplex
// 2. Click "Open in VR"
// 3. View in headset, interact in real-time
// 4. Changes sync back to editor
```

---

## Pattern 6: System Breakpoints

Debug systems with Triplex breakpoints:

```typescript
const physicsSystem = createSystem('Physics', (world, context) => {
  // debugger  // ← Won't work in Triplex
  // Instead, use system pause

  const query = cacheQuery(Position, Velocity)
  query.updateEach(([pos, vel]) => {
    // Triplex can pause here
    pos.x += vel.x * context.delta
  })
})

// In Triplex:
// 1. Click on system name
// 2. Set pause conditions (frame number, entity count, etc)
// 3. System pauses when condition met
// 4. Inspect entity state
```

---

## Pattern 7: Performance Profiling in Triplex

Integrated performance metrics:

```typescript
function PerformanceAwareScene() {
  const [fps, setFps] = useState(60)

  useFrame(({ clock }) => {
    // Triplex shows FPS graph for this system
    // You can see exact frame time in inspector
  })

  return (
    <group>
      <BreathingEntities fps={fps} />
      <ParticleSystem fps={fps} />
    </group>
  )
}

// Triplex displays:
// - FPS over time
// - System execution time
// - Memory usage
// - Draw calls
```

---

## 2025 Workflow Example

Complete Triplex + Koota workflow:

```
1. Edit component in Triplex UI
   - Drag entity position
   - Adjust props with sliders
   - Toggle systems on/off

2. See changes instantly
   - Post-processing updates live
   - Physics simulation reacts
   - Particle effects update

3. Use new APIs
   - createSystem() for named debugging
   - injectSystems() for prop-driven systems
   - Breakpoints for pausing execution

4. Profile performance
   - View system execution times
   - Monitor memory usage
   - Optimize bottlenecks

5. Deploy with WebXR
   - View final result in VR/AR
   - Verify appearance in headset
   - Test interactions

6. Save and commit
   - Props changes saved to code
   - System configurations serialized
   - Ready for production
```

---

## Pro Tips for Triplex + Koota

1. **Name systems clearly** for easy debugging
2. **Expose key values as props** (not just for visuals, but for logic)
3. **Use system injections** for testing different system orders
4. **Profile before optimizing** using Triplex metrics
5. **Use WebXR preview** before deploying VR experiences
6. **Keep systems small** for better debugging granularity

---

## Related Resources

- [Triplex 2025 Features](https://triplex.dev/blog/2025-updates)
- [Triplex API Documentation](https://triplex.dev/docs/api)
- [Previous: Configuration Patterns](./02-configuration-patterns.md)
- [Next: 2025 Features](./04-2025-features.md)
