import { useFrame } from '@react-three/fiber';
import type { Entity } from 'koota';
import { useWorld } from 'koota/react';
import { easing } from 'maath';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { VISUALS } from '../../constants';
import { useParticleDebug } from '../../contexts/particleDebug';
import { useTriplexConfig } from '../../contexts/triplex';
import { usePerformanceMonitor } from '../../hooks/usePerformanceMonitor';
import { usePresence } from '../../hooks/usePresence';
import { getMoodColorCounts } from '../../lib/colors';
import { generateFibonacciSphere, sphericalToCartesian } from '../../lib/fibonacciSphere';
import { Acceleration, Mass, Position, Velocity } from '../../shared/traits';
import { breathPhase } from '../breath/traits';
import {
  DEFAULT_FILLER_PARTICLE_CONFIG,
  DEFAULT_USER_PARTICLE_CONFIG,
  type ParticleGeometryConfig,
  type ParticleMaterialConfig,
  type ParticleVisualConfig,
} from './config';
import {
  active,
  color,
  index,
  offset,
  ownerId,
  restPosition,
  seed,
  size,
  targetColor,
} from './traits';

/**
 * ParticleSpawner - Manages particle entities based on presence
 *
 * Reads particleScale from Triplex context if available for performance tuning.
 * Falls back to totalCount prop if context is unavailable (production builds).
 *
 * Adaptive quality: Spawns all particles but selectively activates based on
 * performance monitoring. Allows smooth scaling without creating/destroying entities.
 */
export function ParticleSpawner({ totalCount = VISUALS.PARTICLE_COUNT, adaptiveQuality = true }) {
  const world = useWorld();
  const { moods } = usePresence({ simulated: false, pollInterval: 5000 });
  const triplexConfig = useTriplexConfig?.();
  const performanceData = usePerformanceMonitor();

  // Apply Triplex particle scale if available, otherwise use prop as-is
  const finalCount = Math.round(totalCount * (triplexConfig?.particleScale ?? 1.0));

  // Determine active particle count based on performance and adaptive quality setting
  const activeCount = adaptiveQuality && performanceData ? performanceData.recommendedParticleCount : finalCount;

  // Generate base layout
  const layout = useMemo(() => generateFibonacciSphere(finalCount), [finalCount]);

  useEffect(() => {
    const entities: Entity[] = [];
    const fillerColor = new THREE.Color(VISUALS.PARTICLE_FILLER_COLOR);

    for (let i = 0; i < finalCount; i++) {
      const p = layout[i];
      const [x, y, z] = sphericalToCartesian(p.theta, p.phi, VISUALS.PARTICLE_ORBIT_MAX);

      const entity = world.spawn(
        Position({ x, y, z }),
        Velocity({ x: 0, y: 0, z: 0 }),
        Acceleration({ x: 0, y: 0, z: 0 }),
        Mass({ value: 1 }),
        restPosition({
          x: x / VISUALS.PARTICLE_ORBIT_MAX,
          y: y / VISUALS.PARTICLE_ORBIT_MAX,
          z: z / VISUALS.PARTICLE_ORBIT_MAX,
        }),
        offset({ x: 0, y: 0, z: 0 }),
        color({ r: fillerColor.r, g: fillerColor.g, b: fillerColor.b }),
        targetColor({ r: fillerColor.r, g: fillerColor.g, b: fillerColor.b }),
        size({ value: p.size }),
        seed({ value: Math.random() * 1000 }),
        ownerId({ value: 'filler' }),
        index({ value: i }),
        // Pre-activate particles; will be selectively deactivated by adaptive quality system
        active({ value: i < activeCount }),
      );
      entities.push(entity);
    }

    return () => {
      entities.forEach((e) => {
        e.destroy();
      });
    };
  }, [world, layout, finalCount, activeCount]);

  // Update active status based on performance (adaptive quality)
  useEffect(() => {
    if (!adaptiveQuality) return;

    const particles = world.query(index, active);
    particles.forEach((entity) => {
      const particleIndex = entity.get(index)?.value ?? 0;
      const isActive = particleIndex < activeCount;
      entity.set(active, { value: isActive });
    });
  }, [world, activeCount, adaptiveQuality]);

  // Update target colors based on moods
  useEffect(() => {
    const colorCounts = getMoodColorCounts(moods);
    const particles = world.query(targetColor, ownerId, index);

    // Sort by index to ensure stable mapping
    const sortedParticles = [...particles].sort((a, b) => {
      const indexA = a.get(index)?.value ?? 0;
      const indexB = b.get(index)?.value ?? 0;
      return indexA - indexB;
    });

    let particleIdx = 0;
    const fillerColor = new THREE.Color(VISUALS.PARTICLE_FILLER_COLOR);

    // Assign user colors
    for (const [hexColor, count] of Object.entries(colorCounts)) {
      const c = new THREE.Color(hexColor);
      for (let i = 0; i < count && particleIdx < finalCount; i++) {
        const entity = sortedParticles[particleIdx];
        if (entity) {
          entity.set(targetColor, { r: c.r, g: c.g, b: c.b });
          entity.set(ownerId, { value: 'user' });
        }
        particleIdx++;
      }
    }

    // Assign filler colors
    while (particleIdx < finalCount) {
      const entity = sortedParticles[particleIdx];
      if (entity) {
        entity.set(targetColor, { r: fillerColor.r, g: fillerColor.g, b: fillerColor.b });
        entity.set(ownerId, { value: 'filler' });
      }
      particleIdx++;
    }
  }, [moods, world, finalCount]);

  return null;
}

