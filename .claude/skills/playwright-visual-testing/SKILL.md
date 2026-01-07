---
name: playwright-visual-testing
description: Fast visual testing and screenshot automation for breathe-together-v2. Use when you need to capture screenshots of the 3D scene, compare visual changes before/after code modifications, or test different Leva configurations. Provides branch-aware filenames for easy comparison. Works with all viewports (desktop, tablet, mobile).
---

# Playwright Visual Testing

Fast screenshot automation with branch-aware naming and Leva config injection.

## Quick Start

```bash
# Basic screenshot (desktop viewport)
npm run screenshot

# All viewports (desktop, tablet, mobile)
npm run screenshot:all

# With Leva config override
LEVA_CONFIG='{"ior": 1.8, "glassDepth": 0.4}' npm run screenshot

# Before/after comparison
SCREENSHOT_TAG="before" npm run screenshot
# ... make changes ...
SCREENSHOT_TAG="after" npm run screenshot
```

### Screenshot List Output

After each screenshot, the script displays recent screenshots from the current branch:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Recent Screenshots for Current Branch
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  [demo] desktop    2.0MB    1s ago  screenshots/...desktop_demo_20260106-193814.png
  [demo] mobile     0.3MB    6s ago  screenshots/...mobile_demo_20260106-193814.png
  [demo] tablet     0.8MB    5s ago  screenshots/...tablet_demo_20260106-193814.png
  [before] desktop   2.0MB   2m ago  screenshots/...desktop_before_20260106-193612.png
  [after] desktop    2.0MB   1m ago  screenshots/...desktop_after_20260106-193658.png
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

This makes it easy for Claude to see available screenshots for comparison.

## Naming Convention

Screenshots are saved with branch-aware names:
```
./screenshots/<branch>_<viewport>_[tag]_<timestamp>.png
```

Example: `claude-fix-glass-effect_desktop_before_20260106-143052.png`

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `LEVA_CONFIG` | JSON string of Leva control overrides | - |
| `SCREENSHOT_TAG` | Tag to append to filename | - |
| `SCREENSHOT_OUTPUT` | Override output path completely | Auto-generated |
| `NO_MODALS` | Set to `false` to show modals | `true` |
| `ELEMENT_SELECTOR` | CSS selector for element screenshot | `canvas` |

## Workflows

### Visual Change Comparison

```bash
# 1. Capture baseline
SCREENSHOT_TAG="before" npm run screenshot

# 2. Make code changes...

# 3. Capture new state
SCREENSHOT_TAG="after" npm run screenshot

# 4. Compare files in ./screenshots/
```

### Multi-Config Testing

Test different visual configurations quickly:

```bash
SCREENSHOT_TAG="default" npm run screenshot
LEVA_CONFIG='{"ior": 2.0}' SCREENSHOT_TAG="high-ior" npm run screenshot
LEVA_CONFIG='{"ior": 1.2}' SCREENSHOT_TAG="low-ior" npm run screenshot
```

### Updating Code Defaults from Leva Experiments

When you find better visual configurations through Leva experimentation, update the code defaults:

```bash
# 1. Test different Leva configs
LEVA_CONFIG='{"starColor": "#ffc940", "lineOpacity": 0.3}' SCREENSHOT_TAG="golden-stars" npm run screenshot

# 2. Compare results and identify improvements
# (Claude reads screenshots and determines golden-stars config is better)

# 3. Update code defaults in the component file
# Edit src/entities/environment/ConstellationStars.tsx:
#   starColor = '#ffc940',   // updated from '#ffefc2'
#   lineOpacity = 0.3,       // updated from 0.85

# 4. Capture new baseline with updated defaults
SCREENSHOT_TAG="updated-defaults" npm run screenshot

# 5. Verify improvements persist without Leva overrides
```

**Workflow Pattern:**
1. **Experiment** - Use `LEVA_CONFIG` to test different visual parameters
2. **Document** - Screenshot script logs the exact Leva config used
3. **Compare** - Review screenshots to identify improvements
4. **Update** - Change code defaults in component files (not just Leva)
5. **Verify** - Confirm new defaults work without overrides

