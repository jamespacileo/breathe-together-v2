# Scene Composition Guide

This document describes how the 3D breathing meditation scene is composed and how depth perception is achieved through multiple layers and effects.

## Architecture Overview

The scene uses a multi-layer depth system to create the illusion of a vast 3D environment around the central globe. Depth is achieved through:

1. **Parallax motion** - Layers move at different speeds relative to camera
2. **Atmospheric perspective** - Distant objects are fainter and cooler in color
3. **Size attenuation** - Far objects appear smaller
4. **Z-distribution** - Elements are placed at various distances from camera

## Layer Hierarchy (Back to Front)

| Z-Depth | Layer | Description | Performance |
|---------|-------|-------------|-------------|
| -200 to -150 | Parallax Background | Subtle gradient overlays | Low |
| -180 | Far Star Layer | 800 tiny, faint stars | Low |
| -150 | Distant Silhouettes (Layer 3) | Faintest geometric formations | Low |
| -120 | Far Light Rays | Cool blue-white god rays | Low |
| -100 | Mid Star Layer | 400 medium stars | Low |
| -100 | Outer Nebula | Large, faint cloud layer | Low |
| -100 | Distant Silhouettes (Layer 2) | Mid-distance formations | Low |
| -80 | Far Atmosphere Particles | 200 tiny dust motes | Medium |
| -70 | Mid Light Rays | Neutral warm rays | Low |
| -60 | Outer Orbital Ring | Faint dotted ring | Low |
| -50 | Near Star Layer | 200 brighter stars | Low |
| -50 | Mid Nebula | Medium cloud layer | Low |
| -50 | Distant Silhouettes (Layer 1) | Closest formations | Low |
| -40 | Mid Atmosphere Particles | 120 medium dust motes | Medium |
| -35 | Near Light Rays | Warm white god rays | Low |
| -25 | Mid Orbital Ring | Medium dotted ring | Low |
| -20 | Inner Nebula | Closest cloud layer | Low |
| -15 | Near Atmosphere Particles | 80 larger dust motes | Medium |
| -8 to +4 | ParticleSwarm (with Z-offset) | Icosahedral shards orbiting globe | High |
| -8 | Ground Plane | Subtle reflective surface | Low |
| -5 | Inner Orbital Ring | Closest dotted ring | Low |
| 0 | EarthGlobe | Central breathing sphere | Medium |
| 0 | Environment Clouds | Soft cloud sprites | Medium |
| Screen | Vignette | Radial darkening overlay | Low |

## Entity Reference Table

| Entity | Type | Z-Range | Breath Sync | Props | File |
|--------|------|---------|-------------|-------|------|
| **EarthGlobe** | Mesh | 0 | Scale | color, opacity | `src/entities/earthGlobe/index.tsx` |
| **ParticleSwarm** | InstancedMesh | -8 to +4 | Orbit + Scale | users, baseRadius, baseShardSize | `src/entities/particle/ParticleSwarm.tsx` |
| **AtmosphericParticles** | Points | Near sphere | Opacity | count, size, color | `src/entities/particle/AtmosphericParticles.tsx` |
| **DepthParticleLayers** | Points (3) | -15, -40, -80 | No | opacity, speedMultiplier | `src/entities/environment/DepthParticleLayers.tsx` |
| **DepthStarLayers** | Points (3) | 50, 100, 180 | Twinkle | opacity, twinkle, rotationSpeed | `src/entities/environment/DepthStarLayers.tsx` |
| **NebulaLayers** | Planes (3) | -20, -50, -100 | Drift | opacity, color, speed | `src/entities/environment/NebulaLayers.tsx` |
| **DistantSilhouettes** | Meshes (3) | -50, -100, -150 | Sway | opacity | `src/entities/environment/DistantSilhouettes.tsx` |
| **OrbitalRings** | Points (3) | -5, -25, -60 | Rotate | opacity, segments | `src/entities/environment/OrbitalRings.tsx` |
| **SubtleLightRays** | Planes (8) | -30 to -120 | Pulse | opacity | `src/entities/environment/SubtleLightRays.tsx` |
| **GroundPlane** | Plane | Y=-8 | Shimmer | opacity, color, size | `src/entities/environment/GroundPlane.tsx` |
| **DepthVignette** | Fullscreen Quad | Screen | No | intensity, radius, softness | `src/entities/environment/DepthVignette.tsx` |
| **DepthFog** | Scene Fog | Global | No | density, color | `src/entities/environment/DepthFog.tsx` |
| **ParallaxLayers** | Planes (4) | -30 to -150 | Camera | opacity, intensity | `src/entities/environment/ParallaxLayers.tsx` |
| **CloudSystem** | Sprites (45) | 7-14 | Drift | opacity, speed | `src/entities/environment/CloudSystem.tsx` |
| **DistantCloudSystem** | Sprites (45) | 20-65 | Drift | opacity, speed | `src/entities/environment/DistantCloudSystem.tsx` |
| **FloatingObjects** | Meshes (~50) | -10 to -130 | Rotate + Drift | opacity, speed | `src/entities/environment/FloatingObjects.tsx` |
| **BackgroundGradient** | Fullscreen | Back | No | colorTop, colorHorizon | `src/entities/environment/BackgroundGradient.tsx` |

