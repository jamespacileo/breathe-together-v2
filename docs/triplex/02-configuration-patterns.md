# Triplex: Configuration Patterns

Keep Triplex configuration simple, predictable, and MVP-friendly.

## Quick Reference

Configuration priority (highest to lowest):
1. **Props** - Component instance props
2. **Defaults** - Component default values

---

## Pattern 1: Defaults + Prop Overrides

Use local defaults in each component and allow props to override them.

```typescript
function BreathingLevel({
  sphereColor = '#4dd9e8',
  sphereOpacity = 0.15,
  particleCount = 300,
}: {
  sphereColor?: string
  sphereOpacity?: number
  particleCount?: number
}) {
  // Use props directly
  return <Scene sphereColor={sphereColor} particleCount={particleCount} />
}
```

---

## Pattern 2: System Toggle Flags

Expose ECS system toggles on the Canvas provider so you can isolate behavior.

```typescript
interface CanvasProviderProps {
  /** @type toggle */
  breathSystemEnabled?: boolean
  /** @type toggle */
  particlePhysicsSystemEnabled?: boolean
}

function CanvasProvider({ breathSystemEnabled = true }: CanvasProviderProps) {
  useFrame(() => {
    if (breathSystemEnabled) breathSystem()
    // ...
  })
}
```

In Triplex, toggle systems to debug in isolation.

---

## Pattern 3: Debug vs Production Scenes

Use the debug scene only when you need diagnostics.

```typescript
// Production
<BreathingLevel particleCount={300} />

// Triplex / debug
<BreathingDebugScene showTraitValues showParticleStats />
```

---

## Pattern 4: JSDoc for Prop Documentation

Document props so Triplex can surface useful controls.

```typescript
interface BreathingSceneProps {
  /** @type color */
  backgroundColor?: string

  /** @type slider @min 0 @max 1 @step 0.01 */
  sphereOpacity?: number

  /** @type slider @min 50 @max 600 @step 50 */
  particleCount?: number

  /** @type toggle */
  enableStars?: boolean
}
```

---

## Pattern 5: Validate Ranges

Clamp values to keep inputs safe.

```typescript
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const safeOpacity = clamp(sphereOpacity ?? 0.15, 0, 1)
const safeParticleCount = clamp(particleCount ?? 300, 50, 600)
```

---

## Pro Tips

1. Keep props minimal; add more only when you need them.
2. Prefer a single default path; avoid multiple presets during MVP.
3. Use debug scenes for diagnostics instead of production flags.
4. Document props with JSDoc so Triplex stays usable.

---

## Related Resources

- [Triplex Configuration](https://triplex.dev/docs/config)
- [Previous: Getting Started](./01-getting-started.md)
- [Next: Koota Integration](./03-koota-integration.md)
