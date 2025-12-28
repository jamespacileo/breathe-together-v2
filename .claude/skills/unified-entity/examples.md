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

// Comprehensive JSDoc example
/**
 * Enable ambient light (soft base illumination).
 *
 * **When to adjust:** Always on (provides base light)
 * **Typical range:** 0.3 (subtle) → 0.4 (standard) → 0.6 (bright)
 * **Interacts with:** ambientIntensity, keyIntensity
 *
 * @type boolean
 * @default true
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

// Comprehensive JSDoc example
/**
 * Sphere opacity (0 = transparent, 1 = opaque)
 *
 * **When to adjust:** Reduce for subtle focus, increase for prominence
 * **Typical range:** 0.3 (subtle) → 0.7 (standard) → 1.0 (solid)
 * **Interacts with:** fresnelIntensityMax (higher intensity needs lower opacity)
 *
 * @type slider
 * @min 0
 * @max 1
 * @step 0.05
 * @default 0.7
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

## Reference

For complete technical details:
- **reference.md** - All 4 angles explained
- **patterns.md** - Good vs bad patterns
- **workflows/** - Step-by-step procedures
- **SKILL.md** - Getting started

These examples demonstrate the patterns documented in the skill. When creating new entities or improving existing ones, refer back to these real implementations.
