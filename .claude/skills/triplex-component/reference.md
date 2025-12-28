# Triplex Component Annotation Reference

Complete JSDoc annotation specifications and patterns for Triplex-editable components.

---

## Annotation Format (Complete)

```typescript
interface MyComponentProps {
  /**
   * [One-line description]
   *
   * [Optional paragraph: more context about the prop]
   *
   * **When to adjust**: Context-specific guidance
   * **Typical range**: Visual landmarks (e.g., "100-500 for subtle, 500-1000 for dramatic")
   * **Interacts with**: Names of other props that affect or are affected by this one
   * **Performance note**: CPU/GPU cost if significant (optional)
   *
   * @type [color|vector3|slider|boolean] (optional if obvious from TypeScript)
   * @min [number]
   * @max [number]
   * @step [increment]
   * @default [value]
   */
  propName?: Type;
}
```

---

## Annotation Types

### Slider (Number Range)
```typescript
/**
 * Particle count for system
 *
 * **When to adjust**: Increase for denser clouds, decrease for performance
 * **Typical range**: 10-50 mobile, 100-500 desktop
 * **Interacts with**: particleSize (larger particles need fewer count)
 * **Performance note**: O(n) impact on frame rate
 *
 * @type slider
 * @min 0
 * @max 1000
 * @step 10
 * @default 100
 */
particleCount?: number;
```

### Color (Hex String)
```typescript
/**
 * Primary color in hex format
 *
 * @type color
 * @default "#ffffff"
 */
primaryColor?: string;
```

### Boolean (Toggle)
```typescript
/**
 * Enable particle physics simulation
 * When disabled, particles remain static
 *
 * @type boolean
 * @default true
 */
physicsEnabled?: boolean;
```

### Vector3 (Three Floats)
Use individual float props (Triplex requirement):

```typescript
/**
 * Position X coordinate in world space
 *
 * @min -10
 * @max 10
 * @step 0.1
 * @default 0
 */
positionX?: number;

/**
 * Position Y coordinate in world space
 *
 * @min -10
 * @max 10
 * @step 0.1
 * @default 0
 */
positionY?: number;

/**
 * Position Z coordinate in world space
 *
 * @min -10
 * @max 10
 * @step 0.1
 * @default 0
 */
positionZ?: number;
```

### Enum (Select Dropdown)
```typescript
/**
 * Particle animation curve type
 *
 * - `linear`: Uniform speed
 * - `ease-in`: Starts slow, ends fast
 * - `ease-out`: Starts fast, ends slow
 * - `ease-in-out`: Smooth acceleration
 *
 * @default "ease-in-out"
 */
curveType?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
```

---

## Real-World Annotation Examples

### Example 1: Emission Rate (Particle System)
```typescript
/**
 * Particle emission rate (particles per second)
 *
 * Higher values create denser particle clouds. For continuous breathing
 * meditation effect, typical range is 50-200. For dramatic visual effects,
 * use 500-1000 but watch performance on mobile devices.
 *
 * **When to adjust**: Increase for more intense visual feedback, decrease for subtlety
 * **Typical range**: 50-200 subtle, 200-500 medium, 500+ dramatic
 * **Interacts with**: particleLifetime (combined determines total particles), maxParticles (hard limit)
 * **Performance note**: Quadratic impact. 500/sec ≈ 5% GPU (desktop), 15% (mobile)
 *
 * @type slider
 * @min 0
 * @max 1000
 * @step 10
 * @default 100
 */
emissionRate?: number;
```

### Example 2: Opacity (Visual)
```typescript
/**
 * Component opacity (0 = invisible, 1 = opaque)
 *
 * **When to adjust**: Layer multiple components with varying opacity
 * **Typical range**: 0.3-1.0 for visible, 0.05-0.3 for subtle background
 * **Interacts with**: brightness (low opacity benefits from higher brightness)
 * **Performance note**: No performance cost
 *
 * @type slider
 * @min 0
 * @max 1
 * @step 0.05
 * @default 0.7
 */
opacity?: number;
```

### Example 3: Geometry Segments (Quality)
```typescript
/**
 * Sphere geometry segments (tesselation quality)
 *
 * Controls smoothness of geometry. 32 segments = obvious facets,
 * 64 = balanced, 128+ = smooth as glass. Higher values = slower render.
 *
 * **When to adjust**: Match camera distance (distant = lower, close = higher)
 * **Typical range**: 32 background, 64 mid-ground, 128-256 close-up focal
 * **Interacts with**: camera distance (closer needs higher quality)
 * **Performance note**: O(n²) geometry complexity, ~5ms per doubling at 60FPS
 *
 * @type slider
 * @min 8
 * @max 256
 * @step 8
 * @default 64
 */
segments?: number;
```

