/* Zomb.io 3D — JaydenGames. Blocky base-building zombie survival.
   Built on three.js (three.min.js next to this file). Exposes window.ZombIO = { mount, stats, version }. */
(function () {
'use strict';
const VERSION = '1.0.0';
const SCRIPT_URL = document.currentScript && document.currentScript.src;
const SET_KEY = 'zomb3d.settings.v1', STATS_KEY = 'zomb3d.stats.v1';
const CELL = 2, MAP_R = 40, BUILD_R = 15, DAY_LEN = 60, NIGHT_LEN = 45;

/* ---------- small helpers ---------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const dist2 = (ax, az, bx, bz) => { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => Math.floor(n).toLocaleString();
function loadJSON(k, def) { try { const v = JSON.parse(localStorage.getItem(k)); return v && typeof v === 'object' ? Object.assign(structuredCloneSafe(def), v) : structuredCloneSafe(def); } catch (e) { return structuredCloneSafe(def); } }
function saveJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function structuredCloneSafe(o) { return JSON.parse(JSON.stringify(o)); }

const DEFAULT_SETTINGS = { sens: 1, quality: 'Medium', mute: false, volume: 0.7, cam: 'third', invertY: false, rumble: true, touch: 'auto' };
const DEFAULT_STATS = { bestWave: 0, totalKills: 0, tokensEarned: 0, games: 0, bestScore: 0, goldenTrophy: false, bossesBeaten: 0 };
function loadStats() { return loadJSON(STATS_KEY, DEFAULT_STATS); }

/* ---------- Arcade Pass bridge (shared JaydenGames tokens) ---------- */
function awardTokens(n, reason) {
  try { if (window.JGArcade && JGArcade.pass) { const r = JGArcade.pass.award(n, reason); return r ? r.got : 0; } } catch (e) {}
  try { // standalone fallback: write the shared wallet directly
    const k = 'jaydengames.arcadePass.v1', p = JSON.parse(localStorage.getItem(k) || '{}');
    p.tokens = (p.tokens || 0) + n; p.totalEarned = (p.totalEarned || 0) + n; localStorage.setItem(k, JSON.stringify(p));
    window.dispatchEvent(new CustomEvent('jg-tokens')); return n;
  } catch (e) { return 0; }
}
function tokenBalance() { try { if (window.JGArcade) return JGArcade.pass.tokens(); return (JSON.parse(localStorage.getItem('jaydengames.arcadePass.v1') || '{}').tokens) || 0; } catch (e) { return 0; } }

/* ---------- Web Audio sound effects (synthesized, no files) ---------- */
class Sound {
  constructor(set) { this.set = set; this.ctx = null; this.last = {}; }
  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); return this.ctx; }
    try { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination); this.noiseBuf = this.makeNoise(); } catch (e) { this.ctx = null; }
    return this.ctx;
  }
  makeNoise() { const c = this.ctx, b = c.createBuffer(1, c.sampleRate * 0.6, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; }
  tone(f, dur, type = 'square', vol = 0.2, slide = 0, delay = 0) {
    const c = this.ctx; if (!c) return; const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  }
  noise(dur, vol = 0.2, freq = 1200, q = 1, delay = 0, type = 'bandpass') {
    const c = this.ctx; if (!c) return; const t = c.currentTime + delay, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf; f.type = type; f.frequency.value = freq; f.Q.value = q; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t); s.stop(t + dur + 0.02);
  }
  play(name) {
    if (this.set.mute || !this.ensure()) return;
    const now = performance.now(); if (this.last[name] && now - this.last[name] < 45) return; this.last[name] = now;
    this.master.gain.value = this.set.volume;
    switch (name) {
      case 'chop': this.noise(0.12, 0.35, 700, 2); this.tone(180, 0.08, 'triangle', 0.18, -60); break;
      case 'stone': this.noise(0.08, 0.3, 2600, 4); this.tone(900, 0.05, 'square', 0.06, -300); break;
      case 'gold': this.tone(1320, 0.08, 'square', 0.1); this.tone(1760, 0.12, 'square', 0.1, 0, 0.06); break;
      case 'swing': this.noise(0.1, 0.12, 3000, 0.7, 0, 'highpass'); break;
      case 'hit': this.noise(0.09, 0.3, 500, 1.5); this.tone(140, 0.09, 'sawtooth', 0.15, -70); break;
      case 'place': this.tone(320, 0.07, 'square', 0.15); this.tone(480, 0.09, 'square', 0.12, 0, 0.05); break;
      case 'deny': this.tone(160, 0.16, 'square', 0.14, -40); break;
      case 'upgrade': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.12, 'square', 0.1, 0, i * 0.06)); break;
      case 'repair': this.tone(700, 0.05, 'triangle', 0.12); this.noise(0.05, 0.12, 4000, 3, 0.03); break;
      case 'arrow': this.noise(0.07, 0.12, 5000, 1, 0, 'highpass'); this.tone(900, 0.05, 'triangle', 0.05, 400); break;
      case 'cannon': this.noise(0.4, 0.45, 160, 0.8, 0, 'lowpass'); this.tone(90, 0.3, 'sine', 0.35, -50); break;
      case 'boom': this.noise(0.5, 0.5, 220, 0.6, 0, 'lowpass'); break;
      case 'blaster': this.tone(1400, 0.12, 'sawtooth', 0.08, -1100); break;
      case 'xbow': this.noise(0.06, 0.15, 3500, 2); this.tone(400, 0.06, 'triangle', 0.1, 300); break;
      case 'groan': this.tone(rand(85, 120), 0.5, 'sawtooth', 0.05, -30); break;
      case 'zdie': this.tone(220, 0.25, 'square', 0.08, -160); this.noise(0.15, 0.15, 900, 1); break;
      case 'hurt': this.tone(240, 0.18, 'square', 0.18, -120); break;
      case 'stashhit': this.tone(110, 0.2, 'square', 0.12, -30); this.noise(0.1, 0.2, 1500, 2); break;
      case 'coin': this.tone(988, 0.06, 'square', 0.1); this.tone(1319, 0.14, 'square', 0.1, 0, 0.05); break;
      case 'buy': [660, 880, 1320].forEach((f, i) => this.tone(f, 0.1, 'square', 0.1, 0, i * 0.05)); break;
      case 'night': [392, 311, 262, 196].forEach((f, i) => this.tone(f, 0.35, 'sawtooth', 0.08, 0, i * 0.18)); break;
      case 'day': [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.12, 0, i * 0.09)); break;
      case 'boss': [110, 104, 98, 92].forEach((f, i) => this.tone(f, 0.5, 'sawtooth', 0.16, 0, i * 0.3)); this.noise(1.2, 0.2, 120, 0.5, 0, 'lowpass'); break;
      case 'token': [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.12, 'square', 0.09, 0, i * 0.07)); break;
      case 'jump': this.tone(300, 0.12, 'square', 0.08, 300); break;
      case 'click': this.tone(600, 0.04, 'square', 0.07); break;
      case 'over': [392, 349, 311, 262, 196].forEach((f, i) => this.tone(f, 0.4, 'triangle', 0.14, 0, i * 0.22)); break;
      case 'zap': this.tone(500, 0.3, 'sawtooth', 0.1, 900); break;
    }
  }
}

/* ---------- Gamepad (Xbox / PlayStation / Switch auto icons, 0.15 radial deadzone) ---------- */
const PAD = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, BACK: 8, START: 9, L3: 10, R3: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
const PAD_LABELS = {
  xbox: ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'View', 'Menu', 'LS', 'RS', '↑', '↓', '←', '→'],
  ps: ['✕', '○', '□', '△', 'L1', 'R1', 'L2', 'R2', 'Share', 'Options', 'L3', 'R3', '↑', '↓', '←', '→'],
  switch: ['B', 'A', 'Y', 'X', 'L', 'R', 'ZL', 'ZR', '−', '+', 'LS', 'RS', '↑', '↓', '←', '→']
};
function padBrand(id) {
  id = String(id || '').toLowerCase();
  if (/xbox|045e|xinput/.test(id)) return 'xbox';
  if (/054c|playstation|dualsense|dualshock|wireless controller/.test(id)) return 'ps';
  if (/057e|nintendo|pro controller|joy-con/.test(id)) return 'switch';
  return 'xbox';
}
class Pad {
  constructor(hooks) { this.hooks = hooks; this.cur = []; this.prev = []; this.lx = this.ly = this.rx = this.ry = 0; this.lt = this.rt = 0; this.pad = null; this.brand = 'xbox'; }
  poll() {
    let pads = []; try { pads = navigator.getGamepads ? [...navigator.getGamepads()] : []; } catch (e) { pads = []; }
    const pad = pads.find(p => p && p.connected && p.buttons && p.buttons.length >= 4) || null;
    if (pad && !this.pad) { this.brand = padBrand(pad.id); this.hooks.connect?.(this.brand); }
    if (!pad && this.pad) this.hooks.disconnect?.();
    this.pad = pad; this.prev = this.cur;
    if (!pad) { this.cur = []; this.lx = this.ly = this.rx = this.ry = this.lt = this.rt = 0; return false; }
    this.cur = pad.buttons.map(b => !!(b.pressed || b.value > 0.4));
    this.lt = pad.buttons[6] ? pad.buttons[6].value : 0; this.rt = pad.buttons[7] ? pad.buttons[7].value : 0;
    const dz = 0.15, st = (x, y) => { const m = Math.hypot(x, y); if (m < dz) return [0, 0]; const s = Math.min(1, (m - dz) / (1 - dz)) / m; return [x * s, y * s]; };
    [this.lx, this.ly] = st(pad.axes[0] || 0, pad.axes[1] || 0); [this.rx, this.ry] = st(pad.axes[2] || 0, pad.axes[3] || 0);
    if (this.cur.some((b, i) => b && !this.prev[i]) || Math.hypot(this.lx, this.ly) > 0.25 || Math.hypot(this.rx, this.ry) > 0.25) this.hooks.activity?.();
    return true;
  }
  down(i) { return !!this.cur[i]; }
  pressed(i) { return !!this.cur[i] && !this.prev[i]; }
  label(i) { return (PAD_LABELS[this.brand] || PAD_LABELS.xbox)[i]; }
  rumble(strong = 0.5, ms = 120) {
    try {
      const p = this.pad; if (!p) return; const va = p.vibrationActuator;
      if (va && typeof va.playEffect === 'function') { const r = va.playEffect('dual-rumble', { startDelay: 0, duration: ms, strongMagnitude: Math.min(1, strong), weakMagnitude: Math.min(1, strong + 0.2) }); if (r && r.catch) r.catch(() => {}); return; }
      const h = p.hapticActuators && p.hapticActuators[0]; if (h && typeof h.pulse === 'function') { const r = h.pulse(strong, ms); if (r && r.catch) r.catch(() => {}); }
    } catch (e) {}
  }
}
/* ---------- Game data ---------- */
const TIERS = [
  null,
  { name: 'Wood', color: 0xb5793f, dark: 0x7a4a22, emissive: 0x000000 },
  { name: 'Stone', color: 0x9aa3ad, dark: 0x5f6873, emissive: 0x000000 },
  { name: 'Reinforced Steel', color: 0x6f8fb3, dark: 0x34465e, emissive: 0x0a1626 },
  { name: 'Neon Gold', color: 0xffcf3a, dark: 0xc98a00, emissive: 0x5a3b00 }
];
/* cost: base placement cost. hp per tier. Upgrades scale with tier and need gold from tier 3. */
const BUILD = {
  stash: { name: 'Gold Stash', icon: '💰', cost: {}, hp: [0, 1500, 2600, 4200, 6500], max: 1, desc: 'Your base core. Protect it at all costs.' },
  wall: { name: 'Wall', icon: '🧱', cost: { wood: 10 }, hp: [0, 250, 550, 1000, 1700], max: 90, desc: 'Blocks zombies from your Gold Stash.' },
  spike: { name: 'Spike Trap', icon: '📌', cost: { wood: 15, stone: 10 }, hp: [0, 200, 400, 700, 1100], max: 16, desc: 'Damages zombies that walk over it.', dmg: [0, 14, 24, 38, 60] },
  arrow: { name: 'Arrow Tower', icon: '🏹', cost: { wood: 20, stone: 20 }, hp: [0, 300, 600, 1000, 1600], max: 8, desc: 'Rapidly shoots arrows at nearby zombies.', dmg: [0, 14, 22, 34, 52], range: [0, 13, 14, 15, 17], rate: [0, 0.8, 0.65, 0.5, 0.38] },
  cannon: { name: 'Cannon Tower', icon: '💣', cost: { wood: 35, stone: 35 }, hp: [0, 400, 800, 1300, 2000], max: 6, desc: 'Fires explosive splash shells at crowds.', dmg: [0, 40, 65, 100, 150], range: [0, 11, 12, 13, 15], rate: [0, 2.4, 2.1, 1.8, 1.5], splash: 2.8 },
  mine: { name: 'Gold Mine', icon: '⛏️', cost: { wood: 30, stone: 30 }, hp: [0, 250, 500, 850, 1300], max: 4, desc: 'Generates passive Gold every few seconds.', gold: [0, 3, 5, 8, 12] }
};
function upgradeCost(type, toTier) {
  const b = BUILD[type];
  if (type === 'stash') return [null, null, { wood: 120, stone: 120 }, { wood: 260, stone: 260, gold: 120 }, { wood: 500, stone: 500, gold: 350 }][toTier];
  const w = (b.cost.wood || 10), s = (b.cost.stone || 0) + 10;
  return { wood: Math.round(w * toTier * 1.2), stone: Math.round(s * toTier * 1.2), gold: toTier >= 3 ? Math.round((w + s) * (toTier - 2) * 0.8) : 0 };
}
const HOTBAR = [
  { id: 'pick', name: 'Pickaxe', icon: '⛏️', kind: 'melee' },
  { id: 'weapon', name: 'Weapon', icon: '🏹', kind: 'ranged' },
  { id: 'wall', name: 'Wall', icon: '🧱', kind: 'build' },
  { id: 'spike', name: 'Spike Trap', icon: '📌', kind: 'build' },
  { id: 'arrow', name: 'Arrow Tower', icon: '🏹', kind: 'build' },
  { id: 'cannon', name: 'Cannon', icon: '💣', kind: 'build' },
  { id: 'mine', name: 'Gold Mine', icon: '🪙', kind: 'build' },
  { id: 'hammer', name: 'Hammer', icon: '🔨', kind: 'hammer' }
];
/* Weapons: melee line on slot 1 (also harvests), ranged line on slot 2. */
const WEAPONS = {
  woodPick: { name: 'Wood Pickaxe', icon: '⛏️', slot: 'pick', price: 0, dmg: 14, rate: 0.55, range: 2.6, harvest: 1, color: 0xa0703c, head: 0x8d6e63 },
  ironAxe: { name: 'Iron Axe', icon: '🪓', slot: 'pick', price: 60, dmg: 26, rate: 0.45, range: 2.8, harvest: 1.5, color: 0x6d4c41, head: 0xb0bec5 },
  diamondSword: { name: 'Diamond Sword', icon: '🗡️', slot: 'pick', price: 220, dmg: 48, rate: 0.38, range: 3.1, harvest: 2, color: 0x4e342e, head: 0x4dfcff },
  crossbow: { name: 'Rapid Crossbow', icon: '🏹', slot: 'weapon', price: 160, dmg: 24, rate: 0.32, speed: 38, color: 0x795548, head: 0xcfd8dc },
  blaster: { name: 'Plasma Blaster Rifle', icon: '🔫', slot: 'weapon', price: 480, dmg: 30, rate: 0.14, speed: 60, color: 0x263238, head: 0xff3dbb }
};
const WEAPON_ORDER = ['woodPick', 'ironAxe', 'diamondSword', 'crossbow', 'blaster'];
const SQUAD = {
  lumber: { name: 'Lumberjack Bot', icon: '🪓', price: 150, desc: 'Chops trees and rocks near your base during the day.', color: 0x2e7d32, accent: 0xffb300 },
  archer: { name: 'Guard Archer', icon: '🏹', price: 250, desc: 'Patrols your Gold Stash and shoots zombies all night.', color: 0x1565c0, accent: 0xffffff },
  mechanic: { name: 'Base Mechanic', icon: '🔧', price: 350, desc: 'Runs around repairing damaged walls and towers.', color: 0xef6c00, accent: 0x35e7ff }
};
const MAX_SQUAD = 3;
/* Zombies with 2026 internet names */
const ZOMBIES = {
  walker: { name: 'Chopped Walker', hp: 60, speed: 2.1, dmg: 12, rate: 1, size: 1, skin: 0x7cb342, shirt: 0x5d4037, pants: 0x37474f, eye: 0x111111, score: 10, gold: 1 },
  sprinter: { name: 'Crashout Sprinter', hp: 42, speed: 4.3, dmg: 8, rate: 0.7, size: 0.9, skin: 0x9ccc65, shirt: 0xc62828, pants: 0x212121, eye: 0xff1744, glowEye: true, score: 14, gold: 1 },
  phantom: { name: 'Aura-Stealing Phantom', hp: 70, speed: 2.8, dmg: 10, rate: 0.9, size: 1, skin: 0x4a148c, shirt: 0x12001f, pants: 0x12001f, eye: 0xe040fb, glowEye: true, ghost: true, score: 18, gold: 2, steal: 6 },
  tank: { name: 'Rage-Bait Tank', hp: 260, speed: 1.4, dmg: 30, rate: 1.4, size: 1.45, skin: 0x558b2f, shirt: 0x455a64, pants: 0x263238, eye: 0xffab00, armor: 0x90a4ae, score: 30, gold: 4, targetsTowers: true },
  rizzler: { name: 'THE RIZZLER KING', boss: true, hp: 2400, speed: 1.7, dmg: 40, rate: 1.2, size: 2.6, skin: 0x8bc34a, shirt: 0x6a1b9a, pants: 0x1a237e, eye: 0x111111, crown: true, shades: true, score: 500, gold: 120 },
  megalodon: { name: 'OHIO MEGALODON BRUTE', boss: true, hp: 5200, speed: 1.5, dmg: 90, rate: 1.5, size: 3.1, skin: 0x546e7a, shirt: 0x37474f, pants: 0x263238, eye: 0xff1744, glowEye: true, spikes: true, score: 900, gold: 220, oneShotT1: true },
  omega: { name: 'OMEGA BRAINROT OVERLORD', boss: true, hp: 9000, speed: 1.3, dmg: 70, rate: 1.3, size: 3.6, skin: 0xff3dbb, shirt: 0x1a0033, pants: 0x0d001a, eye: 0x35e7ff, glowEye: true, aura: true, score: 1600, gold: 400, shoots: true }
};
function bossFor(wave) { return wave % 5 ? null : wave === 5 ? 'rizzler' : wave === 10 ? 'megalodon' : 'omega'; }
const QUALITY = {
  Low: { pr: 0.75, shadows: false, shadowMap: 512, fog: 46, grassDetail: 0.4 },
  Medium: { pr: 1, shadows: true, shadowMap: 1024, fog: 62, grassDetail: 0.8 },
  High: { pr: 2, shadows: true, shadowMap: 2048, fog: 80, grassDetail: 1 }
};
const RES_META = { wood: { icon: '🪵', name: 'Wood', color: '#ffb35c' }, stone: { icon: '🪨', name: 'Stone', color: '#d7e0ea' }, gold: { icon: '🪙', name: 'Gold', color: '#ffd84a' } };
function costText(c) { return ['wood', 'stone', 'gold'].filter(k => c && c[k]).map(k => `${RES_META[k].icon}${c[k]}`).join(' ') || 'Free'; }
/* ---------- Shared geometry / material caches (never mutate cached materials) ---------- */
let G = null;
const GEO = {}, MAT = {};
function geoBox(w, h, d) { const k = `b${w}|${h}|${d}`; return GEO[k] || (GEO[k] = new THREE.BoxGeometry(w, h, d)); }
function geoCyl(rt, rb, h, s = 10) { const k = `c${rt}|${rb}|${h}|${s}`; return GEO[k] || (GEO[k] = new THREE.CylinderGeometry(rt, rb, h, s)); }
function geoCone(r, h, s = 4) { const k = `k${r}|${h}|${s}`; return GEO[k] || (GEO[k] = new THREE.ConeGeometry(r, h, s)); }
function geoSphere(r, s = 8) { const k = `s${r}|${s}`; return GEO[k] || (GEO[k] = new THREE.SphereGeometry(r, s, Math.max(4, s - 2))); }
function lam(c, e = 0, opts) { const k = `l${c}|${e}|${opts ? JSON.stringify(opts) : ''}`; if (MAT[k]) return MAT[k]; const m = new THREE.MeshLambertMaterial(Object.assign({ color: c, emissive: e }, opts || {})); return (MAT[k] = m); }
function basic(c, opts) { const k = `u${c}|${opts ? JSON.stringify(opts) : ''}`; return MAT[k] || (MAT[k] = new THREE.MeshBasicMaterial(Object.assign({ color: c }, opts || {}))); }
function box(w, h, d, mat, x = 0, y = 0, z = 0, parent, cast = true) {
  const m = new THREE.Mesh(geoBox(w, h, d), mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; if (parent) parent.add(m); return m;
}
function mesh(geo, mat, x = 0, y = 0, z = 0, parent, cast = true) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; if (parent) parent.add(m); return m; }
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 2; return t;
}
function rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
const LABEL_TEX = {};
function labelSprite(text, color = '#ffffff', bg = 'rgba(10,12,24,.78)', scale = 1) {
  const k = text + color + bg;
  const tex = LABEL_TEX[k] || (LABEL_TEX[k] = canvasTex(512, 96, (g, w, h) => {
    g.font = '900 46px "Arial Rounded MT Bold", Nunito, system-ui, sans-serif'; const tw = Math.min(w - 16, g.measureText(text).width + 48);
    g.fillStyle = bg; rrect(g, (w - tw) / 2, 12, tw, 72, 30); g.fill(); g.lineWidth = 6; g.strokeStyle = '#0b0d1a'; g.stroke();
    g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 2, w - 40);
  }));
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true })); s.scale.set(3.2 * scale, 0.6 * scale, 1); s.renderOrder = 5; return s;
}
function hpBar(width = 1.4) {
  const g = new THREE.Group();
  const bg = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x111322, depthWrite: false })); bg.scale.set(width + 0.1, 0.2, 1); bg.renderOrder = 6;
  const fill = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x4cff6a, depthWrite: false })); fill.center.set(0, 0.5); fill.position.x = -width / 2; fill.scale.set(width, 0.13, 1); fill.renderOrder = 7;
  g.add(bg, fill); g.userData = { fill, width }; return g;
}
function setHp(bar, f) {
  const u = bar.userData; f = clamp(f, 0, 1); u.fill.scale.x = Math.max(0.001, u.width * f);
  u.fill.material.color.setHex(f > 0.6 ? 0x4cff6a : f > 0.3 ? 0xffd23f : 0xff4d4d);
}

