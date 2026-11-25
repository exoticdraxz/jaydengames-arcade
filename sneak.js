/* SNEAK & YEET 3D — JaydenGames. Goofy blocky stealth-shooter with a 70-mission viral-trend campaign.
   Built on three.js (three.min.js next to this file). Exposes window.SneakYeet = { mount, save, version }. */
(function () {
'use strict';
const VERSION = '1.0.0';
const SCRIPT_URL = document.currentScript && document.currentScript.src;
const SAVE_KEY = 'sneakyeet.save.v1';
const CELL = 2, WALL_H = 3.2;

/* ---------- small helpers ---------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => Math.floor(n).toLocaleString();
const fmtT = s => { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
function mulberry(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const todayStr = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

const DEFAULT_SAVE = {
  v: 1, cash: 150, missions: {}, weapons: ['chicken'], skins: ['rookie'], skin: 'rookie', gadgets: { box: 1, decoy: 1, smoke: 1, emp: 0 },
  upgrades: {}, gauntletBest: 0, totalBonks: 0, totalYeets: 0, settings: { sens: 1, quality: 'Medium', mute: false, volume: 0.7, cam: 'third', invertY: false, rumble: true, touch: 'auto' }
};
function loadSave() {
  try { const v = JSON.parse(localStorage.getItem(SAVE_KEY)); if (v && typeof v === 'object') { const d = JSON.parse(JSON.stringify(DEFAULT_SAVE)); const o = Object.assign(d, v); o.settings = Object.assign(d.settings, DEFAULT_SAVE.settings, v.settings || {}); o.gadgets = Object.assign({ box: 1, decoy: 1, smoke: 1, emp: 0 }, v.gadgets || {}); if (!Array.isArray(o.weapons) || !o.weapons.length) o.weapons = ['chicken']; return o; } } catch (e) {}
  return JSON.parse(JSON.stringify(DEFAULT_SAVE));
}
function writeSave() { if (!G) return; try { localStorage.setItem(SAVE_KEY, JSON.stringify(G.save)); } catch (e) {} }

/* ---------- Arcade Pass bridge (shared JaydenGames tokens) ---------- */
function awardTokens(n, reason) {
  try { if (window.JGArcade && JGArcade.pass) { const r = JGArcade.pass.award(n, reason); return r ? r.got : 0; } } catch (e) {}
  try { const k = 'jaydengames.arcadePass.v1', p = JSON.parse(localStorage.getItem(k) || '{}'); p.tokens = (p.tokens || 0) + n; p.totalEarned = (p.totalEarned || 0) + n; localStorage.setItem(k, JSON.stringify(p)); window.dispatchEvent(new CustomEvent('jg-tokens')); return n; } catch (e) { return 0; }
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
      case 'squeak': this.tone(1300, 0.12, 'square', 0.12, 700); this.tone(1800, 0.1, 'square', 0.1, -600, 0.1); break;
      case 'chicken': this.tone(700, 0.08, 'sawtooth', 0.12, 900); this.tone(1500, 0.14, 'square', 0.1, -900, 0.07); break;
      case 'plunger': this.noise(0.08, 0.2, 900, 2); this.tone(220, 0.12, 'sine', 0.25, 260, 0.04); break;
      case 'gum': this.tone(500, 0.06, 'sine', 0.2, 400); break;
      case 'taco': this.noise(0.3, 0.4, 200, 0.7, 0, 'lowpass'); this.tone(110, 0.25, 'sine', 0.3, -40); break;
      case 'confetti': this.noise(0.25, 0.35, 2200, 0.8); [880, 1100, 1320].forEach((f, i) => this.tone(f, 0.08, 'square', 0.06, 0, 0.05 + i * 0.04)); break;
      case 'disco': this.tone(900, 0.09, 'triangle', 0.1, -500); break;
      case 'choco': this.noise(0.14, 0.3, 1800, 3); this.tone(300, 0.1, 'square', 0.08, -100); break;
      case 'dryer': this.noise(0.25, 0.12, 900, 0.5, 0, 'lowpass'); break;
      case 'guitar': [330, 415, 494, 659].forEach((f, i) => this.tone(f, 0.35, 'sawtooth', 0.07, 0, i * 0.07)); break;
      case 'bonk': this.tone(420, 0.06, 'square', 0.2, -280); this.noise(0.06, 0.25, 1500, 2); this.tone(1600, 0.25, 'sine', 0.06, 400, 0.08); break;
      case 'ko': [880, 1047, 1319].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.08, 0, i * 0.06)); break;
      case 'hit': this.noise(0.08, 0.25, 700, 1.5); this.tone(200, 0.08, 'square', 0.1, -80); break;
      case 'q': this.tone(520, 0.12, 'triangle', 0.12, 260); break;
      case 'alert': this.tone(880, 0.09, 'square', 0.16); this.tone(1320, 0.18, 'square', 0.16, 0, 0.09); break;
      case 'alarm': [0, 0.3, 0.6].forEach(d => { this.tone(740, 0.15, 'sawtooth', 0.09, 300, d); this.tone(1040, 0.15, 'sawtooth', 0.09, -300, d + 0.15); }); break;
      case 'busted': [523, 392, 262].forEach((f, i) => this.tone(f, 0.22, 'square', 0.14, 0, i * 0.14)); break;
      case 'calm': [392, 494, 587].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.08, 0, i * 0.08)); break;
      case 'hurt': this.tone(240, 0.18, 'square', 0.18, -120); break;
      case 'step': this.noise(0.05, 0.05, 400, 1); break;
      case 'trap': this.tone(1200, 0.15, 'square', 0.14, 900); this.noise(0.12, 0.25, 2600, 2, 0.02); break;
      case 'crunch': this.noise(0.2, 0.35, 2400, 3); this.noise(0.12, 0.25, 1200, 3, 0.1); break;
      case 'wrap': for (let i = 0; i < 5; i++) this.noise(0.03, 0.35, 3000, 4, i * 0.05); break;
      case 'splat': this.noise(0.2, 0.3, 500, 1); this.tone(160, 0.2, 'sine', 0.2, -60); break;
      case 'pickup': [988, 1319, 1568].forEach((f, i) => this.tone(f, 0.1, 'square', 0.09, 0, i * 0.06)); break;
      case 'coin': this.tone(988, 0.06, 'square', 0.08); this.tone(1319, 0.12, 'square', 0.08, 0, 0.05); break;
      case 'switch': this.tone(300, 0.05, 'square', 0.14); this.tone(600, 0.08, 'square', 0.12, 0, 0.05); break;
      case 'hack': this.tone(rand(500, 1500), 0.04, 'square', 0.05); break;
      case 'win': [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.12, 0, i * 0.09)); break;
      case 'fail': [392, 349, 311, 262, 196].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.12, 0, i * 0.16)); break;
      case 'star': this.tone(1568, 0.12, 'square', 0.1); this.tone(2093, 0.2, 'square', 0.08, 0, 0.08); break;
      case 'buy': [660, 880, 1320].forEach((f, i) => this.tone(f, 0.1, 'square', 0.1, 0, i * 0.05)); break;
      case 'deny': this.tone(160, 0.16, 'square', 0.14, -40); break;
      case 'click': this.tone(600, 0.04, 'square', 0.07); break;
      case 'reload': this.tone(400, 0.05, 'square', 0.08); this.tone(700, 0.05, 'square', 0.08, 0, 0.12); break;
      case 'empty': this.tone(200, 0.05, 'square', 0.08); break;
      case 'jump': this.tone(300, 0.12, 'square', 0.08, 300); break;
      case 'hide': this.noise(0.12, 0.12, 600, 1); this.tone(240, 0.08, 'triangle', 0.08); break;
      case 'smoke': this.noise(0.6, 0.25, 900, 0.5, 0, 'lowpass'); break;
      case 'emp': this.tone(120, 0.5, 'sawtooth', 0.14, 900); this.noise(0.4, 0.2, 3000, 1, 0.05); break;
      case 'decoy': this.tone(660, 0.12, 'triangle', 0.1); this.tone(880, 0.12, 'triangle', 0.1, 0, 0.12); this.tone(990, 0.2, 'triangle', 0.1, 0, 0.24); break;
      case 'laser': this.tone(1800, 0.25, 'sawtooth', 0.08, -1200); break;
      case 'boss': [110, 104, 98, 92].forEach((f, i) => this.tone(f, 0.5, 'sawtooth', 0.16, 0, i * 0.3)); this.noise(1.2, 0.2, 120, 0.5, 0, 'lowpass'); break;
      case 'blob': this.tone(180, 0.25, 'sine', 0.2, 200); break;
      case 'token': [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.12, 'square', 0.09, 0, i * 0.07)); break;
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
/* ---------- Goofy weapons (no real guns) ---------- */
// rate = shots / second, speed = projectile speed (0 = cone/hitscan), noise = % added to the Quiet Meter per shot
const WEAPONS = {
  chicken: { name: 'Rubber Chicken Launcher', icon: '🐔', dmg: 35, rate: 2.2, speed: 22, range: 30, mag: 8, reserve: 32, noise: 10, fx: 'squeak', price: 0, color: 0xffd23f, desc: 'Squeaky bounce lures guards to where it lands.', grav: 1, bounce: 2 },
  plunger: { name: 'Plunger Crossbow', icon: '🪠', dmg: 80, rate: 0.9, speed: 34, range: 40, mag: 4, reserve: 16, noise: 5, fx: 'blind', price: 350, color: 0xff4d4d, desc: 'Sticks to faces. Blinds a guard\u2019s vision cone for 5s.' },
  gum: { name: 'Bubble-Gum Blaster', icon: '🫧', dmg: 25, rate: 6, speed: 26, range: 24, mag: 24, reserve: 96, noise: 25, fx: 'float', price: 500, color: 0xff7ad9, desc: '3 quick hits bubble-float a guard into the air.' },
  taco: { name: 'Taco Cannon', icon: '🌮', dmg: 100, rate: 0.7, speed: 18, range: 30, mag: 3, reserve: 9, noise: 85, fx: 'splash', price: 800, color: 0xffa726, desc: 'Splash damage with big knockback. VERY loud.', grav: 1 },
  confetti: { name: 'Confetti Party Popper', icon: '🎉', dmg: 90, rate: 1.4, speed: 0, range: 7, mag: 5, reserve: 20, noise: 70, fx: 'stun', price: 900, color: 0x35e7ff, desc: 'Short cone blast stuns everyone in front of you.' },
  disco: { name: 'Disco Freeze Ray', icon: '🪩', dmg: 60, rate: 7, speed: 40, range: 32, mag: 30, reserve: 120, noise: 15, fx: 'dance', price: 2400, color: 0xb388ff, desc: 'LEGENDARY. Frozen guards breakdance for 4s.', legendary: true },
  choco: { name: 'Dubai Chocolate Launcher', icon: '🍫', dmg: 45, rate: 1.6, speed: 24, range: 30, mag: 6, reserve: 24, noise: 20, fx: 'glue', price: 1300, color: 0x8d5524, desc: 'Pistachio goo glues a guard\u2019s boots for 6s.', grav: 1 },
  dryer: { name: 'Low-Taper-Fade Hairdryer', icon: '💨', dmg: 15, rate: 5, speed: 0, range: 6, mag: 40, reserve: 120, noise: 0, fx: 'push', price: 1100, color: 0x80deea, desc: 'Totally silent gust. Pushes guards away and dizzies them.' },
  guitar: { name: 'Rizzler Guitar', icon: '🎸', dmg: 0, rate: 0.6, speed: 0, range: 9, mag: 3, reserve: 9, noise: 30, fx: 'charm', price: 1800, color: 0xff3dbb, desc: 'Charms guards in range into clapping for 6s.' }
};
const WEAPON_ORDER = ['chicken', 'plunger', 'gum', 'taco', 'confetti', 'disco', 'choco', 'dryer', 'guitar'];
const UPGRADES = {
  quiet: { name: 'Silencer', icon: '🤫', desc: '-25% weapon noise per level', base: 150 },
  reload: { name: 'Speed Loader', icon: '⚡', desc: '-20% reload time per level', base: 120 },
  ammo: { name: 'Big Mag', icon: '📦', desc: '+30% magazine & reserve per level', base: 130 }
};
const MAX_UP = 3;
const upCost = (wid, k, lvl) => Math.round(UPGRADES[k].base * (1 + lvl * 0.9) * (WEAPONS[wid].legendary ? 1.6 : 1));

/* ---------- Skins ---------- */
const SKINS = {
  rookie: { name: 'Rookie Ninja', price: 0, skin: 0xffcc80, shirt: 0x263238, pants: 0x212121, mask: 0x111111, band: 0xff4d4d },
  boxer: { name: 'Cardboard Box Disguise', price: 300, skin: 0xffcc80, shirt: 0xc8a06a, pants: 0x9c7a4a, boxHead: true, desc: 'Box disguise lasts 50% longer.' },
  cyber: { name: 'Neon Cyberpunk Agent', price: 600, skin: 0xffcc80, shirt: 0x1a1a3a, pants: 0x101028, shades: true, glow: 0x35e7ff, desc: 'Glowing visor. Pure drip.' },
  banana: { name: 'Banana Suit Spy', price: 750, skin: 0xffe066, shirt: 0xffe066, pants: 0xffe066, banana: true, desc: 'Absolutely not suspicious.' },
  phantom: { name: 'Shadow Phantom', price: 1500, skin: 0x37474f, shirt: 0x111111, pants: 0x0b0b0b, ghost: true, desc: '-15% detection speed in shadows.' },
  gold: { name: '24K Gold VIP', price: 4000, skin: 0xffd700, shirt: 0xffc107, pants: 0xffb300, crown: true, desc: '+10% mission cash. Shiny.' },
  crown: { name: '24K Viral Crown', price: -1, skin: 0xffd700, shirt: 0xff3dbb, pants: 0x7c4dff, crown: true, shades: true, desc: 'Beat Mission 70 to unlock. +25% cash.' }
};
const SKIN_ORDER = ['rookie', 'boxer', 'cyber', 'banana', 'phantom', 'gold', 'crown'];

/* ---------- Gadgets ([G] / D-Pad Down, cycle with [Tab] / D-Pad Left-Right) ---------- */
const GADGETS = {
  box: { name: 'Cardboard Box', icon: '📦', dur: 10, desc: 'Become a box. Guards ignore you while you stand still or creep.', price: 120 },
  decoy: { name: 'Ring-Light Decoy', icon: '💡', dur: 9, desc: 'Throw a fake ring light that yells "Ice cream so good!" to lure guards.', price: 150 },
  smoke: { name: 'Cotton-Candy Smoke', icon: '🍭', dur: 8, desc: 'Pink cloud that blocks line of sight.', price: 140 },
  emp: { name: 'EMP Meme Jammer', icon: '📡', dur: 8, desc: 'Disables lasers, cameras and drones for 8s.', price: 220 }
};
const GADGET_ORDER = ['box', 'decoy', 'smoke', 'emp'];

/* ---------- Sound traps ---------- */
const TRAPS = {
  chips: { name: 'Chip Bag', noise: 40, snd: 'crunch', color: 0xff5252 },
  duck: { name: 'Rubber Duck', noise: 45, snd: 'squeak', color: 0xffeb3b },
  boxes: { name: 'Box Stack', noise: 50, snd: 'hit', color: 0xa1887f },
  moodeng: { name: 'Squeaky Moo Deng Toy', noise: 50, snd: 'squeak', color: 0xf8bbd0 },
  dubai: { name: 'Dubai Chocolate Bar', noise: 45, snd: 'crunch', color: 0x6d4c41 },
  ringspk: { name: 'Ring-Light Speaker', noise: 60, snd: 'decoy', color: 0xffffff },
  grimace: { name: 'Grimace Puddle', noise: 35, snd: 'splat', color: 0x8e44ad },
  wrap: { name: 'Bubble Wrap', noise: 55, snd: 'wrap', color: 0xb3e5fc }
};

/* ---------- 70-mission campaign (data-driven; levels are generated from these entries) ---------- */
// type: heist (grab + escape) · collect (grab 3) · switch (3 switches + timer) · hack (hack laptop, grab, reach helipad) · lasers (museum heist) · boss
const CHAPTERS = [
  { id: 1, name: '2023: The OG Brainrot', short: '2023', color: '#8e44ad' },
  { id: 2, name: '2024: Very Demure Era', short: '2024', color: '#8bd450' },
  { id: 3, name: '2025: Aura Farming Season', short: '2025', color: '#35e7ff' },
  { id: 4, name: '2025: Peak Brainrot', short: '2025+', color: '#ff9f1c' },
  { id: 5, name: '2026: The Algorithm Wars', short: '2026', color: '#ff3dbb' },
  { id: 6, name: 'Nightmare Remix', short: 'NIGHT', color: '#3dff7a' },
  { id: 7, name: 'Creator Gauntlet', short: 'FINAL', color: '#ffd23f' }
];
// name | item | type | hue | props | traps | flags
const MISSION_ROWS = [
  'Grimace Shake Lab|Purple Shake Formula|heist|275|shake,lab,crate|grimace,chips|',
  'Skibidi Bathroom Maze|Golden Plunger|heist|200|toilet,mirror|duck,wrap|',
  'Ohio Train Station|Ohio Corn Ticket|heist|35|train,bench,corn|chips,boxes|',
  'Girl Dinner Banquet|Girl Dinner Plates|collect|330|table,plate,plant|chips,duck|',
  'Roman Empire Colosseum|Caesar\u2019s Laurel|heist|40|pillar,statue|boxes,chips|statue=Julius Caesar',
  'NPC Live Stream Studio|Ice Cream Stream Key|hack|300|ringlight,tv,chair|ringspk,wrap|',
  'Smurf Cat Mushroom Forest|Blue Mushroom|collect|210|mushroom,tree|duck,chips|statue=Smurf Cat',
  'Tube Girl Subway|Golden Earbuds|heist|190|train,pole,bench|wrap,boxes|',
  'Rizz Academy|Rizz Diploma|switch|320|desk,locker,plant|chips,duck|',
  'BOSS: Giant Grimace Mech|Grimace Core|boss|275|shake,lab|grimace|boss=grimace',
  'Very Demure Very Mindful Museum|Mindful Teacup|lasers|95|pillar,statue,plant|wrap,boxes|strict=1.6;statue=Very Mindful Bust',
  'Brat Neon Warehouse|Brat Lime Record|heist|85|crate,neon|boxes,chips|',
  'Hawk Tuah Car Wash|Golden Sponge|heist|190|car,neon|duck,wrap|',
  'Man vs. Bear Woods|Picnic Basket|collect|110|tree,rock|chips,boxes|bears=1',
  'Guy in Finance Tower|Trust Fund Briefcase|hack|220|desk,monitor,plant|wrap,chips|',
  'Dubai Chocolate Vault|Dubai Chocolate Bar|lasers|30|chocolate,crate|dubai,wrap|',
  'Chill Guy Park|Chill Guy Hoodie|heist|120|tree,bench|duck,chips|statue=Chill Guy',
  'Moo Deng Sanctuary|Moo Deng Plushie|collect|340|hippo,rock,tree|moodeng,duck|statue=Moo Deng',
  'Balkan Rage Dojo|Golden Slipper|switch|0|mat,pillar|boxes,wrap|',
  'BOSS: Ultra-Demure Security Bot|Demure Chip|boss|95|pillar,monitor|wrap|boss=demurebot;strict=1.4',
  'Aura Farming Rooftop|Aura Orb|hack|185|vent,neon,antenna|wrap,chips|',
  'Looksmaxxing Gym|Jawline Dumbbell|heist|15|dumbbell,mirror,mat|boxes,duck|',
  '6-7 Meme Factory|6-7 Master Tape|switch|50|crate,conveyor,neon|boxes,chips|statue=6-7 Kid',
  'Crashout Arcade|Crashout Tokens|collect|290|arcade,neon|chips,wrap|',
  'Delulu Dreamscape|Delulu Pillow|heist|300|cloud,bed|duck,wrap|',
  'Mewing Streak Temple|Mewing Scroll|lasers|45|pillar,statue,plant|boxes,duck|statue=Mewing Monk',
  'Italian Brainrot Pizzeria|Tralalero Sneaker|heist|10|pizza,table,statue|chips,dubai|statue=Bombardiro Crocodilo,Tralalero Tralala',
  'Turkish Quandale Diner|Quandale Kebab|collect|25|table,chair,plant|chips,boxes|statue=Quandale Dingle',
  'Low Taper Fade Barbershop|Golden Clippers|heist|210|chair,mirror|wrap,duck|',
  'BOSS: Supreme Aura Farmer|Supreme Aura Crystal|boss|185|neon,pillar|wrap|boss=aurafarmer',
  'Suspect Running Challenge Mall|Suspect Hoodie|heist|200|bench,plant,neon|chips,duck|',
  'Propaganda I\u2019m Not Falling For HQ|Propaganda Tape|hack|0|monitor,desk,tv|wrap,chips|',
  'Group 7 Secret Bunker|Group 7 Keycard|switch|90|crate,monitor|boxes,wrap|',
  'Chopped Chin Castle|Chin Crown|heist|260|pillar,statue,banner|boxes,chips|statue=Chopped Chin King',
  'Brainrot Quiz Show|Quiz Trophies|collect|300|tv,neon,chair|ringspk,wrap|',
  'Cooked Kitchen|Cooked Spatula|heist|20|table,stove|chips,dubai|',
  'Glazing Bakery|Glazed Donut|collect|35|table,donut|chips,duck|',
  'Sigma Boy Submarine|Sigma Periscope|hack|195|pipe,monitor,crate|boxes,wrap|',
  'Unbothered Capybara Spa|Capybara Orange|heist|160|hottub,plant|duck,moodeng|statue=Unbothered Capybara',
  'BOSS: Mega Brainrot Overlord|Brainrot Core|boss|300|statue,neon|wrap,ringspk|boss=overlord;statue=Bombardiro Crocodilo,Tralalero Tralala',
  'Larping Luxury Penthouse|Fake Rolex|hack|45|couch,plant,tv|wrap,chips|',
  'Rage-Bait Studio|Rage-Bait Script|heist|0|ringlight,tv,chair|ringspk,wrap|',
  'AI Slop Factory|AI Slop Cartridges|switch|170|conveyor,monitor,crate|boxes,chips|',
  'Unc\u2019s Retro Basement|Unc\u2019s Game Boy|collect|30|couch,arcade,tv|chips,boxes|',
  'Speedrun Obby Tower|Speedrun Medal|heist|130|obby,neon|wrap,duck|',
  'Dripmaxxing Sneaker Vault|Grail Sneakers|lasers|280|crate,neon,statue|wrap,boxes|statue=Drip Mannequin',
  'Zero-Gravity TikTok Live Space Station|Galaxy Gift|hack|230|pipe,monitor,antenna|wrap,ringspk|lowgrav=1',
  'Cursed Algorithm Server Room|Cursed Algorithm Key|switch|160|server,monitor|wrap,chips|',
  'Midnight Dupe Market|Dupe Bags|collect|265|crate,table,neon|chips,dubai|',
  'BOSS: The Algorithm Core|Algorithm Core|boss|190|server,neon|wrap,ringspk|boss=algo'
];
// Chapter 6: Nightmare night-vision remixes (faster drones, laser grids, double tokens)
const REMIX = [1, 2, 11, 16, 23, 27, 32, 42, 46];
// Chapter 7: Creator Gauntlet
const CREATOR_ROWS = [
  'Creator Gauntlet: Unboxing Warehouse|Mystery Box|heist|35|crate,ringlight|boxes,wrap|',
  'Creator Gauntlet: Mukbang Kitchen|Golden Chopsticks|collect|15|table,stove|chips,dubai|',
  'Creator Gauntlet: GRWM Vanity|Diamond Lip Gloss|lasers|330|mirror,chair,ringlight|wrap,duck|',
  'Creator Gauntlet: Podcast Bunker|Golden Mic|hack|220|monitor,couch|ringspk,wrap|',
  'Creator Gauntlet: Fit Check Runway|Runway Trophy|heist|300|neon,statue|wrap,chips|statue=Fit Check Mannequin',
  'Creator Gauntlet: Reaction Channel Lair|Reaction Cam|switch|190|tv,monitor,chair|ringspk,boxes|',
  'Creator Gauntlet: Dance Challenge Stage|Dance Crown|collect|280|neon,ringlight|wrap,duck|',
  'Creator Gauntlet: Prank Channel Warehouse|Whoopee Cushion Prime|lasers|90|crate,conveyor|boxes,chips|',
  'Creator Gauntlet: Collab House Mansion|Collab Contract|hack|45|couch,plant,tv|wrap,moodeng|',
  'BOSS: The Final CEO of TikTok Penthouse|Viral Crown|boss|45|couch,neon,statue|wrap,ringspk|boss=ceo;statue=CEO Bust'
];
const BOSSES = {
  grimace: { name: 'Giant Grimace Mech', hp: 700, skin: 0x8e44ad, shirt: 0x6c3483, pants: 0x4a235a, eye: 0xffffff, size: 2.2, color: '#b085f5', blob: 0x9b59b6, mech: true },
  demurebot: { name: 'Ultra-Demure Security Bot', hp: 900, skin: 0xeceff1, shirt: 0x90a4ae, pants: 0x546e7a, eye: 0x35e7ff, glowEye: true, size: 2, color: '#b0bec5', blob: 0x35e7ff, mech: true },
  aurafarmer: { name: 'Supreme Aura Farmer', hp: 1100, skin: 0xffcc80, shirt: 0x00bcd4, pants: 0x283593, eye: 0x35e7ff, glowEye: true, size: 2, color: '#35e7ff', blob: 0x35e7ff, aura: true, shades: true },
  overlord: { name: 'Mega Brainrot Overlord', hp: 1300, skin: 0x7cb342, shirt: 0x5d4037, pants: 0x3e2723, eye: 0xff1744, glowEye: true, size: 2.4, color: '#7cb342', blob: 0xff3dbb, crown: true },
  algo: { name: 'The Algorithm Core', hp: 1500, skin: 0x212121, shirt: 0xff3dbb, pants: 0x35e7ff, eye: 0xffffff, glowEye: true, size: 2.2, color: '#ff3dbb', blob: 0xff3dbb, mech: true },
  night: { name: 'Night-Vision Skibidi Overlord', hp: 1500, skin: 0xeeeeee, shirt: 0x2e7d32, pants: 0x1b5e20, eye: 0x76ff03, glowEye: true, size: 2.3, color: '#76ff03', blob: 0x76ff03 },
  ceo: { name: 'The Final CEO of TikTok', hp: 2000, skin: 0xffcc80, shirt: 0x111111, pants: 0x111111, eye: 0x111111, size: 2.3, color: '#ffd23f', blob: 0xff3dbb, crown: true, shades: true }
};

