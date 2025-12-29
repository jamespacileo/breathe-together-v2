# Real Entity Examples from breathe-together-v2

Complete examples of all three archetypes from actual entities in the codebase.

---

## Example 1: Visual-Only Entity (Lighting)

**File:** `src/entities/lighting/index.tsx`

**Archetype:** Single index.tsx, no ECS, extensive JSDoc, enable/disable toggles

**Key characteristics:**
- 16 flat props for Triplex
- Comprehensive JSDoc annotations
- 4 enable/disable toggles (enableAmbient, enableKey, enableFill, enableRim)
- 100% Triplex accessibility
- Props-to-config internal grouping

**Pattern highlights:**
```typescript
// Flat interface (for Triplex)
interface LightingProps {
  enableAmbient?: boolean;
  ambientIntensity?: number;
  ambientColor?: string;
  enableKey?: boolean;
  keyPosition?: string;
  keyIntensity?: number;
  keyColor?: string;
  enableFill?: boolean;
  fillPosition?: string;
  fillIntensity?: number;
  fillColor?: string;
  enableRim?: boolean;
  rimPosition?: string;
  rimIntensity?: number;
  rimColor?: string;
}

// Comprehensive JSDoc example (Standardized 7-Section Format)
/**
 * Enable ambient light (soft base illumination).
 *
 * Non-directional light providing uniform illumination across entire scene.
 * Foundation for all other lighting; always recommended for balanced appearance.
 *
 * **When to adjust:** Keep enabled for balanced lighting; disable for theatrical high-contrast effects
 * **Typical range:** Disabled → Enabled (provides consistent base), adjust intensity separately
 * **Interacts with:** ambientIntensity, keyIntensity, fillIntensity (affects overall brightness balance)
 * **Performance note:** No impact; single light pass on all pixels
 *
 * @type boolean
 * @default true (production baseline: always-on ambient lighting)
 */
enableAmbient?: boolean;

// Component
export function Lighting({
  enableAmbient = true,
  ambientIntensity = 0.4,
  ambientColor = "#ffffff",
  enableKey = true,
  keyPosition = "8,10,5",
  keyIntensity = 0.8,
  keyColor = "#ffffff",
  // ... more props
}: LightingProps = {}) {
  return (
    <group>
      {enableAmbient && (
        <ambientLight intensity={ambientIntensity} color={ambientColor} />
      )}
      {enableKey && (
        <directionalLight
          position={parsePosition(keyPosition)}
          intensity={keyIntensity}
          color={keyColor}
        />
      )}
      {/* More lights */}
    </group>
  );
}
```

**Improvement results:**
- Metrics: 12 → 16 props (+4 toggles)
- Impact: 1 → 16 lighting combinations (2^4)
- Commit: `fa70554`

---

## Example 2: Simple ECS Entity (Camera)

**Files:**
- `src/entities/camera/index.tsx` - React component
- `src/entities/camera/traits.tsx` - ECS state
- `src/entities/camera/systems.tsx` - Update logic

**Archetype:** index.tsx + traits.tsx + systems.tsx, minimal state, marker trait

**Key characteristics:**
- 1 marker trait (CameraTrait)
- 1 system (cameraFollowFocusedSystem)
- Minimal props (just position, optional)
- Spawns entity in useEffect
- System registered in providers.tsx

**Pattern highlights:**
```typescript
// traits.tsx
export const CameraTrait = trait();

// index.tsx
interface CameraProps {
  position?: [x: number, y: number, z: number];
}

export function Camera({ position = [0, 5, 5] }: CameraProps = {}) {
  const world = useWorld();

  useEffect(() => {
    // Spawn entity with camera marker
    const entity = world.spawn(CameraTrait);
    return () => entity.destroy();
  }, [world]);

  return (
    <PerspectiveCamera
      position={position}
      fov={75}
      near={0.1}
      far={1000}
      makeDefault
    />
  );
}

// systems.tsx
export function cameraFollowFocusedSystem(world: World) {
  return () => {
    // Find camera entity
    const cameraEntity = world.queryFirst([CameraTrait]);
    if (!cameraEntity) return;

    // Find focused entity (breathing sphere)
    const focusedEntity = world.queryFirst([Mesh, FocusedTrait]);
    if (!focusedEntity) return;

    // Move camera toward focus point
    const focus = focusedEntity.get(Position)?.value ?? [0, 0, 0];
    // ... animation logic
  };
}
```

