import { useFrame, useThree } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef } from 'react';
import { createNoise3D } from 'simplex-noise';
import * as THREE from 'three';
import type { MoodId } from '../../constants';
import { VISUALS } from '../../constants';
import { MOOD_METADATA } from '../../lib/colors';
import { generateFibonacciSphere } from '../../lib/fibonacciSphere';
import { createGlassRefractionMaterial } from '../../lib/shaders';
import { breathPhase, crystallization, orbitRadius, sphereScale } from '../breath/traits';
import { useRefractionRenderPipeline } from './hooks/useRefractionRenderPipeline';
import { createBackfaceMaterial } from './materials/createBackfaceMaterial';

const noise3D = createNoise3D();

export interface ParticleSwarmProps {
  /**
   * Total number of particles in the swarm.
   */
  capacity?: number;
  /**
   * User mood distribution (mood ID → count).
   */
  users?: Partial<Record<MoodId, number>>;
  /**
   * Enable glass refraction effect for particles.
   */
  enableRefraction?: boolean;
  /**
   * Refraction render target quality (512 | 1024 | 2048).
   */
  refractionQuality?: number;
}

/**
 * ParticleSwarm with optional glass refraction effect.
 * Icosahedrons respond to user mood and breath synchronization.
 * Can render as neon particles (default) or glass-like refractive particles.
 */
