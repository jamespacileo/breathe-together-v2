# Breathe Together v2 - Developer Guide

## Quick Start

### Run Development Server
```bash
npm run dev
# Visit: http://localhost:5173/breathe-together-v2
```

### Build for Production
```bash
npm run build
# Output: dist/
```

### Type Check
```bash
npm run typecheck
```

---

## Architecture Overview

### Component Hierarchy
```
App
├── Canvas (React Three Fiber)
│   ├── KootaSystems (System orchestrator)
│   │   ├── BreathEntity (ECS entity spawner)
│   │   └── BreathingLevel
│   │       ├── color (background)
│   │       ├── ambientLight
│   │       ├── BreathingSphere (central orb)
│   │       └── ParticleRenderer + ParticleSpawner (300 particles)
```

### State Flow
```
breathSystem() [Koota ECS]
    ↓
  Updates breathEntity with BreathState
    ↓
BreathingSphere & ParticleRenderer read state via useFrame
    ↓
  ECS + maath easing animate sphere and particles
```

---

## Core Systems

### 1. Breath Calculation (`src/lib/breathCalc.ts`)

Pure functions for breathing state. No dependencies on React/Three.js.

```typescript
// 19-second cycle - 4-7-8 relaxation breathing pattern
const state = calculateBreathState(elapsedTime);

// Returns:
{
  breathPhase: 0-1,        // 0=exhaled, 1=inhaled
  phaseType: 0-3,          // Which phase (inhale/hold-in/exhale/hold-out)
  rawProgress: 0-1,        // Raw progress within current phase
  orbitRadius: 2.5-6.0,    // Particle orbit radius (contracts on inhale, expands on exhale)
}
```

**Key Constants:**
- Cycle time: 19 seconds (4s inhale, 7s hold-in, 8s exhale, 0s hold-out)
- Easing: Phase-specific easing (easeInhale, easeExhale, damped oscillation for holds)
- Global sync: Uses `Date.now() / 1000`

### 2. Breath Entity (`src/entities/breath/`)

Koota ECS pattern for state management.

**Spawning:**
```typescript
// In BreathEntity component
const entity = world.spawn(
  breathPhase,
  phaseType,
  orbitRadius,
  sphereScale,
  crystallization
);
```

**Accessing:**
```typescript
// In components
const breathEntity = getBreathEntity(world);
const scale = breathEntity?.get(sphereScale)?.value;
```

### 3. Breath System (`src/entities/breath/systems.tsx`)

Runs every frame via `KootaSystems`.

```typescript
export function breathSystem(world: World, delta: number) {
  const breathEntity = getBreathEntity(world);
  const state = calculateBreathState(Date.now() / 1000);

  breathEntity.set(sphereScale, { value: state.sphereScale });
  // ... update other traits
}
```

---

## Components

### EarthGlobe
**File:** `src/entities/earthGlobe/index.tsx`

