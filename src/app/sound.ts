// Pipodojo's sound: every effect and the music loop are made in code with the browser's Web Audio
// API, so there are no audio files to download or license. Nothing plays until the player first
// taps or presses a key (browsers require that); after that, music loops softly under the game.
// Music and sound effects can each be turned off, and the choice is remembered on this device.

export type Sfx =
  | "tap"
  | "pick"
  | "unpick"
  | "think"
  | "stars"
  | "miss"
  | "send"
  | "pay"
  | "add"
  | "publish"
  | "lesson"
  | "path"
  | "peel"
  | "reveal"
  | "painted"
  | "fly"
  | "whoosh"
  | "toggle";

export interface SoundSettings {
  music: boolean;
  sfx: boolean;
}

const KEY = "pipodojo.sound";
export const DEFAULT_SOUND: SoundSettings = { music: true, sfx: true };

/** Reads saved settings; anything missing or broken means "on". */
export function parseSoundSettings(raw: unknown): SoundSettings {
  const o = (raw ?? {}) as Partial<Record<keyof SoundSettings, unknown>>;
  return { music: o.music !== false, sfx: o.sfx !== false };
}

// ---- Settings store (read by React through useSyncExternalStore) ----

let settings: SoundSettings = (() => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? parseSoundSettings(JSON.parse(raw)) : DEFAULT_SOUND;
  } catch {
    return DEFAULT_SOUND;
  }
})();
const listeners = new Set<() => void>();

export const getSoundSettings = () => settings;
export function subscribeSound(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

export function setSoundSettings(next: Partial<SoundSettings>) {
  settings = { ...settings, ...next };
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Not remembered this time.
  }
  listeners.forEach((l) => l());
  applyMusic();
}

// ---- Audio graph ----

/** Overall loudness of each bus. Music sits well under the effects. */
const MUSIC_LEVEL = 0.12;
const SFX_LEVEL = 0.55;

let ctx: BaseAudioContext | null = null;
let musicBus: GainNode | null = null;
let sfxBus: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let unlocked = false;

/** Master volume, a gentle limiter (so stacked sounds never clip), the two buses and some noise. */
function buildGraph(c: BaseAudioContext) {
  const master = c.createGain();
  master.gain.value = 2.2;
  const limiter = c.createDynamicsCompressor();
  limiter.threshold.value = -10;
  limiter.ratio.value = 8;
  master.connect(limiter).connect(c.destination);
  const music = c.createGain();
  music.gain.value = 0;
  music.connect(master);
  const sfx = c.createGain();
  sfx.gain.value = SFX_LEVEL;
  sfx.connect(master);
  const buffer = c.createBuffer(1, c.sampleRate, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return { music, sfx, buffer };
}

function audio(): AudioContext | null {
  if (ctx) return ctx as AudioContext;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    const live = new AC();
    ctx = live;
    ({ music: musicBus, sfx: sfxBus, buffer: noiseBuffer } = buildGraph(live));
    return live;
  } catch {
    return null;
  }
}

/**
 * Call once at start-up: the first tap or key press anywhere wakes the audio up (browsers keep
 * it asleep until then) and starts the music if it's on.
 */
let installed = false;

export function installAudioUnlock() {
  if (installed) return;
  installed = true;
  const unlock = () => {
    const c = audio();
    if (!c) return;
    void c.resume().then(() => {
      unlocked = true;
      applyMusic();
    });
    if (c.state === "running") {
      unlocked = true;
      applyMusic();
    }
    for (const type of EVENTS) window.removeEventListener(type, unlock, true);
  };
  const EVENTS = ["pointerdown", "touchend", "keydown", "click"] as const;
  for (const type of EVENTS) window.addEventListener(type, unlock, true);
  // Save battery: no music while the tab is hidden.
  document.addEventListener("visibilitychange", applyMusic);
}

const freq = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

interface VoiceOpts {
  type?: OscillatorType;
  vol?: number;
  attack?: number;
  /** Slide to this frequency over the note. */
  glide?: number;
  bus?: GainNode | null;
}

