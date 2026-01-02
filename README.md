# breathe-together-v2

<!-- Test comment for CI/CD verification -->

A 3D interactive breathing meditation application that synchronizes users globally using UTC time to breathe together in a 4-7-8 relaxation breathing pattern (4 seconds inhale, 7 seconds hold, 8 seconds exhale).

## Quick Start

```bash
# Install dependencies
npm install

# Start development server with Triplex visual editor
npm run dev

# Open http://localhost:5173 in your browser
```

## Documentation

- **[CLAUDE.md](./CLAUDE.md)** - Comprehensive project documentation (architecture, ECS patterns, development guide)
- **[TRIPLEX_QUICKSTART.md](./TRIPLEX_QUICKSTART.md)** - Visual 3D component editor guide
- **[DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)** - Development patterns and best practices

## Tech Stack

- [Koota](https://github.com/pmndrs/koota) for ECS state management, powering the core behavior loop
- [Vite](https://vitejs.dev/) for blazing-fast builds and HMR
- [React Three Fiber](https://github.com/pmndrs/react-three-fiber) for declarative 3D rendering
- [TypeScript](https://www.typescriptlang.org/) for type safety and developer experience

## Introduction

This breathing visualization is built on top of Koota, a state management library that encourages you to separate behavior from React component markup and keep global simulation state in ECS traits.

### React Components as entities

You'll find most React components in this app are light-weight. For example, the breathing entities only:

- Render Three.js primitives; then
- Spawn themselves as entities in the Koota world with "traits" (in an effect)

If these React components were rendered by themselves, well, nothing happens! That's where "system" functions come into play.

### Core behavior loop

The core behavior loop is defined in the `KootaSystems` React component found in `src/providers.tsx`. Every frame each system function is called in sequence meaning the order of functions are important!

The breathing loop is intentionally small for MVP:

- `breathSystem(world, delta)` — Calculates breath phase, orbit radius, sphere scale
- `particlePhysicsSystem(world, delta)` — Applies forces and integrates particle motion

Each system function is made to be small and composable so you can easily build up behavior by adding (or removing) traits on entities.

Try modifying some and see what happens!

### Files of interest

- `/.triplex/config.json` — Triplex configuration.
- `/.triplex/providers.tsx` — [React component providers](/docs/building-your-scene/providers) are declared here. The global provider declares the Koota world, and the canvas provider declares the Koota systems. Props declared on providers can be controlled through the UI!
- `/src`
  - `/entities` — React components that are registered as entities in the Koota world. These components can be used in the scene and will be updated every frame.
  - `/levels` — React components that are considered "levels" in the game sense. These are the primary ones you'll be developing against inside Triplex.
- `/shared` — Shared Koota traits.
  - `app.tsx` — Root of the React app.
  - `providers.tsx` — Providers declared here are used in both `app.tsx `and `/.triplex/providers.tsx`.

## Essential Commands

```bash
npm run dev          # Start Vite dev server with Triplex (localhost:5173)
npm run build        # Production build to dist/
npm run typecheck    # TypeScript type checking
npm run lint         # Run Biome linter
npm run format       # Format code with Biome
npm run check        # Lint + format with auto-fix
```

## Deployments

This template comes with out-of-the-box [GitHub pages deployments](https://pages.github.com/). For every commit to the default branch a deployment will be initiated.

To successfully deploy you'll need to enable GitHub pages for your repository:

1. Visit your GitHub repository settings
1. Find the "Pages" page
1. Change `source` to `GitHub Actions`
1. You're ready! ✅

## Troubleshooting

### TypeScript errors after pulling changes
```bash
npm install  # Reinstall dependencies
npm run typecheck  # Verify types
```

### Triplex not loading
- Ensure dev server is running on port 5173
- Check browser console for WebGL errors
- Try clearing browser cache and restarting dev server

### WebGL context lost
- Restart the browser tab
- Check for GPU memory leaks (see CLAUDE.md "Three.js Memory Management")
- Reduce `particleCount` in scene props

### Hot reload issues with ECS
- This is expected during Triplex hot-reload (Koota world becomes stale)
- Refresh the page to reset the ECS world

For more detailed troubleshooting, see [CLAUDE.md](./CLAUDE.md).
