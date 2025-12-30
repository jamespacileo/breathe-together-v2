/**
 * CoreMaterial - Monument Valley inspired ceramic refraction material
 *
 * Uses the same multi-pass refraction pipeline as the orbiting shards,
 * but with white/cream color for a clean ceramic look.
 *
 * Visual characteristics:
 * - Frosted white/cream tint
 * - Matte ceramic body
 * - Illustrative rim lighting
 * - Top-down ambient simulation
 */

import { useFBO } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

interface CoreMaterialProps {
  /** Tint color for the ceramic look @default '#fffef7' (warm white) */
  tintColor?: string;
  /** Index of refraction @default 1.3 */
  ior?: number;
  /** Backface contribution to refraction @default 0.3 */
  backfaceIntensity?: number;
}

export function CoreMaterial({
  tintColor = '#fffef7',
  ior = 1.3,
  backfaceIntensity = 0.3,
}: CoreMaterialProps) {
  const { camera, scene, gl, size } = useThree();
  const envFbo = useFBO(size.width, size.height);
  const backfaceFbo = useFBO(size.width, size.height);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Track disposed materials to prevent useFrame access after cleanup
  const disposedMaterialsRef = useRef(new WeakSet<THREE.Material>());

  // Convert hex color to RGB values
  const colorVec = useMemo(() => {
    const col = new THREE.Color(tintColor);
    return new THREE.Vector3(col.r, col.g, col.b);
  }, [tintColor]);

  // Background scene for refraction sampling
  const bgScene = useMemo(() => {
    const bgScene = new THREE.Scene();

    const bgMaterial = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        void main() {
          // Monument Valley palette
          vec3 top = vec3(0.98, 0.96, 0.93);
          vec3 bottom = vec3(0.95, 0.85, 0.80);

          float t = smoothstep(0.0, 1.0, vUv.y);
          vec3 color = mix(bottom, top, t);

          float noise = (fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.03;

          gl_FragColor = vec4(color + noise, 1.0);
        }
      `,
      depthTest: false,
      depthWrite: false,
    });
    const bgMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMaterial);
    bgScene.add(bgMesh);

    return bgScene;
  }, []);

  const orthoCamera = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), []);

  // Backface normal capture material
  const backfaceMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: `
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec3 vNormal;
          void main() {
            gl_FragColor = vec4(vNormal * 0.5 + 0.5, 1.0);
          }
        `,
        side: THREE.BackSide,
      }),
    [],
  );

  // Main refraction shader
  const refractionMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          envMap: { value: envFbo.texture },
          backfaceMap: { value: backfaceFbo.texture },
          resolution: { value: new THREE.Vector2(size.width, size.height) },
          ior: { value: ior },
          backfaceIntensity: { value: backfaceIntensity },
          uColor: { value: colorVec },
        },
        vertexShader: `
          varying vec3 eyeVector;
          varying vec3 worldNormal;

          void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            eyeVector = normalize(worldPosition.xyz - cameraPosition);
            worldNormal = normalize((modelViewMatrix * vec4(normal, 0.0)).xyz);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D envMap;
          uniform sampler2D backfaceMap;
          uniform vec2 resolution;
          uniform float ior;
          uniform float backfaceIntensity;
          uniform vec3 uColor;

          varying vec3 worldNormal;
          varying vec3 eyeVector;

          void main() {
            vec2 uv = gl_FragCoord.xy / resolution;

            vec3 backfaceNormal = texture2D(backfaceMap, uv).rgb * 2.0 - 1.0;
            vec3 normal = normalize(worldNormal * (1.0 - backfaceIntensity) - backfaceNormal * backfaceIntensity);

            vec3 refracted = refract(eyeVector, normal, 1.0 / ior);

            vec2 refractUv = uv + refracted.xy * 0.05;
            vec4 tex = texture2D(envMap, refractUv);

            // 1. FROSTED TINT: White/cream glass filter
            vec3 tintedRefraction = tex.rgb * mix(vec3(1.0), uColor, 0.3);

            // 2. MATTE BODY: Semi-opaque ceramic look
            vec3 bodyColor = mix(tintedRefraction, uColor, 0.15);

            // 3. ILLUSTRATIVE RIM: Sharp white fresnel
            float fresnel = pow(1.0 - clamp(dot(normal, -eyeVector), 0.0, 1.0), 3.0);

            // 4. SOFT TOP-DOWN LIGHT
            float topLight = smoothstep(0.0, 1.0, normal.y) * 0.1;

            vec3 finalColor = mix(bodyColor, vec3(1.0), fresnel * 0.4);
            finalColor += vec3(1.0) * topLight;

            gl_FragColor = vec4(finalColor, 1.0);
          }
        `,
        transparent: false,
      }),
    [
      envFbo.texture,
      backfaceFbo.texture,
      size.width,
      size.height,
      ior,
      backfaceIntensity,
      colorVec,
    ],
  );

  // Update resolution uniform when size changes
  useEffect(() => {
    if (refractionMaterial.uniforms.resolution) {
      refractionMaterial.uniforms.resolution.value.set(size.width, size.height);
    }
  }, [size.width, size.height, refractionMaterial]);

  // GPU memory cleanup
  useEffect(() => {
    return () => {
      disposedMaterialsRef.current.add(backfaceMaterial);
      disposedMaterialsRef.current.add(refractionMaterial);
      backfaceMaterial.dispose();
      refractionMaterial.dispose();
      envFbo.dispose();
      backfaceFbo.dispose();

      bgScene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (obj.material instanceof THREE.Material) {
            obj.material.dispose();
          }
        }
      });
    };
  }, [backfaceMaterial, refractionMaterial, envFbo, backfaceFbo, bgScene]);

  // Multi-pass render pipeline
  useFrame(() => {
    if (disposedMaterialsRef.current.has(refractionMaterial)) return;

    const mesh = scene.getObjectByName('Core Mesh') as THREE.Mesh;
    if (!mesh) return;

    const originalMaterial = mesh.material;
    const originalVisible = mesh.visible;

    // Pass 1: Render background gradient to envFbo
    gl.setRenderTarget(envFbo);
    gl.clear();
    gl.render(bgScene, orthoCamera);

    // Pass 2: Render backface normals to backfaceFbo
    mesh.material = backfaceMaterial;
    mesh.visible = true;
    gl.setRenderTarget(backfaceFbo);
    gl.clear();
    gl.render(scene, camera);

    // Restore original material
    mesh.material = originalMaterial;
    mesh.visible = originalVisible;
    gl.setRenderTarget(null);
  });

  return <primitive object={refractionMaterial} ref={materialRef} attach="material" />;
}
