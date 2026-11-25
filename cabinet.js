/* JAYDENGAMES Arcade Cabinet — interactive homepage (menu, deck, coin slot, tickets, themes, stickers, daily spin, trophies, attract mode) */
(function () {
  'use strict';
  const KEY = 'jaydengames.cabinet.v1';
  const DAY_MS = 24 * 3600 * 1000, IDLE_MS = 15000;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const readJSON = k => { try { return JSON.parse(localStorage.getItem(k)) || null; } catch (e) { return null; } };
  const pass = () => window.JGArcade && window.JGArcade.pass;

  /* ---------- Data ---------- */
  const GAMES = [
    { id: 'tycoon', title: 'RESELL TYCOON', cat: 'Simulation', icon: '🏪', c1: '#7eefd0', c2: '#2f9be6', kind: 'big', tags: 'resell tycoon shop store money simulation', desc: 'Flip stock, run the register, grow your aura and build the flagship store of Market Row.' },
    { id: 'zomb', title: 'ZOMB.IO 3D', cat: 'Survival', icon: '🧟', c1: '#8dff6a', c2: '#8e5bff', kind: 'big', tags: 'zomb.io zombie survival tower defense action 3d', desc: 'Harvest by day, build walls and towers, and survive brainrot boss waves at night.' },
    { id: 'sneak', title: 'SNEAK & YEET 3D', cat: 'Stealth', icon: '🥷', c1: '#ffd23f', c2: '#ff3dbb', kind: 'big', tags: 'sneak yeet stealth shooter missions action 3d goofy', desc: '70 viral-trend heists. Stay quiet, bonk guards, and yeet rubber chickens.' },
    { id: 'snake', title: 'NEON SNAKE', cat: 'Arcade', icon: '🐍', c1: '#35e7ff', c2: '#2f6bff', kind: 'mini', tags: 'neon snake arcade classic', desc: 'Grab the glowing dots and see how long you can grow.' },
    { id: 'ttt', title: 'TIC-TAC-TOE', cat: 'Classic', icon: '❎', c1: '#ff6bd6', c2: '#8a3dff', kind: 'mini', tags: 'tic tac toe xo classic', desc: 'Beat the CPU or challenge a friend in Xs and Os.' },
    { id: 'memory', title: 'MEMORY MATCH', cat: 'Puzzle', icon: '🧠', c1: '#b48cff', c2: '#2fb5d1', kind: 'mini', tags: 'memory match cards puzzle', desc: 'Flip the cards and find every matching pair in as few moves as possible.' },
    { id: 'reaction', title: 'REACTION RUSH', cat: 'Arcade', icon: '⚡', c1: '#ffb347', c2: '#ff3d6b', kind: 'mini', tags: 'reaction rush speed reflex arcade', desc: 'Wait for the signal, then test your reaction speed in milliseconds.' }
  ];
  const GMAP = Object.fromEntries(GAMES.map(g => [g.id, g]));
  const CATS = ['All', 'Survival', 'Simulation', 'Stealth', 'Arcade', 'Classic', 'Puzzle'];
  const THEMES = [
    { id: 'midnight', name: 'Midnight Arcade', price: 0, desc: 'Dark matte slate with electric blue and purple neon trim.', sw: ['#141a3a', '#35e7ff', '#232b4a', '#2fd16b', '#ff3dbb'] },
    { id: 'wood', name: '80s Classic Woodgrain', price: 25, desc: 'Walnut side panels, warm amber marquee and cherry-red buttons.', sw: ['#e89a2e', '#ffcf7a', '#6e3f21', '#d4141e', '#d4141e'] },
    { id: 'cyber', name: 'Cyberpunk Overdrive', price: 50, desc: 'Hot pink and cyan glitch neon, carbon-fiber deck, see-through joystick.', sw: ['#1a0026', '#ff2bd6', '#16161c', '#00f0ff', '#ff2bd6'] },
    { id: 'brat', name: 'Brat Neon Edition', price: 75, desc: 'Lime-green cabinet body with bold black lowercase typography.', sw: ['#8ace00', '#000000', '#8ace00', '#000000', '#000000'] },
    { id: 'gold', name: '24K Gold VIP Cabinet', price: 150, desc: 'Solid gold trim, sparkling particle aura and a diamond-plate deck.', sw: ['#ffd23f', '#fff6c8', '#c7ccd3', '#ffd23f', '#bfefff'] }
  ];
  const STICKERS = [
    { id: 'rizz', name: 'Rizzler King', icon: '👑', bg: '#ffd23f', fg: '#3d2700', price: 20 },
    { id: 'aura', name: 'Aura Farmer', icon: '✨', bg: '#b46bff', fg: '#fff', price: 20 },
    { id: 'ggez', name: 'GG EZ', icon: '🎮', bg: '#35e7ff', fg: '#002a33', price: 15 },
    { id: 'sixseven', name: '6-7', icon: '🤷', bg: '#ff7b00', fg: '#fff', price: 15 },
    { id: 'vip', name: 'JaydenGames VIP', icon: '💎', bg: '#111', fg: '#ffd23f', price: 40 },
    { id: 'chill', name: 'Chill Guy', icon: '🐶', bg: '#c9a27a', fg: '#2b1a0a', price: 20 },
    { id: 'moo', name: 'Moo Deng', icon: '🦛', bg: '#ffb3c7', fg: '#5a0020', price: 25 },
    { id: 'cook', name: 'Let Him Cook', icon: '👨‍🍳', bg: '#ffffff', fg: '#111', price: 20 },
    { id: 'sigma', name: 'Sigma', icon: '🗿', bg: '#7f8bab', fg: '#fff', price: 30 },
    { id: 'ohio', name: 'Only in Ohio', icon: '🌽', bg: '#ffe36b', fg: '#3d2700', price: 25 },
    { id: 'bratst', name: 'brat', icon: '💚', bg: '#8ace00', fg: '#000', price: 30 },
    { id: 'demure', name: 'Very Demure', icon: '🎀', bg: '#ffd6ec', fg: '#7a0050', price: 25 }
  ];
  const SMAP = Object.fromEntries(STICKERS.map(s => [s.id, s]));
  const CORNERS = ['tl', 'tr', 'bl', 'br'];
  const WHEEL = [
    { l: '+10', v: 10, w: 22, c: '#2f6bff' }, { l: '+25', v: 25, w: 14, c: '#ff3dbb' }, { l: '+15', v: 15, w: 20, c: '#2fd16b' }, { l: 'STICKER', st: 1, w: 12, c: '#ffd23f' },
    { l: '+50', v: 50, w: 8, c: '#8e5bff' }, { l: '+10', v: 10, w: 22, c: '#35e7ff' }, { l: '+100', v: 100, w: 3, c: '#ff4b5c' }, { l: '+20', v: 20, w: 16, c: '#ff9b2f' }
  ];
  const RANKS = [['Broke Larp', 0], ['Aura Farmer', 100], ['Dripmaxxer', 400], ['Profitmaxxer', 1200]];

  /* ---------- Save ---------- */
  const DEF = { theme: 'midnight', themes: ['midnight'], stickers: [], placed: { tl: null, tr: null, bl: null, br: null }, lastSpin: 0, spins: 0, played: {}, coins: 0, crt: true, muted: false, trophies: [], sel: 'tycoon', cat: 'All' };
  function load() {
    const d = readJSON(KEY) || {}; const s = JSON.parse(JSON.stringify(DEF));
    if (THEMES.some(t => t.id === d.theme)) s.theme = d.theme;
    if (Array.isArray(d.themes)) s.themes = [...new Set(['midnight', ...d.themes.filter(t => THEMES.some(x => x.id === t))])];
    if (!s.themes.includes(s.theme)) s.theme = 'midnight';
    if (Array.isArray(d.stickers)) s.stickers = [...new Set(d.stickers.filter(x => SMAP[x]))];
    if (d.placed && typeof d.placed === 'object') CORNERS.forEach(c => { s.placed[c] = s.stickers.includes(d.placed[c]) ? d.placed[c] : null; });
    ['lastSpin', 'spins', 'coins'].forEach(k => { if (Number.isFinite(+d[k]) && +d[k] >= 0) s[k] = +d[k]; });
    if (d.played && typeof d.played === 'object') Object.keys(d.played).forEach(k => { if (GMAP[k]) s.played[k] = 1; });
    if (typeof d.crt === 'boolean') s.crt = d.crt; if (typeof d.muted === 'boolean') s.muted = d.muted;
    if (Array.isArray(d.trophies)) s.trophies = d.trophies.filter(x => typeof x === 'string');
    if (GMAP[d.sel]) s.sel = d.sel; if (CATS.includes(d.cat)) s.cat = d.cat;
    return s;
  }
  let S = load();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage blocked */ } };

  /* ---------- Cross-game stats ---------- */
  function gameData() {
    const p = pass() ? pass().get() : { best: {}, totalEarned: 0, tokens: 0 };
    const z = readJSON('zomb3d.stats.v1') || {};
    const t = readJSON('resellTycoon.save.v3') || {};
    const sy = readJSON('sneakyeet.save.v1') || {};
    const ms = sy.missions && typeof sy.missions === 'object' ? Object.entries(sy.missions).filter(([k]) => /^\d+$/.test(k)).map(([, v]) => v) : [];
    return {
      p, best: p.best || {},
      zomb: { wave: +z.bestWave || 0, kills: +z.totalKills || 0, bosses: +z.bossesBeaten || 0, gold: !!z.goldenTrophy },
      tycoon: { aura: +t.aura || 0, day: +t.day || 0, rebirths: +t.rebirths || 0, has: !!t.v },
      sneak: { cleared: ms.filter(m => m && m.stars > 0).length, stars: ms.reduce((a, m) => a + (m && +m.stars || 0), 0), ghosts: ms.filter(m => m && m.ghost).length }
    };
  }
  const rankOf = a => RANKS.reduce((r, x) => a >= x[1] ? x[0] : r, RANKS[0][0]);
  function statsFor(id, D) {
    const b = D.best, dash = v => v ? Number(v).toLocaleString() : '—';
    switch (id) {
      case 'tycoon': return [['Aura Rank', D.tycoon.has ? rankOf(D.tycoon.aura) : '—'], ['Store Day', dash(D.tycoon.day)], ['Rebirths', D.tycoon.has ? String(D.tycoon.rebirths) : '—']];
      case 'zomb': return [['Best Wave', dash(D.zomb.wave)], ['Zombies Eliminated', dash(D.zomb.kills)], ['Bosses Beaten', dash(D.zomb.bosses)]];
      case 'sneak': return [['Missions Cleared', D.sneak.cleared ? D.sneak.cleared + '/70' : '—'], ['Total Stars', dash(D.sneak.stars)], ['Ghost Rizz', dash(D.sneak.ghosts)]];
      case 'snake': return [['High Score', dash(b.snake)], ['Tokens Earned', dash(D.p.totalEarned)], ['Plays', dash(D.p.plays)]];
      case 'ttt': return [['CPU Wins', dash(b.tttWins)], ['Tokens Earned', dash(D.p.totalEarned)], ['Plays', dash(D.p.plays)]];
      case 'memory': return [['Fewest Moves', dash(b.memoryMoves)], ['Tokens Earned', dash(D.p.totalEarned)], ['Plays', dash(D.p.plays)]];
      case 'reaction': return [['Best Reaction', b.reactionMs ? b.reactionMs + ' ms' : '—'], ['Tokens Earned', dash(D.p.totalEarned)], ['Plays', dash(D.p.plays)]];
    }
    return [];
  }
  function cartBest(id, D) {
    switch (id) {
      case 'tycoon': return D.tycoon.has ? `AURA ${rankOf(D.tycoon.aura).toUpperCase()}` : 'NEW SAVE';
      case 'zomb': return D.zomb.wave ? `BEST WAVE ${D.zomb.wave} · ${D.zomb.kills} KOs` : 'BEST WAVE —';
      case 'sneak': return D.sneak.cleared ? `${D.sneak.cleared}/70 · ${D.sneak.stars}★` : '0/70 MISSIONS';
      case 'snake': return `HI ${D.best.snake || 0}`;
      case 'ttt': return `CPU WINS ${D.best.tttWins || 0}`;
      case 'memory': return D.best.memoryMoves ? `BEST ${D.best.memoryMoves} MOVES` : 'BEST —';
      case 'reaction': return D.best.reactionMs ? `BEST ${D.best.reactionMs} MS` : 'BEST —';
    }
    return '';
  }
  const TROPHIES = [
    { id: 'coin', icon: '🪙', name: 'First Credit', desc: 'Insert a token into the coin slot', v: D => S.coins, n: 1 },
    { id: 'tourist', icon: '🗺️', name: 'Arcade Tourist', desc: 'Play all 7 cabinet games', v: D => Object.keys(S.played).length, n: 7 },
    { id: 'zomb5', icon: '🧟', name: 'Night Shift', desc: 'Survive Wave 5 in Zomb.io 3D', v: D => D.zomb.wave, n: 5 },
    { id: 'zkills', icon: '🪓', name: 'Zombie Janitor', desc: 'Eliminate 250 zombies in Zomb.io 3D', v: D => D.zomb.kills, n: 250 },
    { id: 'zgold', icon: '🏆', name: 'Brainrot Breaker', desc: 'Win the Golden Trophy in Zomb.io 3D', v: D => D.zomb.gold ? 1 : 0, n: 1 },
    { id: 'aura2', icon: '💅', name: 'Aura Tier 2', desc: 'Reach Dripmaxxer aura in Resell Tycoon', v: D => D.tycoon.aura, n: 400 },
    { id: 'rebirth', icon: '♻️', name: 'Born Again Reseller', desc: 'Rebirth once in Resell Tycoon', v: D => D.tycoon.rebirths, n: 1 },
    { id: 'snake20', icon: '🐍', name: 'Long Boi', desc: 'Score 20+ in Neon Snake', v: D => D.best.snake || 0, n: 20 },
    { id: 'react200', icon: '⚡', name: 'Lightning Reflex', desc: 'React in under 200 ms in Reaction Rush', v: D => D.best.reactionMs && D.best.reactionMs < 200 ? 1 : 0, n: 1 },
    { id: 'ttt5', icon: '❎', name: 'CPU Bully', desc: 'Beat the CPU 5 times in Tic-Tac-Toe', v: D => D.best.tttWins || 0, n: 5 },
    { id: 'mem12', icon: '🧠', name: 'Big Brain', desc: 'Clear Memory Match in 12 moves or fewer', v: D => D.best.memoryMoves && D.best.memoryMoves <= 12 ? 1 : 0, n: 1 },
    { id: 'sneak10', icon: '🥷', name: 'Shadow Intern', desc: 'Clear 10 missions in Sneak & Yeet 3D', v: D => D.sneak.cleared, n: 10 },
    { id: 'ghost', icon: '👻', name: 'Ghost Rizz', desc: 'Finish a Sneak & Yeet mission without hitting 100% noise', v: D => D.sneak.ghosts, n: 1 },
    { id: 'stars', icon: '⭐', name: 'Star Thief', desc: 'Collect 100 stars in Sneak & Yeet 3D', v: D => D.sneak.stars, n: 100 },
    { id: 'tok500', icon: '🎟️', name: 'Token Tycoon', desc: 'Earn 500 Arcade Tokens all-time', v: D => D.p.totalEarned || 0, n: 500 },
    { id: 'theme', icon: '🎨', name: 'Interior Designer', desc: 'Unlock a new cabinet theme', v: D => S.themes.length - 1, n: 1 },
    { id: 'bomb', icon: '🏷️', name: 'Sticker Bomber', desc: 'Fill all 4 bezel corners with stickers', v: D => CORNERS.filter(c => S.placed[c]).length, n: 4 },
    { id: 'spin3', icon: '🎡', name: 'Lucky Spinner', desc: 'Spin the daily wheel 3 times', v: D => S.spins, n: 3 },
    { id: 'vip', icon: '👑', name: 'VIP Status', desc: 'Unlock the 24K Gold VIP Cabinet', v: D => S.themes.includes('gold') ? 1 : 0, n: 1 }
  ];

  /* ---------- Sound ---------- */
  const SND = {
    ctx: null,
    init() { if (this.ctx) return this.ctx; const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; try { this.ctx = new AC(); } catch (e) { this.ctx = null; } return this.ctx; },
    tone(f, d, type = 'square', v = .12, slide = 0, delay = 0) {
      const c = this.init(); if (!c || S.muted) return; if (c.state === 'suspended') c.resume?.();
      const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0008, t + d); o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + .02);
    },
    play(n) {
      switch (n) {
        case 'nav': this.tone(660, .05, 'square', .06); break;
        case 'click': this.tone(1800, .02, 'square', .08); this.tone(240, .04, 'triangle', .1, 0, .01); break;
        case 'clink': this.tone(2600, .12, 'triangle', .12); this.tone(3400, .18, 'sine', .08, 0, .05); this.tone(1900, .25, 'sine', .07, 0, .16); break;
        case 'start': [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, .12, 'square', .09, 0, i * .07)); this.tone(1568, .4, 'triangle', .1, 0, .38); break;
        case 'tick': this.tone(1200, .025, 'square', .05); break;
        case 'prize': [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, .18, 'triangle', .12, 0, i * .09)); break;
        case 'ticket': for (let i = 0; i < 6; i++) this.tone(180 + i * 15, .04, 'sawtooth', .04, 0, i * .05); break;
        case 'power': this.tone(900, .35, 'sawtooth', .06, -800); break;
        case 'deny': this.tone(200, .18, 'square', .08, -80); break;
        case 'tab': this.tone(880, .04, 'square', .06); this.tone(1320, .05, 'square', .05, 0, .04); break;
      }
    }
  };
  function setMuted(m) { S.muted = m; save(); if (window.__jgAudio) window.__jgAudio.set(m); refreshPlayBar(); }

  /* ---------- DOM ---------- */
  let root, cab, crt, menuEl, playEl, area, attractEl, cv, cx, ledNum, padLed, creditLed, joyStick, tixOut, toasts;
  function build() {
    root = $('#cabinet');
    root.innerHTML = `
<div class="cab" data-theme="${S.theme}">
  <header class="cab-marquee">
    <div class="mq-lights top"></div>
    <div class="mq-side left"><span class="pad-led" data-padled><i></i><span>NO CONTROLLER</span></span><span class="credit-led blink" data-credit>FREE PLAY</span></div>
    <div class="mq-sign"><span class="mq-bolt">⚡</span><h1>JAYDENGAMES <em>ARCADE</em></h1><span class="mq-bolt">⚡</span></div>
    <div class="mq-side right"><div class="led-box" title="Arcade Tokens (shared across every game)"><span class="led-lbl">🎟<br>TOKENS</span><span class="led-num" data-led data-ghost="88888">00000</span></div></div>
    <div class="mq-lights bottom"></div>
  </header>
  <div class="cab-body">
    <div class="cab-side l"></div>
    <div class="bezel">
      ${CORNERS.map(c => `<div class="stk-slot ${c}" data-corner="${c}"></div>`).join('')}
      <div class="crt" id="crt">
        <div class="crt-menu" data-menu>
          <div class="crt-top" role="toolbar" aria-label="Game categories">
            ${CATS.map(c => `<button class="sw" data-cat="${c}" aria-pressed="false"><i></i>${c === 'All' ? 'All' : c}<span class="n" data-catn="${c}"></span></button>`).join('')}
            <input class="crt-search" data-search placeholder="SEARCH GAMES_" aria-label="Search games" autocomplete="off">
          </div>
          <div class="crt-main">
            <div class="pv">
              <div class="pv-screen"><canvas width="640" height="360" data-pv aria-label="Animated game preview"></canvas><span class="pv-chip"><i></i>PREVIEW</span></div>
              <div class="pv-info">
                <div class="pv-head"><h2 data-pvtitle></h2><span class="cat-badge" data-pvcat></span></div>
                <div class="stats-bar" data-stats></div>
                <p class="pv-desc" data-pvdesc></p>
                <div class="press-start"><span class="ps">PRESS START</span><button class="go-btn" data-go>▶ START</button></div>
              </div>
            </div>
            <div class="carts" data-carts role="listbox" aria-label="Games"></div>
          </div>
        </div>
        <div class="crt-play" data-play hidden>
          <div class="play-bar">
            <h2 data-ptitle></h2>
            <button class="pb" data-pb="fs" title="Fullscreen (F)">⛶ <span class="lbl">Fullscreen</span></button>
            <button class="pb" data-pb="crt" title="CRT scanlines">📺 <span class="lbl">CRT</span></button>
            <button class="pb" data-pb="mute" title="Mute"><span data-mutei>🔊</span></button>
            <button class="pb eject" data-pb="eject" title="Exit to cabinet (Esc / hold B)">⏏ <span class="lbl">EJECT</span><kbd>Esc</kbd><span class="hold" data-hold></span></button>
          </div>
          <div class="play-area" id="gameArea" data-area></div>
        </div>
        <div class="crt-attract" data-attract hidden><span class="demo">● DEMO</span><div class="ins">INSERT COIN OR PRESS START</div><div class="hi" data-attracthi></div></div>
        <div class="crt-fx scan"></div><div class="crt-fx vig"></div><div class="crt-fx glare"></div>
        <div class="crt-boot"></div>
      </div>
    </div>
    <div class="cab-side r"></div>
  </div>
  <div class="deck">
    <div class="deck-left">
      <div class="joy" data-joy title="Drag the joystick to browse" aria-label="Joystick">
        <div class="joy-base"></div><div class="joy-ring"></div>
        <div class="joy-stick" data-stick><div class="joy-shaft"></div><div class="joy-ball"></div></div>
        <div class="joy-dirs"><span class="u">▲</span><span class="d">▼</span><span class="l">◀</span><span class="r">▶</span></div>
      </div>
    </div>
    <div class="deck-mid">
      <button class="coin" data-coin title="Insert token (C)"><span class="slot"></span><span class="cap">INSERT TOKEN<br>25¢ · [C]</span></button>
      <div class="tix"><div class="mouth"></div><span class="cap">TICKETS</span><div class="tix-out" data-tix></div></div>
    </div>
    <div class="deck-right">
      <button class="abtn blue small" data-btn="prev"><span class="cap">◀</span>PREV<kbd>LB</kbd></button>
      <button class="abtn start big" data-btn="start"><span class="cap">START</span>PLAY<kbd>Enter</kbd></button>
      <button class="abtn blue small" data-btn="next"><span class="cap">▶</span>NEXT<kbd>RB</kbd></button>
      <button class="abtn yellow" data-btn="shop"><span class="cap">🎨</span>CABINET<kbd>G · Y</kbd></button>
      <button class="abtn red" data-btn="spin"><span class="cap">🎡</span>DAILY SPIN<kbd>R · X</kbd></button>
      <button class="abtn purple" data-btn="trophies"><span class="cap">🏆</span>TROPHIES<kbd>T · View</kbd></button>
    </div>
  </div>
  <div class="cab-kick"><span><kbd>←↑→↓</kbd>/<kbd>WASD</kbd> Move</span><span><kbd>Enter</kbd> Start</span><span><kbd>Q</kbd>/<kbd>E</kbd> Category</span><span><kbd>C</kbd> Coin</span><span><kbd>G</kbd> Cabinet</span><span><kbd>R</kbd> Daily spin</span><span><kbd>T</kbd> Trophies</span><span><kbd>/</kbd> Search</span><span>🖱 Wheel to browse · 🎮 Controller ready</span></div>
  <div class="cab-foot">Made for players, by JaydenGames. <span style="color:var(--neon1)">GG!</span></div>
</div>
<div class="cm" data-modal hidden><div class="cm-panel" data-mpanel role="dialog" aria-modal="true"></div></div>
<div class="cab-toasts" data-toasts></div>`;
    cab = $('.cab', root); crt = $('#crt'); menuEl = $('[data-menu]', root); playEl = $('[data-play]', root); area = $('[data-area]', root); attractEl = $('[data-attract]', root);
    cv = $('[data-pv]', root); cx = cv.getContext('2d'); ledNum = $('[data-led]', root); padLed = $('[data-padled]', root); creditLed = $('[data-credit]', root); joyStick = $('[data-stick]', root);
    tixOut = $('[data-tix]', root); toasts = $('[data-toasts]', root);
    $('[data-carts]', root).innerHTML = GAMES.map(g => `<button class="cart" data-id="${g.id}" role="option" style="--c1:${g.c1};--c2:${g.c2}"><span class="lbl"></span><span class="ic">${g.icon}</span><span class="tx"><b>${esc(g.title)}</b><small>${g.cat}</small><span class="best" data-cbest="${g.id}"></span></span></button>`).join('') + '<div class="none" data-none hidden>NO GAMES FOUND</div>';
    crt.classList.toggle('no-scan', !S.crt);
    setTimeout(() => $('.crt-boot', root)?.remove(), 1200);
  }

  /* ---------- Toasts & tickets ---------- */
  function toast(msg, color) { const t = document.createElement('div'); t.className = 'cab-toast'; t.style.setProperty('--tc', color || 'var(--neon1)'); t.innerHTML = msg; toasts.appendChild(t); while (toasts.children.length > 3) toasts.firstChild.remove(); setTimeout(() => t.classList.add('out'), 2600); setTimeout(() => t.remove(), 3100); }
  const tixQ = []; let tixBusy = false;
  function ticket(text) { tixQ.push(text); if (!tixBusy) nextTicket(); }
  function nextTicket() {
    const txt = tixQ.shift(); if (!txt) { tixBusy = false; return; } tixBusy = true;
    const t = document.createElement('div'); t.className = 'ticket'; t.innerHTML = txt; tixOut.appendChild(t); SND.play('ticket');
    setTimeout(() => t.remove(), 3300); setTimeout(nextTicket, 950);
  }

  /* ---------- Rendering ---------- */
  let visible = GAMES.slice(), selId = S.sel, query = '';
  function applyTheme() {
    cab.dataset.theme = S.theme; document.body.dataset.theme = S.theme;
    const th = getComputedStyle(cab); document.body.style.setProperty('--room1', th.getPropertyValue('--room1')); document.body.style.setProperty('--room2', th.getPropertyValue('--room2')); document.body.style.setProperty('--neon1', th.getPropertyValue('--neon1'));
  }
  function renderStickers() {
    CORNERS.forEach(c => { const slot = $(`[data-corner="${c}"]`, root), id = S.placed[c], st = id && SMAP[id]; slot.innerHTML = st ? `<span class="sticker" style="--s-bg:${st.bg};--s-fg:${st.fg}"><b>${st.icon}</b>${esc(st.name)}</span>` : ''; });
  }
  function filterCarts() {
    const q = query.trim().toLowerCase();
    visible = GAMES.filter(g => (S.cat === 'All' || g.cat === S.cat) && (!q || g.title.toLowerCase().includes(q) || g.tags.includes(q)));
    $$('.cart', root).forEach(el => { el.hidden = !visible.some(g => g.id === el.dataset.id); });
    $('[data-none]', root).hidden = visible.length > 0;
    $$('[data-cat]', root).forEach(b => { const on = b.dataset.cat === S.cat; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    CATS.forEach(c => { const n = c === 'All' ? GAMES.length : GAMES.filter(g => g.cat === c).length; $(`[data-catn="${c}"]`, root).textContent = n; });
    if (visible.length && !visible.some(g => g.id === selId)) select(visible[0].id, true); else renderSel();
  }
  function select(id, quiet) {
    if (!GMAP[id]) return; const changed = id !== selId; selId = id; S.sel = id; save();
    if (changed && !quiet) SND.play('nav');
    if (changed) { crt.classList.remove('switching'); void crt.offsetWidth; crt.classList.add('switching'); demoT0 = performance.now(); }
    renderSel();
  }
  function renderSel() {
    const g = GMAP[selId], D = gameData();
    cab.style.setProperty('--glow', g.c1);
    $$('.cart', root).forEach(el => { const on = el.dataset.id === selId; el.classList.toggle('sel', on); el.setAttribute('aria-selected', String(on)); });
    const sel = $(`.cart[data-id="${selId}"]`, root); if (sel && !sel.hidden) { const box = sel.parentElement; const r = sel.getBoundingClientRect(), br = box.getBoundingClientRect(); if (r.left < br.left || r.right > br.right || r.top < br.top || r.bottom > br.bottom) sel.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }); }
    $('[data-pvtitle]', root).textContent = g.title; $('[data-pvcat]', root).textContent = g.cat; $('[data-pvdesc]', root).textContent = g.desc;
    $('[data-stats]', root).innerHTML = statsFor(g.id, D).map(([l, v]) => `<div class="stat"><span>${esc(l)}</span><b title="${esc(v)}">${esc(v)}</b></div>`).join('');
    GAMES.forEach(x => { const el = $(`[data-cbest="${x.id}"]`, root); if (el) el.textContent = cartBest(x.id, D); });
    $('[data-attracthi]', root).textContent = g.title + ' · ' + cartBest(g.id, D);
  }
  function renderLED() {
    const t = pass() ? pass().tokens() : 0; const s = String(Math.min(99999, t)).padStart(5, '0');
    if (ledNum.textContent !== s) { ledNum.textContent = s; }
    creditLed.textContent = credits > 0 ? `CREDIT ${String(credits).padStart(2, '0')}` : 'FREE PLAY'; creditLed.classList.toggle('blink', credits === 0);
  }
  function refreshPlayBar() {
    if (!root) return; $('[data-mutei]', root).textContent = S.muted ? '🔇' : '🔊';
    $('[data-pb="crt"]', root).classList.toggle('off', !S.crt); $('[data-pb="mute"]', root).classList.toggle('off', S.muted);
    crt.classList.toggle('no-scan', !S.crt);
  }

  /* ---------- Navigation ---------- */
  function move(dx, dy) {
    if (!visible.length) return; let i = visible.findIndex(g => g.id === selId); if (i < 0) i = 0;
    const cols = matchMedia('(max-width:900px)').matches ? 1 : 2;
    let j = i + dx + dy * cols;
    if (j < 0) j = dy ? i : visible.length - 1; else if (j >= visible.length) j = dy ? i : 0;
    select(visible[clamp(j, 0, visible.length - 1)].id);
  }
  function cycleCat(d) { const i = CATS.indexOf(S.cat); S.cat = CATS[(i + d + CATS.length) % CATS.length]; save(); SND.play('tab'); filterCarts(); }
  let credits = 0;
  function insertCoin() {
    const btn = $('[data-coin]', root); const c = document.createElement('span'); c.className = 'coin-drop'; c.textContent = 'JG'; btn.appendChild(c); setTimeout(() => c.remove(), 800);
    btn.classList.add('lit'); clearTimeout(btn._t); btn._t = setTimeout(() => btn.classList.remove('lit'), 1300);
    setTimeout(() => SND.play('clink'), 420); credits = Math.min(99, credits + 1); S.coins++; save(); renderLED(); checkTrophies();
  }
  function pressFx(name) { const b = $(`[data-btn="${name}"]`, root); if (!b) return; b.classList.add('down'); clearTimeout(b._t); b._t = setTimeout(() => b.classList.remove('down'), 140); }
  function deckAction(name) {
    pressFx(name); SND.play('click');
    if (playing) { if (name === 'start') return; }
    switch (name) {
      case 'prev': if (!playing) move(-1, 0); break; case 'next': if (!playing) move(1, 0); break;
      case 'start': launch(selId); break; case 'shop': openModal('shop'); break; case 'spin': openModal('spin'); break; case 'trophies': openModal('trophies'); break;
    }
  }

  /* ---------- Launch / eject ---------- */
  let playing = null, stopFn = null, launchId = 0, pendingTok = 0;
  const scripts = {};
  function loadGame(id) {
    const map = { tycoon: ['./tycoon.js?v=10', 'ResellTycoon'], zomb: ['./zomb.js?v=2', 'ZombIO'], sneak: ['./sneak.js?v=1', 'SneakYeet'] };
    const [src, glob] = map[id];
    if (window[glob]) return Promise.resolve(window[glob]);
    if (id === 'sneak' && !$('link[data-sycss]')) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = './sneak.css?v=1'; l.dataset.sycss = '1'; document.head.appendChild(l); }
    if (!scripts[id]) scripts[id] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.async = true; s.onload = () => window[glob] ? res(window[glob]) : rej(new Error('init')); s.onerror = () => { s.remove(); rej(new Error('load')); }; document.head.appendChild(s); }).catch(e => { scripts[id] = null; throw e; });
    return scripts[id];
  }
  function launch(id) {
    const g = GMAP[id]; if (!g || playing) return; closeModal(); attract(false);
    SND.play('start'); if (credits > 0) credits--; renderLED();
    S.played[id] = 1; save();
    playing = id; const my = ++launchId; cab.classList.add('playing');
    menuEl.hidden = true; playEl.hidden = false; $('[data-ptitle]', root).textContent = g.icon + ' ' + g.title;
    area.className = 'play-area ' + (g.kind === 'mini' ? 'mini' : 'big');
    refreshPlayBar();
    if (g.kind === 'mini') { stopFn = window.JGArcade.mount(id, area); setTimeout(() => focusArea(), 50); }
    else {
      area.innerHTML = `<div class="rt-load" role="status" style="min-height:420px;display:grid;place-items:center;font:900 1rem 'Courier New',monospace;letter-spacing:.2em;color:#ffe36b">LOADING ${esc(g.title)}…</div>`;
      loadGame(id).then(G => { if (my !== launchId || playing !== id) return; stopFn = G.mount(area); }).catch(() => {
        if (my !== launchId) return; area.innerHTML = `<div style="min-height:300px;display:grid;place-items:center;text-align:center;gap:10px">${esc(g.title)} couldn’t load.<button class="go-btn" data-retry>Try again</button></div>`;
        $('[data-retry]', area).onclick = () => { eject(true); launch(id); };
      });
    }
    window.scrollTo({ top: Math.max(0, cab.getBoundingClientRect().top + scrollY - 6), behavior: 'smooth' });
  }
  function focusArea() { const f = area.querySelector('button,canvas,[tabindex]'); if (f) f.focus({ preventScroll: true }); }
  function eject(silent) {
    if (!playing) return; launchId++;
    try { stopFn && stopFn(); } catch (e) { console.error(e); } stopFn = null;
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    crt.classList.remove('theater'); document.body.classList.remove('rt-theater-open', 'zr-theater-open', 'sy-theater-open', 'arcade-playing');
    area.replaceChildren(); playing = null; cab.classList.remove('playing');
    playEl.hidden = true; menuEl.hidden = false; if (!silent) SND.play('power');
    renderSel(); renderLED(); checkTrophies();
    if (pendingTok > 0) { ticket(`🎟 +${pendingTok} TOKENS<br>WON THIS GAME`); pendingTok = 0; }
    lastInput = performance.now(); $(`.cart[data-id="${selId}"]`, root)?.focus({ preventScroll: true });
  }
  function toggleFS() {
    const inFrame = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
    if (document.fullscreenElement) { document.exitFullscreen?.(); return; }
    if (crt.classList.contains('theater')) { crt.classList.remove('theater'); return; }
    if (!inFrame && crt.requestFullscreen) crt.requestFullscreen().catch(() => crt.classList.add('theater')); else crt.classList.add('theater');
  }

  /* ---------- Trophies ---------- */
  function checkTrophies(silent) {
    const D = gameData(); let added = 0;
    TROPHIES.forEach(t => {
      if (S.trophies.includes(t.id)) return; if (t.v(D) >= t.n) {
        S.trophies.push(t.id); added++;
        if (!silent) { const r = pass() ? pass().award(10, 'Trophy: ' + t.name) : { got: 0 }; ticket(`🏆 TROPHY<br>${esc(t.name.toUpperCase())}${r.got ? '<br>+' + r.got + ' TOKENS' : ''}`); toast(`🏆 Trophy unlocked: <b>${esc(t.name)}</b>`, '#ffd23f'); }
      }
    });
    if (added) { save(); if (!silent) SND.play('prize'); }
  }

  /* ---------- Modals ---------- */
  let modal = null, shopTab = 'themes', spinning = false;
  const mEl = () => $('[data-modal]', root), mPanel = () => $('[data-mpanel]', root);
  function openModal(kind) { if (spinning) return; modal = kind; attract(false); mEl().hidden = false; renderModal(); SND.play('tab'); setTimeout(() => { const f = mPanel().querySelector('[data-auto]') || mPanel().querySelector('button:not(:disabled)'); f && f.focus(); }, 30); }
  function closeModal() { if (!modal || spinning) return; modal = null; mEl().hidden = true; mPanel().innerHTML = ''; lastInput = performance.now(); }
  const wallet = () => `<span class="cm-wallet">🎟 ${(pass() ? pass().tokens() : 0).toLocaleString()}</span>`;
  function renderModal() {
    const p = mPanel(); p.className = 'cm-panel' + (modal === 'spin' ? ' small' : '');
    if (modal === 'shop') {
      const tok = pass() ? pass().tokens() : 0;
      let body = '';
      if (shopTab === 'themes') body = `<div class="cm-grid">${THEMES.map(t => { const own = S.themes.includes(t.id), eq = S.theme === t.id, s = t.sw; return `<div class="cm-card ${eq ? 'eq' : ''}"><div class="mini-cab" style="background:${s[2]}"><div class="m" style="background:${s[0]};box-shadow:0 0 10px ${s[1]}"></div><div class="s" style="box-shadow:0 0 0 2px ${s[1]}"></div><div class="d" style="background:${s[2]};border-top:3px solid ${s[1]}"></div></div><b>${esc(t.name)}</b><small>${esc(t.desc)}</small>${eq ? '<button class="cm-btn alt" disabled>✓ Equipped</button>' : own ? `<button class="cm-btn" data-theme="${t.id}">Equip</button>` : `<button class="cm-btn gold" data-buytheme="${t.id}" ${tok < t.price ? 'disabled' : ''}>🎟 ${t.price} · Unlock</button>`}</div>`; }).join('')}</div>`;
      else body = `<p class="cm-sub">Buy stickers with tokens (or win them on the Daily Spin), then slap them on a bezel corner: TL · TR · BL · BR.</p><div class="cm-grid">${STICKERS.map(st => { const own = S.stickers.includes(st.id); return `<div class="cm-card"><span class="sticker" style="--s-bg:${st.bg};--s-fg:${st.fg};animation:none"><b>${st.icon}</b>${esc(st.name)}</span>${own ? `<div class="corners">${CORNERS.map(c => `<button data-place="${st.id}" data-c="${c}" class="${S.placed[c] === st.id ? 'on' : ''}" aria-label="Place on ${c}">${c.toUpperCase()}</button>`).join('')}</div>` : `<button class="cm-btn gold" data-buyst="${st.id}" ${tok < st.price ? 'disabled' : ''}>🎟 ${st.price}</button>`}</div>`; }).join('')}</div>`;
      p.innerHTML = `<div class="cm-head"><h2>🎨 Cabinet Customizer</h2>${wallet()}<button class="cm-x" data-close aria-label="Close">✕</button></div><div class="cm-tabs"><button class="sw ${shopTab === 'themes' ? 'on' : ''}" data-tab="themes" ${shopTab === 'themes' ? 'data-auto' : ''}><i></i>Cabinet Themes</button><button class="sw ${shopTab === 'stickers' ? 'on' : ''}" data-tab="stickers" ${shopTab === 'stickers' ? 'data-auto' : ''}><i></i>Stickers ${S.stickers.length}/${STICKERS.length}</button><span class="cm-sub" style="margin:0 0 0 auto;align-self:center">LB / RB switch tabs</span></div>${body}`;
    } else if (modal === 'spin') {
      const left = S.lastSpin + DAY_MS - Date.now(), can = left <= 0;
      p.innerHTML = `<div class="cm-head"><h2>🎡 Daily Lucky Wheel</h2>${wallet()}<button class="cm-x" data-close aria-label="Close">✕</button></div><div class="wheel-wrap"><div class="wheel-ptr"></div><canvas width="420" height="420" data-wheel></canvas><div class="wheel-hub">🎟</div></div><div class="spin-msg" data-spinmsg>${can ? 'One free spin every 24 hours!' : 'Next spin in <span data-cd>' + fmtLeft(left) + '</span>'}</div><div class="cm-center"><button class="cm-btn" data-spin data-auto ${can ? '' : 'disabled'}>${can ? '🎡 SPIN!' : '⏳ Come back later'}</button><button class="cm-btn alt" data-close>Close</button></div>`;
      drawWheel(wheelAng);
    } else if (modal === 'trophies') {
      const D = gameData(), got = TROPHIES.filter(t => S.trophies.includes(t.id)).length;
      p.innerHTML = `<div class="cm-head"><h2>🏆 Global Trophy Case</h2><span class="cm-wallet">${got}/${TROPHIES.length}</span><button class="cm-x" data-close data-auto aria-label="Close">✕</button></div><p class="cm-sub">Cross-game milestones. Each trophy prints a ticket and pays +10 Arcade Tokens.</p><div class="tro-grid">${TROPHIES.map(t => { const v = Math.min(t.v(D), t.n), ok = S.trophies.includes(t.id); return `<div class="tro ${ok ? 'got' : ''}"><span class="ti">${t.icon}</span><div style="min-width:0;flex:1"><b>${esc(t.name)}</b><small>${esc(t.desc)}</small><div class="pg"><i style="width:${ok ? 100 : (v / t.n * 100)}%"></i></div><small>${ok ? '✓ Unlocked' : `${Number(v).toLocaleString()} / ${t.n.toLocaleString()}`}</small></div></div>`; }).join('')}</div>`;
    }
    navI = 0;
  }
  const fmtLeft = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(n => String(n).padStart(2, '0')).join(':'); };
  function modalClick(e) {
    const t = e.target.closest('button'); if (!t || t.disabled) { if (e.target === mEl()) closeModal(); return; }
    if (t.dataset.close !== undefined) { SND.play('click'); closeModal(); return; }
    if (t.dataset.tab) { shopTab = t.dataset.tab; SND.play('tab'); renderModal(); focusFirst(); return; }
    if (t.dataset.theme) { S.theme = t.dataset.theme; save(); applyTheme(); SND.play('prize'); renderModal(); toast(`🎨 ${esc(THEMES.find(x => x.id === S.theme).name)} equipped`); return; }
    if (t.dataset.buytheme) { const th = THEMES.find(x => x.id === t.dataset.buytheme); if (pass() && pass().spend(th.price)) { S.themes.push(th.id); S.theme = th.id; save(); applyTheme(); SND.play('prize'); ticket(`🎨 UNLOCKED<br>${esc(th.name.toUpperCase())}`); checkTrophies(); renderModal(); renderLED(); } else { SND.play('deny'); toast('Not enough Arcade Tokens', '#ff4b5c'); } return; }
    if (t.dataset.buyst) { const st = SMAP[t.dataset.buyst]; if (pass() && pass().spend(st.price)) { S.stickers.push(st.id); const free = CORNERS.find(c => !S.placed[c]); if (free) S.placed[free] = st.id; save(); renderStickers(); SND.play('prize'); checkTrophies(); renderModal(); renderLED(); toast(`🏷️ ${esc(st.name)} sticker unlocked`); } else { SND.play('deny'); toast('Not enough Arcade Tokens', '#ff4b5c'); } return; }
    if (t.dataset.place) { const c = t.dataset.c, id = t.dataset.place; if (S.placed[c] === id) S.placed[c] = null; else { CORNERS.forEach(k => { if (S.placed[k] === id) S.placed[k] = null; }); S.placed[c] = id; } save(); renderStickers(); SND.play('click'); checkTrophies(); renderModal(); return; }
    if (t.dataset.spin !== undefined) { doSpin(); return; }
  }
  let navI = 0;
  const navEls = () => $$('button:not(:disabled)', mPanel()).filter(b => b.offsetParent);
  function focusFirst() { const f = mPanel().querySelector('[data-auto]') || navEls()[0]; f && f.focus(); }
  function modalNav(d) { const els = navEls(); if (!els.length) return; let i = els.indexOf(document.activeElement); if (i < 0) i = 0; else i = (i + d + els.length) % els.length; els.forEach(e => e.classList.remove('pfocus')); els[i].classList.add('pfocus'); els[i].focus(); SND.play('nav'); }

  /* ---------- Wheel ---------- */
  let wheelAng = 0;
  function drawWheel(a) {
    const c = $('[data-wheel]', root); if (!c) return; const g = c.getContext('2d'), R = c.width / 2, n = WHEEL.length, seg = Math.PI * 2 / n;
    g.clearRect(0, 0, c.width, c.height); g.save(); g.translate(R, R); g.rotate(a);
    WHEEL.forEach((w, i) => { const a0 = -Math.PI / 2 + i * seg; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R - 4, a0, a0 + seg); g.closePath(); g.fillStyle = w.c; g.fill(); g.lineWidth = 4; g.strokeStyle = '#000'; g.stroke();
      g.save(); g.rotate(a0 + seg / 2); g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 5; g.font = '900 30px Arial Rounded MT Bold, system-ui, sans-serif'; g.textAlign = 'right'; g.textBaseline = 'middle'; const lbl = w.st ? '🏷️' : w.l; g.strokeText(lbl, R - 24, 0); g.fillText(lbl, R - 24, 0); g.restore(); });
    for (let i = 0; i < n * 2; i++) { const ang = -Math.PI / 2 + i * seg / 2; g.beginPath(); g.arc(Math.cos(ang) * (R - 10), Math.sin(ang) * (R - 10), 5, 0, 7); g.fillStyle = i % 2 ? '#fff' : '#ffe36b'; g.fill(); }
    g.restore();
  }
  function doSpin() {
    if (spinning || S.lastSpin + DAY_MS > Date.now()) return; spinning = true; SND.play('click');
    const tot = WHEEL.reduce((a, w) => a + w.w, 0); let r = Math.random() * tot, idx = 0; for (let i = 0; i < WHEEL.length; i++) { r -= WHEEL[i].w; if (r <= 0) { idx = i; break; } }
    const seg = Math.PI * 2 / WHEEL.length, base = wheelAng % (Math.PI * 2), jitter = (Math.random() - .5) * seg * .6;
    const target = wheelAng - base + Math.PI * 2 * 6 + (Math.PI * 2 - (idx + .5) * seg) + jitter;
    const start = wheelAng, t0 = performance.now(), dur = 4200; let lastSeg = -1;
    $$('[data-spin],[data-close]', mPanel()).forEach(b => b.disabled = true);
    const step = now => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 4); wheelAng = start + (target - start) * e; drawWheel(wheelAng);
      const sIdx = Math.floor(((wheelAng % (Math.PI * 2)) + Math.PI * 2) / seg); if (sIdx !== lastSeg) { lastSeg = sIdx; SND.play('tick'); }
      if (k < 1) requestAnimationFrame(step); else finishSpin(idx);
    };
    requestAnimationFrame(step);
  }
  function finishSpin(idx) {
    const w = WHEEL[idx]; S.lastSpin = Date.now(); S.spins++; let msg;
    if (w.st) { const pool = STICKERS.filter(s => !S.stickers.includes(s.id)); if (pool.length) { const st = pool[Math.floor(Math.random() * pool.length)]; S.stickers.push(st.id); const free = CORNERS.find(c => !S.placed[c]); if (free) S.placed[free] = st.id; renderStickers(); msg = `🏷️ You won the ${esc(st.name)} sticker!`; ticket(`🏷️ STICKER<br>${esc(st.name.toUpperCase())}`); } else { const r = pass().award(25, 'Daily spin'); msg = `All stickers owned. +${r.got} tokens instead!`; ticket(`🎟 +${r.got} TOKENS`); } }
    else { const r = pass() ? pass().award(w.v, 'Daily spin') : { got: 0 }; msg = r.got ? `🎉 +${r.got} Arcade Tokens!` : 'Daily token cap reached. Try again tomorrow.'; if (r.got) ticket(`🎡 DAILY SPIN<br>+${r.got} TOKENS`); }
    save(); SND.play('prize'); spinning = false; renderLED(); checkTrophies();
    if (modal === 'spin') { renderModal(); const m = $('[data-spinmsg]', root); if (m) m.innerHTML = msg; }
    toast(msg, '#ffd23f');
  }

  /* ---------- Attract mode ---------- */
  let lastInput = performance.now(), attractOn = false, attractT = 0;
  function attract(on) { if (on === attractOn) return; attractOn = on; attractEl.hidden = !on; if (on) { attractT = performance.now(); } }
  function poke() { lastInput = performance.now(); if (attractOn) { attract(false); return true; } return false; }

  /* ---------- Preview demos (canvas) ---------- */
  let demoT0 = performance.now();
  const tyImg = new Image(); tyImg.src = './block-market.svg';
  function rect(x, y, w, h, c, stroke) { cx.fillStyle = c; cx.fillRect(x, y, w, h); if (stroke) { cx.strokeStyle = stroke; cx.lineWidth = 3; cx.strokeRect(x, y, w, h); } }
  function txt(s, x, y, size, color, align = 'center') { cx.font = `900 ${size}px "Arial Rounded MT Bold", system-ui, sans-serif`; cx.textAlign = align; cx.textBaseline = 'middle'; cx.lineWidth = 5; cx.strokeStyle = '#000'; cx.strokeText(s, x, y); cx.fillStyle = color; cx.fillText(s, x, y); }
  const DEMOS = {
    snake(t) {
      rect(0, 0, 640, 360, '#04101c'); cx.strokeStyle = '#0d2a40'; cx.lineWidth = 1; for (let x = 0; x < 640; x += 20) { cx.beginPath(); cx.moveTo(x, 0); cx.lineTo(x, 360); cx.stroke(); } for (let y = 0; y < 360; y += 20) { cx.beginPath(); cx.moveTo(0, y); cx.lineTo(640, y); cx.stroke(); }
      const len = 18 + Math.floor((t % 12) * 1.2);
      for (let i = len; i >= 0; i--) { const k = t * 1.6 - i * .09, x = 320 + Math.sin(k) * 230, y = 180 + Math.sin(k * 2) * 110; cx.fillStyle = i === 0 ? '#bdf6ff' : `hsl(${185 + i * 2},100%,${60 - i}%)`; cx.shadowColor = '#35e7ff'; cx.shadowBlur = 12; cx.fillRect(Math.round(x / 20) * 20 + 2, Math.round(y / 20) * 20 + 2, 16, 16); }
      cx.shadowBlur = 0; const fx = 320 + Math.sin(t * 1.6 + 1.2) * 230, fy = 180 + Math.sin((t * 1.6 + 1.2) * 2) * 110; cx.fillStyle = '#ff3dbb'; cx.shadowColor = '#ff3dbb'; cx.shadowBlur = 20; cx.beginPath(); cx.arc(Math.round(fx / 20) * 20 + 10, Math.round(fy / 20) * 20 + 10, 7 + Math.sin(t * 8) * 2, 0, 7); cx.fill(); cx.shadowBlur = 0;
      txt('SCORE ' + String(len - 18).padStart(3, '0'), 20, 26, 20, '#35e7ff', 'left');
    },
    ttt(t) {
      rect(0, 0, 640, 360, '#1a0b2e'); const ox = 200, oy = 30, s = 100; cx.strokeStyle = '#ff6bd6'; cx.lineWidth = 6; cx.shadowColor = '#ff6bd6'; cx.shadowBlur = 16;
      for (let i = 1; i < 3; i++) { cx.beginPath(); cx.moveTo(ox + i * s, oy); cx.lineTo(ox + i * s, oy + 3 * s); cx.stroke(); cx.beginPath(); cx.moveTo(ox, oy + i * s); cx.lineTo(ox + 3 * s, oy + i * s); cx.stroke(); }
      const moves = [[4, 'X'], [0, 'O'], [2, 'X'], [6, 'O'], [3, 'X'], [5, 'O'], [8, 'X'], [1, 'O'], [7, 'X']], step = Math.floor((t % 11) / 1.0);
      moves.slice(0, Math.min(step, 7)).forEach(([c, p]) => { const x = ox + (c % 3) * s + s / 2, y = oy + Math.floor(c / 3) * s + s / 2; cx.strokeStyle = p === 'X' ? '#35e7ff' : '#ffd23f'; cx.shadowColor = cx.strokeStyle; cx.lineWidth = 9; cx.beginPath(); if (p === 'X') { cx.moveTo(x - 28, y - 28); cx.lineTo(x + 28, y + 28); cx.moveTo(x + 28, y - 28); cx.lineTo(x - 28, y + 28); } else cx.arc(x, y, 30, 0, 7); cx.stroke(); });
      cx.shadowBlur = 0; if (step >= 8) txt('DRAW? REMATCH!', 320, 340, 22, '#fff');
    },
    memory(t) {
      rect(0, 0, 640, 360, '#120f2e'); const em = ['🍕', '🚀', '🍕', '👾', '🐸', '🚀', '👾', '🐸'];
      for (let i = 0; i < 8; i++) { const x = 92 + (i % 4) * 120, y = 50 + Math.floor(i / 4) * 140, ph = (t * .9 + i * .37) % 4, open = ph > 1.2 && ph < 2.8, sx = Math.abs(Math.cos(Math.min(1, Math.max(0, open ? (ph - 1.2) * 3 : (ph < 1.2 ? 0 : (ph - 2.8) * 3))) * Math.PI / 2 * (open ? 1 : 0) + (open ? 0 : 0)));
        cx.save(); cx.translate(x + 50, y + 60); cx.scale(open ? 1 : Math.max(.15, 1 - sx), 1); rect(-50, -60, 100, 120, open ? '#1c4a4a' : '#2a3a6e', '#000'); cx.font = '54px system-ui'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillStyle = '#fff'; cx.fillText(open ? em[i] : '?', 0, 4); cx.restore(); }
      txt('MOVES ' + (Math.floor(t * 1.5) % 30), 20, 22, 18, '#b48cff', 'left');
    },
    reaction(t) {
      const ph = t % 4, go = ph > 2.4; rect(0, 0, 640, 360, go ? '#06301a' : '#2e0712');
      cx.shadowColor = go ? '#2fd16b' : '#ff3d6b'; cx.shadowBlur = 50; cx.fillStyle = go ? '#2fd16b' : '#ff3d6b'; cx.beginPath(); cx.arc(320, 170, 100 + (go ? Math.sin(t * 20) * 6 : 0), 0, 7); cx.fill(); cx.shadowBlur = 0;
      txt(go ? 'CLICK NOW!' : 'WAIT FOR GREEN…', 320, 170, 34, '#fff'); if (ph > 3.1) txt(`${180 + Math.floor((t * 37) % 90)} ms`, 320, 320, 30, '#ffb347');
    },
    tycoon(t) {
      rect(0, 0, 640, 360, '#8fd6ff'); if (tyImg.complete && tyImg.naturalWidth) cx.drawImage(tyImg, -20, 10 + Math.sin(t) * 3, 680, 284); rect(0, 290, 640, 70, '#7ac36a');
      for (let i = 0; i < 3; i++) { const x = ((t * 60 + i * 230) % 760) - 60, y = 270 + Math.abs(Math.sin(t * 6 + i)) * -4; rect(x, y - 44, 26, 26, '#f2c79b', '#000'); rect(x - 4, y - 18, 34, 30, ['#ff3dbb', '#35e7ff', '#ffd23f'][i], '#000'); rect(x, y + 12, 10, 16, '#223', '#000'); rect(x + 16, y + 12, 10, 16, '#223', '#000'); }
      for (let i = 0; i < 4; i++) { const k = (t * .8 + i * .25) % 1; txt('+$' + (12 + i * 7), 140 + i * 120, 230 - k * 120, 22, `rgba(126,239,208,${1 - k})`); }
    },
    zomb(t) {
      const g = cx.createLinearGradient(0, 0, 0, 360); g.addColorStop(0, '#2a1060'); g.addColorStop(1, '#0b0620'); cx.fillStyle = g; cx.fillRect(0, 0, 640, 360);
      cx.fillStyle = '#e9e0ff'; cx.shadowColor = '#d8c8ff'; cx.shadowBlur = 30; cx.beginPath(); cx.arc(520, 70, 34, 0, 7); cx.fill(); cx.shadowBlur = 0; rect(0, 260, 640, 100, '#1d3a1a');
      rect(296, 170, 48, 90, '#7a5230', '#000'); rect(286, 150, 68, 26, '#9aa6b8', '#000'); rect(270, 236, 100, 24, '#c58b4f', '#000'); rect(305, 206, 30, 30, '#ffd23f', '#000');
      for (let i = 0; i < 5; i++) { const side = i % 2 ? 1 : -1, k = ((t * .18 + i * .21) % 1), x = 320 + side * (340 - k * 260), y = 246 - (i % 3) * 4, bob = Math.sin(t * 8 + i) * 3; rect(x - 10, y - 50 + bob, 22, 22, '#6fbf4a', '#000'); rect(x - 13, y - 28 + bob, 28, 26, ['#5b3b8a', '#a33', '#345'][i % 3], '#000'); rect(x - 10, y - 2, 9, 14, '#224', '#000'); rect(x + 3, y - 2, 9, 14, '#224', '#000'); cx.fillStyle = '#f00'; cx.fillRect(x - 6, y - 43 + bob, 4, 4); cx.fillRect(x + 4, y - 43 + bob, 4, 4); }
      for (let i = 0; i < 3; i++) { const k = (t * 1.4 + i * .33) % 1, side = i % 2 ? 1 : -1; cx.strokeStyle = '#ffe36b'; cx.lineWidth = 3; cx.beginPath(); const ax = 320 + side * k * 220; cx.moveTo(ax, 160 + k * 60); cx.lineTo(ax + side * 18, 160 + k * 60 + 4); cx.stroke(); }
      txt('WAVE 5 INCOMING!', 320, 40, 30, '#d7b8ff');
    },
    sneak(t) {
      rect(0, 0, 640, 360, '#2b2f3d'); for (let x = 0; x < 640; x += 40) for (let y = 0; y < 360; y += 40) if ((x + y) / 40 % 2) rect(x, y, 40, 40, '#323748');
      rect(120, 120, 70, 70, '#b07a3c', '#000'); rect(440, 200, 70, 60, '#b07a3c', '#000'); rect(260, 40, 120, 30, '#555b70', '#000');
      const gx = 320 + Math.sin(t * .7) * 180, gy = 230, dir = Math.cos(t * .7) > 0 ? 0 : Math.PI, sweep = Math.sin(t * 2) * .4;
      cx.fillStyle = 'rgba(255,230,90,.28)'; cx.beginPath(); cx.moveTo(gx, gy); cx.arc(gx, gy, 170, dir + sweep - .45, dir + sweep + .45); cx.closePath(); cx.fill();
      rect(gx - 16, gy - 16, 32, 32, '#2f6bff', '#000'); rect(gx - 10, gy - 30, 20, 16, '#f2c79b', '#000');
      const px = 150 + Math.sin(t * .35) * 40, py = 210 + Math.cos(t * .5) * 20; rect(px - 14, py - 14, 28, 28, '#111', '#ffd23f'); rect(px - 10, py - 6, 20, 5, '#ff3dbb');
      const noise = (Math.sin(t * 1.3) * .5 + .5) * 80; rect(170, 14, 300, 18, '#000', '#000'); rect(172, 16, 2.96 * noise, 14, noise < 40 ? '#2fd16b' : noise < 70 ? '#ffd23f' : '#ff4b5c'); txt('QUIET ' + Math.round(noise) + '%', 320, 23, 13, '#fff');
      if (noise > 60) txt('?', gx, gy - 52, 34, '#ffd23f');
      const ck = (t * .9) % 1; txt('🐔', px + 60 + ck * 160, py - 40 - Math.sin(ck * Math.PI) * 60, 26, '#fff');
    }
  };
  function drawDemo(now) {
    const g = GMAP[selId]; if (!g || playing || !cx) return; const t = (now - demoT0) / 1000;
    cx.save(); try { DEMOS[g.id](t); } catch (e) { /* ignore */ } cx.restore();
  }

  /* ---------- Input: joystick visual ---------- */
  const held = { up: 0, down: 0, left: 0, right: 0 }; let drag = null, padTilt = [0, 0], tilt = [0, 0];
  function setTilt(x, y) {
    tilt = [x, y]; joyStick.style.transform = `rotateX(${(-y * 32).toFixed(1)}deg) rotateZ(${(x * 26).toFixed(1)}deg)`;
    const d = $('.joy-dirs', root); d.children[0].classList.toggle('lit', y < -.4); d.children[1].classList.toggle('lit', y > .4); d.children[2].classList.toggle('lit', x < -.4); d.children[3].classList.toggle('lit', x > .4);
  }
  const rep = { dir: null, next: 0 };
  function analogNav(x, y, now) {
    let dir = null; if (Math.abs(x) > .5 || Math.abs(y) > .5) dir = Math.abs(x) > Math.abs(y) ? (x > 0 ? 'right' : 'left') : (y > 0 ? 'down' : 'up');
    if (!dir) { rep.dir = null; return; }
    if (dir !== rep.dir) { rep.dir = dir; rep.next = now + 380; doDir(dir); } else if (now >= rep.next) { rep.next = now + 150; doDir(dir); }
  }
  function doDir(dir) {
    poke();
    if (modal) { modalNav(dir === 'left' || dir === 'up' ? -1 : 1); return; }
    if (playing) { padToMini(dir); return; }
    move(dir === 'left' ? -1 : dir === 'right' ? 1 : 0, dir === 'up' ? -1 : dir === 'down' ? 1 : 0);
  }
  function padToMini(dir) {
    const g = GMAP[playing]; if (!g || g.kind !== 'mini') return;
    if (playing === 'snake') { document.dispatchEvent(new KeyboardEvent('keydown', { key: { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }[dir], bubbles: true })); return; }
    const els = $$('button:not(:disabled)', area).filter(b => b.offsetParent); if (!els.length) return; let i = els.indexOf(document.activeElement);
    if (playing === 'ttt' && els.some(b => b.classList.contains('cell'))) { const cells = els.filter(b => b.classList.contains('cell')); let k = cells.indexOf(document.activeElement); if (k < 0) k = 4; else { const r = Math.floor(k / 3), c = k % 3; if (dir === 'left') k = r * 3 + (c + 2) % 3; if (dir === 'right') k = r * 3 + (c + 1) % 3; if (dir === 'up') k = ((r + 2) % 3) * 3 + c; if (dir === 'down') k = ((r + 1) % 3) * 3 + c; } els.forEach(e => e.classList.remove('pfocus')); cells[k]?.classList.add('pfocus'); cells[k]?.focus(); return; }
    i = i < 0 ? 0 : (i + (dir === 'left' || dir === 'up' ? -1 : 1) + els.length) % els.length; els.forEach(e => e.classList.remove('pfocus')); els[i].classList.add('pfocus'); els[i].focus();
  }
  function bindJoy() {
    const joy = $('[data-joy]', root);
    joy.addEventListener('pointerdown', e => { e.preventDefault(); joy.setPointerCapture(e.pointerId); const r = joy.getBoundingClientRect(); drag = { cx: r.left + r.width / 2, cy: r.top + r.height * .55, x: 0, y: 0 }; poke(); SND.play('click'); });
    joy.addEventListener('pointermove', e => { if (!drag) return; const dx = (e.clientX - drag.cx) / 55, dy = (e.clientY - drag.cy) / 55, m = Math.hypot(dx, dy), k = m > 1 ? 1 / m : 1; drag.x = dx * k; drag.y = dy * k; });
    const up = () => { drag = null; rep.dir = null; }; joy.addEventListener('pointerup', up); joy.addEventListener('pointercancel', up);
  }

  /* ---------- Keyboard ---------- */
  const KEYDIR = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };
  function onKey(e) {
    const inSearch = document.activeElement && document.activeElement.matches('[data-search]');
    const dir = KEYDIR[e.key];
    if (playing) {
      if (dir && (e.key.startsWith('Arrow') || GMAP[playing].kind !== 'mini')) { held[dir] = 1; }
      if (e.key === 'Escape' && !e.defaultPrevented && !document.fullscreenElement) { if (crt.classList.contains('theater')) { crt.classList.remove('theater'); return; } eject(); }
      return;
    }
    if (poke() && !inSearch) { e.preventDefault(); return; }
    if (modal) {
      if (e.key === 'Escape' || e.key === 'Backspace') { e.preventDefault(); closeModal(); return; }
      if (dir && e.key.startsWith('Arrow')) { e.preventDefault(); modalNav(dir === 'left' || dir === 'up' ? -1 : 1); return; }
      if (modal === 'shop' && (e.key === 'q' || e.key === 'e' || e.key === '[' || e.key === ']')) { shopTab = shopTab === 'themes' ? 'stickers' : 'themes'; renderModal(); focusFirst(); return; }
      if (modal === 'spin' && (e.key === ' ' || e.key === 'Enter') && document.activeElement?.dataset?.spin === undefined && !document.activeElement?.closest('button')) { e.preventDefault(); doSpin(); }
      return;
    }
    if (inSearch) { if (e.key === 'Escape' || e.key === 'Enter' || e.key === 'ArrowDown') { document.activeElement.blur(); e.preventDefault(); } return; }
    if (e.target && e.target.closest && e.target.closest('input,textarea,select')) return;
    if (dir) { e.preventDefault(); held[dir] = 1; move(dir === 'left' ? -1 : dir === 'right' ? 1 : 0, dir === 'up' ? -1 : dir === 'down' ? 1 : 0); return; }
    const k = e.key.toLowerCase();
    if (e.key === 'Enter' || e.key === ' ') { if (e.target.closest && e.target.closest('.cm,.pb,.coin,[data-cat],[data-btn]')) return; e.preventDefault(); deckAction('start'); return; }
    if (k === 'q' || e.key === '[') { cycleCat(-1); return; } if (k === 'e' || e.key === ']') { cycleCat(1); return; }
    if (k === 'c') { insertCoin(); return; } if (k === 'g') { deckAction('shop'); return; } if (k === 'r') { deckAction('spin'); return; } if (k === 't') { deckAction('trophies'); return; }
    if (e.key === '/') { e.preventDefault(); $('[data-search]', root).focus(); return; }
    if (e.key === 'PageDown') { cycleCat(1); } if (e.key === 'PageUp') { cycleCat(-1); }
  }
  function onKeyUp(e) { const dir = KEYDIR[e.key]; if (dir) held[dir] = 0; }

  /* ---------- Gamepad ---------- */
  let pPrev = [], bHold = 0;
  const brandOf = id => { id = String(id || '').toLowerCase(); if (/xbox|045e|xinput/.test(id)) return 'XBOX'; if (/054c|playstation|dualsense|dualshock|wireless controller/.test(id)) return 'PLAYSTATION'; if (/057e|nintendo|pro controller|joy-con/.test(id)) return 'SWITCH'; return 'GAMEPAD'; };
  function pollPad(now, dt) {
    let gp = null; try { const list = navigator.getGamepads ? navigator.getGamepads() : []; for (const p of list) if (p && p.connected !== false) { gp = p; break; } } catch (e) { gp = null; }
    const label = gp ? `P1 · ${brandOf(gp.id)}` : 'NO CONTROLLER'; if (padLed._l !== label) { padLed._l = label; padLed.classList.toggle('on', !!gp); padLed.lastChild.textContent = label; if (gp && padLed._was === false) toast(`🎮 ${brandOf(gp.id)} controller connected`); padLed._was = !!gp; }
    if (!gp) { padTilt = [0, 0]; pPrev = []; return; }
    const b = i => !!(gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > .5)), pr = i => b(i) && !pPrev[i];
    let x = gp.axes[0] || 0, y = gp.axes[1] || 0; if (Math.hypot(x, y) < .2) { x = 0; y = 0; }
    if (b(14)) x = -1; if (b(15)) x = 1; if (b(12)) y = -1; if (b(13)) y = 1; padTilt = [x, y];
    const any = gp.buttons.some((_, i) => pr(i)) || Math.abs(x) > .5 || Math.abs(y) > .5;
    if (playing) {
      const g = GMAP[playing];
      if (b(1) && !(playing === 'sneak' && !b(8))) { bHold += dt; const h = $('[data-hold]', root); if (h) h.style.width = Math.min(100, bHold / 1 * 100) + '%'; if (bHold >= 1) { bHold = 0; eject(); } } else { if (bHold > 0 && bHold < .4 && g.kind === 'mini') eject(); bHold = 0; const h = $('[data-hold]', root); if (h) h.style.width = '0'; }
      if (g.kind === 'mini') { analogNav(x, y, now); if (pr(0)) { const f = document.activeElement; if (f && area.contains(f) && f.tagName === 'BUTTON') f.click(); else { const a = area.querySelector('.action,.bigbtn,button'); a && a.click(); } } }
    } else if (modal) {
      if (any && attractOn) poke();
      analogNav(x, y, now);
      if (pr(0)) { const f = document.activeElement; if (f && mPanel().contains(f)) f.click(); else if (modal === 'spin') doSpin(); }
      if (pr(1)) closeModal(); if (modal === 'shop' && (pr(4) || pr(5))) { shopTab = shopTab === 'themes' ? 'stickers' : 'themes'; renderModal(); focusFirst(); }
    } else {
      if (attractOn && any) { poke(); pPrev = gp.buttons.map((_, i) => b(i)); rep.dir = 'swallow'; return; }
      if (rep.dir === 'swallow' && Math.abs(x) < .5 && Math.abs(y) < .5) rep.dir = null;
      if (rep.dir !== 'swallow') analogNav(x, y, now);
      if (pr(0) || pr(9)) { poke(); deckAction('start'); }
      if (pr(4)) { poke(); cycleCat(-1); } if (pr(5)) { poke(); cycleCat(1); }
      if (pr(3)) { poke(); deckAction('shop'); } if (pr(2)) { poke(); deckAction('spin'); } if (pr(8)) { poke(); deckAction('trophies'); }
      if (pr(10) || pr(11)) { poke(); insertCoin(); }
    }
    pPrev = gp.buttons.map((_, i) => b(i));
  }

  /* ---------- Main loop ---------- */
  let lastT = performance.now(), ledT = 0;
  function frame(now) {
    const dt = Math.min(.1, (now - lastT) / 1000); lastT = now;
    pollPad(now, dt);
    let tx = 0, ty = 0;
    if (drag) { tx = drag.x; ty = drag.y; if (!playing || GMAP[playing].kind === 'mini') analogNav(tx, ty, now); }
    else if (padTilt[0] || padTilt[1]) { tx = padTilt[0]; ty = padTilt[1]; }
    else { tx = held.right - held.left; ty = held.down - held.up; }
    tilt[0] += (tx - tilt[0]) * Math.min(1, dt * 22); tilt[1] += (ty - tilt[1]) * Math.min(1, dt * 22); setTilt(tilt[0], tilt[1]);
    if (!playing && !modal && !attractOn && now - lastInput > IDLE_MS && !document.hidden) attract(true);
    if (attractOn && now - attractT > 4000) { attractT = now; const pool = visible.length ? visible : GAMES; const i = pool.findIndex(g => g.id === selId); select(pool[(i + 1) % pool.length].id, true); }
    if (!playing && !document.hidden) drawDemo(now);
    ledT -= dt; if (ledT <= 0) { ledT = 1.5; renderLED(); if (modal === 'spin' && !spinning) { const cd = $('[data-cd]', root); if (cd) { const left = S.lastSpin + DAY_MS - Date.now(); if (left <= 0) renderModal(); else cd.textContent = fmtLeft(left); } } }
    requestAnimationFrame(frame);
  }

  /* ---------- Wire up ---------- */
  function bind() {
    root.addEventListener('click', e => {
      const cart = e.target.closest('.cart'); if (cart) { poke(); if (cart.dataset.id === selId) launch(selId); else select(cart.dataset.id); return; }
      const cat = e.target.closest('[data-cat]'); if (cat) { poke(); S.cat = cat.dataset.cat; save(); SND.play('tab'); filterCarts(); return; }
      const btn = e.target.closest('[data-btn]'); if (btn) { poke(); deckAction(btn.dataset.btn); return; }
      if (e.target.closest('[data-coin]')) { poke(); insertCoin(); return; }
      if (e.target.closest('[data-go]')) { poke(); deckAction('start'); return; }
      const pb = e.target.closest('[data-pb]'); if (pb) { SND.play('click'); const a = pb.dataset.pb; if (a === 'eject') eject(); else if (a === 'fs') toggleFS(); else if (a === 'crt') { S.crt = !S.crt; save(); refreshPlayBar(); } else if (a === 'mute') setMuted(!S.muted); return; }
    });
    mEl().addEventListener('click', modalClick);
    $('[data-search]', root).addEventListener('input', e => { query = e.target.value; poke(); filterCarts(); });
    menuEl.addEventListener('wheel', e => { if (modal || playing) return; const now = performance.now(); e.preventDefault(); poke(); if (now - (menuEl._w || 0) < 140) return; menuEl._w = now; move(e.deltaY > 0 || e.deltaX > 0 ? 1 : -1, 0); }, { passive: false });
    document.addEventListener('keydown', onKey); document.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', () => { Object.keys(held).forEach(k => held[k] = 0); });
    ['pointerdown', 'pointermove'].forEach(ev => document.addEventListener(ev, e => { if (ev === 'pointermove' && !attractOn) { lastInput = performance.now(); return; } if (ev === 'pointerdown') poke(); }, { passive: true }));
    window.addEventListener('jg-tokens', e => { renderLED(); const d = e.detail && e.detail.delta; if (d > 0 && e.detail.reason !== 'sync') { if (playing) pendingTok += d; } if (!playing) renderSel(); if (modal && !spinning) { const w = $('.cm-wallet', root); if (w && modal !== 'trophies') w.textContent = '🎟 ' + pass().tokens().toLocaleString(); } });
    window.addEventListener('storage', () => { S = load(); applyTheme(); renderStickers(); renderSel(); renderLED(); });
    document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) crt.classList.remove('theater'); });
    window.addEventListener('gamepadconnected', () => { lastInput = performance.now(); });
  }

  function start() {
    if (window.__jgAudio) window.__jgAudio.set(S.muted);
    build(); applyTheme(); renderStickers(); bind(); bindJoy(); filterCarts(); renderSel(); renderLED(); refreshPlayBar(); setTimeout(() => checkTrophies(), 1500);
    padLed._was = false;
    requestAnimationFrame(frame);
    const m = /[#&]play=(\w+)/.exec(location.hash); if (m && GMAP[m[1]]) setTimeout(() => launch(m[1]), 300);
  }
  window.JGCabinet = { launch, eject, state: () => S, select, openModal, closeModal, insertCoin, checkTrophies, games: GAMES };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
