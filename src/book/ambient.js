/**
 * Procedural ambient beds: Zen, white noise, alpha waves.
 * Recovered from 51fe478. Generated in the browser with Web Audio.
 * No recorded or copyrighted tracks. Wellness sound, not a medical device.
 */

export const BOOK_AMBIENT_KEY = "mindpal-book-ambient-v1";
export const AMBIENT_DUCK_GAIN = 0.4;
export const AMBIENT_GAIN_CEILING = 0.22;

export const AMBIENT_MODES = [
  { id: "off", label: "Off" },
  { id: "zen", label: "Zen" },
  { id: "white", label: "White noise" },
  { id: "alpha", label: "Alpha waves" },
];

const MODE_IDS = AMBIENT_MODES.map((mode) => mode.id);

let ambientPrefs = { mode: "off", volume: 40 };
let ambientCtx = null;
let ambientMaster = null;
let ambientDuck = null;
let ambientGraphNodes = [];
let ambientTimers = [];
let ambientActiveMode = null;

export function normalizeAmbientPrefs(raw) {
  const mode = MODE_IDS.includes(raw?.mode) ? raw.mode : "off";
  let volume = Number(raw?.volume);
  if (!Number.isFinite(volume)) volume = 40;
  volume = Math.max(0, Math.min(100, Math.round(volume)));
  return { mode, volume };
}

export function loadAmbientPrefs(storage) {
  let raw = null;
  if (storage) {
    try {
      raw = JSON.parse(storage.getItem(BOOK_AMBIENT_KEY) || "null");
    } catch {
      raw = null;
    }
  }
  ambientPrefs = normalizeAmbientPrefs(raw);
  return { ...ambientPrefs };
}

export function saveAmbientPrefs(storage, prefs = ambientPrefs) {
  ambientPrefs = normalizeAmbientPrefs(prefs);
  if (!storage) return { ...ambientPrefs };
  try {
    storage.setItem(BOOK_AMBIENT_KEY, JSON.stringify(ambientPrefs));
  } catch {
    /* private mode / quota */
  }
  return { ...ambientPrefs };
}

export function ambientUserGain() {
  return (ambientPrefs.volume / 100) * AMBIENT_GAIN_CEILING;
}

function audioContextClass() {
  const root = globalThis;
  return root.AudioContext || root.webkitAudioContext || null;
}

function ensureAmbientCtx() {
  const AC = audioContextClass();
  if (!AC) return null;
  if (!ambientCtx) {
    ambientCtx = new AC();
    ambientMaster = ambientCtx.createGain();
    ambientDuck = ambientCtx.createGain();
    ambientDuck.gain.value = 1;
    ambientMaster.connect(ambientDuck);
    ambientDuck.connect(ambientCtx.destination);
  }
  if (ambientCtx.state === "suspended") {
    ambientCtx.resume().catch(() => {});
  }
  return ambientCtx;
}

function clearAmbientGraph() {
  ambientTimers.forEach((timer) => clearTimeout(timer));
  ambientTimers = [];
  ambientGraphNodes.forEach((node) => {
    try {
      if (node.stop) node.stop();
    } catch {
      /* already stopped */
    }
    try {
      node.disconnect();
    } catch {
      /* already disconnected */
    }
  });
  ambientGraphNodes = [];
  ambientActiveMode = null;
}

export function stopAmbientAudio(resetMode) {
  clearAmbientGraph();
  if (ambientMaster && ambientCtx) {
    try {
      ambientMaster.gain.cancelScheduledValues(ambientCtx.currentTime);
    } catch {
      /* ignore */
    }
    try {
      ambientMaster.gain.value = 0;
    } catch {
      /* ignore */
    }
  }
  if (resetMode) {
    ambientPrefs = { ...ambientPrefs, mode: "off" };
  }
}

export function applyAmbientMasterGain(instant) {
  if (!ambientMaster || !ambientCtx) return;
  const gain = ambientPrefs.mode === "off" ? 0 : ambientUserGain();
  const t = ambientCtx.currentTime;
  try {
    ambientMaster.gain.cancelScheduledValues(t);
    if (instant) ambientMaster.gain.value = gain;
    else {
      ambientMaster.gain.setValueAtTime(ambientMaster.gain.value, t);
      ambientMaster.gain.linearRampToValueAtTime(gain, t + 0.35);
    }
  } catch {
    ambientMaster.gain.value = gain;
  }
}

export function setAmbientDuck(on) {
  if (!ambientDuck || !ambientCtx) return;
  const t = ambientCtx.currentTime;
  const target = on ? AMBIENT_DUCK_GAIN : 1;
  try {
    ambientDuck.gain.cancelScheduledValues(t);
    ambientDuck.gain.setValueAtTime(ambientDuck.gain.value, t);
    ambientDuck.gain.linearRampToValueAtTime(target, t + 0.2);
  } catch {
    ambientDuck.gain.value = target;
  }
}

