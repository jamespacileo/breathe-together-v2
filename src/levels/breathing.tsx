import { Leva } from 'leva';
import { Perf } from 'r3f-perf';
import { Suspense, useDeferredValue } from 'react';
import { AudioDevControls } from '../audio';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { GizmoEntities } from '../components/GizmoEntities';
import { MomentumControls } from '../components/MomentumControls';
import { PostProcessingEffects } from '../components/PostProcessingEffects';
import { ShapeGizmos } from '../components/ShapeGizmos';
import { SimpleGaiaUI } from '../components/SimpleGaiaUI';
import { TopRightControls } from '../components/TopRightControls';
import { DEV_MODE_ENABLED } from '../config/devMode';
import { EarthGlobe } from '../entities/earthGlobe';
import { EarthGlobeTransmission } from '../entities/earthGlobe/EarthGlobeTransmission';
import { GeoMarkers } from '../entities/earthGlobe/GeoMarkers';
import { RibbonSystem } from '../entities/earthGlobe/RibbonSystem';
import { Environment } from '../entities/environment';
import { AtmosphericParticles } from '../entities/particle/AtmosphericParticles';
import { ParticleSwarm } from '../entities/particle/ParticleSwarm';
import { RefractionPipeline } from '../entities/particle/RefractionPipeline';
import { useDevControls } from '../hooks/useDevControls';
import { useInspirationInit } from '../hooks/useInspirationInit';
import { usePresence } from '../hooks/usePresence';
import { useBreathingLevelStore } from '../stores/breathingLevelStore';
import type { BreathingLevelProps } from '../types/sceneProps';

/**
 * BreathingLevel - Core 3D meditation environment.
 * Uses 3-pass FBO refraction pipeline for Monument Valley frosted glass effect.
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
}: Partial<BreathingLevelProps> = {}) {
  // Initialize inspirational text system (sets up ambient pool + welcome sequence)
  useInspirationInit();

  // Shared state from Zustand store
  const { orbitRadius, shardSize, atmosphereDensity } = useBreathingLevelStore();

  // Dev controls (Leva)
  const devControls = useDevControls();

  // Presence API (synchronized user positions)
  // Users array is sorted by ID on server, ensuring identical particle positions
  // across all connected clients for a shared visual experience
  const { users, countryCounts, sessionId } = usePresence();

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

        {/* MomentumControls wraps everything - iOS-style momentum scrolling for 3D rotation */}
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
          {/* Postprocessing Effects - optional replacement for custom DoF */}
          {devControls.usePostprocessingDoF && (
            <PostProcessingEffects
              enableDoF={devControls.enableDepthOfField}
              focusDistance={devControls.focusDistance}
              focalLength={devControls.ppFocalLength}
              bokehScale={devControls.ppBokehScale}
              enableBloom={devControls.enableBloom}
              bloomIntensity={devControls.bloomIntensity}
              bloomThreshold={devControls.bloomThreshold}
              enableVignette={devControls.enableVignette}
              vignetteDarkness={devControls.vignetteDarkness}
            />
          )}

          {/* 4-Pass FBO Refraction Pipeline - applies DoF to 3D content */}
          {/* When usePostprocessingDoF is true, disable custom DoF but keep refraction */}
          <RefractionPipeline
            ior={devControls.ior}
            backfaceIntensity={devControls.glassDepth}
            enableDepthOfField={!devControls.usePostprocessingDoF && devControls.enableDepthOfField}
            focusDistance={devControls.focusDistance}
            focalRange={devControls.focalRange}
            maxBlur={devControls.maxBlur}
          >
            {/* Environment - clouds, lighting, fog, HDRI (or grid floor in stage mode) */}
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
                stageMode={devControls.stageMode}
                showGridFloor={devControls.showGridFloor}
                gridSize={devControls.gridSize}
                gridDivisions={devControls.gridDivisions}
                gridColor={devControls.gridColor}
                enableHDRI={devControls.enableHDRI}
                hdriIntensity={devControls.hdriIntensity}
                hdriBlur={devControls.hdriBlur}
                useHDRIBackground={devControls.useHDRIBackground}
              />
            )}

            {/* Globe - conditionally use transmission material */}
            {showGlobe && !devControls.useTransmissionGlobe && <EarthGlobe />}
            {showGlobe && devControls.useTransmissionGlobe && (
              <EarthGlobeTransmission
                transmission={devControls.globeTransmission}
                roughness={devControls.globeRoughness}
                ior={devControls.globeIor}
                thickness={devControls.globeThickness}
                chromaticAberration={devControls.globeChromaticAberration}
              />
            )}

            {/* Ribbon System - configurable text ribbons around the globe */}
            {/* Layers: top message, bottom message, decorative accents */}
            {/* Features: randomized colors, parallax scroll, breath-synced opacity */}
            {showGlobe && <RibbonSystem />}

            {showParticles && (
              <ParticleSwarm
                users={deferredUsers}
                currentUserId={sessionId}
                baseRadius={orbitRadius}
                maxShardSize={shardSize}
                highlightCurrentUser={devControls.highlightCurrentUser}
                highlightStyle={devControls.highlightStyle}
              />
            )}

            {showParticles && (
              <AtmosphericParticles
                count={Math.round(deferredAtmosphereDensity)}
                size={devControls.atmosphereParticleSize}
                baseOpacity={devControls.atmosphereBaseOpacity}
                breathingOpacity={devControls.atmosphereBreathingOpacity}
                color={devControls.atmosphereColor}
              />
            )}

            {/* GeoMarkers - 3D meshes with depth testing for proper occlusion */}
            {/* Now inside RefractionPipeline: occluded by globe/shards, has DoF effect */}
            {showGlobe && Object.keys(countryCounts).length > 0 && (
              <GeoMarkers countryCounts={countryCounts} showNames={false} />
            )}
          </RefractionPipeline>

          {/* Gizmo ECS entities - manages shape data in Koota for reuse by other systems */}
          {DEV_MODE_ENABLED && (
            <GizmoEntities
              enabled={
                devControls.showGlobeCentroid ||
                devControls.showGlobeBounds ||
                devControls.showCountryCentroids ||
                devControls.showSwarmCentroid ||
                devControls.showSwarmBounds ||
                devControls.showShardCentroids ||
                devControls.showShardWireframes ||
                devControls.showShardConnections
              }
              maxShards={devControls.maxShardGizmos}
            />
          )}

          {/* Shape Gizmos - debug visualization for centroids and bounds */}
          {/* Rendered outside RefractionPipeline to avoid distortion effects */}
          {DEV_MODE_ENABLED && (
            <ShapeGizmos
              showGlobeCentroid={devControls.showGlobeCentroid}
              showGlobeBounds={devControls.showGlobeBounds}
              showCountryCentroids={devControls.showCountryCentroids}
              showSwarmCentroid={devControls.showSwarmCentroid}
              showSwarmBounds={devControls.showSwarmBounds}
              showShardCentroids={devControls.showShardCentroids}
              showShardWireframes={devControls.showShardWireframes}
              showShardConnections={devControls.showShardConnections}
              maxShardGizmos={devControls.maxShardGizmos}
              showAxes={devControls.showGizmoAxes}
              showLabels={devControls.showGizmoLabels}
            />
          )}
        </MomentumControls>
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
export function BreathingLevelUI() {
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
        presenceCount={presenceCount}
      />
    </>
  );
}

export default BreathingLevel;
