# React Three Fiber: Common Gotchas

Learn from common mistakes to avoid them in your projects.

## Gotcha 1: setState in useFrame

### The Problem

```typescript
// ❌ DON'T DO THIS
function Animated() {
  const [x, setX] = useState(0)

  useFrame(() => {
    setX(prev => prev + 0.1)  // Triggers re-render every frame!
  })

  return <mesh position-x={x} />
}
```

### The Impact

- Every frame calls React's state update machinery
- Causes full component re-render
- React DevTools goes crazy
- Much slower than direct mutation

### The Solution

```typescript
// ✅ DO THIS - Direct mutation
const meshRef = useRef()

useFrame(() => {
  meshRef.current.position.x += 0.1
})

return <mesh ref={meshRef} />
```

---

## Gotcha 2: Creating Objects in useFrame

### The Problem

```typescript
// ❌ DON'T DO THIS - 60 allocations/sec
useFrame(() => {
  const v = new THREE.Vector3(x, y, z)
  mesh.position.copy(v)
})
```

### The Solution

```typescript
// ✅ DO THIS - Reuse object
const tempVec = new THREE.Vector3()

useFrame(() => {
  tempVec.set(x, y, z)
  mesh.position.copy(tempVec)
})
```

---

## Gotcha 3: Mount/Unmount Thrashing

### The Problem

```typescript
// ❌ DON'T DO THIS - Destroys and recreates geometries constantly
{condition && <mesh><boxGeometry /><meshStandardMaterial /></mesh>}
```

### The Impact

- Geometry compilation happens every mount: 5-10ms overhead
- Material shader compilation: 5-20ms
- Noticeable frame stutter when toggling

### The Solution

```typescript
// ✅ DO THIS - Hide instead of unmount
const groupRef = useRef()

useEffect(() => {
  groupRef.current.visible = condition
}, [condition])

return (
  <group ref={groupRef}>
    <mesh><boxGeometry /><meshStandardMaterial /></mesh>
  </group>
)
```

---

## Gotcha 4: Primitive Object Misuse

### The Problem

```typescript
// ❌ DON'T DO THIS - Multiple references cause confusion
const geometry = new THREE.BoxGeometry()

<mesh><primitive object={geometry} /><meshStandardMaterial /></mesh>
<mesh><primitive object={geometry} /><meshStandardMaterial /></mesh>
```

### The Impact

- Same object in multiple places
- Disposal cleanup is unpredictable
- Memory leaks possible

### The Solution

```typescript
// ✅ DO THIS - One primitive per place or use property
const geometry = new THREE.BoxGeometry()

<mesh geometry={geometry}><meshStandardMaterial /></mesh>
<mesh geometry={geometry}><meshStandardMaterial /></mesh>

// Clean up when done
useEffect(() => {
  return () => geometry.dispose()
}, [])
```

---

## Gotcha 5: useFrame Dependency Issues

### The Problem

```typescript
// ❌ DON'T DO THIS - Captures stale value
function Component({ targetX }) {
  useFrame(() => {
    mesh.position.x = targetX  // Always the initial value!
  })
}
```

### The Solution

```typescript
// ✅ DO THIS - Use ref to store current value
const targetRef = useRef(targetX)

useEffect(() => {
  targetRef.current = targetX
}, [targetX])

useFrame(() => {
  mesh.position.x = targetRef.current
})
```

---

## Gotcha 6: Camera Issues

### The Problem

```typescript
// ❌ DON'T DO THIS - Camera not positioned correctly
<Canvas>
  <mesh position={[0, 0, 0]}>  {/* Appears at origin */}
    <boxGeometry />
  </mesh>
</Canvas>

// Camera is at [0, 0, 0] too! Can't see mesh inside itself!
```

### The Solution

```typescript
// ✅ DO THIS - Position mesh away from camera
<Canvas camera={{ position: [0, 0, 5] }}>
  <mesh position={[0, 0, 0]}>
    <boxGeometry />
  </mesh>
</Canvas>

// OR position mesh away from origin
<Canvas>
  <mesh position={[0, 0, -5]}>
    <boxGeometry />
  </mesh>
</Canvas>
```

---

## Gotcha 7: Lighting Absence

### The Problem

