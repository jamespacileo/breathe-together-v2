# React Three Fiber: Memory Management

Prevent memory leaks and manage resources efficiently.

## Quick Reference

```typescript
// Auto-disposal (R3F default)
<mesh>
  <boxGeometry />  {/* Auto-disposed on unmount */}
  <meshStandardMaterial />  {/* Auto-disposed */}
</mesh>

// Manual disposal control
<group dispose={null}>  {/* Don't auto-dispose */}
  <mesh />
</group>

// Primitive (external objects)
<primitive object={externalObj} />  {/* You dispose this */}
```

---

## Pattern 1: Auto-Disposal (Default Behavior)

### How It Works

```typescript
// ✅ Good - R3F auto-disposes on unmount
function Box() {
  return (
    <mesh>
      <boxGeometry />  {/* Disposed when component unmounts */}
      <meshStandardMaterial color="blue" />  {/* Disposed */}
    </mesh>
  )
}
```

R3F calls `dispose()` on all geometries, materials, and textures when components unmount.

### Memory Flow

```
Component mounts:
  geometry created → 2MB allocated
  material created → 1MB allocated
  Total: 3MB

Component unmounts:
  geometry.dispose() → 2MB freed
  material.dispose() → 1MB freed
  Total freed: 3MB ✓
```

---

## Pattern 2: Shared Materials (disable Auto-Disposal)

### The Problem

```typescript
// ❌ BAD - Auto-disposes shared material when first component unmounts
const sharedMaterial = new THREE.MeshStandardMaterial({ color: 'red' })

function Scene() {
  return (
    <>
      <mesh>
        <boxGeometry />
        <primitive object={sharedMaterial} />
      </mesh>
      <mesh>
        <sphereGeometry />
        <primitive object={sharedMaterial} />  {/* ← Material already disposed! */}
      </mesh>
    </>
  )
}
```

### The Solution

```typescript
// ✅ GOOD - Disable auto-disposal for shared resources
const sharedMaterial = new THREE.MeshStandardMaterial({ color: 'red' })

function Scene() {
  return (
    <group dispose={null}>  {/* Don't auto-dispose children */}
      <mesh>
        <boxGeometry />
        <primitive object={sharedMaterial} />
      </mesh>
      <mesh>
        <sphereGeometry />
        <primitive object={sharedMaterial} />  {/* Still available */}
      </mesh>
    </group>
  )
}

// Manual cleanup when scene unmounts
useEffect(() => {
  return () => {
    sharedMaterial.dispose()
  }
}, [])
```

---

## Pattern 3: Primitive Objects

### The Problem

```typescript
// ❌ BAD - Primitive doesn't auto-dispose
const externalGeometry = new THREE.BoxGeometry(1, 1, 1)

function Component() {
  useEffect(() => {
    // When this component unmounts...
    // externalGeometry is still alive in memory!
  }, [])

  return (
    <mesh>
      <primitive object={externalGeometry} />  {/* Not auto-disposed */}
      <meshStandardMaterial />
    </mesh>
  )
}
```

### The Solution

```typescript
// ✅ GOOD - Manual cleanup for primitives
const externalGeometry = new THREE.BoxGeometry(1, 1, 1)

function Component() {
  useEffect(() => {
    return () => {
      // Clean up on unmount
      externalGeometry.dispose()
    }
  }, [])

  return (
    <mesh>
      <primitive object={externalGeometry} />
      <meshStandardMaterial />
    </mesh>
  )
}
```

---

## Pattern 4: Textures and Asset Loading

### The Problem

```typescript
// ❌ BAD - Texture loaded every render
function Textured() {
  const [texture, setTexture] = useState()

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
// ✅ GOOD - Load once, reuse
import { useTexture } from '@react-three/drei'

function Textured() {
  // Auto-loaded, auto-disposed on unmount
  const texture = useTexture('/texture.png')

  return (
    <mesh>
      <boxGeometry />
      <meshStandardMaterial map={texture} />
    </mesh>
  )
}

// Preload to avoid loading stutter
useEffect(() => {
  useTexture.preload('/texture.png')
}, [])
```

### Multiple Textures

```typescript
import { useTexture } from '@react-three/drei'

function Material() {
  const textures = useTexture({
    map: '/color.jpg',
    normalMap: '/normal.jpg',
    roughnessMap: '/roughness.jpg',
    metalnessMap: '/metalness.jpg',
  })

  return (
    <meshStandardMaterial {...textures} />
  )
}
```

---

## Pattern 5: GLTF Models

### The Problem

