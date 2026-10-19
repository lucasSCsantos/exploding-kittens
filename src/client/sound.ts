// Howler.js sound effects (ticket 15). Every clip is synthesized on first use into a short WAV
// data URI — there are no bundled audio assets yet (ticket 18's deck art is the only asset source
// so far) — so this has no network/file dependency. Playback is best-effort: a browser without
// Web Audio/HTMLAudio support, or one that blocks autoplay, must never crash the game over a sound.

import { Howl } from "howler";

export type SoundName = "swish" | "draw" | "nopeStamp" | "explosion" | "win";

const SAMPLE_RATE = 22050;

function sineEnvelope(
  durationSeconds: number,
  freqStart: number,
  freqEnd: number,
  attack: number,
): Float32Array {
  const length = Math.floor(SAMPLE_RATE * durationSeconds);
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const t = i / SAMPLE_RATE;
    const progress = t / durationSeconds;
    const freq = freqStart + (freqEnd - freqStart) * progress;
    const envelope = t < attack ? t / attack : Math.pow(1 - (t - attack) / (durationSeconds - attack), 2);
    samples[i] = Math.sin(2 * Math.PI * freq * t) * envelope;
  }
  return samples;
}

function noiseBurst(durationSeconds: number, brown: boolean): Float32Array {
  const length = Math.floor(SAMPLE_RATE * durationSeconds);
  const samples = new Float32Array(length);
  let last = 0;
  for (let i = 0; i < length; i++) {
    const t = i / SAMPLE_RATE;
    const white = Math.random() * 2 - 1;
    last = brown ? (last + white * 0.1) / 1.1 : white;
    const envelope = Math.pow(1 - t / durationSeconds, 2);
    samples[i] = last * envelope;
  }
  return samples;
}

function chord(notes: { freq: number; start: number; duration: number }[], total: number): Float32Array {
  const length = Math.floor(SAMPLE_RATE * total);
  const samples = new Float32Array(length);
  for (const note of notes) {
    const startIndex = Math.floor(note.freq > 0 ? note.start * SAMPLE_RATE : 0);
    const noteLength = Math.floor(note.duration * SAMPLE_RATE);
    for (let i = 0; i < noteLength && startIndex + i < length; i++) {
      const t = i / SAMPLE_RATE;
      const envelope = Math.pow(1 - t / note.duration, 2);
      samples[startIndex + i]! += Math.sin(2 * Math.PI * note.freq * t) * envelope * 0.5;
    }
  }
  return samples;
}

function mix(a: Float32Array, b: Float32Array): Float32Array {
  const length = Math.max(a.length, b.length);
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    out[i] = (a[i] ?? 0) + (b[i] ?? 0);
  }
  return out;
}

const GENERATORS: Record<SoundName, () => Float32Array> = {
  swish: () => mix(sineEnvelope(0.14, 1400, 500, 0.01), noiseBurst(0.1, false)),
  draw: () => sineEnvelope(0.09, 500, 420, 0.005),
  nopeStamp: () => mix(sineEnvelope(0.18, 180, 90, 0.002), noiseBurst(0.05, false)),
  explosion: () => noiseBurst(0.6, true),
  win: () =>
    chord(
      [
        { freq: 523.25, start: 0, duration: 0.18 },
        { freq: 659.25, start: 0.12, duration: 0.18 },
        { freq: 783.99, start: 0.24, duration: 0.3 },
      ],
      0.6,
    ),
};

function floatTo16BitPcm(samples: Float32Array): Uint8Array {
  const out = new Uint8Array(samples.length * 2);
  const view = new DataView(out.buffer);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]!));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return out;
}

function encodeWavDataUri(samples: Float32Array): string {
  const pcm = floatTo16BitPcm(samples);
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const writeString = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + pcm.length, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, pcm.length, true);

  const bytes = new Uint8Array(header.byteLength + pcm.length);
  bytes.set(new Uint8Array(header), 0);
  bytes.set(pcm, header.byteLength);

  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

const howls = new Map<SoundName, Howl>();

function getHowl(name: SoundName): Howl {
  const cached = howls.get(name);
  if (cached) return cached;
  const howl = new Howl({ src: [encodeWavDataUri(GENERATORS[name]())], format: ["wav"] });
  howls.set(name, howl);
  return howl;
}

/** Plays `name`, degrading to a silent no-op on any failure (unsupported/blocked audio). */
export function playSound(name: SoundName): void {
  try {
    getHowl(name).play();
  } catch {
    // Unsupported or blocked audio — the game must keep working without sound.
  }
}
