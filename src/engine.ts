// Web Audio engine.
// triggerMode "poly": one voice PER sound — different sounds layer, re-pressing
//   the same sound restarts it from 0.
// triggerMode "mono": one voice total — any press cuts whatever is sounding.

export type TriggerMode = "poly" | "mono";

type PlaybackListener = {
  onStart?: (file: string, duration: number, reverse: boolean) => void;
  onEnd?: (file: string) => void;
};

let ctx: AudioContext | null = null;
let compressor: DynamicsCompressorNode | null = null;
let gain: GainNode | null = null;

const buffers = new Map<string, AudioBuffer>(); // decoded, cached (raw bytes live in the SW/HTTP cache)
const voices = new Map<string, AudioBufferSourceNode>(); // live voice by sound
const reversed = new Map<string, AudioBuffer>(); // cached reversed copies (Shift+key)

const BASE = "sounds/";

let volume = 1;
let triggerMode: TriggerMode = "poly";
let listener: PlaybackListener = {};

export function setPlaybackListener(l: PlaybackListener): void {
  listener = l;
}

export function setVolume(v: number): void {
  volume = v;
  if (gain) gain.gain.value = v;
}

export function setTriggerMode(m: TriggerMode): void {
  triggerMode = m;
}

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
    compressor = ctx.createDynamicsCompressor(); // tames peaks when sounds stack
    gain = ctx.createGain();
    gain.gain.value = volume;
    compressor.connect(gain);
    gain.connect(ctx.destination);
    // Recover from mobile lock / tab-background: iOS/Android suspend (or "interrupt") the
    // context and kill in-flight sources. On return, resume it and clear the dead voices so
    // their stuck progress fills get cleared.
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && ctx && ctx.state !== "running") {
        void ctx.resume().catch(() => {});
        stopAll();
      }
    });
  }
  return ctx;
}

async function decode(file: string): Promise<AudioBuffer> {
  const hit = buffers.get(file);
  if (hit) return hit;
  const c = getCtx();
  const raw = await fetch(BASE + file).then((r) => r.arrayBuffer());
  const buf = await c.decodeAudioData(raw); // detaches raw; we don't reuse it
  buffers.set(file, buf);
  return buf;
}

// Decode ahead of time (the favorites) so their first tap is instant.
export async function warmup(files: string[]): Promise<void> {
  getCtx();
  await Promise.all(files.map((f) => decode(f).catch(() => {})));
}

// Warm the SW/HTTP cache for the rest, one file at a time during idle, so a first tap
// fetches from disk (no network wait). Raw bytes are NOT kept in RAM — only decoded buffers.
// ponytail: prefetches every file; skip >Nkb clips if mobile-data cost matters
export function prefetch(files: string[]): void {
  let i = 0;
  const idle = (fn: () => void) =>
    "requestIdleCallback" in window ? requestIdleCallback(() => fn()) : setTimeout(fn, 16);
  const next = () => {
    while (i < files.length && buffers.has(files[i])) i++;
    if (i >= files.length) return;
    fetch(BASE + files[i++])
      .then((r) => r.arrayBuffer())
      .catch(() => {})
      .finally(() => idle(next));
  };
  idle(next);
}

function stopVoice(file: string): void {
  const v = voices.get(file);
  if (!v) return;
  try {
    v.stop();
  } catch {
    /* already ended */
  }
  voices.delete(file);
  listener.onEnd?.(file);
}

// Build (and cache) a sample-reversed copy of a decoded buffer for backwards playback.
// (AudioBufferSourceNode has no reliable negative playbackRate, so reverse the samples.)
function getReversed(file: string, buf: AudioBuffer): AudioBuffer {
  const cached = reversed.get(file);
  if (cached) return cached;
  const c = getCtx();
  const rev = c.createBuffer(buf.numberOfChannels, buf.length, buf.sampleRate);
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const from = buf.getChannelData(ch);
    const to = rev.getChannelData(ch);
    for (let i = 0, j = buf.length - 1; i < buf.length; i++, j--) to[i] = from[j];
  }
  reversed.set(file, rev);
  return rev;
}

export async function play(file: string, opts?: { reverse?: boolean }): Promise<void> {
  const c = getCtx();
  // resume() must finish before start() or the sound is lost on a suspended/interrupted ctx
  if (c.state !== "running") await c.resume().catch(() => {});
  const forward = await decode(file);
  const buf = opts?.reverse ? getReversed(file, forward) : forward;
  if (triggerMode === "mono") stopAll();
  else stopVoice(file);
  const src = c.createBufferSource();
  src.buffer = buf;
  src.connect(compressor!);
  src.onended = () => {
    if (voices.get(file) === src) {
      voices.delete(file);
      listener.onEnd?.(file);
    }
  };
  voices.set(file, src);
  src.start(0);
  listener.onStart?.(file, buf.duration, !!opts?.reverse);
}

// Stop every sounding voice (SILENCIO).
export function stopAll(): void {
  voices.forEach((v, file) => {
    try {
      v.stop();
    } catch {
      /* already ended */
    }
    listener.onEnd?.(file);
  });
  voices.clear();
}

// Warm/resume the AudioContext on the first user gesture (iOS unlock).
export function unlock(): void {
  const c = getCtx();
  if (c.state !== "running") void c.resume();
}
