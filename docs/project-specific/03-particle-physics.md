# Particle Physics System

Understanding the force-based particle animation in breathe-together-v2.

## Force Order (MVP)

Each particle experiences forces in this order:

```
1. Orbit Spring
   Pull toward orbit radius based on restPosition

2. Wind / Turbulence
   Simplex noise force (dampened by crystallization)

3. Jitter / Shiver
   High-frequency vibration during holds (crystallization)

4. Sphere Repulsion
   Push away from the breathing sphere surface

5. Integration
   Apply acceleration + drag to update velocity and position
```

## Key Tunables

Located in:
- `src/constants.ts` → `VISUALS` + `PARTICLE_PHYSICS`
- `src/entities/particle/systems.tsx` (usage)

Examples:
- `SPRING_STIFFNESS`
- `PARTICLE_DRAG`
- `JITTER_STRENGTH`
- `REPULSION_POWER`
- `REPULSION_STRENGTH`
- `WIND_BASE_STRENGTH`

## Performance Notes

- Uses pooled `Vector3` temp objects to avoid GC.
- Skips noise/jitter when strength is below `FORCE_THRESHOLD`.
- Repulsion uses squared distance for early rejection.

---

## Related Resources

- [Previous: Adaptive Quality (Deferred)](./02-adaptive-quality.md)
- [Next: Breath Synchronization](./04-breath-sync.md)
