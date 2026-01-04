#!/usr/bin/env tsx

/**
 * Sound Preview Script
 *
 * CLI tool to audition sound combinations during simulated breathing cycles.
 * Plays sounds through system speakers in real-time with breath-synchronized
 * volume modulation.
 *
 * Usage:
 *   npm run audio:preview -- --list
 *   npm run audio:preview -- --ambient crystal --nature fireplace --chimes
 *   npm run audio:preview -- --cycles 3 --speed 2
 */

import path from 'node:path';
import { Command } from 'commander';
import { glob } from 'glob';
import { PreviewEngine } from './lib/PreviewEngine';

const AUDIO_BASE = path.join(process.cwd(), 'public', 'audio');

// Sound categories with their default production files
const CATEGORIES = {
  ambient: {
    dir: 'ambient',
    variantsDir: 'ambient/_variants',
    defaultFile: 'warm-pad.opt.mp3',
    description: 'Background ambient drone (constant volume)',
  },
  nature: {
    dir: 'nature',
    variantsDir: 'nature/_variants',
    defaultFile: 'ocean.mp3',
    description: 'Nature soundscape (volume breathes with cycle)',
  },
  chimes: {
    dir: 'chimes',
    variantsDir: 'chimes/_variants',
    defaultFile: 'inhale-bell.mp3',
    description: 'Transition chimes (triggered at phase boundaries)',
  },
} as const;

interface PreviewConfig {
  ambient: string;
  nature: string;
  chimes: boolean;
  cycles: number;
  speed: number;
  verbose: boolean;
}

/**
 * List all available sound variants
 */
async function listSounds(): Promise<void> {
  console.log('\n🎵 Available Sound Variants\n');
  console.log('─'.repeat(60));

  for (const [category, info] of Object.entries(CATEGORIES)) {
    console.log(`\n📁 ${category.toUpperCase()}`);
    console.log(`   ${info.description}`);
    console.log(`   Default: ${info.defaultFile}\n`);

    // Production files
    const prodFiles = await glob(`${AUDIO_BASE}/${info.dir}/*.{mp3,wav,opt.mp3}`, {
      ignore: [`${AUDIO_BASE}/${info.dir}/_variants/**`],
    });

    if (prodFiles.length > 0) {
      console.log('   Production:');
      for (const file of prodFiles) {
        const name = path.basename(file);
        console.log(`   ├─ ${name}`);
      }
    }

    // Variant files
    const variantFiles = await glob(`${AUDIO_BASE}/${info.variantsDir}/*.{mp3,wav}`);

    if (variantFiles.length > 0) {
      console.log('\n   Variants:');
      for (const file of variantFiles) {
        const name = path.basename(file);
        console.log(`   ├─ ${name}`);
      }
    }
  }

  console.log('\n' + '─'.repeat(60));
  console.log('\n📝 Usage Examples:\n');
  console.log('   # Preview with defaults (2 cycles)');
  console.log('   npm run audio:preview\n');
  console.log('   # Preview with crystal ambient + fireplace');
  console.log(
    '   npm run audio:preview -- --ambient crystal-breathing-field-suno.mp3 --nature fireplace-elevenlabs-01.mp3\n',
  );
  console.log('   # Fast preview (2x speed, 1 cycle)');
  console.log('   npm run audio:preview -- --speed 2 --cycles 1\n');
}

/**
 * Resolve a sound file path from a partial name
 */
async function resolveSoundPath(
  category: keyof typeof CATEGORIES,
  partialName: string | undefined,
): Promise<string> {
  const info = CATEGORIES[category];

  if (!partialName) {
    return path.join(AUDIO_BASE, info.dir, info.defaultFile);
  }

  // Try exact match in production dir
  const prodPath = path.join(AUDIO_BASE, info.dir, partialName);
  if (await fileExists(prodPath)) {
    return prodPath;
  }

  // Try exact match in variants dir
  const variantPath = path.join(AUDIO_BASE, info.variantsDir, partialName);
  if (await fileExists(variantPath)) {
    return variantPath;
  }

  // Try partial match in variants
  const variantFiles = await glob(`${AUDIO_BASE}/${info.variantsDir}/*${partialName}*`);
  if (variantFiles.length > 0) {
    return variantFiles[0] as string;
  }

  // Try partial match in production
  const prodFiles = await glob(`${AUDIO_BASE}/${info.dir}/*${partialName}*`, {
    ignore: [`${AUDIO_BASE}/${info.dir}/_variants/**`],
  });
  if (prodFiles.length > 0) {
    return prodFiles[0] as string;
  }

  // Default
  console.warn(`⚠️  Could not find "${partialName}" in ${category}, using default`);
  return path.join(AUDIO_BASE, info.dir, info.defaultFile);
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    const fs = await import('node:fs/promises');
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Main preview function
 */
async function runPreview(config: PreviewConfig): Promise<void> {
  console.log('\n🎧 Sound Preview\n');
  console.log('─'.repeat(60));

  // Resolve file paths
  const ambientPath = await resolveSoundPath('ambient', config.ambient);
  const naturePath = await resolveSoundPath('nature', config.nature);

  console.log(`\n📁 Sounds:`);
  console.log(`   Ambient: ${path.basename(ambientPath)}`);
  console.log(`   Nature:  ${path.basename(naturePath)}`);
  console.log(`   Chimes:  ${config.chimes ? 'ON' : 'OFF'}`);
  console.log(`\n⏱️  Settings:`);
  console.log(`   Cycles: ${config.cycles}`);
  console.log(`   Speed:  ${config.speed}x`);

  const cycleDuration = 19 / config.speed;
  const totalDuration = cycleDuration * config.cycles;
  console.log(`   Duration: ${totalDuration.toFixed(1)}s (${cycleDuration.toFixed(1)}s per cycle)`);

  console.log('\n' + '─'.repeat(60));
  console.log('\n🔊 Starting playback... (Ctrl+C to stop)\n');

  // Initialize and run engine
  const engine = new PreviewEngine({
    ambientPath,
    naturePath,
    chimesEnabled: config.chimes,
    chimesPath: config.chimes ? path.join(AUDIO_BASE, 'chimes') : undefined,
    speed: config.speed,
    verbose: config.verbose,
  });

  try {
    await engine.init();
    await engine.play(config.cycles);
    console.log('\n✅ Preview complete!\n');
  } catch (err) {
    console.error('\n❌ Playback error:', err);
    process.exit(1);
  } finally {
    engine.dispose();
  }
}

// CLI setup
const program = new Command();

program
  .name('preview-sounds')
  .description('Preview breathing meditation sound combinations')
  .version('1.0.0')
  .option('-l, --list', 'List available sound variants')
  .option('-a, --ambient <file>', 'Ambient sound file (partial name ok)')
  .option('-n, --nature <file>', 'Nature soundscape file (partial name ok)')
  .option('-c, --chimes', 'Enable transition chimes', false)
  .option('--cycles <n>', 'Number of breathing cycles', (v) => Number.parseInt(v, 10), 2)
  .option('--speed <n>', 'Playback speed multiplier', (v) => Number.parseFloat(v), 1)
  .option('-v, --verbose', 'Show detailed phase info', false)
  .action(async (options) => {
    if (options.list) {
      await listSounds();
      return;
    }

    await runPreview({
      ambient: options.ambient,
      nature: options.nature,
      chimes: options.chimes,
      cycles: options.cycles,
      speed: options.speed,
      verbose: options.verbose,
    });
  });

program.parse();
