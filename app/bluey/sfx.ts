/**
 * Tiny synthesized sound effects, so the Bluey games need no extra audio
 * files. The AudioContext starts on the first touch (browsers require a
 * gesture) and every sound is short and soft.
 */
export type Sfx =
  | 'cut'
  | 'star'
  | 'pop'
  | 'bubble'
  | 'boing'
  | 'hook'
  | 'fan'
  | 'win'
  | 'lose'
  | 'bop'
  | 'tap';

let context: AudioContext | null = null;
function audio() {
  try {
    context ??= new AudioContext();
    if (context.state === 'suspended') void context.resume();
    return context;
  } catch {
    return null;
  }
}
/** Call from a pointer handler so iOS unlocks audio on the first touch. */
export const unlockAudio = () => void audio();

function tone(
  ctx: AudioContext,
  {
    type = 'sine',
    from,
    to = from,
    at = 0,
    length,
    volume = 0.12,
  }: {
    type?: OscillatorType;
    from: number;
    to?: number;
    at?: number;
    length: number;
    volume?: number;
  },
) {
  const t = ctx.currentTime + at;
  const o = ctx.createOscillator(),
    g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(from, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + length);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(volume, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + length);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + length + 0.02);
}
function noise(
  ctx: AudioContext,
  {
    at = 0,
    length,
    volume = 0.1,
    freq = 3000,
    q = 1,
    sweep,
  }: {
    at?: number;
    length: number;
    volume?: number;
    freq?: number;
    q?: number;
    sweep?: number;
  },
): void {
  const t = ctx.currentTime + at;
  const buffer = ctx.createBuffer(
    1,
    Math.ceil(ctx.sampleRate * length),
    ctx.sampleRate,
  );
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = q;
  filter.frequency.setValueAtTime(freq, t);
  filter.frequency.exponentialRampToValueAtTime(sweep ?? freq, t + length);
  const g = ctx.createGain();
  g.gain.setValueAtTime(volume, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + length);
  src.connect(filter).connect(g).connect(ctx.destination);
  src.start(t);
}

/** `n` lets a sound step up in pitch, e.g. the second and third star. */
export function play(sound: Sfx, n = 0) {
  const ctx = audio();
  if (!ctx) return;
  try {
    switch (sound) {
      case 'cut':
        noise(ctx, { length: 0.09, freq: 5200, q: 2, volume: 0.22 });
        tone(ctx, {
          type: 'triangle',
          from: 1400,
          to: 700,
          length: 0.07,
          volume: 0.05,
        });
        break;
      case 'star': {
        const base = [880, 988, 1175][Math.min(2, n)];
        tone(ctx, { type: 'triangle', from: base, length: 0.14, volume: 0.1 });
        tone(ctx, {
          type: 'triangle',
          from: base * 1.5,
          at: 0.07,
          length: 0.2,
          volume: 0.08,
        });
        tone(ctx, {
          type: 'sine',
          from: base * 2,
          at: 0.14,
          length: 0.25,
          volume: 0.05,
        });
        break;
      }
      case 'pop':
        tone(ctx, { from: 900, to: 180, length: 0.1, volume: 0.16 });
        noise(ctx, { length: 0.05, freq: 2500, volume: 0.08 });
        break;
      case 'bubble':
        tone(ctx, { from: 300, to: 700, length: 0.18, volume: 0.1 });
        tone(ctx, { from: 450, to: 900, at: 0.08, length: 0.14, volume: 0.06 });
        break;
      case 'boing':
        tone(ctx, {
          type: 'triangle',
          from: 180,
          to: 520,
          length: 0.12,
          volume: 0.14,
        });
        tone(ctx, {
          type: 'sine',
          from: 520,
          to: 260,
          at: 0.1,
          length: 0.22,
          volume: 0.08,
        });
        break;
      case 'hook':
        tone(ctx, {
          type: 'square',
          from: 1200,
          to: 900,
          length: 0.04,
          volume: 0.04,
        });
        tone(ctx, {
          type: 'triangle',
          from: 600,
          length: 0.1,
          at: 0.03,
          volume: 0.06,
        });
        break;
      case 'fan':
        noise(ctx, {
          length: 0.45,
          freq: 500,
          sweep: 1800,
          q: 0.6,
          volume: 0.16,
        });
        break;
      case 'win':
        [523, 659, 784, 1047].forEach((f, i) =>
          tone(ctx, {
            type: 'triangle',
            from: f,
            at: 0.1 + i * 0.09,
            length: 0.22,
            volume: 0.1,
          }),
        );
        // Three happy munches.
        for (let i = 0; i < 3; i++)
          noise(ctx, {
            at: i * 0.13,
            length: 0.07,
            freq: 900,
            q: 1.5,
            volume: 0.18,
          });
        break;
      case 'lose':
        tone(ctx, {
          type: 'triangle',
          from: 392,
          to: 370,
          length: 0.2,
          volume: 0.08,
        });
        tone(ctx, {
          type: 'triangle',
          from: 330,
          to: 262,
          at: 0.2,
          length: 0.35,
          volume: 0.08,
        });
        break;
      case 'bop':
        tone(ctx, { from: 260 + n * 18, to: 140, length: 0.12, volume: 0.18 });
        tone(ctx, {
          type: 'triangle',
          from: 520 + n * 30,
          length: 0.08,
          volume: 0.05,
        });
        break;
      case 'tap':
        tone(ctx, { type: 'triangle', from: 660, length: 0.06, volume: 0.05 });
        break;
    }
  } catch {}
}