/* ---------- Blocky characters (player, bots, zombies, bosses) ---------- */
function makeChar(o) {
  const s = o.size || 1, root = new THREE.Group(), body = new THREE.Group(); root.add(body); body.scale.setScalar(s);
  const skin = lam(o.skin, o.glow || 0, o.ghost ? { transparent: true, opacity: 0.72 } : undefined), shirt = lam(o.shirt, 0, o.ghost ? { transparent: true, opacity: 0.72 } : undefined), pants = lam(o.pants);
  const torso = box(0.62, 0.72, 0.36, shirt, 0, 1.12, 0, body);
  const head = new THREE.Group(); head.position.set(0, 1.72, 0); body.add(head);
  box(0.5, 0.5, 0.5, skin, 0, 0, 0, head);
  const eyeMat = o.glowEye ? basic(o.eye) : lam(o.eye);
  box(0.09, 0.09, 0.03, eyeMat, -0.11, 0.04, -0.255, head, false); box(0.09, 0.09, 0.03, eyeMat, 0.11, 0.04, -0.255, head, false);
  if (o.zombie) box(0.22, 0.05, 0.03, lam(0x3e2723), 0, -0.13, -0.255, head, false);
  else box(0.2, 0.04, 0.03, lam(0x3e2723), 0, -0.12, -0.255, head, false);
  if (o.hair) box(0.54, 0.14, 0.54, lam(o.hair), 0, 0.25, 0.02, head);
  if (o.cap) { box(0.54, 0.12, 0.54, lam(o.cap), 0, 0.27, 0, head); box(0.5, 0.05, 0.25, lam(o.cap), 0, 0.22, -0.34, head); }
  if (o.crown) { const gm = lam(0xffd700, 0x5a4000); box(0.56, 0.16, 0.56, gm, 0, 0.32, 0, head); for (const [x, z] of [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22], [0, -0.22]]) box(0.1, 0.16, 0.1, gm, x, 0.46, z, head); box(0.08, 0.08, 0.04, basic(0xff1744), 0, 0.34, -0.29, head, false); }
  if (o.shades) { const sm = lam(0x111111); box(0.5, 0.11, 0.04, sm, 0, 0.05, -0.27, head, false); box(0.16, 0.1, 0.02, basic(0x35e7ff), -0.12, 0.05, -0.295, head, false); box(0.16, 0.1, 0.02, basic(0xff3dbb), 0.12, 0.05, -0.295, head, false); }
  if (o.spikes) { const sp = lam(0xcfd8dc); for (let i = 0; i < 5; i++) { const c = mesh(geoCone(0.09, 0.32, 4), sp, (i - 2) * 0.13, 0.36, 0.05, head); } for (let i = 0; i < 3; i++) { const c = mesh(geoCone(0.1, 0.36, 4), sp, (i - 1) * 0.2, 1.4, 0.24, body); c.rotation.x = 1.2; } }
  if (o.armor) { box(0.68, 0.4, 0.42, lam(o.armor), 0, 1.3, 0, body); box(0.28, 0.2, 0.42, lam(o.armor), -0.45, 1.42, 0, body); box(0.28, 0.2, 0.42, lam(o.armor), 0.45, 1.42, 0, body); }
  const mkLimb = (x, y, mat, len = 0.7) => { const g = new THREE.Group(); g.position.set(x, y, 0); body.add(g); box(0.26, len, 0.28, mat, 0, -len / 2, 0, g); return g; };
  const armL = mkLimb(-0.45, 1.46, o.zombie ? skin : shirt), armR = mkLimb(0.45, 1.46, o.zombie ? skin : shirt);
  box(0.25, 0.18, 0.27, skin, 0, -0.64, 0, armL); box(0.25, 0.18, 0.27, skin, 0, -0.64, 0, armR);
  const legL = mkLimb(-0.16, 0.76, pants, 0.76), legR = mkLimb(0.16, 0.76, pants, 0.76);
  if (o.zombie) { armL.rotation.x = armR.rotation.x = -1.35; }
  const hand = new THREE.Group(); hand.position.set(0, -0.68, -0.05); armR.add(hand);
  if (o.aura) { const ring = mesh(new THREE.TorusGeometry(0.75, 0.06, 6, 24), basic(0x35e7ff, { transparent: true, opacity: 0.8 }), 0, 2.25, 0, body, false); ring.rotation.x = Math.PI / 2; root.userData.ring = ring; }
  return { root, body, head, torso, armL, armR, legL, legR, hand, size: s };
}
function animChar(c, moveAmt, t, zombie) {
  const sw = Math.sin(t) * 0.75 * moveAmt;
  c.legL.rotation.x = sw; c.legR.rotation.x = -sw;
  if (zombie) { c.armL.rotation.x = -1.35 + Math.sin(t * 0.5) * 0.12; c.armR.rotation.x = -1.35 - Math.sin(t * 0.5) * 0.12; }
  else if (!c.swinging) { c.armL.rotation.x = -sw; c.armR.rotation.x = c.holding ? -0.5 : sw; }
  c.body.position.y = Math.abs(Math.sin(t)) * 0.06 * moveAmt * c.size;
}

/* ---------- Tool / weapon models (third-person hand + first-person viewmodel) ---------- */
function toolModel(id, vm) {
  const g = new THREE.Group(), W = WEAPONS[id];
  if (id === 'hammer') { box(0.07, 0.7, 0.07, lam(0x8d6e63), 0, 0.15, 0, g); box(0.34, 0.16, 0.18, lam(0x78909c), 0, 0.5, 0, g); }
  else if (id === 'blueprint') { box(0.07, 0.6, 0.07, lam(0x8d6e63), 0, 0.15, 0, g); box(0.32, 0.18, 0.16, lam(0xffd23f, 0x332200), 0, 0.48, 0, g); box(0.4, 0.04, 0.3, basic(0x35e7ff, { transparent: true, opacity: 0.8 }), 0, 0.62, 0, g, false); }
  else if (id === 'woodPick' || id === 'ironAxe') {
    box(0.07, 0.8, 0.07, lam(W.color), 0, 0.2, 0, g);
    if (id === 'woodPick') { const h = box(0.56, 0.1, 0.1, lam(W.head), 0, 0.58, 0, g); box(0.1, 0.1, 0.1, lam(0xcfd8dc), -0.28, 0.54, 0, g); box(0.1, 0.1, 0.1, lam(0xcfd8dc), 0.28, 0.54, 0, g); }
    else { box(0.06, 0.32, 0.3, lam(W.head), 0, 0.5, -0.14, g); box(0.07, 0.36, 0.06, lam(0xeceff1), 0, 0.5, -0.31, g); }
  } else if (id === 'diamondSword') {
    box(0.07, 0.24, 0.07, lam(W.color), 0, 0.02, 0, g); box(0.32, 0.07, 0.1, lam(0x455a64), 0, 0.16, 0, g);
    box(0.12, 0.85, 0.05, lam(W.head, 0x0b4a4d), 0, 0.62, 0, g);
  } else if (id === 'crossbow') {
    const b = new THREE.Group(); g.add(b); b.rotation.x = -Math.PI / 2; b.position.y = 0.15;
    box(0.08, 0.7, 0.1, lam(W.color), 0, 0.1, 0, b); box(0.7, 0.06, 0.06, lam(0x5d4037), 0, 0.35, 0, b); box(0.03, 0.5, 0.03, lam(W.head), 0, 0.3, 0.06, b, false);
  } else if (id === 'blaster') {
    const b = new THREE.Group(); g.add(b); b.rotation.x = -Math.PI / 2; b.position.y = 0.15;
    box(0.14, 0.7, 0.16, lam(W.color), 0, 0.15, 0, b); box(0.06, 0.4, 0.06, basic(W.head), 0, 0.55, 0, b, false); box(0.1, 0.18, 0.2, lam(0x37474f), 0, -0.12, -0.1, b);
    box(0.16, 0.1, 0.05, basic(0x35e7ff), 0, 0.2, 0.09, b, false);
  }
  if (vm) g.traverse(o => { o.castShadow = false; });
  return g;
}

/* ---------- Structures ---------- */
function structureMesh(type, tier, ghostMat) {
  const T = TIERS[tier], g = new THREE.Group();
  const M = (c, e = 0) => ghostMat || lam(c, e);
  const main = M(T.color, T.emissive), dark = M(T.dark, T.emissive);
  if (type === 'stash') {
    box(1.9, 0.9, 1.9, dark, 0, 0.45, 0, g); box(1.7, 0.7, 1.7, main, 0, 1.1, 0, g);
    const gold = ghostMat || lam(0xffd23f, 0x6b4a00);
    for (let i = 0; i < 7; i++) box(0.42, 0.22, 0.42, gold, Math.cos(i * 0.9) * 0.5 * (i % 2 ? 1 : 0.4), 1.55 + (i % 3) * 0.12, Math.sin(i * 0.9) * 0.5 * (i % 2 ? 1 : 0.4), g);
    box(0.08, 1.6, 0.08, M(0x5d4037), 0.75, 2.1, 0.75, g); box(0.6, 0.38, 0.04, ghostMat || basic(0xff3dbb), 1.05, 2.65, 0.75, g, false);
  } else if (type === 'wall') {
    box(1.96, 1.9, 1.96, main, 0, 0.95, 0, g);
    box(2.0, 0.22, 2.0, dark, 0, 0.28, 0, g, false); box(2.0, 0.22, 2.0, dark, 0, 1.6, 0, g, false);
    if (tier >= 3) for (const [x, z] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) box(0.2, 1.95, 0.2, dark, x, 0.98, z, g, false);
    if (tier === 4) box(2.02, 0.08, 2.02, ghostMat || basic(0xfff59d), 0, 0.95, 0, g, false);
  } else if (type === 'spike') {
    box(1.9, 0.16, 1.9, dark, 0, 0.08, 0, g, false);
    const sm = M(tier >= 3 ? 0xcfd8dc : T.color, T.emissive);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) mesh(geoCone(0.17, 0.55, 4), sm, (i - 1) * 0.6, 0.42, (j - 1) * 0.6, g, false);
  } else if (type === 'arrow') {
    box(1.5, 2.2, 1.5, main, 0, 1.1, 0, g); box(1.9, 0.3, 1.9, dark, 0, 2.3, 0, g);
    const tur = new THREE.Group(); tur.position.y = 2.6; g.add(tur);
    box(0.5, 0.4, 0.5, dark, 0, 0.15, 0, tur); box(1.3, 0.1, 0.12, M(0x5d4037), 0, 0.35, -0.3, tur); box(0.12, 0.12, 1.0, M(0x8d6e63), 0, 0.35, -0.2, tur);
    g.userData.turret = tur;
  } else if (type === 'cannon') {
    box(1.8, 1.3, 1.8, main, 0, 0.65, 0, g); box(1.95, 0.25, 1.95, dark, 0, 1.4, 0, g);
    const tur = new THREE.Group(); tur.position.y = 1.85; g.add(tur);
    mesh(geoSphere(0.55, 10), M(0x37474f), 0, 0, 0, tur); const barrel = mesh(geoCyl(0.22, 0.28, 1.4, 10), M(0x263238), 0, 0.1, -0.7, tur); barrel.rotation.x = Math.PI / 2 - 0.25;
    g.userData.turret = tur;
  } else if (type === 'mine') {
    box(1.7, 1.0, 1.7, main, 0, 0.5, 0, g); box(1.2, 0.7, 1.2, dark, 0, 1.35, 0, g);
    const wheel = new THREE.Group(); wheel.position.set(0, 1.9, 0); g.add(wheel);
    for (let i = 0; i < 4; i++) { const sp = box(0.1, 1.1, 0.1, M(0x5d4037), 0, 0, 0, wheel, false); sp.rotation.z = i * Math.PI / 4; }
    const gold = ghostMat || lam(0xffd23f, 0x6b4a00); box(0.3, 0.3, 0.3, gold, 0.55, 1.15, 0.55, g); box(0.24, 0.24, 0.24, gold, -0.55, 1.12, 0.5, g);
    g.userData.wheel = wheel;
  }
  return g;
}

/* ---------- Resource nodes ---------- */
function treeMesh(seed) {
  const g = new THREE.Group(), h = 1.6 + (seed % 3) * 0.4;
  box(0.6, h, 0.6, lam(0x8d5a2b), 0, h / 2, 0, g);
  const lc = [0x43a047, 0x2e7d32, 0x66bb6a][seed % 3];
  box(2.2, 1.3, 2.2, lam(lc), 0, h + 0.5, 0, g); box(1.5, 1.0, 1.5, lam(lc), 0, h + 1.5, 0, g); box(0.8, 0.6, 0.8, lam(lc), 0, h + 2.2, 0, g);
  return g;
}
function rockMesh(seed, gold) {
  const g = new THREE.Group(), c = gold ? 0x7b6f63 : [0x9e9e9e, 0x8a8f96, 0xa7adb3][seed % 3];
  const a = box(1.6, 1.1, 1.4, lam(c), 0, 0.55, 0, g); a.rotation.y = seed;
  const b = box(1.0, 0.8, 1.1, lam(c), 0.6, 0.9, 0.2, g); b.rotation.set(0.2, seed * 2, 0.15);
  box(0.8, 0.5, 0.7, lam(c), -0.6, 0.3, 0.5, g);
  if (gold) { const gm = lam(0xffd23f, 0x7a5600); for (let i = 0; i < 6; i++) { const n = box(0.28, 0.28, 0.28, gm, Math.cos(i * 1.7) * 0.75, 0.5 + (i % 3) * 0.3, Math.sin(i * 1.7) * 0.7, g, false); n.rotation.set(i, i * 2, 0); } }
  return g;
}

