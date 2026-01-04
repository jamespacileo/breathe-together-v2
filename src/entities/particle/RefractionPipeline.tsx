/**
 * RefractionPipeline - 4-pass FBO rendering for frosted glass refraction + depth of field
 *
 * Implements the Monument Valley reference rendering pipeline:
 * Pass 1: Render background gradient → envFBO texture (cached when static)
 * Pass 2: Render scene with backface material → backfaceFBO texture (half resolution)
 * Pass 3: Render scene with refraction material → compositeFBO (with depth)
 * Pass 4: Apply depth of field blur → screen
 *
 * Performance optimizations (Jan 2025):
 * - THREE.Layers for selective rendering (RENDER_LAYERS.PARTICLES for refraction)
 * - Half-resolution backface pass (50% width/height, bilinear filtering)
 * - Environment FBO caching (re-renders only every ENV_CACHE_FRAMES frames)
 * - On-demand rendering support via invalidate()
 */

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { RENDER_LAYERS } from '../../constants';

// Backface vertex shader - renders normals from back faces
// Supports both regular meshes and InstancedMesh via THREE.js instancing defines
const backfaceVertexShader = `
varying vec3 vNormal;
void main() {
  // Apply instance transform if using InstancedMesh
  #ifdef USE_INSTANCING
    vec3 transformedNormal = mat3(normalMatrix) * mat3(instanceMatrix) * normal;
    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  #else
    vec3 transformedNormal = normalMatrix * normal;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  #endif

  vNormal = normalize(transformedNormal);
  gl_Position = projectionMatrix * mvPosition;
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
// Supports both regular meshes and InstancedMesh via THREE.js instancing defines
const refractionVertexShader = `
varying vec3 vColor;
varying vec3 eyeVector;
varying vec3 worldNormal;

void main() {
  // Use instanceColor if available (InstancedMesh), otherwise fallback to white
  #ifdef USE_INSTANCING_COLOR
    vColor = instanceColor;
  #else
    vColor = vec3(0.85, 0.75, 0.65); // Warm neutral fallback
  #endif

  // Apply instance transform if using InstancedMesh
  #ifdef USE_INSTANCING
    vec4 worldPosition = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vec3 transformedNormal = mat3(modelViewMatrix) * mat3(instanceMatrix) * normal;
  #else
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vec3 transformedNormal = mat3(modelViewMatrix) * normal;
  #endif

  eyeVector = normalize(worldPosition.xyz - cameraPosition);
  worldNormal = normalize(transformedNormal);

  #ifdef USE_INSTANCING
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  #else
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  #endif
}
`;

// Refraction fragment shader - creates gem-like frosted crystal look
// Improved Dec 2024: Bright luminous gem pastels with faceted shading (Monument Valley style)
const refractionFragmentShader = `
uniform sampler2D envMap;
uniform sampler2D backfaceMap;
uniform vec2 resolution;
uniform float ior;
uniform float backfaceIntensity;

varying vec3 vColor;
varying vec3 worldNormal;
varying vec3 eyeVector;

// Key light from upper-right-front
const vec3 keyLightDir = normalize(vec3(0.5, 0.7, 0.4));

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  vec3 backfaceNormal = texture2D(backfaceMap, uv).rgb;

  // Blend front and backface normals for thickness/depth
  vec3 normal = normalize(worldNormal * (1.0 - backfaceIntensity) - backfaceNormal * backfaceIntensity);
  vec3 refracted = refract(eyeVector, normal, 1.0 / ior);

  // Refraction for gem-like depth
  vec2 refractUv = uv + refracted.xy * 0.04;
  vec4 tex = texture2D(envMap, refractUv);

  // === BRIGHT LUMINOUS GEM COLOR ===
  // Keep high saturation with brightness boost
  vec3 warmWhite = vec3(1.0, 0.98, 0.95);
  // 85% color intensity - vibrant
  vec3 gemColor = mix(warmWhite, vColor, 0.85);
  // Brightness boost for luminous feel
  gemColor *= 1.15;

  // === FACETED SHADING (gem look) ===
  float diffuse = max(dot(normal, keyLightDir), 0.0);
  // Wrap lighting - higher base for brighter shadows
  float wrapped = diffuse * 0.5 + 0.5;
  // Shading range: lit faces very bright, shadow faces still bright (0.65 - 1.0)
  float shading = wrapped * 0.35 + 0.65;

  // === GEM BODY WITH INNER GLOW ===
  vec3 shadedGem = gemColor * shading;

  // Inner luminosity - gems glow from within (stronger)
  float innerGlow = (1.0 - diffuse) * 0.2;
  shadedGem += gemColor * innerGlow;

  // Tinted refraction for depth
  vec3 tintedRefraction = tex.rgb * mix(vec3(1.0), gemColor, 0.35);

  // Mix: gem body (65%) with refraction (35%) for crystalline depth
  vec3 bodyColor = mix(tintedRefraction, shadedGem, 0.65);

  // === FRESNEL RIM (crystalline edge glow) ===
  float fresnel = pow(1.0 - clamp(dot(normal, -eyeVector), 0.0, 1.0), 2.5);
  vec3 rimColor = vec3(1.0, 0.99, 0.97);
  vec3 colorWithRim = mix(bodyColor, rimColor, fresnel * 0.3);

  // === SPECULAR HIGHLIGHT (gem sparkle) ===
  vec3 halfVec = normalize(keyLightDir - eyeVector);
  float spec = pow(max(dot(normal, halfVec), 0.0), 32.0);
  colorWithRim += vec3(1.0, 0.99, 0.97) * spec * 0.3;

  // === TOP AMBIENT ===
  float topLight = max(normal.y, 0.0) * 0.12;
  colorWithRim += vec3(1.0, 0.99, 0.97) * topLight;

  gl_FragColor = vec4(min(colorWithRim, vec3(1.0)), 1.0);
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

