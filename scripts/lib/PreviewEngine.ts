/**
 * Preview Engine
 *
 * Audio playback engine for the sound preview script.
 * Uses node-web-audio-api for Web Audio in Node.js and speaker for output.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';

// Breathing cycle constants (matching src/constants.ts)
const BREATH_PHASES = {
  INHALE: 4,
  HOLD_IN: 7,
  EXHALE: 8,
  HOLD_OUT: 0,
} as const;

const BREATH_TOTAL_CYCLE =
  BREATH_PHASES.INHALE + BREATH_PHASES.HOLD_IN + BREATH_PHASES.EXHALE + BREATH_PHASES.HOLD_OUT;

// Phase names for display
const PHASE_NAMES = ['Inhale', 'Hold', 'Exhale', 'Rest'] as const;

interface EngineConfig {
  ambientPath: string;
  naturePath: string;
  chimesEnabled: boolean;
  chimesPath?: string;
  speed: number;
  verbose: boolean;
}

interface BreathState {
  phaseIndex: number;
  phaseProgress: number;
  phaseName: string;
  cycleProgress: number;
}

// Type for Web Audio API AudioContext from node-web-audio-api
type NodeAudioContext = import('node-web-audio-api').AudioContext;
type NodeGainNode = import('node-web-audio-api').GainNode;
type NodeAudioBufferSourceNode = import('node-web-audio-api').AudioBufferSourceNode;
type NodeAudioBuffer = import('node-web-audio-api').AudioBuffer;

/**
 * PreviewEngine - handles audio loading and playback
 */
export class PreviewEngine {
  private config: EngineConfig;
  private audioContext: NodeAudioContext | null = null;
  private masterGain: NodeGainNode | null = null;

  // Sound sources
  private ambientSource: NodeAudioBufferSourceNode | null = null;
  private natureSource: NodeAudioBufferSourceNode | null = null;
  private ambientGain: NodeGainNode | null = null;
  private natureGain: NodeGainNode | null = null;

  // Chime sources
  private inhaleChimeBuffer: NodeAudioBuffer | null = null;
  private exhaleChimeBuffer: NodeAudioBuffer | null = null;

  // Playback state
  private isPlaying = false;
  private startTime = 0;
  private lastPhaseIndex = -1;

  constructor(config: EngineConfig) {
    this.config = config;
  }

  /**
   * Initialize audio context and load sounds
   */
  async init(): Promise<void> {
    // Dynamic import for ESM module
    const { AudioContext } = await import('node-web-audio-api');

    this.audioContext = new AudioContext();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.8; // Master volume
    this.masterGain.connect(this.audioContext.destination);

    // Load sounds
    await this.loadSounds();
  }

  /**
   * Load all sound files
   */
  private async loadSounds(): Promise<void> {
    if (!this.audioContext || !this.masterGain) {
      throw new Error('AudioContext not initialized');
    }

    console.log('📦 Loading sounds...');

    // Load ambient
    const ambientBuffer = await this.loadAudioFile(this.config.ambientPath);
    this.ambientGain = this.audioContext.createGain();
    this.ambientGain.gain.value = this.dbToGain(-12); // Constant -12dB
    this.ambientGain.connect(this.masterGain);

    this.ambientSource = this.audioContext.createBufferSource();
    this.ambientSource.buffer = ambientBuffer;
    this.ambientSource.loop = true;
    this.ambientSource.connect(this.ambientGain);

    // Load nature
    const natureBuffer = await this.loadAudioFile(this.config.naturePath);
    this.natureGain = this.audioContext.createGain();
    this.natureGain.gain.value = this.dbToGain(-15); // Base -15dB, modulated
    this.natureGain.connect(this.masterGain);

    this.natureSource = this.audioContext.createBufferSource();
    this.natureSource.buffer = natureBuffer;
    this.natureSource.loop = true;
    this.natureSource.connect(this.natureGain);

    // Load chimes if enabled
    if (this.config.chimesEnabled && this.config.chimesPath) {
      try {
        this.inhaleChimeBuffer = await this.loadAudioFile(
          path.join(this.config.chimesPath, 'inhale-bell.mp3'),
        );
        this.exhaleChimeBuffer = await this.loadAudioFile(
          path.join(this.config.chimesPath, 'exhale-bell.opt.mp3'),
        );
      } catch {
        console.warn('⚠️  Could not load chime files, disabling chimes');
      }
    }

    console.log('✅ Sounds loaded\n');
  }