function parseRow(s, n, chapter) {
  const [name, item, type, hue, props, traps, flags] = s.split('|'); const f = {};
  (flags || '').split(';').filter(Boolean).forEach(kv => { const [k, v] = kv.split('='); f[k] = v; });
  return { n, chapter, name, item, type, hue: +hue, props: props.split(','), traps: traps.split(','), strict: f.strict ? +f.strict : 1, statues: f.statue ? f.statue.split(',') : [], boss: f.boss || null, bears: !!f.bears, lowgrav: !!f.lowgrav };
}
const MISSIONS = [];
MISSION_ROWS.forEach((r, i) => MISSIONS.push(parseRow(r, i + 1, Math.floor(i / 10) + 1)));
REMIX.forEach((src, i) => { const b = MISSIONS[src - 1]; MISSIONS.push(Object.assign({}, b, { n: 51 + i, chapter: 6, name: 'Nightmare: ' + b.name, nightmare: true, statues: b.statues.slice(), props: b.props.slice(), traps: b.traps.slice(), type: b.type === 'boss' ? 'heist' : b.type, boss: null })); });
MISSIONS.push(Object.assign(parseRow('BOSS: Night-Vision Skibidi Overlord|Night-Vision Goggles|boss|120|toilet,server|wrap,grimace|boss=night', 60, 6), { nightmare: true }));
CREATOR_ROWS.forEach((r, i) => MISSIONS.push(parseRow(r, 61 + i, 7)));
MISSIONS.forEach(m => {
  const n = m.n, c = m.chapter;
  m.diff = Math.min(1, (n - 1) / 69);
  m.lasers = m.type === 'lasers' || c >= 5 || m.nightmare || (c >= 2 && n % 3 === 0);
  m.cameras = c >= 2 || n % 4 === 0;
  m.drones = m.nightmare || c >= 5 || (c >= 3 && n % 5 === 0);
  m.targetTime = Math.round(70 + m.diff * 80 + (m.type === 'collect' ? 30 : 0) + (m.type === 'boss' ? 60 : 0));
  m.timer = m.type === 'switch' ? Math.round(130 + m.diff * 60) : 0;
  m.cash = Math.round(120 + n * 18 + (m.boss ? 300 : 0));
  m.tokens = 6 + Math.floor(n / 7) + (m.boss ? 10 : 0) + (n === 70 ? 250 : 0);
  if (m.nightmare) m.tokens *= 2;
});
const CLASSIC = [
  Object.assign(parseRow('Midnight Snack Heist|Golden Taco|heist|30|table,stove,crate|chips,duck|', 'c1', 0), { diff: 0.05 }),
  Object.assign(parseRow('Laser Museum Mayhem|Crystal Sneaker|lasers|220|pillar,statue|wrap,boxes|statue=Crystal Sneaker Bust', 'c2', 0), { diff: 0.2 }),
  Object.assign(parseRow('Secret Toy Factory|Toy Factory Switches|switch|50|conveyor,crate,duckpile|duck,boxes|', 'c3', 0), { diff: 0.25 }),
  Object.assign(parseRow('Rizzler\u2019s Penthouse Vault|Diamond Crown|hack|45|couch,plant,tv|wrap,chips|statue=The Rizzler', 'c4', 0), { diff: 0.35 })
];
CLASSIC.forEach(m => { m.lasers = m.type === 'lasers' || m.n === 'c4'; m.cameras = true; m.drones = false; m.targetTime = 100; m.timer = m.type === 'switch' ? 150 : 0; m.cash = 260; m.tokens = 8; });
const GAUNTLET = Object.assign(parseRow('Endless Survival Gauntlet|Golden Taco|gauntlet|300|crate,neon,pillar|chips,duck,wrap,moodeng|', 'gauntlet', 0), { diff: 0.2, lasers: false, cameras: true, drones: false, targetTime: 0, timer: 0, cash: 0, tokens: 0 });
const missionById = id => (typeof id === 'number' || /^\d+$/.test(id)) ? MISSIONS[+id - 1] : id === 'gauntlet' ? GAUNTLET : CLASSIC.find(m => m.n === id);
/* ---------- Procedural level generator (deterministic per mission) ---------- */
// grid values: 0 floor · 1 wall · 2 solid prop (blocks movement + sight)
function generateLevel(m, seedExtra = 0) {
  const R = mulberry(hashStr('sneak' + m.n + ':' + seedExtra)), ri = (a, b) => a + Math.floor(R() * (b - a + 1)), rpick = a => a[Math.floor(R() * a.length)];
  const boss = m.type === 'boss', d = m.diff || 0;
  const W = boss ? 26 : 20 + Math.round(d * 10) + ri(0, 3), H = boss ? 24 : 18 + Math.round(d * 8) + ri(0, 3);
  const grid = new Uint8Array(W * H).fill(1), id = (x, y) => y * W + x, inb = (x, y) => x > 0 && y > 0 && x < W - 1 && y < H - 1;
  const rooms = [];
  const fits = (r) => { if (r.x < 1 || r.y < 1 || r.x + r.w > W - 1 || r.y + r.h > H - 1) return false; return rooms.every(o => r.x + r.w + 1 < o.x || o.x + o.w + 1 < r.x || r.y + r.h + 1 < o.y || o.y + o.h + 1 < r.y); };
  if (boss) rooms.push({ x: 8, y: 7, w: 10, h: 10 });
  const want = boss ? 6 : 6 + Math.round(d * 4) + (m.type === 'collect' ? 1 : 0);
  for (let t = 0; t < 400 && rooms.length < want; t++) { const r = { x: ri(1, W - 8), y: ri(1, H - 7), w: ri(3, 7), h: ri(3, 6) }; if (fits(r)) rooms.push(r); }
  rooms.forEach(r => { r.cx = r.x + (r.w >> 1); r.cy = r.y + (r.h >> 1); for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) grid[id(x, y)] = 0; });
  const carve = (x, y) => { if (inb(x, y)) grid[id(x, y)] = 0; };
  const corridor = (a, b, wide) => {
    let x = a.cx, y = a.cy; const hFirst = R() < 0.5;
    const stepX = () => { while (x !== b.cx) { carve(x, y); if (wide) carve(x, y + 1); x += Math.sign(b.cx - x); } };
    const stepY = () => { while (y !== b.cy) { carve(x, y); if (wide) carve(x + 1, y); y += Math.sign(b.cy - y); } };
    if (hFirst) { stepX(); stepY(); } else { stepY(); stepX(); } carve(x, y);
  };
  const order = rooms.slice().sort((a, b) => a.cx - b.cx || a.cy - b.cy);
  // nearest-neighbour chain keeps corridors short, plus a couple of loops for flanking routes
  const linked = [order[0]], rest = order.slice(1);
  while (rest.length) { let bi = 0, bj = 0, bd = 1e9; for (let i = 0; i < linked.length; i++) for (let j = 0; j < rest.length; j++) { const dd = Math.abs(linked[i].cx - rest[j].cx) + Math.abs(linked[i].cy - rest[j].cy); if (dd < bd) { bd = dd; bi = i; bj = j; } } corridor(linked[bi], rest[bj], R() < 0.3); linked.push(rest.splice(bj, 1)[0]); }
  for (let k = 0; k < 2 + Math.round(d * 2); k++) { const a = rpick(rooms), b = rpick(rooms); if (a !== b) corridor(a, b, false); }

  const bfs = (sx, sy) => { const dist = new Int16Array(W * H).fill(-1), q = [id(sx, sy)]; dist[q[0]] = 0; for (let h = 0; h < q.length; h++) { const c = q[h], x = c % W, y = (c / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, n = id(nx, ny); if (nx >= 0 && ny >= 0 && nx < W && ny < H && grid[n] === 0 && dist[n] < 0) { dist[n] = dist[c] + 1; q.push(n); } } } return dist; };
  // start = room furthest from the "centre of mass"; objective = furthest room from start
  let startRoom = order[0];
  if (boss) startRoom = rooms.slice(1).sort((a, b) => (a.cx + a.cy) - (b.cx + b.cy))[0] || rooms[0];
  const d0 = bfs(startRoom.cx, startRoom.cy);
  const byDist = rooms.filter(r => r !== startRoom).sort((a, b) => d0[id(b.cx, b.cy)] - d0[id(a.cx, a.cy)]);
  const far = boss ? rooms[0] : byDist[0];
  const L = { m, W, H, grid, rooms, start: { cx: startRoom.cx, cy: startRoom.cy }, startRoom, exit: { cx: startRoom.cx, cy: startRoom.cy, kind: 'van' }, items: [], switches: [], laptop: null, guards: [], drones: [], cameras: [], lasers: [], hides: [], shadows: [], traps: [], props: [], coins: [], statues: [], bossRoom: boss ? rooms[0] : null };
  const used = new Set([id(L.start.cx, L.start.cy)]);
  const freeCell = (r, avoidWall) => { for (let t = 0; t < 40; t++) { const x = ri(r.x + (avoidWall ? 1 : 0), r.x + r.w - 1 - (avoidWall ? 1 : 0)), y = ri(r.y + (avoidWall ? 1 : 0), r.y + r.h - 1 - (avoidWall ? 1 : 0)); const k = id(x, y); if (grid[k] === 0 && !used.has(k)) { used.add(k); return { cx: x, cy: y }; } } return null; };
  const reserve = (c) => { if (c) used.add(id(c.cx, c.cy)); return c; };
  if (m.type === 'heist' || m.type === 'lasers') L.items.push(reserve({ cx: far.cx, cy: far.cy }));
  else if (m.type === 'collect') byDist.slice(0, 3).forEach(r => L.items.push(reserve(freeCell(r, true) || { cx: r.cx, cy: r.cy })));
  else if (m.type === 'switch') { byDist.slice(0, 3).forEach(r => L.switches.push(reserve(freeCell(r, true) || { cx: r.cx, cy: r.cy }))); }
  else if (m.type === 'hack') {
    const lr = byDist[Math.min(byDist.length - 1, 2)] || far; L.laptop = reserve(freeCell(lr, true) || { cx: lr.cx, cy: lr.cy });
    L.items.push(reserve({ cx: far.cx, cy: far.cy })); L.vaultRoom = far;
    const hr = byDist.find(r => r !== lr && r !== far) || startRoom; L.exit = reserve({ cx: hr.cx, cy: hr.cy, kind: 'heli' });
  } else if (m.type === 'gauntlet') { L.items.push(reserve({ cx: far.cx, cy: far.cy })); }
  if (boss) L.bossSpawn = { cx: rooms[0].cx, cy: rooms[0].cy };

  // statues + props (solid). Each must keep every key spot reachable.
  const keySpots = () => [L.start, L.exit, ...L.items, ...L.switches, L.laptop, L.bossSpawn, ...rooms.map(r => ({ cx: r.cx, cy: r.cy }))].filter(Boolean);
  const reachableAll = () => { const dd = bfs(L.start.cx, L.start.cy); return keySpots().every(k => dd[id(k.cx, k.cy)] >= 0); };
  const tryProp = (c, kind, extra) => { if (!c) return false; const k = id(c.cx, c.cy); if (grid[k] !== 0) return false; grid[k] = 2; if (!reachableAll()) { grid[k] = 0; used.delete(k); return false; } const p = Object.assign({ cx: c.cx, cy: c.cy, kind }, extra || {}); L.props.push(p); return p; };
  m.statues.forEach((name, i) => { const r = rooms[(i * 3 + 1) % rooms.length]; const c = freeCell(r, true); const p = tryProp(c, 'statue', { name, rot: R() * Math.PI * 2 }); if (p) L.statues.push(p); });
  const nProps = Math.round(rooms.length * (1.6 + d));
  for (let i = 0; i < nProps; i++) { const r = rpick(rooms); if (r === startRoom && R() < 0.6) continue; tryProp(freeCell(r, false), rpick(m.props), { rot: Math.floor(R() * 4) * Math.PI / 2 }); }
  // hiding spots (boxes + lockers along walls) and shadow patches
  const nextToWall = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([dx, dy]) => grid[id(x + dx, y + dy)] === 1);
  rooms.forEach((r, i) => {
    const want = (r === startRoom ? 1 : 1 + (R() < 0.5 ? 1 : 0));
    for (let k = 0; k < want; k++) {
      for (let t = 0; t < 20; t++) { const x = ri(r.x, r.x + r.w - 1), y = ri(r.y, r.y + r.h - 1), kk = id(x, y); if (grid[kk] || used.has(kk)) continue; const nw = nextToWall(x, y); used.add(kk); L.hides.push({ cx: x, cy: y, kind: nw && R() < 0.55 ? 'locker' : 'box', face: nw ? Math.atan2(-nw[0], -nw[1]) : 0 }); break; }
    }
    if (R() < 0.55 && r.w >= 4 && r.h >= 4) L.shadows.push({ x: r.x + ri(0, r.w - 3), y: r.y + ri(0, r.h - 3), w: ri(2, 3), h: ri(2, 3) });
  });
  // corridor cells (walls on two opposite sides) - used for traps & lasers
  const corr = []; for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const k = id(x, y); if (grid[k] !== 0 || used.has(k)) continue; const inRoom = rooms.some(r => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h); if (inRoom) continue; const ns = grid[id(x, y - 1)] && grid[id(x, y + 1)], ew = grid[id(x - 1, y)] && grid[id(x + 1, y)]; if (ns || ew) corr.push({ cx: x, cy: y, axis: ns ? 'z' : 'x' }); }
  const shuffled = corr.sort(() => R() - 0.5);
  const nearStart = c => Math.abs(c.cx - L.start.cx) + Math.abs(c.cy - L.start.cy) < 4;
  const nTraps = 3 + Math.round(d * 6) + (m.type === 'gauntlet' ? 4 : 0);
  for (const c of shuffled) { if (L.traps.length >= Math.ceil(nTraps * 0.6)) break; if (nearStart(c)) continue; used.add(id(c.cx, c.cy)); L.traps.push({ cx: c.cx, cy: c.cy, kind: rpick(m.traps), ox: rand(-0.4, 0.4), oz: rand(-0.4, 0.4) }); }
  while (L.traps.length < nTraps) { const r = rpick(rooms); if (r === startRoom) continue; const c = freeCell(r, false); if (!c) break; L.traps.push({ cx: c.cx, cy: c.cy, kind: rpick(m.traps), ox: rand(-0.5, 0.5), oz: rand(-0.5, 0.5) }); }
  if (m.lasers) {
    const nL = (m.type === 'lasers' ? 4 : 1) + Math.round(d * 3) + (m.nightmare ? 3 : 0);
    for (const c of shuffled) { if (L.lasers.length >= nL) break; if (nearStart(c) || used.has(id(c.cx, c.cy))) continue; used.add(id(c.cx, c.cy)); L.lasers.push({ cx: c.cx, cy: c.cy, axis: c.axis, on: 1.6 + R() * 1.4, off: 1.2 + R() * 0.8, phase: R() * 4, h: m.nightmare && R() < 0.5 ? 'grid' : (R() < 0.5 ? 'low' : 'mid') }); }
    if (m.type === 'lasers' && L.items[0]) { // laser fence around the prize
      const it = L.items[0]; for (const [dx, dy, ax] of [[1, 0, 'z'], [-1, 0, 'z'], [0, 1, 'x'], [0, -1, 'x']]) { const x = it.cx + dx, y = it.cy + dy; if (grid[id(x, y)] === 0 && !used.has(id(x, y))) { used.add(id(x, y)); L.lasers.push({ cx: x, cy: y, axis: ax, on: 2.2, off: 1.6, phase: (dx + dy + 2) * 0.9, h: 'mid' }); } }
    }
  }
  // guards with patrol loops through 2-3 rooms
  const nG = boss ? 2 + Math.round(d * 2) : 3 + Math.round(d * 6) + (m.type === 'collect' ? 1 : 0) + (m.type === 'gauntlet' ? -1 : 0);
  const others = rooms.filter(r => r !== startRoom);
  for (let g = 0; g < nG; g++) {
    const home = others[g % others.length] || rooms[0];
    const pts = [freeCellLoose(home)]; const hops = R() < 0.25 ? 0 : ri(1, 2);
    for (let k = 0; k < hops; k++) { const r = rpick(others); pts.push(freeCellLoose(r)); }
    L.guards.push({ pts: pts.filter(Boolean), sentry: hops === 0, look: R() * Math.PI * 2 });
  }
  function freeCellLoose(r) { for (let t = 0; t < 30; t++) { const x = ri(r.x, r.x + r.w - 1), y = ri(r.y, r.y + r.h - 1); if (grid[id(x, y)] === 0 && Math.abs(x - L.start.cx) + Math.abs(y - L.start.cy) > 5) return { cx: x, cy: y }; } return { cx: r.cx, cy: r.cy }; }
  if (m.drones) { const nd = 1 + Math.round(d * 2) + (m.nightmare ? 1 : 0); for (let k = 0; k < nd; k++) { const a = rpick(others), b = rpick(others); L.drones.push({ pts: [{ cx: a.cx, cy: a.cy }, { cx: b.cx, cy: b.cy }] }); } }
  if (m.cameras) {
    const nc = 1 + Math.round(d * 3);
    for (let k = 0; k < nc * 3 && L.cameras.length < nc; k++) {
      const r = rpick(others); const corners = [[r.x, r.y, Math.PI * 0.25 + Math.PI], [r.x + r.w - 1, r.y, Math.PI * 0.75 + Math.PI], [r.x, r.y + r.h - 1, -Math.PI * 0.25 + Math.PI], [r.x + r.w - 1, r.y + r.h - 1, Math.PI * 0.25]];
      const [x, y] = rpick(corners); if (L.cameras.some(c => c.cx === x && c.cy === y)) continue;
      // face toward room centre
      const ang = Math.atan2(r.cx - x, r.cy - y); L.cameras.push({ cx: x, cy: y, ang, sweep: 0.8 + R() * 0.4, speed: 0.5 + R() * 0.4 + d * 0.3 });
    }
  }
  for (let i = 0; i < 8 + Math.round(d * 6); i++) { const c = freeCell(rpick(rooms), false); if (c) L.coins.push(c); }
  { const dF = bfs(L.start.cx, L.start.cy); L.guards.forEach(g => { g.pts = g.pts.filter(p => dF[id(p.cx, p.cy)] >= 0); }); L.guards = L.guards.filter(g => g.pts.length); L.coins = L.coins.filter(c => c.cx == null || dF[id(c.cx, c.cy)] >= 0); }
  L.bfs = bfs; L.id = id;
  return L;
}
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

/* ---------- Theme palette ---------- */
function hsl(h, s, l) { return new THREE.Color().setHSL(((h % 360) + 360) % 360 / 360, s, l).getHex(); }
function palette(m) {
  const h = m.hue, nm = m.nightmare;
  return { floor: hsl(h, 0.25, nm ? 0.16 : 0.42), floor2: hsl(h + 15, 0.3, nm ? 0.12 : 0.36), wall: hsl(h, 0.35, nm ? 0.2 : 0.58), trim: hsl(h + 40, 0.9, 0.6), accent: hsl(h + 180, 0.8, 0.55), sky: nm ? 0x020a04 : hsl(h, 0.45, 0.82) };
}
const cellX = cx => cx * CELL + CELL / 2, cellZ = cy => cy * CELL + CELL / 2;

/* ---------- Agent (player) + guard models ---------- */
function makeAgent(sk) {
  const c = makeChar({ skin: sk.skin, shirt: sk.shirt, pants: sk.pants, eye: 0x111111, shades: sk.shades, crown: sk.crown, ghost: sk.ghost, glow: sk.glow || 0 });
  if (sk.mask) { box(0.52, 0.2, 0.52, lam(sk.mask), 0, -0.1, 0, c.head); box(0.54, 0.08, 0.54, lam(sk.band), 0, 0.14, 0, c.head); box(0.08, 0.06, 0.3, lam(sk.band), 0.08, 0.14, 0.38, c.head); }
  if (sk.boxHead) { const bm = lam(0xc8a06a); box(0.66, 0.6, 0.66, bm, 0, 0.04, 0, c.head); box(0.4, 0.1, 0.03, basic(0x111111), 0, 0.06, -0.34, c.head, false); box(0.68, 0.06, 0.1, lam(0x9c7a4a), 0, 0.3, 0, c.head); }
  if (sk.banana) { const y = lam(0xffe066); box(0.3, 0.4, 0.3, y, 0, 0.42, 0.05, c.head); box(0.14, 0.14, 0.14, lam(0x6d4c41), 0, 0.68, 0.08, c.head); }
  if (sk.glow) { box(0.5, 0.08, 0.04, basic(sk.glow), 0, 0.05, -0.27, c.head, false); }
  return c;
}
function makeGuard(m, kind) {
  if (kind === 'bear') { const c = makeChar({ skin: 0x6d4c41, shirt: 0x5d4037, pants: 0x4e342e, eye: 0x111111 }); box(0.16, 0.16, 0.1, lam(0x4e342e), -0.2, 0.3, 0, c.head); box(0.16, 0.16, 0.1, lam(0x4e342e), 0.2, 0.3, 0, c.head); box(0.24, 0.16, 0.12, lam(0xbcaaa4), 0, -0.1, -0.29, c.head, false); return c; }
  const shirt = m.nightmare ? 0x1b3a1b : hsl(m.hue + 200, 0.45, 0.32);
  const c = makeChar({ skin: pick([0xffcc80, 0xe0ac69, 0x8d5524, 0xf1c27d]), shirt, pants: 0x1c2333, eye: 0x111111, cap: 0x1c2333 });
  box(0.16, 0.12, 0.04, basic(0xffd23f), -0.16, 1.32, -0.19, c.body, false); // badge
  box(0.12, 0.4, 0.12, lam(0x111111), 0.1, -0.2, -0.18, c.armR); // flashlight
  return c;
}
function makeDrone() {
  const g = new THREE.Group(); box(0.8, 0.22, 0.8, lam(0x263238), 0, 0, 0, g); box(0.3, 0.2, 0.3, basic(0xff1744), 0, -0.16, -0.3, g, false);
  for (const [x, z] of [[-0.55, -0.55], [0.55, -0.55], [-0.55, 0.55], [0.55, 0.55]]) { box(0.08, 0.1, 0.08, lam(0x111111), x, 0.12, z, g); const p = box(0.7, 0.02, 0.1, lam(0xb0bec5), x, 0.2, z, g, false); p.userData.prop = 1; }
  return g;
}