/* ---------- World ---------- */
function buildWorld() {
  const S = G.scene;
  G.hemi = new THREE.HemisphereLight(0xdff4ff, 0x5c8a3a, 0.85); S.add(G.hemi);
  G.sun = new THREE.DirectionalLight(0xfff3d6, 1.6); G.sun.position.set(30, 50, 20); G.sun.castShadow = true;
  const sc = G.sun.shadow.camera; sc.left = -30; sc.right = 30; sc.top = 30; sc.bottom = -30; sc.near = 1; sc.far = 140; G.sun.shadow.bias = -0.0008;
  S.add(G.sun); S.add(G.sun.target);
  // ground: checker grass texture
  const gtex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#5fbf3f'; g.fillRect(0, 0, w, h); g.fillStyle = '#58b53a'; g.fillRect(0, 0, w / 2, h / 2); g.fillRect(w / 2, h / 2, w / 2, h / 2);
    for (let i = 0; i < 260; i++) { g.fillStyle = Math.random() < 0.5 ? '#6ccc48' : '#4fa833'; g.fillRect(Math.random() * w, Math.random() * h, 3, 6); }
  });
  gtex.wrapS = gtex.wrapT = THREE.RepeatWrapping; gtex.repeat.set(MAP_R, MAP_R); gtex.magFilter = THREE.NearestFilter;
  G.ground = new THREE.Mesh(new THREE.PlaneGeometry(MAP_R * 2 + 40, MAP_R * 2 + 40), new THREE.MeshLambertMaterial({ map: gtex }));
  G.ground.rotation.x = -Math.PI / 2; G.ground.receiveShadow = true; S.add(G.ground);
  // map border: blocky fence + dark forest ring
  const fence = lam(0x8d6e63), post = lam(0x6d4c41);
  for (let i = 0; i < 64; i++) {
    const a = i / 64 * Math.PI * 2, x = Math.cos(a) * (MAP_R + 1.5), z = Math.sin(a) * (MAP_R + 1.5);
    const p = box(0.4, 1.4, 0.4, post, x, 0.7, z, S, false); const r = box(4.3, 0.22, 0.16, fence, x, 1.0, z, S, false); r.rotation.y = -a + Math.PI / 2;
    if (i % 2 === 0) { const t = treeMesh(i); t.position.set(Math.cos(a) * (MAP_R + 5 + (i % 3)), 0, Math.sin(a) * (MAP_R + 5 + (i % 3))); t.scale.setScalar(1.4); S.add(t); }
  }
  // decorative flowers
  const fl = [0xff5c8a, 0xffe14d, 0xffffff, 0x7fd3ff];
  for (let i = 0; i < 90; i++) { const a = Math.random() * Math.PI * 2, r = 4 + Math.random() * (MAP_R - 4); box(0.18, 0.18, 0.18, lam(pick(fl)), Math.cos(a) * r, 0.09, Math.sin(a) * r, S, false); }
  // resource nodes
  G.nodes = []; let seed = 1;
  const place = (kind, n, minR) => {
    for (let i = 0, tries = 0; i < n && tries < 600; tries++) {
      const a = Math.random() * Math.PI * 2, r = minR + Math.random() * (MAP_R - 3 - minR), x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (G.nodes.some(o => dist2(o.x, o.z, x, z) < 30)) continue;
      const m = kind === 'tree' ? treeMesh(seed) : rockMesh(seed, kind === 'gold'); m.position.set(x, 0, z); m.rotation.y = seed; S.add(m); seed++;
      G.nodes.push({ kind, x, z, r: kind === 'tree' ? 0.7 : 1.1, mesh: m, shake: 0 }); i++;
    }
  };
  place('tree', 34, 7); place('rock', 18, 8); place('gold', 8, 14);
  // build grid overlay (shown while holding a blueprint)
  const gridTex = canvasTex(128, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(120,255,240,0.9)'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6); });
  gridTex.wrapS = gridTex.wrapT = THREE.RepeatWrapping; gridTex.repeat.set(BUILD_R, BUILD_R);
  G.grid = new THREE.Mesh(new THREE.PlaneGeometry(BUILD_R * 2, BUILD_R * 2), new THREE.MeshBasicMaterial({ map: gridTex, transparent: true, opacity: 0.35, depthWrite: false }));
  G.grid.rotation.x = -Math.PI / 2; G.grid.position.y = 0.03; G.grid.visible = false; G.grid.renderOrder = 1; S.add(G.grid);
  G.ghostOk = new THREE.MeshBasicMaterial({ color: 0x4cff9a, transparent: true, opacity: 0.45, depthWrite: false });
  G.ghostBad = new THREE.MeshBasicMaterial({ color: 0xff4d4d, transparent: true, opacity: 0.45, depthWrite: false });
  // build radius ring
  G.ring = new THREE.Mesh(new THREE.RingGeometry(BUILD_R - 0.15, BUILD_R + 0.15, 64), new THREE.MeshBasicMaterial({ color: 0x35e7ff, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }));
  G.ring.rotation.x = -Math.PI / 2; G.ring.position.y = 0.05; G.ring.visible = false; S.add(G.ring);
  // moon + stars for night
  G.moon = new THREE.Mesh(geoSphere(4, 16), basic(0xfff8e1)); G.moon.position.set(-60, 70, -80); G.moon.visible = false; S.add(G.moon);
  const starGeo = new THREE.BufferGeometry(), pts = [];
  for (let i = 0; i < 400; i++) { const a = Math.random() * Math.PI * 2, e = 0.15 + Math.random() * 1.2, r = 150; pts.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r); }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  G.stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.4, sizeAttenuation: false, transparent: true, opacity: 0 })); S.add(G.stars);
  // torches around the spawn area add glow at night
  G.torches = [];
}
/* ---------- Run state ---------- */
function newRun() {
  const R = {
    phase: 'setup', timer: DAY_LEN, wave: 0, res: { wood: 40, stone: 20, gold: 0 }, score: 0, kills: 0, tokens: 0, bosses: 0,
    owned: { woodPick: true }, melee: 'woodPick', ranged: null, squad: [], over: false, nightsSurvived: 0, startT: performance.now()
  };
  return R;
}
function startRun() {
  clearWorldActors();
  G.run = newRun(); G.cells = new Map(); G.structs = []; G.zombies = []; G.projs = []; G.bots = []; G.spawnQ = 0; G.spawnT = 0; G.boss = null;
  const P = G.player; P.x = 0; P.z = 6; P.y = 0; P.vy = 0; P.yaw = 0; P.pitch = -0.12; P.hp = P.maxHp = 100; P.dead = false; P.hurtT = 9; P.respawn = 0; P.swingT = 0; P.cool = 0;
  G.slot = 2; G.rot = 0; G.dayness = 1; G.camMode = G.settings.cam === 'first' ? 'first' : 'third'; G.camBlend = G.camMode === 'first' ? 1 : 0;
  G.stats.games++; saveJSON(STATS_KEY, G.stats);
  equipVisual(); setObjective(); updateHUD(true); refreshHotbar();
  banner('PLACE YOUR GOLD STASH', 'Aim at the grass and ' + bindTxt('primary') + ' to drop your base core', 'gold', 4);
}
function clearWorldActors() {
  (G.structs || []).forEach(s => G.scene.remove(s.mesh, s.bar));
  (G.zombies || []).forEach(z => G.scene.remove(z.c.root));
  (G.projs || []).forEach(p => G.scene.remove(p.mesh));
  (G.bots || []).forEach(b => G.scene.remove(b.c.root));
  G.parts && G.parts.forEach(p => { p.dead = true; p.m.visible = false; });
  G.pops && G.pops.forEach(p => p.el.remove()); G.pops = [];
}
const cellOf = v => Math.floor(v / CELL);
const cellKey = (cx, cz) => cx + ',' + cz;
const cellCenter = c => (c + 0.5) * CELL;
function structAt(x, z) { return G.cells.get(cellKey(cellOf(x), cellOf(z))); }
function stash() { return G.structs.find(s => s.type === 'stash'); }
function afford(c) { const r = G.run.res; return !c || ['wood', 'stone', 'gold'].every(k => (r[k] || 0) >= (c[k] || 0)); }
function pay(c) { if (!afford(c)) return false; for (const k in c) G.run.res[k] -= c[k] || 0; updateHUD(); return true; }
function addRes(k, n, pos, quiet) {
  n = Math.round(n); if (!n) return; G.run.res[k] = (G.run.res[k] || 0) + n;
  if (pos && !quiet) popup(`+${n} ${RES_META[k].name}`, pos.x, pos.y, pos.z, RES_META[k].color);
  updateHUD();
}
function countType(t) { let n = 0; for (const s of G.structs) if (s.type === t) n++; return n; }

/* ---------- Placement ---------- */
function canPlace(type, cx, cz) {
  const x = cellCenter(cx), z = cellCenter(cz), st = stash();
  if (Math.hypot(x, z) > MAP_R - 2) return { ok: false, why: 'Too close to the map edge' };
  if (G.cells.has(cellKey(cx, cz))) return { ok: false, why: 'Something is already here' };
  if (type !== 'stash') {
    if (!st) return { ok: false, why: 'Place your Gold Stash first' };
    if (Math.hypot(x - st.x, z - st.z) > BUILD_R) return { ok: false, why: 'Build closer to your Gold Stash' };
    if (countType(type) >= BUILD[type].max) return { ok: false, why: `Max ${BUILD[type].max} ${BUILD[type].name}s` };
    if (!afford(BUILD[type].cost)) return { ok: false, why: 'Need ' + costText(BUILD[type].cost) };
  }
  for (const n of G.nodes) { const dx = Math.max(Math.abs(n.x - x) - CELL / 2, 0), dz = Math.max(Math.abs(n.z - z) - CELL / 2, 0); if (dx * dx + dz * dz < n.r * n.r) return { ok: false, why: 'Blocked by a tree or rock' }; }
  if (type !== 'spike') {
    const P = G.player, dx = Math.max(Math.abs(P.x - x) - CELL / 2, 0), dz = Math.max(Math.abs(P.z - z) - CELL / 2, 0);
    if (dx * dx + dz * dz < 0.35 * 0.35) return { ok: false, why: 'You are standing there' };
    for (const zb of G.zombies) if (Math.abs(zb.x - x) < 1.2 && Math.abs(zb.z - z) < 1.2) return { ok: false, why: 'A zombie is in the way' };
  }
  return { ok: true };
}
function placeStructure(type, cx, cz, rot, free) {
  const chk = canPlace(type, cx, cz); if (!chk.ok) { toast(chk.why, 'warn'); G.sound.play('deny'); return null; }
  if (!free && type !== 'stash' && !pay(BUILD[type].cost)) return null;
  const s = { type, cx, cz, x: cellCenter(cx), z: cellCenter(cz), tier: 1, rot: rot || 0, hp: BUILD[type].hp[1], max: BUILD[type].hp[1], cd: rand(0, 0.5), t: 0 };
  buildStructMesh(s); G.structs.push(s); G.cells.set(cellKey(cx, cz), s);
  G.sound.play('place'); burst(s.x, 0.6, s.z, TIERS[1].color, 10);
  if (type === 'stash') {
    G.run.phase = 'day'; G.run.timer = DAY_LEN; G.grid.position.set(s.x, 0.03, s.z); G.ring.position.set(s.x, 0.05, s.z);
    G.stashLight.position.set(s.x, 3.5, s.z); G.slot = 0; equipVisual(); refreshHotbar();
    banner('DAY 1 — GATHER & BUILD', 'Chop trees and rocks, then build walls and towers before night', 'day', 4); G.sound.play('day');
  }
  setObjective(); updateHUD(); return s;
}
function buildStructMesh(s) {
  if (s.mesh) G.scene.remove(s.mesh);
  s.mesh = structureMesh(s.type, s.tier); s.mesh.position.set(s.x, 0, s.z); s.mesh.rotation.y = s.rot * Math.PI / 2;
  s.mesh.traverse(o => { if (o.isMesh) o.userData.struct = s; });
  if (!G.qual.shadows) s.mesh.traverse(o => { o.castShadow = false; });
  G.scene.add(s.mesh);
  if (!s.bar) { s.bar = hpBar(s.type === 'stash' ? 2.2 : 1.4); G.scene.add(s.bar); }
  s.bar.position.set(s.x, s.type === 'arrow' ? 3.6 : s.type === 'stash' ? 3.3 : s.type === 'cannon' ? 2.9 : s.type === 'mine' ? 2.8 : s.type === 'spike' ? 1.0 : 2.4, s.z);
  setHp(s.bar, s.hp / s.max); s.bar.visible = s.hp < s.max || s.type === 'stash';
}
function removeStructure(s, refund) {
  G.scene.remove(s.mesh, s.bar); G.structs.splice(G.structs.indexOf(s), 1); G.cells.delete(cellKey(s.cx, s.cz));
  if (refund) for (const k in BUILD[s.type].cost) addRes(k, Math.floor(BUILD[s.type].cost[k] * 0.5 * s.tier), null, true);
}
function damageStructure(s, dmg, src) {
  if (!s || s.hp <= 0 || G.run.over) return;
  if (src && src.def && src.def.oneShotT1 && s.tier === 1 && s.type !== 'stash') dmg = s.hp;
  s.hp -= dmg; s.hitT = 0.15; setHp(s.bar, s.hp / s.max); s.bar.visible = true;
  if (s.type === 'stash') { G.sound.play('stashhit'); G.stashFlash = 0.35; if (src && src.def && src.def.steal) { const st = Math.min(G.run.res.gold, src.def.steal); if (st > 0) { G.run.res.gold -= st; G.run.score = Math.max(0, G.run.score - st * 2); popup(`-${st} Gold (Aura stolen!)`, s.x, 3, s.z, '#e040fb'); } } updateHUD(); }
  if (s.hp <= 0) {
    burst(s.x, 1, s.z, TIERS[s.tier].color, 18); G.sound.play('boom');
    if (s.type === 'stash') { s.hp = 0; gameOver(); return; }
    removeStructure(s, false); toast(`${BUILD[s.type].name} destroyed!`, 'bad');
  }
}
function repairCost(s) { const miss = s.max - s.hp; return { wood: Math.ceil(miss / 30), stone: s.tier >= 2 ? Math.ceil(miss / 45) : 0 }; }
function maxTierFor(s) { if (s.type === 'stash') return 4; const st = stash(); return st ? st.tier : 1; }
function hammerUse(s, demolish) {
  if (!s) return;
  if (demolish) { if (s.type === 'stash') { toast('You can’t demolish your Gold Stash', 'warn'); G.sound.play('deny'); return; } removeStructure(s, true); G.sound.play('click'); toast(`${BUILD[s.type].name} demolished (50% refund)`); return; }
  if (s.hp < s.max - 0.5) {
    const c = repairCost(s); if (!pay(c)) { toast('Repair needs ' + costText(c), 'warn'); G.sound.play('deny'); return; }
    s.hp = s.max; setHp(s.bar, 1); s.bar.visible = s.type === 'stash'; G.sound.play('repair'); burst(s.x, 1.2, s.z, 0x35e7ff, 10); popup('Repaired', s.x, 2.5, s.z, '#7fffe8'); return;
  }
  if (s.tier >= 4) { toast(`${BUILD[s.type].name} is max tier (Neon Gold)`); return; }
  if (s.tier + 1 > maxTierFor(s)) { toast(`Upgrade your Gold Stash to Tier ${s.tier + 1} first`, 'warn'); G.sound.play('deny'); return; }
  const c = upgradeCost(s.type, s.tier + 1); if (!pay(c)) { toast(`Tier ${s.tier + 1} needs ${costText(c)}`, 'warn'); G.sound.play('deny'); return; }
  const f = s.hp / s.max; s.tier++; s.max = BUILD[s.type].hp[s.tier]; s.hp = Math.max(f * s.max, s.hp); buildStructMesh(s);
  G.sound.play('upgrade'); burst(s.x, 1.4, s.z, TIERS[s.tier].color, 22); popup(`Tier ${s.tier} · ${TIERS[s.tier].name}`, s.x, 3, s.z, '#ffe46b');
  G.run.score += 15 * s.tier; updateHUD(); setObjective();
}

/* ---------- Collision ---------- */
function blocksAt(x, z, r, ignoreSpike = true) {
  const c0 = cellOf(x - r), c1 = cellOf(x + r), d0 = cellOf(z - r), d1 = cellOf(z + r);
  for (let cx = c0; cx <= c1; cx++) for (let cz = d0; cz <= d1; cz++) {
    const s = G.cells.get(cellKey(cx, cz)); if (!s || (ignoreSpike && s.type === 'spike')) continue;
    const dx = Math.max(Math.abs(x - s.x) - CELL / 2, 0), dz = Math.max(Math.abs(z - s.z) - CELL / 2, 0); if (dx * dx + dz * dz < r * r) return s;
  }
  return null;
}
function pushFromNodes(o, r) {
  for (const n of G.nodes) { const dx = o.x - n.x, dz = o.z - n.z, d = Math.hypot(dx, dz), m = n.r + r; if (d < m && d > 0.0001) { o.x = n.x + dx / d * m; o.z = n.z + dz / d * m; } }
  const d = Math.hypot(o.x, o.z); if (d > MAP_R) { o.x *= MAP_R / d; o.z *= MAP_R / d; }
}
function moveWithCollide(o, dx, dz, r) {
  let hit = null;
  if (dx) { const b = blocksAt(o.x + dx, o.z, r); if (!b) o.x += dx; else hit = b; }
  if (dz) { const b = blocksAt(o.x, o.z + dz, r); if (!b) o.z += dz; else hit = hit || b; }
  pushFromNodes(o, r); return hit;
}

