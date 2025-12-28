/**
 * Shared Scene Property Types
 *
 * Centralized type definitions for all scene props across production, experimental,
 * and debug scenes. Eliminates duplication and provides standardized JSDoc format.
 *
 * Organized into 4 tiers:
 * - Tier 1: Quality preset (low/medium/high/custom)
 * - Tier 2: Primary visual controls (7-8 props)
 * - Tier 3: Advanced tuning (20-25 props)
 * - Tier 4: Debug overlays (15-20 props, debug scene only)
 *
 * Each prop includes standardized JSDoc with:
 * - One-line summary
 * - "When to adjust" contextual guidance
 * - "Typical range" with visual landmarks
 * - "Interacts with" related props
 * - Performance notes (if applicable)
 * - Triplex annotations (@min, @max, @step, @default)
 */

/**
 * Quality preset for adaptive prop configuration
 *
 * Selects a preset configuration that automatically adjusts 20+ underlying props:
 * - **low**: Mobile-friendly (100 particles, 0.5 ambient, basic lighting)
 * - **medium**: Production default (300 particles, 0.4 ambient, balanced)
 * - **high**: High-end visuals (500 particles, 0.3 ambient, enhanced effects)
 * - **custom**: Manual control - unlocks all advanced props
 *
 * **When to adjust:** Use "low" for performance-constrained devices, "high" for showcase/presentation
 * **Typical range:** low (mobile) → medium (production) → high (premium experience) → custom (experimentation)
 * **Interacts with:** All particle, lighting, and visual props (overridden by preset, unless custom mode)
 * **Performance note:** "low" reduces particle count and lighting quality for 60 FPS on lower-end devices
 *
 * @default "medium"
 */
export type QualityPreset = 'low' | 'medium' | 'high' | 'custom';

// ============================================================================
// TIER 2 & 3: SHARED VISUAL & LIGHTING PROPS
// ============================================================================

/**
 * Scene background color.
 *
 * Sets the canvas background. Affects mood and visual balance.
 *
 * **When to adjust:** Create focal point contrast, align with brand colors, establish mood (dark for calm, light for energetic)
 * **Typical range:** Very dark (#000000, depth) → Dark (#0a0a0a, default) → Medium (#404040, neutral) → Light (#808080, bright)
 * **Interacts with:** ambientIntensity (dark backgrounds need 0.4-0.6 ambient, light backgrounds need 0.1-0.3)
 *
 * @type color
 * @default "#0a0a0a"
 */
export interface SharedVisualProps {
  backgroundColor?: string;

  /**
   * Central breathing sphere base color.
   *
   * Primary focal point color. Changes during breathing animation via shader.
   *
   * **When to adjust:** Create visual focal point, align with brand palette, establish atmosphere
   * **Typical range:** Muted (#4080ff, calm) → Standard (#4dd9e8, balanced) → Vibrant (#60a5fa, energetic) → Glowing (#7dd3fc, intense)
   * **Interacts with:** fresnelPower (affects edge glow intensity and color bleed), keyColor (lighting should complement sphere)
   * **Performance note:** No impact; color is computed in shader
   *
   * @type color
   * @default "#4080ff"
   */
  sphereColor?: string;

  /**
   * Sphere material transparency (opacity/alpha).
   *
   * Controls how translucent the sphere appears. Lower values = more transparent.
   * Blends with background, creating ethereal effect.
   *
   * **When to adjust:** Lower (0.05-0.2) for subtle ethereal feel, higher (0.5-1.0) for solid presence
   * **Typical range:** Invisible (0.0) → Very transparent (0.1) → Balanced (0.5) → Fully opaque (1.0)
   * **Interacts with:** backgroundColor (contrast affects readability), particleColor (particles should contrast with sphere)
   * **Performance note:** Transparency requires blending pass; no significant impact
   *
   * @min 0
   * @max 1
   * @step 0.01
   * @default 0.15
   */
  sphereOpacity?: number;

