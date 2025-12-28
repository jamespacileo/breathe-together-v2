# Advanced Patterns & Pro Tips Documentation

A comprehensive collection of pro tips, advanced patterns, common gotchas, and power user techniques for **Triplex**, **React Three Fiber**, **Koota**, and related technologies used in the breathe-together-v2 project.

## Quick Navigation

### 🏗️ Architecture & Patterns
- **[Koota ECS Patterns](./koota/)** - Advanced state management patterns, React hooks, performance optimization, observers and events
- **[ECS Architecture](./ecs-architecture/)** - Design principles, system ordering, composition patterns
- **[Triplex Integration](./triplex/)** - Visual editor setup, configuration patterns, 2025 features

### 🎨 Rendering & Performance
- **[React Three Fiber](./react-three-fiber/)** - Performance optimization, useFrame patterns, memory management, advanced hooks, declarative patterns
- **[Drei Helpers](./drei/)** - Shader materials, performance helpers, advanced components, lighting and shadows
- **[Shaders & GLSL](./shaders/)** - GLSL optimization, TSL introduction, custom shader patterns

### 🎯 Project-Specific
- **[breathe-together-v2 Patterns](./project-specific/)** - 7-phase system pipeline, adaptive quality, particle physics, UTC sync

---

## Documentation Structure

```
docs/
├── README.md (this file)
├── koota/                      # Koota ECS state management
│   ├── 01-advanced-patterns.md
│   ├── 02-react-integration.md
│   ├── 03-performance.md
│   ├── 04-gotchas.md
│   └── 05-observers-and-events.md
├── react-three-fiber/          # React Three Fiber rendering
│   ├── 01-performance-optimization.md
│   ├── 02-useframe-patterns.md
│   ├── 03-memory-management.md
│   ├── 04-common-gotchas.md
│   ├── 05-advanced-hooks.md
│   └── 06-declarative-patterns.md
├── drei/                        # Drei helper library
│   ├── 01-shader-materials.md
│   ├── 02-performance-helpers.md
│   ├── 03-advanced-components.md
│   └── 04-lighting-and-shadows.md
├── triplex/                     # Triplex visual editor
│   ├── 01-getting-started.md
│   ├── 02-configuration-patterns.md
│   ├── 03-koota-integration.md
│   └── 04-2025-features.md
├── ecs-architecture/            # ECS design patterns
│   ├── 01-design-principles.md
│   ├── 02-data-flow.md
│   └── 03-patterns.md
├── shaders/                     # GLSL & shader optimization
│   ├── 01-glsl-optimization.md
│   ├── 02-tsl-introduction.md
│   └── 03-custom-shaders.md
└── project-specific/            # breathe-together-v2 specific
    ├── 01-system-pipeline.md
    ├── 02-adaptive-quality.md
    ├── 03-particle-physics.md
    └── 04-breath-sync.md
```

---

## Key Topics at a Glance

### Performance Optimization (Priority: High)

**React Three Fiber:**
- ✅ Reuse objects in `useFrame` loops (avoid GC pressure)
- ✅ Use instanced rendering for 10K+ similar objects (1 draw call)
- ✅ Enable on-demand rendering with `frameloop="demand"`
- ✅ Share geometries and materials globally
- ❌ Never create new objects in `useFrame`
- ❌ Never call `setState` directly in render loops

**Koota ECS:**
- ✅ Cache queries with `cacheQuery()` to avoid re-hashing
- ✅ Use `useStore()` for performance-critical updates
- ✅ Pre-create update functions in module scope
- ✅ Use `for...of` instead of `forEach` for iterations
- ❌ Don't create inline arrow functions for each update

**Triplex & Editor:**
- ✅ Minimize render calls (visible in performance metrics)
- ✅ Use system toggles for development-only features

### Common Gotchas (Priority: High)

- **Memory Leaks**: Always dispose of materials, geometries, and textures on unmount
- **Component Mounting**: Avoid remounting expensive materials/lights (they get recompiled)
- **Object Creation**: Creating geometries/materials is expensive; share instead of recreate
- **Query Hashing**: Koota hashes queries; cache them if used repeatedly
- **Shader Compilation**: Adding/removing lights triggers shader recompilation across entire scene

### Power User Patterns (Priority: Medium)

1. **Target/Current Trait Pairs** - Smooth damping without direct mutations
2. **Factory System Pattern** - Create systems with closures for performance
3. **Selective Trait Updates** - Query multiple traits but update only specific ones
4. **Zero-Scale Hiding** - Deactivate instances without destroy/spawn
5. **Hysteresis Quality Switching** - Prevent visual thrashing with debounced level changes

---

## Quick Reference Table

| Technology | Key File | Primary Focus |
|------------|----------|---|
| **Koota** | `koota/01-advanced-patterns.md` | Query caching, useStore, factory systems, observers, events |
| **Koota (Advanced)** | `koota/05-observers-and-events.md` | onAdd/onRemove, query subscriptions, analytics, debugging |
| **R3F** | `react-three-fiber/01-performance-optimization.md` | Object reuse, instancing, on-demand rendering |
| **R3F (Hooks)** | `react-three-fiber/05-advanced-hooks.md` | useGraph, useLoader, useThree, createPortal, invalidate |
| **R3F (Patterns)** | `react-three-fiber/06-declarative-patterns.md` | attach, extend(), args, declarative vs imperative |
| **Drei** | `drei/01-shader-materials.md` | shaderMaterial, MeshTransmissionMaterial |
| **Drei (Lighting)** | `drei/04-lighting-and-shadows.md` | ContactShadows, SoftShadows, BakeShadows, Caustics, Lightformer |
| **Triplex** | `triplex/02-configuration-patterns.md` | Prop/context hierarchy, quality presets |
| **ECS** | `ecs-architecture/02-data-flow.md` | System pipeline, execution order |
| **Shaders** | `shaders/01-glsl-optimization.md` | Performance tips, precision, branching |
| **Project** | `project-specific/01-system-pipeline.md` | 7-phase pipeline, visual diagrams |