/* ---------- Player actions ---------- */
function currentTool() {
  const h = HOTBAR[G.slot];
  if (G.run && G.run.phase === 'setup' && h.kind === 'build') return { kind: 'build', type: 'stash', name: 'Gold Stash' };
  if (h.kind === 'melee') return { kind: 'melee', w: WEAPONS[G.run.melee], id: G.run.melee };
  if (h.kind === 'ranged') return G.run.ranged ? { kind: 'ranged', w: WEAPONS[G.run.ranged], id: G.run.ranged } : { kind: 'melee', w: WEAPONS[G.run.melee], id: G.run.melee, noRanged: true };
  if (h.kind === 'build') return { kind: 'build', type: h.id, name: BUILD[h.id].name };
  return { kind: 'hammer' };
}
function selectSlot(i) {
  if (!G.run) return; i = ((i % HOTBAR.length) + HOTBAR.length) % HOTBAR.length;
  if (HOTBAR[i].kind === 'ranged' && !G.run.ranged) { toast('Buy a Rapid Crossbow in the Shop to unlock this slot', 'warn'); }
  G.slot = i; G.sound.play('click'); equipVisual(); refreshHotbar();
}
function cycleSlot(d) { let i = G.slot; for (let k = 0; k < HOTBAR.length; k++) { i = (i + d + HOTBAR.length) % HOTBAR.length; if (HOTBAR[i].kind !== 'ranged' || G.run.ranged) break; } selectSlot(i); }
function aimRay() { G.ray.setFromCamera(G.center, G.camera); return G.ray; }
function aimGroundCell() {
  const P = G.player, ray = aimRay(), o = ray.ray.origin, d = ray.ray.direction;
  let x, z;
  if (d.y < -0.02) { const t = -o.y / d.y; x = o.x + d.x * t; z = o.z + d.z * t; }
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);
  if (x === undefined || Math.hypot(x - P.x, z - P.z) > 9) { x = P.x + fx * 3.2; z = P.z + fz * 3.2; }
  if (Math.hypot(x - P.x, z - P.z) < 1.2) { x = P.x + fx * 2.2; z = P.z + fz * 2.2; }
  return { cx: cellOf(x), cz: cellOf(z) };
}
function aimStruct(maxD = 7) {
  const ray = aimRay(); ray.far = 60;
  const hits = ray.intersectObjects(G.structs.map(s => s.mesh), true);
  for (const h of hits) { const s = h.object.userData.struct; if (!s) continue; if (Math.hypot(s.x - G.player.x, s.z - G.player.z) <= maxD + 1) return s; break; }
  // fallback: structure in the cell right in front of you
  const P = G.player, fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);
  for (const d of [1.3, 2.3]) { const s = structAt(P.x + fx * d, P.z + fz * d); if (s) return s; }
  return null;
}
function primary() {
  const P = G.player, R = G.run; if (!R || R.over || P.dead || P.cool > 0) return;
  const tool = currentTool();
  if (tool.kind === 'build') {
    const c = aimGroundCell(); placeStructure(tool.type, c.cx, c.cz, G.rot); P.cool = 0.18; G.vmKick = 1; return;
  }
  if (tool.kind === 'hammer') { const s = aimStruct(); if (s) hammerUse(s); else { toast('Aim at a wall, tower or your Gold Stash', 'warn'); } P.cool = 0.3; G.vmKick = 1; swingAnim(); return; }
  if (tool.kind === 'ranged') { fireRanged(tool.w); P.cool = tool.w.rate; return; }
  // melee swing
  P.cool = tool.w.rate; G.sound.play('swing'); swingAnim();
  setTimeout(() => meleeHit(tool.w), 110);
}
function swingAnim() { G.vmSwing = 1; G.player.c.swinging = 0.35; }
function meleeHit(w) {
  if (!G || !G.run || G.run.over) return;
  const P = G.player, fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw); let best = null, bd = 1e9;
  for (const z of G.zombies) {
    if (z.dead) continue; const dx = z.x - P.x, dz = z.z - P.z, d = Math.hypot(dx, dz) - 0.35 * z.def.size;
    if (d > w.range) continue; if ((dx * fx + dz * fz) / Math.max(0.01, Math.hypot(dx, dz)) < 0.35 && d > 0.8) continue;
    if (d < bd) { bd = d; best = z; }
  }
  if (best) { hurtZombie(best, w.dmg, P.x, P.z); G.sound.play('hit'); G.pad.rumble(0.25, 60); return; }
  let node = null; bd = 1e9;
  for (const n of G.nodes) {
    const dx = n.x - P.x, dz = n.z - P.z, d = Math.hypot(dx, dz) - n.r; if (d > w.range) continue;
    if ((dx * fx + dz * fz) / Math.max(0.01, Math.hypot(dx, dz)) < 0.3) continue; if (d < bd) { bd = d; node = n; }
  }
  if (node) {
    node.shake = 0.25; const amt = node.kind === 'gold' ? 5 : 10, k = node.kind === 'tree' ? 'wood' : node.kind === 'rock' ? 'stone' : 'gold';
    addRes(k, amt * w.harvest, { x: node.x, y: node.kind === 'tree' ? 2.6 : 1.8, z: node.z });
    G.sound.play(node.kind === 'tree' ? 'chop' : node.kind === 'rock' ? 'stone' : 'gold');
    burst(lerp(node.x, P.x, 0.4), 1.1, lerp(node.z, P.z, 0.4), node.kind === 'tree' ? 0x8d5a2b : node.kind === 'rock' ? 0x9e9e9e : 0xffd23f, 6);
    G.run.score += 1; if (!G.tut.harvested) { G.tut.harvested = true; setObjective(); }
  }
}
function fireRanged(w) {
  const ray = aimRay(), P = G.player;
  // aim at what the crosshair hits (60m) so 3rd-person shots go where you point
  const target = ray.ray.origin.clone().addScaledVector(ray.ray.direction, 40);
  const start = new THREE.Vector3(P.x, P.y + 1.45, P.z); const fwd = new THREE.Vector3(-Math.sin(P.yaw), 0, -Math.cos(P.yaw)); start.addScaledVector(fwd, 0.6);
  const dir = target.sub(start).normalize();
  spawnProj(w === WEAPONS.blaster ? 'bolt' : 'bolt_x', start, dir.multiplyScalar(w.speed), w.dmg, 'player');
  G.sound.play(w === WEAPONS.blaster ? 'blaster' : 'xbow'); G.vmKick = 1; G.pad.rumble(0.15, 40);
}
function jump() { const P = G.player; if (P.ground && !P.dead) { P.vy = 7.2; P.ground = false; G.sound.play('jump'); } }
function toggleCam() { G.camMode = G.camMode === 'first' ? 'third' : 'first'; G.settings.cam = G.camMode; saveJSON(SET_KEY, G.settings); G.sound.play('click'); updateHUD(true); toast(G.camMode === 'first' ? '👁️ First-Person' : '🎥 Third-Person'); }
function rotateBlueprint() { G.rot = (G.rot + 1) % 4; G.sound.play('click'); }

/* ---------- Zombies ---------- */
function spawnZombie(kind, x, z) {
  const def = ZOMBIES[kind], w = G.run.wave, scale = def.boss ? (1 + Math.max(0, w - 15) * 0.25) : (1 + (w - 1) * 0.13);
  const c = makeChar({ zombie: true, skin: def.skin, shirt: def.shirt, pants: def.pants, eye: def.eye, glowEye: def.glowEye, size: def.size, crown: def.crown, shades: def.shades, spikes: def.spikes, armor: def.armor, ghost: def.ghost, aura: def.aura, glow: def.aura ? 0x55003a : 0 });
  if (!G.qual.shadows || !def.boss) c.root.traverse(o => { if (o.isMesh) o.castShadow = def.boss && G.qual.shadows; });
  if (x === undefined) { const a = Math.random() * Math.PI * 2; x = Math.cos(a) * (MAP_R - 1); z = Math.sin(a) * (MAP_R - 1); }
  c.root.position.set(x, 0, z); G.scene.add(c.root);
  const plate = labelSprite(def.name, def.boss ? '#ffd23f' : kind === 'phantom' ? '#e9a6ff' : kind === 'sprinter' ? '#ff8a8a' : kind === 'tank' ? '#ffcc80' : '#c5f59a', undefined, def.boss ? 1.6 : 0.8);
  plate.position.y = 2.35 * def.size + 0.35; c.root.add(plate);
  const bar = hpBar(def.boss ? 2.6 : 1.1); bar.position.y = 2.35 * def.size + 0.05; c.root.add(bar);
  const zb = { kind, def, c, x, z, hp: def.hp * scale, max: def.hp * scale, cd: 0, t: Math.random() * 10, plate, bar, slow: 0, spikeT: 0, abil: 3, groanT: rand(2, 8), dmgMul: 1 + (w - 1) * 0.05 };
  setHp(bar, 1); bar.visible = false; G.zombies.push(zb);
  if (def.boss) { G.boss = zb; bossBar(zb); }
  return zb;
}
function hurtZombie(z, dmg, fx, fz) {
  if (z.dead) return; z.hp -= dmg; z.hitT = 0.12; setHp(z.bar, z.hp / z.max); z.bar.visible = true;
  if (fx !== undefined && !z.def.boss) { const dx = z.x - fx, dz = z.z - fz, d = Math.hypot(dx, dz) || 1; moveWithCollide(z, dx / d * 0.35, dz / d * 0.35, 0.35 * z.def.size); }
  popup(String(Math.round(dmg)), z.x, 2.2 * z.def.size + 0.4, z.z, z.def.boss ? '#ffd23f' : '#ffffff', true);
  if (z === G.boss) bossBar(z);
  if (z.hp <= 0) killZombie(z, true);
}
function killZombie(z, reward) {
  z.dead = true; G.scene.remove(z.c.root); burst(z.x, 1 * z.def.size, z.z, z.def.skin, z.def.boss ? 40 : 10);
  if (reward) {
    G.run.kills++; G.run.score += z.def.score; G.stats.totalKills++; addRes('gold', z.def.gold, { x: z.x, y: 2, z: z.z }, !z.def.boss);
    G.sound.play('zdie');
    if (z.def.boss) bossDefeated(z);
  }
  if (z === G.boss) { G.boss = null; bossBar(null); }
  updateHUD();
}
function bossDefeated(z) {
  G.run.bosses++; G.stats.bossesBeaten++;
  const tok = z.kind === 'omega' ? 50 : z.kind === 'megalodon' ? 30 : 20;
  const got = awardTokens(tok, 'Zomb.io boss'); G.run.tokens += got; G.stats.tokensEarned += got;
  let sub = `+${got} Arcade Tokens 🎟️`;
  if (z.kind === 'omega' && !G.stats.goldenTrophy) { G.stats.goldenTrophy = true; sub += ' · 🏆 Golden Trophy unlocked!'; }
  else if (z.kind === 'omega') sub += ' · 🏆 Golden Trophy';
  saveJSON(STATS_KEY, G.stats); G.sound.play('token'); G.pad.rumble(0.8, 400);
  banner(`${z.def.name} DEFEATED!`, sub, 'gold', 4.5);
}
function zombieTarget(z) {
  const P = G.player, st = stash();
  if (!P.dead && z.kind !== 'phantom' && !z.def.boss && dist2(z.x, z.z, P.x, P.z) < 49) return { player: true, x: P.x, z: P.z };
  if (z.def.targetsTowers || z.kind === 'omega') {
    let best = null, bd = 1e9; for (const s of G.structs) if (s.type === 'arrow' || s.type === 'cannon' || s.type === 'mine') { const d = dist2(z.x, z.z, s.x, s.z); if (d < bd) { bd = d; best = s; } }
    if (best && z.kind !== 'omega') return { s: best, x: best.x, z: best.z };
  }
  if (st) return { s: st, x: st.x, z: st.z };
  return P.dead ? null : { player: true, x: P.x, z: P.z };
}
function updateZombies(dt) {
  const P = G.player;
  for (const z of G.zombies) {
    if (z.dead) continue; z.t += dt; z.cd -= dt;
    const def = z.def, r = 0.35 * def.size, tg = zombieTarget(z);
    let moving = 0;
    // boss abilities
    if (def.boss) {
      z.abil -= dt;
      if (z.kind === 'rizzler' && z.abil <= 0) { z.abil = 7; for (let i = 0; i < 3; i++) spawnZombie(pick(['walker', 'sprinter']), z.x + rand(-2, 2), z.z + rand(-2, 2)); popup('MINIONS!', z.x, 7, z.z, '#ffd23f'); G.sound.play('groan'); }
      if (z.kind === 'omega' && z.abil <= 0) {
        z.abil = 2.6; let best = null, bd = 22 * 22;
        for (const s of G.structs) if (s.type !== 'wall' && s.type !== 'spike') { const d = dist2(z.x, z.z, s.x, s.z); if (d < bd) { bd = d; best = s; } }
        if (!best && !P.dead && dist2(z.x, z.z, P.x, P.z) < 400) best = { player: true };
        if (best) { const tx = best.player ? P.x : best.x, tz = best.player ? P.z : best.z, start = new THREE.Vector3(z.x, 5.5, z.z), dir = new THREE.Vector3(tx - z.x, (best.player ? 1 : 1.5) - 5.5, tz - z.z).normalize(); const p = spawnProj('orb', start, dir.multiplyScalar(16), 70, 'boss'); p.homing = best; G.sound.play('zap'); }
      }
      if (z.c.root.userData.ring) { z.c.root.userData.ring.rotation.z += dt * 2; z.c.root.userData.ring.material.opacity = 0.5 + Math.sin(z.t * 4) * 0.3; }
    }
    if (tg) {
      const dx = tg.x - z.x, dz = tg.z - z.z, d = Math.hypot(dx, dz) || 1, nx = dx / d, nz = dz / d;
      z.yaw = Math.atan2(-nx, -nz);
      let reach;
      if (tg.player) reach = d < 1.0 + r;
      else { const ex = Math.max(Math.abs(z.x - tg.x) - CELL / 2, 0), ez = Math.max(Math.abs(z.z - tg.z) - CELL / 2, 0); reach = Math.hypot(ex, ez) < r + 0.35; }
      if (reach) {
        if (z.cd <= 0) { z.cd = def.rate; z.lunge = 0.25; if (tg.player) hurtPlayer(def.dmg * z.dmgMul); else damageStructure(tg.s, def.dmg * z.dmgMul, z); }
      } else {
        const sp = def.speed * (z.slow > 0 ? 0.55 : 1) * dt;
        const hit = moveWithCollide(z, nx * sp, nz * sp, r); moving = 1;
        if (hit) { // blocked by a wall/tower: smash it
          if (z.kind === 'sprinter' && Math.random() < 0.02) { /* sprinters sometimes try to run around */ const side = Math.random() < 0.5 ? 1 : -1; moveWithCollide(z, -nz * sp * side * 3, nx * sp * side * 3, r); }
          if (z.cd <= 0) { z.cd = def.rate; z.lunge = 0.25; damageStructure(hit, def.dmg * z.dmgMul, z); }
        }
      }
    }
    // spikes
    const sc = G.cells.get(cellKey(cellOf(z.x), cellOf(z.z)));
    if (sc && sc.type === 'spike') { z.spikeT -= dt; z.slow = 0.3; if (z.spikeT <= 0) { z.spikeT = 0.5; hurtZombie(z, BUILD.spike.dmg[sc.tier]); damageStructure(sc, def.boss ? 15 : 2, null); } }
    z.slow -= dt;
    z.groanT -= dt; if (z.groanT <= 0) { z.groanT = rand(6, 14); if (dist2(z.x, z.z, P.x, P.z) < 300) G.sound.play('groan'); }
    // separation
    for (const o of G.zombies) { if (o === z || o.dead) continue; const dx = z.x - o.x, dz = z.z - o.z, m = (r + 0.35 * o.def.size) * 0.9, dd = dx * dx + dz * dz; if (dd < m * m && dd > 1e-5) { const d = Math.sqrt(dd), push = (m - d) * 0.5; if (!blocksAt(z.x + dx / d * push, z.z + dz / d * push, r)) { z.x += dx / d * push; z.z += dz / d * push; } } }
    z.c.root.position.set(z.x, 0, z.z); z.c.root.rotation.y = z.yaw || 0;
    animChar(z.c, moving, z.t * (def.speed * 2.2), true);
    if (z.lunge > 0) { z.lunge -= dt; z.c.body.rotation.x = -Math.sin(z.lunge / 0.25 * Math.PI) * 0.35; }
    z.plate.visible = z.bar.visible || def.boss || dist2(z.x, z.z, P.x, P.z) < 180;
    if (z.hitT > 0) z.hitT -= dt;
  }
  if (G.zombies.some(z => z.dead)) G.zombies = G.zombies.filter(z => !z.dead);
}
function hurtPlayer(d) {
  const P = G.player; if (P.dead || G.run.over) return; P.hp -= d; P.hurtT = 0; G.hurtFlash = 0.5; G.sound.play('hurt'); G.pad.rumble(0.6, 140);
  if (P.hp <= 0) { P.hp = 0; P.dead = true; P.respawn = 5; G.player.c.root.visible = false; banner('YOU GOT CHOPPED', 'Respawning at your Gold Stash…', 'bad', 3); }
  updateHUD();
}

/* ---------- Towers / mines ---------- */
function updateStructures(dt) {
  const night = G.run.phase === 'night';
  for (const s of G.structs) {
    s.t += dt; s.cd -= dt;
    if (s.hitT > 0) { s.hitT -= dt; s.mesh.position.x = s.x + Math.sin(s.t * 80) * 0.05; } else s.mesh.position.x = s.x;
    if (s.type === 'mine') { if (s.mesh.userData.wheel) s.mesh.userData.wheel.rotation.z += dt * 2; if (s.cd <= 0) { s.cd = 4; addRes('gold', BUILD.mine.gold[s.tier], { x: s.x, y: 3, z: s.z }); } continue; }
    if (s.type !== 'arrow' && s.type !== 'cannon') continue;
    const B = BUILD[s.type], range = B.range[s.tier]; let tgt = null, bd = range * range;
    for (const z of G.zombies) { if (z.dead) continue; const d = dist2(s.x, s.z, z.x, z.z); if (d < bd) { bd = d; tgt = z; } }
    const tur = s.mesh.userData.turret;
    if (tgt) {
      const want = Math.atan2(-(tgt.x - s.x), -(tgt.z - s.z)) - s.mesh.rotation.y; tur.rotation.y = want;
      if (s.cd <= 0) {
        s.cd = B.rate[s.tier];
        const y0 = s.type === 'arrow' ? 2.95 : 2.0, start = new THREE.Vector3(s.x, y0, s.z);
        if (s.type === 'arrow') { const dir = new THREE.Vector3(tgt.x - s.x, 1 * tgt.def.size - y0, tgt.z - s.z).normalize(); const p = spawnProj('arrow', start, dir.multiplyScalar(30), B.dmg[s.tier], 'tower'); p.homing = tgt; G.sound.play('arrow'); }
        else { const p = spawnProj('shell', start, new THREE.Vector3(), B.dmg[s.tier], 'tower'); p.from = start.clone(); p.to = new THREE.Vector3(tgt.x, 0.2, tgt.z); p.flight = 0.75; p.ft = 0; G.sound.play('cannon'); burst(s.x, 2.2, s.z, 0x9e9e9e, 4); }
      }
    } else if (night === false) tur.rotation.y += dt * 0.3;
  }
}