  /**
   * Load an audio file and decode it
   */
  private async loadAudioFile(filePath: string): Promise<NodeAudioBuffer> {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    const buffer = await readFile(filePath);
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    );
    return await this.audioContext.decodeAudioData(arrayBuffer);
  }

  /**
   * Convert decibels to gain value
   */
  private dbToGain(db: number): number {
    return 10 ** (db / 20);
  }

  /**
   * Linear interpolation
   */
  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  /**
   * Calculate breath state from elapsed time
   */
  private calculateBreathState(elapsedTime: number): BreathState {
    const scaledTime = elapsedTime * this.config.speed;
    const cycleTime = scaledTime % BREATH_TOTAL_CYCLE;
    const cycleProgress = cycleTime / BREATH_TOTAL_CYCLE;

    let accumulatedTime = 0;
    let phaseIndex = 0;

    const durations = [
      BREATH_PHASES.INHALE,
      BREATH_PHASES.HOLD_IN,
      BREATH_PHASES.EXHALE,
      BREATH_PHASES.HOLD_OUT,
    ];

    for (let i = 0; i < durations.length; i++) {
      const duration = durations[i];
      if (cycleTime < accumulatedTime + duration) {
        phaseIndex = i;
        break;
      }
      accumulatedTime += duration;
    }

    const phaseDuration = durations[phaseIndex];
    const phaseTime = cycleTime - accumulatedTime;
    const phaseProgress =
      phaseDuration > 0 ? Math.min(1, Math.max(0, phaseTime / phaseDuration)) : 0;

    return {
      phaseIndex,
      phaseProgress,
      phaseName: PHASE_NAMES[phaseIndex],
      cycleProgress,
    };
  }

  /**
   * Update volumes based on breath state
   */
  private updateVolumes(state: BreathState): void {
    if (!this.natureGain || !this.audioContext) return;

    // Nature volume modulation (0.7 - 1.0 range, mapped to -15dB to -12dB)
    let volumeMultiplier: number;

    switch (state.phaseIndex) {
      case 0: // Inhale: rise from 0.7 to 1.0
        volumeMultiplier = this.lerp(0.7, 1.0, state.phaseProgress);
        break;
      case 1: // Hold-in: steady at 1.0
        volumeMultiplier = 1.0;
        break;
      case 2: // Exhale: fall from 1.0 to 0.7
        volumeMultiplier = this.lerp(1.0, 0.7, state.phaseProgress);
        break;
      case 3: // Hold-out: steady at 0.7
        volumeMultiplier = 0.7;
        break;
      default:
        volumeMultiplier = 0.85;
    }

    // Map 0.7-1.0 to -18dB to -12dB
    const natureDb = this.lerp(-18, -12, (volumeMultiplier - 0.7) / 0.3);
    this.natureGain.gain.value = this.dbToGain(natureDb);
  }

  /**
   * Trigger chime sound
   */
  private triggerChime(type: 'inhale' | 'exhale'): void {
    if (!this.audioContext || !this.masterGain) return;

    const buffer = type === 'inhale' ? this.inhaleChimeBuffer : this.exhaleChimeBuffer;
    if (!buffer) return;

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;

    const gain = this.audioContext.createGain();
    gain.gain.value = this.dbToGain(-9); // Chimes at -9dB
    gain.connect(this.masterGain);
    source.connect(gain);

    source.start();
  }

  /**
   * Display progress bar
   */
  private displayProgress(state: BreathState, cycleNum: number, totalCycles: number): void {
    const barWidth = 30;
    const filledWidth = Math.round(state.cycleProgress * barWidth);
    const bar = '█'.repeat(filledWidth) + '░'.repeat(barWidth - filledWidth);

    const phaseTime = state.phaseProgress * this.getPhaseDuration(state.phaseIndex);
    const phaseDuration = this.getPhaseDuration(state.phaseIndex);

    const line =
      `  Cycle ${cycleNum}/${totalCycles} [${bar}] ` +
      `${state.phaseName.padEnd(7)} ${phaseTime.toFixed(1)}s/${phaseDuration}s`;

    process.stdout.write(`\r${line}`);
  }

  private getPhaseDuration(phaseIndex: number): number {
    const durations = [
      BREATH_PHASES.INHALE,
      BREATH_PHASES.HOLD_IN,
      BREATH_PHASES.EXHALE,
      BREATH_PHASES.HOLD_OUT,
    ];
    return durations[phaseIndex];
  }

  /**
   * Play the preview
   */
  async play(cycles: number): Promise<void> {
    if (!this.audioContext || !this.ambientSource || !this.natureSource) {
      throw new Error('Engine not initialized');
    }

    this.isPlaying = true;
    this.startTime = this.audioContext.currentTime;
    this.lastPhaseIndex = -1;

    // Start ambient and nature loops
    this.ambientSource.start();
    this.natureSource.start();

    const cycleDuration = BREATH_TOTAL_CYCLE / this.config.speed;
    const totalDuration = cycleDuration * cycles;

    return new Promise((resolve) => {
      const updateLoop = () => {
        if (!this.isPlaying || !this.audioContext) {
          resolve();
          return;
        }

        const elapsed = this.audioContext.currentTime - this.startTime;
        const state = this.calculateBreathState(elapsed);
        const currentCycle = Math.floor(elapsed / cycleDuration) + 1;

        // Update volumes
        this.updateVolumes(state);

        // Trigger chimes at phase boundaries
        if (this.config.chimesEnabled && state.phaseIndex !== this.lastPhaseIndex) {
          if (state.phaseIndex === 0) {
            this.triggerChime('inhale');
          } else if (state.phaseIndex === 2) {
            this.triggerChime('exhale');
          }
          this.lastPhaseIndex = state.phaseIndex;
        }

        // Display progress
        this.displayProgress(state, Math.min(currentCycle, cycles), cycles);

        // Check if done
        if (elapsed >= totalDuration) {
          this.isPlaying = false;
          process.stdout.write('\n');
          resolve();
          return;
        }

        // Continue loop
        setTimeout(updateLoop, 50); // 20fps update
      };

      updateLoop();
    });
  }

  /**
   * Stop playback and cleanup
   */
  dispose(): void {
    this.isPlaying = false;

    if (this.ambientSource) {
      try {
        this.ambientSource.stop();
      } catch {
        // Already stopped
      }
    }

    if (this.natureSource) {
      try {
        this.natureSource.stop();
      } catch {
        // Already stopped
      }
    }

    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}
