# React Three Fiber: Advanced Hooks

Master advanced R3F hooks for fine-grained control over rendering and scene graph manipulation.

## Quick Reference

| Hook | Purpose | Complexity |
|------|---------|-----------|
| **useGraph()** | Extract nodes/materials from models | Advanced |
| **useLoader()** | Load assets with caching | Advanced |
| **useThree()** | Access Three.js context selectively | Advanced |
| **createPortal()** | Re-parent objects in scene graph | Advanced |
| **invalidate()** | Manual render control | Intermediate |
| **events.update()** | Force raycasting | Intermediate |

---

## Advanced Pattern 1: useGraph() - Extract Model Structure

### The Problem

When you load a GLTF model, you need to access specific nodes, materials, or geometries. Manual traversal is tedious:

```typescript
// ❌ VERBOSE - Manual traversal
const { scene } = useGLTF('/model.glb')

let targetNode = null
scene.traverse((child) => {
  if (child.name === 'Arm_Left') {
    targetNode = child
  }
})

// Now use targetNode...
```

### The Solution

Use `useGraph()` to extract all nodes and materials automatically:

```typescript
import { useGLTF, useGraph } from '@react-three/drei'

function DetailedModel() {
  const { scene } = useGLTF('/character.glb')
  const { nodes, materials } = useGraph(scene)

  // Access by name directly
  return (
    <>
      <mesh geometry={nodes.Torso.geometry} material={materials.Skin} />
      <mesh geometry={nodes.ArmLeft.geometry} material={materials.Cloth} />
      <mesh geometry={nodes.ArmRight.geometry} material={materials.Cloth} />
      <mesh geometry={nodes.Head.geometry} material={materials.Skin} />
    </>
  )
}
```

### Real-World Example: Animated Character

```typescript
function AnimatedCharacter() {
  const { scene, animations } = useGLTF('/character.glb')
  const { nodes, materials } = useGraph(scene)
  const { actions } = useAnimations(animations, scene)

  useEffect(() => {
    // Play walk animation
    actions['Walk']?.play()
  }, [actions])

  return (
    <group>
      <mesh
        geometry={nodes.Body.geometry}
        material={materials.Skin}
        position={[0, 0, 0]}
      />
      <mesh
        geometry={nodes.Head.geometry}
        material={materials.Head}
        position={[0, 1.8, 0]}
      />

      {/* Attach animations to the group */}
      <primitive object={scene} />
    </group>
  )
}
```

### Pro Tip: Material Cloning

`useGraph()` reuses materials. Clone them if you need independent changes:

```typescript
function MultiMaterial() {
  const { scene } = useGLTF('/model.glb')
  const { nodes, materials } = useGraph(scene)

  // Clone material to customize independently
  const customMaterial = materials.Cloth.clone()
  customMaterial.color.set('red')

  return (
    <>
      <mesh geometry={nodes.Leg1.geometry} material={customMaterial} />
      <mesh geometry={nodes.Leg2.geometry} material={materials.Cloth} />
      {/* Leg1 is red, Leg2 is original color */}
    </>
  )
}
```

---

## Advanced Pattern 2: useLoader() - Advanced Asset Loading

### The Problem

Basic asset loading works, but you need:
- Progress tracking
- Custom loaders
- Error handling
- Preloading

### The Solution

Use `useLoader()` for fine-grained control:

```typescript
import { useLoader } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'

function LoadWithProgress() {
  const [progress, setProgress] = useState(0)

  const gltf = useLoader(
    GLTFLoader,
    '/compressed-model.glb',
    (loader) => {
      // Configure loader
      const dracoLoader = new DRACOLoader()
      dracoLoader.setDecoderPath('/draco/')
      loader.setDRACOLoader(dracoLoader)
    },
    (event) => {
      // Track progress
      setProgress((event.loaded / event.total) * 100)
    }
  )

  return (
    <>
      {progress < 100 && <div>Loading: {progress.toFixed(0)}%</div>}
      {gltf && <primitive object={gltf.scene} />}
    </>
  )
}
```

### Preloading Assets

