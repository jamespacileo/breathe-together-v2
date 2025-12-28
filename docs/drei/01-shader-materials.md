# Drei: Shader Materials & Advanced Shaders

Master custom shader creation with Drei's shaderMaterial helper.

## Quick Reference

```typescript
import { shaderMaterial, extend } from '@react-three/fiber'
import { shaderMaterial } from '@react-three/drei'

const CustomMaterial = shaderMaterial(
  { time: 0, color: new THREE.Color(0.0, 0.0, 0.0) },  // Uniforms
  vertexShader,  // GLSL vertex code
  fragmentShader  // GLSL fragment code
)

extend({ CustomMaterial })
```

---

## Pattern 1: Basic Shader Material

```typescript
const ColorShiftMaterial = shaderMaterial(
  {
    time: 0,
    color: new THREE.Color(0.2, 0.0, 0.1)
  },
  // Vertex Shader
  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment Shader
  `
    uniform float time;
    uniform vec3 color;
    varying vec2 vUv;
    void main() {
      gl_FragColor = vec4(
        0.5 + 0.3 * sin(vUv.yxx + time) + color,
        1.0
      );
    }
  `
)

extend({ ColorShiftMaterial })

function MyComponent() {
  const matRef = useRef()

  useFrame(({ clock }) => {
    matRef.current.time = clock.elapsedTime
  })

  return (
    <mesh>
      <boxGeometry />
      <colorShiftMaterial ref={matRef} color="hotpink" />
    </mesh>
  )
}
```

---

## Pattern 2: Hot-Reloading Shaders

```typescript
const MyMaterial = shaderMaterial(...)
extend({ MyMaterial })

function Component() {
  return (
    // Add key to force re-creation on shader changes
    <mesh>
      <boxGeometry />
      <myMaterial key={MyMaterial.key} />
    </mesh>
  )
}
```

---

## Pattern 3: MeshTransmissionMaterial (Refraction)

Perfect for glass, water, and transmissive materials:

```typescript
import { MeshTransmissionMaterial } from '@react-three/drei'

function Glass() {
  return (
    <mesh>
      <sphereGeometry args={[1, 64, 64]} />
      <MeshTransmissionMaterial
        resolution={1024}
        transmissionSampler
        thickness={0.5}
        chromaticAberration={0.04}
        anisotropy={0.3}
        distortion={0.4}
        temporalDistortion={0.5}
      />
    </mesh>
  )
}
```

### Project Example

In **breathe-together-v2**, the breathing sphere uses similar material properties for visual polish.

---

## Pattern 4: MeshRefractionMaterial (With CubeCamera)

```typescript
import { MeshRefractionMaterial, CubeCamera } from '@react-three/drei'

function DiamondSphere() {
  return (
    <CubeCamera>
      {(texture) => (
        <mesh>
          <icosahedronGeometry args={[1, 4]} />
          <MeshRefractionMaterial
            envMap={texture}
            aberration={0.02}
            fastChroma={true}
          />
        </mesh>
      )}
    </CubeCamera>
  )
}
```

---

## Pattern 5: Fresnel Shader

For edge glow effects (used in breathe-together-v2!):

```typescript
import { Fresnel } from '@react-three/drei'

function GlowingSphere() {
  return (
    <mesh>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial>
        <Fresnel
          color="cyan"
          intensity={1}
          power={2}
          bias={0.1}
        />
      </meshBasicMaterial>
    </mesh>
  )
}
```

---

## Pattern 6: Custom GLSL with Noise

Adding Simplex noise displacement:

```typescript
const DisplacementMaterial = shaderMaterial(
  {
    time: 0,
    displaceStrength: 0.5
  },
  // Vertex Shader with noise
  `
    #include <noise>

    varying vec3 vPosition;
    uniform float time;
    uniform float displaceStrength;

    void main() {
      vPosition = position;

      // Displace based on simplex noise
      float noise = snoise(vec3(position * 2.0 + time * 0.5));
      vec3 displaced = position + normal * noise * displaceStrength;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
    }
  `,
  `
    varying vec3 vPosition;

    void main() {
      gl_FragColor = vec4(vPosition * 0.5 + 0.5, 1.0);
    }
  `
)
```

---

## Related Resources

- [Drei Shader Materials](https://github.com/pmndrs/drei)
- [Three.js Shaders Introduction](https://threejs.org/docs/#api/en/materials/ShaderMaterial)
- [Next: Performance Helpers](./02-performance-helpers.md)

---

## Pro Tips

1. Use `#include <noise>` for built-in noise functions
2. Always use `varying` for vertex → fragment communication
3. Pre-compile shaders with Preload component
4. Test on low-end devices (mobile)
5. Minimize branching (if/else) in fragment shaders
