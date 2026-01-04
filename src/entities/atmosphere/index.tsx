/**
 * AtmosphereEffects - Master component for globe atmosphere effects
 *
 * Combines all atmospheric visual effects that respond to breathing:
 * - BreathFireflies: Glowing motes that emerge during exhale
 * - CloudWisps: Delicate, wispy clouds at atmosphere boundary
 * - BreathRays: Light rays that pulse with breathing
 * - RippleWaves: Expanding rings on phase transitions
 * - ConnectionLines: Constellation lines between particles
 * - FloatingSymbols: Orbiting meditation icons
 * - AuroraBorealis: Northern lights at poles
 * - MeteorShowers: Shooting star streaks
 * - EnergyField: Fresnel-based protective bubble
 *
 * All effects are individually toggleable and have breath synchronization.
 */

import { memo } from 'react';
import { AuroraBorealis, type AuroraBorealisProps } from './AuroraBorealis';
import { BreathFireflies, type BreathFirefliesProps } from './BreathFireflies';
import { BreathRays, type BreathRaysProps } from './BreathRays';
import { CloudWisps, type CloudWispsProps } from './CloudWisps';
import { ConnectionLines, type ConnectionLinesProps } from './ConnectionLines';
import { EnergyField, type EnergyFieldProps } from './EnergyField';
import { FloatingSymbols, type FloatingSymbolsProps } from './FloatingSymbols';
import { MeteorShowers, type MeteorShowersProps } from './MeteorShowers';
import { RippleWaves, type RippleWavesProps } from './RippleWaves';

export type { AuroraBorealisProps } from './AuroraBorealis';
// Re-export individual components
export { AuroraBorealis } from './AuroraBorealis';
export type { BreathFirefliesProps } from './BreathFireflies';
export { BreathFireflies } from './BreathFireflies';
export type { BreathRaysProps } from './BreathRays';
export { BreathRays } from './BreathRays';
export type { CloudWispsProps } from './CloudWisps';
export { CloudWisps } from './CloudWisps';
export type { ConnectionLinesProps } from './ConnectionLines';
export { ConnectionLines } from './ConnectionLines';
export type { EnergyFieldProps } from './EnergyField';
export { EnergyField } from './EnergyField';
export type { FloatingSymbolsProps } from './FloatingSymbols';
export { FloatingSymbols } from './FloatingSymbols';
export type { MeteorShowersProps } from './MeteorShowers';
export { MeteorShowers } from './MeteorShowers';
export type { RippleWavesProps } from './RippleWaves';
export { RippleWaves } from './RippleWaves';

export interface AtmosphereEffectsProps {
  /**
   * Master toggle for all atmosphere effects
   * @default true
   */
  enabled?: boolean;

  /**
   * Toggle individual effects
   */
  showFireflies?: boolean;
  showCloudWisps?: boolean;
  showBreathRays?: boolean;
  showRippleWaves?: boolean;
  showConnectionLines?: boolean;
  showFloatingSymbols?: boolean;
  showAurora?: boolean;
  showMeteors?: boolean;
  showEnergyField?: boolean;

  /**
   * Individual effect configurations
   */
  fireflies?: Partial<BreathFirefliesProps>;
  cloudWisps?: Partial<CloudWispsProps>;
  breathRays?: Partial<BreathRaysProps>;
  rippleWaves?: Partial<RippleWavesProps>;
  connectionLines?: Partial<ConnectionLinesProps>;
  floatingSymbols?: Partial<FloatingSymbolsProps>;
  aurora?: Partial<AuroraBorealisProps>;
  meteors?: Partial<MeteorShowersProps>;
  energyField?: Partial<EnergyFieldProps>;
}

/**
 * AtmosphereEffects - Unified atmosphere visual effects
 *
 * Use this component to add all atmosphere effects at once,
 * or import individual effects for more control.
 *
 * All effects sync with the global UTC-based breathing cycle.
 */
export const AtmosphereEffects = memo(function AtmosphereEffects({
  enabled = true,
  showFireflies = true,
  showCloudWisps = true,
  showBreathRays = true,
  showRippleWaves = true,
  showConnectionLines = false, // Off by default (needs particle positions)
  showFloatingSymbols = true,
  showAurora = true,
  showMeteors = true,
  showEnergyField = true,
  fireflies = {},
  cloudWisps = {},
  breathRays = {},
  rippleWaves = {},
  connectionLines = {},
  floatingSymbols = {},
  aurora = {},
  meteors = {},
  energyField = {},
}: AtmosphereEffectsProps) {
  if (!enabled) return null;

  return (
    <group name="atmosphere-effects">
      {/* Energy Field - outermost layer (Fresnel bubble) */}
      {showEnergyField && <EnergyField {...energyField} />}

      {/* Aurora - high atmosphere */}
      {showAurora && <AuroraBorealis {...aurora} />}

      {/* Light Rays - background effect */}
      {showBreathRays && <BreathRays {...breathRays} />}

      {/* Meteors - crossing atmosphere */}
      {showMeteors && <MeteorShowers {...meteors} />}

      {/* Cloud Wisps - atmosphere boundary */}
      {showCloudWisps && <CloudWisps {...cloudWisps} />}

      {/* Ripple Waves - phase transition pulses */}
      {showRippleWaves && <RippleWaves {...rippleWaves} />}

      {/* Fireflies - exhale particles */}
      {showFireflies && <BreathFireflies {...fireflies} />}

      {/* Floating Symbols - orbiting icons */}
      {showFloatingSymbols && <FloatingSymbols {...floatingSymbols} />}

      {/* Connection Lines - particle constellation */}
      {showConnectionLines && <ConnectionLines {...connectionLines} />}
    </group>
  );
});

export default AtmosphereEffects;
