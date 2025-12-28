# Drei: Performance Helpers

Leverage Drei components to optimize rendering performance.

## Quick Reference

| Helper | Purpose | Impact |
|--------|---------|--------|
| Instances | Render 10K+ identical objects | Critical |
| Preload | Pre-compile shaders | Important |
| useTexture | Load textures efficiently | Important |
| Merged | Merge geometries | Useful |
| BvhCollider | Optimize raycasting | Useful |

---

## Pattern 1: Instances Component

Efficient rendering of thousands of identical objects:

```typescript
import { Instances, Instance } from '@react-three/drei'

function Particles({ count = 10000 }) {
  return (
    <Instances limit={count} range={count}>
      <sphereGeometry args={[0.1, 16, 16]} />
      <meshStandardMaterial />

      {Array.from({ length: count }).map((_, i) => (
        <Particle key={i} index={i} />
      ))}
    </Instances>
  )
}

function Particle({ index }) {
  const ref = useRef()

  useFrame(({ clock }) => {
    ref.current.position.y = Math.sin(clock.elapsedTime + index * 0.1) * 5
  })

  return (
    <Instance
      ref={ref}
      position={[Math.random() * 100 - 50, 0, Math.random() * 100 - 50]}
      color={Math.random() > 0.5 ? 'red' : 'blue'}
    />
  )
}
```

### Project Example

**breathe-together-v2** uses a similar pattern with `<instancedMesh>` for 300 particles.

---

## Pattern 2: useTexture Hook

Load textures efficiently with caching:

```typescript
import { useTexture } from '@react-three/drei'

// Single texture
function Box() {
  const texture = useTexture('/texture.png')
  return <meshStandardMaterial map={texture} />
}

// Multiple textures
function Material() {
  const textures = useTexture({
    map: '/color.jpg',
    normalMap: '/normal.jpg',
    roughnessMap: '/roughness.jpg',
    metalnessMap: '/metalness.jpg',
    aoMap: '/ao.jpg'
  })

  return <meshStandardMaterial {...textures} />
}

// Preload to avoid stutter
useEffect(() => {
  useTexture.preload('/texture.png')
}, [])
```

---

## Pattern 3: Preload Component

Pre-compile shaders and upload assets:

```typescript
import { Preload } from '@react-three/drei'

function App() {
  return (
    <Canvas>
      <Suspense fallback={<Loading />}>
        <Scene />
      </Suspense>

      {/* Preload all materials and textures */}
      <Preload all />
    </Canvas>
  )
}
```

### Custom Preload

```typescript
import { Preload, useGLTF } from '@react-three/drei'

function ModelScene() {
  const { scene } = useGLTF('/model.glb')

  return (
    <>
      <primitive object={scene} />
      <Preload scene={scene} />
    </>
  )
}
```

---

## Pattern 4: Merged Geometry

Combine multiple geometries into one:

```typescript
import { Merged } from '@react-three/drei'

function MergedGeometries() {
  return (
    <Merged>
      <mesh position={[0, 0, 0]}>
        <boxGeometry />
      </mesh>
      <mesh position={[2, 0, 0]}>
        <sphereGeometry />
      </mesh>
      <mesh position={[4, 0, 0]}>
        <coneGeometry />
      </mesh>
    </Merged>
  )
}
```

---

## Pattern 5: Text Rendering

Efficient text rendering:

```typescript
import { Text, Center } from '@react-three/drei'

function Label() {
  return (
    <Center>
      <Text
        font="/font.woff"
        fontSize={1}
        color="white"
        outlineWidth={0.002}
        outlineColor="#000000"
      >
        Hello!
      </Text>
    </Center>
  )
}
```

---

## Pattern 6: Billboard (Always Face Camera)

```typescript
import { Billboard } from '@react-three/drei'

function CameraFacingLabel() {
  return (
    <Billboard
      follow={true}
      lockX={false}
      lockY={false}
      lockZ={false}
    >
      <Text>Label</Text>
    </Billboard>
  )
}
```

---

## Pattern 7: HTML Overlay

Render HTML over 3D scene:

