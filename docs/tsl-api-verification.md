# TSL API Verification Results

**Date**: 2026-01-07
**Three.js Version**: 0.175.0

## Summary

✅ **All required TSL APIs are available**. No polyfills needed.

---

## Required APIs for TSL Migration

### ✅ Polar Coordinates (StylizedSun rays)

- **`atan2`**: ✅ Available
- **`mod`**: ✅ Available (for radial repeat pattern)
- **`abs`**: ✅ Available
- **`length`**: ✅ Available (confirmed from existing usage)

**Impact**: StylizedSun TSL implementation can proceed as planned without polyfills.

---

### ✅ Instancing (AmbientDust particles)

- **`instancedBufferAttribute`**: ✅ Available
- **`instancedDynamicBufferAttribute`**: ✅ Available (bonus)
- **`instance`**: ✅ Available
- **`instanceIndex`**: ✅ Available
- **`instancedMesh`**: ✅ Available

**Impact**: AmbientDust TSL implementation can access per-particle opacity and sparkle phase without issues.

---

### ✅ Other Math Functions

Confirmed available:
- `max`, `min` - Comparison functions
- `abs` - Absolute value
- `modInt` - Integer modulo (bonus)

---

## Implementation Notes

1. **`atan2(y, x)`** signature matches standard GLSL
2. **`mod(x, y)`** returns `x - y * floor(x/y)` (GLSL-style modulo)
3. **`instancedBufferAttribute(name)`** accesses per-instance data from InstancedMesh

---

## Updated Plan

**Original Risk**: "⚠️ Blocker: Verify `atan2` exists in TSL (may need polyfill)"
**Resolution**: ✅ No blocker. `atan2` exists in Three.js 0.175.0.

**Original Risk**: "⚠️ Blocker: Research `instancedBufferAttribute` in TSL docs"
**Resolution**: ✅ No blocker. `instancedBufferAttribute` exists and matches expected API.

---

## Timeline Impact

**Effort Reduction**:
- `coordinates.ts` utility: 4-6 hours → **2-3 hours** (no polyfill research)
- `instancing.ts` utility: 2-3 hours → **1-2 hours** (straightforward wrapper)

**Total time saved**: ~3-4 hours
