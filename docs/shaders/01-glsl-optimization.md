# Shaders: GLSL Optimization

Write performant shaders for maximum FPS.

## Critical Rule: Minimize Branches

Branching (if/else) in fragment shaders is slow:

```glsl
// ❌ SLOW - Branch every pixel
float value;
if (uv.x > 0.5) {
  value = sin(uv.y * 10.0);
} else {
  value = cos(uv.y * 10.0);
}

// ✅ FAST - Use step() to avoid branch
float condition = step(0.5, uv.x);
float value = mix(
  cos(uv.y * 10.0),  // false case
  sin(uv.y * 10.0),  // true case
  condition
);
```

## Precision Qualifiers

Optimize precision for your target:

```glsl
// Mobile (lower precision = faster)
mediump float value = 0.5;
lowp vec3 color = vec3(0.1, 0.2, 0.3);

// Desktop (can afford higher precision)
highp float value = 0.5;
highp vec3 color = vec3(0.1, 0.2, 0.3);

// Default (undefined, let GPU decide)
float value = 0.5;
```

## Common Optimizations

```glsl
// ❌ SLOW - Many texture lookups
float value = texture(sampler, uv1).r
            + texture(sampler, uv2).g
            + texture(sampler, uv3).b;

// ✅ FAST - Single texture, swizzle
vec4 data = texture(sampler, uv);
float value = data.r + data.g + data.b;

// ❌ SLOW - Unrolled loop
float sum = texture(sampler, uv + offset1).r
          + texture(sampler, uv + offset2).r
          + texture(sampler, uv + offset3).r;

// ✅ FAST - Rolled loop
float sum = 0.0;
for (int i = 0; i < 3; i++) {
  sum += texture(sampler, uv + offsets[i]).r;
}
```

## Performance Tips

1. **Avoid expensive functions in loops**
   - `sin()`, `cos()`, `sqrt()` are slow
   - Pre-compute if possible

2. **Minimize texture lookups**
   - Each lookup is ~10x slower than arithmetic
   - Pack data into single texture when possible

3. **Use varying instead of uniform**
   - Varying: pre-computed on vertex shader
   - Uniform: recomputed per fragment

4. **Avoid dynamic loops**
   - Loop count should be constant
   - GPU can't parallelize dynamic loops

---

## Related Resources

- [Three.js Shader Reference](https://threejs.org/docs/#api/en/materials/ShaderMaterial)
- [GLSL Specification](https://www.khronos.org/opengl/wiki/OpenGL_Shading_Language)
- [Next: TSL (Three.js Shading Language)](./02-tsl-introduction.md)