```typescript
import { Html } from '@react-three/drei'

function SceneWithUI() {
  return (
    <>
      <mesh>
        <boxGeometry />
        <meshStandardMaterial />

        {/* HTML overlay */}
        <Html transform scale={0.001} position={[1, 1, 0]}>
          <div style={{ background: 'white', padding: 10 }}>
            UI Label
          </div>
        </Html>
      </mesh>
    </>
  )
}
```

---

## Performance Comparison

```
Single meshes (1000):      120ms per frame
Instances (1000):          2ms per frame
Improvement:               60x faster!

Pre-compiled shaders:      60ms first frame
Without preload:           60ms + 100ms... = 160ms first frame
Improvement:               Smooth first frame
```

---

---

## Pattern 8: ContactShadows with frames={1} for Static Shadows

### The Problem

ContactShadows are great for realistic shadows, but they re-render every frame by default, wasting GPU time for static scenes:

```typescript
// ❌ BAD - Re-renders every frame
<ContactShadows
  position={[0, -1, 0]}
  scale={10}
  blur={2}
  far={10}
/>

// Scene never changes, but shadows re-render 60 times/sec
```

### The Solution

Use `frames={1}` to render once, then reuse:

```typescript
// ✅ GOOD - Render once, reuse
<ContactShadows
  position={[0, -1, 0]}
  scale={10}
  blur={2}
  far={10}
  frames={1}  // Render once
/>
```

### When to Use

```typescript
// Static objects: Use frames={1}
<ContactShadows frames={1} />

// Animated objects: Use default (re-renders each frame)
<ContactShadows />  // frames={Infinity}

// Hybrid: Re-render every 10 frames
<ContactShadows frames={10} />
```

### Performance Impact

```
Dynamic ContactShadows: 5ms per frame overhead
Static (frames={1}): 0.1ms per frame (99% faster)
```

---

## Pattern 9: BakeShadows for Freezing Shadow Maps

### The Problem

Computing shadows in real-time is expensive. For static geometry (terrain, buildings), you're wasting GPU cycles every frame.

### The Solution

Bake shadows into a texture map, then reuse it:

```typescript
import { BakeShadows } from '@react-three/drei'

function Scene() {
  return (
    <>
      {/* Bake shadows for static objects */}
      <BakeShadows />

      {/* Static terrain */}
      <mesh position={[0, 0, 0]} receiveShadow castShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial />
      </mesh>

      {/* Light (shadows baked from this) */}
      <directionalLight
        position={[5, 5, 5]}
        castShadow
        shadowMapSize={[1024, 1024]}
      />
    </>
  )
}
```

### How It Works

1. BakeShadows renders the scene to a texture
2. Shadows are baked into that texture
3. Static objects receive baked shadows
4. Dynamic objects still use real-time shadows
5. Result: ~50% less shadow computation

### Real-World Example

```typescript
// breathe-together-v2 could use this for terrain
function TerrainWithBakedShadows() {
  return (
    <>
      <BakeShadows />

      {/* Terrain (static) */}
      <mesh position={[0, -5, 0]} receiveShadow castShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="green" />
      </mesh>

      {/* Particles (dynamic) */}
      <ParticleSystem castShadow />

      {/* Light */}
      <directionalLight
        position={[10, 10, 5]}
        intensity={1}
        castShadow
        shadowMapSize={[2048, 2048]}
      />
    </>
  )
}
```

---

## Pattern 10: useFBO for Render Targets

### The Problem

Sometimes you need to render a scene to a texture instead of to the screen. Without render targets, you'd re-render the entire scene multiple times.

### The Solution

Use `useFBO` to create render targets efficiently:

```typescript
import { useFBO } from '@react-three/drei'

function SceneWithRenderTarget() {
  const fbo = useFBO(512, 512)  // 512x512 texture

  useFrame(({ gl, scene, camera }) => {
    // 1. Render scene to texture
    gl.setRenderTarget(fbo)
    gl.render(scene, camera)

    // 2. Reset to canvas
    gl.setRenderTarget(null)
  })

  return (
    <mesh>
      <planeGeometry />
      {/* Use FBO texture */}
      <meshBasicMaterial map={fbo.texture} />
    </mesh>
  )
}
```

### Practical Example: Mirror Surface