/* ---------- Props (all fit in one 2x2 cell) ---------- */
function propMesh(kind, P) {
  const g = new THREE.Group(), L = c => lam(c), A = lam(P.accent), T = lam(P.trim), glow = c => basic(c);
  const b = (w, h, d, mat, x = 0, y = 0, z = 0) => box(w, h, d, mat, x, y, z, g);
  switch (kind) {
    case 'shake': b(0.7, 1.1, 0.7, L(0x8e44ad), 0, 0.55); b(0.8, 0.12, 0.8, L(0xffffff), 0, 1.15); b(0.08, 0.8, 0.08, L(0xff4081), 0.15, 1.5); break;
    case 'lab': b(1.6, 0.9, 0.9, L(0xeceff1), 0, 0.45); for (let i = -1; i <= 1; i++) b(0.2, 0.4, 0.2, glow([0x76ff03, 0x35e7ff, 0xff3dbb][i + 1]), i * 0.45, 1.1); break;
    case 'toilet': b(0.7, 0.5, 0.9, L(0xffffff), 0, 0.25); b(0.7, 0.8, 0.25, L(0xffffff), 0, 0.8, 0.35); { const h = new THREE.Group(); h.position.set(0, 1.4, 0.1); g.add(h); box(0.42, 0.42, 0.42, L(0xffcc80), 0, 0, 0, h); box(0.3, 0.06, 0.03, L(0x3e2723), 0, -0.1, -0.22, h); } break;
    case 'mirror': b(1.4, 1.8, 0.12, L(0x90a4ae), 0, 1.1); b(1.2, 1.6, 0.04, glow(0xb3e5fc), 0, 1.1, -0.07); b(1.4, 0.2, 0.5, L(0xeceff1), 0, 0.5); break;
    case 'train': b(1.8, 1.7, 1.2, L(P.accent), 0, 0.95); b(1.7, 0.5, 1.22, glow(0xfff59d), 0, 1.3); b(1.9, 0.2, 1.3, L(0x37474f), 0, 0.1); break;
    case 'bench': b(1.6, 0.12, 0.6, L(0x8d6e63), 0, 0.5); b(1.6, 0.5, 0.1, L(0x8d6e63), 0, 0.8, 0.28); b(0.1, 0.5, 0.5, L(0x37474f), -0.7, 0.25); b(0.1, 0.5, 0.5, L(0x37474f), 0.7, 0.25); break;
    case 'corn': b(0.5, 1.4, 0.5, L(0xffd54f), 0, 0.7); b(0.6, 1, 0.2, L(0x7cb342), 0, 0.6, 0.3); break;
    case 'table': b(1.6, 0.12, 1.2, L(0xffffff), 0, 0.8); b(0.12, 0.8, 0.12, L(0x5d4037), -0.65, 0.4, -0.45); b(0.12, 0.8, 0.12, L(0x5d4037), 0.65, 0.4, 0.45); b(0.12, 0.8, 0.12, L(0x5d4037), 0.65, 0.4, -0.45); b(0.12, 0.8, 0.12, L(0x5d4037), -0.65, 0.4, 0.45); b(0.4, 0.15, 0.4, L(P.accent), -0.3, 0.93); b(0.3, 0.2, 0.3, L(0xff7043), 0.35, 0.95); break;
    case 'plate': b(1.4, 0.8, 1, L(0xfafafa), 0, 0.4); b(0.4, 0.1, 0.4, L(0xffcc80), -0.3, 0.85); b(0.25, 0.12, 0.25, L(0xff8a65), 0.3, 0.86); break;
    case 'plant': b(0.6, 0.6, 0.6, L(0x8d6e63), 0, 0.3); b(0.9, 1, 0.9, L(0x43a047), 0, 1.1); b(0.6, 0.5, 0.6, L(0x66bb6a), 0, 1.8); break;
    case 'pillar': b(0.9, 2.9, 0.9, L(0xeeeeee), 0, 1.45); b(1.2, 0.25, 1.2, L(0xe0e0e0), 0, 0.12); b(1.2, 0.25, 1.2, L(0xe0e0e0), 0, 2.85); break;
    case 'ringlight': { const r = mesh(new THREE.TorusGeometry(0.5, 0.08, 6, 20), glow(0xffffff), 0, 1.9, 0, g); r.rotation.y = Math.PI / 2; b(0.08, 1.4, 0.08, L(0x212121), 0, 0.7); b(0.6, 0.06, 0.6, L(0x212121), 0, 0.03); b(0.16, 0.3, 0.04, L(0x111111), 0, 1.9); } break;
    case 'tv': b(1.6, 1, 0.15, L(0x111111), 0, 1.3); b(1.45, 0.85, 0.04, glow(P.accent), 0, 1.3, -0.09); b(0.2, 0.8, 0.2, L(0x212121), 0, 0.4); break;
    case 'chair': b(0.7, 0.12, 0.7, L(P.accent), 0, 0.5); b(0.7, 0.8, 0.12, L(P.accent), 0, 0.9, 0.3); b(0.1, 0.5, 0.1, L(0x212121), 0, 0.25); break;
    case 'mushroom': b(0.4, 0.9, 0.4, L(0xfff8e1), 0, 0.45); b(1.4, 0.5, 1.4, L(0x1e88e5), 0, 1.1); b(0.2, 0.06, 0.2, L(0xffffff), 0.3, 1.36, 0.2); b(0.2, 0.06, 0.2, L(0xffffff), -0.35, 1.36, -0.2); break;
    case 'tree': b(0.45, 1.4, 0.45, L(0x6d4c41), 0, 0.7); b(1.5, 1.2, 1.5, L(P.nm ? 0x1b5e20 : 0x388e3c), 0, 1.9); b(1, 0.7, 1, L(0x43a047), 0, 2.7); break;
    case 'rock': b(1.3, 0.8, 1.1, L(0x78909c), 0, 0.4); b(0.8, 0.5, 0.7, L(0x90a4ae), 0.15, 0.95); break;
    case 'pole': b(0.12, 2.9, 0.12, L(0xffd54f), 0, 1.45); b(0.9, 0.12, 0.9, L(0x9e9e9e), 0, 0.06); break;
    case 'desk': b(1.6, 0.1, 0.9, L(0x8d6e63), 0, 0.8); b(1.5, 0.75, 0.1, L(0x6d4c41), 0, 0.4, 0.38); b(0.6, 0.4, 0.05, glow(0x90caf9), 0, 1.1); break;
    case 'locker': b(1.4, 2.2, 0.7, L(0x607d8b), 0, 1.1); b(0.04, 2, 0.72, L(0x37474f), 0, 1.1); break;
    case 'neon': b(1.6, 0.9, 0.15, L(0x111111), 0, 1.6); b(1.4, 0.12, 0.04, glow(P.trim), 0, 1.8, -0.09); b(1.0, 0.12, 0.04, glow(P.accent), 0, 1.45, -0.09); b(0.2, 1.2, 0.2, L(0x212121), 0, 0.6); break;
    case 'car': b(1.8, 0.7, 1.3, L(P.accent), 0, 0.55); b(1.1, 0.5, 1.2, L(P.accent), -0.1, 1.15); b(1.0, 0.4, 1.22, glow(0xb3e5fc), -0.1, 1.15); for (const [x, z] of [[-0.6, -0.65], [0.6, -0.65], [-0.6, 0.65], [0.6, 0.65]]) b(0.4, 0.4, 0.15, L(0x111111), x, 0.2, z); break;
    case 'monitor': b(1.4, 0.8, 0.8, L(0x37474f), 0, 0.4); b(0.9, 0.6, 0.08, L(0x111111), 0, 1.15); b(0.8, 0.5, 0.04, glow(0x76ff03), 0, 1.15, -0.05); break;
    case 'chocolate': b(1.2, 0.3, 0.7, L(0x5d4037), 0, 0.15); b(1.2, 0.3, 0.7, L(0x6d4c41), 0, 0.45); b(1.0, 0.12, 0.5, L(0x9ccc65), 0, 0.66); break;
    case 'hippo': b(1.4, 0.8, 0.9, L(0xb39ddb), 0, 0.6); b(0.7, 0.6, 0.7, L(0xb39ddb), 0.85, 0.7); b(0.12, 0.12, 0.05, L(0x111111), 1.1, 0.85, -0.2); b(0.2, 0.15, 0.05, L(0xf48fb1), 1.2, 0.6, 0); break;
    case 'mat': b(1.8, 0.08, 1.8, L(0xd32f2f), 0, 0.04); b(0.5, 1.4, 0.5, L(0x5d4037), 0, 0.7); break;
    case 'vent': b(1.2, 0.8, 1.2, L(0x90a4ae), 0, 0.4); b(1, 0.1, 1, L(0x546e7a), 0, 0.85); break;
    case 'antenna': b(0.15, 2.8, 0.15, L(0xb0bec5), 0, 1.4); b(0.25, 0.25, 0.25, glow(0xff1744), 0, 2.9); b(0.8, 0.12, 0.8, L(0x546e7a), 0, 0.06); break;
    case 'dumbbell': b(1.4, 0.12, 0.12, L(0x9e9e9e), 0, 0.5); b(0.25, 0.6, 0.6, L(0x212121), -0.6, 0.5); b(0.25, 0.6, 0.6, L(0x212121), 0.6, 0.5); b(1.6, 0.1, 0.8, L(0x37474f), 0, 0.15); break;
    case 'conveyor': b(1.8, 0.6, 1, L(0x455a64), 0, 0.3); b(1.8, 0.06, 0.9, L(0x212121), 0, 0.62); b(0.4, 0.4, 0.4, L(P.accent), -0.4, 0.85); b(0.4, 0.4, 0.4, L(P.trim), 0.4, 0.85); break;
    case 'arcade': b(0.9, 1.9, 0.8, L(P.accent), 0, 0.95); b(0.7, 0.5, 0.04, glow(0x35e7ff), 0, 1.5, -0.41); b(0.8, 0.12, 0.4, L(0x111111), 0, 1.05, -0.5); break;
    case 'cloud': b(1.6, 0.6, 1.2, L(0xfce4ec), 0, 0.9); b(1, 0.5, 0.8, L(0xffffff), 0.2, 1.4); b(0.25, 0.9, 0.25, L(0xe1bee7), 0, 0.3); break;
    case 'bed': b(1.6, 0.5, 1.8, L(0xf8bbd0), 0, 0.25); b(1.6, 0.3, 0.4, L(0xffffff), 0, 0.6, 0.65); break;
    case 'pizza': b(1.2, 1.2, 1.2, L(0xbf360c), 0, 0.6); b(0.8, 0.5, 0.1, glow(0xffab40), 0, 0.5, -0.61); b(1.4, 0.1, 1.4, L(0xffcc80), 0, 1.25); break;
    case 'banner': b(0.12, 2.8, 0.12, L(0x5d4037), 0, 1.4); b(1, 1.3, 0.05, L(P.accent), 0.5, 2.0); break;
    case 'stove': b(1.4, 0.9, 0.9, L(0xeceff1), 0, 0.45); b(0.3, 0.05, 0.3, glow(0xff5722), -0.35, 0.92); b(0.3, 0.05, 0.3, glow(0xff5722), 0.35, 0.92); b(0.5, 0.3, 0.5, L(0x424242), 0.35, 1.1); break;
    case 'donut': { const t = mesh(new THREE.TorusGeometry(0.5, 0.25, 8, 16), L(0xf48fb1), 0, 1.1, 0, g); t.rotation.y = Math.PI / 2; b(0.8, 0.6, 0.8, L(0xffcc80), 0, 0.3); } break;
    case 'pipe': b(0.4, 2.9, 0.4, L(0x78909c), -0.4, 1.45); b(0.4, 2.9, 0.4, L(0x78909c), 0.4, 1.45); b(1.2, 0.3, 0.5, L(0xffb300), 0, 1.4); break;
    case 'hottub': b(1.7, 0.6, 1.7, L(0x8d6e63), 0, 0.3); b(1.4, 0.1, 1.4, glow(0x4dd0e1), 0, 0.58); break;
    case 'couch': b(1.8, 0.5, 0.9, L(P.accent), 0, 0.35); b(1.8, 0.7, 0.25, L(P.accent), 0, 0.8, 0.35); b(0.25, 0.7, 0.9, L(P.accent), -0.85, 0.55); b(0.25, 0.7, 0.9, L(P.accent), 0.85, 0.55); break;
    case 'obby': b(1.4, 0.4, 1.4, glow(pick([0xff1744, 0x76ff03, 0x35e7ff, 0xffd23f])), 0, 0.2); b(0.9, 0.4, 0.9, L(0xffffff), 0, 0.6); b(0.5, 0.6, 0.5, glow(0xff1744), 0, 1.1); break;
    case 'server': b(1.2, 2.4, 0.9, L(0x212121), 0, 1.2); for (let i = 0; i < 6; i++) b(1.0, 0.05, 0.04, glow(i % 2 ? 0x35e7ff : 0x76ff03), 0, 0.4 + i * 0.35, -0.46); break;
    case 'duckpile': for (let i = 0; i < 5; i++) b(0.4, 0.35, 0.4, L(0xffeb3b), rand(-0.5, 0.5), 0.2 + i * 0.2, rand(-0.5, 0.5)); break;
    default: b(1.3, 1.3, 1.3, L(0xa1887f), 0, 0.65); b(1.32, 0.12, 0.4, L(0x8d6e63), 0, 1.0); b(0.9, 0.9, 0.9, L(0xbcaaa4), 0.15, 1.75); break; // crate
  }
  return g;
}
function statueMesh(name, P) {
  const g = new THREE.Group(), stone = lam(P.nm ? 0x6a8a6a : 0xd7ccc8), gold = lam(0xffd23f, 0x332200), n = name.toLowerCase();
  box(1.5, 0.6, 1.5, lam(0x8d8d8d), 0, 0.3, 0, g); box(1.6, 0.12, 1.6, gold, 0, 0.62, 0, g);
  const top = new THREE.Group(); top.position.y = 0.68; g.add(top);
  const B = (w, h, d, m, x, y, z) => box(w, h, d, m, x, y, z, top);
  if (n.includes('crocodilo')) { const gr = lam(0x689f38); B(0.5, 0.45, 1.5, gr, 0, 0.7, 0); B(0.35, 0.3, 0.6, gr, 0, 0.7, -1.0); B(2.2, 0.08, 0.5, lam(0x90a4ae), 0, 0.85, 0.1); B(0.1, 0.6, 0.4, lam(0x90a4ae), 0, 1.15, 0.7); B(0.08, 0.08, 0.05, basic(0xffeb3b), 0.12, 0.85, -1.31); }
  else if (n.includes('tralalero')) { const bl = lam(0x42a5f5); B(0.55, 0.55, 1.4, bl, 0, 1.2, 0); B(0.1, 0.5, 0.4, bl, 0, 1.6, 0.2); for (const x of [-0.25, 0, 0.25]) { B(0.12, 0.8, 0.12, lam(0x1565c0), x, 0.45, 0); B(0.24, 0.16, 0.36, lam(0xffffff), x, 0.08, -0.06); B(0.24, 0.04, 0.36, lam(0x1565c0), x, 0.17, -0.06); } }
  else if (n.includes('moo deng')) { const p = lam(0x9e8fb2); B(1.0, 0.6, 0.7, p, 0, 0.4, 0); B(0.5, 0.45, 0.5, p, 0, 0.5, -0.55); B(0.15, 0.1, 0.05, lam(0xf48fb1), 0, 0.4, -0.81); }
  else if (n.includes('capybara')) { const p = lam(0xa1887f); B(1.0, 0.6, 0.6, p, 0, 0.4, 0); B(0.45, 0.45, 0.5, p, 0, 0.6, -0.5); B(0.3, 0.3, 0.3, lam(0xff9800), 0, 0.97, -0.5); }
  else if (n.includes('smurf')) { const bl = lam(0x42a5f5); B(0.6, 0.8, 0.5, bl, 0, 0.5, 0); B(0.55, 0.5, 0.5, bl, 0, 1.15, 0); B(0.6, 0.3, 0.6, lam(0xffffff), 0, 1.5, 0.05); B(0.12, 0.2, 0.1, bl, -0.2, 1.45, -0.1); }
  else if (n.includes('sneaker')) { B(0.6, 0.35, 1.1, lam(0xb3e5fc, 0x113344), 0, 0.3, 0); B(0.6, 0.5, 0.5, lam(0xb3e5fc, 0x113344), 0, 0.7, 0.3); }
  else { const c = makeChar({ skin: 0xd7ccc8, shirt: n.includes('rizz') || n.includes('ceo') || n.includes('king') ? 0xffd23f : 0xbcaaa4, pants: 0xa1887f, eye: 0x6d4c41, crown: n.includes('king') || n.includes('ceo') || n.includes('caesar'), shades: n.includes('chill') || n.includes('rizz') || n.includes('drip') }); c.body.scale.setScalar(0.85); top.add(c.root); if (n.includes('6-7')) { c.armL.rotation.z = 2.6; c.armR.rotation.z = -2.6; } }
  const lab = labelSprite('🗿 ' + name, '#ffe36b', 'rgba(20,16,4,.8)', 0.75); lab.position.y = 2.7; g.add(lab);
  return g;
}
function itemMesh(m, i) {
  const g = new THREE.Group(), c = hsl(m.hue + 40 * i, 0.9, 0.58), mat = lam(c, new THREE.Color(c).multiplyScalar(0.35).getHex());
  const core = new THREE.Group(); core.position.y = 1.2; g.add(core);
  box(0.6, 0.6, 0.6, mat, 0, 0, 0, core); const r = mesh(new THREE.TorusGeometry(0.62, 0.05, 6, 24), basic(0xffd23f), 0, 0, 0, core, false); r.rotation.x = Math.PI / 2;
  const pad = mesh(geoCyl(0.8, 0.9, 0.3, 12), lam(0x37474f), 0, 0.15, 0, g); const top = mesh(geoCyl(0.7, 0.7, 0.04, 12), basic(0xffd23f), 0, 0.32, 0, g, false);
  const lab = labelSprite('⭐ ' + m.item, '#ffd23f', 'rgba(10,12,24,.8)', 0.7); lab.position.y = 2.3; g.add(lab);
  g.userData.core = core; return g;
}

/* ---------- Ray casting on the grid (used for sight lines, cones and camera) ---------- */
function solidAt(x, z) { const L = G.level, cx = Math.floor(x / CELL), cy = Math.floor(z / CELL); if (cx < 0 || cy < 0 || cx >= L.W || cy >= L.H) return true; return L.grid[cy * L.W + cx] !== 0; }
function castRay(x, z, dx, dz, max) {
  // DDA through cells; returns distance to the first solid cell (or max)
  const L = G.level; let cx = Math.floor(x / CELL), cy = Math.floor(z / CELL);
  const sx = dx > 0 ? 1 : -1, sz = dz > 0 ? 1 : -1, ix = Math.abs(1 / (dx || 1e-9)) * CELL, iz = Math.abs(1 / (dz || 1e-9)) * CELL;
  let tx = dx > 0 ? ((cx + 1) * CELL - x) / dx : dx < 0 ? (cx * CELL - x) / dx : Infinity, tz = dz > 0 ? ((cy + 1) * CELL - z) / dz : dz < 0 ? (cy * CELL - z) / dz : Infinity;
  for (let i = 0; i < 64; i++) {
    let t; if (tx < tz) { t = tx; tx += ix; cx += sx; } else { t = tz; tz += iz; cy += sz; }
    if (t > max) return max;
    if (cx < 0 || cy < 0 || cx >= L.W || cy >= L.H || L.grid[cy * L.W + cx] !== 0) return t;
  }
  return max;
}
function smokeBlocks(ax, az, bx, bz) {
  for (const s of G.smokes) { const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1; let t = ((s.x - ax) * dx + (s.z - az) * dz) / l2; t = clamp(t, 0, 1); const px = ax + dx * t - s.x, pz = az + dz * t - s.z; if (px * px + pz * pz < s.r * s.r) return true; }
  return false;
}
function canSee(ax, az, bx, bz) { const dx = bx - ax, dz = bz - az, d = Math.hypot(dx, dz); if (d < 0.01) return true; return castRay(ax, az, dx / d, dz / d, d) >= d - 0.05 && !smokeBlocks(ax, az, bx, bz); }

/* ---------- Vision cone fan (clipped by walls) ---------- */
const CONE_SEG = 18;
function makeCone(color) {
  const geo = new THREE.BufferGeometry(), pos = new Float32Array((CONE_SEG + 2) * 3), idx = [];
  for (let i = 1; i <= CONE_SEG; i++) idx.push(0, i, i + 1);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(idx);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide }));
  m.renderOrder = 2; m.frustumCulled = false; return m;
}
function updateCone(cone, x, z, ang, half, range, y = 0.06) {
  const p = cone.geometry.attributes.position.array; p[0] = x; p[1] = y; p[2] = z;
  for (let i = 0; i <= CONE_SEG; i++) { const a = ang - half + (2 * half * i) / CONE_SEG, dx = Math.sin(a), dz = Math.cos(a), d = castRay(x, z, dx, dz, range); p[(i + 1) * 3] = x + dx * d; p[(i + 1) * 3 + 1] = y; p[(i + 1) * 3 + 2] = z + dz * d; }
  cone.geometry.attributes.position.needsUpdate = true; cone.geometry.computeBoundingSphere();
}

/* ---------- Build the 3D level from generated data ---------- */
function floorTex(P, nm) {
  const t = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#' + new THREE.Color(P.floor).getHexString(); g.fillRect(0, 0, w, h); g.fillStyle = '#' + new THREE.Color(P.floor2).getHexString(); g.fillRect(0, 0, w / 2, h / 2); g.fillRect(w / 2, h / 2, w / 2, h / 2); g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 3; g.strokeRect(0, 0, w, h); });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; return t;
}
function buildLevel(L) {
  const m = L.m, P = palette(m); P.nm = !!m.nightmare; G.pal = P;
  const root = new THREE.Group(); G.scene.add(root); G.levelRoot = root;
  G.scene.background.setHex(P.sky); G.scene.fog.color.setHex(P.sky); G.scene.fog.near = m.nightmare ? 6 : 26; G.scene.fog.far = m.nightmare ? 26 : 70;
  G.hemi.intensity = m.nightmare ? 0.35 : 0.9; G.sun.intensity = m.nightmare ? 0.25 : 1.2;
  const fw = L.W * CELL, fh = L.H * CELL, ft = floorTex(P); ft.repeat.set(L.W, L.H);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(fw, fh), new THREE.MeshLambertMaterial({ map: ft })); floor.rotation.x = -Math.PI / 2; floor.position.set(fw / 2, 0, fh / 2); floor.receiveShadow = true; root.add(floor);
  // walls: only cells touching floor (instanced)
  const cells = []; for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) { if (L.grid[y * L.W + x] !== 1) continue; let edge = false; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < L.W && ny < L.H && L.grid[ny * L.W + nx] !== 1) edge = true; } if (edge) cells.push([x, y]); }
  const wm = new THREE.InstancedMesh(geoBox(CELL, WALL_H, CELL), lam(P.wall), cells.length), tm = new THREE.InstancedMesh(geoBox(CELL + 0.02, 0.22, CELL + 0.02), basic(P.trim), cells.length), mtx = new THREE.Matrix4();
  cells.forEach(([x, y], i) => { mtx.makeTranslation(cellX(x), WALL_H / 2, cellZ(y)); wm.setMatrixAt(i, mtx); mtx.makeTranslation(cellX(x), WALL_H + 0.1, cellZ(y)); tm.setMatrixAt(i, mtx); });
  wm.castShadow = wm.receiveShadow = true; root.add(wm, tm);
  // shadows (dark floor patches)
  L.shadows.forEach(s => { const p = new THREE.Mesh(geoBox(s.w * CELL, 0.02, s.h * CELL), basic(0x000000, { transparent: true, opacity: 0.55, depthWrite: false })); p.position.set(s.x * CELL + s.w * CELL / 2, 0.03, s.y * CELL + s.h * CELL / 2); root.add(p); });
  // props + statues
  L.props.forEach(p => { const g = p.kind === 'statue' ? statueMesh(p.name || 'Golden Trophy', P) : propMesh(p.kind, P); g.position.set(cellX(p.cx), 0, cellZ(p.cy)); g.rotation.y = p.rot || 0; root.add(g); });
  // hiding spots
  G.hides = L.hides.map(h => { const g = new THREE.Group(); if (h.kind === 'box') { box(1.3, 1.25, 1.3, lam(0xc8a06a), 0, 0.62, 0, g); box(1.32, 0.12, 0.3, lam(0xe0c48f), 0, 1.25, 0, g); box(0.3, 0.3, 0.02, basic(0x5d4037), 0, 0.8, -0.66, g, false); } else { box(1.1, 2.3, 0.9, lam(0x607d8b), 0, 1.15, 0, g); box(0.9, 0.06, 0.02, basic(0x263238), 0, 1.8, -0.46, g, false); box(0.9, 0.06, 0.02, basic(0x263238), 0, 1.65, -0.46, g, false); box(0.1, 0.3, 0.06, lam(0xcfd8dc), 0.35, 1.1, -0.48, g); } g.position.set(cellX(h.cx), 0, cellZ(h.cy)); g.rotation.y = h.face || 0; root.add(g); return Object.assign({}, h, { x: cellX(h.cx), z: cellZ(h.cy), mesh: g }); });
  // sound traps
  G.traps = L.traps.map(t => { const d = TRAPS[t.kind] || TRAPS.chips, g = new THREE.Group(); box(0.5, 0.18, 0.5, lam(d.color), 0, 0.09, 0, g); if (t.kind === 'duck' || t.kind === 'moodeng') box(0.25, 0.22, 0.25, lam(d.color), 0.08, 0.3, 0, g); if (t.kind === 'boxes') { box(0.6, 0.6, 0.6, lam(0xa1887f), 0, 0.3, 0, g); box(0.45, 0.45, 0.45, lam(0xbcaaa4), 0.05, 0.82, 0, g); } if (t.kind === 'wrap') { g.children[0].scale.set(2.2, 0.15, 2.2); } if (t.kind === 'grimace') { g.children[0].scale.set(2.4, 0.1, 1.8); } if (t.kind === 'ringspk') box(0.1, 0.6, 0.1, lam(0x212121), 0, 0.4, 0, g); const x = cellX(t.cx) + t.ox, z = cellZ(t.cy) + t.oz; g.position.set(x, 0, z); root.add(g); return { x, z, kind: t.kind, d, mesh: g, cd: 0, r: t.kind === 'wrap' || t.kind === 'grimace' ? 0.95 : 0.6 }; });
  // coins
  G.coins = L.coins.map(c => { const g = mesh(geoCyl(0.32, 0.32, 0.08, 12), lam(0xffd23f, 0x664d00), cellX(c.cx), 0.7, cellZ(c.cy), root); g.rotation.x = Math.PI / 2; return { x: cellX(c.cx), z: cellZ(c.cy), mesh: g, got: false }; });
  // objectives
  G.items = L.items.map((it, i) => { const g = itemMesh(m, i); g.position.set(cellX(it.cx), 0, cellZ(it.cy)); root.add(g); return { x: cellX(it.cx), z: cellZ(it.cy), mesh: g, got: false, locked: m.type === 'hack' }; });
  G.switches = L.switches.map(s => { const g = new THREE.Group(); box(0.8, 1.1, 0.5, lam(0x455a64), 0, 0.55, 0, g); const lamp = box(0.3, 0.3, 0.3, basic(0xff1744), 0, 1.3, 0, g, false); const lever = box(0.1, 0.6, 0.1, lam(0xffd23f), 0, 1.0, -0.3, g); lever.rotation.x = 0.6; const lab = labelSprite('🔌 SWITCH', '#ffd23f', 'rgba(10,12,24,.8)', 0.6); lab.position.y = 2.1; g.add(lab); g.position.set(cellX(s.cx), 0, cellZ(s.cy)); root.add(g); return { x: cellX(s.cx), z: cellZ(s.cy), mesh: g, lamp, lever, on: false }; });
  if (L.laptop) { const g = new THREE.Group(); box(1.2, 0.8, 0.8, lam(0x6d4c41), 0, 0.4, 0, g); box(0.7, 0.05, 0.5, lam(0x9e9e9e), 0, 0.83, 0, g); const scr = box(0.7, 0.45, 0.04, basic(0x35e7ff), 0, 1.08, 0.23, g, false); scr.rotation.x = -0.25; const lab = labelSprite('💻 HACK ME', '#35e7ff', 'rgba(10,12,24,.8)', 0.6); lab.position.y = 1.9; g.add(lab); g.position.set(cellX(L.laptop.cx), 0, cellZ(L.laptop.cy)); root.add(g); G.laptop = { x: cellX(L.laptop.cx), z: cellZ(L.laptop.cy), mesh: g, scr, prog: 0, done: false }; } else G.laptop = null;
  // exit (van or helipad)
  { const e = L.exit, g = new THREE.Group(); if (e.kind === 'heli') { mesh(geoCyl(1.6, 1.6, 0.06, 20), lam(0x37474f), 0, 0.03, 0, g); box(0.3, 0.02, 1.6, basic(0xffffff), -0.5, 0.07, 0, g, false); box(0.3, 0.02, 1.6, basic(0xffffff), 0.5, 0.07, 0, g, false); box(0.8, 0.02, 0.3, basic(0xffffff), 0, 0.07, 0, g, false); } else { mesh(geoCyl(1.4, 1.4, 0.04, 20), basic(0x2ecc71, { transparent: true, opacity: 0.35 }), 0, 0.03, 0, g, false); } const ring = mesh(new THREE.TorusGeometry(1.5, 0.07, 6, 28), basic(0x2ecc71), 0, 0.1, 0, g, false); ring.rotation.x = Math.PI / 2; const lab = labelSprite(e.kind === 'heli' ? '🚁 HELIPAD' : '🚐 ESCAPE VAN', '#7dff9b', 'rgba(10,12,24,.8)', 0.7); lab.position.y = 2.2; g.add(lab); g.position.set(cellX(e.cx), 0, cellZ(e.cy)); root.add(g); G.exit = { x: cellX(e.cx), z: cellZ(e.cy), mesh: g, ring, kind: e.kind }; }
  if (L.exit.kind === 'van') { const v = new THREE.Group(); box(2.2, 1.6, 1.4, lam(0xeceff1), 0, 1.0, 0, v); box(0.8, 1.0, 1.42, glow(0x90caf9), -0.9, 1.2, 0, v); box(2.3, 0.15, 1.5, lam(P.accent), 0, 0.65, 0, v); const lab2 = labelSprite('SNEAK & YEET CO.', '#ff3dbb', 'rgba(255,255,255,.9)', 0.55); lab2.position.set(0, 1.4, 0.75); v.add(lab2); v.position.set(cellX(L.exit.cx) + 2.4, 0, cellZ(L.exit.cy)); root.add(v); }
  function glow(c) { return basic(c); }
  // lasers
  G.lasers = L.lasers.map(l => { const g = new THREE.Group(), hs = l.h === 'grid' ? [0.35, 0.9, 1.5] : l.h === 'low' ? [0.35] : [0.95]; hs.forEach(h => { const b = box(l.axis === 'x' ? CELL : 0.06, 0.06, l.axis === 'x' ? 0.06 : CELL, basic(0xff1744), 0, h, 0, g, false); b.renderOrder = 4; }); const e1 = box(0.2, 1.8, 0.2, lam(0x37474f), l.axis === 'x' ? -CELL / 2 + 0.1 : 0, 0.9, l.axis === 'x' ? 0 : -CELL / 2 + 0.1, g); const e2 = box(0.2, 1.8, 0.2, lam(0x37474f), l.axis === 'x' ? CELL / 2 - 0.1 : 0, 0.9, l.axis === 'x' ? 0 : CELL / 2 - 0.1, g); g.position.set(cellX(l.cx), 0, cellZ(l.cy)); root.add(g); return Object.assign({}, l, { x: cellX(l.cx), z: cellZ(l.cy), mesh: g, beams: g.children.slice(0, hs.length), heights: hs, active: true }); });
  // cameras
  G.cams = L.cameras.map(c => { const x = cellX(c.cx), z = cellZ(c.cy), g = new THREE.Group(); box(0.5, 0.35, 0.7, lam(0xeceff1), 0, 0, 0, g); box(0.2, 0.2, 0.05, basic(0x111111), 0, 0, -0.37, g, false); const led = box(0.08, 0.08, 0.05, basic(0xff1744), 0.15, 0.12, -0.36, g, false); g.position.set(x, 2.6, z); root.add(g); const cone = makeCone(0xffd23f); root.add(cone); return { x, z, base: c.ang, sweep: c.sweep, speed: c.speed, ang: c.ang, mesh: g, led, cone, t: Math.random() * 6, sus: 0, cd: 0 }; });
}
/* ---------- Weapon models (hand + first-person viewmodel) ---------- */
function weaponModel(id) {
  const g = new THREE.Group(), W = WEAPONS[id], L = c => lam(c), B = (w, h, d, m, x = 0, y = 0, z = 0) => box(w, h, d, m, x, y, z, g, false);
  switch (id) {
    case 'chicken': B(0.16, 0.16, 0.6, L(0x5d4037), 0, 0, 0); B(0.2, 0.22, 0.34, L(0xffd23f), 0, 0.14, -0.3); B(0.06, 0.1, 0.12, L(0xff1744), 0, 0.3, -0.36); B(0.05, 0.05, 0.1, L(0xff9800), 0, 0.16, -0.5); break;
    case 'plunger': B(0.6, 0.06, 0.06, L(0x8d6e63), 0, 0.05, -0.1); B(0.06, 0.06, 0.8, L(0xa1887f), 0, 0, 0); B(0.22, 0.2, 0.12, L(0xff1744), 0, 0, -0.46); break;
    case 'gum': B(0.2, 0.2, 0.55, L(0xff7ad9), 0, 0, 0); B(0.28, 0.28, 0.28, L(0xff9ee6), 0, 0.12, 0.05); B(0.1, 0.1, 0.2, L(0xffffff), 0, 0, -0.36); break;
    case 'taco': B(0.3, 0.3, 0.8, L(0xffa726), 0, 0, 0); B(0.34, 0.12, 0.4, L(0x7cb342), 0, 0.2, 0); B(0.36, 0.36, 0.08, L(0x5d4037), 0, 0, -0.42); break;
    case 'confetti': { const c = mesh(geoCone(0.2, 0.6, 8), L(0x35e7ff), 0, 0, -0.2, g, false); c.rotation.x = -Math.PI / 2; B(0.12, 0.12, 0.3, L(0xff3dbb), 0, 0, 0.18); } break;
    case 'disco': B(0.14, 0.14, 0.6, L(0x7c4dff), 0, 0, 0); mesh(geoSphere(0.16, 8), lam(0xe0e0e0, 0x333333), 0, 0.02, -0.38, g, false); B(0.06, 0.16, 0.06, L(0x212121), 0, -0.12, 0.1); break;
    case 'choco': B(0.2, 0.2, 0.7, L(0x6d4c41), 0, 0, 0); B(0.16, 0.1, 0.4, L(0x9ccc65), 0, 0.14, -0.1); break;
    case 'dryer': B(0.18, 0.18, 0.5, L(0x80deea), 0, 0.06, -0.08); B(0.12, 0.3, 0.12, L(0x4dd0e1), 0, -0.14, 0.1); B(0.22, 0.22, 0.06, L(0x263238), 0, 0.06, -0.34); break;
    case 'guitar': B(0.36, 0.4, 0.1, L(0xff3dbb), 0, 0, 0); B(0.06, 0.06, 0.7, L(0x5d4037), 0, 0, -0.4); B(0.12, 0.1, 0.1, L(0x111111), 0, 0, -0.78); break;
  }
  return g;
}
function projMesh(id) {
  const W = WEAPONS[id];
  if (id === 'chicken') { const g = new THREE.Group(); box(0.22, 0.24, 0.36, lam(0xffd23f), 0, 0, 0, g, false); box(0.06, 0.12, 0.12, lam(0xff1744), 0, 0.16, -0.12, g, false); return g; }
  if (id === 'plunger') { const g = new THREE.Group(); box(0.05, 0.05, 0.6, lam(0xa1887f), 0, 0, 0, g, false); box(0.2, 0.2, 0.1, lam(0xff1744), 0, 0, -0.3, g, false); return g; }
  if (id === 'taco') { const g = new THREE.Group(); box(0.5, 0.25, 0.3, lam(0xffca28), 0, 0, 0, g, false); box(0.44, 0.1, 0.26, lam(0x7cb342), 0, 0.12, 0, g, false); return g; }
  if (id === 'choco') return mesh(geoBox(0.3, 0.12, 0.2), lam(0x6d4c41), 0, 0, 0, null, false);
  if (id === 'gum') return mesh(geoSphere(0.14, 8), lam(0xff7ad9), 0, 0, 0, null, false);
  return mesh(geoSphere(0.12, 6), basic(W.color), 0, 0, 0, null, false);
}

