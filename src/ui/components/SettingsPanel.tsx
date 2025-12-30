import { type CSSProperties, useEffect, useState } from 'react';
import { Button } from '../primitives/Button';
import { GlassCard } from '../primitives/GlassCard';
import { Divider, HStack, VStack } from '../primitives/Stack';
import { Label, Text } from '../primitives/Text';
import { animation, zIndex } from '../tokens';
import { colors } from '../tokens/colors';
import { spacing } from '../tokens/spacing';
import { typography } from '../tokens/typography';
import { Slider, Toggle } from './Slider';

// Mood palette for legend
const MOOD_PALETTE = {
  joy: '#ffbe0b',
  peace: '#06d6a0',
  solitude: '#118ab2',
  love: '#ef476f',
};

export interface SettingsState {
  // Particle settings
  harmony: number; // Particle count
  shardSize: number; // Max shard size
  orbitRadius: number; // How far particles orbit
  // Glass settings
  refraction: number; // Index of refraction (IOR)
  glassDepth: number; // Backface intensity
  // Atmosphere
  atmosphereDensity: number; // Ambient particle count
  // Experience
  audioEnabled: boolean;
  hapticsEnabled: boolean;
}

export interface SettingsPanelProps {
  /** Current settings */
  settings: SettingsState;
  /** Called when settings change */
  onSettingsChange: (settings: Partial<SettingsState>) => void;
  /** Controls visibility - auto-hides after inactivity */
  autoHide?: boolean;
  /** Inactivity timeout in ms */
  autoHideTimeout?: number;
}

/**
 * SettingsPanel - Collapsible settings panel
 *
 * Bottom-right positioned panel with sliders for visual tuning.
 * Uses glass morphism aesthetic with sectioned controls.
 */
