// Professional Sound System for MineCash Casino Games
// Provides casino-style audio feedback with volume control and sound management

interface SoundConfig {
  volume: number;
  enabled: boolean;
  masterVolume: number;
}

interface SoundEffect {
  id: string;
  audio: HTMLAudioElement | null;
  volume: number;
  loop: boolean;
  fallback: boolean; // Indicates if this is a fallback sound
}

class SoundSystem {
  private sounds: Map<string, SoundEffect> = new Map();
  private config: SoundConfig = {
    volume: 0.7,
    enabled: true,
    masterVolume: 1.0
  };
  private audioContext: AudioContext | null = null;
  private initialized = false;
  private currentRocketEngine: AudioContext | null = null;
  private useFallbackOnly = true; // Force fallback sounds only

  constructor() {
    // FIXED: Don't initialize AudioContext immediately to avoid autoplay policy issues
    this.loadSounds();
    console.info('Sound system initialized - AudioContext will be created on first user interaction');
  }

  private initializeAudioContext() {
    try {
      // Create audio context for better sound control
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.initialized = true;
      console.info('Sound system AudioContext initialized');
    } catch (error) {
      console.warn('Audio context not supported, falling back to basic audio');
      this.initialized = false;
    }
  }

  private loadSounds() {
    // Define sound configurations without loading actual files
    const soundEffects: Record<string, { volume: number; loop?: boolean }> = {
      // Betting sounds
      'bet_placed': { volume: 0.6 },
      'bet_failed': { volume: 0.5 },
      'error': { volume: 0.5 },
      
      // Game state sounds
      'game_start': { volume: 0.7 },
      'game_crash': { volume: 0.8 },
      'game_waiting': { volume: 0.4 },
      
      // Win/Lose sounds
      'win': { volume: 0.8 },
      'lose': { volume: 0.6 },
      
      // Multiplier sounds
      'multiplier_tick': { volume: 0.3 },
      'multiplier_high': { volume: 0.6 },
      
      // Cashout sounds
      'cashout_success': { volume: 0.7 },
      'cashout_failed': { volume: 0.5 },
      
      // UI sounds
      'button_click': { volume: 0.4 },
      'notification': { volume: 0.5 },
      
      // Ambient sounds
      'rocket_engine': { volume: 0.3, loop: true },
      'casino_ambient': { volume: 0.2, loop: true }
    };

    // Create fallback-only sound entries
    Object.entries(soundEffects).forEach(([id, config]) => {
      this.sounds.set(id, {
        id,
        audio: null, // No audio file loading
        volume: config.volume,
        loop: config.loop || false,
        fallback: true // Always use fallback
      });
    });
  }

  // Play a sound effect
  play(soundId: string, options: { volume?: number; loop?: boolean } = {}) {
    if (!this.config.enabled) return;

    // FIXED: Only initialize AudioContext after user interaction
    if (!this.initialized) {
      // Don't initialize AudioContext automatically - wait for user interaction
      console.info('AudioContext not initialized yet - waiting for user interaction');
      return;
    }

    const sound = this.sounds.get(soundId);
    if (!sound) {
      // Use fallback sound if the requested sound doesn't exist
      this.playFallbackSound(soundId, options);
      return;
    }

    // Always use fallback sounds since we're not loading MP3 files
    this.playFallbackSound(soundId, options);
  }

  // Play fallback sound using Web Audio API
  private playFallbackSound(soundId: string, options: { volume?: number; loop?: boolean } = {}) {
    if (!this.initialized || !this.audioContext) return;

    try {
      // Create appropriate fallback sound based on sound ID
      switch (soundId) {
        case 'bet_placed':
        case 'button_click':
          this.createCustomSound(800, 0.1, 'sine');
          break;
        case 'bet_failed':
        case 'cashout_failed':
        case 'error':
          this.createCustomSound(200, 0.3, 'sawtooth');
          break;
        case 'game_start':
          this.playRocketLaunch();
          break;
        case 'game_crash':
          this.playCrashSound(1.0);
          break;
        case 'multiplier_tick':
          this.playMultiplierTick(1.5);
          break;
        case 'multiplier_high':
          this.createCustomSound(600, 0.2, 'triangle');
          break;
        case 'cashout_success':
          this.createCustomSound(1000, 0.4, 'sine');
          break;
        case 'win':
          this.createCustomSound(800, 0.6, 'sine');
          break;
        case 'lose':
          this.createCustomSound(200, 0.4, 'sawtooth');
          break;
        case 'notification':
          this.createCustomSound(400, 0.2, 'square');
          break;
        case 'rocket_engine':
          // Create continuous engine sound
          this.createEngineSound();
          break;
        case 'casino_ambient':
          // Create ambient casino sound
          this.createAmbientSound();
          break;
        default:
          this.createCustomSound(440, 0.1, 'sine');
          break;
      }
    } catch (error) {
      // Silently handle fallback sound creation errors
    }
  }