## Depth Constants

All depth-related configuration is centralized in `src/constants.ts` under `SCENE_DEPTH`:

```typescript
SCENE_DEPTH = {
  // Atmospheric particles use teal/cyan colors for contrast on warm background
  ATMOSPHERE_LAYERS: {
    NEAR: { z: -15, opacity: 0.5, size: 0.12, count: 150, speed: 1.2, color: '#7ab8c9' },
    MID:  { z: -40, opacity: 0.35, size: 0.08, count: 200, speed: 0.7, color: '#9ac4d4' },
    FAR:  { z: -80, opacity: 0.2, size: 0.05, count: 300, speed: 0.3, color: '#b8d0dc' },
  },
  STAR_LAYERS: {
    NEAR: { radius: 50, count: 300, size: 0.2, opacity: 0.9 },
    MID:  { radius: 100, count: 600, size: 0.12, opacity: 0.7 },
    FAR:  { radius: 180, count: 1000, size: 0.06, opacity: 0.4 },
  },
  // Silhouettes use darker blue-gray for visibility
  SILHOUETTES: {
    LAYER_1: { z: -50, opacity: 0.25, color: '#8a9dad' },
    LAYER_2: { z: -100, opacity: 0.18, color: '#7a8d9d' },
    LAYER_3: { z: -150, opacity: 0.12, color: '#6a7d8d' },
  },
  // Distant clouds at various radii
  DISTANT_CLOUDS: {
    LAYER_1: { radius: 20, count: 8, opacity: 0.35, scale: 1.5 },
    LAYER_2: { radius: 30, count: 10, opacity: 0.25, scale: 2.0 },
    LAYER_3: { radius: 45, count: 12, opacity: 0.18, scale: 2.5 },
    LAYER_4: { radius: 65, count: 15, opacity: 0.12, scale: 3.0 },
  },
  FOG: {
    NEAR_COLOR: '#f5f0e8',  // Warm cream (near)
    FAR_COLOR: '#a8c4d4',   // Cool blue-gray (far)
    DENSITY: 0.008,
  },
  SILHOUETTES: {
    LAYER_1: { z: -50, opacity: 0.12, color: '#c4b5a6' },
    LAYER_2: { z: -100, opacity: 0.08, color: '#b8a99a' },
    LAYER_3: { z: -150, opacity: 0.05, color: '#a89888' },
  },
  NEBULA: {
    INNER: { z: -20, opacity: 0.15, scale: 30 },
    MID:   { z: -50, opacity: 0.1, scale: 60 },
    OUTER: { z: -100, opacity: 0.06, scale: 100 },
  },
  RINGS: {
    INNER: { z: -5, radius: 4, opacity: 0.15 },
    MID:   { z: -25, radius: 12, opacity: 0.08 },
    OUTER: { z: -60, radius: 25, opacity: 0.04 },
  },
  GROUND: { Y: -8, OPACITY: 0.04, SIZE: 100 },
  VIGNETTE: { INTENSITY: 0.4, RADIUS: 0.85, SOFTNESS: 0.5 },
  PARTICLE_Z: { MIN: -8, MAX: 4, VARIANCE: 0.6 },
}
```

## SceneDepthEffects Component

The `SceneDepthEffects` wrapper combines all depth effects:

```tsx
<SceneDepthEffects
  enabled={true}
  enableParticles={true}     // DepthParticleLayers
  enableStars={true}         // DepthStarLayers
  enableNebula={true}        // NebulaLayers
  enableSilhouettes={true}   // DistantSilhouettes
  enableRings={true}         // OrbitalRings
  enableGround={true}        // GroundPlane
  enableVignette={true}      // DepthVignette
  enableFog={false}          // DepthFog (disabled by default)
  enableParallax={true}      // ParallaxLayers
  enableLightRays={true}     // SubtleLightRays
  intensity={1.0}            // Master opacity multiplier
/>
```

