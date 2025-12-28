# Shaders: Custom Shader Patterns from breathe-together-v2

Learn from the shaders used in your project.

## Fresnel Shader (Edge Glow)

Used for the breathing sphere:

```glsl
// Vertex Shader
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vPosition = vec3(modelViewMatrix * vec4(position, 1.0));
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

// Fragment Shader - Fresnel effect
uniform vec3 color;
uniform float power;

varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  // Fresnel: edges are bright, center is dark
  vec3 viewDir = normalize(-vPosition);
  float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), power);

  gl_FragColor = vec4(color * fresnel, fresnel);
}
```

## Noise Displacement

Add Simplex noise to vertex positions:

```glsl
// Vertex Shader with noise
#include <noise>

uniform float time;
uniform float strength;

void main() {
  vec3 displaced = position;

  // Use Simplex noise to displace
  float noise = snoise(vec3(position * 2.0 + time * 0.5));
  displaced += normal * noise * strength;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
```

## Chromatic Aberration

Separate RGB channels for rainbow effect:

```glsl
// Fragment Shader
uniform sampler2D tDiffuse;
uniform vec2 aberration;

varying vec2 vUv;

void main() {
  float r = texture(tDiffuse, vUv + aberration).r;
  float g = texture(tDiffuse, vUv).g;
  float b = texture(tDiffuse, vUv - aberration).b;

  gl_FragColor = vec4(r, g, b, 1.0);
}
```

## Performance Notes

**Project-Specific Optimization**: breathe-together-v2's shaders are optimized for:
- 60 FPS on desktop
- Smooth animation without stuttering
- Per-particle updates without recompilation

---

## Shader Tuning Guide

Key uniforms to adjust:

```glsl
// Fresnel (breathing sphere)
uniform float power;        // Higher = sharper edge (2-5 recommended)
uniform float intensity;    // Glow brightness (0.5-2.0)

// Noise displacement
uniform float strength;     // Displacement amount (0.1-1.0)
uniform float speed;        // Animation speed (0.1-2.0)

// Chromatic aberration
uniform vec2 aberration;   // RGB shift (0.01-0.1)
```

---

## Related Resources

- [Three.js Shader Examples](https://threejs.org/examples/#webgl_shader)
- [Drei Shader Materials](https://github.com/pmndrs/drei)
- [Previous: TSL Introduction](./02-tsl-introduction.md)
- [Project Custom Shaders](../project-specific/)
