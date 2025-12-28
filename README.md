# breathe-together-v2

- [Koota](https://github.com/pmndrs/koota) for state management, powering the core behavior loop.
- [Vite](https://vitejs.dev/) for bundling and running the game outside of Triplex.
- [React Three Fiber](https://github.com/pmndrs/react-three-fiber) for rendering 3D components.
- [TypeScript](https://www.typescriptlang.org/) for type safety and better developer experience.

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

## Deployments

This template comes with out-of-the-box [GitHub pages deployments](https://pages.github.com/). For every commit to the default branch a deployment will be initiated.

To successfully deploy you'll need to enable GitHub pages for your repository:

1. Visit your GitHub repository settings
1. Find the "Pages" page
1. Change `source` to `GitHub Actions`
1. You're ready! ✅