  /**
   * Sphere geometry segment count (detail level).
   *
   * Controls smoothness of sphere surface. Higher = smoother but more GPU cost.
   *
   * **When to adjust:** Lower (16-32) on mobile for performance, higher (64+) for premium visual quality
   * **Typical range:** Low detail (16, angular) → Medium (32, balanced) → High (64, smooth) → Ultra (128, very smooth)
   * **Performance note:** Significant GPU impact; each +16 segments ~1-2% more draw call time
   *
   * @min 16
   * @max 128
   * @step 16
   * @default 64
   */
  sphereSegments?: number;

  /**
   * Ambient light intensity (non-directional base illumination).
   *
   * Provides uniform lighting across entire scene. Foundation for all lighting.
   * Lower = darker shadows, higher = flatter, more washed out appearance.
   *
   * **When to adjust:** Dark backgrounds (0.4-0.6) for contrast, light backgrounds (0.1-0.3) to avoid washout
   * **Typical range:** Dim (0.2, deep shadows) → Standard (0.4, balanced) → Bright (0.6, reduced contrast) → Washed (0.8+, flat)
   * **Interacts with:** backgroundColor (must balance so sphere is readable), keyIntensity (key light should be 2-3x ambient)
   *
   * @min 0
   * @max 1
   * @step 0.05
   * @default 0.4
   */
  ambientIntensity?: number;

  /**
   * Ambient light color (non-directional base tone).
   *
   * Tints the entire scene with a color cast. White = neutral, blue = cool, orange = warm.
   *
   * **When to adjust:** Change mood: cool blue (calm, meditative), warm orange (energetic, warm)
   * **Typical range:** Cool (#4080ff, calming) → Neutral (#ffffff, balanced) → Warm (#ff9900, energetic)
   * **Interacts with:** backgroundColor (should complement), keyColor (lights should use similar color temperature)
   *
   * @type color
   * @default "#a8b8d0"
   */
  ambientColor?: string;

  /**
   * Key light position (main directional light).
   *
   * Controls where the primary light source is in 3D space. [x, y, z] coordinates.
   * Typical: [2, 3, 5] places light in front-right-above.
   *
   * **When to adjust:** Adjust for different time-of-day effects or to spotlight specific parts of sphere
   * **Typical range:** Front-right ([2, 3, 5]) → Right side ([5, 2, 0]) → Left side ([-5, 3, 2])
   * **Interacts with:** keyIntensity (position should be matched with intensity for balance), rimColor (rim should oppose key)
   * **Performance note:** No impact; lighting computed per-fragment
   *
   * @type vector3
   * @default [2, 3, 5]
   */
  keyPosition?: [number, number, number];

  /**
   * Key light intensity (main light strength).
   *
   * Controls brightness of primary directional light.
   * Modulates with breathing phase for dynamic effect.
   *
   * **When to adjust:** 0.8-1.2 for gentle, 1.2-1.8 for dramatic, >2.0 for blown-out highlights
   * **Typical range:** Subtle (0.8, soft) → Standard (1.2, balanced) → Dramatic (1.8, strong) → Extreme (2.0+, blown-out)
   * **Interacts with:** ambientIntensity (should be 2-3x ambient for good contrast), fillIntensity (key should dominate)
   *
   * @min 0
   * @max 2
   * @step 0.1
   * @default 1.2
   */
  keyIntensity?: number;

  /**
   * Key light color (main light tone).
   *
   * Tints the primary light source. White = neutral, blue = cool, orange = warm.
   *
   * **When to adjust:** Match theme: cool blue for meditative, warm for energetic
   * **Typical range:** Cool (#4080ff, calm) → Neutral (#ffffff, balanced) → Warm (#ff9900, warm)
   * **Interacts with:** keyPosition (position + color determine key light role), fillColor (fill should have opposite tone)
   *
   * @type color
   * @default "#ffffff"
   */
  keyColor?: string;

