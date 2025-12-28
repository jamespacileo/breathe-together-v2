# Adaptive Quality System

How breathe-together-v2 adjusts quality based on device performance.

## System Overview

The performance monitor watches FPS and adjusts particle count:

```
Monitor FPS
    ↓
FPS > 60? → Quality = high (300 particles)
FPS 40-60? → Quality = medium (200 particles)
FPS < 40? → Quality = low (100 particles)
```

## Key Components

### 1. Performance Monitor

Uses R3F's performance monitor:

```typescript
<PerformanceMonitor
  onIncline={() => upgradeQuality()}
  onDecline={() => downgradeQuality()}
  bounceVolume={0.5}
  flipflops={10}
>
  <YourScene />
</PerformanceMonitor>
```

### 2. Quality Presets

Defined in `src/constants.ts`:

```typescript
const QUALITY_LEVELS = {
  low: { particleCount: 100, dpr: 0.5 },
  medium: { particleCount: 200, dpr: 0.75 },
  high: { particleCount: 300, dpr: 1.0 }
}
```

### 3. Particle Activation

Pre-spawn 300 particles, selectively activate:

```typescript
// All 300 spawned but only some active
const particles = world.query(Particle, Active)

// When quality changes, add/remove Active trait
if (newQuality === 'low') {
  particlesTo.forEach((p) => p.remove(Active))
}
```

## Hysteresis

Prevents flickering when FPS oscillates:

```
If upgrading: wait 3 seconds at high FPS
If downgrading: wait 3 seconds at low FPS

This prevents "thrashing" where quality
toggles every frame due to temporary FPS spike
```

## Profiling the System

Particle count impact:

| Count | CPU | GPU | Result |
|-------|-----|-----|--------|
| 100 | 2ms | 1ms | 60+ FPS ✓ |
| 200 | 4ms | 2ms | 50-60 FPS ⚠ |
| 300 | 8ms | 5ms | 40-50 FPS ✗ |

## Related Resources

- [R3F PerformanceMonitor](https://drei.pmnd.rs/)
- [Previous: System Pipeline](./01-system-pipeline.md)
- [Next: Particle Physics](./03-particle-physics.md)
