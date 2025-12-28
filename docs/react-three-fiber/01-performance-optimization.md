# React Three Fiber: Performance Optimization

Master performance optimization techniques for R3F applications.

## Quick Reference

```
Optimization Levels:
⭐⭐⭐⭐⭐ Critical    - Do immediately (object reuse, instancing)
⭐⭐⭐⭐ Important   - Do before performance issues arise
⭐⭐⭐ Useful        - Do when optimization is needed
```

---

## Critical: Object Reuse in useFrame

### The Problem

```typescript
// ❌ BAD - Creates Vector3 every frame (60 FPS = 60 allocations/sec)
function MovingBox() {
  const ref = useRef()

  useFrame(() => {
    ref.current.position.lerp(new THREE.Vector3(1, 2, 3), 0.1)
  })

  return <mesh ref={ref}><boxGeometry /></mesh>
}
```

### The Impact

- Memory allocation: ~4KB per frame = 240KB/sec
- Garbage collection spikes every 30-60 frames
- Frame time increases from 2ms to 8ms+

### The Solution

```typescript
// ✅ GOOD - Reuse Vector3
const targetPos = new THREE.Vector3(1, 2, 3)

function MovingBox() {
  const ref = useRef()

  useFrame(() => {
    ref.current.position.lerp(targetPos, 0.1)
  })

  return <mesh ref={ref}><boxGeometry /></mesh>
}
```

### Pro Pattern: Reusable Utilities

```typescript
// Create a module for reusable temporary objects
// src/lib/tempObjects.ts
export const tempVec3 = new THREE.Vector3()
export const tempQuat = new THREE.Quaternion()
export const tempMat4 = new THREE.Matrix4()
export const tempEuler = new THREE.Euler()

// In components
import { tempVec3 } from '@/lib/tempObjects'

function Component() {
  useFrame(({ mouse }) => {
    tempVec3.set(mouse.x * 10, mouse.y * 10, 5)
    ref.current.position.lerp(tempVec3, 0.1)
  })
}
```

---

## Critical: Instanced Rendering for 10K+ Objects

### The Problem

```typescript
// ❌ BAD - 10,000 mesh = 10,000 draw calls
function Particles({ count = 10000 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <mesh key={i} position={[Math.random() * 100, Math.random() * 100, 0]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial />
        </mesh>
      ))}
    </>
  )
}
```

### The Impact

- 10,000 draw calls = 100ms+ render time
- GPU bottleneck
- Only 10 FPS at best

### The Solution

```typescript
// ✅ GOOD - Instanced mesh = 1 draw call
function Particles({ count = 10000 }) {
  const meshRef = useRef()
  const tempObj = new THREE.Object3D()

  useEffect(() => {
    for (let i = 0; i < count; i++) {
      tempObj.position.set(
        Math.random() * 100,
        Math.random() * 100,
        0
      )
      tempObj.updateMatrix()
      meshRef.current.setMatrixAt(i, tempObj.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [count])

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <sphereGeometry args={[0.1, 16, 16]} />
      <meshStandardMaterial />
    </instancedMesh>
  )
}
```

### Drei Instance Helper

Drei makes this even easier:

```typescript
import { Instances, Instance } from '@react-three/drei'

function Particles() {
  return (
    <Instances limit={10000} range={10000}>
      <sphereGeometry args={[0.1, 16, 16]} />
      <meshStandardMaterial />

      {Array.from({ length: 10000 }, (_, i) => (
        <Particle key={i} index={i} />
      ))}
    </Instances>
  )
}

function Particle({ index }) {
  const ref = useRef()

  useFrame(() => {
    ref.current.position.y += 0.01
  })

  return (
    <Instance ref={ref} position={[Math.random() * 100, 0, 0]} />
  )
}
```

---

## Critical: On-Demand Rendering

### The Problem

```typescript
// ❌ BAD - Render every frame even when nothing changed
<Canvas>
  <Mesh />  {/* Re-renders 60 times/sec */}
</Canvas>
```

### The Impact

- Unnecessary CPU/GPU work
- Mobile devices drain battery faster
- Heat generation

### The Solution

```typescript
// ✅ GOOD - Render only when needed
<Canvas frameloop="demand">
  <Mesh />  {/* Renders only when props change */}
</Canvas>
```

How R3F detects changes:

```typescript
// R3F automatically invalidates (triggers render) when:
// 1. Props change
// 2. useFrame is called
// 3. Mouse/touch events occur
// 4. Window is resized

// Manual invalidation for custom events
<Canvas ref={canvasRef}>
  <Mesh onCustomEvent={() => canvasRef.current.getState().invalidate()} />
</Canvas>
```

