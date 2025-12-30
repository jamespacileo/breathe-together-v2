/**
 * ParticleSwarm - Monument Valley inspired icosahedral shards
 *
 * Enhanced with:
 * - Breath-responsive rotation (faster during inhale/exhale, slower during hold)
 * - Trail/ghost effect (faint echoes following each shard)
 * - Constellation connection lines between nearby shards
 *
 * Uses separate Mesh objects (not InstancedMesh) to match reference exactly.
 * Each mesh has per-vertex color attribute for mood coloring.
 * Rendered via RefractionPipeline 3-pass FBO system.
 */

import { Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { MoodId } from '../../constants';
import { MONUMENT_VALLEY_PALETTE } from '../../lib/colors';
import { breathPhase, orbitRadius, phaseType, sphereScale } from '../breath/traits';
import { createFrostedGlassMaterial } from './FrostedGlassMaterial';

// Convert palette to THREE.Color array for random selection
const MOOD_COLORS = [
  new THREE.Color(MONUMENT_VALLEY_PALETTE.joy),
  new THREE.Color(MONUMENT_VALLEY_PALETTE.peace),
  new THREE.Color(MONUMENT_VALLEY_PALETTE.solitude),
  new THREE.Color(MONUMENT_VALLEY_PALETTE.love),
];

const MOOD_TO_COLOR: Record<MoodId, THREE.Color> = {
  grateful: new THREE.Color(MONUMENT_VALLEY_PALETTE.joy),
  celebrating: new THREE.Color(MONUMENT_VALLEY_PALETTE.joy),
  moment: new THREE.Color(MONUMENT_VALLEY_PALETTE.peace),
  here: new THREE.Color(MONUMENT_VALLEY_PALETTE.peace),
  anxious: new THREE.Color(MONUMENT_VALLEY_PALETTE.solitude),
  processing: new THREE.Color(MONUMENT_VALLEY_PALETTE.solitude),
  preparing: new THREE.Color(MONUMENT_VALLEY_PALETTE.love),
};

/**
 * Build color distribution array from users prop
 * Extracted to reduce cognitive complexity of shard creation
 */
function buildColorDistribution(users: Partial<Record<MoodId, number>> | undefined): THREE.Color[] {
  if (!users) return [];

  const colorDistribution: THREE.Color[] = [];
  for (const [moodId, moodCount] of Object.entries(users)) {
    const color = MOOD_TO_COLOR[moodId as MoodId];
    if (color) {
      for (let i = 0; i < (moodCount ?? 0); i++) {
        colorDistribution.push(color);
      }
    }
  }
  return colorDistribution;
}

/**
 * Apply per-vertex color to geometry
 */
function applyVertexColors(geometry: THREE.IcosahedronGeometry, color: THREE.Color): void {
  const vertexCount = geometry.attributes.position.count;
  const colors = new Float32Array(vertexCount * 3);
  for (let c = 0; c < colors.length; c += 3) {
    colors[c] = color.r;
    colors[c + 1] = color.g;
    colors[c + 2] = color.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

/** Number of ghost trail copies per shard */
const GHOST_COUNT = 3;
/** Ghost opacity falloff (each successive ghost is dimmer) */
const GHOST_OPACITY = [0.25, 0.12, 0.05];
/** Connection line distance threshold */
const CONNECTION_DISTANCE = 2.5;
/** Maximum connections per shard */
const MAX_CONNECTIONS = 3;

export interface ParticleSwarmProps {
  /** Number of shards (default 48 matches reference) */
  count?: number;
  /** Users by mood for color distribution */
  users?: Partial<Record<MoodId, number>>;
  /** Base radius for orbit @default 4.5 */
  baseRadius?: number;
  /** Base size for shards @default 4.0 */
  baseShardSize?: number;
  /** Globe radius for minimum distance calculation @default 1.5 */
  globeRadius?: number;
  /** Buffer distance between shard surface and globe surface @default 0.3 */
  buffer?: number;
  /** Maximum shard size cap (prevents oversized shards at low counts) @default 0.6 */
  maxShardSize?: number;
  /** Enable ghost trail effect @default true */
  enableTrails?: boolean;
  /** Enable constellation connection lines @default true */
  enableConnections?: boolean;
}

interface ShardData {
  mesh: THREE.Mesh;
  direction: THREE.Vector3;
  geometry: THREE.IcosahedronGeometry;
  color: THREE.Color;
  /** Ghost meshes for trail effect */
  ghosts: THREE.Mesh[];
  ghostGeometries: THREE.IcosahedronGeometry[];
  /** Previous rotations for trail delay */
  rotationHistory: Array<{ x: number; y: number }>;
}

export function ParticleSwarm({
  count = 48,
  users,
  baseRadius = 4.5,
  baseShardSize = 4.0,
  globeRadius = 1.5,
  buffer = 0.3,
  maxShardSize = 0.6,
  enableTrails = true,
  enableConnections = true,
}: ParticleSwarmProps) {
  const world = useWorld();
  const groupRef = useRef<THREE.Group>(null);
  const ghostGroupRef = useRef<THREE.Group>(null);
  const linesGroupRef = useRef<THREE.Group>(null);
  const shardsRef = useRef<ShardData[]>([]);
  const connectionLinesRef = useRef<THREE.Line[]>([]);

  // Calculate shard size (capped to prevent oversized shards at low counts)
  const shardSize = useMemo(
    () => Math.min(baseShardSize / Math.sqrt(count), maxShardSize),
    [baseShardSize, count, maxShardSize],
  );
  const minOrbitRadius = useMemo(
    () => globeRadius + shardSize + buffer,
    [globeRadius, shardSize, buffer],
  );

  // Create shared material (will be swapped by RefractionPipeline)
  const material = useMemo(() => createFrostedGlassMaterial(), []);

  // Create ghost material for trails (semi-transparent)
  const ghostMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
      }),
    [],
  );

  // Create shards with per-vertex colors and ghost trails
  const shards = useMemo(() => {
    const result: ShardData[] = [];
    const colorDistribution = buildColorDistribution(users);

    for (let i = 0; i < count; i++) {
      const geometry = new THREE.IcosahedronGeometry(shardSize, 0);

      // Apply per-vertex color from distribution or random fallback
      const mood =
        colorDistribution[i] ?? MOOD_COLORS[Math.floor(Math.random() * MOOD_COLORS.length)];
      applyVertexColors(geometry, mood);

      // Fibonacci sphere distribution
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;
      const direction = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);

      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.useRefraction = true; // Mark for RefractionPipeline
      mesh.position.copy(direction).multiplyScalar(baseRadius);
      mesh.lookAt(0, 0, 0);
      mesh.frustumCulled = false;

      // Create ghost meshes for trail effect
      const ghosts: THREE.Mesh[] = [];
      const ghostGeometries: THREE.IcosahedronGeometry[] = [];

      if (enableTrails) {
        for (let g = 0; g < GHOST_COUNT; g++) {
          const ghostGeom = new THREE.IcosahedronGeometry(shardSize * (0.9 - g * 0.15), 0);
          applyVertexColors(ghostGeom, mood);
          const ghostMesh = new THREE.Mesh(ghostGeom, ghostMaterial.clone());
          ghostMesh.material.opacity = GHOST_OPACITY[g] ?? 0.05;
          ghostMesh.position.copy(mesh.position);
          ghostMesh.rotation.copy(mesh.rotation);
          ghostMesh.frustumCulled = false;
          ghosts.push(ghostMesh);
          ghostGeometries.push(ghostGeom);
        }
      }

      result.push({
        mesh,
        direction,
        geometry,
        color: mood,
        ghosts,
        ghostGeometries,
        rotationHistory: Array(GHOST_COUNT * 5).fill({ x: 0, y: 0 }),
      });
    }

    return result;
  }, [count, users, baseRadius, shardSize, material, enableTrails, ghostMaterial]);

  // Add meshes to group and store ref
  useEffect(() => {
    const group = groupRef.current;
    const ghostGroup = ghostGroupRef.current;
    const linesGroup = linesGroupRef.current;
    if (!group) return;

    // Clear previous children
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }
    if (ghostGroup) {
      while (ghostGroup.children.length > 0) {
        ghostGroup.remove(ghostGroup.children[0]);
      }
    }
    if (linesGroup) {
      while (linesGroup.children.length > 0) {
        linesGroup.remove(linesGroup.children[0]);
      }
    }

    // Add new shards and their ghosts
    for (const shard of shards) {
      group.add(shard.mesh);
      if (ghostGroup && enableTrails) {
        for (const ghost of shard.ghosts) {
          ghostGroup.add(ghost);
        }
      }
    }
    shardsRef.current = shards;

    // Create connection lines if enabled
    if (linesGroup && enableConnections) {
      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.08,
        depthWrite: false,
      });

      // Create line segments for connections (will be updated in useFrame)
      const lineCount = Math.min(count * MAX_CONNECTIONS, 200);
      const lines: THREE.Line[] = [];

      for (let i = 0; i < lineCount; i++) {
        const lineGeom = new THREE.BufferGeometry();
        const positions = new Float32Array(6); // 2 points × 3 coords
        lineGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const line = new THREE.Line(lineGeom, lineMaterial.clone());
        line.visible = false;
        line.frustumCulled = false;
        lines.push(line);
        linesGroup.add(line);
      }
      connectionLinesRef.current = lines;
    }

    // Cleanup on unmount
    return () => {
      for (const shard of shards) {
        shard.geometry.dispose();
        group.remove(shard.mesh);
        for (const ghostGeom of shard.ghostGeometries) {
          ghostGeom.dispose();
        }
        for (const ghost of shard.ghosts) {
          if (ghost.material instanceof THREE.Material) {
            ghost.material.dispose();
          }
        }
      }
      // Cleanup connection lines
      for (const line of connectionLinesRef.current) {
        line.geometry.dispose();
        if (line.material instanceof THREE.Material) {
          line.material.dispose();
        }
      }
      connectionLinesRef.current = [];
    };
  }, [shards, enableTrails, enableConnections, count]);

  // Cleanup materials on unmount
  useEffect(() => {
    return () => {
      material.dispose();
      ghostMaterial.dispose();
    };
  }, [material, ghostMaterial]);

  // Animation loop - update positions, rotations, trails, and connections
  useFrame(() => {
    const currentShards = shardsRef.current;
    if (currentShards.length === 0) return;

    // Get breathing state from ECS
    let breathingRadius = baseRadius;
    let currentPhase = 0; // 0=inhale, 1=hold-in, 2=exhale, 3=hold-out
    let currentBreathPhase = 0; // 0-1 breath progress

    try {
      const breathEntity = world.queryFirst(orbitRadius, sphereScale, phaseType, breathPhase);
      if (breathEntity) {
        breathingRadius = breathEntity.get(orbitRadius)?.value ?? baseRadius;
        currentPhase = breathEntity.get(phaseType)?.value ?? 0;
        currentBreathPhase = breathEntity.get(breathPhase)?.value ?? 0;
      }
    } catch {
      // Ignore ECS errors during unmount/remount in Triplex
    }

    // Clamp radius to prevent shards from penetrating globe
    const currentRadius = Math.max(breathingRadius, minOrbitRadius);

    // Breath-responsive rotation speed:
    // - Faster during inhale (phase 0) and exhale (phase 2)
    // - Slower during hold phases (1 and 3)
    const isHoldPhase = currentPhase === 1 || currentPhase === 3;
    const rotationMultiplier = isHoldPhase ? 0.3 : 1.0 + currentBreathPhase * 0.5;
    const baseRotX = 0.002 * rotationMultiplier;
    const baseRotY = 0.003 * rotationMultiplier;

    // Update each shard
    for (const shard of currentShards) {
      // Update position based on clamped breathing radius
      shard.mesh.position.copy(shard.direction).multiplyScalar(currentRadius);

      // Breath-responsive rotation
      shard.mesh.rotation.x += baseRotX;
      shard.mesh.rotation.y += baseRotY;

      // Update rotation history for trail effect (shift and add new)
      if (enableTrails && shard.rotationHistory.length > 0) {
        shard.rotationHistory.shift();
        shard.rotationHistory.push({
          x: shard.mesh.rotation.x,
          y: shard.mesh.rotation.y,
        });

        // Update ghost positions and rotations with delay
        for (let g = 0; g < shard.ghosts.length; g++) {
          const ghost = shard.ghosts[g];
          if (!ghost) continue;

          // Ghosts follow the main shard position
          ghost.position.copy(shard.mesh.position);

          // Ghosts use delayed rotation from history
          const historyIndex = g * 5;
          const delayedRotation = shard.rotationHistory[historyIndex];
          if (delayedRotation) {
            ghost.rotation.x = delayedRotation.x;
            ghost.rotation.y = delayedRotation.y;
          }

          // Ghost opacity pulses with breathing (dimmer during hold)
          const baseOpacity = GHOST_OPACITY[g] ?? 0.05;
          const breathOpacity = isHoldPhase
            ? baseOpacity * 0.5
            : baseOpacity * (1 + currentBreathPhase * 0.3);
          if (ghost.material instanceof THREE.Material) {
            ghost.material.opacity = breathOpacity;
          }
        }
      }
    }

    // Update connection lines between nearby shards
    if (enableConnections) {
      const lines = connectionLinesRef.current;
      let lineIndex = 0;

      // Hide all lines first
      for (const line of lines) {
        line.visible = false;
      }

      // Find and draw connections
      for (let i = 0; i < currentShards.length && lineIndex < lines.length; i++) {
        const shardA = currentShards[i];
        if (!shardA) continue;
        let connectionsForShard = 0;

        for (
          let j = i + 1;
          j < currentShards.length && connectionsForShard < MAX_CONNECTIONS;
          j++
        ) {
          const shardB = currentShards[j];
          if (!shardB) continue;

          const distance = shardA.mesh.position.distanceTo(shardB.mesh.position);

          if (distance < CONNECTION_DISTANCE && lineIndex < lines.length) {
            const line = lines[lineIndex];
            if (!line) continue;

            // Update line geometry
            const positions = line.geometry.attributes.position;
            if (positions) {
              const posArray = positions.array as Float32Array;
              posArray[0] = shardA.mesh.position.x;
              posArray[1] = shardA.mesh.position.y;
              posArray[2] = shardA.mesh.position.z;
              posArray[3] = shardB.mesh.position.x;
              posArray[4] = shardB.mesh.position.y;
              posArray[5] = shardB.mesh.position.z;
              positions.needsUpdate = true;
            }

            // Opacity based on distance and breath phase
            const distanceFactor = 1 - distance / CONNECTION_DISTANCE;
            const breathFactor = 0.5 + currentBreathPhase * 0.5;
            if (line.material instanceof THREE.Material) {
              line.material.opacity = distanceFactor * 0.12 * breathFactor;
            }

            line.visible = true;
            lineIndex++;
            connectionsForShard++;
          }
        }
      }
    }
  });

  return (
    <group name="Particle Swarm Container">
      {/* Ghost trails render behind main shards */}
      {enableTrails && <group ref={ghostGroupRef} name="Ghost Trails" renderOrder={-1} />}
      {/* Connection lines render behind everything */}
      {enableConnections && <group ref={linesGroupRef} name="Connection Lines" renderOrder={-2} />}
      {/* Main shards */}
      <group ref={groupRef} name="Particle Swarm" />
    </group>
  );
}

export default ParticleSwarm;