---

## For New Team Members

**Getting Started:**
1. Start with `project-specific/01-system-pipeline.md` to understand breathe-together-v2's architecture
2. Review `ecs-architecture/02-data-flow.md` to understand data flow and system ordering
3. Read relevant framework docs based on what you're working on:
   - Implementing new entities? → `koota/02-react-integration.md`
   - Optimizing performance? → `react-three-fiber/01-performance-optimization.md`
   - Adding visual effects? → `drei/01-shader-materials.md`

**Common Tasks:**

- **Add a new entity**: See `ecs-architecture/01-design-principles.md` + `koota/02-react-integration.md`
- **Optimize particle rendering**: See `react-three-fiber/01-performance-optimization.md` + `project-specific/03-particle-physics.md`
- **Create a custom shader**: See `shaders/03-custom-shaders.md` + `drei/01-shader-materials.md`
- **Debug with Triplex**: See `triplex/02-configuration-patterns.md` + `triplex/03-koota-integration.md`

---

## Key Principles

### 1. Composition Over Inheritance (ECS)
Components are pure data. Systems provide behavior. Combine traits to create complex entities.

### 2. Direct Mutation in Render Loops
Avoid React's state system in animation frames. Use refs and direct mutation for performance.

### 3. Lazy Object Creation
Create materials, geometries, and lights once and reuse them. Each new object triggers compilation/initialization.

### 4. System Execution Order is Critical
The order systems run determines correctness. See `project-specific/01-system-pipeline.md` for breathe-together-v2's 7-phase pipeline.

### 5. Performance First, Optimization Later (But Measure)
Use Triplex's performance metrics to identify bottlenecks. Don't prematurely optimize without data.

---

## External Resources

### Official Documentation
- [React Three Fiber Docs](https://docs.pmnd.rs/react-three-fiber/)
- [Koota GitHub](https://github.com/pmndrs/koota)
- [Drei Docs](https://github.com/pmndrs/drei)
- [Triplex Official](https://triplex.dev/)
- [Three.js Docs](https://threejs.org/)

### Learning Resources
- [Discover Three.js Tips & Tricks](https://discoverthreejs.com/tips-and-tricks/)
- [R3F Performance Pitfalls](https://r3f.docs.pmnd.rs/advanced/pitfalls)
- [ECS FAQ](https://github.com/SanderMertens/ecs-faq)
- [Three.js Journey](https://threejs-journey.com/)

### Context7 Code Examples
This documentation includes hundreds of code examples sourced from:
- **Koota**: 86 code snippets
- **React Three Fiber**: 243 code snippets
- **Drei**: 337 code snippets

---

## Contributing to This Documentation

Each file follows a consistent structure:
1. **Overview** - Brief introduction
2. **Quick Reference** - TL;DR
3. **Visual Diagrams** - Mermaid flowcharts (where applicable)
4. **Patterns** - Code examples with explanations
5. **Gotchas** - Common mistakes and solutions
6. **Pro Tips** - Advanced techniques
7. **Related Resources** - Links to official docs and examples
8. **Project Examples** - References to breathe-together-v2 codebase

When adding new documentation:
- Keep examples concise and practical
- Link to actual files in the breathe-together-v2 codebase
- Include Mermaid diagrams for complex concepts
- Cite external sources with proper links

---

## Version Information

- **Created**: December 2025
- **Last Updated**: December 2025
- **Target Frameworks**:
  - Koota (latest)
  - React Three Fiber (v8.x)
  - Drei (latest)
  - Triplex (2025 features)
  - Three.js (r128+)
  - React 19.x

---

## Table of Contents by Difficulty Level

### Beginner
- `triplex/01-getting-started.md`
- `ecs-architecture/01-design-principles.md`
- `koota/02-react-integration.md`
- `react-three-fiber/04-common-gotchas.md`

### Intermediate
- `react-three-fiber/02-useframe-patterns.md`
- `drei/02-performance-helpers.md`
- `project-specific/04-breath-sync.md`
- `koota/04-gotchas.md`
- `drei/03-advanced-components.md`

### Advanced
- `koota/01-advanced-patterns.md`
- `react-three-fiber/01-performance-optimization.md`
- `react-three-fiber/05-advanced-hooks.md`
- `drei/04-lighting-and-shadows.md`
- `shaders/01-glsl-optimization.md`
- `triplex/03-koota-integration.md`

### Expert/Architecture
- `project-specific/01-system-pipeline.md`
- `ecs-architecture/02-data-flow.md`
- `koota/03-performance.md`
- `koota/05-observers-and-events.md`
- `react-three-fiber/06-declarative-patterns.md`

---

**Ready to dive in? Start with [Project-Specific Patterns](./project-specific/01-system-pipeline.md) to see how these patterns work in breathe-together-v2!**
