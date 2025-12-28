/**
 * Centralized Scene Defaults & Metadata
 *
 * Single source of truth for default values used by Triplex scenes.
 */
import { VISUALS } from '../constants';

/**
 * Property metadata structure.
 *
 * Provides contextual information about when and why to adjust a prop.
 */
export interface PropMetadata {
  /** Contextual guidance: when should this prop be adjusted? */
  whenToAdjust: string;
  /** Visual landmarks showing typical ranges with labels */
  typicalRange: string;
  /** Related props that this interacts with */
  interactsWith?: string[];
  /** Performance implications if relevant */
  performanceNote?: string;
}

// ============================================================================
// VISUAL DEFAULTS
// ============================================================================

export const VISUAL_DEFAULTS = {
  backgroundColor: {
    value: '#0a0a0a' as const,
    meta: {
      whenToAdjust: 'Set scene mood and contrast against the sphere',
      typicalRange: 'Deep Indigo (#0a0a1a) → Dark (#0a0a0a) → Medium (#404040)',
    } as PropMetadata,
  },
  sphereColor: {
    value: VISUALS.SPHERE_COLOR_INHALE,
    meta: {
      whenToAdjust: 'Primary sphere hue for branding or mood',
      typicalRange: 'Cool (#4dd9e8) → Soft (#7ec8d4) → Warm (#9fd9e8)',
    } as PropMetadata,
  },
  sphereOpacity: {
    value: VISUALS.SPHERE_OPACITY,
    meta: {
      whenToAdjust: 'Lower for ethereal, higher for solid',
      typicalRange: '0.05 (subtle) → 0.15 (default) → 0.4 (solid)',
    } as PropMetadata,
  },
  sphereDetail: {
    value: 2 as const,
    meta: {
      whenToAdjust: 'Lower on mobile, higher for smoothness',
      typicalRange: '0 (angular) → 2 (balanced) → 4 (smooth)',
      performanceNote: 'Higher detail increases geometry cost',
    } as PropMetadata,
  },
  particleCount: {
    value: VISUALS.PARTICLE_COUNT,
    meta: {
      whenToAdjust: 'Lower for performance, higher for density',
      typicalRange: '100 (sparse) → 300 (default) → 500 (dense)',
    } as PropMetadata,
  },
} as const;

// ============================================================================
// LIGHTING DEFAULTS
// ============================================================================

export const LIGHTING_DEFAULTS = {
  ambientIntensity: {
    value: VISUALS.AMBIENT_LIGHT_INTENSITY,
    meta: {
      whenToAdjust: 'Raise to reduce contrast, lower for drama',
      typicalRange: '0.2 (moody) → 0.3 (default) → 0.6 (flat)',
    } as PropMetadata,
  },
  ambientColor: {
    value: '#a8b8d0' as const,
    meta: {
      whenToAdjust: 'Overall color temperature of the scene',
      typicalRange: 'Cool (#4080ff) → Neutral (#ffffff) → Warm (#ff9900)',
    } as PropMetadata,
  },
  keyIntensity: {
    value: VISUALS.KEY_LIGHT_INTENSITY_MIN,
    meta: {
      whenToAdjust: 'Primary light strength',
      typicalRange: '0.3 (soft) → 0.4 (default) → 1.0 (dramatic)',
    } as PropMetadata,
  },
  keyColor: {
    value: VISUALS.KEY_LIGHT_COLOR,
    meta: {
      whenToAdjust: 'Hue of the primary directional light',
      typicalRange: 'Cool (#4080ff) → Neutral (#ffffff) → Warm (#ff9900)',
    } as PropMetadata,
  },
} as const;

// ============================================================================
// ENVIRONMENT DEFAULTS
// ============================================================================

export const ENVIRONMENT_DEFAULTS = {
  enableStars: {
    value: true as const,
    meta: {
      whenToAdjust: 'Disable for minimal aesthetic',
      typicalRange: 'false → true',
    } as PropMetadata,
  },
  starsCount: {
    value: 5000 as const,
    meta: {
      whenToAdjust: 'Lower for performance, higher for density',
      typicalRange: '1000 (sparse) → 5000 (default) → 10000 (dense)',
    } as PropMetadata,
  },
  enableFloor: {
    value: true as const,
    meta: {
      whenToAdjust: 'Disable for floating aesthetic',
      typicalRange: 'false → true',
    } as PropMetadata,
  },
  floorColor: {
    value: '#0a0a1a' as const,
    meta: {
      whenToAdjust: 'Match background or add subtle grounding',
      typicalRange: 'Dark Indigo (#0a0a1a) → Deep Night (#050510)',
    } as PropMetadata,
  },
  floorOpacity: {
    value: 0.5 as const,
    meta: {
      whenToAdjust: 'Lower for subtle floor, higher for visible grounding',
      typicalRange: '0.2 (subtle) → 0.5 (default) → 0.8 (visible)',
    } as PropMetadata,
  },
  enablePointLight: {
    value: true as const,
    meta: {
      whenToAdjust: 'Disable for flatter lighting',
      typicalRange: 'false → true',
    } as PropMetadata,
  },
  lightIntensityMin: {
    value: 0.5 as const,
    meta: {
      whenToAdjust: 'Base intensity of the pulsing point light',
      typicalRange: '0.2 (soft) → 0.5 (default) → 1.5 (bright)',
    } as PropMetadata,
  },
  lightIntensityRange: {
    value: 1.5 as const,
    meta: {
      whenToAdjust: 'Amount of breathing modulation',
      typicalRange: '0.5 (subtle) → 1.5 (default) → 2.5 (strong)',
    } as PropMetadata,
  },
} as const;

