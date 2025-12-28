# React Three Fiber: useFrame Patterns

Master the most important R3F hook for animation and updates.

## Quick Reference

```typescript
// Basic pattern
useFrame(({ clock, mouse, camera, scene, size }, delta) => {
  // Update code runs EVERY FRAME
  // delta = time since last frame
  // Happens in render loop BEFORE scene rendering
})
```

---

## Pattern 1: Direct Mutation with Delta Time

### The Problem

```typescript
// ❌ BAD - Fixed increment (refresh-rate dependent)
useFrame(() => {
  mesh.position.x += 0.1  // 60 FPS: 6 units/sec, 144 FPS: 14.4 units/sec!
})
```

### The Impact

- Inconsistent speeds on different displays
- Fast displays cause faster object movement
- Game feels different on 60 Hz vs 144 Hz monitors

### The Solution

```typescript
// ✅ GOOD - Use delta time
const meshRef = useRef()

useFrame((state, delta) => {
  // delta = frame time (e.g., 0.016 for 60 FPS)
  meshRef.current.position.x += speed * delta  // Consistent speed everywhere
})

// Always use delta for:
// - Movement (position += velocity * delta)
// - Rotation (rotation.z += angularVelocity * delta)
// - Animation (progress += duration * delta)
```

### Real Examples

```typescript
// SPEED CONSTANT (units per second)
const MOVE_SPEED = 5  // 5 units/second
const ROTATE_SPEED = Math.PI  // 180 degrees/second

function AnimatedBox() {
  const ref = useRef()

  useFrame((state, delta) => {
    // Movement
    ref.current.position.x += MOVE_SPEED * delta

    // Rotation
    ref.current.rotation.y += ROTATE_SPEED * delta

    // Animation (0 to 1 over 3 seconds)
    state.userData.progress = (state.userData.progress || 0) + delta / 3
  })

  return <mesh ref={ref}><boxGeometry /><meshStandardMaterial /></mesh>
}
```

---

## Pattern 2: Lerp for Smooth Transitions

### The Problem

```typescript
// ❌ BAD - Instant teleport
useFrame(() => {
  mesh.position.copy(targetPos)
})

// ❌ ALSO BAD - Fixed speed regardless of framerate
useFrame(() => {
  mesh.position.x += (targetPos.x - mesh.position.x) * 0.1
})
```

### The Solution

```typescript
// ✅ GOOD - Frame-rate independent lerp
const tempVec = new THREE.Vector3()

useFrame((state, delta) => {
  tempVec.set(targetX, targetY, targetZ)

  // Lerp with delta time
  // 0.1 = smoothness coefficient (0-1)
  meshRef.current.position.lerp(tempVec, 0.1)
})

// ✅ ALSO GOOD - Use MathUtils.lerp for manual control
useFrame((state, delta) => {
  const alpha = 0.1  // Smoothness (higher = faster)
  meshRef.current.position.x = THREE.MathUtils.lerp(
    meshRef.current.position.x,
    targetX,
    alpha
  )
})
```

### Delta-Aware Lerp

For truly delta-independent lerp:

```typescript
function deltaLerp(current, target, speed, delta) {
  const diff = target - current
  const change = diff * (1 - Math.exp(-speed * delta))
  return current + change
}

useFrame((state, delta) => {
  meshRef.current.position.x = deltaLerp(
    meshRef.current.position.x,
    targetX,
    smoothness,  // decay rate (higher = slower)
    delta
  )
})
```

---

## Pattern 3: Accessing Global State in useFrame

### The Problem

```typescript
// ❌ BAD - No access to props or state inside useFrame
function Component({ targetX }) {
  useFrame(() => {
    mesh.position.x = targetX  // ❌ targetX is undefined here
  })
}
```

### The Solution

Use a ref to store the latest value:

