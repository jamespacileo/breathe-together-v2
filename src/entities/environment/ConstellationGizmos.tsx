/**
 * ConstellationGizmos - Debug visualization for constellation stars.
 *
 * Shows individual star positions, constellation wireframe lines,
 * and constellation name labels. Styled to match ShapeGizmos patterns.
 *
 * PERFORMANCE OPTIMIZED:
 * - Uses InstancedMesh for star markers (2 draw calls vs 170)
 * - Batched constellation lines (1 draw call vs 70)
 * - Total: ~7 draw calls with celestial frame enabled
 *
 * Features:
 * - Instanced star markers with magnitude-based sizing
 * - Batched constellation lines for performance
 * - Constellation name labels at centroids
 * - Subtle celestial reference frame
 * - Real-time position updates via useFrame
 */

import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { RENDER_LAYERS } from '../../constants';
import { calculateGMST, celestialToCartesian } from '../../lib/astronomy';
import {
  CONSTELLATION_LINES,
  CONSTELLATIONS,
  magnitudeToBrightness,
  STARS,
  type Star,
} from '../../lib/constellationData';
import { CelestialFrameData } from './constellationGizmoTraits';

interface ConstellationGizmosProps {
  /** Celestial sphere radius @default 25 */
  radius?: number;
  /** Show individual star markers @default true */
  showStars?: boolean;
  /** Show star name labels @default false */
  showStarLabels?: boolean;
  /** Show constellation lines @default true */
  showLines?: boolean;
  /** Show constellation name labels @default true */
  showConstellationLabels?: boolean;
  /** Show celestial reference frame @default false */
  showCelestialFrame?: boolean;
  /** Line color @default '#00ff88' */
  lineColor?: string;
  /** Star marker color @default '#ff66ff' */
  starColor?: string;
}

/**
 * Calculate constellation centroid from star positions
 */
function calculateCentroid(
  starIds: string[],
  starMap: Map<string, Star>,
  radius: number,
  gmst: number,
): { centroid: THREE.Vector3; boundingRadius: number } {
  const positions: THREE.Vector3[] = [];

  for (const starId of starIds) {
    const star = starMap.get(starId);
    if (star) {
      const [x, y, z] = celestialToCartesian(star.ra, star.dec, radius, gmst);
      positions.push(new THREE.Vector3(x, y, z));
    }
  }

  if (positions.length === 0) {
    return { centroid: new THREE.Vector3(), boundingRadius: 0 };
  }

  // Calculate centroid
  const centroid = new THREE.Vector3();
  for (const pos of positions) {
    centroid.add(pos);
  }
  centroid.divideScalar(positions.length);

  // Calculate bounding radius
  let maxDist = 0;
  for (const pos of positions) {
    const dist = pos.distanceTo(centroid);
    if (dist > maxDist) maxDist = dist;
  }

  return { centroid, boundingRadius: maxDist };
}

/**
 * Instanced star markers - uses 2 draw calls for all stars (spheres + rings)
 * Replaces individual StarMarker components for massive performance gain
 */
const InstancedStarMarkers = memo(function InstancedStarMarkers({
  stars,
  color,
  radius,
  gmst,
}: {
  stars: Star[];
  color: string;
  radius: number;
  gmst: number;
}) {
  const sphereRef = useRef<THREE.InstancedMesh>(null);
  const ringRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Create shared geometries and materials
  const { sphereGeometry, sphereMaterial, ringGeometry, ringMaterial } = useMemo(() => {
    // Larger size for better visibility (was 0.08, now 0.25)
    const avgSize = 0.25;

    const sphereGeo = new THREE.SphereGeometry(avgSize, 12, 12);
    const sphereMat = new THREE.MeshBasicMaterial({
      color,
      // No transparency for crisp, solid markers
    });

    const ringGeo = new THREE.RingGeometry(avgSize * 1.8, avgSize * 2.2, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
    });

    return {
      sphereGeometry: sphereGeo,
      sphereMaterial: sphereMat,
      ringGeometry: ringGeo,
      ringMaterial: ringMat,
    };
  }, [color]);

  // Update instance matrices when positions change
  useEffect(() => {
    if (!sphereRef.current || !ringRef.current) return;

    for (let i = 0; i < stars.length; i++) {
      const star = stars[i];
      const [x, y, z] = celestialToCartesian(star.ra, star.dec, radius, gmst);

      // Scale based on magnitude (brighter stars = larger)
      const brightness = magnitudeToBrightness(star.magnitude);
      const scale = 0.5 + brightness * 1.5;

      dummy.position.set(x, y, z);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();

      sphereRef.current.setMatrixAt(i, dummy.matrix);

      // Ring needs different rotation
      dummy.rotation.set(Math.PI / 2, 0, 0);
      dummy.updateMatrix();
      ringRef.current.setMatrixAt(i, dummy.matrix);

      // Reset rotation for next iteration
      dummy.rotation.set(0, 0, 0);
    }

    sphereRef.current.instanceMatrix.needsUpdate = true;
    ringRef.current.instanceMatrix.needsUpdate = true;
  }, [stars, radius, gmst, dummy]);

  // Set GIZMOS layer on instanced meshes (excludes from DoF blur)
  useEffect(() => {
    if (sphereRef.current) {
      sphereRef.current.layers.set(RENDER_LAYERS.GIZMOS);
    }
    if (ringRef.current) {
      ringRef.current.layers.set(RENDER_LAYERS.GIZMOS);
    }
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      sphereGeometry.dispose();
      sphereMaterial.dispose();
      ringGeometry.dispose();
      ringMaterial.dispose();
    };
  }, [sphereGeometry, sphereMaterial, ringGeometry, ringMaterial]);

  return (
    <>
      <instancedMesh
        ref={sphereRef}
        args={[sphereGeometry, sphereMaterial, stars.length]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={ringRef}
        args={[ringGeometry, ringMaterial, stars.length]}
        frustumCulled={false}
      />
    </>
  );
});

