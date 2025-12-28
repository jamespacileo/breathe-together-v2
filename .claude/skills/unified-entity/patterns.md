# Entity Patterns & Anti-Patterns

Reusable patterns proven to work in breathe-together-v2, and patterns to avoid.

---

## ✅ Good Patterns

### Pattern 1: Enable/Disable Toggles

**Pattern:** Add boolean toggles for optional features instead of using intensity=0 workarounds.

**Good because:**
- Semantic (intent is clear: enabled vs disabled, not just intensity=0)
- Works for non-intensity features (can't use intensity=0 for position)
- Better Triplex UX (users see yes/no instead of guessing intensity value)

**Used in:** Lighting (enableAmbient, enableKey, enableFill, enableRim), Environment (enableStars, enableFloor)

**Example:**
```typescript
interface Props {
  enableAmbient?: boolean;
  ambientIntensity?: number;
  ambientColor?: string;
}

export function Lighting({
  enableAmbient = true,
  ambientIntensity = 0.4,
  ambientColor = "#ffffff"
}: Props = {}) {
  return (
    <>
      {enableAmbient && (
        <ambientLight intensity={ambientIntensity} color={ambientColor} />
      )}
    </>
  );
}
```

**Metrics:**
- Environment: Added 3 toggles, enabled new use cases (test without stars/floor/light)
- Lighting: Added 4 toggles, enabled 16 lighting combinations (2^4)

---

### Pattern 2: Props-to-Config Conversion

**Pattern:** Maintain flat props for Triplex but group them internally for code clarity.

**Good because:**
- Flat props required for Triplex editability
- Config objects improve code readability
- Easy to maintain single source of truth (prop list)

**Example:**
```typescript
// Flat interface (for Triplex)
interface LightingProps {
  keyPosition?: string;        // e.g., "8,10,5"
  keyIntensity?: number;
  keyColor?: string;
  fillPosition?: string;
  fillIntensity?: number;
  fillColor?: string;
  // ... 9 more flat props
}

// Helper converts to grouped config (internal)
function propsToLightingConfig(props: LightingProps): LightingConfig {
  return {
    key: {
      position: parsePosition(props.keyPosition),
      intensity: props.keyIntensity,
      color: props.keyColor,
    },
    fill: {
      position: parsePosition(props.fillPosition),
      intensity: props.fillIntensity,
      color: props.fillColor,
    },
  };
}
```

**Benefits:**
- 12 flat props at Triplex level
- 6 nested properties in config for code organization
- Single props interface to maintain

---

### Pattern 3: Scene Threading (3 Layers)

**Pattern:** Define props once in scene files, thread through 3 layers.

**Layers:**
1. `breathing.tsx` - Production (no debug)
2. `breathing.scene.tsx` - Experimental (adds algorithm comparisons)
3. `breathing.debug.scene.tsx` - Full debug (adds manual controls)

**Good because:**
- Single source of truth for prop defaults
- No duplication across scene files
- Context providers can inject overrides
- Easy to add new entities (just thread through 3 files)

**Example:**
```typescript
// breathing.tsx
export function BreathingLevel({
  sphereOpacity = VISUAL_DEFAULTS.sphereOpacity,
  enableAmbient = LIGHTING_DEFAULTS.enableAmbient,
}: Partial<BreathingLevelProps> = {}) {
  return (
    <>
      <BreathingSphere opacity={sphereOpacity} />
      <Lighting enableAmbient={enableAmbient} />
    </>
  );
}

// breathing.scene.tsx - wraps with context
export function BreathingScene(props: BreathingSceneProps) {
  return (
    <BreathCurveProvider config={/* ... */}>
      <BreathingLevel {...props} />
    </BreathCurveProvider>
  );
}

// breathing.debug.scene.tsx - wraps with debug contexts
export function BreathingDebugScene(props: BreathingDebugSceneProps) {
  return (
    <BreathDebugProvider config={debugConfig}>
      <BreathingLevel {...visibleProps} />
      <BreathDebugVisuals showOrbitBounds={showOrbitBounds} />
    </BreathDebugProvider>
  );
}
```

---

### Pattern 4: Hardcoding Values < 5% Visual Impact

**Pattern:** Remove props with imperceptible visual impact by hardcoding.

**Good because:**
- Reduces prop clutter
- Fewer options = easier to understand
- No visual difference to users

**Example from Environment:**
```typescript
// BEFORE: 16 props
interface Props {
  floorRoughness?: number;  // default 1.0
  floorMetalness?: number;  // default 0.0
  // ... 14 more
}

// AFTER: 14 props (hardcoded roughness/metalness)
export function Environment({ /* 14 props */ }: Props = {}) {
  return (
    <mesh>
      <meshStandardMaterial
        roughness={1}    // Always matte (hardcoded)
        metalness={0}    // Always non-metallic (hardcoded)
        // ... other material properties
      />
    </mesh>
  );
}
```

**Metrics:**
- Props reduced 16 → 14 (12.5% reduction)
- Zero visual impact (floor appearance unchanged)

**Decision rule:** Hardcode if visual impact < 5% and rarely adjusted

---

### Pattern 5: Backward Compatibility (defaults=true)

**Pattern:** New toggle props should default to true to preserve existing behavior.

**Good because:**
- Existing scenes continue working without changes
- No breaking changes
- Users opt-in to new features

**Example:**
```typescript
interface Props {
  enableFeature?: boolean;  // @default true
}

export function Entity({
  enableFeature = true,  // Default to TRUE (existing behavior)
}: Props = {}) {
  return (
    <>
      {enableFeature && <FeatureComponent />}
    </>
  );
}
```

**Benefit:** Add 4 toggles to Lighting without breaking existing scenes

---

### Pattern 6: Context Override with Fallback

**Pattern:** Components check for context override, fall back to props.

**Good because:**
- Debug/Triplex can override props
- Production code unaffected
- Zero pollution in production

**Example:**
```typescript
export function Entity(props: EntityProps) {
  const triplexConfig = useTriplexConfig?.();
  const debugConfig = useDebugOverride?.();

  // Merge: debug > triplex > props
  const finalOpacity =
    debugConfig?.opacity ??
    triplexConfig?.opacity ??
    props.opacity ??
    DEFAULTS.opacity;

  useFrame(() => {
    meshRef.current.material.opacity = finalOpacity;
  });
}
```

---

## ❌ Anti-Patterns

### Anti-Pattern 1: Nested Objects in Props

**Problem:** Triplex can't edit nested objects.

```typescript
// ❌ WRONG
interface Props {
  position?: { x: number; y: number; z: number };
  scale?: { x: number; y: number; z: number };
}
```

**Why:** Triplex requires flat scalar props (positionX, positionY, positionZ)

**Fix:** Use flat props, group internally if needed
```typescript
// ✅ CORRECT
interface Props {
  positionX?: number;
  positionY?: number;
  positionZ?: number;
  scaleX?: number;
  scaleY?: number;
  scaleZ?: number;
}

// Internal grouping for code clarity
const position = [props.positionX, props.positionY, props.positionZ];
const scale = [props.scaleX, props.scaleY, props.scaleZ];
```

---

### Anti-Pattern 2: Intensity=0 Instead of Toggles

**Problem:** Non-semantic, confusing, doesn't work for non-intensity features.

```typescript
// ❌ WRONG - Users have to guess
<Lighting
  ambientIntensity={0}  // Disabled? Or very dim?
  keyIntensity={0}      // Is this turned off?
/>
```

**Why:** Can't use for position, color, other features. Hard for users to understand intent.

**Fix:** Use explicit toggles
```typescript
// ✅ CORRECT - Clear intent
<Lighting
  enableAmbient={false}
  enableKey={true}
/>
```

---

### Anti-Pattern 3: Future-Proofing Props

**Problem:** Adding props "just in case" they might be used later.

```typescript
// ❌ WRONG - Adds clutter for hypothetical features
interface Props {
  // Maybe we'll need these someday?
  userData?: string;
  customFlags?: number;
  experimentalValue?: boolean;
  // ... 5 more unused props
}
```

**Why:** Props clutter the interface. If they're never used, they never will be.

**Fix:** Add props when you actually need them
```typescript
// ✅ CORRECT - Only real props
interface Props {
  opacity?: number;
  color?: string;
  scale?: number;
}
```

---

### Anti-Pattern 4: Missing Scene Threading

**Problem:** Props defined in entity but not exposed through all 3 scene layers.

```typescript
// ❌ WRONG - Added to index.tsx but not threading
export function BreathingSphere({ newProp = 1 }: Props) {
  // ... entity implementation
}

// Missing from:
// - breathing.tsx (prop list)
// - breathing.scene.tsx (prop list)
// - breathing.debug.scene.tsx (prop list)
// - sceneDefaults.ts (default value)
// - sceneProps.ts (type definition)

// Result: Prop exists but not editable anywhere
```

**Why:** Prop accessible to nobody. Wasted implementation.

**Fix:** Thread through all layers
```typescript
// ✅ CORRECT
// 1. Define in sceneProps.ts
// 2. Add default to sceneDefaults.ts
// 3. Add parameter to BreathingLevel
// 4. Pass to BreathingSphere component
// 5. Add to BreathingScene props
// 6. Add to BreathingDebugScene props
```

**Rule:** If you add a prop, thread it through ALL 3 scene files

---

### Anti-Pattern 5: Complex Type Props

**Problem:** Using complex types that Triplex can't handle.

```typescript
// ❌ WRONG - Triplex can't edit these
interface Props {
  config?: { a: number; b: string; c: boolean };
  transform?: Matrix4;
  callback?: () => void;
}
```

**Why:** Triplex only handles scalar types (number, string, boolean, array of scalars)

**Fix:** Flatten to scalar types
```typescript
// ✅ CORRECT
interface Props {
  configA?: number;
  configB?: string;
  configC?: boolean;
  transformScaleX?: number;
  transformScaleY?: number;
  // ... no callbacks
}
```

---

### Anti-Pattern 6: Missing JSDoc on Triplex Props

**Problem:** No JSDoc annotations for props editable in Triplex.

```typescript
// ❌ WRONG - Users have no guidance
interface Props {
  opacity?: number;  // No @min, @max, @step, @default
  segments?: number; // What's the valid range?
}
```

**Why:** Users don't know valid ranges, good values, or how props interact.

**Fix:** Comprehensive JSDoc for every Triplex prop
```typescript
// ✅ CORRECT
interface Props {
  /**
   * Sphere opacity (0 = transparent, 1 = opaque)
   *
   * **When to adjust:** Reduce for subtle effect, increase for prominence
   * **Typical range:** 0.3 (subtle) → 0.7 (standard) → 1.0 (opaque)
   * **Interacts with:** fresnelIntensityMax (higher intensity needs lower opacity)
   *
   * @type slider
   * @min 0
   * @max 1
   * @step 0.05
   * @default 0.7
   */
  opacity?: number;

  /**
   * Sphere geometry segments (quality/smoothness)
   *
   * @type slider
   * @min 16
   * @max 256
   * @step 8
   * @default 64
   */
  segments?: number;
}
```

---

## Decision Matrix

### Should I Add This Prop?

**Ask:**
1. Is it critical for the entity to work? → YES: Continue. NO: Don't add.
2. Will users adjust it frequently (>20%)? → YES: Add. NO: Can we hardcode?
3. Can we hardcode it (< 5% visual impact)? → YES: Hardcode, don't add. NO: Add.

**Result:** Add only props that users actually adjust frequently.

---

### Should I Remove This Prop?

**Ask:**
1. Is it ever used? → NO: Remove. YES: Continue.
2. Can users work around it? → YES: Consider removing. NO: Keep.
3. Is visual impact < 5%? → YES: Remove. NO: Keep.
4. Does it match peer entities? → NO: Consider removing. YES: Keep.

**Result:** Remove unused or rarely-used props < 5% visual impact.

---

## Pattern Application Examples

**Lighting Entity:**
- ✅ Pattern 1: 4 enable/disable toggles
- ✅ Pattern 2: Flat props → internal config grouping
- ✅ Pattern 3: Props threaded through 3 scenes
- ✅ Pattern 5: All toggles @default true

**Environment Entity:**
- ✅ Pattern 1: 3 enable/disable toggles
- ✅ Pattern 3: Props threaded through 3 scenes
- ✅ Pattern 4: Hardcoded floor roughness/metalness
- ✅ Pattern 5: All toggles @default true

**BreathingSphere Entity:**
- ✅ Pattern 2: Props-to-config conversion
- ✅ Pattern 6: Context override with fallback
- ✅ Reference.md for complex ECS pattern
- ✅ Advanced useFrame pattern with closure

---

## Patterns to Reuse

1. **Enable/Disable Toggles** → Applicable to any multi-component entity
2. **Props-to-Config** → Useful when you have 10+ related props
3. **Scene Threading** → Required for any new prop exposure
4. **Hardcoding < 5%** → Check each rarely-used prop
5. **Backward Compatibility** → Always use defaults=true for new toggles
6. **Context Override** → Use for debug/Triplex special cases

These patterns prevent common mistakes and create consistency across all entities.
