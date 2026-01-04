/**
 * FloatingSymbols - Orbiting meditation icons
 *
 * Features:
 * - Minimalist geometric symbols (lotus, Om, circles, triangles)
 * - Slow orbit around the atmosphere
 * - Fade in/out with breathing cycle
 * - Subtle rotation on local axis
 *
 * Uses Three.js sprites with canvas-drawn symbols
 */

import { useFrame } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { breathPhase } from '../breath/traits';

export interface FloatingSymbolsProps {
  /**
   * Number of floating symbols
   * @default 6
   * @min 3
   * @max 12
   */
  count?: number;

  /**
   * Orbit radius
   * @default 6
   * @min 4
   * @max 10
   */
  radius?: number;

  /**
   * Symbol size
   * @default 0.4
   * @min 0.2
   * @max 1
   */
  size?: number;

  /**
   * Base opacity
   * @default 0.3
   * @min 0
   * @max 0.6
   */
  opacity?: number;

  /**
   * Orbit speed (radians per second)
   * @default 0.1
   * @min 0.01
   * @max 0.3
   */
  orbitSpeed?: number;

  /**
   * Symbol color
   * @default '#ffffff'
   */
  color?: string;

  /**
   * Enable floating symbols
   * @default true
   */
  enabled?: boolean;
}

type SymbolType = 'circle' | 'triangle' | 'lotus' | 'infinity' | 'wave' | 'diamond';

interface SymbolConfig {
  id: string;
  type: SymbolType;
  orbitOffset: number;
  heightOffset: number;
  phaseOffset: number;
  rotationSpeed: number;
}

/**
 * Draw a symbol on a canvas and return as texture
 */
function createSymbolTexture(type: SymbolType, color: string): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.clearRect(0, 0, size, size);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const center = size / 2;
  const radius = size * 0.35;

  switch (type) {
    case 'circle':
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.stroke();
      // Inner dot
      ctx.beginPath();
      ctx.arc(center, center, 5, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'triangle':
      ctx.beginPath();
      ctx.moveTo(center, center - radius);
      ctx.lineTo(center - radius * 0.866, center + radius * 0.5);
      ctx.lineTo(center + radius * 0.866, center + radius * 0.5);
      ctx.closePath();
      ctx.stroke();
      break;

    case 'lotus':
      // Simplified lotus petals
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI - Math.PI / 2;
        const x = center + Math.cos(angle) * radius * 0.3;
        const y = center + Math.sin(angle) * radius * 0.3;
        ctx.beginPath();
        ctx.ellipse(
          x + Math.cos(angle) * radius * 0.3,
          y + Math.sin(angle) * radius * 0.3,
          radius * 0.4,
          radius * 0.2,
          angle,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
      }
      break;

    case 'infinity':
      ctx.beginPath();
      // Left loop
      ctx.arc(center - radius * 0.4, center, radius * 0.35, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      // Right loop
      ctx.arc(center + radius * 0.4, center, radius * 0.35, 0, Math.PI * 2);
      ctx.stroke();
      break;

    case 'wave':
      ctx.beginPath();
      ctx.moveTo(center - radius, center);
      for (let x = -radius; x <= radius; x += 2) {
        const y = Math.sin((x / radius) * Math.PI * 2) * radius * 0.3;
        ctx.lineTo(center + x, center + y);
      }
      ctx.stroke();
      break;

    case 'diamond':
      ctx.beginPath();
      ctx.moveTo(center, center - radius);
      ctx.lineTo(center + radius * 0.6, center);
      ctx.lineTo(center, center + radius);
      ctx.lineTo(center - radius * 0.6, center);
      ctx.closePath();
      ctx.stroke();
      break;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

const SYMBOL_TYPES: SymbolType[] = ['circle', 'triangle', 'lotus', 'infinity', 'wave', 'diamond'];

const FloatingSymbol = memo(function FloatingSymbol({
  config,
  radius,
  size,
  baseOpacity,
  color,
}: {
  config: SymbolConfig;
  radius: number;
  size: number;
  baseOpacity: number;
  color: string;
}) {
  const spriteRef = useRef<THREE.Sprite>(null);
  const world = useWorld();
  const timeRef = useRef(config.phaseOffset * 10);

  // Create texture for this symbol
  const texture = useMemo(() => createSymbolTexture(config.type, color), [config.type, color]);

  const material = useMemo(() => {
    return new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: baseOpacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, [texture, baseOpacity]);

  useFrame((_state, delta) => {
    if (!spriteRef.current) return;

    timeRef.current += delta;

    // Orbit around Y axis
    const orbitAngle = timeRef.current * 0.1 + config.orbitOffset;
    const x = Math.cos(orbitAngle) * radius;
    const z = Math.sin(orbitAngle) * radius;

    // Gentle vertical bobbing
    const y = config.heightOffset + Math.sin(timeRef.current * 0.3 + config.phaseOffset) * 0.5;

    spriteRef.current.position.set(x, y, z);

    // Breathing opacity
    const breathEntity = world.queryFirst(breathPhase);
    if (breathEntity && spriteRef.current.material) {
      const phase = breathEntity.get(breathPhase)?.value ?? 0;
      // Symbols fade in during inhale, fade out during exhale
      const breathOpacity = 0.5 + phase * 0.5;
      (spriteRef.current.material as THREE.SpriteMaterial).opacity = baseOpacity * breathOpacity;
    }

    // Local rotation (sprites don't rotate, but we can scale for pulse effect)
    const pulse = 1 + Math.sin(timeRef.current * config.rotationSpeed) * 0.1;
    spriteRef.current.scale.setScalar(size * pulse);
  });

  // Cleanup
  useEffect(() => {
    return () => {
      texture.dispose();
      material.dispose();
    };
  }, [texture, material]);

  return <sprite ref={spriteRef} material={material} scale={[size, size, 1]} />;
});

/**
 * FloatingSymbols - Orbiting meditation icons
 */
export const FloatingSymbols = memo(function FloatingSymbols({
  count = 6,
  radius = 6,
  size = 0.4,
  opacity = 0.3,
  orbitSpeed: _orbitSpeed = 0.1,
  color = '#ffffff',
  enabled = true,
}: FloatingSymbolsProps) {
  // Generate symbol configurations
  const configs = useMemo(() => {
    const result: SymbolConfig[] = [];
    for (let i = 0; i < count; i++) {
      result.push({
        id: `symbol-${i}`,
        type: SYMBOL_TYPES[i % SYMBOL_TYPES.length],
        orbitOffset: (i / count) * Math.PI * 2,
        heightOffset: (Math.random() - 0.5) * 4,
        phaseOffset: Math.random() * Math.PI * 2,
        rotationSpeed: 0.5 + Math.random() * 0.5,
      });
    }
    return result;
  }, [count]);

  if (!enabled) return null;

  return (
    <group>
      {configs.map((config) => (
        <FloatingSymbol
          key={config.id}
          config={config}
          radius={radius}
          size={size}
          baseOpacity={opacity}
          color={color}
        />
      ))}
    </group>
  );
});

export default FloatingSymbols;
