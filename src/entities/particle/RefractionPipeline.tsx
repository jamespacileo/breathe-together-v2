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
uniform float time;
varying vec2 vUv;

// Simplex noise functions for cloud-like patterns
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m; m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 p) {
  float f = 0.0;
  f += 0.5000 * snoise(p); p *= 2.02;
  f += 0.2500 * snoise(p); p *= 2.03;
  f += 0.1250 * snoise(p); p *= 2.01;
  f += 0.0625 * snoise(p);
  return f / 0.9375;
}

void main() {
  // Monument Valley inspired palette - visible pastels with more saturation
  vec3 skyTop = vec3(0.75, 0.82, 0.92);       // #c0d1eb Soft sky blue
  vec3 skyMid = vec3(0.95, 0.80, 0.75);       // #f2ccc0 Dusty rose/peach
  vec3 horizon = vec3(1.0, 0.70, 0.55);       // #ffb38d Warm apricot
  vec3 warmGlow = vec3(0.98, 0.60, 0.50);     // #fa9980 Sunset coral

  // Vertical position for gradient
  float y = vUv.y;

  // Smooth multi-stop gradient using smoothstep blending
  vec3 skyColor;
  float t1 = smoothstep(0.5, 0.9, y);   // Top transition
  float t2 = smoothstep(0.25, 0.6, y);  // Middle transition
  float t3 = smoothstep(0.0, 0.35, y);  // Bottom transition

  // Layer the colors smoothly
  skyColor = mix(warmGlow, horizon, t3);
  skyColor = mix(skyColor, skyMid, t2);
  skyColor = mix(skyColor, skyTop, t1);

  // Animated cloud-like wisps using FBM noise - more subtle
  vec2 cloudUv = vUv * vec2(2.0, 1.0) + vec2(time * 0.015, 0.0);
  float clouds = fbm(cloudUv * 2.5);

  // Second layer of clouds moving slightly differently
  vec2 cloudUv2 = vUv * vec2(1.5, 0.8) + vec2(time * 0.01 + 50.0, time * 0.003);
  float clouds2 = fbm(cloudUv2 * 2.0);

  // Combine cloud layers - fade more at top and bottom
  float cloudMask = smoothstep(0.2, 0.55, clouds * 0.5 + clouds2 * 0.5);
  cloudMask *= smoothstep(0.1, 0.4, y) * smoothstep(0.95, 0.6, y);

  // Cloud color - warm white that complements the gradient
  vec3 cloudColor = vec3(1.0, 0.96, 0.92);

  // Blend clouds subtly into sky - reduced intensity
  vec3 color = mix(skyColor, cloudColor, cloudMask * 0.25);

  // Very subtle vignette - just darkens corners slightly
  vec2 vignetteUv = vUv * 2.0 - 1.0;
  float vignette = 1.0 - dot(vignetteUv * 0.2, vignetteUv * 0.2);
  color *= mix(0.95, 1.0, vignette);

  // Paper texture noise (very subtle)
  float noise = (fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.01;
  color += noise;

  gl_FragColor = vec4(color, 1.0);
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
  const { bgScene, orthoCamera, bgMesh, bgMaterial } = useMemo(() => {
    const bgScene = new THREE.Scene();
    const orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const bgMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
      },
      vertexShader: bgVertexShader,
      fragmentShader: bgFragmentShader,
    });
    const bgGeometry = new THREE.PlaneGeometry(2, 2);
    const bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
    bgScene.add(bgMesh);

    return { bgScene, orthoCamera, bgMesh, bgMaterial };
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
      bgMaterial.dispose();
    };
  }, [envFBO, backfaceFBO, backfaceMaterial, refractionMaterial, bgMesh, bgMaterial]);

  // 3-pass rendering loop
  useFrame((state) => {
    // Update background time uniform for animated clouds
    bgMaterial.uniforms.time.value = state.clock.elapsedTime;
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
