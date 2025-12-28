# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**breathe-together-v2** is a 3D interactive breathing meditation application built with React, Three.js, and a Koota-based ECS (Entity-Component-System) architecture. It synchronizes users globally using UTC time to breathe together in a box breathing pattern (4s: inhale, hold, exhale, hold).

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
- Defined in `src/shared/systems.tsx` and entity-specific files
- Execution order is critical and defined in `src/providers.tsx` → `KootaSystems` component

### Core Behavior Loop

Systems run in this sequence each frame (see `src/providers.tsx`):

1. **breathSystem** — Updates breath phase, radius, scale based on UTC time
2. **cursorPositionFromLandSystem** — Ray-cast cursor from camera to land
3. **velocityTowardsTargetSystem** — Move entities toward their targets
4. **positionFromVelocity** — Update positions based on velocity
5. **meshFromPosition** — Sync Three.js transforms with position traits
6. **cameraFollowFocusedSystem** — Move camera to follow focused entity

## Project Structure

```
src/
├── entities/              # ECS entities (React components + trait spawning)
│   ├── breath/           # Central breathing state (traits + breathSystem)
│   ├── breathingSphere/  # Visual 3D sphere (scales with breathing phase)
│   ├── particleSystem/   # 300 particles (user presence, mood colors)
│   ├── camera/           # Follows focused entity
│   ├── controller/       # Point-and-click movement
│   ├── cursor/           # Cursor position tracking
│   └── land/             # Terrain
├── levels/               # "Level" scenes (breathing.tsx is main, debug.tsx for testing)
├── components/           # React UI components (BreathingHUD overlay)
├── hooks/               # usePresence — fetches user presence data
├── shared/
│   ├── traits.tsx       # Common traits (Position, Velocity, etc.)
│   ├── systems.tsx      # Common systems (meshFromPosition, camera, velocity)
│   └── math.tsx         # Utilities (easeInOutQuad, etc.)
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

**Box breathing cycle (16 seconds total):**
- 0-4s: Inhale
- 4-8s: Hold
- 8-12s: Exhale
- 12-16s: Hold

**Outputs:**
- `breathPhase` (0-1): Position in current phase
- `phaseType` (0-3): Which phase (0=inhale, 1=hold-in, 2=exhale, 3=hold-out)
- `orbitRadius`: Particle orbit radius (shrinks on exhale, grows on inhale)
- `sphereScale`: Central sphere scale (inverse of particles)
- `crystallization`: Shader parameter for visual effect

**Key detail:** Uses `Date.now()` so all users globally see the same phase at the same time.

## Testing

**Status:** No automated test framework configured. TypeScript typecheck is the primary validation.

Manual test files exist:
- `/test-breath-calc.js` — Breath calculation tests
- `/test-presence-integration.js` — Presence API tests

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

**Fetching:**
- `src/hooks/usePresence.ts` — TanStack React Query hook
- Queries a presence endpoint (or uses mock data in `src/lib/mockPresence.ts`)
- Returns array of { userId, mood, avatarId, participantCount }

**Particles:**
- `src/entities/particleSystem/index.tsx` uses presence data
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

### Triplex Integration: Quality Presets & Progressive Disclosure

The codebase uses a **quality preset system** to reduce cognitive load in Triplex from 54 simultaneous props down to 8 commonly-used controls.

**Quality Presets:**
- **low** — Mobile-friendly (100 particles, basic lighting, reduced visual effects)
- **medium** — Production default (300 particles, balanced lighting, standard visuals)
- **high** — High-end visuals (500 particles, enhanced lighting, premium effects)
- **custom** — Manual control (unlock all 54+ props for advanced tuning)

**Using Presets:**
```typescript
// Production scene with medium preset (default)
<BreathingLevel qualityPreset="medium" />

// Mobile-friendly configuration
<BreathingLevel qualityPreset="low" sphereColor="#ff0000" />

