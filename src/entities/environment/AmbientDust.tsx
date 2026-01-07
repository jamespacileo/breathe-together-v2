/**
 * AmbientDust - Subtle floating dust particles using TSL
 *
 * Uses InstancedMesh with billboarded quads (TSL).
 * Per-instance attributes for opacity and sparkle phase.
 *
 * Features:
 * - Instanced billboarded quads (camera-facing)
 * - Per-particle opacity and sparkle phase via instancedBufferAttribute
 * - Soft circular particle mask with distance falloff
 * - Subtle sparkle animation (rare, brief flashes)
 * - Golden moonlit dust that turns white on sparkle
 * - Additive blending for atmospheric depth
 */

import { useFrame } from '@react-three/fiber';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  add,
  color,
  float,
  length,
  mix,
  mul,
  pow,
  sin,
  smoothstep,
  sub,
  uniform,
  uv,
  vec3,
} from 'three/tsl';
import { MeshBasicNodeMaterial } from 'three/webgpu';

import { RENDER_LAYERS } from '../../constants';
import { useDisposeOnUnmount } from '../../hooks/useDisposeOnUnmount';
import { getMaterialUserData, setMaterialUserData } from '../../lib/three/materialUserData';
import { createInstanceAttributeNode, INSTANCE_ATTRIBUTES } from '../../lib/tsl/instancing';

interface AmbientDustProps {
  /** Number of dust particles @default 80 */
  count?: number;
  /** Maximum opacity (very subtle) @default 0.15 */
  opacity?: number;
  /** Size of dust motes @default 0.015 */
  size?: number;
  /** Enable dust @default true */
  enabled?: boolean;
}