  /**
   * Fill light position (shadow softening light).
   *
   * Secondary light opposite the key light. Reduces shadow harshness and provides modeling.
   * Typical: [-2, -1, -3] (opposite side from key).
   *
   * **When to adjust:** Adjust distance/angle for different fill ratio (how much shadow fill vs key drama)
   * **Typical range:** Far away ([-5, -3, -5], hard shadows) → Balanced ([-2, -1, -3], natural) → Close ([-1, 1, -1], soft fills)
   * **Interacts with:** fillIntensity (position affects how much fill is needed), keyPosition (should be on opposite side)
   *
   * @type vector3
   * @default [-2, -1, -3]
   */
  fillPosition?: [number, number, number];

  /**
   * Fill light intensity (shadow softness).
   *
   * How much the fill light brightens shadows. Lower = dramatic dark shadows, higher = soft fills.
   *
   * **When to adjust:** 0.1-0.2 for drama, 0.3-0.5 for softness, >0.5 for very flat appearance
   * **Typical range:** Hard (0.1, deep shadows) → Balanced (0.3, natural) → Soft (0.5, reduced contrast) → Flat (0.8+, no shadows)
   * **Interacts with:** keyIntensity (key should dominate over fill), ambientIntensity (fill + ambient = base brightness)
   *
   * @min 0
   * @max 1
   * @step 0.05
   * @default 0.3
   */
  fillIntensity?: number;

  /**
   * Fill light color (shadow tone).
   *
   * Tints the shadow-filling light. Usually cool tone to contrast with warm key light.
   *
   * **When to adjust:** Create color contrast: if key is warm orange, fill should be cool blue
   * **Typical range:** Warm (#ff9900) → Neutral (#ffffff) → Cool (#4080ff)
   * **Interacts with:** keyColor (should be complementary; warm key + cool fill creates dimension), fillIntensity (color saturation)
   *
   * @type color
   * @default "#ffffff"
   */
  fillColor?: string;

  /**
   * Rim light position (edge definition light).
   *
   * Backlighting that creates edge glow and separates sphere from background.
   * Typical: [0, -5, -5] (behind and below).
   *
   * **When to adjust:** Vary angle for different rim position; up/down for different edge definition
   * **Typical range:** Behind ([0, -5, -5]) → High rim ([0, 5, -5], top edge) → Side rim ([5, 0, -5], side edge)
   * **Interacts with:** rimIntensity (intensity should match goal intensity for rim effect)
   *
   * @type vector3
   * @default [0, -5, -5]
   */
  rimPosition?: [number, number, number];

  /**
   * Rim light intensity (edge glow strength).
   *
   * How bright the rim/backlighting is. Creates separation from background.
   *
   * **When to adjust:** 0.1-0.3 for subtle edge, 0.5-0.8 for strong glow effect
   * **Typical range:** Subtle (0.2, soft edge) → Balanced (0.5, clear separation) → Strong (0.8, dramatic glow) → Extreme (1.0+, blown-out rim)
   * **Interacts with:** rimColor (intensity affects color saturation), backgroundColor (contrast needed for rim to be visible)
   *
   * @min 0
   * @max 1
   * @step 0.05
   * @default 0.5
   */
  rimIntensity?: number;

  /**
   * Rim light color (edge glow tone).
   *
   * Tints the rim/backlighting. Usually pale cyan or complementary to key light.
   *
   * **When to adjust:** Match theme: pale cyan for cool/calm, pale orange for warm/energetic
   * **Typical range:** Cool (#4080ff) → Neutral (#ffffff) → Warm (#ff9900)
   * **Interacts with:** rimPosition (position affects which colors are visible), rimIntensity (color saturation)
   *
   * @type color
   * @default "#ffffff"
   */
  rimColor?: string;