// ============================================================================
// BREATHING DEBUG DEFAULTS
// ============================================================================

export const BREATHING_DEBUG_DEFAULTS = {
  enableManualControl: {
    value: false as const,
    meta: {
      whenToAdjust: 'Enable for manual phase scrubbing',
      typicalRange: 'false → true',
    } as PropMetadata,
  },
  manualPhase: {
    value: 0.5 as const,
    meta: {
      whenToAdjust: 'Scrub to specific phase positions',
      typicalRange: '0.0 → 1.0',
    } as PropMetadata,
  },
  isPaused: {
    value: false as const,
    meta: {
      whenToAdjust: 'Pause animation',
      typicalRange: 'false → true',
    } as PropMetadata,
  },
  timeScale: {
    value: 1.0 as const,
    meta: {
      whenToAdjust: 'Slow down or speed up breathing',
      typicalRange: '0.1 (slow) → 1.0 (normal) → 5.0 (fast)',
    } as PropMetadata,
  },
  jumpToPhase: {
    value: undefined,
    meta: {
      whenToAdjust: 'Jump to a specific phase',
      typicalRange: '0 (inhale) → 3 (hold-out)',
    } as PropMetadata,
  },
  showOrbitBounds: {
    value: false as const,
    meta: {
      whenToAdjust: 'Visualize orbit range',
      typicalRange: 'false → true',
    } as PropMetadata,
  },
  showPhaseMarkers: {
    value: false as const,
    meta: {
      whenToAdjust: 'Show phase transitions',
      typicalRange: 'false → true',
    } as PropMetadata,
  },
  showTraitValues: {
    value: false as const,
    meta: {
      whenToAdjust: 'Show live trait values',
      typicalRange: 'false → true',
    } as PropMetadata,
  },
} as const;

// ============================================================================
// PARTICLE DEBUG DEFAULTS
// ============================================================================

export const PARTICLE_DEBUG_DEFAULTS = {
  showParticleTypes: {
    value: false as const,
    meta: {
      whenToAdjust: 'Visualize particle orbits',
      typicalRange: 'false → true',
    } as PropMetadata,
  },
  showParticleStats: {
    value: false as const,
    meta: {
      whenToAdjust: 'Show particle stats overlay',
      typicalRange: 'false → true',
    } as PropMetadata,
  },
} as const;

// ============================================================================
// EXPERIMENTAL BREATHING CURVE DEFAULTS
// ============================================================================

export const EXPERIMENTAL_DEFAULTS = {
  curveType: {
    value: 'phase-based' as const,
    meta: {
      whenToAdjust: 'Compare algorithm variants',
      typicalRange: 'phase-based → rounded-wave',
    } as PropMetadata,
  },
  waveDelta: {
    value: 0.05 as const,
    meta: {
      whenToAdjust: 'Pause sharpness for rounded-wave',
      typicalRange: '0.01 (sharp) → 0.05 (balanced) → 0.2 (smooth)',
    } as PropMetadata,
  },
  showCurveInfo: {
    value: false as const,
    meta: {
      whenToAdjust: 'Show curve debug overlay',
      typicalRange: 'false → true',
    } as PropMetadata,
  },
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// biome-ignore lint/suspicious/noExplicitAny: Generic utility that extracts values from heterogeneous objects
export function getDefaultValues<T extends Record<string, { value: unknown }>>(
  defaults: T,
): Record<keyof T, any> {
  // biome-ignore lint/suspicious/noExplicitAny: Dynamic object iteration requires flexible typing
  const result: Record<string, any> = {};
  for (const [key, entry] of Object.entries(defaults)) {
    // biome-ignore lint/suspicious/noExplicitAny: Entry type varies, cast needed
    result[key] = (entry as any).value;
  }
  // biome-ignore lint/suspicious/noExplicitAny: Return type matches function signature
  return result as Record<keyof T, any>;
}
