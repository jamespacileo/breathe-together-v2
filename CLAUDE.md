# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**breathe-together-v2** is a 3D interactive breathing meditation application built with React, Three.js, and a Koota-based ECS (Entity-Component-System) architecture. It synchronizes users globally using UTC time to breathe together in a 4-7-8 relaxation breathing pattern (4s inhale, 7s hold, 8s exhale).

## Essential Commands

```bash
npm run dev          # Start Vite dev server (localhost:5173) with Triplex visual editor
npm run build        # Production build to dist/
npm run typecheck    # TypeScript type checking
```

## Architecture: ECS Pattern with React Components

This codebase uses **Entity-Component-System (ECS)** via Koota for decoupling behavior from rendering.

### Key Concepts

**React Components as Entities:**
- Components in `src/entities/` are "entities" that register themselves with the Koota world
- They typically render a Three.js `<group>` and spawn themselves as entities with "traits" (in a useEffect)
- A component alone does nothing—systems define behavior

**Traits:**
- Data containers attached to entities (e.g., Position, Velocity, breathPhase)
- Immutable; updated by systems each frame
- Defined in `src/shared/traits.tsx` and entity-specific files

**Systems:**
- Pure functions called every frame in sequence (order matters!)
- Query entities by trait combinations and update them
- Defined in entity-specific files (e.g. `src/entities/breath/systems.tsx`)
- Execution order is defined in `src/providers.tsx` → `KootaSystems` component

### Core Behavior Loop

Systems run in this sequence each frame (see `src/providers.tsx`):

1. **breathSystem** — Updates breath phase, radius, scale based on UTC time
2. **particlePhysicsSystem** — Updates particle positions and velocities

## Project Structure

```
src/
├── entities/              # ECS entities (React components + trait spawning)
│   ├── breath/           # Central breathing state (traits + breathSystem)
│   ├── breathingSphere/  # Visual 3D sphere (scales with breathing phase)
│   ├── particle/         # Presence particles (mood colors)
│   └── camera/           # CameraRig (non-ECS)
├── levels/               # "Level" scenes (breathing.tsx is main, debug.tsx for testing)
├── components/           # React UI components (BreathingHUD overlay)
├── hooks/               # usePresence — simulated presence data
├── shared/
│   └── traits.tsx       # Common traits (Position, Velocity, etc.)
├── lib/
│   ├── breathCalc.ts    # Pure breath calculation (returns phase, radius, scale)
│   ├── fibonacciSphere.ts  # Even particle distribution on sphere
│   ├── colors.ts        # Maps mood ID to color
│   └── mockPresence.ts  # Simulated user data (when API is unavailable)
├── providers.tsx        # Root providers (Koota world + KootaSystems)
├── app.tsx             # App component root
└── types.tsx           # Shared TypeScript types

.github/workflows/pages.yml   # GitHub Actions: build → deploy to Pages
vite.config.mts              # Vite config (dynamic base URL for Pages)
tsconfig.json               # Strict TypeScript
```

## Breath Calculation

Located in `src/lib/breathCalc.ts`, this is a pure function that returns the current breath state based on UTC time. It's called by `breathSystem` each frame.

**4-7-8 relaxation breathing cycle (19 seconds total):**
- 0-4s: Inhale
- 4-11s: Hold-in
- 11-19s: Exhale
- (No hold-out - immediate transition to next inhale)

**Outputs:**
- `breathPhase` (0-1): Position in current phase
- `phaseType` (0-3): Which phase (0=inhale, 1=hold-in, 2=exhale, 3=hold-out)
- `orbitRadius`: Particle orbit radius (shrinks on exhale, grows on inhale)
- `sphereScale`: Central sphere scale (inverse of particles)
- `crystallization`: Shader parameter for visual effect

**Key detail:** Uses `Date.now()` so all users globally see the same phase at the same time.

## Testing

**Status:** No automated test framework configured. TypeScript typecheck is the primary validation.

To add automated testing, consider Vitest (integrates with Vite).

## Deployment

GitHub Actions (`.github/workflows/pages.yml`) auto-deploys on every push to `main`:

1. Installs dependencies
2. Builds with `npm run build`
3. Runs `npm run typecheck`
4. Deploys `dist/` to GitHub Pages

**Setup:** In GitHub repository settings → Pages, set source to "GitHub Actions".

**Base URL:** Dynamically set from `GITHUB_REPOSITORY` env var, defaulting to "breathe-together-v2" for local builds.

