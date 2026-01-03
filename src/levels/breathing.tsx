import { Leva } from 'leva';
import { Perf } from 'r3f-perf';
import { Suspense, useDeferredValue } from 'react';
import { AudioDevControls } from '../audio';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { MomentumControls } from '../components/MomentumControls';
import { SimpleGaiaUI } from '../components/SimpleGaiaUI';
import { TopRightControls } from '../components/TopRightControls';
import { DEV_MODE_ENABLED } from '../config/devMode';
import { EarthGlobe } from '../entities/earthGlobe';
import { Environment } from '../entities/environment';
import { AtmosphericParticles } from '../entities/particle/AtmosphericParticles';
import { ParticleSwarm } from '../entities/particle/ParticleSwarm';
import { RefractionPipeline } from '../entities/particle/RefractionPipeline';
import { useDevControls } from '../hooks/useDevControls';
import { usePresence } from '../hooks/usePresence';
import { useBreathingLevelStore } from '../stores/breathingLevelStore';
import type { BreathingLevelProps } from '../types/sceneProps';

interface BreathingLevelExtendedProps extends Partial<BreathingLevelProps> {
  /** Whether user has clicked "Join" - controls particle visibility */
  hasJoined?: boolean;
  /** Progress through join transition (0-1), for staggered element reveal */
  joinProgress?: number;
}

/**
 * BreathingLevel - Core 3D meditation environment.
 * Uses 3-pass FBO refraction pipeline for Monument Valley frosted glass effect.
 *
 * Before joining: Shows globe only (clean main menu state)
 * After joining: Shows all particles and full experience
 *
 * This component handles ONLY the 3D scene content.
 * HTML UI is rendered separately via BreathingLevelUI (outside Canvas).
 *
 * User controls: Harmony, Shard Size, Breathing Space, Atmosphere (via Zustand store)
 * Dev controls: Glass effect, DoF, Environment, Debug (via Leva panel)
 */
