# Particle Physics System

Understanding the force-based particle animation in breathe-together-v2.

## 5-Stage Force Calculation

Each particle experiences forces in this order:

```
1. Spring Force
   Particles orbit around a center
   Force toward orbit: F = -k * (distance - radius)

2. Repulsion
   Particles repel each other to avoid clustering
   Force: F = repulsion / distance²

3. Attraction to Cursor
   Particles attracted to where user points
   Force: F = attraction * direction

4. Damping
   Friction reduces velocity over time
   New velocity: v *= 0.98

5. Bounds Checking
   Particles clamped to visible area
   Prevents escape
```

## Key Constants

```typescript
const SPRING_STIFFNESS = 0.15    // How strongly orbit
const REPULSION_STRENGTH = 0.5   // Particle avoidance
const DAMPING = 0.98             // Velocity friction
const ATTRACTION = 2.0           // Pull to cursor
const ORBIT_RADIUS = 5.0         // Circle size
```

## Performance Optimization

### Distance-Squared Comparison

```typescript
// ❌ SLOW - Square root calculation
if (Math.sqrt(dx*dx + dy*dy + dz*dz) > THRESHOLD) { }

// ✅ FAST - Avoid sqrt
if (dx*dx + dy*dy + dz*dz > THRESHOLD_SQ) { }
```

### Force Threshold

```typescript
// Skip negligible forces to save CPU
const forceMagnitude = force.length()
if (forceMagnitude < 0.001) return  // Skip tiny forces
```

### Pooled Temporary Objects

```typescript
const tempVec = new THREE.Vector3()
const tempForce = new THREE.Vector3()

// Reuse in loop instead of creating new objects
for (let i = 0; i < particles.length; i++) {
  tempForce.set(0, 0, 0)
  calculateForces(particles[i], tempForce)
}
```

## Algorithm Complexity

Per frame:
- Particles: N = 300
- Pairwise repulsion: O(N²) = 90,000 distance checks
- Optimized with distance threshold: ~O(N) = 300 relevant checks

---

## Tuning Guide

Adjust constants in `src/entities/particle/systems.tsx`:

```
SPRING_STIFFNESS (0.1-0.5):
  Higher = tighter orbit
  Lower = looser, more chaotic

REPULSION_STRENGTH (0.1-1.0):
  Higher = particles spread more
  Lower = denser clustering

DAMPING (0.90-0.99):
  Higher = more momentum, bouncy
  Lower = more drag, sluggish

ATTRACTION (0.5-3.0):
  Higher = faster pull to cursor
  Lower = slower, inertial
```

---

## Related Resources

- [Physics Simulation Basics](https://learnopengl.com/)
- [Force-Based Visualization](https://en.wikipedia.org/wiki/Force-directed_graph)
- [Previous: Adaptive Quality](./02-adaptive-quality.md)
- [Next: Breath Synchronization](./04-breath-sync.md)