  /**
   * Enable ambient light (non-directional base illumination).
   *
   * **When to adjust:** Disable for dramatic high-contrast lighting, enable for balanced scene
   * **Interacts with:** ambientIntensity, ambientColor (only apply when enabled)
   *
   * @default true
   */
  enableAmbient?: boolean;

  /**
   * Enable key light (main directional light source).
   *
   * **When to adjust:** Disable to test ambient-only mood, enable for standard 3-point lighting
   * **Interacts with:** keyPosition, keyIntensity, keyColor (only apply when enabled)
   *
   * @default true
   */
  enableKey?: boolean;

  /**
   * Enable fill light (shadow-softening opposite light).
   *
   * **When to adjust:** Disable for dramatic shadows, enable for soft natural lighting
   * **Interacts with:** fillPosition, fillIntensity, fillColor (only apply when enabled)
   *
   * @default true
   */
  enableFill?: boolean;

  /**
   * Enable rim light (edge definition/backlighting).
   *
   * **When to adjust:** Disable for minimal setup, enable for edge glow separation
   * **Interacts with:** rimPosition, rimIntensity, rimColor (only apply when enabled)
   *
   * @default true
   */
  enableRim?: boolean;

  /**
   * Number of background stars in particle field.
   *
   * Creates deep space atmosphere. Higher = denser star field.
   *
   * **When to adjust:** 1000-3000 for sparse (fast), 5000 for standard, 8000+ for dense (slower)
   * **Typical range:** Sparse (1000, individual stars) → Standard (5000, balanced) → Dense (10000, full field)
   * **Performance note:** Linear impact on initialization; no runtime cost after creation
   *
   * @min 1000
   * @max 10000
   * @step 500
   * @default 5000
   */
  starsCount?: number;

  /**
   * Floor/ground plane color.
   *
   * Base for scene ground. Usually dark to minimize distraction.
   *
   * **When to adjust:** Darker (#0a0a1a) for focus on sphere, lighter (#1a3a5a) for more ground presence
   * **Typical range:** Very dark (#000000, recedes) → Dark (#0a0a1a, standard) → Medium (#1a3a5a, visible)
   * **Interacts with:** backgroundColor (should coordinate with background for cohesion)
   *
   * @type color
   * @default "#0a0a1a"
   */
  floorColor?: string;

  /**
   * Number of user/filler particles in system.
   *
   * Total particles distributed on Fibonacci sphere. Affects visual density and presence visualization.
   *
   * **When to adjust:** 50-150 for sparse (fast), 300 for standard (production), 500+ for dense visualization
   * **Typical range:** Minimal (50, individual particles) → Standard (300, production) → Dense (500, showcase)
   * **Performance note:** O(n) rendering via InstancedMesh; 300 = negligible, 500 = ~1-2% GPU cost
   *
   * @min 50
   * @max 500
   * @step 50
   * @default 300
   */
  particleCount?: number;
}

// ============================================================================
// ENVIRONMENT PROPS (stars, floor, point light)
// ============================================================================

/**
 * Environment scene props (stars, floor, point light).
 *
 * Controls background atmospheric elements with enable/disable toggles.
 * Exposed props support common adjustments in Triplex editor.
 */
export interface SharedEnvironmentProps {
  /**
   * Enable stars background (starfield rendering).
   *
   * **When to adjust:** Disable for minimal aesthetic, enable for space atmosphere
   * **Interacts with:** starsCount (only applies when enabled)
   *
   * @default true
   */
  enableStars?: boolean;

  /**
   * Enable floor plane (ground reference).
   *
   * **When to adjust:** Disable for floating aesthetic, enable for grounded feel
   * **Interacts with:** floorColor, floorOpacity (only apply when enabled)
   *
   * @default true
   */
  enableFloor?: boolean;

