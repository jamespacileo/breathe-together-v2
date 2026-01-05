# Scene Composition Guide

This document describes how the 3D scene is composed in breathe-together-v2, with a focus on the depth enhancement system that creates a sense of vast 3D space.

## Scene Architecture Overview

The scene is built in layers from back to front, with each layer contributing to depth perception:

```
Camera (Z=10)
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ FOREGROUND (Z=0 to +5)                                      │
│ • Globe (Z=0)                                               │
│ • Particle Swarm (orbits Z=-6 to +6)                       │
│ • Atmospheric Particles                                     │
│ • UI Overlay (screen-space)                                │
├─────────────────────────────────────────────────────────────┤
│ NEAR BACKGROUND (Z=-15)                                     │
│ • Depth Atmospheric Layers (near dust)                     │
│ • Depth Light Rays (near rays)                             │
│ • Cloud System (inner layer, radius 7-8)                   │
├─────────────────────────────────────────────────────────────┤
│ MID BACKGROUND (Z=-40)                                      │
│ • Distant Silhouettes (near layer)                         │
│ • Depth Atmospheric Layers (mid motes)                     │
│ • Nebula Layers (mid clouds)                               │
│ • Depth Rings (near ring)                                  │
│ • Cloud System (middle layer, radius 9-10)                 │
├─────────────────────────────────────────────────────────────┤
│ FAR BACKGROUND (Z=-80)                                      │
│ • Distant Silhouettes (mid layer)                          │
│ • Depth Atmospheric Layers (far particles)                 │
│ • Depth Star Field (near stars)                            │
│ • Depth Rings (mid ring)                                   │
│ • Nebula Layers (far nebula)                               │
│ • Cloud System (outer layer, radius 11-13)                 │
├─────────────────────────────────────────────────────────────┤
│ DEEP BACKGROUND (Z=-120)                                    │
│ • Distant Silhouettes (far layer)                          │
│ • Depth Atmospheric Layers (deep dust)                     │
│ • Depth Star Field (mid/far stars)                         │
│ • Depth Rings (far ring)                                   │
│ • Nebula Layers (deep backdrop)                            │
├─────────────────────────────────────────────────────────────┤
│ BACKDROP (Z=-∞)                                             │
│ • Background Gradient (screen-space, Z=0.9999)             │
│ • Stars (radius 100-150)                                   │
└─────────────────────────────────────────────────────────────┘
```

## Entity/Effect Reference Table

| Entity/Effect | Location | Z-Depth | Purpose | Performance |
|---------------|----------|---------|---------|-------------|
| **Core Elements** |
| EarthGlobe | `entities/earthGlobe/` | 0 | Central focal point | Low |
| ParticleSwarm | `entities/particle/ParticleSwarm.tsx` | -6 to +6 | User representation shards | Medium |
| AtmosphericParticles | `entities/particle/AtmosphericParticles.tsx` | scale=12 | Ambient floating particles | Low |
| **Environment** |
| BackgroundGradient | `entities/environment/BackgroundGradient.tsx` | Screen-space | Animated gradient backdrop | Low |
| CloudSystem | `entities/environment/CloudSystem.tsx` | 7-13 radius | Volumetric clouds | Medium |
| AmbientDust | `entities/environment/AmbientDust.tsx` | -10 to -50 | Subtle floating motes | Low |
| SubtleLightRays | `entities/environment/SubtleLightRays.tsx` | -30 to -40 | Diagonal god rays | Low |
| Stars (drei) | `entities/environment/index.tsx` | radius=100 | Background star field | Low |
| **Depth Effects** |
| DepthAtmosphericLayers | `entities/environment/DepthAtmosphericLayers.tsx` | -15 to -120 | Multi-layer dust particles | Medium |
| DepthStarField | `entities/environment/DepthStarField.tsx` | 40-150 radius | Layered star field | Low |
| DistantSilhouettes | `entities/environment/DistantSilhouettes.tsx` | -40 to -120 | Mountain silhouettes | Low |
| DepthRings | `entities/environment/DepthRings.tsx` | -20 to -90 | Orbital ring references | Low |
| NebulaLayers | `entities/environment/NebulaLayers.tsx` | -15 to -120 | Shader-based nebula clouds | Medium |
| DepthLightRays | `entities/environment/DepthLightRays.tsx` | -15 to -80 | Enhanced god rays | Low |
| SubtleGroundPlane | `entities/environment/SubtleGroundPlane.tsx` | Y=-8 | Ground reference | Low |
| ParallaxBackground | `entities/environment/ParallaxBackground.tsx` | -20 to -85 | Camera-responsive layers | Low |
| DepthFog | `entities/environment/DepthFog.tsx` | Scene-level | Atmospheric perspective | Low |
| DepthVignette | `entities/environment/DepthVignette.tsx` | Screen-space | Edge darkening | Low |
| **Post-Processing** |
| RefractionPipeline | `entities/particle/RefractionPipeline.tsx` | N/A | 4-pass FBO refraction + DoF | High |
| PostProcessingEffects | `components/PostProcessingEffects.tsx` | N/A | Optional bloom/vignette/DoF | Medium |

