import { load, save } from './save';

/** Tiny synthesized sound effects so the game ships with zero audio assets. */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
const lastPlayed: Record<string, number> = {};

function ac(): AudioContext | null {
  if (load().muted) return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  // 'suspended' until a gesture; iOS also reports 'interrupted' (calls, other apps, backgrounding)
  if (ctx.state !== 'running' && ctx.state !== 'closed') void ctx.resume().catch(() => {});
  return ctx;
}

/** Call from any user gesture to unlock audio on mobile. */
export function unlockAudio(): void {
  ac();
}

function throttle(name: string, ms: number): boolean {
  const now = performance.now();
  if ((lastPlayed[name] ?? 0) + ms > now) return false;
  lastPlayed[name] = now;
  return true;
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, delay = 0): void {
  const c = ac();
  if (!c || !master) return;
  const t0 = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noise(dur: number, vol: number, filterFreq: number, type: BiquadFilterType = 'lowpass', delay = 0): void {
  const c = ac();
  if (!c || !master || !noiseBuf) return;
  const t0 = c.currentTime + delay;
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = filterFreq;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t0, Math.random() * 0.5);
  src.stop(t0 + dur + 0.02);
}

export const sfx = {
  click() { tone(660, 0.06, 'triangle', 0.25); },
  arrow() { if (throttle('arrow', 60)) noise(0.08, 0.15, 3000, 'highpass'); },
  magic() { if (throttle('magic', 80)) tone(500, 0.25, 'sine', 0.18, 1400); },
  frost() { if (throttle('frost', 80)) tone(1400, 0.25, 'sine', 0.12, 700); },
  zap() { if (throttle('zap', 80)) { tone(180, 0.18, 'sawtooth', 0.12, 90); noise(0.12, 0.1, 5000, 'highpass'); } },
  cannon() { if (throttle('cannon', 90)) { tone(110, 0.25, 'sine', 0.35, 50); noise(0.15, 0.2, 800); } },
  rocket() { if (throttle('rocket', 90)) noise(0.3, 0.12, 1500, 'bandpass'); },
  boom() { if (throttle('boom', 70)) { noise(0.45, 0.4, 600); tone(70, 0.4, 'sine', 0.3, 35); } },
  hit() { if (throttle('hit', 50)) tone(220, 0.05, 'square', 0.06, 140); },
  sword() { if (throttle('sword', 90)) noise(0.06, 0.12, 2500, 'bandpass'); },
  die() { if (throttle('die', 60)) tone(300, 0.15, 'triangle', 0.12, 120); },
  coin() { if (throttle('coin', 50)) { tone(988, 0.07, 'square', 0.08); tone(1318, 0.12, 'square', 0.08, undefined, 0.06); } },
  build() { noise(0.12, 0.25, 900); tone(330, 0.1, 'triangle', 0.2, undefined, 0.05); tone(495, 0.15, 'triangle', 0.2, undefined, 0.12); },
  upgrade() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.14, 'triangle', 0.18, undefined, i * 0.07)); },
  sell() { tone(784, 0.1, 'square', 0.08); tone(523, 0.15, 'square', 0.08, undefined, 0.08); },
  leak() { tone(200, 0.4, 'sawtooth', 0.15, 80); },
  wave() { tone(392, 0.25, 'sawtooth', 0.12); tone(392, 0.25, 'sawtooth', 0.12, undefined, 0.28); tone(587, 0.5, 'sawtooth', 0.14, undefined, 0.56); },
  meteor() { noise(0.9, 0.25, 400); tone(400, 0.8, 'sawtooth', 0.08, 60); },
  horn() { tone(294, 0.3, 'sawtooth', 0.12); tone(440, 0.45, 'sawtooth', 0.12, undefined, 0.25); },
  victory() { [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, 0.25, 'triangle', 0.2, undefined, i * 0.13)); },
  defeat() { [392, 349, 311, 262].forEach((f, i) => tone(f, 0.4, 'sawtooth', 0.12, undefined, i * 0.25)); },
  error() { tone(160, 0.15, 'square', 0.1); },
};

export function setMuted(m: boolean): void {
  load().muted = m;
  save();
  if (m && ctx) { void ctx.suspend(); }
  if (!m) ac();
}

export function isMuted(): boolean {
  return load().muted;
}
