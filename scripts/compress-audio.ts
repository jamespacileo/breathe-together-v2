/**
 * Audio Compression Script
 *
 * Compresses all MP3 files in public/audio/ to optimized versions.
 * - Keeps originals intact
 * - Creates .opt.mp3 versions with reduced bitrate
 * - Skips if .opt.mp3 already exists and is newer than source
 *
 * Usage: npm run audio:compress
 */

import { stat } from 'node:fs/promises';
import path from 'node:path';
import ffmpeg from 'fluent-ffmpeg';
import { glob } from 'glob';

interface CompressionConfig {
  pattern: string;
  bitrate: string;
  description: string;
}

// Bitrate configuration by category
// Higher bitrate for sounds that need more fidelity
const CONFIGS: CompressionConfig[] = [
  {
    pattern: 'public/audio/ambient/*.mp3',
    bitrate: '128k',
    description: 'Ambient drones (loops, less critical)',
  },
  {
    pattern: 'public/audio/breath/*.mp3',
    bitrate: '192k',
    description: 'Breath sounds (more noticeable quality)',
  },
  {
    pattern: 'public/audio/nature/*.mp3',
    bitrate: '128k',
    description: 'Nature soundscapes (loops)',
  },
  {
    pattern: 'public/audio/chimes/*.mp3',
    bitrate: '192k',
    description: 'Transition chimes (short, need clarity)',
  },
];

async function compressAudio(
  input: string,
  bitrate: string,
): Promise<{ skipped: boolean; error?: Error }> {
  const output = input.replace('.mp3', '.opt.mp3');
  const basename = path.basename(input);

  // Skip if .opt.mp3 exists and is newer than source
  try {
    const [srcStat, optStat] = await Promise.all([stat(input), stat(output)]);
    if (optStat.mtime > srcStat.mtime) {
      console.log(`⏭️  Skipping ${basename} (up to date)`);
      return { skipped: true };
    }
  } catch {
    // .opt.mp3 doesn't exist, proceed with compression
  }

  return new Promise((resolve) => {
    ffmpeg(input)
      .audioBitrate(bitrate)
      .audioChannels(2) // Stereo
      .audioFrequency(44100) // Standard sample rate
      .output(output)
      .on('end', async () => {
        // Report size reduction
        try {
          const [srcStat, optStat] = await Promise.all([stat(input), stat(output)]);
          const reduction = (((srcStat.size - optStat.size) / srcStat.size) * 100).toFixed(1);
          const srcMB = (srcStat.size / 1024 / 1024).toFixed(1);
          const optMB = (optStat.size / 1024 / 1024).toFixed(1);
          console.log(
            `✅ ${basename} → ${path.basename(output)} (${srcMB}MB → ${optMB}MB, -${reduction}%)`,
          );
        } catch {
          console.log(`✅ ${basename} → ${path.basename(output)}`);
        }
        resolve({ skipped: false });
      })
      .on('error', (err: Error) => {
        console.error(`❌ Failed to compress ${basename}: ${err.message}`);
        resolve({ skipped: false, error: err });
      })
      .run();
  });
}

async function main() {
  console.log('🎵 Audio Compression Pipeline\n');

  let totalFiles = 0;
  let skippedFiles = 0;
  let errorFiles = 0;

  for (const config of CONFIGS) {
    const files = await glob(config.pattern, { ignore: '**/*.opt.mp3' });

    if (files.length === 0) continue;

    console.log(`\n📁 ${config.description}`);
    console.log(`   Bitrate: ${config.bitrate}\n`);

    for (const file of files) {
      totalFiles++;
      const result = await compressAudio(file, config.bitrate);
      if (result.skipped) skippedFiles++;
      if (result.error) errorFiles++;
    }
  }

  console.log('\n' + '─'.repeat(50));
  console.log(`📊 Summary: ${totalFiles} files, ${skippedFiles} skipped, ${errorFiles} errors`);

  if (errorFiles > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