/* ---------- Run lifecycle ---------- */
const yawTo = (dx, dz) => Math.atan2(-dx, -dz);
function weaponStats(id) {
  const W = WEAPONS[id], u = G.save.upgrades[id] || {}, q = u.quiet || 0, r = u.reload || 0, a = u.ammo || 0;
  return { noise: W.noise * (1 - 0.25 * q), reload: 1.4 * (1 - 0.2 * r) * (W.rate < 1 ? 1.3 : 1), mag: Math.round(W.mag * (1 + 0.3 * a)), reserve: Math.round(W.reserve * (1 + 0.3 * a)) };
}
function startMission(id, opts = {}) {
  const m = missionById(id); if (!m) return;
  clearLevel();
  const L = G.level = generateLevel(m, opts.seed || 0); G.smokes = []; G.decoys = []; G.projs = []; G.eprojs = []; G.parts = []; G.guards = []; G.drones = [];
  buildLevel(L);
  const sk = SKINS[G.save.skin] || SKINS.rookie;
  if (G.player.c) G.scene.remove(G.player.c.root);
  G.player.c = makeAgent(sk); G.scene.add(G.player.c.root);
  Object.assign(G.player, { x: cellX(L.start.cx), z: cellZ(L.start.cy), y: 0, vy: 0, yaw: 0, pitch: -0.1, hp: 100, ground: true, crouch: false, hidden: null, boxT: 0, kx: 0, kz: 0 });
  // face toward the middle of the map
  G.player.yaw = yawTo(L.W * CELL / 2 - G.player.x, L.H * CELL / 2 - G.player.z);
  const ammo = {}; G.save.weapons.forEach(w => { const s = weaponStats(w); ammo[w] = { mag: s.mag, res: s.reserve }; });
  const bounty = dailyBounty() === m.n;
  G.run = { m, id: m.n, t: 0, noise: 0, peak: 0, ghost: true, detected: false, alarm: 0, busted: 0, got: 0, need: m.type === 'collect' ? 3 : (m.type === 'switch' ? 3 : 1), switches: 0, hacked: !G.laptop, cash: 0, bonks: 0, yeets: 0, kos: 0, over: false, won: false, ammo, wi: Math.max(0, G.save.weapons.indexOf(G.lastWeapon || 'chicken')), cd: 0, reloadT: 0, gi: 0, gad: Object.assign({}, G.save.gadgets), timer: m.timer || 0, wave: 1, bounty, bossDown: false, empT: 0, stepT: 0, catchCd: 0, hurtT: 0 };
  if (SKINS[G.save.skin] && G.save.skin === 'boxer') G.run.boxBonus = 1.5;
  // guards
  L.guards.forEach((gd, i) => spawnGuard(gd, i, L));
  L.drones.forEach(d => spawnDrone(d));
  if (m.boss) spawnBoss(m);
  setViewmodel(); showScreen(null); $('[data-hud]').hidden = false;
  banner(m.boss ? '⚠️ BOSS MISSION' : (m.nightmare ? '🌙 NIGHTMARE REMIX' : m.type === 'gauntlet' ? '🌊 ENDLESS GAUNTLET' : `MISSION ${typeof m.n === 'number' ? m.n : ''}`), m.name, 2.6);
  G.root.classList.toggle('nightmare', !!m.nightmare);
  G.sound.play(m.boss ? 'boss' : 'calm'); lockPointer(); G.hudDirty = true; updateHUD(true); setObjective();
}
function clearLevel() {
  if (G.levelRoot) { G.scene.remove(G.levelRoot); G.levelRoot = null; }
  (G.guards || []).forEach(g => { G.scene.remove(g.c.root); G.scene.remove(g.cone); });
  (G.drones || []).forEach(d => { G.scene.remove(d.mesh); G.scene.remove(d.cone); });
  (G.projs || []).concat(G.eprojs || []).forEach(p => G.scene.remove(p.mesh));
  (G.parts || []).forEach(p => G.scene.remove(p.mesh)); (G.smokes || []).forEach(s => G.scene.remove(s.mesh)); (G.decoys || []).forEach(s => G.scene.remove(s.mesh));
  G.guards = []; G.drones = []; G.projs = []; G.eprojs = []; G.parts = []; G.smokes = []; G.decoys = []; G.boss = null; bossBar(null);
}
function spawnGuard(gd, i, L, opts = {}) {
  const m = L.m, kind = m.bears && i % 2 === 0 ? 'bear' : 'guard', c = makeGuard(m, kind);
  const pts = gd.pts.map(p => ({ x: cellX(p.cx), z: cellZ(p.cy) })), p0 = pts[0];
  const g = { c, kind, x: p0.x, z: p0.z, ang: gd.look || 0, state: 'patrol', sus: 0, pts, pi: 0, path: null, wait: rand(0.5, 2), hp: 100 + (m.diff || 0) * 80, maxHp: 100 + (m.diff || 0) * 80, fx: {}, lastSeen: 0, lk: null, sentry: gd.sentry, look0: gd.look || 0, gum: 0, gumT: 0, hitCd: 0, t: rand(0, 6) };
  g.range = (8 + (m.diff || 0) * 3 + (m.nightmare ? 2 : 0)) * (kind === 'bear' ? 0.8 : 1); g.half = 0.58;
  g.speed = (kind === 'bear' ? 1.15 : 1) * (m.nightmare ? 1.12 : 1);
  g.cone = makeCone(0x4cff6a); G.scene.add(g.cone);
  g.icon = labelSprite('?', '#ffd23f', 'rgba(10,12,24,.85)', 0.55); g.icon.scale.set(0.8, 0.8 * 0.6 / 3.2 * 5.3, 1); g.icon.position.y = 2.5; g.icon.visible = false; c.root.add(g.icon);
  g.iconA = labelSprite('!', '#ff4d4d', 'rgba(10,12,24,.85)', 0.55); g.iconA.scale.copy(g.icon.scale); g.iconA.position.y = 2.5; g.iconA.visible = false; c.root.add(g.iconA);
  g.stars = labelSprite('💫 KO 💫', '#ffd23f', 'rgba(10,12,24,.7)', 0.6); g.stars.position.y = 1.0; g.stars.visible = false; c.root.add(g.stars);
  if (opts.alert) { g.state = 'alert'; g.lk = { x: G.player.x, z: G.player.z }; g.lastSeen = G.clock; }
  if (opts.x !== undefined) { g.x = opts.x; g.z = opts.z; }
  G.scene.add(c.root); G.guards.push(g); return g;
}
function spawnDrone(d) {
  const mesh = makeDrone(), pts = d.pts.map(p => ({ x: cellX(p.cx), z: cellZ(p.cy) }));
  const o = { mesh, pts, pi: 1, x: pts[0].x, z: pts[0].z, ang: 0, hp: 60, dead: false, cone: makeCone(0xff3dbb), speed: G.run.m.nightmare ? 5.2 : 3.4, cd: 0, path: null };
  G.scene.add(mesh, o.cone); G.drones.push(o);
}
function spawnBoss(m) {
  const B = BOSSES[m.boss], L = G.level, c = makeChar({ skin: B.skin, shirt: B.shirt, pants: B.pants, eye: B.eye, glowEye: B.glowEye, size: B.size, crown: B.crown, shades: B.shades, aura: B.aura });
  if (B.mech) { box(0.8, 0.5, 0.5, lam(0x546e7a), 0, 1.25, 0, c.body); box(0.12, 0.6, 0.12, lam(0x90a4ae), 0, 2.3, 0, c.body); box(0.2, 0.2, 0.2, basic(0xff1744), 0, 2.65, 0, c.body); }
  const g = spawnGuard({ pts: [L.bossSpawn, { cx: L.bossRoom.x + 1, cy: L.bossRoom.y + 1 }, { cx: L.bossRoom.x + L.bossRoom.w - 2, cy: L.bossRoom.y + L.bossRoom.h - 2 }], sentry: false }, 99, L);
  G.scene.remove(g.c.root); g.c = c; c.root.add(g.icon, g.iconA, g.stars); g.icon.position.y = g.iconA.position.y = 2.6 * B.size; G.scene.add(c.root);
  g.boss = B; g.hp = g.maxHp = B.hp * (1 + (m.n >= 60 ? 0.3 : 0)); g.range = 12; g.half = 0.75; g.speed = 0.75; g.blobT = 2; g.summoned = false; g.kind = 'boss';
  G.boss = g; bossBar(g);
}

/* ---------- Noise + alerts ---------- */
function addNoise(n, x, z, radius, fromPlayer = true) {
  const R = G.run; if (!R || R.over) return;
  if (fromPlayer) { R.noise = Math.min(100, R.noise + n * (R.m.strict || 1)); R.peak = Math.max(R.peak, R.noise); if (R.noise >= 100) busted(); }
  hearNoise(x, z, radius === undefined ? n * 0.16 : radius);
}
function hearNoise(x, z, r) {
  for (const g of G.guards) { if (g.state === 'ko' || g.state === 'alert' || disabled(g)) continue; const d = Math.hypot(g.x - x, g.z - z); if (d > r) continue; g.state = 'investigate'; g.target = { x, z }; g.path = null; g.sus = Math.max(g.sus, 0.35); g.wait = 0; if (!g.q) { g.q = 1; G.sound.play('q'); } }
}
function busted() {
  const R = G.run; if (R.busted > 0) return; R.busted = 3; R.ghost = false;
  banner('🚨 BUSTED!', 'Quiet Meter hit 100% — guards are coming', 1.6); G.sound.play('busted'); G.pad.rumble(0.8, 300);
  for (const g of G.guards) if (g.state !== 'ko' && Math.hypot(g.x - G.player.x, g.z - G.player.z) < 22) alertGuard(g, G.player.x, G.player.z);
}
function alertGuard(g, x, z) {
  if (g.state === 'ko') return; const was = g.state === 'alert'; g.state = 'alert'; g.sus = 1; g.lk = { x, z }; g.lastSeen = G.clock; g.path = null;
  if (!was) { const R = G.run; R.detected = true; if (R.alarm <= 0) { G.sound.play('alarm'); toast('🚨 ALERT! Hide in a box, locker or shadow to lose them', 'bad'); } else G.sound.play('alert'); R.alarm = Math.max(R.alarm, 12); }
}
function raiseAlarm(x, z, n = 3) {
  const list = G.guards.filter(g => g.state !== 'ko').sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z)).slice(0, n);
  list.forEach(g => alertGuard(g, x, z)); if (!list.length) { G.run.detected = true; G.run.alarm = Math.max(G.run.alarm, 8); G.sound.play('alarm'); }
}
const disabled = g => !!(g.fx.blind > 0 || g.fx.float > 0 || g.fx.stun > 0 || g.fx.dance > 0 || g.fx.charm > 0 || g.fx.dizzy > 0);

/* ---------- Player ---------- */
function playerVis() {
  const P = G.player, R = G.run; if (P.hidden) return 0;
  let v = P.crouch ? 0.62 : 1;
  if (inShadow(P.x, P.z)) v *= G.save.skin === 'phantom' ? 0.32 : 0.42;
  if (P.boxT > 0 && (P.crouch || P.moveAmt < 0.35)) v *= 0.05;
  return v;
}
function inShadow(x, z) { const cx = x / CELL, cy = z / CELL; return G.level.shadows.some(s => cx >= s.x && cx <= s.x + s.w && cy >= s.y && cy <= s.y + s.h); }
function moveCollide(o, dx, dz, r = 0.35) {
  const nx = o.x + dx; if (!solidAt(nx + Math.sign(dx) * r, o.z - r * 0.9) && !solidAt(nx + Math.sign(dx) * r, o.z + r * 0.9)) o.x = nx;
  const nz = o.z + dz; if (!solidAt(o.x - r * 0.9, nz + Math.sign(dz) * r) && !solidAt(o.x + r * 0.9, nz + Math.sign(dz) * r)) o.z = nz;
}
function updatePlayer(dt) {
  const P = G.player, I = G.input, R = G.run;
  if (P.hidden) { P.moveAmt = 0; P.c.root.visible = false; targetNoise(0, dt); if (I.mx || I.mz) { if (!G.hideHint) { G.hideHint = 1; toast(`Press ${bindTxt('act')} to leave the hiding spot`); } } return; }
  P.c.root.visible = G.settings.cam === 'third';
  const sprint = I.sprint && !P.crouch && P.boxT <= 0, sp = P.boxT > 0 ? 1.9 : P.crouch ? 2.3 : sprint ? 7 : 4.3;
  let mx = I.mx, mz = I.mz; const ml = Math.hypot(mx, mz); if (ml > 1) { mx /= ml; mz /= ml; }
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
  const vx = (rx * mx - fx * mz) * sp, vz = (rz * mx - fz * mz) * sp;
  P.kx *= Math.pow(0.02, dt); P.kz *= Math.pow(0.02, dt);
  moveCollide(P, (vx + P.kx) * dt, (vz + P.kz) * dt);
  P.moveAmt = Math.min(1, Math.hypot(mx, mz));
  // jump / gravity
  const grav = R.m.lowgrav ? 9 : 24; P.vy -= grav * dt; P.y += P.vy * dt; if (P.y <= 0) { if (!P.ground && P.vy < -6) addNoise(8, P.x, P.z, 2.5); P.y = 0; P.vy = 0; P.ground = true; }
  // footstep noise
  const lvl = P.moveAmt < 0.1 ? 0 : P.boxT > 0 ? 3 : P.crouch ? 5 : sprint ? 45 : 20;
  targetNoise(lvl * (R.m.strict || 1) * (P.moveAmt < 0.1 ? 1 : Math.max(0.6, P.moveAmt)), dt);
  R.stepT -= dt * (sprint ? 1.6 : 1); if (P.moveAmt > 0.1 && R.stepT <= 0) { R.stepT = 0.42; if (lvl >= 20) { hearNoise(P.x, P.z, lvl * 0.13 * (R.m.strict || 1)); G.sound.play('step'); } }
  // character
  const c = P.c; c.root.position.set(P.x, P.y, P.z); c.root.rotation.y = P.yaw; c.body.scale.y = P.crouch ? 0.7 : 1; animChar(c, P.moveAmt, G.clock * (sprint ? 14 : 9), false);
  if (P.boxT > 0) { P.boxT -= dt; G.boxMesh.visible = true; G.boxMesh.position.set(P.x, 0, P.z); G.boxMesh.rotation.y = P.yaw; c.root.visible = false; if (P.boxT <= 0) { toast('📦 Box disguise ran out'); } } else G.boxMesh.visible = false;
  // traps
  for (const t of G.traps) { t.cd -= dt; if (t.cd > 0 || P.y > 0.3) continue; if (Math.hypot(t.x - P.x, t.z - P.z) < t.r) { t.cd = 3.5; const n = t.d.noise * (P.crouch ? 0.4 : 1); G.sound.play(t.d.snd); addNoise(n, t.x, t.z, n * 0.18); popText(t.x, 1, t.z, `${t.d.name}! +${Math.round(n * (R.m.strict || 1))}%`, '#ff9f1c'); t.mesh.position.y = 0.1; setTimeout(() => t.mesh && (t.mesh.position.y = 0), 200); } }
  // pickups
  for (const c2 of G.coins) if (!c2.got && Math.hypot(c2.x - P.x, c2.z - P.z) < 1) { c2.got = true; c2.mesh.visible = false; R.cash += 15; G.sound.play('coin'); popText(c2.x, 1.2, c2.z, '+$15', '#ffd23f'); }
  for (const it of G.items) if (!it.got && !it.locked && Math.hypot(it.x - P.x, it.z - P.z) < 1.4) {
    it.got = true; it.mesh.visible = false; R.got++; G.sound.play('pickup'); G.pad.rumble(0.4, 120);
    if (R.m.type === 'gauntlet') { banner('🌮 GOT THE TACO', 'Deliver it to the escape van', 1.6); }
    else banner(R.got >= R.need ? '⭐ ' + R.m.item.toUpperCase() : `⭐ ${R.got}/${R.need}`, R.got >= R.need ? (G.exit.kind === 'heli' ? 'Get to the helipad!' : 'Get back to the escape van!') : 'Keep looking…', 1.6);
    setObjective();
  }
  // lasers
  for (const l of G.lasers) { if (!l.active || l.cdT > 0) { l.cdT = Math.max(0, (l.cdT || 0) - dt); continue; } const along = l.axis === 'x' ? Math.abs(P.z - l.z) : Math.abs(P.x - l.x), across = l.axis === 'x' ? Math.abs(P.x - l.x) : Math.abs(P.z - l.z); if (along > 0.3 || across > CELL / 2) continue; const head = P.y + (P.crouch ? 1.05 : 1.75), feet = P.y; if (l.heights.some(h => h > feet + 0.05 && h < head)) { l.cdT = 2; G.sound.play('laser'); addNoise(100, P.x, P.z, 12); raiseAlarm(P.x, P.z, 3); popText(P.x, 2, P.z, 'LASER TRIPPED!', '#ff1744'); } }
  // exit
  if (objectivesDone() && Math.hypot(G.exit.x - P.x, G.exit.z - P.z) < 1.7) { if (R.m.type === 'gauntlet') nextWave(); else winMission(); }
  // regen when calm
  R.hurtT -= dt; if (R.hurtT <= 0 && R.alarm <= 0 && P.hp < 100) P.hp = Math.min(100, P.hp + 4 * dt);
}
function targetNoise(lvl, dt) { const R = G.run; if (R.noise < lvl) R.noise = Math.min(lvl, R.noise + 70 * dt); else R.noise = Math.max(lvl, R.noise - 16 * dt); R.peak = Math.max(R.peak, R.noise); if (R.noise >= 99.5) busted(); }
function objectivesDone() { const R = G.run; if (R.m.type === 'boss') return R.bossDown && R.got >= 1; if (R.m.type === 'switch') return R.switches >= 3; return R.got >= R.need; }
function jump() { const P = G.player; if (P.hidden || !P.ground) return; if (P.crouch) { P.crouch = false; return; } P.vy = G.run.m.lowgrav ? 7 : 8.2; P.ground = false; G.sound.play('jump'); }
function toggleCrouch() { const P = G.player; if (P.hidden) return; P.crouch = !P.crouch; G.hudDirty = true; }
function hurtPlayer(n, fx, fz) {
  const P = G.player, R = G.run; if (R.over) return; P.hp -= n; R.hurtT = 5; G.hurtFlash = 0.6; G.sound.play('hurt'); G.pad.rumble(0.7, 180); G.shake = 0.3;
  if (fx !== undefined) { const d = Math.hypot(P.x - fx, P.z - fz) || 1; P.kx = (P.x - fx) / d * 9; P.kz = (P.z - fz) / d * 9; }
  if (P.hp <= 0) { P.hp = 0; failMission(R.m.type === 'gauntlet' ? 'The gauntlet got you' : 'You got caught'); }
}