/**
 * Environment FBO cache interval (frames)
 * Background gradient is static, so we can cache it for multiple frames.
 * Set to 10 = re-render background every 10 frames (6 times/sec if running at 60fps)
 */
const ENV_CACHE_FRAMES = 10;

/**
 * Backface resolution scale (0.5 = half resolution)
 * Backface normals don't need full resolution - bilinear filtering smooths the result.
 * At 0.5 scale, this saves 75% GPU fill rate (0.5² = 0.25 pixels filled).
 */
const BACKFACE_RESOLUTION_SCALE = 0.5;

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

  // Calculate half-resolution dimensions for backface pass
  const backfaceWidth = Math.floor(size.width * BACKFACE_RESOLUTION_SCALE);
  const backfaceHeight = Math.floor(size.height * BACKFACE_RESOLUTION_SCALE);

  // Create render targets
  const { envFBO, backfaceFBO, compositeFBO } = useMemo(() => {
    // Environment FBO - full resolution, cached for ENV_CACHE_FRAMES
    const envFBO = new THREE.WebGLRenderTarget(size.width, size.height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });

    // Backface FBO - half resolution with bilinear filtering for smooth normals
    // At 0.5 scale: saves 75% fill rate (0.5² = 0.25 pixels) with minimal quality loss
    const backfaceFBO = new THREE.WebGLRenderTarget(backfaceWidth, backfaceHeight, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });

    // Composite FBO with depth texture for DoF
    const depthTexture = new THREE.DepthTexture(size.width, size.height);
    depthTexture.format = THREE.DepthFormat;
    depthTexture.type = THREE.UnsignedIntType;
    const compositeFBO = new THREE.WebGLRenderTarget(size.width, size.height, {
      depthTexture: depthTexture,
      depthBuffer: true,
    });
    return { envFBO, backfaceFBO, compositeFBO };
  }, [size.width, size.height, backfaceWidth, backfaceHeight]);

  // Create a camera for layer-based selective rendering
  // Clone the main camera and modify its layers for each pass
  const layerCamera = useMemo(() => {
    const cam = new THREE.PerspectiveCamera();
    return cam;
  }, []);

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
      side: THREE.DoubleSide, // Render both faces so shapes don't appear flat from certain angles
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
    // Backface uses half resolution
    backfaceFBO.setSize(backfaceWidth, backfaceHeight);
    compositeFBO.setSize(size.width, size.height);
    refractionMaterial.uniforms.resolution.value.set(size.width, size.height);
    dofMaterial.uniforms.resolution.value.set(size.width, size.height);
    // Force env FBO re-render on resize
    envNeedsUpdateRef.current = true;
  }, [
    size.width,
    size.height,
    backfaceWidth,
    backfaceHeight,
    envFBO,
    backfaceFBO,
    compositeFBO,
    refractionMaterial,
    dofMaterial,
  ]);

  // Store original materials for mesh swapping
  const meshDataRef = useRef<Map<THREE.Mesh, THREE.Material | THREE.Material[]>>(new Map());

  // Cache refraction meshes (refreshed when count changes or meshes become stale)
  const refractionMeshesRef = useRef<THREE.Mesh[]>([]);

  // Frame counter for throttled operations
  const frameCountRef = useRef(0);
  const MESH_CHECK_INTERVAL = 30;

  // Environment FBO cache - track when we last rendered it
  const envCacheFrameRef = useRef(0);
  const envNeedsUpdateRef = useRef(true); // Force initial render

  // Cleanup
  useEffect(() => {
    return () => {
      envFBO.dispose();
      backfaceFBO.dispose();
      // Dispose depth texture explicitly before render target
      compositeFBO.depthTexture?.dispose();
      compositeFBO.dispose();
      backfaceMaterial.dispose();
      refractionMaterial.dispose();
      dofMaterial.dispose();
      bgMesh.geometry.dispose();
      (bgMesh.material as THREE.Material).dispose();
      dofMesh.geometry.dispose();
      (dofMesh.material as THREE.Material).dispose();
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

  // 4-pass rendering loop with performance optimizations:
  // - Layer-based mesh detection (RENDER_LAYERS.PARTICLES)
  // - Environment FBO caching (re-render every ENV_CACHE_FRAMES)
  // - Half-resolution backface pass
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Multi-pass refraction pipeline requires mesh detection, material swapping, 4 FBO passes, and DoF toggle - splitting would reduce readability of the sequential rendering logic
  useFrame(() => {
    frameCountRef.current++;

    // Sync layer camera with main camera each frame
    layerCamera.copy(perspCamera);

    // Throttled mesh detection: only check every N frames to reduce scene traversal overhead
    // Uses RENDER_LAYERS.PARTICLES instead of userData.useRefraction
    if (frameCountRef.current % MESH_CHECK_INTERVAL === 0) {
      // Quick stale check first (O(cached) instead of O(scene))
      let needsRefresh = false;
      for (const mesh of refractionMeshesRef.current) {
        if (!mesh.parent || !mesh.layers.isEnabled(RENDER_LAYERS.PARTICLES)) {
          needsRefresh = true;
          break;
        }
      }

      // Full scene traversal only when needed or periodically
      if (needsRefresh || refractionMeshesRef.current.length === 0) {
        const newMeshes: THREE.Mesh[] = [];
        scene.traverse((obj) => {
          // Check if mesh is on PARTICLES layer (layer 2)
          if (obj instanceof THREE.Mesh && obj.layers.isEnabled(RENDER_LAYERS.PARTICLES)) {
            newMeshes.push(obj);
          }
        });

        // Only update if count changed (avoids unnecessary array recreation)
        if (newMeshes.length !== refractionMeshesRef.current.length || needsRefresh) {
          refractionMeshesRef.current = newMeshes;
        }
      }
    }

    const meshes = refractionMeshesRef.current;

    // Store original materials
    meshDataRef.current.clear();
    for (const mesh of meshes) {
      meshDataRef.current.set(mesh, mesh.material);
    }

    // Pass 1: Render background to envFBO (CACHED for ENV_CACHE_FRAMES)
    // Background gradient is static, so we only need to re-render it periodically
    const framesSinceEnvRender = frameCountRef.current - envCacheFrameRef.current;
    if (envNeedsUpdateRef.current || framesSinceEnvRender >= ENV_CACHE_FRAMES) {
      gl.setRenderTarget(envFBO);
      gl.clear();
      gl.render(bgScene, orthoCamera);
      envCacheFrameRef.current = frameCountRef.current;
      envNeedsUpdateRef.current = false;
    }

    // Pass 2: Swap to backface material, render to half-res backfaceFBO
    // Only render PARTICLES layer meshes
    for (const mesh of meshes) {
      mesh.material = backfaceMaterial;
    }
    layerCamera.layers.set(RENDER_LAYERS.PARTICLES);
    gl.setRenderTarget(backfaceFBO);
    gl.clear();
    gl.render(scene, layerCamera);

    // Update refraction material uniforms with FBO textures
    refractionMaterial.uniforms.envMap.value = envFBO.texture;
    refractionMaterial.uniforms.backfaceMap.value = backfaceFBO.texture;

    // Swap to refraction material
    for (const mesh of meshes) {
      mesh.material = refractionMaterial;
    }

    // Reset camera layers to render all for composite pass (except gizmos)
    layerCamera.layers.enableAll();
    // Exclude gizmos from DoF - they render after post-processing
    camera.layers.enableAll();
    camera.layers.disable(RENDER_LAYERS.GIZMOS);

    if (enableDepthOfField) {
      // Pass 3: Render composite to compositeFBO (with depth for DoF)
      // Gizmos are excluded via camera.layers.disable(GIZMOS)
      gl.setRenderTarget(compositeFBO);
      gl.clear();
      gl.render(bgScene, orthoCamera);
      gl.clearDepth();
      gl.render(scene, camera);

      // Restore original materials
      for (const mesh of meshes) {
        const original = meshDataRef.current.get(mesh);
        if (original) {
          mesh.material = original;
        }
      }

      // Pass 4: Apply depth of field and render to screen
      gl.setRenderTarget(null);
      gl.clear();
      dofMaterial.uniforms.colorTexture.value = compositeFBO.texture;
      dofMaterial.uniforms.depthTexture.value = compositeFBO.depthTexture;
      gl.render(dofScene, orthoCamera);

      // Pass 5: Render gizmos directly to screen (no DoF blur)
      // Re-enable gizmos layer and render only gizmos
      camera.layers.set(RENDER_LAYERS.GIZMOS);
      gl.render(scene, camera);
      // Restore camera to render all layers for next frame
      camera.layers.enableAll();
    } else {
      // Optimized path: Skip compositeFBO, render directly to screen (saves 1 FBO pass)
      gl.setRenderTarget(null);
      gl.clear();
      gl.render(bgScene, orthoCamera);
      gl.clearDepth();
      gl.render(scene, camera);

      // Restore original materials
      for (const mesh of meshes) {
        const original = meshDataRef.current.get(mesh);
        if (original) {
          mesh.material = original;
        }
      }

      // Render gizmos directly to screen (after main scene, no blur)
      camera.layers.set(RENDER_LAYERS.GIZMOS);
      gl.render(scene, camera);
      // Restore camera to render all layers for next frame
      camera.layers.enableAll();
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
