# Shader Architecture Review

**Date:** January 2026
**Three.js Version:** 0.175.0
**TSL Status:** Experimental → Production-ready transition

## Executive Summary

This review analyzes the current shader architecture and recommends a phased migration strategy to Three.js Shading Language (TSL) for future-proofing and improved maintainability.

## Current State

### Shader Inventory

| Component | Type | Location | Lines | Status |
|-----------|------|----------|-------|--------|
| FrostedGlassMaterial | GLSL | `particle/FrostedGlassMaterial.tsx` | ~80 | Production |
| RefractionPipeline | GLSL (4 passes) | `particle/RefractionPipeline.tsx` | ~270 | Production |
| EarthGlobe | GLSL (3 shaders) | `earthGlobe/index.tsx` | ~150 | Production |
| BackgroundGradient | GLSL | `environment/BackgroundGradient.tsx` | ~100 | Production |
| SubtleLightRays | GLSL | `environment/SubtleLightRays.tsx` | ~35 | Production |
| AmbientDust | GLSL | `environment/AmbientDust.tsx` | ~50 | Production |
| FrostedGlassMaterialTSL | TSL | `particle/FrostedGlassMaterialTSL.tsx` | ~280 | Experimental |
| GlobeMaterialTSL | TSL | `earthGlobe/GlobeMaterialTSL.tsx` | ~280 | Experimental |

### Architecture Patterns Identified

**1. Duplicated Patterns (Code Smell)**
- Fresnel calculation appears in 6+ shaders with slight variations
- Breathing luminosity modulation duplicated in every animated shader
- View direction calculation repeated everywhere

**2. Inline GLSL Strings (Maintainability Issue)**
- All shaders are template strings in .tsx files
- No syntax highlighting or GLSL validation
- Difficult to share code between shaders

**3. Manual Uniform Management**
- Each shader manually creates and updates uniforms
- No type safety for uniform values
- Boilerplate disposal code in every component

**4. Renderer Lock-in (Future Risk)**
- GLSL shaders only work with WebGL renderer
- No path to WebGPU without rewriting shaders

## TSL Migration Benefits

Based on [Three.js TSL documentation](https://github.com/mrdoob/three.js/wiki/Three.js-Shading-Language) and [TSL Roadmap](https://github.com/mrdoob/three.js/issues/30849):

| Benefit | Impact |
|---------|--------|
| **Renderer Agnostic** | Same code compiles to WebGL2 (GLSL) and WebGPU (WGSL) |
| **Node Composition** | Reusable shader logic without string manipulation |
| **Type Safety** | TypeScript integration for uniform types |
| **Future-Proof** | Official Three.js direction per [Mr.doob's talks](https://gitnation.com/contents/embracing-webgpu-and-webxr-with-threejs) |
| **Extends Materials** | Add effects to MeshStandardMaterial without replacing lighting |

### Current TSL Status (January 2026)

From [WebGPU production readiness research](https://www.webgpuexperts.com/best-webgpu-updates-may-2025/):
- WebGPU supported in Chrome, Edge, Firefox, Safari (all major browsers)
- Three.js WebGPU renderer approaching production-ready
- TSL API stabilizing (r171/r172 had function renames, now stable)

## Recommended Architecture

### 1. Shared TSL Nodes (`src/lib/tsl/`)

Create composable shader functions:

```typescript
// src/lib/tsl/fresnel.ts
export function createFresnelNode(power: number = 3.0) {
  const viewDir = normalize(sub(cameraPosition, positionWorld));
  return pow(
    sub(float(1.0), tslMax(dot(normalView, viewDir), float(0.0))),
    float(power)
  );
}

// src/lib/tsl/breathing.ts
export function createBreathingNode(breathPhase: UniformNode, intensity: number = 0.12) {
  return add(float(1.0), mul(breathPhase, float(intensity)));
}
```

### 2. Migration Priority (Effort vs Impact)

| Priority | Shader | Complexity | Impact | Reason |
|----------|--------|------------|--------|--------|
| 1 | BackgroundGradient | Low | High | Standalone, no dependencies |
| 2 | AmbientDust | Low | Medium | Simple point shader |
| 3 | SubtleLightRays | Low | Medium | Simple effect |
| 4 | FrostedGlassMaterial | Medium | High | Core visual, already has TSL version |
| 5 | GlobeMaterial | Medium | High | Core visual, already has TSL version |
| 6 | RefractionPipeline | High | High | Complex multi-pass, do last |

### 3. Feature Flag System

```typescript
// src/config/rendering.ts
export const RENDERING_CONFIG = {
  // Enable TSL materials (compiles to GLSL on WebGL, WGSL on WebGPU)
  useTSL: true,

  // Force WebGPU renderer (requires browser support)
  forceWebGPU: false,

  // Enable experimental features
  experimentalFeatures: {
    tslRefractionPipeline: false,
  }
};
```

### 4. Gradual Migration Pattern

```typescript
// Material factory that returns TSL or GLSL based on config
export function createFrostedGlassMaterial(options: MaterialOptions) {
  if (RENDERING_CONFIG.useTSL) {
    return createFrostedGlassTSL(options);
  }
  return createFrostedGlassGLSL(options);
}
```

## Implementation Plan

### Phase 1: Foundation (This PR)
- [ ] Create `src/lib/tsl/` directory with shared nodes
- [ ] Implement `fresnelNode`, `breathingNode`, `viewDirectionNode`
- [ ] Migrate BackgroundGradient to TSL
- [ ] Add rendering configuration with feature flags

### Phase 2: Core Materials
- [ ] Update FrostedGlassMaterialTSL to use shared nodes
- [ ] Update GlobeMaterialTSL to use shared nodes
- [ ] Add mist layer to GlobeMaterialTSL (was skipped due to noise issues)

### Phase 3: Environment Effects
- [ ] Migrate SubtleLightRays to TSL
- [ ] Migrate AmbientDust to TSL
- [ ] Create TSL-based lighting preset system

### Phase 4: Advanced Effects (Future)
- [ ] Investigate TSL-based refraction pipeline
- [ ] WebGPU-specific optimizations (compute shaders for particles)

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| TSL API changes | Low (stable since r172) | Pin Three.js version, follow migration guide |
| WebGPU browser issues | Medium | Feature flag to fallback to WebGL |
| Performance regression | Low | Benchmark before/after, keep GLSL fallback |
| Learning curve | Medium | Document patterns, shared node library |

## Validation Criteria

Before marking TSL materials as production-ready:

1. **Visual Parity**: A/B comparison shows identical output to GLSL versions
2. **Performance**: Frame time within 10% of GLSL baseline
3. **Browser Compatibility**: Works on Chrome, Firefox, Safari, Edge
4. **Mobile Support**: Functions correctly on iOS Safari, Android Chrome
5. **Memory**: No increased GPU memory usage

## Sources

- [Three.js Shading Language Wiki](https://github.com/mrdoob/three.js/wiki/Three.js-Shading-Language)
- [TSL Migration Guide](https://github.com/mrdoob/three.js/wiki/Migration-Guide)
- [TSL Tutorials by sbcode.net](https://sbcode.net/tsl/)
- [Field Guide to TSL and WebGPU](https://blog.maximeheckel.com/posts/field-guide-to-tsl-and-webgpu/)
- [WebGPU Updates May 2025](https://www.webgpuexperts.com/best-webgpu-updates-may-2025/)
- [Mr.doob on WebGPU and WebXR](https://gitnation.com/contents/embracing-webgpu-and-webxr-with-threejs)
