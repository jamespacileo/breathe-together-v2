# Shader Code Review

**Date:** January 2026
**Reviewer:** Claude Code
**Scope:** All shader code in `src/entities/` and `src/lib/tsl/`

---

## Executive Summary

The shader architecture is well-organized with a clear migration path from GLSL to TSL. However, there are **significant opportunities for pruning, deduplication, and simplification**. Key findings:

| Category | Issues Found | Severity |
|----------|-------------|----------|
| **Duplication** | 8 instances | Medium |
| **Dead/Redundant Code** | 4 files | Medium |
| **Library Migration Opportunities** | 5 shaders | Low |
| **Antipatterns** | 3 issues | Low |
| **Hidden Bugs** | 1 potential issue | Low |

---

## 1. Duplication Issues

### 1.1 Fresnel Calculation (CRITICAL)

**Problem:** The exact same fresnel calculation appears in **7 different locations** with slight variations:

| File | Fresnel Code | Power |
|------|-------------|-------|
| `FrostedGlassMaterial.tsx:56` | `pow(1.0 - max(dot(vNormal, viewDir), 0.0), 2.5)` | 2.5 |
| `RefractionPipeline.tsx:144` | `pow(1.0 - clamp(dot(normal, -eyeVector), 0.0, 1.0), 2.5)` | 2.5 |
| `earthGlobe/index.tsx:58` | `pow(1.0 - max(dot(vNormal, viewDir), 0.0), 4.0)` | 4.0 |
| `earthGlobe/index.tsx:100` | `pow(1.0 - abs(dot(vNormal, viewDir)), 3.5)` | 3.5 |
| `earthGlobe/index.tsx:150` | `pow(1.0 - abs(dot(vNormal, viewDir)), 1.5)` | 1.5 |
| `GeoMarkers.tsx:118` | `pow(1.0 - abs(dot(vNormal, viewDir)), uFresnelPower)` | 2.0 |
| `BackgroundGradient.tsx` (in RefractionPipeline duplicate) | Same as RefractionPipeline | - |

**Recommendation:** The TSL library (`src/lib/tsl/fresnel.ts`) already has `createFresnelNode()`. Migrate GLSL shaders to use shared GLSL snippets or accelerate TSL migration.

### 1.2 Simplex/Noise Functions (HIGH)

**Problem:** Simplex noise is implemented in multiple places:

| File | Implementation | Lines |
|------|---------------|-------|
| `BackgroundGradient.tsx:28-52` | `snoise()` simplex + `fbm()` | 24 lines |
| `earthGlobe/index.tsx:133-146` | `noise()` value noise | 13 lines |
| `src/lib/tsl/noise.ts` | TSL noise nodes | 157 lines |

**Key Issue:** `BackgroundGradient.tsx` has a **full simplex noise implementation** that's duplicated in `RefractionPipeline.tsx` (lines 170-197 are exact copies of the background gradient shader).

**Recommendation:**
1. Extract GLSL noise to `src/lib/glsl/noise.glsl` as importable snippets
2. Use the TSL noise library for new shaders
3. Remove duplicate bgFragmentShader from `RefractionPipeline.tsx`

### 1.3 Breathing Modulation (MEDIUM)

**Problem:** Breathing luminosity calculation is repeated with slight variations:

| File | Code | Intensity |
|------|------|-----------|
| `FrostedGlassMaterial.tsx:60` | `1.0 + breathPhase * 0.12` | 12% |
| `earthGlobe/index.tsx:62-63` | `1.0 + breathPhase * 0.06` | 6% |
| `earthGlobe/index.tsx:102` | `1.0 + breathPhase * 0.2` | 20% |
| `earthGlobe/index.tsx:157` | `0.6 + breathPhase * 0.4` | 40% |

**Recommendation:** Use `BREATHING_PRESETS` from `src/lib/tsl/breathing.ts` and create equivalent GLSL constants.

### 1.4 View Direction Calculation (MEDIUM)

