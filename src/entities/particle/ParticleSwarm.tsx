/**
 * ParticleSwarm - Icosahedral shards orbiting Earth
 *
 * REFACTORED: Matches HTML artifact implementation
 * - Removes complex physics (spring, wind, jitter, repulsion)
 * - Implements simple radial breathing animation
 * - Adds per-shard rotation (individual x/y spin)
 * - Keeps frosted glass refraction shader + 3-pass rendering
 * - Maintains InstancedMesh performance optimization
 *
 * ARCHITECTURE:
 * - Shard size: inversely proportional to count (baseSize / sqrt(count))
 * - Animation: Simple sine wave breathing with smoothstep easing
 * - Position: radial expansion `position = direction * currentRadius`
 * - Rotation: Per-shard quaternion updates
 * - Colors: Monument Valley 4-color palette
 */

import { useFrame, useThree } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { MoodId } from '../../constants';
import { getMonumentValleyMoodColor } from '../../lib/colors';
import { createGlassRefractionMaterial } from '../../lib/shaders';
import { breathPhase } from '../breath/traits';
import { useRefractionRenderPipeline } from './hooks/useRefractionRenderPipeline';
import { createBackfaceMaterial } from './materials/createBackfaceMaterial';

export interface ParticleSwarmProps {
  /**
   * Total number of shards in the swarm.
   * @default 300
   */
  capacity?: number;

  /**
   * User mood distribution (mood ID → count).
   */
  users?: Partial<Record<MoodId, number>>;

  /**
   * Enable glass refraction effect for shards.
   * @default true
   */
  enableRefraction?: boolean;

  /**
   * Refraction render target quality (512 | 1024 | 2048).
   * @default 1024
   */
  refractionQuality?: number;

  /**
   * Base radius at exhale phase (minimum orbit distance).
   * @default 6.0
   */
  baseRadius?: number;

  /**
   * Additional radius at inhale phase (breathing expansion).
   * @default 2.0
   */
  expansionRange?: number;

  /**
   * Base shard size for calculation (size = baseSize / sqrt(count)).
   * @default 4.0
   */
  baseShardSize?: number;

  /**
   * Breathing speed multiplier.
   * @default 0.3
   */
  breathSpeed?: number;

  /**
   * Per-shard X-axis rotation speed (radians per frame).
   * @default 0.002
   */
  rotationSpeedX?: number;

  /**
   * Per-shard Y-axis rotation speed (radians per frame).
   * @default 0.003
   */
  rotationSpeedY?: number;
}

/**
 * Smoothstep easing function (same as HTML artifact)
 * Used for breathing animation curve
 */
function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/**
 * ParticleSwarm - Monument Valley icosahedral shards
 *
 * Renders 150-600 instanced icosahedrons orbiting Earth with:
 * - Radial breathing animation (sine wave + smoothstep easing)
 * - Per-shard rotation (independent x/y spin)
 * - Monument Valley 4-color mood palette
 * - Frosted glass refraction material
 */