## Presence & User Data

**Presence (MVP):**
- `src/hooks/usePresence.ts` — simulated presence data only
- Uses `src/lib/mockPresence.ts` to generate counts
- No network calls or heartbeats

**Particles:**
- `src/entities/particle/index.tsx` uses presence data
- 300 particles distributed on Fibonacci sphere (even coverage)
- Colors map moods to RGB (see `src/lib/colors.ts`)
- Animations: orbit radius and scale driven by breathing phase

## Working with Triplex

Triplex is a visual 3D component editor integrated into the dev server.

**Run:** `npm run dev` then open Triplex UI in browser

**Editable files:** Any `*.tsx` in `src/entities/`, `src/levels/`, `src/components/`

**In Triplex:**
- Drag components to place them
- Inspect and edit props in the sidebar
- Changes hot-reload
- Use `.triplex/config.json` to configure the editor

### Triplex Integration: Focused Controls

The MVP keeps Triplex props intentionally small and high-signal. Defaults live in
`src/config/sceneDefaults.ts`, and types are centralized in `src/types/sceneProps.ts`.

**Primary controls (most used):**
- `backgroundColor`, `sphereColor`, `sphereOpacity`, `sphereDetail`
- `particleCount`
- `ambientIntensity`, `ambientColor`, `keyIntensity`, `keyColor`

**Environment toggles:**
- `enableStars`, `starsCount`
- `enableFloor`, `floorColor`, `floorOpacity`
- `enablePointLight`, `lightIntensityMin`, `lightIntensityRange`

**Debug-only (debug scene):**
- Manual controls: `enableManualControl`, `manualPhase`, `isPaused`, `timeScale`, `jumpToPhase`
- Visual overlays: `showOrbitBounds`, `showPhaseMarkers`, `showTraitValues`
- Particle debug: `showParticleTypes`, `showParticleStats`
- Experimental: `curveType`, `waveDelta`, `showCurveInfo`

**Examples:**
```typescript
<BreathingLevel sphereColor="#ff0000" particleCount={200} />
<BreathingDebugScene showParticleStats enableManualControl />
```

### Triplex Prop Pattern (Updated Dec 2024)

**Key Rule:** Use **literal values** in component function parameter defaults, not computed or variable defaults.

**Why?** Triplex uses compile-time static analysis (AST parsing) to extract component metadata. It cannot:
- Execute functions like `getDefaultValues()`
- Resolve runtime object spreads (`...DEFAULT_PROPS`)
- Trace complex data flows

It **can** only:
- Read literal values: `'#4dd9e8'`, `0.15`, `true`, `'studio'`
- Parse simple expressions: `5 * 2`, `'hello' + 'world'`

**Pattern:**
```typescript
// ❌ DON'T: Variable default (Triplex shows {variableName} with ⚠️)
export function MyComponent({ color = DEFAULT_PROPS.color }: Props) { }

// ✅ DO: Literal default (Triplex displays actual value)
export function MyComponent({ color = '#4dd9e8' }: Props) { }
```

**Type definitions:** `src/types/sceneProps.ts`
- `SharedVisualProps` — backgroundColor, sphereColor, sphereOpacity, etc.
- `SharedEnvironmentProps` — environment preset, atmospheric density
- `BreathingDebugProps` — manual phase control, pause/play, etc.
- `ParticleDebugProps` — particle debug flags

**Defaults location:** Component function signatures in `src/entities/*/index.tsx` and `src/levels/*.tsx`
- All Triplex-editable props use literal values in function signatures
- JSDoc @default decorators match the function signature defaults
- `src/config/sceneDefaults.ts` is deprecated (kept as reference only)

### JSDoc Template for Properties

All 171+ entity props follow this standardized format for consistent help text:

```typescript
/**
 * [One-line summary describing what the prop does]
 *
 * [Detailed explanation of behavior and units]
 *
 * **When to adjust:** [Contextual use case: "Dark backgrounds need 0.4-0.6, light backgrounds need 0.1-0.3"]
 * **Typical range:** [Visual landmarks: "Dim (0.2) → Standard (0.4) → Bright (0.6) → Washed (0.8+)"]
 * **Interacts with:** [Related props, e.g., "backgroundColor, keyIntensity, fillIntensity"]
 * **Performance note:** [If relevant: "Linear impact on initialization; no runtime cost after creation"]
 *
 * @min X
 * @max Y
 * @step Z
 * @default value (production baseline: [context])
 */
```