/** One enveloped note: quick attack, smooth exponential fade over `dur` seconds. */
function voice(t: number, hz: number, dur: number, { type = "triangle", vol = 0.2, attack = 0.005, glide, bus = sfxBus }: VoiceOpts = {}) {
  if (!ctx || !bus) return;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(hz, t);
  if (glide) osc.frequency.exponentialRampToValueAtTime(glide, t + dur);
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(vol, t + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(env).connect(bus);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/** A bell: a sine with a soft inharmonic partial, like a little glockenspiel. */
function bell(t: number, hz: number, dur: number, vol = 0.18, bus = sfxBus) {
  voice(t, hz, dur, { type: "sine", vol, bus });
  voice(t, hz * 2.76, dur * 0.5, { type: "sine", vol: vol * 0.25, bus });
}

/** Filtered noise: whooshes, paper and soft hi-hats. `from`/`to` sweep the filter. */
function noise(t: number, dur: number, { vol = 0.12, from = 800, to = 3000, q = 1.2, type = "bandpass" as BiquadFilterType, bus = sfxBus } = {}) {
  if (!ctx || !bus || !noiseBuffer) return;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.Q.value = q;
  filter.frequency.setValueAtTime(from, t);
  filter.frequency.exponentialRampToValueAtTime(to, t + dur);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.05, dur / 3));
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter).connect(env).connect(bus);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.02);
}

/** Briefly lowers the music under a big moment (a fanfare), then brings it back. */
function duck(seconds: number) {
  if (!ctx || !musicBus || !settings.music) return;
  const t = ctx.currentTime;
  musicBus.gain.cancelScheduledValues(t);
  musicBus.gain.setTargetAtTime(MUSIC_LEVEL * 0.2, t, 0.05);
  musicBus.gain.setTargetAtTime(MUSIC_LEVEL, t + seconds, 0.4);
}

// C major, in MIDI notes
const C5 = 72, D5 = 74, E5 = 76, G5 = 79, A5 = 81, C6 = 84, E6 = 88, G6 = 91;

/** Plays a sound effect if sound effects are on and audio has woken up. `n` is the star count. */
export function play(sound: Sfx, n = 0) {
  if (!settings.sfx || !unlocked) return;
  const c = audio();
  if (!c || c.state !== "running") return;
  sfxAt(sound, n, c.currentTime + 0.005);
}