**Problem:** `normalize(vViewPosition)` or equivalent appears in every shader.

**Recommendation:** Already solved in TSL (`src/lib/tsl/viewDirection.ts`). For GLSL, this is acceptable as it's a single line.

---

## 2. Dead/Redundant Code

### 2.1 Duplicate Background Shader in RefractionPipeline

**Location:** `RefractionPipeline.tsx:161-197`

**Issue:** Contains a complete copy of the background gradient shader, but the RefractionPipeline could just render the actual BackgroundGradient component in Pass 1 instead of duplicating the shader.

```typescript
// Current: Duplicated shader (lines 161-197)
const bgFragmentShader = `...` // 37 lines of duplicated code

// Better: Use the scene's actual background or simplify
```

**Recommendation:** Remove duplicate `bgVertexShader` and `bgFragmentShader` from RefractionPipeline. Either:
1. Render the actual scene background in Pass 1
2. Use a simpler solid color for the refraction base

### 2.2 TSL Version Alongside GLSL Versions

**Files with parallel implementations:**

| GLSL Version | TSL Version | Status |
|-------------|-------------|--------|
| `FrostedGlassMaterial.tsx` | `FrostedGlassMaterialTSL.tsx` | Both production |
| `earthGlobe/index.tsx` (shaders) | `GlobeMaterialTSL.tsx` | Both production |
| `BackgroundGradient.tsx` | `BackgroundGradientTSL.tsx` | Both production |

**Issue:** This doubles maintenance burden. The TSL versions are marked "experimental" but appear functionally complete.

**Recommendation:**
1. Add feature flag to switch between GLSL/TSL (partially done in `docs/shader-architecture-review.md`)
2. Set timeline to deprecate GLSL versions after TSL validation
3. Consider consolidating to TSL-only for simpler shaders (BackgroundGradient)

### 2.3 Unused EarthGlobeTransmission

**File:** `earthGlobe/EarthGlobeTransmission.tsx`

**Issue:** This is an alternative implementation using drei's `MeshTransmissionMaterial` but it's not clear if it's used anywhere. It duplicates atmosphere layers and animation logic from `earthGlobe/index.tsx`.

**Recommendation:** Either:
1. Mark as deprecated/experimental
2. Consolidate common code (ATMOSPHERE_LAYERS, animation logic) into shared module

---

## 3. Library Migration Opportunities

### 3.1 drei's Fresnel Shader

**Current:** Custom fresnel in every shader
**Alternative:** `@react-three/drei` exports `<Fresnel>` component and `MeshWobbleMaterial`

**Verdict:** Not recommended - custom fresnel allows breathing synchronization and precise control.

### 3.2 drei's MeshTransmissionMaterial

**Current:** Custom multi-pass refraction pipeline (270+ lines)
**Alternative:** `MeshTransmissionMaterial` with temporal reprojection

