/**
 * RefractionPipeline - 4-pass FBO rendering for frosted glass refraction + depth of field
 *
 * Implements the Monument Valley reference rendering pipeline:
 * Pass 1: Render background gradient → envFBO texture
 * Pass 2: Render scene with backface material → backfaceFBO texture
 * Pass 3: Render scene with refraction material → compositeFBO (with depth)
 * Pass 4: Apply depth of field blur → screen
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

  // Very subtle center brightening
  float centerGlow = smoothstep(0.6, 0.0, dist) * 0.03;
  color += vec3(1.0, 0.99, 0.97) * centerGlow;

  // Minimal paper texture noise
  float noise = (fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.015;

  gl_FragColor = vec4(color + noise, 1.0);
}
`;

// Depth of Field vertex shader - simple fullscreen quad
const dofVertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

// Depth of Field fragment shader - bokeh-style blur based on depth
const dofFragmentShader = `
uniform sampler2D colorTexture;
uniform sampler2D depthTexture;
uniform float focusDistance;    // Focus distance in world units (normalized 0-1)
uniform float focalRange;       // Range around focus that stays sharp
uniform float maxBlur;          // Maximum blur radius
uniform float cameraNear;
uniform float cameraFar;
uniform vec2 resolution;

varying vec2 vUv;

// Convert depth buffer value to linear depth
float linearizeDepth(float depth) {
  float z = depth * 2.0 - 1.0; // Back to NDC
  return (2.0 * cameraNear * cameraFar) / (cameraFar + cameraNear - z * (cameraFar - cameraNear));
}

// Simple box blur kernel with variable radius
vec3 boxBlur(vec2 uv, float radius) {
  vec3 color = vec3(0.0);
  float count = 0.0;
  vec2 texelSize = 1.0 / resolution;

  // Sample in a circle pattern for smoother bokeh
  for (float x = -3.0; x <= 3.0; x += 1.0) {
    for (float y = -3.0; y <= 3.0; y += 1.0) {
      vec2 offset = vec2(x, y) * texelSize * radius;
      // Circular mask for bokeh shape
      if (length(vec2(x, y)) <= 3.0) {
        color += texture2D(colorTexture, uv + offset).rgb;
        count += 1.0;
      }
    }
  }

  return color / count;
}

void main() {
  // Sample depth and convert to linear
  float depth = texture2D(depthTexture, vUv).r;
  float linearDepth = linearizeDepth(depth);

  // Normalize depth to camera range
  float normalizedDepth = (linearDepth - cameraNear) / (cameraFar - cameraNear);

  // Calculate circle of confusion (blur amount)
  // Only blur objects FURTHER than focus distance (behind the focal plane)
  // Objects closer to camera stay sharp
  float distanceBeyondFocus = max(0.0, normalizedDepth - focusDistance);

  // Smooth falloff - only applies to objects beyond focus
  float coc = smoothstep(0.0, focalRange, distanceBeyondFocus) * maxBlur;

  // Apply blur based on CoC
  vec3 color;
  if (coc < 0.5) {
    // Sharp - just sample directly
    color = texture2D(colorTexture, vUv).rgb;
  } else {
    // Blur - apply box blur with radius based on CoC
    color = boxBlur(vUv, coc);
  }

  gl_FragColor = vec4(color, 1.0);
}
`;

interface RefractionPipelineProps {
  /** Index of refraction @default 1.3 */
  ior?: number;
  /** Backface normal intensity @default 0.3 */
  backfaceIntensity?: number;
  /**
   * Enable depth of field effect for realistic depth perception.
   * @default true
   */
  enableDepthOfField?: boolean;
  /**
   * Focus distance from camera in world units.
   * Objects at this distance are sharpest.
   * @min 5 @max 25 @step 0.5
   * @default 15
   */
  focusDistance?: number;
  /**
   * Range around focus distance that remains sharp.
   * Smaller = shallower depth of field, more blur.
   * @min 1 @max 20 @step 0.5
   * @default 8
   */
  focalRange?: number;
  /**
   * Maximum blur intensity for out-of-focus areas.
   * Higher = more pronounced blur effect.
   * @min 0 @max 8 @step 0.5
   * @default 3
   */
  maxBlur?: number;
  /** Children meshes to render with refraction */
  children?: React.ReactNode;
}