// Manual override (preset + prop)
<BreathingLevel qualityPreset="medium" sphereOpacity={0.8} />
```

### Prop Organization: 4-Tier System

Props are organized hierarchically to avoid overwhelming the editor UI:

**Tier 1: Preset Selection (1 prop)**
- `qualityPreset` — Switches between predefined configurations
- Use when you want to quickly change overall visual style

**Tier 2: Primary Controls (7-8 props)**
- Always visible: `backgroundColor`, `sphereColor`, `ambientIntensity`, `particleCount`
- Most frequently adjusted during prototyping
- Example: Changing background color or sphere hue

**Tier 3: Advanced Tuning (20-25 props)**
- Only visible when `qualityPreset = "custom"`
- Fine-grained control: fresnel power, crystallization, individual light colors, particle geometry
- Example: Fine-tuning lighting ratio or particle physics

**Tier 4: Debug Overlays (15-20 props)**
- Only in debug/experimental scenes (not production)
- Visualization toggles: axes, grids, orbit bounds, trait values
- Zero production impact

### Shared Types & Centralized Defaults

All visual and lighting props are defined once for consistency:

**Type definitions:** `src/types/sceneProps.ts`
- `SharedVisualProps` — backgroundColor, sphereColor, sphereOpacity, etc.
- `SharedLightingProps` — ambient, key, fill, rim light configuration
- `BreathingDebugProps` — manual phase control, pause/play, etc.
- `ParticleDebugProps` — particle geometry, material, size options

**Defaults & metadata:** `src/config/sceneDefaults.ts`
- `VISUAL_DEFAULTS` — Visual defaults with "when to adjust" guidance
- `LIGHTING_DEFAULTS` — Lighting setup with interaction hints
- `QUALITY_PRESETS` — Predefined configurations (low/medium/high)
- `getDefaultValues()` — Helper to extract values for prop spreading

**Why centralized?**
- Single source of truth for default values (no duplication)
- Metadata enables future tooling (AI suggestions, validation)
- Consistent baseline across all three scene files (production/experimental/debug)

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
- **Lighting props:** `src/entities/lighting/index.tsx` (9 props)
- **Environment props:** `src/entities/environment/index.tsx` (13 props)
- **Particle config:** `src/entities/particle/config.ts` (7 props in geometry/material/size)
- **Scene props:** `src/types/sceneProps.ts` (all props with full metadata)

### How This Reduces Cognitive Load

**Before:** 54 props visible simultaneously in debug scene
- Users confused about where to start
- No clear relationship between related props
- Inconsistent help text ("glow" vs. "intensity" vs. "pulsing")
- Hard to find production baseline

**After:** Progressive disclosure + standardized help
- Default view shows 8 primary props (background, sphere, lights, particles)
- Custom mode unlocks full 54 props when needed
- "When to adjust" contextual guidance answers "why would I change this?"
- "Typical range" with visual landmarks (Dim/Standard/Bright) makes tuning intuitive
- "Interacts with" hints show related props
- All props link back to `sceneDefaults.ts` for single source of truth

### Extending Presets

To create a custom preset in `src/config/sceneDefaults.ts`:

```typescript
export const QUALITY_PRESETS = {
  // ... existing low/medium/high
  custom_mobile: {
    particleCount: 50,
    ambientIntensity: 0.6,
    keyIntensity: 1.0,
    // Override any props from VISUAL_DEFAULTS or LIGHTING_DEFAULTS
  },
};
```

Then use in scenes:
```typescript
<BreathingLevel qualityPreset="custom_mobile" />
```

## Important Implementation Details

### UTC Synchronization
All breathing state is derived from `Date.now()` % cycle length. This ensures every user breathes in sync globally without needing real-time communication.

### Easing
Box breathing uses `easeInOutQuad` for smooth, natural-feeling transitions. See `src/shared/math.tsx`.

### Instanced Rendering
ParticleSystem uses Three.js instanced mesh for performance (300 particles = 1 draw call).

### Fresnel Shader
BreathingSphere uses Three.js `Fresnel` shader for edge glow that intensifies during inhale.

### Responsive HUD
BreathingHUD scales UI based on viewport width. Designed for desktop and mobile.

## Git Status

Branch: `main` (no uncommitted changes in tracked files)

Modified but staged changes:
- `src/entities/breathingSphere/index.tsx`
- `src/entities/particleSystem/index.tsx`

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
- `gsap` — Animation tweens
- `@tanstack/react-query` — Server state (presence data)
- `@react-three/drei` — Three.js helpers (Fresnel shader, etc.)
- `vite` — Build tool

See `package.json` for full dependency tree and versions.
