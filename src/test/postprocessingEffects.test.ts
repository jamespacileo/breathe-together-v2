/**
 * PostProcessingEffects Tests
 *
 * Ensures tone mapping is applied in the postprocessing stack
 * to prevent washed-out output when EffectComposer disables renderer tone mapping.
 */

import { describe, expect, it } from 'vitest';

describe('PostProcessingEffects configuration', () => {
  it('adds ToneMapping as the final effect (ACES Filmic)', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    const filePath = path.resolve(process.cwd(), 'src/components/PostProcessingEffects.tsx');
    const content = await fs.readFile(filePath, 'utf-8');

    expect(content).toMatch(/ToneMappingMode\.ACES_FILMIC/);
    expect(content).toMatch(/key="tone-mapping"/);

    const toneIdx = content.indexOf('key="tone-mapping"');
    const dofIdx = content.indexOf('key="dof"');
    const bloomIdx = content.indexOf('key="bloom"');
    const vignetteIdx = content.indexOf('key="vignette"');

    const maxOtherIdx = Math.max(dofIdx, bloomIdx, vignetteIdx);
    expect(toneIdx).toBeGreaterThan(maxOtherIdx);
  });
});