## Depth Perception Techniques

### 1. Multi-Layer Atmospheric Particles
Three layers of floating dust motes at different depths:
- **Near (Z: -15)**: Larger (0.08), brighter (60% opacity), faster movement
- **Mid (Z: -40)**: Medium (0.05), moderate (35% opacity), slower
- **Far (Z: -80)**: Tiny (0.03), faint (15% opacity), slowest drift

### 2. Particle Z-Distribution
ParticleSwarm shards have individual Z-offsets:
- Each shard gets a unique `zOffset` based on index seed
- Range: -8 to +4 units (variance: 60%)
- Creates natural depth layering without disrupting orbit

### 3. Depth-Based Star Layers
Three concentric star spheres with parallax during camera rotation:
- **Near (r: 50)**: Warm white, larger, rotate faster
- **Mid (r: 100)**: Pure white, medium
- **Far (r: 180)**: Cool white, tiny, slowest rotation

### 4. Distant Silhouettes
Monument Valley-inspired geometric formations:
- Three layers at Z: -50, -100, -150
- Low-poly cones, boxes, and cylinders
- Opacity decreases with distance (12% → 8% → 5%)
- Subtle parallax sway animation

### 5. Light Ray Depth Cues
God rays at multiple depths with warm-to-cool color shift:
- **Near (Z: -30 to -40)**: Warm cream/peach tones
- **Mid (Z: -70 to -75)**: Neutral warm
- **Far (Z: -100 to -120)**: Cool blue-white

### 6. Orbital Rings
Dotted ring halos suggesting scale:
- **Inner (Z: -5)**: Radius 4, fastest rotation
- **Mid (Z: -25)**: Radius 12, medium speed
- **Outer (Z: -60)**: Radius 25, slowest

### 7. Parallax Background Layers
Gradient overlays that move with camera:
- Four layers at Z: -30, -60, -100, -150
- Near layers move 30% with camera
- Far layers move only 2%
- Creates strong motion parallax

### 8. Vignette
Screen-space radial darkening:
- Inner radius: 85% of screen
- Intensity: 40%
- Draws focus to center (globe)

### 9. Exponential Fog (Optional)
Atmospheric haze for distant objects:
- Cool blue-gray tint for far objects
- Density: 0.008
- Disabled by default (can wash out colors)

## Performance Considerations

| Effect | Draw Calls | Vertices | GPU Impact |
|--------|------------|----------|------------|
| DepthParticleLayers | 3 | ~1,200 | Low |
| DepthStarLayers | 3 | ~4,200 | Low |
| NebulaLayers | ~35 | ~70 | Low |
| DistantSilhouettes | ~15 | ~1,500 | Low |
| OrbitalRings | 3 | ~320 | Low |
| SubtleLightRays | 8 | 8 | Low |
| GroundPlane | 1 | 4 | Negligible |
| DepthVignette | 1 | 4 | Negligible |
| ParallaxLayers | 4 | 16 | Low |
| **ParticleSwarm** | 1 | ~15,000 | **High** |
| **EarthGlobe** | 1 | ~10,000 | **Medium** |

Total depth effects add approximately:
- ~73 draw calls
- ~22,000 vertices
- ~2-3ms frame time on mid-range GPU

## Dev Controls

Toggle depth effects via Leva panel:
- **Visual > Environment > Depth Effects**: Master toggle

Individual components can be enabled/disabled via `SceneDepthEffects` props.

## File Structure

```
src/entities/environment/
├── BackgroundGradient.tsx     # Sky gradient backdrop
├── CloudSystem.tsx            # Soft cloud sprites
├── DepthFog.tsx              # Exponential scene fog
├── DepthParticleLayers.tsx   # Multi-layer dust motes
├── DepthStarLayers.tsx       # Multi-depth star field
├── DepthVignette.tsx         # Screen-space vignette
├── DistantSilhouettes.tsx    # Geometric mountain formations
├── GroundPlane.tsx           # Reflective floor reference
├── NebulaLayers.tsx          # Volumetric cloud layers
├── OrbitalRings.tsx          # Dotted ring halos
├── ParallaxLayers.tsx        # Camera-reactive backgrounds
├── SceneDepthEffects.tsx     # Master depth wrapper
├── SubtleLightRays.tsx       # God ray depth cues
└── index.tsx                 # Environment component
```