export const AmbientDust = memo(function AmbientDust({
  count = 80,
  opacity = 0.225,
  size = 0.015,
  enabled = true,
}: AmbientDustProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<MeshBasicNodeMaterial>(null);

  // Store initial positions for drift calculation
  const initialPositions = useRef<Float32Array | null>(null);

  // Set layers on mount to exclude from DoF
  useEffect(() => {
    if (meshRef.current) {
      (meshRef.current as THREE.Object3D).layers.set(RENDER_LAYERS.EFFECTS);
    }
  }, []);

  // Create geometry (single quad, instanced)
  const geometry = useMemo(() => {
    // Use PlaneGeometry for each particle
    return new THREE.PlaneGeometry(size, size);
  }, [size]);

  // Create instance data
  const { positions, velocities, opacities, sparklePhases } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    const op = new Float32Array(count);
    const sp = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Distribute in a wide, shallow volume
      // More particles in the middle-ground depth
      const x = (Math.random() - 0.5) * 40;
      const y = (Math.random() - 0.5) * 25;
      const z = -10 - Math.random() * 40; // -10 to -50

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      // Random opacity (some barely visible, some slightly more visible)
      op[i] = 0.3 + Math.random() * 0.7;

      // Random sparkle phase
      sp[i] = Math.random();

      // Gentle drift velocities (mostly horizontal, slight vertical)
      vel[i * 3] = (Math.random() - 0.5) * 0.02; // X drift
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.01; // Y drift
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.005; // Z drift
    }

    return {
      positions: pos,
      velocities: vel,
      opacities: op,
      sparklePhases: sp,
    };
  }, [count]);

  // Store initial positions
  useEffect(() => {
    initialPositions.current = new Float32Array(positions);
  }, [positions]);

  // Create TSL material
  const material = useMemo(() => {
    // TSL Uniforms
    const uTime = uniform(float(0));
    const uBaseOpacity = uniform(float(opacity));

    // ═══════════════════════════════════════════════════════════════
    // Per-instance attributes (opacity and sparkle phase)
    // GLSL: attribute float aOpacity; attribute float aSparklePhase;
    // ═══════════════════════════════════════════════════════════════
    const instanceOpacity = createInstanceAttributeNode(INSTANCE_ATTRIBUTES.OPACITY);
    const instanceSparklePhase = createInstanceAttributeNode(INSTANCE_ATTRIBUTES.SPARKLE_PHASE);

    // ═══════════════════════════════════════════════════════════════
    // Subtle sparkle effect - some particles catch light
    // GLSL: float sparkle = sin(uTime * 2.0 + aSparklePhase * 6.28) * 0.5 + 0.5;
    //       sparkle = pow(sparkle, 8.0);
    // ═══════════════════════════════════════════════════════════════
    const sparkleRaw = add(
      mul(sin(add(mul(uTime, float(2.0)), mul(instanceSparklePhase, float(6.28)))), float(0.5)),
      float(0.5),
    );
    const sparkle = pow(sparkleRaw, float(8.0)); // Make sparkle rare and brief
    const vSparkle = mul(sparkle, float(0.3)); // Max 30% extra brightness

    // ═══════════════════════════════════════════════════════════════
    // Soft circular particle mask
    // GLSL: vec2 center = gl_PointCoord - 0.5;
    //       float dist = length(center);
    //       if (dist > 0.5) discard;
    // TSL: Use UV coordinates instead (0-1 range)
    // ═══════════════════════════════════════════════════════════════
    const uvCoord = uv();
    const center = sub(uvCoord, float(0.5));
    const dist = length(center);

    // Discard outside circle using step (0 if dist > 0.5, 1 if dist <= 0.5)
    const insideCircle = smoothstep(float(0.5), float(0.48), dist); // Slight feather

    // ═══════════════════════════════════════════════════════════════
    // Soft falloff for particle alpha
    // GLSL: float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
    //       alpha *= vOpacity * uBaseOpacity;
    //       alpha += vSparkle * 0.5;
    // ═══════════════════════════════════════════════════════════════
    const alphaFalloff = sub(float(1.0), smoothstep(float(0.0), float(0.5), dist));
    const baseAlpha = mul(mul(alphaFalloff, instanceOpacity), uBaseOpacity);
    const alpha = mul(add(baseAlpha, mul(vSparkle, float(0.5))), insideCircle);

    // ═══════════════════════════════════════════════════════════════
    // Golden moonlit dust that turns white on sparkle
    // GLSL: vec3 color = vec3(0.98, 0.90, 0.60);
    //       color = mix(color, vec3(1.0), vSparkle);
    // ═══════════════════════════════════════════════════════════════
    const dustColor = vec3(0.98, 0.9, 0.6);
    const finalColor = mix(dustColor, vec3(1.0), vSparkle);

    // Create material
    const mat = new MeshBasicNodeMaterial();
    mat.colorNode = color(finalColor);
    mat.opacityNode = alpha;
    mat.transparent = true;
    mat.depthWrite = false;
    mat.side = THREE.DoubleSide; // Billboard should be visible from both sides
    mat.blending = THREE.AdditiveBlending;

    // Store uniforms for animation
    setMaterialUserData(mat, { uTime, uBaseOpacity });

    return mat;
  }, [opacity]);

  useDisposeOnUnmount(geometry, material);

  // Setup instanced mesh with per-instance attributes
  useEffect(() => {
    if (!meshRef.current) return;

    const mesh = meshRef.current;

    // Set instance transforms (positions only, billboarding handled by lookAt)
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < count; i++) {
      matrix.setPosition(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
      mesh.setMatrixAt(i, matrix);
    }

    // Add per-instance attributes for opacity and sparkle phase
    mesh.geometry.setAttribute(
      INSTANCE_ATTRIBUTES.OPACITY,
      new THREE.InstancedBufferAttribute(opacities, 1),
    );
    mesh.geometry.setAttribute(
      INSTANCE_ATTRIBUTES.SPARKLE_PHASE,
      new THREE.InstancedBufferAttribute(sparklePhases, 1),
    );

    mesh.instanceMatrix.needsUpdate = true;
  }, [count, positions, opacities, sparklePhases]);

  // Animate dust particles with drift and billboarding
  useFrame((state) => {
    if (!meshRef.current || !materialRef.current || !initialPositions.current) return;

    const time = state.clock.elapsedTime;
    const mesh = meshRef.current;
    const camera = state.camera;

    // Update time uniform for sparkle
    const userData = getMaterialUserData<{
      uTime?: { value: number };
      uBaseOpacity?: { value: number };
    }>(materialRef.current);
    if (userData?.uTime) {
      userData.uTime.value = time;
    }

    // Update positions with gentle drift and billboard rotation
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3(1, 1, 1);

    for (let i = 0; i < count; i++) {
      const baseX = initialPositions.current[i * 3];
      const baseY = initialPositions.current[i * 3 + 1];
      const baseZ = initialPositions.current[i * 3 + 2];

      // Gentle sinusoidal drift based on particle's unique velocity
      const driftX =
        Math.sin(time * 0.3 + i * 0.1) * velocities[i * 3] * 20 + Math.sin(time * 0.1) * 0.5; // Global drift

      const driftY =
        Math.sin(time * 0.2 + i * 0.15) * velocities[i * 3 + 1] * 20 + Math.cos(time * 0.08) * 0.2;

      const driftZ = Math.sin(time * 0.15 + i * 0.2) * velocities[i * 3 + 2] * 10;

      position.set(baseX + driftX, baseY + driftY, baseZ + driftZ);

      // Billboard: Make particle face camera
      quaternion.copy(camera.quaternion);

      // Compose matrix
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(i, matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
  });

  if (!enabled) return null;

  return (
    <instancedMesh ref={meshRef} args={[geometry, material, count]} frustumCulled={false}>
      <primitive object={material} ref={materialRef} attach="material" />
    </instancedMesh>
  );
});

export default AmbientDust;
