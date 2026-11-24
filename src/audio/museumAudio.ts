import { EraId } from '../types/castle';

class MuseumAudioEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private currentEra: EraId = 2;

  // Persistent ambient graph nodes
  private masterAmbientGain: GainNode | null = null;
  private riverGain: GainNode | null = null;
  private fireGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private ambientStarted = false;
  private birdTimer: number | null = null;
  private crackleTimer: number | null = null;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (!this.ambientStarted) {
      this.startAmbientLoop();
    }
    return this.ctx;
  }

  private createNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer) return this.noiseBuffer;
    const len = ctx.sampleRate * 3;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    // Pink-ish filtered noise approximation (Paul Kellet)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
      b6 = white * 0.115926;
    }
    this.noiseBuffer = buf;
    return buf;
  }

  private startAmbientLoop() {
    if (!this.ctx || this.ambientStarted) return;
    const ctx = this.ctx;
    this.ambientStarted = true;

    const noise = this.createNoiseBuffer(ctx);

    this.masterAmbientGain = ctx.createGain();
    this.masterAmbientGain.gain.value = this.muted ? 0 : 1;
    this.masterAmbientGain.connect(ctx.destination);

    // 1. River Odra & Gentle Breeze (Peaceful eras)
    const riverSrc = ctx.createBufferSource();
    riverSrc.buffer = noise;
    riverSrc.loop = true;

    const riverFilter = ctx.createBiquadFilter();
    riverFilter.type = 'lowpass';
    riverFilter.frequency.value = 520;
    riverFilter.Q.value = 0.7;

    // Slow LFO modulating breeze/water cutoff
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.14;
    lfoGain.gain.value = 180;
    lfo.connect(lfoGain);
    lfoGain.connect(riverFilter.frequency);
    lfo.start();

    this.riverGain = ctx.createGain();
    this.riverGain.gain.value = this.currentEra === 3 ? 0.01 : 0.22;

    riverSrc.connect(riverFilter);
    riverFilter.connect(this.riverGain);
    this.riverGain.connect(this.masterAmbientGain);
    riverSrc.start();

    // 2. Great Fire Roar (Era 3)
    const fireSrc = ctx.createBufferSource();
    fireSrc.buffer = noise;
    fireSrc.loop = true;

    const fireFilter = ctx.createBiquadFilter();
    fireFilter.type = 'bandpass';
    fireFilter.frequency.value = 340;
    fireFilter.Q.value = 0.85;

    this.fireGain = ctx.createGain();
    this.fireGain.gain.value = this.currentEra === 3 ? 0.35 : 0;

    fireSrc.connect(fireFilter);
    fireFilter.connect(this.fireGain);
    this.fireGain.connect(this.masterAmbientGain);
    fireSrc.start();

    // 3. Occasional Bird Chirps & Fire Crackles
    const scheduleBird = () => {
      if (this.ctx && !this.muted && this.currentEra !== 3 && this.ctx.state === 'running') {
        this.playBirdChirp(this.ctx);
      }
      this.birdTimer = window.setTimeout(scheduleBird, 3200 + Math.random() * 4500);
    };
    this.birdTimer = window.setTimeout(scheduleBird, 1800);

    const scheduleCrackle = () => {
      if (this.ctx && !this.muted && this.currentEra === 3 && this.ctx.state === 'running') {
        this.playFireCrackleBurst(this.ctx);
      }
      this.crackleTimer = window.setTimeout(scheduleCrackle, 90 + Math.random() * 240);
    };
    this.crackleTimer = window.setTimeout(scheduleCrackle, 250);
  }

  private playBirdChirp(ctx: AudioContext) {
    const now = ctx.currentTime;
    const notes = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < notes; i++) {
      const t = now + i * 0.14;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const base = 2400 + Math.random() * 900;
      osc.frequency.setValueAtTime(base, t);
      osc.frequency.exponentialRampToValueAtTime(base * 1.32, t + 0.045);
      osc.frequency.exponentialRampToValueAtTime(base * 0.92, t + 0.095);

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.025, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.12);
    }
  }

  private playFireCrackleBurst(ctx: AudioContext) {
    if (!this.noiseBuffer) return;
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1800 + Math.random() * 2200;

    const gain = ctx.createGain();
    const peak = 0.04 + Math.random() * 0.06;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.045);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(now, Math.random() * 2.5, 0.05);
  }

  public unlock() {
    this.ensureContext();
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (this.ctx && this.masterAmbientGain) {
      this.masterAmbientGain.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.08);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setEraAmbience(era: EraId) {
    this.currentEra = era;
    const ctx = this.ctx;
    if (!ctx || !this.riverGain || !this.fireGain) return;
    const now = ctx.currentTime;
    if (era === 3) {
      this.riverGain.gain.setTargetAtTime(0.02, now, 0.35);
      this.fireGain.gain.setTargetAtTime(0.38, now, 0.35);
    } else {
      this.riverGain.gain.setTargetAtTime(0.22, now, 0.35);
      this.fireGain.gain.setTargetAtTime(0.0, now, 0.35);
    }
  }

  /**
   * Metallic chain & iron portcullis winch sound
   */
  public playPortcullisSound(opening: boolean) {
    const ctx = this.ensureContext();
    if (!ctx || this.muted) return;

    const now = ctx.currentTime;

    const clickCount = 9;
    for (let i = 0; i < clickCount; i++) {
      const t = now + i * 0.085;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      const baseFreq = opening ? 240 + i * 18 : 380 - i * 16;
      osc.frequency.setValueAtTime(baseFreq, t);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.4, t + 0.03);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, t);
      filter.Q.setValueAtTime(5.5, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.095, t + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.055);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.06);
    }

    const thudTime = opening ? now + 0.04 : now + clickCount * 0.085;
    const thudOsc = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thudOsc.type = 'triangle';
    thudOsc.frequency.setValueAtTime(opening ? 135 : 95, thudTime);
    thudOsc.frequency.exponentialRampToValueAtTime(38, thudTime + 0.26);

    thudGain.gain.setValueAtTime(0.24, thudTime);
    thudGain.gain.exponentialRampToValueAtTime(0.001, thudTime + 0.3);

    thudOsc.connect(thudGain);
    thudGain.connect(ctx.destination);
    thudOsc.start(thudTime);
    thudOsc.stop(thudTime + 0.32);
  }

  /**
   * Deep warm large castle bell for XV century (Golden Age)
   */
  public playCastleBellWarm() {
    const ctx = this.ensureContext();
    if (!ctx || this.muted) return;

    const now = ctx.currentTime;
    const partials = [
      { freq: 146.83, amp: 0.24, dur: 3.1 }, // D3 hum/fundamental
      { freq: 293.66, amp: 0.16, dur: 2.5 }, // D4 prime
      { freq: 349.23, amp: 0.10, dur: 1.9 }, // F4 minor tierce
      { freq: 440.00, amp: 0.07, dur: 1.5 }, // A4 quint
      { freq: 587.33, amp: 0.04, dur: 1.1 }, // D5 nominal
    ];

    partials.forEach((p) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(p.freq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(p.amp, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + p.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + p.dur + 0.05);
    });
  }

  /**
   * Rapid urgent alarm bell strikes for Era 3 (Great Fire)
   */
  public playFireAlarmBell() {
    const ctx = this.ensureContext();
    if (!ctx || this.muted) return;

    const now = ctx.currentTime;
    const strikeTimes = [now, now + 0.36, now + 0.72, now + 1.08];

    strikeTimes.forEach((t, idx) => {
      const partials = [
        { freq: 329.6, amp: 0.2, dur: 1.25 },
        { freq: 493.9, amp: 0.14, dur: 0.95 },
        { freq: 659.2, amp: 0.1, dur: 0.75 },
        { freq: 987.7, amp: 0.05, dur: 0.5 },
      ];

      partials.forEach((p) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(p.freq * (idx % 2 === 1 ? 0.992 : 1), t);

        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(p.amp, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0008, t + p.dur);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + p.dur + 0.05);
      });
    });
  }

  /**
   * Subtle old parchment rustle / tactile click when tapping "i" hotspots
   */
  public playHotspotParchmentSound() {
    const ctx = this.ensureContext();
    if (!ctx || this.muted) return;

    const now = ctx.currentTime;
    const buf = this.createNoiseBuffer(ctx);

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2200, now);
    filter.frequency.linearRampToValueAtTime(3600, now + 0.14);
    filter.Q.value = 1.4;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(now, 0.1, 0.2);

    // Subtle soft wooden tap
    const tap = ctx.createOscillator();
    const tapGain = ctx.createGain();
    tap.type = 'sine';
    tap.frequency.setValueAtTime(520, now);
    tap.frequency.exponentialRampToValueAtTime(260, now + 0.045);
    tapGain.gain.setValueAtTime(0.08, now);
    tapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    tap.connect(tapGain);
    tapGain.connect(ctx.destination);
    tap.start(now);
    tap.stop(now + 0.06);
  }

  /**
   * Loud realistic pistol / musket shot with courtyard echo when tapping the guard
   */
  public playMusketShotSound() {
    const ctx = this.ensureContext();
    if (!ctx || this.muted) return;

    const now = ctx.currentTime;

    // Generate raw white noise burst for gunpowder explosion
    const shotLen = Math.floor(ctx.sampleRate * 0.9);
    const shotBuf = ctx.createBuffer(1, shotLen, ctx.sampleRate);
    const d = shotBuf.getChannelData(0);
    for (let i = 0; i < shotLen; i++) {
      const env = Math.exp(-i / (ctx.sampleRate * 0.11));
      d[i] = (Math.random() * 2 - 1) * env;
    }

    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = shotBuf;

    const shotFilter = ctx.createBiquadFilter();
    shotFilter.type = 'lowpass';
    shotFilter.frequency.setValueAtTime(5500, now);
    shotFilter.frequency.exponentialRampToValueAtTime(320, now + 0.35);

    const shotGain = ctx.createGain();
    shotGain.gain.setValueAtTime(0.85, now);
    shotGain.gain.exponentialRampToValueAtTime(0.002, now + 0.65);

    noiseSrc.connect(shotFilter);
    shotFilter.connect(shotGain);
    shotGain.connect(ctx.destination);
    noiseSrc.start(now);

    // Low-end percussion boom
    const punchOsc = ctx.createOscillator();
    const punchGain = ctx.createGain();
    punchOsc.type = 'triangle';
    punchOsc.frequency.setValueAtTime(190, now);
    punchOsc.frequency.exponentialRampToValueAtTime(42, now + 0.16);
    punchGain.gain.setValueAtTime(0.55, now);
    punchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    punchOsc.connect(punchGain);
    punchGain.connect(ctx.destination);
    punchOsc.start(now);
    punchOsc.stop(now + 0.24);

    // Courtyard stone wall echo tail
    const echoSrc = ctx.createBufferSource();
    echoSrc.buffer = shotBuf;
    const echoFilter = ctx.createBiquadFilter();
    echoFilter.type = 'lowpass';
    echoFilter.frequency.value = 900;
    const echoGain = ctx.createGain();
    echoGain.gain.setValueAtTime(0.22, now + 0.16);
    echoGain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
    echoSrc.connect(echoFilter);
    echoFilter.connect(echoGain);
    echoGain.connect(ctx.destination);
    echoSrc.start(now + 0.16);
  }

  /**
   * Magical fairy-tale awakening chimes + low dragon roar + 3s roaring fire breath
   */
  public playDragonWakeFireSound() {
    const ctx = this.ensureContext();
    if (!ctx || this.muted) return;

    const now = ctx.currentTime;

    // 1. Magical fairy-tale sparkle arpeggio (celesta/bell chimes)
    const chimeNotes = [523.25, 659.25, 783.99, 987.77, 1174.66, 1567.98];
    chimeNotes.forEach((freq, idx) => {
      const t = now + idx * 0.068;
      const osc = ctx.createOscillator();
      const harm = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      harm.type = 'triangle';
      harm.frequency.setValueAtTime(freq * 2.0, t);

      const harmGain = ctx.createGain();
      harmGain.gain.setValueAtTime(0.22, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.14, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0005, t + 0.85);

      osc.connect(gain);
      harm.connect(harmGain);
      harmGain.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      harm.start(t);
      osc.stop(t + 0.9);
      harm.stop(t + 0.9);
    });

    // 2. Low Dragon Roar
    const roarOsc = ctx.createOscillator();
    const roarSub = ctx.createOscillator();
    const roarFilter = ctx.createBiquadFilter();
    const roarGain = ctx.createGain();

    roarOsc.type = 'sawtooth';
    roarOsc.frequency.setValueAtTime(128, now + 0.15);
    roarOsc.frequency.exponentialRampToValueAtTime(58, now + 1.35);

    roarSub.type = 'triangle';
    roarSub.frequency.setValueAtTime(64, now + 0.15);
    roarSub.frequency.exponentialRampToValueAtTime(36, now + 1.35);

    roarFilter.type = 'lowpass';
    roarFilter.frequency.setValueAtTime(420, now + 0.15);
    roarFilter.frequency.linearRampToValueAtTime(210, now + 1.35);

    roarGain.gain.setValueAtTime(0.001, now + 0.15);
    roarGain.gain.linearRampToValueAtTime(0.26, now + 0.32);
    roarGain.gain.exponentialRampToValueAtTime(0.001, now + 1.45);

    roarOsc.connect(roarFilter);
    roarSub.connect(roarFilter);
    roarFilter.connect(roarGain);
    roarGain.connect(ctx.destination);

    roarOsc.start(now + 0.15);
    roarSub.start(now + 0.15);
    roarOsc.stop(now + 1.5);
    roarSub.stop(now + 1.5);

    // 3. 3-second Dragon Fire Breath Whoosh
    const noise = this.createNoiseBuffer(ctx);
    const fireSrc = ctx.createBufferSource();
    fireSrc.buffer = noise;
    fireSrc.loop = true;

    const fireFilter = ctx.createBiquadFilter();
    fireFilter.type = 'bandpass';
    fireFilter.frequency.setValueAtTime(360, now + 0.25);
    fireFilter.frequency.exponentialRampToValueAtTime(1450, now + 0.75);
    fireFilter.frequency.exponentialRampToValueAtTime(440, now + 3.0);
    fireFilter.Q.value = 0.7;

    const fireGain = ctx.createGain();
    fireGain.gain.setValueAtTime(0.001, now + 0.22);
    fireGain.gain.linearRampToValueAtTime(0.55, now + 0.55);
    fireGain.gain.setValueAtTime(0.45, now + 2.35);
    fireGain.gain.exponentialRampToValueAtTime(0.001, now + 3.05);

    fireSrc.connect(fireFilter);
    fireFilter.connect(fireGain);
    fireGain.connect(ctx.destination);
    fireSrc.start(now + 0.22);
    fireSrc.stop(now + 3.1);
  }

  /**
   * Era transition cue + ambience update
   */
  public playEraTransition(era: EraId) {
    this.ensureContext();
    this.setEraAmbience(era);

    if (this.muted || !this.ctx) return;
    if (era === 2) {
      this.playCastleBellWarm();
      return;
    }
    if (era === 3) {
      this.playFireAlarmBell();
      return;
    }

    const now = this.ctx.currentTime;
    const freq = era === 1 ? 261.6 : 440.0;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.25, now + 0.18);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.09, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  /**
   * Subtle, pleasant two-tone notification chime when guide activates TOUR
   */
  public playTourNotifyChime() {
    const ctx = this.ensureContext();
    if (!ctx || this.muted) return;

    const now = ctx.currentTime;
    const notes = [
      { freq: 659.25, delay: 0, dur: 0.42 },
      { freq: 880.0, delay: 0.12, dur: 0.56 },
    ];

    notes.forEach(({ freq, delay, dur }) => {
      const t = now + delay;
      const osc = ctx.createOscillator();
      const overtone = ctx.createOscillator();
      const overtoneGain = ctx.createGain();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      overtone.type = 'triangle';
      overtone.frequency.setValueAtTime(freq * 2, t);
      overtoneGain.gain.setValueAtTime(0.16, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.11, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0005, t + dur);

      osc.connect(gain);
      overtone.connect(overtoneGain);
      overtoneGain.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      overtone.start(t);
      osc.stop(t + dur + 0.04);
      overtone.stop(t + dur + 0.04);
    });
  }

  public dispose() {
    if (this.birdTimer) clearTimeout(this.birdTimer);
    if (this.crackleTimer) clearTimeout(this.crackleTimer);
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}

export const museumAudio = new MuseumAudioEngine();