function sfxAt(sound: Sfx, n: number, t: number) {
  switch (sound) {
    case "tap":
      voice(t, 1320, 0.05, { type: "sine", vol: 0.12 });
      break;
    case "toggle":
      voice(t, 990, 0.04, { type: "square", vol: 0.04 });
      break;
    case "pick":
      voice(t, freq(E5), 0.07, { type: "triangle", vol: 0.2 });
      voice(t + 0.05, freq(A5), 0.09, { type: "triangle", vol: 0.2 });
      break;
    case "unpick":
      voice(t, freq(A5), 0.06, { type: "triangle", vol: 0.14 });
      voice(t + 0.045, freq(E5), 0.08, { type: "triangle", vol: 0.12 });
      break;
    case "think":
      // A soft rising shimmer while Pipo works
      [C6, E6, G6, E6, G6].forEach((m, i) => voice(t + i * 0.09, freq(m), 0.35, { type: "sine", vol: 0.08, attack: 0.03 }));
      break;
    case "stars": {
      // One chime per star, rising; three stars end on a little chord
      const notes = [C5, E5, G5];
      for (let i = 0; i < Math.max(1, n); i++) bell(t + i * 0.16, freq(notes[i]! + 12), 0.5, 0.2);
      if (n === 3) [C6, E6, G6].forEach((m) => voice(t + 0.5, freq(m), 0.7, { type: "triangle", vol: 0.08 }));
      break;
    }
    case "miss":
      // A friendly "hmm", never a buzzer
      voice(t, freq(G5 - 12), 0.18, { type: "sine", vol: 0.16, glide: freq(E5 - 12) });
      voice(t + 0.2, freq(E5 - 12), 0.28, { type: "sine", vol: 0.14, glide: freq(D5 - 12) });
      break;
    case "send":
      noise(t, 0.28, { vol: 0.4, from: 500, to: 4000 });
      voice(t + 0.22, freq(A5), 0.12, { type: "sine", vol: 0.14 });
      break;
    case "pay":
      // Cash-register "ding-ding"
      bell(t, freq(E6), 0.4, 0.2);
      bell(t + 0.12, freq(G6), 0.55, 0.2);
      noise(t, 0.08, { vol: 0.06, from: 3000, to: 6000, type: "highpass" });
      break;
    case "add":
      voice(t, 520, 0.09, { type: "sine", vol: 0.2, glide: 820 });
      voice(t + 0.08, freq(C6), 0.15, { type: "triangle", vol: 0.1 });
      break;
    case "publish":
      [C5, E5, G5, C6].forEach((m, i) => voice(t + i * 0.07, freq(m), 0.2, { type: "triangle", vol: 0.14 }));
      break;
    case "lesson":
      duck(1.2);
      [C5, E5, G5].forEach((m, i) => voice(t + i * 0.11, freq(m), 0.22, { type: "square", vol: 0.06 }));
      [C6, E6, G6].forEach((m) => bell(t + 0.36, freq(m), 0.9, 0.09));
      break;
    case "path":
      // The victory sting at the end of a path
      duck(2.4);
      [[G5 - 12, 0], [C5, 0.13], [E5, 0.26], [G5, 0.39]].forEach(([m, d]) => voice(t + d!, freq(m!), 0.2, { type: "square", vol: 0.07 }));
      [E5, G5, C6].forEach((m) => voice(t + 0.6, freq(m), 1.4, { type: "triangle", vol: 0.1, attack: 0.02 }));
      [C6, E6, G6, C6 + 12].forEach((m, i) => bell(t + 0.6 + i * 0.08, freq(m), 1.2, 0.08));
      voice(t + 0.6, freq(36), 1.2, { type: "sine", vol: 0.18 });
      break;
    case "peel":
      // Paper tearing: a few crackly noise bursts
      for (let i = 0; i < 5; i++) noise(t + i * 0.045, 0.06, { vol: 0.3, from: 2500, to: 5000, type: "highpass" });
      break;
    case "reveal":
    case "painted":
      // Sparkles
      for (let i = 0; i < (sound === "painted" ? 9 : 6); i++) {
        voice(t + i * 0.06, 1800 + Math.random() * 1600, 0.25, { type: "sine", vol: 0.09 });
      }
      if (sound === "reveal") bell(t, freq(C6), 0.6, 0.12);
      break;
    case "fly":
      noise(t, 0.6, { vol: 0.45, from: 300, to: 1800, q: 0.8 });
      break;
    case "whoosh":
      noise(t, 0.3, { vol: 0.22, from: 600, to: 2200, q: 0.7 });
      break;
  }
}

// ---- Music: a calm, cheerful loop, made note by note ----

const BPM = 100;
const EIGHTH = 60 / BPM / 2;
const BARS = 16;

/** Eight bars of chords (bass note, then the chord's tones), played twice: calm, then with the tune. */
const CHORDS: [number, number[]][] = [
  [48, [60, 64, 67]], // C
  [45, [57, 60, 64]], // Am
  [41, [53, 57, 60]], // F
  [43, [55, 59, 62]], // G
  [48, [60, 64, 67]], // C
  [45, [57, 60, 64]], // Am
  [38, [53, 57, 62]], // Dm
  [43, [55, 59, 62]], // G
];
/** The tune, one row per bar of eighth notes (0 = rest). */
const MELODY: number[][] = [
  [76, 0, 79, 0, 76, 74, 72, 0],
  [72, 0, 76, 0, 74, 72, 69, 0],
  [69, 0, 72, 0, 74, 0, 72, 69],
  [71, 0, 74, 0, 79, 0, 0, 0],
  [79, 0, 76, 0, 79, 81, 79, 0],
  [76, 0, 72, 0, 76, 0, 74, 0],
  [74, 76, 77, 0, 77, 0, 76, 74],
  [74, 0, 0, 0, 71, 0, 0, 0],
];
const ARP = [0, 1, 2, 1, 0, 1, 2, 1];

let musicTimer: number | null = null;
let nextNoteTime = 0;
let step = 0;

