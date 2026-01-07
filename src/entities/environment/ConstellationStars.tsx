/**
 * ConstellationStars - Real constellation rendering using TSL
 *
 * Uses WebGPU-compatible TSL nodes for renderer-agnostic code.
 */

import { Line } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  abs,
  add,
  atan,
  attribute,
  cos,
  distance,
  dot,
  float,
  fract,
  length,
  max,
  mix,
  modelViewMatrix,
  modelWorldMatrix,
  mul,
  normalize,
  pointUV,
  pow,
  sin,
  smoothstep,
  sub,
  uniform,
  varying,
  vec2,
  vec3,
  vec4,
  viewportCoordinate,
} from 'three/tsl';
import { PointsNodeMaterial } from 'three/webgpu';

import { RENDER_LAYERS } from '../../constants';
import { calculateGMST, celestialToCartesian } from '../../lib/astronomy';
import {
  CONSTELLATION_LINES,
  magnitudeToBrightness,
  magnitudeToSize,
  STARS,
} from '../../lib/constellationData';
import { isUiEventTarget } from '../../lib/sceneInput';

export interface ConstellationStarsProps {
  enabled?: boolean;
  showLines?: boolean;
  radius?: number;
  starSize?: number;
  starColor?: string;
  lineColor?: string;
  lineOpacity?: number;
  lineWidth?: number;
  twinkle?: boolean;
  twinkleSpeed?: number;
  opacity?: number;
}

interface StarPoint {
  id: string;
  position: THREE.Vector3;
  brightness: number;
  size: number;
  baseOpacity: number;
}

interface LineSeg {
  start: THREE.Vector3;
  end: THREE.Vector3;
  constellation: string;
}