export function ParticleSwarm({
  capacity = 300,
  users,
  enableRefraction = true,
  refractionQuality = 1024,
}: ParticleSwarmProps) {
  const world = useWorld();
  const { gl } = useThree();

  const meshRef = useRef<THREE.InstancedMesh>(null);
  const matrixRef = useRef(new THREE.Matrix4());
  const colorRef = useRef(new THREE.Color());
  // Reusable Vector3 for physics calculations (avoid per-frame allocation)
  const tempForceRef = useRef(new THREE.Vector3());

  // Constants
  const MIN_SCALE = 0.12;
  const MAX_SCALE = 0.28;
  const FILLER_COLOR = '#4A606B';

  const data = useMemo(() => {
    const layout = generateFibonacciSphere(capacity);
    const positions = new Float32Array(capacity * 3);
    const velocities = new Float32Array(capacity * 3);
    const restPositions = new Float32Array(capacity * 3);
    const seeds = new Float32Array(capacity);
    const colors = new Float32Array(capacity * 3);
    const targetColors = new Float32Array(capacity * 3);

    const fillerCol = new THREE.Color(FILLER_COLOR);

    for (let i = 0; i < capacity; i++) {
      const p = layout[i];
      const x = Math.cos(p.theta) * Math.sin(p.phi);
      const y = Math.cos(p.phi);
      const z = Math.sin(p.theta) * Math.sin(p.phi);

      restPositions[i * 3 + 0] = x;
      restPositions[i * 3 + 1] = y;
      restPositions[i * 3 + 2] = z;

      positions[i * 3 + 0] = x * 2;
      positions[i * 3 + 1] = y * 2;
      positions[i * 3 + 2] = z * 2;

      seeds[i] = Math.random() * 1000;

      colors[i * 3 + 0] = fillerCol.r;
      colors[i * 3 + 1] = fillerCol.g;
      colors[i * 3 + 2] = fillerCol.b;
      targetColors[i * 3 + 0] = fillerCol.r;
      targetColors[i * 3 + 1] = fillerCol.g;
      targetColors[i * 3 + 2] = fillerCol.b;
    }

    return { positions, velocities, restPositions, seeds, colors, targetColors };
  }, [capacity]);

  useEffect(() => {
    const fillerCol = new THREE.Color(FILLER_COLOR);
    if (!users) {
      for (let i = 0; i < capacity; i++) {
        data.targetColors[i * 3 + 0] = fillerCol.r;
        data.targetColors[i * 3 + 1] = fillerCol.g;
        data.targetColors[i * 3 + 2] = fillerCol.b;
      }
      return;
    }

    let idx = 0;
    for (const [moodId, count] of Object.entries(users)) {
      const moodColor = MOOD_METADATA[moodId as MoodId]?.color ?? '#7EC8D4';
      const col = new THREE.Color(moodColor);
      for (let i = 0; i < (count ?? 0) && idx < capacity; i++, idx++) {
        data.targetColors[idx * 3 + 0] = col.r;
        data.targetColors[idx * 3 + 1] = col.g;
        data.targetColors[idx * 3 + 2] = col.b;
      }
    }

    while (idx < capacity) {
      data.targetColors[idx * 3 + 0] = fillerCol.r;
      data.targetColors[idx * 3 + 1] = fillerCol.g;
      data.targetColors[idx * 3 + 2] = fillerCol.b;
      idx++;
    }
  }, [users, data, capacity]);

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex particle physics simulation requires multiple force calculations (spring, wind, jitter, repulsion) - refactoring would harm performance and readability
  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const breathEntity = world.queryFirst(orbitRadius, sphereScale, crystallization, breathPhase);
    if (!breathEntity) return;

    const orbitAttr = breathEntity.get(orbitRadius);
    const scaleAttr = breathEntity.get(sphereScale);
    const crystAttr = breathEntity.get(crystallization);
    const phaseAttr = breathEntity.get(breathPhase);

    if (!orbitAttr || !scaleAttr || !crystAttr) return;

    const currentOrbitRadius = orbitAttr.value;
    const currentSphereScale = scaleAttr.value;
    const currentCryst = crystAttr.value;
    const phase = phaseAttr?.value ?? 0;

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const springStiffness = lerp(
      VISUALS.SPRING_STIFFNESS_EXHALE,
      VISUALS.SPRING_STIFFNESS_INHALE,
      phase,
    );
    const drag =
      lerp(VISUALS.PARTICLE_DRAG_EXHALE, VISUALS.PARTICLE_DRAG_INHALE, phase) ** (delta * 60);

    const time = state.clock.elapsedTime;
    const tempForce = tempForceRef.current;

    for (let i = 0; i < capacity; i++) {
      const rest = data.restPositions;
      const pos = data.positions;
      const vel = data.velocities;
      const s = data.seeds[i];

      tempForce.set(0, 0, 0);

      const targetRadius = 0.5 + 5.5 * (currentOrbitRadius / VISUALS.PARTICLE_ORBIT_MAX);
      tempForce.x += (rest[i * 3 + 0] * targetRadius - pos[i * 3 + 0]) * springStiffness;
      tempForce.y += (rest[i * 3 + 1] * targetRadius - pos[i * 3 + 1]) * springStiffness;
      tempForce.z += (rest[i * 3 + 2] * targetRadius - pos[i * 3 + 2]) * springStiffness;

      const wind = 0.15 * (1 - currentCryst);
      tempForce.x += noise3D(pos[i * 3 + 0] * 0.3, pos[i * 3 + 1] * 0.3, time * 0.15 + s) * wind;
      tempForce.y +=
        noise3D(pos[i * 3 + 1] * 0.3, pos[i * 3 + 2] * 0.3, time * 0.15 + s + 10) * wind;
      tempForce.z +=
        noise3D(pos[i * 3 + 2] * 0.3, pos[i * 3 + 0] * 0.3, time * 0.15 + s + 20) * wind;

      if (currentCryst > 0.05) {
        const jitter = currentCryst * 0.3;
        tempForce.x += Math.sin(time * 25 + s) * jitter;
        tempForce.y += Math.cos(time * 25 + s) * jitter;
        tempForce.z += Math.sin(time * 25 + s + 1) * jitter;
      }

      const repulsionRadius = currentSphereScale + 0.5;
      const d2 = pos[i * 3 + 0] ** 2 + pos[i * 3 + 1] ** 2 + pos[i * 3 + 2] ** 2;
      if (d2 < repulsionRadius * repulsionRadius && d2 > 0.001) {
        const d = Math.sqrt(d2);
        const push = ((repulsionRadius - d) / repulsionRadius) ** 2 * 12;
        tempForce.x += (pos[i * 3 + 0] / d) * push;
        tempForce.y += (pos[i * 3 + 1] / d) * push;
        tempForce.z += (pos[i * 3 + 2] / d) * push;
      }

      vel[i * 3 + 0] = (vel[i * 3 + 0] + tempForce.x * delta) * drag;
      vel[i * 3 + 1] = (vel[i * 3 + 1] + tempForce.y * delta) * drag;
      vel[i * 3 + 2] = (vel[i * 3 + 2] + tempForce.z * delta) * drag;

      pos[i * 3 + 0] += vel[i * 3 + 0] * delta;
      pos[i * 3 + 1] += vel[i * 3 + 1] * delta;
      pos[i * 3 + 2] += vel[i * 3 + 2] * delta;

      for (let j = 0; j < 3; j++) {
        data.colors[i * 3 + j] +=
          (data.targetColors[i * 3 + j] - data.colors[i * 3 + j]) * 4 * delta;
      }

      const scale = lerp(MIN_SCALE, MAX_SCALE, phase);
      matrixRef.current.makeScale(scale, scale, scale);
      matrixRef.current.setPosition(pos[i * 3 + 0], pos[i * 3 + 1], pos[i * 3 + 2]);
      mesh.setMatrixAt(i, matrixRef.current);

      colorRef.current.setRGB(
        data.colors[i * 3 + 0],
        data.colors[i * 3 + 1],
        data.colors[i * 3 + 2],
      );
      mesh.setColorAt(i, colorRef.current);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  const geometry = useMemo(() => new THREE.IcosahedronGeometry(1, 0), []);

  // Back-face material for capturing normals in refraction pass
  const backfaceMaterial = useMemo(() => createBackfaceMaterial(), []);

  // Render targets for refraction pipeline
  const renderTargets = useRefractionRenderPipeline(enableRefraction, refractionQuality);

  // Glass refraction material (used when enableRefraction = true)
  const refractionMaterial = useMemo(() => {
    if (!renderTargets) return null;
    const material = createGlassRefractionMaterial();
    material.uniforms.uEnvMap.value = renderTargets.envFBO.texture;
    material.uniforms.uBackfaceMap.value = renderTargets.backfaceFBO.texture;
    return material;
  }, [renderTargets]);

  // Fallback material (basic neon, used when refraction disabled)
  const fallbackMaterial = useMemo(() => {
    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    return material;
  }, []);

  // Cleanup: Dispose materials on unmount
  useEffect(() => {
    return () => {
      geometry.dispose();
      backfaceMaterial.dispose();
      refractionMaterial?.dispose();
      fallbackMaterial.dispose();
    };
  }, [geometry, backfaceMaterial, refractionMaterial, fallbackMaterial]);

  const { scene, camera } = useThree();

  // 3-pass render loop for glass refraction
  useFrame(() => {
    if (!enableRefraction || !renderTargets || !refractionMaterial || !meshRef.current) return;

    const mesh = meshRef.current;
    const { envFBO, backfaceFBO } = renderTargets;

    // Store original state
    const originalMaterial = mesh.material;
    const originalVisible = mesh.visible;
    const originalBackground = scene.background;
    const originalAutoClear = gl.autoClear;

    gl.autoClear = false;

    // ============================================
    // PASS 1: Render environment to envFBO
    // ============================================
    mesh.visible = false;
    gl.setRenderTarget(envFBO);
    gl.setClearColor(0x000000, 0);
    gl.clear();
    gl.render(scene, camera);

    // ============================================
    // PASS 2: Render particle back-faces to backfaceFBO
    // ============================================
    mesh.visible = true;
    mesh.material = backfaceMaterial;
    scene.background = null;

    gl.setRenderTarget(backfaceFBO);
    gl.setClearColor(0x000000, 0);
    gl.clear();
    gl.clearDepth();
    gl.render(scene, camera);

    // ============================================
    // PASS 3: Final render with refraction to screen
    // ============================================
    mesh.material = refractionMaterial;
    scene.background = originalBackground;

    gl.setRenderTarget(null);
    gl.setClearColor(0x000000, 1);
    gl.clear();
    gl.render(scene, camera);

    // Restore state
    mesh.material = originalMaterial;
    mesh.visible = originalVisible;
    scene.background = originalBackground;
    gl.autoClear = originalAutoClear;
  }, -100); // Priority -100: run BEFORE default R3F render

  // Update refraction shader uniforms each frame
  useFrame((state) => {
    if (!refractionMaterial) return;

    const mesh = meshRef.current;
    if (!mesh) return;

    const breathEntity = world.queryFirst(orbitRadius, sphereScale, crystallization, breathPhase);
    if (!breathEntity) return;

    const phaseAttr = breathEntity.get(breathPhase);
    const phase = phaseAttr?.value ?? 0;

    // Update uniforms
    refractionMaterial.uniforms.uBreathPhase.value = phase;
    refractionMaterial.uniforms.uResolution.value.set(state.size.width, state.size.height);
  });

  return (
    <group name="Particle Swarm">
      <instancedMesh
        ref={meshRef}
        args={[geometry, refractionMaterial ?? fallbackMaterial, capacity]}
        frustumCulled={true}
      />
    </group>
  );
}