```typescript
// ❌ DON'T DO THIS - No lights = black scene
<Canvas>
  <mesh>
    <boxGeometry />
    <meshStandardMaterial />  {/* Requires lighting */}
  </mesh>
</Canvas>

// Result: Black mesh, can't see anything
```

### The Solution

```typescript
// ✅ DO THIS - Add lighting
<Canvas>
  <ambientLight intensity={0.5} />
  <pointLight position={[10, 10, 10]} intensity={1} />

  <mesh>
    <boxGeometry />
    <meshStandardMaterial />
  </mesh>
</Canvas>
```

---

## Gotcha 8: Dispose={null} Everywhere

### The Problem

```typescript
// ❌ DON'T DO THIS - Disables all disposal
<Canvas>
  <group dispose={null}>
    <mesh><boxGeometry /><meshStandardMaterial /></mesh>
    <mesh><boxGeometry /><meshStandardMaterial /></mesh>
    <mesh><boxGeometry /><meshStandardMaterial /></mesh>
  </group>
</Canvas>

// Memory leak! Nothing gets cleaned up!
```

### The Solution

```typescript
// ✅ DO THIS - Only disable for shared resources
const sharedMaterial = new THREE.MeshStandardMaterial()

<group dispose={null}>  {/* Only wrap shared resources */}
  <mesh><boxGeometry /><primitive object={sharedMaterial} /></mesh>
  <mesh><boxGeometry /><primitive object={sharedMaterial} /></mesh>
</group>

// Dispose shared material on cleanup
useEffect(() => {
  return () => sharedMaterial.dispose()
}, [])
```

---

## Gotcha 9: Texture Loading Timing

### The Problem

```typescript
// ❌ DON'T DO THIS - Texture might not be loaded yet
const texture = new THREE.TextureLoader().load('/texture.png')

function Component() {
  return (
    <mesh>
      <boxGeometry />
      <meshStandardMaterial map={texture} />
    </mesh>
  )
}
```

### The Solution

```typescript
// ✅ DO THIS - Use Suspense
import { useTexture } from '@react-three/drei'

function Component() {
  const texture = useTexture('/texture.png')

  return (
    <mesh>
      <boxGeometry />
      <meshStandardMaterial map={texture} />
    </mesh>
  )
}

<Canvas>
  <Suspense fallback={<Fallback />}>
    <Component />
  </Suspense>
</Canvas>
```

---

## Gotcha 10: useThree Hook Position

### The Problem

```typescript
// ❌ DON'T DO THIS - useThree outside Canvas
const { gl, scene, camera } = useThree()  // Error! No Canvas!

function Component() {
  return null
}

<Component />  // Not inside Canvas!
```

### The Solution

```typescript
// ✅ DO THIS - useThree inside Canvas
<Canvas>
  <Component />  {/* Now useThree works */}
</Canvas>

function Component() {
  const { gl, scene, camera } = useThree()
  // Now it works!
}
```

---

## Gotcha 11: Infinite Loop with useFrame

### The Problem

```typescript
// ❌ DON'T DO THIS - Creates infinite loop
function Component() {
  useFrame(() => {
    mesh.rotation.x += 0.01
  })

  useFrame(() => {
    mesh.position.x += 0.01  // Both run every frame
  })

  // If condition below triggers state updates... infinite loop!
  if (mesh.rotation.x > Math.PI) {
    // setData()  // This would cause issues
  }
}
```

### The Solution

```typescript
// ✅ DO THIS - Single useFrame, clear logic
function Component() {
  useFrame(() => {
    mesh.rotation.x += 0.01

    if (mesh.rotation.x > Math.PI) {
      mesh.rotation.x = -Math.PI
    }
  })
}
```

---

## Gotcha 12: Context in useFrame

### The Problem

```typescript
// ❌ DON'T DO THIS - useFrame sees stale context
const GameContext = createContext()

function Component() {
  const gameState = useContext(GameContext)

  useFrame(() => {
    console.log(gameState)  // Always the initial value!
  })
}
```

### The Solution

```typescript
// ✅ DO THIS - Use ref for context values
const GameContext = createContext()

function Component() {
  const gameState = useContext(GameContext)
  const gameStateRef = useRef(gameState)

  useEffect(() => {
    gameStateRef.current = gameState
  }, [gameState])

  useFrame(() => {
    console.log(gameStateRef.current)  // Current value!
  })
}
```

