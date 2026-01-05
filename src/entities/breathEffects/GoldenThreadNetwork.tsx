/**
 * GoldenThreadNetwork - Fine golden lines connecting particle shards
 *
 * Creates a visible network of connections between all breathing participants,
 * symbolizing the interconnected nature of collective meditation.
 *
 * Features:
 * - Lines connect nearby particles (based on distance threshold)
 * - Lines pulse/glow brighter during hold phases
 * - Golden color with warm undertones
 * - Opacity based on distance (closer = more visible)
 * - Subtle animation for organic feel
 *
 * Performance note: Uses a proximity-based connection system that limits
 * connections per particle to avoid O(n²) complexity.
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { breathPhase, phaseType } from '../breath/traits';

export interface GoldenThreadNetworkProps {
  /** Maximum number of nodes in the network @default 80 */
  maxNodes?: number;
  /** Maximum distance for connection @default 3.0 */
  connectionDistance?: number;
  /** Maximum connections per node @default 4 */
  maxConnectionsPerNode?: number;
  /** Distribution radius @default 4.5 */
  radius?: number;
  /** Line opacity @default 0.4 */
  opacity?: number;
  /** Thread color @default '#c9a06c' */
  color?: string;
  /** Glow color during hold phases @default '#ffd700' */
  glowColor?: string;
  /** Enable component @default true */
  enabled?: boolean;
}

/**
 * Calculate Fibonacci sphere point for even distribution
 */
function getFibonacciSpherePoint(index: number, total: number): THREE.Vector3 {
  if (total <= 1) {
    return new THREE.Vector3(0, 1, 0);
  }

  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const y = 1 - (index / (total - 1)) * 2;
  const radiusAtY = Math.sqrt(1 - y * y);
  const theta = goldenAngle * index;

  return new THREE.Vector3(Math.cos(theta) * radiusAtY, y, Math.sin(theta) * radiusAtY);
}

// Pre-allocated vectors
const _tempVec = new THREE.Vector3();
const _yAxis = new THREE.Vector3(0, 1, 0);

/**
 * Per-node state
 */
interface NodeState {
  /** Base direction from Fibonacci distribution */
  direction: THREE.Vector3;
  /** Current animated position */
  position: THREE.Vector3;
  /** Orbital drift angle */
  orbitAngle: number;
  /** Per-node orbit speed */
  orbitSpeed: number;
  /** Ambient motion seed */
  seed: number;
}

/**
 * Connection between two nodes
 */
interface Connection {
  nodeA: number;
  nodeB: number;
}

