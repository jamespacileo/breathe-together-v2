# React Three Fiber: Declarative Patterns

Master declarative patterns for building maintainable, composable 3D scenes.

## Quick Reference

| Pattern | Approach | Use Case |
|---------|----------|----------|
| **attach** | Declarative object attachment | Materials, geometries, lights |
| **extend()** | Register custom Three.js classes | Custom components |
| **args** vs **props** | Constructor vs property pattern | Component creation |
| **Declarative vs Imperative** | React-like vs direct mutation | Different scenarios |

---

## Pattern 1: attach - Declarative Object Attachment

### The Problem

How do you declaratively attach objects that aren't React components?

```typescript
// ❌ IMPERATIVE - Manual attachment
function BoxMaterial() {
  const matRef = useRef()

  useEffect(() => {
    const mat = new THREE.MeshStandardMaterial({ color: 'red' })
    meshRef.current.material = mat
    matRef.current = mat

    return () => mat.dispose()
  }, [])

  return null
}
```

### The Solution

Use the `attach` prop:

```typescript
// ✅ DECLARATIVE - Attach via props
function BoxMaterial() {
  return (
    <mesh>
      <boxGeometry />
      <meshStandardMaterial
        attach="material"  // Attaches to mesh.material
        color="red"
      />
    </mesh>
  )
}
```

### attach Patterns

```typescript
// Attach to mesh
<mesh>
  <boxGeometry attach="geometry" />
  <meshStandardMaterial attach="material" />
</mesh>

// Attach to group
<group>
  <mesh>
    <sphereGeometry attach="geometry" />
    <meshBasicMaterial attach="material" />
  </mesh>
</group>

// Attach to light
<directionalLight>
  <directionalLightShadow
    attach="shadow"
    mapSize={[1024, 1024]}
  />
</directionalLight>

// Attach to camera
<perspectiveCamera
  attach="camera"
  args={[75, window.innerWidth / window.innerHeight, 0.1, 1000]}
/>
```

### Advanced: Nested Attachment

```typescript
// Attach to nested properties
<mesh>
  {/* Attach geometry and material */}
  <boxGeometry attach="geometry" args={[1, 1, 1]} />
  <meshStandardMaterial
    attach="material"
    color="blue"
    metalness={0.5}
  />

  {/* Attach position (objects have position property) */}
  <group position={[0, 0, 5]}>
    <sphereGeometry />
    <meshStandardMaterial />
  </group>
</mesh>
```

### Real-World: Dynamic Material Swapping

```typescript
function SwappableMaterial({ materialType = 'standard' }) {
  return (
    <mesh>
      <boxGeometry attach="geometry" />

      {materialType === 'standard' && (
        <meshStandardMaterial
          attach="material"
          color="blue"
          metalness={0.5}
        />
      )}

      {materialType === 'basic' && (
        <meshBasicMaterial
          attach="material"
          color="red"
          wireframe
        />
      )}

      {materialType === 'phong' && (
        <meshPhongMaterial
          attach="material"
          color="green"
          shininess={100}
        />
      )}
    </mesh>
  )
}

// Usage
<SwappableMaterial materialType="standard" />
```

---

## Pattern 2: extend() - Register Custom Three.js Classes

### The Problem

You have custom Three.js classes that aren't built into R3F:

```typescript
// Custom Three.js class
class CustomGeometry extends THREE.BufferGeometry {
  constructor() {
    super()
    // Custom initialization
  }
}

// How to use it in JSX?
// <customGeometry /> won't work!
```

### The Solution

Use `extend()` to register custom classes:

```typescript
import { extend } from '@react-three/fiber'

// Define custom class
class CustomGeometry extends THREE.BufferGeometry {
  constructor() {
    super()
    this.computeBoundingBox()
  }
}

// Register with R3F
extend({ CustomGeometry })

// Now use in JSX
function CustomShape() {
  return (
    <mesh>
      <customGeometry />  {/* Now works! */}
      <meshStandardMaterial />
    </mesh>
  )
}
```

### Advanced: Custom Shader Material

```typescript
// Custom shader material
class GlitchMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      uniforms: {
        uTime: { value: 0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uVv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          gl_FragColor = vec4(sin(uTime), 0.0, 1.0, 1.0);
        }
      `
    })
  }
}

extend({ GlitchMaterial })

