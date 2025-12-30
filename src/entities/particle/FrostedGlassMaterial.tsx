/**
 * FrostedGlassMaterial - Monument Valley inspired illustrative glass
 *
 * Uses a multi-pass rendering approach:
 * 1. Backface normal pass: Renders backface normals to FBO for accurate refraction
 * 2. Refraction pass: Combines front/back normals for realistic glass distortion
 *
 * Visual characteristics:
 * - Frosted tint: Background tinted by mood color (colored glass filter)
 * - Matte body: Semi-opaque/milky appearance
 * - Illustrative rim: Sharp white edges (fresnel effect)
 * - Soft top-down light: Ambient environment simulation
 */

import { useFBO } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

// Vertex shader: Passes color, eye vector, and world normal to fragment
const vertexShader = /* glsl */ `
  attribute vec3 instanceColor;
  varying vec3 vColor;
  varying vec3 eyeVector;
  varying vec3 worldNormal;

  void main() {
    vColor = instanceColor;
    vec4 worldPosition = modelMatrix * instanceMatrix * vec4(position, 1.0);
    eyeVector = normalize(worldPosition.xyz - cameraPosition);
    worldNormal = normalize((modelViewMatrix * instanceMatrix * vec4(normal, 0.0)).xyz);
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;

// Backface vertex shader: Outputs normals for backface pass
const backfaceVertexShader = /* glsl */ `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * (instanceMatrix * vec4(normal, 0.0)).xyz);
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;

// Backface fragment shader: Encodes normal in RGB
const backfaceFragmentShader = /* glsl */ `
  varying vec3 vNormal;
  void main() {
    gl_FragColor = vec4(vNormal * 0.5 + 0.5, 1.0);
  }
`;

// Main refraction fragment shader: Creates the frosted glass effect
const refractionFragmentShader = /* glsl */ `
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

    // Decode backface normal from FBO
    vec3 backfaceNormal = texture2D(backfaceMap, uv).rgb * 2.0 - 1.0;

    // Combine front and back normals for accurate refraction
    vec3 normal = normalize(worldNormal * (1.0 - backfaceIntensity) - backfaceNormal * backfaceIntensity);
    vec3 refracted = refract(eyeVector, normal, 1.0 / ior);

    // Very subtle distortion for a clean, polished look
    vec2 refractUv = uv + refracted.xy * 0.05;
    vec4 tex = texture2D(envMap, refractUv);

    // 1. FROSTED TINT:
    // Multiply the refraction by the mood color (colored glass filter effect)
    vec3 tintedRefraction = tex.rgb * mix(vec3(1.0), vColor, 0.5);

    // 2. MATTE BODY:
    // Mix in the raw solid color for semi-opaque/milky look
    vec3 bodyColor = mix(tintedRefraction, vColor, 0.25);

    // 3. ILLUSTRATIVE RIM:
    // Sharp white rim to mimic Monument Valley's clean edges
    float fresnel = pow(1.0 - clamp(dot(normal, -eyeVector), 0.0, 1.0), 3.0);

    // 4. SOFT TOP-DOWN LIGHT:
    // Simulates ambient environment lighting
    float topLight = smoothstep(0.0, 1.0, normal.y) * 0.1;

    vec3 finalColor = mix(bodyColor, vec3(1.0), fresnel * 0.4);
    finalColor += vec3(1.0) * topLight;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

interface FrostedGlassMaterialProps {
  /** Index of refraction - higher values increase distortion */
  ior?: number;
  /** How much backface normals affect refraction (0-1) */
  backfaceIntensity?: number;
}

export function FrostedGlassMaterial({
  ior = 1.3,
  backfaceIntensity = 0.3,
}: FrostedGlassMaterialProps) {
  const { camera, scene, gl, size } = useThree();
  const backfaceFbo = useFBO(size.width, size.height);
  const envFbo = useFBO(size.width, size.height);

  const materialRef = useRef<THREE.ShaderMaterial>(null);
  // Track disposed materials to avoid race conditions
  const disposedMaterialsRef = useRef(new WeakSet<THREE.Material>());

  // Backface material: Renders normals to FBO
  const backfaceMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: backfaceVertexShader,
        fragmentShader: backfaceFragmentShader,
        side: THREE.BackSide,
      }),
    [],
  );

  // Main refraction material
  const refractionMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          envMap: { value: envFbo.texture },
          backfaceMap: { value: backfaceFbo.texture },
          resolution: { value: new THREE.Vector2(size.width, size.height) },
          ior: { value: ior },
          backfaceIntensity: { value: backfaceIntensity },
        },
        vertexShader: vertexShader,
        fragmentShader: refractionFragmentShader,
        transparent: false,
      }),
    [envFbo, backfaceFbo, ior, backfaceIntensity, size.width, size.height],
  );

  // Update resolution when window resizes
  useEffect(() => {
    if (refractionMaterial.uniforms) {
      refractionMaterial.uniforms.resolution.value.set(size.width, size.height);
    }
    envFbo.setSize(size.width, size.height);
    backfaceFbo.setSize(size.width, size.height);
  }, [size.width, size.height, refractionMaterial, envFbo, backfaceFbo]);

  // GPU memory cleanup
  useEffect(() => {
    return () => {
      disposedMaterialsRef.current.add(backfaceMaterial);
      disposedMaterialsRef.current.add(refractionMaterial);
      backfaceMaterial.dispose();
      refractionMaterial.dispose();
      backfaceFbo.dispose();
      envFbo.dispose();
    };
  }, [backfaceMaterial, refractionMaterial, backfaceFbo, envFbo]);

  // Multi-pass rendering each frame
  useFrame(() => {
    // Prevent rendering with disposed materials
    if (disposedMaterialsRef.current.has(refractionMaterial)) return;

    const mesh = scene.getObjectByName('Particle Swarm Mesh') as THREE.InstancedMesh;
    if (!mesh) return;

    const originalMaterial = mesh.material;

    // Pass 1: Render scene background to envFbo (for refraction source)
    mesh.visible = false;
    gl.setRenderTarget(envFbo);
    gl.clear();
    gl.render(scene, camera);
    mesh.visible = true;

    // Pass 2: Render backface normals to backfaceFbo
    mesh.material = backfaceMaterial;
    gl.setRenderTarget(backfaceFbo);
    gl.clear();
    gl.render(scene, camera);

    // Restore original material for main render
    mesh.material = originalMaterial;
    gl.setRenderTarget(null);
  });

  return <primitive object={refractionMaterial} ref={materialRef} attach="material" />;
}