/* ---------- Interact: takedown > hide > switch > hack ---------- */
function interactTarget() {
  const P = G.player, R = G.run; if (!R || R.over) return null;
  if (P.hidden) return { kind: 'unhide' };
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);
  for (const g of G.guards) {
    if (g.state === 'ko') continue; const dx = g.x - P.x, dz = g.z - P.z, d = Math.hypot(dx, dz); if (d > (g.boss ? 2.6 : 1.8)) continue;
    const facing = (dx * fx + dz * fz) / (d || 1); if (facing < 0.35) continue;
    const behind = Math.abs(angDiff(g.ang, yawTo(P.x - g.x, P.z - g.z))) > 1.7; if ((behind && g.state !== 'alert') || disabled(g) || g.fx.glue > 0) return { kind: 'bonk', g };
  }
  for (const h of G.hides) if (Math.hypot(h.x - P.x, h.z - P.z) < 1.6) return { kind: 'hide', h };
  for (const s of G.switches) if (!s.on && Math.hypot(s.x - P.x, s.z - P.z) < 1.8) return { kind: 'switch', s };
  if (G.laptop && !G.laptop.done && Math.hypot(G.laptop.x - P.x, G.laptop.z - P.z) < 1.9) return { kind: 'hack' };
  return null;
}
function interact() {
  const t = interactTarget(), P = G.player, R = G.run; if (!t) return;
  if (t.kind === 'unhide') { P.hidden = null; G.sound.play('hide'); P.c.root.visible = true; return; }
  if (t.kind === 'bonk') return bonk(t.g);
  if (t.kind === 'hide') { P.hidden = t.h; P.x = t.h.x; P.z = t.h.z; P.crouch = false; G.sound.play('hide'); popText(P.x, 2, P.z, t.h.kind === 'box' ? '📦 Hiding in a box' : '🚪 Hiding in a locker', '#7dff9b'); for (const g of G.guards) if (g.state === 'alert' && G.clock - g.lastSeen > 0.6) { g.state = 'search'; g.searchT = 5; g.path = null; } return; }
  if (t.kind === 'switch') { t.s.on = true; R.switches++; t.s.lamp.material = basic(0x4cff6a); t.s.lever.rotation.x = -0.6; G.sound.play('switch'); addNoise(8, t.s.x, t.s.z, 3); banner(`🔌 SWITCH ${R.switches}/3`, R.switches >= 3 ? 'All switches on! Get to the escape van' : 'Find the next switch', 1.4); setObjective(); return; }
}
function bonk(g) {
  const R = G.run; G.sound.play('bonk'); G.pad.rumble(0.5, 120); R.bonks++; G.save.totalBonks = (G.save.totalBonks || 0) + 1;
  if (g.boss) { damageGuard(g, g.state === 'alert' ? 60 : 180, 'bonk'); popText(g.x, 3.5, g.z, 'BONK!', '#ffd23f'); return; }
  knockOut(g, 'BONK!');
}
function knockOut(g, txt) {
  g.state = 'ko'; g.koT = G.run.m.type === 'gauntlet' ? 18 : 0; g.fx = {}; g.c.root.rotation.x = 0; g.cone.visible = false; g.icon.visible = g.iconA.visible = false; g.stars.visible = true; G.run.kos++;
  G.sound.play('ko'); popText(g.x, 2.2, g.z, txt || 'KO!', '#ffd23f'); burst(g.x, 1, g.z, [0xffd23f, 0xff3dbb, 0x35e7ff], 14);
}
function damageGuard(g, dmg, src) {
  if (g.state === 'ko') return; g.hp -= dmg; if (dmg > 0) popText(g.x, (g.boss ? 2.4 * g.boss.size : 2.2), g.z, '-' + Math.round(dmg), '#ff6b6b', true);
  if (g.boss) { bossBar(g); if (!g.summoned && g.hp < g.maxHp / 2) { g.summoned = true; toast(`${g.boss.name} called backup!`, 'bad'); for (let i = 0; i < 2; i++) spawnGuard({ pts: [{ cx: Math.floor(g.x / CELL), cy: Math.floor(g.z / CELL) }], sentry: false }, i + 50, G.level, { alert: true, x: g.x + (i ? 2 : -2), z: g.z }); } if (g.hp <= 0) bossDefeated(g); return; }
  if (g.hp <= 0) { knockOut(g); return; }
}
function bossDefeated(g) {
  const R = G.run; g.state = 'ko'; g.cone.visible = false; g.icon.visible = g.iconA.visible = false; g.stars.visible = true; R.bossDown = true; bossBar(null);
  G.sound.play('win'); G.shake = 0.6; burst(g.x, 2, g.z, [0xffd23f, 0xff3dbb, 0x35e7ff, 0x76ff03], 40);
  const it = itemMesh(R.m, 0); it.position.set(g.x, 0, g.z); G.levelRoot.add(it); G.items.push({ x: g.x, z: g.z, mesh: it, got: false });
  // make sure the drop isn't inside a wall
  banner('🏆 BOSS DEFEATED', `Grab the ${R.m.item} and escape`, 2.2); G.guards.forEach(o => { if (o !== g && o.state === 'alert') { o.state = 'search'; o.searchT = 3; } }); R.alarm = Math.min(R.alarm, 3); setObjective();
}

/* ---------- Guards AI ---------- */
function pathTo(g, tx, tz) {
  const L = G.level, sx = clamp(Math.floor(g.x / CELL), 0, L.W - 1), sy = clamp(Math.floor(g.z / CELL), 0, L.H - 1), ex = clamp(Math.floor(tx / CELL), 0, L.W - 1), ey = clamp(Math.floor(tz / CELL), 0, L.H - 1);
  if (L.grid[ey * L.W + ex] !== 0) return [{ x: tx, z: tz }];
  const dist = L.bfs(ex, ey); if (dist[sy * L.W + sx] < 0) return [{ x: tx, z: tz }];
  const out = []; let x = sx, y = sy, guard = 0;
  while ((x !== ex || y !== ey) && guard++ < 400) { const cur = dist[y * L.W + x]; let best = null; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= L.W || ny >= L.H) continue; const v = dist[ny * L.W + nx]; if (v >= 0 && v < cur) { best = [nx, ny]; break; } } if (!best) break; [x, y] = best; out.push({ x: cellX(x), z: cellZ(y) }); }
  out.push({ x: tx, z: tz }); return out;
}
function walkPath(g, dt, speed) {
  if (!g.path || !g.path.length) return true;
  const p = g.path[0], dx = p.x - g.x, dz = p.z - g.z, d = Math.hypot(dx, dz);
  if (d < 0.25) { g.path.shift(); return !g.path.length; }
  const s = Math.min(d, speed * dt); moveCollide(g, dx / d * s, dz / d * s, 0.3); g.ang = turnTo(g.ang, yawTo(dx, dz), dt * 7); g.moving = 1; return false;
}
const turnTo = (a, b, k) => a + angDiff(b, a) * Math.min(1, k);
function updateGuards(dt) {
  const P = G.player, R = G.run, vis = playerVis(), py = P.y + (P.crouch ? 0.9 : 1.4);
  for (const g of G.guards) {
    g.t += dt; g.moving = 0; g.hitCd -= dt;
    if (g.state === 'ko') { g.c.root.rotation.x = lerp(g.c.root.rotation.x, -Math.PI / 2, dt * 8); g.c.root.position.set(g.x, 0.3, g.z); g.stars.rotation && (g.stars.material.rotation = g.t * 2); if (g.koT > 0) { g.koT -= dt; if (g.koT <= 0) { g.state = 'patrol'; g.hp = g.maxHp; g.stars.visible = false; g.cone.visible = true; g.c.root.rotation.x = 0; } } continue; }
    // status effects
    for (const k in g.fx) if (g.fx[k] > 0) g.fx[k] -= dt;
    const dis = disabled(g), glued = g.fx.glue > 0;
    let lift = 0;
    if (g.fx.float > 0) { lift = 1.4 + Math.sin(g.t * 3) * 0.2; g.ang += dt * 2; }
    else if (g.fx.dance > 0) { g.ang += dt * 9; g.c.armL.rotation.z = Math.sin(g.t * 12) * 1.4; g.c.armR.rotation.z = -Math.sin(g.t * 12) * 1.4; }
    else if (g.fx.charm > 0) { g.c.armL.rotation.x = g.c.armR.rotation.x = -1.3; g.c.armL.rotation.z = 0.5 + Math.sin(g.t * 16) * 0.35; g.c.armR.rotation.z = -0.5 - Math.sin(g.t * 16) * 0.35; }
    else if (g.fx.stun > 0 || g.fx.dizzy > 0) { g.ang += Math.sin(g.t * 6) * dt * 3; }
    else { g.c.armL.rotation.z = g.c.armR.rotation.z = 0; }
    // knockback
    if (g.kx || g.kz) { moveCollide(g, g.kx * dt, g.kz * dt, 0.3); g.kx *= Math.pow(0.03, dt); g.kz *= Math.pow(0.03, dt); if (Math.abs(g.kx) + Math.abs(g.kz) < 0.1) g.kx = g.kz = 0; }
    // vision
    let sees = false, d = Math.hypot(P.x - g.x, P.z - g.z);
    if (!dis && vis > 0) {
      const alertK = g.state === 'alert' ? 1.35 : 1, range = g.range * alertK * vis, half = g.half * (g.state === 'alert' ? 1.5 : 1);
      if (d < range && Math.abs(angDiff(yawTo(P.x - g.x, P.z - g.z), g.ang)) < half && canSee(g.x, g.z, P.x, P.z)) sees = true;
      if (d < 1.3 && vis > 0.3) sees = true; // bumping into a guard
    }
    if (P.boxT > 0 && vis < 0.1 && d < 1.2 && g.state === 'alert') sees = true;
    if (sees) {
      g.lk = { x: P.x, z: P.z }; g.lastSeen = G.clock;
      if (g.state !== 'alert') { const gain = (1.8 * (1 - d / (g.range * 1.4)) + 0.55) * (R.m.strict || 1) * (G.save.skin === 'phantom' && inShadow(P.x, P.z) ? 0.85 : 1); g.sus += dt * gain; if (g.state === 'patrol' || g.state === 'search') { g.state = 'sus'; G.sound.play('q'); } g.ang = turnTo(g.ang, yawTo(P.x - g.x, P.z - g.z), dt * 3); if (g.sus >= 1) alertGuard(g, P.x, P.z); }
    } else if (g.state === 'sus') { g.sus -= dt * 0.45; if (g.sus <= 0.25) { g.state = 'investigate'; g.target = g.lk; g.path = null; } }
    if (glued) { g.moving = 0; }
    else if (!dis) {
      if (g.state === 'patrol') {
        g.sus = Math.max(0, g.sus - dt * 0.3); g.q = 0;
        if (g.sentry) { g.ang = g.look0 + Math.sin(g.t * 0.6) * 1.3; const home = g.pts[0]; if (Math.hypot(home.x - g.x, home.z - g.z) > 0.5) { if (!g.path) g.path = pathTo(g, home.x, home.z); walkPath(g, dt, 2.2 * g.speed); } else g.path = null; }
        else if (g.wait > 0) { g.wait -= dt; g.ang += Math.sin(g.t * 1.4) * dt * 0.8; }
        else { if (!g.path) { g.pi = (g.pi + 1) % g.pts.length; const p = g.pts[g.pi]; g.path = pathTo(g, p.x, p.z); } if (walkPath(g, dt, 2.2 * g.speed)) { g.path = null; g.wait = rand(1.2, 3); } }
      } else if (g.state === 'investigate') {
        if (!g.path && g.target) g.path = pathTo(g, g.target.x, g.target.z);
        if (walkPath(g, dt, 3.1 * g.speed)) { g.state = 'search'; g.searchT = 3.5; g.path = null; }
      } else if (g.state === 'search') {
        g.searchT -= dt; g.ang += dt * 1.8; g.sus = Math.max(0, g.sus - dt * 0.2);
        if (g.searchT <= 0) { g.state = 'patrol'; g.path = null; g.wait = 0.5; }
      } else if (g.state === 'alert') {
        const lostFor = G.clock - g.lastSeen;
        if (P.hidden && lostFor > 0.6) { g.state = 'search'; g.searchT = 5; g.path = null; }
        else if (sees || lostFor < 0.4) {
          const dx = P.x - g.x, dz = P.z - g.z; g.ang = turnTo(g.ang, yawTo(dx, dz), dt * 8);
          if (g.boss) { g.blobT -= dt; if (g.blobT <= 0 && sees) { g.blobT = Math.max(0.9, 1.7 - (R.m.diff || 0)); bossShoot(g); } }
          if (d > 1.0 && (!g.boss || d > 4)) { const s = Math.min(d - 0.9, (g.boss ? 3.4 : 5.1) * g.speed * dt); moveCollide(g, dx / d * s, dz / d * s, 0.3); g.moving = 1; }
          g.path = null;
        } else if (lostFor < 6) { if (!g.path) g.path = pathTo(g, g.lk.x, g.lk.z); if (walkPath(g, dt, 4.6 * g.speed)) { g.state = 'search'; g.searchT = 5; g.path = null; } }
        else { g.state = 'search'; g.searchT = 4; g.path = null; }
        // catch
        if (d < (g.boss ? 2.2 : 1.15) && !P.hidden && g.hitCd <= 0 && P.y < 1) { g.hitCd = 1.3; hurtPlayer(g.boss ? 30 : 34, g.x, g.z); popText(P.x, 2.2, P.z, g.kind === 'bear' ? 'RAWR!' : 'GOTCHA!', '#ff4d4d'); }
      }
    }
    // animate + visuals
    const c = g.c; c.root.position.set(g.x, lift, g.z); c.root.rotation.y = g.ang; c.root.rotation.x = 0;
    if (!(g.fx.dance > 0 || g.fx.charm > 0)) animChar(c, g.moving, g.t * (g.state === 'alert' ? 13 : 8), false);
    const st = dis ? 'off' : g.state === 'alert' ? 'alert' : (g.state === 'sus' || g.state === 'investigate' || g.state === 'search') ? 'sus' : 'calm';
    if (g.coneSt !== st) { g.coneSt = st; g.cone.material.color.setHex(st === 'alert' ? 0xff3b3b : st === 'sus' ? 0xffd23f : st === 'off' ? 0x8899aa : 0x4cff6a); g.cone.material.opacity = st === 'off' ? 0.1 : st === 'alert' ? 0.34 : 0.26; }
    g.icon.visible = st === 'sus'; g.iconA.visible = st === 'alert';
    g.coneT = (g.coneT || 0) - dt; if (g.coneT <= 0) { g.coneT = 0.06; updateCone(g.cone, g.x, g.z, g.ang + Math.PI, g.half * (g.state === 'alert' ? 1.5 : 1), g.range * (g.state === 'alert' ? 1.35 : 1)); }
    g.cone.visible = !dis || g.fx.glue > 0;
  }
  // alarm cool-down
  if (R.alarm > 0) { const anyAlert = G.guards.some(g => g.state === 'alert'); if (!anyAlert) { R.alarm -= dt; if (R.alarm <= 0) { R.alarm = 0; toast('😮‍💨 Alert cooled down', 'good'); G.sound.play('calm'); } } }
  if (R.busted > 0) R.busted -= dt;
}
function bossShoot(g) {
  const P = G.player, y = 1.2 * g.boss.size, dx = P.x - g.x, dz = P.z - g.z, dy = (P.y + 1) - y, d = Math.hypot(dx, dy, dz) || 1, sp = 11;
  const m = mesh(geoSphere(0.35, 8), basic(g.boss.blob), g.x, y, g.z, G.scene, false);
  G.eprojs.push({ mesh: m, x: g.x, y, z: g.z, vx: dx / d * sp, vy: dy / d * sp, vz: dz / d * sp, life: 3 }); G.sound.play('blob');
}
function updateDrones(dt) {
  const P = G.player, R = G.run, vis = playerVis();
  for (const d of G.drones) {
    if (d.dead) { if (d.mesh.position.y > 0.3) { d.mesh.position.y -= dt * 4; d.mesh.rotation.z += dt * 3; } continue; }
    const off = R.empT > 0; d.mesh.children.forEach(ch => { if (ch.userData.prop) ch.rotation.y += dt * (off ? 2 : 30); });
    if (!off) {
      const tp = d.pts[d.pi], dx = tp.x - d.x, dz = tp.z - d.z, dist = Math.hypot(dx, dz);
      if (!d.path) d.path = pathTo(d, tp.x, tp.z);
      if (walkPath(d, dt, d.speed) || dist < 0.4) { d.pi = (d.pi + 1) % d.pts.length; d.path = null; }
    }
    d.mesh.position.set(d.x, 2.8 + Math.sin(G.clock * 3 + d.x) * 0.12, d.z); d.mesh.rotation.y = d.ang;
    d.cone.visible = !off; if (off) continue;
    d.coneT = (d.coneT || 0) - dt; if (d.coneT <= 0) { d.coneT = 0.08; updateCone(d.cone, d.x, d.z, d.ang + Math.PI, 0.7, 7.5); }
    d.cd -= dt; const pd = Math.hypot(P.x - d.x, P.z - d.z);
    if (d.cd <= 0 && vis > 0 && pd < 7.5 * Math.max(0.55, vis) && Math.abs(angDiff(yawTo(P.x - d.x, P.z - d.z), d.ang)) < 0.7 && canSee(d.x, d.z, P.x, P.z)) { d.cd = 5; G.sound.play('alert'); popText(d.x, 3.4, d.z, '📸 DRONE SPOTTED YOU', '#ff3dbb'); raiseAlarm(P.x, P.z, 2); }
  }
}
function updateCams(dt) {
  const P = G.player, R = G.run, vis = playerVis();
  for (const c of G.cams) {
    const off = R.empT > 0; c.cone.visible = !off; c.led.visible = !off || Math.sin(G.clock * 10) > 0;
    if (off) continue;
    c.t += dt; c.ang = c.base + Math.sin(c.t * c.speed) * c.sweep; c.mesh.rotation.y = c.ang + Math.PI;
    c.coneT = (c.coneT || 0) - dt; if (c.coneT <= 0) { c.coneT = 0.08; updateCone(c.cone, c.x, c.z, c.ang, 0.45, 10); }
    c.cd -= dt; const d = Math.hypot(P.x - c.x, P.z - c.z);
    const sees = vis > 0 && d < 10 * Math.max(0.5, vis) && Math.abs(angDiff(Math.atan2(P.x - c.x, P.z - c.z), c.ang)) < 0.45 && canSee(c.x, c.z, P.x, P.z);
    if (sees && c.cd <= 0) { c.sus += dt * 1.4; c.cone.material.color.setHex(0xff9f1c); if (c.sus >= 1) { c.sus = 0; c.cd = 6; G.sound.play('alert'); popText(c.x, 3, c.z, '📹 CAMERA ALARM', '#ff4d4d'); raiseAlarm(P.x, P.z, 2); } }
    else { c.sus = Math.max(0, c.sus - dt * 0.6); if (c.sus === 0) c.cone.material.color.setHex(0xffd23f); }
  }
}
function updateLasers(dt) {
  const R = G.run;
  for (const l of G.lasers) { const cyc = l.on + l.off, ph = ((G.clock + l.phase) % cyc); const on = R.empT <= 0 && ph < l.on; l.active = on; l.beams.forEach(b => { b.visible = on || (ph > cyc - 0.35 && Math.sin(G.clock * 40) > 0 && R.empT <= 0); }); }
}

/* ---------- Weapons ---------- */
function curWeapon() { return G.save.weapons[G.run.wi] || 'chicken'; }
function fire() {
  const R = G.run, P = G.player; if (R.over || P.hidden || R.cd > 0 || R.reloadT > 0) return;
  const id = curWeapon(), W = WEAPONS[id], st = weaponStats(id), a = R.ammo[id];
  if (a.mag <= 0) { if (a.res > 0) reload(); else { G.sound.play('empty'); R.cd = 0.3; toast(`${W.icon} Out of ammo — grab another weapon (${bindTxt('swap')})`); } return; }
  a.mag--; R.cd = 1 / W.rate; R.yeets++; G.save.totalYeets = (G.save.totalYeets || 0) + 1;
  if (P.boxT > 0) { P.boxT = 0; toast('📦 Box disguise dropped'); }
  const cam = G.camera, dir = G.tmpV.set(0, 0, -1).applyQuaternion(cam.quaternion).normalize();
  let ox = cam.position.x, oy = cam.position.y, oz = cam.position.z;
  if (G.settings.cam === 'third') { const aim = aimPoint(dir); ox = P.x + Math.cos(P.yaw) * 0.35; oy = P.y + 1.35; oz = P.z - Math.sin(P.yaw) * 0.35; const dx = aim.x - ox, dy = aim.y - oy, dz = aim.z - oz, l = Math.hypot(dx, dy, dz) || 1; dir.set(dx / l, dy / l, dz / l); }
  G.sound.play(W.fx === 'squeak' ? 'chicken' : W.fx === 'blind' ? 'plunger' : W.fx === 'float' ? 'gum' : W.fx === 'splash' ? 'taco' : W.fx === 'stun' ? 'confetti' : W.fx === 'dance' ? 'disco' : W.fx === 'glue' ? 'choco' : W.fx === 'push' ? 'dryer' : 'guitar');
  G.recoil = 1; if (st.noise > 0) addNoise(st.noise, P.x, P.z, st.noise * 0.14);
  if (W.speed > 0) {
    const m = projMesh(id); m.position.set(ox, oy, oz); G.scene.add(m);
    G.projs.push({ id, W, mesh: m, x: ox, y: oy, z: oz, vx: dir.x * W.speed, vy: dir.y * W.speed + (W.grav ? 2.2 : 0), vz: dir.z * W.speed, life: W.range / W.speed + (W.grav ? 0.8 : 0), bounces: W.bounce || 0 });
  } else coneAttack(id, W, dir);
  G.hudDirty = true;
}
function aimPoint(dir) { const c = G.camera.position, d = castRay(c.x, c.z, dir.x / (Math.hypot(dir.x, dir.z) || 1), dir.z / (Math.hypot(dir.x, dir.z) || 1), 40) / (Math.hypot(dir.x, dir.z) || 1); const t = Math.min(d, 40); return { x: c.x + dir.x * t, y: c.y + dir.y * t, z: c.z + dir.z * t }; }
function coneAttack(id, W, dir) {
  const P = G.player, ang = Math.atan2(dir.x, dir.z), half = W.fx === 'charm' ? 1.1 : W.fx === 'push' ? 0.4 : 0.55, cols = W.fx === 'stun' ? [0xff3dbb, 0x35e7ff, 0xffd23f, 0x76ff03] : W.fx === 'push' ? [0xe0f7fa] : [0xff3dbb, 0xffd23f];
  for (let i = 0; i < (W.fx === 'push' ? 6 : 16); i++) { const a = ang + rand(-half, half), s = rand(5, 10); spawnPart(P.x, P.y + 1.3, P.z, Math.sin(a) * s, rand(-0.5, 2), Math.cos(a) * s, pick(cols), 0.5, 0.12); }
  for (const g of G.guards) {
    if (g.state === 'ko') continue; const dx = g.x - P.x, dz = g.z - P.z, d = Math.hypot(dx, dz);
    if (d > W.range || Math.abs(angDiff(Math.atan2(dx, dz), ang)) > half || !canSee(P.x, P.z, g.x, g.z)) continue;
    hitGuard(g, id, W, P.x, P.z);
  }
  for (const d of G.drones) if (!d.dead && W.dmg > 0 && Math.hypot(d.x - P.x, d.z - P.z) < W.range && Math.abs(angDiff(Math.atan2(d.x - P.x, d.z - P.z), ang)) < half) hitDrone(d, W.dmg);
}
function hitGuard(g, id, W, fx, fz) {
  const boss = !!g.boss, k = boss ? 0.4 : 1;
  switch (W.fx) {
    case 'blind': g.fx.blind = 5 * k; popText(g.x, 2.4, g.z, '🪠 BLINDED', '#ff6b6b'); break;
    case 'float': g.gum = (g.gumT > G.clock ? g.gum : 0) + 1; g.gumT = G.clock + 4; if (g.gum >= 3 && !boss) { g.fx.float = 4; g.gum = 0; popText(g.x, 2.4, g.z, '🫧 BUBBLE FLOAT', '#ff7ad9'); } break;
    case 'splash': break;
    case 'stun': g.fx.stun = 3 * k; popText(g.x, 2.4, g.z, '🎉 STUNNED', '#35e7ff'); break;
    case 'dance': g.fx.dance = 4 * k; if (!g.danced) { g.danced = 1; popText(g.x, 2.4, g.z, '🪩 BREAKDANCE', '#b388ff'); } break;
    case 'glue': g.fx.glue = 6 * (boss ? 0.5 : 1); popText(g.x, 2.4, g.z, '🍫 GLUED', '#c58b54'); break;
    case 'push': { const d = Math.hypot(g.x - fx, g.z - fz) || 1; g.kx = (g.x - fx) / d * (boss ? 4 : 11); g.kz = (g.z - fz) / d * (boss ? 4 : 11); g.fx.dizzy = 1.6 * k; } break;
    case 'charm': g.fx.charm = 6 * k; popText(g.x, 2.4, g.z, '🎸 CHARMED 👏', '#ff3dbb'); break;
  }
  if (W.dmg) damageGuard(g, W.dmg, id);
  if (g.state !== 'ko' && !disabled(g) && W.fx !== 'push') { if (g.state === 'alert') g.lk = { x: G.player.x, z: G.player.z }; else { g.state = 'investigate'; g.target = { x: G.player.x, z: G.player.z }; g.path = null; g.sus = 0.8; G.sound.play('q'); } }
  G.sound.play('hit');
}
function hitDrone(d, dmg) { d.hp -= dmg; if (d.hp <= 0 && !d.dead) { d.dead = true; d.cone.visible = false; G.sound.play('ko'); popText(d.x, 3, d.z, 'DRONE DOWN', '#ffd23f'); burst(d.x, 2.6, d.z, [0x263238, 0xff1744], 12); } }
function reload() {
  const R = G.run, id = curWeapon(), a = R.ammo[id], st = weaponStats(id); if (R.reloadT > 0 || a.mag >= st.mag || a.res <= 0) return;
  R.reloadT = st.reload; R.reloadW = id; G.sound.play('reload'); G.hudDirty = true;
}
function finishReload() { const R = G.run, id = R.reloadW, a = R.ammo[id], st = weaponStats(id), n = Math.min(st.mag - a.mag, a.res); a.mag += n; a.res -= n; G.hudDirty = true; }
function cycleWeapon(dir) { const R = G.run, n = G.save.weapons.length; if (n < 2) { toast('Buy more goofy weapons in the Shop'); return; } R.wi = (R.wi + dir + n) % n; R.reloadT = 0; R.cd = 0.25; G.lastWeapon = curWeapon(); setViewmodel(); G.sound.play('click'); G.hudDirty = true; }
function selectWeapon(i) { const R = G.run; if (i >= G.save.weapons.length || i === R.wi) return; R.wi = i; R.reloadT = 0; R.cd = 0.2; G.lastWeapon = curWeapon(); setViewmodel(); G.sound.play('click'); G.hudDirty = true; }
function updateProjs(dt) {
  const R = G.run;
  for (let i = G.projs.length - 1; i >= 0; i--) {
    const p = G.projs[i]; p.life -= dt; if (p.W.grav) p.vy -= 14 * dt;
    const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt, nz = p.z + p.vz * dt; let end = p.life <= 0;
    if (solidAt(nx, nz) || ny > WALL_H + 2) { if (p.bounces > 0) { p.bounces--; if (solidAt(nx, p.z)) p.vx *= -0.6; if (solidAt(p.x, nz)) p.vz *= -0.6; G.sound.play('squeak'); } else end = true; }
    else { p.x = nx; p.z = nz; }
    p.y = ny; if (p.y < 0.15) { if (p.bounces > 0) { p.bounces--; p.y = 0.15; p.vy = Math.abs(p.vy) * 0.55; p.vx *= 0.7; p.vz *= 0.7; G.sound.play('squeak'); } else end = true; }
    p.mesh.position.set(p.x, p.y, p.z); p.mesh.rotation.x += dt * 8; p.mesh.lookAt && p.W.fx === 'blind' && p.mesh.lookAt(p.x + p.vx, p.y + p.vy, p.z + p.vz);
    // guards / drones
    for (const g of G.guards) { if (g.state === 'ko') continue; const r = g.boss ? 0.6 * g.boss.size : 0.65, gy = g.boss ? 1.1 * g.boss.size : 1.1; if (Math.hypot(g.x - p.x, g.z - p.z) < r && Math.abs(p.y - gy) < (g.boss ? 1.2 * g.boss.size : 1.1)) { if (p.W.fx !== 'splash') hitGuard(g, p.id, p.W, p.x - p.vx * 0.05, p.z - p.vz * 0.05); end = true; break; } }
    for (const d of G.drones) if (!d.dead && Math.hypot(d.x - p.x, d.z - p.z) < 0.8 && Math.abs(p.y - 2.8) < 0.7) { hitDrone(d, p.W.dmg || 20); end = true; }
    if (end) {
      if (p.W.fx === 'squeak') { G.sound.play('squeak'); hearNoise(p.x, p.z, 9); popText(p.x, 1, p.z, '🐔 SQUEAK!', '#ffd23f', true); }
      if (p.W.fx === 'splash') { G.sound.play('splat'); burst(p.x, Math.max(0.3, p.y), p.z, [0xffca28, 0x7cb342, 0xff7043], 18); for (const g of G.guards) { if (g.state === 'ko') continue; const d = Math.hypot(g.x - p.x, g.z - p.z); if (d < 3) { const k = 1 - d / 3; hitGuard(g, p.id, Object.assign({}, p.W, { dmg: Math.round(p.W.dmg * (0.4 + 0.6 * k)) }), p.x, p.z); if (!g.boss) { g.kx = (g.x - p.x) / (d || 1) * 10 * k; g.kz = (g.z - p.z) / (d || 1) * 10 * k; } } } }
      if (p.W.fx === 'glue') burst(p.x, Math.max(0.3, p.y), p.z, [0x8d5524, 0x9ccc65], 8);
      G.scene.remove(p.mesh); G.projs.splice(i, 1);
    }
  }
  for (let i = G.eprojs.length - 1; i >= 0; i--) {
    const p = G.eprojs[i], P = G.player; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.mesh.position.set(p.x, p.y, p.z);
    let end = p.life <= 0 || solidAt(p.x, p.z) || p.y < 0;
    if (!end && !P.hidden && Math.hypot(P.x - p.x, P.z - p.z) < 0.7 && p.y > P.y && p.y < P.y + 2) { hurtPlayer(20, p.x - p.vx, p.z - p.vz); end = true; }
    if (end) { burst(p.x, Math.max(0.3, p.y), p.z, [p.mesh.material.color.getHex()], 8); G.scene.remove(p.mesh); G.eprojs.splice(i, 1); }
  }
}

