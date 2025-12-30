import { Environment as EnvironmentMap } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import * as THREE from 'three';

interface EnvironmentProps {
  enabled?: boolean;
}

export function Environment({ enabled = true }: EnvironmentProps = {}) {
  const { scene } = useThree();

  // Set scene background color once - using a soft, meditative off-white/warm gray
  useEffect(() => {
    scene.background = new THREE.Color(0xf2f0ed);
    // Add subtle fog to blend the horizon
    scene.fog = new THREE.Fog(0xf2f0ed, 10, 50);
  }, [scene]);

  if (!enabled) return null;

  return (
    <>
      {/* 
        High-quality Environment Map 
        Provides realistic reflections for those ceramic and frosted surfaces
      */}
      <EnvironmentMap preset="apartment" blur={0.8} />

      {/* 
        Balanced Studio Lighting Rig
        - Key Light: Strong light from front-top-right
        - Fill Light: Soft light from opposite side
        - Back Light: Highlights the silhouette (especially for the shards)
      */}
      <ambientLight intensity={0.5} color="#ffffff" />

      {/* Key Light */}
      <directionalLight position={[5, 10, 5]} intensity={1.5} color="#fffcf5" castShadow />

      {/* Fill Light (Cooler tone) */}
      <directionalLight position={[-10, 5, 2]} intensity={0.4} color="#f0f7ff" />

      {/* Back Light / Rim Light */}
      <spotLight position={[0, 10, -10]} intensity={2} angle={0.5} penumbra={1} color="#ffffff" />
    </>
  );
}