function GlitchBox() {
  const matRef = useRef()

  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = clock.elapsedTime
    }
  })

  return (
    <mesh>
      <boxGeometry />
      <glitchMaterial ref={matRef} attach="material" />
    </mesh>
  )
}
```

### Third-Party Extensions

```typescript
import { extend } from '@react-three/fiber'
import { Glitch } from '@react-three/postprocessing'

// Register third-party effects
extend({ Glitch })

// Now use in JSX
function GlitchEffect() {
  return (
    <canvas>
      <glitch factor={0.5} />
    </canvas>
  )
}
```

---

## Pattern 3: args vs props - Constructor Arguments

### The Problem

Three.js constructors take arguments, but you want to use React props:

```typescript
// Three.js way
const geo = new THREE.BoxGeometry(1, 2, 3)
const mat = new THREE.MeshStandardMaterial({ color: 'red' })

// How to do this in JSX?
```

### The Solution

Use `args` for constructor arguments:

```typescript
// Declarative with args
<mesh>
  {/* Constructor: new BoxGeometry(1, 2, 3) */}
  <boxGeometry args={[1, 2, 3]} />

  {/* Constructor args + props */}
  <meshStandardMaterial
    args={[{ color: 'red' }]}
    metalness={0.5}
  />
</mesh>
```

### args Reconstruction Pattern

```typescript
// When args change, geometry is recreated
function ResponsiveBox({ size }) {
  return (
    <mesh>
      {/* Recreates when size changes */}
      <boxGeometry args={[size, size, size]} />
      <meshStandardMaterial color="blue" />
    </mesh>
  )
}

// Alternative: Use useMemo to prevent recreation
function OptimizedBox({ size }) {
  const args = useMemo(() => [size, size, size], [size])

  return (
    <mesh>
      <boxGeometry args={args} />
      <meshStandardMaterial color="blue" />
    </mesh>
  )
}
```

### Complex Constructor Arguments

```typescript
// Multi-argument constructors
<mesh>
  {/* BufferGeometry(position, index, etc) */}
  <bufferGeometry args={[positions, indices]} />

  {/* Multiple args */}
  <cylinderGeometry args={[radiusTop, radiusBottom, height, radSegments]} />

  {/* Nested args for complex materials */}
  <meshStandardMaterial
    args={[
      {
        color: 'blue',
        metalness: 0.5,
        roughness: 0.4
      }
    ]}
  />
</mesh>
```

---

## Pattern 4: Declarative vs Imperative - Trade-offs

### Declarative (React-like)

```typescript
// ✅ DECLARATIVE - Easy to read, composable
function DeclairativeScene() {
  const [color, setColor] = useState('red')

  return (
    <>
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={color} />
      </mesh>

      <button onClick={() => setColor('blue')}>
        Change Color
      </button>
    </>
  )
}
```

**Pros:**
- Familiar React patterns
- Easy to compose
- State-driven
- Familiar to React developers

**Cons:**
- Some Three.js patterns don't translate
- Props cause re-renders
- Reference equality issues

### Imperative (Direct mutation)

```typescript
// ✅ IMPERATIVE - Direct control
function ImperativeScene() {
  const meshRef = useRef()

  const handleColorChange = () => {
    meshRef.current.material.color.set('blue')
    // No re-render needed
  }

  return (
    <>
      <mesh ref={meshRef}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="red" />
      </mesh>

      <button onClick={handleColorChange}>
        Change Color
      </button>
    </>
  )
}
```

**Pros:**
- Performance (no re-renders)
- Direct Three.js control
- Less memory overhead

**Cons:**
- Less composable
- Harder to test
- Less React-like

### Hybrid Approach (Recommended)

```typescript
// Use declarative for structure, imperative for performance
function HybridScene() {
  const meshRef = useRef()
  const [quality, setQuality] = useState('high')

  // Declarative: Quality level changes component structure
  return (
    <>
      {/* Declaratively choose geometry */}
      <mesh ref={meshRef}>
        {quality === 'high' && <icosahedronGeometry args={[1, 4]} />}
        {quality === 'low' && <icosahedronGeometry args={[1, 1]} />}

        {/* Imperative: Animate color without re-renders */}
        <meshStandardMaterial ref={meshRef} />
      </mesh>

      <useFrame={() => {
        // Direct mutation for animation
        meshRef.current.rotation.y += 0.01
      }} />
    </>
  )
}
```

---

## Pattern 5: Constructor Argument Patterns

### Handling Expensive Construction

```typescript
// Some geometries are expensive to create
// Cache them using useMemo

