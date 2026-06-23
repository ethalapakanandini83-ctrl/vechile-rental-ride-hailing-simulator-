// Web Audio API Sound Synthesizer for high-fidelity car sound effects
class AudioSynth {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume context if suspended (browser security autoplays)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playUnlock() {
    this.init();
    const osc1 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, this.ctx.currentTime); // A5
    osc1.frequency.setValueAtTime(1200, this.ctx.currentTime + 0.08); // High chirp
    
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, this.ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);
    
    osc1.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc1.start();
    osc1.stop(this.ctx.currentTime + 0.25);
  }

  playLock() {
    this.init();
    const osc1 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1000, this.ctx.currentTime); 
    osc1.frequency.setValueAtTime(700, this.ctx.currentTime + 0.08); // Lower pitch chirp
    
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, this.ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);
    
    osc1.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc1.start();
    osc1.stop(this.ctx.currentTime + 0.25);
  }

  playHonk() {
    this.init();
    // Dual oscillators to simulate a real metallic horn resonance
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(440, this.ctx.currentTime); // Pitch A4
    
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(445, this.ctx.currentTime); // Slight detune for grit
    
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, this.ctx.currentTime + 0.02);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
    
    // Low pass filter to keep it from being too harsh
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, this.ctx.currentTime);
    
    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc1.start();
    osc2.start();
    osc1.stop(this.ctx.currentTime + 0.3);
    osc2.stop(this.ctx.currentTime + 0.3);
  }

  playEngineStart() {
    this.init();
    const now = this.ctx.currentTime;
    
    // 1. Starter motor sound (high frequency whine)
    const starterOsc = this.ctx.createOscillator();
    const starterGain = this.ctx.createGain();
    starterOsc.type = 'sine';
    starterOsc.frequency.setValueAtTime(150, now);
    starterOsc.frequency.exponentialRampToValueAtTime(300, now + 0.5);
    
    starterGain.gain.setValueAtTime(0.15, now);
    starterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    
    starterOsc.connect(starterGain);
    starterGain.connect(this.ctx.destination);
    
    starterOsc.start(now);
    starterOsc.stop(now + 0.5);
    
    // 2. Engine rumble (low frequency noise + oscillator)
    const engineOsc = this.ctx.createOscillator();
    const engineGain = this.ctx.createGain();
    engineOsc.type = 'triangle';
    engineOsc.frequency.setValueAtTime(25, now + 0.3); // Deep rumble
    engineOsc.frequency.linearRampToValueAtTime(75, now + 0.6); // Rev up on ignite
    engineOsc.frequency.linearRampToValueAtTime(45, now + 1.2); // Settle to idle
    
    engineGain.gain.setValueAtTime(0, now);
    engineGain.gain.setValueAtTime(0, now + 0.3);
    engineGain.gain.linearRampToValueAtTime(0.35, now + 0.5); // Ignition boom!
    engineGain.gain.linearRampToValueAtTime(0.1, now + 1.2); // Settle to idle volume
    
    // Filter to warm it up
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, now);
    
    engineOsc.connect(filter);
    filter.connect(engineGain);
    engineGain.connect(this.ctx.destination);
    
    engineOsc.start(now + 0.3);
    
    // Store reference so we can stop it
    this.engineOsc = engineOsc;
    this.engineGain = engineGain;
  }

  playEngineStop() {
    this.init();
    if (this.engineOsc && this.engineGain) {
      const now = this.ctx.currentTime;
      try {
        // Ramp down pitch and gain
        this.engineOsc.frequency.cancelScheduledValues(now);
        this.engineOsc.frequency.setValueAtTime(this.engineOsc.frequency.value, now);
        this.engineOsc.frequency.exponentialRampToValueAtTime(10, now + 0.6);
        
        this.engineGain.gain.cancelScheduledValues(now);
        this.engineGain.gain.setValueAtTime(this.engineGain.gain.value, now);
        this.engineGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        
        const osc = this.engineOsc;
        setTimeout(() => {
          try { osc.stop(); } catch(e) {}
        }, 800);
      } catch (e) {
        console.warn('Error stopping synthesized engine sound:', e);
      }
      this.engineOsc = null;
      this.engineGain = null;
    }
  }

  playNotification() {
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, this.ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, this.ctx.currentTime + 0.1); // A5
    
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.5);
  }
}

export const synth = new AudioSynth();