**Example (Ambient Light):**
```typescript
/**
 * Ambient light intensity (non-directional base illumination).
 *
 * Provides uniform lighting across entire scene. Foundation for all lighting.
 * Lower = darker shadows, higher = flatter appearance.
 *
 * **When to adjust:** Dark backgrounds (0.4-0.6) for contrast, light backgrounds (0.1-0.3) to avoid washout
 * **Typical range:** Dim (0.2) → Standard (0.4, balanced) → Bright (0.6) → Washed (0.8+)
 * **Interacts with:** backgroundColor, keyIntensity, fillIntensity
 * **Performance note:** No impact; computed per-fragment
 *
 * @min 0
 * @max 1
 * @step 0.05
 * @default 0.4 (production baseline: balanced visibility)
 */
```

**Where to find prop documentation:**
- **Visual props:** `src/entities/breathingSphere/index.tsx` (17 props)
- **Environment props:** `src/entities/environment/index.tsx` (preset, atmosphere)
  - Uses drei Stage component for professional three-point lighting
  - Unified preset system: meditation, cosmic, minimal, studio
- **Particle config:** `src/entities/particle/config.ts` (7 props in geometry/material/size)
- **Scene props:** `src/types/sceneProps.ts` (all props with full metadata)

### How This Reduces Cognitive Load

**Before:** 54 props visible simultaneously in debug scene
- Users confused about where to start
- No clear relationship between related props
- Inconsistent help text ("glow" vs. "intensity" vs. "pulsing")
- Hard to find production baseline

**After:** Focused controls + standardized help
- Default view shows core props (background, sphere, lights, particles)
- Debug/experimental props live only in debug scenes
- "When to adjust" contextual guidance answers "why would I change this?"
- "Typical range" with visual landmarks (Dim/Standard/Bright) makes tuning intuitive
- "Interacts with" hints show related props
- Literal defaults in component signatures provide single source of truth

### Adjusting Defaults

**To adjust component defaults:**

1. Edit the component's function signature in `src/entities/*/index.tsx` or `src/levels/*.tsx`
   - Update the literal value in the parameter default
   - Example: `sphereColor = '#d4a574'` → `sphereColor = '#ff0000'`

2. Update the corresponding JSDoc `@default` decorator in the interface
   - Example: `@default '#d4a574'` → `@default '#ff0000'`

3. Both **must match** for consistency

**For complex values or physics constants:**
- Use `src/constants.ts` (e.g., `VISUALS.SPHERE_OPACITY`)
- Reference the constant in the function signature
- Update JSDoc @default to match the constant value

**Example:**
```typescript
// In src/entities/environment/index.tsx
interface EnvironmentProps {
  /**
   * Environment mood preset - controls lighting, shadows, HDR, and backdrop.
   * @enum ["meditation", "cosmic", "minimal", "studio"]
   * @default "meditation"
   */
  preset?: 'meditation' | 'cosmic' | 'minimal' | 'studio';

  /**
   * Atmospheric density multiplier (affects stars, sparkles, point light).
   * @min 0 @max 1 @step 0.1
   * @default 0.5
   */
  atmosphere?: number;
}

export function Environment({
  preset = 'meditation',  // ← Literal value
  atmosphere = 0.5,       // ← Literal value
}: EnvironmentProps) {
  const config = PRESET_MAP[preset]; // Maps to Stage preset, HDR, shadows
  return (
    <Stage preset={config.stage} intensity={0.4} shadows={config.shadows}>
      <Backdrop preset={preset} atmosphere={atmosphere} />
      <BreathStars preset={preset} atmosphere={atmosphere} />
      <BreathSparkles preset={preset} atmosphere={atmosphere} />
      <BreathPointLight atmosphere={atmosphere} />
    </Stage>
  );
}
```

### Triplex Composition Patterns

**Canonical Defaults Rule:** Entity components own all default values. Scenes re-declare defaults for:

1. **Triplex static analysis visibility** (when scene is the primary edit target)
2. **Scene-specific overrides** (e.g., debug scene with different baselines)

**Why redundancy exists:** Triplex requires literal values in function signatures for static analysis. Cannot use `import { DEFAULT }` as function param defaults.

**Three composition patterns:**

- **Pattern 1A (Entity Owns):** No scene-level defaults. Use for internal compositions not edited in Triplex.
  ```typescript
  export function BreathingLevel(props: Partial<BreathingLevelProps> = {}) {
    return <Environment {...props} />;  // Environment handles defaults
  }
  ```