  // Stop a specific sound
  stop(soundId: string) {
    const sound = this.sounds.get(soundId);
    if (sound && sound.audio) {
      sound.audio.pause();
      sound.audio.currentTime = 0;
    }
  }

  // Stop all sounds
  stopAll() {
    this.sounds.forEach(sound => {
      if (sound.audio) {
        sound.audio.pause();
        sound.audio.currentTime = 0;
      }
    });
  }

  // Set master volume (0.0 to 1.0)
  setMasterVolume(volume: number) {
    this.config.masterVolume = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
  }

  // Set sound volume (0.0 to 1.0)
  setVolume(volume: number) {
    this.config.volume = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
  }

  // Enable/disable sound system
  setEnabled(enabled: boolean) {
    this.config.enabled = enabled;
    if (!enabled) {
      this.stopAll();
    }
  }

  // FIXED: Initialize AudioContext after user interaction
  initializeAfterUserInteraction() {
    if (!this.initialized) {
      this.initializeAudioContext();
      console.info('AudioContext initialized after user interaction');
    }
  }

  // Update all sound volumes
  private updateAllVolumes() {
    this.sounds.forEach(sound => {
      if (sound.audio) {
        sound.audio.volume = sound.volume * this.config.volume * this.config.masterVolume;
      }
    });
  }

  // Get current configuration
  getConfig(): SoundConfig {
    return { ...this.config };
  }

  // Check if sound system is enabled
  isEnabled(): boolean {
    return this.config.enabled;
  }

