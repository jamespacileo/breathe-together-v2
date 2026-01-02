/**
 * Audio Clean Script
 *
 * Removes all compressed .opt.mp3 files from public/audio/
 * Useful for regenerating all compressed versions
 *
 * Usage: npm run audio:clean
 */

import { stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { glob } from 'glob';

async function main() {
  console.log('🗑️  Cleaning compressed audio files\n');

  const files = await glob('public/audio/**/*.opt.mp3');

  if (files.length === 0) {
    console.log('No compressed files found.');
    return;
  }

  let totalSize = 0;

  for (const file of files) {
    try {
      const fileStat = await stat(file);
      totalSize += fileStat.size;
      await unlink(file);
      console.log(`   Removed: ${path.relative('public/audio', file)}`);
    } catch (err) {
      console.error(`   Failed to remove ${file}: ${err}`);
    }
  }

  const sizeMB = (totalSize / 1024 / 1024).toFixed(1);
  console.log(`\n✅ Removed ${files.length} files (${sizeMB}MB freed)`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
