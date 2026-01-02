import { Html } from '@react-three/drei';
import { Leva } from 'leva';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { AudioDevControls } from '../audio';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { MomentumControls } from '../components/MomentumControls';
import { SimpleGaiaUI } from '../components/SimpleGaiaUI';
import { TopRightControls } from '../components/TopRightControls';
import { DEV_MODE_ENABLED } from '../config/devMode';
import { EarthGlobe } from '../entities/earthGlobe';
import { RippleEmitter } from '../entities/effects';
import { Environment } from '../entities/environment';
import { AtmosphericParticles } from '../entities/particle/AtmosphericParticles';
import { ParticleSwarm } from '../entities/particle/ParticleSwarm';
import { RefractionPipeline } from '../entities/particle/RefractionPipeline';
import { PRESETS, type PresetName, TUNING_DEFAULTS, useDevControls } from '../hooks/useDevControls';
import { usePresence } from '../hooks/usePresence';
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
  // PRESENCE API (synchronized user positions)
  // ==========================================
  // Users array is sorted by ID on server, ensuring identical particle positions
  // across all connected clients for a shared visual experience
  const { users, count: presenceCount } = usePresence();

  return (
    <ErrorBoundary>
      <Suspense fallback={null}>
        {/* Audio dev controls - adds Audio folder to Leva panel in dev mode */}
        <AudioDevControls />

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

          {/* Wrap rotatable entities in MomentumControls (iOS-style momentum scrolling) */}
          <MomentumControls
            global
            cursor={true}
            speed={devControls.dragSpeed}
            damping={devControls.dragDamping}
            momentum={devControls.dragMomentum}
            timeConstant={devControls.dragTimeConstant}
            velocityMultiplier={devControls.dragVelocityMultiplier}
            minVelocityThreshold={devControls.dragMinVelocity}
            polar={[-Math.PI * 0.3, Math.PI * 0.3]}
            azimuth={[-Infinity, Infinity]}
          >
            {/* Earth globe with wobbly surface effect */}
            {showGlobe && (
              <EarthGlobe
                enableWobble={devControls.enableWobble}
                wobbleAmplitude={devControls.wobbleAmplitude}
                wobbleFrequency={devControls.wobbleFrequency}
                wobbleSpeed={devControls.wobbleSpeed}
              />
            )}

            {/* Particle swarm with enhanced breathing animation and curl noise */}
            {showParticles && (
              <ParticleSwarm
                users={users}
                baseRadius={orbitRadius}
                maxShardSize={shardSize}
                scaleMin={devControls.particleScaleMin}
                scaleMax={devControls.particleScaleMax}
                opacityMin={devControls.particleOpacityMin}
                opacityMax={devControls.particleOpacityMax}
                enableCurlNoise={devControls.enableCurlNoise}
                curlNoiseStrength={devControls.curlNoiseStrength}
                curlNoiseSpeed={devControls.curlNoiseSpeed}
              />
            )}

            {/* Atmospheric particles */}
            {showParticles && (
              <AtmosphericParticles
                count={Math.round(atmosphereDensity)}
                size={devControls.atmosphereParticleSize}
                baseOpacity={devControls.atmosphereBaseOpacity}
                breathingOpacity={devControls.atmosphereBreathingOpacity}
                color={devControls.atmosphereColor}
              />
            )}

            {/* Ripple rings on phase transitions */}
            <RippleEmitter
              enabled={devControls.enableRipples}
              speed={devControls.rippleSpeed}
              opacity={devControls.rippleOpacity}
              count={devControls.rippleCount}
            />
          </MomentumControls>
        </RefractionPipeline>

        {/* NOTE: Bloom and ColorTemperature effects removed - they conflict with RefractionPipeline */}
        {/* The remaining effects (wobbly globe, curl noise, ripples, particle animation) work well */}

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
            presenceCount={presenceCount}
          />
        </Html>
      </Suspense>
    </ErrorBoundary>
  );
}

export default BreathingLevel;