export function ParticleSwarm({
  capacity = 300,
  users,
  enableRefraction = true,
  refractionQuality = 1024,
  baseRadius = 6.0,
  expansionRange = 2.0,
  baseShardSize = 4.0,
  breathSpeed = 0.3,
  rotationSpeedX = 0.002,
  rotationSpeedY = 0.003,
}: ParticleSwarmProps) {
  const world = useWorld();
  const { gl, scene, camera } = useThree();

  const meshRef = useRef<THREE.InstancedMesh>(null);
  const matrixRef = useRef(new THREE.Matrix4());
  const colorRef = useRef(new THREE.Color());
  const tempPosRef = useRef(new THREE.Vector3());
  const tempQuatRef = useRef(new THREE.Quaternion());
  const tempScaleRef = useRef(new THREE.Vector3(1, 1, 1));

  // Monument Valley neutral filler color (warm neutral)
  const FILLER_COLOR = '#e6dcd3';

  /**
   * Pre-compute shard size based on count (inversely proportional)
   * Matches HTML artifact: baseSize / Math.sqrt(PARAMS.count)
   */
  const shardSize = baseShardSize / Math.sqrt(capacity);

  /**
   * Initialize particle data:
   * - Direction vectors (Fibonacci sphere distribution)
   * - Rotation state (quaternions)
   * - Colors (mood assignments)
   */
  const data = useMemo(() => {
    // Fibonacci sphere distribution (same as original)
    const directions = new Float32Array(capacity * 3);
    const rotations = new Float32Array(capacity * 4); // quaternions: x, y, z, w
    const colors = new Float32Array(capacity * 3);
    const targetColors = new Float32Array(capacity * 3);

    const fillerCol = new THREE.Color(FILLER_COLOR);

    for (let i = 0; i < capacity; i++) {
      // Fibonacci sphere
      const phi = Math.acos(-1 + (2 * i) / capacity);
      const theta = Math.sqrt(capacity * Math.PI) * phi;

      const dir = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
      directions[i * 3] = dir.x;
      directions[i * 3 + 1] = dir.y;
      directions[i * 3 + 2] = dir.z;

      // Initialize rotation as identity quaternion
      rotations[i * 4] = 0; // x
      rotations[i * 4 + 1] = 0; // y
      rotations[i * 4 + 2] = 0; // z
      rotations[i * 4 + 3] = 1; // w

      // Initialize colors to filler
      colors[i * 3] = fillerCol.r;
      colors[i * 3 + 1] = fillerCol.g;
      colors[i * 3 + 2] = fillerCol.b;
      targetColors[i * 3] = fillerCol.r;
      targetColors[i * 3 + 1] = fillerCol.g;
      targetColors[i * 3 + 2] = fillerCol.b;
    }

    return { directions, rotations, colors, targetColors };
  }, [capacity]);

  /**
   * Update color assignments when users change
   */
  useEffect(() => {
    const fillerCol = new THREE.Color(FILLER_COLOR);
    if (!users) {
      for (let i = 0; i < capacity; i++) {
        data.targetColors[i * 3] = fillerCol.r;
        data.targetColors[i * 3 + 1] = fillerCol.g;
        data.targetColors[i * 3 + 2] = fillerCol.b;
      }
      return;
    }

    let idx = 0;
    // Assign mood colors to first N shards
    for (const [moodId, count] of Object.entries(users)) {
      const moodColor = getMonumentValleyMoodColor(moodId as MoodId);
      const col = new THREE.Color(moodColor);
      for (let i = 0; i < (count ?? 0) && idx < capacity; i++, idx++) {
        data.targetColors[idx * 3] = col.r;
        data.targetColors[idx * 3 + 1] = col.g;
        data.targetColors[idx * 3 + 2] = col.b;
      }
    }

    // Fill remaining shards with filler color
    while (idx < capacity) {
      data.targetColors[idx * 3] = fillerCol.r;
      data.targetColors[idx * 3 + 1] = fillerCol.g;
      data.targetColors[idx * 3 + 2] = fillerCol.b;
      idx++;
    }
  }, [users, data, capacity]);

  /**
   * Main animation loop: breathing, rotation, and color updates
   */
  useFrame((state, _delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    // Read breathing phase from ECS
    const breathEntity = world.queryFirst(breathPhase);
    if (!breathEntity) return;

    const phaseAttr = breathEntity.get(breathPhase);
    if (!phaseAttr) return;

    const t = state.clock.elapsedTime;

    // HTML artifact breathing: simple sine wave with smoothstep easing
    const breathSine = Math.sin(t * breathSpeed) * 0.5 + 0.5;
    const easedBreath = smoothstep(breathSine);
    const currentRadius = baseRadius + easedBreath * expansionRange;

    const tempPos = tempPosRef.current;
    const tempQuat = tempQuatRef.current;
    const tempScale = tempScaleRef.current;

    // Update each shard
    for (let i = 0; i < capacity; i++) {
      // ========================================
      // POSITION: Radial expansion
      // ========================================
      const dirX = data.directions[i * 3];
      const dirY = data.directions[i * 3 + 1];
      const dirZ = data.directions[i * 3 + 2];

      tempPos.set(dirX * currentRadius, dirY * currentRadius, dirZ * currentRadius);

      // ========================================
      // ROTATION: Per-shard quaternion updates
      // ========================================
      // Get current quaternion
      tempQuat.set(
        data.rotations[i * 4],
        data.rotations[i * 4 + 1],
        data.rotations[i * 4 + 2],
        data.rotations[i * 4 + 3],
      );

      // Apply incremental rotation
      const deltaX = rotationSpeedX;
      const deltaY = rotationSpeedY;

      // Create rotation deltas (per frame)
      const deltaQuatX = new THREE.Quaternion();
      const deltaQuatY = new THREE.Quaternion();

      deltaQuatX.setFromAxisAngle(new THREE.Vector3(1, 0, 0), deltaX);
      deltaQuatY.setFromAxisAngle(new THREE.Vector3(0, 1, 0), deltaY);

      tempQuat.multiply(deltaQuatX).multiply(deltaQuatY);

      // Store back for next frame
      data.rotations[i * 4] = tempQuat.x;
      data.rotations[i * 4 + 1] = tempQuat.y;
      data.rotations[i * 4 + 2] = tempQuat.z;
      data.rotations[i * 4 + 3] = tempQuat.w;

      // ========================================
      // SCALE: Fixed scale for all shards
      // ========================================
      tempScale.set(shardSize, shardSize, shardSize);

      // ========================================
      // COMPOSE: Position + Rotation + Scale
      // ========================================
      matrixRef.current.compose(tempPos, tempQuat, tempScale);
      mesh.setMatrixAt(i, matrixRef.current);

      // ========================================
      // COLOR: Smooth interpolation to target
      // ========================================
      for (let j = 0; j < 3; j++) {
        data.colors[i * 3 + j] += (data.targetColors[i * 3 + j] - data.colors[i * 3 + j]) * 0.1;
      }

      colorRef.current.setRGB(data.colors[i * 3], data.colors[i * 3 + 1], data.colors[i * 3 + 2]);
      mesh.setColorAt(i, colorRef.current);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  /**
   * Geometry: Low-poly icosahedron
   * Size: inversely proportional to count (matches HTML artifact)
   */
  const geometry = useMemo(() => new THREE.IcosahedronGeometry(shardSize, 0), [shardSize]);

  // Back-face material for refraction pipeline
  const backfaceMaterial = useMemo(() => createBackfaceMaterial(), []);

  // Render targets for refraction
  const renderTargets = useRefractionRenderPipeline(enableRefraction, refractionQuality);

  // Glass refraction material
  const refractionMaterial = useMemo(() => {
    if (!renderTargets) return null;
    const material = createGlassRefractionMaterial();
    material.uniforms.uEnvMap.value = renderTargets.envFBO.texture;
    material.uniforms.uBackfaceMap.value = renderTargets.backfaceFBO.texture;
    return material;
  }, [renderTargets]);

  // Fallback material (neon)
  const fallbackMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      geometry.dispose();
      backfaceMaterial.dispose();
      refractionMaterial?.dispose();
      fallbackMaterial.dispose();
    };
  }, [geometry, backfaceMaterial, refractionMaterial, fallbackMaterial]);

  /**
   * 3-pass rendering for frosted glass effect
   * PASS 1: Environment (no particles)
   * PASS 2: Backfaces (normal capture)
   * PASS 3: Final (refraction + color)
   */
  useFrame(() => {
    if (!enableRefraction || !renderTargets || !refractionMaterial || !meshRef.current) return;

    const mesh = meshRef.current;
    const { envFBO, backfaceFBO } = renderTargets;

    const originalMaterial = mesh.material;
    const originalVisible = mesh.visible;
    const originalBackground = scene.background;
    const originalAutoClear = gl.autoClear;

    gl.autoClear = false;

    // PASS 1: Environment
    mesh.visible = false;
    gl.setRenderTarget(envFBO);
    gl.setClearColor(0x000000, 0);
    gl.clear();
    gl.render(scene, camera);

    // PASS 2: Backfaces
    mesh.visible = true;
    mesh.material = backfaceMaterial;
    scene.background = null;

    gl.setRenderTarget(backfaceFBO);
    gl.setClearColor(0x000000, 0);
    gl.clear();
    gl.clearDepth();
    gl.render(scene, camera);

    // PASS 3: Final composite
    mesh.material = refractionMaterial;
    scene.background = originalBackground;

    gl.setRenderTarget(null);

    // We let R3F handle the final render to screen.
    // We restore the original material in the NEXT frame or by using a timeout?
    // Actually, we can just leave it as refractionMaterial since we swap it back in PASS 2.
  }, 1); // Run after state updates but before render

  /**
   * Update shader uniforms each frame
   */
  useFrame((state) => {
    if (!refractionMaterial) return;

    const mesh = meshRef.current;
    if (!mesh) return;

    const breathEntity = world.queryFirst(breathPhase);
    if (!breathEntity) return;

    const phaseAttr = breathEntity.get(breathPhase);
    const phase = phaseAttr?.value ?? 0;

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

export default ParticleSwarm;