- **Pattern 1B (Re-Declare for Triplex):** Scene re-declares all entity defaults for Triplex visibility. **RECOMMENDED for primary scenes.**
  ```typescript
  export function BreathingLevel({
    environmentPreset = 'meditation',  // Matches Environment entity default
    environmentAtmosphere = 0.5,       // Matches Environment entity default
  }: Partial<BreathingLevelProps> = {}) {
    return <Environment preset={environmentPreset} atmosphere={environmentAtmosphere} />;
  }
  ```

- **Pattern 2 (Scene Overrides):** Scene only declares properties that differ from entity defaults, with comments explaining why.
  ```typescript
  export function BreathingDebugScene({
    // DEBUG OVERRIDE: Higher opacity for debugging visibility (entity: 0.12)
    sphereOpacity = 0.25,
    // Other props use entity defaults (no declaration)
    ...restProps
  }: Partial<BreathingDebugSceneProps> = {}) {
    return <BreathingLevel sphereOpacity={sphereOpacity} {...restProps} />;
  }
  ```

**Guidelines:**
- Use Pattern 1B for Triplex-edited production scenes (breathingLevel.tsx)
- Use Pattern 2 for variant scenes with intentional overrides (breathing.debug.scene.tsx)
- Use Pattern 1A for internal/utility compositions
- Always document any default that differs from entity with a comment explaining why
- Never import constants for defaults (breaks Triplex static analysis)

See `docs/triplex/06-composition-patterns.md` for comprehensive guide with decision tree and examples.

## Important Implementation Details

### UTC Synchronization
All breathing state is derived from `Date.now()` % cycle length. This ensures every user breathes in sync globally without needing real-time communication.

### Easing
Box breathing uses `easeInOutQuad` for smooth, natural-feeling transitions. See `src/lib/breathCalc.ts`.

### Instanced Rendering
ParticleRenderer uses two instanced meshes (user + filler) for 2 draw calls.

### Fresnel Shader
BreathingSphere uses Three.js `Fresnel` shader for edge glow that intensifies during inhale.

### HUD Architecture (Updated Dec 2024)

The HUD uses **@react-three/uikit** for native 3D UI components inside the Canvas.

**Components:**
- `src/components/BreathingHUD3D.tsx` - Main uikit HUD component (bottom bar layout)
- `src/hooks/useBreathPhaseDisplay3D.ts` - RAF loop for 60fps updates

**Layout:** Bottom bar showing phase name, timer, progress bar, and user count
- Phase name (e.g., "Inhale") updates on transitions
- Timer counts down each second
- Progress bar reflects position in 16s breathing cycle (0-100%)
- User count from `usePresence()` hook

**Performance Pattern:**
- Same RAF loop as legacy HTML overlay
- Updates uikit components via refs (no React re-renders)
- GPU-accelerated 3D UI meshes
- Target: 60fps with <1ms overhead per frame
- Requires `gl={{ localClippingEnabled: true }}` on Canvas for uikit clipping planes