```typescript
// Preload before component mounts
GLTFLoader.preload('/model.glb', (loader) => {
  const dracoLoader = new DRACOLoader()
  dracoLoader.setDecoderPath('/draco/')
  loader.setDRACOLoader(dracoLoader)
})

// Component loads instantly
function Model() {
  const gltf = useLoader(GLTFLoader, '/model.glb')
  return <primitive object={gltf.scene} />
}
```

### Custom Loader Extension

```typescript
// Use extensions without re-creating loader
function LoadWithExtensions() {
  const gltf = useLoader(
    GLTFLoader,
    '/model.glb',
    (loader) => {
      // Add KHR_draco_mesh_compression
      const dracoLoader = new DRACOLoader()
      dracoLoader.setDecoderPath('/draco/')
      loader.setDRACOLoader(dracoLoader)

      // Add KHR_mesh_quantization
      loader.register((p) => new GLTFMeshQuantizationExtension(p))
    }
  )

  return <primitive object={gltf.scene} />
}
```

### Error Handling

```typescript
function SafeModelLoader({ url, fallback }) {
  let gltf

  try {
    gltf = useLoader(GLTFLoader, url)
  } catch (error) {
    console.error('Failed to load model:', error)
    return fallback || <mesh><boxGeometry /></mesh>
  }

  return <primitive object={gltf.scene} />
}
```

---

## Advanced Pattern 3: useThree() - Selective State Subscriptions

### The Problem

`useThree()` returns everything (camera, scene, gl, etc.), but you only care about some properties. This causes unnecessary re-renders:

```typescript
// ❌ BAD - Re-renders on ANY Three.js state change
const { camera, mouse, viewport } = useThree()
```

### The Solution

Use selector function to subscribe to specific values:

```typescript
import { useThree } from '@react-three/fiber'

// Only subscribe to camera changes
function CameraAware() {
  const camera = useThree((state) => state.camera)

  useFrame(() => {
    // Re-runs only when camera object changes
    console.log('Camera position:', camera.position)
  })

  return null
}

// Only subscribe to viewport
function ResponsiveUI() {
  const viewport = useThree((state) => state.viewport)

  return (
    <mesh scale={[viewport.width / 10, viewport.height / 10, 1]}>
      <planeGeometry />
    </mesh>
  )
}

// Subscribe to multiple values efficiently
function ComplexScene() {
  const { camera, gl } = useThree((state) => ({
    camera: state.camera,
    gl: state.gl
  }))

  useFrame(() => {
    // Re-runs only when camera or gl change
  })

  return null
}
```

### Performance Impact

```
Without selector: Re-renders on mouse move, camera animation, etc.
With selector: Re-renders only on relevant changes
Result: 30-40% fewer re-renders
```

---

## Advanced Pattern 4: createPortal() - Scene Graph Re-parenting

### The Problem

You want to render something in a different part of the scene graph without restructuring your component tree:

```typescript
// ❌ PROBLEM - Modal must be at top level
<Canvas>
  <Scene />
  <Modal />  {/* Forces restructuring */}
</Canvas>
```

### The Solution

Use `createPortal()` to render anywhere in the scene graph:

```typescript
import { createPortal } from '@react-three/fiber'

function Modal({ target }) {
  return createPortal(
    <mesh position={[0, 5, 0]}>
      <boxGeometry />
      <meshStandardMaterial color="red" />
    </mesh>,
    target  // Target group/object
  )
}

function Scene() {
  const overlayRef = useRef()

  return (
    <>
      {/* Regular scene content */}
      <mesh position={[0, 0, -5]}>
        <sphereGeometry />
        <meshStandardMaterial />
      </mesh>

      {/* Portal target */}
      <group ref={overlayRef}>
        {/* Nothing here initially */}
      </group>

      {/* Portal renders inside overlayRef */}
      {overlayRef.current && (
        <Modal target={overlayRef.current} />
      )}
    </>
  )
}
```

### Advanced: UI Overlay System

```typescript
function UIOverlay() {
  const overlayRef = useRef()

  return (
    <>
      {/* Main scene */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry />
        <meshStandardMaterial />
      </mesh>

      {/* UI layer */}
      <group ref={overlayRef} />

      {/* All UI renders here via portals */}
      {overlayRef.current && (
        <>
          <Button target={overlayRef.current} label="Start" />
          <Score target={overlayRef.current} value={100} />
          <HealthBar target={overlayRef.current} hp={80} />
        </>
      )}
    </>
  )
}

function Button({ target, label }) {
  return createPortal(
    <mesh position={[2, 3, 0]}>
      <planeGeometry args={[1, 0.5]} />
      <meshBasicMaterial color="blue" />
    </mesh>,
    target
  )
}
```