```typescript
// ❌ BAD - Model loaded every render
function Model() {
  const [model, setModel] = useState()

  return model && <primitive object={model.scene} />
}
```

### The Solution

```typescript
// ✅ GOOD - Use useGLTF with auto-disposal
import { useGLTF } from '@react-three/drei'

function Model() {
  const { scene } = useGLTF('/model.gltf')

  return <primitive object={scene} dispose={null} />
}

// Better - Use gltfjsx to generate components
// npx gltfjsx model.gltf → model.jsx
import ModelComponent from './model'

function MyScene() {
  return <ModelComponent />
}
```

---

## Pattern 6: Renderers and Contexts

### The Problem

```typescript
// ❌ BAD - Renderer never gets cleaned up
function GLComponent() {
  useEffect(() => {
    const renderer = new THREE.WebGLRenderer()
    const scene = new THREE.Scene()

    // No cleanup!
    return () => {
      // Missing: renderer.dispose()
      // Missing: memory leak!
    }
  }, [])
}
```

### The Solution

```typescript
// ✅ GOOD - R3F handles this automatically
function GLComponent() {
  const { gl, scene } = useThree()
  // R3F cleans up gl and scene on unmount
  return null
}

// If using THREE directly:
useEffect(() => {
  const renderer = new THREE.WebGLRenderer()
  const scene = new THREE.Scene()

  return () => {
    renderer.dispose()  // Clean up renderer
    // Dispose all geometries in scene
    scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose()
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose())
        } else {
          obj.material.dispose()
        }
      }
    })
  }
}, [])
```

---

## Pattern 7: Cleanup Traversal

For complex scenes, traverse and dispose all resources:

```typescript
// ✅ GOOD - Comprehensive cleanup
function cleanup(object) {
  object.traverse((obj) => {
    // Dispose geometry
    if (obj.geometry) {
      obj.geometry.dispose()
    }

    // Dispose materials
    if (obj.material) {
      const materials = Array.isArray(obj.material)
        ? obj.material
        : [obj.material]

      materials.forEach((material) => {
        material.dispose()

        // Dispose textures
        Object.keys(material).forEach((key) => {
          const value = material[key]
          if (value?.isTexture) {
            value.dispose()
          }
        })
      })
    }
  })
}

useEffect(() => {
  return () => {
    cleanup(scene)
  }
}, [scene])
```

---

## Pattern 8: Portal for Separate Rendering

### The Problem

```typescript
// ❌ BAD - Unmounting and remounting causes disposal thrashing
function Modal() {
  if (!isOpen) return null

  return (
    <Canvas>  {/* Entire scene created/destroyed */}
      <Scene />  {/* All geometries/materials disposed */}
    </Canvas>
  )
}
```

### The Solution

```typescript
// ✅ GOOD - Keep scene, hide/show instead
function Modal() {
  const groupRef = useRef()

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.visible = isOpen
    }
  }, [isOpen])

  return (
    <group ref={groupRef} visible={false}>
      <Scene />  {/* Never disposed */}
    </group>
  )
}
```

---

## Pattern 9: Memory Profiling

### Chrome DevTools

```typescript
// Take heap snapshots
1. DevTools → Memory tab
2. Click "Take heap snapshot"
3. Look for THREE objects (Geometry, Material, etc)
4. Compare snapshots before/after unmounting
5. Check if memory decreases
```

### Custom Memory Monitor

```typescript
function MemoryMonitor() {
  const [stats, setStats] = useState({})

  useFrame(() => {
    if (performance.memory) {
      setStats({
        usedJSHeapSize: (performance.memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
        totalJSHeapSize: (performance.memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB',
      })
    }
  })

  return <div>{JSON.stringify(stats)}</div>
}
```

---

## Advanced: Attach Pattern vs Primitive

### The Problem

Using `primitive` with shared objects creates disposal confusion:

```typescript
// ❌ CONFUSING - Which component disposes this?
const sharedGeo = new THREE.BoxGeometry(1, 1, 1)

function Mesh1() {
  return (
    <mesh>
      <primitive object={sharedGeo} />
      <meshStandardMaterial />
    </mesh>
  )
}

function Mesh2() {
  return (
    <mesh>
      <primitive object={sharedGeo} />  {/* Same object - who disposes? */}
      <meshStandardMaterial />
    </mesh>
  )
}
```

### The Solution: Use attach Pattern