## Depth Enhancement Techniques

### 1. Multi-Layer Atmospheric Particles
**File:** `src/entities/environment/DepthAtmosphericLayers.tsx`

Creates four layers of floating dust particles at increasing distances:
- **Near (Z=-15):** 60 particles, size 0.12, opacity 0.15
- **Mid (Z=-40):** 100 particles, size 0.08, opacity 0.10
- **Far (Z=-80):** 150 particles, size 0.05, opacity 0.06
- **Deep (Z=-120):** 200 particles, size 0.03, opacity 0.03

Each layer has breathing-synchronized opacity and different drift speeds.

### 2. Depth Star Field
**File:** `src/entities/environment/DepthStarField.tsx`

Three star layers with varying characteristics:
- **Near (radius 40):** 200 stars, factor 3, warm-colored
- **Mid (radius 80):** 400 stars, factor 2, white
- **Far (radius 150):** 800 stars, factor 1, faint

Each layer rotates at different speeds for subtle parallax.

### 3. Distant Silhouettes
**File:** `src/entities/environment/DistantSilhouettes.tsx`

Monument Valley-inspired geometric mountain shapes:
- Three layers at Z=-40, Z=-80, Z=-120
- Procedurally generated from seed
- Progressive opacity falloff (8%, 5.6%, 4%)
- Color shift from warm to cool

### 4. Orbital Depth Rings
**File:** `src/entities/environment/DepthRings.tsx`

Dotted/dashed rings providing spatial reference:
- Three rings at Z=-20, Z=-50, Z=-90
- Radii: 25, 45, 70 units
- Breathing-synchronized opacity
- Slow rotation animation

### 5. Nebula Layers
**File:** `src/entities/environment/NebulaLayers.tsx`

Shader-based volumetric cloud effects:
- Four layers using FBM noise
- Animated, evolving patterns
- Breathing-responsive opacity
- Additive blending for soft glow

### 6. Enhanced Light Rays
**File:** `src/entities/environment/DepthLightRays.tsx`

God rays emanating from distant light source:
- Five ray planes at different depths
- Cone-shaped gradient falloff
- Breathing-synchronized pulsing
- Additive blending

### 7. Ground Plane Reference
**File:** `src/entities/environment/SubtleGroundPlane.tsx`

Very subtle ground for spatial anchoring:
- Y=-8 position
- Radial fade from center
- Subtle grid pattern
- Breathing-responsive opacity
- 4% base opacity

### 8. Parallax Background
**File:** `src/entities/environment/ParallaxBackground.tsx`

Camera-responsive background layers:
- Three layers at different depths
- Offset responds to camera rotation
- Creates depth through differential motion
- FBM noise-based patterns

### 9. Depth Fog
**File:** `src/entities/environment/DepthFog.tsx`

Atmospheric perspective through fog:
- Warm-to-cool color transition
- Exponential falloff
- Camera distance-responsive
- Disabled by default (can wash out gradient)

### 10. Screen-Space Vignette
**File:** `src/entities/environment/DepthVignette.tsx`

Edge darkening for focus:
- Radial falloff from center
- Breathing-responsive intensity
- Subtle color shift at edges
- Aspect ratio corrected

## Configuration

### Constants
All depth configuration is centralized in `src/constants.ts` under `SCENE_DEPTH`:

```typescript
SCENE_DEPTH = {
  LAYERS: {
    FOREGROUND: { z: 3, opacity: 1.0, scale: 1.0 },
    MAIN: { z: 0, opacity: 1.0, scale: 1.0 },
    NEAR_BG: { z: -15, opacity: 0.8, scale: 0.9 },
    MID_BG: { z: -40, opacity: 0.5, scale: 0.7 },
    FAR_BG: { z: -80, opacity: 0.3, scale: 0.5 },
    DEEP_BG: { z: -120, opacity: 0.15, scale: 0.3 },
  },
  FOG: { ... },
  ATMOSPHERE: { ... },
  STARS: { ... },
  RINGS: { ... },
  SILHOUETTES: { ... },
}
```