  /**
   * Floor plane opacity (transparency).
   *
   * Controls floor visibility from 0 (invisible) to 1 (fully opaque).
   *
   * **When to adjust:** 0.3-0.5 for subtle reference, 0.7+ for visible presence
   * **Typical range:** Ghost-like (0.2) → Subtle (0.5) → Visible (0.8)
   * **Interacts with:** backgroundColor (floor should blend with background)
   *
   * @min 0
   * @max 1
   * @step 0.05
   * @default 0.5
   */
  floorOpacity?: number;

  /**
   * Enable breathing point light (pulsing atmospheric light).
   *
   * **When to adjust:** Disable for directional-only lighting, enable for ambient glow
   * **Interacts with:** lightIntensityMin, lightIntensityRange (only apply when enabled)
   *
   * @default true
   */
  enablePointLight?: boolean;

  /**
   * Point light base intensity (non-breathing).
   *
   * Minimum light brightness. Breathes up by lightIntensityRange.
   *
   * **When to adjust:** 0.2-0.5 for subtle glow, 0.8-1.5 for prominent, 2.0+ for bright
   * **Typical range:** Subtle (0.2) → Standard (0.5) → Prominent (1.0) → Bright (2.0+)
   * **Interacts with:** lightIntensityRange (adds to base intensity)
   *
   * @min 0
   * @max 5
   * @step 0.1
   * @default 0.5
   */
  lightIntensityMin?: number;

  /**
   * Point light breathing modulation range.
   *
   * How much intensity changes with breathing cycle. Creates pulsing ambient light effect.
   *
   * **When to adjust:** 0.5-1.0 for subtle breathing, 1.5-2.5 for pronounced pulse
   * **Typical range:** Subtle (0.5) → Moderate (1.5) → Strong (2.5) → Extreme (3.0+)
   *
   * @min 0
   * @max 5
   * @step 0.1
   * @default 1.5
   */
  lightIntensityRange?: number;
}

// ============================================================================
// EXPERIMENTAL BREATHING CURVE PROPS (breathing.scene.tsx)
// ============================================================================

/**
 * Experimental breathing curve algorithm selection.
 *
 * Compares different breathing animation algorithms.
 * - **phase-based**: Current production algorithm (discrete phases with custom easing)
 * - **rounded-wave**: Experimental continuous arctangent-smoothed wave
 *
 * **When to adjust:** Compare algorithms using waveDelta fine-tuning
 * **Typical range:** phase-based (production) → rounded-wave (experimental)
 * **Interacts with:** waveDelta (only affects rounded-wave curve type)
 *
 * @default "phase-based"
 */
export interface ExperimentalBreathProps {
  curveType?: 'phase-based' | 'rounded-wave';

  /**
   * Rounded wave pause sharpness (rounded-wave algorithm only).
   *
   * Controls how pronounced pauses are at breathing peaks. Lower = sharper pauses, higher = smoother flow.
   * Only affects "rounded-wave" curve type; ignored for "phase-based".
   *
   * **When to adjust:** 0.01-0.03 for sharp pauses (box-like), 0.05 for balanced, 0.1-0.2 for smooth (nearly sinusoidal)
   * **Typical range:** Very sharp (0.01, box-like) → Balanced (0.05, natural) → Smooth (0.2, flowing)
   * **Interacts with:** curveType (only applies to "rounded-wave"), timeScale (fine-tunes pause ratio within phase)
   *
   * @min 0.01
   * @max 0.2
   * @step 0.01
   * @default 0.05
   */
  waveDelta?: number;

  /**
   * Show live curve comparison overlay.
   *
   * Displays current curve type and configuration in corner. Useful for comparing algorithms side-by-side.
   *
   * **When to adjust:** Enable when comparing phase-based vs rounded-wave to visualize differences
   * **Typical range:** false (hidden) → true (visible info overlay)
   *
   * @default false
   */
  showCurveInfo?: boolean;
}

// ============================================================================
// BREATHING DEBUG PROPS (breathing.debug.scene.tsx)
// ============================================================================