function makeNoiseBuffer(ctx, seconds) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

function startWhiteNoise(ctx) {
  const src = ctx.createBufferSource();
  src.buffer = makeNoiseBuffer(ctx, 2);
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 980;
  filter.Q.value = 0.7;
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 120;
  const g = ctx.createGain();
  g.gain.value = 0.55;
  src.connect(hp);
  hp.connect(filter);
  filter.connect(g);
  g.connect(ambientMaster);
  src.start();
  ambientGraphNodes.push(src, filter, hp, g);
}

function startAlphaWaves(ctx) {
  const carrierL = ctx.createOscillator();
  const carrierR = ctx.createOscillator();
  carrierL.type = "sine";
  carrierR.type = "sine";
  carrierL.frequency.value = 196;
  carrierR.frequency.value = 206;
  const merger = ctx.createChannelMerger(2);
  const gL = ctx.createGain();
  const gR = ctx.createGain();
  gL.gain.value = 0.18;
  gR.gain.value = 0.18;
  const lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 10;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.12;
  lfo.connect(lfoGain);
  lfoGain.connect(gL.gain);
  lfoGain.connect(gR.gain);
  carrierL.connect(gL);
  carrierR.connect(gR);
  gL.connect(merger, 0, 0);
  gR.connect(merger, 0, 1);
  const out = ctx.createGain();
  out.gain.value = 0.7;
  merger.connect(out);
  out.connect(ambientMaster);
  carrierL.start();
  carrierR.start();
  lfo.start();
  ambientGraphNodes.push(carrierL, carrierR, lfo, gL, gR, lfoGain, merger, out);
}

function startZen(ctx) {
  const drones = [
    { f: 110, g: 0.09 },
    { f: 164.81, g: 0.06 },
    { f: 220, g: 0.05 },
  ];
  drones.forEach((drone, i) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = drone.f;
    const g = ctx.createGain();
    g.gain.value = drone.g;
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.05 + i * 0.015;
    const lg = ctx.createGain();
    lg.gain.value = drone.g * 0.35;
    lfo.connect(lg);
    lg.connect(g.gain);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 600;
    osc.connect(filter);
    filter.connect(g);
    g.connect(ambientMaster);
    osc.start();
    lfo.start();
    ambientGraphNodes.push(osc, lfo, g, lg, filter);
  });

  function scheduleSparse() {
    if (ambientActiveMode !== "zen" || !ambientCtx) return;
    const freqs = [261.63, 329.63, 392, 523.25];
    const osc = ambientCtx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freqs[Math.floor(Math.random() * freqs.length)];
    const g = ambientCtx.createGain();
    const t0 = ambientCtx.currentTime;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.035, t0 + 1.2);
    g.gain.linearRampToValueAtTime(0, t0 + 4.5);
    osc.connect(g);
    g.connect(ambientMaster);
    osc.start(t0);
    osc.stop(t0 + 5);
    ambientGraphNodes.push(osc, g);
    const delay = 6000 + Math.random() * 9000;
    ambientTimers.push(setTimeout(scheduleSparse, delay));
  }
  ambientTimers.push(setTimeout(scheduleSparse, 2500 + Math.random() * 2000));
}

export function startAmbientMode(mode) {
  const ctx = ensureAmbientCtx();
  if (!ctx) return false;
  clearAmbientGraph();
  if (!mode || mode === "off") {
    applyAmbientMasterGain(true);
    ambientActiveMode = null;
    return false;
  }
  ambientActiveMode = mode;
  if (mode === "white") startWhiteNoise(ctx);
  else if (mode === "alpha") startAlphaWaves(ctx);
  else if (mode === "zen") startZen(ctx);
  applyAmbientMasterGain(false);
  return true;
}

export function setAmbientMode(mode, storage) {
  const next = normalizeAmbientPrefs({ mode, volume: ambientPrefs.volume });
  ambientPrefs = next;
  saveAmbientPrefs(storage, ambientPrefs);
  if (ambientPrefs.mode === "off") stopAmbientAudio(false);
  else startAmbientMode(ambientPrefs.mode);
  return { ...ambientPrefs };
}

export function setAmbientVolume(volume, storage) {
  ambientPrefs = normalizeAmbientPrefs({ mode: ambientPrefs.mode, volume });
  saveAmbientPrefs(storage, ambientPrefs);
  if (ambientPrefs.mode !== "off") {
    if (!ambientActiveMode) startAmbientMode(ambientPrefs.mode);
    else applyAmbientMasterGain(false);
  }
  return { ...ambientPrefs };
}

export function resumeAmbientIfNeeded() {
  if (ambientPrefs.mode && ambientPrefs.mode !== "off") return startAmbientMode(ambientPrefs.mode);
  return false;
}