```typescript
// ✅ GOOD - Explicit attachment, no confusion
const sharedGeo = new THREE.BoxGeometry(1, 1, 1)

function Mesh1() {
  return (
    <mesh>
      {/* Attached to mesh.geometry - won't be auto-disposed */}
      <primitive object={sharedGeo} attach="geometry" dispose={null} />
      <meshStandardMaterial />
    </mesh>
  )
}

function Mesh2() {
  return (
    <mesh>
      {/* Same geometry - explicitly not disposed */}
      <primitive object={sharedGeo} attach="geometry" dispose={null} />
      <meshStandardMaterial />
    </mesh>
  )
}

// Cleanup when done
useEffect(() => {
  return () => {
    sharedGeo.dispose()  // Single cleanup point
  }
}, [])
```

### Attach Pattern Benefits

```typescript
// Declarative object binding
<mesh>
  {/* Explicitly attached to mesh.geometry */}
  <boxGeometry attach="geometry" />

  {/* Explicitly attached to mesh.material */}
  <meshStandardMaterial attach="material" />

  {/* Custom properties */}
  <mesh attach="children" />
</mesh>

// Attach to custom properties
<group>
  <MyComponent attach="child" />
</group>

// Array attachment
<mesh>
  <meshStandardMaterial attach="material-0" />  {/* materials[0] */}
  <meshStandardMaterial attach="material-1" />  {/* materials[1] */}
</mesh>
```

### Performance Comparison

```typescript
// Using attach - Auto-disposal is safe
function Component() {
  return (
    <mesh>
      <boxGeometry attach="geometry" />
      <meshStandardMaterial attach="material" />
    </mesh>
  )
}
// Disposed on unmount ✓

// Using primitive - Manual disposal required
const geo = new THREE.BoxGeometry()
function Component() {
  useEffect(() => {
    return () => geo.dispose()
  }, [])

  return (
    <mesh>
      <primitive object={geo} attach="geometry" dispose={null} />
      <meshStandardMaterial />
    </mesh>
  )
}
// Requires cleanup code ✗
```

---

## Advanced: Draco Compression for glTF Models

### The Problem

Large GLTF models waste bandwidth:

```typescript
// ❌ BAD - 5MB uncompressed model
function Model() {
  const { scene } = useGLTF('/large-model.glb')
  // 5MB download, 30MB memory usage
  return <primitive object={scene} dispose={null} />
}
```

### The Solution: Draco Compression

Draco reduces file size by 90% with minimal quality loss:

```typescript
// ✅ GOOD - 500KB compressed model
import { useGLTF } from '@react-three/drei'

function Model() {
  const { scene } = useGLTF('/large-model.glb')
  // 500KB download instead of 5MB
  // Compression happens on server before download
  return <primitive object={scene} dispose={null} />
}

// Canvas setup for Draco support
<Canvas
  gl={{
    // Needed for Draco decompression
    antialias: true,
    alpha: false,
  }}
>
  <Suspense fallback={null}>
    <Model />
  </Suspense>
</Canvas>
```

### How to Apply Draco

```bash
# 1. Install compression tool
npm install -D glb-pack  # or gltfpack

# 2. Compress your models
npx gltfpack -i model.glb -o model-compressed.glb

# 3. Use compressed version
const { scene } = useGLTF('/model-compressed.glb')
```

### Compression Settings

```bash
# Different compression levels
npx gltfpack -i model.glb -o model-small.glb -c -e basis
# -c = compress with Draco
# -e basis = basis texture compression
# -tc = aggressive triangle compression

# For best balance
npx gltfpack -i model.glb -o model-optimal.glb -c -si 0.95
# -si 0.95 = 95% quality retention (5% loss)
```

### Memory Impact

```typescript
// Original: 5MB file = 30MB memory
// Compressed: 500KB file = 3MB memory
// Savings: 90% bandwidth, 90% memory

// Decompression happens once at load time (~200ms)
// Then fully decompressed in GPU memory

function Model() {
  const { scene } = useGLTF('/model.glb')  // Auto-decompresses

  return (
    <Suspense fallback={<LoadingScreen />}>
      <primitive object={scene} dispose={null} />
    </Suspense>
  )
}
```

---

## Pro Tip: gltfpack vs Draco Comparison

### When to Use Each

```typescript
// Draco alone (simple compression)
// Pros: Works with existing loaders
// Cons: Slower decompression (~500ms)
// Use for: Static models, one-time load

// gltfpack (comprehensive optimization)
// Pros: Smaller files, faster decompression, better quality
// Cons: Needs preprocessing step
// Use for: Production, large models, mobile

// Both (Draco + gltfpack optimization)
// Pros: Best of both - smallest files, full control
// Cons: More complex setup
// Use for: Performance-critical apps
```

### Compression Comparison