  // Create a custom sound effect using Web Audio API
  createCustomSound(frequency: number, duration: number, type: 'sine' | 'square' | 'sawtooth' | 'triangle' = 'sine') {
    if (!this.config.enabled) return;

    // FIXED: Only initialize AudioContext after user interaction
    if (!this.initialized) {
      console.info('AudioContext not initialized yet - waiting for user interaction');
      return;
    }

    if (!this.audioContext) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
      oscillator.type = type;

      gainNode.gain.setValueAtTime(0.1 * this.config.volume * this.config.masterVolume, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration);
    } catch (error) {
      // Silently handle custom sound creation errors
    }
  }

  // Create engine sound for rocket
  private createEngineSound() {
    if (!this.config.enabled) return;

    // FIXED: Only initialize AudioContext after user interaction
    if (!this.initialized) {
      console.info('AudioContext not initialized yet - waiting for user interaction');
      return;
    }

    if (!this.audioContext) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.setValueAtTime(80, this.audioContext.currentTime);
      oscillator.type = 'sawtooth';

      gainNode.gain.setValueAtTime(0.05 * this.config.volume * this.config.masterVolume, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 2);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 2);
    } catch (error) {
      // Silently handle engine sound creation errors
    }
  }

  // Create ambient casino sound
  private createAmbientSound() {
    if (!this.config.enabled) return;

    // FIXED: Only initialize AudioContext after user interaction
    if (!this.initialized) {
      console.info('AudioContext not initialized yet - waiting for user interaction');
      return;
    }

    if (!this.audioContext) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.setValueAtTime(120, this.audioContext.currentTime);
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.02 * this.config.volume * this.config.masterVolume, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 3);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 3);
    } catch (error) {
      // Silently handle ambient sound creation errors
    }
  }

  // Create betting phase ending sound (psychological effect)
  playBettingEnding() {
    if (!this.config.enabled) return;

    // FIXED: Initialize AudioContext on first user interaction
    if (!this.initialized) {
      this.initializeAudioContext();
    }

    if (!this.audioContext) return;

    try {
      // Create a warning sound that increases in intensity
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Start with low frequency and increase
      oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 2);
      oscillator.type = 'sawtooth';

      gainNode.gain.setValueAtTime(0.05 * this.config.volume * this.config.masterVolume, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.15 * this.config.volume * this.config.masterVolume, this.audioContext.currentTime + 1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 2);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 2);
    } catch (error) {
      // Silently handle betting ending sound creation errors
    }
  }

  // Create rocket launch sound
  playRocketLaunch() {
    if (!this.initialized || !this.audioContext) return;

    try {
      // Create a powerful rocket launch sound
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Start with high frequency and decrease (rocket launch effect)
      oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 1.5);
      oscillator.type = 'sawtooth';

      gainNode.gain.setValueAtTime(0.2 * this.config.volume * this.config.masterVolume, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 1.5);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 1.5);

      // Add a second layer for more dramatic effect
      setTimeout(() => {
        const oscillator2 = this.audioContext!.createOscillator();
        const gainNode2 = this.audioContext!.createGain();

        oscillator2.connect(gainNode2);
        gainNode2.connect(this.audioContext!.destination);

        oscillator2.frequency.setValueAtTime(600, this.audioContext!.currentTime);
        oscillator2.frequency.exponentialRampToValueAtTime(150, this.audioContext!.currentTime + 1);
        oscillator2.type = 'square';

        gainNode2.gain.setValueAtTime(0.1 * this.config.volume * this.config.masterVolume, this.audioContext!.currentTime);
        gainNode2.gain.exponentialRampToValueAtTime(0.01, this.audioContext!.currentTime + 1);

        oscillator2.start(this.audioContext!.currentTime);
        oscillator2.stop(this.audioContext!.currentTime + 1);
      }, 200);
    } catch (error) {
      // Silently handle rocket launch sound creation errors
    }
  }

  // Create increasing tension sound as multiplier rises
  playTensionSound(multiplier: number) {
    if (!this.initialized || !this.audioContext || multiplier < 1.1) return;

    try {
      // Create a tension sound that increases with multiplier
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Frequency increases with multiplier (psychological effect)
      const baseFreq = 300;
      const freqMultiplier = Math.min(multiplier / 2, 6); // Cap at 6x frequency
      const frequency = baseFreq * freqMultiplier;

      oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
      oscillator.type = 'triangle';

      // Volume increases with multiplier for more tension
      const volumeMultiplier = Math.min(multiplier / 3, 2);
      const volume = 0.05 * volumeMultiplier * this.config.volume * this.config.masterVolume;

      gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.3);
    } catch (error) {
      // Silently handle tension sound creation errors
    }
  }

  // Create dramatic crash sound
  playCrashSound(crashPoint: number) {
    if (!this.initialized || !this.audioContext) return;

    try {
      // Create a dramatic crash sound
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Start high and crash down
      oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.8);
      oscillator.type = 'sawtooth';

      gainNode.gain.setValueAtTime(0.3 * this.config.volume * this.config.masterVolume, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.8);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.8);

      // Add explosion effect
      setTimeout(() => {
        const explosionOsc = this.audioContext!.createOscillator();
        const explosionGain = this.audioContext!.createGain();

        explosionOsc.connect(explosionGain);
        explosionGain.connect(this.audioContext!.destination);

        explosionOsc.frequency.setValueAtTime(100, this.audioContext!.currentTime);
        explosionOsc.frequency.exponentialRampToValueAtTime(20, this.audioContext!.currentTime + 1);
        explosionOsc.type = 'square';

        explosionGain.gain.setValueAtTime(0.2 * this.config.volume * this.config.masterVolume, this.audioContext!.currentTime);
        explosionGain.gain.exponentialRampToValueAtTime(0.01, this.audioContext!.currentTime + 1);

        explosionOsc.start(this.audioContext!.currentTime);
        explosionOsc.stop(this.audioContext!.currentTime + 1);
      }, 100);
    } catch (error) {
      // Silently handle crash sound creation errors
    }
  }

  // Create multiplier tick sound based on current multiplier
  playMultiplierTick(multiplier: number) {
    if (multiplier < 1.1) return;

    // Create dynamic tick sound based on multiplier
    const baseFreq = 440; // A4 note
    const freqMultiplier = Math.min(multiplier / 2, 4); // Cap at 4x frequency
    const frequency = baseFreq * freqMultiplier;
    
    this.createCustomSound(frequency, 0.1, 'sine');
  }
}

// Create singleton instance
const soundSystem = new SoundSystem();

export default soundSystem;
