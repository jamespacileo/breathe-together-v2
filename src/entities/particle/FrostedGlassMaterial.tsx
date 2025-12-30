import { useFBO } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { hashBlur } from 'three/addons/tsl/display/hashBlur.js';
import {
  attribute,
  cameraPosition,
  color,
  float,
  mix,
  normalWorld,
  positionWorld,
  refract,
  screenUV,
  texture,
  vec3,
  viewportSafeUV,
  viewportSharedTexture,
} from 'three/tsl';
import { NodeMaterial } from 'three/webgpu';

interface FrostedGlassMaterialProps {
  ior?: number;
  backfaceIntensity?: number;
  baseColor?: string;
  transparent?: boolean;
}

export function FrostedGlassMaterial({
  ior = 1.3,
  backfaceIntensity = 0.3,
  baseColor = '#ffffff',
}: FrostedGlassMaterialProps) {
  const { camera, scene, gl } = useThree();
  const backfaceFbo = useFBO();

  const materialRef = useRef<NodeMaterial>(null);
  // Track disposed materials per-instance to avoid race conditions on prop changes
  const disposedMaterialsRef = useRef(new WeakSet<THREE.Material>());

  const backfaceMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * (instanceMatrix * vec4(normal, 0.0)).xyz);
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      }
    `,
        fragmentShader: `
      varying vec3 vNormal;
      void main() {
        gl_FragColor = vec4(vNormal * 0.5 + 0.5, 1.0);
      }
    `,
        side: THREE.BackSide,
      }),
    [],
  );

  const tslMaterial = useMemo(() => {
    const iorNode = float(ior);
    const backfaceIntNode = float(backfaceIntensity);
    const _uBaseColor = color(baseColor);

    const backfaceNormal = texture(backfaceFbo.texture, screenUV).rgb.sub(0.5).mul(2.0);
    const combinedNormal = normalWorld
      .mul(float(1.0).sub(backfaceIntNode))
      .sub(backfaceNormal.mul(backfaceIntNode))
      .normalize();

    const worldPos = positionWorld;
    const eyeDir = worldPos.sub(cameraPosition).normalize();
    const refracted = refract(eyeDir, combinedNormal, float(1.0).div(iorNode));

    const distortedUV = viewportSafeUV(screenUV.add(refracted.xy.mul(0.05)));
    const background = hashBlur(viewportSharedTexture(distortedUV), float(0.1));

    // Use instanceColor attribute if available (NodeMaterial convention)
    const tint = attribute('instanceColor', 'vec3');

    // 1. FROSTED TINT: Multiply refraction by mood color (colored glass filter)
    const tintedRefraction = background.rgb.mul(mix(vec3(1.0), tint, 0.5));

    // 2. MATTE BODY: Mix in raw solid color for semi-opaque/milky look
    const bodyColor = mix(tintedRefraction, tint, 0.25);

    // 3. ILLUSTRATIVE RIM: Sharp white rim for clean edges
    const dotProduct = combinedNormal.dot(eyeDir.negate()).clamp(0, 1);
    const rim = float(1.0).sub(dotProduct).pow(3.0);

    // 4. SOFT TOP-DOWN LIGHT: Ambient environment simulation
    const topLight = combinedNormal.y.smoothstep(0.0, 1.0).mul(0.1);

    const finalColor = mix(bodyColor, vec3(1.0), rim.mul(0.4)).add(topLight);

    const material = new NodeMaterial();
    material.colorNode = finalColor;
    material.transparent = true;
    material.depthWrite = false;
    return material;
  }, [backfaceFbo, ior, backfaceIntensity, baseColor]);

  // GPU memory cleanup: dispose materials, FBO on unmount or dependency change
  // Marks disposed materials in WeakSet to prevent useFrame from accessing them
  useEffect(() => {
    return () => {
      disposedMaterialsRef.current.add(backfaceMaterial);
      disposedMaterialsRef.current.add(tslMaterial);
      backfaceMaterial.dispose();
      tslMaterial.dispose();
      backfaceFbo.dispose();
    };
  }, [backfaceMaterial, tslMaterial, backfaceFbo]);

  useFrame((state) => {
    // Prevent rendering with disposed materials during prop changes or unmount
    if (disposedMaterialsRef.current.has(tslMaterial)) return;

    const mesh = state.scene.getObjectByName('Particle Swarm Mesh') as THREE.InstancedMesh;
    if (!mesh) return;

    const originalMaterial = mesh.material;
    const originalVisible = mesh.visible;

    mesh.material = backfaceMaterial;
    mesh.visible = true;
    gl.setRenderTarget(backfaceFbo);
    gl.clear();
    gl.render(scene, camera);

    mesh.material = originalMaterial;
    mesh.visible = originalVisible;
    gl.setRenderTarget(null);
  });

  return <primitive object={tslMaterial} ref={materialRef} attach="material" />;
}
