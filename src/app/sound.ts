// Pipodojo's sound: every effect is made in code with the browser's Web Audio API (no files to
// download or license), and the music is one looping track from public/music/theme.mp3. Nothing
// plays until the player first taps or presses a key (browsers require that); after that, the
// music loops softly under the game. Music and sound effects can each be turned off, and the
// choice is remembered on this device.

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
  | "hover"
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

/** Hovering moves between things quickly: at most one hover chime per HOVER_GAP_MS. */
const HOVER_GAP_MS = 70;
let lastHover = 0;

/** Devices without real hover (phones, tablets) never get hover chimes, even from taps. */
const NO_HOVER = typeof window !== "undefined" && window.matchMedia?.("(hover: none)").matches;
let hoverInstalled = false;

/** A hover chime for the mouse (touch has no hover). `n` varies the note, e.g. per place in town. */
export function hover(n = 0) {
  if (NO_HOVER) return;
  const now = performance.now();
  if (now - lastHover < HOVER_GAP_MS) return;
  lastHover = now;
  play("hover", n);
}

/**
 * Hover chimes for every button and link, from one listener: a mouse moving onto a different
 * clickable thing chimes once. Called once at start-up.
 */
export function installHoverSounds() {
  if (hoverInstalled) return;
  hoverInstalled = true;
  let current: Element | null = null;
  document.addEventListener("pointerover", (e) => {
    if (e.pointerType !== "mouse") return;
    const target = (e.target as Element | null)?.closest?.('button:not(:disabled), a[href], [role="button"], [role="switch"], summary') ?? null;
    if (target === current) return;
    current = target;
    if (target) hover(Array.from(target.parentElement?.children ?? []).indexOf(target));
  });
}

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
    case "whoosh": {
      // Screen change: an airy swoosh with a soft two-note chime, rising going forward (n >= 0), falling going back.
      noise(t, 0.42, { vol: 0.3, from: n < 0 ? 2400 : 500, to: n < 0 ? 500 : 2400, q: 0.6 });
      const [a, b] = n < 0 ? [G5, D5] : [D5, G5];
      voice(t + 0.12, freq(a), 0.3, { type: "sine", vol: 0.07, attack: 0.02 });
      voice(t + 0.22, freq(b), 0.45, { type: "sine", vol: 0.07, attack: 0.02 });
      break;
    }
    case "hover": {
      // A soft, short chime from a pentatonic set (n picks the note), so hovering never jars.
      const notes = [C6, D5 + 12, E6, G5 + 12, A5 + 12];
      const note = notes[Math.abs(n) % notes.length]!;
      voice(t, freq(note), 0.12, { type: "sine", vol: 0.045, attack: 0.004 });
      voice(t, freq(note) * 2, 0.06, { type: "sine", vol: 0.012 });
      break;
    }
  }
}

// ---- Music: a looping track from a file ----

/** Drop the track at public/music/theme.mp3. If it's missing, the game simply has no music. */
export const MUSIC_URL = `${import.meta.env.BASE_URL}music/theme.mp3`;

let musicTrack: Promise<AudioBuffer | null> | null = null;
let musicSource: AudioBufferSourceNode | null = null;
let musicStarting = false;

/** Downloads and decodes the track once, only when music is first wanted. */
function loadTrack(c: BaseAudioContext): Promise<AudioBuffer | null> {
  musicTrack ??= fetch(MUSIC_URL)
    .then((res) => (res.ok ? res.arrayBuffer() : null))
    .then((data) => (data ? c.decodeAudioData(data) : null))
    .catch(() => null);
  return musicTrack;
}

/** Where the sound really ends: songs often close with seconds of silence, which would leave a gap each loop. */
export function loopEndOf(track: AudioBuffer): number {
  const data = track.getChannelData(0);
  let last = data.length - 1;
  while (last > 0 && Math.abs(data[last]!) < 0.002) last--;
  return Math.min(track.duration, last / track.sampleRate + 0.05);
}

/**
 * Renders every sound effect in turn, offline, into one buffer: for previewing the effects and
 * checking their levels without playing anything aloud.
 */
export async function renderPreview(): Promise<AudioBuffer> {
  const SFX_ORDER: [Sfx, number][] = [
    ["tap", 0], ["pick", 0], ["unpick", 0], ["think", 0], ["stars", 1], ["stars", 2], ["stars", 3], ["miss", 0],
    ["send", 0], ["pay", 0], ["add", 0], ["publish", 0], ["fly", 0], ["whoosh", 0], ["peel", 0], ["reveal", 0],
    ["painted", 0], ["lesson", 0], ["path", 0],
  ];
  const sampleRate = 44100;
  const off = new OfflineAudioContext(1, Math.ceil((SFX_ORDER.length * 1.1 + 2.5) * sampleRate), sampleRate);
  const saved = { ctx, musicBus, sfxBus, noiseBuffer, settings };
  try {
    ctx = off;
    ({ music: musicBus, sfx: sfxBus, buffer: noiseBuffer } = buildGraph(off));
    settings = { music: false, sfx: true }; // nothing to duck
    SFX_ORDER.forEach(([sound, n], i) => sfxAt(sound, n, 0.5 + i * 1.1));
    return await off.startRendering();
  } finally {
    ({ ctx, musicBus, sfxBus, noiseBuffer, settings } = saved);
  }
}

/** For checking in a browser that the music is really running: whether it plays and its volume. */
export function musicState() {
  return { running: musicSource !== null, volume: musicBus?.gain.value ?? 0, audio: ctx?.state ?? "none" };
}

/** Starts or stops the music to match the setting, the tab's visibility and whether audio is awake. */
function applyMusic() {
  if (!ctx || !musicBus || !unlocked) return;
  const want = settings.music && !document.hidden;
  // Only touch the volume when the music actually starts or stops: this runs again on every
  // wake-up, setting change and tab switch, and cancelling a fade that's under way left it silent.
  if (want === (musicSource !== null || musicStarting)) return;
  const c = ctx;
  const bus = musicBus;
  if (want) {
    musicStarting = true;
    void loadTrack(c).then((track) => {
      musicStarting = false;
      // No track, or the player changed their mind while it loaded.
      if (!track || musicSource || !settings.music || document.hidden) return;
      const t = c.currentTime;
      const source = c.createBufferSource();
      source.buffer = track;
      source.loop = true;
      source.loopStart = 0;
      source.loopEnd = loopEndOf(track);
      source.connect(bus);
      bus.gain.cancelScheduledValues(t);
      bus.gain.setValueAtTime(0.0001, t);
      bus.gain.setTargetAtTime(MUSIC_LEVEL, t, 0.6);
      source.start(t);
      musicSource = source;
    });
  } else if (musicSource) {
    const t = c.currentTime;
    const source = musicSource;
    musicSource = null;
    bus.gain.cancelScheduledValues(t);
    bus.gain.setTargetAtTime(0.0001, t, 0.15);
    source.stop(t + 0.6);
  }
}
