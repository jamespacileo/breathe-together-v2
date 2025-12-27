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
- Use `triplex.config.ts` to add custom controls

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