**Visual Style:**
- Subtle/transparent (minimalist): 45% opacity background
- Colors: warm white (#fffef7), teal (#7ec8d4), warm gray (#b8a896)
- Fonts: DM Sans (primary), Crimson Pro (phase name)
- Spacing: Fibonacci values (8, 13, 21, 34px)
- Responsive: Adjusts font sizes and padding on mobile

**Legacy Files (Deprecated):**
- `src/components/RadialBreathingHUD.legacy.tsx` - Old HTML overlay (circular ring)
- `src/components/BreathingHUD.legacy.tsx` - Old HTML overlay (corner panels)
- `src/hooks/useBreathPhaseDisplay.legacy.ts` - Old DOM ref pattern
Kept for reference only. Use BreathingHUD3D.tsx instead.

### Mobile Responsiveness (December 2024)

All UI/HUD components now adapt to mobile, tablet, and desktop viewports for optimal user experience across devices.

**Viewport Detection Hook:**
- `src/hooks/useViewport.ts` - Real-time viewport size and device type detection
- Breakpoints: Mobile (≤480px), Tablet (481px-768px), Desktop (769px+)
- Provides: `isMobile`, `isTablet`, `isDesktop`, `width`, `height`, `isPortrait`, `isLandscape`
- Performance: 100ms debounced resize listener to prevent excessive re-renders

**Responsive Components:**

1. **BreathingHUD3D** (`src/components/BreathingHUD3D.tsx`)
   - Adaptive padding: 16px (mobile) → 32px (tablet) → 60px (desktop)
   - Adaptive font sizes: Smaller on mobile for better fit
   - Progress bar width: 80px (mobile) → 120px (desktop)
   - All spacing scales proportionally with viewport

2. **SimpleGaiaUI** (`src/components/SimpleGaiaUI.tsx`)
   - Edge padding: 16px (mobile) → 24px (tablet) → 32px (desktop)
   - Modal padding: 24px (mobile) → 32px (tablet) → 40px (desktop)
   - Controls panel: Full width on mobile, fixed 260px on desktop
   - Controls position: Bottom-center on mobile, bottom-right on desktop
   - Phase indicator: Scaled fonts and tighter spacing on mobile
   - Modals: 90% width with smaller border radius on mobile

3. **InspirationalText** (`src/components/InspirationalText.tsx`)
   - Already uses responsive `clamp()` for padding and font sizes
   - No changes needed - good baseline pattern

**Responsive Utilities:**
```typescript
const { deviceType, isMobile, isTablet } = useViewport();
const padding = getResponsiveSpacing(deviceType, 16, 24, 32);
const fontSize = getResponsiveFontSize(deviceType, 0.875, 1, 1.125);
```

**Mobile-Specific Patterns:**
- Touch targets: Minimum 44px for buttons (Apple HIG compliance)
- Safe areas: Adaptive padding prevents notch/home indicator overlap
- Stacking: Elements stack vertically or center on narrow screens
- Modals: Use 90% width with reduced padding on mobile
- Text: Reduced letter-spacing and font sizes for readability

**Testing Mobile Layouts:**
- Browser DevTools: Toggle device toolbar (Cmd/Ctrl+Shift+M)
- Test viewports: 320px (iPhone SE), 375px (iPhone), 768px (iPad)
- Verify: No horizontal overflow, readable text, accessible touch targets

## Git Status

Branch: `main` (no uncommitted changes in tracked files)

Modified but staged changes:
- `src/entities/breathingSphere/index.tsx`
- `src/entities/particle/index.tsx`

## Common Development Patterns

**Adding a new entity:**
1. Create `src/entities/myEntity/index.tsx` — render Three.js group
2. In useEffect, spawn with `world.spawn()` and attach traits
3. Create `src/entities/myEntity/systems.tsx` — define update logic
4. Add system function to `KootaSystems` in `src/providers.tsx`

**Adding a new trait:**
1. Define in `src/shared/traits.tsx` or entity-specific file
2. Attach via `world.spawn()` or `trait.set(entity, value)`
3. Query via `world.query([TraitA, TraitB])` in systems

**Adding UI:**
- React components in `src/components/` (e.g., BreathingHUD)
- Rendered in `src/levels/breathing.tsx` (not as entities)
- Can read Koota world state via context if needed

## Debugging Tips

- Use browser DevTools → Console to check for errors
- Inspect Three.js via browser extension (three-devtools)
- Use Triplex inspector to visualize entity positions and traits
- Print system data: `console.log(world.query([...]))`
- Breath phase: `breathPhase * 100 | 0`% (0-100 per phase)

## Dependencies

**Critical:**
- `koota` — ECS state management (core loop)
- `three` + `@react-three/fiber` — 3D rendering
- `react` 19 — UI framework
- `typescript` 5.8 — Type safety

**Important:**
- `@react-three/drei` — Three.js helpers (Fresnel shader, etc.)
- `maath` — Easing helpers
- `simplex-noise` — Particle wind noise
- `vite` — Build tool

See `package.json` for full dependency tree and versions.

## Three.js Memory Management Patterns

All Three.js resources (geometries, materials, textures, render targets) consume GPU memory. React's lifecycle requires manual cleanup on unmount to prevent GPU memory leaks.

### GPU Resource Disposal Pattern

**Required pattern for all Three.js objects created with useMemo/useState:**

```typescript
const material = useMemo(() => new THREE.ShaderMaterial({
  uniforms: { time: { value: 0 } },
  fragmentShader: glslFragmentShader,
}), [glslFragmentShader]);

const geometry = useMemo(() => new THREE.IcosahedronGeometry(1, 4), []);

// CRITICAL: Always cleanup on unmount or when dependencies change
useEffect(() => {
  return () => {
    material.dispose();
    geometry.dispose();
  };
}, [material, geometry]);
```

### Resources That MUST Be Disposed

1. **Geometries**: `geometry.dispose()`
   - BufferGeometry, IcosahedronGeometry, SphereGeometry, BoxGeometry, etc.
   - Memory usage: Vertex data × buffer count

2. **Materials**: `material.dispose()`
   - MeshBasicMaterial, ShaderMaterial, MeshTransmissionMaterial, MeshStandardMaterial, etc.
   - Memory usage: Shader programs + uniforms + textures

3. **Textures**: `texture.dispose()`
   - Texture, DataTexture, VideoTexture, CanvasTexture
   - Memory usage: Image data (width × height × 4 bytes per pixel)

4. **Render Targets**: `renderTarget.dispose()`
   - WebGLRenderTarget, WebGLCubeRenderTarget
   - Memory usage: Target textures + depth buffer

### Resources That DON'T Need Disposal

- **drei components**: (`<Box />`, `<Sphere />`, `<Stars />`, `<Sparkles />`) — automatically disposed
- **Primitive wrappers**: `<primitive object={existingMesh} />` — ownership belongs to creator
- **Static imports**: Textures via `useLoader` — cached globally by React Three Fiber
- **Built-in geometries from drei**: Handled internally

### Common Pitfall: Ref-Based Disposal

When storing materials in refs, **dispose ref.current**, not the ref itself:

```typescript
// ❌ WRONG: Only disposes the wrapper object
const { materialRef } = useMemo(() => ({
  materialRef: { current: createFresnelMaterial(intensity) }
}), [intensity]);
// NO cleanup! Material is leaked!

// ✅ CORRECT: Dispose the actual material object
useEffect(() => {
  return () => {
    materialRef.current?.dispose();
  };
}, []);
```

### Debugging GPU Memory Leaks

1. Open Chrome DevTools → Memory tab
2. Take heap snapshot before component mounts
3. Mount/unmount component 5-10 times
4. Take second heap snapshot
5. Compare: Look for retained `THREE.BufferGeometry` and `THREE.Material` instances
6. Check "Detached DOM trees" for orphaned WebGL contexts

**Example leak signature**: `THREE.WebGLRenderer > WebGLContext > Textures array`

### Performance Impact

GPU memory leaks are **critical** because:
- WebGL context can run out of memory → "WebGL context lost" errors
- Memory not freed → browser crashes on sustained use
- Particularly bad on mobile (lower VRAM)

**Solution**: Always pair `useMemo` geometry/material creation with `useEffect` cleanup.

## Biome Linting Guidelines

### When to Use biome-ignore Comments

**biome-ignore comments must include a justification**. Never suppress without explaining why.

#### Approved Use Cases

**1. ECS Framework Workarounds**

```typescript
try {
  breathEntity.get(sometrait);
} catch (_e) {
  // Silently catch ECS errors during unmount/remount in Triplex
  // The Koota world becomes stale during hot-reload transitions
}
```

**2. Third-Party Type Limitations**

```typescript
// biome-ignore lint/suspicious/noExplicitAny: MeshTransmissionMaterial doesn't export instance type in @react-three/drei
const transmissionRef = useRef<any>(null);
```

**3. Performance-Critical Complexity**

```typescript
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Particle physics simulation requires multiple force calculations (spring, wind, jitter, repulsion) - refactoring would reduce readability
useFrame((state, delta) => {
  // Complex multi-force physics loop
});
```

#### Disallowed Use Cases

- ❌ "Fix later" comments → Create a separate issue or fix immediately
- ❌ Suppressing `useExhaustiveDependencies` without specific explanation
- ❌ Hiding type errors that should be properly typed
- ❌ Working around Biome bugs → Report upstream instead

### Empty Catch Blocks

**Only allowed for Koota ECS stale world errors:**

```typescript
// Pattern
try {
  // ECS operation
} catch (_e) {
  // Silently catch ECS errors during unmount/remount in Triplex
}
```

**Rationale:** Triplex hot-reload invalidates the Koota world while components are still mounted. Checking world validity before every operation would be too verbose and degrade developer experience.

**Alternative considered but rejected:** Checking `world.has(entity)` before operations. Too verbose (10+ extra lines per entity access).

### Hook Dependencies (`useExhaustiveDependencies`)

This rule is now **error** level (was warning). All external variables in hooks must be explicitly listed as dependencies.

**Correct:**
```typescript
useEffect(() => {
  const effect = () => console.log(dependency);
  effect();
}, [dependency]); // ✅ dependency is in the array
```

**Incorrect:**
```typescript
useEffect(() => {
  const effect = () => console.log(dependency);
  effect();
  // ❌ Missing 'dependency' in array — will break on re-renders
}, []);
```

### TypeScript `any` Usage

**Zero tolerance except for:**
1. Third-party libraries without exported types (@react-three/uikit refs)
2. Three.js material refs when type is inaccessible
3. External data structures with unknown shape

**Always prefer:**
- `unknown` for truly unknown types
- Proper interface definition for data
- Type assertions with comments explaining runtime safety

**Example:**
```typescript
// ❌ No explanation
const ref = useRef<any>(null);

// ✅ Justified
// biome-ignore lint/suspicious/noExplicitAny: @react-three/uikit v1.0.60 doesn't export Container/Text types; using Object3D fallback
const ref = useRef<any>(null);
```

### Optional Chain vs Logical AND

Rule `useOptionalChain` is now **error** level. Use `?.` instead of `&&` chains:

**Correct:**
```typescript
const value = obj?.prop?.nested; // ✅ Modern, short-circuit safe
```

**Incorrect:**
```typescript
const value = obj && obj.prop && obj.prop.nested; // ❌ Verbose, same result
```

## Recent Changes (December 2024)

### WebGL Context Loss Resolution

**Problem:** EarthGlobe component was running a complex 3-pass refraction rendering pipeline that conflicted with ParticleSwarm's refraction pipeline, causing WebGL context loss and blank canvas.

**Solution:** Simplified EarthGlobe to use a basic sphere with MeshPhongMaterial instead of r3f-globe with complex refraction:
- Removed `useRefractionRenderPipeline` hook
- Removed complex multi-pass rendering logic (~120 lines)
- Replaced with simple solid-colored sphere (warm brown earth tone: #8b6f47)
- Maintained breathing animation and rotation via ECS breathPhase trait
- Added frosted glass overlay for visual consistency with ParticleSwarm shards
- Reduced scale from 2.5 to 1.2 for better visibility

**Result:** Application now renders all components successfully:
- ✅ EarthGlobe: Central brown sphere with frosted glass overlay
- ✅ ParticleSwarm: White icosahedral shards orbiting Earth
- ✅ AtmosphericParticles: Cyan floating dots with breathing synchronization
- ✅ Environment: Light cream background with proper lighting
- ✅ BreathingHUD3D: Breathing timer and user count
- ✅ All entities synchronized via UTC-based breathing cycle

### Code Cleanup

**Deleted Orphaned Files:**
- `src/entities/background/ProceduralBackground.tsx` (never imported)
- `src/entities/environment/BackgroundParticles.tsx` (unused)
- `src/entities/background/` (empty directory)

**Fixed Issues:**
- ParticleSwarm fallback material now has proper color (#e6dcd3) - was invisible due to missing color
- Environment shader replaced with simple MeshBasicMaterial - shader wasn't compiling
- Removed unused refraction state variables from 3-pass pipeline

### Architecture Improvements

**GPU Memory Management:**
- Verified proper disposal of all Three.js resources (geometries, materials, textures, render targets)
- All components use useEffect cleanup patterns for resource disposal on unmount
- Reference: See "Three.js Memory Management Patterns" section above

**Code Quality:**
- ✅ TypeScript compiles with zero errors (`npm run typecheck`)
- ✅ Biome linter passes all checks (no suppressions needed)
- ✅ All imports properly used (no dead code detected)
- ✅ Proper error handling in ECS operations with try-catch blocks

### Known Limitations & Future Enhancements

1. **EarthGlobe Texture:**
   - Currently using solid brown color for reliability
   - Asset prepared: `public/textures/earth-texture.png`
   - TODO: Integrate texture using non-Suspense loading for r3f-globe

2. **Breathing Animation:**
   - Currently single sine wave synchronized via ECS `breathPhase` trait
   - TODO: Implement dual sine wave for more nuanced easing (Phase 4)

3. **Frosted Glass Material:**
   - Applied to ParticleSwarm shards and EarthGlobe overlay
   - TODO: Verify consistency and tweak shader parameters (Phase 6)

4. **Background Shader:**
   - Currently static gradient color
   - TODO: Implement animated cloud/noise shader with time-based animation
