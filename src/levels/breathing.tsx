import { Html, PresentationControls } from '@react-three/drei';
import { Leva } from 'leva';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { SimpleGaiaUI } from '../components/SimpleGaiaUI';
import { TopRightControls } from '../components/TopRightControls';
import { DEV_MODE_ENABLED } from '../config/devMode';
import { EarthGlobe } from '../entities/earthGlobe';
import { Environment } from '../entities/environment';
import { AtmosphericParticles } from '../entities/particle/AtmosphericParticles';
import { ParticleSwarm } from '../entities/particle/ParticleSwarm';
import { RefractionPipeline } from '../entities/particle/RefractionPipeline';
import { PRESETS, type PresetName, TUNING_DEFAULTS, useDevControls } from '../hooks/useDevControls';
import { generateMockPresence } from '../lib/mockPresence';
import type { BreathingLevelProps } from '../types/sceneProps';

/**
 * BreathingLevel - Core meditation environment.
 * Uses 3-pass FBO refraction pipeline for Monument Valley frosted glass effect.
 *
 * User controls: Harmony, Shard Size, Breathing Space, Atmosphere (via SimpleGaiaUI)
 * Dev controls: Glass effect, DoF, Environment, Debug (via Leva panel)
 */
export function BreathingLevel({
  particleDensity,
  // DEBUG-ONLY: Entity visibility toggles (all default true)
  showGlobe = true,
  showParticles = true,
  showEnvironment = true,
}: Partial<BreathingLevelProps> = {}) {
  // ==========================================
  // USER-FACING STATE (SimpleGaiaUI controls)
  // ==========================================
  const [harmony, setHarmony] = useState<number>(
    particleDensity === 'sparse'
      ? PRESETS.calm.harmony
      : particleDensity === 'dense'
        ? PRESETS.immersive.harmony
        : PRESETS.centered.harmony,
  );
  const [orbitRadius, setOrbitRadius] = useState<number>(TUNING_DEFAULTS.orbitRadius);
  const [shardSize, setShardSize] = useState<number>(TUNING_DEFAULTS.shardSize);
  const [atmosphereDensity, setAtmosphereDensity] = useState<number>(
    TUNING_DEFAULTS.atmosphereDensity,
  );

  // Animation refs for smooth preset transitions
  const animationRef = useRef<number | null>(null);

  // ==========================================
  // DEV-ONLY STATE (Leva controls)
  // ==========================================
  const devControls = useDevControls();

  // ==========================================
  // PRESET ANIMATION
  // ==========================================
  const applyPreset = useCallback(
    (presetName: PresetName) => {
      const preset = PRESETS[presetName];

      // Cancel any existing animation
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      // Store starting values
      const startValues = {
        harmony,
        shardSize,
        orbitRadius,
        atmosphereDensity,
      };
      const startTime = performance.now();
      const duration = 300; // ms

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease out cubic for smooth deceleration
        const eased = 1 - (1 - progress) ** 3;

        // Interpolate all values
        setHarmony(
          Math.round(startValues.harmony + (preset.harmony - startValues.harmony) * eased),
        );
        setShardSize(startValues.shardSize + (preset.shardSize - startValues.shardSize) * eased);
        setOrbitRadius(
          startValues.orbitRadius + (preset.orbitRadius - startValues.orbitRadius) * eased,
        );
        setAtmosphereDensity(
          Math.round(
            startValues.atmosphereDensity +
              (preset.atmosphereDensity - startValues.atmosphereDensity) * eased,
          ),
        );

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    },
    [harmony, shardSize, orbitRadius, atmosphereDensity],
  );

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // ==========================================
  // UI MODAL STATES
  // ==========================================
  const [showTuneControls, setShowTuneControls] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // ==========================================
  // MOCK PRESENCE DATA
  // ==========================================
  const mockUsers = useMemo(() => {
    const presence = generateMockPresence(Math.round(harmony));
    // Convert aggregate mood counts to individual users
    const users: Array<{ id: string; mood: 'gratitude' | 'presence' | 'release' | 'connection' }> =
      [];
    for (const [mood, count] of Object.entries(presence.moods)) {
      for (let i = 0; i < count; i++) {
        users.push({
          id: `${mood}-${i}`,
          mood: mood as 'gratitude' | 'presence' | 'release' | 'connection',
        });
      }
    }

    // Shuffle users for visual variety (colors distributed across sphere)
    // Use Fisher-Yates shuffle with seeded random for consistency within session
    const seed = Math.round(harmony); // Same count = same shuffle
    const seededRandom = (i: number) => {
      const x = Math.sin(seed * 9999 + i * 1234) * 10000;
      return x - Math.floor(x);
    };

    for (let i = users.length - 1; i > 0; i--) {
      const j = Math.floor(seededRandom(i) * (i + 1));
      [users[i], users[j]] = [users[j], users[i]];
    }

    return users;
  }, [harmony]);

  return (
    <ErrorBoundary>
      <Suspense fallback={null}>
        {/* 4-Pass FBO Refraction Pipeline handles background + refraction + depth of field rendering */}
        <RefractionPipeline
          ior={devControls.ior}
          backfaceIntensity={devControls.glassDepth}
          enableDepthOfField={devControls.enableDepthOfField}
          focusDistance={devControls.focusDistance}
          focalRange={devControls.focalRange}
          maxBlur={devControls.maxBlur}
        >
          {/* Monument Valley inspired atmosphere - clouds, lighting, fog */}
          {showEnvironment && (
            <Environment
              showClouds={devControls.showClouds}
              showStars={devControls.showStars}
              cloudOpacity={devControls.cloudOpacity}
              cloudSpeed={devControls.cloudSpeed}
              ambientLightColor={devControls.ambientLightColor}
              ambientLightIntensity={devControls.ambientLightIntensity}
              keyLightColor={devControls.keyLightColor}
              keyLightIntensity={devControls.keyLightIntensity}
            />
          )}

          {/* Wrap rotatable entities in PresentationControls */}
          <PresentationControls
            global
            cursor={true}
            snap={false}
            speed={1}
            damping={0.3}
            polar={[-Math.PI * 0.3, Math.PI * 0.3]}
            azimuth={[-Infinity, Infinity]}
          >
            {showGlobe && <EarthGlobe />}

            {showParticles && (
              <ParticleSwarm
                users={mockUsers}
                baseRadius={orbitRadius}
                maxShardSize={shardSize}
                // Trail configuration from dev controls
                trailMode={devControls.trailMode}
                trailLength={devControls.trailLength}
                trailPointSize={devControls.trailPointSize}
                trailColor={devControls.trailColor}
                trailOpacity={devControls.trailOpacity}
                trailMinDistance={devControls.trailMinDistance}
                afterimageDecay={devControls.afterimageDecay}
                ribbonWidth={devControls.ribbonWidth}
                ribbonAttenuation={devControls.ribbonAttenuation}
              />
            )}

            {showParticles && (
              <AtmosphericParticles
                count={Math.round(atmosphereDensity)}
                size={devControls.atmosphereParticleSize}
                baseOpacity={devControls.atmosphereBaseOpacity}
                breathingOpacity={devControls.atmosphereBreathingOpacity}
                color={devControls.atmosphereColor}
              />
            )}
          </PresentationControls>
        </RefractionPipeline>

        {/* UI stays OUTSIDE pipeline (fixed HUD) - Simplified for first-time users */}
        <Html fullscreen>
          {/* Leva dev controls panel - only renders when DEV_MODE_ENABLED */}
          <Leva
            hidden={!DEV_MODE_ENABLED}
            collapsed={true}
            titleBar={{ title: 'Dev Controls' }}
            theme={{
              sizes: {
                rootWidth: '280px',
              },
            }}
          />

          {/* Top-right control icons (audio + tune + settings) */}
          <TopRightControls
            onOpenTuneControls={() => setShowTuneControls(true)}
            onOpenSettings={() => setShowSettings(true)}
          />

          {/* Main UI with breathing phase, inspirational text, and modals */}
          <SimpleGaiaUI
            harmony={harmony}
            setHarmony={setHarmony}
            orbitRadius={orbitRadius}
            setOrbitRadius={setOrbitRadius}
            shardSize={shardSize}
            setShardSize={setShardSize}
            atmosphereDensity={atmosphereDensity}
            setAtmosphereDensity={setAtmosphereDensity}
            onApplyPreset={applyPreset}
            showTuneControls={showTuneControls}
            onShowTuneControlsChange={setShowTuneControls}
            showSettings={showSettings}
            onShowSettingsChange={setShowSettings}
          />
        </Html>
      </Suspense>
    </ErrorBoundary>
  );
}

export default BreathingLevel;
