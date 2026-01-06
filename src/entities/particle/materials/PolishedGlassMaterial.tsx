/**
 * PolishedGlassMaterial - Realistic polished glass shader for icosahedral shards
 *
 * Features physical glass properties for a refined, jewel-like appearance:
 * - Schlick's approximation for realistic Fresnel reflectance
 * - Sharp specular highlights (pow 128) for polished surface
 * - High transparency (0.08-0.35 alpha) for true glass feel
 * - Subtle mood color accents (rim + inner core glow) for shard differentiation
 * - Breathing luminosity pulse synced to breath cycle
 * - Crisp edge definition with white edge glow
 * - Sun glint sparkle when light reflects toward camera
 *
 * Performance: Uses InstancedMesh for single draw call (300+ particles = 1 draw call)
 */

import * as THREE from 'three';

// Vertex shader - passes normals, view position, and pre-computed fresnel to fragment
const polishedVertexShader = /* glsl */ `
#include <common>
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vColor;
varying float vFresnel;

void main() {
  #ifdef USE_INSTANCING
    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    vec3 transformedNormal = mat3(normalMatrix) * mat3(instanceMatrix) * normal;
  #else
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vec3 transformedNormal = normalMatrix * normal;
  #endif

  vNormal = normalize(transformedNormal);

  // Use instance color from InstancedMesh (set via setColorAt)
  #ifdef USE_INSTANCING_COLOR
    vColor = instanceColor;
  #else
    vColor = vec3(1.0); // Fallback white
  #endif

  vViewPosition = -mvPosition.xyz;

  // Pre-compute basic fresnel in vertex shader for efficiency
  vec3 viewDir = normalize(vViewPosition);
  vFresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 3.0);

  gl_Position = projectionMatrix * mvPosition;
}
`;

// Fragment shader - polished glass with Schlick's Fresnel and sharp specular
const polishedFragmentShader = /* glsl */ `
uniform float breathPhase;
uniform float time;
uniform float ior;
uniform float coreRadius;
uniform float coreSoftness;
uniform float coreIntensity;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vColor;
varying float vFresnel;

void main() {
  vec3 viewDir = normalize(vViewPosition);
  vec3 normal = normalize(vNormal);

  // Polished glass base - much more transparent than frosted
  // Alpha ranges from 0.08 (center, very clear) to 0.35 (edges)
  float baseAlpha = mix(0.08, 0.35, vFresnel);

  // Subtle mood color tint - glass should be mostly clear
  // 12% color mix keeps clarity while allowing mood accents to read
  vec3 glassTint = mix(vec3(1.0), vColor, 0.12);

  // Schlick's approximation for realistic Fresnel reflectance
  // r0 = reflectance at normal incidence for glass (ior ~1.5)
  float r0 = pow((1.0 - ior) / (1.0 + ior), 2.0);
  float schlickFresnel = r0 + (1.0 - r0) * pow(1.0 - max(dot(normal, viewDir), 0.0), 5.0);

  // Breathing luminosity - subtle brightness pulse
  float breathHighlight = 1.0 + breathPhase * 0.08;

  // Edge glow for polished look - blend toward white at edges
  vec3 edgeColor = mix(glassTint, vec3(1.0), 0.5);
  vec3 colorWithEdge = mix(glassTint, edgeColor, schlickFresnel * 0.4);

  // Sharp specular highlight - polished surface reflects light sharply
  // Using fixed light direction aligned with environment key light
  vec3 lightDir = normalize(vec3(0.5, 0.8, 0.3));
  vec3 halfVec = normalize(lightDir + viewDir);
  float spec = pow(max(dot(normal, halfVec), 0.0), 128.0);
  colorWithEdge += vec3(1.0) * spec * 0.25;

  // Mood accent rim - thin, elegant edge coloration to differentiate shards
  float moodRim = pow(schlickFresnel, 1.25);
  colorWithEdge += vColor * moodRim * 0.22;

  // Inner mood core - centered glow that reads through the glass
  float facing = clamp(dot(normal, viewDir), 0.0, 1.0);
  float coreMask = smoothstep(coreRadius, coreRadius + coreSoftness, facing);
  coreMask = pow(coreMask, 1.4);
  colorWithEdge += vColor * coreMask * coreIntensity;

  // Sun glint sparkle - appears when reflection aligns with the camera
  vec3 reflectDir = reflect(-lightDir, normal);
  float glint = pow(max(dot(reflectDir, viewDir), 0.0), 240.0);
  float sparkle = glint * (0.7 + 0.3 * sin(time * 6.0 + dot(normal, vec3(2.2, 1.7, 1.3)) * 6.0));
  vec3 glintColor = mix(vec3(1.0), vColor, 0.2);
  colorWithEdge += glintColor * sparkle * 0.6;

  // Final color with breathing pulse
  vec3 finalColor = colorWithEdge * breathHighlight;

  // Final alpha with slight fresnel boost for edge definition
  float finalAlpha = baseAlpha + vFresnel * 0.14 + coreMask * coreIntensity * 0.06;

  gl_FragColor = vec4(finalColor, finalAlpha);
}
`;

/**
 * Creates a polished glass shader material for icosahedral shards
 *
 * Returns a ShaderMaterial with:
 * - Schlick's Fresnel approximation (physically accurate reflectance)
 * - Sharp specular highlights (pow 128)
 * - High transparency for true glass feel
 * - Per-instance color support (via USE_INSTANCING_COLOR define)
 *
 * @param instanced - Whether to enable instancing color support (default: true)
 * @param ior - Index of refraction (default: 1.5 for glass)
 */
export function createPolishedGlassMaterial(instanced = true, ior = 1.5): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      breathPhase: { value: 0 },
      time: { value: 0 },
      ior: { value: ior },
      coreRadius: { value: 0.5 },
      coreSoftness: { value: 0.25 },
      coreIntensity: { value: 0.5 },
    },
    vertexShader: polishedVertexShader,
    fragmentShader: polishedFragmentShader,
    defines: instanced ? { USE_INSTANCING_COLOR: '' } : {},
    side: THREE.FrontSide, // Icosahedra are convex - backfaces never visible
    transparent: true, // Enable alpha blending for glass transparency
    depthWrite: false, // Avoid occluding inner glow cores
    depthTest: true, // Enable depth testing to cull occluded fragments
    blending: THREE.NormalBlending, // Standard transparency blending
  });
}
