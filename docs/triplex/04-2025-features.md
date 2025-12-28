# Triplex: 2025 Features

Explore cutting-edge capabilities in Triplex 2025.

## New Features Overview

### 1. Post-Processing Preview

Render post-processing effects visible in Triplex editor:

```typescript
<Canvas>
  <YourScene />

  <EffectComposer>
    <Bloom intensity={1.5} />
    <MotionBlur velocity={[0.5, 0.5]} />
    <SSAO radius={10} />
  </EffectComposer>
</Canvas>

// In Triplex: Post-processing shows in real-time preview!
```

### 2. Transform Controls Improvements

Transform controls now sync through props:

```typescript
// Before: Manual position/rotation updates
// After: Drag in Triplex → props update → code saves

function Entity({ position = [0, 0, 0] }) {
  return <mesh position={position}><boxGeometry /></mesh>
}

// In Triplex:
// 1. Drag mesh
// 2. position prop updates
// 3. Code reflects change
```

### 3. WebXR Preview

View components directly in VR/AR headsets:

```typescript
<Canvas>
  <XRButton />  {/* Automatically detected by Triplex */}
  <YourScene />
</Canvas>

// Triplex shows "Open in VR" button if headset available
```

### 4. Koota Integration APIs

```typescript
// Named systems with debugging
const mySystem = createSystem('MySystem', (world) => { })

// Injected systems with props control
injectSystems(world, [
  { name: 'Physics', enabled: true, system: physicsSystem }
])
```

### 5. Enhanced Profiling

View detailed performance metrics:

```
Triplex Inspector shows:
- System execution time (0.5ms, 1.2ms, etc)
- FPS graph over time
- Memory usage
- Draw calls
- Geometry count
```

---

## Migration from 2024 to 2025

### Breaking Changes

None! All 2024 code works in 2025.

### New Capabilities

```typescript
// 2024 (Still works)
function Component() {
  useFrame(() => updateStuff())
}

// 2025 (New APIs)
const system = createSystem('Update', (world) => updateStuff())
injectSystems(world, [{ name: 'Update', system }])
```

---

## Use Cases for New Features

### Post-Processing Iteration

```
Old workflow:
1. Edit post-processing code
2. Save and rebuild
3. View result
4. Repeat

New workflow:
1. Edit post-processing code
2. See result instantly in Triplex
3. Adjust sliders to tune
4. Done
```

### VR/AR Testing

```
Old workflow:
1. Build for production
2. Deploy to server
3. Open on headset
4. See result
5. Back to step 1

New workflow:
1. Edit in Triplex
2. Click "Open in VR"
3. See result in headset
4. Adjust props
5. Result updates immediately
```

### System Debugging

```
Old workflow:
1. Add console.log
2. Rebuild
3. Check logs
4. Remove console.log
5. Rebuild again

New workflow:
1. Use createSystem() with name
2. Set breakpoint in Triplex
3. Inspect state directly
4. No code changes needed
```

---

## Performance Features

### Metric Collection

Triplex 2025 collects metrics automatically:

```typescript
// No changes needed to your code
// Triplex tracks:
// - Per-system execution time
// - Total frame time
// - Memory allocations
// - Garbage collection
```

### Bottleneck Identification

```
Triplex Inspector shows:
System A: 15ms ❌ (Too slow!)
System B: 2ms  ✓
System C: 5ms  ✓

→ Click System A to see its code
→ Suggests optimizations
```

---

## Best Practices for 2025

1. **Use createSystem()** for all Koota systems
   - Named systems are easier to debug
   - Triplex can profile each system

2. **Expose props** for everything that might change
   - Colors, speeds, counts, thresholds
   - Makes tuning in Triplex easier

3. **Test in VR early** if targeting XR
   - Triplex WebXR support is now integrated
   - Catch UX issues before building

4. **Profile every component** before deploying
   - Use Triplex metrics to identify slow systems
   - Optimize before user complaints

5. **Keep systems focused**
   - One system = one job
   - Makes profiling and debugging clearer

---

## Feature Comparison

| Feature | 2024 | 2025 |
|---------|------|------|
| Visual editing | ✓ | ✓ |
| Prop control | ✓ | ✓ |
| Hot reload | ✓ | ✓ |
| Post-processing preview | ✗ | ✓ |
| System naming | ✗ | ✓ |
| System injection | ✗ | ✓ |
| WebXR preview | ✗ | ✓ |
| Performance profiling | ✗ | ✓ |
| Transform sync | Partial | ✓ |

---

## Roadmap

Potential future additions:

- Timeline editor for animations
- Collaborative editing (real-time sync)
- AI-assisted layout suggestions
- Mobile device preview sync
- Advanced constraint systems

---

## Related Resources

- [Triplex Blog - 2025 Updates](https://triplex.dev/blog/2025-updates)
- [Triplex GitHub Discussions](https://github.com/pmndrs/triplex/discussions)
- [Previous: Koota Integration](./03-koota-integration.md)
- [Next: ECS Architecture](../ecs-architecture/01-design-principles.md)

---

## Community

Share your Triplex workflows:

- [Triplex Discord](https://discord.gg/poimandres)
- [GitHub Discussions](https://github.com/pmndrs/triplex/discussions)
- [Twitter/X Examples](https://twitter.com/search?q=triplex%202025)

