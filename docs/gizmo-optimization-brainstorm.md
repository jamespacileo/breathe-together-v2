# Shape Gizmos Optimization Brainstorm

## Performance Analysis (from r3f-perf)

Based on the screenshot with gizmos enabled:
- **Draw Calls**: ~242 (target: <50 for mobile)
- **Triangles**: ~68,526
- **Frame Time**: ~5.1ms

## Current Implementation Status

### Already Optimized (✅)
1. **InstancedCentroids** - Single draw call for all shard centroids
2. **InstancedWireframes** - Single draw call for all wireframe overlays
3. **BatchedConnectionLines** - Single LineSegments draw call for all connections
4. **BreathingBoundingSphere** - Reuses single mesh with animated material

### Contributing to High Draw Calls (⚠️)
1. **Country gizmos** - Individual meshes per country (~10-15 DCs)
2. **AxesGizmo** - 3 Line components + 3 cone meshes + 3 Html elements (~9 DCs)
3. **BoundingSphere wireframes** - Multiple spheres for bounds visualization
4. **Html labels** - Each requires DOM overlay (not GPU but impacts perf)

---

## Optimization Ideas

### Tier 1: High Impact / Low Effort

#### 1. Instance Country Gizmos
**Current**: Each country = 2 meshes (sphere + ring) = 2 draw calls × ~15 countries = 30 DCs
**Solution**: Use InstancedMesh for country markers
```typescript
// Single InstancedMesh for all country spheres
const countryInstances = new THREE.InstancedMesh(sphereGeom, material, countryCount);
```
**Estimated Reduction**: 28 draw calls → 2 draw calls

#### 2. Merge Axis Lines into Single LineSegments
**Current**: 3 separate Line components = 3 draw calls
**Solution**: Single BufferGeometry with all 6 vertices
```typescript
const positions = new Float32Array([
  0,0,0, length,0,0,  // X axis
  0,0,0, 0,length,0,  // Y axis
  0,0,0, 0,0,length   // Z axis
]);
const colors = new Float32Array([...red, ...red, ...green, ...green, ...blue, ...blue]);
```
**Estimated Reduction**: 3 draw calls → 1 draw call

#### 3. Merge Axis Cones into InstancedMesh
**Current**: 3 separate cone meshes = 3 draw calls
**Solution**: Single InstancedMesh with 3 instances
**Estimated Reduction**: 3 draw calls → 1 draw call

### Tier 2: Medium Impact / Medium Effort

#### 4. LOD for Bounding Spheres
**Current**: 48-segment spheres regardless of distance
**Solution**: Use lower segment count when camera is far
```typescript
const segments = cameraDistance > 10 ? 16 : cameraDistance > 5 ? 32 : 48;
```
**Impact**: Reduces triangle count, not draw calls

#### 5. Frustum Culling for Gizmos
**Current**: All gizmos render even if off-screen
**Solution**: Enable frustum culling on gizmo groups
```typescript
<group frustumCulled={true}>
```
**Impact**: Reduces draw calls when gizmos are off-screen

#### 6. Conditional Rendering by Distance
**Current**: All detail levels visible at all times
**Solution**: Hide fine details (labels, connections) when zoomed out
```typescript
const showDetails = cameraDistance < 15;
```

### Tier 3: Low Impact / Higher Effort

#### 7. Geometry Atlasing for Different Gizmo Types
**Current**: Separate geometries for spheres, rings, cones
**Solution**: Combine into single geometry with submeshes
**Complexity**: High - requires manual UV/vertex management

#### 8. WebGL2 Multi-Draw Extensions
**Current**: Standard draw calls
**Solution**: Use `WEBGL_multi_draw` for batching
**Browser Support**: Limited, not recommended for production

#### 9. GPU-based Gizmo Rendering
**Current**: CPU-driven matrix updates
**Solution**: Move gizmo positions to GPU via uniforms/textures
**Complexity**: Very high - requires custom shaders

---

## Quick Wins for Labels

### Replace drei Html with Sprite Text
**Current**: Html overlays (DOM elements)
**Problem**: Not GPU-rendered, causes reflows
**Solution**: Use troika-three-text or drei Text3D
```typescript
import { Text } from '@react-three/drei';
<Text fontSize={0.1} color={color}>{label}</Text>
```
**Impact**: Moves text to GPU, eliminates DOM overhead

### Disable Labels by Default
**Current**: Labels visible (showLabels prop)
**Recommendation**: Default `showLabels={false}` in production
Labels are useful for debugging but expensive for runtime

---

## Draw Call Budget Analysis

### Target: <50 draw calls (mobile-friendly)

| Component | Current DCs | Optimized DCs |
|-----------|-------------|---------------|
| Main scene | ~17 | ~17 |
| Globe bounds (2 spheres) | 2 | 2 |
| Swarm bounds (3 spheres) | 3 | 3 |
| Current orbit sphere | 1 | 1 |
| Country gizmos | ~30 | 2 |
| XYZ axes (lines) | 3 | 1 |
| XYZ axes (cones) | 3 | 1 |
| Shard centroids | 1 | 1 |
| Shard wireframes | 1 | 1 |
| Connection lines | 1 | 1 |
| **Total** | **~62** | **~30** |

With optimizations, gizmos add only ~13 draw calls to the base scene.

---

## Implementation Priority

1. **Instance country gizmos** - Highest impact, straightforward
2. **Merge axis lines** - Simple geometry change
3. **Merge axis cones** - InstancedMesh pattern already exists
4. **Replace Html labels with Text sprites** - Optional but good for perf
5. **Add distance-based LOD** - Nice to have for polish

---

## Testing Recommendations

### Regression Tests
```typescript
describe('Gizmo draw call budget', () => {
  it('should not exceed 15 draw calls with all gizmos enabled', () => {
    // Build scene with all gizmo types
    // Assert draw calls < 15 for gizmo components only
  });
});
```

### Performance Gates
```typescript
it('should render gizmos under 2ms frame budget', () => {
  // Measure useFrame callback time
  // Assert < 2ms average
});
```

---

## References

- [Three.js Instancing](https://threejs.org/docs/#api/en/objects/InstancedMesh)
- [R3F Scaling Performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance)
- [Draw Calls: The Silent Killer](https://threejsroadmap.com/blog/draw-calls-the-silent-killer)
- [WebGL Best Practices (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)
- [Building Efficient Three.js Scenes](https://tympanus.net/codrops/2025/02/11/building-efficient-three-js-scenes-optimize-performance-while-maintaining-quality/)