function ExpensiveGeometry() {
  const args = useMemo(
    () => [radius, detail, levelOfDetail],
    [radius, detail, levelOfDetail]
  )

  return (
    <mesh>
      <icosahedronGeometry args={args} />
      <meshStandardMaterial />
    </mesh>
  )
}
```

### Conditional Constructor Arguments

```typescript
// Different arguments based on state
function VariableGeometry({ type }) {
  return (
    <mesh>
      {type === 'box' && <boxGeometry args={[1, 1, 1]} />}
      {type === 'sphere' && <sphereGeometry args={[1, 32, 32]} />}
      {type === 'cylinder' && <cylinderGeometry args={[1, 1, 2, 32]} />}

      <meshStandardMaterial color="blue" />
    </mesh>
  )
}
```

---

## Pattern 6: Property Reactivity

### Reactive Material Properties

```typescript
// Properties update reactively without re-renders
function ReactiveMaterial() {
  const [metalness, setMetalness] = useState(0)

  return (
    <>
      <mesh>
        <boxGeometry />
        {/* This updates directly on Three.js object */}
        <meshStandardMaterial
          metalness={metalness}
          onUpdate={(self) => console.log('Updated:', self)}
        />
      </mesh>

      <Slider
        value={metalness}
        onChange={setMetalness}
        min={0}
        max={1}
      />
    </>
  )
}
```

### Reactive Position and Scale

```typescript
// Transform properties are reactive
function ReactiveTransform() {
  const [position, setPosition] = useState([0, 0, 0])
  const [scale, setScale] = useState(1)

  return (
    <mesh
      position={position}  {/* Reactive! */}
      scale={scale}        {/* Reactive! */}
    >
      <boxGeometry />
      <meshStandardMaterial />
    </mesh>
  )
}
```

---

## Best Practices

### 1. Use attach for Object Composition

```typescript
// Good: Attach objects declaratively
<mesh>
  <boxGeometry attach="geometry" />
  <meshStandardMaterial attach="material" color="blue" />
</mesh>

// Avoid: Manual assignment
function BadApproach() {
  useEffect(() => {
    meshRef.current.geometry = new THREE.BoxGeometry()
  }, [])
}
```

### 2. Register Custom Classes with extend()

```typescript
// Good: Extend for custom classes
extend({ CustomMaterial })
<customMaterial />

// Avoid: Creating inline
function BadApproach() {
  const mat = useMemo(() => new CustomMaterial(), [])
  return <primitive object={mat} />
}
```

### 3. Use args for Constructor Arguments

```typescript
// Good: Constructor args via args prop
<boxGeometry args={[1, 2, 3]} />

// Avoid: Manual construction
function BadApproach() {
  const geo = useMemo(() => new THREE.BoxGeometry(1, 2, 3), [])
  return <primitive object={geo} />
}
```

### 4. Prefer Declarative Structure

```typescript
// Good: Declarative component tree
function Scene() {
  return (
    <>
      <mesh>...</mesh>
      <mesh>...</mesh>
      <light />
    </>
  )
}

// Avoid: Manual element creation
function BadApproach() {
  useEffect(() => {
    const mesh = new THREE.Mesh()
    scene.add(mesh)
  }, [])
}
```

---

## Gotchas

### Args Reconstruction Gotcha

```typescript
// ❌ BAD - args recreated every render
<boxGeometry args={[1, 2, 3]} />

// ✅ GOOD - args memoized
const args = useMemo(() => [1, 2, 3], [])
<boxGeometry args={args} />
```

### Attach Cleanup Gotcha

```typescript
// ❌ BAD - Material not disposed
<mesh>
  <meshStandardMaterial attach="material" />
</mesh>

// ✅ GOOD - Dispose on cleanup
<mesh>
  <meshStandardMaterial
    attach="material"
    dispose={null}  {/* Or handle in useEffect */}
  />
</mesh>
```

---

## Related Resources

- [R3F Declarative Documentation](https://docs.pmnd.rs/react-three-fiber/api/objects#attach)
- [Three.js Constructor Patterns](https://threejs.org/docs/)
- [extend() API Reference](https://docs.pmnd.rs/react-three-fiber/api/hooks#extend)
- [Previous: Advanced Hooks](./05-advanced-hooks.md)