```typescript
function MirrorSurface() {
  const fbo = useFBO(1024, 1024)
  const cameraRef = useRef()

  useFrame(({ gl, scene }) => {
    // Render reflection
    gl.setRenderTarget(fbo)
    cameraRef.current.position.y *= -1  // Flip camera
    gl.render(scene, cameraRef.current)
    cameraRef.current.position.y *= -1  // Flip back
    gl.setRenderTarget(null)
  })

  return (
    <mesh position={[0, 0, 0]}>
      <planeGeometry args={[10, 10]} />
      <meshStandardMaterial map={fbo.texture} />
    </mesh>
  )
}
```

### Use Cases

- Mirror/reflection effects
- Portals
- Minimap rendering
- Post-processing
- Dynamic texture updates

---

## Pro Tip: Lightformer for Advanced Lighting

### The Problem

Manual light setup is tedious and often looks unrealistic. Three.js lights are physically inaccurate and don't interact properly.

### The Solution

Use Lightformer (from Drei) for professional IBL (Image-Based Lighting):

```typescript
import { Lightformer, Environment } from '@react-three/drei'

function Scene() {
  return (
    <>
      <Environment preset="sunset">
        {/* Add additional light sources */}
        <Lightformer
          intensity={2}
          position={[5, 5, 5]}
          scale={[10, 10, 1]}
          form="ring"  // 'rect', 'circle', 'ring'
        />
        <Lightformer
          intensity={1}
          position={[-5, -5, -5]}
          scale={[10, 10, 1]}
          form="rect"
        />
      </Environment>

      <mesh>
        <sphereGeometry />
        <meshStandardMaterial />
      </mesh>
    </>
  )
}
```

### Lightformer Shapes

```typescript
<Lightformer form="rect" />     // Rectangular light
<Lightformer form="circle" />   // Circular light
<Lightformer form="ring" />     // Ring light (popular for portraits)
<Lightformer form="quad" />     // Quadrilateral
```

### Pro Tip: Performance

Lightformer is more expensive than direct lights but looks much better. Use it for hero shots, not background details.

---

## Pro Tip: SoftShadows vs ContactShadows Comparison

### SoftShadows

```typescript
import { SoftShadows } from '@react-three/drei'

<Canvas>
  <SoftShadows size={25} samples={10} focus={1} />
  <YourScene />
</Canvas>
```

**Pros:**
- Very realistic soft shadows
- Works with any light type
- Beautiful results

**Cons:**
- Expensive (10-30ms per frame)
- Not suitable for mobile
- Many samples needed for quality

### ContactShadows

```typescript
import { ContactShadows } from '@react-three/drei'

<ContactShadows
  scale={10}
  blur={2}
  opacity={0.5}
/>
```

**Pros:**
- Lightweight (~2-5ms)
- Works on mobile
- Good enough for most use cases

**Cons:**
- Less realistic
- Only works on ground plane
- Limited blur quality

### Comparison Table

| Aspect | SoftShadows | ContactShadows |
|--------|-----------|-----------------|
| Realism | Very high | Good |
| Performance | Heavy (20ms+) | Light (2-5ms) |
| Mobile Support | No | Yes |
| Setup | Complex | Simple |
| Best For | Hero shots, close-ups | General scenes |

### Recommendation

```typescript
// High-end desktop
<SoftShadows />

// Mobile-friendly
<ContactShadows />

// Hybrid: Use both
<>
  <ContactShadows opacity={0.3} frames={1} />  // Cheap base
  <SoftShadows size={10} samples={5} />        // Soft details
</>
```

---

## Drei Performance Checklist

- [ ] Used Instances for 100+ similar objects
- [ ] Used Preload for shader pre-compilation
- [ ] Used useTexture for texture loading
- [ ] Used Merged for many static geometries
- [ ] Avoided Text for dynamic content
- [ ] Used BvhCollider for raycasting optimization
- [ ] Used ContactShadows with frames={1} for static scenes
- [ ] Considered BakeShadows for static geometry
- [ ] Used useFBO for render target effects
- [ ] Used Lightformer for advanced lighting
- [ ] Chose appropriate shadow solution (Soft vs Contact)

---

## Related Resources

- [Drei Documentation](https://github.com/pmndrs/drei)
- [Three.js Instancing Guide](https://discoverthreejs.com/tips-and-tricks/)
- [Previous: Shader Materials](./01-shader-materials.md)
- [Next: Advanced Components](./03-advanced-components.md)