export function BreathingLevel({
  // DEBUG-ONLY: Entity visibility toggles (all default true)
  showGlobe = true,
  showParticles = true,
  showEnvironment = true,
  // Whether user has clicked "Join" to enter full experience
  hasJoined = true,
  // Progress through join transition (0-1), animated in App.tsx
  joinProgress = 1,
}: BreathingLevelExtendedProps = {}) {
  // Staggered visibility thresholds (cinematic reveal order)
  // 0.0-0.3: Letterbox retracts, camera dolly continues
  // 0.3-0.5: Clouds fade in
  // 0.5-0.7: Particles begin appearing
  // 0.7-0.85: Atmospheric particles fade in
  // 0.85-1.0: UI fades in
  const showCloudsNow = hasJoined ? joinProgress > 0.3 : false;
  const showParticlesNow = hasJoined ? joinProgress > 0.5 : false;
  const showAtmosphereNow = hasJoined ? joinProgress > 0.7 : false;

  // Calculate opacity for smooth fades (0→1 within their window)
  const atmosphereOpacity = showAtmosphereNow ? Math.min((joinProgress - 0.7) / 0.15, 1) : 0;

  // Shared state from Zustand store
  const { orbitRadius, shardSize, atmosphereDensity } = useBreathingLevelStore();

  // Dev controls (Leva)
  const devControls = useDevControls();

  // Presence API (synchronized user positions)
  // Users array is sorted by ID on server, ensuring identical particle positions
  // across all connected clients for a shared visual experience
  const { users } = usePresence();

  // React 19: Defer non-urgent updates to reduce stutter during state changes
  // These values control particle counts which are expensive to update
  const deferredAtmosphereDensity = useDeferredValue(atmosphereDensity);
  const deferredUsers = useDeferredValue(users);

  return (
    <ErrorBoundary>
      <Suspense fallback={null}>
        {/* Performance monitor (dev only) */}
        {DEV_MODE_ENABLED && devControls.showPerfMonitor && (
          <Perf
            position={devControls.perfPosition}
            minimal={devControls.perfMinimal}
            showGraph={devControls.perfShowGraph}
            logsPerSecond={devControls.perfLogsPerSecond}
            antialias={devControls.perfAntialias}
            overClock={devControls.perfOverClock}
            deepAnalyze={devControls.perfDeepAnalyze}
            matrixUpdate={devControls.perfMatrixUpdate}
          />
        )}

        {/* Audio dev controls - adds Audio folder to Leva panel in dev mode */}
        <AudioDevControls />

        {/* 4-Pass FBO Refraction Pipeline */}
        <RefractionPipeline
          ior={devControls.ior}
          backfaceIntensity={devControls.glassDepth}
          enableDepthOfField={devControls.enableDepthOfField}
          focusDistance={devControls.focusDistance}
          focalRange={devControls.focalRange}
          maxBlur={devControls.maxBlur}
        >
          {/* Monument Valley inspired atmosphere - clouds fade in during reveal */}
          {showEnvironment && (
            <Environment
              showClouds={showCloudsNow && devControls.showClouds}
              showStars={devControls.showStars}
              cloudOpacity={devControls.cloudOpacity}
              cloudSpeed={devControls.cloudSpeed}
              ambientLightColor={devControls.ambientLightColor}
              ambientLightIntensity={devControls.ambientLightIntensity}
              keyLightColor={devControls.keyLightColor}
              keyLightIntensity={devControls.keyLightIntensity}
            />
          )}

          {/* MomentumControls - iOS-style momentum scrolling for 3D rotation */}
          <MomentumControls
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
            {showGlobe && <EarthGlobe />}

            {/* Particle shards - staggered reveal after joining, with deferred updates for perf */}
            {showParticles && showParticlesNow && (
              <ParticleSwarm
                users={deferredUsers}
                baseRadius={orbitRadius}
                maxShardSize={shardSize}
              />
            )}

            {/* Atmospheric particles - fade in after particles appear */}
            {showParticles && showAtmosphereNow && (
              <AtmosphericParticles
                count={Math.round(deferredAtmosphereDensity)}
                size={devControls.atmosphereParticleSize}
                baseOpacity={devControls.atmosphereBaseOpacity * atmosphereOpacity}
                breathingOpacity={devControls.atmosphereBreathingOpacity * atmosphereOpacity}
                color={devControls.atmosphereColor}
              />
            )}
          </MomentumControls>
        </RefractionPipeline>
      </Suspense>
    </ErrorBoundary>
  );
}

/**
 * BreathingLevelUI - HTML UI overlay for the breathing meditation.
 *
 * Rendered OUTSIDE the Canvas as a sibling element.
 * This ensures proper event handling - HTML elements naturally receive
 * pointer events without conflicting with 3D scene interactions.
 *
 * Uses eventSource pattern on Canvas (see app.tsx).
 */
interface BreathingLevelUIProps {
  /** Whether scene is ready for onboarding flows */
  shouldRunOnboarding?: boolean;
  /** Whether inspirational text should play */
  shouldPlayText?: boolean;
}

export function BreathingLevelUI({
  shouldRunOnboarding = true,
  shouldPlayText = true,
}: BreathingLevelUIProps = {}) {
  // Shared state from Zustand store
  const {
    harmony,
    setHarmony,
    orbitRadius,
    setOrbitRadius,
    shardSize,
    setShardSize,
    atmosphereDensity,
    setAtmosphereDensity,
    showTuneControls,
    setShowTuneControls,
    showSettings,
    setShowSettings,
    applyPreset,
  } = useBreathingLevelStore();

  // Presence API for user count display
  const { count: presenceCount } = usePresence();

  return (
    <>
      {/* Leva dev controls panel - renders via portal to document.body */}
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

      {/* Top-right control icons */}
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
        shouldRunOnboarding={shouldRunOnboarding}
        shouldPlayText={shouldPlayText}
        presenceCount={presenceCount}
      />
    </>
  );
}

export default BreathingLevel;