/* ---------- Projectiles ---------- */
const PROJ_LOOK = {
  arrow: () => { const g = new THREE.Group(); const m = box(0.06, 0.06, 0.8, lam(0x8d6e63), 0, 0, 0, g, false); box(0.12, 0.12, 0.14, lam(0xeeeeee), 0, 0, 0.36, g, false); return g; },
  bolt_x: () => { const g = new THREE.Group(); box(0.07, 0.07, 0.7, lam(0xcfd8dc), 0, 0, 0, g, false); box(0.1, 0.1, 0.12, basic(0xff3dbb), 0, 0, -0.35, g, false); return g; },
  bolt: () => { const g = new THREE.Group(); box(0.12, 0.12, 0.9, basic(0xff3dbb), 0, 0, 0, g, false); box(0.2, 0.2, 0.3, basic(0xffffff, { transparent: true, opacity: 0.6 }), 0, 0, -0.3, g, false); return g; },
  shell: () => { const g = new THREE.Group(); mesh(geoSphere(0.28, 8), lam(0x212121), 0, 0, 0, g, false); return g; },
  orb: () => { const g = new THREE.Group(); mesh(geoSphere(0.5, 10), basic(0x35e7ff), 0, 0, 0, g, false); mesh(geoSphere(0.75, 10), basic(0xff3dbb, { transparent: true, opacity: 0.35 }), 0, 0, 0, g, false); return g; }
};
function spawnProj(kind, pos, vel, dmg, owner) {
  const m = PROJ_LOOK[kind](); m.position.copy(pos); G.scene.add(m);
  const p = { kind, mesh: m, pos: pos.clone(), vel, dmg, owner, life: kind === 'orb' ? 4 : 2.2 }; G.projs.push(p); return p;
}
function updateProjs(dt) {
  for (const p of G.projs) {
    p.life -= dt; if (p.life <= 0) { p.dead = true; continue; }
    if (p.kind === 'shell') {
      p.ft += dt; const k = Math.min(1, p.ft / p.flight); p.pos.lerpVectors(p.from, p.to, k); p.pos.y += Math.sin(k * Math.PI) * 4;
      if (k >= 1) { explode(p.to.x, p.to.z, BUILD.cannon.splash, p.dmg); p.dead = true; }
    } else {
      if (p.homing && p.homing.dead) p.homing = null;
      if (p.homing) {
        const h = p.homing, P = G.player, tx = h.player ? P.x : h.x, tz = h.player ? P.z : h.z, ty = h.player ? P.y + 1 : h.def ? h.def.size : 1.4;
        const sp = p.vel.length(), dir = new THREE.Vector3(tx - p.pos.x, ty - p.pos.y, tz - p.pos.z).normalize(); p.vel.copy(dir.multiplyScalar(sp));
      }
      p.pos.addScaledVector(p.vel, dt); if (p.kind !== 'orb' && p.kind !== 'bolt') p.vel.y -= 2 * dt;
      if (p.pos.y < 0.05) { p.dead = true; if (p.kind === 'bolt') burst(p.pos.x, 0.1, p.pos.z, 0xff3dbb, 4); continue; }
      if (p.owner === 'boss') {
        const P = G.player;
        if (!P.dead && dist2(p.pos.x, p.pos.z, P.x, P.z) < 0.8 && Math.abs(p.pos.y - (P.y + 1)) < 1.4) { hurtPlayer(p.dmg * 0.4); explodeFx(p.pos.x, p.pos.z, 0x35e7ff); p.dead = true; continue; }
        const s = structAt(p.pos.x, p.pos.z); if (s && p.pos.y < 3.2) { damageStructure(s, p.dmg, null); explodeFx(p.pos.x, p.pos.z, 0x35e7ff); p.dead = true; G.sound.play('boom'); }
        continue;
      }
      if (p.owner === 'player') { const s = structAt(p.pos.x, p.pos.z); if (s && s.type !== 'spike' && p.pos.y < 1.9) { p.dead = true; burst(p.pos.x, p.pos.y, p.pos.z, 0xcfd8dc, 3); continue; } }
      for (const z of G.zombies) {
        if (z.dead) continue; const rr = 0.45 * z.def.size + 0.15;
        if (dist2(p.pos.x, p.pos.z, z.x, z.z) < rr * rr && p.pos.y < 2.1 * z.def.size + 0.2) { hurtZombie(z, p.dmg, p.pos.x - p.vel.x, p.pos.z - p.vel.z); p.dead = true; if (p.owner === 'player') G.sound.play('hit'); break; }
      }
    }
    p.mesh.position.copy(p.pos); if (p.kind !== 'shell' && p.kind !== 'orb') p.mesh.lookAt(p.pos.x + p.vel.x, p.pos.y + p.vel.y, p.pos.z + p.vel.z);
  }
  if (G.projs.some(p => p.dead)) { G.projs = G.projs.filter(p => { if (p.dead) G.scene.remove(p.mesh); return !p.dead; }); }
}
function explode(x, z, r, dmg) {
  for (const zb of G.zombies) { if (zb.dead) continue; const d = Math.hypot(zb.x - x, zb.z - z); if (d < r + 0.3 * zb.def.size) hurtZombie(zb, dmg * (1 - d / (r * 2)), x, z); }
  explodeFx(x, z, 0xff9100); G.sound.play('boom'); if (dist2(x, z, G.player.x, G.player.z) < 120) G.shake = Math.max(G.shake, 0.25);
}
function explodeFx(x, z, color) { burst(x, 0.6, z, color, 16, 6); burst(x, 0.6, z, 0x424242, 8, 3); }

/* ---------- Particles (pooled) + floating popups ---------- */
function burst(x, y, z, color, n = 8, spd = 4) {
  if (G.qual === QUALITY.Low) n = Math.ceil(n / 2);
  for (let i = 0; i < n; i++) {
    let p = G.parts.find(q => q.dead);
    if (!p) { if (G.parts.length > 220) return; p = { m: new THREE.Mesh(geoBox(0.16, 0.16, 0.16), basic(0xffffff)) }; G.scene.add(p.m); G.parts.push(p); }
    p.m.material = basic(color); p.m.visible = true; p.m.position.set(x, y, z); p.m.scale.setScalar(rand(0.6, 1.3));
    p.v = [rand(-1, 1) * spd, rand(0.5, 1.6) * spd, rand(-1, 1) * spd]; p.t = 0; p.life = rand(0.45, 0.9); p.dead = false;
  }
}
function updateParts(dt) {
  for (const p of G.parts) {
    if (p.dead) continue; p.t += dt; p.v[1] -= 14 * dt;
    p.m.position.x += p.v[0] * dt; p.m.position.y = Math.max(0.08, p.m.position.y + p.v[1] * dt); p.m.position.z += p.v[2] * dt;
    p.m.rotation.x += dt * 6; p.m.rotation.y += dt * 5; if (p.t > p.life) { p.dead = true; p.m.visible = false; }
  }
}
const _v = { x: 0 };
function popup(text, x, y, z, color = '#fff', small) {
  if (!G.popLayer) return; if (G.pops.length > 26) { const o = G.pops.shift(); o.el.remove(); }
  const el = document.createElement('div'); el.className = 'zr-pop' + (small ? ' sm' : ''); el.textContent = text; el.style.color = color; G.popLayer.append(el);
  G.pops.push({ el, x, y, z, t: 0 });
}
function updatePops(dt) {
  const v = G.tmpV, w = G.vw, h = G.vh;
  G.pops = G.pops.filter(p => {
    p.t += dt; if (p.t > 1.1) { p.el.remove(); return false; }
    v.set(p.x, p.y + p.t * 1.2, p.z).project(G.camera);
    if (v.z > 1) { p.el.style.display = 'none'; return true; }
    p.el.style.display = ''; p.el.style.transform = `translate(${(v.x * 0.5 + 0.5) * w}px,${(-v.y * 0.5 + 0.5) * h}px) translate(-50%,-50%) scale(${p.t < 0.12 ? 0.6 + p.t * 3.4 : 1})`; p.el.style.opacity = String(p.t > 0.75 ? (1.1 - p.t) / 0.35 : 1);
    return true;
  });
}
/* ---------- Day / night + waves ---------- */
function waveCount(w) { return Math.round(5 + w * 3.2); }
function waveMix(w) { const m = ['walker', 'walker', 'walker']; if (w >= 2) m.push('sprinter', 'sprinter'); if (w >= 3) m.push('phantom'); if (w >= 4) m.push('tank'); if (w >= 7) m.push('sprinter', 'phantom', 'tank'); return m; }
function startNight() {
  const R = G.run; R.phase = 'night'; R.timer = NIGHT_LEN; R.wave++;
  G.spawnQ = waveCount(R.wave); G.spawnT = 1;
  const b = bossFor(R.wave);
  banner(`WAVE ${R.wave} INCOMING!`, b ? `⚠️ BOSS: ${ZOMBIES[b].name}` : `${G.spawnQ} zombies are coming for your Gold Stash`, 'night', 3.5);
  G.sound.play(b ? 'boss' : 'night'); G.pad.rumble(0.5, 300);
  if (b) { const a = Math.random() * Math.PI * 2; spawnZombie(b, Math.cos(a) * (MAP_R - 2), Math.sin(a) * (MAP_R - 2)); }
  setObjective(); updateHUD(true);
}
function endNight() {
  const R = G.run; R.nightsSurvived = R.wave;
  for (const z of G.zombies) { burst(z.x, 1, z.z, 0xffb300, 6); G.scene.remove(z.c.root); z.dead = true; }
  G.zombies = []; G.spawnQ = 0;
  const bonus = 20 + R.wave * 10; addRes('gold', bonus, null, true); R.score += R.wave * 100;
  const got = awardTokens(10, 'Zomb.io night survived'); R.tokens += got; G.stats.tokensEarned += got;
  if (R.wave > G.stats.bestWave) G.stats.bestWave = R.wave; saveJSON(STATS_KEY, G.stats);
  R.phase = 'day'; R.timer = DAY_LEN;
  banner(`NIGHT ${R.wave} SURVIVED!`, `+${bonus} Gold · +${R.wave * 100} Score${got ? ` · +${got} Arcade Tokens 🎟️` : ' · Daily token cap reached'}`, 'day', 4);
  G.sound.play(got ? 'token' : 'day'); setObjective(); updateHUD(true);
}
function updatePhase(dt) {
  const R = G.run; if (R.phase === 'setup' || R.over) return;
  if (R.phase === 'night' && G.boss && R.timer <= 0) R.timer = 0; else R.timer -= dt;
  if (R.phase === 'day' && R.timer <= 0) startNight();
  else if (R.phase === 'night') {
    if (G.spawnQ > 0) { G.spawnT -= dt; if (G.spawnT <= 0 && G.zombies.length < 70) { G.spawnT = Math.max(0.35, 2.2 - R.wave * 0.12); const n = Math.min(G.spawnQ, 1 + Math.floor(R.wave / 4)); const a = Math.random() * Math.PI * 2; for (let i = 0; i < n; i++) spawnZombie(pick(waveMix(R.wave)), Math.cos(a + i * 0.08) * (MAP_R - 1), Math.sin(a + i * 0.08) * (MAP_R - 1)); G.spawnQ -= n; } }
    if (R.timer <= 0 && !G.boss) endNight();
  }
}
function updateSky(dt) {
  const R = G.run, night = R && R.phase === 'night', dusk = R && R.phase === 'day' && R.timer < 8 ? (8 - R.timer) / 8 : 0;
  const target = night ? 0 : 1 - dusk * 0.45;
  G.dayness = lerp(G.dayness, target, Math.min(1, dt * 1.2));
  const d = G.dayness, sky = G.tmpC.setHex(0x1a0f3d).lerp(G.tmpC2.setHex(0x8fd6ff), d);
  if (d < 0.75 && d > 0.3) sky.lerp(G.tmpC2.setHex(0xff8a65), (1 - Math.abs(d - 0.55) / 0.25) * 0.25 * (night ? 0 : 1));
  G.scene.background.copy(sky); G.scene.fog.color.copy(sky);
  G.sun.intensity = lerp(0.35, 1.6, d); G.sun.color.setHex(d > 0.5 ? 0xfff3d6 : 0xa9b4ff);
  G.hemi.intensity = lerp(0.42, 0.85, d); G.hemi.color.setHex(d > 0.5 ? 0xdff4ff : 0x8a7dff); G.hemi.groundColor.setHex(d > 0.5 ? 0x5c8a3a : 0x2b1b4f);
  G.stars.material.opacity = clamp(1 - d * 1.6, 0, 1); G.moon.visible = d < 0.6;
  const st = stash(); G.stashLight.intensity = st ? lerp(3.2, 0, d) : 0;
  G.lantern.intensity = lerp(1.6, 0, d); G.lantern.position.set(G.player.x, G.player.y + 2.6, G.player.z);
}

/* ---------- AI Survivor squad ---------- */
function hireBot(type) {
  const R = G.run, D = SQUAD[type];
  if (R.squad.length >= MAX_SQUAD) { toast(`Squad is full (max ${MAX_SQUAD})`, 'warn'); G.sound.play('deny'); return false; }
  if (!pay({ gold: D.price })) { toast(`Need ${D.price} Gold`, 'warn'); G.sound.play('deny'); return false; }
  R.squad.push(type);
  const c = makeChar({ skin: 0xffcc80, shirt: D.color, pants: 0x37474f, eye: 0x111111, cap: D.accent, size: 0.95 });
  const tool = type === 'lumber' ? toolModel('ironAxe') : type === 'archer' ? toolModel('crossbow') : (() => { const g = new THREE.Group(); box(0.07, 0.55, 0.07, lam(0x90a4ae), 0, 0.15, 0, g); box(0.2, 0.12, 0.12, basic(0x35e7ff), 0, 0.45, 0, g, false); return g; })();
  tool.rotation.x = -1.2; c.hand.add(tool); c.holding = true;
  const st = stash(), sx = st ? st.x : G.player.x, sz = st ? st.z : G.player.z;
  const plate = labelSprite(D.name, '#9ff3ff', 'rgba(6,30,48,.8)', 0.7); plate.position.y = 2.45; c.root.add(plate);
  const b = { type, c, x: sx + rand(-2, 2), z: sz + 2.5, yaw: 0, t: 0, cd: 0, ang: Math.random() * 6, work: 0 };
  c.root.position.set(b.x, 0, b.z); G.scene.add(c.root); G.bots.push(b);
  G.sound.play('buy'); toast(`${D.icon} ${D.name} joined your squad!`, 'good'); return true;
}
function botWalk(b, tx, tz, dt, sp = 3.2, stop = 0.6) {
  const dx = tx - b.x, dz = tz - b.z, d = Math.hypot(dx, dz); if (d < stop) return true;
  const s = Math.min(d, sp * dt); b.x += dx / d * s; b.z += dz / d * s; b.yaw = Math.atan2(-dx, -dz); b.moving = 1; return false;
}
function updateBots(dt) {
  const st = stash(), R = G.run, P = G.player;
  for (const b of G.bots) {
    b.t += dt; b.cd -= dt; b.moving = 0; const hx = st ? st.x : P.x, hz = st ? st.z : P.z;
    if (b.type === 'lumber') {
      if (R.phase !== 'night') {
        if (!b.node || dist2(b.node.x, b.node.z, hx, hz) > 26 * 26) { let best = null, bd = 1e9; for (const n of G.nodes) { if (n.kind === 'gold') continue; const d = dist2(n.x, n.z, hx, hz) + Math.random() * 30; if (d < bd) { bd = d; best = n; } } b.node = best; }
        if (b.node) {
          const n = b.node, dx = b.x - n.x, dz = b.z - n.z, d = Math.hypot(dx, dz) || 1;
          if (botWalk(b, n.x + dx / d * (n.r + 0.8), n.z + dz / d * (n.r + 0.8), dt, 3.4, 0.3)) {
            b.yaw = Math.atan2(-(n.x - b.x), -(n.z - b.z));
            if (b.cd <= 0) { b.cd = 1.4; b.swing = 0.35; n.shake = 0.2; const k = n.kind === 'tree' ? 'wood' : 'stone'; addRes(k, 4, { x: n.x, y: 2.3, z: n.z }); burst(n.x, 1.2, n.z, n.kind === 'tree' ? 0x8d5a2b : 0x9e9e9e, 3); b.work++; if (b.work % 6 === 0) b.node = null; }
          }
        }
      } else botWalk(b, hx + 2.6, hz - 1.5, dt);
    } else if (b.type === 'archer') {
      let tgt = null, bd = 14 * 14; for (const z of G.zombies) { if (z.dead) continue; const d = dist2(b.x, b.z, z.x, z.z); if (d < bd) { bd = d; tgt = z; } }
      if (tgt) {
        b.yaw = Math.atan2(-(tgt.x - b.x), -(tgt.z - b.z));
        if (b.cd <= 0) { b.cd = 0.9; const start = new THREE.Vector3(b.x, 1.4, b.z), dir = new THREE.Vector3(tgt.x - b.x, tgt.def.size - 1.4, tgt.z - b.z).normalize(); const p = spawnProj('arrow', start, dir.multiplyScalar(30), 16 + R.wave, 'tower'); p.homing = tgt; G.sound.play('arrow'); }
      } else { b.ang += dt * 0.35; botWalk(b, hx + Math.cos(b.ang) * 4.5, hz + Math.sin(b.ang) * 4.5, dt, 2.4, 0.2); }
    } else if (b.type === 'mechanic') {
      if (!b.fix || b.fix.hp <= 0 || b.fix.hp >= b.fix.max || !G.structs.includes(b.fix)) { b.fix = null; let worst = 0.97; for (const s of G.structs) { const f = s.hp / s.max; if (f < worst) { worst = f; b.fix = s; } } }
      if (b.fix) {
        const s = b.fix, dx = b.x - s.x, dz = b.z - s.z, d = Math.hypot(dx, dz) || 1;
        if (botWalk(b, s.x + dx / d * 1.6, s.z + dz / d * 1.6, dt, 4.2, 0.3)) {
          b.yaw = Math.atan2(-(s.x - b.x), -(s.z - b.z)); s.hp = Math.min(s.max, s.hp + (25 + s.max * 0.03) * dt); setHp(s.bar, s.hp / s.max); if (s.hp >= s.max) s.bar.visible = s.type === 'stash';
          if (b.cd <= 0) { b.cd = 0.3; b.swing = 0.25; burst(lerp(b.x, s.x, 0.6), 1.2, lerp(b.z, s.z, 0.6), 0x35e7ff, 2, 2); G.sound.play('repair'); }
          if (s.type === 'stash') updateHUD();
        }
      } else botWalk(b, hx - 2.6, hz + 1.8, dt);
    }
    b.c.root.position.set(b.x, 0, b.z); b.c.root.rotation.y = b.yaw;
    animChar(b.c, b.moving, b.t * 8, false);
    if (b.swing > 0) { b.swing -= dt; b.c.armR.rotation.x = -0.5 - Math.sin((b.swing / 0.35) * Math.PI) * 1.6; } else b.c.armR.rotation.x = -0.5;
  }
}

