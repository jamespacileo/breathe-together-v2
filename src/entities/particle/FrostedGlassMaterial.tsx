import { useFBO } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

interface FrostedGlassMaterialProps {
  ior?: number;
  backfaceIntensity?: number;
}

/**
 * FrostedGlassMaterial - Monument Valley inspired illustrative glass shader
 *
 * Multi-pass refraction pipeline:
 * 1. Render scene background to envFbo
 * 2. Render backface normals to backfaceFbo
 * 3. Final refraction pass with frosted tint
 *
 * Visual characteristics:
 * - Frosted tint: Mood color acts as colored glass filter
 * - Matte body: Semi-opaque milky appearance
 * - Illustrative rim: Sharp white fresnel edges
 * - Top-down light: Soft ambient simulation
 */
export function FrostedGlassMaterial({
  ior = 1.3,
  backfaceIntensity = 0.3,
}: FrostedGlassMaterialProps) {
  const { camera, scene, gl, size } = useThree();
  const envFbo = useFBO(size.width, size.height);
  const backfaceFbo = useFBO(size.width, size.height);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Track disposed materials to prevent useFrame access after cleanup
  const disposedMaterialsRef = useRef(new WeakSet<THREE.Material>());

  // Background render target for refraction sampling
  const bgScene = useMemo(() => {
    const bgScene = new THREE.Scene();

    // Create background gradient mesh (Monument Valley style)
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
          // Monument Valley "Valley" palette
          vec3 top = vec3(0.98, 0.96, 0.93);    // Off-white/Cream
          vec3 bottom = vec3(0.95, 0.85, 0.80); // Soft Terracotta/Peach

          float t = smoothstep(0.0, 1.0, vUv.y);
          vec3 color = mix(bottom, top, t);

          // Subtle noise for paper texture
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

  // Backface normal capture material (for thickness-aware refraction)
  const backfaceMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: `
          varying vec3 vNormal;
          void main() {
            // For instanced geometry: transform normal by instance matrix
            vNormal = normalize(normalMatrix * (instanceMatrix * vec4(normal, 0.0)).xyz);
            gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec3 vNormal;
          void main() {
            // Store normal in RGB (remapped from [-1,1] to [0,1])
            gl_FragColor = vec4(vNormal * 0.5 + 0.5, 1.0);
          }
        `,
        side: THREE.BackSide,
      }),
    [],
  );

  // Main refraction shader (matches reference HTML implementation)
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
        vertexShader: `
          attribute vec3 instanceColor;
          varying vec3 vColor;
          varying vec3 eyeVector;
          varying vec3 worldNormal;

          void main() {
            vColor = instanceColor;

            // For instanced geometry
            vec4 worldPosition = modelMatrix * instanceMatrix * vec4(position, 1.0);
            eyeVector = normalize(worldPosition.xyz - cameraPosition);

            // Transform normal with instance matrix
            mat3 normalMat = mat3(modelViewMatrix) * mat3(instanceMatrix);
            worldNormal = normalize(normalMat * normal);

            gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
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

            // Sample backface normal (remapped from [0,1] to [-1,1])
            vec3 backfaceNormal = texture2D(backfaceMap, uv).rgb * 2.0 - 1.0;

            // Combine front and back normals for thickness-aware refraction
            vec3 normal = normalize(worldNormal * (1.0 - backfaceIntensity) - backfaceNormal * backfaceIntensity);

            // Calculate refraction vector
            vec3 refracted = refract(eyeVector, normal, 1.0 / ior);

            // Very subtle distortion for clean, polished look
            vec2 refractUv = uv + refracted.xy * 0.05;
            vec4 tex = texture2D(envMap, refractUv);

            // 1. FROSTED TINT: Multiply refraction by mood color (colored glass filter)
            vec3 tintedRefraction = tex.rgb * mix(vec3(1.0), vColor, 0.5);

            // 2. MATTE BODY: Mix in raw solid color for semi-opaque/milky look
            vec3 bodyColor = mix(tintedRefraction, vColor, 0.25);

            // 3. ILLUSTRATIVE RIM: Sharp white fresnel for clean Monument Valley edges
            float fresnel = pow(1.0 - clamp(dot(normal, -eyeVector), 0.0, 1.0), 3.0);

            // 4. SOFT TOP-DOWN LIGHT: Simulates ambient environment
            float topLight = smoothstep(0.0, 1.0, normal.y) * 0.1;

            vec3 finalColor = mix(bodyColor, vec3(1.0), fresnel * 0.4);
            finalColor += vec3(1.0) * topLight;

            gl_FragColor = vec4(finalColor, 1.0);
          }
        `,
        transparent: false,
      }),
    [envFbo.texture, backfaceFbo.texture, size.width, size.height, ior, backfaceIntensity],
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

      // Dispose background scene resources
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

    const mesh = scene.getObjectByName('Particle Swarm Mesh') as THREE.InstancedMesh;
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

    // Pass 3: Final scene render with refraction material
    mesh.material = originalMaterial;
    mesh.visible = originalVisible;
    gl.setRenderTarget(null);
  });

  return <primitive object={refractionMaterial} ref={materialRef} attach="material" />;
}
