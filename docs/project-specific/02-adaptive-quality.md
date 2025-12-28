# Adaptive Quality (Deferred)

This project intentionally ships with a **single fixed quality level** during MVP.
We removed adaptive quality, performance monitors, and presets to keep the runtime
and Triplex controls simple.

## Current Behavior

- Fixed particle count (see `VISUALS.PARTICLE_COUNT` in `src/constants.ts`)
- No performance-based toggles or presets
- No active/inactive particle gating

## Revisit After MVP

If/when adaptive quality returns, capture it here. For now, treat this file as
an archive marker rather than active guidance.

## Related Resources

- [Previous: System Pipeline](./01-system-pipeline.md)
- [Next: Particle Physics](./03-particle-physics.md)
