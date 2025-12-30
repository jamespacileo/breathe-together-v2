/**
 * Settings Screen
 * User preferences and app configuration
 */

import { Container, Fullscreen, Root, Text } from '@react-three/uikit';
import { Suspense, useCallback, useState } from 'react';
import { useAppState } from '../contexts/appState';
import { useUserPreferences } from '../contexts/userPreferences';

/**
 * Design tokens matching GaiaUI aesthetic
 */
const colors = {
  text: '#8c7b6c',
  textDim: '#b8a896',
  textLight: '#fffef7',
  accent: '#d4a574',
  accentHover: '#e5b585',
  glass: 'rgba(250, 248, 243, 0.85)',
  glassDark: 'rgba(140, 123, 108, 0.1)',
  border: 'rgba(140, 123, 108, 0.15)',
  toggleOn: '#d4a574',
  toggleOff: 'rgba(140, 123, 108, 0.3)',
};

interface ToggleProps {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

function ToggleSetting({ label, description, value, onChange }: ToggleProps) {
  const [isHovering, setIsHovering] = useState(false);

  return (
    <Container
      flexDirection="row"
      justifyContent="space-between"
      alignItems="center"
      padding={16}
      borderRadius={16}
      backgroundColor={isHovering ? colors.glassDark : 'transparent'}
      onPointerEnter={() => setIsHovering(true)}
      onPointerLeave={() => setIsHovering(false)}
    >
      <Container flexDirection="column" gap={2} flexGrow={1}>
        <Text fontSize={12} color={colors.text} fontWeight={500}>
          {label}
        </Text>
        {description && (
          <Text fontSize={10} color={colors.textDim} fontWeight={400}>
            {description}
          </Text>
        )}
      </Container>
      <Container
        width={44}
        height={24}
        borderRadius={12}
        backgroundColor={value ? colors.toggleOn : colors.toggleOff}
        cursor="pointer"
        onClick={() => onChange(!value)}
        justifyContent="center"
        alignItems={value ? 'flex-end' : 'flex-start'}
        paddingX={2}
      >
        <Container width={20} height={20} borderRadius={10} backgroundColor={colors.textLight} />
      </Container>
    </Container>
  );
}

interface SelectProps {
  label: string;
  description?: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

function SelectSetting({ label, description, value, options, onChange }: SelectProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Container flexDirection="column" gap={8}>
      <Container
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        padding={16}
        borderRadius={16}
        backgroundColor={isExpanded ? colors.glassDark : 'transparent'}
        cursor="pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Container flexDirection="column" gap={2} flexGrow={1}>
          <Text fontSize={12} color={colors.text} fontWeight={500}>
            {label}
          </Text>
          {description && (
            <Text fontSize={10} color={colors.textDim} fontWeight={400}>
              {description}
            </Text>
          )}
        </Container>
        <Text fontSize={11} color={colors.accent} fontWeight={500}>
          {options.find((o) => o.value === value)?.label || value}
        </Text>
      </Container>

      {isExpanded && (
        <Container flexDirection="column" marginLeft={16} gap={4} paddingBottom={8}>
          {options.map((option) => (
            <Container
              key={option.value}
              padding={12}
              paddingX={16}
              borderRadius={12}
              backgroundColor={option.value === value ? colors.accent : 'transparent'}
              cursor="pointer"
              onClick={() => {
                onChange(option.value);
                setIsExpanded(false);
              }}
            >
              <Text
                fontSize={11}
                color={option.value === value ? colors.textLight : colors.text}
                fontWeight={option.value === value ? 500 : 400}
              >
                {option.label}
              </Text>
            </Container>
          ))}
        </Container>
      )}
    </Container>
  );
}

export function SettingsScreen() {
  const { goToMenu, resetOnboarding } = useAppState();
  const preferences = useUserPreferences();
  const [isHoveringBack, setIsHoveringBack] = useState(false);
  const [isHoveringReset, setIsHoveringReset] = useState(false);

  const handleBack = useCallback(() => {
    goToMenu();
  }, [goToMenu]);

  const handleResetPreferences = useCallback(() => {
    preferences.resetPreferences();
  }, [preferences]);

  return (
    <Root>
      <Suspense fallback={null}>
        <Fullscreen
          flexDirection="column"
          justifyContent="flex-start"
          alignItems="center"
          padding={40}
          paddingTop={60}
        >
          {/* Header */}
          <Container
            flexDirection="row"
            justifyContent="space-between"
            alignItems="center"
            width="100%"
            maxWidth={520}
            marginBottom={32}
          >
            <Container
              padding={10}
              paddingX={20}
              borderRadius={20}
              backgroundColor={isHoveringBack ? colors.glassDark : 'transparent'}
              borderWidth={1}
              borderColor={isHoveringBack ? colors.border : 'transparent'}
              cursor="pointer"
              onPointerEnter={() => setIsHoveringBack(true)}
              onPointerLeave={() => setIsHoveringBack(false)}
              onClick={handleBack}
            >
              <Text fontSize={10} color={colors.textDim} letterSpacing={0.15} fontWeight={600}>
                ← BACK
              </Text>
            </Container>
            <Text fontSize={14} color={colors.text} letterSpacing={0.1} fontWeight={500}>
              Settings
            </Text>
            <Container width={80} />
          </Container>

          {/* Settings Panel */}
          <Container
            flexDirection="column"
            gap={8}
            padding={24}
            borderRadius={28}
            backgroundColor={colors.glass}
            borderWidth={1}
            borderColor={colors.border}
            width="100%"
            maxWidth={520}
          >
            {/* Profile Section */}
            <Container marginBottom={8}>
              <Text fontSize={10} color={colors.textDim} letterSpacing={0.2} fontWeight={600}>
                PROFILE
              </Text>
            </Container>

            <Container
              flexDirection="row"
              justifyContent="space-between"
              alignItems="center"
              padding={16}
              borderRadius={16}
              backgroundColor={colors.glassDark}
            >
              <Container flexDirection="column" gap={2}>
                <Text fontSize={12} color={colors.text} fontWeight={500}>
                  Display Name
                </Text>
                <Text fontSize={10} color={colors.textDim}>
                  Shown during sessions
                </Text>
              </Container>
              <Text fontSize={11} color={colors.accent} fontWeight={500}>
                {preferences.userName || 'Not set'}
              </Text>
            </Container>

            {/* Divider */}
            <Container height={16} />

            {/* Experience Section */}
            <Container marginBottom={8}>
              <Text fontSize={10} color={colors.textDim} letterSpacing={0.2} fontWeight={600}>
                EXPERIENCE
              </Text>
            </Container>

            <ToggleSetting
              label="Sound Effects"
              description="Ambient sounds during breathing"
              value={preferences.soundEnabled}
              onChange={(v) => preferences.updatePreference('soundEnabled', v)}
            />

            <ToggleSetting
              label="Haptic Feedback"
              description="Vibration on phase changes"
              value={preferences.hapticsEnabled}
              onChange={(v) => preferences.updatePreference('hapticsEnabled', v)}
            />

            <ToggleSetting
              label="Breathing Guide"
              description="Show inhale/exhale text"
              value={preferences.showGuideText}
              onChange={(v) => preferences.updatePreference('showGuideText', v)}
            />

            {/* Divider */}
            <Container height={16} />

            {/* Session Section */}
            <Container marginBottom={8}>
              <Text fontSize={10} color={colors.textDim} letterSpacing={0.2} fontWeight={600}>
                SESSION
              </Text>
            </Container>

            <SelectSetting
              label="Session Duration"
              description="Default meditation length"
              value={String(preferences.sessionDuration)}
              options={[
                { value: '3', label: '3 minutes' },
                { value: '5', label: '5 minutes' },
                { value: '10', label: '10 minutes' },
                { value: '15', label: '15 minutes' },
                { value: '20', label: '20 minutes' },
                { value: '0', label: 'Unlimited' },
              ]}
              onChange={(v) => preferences.updatePreference('sessionDuration', Number(v))}
            />

            <SelectSetting
              label="Visual Quality"
              description="Balance performance and effects"
              value={preferences.qualityPreset}
              options={[
                { value: 'low', label: 'Low (Battery Saver)' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'ultra', label: 'Ultra' },
              ]}
              onChange={(v) =>
                preferences.updatePreference(
                  'qualityPreset',
                  v as 'low' | 'medium' | 'high' | 'ultra',
                )
              }
            />

            {/* Divider */}
            <Container height={16} />

            {/* Appearance Section */}
            <Container marginBottom={8}>
              <Text fontSize={10} color={colors.textDim} letterSpacing={0.2} fontWeight={600}>
                APPEARANCE
              </Text>
            </Container>

            <SelectSetting
              label="Theme"
              description="Color scheme"
              value={preferences.theme}
              options={[
                { value: 'auto', label: 'System' },
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ]}
              onChange={(v) =>
                preferences.updatePreference('theme', v as 'light' | 'dark' | 'auto')
              }
            />

            <ToggleSetting
              label="Reminders"
              description="Daily breathing reminders"
              value={preferences.remindersEnabled}
              onChange={(v) => preferences.updatePreference('remindersEnabled', v)}
            />

            {/* Divider */}
            <Container height={24} />

            {/* Reset Actions */}
            <Container flexDirection="row" justifyContent="center" gap={16}>
              <Container
                padding={12}
                paddingX={20}
                borderRadius={16}
                backgroundColor={isHoveringReset ? colors.glassDark : 'transparent'}
                borderWidth={1}
                borderColor={colors.border}
                cursor="pointer"
                onPointerEnter={() => setIsHoveringReset(true)}
                onPointerLeave={() => setIsHoveringReset(false)}
                onClick={handleResetPreferences}
              >
                <Text fontSize={10} color={colors.textDim} letterSpacing={0.1} fontWeight={600}>
                  Reset to Defaults
                </Text>
              </Container>
            </Container>

            {/* Dev: Reset onboarding */}
            {import.meta.env.DEV && (
              <Container
                marginTop={16}
                padding={10}
                paddingX={16}
                borderRadius={12}
                backgroundColor={colors.glassDark}
                cursor="pointer"
                onClick={resetOnboarding}
                alignSelf="center"
              >
                <Text fontSize={9} color={colors.textDim} letterSpacing={0.1}>
                  DEV: Reset Onboarding
                </Text>
              </Container>
            )}
          </Container>
        </Fullscreen>
      </Suspense>
    </Root>
  );
}