function musicStep(s: number, t: number) {
  const bar = Math.floor(s / 8);
  const beat = s % 8;
  const [bass, chord] = CHORDS[bar % CHORDS.length]!;
  const bus = musicBus;
  if (beat === 0 || beat === 4) {
    voice(t, freq(bass), EIGHTH * 3.5, { type: "triangle", vol: 0.5, bus });
    voice(t, 120, 0.12, { type: "sine", vol: 0.25, glide: 50, bus });
  }
  if (beat === 0) chord.forEach((m) => voice(t, freq(m), EIGHTH * 7.8, { type: "sine", vol: 0.07, attack: 0.25, bus }));
  voice(t, freq(chord[ARP[beat]!]! + 12), EIGHTH * 1.4, { type: "triangle", vol: 0.12, bus });
  if (beat % 2 === 1) noise(t, 0.05, { vol: 0.05, from: 7000, to: 9000, type: "highpass", bus });
  // The tune plays on the second time through
  const note = bar >= 8 ? MELODY[bar - 8]![beat]! : 0;
  if (note) voice(t, freq(note), EIGHTH * 1.8, { type: "triangle", vol: 0.22, bus });
}

function scheduleMusic() {
  if (!ctx) return;
  while (nextNoteTime < ctx.currentTime + 0.25) {
    musicStep(step, nextNoteTime);
    nextNoteTime += EIGHTH;
    step = (step + 1) % (BARS * 8);
  }
}

/**
 * Renders the whole music loop, then every sound effect in turn, offline into one buffer: for
 * previewing the sound and checking its levels without playing anything aloud.
 */
export async function renderPreview(): Promise<AudioBuffer> {
  const SFX_ORDER: [Sfx, number][] = [
    ["tap", 0], ["pick", 0], ["unpick", 0], ["think", 0], ["stars", 1], ["stars", 2], ["stars", 3], ["miss", 0],
    ["send", 0], ["pay", 0], ["add", 0], ["publish", 0], ["fly", 0], ["whoosh", 0], ["peel", 0], ["reveal", 0],
    ["painted", 0], ["lesson", 0], ["path", 0],
  ];
  const musicSeconds = BARS * 8 * EIGHTH;
  const sampleRate = 44100;
  const off = new OfflineAudioContext(1, Math.ceil((musicSeconds + SFX_ORDER.length * 1.1 + 2.5) * sampleRate), sampleRate);
  const saved = { ctx, musicBus, sfxBus, noiseBuffer, settings };
  try {
    ctx = off;
    ({ music: musicBus, sfx: sfxBus, buffer: noiseBuffer } = buildGraph(off));
    settings = { music: false, sfx: true }; // no ducking of a live loop
    musicBus.gain.value = MUSIC_LEVEL;
    for (let s = 0; s < BARS * 8; s++) musicStep(s, s * EIGHTH);
    SFX_ORDER.forEach(([sound, n], i) => sfxAt(sound, n, musicSeconds + 0.5 + i * 1.1));
    return await off.startRendering();
  } finally {
    ({ ctx, musicBus, sfxBus, noiseBuffer, settings } = saved);
  }
}

/** For checking in a browser that the music is really running: its loop and its current volume. */
export function musicState() {
  return { running: musicTimer !== null, volume: musicBus?.gain.value ?? 0, audio: ctx?.state ?? "none" };
}

/** Starts or stops the music to match the setting, the tab's visibility and whether audio is awake. */
function applyMusic() {
  if (!ctx || !musicBus || !unlocked) return;
  const want = settings.music && !document.hidden;
  // Only touch the volume when the music actually starts or stops: this runs again on every
  // wake-up, setting change and tab switch, and cancelling a fade that's under way left it silent.
  if (want === (musicTimer !== null)) return;
  const t = ctx.currentTime;
  musicBus.gain.cancelScheduledValues(t);
  if (want) {
    nextNoteTime = t + 0.1;
    musicBus.gain.setValueAtTime(0.0001, t);
    musicBus.gain.setTargetAtTime(MUSIC_LEVEL, t, 0.6);
    musicTimer = window.setInterval(scheduleMusic, 60);
    scheduleMusic();
  } else if (musicTimer !== null) {
    musicBus.gain.setTargetAtTime(0.0001, t, 0.15);
    window.clearInterval(musicTimer);
    musicTimer = null;
  }
}