/**
 * Breathing animation debug controls.
 *
 * Manual override and visualization of breathing animation state.
 * Zero production impact; only active in debug scene.
 */
export interface BreathingDebugProps {
  /**
   * Enable manual breathing phase control (UTC synchronization override).
   *
   * When enabled, completely overrides global UTC-based synchronization.
   * Allows frame-by-frame scrubbing via manualPhase slider.
   *
   * **When to adjust:** Enable for detailed frame-by-frame visual inspection and animation debugging
   * **Typical range:** false (synchronized) → true (manual control)
   * **Interacts with:** manualPhase (only active when enableManualControl is true)
   *
   * @default false
   */
  enableManualControl?: boolean;

  /**
   * Manual breath phase position (0 = exhaled, 1 = inhaled).
   *
   * Only active when enableManualControl is true. Use to scrub through entire breathing cycle.
   *
   * **When to adjust:** Scrub to specific points: 0.25 (quarter way), 0.5 (halfway), 0.75 (three-quarters)
   * **Typical range:** Start (0.0, fully exhaled) → Half (0.5, middle) → End (1.0, fully inhaled)
   * **Interacts with:** enableManualControl (must be true to have effect), timeScale (can combine with slow timeScale for step-through)
   *
   * @min 0
   * @max 1
   * @step 0.01
   * @default 0.5
   */
  manualPhase?: number;

  /**
   * Pause breathing animation at current point.
   *
   * Freezes animation. Useful combined with manualPhase for frame-by-frame inspection.
   *
   * **When to adjust:** Pause at key moments: inhale/exhale transitions, peak breathing
   * **Typical range:** false (playing) → true (paused)
   * **Interacts with:** manualPhase (can scrub while paused), timeScale (pausable independent of scale)
   *
   * @default false
   */
  isPaused?: boolean;

  /**
   * Time scale multiplier (animation speed).
   *
   * Speeds up or slows down breathing animation. 1.0 = normal, <1.0 = slower, >1.0 = faster.
   *
   * **When to adjust:** 0.1-0.5 for slow-motion analysis, 2.0-5.0 for quick iteration
   * **Typical range:** Very slow (0.1, 10x slower) → Normal (1.0, realtime) → Fast (5.0, 5x faster)
   * **Interacts with:** isPaused (can pause at any timeScale), manualPhase (fine control within phases)
   *
   * @min 0.1
   * @max 5.0
   * @step 0.1
   * @default 1.0
   */
  timeScale?: number;

  /**
   * Jump to specific breathing phase start.
   *
   * Instantly teleport to phase beginning: 0=Inhale, 1=Hold-in, 2=Exhale, 3=Hold-out.
   * Automatically resets after applying.
   *
   * **When to adjust:** Jump to analyze specific phases: 0 (inhale), 2 (exhale), etc.
   * **Typical range:** Inhale (0) → Hold-in (1) → Exhale (2) → Hold-out (3)
   * **Interacts with:** manualPhase (use with manualPhase for fine-grained control within phase)
   *
   * @min 0
   * @max 3
   * @step 1
   * @default 0
   */
  jumpToPhase?: 0 | 1 | 2 | 3;

  /**
   * Show particle orbit bounds visualization.
   *
   * Renders three wireframe spheres:
   * - Green: Min orbit (particles on inhale)
   * - Red: Max orbit (particles on exhale)
   * - Yellow: Current orbit (updates with breathing)
   *
   * **When to adjust:** Enable to visualize particle orbit range and breathing proportions
   * **Typical range:** false (hidden) → true (visible orbits)
   *
   * @default false
   */
  showOrbitBounds?: boolean;