/**
 * Star labels - HTML elements (no draw calls)
 * Separate from instanced rendering for optional label display
 */
const StarLabels = memo(function StarLabels({
  stars,
  color,
  radius,
  gmst,
}: {
  stars: Star[];
  color: string;
  radius: number;
  gmst: number;
}) {
  return (
    <>
      {stars.map((star) => {
        const [x, y, z] = celestialToCartesian(star.ra, star.dec, radius, gmst);
        const brightness = magnitudeToBrightness(star.magnitude);
        const size = 0.04 + brightness * 0.08;

        return (
          <Html key={star.id} position={[x, y + size * 4, z]} center>
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.75)',
                color: color,
                padding: '2px 4px',
                borderRadius: '3px',
                fontSize: '9px',
                fontFamily: 'monospace',
                whiteSpace: 'nowrap',
                border: `1px solid ${color}`,
                pointerEvents: 'none',
              }}
            >
              {star.name}
              <span style={{ color: '#888', marginLeft: '3px' }}>
                ({star.magnitude.toFixed(1)})
              </span>
            </div>
          </Html>
        );
      })}
    </>
  );
});

/**
 * Batched constellation lines - single draw call for all lines
 * Similar to BatchedConnectionLines from ShapeGizmos
 */
const BatchedConstellationLines = memo(function BatchedConstellationLines({
  lines,
  color,
}: {
  lines: Array<{ from: THREE.Vector3; to: THREE.Vector3; constellation: string }>;
  color: string;
}) {
  const linesRef = useRef<THREE.LineSegments>(null);

  // Create geometry with all line segments
  const { geometry, material } = useMemo(() => {
    const positions: number[] = [];

    for (const line of lines) {
      positions.push(line.from.x, line.from.y, line.from.z);
      positions.push(line.to.x, line.to.y, line.to.z);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    const mat = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.9,
      linewidth: 2, // Note: linewidth >1 only works with some renderers
    });

    return { geometry: geo, material: mat };
  }, [lines, color]);

  // Set GIZMOS layer (excludes from DoF blur)
  useEffect(() => {
    if (linesRef.current) {
      linesRef.current.layers.set(RENDER_LAYERS.GIZMOS);
    }
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  if (lines.length === 0) return null;

  return <lineSegments ref={linesRef} geometry={geometry} material={material} />;
});

/**
 * Constellation label at centroid - matches ShapeGizmos label style
 */
const ConstellationLabel = memo(function ConstellationLabel({
  position,
  name,
  latinName,
}: {
  position: THREE.Vector3;
  name: string;
  latinName: string;
}) {
  return (
    <Html position={position} center>
      <div
        style={{
          background: 'rgba(0, 0, 0, 0.75)',
          color: '#00ff88',
          padding: '3px 6px',
          borderRadius: '3px',
          fontSize: '10px',
          fontFamily: 'monospace',
          whiteSpace: 'nowrap',
          border: '1px solid rgba(0, 255, 136, 0.5)',
          pointerEvents: 'none',
        }}
      >
        <div style={{ fontWeight: 'bold' }}>{name}</div>
        <div style={{ fontSize: '8px', color: '#88ffaa', fontStyle: 'italic' }}>{latinName}</div>
      </div>
    </Html>
  );
});

/**
 * Main constellation gizmos component
 */
export const ConstellationGizmos = memo(function ConstellationGizmos({
  radius = 25,
  showStars = true,
  showStarLabels = false,
  showLines = true,
  showConstellationLabels = true,
  showCelestialFrame = false,
  lineColor = '#00ff88',
  starColor = '#ff66ff',
}: ConstellationGizmosProps) {
  const world = useWorld();
  const gmstRef = useRef(calculateGMST(new Date()));
  const groupRef = useRef<THREE.Group>(null);

  // Set GIZMOS layer on all meshes every frame to ensure exclusion from DoF blur
  // This catches any dynamically added children and ensures layers persist
  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.traverse((object) => {
      // Only set if not already on GIZMOS layer (avoid unnecessary updates)
      if (!object.layers.isEnabled(RENDER_LAYERS.GIZMOS)) {
        object.layers.set(RENDER_LAYERS.GIZMOS);
      }
    });
  });

  // Create star lookup map
  const starMap = useMemo(() => {
    const map = new Map<string, Star>();
    for (const star of STARS) {
      map.set(star.id, star);
    }
    return map;
  }, []);

  // Update GMST each frame
  useFrame(() => {
    const now = new Date();
    const newGmst = calculateGMST(now);
    gmstRef.current = newGmst;

    // Spawn/update Koota entities for fast state queries
    try {
      const frameEntity = world.queryFirst(CelestialFrameData);
      if (frameEntity) {
        frameEntity.set(CelestialFrameData, {
          gmst: newGmst,
          radius,
          lastUpdate: Date.now(),
        });
      }
    } catch {
      // Ignore ECS errors during hot-reload
    }
  });

  // Calculate current GMST for rendering
  const currentGmst = gmstRef.current;

  // Get line segments for current frame
  const renderedLines = useMemo(() => {
    return CONSTELLATION_LINES.map((line) => {
      const fromStar = starMap.get(line.from);
      const toStar = starMap.get(line.to);
      if (!fromStar || !toStar) return null;

      const [fx, fy, fz] = celestialToCartesian(fromStar.ra, fromStar.dec, radius, currentGmst);
      const [tx, ty, tz] = celestialToCartesian(toStar.ra, toStar.dec, radius, currentGmst);

      return {
        constellation: line.constellation,
        from: new THREE.Vector3(fx, fy, fz),
        to: new THREE.Vector3(tx, ty, tz),
      };
    }).filter(Boolean) as { constellation: string; from: THREE.Vector3; to: THREE.Vector3 }[];
  }, [radius, currentGmst, starMap]);

  // Get constellation centroids for current frame
  const renderedConstellations = useMemo(() => {
    return CONSTELLATIONS.map((constellation) => {
      const result = calculateCentroid(constellation.stars, starMap, radius, currentGmst);
      return {
        ...constellation,
        ...result,
      };
    });
  }, [radius, currentGmst, starMap]);

  return (
    <group ref={groupRef} name="Constellation Gizmos">
      {/* Celestial reference frame - subtle */}
      {showCelestialFrame && (
        <>
          {/* Celestial sphere wireframe - very subtle */}
          <mesh>
            <sphereGeometry args={[radius, 24, 24]} />
            <meshBasicMaterial
              color="#00ff88"
              wireframe
              transparent
              opacity={0.08}
              depthWrite={false}
            />
          </mesh>

          {/* Equatorial plane - subtle ring */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[radius * 0.99, radius * 1.01, 64]} />
            <meshBasicMaterial
              color="#ffaa00"
              transparent
              opacity={0.25}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>

          {/* North celestial pole - small marker */}
          <group position={[0, radius, 0]}>
            <mesh>
              <sphereGeometry args={[0.3, 8, 8]} />
              <meshBasicMaterial color="#00ffff" transparent opacity={0.8} depthWrite={false} />
            </mesh>
            <Html position={[0, 0.6, 0]} center>
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.75)',
                  color: '#00ffff',
                  padding: '2px 4px',
                  borderRadius: '2px',
                  fontSize: '9px',
                  fontFamily: 'monospace',
                  fontWeight: 'bold',
                  pointerEvents: 'none',
                }}
              >
                NCP
              </div>
            </Html>
          </group>

          {/* South celestial pole - small marker */}
          <group position={[0, -radius, 0]}>
            <mesh>
              <sphereGeometry args={[0.3, 8, 8]} />
              <meshBasicMaterial color="#ff00ff" transparent opacity={0.8} depthWrite={false} />
            </mesh>
            <Html position={[0, -0.6, 0]} center>
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.75)',
                  color: '#ff00ff',
                  padding: '2px 4px',
                  borderRadius: '2px',
                  fontSize: '9px',
                  fontFamily: 'monospace',
                  fontWeight: 'bold',
                  pointerEvents: 'none',
                }}
              >
                SCP
              </div>
            </Html>
          </group>
        </>
      )}

      {/* Instanced star markers - 2 draw calls for all stars */}
      {showStars && (
        <InstancedStarMarkers stars={STARS} color={starColor} radius={radius} gmst={currentGmst} />
      )}

      {/* Star labels (HTML, no draw calls) - optional */}
      {showStars && showStarLabels && (
        <StarLabels stars={STARS} color={starColor} radius={radius} gmst={currentGmst} />
      )}

      {/* Batched constellation lines - single draw call */}
      {showLines && <BatchedConstellationLines lines={renderedLines} color={lineColor} />}

      {/* Constellation name labels */}
      {showConstellationLabels &&
        renderedConstellations.map((constellation) => (
          <ConstellationLabel
            key={constellation.id}
            position={constellation.centroid}
            name={constellation.name}
            latinName={constellation.latinName}
          />
        ))}
    </group>
  );
});