**Features:**
- Central sphere with frosted glass overlay
- Warm brown earth tone (#8b6f47)
- Breathing-synchronized scaling and rotation
- Monument Valley inspired aesthetic

### ParticleSwarm
**File:** `src/entities/particle/ParticleSwarm.tsx`

**Features:**
- Icosahedral shard particles orbiting the globe
- InstancedMesh for efficient rendering
- Mood-based particle coloring
- Orbit animation synced to breath cycle
- Refraction effects through frosted glass material

### AtmosphericParticles
**File:** `src/entities/particle/AtmosphericParticles.tsx`

**Features:**
- Floating ambient particles
- Breathing-synchronized opacity
- Adds atmospheric depth to the scene

---

## Hooks

### usePresence
**File:** `src/hooks/usePresence.ts`

Returns simulated presence data for MVP (no backend).

```typescript
const { moods } = usePresence({ userCount: 75 });
// moods = { moment: 20, anxious: 12, ... }
```

**Mood Types:**
- `moment` → Soft Cyan
- `anxious` → Lavender
- `processing` → Soft Teal
- `preparing` → Sky Blue
- `grateful` → Soft Gold
- `celebrating` → Soft Gold
- `here` → Soft Cyan
- `happy` → #ffb400 (yellow)

---

## Triplex Integration

### How to Edit Components

1. **Open Triplex in VSCode** (if installed)
2. **Navigate to a component:**
   - `EarthGlobe` in `src/entities/earthGlobe/index.tsx`
   - `ParticleSwarm` in `src/entities/particle/ParticleSwarm.tsx`
   - `Environment` in `src/entities/environment/index.tsx`
3. **Edit props in the UI:**
   - Props appear as controls based on JSDoc annotations
   - Changes update live in the viewport
4. **Save changes** - auto-saves to source file

### JSDoc Format for Triplex

```typescript
interface ComponentProps {
  /**
   * Description of prop
   * @type color           // Triplex UI: color picker
   * @min 0 @max 1 @step 0.01  // Triplex UI: slider
   */
  myProp?: string;
}
```

---

## Performance Optimization

### What's Already Optimized

✅ **InstancedMesh:** 300 particles in one draw call (not 300 separate calls)

✅ **Float32Array:** Angle storage pre-allocated, no per-frame allocations

✅ **No React state updates in animation loop:** ECS + direct DOM updates handle it

✅ **Additive blending:** Efficient blend mode for particles

✅ **Double-sided sphere only:** No back-face culling overhead needed

### Further Optimizations (If Needed)

**Code splitting:**
```typescript
// Lazy load components
const BreathingSphere = lazy(() => import('../entities/breathingSphere'));
```

**Geometry caching:**
```typescript
// Currently recreated per component instance
// Could use THREE.Cache or instance-level cache
```

**Particle LOD:**
```typescript
// Reduce segments when fps < 50
// Add quality slider for mobile
```

---

## Debugging

### Console Logging

The app logs to browser console. Check:
- React Three Fiber stats
- Koota world state updates
- Presence hook API calls

### React Developer Tools

Monitor:
- Component render counts
- Hook state (via React DevTools)
- useFrame delta times

### Three.js Stats

Monitor GPU load:
```typescript
// Can be added to scene
import Stats from 'three/examples/jsm/libs/stats.module';
```

### Breath State Inspection

```javascript
// In browser console
// (Assuming global access - would need to expose)
const state = calculateBreathState(Date.now() / 1000);
console.log('Current breath phase:', state.breathPhase);
console.log('Particle orbit radius:', state.orbitRadius);
```

---

## Testing

### Unit Tests

No automated unit tests (legacy scripts removed during pruning).

### Manual Testing Checklist

- [ ] Sphere scales from small to large smoothly
- [ ] Particles contract when sphere expands
- [ ] All 16s cycle phases work (inhale→hold→exhale→hold)
- [ ] Particles show different colors (test with backend API)
- [ ] Dev server hot reload works
- [ ] No console errors
- [ ] 60fps maintained (check DevTools Performance)

---

## File Structure

```
src/
├── index.tsx                 # Entry point
├── app.tsx                   # Root component
├── main.tsx                  # Vite entry
├── providers.tsx             # Koota + systems setup
├── constants.ts              # Mood definitions
├── levels/
│   └── breathing.tsx         # Main scene
├── entities/
│   ├── breath/
│   │   ├── index.tsx         # Entity + spawner
│   │   ├── traits.tsx        # ECS traits
│   │   └── systems.tsx       # breathSystem()
│   ├── breathingSphere/
│   │   └── index.tsx         # Sphere component
│   ├── particle/
│   │   └── index.tsx         # Particle components
│   └── camera/
│       └── CameraRig.tsx     # Camera motion (non-ECS)
├── hooks/
│   └── usePresence.ts        # Simulated presence data
├── lib/
│   ├── breathCalc.ts         # Pure calculations
│   ├── colors.ts             # Mood→color mapping
│   ├── fibonacciSphere.ts    # Particle distribution
│   └── [other starter libs]/
└── shared/
    └── traits.tsx            # Koota traits

dist/                          # Build output
```

---

## Common Tasks

### Change Breathing Cycle Duration

Edit `src/constants.ts`:
```typescript
export const BREATH_PHASES = {
  INHALE: 4,
  HOLD_IN: 7,
  EXHALE: 8,
  HOLD_OUT: 0,
} as const;

export const BREATH_TOTAL_CYCLE = 19; // seconds (derived from phase durations)
```

### Add New Mood Color

Edit `src/constants.ts` (add to `MOOD_IDS`) and `src/lib/colors.ts`:
```typescript
export const MOOD_IDS = [
  // ... existing moods
  'peaceful',
] as const;

export const MOOD_METADATA = {
  // ... existing moods
  peaceful: { id: 'peaceful', label: 'Peaceful', hasDetail: false, color: '#9c27b0' },
};
```

### Adjust Visual Parameters

Use the Zustand store or dev controls (Leva panel) to adjust:
- Orbit radius (breathing space)
- Shard size
- Atmosphere density
- Glass refraction effects

Or edit scene defaults in `src/levels/breathing.tsx`

---

## Known Issues & Limitations

### Current
- Presence is simulated (no backend API)
- No mobile testing yet
- No analytics or error tracking

### Future
- Canvas size optimization for mobile
- Particle shader customization
- Theme system expansion
- Voice/mic input for synced breathing

---

## Resources

- **Koota ECS:** https://github.com/hmans/koota
- **Three.js:** https://threejs.org
- **React Three Fiber:** https://docs.pmnd.rs/react-three-fiber

---

## Support

For issues:
1. Check `IMPLEMENTATION_VERIFIED.md` for status
2. Review component JSDoc comments
3. Check test files for expected behavior
4. Inspect browser console for errors
5. Verify dev server is running at correct port

---

**Last Updated:** 2025-12-26
**Frontend Version:** 1.0.0 (Ready for Production)