**Registration:**
```typescript
// src/providers.tsx - KootaSystems component
export function KootaSystems() {
  return (
    <useKoota.Provider value={world}>
      {/* ... other providers */}
      {/* System registered here */}
    </useKoota.Provider>
  );
}
```

---

## Example 3: Complex ECS Entity (BreathingSphere)

**Files:**
- `src/entities/breathingSphere/index.tsx` - React component with props
- `src/entities/breathingSphere/traits.tsx` - Multiple ECS traits
- `src/entities/breathingSphere/systems.tsx` - Animation systems

**Archetype:** Full ECS + config.ts, rich state, contexts, 23 props

**Key characteristics:**
- 5+ traits (Scale, Position, SphereConfig, etc.)
- Complex useFrame with closure pattern
- Context integration (useTriplexConfig, useBreathDebug)
- Props-to-config conversion
- 23 flat props for Triplex
- Quality preset support

**Pattern highlights:**
```typescript
// Simplified interface (23 props total)
interface BreathingSphereProps {
  // Position & Scale (using tuple types)
  position?: [x: number, y: number, z: number];
  scale?: number | [x: number, y: number, z: number];  // Flexible: uniform or per-axis

  // Opacity & effects
  opacity?: number;
  chromaticAberration?: number;
  fresnelIntensityBase?: number;
  fresnelIntensityMax?: number;
  // Geometry
  segments?: number;
  // Breathing sync
  breathSyncEnabled?: boolean;
  // ... more props
}

// Comprehensive JSDoc example (Standardized 7-Section Format)
/**
 * Sphere opacity (0 = transparent, 1 = opaque).
 *
 * Controls transparency of the main sphere layer. Affects visibility of fresnel glow and internal details.
 * Higher opacity makes sphere more solid and prominent, lower opacity allows environment to show through.
 *
 * **When to adjust:** Reduce for meditative subtlety (0.3-0.5), increase for focal prominence (0.8-1.0)
 * **Typical range:** Subtle (0.3) → Standard (0.7, balanced) → Solid (1.0)
 * **Interacts with:** fresnelIntensityMax (higher intensity needs lower opacity for balance), colorExhale/colorInhale
 * **Performance note:** No impact; transparency computed per-fragment in shader
 *
 * @type slider
 * @min 0
 * @max 1
 * @step 0.05
 * @default 0.7 (production baseline: balanced opacity with visible glow)
 */
opacity?: number;

// Component
export function BreathingSphere({
  opacity = DEFAULTS.opacity,
  segments = DEFAULTS.segments,
  breathSyncEnabled = true,
  // ... other props
}: Partial<BreathingSphereProps> = {}) {
  const world = useWorld();
  const triplexConfig = useTriplexConfig?.();

  // Props-to-config conversion
  const config = useMemo(
    () => propsToSphereConfig({ opacity, segments, /* ... */ }),
    [opacity, segments]
  );

  useEffect(() => {
    // Spawn entity with rich state
    const entity = world.spawn(
      SphereScale(1.0),
      SphereConfig(config)
    );
    return () => entity.destroy();
  }, [world, config]);

  // Complex animation with closure pattern
  useFrame((state, delta) => {
    const breathEntity = world.queryFirst([BreathPhase]);
    const phase = breathEntity?.get(BreathPhase)?.value ?? 0;

    // Update shader uniforms
    material.uniforms.uBreathPhase.value = phase;

    // Update scale with entrance animation
    const targetScale = 0.5 + phase * 0.5;
    mesh.scale.setScalar(targetScale * entranceScale);
  });

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef} geometry={geometry} material={material} />
      {/* Aura layer */}
      <mesh ref={auraRef} scale={2} />
    </group>
  );
}
```

**Advanced features:**
- Multi-layer rendering (main + core + aura)
- Custom shader (Fresnel effect, crystallization)
- Breathing synchronization (reads BreathPhase trait)
- Context-based debugging (useBreathDebug override)
- Adaptive quality system

---

## Improvement Examples

### Lighting Entity Improvement (fa70554)

**What was improved:**
- Added 4 enable/disable toggles
- Enabled 16 lighting combinations (2^4)

**Before:**
```typescript
// No toggles - intensity=0 workaround only
<ambientLight intensity={0} />  // Confusing intent
```

**After:**
```typescript
// Clear toggles
{enableAmbient && (
  <ambientLight intensity={ambientIntensity} />
)}
```

