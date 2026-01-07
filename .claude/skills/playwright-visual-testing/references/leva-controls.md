# Leva Controls Reference

Quick reference for commonly used Leva controls in visual testing.

## Glass/Materials

| Control | Range | Default | Description |
|---------|-------|---------|-------------|
| `ior` | 1.0-2.5 | 1.3 | Index of Refraction (glass bending) |
| `glassDepth` | 0.0-1.0 | 0.3 | Simulated glass thickness |
| `shardMaterialType` | enum | polished | Material style |
| `showShardShells` | bool | true | Toggle outer shard shells |

### Material Types

- `polished` - Refined glass with Fresnel (default)
- `frosted` - Legacy refraction shader
- `frostedPhysical` - Physical frosted glass
- `simple` - Basic transparency
- `transmission` - Subtle glass shader
- `cel` - Toon-banded stylized
- `bubble` - Candy glass (high saturation)
- `chromatic` - Prism rainbow edges

## Postprocessing

| Control | Range | Default | Description |
|---------|-------|---------|-------------|
| `usePostprocessingDoF` | bool | false | Enable DoF postprocessing |
| `ppFocalLength` | 0.01-0.1 | 0.02 | Camera focal length |
| `ppBokehScale` | 0-10 | 3 | Bokeh blur size |
| `enableBloom` | bool | true | Toggle bloom glow |
| `bloomIntensity` | 0-2 | 0.25 | Bloom strength |
| `bloomThreshold` | 0-1 | 0.94 | Brightness threshold |
| `enableVignette` | bool | false | Darken edges |

## Environment

| Control | Range | Default | Description |
|---------|-------|---------|-------------|
| `showClouds` | bool | true | Background clouds |
| `showStars` | bool | false | Random star field |
| `showConstellations` | bool | true | Real constellation stars |
| `showSun` | bool | true | Stylized sun |
| `cloudOpacity` | 0-1 | 0.4 | Cloud transparency |
| `sunSize` | 2-20 | 8 | Sun disc size |
| `sunIntensity` | 0.2-2 | 0.85 | Sun brightness |

## Atmosphere

| Control | Range | Default | Description |
|---------|-------|---------|-------------|
| `atmosphereParticleSize` | 0.01-0.5 | 0.08 | Floating particle size |
| `atmosphereBaseOpacity` | 0-1 | 0.1 | Base particle opacity |
| `atmosphereBreathingOpacity` | 0-1 | 0.15 | Added opacity during inhale |
| `atmosphereColor` | color | #8c7b6c | Particle color |

## Colors

| Control | Default | Description |
|---------|---------|-------------|
| `bgColorTop` | #f5f0e8 | Sky gradient top |
| `bgColorHorizon` | #fcf0e0 | Sky gradient horizon |
| `ambientLightColor` | #fff5eb | Ambient light tint |
| `keyLightColor` | #ffe4c4 | Main directional light |

## Camera/DoF

| Control | Range | Default | Description |
|---------|-------|---------|-------------|
| `enableDepthOfField` | bool | true | Toggle DoF effect |
| `focusDistance` | 5-25 | 15 | Sharp focus distance |
| `focalRange` | 1-20 | 8 | Depth of sharp area |
| `maxBlur` | 0-8 | 3 | Maximum blur intensity |

## Debug

| Control | Default | Description |
|---------|---------|-------------|
| `showOrbitBounds` | false | Show particle orbit wireframes |
| `showPhaseMarkers` | false | Show breathing phase markers |
| `showTraitValues` | false | Show ECS trait values |
| `showPerfMonitor` | false | Toggle r3f-perf overlay |

## Example Configurations

### High Contrast Glass
```json
{"ior": 2.0, "glassDepth": 0.6, "shardMaterialType": "polished"}
```

### Dreamy Atmosphere
```json
{"enableBloom": true, "bloomIntensity": 0.5, "ppBokehScale": 6}
```

### Minimal Scene
```json
{"showClouds": false, "showConstellations": false, "showSun": false}
```

### Debug Mode
```json
{"showOrbitBounds": true, "showPhaseMarkers": true, "showPerfMonitor": true}
```