/* ---------- Gadgets ---------- */
function useGadget() {
  const R = G.run, P = G.player, id = GADGET_ORDER[R.gi]; if (R.over || P.hidden) return;
  if (!(R.gad[id] > 0)) { G.sound.play('deny'); toast(`${GADGETS[id].icon} No ${GADGETS[id].name} charges — buy more in the Shop`); return; }
  R.gad[id]--; G.hudDirty = true;
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);
  if (id === 'box') { P.boxT = GADGETS.box.dur * (R.boxBonus || 1); P.crouch = true; G.sound.play('hide'); toast('📦 You are a box now. Stand still or creep.'); }
  else if (id === 'decoy') { let d = castRay(P.x, P.z, fx, fz, 7) - 0.6; d = Math.max(0.8, d); const x = P.x + fx * d, z = P.z + fz * d, g = propMesh('ringlight', G.pal); g.scale.setScalar(0.6); g.position.set(x, 0, z); G.scene.add(g); G.decoys.push({ x, z, mesh: g, t: GADGETS.decoy.dur, ping: 0 }); G.sound.play('decoy'); }
  else if (id === 'smoke') { const x = P.x + fx * 1.5, z = P.z + fz * 1.5, g = new THREE.Group(); for (let i = 0; i < 7; i++) mesh(geoSphere(rand(1, 1.6), 8), basic(pick([0xffb3e6, 0xb3e5fc, 0xffffff]), { transparent: true, opacity: 0.75, depthWrite: false }), rand(-1.2, 1.2), rand(0.6, 2), rand(-1.2, 1.2), g, false); g.position.set(x, 0, z); G.scene.add(g); G.smokes.push({ x, z, r: 2.6, mesh: g, t: GADGETS.smoke.dur }); G.sound.play('smoke'); for (const gd of G.guards) if (gd.state === 'alert' && Math.hypot(gd.x - x, gd.z - z) < 8) { gd.lastSeen -= 0.5; } }
  else if (id === 'emp') { R.empT = GADGETS.emp.dur; G.sound.play('emp'); banner('📡 EMP MEME JAMMER', 'Lasers, cameras and drones offline for 8s', 1.4); }
}
function cycleGadget(dir) { const R = G.run; R.gi = (R.gi + dir + GADGET_ORDER.length) % GADGET_ORDER.length; G.sound.play('click'); G.hudDirty = true; }
function updateGadgets(dt) {
  const R = G.run; if (R.empT > 0) R.empT -= dt;
  for (let i = G.decoys.length - 1; i >= 0; i--) { const d = G.decoys[i]; d.t -= dt; d.ping -= dt; d.mesh.rotation.y += dt; if (d.ping <= 0) { d.ping = 1.6; hearNoise(d.x, d.z, 11); popText(d.x, 2.3, d.z, '🍦 "Ice cream so good!"', '#ffffff', true); G.sound.play('decoy'); } if (d.t <= 0) { G.scene.remove(d.mesh); G.decoys.splice(i, 1); } }
  for (let i = G.smokes.length - 1; i >= 0; i--) { const s = G.smokes[i]; s.t -= dt; s.mesh.rotation.y += dt * 0.3; if (s.t < 1.5) s.mesh.scale.setScalar(Math.max(0.01, s.t / 1.5)); if (s.t <= 0) { G.scene.remove(s.mesh); G.smokes.splice(i, 1); } }
}
function updateHack(dt) {
  const R = G.run, L = G.laptop; if (!L || L.done) return;
  const t = G.input.actHeld && interactTarget(); if (t && t.kind === 'hack') { L.prog += dt / 3; R.noise = Math.max(R.noise, 6); if (Math.random() < 0.3) G.sound.play('hack'); if (L.prog >= 1) { L.done = true; R.hacked = true; L.scr.material = basic(0x4cff6a); G.items.forEach(i => i.locked = false); G.sound.play('pickup'); banner('💻 HACKED', `Vault unlocked — grab the ${R.m.item}`, 1.8); setObjective(); } }
  else L.prog = Math.max(0, L.prog - dt * 0.15);
}

/* ---------- Particles + popups ---------- */
function spawnPart(x, y, z, vx, vy, vz, color, life = 0.8, s = 0.14) { const m = mesh(geoBox(s, s, s), basic(color), x, y, z, G.scene, false); G.parts.push({ mesh: m, vx, vy, vz, life, max: life }); }
function burst(x, y, z, cols, n) { for (let i = 0; i < n; i++) spawnPart(x, y, z, rand(-4, 4), rand(1, 6), rand(-4, 4), pick(cols), rand(0.5, 1.1)); }
function updateParts(dt) { for (let i = G.parts.length - 1; i >= 0; i--) { const p = G.parts[i]; p.life -= dt; p.vy -= 12 * dt; p.mesh.position.x += p.vx * dt; p.mesh.position.y = Math.max(0.05, p.mesh.position.y + p.vy * dt); p.mesh.position.z += p.vz * dt; p.mesh.rotation.x += dt * 5; if (p.life <= 0) { G.scene.remove(p.mesh); G.parts.splice(i, 1); } } }

/* ---------- Mission end ---------- */
function winMission() {
  const R = G.run, m = R.m; if (R.over) return; R.over = true; R.won = true;
  const stars = 1 + (R.t <= m.targetTime ? 1 : 0) + (!R.detected ? 1 : 0), ghost = R.peak < 100;
  const prev = G.save.missions[m.n] || { stars: 0, best: 0, ghost: false }, first = !prev.stars;
  const skinK = G.save.skin === 'crown' ? 1.25 : G.save.skin === 'gold' ? 1.1 : 1;
  let cash = Math.round((m.cash * (0.5 + stars / 6) + R.cash) * (ghost ? 2 : 1) * skinK);
  let tokens = Math.round(m.tokens * (0.5 + stars * 0.17)) * (R.bounty ? 3 : 1); if (!first && prev.stars >= 3) tokens = Math.max(1, Math.round(tokens / 2));
  if (m.n === 70 && first) tokens += 0; // +250 is already in m.tokens
  G.save.cash += cash; G.save.missions[m.n] = { stars: Math.max(prev.stars, stars), best: prev.best ? Math.min(prev.best, Math.round(R.t)) : Math.round(R.t), ghost: prev.ghost || ghost };
  let unlockedCrown = false; if (m.n === 70 && !G.save.skins.includes('crown')) { G.save.skins.push('crown'); unlockedCrown = true; }
  if (R.bounty) G.save.bountyDone = todayStr();
  writeSave(); const got = awardTokens(tokens, 'Sneak & Yeet: ' + m.name);
  G.sound.play('win'); if (document.pointerLockElement) document.exitPointerLock?.();
  G.result = { win: true, stars, ghost, cash, tokens: got, want: tokens, time: R.t, first, unlockedCrown, detected: R.detected, kos: R.kos, bounty: R.bounty };
  setTimeout(() => G && G.run === R && showScreen('result'), 900);
}
function failMission(why) {
  const R = G.run; if (R.over) return; R.over = true; R.won = false; G.sound.play('fail'); if (document.pointerLockElement) document.exitPointerLock?.();
  let tokens = 0, cash = Math.round(R.cash / 2);
  if (R.m.type === 'gauntlet') { const w = R.wave - 1; tokens = awardTokens(Math.min(40, w * 3), 'Sneak & Yeet Gauntlet'); cash += w * 120; if (w > (G.save.gauntletBest || 0)) G.save.gauntletBest = w; }
  G.save.cash += cash; writeSave();
  G.result = { win: false, why, cash, tokens, wave: R.wave - 1 };
  setTimeout(() => G && G.run === R && showScreen('result'), 900);
}
function nextWave() {
  const R = G.run, L = G.level; R.wave++; R.got = 0; G.player.hp = Math.min(100, G.player.hp + 30); G.sound.play('win');
  const rooms = L.rooms.filter(r => r !== L.startRoom), r = pick(rooms), it = G.items[0]; it.x = cellX(r.cx); it.z = cellZ(r.cy); it.got = false; it.mesh.visible = true; it.mesh.position.set(it.x, 0, it.z);
  G.guards.forEach(g => { if (g.state === 'ko') { g.koT = 0.01; } });
  const extra = spawnGuard({ pts: [{ cx: r.cx, cy: r.cy }, { cx: pick(rooms).cx, cy: pick(rooms).cy }], sentry: false }, R.wave, L); extra.range += R.wave * 0.3;
  G.guards.forEach(g => { g.speed *= 1.03; });
  banner(`🌊 WAVE ${R.wave}`, `+1 guard · find the next ${R.m.item}`, 1.8); setObjective();
}
/* ---------- DOM UI ---------- */
const $ = (s, r) => (r || G.root).querySelector(s);
const $$ = (s, r) => [...(r || G.root).querySelectorAll(s)];
function buildUI(area) {
  area.innerHTML = '';
  const root = document.createElement('div'); root.className = 'sy-root'; root.tabIndex = -1;
  root.innerHTML = `
  <canvas class="sy-canvas"></canvas>
  <div class="sy-nv" aria-hidden="true"></div>
  <div class="sy-hurt"></div>
  <div class="sy-hidden" data-hiddenfx hidden><span>🫣 HIDDEN</span></div>
  <div class="sy-pops"></div>
  <div class="sy-cross" aria-hidden="true"><i></i></div>
  <div class="sy-hud" data-hud hidden>
    <div class="sy-meter" data-meter><div class="sy-meter-lbl"><span>🤫 QUIET METER</span><b data-mtext>0%</b></div><div class="sy-meter-track"><div class="sy-meter-fill" data-mfill></div><i style="left:45%"></i><i style="left:20%"></i></div><div class="sy-status" data-status>🟢 UNDETECTED</div></div>
    <div class="sy-boss" data-boss hidden><div class="sy-boss-name" data-bossname></div><div class="sy-boss-track"><div class="sy-boss-fill" data-bossfill></div></div></div>
    <div class="sy-tl">
      <div class="sy-hp"><span>❤️</span><div class="sy-hp-track"><div class="sy-hp-fill" data-hpfill></div></div></div>
      <div class="sy-mname" data-mname></div>
      <div class="sy-obj" data-obj></div>
      <div class="sy-timer" data-timer></div>
    </div>
    <div class="sy-tr">
      <div class="sy-chips">
        <button class="sy-chip" data-act="cam" title="Toggle camera (V)"><span data-cambadge>3rd</span> <kbd data-k="cam">V</kbd></button>
        <button class="sy-chip icon" data-act="fs" title="Fullscreen (F11)" aria-label="Fullscreen">⛶</button>
        <button class="sy-chip icon" data-act="pause" title="Pause (Esc)" aria-label="Pause">⏸</button>
      </div>
      <div class="sy-money"><span>💵 <b data-cash>0</b></span><span>🎟️ <b data-tokens>0</b></span></div>
      <canvas class="sy-map" data-map width="150" height="150"></canvas>
    </div>
    <div class="sy-prompt" data-prompt hidden></div>
    <div class="sy-gadget" data-gadget></div>
    <div class="sy-weapon" data-weapon></div>
  </div>
  <div class="sy-banner" data-banner hidden><div class="t" data-bt></div><div class="s" data-bs></div></div>
  <div class="sy-toasts" data-toasts></div>
  <div class="sy-touch" data-touch hidden>
    <div class="sy-stick" data-stick><div class="sy-knob" data-knob></div></div>
    <div class="sy-look" data-look></div>
    <div class="sy-tbtns">
      <button data-t="fire" class="big">🐔<small>YEET</small></button>
      <button data-t="act" class="big">✊<small>BONK</small></button>
      <button data-t="crouch">🧎<small>CROUCH</small></button>
      <button data-t="jump">⤒<small>JUMP</small></button>
      <button data-t="gadget">🎒<small>GADGET</small></button>
      <button data-t="swap">🔁<small>SWAP</small></button>
      <button data-t="reload">⟳<small>RELOAD</small></button>
      <button data-t="cam">🎥<small>CAM</small></button>
    </div>
    <button class="sy-tpause" data-t="pause">⏸</button>
  </div>
  <div class="sy-screen" data-screen hidden></div>`;
  area.append(root); return root;
}
function bindTxt(a) {
  const pad = G.inputMode === 'pad', touch = G.inputMode === 'touch', L = i => `<kbd class="pad">${G.pad.label(i)}</kbd>`, K = s => `<kbd>${s}</kbd>`;
  const map = {
    act: pad ? L(PAD.X) : touch ? K('BONK') : K('E'), fire: pad ? L(PAD.RT) : touch ? K('YEET') : K('Click'), crouch: pad ? L(PAD.B) : touch ? K('CROUCH') : K('C'),
    jump: pad ? L(PAD.A) : touch ? K('JUMP') : K('Space'), sprint: pad ? L(PAD.L3) : K('Shift'), swap: pad ? L(PAD.LB) + L(PAD.RB) : touch ? K('SWAP') : K('Q') + K('1–9'),
    gadget: pad ? L(PAD.DOWN) : touch ? K('GADGET') : K('G'), gcycle: pad ? L(PAD.LEFT) + L(PAD.RIGHT) : K('Tab'), cam: pad ? L(PAD.R3) : touch ? K('CAM') : K('V'),
    reload: pad ? L(PAD.Y) : touch ? K('RELOAD') : K('R'), zoom: pad ? L(PAD.LT) : K('Right-click'), pause: pad ? L(PAD.START) : K('Esc'), back: pad ? L(PAD.B) : K('Esc'), ok: pad ? L(PAD.A) : K('Enter'),
    tabs: pad ? L(PAD.LB) + L(PAD.RB) : K('Q') + K('E')
  };
  return map[a] || '';
}
function toast(msg, kind) {
  if (!G) return; const box = $('[data-toasts]'), t = document.createElement('div'); t.className = 'sy-toast ' + (kind || ''); t.innerHTML = msg; box.prepend(t);
  while (box.children.length > 3) box.lastChild.remove(); setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, 2600);
}
function banner(t, s, dur = 2) { const b = $('[data-banner]'); $('[data-bt]').textContent = t; $('[data-bs]').textContent = s || ''; b.hidden = false; b.classList.remove('in'); void b.offsetWidth; b.classList.add('in'); clearTimeout(G.bannerT); G.bannerT = setTimeout(() => { if (G) b.hidden = true; }, dur * 1000); }
function bossBar(g) { if (!G || !G.root) return; const el = $('[data-boss]'); if (!g) { el.hidden = true; return; } el.hidden = false; $('[data-bossname]').textContent = '👑 ' + g.boss.name; $('[data-bossfill]').style.width = Math.max(0, g.hp / g.maxHp * 100) + '%'; }
function popText(x, y, z, txt, color = '#fff', sm) {
  const el = document.createElement('div'); el.className = 'sy-pop' + (sm ? ' sm' : ''); el.textContent = txt; el.style.color = color; $('.sy-pops').append(el);
  G.pops.push({ el, x, y, z, t: 0 }); if (G.pops.length > 14) { const o = G.pops.shift(); o.el.remove(); }
}
function updatePops(dt) {
  const v = G.tmpV2 || (G.tmpV2 = new THREE.Vector3());
  for (let i = G.pops.length - 1; i >= 0; i--) { const p = G.pops[i]; p.t += dt; if (p.t > 1.3) { p.el.remove(); G.pops.splice(i, 1); continue; } v.set(p.x, p.y + p.t * 0.9, p.z).project(G.camera); if (v.z > 1) { p.el.style.opacity = 0; continue; } p.el.style.opacity = String(1 - Math.max(0, p.t - 0.8) * 2); p.el.style.transform = `translate(${(v.x * 0.5 + 0.5) * G.vw}px,${(-v.y * 0.5 + 0.5) * G.vh}px) translate(-50%,-50%)`; }
}
function setObjective() {
  const R = G.run; if (!R) return; const m = R.m; let t = '';
  if (m.type === 'gauntlet') t = R.got ? '🚐 Deliver the taco to the van' : `🌮 Wave ${R.wave}: steal the ${m.item}`;
  else if (objectivesDone()) t = G.exit.kind === 'heli' ? '🚁 Escape to the helipad' : '🚐 Escape to the van';
  else if (m.type === 'boss') t = R.bossDown ? `⭐ Grab the ${m.item}` : `👑 Defeat ${BOSSES[m.boss].name} (bonk from behind!)`;
  else if (m.type === 'switch') t = `🔌 Flip the switches ${R.switches}/3`;
  else if (m.type === 'hack' && !R.hacked) t = `💻 Hack the laptop (hold ${bindTxt('act')})`;
  else if (m.type === 'collect') t = `⭐ Collect ${m.item} ${R.got}/3`;
  else t = `⭐ Steal the ${m.item}`;
  $('[data-obj]').innerHTML = t; G.exit.ring.material = basic(objectivesDone() ? 0x4cff6a : 0x666666);
}
function updateHUD(full) {
  const R = G.run; if (!R) return; const P = G.player, m = R.m;
  const n = Math.round(R.noise), col = n >= 100 ? '#ff2d55' : n >= 60 ? '#ff6b3d' : n >= 30 ? '#ffd23f' : '#4cff6a';
  $('[data-mfill]').style.width = n + '%'; $('[data-mfill]').style.background = col; $('[data-mtext]').textContent = n + '%'; $('[data-meter]').classList.toggle('red', n >= 100 || R.busted > 0);
  const anyAlert = G.guards.some(g => g.state === 'alert'), anySus = G.guards.some(g => g.state === 'sus' || g.state === 'investigate');
  $('[data-status]').innerHTML = P.hidden ? '🫣 HIDDEN' : anyAlert ? '🔴 ALERT — RUN & HIDE' : R.alarm > 0 ? `🟠 COOLING DOWN ${Math.ceil(R.alarm)}s` : anySus ? '🟡 SUSPICIOUS…' : (R.detected ? '🟢 CALM' : '🟢 UNDETECTED') + (R.ghost ? ' · 👻 GHOST' : '');
  $('[data-status]').className = 'sy-status ' + (anyAlert ? 'alert' : anySus || R.alarm > 0 ? 'sus' : '');
  $('[data-hpfill]').style.width = P.hp + '%'; $('[data-hpfill]').style.background = P.hp > 60 ? '#4cff6a' : P.hp > 30 ? '#ffd23f' : '#ff4d4d';
  $('[data-mname]').textContent = (typeof m.n === 'number' ? m.n + ' · ' : '') + m.name + (R.bounty ? ' · 🔥 3x BOUNTY' : '');
  $('[data-timer]').innerHTML = m.type === 'gauntlet' ? `🌊 Wave ${R.wave} · Best ${G.save.gauntletBest || 0}` : m.timer ? `⏱️ <b class="${R.timer < 20 ? 'warn' : ''}">${fmtT(R.timer)}</b> left` : `⏱️ ${fmtT(R.t)} <small>/ ★ ${fmtT(m.targetTime)}</small>`;
  $('[data-cash]').textContent = fmt(G.save.cash + R.cash); $('[data-tokens]').textContent = fmt(tokenBalance());
  $('[data-cambadge]').textContent = G.settings.cam === 'third' ? '3rd' : '1st';
  const id = curWeapon(), W = WEAPONS[id], a = R.ammo[id], st = weaponStats(id);
  $('[data-weapon]').innerHTML = `<div class="sy-wicon">${W.icon}</div><div class="sy-winfo"><b>${esc(W.name)}</b><span class="sy-ammo">${R.reloadT > 0 ? '<i class="rl">RELOADING…</i>' : `<big>${a.mag}</big> / ${a.res}`}</span><small>🔊 ${Math.round(st.noise)}% noise · ${bindTxt('fire')} yeet · ${bindTxt('reload')} reload</small></div><div class="sy-wdots">${G.save.weapons.map((w, i) => `<span class="${i === R.wi ? 'on' : ''}" title="${esc(WEAPONS[w].name)}">${WEAPONS[w].icon}</span>`).join('')}</div>`;
  const gid = GADGET_ORDER[R.gi], GD = GADGETS[gid];
  $('[data-gadget]').innerHTML = `<div class="sy-gicon">${GD.icon}<b>${R.gad[gid] || 0}</b></div><div class="sy-ginfo"><b>${esc(GD.name)}</b><small>${bindTxt('gadget')} use · ${bindTxt('gcycle')} next</small><small>${P.boxT > 0 ? '📦 ' + Math.ceil(P.boxT) + 's' : R.empT > 0 ? '📡 EMP ' + Math.ceil(R.empT) + 's' : P.crouch ? '🧎 Crouching (' + (5 * (m.strict || 1)).toFixed(0) + '% noise)' : ''}</small></div>`;
}
function updatePrompt() {
  const t = interactTarget(), el = $('[data-prompt]'); let h = '';
  if (t) {
    if (t.kind === 'bonk') h = `${bindTxt('act')} ${t.g.boss ? 'Sneak attack' : 'Silent Takedown (Bonk)'}`;
    else if (t.kind === 'hide') h = `${bindTxt('act')} Hide in ${t.h.kind === 'box' ? 'cardboard box' : 'locker'}`;
    else if (t.kind === 'unhide') h = `${bindTxt('act')} Leave hiding spot`;
    else if (t.kind === 'switch') h = `${bindTxt('act')} Flip switch`;
    else if (t.kind === 'hack') h = `Hold ${bindTxt('act')} Hack laptop <b>${Math.round(G.laptop.prog * 100)}%</b>`;
  }
  if (h !== G.lastPrompt) { G.lastPrompt = h; el.hidden = !h; el.innerHTML = h; }
  $('[data-hiddenfx]').hidden = !G.player.hidden;
}
/* ---------- Minimap ---------- */
function drawMap() {
  const c = $('[data-map]'), g = c.getContext('2d'), L = G.level, P = G.player; if (!L) return;
  if (!G.mapImg || G.mapImg.L !== L) { const o = document.createElement('canvas'); o.width = L.W * 4; o.height = L.H * 4; const og = o.getContext('2d'); og.fillStyle = '#0b0e1a'; og.fillRect(0, 0, o.width, o.height); for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) { const v = L.grid[y * L.W + x]; if (v === 0) { og.fillStyle = '#3a4466'; og.fillRect(x * 4, y * 4, 4, 4); } else if (v === 2) { og.fillStyle = '#242b44'; og.fillRect(x * 4, y * 4, 4, 4); } } L.shadows.forEach(s => { og.fillStyle = '#1d2236'; og.fillRect(s.x * 4, s.y * 4, s.w * 4, s.h * 4); }); G.mapImg = o; o.L = L; }
  const S = 150, zoom = 2.2, px = P.x / CELL * 4, pz = P.z / CELL * 4;
  g.clearRect(0, 0, S, S); g.save(); g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2); g.clip(); g.fillStyle = '#05070f'; g.fillRect(0, 0, S, S);
  g.translate(S / 2, S / 2); g.scale(zoom, zoom); g.translate(-px, -pz); g.drawImage(G.mapImg, 0, 0);
  const dot = (x, z, col, r = 1.6) => { g.fillStyle = col; g.beginPath(); g.arc(x / CELL * 4, z / CELL * 4, r, 0, Math.PI * 2); g.fill(); };
  dot(G.exit.x, G.exit.z, objectivesDone() ? '#4cff6a' : '#567', 2.4);
  G.items.forEach(i => { if (!i.got && !(i.locked && G.clock % 1 < 0.5)) dot(i.x, i.z, '#ffd23f', 2.2); });
  G.switches.forEach(s => dot(s.x, s.z, s.on ? '#4cff6a' : '#ff9f1c', 1.8)); if (G.laptop && !G.laptop.done) dot(G.laptop.x, G.laptop.z, '#35e7ff', 2);
  G.lasers.forEach(l => { if (l.active) dot(l.x, l.z, '#ff1744', 1); });
  G.guards.forEach(o => dot(o.x, o.z, o.state === 'ko' ? '#556' : o.state === 'alert' ? '#ff3b3b' : (o.state === 'sus' || o.state === 'investigate') ? '#ffd23f' : '#9bffb0', o.boss ? 3 : 1.6));
  G.drones.forEach(o => { if (!o.dead) dot(o.x, o.z, '#ff3dbb', 1.4); }); G.cams.forEach(o => dot(o.x, o.z, '#ffffff', 1));
  g.translate(px, pz); g.rotate(-P.yaw); g.fillStyle = '#35e7ff'; g.beginPath(); g.moveTo(0, -3.2); g.lineTo(2.2, 2.4); g.lineTo(-2.2, 2.4); g.closePath(); g.fill();
  g.restore(); g.strokeStyle = '#14161f'; g.lineWidth = 3; g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2); g.stroke();
}

