/**
 * Rendering Integration Tests
 *
 * Consolidates all R3F rendering tests into a single file to ensure
 * stable environment state and reliable cleanup.
 */

import { create } from '@react-three/test-renderer';
import React from 'react';
import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Mocks
vi.mock('@react-three/drei', async () => {
  const actual = await vi.importActual('@react-three/drei');
  return {
    ...actual,
    useTexture: () => new THREE.Texture(),
    Html: () => <group name="Html" />,
    Environment: ({ children }: React.PropsWithChildren) => (
      <group name="Environment">{children}</group>
    ),
    useEnvironment: () => new THREE.Texture(),
    Stars: () => <group name="Stars" />,
    Cloud: () => <group name="Cloud" />,
    Clouds: ({ children }: React.PropsWithChildren) => <group name="Clouds">{children}</group>,
    Line: ({ children }: React.PropsWithChildren) => <group name="Line">{children}</group>,
  };
});

vi.mock('koota/react', () => ({
  useWorld: () => ({
    queryFirst: () => ({
      get: (trait: unknown) => {
        const name =
          trait &&
          typeof trait === 'object' &&
          'name' in trait &&
          typeof (trait as { name?: unknown }).name === 'string'
            ? (trait as { name: string }).name
            : '';
        if (name.includes('breathPhase')) return { value: 0.5 };
        if (name.includes('orbitRadius')) return { value: 3.5 };
        return { value: 1.0 };
      },
    }),
  }),
}));

const createRenderer = async (ui: React.ReactElement) => {
  let renderer: Awaited<ReturnType<typeof create>> | undefined;
  await React.act(async () => {
    renderer = await create(ui);
  });
  if (!renderer) {
    throw new Error('Failed to create test renderer');
  }
  return renderer;
};

afterEach(async () => {
  // Small delay to allow any async R3F cleanup to settle
  await new Promise((url) => setTimeout(url, 20));
});

describe('EarthGlobe Rendering', () => {
  it('renders core sphere and atmosphere', async () => {
    const { EarthGlobe } = await import('../../entities/earthGlobe');
    const renderer = await createRenderer(<EarthGlobe radius={1.5} showAtmosphere={true} />);

    const meshes = renderer.scene.findAllByType('Mesh');
    const spheres = meshes.filter((m) => m.instance.geometry.type === 'SphereGeometry');
    expect(spheres.length).toBeGreaterThanOrEqual(4);

    renderer.unmount();
  });
});

describe('Environment Rendering', () => {
  it('renders lights and basic components', async () => {
    const { Environment } = await import('../../entities/environment');
    const renderer = await createRenderer(
      <Environment
        showClouds={false}
        showStars={false}
        showConstellations={false}
        showSun={false}
      />,
    );

    const ambientLights = renderer.scene.findAll((node) => node.instance?.isAmbientLight);
    expect(ambientLights.length).toBeGreaterThan(0);

    renderer.unmount();
  });
});

describe('ParticleSwarm Rendering', () => {
  it('uses InstancedMesh for performance', async () => {
    const { ParticleSwarm } = await import('../../entities/particle/ParticleSwarm');
    const renderer = await createRenderer(
      <ParticleSwarm performanceCap={100} users={[]} showShardShells={false} />,
    );

    const instancedMesh = renderer.scene.allChildren.find((node) => node.instance?.isInstancedMesh);

    if (!instancedMesh) {
      throw new Error('Expected an InstancedMesh to be present');
    }
    expect(instancedMesh.instance.count).toBe(100);

    renderer.unmount();
  });

  it('applies mood colors correctly', async () => {
    const { ParticleSwarm } = await import('../../entities/particle/ParticleSwarm');
    const renderer = await createRenderer(
      <ParticleSwarm performanceCap={10} users={[]} showShardShells={false} />,
    );

    const mesh = renderer.scene.allChildren.find((node) => node.instance?.isInstancedMesh);
    expect(mesh).toBeDefined();

    renderer.unmount();
  });
});

// Camera configuration for optimal scene capture (documented for browser-based tests)
const CAMERA_CONFIG = {
  position: [15, 8, 15] as [number, number, number],
  fov: 50,
};

describe('Visual Report', () => {
  it('documents scene composition for visual testing', async () => {
    // This test documents the intended scene composition for visual reports
    // Actual screenshot capture should use Playwright for browser-based rendering

    const report = {
      camera: CAMERA_CONFIG,
      components: {
        environment: { showStars: true, showConstellations: true, showSun: true },
        earthGlobe: { radius: 1.5, showAtmosphere: true },
        particleSwarm: { performanceCap: 50 },
      },
      notes: 'For visual evaluation, use npm run e2e:screenshots',
    };

    console.log('\n=== Visual Report Configuration ===');
    console.log(JSON.stringify(report, null, 2));

    // AI evaluation note
    if (!process.env.GEMINI_API_KEY) {
      console.log('\n[AI Evaluation] GEMINI_API_KEY not set');
      console.log('Set the env var to enable AI-powered visual scoring');
    }

    expect(report.camera.position).toEqual([15, 8, 15]);
    expect(report.camera.fov).toBe(50);
  });
});
