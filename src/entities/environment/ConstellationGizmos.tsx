/**
 * ConstellationGizmos - Debug visualization for constellation stars.
 *
 * Shows individual star positions, constellation wireframe lines,
 * and constellation name labels. Styled to match ShapeGizmos patterns.
 *
 * Features:
 * - Small star markers with magnitude-based sizing (like CentroidMarker)
 * - Batched constellation lines for performance (like BatchedConnectionLines)
 * - Constellation name labels at centroids
 * - Subtle celestial reference frame
 * - Real-time position updates via useFrame
 */

import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

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
 * Small star marker - matches CentroidMarker style from ShapeGizmos
 * Small sphere with ring indicator
 */
const StarMarker = memo(function StarMarker({
  position,
  name,
  magnitude,
  showLabel,
  color,
}: {
  position: THREE.Vector3;
  name: string;
  magnitude: number;
  showLabel: boolean;
  color: string;
}) {
  const brightness = magnitudeToBrightness(magnitude);
  // Small sizes like CentroidMarker (0.04 to 0.12 based on brightness)
  const size = 0.04 + brightness * 0.08;

  return (
    <group position={position}>
      {/* Star marker sphere - small like CentroidMarker */}
      <mesh>
        <sphereGeometry args={[size, 8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} depthWrite={false} />
      </mesh>

      {/* Ring indicator around star */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[size * 1.5, size * 2, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Star name label - matching ShapeGizmos label style */}
      {showLabel && (
        <Html position={[0, size * 4, 0]} center>
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
            {name}
            <span style={{ color: '#888', marginLeft: '3px' }}>({magnitude.toFixed(1)})</span>
          </div>
        </Html>
      )}
    </group>
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
      opacity: 0.6,
      linewidth: 1,
    });

    return { geometry: geo, material: mat };
  }, [lines, color]);

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

  // Create star lookup map
  const starMap = useMemo(() => {
    const map = new Map<string, Star>();
    for (const star of STARS) {
      map.set(star.id, star);
    }
    return map;
  }, []);

  // Calculate initial star positions
  const starPositions = useRef<Map<string, THREE.Vector3>>(new Map());

  // Calculate constellation centroids
  const constellationCentroids = useRef<
    Map<string, { centroid: THREE.Vector3; boundingRadius: number }>
  >(new Map());

  // Update positions each frame
  useFrame(() => {
    const now = new Date();
    const newGmst = calculateGMST(now);
    gmstRef.current = newGmst;

    // Update star positions
    for (const star of STARS) {
      const [x, y, z] = celestialToCartesian(star.ra, star.dec, radius, newGmst);
      let pos = starPositions.current.get(star.id);
      if (!pos) {
        pos = new THREE.Vector3();
        starPositions.current.set(star.id, pos);
      }
      pos.set(x, y, z);
    }

    // Update constellation centroids
    for (const constellation of CONSTELLATIONS) {
      const result = calculateCentroid(constellation.stars, starMap, radius, newGmst);
      constellationCentroids.current.set(constellation.id, result);
    }

    // Spawn/update Koota entities for fast state queries
    try {
      // Update celestial frame entity
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

  // Calculate current positions for rendering
  const currentGmst = gmstRef.current;

  // Get star positions for current frame
  const renderedStars = useMemo(() => {
    return STARS.map((star) => {
      const [x, y, z] = celestialToCartesian(star.ra, star.dec, radius, currentGmst);
      return {
        ...star,
        position: new THREE.Vector3(x, y, z),
      };
    });
  }, [radius, currentGmst]);

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
    <group name="Constellation Gizmos">
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

      {/* Star markers - small like CentroidMarker */}
      {showStars &&
        renderedStars.map((star) => (
          <StarMarker
            key={star.id}
            position={star.position}
            name={star.name}
            magnitude={star.magnitude}
            showLabel={showStarLabels}
            color={starColor}
          />
        ))}

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