/* ---------- Screens ---------- */
function progress() {
  const ms = G.save.missions, nums = MISSIONS.map(m => ms[m.n]).filter(Boolean);
  return { cleared: nums.filter(x => x.stars > 0).length, stars: nums.reduce((a, x) => a + (x.stars || 0), 0), ghosts: nums.filter(x => x.ghost).length };
}
const unlocked = n => typeof n !== 'number' ? true : n === 1 || !!(G.save.missions[n - 1] && G.save.missions[n - 1].stars > 0) || !!(G.save.missions[n] && G.save.missions[n].stars);
function maxUnlocked() { let n = 1; while (n < 70 && unlocked(n + 1)) n++; return n; }
function dailyBounty() { const top = maxUnlocked(); return 1 + (hashStr('bounty' + todayStr()) % top); }
function starStr(n) { return '★'.repeat(n) + '<i>' + '★'.repeat(3 - n) + '</i>'; }
function weaponCard(id) {
  const W = WEAPONS[id], own = G.save.weapons.includes(id), bars = [['Damage', W.dmg / 100], ['Fire Rate', W.rate / 7], ['Range', (W.speed ? W.range : W.range * 3) / 40], ['Ammo', W.mag / 40], ['Noise', W.noise / 100]];
  return `<div class="sy-card ${W.legendary ? 'legend' : ''}"><div class="sy-cico">${W.icon}</div><b>${esc(W.name)}</b>${W.legendary ? '<span class="sy-tag gold">LEGENDARY</span>' : ''}<small>${esc(W.desc)}</small><div class="sy-bars">${bars.map(([k, v]) => `<div><span>${k}</span><i><em style="width:${clamp(v, 0.04, 1) * 100}%" class="${k === 'Noise' ? 'n' : ''}"></em></i></div>`).join('')}</div>${own ? '<button class="sy-btn alt" disabled>✓ Owned</button>' : `<button class="sy-btn gold" data-do="buyw" data-v="${id}" ${G.save.cash < W.price ? 'disabled' : ''}>💵 ${fmt(W.price)}</button>`}</div>`;
}
function screenHTML(s) {
  const P = progress(), cash = `<span class="sy-pill">💵 ${fmt(G.save.cash)}</span><span class="sy-pill">🎟️ ${fmt(tokenBalance())}</span>`;
  if (s === 'title') {
    const b = dailyBounty(), bm = MISSIONS[b - 1], bdone = G.save.bountyDone === todayStr();
    return `<div class="sy-title"><div class="sy-logo"><span class="a">SNEAK</span><span class="amp">&amp;</span><span class="b">YEET</span><sup>3D</sup></div><p class="sy-tag2">Stay quiet. Bonk guards. Yeet rubber chickens. 70 viral heists.</p>
      <div class="sy-stats"><span class="sy-pill">🥷 ${P.cleared}/70 cleared</span><span class="sy-pill">⭐ ${P.stars}/210</span><span class="sy-pill">👻 ${P.ghosts} Ghost Rizz</span>${cash}</div>
      <div class="sy-menu"><button class="sy-btn big" data-do="levels" data-auto>▶ CAMPAIGN</button>
      <button class="sy-btn bounty" data-do="bounty" ${bdone ? 'disabled' : ''}>🔥 Daily Viral Bounty: <b>#${b} ${esc(bm.name)}</b> <span class="sy-tag gold">${bdone ? 'DONE TODAY' : '3x TOKENS'}</span></button>
      <div class="sy-row"><button class="sy-btn" data-do="classic">🎬 Classic Ops</button><button class="sy-btn" data-do="gauntlet">🌊 Endless Gauntlet <small>Best ${G.save.gauntletBest || 0}</small></button></div>
      <div class="sy-row"><button class="sy-btn" data-do="shop">🛒 Shop</button><button class="sy-btn" data-do="howto">🎮 How to Play</button><button class="sy-btn" data-do="settings">⚙️ Settings</button></div></div>
      <p class="sy-foot">${G.inputMode === 'pad' ? `🎮 ${G.pad.brand === 'ps' ? 'PlayStation' : G.pad.brand === 'switch' ? 'Switch' : 'Xbox'} controller ready` : 'Plug in a controller anytime'} · Clear missions for Arcade Tokens</p></div>`;
  }
  if (s === 'levels') {
    const ch = G.chapter || 1, tabs = CHAPTERS.map(c => `<button class="sy-tab ${c.id === ch ? 'on' : ''}" data-do="chap" data-v="${c.id}" style="--c:${c.color}">${unlocked((c.id - 1) * 10 + 1) ? '' : '🔒 '}CH${c.id} <small>${c.short}</small></button>`).join('');
    const list = MISSIONS.filter(m => m.chapter === ch), b = dailyBounty(), sel = G.selMission && G.selMission.chapter === ch ? G.selMission : list.find(m => unlocked(m.n) && !(G.save.missions[m.n] && G.save.missions[m.n].stars)) || list[0];
    const tiles = list.map(m => { const sv = G.save.missions[m.n] || {}, ok = unlocked(m.n); return `<button class="sy-lv ${m.boss ? 'boss' : ''} ${ok ? '' : 'locked'} ${sel === m ? 'sel' : ''}" data-do="pickm" data-v="${m.n}" ${sel === m ? 'data-auto' : ''}><span class="num">${m.boss ? '👑' : m.n}</span>${b === m.n ? '<span class="sy-bty">🔥3x</span>' : ''}${sv.ghost ? '<span class="sy-gh">👻</span>' : ''}<span class="nm">${esc(m.name.replace(/^(BOSS: |Nightmare: |Creator Gauntlet: )/, ''))}</span><span class="st">${ok ? starStr(sv.stars || 0) : '🔒'}</span></button>`; }).join('');
    const sv = G.save.missions[sel.n] || {}, typeTxt = { heist: '🎯 Heist — steal it & escape', collect: '🧺 Collect 3 & escape', switch: '🔌 3 switches before the timer', hack: '💻 Hack, grab & reach the helipad', lasers: '🔴 Laser heist', boss: '👑 Boss fight' }[sel.type];
    const tags = [sel.strict > 1 ? '🧘 Extra-strict Quiet Meter' : '', sel.lasers ? '🔴 Lasers' : '', sel.cameras ? '📹 Cameras' : '', sel.drones ? '🛸 Drones' : '', sel.nightmare ? '🌙 Night-vision · 2x tokens' : '', sel.bears ? '🐻 Bears' : '', sel.lowgrav ? '🪐 Low gravity' : ''].filter(Boolean);
    return `<div class="sy-panel wide"><div class="sy-head"><h2>🗺️ ${esc(CHAPTERS[ch - 1].name)}</h2>${cash}<button class="sy-x" data-do="back" aria-label="Back">✕</button></div>
      <div class="sy-tabs">${tabs}</div><div class="sy-hint">${bindTxt('tabs')} chapters · ${P.cleared}/70 cleared · ⭐ ${P.stars}</div>
      <div class="sy-lvgrid">${tiles}</div>
      <div class="sy-brief ${unlocked(sel.n) ? '' : 'locked'}"><div><h3>${sel.boss ? '👑' : '#' + sel.n} ${esc(sel.name)}</h3><p>${typeTxt} · ⭐ ${esc(sel.item)}</p><p class="sy-tags">${tags.map(t => `<span>${t}</span>`).join('')}</p><p class="sy-sm">★ Clear · ★ Under ${fmtT(sel.targetTime)} · ★ Never detected · 👻 Never hit 100% noise = 2x cash${sv.best ? ` · Best ${fmtT(sv.best)}` : ''}</p></div>
      <div class="sy-brief-r"><span class="sy-pill">💵 ~${fmt(sel.cash)}</span><span class="sy-pill">🎟️ ${sel.tokens * (b === sel.n ? 3 : 1)}</span>${unlocked(sel.n) ? `<button class="sy-btn big" data-do="start" data-v="${sel.n}">▶ START</button>` : '<button class="sy-btn" disabled>🔒 Clear the previous mission</button>'}</div></div></div>`;
  }
  if (s === 'classic') {
    return `<div class="sy-panel"><div class="sy-head"><h2>🎬 Classic Ops</h2>${cash}<button class="sy-x" data-do="back" aria-label="Back">✕</button></div><p class="sy-sub">The original four heists. Always unlocked.</p><div class="sy-grid">${CLASSIC.map((m, i) => { const sv = G.save.missions[m.n] || {}; return `<div class="sy-card"><div class="sy-cico">${['🌮', '👟', '🧸', '👑'][i]}</div><b>${esc(m.name)}</b><small>${esc({ heist: 'Steal the ' + m.item + ' and escape.', lasers: 'Dodge the laser grid and swipe the ' + m.item + '.', switch: 'Flip 3 switches before the timer runs out.', hack: 'Hack the laptop, grab the ' + m.item + ', escape by helicopter.' }[m.type])}</small><span class="st">${starStr(sv.stars || 0)}</span><button class="sy-btn" data-do="start" data-v="${m.n}" ${i === 0 ? 'data-auto' : ''}>▶ Play</button></div>`; }).join('')}</div></div>`;
  }
  if (s === 'shop') {
    const tab = G.shopTab || 'weapons', tabs = [['weapons', '🔫 Weapons'], ['upgrades', '🔧 Upgrades'], ['skins', '🥷 Skins'], ['gadgets', '🎒 Gadgets']].map(([k, n]) => `<button class="sy-tab ${tab === k ? 'on' : ''}" data-do="stab" data-v="${k}">${n}</button>`).join('');
    let body = '';
    if (tab === 'weapons') body = `<div class="sy-grid">${WEAPON_ORDER.map(weaponCard).join('')}</div>`;
    else if (tab === 'upgrades') body = `<div class="sy-ups">${G.save.weapons.map(w => { const u = G.save.upgrades[w] || {}; return `<div class="sy-up"><span class="sy-cico sm">${WEAPONS[w].icon}</span><b>${esc(WEAPONS[w].name)}</b>${Object.keys(UPGRADES).map(k => { const l = u[k] || 0, c = upCost(w, k, l); return `<button class="sy-btn ${l >= MAX_UP ? 'alt' : 'gold'}" data-do="buyu" data-v="${w}|${k}" ${l >= MAX_UP || G.save.cash < c ? 'disabled' : ''} title="${esc(UPGRADES[k].desc)}">${UPGRADES[k].icon} ${UPGRADES[k].name} ${'●'.repeat(l)}${'○'.repeat(MAX_UP - l)}<small>${l >= MAX_UP ? 'MAX' : '💵 ' + fmt(c)}</small></button>`; }).join('')}</div>`; }).join('')}</div>`;
    else if (tab === 'skins') body = `<div class="sy-grid">${SKIN_ORDER.map(k => { const S = SKINS[k], own = G.save.skins.includes(k), eq = G.save.skin === k; const sw = [S.skin, S.shirt, S.pants].map(c => `<i style="background:#${new THREE.Color(c).getHexString()}"></i>`).join(''); return `<div class="sy-card ${eq ? 'eq' : ''}"><div class="sy-sw">${sw}</div><b>${esc(S.name)}</b><small>${esc(S.desc || 'The classic look.')}</small>${eq ? '<button class="sy-btn alt" disabled>✓ Equipped</button>' : own ? `<button class="sy-btn" data-do="equip" data-v="${k}">Equip</button>` : S.price < 0 ? '<button class="sy-btn" disabled>🔒 Beat Mission 70</button>' : `<button class="sy-btn gold" data-do="buys" data-v="${k}" ${G.save.cash < S.price ? 'disabled' : ''}>💵 ${fmt(S.price)}</button>`}</div>`; }).join('')}</div>`;
    else body = `<p class="sy-sub">Charges carry between missions. Max 5 each.</p><div class="sy-grid">${GADGET_ORDER.map(k => { const D = GADGETS[k], n = G.save.gadgets[k] || 0; return `<div class="sy-card"><div class="sy-cico">${D.icon}</div><b>${esc(D.name)} <span class="sy-tag">x${n}</span></b><small>${esc(D.desc)}</small><button class="sy-btn gold" data-do="buyg" data-v="${k}" ${n >= 5 || G.save.cash < D.price ? 'disabled' : ''}>${n >= 5 ? 'MAX' : '💵 ' + fmt(D.price) + ' · +1'}</button></div>`; }).join('')}</div>`;
    return `<div class="sy-panel wide"><div class="sy-head"><h2>🛒 Sneaky Shop</h2>${cash}<button class="sy-x" data-do="back" aria-label="Back">✕</button></div><div class="sy-tabs">${tabs}</div><div class="sy-hint">${bindTxt('tabs')} switch tabs · earn 💵 by clearing missions</div>${body}</div>`;
  }
  if (s === 'howto') {
    const rows = [['Move', '<kbd>WASD</kbd>', 'LS'], ['Sprint (loud)', bindTxtK('sprint'), 'L3'], ['Crouch (quiet)', '<kbd>C</kbd> <kbd>Ctrl</kbd>', 'B / ○'], ['Jump', '<kbd>Space</kbd>', 'A / ✕'], ['Yeet weapon', '<kbd>Click</kbd>', 'RT'], ['Zoom', '<kbd>Right-click</kbd>', 'LT'], ['Bonk / Hide / Use', '<kbd>E</kbd>', 'X / □'], ['Reload', '<kbd>R</kbd>', 'Y / △'], ['Switch weapon', '<kbd>Q</kbd> <kbd>1–9</kbd> <kbd>Wheel</kbd>', 'LB / RB'], ['Use gadget', '<kbd>G</kbd>', 'D-Pad ↓'], ['Next gadget', '<kbd>Tab</kbd>', 'D-Pad ← →'], ['1st / 3rd person', '<kbd>V</kbd>', 'R3'], ['Pause', '<kbd>Esc</kbd>', 'Start']];
    return `<div class="sy-panel"><div class="sy-head"><h2>🎮 How to Play</h2><button class="sy-x" data-do="back" aria-label="Back" data-auto>✕</button></div>
      <div class="sy-how"><div><h3>🤫 The Quiet Meter</h3><p>Walking fills it to 20%, sprinting to 45%, crouching only 5%. Sound traps (chip bags, rubber ducks, bubble wrap, Moo Deng toys…) and loud weapons spike it. Hit <b>100%</b> and you're <b>BUSTED</b> — every guard nearby comes running.</p>
      <h3>👀 Guards</h3><p>Their floor cones show what they see: <b class="g">green</b> relaxed, <b class="y">yellow ?</b> investigating, <b class="r">red !</b> alerted. Crouch and stick to dark shadows to stay invisible longer. Sneak up from behind and <b>Bonk</b> for a silent takedown.</p>
      <h3>🫣 Hiding</h3><p>Duck into cardboard boxes or lockers until the alert cools down. Gadgets help: a Box Disguise, a Ring-Light Decoy, Cotton-Candy Smoke and an EMP Meme Jammer.</p>
      <h3>⭐ Stars</h3><p>★ Clear the mission · ★ Beat the target time · ★ Never get detected. Finish without ever hitting 100% noise to earn the <b>👻 GHOST RIZZ</b> badge (2x cash).</p></div>
      <table class="sy-keys"><tr><th></th><th>Keyboard</th><th>Controller</th></tr>${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td><kbd class="pad">${r[2]}</kbd></td></tr>`).join('')}</table></div></div>`;
  }
  if (s === 'settings') {
    const S = G.settings, opt = (k, v, l) => `<button class="sy-seg ${S[k] === v ? 'on' : ''}" data-do="set" data-v="${k}|${v}">${l}</button>`;
    return `<div class="sy-panel"><div class="sy-head"><h2>⚙️ Settings</h2><button class="sy-x" data-do="back" aria-label="Back">✕</button></div><div class="sy-set">
      <div><span>Camera</span>${opt('cam', 'third', '3rd person')}${opt('cam', 'first', '1st person')}</div>
      <div><span>Quality</span>${opt('quality', 'Low', 'Low')}${opt('quality', 'Medium', 'Medium')}${opt('quality', 'High', 'High')}</div>
      <div><span>Sensitivity</span><button class="sy-seg" data-do="sens" data-v="-1" data-auto>−</button><b class="sy-val">${S.sens.toFixed(1)}</b><button class="sy-seg" data-do="sens" data-v="1">+</button></div>
      <div><span>Invert Y</span>${opt('invertY', false, 'Off')}${opt('invertY', true, 'On')}</div>
      <div><span>Sound</span>${opt('mute', false, 'On')}${opt('mute', true, 'Muted')}</div>
      <div><span>Rumble</span>${opt('rumble', true, 'On')}${opt('rumble', false, 'Off')}</div>
      <div><span>Touch controls</span>${opt('touch', 'auto', 'Auto')}${opt('touch', 'on', 'On')}${opt('touch', 'off', 'Off')}</div></div></div>`;
  }
  if (s === 'pause') {
    const cab = !!(window.JGCabinet && JGCabinet.eject);
    return `<div class="sy-panel small"><div class="sy-head"><h2>⏸ Paused</h2></div><div class="sy-menu"><button class="sy-btn big" data-do="resume" data-auto>▶ Resume</button><button class="sy-btn" data-do="restart">🔁 Restart mission</button><button class="sy-btn" data-do="levels">🗺️ Level select</button><button class="sy-btn" data-do="settings">⚙️ Settings</button><button class="sy-btn" data-do="howto">🎮 Controls</button><button class="sy-btn" data-do="title">🏠 Title screen</button>${cab ? '<button class="sy-btn red" data-do="eject">⏏ Exit to Arcade</button>' : ''}</div></div>`;
  }
  if (s === 'result') {
    const r = G.result, m = G.run.m;
    if (r.win) {
      const next = typeof m.n === 'number' && m.n < 70 ? m.n + 1 : null;
      return `<div class="sy-panel small result win"><h2>🎉 MISSION CLEAR</h2><p class="sy-mn">${esc(m.name)}</p><div class="sy-stars">${[0, 1, 2].map(i => `<span class="${i < r.stars ? 'on' : ''}" style="animation-delay:${i * 0.25}s">★</span>`).join('')}</div>
        <div class="sy-res"><span>★ Clear ✓</span><span>★ Time ${fmtT(r.time)} / ${fmtT(m.targetTime)} ${r.time <= m.targetTime ? '✓' : '✗'}</span><span>★ Undetected ${r.detected ? '✗' : '✓'}</span></div>
        ${r.ghost ? '<div class="sy-ghost">👻 GHOST RIZZ — 2x CASH</div>' : ''}${r.bounty ? '<div class="sy-ghost bty">🔥 DAILY VIRAL BOUNTY — 3x TOKENS</div>' : ''}${r.unlockedCrown ? '<div class="sy-ghost gold">👑 24K VIRAL CROWN SKIN UNLOCKED</div>' : ''}
        <div class="sy-stats"><span class="sy-pill">💵 +${fmt(r.cash)}</span><span class="sy-pill">🎟️ +${r.tokens}${r.tokens < r.want ? ' (daily cap)' : ''}</span><span class="sy-pill">✊ ${r.kos} KOs</span></div>
        <div class="sy-menu">${next ? `<button class="sy-btn big" data-do="start" data-v="${next}" data-auto>▶ Next mission</button>` : ''}<button class="sy-btn" data-do="restart" ${next ? '' : 'data-auto'}>🔁 Replay</button><button class="sy-btn" data-do="levels">🗺️ Level select</button><button class="sy-btn" data-do="shop">🛒 Shop</button></div></div>`;
    }
    return `<div class="sy-panel small result"><h2>${m.type === 'gauntlet' ? '🌊 GAUNTLET OVER' : '💥 MISSION FAILED'}</h2><p class="sy-mn">${esc(r.why)}</p>${m.type === 'gauntlet' ? `<div class="sy-stats"><span class="sy-pill">🌊 Waves cleared ${r.wave}</span><span class="sy-pill">🏆 Best ${G.save.gauntletBest || 0}</span></div>` : ''}<div class="sy-stats"><span class="sy-pill">💵 +${fmt(r.cash)}</span>${r.tokens ? `<span class="sy-pill">🎟️ +${r.tokens}</span>` : ''}</div>
      <div class="sy-menu"><button class="sy-btn big" data-do="restart" data-auto>🔁 Try again</button><button class="sy-btn" data-do="levels">🗺️ Level select</button><button class="sy-btn" data-do="shop">🛒 Shop</button><button class="sy-btn" data-do="title">🏠 Title</button></div></div>`;
  }
  return '';
}
function bindTxtK(a) { return a === 'sprint' ? '<kbd>Shift</kbd>' : ''; }
function showScreen(s) {
  if (!s || s === 'title') G.stack = [];
  G.screen = s; const el = $('[data-screen]');
  if (!s) { el.hidden = true; el.innerHTML = ''; G.root.classList.remove('menu'); return; }
  if (document.pointerLockElement) document.exitPointerLock?.();
  el.hidden = false; el.className = 'sy-screen ' + s; el.innerHTML = screenHTML(s); G.root.classList.add('menu');
  G.navI = 0; const els = navEls(), a = el.querySelector('[data-auto]'); if (a) G.navI = Math.max(0, els.indexOf(a)); markNav();
}
function refreshScreen() { if (!G.screen) return; const keep = G.navI, focusV = navEls()[keep] && navEls()[keep].dataset; const el = $('[data-screen]'), st = el.firstElementChild && el.firstElementChild.scrollTop; el.innerHTML = screenHTML(G.screen); const els = navEls(); let i = focusV ? els.findIndex(e => e.dataset.do === focusV.do && e.dataset.v === focusV.v) : -1; G.navI = i >= 0 ? i : Math.min(keep, els.length - 1); if (el.firstElementChild && st) el.firstElementChild.scrollTop = st; markNav(); }
function navEls() { return $$('[data-screen] [data-do]').filter(e => !e.disabled || e.dataset.do === 'pickm'); }
function markNav() { const els = navEls(); els.forEach((e, i) => e.classList.toggle('nav', i === G.navI && G.inputMode === 'pad')); const e = els[G.navI]; if (e && G.inputMode === 'pad') e.scrollIntoView({ block: 'nearest' }); }
function navMove(dx, dy) {
  const els = navEls(); if (!els.length) return; const cur = els[G.navI] || els[0], r0 = cur.getBoundingClientRect(), cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2;
  let best = -1, bs = 1e9; els.forEach((e, i) => { if (e === cur) return; const r = e.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, ddx = x - cx, ddy = y - cy; if (dx && Math.sign(ddx) !== dx) return; if (dy && Math.sign(ddy) !== dy) return; if (dx && Math.abs(ddx) < 4) return; if (dy && Math.abs(ddy) < 4) return; const s = dx ? Math.abs(ddx) + Math.abs(ddy) * 2.5 : Math.abs(ddy) + Math.abs(ddx) * 2.5; if (s < bs) { bs = s; best = i; } });
  if (best >= 0) { G.navI = best; G.sound.play('click'); markNav(); }
}
function screenAction(a, v, el) {
  const S = G.save; G.sound.ensure();
  const sub = () => { if (G.screen && G.screen !== a) { G.stack = G.stack || []; G.stack.push(G.screen); } };
  switch (a) {
    case 'levels': sub(); G.selMission = null; if (!G.chapter) G.chapter = Math.min(7, Math.floor((maxUnlocked() - 1) / 10) + 1); showScreen('levels'); break;
    case 'classic': sub(); showScreen('classic'); break;
    case 'chap': G.chapter = +v; G.selMission = null; G.sound.play('click'); refreshScreen(); G.navI = navEls().findIndex(e => e.dataset.do === 'chap' && e.dataset.v === v); markNav(); break;
    case 'pickm': { const m = MISSIONS[+v - 1]; if (G.selMission === m && unlocked(m.n)) { startMission(m.n); return; } G.selMission = m; G.sound.play('click'); refreshScreen(); break; }
    case 'start': G.sound.play('click'); startMission(/^\d+$/.test(v) ? +v : v); break;
    case 'bounty': startMission(dailyBounty()); break;
    case 'gauntlet': startMission('gauntlet', { seed: Math.floor(Math.random() * 1e6) }); break;
    case 'restart': if (G.run) startMission(G.run.m.n, { seed: G.run.m.type === 'gauntlet' ? Math.floor(Math.random() * 1e6) : 0 }); break;
    case 'resume': showScreen(null); lockPointer(); break;
    case 'title': toTitle(); break;
    case 'eject': try { window.JGCabinet.eject(); } catch (e) {} break;
    case 'shop': sub(); showScreen('shop'); break;
    case 'stab': G.shopTab = v; G.sound.play('click'); refreshScreen(); break;
    case 'buyw': { const W = WEAPONS[v]; if (S.cash >= W.price && !S.weapons.includes(v)) { S.cash -= W.price; S.weapons.push(v); S.weapons.sort((a, b) => WEAPON_ORDER.indexOf(a) - WEAPON_ORDER.indexOf(b)); writeSave(); G.sound.play('buy'); toast(`${W.icon} ${esc(W.name)} unlocked`, 'good'); refreshScreen(); } else G.sound.play('deny'); break; }
    case 'buyu': { const [w, k] = v.split('|'), u = S.upgrades[w] = S.upgrades[w] || {}, l = u[k] || 0, c = upCost(w, k, l); if (l < MAX_UP && S.cash >= c) { S.cash -= c; u[k] = l + 1; writeSave(); G.sound.play('buy'); refreshScreen(); } else G.sound.play('deny'); break; }
    case 'buys': { const sk = SKINS[v]; if (sk.price >= 0 && S.cash >= sk.price) { S.cash -= sk.price; S.skins.push(v); S.skin = v; writeSave(); G.sound.play('buy'); toast(`🥷 ${esc(sk.name)} equipped`, 'good'); refreshScreen(); } else G.sound.play('deny'); break; }
    case 'equip': S.skin = v; writeSave(); G.sound.play('click'); refreshScreen(); break;
    case 'buyg': { const D = GADGETS[v]; if ((S.gadgets[v] || 0) < 5 && S.cash >= D.price) { S.cash -= D.price; S.gadgets[v] = (S.gadgets[v] || 0) + 1; writeSave(); G.sound.play('buy'); refreshScreen(); } else G.sound.play('deny'); break; }
    case 'howto': sub(); showScreen('howto'); break;
    case 'settings': sub(); showScreen('settings'); break;
    case 'set': { const [k, raw] = v.split('|'), val = raw === 'true' ? true : raw === 'false' ? false : raw; G.settings[k] = val; S.settings = G.settings; writeSave(); if (k === 'quality') applyQuality(); if (k === 'cam') setViewmodel(); if (k === 'touch') { G.touchOn = val === 'on' || (val === 'auto' && G.coarse); } G.sound.play('click'); refreshScreen(); break; }
    case 'sens': G.settings.sens = clamp(Math.round((G.settings.sens + (+v) * 0.1) * 10) / 10, 0.3, 3); S.settings = G.settings; writeSave(); refreshScreen(); break;
    case 'back': { const b = (G.stack || []).pop(); if (b === 'title') toTitle(); else if (b) { G.screen = null; const keep = G.stack; showScreen(b); G.stack = keep; } else if (G.run && !G.run.over) showScreen('pause'); else toTitle(); break; }
  }
}
/* ---------- Quality / fullscreen ---------- */
const QUALITY = { Low: { pr: 0.6, shadows: false }, Medium: { pr: 0.85, shadows: false }, High: { pr: 1, shadows: true } };
function applyQuality() {
  const q = QUALITY[G.settings.quality] || QUALITY.Medium; G.renderer.setPixelRatio(Math.min(2, (window.devicePixelRatio || 1) * q.pr));
  G.renderer.shadowMap.enabled = q.shadows; G.sun.castShadow = q.shadows; G.scene.traverse(o => { if (o.material) o.material.needsUpdate = true; }); resize();
}
function isTheater() { return G.root.classList.contains('theater-fullscreen'); }
function setTheater(on) { G.root.classList.toggle('theater-fullscreen', on); document.body.classList.toggle('sy-theater-open', on); setTimeout(resize, 30); }
function toggleFullscreen() {
  const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
  if (fsEl) { (document.exitFullscreen || document.webkitExitFullscreen).call(document)?.catch?.(() => {}); return; }
  if (isTheater()) { setTheater(false); return; }
  const inFrame = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
  const fn = G.root.requestFullscreen || G.root.webkitRequestFullscreen;
  if (!fn || inFrame || document.fullscreenEnabled === false) { setTheater(true); toast('Theater mode — press ⛶ again to exit'); return; }
  try { const r = fn.call(G.root); if (r && r.catch) r.catch(() => { setTheater(true); }); } catch (e) { setTheater(true); }
}
function resize() { if (!G || !G.renderer) return; const c = G.root.getBoundingClientRect(), w = Math.max(1, c.width | 0), h = Math.max(1, c.height | 0); G.vw = w; G.vh = h; G.renderer.setSize(w, h, false); G.camera.aspect = w / h; G.camera.updateProjectionMatrix(); }
function lockPointer() { if (G.inputMode === 'touch' || G.touchOn) return; const c = $('.sy-canvas'); try { const r = c.requestPointerLock && c.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) {} }
function setInputMode(m) { if (G.inputMode === m) return; G.inputMode = m; G.root.dataset.input = m; G.hudDirty = true; G.lastPrompt = null; if (G.run) setObjective(); if (G.screen) refreshScreen(); }
function toggleCam() { G.settings.cam = G.settings.cam === 'third' ? 'first' : 'third'; G.save.settings = G.settings; writeSave(); setViewmodel(); G.hudDirty = true; toast(G.settings.cam === 'third' ? '🎥 Third person' : '👀 First person'); }
function setViewmodel() {
  if (!G.run) return; const id = curWeapon(); G.vm.remove(G.vmW); G.vmW = weaponModel(id); G.vmW.scale.setScalar(0.5); G.vmW.position.set(0.32, -0.3, -0.55); G.vm.add(G.vmW); G.vm.visible = G.settings.cam === 'first';
  const h = G.player.c.hand; while (h.children.length) h.remove(h.children[0]); const tw = weaponModel(id); tw.rotation.x = -Math.PI / 2; tw.position.set(0, 0, -0.2); h.add(tw); G.player.c.holding = true;
}
function togglePause() { if (!G.run || G.run.over) return; if (G.screen === 'pause') { showScreen(null); lockPointer(); } else if (!G.screen) showScreen('pause'); }

/* ---------- Input ---------- */
function bindInput() {
  const I = G.input = { mx: 0, mz: 0, fire: false, sprint: false, keys: new Set(), look: [0, 0], actHeld: false, zoom: false }, root = G.root, canvas = $('.sy-canvas'), L = G.listeners = [];
  const on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); L.push([t, ev, fn, o]); };
  const playing = () => G.run && !G.run.over && !G.screen;
  on(window, 'keydown', e => {
    if (!root.isConnected) return; const k = e.key.toLowerCase();
    if (e.key === 'F11') { e.preventDefault(); toggleFullscreen(); return; }
    if (e.key === 'Escape') {
      if (G.screen === 'title') return; // let the arcade cabinet eject
      e.preventDefault(); e.stopPropagation();
      if (isTheater() && !G.screen) { setTheater(false); return; }
      if (G.screen === 'pause') { showScreen(null); lockPointer(); } else if (G.screen === 'result') return; else if (G.screen) screenAction('back'); else togglePause();
      return;
    }
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    setInputMode('kbm');
    if (G.screen) {
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) { e.preventDefault(); navMove(k === 'arrowleft' ? -1 : k === 'arrowright' ? 1 : 0, k === 'arrowup' ? -1 : k === 'arrowdown' ? 1 : 0); G.root.dataset.kbnav = 1; navEls().forEach((el, i) => el.classList.toggle('nav', i === G.navI)); }
      else if (k === 'enter' && G.root.dataset.kbnav) { const el = navEls()[G.navI]; if (el) { e.preventDefault(); el.click(); } }
      else if ((k === 'q' || k === 'e') && (G.screen === 'levels' || G.screen === 'shop')) tabCycle(k === 'q' ? -1 : 1);
      return;
    }
    if (!playing()) return;
    if (['w', 'a', 's', 'd', ' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'tab', 'control'].includes(k)) e.preventDefault();
    I.keys.add(k); if (k === 'e') I.actHeld = true;
    if (e.repeat) return;
    if (k >= '1' && k <= '9') selectWeapon(Number(k) - 1);
    else if (k === ' ') jump(); else if (k === 'v') toggleCam(); else if (k === 'c' || k === 'control') toggleCrouch();
    else if (k === 'e' || k === 'f') interact(); else if (k === 'r') reload(); else if (k === 'q') cycleWeapon(1); else if (k === 'g') useGadget(); else if (k === 'tab') cycleGadget(e.shiftKey ? -1 : 1);
  }, true);
  on(window, 'keyup', e => { const k = e.key.toLowerCase(); I.keys.delete(k); if (k === 'e') I.actHeld = false; });
  on(window, 'blur', () => { I.keys.clear(); I.fire = false; I.actHeld = false; });
  on(canvas, 'mousedown', e => {
    G.sound.ensure(); setInputMode('kbm'); if (!playing()) return;
    if (!document.pointerLockElement) { lockPointer(); if (e.button === 0) return; }
    if (e.button === 0) { I.fire = true; fire(); } else if (e.button === 2) I.zoom = true;
  });
  on(window, 'mouseup', e => { if (e.button === 0) I.fire = false; if (e.button === 2) I.zoom = false; });
  on(canvas, 'contextmenu', e => e.preventDefault());
  on(window, 'mousemove', e => { if (playing() && document.pointerLockElement === canvas) { I.look[0] += e.movementX; I.look[1] += e.movementY; } });
  on(canvas, 'wheel', e => { if (!playing()) return; e.preventDefault(); cycleWeapon(e.deltaY > 0 ? 1 : -1); }, { passive: false });
  on(document, 'pointerlockchange', () => { if (!document.pointerLockElement && G.wasLocked && playing() && G.inputMode === 'kbm') showScreen('pause'); G.wasLocked = !!document.pointerLockElement; });
  on(root, 'click', e => {
    const a = e.target.closest('[data-act]'); if (a) { const v = a.dataset.act; if (v === 'cam') toggleCam(); else if (v === 'fs') toggleFullscreen(); else if (v === 'pause') togglePause(); return; }
    const d = e.target.closest('[data-do]'); if (d && !d.disabled) screenAction(d.dataset.do, d.dataset.v, d);
  });
  on(document, 'fullscreenchange', () => setTimeout(resize, 50)); on(window, 'resize', resize);
  if (window.ResizeObserver) { G.ro = new ResizeObserver(resize); G.ro.observe(root); }
  bindTouch(on);
}
function tabCycle(dir) {
  if (G.screen === 'levels') { G.chapter = ((G.chapter || 1) - 1 + dir + 7) % 7 + 1; G.selMission = null; G.sound.play('click'); refreshScreen(); }
  else if (G.screen === 'shop') { const t = ['weapons', 'upgrades', 'skins', 'gadgets'], i = t.indexOf(G.shopTab || 'weapons'); G.shopTab = t[(i + dir + 4) % 4]; G.sound.play('click'); refreshScreen(); }
}
function bindTouch(on) {
  const T = { id: null, lookId: null }, stick = $('[data-stick]'), knob = $('[data-knob]'), look = $('[data-look]');
  G.coarse = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || (navigator.maxTouchPoints > 0 && !(window.matchMedia && matchMedia('(hover: hover)').matches));
  G.touchOn = G.settings.touch === 'on' || (G.settings.touch === 'auto' && G.coarse);
  G.showTouch = () => { $('[data-touch]').hidden = !(G.touchOn && G.settings.touch !== 'off' && G.run && !G.run.over && !G.screen); };
  on(G.root, 'touchstart', () => { if (G.settings.touch !== 'off') G.touchOn = true; setInputMode('touch'); G.sound.ensure(); }, { passive: true });
  const moveStick = e => { if (e.pointerId !== T.id) return; const dx = e.clientX - T.ox, dy = e.clientY - T.oy, m = Math.hypot(dx, dy), R = 46, k = m > R ? R / m : 1; knob.style.transform = `translate(${dx * k}px,${dy * k}px)`; G.input.tx = clamp(dx / R, -1, 1); G.input.tz = clamp(dy / R, -1, 1); G.input.sprintT = m > R * 1.3; };
  on(stick, 'pointerdown', e => { e.preventDefault(); T.id = e.pointerId; stick.setPointerCapture?.(e.pointerId); const r = stick.getBoundingClientRect(); T.ox = r.left + r.width / 2; T.oy = r.top + r.height / 2; moveStick(e); });
  on(stick, 'pointermove', moveStick);
  const endStick = e => { if (e.pointerId !== T.id) return; T.id = null; knob.style.transform = ''; G.input.tx = G.input.tz = 0; G.input.sprintT = false; };
  on(stick, 'pointerup', endStick); on(stick, 'pointercancel', endStick);
  on(look, 'pointerdown', e => { T.lookId = e.pointerId; T.lx = e.clientX; T.ly = e.clientY; look.setPointerCapture?.(e.pointerId); });
  on(look, 'pointermove', e => { if (e.pointerId !== T.lookId) return; G.input.look[0] += (e.clientX - T.lx) * 1.5; G.input.look[1] += (e.clientY - T.ly) * 1.5; T.lx = e.clientX; T.ly = e.clientY; });
  const endLook = e => { if (e.pointerId === T.lookId) T.lookId = null; }; on(look, 'pointerup', endLook); on(look, 'pointercancel', endLook);
  $$('[data-t]').forEach(b => {
    on(b, 'pointerdown', e => { e.preventDefault(); b.classList.add('down'); const t = b.dataset.t; if (t === 'fire') { G.input.fireT = true; fire(); } else if (t === 'act') { G.input.actHeld = true; interact(); } else if (t === 'crouch') toggleCrouch(); else if (t === 'jump') jump(); else if (t === 'gadget') useGadget(); else if (t === 'swap') cycleWeapon(1); else if (t === 'reload') reload(); else if (t === 'cam') toggleCam(); else if (t === 'pause') togglePause(); });
    const up = () => { b.classList.remove('down'); if (b.dataset.t === 'fire') G.input.fireT = false; if (b.dataset.t === 'act') G.input.actHeld = false; }; on(b, 'pointerup', up); on(b, 'pointercancel', up); on(b, 'pointerleave', up);
  });
}
function pollInput(dt) {
  const I = G.input, P = G.player, pad = G.pad, s = G.settings, K = I.keys, hasPad = pad.poll();
  let mx = (K.has('d') || K.has('arrowright') ? 1 : 0) - (K.has('a') || K.has('arrowleft') ? 1 : 0), mz = (K.has('s') || K.has('arrowdown') ? 1 : 0) - (K.has('w') || K.has('arrowup') ? 1 : 0);
  I.sprint = K.has('shift'); let fireNow = I.fire || !!I.fireT, zoom = I.zoom;
  if (I.tx || I.tz) { mx = I.tx; mz = I.tz; I.sprint = I.sprintT; }
  const sens = 0.0022 * s.sens * (zoom ? 0.55 : 1), inv = s.invertY ? -1 : 1;
  if (G.run && !G.screen) { P.yaw -= I.look[0] * sens; P.pitch = clamp(P.pitch - I.look[1] * sens * inv, -1.2, 1.1); }
  I.look[0] = I.look[1] = 0;
  if (hasPad) {
    if (G.screen) padMenu();
    else if (G.run && !G.run.over) {
      if (Math.abs(pad.lx) + Math.abs(pad.ly) > 0) { mx = pad.lx; mz = pad.ly; }
      if (pad.down(PAD.L3)) I.sprint = true;
      const ps = zoom ? 0.5 : 1; P.yaw -= pad.rx * 2.8 * s.sens * dt * ps; P.pitch = clamp(P.pitch - pad.ry * 2.0 * s.sens * dt * inv * ps, -1.2, 1.1);
      if (pad.rt > 0.35) fireNow = true; if (pad.lt > 0.35) zoom = true;
      if (pad.pressed(PAD.A)) jump(); if (pad.pressed(PAD.B)) toggleCrouch();
      if (pad.pressed(PAD.X)) interact(); I.padAct = pad.down(PAD.X);
      if (pad.pressed(PAD.Y)) reload();
      if (pad.pressed(PAD.LB)) cycleWeapon(-1); if (pad.pressed(PAD.RB)) cycleWeapon(1);
      if (pad.pressed(PAD.R3)) toggleCam(); if (pad.pressed(PAD.DOWN)) useGadget();
      if (pad.pressed(PAD.LEFT)) cycleGadget(-1); if (pad.pressed(PAD.RIGHT)) cycleGadget(1); if (pad.pressed(PAD.UP)) toggleCam();
      if (pad.pressed(PAD.START)) togglePause();
    }
  } else I.padAct = false;
  I.mx = mx; I.mz = mz; I.fireNow = fireNow; I.zoomNow = zoom; I.actHeldAll = I.actHeld || I.padAct;
}
function padMenu() {
  const p = G.pad, nav = (b, dx, dy) => { if (p.pressed(b)) navMove(dx, dy); };
  nav(PAD.UP, 0, -1); nav(PAD.DOWN, 0, 1); nav(PAD.LEFT, -1, 0); nav(PAD.RIGHT, 1, 0);
  G.stickNav = (G.stickNav || 0) - G.dt;
  if (G.stickNav <= 0 && Math.hypot(p.lx, p.ly) > 0.6) { G.stickNav = 0.22; Math.abs(p.lx) > Math.abs(p.ly) ? navMove(Math.sign(p.lx), 0) : navMove(0, Math.sign(p.ly)); }
  if (p.pressed(PAD.A)) { const el = navEls()[G.navI]; if (el) el.click(); }
  if (p.pressed(PAD.LB)) tabCycle(-1); if (p.pressed(PAD.RB)) tabCycle(1);
  if (p.pressed(PAD.B) && G.screen !== 'title' && G.screen !== 'result') { if (G.screen === 'pause') { showScreen(null); } else screenAction('back'); }
  if (p.pressed(PAD.START)) { if (G.screen === 'pause') showScreen(null); else if (G.screen === 'title') screenAction('levels'); }
}

/* ---------- Camera ---------- */
function updateCamera(dt) {
  const P = G.player, cam = G.camera, first = G.settings.cam === 'first', zoom = G.input.zoomNow;
  const fov = zoom ? 42 : 72; cam.fov = lerp(cam.fov, fov, Math.min(1, dt * 10)); cam.updateProjectionMatrix();
  const eye = P.y + (P.hidden ? 1.2 : P.crouch || P.boxT > 0 ? 1.0 : 1.55);
  let sx = 0, sz = 0; if (G.shake > 0) { G.shake -= dt; sx = rand(-1, 1) * G.shake * 0.3; sz = rand(-1, 1) * G.shake * 0.3; }
  if (first || P.hidden) {
    cam.position.set(P.x + sx, eye, P.z + sz); cam.rotation.set(P.pitch, P.yaw, 0, 'YXZ'); P.c.root.visible = false;
  } else {
    const dist = zoom ? 1.9 : 3.6, back = Math.cos(P.pitch) * dist, up = -Math.sin(P.pitch) * dist;
    const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw), rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw), sh = 0.55;
    const bx = P.x + rx * sh, bz = P.z + rz * sh, len = Math.hypot(fx, fz);
    const hit = castRay(bx, bz, fx / len, fz / len, back + 0.4), d = Math.max(0.35, Math.min(back, hit - 0.35));
    cam.position.set(bx + fx * d + sx, Math.max(0.4, eye + 0.25 + up * (d / back)), bz + fz * d + sz); cam.rotation.set(P.pitch, P.yaw, 0, 'YXZ');
  }
  G.vm.visible = first && !P.hidden; if (G.vmW) { G.recoil = Math.max(0, (G.recoil || 0) - dt * 6); const bob = Math.sin(G.clock * 9) * 0.015 * P.moveAmt; G.vmW.position.set(0.32, -0.3 + bob - (zoom ? -0.06 : 0), -0.55 + G.recoil * 0.08); G.vmW.rotation.x = G.recoil * 0.25; G.vmW.position.x = zoom ? 0.12 : 0.32; }
  if (G.sunTarget) { G.sun.position.set(P.x + 12, 24, P.z + 8); G.sun.target.position.set(P.x, 0, P.z); }
}

/* ---------- Main loop ---------- */
function frame(now) {
  if (!G || G.stopped) return; G.raf = requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - (G.last || now)) / 1000); G.last = now; G.dt = dt; G.clock += dt;
  G.fps = lerp(G.fps || 60, 1 / Math.max(dt, 0.001), 0.05);
  if (G.fps < 24 && G.settings.quality !== 'Low' && G.run) { G.lowT = (G.lowT || 0) + dt; if (G.lowT > 4) { G.lowT = 0; G.settings.quality = G.settings.quality === 'High' ? 'Medium' : 'Low'; applyQuality(); toast(`Auto-quality: ${G.settings.quality}`); } } else G.lowT = 0;
  pollInput(dt);
  const R = G.run;
  if (R && !R.over && !G.screen) {
    R.t += dt; if (R.timer) { R.timer -= dt; if (R.timer <= 0) { R.timer = 0; failMission('⏱️ Time ran out'); } }
    if (R.cd > 0) R.cd -= dt; if (R.reloadT > 0) { R.reloadT -= dt; if (R.reloadT <= 0) finishReload(); }
    if (G.input.fireNow && WEAPONS[curWeapon()].rate > 1.5) fire();
    G.input.actHeld = G.input.actHeldAll; updateHack(dt);
    updatePlayer(dt); updateGuards(dt); updateDrones(dt); updateCams(dt); updateLasers(dt); updateGadgets(dt); updateProjs(dt);
    G.hudT = (G.hudT || 0) - dt; if (G.hudT <= 0 || G.hudDirty) { G.hudT = 0.15; G.hudDirty = false; updateHUD(); }
    G.mapT = (G.mapT || 0) - dt; if (G.mapT <= 0) { G.mapT = 0.12; drawMap(); }
    updatePrompt();
  }
  if (R) { G.items.forEach(i => { if (i.mesh.userData.core) { i.mesh.userData.core.rotation.y += dt * 1.6; i.mesh.userData.core.position.y = 1.2 + Math.sin(G.clock * 2) * 0.12; } }); G.coins.forEach(c => { c.mesh.rotation.z += dt * 3; }); if (G.exit) G.exit.ring.rotation.z += dt; }
  updateParts(dt);
  if (R) updateCamera(dt); else titleCamera(dt);
  if (G.hurtFlash > 0) G.hurtFlash -= dt; $('.sy-hurt').style.opacity = String(Math.max(0, G.hurtFlash || 0) * 1.4 + (R && !R.over && G.player.hp < 35 ? 0.25 : 0));
  G.showTouch && G.showTouch();
  $('.sy-cross').hidden = !R || !!G.screen || R.over || G.player.hidden;
  G.renderer.render(G.scene, G.camera);
  updatePops(dt);
}
function titleCamera(dt) {
  G.titleT = (G.titleT || 0) + dt * 0.08; const a = G.titleT, L = G.level, cx = L.W * CELL / 2, cz = L.H * CELL / 2;
  G.camera.position.set(cx + Math.cos(a) * 16, 13, cz + Math.sin(a) * 16); G.camera.lookAt(cx, 0, cz); G.camera.fov = 60; G.camera.updateProjectionMatrix(); G.vm.visible = false;
  for (const g of G.guards) {
    g.t += dt; g.moving = 0;
    if (g.sentry) g.ang = g.look0 + Math.sin(g.t * 0.6) * 1.3;
    else if (g.wait > 0) g.wait -= dt;
    else { if (!g.path) { g.pi = (g.pi + 1) % g.pts.length; const p = g.pts[g.pi]; g.path = pathTo(g, p.x, p.z); } if (walkPath(g, dt, 2.2)) { g.path = null; g.wait = rand(1.2, 3); } }
    g.c.root.position.set(g.x, 0, g.z); g.c.root.rotation.y = g.ang; animChar(g.c, g.moving, g.t * 8, false);
    g.coneT = (g.coneT || 0) - dt; if (g.coneT <= 0) { g.coneT = 0.1; updateCone(g.cone, g.x, g.z, g.ang + Math.PI, g.half, g.range); }
  }
}
function toTitle() {
  if (document.pointerLockElement) document.exitPointerLock?.();
  G.run = null; $('[data-hud]').hidden = true; G.root.classList.remove('nightmare');
  titleScene(); showScreen('title');
}
function titleScene() {
  clearLevel(); const m = Object.assign({}, MISSIONS[26], { diff: 0.3, n: 'title' }); // Italian Brainrot Pizzeria backdrop
  G.level = generateLevel(m, 7); buildLevel(G.level); if (G.player.c) G.player.c.root.visible = false;
  // a few patrolling guards for the menu backdrop (no player interaction)
  G.run = null; G.level.guards.slice(0, 4).forEach((g, i) => spawnGuard(g, i, G.level)); G.guards.forEach(g => { g.range *= 0.8; });
}

/* ---------- Mount ---------- */
function loadThree() {
  if (window.THREE) return Promise.resolve();
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = new URL('three.min.js', SCRIPT_URL || location.href).href; s.onload = () => window.THREE ? res() : rej(new Error('three.js missing')); s.onerror = () => rej(new Error('three.js failed')); document.head.append(s); });
}
function mount(area) {
  let stopped = false;
  area.innerHTML = '<div class="sy-load" role="status">Loading SNEAK &amp; YEET 3D…</div>';
  loadThree().then(() => { if (!stopped) try { init(area); } catch (e) { console.error('[Sneak & Yeet]', e); area.innerHTML = '<div class="sy-load">Sneak &amp; Yeet hit an error while starting. Try reloading the page.</div>'; } }, () => { if (!stopped) area.innerHTML = '<div class="sy-load">The 3D engine couldn’t load. Make sure three.min.js is next to sneak.js.</div>'; });
  return function stop() {
    stopped = true; if (!G) return; G.stopped = true; cancelAnimationFrame(G.raf); writeSave();
    (G.listeners || []).forEach(([t, ev, fn, o]) => t.removeEventListener(ev, fn, o)); G.ro && G.ro.disconnect();
    if (document.pointerLockElement) document.exitPointerLock?.(); if (document.fullscreenElement) document.exitFullscreen?.().catch?.(() => {});
    document.body.classList.remove('sy-theater-open'); clearTimeout(G.bannerT);
    try { G.renderer.dispose(); G.renderer.forceContextLoss?.(); } catch (e) {}
    if (G.sound.ctx) G.sound.ctx.close().catch(() => {});
    G = null;
  };
}
function init(area) {
  const root = buildUI(area), save = loadSave();
  G = { root, clock: 0, dt: 0, save, settings: save.settings, inputMode: 'kbm', pops: [], parts: [], guards: [], drones: [], projs: [], eprojs: [], smokes: [], decoys: [], screen: null, shake: 0, stack: [] };
  G.sound = new Sound(G.settings);
  G.pad = new Pad({ connect: b => { toast(`🎮 ${b === 'ps' ? 'PlayStation' : b === 'switch' ? 'Switch' : 'Xbox'} controller connected`, 'good'); setInputMode('pad'); }, disconnect: () => { toast('🎮 Controller disconnected', 'bad'); setInputMode('kbm'); }, activity: () => setInputMode('pad') });
  const _rumble = G.pad.rumble.bind(G.pad); G.pad.rumble = (s, ms) => { if (G && G.settings.rumble) _rumble(s, ms); };
  const canvas = $('.sy-canvas');
  try { G.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' }); } catch (e) { area.innerHTML = '<div class="sy-load">WebGL isn’t available on this device, so Sneak &amp; Yeet can’t start.</div>'; G = null; return; }
  G.renderer.outputColorSpace = THREE.SRGBColorSpace; G.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  G.scene = new THREE.Scene(); G.scene.background = new THREE.Color(0x9ad); G.scene.fog = new THREE.Fog(0x9ad, 26, 70);
  G.camera = new THREE.PerspectiveCamera(72, 1, 0.05, 300); G.scene.add(G.camera);
  G.hemi = new THREE.HemisphereLight(0xffffff, 0x445566, 0.9); G.scene.add(G.hemi);
  G.sun = new THREE.DirectionalLight(0xffffff, 1.2); G.sun.position.set(20, 30, 10); G.sun.shadow.mapSize.set(1024, 1024); const sc = G.sun.shadow.camera; sc.left = sc.bottom = -22; sc.right = sc.top = 22; sc.far = 80; G.scene.add(G.sun, G.sun.target); G.sunTarget = true;
  G.tmpV = new THREE.Vector3();
  G.vm = new THREE.Group(); G.camera.add(G.vm); box(0.14, 0.14, 0.42, lam(0xffcc80), 0.32, -0.42, -0.35, G.vm, false);
  G.boxMesh = new THREE.Group(); box(1.25, 1.2, 1.25, lam(0xc8a06a), 0, 0.6, 0, G.boxMesh); box(0.4, 0.14, 0.02, basic(0x222222), 0, 0.85, -0.64, G.boxMesh, false); G.boxMesh.visible = false; G.scene.add(G.boxMesh);
  G.player = { x: 0, z: 0, y: 0, vy: 0, yaw: 0, pitch: 0, hp: 100, ground: true, moveAmt: 0, kx: 0, kz: 0, c: null };
  bindInput(); applyQuality(); titleScene(); resize();
  G.root.dataset.input = 'kbm'; showScreen('title');
  G.last = performance.now(); G.raf = requestAnimationFrame(frame);
}

window.SneakYeet = { mount, version: VERSION, save: () => loadSave(), missions: MISSIONS, debug: () => ({ G, startMission, generateLevel, winMission, failMission, MISSIONS, alertGuard }) };
})();