```typescript
// ✅ GOOD - Store prop in ref
function Component({ targetX }) {
  const targetRef = useRef(targetX)
  const meshRef = useRef()

  useEffect(() => {
    targetRef.current = targetX  // Update ref when prop changes
  }, [targetX])

  useFrame(() => {
    meshRef.current.position.x = targetRef.current
  })

  return <mesh ref={meshRef}><boxGeometry /></mesh>
}
```

### Using Context

```typescript
// ✅ ALSO GOOD - Use context for global values
const GameContext = createContext()

<GameContext.Provider value={{ speed: 5, paused: false }}>
  <YourScene />
</GameContext.Provider>

function Component() {
  const gameState = useContext(GameContext)
  const speedRef = useRef(gameState.speed)
  const pausedRef = useRef(gameState.paused)

  useEffect(() => {
    speedRef.current = gameState.speed
    pausedRef.current = gameState.paused
  }, [gameState])

  useFrame(() => {
    if (!pausedRef.current) {
      mesh.position.x += speedRef.current * delta
    }
  })
}
```

---

## Pattern 4: useFrame Execution Order

### The Problem

```typescript
// ❌ DON'T ASSUME ORDER
function Component1() {
  useFrame(() => {
    // Does this run before Component2?
  })
}

function Component2() {
  useFrame(() => {
    // Or does this run first?
  })
}
```

### The Solution

Execution order is **component tree order** (pre-order traverse):

```typescript
// Execution order example
<Canvas>
  <Comp1 />           {/* useFrame #1 */}
  <group>
    <Comp2 />         {/* useFrame #2 */}
    <Comp3 />         {/* useFrame #3 */}
  </group>
</Canvas>

// During each frame: Comp1 → Comp2 → Comp3 → render
```

If you need explicit ordering, use a controller component:

```typescript
// ✅ GOOD - Centralized frame updates
function FrameController() {
  useFrame(() => {
    updatePhysics()      // Phase 1
    updateAnimation()    // Phase 2
    updateCamera()       // Phase 3
    // Explicit order guaranteed
  })

  return null  // Invisible controller
}

<Canvas>
  <FrameController />  {/* Runs first */}
  <YourScene />
</Canvas>
```

---

## Pattern 5: Multiple useFrame Hooks

### The Problem

```typescript
// ❌ Multiple independent updates
function Component() {
  useFrame(() => updateA())
  useFrame(() => updateB())
  useFrame(() => updateC())
  // Each causes a closure capture
}
```

### The Solution

Combine into a single useFrame when possible:

```typescript
// ✅ BETTER - Single update function
function Component() {
  useFrame((state, delta) => {
    updateA(state, delta)
    updateB(state, delta)
    updateC(state, delta)
  })
}
```

---

## Pattern 6: Conditional useFrame

### The Problem

```typescript
// ❌ DON'T DO THIS - useFrame inside conditional
function Component({ enabled }) {
  if (enabled) {
    useFrame(() => {  // ❌ Violates hooks rules!
      updateStuff()
    })
  }
}
```

### The Solution

Use a ref to control execution:

```typescript
// ✅ DO THIS - useFrame always runs, conditional logic inside
function Component({ enabled }) {
  const enabledRef = useRef(enabled)

  useEffect(() => {
    enabledRef.current = enabled
  }, [enabled])

  useFrame(() => {
    if (enabledRef.current) {
      updateStuff()
    }
  })
}
```

---

## Pattern 7: Performance-Critical Updates

### The Problem

```typescript
// ❌ SLOW - Creating objects in useFrame
useFrame(() => {
  const result = new Vector3()
  // ...
})
```

### The Solution

Pre-allocate in module scope:

```typescript
// ✅ FAST - Objects allocated once
const tempVec = new THREE.Vector3()
const tempQuat = new THREE.Quaternion()

function Component() {
  useFrame(() => {
    tempVec.set(x, y, z)  // Reuse
    // ...
  })
}
```

---

## Pattern 8: useFrame with useEffect Cleanup

### The Problem

```typescript
// ❌ SLOW - Texture loaded every frame
function Component() {
  useFrame(() => {
    mesh.material.map = new THREE.TextureLoader().load('texture.png')
  })
}
```