```bash
# Original model.glb: 5.2MB

# Draco only
npx gltfpack -i model.glb -o draco.glb -c
# Result: 800KB (85% reduction)

# gltfpack with optimization
npx gltfpack -i model.glb -o optimized.glb -tc -si 0.95
# Result: 600KB (88% reduction)

# Both combined
npx gltfpack -i model.glb -o both.glb -c -tc -si 0.95
# Result: 450KB (91% reduction)
```

### File Size Breakdown

```typescript
// Typical 5MB model
Original:         5.0 MB
  - Geometry:     3.5 MB (70%)
  - Textures:     1.3 MB (26%)
  - Other:        0.2 MB (4%)

After Draco only: 0.8 MB
  - Geometry:     0.5 MB (compressed 85%)
  - Textures:     1.3 MB (unchanged)

After gltfpack:   0.6 MB
  - Geometry:     0.5 MB (compressed)
  - Textures:     0.8 MB (basis-compressed)
  - Other:        0.0 MB (cleaned up)
```

---

## Gotcha: Multiple References to Same Geometry

### The Problem

If multiple meshes reference the same geometry with `attach="geometry"`, disposing one disposable object causes issues:

```typescript
// ❌ GOTCHA - Both meshes use same geometry
const sharedGeo = new THREE.BoxGeometry(1, 1, 1)

function Scene() {
  useEffect(() => {
    return () => {
      sharedGeo.dispose()  // When does this happen?
    }
  }, [])

  return (
    <>
      <mesh position={[0, 0, 0]}>
        <primitive object={sharedGeo} attach="geometry" dispose={null} />
      </mesh>
      <mesh position={[5, 0, 0]}>
        <primitive object={sharedGeo} attach="geometry" dispose={null} />
      </mesh>
    </>
  )
}

// If one mesh unmounts before the other, both lose geometry!
```

### The Solution: Reference Counting

```typescript
// ✅ GOOD - Manage shared resource lifecycle
class SharedGeometryManager {
  constructor() {
    this.refCount = 0
    this.geometry = null
  }

  acquire() {
    this.refCount++
    if (this.refCount === 1) {
      this.geometry = new THREE.BoxGeometry(1, 1, 1)
    }
    return this.geometry
  }

  release() {
    this.refCount--
    if (this.refCount === 0) {
      this.geometry?.dispose()
      this.geometry = null
    }
  }
}

const geoManager = new SharedGeometryManager()

function Mesh1() {
  useEffect(() => {
    const geo = geoManager.acquire()
    return () => geoManager.release()
  }, [])

  return (
    <mesh>
      <primitive object={geoManager.geometry} attach="geometry" dispose={null} />
    </mesh>
  )
}

function Mesh2() {
  useEffect(() => {
    const geo = geoManager.acquire()
    return () => geoManager.release()
  }, [])

  return (
    <mesh>
      <primitive object={geoManager.geometry} attach="geometry" dispose={null} />
    </mesh>
  )
}
```

### Simpler Alternative: Shared Material Hook

```typescript
// Create a reusable shared resource hook
function useSharedGeometry() {
  const geoRef = useRef(null)

  useEffect(() => {
    if (!geoRef.current) {
      geoRef.current = new THREE.BoxGeometry(1, 1, 1)
    }

    return () => {
      // Only dispose if no other references exist
      // For now, don't dispose to be safe
    }
  }, [])

  return geoRef.current
}

function Mesh1() {
  const sharedGeo = useSharedGeometry()

  return (
    <mesh>
      <primitive object={sharedGeo} attach="geometry" dispose={null} />
    </mesh>
  )
}
```

---

## Memory Leak Checklist

- [ ] Textures disposed on unmount
- [ ] Models/geometries disposed properly
- [ ] Materials disposed when shared resources end
- [ ] Event listeners removed from THREE objects
- [ ] useEffect cleanup functions call dispose()
- [ ] No circular references between objects
- [ ] Primitive objects manually disposed
- [ ] Render targets and framebuffers disposed
- [ ] Attach pattern used for shared resources
- [ ] Draco compression applied to large models

---

## Related Resources

- [Three.js Disposal Guide](https://threejs.org/docs/#manual/en/introduction/How-to-dispose-of-objects)
- [R3F Disposal Documentation](https://r3f.docs.pmnd.rs/api/objects)
- [Draco Compression](https://github.com/google/draco)
- [gltfpack Documentation](https://github.com/zeux/meshoptimizer)
- [Previous: useFrame Patterns](./02-useframe-patterns.md)
- [Next: Common Gotchas](./04-common-gotchas.md)