  /**
   * Show phase transition markers.
   *
   * Renders colored torus rings at cardinal points. Active marker lights up as you progress:
   * - Green: Inhale (top)
   * - Blue: Hold-in (right)
   * - Red: Exhale (bottom)
   * - Yellow: Hold-out (left)
   *
   * **When to adjust:** Enable to learn/verify cycle timing and phase transitions
   * **Typical range:** false (hidden) → true (visible markers)
   *
   * @default false
   */
  showPhaseMarkers?: boolean;

  /**
   * Show real-time trait values overlay.
   *
   * Displays numerical values in top-left corner:
   * - Phase: 0-1 within current phase
   * - Type: Current phase name
   * - Orbit: Current particle orbit radius
   * - Scale: Current sphere scale multiplier
   *
   * **When to adjust:** Enable to inspect exact animation state and validate algorithm
   * **Typical range:** false (hidden) → true (visible stats)
   *
   * @default false
   */
  showTraitValues?: boolean;
}

// ============================================================================
// PARTICLE DEBUG PROPS (breathing.debug.scene.tsx)
// ============================================================================

/**
 * Particle system debug controls.
 *
 * Fine-grained control over user and filler particle visuals.
 * Supports different geometry, material, and scale configurations per particle type.
 */
export interface ParticleDebugProps {
  /**
   * User particle geometry type (connected user particles).
   *
   * Visual shape of particles from real users. Different types affect performance and aesthetic.
   *
   * **When to adjust:** icosahedron (smooth, balanced), sphere (perfect geometry), box (blocky), octahedron (8-sided), tetrahedron (4-sided)
   * **Typical range:** icosahedron (smooth, balanced) → sphere (rounder) → box (blocky) → octahedron/tetrahedron (angular)
   * **Interacts with:** userParticleDetail (detail level specific to chosen geometry)
   * **Performance note:** All geometries have similar cost; choice is purely visual
   *
   * @default "icosahedron"
   */
  userParticleGeometry?: 'icosahedron' | 'sphere' | 'box' | 'octahedron' | 'tetrahedron';

  /**
   * User particle geometry detail level (smoothness).
   *
   * Controls vertex count and smoothness. Higher = smoother but more GPU cost.
   * Typical: 0-1 (low detail), 2-3 (medium), 4+ (high detail).
   *
   * **When to adjust:** 0-1 on mobile for performance, 2-3 for balanced, 4 for premium quality
   * **Typical range:** Low (0, angular) → Medium (2, balanced) → High (4, smooth)
   * **Interacts with:** userParticleGeometry (detail meaning varies by geometry type)
   * **Performance note:** Moderate impact; higher detail increases vertex buffer size
   *
   * @min 0
   * @max 4
   * @step 1
   * @default 2
   */
  userParticleDetail?: number;

  /**
   * User particle base scale (size multiplier).
   *
   * Controls size relative to Fibonacci sphere distribution. 1.0 = natural size, <1.0 = smaller, >1.0 = larger.
   *
   * **When to adjust:** 0.5-0.8 (small, de-emphasized), 1.0-1.5 (prominent), 2.0+ (very large)
   * **Typical range:** Small (0.5) → Standard (1.2, default) → Large (2.0)
   * **Interacts with:** fillerParticleScale (should visually distinguish user vs filler), particleCount (more particles with smaller scale)
   *
   * @min 0.5
   * @max 2.0
   * @step 0.1
   * @default 1.2
   */
  userParticleScale?: number;

  /**
   * User particle breathing pulse intensity.
   *
   * How much particles scale with breathing animation. 0.0 = static, 0.2 = ±10%, 0.5 = ±25%.
   *
   * **When to adjust:** 0.0 for static presence, 0.1-0.2 for subtle pulse, 0.3+ for strong breathing effect
   * **Typical range:** Static (0.0) → Subtle (0.1) → Standard (0.2) → Strong (0.5)
   * **Interacts with:** sphereScale (particles and sphere should pulse together for cohesion), timeScale (affects pulse timing)
   * **Performance note:** No impact; computed in shader
   *
   * @min 0
   * @max 0.5
   * @step 0.05
   * @default 0.2
   */
  userParticlePulse?: number;

