import { Environment as EnvironmentMap } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import * as THREE from 'three';

interface EnvironmentProps {
  enabled?: boolean;
}

export function Environment({ enabled = true }: EnvironmentProps = {}) {
  const { scene } = useThree();

  // Set scene background color once
  useEffect(() => {
    scene.background = new THREE.Color(0xfaf8f3);
  }, [scene]);

  if (!enabled) return null;

  return (
    <>
      {/* 
        High-quality Environment Map 
        Provides realistic reflections for those ceramic and frosted surfaces
      */}
      <EnvironmentMap preset="studio" blur={0.8} />

      {/* 
        Balanced Studio Lighting Rig
        - Key Light: Strong light from front-top-right
        - Fill Light: Soft light from opposite side
        - Back Light: Highlights the silhouette (especially for the shards)
      */}
      <ambientLight intensity={0.4} color="#ffffff" />

      {/* Key Light */}
      <directionalLight position={[10, 10, 10]} intensity={1.2} color="#fffaf0" castShadow />

      {/* Fill Light (Cooler tone) */}
      <directionalLight position={[-10, 5, 5]} intensity={0.6} color="#e0f0f8" />

      {/* Back Light (Highlight edges) */}
      <spotLight position={[0, 10, -15]} intensity={1.5} angle={0.6} penumbra={1} color="#ffffff" />
    </>
  );
}