### The Solution

Load in useEffect, update in useFrame:

```typescript
// ✅ GOOD - Load once, use in frame updates
function Component() {
  const meshRef = useRef()
  const mapRef = useRef()

  useEffect(() => {
    new THREE.TextureLoader().load('texture.png', (texture) => {
      mapRef.current = texture
      meshRef.current.material.map = texture
    })
  }, [])

  useFrame(() => {
    // Update material properties based on texture
    if (mapRef.current) {
      meshRef.current.material.map.rotation += 0.01
    }
  })

  return <mesh ref={meshRef}><meshStandardMaterial /></mesh>
}
```

---

## Pattern 9: Debugging useFrame Performance

```typescript
// ✅ GOOD - Measure frame time
useFrame(({ clock }, delta) => {
  const frameStart = performance.now()

  // Your update code
  updateEntities(delta)

  const frameEnd = performance.now()
  const frameTime = frameEnd - frameStart

  if (frameTime > 5) {  // Alert on slow frames
    console.warn(`Slow frame: ${frameTime.toFixed(2)}ms`)
  }
})
```

### Use Profiler to Find Hotspots

```typescript
import { Profiler } from 'react'

<Profiler id="game-loop" onRender={onRender}>
  <Canvas>
    <YourScene />
  </Canvas>
</Profiler>

function onRender(id, phase, actualDuration, baseDuration) {
  console.log(`${id} (${phase}): ${actualDuration}ms`)
}
```

---

## Pattern 10: useFrame with Mouse/Touch Input

```typescript
import { useThree } from '@react-three/fiber'

function MouseFollower() {
  const meshRef = useRef()
  const { mouse, raycaster, camera } = useThree()
  const tempVec = new THREE.Vector3()

  useFrame(() => {
    // Mouse to world position
    tempVec.set(mouse.x, mouse.y, 0.5)
    tempVec.unproject(camera)

    // Follow mouse
    meshRef.current.position.lerp(tempVec, 0.1)
  })

  return <mesh ref={meshRef}><boxGeometry /></mesh>
}
```

---

## useFrame Pitfalls Summary

```typescript
❌ Creating objects
useFrame(() => {
  const vec = new THREE.Vector3()  // NO!
})

❌ Calling setState
useFrame(() => {
  setPosition(x)  // NO! Use refs instead
})

❌ Accessing props directly
function Comp({ value }) {
  useFrame(() => {
    console.log(value)  // Stale! Use ref
  })
}

✅ Reusing objects
const tempVec = new THREE.Vector3()
useFrame(() => {
  tempVec.set(x, y, z)
})

✅ Using delta time
useFrame((state, delta) => {
  mesh.position.x += speed * delta
})

✅ Using refs for values
const valueRef = useRef(value)
useEffect(() => { valueRef.current = value }, [value])
useFrame(() => {
  console.log(valueRef.current)  // Current!
})
```

---

## Advanced: useGraph() for Model Node Extraction

### The Problem

When loading complex GLTF models with Blender/3D Studio, accessing specific nodes/materials is clunky:

```typescript
// ❌ SLOW - Clone entire model just to access one node
const { scene } = useGLTF('robot.glb')
const robotNode = scene.clone().getObjectByName('Armature')
```

### The Solution: useGraph()

```typescript
// ✅ GOOD - Extract nodes/materials directly
import { useGraph } from '@react-three/drei'
import { useGLTF } from '@react-three/drei'

function Robot() {
  const { scene } = useGLTF('robot.glb')
  const { nodes, materials } = useGraph(scene)

  return (
    <group>
      {/* Access specific nodes by name */}
      <mesh geometry={nodes.Body.geometry} material={materials.Plastic} />
      <mesh geometry={nodes.LeftArm.geometry} material={materials.Metal} />
      <mesh geometry={nodes.RightArm.geometry} material={materials.Metal} />
    </group>
  )
}
```