### Example 4: Glow Intensity (Shader Parameter)
```typescript
/**
 * Fresnel glow intensity (edge highlight)
 *
 * Creates realistic edge highlighting where light grazes geometry surface.
 * Simulates light scattering at shallow angles. 0 = no glow, 1 = subtle,
 * 2+ = dramatic ethereal effect.
 *
 * **When to adjust**: Increase for supernatural/dreamy feel, decrease for realistic
 * **Typical range**: 0.3-1.0 realistic, 1.0-3.0 artistic
 * **Interacts with**: opacity (high glow works better at lower opacity)
 * **Performance note**: Fragment shader cost, negligible on modern GPUs
 *
 * @type slider
 * @min 0
 * @max 3
 * @step 0.1
 * @default 0.5
 */
fresnelGlow?: number;
```

---

## Best Practices

### 1. Range Selection (@min/@max/@step)
- **@min**: Absolute minimum (0 for counts, -10 for positions)
- **@max**: Comfortable maximum (test and pick intuitive value)
- **@step**: Granularity (0.1 for fine control, 10 for coarse)

Example: Emission rate 0-1000 with step 10 = 100 steps (good UI density)

### 2. Default Values (@default)
- Should be middle-ground, production-ready
- Not minimum or maximum, but "typical good value"
- Test in Triplex to confirm appearance

### 3. "When to Adjust" Guidance
- Context for **designers/artists**, not programmers
- Visual/experience-focused language
- Mention use cases: "subtle background", "dramatic focal", etc.

### 4. "Typical Range" Landmarks
- Give examples with names: "50-200 subtle", "500-1000 dramatic"
- Include mobile vs desktop differences if applicable
- Help users navigate the full range

### 5. "Interacts With" Documentation
- List props that combine with this one
- Example: "emissionRate × particleLifetime = total particles"
- Help users understand composite effects

### 6. Performance Notes
- Only if significant (> 1-2% frame time impact)
- Quantify if possible: "~5% GPU cost", "2ms overhead"
- Warn about mobile impact

---

## Quality Preset System

Map props to quality levels in `src/config/sceneDefaults.ts`:

```typescript
export const QUALITY_PRESETS = {
  myComponent: {
    low: {
      particleCount: 50,
      segments: 32,
      detail: 0.5,
      emission: 50,
    },
    medium: {
      particleCount: 200,
      segments: 64,
      detail: 1.0,
      emission: 150,
    },
    high: {
      particleCount: 500,
      segments: 128,
      detail: 2.0,
      emission: 300,
    },
  },
};
```

In your component:
```typescript
function MyComponent(props: Props) {
  const quality = useQuality(); // 'low' | 'medium' | 'high'
  const preset = QUALITY_PRESETS.myComponent[quality];

  // Prop overrides preset, preset overrides default
  const particleCount = props.particleCount ?? preset.particleCount;
  const segments = props.segments ?? preset.segments;

  return <mesh />;
}
```

---

## Flat Props Conversion Guide

**Before (nested - doesn't work with Triplex):**
```typescript
interface Props {
  position?: { x: number; y: number; z: number };
  scale?: { x: number; y: number; z: number };
  color?: { r: number; g: number; b: number };
}
```

**After (flat - Triplex-compatible):**
```typescript
interface Props {
  positionX?: number;
  positionY?: number;
  positionZ?: number;
  scaleX?: number;
  scaleY?: number;
  scaleZ?: number;
  colorR?: number;
  colorG?: number;
  colorB?: number;
}

function convert(props: Props) {
  const position = [props.positionX ?? 0, props.positionY ?? 0, props.positionZ ?? 0];
  const scale = [props.scaleX ?? 1, props.scaleY ?? 1, props.scaleZ ?? 1];
  const color = `rgb(${(props.colorR ?? 1) * 255},${(props.colorG ?? 1) * 255},${(props.colorB ?? 1) * 255})`;

  return { position, scale, color };
}
```

---

## Common Prop Ranges Reference

### Particle Systems
- **Count**: 10-1000 (depends on particle size and effect)
- **Emission rate**: 0-1000/sec
- **Lifetime**: 0.1-10 seconds
- **Size**: 0.01-1.0 units

### Geometry
- **Segments**: 8-256 (depends on closeness)
- **Radius**: 0.1-10 units (depends on scene scale)
- **Position**: -50 to +50 units (typical scene bounds)

### Effects
- **Opacity**: 0-1 (usually 0.2-1.0 for visible)
- **Glow/Intensity**: 0-3 (usually 0.3-1.5)
- **Speed/Scale**: 0.1-5.0x multipliers

### Timing
- **Duration**: 0-5 seconds
- **Delay**: 0-2000 milliseconds
- **Speed**: 0.1x-5.0x multipliers

---

## Checklist for Triplex Props

- [ ] All props are flat (no nested objects)
- [ ] All props have @min/@max/@step/@default
- [ ] All props have "When to adjust" guidance
- [ ] Related props document "Interacts with"
- [ ] Performance-heavy props note GPU/CPU cost
- [ ] Defaults are production-ready values
- [ ] Props are used in actual rendering
- [ ] Component appears in `.triplex/config.json`
- [ ] Tested in Triplex UI (`npm run dev`)
- [ ] Triplex controls match intended ranges

---

See [examples.md](examples.md) for real component implementations.
