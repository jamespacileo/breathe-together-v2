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

// Background gradient shader (same as BackgroundGradient.tsx)
const bgVertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

const bgFragmentShader = `
varying vec2 vUv;

// Multi-stop gradient for Monument Valley sunset aesthetic
vec3 sampleGradient(float t) {
  // 5-stop gradient: warm peach → soft coral → dusty rose → lavender → soft sky blue
  vec3 c0 = vec3(0.98, 0.82, 0.70);  // #fad1b3 Warm peach (bottom)
  vec3 c1 = vec3(0.96, 0.75, 0.72);  // #f5c0b8 Soft coral
  vec3 c2 = vec3(0.92, 0.78, 0.82);  // #ebc7d1 Dusty rose/pink
  vec3 c3 = vec3(0.85, 0.82, 0.92);  // #d9d1eb Soft lavender
  vec3 c4 = vec3(0.82, 0.88, 0.96);  // #d1e0f5 Soft sky blue (top)

  // Smooth interpolation between stops
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
  // Base vertical gradient
  float t = vUv.y;
  vec3 color = sampleGradient(t);

  // Subtle horizontal atmospheric bands (distant haze layers)
  float band1 = smoothstep(0.28, 0.32, t) * smoothstep(0.36, 0.32, t);
  float band2 = smoothstep(0.58, 0.62, t) * smoothstep(0.66, 0.62, t);
  color = mix(color, color * 1.03, band1 * 0.3);
  color = mix(color, color * 1.02, band2 * 0.2);

  // Subtle radial vignette from center (depth/atmosphere)
  vec2 center = vUv - vec2(0.5);
  float vignette = 1.0 - dot(center, center) * 0.15;
  color *= vignette;

  // Subtle warm highlight at horizon (sun glow)
  float horizonGlow = exp(-pow((t - 0.15) * 4.0, 2.0)) * 0.08;
  color += vec3(1.0, 0.9, 0.75) * horizonGlow;

  // Paper texture noise (very subtle)
  float noise = (fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.015;

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

export function RefractionPipeline({
  ior = 1.3,
  backfaceIntensity = 0.3,
  children,
}: RefractionPipelineProps) {
  const { gl, size, camera, scene } = useThree();

  // Create render targets
  const { envFBO, backfaceFBO } = useMemo(() => {
    const envFBO = new THREE.WebGLRenderTarget(size.width, size.height);
    const backfaceFBO = new THREE.WebGLRenderTarget(size.width, size.height);
    return { envFBO, backfaceFBO };
  }, [size.width, size.height]);

  // Create background scene with ortho camera
  const { bgScene, orthoCamera, bgMesh } = useMemo(() => {
    const bgScene = new THREE.Scene();
    const orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const bgMaterial = new THREE.ShaderMaterial({
      vertexShader: bgVertexShader,
      fragmentShader: bgFragmentShader,
    });
    const bgGeometry = new THREE.PlaneGeometry(2, 2);
    const bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
    bgScene.add(bgMesh);

    return { bgScene, orthoCamera, bgMesh };
  }, []);

  // Create materials
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

  // 3-pass rendering loop
  useFrame(() => {
    // Collect all meshes in scene that should use refraction
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

    // Pass 1: Render background to envFBO
    gl.setRenderTarget(envFBO);
    gl.clear();
    gl.render(bgScene, orthoCamera);

    // Pass 2: Swap to backface material, render to backfaceFBO
    for (const mesh of meshes) {
      mesh.material = backfaceMaterial;
    }
    gl.setRenderTarget(backfaceFBO);
    gl.clear();
    gl.render(scene, camera);

    // Pass 3: Render final composite
    // First render background to screen
    gl.setRenderTarget(null);
    gl.clear();
    gl.render(bgScene, orthoCamera);

    // Update refraction material uniforms with FBO textures
    refractionMaterial.uniforms.envMap.value = envFBO.texture;
    refractionMaterial.uniforms.backfaceMap.value = backfaceFBO.texture;

    // Swap to refraction material and render scene
    for (const mesh of meshes) {
      mesh.material = refractionMaterial;
    }
    gl.clearDepth();
    gl.render(scene, camera);

    // Restore original materials (for next frame's scene graph consistency)
    for (const mesh of meshes) {
      const original = meshDataRef.current.get(mesh);
      if (original) {
        mesh.material = original;
      }
    }
  }, 1); // Priority 1 to run before default render

  return <>{children}</>;
}

export {
  refractionVertexShader,
  refractionFragmentShader,
  backfaceVertexShader,
  backfaceFragmentShader,
};