/**
 * Helper: Create Three.js geometry from configuration
 */
function createGeometryFromConfig(config: ParticleGeometryConfig): THREE.BufferGeometry {
  switch (config.type) {
    case 'icosahedron':
      return new THREE.IcosahedronGeometry(config.size, config.detail);
    case 'sphere':
      return new THREE.SphereGeometry(config.size, config.detail, config.detail);
    case 'box':
      return new THREE.BoxGeometry(
        config.size,
        config.size,
        config.size,
        config.detail,
        config.detail,
        config.detail,
      );
    case 'octahedron':
      return new THREE.OctahedronGeometry(config.size, config.detail);
    case 'tetrahedron':
      return new THREE.TetrahedronGeometry(config.size, config.detail);
    default:
      return new THREE.IcosahedronGeometry(config.size, config.detail);
  }
}

/**
 * Helper: Create Three.js material from configuration
 */
function createMaterialFromConfig(config: ParticleMaterialConfig): THREE.Material {
  const baseProps = {
    transparent: config.transparent,
    depthWrite: config.depthWrite,
    blending: config.blending,
  };

  switch (config.type) {
    case 'basic':
      return new THREE.MeshBasicMaterial(baseProps);
    case 'standard':
      return new THREE.MeshStandardMaterial({
        ...baseProps,
        emissive: new THREE.Color(1, 1, 1),
        emissiveIntensity: config.emissiveIntensity ?? 0,
      });
    case 'lambert':
      return new THREE.MeshLambertMaterial(baseProps);
    default:
      return new THREE.MeshBasicMaterial(baseProps);
  }
}

/**
 * ParticleRenderer - Renders all particle entities using dual InstancedMesh
 *
 * Supports separate visual configurations for user and filler particles.
 * Uses debug context (if available) to allow runtime override of particle visuals.
 * Falls back to production defaults when debug context is not present.
 *
 * Performance: 2 draw calls (user + filler) vs 1 (~0.1ms impact on modern GPUs)
 * Backward Compatible: Defaults match previous icosahedron + additive blending behavior
 *
 * @param totalCount - Base particle count (default: VISUALS.PARTICLE_COUNT = 300)
 * @param userConfig - User particle visual config (default: DEFAULT_USER_PARTICLE_CONFIG)
 * @param fillerConfig - Filler particle visual config (default: DEFAULT_FILLER_PARTICLE_CONFIG)
 */