### Dev Controls
All depth effects can be controlled via the Leva panel under "Scene Depth":

| Control | Default | Description |
|---------|---------|-------------|
| Enable All | `true` | Master toggle |
| Global Opacity | `1.0` | Opacity multiplier |
| Particle Density | `1.0` | Particle count multiplier |
| Atmospheric Layers | `true` | Multi-layer dust |
| Depth Star Field | `true` | Layered stars |
| Distant Silhouettes | `true` | Mountain shapes |
| Orbital Rings | `true` | Dotted rings |
| Nebula Layers | `true` | Cloud nebulas |
| Depth Light Rays | `true` | God rays |
| Ground Plane | `true` | Ground reference |
| Parallax Background | `true` | Camera-responsive layers |
| Depth Fog | `false` | Atmospheric fog |
| Vignette | `true` | Edge darkening |
| Vignette Intensity | `0.35` | Darkness amount |

## Performance Considerations

### Performance Impact by Effect

| Effect | GPU Cost | Particle Count | Draw Calls |
|--------|----------|----------------|------------|
| DepthAtmosphericLayers | Medium | 510 | 4 |
| DepthStarField | Low | 1400 | 3 |
| DistantSilhouettes | Low | N/A | 3 |
| DepthRings | Low | N/A | 3 |
| NebulaLayers | Medium | N/A | 4 |
| DepthLightRays | Low | N/A | 5 |
| SubtleGroundPlane | Low | N/A | 1 |
| ParallaxBackground | Low | N/A | 3 |
| DepthFog | Low | N/A | 0 |
| DepthVignette | Low | N/A | 1 |

### Performance Presets

**Minimal (Mobile Low-End):**
```typescript
globalDensity: 0.25,
enableNebula: false,
enableAtmosphere: false,
enableParallax: false,
```

**Balanced (Mobile/Tablet):**
```typescript
globalDensity: 0.5,
enableNebula: true,
enableAtmosphere: true,
```

**Full (Desktop):**
```typescript
globalDensity: 1.0,
// All effects enabled
```

## Integration

The depth effects are integrated via `SceneDepthEffects` component:

```tsx
<SceneDepthEffects
  enabled={true}
  globalOpacity={1.0}
  globalDensity={1.0}
  enableAtmosphericLayers={true}
  enableStarField={true}
  enableSilhouettes={true}
  enableRings={true}
  enableNebula={true}
  enableLightRays={true}
  enableGroundPlane={true}
  enableParallax={true}
  enableFog={false}
  enableVignette={true}
  vignetteIntensity={0.35}
/>
```

## Visual Design Principles

1. **Progressive Opacity Falloff:** Distant objects are fainter
2. **Color Temperature Shift:** Warm near, cool far
3. **Size Reduction:** Distant particles are smaller
4. **Motion Parallax:** Different layers move at different speeds
5. **Atmospheric Perspective:** Color desaturation with distance
6. **Breathing Synchronization:** Effects respond to global breath cycle
7. **Subtle by Default:** Effects enhance without overwhelming

## File Structure

```
src/entities/environment/
├── index.tsx                    # Main Environment component
├── BackgroundGradient.tsx       # Animated gradient backdrop
├── CloudSystem.tsx              # Volumetric 3D clouds
├── AmbientDust.tsx              # Subtle floating motes
├── SubtleLightRays.tsx          # Original light rays
├── EditorGrid.tsx               # Stage mode grid
├── DepthAtmosphericLayers.tsx   # NEW: Multi-layer particles
├── DepthStarField.tsx           # NEW: Layered star field
├── DistantSilhouettes.tsx       # NEW: Mountain silhouettes
├── DepthRings.tsx               # NEW: Orbital rings
├── NebulaLayers.tsx             # NEW: Shader nebulas
├── DepthLightRays.tsx           # NEW: Enhanced god rays
├── SubtleGroundPlane.tsx        # NEW: Ground reference
├── ParallaxBackground.tsx       # NEW: Parallax layers
├── DepthFog.tsx                 # NEW: Atmospheric fog
├── DepthVignette.tsx            # NEW: Screen vignette
└── SceneDepthEffects.tsx        # NEW: Unified depth system
```

## Related Documentation

- `CLAUDE.md` - Main project documentation
- `docs/triplex/` - Triplex integration guides
- `src/constants.ts` - All configuration constants
- `src/hooks/useDevControls.ts` - Developer control definitions
