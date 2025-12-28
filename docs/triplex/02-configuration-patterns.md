# Triplex: Configuration Patterns

Master advanced configuration techniques for Triplex.

## Quick Reference

Configuration Hierarchy (highest to lowest priority):
1. **Props** - Component instance props
2. **Context** - TriplexConfigContext value
3. **Defaults** - Component default values

---

## Pattern 1: Configuration Hierarchy

### Setup

```typescript
// contexts/triplex.tsx
export const TriplexConfigContext = createContext<TriplexConfig>({
  quality: 'high',
  performanceMode: false,
  debugMode: false
})

export function TriplexConfigProvider({ children }) {
  const [config, setConfig] = useState<TriplexConfig>({
    quality: 'high',
    performanceMode: false,
    debugMode: false
  })

  return (
    <TriplexConfigContext.Provider value={config}>
      {children}
    </TriplexConfigContext.Provider>
  )
}
```

### Usage

```typescript
function Component({ quality }: { quality?: 'low' | 'medium' | 'high' }) {
  const contextConfig = useContext(TriplexConfigContext)

  // Props override context
  const effectiveQuality = quality ?? contextConfig.quality

  return <div>Quality: {effectiveQuality}</div>
}

// In code: quality prop takes precedence
<Component quality="low" />  {/* Uses 'low' */}

// In Triplex: context value is default, can override
// Slider shows 'high', but can be changed to 'low'
```

---

## Pattern 2: Quality Presets

Define quality levels that affect multiple systems:

```typescript
type QualityLevel = 'low' | 'medium' | 'high'

const QUALITY_PRESETS: Record<QualityLevel, QualityConfig> = {
  low: {
    particleCount: 100,
    shadowMapSize: 512,
    fov: 75,
    dpr: 0.5,
    renderScale: 0.5,
  },
  medium: {
    particleCount: 200,
    shadowMapSize: 1024,
    fov: 75,
    dpr: 1,
    renderScale: 0.75,
  },
  high: {
    particleCount: 300,
    shadowMapSize: 2048,
    fov: 75,
    dpr: 1,
    renderScale: 1,
  },
}

function Canvas({ quality = 'high' }: { quality?: QualityLevel }) {
  const preset = QUALITY_PRESETS[quality]

  return (
    <canvas
      dpr={preset.dpr}
      style={{ width: '100%', height: '100%' }}
    >
      <ParticleSystem count={preset.particleCount} />
      <Lighting shadowMapSize={preset.shadowMapSize} />
    </canvas>
  )
}
```

---

## Pattern 3: System Toggle Flags

Expose debugging controls via props:

```typescript
interface KootaSystemsProps {
  /** @type toggle */
  breathSystemEnabled?: boolean

  /** @type toggle */
  particlePhysicsSystemEnabled?: boolean

  /** @type toggle */
  cursorPositionFromLandEnabled?: boolean

  /** @type toggle */
  velocityTowardsTargetEnabled?: boolean

  /** @type toggle */
  meshFromPositionEnabled?: boolean

  /** @type toggle */
  cameraFollowFocusedEnabled?: boolean
}

function KootaSystems({
  breathSystemEnabled = true,
  particlePhysicsSystemEnabled = true,
  cursorPositionFromLandEnabled = true,
  velocityTowardsTargetEnabled = true,
  meshFromPositionEnabled = true,
  cameraFollowFocusedEnabled = true,
}: KootaSystemsProps) {
  useFrame((state) => {
    if (breathSystemEnabled) breathSystem(world, state.clock.elapsedTime)
    if (particlePhysicsSystemEnabled) physicsSystem(world, state.clock.getDelta())
    if (cursorPositionFromLandEnabled) cursorSystem(world)
    if (velocityTowardsTargetEnabled) velocitySystem(world)
    if (meshFromPositionEnabled) meshSystem(world)
    if (cameraFollowFocusedEnabled) cameraSystem(world)
  })
}
```

In Triplex, you can toggle each system individually to see its effect.

---

## Pattern 4: Context + Props Merging

Combine context defaults with instance props:

```typescript
function Component(props: ComponentProps) {
  const contextConfig = useContext(TriplexConfigContext)

  // Merge with sensible defaults
  const config = useMemo(
    () => ({
      color: props.color ?? contextConfig.color ?? 'blue',
      scale: props.scale ?? contextConfig.scale ?? 1,
      speed: props.speed ?? contextConfig.speed ?? 5,
    }),
    [props, contextConfig]
  )

  // Use merged config
  return <mesh scale={config.scale} />
}
```

---

## Pattern 5: Dynamic Configuration

Change configuration based on device or performance:

```typescript
function AdaptiveCanvas() {
  const [quality, setQuality] = useState<QualityLevel>('high')

  useEffect(() => {
    // Detect device capabilities
    const isLowEnd = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(
      navigator.userAgent
    )

    if (isLowEnd) {
      setQuality('low')
    }
  }, [])

  return (
    <Canvas>
      <KootaSystems quality={quality} />
    </Canvas>
  )
}
```

---

## Pattern 6: Development vs Production

### Development Config

```typescript
const DEV_CONFIG = {
  debugMode: true,
  showStats: true,
  showHelpers: true,
  breathSystemEnabled: true,
  particlePhysicsSystemEnabled: true,
  // All systems enabled
}
```

### Production Config

```typescript
const PROD_CONFIG = {
  debugMode: false,
  showStats: false,
  showHelpers: false,
  // Only essential systems
  breathSystemEnabled: true,
  particlePhysicsSystemEnabled: true,
}

const config = process.env.NODE_ENV === 'development' ? DEV_CONFIG : PROD_CONFIG
```

---

## Pattern 7: JSDoc for Prop Documentation

Document props for Triplex discovery:

```typescript
/**
 * Breathing meditation visualization
 *
 * @component
 *
 * @param {Object} props
 * @param {string} props.backgroundColor - @type color - Scene background
 * @param {number} props.particleSize - @type slider @min 0.1 @max 5 @step 0.1 - Size of particles
 * @param {'low'|'medium'|'high'} props.quality - @type select @options low,medium,high - Visual quality level
 * @param {boolean} props.showDebug - @type toggle - Show debug overlays
 *
 * @example
 * <BreathingScene quality="high" particleSize={2} />
 */
function BreathingScene({
  backgroundColor = '#000000',
  particleSize = 1,
  quality = 'high',
  showDebug = false,
}: BreathingSceneProps) {
  // ...
}
```

---

## Pattern 8: Configuration Validation

Validate configuration values:

```typescript
function validateConfig(config: TriplexConfig): TriplexConfig {
  return {
    quality: ['low', 'medium', 'high'].includes(config.quality)
      ? config.quality
      : 'high',

    particleCount: Math.max(0, Math.min(1000, config.particleCount ?? 300)),

    speed: Math.max(0.1, Math.min(10, config.speed ?? 1)),
  }
}

// Use validated config
const validConfig = validateConfig(rawConfig)
```

---

## Pro Tips

1. Use context for global settings, props for instance overrides
2. Create quality presets for common configurations
3. Expose system toggles for debugging
4. Use JSDoc annotations for prop discovery in Triplex
5. Validate configuration to prevent invalid states
6. Separate dev and production configs
7. Make quality levels progressive (low → medium → high)

---

## Related Resources

- [Triplex Configuration](https://triplex.dev/docs/config)
- [React Context API](https://react.dev/reference/react/useContext)
- [Previous: Getting Started](./01-getting-started.md)
- [Next: Koota Integration](./03-koota-integration.md)
