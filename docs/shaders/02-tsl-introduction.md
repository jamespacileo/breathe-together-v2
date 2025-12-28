# Shaders: TSL (Three.js Shading Language) - 2025

Introduction to TSL, the modern shader node system for Three.js.

## What is TSL?

TSL is a JavaScript-based node graph system for building shaders without writing raw GLSL.

```javascript
// ❌ OLD (Raw GLSL)
const fragmentShader = `
  uniform float time;
  void main() {
    gl_FragColor = vec4(sin(time), cos(time), 1.0, 1.0);
  }
`

// ✅ NEW (TSL)
import * as THREE from 'three'

const position = new THREE.PositionNode()
const time = new THREE.FloatNode(0)

const color = new THREE.FunctionNode(`
  sin(time), cos(time), 1.0, 1.0
`, [time])

const fragmentShader = new THREE.ShaderNode({ color })
```

## Benefits of TSL

1. **No GLSL syntax errors** - Catch issues at compile time
2. **Automatic GLSL/WGSL generation** - Target multiple APIs
3. **Reusable node graphs** - Share shader logic
4. **Compiler optimizations** - Dead code elimination, constant folding
5. **Type safety** - Catch mismatches early

## Basic TSL Example

```javascript
import * as THREE from 'three'
import { color, mul, add } from 'three/tsl'

// Define shader with TSL nodes
const shader = new THREE.ShaderNode({
  fragment: add(
    color(new THREE.Color(0xff0000)),
    mul(
      color(new THREE.Color(0x00ff00)),
      0.5
    )
  )
})

// Use with material
const material = new THREE.MeshStandardMaterial({
  onBeforeCompile(shader) {
    shader.fragmentShader = shader.fragmentShader
  }
})
```

## TSL vs Drei shaderMaterial

```typescript
// Drei approach (still valid in 2025)
const material = shaderMaterial(
  { time: 0 },
  vertexShader,
  fragmentShader
)

// TSL approach (new in 2025)
const material = new THREE.ShaderNodeMaterial({
  nodes: {
    color: time.mul(0.5),
  }
})
```

---

## Future Direction

As of 2025, TSL is experimental. Expect:
- More node types
- Better debugging tools
- IDE integrations
- Official documentation

For production, Drei's `shaderMaterial()` is still recommended.

---

## Related Resources

- [Three.js TSL Discussion](https://github.com/mrdoob/three.js/discussions)
- [Previous: GLSL Optimization](./01-glsl-optimization.md)
- [Next: Custom Shaders](./03-custom-shaders.md)