### Real-World Pattern

```typescript
// In your Blender/3DS file, name parts meaningfully:
// - Armature
// - Body_Mesh
// - LeftHand
// - RightHand
// - Eyes_Glass

function Character() {
  const { scene } = useGLTF('character.glb')
  const { nodes, materials } = useGraph(scene)

  return (
    <group>
      <mesh
        geometry={nodes.Body_Mesh.geometry}
        material={materials.Skin}
        castShadow
      />
      <mesh
        geometry={nodes.Eyes_Glass.geometry}
        material={materials.Glass}
        position={[0, 1.8, 0.5]}
      />
    </group>
  )
}

export default Character
```

### Performance Benefit

```typescript
// Without useGraph (60KB model, 5 draw calls):
const { scene } = useGLTF('model.glb')
// Loads everything, 5 separate meshes rendered

// With useGraph + selective rendering:
const { nodes } = useGraph(scene)
// Load once, render only what you need
// Can skip rendering certain nodes entirely

// Example: Hide low-detail parts based on distance
const { nodes, materials } = useGraph(scene)

const meshVisibility = useRef({ detailed: true, simple: true })

useFrame(({ camera }) => {
  const distance = camera.position.distanceTo(meshRef.current.position)
  if (distance > 50) {
    // Hide detailed geometry, show simplified version
  }
})
```

---

## Advanced: Force Raycasting with events.update()

### The Problem

Raycasting only happens on mouse/touch events. If you need raycasts on custom events:

```typescript
// ❌ PROBLEM - Raycasting only works on pointer events
function IntersectionDetector() {
  // No raycasting when camera moves programmatically
  // No raycasting on data updates
}
```

### The Solution: events.update()

```typescript
// ✅ GOOD - Force raycasting on demand
function IntersectionDetector() {
  const { events, camera } = useThree()
  const intersectedRef = useRef(null)

  // Force raycasting even without user input
  useEffect(() => {
    const handleDataUpdate = (newData) => {
      // Move camera to new position
      camera.position.lerp(newData.cameraPos, 0.1)

      // Force raycasting to detect new intersections
      events.update()
    }

    const unsubscribe = dataStore.subscribe(handleDataUpdate)
    return unsubscribe
  }, [events, camera])

  useFrame(() => {
    // Your logic that depends on raycasting results
    if (intersectedRef.current) {
      intersectedRef.current.material.color.set('red')
    }
  })

  return <Interactable ref={intersectedRef} />
}
```

### Use Cases

```typescript
// 1. Programmatic camera movement + detection
useEffect(() => {
  animateCamera(targetPos)

  const interval = setInterval(() => {
    events.update()  // Check intersections every frame
  }, 1000 / 60)

  return () => clearInterval(interval)
}, [events])

// 2. Data-driven raycasting
useEffect(() => {
  const updateRaycasts = () => {
    // Update some state
    setHoveredItem(null)

    // Force raycasting for new geometry
    events.update()
  }

  return dataStore.subscribe(updateRaycasts)
}, [events])

// 3. Touch/gesture detection
const handleGesture = (gesture) => {
  // Custom gesture processing
  processGesture(gesture)

  // Update intersections for gesture-based selection
  events.update()
}
```

---

## Pro Tip: Event Capture and Release Patterns

### The Problem

In dense interactive scenes, pointer events bubble up causing unwanted interactions:

```typescript
// ❌ PROBLEM - Both mesh and parent receive click
<group onClick={groupHandler}>
  <mesh onClick={meshHandler} />
</group>
// meshHandler AND groupHandler fire!
```

### The Solution: Pointer Capture

