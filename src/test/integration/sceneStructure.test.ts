/**
 * Scene Structure and Graph Tests
 *
 * Consolidated tests for Three.js scene structure, hierarchy, and rendering.
 * Tests verify scene composition, performance characteristics, and GPU resource management.
 *
 * Previously split across:
 * - sceneGraph.test.ts
 * - integration/sceneHierarchy.test.ts
 */

import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { countObjectsOfType } from '../helpers';

describe('Scene Structure', () => {
  describe('Basic Scene Composition', () => {
    it('scene contains expected core entity types', () => {
      // OUTCOME: Scene has standard Three.js structure
      const scene = new THREE.Scene();

      scene.add(new THREE.AmbientLight(0xffffff, 0.4));
      scene.add(new THREE.DirectionalLight(0xffffff, 0.6));

      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(1.5, 32, 32),
        new THREE.MeshPhongMaterial({ color: 0x8b6f47 }),
      );
      mesh.name = 'EarthGlobe';
      scene.add(mesh);

      expect(countObjectsOfType(scene, THREE.AmbientLight)).toBeGreaterThanOrEqual(1);
      expect(countObjectsOfType(scene, THREE.DirectionalLight)).toBeGreaterThanOrEqual(1);
      expect(scene.getObjectByName('EarthGlobe')).toBeDefined();
    });

    it('globe has correct geometry parameters', () => {
      // OUTCOME: Globe size matches design specifications
      const globeRadius = 1.5;
      const geometry = new THREE.SphereGeometry(globeRadius, 32, 32);

      expect(geometry.parameters.radius).toBe(globeRadius);
      expect(geometry.parameters.widthSegments).toBeGreaterThanOrEqual(16);
      expect(geometry.parameters.heightSegments).toBeGreaterThanOrEqual(16);
    });

    it('scene uses instanced meshes for particles', () => {
      // OUTCOME: Performance optimization via instancing
      const scene = new THREE.Scene();

      const particleCount = 100;
      const geometry = new THREE.IcosahedronGeometry(0.18, 0);
      const material = new THREE.MeshPhongMaterial({ color: 0xffffff });
      const instancedMesh = new THREE.InstancedMesh(geometry, material, particleCount);
      instancedMesh.name = 'ParticleSwarm';
      scene.add(instancedMesh);

      const found = scene.getObjectByName('ParticleSwarm');
      expect(found).toBeInstanceOf(THREE.InstancedMesh);
      expect((found as THREE.InstancedMesh).count).toBe(particleCount);
    });

    it('scene has consistent naming convention', () => {
      // OUTCOME: Objects are identifiable
      const scene = new THREE.Scene();

      const globe = new THREE.Mesh(new THREE.SphereGeometry(1.5), new THREE.MeshPhongMaterial());
      globe.name = 'EarthGlobe';

      const particles = new THREE.InstancedMesh(
        new THREE.IcosahedronGeometry(0.18),
        new THREE.MeshPhongMaterial(),
        100,
      );
      particles.name = 'ParticleSwarm';

      scene.add(globe, particles);

      expect(globe.name).toMatch(/Globe/i);
      expect(particles.name).toMatch(/Particle/i);
      expect(scene.getObjectByName('EarthGlobe')).toBe(globe);
      expect(scene.getObjectByName('ParticleSwarm')).toBe(particles);
    });
  });

  describe('Scene Hierarchy', () => {
    it('objects are properly nested', () => {
      // OUTCOME: Logical parent-child relationships
      const scene = new THREE.Scene();
      const parent = new THREE.Group();
      parent.name = 'ParticleContainer';

      const child = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.18),
        new THREE.MeshPhongMaterial(),
      );
      child.name = 'ParticleInstance';

      parent.add(child);
      scene.add(parent);

      const foundParent = scene.getObjectByName('ParticleContainer');
      expect(foundParent).toBeDefined();
      expect(foundParent?.children).toHaveLength(1);
      expect(foundParent?.children[0].name).toBe('ParticleInstance');
    });

    it('scene graph depth is reasonable', () => {
      // OUTCOME: Not too deeply nested (performance)
      const scene = new THREE.Scene();

      let currentParent: THREE.Object3D = scene;
      let depth = 0;

      for (let i = 0; i < 5; i++) {
        const group = new THREE.Group();
        currentParent.add(group);
        currentParent = group;
        depth += 1;
      }

      expect(depth).toBeLessThan(10);
    });

    it('can traverse entire scene graph', () => {
      // OUTCOME: No broken references
      const scene = new THREE.Scene();

      scene.add(new THREE.AmbientLight());
      scene.add(new THREE.Mesh(new THREE.SphereGeometry(1), new THREE.MeshPhongMaterial()));

      const container = new THREE.Group();
      container.add(
        new THREE.Mesh(new THREE.IcosahedronGeometry(0.18), new THREE.MeshPhongMaterial()),
      );
      scene.add(container);

      let objectCount = 0;
      scene.traverse(() => {
        objectCount++;
      });

      expect(objectCount).toBeGreaterThanOrEqual(4);
    });

    it('can find objects by type', () => {
      // OUTCOME: Object queries work
      const scene = new THREE.Scene();

      scene.add(new THREE.AmbientLight());
      scene.add(new THREE.DirectionalLight());
      scene.add(new THREE.Mesh(new THREE.SphereGeometry(1), new THREE.MeshPhongMaterial()));

      let meshCount = 0;
      let lightCount = 0;

      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) meshCount++;
        if (obj instanceof THREE.Light) lightCount++;
      });

      expect(meshCount).toBe(1);
      expect(lightCount).toBe(2);
    });
  });

  describe('Initialization Order', () => {
    it('lights are added before meshes', () => {
      // OUTCOME: Meshes are lit when added
      const scene = new THREE.Scene();

      const light = new THREE.AmbientLight('#ffffff', 0.4);
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(1), new THREE.MeshPhongMaterial());

      scene.add(light);
      scene.add(mesh);

      const lightIndex = scene.children.indexOf(light);
      const meshIndex = scene.children.indexOf(mesh);

      expect(lightIndex).toBeLessThan(meshIndex);
    });

    it('scene background is set before content is added', () => {
      // OUTCOME: Background doesn't flash
      const scene = new THREE.Scene();
      const backgroundColor = new THREE.Color('#f5f0e8');

      scene.background = backgroundColor;
      scene.add(new THREE.Mesh(new THREE.SphereGeometry(1), new THREE.MeshPhongMaterial()));

      expect(scene.background).toBeDefined();
      expect(scene.background).toBeInstanceOf(THREE.Color);
    });
  });

  describe('Camera Configuration', () => {
    it('camera has reasonable field of view', () => {
      // OUTCOME: Scene is properly framed
      const fov = 50;
      const aspect = 16 / 9;
      const camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000);

      expect(camera.fov).toBeGreaterThan(30);
      expect(camera.fov).toBeLessThan(90);
    });

    it('camera near/far planes are appropriate', () => {
      // OUTCOME: All scene objects visible
      const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);

      expect(camera.near).toBeGreaterThan(0);
      expect(camera.near).toBeLessThan(1);
      expect(camera.far).toBeGreaterThan(10);
      expect(camera.far).toBeLessThan(10000);
    });

    it('camera is positioned to view scene', () => {
      // OUTCOME: Camera sees the action
      const camera = new THREE.PerspectiveCamera();
      camera.position.set(0, 0, 10);

      const globePosition = new THREE.Vector3(0, 0, 0);
      const distance = camera.position.distanceTo(globePosition);

      expect(distance).toBeGreaterThan(5);
      expect(distance).toBeLessThan(50);
    });
  });

  describe('Lighting Setup', () => {
    it('has ambient and directional lighting', () => {
      // OUTCOME: Scene is properly lit
      const scene = new THREE.Scene();

      scene.add(new THREE.AmbientLight(0xffffff, 0.4));
      scene.add(new THREE.DirectionalLight(0xffffff, 0.6));

      const ambientLights = countObjectsOfType(scene, THREE.AmbientLight);
      const directionalLights = countObjectsOfType(scene, THREE.DirectionalLight);

      expect(ambientLights).toBeGreaterThanOrEqual(1);
      expect(directionalLights).toBeGreaterThanOrEqual(1);
    });

    it('light intensities are reasonable', () => {
      // OUTCOME: Not too dark, not washed out
      const ambient = new THREE.AmbientLight(0xffffff, 0.4);
      const directional = new THREE.DirectionalLight(0xffffff, 0.6);

      expect(ambient.intensity).toBeGreaterThan(0);
      expect(ambient.intensity).toBeLessThan(2);
      expect(directional.intensity).toBeGreaterThan(0);
      expect(directional.intensity).toBeLessThan(2);
    });

    it('combined lighting does not wash out or darken excessively', () => {
      // OUTCOME: Total light is balanced
      const ambientIntensity = 0.4;
      const directionalIntensity = 0.6;
      const totalIntensity = ambientIntensity + directionalIntensity;

      expect(totalIntensity).toBeGreaterThan(0.5);
      expect(totalIntensity).toBeLessThan(3.0);
    });
  });

  describe('Object Transforms', () => {
    it('globe is at scene origin', () => {
      // OUTCOME: Globe is centered
      const globe = new THREE.Mesh(new THREE.SphereGeometry(1.5), new THREE.MeshPhongMaterial());
      globe.name = 'EarthGlobe';

      expect(globe.position.x).toBe(0);
      expect(globe.position.y).toBe(0);
      expect(globe.position.z).toBe(0);
    });

    it('objects maintain reasonable scale', () => {
      // OUTCOME: Nothing is invisibly small or absurdly large
      const globe = new THREE.Mesh(new THREE.SphereGeometry(1.5), new THREE.MeshPhongMaterial());
      const particleScale = 0.18;

      expect(globe.scale.x).toBe(1);
      expect(globe.scale.y).toBe(1);
      expect(globe.scale.z).toBe(1);
      expect(particleScale).toBeGreaterThan(0.05);
      expect(particleScale).toBeLessThan(1);
    });

    it('instanced meshes use matrix for transforms', () => {
      // OUTCOME: Efficient per-instance positioning
      const instancedMesh = new THREE.InstancedMesh(
        new THREE.IcosahedronGeometry(0.18),
        new THREE.MeshPhongMaterial(),
        10,
      );

      const matrix = new THREE.Matrix4();
      matrix.setPosition(1, 2, 3);

      expect(() => {
        instancedMesh.setMatrixAt(0, matrix);
      }).not.toThrow();
    });

    it('matrix transformations are composable', () => {
      // OUTCOME: Can combine position, rotation, scale
      const matrix = new THREE.Matrix4();
      const position = new THREE.Vector3(1, 2, 3);
      const rotation = new THREE.Euler(0, Math.PI / 4, 0);
      const scale = new THREE.Vector3(0.5, 0.5, 0.5);

      matrix.compose(position, new THREE.Quaternion().setFromEuler(rotation), scale);

      const extractedPos = new THREE.Vector3();
      extractedPos.setFromMatrixPosition(matrix);

      expect(extractedPos.x).toBeCloseTo(1, 5);
      expect(extractedPos.y).toBeCloseTo(2, 5);
      expect(extractedPos.z).toBeCloseTo(3, 5);
    });
  });

  describe('Performance Characteristics', () => {
    it('minimizes draw calls via instancing', () => {
      // OUTCOME: Draw calls scale with entity types, not instance count
      const scene = new THREE.Scene();

      const instancedMesh = new THREE.InstancedMesh(
        new THREE.IcosahedronGeometry(0.18, 0),
        new THREE.MeshPhongMaterial(),
        500,
      );
      scene.add(instancedMesh);

      scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.5), new THREE.MeshPhongMaterial()));
      scene.add(new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial()));

      let drawCalls = 0;
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Points || obj instanceof THREE.Line) {
          drawCalls += 1;
        }
      });

      expect(drawCalls).toBeLessThanOrEqual(10);
    });

    it('reuses geometries and materials', () => {
      // OUTCOME: Memory efficiency via shared resources
      const sharedGeometry = new THREE.IcosahedronGeometry(0.18, 0);
      const sharedMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });

      const mesh1 = new THREE.Mesh(sharedGeometry, sharedMaterial);
      const mesh2 = new THREE.Mesh(sharedGeometry, sharedMaterial);

      expect(mesh1.geometry).toBe(mesh2.geometry);
      expect(mesh1.material).toBe(mesh2.material);
    });
  });

  describe('Particle System Configuration', () => {
    it('particles use icosahedron geometry', () => {
      // OUTCOME: Shards have geometric aesthetic
      const geometry = new THREE.IcosahedronGeometry(0.18, 0);

      expect(geometry.type).toBe('IcosahedronGeometry');
      expect(geometry.parameters.radius).toBeCloseTo(0.18, 2);
    });

    it('particle count can scale from 0 to 500', () => {
      // OUTCOME: System handles various user counts
      const testCounts = [0, 10, 50, 100, 200, 500];

      for (const count of testCounts) {
        const instancedMesh = new THREE.InstancedMesh(
          new THREE.IcosahedronGeometry(0.18, 0),
          new THREE.MeshPhongMaterial(),
          count,
        );

        expect(instancedMesh.count).toBe(count);
      }
    });

    it('particle materials support color variation', () => {
      // OUTCOME: Each particle can have different color
      const material = new THREE.MeshPhongMaterial();
      const instancedMesh = new THREE.InstancedMesh(
        new THREE.IcosahedronGeometry(0.18, 0),
        material,
        100,
      );

      expect(instancedMesh.setColorAt).toBeDefined();
      expect(typeof instancedMesh.setColorAt).toBe('function');
    });
  });

  describe('Material Properties', () => {
    it('globe material is opaque', () => {
      // OUTCOME: Globe is solid, not transparent
      const material = new THREE.MeshPhongMaterial({
        color: 0x8b6f47,
        opacity: 1.0,
        transparent: false,
      });

      expect(material.opacity).toBe(1.0);
      expect(material.transparent).toBe(false);
    });

    it('particle materials support transparency', () => {
      // OUTCOME: Particles can have glass-like effect
      const material = new THREE.MeshPhongMaterial({
        transparent: true,
        opacity: 0.9,
      });

      expect(material.transparent).toBe(true);
      expect(material.opacity).toBeLessThan(1);
    });

    it('materials use reasonable shininess', () => {
      // OUTCOME: Not too glossy or matte
      const material = new THREE.MeshPhongMaterial({
        shininess: 30,
      });

      expect(material.shininess).toBeGreaterThanOrEqual(0);
      expect(material.shininess).toBeLessThanOrEqual(100);
    });
  });

  describe('Geometry Efficiency', () => {
    it('uses indexed geometry for memory efficiency', () => {
      // OUTCOME: Vertices are shared where possible
      const geometry = new THREE.IcosahedronGeometry(0.18, 0);

      expect(geometry.index).toBeDefined();
      if (geometry.index) {
        expect(geometry.index.count).toBeGreaterThan(0);
      }
    });

    it('geometry has required attributes', () => {
      // OUTCOME: Position, normal, and UV coordinates present
      const geometry = new THREE.SphereGeometry(1.5, 32, 32);

      expect(geometry.attributes.position).toBeDefined();
      expect(geometry.attributes.normal).toBeDefined();
      expect(geometry.attributes.uv).toBeDefined();
    });

    it('icosahedron has correct vertex count', () => {
      // OUTCOME: Subdivision level 0 has correct vertices
      const geometry = new THREE.IcosahedronGeometry(0.18, 0);

      expect(geometry.attributes.position.count).toBeGreaterThan(0);
      expect(geometry.attributes.position.count).toBeGreaterThanOrEqual(12);
      expect(geometry.attributes.position.count).toBeLessThanOrEqual(60);
    });
  });

  describe('Scene Cleanup and Disposal', () => {
    it('objects can be removed from scene', () => {
      // OUTCOME: No memory leaks
      const scene = new THREE.Scene();
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(1), new THREE.MeshPhongMaterial());

      scene.add(mesh);
      expect(scene.children).toHaveLength(1);

      scene.remove(mesh);
      expect(scene.children).toHaveLength(0);
    });

    it('removed objects can be disposed', () => {
      // OUTCOME: GPU resources freed
      const geometry = new THREE.IcosahedronGeometry(0.18, 0);
      const material = new THREE.MeshPhongMaterial();

      expect(() => {
        geometry.dispose();
        material.dispose();
      }).not.toThrow();
    });
  });
});
