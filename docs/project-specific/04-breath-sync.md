# Breath Synchronization

How all users worldwide breathe in sync using UTC time.

## The Core Concept

Instead of using local time or server communication:

```
All devices use UTC time
  ↓
Same breathing phase everywhere
  ↓
Users naturally synchronize globally
  ↓
No network latency needed
```

## Box Breathing Pattern

Standard 4-4-4-4 breathing cycle = 16 seconds total:

```
Seconds 0-4:    Inhale     (breathing in)
Seconds 4-8:    Hold       (breath held in)
Seconds 8-12:   Exhale     (breathing out)
Seconds 12-16:  Hold       (breath held out)
[Repeat]
```

## Implementation

```typescript
function calculateBreathPhase(now: number): {
  phase: number        // 0-1, position in current phase
  phaseType: number    // 0-3, which phase (inhale/hold-in/exhale/hold-out)
  orbitRadius: number  // Particle orbit size
  sphereScale: number  // Central sphere scale (inverse of particles)
} {
  const CYCLE_LENGTH = 16000  // 16 seconds in milliseconds

  // Get position in 16-second cycle
  const cyclePosition = now % CYCLE_LENGTH

  // Which phase (0-3)
  const phaseType = Math.floor(cyclePosition / 4000)

  // Position within phase (0-1)
  const phaseProgress = (cyclePosition % 4000) / 4000

  // Smooth easing
  const easedProgress = easeInOutQuad(phaseProgress)

  // Calculate visual effects
  const orbitRadius = phaseType === 0 || phaseType === 2
    ? 3 + easedProgress * 2      // Inhale/exhale: 3→5
    : 5                           // Hold phases: constant

  const sphereScale = 1.0 / (orbitRadius / 3)  // Inverse relationship

  return {
    phase: easedProgress,
    phaseType,
    orbitRadius,
    sphereScale
  }
}
```

## Easing Function

Smooth transitions instead of linear changes:

```typescript
function easeInOutQuad(t: number): number {
  return t < 0.5
    ? 2 * t * t
    : -1 + (4 - 2 * t) * t
}

// Visualization:
// At t=0: result=0 (start)
// At t=0.5: result=0.5 (middle)
// At t=1: result=1 (end)
// Smooth curve in between (not linear)
```

## Why UTC?

### Advantages

1. **Global synchronization** - No server needed
2. **Offline capable** - Works without network
3. **Fair for everyone** - Same experience worldwide
4. **Low latency** - No round-trip delay
5. **Deterministic** - Same UTC = same breathing

### Limitations

1. **Device time must be accurate** - User's clock matters
2. **Clock drift** - Phone clocks can be off by minutes
3. **Timezone irrelevant** - UTC handles this automatically

### Solutions

If user's device is desynchronized:
- Gentle correction: Slowly adjust to correct phase
- Fallback: Allow local time as option
- Sync method: Can use server to verify once, then continue offline

## Testing Synchronization

### Verify Phase Alignment

```typescript
// Log phase from multiple devices
console.log('Device A phase:', calculateBreathPhase(Date.now()))
console.log('Device B phase:', calculateBreathPhase(Date.now()))

// Should be nearly identical (within milliseconds)
```

### Simulate Different Times

```typescript
// Simulate being 5 seconds ahead
const futureTime = Date.now() + 5000
const phase = calculateBreathPhase(futureTime)
console.log(phase)  // Should show exhale phase
```

## Performance

Breath calculation cost:
- **Per frame**: ~0.1ms (negligible)
- **No network calls**: Zero latency
- **No server dependency**: Works offline

---

## Related Resources

- [Box Breathing Guide](https://www.stress.org/box-breathing)
- [UTC Time Standard](https://en.wikipedia.org/wiki/Coordinated_Universal_Time)
- [Easing Functions](https://easings.net/)
- [Previous: Particle Physics](./03-particle-physics.md)
- [System Pipeline](./01-system-pipeline.md)

---

## Pro Tips

1. Use `Date.now()` for consistent timing
2. Don't trust device clock accuracy beyond ±5 minutes
3. Easing makes visual effect feel more natural
4. Test with different system clocks to find edge cases
5. Consider adding optional server sync for peace of mind