---

## Important: Share Geometries & Materials

### The Problem

```typescript
// ❌ BAD - Each mesh creates new geometry and material
function Scene() {
  return (
    <>
      <mesh position={[0, 0, 0]}>
        <boxGeometry />  {/* New geometry each render */}
        <meshStandardMaterial color="red" />  {/* New material */}
      </mesh>
      <mesh position={[5, 0, 0]}>
        <boxGeometry />  {/* Another new geometry */}
        <meshStandardMaterial color="red" />  {/* Another new material */}
      </mesh>
    </>
  )
}
```

### The Impact

- Memory: Each geometry is ~2KB, each material is ~1KB
- Shader compilation: Each unique material triggers compilation
- 10 materials = 10 shader compilations = 50ms overhead

### The Solution

```typescript
// ✅ GOOD - Create globally, reuse
const boxGeo = new THREE.BoxGeometry(1, 1, 1)
const redMat = new THREE.MeshStandardMaterial({ color: 'red' })

function Scene() {
  return (
    <>
      <mesh geometry={boxGeo} material={redMat} position={[0, 0, 0]} />
      <mesh geometry={boxGeo} material={redMat} position={[5, 0, 0]} />
    </>
  )
}

export default Scene
```

### Per-Component Sharing

```typescript
// Create at component level, not per-render
function RepeatingObjects() {
  const geo = useMemo(() => new THREE.BoxGeometry(), [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: 'blue' }), [])

  return (
    <>
      {Array.from({ length: 100 }).map((_, i) => (
        <mesh key={i} geometry={geo} material={mat} position={[i * 2, 0, 0]} />
      ))}
    </>
  )
}
```

---

## Important: Canvas Settings for Performance

```typescript
<Canvas
  // Performance settings
  frameloop="demand"           // Only render when needed
  gl={{
    powerPreference: 'high-performance',
    antialias: false,          // Skip anti-aliasing on low-end devices
    alpha: false,              // Opaque background
    depth: true,               // Enable depth testing
    logarithmicDepthBuffer: false,  // Disable unless needed
  }}
  camera={{
    fov: 75,
    near: 0.1,
    far: 10000,
    // Adjust based on your scene
  }}
>
  <YourScene />
</Canvas>
```

---

## Useful: Multiple Render Targets (MRT)

For post-processing, use render targets instead of re-rendering:

```typescript
import { RenderTexture } from '@react-three/drei'

function Scene() {
  const texture = useRef()

  return (
    <>
      {/* Render scene to texture once */}
      <RenderTexture ref={texture} attach="map">
        <PerspectiveCamera position={[0, 0, 5]} />
        <YourScene />
      </RenderTexture>

      {/* Use texture multiple times */}
      <mesh>
        <planeGeometry />
        <meshBasicMaterial map={texture.current} />
      </mesh>
    </>
  )
}
```

---

## Useful: LOD (Level of Detail)

```typescript
import { useFrame } from '@react-three/fiber'

function DetailedObject({ position }) {
  const groupRef = useRef()
  const [detail, setDetail] = useState('high')

  useFrame(({ camera }) => {
    const distance = groupRef.current.position.distanceTo(camera.position)
    setDetail(distance > 10 ? 'low' : distance > 5 ? 'medium' : 'high')
  })

  return (
    <group ref={groupRef} position={position}>
      {detail === 'high' && <HighDetailModel />}
      {detail === 'medium' && <MediumDetailModel />}
      {detail === 'low' && <SimpleBox />}
    </group>
  )
}
```

---

## Debugging Performance

### Use r3f-perf

```typescript
import { Perf } from 'r3f-perf'

<Canvas>
  <Perf position="top-left" />  {/* Shows FPS, draw calls, geometries, etc */}
  <YourScene />
</Canvas>
```

### Use Chrome DevTools

```typescript
// Performance tab > Record
// Look for:
// - Long tasks (> 50ms)
// - GC pauses
// - Memory growth

// Profiler tab > Record
// Look for:
// - Components rendering unexpectedly
// - useFrame hogging time
```

### Manual Timing

```typescript
useFrame(({ clock }) => {
  const startTime = performance.now()

  // Your update code
  updateEntities(clock.getDelta())

  const endTime = performance.now()
  console.log(`Frame took ${endTime - startTime}ms`)
})
```

---

## Performance Checklist