**Metrics:**
- Props: 12 → 16 (+4 toggles)
- Combinations: 1 → 16
- Accessibility: 100% → 100%

---

### Environment Entity Improvement (8c7b4b7)

**What was improved:**
- Added 3 enable/disable toggles (enableStars, enableFloor, enablePointLight)
- Removed 2 over-engineered props (floorRoughness, floorMetalness)
- Increased Triplex accessibility from 12.5% → 57%

**Before:**
- 16 props
- Only 2 exposed at scene level
- Default mismatches
- No toggles

**After:**
- 14 props (removed 2 < 5% impact props)
- 8 exposed at scene level (4.5x improvement)
- 0 default mismatches
- 3 enable/disable toggles

**Metrics:**
- Props: 16 → 14 (12.5% reduction)
- Accessibility: 12.5% → 57% (4.5x improvement)
- Default mismatches: 3 → 0
- Toggles: 0 → 3

---

## Pattern Usage Across Examples

| Pattern | Lighting | Camera | BreathingSphere |
|---------|----------|--------|-----------------|
| Enable/disable toggles | ✅ (4) | ❌ | ❌ |
| Props-to-config | ✅ | ❌ | ✅ |
| Scene threading | ✅ | ✅ | ✅ |
| Quality presets | ❌ | ❌ | ✅ |
| Comprehensive JSDoc | ✅ | ⚠️ (minimal) | ✅ |
| Context override | ❌ | ❌ | ✅ |
| Complex useFrame | ❌ | ❌ | ✅ |

---

## Key Learnings

### From Lighting:
- ✅ Toggles are more semantic than intensity=0
- ✅ 4 toggles enable 2^4 combinations
- ✅ Can improve accessibility without reducing props

### From Environment:
- ✅ Props < 5% visual impact can be hardcoded
- ✅ Removing props is often better than adding
- ✅ Accessibility improvement is measurable and valuable

### From BreathingSphere:
- ✅ Complex state deserves rich props interface
- ✅ Context override enables flexibility
- ✅ Closure pattern in useFrame improves performance

---

## 171+ Prop Documentation System

The breathe-together-v2 codebase maintains a comprehensive prop inventory with standardized JSDoc documentation:

### Prop Locations & Inventory

**Visual Props (17 total)** - `src/entities/breathingSphere/index.tsx:20-181`
- colorExhale, colorInhale, opacity, scaleRange, coreStiffness, mainResponsiveness, auraElasticity, detail

**Lighting Props (9 total)** - `src/entities/lighting/index.tsx:13-152`
- preset, intensity, ambientIntensity, ambientColor, keyIntensity, keyColor, fillIntensity, fillColor, rimIntensity, rimColor

**Environment Props (13 total)** - `src/entities/environment/index.tsx:13-174`
- enableStars, starsCount, enableFloor, floorColor, floorOpacity, enablePointLight, lightIntensityMin, lightIntensityRange, preset, enableSparkles, sparklesCount

**Particle Config Props (7 total)** - `src/entities/particle/config.ts`
- Geometry (detail, segments), Material (metalness, roughness), Size (minScale, maxScale, spread)

### Centralized Defaults

All props reference centralized configuration for consistency:

**Location:** `src/config/sceneDefaults.ts`
- VISUAL_DEFAULTS - backgroundColor, sphere colors, opacity
- LIGHTING_DEFAULTS - preset, intensity, individual light configs
- POST_PROCESSING_DEFAULTS - bloom settings

### JSDoc Standard

All props follow the standardized 7-section JSDoc format:
1. **Technical Description** (required) - What the prop does
2. **Detailed Explanation** (optional) - 1-2 sentences of context
3. **"When to adjust"** (recommended) - Contextual use cases
4. **"Typical range"** (recommended) - Visual landmarks with labels
5. **"Interacts with"** (recommended) - Related props
6. **"Performance note"** (optional) - If significant impact
7. **Triplex Annotations** (required) - @min/@max/@step/@type/@enum/@default

This ensures consistency, discoverability, and optimal Triplex editor experience across all 171+ props.

---

## Reference

For complete technical details:
- **reference.md** - All 4 angles explained
- **patterns.md** - Good vs bad patterns
- **workflows/** - Step-by-step procedures
- **SKILL.md** - Getting started

These examples demonstrate the patterns documented in the skill. When creating new entities or improving existing ones, refer back to these real implementations.
