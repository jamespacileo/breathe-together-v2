# Unified Entity Technical Reference

Complete technical specifications for all 4 angles, 3 archetypes, and entity patterns in breathe-together-v2.

---

## Table of Contents

1. [Angle 1: ECS Architecture](#angle-1-ecs-architecture)
2. [Angle 2: Triplex Integration](#angle-2-triplex-integration)
3. [Angle 3: Performance Tuning](#angle-3-performance-tuning)
4. [Angle 4: Debug Tools](#angle-4-debug-tools)
5. [Entity Archetypes](#entity-archetypes)
6. [System Execution Pipeline](#system-execution-pipeline)
7. [Prop Threading Pattern](#prop-threading-pattern)
8. [Config Integration](#config-integration)
9. [Quality Presets System](#quality-presets-system)

---

## Angle 1: ECS Architecture

### Trait Patterns

**Marker Trait** (existence flag)
```typescript
// traits.tsx
export const MyMarker = trait();

// Spawn
const entity = world.spawn(MyMarker);

// Query
world.query([MyMarker]).forEach(entity => {
  // Entity has this marker
});
```

**Value Trait** (single numeric value)
```typescript
// traits.tsx
export const Scale = trait<number>();

// Spawn with default
const entity = world.spawn(Scale(1.0));

// Update
entity.set(Scale, 2.0);

// Query
const scaledEntities = world.query([Scale]);
```

**Vector3 Trait** (x, y, z coordinates)
```typescript
// traits.tsx
export const Position = trait<[x: number, y: number, z: number]>();

// Spawn
const entity = world.spawn(Position([0, 0, 0]));

// Update
entity.set(Position, [1, 2, 3]);
```

**Config Trait** (complex nested properties)
```typescript
// traits.tsx
interface SphereConfig {
  opacity: number;
  chromaticAberration: number;
  fresnelIntensityBase: number;
  fresnelIntensityMax: number;
}
export const SphereConfiguration = trait<SphereConfig>();

// Spawn with full config
const entity = world.spawn(
  SphereConfiguration({
    opacity: 0.7,
    chromaticAberration: 0.02,
    fresnelIntensityBase: 0.3,
    fresnelIntensityMax: 1.0,
  })
);
```

### System Patterns

**Direct System** (queries and updates)
```typescript
export function mySystem(world: World) {
  world.query([MyTrait, AnotherTrait]).forEach(entity => {
    const value = entity.get(MyTrait);
    // Update based on value
    entity.set(MyTrait, newValue);
  });
}
```

**Closure System** (with state/delta time)
```typescript
export function animationSystem(world: World) {
  return (delta: number) => {
    world.query([Position, Velocity]).forEach(entity => {
      const pos = entity.get(Position);
      const vel = entity.get(Velocity);

      // Update position based on velocity and delta
      const newPos: [number, number, number] = [
        pos[0] + vel[0] * delta,
        pos[1] + vel[1] * delta,
        pos[2] + vel[2] * delta,
      ];

      entity.set(Position, newPos);
    });
  };
}
```

### React + ECS Integration

**Component Spawns Entity**
```typescript
export function MyEntity({ scale = 1 }: MyEntityProps) {
  const world = useWorld();

  useEffect(() => {
    const entity = world.spawn(
      MyMarker,
      Position([0, 0, 0]),
      Scale(scale),
      MyConfig(/* ... */)
    );

    return () => entity.destroy();
  }, [world, scale]);

  return <group>/* render */</group>;
}
```

---

## Angle 2: Triplex Integration

### Flat Props Requirement

**❌ WRONG - Nested objects (Triplex can't edit)**
```typescript
interface Props {
  position?: { x: number; y: number; z: number };
  scale?: { x: number; y: number; z: number };
}
```

**✅ CORRECT - Flat scalar props (Triplex editable)**
```typescript
interface Props {
  positionX?: number;
  positionY?: number;
  positionZ?: number;
  scaleX?: number;
  scaleY?: number;
  scaleZ?: number;
}
```

### Comprehensive JSDoc Pattern

Every prop should include:
```typescript
/**
 * One-line description of what this prop controls.
 *
 * More detailed explanation. How it affects the visual/behavior.
 *
 * **When to adjust:** Specific use cases and scenarios
 * **Typical range:** Visual landmarks (Low (0.1) → Standard (0.5) → Strong (1.0))
 * **Interacts with:** Related props that affect/are affected
 * **Performance note:** GPU/CPU impact (if significant)
 *
 * @min 0
 * @max 1
 * @step 0.05
 * @default 0.5
 * @type slider
 */
ambientIntensity?: number;
```

**JSDoc Annotation Types:**
- `@type slider` - Numeric range input
- `@type color` - Color picker
- `@type toggle` - Boolean checkbox
- `@type text` - Text input
- `@type vector3` - 3D position (as three floats)

### Scene Threading Pattern

**3-tier scene integration:**

**Tier 1: Production Scene** (`breathing.tsx`)
```typescript
export function BreathingLevel({
  // Props passed in
  sphereOpacity = VISUAL_DEFAULTS.sphereOpacity,
  enableAmbient = LIGHTING_DEFAULTS.enableAmbient,
  // ...
}: Partial<BreathingLevelProps> = {}) {
  return (
    <>
      <BreathingSphere opacity={sphereOpacity} />
      <Lighting enableAmbient={enableAmbient} />
    </>
  );
}
```

**Tier 2: Experimental Scene** (`breathing.scene.tsx`)
```typescript
export function BreathingScene(props: BreathingSceneProps) {
  return (
    <BreathCurveProvider config={/* ... */}>
      <BreathingLevel {...props} />
    </BreathCurveProvider>
  );
}
```

**Tier 3: Debug Scene** (`breathing.debug.scene.tsx`)
```typescript
export function BreathingDebugScene(props: BreathingDebugSceneProps) {
  return (
    <BreathDebugProvider config={/* ... */}>
      <ParticleDebugProvider config={/* ... */}>
        <BreathingLevel {...visibleProps} />
        <BreathDebugVisuals showOrbitBounds={showOrbitBounds} />
      </ParticleDebugProvider>
    </BreathDebugProvider>
  );
}
```

### sceneDefaults.ts Integration

**Entry pattern:**
```typescript
export const MY_ENTITY_DEFAULTS = {
  value: {
    propA: 0.5,
    propB: 10,
    propC: "#ffffff",
  },
  meta: {
    propA: {
      whenToAdjust: "Increase for more intensity",
      typicalRange: "0.1 (subtle) → 0.5 (standard) → 1.0 (strong)",
      interactsWith: ["propB", "lighting"],
      performanceNote: "Minimal GPU impact",
    },
    // ...
  },
} as const;

export function getDefaultValues<T extends keyof typeof MY_ENTITY_DEFAULTS>(
  preset: T
): typeof MY_ENTITY_DEFAULTS[T]["value"] {
  return MY_ENTITY_DEFAULTS[preset].value;
}
```

---

## Angle 3: Performance Tuning

### Instanced Rendering Pattern

**Single InstancedMesh for 300 particles = 1 draw call**
```typescript
const particleCount = 300;
const geometry = useMemo(() => new BufferGeometry(), []);
const material = useMemo(() => new MeshStandardMaterial(), []);

return (
  <instancedMesh
    args={[geometry, material, particleCount]}
    ref={instancedMeshRef}
  >
    {/* All instances share geometry and material */}
  </instancedMesh>
);

// Update instances per frame
useFrame(() => {
  for (let i = 0; i < particleCount; i++) {
    const matrix = new Matrix4();
    matrix.setPosition(positions[i]);
    matrix.scale(new Vector3(scales[i], scales[i], scales[i]));
    instancedMeshRef.current?.setMatrixAt(i, matrix);
  }
  instancedMeshRef.current?.instanceMatrix.needsUpdate = true;
});
```

### Quality Preset System

**Three preset levels:**
```typescript
export const SCENE_DEFAULTS = {
  // ... other defaults ...
  particleCount: 200,  // Medium quality default
  // ...
};

export function applyQualityPreset(preset: 'low' | 'medium' | 'high') {
  switch (preset) {
    case 'low':
      return {
        particleCount: 100,
        sphereSegments: 32,
        ambientIntensity: 0.5,
      };
    case 'medium':
      return {
        particleCount: 200,
        sphereSegments: 64,
        ambientIntensity: 0.4,
      };
    case 'high':
      return {
        particleCount: 300,
        sphereSegments: 128,
        ambientIntensity: 0.3,
      };
  }
}
```

### useFrame Optimization

**Closure pattern with memoized calculations:**
```typescript
useFrame((state, delta) => {
  // Calculate once, use multiple times
  const breathEntity = world.queryFirst(BreathPhase);
  const phase = breathEntity?.get(BreathPhase)?.value ?? 0;

  // Update shader uniforms
  material.uniforms.uBreathPhase.value = phase;
  material.uniforms.uTime.value += delta;

  // Update instance matrices
  for (let i = 0; i < particleCount; i++) {
    // Reuse vectors instead of creating new ones
    tempVector.copy(positions[i]);
    tempVector.y += Math.sin(phase) * 0.5;

    tempMatrix.setPosition(tempVector);
    instancedMesh.setMatrixAt(i, tempMatrix);
  }
  instancedMesh.instanceMatrix.needsUpdate = true;
});
```

---

## Angle 4: Debug Tools

### Debug Context Pattern

**Context definition:**
```typescript
export interface BreathDebugConfig {
  manualPhaseOverride?: number;  // 0-1 override
  isPaused?: boolean;             // Freeze animation
  timeScale?: number;             // Speed multiplier (0.1-5.0)
  jumpToPhase?: 0 | 1 | 2 | 3;   // Jump to phase
  showOrbitBounds?: boolean;      // Visual debug overlay
  showPhaseMarkers?: boolean;     // Colored torus rings
  showTraitValues?: boolean;      // Real-time display
}

export const BreathDebugContext = createContext<BreathDebugConfig | null>(null);

export function useBreathDebug(): BreathDebugConfig | null {
  return useContext(BreathDebugContext) || null;
}
```

**Provider wrapper:**
```typescript
export function BreathDebugProvider({
  config,
  children
}: {
  config: BreathDebugConfig | null;
  children: React.ReactNode;
}) {
  return (
    <BreathDebugContext.Provider value={config}>
      {children}
    </BreathDebugContext.Provider>
  );
}
```

### Manual Control Props

**Entity props for debug control:**
```typescript
interface BreathingDebugSceneProps {
  // Manual override
  enableManualControl?: boolean;
  manualPhase?: number;  // 0-1 within phase

  // Playback controls
  isPaused?: boolean;
  timeScale?: number;  // 0.1x to 5.0x speed

  // Jump controls
  jumpToPhase?: 0 | 1 | 2 | 3;  // 0=Inhale, 1=Hold-in, 2=Exhale, 3=Hold-out

  // Visual debug overlays
  showOrbitBounds?: boolean;
  showPhaseMarkers?: boolean;
  showTraitValues?: boolean;
}
```

### Visual Debug Overlays

**Orbit bounds visualization:**
```typescript
function OrbitBounds({ phase }: { phase: number }) {
  // Three colored spheres showing particle orbit range
  return (
    <group>
      {/* Minimum orbit (1.5) */}
      <mesh>
        <sphereGeometry args={[1.5, 32, 32]} />
        <lineBasicMaterial color={0x00ff00} />
      </mesh>

      {/* Current orbit (interpolated) */}
      <mesh scale={[1.5 + phase * 2, 1.5 + phase * 2, 1.5 + phase * 2]}>
        <sphereGeometry args={[1, 32, 32]} />
        <lineBasicMaterial color={0xffff00} />
      </mesh>

      {/* Maximum orbit (3.5) */}
      <mesh scale={[3.5, 3.5, 3.5]}>
        <sphereGeometry args={[1, 32, 32]} />
        <lineBasicMaterial color={0xff0000} />
      </mesh>
    </group>
  );
}
```

**Phase markers:**
```typescript
function PhaseMarkers({ currentPhase }: { currentPhase: number }) {
  const phases = [
    { name: 'Inhale', color: 0x00ff00, position: [0, 3, 0] },
    { name: 'Hold-in', color: 0x0088ff, position: [3, 0, 0] },
    { name: 'Exhale', color: 0xff0000, position: [0, -3, 0] },
    { name: 'Hold-out', color: 0xffff00, position: [-3, 0, 0] },
  ];

  return (
    <>
      {phases.map((phase, i) => (
        <mesh key={i} position={phase.position}>
          <torusGeometry args={[2, 0.1, 32, 100]} />
          <meshBasicMaterial
            color={phase.color}
            emissive={currentPhase === i ? phase.color : 0x000000}
          />
        </mesh>
      ))}
    </>
  );
}
```

---

## Entity Archetypes

### Archetype A: Visual-Only

**File structure:**
```
src/entities/lighting/
└── index.tsx  (only file)
```

**Characteristics:**
- Single React component, no ECS
- 10-20 flat props with comprehensive JSDoc
- Props-to-config conversion (optional internal helper)
- No traits or systems
- Heavy Triplex annotations

**Example:**
```typescript
interface LightingProps {
  /** @min 0, @max 1, @step 0.05, @default 0.4 */
  ambientIntensity?: number;

  enableAmbient?: boolean;
  // ... more props
}

export function Lighting({
  ambientIntensity = LIGHTING_DEFAULTS.ambientIntensity,
  enableAmbient = true,
  // ...
}: LightingProps = {}) {
  return (
    <group>
      {enableAmbient && (
        <ambientLight intensity={ambientIntensity} />
      )}
      {/* Other lights */}
    </group>
  );
}
```

### Archetype B: Simple ECS

**File structure:**
```
src/entities/camera/
├── index.tsx
├── traits.tsx
└── systems.tsx
```

**Characteristics:**
- 1-3 traits (often just marker)
- 1-2 simple systems
- Minimal or no props
- Focus on behavior, not configuration
- Entity spawns in useEffect

**Example:**
```typescript
// traits.tsx
export const CameraTrait = trait();

// index.tsx
export function Camera() {
  const world = useWorld();

  useEffect(() => {
    const entity = world.spawn(CameraTrait);
    return () => entity.destroy();
  }, [world]);

  return <PerspectiveCamera />;
}

// systems.tsx
export function cameraFollowFocusedSystem(world: World) {
  return () => {
    // Update camera position
  };
}
```

### Archetype C: Complex ECS

**File structure:**
```
src/entities/breathingSphere/
├── index.tsx       (main component)
├── traits.tsx      (data definitions)
├── systems.tsx     (update logic)
└── config.ts       (optional, complex configuration)
```

**Characteristics:**
- 5-10 traits with complex state
- Multiple systems, closure pattern for performance
- 10-20 flat props with rich Triplex annotations
- Debug context provider integration
- Config conversion layer
- Quality preset support
- Breathing synchronization

**Example:**
```typescript
// traits.tsx
export const SphereScale = trait<number>();
export const SphereConfig = trait<SphereConfigType>();

// index.tsx - Props interface
interface BreathingSphereProps {
  opacity?: number;
  chromaticAberration?: number;
  fresnelIntensityMax?: number;
  segments?: number;
  breathSyncEnabled?: boolean;
  // ... many more
}

// index.tsx - Component
export function BreathingSphere({
  opacity = DEFAULTS.opacity,
  breathSyncEnabled = true,
  // ...
}: Partial<BreathingSphereProps> = {}) {
  const world = useWorld();
  const triplexConfig = useTriplexConfig?.();
  const debugConfig = useBreathDebug?.();

  useEffect(() => {
    const finalConfig = {
      ...getPropsConfig(opacity, chromaticAberration),
      ...triplexConfig?.sphereConfig,
    };

    const entity = world.spawn(
      SphereScale(1.0),
      SphereConfig(finalConfig)
    );

    return () => entity.destroy();
  }, [world, opacity, triplexConfig]);

  return <mesh ref={meshRef} />;
}

// systems.tsx - Closure pattern
export function sphereAnimationSystem(world: World) {
  const tempVector = new Vector3();
  const tempMatrix = new Matrix4();

  return (delta: number) => {
    const breathEntity = world.queryFirst(BreathPhase);
    const phase = breathEntity?.get(BreathPhase)?.value ?? 0;

    world.query([SphereScale, SphereConfig]).forEach(entity => {
      // Update based on phase
      const targetScale = 0.5 + phase * 0.5;
      entity.set(SphereScale, targetScale);
    });
  };
}
```

---

## System Execution Pipeline

**breathe-together-v2 executes 6 systems per frame in order:**

```
Frame Start
  ↓
1. breathSystem
   - Calculates global breath phase (UTC-based)
   - Updates BreathPhase trait for all entities
   ↓
2. cursorPositionFromLandSystem
   - Raycasts from camera to land
   - Updates CursorPosition trait
   ↓
3. velocityTowardsTargetSystem
   - Applies velocity toward target positions
   - Updates Velocity trait
   ↓
4. positionFromVelocity
   - Integrates velocity into position
   - Updates Position trait based on delta time
   ↓
5. meshFromPosition
   - Syncs ECS Position → Three.js mesh position
   - Updates mesh transforms
   ↓
6. cameraFollowFocusedSystem
   - Moves camera to follow focused entity
   - Updates Camera position
   ↓
Frame Render
```

**Critical:** System order matters. Changing execution order can cause unexpected behavior.

---

## Prop Threading Pattern

**Single source of truth → 3 scene layers:**

```
src/config/sceneDefaults.ts (SINGLE SOURCE OF TRUTH)
    ↓
src/types/sceneProps.ts (TYPES + JSDOC)
    ↓
src/levels/breathing.tsx (PRODUCTION)
    │
    ├→ breathing.scene.tsx (EXPERIMENTAL)
    │
    └→ breathing.debug.scene.tsx (DEBUG)
        ↓
Entity Components (consume props, optional context override)
```

**Example flow:**
1. **sceneDefaults.ts** defines: `LIGHTING_DEFAULTS.ambientIntensity = 0.4`
2. **sceneProps.ts** types it: `ambientIntensity?: number` with JSDoc
3. **breathing.tsx** uses it: `<Lighting ambientIntensity={ambientIntensity} />`
4. **breathing.scene.tsx** passes it through: `<BreathingLevel {...allProps} />`
5. **breathing.debug.scene.tsx** allows override via context

---

## Config Integration

**Centralized configuration approach:**

- **sceneDefaults.ts** - All defaults with metadata (whenToAdjust, typicalRange, etc.)
- **sceneProps.ts** - Shared type definitions with JSDoc
- **No per-entity config files** - Keeps centralization
- **Entity-specific only if necessary** - e.g., particle/config.ts for complex particle visual configs

**Benefit:** Change one value, all 3 scenes update automatically.

---

## Quality Presets System

**Three preset tiers:**

| Preset | Particles | Segments | Ambient | Notes |
|--------|-----------|----------|---------|-------|
| **low** | 100 | 32 | 0.5 | Mobile-friendly |
| **medium** | 200 | 64 | 0.4 | Production default |
| **high** | 300 | 128 | 0.3 | Showcase quality |
| **custom** | User | User | User | Manual control |

**Usage pattern:**
```typescript
const quality = 'medium';  // or 'low' or 'high'
const config = applyQualityPreset(quality);

return (
  <BreathingSphere
    particleCount={config.particleCount}
    sphereSegments={config.sphereSegments}
    ambientIntensity={config.ambientIntensity}
  />
);
```

---

## Key Takeaways

- **ECS:** Traits = data, Systems = behavior, React = visual
- **Triplex:** Flat scalar props, comprehensive JSDoc, quality presets
- **Performance:** Instancing, shader optimization, quality presets, useFrame closure pattern
- **Debug:** Contexts for zero production pollution, visual overlays, manual controls
- **Threading:** Single source (sceneDefaults.ts) → 3 layers → entities
- **Archetypes:** Visual-Only (simple), Simple ECS (behavior), Complex ECS (rich state)

For detailed workflows, see the `workflows/` directory.
For real code examples, see `examples.md`.
For reusable patterns and anti-patterns, see `patterns.md`.
