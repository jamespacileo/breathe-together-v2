import { type CSSProperties, useEffect, useState } from 'react';
import { Button } from '../primitives/Button';
import { GlassCard } from '../primitives/GlassCard';
import { Divider, HStack, VStack } from '../primitives/Stack';
import { Heading, Label, Text } from '../primitives/Text';
import { animation, zIndex } from '../tokens';
import { spacing } from '../tokens/spacing';
import { Slider, Toggle } from './Slider';

// Mood palette for legend
const MOOD_PALETTE = {
  joy: '#ffbe0b',
  peace: '#06d6a0',
  solitude: '#118ab2',
  love: '#ef476f',
};

export interface SettingsState {
  harmony: number;
  refraction: number;
  breath: number;
  expansion: number;
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
 * Uses glass morphism aesthetic.
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
    maxHeight: isOpen ? '500px' : '0px',
    overflow: 'hidden',
    opacity: isOpen ? 1 : 0,
    transition: `all ${animation.duration.slow} ${animation.easing.easeInOut}`,
  };

  return (
    <div style={containerStyle}>
      {/* Toggle Button */}
      <Button variant="secondary" size="sm" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? 'Close' : 'Tune Aesthetic'}
      </Button>

      {/* Settings Panel */}
      <div style={panelStyle}>
        <GlassCard intensity="strong" padding="lg">
          <VStack gap="lg">
            {/* Visual Settings */}
            <VStack gap="md">
              <Slider
                label="Harmony"
                value={settings.harmony}
                onChange={(v) => onSettingsChange({ harmony: v })}
                min={10}
                max={600}
                step={10}
                formatValue={(v) => String(v)}
              />

              <Slider
                label="Refraction"
                value={settings.refraction}
                onChange={(v) => onSettingsChange({ refraction: v })}
                min={1.0}
                max={2.0}
                step={0.01}
                formatValue={(v) => v.toFixed(2)}
              />

              <Slider
                label="Breath"
                value={settings.breath}
                onChange={(v) => onSettingsChange({ breath: v })}
                min={0.05}
                max={1.5}
                step={0.05}
                formatValue={(v) => v.toFixed(2)}
              />

              <Slider
                label="Expansion"
                value={settings.expansion}
                onChange={(v) => onSettingsChange({ expansion: v })}
                min={0.5}
                max={5.0}
                step={0.1}
                formatValue={(v) => v.toFixed(1)}
              />
            </VStack>

            <Divider />

            {/* Audio & Haptics */}
            <VStack gap="sm">
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
    pointerEvents: 'auto', // Allow text selection if needed
  };

  return (
    <div style={style}>
      <VStack gap="xs">
        <Text variant="label" color="dim" style={{ letterSpacing: '0.3em' }}>
          Digital Artifact / 002
        </Text>
        <Heading
          level={2}
          style={{ fontWeight: 300, letterSpacing: '0.1em', textTransform: 'uppercase' }}
        >
          Gaia <span style={{ opacity: 0.5, fontWeight: 600 }}>·</span> Breathing
        </Heading>
      </VStack>
    </div>
  );
}