  /**
   * Filler particle geometry type (placeholder particles).
   *
   * Visual shape of particles when fewer than 300 users connected. Can differ from user particles.
   *
   * **When to adjust:** Match userParticleGeometry for consistency, or choose differently for visual distinction
   * **Typical range:** icosahedron (match user particles) → sphere/box (distinct style)
   * **Interacts with:** fillerParticleDetail (detail level for this geometry), userParticleGeometry (visual relationship)
   *
   * @default "icosahedron"
   */
  fillerParticleGeometry?: 'icosahedron' | 'sphere' | 'box' | 'octahedron' | 'tetrahedron';

  /**
   * Filler particle geometry detail level.
   *
   * @min 0
   * @max 4
   * @step 1
   * @default 2
   */
  fillerParticleDetail?: number;

  /**
   * Filler particle base scale (size multiplier).
   *
   * Should be smaller than userParticleScale to visually de-emphasize filler particles.
   * Typical: 0.6-0.9 (smaller than user particles at 1.2).
   *
   * **When to adjust:** 0.5-0.7 (small, visually recede), 0.8-1.0 (similar to users)
   * **Typical range:** Small (0.5) → Standard (0.8, default) → Large (1.5)
   * **Interacts with:** userParticleScale (should be visually distinct; typically 60-70% of user scale)
   *
   * @min 0.5
   * @max 2.0
   * @step 0.1
   * @default 0.8
   */
  fillerParticleScale?: number;

  /**
   * Filler particle breathing pulse intensity.
   *
   * @min 0
   * @max 0.5
   * @step 0.05
   * @default 0.1
   */
  fillerParticlePulse?: number;

  /**
   * Show particle type visualization.
   *
   * Renders wireframe sphere indicators for orbit ranges:
   * - Green: User particle orbit
   * - Red: Filler particle orbit
   *
   * **When to adjust:** Enable to visualize orbit separation and particle distribution
   * **Typical range:** false (hidden) → true (visible orbits)
   *
   * @default false
   */
  showParticleTypes?: boolean;

  /**
   * Show particle statistics overlay.
   *
   * Displays real-time particle counts:
   * - Total particles
   * - User/filler split
   * - Active count (respects adaptive quality)
   *
   * **When to adjust:** Enable to monitor particle status and adaptive quality throttling
   * **Typical range:** false (hidden) → true (visible stats)
   *
   * @default false
   */
  showParticleStats?: boolean;
}

// ============================================================================
// COMPOSITE SCENE PROP TYPES
// ============================================================================

/**
 * Production scene props (breathing.tsx).
 *
 * Combines shared visual/lighting, environment, and particle count.
 * No debug controls or experimental features.
 */
export type BreathingLevelProps = SharedVisualProps &
  SharedEnvironmentProps & {
    /**
     * Quality preset (for future extensibility).
     * Currently not used in production, but included for consistency.
     */
    qualityPreset?: QualityPreset;
  };

/**
 * Experimental scene props (breathing.scene.tsx).
 *
 * Extends production props with breathing curve experimentation.
 * Wraps BreathingLevel with BreathCurveProvider.
 */
export type BreathingSceneProps = SharedVisualProps &
  SharedEnvironmentProps &
  ExperimentalBreathProps;

/**
 * Debug scene props (breathing.debug.scene.tsx).
 *
 * Full control over breathing animation, visualization, and particles.
 * Only active in debug scene; zero production impact.
 */
export type BreathingDebugSceneProps = SharedVisualProps &
  SharedEnvironmentProps &
  ExperimentalBreathProps &
  BreathingDebugProps &
  ParticleDebugProps & {
    /**
     * Quality preset for adaptive configuration.
     * When set to non-"custom", automatically adjusts underlying props.
     *
     * @default "medium"
     */
    qualityPreset?: QualityPreset;
  };
