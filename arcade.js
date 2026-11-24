/* JaydenGames Arcade Pass: shared token wallet + the four mini-games.
   Used by the homepage and the in-shop Arcade Cabinet in RESELL TYCOON. */
(function () {
  'use strict';
  const KEY = 'jaydengames.arcadePass.v1', DAILY_CAP = 600;
  const today = () => new Date().toISOString().slice(0, 10);
  function load() {
    let d = {};
    try { d = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { d = {}; }
    const n = (v, def = 0) => (Number.isFinite(+v) && +v >= 0 ? Math.floor(+v) : def);
    const b = d.best || {};
    const out = {
      tokens: Math.min(n(d.tokens), 1e7), totalEarned: n(d.totalEarned), spent: n(d.spent),
      best: { snake: n(b.snake), tttWins: n(b.tttWins), memoryMoves: n(b.memoryMoves), reactionMs: n(b.reactionMs) },
      day: typeof d.day === 'string' ? d.day : today(), earnedToday: n(d.earnedToday), plays: n(d.plays)
    };
    if (out.day !== today()) { out.day = today(); out.earnedToday = 0; }
    return out;
  }
  function store(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* storage blocked */ } }
  function emit(d, delta, reason) { try { window.dispatchEvent(new CustomEvent('jg-tokens', { detail: { tokens: d.tokens, delta, reason } })); } catch (e) { /* old browser */ } }
  const pass = {
    key: KEY, cap: DAILY_CAP,
    get: load,
    tokens: () => load().tokens,
    award(amount, reason) {
      const d = load(); const room = Math.max(0, DAILY_CAP - d.earnedToday);
      const got = Math.max(0, Math.min(Math.floor(amount), room));
      d.tokens += got; d.totalEarned += got; d.earnedToday += got; store(d); emit(d, got, reason);
      return { got, capped: got < amount, tokens: d.tokens };
    },
    spend(n) { const d = load(); n = Math.floor(n); if (n <= 0 || d.tokens < n) return false; d.tokens -= n; d.spent += n; store(d); emit(d, -n, 'spend'); return true; },
    best(field, value, lowerIsBetter) {
      const d = load(), cur = d.best[field] || 0;
      const better = lowerIsBetter ? (!cur || value < cur) : value > cur;
      if (better) { d.best[field] = value; store(d); }
      return better;
    },
    count(field) { const d = load(); d.best[field] = (d.best[field] || 0) + 1; d.plays++; store(d); return d.best[field]; },
    played() { const d = load(); d.plays++; store(d); }
  };
  window.addEventListener('storage', e => { if (e.key === KEY) emit(load(), 0, 'sync'); });

  /* ---------- helpers ---------- */
  const h = (tag, cls, html) => { const el = document.createElement(tag); if (cls) el.className = cls; if (html != null) el.innerHTML = html; return el; };
  function rewardToast(root, text, opts) {
    if (opts && opts.onReward) return;
    const t = h('div', 'jg-toast', text); root.appendChild(t);
    setTimeout(() => t.classList.add('out'), 2200); setTimeout(() => t.remove(), 2700);
  }
  function give(root, opts, game, amount, why) {
    const r = pass.award(amount, game);
    const msg = r.got > 0 ? `🎟️ +${r.got} Arcade Tokens · ${why}` : '🎟️ Daily token cap reached. Come back tomorrow.';
    if (opts && opts.onReward) opts.onReward({ game, got: r.got, tokens: r.tokens, why, msg });
    rewardToast(root, msg, opts);
    return r.got;
  }
  const TITLES = { snake: '🐍 Neon Snake', ttt: '❎ Tic-Tac-Toe', memory: '🧠 Memory Match', reaction: '⚡ Reaction Rush' };

  /* ---------- Neon Snake ---------- */
  function snake(root, opts) {
    root.innerHTML = `<p class="muted">Arrow keys, WASD, swipe, the pad below, or a controller D-pad. Score 5+ to earn tokens.</p>
      <div class="score" data-r="score">Score: 0 · Best: ${pass.get().best.snake}</div>
      <canvas width="400" height="320" class="jg-canvas" aria-label="Snake board"></canvas>
      <div class="jg-dpad" aria-label="Direction pad"><button data-d="up" aria-label="Up">▲</button><button data-d="left" aria-label="Left">◀</button><button data-d="down" aria-label="Down">▼</button><button data-d="right" aria-label="Right">▶</button></div>
      <button class="action" data-r="restart">Restart</button>`;
    const c = root.querySelector('canvas'), ctx = c.getContext('2d'), label = root.querySelector('[data-r=score]');
    const size = 20, cols = 20, rows = 16; let timer = null, raf = 0, body, dir, next, food, score, started, dead;
    const DIRS = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
    function place() { do { food = { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) }; } while (body.some(p => p.x === food.x && p.y === food.y)); }
    function reset() {
      clearInterval(timer); timer = null; body = [{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 6, y: 8 }]; dir = { x: 1, y: 0 }; next = dir; food = { x: 14, y: 8 }; score = 0; started = false; dead = false;
      label.textContent = `Score: 0 · Best: ${pass.get().best.snake}`; draw(); banner('PRESS A DIRECTION');
    }
    function draw() {
      ctx.fillStyle = '#07101c'; ctx.fillRect(0, 0, c.width, c.height); ctx.strokeStyle = '#10213a'; ctx.beginPath();
      for (let x = 0; x <= cols; x++) { ctx.moveTo(x * size, 0); ctx.lineTo(x * size, c.height); }
      for (let y = 0; y <= rows; y++) { ctx.moveTo(0, y * size); ctx.lineTo(c.width, y * size); }
      ctx.stroke(); ctx.fillStyle = '#ff3dbb'; ctx.fillRect(food.x * size + 4, food.y * size + 4, 12, 12);
      body.forEach((p, i) => { ctx.fillStyle = i ? '#168ca5' : '#35e7ff'; ctx.fillRect(p.x * size + 2, p.y * size + 2, 16, 16); });
    }
    function banner(t) { ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 130, c.width, 44); ctx.fillStyle = '#fff'; ctx.font = '900 22px system-ui, Arial'; ctx.textAlign = 'center'; ctx.fillText(t, c.width / 2, 160); ctx.textAlign = 'left'; }
    function over(win) {
      dead = true; clearInterval(timer); timer = null; draw(); banner(win ? 'YOU WIN!' : 'GAME OVER · A / Restart');
      pass.played(); const nb = score > 0 && pass.best('snake', score);
      let tk = score >= 5 ? Math.max(10, Math.min(50, score * 2)) : 0; if (nb && score >= 5) tk = Math.min(60, tk + 10);
      label.textContent = `Score: ${score} · Best: ${pass.get().best.snake}${nb ? ' · NEW BEST!' : ''}`;
      if (tk) give(root, opts, 'snake', tk, nb ? `New Snake best: ${score}` : `Snake score ${score}`);
      opts.onEnd?.('snake', score);
    }
    function tick() {
      dir = next; const hd = { x: body[0].x + dir.x, y: body[0].y + dir.y }, eat = hd.x === food.x && hd.y === food.y;
      if (hd.x < 0 || hd.y < 0 || hd.x >= cols || hd.y >= rows || body.some((p, i) => (eat || i < body.length - 1) && p.x === hd.x && p.y === hd.y)) return over(false);
      body.unshift(hd);
      if (eat) { score++; label.textContent = `Score: ${score} · Best: ${pass.get().best.snake}`; if (body.length === cols * rows) return over(true); place(); } else body.pop();
      draw();
    }
    function steer(name) {
      if (dead) return; const d = DIRS[name]; if (!d) return;
      if (d.x === -dir.x && d.y === -dir.y) return; next = d;
      if (!started) { started = true; timer = setInterval(() => { if (!document.hidden) tick(); }, 125); }
    }
    const KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };
    function key(e) { const k = KEYS[e.key]; if (!k || !root.isConnected) return; if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return; e.preventDefault(); if (dead && e.key.startsWith('Arrow')) return; steer(k); }
    document.addEventListener('keydown', key);
    root.querySelectorAll('[data-d]').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); steer(b.dataset.d); }));
    root.querySelector('[data-r=restart]').onclick = reset;
    let sx = 0, sy = 0; c.addEventListener('touchstart', e => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; }, { passive: true });
    c.addEventListener('touchend', e => { const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy; if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return; steer(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up')); }, { passive: true });
    let prevA = false;
    function poll() {
      raf = requestAnimationFrame(poll);
      const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : []; const p = pads[0]; if (!p) return;
      const bt = i => !!(p.buttons[i] && p.buttons[i].pressed), ax = p.axes[0] || 0, ay = p.axes[1] || 0;
      if (bt(12) || ay < -0.6) steer('up'); else if (bt(13) || ay > 0.6) steer('down'); else if (bt(14) || ax < -0.6) steer('left'); else if (bt(15) || ax > 0.6) steer('right');
      const a = bt(0); if (a && !prevA && dead) reset(); prevA = a;
    }
    poll(); reset();
    return () => { clearInterval(timer); cancelAnimationFrame(raf); document.removeEventListener('keydown', key); };
  }

  /* ---------- Tic-Tac-Toe (vs CPU or 2 players) ---------- */
  function ttt(root, opts) {
    const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
    let mode = opts.tttMode || 'cpu', board, turn, over, cpuT = null;
    root.innerHTML = `<div class="jg-seg" role="group" aria-label="Mode"><button data-m="cpu">🤖 vs CPU</button><button data-m="pvp">👥 2 players</button></div>
      <p class="muted" data-r="status"></p><div class="board"></div><button class="action" data-r="again">Play again</button>
      <p class="muted jg-note">Beat the CPU for +25 tokens. A draw earns +10.</p>`;
    const st = root.querySelector('[data-r=status]'), b = root.querySelector('.board');
    const winner = bd => { for (const l of LINES) if (bd[l[0]] && l.every(n => bd[n] === bd[l[0]])) return bd[l[0]]; return bd.every(Boolean) ? 'draw' : null; };
    function cpuMove() {
      const empty = board.map((v, i) => v ? -1 : i).filter(i => i >= 0);
      const tryWin = who => { for (const i of empty) { const t = board.slice(); t[i] = who; if (winner(t) === who) return i; } return -1; };
      let m = tryWin('O'); if (m < 0) m = tryWin('X');
      if (m < 0 && Math.random() < 0.25) m = empty[Math.floor(Math.random() * empty.length)]; // CPU makes the odd mistake
      if (m < 0 && !board[4]) m = 4;
      if (m < 0) { const corners = [0, 2, 6, 8].filter(i => !board[i]); if (corners.length) m = corners[Math.floor(Math.random() * corners.length)]; }
      if (m < 0) m = empty[Math.floor(Math.random() * empty.length)];
      play(m);
    }
    function finish(w) {
      over = true; pass.played();
      if (w === 'draw') { st.textContent = "It's a draw!"; if (mode === 'cpu') give(root, opts, 'ttt', 10, 'Draw vs CPU'); }
      else if (mode === 'cpu' && w === 'X') { st.textContent = 'You beat the CPU! 🎉'; pass.count('tttWins'); give(root, opts, 'ttt', 25, 'Beat the CPU'); }
      else if (mode === 'cpu') st.textContent = 'The CPU wins. Run it back.';
      else st.textContent = w + ' wins! 🎉';
      opts.onEnd?.('ttt', w);
    }
    function play(i) {
      if (over || board[i]) return; board[i] = turn; const w = winner(board);
      if (w) { render(); return finish(w); }
      turn = turn === 'X' ? 'O' : 'X'; st.textContent = mode === 'cpu' ? (turn === 'X' ? 'Your turn (X)' : 'CPU is thinking…') : turn + "'s turn"; render();
      if (mode === 'cpu' && turn === 'O') cpuT = setTimeout(cpuMove, 420);
    }
    function render() {
      b.innerHTML = ''; board.forEach((v, i) => {
        const x = document.createElement('button'); x.className = 'cell'; x.textContent = v; x.setAttribute('aria-label', `Square ${i + 1}${v ? ': ' + v : ''}`);
        x.onclick = () => { if (mode === 'cpu' && turn === 'O') return; play(i); const n = b.children[i]; if (n) n.focus(); }; b.appendChild(x);
      });
    }
    function reset() {
      clearTimeout(cpuT); board = Array(9).fill(''); turn = 'X'; over = false; st.textContent = mode === 'cpu' ? 'You are X. Go first.' : 'X goes first';
      root.querySelectorAll('[data-m]').forEach(x => x.classList.toggle('on', x.dataset.m === mode)); render();
    }
    root.querySelectorAll('[data-m]').forEach(x => x.onclick = () => { mode = x.dataset.m; reset(); });
    root.querySelector('[data-r=again]').onclick = reset; reset();
    return () => clearTimeout(cpuT);
  }

  /* ---------- Memory Match ---------- */
  function memory(root, opts) {
    const symbols = ['🚀', '🎧', '👾', '⭐', '🎮', '💎', '🔥', '🛸']; let timer = null;
    function start() {
      clearTimeout(timer); const deck = [...symbols, ...symbols].sort(() => Math.random() - 0.5); let flipped = [], matched = 0, lock = false, moves = 0;
      const best = pass.get().best.memoryMoves;
      root.innerHTML = `<p class="muted">Find all 8 pairs. Fewer moves = more tokens (10 moves or less pays 50).</p><div class="score" data-r="score">Moves: 0 · Pairs: 0/8${best ? ' · Best: ' + best : ''}</div><div class="memory"></div><button class="action" data-r="restart">Restart</button>`;
      const b = root.querySelector('.memory'), sc = root.querySelector('[data-r=score]'); root.querySelector('[data-r=restart]').onclick = start;
      deck.forEach((s, i) => {
        const x = document.createElement('button'); x.className = 'mem'; x.textContent = '?'; x.setAttribute('aria-label', 'Hidden card');
        x.onclick = () => {
          if (lock || x.classList.contains('done') || flipped.includes(i)) return; x.textContent = s; flipped.push(i);
          if (flipped.length === 2) {
            moves++; lock = true; const [a, z] = flipped;
            if (deck[a] === deck[z]) { [a, z].forEach(n => b.children[n].classList.add('done')); matched++; lock = false; flipped = []; }
            else timer = setTimeout(() => { b.children[a].textContent = '?'; b.children[z].textContent = '?'; flipped = []; lock = false; }, 700);
            sc.textContent = `Moves: ${moves} · Pairs: ${matched}/8`;
            if (matched === 8) {
              const nb = pass.best('memoryMoves', moves, true); pass.played(); sc.textContent += nb ? ' · NEW BEST! 🎉' : ' · You won! 🎉';
              const tk = moves <= 10 ? 50 : moves <= 14 ? 35 : moves <= 18 ? 20 : 10; give(root, opts, 'memory', tk, `Cleared in ${moves} moves`); opts.onEnd?.('memory', moves);
            }
          }
        }; b.appendChild(x);
      });
    }
    start(); return () => clearTimeout(timer);
  }

  /* ---------- Reaction Rush ---------- */
  function reaction(root, opts) {
    const best = pass.get().best.reactionMs;
    root.innerHTML = `<p class="muted">Press start, wait for green, then tap fast. Under 220 ms pays +15 tokens.</p><button class="action bigbtn" data-r="btn">Start round</button><div class="score" data-r="res">${best ? 'Best: ' + best + ' ms' : 'Your best is your next best!'}</div>`;
    const btn = root.querySelector('[data-r=btn]'), res = root.querySelector('[data-r=res]'); let timer = null, start = 0, waiting = false, ready = false;
    btn.onclick = () => {
      if (!waiting && !ready) { waiting = true; btn.textContent = 'Wait for green...'; btn.style.background = '#a04e91'; timer = setTimeout(() => { ready = true; waiting = false; start = performance.now(); btn.textContent = 'CLICK NOW!'; btn.style.background = '#20b86a'; }, 1200 + Math.random() * 2800); }
      else if (waiting) { clearTimeout(timer); waiting = false; btn.textContent = 'Too soon! Try again'; btn.style.background = ''; }
      else if (ready) {
        const ms = Math.round(performance.now() - start); ready = false; btn.textContent = 'Play again'; btn.style.background = '';
        const nb = pass.best('reactionMs', ms, true); pass.played(); res.textContent = `Your reaction time: ${ms} ms${nb ? ' · NEW BEST!' : ''}`;
        const tk = ms < 220 ? 15 : ms < 300 ? 10 : ms < 400 ? 5 : 0; if (tk) give(root, opts, 'reaction', tk, `${ms} ms reaction`); opts.onEnd?.('reaction', ms);
      }
    };
    return () => clearTimeout(timer);
  }

  const GAMES = { snake, ttt, memory, reaction };
  function mount(name, container, opts) {
    opts = opts || {}; const fn = GAMES[name]; if (!fn) return () => {};
    const root = h('div', 'jg-game jg-' + name); container.replaceChildren(root);
    let stop = fn(root, opts) || (() => {});
    return () => { try { stop(); } catch (e) { /* ignore */ } stop = () => {}; };
  }
  window.JGArcade = { pass, mount, titles: TITLES, games: Object.keys(GAMES) };
})();