export const ConstellationStars = memo(function ConstellationStars({
  enabled = true,
  showLines = true,
  radius = 25,
  starSize = 2.0,
  starColor = '#ffc940',
  lineColor = '#ffb830',
  lineOpacity = 0.3,
  lineWidth = 2.4,
  twinkle = true,
  twinkleSpeed = 1,
  opacity = 1.0,
}: ConstellationStarsProps) {
  const groupRef = useRef<THREE.Group>(null);
  const starsRef = useRef<THREE.Points>(null);
  const gmstRef = useRef(calculateGMST(new Date()));
  const mouseRef = useRef(new THREE.Vector2(999, 999));
  const { gl, events } = useThree();
  const eventSource = (events.connected || gl.domElement) as HTMLElement;

  // Set layers on mount
  useEffect(() => {
    if (starsRef.current) {
      (starsRef.current as THREE.Object3D).layers.set(RENDER_LAYERS.EFFECTS);
    }
  }, []);

  // Mouse handling
  useEffect(() => {
    if (!eventSource) return;

    const updateMouse = (event: PointerEvent) => {
      if (isUiEventTarget(event.target)) {
        mouseRef.current.set(999, 999);
        return;
      }
      const rect = eventSource.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      mouseRef.current.set(x, y);
    };

    const clearMouse = () => {
      mouseRef.current.set(999, 999);
    };

    eventSource.addEventListener('pointermove', updateMouse);
    eventSource.addEventListener('pointerdown', updateMouse);
    eventSource.addEventListener('pointerleave', clearMouse);

    return () => {
      eventSource.removeEventListener('pointermove', updateMouse);
      eventSource.removeEventListener('pointerdown', updateMouse);
      eventSource.removeEventListener('pointerleave', clearMouse);
    };
  }, [eventSource]);

  // Calculate stars
  const { lineSegments, positions, sizes, colors } = useMemo(() => {
    const gmst = calculateGMST(new Date());
    gmstRef.current = gmst;

    const starPointsArr: StarPoint[] = [];
    const lineSegsArr: LineSeg[] = [];
    const starMap = new Map<string, THREE.Vector3>();

    for (const star of STARS) {
      const [x, y, z] = celestialToCartesian(star.ra, star.dec, radius, gmst);
      const pos = new THREE.Vector3(x, y, z);
      starMap.set(star.id, pos);
      const brightness = magnitudeToBrightness(star.magnitude);
      const size = magnitudeToSize(star.magnitude, starSize);
      starPointsArr.push({
        id: star.id,
        position: pos,
        brightness,
        size,
        baseOpacity: brightness * opacity,
      });
    }

    for (const line of CONSTELLATION_LINES) {
      const startPos = starMap.get(line.from);
      const endPos = starMap.get(line.to);
      if (startPos && endPos) {
        lineSegsArr.push({ start: startPos, end: endPos, constellation: line.constellation });
      }
    }

    const posArr = new Float32Array(starPointsArr.length * 3);
    const sizeArr = new Float32Array(starPointsArr.length);
    const colorArr = new Float32Array(starPointsArr.length * 3);
    const baseColor = new THREE.Color(starColor);

    for (let i = 0; i < starPointsArr.length; i++) {
      const sp = starPointsArr[i];
      const i3 = i * 3;
      posArr[i3] = sp.position.x;
      posArr[i3 + 1] = sp.position.y;
      posArr[i3 + 2] = sp.position.z;
      sizeArr[i] = sp.size;
      const warmth = sp.brightness * 0.25;
      colorArr[i3] = Math.min(1, baseColor.r + warmth * 0.2);
      colorArr[i3 + 1] = Math.min(1, baseColor.g + warmth * 0.12);
      colorArr[i3 + 2] = Math.min(1, baseColor.b + warmth * 0.05);
    }

    return {
      starPoints: starPointsArr,
      lineSegments: lineSegsArr,
      positions: posArr,
      sizes: sizeArr,
      colors: colorArr,
    };
  }, [radius, starSize, starColor, opacity]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [positions, sizes, colors]);

  const material = useMemo(() => {
    // Uniforms
    const uTime = uniform(float(0));
    const uOpacity = uniform(float(opacity));
    const uTwinkleEnabled = uniform(float(twinkle ? 1.0 : 0.0));
    const uMouse = uniform(vec2(999, 999));
    const uHoverStrength = uniform(float(1.8));
    const uHoverRadius = uniform(float(0.7));
    const uEdgeGlowStrength = uniform(float(0.9));
    const uEdgeStart = uniform(float(0.5));

    // Attributes
    const aSize = attribute('size', 'float');
    const aColor = attribute('color', 'vec3');

    // ═══════════════════════════════════════════════════════════════
    // Vertex Logic
    // ═══════════════════════════════════════════════════════════════
    const positionLocal = attribute('position', 'vec3');
    const mvPosition = mul(modelViewMatrix, vec4(positionLocal, 1.0));
    // Calculate point size
    // gl_PointSize = size * (220.0 / -mvPosition.z)
    // gl_PointSize = max(gl_PointSize, 3.5)
    const projectedSize = mul(
      aSize,
      mul(float(220.0), pow(sub(float(0), mvPosition.z), float(-1.0))),
    );
    const finalPointSize = max(projectedSize, float(3.5));

    // Pass data to fragment
    // In TSL we construct the pipeline, so these are implicitly available or passed via varyings if needed explicitly
    // Since we are in the same node builder context, we can just use the inputs in fragment logic?
    // Actually for PointsNodeMaterial, the fragment context is separate. We need varyings.
    const vColor = varying(aColor);
    const vSize = varying(aSize);
    const vViewPosition = varying(mul(mvPosition, float(-1.0)).xyz); // -mvPosition.xyz
    // World position needed for view dependency
    const vWorldPosition = varying(mul(modelWorldMatrix, vec4(positionLocal, 1.0)).xyz);

    // Screen position for edge/hover effects
    // vScreenPos = clipPosition.xy / clipPosition.w;
    // We can't access clipPosition directly in TSL vertex easily without custom nodes,
    // but TSL provides `viewportCoordinate` in fragment which maps to 0..1 screen space.
    // Let's use `screenUV` or similar.

    // ═══════════════════════════════════════════════════════════════
    // Fragment Logic
    // ═══════════════════════════════════════════════════════════════
    // Point coord
    const center = sub(pointUV, float(0.5));
    const dist = length(center);

    // Star shape
    const angle = atan(center.y, center.x);
    const spike = add(abs(sin(mul(angle, float(2.0)))), abs(cos(mul(angle, float(2.0))))); // * 0.35
    const spikeScaled = mul(spike, float(0.35));
    // float starFlare = pow(spike, 2.5) * (1.0 - smoothstep(0.0, 0.5, dist));
    const starFlare = mul(
      pow(spikeScaled, float(2.5)),
      sub(float(1.0), smoothstep(float(0.0), float(0.5), dist)),
    );

    const core = smoothstep(float(0.6), float(0.0), dist);
    const innerGlow = smoothstep(float(0.7), float(0.0), dist);
    const outerGlow = smoothstep(float(0.9), float(0.0), dist);
    const softHalo = smoothstep(float(1.0), float(0.0), dist);

    // brightness = core * 1.8 + starFlare * 1.2 + innerGlow * 1.0 + outerGlow * 0.6 + softHalo * 0.3
    const brightness = add(
      add(mul(core, float(1.8)), mul(starFlare, float(1.2))),
      add(mul(innerGlow, float(1.0)), add(mul(outerGlow, float(0.6)), mul(softHalo, float(0.3)))),
    );

    // Base alpha
    let alpha = mul(brightness, uOpacity);
    let brightMult = brightness;

    // Twinkling logic
    // vec3 viewDir = normalize(vViewPosition);
    // vec3 starDir = normalize(vWorldPosition);
    // float viewAngle = dot(viewDir, starDir);
    const viewDir = normalize(vViewPosition);
    const starDir = normalize(vWorldPosition);
    const viewAngle = dot(viewDir, starDir);

    // if (twinkleEnabled > 0.5) ...
    // In TSL, we use math branchless or mix.
    // timeTwinkle = sin(time * 1.5 + vSize * 100.0) * 0.08 + 0.92
    const timeTwinkle = add(
      mul(sin(add(mul(uTime, float(1.5)), mul(vSize, float(100.0)))), float(0.08)),
      float(0.92),
    );

    // View twinkle
    // float viewHash = fract(sin(dot(vWorldPosition.xy, vec2(12.9898, 78.233))) * 43758.5453);
    const viewHash = fract(
      mul(sin(dot(vWorldPosition.xy, vec2(12.9898, 78.233))), float(43758.5453)),
    );
    // float viewTwinkle = sin(viewAngle * 6.28 + time * 0.5 + viewHash * 6.28) * 0.15 + 0.85;
    const viewTwinkle = add(
      mul(
        sin(
          add(add(mul(viewAngle, float(6.28)), mul(uTime, float(0.5))), mul(viewHash, float(6.28))),
        ),
        float(0.15),
      ),
      float(0.85),
    );

    const totalTwinkle = mul(timeTwinkle, viewTwinkle);

    // Apply twinkle if enabled
    const factor = mix(float(1.0), totalTwinkle, uTwinkleEnabled);
    alpha = mul(alpha, factor);
    brightMult = mul(brightMult, factor);

    // Edge/Hover glow
    // TSL has `viewportCoordinate` (0..1).
    const screenCenterRel = sub(mul(viewportCoordinate.xy, float(2.0)), float(1.0));

    const edge = max(abs(screenCenterRel.x), abs(screenCenterRel.y));
    const edgeGlow = smoothstep(uEdgeStart, float(1.0), edge);

    // Hover
    // float hoverDist = distance(vScreenPos, mouse);
    const hoverDist = distance(screenCenterRel, uMouse);
    const hoverGlow = smoothstep(uHoverRadius, float(0.0), hoverDist);

    const glowBoost = add(mul(edgeGlow, uEdgeGlowStrength), mul(hoverGlow, uHoverStrength));
    const alphaBoost = add(float(1.0), mul(glowBoost, float(0.6)));
    alpha = mul(alpha, alphaBoost);

    // Color
    const warmGlow = vec3(1.0, 0.78, 0.3);
    const coreColor = vec3(1.0, 0.96, 0.75);

    // Soft color gradient
    const finalColorMix = mix(coreColor, warmGlow, smoothstep(float(0.0), float(0.7), dist));
    // finalColor *= (1.15 + brightness * 0.4)
    let finalColor = mul(finalColorMix, add(float(1.15), mul(brightMult, float(0.4))));
    // finalColor += warmGlow * (softHalo * 1.0 + glowBoost * 1.5)
    finalColor = add(
      finalColor,
      mul(warmGlow, add(mul(softHalo, float(1.0)), mul(glowBoost, float(1.5)))),
    );

    // Apply per-star color tint from the geometry attribute.
    finalColor = mul(finalColor, vColor);

    const mat = new PointsNodeMaterial();
    mat.colorNode = finalColor;
    mat.opacityNode = alpha;
    mat.sizeNode = finalPointSize;
    mat.transparent = true;
    mat.depthWrite = false;
    mat.blending = THREE.AdditiveBlending;
    // mat.toneMapped = false; // Property exists on base Material

    mat.userData = {
      uTime,
      uOpacity,
      uTwinkleEnabled,
      uMouse,
    };

    return mat;
  }, [opacity, twinkle]);

  // Update logic similar to GLSL
  useFrame((state) => {
    if (material.userData.uTime)
      material.userData.uTime.value = state.clock.elapsedTime * twinkleSpeed;
    if (material.userData.uMouse) material.userData.uMouse.value.copy(mouseRef.current);
    if (groupRef.current) {
      const now = new Date();
      const newGmst = calculateGMST(now);
      const deltaGmst = newGmst - gmstRef.current;
      groupRef.current.rotation.y = -deltaGmst;
    }
  });

  if (!enabled) return null;

  return (
    <group ref={groupRef}>
      <points ref={starsRef} geometry={geometry} material={material} frustumCulled={false} />
      {showLines &&
        lineSegments.map((seg, idx) => (
          <group key={`${seg.constellation}-${idx}`}>
            <Line
              points={[seg.start, seg.end]}
              color={lineColor}
              lineWidth={lineWidth * 1.8}
              transparent
              toneMapped={false}
              blending={THREE.AdditiveBlending}
              opacity={lineOpacity * 0.35}
            />
            <Line
              points={[seg.start, seg.end]}
              color={lineColor}
              lineWidth={lineWidth}
              transparent
              toneMapped={false}
              blending={THREE.AdditiveBlending}
              opacity={lineOpacity}
            />
          </group>
        ))}
    </group>
  );
});