export function ParticleRenderer({
  totalCount = VISUALS.PARTICLE_COUNT,
  userConfig = DEFAULT_USER_PARTICLE_CONFIG,
  fillerConfig = DEFAULT_FILLER_PARTICLE_CONFIG,
}: {
  totalCount?: number;
  userConfig?: ParticleVisualConfig;
  fillerConfig?: ParticleVisualConfig;
} = {}) {
  const world = useWorld();
  const triplexConfig = useTriplexConfig?.();
  const debugConfig = useParticleDebug();

  // Apply debug overrides if available
  const activeUserConfig = debugConfig?.userConfig ?? userConfig;
  const activeFillerConfig = debugConfig?.fillerConfig ?? fillerConfig;

  // Apply Triplex particle scale if available
  const finalCount = Math.round(totalCount * (triplexConfig?.particleScale ?? 1.0));

  // Create geometries and materials from configurations
  const userGeometry = useMemo(
    () => createGeometryFromConfig(activeUserConfig.geometry),
    [activeUserConfig.geometry.type, activeUserConfig.geometry.detail, activeUserConfig.geometry],
  );

  const fillerGeometry = useMemo(
    () => createGeometryFromConfig(activeFillerConfig.geometry),
    [
      activeFillerConfig.geometry.type,
      activeFillerConfig.geometry.detail,
      activeFillerConfig.geometry,
    ],
  );

  const userMaterial = useMemo(
    () => createMaterialFromConfig(activeUserConfig.material),
    [
      activeUserConfig.material.type,
      activeUserConfig.material.transparent,
      activeUserConfig.material.depthWrite,
      activeUserConfig.material.blending,
      activeUserConfig.material.emissiveIntensity,
      activeUserConfig.material,
    ],
  );

  const fillerMaterial = useMemo(
    () => createMaterialFromConfig(activeFillerConfig.material),
    [
      activeFillerConfig.material.type,
      activeFillerConfig.material.transparent,
      activeFillerConfig.material.depthWrite,
      activeFillerConfig.material.blending,
      activeFillerConfig.material.emissiveIntensity,
      activeFillerConfig.material,
    ],
  );

  const userMeshRef = useRef<THREE.InstancedMesh>(null);
  const fillerMeshRef = useRef<THREE.InstancedMesh>(null);
  const matrix = useMemo(() => new THREE.Matrix4(), []);
  const colorObj = useMemo(() => new THREE.Color(), []);

  useFrame((_, delta) => {
    if (!userMeshRef.current || !fillerMeshRef.current) return;

    const particles = world.query(Position, color, targetColor, size, index, active, ownerId);
    const breath = world.queryFirst(breathPhase);
    const phase = breath?.get(breathPhase)?.value ?? 0;

    let userColorNeedsUpdate = false;
    let fillerColorNeedsUpdate = false;
    let userIdx = 0;
    let fillerIdx = 0;

    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Particle state synchronization with multiple trait assignments
    particles.forEach((entity) => {
      const pos = entity.get(Position);
      const c = entity.get(color);
      const tc = entity.get(targetColor);
      const sizeTrait = entity.get(size);
      const indexTrait = entity.get(index);
      const activeTrait = entity.get(active);
      const ownerIdTrait = entity.get(ownerId);

      if (!pos || !c || !tc || !sizeTrait || !indexTrait || !ownerIdTrait) return;

      const s = sizeTrait.value;
      const isActive = activeTrait?.value ?? true;
      const isUser = ownerIdTrait.value === 'user';
      const config = isUser ? activeUserConfig : activeFillerConfig;

      // 1. Smooth color bleeding
      if (c.r !== tc.r || c.g !== tc.g || c.b !== tc.b) {
        easing.damp(c, 'r', tc.r, VISUALS.PARTICLE_COLOR_DAMPING, delta);
        easing.damp(c, 'g', tc.g, VISUALS.PARTICLE_COLOR_DAMPING, delta);
        easing.damp(c, 'b', tc.b, VISUALS.PARTICLE_COLOR_DAMPING, delta);
        if (isUser) {
          userColorNeedsUpdate = true;
        } else {
          fillerColorNeedsUpdate = true;
        }
      }

      // 2. Calculate scale with breath pulse
      // Inactive particles have 0 scale to hide them
      const pulse = 1.0 + phase * config.size.breathPulseIntensity;
      const baseScale = isActive ? s * VISUALS.PARTICLE_SIZE * config.size.baseScale : 0;
      const finalScale = baseScale * pulse;

      matrix.makeScale(finalScale, finalScale, finalScale);
      matrix.setPosition(pos.x, pos.y, pos.z);

      const meshRef = isUser ? userMeshRef : fillerMeshRef;
      const instanceIdx = isUser ? userIdx++ : fillerIdx++;

      meshRef.current?.setMatrixAt(instanceIdx, matrix);

      if (isUser ? userColorNeedsUpdate : fillerColorNeedsUpdate) {
        colorObj.setRGB(c.r, c.g, c.b);
        meshRef.current?.setColorAt(instanceIdx, colorObj);
      }
    });

    userMeshRef.current.instanceMatrix.needsUpdate = true;
    fillerMeshRef.current.instanceMatrix.needsUpdate = true;

    if (userColorNeedsUpdate && userMeshRef.current.instanceColor) {
      userMeshRef.current.instanceColor.needsUpdate = true;
    }
    if (fillerColorNeedsUpdate && fillerMeshRef.current.instanceColor) {
      fillerMeshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <group>
      <instancedMesh ref={userMeshRef} args={[userGeometry, userMaterial, finalCount]}>
        <primitive object={userGeometry} attach="geometry" />
        <primitive object={userMaterial} attach="material" />
      </instancedMesh>

      <instancedMesh ref={fillerMeshRef} args={[fillerGeometry, fillerMaterial, finalCount]}>
        <primitive object={fillerGeometry} attach="geometry" />
        <primitive object={fillerMaterial} attach="material" />
      </instancedMesh>
    </group>
  );
}