**Why Update Code Defaults?**
- Leva configs are temporary - code defaults are permanent
- Ensures consistent visuals in production (dev mode disabled)
- Makes improvements discoverable to other developers
- Reduces need for runtime configuration

**Real Example - Constellation Stars Improvement:**
```bash
# Initial state: pale white stars, bright lines
SCREENSHOT_TAG="before" npm run screenshot

# Experiment with golden color and subtle lines
LEVA_CONFIG='{"starColor": "#ffc940", "lineOpacity": 0.3}' SCREENSHOT_TAG="golden" npm run screenshot

# Compare screenshots → golden version is better
# Update src/entities/environment/ConstellationStars.tsx:
#   starColor = '#ffc940',   // was '#ffefc2'
#   lineOpacity = 0.3,       // was 0.85

# Verify new defaults
SCREENSHOT_TAG="after" npm run screenshot
# Result: Golden stars with subtle lines, no Leva override needed
```

### Element Screenshots

Target specific UI elements:

```bash
# Canvas only
ELEMENT_SELECTOR="canvas" npm run screenshot:element

# Phase display
ELEMENT_SELECTOR=".phase-display" npm run screenshot:element

# Custom selector
ELEMENT_SELECTOR="[data-testid='controls']" npm run screenshot:element
```

## AI-Assisted Review

Claude can easily see available screenshots from the list output and read them for comparison:

```
User: SCREENSHOT_TAG="before" npm run screenshot

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Screenshot Configuration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Viewport:     desktop
  Tag:          before
  Output:       ./screenshots/claude-branch_desktop_before_20260106-193612.png
  Leva Config:  (using code defaults)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

User: [Makes code changes]

User: SCREENSHOT_TAG="after" npm run screenshot

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Screenshot Configuration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Viewport:     desktop
  Tag:          after
  Output:       ./screenshots/claude-branch_desktop_after_20260106-193658.png
  Leva Config:  (using code defaults)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Recent Screenshots for Current Branch
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  [after] desktop    2.0MB   1s ago   screenshots/...desktop_after_20260106-193658.png
  [before] desktop   2.0MB   2m ago   screenshots/...desktop_before_20260106-193612.png
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

User: Compare the before and after screenshots

Claude: [Reads both screenshots from the list]
- Before: Pale white constellation stars, bright connecting lines
- After: Golden stars (#ffc940) with subtle lines (opacity 0.3)
- The golden color creates better contrast against the dark background
- Recommendation: Update code defaults to golden configuration
```

The screenshot list and configuration logging make it easy to:
- See exactly what parameters were used for each screenshot
- Identify before/after pairs by tag
- Find recent screenshots by age (1s ago, 5m ago, 1h ago)
- Compare across viewports (desktop, tablet, mobile)
- Reproduce exact configurations from the logged Leva config

## Leva Controls Reference

See [references/leva-controls.md](references/leva-controls.md) for commonly used controls.

Key controls for visual testing:
- `ior` - Glass refraction (1.0-2.5)
- `glassDepth` - Glass thickness (0.0-1.0)
- `shardMaterialType` - Material style (polished, frosted, cel, bubble, chromatic)
- `showShardShells` - Toggle outer shells
- `enableBloom` - Toggle bloom effect
- `bloomIntensity` - Bloom strength (0-2)

## Implementation Details

### Screenshot Ready Signal

The app emits `[SCREENSHOT_READY]` to console when shards are fully rendered.
Tests wait for this signal before capturing.

### Modal Hiding

Modals are hidden via CSS injection to capture clean scene screenshots.
Set `NO_MODALS=false` to capture with modals visible.

### Leva Bridge

`window.__LEVA_SET__` and `window.__LEVA_GET__` are exposed for programmatic
control injection. Only available when dev mode is enabled.

### Screenshot Configuration Logging

Each screenshot run logs complete configuration for reproducibility:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Screenshot Configuration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Viewport:     desktop
  Tag:          golden-stars
  Output:       ./screenshots/claude-branch_desktop_golden-stars_20260106-195711.png
  Leva Config:  {
                  "starColor": "#ffc940",
                  "lineOpacity": 0.3
                }
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

This makes it easy to:
- **Reproduce** screenshots with exact same config
- **Document** what parameters were tested
- **Share** configurations with team members
- **Track** which Leva configs led to code default updates