- [ ] useFrame operations reuse objects (no `new Vector3(...)` in loops)
- [ ] 10K+ objects use instanced rendering
- [ ] Static scenes use `frameloop="demand"`
- [ ] Geometries and materials are shared
- [ ] Render targets used instead of re-rendering
- [ ] Canvas GL settings optimized
- [ ] LOD implemented for distant objects
- [ ] Performance profiled with DevTools

---

## Advanced: Manual Rendering Control with invalidate()

### The Problem

On-demand rendering is powerful, but sometimes you need fine-grained control over when frames render. Without it, you're stuck:

```typescript
// ❌ PROBLEM - Event doesn't trigger render with frameloop="demand"
<Canvas frameloop="demand">
  <Mesh onHover={() => { /* Changes state but no render happens */ }} />
</Canvas>
```

### The Solution: invalidate()

```typescript
// ✅ GOOD - Manually trigger renders for specific events
function MyScene() {
  const { invalidate } = useThree()

  return (
    <mesh
      onHover={() => {
        // Schedule next frame to render
        invalidate()
      }}
      onClick={() => {
        // Schedule next 60 frames to render (for animations)
        invalidate(60)
      }}
    >
      <boxGeometry />
      <meshStandardMaterial />
    </mesh>
  )
}

<Canvas frameloop="demand">
  <MyScene />
</Canvas>
```

### Use Cases

```typescript
// 1. Custom event handlers (non-standard interactions)
useEffect(() => {
  const handleKeydown = (e) => {
    if (e.key === 'ArrowUp') {
      meshRef.current.position.y += 1
      invalidate()  // Tell R3F to render
    }
  }

  window.addEventListener('keydown', handleKeydown)
  return () => window.removeEventListener('keydown', handleKeydown)
}, [invalidate])

// 2. Data subscription updates
useEffect(() => {
  const unsubscribe = store.subscribe((data) => {
    updateScene(data)
    invalidate()  // Re-render when data changes
  })

  return unsubscribe
}, [invalidate])

// 3. Animation sequences
function AnimatedBox() {
  const ref = useRef()
  const { invalidate } = useThree()

  const animate = useCallback(() => {
    // Run animation for 30 frames (0.5s at 60fps)
    invalidate(30)
    // Your animation code in useFrame
  }, [invalidate])

  return (
    <mesh ref={ref} onClick={animate}>
      <boxGeometry />
      <meshStandardMaterial />
    </mesh>
  )
}
```

---

## Advanced: Selective Rendering with Layers

### The Problem

Sometimes you need different objects visible in different contexts (e.g., UI overlay vs main scene, debug visualization vs production):

```typescript
// ❌ PROBLEM - Can't show/hide without remounting
const showDebug = true

<Canvas>
  {showDebug && <DebugVisualization />}  {/* Causes re-render */}
  <MainScene />
</Canvas>
```

### The Solution: Three.js Layers

```typescript
// ✅ GOOD - Use Layers for efficient visibility toggling
function Scene() {
  return (
    <>
      {/* Main scene - layer 0 (default) */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry />
        <meshStandardMaterial />
      </mesh>

      {/* Debug visualization - layer 1 */}
      <DebugBox layers={1} />

      {/* Fog layer - layer 2 */}
      <DebugVolume layers={2} />

      {/* Camera sees layers 0 and 1, but not 2 */}
      <PerspectiveCamera position={[0, 0, 5]} />
    </>
  )
}

function DebugBox({ layers }) {
  const ref = useRef()

  useEffect(() => {
    ref.current.layers.set(layers)  // Assign to layer 1
  }, [layers])

  return (
    <mesh ref={ref}>
      <boxGeometry />
      <meshStandardMaterial color="yellow" wireframe />
    </mesh>
  )
}

// Control visibility without re-renders
function LayerToggle() {
  const { camera } = useThree()

  return (
    <button
      onClick={() => {
        if (camera.layers.isEnabled(1)) {
          camera.layers.disable(1)  // Hide debug
        } else {
          camera.layers.enable(1)   // Show debug
        }
      }}
    >
      Toggle Debug
    </button>
  )
}
```

### Pro Tip: Layer Patterns

```typescript
// Layer assignment pattern
const LAYERS = {
  MAIN: 0,
  UI: 1,
  DEBUG: 2,
  HIDDEN: 3,
}

// In components
<mesh layers={LAYERS.UI} />

// In camera setup
camera.layers.disableAll()
camera.layers.enable(LAYERS.MAIN)
camera.layers.enable(LAYERS.UI)
// DEBUG layer stays hidden
```

---

## Pro Tip: GPU Selection with powerPreference

### The Challenge

Mobile and laptops have multiple GPUs. By default, browsers pick conservatively (integrated GPU). For performance-critical apps:

```typescript
<Canvas
  gl={{
    powerPreference: 'high-performance'  // Forces discrete GPU
  }}
>
  <YourScene />
</Canvas>
```

### When to Use

```typescript
// High-performance rendering (10K+ objects, complex shaders)
<Canvas gl={{ powerPreference: 'high-performance' }}>

// Battery-sensitive app (prefer integrated GPU)
<Canvas gl={{ powerPreference: 'low-power' }}>

// Default behavior (let browser decide)
<Canvas gl={{ powerPreference: 'default' }}>
```

### Real-World Example

```typescript
function AdaptiveCanvas() {
  const [quality, setQuality] = useState('high')

  return (
    <Canvas
      gl={{
        powerPreference: quality === 'high' ? 'high-performance' : 'low-power',
        antialias: quality === 'high',
        dpr: quality === 'high' ? 1 : 0.5
      }}
    >
      <YourScene />
    </Canvas>
  )
}
```

---

## Pro Tip: Scene Centering for Floating-Point Precision

### The Problem

Three.js uses 32-bit floats for positions. At far distances (> 1,000,000 units), precision errors accumulate:

```typescript
// ❌ PROBLEM - Distant objects have jittering/artifacts
function DistantScene() {
  return (
    <>
      <mesh position={[1000000, 0, 0]}>  {/* Precision errors */}
        <boxGeometry />
        <meshStandardMaterial />
      </mesh>
    </>
  )
}
```

### The Solution: Center the Scene

```typescript
// ✅ GOOD - Keep objects near origin, move camera instead
function CenteredScene() {
  const cameraTarget = useRef([1000000, 0, 0])

  useFrame(({ camera }) => {
    // Objects stay near origin (good precision)
    // Camera is offset to view them
    camera.position.x = cameraTarget.current[0]
    camera.lookAt(0, 0, 0)
  })

  return (
    <mesh position={[0, 0, 0]}>  {/* Near origin = good precision */}
      <boxGeometry />
      <meshStandardMaterial />
    </mesh>
  )
}
```

### Pattern: World vs Local Space

```typescript
// Keep geometry in local space (small numbers)
// Move camera/scene in world space (large numbers)

const WORLD_OFFSET = [1000000, 500000, 250000]

function World() {
  return (
    <group position={[-WORLD_OFFSET[0], -WORLD_OFFSET[1], -WORLD_OFFSET[2]]}>
      {/* All objects here have small coordinates */}
      <Terrain position={[100, 0, 0]} />
      <Player position={[110, 0, 0]} />
      <Camera />
    </group>
  )
}
```

---

## Gotcha: Camera Frustum Optimization

### The Problem

Default camera frustum is too large, wasting GPU time rendering distant objects:

```typescript
// ❌ DEFAULT - far: 10000 (very large)
<PerspectiveCamera position={[0, 0, 5]} near={0.1} far={10000} />
// Everything beyond 10000 units still gets processed
```

### The Solution: Optimize Near/Far

```typescript
// ✅ GOOD - Set appropriate bounds
<PerspectiveCamera
  position={[0, 0, 5]}
  near={0.1}           // Objects closer than this are clipped
  far={100}            // Objects farther than this are clipped
/>
```

### Real-World Tuning

```typescript
// For close-up UI rendering
<PerspectiveCamera near={0.01} far={50} />

// For landscape scene
<PerspectiveCamera near={0.1} far={1000} />

// For space sim
<PerspectiveCamera near={1} far={100000} />

// Rule of thumb: far / near = 1000 maximum
// More ratio = more depth precision issues
```

### Performance Impact

```typescript
// Test different values and measure
function OptimizedCamera() {
  const { clock } = useFrame()
  const sceneBounds = [0, 50]  // Min and max Z positions

  const near = Math.max(0.1, sceneBounds[0] - 5)
  const far = sceneBounds[1] + 100

  return (
    <PerspectiveCamera
      near={near}
      far={far}
      position={[0, 0, 20]}
    />
  )
}
```

---

## Related Resources

- [R3F Performance Pitfalls](https://r3f.docs.pmnd.rs/advanced/pitfalls)
- [R3F Scaling Performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance)
- [Three.js Performance Tips](https://discoverthreejs.com/tips-and-tricks/)
- [Three.js Layers](https://threejs.org/docs/index.html#api/en/core/Layers)
- [GPU Selection](https://developer.mozilla.org/en-US/docs/Web/API/WebGLContextAttributes)
- [Next: useFrame Patterns](./02-useframe-patterns.md)