export function RefractionPipeline({
  ior = 1.3,
  backfaceIntensity = 0.3,
  enableDepthOfField = true,
  focusDistance = 15,
  focalRange = 8,
  maxBlur = 3,
  children,
}: RefractionPipelineProps) {
  const { gl, size, camera, scene } = useThree();
  const perspCamera = camera as THREE.PerspectiveCamera;

  // Create render targets
  const { envFBO, backfaceFBO, compositeFBO } = useMemo(() => {
    const envFBO = new THREE.WebGLRenderTarget(size.width, size.height);
    const backfaceFBO = new THREE.WebGLRenderTarget(size.width, size.height);
    // Composite FBO with depth texture for DoF
    const depthTexture = new THREE.DepthTexture(size.width, size.height);
    depthTexture.format = THREE.DepthFormat;
    depthTexture.type = THREE.UnsignedIntType;
    const compositeFBO = new THREE.WebGLRenderTarget(size.width, size.height, {
      depthTexture: depthTexture,
      depthBuffer: true,
    });
    return { envFBO, backfaceFBO, compositeFBO };
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

  // Create DoF scene for final composite
  const { dofScene, dofMesh, dofMaterial } = useMemo(() => {
    const dofScene = new THREE.Scene();

    const dofMaterial = new THREE.ShaderMaterial({
      uniforms: {
        colorTexture: { value: null },
        depthTexture: { value: null },
        focusDistance: { value: focusDistance / perspCamera.far },
        focalRange: { value: focalRange / perspCamera.far },
        maxBlur: { value: maxBlur },
        cameraNear: { value: perspCamera.near },
        cameraFar: { value: perspCamera.far },
        resolution: { value: new THREE.Vector2(size.width, size.height) },
      },
      vertexShader: dofVertexShader,
      fragmentShader: dofFragmentShader,
    });
    const dofGeometry = new THREE.PlaneGeometry(2, 2);
    const dofMesh = new THREE.Mesh(dofGeometry, dofMaterial);
    dofScene.add(dofMesh);

    return { dofScene, dofMesh, dofMaterial };
  }, [
    size.width,
    size.height,
    perspCamera.near,
    perspCamera.far,
    focusDistance,
    focalRange,
    maxBlur,
  ]);

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

  // Update DoF uniforms when props change
  useEffect(() => {
    dofMaterial.uniforms.focusDistance.value = focusDistance / perspCamera.far;
    dofMaterial.uniforms.focalRange.value = focalRange / perspCamera.far;
    dofMaterial.uniforms.maxBlur.value = maxBlur;
    dofMaterial.uniforms.cameraNear.value = perspCamera.near;
    dofMaterial.uniforms.cameraFar.value = perspCamera.far;
  }, [focusDistance, focalRange, maxBlur, perspCamera.near, perspCamera.far, dofMaterial]);

  // Update resolution on resize
  useEffect(() => {
    envFBO.setSize(size.width, size.height);
    backfaceFBO.setSize(size.width, size.height);
    compositeFBO.setSize(size.width, size.height);
    refractionMaterial.uniforms.resolution.value.set(size.width, size.height);
    dofMaterial.uniforms.resolution.value.set(size.width, size.height);
  }, [size.width, size.height, envFBO, backfaceFBO, compositeFBO, refractionMaterial, dofMaterial]);

  // Store original materials for mesh swapping
  const meshDataRef = useRef<Map<THREE.Mesh, THREE.Material | THREE.Material[]>>(new Map());

  // Cache refraction meshes to avoid scene.traverse() every frame
  const refractionMeshesRef = useRef<THREE.Mesh[]>([]);
  const sceneVersionRef = useRef<number>(0);

  // Cleanup
  useEffect(() => {
    return () => {
      envFBO.dispose();
      backfaceFBO.dispose();
      compositeFBO.dispose();
      backfaceMaterial.dispose();
      refractionMaterial.dispose();
      dofMaterial.dispose();
      bgMesh.geometry.dispose();
      (bgMesh.material as THREE.Material).dispose();
      dofMesh.geometry.dispose();
    };
  }, [
    envFBO,
    backfaceFBO,
    compositeFBO,
    backfaceMaterial,
    refractionMaterial,
    dofMaterial,
    bgMesh,
    dofMesh,
  ]);

  // 4-pass rendering loop
  useFrame(() => {
    // Only re-traverse scene when children count changes (O(1) check vs O(n) traverse)
    // This avoids expensive scene.traverse() on every frame
    const currentVersion = scene.children.length;
    if (currentVersion !== sceneVersionRef.current) {
      sceneVersionRef.current = currentVersion;
      refractionMeshesRef.current = [];
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.userData.useRefraction) {
          refractionMeshesRef.current.push(obj);
        }
      });
    }

    const meshes = refractionMeshesRef.current;

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

    // Pass 3: Render composite to compositeFBO (with depth for DoF)
    // First render background
    gl.setRenderTarget(compositeFBO);
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

    // Pass 4: Apply depth of field and render to screen
    gl.setRenderTarget(null);
    gl.clear();

    if (enableDepthOfField) {
      // Update DoF material with composite textures
      dofMaterial.uniforms.colorTexture.value = compositeFBO.texture;
      dofMaterial.uniforms.depthTexture.value = compositeFBO.depthTexture;
      gl.render(dofScene, orthoCamera);
    } else {
      // Skip DoF, render composite directly
      // Create a simple passthrough if needed, or just render the composite
      dofMaterial.uniforms.colorTexture.value = compositeFBO.texture;
      dofMaterial.uniforms.depthTexture.value = compositeFBO.depthTexture;
      dofMaterial.uniforms.maxBlur.value = 0; // Disable blur
      gl.render(dofScene, orthoCamera);
      dofMaterial.uniforms.maxBlur.value = maxBlur; // Restore
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