/* ---------- Player + camera ---------- */
function updatePlayer(dt) {
  const P = G.player, I = G.input, R = G.run;
  if (P.dead) {
    P.respawn -= dt;
    if (P.respawn <= 0) { const st = stash(); P.x = (st ? st.x : 0) + 2.2; P.z = (st ? st.z : 0) + 2.2; pushFromNodes(P, 0.4); while (blocksAt(P.x, P.z, 0.4)) P.z += 1; P.hp = P.maxHp; P.dead = false; P.c.root.visible = true; toast('Back in the fight!', 'good'); updateHUD(); }
    return;
  }
  P.cool -= dt; P.hurtT += dt; if (P.hurtT > 4 && P.hp < P.maxHp) { P.hp = Math.min(P.maxHp, P.hp + 6 * dt); G.hudDirty = true; }
  // movement relative to camera yaw
  let mx = I.mx, mz = I.mz; const m = Math.hypot(mx, mz); if (m > 1) { mx /= m; mz /= m; }
  const sp = (I.sprint ? 7.2 : 5.4) * dt, fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
  const dx = (fx * -mz + rx * mx) * sp, dz = (fz * -mz + rz * mx) * sp;
  moveWithCollide(P, dx, dz, 0.4);
  P.vy -= 20 * dt; P.y += P.vy * dt; if (P.y <= 0) { P.y = 0; P.vy = 0; P.ground = true; }
  // standing on top of a structure isn't supported: keep simple ground physics
  const moving = Math.min(1, Math.hypot(dx, dz) / (5.4 * dt + 1e-6));
  P.walkT = (P.walkT || 0) + dt * 9 * moving; P.moving = moving;
  P.c.root.position.set(P.x, P.y, P.z); P.c.root.rotation.y = P.yaw;
  animChar(P.c, P.ground ? moving : 0.3, P.walkT, false);
  if (P.c.swinging > 0) { P.c.swinging -= dt; P.c.armR.rotation.x = -0.4 - Math.sin((P.c.swinging / 0.35) * Math.PI) * 1.8; } else if (P.c.holding) P.c.armR.rotation.x = currentTool().kind === 'ranged' ? -1.4 - P.pitch : -0.5;
  for (const n of G.nodes) if (n.shake > 0) { n.shake -= dt; n.mesh.rotation.z = Math.sin(n.shake * 60) * 0.05; } else if (n.mesh.rotation.z) n.mesh.rotation.z = 0;
}
function equipVisual() {
  const P = G.player; if (!P || !G.run) return; const t = currentTool();
  P.c.hand.clear(); G.vmTool.clear();
  const id = t.kind === 'build' ? 'blueprint' : t.kind === 'hammer' ? 'hammer' : t.id;
  const m = toolModel(id); m.rotation.x = -1.3; m.position.set(0, -0.05, -0.1); P.c.hand.add(m); P.c.holding = true;
  const v = toolModel(id, true); if (t.kind === 'ranged') { v.rotation.set(0, 0, 0); v.position.set(0, -0.08, 0); } else { v.rotation.set(-0.35, 0.25, -0.15); }
  G.vmTool.add(v); G.vmRanged = t.kind === 'ranged';
}
function updateCamera(dt) {
  const P = G.player, cam = G.camera; G.camBlend = lerp(G.camBlend, G.camMode === 'first' ? 1 : 0, Math.min(1, dt * 10));
  const b = G.camBlend, cp = Math.cos(P.pitch), fx = -Math.sin(P.yaw) * cp, fy = Math.sin(P.pitch), fz = -Math.cos(P.yaw) * cp;
  const eye = G.tmpV.set(P.x, P.y + 1.62, P.z);
  // third-person: over the right shoulder, pulled back along the look direction
  const rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw), dist = 4.6;
  let tx = P.x - fx * dist + rx * 0.95, ty = P.y + 1.9 - fy * dist * 0.85 + 0.35, tz = P.z - fz * dist + rz * 0.95;
  // keep the camera from clipping into walls behind the player
  for (let k = 1; k <= 6; k++) { const f = k / 6, x = lerp(P.x, tx, f), z = lerp(P.z, tz, f), y = lerp(P.y + 1.8, ty, f); const s = structAt(x, z), nd = G.nodes.find(n => !n.dead && dist2(n.x, n.z, x, z) < (n.kind === 'tree' ? 2.6 : 1.8) && y < (n.kind === 'tree' ? 5.5 : 2.2)); if (nd || (s && y < (s.type === 'arrow' ? 3 : 2.1))) { tx = lerp(P.x, tx, (k - 1) / 6 + 0.02); tz = lerp(P.z, tz, (k - 1) / 6 + 0.02); ty = Math.max(ty, P.y + 2.2); break; } }
  ty = Math.max(0.4, ty);
  cam.position.set(lerp(tx, eye.x, b), lerp(ty, eye.y, b), lerp(tz, eye.z, b));
  if (G.shake > 0) { G.shake -= dt; cam.position.x += rand(-1, 1) * G.shake * 0.3; cam.position.y += rand(-1, 1) * G.shake * 0.3; }
  const lx = lerp(P.x + fx * 30 + rx * 0.6, eye.x + fx * 10, b), ly = lerp(P.y + 1.6 + fy * 30, eye.y + fy * 10, b), lz = lerp(P.z + fz * 30 + rz * 0.6, eye.z + fz * 10, b);
  cam.lookAt(lx, ly, lz);
  // first-person: hide head, show the viewmodel; third-person: show full avatar
  const fp = b > 0.55; P.c.head.visible = !fp; P.c.body.visible = !P.dead && !fp; G.vm.visible = fp && !P.dead;
  if (G.vm.visible) {
    G.vmSwing = Math.max(0, (G.vmSwing || 0) - dt * 3.2); G.vmKick = Math.max(0, (G.vmKick || 0) - dt * 6);
    const s = Math.sin(G.vmSwing * Math.PI), bob = Math.sin(P.walkT || 0) * 0.025 * (P.moving || 0);
    G.vm.position.set(0.36 + bob, -0.36 + Math.abs(bob) - G.vmKick * 0.05, -0.62 + G.vmKick * 0.12);
    G.vm.rotation.set(G.vmRanged ? 0 : -s * 1.3, G.vmRanged ? 0 : s * 0.4, G.vmRanged ? 0 : -s * 0.4);
  }
}
/* ---------- DOM UI ---------- */
const $ = (s, r) => (r || G.root).querySelector(s);
const $$ = (s, r) => [...(r || G.root).querySelectorAll(s)];
function buildUI(area) {
  area.innerHTML = '';
  const root = document.createElement('div'); root.className = 'zr-root'; root.tabIndex = -1;
  root.innerHTML = `
  <canvas class="zr-canvas"></canvas>
  <div class="zr-hurt"></div>
  <div class="zr-pops"></div>
  <div class="zr-cross" aria-hidden="true"><i></i></div>
  <div class="zr-hud" data-hud hidden>
    <div class="zr-top">
      <div class="zr-left">
        <div class="zr-bar zr-hp"><span class="zr-bar-ico">❤️</span><div class="zr-bar-track"><div class="zr-bar-fill" data-hpfill></div></div><b data-hptext>100</b></div>
        <div class="zr-bar zr-stashbar"><span class="zr-bar-ico">💰</span><div class="zr-bar-track"><div class="zr-bar-fill gold" data-stfill></div></div><b data-sttext>—</b></div>
        <div class="zr-res"><span class="r wood">🪵 <b data-r="wood">0</b></span><span class="r stone">🪨 <b data-r="stone">0</b></span><span class="r gold">🪙 <b data-r="gold">0</b></span></div>
      </div>
      <div class="zr-clock" data-clock><div class="zr-phase" data-phase>DAY 1</div><div class="zr-timer" data-timer>1:00</div><div class="zr-wave" data-wave>Wave 0 · Score 0</div></div>
      <div class="zr-right">
        <button class="zr-chip" data-act="cam" title="Toggle camera (V)"><span data-cambadge>3rd Person</span> <kbd data-k="cam">V</kbd></button>
        <button class="zr-chip" data-act="shop" title="Shop (B)">🛒 Shop <kbd data-k="shop">B</kbd></button>
        <button class="zr-chip icon" data-act="fs" title="Fullscreen (F11)" aria-label="Fullscreen">⛶</button>
        <button class="zr-chip icon" data-act="pause" title="Pause (Esc)" aria-label="Pause">⚙️</button>
      </div>
    </div>
    <div class="zr-boss" data-boss hidden><div class="zr-boss-name" data-bossname></div><div class="zr-boss-track"><div class="zr-boss-fill" data-bossfill></div></div></div>
    <div class="zr-obj" data-obj></div>
    <div class="zr-prompt" data-prompt hidden></div>
    <div class="zr-hotbar" data-hotbar></div>
    <div class="zr-tokens">🎟️ <b data-tokens>0</b></div>
  </div>
  <div class="zr-banner" data-banner hidden><div class="t" data-bt></div><div class="s" data-bs></div></div>
  <div class="zr-toasts" data-toasts></div>
  <div class="zr-touch" data-touch hidden>
    <div class="zr-stick" data-stick><div class="zr-knob" data-knob></div></div>
    <div class="zr-look" data-look></div>
    <div class="zr-tbtns">
      <button data-t="fire" class="big">⚔️<small>USE</small></button>
      <button data-t="jump" class="big">⤒<small>JUMP</small></button>
      <button data-t="act">🔨<small>FIX</small></button>
      <button data-t="rot">⟳<small>ROTATE</small></button>
      <button data-t="shop">🛒<small>SHOP</small></button>
      <button data-t="cam">🎥<small>CAM</small></button>
    </div>
  </div>
  <div class="zr-screen" data-screen hidden></div>`;
  area.append(root); return root;
}
function bindTxt(a) {
  const pad = G.inputMode === 'pad', touch = G.inputMode === 'touch', L = i => `<kbd class="pad">${G.pad.label(i)}</kbd>`;
  const map = {
    primary: pad ? L(PAD.RT) : touch ? '<kbd>USE</kbd>' : '<kbd>Click</kbd>', act: pad ? L(PAD.LT) : touch ? '<kbd>FIX</kbd>' : '<kbd>E</kbd>',
    rotate: pad ? L(PAD.X) : touch ? '<kbd>ROTATE</kbd>' : '<kbd>R</kbd>', demolish: pad ? L(PAD.X) : '<kbd>Q</kbd>', shop: pad ? L(PAD.Y) : '<kbd>B</kbd>',
    cam: pad ? L(PAD.R3) : '<kbd>V</kbd>', jump: pad ? L(PAD.A) : '<kbd>Space</kbd>', cycle: pad ? L(PAD.LB) + L(PAD.RB) : '<kbd>1–8</kbd>', cancel: pad ? L(PAD.B) : '<kbd>Esc</kbd>'
  };
  return map[a] || '';
}
function updateHUD(full) {
  if (!G.run) return; G.hudDirty = false; const R = G.run, P = G.player, st = stash();
  $('[data-hpfill]').style.width = (P.hp / P.maxHp * 100) + '%'; $('[data-hptext]').textContent = Math.ceil(P.hp);
  $('[data-stfill]').style.width = st ? (Math.max(0, st.hp) / st.max * 100) + '%' : '0%'; $('[data-sttext]').textContent = st ? `T${st.tier} · ${fmt(Math.max(0, Math.ceil(st.hp)))}` : 'Not placed';
  for (const k of ['wood', 'stone', 'gold']) $(`[data-r="${k}"]`).textContent = fmt(R.res[k]);
  const ph = R.phase, t = Math.max(0, Math.ceil(R.timer));
  $('[data-phase]').textContent = ph === 'setup' ? 'SETUP' : ph === 'day' ? `☀️ DAY ${R.wave + 1}` : `🌙 NIGHT ${R.wave}`;
  $('[data-timer]').textContent = ph === 'setup' ? 'Place Stash' : (G.boss && ph === 'night' && R.timer <= 0) ? 'BOSS!' : `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
  $('[data-wave]').textContent = `Wave ${R.wave} · Score ${fmt(R.score)}`;
  $('[data-clock]').className = 'zr-clock ' + ph;
  $('[data-tokens]').textContent = fmt(tokenBalance());
  if (full) {
    $('[data-cambadge]').textContent = G.camMode === 'first' ? '1st Person' : '3rd Person';
    $$('[data-k]').forEach(k => { const a = k.dataset.k; k.textContent = G.inputMode === 'pad' ? G.pad.label(a === 'cam' ? PAD.R3 : PAD.Y) : a === 'cam' ? 'V' : 'B'; k.classList.toggle('pad', G.inputMode === 'pad'); });
    refreshHotbar();
  }
}
function refreshHotbar() {
  if (!G.run) return; const R = G.run;
  $('[data-hotbar]').innerHTML = HOTBAR.map((h, i) => {
    let name = h.name, icon = h.icon, sub = '', lock = false;
    if (h.kind === 'melee') { const w = WEAPONS[R.melee]; name = w.name; icon = w.icon; }
    if (h.kind === 'ranged') { if (R.ranged) { name = WEAPONS[R.ranged].name; icon = WEAPONS[R.ranged].icon; } else { lock = true; sub = 'Shop'; } }
    if (h.kind === 'build') { if (R.phase === 'setup') { name = 'Gold Stash'; icon = '💰'; sub = 'Free'; } else { sub = costText(BUILD[h.id].cost); if (!afford(BUILD[h.id].cost)) lock = true; } }
    return `<button class="zr-slot${i === G.slot ? ' on' : ''}${lock ? ' lock' : ''}" data-slot="${i}" title="${esc(name)}"><span class="n">${G.inputMode === 'pad' ? '' : i + 1}</span><span class="i">${icon}</span><span class="l">${esc(name)}</span>${sub ? `<span class="c">${esc(sub)}</span>` : ''}</button>`;
  }).join('') + (G.inputMode === 'pad' ? `<div class="zr-cyc">${bindTxt('cycle')}</div>` : '');
}
function setObjective() {
  if (!G.run) return; const R = G.run, st = stash(); let t;
  if (R.phase === 'setup') t = `💰 Place your <b>Gold Stash</b> — ${bindTxt('primary')}`;
  else if (!G.tut.harvested) t = `⛏️ Hit trees, rocks and gold veins with your Pickaxe — ${bindTxt('primary')}`;
  else if (countType('wall') < 4 && R.wave === 0) t = `🧱 Build <b>walls</b> around your stash (slot 3) · ${bindTxt('rotate')} rotates`;
  else if (countType('arrow') < 1 && R.wave < 2) t = `🏹 Build an <b>Arrow Tower</b> (slot 5) before night`;
  else if (R.phase === 'night') t = G.boss ? `👑 Defeat <b>${esc(G.boss.def.name)}</b>!` : `🧟 Defend your Gold Stash! Zombies left: <b>${G.zombies.length + G.spawnQ}</b>`;
  else if (st && st.tier < 2 && R.wave >= 1) t = `🔨 Upgrade your Gold Stash with the Hammer — ${bindTxt('act')}`;
  else t = `🛒 Spend Gold in the Shop (${bindTxt('shop')}) on weapons and AI squadmates`;
  if (t !== G.lastObj) { G.lastObj = t; $('[data-obj]').innerHTML = t; }
}
let toastId = 0;
function toast(msg, kind = '') {
  if (!G || !G.root) return; const box = $('[data-toasts]'); const el = document.createElement('div'); el.className = 'zr-toast ' + kind; el.textContent = msg; box.append(el);
  while (box.children.length > 4) box.firstChild.remove(); setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 2600);
}
function banner(t, s, kind, secs = 3) {
  const b = $('[data-banner]'); b.hidden = false; b.className = 'zr-banner ' + (kind || ''); $('[data-bt]').textContent = t; $('[data-bs]').textContent = s || '';
  b.style.animation = 'none'; void b.offsetWidth; b.style.animation = ''; clearTimeout(G.bannerT); G.bannerT = setTimeout(() => { b.hidden = true; }, secs * 1000);
}
function bossBar(z) {
  const el = $('[data-boss]'); if (!z) { el.hidden = true; return; }
  el.hidden = false; $('[data-bossname]').textContent = `👑 ${z.def.name}`; $('[data-bossfill]').style.width = (Math.max(0, z.hp) / z.max * 100) + '%';
}
function updatePrompt() {
  const el = $('[data-prompt]'); if (!G.run || G.run.over || G.player.dead || G.screen) { el.hidden = true; return; }
  const tool = currentTool(); let html = '';
  if (tool.kind === 'build') {
    const c = aimGroundCell(), chk = canPlace(tool.type, c.cx, c.cz); G.ghostCell = c; G.ghostOkNow = chk.ok;
    html = chk.ok ? `${bindTxt('primary')} Place <b>${esc(tool.name)}</b> ${tool.type === 'stash' ? '' : '· ' + costText(BUILD[tool.type].cost)} · ${bindTxt('rotate')} Rotate` : `<span class="bad">${esc(chk.why)}</span>`;
  } else {
    const s = aimStruct(4.5);
    G.aimS = s;
    if (s) {
      const name = BUILD[s.type].name;
      if (s.hp < s.max - 0.5) html = `${bindTxt('act')} Repair <b>${esc(name)}</b> · ${costText(repairCost(s))}`;
      else if (s.tier < 4) html = s.tier + 1 > maxTierFor(s) ? `<b>${esc(name)}</b> T${s.tier} · Upgrade Gold Stash to unlock T${s.tier + 1}` : `${bindTxt('act')} Upgrade <b>${esc(name)}</b> → T${s.tier + 1} ${TIERS[s.tier + 1].name} · ${costText(upgradeCost(s.type, s.tier + 1))}`;
      else html = `<b>${esc(name)}</b> · Max tier ✨`;
      if (tool.kind === 'hammer' && s.type !== 'stash') html += ` · ${bindTxt('demolish')} Demolish`;
    }
  }
  if (html !== G.lastPrompt) { G.lastPrompt = html; el.innerHTML = html; }
  el.hidden = !html;
}

/* ---------- Overlay screens: title, shop, pause/settings, how-to, game over ---------- */
function showScreen(kind) {
  G.screen = kind; const el = $('[data-screen]'); el.hidden = !kind; el.className = 'zr-screen ' + (kind || '');
  if (!kind) { el.innerHTML = ''; G.root.classList.remove('menu'); $('[data-hud]').hidden = !G.run; return; }
  G.root.classList.add('menu'); if (document.pointerLockElement) document.exitPointerLock?.();
  el.innerHTML = renderScreen(kind); G.navI = 0; focusNav();
}
function refreshScreen() { if (G.screen) { const i = G.navI; $('[data-screen]').innerHTML = renderScreen(G.screen); G.navI = i; focusNav(); } }
function renderScreen(kind) {
  const S = G.stats;
  if (kind === 'title') return `
    <div class="zr-title">
      <div class="zr-logo"><span>ZOMB</span><span class="io">.io</span><span class="d">3D</span></div>
      <div class="zr-tag">Gather. Build. Survive the night.</div>
      <div class="zr-best"><span>🏆 Best Wave <b>${S.bestWave}</b></span><span>🧟 Zombies <b>${fmt(S.totalKills)}</b></span><span>🎟️ Tokens <b>${fmt(tokenBalance())}</b></span>${S.goldenTrophy ? '<span class="gold">🏆 Golden Trophy</span>' : ''}</div>
      <div class="zr-menu">
        <button class="zr-btn go" data-do="play" data-nav>▶ PLAY</button>
        <button class="zr-btn" data-do="howto" data-nav>🎮 HOW TO PLAY</button>
        <button class="zr-btn" data-do="settings" data-nav>⚙️ SETTINGS</button>
      </div>
      <div class="zr-foot">${G.pad.pad ? `🎮 ${G.pad.brand === 'ps' ? 'PlayStation' : G.pad.brand === 'switch' ? 'Switch' : 'Xbox'} controller ready` : 'Plug in a controller anytime · Survive nights for +10 Arcade Tokens'}</div>
    </div>`;
  if (kind === 'howto') return `
    <div class="zr-panel wide"><div class="zr-ph"><h2>🎮 How to Play</h2><button class="zr-x" data-do="back" data-nav>✕</button></div>
      <div class="zr-how">
        <div><h3>The loop</h3><ol><li><b>Day (60s):</b> place your Gold Stash, chop trees 🪵, mine rocks 🪨 and gold veins 🪙.</li><li>Build walls, spike traps, arrow towers, cannons and gold mines near your stash.</li><li><b>Night (45s):</b> zombies attack. Fight with your towers. Survive for +10 🎟️ Arcade Tokens.</li><li>Every 5th wave brings a <b>boss</b>. Lose your Gold Stash and it’s game over.</li></ol></div>
        <div class="cols"><table><tr><th>Action</th><th>Keyboard</th><th>Controller</th></tr>
          <tr><td>Move / Look</td><td>WASD · Mouse</td><td>Left / Right stick</td></tr>
          <tr><td>Swing / Fire / Place</td><td>Left click</td><td>${G.pad.label(PAD.RT)}</td></tr>
          <tr><td>Repair / Upgrade</td><td>E</td><td>${G.pad.label(PAD.LT)}</td></tr>
          <tr><td>Hotbar</td><td>1–8 · Wheel</td><td>${G.pad.label(PAD.LB)} / ${G.pad.label(PAD.RB)}</td></tr>
          <tr><td>Rotate blueprint</td><td>R</td><td>${G.pad.label(PAD.X)}</td></tr>
          <tr><td>Demolish (Hammer)</td><td>Q</td><td>${G.pad.label(PAD.X)}</td></tr>
          <tr><td>Jump · Sprint</td><td>Space · Shift</td><td>${G.pad.label(PAD.A)} · ${G.pad.label(PAD.L3)}</td></tr>
          <tr><td>Shop</td><td>B</td><td>${G.pad.label(PAD.Y)}</td></tr>
          <tr><td>1st / 3rd person</td><td>V</td><td>${G.pad.label(PAD.R3)} or ↑</td></tr>
          <tr><td>Pause</td><td>Esc</td><td>${G.pad.label(PAD.START)}</td></tr>
          <tr><td>Fullscreen</td><td>F11 · ⛶</td><td>—</td></tr></table></div>
      </div>
      <button class="zr-btn go" data-do="back" data-nav>Got it</button></div>`;
  if (kind === 'settings' || kind === 'pause') {
    const st = G.settings, q = ['Low', 'Medium', 'High'];
    return `<div class="zr-panel"><div class="zr-ph"><h2>${kind === 'pause' ? '⏸️ Paused' : '⚙️ Settings'}</h2><button class="zr-x" data-do="${kind === 'pause' ? 'resume' : 'back'}" data-nav>✕</button></div>
      ${kind === 'pause' ? `<div class="zr-row stats"><span>Wave <b>${G.run.wave}</b></span><span>Score <b>${fmt(G.run.score)}</b></span><span>Kills <b>${G.run.kills}</b></span></div>` : ''}
      <div class="zr-set">
        <label>Look sensitivity <b>${st.sens.toFixed(1)}x</b></label><div class="zr-seg"><button data-do="sens" data-v="-0.2" data-nav>−</button><div class="zr-meter"><i style="width:${(st.sens - 0.2) / 2.8 * 100}%"></i></div><button data-do="sens" data-v="0.2" data-nav>+</button></div>
        <label>Graphics quality</label><div class="zr-seg">${q.map(x => `<button class="${st.quality === x ? 'on' : ''}" data-do="quality" data-v="${x}" data-nav>${x}</button>`).join('')}</div>
        <label>Camera</label><div class="zr-seg"><button class="${G.camMode === 'third' || (!G.run && st.cam !== 'first') ? 'on' : ''}" data-do="camset" data-v="third" data-nav>3rd Person</button><button class="${(G.run ? G.camMode : st.cam) === 'first' ? 'on' : ''}" data-do="camset" data-v="first" data-nav>1st Person</button></div>
        <label>Audio</label><div class="zr-seg"><button class="${st.mute ? '' : 'on'}" data-do="mute" data-v="0" data-nav>🔊 On</button><button class="${st.mute ? 'on' : ''}" data-do="mute" data-v="1" data-nav>🔇 Muted</button></div>
        <label>Invert Y · Rumble</label><div class="zr-seg"><button class="${st.invertY ? 'on' : ''}" data-do="invert" data-nav>Invert Y ${st.invertY ? 'On' : 'Off'}</button><button class="${st.rumble ? 'on' : ''}" data-do="rumble" data-nav>Rumble ${st.rumble ? 'On' : 'Off'}</button></div>
      </div>
      <div class="zr-menu row">${kind === 'pause' ? `<button class="zr-btn go" data-do="resume" data-nav>▶ Resume</button><button class="zr-btn" data-do="howto" data-nav>🎮 Controls</button><button class="zr-btn bad" data-do="quit" data-nav>🏠 Quit run</button>` : `<button class="zr-btn go" data-do="back" data-nav>Done</button>`}</div></div>`;
  }
  if (kind === 'shop') {
    const R = G.run, gold = R.res.gold;
    const wcards = WEAPON_ORDER.filter(id => id !== 'woodPick').map((id, i) => {
      const w = WEAPONS[id], own = R.owned[id], prev = WEAPON_ORDER[WEAPON_ORDER.indexOf(id) - 1], ready = R.owned[prev];
      const btn = own ? '<span class="zr-owned">✓ Owned</span>' : !ready ? `<span class="zr-lockd">🔒 Buy ${esc(WEAPONS[prev].name)} first</span>` : `<button class="zr-buy" data-do="buyW" data-v="${id}" data-nav ${gold >= w.price ? '' : 'disabled'}>🪙 ${w.price}</button>`;
      return `<div class="zr-card ${own ? 'own' : ''}"><div class="ic">${w.icon}</div><b>${esc(w.name)}</b><small>${w.slot === 'pick' ? `Melee · ${w.dmg} dmg · ${w.harvest}x harvest` : `Ranged · ${w.dmg} dmg · ${(1 / w.rate).toFixed(1)} shots/s`}</small>${btn}</div>`;
    }).join('');
    const full = R.squad.length >= MAX_SQUAD;
    const scards = Object.entries(SQUAD).map(([id, d]) => `<div class="zr-card"><div class="ic">${d.icon}</div><b>${esc(d.name)}</b><small>${esc(d.desc)}</small><span class="zr-have">Hired: ${R.squad.filter(x => x === id).length}</span><button class="zr-buy" data-do="hire" data-v="${id}" data-nav ${gold >= d.price && !full ? '' : 'disabled'}>🪙 ${d.price}</button></div>`).join('');
    return `<div class="zr-panel wide shop"><div class="zr-ph"><h2>🛒 Survivor Shop</h2><div class="zr-wallet">🪙 <b>${fmt(gold)}</b> · 🪵 ${fmt(R.res.wood)} · 🪨 ${fmt(R.res.stone)}</div><button class="zr-x" data-do="close" data-nav>✕</button></div>
      <h3>⚔️ Weapons <small>Wood Pickaxe → Iron Axe → Diamond Sword → Rapid Crossbow → Plasma Blaster</small></h3><div class="zr-cards">${wcards}</div>
      <h3>🤖 AI Squadmates <small>${R.squad.length}/${MAX_SQUAD} hired</small></h3><div class="zr-cards">${scards}</div>
      <h3>🧰 Supplies</h3><div class="zr-cards small">
        <div class="zr-card"><div class="ic">🩹</div><b>Med Kit</b><small>Heal to full HP</small><button class="zr-buy" data-do="med" data-nav ${gold >= 15 ? '' : 'disabled'}>🪙 15</button></div>
        <div class="zr-card"><div class="ic">🪵</div><b>Wood Crate</b><small>+60 Wood</small><button class="zr-buy" data-do="crate" data-v="wood" data-nav ${gold >= 25 ? '' : 'disabled'}>🪙 25</button></div>
        <div class="zr-card"><div class="ic">🪨</div><b>Stone Crate</b><small>+60 Stone</small><button class="zr-buy" data-do="crate" data-v="stone" data-nav ${gold >= 25 ? '' : 'disabled'}>🪙 25</button></div>
      </div>
      <div class="zr-foot">${bindTxt('cancel')} or ${bindTxt('shop')} to close · ${G.inputMode === 'pad' ? `${G.pad.label(PAD.A)} to buy` : 'Click to buy'}</div></div>`;
  }
  if (kind === 'over') {
    const R = G.run, best = R.wave >= S.bestWave && R.wave > 0;
    return `<div class="zr-panel over"><div class="zr-ph"><h2>💀 GOLD STASH DESTROYED</h2></div>
      <div class="zr-overgrid">
        <div class="zr-stat"><span>Waves Survived</span><b>${R.nightsSurvived}</b></div>
        <div class="zr-stat"><span>Zombies Eliminated</span><b>${R.kills}</b></div>
        <div class="zr-stat ${best ? 'gold' : ''}"><span>Best Wave Record</span><b>${S.bestWave}${best ? ' 🆕' : ''}</b></div>
        <div class="zr-stat tok"><span>Arcade Tokens Earned</span><b>🎟️ ${R.tokens}</b></div>
        <div class="zr-stat"><span>Score</span><b>${fmt(R.score)}</b></div>
        <div class="zr-stat"><span>Bosses Defeated</span><b>${R.bosses}</b></div>
      </div>
      <div class="zr-menu row"><button class="zr-btn go" data-do="again" data-nav>🔁 Play Again</button><button class="zr-btn" data-do="totitle" data-nav>🏠 Main Menu</button></div></div>`;
  }
  return '';
}
function navEls() { return $$('[data-screen] [data-nav]').filter(b => !b.disabled && b.offsetParent !== null); }
function focusNav() { const els = navEls(); if (!els.length) return; G.navI = clamp(G.navI || 0, 0, els.length - 1); els.forEach((e, i) => e.classList.toggle('pfocus', i === G.navI && G.inputMode === 'pad')); if (G.inputMode === 'pad') els[G.navI].focus({ preventScroll: false }); }
function navMove(dx, dy) {
  const els = navEls(); if (!els.length) return; const cur = els[clamp(G.navI, 0, els.length - 1)], r = cur.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  let best = -1, bs = 1e9;
  els.forEach((e, i) => { if (e === cur) return; const q = e.getBoundingClientRect(), x = q.left + q.width / 2 - cx, y = q.top + q.height / 2 - cy; const along = dx ? x * dx : y * dy, across = dx ? Math.abs(y) : Math.abs(x); if (along <= 4) return; const sc = along + across * 2.2; if (sc < bs) { bs = sc; best = i; } });
  if (best < 0) best = clamp(G.navI + (dx || dy), 0, els.length - 1);
  G.navI = best; G.sound.play('click'); focusNav();
}
function screenAction(d, v, el) {
  const st = G.settings; G.sound.play('click');
  switch (d) {
    case 'play': G.sound.ensure(); showScreen(null); startRun(); lockPointer(); break;
    case 'howto': G.prevScreen = G.screen; showScreen('howto'); break;
    case 'settings': G.prevScreen = G.screen; showScreen('settings'); break;
    case 'back': showScreen(G.prevScreen && G.prevScreen !== G.screen ? G.prevScreen : (G.run && !G.run.over ? 'pause' : 'title')); if (G.screen === 'pause' && !G.run) showScreen('title'); break;
    case 'resume': case 'close': showScreen(null); lockPointer(); break;
    case 'sens': st.sens = clamp(Math.round((st.sens + Number(v)) * 10) / 10, 0.2, 3); saveJSON(SET_KEY, st); refreshScreen(); break;
    case 'quality': st.quality = v; saveJSON(SET_KEY, st); applyQuality(); refreshScreen(); break;
    case 'camset': st.cam = v; if (G.run) G.camMode = v; saveJSON(SET_KEY, st); refreshScreen(); updateHUD(true); break;
    case 'mute': st.mute = v === '1'; saveJSON(SET_KEY, st); refreshScreen(); break;
    case 'invert': st.invertY = !st.invertY; saveJSON(SET_KEY, st); refreshScreen(); break;
    case 'rumble': st.rumble = !st.rumble; saveJSON(SET_KEY, st); if (st.rumble) G.pad.rumble(0.6, 200); refreshScreen(); break;
    case 'quit': G.run.over = true; saveJSON(STATS_KEY, G.stats); toTitle(); break;
    case 'buyW': { const w = WEAPONS[v]; if (pay({ gold: w.price })) { G.run.owned[v] = true; if (w.slot === 'pick') G.run.melee = v; else G.run.ranged = v; G.sound.play('buy'); toast(`${w.icon} ${w.name} equipped!`, 'good'); if (w.slot === 'weapon') G.slot = 1; equipVisual(); refreshHotbar(); } refreshScreen(); break; }
    case 'hire': hireBot(v); refreshScreen(); break;
    case 'med': if (pay({ gold: 15 })) { G.player.hp = G.player.maxHp; G.sound.play('buy'); toast('🩹 Healed to full', 'good'); updateHUD(); } refreshScreen(); break;
    case 'crate': if (pay({ gold: 25 })) { addRes(v, 60); G.sound.play('buy'); } refreshScreen(); break;
    case 'again': clearWorldActors(); showScreen(null); startRun(); lockPointer(); break;
    case 'totitle': toTitle(); break;
  }
}
function openShop() { if (!G.run || G.run.over) return; if (G.screen === 'shop') { showScreen(null); lockPointer(); return; } if (G.screen) return; showScreen('shop'); G.sound.play('click'); }
function togglePause() { if (!G.run || G.run.over) return; if (G.screen === 'pause') { showScreen(null); lockPointer(); } else if (!G.screen) showScreen('pause'); else if (G.screen === 'shop' || G.screen === 'howto' || G.screen === 'settings') { showScreen(G.screen === 'shop' ? null : 'pause'); } }
function gameOver() {
  const R = G.run; if (R.over) return; R.over = true;
  if (R.nightsSurvived > G.stats.bestWave) G.stats.bestWave = R.nightsSurvived; if (R.score > G.stats.bestScore) G.stats.bestScore = R.score; saveJSON(STATS_KEY, G.stats);
  G.sound.play('over'); G.pad.rumble(1, 500); bossBar(null);
  setTimeout(() => { if (G && G.run === R) showScreen('over'); }, 1600);
  banner('GOLD STASH DESTROYED', 'The horde broke through…', 'bad', 1.6);
}
/* ---------- Quality / fullscreen ---------- */
function applyQuality() {
  G.qual = QUALITY[G.settings.quality] || QUALITY.Medium; const q = G.qual;
  G.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2, q.pr * (window.devicePixelRatio || 1)));
  G.renderer.shadowMap.enabled = q.shadows; G.sun.castShadow = q.shadows;
  if (G.sun.shadow.mapSize.x !== q.shadowMap) { G.sun.shadow.mapSize.set(q.shadowMap, q.shadowMap); if (G.sun.shadow.map) { G.sun.shadow.map.dispose(); G.sun.shadow.map = null; } }
  G.scene.fog.far = q.fog; G.scene.fog.near = q.fog * 0.45;
  G.scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
  resize();
}
function isTheater() { return G.root.classList.contains('theater-fullscreen'); }
function setTheater(on) { G.root.classList.toggle('theater-fullscreen', on); document.body.classList.toggle('zr-theater-open', on); setTimeout(resize, 30); }
function toggleFullscreen() {
  const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
  if (fsEl) { (document.exitFullscreen || document.webkitExitFullscreen).call(document)?.catch?.(() => {}); return; }
  if (isTheater()) { setTheater(false); return; }
  const fn = G.root.requestFullscreen || G.root.webkitRequestFullscreen;
  if (!fn || document.fullscreenEnabled === false) { setTheater(true); toast('Theater mode — press F11 or ⛶ to exit'); return; }
  try { const r = fn.call(G.root); if (r && r.catch) r.catch(() => { setTheater(true); toast('Theater mode — press F11 or ⛶ to exit'); }); } catch (e) { setTheater(true); }
}
function resize() {
  if (!G || !G.renderer) return; const c = G.root.getBoundingClientRect(), w = Math.max(1, c.width | 0), h = Math.max(1, c.height | 0);
  G.vw = w; G.vh = h; G.renderer.setSize(w, h, false); G.camera.aspect = w / h; G.camera.updateProjectionMatrix();
}
function lockPointer() {
  if (G.inputMode === 'touch' || G.touchOn) return;
  const c = $('.zr-canvas'); try { const r = c.requestPointerLock && c.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) {}
}
function setInputMode(m) { if (G.inputMode === m) return; G.inputMode = m; G.root.dataset.input = m; updateHUD(true); setObjective(); G.lastPrompt = null; if (G.screen) { refreshScreen(); } }

/* ---------- Input ---------- */
function bindInput() {
  const I = G.input = { mx: 0, mz: 0, fire: false, sprint: false, keys: new Set(), look: [0, 0] }, root = G.root, canvas = $('.zr-canvas'), L = G.listeners = [];
  const on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); L.push([t, ev, fn, o]); };
  const playing = () => G.run && !G.run.over && !G.screen;
  on(window, 'keydown', e => {
    if (!root.isConnected) return; const k = e.key.toLowerCase();
    if (e.key === 'F11') { e.preventDefault(); toggleFullscreen(); return; }
    if (e.key === 'Escape') {
      if (G.screen === 'title') return; // let the arcade close the game window
      e.preventDefault(); e.stopPropagation();
      if (isTheater() && !G.screen) { setTheater(false); return; }
      if (G.screen === 'shop') { showScreen(null); lockPointer(); } else if (G.screen === 'pause') { showScreen(null); lockPointer(); } else if (G.screen === 'howto' || G.screen === 'settings') screenAction('back'); else if (G.run && !G.run.over && !G.screen) { if (HOTBAR[G.slot].kind === 'build' && G.run.phase !== 'setup') selectSlot(0); else togglePause(); }
      return;
    }
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    setInputMode('kbm');
    if (G.screen) { if (k === 'b' && G.screen === 'shop') { showScreen(null); lockPointer(); } return; }
    if (!playing()) return;
    if (['w', 'a', 's', 'd', ' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'tab'].includes(k)) e.preventDefault();
    I.keys.add(k);
    if (e.repeat) return;
    if (k >= '1' && k <= '8') selectSlot(Number(k) - 1);
    else if (k === ' ') jump();
    else if (k === 'v') toggleCam();
    else if (k === 'b') openShop();
    else if (k === 'e' || k === 'f') { const s = aimStruct(4.5); if (s) hammerUse(s); }
    else if (k === 'r') rotateBlueprint();
    else if (k === 'q') { if (currentTool().kind === 'hammer') { const s = aimStruct(4.5); if (s) hammerUse(s, true); } }
  }, true);
  on(window, 'keyup', e => { I.keys.delete(e.key.toLowerCase()); });
  on(window, 'blur', () => { I.keys.clear(); I.fire = false; });
  on(canvas, 'mousedown', e => {
    G.sound.ensure(); setInputMode('kbm'); if (!playing()) return;
    if (!document.pointerLockElement) lockPointer();
    if (e.button === 0) { I.fire = true; primary(); } else if (e.button === 2) { I.drag = true; }
  });
  on(window, 'mouseup', e => { if (e.button === 0) I.fire = false; if (e.button === 2) I.drag = false; });
  on(canvas, 'contextmenu', e => e.preventDefault());
  on(window, 'mousemove', e => {
    if (!playing()) return;
    if (document.pointerLockElement === canvas || I.drag) { I.look[0] += e.movementX; I.look[1] += e.movementY; }
  });
  on(canvas, 'wheel', e => { if (!playing()) return; e.preventDefault(); cycleSlot(e.deltaY > 0 ? 1 : -1); }, { passive: false });
  on(document, 'pointerlockchange', () => { if (!document.pointerLockElement && G.wasLocked && playing()) { showScreen('pause'); } G.wasLocked = !!document.pointerLockElement; });
  on(root, 'click', e => {
    const s = e.target.closest('[data-slot]'); if (s) { selectSlot(Number(s.dataset.slot)); return; }
    const a = e.target.closest('[data-act]'); if (a) { const v = a.dataset.act; if (v === 'cam') toggleCam(); else if (v === 'shop') openShop(); else if (v === 'fs') toggleFullscreen(); else if (v === 'pause') togglePause(); return; }
    const d = e.target.closest('[data-do]'); if (d && !d.disabled) screenAction(d.dataset.do, d.dataset.v, d);
  });
  on(document, 'fullscreenchange', () => setTimeout(resize, 50));
  on(window, 'resize', resize);
  if (window.ResizeObserver) { G.ro = new ResizeObserver(resize); G.ro.observe(root); }
  bindTouch(on);
}
function bindTouch(on) {
  const T = G.touch = { id: null, lookId: null, ox: 0, oy: 0, lx: 0, ly: 0 }, stick = $('[data-stick]'), knob = $('[data-knob]'), look = $('[data-look]');
  const coarse = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || (navigator.maxTouchPoints > 0 && !(window.matchMedia && matchMedia('(hover: hover)').matches));
  G.touchOn = G.settings.touch === 'on' || (G.settings.touch === 'auto' && coarse);
  const show = () => { $('[data-touch]').hidden = !(G.touchOn && G.run && !G.run.over && !G.screen); };
  G.showTouch = show;
  on(G.root, 'touchstart', () => { if (!G.touchOn) { G.touchOn = true; } setInputMode('touch'); G.sound.ensure(); }, { passive: true });
  on(stick, 'pointerdown', e => { e.preventDefault(); T.id = e.pointerId; stick.setPointerCapture?.(e.pointerId); const r = stick.getBoundingClientRect(); T.ox = r.left + r.width / 2; T.oy = r.top + r.height / 2; moveStick(e); });
  const moveStick = e => { if (e.pointerId !== T.id) return; const dx = e.clientX - T.ox, dy = e.clientY - T.oy, m = Math.hypot(dx, dy), R = 46, k = m > R ? R / m : 1; knob.style.transform = `translate(${dx * k}px,${dy * k}px)`; G.input.tx = clamp(dx / R, -1, 1); G.input.tz = clamp(dy / R, -1, 1); G.input.sprintT = m > R * 1.25; };
  on(stick, 'pointermove', moveStick);
  const endStick = e => { if (e.pointerId !== T.id) return; T.id = null; knob.style.transform = ''; G.input.tx = G.input.tz = 0; G.input.sprintT = false; };
  on(stick, 'pointerup', endStick); on(stick, 'pointercancel', endStick);
  on(look, 'pointerdown', e => { T.lookId = e.pointerId; T.lx = e.clientX; T.ly = e.clientY; look.setPointerCapture?.(e.pointerId); });
  on(look, 'pointermove', e => { if (e.pointerId !== T.lookId) return; G.input.look[0] += (e.clientX - T.lx) * 1.6; G.input.look[1] += (e.clientY - T.ly) * 1.6; T.lx = e.clientX; T.ly = e.clientY; });
  const endLook = e => { if (e.pointerId === T.lookId) T.lookId = null; }; on(look, 'pointerup', endLook); on(look, 'pointercancel', endLook);
  $$('[data-t]').forEach(b => {
    on(b, 'pointerdown', e => { e.preventDefault(); b.classList.add('down'); const t = b.dataset.t; if (t === 'fire') { G.input.fireT = true; primary(); } else if (t === 'jump') jump(); else if (t === 'act') { const s = aimStruct(4.5); if (s) hammerUse(s); else toast('Aim at a structure to repair or upgrade'); } else if (t === 'rot') { if (currentTool().kind === 'hammer') { const s = aimStruct(4.5); if (s) hammerUse(s, true); } else rotateBlueprint(); } else if (t === 'shop') openShop(); else if (t === 'cam') toggleCam(); });
    const up = () => { b.classList.remove('down'); if (b.dataset.t === 'fire') G.input.fireT = false; }; on(b, 'pointerup', up); on(b, 'pointercancel', up); on(b, 'pointerleave', up);
  });
}
function pollInput(dt) {
  const I = G.input, P = G.player, pad = G.pad, s = G.settings, K = I.keys;
  const hasPad = pad.poll();
  // keyboard
  let mx = (K.has('d') || K.has('arrowright') ? 1 : 0) - (K.has('a') || K.has('arrowleft') ? 1 : 0), mz = (K.has('s') || K.has('arrowdown') ? 1 : 0) - (K.has('w') || K.has('arrowup') ? 1 : 0);
  I.sprint = K.has('shift'); let fire = I.fire || !!I.fireT;
  if (I.tx || I.tz) { mx = I.tx; mz = I.tz; I.sprint = I.sprintT; }
  // mouse / touch look
  const sens = 0.0024 * s.sens, inv = s.invertY ? -1 : 1;
  if (G.run && !G.screen) { P.yaw -= I.look[0] * sens; P.pitch = clamp(P.pitch - I.look[1] * sens * inv, -1.2, 1.2); }
  I.look[0] = I.look[1] = 0;
  if (hasPad) {
    if (G.screen) padMenu(); else if (G.run && !G.run.over) {
      if (Math.abs(pad.lx) + Math.abs(pad.ly) > 0) { mx = pad.lx; mz = pad.ly; }
      if (pad.down(PAD.L3)) I.sprint = true;
      P.yaw -= pad.rx * 3.0 * s.sens * dt; P.pitch = clamp(P.pitch - pad.ry * 2.2 * s.sens * dt * inv, -1.2, 1.2);
      if (pad.rt > 0.35) fire = true;
      if (pad.pressed(PAD.A)) jump();
      if (pad.pressed(PAD.LT)) { const st = aimStruct(4.5); if (st) hammerUse(st); }
      if (pad.pressed(PAD.X)) { if (currentTool().kind === 'hammer') { const st = aimStruct(4.5); if (st) hammerUse(st, true); } else rotateBlueprint(); }
      if (pad.pressed(PAD.Y)) openShop();
      if (pad.pressed(PAD.B)) { if (HOTBAR[G.slot].kind === 'build' && G.run.phase !== 'setup') { selectSlot(0); toast('Build mode closed'); } }
      if (pad.pressed(PAD.LB)) cycleSlot(-1); if (pad.pressed(PAD.RB)) cycleSlot(1);
      if (pad.pressed(PAD.R3) || pad.pressed(PAD.UP)) toggleCam();
      if (pad.pressed(PAD.LEFT)) cycleSlot(-1); if (pad.pressed(PAD.RIGHT)) cycleSlot(1);
      if (pad.pressed(PAD.START)) togglePause();
    } else if (pad.pressed(PAD.START) || pad.pressed(PAD.A)) { /* title handled by padMenu */ }
  }
  I.mx = mx; I.mz = mz; I.fireNow = fire;
}
function padMenu() {
  const p = G.pad;
  const nav = (b, dx, dy) => { if (p.pressed(b)) navMove(dx, dy); };
  nav(PAD.UP, 0, -1); nav(PAD.DOWN, 0, 1); nav(PAD.LEFT, -1, 0); nav(PAD.RIGHT, 1, 0);
  G.stickNav = (G.stickNav || 0) - G.dt;
  if (G.stickNav <= 0 && Math.hypot(p.lx, p.ly) > 0.6) { G.stickNav = 0.22; Math.abs(p.lx) > Math.abs(p.ly) ? navMove(Math.sign(p.lx), 0) : navMove(0, Math.sign(p.ly)); }
  if (p.pressed(PAD.A)) { const el = navEls()[G.navI]; if (el) el.click(); }
  if (p.pressed(PAD.B) || (G.screen === 'shop' && p.pressed(PAD.Y)) || (G.screen === 'pause' && p.pressed(PAD.START))) {
    if (G.screen === 'shop' || G.screen === 'pause') showScreen(null); else if (G.screen === 'howto' || G.screen === 'settings') screenAction('back');
  }
}

/* ---------- Main loop ---------- */
function frame(now) {
  if (!G || G.stopped) return; G.raf = requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - (G.last || now)) / 1000); G.last = now; G.dt = dt; G.clock += dt;
  // auto quality: step down if FPS stays under 25 for 3s
  G.fps = lerp(G.fps || 60, 1 / Math.max(dt, 0.001), 0.05);
  if (G.fps < 25 && G.settings.quality !== 'Low') { G.lowT = (G.lowT || 0) + dt; if (G.lowT > 3) { G.lowT = 0; G.settings.quality = G.settings.quality === 'High' ? 'Medium' : 'Low'; applyQuality(); toast(`Auto-quality: ${G.settings.quality} for smoother FPS`); } } else G.lowT = 0;
  pollInput(dt);
  const R = G.run;
  if (R && !R.over && G.screen !== 'pause' && G.screen !== 'howto' && G.screen !== 'settings') {
    if (!G.screen) { if (G.input.fireNow) primary(); updatePlayer(dt); }
    updatePhase(dt); updateZombies(dt); updateStructures(dt); updateBots(dt); updateProjs(dt);
    if (G.boss && !R.over) bossBar(G.boss);
    G.hudT = (G.hudT || 0) - dt; if (G.hudT <= 0 || G.hudDirty) { G.hudT = 0.25; updateHUD(); setObjective(); refreshHotbarAfford(); }
    updatePrompt(); updateGhost();
  } else if (R && R.over) { updateZombies(dt * 0.5); }
  updateParts(dt);
  if (R) { updateSky(dt); updateCamera(dt); } else titleCamera(dt);
  if (G.stashFlash > 0) G.stashFlash -= dt;
  if (G.hurtFlash > 0) { G.hurtFlash -= dt; } $('.zr-hurt').style.opacity = String(Math.max(0, G.hurtFlash || 0) * 1.4 + (R && !G.player.dead && G.player.hp < 30 ? 0.25 + Math.sin(G.clock * 6) * 0.1 : 0));
  G.showTouch && G.showTouch();
  $('.zr-cross').hidden = !R || !!G.screen || G.player.dead;
  G.renderer.render(G.scene, G.camera);
  updatePops(dt);
}
function refreshHotbarAfford() {
  const key = G.run.phase + '|' + HOTBAR.map(h => h.kind === 'build' ? afford(BUILD[h.id].cost) : '').join('') + G.run.ranged + G.run.melee + G.slot + G.inputMode;
  if (key !== G.hbKey) { G.hbKey = key; refreshHotbar(); }
}
function updateGhost() {
  const tool = currentTool(), show = tool.kind === 'build' && !G.player.dead;
  G.grid.visible = show && !!stash(); G.ring.visible = G.grid.visible;
  if (!show || !G.ghostCell) { if (G.ghost) G.ghost.visible = false; return; }
  const key = tool.type + (G.ghostOkNow ? 1 : 0);
  if (G.ghostKey !== key) { if (G.ghost) G.scene.remove(G.ghost); G.ghost = structureMesh(tool.type, 1, G.ghostOkNow ? G.ghostOk : G.ghostBad); G.ghost.traverse(o => { o.castShadow = false; o.renderOrder = 3; }); G.scene.add(G.ghost); G.ghostKey = key; }
  G.ghost.visible = true; G.ghost.position.set(cellCenter(G.ghostCell.cx), 0.02 + Math.sin(G.clock * 5) * 0.03, cellCenter(G.ghostCell.cz)); G.ghost.rotation.y = G.rot * Math.PI / 2;
}
function titleCamera(dt) {
  G.titleT = (G.titleT || 0) + dt * 0.06; const a = G.titleT, cam = G.camera;
  cam.position.set(Math.cos(a) * 22, 11, Math.sin(a) * 22); cam.lookAt(0, 1.5, 0);
  G.dayness = lerp(G.dayness, 0.15, dt); const d = G.dayness;
  G.scene.background.setHex(0x1a0f3d).lerp(G.tmpC2.setHex(0x8fd6ff), d); G.scene.fog.color.copy(G.scene.background);
  G.sun.intensity = lerp(0.35, 1.6, d); G.hemi.intensity = lerp(0.45, 0.85, d); G.hemi.color.setHex(0x8a7dff); G.stars.material.opacity = 1 - d; G.moon.visible = true;
  G.stashLight.intensity = 0; G.lantern.intensity = 0; G.vm.visible = false; G.player.c.root.visible = false;
  for (const z of G.titleZ || []) { z.t += dt; z.a += dt * 0.12; z.x = Math.cos(z.a) * z.r; z.z = Math.sin(z.a) * z.r; z.c.root.position.set(z.x, 0, z.z); z.c.root.rotation.y = -z.a; animChar(z.c, 1, z.t * 4, true); }
}
function titleScene() {
  // a little base with walking zombies for the menu backdrop
  G.titleObjs = [];
  const add = m => { G.scene.add(m); G.titleObjs.push(m); return m; };
  const st = structureMesh('stash', 2); add(st);
  for (let i = -2; i <= 2; i++) for (const [x, z] of [[i * 2, -5], [i * 2, 5], [-5, i * 2], [5, i * 2]]) { const w = structureMesh('wall', Math.abs(i) === 2 ? 3 : 2); w.position.set(x, 0, z); add(w); }
  for (const [x, z] of [[-3, -3], [3, 3]]) { const t = structureMesh('arrow', 3); t.position.set(x, 0, z); add(t); }
  const c = structureMesh('cannon', 4); c.position.set(3, 0, -3); add(c); const m = structureMesh('mine', 2); m.position.set(-3, 0, 3); add(m);
  G.titleZ = [];
  ['walker', 'sprinter', 'tank', 'phantom', 'walker', 'rizzler'].forEach((k, i) => {
    const d = ZOMBIES[k], ch = makeChar({ zombie: true, skin: d.skin, shirt: d.shirt, pants: d.pants, eye: d.eye, glowEye: d.glowEye, size: d.size * (d.boss ? 0.8 : 1), crown: d.crown, shades: d.shades, armor: d.armor, ghost: d.ghost });
    add(ch.root); G.titleZ.push({ c: ch, a: i * 1.05, r: 11 + (i % 3) * 1.5, t: i, x: 0, z: 0 });
  });
}
function clearTitleScene() { (G.titleObjs || []).forEach(o => G.scene.remove(o)); G.titleObjs = []; G.titleZ = []; }

/* ---------- Mount ---------- */
function loadThree() {
  if (window.THREE) return Promise.resolve();
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = new URL('three.min.js', SCRIPT_URL || location.href).href; s.onload = () => window.THREE ? res() : rej(new Error('three.js missing')); s.onerror = () => rej(new Error('three.js failed')); document.head.append(s); });
}
function mount(area) {
  let stopped = false;
  area.innerHTML = '<div class="zr-load" role="status">Loading Zomb.io 3D…</div>';
  loadThree().then(() => { if (!stopped) try { init(area); } catch (e) { console.error('[Zomb.io]', e); area.innerHTML = '<div class="zr-load">Zomb.io 3D hit an error while starting. Try reloading the page.</div>'; } }, () => { if (!stopped) area.innerHTML = '<div class="zr-load">The 3D engine couldn’t load. Make sure three.min.js is uploaded next to zomb.js.</div>'; });
  return function stop() {
    stopped = true; if (!G) return; G.stopped = true; cancelAnimationFrame(G.raf);
    (G.listeners || []).forEach(([t, ev, fn, o]) => t.removeEventListener(ev, fn, o)); G.ro && G.ro.disconnect();
    if (document.pointerLockElement) document.exitPointerLock?.(); if (document.fullscreenElement) document.exitFullscreen?.().catch?.(() => {});
    document.body.classList.remove('zr-theater-open'); clearTimeout(G.bannerT);
    try { G.renderer.dispose(); G.renderer.forceContextLoss?.(); } catch (e) {}
    if (G.sound.ctx) G.sound.ctx.close().catch(() => {});
    G = null;
  };
}
function init(area) {
  const root = buildUI(area);
  G = { root, clock: 0, dt: 0, settings: loadJSON(SET_KEY, DEFAULT_SETTINGS), stats: loadStats(), inputMode: 'kbm', pops: [], parts: [], structs: [], zombies: [], projs: [], bots: [], cells: new Map(), screen: null, tut: { harvested: false }, shake: 0, dayness: 0.2 };
  G.sound = new Sound(G.settings);
  G.pad = new Pad({ connect: b => { toast(`🎮 ${b === 'ps' ? 'PlayStation' : b === 'switch' ? 'Switch' : 'Xbox'} controller connected`, 'good'); setInputMode('pad'); }, disconnect: () => { toast('🎮 Controller disconnected', 'warn'); setInputMode('kbm'); }, activity: () => setInputMode('pad') });
  const _rumble = G.pad.rumble.bind(G.pad); G.pad.rumble = (s, ms) => { if (G && G.settings.rumble) _rumble(s, ms); };
  const canvas = $('.zr-canvas');
  try { G.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' }); } catch (e) { area.innerHTML = '<div class="zr-load">WebGL isn’t available on this device, so Zomb.io 3D can’t start.</div>'; G = null; return; }
  G.renderer.outputColorSpace = THREE.SRGBColorSpace; G.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  G.scene = new THREE.Scene(); G.scene.background = new THREE.Color(0x8fd6ff); G.scene.fog = new THREE.Fog(0x8fd6ff, 28, 62);
  G.camera = new THREE.PerspectiveCamera(70, 1, 0.05, 400); G.scene.add(G.camera);
  G.tmpV = new THREE.Vector3(); G.tmpC = new THREE.Color(); G.tmpC2 = new THREE.Color(); G.ray = new THREE.Raycaster(); G.center = new THREE.Vector2(0, 0);
  buildWorld();
  G.stashLight = new THREE.PointLight(0xffc94a, 0, 18, 1.6); G.scene.add(G.stashLight);
  G.lantern = new THREE.PointLight(0xb9c4ff, 0, 14, 1.4); G.scene.add(G.lantern);
  G.vm = new THREE.Group(); G.camera.add(G.vm); G.vmTool = new THREE.Group(); G.vm.add(G.vmTool);
  box(0.16, 0.16, 0.5, lam(0xffcc80), 0.06, -0.12, 0.18, G.vm, false);
  G.player = { x: 0, z: 6, y: 0, vy: 0, yaw: 0, pitch: 0, hp: 100, maxHp: 100, ground: true, c: makeChar({ skin: 0xffcc80, shirt: 0x26c6da, pants: 0x283593, eye: 0x111111, hair: 0x4e342e }) };
  G.scene.add(G.player.c.root);
  applyQuality(); bindInput(); titleScene(); resize();
  G.root.dataset.input = 'kbm';
  showScreen('title');
  G.last = performance.now(); G.raf = requestAnimationFrame(frame);
}
// clear the title backdrop when a run starts
const __startRun = startRun;
startRun = function () { clearTitleScene(); G.player.c.root.visible = true; __startRun(); $('[data-hud]').hidden = false; };
function toTitle() {
  clearWorldActors(); G.run = null; G.structs = []; G.cells = new Map(); G.zombies = []; G.projs = []; G.bots = []; G.boss = null;
  if (G.ghost) G.ghost.visible = false; G.grid.visible = G.ring.visible = false; $('[data-hud]').hidden = true; bossBar(null);
  clearTitleScene(); titleScene(); showScreen('title');
}

window.ZombIO = { mount, version: VERSION, stats: loadStats, debug: () => ({ G, spawnZombie, placeStructure, startNight, endNight, hireBot, cellOf }) };
})();
