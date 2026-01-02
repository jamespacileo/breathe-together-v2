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

// Depth of Field + Cinematic Effects fragment shader
// Features: DOF, bloom, color grading, vignette, film grain, chromatic aberration
const dofFragmentShader = `
uniform sampler2D colorTexture;
uniform sampler2D depthTexture;
uniform float focusDistance;    // Focus distance in world units (normalized 0-1)
uniform float focalRange;       // Range around focus that stays sharp
uniform float maxBlur;          // Maximum blur radius
uniform float cameraNear;
uniform float cameraFar;
uniform vec2 resolution;
uniform float time;             // For breathing sync and grain animation

// Cinematic effect uniforms
uniform float bloomIntensity;
uniform float bloomThreshold;
uniform float vignetteIntensity;
uniform float grainIntensity;
uniform float chromaticAberration;
uniform float colorTemperature;  // -1 = cool (blue), +1 = warm (orange)

varying vec2 vUv;

// === BREATHING CALCULATION (UTC-synced, same as JS) ===
// 4-7-8 breathing: 4s inhale, 7s hold, 8s exhale = 19s cycle
const float INHALE_DURATION = 4.0;
const float HOLD_IN_DURATION = 7.0;
const float EXHALE_DURATION = 8.0;
const float TOTAL_CYCLE = 19.0;

float getBreathPhase() {
  float cycleTime = mod(time, TOTAL_CYCLE);

  if (cycleTime < INHALE_DURATION) {
    // Inhale: 0 → 1 with ease-in-out
    float t = cycleTime / INHALE_DURATION;
    return t * t * (3.0 - 2.0 * t); // smoothstep easing
  } else if (cycleTime < INHALE_DURATION + HOLD_IN_DURATION) {
    // Hold-in: stay near 1
    return 1.0;
  } else {
    // Exhale: 1 → 0 with ease-in-out
    float t = (cycleTime - INHALE_DURATION - HOLD_IN_DURATION) / EXHALE_DURATION;
    return 1.0 - t * t * (3.0 - 2.0 * t);
  }
}

// 0 = inhale, 1 = hold-in, 2 = exhale
int getPhaseType() {
  float cycleTime = mod(time, TOTAL_CYCLE);
  if (cycleTime < INHALE_DURATION) return 0;
  if (cycleTime < INHALE_DURATION + HOLD_IN_DURATION) return 1;
  return 2;
}

// Convert depth buffer value to linear depth
float linearizeDepth(float depth) {
  float z = depth * 2.0 - 1.0; // Back to NDC
  return (2.0 * cameraNear * cameraFar) / (cameraFar + cameraNear - z * (cameraFar - cameraNear));
}

// === BLUR FUNCTIONS ===
vec3 boxBlur(vec2 uv, float radius) {
  vec3 color = vec3(0.0);
  float count = 0.0;
  vec2 texelSize = 1.0 / resolution;

  for (float x = -3.0; x <= 3.0; x += 1.0) {
    for (float y = -3.0; y <= 3.0; y += 1.0) {
      vec2 offset = vec2(x, y) * texelSize * radius;
      if (length(vec2(x, y)) <= 3.0) {
        color += texture2D(colorTexture, uv + offset).rgb;
        count += 1.0;
      }
    }
  }
  return color / count;
}

// Smaller blur for bloom
vec3 smallBlur(vec2 uv, float radius) {
  vec3 color = vec3(0.0);
  float count = 0.0;
  vec2 texelSize = 1.0 / resolution;

  for (float x = -2.0; x <= 2.0; x += 1.0) {
    for (float y = -2.0; y <= 2.0; y += 1.0) {
      vec2 offset = vec2(x, y) * texelSize * radius;
      color += texture2D(colorTexture, uv + offset).rgb;
      count += 1.0;
    }
  }
  return color / count;
}

// === FILM GRAIN ===
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float grain(vec2 uv, float t) {
  return hash(uv * resolution + fract(t * 100.0)) * 2.0 - 1.0;
}

// === COLOR GRADING ===
vec3 applyColorTemperature(vec3 color, float temp) {
  // temp: -1 = cool blue, +1 = warm orange
  vec3 cool = vec3(0.9, 0.95, 1.1);   // Blue shift
  vec3 warm = vec3(1.1, 1.0, 0.9);    // Orange shift
  vec3 tint = mix(cool, warm, temp * 0.5 + 0.5);
  return color * tint;
}

// Subtle color grading synced to breathing
vec3 colorGrade(vec3 color, float breathPhase) {
  // Very subtle shadow lift during exhale (relaxation) - reduced
  float shadowLift = mix(0.0, 0.008, 1.0 - breathPhase);
  color = color + shadowLift * (1.0 - color);

  // Minimal contrast adjustment - almost imperceptible
  float contrast = mix(1.0, 0.98, 1.0 - breathPhase);
  color = (color - 0.5) * contrast + 0.5;

  return color;
}

void main() {
  float breathPhase = getBreathPhase();

  // === CHROMATIC ABERRATION ===
  // Subtle RGB split that increases slightly during transitions
  float aberrationAmount = chromaticAberration * (1.0 + (1.0 - abs(breathPhase * 2.0 - 1.0)) * 0.3);
  vec2 aberrationOffset = (vUv - 0.5) * aberrationAmount * 0.003;

  // === DEPTH OF FIELD ===
  float depth = texture2D(depthTexture, vUv).r;
  float linearDepth = linearizeDepth(depth);
  float normalizedDepth = (linearDepth - cameraNear) / (cameraFar - cameraNear);

  // DOF intensity varies slightly with breathing
  float dynamicFocalRange = focalRange * mix(1.0, 1.15, 1.0 - breathPhase);
  float distanceBeyondFocus = max(0.0, normalizedDepth - focusDistance);
  float coc = smoothstep(0.0, dynamicFocalRange, distanceBeyondFocus) * maxBlur;

  // Sample with chromatic aberration
  vec3 color;
  if (coc < 0.5) {
    // Sharp with subtle chromatic aberration
    float r = texture2D(colorTexture, vUv + aberrationOffset).r;
    float g = texture2D(colorTexture, vUv).g;
    float b = texture2D(colorTexture, vUv - aberrationOffset).b;
    color = vec3(r, g, b);
  } else {
    // Blur - chromatic aberration baked into blur
    vec3 blurred = boxBlur(vUv, coc);
    float r = boxBlur(vUv + aberrationOffset, coc).r;
    float b = boxBlur(vUv - aberrationOffset, coc).b;
    color = vec3(r, blurred.g, b);
  }

  // === BLOOM ===
  // Extract only very bright areas and add subtle glow
  vec3 bloomColor = smallBlur(vUv, 3.0);
  float brightness = dot(bloomColor, vec3(0.299, 0.587, 0.114));
  float bloomMask = smoothstep(bloomThreshold, bloomThreshold + 0.15, brightness);

  // Bloom intensity pulses subtly with breathing
  float dynamicBloom = bloomIntensity * mix(0.9, 1.1, breathPhase);
  // Use screen blend instead of additive to prevent blowout
  vec3 bloomContrib = bloomColor * bloomMask * dynamicBloom;
  color = color + bloomContrib * (1.0 - color * 0.5);

  // === COLOR TEMPERATURE ===
  // Subtle warm during exhale, neutral during inhale
  float breathTemp = mix(-0.05, 0.1, 1.0 - breathPhase); // Much subtler range
  color = applyColorTemperature(color, colorTemperature + breathTemp);

  // === COLOR GRADING ===
  color = colorGrade(color, breathPhase);

  // === VIGNETTE ===
  // Cinematic dark edges that intensify during exhale
  vec2 vignetteUv = vUv - 0.5;
  float vignetteDist = length(vignetteUv * vec2(1.0, resolution.y / resolution.x));
  float dynamicVignette = vignetteIntensity * mix(0.9, 1.1, 1.0 - breathPhase);
  float vignette = 1.0 - smoothstep(0.3, 0.9, vignetteDist) * dynamicVignette;
  color *= vignette;

  // Subtle warm tint at edges (cinematic look)
  vec3 vignetteColor = vec3(0.95, 0.9, 0.85);
  color = mix(color, color * vignetteColor, (1.0 - vignette) * 0.3);

  // === FILM GRAIN ===
  // Organic texture that's subtle during inhale, slightly more visible during exhale
  float dynamicGrain = grainIntensity * mix(0.7, 1.0, 1.0 - breathPhase);
  float grainValue = grain(vUv, time) * dynamicGrain * 0.03;
  color += grainValue;

  // === FINAL OUTPUT ===
  // Very subtle tone compression - preserves original colors
  // Only compress extreme highlights to prevent blowout
  vec3 compressed = color / (color * 0.15 + 1.0);
  color = mix(color, compressed, 0.3); // Blend 30% compressed

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
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

  // === CINEMATIC EFFECTS ===
  /**
   * Bloom glow intensity. Adds ethereal, dreamy quality.
   * @min 0 @max 1 @step 0.05
   * @default 0.35
   */
  bloomIntensity?: number;
  /**
   * Brightness threshold for bloom extraction. Lower = more glow.
   * @min 0.3 @max 0.9 @step 0.05
   * @default 0.6
   */
  bloomThreshold?: number;
  /**
   * Vignette darkness at edges. Creates cinematic focus.
   * @min 0 @max 1 @step 0.05
   * @default 0.4
   */
  vignetteIntensity?: number;
  /**
   * Film grain intensity. Adds organic, analog texture.
   * @min 0 @max 1 @step 0.05
   * @default 0.3
   */
  grainIntensity?: number;
  /**
   * Chromatic aberration strength. Subtle lens effect.
   * @min 0 @max 1 @step 0.05
   * @default 0.2
   */
  chromaticAberration?: number;
  /**
   * Color temperature shift. Negative = cool, positive = warm.
   * @min -1 @max 1 @step 0.1
   * @default 0.1
   */
  colorTemperature?: number;

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
  // Cinematic effects - tuned for subtlety
  bloomIntensity = 0.15, // Reduced from 0.35
  bloomThreshold = 0.75, // Raised from 0.6 (less bloom)
  vignetteIntensity = 0.25, // Reduced from 0.4
  grainIntensity = 0.15, // Reduced from 0.3
  chromaticAberration = 0.1, // Reduced from 0.2
  colorTemperature = 0.05, // Reduced from 0.1
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

  // Create DoF scene for final composite (includes cinematic effects)
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
        // Time for breathing sync and grain animation
        time: { value: 0 },
        // Cinematic effects
        bloomIntensity: { value: bloomIntensity },
        bloomThreshold: { value: bloomThreshold },
        vignetteIntensity: { value: vignetteIntensity },
        grainIntensity: { value: grainIntensity },
        chromaticAberration: { value: chromaticAberration },
        colorTemperature: { value: colorTemperature },
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
    bloomIntensity,
    bloomThreshold,
    vignetteIntensity,
    grainIntensity,
    chromaticAberration,
    colorTemperature,
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

  // Update DoF and cinematic uniforms when props change
  useEffect(() => {
    dofMaterial.uniforms.focusDistance.value = focusDistance / perspCamera.far;
    dofMaterial.uniforms.focalRange.value = focalRange / perspCamera.far;
    dofMaterial.uniforms.maxBlur.value = maxBlur;
    dofMaterial.uniforms.cameraNear.value = perspCamera.near;
    dofMaterial.uniforms.cameraFar.value = perspCamera.far;
    // Cinematic effects
    dofMaterial.uniforms.bloomIntensity.value = bloomIntensity;
    dofMaterial.uniforms.bloomThreshold.value = bloomThreshold;
    dofMaterial.uniforms.vignetteIntensity.value = vignetteIntensity;
    dofMaterial.uniforms.grainIntensity.value = grainIntensity;
    dofMaterial.uniforms.chromaticAberration.value = chromaticAberration;
    dofMaterial.uniforms.colorTemperature.value = colorTemperature;
  }, [
    focusDistance,
    focalRange,
    maxBlur,
    perspCamera.near,
    perspCamera.far,
    dofMaterial,
    bloomIntensity,
    bloomThreshold,
    vignetteIntensity,
    grainIntensity,
    chromaticAberration,
    colorTemperature,
  ]);

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

  // Cache refraction meshes (refreshed when count changes or meshes become stale)
  const refractionMeshesRef = useRef<THREE.Mesh[]>([]);

  // Frame counter for throttled mesh detection (check every 30 frames instead of every frame)
  const frameCountRef = useRef(0);
  const MESH_CHECK_INTERVAL = 30;

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

  // 4-pass rendering loop
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Multi-pass refraction pipeline requires mesh detection, material swapping, 4 FBO passes, and DoF toggle - splitting would reduce readability of the sequential rendering logic
  useFrame(() => {
    frameCountRef.current++;

    // Update time for breathing sync and cinematic effects (uses Date.now for UTC sync)
    dofMaterial.uniforms.time.value = Date.now() / 1000;

    // Throttled mesh detection: only check every N frames to reduce scene traversal overhead
    // This reduces O(n) traversal from 60fps to ~2fps while still detecting dynamic additions
    if (frameCountRef.current % MESH_CHECK_INTERVAL === 0) {
      // Quick stale check first (O(cached) instead of O(scene))
      let needsRefresh = false;
      for (const mesh of refractionMeshesRef.current) {
        if (!mesh.parent || !mesh.userData.useRefraction) {
          needsRefresh = true;
          break;
        }
      }

      // Full scene traversal only when needed or periodically
      if (needsRefresh || refractionMeshesRef.current.length === 0) {
        const newMeshes: THREE.Mesh[] = [];
        scene.traverse((obj) => {
          if (obj instanceof THREE.Mesh && obj.userData.useRefraction) {
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
