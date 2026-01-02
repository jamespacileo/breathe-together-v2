/**
 * Chime Sound Generator
 *
 * Generates synthetic bell/chime sounds using Tone.js.
 * Uses FM synthesis to create singing bowl / meditation bell tones.
 *
 * Usage: npm run audio:generate
 *
 * Note: This script runs in Node.js using Tone.js offline rendering.
 * The Web Audio API is polyfilled via the 'canvas' package dependencies.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as Tone from 'tone';

interface ChimeConfig {
  name: string;
  frequency: number;
  duration: number;
  harmonics: number[];
  decayTime: number;
  description: string;
}

// Chime configurations for different breath phases
const CHIME_CONFIGS: ChimeConfig[] = [
  {
    name: 'inhale-bell',
    frequency: 528, // C5 - Solfeggio "love" frequency
    duration: 3,
    harmonics: [1, 2.01, 3.02, 4.99, 6.25], // Slightly detuned for richness
    decayTime: 2.5,
    description: 'Gentle rising bell for inhale start',
  },
  {
    name: 'exhale-bell-synth',
    frequency: 396, // G4 - Solfeggio "liberation" frequency
    duration: 3,
    harmonics: [1, 1.99, 3.01, 5.02, 7.01],
    decayTime: 2.8,
    description: 'Warm descending bell for exhale start',
  },
  {
    name: 'transition-chime',
    frequency: 432, // A4 natural tuning
    duration: 2,
    harmonics: [1, 2, 3, 4, 5, 6],
    decayTime: 1.8,
    description: 'Brief transition marker',
  },
];

/**
 * Generate a singing bowl / bell sound using additive synthesis
 * Creates the characteristic metallic shimmer with natural decay
 */
async function generateBellSound(config: ChimeConfig): Promise<Float32Array> {
  const sampleRate = 44100;
  const totalSamples = Math.ceil(config.duration * sampleRate);
  const buffer = new Float32Array(totalSamples);

  // Generate each harmonic with its own decay envelope
  for (let h = 0; h < config.harmonics.length; h++) {
    const harmonicRatio = config.harmonics[h];
    const freq = config.frequency * harmonicRatio;

    // Higher harmonics decay faster (natural acoustic behavior)
    const harmonicDecay = config.decayTime / (1 + h * 0.3);

    // Amplitude decreases with harmonic number
    const harmonicAmplitude = 1 / (1 + h * 0.7);

    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;

      // Exponential decay envelope
      const envelope = Math.exp(-t / harmonicDecay);

      // Slight attack transient for metallicness
      const attack = 1 - Math.exp(-t * 100);

      // Add slight vibrato for shimmer (more on higher harmonics)
      const vibratoDepth = 0.003 * h;
      const vibratoFreq = 4 + h * 0.5;
      const vibrato = 1 + vibratoDepth * Math.sin(2 * Math.PI * vibratoFreq * t);

      // Generate sine wave with vibrato
      const sample = Math.sin(2 * Math.PI * freq * vibrato * t);

      buffer[i] += sample * envelope * attack * harmonicAmplitude;
    }
  }

  // Add subtle beating effect (characteristic of singing bowls)
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const beating = 1 + 0.1 * Math.sin(2 * Math.PI * 2.5 * t); // 2.5 Hz beating
    buffer[i] *= beating;
  }

  // Normalize to prevent clipping
  let maxAmp = 0;
  for (let i = 0; i < totalSamples; i++) {
    maxAmp = Math.max(maxAmp, Math.abs(buffer[i]));
  }
  if (maxAmp > 0) {
    const normFactor = 0.9 / maxAmp; // Leave headroom
    for (let i = 0; i < totalSamples; i++) {
      buffer[i] *= normFactor;
    }
  }

  return buffer;
}

/**
 * Convert Float32Array to WAV format buffer
 */
function float32ToWav(samples: Float32Array, sampleRate: number): Buffer {
  const numChannels = 1; // Mono
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;

  const dataSize = samples.length * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * blockAlign, 28); // ByteRate
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Convert float samples to 16-bit signed integers
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    const int16 = Math.floor(sample * 32767);
    buffer.writeInt16LE(int16, offset);
    offset += 2;
  }

  return buffer;
}

async function main() {
  console.log('🔔 Chime Sound Generator\n');

  const outputDir = path.join(process.cwd(), 'public', 'audio', 'chimes');

  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  for (const config of CHIME_CONFIGS) {
    console.log(`🎵 Generating ${config.name}...`);
    console.log(`   ${config.description}`);
    console.log(`   Frequency: ${config.frequency}Hz, Duration: ${config.duration}s\n`);

    try {
      // Generate audio samples
      const samples = await generateBellSound(config);

      // Convert to WAV
      const wavBuffer = float32ToWav(samples, 44100);

      // Write WAV file (then convert to MP3 with audio:compress)
      const wavPath = path.join(outputDir, `${config.name}.wav`);
      await fs.writeFile(wavPath, wavBuffer);

      const sizeMB = (wavBuffer.length / 1024 / 1024).toFixed(2);
      console.log(`   ✅ Saved ${config.name}.wav (${sizeMB}MB)\n`);
    } catch (err) {
      console.error(`   ❌ Failed to generate ${config.name}: ${err}\n`);
    }
  }

  console.log('─'.repeat(50));
  console.log('📝 Note: Run `npm run audio:compress` to convert WAV files to optimized MP3');
  console.log('   Then delete the .wav files if no longer needed.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
