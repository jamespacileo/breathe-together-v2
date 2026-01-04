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

// Refraction fragment shader - Kurzgesagt-inspired vibrant crystal glass
// Updated Jan 2026: Preserves color vibrancy while adding glass transparency
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

  // Moderate refraction distortion
  vec2 refractUv = uv + refracted.xy * 0.06;
  vec4 tex = texture2D(envMap, refractUv);

  // === FRESNEL - key to glass effect ===
  float fresnel = pow(1.0 - clamp(dot(normal, -eyeVector), 0.0, 1.0), 2.5);

  // === PRESERVE COLOR VIBRANCY ===
  // Boost the input color to compensate for blending losses
  vec3 vibrantColor = vColor * 1.3;

  // === CRYSTAL EDGE GLOW ===
  // Edges catch light - mix of white and boosted color
  vec3 warmWhite = vec3(1.0, 0.98, 0.95);
  vec3 edgeColor = mix(warmWhite, vibrantColor, 0.5);

  // === TRANSPARENT CENTER with color tint ===
  // Centers show refracted background tinted with the shard color
  vec3 tintedRefraction = tex.rgb * 0.4 + vibrantColor * 0.6;

  // === FACETED SHADING for dimension ===
  float diffuse = max(dot(normal, keyLightDir), 0.0);
  float wrapped = diffuse * 0.4 + 0.6; // Higher base = brighter overall

  // === GLASS BODY - vibrant color dominant ===
  vec3 bodyColor = vibrantColor * wrapped;

  // Add subtle refraction for depth
  bodyColor = mix(bodyColor, tintedRefraction, 0.25);

  // === FRESNEL BLEND ===
  // Edges: bright white/tinted glow
  // Centers: vibrant body color
  vec3 glassColor = mix(bodyColor, edgeColor, fresnel * 0.6);

  // === SPECULAR HIGHLIGHTS (crystal sparkle) ===
  vec3 halfVec = normalize(keyLightDir - eyeVector);
  float spec = pow(max(dot(normal, halfVec), 0.0), 48.0);
  glassColor += warmWhite * spec * 0.5;

  // === SECONDARY SPECULAR ===
  vec3 halfVec2 = normalize(vec3(-0.3, 0.8, 0.3) - eyeVector);
  float spec2 = pow(max(dot(normal, halfVec2), 0.0), 32.0);
  glassColor += warmWhite * spec2 * 0.25;

  // === RIM HIGHLIGHT - bright edges ===
  glassColor += edgeColor * fresnel * 0.35;

  // === INNER GLOW - color from within ===
  float innerGlow = (1.0 - fresnel) * 0.2;
  glassColor += vibrantColor * innerGlow;

  // === TOP AMBIENT ===
  float topLight = max(normal.y, 0.0) * 0.1;
  glassColor += warmWhite * topLight;

  gl_FragColor = vec4(min(glassColor, vec3(1.0)), 1.0);
}
`;

// Background gradient shader - Kurzgesagt + painted night sky aesthetic
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

// Hash for pseudo-random values
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

// Smooth noise
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// FBM for soft cloud-like shapes
float fbm(vec2 p) {
  float f = 0.0;
  f += 0.5000 * noise(p); p *= 2.02;
  f += 0.2500 * noise(p); p *= 2.03;
  f += 0.1250 * noise(p); p *= 2.01;
  f += 0.0625 * noise(p);
  return f / 0.9375;
}

// Star function
float star(vec2 uv, float scale, float threshold) {
  vec2 grid = floor(uv * scale);
  vec2 gridUv = fract(uv * scale);
  float h = hash(grid);
  if (h > threshold) {
    vec2 starPos = vec2(hash(grid + 0.1), hash(grid + 0.2));
    float dist = length(gridUv - starPos);
    float brightness = (h - threshold) / (1.0 - threshold);
    // Soft glowing star with diffuse halo
    float core = smoothstep(0.02, 0.0, dist);
    float glow = smoothstep(0.08, 0.0, dist) * 0.5;
    return (core + glow) * brightness;
  }
  return 0.0;
}

void main() {
  vec2 uv = vUv;
  vec2 center = uv - 0.5;
  float dist = length(center);

  // === KURZGESAGT NIGHT SKY PALETTE ===
  // Rich, saturated colors that feel painted
  vec3 deepIndigo = vec3(0.05, 0.03, 0.12);     // Deep indigo base
  vec3 midnightBlue = vec3(0.08, 0.06, 0.18);   // Rich midnight blue
  vec3 cosmicPurple = vec3(0.12, 0.05, 0.20);   // Kurzgesagt purple
  vec3 darkTeal = vec3(0.03, 0.08, 0.12);       // Dark teal accent
  vec3 warmDust = vec3(0.15, 0.08, 0.10);       // Warm dust tone

  // === PAINTERLY BASE GRADIENT ===
  // Multi-stop gradient for depth
  float radialT = smoothstep(0.0, 0.8, dist);
  vec3 baseColor = mix(midnightBlue, deepIndigo, radialT);

  // Add purple warmth toward one side (like light pollution glow)
  float warmSide = smoothstep(0.0, 1.0, uv.x * 0.5 + uv.y * 0.5);
  baseColor = mix(baseColor, cosmicPurple, warmSide * 0.3);

  // === SOFT NEBULA CLOUDS ===
  // Large, soft nebula forms
  float slowTime = time * 0.02;

  // Primary nebula - large purple cloud
  vec2 nebula1Uv = uv * 1.5 + vec2(slowTime * 0.3, slowTime * 0.1);
  float nebula1 = fbm(nebula1Uv);
  nebula1 = smoothstep(0.35, 0.65, nebula1);
  vec3 nebula1Color = cosmicPurple * 1.5;

  // Secondary nebula - teal accent cloud
  vec2 nebula2Uv = uv * 2.0 + vec2(-slowTime * 0.2, slowTime * 0.15) + 50.0;
  float nebula2 = fbm(nebula2Uv);
  nebula2 = smoothstep(0.4, 0.7, nebula2);
  vec3 nebula2Color = darkTeal * 2.0;

  // Warm dust cloud (subtle)
  vec2 dustUv = uv * 2.5 + vec2(slowTime * 0.1, -slowTime * 0.2) + 100.0;
  float dust = fbm(dustUv);
  dust = smoothstep(0.45, 0.7, dust) * 0.5;
  vec3 dustColor = warmDust * 1.2;

  // Combine nebulae with soft blending
  vec3 nebulaColor = vec3(0.0);
  nebulaColor += nebula1Color * nebula1 * 0.4 * (1.0 - dist * 0.5);
  nebulaColor += nebula2Color * nebula2 * 0.3 * smoothstep(0.8, 0.3, dist);
  nebulaColor += dustColor * dust * 0.25;

  // === STAR FIELD ===
  // Multiple layers for depth and variety
  float stars = 0.0;

  // Dense small stars (distant)
  stars += star(uv, 200.0, 0.97) * 0.4;
  stars += star(uv + 0.33, 150.0, 0.975) * 0.5;

  // Medium stars
  stars += star(uv + 0.66, 80.0, 0.985) * 0.7;

  // Bright stars (rare)
  stars += star(uv + 0.99, 40.0, 0.993) * 1.0;

  // Very bright accent stars
  stars += star(uv + 1.33, 20.0, 0.997) * 1.3;

  // Star color - slight variation
  vec3 starColor = vec3(0.95, 0.97, 1.0) * stars;

  // Some warm stars
  float warmStarMask = step(0.95, hash(floor(uv * 60.0)));
  starColor = mix(starColor, vec3(1.0, 0.9, 0.7) * stars, warmStarMask);

  // === MILKY WAY BAND ===
  // Soft diagonal band of increased star density
  float angle = 0.3;
  vec2 rotUv = vec2(
    uv.x * cos(angle) - uv.y * sin(angle),
    uv.x * sin(angle) + uv.y * cos(angle)
  );
  float bandDist = abs(rotUv.y - 0.5);
  float milkyWay = smoothstep(0.3, 0.0, bandDist);

  // Add extra stars in milky way
  float milkyStars = star(uv * 1.5, 300.0, 0.95) * milkyWay * 0.6;
  starColor += vec3(0.85, 0.88, 0.95) * milkyStars;

  // Soft glow in milky way
  vec3 milkyGlow = midnightBlue * 1.5 * milkyWay * 0.15;

  // === PAINTERLY TEXTURE ===
  // Subtle grain for painted look
  float grain = (hash(uv * 500.0 + time * 0.1) - 0.5) * 0.02;

  // Soft brush-stroke texture
  float brushNoise = fbm(uv * 8.0) * 0.03;

  // === VIGNETTE ===
  float vignette = 1.0 - smoothstep(0.3, 0.9, dist) * 0.4;

  // === COMBINE ALL LAYERS ===
  vec3 finalColor = baseColor;
  finalColor += nebulaColor;
  finalColor += milkyGlow;
  finalColor += starColor;
  finalColor += grain + brushNoise;
  finalColor *= vignette;

  // Slight color boost for Kurzgesagt vibrancy
  finalColor = pow(finalColor, vec3(0.95));

  gl_FragColor = vec4(finalColor, 1.0);
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
// Modified to NOT blur very distant objects (background, constellations, sun)
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

  // === BACKGROUND PROTECTION ===
  // Don't blur distant objects (constellations at 80 units, sun at ~78 units)
  // With camera far = 200, threshold of 0.3 = 60 units protects all background
  float backgroundThreshold = 0.3; // Objects beyond 30% of camera far plane stay sharp
  bool isBackground = normalizedDepth > backgroundThreshold || depth > 0.999;

  // Calculate circle of confusion (blur amount)
  // Only blur objects FURTHER than focus distance (behind the focal plane)
  // BUT NOT objects that are part of the background/environment
  float distanceBeyondFocus = max(0.0, normalizedDepth - focusDistance);

  // Smooth falloff - only applies to mid-range objects beyond focus
  float coc = smoothstep(0.0, focalRange, distanceBeyondFocus) * maxBlur;

  // Disable blur for background elements
  if (isBackground) {
    coc = 0.0;
  }

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
    // Background has subtle animation, cached at intervals for performance
    const framesSinceEnvRender = frameCountRef.current - envCacheFrameRef.current;
    if (envNeedsUpdateRef.current || framesSinceEnvRender >= ENV_CACHE_FRAMES) {
      // Update time uniform for background animation
      bgMaterial.uniforms.time.value = frameCountRef.current * 0.016; // ~60fps timing
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

    // Reset camera layers to render all for composite pass
    layerCamera.layers.enableAll();

    if (enableDepthOfField) {
      // Pass 3: Render composite to compositeFBO (with depth for DoF)
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
