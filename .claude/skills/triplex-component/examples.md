# Triplex Component Real-World Examples

Complete code from breathe-together-v2's Triplex-editable components.

---

## Example 1: BreathingSphere (25+ Triplex Props)

Full example with comprehensive annotations.

**File: `src/entities/breathingSphere/index.tsx` (props section)**

```typescript
interface BreathingSphereProps {
  /**
   * Sphere opacity (0 = transparent, 1 = opaque)
   *
   * **When to adjust**: Reduce for subtle meditation focus, increase for prominence
   * **Typical range**: 0.3-1.0
   * **Interacts with**: fresnelIntensityMax (higher intensity needs lower opacity)
   * **Performance note**: No GPU impact
   *
   * @type slider
   * @min 0
   * @max 1
   * @step 0.05
   * @default 0.7
   */
  opacity?: number;

  /**
   * Chromatic aberration effect intensity
   *
   * **When to adjust**: Increase for surreal/dreamy effect, 0 for pure white
   * **Typical range**: 0-0.05
   * **Interacts with**: opacity (visible at >0.3 opacity)
   * **Performance note**: ~2-3% GPU cost per 0.01 intensity
   *
   * @type slider
   * @min 0
   * @max 0.1
   * @step 0.005
   * @default 0.02
   */
  chromaticAberration?: number;

  /**
   * Base Fresnel glow intensity (at sphere sides)
   *
   * @type slider
   * @min 0
   * @max 1
   * @step 0.05
   * @default 0.3
   */
  fresnelIntensityBase?: number;

  /**
   * Maximum Fresnel glow (during peak breathing)
   *
   * @type slider
   * @min 0
   * @max 2
   * @step 0.1
   * @default 1.0
   */
  fresnelIntensityMax?: number;

  /**
   * Sphere geometry segments (quality/smoothness)
   *
   * **When to adjust**: Match camera distance
   * **Typical range**: 32 background, 64 balanced, 128-256 close-up
   * **Performance note**: O(n²) complexity
   *
   * @type slider
   * @min 16
   * @max 256
   * @step 8
   * @default 64
   */
  segments?: number;

  /**
   * Base sphere radius
   *
   * @type slider
   * @min 0.5
   * @max 3
   * @step 0.1
   * @default 1
   */
  radius?: number;

  /**
   * Entrance animation delay (milliseconds)
   *
   * @type slider
   * @min 0
   * @max 2000
   * @step 100
   * @default 0
   */
  entranceDelayMs?: number;

  /**
   * Enable breathing synchronization
   *
   * @type boolean
   * @default true
   */
  breathSyncEnabled?: boolean;
}

export function BreathingSphere({
  opacity = 0.7,
  chromaticAberration = 0.02,
  fresnelIntensityBase = 0.3,
  fresnelIntensityMax = 1.0,
  segments = 64,
  radius = 1,
  entranceDelayMs = 0,
  breathSyncEnabled = true,
}: BreathingSphereProps = {}) {
  // Component implementation uses props above
  return (
    <group>
      <mesh>
        <sphereGeometry args={[radius, segments, segments]} />
        <meshStandardMaterial
          transparent
          opacity={opacity}
          color="#ffffff"
        />
      </mesh>
    </group>
  );
}
```

---

## Example 2: ParticleSystem (Performance Props)

Demonstrates quality presets and performance tuning.

**File: `src/entities/particleSystem/index.tsx` (props + quality integration)**