```typescript
// ✅ GOOD - Capture pointer to prevent bubbling
function ClickableItem() {
  return (
    <mesh
      onPointerDown={(e) => {
        // Capture pointer to this object
        e.target.setPointerCapture(e.pointerId)

        // Prevent event from bubbling up
        e.stopPropagation()

        console.log('This mesh captured the pointer')
      }}
      onPointerUp={(e) => {
        // Release capture
        e.target.releasePointerCapture(e.pointerId)
      }}
      onPointerLeave={(e) => {
        // Auto-release when leaving
        try {
          e.target.releasePointerCapture(e.pointerId)
        } catch (e) {
          // Already released
        }
      }}
    >
      <boxGeometry />
      <meshStandardMaterial />
    </mesh>
  )
}
```

### Gesture Detection Pattern

```typescript
// Multi-touch gesture handling
function GestureArea() {
  const activePointersRef = useRef(new Map())

  return (
    <group
      onPointerDown={(e) => {
        // Track all active pointers
        activePointersRef.current.set(e.pointerId, {
          x: e.clientX,
          y: e.clientY,
        })

        // Capture all pointers to this group
        e.target.setPointerCapture(e.pointerId)

        if (activePointersRef.current.size === 2) {
          console.log('Two-finger touch detected')
        }
      }}
      onPointerUp={(e) => {
        // Remove from tracking and release
        activePointersRef.current.delete(e.pointerId)
        e.target.releasePointerCapture(e.pointerId)
      }}
      onPointerMove={(e) => {
        if (activePointersRef.current.has(e.pointerId)) {
          const pointer = activePointersRef.current.get(e.pointerId)
          const dx = e.clientX - pointer.x
          const dy = e.clientY - pointer.y

          console.log(`Pointer ${e.pointerId} moved:`, dx, dy)
        }
      }}
    >
      <boxGeometry />
    </group>
  )
}
```

---

## Gotcha: Event Propagation and stopPropagation Timing

### The Problem

`stopPropagation()` timing is critical - it must be called BEFORE the parent's handler:

```typescript
// ❌ GOTCHA - stopPropagation called too late
<group onClick={(e) => {
  // This runs SECOND, after child's handler
  console.log('Group clicked')
}}>
  <mesh onClick={(e) => {
    doSomething()
    // stopPropagation called at END of handler
    // But group handler already queued!
    e.stopPropagation()
  }} />
</group>
```

### The Solution: Call stopPropagation First

```typescript
// ✅ GOOD - Stop propagation immediately
<mesh
  onClick={(e) => {
    // Stop propagation at START of handler
    e.stopPropagation()

    // Now do your work
    doSomething()
  }}
/>
```

### Order of Operations

```typescript
// Event propagation order (important!)
// 1. Child onPointerDown
// 2. Parent onPointerDown (unless child called stopPropagation)
// 3. Child onPointerUp
// 4. Parent onPointerUp (unless child called stopPropagation)
// 5. Child onClick
// 6. Parent onClick (unless child called stopPropagation)

<group onPointerDown={(e) => console.log('Parent down')}>
  <mesh
    onPointerDown={(e) => {
      console.log('Child down - 1st')
      e.stopPropagation()  // Prevents parent onPointerDown
    }}
    onClick={(e) => {
      console.log('Child click - 3rd')
      e.stopPropagation()  // Prevents parent onClick
    }}
  />
  {/* Parent onClick won't fire */}
</group>

// Log: Child down - 1st, Child click - 3rd
```

### Selective Propagation

```typescript
// Allow some events through, block others
<mesh
  onClick={(e) => {
    if (e.ctrlKey) {
      // Allow modifier+click to bubble
      return
    }

    // Otherwise, prevent propagation
    e.stopPropagation()
    handleNormalClick()
  }}
/>
```

---

## Related Resources

- [useFrame API](https://r3f.docs.pmnd.rs/api/canvas)
- [Canvas & Renderer](https://r3f.docs.pmnd.rs/api/canvas)
- [R3F Events](https://r3f.docs.pmnd.rs/api/events)
- [useGraph Documentation](https://github.com/pmndrs/react-three-fiber/discussions)
- [Pointer Events API](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events)
- [Previous: Performance Optimization](./01-performance-optimization.md)
- [Next: Memory Management](./03-memory-management.md)