**Verdict:** Already explored in `EarthGlobeTransmission.tsx`. Keep custom pipeline for:
- InstancedMesh support (MeshTransmissionMaterial doesn't support it)
- Precise control over refraction behavior
- Lower overhead for many particles

### 3.3 drei's Sparkles, Stars

**Current:** Already using drei's `<Sparkles>` and `<Stars>` components

**Verdict:** Good - no changes needed.

### 3.4 postprocessing for DoF

**Current:** Custom DoF in RefractionPipeline (lines 209-276)
**Alternative:** `@react-three/postprocessing` DepthOfField effect

**Verdict:** Consider migration for:
- Better quality (bokeh shapes)
- GPU optimized
- Maintained by r3f community

**Caveat:** Would need to integrate with the multi-pass pipeline.

### 3.5 Background Color/Gradient

**Current:** Custom shader for animated gradient
**Alternative:** `<Environment>` with solid color or `<Sky>`

**Verdict:** Keep custom - animated clouds and paper texture noise not available in drei components.

---

## 4. Antipatterns

### 4.1 Runtime `require()` in TSL Files

**Locations:**
- `GlobeMaterialTSL.tsx:107` - `const { normalView } = require('three/tsl');`
- `GlobeMaterialTSL.tsx:246` - Same
- `src/lib/tsl/breathing.ts:145` - `const { uniform, float: tslFloat } = require('three/tsl');`

**Issue:** Mixing ESM imports with CommonJS `require()` can cause bundler issues and breaks tree-shaking.

**Recommendation:** Move all TSL imports to top of file with other imports. Use lazy evaluation patterns if needed:

```typescript
// Instead of:
const { normalView } = require('three/tsl');

// Use:
import { normalView } from 'three/tsl';
// Or dynamic import:
const module = await import('three/tsl');
```

### 4.2 Magic Numbers

**Locations:**
- `RefractionPipeline.tsx:101` - `const keyLightDir = normalize(vec3(0.5, 0.7, 0.4));`
- Many fresnel power values (2.5, 3.5, 4.0, etc.)
- Rotation speeds (0.0008 rad/frame in multiple files)

**Recommendation:** Extract to `src/constants.ts` or use the existing presets in `src/lib/tsl/`.

### 4.3 biome-ignore Comments Without Issue Tracking

**Issue:** Many `biome-ignore` comments for TSL type issues:

```typescript
// biome-ignore lint/suspicious/noExplicitAny: TSL uniform.value accepts number at runtime
(uniforms.uBreathPhase as any).value = phase;
```

This is repeated **15+ times** across TSL files.

**Recommendation:** Create a TypeScript declaration file to properly type TSL uniforms:

```typescript
// src/types/tsl.d.ts
declare module 'three/tsl' {
  interface UniformNode {
    value: number | THREE.Color | THREE.Vector2 | THREE.Vector3;
  }
}
```

---

## 5. Hidden Bugs / Gotchas

### 5.1 Potential Z-Fighting in BackgroundGradient

**Location:** `BackgroundGradient.tsx:19`

```glsl
gl_Position = vec4(position.xy, 0.9999, 1.0);
```

**Issue:** Using `0.9999` for z-position is very close to the far plane (`1.0`). This could cause z-fighting on some GPUs.

**Recommendation:** Use `0.999` or rely on `renderOrder` and `depthTest: false` which is already set.

### 5.2 Memory Leak in GeoMarkers HolographicMaterial

**Location:** `GeoMarkers.tsx:66-134`

**Issue:** `HolographicMaterial` creates a new `ShaderMaterial` in `useMemo` but there's no cleanup `useEffect` to dispose it.

**Current Code:**
```typescript
function HolographicMaterial({ baseColor, glowColor }) {
  const uniforms = useMemo(() => ({...}), []);
  // No useEffect cleanup!
  return <shaderMaterial ref={materialRef} ... />
}
```

**Recommendation:** Add disposal:
```typescript
const material = useMemo(() => new THREE.ShaderMaterial({...}), [...]);
useEffect(() => () => material.dispose(), [material]);
```

### 5.3 Stale Closure in AmbientDust

**Location:** `AmbientDust.tsx:169-186`

**Issue:** The animation loop accesses `initialPositions.current` which could be stale if `count` changes.

**Recommendation:** Already handled correctly via `useEffect` dependency, but worth noting for future changes.

---

## 6. Simplification Opportunities

### 6.1 Consolidate EarthGlobe Shaders

**Current:** 4 separate shaders in `earthGlobe/index.tsx`:
- `globeVertexShader` / `globeFragmentShader` (texture + fresnel)
- `glowVertexShader` / `glowFragmentShader` (additive fresnel)
- `mistVertexShader` / `mistFragmentShader` (animated noise)

**Recommendation:**
1. Glow and mist share the same vertex shader - consolidate to one
2. Consider using drei's `<Fresnel>` effect for the glow layer

### 6.2 Remove `time` Uniform from FrostedGlassMaterial

**Location:** `FrostedGlassMaterial.tsx:99`

```typescript
uniforms: {
  breathPhase: { value: 0 },
  time: { value: 0 },  // Never used in shader!
},
```

**Issue:** `time` uniform is declared but never used in the fragment shader.

**Recommendation:** Remove unused uniform.

### 6.3 Simplify SubtleLightRays

**Current:** 3 separate meshes with individual animation
**Alternative:** Single mesh with instancing

**Recommendation:** Low priority - current implementation is simple and performant.

---

## 7. Architecture Recommendations

### 7.1 Create Shared GLSL Library

Until full TSL migration, create:

```
src/lib/glsl/
├── fresnel.glsl      # Fresnel snippets
├── noise.glsl        # Simplex/value noise
├── breathing.glsl    # Breathing modulation
└── common.glsl       # View direction, etc.
```

Use with glslify or string concatenation.

### 7.2 Add Shader Hot-Reload Dev Mode

Currently, shader string changes require component remount. Consider:
- drei's `<ShaderMaterial key={shaderCode}>` pattern
- uniforms.dat integration for live tuning

### 7.3 Complete TSL Migration (Priority Order)

1. **BackgroundGradient** - Simplest, TSL version exists but missing clouds
2. **SubtleLightRays** - Simple gradient shader
3. **AmbientDust** - Simple point shader
4. **FrostedGlassMaterial** - Core visual, TSL version exists
5. **EarthGlobe** - Core visual, TSL version exists
6. **RefractionPipeline** - Complex, do last

---

## 8. Summary: Recommended Actions

### Immediate (Low Effort, High Impact)

1. **Remove duplicate bgFragmentShader from RefractionPipeline** - ~40 lines
2. **Remove unused `time` uniform from FrostedGlassMaterial** - 1 line
3. **Add disposal to HolographicMaterial in GeoMarkers** - 3 lines
4. **Extract magic numbers to constants** - ~10 locations

### Short-term (Medium Effort)

1. **Create shared GLSL snippets** for fresnel/noise/breathing
2. **Add TSL type declarations** to eliminate biome-ignore comments
3. **Fix runtime require() calls** in TSL files

### Long-term

1. **Complete TSL migration** following the priority order above
2. **Evaluate postprocessing library** for DoF
3. **Deprecate GLSL versions** after TSL validation

---

## Appendix: File Summary

| File | Lines | Type | Status | Notes |
|------|-------|------|--------|-------|
| `particle/RefractionPipeline.tsx` | 664 | GLSL | Production | Complex multi-pass, keep |
| `particle/FrostedGlassMaterial.tsx` | 107 | GLSL | Production | Has TSL equivalent |
| `particle/FrostedGlassMaterialTSL.tsx` | 275 | TSL | Experimental | Preferred |
| `earthGlobe/index.tsx` | 426 | GLSL | Production | Has TSL equivalent |
| `earthGlobe/GlobeMaterialTSL.tsx` | 292 | TSL | Experimental | Preferred |
| `earthGlobe/EarthGlobeTransmission.tsx` | 287 | drei | Alternative | Consider deprecating |
| `earthGlobe/GeoMarkers.tsx` | 301 | GLSL | Production | Fix memory leak |
| `environment/BackgroundGradient.tsx` | 156 | GLSL | Production | Has TSL equivalent |
| `environment/BackgroundGradientTSL.tsx` | 132 | TSL | Experimental | Missing clouds |
| `environment/SubtleLightRays.tsx` | 184 | GLSL | Production | Simple, keep |
| `environment/AmbientDust.tsx` | 207 | GLSL | Production | Simple, keep |
| `environment/ReflectiveFloor.tsx` | 88 | drei | Production | Uses library |
| `lib/tsl/*.ts` | ~550 | TSL | Production | Well-structured |

**Total shader-related code:** ~3,669 lines
**Potential reduction after consolidation:** ~400-600 lines (~15%)
