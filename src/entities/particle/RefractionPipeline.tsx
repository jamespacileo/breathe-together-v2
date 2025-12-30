/**
 * RefractionPipeline - 3-pass FBO rendering for frosted glass refraction
 *
 * Implements the Monument Valley reference rendering pipeline:
 * Pass 1: Render background gradient → envFBO texture
 * Pass 2: Render scene with backface material → backfaceFBO texture
 * Pass 3: Render scene with refraction material (samples both FBOs)
 */

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

// Backface vertex shader - renders normals from back faces
const backfaceVertexShader = `
varying vec3 vNormal;
void main() {
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Backface fragment shader - outputs normal as color
const backfaceFragmentShader = `
varying vec3 vNormal;
void main() {
  gl_FragColor = vec4(vNormal, 1.0);
}
`;

// Refraction vertex shader - passes color and calculates eye/normal vectors
const refractionVertexShader = `
attribute vec3 color;
varying vec3 vColor;
varying vec3 eyeVector;
varying vec3 worldNormal;

void main() {
  vColor = color;
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  eyeVector = normalize(worldPosition.xyz - cameraPosition);
  worldNormal = normalize(modelViewMatrix * vec4(normal, 0.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Refraction fragment shader - creates frosted glass effect with mood color tinting
const refractionFragmentShader = `
uniform sampler2D envMap;
uniform sampler2D backfaceMap;
uniform vec2 resolution;
uniform float ior;
uniform float backfaceIntensity;

varying vec3 vColor;
varying vec3 worldNormal;
varying vec3 eyeVector;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  vec3 backfaceNormal = texture2D(backfaceMap, uv).rgb;

  // Blend front and backface normals for thickness effect
  vec3 normal = normalize(worldNormal * (1.0 - backfaceIntensity) - backfaceNormal * backfaceIntensity);
  vec3 refracted = refract(eyeVector, normal, 1.0 / ior);

  // Subtle distortion for clean polished look
  vec2 refractUv = uv + refracted.xy * 0.05;
  vec4 tex = texture2D(envMap, refractUv);

  // 1. FROSTED TINT: mood color tints refraction (50% mix)
  vec3 tintedRefraction = tex.rgb * mix(vec3(1.0), vColor, 0.5);

  // 2. MATTE BODY: solid mood color (25% mix)
  vec3 bodyColor = mix(tintedRefraction, vColor, 0.25);

  // 3. FRESNEL RIM: white edge highlight
  float fresnel = pow(1.0 - clamp(dot(normal, -eyeVector), 0.0, 1.0), 3.0);
  vec3 finalColor = mix(bodyColor, vec3(1.0), fresnel * 0.4);

  // 4. SOFT TOP-DOWN LIGHT
  float topLight = smoothstep(0.0, 1.0, normal.y) * 0.1;
  finalColor += vec3(1.0) * topLight;

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

// Background gradient fragment shader - used for FBO capture
const bgFragmentShader = `
varying vec2 vUv;

// Multi-stop gradient for Monument Valley sunset aesthetic
vec3 sampleGradient(float t) {
  // 5-stop gradient with more saturated, visible colors
  vec3 c0 = vec3(0.95, 0.65, 0.50);  // #f2a680 Warm terracotta/orange (bottom)
  vec3 c1 = vec3(0.92, 0.60, 0.55);  // #eb998c Soft coral/salmon
  vec3 c2 = vec3(0.85, 0.65, 0.72);  // #d9a6b8 Dusty rose/mauve
  vec3 c3 = vec3(0.75, 0.72, 0.85);  // #c0b8d9 Soft lavender
  vec3 c4 = vec3(0.70, 0.78, 0.90);  // #b3c7e6 Soft sky blue (top)

  if (t < 0.25) {
    return mix(c0, c1, smoothstep(0.0, 0.25, t));
  } else if (t < 0.45) {
    return mix(c1, c2, smoothstep(0.25, 0.45, t));
  } else if (t < 0.65) {
    return mix(c2, c3, smoothstep(0.45, 0.65, t));
  } else {
    return mix(c3, c4, smoothstep(0.65, 1.0, t));
  }
}

void main() {
  float t = vUv.y;
  vec3 color = sampleGradient(t);

  // Subtle atmospheric bands
  float band1 = smoothstep(0.28, 0.32, t) * smoothstep(0.36, 0.32, t);
  float band2 = smoothstep(0.58, 0.62, t) * smoothstep(0.66, 0.62, t);
  color = mix(color, color * 1.05, band1 * 0.4);
  color = mix(color, color * 1.03, band2 * 0.3);

  // Soft radial vignette
  vec2 center = vUv - vec2(0.5);
  float vignette = 1.0 - dot(center, center) * 0.25;
  color *= vignette;

  // Warm sun glow at horizon
  float horizonGlow = exp(-pow((t - 0.12) * 3.5, 2.0)) * 0.15;
  color += vec3(1.0, 0.85, 0.6) * horizonGlow;

  // Paper texture noise
  float noise = (fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.02;

  gl_FragColor = vec4(color + noise, 1.0);
}
`;

interface RefractionPipelineProps {
  /** Index of refraction @default 1.3 */
  ior?: number;
  /** Backface normal intensity @default 0.3 */
  backfaceIntensity?: number;
  /** Children meshes to render with refraction */
  children?: React.ReactNode;
}

/**
 * SceneBackground - Fullscreen gradient rendered as part of the main scene
 * This ensures R3F's default render loop handles it properly
 */
function SceneBackground() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: bgFragmentShader,
      depthTest: false,
      depthWrite: false,
    });
  }, []);

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  return (
    <mesh renderOrder={-1000} position={[0, 0, -100]}>
      <planeGeometry args={[300, 200]} />
      <primitive object={material} ref={materialRef} attach="material" />
    </mesh>
  );
}

export function RefractionPipeline({
  ior = 1.3,
  backfaceIntensity = 0.3,
  children,
}: RefractionPipelineProps) {
  const { gl, size, camera, scene } = useThree();

  // Create render targets for refraction
  const { envFBO, backfaceFBO } = useMemo(() => {
    const envFBO = new THREE.WebGLRenderTarget(size.width, size.height);
    const backfaceFBO = new THREE.WebGLRenderTarget(size.width, size.height);
    return { envFBO, backfaceFBO };
  }, [size.width, size.height]);

  // Create background scene for FBO capture (used by refraction sampling)
  const { bgScene, orthoCamera, bgMesh } = useMemo(() => {
    const bgScene = new THREE.Scene();
    const orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const bgMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: bgFragmentShader,
    });
    const bgGeometry = new THREE.PlaneGeometry(2, 2);
    const bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
    bgScene.add(bgMesh);

    return { bgScene, orthoCamera, bgMesh };
  }, []);

  // Create materials for refraction passes
  const { backfaceMaterial, refractionMaterial } = useMemo(() => {
    const backfaceMaterial = new THREE.ShaderMaterial({
      vertexShader: backfaceVertexShader,
      fragmentShader: backfaceFragmentShader,
      side: THREE.BackSide,
    });

    const refractionMaterial = new THREE.ShaderMaterial({
      uniforms: {
        envMap: { value: null },
        backfaceMap: { value: null },
        resolution: { value: new THREE.Vector2(size.width, size.height) },
        ior: { value: ior },
        backfaceIntensity: { value: backfaceIntensity },
      },
      vertexShader: refractionVertexShader,
      fragmentShader: refractionFragmentShader,
    });

    return { backfaceMaterial, refractionMaterial };
  }, [size.width, size.height, ior, backfaceIntensity]);

  // Update uniforms when props change
  useEffect(() => {
    refractionMaterial.uniforms.ior.value = ior;
    refractionMaterial.uniforms.backfaceIntensity.value = backfaceIntensity;
  }, [ior, backfaceIntensity, refractionMaterial]);

  // Update resolution on resize
  useEffect(() => {
    envFBO.setSize(size.width, size.height);
    backfaceFBO.setSize(size.width, size.height);
    refractionMaterial.uniforms.resolution.value.set(size.width, size.height);
  }, [size.width, size.height, envFBO, backfaceFBO, refractionMaterial]);

  // Store original materials for mesh swapping
  const meshDataRef = useRef<Map<THREE.Mesh, THREE.Material | THREE.Material[]>>(new Map());

  // Cleanup
  useEffect(() => {
    return () => {
      envFBO.dispose();
      backfaceFBO.dispose();
      backfaceMaterial.dispose();
      refractionMaterial.dispose();
      bgMesh.geometry.dispose();
      (bgMesh.material as THREE.Material).dispose();
    };
  }, [envFBO, backfaceFBO, backfaceMaterial, refractionMaterial, bgMesh]);

  // Pre-render pass: capture background and backfaces to FBOs
  // This runs BEFORE the main render (-1 priority)
  useFrame(() => {
    // Collect all meshes that should use refraction
    const meshes: THREE.Mesh[] = [];
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.userData.useRefraction) {
        meshes.push(obj);
      }
    });

    // Store original materials
    meshDataRef.current.clear();
    for (const mesh of meshes) {
      meshDataRef.current.set(mesh, mesh.material);
    }

    // Pass 1: Render background gradient to envFBO (for refraction sampling)
    gl.setRenderTarget(envFBO);
    gl.clear();
    gl.render(bgScene, orthoCamera);

    // Pass 2: Render backfaces to backfaceFBO
    for (const mesh of meshes) {
      mesh.material = backfaceMaterial;
    }
    gl.setRenderTarget(backfaceFBO);
    gl.clear();
    gl.render(scene, camera);

    // Restore original materials and set up refraction uniforms
    refractionMaterial.uniforms.envMap.value = envFBO.texture;
    refractionMaterial.uniforms.backfaceMap.value = backfaceFBO.texture;

    // Apply refraction material to refracting meshes
    for (const mesh of meshes) {
      mesh.material = refractionMaterial;
    }

    // Reset render target so R3F renders to screen
    gl.setRenderTarget(null);
  }, -1); // Priority -1: run BEFORE default render

  // Post-render: restore original materials
  useFrame(() => {
    // Restore original materials after R3F's render
    meshDataRef.current.forEach((material, mesh) => {
      mesh.material = material;
    });
  }, 1); // Priority 1: run AFTER default render

  return (
    <>
      <SceneBackground />
      {children}
    </>
  );
}

export {
  refractionVertexShader,
  refractionFragmentShader,
  backfaceVertexShader,
  backfaceFragmentShader,
};
