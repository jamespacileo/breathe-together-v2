import { Stage } from '@react-three/drei';
import type { ReactNode } from 'react';
import { Backdrop } from './Backdrop';

type StageEnvironmentPreset =
  | 'studio'
  | 'city'
  | 'dawn'
  | 'night'
  | 'apartment'
  | 'forest'
  | 'lobby'
  | 'park'
  | 'sunset'
  | 'warehouse';

interface StageEnvironmentProps {
  children: ReactNode;
  preset?: 'rembrandt' | 'portrait' | 'upfront' | 'soft';
  shadows?: 'contact' | 'accumulative' | 'none';
  intensity?: number;
  environment?: StageEnvironmentPreset;
  adjustCamera?: boolean | number;
  center?: boolean;
  /**
   * Backdrop mood preset
   * @group "Configuration"
   * @enum ["meditation", "cosmic", "minimal", "studio"]
   */
  backdropPreset?: 'meditation' | 'cosmic' | 'minimal' | 'studio';
  /**
   * Show the colorful backdrop
   */
  showBackdrop?: boolean;
}

export function StageEnvironment({
  children,
  preset = 'rembrandt',
  shadows = 'contact',
  intensity = 0.5,
  environment = 'city',
  adjustCamera = false,
  center = false,
  backdropPreset = 'studio',
  showBackdrop = true,
}: StageEnvironmentProps) {
  return (
    <>
      {showBackdrop && <Backdrop preset={backdropPreset} />}
      <Stage
        preset={preset}
        intensity={intensity}
        shadows={shadows === 'none' ? false : shadows}
        environment={environment}
        adjustCamera={adjustCamera}
        center={center ? undefined : { disable: true }}
      >
        {children}
      </Stage>
    </>
  );
}