export function SettingsPanel({
  settings,
  onSettingsChange,
  autoHide = true,
  autoHideTimeout = 5000,
}: SettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // Auto-hide on inactivity
  useEffect(() => {
    if (!autoHide) return;

    let timeout: NodeJS.Timeout;

    const resetInactivity = () => {
      setIsVisible(true);
      clearTimeout(timeout);
      if (!isOpen) {
        timeout = setTimeout(() => setIsVisible(false), autoHideTimeout);
      }
    };

    window.addEventListener('mousemove', resetInactivity);
    window.addEventListener('mousedown', resetInactivity);
    window.addEventListener('keydown', resetInactivity);
    window.addEventListener('touchstart', resetInactivity);

    resetInactivity();

    return () => {
      window.removeEventListener('mousemove', resetInactivity);
      window.removeEventListener('mousedown', resetInactivity);
      window.removeEventListener('keydown', resetInactivity);
      window.removeEventListener('touchstart', resetInactivity);
      clearTimeout(timeout);
    };
  }, [autoHide, autoHideTimeout, isOpen]);

  const containerStyle: CSSProperties = {
    position: 'fixed',
    bottom: spacing.xl,
    right: spacing.xl,
    zIndex: zIndex.dropdown,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: spacing.md,
    opacity: isVisible ? 1 : 0,
    transition: `opacity ${animation.duration.slow} ${animation.easing.ease}`,
    pointerEvents: isVisible ? 'auto' : 'none',
  };

  const panelStyle: CSSProperties = {
    width: '280px',
    maxHeight: isOpen ? '600px' : '0px',
    overflow: 'hidden',
    opacity: isOpen ? 1 : 0,
    transition: `all ${animation.duration.slow} ${animation.easing.easeInOut}`,
  };

  const sectionHeaderStyle: CSSProperties = {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    letterSpacing: typography.letterSpacing.widest,
    textTransform: 'uppercase',
    color: colors.text.dim,
    marginBottom: spacing.sm,
  };

  return (
    <div style={containerStyle}>
      {/* Toggle Button */}
      <Button variant="secondary" size="sm" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? 'Close' : 'Tune'}
      </Button>

      {/* Settings Panel */}
      <div style={panelStyle}>
        <GlassCard intensity="strong" padding="lg">
          <VStack gap="lg">
            {/* === PARTICLES SECTION === */}
            <VStack gap="md">
              <span style={sectionHeaderStyle}>Particles</span>

              <Slider
                label="Harmony"
                value={settings.harmony}
                onChange={(v) => onSettingsChange({ harmony: v })}
                min={12}
                max={200}
                step={1}
                formatValue={(v) => String(Math.round(v))}
              />

              <Slider
                label="Shard Size"
                value={settings.shardSize}
                onChange={(v) => onSettingsChange({ shardSize: v })}
                min={0.1}
                max={1.2}
                step={0.02}
                formatValue={(v) => v.toFixed(2)}
              />

              <Slider
                label="Orbit"
                value={settings.orbitRadius}
                onChange={(v) => onSettingsChange({ orbitRadius: v })}
                min={2.0}
                max={8.0}
                step={0.1}
                formatValue={(v) => v.toFixed(1)}
              />
            </VStack>

            <Divider />

            {/* === GLASS SECTION === */}
            <VStack gap="md">
              <span style={sectionHeaderStyle}>Glass</span>

              <Slider
                label="Refraction"
                value={settings.refraction}
                onChange={(v) => onSettingsChange({ refraction: v })}
                min={1.0}
                max={2.5}
                step={0.01}
                formatValue={(v) => v.toFixed(2)}
              />

              <Slider
                label="Depth"
                value={settings.glassDepth}
                onChange={(v) => onSettingsChange({ glassDepth: v })}
                min={0.0}
                max={1.0}
                step={0.01}
                formatValue={(v) => v.toFixed(2)}
              />
            </VStack>

            <Divider />

            {/* === ATMOSPHERE SECTION === */}
            <VStack gap="md">
              <span style={sectionHeaderStyle}>Atmosphere</span>

              <Slider
                label="Density"
                value={settings.atmosphereDensity}
                onChange={(v) => onSettingsChange({ atmosphereDensity: v })}
                min={0}
                max={300}
                step={10}
                formatValue={(v) => String(Math.round(v))}
              />
            </VStack>

            <Divider />

            {/* === EXPERIENCE SECTION === */}
            <VStack gap="sm">
              <span style={sectionHeaderStyle}>Experience</span>
              <Toggle
                label="Audio cues"
                checked={settings.audioEnabled}
                onChange={(v) => onSettingsChange({ audioEnabled: v })}
              />
              <Toggle
                label="Haptic feedback"
                checked={settings.hapticsEnabled}
                onChange={(v) => onSettingsChange({ hapticsEnabled: v })}
              />
            </VStack>

            <Divider />

            {/* Mood Legend */}
            <VStack gap="xs">
              <Label size="sm">Mood Palette</Label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: spacing.sm,
                }}
              >
                {Object.entries(MOOD_PALETTE).map(([name, color]) => (
                  <HStack key={name} gap="xs" align="center">
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: color,
                      }}
                    />
                    <Text
                      variant="bodySmall"
                      color="secondary"
                      style={{ textTransform: 'capitalize' }}
                    >
                      {name}
                    </Text>
                  </HStack>
                ))}
              </div>
            </VStack>
          </VStack>
        </GlassCard>
      </div>
    </div>
  );
}

/**
 * TitleCard - Museum-style title in upper left
 */
export function TitleCard() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const resetInactivity = () => {
      setIsVisible(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setIsVisible(false), 5000);
    };

    window.addEventListener('mousemove', resetInactivity);
    window.addEventListener('mousedown', resetInactivity);
    resetInactivity();

    return () => {
      window.removeEventListener('mousemove', resetInactivity);
      window.removeEventListener('mousedown', resetInactivity);
      clearTimeout(timeout);
    };
  }, []);

  const style: CSSProperties = {
    position: 'fixed',
    top: spacing.xl,
    left: spacing.xl,
    zIndex: zIndex.dropdown,
    opacity: isVisible ? 1 : 0,
    transition: `opacity ${animation.duration.slow} ${animation.easing.ease}`,
    pointerEvents: 'auto',
  };

  return (
    <div style={style}>
      <VStack gap="xs">
        <Text variant="label" color="dim" style={{ letterSpacing: '0.3em' }}>
          Digital Artifact / 002
        </Text>
        <Text
          variant="h2"
          style={{
            fontWeight: 300,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          Gaia <span style={{ opacity: 0.5, fontWeight: 600 }}>·</span> Breathing
        </Text>
      </VStack>
    </div>
  );
}