---

## Advanced Pattern 5: invalidate() - Manual Render Control

### Revisited: Fine-Grained Invalidation

```typescript
import { useThree } from '@react-three/fiber'

function PerformanceOptimized() {
  const { invalidate } = useThree()

  // Only invalidate on specific events
  const handleClick = useCallback(() => {
    // Update state
    setClicked(true)

    // Render next 30 frames
    invalidate(30)
  }, [invalidate])

  // Don't invalidate on hover
  return (
    <mesh onClick={handleClick}>
      <boxGeometry />
      <meshStandardMaterial />
    </mesh>
  )
}
```

### Invalidate with Time Limits

```typescript
function AnimationSequence() {
  const { invalidate } = useThree()
  const [isAnimating, setIsAnimating] = useState(false)

  const startAnimation = useCallback(() => {
    setIsAnimating(true)

    // Render for exactly 1 second (60 frames)
    invalidate(60)

    // Stop after animation
    setTimeout(() => {
      setIsAnimating(false)
    }, 1000)
  }, [invalidate])

  return (
    <mesh onClick={startAnimation}>
      <boxGeometry />
      <meshStandardMaterial />
    </mesh>
  )
}
```

---

## Advanced Pattern 6: events.update() - Force Raycasting

### The Problem

With `frameloop="demand"`, raycasting (mouse interactions) doesn't work without manually calling `invalidate()`.

### The Solution

Use `events.update()` to force raycasting without a full render:

```typescript
import { useThree } from '@react-three/fiber'

function InteractiveScene() {
  const { events } = useThree()

  useEffect(() => {
    // Update raycasting on custom event
    window.addEventListener('pointermove', () => {
      events.update?.()  // Raycasting happens, but no re-render yet
    })
  }, [events])

  return (
    <mesh onClick={() => console.log('Clicked!')}>
      <boxGeometry />
      <meshStandardMaterial />
    </mesh>
  )
}
```

---

## Advanced Pattern 7: Event System Customization

### The Problem

Default event handling doesn't meet your needs. You need custom event filtering or processing.

### The Solution

Customize the event system:

```typescript
import { useThree } from '@react-three/fiber'

function CustomEvents() {
  const { events } = useThree()

  useEffect(() => {
    // Override default click handler
    const originalClick = events.handlers?.click

    events.handlers = {
      ...events.handlers,
      click: (e) => {
        // Custom filtering
        if (e.target.closest('.no-3d-interaction')) {
          return
        }

        // Proceed with normal handling
        originalClick?.(e)
      }
    }

    return () => {
      // Restore
      events.handlers.click = originalClick
    }
  }, [events])

  return <YourScene />
}
```

### Event Capture Patterns

```typescript
// Capture pointer events before 3D processing
function CapturePointerEvents() {
  const { events } = useThree()

  useEffect(() => {
    const handlePointerDown = (e) => {
      if (e.target.closest('.ui-element')) {
        // Stop 3D event propagation
        e.stopPropagation()
        return false
      }
    }

    window.addEventListener('pointerdown', handlePointerDown, true) // Capture phase

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, true)
    }
  }, [])

  return <YourScene />
}
```

---

## Pro Tips Summary

1. **useGraph()** for extracting model structure
2. **useLoader()** with progress and error handling
3. **useThree()** with selectors for performance
4. **createPortal()** for flexible scene organization
5. **invalidate()** for frame-precise control
6. **events.update()** for raycasting without rendering
7. Custom event handlers for UI/3D integration

---

## Related Resources

- [R3F useThree Documentation](https://docs.pmnd.rs/react-three-fiber/api/hooks#usethree)
- [R3F useLoader Documentation](https://docs.pmnd.rs/react-three-fiber/api/hooks#useloader)
- [useGraph Source](https://github.com/pmndrs/drei/blob/master/src/core/useGraph.tsx)
- [Previous: Memory Management](./03-memory-management.md)
- [Next: Declarative Patterns](./06-declarative-patterns.md)