export const GoldenThreadNetwork = memo(function GoldenThreadNetwork({
  maxNodes = 80,
  connectionDistance = 3.0,
  maxConnectionsPerNode = 4,
  radius = 4.5,
  opacity = 0.4,
  color = '#c9a06c',
  glowColor = '#ffd700',
  enabled = true,
}: GoldenThreadNetworkProps) {
  const world = useWorld();
  const linesRef = useRef<THREE.LineSegments>(null);

  // Initialize node states
  const nodeStates = useMemo(() => {
    const states: NodeState[] = [];
    for (let i = 0; i < maxNodes; i++) {
      const direction = getFibonacciSpherePoint(i, maxNodes);
      states.push({
        direction: direction.clone(),
        position: direction.clone().multiplyScalar(radius),
        orbitAngle: 0,
        orbitSpeed: 0.01 + Math.random() * 0.015,
        seed: Math.random() * 100,
      });
    }
    return states;
  }, [maxNodes, radius]);

  // Build initial connection list based on proximity
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Graph connection algorithm requires nested loops with multiple early-exit conditions
  const connections = useMemo(() => {
    const conns: Connection[] = [];
    const connectionCounts = new Array(maxNodes).fill(0);

    // For each node, find nearby nodes to connect
    for (let i = 0; i < maxNodes; i++) {
      if (connectionCounts[i] >= maxConnectionsPerNode) continue;

      const posA = nodeStates[i].position;

      // Check potential connections (only forward to avoid duplicates)
      for (let j = i + 1; j < maxNodes; j++) {
        if (connectionCounts[j] >= maxConnectionsPerNode) continue;

        const posB = nodeStates[j].position;
        const dist = posA.distanceTo(posB);

        if (dist < connectionDistance) {
          conns.push({ nodeA: i, nodeB: j });
          connectionCounts[i]++;
          connectionCounts[j]++;

          if (connectionCounts[i] >= maxConnectionsPerNode) break;
        }
      }
    }

    return conns;
  }, [maxNodes, maxConnectionsPerNode, connectionDistance, nodeStates]);

  // Create geometry for line segments
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    // Each connection needs 2 vertices (6 floats)
    const positions = new Float32Array(connections.length * 6);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [connections.length]);

  // Parse colors
  const baseColor = useMemo(() => new THREE.Color(color), [color]);
  const holdGlowColor = useMemo(() => new THREE.Color(glowColor), [glowColor]);

  // Create material
  const material = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: baseColor,
      transparent: true,
      opacity: 0,
      linewidth: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, [baseColor]);

  // Cleanup
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  // Animation
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Animation loop requires multiple node position updates and connection line calculations
  useFrame((state, delta) => {
    if (!enabled || !linesRef.current) return;

    const clampedDelta = Math.min(delta, 0.1);
    const time = state.clock.elapsedTime;

    // Get breath state from ECS
    let currentBreathPhase = 0.5;
    let currentPhaseType = 0;
    const breathEntity = world.queryFirst(breathPhase, phaseType);
    if (breathEntity) {
      try {
        currentBreathPhase = breathEntity.get(breathPhase)?.value ?? 0.5;
        currentPhaseType = breathEntity.get(phaseType)?.value ?? 0;
      } catch (_e) {
        // Silently catch ECS errors during unmount/remount
      }
    }

    // Threads glow brighter during hold phases (symbolizing stillness/presence)
    const isHold = currentPhaseType === 1 || currentPhaseType === 3;
    const holdGlow = isHold ? 1.5 : 1.0;

    // Update material color (interpolate toward glow during holds)
    const targetColor = isHold ? holdGlowColor : baseColor;
    material.color.lerp(targetColor, 0.1);

    // Calculate breath-based radius modulation
    // Threads follow the same expansion/contraction as particles
    const radiusModulation = 2.5 + (1 - currentBreathPhase) * 3.5; // 2.5 (inhale) to 6.0 (exhale)

    // Update node positions
    for (let i = 0; i < maxNodes; i++) {
      const nodeState = nodeStates[i];

      // Update orbital drift
      nodeState.orbitAngle += nodeState.orbitSpeed * clampedDelta;

      // Apply orbit to direction
      _tempVec.copy(nodeState.direction);
      _tempVec.applyAxisAngle(_yAxis, nodeState.orbitAngle);

      // Add subtle ambient motion
      const ambientX = Math.sin(time * 0.3 + nodeState.seed) * 0.1;
      const ambientY = Math.sin(time * 0.25 + nodeState.seed * 0.7) * 0.05;
      const ambientZ = Math.cos(time * 0.28 + nodeState.seed * 1.3) * 0.1;

      // Calculate position
      nodeState.position.copy(_tempVec).multiplyScalar(radiusModulation);
      nodeState.position.x += ambientX;
      nodeState.position.y += ambientY;
      nodeState.position.z += ambientZ;
    }

    // Update line segment positions
    const positions = geometry.attributes.position.array as Float32Array;
    let maxDistance = 0;

    for (let i = 0; i < connections.length; i++) {
      const conn = connections[i];
      const posA = nodeStates[conn.nodeA].position;
      const posB = nodeStates[conn.nodeB].position;

      positions[i * 6] = posA.x;
      positions[i * 6 + 1] = posA.y;
      positions[i * 6 + 2] = posA.z;
      positions[i * 6 + 3] = posB.x;
      positions[i * 6 + 4] = posB.y;
      positions[i * 6 + 5] = posB.z;

      const dist = posA.distanceTo(posB);
      if (dist > maxDistance) maxDistance = dist;
    }

    geometry.attributes.position.needsUpdate = true;

    // Update opacity based on breath phase and hold state
    // Threads are more visible during hold phases
    const breathOpacity = 0.6 + currentBreathPhase * 0.4; // Brighter when inhaled
    material.opacity = opacity * breathOpacity * holdGlow;
  });

  if (!enabled) return null;

  return (
    <lineSegments
      ref={linesRef}
      geometry={geometry}
      material={material}
      name="Golden Thread Network"
    />
  );
});

export default GoldenThreadNetwork;