---

## Gotcha 13: Arguments Change Force Reconstruction

### The Problem

When you pass `args` to a constructor like `boxGeometry`, changing them causes a complete reconstruction:

```typescript
// ❌ GOTCHA - Changing args reconstructs entire geometry
function ResizableBox({ width, height, depth }) {
  return (
    <mesh>
      {/* Every time width/height/depth changes, boxGeometry is recreated */}
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial />
    </mesh>
  )
}

// Parent passes different sizes frequently
<ResizableBox width={Math.random() * 10} height={5} depth={5} />
// Result: Geometry recreated every frame!
```

### The Impact

- Geometry reconstruction: 2-5ms per change
- Old geometry disposed, new one compiled
- Shader compilation may re-trigger
- Visible stutter if dimensions change frequently

### The Solution

```typescript
// ✅ GOOD - Update geometry dimensions after creation
function ResizableBox({ width, height, depth }) {
  const geoRef = useRef()
  const sizeRef = useRef({ width, height, depth })

  useEffect(() => {
    if (geoRef.current && (
      sizeRef.current.width !== width ||
      sizeRef.current.height !== height ||
      sizeRef.current.depth !== depth
    )) {
      // Update geometry instead of recreating
      geoRef.current.scale(
        width / sizeRef.current.width,
        height / sizeRef.current.height,
        depth / sizeRef.current.depth
      )
      sizeRef.current = { width, height, depth }
    }
  }, [width, height, depth])

  return (
    <mesh>
      <boxGeometry ref={geoRef} args={[width, height, depth]} />
      <meshStandardMaterial />
    </mesh>
  )
}
```

### Alternative: Use Fixed Size

```typescript
// ✅ SIMPLER - If you can, avoid changing args
function ResizableBox({ width, height, depth }) {
  return (
    <mesh scale={[width, height, depth]}>
      <boxGeometry args={[1, 1, 1]} />  {/* Fixed size, scale it */}
      <meshStandardMaterial />
    </mesh>
  )
}
// Much faster - only transform changes, no reconstruction
```

---

## Gotcha 14: Event Filtering and Priority Conflicts

### The Problem

Multiple event handlers on nested objects can interfere:

```typescript
// ❌ GOTCHA - Both handlers fire, causing unexpected behavior
<group onClick={(e) => console.log('Group clicked')}>
  <mesh onClick={(e) => console.log('Mesh clicked')} />
</group>

// Click the mesh: Both "Mesh clicked" AND "Group clicked" log
// This might not be what you want
```

### The Impact

- Unintended side effects from parent handlers
- Hard to debug which handler is running
- Can cause performance issues with many nested objects
- Event handlers fire in unpredictable order sometimes

### The Solution

```typescript
// ✅ GOOD - Explicit event control with stopPropagation
<group onClick={(e) => {
  if (!e.eventObject.userData.isChild) {
    console.log('Group clicked')
  }
}}>
  <mesh
    onClick={(e) => {
      e.stopPropagation()  // Prevent group handler
      console.log('Mesh clicked')
    }}
    userData={{ isChild: true }}
  />
</group>
```

### Advanced: Event Filtering Pattern

```typescript
// ✅ GOOD - Central event dispatcher
function EventManager() {
  const handleClick = (e) => {
    // Type checking to determine handler
    if (e.object.name === 'button-mesh') {
      handleButtonClick()
    } else if (e.object.name === 'item-mesh') {
      handleItemClick()
    } else {
      handleDefaultClick()
    }
  }

  return (
    <group onClick={handleClick}>
      <mesh name="button-mesh" />
      <mesh name="item-mesh" />
      <mesh name="background" />
    </group>
  )
}
```

---

## Gotcha 15: Declarative Props vs Imperative Mutations

### The Problem

Mixing React state (declarative) with direct Three.js mutations (imperative) causes confusion:

```typescript
// ❌ CONFUSING - State and direct mutation together
function AnimatedBox() {
  const [rotation, setRotation] = useState(0)
  const meshRef = useRef()

  // React state-driven
  return (
    <mesh
      ref={meshRef}
      rotation-z={rotation}  {/* Declarative */}
      onClick={() => {
        meshRef.current.position.x += 1  {/* Imperative */}
      }}
    />
  )
}

// Who owns what? Which one is correct? Confusing!
```

### The Solution: Be Consistent

```typescript
// ✅ GOOD OPTION 1 - Fully Declarative (React State)
function AnimatedBox() {
  const [position, setPosition] = useState([0, 0, 0])
  const [rotation, setRotation] = useState([0, 0, 0])

  return (
    <mesh
      position={position}
      rotation={rotation}
      onClick={() => {
        setPosition([position[0] + 1, position[1], position[2]])
      }}
    />
  )
}

// ✅ GOOD OPTION 2 - Fully Imperative (Direct Mutation)
function AnimatedBox() {
  const meshRef = useRef()

  useFrame(() => {
    meshRef.current.rotation.z += 0.01
  })

  return (
    <mesh
      ref={meshRef}
      onClick={() => {
        meshRef.current.position.x += 1
      }}
    />
  )
}
```

### When to Use Which

```typescript
// Use Declarative (React State) for:
// - Simple animations
// - UI-controlled parameters
// - Small number of changing values
// - Easy React debugging

// Use Imperative (Direct Mutation) for:
// - Complex physics simulations
// - Frame-by-frame updates
// - Performance-critical code
// - Ref-based component communication
```

---

## Pro Tip: extend() for Custom Three.js Classes

### The Problem

Custom Three.js classes can't be used as JSX elements:

```typescript
// ❌ PROBLEM - Custom class not recognized
class MyCustomMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({ /* shader code */ })
  }
}

<mesh>
  <myCustomMaterial />  {/* Error: not a known element */}
</mesh>
```

### The Solution: extend()

```typescript
// ✅ GOOD - Register custom class with extend()
import { extend } from '@react-three/fiber'

class MyCustomMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({ /* shader code */ })
    this.isCustomMaterial = true
  }
}

// Register with R3F
extend({ MyCustomMaterial })

// Now you can use it as JSX
<mesh>
  <myCustomMaterial />
</mesh>
```

### Real-World Example

```typescript
// Custom material with reactive uniforms
class ReactiveMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(0xff0000) },
      },
      // ... shader code
    })
  }

  updateColor(color) {
    this.uniforms.color.value.set(color)
  }
}

extend({ ReactiveMaterial })

function Component() {
  const matRef = useRef()

  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.uniforms.time.value = clock.getElapsedTime()
    }
  })

  return (
    <mesh>
      <boxGeometry />
      <reactiveMaterial ref={matRef} />
    </mesh>
  )
}
```

### Batch Registration

```typescript
// Register multiple custom classes at once
extend({
  MyCustomMaterial,
  MyCustomGeometry,
  MyCustomLight,
})

// Now all are available as JSX elements
<mesh>
  <myCustomGeometry />
  <myCustomMaterial />
</mesh>

<myCustomLight />
```

---

## Quick Gotcha Checklist

- [ ] No setState in useFrame loops
- [ ] No object creation in useFrame
- [ ] Avoid mounting/unmounting expensive objects
- [ ] Use refs to track current prop/context values
- [ ] Camera positioned correctly
- [ ] Lights added to scene
- [ ] Don't overuse dispose={null}
- [ ] Use useTexture for texture loading
- [ ] useThree called inside Canvas
- [ ] Clear useFrame logic, no side effects
- [ ] Context values stored in refs
- [ ] Avoid changing args frequently
- [ ] Use stopPropagation() to control events
- [ ] Be consistent with declarative vs imperative
- [ ] Use extend() for custom Three.js classes

---

## Related Resources

- [R3F Pitfalls Documentation](https://r3f.docs.pmnd.rs/advanced/pitfalls)
- [R3F extend() API](https://r3f.docs.pmnd.rs/api/objects)
- [React Rules of Hooks](https://react.dev/warnings/invalid-hook-call-warning)
- [Three.js Custom Materials](https://threejs.org/docs/index.html#api/en/materials/ShaderMaterial)
- [Previous: Memory Management](./03-memory-management.md)
- [Next: Drei Helpers](../drei/01-shader-materials.md)