```typescript
interface ParticleSystemProps {
  /**
   * Number of particles in system
   *
   * **When to adjust**: Increase for density, decrease for performance
   * **Typical range**: 50-100 mobile, 200-500 desktop
   * **Interacts with**: particleSize (larger needs fewer), color (visual density)
   * **Performance note**: O(n) impact on GPU, 100 particles ≈ 1ms
   *
   * @type slider
   * @min 10
   * @max 1000
   * @step 10
   * @default 300
   */
  particleCount?: number;

  /**
   * Particle emission rate (new particles per second)
   *
   * @type slider
   * @min 0
   * @max 500
   * @step 10
   * @default 100
   */
  emissionRate?: number;

  /**
   * Particle lifetime (seconds before removal)
   *
   * @type slider
   * @min 0.1
   * @max 10
   * @step 0.1
   * @default 3
   */
  particleLifetime?: number;

  /**
   * Particle size multiplier
   *
   * @type slider
   * @min 0.01
   * @max 1
   * @step 0.05
   * @default 0.1
   */
  particleSize?: number;

  /**
   * Particle orbit radius (breathing responsiveness)
   *
   * **When to adjust**: Larger = more expansive breathing effect
   * **Typical range**: 1-3
   * **Interacts with**: breathPhase (controls orbit animation)
   *
   * @type slider
   * @min 0.5
   * @max 5
   * @step 0.1
   * @default 2
   */
  orbitRadius?: number;

  /**
   * Particle physics enabled
   *
   * @type boolean
   * @default true
   */
  physicsEnabled?: boolean;

  /**
   * Debug mode: show particle bounds and info
   *
   * @type boolean
   * @default false
   */
  debugMode?: boolean;
}

// Quality preset system
import { QUALITY_PRESETS, useQuality } from '../../config/sceneDefaults';

export function ParticleSystem(props: ParticleSystemProps = {}) {
  const quality = useQuality(); // 'low' | 'medium' | 'high'
  const preset = QUALITY_PRESETS.particleSystem[quality];

  // Props override presets
  const particleCount = props.particleCount ?? preset.particleCount;
  const particleSize = props.particleSize ?? preset.particleSize;
  const emissionRate = props.emissionRate ?? preset.emissionRate;

  return (
    <instancedMesh args={[geometry, material, particleCount]}>
      {/* Render particles */}
    </instancedMesh>
  );
}
```

**File: `src/config/sceneDefaults.ts` (quality integration)**

```typescript
export const QUALITY_PRESETS = {
  particleSystem: {
    low: {
      particleCount: 50,
      particleSize: 0.05,
      emissionRate: 25,
      segments: 32,
    },
    medium: {
      particleCount: 300,
      particleSize: 0.1,
      emissionRate: 100,
      segments: 64,
    },
    high: {
      particleCount: 1000,
      particleSize: 0.15,
      emissionRate: 300,
      segments: 128,
    },
  },
};
```

---

## Template Files

See `templates/` directory for copy-paste starting points:

1. **`triplex-props-template.tsx`** - Flat props interface scaffold
2. **`jsdoc-annotation-template.md`** - Annotation format reference
3. **`quality-preset-template.ts`** - Quality integration example

---

## Key Patterns

### 1. Flat Props (Triplex Requirement)
```typescript
// ✅ GOOD
interface Props {
  colorR?: number;
  colorG?: number;
  colorB?: number;
}

// ❌ BAD
interface Props {
  color?: { r: number; g: number; b: number };
}
```

### 2. Comprehensive Annotations
Every prop should have:
- One-line description
- @min/@max/@step/@default
- "When to adjust" guidance
- Related props via "Interacts with"

### 3. Quality Preset Integration
```typescript
const quality = useQuality();
const preset = QUALITY_PRESETS.component[quality];
const effectiveValue = props.propName ?? preset.propName;
```

### 4. TypeScript Types
```typescript
interface MyComponentProps {
  // Typed props for IDE support
  particleCount?: number;
  breathSync?: boolean;
  color?: string;
}

// Default parameter with empty object
export function MyComponent(props: MyComponentProps = {}) {
  // Access props safely
  const { particleCount = 100 } = props;
}
```

---

## Checklist

Before declaring your Triplex component done:

- [ ] Props are flat (no nested objects/arrays)
- [ ] Every prop has JSDoc comment
- [ ] Every prop has @min/@max/@step/@default
- [ ] "When to adjust" explains the context
- [ ] "Interacts with" lists dependent props
- [ ] Performance-heavy props note the cost
- [ ] Defaults are tested and look good
- [ ] Props actually affect rendering
- [ ] Component in `.triplex/config.json`
- [ ] Tested in Triplex (`npm run dev`)
- [ ] Quality presets configured (if applicable)

---

## Testing in Triplex

1. Run: `npm run dev`
2. Open Triplex UI
3. Select your component
4. Verify props in sidebar
5. Test min/max ranges
6. Confirm defaults look good
7. Test "Interacts with" relationships
8. Check performance

If props don't appear:
- Run `npm run typecheck` (fix errors)
- Verify component in `.triplex/config.json`
- Check props are flat (not nested objects)
- Ensure component is exported and in correct path

---

## Real Component Locations

In breathe-together-v2:
- `src/entities/breathingSphere/index.tsx` - 8+ fully annotated props
- `src/entities/particleSystem/index.tsx` - 300+ particles with quality system
- `src/entities/lighting/index.tsx` - Light parameters
- `src/entities/environment/index.tsx` - Environmental effects

Study these for patterns and best practices!
