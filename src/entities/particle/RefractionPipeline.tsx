/**
 * RefractionPipeline - 3-pass FBO rendering for frosted glass refraction
 *
 * Implements the Monument Valley reference rendering pipeline:
 * Pass 1: Render background gradient → envFBO texture
 * Pass 2: Render scene with backface material → backfaceFBO texture
 * Pass 3: Render scene with refraction material (samples both FBOs)
 */

import { useFrame, useThree } from '@react-three/fiber';
import { useWorld } from 'koota/react';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { breathPhase as breathPhaseTrait } from '../breath/traits';

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
varying float vDepth;
varying vec3 vWorldPosition;

void main() {
  vColor = color;
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  eyeVector = normalize(worldPosition.xyz - cameraPosition);
  worldNormal = normalize(modelViewMatrix * vec4(normal, 0.0)).xyz;

  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
  vDepth = -viewPosition.z; // Positive depth (distance from camera)

  gl_Position = projectionMatrix * viewPosition;
}
`;

// Refraction fragment shader - creates frosted glass effect with mood color tinting
const refractionFragmentShader = `
uniform sampler2D envMap;
uniform sampler2D backfaceMap;
uniform vec2 resolution;
uniform float ior;
uniform float backfaceIntensity;
uniform float fogNear;
uniform float fogFar;
uniform vec3 fogColor;

varying vec3 vColor;
varying vec3 worldNormal;
varying vec3 eyeVector;
varying float vDepth;
varying vec3 vWorldPosition;

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

  // 3. FRESNEL RIM: white/cream edge highlight (Monument Valley style)
  float fresnel = pow(1.0 - clamp(dot(normal, -eyeVector), 0.0, 1.0), 3.0);
  vec3 rimColor = vec3(1.0, 0.99, 0.97); // Warm white rim
  vec3 finalColor = mix(bodyColor, rimColor, fresnel * 0.45);

  // 4. SOFT TOP-DOWN LIGHT (enhanced)
  float topLight = smoothstep(-0.2, 0.8, normal.y) * 0.12;
  finalColor += vec3(1.0, 0.98, 0.95) * topLight;

  // 5. SOFT DROP SHADOW (bottom darkening for depth)
  float bottomShadow = smoothstep(0.3, -0.5, normal.y) * 0.08;
  finalColor *= 1.0 - bottomShadow;

  // 6. DISTANCE FOG - particles fade/desaturate with depth
  float fogFactor = smoothstep(fogNear, fogFar, vDepth);

  // Desaturate distant particles (Monument Valley atmospheric perspective)
  vec3 desaturated = vec3(dot(finalColor, vec3(0.299, 0.587, 0.114)));
  finalColor = mix(finalColor, desaturated, fogFactor * 0.4);

  // Fade toward fog color (warm cream atmosphere)
  finalColor = mix(finalColor, fogColor, fogFactor * 0.35);

  // 7. SUBTLE INNER GLOW based on world position (center glow)
  float distFromCenter = length(vWorldPosition.xz);
  float innerGlow = smoothstep(6.0, 2.0, distFromCenter) * 0.06;
  finalColor += rimColor * innerGlow;

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

// Background gradient shader (simplified version for FBO refraction source)
const bgVertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

const bgFragmentShader = `
uniform float breathPhase;
varying vec2 vUv;
void main() {
  // Soft pastel gradient matching Monument Valley aesthetic
  vec3 warmCream = vec3(0.98, 0.96, 0.92);    // Top - warm cream
  vec3 softBlush = vec3(0.96, 0.91, 0.87);    // Bottom - soft blush/peach

  // Simple vertical gradient (bottom to top)
  float t = vUv.y;
  vec3 color = mix(softBlush, warmCream, t);

  // Soft radial vignette (subtle warm edges)
  vec2 center = vUv - 0.5;
  float dist = length(center);
  float vignette = smoothstep(0.8, 0.2, dist);
  vec3 edgeTint = vec3(0.92, 0.86, 0.82); // Warm shadow at edges
  color = mix(edgeTint, color, vignette * 0.85 + 0.15);

  // Breathing-synchronized center glow
  float bloomRadius = 0.4 + (1.0 - breathPhase) * 0.1;
  float centerGlow = smoothstep(bloomRadius + 0.15, bloomRadius - 0.1, dist);
  centerGlow *= 0.04 * (0.8 + breathPhase * 0.2);
  color += vec3(1.0, 0.99, 0.97) * centerGlow;

  // Minimal paper texture noise
  float noise = (fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.015;

  gl_FragColor = vec4(color + noise, 1.0);
}
`;

interface RefractionPipelineProps {
  /** Index of refraction @default 1.3 */
  ior?: number;
  /** Backface normal intensity @default 0.3 */
  backfaceIntensity?: number;
  /** Distance where fog starts @default 5 */
  fogNear?: number;
  /** Distance where fog is fully applied @default 12 */
  fogFar?: number;
  /** Fog color (warm cream for Monument Valley style) @default '#f8f4ef' */
  fogColor?: string;
  /** Children meshes to render with refraction */
  children?: React.ReactNode;
}

export function RefractionPipeline({
  ior = 1.3,
  backfaceIntensity = 0.3,
  fogNear = 5,
  fogFar = 12,
  fogColor = '#f8f4ef',
  children,
}: RefractionPipelineProps) {
  const { gl, size, camera, scene } = useThree();
  const world = useWorld();

  // Parse fog color to THREE.Color
  const fogColorVec = useMemo(() => new THREE.Color(fogColor), [fogColor]);

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
        breathPhase: { value: 0 },
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
        fogNear: { value: fogNear },
        fogFar: { value: fogFar },
        fogColor: { value: fogColorVec },
      },
      vertexShader: refractionVertexShader,
      fragmentShader: refractionFragmentShader,
    });

    return { backfaceMaterial, refractionMaterial };
  }, [size.width, size.height, ior, backfaceIntensity, fogNear, fogFar, fogColorVec]);

  // Update uniforms when props change
  useEffect(() => {
    refractionMaterial.uniforms.ior.value = ior;
    refractionMaterial.uniforms.backfaceIntensity.value = backfaceIntensity;
    refractionMaterial.uniforms.fogNear.value = fogNear;
    refractionMaterial.uniforms.fogFar.value = fogFar;
    refractionMaterial.uniforms.fogColor.value = fogColorVec;
  }, [ior, backfaceIntensity, fogNear, fogFar, fogColorVec, refractionMaterial]);

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
    // Update background breathPhase from ECS
    try {
      const breathEntity = world.queryFirst(breathPhaseTrait);
      if (breathEntity) {
        const phase = breathEntity.get(breathPhaseTrait)?.value ?? 0;
        bgMaterial.uniforms.breathPhase.value = phase;
      }
    } catch {
      // Ignore ECS errors during unmount/remount in Triplex
    }

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
