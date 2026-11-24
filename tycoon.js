(() => {
'use strict';
/* RESELL TYCOON v3 — JaydenGames. Three.js world, Web Audio sound, Gamepad API controls. */
const VERSION = 3;
const SAVE_KEY = 'resellTycoon.save.v3', SET_KEY = 'resellTycoon.settings.v3', CTRL_KEY = 'resellTycoon.controls.v3';
const LS = {
  ok: (() => { try { const k = '__rt_test'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return true; } catch (e) { return false; } })(),
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} }
};
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const money = n => (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const now = () => performance.now() / 1000;
const fmtTime = s => { s = Math.max(0, Math.ceil(s)); const m = Math.floor(s / 60); return m ? `${m}:${String(s % 60).padStart(2, '0')}` : `${s}s`; };
const fmtDur = s => { s = Math.floor(s); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h ? `${h}h ${m}m` : m ? `${m}m` : `${s}s`; };
const todayKey = () => { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); };

/* ---------- Products & licenses ---------- */
const PRODUCTS = [
  { id: 'tee', name: 'Graphic Tee', lic: 0, cost: 8, value: 15, per: 8, color: 0xff5d8f, accent: 0xffffff, shape: 'shirt' },
  { id: 'sneaker', name: 'Sneakers', lic: 0, cost: 20, value: 34, per: 6, color: 0xf4f4f4, accent: 0xff3b3b, shape: 'shoe' },
  { id: 'hoodie', name: 'Hoodie', lic: 1, cost: 26, value: 44, per: 6, color: 0x7a5cff, accent: 0xffffff, shape: 'shirt' },
  { id: 'limited', name: 'Limited Sneakers', lic: 1, cost: 65, value: 120, per: 4, color: 0x18d4ff, accent: 0xffd400, shape: 'shoe', rare: true },
  { id: 'bag', name: 'Designer Bag', lic: 2, cost: 80, value: 140, per: 4, color: 0xc58b4b, accent: 0xffe08a, shape: 'bag' },
  { id: 'belt', name: 'Designer Belt', lic: 2, cost: 38, value: 66, per: 6, color: 0x2b2b2b, accent: 0xffd400, shape: 'belt' },
  { id: 'headphones', name: 'Headphones', lic: 3, cost: 55, value: 95, per: 4, color: 0xff7a1a, accent: 0x222222, shape: 'headphones' },
  { id: 'console', name: 'Game Console', lic: 3, cost: 190, value: 310, per: 3, color: 0x1f2233, accent: 0x35e7ff, shape: 'console' },
  { id: 'watch', name: 'Luxury Watch', lic: 4, cost: 320, value: 560, per: 3, color: 0xffcf4a, accent: 0x1b1b1b, shape: 'watch' },
  { id: 'grail', name: 'Grail Watch', lic: 4, cost: 650, value: 1250, per: 2, color: 0xbff4ff, accent: 0xffffff, shape: 'watch', rare: true }
];
const PIDX = Object.fromEntries(PRODUCTS.map((p, i) => [p.id, i]));
const LICENSES = [
  { name: 'Starter Streetwear', price: 0, desc: 'Graphic Tees and Sneakers. Every empire starts somewhere.' },
  { name: 'Sneakers & Hoodies', price: 150, desc: 'Unlock Hoodies and rare Limited Sneakers.' },
  { name: 'Designer Bags', price: 600, desc: 'Unlock Designer Bags and Designer Belts.' },
  { name: 'Gaming Consoles & Tech', price: 1800, desc: 'Unlock Game Consoles and Headphones.' },
  { name: 'Luxury Watches', price: 5000, desc: 'Unlock Luxury Watches and the ultra-rare Grail Watch.' }
];

/* ---------- Store expansion tiers ---------- */
const TIERS = [
  { name: 'Starter Shack', w: 9, d: 10, price: 0, cols: [-2.3, 2.3], rows: [4.5, 6.9] },
  { name: 'Corner Shop', w: 12, d: 12, price: 1200, cols: [-4.1, -1.7, 1.7, 4.1], rows: [4.5, 7.0] },
  { name: 'Flagship Boutique', w: 15, d: 14, price: 5000, cols: [-5.6, -3.1, 3.1, 5.6], rows: [4.5, 7.0, 9.5] },
  { name: 'Mega Mall', w: 19, d: 16, price: 16000, cols: [-7.4, -4.9, -2.4, 2.4, 4.9, 7.4], rows: [4.5, 7.0, 9.5] }
];

/* ---------- Upgrade tracks (5 levels each) ---------- */
const TRACKS = [
  { id: 'warehouse', name: 'Bigger Warehouse', icon: '📦', base: 180, mult: 1.9, desc: l => `Delivery dock holds ${dockCapFor(l)} boxes${l < 5 ? ` → ${dockCapFor(l + 1)}` : ''}.` },
  { id: 'inventory', name: 'More Inventory Space', icon: '🗄️', base: 160, mult: 1.9, desc: l => `Each shelf holds ${shelfCapFor(l)} items${l < 5 ? ` → ${shelfCapFor(l + 1)}` : ''}.` },
  { id: 'delivery', name: 'Faster Delivery', icon: '🚚', base: 140, mult: 1.85, desc: l => `Orders arrive in ${deliveryFor(l)}s${l < 5 ? ` → ${deliveryFor(l + 1)}s` : ''}.` },
  { id: 'suppliers', name: 'Better Suppliers', icon: '🤝', base: 220, mult: 2, desc: l => `${l * 5}% off supplier prices${l < 5 ? ` → ${(l + 1) * 5}%` : ''}.` },
  { id: 'autosell', name: 'Automatic Selling', icon: '🌐', base: 350, mult: 1.9, desc: l => l ? `Online store sells 1 shelf item every ${autoSellFor(l)}s${l < 5 ? ` → ${autoSellFor(l + 1)}s` : ''}.` : 'Open an online store that sells shelf stock while you work.' },
  { id: 'customers', name: 'More Customers', icon: '📣', base: 200, mult: 1.9, desc: l => `+${l * 12}% shopper traffic${l < 5 ? ` → +${(l + 1) * 12}%` : ''}.` },
  { id: 'showroom', name: 'Luxury Showroom', icon: '💎', base: 600, mult: 2, desc: l => `Premium displays: shoppers pay up to +${l * 6}% more${l < 5 ? ` → +${(l + 1) * 6}%` : ''}.` }
];
const dockCapFor = l => [4, 6, 8, 11, 14, 18][l];
const shelfCapFor = l => 8 + l * 2;
const deliveryFor = l => [20, 16, 13, 10, 7, 4][l];
const autoSellFor = l => [0, 40, 32, 25, 18, 12][l];
const trackPrice = (t, l) => Math.round(t.base * Math.pow(t.mult, l) / 10) * 10;

const CURB = [
  { id: 'repair', name: 'Repair Storefront', price: 200, desc: 'Pull the boards off the windows, patch the walls, and fix the flickering bulb.', traffic: 0.08 },
  { id: 'metal', name: 'Metal Sign', price: 250, desc: 'A proper metal shop sign. People can finally read your store name.', traffic: 0.10, needs: 'repair' },
  { id: 'neon', name: 'Glowing Neon Sign', price: 750, desc: 'A glowing neon sign that pulls in night shoppers.', traffic: 0.15, needs: 'metal' },
  { id: 'billboard', name: 'Giant Rooftop Billboard', price: 2000, desc: 'A massive billboard on the roof. The whole block knows your name.', traffic: 0.22, needs: 'neon' },
  { id: 'busstop', name: 'Bus Stop', price: 600, desc: 'Adds a bus stop out front. Each bus drops off extra shoppers.', traffic: 0.08 },
  { id: 'parking', name: 'Parking Lot', price: 1200, desc: 'Paves a parking lot next door so drivers stop by.', traffic: 0.14 }
];
const STAFF = [
  { id: 'cashier', name: 'AI Cashier', price: 900, desc: 'Runs checkout whenever you step away from the register.' },
  { id: 'restocker', name: 'AI Restocker', price: 700, desc: 'Carries delivery boxes to matching shelves and stocks them.' }
];
const PERKS = [
  { id: 'speed', name: 'Faster Walk Speed', max: 3, base: 150, mult: 2.2, desc: l => `Walk ${Math.round(l * 15)}% faster${l < 3 ? ` → ${Math.round((l + 1) * 15)}%` : ''}.` },
  { id: 'carry', name: 'Multi-Box Carry', max: 2, base: 300, mult: 2.5, desc: l => `Carry ${l + 1} box${l ? 'es' : ''} at once${l < 2 ? ` → ${l + 2}` : ''}.` },
  { id: 'scanner', name: 'Fast Scanner', max: 1, base: 300, mult: 1, desc: () => 'Each scan grabs 2 items and the card terminal auto-fills the total.' }
];

/* ---------- Decorate options ---------- */
const DECOR = {
  walls: { label: 'Walls', opts: [['Rundown Plaster', 0], ['Brick', 120], ['Seafoam Studs', 90], ['Clean White Studs', 150], ['Midnight Panels', 240]] },
  floor: { label: 'Floor', opts: [['Dirty Concrete', 0], ['Checkerboard', 100], ['Terrazzo', 180], ['Oak Planks', 140], ['Neon Grid', 260]] },
  lights: { label: 'Lights', opts: [['Flickering Bulb', 0], ['Warm Track Lights', 90], ['Cool LED Strips', 120], ['Party Neon', 200]] },
  sign: { label: 'Sign Style', opts: [['Painted Plank', 0], ['Retro Neon', 150], ['Gold Lettering', 220], ['Ice Chrome', 260]] }
};

/* ---------- Aura ranks ---------- */
const RANKS = [
  { name: 'Broke Larp', need: 0 }, { name: 'Aura Farmer', need: 100 }, { name: 'Dripmaxxer', need: 400 }, { name: 'Profitmaxxer', need: 1200 }
];
const rankOf = a => { let r = 0; RANKS.forEach((x, i) => { if (a >= x.need) r = i; }); return r; };

/* ---------- Trophies & milestones ---------- */
const TROPHIES = [
  { id: 'first', name: 'First Sale', desc: 'Complete your first checkout.', color: 0xcd7f32, test: s => s.stats.sold >= 1 },
  { id: 'k1', name: '$1,000 Profit', desc: 'Earn $1,000 in lifetime profit.', color: 0xc0c0c0, test: s => s.stats.profit >= 1000 },
  { id: 'c100', name: '100 Customers Served', desc: 'Serve 100 customers.', color: 0xffd700, test: s => s.stats.customers >= 100 },
  { id: 'aura', name: 'Max Aura Tier', desc: 'Reach Profitmaxxer rank.', color: 0xb46bff, test: s => s.aura >= RANKS[3].need },
  { id: 'viral', name: 'Viral Hit', desc: 'Trigger a Viral Rush from an influencer.', color: 0xff3dbb, test: s => s.stats.viral >= 1 },
  { id: 'corner', name: 'Corner Shop', desc: 'Expand to the Corner Shop.', color: 0x35e7ff, test: s => s.tier >= 1 },
  { id: 'calm', name: 'Calm Under Pressure', desc: 'Beat a Rival Inspector checkout.', color: 0x4dff88, test: s => s.stats.calm >= 1 },
  { id: 'clean', name: 'Clean Freak', desc: 'Clean up 10 pieces of trash.', color: 0x9cf5c2, test: s => s.stats.trash >= 10 },
  { id: 'k10', name: '$10,000 Profit', desc: 'Earn $10,000 in lifetime profit.', color: 0xffe66d, test: s => s.stats.profit >= 10000 },
  { id: 'mall', name: 'Mega Mall Mogul', desc: 'Expand to the Mega Mall.', color: 0xff9f1c, test: s => s.tier >= 3 }
];

/* ---------- 2023–2026 slang ---------- */
const SLANG = {
  enterRundown: ['Store looks chopped, unc decor.', 'This shop is giving Ohio.', 'Lowkey cooked in here ngl.', 'Bro decorated with brainrot.', 'The ick… but the prices tho?', 'Chat, is this place real?'],
  enterMid: ['Okay, you locked in.', 'No cap, this is clean.', 'It’s giving glow-up.', 'Mid but improving fr.', 'Lowkey kinda bussin.', 'Unc finally renovated.'],
  enterNice: ['This shop has aura.', 'Main character store fr.', 'The vibes? Immaculate.', 'Not glazing, this is fire.', 'Store understood the assignment.', 'This place ate and left no crumbs.'],
  enterLux: ['Elite aura, no notes.', 'This flagship ate.', 'I fear you cleared.', 'Mogging every store on the block.', 'Standing on business with this decor.', 'That’s tuff. Absolute cinema.'],
  noStock: ['Bro is really aura farming with empty shelves.', 'No stock? This shop is cooked.', 'Restock soon or I’m gonna crash out.', 'Empty shelves = NPC behavior.', 'Where the drip at? -100 aura.'],
  highPrice: ['Stop glazing the price tag, pure rage bait.', 'You’re delulu if you think I’m paying that.', 'That price is lowkey a scam.', 'Fanum tax on the price is crazy.', 'Bombastic side eye at this price.', 'Nah this is rage bait fr.'],
  deal: ['W rizz, very demure, very mindful.', 'Copped a fire dupe, zero aura lost.', 'This fit is dripmaxxing.', 'Let him cook, these prices slap.', 'Say less, I’m buying.', 'This deal is so tuff.'],
  fair: ['Fair price, I respect it.', 'Bet. Adding to cart.', 'It’s giving fair.', 'Lowkey a W.', 'Okay this is reasonable.'],
  waiting: ['Bro is the line even moving?', 'I’m about to crash out.', 'Is the cashier an NPC?', 'Waiting like a side quest.', 'Six seven minutes later…'],
  angry: ['I’m crashing out. Bye.', 'Zero aura experience. I’m out.', 'Cooked. Leaving.', 'This line is rage bait.'],
  happy: ['W store. Coming back.', 'Aura +1000.', 'That checkout was smooth fr.', 'Slay. See you next drop.', 'Bussin. 10/10.'],
  influencer: ['Hey besties, live from the hottest resell spot!', 'Chat, is this store bussin?', 'Rating this store for the algorithm…', 'POV: you found the plug.'],
  hypebeast: ['Got any grails? I pay big.', 'Only rare heat, no bricks.', 'Limited pairs or I’m out.', 'Show me the heat, I’m tipping.'],
  inspector: ['Rival inspector here. Make it quick.', 'Let’s see if you fumble.', 'Your register skills? Mid probably.', 'Prove you’re not an NPC.'],
  trash: ['Who left trash here? The ick.', 'Floor is giving dumpster.', 'Clean-up on aisle cooked.']
};
const REVIEWS = {
  5: ['Store totally mogged the competition.', 'Ate and left no crumbs. 10/10.', 'Owner is locked in. Elite aura.', 'Copped heat at fair prices. W store.', 'Main character shopping experience.'],
  4: ['Lowkey fire. Prices were fair.', 'Solid W. Would cop again.', 'Clean store, good drip, minor wait.', 'It’s giving glow-up era.'],
  3: ['6-7/10, mid selection.', 'Mid. Not cooked, not cooking.', 'Mid but the potential is there.', 'Decent but the shelves need more drip.'],
  2: ['Prices kinda rage bait ngl.', 'Unc decor, slow line.', 'Shelves looking chopped.', 'Gave me the ick a little.'],
  1: ['Owner is delulu with these prices.', 'Actually crashed out waiting for the register.', 'Absolute brain rot experience.', 'No stock. Store is cooked.', 'Zero aura. Never again.']
};
const HANDLES = ['@sk8rkid', '@dripcheck', '@lowkey.lana', '@unc.mike', '@sigma_steve', '@npc.nina', '@thriftqueen', '@rizzler99', '@aura_amy', '@cooked.carl', '@demure.dani', '@mogger.max', '@sixseven', '@brainrot.ben', '@pookie.p', '@clutch.chloe'];

/* ---------- Random events ---------- */
const EVENTS = [
  { id: 'influencer', name: 'TikTok Influencer incoming', desc: '@dripmaxxer_live is coming. Sell at a fair price for a Viral Rush.', dur: 75, vip: 'influencer', weight: 3 },
  { id: 'hypebeast', name: 'Hypebeast spotted', desc: 'A sneakerhead pays up to 2.5x market for rare items, plus tips.', dur: 75, vip: 'hypebeast', weight: 3 },
  { id: 'inspector', name: 'Rival Inspector', desc: 'The “Rage Baiter” is coming. Fast, mistake-free checkout earns a bonus.', dur: 75, vip: 'inspector', weight: 2 },
  { id: 'drop', name: 'Sneaker Drop Hype', desc: 'Sneakers are trending: +50% market value.', dur: 60, weight: 2 },
  { id: 'flash', name: 'Flash Sale Frenzy', desc: '2x shopper traffic.', dur: 45, weight: 2 },
  { id: 'discount', name: 'Supplier Discount', desc: '30% off all laptop orders.', dur: 60, weight: 2 },
  { id: 'trash', name: 'Messy floor', desc: 'Someone trashed the floor. Clean up for +$15 and +5 Aura each.', dur: 50, weight: 2 }
];

/* ---------- Controller actions ---------- */
const ACTIONS = [
  { id: 'interact', name: 'Interact / Jump', def: 0, key: 'E' },
  { id: 'useTool', name: 'Use Tool / Scan', def: 7, key: 'Click' },
  { id: 'pickDrop', name: 'Pick Up / Drop', def: 6, key: 'G' },
  { id: 'laptop', name: 'Quick Laptop', def: 3, key: 'Tab' },
  { id: 'flaps', name: 'Box Flaps / Rotate', def: 2, key: 'F' },
  { id: 'cancel', name: 'Drop / Cancel', def: 1, key: 'Q' },
  { id: 'nextTool', name: 'Next Hotbar', def: 5, key: 'Wheel' },
  { id: 'prevTool', name: 'Prev Hotbar', def: 4, key: 'Wheel' },
  { id: 'fullscreen', name: 'Toggle Fullscreen', def: 12, key: 'F11' },
  { id: 'pause', name: 'Pause / Settings', def: 9, key: 'Esc' },
  { id: 'skip', name: 'Skip Tutorial', def: 8, key: 'K' },
  { id: 'camera', name: 'Toggle Camera', def: 11, key: 'V' }
];
const BTN_LABELS = {
  xbox: ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'View', 'Menu', 'LS', 'RS', 'D↑', 'D↓', 'D←', 'D→', 'Xbox'],
  ps: ['✕', '○', '□', '△', 'L1', 'R1', 'L2', 'R2', 'Create', 'Options', 'L3', 'R3', 'D↑', 'D↓', 'D←', 'D→', 'PS'],
  switch: ['B', 'A', 'Y', 'X', 'L', 'R', 'ZL', 'ZR', '−', '+', 'LS', 'RS', 'D↑', 'D↓', 'D←', 'D→', 'Home']
};
const BTN_CLASS = { xbox: ['xa', 'xb', 'xx', 'xy'], ps: ['pc', 'po', 'ps', 'pt'], switch: ['sb', 'sa', 'sy', 'sx'] };
const TOOLS = [
  { id: 'hands', name: 'Hands', icon: '✋' }, { id: 'scanner', name: 'Scanner', icon: '📟' },
  { id: 'paint', name: 'Paint', icon: '🎨' }, { id: 'grabber', name: 'Grabber', icon: '🧲' }
];
const PRESETS = {
  Low: { pr: 0.75, shadows: false, shadowSize: 512, distance: 45, props: 0 },
  Medium: { pr: 1, shadows: true, shadowSize: 1024, distance: 70, props: 1 },
  High: { pr: 1.5, shadows: true, shadowSize: 2048, distance: 110, props: 2 }
};
const DAY_LEN = 480; // real seconds per in-game day

/* ---------- Game state, settings, persistence ---------- */
function freshState() {
  return {
    v: VERSION, cash: 250, aura: 0, tier: 0, day: 1, time: DAY_LEN * 0.06,
    licenses: [true, false, false, false, false],
    tracks: Object.fromEntries(TRACKS.map(t => [t.id, 0])),
    curb: Object.fromEntries(CURB.map(c => [c.id, false])),
    staff: { cashier: false, restocker: false },
    perks: { speed: 0, carry: 0, scanner: 0 },
    decor: { walls: 0, floor: 0, lights: 0, sign: 0 },
    owned: { walls: [0], floor: [0], lights: [0], sign: [0] },
    prices: PRODUCTS.map(p => p.value),
    basis: PRODUCTS.map(p => p.cost),
    shelves: Array.from({ length: 18 }, () => ({ p: -1, n: 0 })),
    dock: [], floorBoxes: [], carry: [], orders: [],
    open: false, tool: 0,
    stats: { sold: 0, profit: 0, earned: 0, customers: 0, highest: 0, viral: 0, calm: 0, trash: 0, online: 0, walkouts: 0 },
    reviews: [], trophies: [], tutorial: 0, introSeen: false,
    lastSave: Date.now(), boostDay: 0, dailyDay: 0,
    arcade: false, goldShelves: false, outfit: { ...DEFAULT_OUTFIT }, wardrobe: [], rebirths: 0, district: 0, runBase: 0, stonks: freshStonks()
  };
}
function sanitizeState(raw) {
  const s = freshState();
  if (!raw || typeof raw !== 'object') return s;
  const num = (v, d, a = -1e12, b = 1e12) => (typeof v === 'number' && isFinite(v)) ? clamp(v, a, b) : d;
  s.cash = num(raw.cash, s.cash, -1e9); s.aura = num(raw.aura, 0); s.tier = Math.round(num(raw.tier, 0, 0, 3));
  s.day = Math.round(num(raw.day, 1, 1)); s.time = num(raw.time, s.time, 0, DAY_LEN);
  if (Array.isArray(raw.licenses)) s.licenses = LICENSES.map((_, i) => i === 0 || !!raw.licenses[i]);
  TRACKS.forEach(t => s.tracks[t.id] = Math.round(num(raw.tracks?.[t.id], 0, 0, 5)));
  CURB.forEach(c => s.curb[c.id] = !!raw.curb?.[c.id]);
  STAFF.forEach(c => s.staff[c.id] = !!raw.staff?.[c.id]);
  PERKS.forEach(p => s.perks[p.id] = Math.round(num(raw.perks?.[p.id], 0, 0, p.max)));
  Object.keys(DECOR).forEach(k => {
    const n = DECOR[k].opts.length;
    s.owned[k] = Array.isArray(raw.owned?.[k]) ? [...new Set([0, ...raw.owned[k].filter(i => Number.isInteger(i) && i >= 0 && i < n)])] : [0];
    const d = Math.round(num(raw.decor?.[k], 0, 0, n - 1)); s.decor[k] = s.owned[k].includes(d) ? d : 0;
  });
  if (Array.isArray(raw.prices)) s.prices = PRODUCTS.map((p, i) => Math.round(num(raw.prices[i], p.value, 1, p.value * 3)));
  if (Array.isArray(raw.basis)) s.basis = PRODUCTS.map((p, i) => num(raw.basis[i], p.cost, 0, p.value * 3));
  const box = b => b && Number.isInteger(b.p) && PRODUCTS[b.p] ? { p: b.p, n: Math.round(num(b.n, 0, 0, PRODUCTS[b.p].per)), open: !!b.open } : null;
  if (Array.isArray(raw.shelves)) raw.shelves.slice(0, 18).forEach((sh, i) => { if (sh && Number.isInteger(sh.p) && (sh.p === -1 || PRODUCTS[sh.p])) s.shelves[i] = { p: sh.p, n: Math.round(num(sh.n, 0, 0, 18)) }; });
  if (Array.isArray(raw.dock)) s.dock = raw.dock.map(box).filter(Boolean).slice(0, 18);
  if (Array.isArray(raw.carry)) s.carry = raw.carry.map(box).filter(Boolean).slice(0, 3);
  if (Array.isArray(raw.floorBoxes)) s.floorBoxes = raw.floorBoxes.map(b => { const x = box(b); return x && { ...x, x: num(b.x, 0, -40, 40), y: num(b.y, 0, 0, 5), z: num(b.z, 2, -15, 25) }; }).filter(Boolean).slice(0, 30);
  if (Array.isArray(raw.orders)) s.orders = raw.orders.filter(o => o && PRODUCTS[o.p]).map(o => ({ p: o.p, boxes: Math.round(num(o.boxes, 1, 1, 20)), t: num(o.t, 0, 0, 60) })).slice(0, 12);
  s.open = !!raw.open; s.tool = Math.round(num(raw.tool, 0, 0, 3));
  Object.keys(s.stats).forEach(k => s.stats[k] = num(raw.stats?.[k], 0, 0));
  if (Array.isArray(raw.reviews)) s.reviews = raw.reviews.filter(r => r && typeof r.text === 'string').slice(0, 40).map(r => ({ h: String(r.h || '@shopper').slice(0, 24), stars: Math.round(num(r.stars, 3, 1, 5)), text: r.text.slice(0, 120), day: Math.round(num(r.day, 1, 1)) }));
  if (Array.isArray(raw.trophies)) s.trophies = raw.trophies.filter(id => TROPHIES.some(t => t.id === id));
  s.tutorial = Math.round(num(raw.tutorial, 0, -1, 7)); s.introSeen = !!raw.introSeen;
  s.lastSave = num(raw.lastSave, Date.now(), 0, Date.now()); s.boostDay = num(raw.boostDay, 0); s.dailyDay = num(raw.dailyDay, 0);
  s.arcade = !!raw.arcade; s.goldShelves = !!raw.goldShelves;
  s.rebirths = Math.round(num(raw.rebirths, 0, 0, 999)); s.district = Math.min(DISTRICTS.length - 1, Math.round(num(raw.district, s.rebirths, 0, 99)));
  s.runBase = num(raw.runBase, 0, 0, s.stats.earned);
  if (Array.isArray(raw.wardrobe)) s.wardrobe = [...new Set(raw.wardrobe.filter(k => typeof k === 'string' && k.includes(':') && dripItem(...k.split(':'))))];
  DRIP.forEach(c => { const v = raw.outfit?.[c.id], it = typeof v === 'string' && dripItem(c.id, v); s.outfit[c.id] = it && dripOwned(s, c.id, it) ? v : DEFAULT_OUTFIT[c.id]; });
  s.stonks = sanitizeStonks(raw.stonks);
  return s;
}
function loadSaved() {
  const txt = LS.get(SAVE_KEY);
  if (!txt) return null;
  try { return sanitizeState(JSON.parse(txt)); } catch (e) { return null; }
}
function encodeSave(s) { return 'RT3.' + btoa(unescape(encodeURIComponent(JSON.stringify(s)))); }
function decodeSave(code) {
  code = String(code || '').trim();
  try {
    if (code.startsWith('RT3.')) return sanitizeState(JSON.parse(decodeURIComponent(escape(atob(code.slice(4))))));
    if (/^RT[12]\./.test(code)) { // legacy codes: carry over cash, shop level and aura
      const d = JSON.parse(atob(code.slice(4)));
      if (!Array.isArray(d)) return null;
      const s = freshState();
      s.cash = clamp(Number(d[0]) || 0, 0, 1e7);
      s.tier = clamp((Number(d[1]) || 1) - 1, 0, 3);
      s.aura = clamp(Number(d[19]) || 0, 0, 1e6);
      s.tutorial = 7; s.introSeen = true; s.curb.repair = s.tier > 0;
      return s;
    }
  } catch (e) {}
  return null;
}
function defaultSettings() {
  return {
    preset: 'Medium', shadows: true, distance: 70, fps: false, adaptive: true, labels: true,
    sens: 1, invertY: false, third: false, fov: 72,
    master: 0.8, music: 0.45, sfx: 0.8, muted: false
  };
}
function defaultControls() {
  return { style: 'auto', sens: 1.4, deadzone: 0.15, invertY: false, rumble: true, aimAssist: true, map: Object.fromEntries(ACTIONS.map(a => [a.id, a.def])) };
}
function loadJSON(key, def) {
  const d = def();
  try { const v = JSON.parse(LS.get(key) || 'null'); if (v && typeof v === 'object') { Object.keys(d).forEach(k => { if (k in v && typeof v[k] === typeof d[k]) d[k] = k === 'map' ? { ...d.map, ...v.map } : v[k]; }); } } catch (e) {}
  return d;
}

/* ---------- Procedural Web Audio SoundManager (zero files) ---------- */
class SoundManager {
  constructor(settings) { this.s = settings; this.ctx = null; this.night = false; this.timer = 0; this.step = 0; this.nextT = 0; this.running = false; }
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
      try { this.ctx = new AC(); } catch (e) { return false; }
      const c = this.ctx;
      this.master = c.createGain(); this.master.connect(c.destination);
      this.musicBus = c.createGain(); this.sfxBus = c.createGain();
      this.musicLP = c.createBiquadFilter(); this.musicLP.type = 'lowpass'; this.musicLP.frequency.value = 2400;
      this.musicBus.connect(this.musicLP); this.musicLP.connect(this.master); this.sfxBus.connect(this.master);
      const len = c.sampleRate; this.noise = c.createBuffer(1, len, c.sampleRate);
      const d = this.noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.apply();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return true;
  }
  apply() {
    if (!this.ctx) return; const t = this.ctx.currentTime, s = this.s;
    this.master.gain.setTargetAtTime(s.muted ? 0 : s.master, t, 0.05);
    this.musicBus.gain.setTargetAtTime(s.music * 0.55, t, 0.1);
    this.sfxBus.gain.setTargetAtTime(s.sfx, t, 0.05);
  }
  tone(freq, dur, { type = 'sine', vol = 0.3, at = 0, attack = 0.005, slide = 0, bus } = {}) {
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime + at;
    const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus || this.sfxBus); o.start(t); o.stop(t + dur + 0.05);
  }
  noiseHit(dur, { vol = 0.3, at = 0, freq = 1200, q = 0.8, type = 'bandpass', bus, sweep = 0 } = {}) {
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime + at;
    const src = c.createBufferSource(); src.buffer = this.noise; const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweep) f.frequency.exponentialRampToValueAtTime(freq * sweep, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(bus || this.sfxBus); src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
  }
  play(name) {
    if (!this.ensure()) return;
    switch (name) {
      case 'beep': this.tone(1850, 0.09, { type: 'square', vol: 0.12 }); break;
      case 'cash': this.tone(2093, 0.25, { type: 'triangle', vol: 0.18 }); this.tone(2637, 0.4, { type: 'triangle', vol: 0.16, at: 0.08 }); this.noiseHit(0.12, { vol: 0.15, freq: 5000, at: 0.02 }); this.tone(3136, 0.5, { type: 'sine', vol: 0.1, at: 0.16 }); break;
      case 'thud': this.tone(120, 0.18, { type: 'sine', vol: 0.4, slide: 0.5 }); this.noiseHit(0.12, { vol: 0.25, freq: 300, type: 'lowpass' }); break;
      case 'pop': this.tone(520, 0.09, { type: 'sine', vol: 0.22, slide: 2 }); break;
      case 'ding': this.tone(659, 0.7, { type: 'sine', vol: 0.22 }); this.tone(523, 0.9, { type: 'sine', vol: 0.22, at: 0.35 }); break;
      case 'click': this.tone(900, 0.04, { type: 'square', vol: 0.06 }); break;
      case 'hover': this.tone(1300, 0.03, { type: 'sine', vol: 0.04 }); break;
      case 'error': this.tone(180, 0.22, { type: 'sawtooth', vol: 0.1 }); this.tone(150, 0.22, { type: 'sawtooth', vol: 0.08, at: 0.1 }); break;
      case 'buy': [523, 659, 784].forEach((f, i) => this.tone(f, 0.18, { type: 'triangle', vol: 0.16, at: i * 0.06 })); break;
      case 'fanfare': [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, i > 3 ? 0.5 : 0.16, { type: 'triangle', vol: 0.17, at: i * 0.11 })); break;
      case 'event': [784, 988, 1175].forEach((f, i) => this.tone(f, 0.22, { type: 'square', vol: 0.07, at: i * 0.09 })); break;
      case 'whoosh': this.noiseHit(0.35, { vol: 0.2, freq: 400, sweep: 6, q: 1.2 }); break;
      case 'open': this.noiseHit(0.18, { vol: 0.18, freq: 900, sweep: 0.5 }); this.tone(300, 0.1, { type: 'triangle', vol: 0.08 }); break;
      case 'jump': this.tone(330, 0.12, { type: 'square', vol: 0.06, slide: 1.8 }); break;
      case 'trophy': [784, 1047, 1319, 1568].forEach((f, i) => this.tone(f, 0.4, { type: 'sine', vol: 0.15, at: i * 0.08 })); break;
      case 'spray': this.noiseHit(0.5, { vol: 0.16, freq: 4000, q: 0.5 }); break;
      case 'coin': this.tone(1568, 0.08, { type: 'square', vol: 0.06 }); this.tone(2093, 0.2, { type: 'square', vol: 0.06, at: 0.07 }); break;
    }
  }
  /* lo-fi loop: chords + bass + soft drums + vinyl crackle; swaps to a moodier set at night */
  startMusic() { if (this.running) return; if (!this.ensure()) return; this.running = true; this.nextT = this.ctx.currentTime + 0.1; this.step = 0; this.timer = setInterval(() => this.schedule(), 60); }
  stopMusic() { this.running = false; clearInterval(this.timer); }
  setNight(n) { if (n === this.night) return; this.night = n; if (this.ctx) this.musicLP.frequency.setTargetAtTime(n ? 1300 : 2400, this.ctx.currentTime, 1); }
  schedule() {
    if (!this.ctx || !this.running) return;
    const bpm = this.night ? 68 : 80, sp = 60 / bpm / 2; // eighth notes
    const DAY = [[65.4, [261.6, 329.6, 392, 493.9]], [55, [220, 261.6, 329.6, 392]], [58.3, [233.1, 293.7, 349.2, 440]], [49, [196, 246.9, 293.7, 349.2]]];
    const NIGHT = [[55, [220, 261.6, 329.6, 392]], [43.7, [174.6, 220, 261.6, 329.6]], [49, [196, 246.9, 293.7, 370]], [41.2, [164.8, 207.7, 246.9, 293.7]]];
    while (this.nextT < this.ctx.currentTime + 0.25) {
      const t = this.nextT - this.ctx.currentTime, st = this.step % 32, bar = Math.floor(this.step / 8) % 4, ch = (this.night ? NIGHT : DAY)[bar], mb = this.musicBus;
      if (st % 8 === 0) { ch[1].forEach((f, i) => this.tone(f, sp * 7.5, { type: 'triangle', vol: 0.035, at: t + i * 0.012, attack: 0.08, bus: mb })); this.tone(ch[0], sp * 3, { type: 'sine', vol: 0.18, at: t, attack: 0.02, bus: mb }); }
      if (st % 8 === 5) this.tone(ch[0] * 1.5, sp * 2, { type: 'sine', vol: 0.1, at: t, bus: mb });
      if (st % 4 === 0) this.tone(110, 0.22, { type: 'sine', vol: this.night ? 0.16 : 0.22, at: t, slide: 0.35, bus: mb });
      if (st % 8 === 4) this.noiseHit(0.16, { vol: 0.06, freq: 1800, at: t, bus: mb });
      if (st % 2 === 1 && !this.night) this.noiseHit(0.05, { vol: 0.025, freq: 7000, at: t, type: 'highpass', bus: mb });
      if (st % 16 === 10) { const mel = ch[1][randi(1, 3)] * 2; this.tone(mel, sp * 2.5, { type: 'sine', vol: 0.04, at: t, attack: 0.03, bus: mb }); }
      if (Math.random() < 0.3) this.noiseHit(0.02, { vol: 0.012, freq: 3000, at: t + Math.random() * sp, type: 'highpass', bus: mb });
      this.nextT += sp; this.step++;
    }
  }
  destroy() { this.stopMusic(); try { this.ctx?.close(); } catch (e) {} this.ctx = null; }
}

/* ---------- GamepadManager (HTML5 Gamepad API) ---------- */
function detectBrand(id) {
  id = String(id || '').toLowerCase();
  if (/xbox|045e|xinput|microsoft/.test(id)) return 'xbox';
  if (/057e|nintendo|pro controller|joy-con|switch/.test(id)) return 'switch';
  if (/054c|playstation|dualsense|dualshock|ps4|ps5|^wireless controller/.test(id)) return 'ps';
  return 'generic';
}
const BRAND_NAME = { ps: 'PlayStation', switch: 'Nintendo Switch', xbox: 'Xbox', generic: 'Generic' };
class GamepadManager {
  constructor(ctrl, hooks) {
    this.c = ctrl; this.hooks = hooks; this.cur = []; this.prev = []; this.vals = []; this.pad = null; this.id = ''; this.brand = 'xbox';
    this.lx = 0; this.ly = 0; this.rx = 0; this.ry = 0; this.listen = null; this.known = new Set(); this.blocked = false;
    this.onConn = e => this.connected(e.gamepad); this.onDis = e => { if (this.pad && e.gamepad.index === this.pad.index) { this.pad = null; this.cur = []; } this.known.delete(e.gamepad.id + e.gamepad.index); this.hooks.toast?.(`🎮 Controller disconnected`, "warn"); this.hooks.change?.(); this.hooks.lost?.(); };
    window.addEventListener('gamepadconnected', this.onConn); window.addEventListener('gamepaddisconnected', this.onDis);
  }
  connected(gp) {
    if (!gp) return; const key = gp.id + gp.index; if (this.known.has(key)) return; this.known.add(key);
    this.brand = detectBrand(gp.id); this.id = gp.id;
    this.hooks.toast?.(`🎮 Controller Connected: ${BRAND_NAME[this.brand]}`, 'good'); this.hooks.change?.();
  }
  get style() { return this.c.style === 'auto' ? (this.brand === 'generic' ? 'xbox' : this.brand) : this.c.style; }
  label(i) { return (BTN_LABELS[this.style] || BTN_LABELS.xbox)[i] ?? `B${i}`; }
  cls(i) { return (BTN_CLASS[this.style] || BTN_CLASS.xbox)[i] || ''; }
  poll() {
    let pads = [];
    try { pads = navigator.getGamepads ? [...navigator.getGamepads()] : []; this.blocked = false; } catch (e) { this.blocked = true; pads = []; }
    let pad = null;
    if (this.pad) pad = pads.find(p => p && p.index === this.pad.index && p.connected);
    if (!pad) pad = pads.find(p => p && p.connected && p.buttons && p.buttons.length >= 4) || null;
    if (pad && (!this.pad || pad.index !== this.pad.index)) this.connected(pad);
    if (!pad && this.pad) { this.known.delete(this.pad.id + this.pad.index); this.hooks.toast?.(`🎮 Controller disconnected`, 'warn'); this.hooks.change?.(); this.hooks.lost?.(); }
    this.pad = pad; this.prev = this.cur;
    if (!pad) { this.cur = []; this.vals = []; this.lx = this.ly = this.rx = this.ry = 0; return false; }
    this.cur = pad.buttons.map(b => b.pressed || b.value > 0.5); this.vals = pad.buttons.map(b => b.value);
    const dz = this.c.deadzone, stick = (x, y) => { const m = Math.hypot(x, y); if (m < dz) return [0, 0]; const s = Math.min(1, (m - dz) / (1 - dz)) / m; return [x * s, y * s]; };
    [this.lx, this.ly] = stick(pad.axes[0] || 0, pad.axes[1] || 0);
    [this.rx, this.ry] = stick(pad.axes[2] || 0, pad.axes[3] || 0);
    { const nb = this.cur.findIndex((b, i) => b && !this.prev[i]); if (nb >= 0) { this.lastBtn = nb; this.lastBtnT = performance.now(); } }
    const active = this.cur.some((b, i) => b && !this.prev[i]) || Math.hypot(this.lx, this.ly) > 0.2 || Math.hypot(this.rx, this.ry) > 0.2;
    if (active) this.hooks.activity?.();
    if (this.listen) {
      const i = this.cur.findIndex((b, k) => b && !this.prev[k]);
      if (i >= 0) { const cb = this.listen; this.listen = null; cb(i); this.prev = this.cur.slice(); this.swallow = true; }
    }
    return true;
  }
  down(i) { return !!this.cur[i]; }
  pressed(i) { return !!this.cur[i] && !this.prev[i]; }
  released(i) { return !this.cur[i] && !!this.prev[i]; }
  bind(a) { return this.c.map[a] ?? ACTIONS.find(x => x.id === a)?.def; }
  act(a) { return this.down(this.bind(a)); }
  actPressed(a) { return this.pressed(this.bind(a)); }
  actReleased(a) { return this.released(this.bind(a)); }
  get canRumble() { const p = this.pad; if (!p) return false; try { return !!((p.vibrationActuator && typeof p.vibrationActuator.playEffect === 'function') || (p.hapticActuators && p.hapticActuators[0] && typeof p.hapticActuators[0].pulse === 'function')); } catch (e) { return false; } }
  /* Feature-detected + try/catch: browsers, iframes or pads without rumble never throw. Returns true if a rumble was sent. */
  rumble(strong = 0.4, ms = 80, force = false) {
    if ((!this.c.rumble && !force) || !this.pad) return false;
    try {
      const p = this.pad, va = p.vibrationActuator;
      if (va && typeof va.playEffect === 'function') {
        const type = (Array.isArray(va.effects) && va.effects.length && !va.effects.includes('dual-rumble')) ? va.effects[0] : 'dual-rumble';
        const r = va.playEffect(type, { startDelay: 0, duration: ms, strongMagnitude: Math.min(1, strong), weakMagnitude: Math.min(1, strong + 0.2) });
        if (r && typeof r.catch === 'function') r.catch(() => {});
        return true;
      }
      const h = p.hapticActuators && p.hapticActuators[0];
      if (h && typeof h.pulse === 'function') { const r = h.pulse(Math.min(1, strong), ms); if (r && typeof r.catch === 'function') r.catch(() => {}); return true; }
    } catch (e) {}
    return false;
  }

  destroy() { window.removeEventListener('gamepadconnected', this.onConn); window.removeEventListener('gamepaddisconnected', this.onDis); }
}

/* ---------- Procedural textures ---------- */
let G = null; // active game context
function canvasTex(size, draw, repeat = true) {
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); draw(g, size);
  const t = new THREE.CanvasTexture(c); if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function seeded(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function studs(g, n, base, hi, lo, count = 4) {
  g.fillStyle = base; g.fillRect(0, 0, n, n); const st = n / count;
  for (let y = 0; y < count; y++) for (let x = 0; x < count; x++) {
    const cx = x * st + st / 2, cy = y * st + st / 2, r = st * 0.3;
    g.fillStyle = lo; g.beginPath(); g.arc(cx + 1.5, cy + 2, r, 0, 7); g.fill();
    g.fillStyle = hi; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
    g.fillStyle = base; g.beginPath(); g.arc(cx + 0.6, cy + 0.6, r * 0.72, 0, 7); g.fill();
  }
  g.strokeStyle = lo; g.globalAlpha = 0.35; g.lineWidth = 1; g.strokeRect(0.5, 0.5, n - 1, n - 1); g.globalAlpha = 1;
}
function makeTextures() {
  const T = {};
  T.studs = canvasTex(128, (g, n) => studs(g, n, '#d8d8d8', '#f4f4f4', '#9c9c9c'));
  T.grass = canvasTex(128, (g, n) => studs(g, n, '#4caf50', '#66cc66', '#2f7d33'));
  T.plaster = canvasTex(256, (g, n) => {
    const r = seeded(7); g.fillStyle = '#b9ad94'; g.fillRect(0, 0, n, n);
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${r() > .5 ? '90,70,40' : '255,250,230'},${r() * 0.12})`; const s = r() * 30 + 4; g.fillRect(r() * n, r() * n, s, s * r()); }
    for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(80,60,30,${0.08 + r() * 0.12})`; g.beginPath(); g.ellipse(r() * n, r() * n, 20 + r() * 40, 10 + r() * 30, r() * 3, 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(50,40,30,.55)'; g.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) { g.beginPath(); let x = r() * n, y = r() * n; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - .5) * 30; y += r() * 22; g.lineTo(x, y); } g.stroke(); }
  });
  T.brick = canvasTex(256, (g, n) => {
    const r = seeded(3); g.fillStyle = '#e8d8c4'; g.fillRect(0, 0, n, n); const bh = n / 8, bw = n / 4;
    for (let y = 0; y < 8; y++) for (let x = -1; x < 5; x++) {
      const ox = (y % 2) * bw / 2; const c = [176 + r() * 30, 66 + r() * 20, 48 + r() * 14];
      g.fillStyle = `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`; g.fillRect(x * bw + ox + 3, y * bh + 3, bw - 6, bh - 6);
      g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x * bw + ox + 3, y * bh + 3, bw - 6, 3);
    }
  });
  T.seafoam = canvasTex(128, (g, n) => studs(g, n, '#7fd6c0', '#a6efdc', '#4fa892'));
  T.white = canvasTex(128, (g, n) => studs(g, n, '#f1f3f7', '#ffffff', '#c3c8d3'));
  T.panels = canvasTex(128, (g, n) => { g.fillStyle = '#1d2140'; g.fillRect(0, 0, n, n); g.fillStyle = '#272c55'; g.fillRect(4, 4, n / 2 - 8, n - 8); g.fillRect(n / 2 + 4, 4, n / 2 - 8, n - 8); g.fillStyle = '#7f6bff'; g.fillRect(0, n - 4, n, 4); });
  T.concrete = canvasTex(256, (g, n) => { const r = seeded(11); g.fillStyle = '#8f8a82'; g.fillRect(0, 0, n, n); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${r() > .5 ? '40,35,30' : '255,255,255'},${r() * 0.1})`; g.fillRect(r() * n, r() * n, 2 + r() * 5, 2 + r() * 5); } for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(60,45,25,.18)'; g.beginPath(); g.arc(r() * n, r() * n, 15 + r() * 30, 0, 7); g.fill(); } g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 0, n, 2); g.fillRect(0, 0, 2, n); });
  T.checker = canvasTex(128, (g, n) => { for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { g.fillStyle = (x + y) % 2 ? '#1c1c24' : '#f2f2f2'; g.fillRect(x * n / 2, y * n / 2, n / 2, n / 2); } });
  T.terrazzo = canvasTex(256, (g, n) => { const r = seeded(5); g.fillStyle = '#efe9e0'; g.fillRect(0, 0, n, n); const cols = ['#ff7aa8', '#5bc0ff', '#ffd166', '#7ad69b', '#9b8cff']; for (let i = 0; i < 160; i++) { g.fillStyle = pick(cols); g.beginPath(); g.ellipse(r() * n, r() * n, 2 + r() * 6, 1 + r() * 4, r() * 3, 0, 7); g.fill(); } });
  T.wood = canvasTex(256, (g, n) => { const r = seeded(9); for (let y = 0; y < 8; y++) { const c = 140 + r() * 40; g.fillStyle = `rgb(${c | 0},${(c * 0.68) | 0},${(c * 0.42) | 0})`; g.fillRect(0, y * n / 8, n, n / 8); g.fillStyle = 'rgba(60,35,15,.5)'; g.fillRect(0, y * n / 8, n, 2); g.fillRect(((y * 97) % n), y * n / 8, 2, n / 8); for (let k = 0; k < 8; k++) { g.fillStyle = 'rgba(80,45,20,.12)'; g.fillRect(r() * n, y * n / 8 + r() * n / 8, 30 + r() * 60, 1); } } });
  T.neon = canvasTex(128, (g, n) => { g.fillStyle = '#120a26'; g.fillRect(0, 0, n, n); g.strokeStyle = '#ff3dbb'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, n - 3, n - 3); g.strokeStyle = '#35e7ff'; g.lineWidth = 2; g.beginPath(); g.moveTo(n / 2, 0); g.lineTo(n / 2, n); g.moveTo(0, n / 2); g.lineTo(n, n / 2); g.stroke(); });
  T.asphalt = canvasTex(256, (g, n) => { const r = seeded(2); g.fillStyle = '#3b3d44'; g.fillRect(0, 0, n, n); for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(${r() > .5 ? '0,0,0' : '255,255,255'},${r() * 0.08})`; g.fillRect(r() * n, r() * n, 2, 2); } });
  T.sidewalk = canvasTex(128, (g, n) => { g.fillStyle = '#c9c5bd'; g.fillRect(0, 0, n, n); g.fillStyle = '#a9a59c'; g.fillRect(0, 0, n, 3); g.fillRect(0, 0, 3, n); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(6, 6, n - 12, 3); });
  T.roof = canvasTex(128, (g, n) => studs(g, n, '#5a5f6e', '#6f7486', '#3d414c'));
  T.cardboard = canvasTex(128, (g, n) => { g.fillStyle = '#c9965a'; g.fillRect(0, 0, n, n); g.fillStyle = 'rgba(120,80,30,.25)'; for (let i = 0; i < n; i += 6) g.fillRect(i, 0, 2, n); });
  T.stripes = canvasTex(128, (g, n) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#ff3d5a'; g.fillRect(i * n / 8, 0, n / 8, n); } });
  T.hazard = canvasTex(128, (g, n) => { g.fillStyle = '#ffcc00'; g.fillRect(0, 0, n, n); g.fillStyle = '#222'; for (let i = -n; i < n * 2; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 16, 0); g.lineTo(i + 16 - n, n); g.lineTo(i - n, n); g.fill(); } });
  return T;
}
/* World-space UV tiling for boxes: one texture repeat per `tile` meters */
/* Geometry + material caches: repeated shelves, boxes, props and NPCs share GPU buffers */
const GEO_CACHE = new Map(), MAT_CACHE = new Map();
function boxGeo(w, h, d, tile = 0) {
  const ck = `${+w.toFixed(3)}|${+h.toFixed(3)}|${+d.toFixed(3)}|${tile}`; const hit = GEO_CACHE.get(ck); if (hit) return hit;
  const geo = new THREE.BoxGeometry(w, h, d); GEO_CACHE.set(ck, geo);
  if (tile) {
    const uv = geo.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / tile, uv.getY(i) * dims[f][1] / tile); }
  }
  return geo;
}
function lamC(color, opt = {}) { const k = color + '|' + JSON.stringify(opt); let m = MAT_CACHE.get(k); if (!m) { m = new THREE.MeshLambertMaterial({ color, ...opt }); MAT_CACHE.set(k, m); } return m; }
function basicC(color) { const k = 'b' + color; let m = MAT_CACHE.get(k); if (!m) { m = new THREE.MeshBasicMaterial({ color }); MAT_CACHE.set(k, m); } return m; }
function lam(color, opt = {}) { return new THREE.MeshLambertMaterial({ color, ...opt }); }
function mesh(geo, mat, x = 0, y = 0, z = 0, parent, shadow = true) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
  if (shadow) { m.castShadow = true; m.receiveShadow = true; }
  if (parent) parent.add(m); return m;
}
function box(w, h, d, mat, x, y, z, parent, tile = 0, shadow = true) { return mesh(boxGeo(w, h, d, tile), mat, x, y, z, parent, shadow); }
function textCanvas(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.userData.canvas = c; return t; }
function redrawTex(t, draw) { const c = t.userData.canvas, g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height); draw(g, c.width, c.height); t.needsUpdate = true; }
function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

/* ---------- Collision helpers ---------- */
function addCol(list, minX, maxX, minZ, maxZ, h = 4, kind = 'solid') { list.push({ minX, maxX, minZ, maxZ, minY: 0, maxY: h, kind }); }
function segBlocked(ax, ay, az, bx, by, bz, list, kinds) {
  const dx = bx - ax, dy = by - ay, dz = bz - az;
  for (const c of list) {
    if (kinds && !kinds.includes(c.kind)) continue;
    let t0 = 0, t1 = 1;
    const ax_ = [[ax, dx, c.minX, c.maxX], [ay, dy, c.minY, c.maxY], [az, dz, c.minZ, c.maxZ]];
    let hit = true;
    for (const [o, d, mn, mx] of ax_) {
      if (Math.abs(d) < 1e-9) { if (o < mn || o > mx) { hit = false; break; } continue; }
      let ta = (mn - o) / d, tb = (mx - o) / d; if (ta > tb) [ta, tb] = [tb, ta];
      t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) { hit = false; break; }
    }
    if (hit && t1 > 0.02 && t0 < 0.98) return true;
  }
  return false;
}

/* ---------- Nav grid + A* for NPCs ---------- */
class NavGrid {
  constructor(minX, maxX, minZ, maxZ, cell, cols) {
    this.minX = minX; this.minZ = minZ; this.cell = cell; this.w = Math.ceil((maxX - minX) / cell); this.h = Math.ceil((maxZ - minZ) / cell);
    this.block = new Uint8Array(this.w * this.h); const m = 0.32;
    for (let j = 0; j < this.h; j++) for (let i = 0; i < this.w; i++) {
      const x = minX + (i + 0.5) * cell, z = minZ + (j + 0.5) * cell;
      for (const c of cols) if (c.kind !== 'low' && x > c.minX - m && x < c.maxX + m && z > c.minZ - m && z < c.maxZ + m) { this.block[j * this.w + i] = 1; break; }
    }
  }
  idx(x, z) { const i = Math.floor((x - this.minX) / this.cell), j = Math.floor((z - this.minZ) / this.cell); return (i < 0 || j < 0 || i >= this.w || j >= this.h) ? -1 : j * this.w + i; }
  free(i) { return i >= 0 && !this.block[i]; }
  center(i) { return [this.minX + ((i % this.w) + 0.5) * this.cell, this.minZ + (Math.floor(i / this.w) + 0.5) * this.cell]; }
  nearestFree(i) {
    if (this.free(i)) return i; if (i < 0) return -1; const ci = i % this.w, cj = Math.floor(i / this.w);
    for (let r = 1; r < 8; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { const ii = ci + di, jj = cj + dj; if (ii >= 0 && jj >= 0 && ii < this.w && jj < this.h && !this.block[jj * this.w + ii]) return jj * this.w + ii; }
    return -1;
  }
  los(a, b) {
    const [ax, az] = a, [bx, bz] = b, dist = Math.hypot(bx - ax, bz - az), n = Math.ceil(dist / (this.cell * 0.5));
    for (let k = 0; k <= n; k++) { const t = k / Math.max(1, n); if (!this.free(this.idx(ax + (bx - ax) * t, az + (bz - az) * t))) return false; }
    return true;
  }
  path(ax, az, bx, bz) {
    const s = this.nearestFree(this.idx(ax, az)), e = this.nearestFree(this.idx(bx, bz));
    if (s < 0 || e < 0) return [[bx, bz]];
    const W = this.w, N = this.block.length, g = new Float32Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
    const open = [s]; g[s] = 0; const hx = i => { const dx = Math.abs((i % W) - (e % W)), dz = Math.abs(Math.floor(i / W) - Math.floor(e / W)); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
    const f = new Float32Array(N).fill(Infinity); f[s] = hx(s); let iter = 0;
    while (open.length && iter++ < 6000) {
      let bi = 0; for (let k = 1; k < open.length; k++) if (f[open[k]] < f[open[bi]]) bi = k;
      const cur = open[bi]; open[bi] = open[open.length - 1]; open.pop();
      if (cur === e) break; if (closed[cur]) continue; closed[cur] = 1;
      const ci = cur % W, cj = Math.floor(cur / W);
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue; const ni = ci + di, nj = cj + dj; if (ni < 0 || nj < 0 || ni >= W || nj >= this.h) continue;
        const n = nj * W + ni; if (this.block[n] || closed[n]) continue;
        if (di && dj && (this.block[cj * W + ni] || this.block[nj * W + ci])) continue;
        const ng = g[cur] + (di && dj ? 1.414 : 1); if (ng < g[n]) { g[n] = ng; from[n] = cur; f[n] = ng + hx(n); open.push(n); }
      }
    }
    if (from[e] < 0 && s !== e) return [[bx, bz]];
    const raw = []; for (let c = e; c >= 0 && c !== s; c = from[c]) raw.push(this.center(c)); raw.push([ax, az]); raw.reverse(); raw[raw.length - 1] = [bx, bz];
    const out = []; let anchor = raw[0];
    for (let k = 1; k < raw.length; k++) { if (!this.los(anchor, raw[k])) { out.push(raw[k - 1]); anchor = raw[k - 1]; } }
    out.push(raw[raw.length - 1]); return out;
  }
}

/* ---------- Shared meshes: avatars, items, boxes ---------- */
const GEO = {};
function geos() {
  if (GEO.ready) return GEO;
  Object.assign(GEO, {
    ready: true, leg: new THREE.BoxGeometry(0.33, 0.72, 0.34), torso: new THREE.BoxGeometry(0.7, 0.68, 0.36), arm: new THREE.BoxGeometry(0.3, 0.68, 0.32),
    head: new THREE.CylinderGeometry(0.22, 0.22, 0.38, 16), face: new THREE.PlaneGeometry(0.3, 0.26),
    box: new THREE.BoxGeometry(0.62, 0.42, 0.46), flap: new THREE.BoxGeometry(0.62, 0.012, 0.23), flapS: new THREE.BoxGeometry(0.012, 0.2, 0.46)
  });
  return GEO;
}
let FACE_TEX = null;
function faceTex(kind = 0) {
  FACE_TEX ||= [0, 1, 2].map(k => textCanvas(64, 64, (g, w, h) => {
    g.fillStyle = '#1a1a1a'; g.fillRect(17, 16, 7, 12); g.fillRect(40, 16, 7, 12);
    g.lineWidth = 4; g.strokeStyle = '#1a1a1a'; g.beginPath();
    if (k === 0) g.arc(32, 34, 14, 0.2 * Math.PI, 0.8 * Math.PI); else if (k === 1) g.arc(32, 56, 14, 1.2 * Math.PI, 1.8 * Math.PI); else { g.moveTo(20, 46); g.lineTo(44, 46); }
    g.stroke();
  }));
  return FACE_TEX[kind];
}
const SKIN = [0xf5c99b, 0xe0a878, 0xc68642, 0x8d5524, 0xffdbac, 0xf1c27d, 0xffcc00];
const SHIRTS = [0xff4d6d, 0x3a86ff, 0x8338ec, 0xffbe0b, 0x06d6a0, 0xfb5607, 0x00b4d8, 0xef476f, 0x2ec4b6, 0xe9ff70, 0xffffff, 0x222222];
const PANTS = [0x1d3557, 0x2b2d42, 0x6c757d, 0x264653, 0x3d405b, 0x111111, 0x5e548e];
const FACE_MATS = {};
function faceMat(k) { return FACE_MATS[k] ||= new THREE.MeshBasicMaterial({ map: faceTex(k), transparent: true }); }
function makeAvatar(o = {}) {
  const g = geos(), root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const skin = lamC(o.skin ?? pick(SKIN)), shirt = lamC(o.shirt ?? pick(SHIRTS)), pants = lamC(o.pants ?? pick(PANTS));
  const hip = (x) => { const p = new THREE.Group(); p.position.set(x, 0.72, 0); body.add(p); const m = mesh(g.leg, pants, 0, -0.36, 0, p); m.castShadow = true; return p; };
  const legL = hip(-0.18), legR = hip(0.18);
  const torso = mesh(g.torso, shirt, 0, 0.72 + 0.34, 0, body);
  const sh = (x) => { const p = new THREE.Group(); p.position.set(x, 1.36, 0); body.add(p); mesh(g.arm, x < 0 ? shirt : shirt, 0, -0.3, 0, p); const hand = mesh(boxGeo(0.28, 0.16, 0.3), skin, 0, -0.62, 0, p); return [p, hand]; };
  const [armL] = sh(-0.5), [armR, handR] = sh(0.5);
  const head = new THREE.Group(); head.position.set(0, 1.6, 0); body.add(head);
  mesh(g.head, skin, 0, 0, 0, head);
  const face = new THREE.Mesh(g.face, faceMat(o.face || 0)); face.position.set(0, 0, 0.222); head.add(face);
  if (o.hat === 'cap') { const c = lamC(o.hatColor ?? pick(SHIRTS)); box(0.48, 0.12, 0.48, c, 0, 0.22, 0, head); box(0.44, 0.04, 0.24, c, 0, 0.17, 0.3, head); }
  else if (o.hat === 'hair' || (!o.hat && Math.random() < 0.6)) { const hc = lamC(o.hairColor ?? pick([0x2b1b0f, 0x4a2c16, 0x111111, 0xd8b26e, 0x8b3a1a, 0xff77cc])); box(0.48, 0.14, 0.48, hc, 0, 0.2, -0.02, head); box(0.48, 0.3, 0.1, hc, 0, 0.05, -0.2, head); }
  else if (o.hat === 'beanie') { box(0.48, 0.18, 0.48, lamC(o.hatColor ?? 0x222222), 0, 0.22, 0, head); }
  else if (o.hat === 'crown') { const gm = lamC(0xffd700, { emissive: 0x6a4a00 }); box(0.46, 0.1, 0.46, gm, 0, 0.23, 0, head); [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17], [0, 0.2], [0, -0.2]].forEach(([x, z]) => box(0.08, 0.14, 0.08, gm, x, 0.33, z, head)); box(0.07, 0.07, 0.02, basicC(0xff2d6f), 0, 0.24, 0.235, head); }
  else if (o.hat === 'beanieNeon') { box(0.48, 0.18, 0.48, lamC(o.hatColor ?? 0x111111), 0, 0.22, 0, head); box(0.5, 0.05, 0.5, basicC(0x39ff14), 0, 0.15, 0, head); }
  if (o.eyes === 'shades' || o.eyes === 'gold') { const gm = o.eyes === 'gold' ? lamC(0xffd700, { emissive: 0x5a3c00 }) : lamC(0x111111); box(0.14, 0.08, 0.02, gm, -0.08, 0.04, 0.235, head); box(0.14, 0.08, 0.02, gm, 0.08, 0.04, 0.235, head); box(0.44, 0.025, 0.02, gm, 0, 0.07, 0.235, head); }
  else if (o.eyes === 'visor') { box(0.42, 0.08, 0.03, basicC(o.visorColor ?? 0x35e7ff), 0, 0.04, 0.235, head); box(0.47, 0.03, 0.46, lamC(0x222222), 0, 0.04, 0, head); }
  if (o.hood) { box(0.52, 0.42, 0.14, shirt, 0, 1.52, -0.22, body); box(0.36, 0.14, 0.02, lamC(0x111111), 0, 0.9, 0.19, body); box(0.04, 0.2, 0.02, lamC(0xffffff), -0.09, 1.22, 0.19, body); box(0.04, 0.2, 0.02, lamC(0xffffff), 0.09, 1.22, 0.19, body); }
  if (o.jacket) { box(0.74, 0.7, 0.4, lamC(o.jacket), 0, 1.06, 0, body); box(0.2, 0.7, 0.02, shirt, 0, 1.06, 0.205, body); }
  if (o.shoes != null) { const sm = lamC(o.shoes, o.shoeGlow ? { emissive: o.shoeGlow } : undefined); [legL, legR].forEach(l => { box(0.36, 0.14, 0.44, sm, 0, -0.67, 0.05, l); box(0.37, 0.04, 0.45, lamC(0xffffff), 0, -0.73, 0.05, l); }); }
  if (o.halo) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.05, 8, 28), new THREE.MeshBasicMaterial({ color: 0xffffff })); ring.position.set(0, 0.05, -0.3); head.add(ring); const glow = new THREE.Mesh(new THREE.CircleGeometry(0.36, 24), new THREE.MeshBasicMaterial({ color: 0xfff6d8, transparent: true, opacity: 0.35 })); glow.position.set(0, 0.05, -0.31); head.add(glow); }
  if (o.chain) { const ch = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 6, 20), lamC(0xffd700, { emissive: 0x553300 })); ch.rotation.x = Math.PI / 2.2; ch.position.set(0, 1.32, 0.12); body.add(ch); }
  if (o.tie) box(0.1, 0.4, 0.02, lamC(0xd62828), 0, 1.15, 0.19, body);
  if (o.vest) box(0.72, 0.5, 0.38, lamC(o.vest), 0, 1.1, 0, body);
  if (o.clip) { const cp = box(0.28, 0.36, 0.03, lamC(0x8b5a2b), 0, -0.62, 0.2, armL); cp.rotation.x = -0.4; }
  if (o.phone) { const ph = box(0.12, 0.22, 0.03, basicC(0x35e7ff), 0, -0.62, 0.18, armR); ph.rotation.x = -0.5; }
  const toolHolder = new THREE.Group(); toolHolder.position.set(0, -0.68, 0.12); armR.add(toolHolder);
  const carry = new THREE.Group(); carry.position.set(0, 1.05, 0.55); body.add(carry);
  root.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = false; } });
  return { root, body, legL, legR, armL, armR, head, torso, toolHolder, carry, phase: Math.random() * 6, carrying: false };
}
function animateAvatar(av, speed, dt, t) {
  av.phase += dt * (4 + speed * 3.2);
  const sw = Math.min(1, speed / 2.5) * 0.75, s = Math.sin(av.phase) * sw;
  av.legL.rotation.x = s; av.legR.rotation.x = -s;
  if (av.carrying) { av.armL.rotation.x = lerp(av.armL.rotation.x, -1.35, 0.25); av.armR.rotation.x = lerp(av.armR.rotation.x, -1.35, 0.25); av.armL.rotation.z = 0.12; av.armR.rotation.z = -0.12; }
  else if (av.pose === 'scan') { av.armR.rotation.x = lerp(av.armR.rotation.x, -1.1 + Math.sin(t * 6) * 0.1, 0.3); av.armL.rotation.x = -s; av.armL.rotation.z = av.armR.rotation.z = 0; }
  else { av.armL.rotation.x = -s; av.armR.rotation.x = av.toolOut ? -0.6 : s; av.armL.rotation.z = av.armR.rotation.z = 0; }
  av.body.position.y = speed > 0.1 ? Math.abs(Math.sin(av.phase)) * 0.07 : Math.sin(t * 2 + av.phase) * 0.008;
}
/* Tool models for hands */
function makeTool(id) {
  const g = new THREE.Group();
  if (id === 'scanner') { box(0.08, 0.2, 0.08, lam(0x222831), 0, -0.05, 0, g); box(0.12, 0.1, 0.28, lam(0xffb703), 0, 0.06, 0.08, g); box(0.09, 0.05, 0.01, new THREE.MeshBasicMaterial({ color: 0xff2244 }), 0, 0.06, 0.225, g); }
  else if (id === 'paint') { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.28, 10), lam(0xff3dbb)); g.add(c); box(0.06, 0.06, 0.06, lam(0xffffff), 0, 0.17, 0.02, g); }
  else if (id === 'grabber') { box(0.06, 0.06, 0.5, lam(0x8d99ae), 0, 0, 0.15, g); const r = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.025, 6, 14, Math.PI * 1.4), lam(0x35e7ff, { emissive: 0x0a4455 })); r.position.z = 0.42; g.add(r); }
  g.traverse(m => { if (m.isMesh) m.castShadow = true; });
  return g;
}
/* Product display meshes (shared geometry per product) */
const ITEM_TPL = [];
function itemTemplate(pi) {
  if (ITEM_TPL[pi]) return ITEM_TPL[pi];
  const p = PRODUCTS[pi], g = new THREE.Group(), m = lam(p.color), a = lam(p.accent || 0xffffff, p.rare ? { emissive: p.accent, emissiveIntensity: 0.4 } : {});
  switch (p.shape) {
    case 'shoe': box(0.22, 0.08, 0.1, a, 0, 0.04, 0, g); box(0.2, 0.1, 0.1, m, -0.01, 0.12, 0, g); box(0.09, 0.07, 0.1, m, 0.07, 0.19, 0, g); break;
    case 'shirt': box(0.26, 0.07, 0.22, m, 0, 0.035, 0, g); box(0.1, 0.01, 0.08, a, 0, 0.075, 0.02, g); box(0.26, 0.07, 0.22, m, 0, 0.105, 0, g); break;
    case 'bag': box(0.22, 0.18, 0.1, m, 0, 0.09, 0, g); { const h = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 6, 12, Math.PI), a); h.position.y = 0.18; g.add(h); } break;
    case 'belt': { const r = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.025, 6, 16), m); r.rotation.x = Math.PI / 2; r.position.y = 0.03; g.add(r); box(0.06, 0.05, 0.03, a, 0, 0.04, 0.09, g); } break;
    case 'headphones': { const r = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.02, 6, 14, Math.PI), m); r.position.y = 0.12; g.add(r); box(0.05, 0.09, 0.08, a, -0.09, 0.1, 0, g); box(0.05, 0.09, 0.08, a, 0.09, 0.1, 0, g); } break;
    case 'console': box(0.28, 0.06, 0.2, m, 0, 0.03, 0, g); box(0.24, 0.012, 0.012, new THREE.MeshBasicMaterial({ color: p.accent }), 0, 0.05, 0.1, g); box(0.1, 0.04, 0.06, lam(0x444444), 0.05, 0.08, 0.02, g); break;
    case 'watch': { box(0.12, 0.09, 0.09, lam(0x1b1b1b), 0, 0.045, 0, g); const f = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 14), m); f.rotation.x = Math.PI / 2; f.position.set(0, 0.1, 0.03); g.add(f); } break;
  }
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
  ITEM_TPL[pi] = g; return g;
}
const BOX_TEX = [];
function boxLabelTex(pi) {
  if (BOX_TEX[pi]) return BOX_TEX[pi];
  const p = PRODUCTS[pi], col = '#' + p.color.toString(16).padStart(6, '0');
  return BOX_TEX[pi] = textCanvas(256, 128, (g, w, h) => {
    g.fillStyle = '#c9965a'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(120,80,30,.25)'; for (let i = 0; i < w; i += 8) g.fillRect(i, 0, 2, h);
    g.fillStyle = '#e8d4a8'; g.fillRect(0, h / 2 - 9, w, 18);
    g.fillStyle = '#fff'; roundRect(g, 26, 22, w - 52, 52, 8); g.fill(); g.lineWidth = 4; g.strokeStyle = '#3a2a14'; g.stroke();
    g.fillStyle = col; g.fillRect(34, 30, 14, 36); g.fillStyle = '#222'; g.font = '900 24px system-ui,Arial'; g.textAlign = 'center'; g.fillText(p.name.toUpperCase(), w / 2 + 8, 56, w - 90);
    g.font = '800 16px system-ui,Arial'; g.fillStyle = '#3a2a14'; g.fillText(`${p.per} UNITS${p.rare ? ' · RARE' : ''}`, w / 2, 100);
  });
}
let BOX_MATS = {};
function makeBox(b) {
  const g = geos(), grp = new THREE.Group(), lbl = boxLabelTex(b.p);
  const key = b.p; BOX_MATS[key] ||= [G.mats.card, G.mats.card, G.mats.card, G.mats.card, new THREE.MeshLambertMaterial({ map: lbl }), new THREE.MeshLambertMaterial({ map: lbl })];
  const body = mesh(g.box, BOX_MATS[key], 0, 0.21, 0, grp); body.castShadow = true;
  const tape = box(0.1, 0.004, 0.47, G.mats.tape, 0, 0.422, 0, grp, 0, false);
  const flaps = new THREE.Group(); grp.add(flaps);
  const f1 = new THREE.Group(); f1.position.set(0, 0.42, 0.23); flaps.add(f1); mesh(g.flap, G.mats.card, 0, 0, -0.115, f1);
  const f2 = new THREE.Group(); f2.position.set(0, 0.42, -0.23); flaps.add(f2); mesh(g.flap, G.mats.card, 0, 0, 0.115, f2);
  const contents = new THREE.Group(); contents.position.y = 0.3; grp.add(contents);
  grp.userData = { b, f1, f2, tape, contents, body };
  updateBoxMesh(grp); return grp;
}
function updateBoxMesh(grp) {
  const { b, f1, f2, tape, contents } = grp.userData;
  const open = b.open; f1.rotation.x = open ? 2.2 : 0; f2.rotation.x = open ? -2.2 : 0; tape.visible = !open;
  contents.clear();
  if (open && b.n > 0) { const t = itemTemplate(b.p); for (let i = 0; i < Math.min(b.n, 4); i++) { const it = t.clone(); it.position.set((i % 2 - 0.5) * 0.24, 0, (Math.floor(i / 2) - 0.5) * 0.18); it.scale.setScalar(0.8); contents.add(it); } }
}

/* ---------- Materials, environment and store construction ---------- */
function makeMaterials(T) {
  const rep = (t, m) => { t.repeat.set(1 / m, 1 / m); return t; };
  rep(T.plaster, 3); rep(T.brick, 2.2); rep(T.seafoam, 1.2); rep(T.white, 1.2); rep(T.panels, 1.4);
  rep(T.concrete, 3); rep(T.checker, 1.2); rep(T.terrazzo, 3); rep(T.wood, 2.4); rep(T.neon, 1.5);
  rep(T.asphalt, 6); rep(T.sidewalk, 1.5); rep(T.grass, 2); rep(T.roof, 2); rep(T.studs, 1.5); rep(T.hazard, 1); rep(T.stripes, 2);
  return {
    wall: lam(0xffffff, { map: T.plaster }), floor: lam(0xffffff, { map: T.concrete }), ceiling: lam(0xd9dde4), trim: lam(0x2b2f3a),
    roof: lam(0xffffff, { map: T.roof }), card: lam(0xc9965a, { map: T.cardboard }), tape: lam(0xe8d4a8),
    shelf: lam(0xe8e8ee), shelfDark: lam(0x3b4252), wood: lam(0xffffff, { map: T.wood }), metal: lam(0x9aa3b5), dark: lam(0x22252e),
    glass: new THREE.MeshLambertMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.35, emissive: 0x000000 }),
    window: new THREE.MeshLambertMaterial({ color: 0x5aa9e6, emissive: 0x000000 }),
    panel: new THREE.MeshBasicMaterial({ color: 0xfff4d6 }), bulb: new THREE.MeshBasicMaterial({ color: 0xfff1b0 }),
    lamp: new THREE.MeshBasicMaterial({ color: 0x777777 }), sidewalk: lam(0xffffff, { map: T.sidewalk }), asphalt: lam(0xffffff, { map: T.asphalt }),
    grass: lam(0xffffff, { map: T.grass }), studs: lam(0xffffff, { map: T.studs }), hazard: lam(0xffffff, { map: T.hazard }),
    awning: lam(0xffffff, { map: T.stripes }), board: lam(0x8b5a2b), boardDark: lam(0x6b4420), yellow: new THREE.MeshBasicMaterial({ color: 0xffd23f }),
    white: new THREE.MeshBasicMaterial({ color: 0xffffff }), red: lam(0xe63946), green: lam(0x2dc653), gold: lam(0xffd166, { emissive: 0x4a3200 }), carpet: lam(0xb3122e),
    plant: lam(0x3fae49), pot: lam(0xc8553d), dumpster: lam(0x2f8f4e)
  };
}
const WALL_MAPS = ['plaster', 'brick', 'seafoam', 'white', 'panels'];
const FLOOR_MAPS = ['concrete', 'checker', 'terrazzo', 'wood', 'neon'];
const LIGHT_COLORS = [0xffd9a0, 0xffc98a, 0xdff3ff, 0xff7ae0];
function applyDecor() {
  const s = G.state, M = G.mats, T = G.tex;
  M.wall.map = T[WALL_MAPS[s.decor.walls]]; M.wall.needsUpdate = true;
  M.floor.map = T[FLOOR_MAPS[s.decor.floor]]; M.floor.needsUpdate = true;
  M.floor.emissive.setHex(s.decor.floor === 4 ? 0x1a0b33 : 0x000000);
  const lc = LIGHT_COLORS[s.decor.lights]; M.panel.color.setHex(lc);
  G.lights.inner.forEach((l, i) => { l.color.setHex(s.decor.lights === 3 ? [0xff5ad8, 0x35e7ff, 0xa66bff][i % 3] : lc); });
  if (G.strips) G.strips.forEach(m => m.visible = s.decor.lights >= 2);
  drawStoreSign();
}
function signText() { return ['RESELL SHACK', 'RESELL CORNER', 'RESELL BOUTIQUE', 'RESELL MEGA MALL'][G.state.tier]; }
function drawStoreSign() {
  if (!G.signTex) return; const st = G.state.decor.sign, c = G.state.curb, text = signText();
  redrawTex(G.signTex, (g, w, h) => {
    const neon = st === 1 || c.neon;
    if (!c.metal && st === 0) { // painted plank, peeling
      G.tex.wood.image && g.drawImage(G.tex.wood.image, 0, 0, w, h); g.fillStyle = 'rgba(40,20,5,.25)'; g.fillRect(0, 0, w, h);
      g.font = '900 64px Impact,system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#f1e3c4'; g.globalAlpha = 0.85; g.fillText(text, w / 2, h / 2 + 4, w - 40); g.globalAlpha = 1;
      g.fillStyle = 'rgba(139,90,43,.9)'; for (let i = 0; i < 9; i++) g.fillRect((i * 131) % w, (i * 53) % h, 30, 10);
      return;
    }
    const bg = { 0: '#3b4252', 1: '#140a26', 2: '#111111', 3: '#dfe9f5' }[st];
    g.fillStyle = bg; roundRect(g, 4, 4, w - 8, h - 8, 18); g.fill(); g.lineWidth = 8; g.strokeStyle = st === 2 ? '#ffd166' : st === 3 ? '#9fb3c8' : neon ? '#ff3dbb' : '#9aa3b5'; g.stroke();
    g.font = '900 70px Impact,system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (neon && st !== 2 && st !== 3) { g.shadowColor = '#35e7ff'; g.shadowBlur = 24; g.fillStyle = '#bff8ff'; }
    else if (st === 2) { const gr = g.createLinearGradient(0, 20, 0, h - 20); gr.addColorStop(0, '#fff3b0'); gr.addColorStop(0.5, '#ffd166'); gr.addColorStop(1, '#b8860b'); g.fillStyle = gr; }
    else if (st === 3) { g.fillStyle = '#4a6fa5'; } else g.fillStyle = '#ffffff';
    g.fillText(text, w / 2, h / 2 + 4, w - 50); g.shadowBlur = 0;
  });
  if (G.signMesh) { G.signMesh.material.emissive?.setHex((c.neon || st === 1) ? 0x666666 : 0x000000); }
}
function buildEnvironment() {
  const S = G.scene, M = G.mats, cols = G.colStatic = [], props = G.settings.presetProps;
  // Sky dome
  G.skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { top: { value: new THREE.Color(0x4fb3ff) }, bottom: { value: new THREE.Color(0xcdeeff) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float h = clamp(vP.y*1.4+0.15,0.0,1.0); gl_FragColor = vec4(mix(bottom, top, h),1.0); }' });
  G.sky = new THREE.Mesh(new THREE.SphereGeometry(400, 24, 12), G.skyMat); G.sky.renderOrder = -1; S.add(G.sky);
  const ground = mesh(new THREE.PlaneGeometry(240, 240), M.grass, 0, -0.03, 0, S, false); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  { const uv = ground.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 240, uv.getY(i) * 240); }
  const flat = (w, d, mat, x, z, y = 0) => { const m = box(w, 0.06, d, mat, x, y - 0.03, z, S, 1, false); m.receiveShadow = true; return m; };
  flat(140, 4, M.sidewalk, 0, -2); flat(140, 8, M.asphalt, 0, -8, -0.01); flat(140, 4, M.sidewalk, 0, -14);
  flat(26, 20, lam(0xffffff, { map: G.tex.concrete }), 0, 9, -0.005);
  for (let x = -68; x < 70; x += 6) box(3, 0.02, 0.18, M.yellow, x, 0.02, -8, S, 0, false);
  for (let i = -3; i <= 3; i++) box(0.6, 0.02, 6, M.white, i * 1.2, 0.02, -8, S, 0, false);
  box(140, 0.18, 0.25, lam(0x9a968e), 0, 0.06, -4, S); box(140, 0.18, 0.25, lam(0x9a968e), 0, 0.06, -12, S);
  // Neighbor buildings (both sides + across the street)
  const NB = [
    { x: -19.5, z: 8, w: 13, d: 14, h: 6.5, c: 0xff8fab, sign: 'PIXEL ARCADE', sc: '#35e7ff' },
    { x: -33, z: 8, w: 12, d: 14, h: 5, c: 0x9bf6ff, sign: 'LAUNDRY', sc: '#ffffff' },
    { x: 28.5, z: 8, w: 11, d: 14, h: 5.5, c: 0xcaffbf, sign: 'BOBA BAR', sc: '#ff3dbb' },
    { x: 41, z: 8, w: 12, d: 14, h: 7, c: 0xffd6a5, sign: 'GYM', sc: '#ffd23f' },
    ...[[-34, 0xbdb2ff, 'PIZZA'], [-20, 0xffadad, 'TACO SPOT'], [-6, 0xa0c4ff, 'BANK'], [8, 0xfdffb6, 'CINEMA'], [22, 0xffc6ff, 'NAILS'], [36, 0x9bf6ff, 'TECH HUB']].map(([x, c, sign], i) => ({ x, z: -21, w: 12.5, d: 9, h: 5 + (i % 3) * 2.5, c, sign, sc: '#ffffff', across: true }))
  ];
  G.winMats = [];
  const winMat = new THREE.MeshLambertMaterial({ color: 0x2d4b6e, emissive: 0x000000 }); G.winMats.push(winMat);
  NB.forEach(b => {
    const m = box(b.w, b.h, b.d, lam(b.c, { map: G.tex.studs }), b.x, b.h / 2, b.z, S, 1.5); m.castShadow = props > 0;
    box(b.w + 0.3, 0.4, b.d + 0.3, M.trim, b.x, b.h + 0.2, b.z, S);
    const fz = b.across ? b.z + b.d / 2 + 0.02 : b.z - b.d / 2 - 0.02;
    for (let fl = 0; fl < Math.floor(b.h / 2.6); fl++) for (let k = -1; k <= 1; k++) { const wn = box(b.w * 0.2, 1.1, 0.06, winMat, b.x + k * b.w * 0.3, 1.5 + fl * 2.5, fz, S, 0, false); wn.castShadow = false; }
    const st = textCanvas(256, 64, (g, w, h) => { g.fillStyle = '#1b1f2a'; roundRect(g, 2, 2, w - 4, h - 4, 10); g.fill(); g.font = '900 38px Impact,system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = b.sc; g.fillText(b.sign, w / 2, h / 2 + 2, w - 20); });
    const sm = new THREE.Mesh(new THREE.PlaneGeometry(b.w * 0.55, b.w * 0.55 / 4), new THREE.MeshBasicMaterial({ map: st })); sm.position.set(b.x, Math.min(b.h - 0.8, 3.4), fz + (b.across ? 0.05 : -0.05)); if (!b.across) sm.rotation.y = Math.PI; S.add(sm);
    addCol(cols, b.x - b.w / 2, b.x + b.w / 2, b.z - b.d / 2, b.z + b.d / 2, b.h, 'wall');
  });
  // Street lamps
  G.lampBulbs = [];
  for (let x = -36; x <= 36; x += 12) {
    for (const z of [-3.6, -12.4]) {
      const side = z > -8 ? 1 : -1;
      box(0.16, 4.4, 0.16, M.dark, x, 2.2, z, S); box(0.12, 0.12, 1.2, M.dark, x, 4.35, z - side * 0.55, S);
      const bulb = box(0.4, 0.12, 0.4, M.lamp, x, 4.25, z - side * 1.1, S, 0, false); G.lampBulbs.push(bulb);
      addCol(cols, x - 0.12, x + 0.12, z - 0.12, z + 0.12, 4.4, 'low');
    }
  }
  G.lampPool = new THREE.Mesh(new THREE.CircleGeometry(2.2, 20), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0, depthWrite: false }));
  G.lampPools = [];
  for (let x = -36; x <= 36; x += 12) { const p = G.lampPool.clone(); p.material = G.lampPool.material; p.rotation.x = -Math.PI / 2; p.position.set(x, 0.03, -2.6); S.add(p); G.lampPools.push(p); }
  // Blocky trees & props
  if (props > 0) {
    const trunk = lam(0x7a4b26), leaf = lam(0x3fae49), leaf2 = lam(0x58c45f);
    for (let x = -42; x <= 42; x += 9) { const z = -14.6; box(0.4, 1.8, 0.4, trunk, x + 4, 0.9, z, S); box(1.8, 1.4, 1.8, leaf, x + 4, 2.4, z, S); box(1.1, 0.9, 1.1, leaf2, x + 4, 3.4, z, S); }
    box(1.8, 0.12, 0.5, M.wood, -9.8 + 30, 0.5, -3.3, S); box(0.3, 0.8, 0.3, M.red, 12, 0.4, -3.4, S);
  }
  // Ambient cars
  G.cars = [];
  const carCols = [0xe63946, 0x3a86ff, 0xffbe0b, 0x06d6a0, 0xf1faee];
  for (let i = 0; i < (props ? 4 : 2); i++) {
    const car = makeCar(carCols[i % carCols.length]); const lane = i % 2 ? -6 : -10; car.position.set(rand(-60, 60), 0, lane); car.rotation.y = lane === -6 ? Math.PI / 2 : -Math.PI / 2; S.add(car);
    G.cars.push({ m: car, dir: lane === -6 ? 1 : -1, speed: rand(5, 8) });
  }
  // Lights
  G.hemi = new THREE.HemisphereLight(0xcfe8ff, 0x6b5b3a, 1.6); S.add(G.hemi);
  G.sun = new THREE.DirectionalLight(0xffffff, 2.4); G.sun.position.set(14, 26, -12); G.sun.target.position.set(0, 0, 7); S.add(G.sun, G.sun.target);
  const sc = G.sun.shadow.camera; sc.left = -18; sc.right = 18; sc.top = 18; sc.bottom = -18; sc.near = 1; sc.far = 80; G.sun.shadow.bias = -0.0006; G.sun.shadow.normalBias = 0.03;
  G.lights = { inner: [] };
}
function makeCar(color) {
  const g = new THREE.Group(), b = lam(color), d = lam(0x1d1d24), gl = lam(0x9fd8ff, { emissive: 0x112233 });
  box(1.9, 0.6, 4, b, 0, 0.65, 0, g); box(1.7, 0.55, 2.1, b, 0, 1.22, -0.2, g); box(1.72, 0.42, 2.0, gl, 0, 1.22, -0.2, g);
  for (const x of [-0.95, 0.95]) for (const z of [-1.3, 1.3]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.3, 12), d); w.rotation.z = Math.PI / 2; w.position.set(x, 0.36, z); g.add(w); }
  box(0.4, 0.15, 0.05, new THREE.MeshBasicMaterial({ color: 0xfff6c0 }), -0.6, 0.75, 2.01, g); box(0.4, 0.15, 0.05, new THREE.MeshBasicMaterial({ color: 0xfff6c0 }), 0.6, 0.75, 2.01, g);
  g.traverse(m => { if (m.isMesh) m.castShadow = true; });
  return g;
}
function shelfLayout(tier) {
  const t = TIERS[tier], out = [];
  t.rows.forEach(z => t.cols.forEach(x => out.push({ x, z })));
  return out;
}
function buildStore() {
  if (G.store) G.scene.remove(G.store);
  const S = G.store = new THREE.Group(); G.scene.add(S);
  const s = G.state, M = G.mats, t = TIERS[s.tier], W = t.w, D = t.d, H = 3.4, hw = W / 2, cols = G.colStore = [];
  const rundown = !s.curb.repair;
  const P = G.P = { W, D, H, hw };
  // Floor, ceiling, roof
  const floor = box(W, 0.1, D, M.floor, 0, -0.05, D / 2, S, 1, false); floor.receiveShadow = true;
  const ceil = box(W, 0.1, D, M.ceiling, 0, H + 0.05, D / 2, S, 0, false); ceil.castShadow = true;
  box(W + 0.8, 0.35, D + 0.8, M.roof, 0, H + 0.27, D / 2, S, 1);
  box(W + 0.9, 0.5, 0.4, M.trim, 0, H + 0.6, -0.15, S);
  // Walls (front wall has a door gap)
  const wt = 0.25;
  box(W + wt, H, wt, M.wall, 0, H / 2, D, S, 1); addCol(cols, -hw - wt, hw + wt, D - wt / 2, D + wt / 2, H, 'wall');
  box(wt, H, D, M.wall, -hw, H / 2, D / 2, S, 1); addCol(cols, -hw - wt / 2, -hw + wt / 2, 0, D, H, 'wall');
  box(wt, H, D, M.wall, hw, H / 2, D / 2, S, 1); addCol(cols, hw - wt / 2, hw + wt / 2, 0, D, H, 'wall');
  const segW = hw - 1;
  box(segW, H, wt, M.wall, -1 - segW / 2, H / 2, 0, S, 1); addCol(cols, -hw - wt / 2, -1, -wt / 2, wt / 2, H, 'wall');
  box(segW, H, wt, M.wall, 1 + segW / 2, H / 2, 0, S, 1); addCol(cols, 1, hw + wt / 2, -wt / 2, wt / 2, H, 'wall');
  box(2, H - 2.6, wt, M.wall, 0, 2.6 + (H - 2.6) / 2, 0, S, 1); addCol(cols, -1, 1, -wt / 2, wt / 2, H, 'lintel');
  // Door frame + sliding glass doors
  box(0.12, 2.6, 0.32, M.trim, -1.02, 1.3, 0, S); box(0.12, 2.6, 0.32, M.trim, 1.02, 1.3, 0, S); box(2.16, 0.12, 0.32, M.trim, 0, 2.62, 0, S);
  G.doors = [box(1, 2.5, 0.05, M.glass, -0.5, 1.25, 0.02, S, 0, false), box(1, 2.5, 0.05, M.glass, 0.5, 1.25, -0.02, S, 0, false)]; G.doorOpen = 0;
  // Front windows (boarded up when rundown)
  const winX = [-(1 + segW / 2), 1 + segW / 2];
  winX.forEach(x => {
    const ww = Math.min(segW - 0.8, 3.2);
    box(ww + 0.2, 1.7, 0.08, M.trim, x, 1.55, -0.15, S, 0, false);
    const wn = box(ww, 1.5, 0.06, M.window, x, 1.55, -0.19, S, 0, false); G.winMats.includes(M.window) || G.winMats.push(M.window);
    box(ww, 1.5, 0.06, M.window, x, 1.55, 0.15, S, 0, false);
    if (rundown) for (let i = 0; i < 3; i++) { const b = box(ww + 0.3, 0.22, 0.06, i % 2 ? M.board : M.boardDark, x, 1.0 + i * 0.5, -0.25, S); b.rotation.z = (i - 1) * 0.12; }
  });
  // Awning
  const aw = box(W * 0.9, 0.08, 1.4, M.awning, 0, 2.95, -0.75, S, 0); aw.rotation.x = -0.25; if (rundown) { aw.rotation.z = 0.06; aw.material = lam(0x8d7f6b, { map: G.tex.stripes }); }
  // Store sign
  G.signTex = textCanvas(640, 160, () => {});
  const signMat = new THREE.MeshLambertMaterial({ map: G.signTex, emissive: 0x000000, emissiveMap: G.signTex });
  const sw = Math.min(W * 0.62, 8);
  G.signMesh = new THREE.Mesh(new THREE.PlaneGeometry(sw, sw / 4), signMat); G.signMesh.position.set(0, H + 0.62, -0.38); G.signMesh.rotation.y = Math.PI; S.add(G.signMesh);
  if (rundown) G.signMesh.rotation.z = 0.04;
  if (s.curb.metal) box(sw + 0.25, sw / 4 + 0.2, 0.12, M.metal, 0, H + 0.62, -0.3, S);
  if (s.curb.billboard) {
    box(0.25, 3, 0.25, M.dark, -3, H + 1.9, D * 0.4, S); box(0.25, 3, 0.25, M.dark, 3, H + 1.9, D * 0.4, S);
    const bb = textCanvas(512, 200, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#ff3dbb'); gr.addColorStop(1, '#7a5cff'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = '900 62px Impact,system-ui'; g.textAlign = 'center'; g.fillText('RESELL TYCOON', w / 2, 92); g.font = '800 30px system-ui'; g.fillText('Heat drops daily · No cap', w / 2, 150); });
    const bm = new THREE.Mesh(new THREE.PlaneGeometry(8, 3.1), new THREE.MeshBasicMaterial({ map: bb })); bm.position.set(0, H + 4.2, D * 0.4 - 0.15); bm.rotation.y = Math.PI; S.add(bm);
    box(8.3, 3.4, 0.2, M.trim, 0, H + 4.2, D * 0.4, S);
  }
  // Door OPEN/CLOSED sign (attached to the door frame)
  G.doorSignTex = textCanvas(128, 64, () => {}); drawDoorSign();
  const dsm = new THREE.MeshBasicMaterial({ map: G.doorSignTex });
  const ds1 = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.31), dsm); ds1.position.set(1.55, 1.75, -0.16); ds1.rotation.y = Math.PI; S.add(ds1);
  const ds2 = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.31), dsm); ds2.position.set(1.55, 1.75, 0.16); S.add(ds2);
  G.doorSignMeshes = [ds1, ds2];
  P.sign = { x: 1.55, y: 1.75, z: 0 };
  // Ceiling lights
  G.lights.inner.forEach(l => G.scene.remove(l)); G.lights.inner = []; G.panels = []; G.strips = [];
  const nl = G.settings.preset === 'Low' ? 2 : G.settings.preset === 'Medium' ? 3 : 4;
  for (let i = 0; i < nl; i++) {
    const z = D * (i + 0.5) / nl, pl = new THREE.PointLight(0xffd9a0, 14, Math.max(W, D) * 1.1, 1.6); pl.position.set(0, H - 0.5, z); G.scene.add(pl); G.lights.inner.push(pl);
  }
  for (let z = 1.6; z < D - 0.8; z += 2.4) for (const x of (W > 10 ? [-hw * 0.5, hw * 0.5] : [0])) { const p = box(1.4, 0.06, 0.5, M.panel, x, H - 0.03, z, S, 0, false); p.castShadow = false; G.panels.push(p); }
  for (const x of [-hw + 0.2, hw - 0.2]) { const st = box(0.06, 0.06, D - 1, new THREE.MeshBasicMaterial({ color: 0x35e7ff }), x, H - 0.15, D / 2, S, 0, false); G.strips.push(st); }
  // Shelves
  G.shelves = shelfLayout(s.tier).map((pos, i) => buildShelf(S, pos, i));
  // Checkout counter
  const cx = hw - 2.0, cz = 2.0; P.checkout = { x: cx, z: cz, standX: cx - 1.05, standZ: cz, playerX: cx + 0.95, playerZ: cz };
  box(0.95, 1.0, 2.5, lam(0x3a86ff, { map: G.tex.studs }), cx, 0.5, cz, S, 1); box(1.05, 0.06, 2.6, M.dark, cx, 1.03, cz, S);
  box(0.5, 0.02, 1.4, lam(0x111111), cx - 0.1, 1.07, cz - 0.4, S, 0, false);
  addCol(cols, cx - 0.5, cx + 0.5, cz - 1.25, cz + 1.25, 1.05, 'solid');
  G.regTex = textCanvas(256, 160, () => {});
  const reg = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.31), new THREE.MeshBasicMaterial({ map: G.regTex })); reg.position.set(cx + 0.2, 1.42, cz + 0.85); reg.rotation.y = Math.PI / 2 - 0.35; S.add(reg);
  box(0.1, 0.35, 0.1, M.dark, cx + 0.25, 1.2, cz + 0.85, S);
  box(0.5, 0.25, 0.5, lam(0x222831), cx + 0.15, 1.18, cz + 1.0, S);
  P.queue = [0, 1, 2, 3, 4].map(k => ({ x: cx - 1.05 - (k > 2 ? (k - 2) * 0.85 : 0), z: cz + k * 0.8 - (k > 2 ? (k - 2) * 0.8 : 0) }));
  P.counterItem = k => ({ x: cx - 0.12 + (k % 2) * 0.24 - 0.1, y: 1.09, z: cz - 0.9 + Math.floor(k / 2) * 0.3 });
  P.bagItem = k => ({ x: cx + 0.05, y: 1.09, z: cz + 0.4 + k * 0.05 });
  // Laptop desk
  const lx = -hw + 1.2, lz = D - 1.0; P.laptop = { x: lx, y: 1.0, z: lz - 0.05 };
  box(1.8, 0.08, 0.9, M.wood, lx, 0.82, lz, S, 1); [[-0.8, -0.35], [0.8, -0.35], [-0.8, 0.35], [0.8, 0.35]].forEach(([dx, dz]) => box(0.07, 0.8, 0.07, M.dark, lx + dx, 0.4, lz + dz, S));
  addCol(cols, lx - 0.9, lx + 0.9, lz - 0.45, lz + 0.45, 0.86, 'solid');
  box(0.62, 0.03, 0.42, M.dark, lx, 0.875, lz - 0.05, S);
  G.lapTex = textCanvas(256, 160, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#2b1055'); gr.addColorStop(1, '#0f8b8d'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = '900 30px system-ui'; g.textAlign = 'center'; g.fillText('STORE OS', w / 2, 70); g.font = '700 16px system-ui'; g.fillText('Orders · Upgrades · Decor', w / 2, 104); });
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.38), new THREE.MeshBasicMaterial({ map: G.lapTex })); scr.position.set(lx, 1.08, lz + 0.15); scr.rotation.set(-0.25, Math.PI, 0); S.add(scr);
  box(0.64, 0.42, 0.02, M.dark, lx, 1.08, lz + 0.165, S).rotation.set(-0.25, 0, 0);
  box(0.5, 0.06, 0.5, lam(0xe63946), lx, 0.5, lz - 0.75, S); box(0.5, 0.6, 0.06, lam(0xe63946), lx, 0.85, lz - 0.98, S);
  // Delivery dock (back-right)
  const dx = hw - 1.6, dz = D - 1.3; P.dock = { x: dx, z: dz };
  box(2.8, 0.02, 2.0, M.hazard, dx, 0.01, dz, S, 0, false).receiveShadow = true;
  box(2.6, 2.4, 0.08, lam(0x8d99ae, { map: G.tex.stripes }), dx, 1.2, D - 0.15, S);
  P.dockSlot = k => { const lvl = Math.floor(k / 6), r = k % 6; return { x: dx + 0.85 - (r % 3) * 0.85, y: lvl * 0.43, z: dz - 0.35 + Math.floor(r / 3) * 0.6 }; };
  // Trophy wall + milestone board (left wall, front)
  const tx = -hw + 0.14, tz = 1.9; P.trophy = { x: tx + 0.2, y: 1.7, z: tz };
  G.boardTex = textCanvas(512, 300, () => {});
  const board = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.29), new THREE.MeshLambertMaterial({ map: G.boardTex, emissive: 0x222222, emissiveMap: G.boardTex })); board.position.set(tx + 0.02, 2.4, tz); board.rotation.y = Math.PI / 2; S.add(board);
  box(0.06, 1.4, 2.35, M.trim, tx - 0.01, 2.4, tz, S);
  box(0.4, 0.05, 2.3, M.wood, tx + 0.2, 1.05, tz, S, 1); box(0.4, 0.05, 2.3, M.wood, tx + 0.2, 1.5, tz, S, 1);
  addCol(cols, tx - 0.1, tx + 0.42, tz - 1.15, tz + 1.15, 1.6, 'solid');
  G.trophyGroup = new THREE.Group(); S.add(G.trophyGroup);
  P.trophySlot = k => ({ x: tx + 0.2, y: k < 5 ? 1.075 : 1.525, z: tz - 0.88 + (k % 5) * 0.44 });
  // Luxury showroom touches
  const lv = s.tracks.showroom;
  if (lv >= 1) box(1.6, 0.012, D - 1.2, M.carpet, 0, 0.008, D / 2, S, 0, false).receiveShadow = true;
  if (lv >= 2) [-1, 1].forEach(k => { const px = k * (hw - 0.7), pz = 0.9; box(0.6, 0.9, 0.6, M.white, px, 0.45, pz, S); box(0.5, 0.5, 0.5, M.glass, px, 1.15, pz, S, 0, false); addCol(cols, px - 0.3, px + 0.3, pz - 0.3, pz + 0.3, 1.4, 'solid'); const it = itemTemplate(lv >= 4 ? 9 : 3).clone(); it.position.set(px, 0.92, pz); it.scale.setScalar(1.6); S.add(it); G.spinners = (G.spinners || []).concat(it); });
  if (lv >= 3) { const ch = new THREE.Group(); ch.position.set(0, H - 0.6, D / 2); S.add(ch); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.06, 8, 24), M.gold); ring.rotation.x = Math.PI / 2; ch.add(ring); for (let i = 0; i < 8; i++) { const c = box(0.08, 0.25, 0.08, new THREE.MeshBasicMaterial({ color: 0xfff1c1 }), Math.cos(i * 0.785) * 0.7, -0.12, Math.sin(i * 0.785) * 0.7, ch, 0, false); c.castShadow = false; } box(0.03, 0.6, 0.03, M.gold, 0, 0.3, 0, ch); }
  if (lv >= 4) { box(W, 0.15, 0.1, M.gold, 0, H - 0.08, 0.15, S); box(W, 0.15, 0.1, M.gold, 0, H - 0.08, D - 0.15, S); }
  if (lv >= 5) [-1, 1].forEach(k => { const pl = box(0.5, 1.2, 0.5, M.pot, k * (hw - 0.5), 0.3, D * 0.55, S); box(0.8, 1.0, 0.8, M.plant, k * (hw - 0.5), 1.2, D * 0.55, S); addCol(cols, k * (hw - 0.5) - 0.4, k * (hw - 0.5) + 0.4, D * 0.55 - 0.4, D * 0.55 + 0.4, 1.6, 'solid'); });
  // Dumpster in the alley
  const dux = -hw - 1.6, duz = 1.6; P.dumpster = { x: dux, z: duz };
  box(1.6, 1.2, 1.1, M.dumpster, dux, 0.6, duz, S); const lid = box(1.7, 0.08, 1.2, lam(0x1f6e3a), dux, 1.25, duz - 0.05, S); lid.rotation.x = -0.2;
  addCol(cols, dux - 0.8, dux + 0.8, duz - 0.55, duz + 0.55, 1.3, 'solid');
  // Bus stop
  P.busStop = s.curb.busstop ? { x: -16, z: -3 } : null;
  if (s.curb.busstop) { const bx = -16; box(3, 0.1, 1.2, M.trim, bx, 2.4, -3, S); box(0.1, 2.4, 1.2, M.glass, bx - 1.45, 1.2, -3, S, 0, false); box(3, 2.2, 0.06, M.glass, bx, 1.2, -2.45, S, 0, false); box(2.4, 0.1, 0.4, M.wood, bx, 0.5, -2.75, S); const bs = textCanvas(128, 128, (g, w, h) => { g.fillStyle = '#1565c0'; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = '900 56px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('BUS', 64, 66); }); const bsm = new THREE.Mesh(new THREE.CircleGeometry(0.35, 16), new THREE.MeshBasicMaterial({ map: bs, side: THREE.DoubleSide })); bsm.position.set(bx + 1.7, 2.6, -3.6); S.add(bsm); box(0.08, 2.6, 0.08, M.dark, bx + 1.7, 1.3, -3.6, S); addCol(cols, bx - 1.5, bx + 1.5, -3.1, -2.4, 2.4, 'solid'); }
  // Parking lot
  if (s.curb.parking) {
    const px = 16.5, pz = 7; box(11, 0.04, 14, M.asphalt, px, 0.0, pz, S, 1, false).receiveShadow = true;
    for (let i = 0; i < 5; i++) box(0.1, 0.02, 4.5, M.white, px - 5 + i * 2.6, 0.03, pz - 3, S, 0, false);
    const cc = [0xff006e, 0x8338ec, 0xffbe0b]; [0, 1, 2].forEach(i => { if (i === 1) return; const car = makeCar(cc[i]); car.position.set(px - 3.7 + i * 2.6, 0, pz - 3); S.add(car); addCol(cols, px - 4.7 + i * 2.6, px - 2.7 + i * 2.6, pz - 5, pz - 1, 1.6, 'solid'); });
    const ps = textCanvas(128, 128, (g, w, h) => { g.fillStyle = '#1565c0'; roundRect(g, 4, 4, 120, 120, 16); g.fill(); g.fillStyle = '#fff'; g.font = '900 96px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('P', 64, 70); });
    const psm = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), new THREE.MeshBasicMaterial({ map: ps, side: THREE.DoubleSide })); psm.position.set(px - 5.2, 2.5, -0.4); S.add(psm); box(0.1, 2.2, 0.1, M.dark, px - 5.2, 1.1, -0.4, S);
  }
  buildExtras(S, cols);
  P.spawn = [{ x: -40, z: -1.8 }, { x: 40, z: -2.4 }];
  P.doorOut = { x: 0, z: -1.2 }; P.doorIn = { x: 0, z: 1.0 };
  S.traverse(o => { if (o.isMesh && o.castShadow && !G.settings.shadowsOn) o.castShadow = o.castShadow; });
  G.nav = new NavGrid(-12.4, 12.4, -3.7, 17, 0.4, [...G.colStatic, ...cols]);
  applyDecor(); applyDistrict(); refreshAllShelves(); refreshDock(); refreshTrophies(); drawBoard(); drawRegister(); rebuildFloorBoxes();
  G.allCols = [...G.colStatic, ...cols];
}
function drawDoorSign() {
  if (!G.doorSignTex) return; const open = G.state.open;
  redrawTex(G.doorSignTex, (g, w, h) => { g.fillStyle = open ? '#2dc653' : '#e63946'; roundRect(g, 3, 3, w - 6, h - 6, 10); g.fill(); g.lineWidth = 4; g.strokeStyle = '#fff'; g.stroke(); g.fillStyle = '#fff'; g.font = '900 34px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(open ? 'OPEN' : 'CLOSED', w / 2, h / 2 + 2); });
}
/* ---------- Shelves ---------- */
function buildShelf(S, pos, i) {
  const g = new THREE.Group(); g.position.set(pos.x, 0, pos.z); S.add(g); const M = G.mats;
  box(2.0, 1.75, 0.06, M.shelfDark, 0, 0.875, 0.25, g); box(0.06, 1.75, 0.55, M.shelfDark, -1.0, 0.875, 0, g); box(0.06, 1.75, 0.55, M.shelfDark, 1.0, 0.875, 0, g);
  [0.1, 0.6, 1.1].forEach(y => box(1.96, 0.05, 0.52, M.shelf, 0, y, 0, g));
  box(1.96, 0.1, 0.52, M.shelfDark, 0, 0.04, 0, g);
  const head = textCanvas(256, 48, () => {}), tag = textCanvas(128, 64, () => {});
  const hm = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.36), new THREE.MeshBasicMaterial({ map: head })); hm.position.set(0, 1.93, 0.2); hm.rotation.y = Math.PI; g.add(hm);
  box(2.0, 0.4, 0.05, M.shelfDark, 0, 1.93, 0.23, g);
  const tm = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.16), new THREE.MeshBasicMaterial({ map: tag })); tm.position.set(0.7, 0.55, -0.272); tm.rotation.y = Math.PI; g.add(tm);
  const items = new THREE.Group(); g.add(items);
  addCol(G.colStore, pos.x - 1.03, pos.x + 1.03, pos.z - 0.29, pos.z + 0.29, 1.95, 'solid');
  const sh = { i, x: pos.x, z: pos.z, g, items, head, tag, stand: { x: pos.x, z: pos.z - 0.98 }, tagPos: { x: pos.x + 0.7, y: 0.55, z: pos.z - 0.29 } };
  return sh;
}
function shelfCap() { return shelfCapFor(G.state.tracks.inventory); }
function slotLocal(k) { const lvl = Math.floor(k / 6), c = k % 6; return { x: -0.8 + c * 0.32, y: 0.13 + lvl * 0.5, z: 0.02 }; }
function refreshShelf(sh) {
  const d = G.state.shelves[sh.i], p = PRODUCTS[d.p];
  sh.items.clear();
  if (d.p >= 0) { const t = itemTemplate(d.p); for (let k = 0; k < d.n; k++) { const it = t.clone(), sp = slotLocal(k); it.position.set(sp.x, sp.y, sp.z); sh.items.add(it); } }
  redrawTex(sh.head, (g, w, h) => { g.fillStyle = p ? '#' + p.color.toString(16).padStart(6, '0') : '#2b2f3a'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, h - 8, w, 8); g.fillStyle = p && [0xf4f4f4, 0xffcf4a, 0xbff4ff, 0xc58b4b].includes(p.color) ? '#111' : '#fff'; g.font = '900 26px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(p ? `${p.name.toUpperCase()} · ${d.n}/${shelfCap()}` : 'EMPTY SHELF', w / 2, h / 2 - 2, w - 16); });
  redrawTex(sh.tag, (g, w, h) => { g.fillStyle = '#fff8c4'; g.fillRect(0, 0, w, h); g.fillStyle = '#e63946'; g.fillRect(0, 0, w, 14); g.fillStyle = '#111'; g.font = '900 32px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(p ? money(G.state.prices[d.p]) : '—', w / 2, 40); });
}
function refreshAllShelves() { G.shelves?.forEach(refreshShelf); }
function refreshDock() {
  if (!G.dockGroup) { G.dockGroup = new THREE.Group(); G.scene.add(G.dockGroup); }
  G.dockGroup.clear();
  G.state.dock.forEach((b, k) => { const m = makeBox(b), sp = G.P.dockSlot(k); m.position.set(sp.x, sp.y, sp.z); m.rotation.y = (k % 2) * 0.08 - 0.04; G.dockGroup.add(m); b._mesh = m; });
}
function rebuildFloorBoxes() {
  if (!G.floorGroup) { G.floorGroup = new THREE.Group(); G.scene.add(G.floorGroup); }
  G.floorGroup.clear(); G.state.floorBoxes.forEach(b => { const m = makeBox(b); m.position.set(b.x, b.y, b.z); G.floorGroup.add(m); b._mesh = m; b.vx = b.vy = b.vz = 0; });
}
function makeTrophy(t) {
  const g = new THREE.Group(), m = lam(t.color, { emissive: t.color, emissiveIntensity: 0.25 });
  box(0.22, 0.06, 0.22, G.mats.dark, 0, 0.03, 0, g);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.05, 0.16, 12), m); cup.position.y = 0.2; g.add(cup);
  box(0.04, 0.08, 0.04, m, 0, 0.09, 0, g);
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.05), m); star.position.y = 0.33; g.add(star);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); return g;
}
function refreshTrophies() {
  if (!G.trophyGroup) return; G.trophyGroup.clear();
  TROPHIES.forEach((t, k) => { if (!G.state.trophies.includes(t.id)) return; const tr = makeTrophy(t), sp = G.P.trophySlot(k); tr.position.set(sp.x, sp.y, sp.z); G.trophyGroup.add(tr); });
}
function drawBoard() {
  if (!G.boardTex) return; const s = G.state, st = s.stats;
  redrawTex(G.boardTex, (g, w, h) => {
    g.fillStyle = '#14213d'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffd166'; g.fillRect(0, 0, w, 54);
    g.fillStyle = '#14213d'; g.font = '900 32px system-ui'; g.textAlign = 'center'; g.fillText('MILESTONE BOARD', w / 2, 38);
    g.textAlign = 'left'; g.font = '800 24px system-ui'; g.fillStyle = '#fff';
    const rows = [['Total cash earned', money(st.earned)], ['Lifetime profit', money(st.profit)], ['Items sold', st.sold.toLocaleString()], ['Highest single sale', money(st.highest)], ['Customers served', st.customers.toLocaleString()], ['Trophies', `${s.trophies.length}/${TROPHIES.length}`]];
    rows.forEach(([a, b], i) => { g.fillStyle = '#9fb3d9'; g.fillText(a, 24, 92 + i * 36); g.fillStyle = '#fff'; g.textAlign = 'right'; g.fillText(b, w - 24, 92 + i * 36); g.textAlign = 'left'; });
  });
}
function drawRegister() {
  if (!G.regTex) return; const c = G.checkout;
  redrawTex(G.regTex, (g, w, h) => {
    g.fillStyle = '#0b1f14'; g.fillRect(0, 0, w, h); g.fillStyle = '#3cff8a'; g.font = '800 20px monospace'; g.textAlign = 'left';
    if (!c || !c.customer) { g.fillText('REGISTER READY', 14, 40); g.font = '700 16px monospace'; g.fillText(G.state.open ? 'Waiting for customer' : 'Store is CLOSED', 14, 76); return; }
    const items = c.customer.cart; let y = 30;
    items.slice(-4).forEach(it => { g.fillText(`${it.scanned ? '✓' : '·'} ${PRODUCTS[it.p].name.slice(0, 12)}`, 12, y); g.textAlign = 'right'; g.fillText(it.scanned ? money(it.price) : '--', w - 12, y); g.textAlign = 'left'; y += 24; });
    g.fillStyle = '#ffd166'; g.font = '900 26px monospace'; g.fillText('TOTAL', 12, h - 16); g.textAlign = 'right'; g.fillText(money(c.total), w - 12, h - 16);
  });
}

/* ---------- DOM UI ---------- */
function $(sel, el) { return (el || G.root).querySelector(sel); }
function $$(sel, el) { return [...(el || G.root).querySelectorAll(sel)]; }
const KEYS = Object.fromEntries(ACTIONS.map(a => [a.id, a.key]));
/* Button-prompt badges swap between keyboard and the active controller profile */
function badgeHTML(act, keyOverride) {
  if (G && G.inputMode === 'pad') { const i = typeof act === 'number' ? act : G.pad.bind(act); return `<span class="rt-pb ${G.pad.cls(i)}">${esc(G.pad.label(i))}</span>`; }
  const k = keyOverride || (typeof act === 'number' ? ({ 0: 'Enter', 1: 'Esc', 2: 'X', 3: 'Y' }[act] || '') : KEYS[act]);
  return `<kbd>${esc(k)}</kbd>`;
}
const B = (act, key) => `<span class="rt-badge" data-act="${act}"${key ? ` data-key="${esc(key)}"` : ''}>${badgeHTML(isNaN(act) ? act : +act, key)}</span>`;
function refreshBadges(el) { $$('[data-act]', el).forEach(n => { const a = n.dataset.act; n.innerHTML = badgeHTML(isNaN(a) ? a : +a, n.dataset.key); }); }
function setInputMode(m) { if (G.inputMode === m) return; G.inputMode = m; G.root.dataset.input = m; refreshBadges(); G.promptKey = ''; }

function buildUI(area) {
  const root = document.createElement('div'); root.className = 'rt-root'; root.tabIndex = -1; root.dataset.input = 'kbm';
  root.innerHTML = `
  <canvas class="rt-canvas" aria-label="RESELL TYCOON 3D store"></canvas>
  <div class="rt-world" aria-hidden="true"></div>
  <div class="rt-hud" hidden>
    <div class="rt-topbar">
      <div class="rt-pill rt-cash" title="Cash"><span class="rt-coin">$</span><b data-cash>0</b></div>
      <div class="rt-pill rt-aura" title="Aura Points"><span class="rt-spark">✦</span><b data-aura>0</b><small data-rank></small></div>
      <div class="rt-pill rt-prestige" data-prestige hidden></div>
      <div class="rt-pill rt-clock" data-clock></div>
      <div class="rt-pill rt-status" data-status></div>
      <span class="rt-grow"></span>
      <span class="rt-saved" data-saved>Saved ✓</span>
      <button class="rt-hbtn" data-do="openLaptop" title="Store Laptop">💻 <span class="rt-hlabel">Laptop</span> ${B('laptop')}</button>
      <button class="rt-hbtn" data-do="mute" title="Mute (M)"><span data-mute>🔊</span> <kbd>M</kbd></button>
      <button class="rt-hbtn" data-do="fullscreen" data-fsbtn aria-pressed="false" title="Fullscreen (F11)">⛶ ${B('fullscreen')}</button>
      <button class="rt-hbtn" data-do="pause" title="Settings">⚙️ ${B('pause')}</button>
    </div>
    <div class="rt-quest" data-quest hidden></div>
    <div class="rt-event" data-event hidden></div>
    <div class="rt-cross"></div>
    <div class="rt-prompt" data-prompt hidden></div>
    <div class="rt-register" data-register hidden></div>
    <div class="rt-bottom">
      <div class="rt-carry" data-carry hidden></div>
      <div class="rt-hotbar" data-hotbar></div>
    </div>
    <div class="rt-fps" data-fps hidden></div>
    <div class="rt-touch" data-touch hidden>
      <div class="rt-stick" data-stick><i></i></div>
      <div class="rt-tbtns"><button data-touch-act="interact" class="big">INTERACT</button><button data-touch-act="useTool">USE</button><button data-touch-act="jump" class="big">JUMP</button><button data-touch-act="tool">TOOL</button><button data-touch-act="pickDrop">GRAB</button><button data-touch-act="flaps">BOX</button></div>
    </div>
  </div>
  <div class="rt-toasts" aria-live="polite"></div>
  <div class="rt-title" data-title hidden></div>
  <div class="rt-cine" data-cine hidden><i class="top"></i><i class="bot"></i><div class="rt-cine-text" data-cine-text></div><button class="rt-skip" data-do="skipIntro">Skip Cutscene ${B('interact', 'Space')}</button></div>
  <div class="rt-modals"></div>
  <div class="rt-vcursor" hidden></div>`;
  area.replaceChildren(root);
  return root;
}
function toast(msg, kind = '') {
  const box = $('.rt-toasts'); if (!box) return;
  const t = document.createElement('div'); t.className = 'rt-toast ' + kind; t.innerHTML = msg; box.prepend(t);
  while (box.children.length > 4) box.lastChild.remove();
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, 3200);
}
function savedBadge() { const el = $('[data-saved]'); if (!el) return; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); }

/* ---------- Modal stack ---------- */
function openModal(id, render, opt = {}) {
  closeModal(id, true);
  const m = document.createElement('div'); m.className = 'rt-modal ' + (opt.cls || ''); m.dataset.modal = id; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
  m.innerHTML = `<div class="rt-panel"></div>`; $('.rt-modals').append(m);
  const entry = { id, el: m, render, opt, tab: opt.tab || 0 }; G.modals.push(entry);
  renderModal(entry, true);
  if (document.pointerLockElement) document.exitPointerLock?.();
  G.sound.play('pop');
  return entry;
}
function renderModal(entry, first) {
  const panel = entry.el.querySelector('.rt-panel'), prevFocus = first ? null : panel.querySelector('.gp-focus, :focus')?.dataset?.fid;
  const scroll = panel.querySelector('.rt-scroll')?.scrollTop || 0;
  panel.innerHTML = entry.render(entry);
  $$('button, [data-focus], input', panel).forEach((n, k) => n.dataset.fid ||= String(k));
  const sc = panel.querySelector('.rt-scroll'); if (sc) sc.scrollTop = scroll;
  refreshBadges(panel);
  const target = (prevFocus && panel.querySelector(`[data-fid="${prevFocus}"]`)) || panel.querySelector('[data-autofocus]') || panel.querySelector('button:not([disabled]):not(.rt-x)') ;
  if (target && (G.inputMode === 'pad' || first)) focusEl(target, G.inputMode !== 'pad');
}
function refreshModal(id) { const e = G.modals.find(m => !id || m.id === id); if (e) renderModal(e); }
function topModal() { return G.modals[G.modals.length - 1]; }
function closeModal(id, silent) {
  const k = G.modals.findIndex(m => m.id === id); if (k < 0) return;
  const [e] = G.modals.splice(k, 1); e.el.remove(); try { e.opt.cleanup?.(); } catch (err) {} if (!silent) { e.opt.onClose?.(); G.sound.play('click'); }
}
function closeTop() { const t = topModal(); if (!t) return false; if (t.opt.locked) return true; closeModal(t.id); return true; }
function focusEl(el, quiet) {
  $$('.gp-focus').forEach(n => n.classList.remove('gp-focus'));
  if (!el) return; if (G.inputMode === 'pad') el.classList.add('gp-focus');
  try { el.focus({ preventScroll: true }); } catch (e) {}
  el.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
}
function modalTabs(entry, names) {
  return `<div class="rt-tabs" role="tablist"><span class="rt-tabhint">${B(4)}</span>${names.map((n, i) => `<button role="tab" class="rt-tab ${entry.tab === i ? 'on' : ''}" aria-selected="${entry.tab === i}" data-do="tab" data-tab="${i}">${n}</button>`).join('')}<span class="rt-tabhint">${B(5)}</span></div>`;
}
const head = (title, sub = '') => `<div class="rt-mhead"><div><h3>${title}</h3>${sub ? `<p>${sub}</p>` : ''}</div><button class="rt-x" data-do="close" aria-label="Close">✕ ${B(1, 'Esc')}</button></div>`;
const buyBtn = (label, price, act, attrs = '', can = true) => `<button class="rt-buy" data-do="${act}" ${attrs} ${G.state.cash >= price && can ? '' : 'disabled'}>${label} <b>${money(price)}</b></button>`;
const seg = (k, opts, cur, act = 'set') => `<div class="rt-seg">${opts.map(([v, l]) => `<button class="${String(cur) === String(v) ? 'on' : ''}" data-do="${act}" data-k="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
const tog = (k, on, act = 'toggle') => `<button class="rt-toggle ${on ? 'on' : ''}" data-do="${act}" data-k="${k}" aria-pressed="${on}">${on ? 'ON' : 'OFF'}</button>`;
const slider = (k, v, min, max, step, fmt = x => x, act = 'slide') => `<div class="rt-slider"><input type="range" data-do="${act}" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${v}" aria-label="${k}"><output>${fmt(v)}</output></div>`;
const row = (label, ctl, sub = '') => `<div class="rt-row"><div><b>${label}</b>${sub ? `<small>${sub}</small>` : ''}</div>${ctl}</div>`;

/* ---------- Laptop ("Store OS") ---------- */
const LAPTOP_TABS = ['Orders', 'Marketplace', 'Upgrade your empire', 'Decorate', 'Goals', 'Reviews', '📈 Stonks', '♻️ Rebirth'];
function openLaptop(tab) {
  if (G.modals.some(m => m.id === 'laptop')) return;
  openModal('laptop', renderLaptop, { cls: 'rt-laptop', tab: tab ?? G.lastLaptopTab ?? 0, tabs: LAPTOP_TABS.length, onTab: t => G.lastLaptopTab = t });
  tutorialEvent('laptop');
}
function renderLaptop(e) {
  const s = G.state;
  const body = [lapOrders, lapMarket, lapUpgrades, lapDecor, lapGoals, lapReviews, lapStonks, lapRebirth][e.tab]();
  return `${head('💻 STORE OS', `<span class="rt-chip cash">${money(s.cash)}</span> <span class="rt-chip">✦ ${Math.floor(s.aura)} Aura · ${RANKS[rankOf(s.aura)].name}</span> <span class="rt-chip">${TIERS[s.tier].name}</span>${s.rebirths ? ` <span class="rt-chip gold">★P${s.rebirths} ${multText(s.rebirths)}</span>` : ''}`)}${modalTabs(e, LAPTOP_TABS.map((n, i) => i === 7 ? (canRebirth(s) ? '♻️ Rebirth' : '🔒 Rebirth') : n))}<div class="rt-scroll">${body}</div>`;
}
function lapOrders() {
  const s = G.state, cap = dockCapFor(s.tracks.warehouse), used = s.dock.length + s.orders.reduce((a, o) => a + o.boxes, 0);
  const cards = PRODUCTS.map((p, i) => {
    if (!s.licenses[p.lic]) return `<div class="rt-card locked"><div class="rt-sw" style="--c:#${p.color.toString(16).padStart(6, '0')}"></div><h4>${p.name}</h4><p>🔒 Needs the <b>${LICENSES[p.lic].name}</b> license.</p><button class="rt-ghost" data-do="tab" data-tab="2">See licenses</button></div>`;
    const bp = boxPrice(i);
    return `<div class="rt-card"><div class="rt-sw" style="--c:#${p.color.toString(16).padStart(6, '0')}">${p.rare ? '<em>RARE</em>' : ''}</div><h4>${p.name}</h4>
      <p>Box of ${p.per} · ${money(bp / p.per)} each<br>Market value <b>${money(marketValue(i))}</b></p>
      <div class="rt-btnrow">${buyBtn('Order 1 box', bp, 'order', `data-p="${i}" data-n="1"`, used < cap)}${buyBtn('×3', bp * 3, 'order', `data-p="${i}" data-n="3"`, used + 3 <= cap)}</div></div>`;
  }).join('');
  const inc = s.orders.length ? s.orders.map((o, k) => `<div class="rt-eta"><span>🚚 ${o.boxes}× ${PRODUCTS[o.p].name}</span><i><b data-eta="${k}" style="width:${100 - (o.t / Math.max(1, o.total || deliveryFor(s.tracks.delivery))) * 100}%"></b></i><small data-etat="${k}">${fmtTime(o.t)}</small></div>`).join('') : '<p class="rt-muted">No deliveries on the way.</p>';
  return `<div class="rt-info"><span>📦 Dock <b>${s.dock.length}/${cap}</b> boxes</span><span>🚚 In transit <b>${s.orders.reduce((a, o) => a + o.boxes, 0)}</b></span><span>⏱️ Delivery <b>${deliveryFor(s.tracks.delivery)}s</b></span>${G.fx.discount > 0 ? '<span class="hot">🔥 Supplier Discount −30%</span>' : ''}${s.tracks.suppliers ? `<span>🤝 −${s.tracks.suppliers * 5}% suppliers</span>` : ''}</div>
    <h5>Incoming deliveries</h5>${inc}<h5>Order stock</h5><div class="rt-grid">${cards}</div>`;
}
function lapMarket() {
  const s = G.state;
  const rows = PRODUCTS.map((p, i) => {
    const lic = s.licenses[p.lic], mv = marketValue(i), pr = s.prices[i], r = pr / mv;
    const chip = r <= 0.95 ? '<span class="rt-chip good">Deal</span>' : r <= maxRatio() ? '<span class="rt-chip">Fair</span>' : '<span class="rt-chip bad">Too high</span>';
    const trend = G.fx.drop > 0 && p.shape === 'shoe' ? '<span class="rt-chip hot">▲ +50% hype</span>' : '';
    return `<tr class="${lic ? '' : 'locked'}"><td><i class="rt-dot" style="--c:#${p.color.toString(16).padStart(6, '0')}"></i>${p.name}${p.rare ? ' <em class="rt-rare">RARE</em>' : ''}</td><td>${money(mv)} ${trend}</td><td>${lic ? money(s.basis[i]) : '—'}</td><td>${lic ? money(pr) + ' ' + chip : '🔒'}</td><td>${lic ? `<button class="rt-small" data-do="priceFor" data-p="${i}">Set price</button>` : ''}</td></tr>`;
  }).join('');
  const lv = s.tracks.autosell;
  const online = lv ? `<p>Your online store sells 1 shelf item every <b>${autoSellFor(lv)}s</b> when it’s priced at or below 1.3× market. Next sale in <b data-autosell>${fmtTime(G.autosellT)}</b>. Online sales so far: <b>${s.stats.online}</b>.</p>` : `<p>Buy <b>Automatic Selling</b> in Upgrade your empire to open an online store.</p><button class="rt-ghost" data-do="tab" data-tab="2">Go to upgrades</button>`;
  const bulk = s.dock.length ? s.dock.map((b, k) => b.open ? '' : `<div class="rt-eta"><span>📦 ${PRODUCTS[b.p].name} ×${b.n}</span><button class="rt-small" data-do="bulkSell" data-k="${k}">Sell for ${money(bulkValue(b))}</button></div>`).join('') || '<p class="rt-muted">Only sealed boxes can be sold to the bulk buyer.</p>' : '<p class="rt-muted">Nothing on the dock to sell.</p>';
  return `<h5>Market prices</h5><table class="rt-table"><thead><tr><th>Item</th><th>Market value</th><th>Avg cost</th><th>Your price</th><th></th></tr></thead><tbody>${rows}</tbody></table>
    <div class="rt-two"><div class="rt-box"><h5>🌐 Online store</h5>${online}</div><div class="rt-box"><h5>🏷️ Bulk buyer</h5><p class="rt-muted">Pays 80% of market value for sealed dock boxes.</p>${bulk}</div></div>`;
}
function lapUpgrades() {
  const s = G.state, nt = TIERS[s.tier + 1];
  const tiers = `<div class="rt-tiers">${TIERS.map((t, i) => `<div class="rt-tier ${i <= s.tier ? 'done' : ''} ${i === s.tier + 1 ? 'next' : ''}"><b>${t.name}</b><small>${t.cols.length * t.rows.length} shelves · ${t.w}×${t.d}m</small></div>`).join('<span class="rt-arrow">→</span>')}</div>
    ${nt ? `<div class="rt-card wide"><h4>🏗️ Expand to ${nt.name}</h4><p>Knock out the walls for a ${nt.w}×${nt.d}m floor and ${nt.cols.length * nt.rows.length} shelves. Your stock moves with you.</p>${buyBtn('Expand', nt.price, 'expand')}</div>` : '<p class="rt-done">🏆 Mega Mall unlocked. You run the block.</p>'}`;
  const curb = CURB.map(c => { const own = s.curb[c.id], need = c.needs && !s.curb[c.needs]; return `<div class="rt-card ${own ? 'owned' : ''}"><h4>${c.name}</h4><p>${c.desc}<br><small>+${Math.round(c.traffic * 100)}% traffic</small></p>${own ? '<span class="rt-owned">✓ Owned</span>' : need ? `<span class="rt-muted">Needs ${CURB.find(x => x.id === c.needs).name}</span>` : buyBtn('Buy', c.price, 'curb', `data-id="${c.id}"`)}</div>`; }).join('');
  const lic = LICENSES.map((l, i) => i === 0 ? '' : `<div class="rt-card ${s.licenses[i] ? 'owned' : ''}"><h4>📜 ${l.name}</h4><p>${l.desc}</p>${s.licenses[i] ? '<span class="rt-owned">✓ Licensed</span>' : !s.licenses[i - 1] ? `<span class="rt-muted">Needs ${LICENSES[i - 1].name}</span>` : buyBtn('Buy license', l.price, 'license', `data-i="${i}"`)}</div>`).join('');
  const tracks = TRACKS.map(t => { const l = s.tracks[t.id]; return `<div class="rt-card"><h4>${t.icon} ${t.name}</h4><div class="rt-pips">${[1, 2, 3, 4, 5].map(k => `<i class="${k <= l ? 'on' : ''}"></i>`).join('')}<small>Lv ${l}/5</small></div><p>${t.desc(l)}</p>${l >= 5 ? '<span class="rt-owned">MAX</span>' : buyBtn(`Upgrade to Lv ${l + 1}`, trackPrice(t, l), 'track', `data-id="${t.id}"`)}</div>`; }).join('');
  const staff = STAFF.map(st => `<div class="rt-card ${s.staff[st.id] ? 'owned' : ''}"><h4>🤖 ${st.name}</h4><p>${st.desc}</p>${s.staff[st.id] ? '<span class="rt-owned">✓ Hired</span>' : buyBtn('Hire', st.price, 'hire', `data-id="${st.id}"`)}</div>`).join('');
  const perks = PERKS.map(p => { const l = s.perks[p.id]; return `<div class="rt-card"><h4>⚡ ${p.name}</h4><div class="rt-pips">${Array.from({ length: p.max }, (_, k) => `<i class="${k < l ? 'on' : ''}"></i>`).join('')}</div><p>${p.desc(l)}</p>${l >= p.max ? '<span class="rt-owned">MAX</span>' : buyBtn('Buy', Math.round(p.base * Math.pow(p.mult, l)), 'perk', `data-id="${p.id}"`)}</div>`; }).join('');
  const arc = `<div class="rt-card wide ${s.arcade ? 'owned' : ''}"><h4>🕹️ Retro Arcade Cabinet</h4><p>A glowing arcade machine by the back wall. Play Snake, Tic-Tac-Toe, Memory Match, and Reaction Rush inside your shop while AI staff run the store. Trade Arcade Tokens for cash, free stock, and golden items.</p>${s.arcade ? '<span class="rt-owned">✓ Installed · walk up and press E</span>' : buyBtn('Install cabinet', 500, 'buyArcade')}</div>`;
  return `<h5>Store expansion</h5>${tiers}<h5>Arcade</h5>${arc}<h5>Signs & curb appeal</h5><div class="rt-grid">${curb}</div><h5>Product licenses</h5><div class="rt-grid">${lic}</div><h5>Operations</h5><div class="rt-grid">${tracks}</div><h5>Hire AI staff & perks</h5><div class="rt-grid">${staff}${perks}</div>`;
}
function lapDecor() {
  const s = G.state;
  return `<p class="rt-muted">Changes show up in the store instantly. Owned styles are free to switch. You can also use the 🎨 Paint tool on a wall.</p>` + Object.entries(DECOR).map(([k, d]) => `<h5>${d.label}</h5><div class="rt-grid small">${d.opts.map(([name, price], i) => { const own = s.owned[k].includes(i), on = s.decor[k] === i; return `<div class="rt-card ${on ? 'owned' : ''}"><div class="rt-decor rt-decor-${k}-${i}"></div><h4>${name}</h4>${on ? '<span class="rt-owned">✓ Applied</span>' : own ? `<button class="rt-ghost" data-do="decor" data-k="${k}" data-i="${i}">Apply</button>` : buyBtn('Buy', price, 'decor', `data-k="${k}" data-i="${i}"`)}</div>`; }).join('')}</div>`).join('');
}
function lapGoals() {
  const s = G.state, r = rankOf(s.aura), next = RANKS[r + 1], st = s.stats;
  const pct = next ? clamp((s.aura - RANKS[r].need) / (next.need - RANKS[r].need), 0, 1) * 100 : 100;
  const daily = s.dailyDay !== s.day;
  return `<div class="rt-box"><h5>✦ Aura rank: ${RANKS[r].name}</h5><div class="rt-bar"><b style="width:${pct}%"></b></div><p class="rt-muted">${next ? `${Math.floor(s.aura)} / ${next.need} Aura to <b>${next.name}</b>. Fair prices, clean floors, and fast checkouts earn Aura.` : 'Max Aura tier reached. Profitmaxxer status.'}</p>
    <div class="rt-ranks">${RANKS.map((x, i) => `<span class="${i <= r ? 'on' : ''}">${x.name}</span>`).join('→')}</div></div>
    <div class="rt-box"><h5>🎁 Day ${s.day} reward</h5><p>${daily ? `Claim ${money(dailyValue())} for opening on day ${s.day}.` : 'Claimed. A new reward unlocks tomorrow in-game.'}</p>${daily ? `<button class="rt-buy" data-do="daily">Claim <b>${money(dailyValue())}</b></button>` : ''}</div>
    <div class="rt-btnrow"><button class="rt-buy" data-do="flex">📊 Flex Stats</button><button class="rt-ghost" data-do="tab" data-tab="7">♻️ Rebirth Franchise</button></div>
    <h5>🏆 Trophy wall</h5><div class="rt-grid small">${TROPHIES.map(t => { const on = s.trophies.includes(t.id); return `<div class="rt-card ${on ? 'owned' : 'locked'}"><div class="rt-trophy" style="--c:#${t.color.toString(16).padStart(6, '0')}">${on ? '🏆' : '🔒'}</div><h4>${t.name}</h4><p>${t.desc}</p></div>`; }).join('')}</div>
    <h5>📊 Lifetime stats</h5><div class="rt-stats">${[['Total cash earned', money(st.earned)], ['Lifetime profit', money(st.profit)], ['Items sold', st.sold], ['Highest single sale', money(st.highest)], ['Customers served', st.customers], ['Online sales', st.online], ['Trash cleaned', st.trash], ['Walkouts', st.walkouts]].map(([a, b]) => `<div><small>${a}</small><b>${b}</b></div>`).join('')}</div>`;
}
function lapReviews() {
  const r = G.state.reviews; if (!r.length) return '<p class="rt-muted">No reviews yet. Open the store and serve your first customer.</p>';
  const avg = r.reduce((a, x) => a + x.stars, 0) / r.length;
  return `<div class="rt-box"><h5>⭐ ${avg.toFixed(1)} average · ${r.length} reviews</h5></div>` + r.map(x => `<div class="rt-review"><b>${'★'.repeat(x.stars)}<i>${'★'.repeat(5 - x.stars)}</i></b><p>“${esc(x.text)}”</p><small>${esc(x.h)} · Day ${x.day}</small></div>`).join('');
}
/* ---------- Price tag ---------- */
function openPrice(pi) {
  G.priceEdit = { p: pi, v: G.state.prices[pi] };
  openModal('price', () => {
    const p = PRODUCTS[pi], e = G.priceEdit, mv = marketValue(pi), cost = G.state.basis[pi], r = e.v / mv;
    const verdict = r <= 0.95 ? ['good', 'Deal — shoppers will love it'] : r <= maxRatio() ? ['', 'Fair — most shoppers will buy'] : ['bad', 'Too high — expect complaints'];
    return `${head('🏷️ Shelf price tag', p.name)}<div class="rt-pricebox"><div><small>Market value</small><b>${money(mv)}</b></div><div><small>Avg cost</small><b>${money(cost)}</b></div><div><small>Profit / item</small><b class="${e.v - cost >= 0 ? 'pos' : 'neg'}">${money(e.v - cost)}</b></div></div>
      <div class="rt-bigprice">${money(e.v)}</div><p class="rt-verdict ${verdict[0]}">${verdict[1]}</p>
      <div class="rt-btnrow center"><button data-do="pAdj" data-d="-10">−10</button><button data-do="pAdj" data-d="-1">−1</button><button data-do="pAdj" data-d="1">+1</button><button data-do="pAdj" data-d="10">+10</button></div>
      ${slider('price', e.v, Math.max(1, Math.floor(mv * 0.5)), Math.ceil(p.value * 3), 1, money, 'pSlide')}
      <div class="rt-btnrow center"><button class="rt-ghost" data-do="pMatch">Match Market ${B(2, 'X')}</button><button class="rt-buy" data-do="pSave" data-autofocus>Set price ${B(0, 'Enter')}</button></div>`;
  }, { onClose: () => {} });
}
/* ---------- Payment ---------- */
function openPay() {
  const c = G.checkout, cu = c.customer; if (!cu) return;
  c.pay ||= { card: cu.vip === 'inspector' ? Math.random() < 0.5 : Math.random() < 0.6, entry: '', give: [], tender: 0 };
  const pay = c.pay; if (!pay.card && !pay.tender) { const bills = [5, 10, 20, 50, 100, 200, 500, 1000, 2000]; pay.tender = bills.find(b => b >= c.total && (b > c.total || Math.random() < 0.15)) || Math.ceil(c.total / 100) * 100; if (Math.random() < 0.15) pay.tender = c.total; }
  if (pay.card && G.state.perks.scanner) pay.entry = String(c.total);
  openModal('pay', () => {
    const change = pay.tender - c.total, given = pay.give.reduce((a, b) => a + b, 0);
    if (pay.card) return `${head('💳 Card payment', `${esc(cu.name)} is tapping their card`)}<div class="rt-terminal"><small>TOTAL DUE</small><b>${money(c.total)}</b><div class="rt-entry">${pay.entry ? '$' + pay.entry : '<i>enter amount</i>'}</div></div>
      <div class="rt-keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-do="key" data-v="${n}">${n}</button>`).join('')}<button data-do="key" data-v="C" class="warn">Clear</button><button data-do="key" data-v="0">0</button><button data-do="key" data-v="B">⌫</button></div>
      <div class="rt-btnrow center"><button class="rt-buy" data-do="payCard" ${pay.entry ? 'data-autofocus' : ''}>Charge card ${B(0, 'Enter')}</button></div>`;
    return `${head('💵 Cash payment', `${esc(cu.name)} paid with cash`)}<div class="rt-pricebox"><div><small>Total</small><b>${money(c.total)}</b></div><div><small>Customer paid</small><b>${money(pay.tender)}</b></div><div><small>Change due</small><b class="pos">${money(change)}</b></div></div>
      <div class="rt-terminal"><small>CHANGE IN TRAY</small><b class="${given === change ? 'pos' : ''}">${money(given)}</b></div>
      <div class="rt-keypad cash">${[1, 5, 10, 20, 50, 100].map(n => `<button data-do="giveBill" data-v="${n}" class="bill">${money(n)}</button>`).join('')}<button data-do="giveBill" data-v="undo" class="warn">Undo</button><button data-do="giveBill" data-v="clear" class="warn">Clear</button></div>
      <div class="rt-btnrow center"><button class="rt-buy" data-do="payCash" ${change === 0 ? 'data-autofocus' : ''}>${change === 0 ? 'Exact cash — finish' : 'Give change'} ${B(0, 'Enter')}</button></div>`;
  }, { onClose: () => {} });
}
/* ---------- Settings / Pause ---------- */
const SET_TABS = ['Graphics', 'Audio', 'Controller', 'Game'];
function openSettings(tab = 0) {
  if (G.modals.some(m => m.id === 'settings')) return;
  G.paused = G.mode === 'play';
  openModal('settings', renderSettings, { cls: 'rt-settings', tab, tabs: SET_TABS.length, onClose: () => { G.paused = false; G.pad.listen = null; G.listening = null; } });
}
function renderSettings(e) {
  const st = G.settings, c = G.ctrl, padName = G.pad.pad ? `${BRAND_NAME[G.pad.brand]} — ${esc(G.pad.id.slice(0, 48))}` : G.pad.blocked ? 'Controller access is blocked on this page. Open the game on its own site (like GitHub Pages).' : 'No controller detected. Connect one and press any button.';
  let body = '';
  if (e.tab === 0) body = row('Graphics quality', seg('preset', [['Low', 'Low'], ['Medium', 'Medium'], ['High', 'High']], st.preset), 'Low is best for Chromebooks') + row('Shadows', tog('shadows', st.shadows)) + row('Render distance', slider('distance', st.distance, 30, 140, 5, v => v + 'm')) + row('Auto-quality', tog('adaptive', st.adaptive), 'Under 25 FPS for 3s: lowers shadows, then resolution') + row('FPS counter', tog('fps', st.fps)) + row('Floating labels', tog('labels', st.labels)) + row('Camera', seg('third', [['false', 'First person'], ['true', 'Third person']], st.third)) + row('Field of view', slider('fov', st.fov, 60, 95, 1, v => v + '°')) + row('Mouse sensitivity', slider('sens', st.sens, 0.3, 3, 0.1, v => (+v).toFixed(1) + 'x')) + row('Invert mouse Y', tog('invertY', st.invertY)) + row('Fullscreen', `<button class="rt-ghost" data-do="fullscreen">⛶ Toggle fullscreen ${B('fullscreen')}</button>`);
  if (e.tab === 1) body = row('Master volume', slider('master', st.master, 0, 1, 0.05, v => Math.round(v * 100) + '%')) + row('Music', slider('music', st.music, 0, 1, 0.05, v => Math.round(v * 100) + '%'), 'Lo-fi store beats, moodier at night') + row('Sound effects', slider('sfx', st.sfx, 0, 1, 0.05, v => Math.round(v * 100) + '%')) + row('Mute all', tog('muted', st.muted), 'Quick mute: M') + row('Test sound', '<button class="rt-ghost" data-do="testSound">Cha-ching!</button>');
  if (e.tab === 2) body = `<div class="rt-box rt-monitor"><div class="rt-mon-head"><b>🎮 Live Controller Monitor</b><button class="rt-small" data-do="testRumble">📳 Test Rumble</button></div>
      <div class="rt-mon-grid"><div><small>Controller</small><b data-mon-name>${padName}</b></div><div><small>Left stick</small><b data-mon-ls>0.00, 0.00</b><i class="rt-mon-stick"><em data-mon-lsd></em></i></div><div><small>Right stick</small><b data-mon-rs>0.00, 0.00</b><i class="rt-mon-stick"><em data-mon-rsd></em></i></div><div><small>Last button</small><b data-mon-btn>—</b></div><div><small>Rumble</small><b data-mon-rum>—</b></div></div></div>` + row('Button icons', seg('style', [['auto', 'Auto-Detect'], ['xbox', 'Xbox'], ['ps', 'PlayStation'], ['switch', 'Switch']], c.style, 'cset')) + row('Look sensitivity', slider('sens', c.sens, 0.5, 3, 0.1, v => (+v).toFixed(1) + 'x', 'cslide')) + row('Stick deadzone', slider('deadzone', c.deadzone, 0.05, 0.4, 0.01, v => (+v).toFixed(2), 'cslide')) + row('Invert Y-axis', tog('invertY', c.invertY, 'ctog')) + row('Vibration / rumble', tog('rumble', c.rumble, 'ctog')) + row('Aim assist', tog('aimAssist', c.aimAssist, 'ctog'), 'Snaps to the nearest prompt within 2.2m')
    + `<h5>Button mapping</h5><table class="rt-table rt-remap"><tbody>${ACTIONS.map(a => `<tr><td>${a.name}</td><td><span class="rt-pb ${G.pad.cls(c.map[a.id])}">${esc(G.pad.label(c.map[a.id]))}</span></td><td><button class="rt-small ${G.listening === a.id ? 'listening' : ''}" data-do="rebind" data-a="${a.id}">${G.listening === a.id ? 'Listening… press any controller button' : 'Rebind'}</button></td></tr>`).join('')}</tbody></table>
    <div class="rt-btnrow"><button class="rt-ghost" data-do="resetControls">Reset Controls to Default</button></div><p class="rt-muted">Menus always use ${B(0)} confirm, ${B(1)} back, ${B(4)}/${B(5)} tabs, D-pad or left stick to move, and the right stick for a virtual cursor.</p>`;
  if (e.tab === 3) body = row('Resume', `<button class="rt-buy" data-do="close">Resume ${B(1, 'Esc')}</button>`) + row('Replay intro', '<button class="rt-ghost" data-do="replayIntro">Replay Intro</button>') + row('Tutorial', `<button class="rt-ghost" data-do="restartTutorial">Restart tutorial</button>`) + row('Save', `<button class="rt-ghost" data-do="saveNow">Save now</button>`, LS.ok ? 'Auto-saves every 15 seconds' : 'Browser storage is blocked here. Use save codes.')
    + row('Save code', `<button class="rt-ghost" data-do="exportCode">Copy save code</button><button class="rt-ghost" data-do="importCode">Load save code</button>`, 'Move your progress between devices') + `<textarea class="rt-code" data-code placeholder="Paste an RT3 (or older RT2) save code here" rows="2"></textarea>` + row('Quit to title', '<button class="rt-ghost" data-do="toTitle">Title screen</button>') + row('New save', '<button class="rt-ghost danger" data-do="askReset">Reset progress</button>');
  return `${head(G.mode === 'play' ? '⏸️ PAUSED' : '⚙️ SETTINGS', 'Settings save automatically')}${modalTabs(e, SET_TABS)}<div class="rt-scroll">${body}</div>`;
}
function confirmBox(title, text, yes, onYes) {
  openModal('confirm', () => `${head(title)}<p>${text}</p><div class="rt-btnrow center"><button class="rt-ghost" data-do="close" data-autofocus>Cancel</button><button class="rt-buy danger" data-do="confirmYes">${yes}</button></div>`, { cls: 'rt-small-modal' });
  G.confirmYes = onYes;
}
function openCredits() {
  openModal('credits', () => `${head('🎮 CREDITS')}<div class="rt-credits"><h2>RESELL TYCOON</h2><p>A <b>JaydenGames</b> production.</p><p>Game design & store empire: JaydenGames<br>3D engine: three.js (MIT)<br>Music & sound: generated live with the Web Audio API<br>Slang consultants: every TikTok comment section 2023–2026</p><p class="rt-muted">Thanks for playing. Stay locked in.</p></div><div class="rt-btnrow center"><button class="rt-buy" data-do="close" data-autofocus>Back</button></div>`, { cls: 'rt-small-modal' });
}
function openWelcome(info) {
  openModal('welcome', () => {
    const can2 = G.state.boostDay !== todayKey();
    return `<div class="rt-welcome"><h2>WELCOME BACK!</h2><p>You were away for <b>${fmtDur(info.secs)}</b>.</p><div class="rt-wb-cash">+${money(info.amount)}</div><p class="rt-muted">${info.lines.join(' · ')}</p>
    <div class="rt-btnrow center"><button class="rt-buy" data-do="claim" data-autofocus>CLAIM ${B(0, 'Enter')}</button><button class="rt-buy gold" data-do="claim2" ${can2 ? '' : 'disabled'}>2X BOOST CLAIM ${B(2, 'X')}</button></div><p class="rt-muted small">${can2 ? 'The 2X boost can be used once per day.' : 'Daily 2X boost already used today.'}</p></div>`;
  }, { cls: 'rt-small-modal', locked: true });
  G.welcome = info;
}
/* ---------- Title screen ---------- */
function renderTitle() {
  const el = $('[data-title]'), sv = G.savedState;
  const pill = sv ? `<div class="rt-savepill">💾 Save found · <b>${money(sv.cash)}</b> · ${TIERS[sv.tier].name} · Day ${sv.day} · ✦ ${RANKS[rankOf(sv.aura)].name}${sv.rebirths ? ` · <b class="rt-pbadge">★ PRESTIGE ${sv.rebirths}</b>` : ''}</div>` : '<div class="rt-savepill new">✨ New store · Start from zero</div>';
  el.innerHTML = `<div class="rt-logo"><span>RESELL</span><b>TYCOON</b><small>by JaydenGames</small></div>${pill}
    <div class="rt-menu"><button class="rt-buy big" data-do="play" data-autofocus>${sv ? '▶ PLAY' : '▶ PLAY'}</button><button class="rt-ghost" data-do="newSave">${sv ? 'NEW SAVE / RESET' : 'NEW SAVE'}</button><button class="rt-ghost" data-do="wardrobe">👕 CUSTOMIZE AVATAR</button><button class="rt-ghost" data-do="flex">📊 FLEX STATS</button><button class="rt-ghost" data-do="titleSettings">SETTINGS</button><button class="rt-ghost" data-do="credits">CREDITS</button></div>
    <div class="rt-titlehint">${B(0, 'Enter')} Select · ${B(3, 'F11')} Fullscreen · ${G.inputMode === 'pad' ? 'D-pad to move' : 'Click to play'}</div>`;
  refreshBadges(el);
}

/* ---------- Economy ---------- */
function marketValue(i) { const p = PRODUCTS[i]; return Math.round(p.value * (G.fx.drop > 0 && p.shape === 'shoe' ? 1.5 : 1)); }
function unitCost(i) { return PRODUCTS[i].cost * (1 - 0.05 * G.state.tracks.suppliers) * (G.fx.discount > 0 ? 0.7 : 1); }
function boxPrice(i) { return Math.max(1, Math.round(unitCost(i) * PRODUCTS[i].per)); }
function maxRatio() { return 1.25 + 0.06 * G.state.tracks.showroom + 0.04 * rankOf(G.state.aura); }
function bulkValue(b) { return Math.round(PRODUCTS[b.p].value * b.n * 0.8); }
function dailyValue() { return Math.min(600, 40 + 30 * G.state.tier + 10 * G.state.day); }
function carryCap() { return 1 + G.state.perks.carry; }
function unitsOnHand(i) {
  const s = G.state; let n = 0;
  s.shelves.forEach(x => { if (x.p === i) n += x.n; }); [...s.dock, ...s.carry, ...s.floorBoxes].forEach(b => { if (b.p === i) n += b.n; });
  s.orders.forEach(o => { if (o.p === i) n += o.boxes * PRODUCTS[i].per; }); return n;
}
function spend(n) { if (G.state.cash < n) { G.sound.play('error'); toast('Not enough cash', 'bad'); return false; } G.state.cash -= n; return true; }
function earn(n, pos, label, raw) { if (!raw) n = Math.round(n * prestigeMult()); G.state.cash += n; G.state.stats.earned += n; if (pos) popup(`+${money(n)}${label ? ' ' + label : ''}`, pos, 'cash'); }
function addAura(n, pos) {
  if (n > 0) { n = Math.round(n * prestigeMult()); G.auraGain = (G.auraGain || 0) + n; }
  const before = rankOf(G.state.aura); G.state.aura = Math.max(0, G.state.aura + n);
  if (pos && n) popup(`${n > 0 ? '+' : ''}${n} ✦`, { ...pos, y: (pos.y || 2) + 0.35 }, n > 0 ? 'aura' : 'bad');
  const after = rankOf(G.state.aura); if (after > before) { toast(`✦ Rank up: <b>${RANKS[after].name}</b>`, 'good'); G.sound.play('fanfare'); }
  checkTrophies();
}
function orderStock(p, n) {
  const s = G.state, cap = dockCapFor(s.tracks.warehouse), used = s.dock.length + s.orders.reduce((a, o) => a + o.boxes, 0);
  if (!s.licenses[PRODUCTS[p].lic]) return;
  if (used + n > cap) { G.sound.play('error'); toast(`Dock is full (${cap} boxes). Upgrade Bigger Warehouse.`, 'bad'); return; }
  const price = boxPrice(p) * n; if (!spend(price)) return;
  const have = unitsOnHand(p), add = PRODUCTS[p].per * n; s.basis[p] = (s.basis[p] * have + unitCost(p) * add) / Math.max(1, have + add);
  const t = (s.tutorial >= 0 && s.tutorial < 7) ? 4 : deliveryFor(s.tracks.delivery);
  s.orders.push({ p, boxes: n, t, total: t }); G.sound.play('buy'); G.pad.rumble(0.3, 60);
  toast(`🚚 Ordered ${n}× ${PRODUCTS[p].name} box${n > 1 ? 'es' : ''} — arriving in ${t}s`);
  tutorialEvent('order', p); requestSave(); refreshModal('laptop');
}
function updateOrders(dt) {
  const s = G.state, cap = dockCapFor(s.tracks.warehouse); let changed = false;
  for (const o of s.orders) o.t = Math.max(0, o.t - dt);
  for (let k = 0; k < s.orders.length; k++) {
    const o = s.orders[k]; if (o.t > 0) continue;
    while (o.boxes > 0 && s.dock.length < cap) { s.dock.push({ p: o.p, n: PRODUCTS[o.p].per, open: false }); o.boxes--; changed = true; }
    if (o.boxes <= 0) { s.orders.splice(k, 1); k--; } else if (!o.warned) { o.warned = true; toast('📦 Dock is full. Move some boxes to make room.', 'warn'); }
  }
  if (changed) { refreshDock(); G.sound.play('thud'); toast('📦 Delivery arrived at the dock'); G.truckT = 3; requestSave(); }
}
/* ---------- Carrying, stocking, boxes ---------- */
function topCarry() { return G.state.carry[G.state.carry.length - 1]; }
function pickupDock(k) {
  const s = G.state; if (s.carry.length >= carryCap()) { toast(`Hands full. Multi-Box Carry lets you hold more.`, 'warn'); return; }
  const [b] = s.dock.splice(k, 1); s.carry.push(b); refreshDock(); refreshCarry(); G.sound.play('thud'); G.pad.rumble(0.35, 70); tutorialEvent('carry');
}
function pickupFloor(b) {
  const s = G.state; if (s.carry.length >= carryCap()) { toast('Hands full.', 'warn'); return; }
  s.floorBoxes.splice(s.floorBoxes.indexOf(b), 1); G.floorGroup.remove(b._mesh); delete b._mesh; s.carry.push(b); refreshCarry(); G.sound.play('thud'); tutorialEvent('carry');
}
function dropCarry(throwSpeed = 2.5) {
  const s = G.state, b = s.carry.pop(); if (!b) return; const pl = G.player, fx = -Math.sin(pl.yaw), fz = -Math.cos(pl.yaw);
  b.x = pl.x + fx * 0.7; b.z = pl.z + fz * 0.7; b.y = 1.0; b.vx = fx * throwSpeed; b.vz = fz * throwSpeed; b.vy = 1.2;
  s.floorBoxes.push(b); const m = makeBox(b); m.position.set(b.x, b.y, b.z); G.floorGroup.add(m); b._mesh = m;
  refreshCarry(); G.sound.play('whoosh'); G.pad.rumble(0.25, 60);
}
function toggleFlaps() { const b = topCarry(); if (!b) return false; b.open = !b.open; refreshCarry(); G.sound.play('open'); G.pad.rumble(0.2, 40); return true; }
function placeItem(sh) {
  const s = G.state, b = topCarry(), d = s.shelves[sh.i];
  if (!b || !b.open || b.n <= 0) return false;
  if (d.p !== -1 && d.p !== b.p && d.n > 0) { toast(`This shelf holds ${PRODUCTS[d.p].name}.`, 'warn'); return false; }
  if (d.n >= shelfCap()) { toast('Shelf is full. Upgrade More Inventory Space.', 'warn'); return false; }
  d.p = b.p; d.n++; b.n--; refreshShelf(sh); refreshCarry(); G.sound.play('pop'); G.pad.rumble(0.15, 30);
  sparkle({ x: sh.x, y: 1, z: sh.z - 0.3 }, 6, 0x9cf5c2);
  tutorialEvent('stock'); return true;
}
function tossBox() {
  const b = topCarry(); if (!b) return; G.state.carry.pop(); refreshCarry();
  const bonus = b.n === 0 ? 2 : 0; if (bonus) earn(bonus, { x: G.P.dumpster.x, y: 1.6, z: G.P.dumpster.z }, 'recycled');
  if (b.n > 0) toast(`Tossed ${b.n} ${PRODUCTS[b.p].name}`, 'warn'); G.sound.play('thud'); requestSave();
}
function updateFloorBoxes(dt) {
  for (const b of G.state.floorBoxes) {
    if (!b._mesh || (Math.abs(b.vx || 0) + Math.abs(b.vy || 0) + Math.abs(b.vz || 0) < 0.01 && b.y <= 0.001)) continue;
    b.vy -= 18 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    if (b.y <= 0) { b.y = 0; if (Math.abs(b.vy) > 2) G.sound.play('thud'); b.vy = Math.abs(b.vy) > 2 ? -b.vy * 0.3 : 0; b.vx *= 0.6; b.vz *= 0.6; if (Math.abs(b.vx) < 0.05) b.vx = 0; if (Math.abs(b.vz) < 0.05) b.vz = 0; }
    for (const c of G.allCols) { if (b.y > c.maxY || c.kind === 'low') continue; if (b.x > c.minX - 0.3 && b.x < c.maxX + 0.3 && b.z > c.minZ - 0.25 && b.z < c.maxZ + 0.25) { const dx1 = b.x - (c.minX - 0.3), dx2 = (c.maxX + 0.3) - b.x, dz1 = b.z - (c.minZ - 0.25), dz2 = (c.maxZ + 0.25) - b.z, m = Math.min(dx1, dx2, dz1, dz2); if (m === dx1) { b.x = c.minX - 0.3; b.vx = -Math.abs(b.vx) * 0.4; } else if (m === dx2) { b.x = c.maxX + 0.3; b.vx = Math.abs(b.vx) * 0.4; } else if (m === dz1) { b.z = c.minZ - 0.25; b.vz = -Math.abs(b.vz) * 0.4; } else { b.z = c.maxZ + 0.25; b.vz = Math.abs(b.vz) * 0.4; } } }
    b.x = clamp(b.x, -40, 40); b.z = clamp(b.z, -15, 20); b._mesh.position.set(b.x, b.y, b.z); b._mesh.rotation.y += (b.vx || 0) * dt;
  }
}
/* ---------- Purchases ---------- */
function buyTrack(id) { const t = TRACKS.find(x => x.id === id), l = G.state.tracks[id]; if (l >= 5 || !spend(trackPrice(t, l))) return; G.state.tracks[id]++; afterUpgrade(`${t.name} Lv ${l + 1}`, id === 'showroom' || id === 'inventory'); }
function buyCurb(id) { const c = CURB.find(x => x.id === id); if (G.state.curb[id] || (c.needs && !G.state.curb[c.needs]) || !spend(c.price)) return; G.state.curb[id] = true; afterUpgrade(c.name, true); }
function buyLicense(i) { if (G.state.licenses[i] || !G.state.licenses[i - 1] || !spend(LICENSES[i].price)) return; G.state.licenses[i] = true; afterUpgrade(`${LICENSES[i].name} license`); }
function hireStaff(id) { const st = STAFF.find(x => x.id === id); if (G.state.staff[id] || !spend(st.price)) return; G.state.staff[id] = true; spawnStaff(); afterUpgrade(`Hired ${st.name}`); }
function buyPerk(id) { const p = PERKS.find(x => x.id === id), l = G.state.perks[id]; if (l >= p.max || !spend(Math.round(p.base * Math.pow(p.mult, l)))) return; G.state.perks[id]++; afterUpgrade(p.name); }
function expandStore() {
  const s = G.state, nt = TIERS[s.tier + 1]; if (!nt || !spend(nt.price)) return;
  // keep stock: pull shelf items into boxes on the dock if new layout has fewer slots (never happens) — layouts only grow
  s.tier++; if (!s.curb.repair) s.curb.repair = true;
  G.npcs.forEach(n => { if (n.inside) { n.x = 0; n.z = 1; } });
  afterUpgrade(`Expanded to ${nt.name}`, true);
  const pl = G.player; pl.x = 0; pl.z = 1.5;
}
function buyDecor(k, i) {
  const s = G.state, price = DECOR[k].opts[i][1];
  if (!s.owned[k].includes(i)) { if (!spend(price)) return; s.owned[k].push(i); G.sound.play('buy'); toast(`🎨 Bought ${DECOR[k].opts[i][0]}`, 'good'); }
  s.decor[k] = i; applyDecor(); sparkle({ x: G.player.x, y: 2, z: G.player.z + 1 }, 14, 0xff3dbb); requestSave(); refreshModal('laptop');
}
function afterUpgrade(name, rebuild) {
  G.sound.play('fanfare'); G.pad.rumble(0.5, 120); toast(`⬆️ ${name}`, 'good');
  if (rebuild) { buildStore(); G.npcs.forEach(n => n.path = []); }
  sparkle({ x: G.player.x, y: 2, z: G.player.z }, 24, 0x4dff88); popup('UPGRADED!', { x: G.player.x - Math.sin(G.player.yaw) * 2, y: 2.2, z: G.player.z - Math.cos(G.player.yaw) * 2 }, 'aura');
  addAura(3); checkTrophies(); requestSave(); refreshModal('laptop'); refreshShelfHeads();
}
function refreshShelfHeads() { refreshAllShelves(); }
function checkTrophies() {
  const s = G.state; let got = false;
  TROPHIES.forEach(t => { if (!s.trophies.includes(t.id) && t.test(s)) { s.trophies.push(t.id); got = true; toast(`🏆 Trophy unlocked: <b>${t.name}</b>`, 'gold'); } });
  if (got) { G.sound.play('trophy'); refreshTrophies(); drawBoard(); sparkle({ x: G.P.trophy.x, y: 1.6, z: G.P.trophy.z }, 30, 0xffd166); requestSave(); }
}
/* ---------- Customers ---------- */
const FIRST = ['Ava', 'Leo', 'Mia', 'Kai', 'Zoe', 'Eli', 'Nia', 'Max', 'Ivy', 'Jay', 'Sky', 'Rex', 'Lux', 'Ace', 'Bea', 'Dex'];
function storeLook() { const s = G.state; return s.tier * 2 + (s.curb.repair ? 1 : 0) + (s.decor.walls ? 1 : 0) + (s.decor.floor ? 1 : 0) + (s.decor.lights ? 0.5 : 0) + s.tracks.showroom * 0.6 - G.trash.length * 0.5; }
function enterLine() { const l = storeLook(); return pick(l < 1.5 ? SLANG.enterRundown : l < 4 ? SLANG.enterMid : l < 7 ? SLANG.enterNice : SLANG.enterLux); }
function trafficMult() { const s = G.state; let m = 1 + 0.12 * s.tracks.customers + 0.08 * rankOf(s.aura); CURB.forEach(c => { if (s.curb[c.id]) m += c.traffic; }); if (G.fx.flash > 0) m *= 2; if (G.fx.viral > 0) m *= 2; return m; }
function insideCap() { return 3 + G.state.tier * 2 + (G.fx.viral > 0 || G.fx.flash > 0 ? 2 : 0); }
function say(n, text, dur = 3.6) { n.bubble = { text, t: dur }; }
function makeNPC(kind, opt = {}) {
  const vipOpt = { influencer: { shirt: 0xff3dbb, pants: 0xffffff, halo: true, phone: true, hat: 'hair', hairColor: 0xff77cc }, hypebeast: { shirt: 0x111111, pants: 0x3a86ff, chain: true, hat: 'cap', hatColor: 0xff3b3b }, inspector: { shirt: 0x2b2d42, pants: 0x2b2d42, tie: true, clip: true, hat: 'hair', hairColor: 0x111111, face: 2 }, cashier: { shirt: 0x2dc653, pants: 0x1d3557, hat: 'cap', hatColor: 0x2dc653 }, restocker: { shirt: 0xfb8500, vest: 0xffd60a, pants: 0x264653, hat: 'beanie', hatColor: 0xfb8500 } }[kind] || {};
  const av = makeAvatar(vipOpt); G.scene.add(av.root);
  const n = { av, kind, x: opt.x ?? 0, z: opt.z ?? 0, yaw: 0, path: [], speed: kind === 'hypebeast' ? 2.1 : rand(1.5, 1.9), state: 'idle', wants: [], cart: [], patience: 60, name: opt.name || pick(FIRST), bubble: null, t: 0, vip: ['influencer', 'hypebeast', 'inspector'].includes(kind) ? kind : null };
  if (n.vip) n.tag = { influencer: '@dripmaxxer_live', hypebeast: 'Hypebeast', inspector: 'Rival Inspector' }[kind];
  av.root.position.set(n.x, 0, n.z); return n;
}
function wantsFor(n) {
  const s = G.state, lic = PRODUCTS.map((p, i) => i).filter(i => s.licenses[PRODUCTS[i].lic]);
  const stocked = [...new Set(s.shelves.slice(0, G.shelves.length).filter(x => x.p >= 0 && x.n > 0).map(x => x.p))];
  if (n.vip === 'hypebeast') { const rare = stocked.filter(i => PRODUCTS[i].rare); return rare.length ? [pick(rare), ...(Math.random() < 0.5 ? [pick(rare)] : [])] : [pick(stocked.length ? stocked : lic)]; }
  const k = randi(1, n.vip ? 3 : (Math.random() < 0.3 ? 3 : 2)), out = [];
  for (let i = 0; i < k; i++) out.push(stocked.length && Math.random() < 0.82 ? pick(stocked) : pick(lic));
  return out;
}
function spawnCustomer(kind = 'shopper', opt = {}) {
  const P = G.P; let sp = opt.at || pick(P.spawn);
  if (!opt.at) { if (P.busStop && Math.random() < 0.25) sp = { x: P.busStop.x + rand(-1, 1), z: -3.3 }; else if (G.state.curb.parking && Math.random() < 0.25) sp = { x: 16.5 + rand(-3, 3), z: 3 }; }
  const n = makeNPC(kind, { x: sp.x, z: sp.z }); n.state = 'approach'; n.wants = opt.wants || wantsFor(n); n.patience = kind === 'inspector' ? 45 : 70;
  n.path = [[P.doorOut.x + rand(-0.4, 0.4), P.doorOut.z]]; G.npcs.push(n);
  if (n.vip) say(n, pick(SLANG[n.vip]), 4.5);
  return n;
}
function spawnPedestrian() {
  const dir = Math.random() < 0.5 ? 1 : -1, n = makeNPC('ped', { x: -42 * dir, z: dir > 0 ? -1.6 : -2.9 });
  n.state = 'walkby'; n.path = [[42 * dir, n.z]]; n.speed = rand(1.3, 1.9); G.npcs.push(n);
}
function npcGo(n, x, z) { n.path = G.nav.path(n.x, n.z, x, z); }
function shelfFor(p, n) {
  let best = null, bd = 1e9; G.shelves.forEach(sh => { const d = G.state.shelves[sh.i]; if (d.p === p && d.n > 0) { const dist = Math.hypot(sh.stand.x - n.x, sh.stand.z - n.z); if (dist < bd) { bd = dist; best = sh; } } });
  return best;
}
function updateNPC(n, dt) {
  n.t += dt; if (n.bubble) { n.bubble.t -= dt; if (n.bubble.t <= 0) n.bubble = null; }
  let moving = false;
  if (n.path.length) {
    const [tx, tz] = n.path[0], dx = tx - n.x, dz = tz - n.z, d = Math.hypot(dx, dz), step = n.speed * dt * (G.fx.viral > 0 ? 1.15 : 1);
    if (d <= step + 0.02) { n.x = tx; n.z = tz; n.path.shift(); } else { n.x += dx / d * step; n.z += dz / d * step; moving = true; const ty = Math.atan2(dx, dz); let dy = ty - n.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2; n.yaw += dy * Math.min(1, dt * 10); }
  }
  n.inside = n.z > 0.2 && Math.abs(n.x) < G.P.hw;
  n.av.root.position.set(n.x, 0, n.z); n.av.root.rotation.y = n.yaw; n.av.carrying = n.cart.length > 0 && n.kind !== 'cashier' || !!n.box;
  animateAvatar(n.av, moving ? n.speed : 0, dt, G.clock);
  const P = G.P;
  switch (n.state) {
    case 'walkby': if (!n.path.length) n.dead = true; if (!n.saidPass && Math.abs(n.x) < 4 && Math.random() < 0.02) { n.saidPass = true; if (Math.random() < 0.5) say(n, G.state.open ? enterLine() : pick(['Closed again? Cooked.', 'When does this place open fr?', 'Lowkey wanna shop here.'])); } break;
    case 'approach':
      if (!n.path.length) { if (!G.state.open) { say(n, pick(['Closed?? Cooked.', 'Store closed. The ick.'])); n.state = 'exit'; n.path = [[pick(P.spawn).x, -2.2]]; break; } npcGo(n, P.doorIn.x + rand(-0.5, 0.5), P.doorIn.z); n.state = 'enter'; }
      break;
    case 'enter': if (!n.path.length) { G.sound.play('ding'); if (!n.vip) say(n, enterLine()); n.state = 'next'; } break;
    case 'next': {
      if (!n.wants.length) { n.state = 'toQueue'; break; }
      const p = n.wants[0], sh = shelfFor(p, n);
      if (!sh) { n.wants.shift(); say(n, pick(SLANG.noStock)); n.unhappy = (n.unhappy || 0) + 1; addAura(-1, { x: n.x, y: 2.2, z: n.z }); n.state = 'wait'; n.wait = 1.6; break; }
      n.shelf = sh; npcGo(n, sh.stand.x + rand(-0.5, 0.5), sh.stand.z); n.state = 'toShelf'; break;
    }
    case 'wait': n.wait -= dt; if (n.wait <= 0) n.state = 'next'; break;
    case 'toShelf': if (!n.path.length) { n.state = 'browse'; n.wait = rand(1.0, 2.0); n.yaw = Math.PI; } break;
    case 'browse': n.wait -= dt; if (n.wait <= 0) {
      const p = n.wants.shift(), d = G.state.shelves[n.shelf.i];
      if (d.p !== p || d.n <= 0) { n.wants.unshift(p); n.state = 'next'; break; }
      const price = G.state.prices[p], r = price / marketValue(p), max = n.vip === 'hypebeast' ? 2.5 : maxRatio();
      if (r > max) { say(n, pick(SLANG.highPrice)); n.unhappy = (n.unhappy || 0) + 1; addAura(-2, { x: n.x, y: 2.2, z: n.z }); }
      else {
        const qty = Math.min(d.n, r < 0.9 && Math.random() < 0.5 ? 2 : 1);
        for (let q = 0; q < qty; q++) n.cart.push({ p, price, shelf: n.shelf.i, scanned: false });
        d.n -= qty; refreshShelf(n.shelf);
        if (r <= 0.92) { say(n, pick(SLANG.deal)); n.happy = (n.happy || 0) + 1; } else if (Math.random() < 0.5) say(n, pick(SLANG.fair));
      }
      n.state = n.wants.length ? 'next' : 'toQueue';
    } break;
    case 'toQueue':
      if (!n.cart.length) { n.state = 'leave'; leaveReview(n, false); break; }
      G.queue.push(n); n.state = 'queue'; n.qi = -1; break;
    case 'queue': {
      const qi = G.queue.indexOf(n); n.patience -= dt * (G.state.staff.cashier ? 0.5 : 1);
      if (qi !== n.qi) { n.qi = qi; const sp = P.queue[Math.min(qi, P.queue.length - 1)]; npcGo(n, sp.x, sp.z + (qi >= P.queue.length ? (qi - P.queue.length + 1) * 0.6 : 0)); }
      if (qi === 0 && !n.path.length && !G.checkout.customer) startCheckout(n);
      if (n.patience < 18 && !n.saidWait) { n.saidWait = true; say(n, pick(SLANG.waiting)); }
      if (n.patience <= 0) walkout(n);
      if (!n.path.length) n.yaw = lerp(n.yaw, Math.PI / 2, 0.1);
    } break;
    case 'counter': n.patience -= dt * 0.35; if (n.patience <= -25) walkout(n); n.yaw = Math.PI / 2; break;
    case 'leave': npcGo(n, P.doorIn.x, P.doorIn.z - 0.3); n.state = 'leaving'; break;
    case 'leaving': if (!n.path.length) { n.path = [[P.doorOut.x, P.doorOut.z], [pick(P.spawn).x, -2.2 + rand(-0.4, 0.4)]]; n.state = 'exit'; } break;
    case 'exit': if (!n.path.length) n.dead = true; break;
  }
}
function walkout(n) {
  const qi = G.queue.indexOf(n); if (qi >= 0) G.queue.splice(qi, 1);
  if (G.checkout.customer === n) clearCheckout();
  n.cart.forEach(it => { const d = G.state.shelves[it.shelf]; if (d && d.p === it.p && d.n < shelfCap()) d.n++; }); n.cart = []; refreshAllShelves();
  say(n, pick(SLANG.angry)); G.state.stats.walkouts++; addAura(-5, { x: n.x, y: 2.2, z: n.z }); leaveReview(n, false, 1); n.state = 'leave';
  if (n.vip) endVIP(n, false);
}
function leaveReview(n, bought, force) {
  let stars = force || (bought ? 3 + (n.happy ? 1 : 0) + (storeLook() > 4 ? 1 : 0) - (n.unhappy ? 1 : 0) - (n.patience < 15 ? 1 : 0) : 1 + (n.unhappy ? 0 : 1));
  stars = clamp(Math.round(stars), 1, 5); if (!bought && !force && Math.random() < 0.5) return;
  G.state.reviews.unshift({ h: n.tag && n.tag.startsWith('@') ? n.tag : pick(HANDLES), stars, text: pick(REVIEWS[stars]), day: G.state.day });
  G.state.reviews.length = Math.min(G.state.reviews.length, 40);
  if (stars >= 4) addAura(stars - 3);
}
/* ---------- Checkout ---------- */
function startCheckout(n) {
  const c = G.checkout; c.customer = n; c.total = 0; c.pay = null; c.items = []; c.start = G.clock; c.mistakes = 0; n.state = 'counter';
  n.cart.forEach((it, k) => { const m = itemTemplate(it.p).clone(), sp = G.P.counterItem(k); m.position.set(sp.x, sp.y, sp.z); m.rotation.y = rand(-0.4, 0.4); G.scene.add(m); it.mesh = m; c.items.push(it); });
  drawRegister(); if (n.vip === 'inspector') { say(n, 'Clock’s ticking. Fumble and you’re cooked.'); }
}
function scanItem(it) {
  const c = G.checkout; if (!c.customer || it.scanned) return;
  const list = G.state.perks.scanner ? c.items.filter(x => !x.scanned).slice(0, 2) : [it];
  list.forEach((x, k) => { x.scanned = true; c.total += x.price; const sp = G.P.bagItem(c.items.filter(y => y.scanned).length + k); x.mesh.position.set(sp.x, sp.y, sp.z); });
  G.sound.play('beep'); G.pad.rumble(0.25, 40); drawRegister(); refreshRegisterHUD();
  if (c.items.every(x => x.scanned)) { if (playerAtRegister()) setTimeout(() => { if (G && G.checkout.customer && !G.modals.length) openPay(); }, 250); }
}
function playerAtRegister() { const p = G.player, c = G.P.checkout; return Math.hypot(p.x - c.x, p.z - c.z) < 2.6; }
function finishPayment(ok) {
  const c = G.checkout, n = c.customer; if (!n) return;
  if (!ok) { c.mistakes++; G.sound.play('error'); G.pad.rumble(0.6, 150); say(n, pick(['Bro that’s not right.', 'Math ain’t mathing.', 'Nah run that back.', 'You fumbled the bag.'])); toast('That’s not right. Check the amount.', 'bad'); return; }
  closeModal('pay', true);
  const total = c.total, profit = c.items.reduce((a, x) => a + x.price - G.state.basis[x.p], 0), pos = { x: G.P.checkout.x, y: 1.8, z: G.P.checkout.z };
  earn(total, pos); const st = G.state.stats; st.sold += c.items.length; st.profit += profit; st.customers++; st.highest = Math.max(st.highest, total);
  const fair = c.items.every(x => x.price <= marketValue(x.p) * 1.1); addAura(fair ? 2 + (n.happy ? 1 : 0) : 1, pos);
  G.sound.play('cash'); G.pad.rumble(0.45, 90); sparkle(pos, 18, 0x4dff88);
  if (n.vip === 'influencer') { if (fair) { G.fx.viral = 30; st.viral++; addAura(50, pos); setBanner('🔥 VIRAL RUSH!', '2x shoppers for 30 seconds. +50 Aura', 30); toast('📱 @dripmaxxer_live posted your store. <b>VIRAL RUSH!</b>', 'gold'); G.sound.play('fanfare'); } else { say(n, 'Prices are rage bait. Not posting.'); } }
  if (n.vip === 'hypebeast') { const tip = Math.round(total * rand(0.2, 0.4)); earn(tip, { ...pos, y: 2.2 }, 'tip'); say(n, 'Heat secured. Keep the change, plug.'); }
  if (n.vip === 'inspector') { const t = G.clock - c.start; if (t < 30 && c.mistakes === 0) { earn(100, { ...pos, y: 2.3 }, 'bonus'); st.calm++; toast('😤 <b>Calm Under Pressure</b> +$100', 'gold'); say(n, 'Okay… you’re locked in. Respect.'); } else say(n, 'Mid performance. Expected.'); }
  if (!n.vip) say(n, pick(SLANG.happy));
  leaveReview(n, true); n.cart.forEach(x => G.scene.remove(x.mesh)); n.cart = []; n.state = 'leave'; if (n.vip) endVIP(n, true);
  G.queue.shift(); clearCheckout(); tutorialEvent('sale'); checkTrophies(); drawBoard(); requestSave();
}
function clearCheckout() { const c = G.checkout; c.items?.forEach(x => x.mesh && G.scene.remove(x.mesh)); G.checkout = { customer: null, total: 0, items: [] }; drawRegister(); refreshRegisterHUD(); closeModal('pay', true); }
function refreshRegisterHUD() {
  const el = $('[data-register]'), c = G.checkout; if (!el) return;
  const show = c.customer && playerAtRegister() && !G.modals.length; el.hidden = !show; if (!show) return;
  const left = c.items.filter(x => !x.scanned).length;
  el.innerHTML = `<b>🧾 ${esc(c.customer.name)}${c.customer.tag ? ` · ${esc(c.customer.tag)}` : ''}</b><span>${c.items.length - left}/${c.items.length} scanned · Total <b>${money(c.total)}</b></span>${left ? `<small>Aim at an item and ${B('useTool')} or ${B('interact')} to scan</small>` : `<small>${B('interact')} Take payment</small>`}`;
}
/* ---------- Staff ---------- */
function spawnStaff() {
  const s = G.state;
  if (s.staff.cashier && !G.staffNPC.cashier) { const n = makeNPC('cashier', { x: G.P.checkout.playerX, z: G.P.checkout.playerZ, name: 'Cashier Bot' }); n.state = 'staff'; n.tag = 'AI Cashier'; G.staffNPC.cashier = n; }
  if (s.staff.restocker && !G.staffNPC.restocker) { const n = makeNPC('restocker', { x: G.P.dock.x - 1, z: G.P.dock.z - 1.5, name: 'Restock Bot' }); n.state = 'idle'; n.tag = 'AI Restocker'; n.speed = 2.2; G.staffNPC.restocker = n; }
}
function updateStaff(dt) {
  const cs = G.staffNPC.cashier, P = G.P;
  if (cs) {
    const pc = P.checkout, away = !playerAtRegister() || G.modals.some(m => m.id === 'laptop');
    const hx = away ? pc.playerX : pc.playerX + 0.1, hz = away ? pc.playerZ : pc.playerZ + 1.2;
    if (Math.hypot(cs.x - hx, cs.z - hz) > 0.2 && !cs.path.length) npcGo(cs, hx, hz);
    updateNPC(cs, dt); cs.yaw = cs.path.length ? cs.yaw : -Math.PI / 2; cs.av.pose = G.checkout.customer && away ? 'scan' : '';
    const c = G.checkout;
    if (away && c.customer && c.customer.state === 'counter') {
      cs.work = (cs.work || 0) + dt;
      if (cs.work > 0.9) { cs.work = 0; const it = c.items.find(x => !x.scanned); if (it) scanItem(it); else { c.pay = null; finishPayment(true); } }
    }
  }
  const rs = G.staffNPC.restocker; if (!rs) return;
  updateNPC(rs, dt); const s = G.state;
  switch (rs.state) {
    case 'idle': rs.wait = (rs.wait || 0) - dt; if (rs.wait > 0) break; rs.wait = 1.5;
      for (let k = 0; k < s.dock.length; k++) { const b = s.dock[k], sh = G.shelves.find(x => { const d = s.shelves[x.i]; return (d.p === b.p || d.n === 0) && d.n < shelfCap(); }); if (sh) { rs.job = { k, sh }; npcGo(rs, P.dock.x - 0.4, P.dock.z - 1.0); rs.state = 'toDock'; break; } }
      break;
    case 'toDock': if (!rs.path.length) { const b = s.dock[rs.job.k]; if (!b) { rs.state = 'idle'; break; } s.dock.splice(rs.job.k, 1); refreshDock(); rs.box = b; b.open = true; const m = makeBox(b); m.scale.setScalar(0.8); rs.av.carry.add(m); rs.boxMesh = m; npcGo(rs, rs.job.sh.stand.x + 0.4, rs.job.sh.stand.z); rs.state = 'toShelf'; } break;
    case 'toShelf': if (!rs.path.length) { rs.state = 'stock'; rs.wait = 0.35; rs.yaw = Math.PI; } break;
    case 'stock': rs.yaw = Math.PI; rs.wait -= dt; if (rs.wait <= 0) { rs.wait = 0.35; const d = s.shelves[rs.job.sh.i], b = rs.box;
      if (b.n > 0 && (d.p === b.p || d.n === 0) && d.n < shelfCap()) { d.p = b.p; d.n++; b.n--; refreshShelf(rs.job.sh); G.sound.play('pop'); updateBoxMesh(rs.boxMesh); }
      else { rs.av.carry.remove(rs.boxMesh); rs.boxMesh = null; if (b.n > 0) { if (s.dock.length < dockCapFor(s.tracks.warehouse)) { b.open = false; s.dock.push(b); refreshDock(); } } else earn(1); rs.box = null; rs.state = 'idle'; requestSave(); } } break;
  }
}
/* ---------- Events, VIPs, trash ---------- */
function setBanner(title, desc, dur) { G.banner = { title, desc, t: dur, dur }; }
function startEvent(def) {
  G.sound.play('event'); G.pad.rumble(0.3, 100);
  if (def.vip) { const n = spawnCustomer(def.vip); G.vipNPC = n; setBanner(`⭐ ${def.name}`, def.desc, def.dur); }
  else if (def.id === 'trash') { setBanner(`🧹 ${def.name}`, def.desc, def.dur); for (let i = 0; i < 3; i++) spawnTrash(); }
  else { G.fx[def.id] = def.dur; setBanner(`⚡ ${def.name}`, def.desc, def.dur); }
  toast(`<b>${def.name}</b> — ${def.desc}`, 'gold'); refreshModal('laptop');
}
function endVIP(n, ok) { if (G.vipNPC === n) { G.vipNPC = null; if (G.banner && G.banner.title.startsWith('⭐')) G.banner.t = Math.min(G.banner.t, 1.5); } }
function updateEvents(dt) {
  for (const k of Object.keys(G.fx)) if (G.fx[k] > 0) { G.fx[k] -= dt; if (G.fx[k] <= 0) { G.fx[k] = 0; refreshModal('laptop'); } }
  if (G.banner) { G.banner.t -= dt; if (G.banner.t <= 0) G.banner = null; }
  const s = G.state; if (!s.open || s.tutorial >= 0 && s.tutorial < 7) return;
  G.nextEvent -= dt;
  if (G.nextEvent <= 0 && !G.banner) {
    G.nextEvent = rand(80, 150); const tot = EVENTS.reduce((a, e) => a + e.weight, 0); let r = Math.random() * tot;
    const def = EVENTS.find(e => (r -= e.weight) < 0) || EVENTS[0]; startEvent(def);
  }
}
const TRASH_COL = [0xe63946, 0xffffff, 0x3a86ff, 0xffd166];
function spawnTrash() {
  const P = G.P; for (let tries = 0; tries < 30; tries++) {
    const x = rand(-P.hw + 0.8, P.hw - 0.8), z = rand(1, P.D - 1); if (!G.nav.free(G.nav.idx(x, z))) continue;
    const m = new THREE.Group(); const c = box(0.22, 0.12, 0.16, lam(pick(TRASH_COL)), 0, 0.06, 0, m); c.rotation.y = rand(0, 3); const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.14, 8), lam(0xffffff)); cup.rotation.z = Math.PI / 2; cup.position.set(0.15, 0.05, 0.1); m.add(cup);
    m.position.set(x, 0, z); G.scene.add(m); G.trash.push({ x, z, m }); return;
  }
}
function cleanTrash(t) { G.scene.remove(t.m); G.trash.splice(G.trash.indexOf(t), 1); earn(15, { x: t.x, y: 0.8, z: t.z }); addAura(5, { x: t.x, y: 0.8, z: t.z }); G.state.stats.trash++; G.sound.play('pop'); sparkle({ x: t.x, y: 0.4, z: t.z }, 10, 0x9cf5c2); checkTrophies(); }
/* ---------- Day cycle + automation ---------- */
function updateClock(dt) {
  const s = G.state; s.time += dt;
  if (s.time >= DAY_LEN) { s.time -= DAY_LEN; s.day++; toast(`☀️ <b>Day ${s.day}</b> — claim your daily reward in the laptop’s Goals tab`, 'good'); requestSave(); }
  if (s.tracks.autosell > 0) {
    G.autosellT -= dt;
    if (G.autosellT <= 0) {
      G.autosellT = autoSellFor(s.tracks.autosell);
      const sh = G.shelves.find(x => { const d = s.shelves[x.i]; return d.p >= 0 && d.n > 0 && s.prices[d.p] <= marketValue(d.p) * 1.3; });
      if (sh) { const d = s.shelves[sh.i], price = s.prices[d.p]; d.n--; refreshShelf(sh); earn(price, G.P.laptop ? { x: G.P.laptop.x, y: 1.6, z: G.P.laptop.z } : null, 'online'); s.stats.online++; s.stats.sold++; s.stats.profit += price - s.basis[d.p]; G.sound.play('coin'); checkTrophies(); }
    }
  }
}
function hourOf() { return (7 + 24 * G.state.time / DAY_LEN) % 24; }
function clockText() { const h = hourOf(), hh = Math.floor(h), mm = Math.floor((h - hh) * 60 / 15) * 15; return `Day ${G.state.day} · ${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'}`; }
const SKY_KEYS = [[0, 0x050816, 0x121a3a, 0.05], [5, 0x0a1030, 0x24305a, 0.1], [6.5, 0x5b6fd1, 0xffb38a, 0.6], [8, 0x4fb3ff, 0xcfeeff, 1], [17, 0x4fb3ff, 0xd8f1ff, 1], [18.8, 0x5a4fcf, 0xff9a6b, 0.55], [20, 0x141a46, 0x3a2f6b, 0.15], [24, 0x050816, 0x121a3a, 0.05]];
let _c1, _c2;
function updateSky() {
  if (!_c1) { _c1 = new THREE.Color(); _c2 = new THREE.Color(); }
  const h = hourOf(); let k = 0; while (k < SKY_KEYS.length - 2 && SKY_KEYS[k + 1][0] <= h) k++;
  const a = SKY_KEYS[k], b = SKY_KEYS[k + 1], t = clamp((h - a[0]) / (b[0] - a[0]), 0, 1);
  G.skyMat.uniforms.top.value.copy(_c1.setHex(a[1])).lerp(_c2.setHex(b[1]), t);
  G.skyMat.uniforms.bottom.value.copy(_c1.setHex(a[2])).lerp(_c2.setHex(b[2]), t);
  const day = lerp(a[3], b[3], t); G.dayAmt = day;
  tintSky(G.skyMat.uniforms.top.value, G.skyMat.uniforms.bottom.value);
  G.scene.fog.color.copy(G.skyMat.uniforms.bottom.value);
  const ang = (h - 6) / 12 * Math.PI; G.sun.position.set(Math.cos(ang) * 30, Math.max(4, Math.sin(ang) * 30), -14);
  G.sun.intensity = 0.3 + 2.4 * day; G.sun.color.setHex(day < 0.7 ? 0xffc89a : 0xffffff); G.hemi.intensity = 0.55 + 1.1 * day;
  const night = day < 0.35; G.sound.setNight(night);
  if (night !== G.wasNight) {
    G.wasNight = night; G.winMats.forEach(m => m.emissive.setHex(night ? 0xffcf7a : 0x000000)); G.mats.lamp.color.setHex(night ? 0xfff1b0 : 0x777777);
    G.lampPool.material.opacity = night ? 0.22 : 0; G.mats.window.emissive.setHex(night ? 0x6b4c1a : 0x000000);
  }
  const neon = G.state.curb.neon || G.state.decor.sign === 1; G.signMesh.material.emissive.setHex(neon ? (night ? 0xffffff : 0x999999) : (night ? 0x555555 : 0x000000));
  const lights = G.state.decor.lights, rundown = !G.state.curb.repair && lights === 0;
  G.lights.inner.forEach((l, i) => { let I = 11 + (1 - day) * 6; if (rundown && i === 0) I *= (Math.sin(G.clock * 23) > 0.6 || Math.random() < 0.05) ? 0.15 : 1; l.intensity = I; });
}

/* =====================================================================
   v4 extras: Arcade Pass bridge, Arcade Cabinet, Drip Locker, Stonks,
   Franchise Rebirth, Flex Card
   ===================================================================== */
const PASS_KEY = 'jaydengames.arcadePass.v1';
const fallbackPass = {
  get() { let d = {}; try { d = JSON.parse(localStorage.getItem(PASS_KEY)) || {}; } catch (e) { d = {}; } d.tokens = Math.max(0, Math.floor(+d.tokens || 0)); d.best = d.best || {}; return d; },
  tokens() { return this.get().tokens; },
  spend(n) { const d = this.get(); if (d.tokens < n) return false; d.tokens -= n; d.spent = (d.spent || 0) + n; try { localStorage.setItem(PASS_KEY, JSON.stringify(d)); } catch (e) { return false; } return true; }
};
const arcadePass = () => (window.JGArcade && window.JGArcade.pass) || fallbackPass;
const tokenCount = () => { try { return arcadePass().tokens(); } catch (e) { return 0; } };
const tk = n => `🎟️ ${Number(n).toLocaleString('en-US')}`;

/* ---------- Prestige ---------- */
const PRESTIGE_STEP = 1.5;
const prestigeMult = () => Math.pow(PRESTIGE_STEP, G?.state?.rebirths || 0);
const multText = r => `x${(Math.round(Math.pow(PRESTIGE_STEP, r) * 100) / 100).toLocaleString('en-US')}`;
const DISTRICTS = [
  { name: 'Suburban Strip', icon: '🏡', grass: 0xffffff, side: 0xffffff, sky: null, mix: 0 },
  { name: 'Downtown Hype District', icon: '🏙️', grass: 0x8f9a8f, side: 0xdcdce6, sky: [0x6a5cff, 0xffb3e6], mix: 0.35 },
  { name: 'Cyber Plaza', icon: '🌐', grass: 0x3a3f7a, side: 0x9a9fe0, sky: [0x2a0a5e, 0x00e5ff], mix: 0.5 },
  { name: 'Tokyo Hype District', icon: '🗼', grass: 0xffb7d5, side: 0xffe3f0, sky: [0xff5fa2, 0xffd1e8], mix: 0.4 },
  { name: 'Moon Base', icon: '🌙', grass: 0x8a8a94, side: 0xb4b4bf, sky: [0x05050f, 0x22224a], mix: 0.85 }
];
const districtOf = s => DISTRICTS[Math.min(DISTRICTS.length - 1, s.district || 0)];
const rebirthNeed = s => 10000 * ((s.rebirths || 0) + 1);
const runEarned = s => Math.max(0, s.stats.earned - (s.runBase || 0));
const canRebirth = s => s.tier >= TIERS.length - 1 || runEarned(s) >= rebirthNeed(s);
function applyDistrict() {
  const s = G.state, M = G.mats, d = districtOf(s);
  M.grass.color.setHex(d.grass); M.sidewalk.color.setHex(d.side);
  const gold = (s.rebirths || 0) > 0 || s.goldShelves;
  M.shelf.color.setHex(gold ? 0xffd166 : 0xe8e8ee); M.shelf.emissive.setHex(gold ? 0x3a2600 : 0x000000);
  M.shelfDark.color.setHex(gold ? 0xb8860b : 0x3b4252); M.shelfDark.emissive.setHex(gold ? 0x1e1200 : 0x000000);
}
function tintSky(top, bottom) {
  const d = G.state && districtOf(G.state); if (!d || !d.sky) return;
  if (!tintSky.c) tintSky.c = new THREE.Color();
  top.lerp(tintSky.c.setHex(d.sky[0]), d.mix); bottom.lerp(tintSky.c.setHex(d.sky[1]), d.mix);
}

/* ---------- Drip Locker catalog ---------- */
const DRIP = [
  { id: 'hat', name: 'Hats', icon: '🧢', items: [
    { id: 'cap', name: 'Pink Snapback', o: { hat: 'cap', hatColor: 0xff3dbb }, sw: 0xff3dbb },
    { id: 'hair', name: 'Fresh Cut', o: { hat: 'hair', hairColor: 0x2b1b0f }, sw: 0x2b1b0f },
    { id: 'capBlack', name: 'Blackout Snapback', price: 150, o: { hat: 'cap', hatColor: 0x111111 }, sw: 0x111111 },
    { id: 'beanie', name: 'Cozy Beanie', price: 200, o: { hat: 'beanie', hatColor: 0x8338ec }, sw: 0x8338ec },
    { id: 'beanieNeon', name: 'Neon Stripe Beanie', price: 450, o: { hat: 'beanieNeon', hatColor: 0x111111 }, sw: 0x39ff14 },
    { id: 'halo', name: 'Ring-Light Halo', aura: 400, o: { hat: 'hair', hairColor: 0x111111, halo: true }, sw: 0xfff6d5 },
    { id: 'crown', name: 'Golden Crown', tokens: 120, gold: true, o: { hat: 'crown' }, sw: 0xffd700 }] },
  { id: 'eyes', name: 'Visors & Shades', icon: '🕶️', items: [
    { id: 'none', name: 'No Shades', o: {}, sw: 0xdddddd },
    { id: 'shades', name: 'Blackout Shades', price: 250, o: { eyes: 'shades' }, sw: 0x111111 },
    { id: 'visor', name: 'Neon Visor', price: 600, o: { eyes: 'visor', visorColor: 0x35e7ff }, sw: 0x35e7ff },
    { id: 'visorPink', name: 'Aura Visor', aura: 100, o: { eyes: 'visor', visorColor: 0xff3dbb }, sw: 0xff3dbb },
    { id: 'gold', name: 'Gold Shades', tokens: 60, gold: true, o: { eyes: 'gold' }, sw: 0xffd700 }] },
  { id: 'top', name: 'Hoodies & Tops', icon: '🧥', items: [
    { id: 'tee', name: 'Cyan Tee', o: { shirt: 0x35e7ff }, sw: 0x35e7ff },
    { id: 'teeRed', name: 'Red Tee', price: 80, o: { shirt: 0xe63946 }, sw: 0xe63946 },
    { id: 'hoodieBlack', name: 'Blackout Hoodie', price: 350, o: { shirt: 0x222222, hood: true }, sw: 0x222222 },
    { id: 'hoodiePink', name: 'Designer Hoodie', price: 900, o: { shirt: 0xff3dbb, hood: true }, sw: 0xff3dbb },
    { id: 'varsity', name: 'Varsity Jacket', price: 1200, o: { shirt: 0xffffff, jacket: 0xc1121f }, sw: 0xc1121f },
    { id: 'puffer', name: 'Dripmaxxer Puffer', aura: 400, o: { shirt: 0x111111, jacket: 0x35e7ff }, sw: 0x35e7ff },
    { id: 'goldTee', name: 'Gold Chain Fit', tokens: 80, gold: true, o: { shirt: 0x111111, chain: true }, sw: 0xffd700 }] },
  { id: 'pants', name: 'Pants', icon: '👖', items: [
    { id: 'navy', name: 'Navy Joggers', o: { pants: 0x1d3557 }, sw: 0x1d3557 },
    { id: 'black', name: 'Black Cargos', o: { pants: 0x151515 }, sw: 0x151515 },
    { id: 'grey', name: 'Grey Sweats', price: 60, o: { pants: 0x8d99ae }, sw: 0x8d99ae },
    { id: 'camo', name: 'Olive Cargos', price: 120, o: { pants: 0x556b2f }, sw: 0x556b2f },
    { id: 'white', name: 'White Denim', price: 200, o: { pants: 0xf1f1f1 }, sw: 0xf1f1f1 }] },
  { id: 'shoes', name: 'Sneakers', icon: '👟', items: [
    { id: 'white', name: 'Clean Whites', o: { shoes: 0xf2f2f2 }, sw: 0xf2f2f2 },
    { id: 'red', name: 'Retro Reds', price: 120, o: { shoes: 0xd62828 }, sw: 0xd62828 },
    { id: 'neon', name: 'Neon Runners', price: 300, o: { shoes: 0x39ff14, shoeGlow: 0x0a3300 }, sw: 0x39ff14 },
    { id: 'fire', name: 'Fire Kicks', price: 500, o: { shoes: 0xff6a00, shoeGlow: 0x331100 }, sw: 0xff6a00 },
    { id: 'gold', name: 'Gold Sneakers', tokens: 50, gold: true, o: { shoes: 0xffd700, shoeGlow: 0x4a3300 }, sw: 0xffd700 }] },
  { id: 'skin', name: 'Skin & Colors', icon: '🎨', items: [
    { id: 'yellow', name: 'Classic Block', o: { skin: 0xffcc00 }, sw: 0xffcc00 },
    { id: 'light', name: 'Light', o: { skin: 0xffdbac }, sw: 0xffdbac },
    { id: 'peach', name: 'Peach', o: { skin: 0xf5c99b }, sw: 0xf5c99b },
    { id: 'tan', name: 'Tan', o: { skin: 0xe0a878 }, sw: 0xe0a878 },
    { id: 'brown', name: 'Brown', o: { skin: 0xc68642 }, sw: 0xc68642 },
    { id: 'deep', name: 'Deep', o: { skin: 0x8d5524 }, sw: 0x8d5524 },
    { id: 'alien', name: 'Alien Glow', aura: 1200, o: { skin: 0x7cff6b }, sw: 0x7cff6b }] },
  { id: 'trail', name: 'Trails', icon: '✨', items: [
    { id: 'none', name: 'No Trail', o: {}, sw: 0xdddddd },
    { id: 'cash', name: 'Cash Trail', price: 1500, o: {}, sw: 0x2dc653 },
    { id: 'sparkle', name: 'Aura Sparkles', aura: 250, o: {}, sw: 0xc77dff },
    { id: 'fire', name: 'Fire Kicks Trail', price: 2500, o: {}, sw: 0xff6a00 },
    { id: 'gold', name: 'Gold Trail', tokens: 150, gold: true, o: {}, sw: 0xffd700 }] }
];
const DEFAULT_OUTFIT = { hat: 'cap', eyes: 'none', top: 'tee', pants: 'navy', shoes: 'white', skin: 'yellow', trail: 'none' };
const dripCat = id => DRIP.find(c => c.id === id);
const dripItem = (cat, id) => dripCat(cat)?.items.find(i => i.id === id);
const dripFree = it => !it.price && !it.tokens && !it.aura;
const dripOwned = (s, cat, it) => dripFree(it) || s.wardrobe.includes(cat + ':' + it.id);
function outfitOpts(s = G.state) {
  const o = { face: 0 };
  DRIP.forEach(c => { const it = dripItem(c.id, s.outfit[c.id]) || c.items[0]; Object.assign(o, it.o); });
  if (!o.hat) o.hat = 'cap';
  return o;
}
function rebuildPlayerAvatar() {
  const pl = G.player, old = pl.av, vis = old.root.visible;
  G.scene.remove(old.root);
  pl.av = makeAvatar(outfitOpts()); pl.av.root.visible = vis; pl.av.root.position.copy(old.root.position); pl.av.root.rotation.copy(old.root.rotation);
  G.scene.add(pl.av.root);
  const s = G.state; s.carry.forEach((b, i) => { const m2 = makeBox(b); m2.position.set(0, i * 0.43 - 0.2, 0); pl.av.carry.add(m2); });
  const id = TOOLS[s.tool]?.id; if (id && id !== 'hands') pl.av.toolHolder.add(makeTool(id));
}
function persist() { if (G.mode === 'play') { requestSave(); return; } G.forceSave = true; save(true); G.forceSave = false; G.savedState = loadSaved(); }

/* ---------- Drip Locker UI ---------- */
function openWardrobe(tab = 0) {
  if (G.modals.some(m => m.id === 'wardrobe')) return;
  G.preview = { spin: 0 }; if (G.mode === 'title') $('[data-title]').hidden = true;
  openModal('wardrobe', renderWardrobe, { cls: 'rt-wardrobe', tab, tabs: DRIP.length, onClose: endPreview, cleanup: endPreview });
}
function endPreview() { if (!G || !G.preview) return; G.preview = null; if (G.camera && G.camera.near !== 0.05) { G.camera.near = 0.05; G.camera.updateProjectionMatrix(); } if (G.mode === 'title') { $('[data-title]').hidden = false; renderTitle(); } }
function renderWardrobe(e) {
  const s = G.state, c = DRIP[e.tab], cur = s.outfit[c.id], tok = tokenCount();
  const cards = c.items.map(it => {
    const own = dripOwned(s, c.id, it), on = cur === it.id, auraOk = it.aura && s.aura >= it.aura;
    let btn;
    if (on) btn = '<span class="rt-owned">✓ Equipped</span>';
    else if (own || auraOk) btn = `<button class="rt-buy" data-do="drip" data-c="${c.id}" data-i="${it.id}">${auraOk && !own ? 'Unlock & equip' : 'Equip'}</button>`;
    else if (it.tokens) btn = `<button class="rt-buy gold" data-do="drip" data-c="${c.id}" data-i="${it.id}" ${tok >= it.tokens ? '' : 'disabled'}>Buy <b>${tk(it.tokens)}</b></button>`;
    else if (it.aura) btn = `<span class="rt-muted">🔒 Unlocks at <b>${it.aura}</b> Aura</span>`;
    else btn = `<button class="rt-buy" data-do="drip" data-c="${c.id}" data-i="${it.id}" ${s.cash >= it.price ? '' : 'disabled'}>Buy <b>${money(it.price)}</b></button>`;
    const tag = it.gold ? '<em class="rt-goldtag">ARCADE EXCLUSIVE</em>' : it.aura ? `<em class="rt-auratag">✦ ${it.aura} AURA</em>` : '';
    return `<div class="rt-card rt-drip ${on ? 'owned' : ''}"><div class="rt-dsw" style="--c:#${it.sw.toString(16).padStart(6, '0')}">${c.icon}${tag}</div><h4>${it.name}</h4>${btn}</div>`;
  }).join('');
  return `${head('🪞 DRIP LOCKER', `<span class="rt-chip cash">${money(s.cash)}</span> <span class="rt-chip tok">${tk(tok)} tokens</span> <span class="rt-chip">✦ ${Math.floor(s.aura)} Aura</span>`)}${modalTabs(e, DRIP.map(x => `${x.icon} ${x.name}`))}
    <div class="rt-scroll"><p class="rt-muted">Equip items to see them on your avatar. Gold items cost Arcade Tokens from the JaydenGames mini-games. Aura items unlock for free when you reach the Aura shown.</p><div class="rt-grid small">${cards}</div>
    <div class="rt-btnrow"><button class="rt-ghost" data-do="flex">📊 Flex Stats</button></div></div>`;
}
function buyDrip(cat, id) {
  const s = G.state, it = dripItem(cat, id); if (!it) return;
  const key = cat + ':' + id;
  if (!dripOwned(s, cat, it)) {
    if (it.tokens) { if (!arcadePass().spend(it.tokens)) { G.sound.play('error'); toast(`Need ${tk(it.tokens)} Arcade Tokens. Win mini-games to earn more.`, 'bad'); return; } }
    else if (it.aura) { if (s.aura < it.aura) { G.sound.play('error'); toast(`Unlocks at ${it.aura} Aura`, 'bad'); return; } }
    else if (!spend(it.price)) return;
    s.wardrobe.push(key); G.sound.play('buy'); toast(`👕 Unlocked <b>${it.name}</b>`, it.gold ? 'gold' : 'good');
  } else G.sound.play('click');
  s.outfit[cat] = id; rebuildPlayerAvatar();
  if (G.player) sparkle({ x: G.player.av.root.position.x, y: 1.6, z: G.player.av.root.position.z }, 14, it.sw);
  persist(); refreshModal('wardrobe'); arcRefreshGold();
}
/* Preview camera: mirror shot of your avatar while the Drip Locker is open */
function updatePreview(dt) {
  const pv = G.preview; if (!pv || !G.modals.some(m => m.id === 'wardrobe')) return;
  pv.spin += dt * 0.7;
  const av = G.player.av, P = G.P, title = G.mode === 'title';
  const ax = title ? 1.8 : P.mirror.x, az = title ? -1.6 : P.mirror.z - 0.75;
  av.root.visible = true; av.root.position.set(ax, 0, az); av.root.rotation.y = Math.PI + Math.sin(pv.spin) * 1.5;
  animateAvatar(av, 0, dt, G.clock); G.vm.visible = false;
  if (G.vw < 700) { G.camera.position.set(ax, 1.7, az - 3.2); G.camera.lookAt(ax, 0.35, az); }
  else { G.camera.position.set(ax - 0.5, 1.35, az - 2.6); G.camera.lookAt(ax - 1.0, 1.05, az); }
  /* clip anything between the camera and the avatar (shelves, customers) */
  if (!title) { const d = Math.hypot(G.camera.position.x - ax, G.camera.position.z - az), n = Math.max(0.05, d - 1.0); if (Math.abs(G.camera.near - n) > 0.01) { G.camera.near = n; G.camera.updateProjectionMatrix(); } }
  pv.trailT = (pv.trailT || 0) - dt; if (pv.trailT <= 0) { pv.trailT = 0.06; spawnTrail(ax + rand(-0.15, 0.15), az + rand(-0.15, 0.15)); }
}

/* ---------- Walking particle trails ---------- */
const TRAIL_LOOK = {
  cash: { geo: () => new THREE.PlaneGeometry(0.26, 0.13), mats: () => [cashBillMat()], up: 0.5, grav: 0.6, life: 1.6, spin: 3 },
  sparkle: { geo: () => new THREE.OctahedronGeometry(0.06), mats: () => [new THREE.MeshBasicMaterial({ color: 0xc77dff }), new THREE.MeshBasicMaterial({ color: 0x35e7ff }), new THREE.MeshBasicMaterial({ color: 0xffffff })], up: 1.2, grav: 0, life: 1.1, spin: 4 },
  fire: { geo: () => new THREE.BoxGeometry(0.09, 0.09, 0.09), mats: () => [new THREE.MeshBasicMaterial({ color: 0xff3d00 }), new THREE.MeshBasicMaterial({ color: 0xff9100 }), new THREE.MeshBasicMaterial({ color: 0xffd600 })], up: 1.8, grav: 0, life: 0.7, spin: 2 },
  gold: { geo: () => new THREE.CylinderGeometry(0.07, 0.07, 0.02, 10), mats: () => [new THREE.MeshLambertMaterial({ color: 0xffd700, emissive: 0x6a4a00 })], up: 0.9, grav: 1.2, life: 1.3, spin: 6 }
};
function cashBillMat() {
  const t = textCanvas(64, 32, (g, w, h) => { g.fillStyle = '#2dc653'; g.fillRect(0, 0, w, h); g.strokeStyle = '#0b6b2a'; g.lineWidth = 3; g.strokeRect(2, 2, w - 4, h - 4); g.fillStyle = '#0b6b2a'; g.font = '900 22px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('$', w / 2, h / 2 + 1); });
  return new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide });
}
function spawnTrail(x, z) {
  const kind = G.state.outfit.trail, L = TRAIL_LOOK[kind]; if (!L) return;
  G.trailRes ||= {}; const R = G.trailRes[kind] ||= { geo: L.geo(), mats: L.mats() };
  G.trailParts ||= []; const max = G.settings.preset === 'Low' ? 18 : 40;
  let p = G.trailParts.find(q => q.dead); if (!p) { if (G.trailParts.length >= max) return; p = { m: new THREE.Mesh() }; G.scene.add(p.m); G.trailParts.push(p); }
  p.m.geometry = R.geo; p.m.material = R.mats[Math.floor(Math.random() * R.mats.length)]; p.m.visible = true; p.m.castShadow = false;
  p.m.position.set(x, 0.12 + Math.random() * 0.2, z); p.m.rotation.set(Math.random() * 3, Math.random() * 3, 0); p.m.scale.setScalar(1);
  p.v = [rand(-0.3, 0.3), L.up * rand(0.6, 1.1), rand(-0.3, 0.3)]; p.t = 0; p.L = L; p.dead = false;
}
function updateTrails(dt) {
  const s = G.state; if (!s) return;
  if (G.mode === 'play' && !G.preview && s.outfit.trail !== 'none' && G.player.moving > 0.5 && G.player.y < 0.5) {
    G.trailT = (G.trailT || 0) - dt; if (G.trailT <= 0) { G.trailT = G.settings.preset === 'Low' ? 0.12 : 0.06; const pl = G.player; spawnTrail(pl.x + Math.sin(pl.yaw) * 0.45 + rand(-0.2, 0.2), pl.z + Math.cos(pl.yaw) * 0.45 + rand(-0.2, 0.2)); }
  }
  (G.trailParts || []).forEach(p => {
    if (p.dead) return; p.t += dt; const L = p.L;
    p.v[1] -= L.grav * dt; p.m.position.x += p.v[0] * dt; p.m.position.y = Math.max(0.02, p.m.position.y + p.v[1] * dt); p.m.position.z += p.v[2] * dt;
    p.m.rotation.y += L.spin * dt; p.m.rotation.x += L.spin * 0.5 * dt; p.m.scale.setScalar(Math.max(0.01, 1 - p.t / L.life));
    if (p.t > L.life) { p.dead = true; p.m.visible = false; }
  });
}

/* ---------- Store props: Drip Locker mirror + Arcade Cabinet ---------- */
function buildExtras(S, cols) {
  const s = G.state, P = G.P, D = P.D;
  // Drip Locker (always available)
  const mx = -0.9, mz = D - 0.14; P.mirror = { x: mx, y: 1.3, z: mz - 0.1 };
  const frame = lamC(0x2b2f3a), mirTex = textCanvas(128, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#dff6ff'); gr.addColorStop(0.5, '#9fc4d8'); gr.addColorStop(1, '#e9f7ff'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,.65)'; g.beginPath(); g.moveTo(20, 0); g.lineTo(60, 0); g.lineTo(10, 110); g.lineTo(-30, 110); g.fill(); g.beginPath(); g.moveTo(80, 120); g.lineTo(100, 120); g.lineTo(60, 220); g.lineTo(40, 220); g.fill(); });
  box(1.05, 2.0, 0.08, frame, mx, 1.15, mz, S);
  const mir = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.85), new THREE.MeshBasicMaterial({ map: mirTex })); mir.position.set(mx, 1.15, mz - 0.045); mir.rotation.y = Math.PI; S.add(mir);
  const sign = textCanvas(256, 64, (g, w, h) => { g.fillStyle = '#16002e'; roundRect(g, 2, 2, w - 4, h - 4, 14); g.fill(); g.strokeStyle = '#ff3dbb'; g.lineWidth = 5; g.stroke(); g.fillStyle = '#ff7ae0'; g.font = '900 34px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('DRIP LOCKER', w / 2, h / 2 + 2); });
  const sm = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.28), new THREE.MeshBasicMaterial({ map: sign, transparent: true })); sm.position.set(mx, 2.42, mz - 0.06); sm.rotation.y = Math.PI; S.add(sm);
  const lk = lamC(0x8338ec); box(0.46, 1.9, 0.5, lk, mx - 0.82, 0.95, mz - 0.22, S, 0); [0.55, 1.35].forEach(y => box(0.36, 0.04, 0.02, lamC(0x3c1a6e), mx - 0.82, y, mz - 0.475, S)); box(0.04, 0.16, 0.03, lamC(0xffd166), mx - 0.66, 1.0, mz - 0.48, S);
  addCol(cols, mx - 1.06, mx + 0.53, mz - 0.48, mz + 0.05, 2.0, 'solid');
  // Arcade cabinet (upgrade)
  P.arcade = null;
  if (s.arcade) {
    const ax = 0.75, az = D - 0.5; P.arcade = { x: ax, y: 1.25, z: az - 0.38 };
    const g = new THREE.Group(); g.position.set(ax, 0, az); S.add(g);
    const shell = lamC(0x1a1040), neonA = basicC(0xff3dbb), neonB = basicC(0x35e7ff);
    box(0.84, 1.15, 0.72, shell, 0, 0.575, 0, g); box(0.84, 0.9, 0.5, shell, 0, 1.55, 0.11, g);
    box(0.88, 0.06, 0.8, neonA, 0, 1.17, -0.02, g, 0, false);
    const panel = box(0.84, 0.08, 0.36, lamC(0x2b2f3a), 0, 1.12, -0.42, g); panel.rotation.x = 0.25;
    box(0.05, 0.14, 0.05, lamC(0x111111), -0.2, 1.22, -0.44, g); const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), basicC(0xe63946)); knob.position.set(-0.2, 1.31, -0.44); g.add(knob);
    [[0.05, 0xffd23f], [0.17, 0x4dff88], [0.29, 0x35e7ff]].forEach(([x, c]) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 10), basicC(c)); b.position.set(x, 1.19, -0.44); b.rotation.x = 0.25; g.add(b); });
    G.arcTex = textCanvas(256, 200, () => {}); drawArcadeScreen(0);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.52), new THREE.MeshBasicMaterial({ map: G.arcTex })); scr.position.set(0, 1.55, -0.15); scr.rotation.set(-0.12, Math.PI, 0); g.add(scr);
    const mq = textCanvas(256, 64, (c, w, h) => { const gr = c.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#ff3dbb'); gr.addColorStop(1, '#35e7ff'); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '900 38px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.strokeStyle = '#1a1040'; c.lineWidth = 6; c.strokeText('ARCADE', w / 2, h / 2 + 2); c.fillText('ARCADE', w / 2, h / 2 + 2); });
    box(0.9, 0.26, 0.56, shell, 0, 2.13, 0.1, g); const mqm = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.22), new THREE.MeshBasicMaterial({ map: mq })); mqm.position.set(0, 2.13, -0.185); mqm.rotation.y = Math.PI; g.add(mqm);
    [-0.43, 0.43].forEach(x => box(0.03, 2.2, 0.03, x < 0 ? neonA : neonB, x, 1.1, -0.36, g, 0, false));
    box(1.3, 0.01, 1.3, basicC(0x2a0a5e), 0, 0.012, -0.25, g, 0, false);
    addCol(cols, ax - 0.45, ax + 0.45, az - 0.45, az + 0.4, 2.2, 'solid');
  }
}
function drawArcadeScreen(t) {
  if (!G.arcTex) return; const f = Math.floor(t * 4);
  redrawTex(G.arcTex, (g, w, h) => {
    g.fillStyle = '#07101c'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ff3dbb'; g.fillRect(150 + (f % 3) * 4, 90, 14, 14);
    g.fillStyle = '#35e7ff'; for (let i = 0; i < 6; i++) g.fillRect(40 + ((f + i) % 14) * 8, 120 - (i > 3 ? (i - 3) * 14 : 0), 12, 12);
    g.fillStyle = '#fff'; g.font = '900 22px system-ui'; g.textAlign = 'center'; g.fillText(f % 2 ? 'INSERT TOKEN' : 'PRESS  E', w / 2, 40);
    g.fillStyle = '#ffd23f'; g.font = '800 16px system-ui'; g.fillText(`🎟 ${tokenCount()} TOKENS`, w / 2, 180);
  });
}

/* ---------- Arcade Cabinet modal ---------- */
const ARC_GAMES = [['snake', '🐍', 'Neon Snake', 'Score 5+ · up to 60'], ['ttt', '❎', 'Tic-Tac-Toe', 'Beat the CPU · +25'], ['memory', '🧠', 'Memory Match', 'Fewer moves · up to 50'], ['reaction', '⚡', 'Reaction Rush', 'Under 220 ms · +15']];
function arcExchange() {
  const s = G.state, cashAmt = 250 * (1 + s.tier), best = PRODUCTS.reduce((b, p, i) => s.licenses[p.lic] && p.value > PRODUCTS[b].value ? i : b, 0);
  return [
    { id: 'cash', cost: 25, name: `${money(cashAmt)} cash bonus`, desc: 'Paid straight into your register.' },
    { id: 'box', cost: 40, name: `Free ${PRODUCTS[best].name} box`, desc: 'A sealed box lands on your Delivery Dock.' },
    { id: 'hype', cost: 60, name: 'Arcade Hype Rush', desc: '2x shoppers for 30 seconds.' },
    { id: 'shelves', cost: 200, name: 'Golden Shelves', desc: s.goldShelves || s.rebirths ? 'Owned. Your shelves are solid gold.' : 'Turn every shelf in your store gold.', done: s.goldShelves || s.rebirths > 0 }
  ];
}
function openArcade() {
  if (G.modals.some(m => m.id === 'arcade')) return;
  const stop = () => { G.arcStop?.(); G.arcStop = null; G.arcadeHold = false; };
  openModal('arcade', renderArcade, { cls: 'rt-arcade', onClose: stop, cleanup: stop });
}
function renderArcade() {
  const s = G.state, cashier = s.staff.cashier, tok = tokenCount();
  return `${head('🕹️ ARCADE CABINET', `<span class="rt-chip tok">${tk(tok).replace(/[\d,]+$/, '<b data-tok>$&</b>')} tokens</span> <span class="rt-chip ${cashier ? '' : 'warn'}">${cashier ? '🤖 AI Cashier is running the register' : '⚠️ No AI Cashier: customers wait while you play'}</span>`)}
  <div class="rt-scroll"><div class="rt-arc">
    <div class="rt-arc-list">${ARC_GAMES.map(([id, ic, n, d]) => `<button class="rt-arc-game" data-do="arcPlay" data-g="${id}" data-arcg="${id}"><span>${ic}</span><b>${n}</b><small>${d}</small></button>`).join('')}</div>
    <div class="rt-arc-screen" data-arc-screen><div class="rt-arc-idle"><b>PICK A GAME</b><span>Wins pay Arcade Tokens. Your store keeps running.</span></div></div>
  </div>
  <h5>🎟️ Token exchange</h5><div class="rt-grid small" data-arcx>${arcExchangeHTML()}</div>
  <h5>👑 Golden drip (Arcade exclusive)</h5><div class="rt-grid small" data-arcgold>${arcGoldHTML()}</div>
  <p class="rt-muted">Earn up to 600 tokens per day across all four games, here or on the JaydenGames homepage.</p></div>`;
}
function arcGoldHTML() {
  const s = G.state;
  return DRIP.flatMap(c => c.items.filter(i => i.gold).map(i => ({ c, i }))).map(({ c, i }) => { const own = dripOwned(s, c.id, i), on = s.outfit[c.id] === i.id; return `<div class="rt-card rt-drip ${on ? 'owned' : ''}"><div class="rt-dsw" style="--c:#ffd700">${c.icon}</div><h4>${i.name}</h4>${on ? '<span class="rt-owned">✓ Equipped</span>' : `<button class="rt-buy ${own ? '' : 'gold'}" data-do="drip" data-c="${c.id}" data-i="${i.id}">${own ? 'Equip' : `Buy <b>${tk(i.tokens)}</b>`}</button>`}</div>`; }).join('');
}
function arcRefreshGold() { const m = G.modals.find(x => x.id === 'arcade'); const el = m?.el.querySelector('[data-arcgold]'); if (el) { el.innerHTML = arcGoldHTML(); refreshBadges(el); } arcRefreshTokens(); }
function arcExchangeHTML() { return arcExchange().map(x => `<div class="rt-card ${x.done ? 'owned' : ''}"><h4>${x.name}</h4><p>${x.desc}</p>${x.done ? '<span class="rt-owned">✓ Owned</span>' : `<button class="rt-buy gold" data-do="arcX" data-x="${x.id}">Trade <b>${tk(x.cost)}</b></button>`}</div>`).join(''); }
function arcRefreshTokens() {
  const m = G.modals.find(x => x.id === 'arcade'); if (!m) return;
  const t = m.el.querySelector('[data-tok]'); if (t) t.textContent = tokenCount().toLocaleString('en-US');
  const x = m.el.querySelector('[data-arcx]'); if (x) { x.innerHTML = arcExchangeHTML(); refreshBadges(x); }
  drawArcadeScreen(G.clock);
}
function arcPlay(g) {
  const m = G.modals.find(x => x.id === 'arcade'); if (!m) return;
  if (!window.JGArcade) { toast('Open RESELL TYCOON from the JaydenGames homepage to use the Arcade Cabinet.', 'warn'); return; }
  G.arcStop?.(); const scr = m.el.querySelector('[data-arc-screen]');
  m.el.querySelectorAll('[data-arcg]').forEach(b => b.classList.toggle('on', b.dataset.arcg === g));
  G.arcStop = window.JGArcade.mount(g, scr, { onReward: r => { toast(r.msg, r.got ? 'gold' : 'warn'); if (r.got) { G.sound.play('coin'); G.pad.rumble(0.4, 120); } arcRefreshTokens(); }, onEnd: () => { G.arcadeHold = false; } });
  G.arcadeHold = g === 'snake'; G.arcGame = g;
  if (g === 'snake') { const c = scr.querySelector('canvas'); c?.scrollIntoView?.({ block: 'nearest' }); document.activeElement?.blur?.(); }
  else { const b = scr.querySelector('button'); b && focusEl(b, G.inputMode !== 'pad'); }
}
function arcTrade(id) {
  const s = G.state, x = arcExchange().find(e => e.id === id); if (!x || x.done) return;
  if (id === 'box') { const best = PRODUCTS.reduce((b, p, i) => s.licenses[p.lic] && p.value > PRODUCTS[b].value ? i : b, 0); if (s.dock.length >= dockCapFor(s.tracks.warehouse)) { toast('Your Delivery Dock is full. Clear some boxes first.', 'bad'); G.sound.play('error'); return; } if (!arcadePass().spend(x.cost)) return arcBroke(x.cost); s.dock.push({ p: best, n: PRODUCTS[best].per, open: false }); refreshDock(); toast(`📦 Free <b>${PRODUCTS[best].name}</b> box is on the dock`, 'gold'); }
  else { if (!arcadePass().spend(x.cost)) return arcBroke(x.cost);
    if (id === 'cash') { const v = 250 * (1 + s.tier); s.cash += v; toast(`💵 Traded tokens for <b>${money(v)}</b>`, 'gold'); }
    if (id === 'hype') { G.fx.viral = 30; setBanner('🕹️ ARCADE HYPE!', '2x shoppers for 30 seconds', 30); toast('🕹️ Arcade Hype Rush: <b>2x shoppers</b>', 'gold'); }
    if (id === 'shelves') { s.goldShelves = true; applyDistrict(); toast('✨ Golden Shelves unlocked', 'gold'); }
  }
  G.sound.play('cash'); requestSave(); arcRefreshTokens(); updateHUD(1);
}
function arcBroke(n) { G.sound.play('error'); toast(`Need ${tk(n)} tokens. Play a game to earn more.`, 'bad'); }

/* ---------- Stonks ---------- */
const STONKS = [
  { sym: 'YEEZY', name: 'Yeezy Resale Index', icon: '👟', base: 120, vol: 0.07, color: '#ffbe0b' },
  { sym: 'DOGE', name: 'Doge Coin', icon: '🐕', base: 20, vol: 0.18, color: '#f4a261' },
  { sym: 'AURA', name: 'Aura Holdings', icon: '✦', base: 45, vol: 0.05, color: '#c77dff' },
  { sym: 'GPU', name: 'GPU Makers', icon: '🖥️', base: 300, vol: 0.05, drift: 0.006, color: '#4dff88' }
];
const STONK_TICK = 30;
function freshStonks() { return { px: STONKS.map(x => x.base), hist: STONKS.map(x => Array.from({ length: 24 }, (_, i) => Math.round(x.base * (1 + Math.sin(i * 1.7 + x.base) * x.vol * 0.6)))), hold: STONKS.map(() => 0), avg: STONKS.map(() => 0), t: STONK_TICK, realized: 0 }; }
function sanitizeStonks(r) {
  const f = freshStonks(); if (!r || typeof r !== 'object') return f;
  const n = (v, d, a, b) => (typeof v === 'number' && isFinite(v)) ? clamp(v, a, b) : d;
  STONKS.forEach((x, i) => {
    f.px[i] = Math.round(n(r.px?.[i], x.base, 1, x.base * 50));
    if (Array.isArray(r.hist?.[i])) f.hist[i] = r.hist[i].slice(-40).map(v => Math.round(n(v, x.base, 1, x.base * 50)));
    f.hold[i] = Math.round(n(r.hold?.[i], 0, 0, 1e6)); f.avg[i] = n(r.avg?.[i], 0, 0, x.base * 50);
  });
  f.t = n(r.t, STONK_TICK, 0, STONK_TICK); f.realized = n(r.realized, 0, -1e9, 1e9); return f;
}
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
function stonkTick() {
  const st = G.state.stonks; let news = '';
  STONKS.forEach((x, i) => {
    let r = x.vol * gauss() + 0.08 * Math.log(x.base / st.px[i]) + (x.drift || 0);
    if (x.sym === 'AURA') { r += clamp((G.auraGain || 0) / 60, 0, 0.15) - 0.01; }
    if (x.sym === 'DOGE' && Math.random() < 0.08) { r += 0.45; news = '🚀 <b>$DOGE</b> is mooning. Sell the top?'; }
    if (x.sym === 'YEEZY' && G.fx.drop > 0) r += 0.08;
    if (Math.random() < 0.03) { r -= 0.3; news = `📉 <b>$${x.sym}</b> just got rugged.`; }
    st.px[i] = Math.max(1, Math.round(st.px[i] * Math.exp(r)));
    st.hist[i].push(st.px[i]); if (st.hist[i].length > 40) st.hist[i].shift();
  });
  G.auraGain = 0;
  if (news && st.hold.some(Boolean)) toast(news, 'warn');
}
function updateStonks(dt) {
  const st = G.state.stonks; st.t -= dt;
  if (st.t <= 0) { st.t = STONK_TICK; stonkTick(); const lap = topModal(); if (lap?.id === 'laptop' && lap.tab === 6) refreshModal('laptop'); }
  G.stT = (G.stT || 0) - dt; if (G.stT <= 0) { G.stT = 0.25; const el = $('[data-stonk-t]'); if (el) el.textContent = `${Math.ceil(st.t)}s`; }
  if (G.arcTex) { G.arcT = (G.arcT || 0) - dt; if (G.arcT <= 0) { G.arcT = 0.5; drawArcadeScreen(G.clock); } }
}
const stonksValue = s => s.stonks.hold.reduce((a, h, i) => a + h * s.stonks.px[i], 0);
function spark(hist, color) {
  const lo = Math.min(...hist), hi = Math.max(...hist), w = 160, h = 44, k = hist.length - 1 || 1;
  const pts = hist.map((v, i) => `${(i / k * w).toFixed(1)},${(h - 4 - ((v - lo) / Math.max(1, hi - lo)) * (h - 8)).toFixed(1)}`).join(' ');
  return `<svg class="rt-spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><polyline points="0,${h} ${pts} ${w},${h}" fill="${color}22" stroke="none"/><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round"/></svg>`;
}
function lapStonks() {
  const s = G.state, st = s.stonks, val = stonksValue(s);
  const cards = STONKS.map((x, i) => {
    const p = st.px[i], h = st.hist[i], prev = h[h.length - 2] ?? p, ch = (p - prev) / Math.max(1, prev) * 100, own = st.hold[i];
    const pl = own ? (p - st.avg[i]) * own : 0, maxN = Math.floor(s.cash / p);
    return `<div class="rt-card rt-stonk"><div class="rt-stk-top"><b>${x.icon} $${x.sym}</b><span class="${ch >= 0 ? 'up' : 'down'}">${ch >= 0 ? '▲' : '▼'} ${Math.abs(ch).toFixed(1)}%</span></div><small>${x.name}</small>
      <div class="rt-stk-px">${money(p)}</div>${spark(h, ch >= 0 ? '#2dc653' : '#ff4d6d')}
      <p>${own ? `You own <b>${own}</b> · avg ${money(st.avg[i])} · <b class="${pl >= 0 ? 'up' : 'down'}">${pl >= 0 ? '+' : ''}${money(pl)}</b>` : 'You own none yet.'}</p>
      <div class="rt-btnrow">${buyBtn('Buy 1', p, 'stBuy', `data-s="${i}" data-n="1"`)}${buyBtn('×10', p * 10, 'stBuy', `data-s="${i}" data-n="10"`)}<button class="rt-buy" data-do="stBuy" data-s="${i}" data-n="max" ${maxN > 0 ? '' : 'disabled'}>Max <b>${maxN}</b></button></div>
      <div class="rt-btnrow"><button class="rt-ghost" data-do="stSell" data-s="${i}" data-n="1" ${own ? '' : 'disabled'}>Sell 1</button><button class="rt-ghost" data-do="stSell" data-s="${i}" data-n="all" ${own ? '' : 'disabled'}>Sell all ${own ? money(own * p) : ''}</button></div></div>`;
  }).join('');
  return `<div class="rt-info"><span>📈 Portfolio <b>${money(val)}</b></span><span>💰 Realized P/L <b class="${st.realized >= 0 ? 'up' : 'down'}">${st.realized >= 0 ? '+' : ''}${money(st.realized)}</b></span><span>⏱️ Next price update <b data-stonk-t>${Math.ceil(st.t)}s</b></span></div>
    <p class="rt-muted">Prices move every 30 seconds. $DOGE swings hard, $GPU trends up, and $AURA climbs when you earn Aura. Not financial advice, just stonks.</p><div class="rt-grid">${cards}</div>`;
}
function stonkBuy(i, n) {
  const s = G.state, st = s.stonks, p = st.px[i]; if (n === 'max') n = Math.floor(s.cash / p); n = Math.floor(+n); if (n <= 0) return;
  if (!spend(p * n)) return; st.avg[i] = (st.avg[i] * st.hold[i] + p * n) / (st.hold[i] + n); st.hold[i] += n;
  G.sound.play('buy'); toast(`📈 Bought ${n} $${STONKS[i].sym} for ${money(p * n)}`); requestSave(); refreshModal('laptop');
}
function stonkSell(i, n) {
  const s = G.state, st = s.stonks, p = st.px[i]; if (n === 'all') n = st.hold[i]; n = Math.min(st.hold[i], Math.floor(+n)); if (n <= 0) return;
  const gain = (p - st.avg[i]) * n; st.hold[i] -= n; if (!st.hold[i]) st.avg[i] = 0; s.cash += p * n; st.realized += gain;
  G.sound.play('cash'); toast(`💸 Sold ${n} $${STONKS[i].sym} for ${money(p * n)} (${gain >= 0 ? '+' : ''}${money(gain)})`, gain >= 0 ? 'good' : 'bad');
  if (gain > 0) addAura(Math.min(10, Math.ceil(gain / 200)));
  requestSave(); refreshModal('laptop');
}

/* ---------- Franchise Rebirth ---------- */
function lapRebirth() {
  const s = G.state, r = s.rebirths || 0, need = rebirthNeed(s), have = runEarned(s), ok = canRebirth(s), d = districtOf(s), nd = DISTRICTS[Math.min(DISTRICTS.length - 1, r + 1)];
  const pct = clamp(have / need, 0, 1) * 100;
  return `<div class="rt-box rt-rebirth"><h5>♻️ Franchise Rebirth</h5><p>Sell this store and open a new location. You start over with ${money(250)}, but every sale and Aura gain is multiplied forever.</p>
    <div class="rt-rb-row"><div><small>Current</small><b>${d.icon} ${d.name}</b><em>${multText(r)} cash & Aura</em></div><span class="rt-arrow">→</span><div class="next"><small>Next location</small><b>${nd.icon} ${nd.name}</b><em>${multText(r + 1)} cash & Aura</em></div></div>
    <p><b>Unlock:</b> reach <b>${TIERS[TIERS.length - 1].name}</b>${s.tier >= TIERS.length - 1 ? ' ✓' : ''} or earn <b>${money(need)}</b> this run.</p><div class="rt-bar"><b style="width:${pct}%"></b></div><p class="rt-muted">${money(have)} / ${money(need)} earned this run</p>
    ${ok ? `<button class="rt-buy big gold" data-do="rebirth">♻️ REBIRTH FRANCHISE → ${nd.name}</button>` : '<button class="rt-buy big" disabled>🔒 Keep grinding to unlock Rebirth</button>'}</div>
    <div class="rt-two"><div class="rt-box"><h5>✅ You keep</h5><p>Trophies, lifetime stats, reviews, decor, Drip Locker items, the Arcade Cabinet, and your Arcade Tokens. You also get a ★ Prestige Badge and Golden Shelves.</p></div><div class="rt-box"><h5>🔄 Resets</h5><p>Cash, store size, shelves and stock, deliveries, licenses, operations upgrades, staff, perks, curb appeal, prices, and Stonks holdings.</p></div></div>
    <h5>🗺️ Districts</h5><div class="rt-tiers">${DISTRICTS.map((x, i) => `<div class="rt-tier ${i <= Math.min(r, DISTRICTS.length - 1) ? 'done' : ''} ${i === r + 1 ? 'next' : ''}"><b>${x.icon} ${x.name}</b><small>${multText(i)}</small></div>`).join('<span class="rt-arrow">→</span>')}</div>`;
}
function doRebirth() {
  const s = G.state; if (!canRebirth(s)) return;
  const f = freshState();
  ['cash', 'tier', 'licenses', 'tracks', 'curb', 'staff', 'perks', 'prices', 'basis', 'shelves', 'dock', 'floorBoxes', 'carry', 'orders'].forEach(k => s[k] = f[k]);
  s.open = false; s.tool = 0; s.stonks.hold = STONKS.map(() => 0); s.stonks.avg = STONKS.map(() => 0);
  s.rebirths = (s.rebirths || 0) + 1; s.district = Math.min(DISTRICTS.length - 1, s.rebirths); s.runBase = s.stats.earned;
  if (s.tutorial >= 0 && s.tutorial < 7) s.tutorial = 7;
  G.modals.slice().forEach(m => closeModal(m.id, true));
  clearWorldActors(); buildStore(); makeLabels(); resetPlayer(); setTool(0); refreshCarry(); spawnStaff(); drawDoorSign();
  const d = districtOf(s); G.sound.play('fanfare'); G.pad.rumble(1, 400);
  toast(`♻️ Rebirth #${s.rebirths}! Welcome to <b>${d.name}</b>. Permanent <b>${multText(s.rebirths)}</b> cash & Aura.`, 'gold');
  sparkle({ x: 0, y: 2, z: 3 }, 40, 0xffd166); setBanner(`★ PRESTIGE ${s.rebirths}`, `${d.name} · ${multText(s.rebirths)} forever`, 12);
  save(); updateHUD(1); renderQuest();
}

/* ---------- Flex Card ---------- */
function flexData() {
  const s = G.state, pass = arcadePass().get?.() || { best: {} };
  const inv = s.shelves.reduce((a, d) => a + (d.p >= 0 ? d.n * PRODUCTS[d.p].value : 0), 0) + s.dock.reduce((a, b) => a + b.n * PRODUCTS[b.p].value, 0);
  return {
    net: Math.round(s.cash + stonksValue(s) + inv), rebirths: s.rebirths || 0, rank: RANKS[rankOf(s.aura)].name, aura: Math.floor(s.aura), trophies: s.trophies.length,
    snake: pass.best?.snake || 0, tokens: tokenCount(), earned: Math.round(s.stats.earned), sold: s.stats.sold, district: districtOf(s).name, store: TIERS[s.tier].name
  };
}
function openFlex() {
  openModal('flex', () => {
    const f = flexData();
    return `${head('📊 FLEX STATS', 'Screenshot it, copy it, send it to the group chat')}<div class="rt-scroll"><div class="rt-flex">
      <div class="rt-flex-top"><span class="rt-flex-logo">RESELL<b>TYCOON</b></span>${f.rebirths ? `<span class="rt-flex-badge">★ PRESTIGE ${f.rebirths}</span>` : ''}</div>
      <div class="rt-flex-net"><small>NET WORTH</small><b>${money(f.net)}</b></div>
      <div class="rt-flex-grid">${[['✦ Aura Rank', f.rank], ['♻️ Rebirths', f.rebirths], ['🏆 Trophies', `${f.trophies}/${TROPHIES.length}`], ['🐍 Snake Best', f.snake], ['🎟️ Tokens', f.tokens.toLocaleString('en-US')], ['📦 Items Sold', f.sold.toLocaleString('en-US')], ['💵 Total Earned', money(f.earned)], ['📍 District', f.district]].map(([a, b]) => `<div><small>${a}</small><b>${b}</b></div>`).join('')}</div>
      <div class="rt-flex-foot">${f.store} · JaydenGames</div></div>
      <div class="rt-btnrow center"><button class="rt-buy" data-do="copyFlex" data-autofocus>📋 Copy Flex</button><button class="rt-ghost" data-do="saveFlex">🖼️ Save image</button></div></div>`;
  }, { cls: 'rt-flex-modal' });
}
function flexText() {
  const f = flexData();
  return `🏪 RESELL TYCOON FLEX 🏪\n💰 Net Worth: ${money(f.net)}\n✦ Aura Rank: ${f.rank} (${f.aura} Aura)\n♻️ Rebirths: ${f.rebirths}${f.rebirths ? ` (★ Prestige ${f.rebirths})` : ''}\n🏆 Trophies: ${f.trophies}/${TROPHIES.length}\n🐍 Snake Best: ${f.snake}\n🎟️ Arcade Tokens: ${f.tokens}\n📍 ${f.district} · ${f.store}\nPlay on JaydenGames. Can you beat me?`;
}
function copyText(txt) {
  const fallback = () => { try { const ta = document.createElement('textarea'); ta.value = txt; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;left:-9999px;top:0'; (G.root || document.body).append(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok; } catch (e) { return false; } };
  const done = ok => toast(ok ? '📋 Flex copied. Paste it anywhere.' : 'Copy was blocked. Select the text and copy it manually.', ok ? 'good' : 'warn');
  try { if (navigator.clipboard?.writeText) { navigator.clipboard.writeText(txt).then(() => done(true), () => done(fallback())); return; } } catch (e) {}
  done(fallback());
}
function saveFlexImage() {
  const f = flexData(), c = document.createElement('canvas'); c.width = 720; c.height = 900; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 720, 900); gr.addColorStop(0, '#2b1055'); gr.addColorStop(1, '#0f8b8d'); g.fillStyle = gr; g.fillRect(0, 0, 720, 900);
  g.fillStyle = '#ffffff'; roundRect(g, 30, 30, 660, 840, 36); g.fill(); g.lineWidth = 8; g.strokeStyle = '#1b1f2a'; g.stroke();
  g.textAlign = 'center'; g.fillStyle = '#1b1f2a'; g.font = '900 54px system-ui'; g.fillText('RESELL TYCOON', 360, 120);
  if (f.rebirths) { g.fillStyle = '#ffd166'; roundRect(g, 240, 145, 240, 46, 23); g.fill(); g.fillStyle = '#1b1f2a'; g.font = '900 24px system-ui'; g.fillText(`★ PRESTIGE ${f.rebirths}`, 360, 177); }
  g.fillStyle = '#6b7280'; g.font = '800 24px system-ui'; g.fillText('NET WORTH', 360, 250); g.fillStyle = '#18a957'; g.font = '900 76px system-ui'; g.fillText(money(f.net), 360, 330);
  const rows = [['Aura Rank', f.rank], ['Rebirths', f.rebirths], ['Trophies', `${f.trophies}/${TROPHIES.length}`], ['Snake Best', f.snake], ['Arcade Tokens', f.tokens], ['Items Sold', f.sold], ['Total Earned', money(f.earned)], ['District', f.district]];
  rows.forEach(([a, b], i) => { const x = 70 + (i % 2) * 300, y = 380 + Math.floor(i / 2) * 110; g.fillStyle = '#f1f3f8'; roundRect(g, x, y, 280, 92, 18); g.fill(); g.textAlign = 'left'; g.fillStyle = '#6b7280'; g.font = '800 20px system-ui'; g.fillText(a, x + 18, y + 32); g.fillStyle = '#1b1f2a'; g.font = '900 28px system-ui'; let t = String(b); while (g.measureText(t).width > 250 && t.length > 4) t = t.slice(0, -2) + '…'; g.fillText(t, x + 18, y + 72); });
  g.textAlign = 'center'; g.fillStyle = '#6b7280'; g.font = '800 22px system-ui'; g.fillText('Play on JaydenGames', 360, 840);
  try { const a = document.createElement('a'); a.download = 'resell-tycoon-flex.png'; a.href = c.toDataURL('image/png'); (G.root || document.body).append(a); a.click(); a.remove(); toast('🖼️ Flex card saved', 'good'); } catch (e) { toast('Saving images is blocked here. Take a screenshot instead.', 'warn'); }
}

/* ---------- Extra button actions ---------- */
const DO_EXTRA = {
  drip: el => buyDrip(el.dataset.c, el.dataset.i),
  wardrobe: () => openWardrobe(), flex: () => openFlex(),
  copyFlex: () => copyText(flexText()), saveFlex: () => saveFlexImage(),
  arcPlay: el => arcPlay(el.dataset.g), arcX: el => arcTrade(el.dataset.x),
  buyArcade: () => { const s = G.state; if (s.arcade || !spend(500)) return; s.arcade = true; afterUpgrade('Arcade Cabinet installed', true); toast('🕹️ The cabinet is by the back wall. Walk up and press E.', 'gold'); },
  stBuy: el => stonkBuy(+el.dataset.s, el.dataset.n), stSell: el => stonkSell(+el.dataset.s, el.dataset.n),
  rebirth: () => { const s = G.state, nd = DISTRICTS[Math.min(DISTRICTS.length - 1, (s.rebirths || 0) + 1)]; confirmBox('Rebirth your franchise?', `Sell this store and move to <b>${nd.name}</b>. Cash, store size, upgrades, staff, and stock reset. You keep trophies, drip, and decor, and earn a permanent <b>${multText((s.rebirths || 0) + 1)}</b> cash & Aura multiplier.`, '♻️ Rebirth', doRebirth); }
};

/* ---------- Popups & particles ---------- */
let _v = null;
function popup(text, pos, kind = 'cash') {
  const el = document.createElement('div'); el.className = 'rt-pop ' + kind; el.textContent = text; $('.rt-world').append(el);
  G.popups.push({ el, x: pos.x, y: pos.y ?? 1.8, z: pos.z, t: 0 });
}
function sparkle(pos, count = 16, color = 0xffffff) {
  if (G.settings.preset === 'Low') count = Math.ceil(count / 2);
  const geo = new THREE.BufferGeometry(), arr = new Float32Array(count * 3), vel = [];
  for (let i = 0; i < count; i++) { arr[i * 3] = pos.x; arr[i * 3 + 1] = pos.y; arr[i * 3 + 2] = pos.z; vel.push([rand(-1.5, 1.5), rand(1, 3.5), rand(-1.5, 1.5)]); }
  geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const mat = new THREE.PointsMaterial({ color, size: 0.14, transparent: true, opacity: 1, depthWrite: false });
  const pts = new THREE.Points(geo, mat); G.scene.add(pts); G.particles.push({ pts, vel, t: 0 });
  if (G.particles.length > 10) { const o = G.particles.shift(); G.scene.remove(o.pts); o.pts.geometry.dispose(); o.pts.material.dispose(); }
}
function updateFX(dt) {
  for (let i = G.particles.length - 1; i >= 0; i--) {
    const p = G.particles[i]; p.t += dt; const a = p.pts.geometry.attributes.position;
    for (let k = 0; k < p.vel.length; k++) { p.vel[k][1] -= 6 * dt; a.array[k * 3] += p.vel[k][0] * dt; a.array[k * 3 + 1] += p.vel[k][1] * dt; a.array[k * 3 + 2] += p.vel[k][2] * dt; }
    a.needsUpdate = true; p.pts.material.opacity = Math.max(0, 1 - p.t / 1.1);
    if (p.t > 1.1) { G.scene.remove(p.pts); p.pts.geometry.dispose(); p.pts.material.dispose(); G.particles.splice(i, 1); }
  }
}
/* ---------- Screen projection: labels, bubbles, popups ---------- */
function project(x, y, z) { if (!_v) _v = new THREE.Vector3(); _v.set(x, y, z).project(G.camera); if (_v.z > 1 || _v.z < -1) return null; return { x: (_v.x + 1) / 2 * G.vw, y: (1 - _v.y) / 2 * G.vh }; }
function updateOverlays(dt) {
  const cam = G.camera.position, play = G.mode === 'play', placed = [];
  const overlap = r => placed.some(q => r.x < q.x + q.w && r.x + r.w > q.x && r.y < q.y + q.h && r.y + r.h > q.y);
  // Speech bubbles & VIP name tags (occluded by walls, decluttered)
  const list = G.npcs.concat(Object.values(G.staffNPC).filter(Boolean)).filter(n => n.bubble || n.tag).map(n => ({ n, d: Math.hypot(n.x - cam.x, n.z - cam.z) })).sort((a, b) => a.d - b.d);
  G.bubbleCheck = (G.bubbleCheck || 0) - dt; const recheck = G.bubbleCheck <= 0; if (recheck) G.bubbleCheck = 0.2;
  const seen = new Set();
  for (const { n, d } of list) {
    let el = n.bubbleEl; if (!el) { el = n.bubbleEl = document.createElement('div'); el.className = 'rt-bubble'; $('.rt-world').append(el); }
    seen.add(el);
    if (recheck) n.occluded = segBlocked(cam.x, cam.y, cam.z, n.x, 2.3, n.z, G.allCols, ['wall', 'lintel']);
    const p = (play || G.mode === 'title') && d < 16 && !n.occluded ? project(n.x, 2.3, n.z) : null;
    if (!p) { el.hidden = true; continue; }
    const html = `${n.tag ? `<em class="${n.vip || 'staff'}">${esc(n.tag)}</em>` : ''}${n.bubble ? `<span>${esc(n.bubble.text)}</span>` : ''}`;
    if (el._h !== html) { el.innerHTML = html; el._h = html; el.classList.toggle('tagonly', !n.bubble); }
    el.hidden = false; const w = el.offsetWidth || 120, h = el.offsetHeight || 30; let r = { x: p.x - w / 2, y: p.y - h, w, h }, tries = 0;
    while (overlap(r) && tries++ < 3) r.y -= h + 4;
    if (overlap(r) || r.y < 40) { el.hidden = true; continue; }
    placed.push(r); el.style.transform = `translate(${r.x | 0}px,${r.y | 0}px)`; el.style.opacity = d > 11 ? 0.6 : 1;
  }
  $$('.rt-bubble').forEach(el => { if (!seen.has(el)) el.remove(); });
  // Station labels
  const labels = G.labels || [];
  labels.forEach(L => {
    const pos = L.pos(); const d = Math.hypot(pos.x - cam.x, pos.z - cam.z);
    const show = play && G.settings.labels && d > 2.4 && d < 11 && !G.modals.length && (!G.target || G.target.key !== L.key);
    let p = show ? project(pos.x, pos.y, pos.z) : null;
    if (p && recheck) L.occ = segBlocked(cam.x, cam.y, cam.z, pos.x, pos.y, pos.z, G.allCols, ['wall', 'lintel']); if (L.occ) p = null;
    if (!p) { L.el.hidden = true; return; }
    L.el.hidden = false; const w = L.el.offsetWidth || 80, h = L.el.offsetHeight || 22, r = { x: p.x - w / 2, y: p.y - h / 2, w, h };
    if (overlap(r)) { L.el.hidden = true; return; } placed.push(r); L.el.style.transform = `translate(${r.x | 0}px,${r.y | 0}px)`;
  });
  // Rising cash popups
  for (let i = G.popups.length - 1; i >= 0; i--) {
    const pp = G.popups[i]; pp.t += dt; const p = project(pp.x, pp.y + pp.t * 0.9, pp.z);
    if (!p || pp.t > 1.5) { if (pp.t > 1.5) { pp.el.remove(); G.popups.splice(i, 1); } else pp.el.hidden = true; continue; }
    pp.el.hidden = false; pp.el.style.transform = `translate(${p.x | 0}px,${p.y | 0}px) translate(-50%,-50%) scale(${1 + Math.max(0, 0.3 - pp.t)})`; pp.el.style.opacity = String(Math.min(1, (1.5 - pp.t) * 2));
  }
}
function makeLabels() {
  $$('.rt-label').forEach(e => e.remove());
  const P = G.P, mk = (key, text, pos) => { const el = document.createElement('div'); el.className = 'rt-label'; el.textContent = text; el.hidden = true; $('.rt-world').append(el); return { key, el, pos }; };
  G.labels = [
    mk('laptop', '💻 Laptop', () => ({ x: P.laptop.x, y: 1.7, z: P.laptop.z })),
    mk('checkout', '🧾 Checkout', () => ({ x: P.checkout.x, y: 2.1, z: P.checkout.z + 0.6 })),
    mk('dock', '📦 Delivery Dock', () => ({ x: P.dock.x, y: 2.0, z: P.dock.z })),
    mk('trophy', '🏆 Trophy Wall', () => ({ x: P.trophy.x, y: 3.2, z: P.trophy.z })),
    mk('dumpster', '♻️ Dumpster', () => ({ x: P.dumpster.x, y: 1.9, z: P.dumpster.z })),
    mk('mirror', '🪞 Drip Locker', () => ({ x: P.mirror.x, y: 2.75, z: P.mirror.z }))
  ];
  if (P.arcade) G.labels.push(mk('arcade', '🕹️ Arcade', () => ({ x: P.arcade.x, y: 2.55, z: P.arcade.z })));
}
/* ---------- Interaction targets (strict distance + facing + actionable) ---------- */
function targets() {
  const s = G.state, P = G.P, out = [], carry = topCarry(), full = s.carry.length >= carryCap();
  out.push({ key: 'laptop', pos: { x: P.laptop.x, y: 1.05, z: P.laptop.z }, label: 'Open Laptop', act: 'interact', run: () => openLaptop() });
  out.push({ key: 'sign', pos: { x: P.sign.x, y: P.sign.y, z: G.player.z >= 0 ? 0.18 : -0.18 }, label: s.open ? 'Flip sign to CLOSED' : 'Flip sign to OPEN', act: 'interact', run: toggleOpen });
  if (!full) s.dock.forEach((b, k) => { const sp = P.dockSlot(k); if (k >= s.dock.length - 6 || !s.dock[k + 6]) out.push({ key: 'dock', pos: { x: sp.x, y: sp.y + 0.3, z: sp.z }, label: 'Pick up delivery', act: 'interact', alt: 'pickDrop', run: () => pickupDock(k), size: 0.3 }); });
  if (!full) s.floorBoxes.forEach(b => out.push({ key: 'floorbox', pos: { x: b.x, y: b.y + 0.25, z: b.z }, label: `Pick up box${b.n ? '' : ' (empty)'}`, act: 'interact', alt: 'pickDrop', run: () => pickupFloor(b), size: 0.3 }));
  G.shelves.forEach(sh => {
    const d = s.shelves[sh.i];
    if (carry && carry.n > 0 && (d.p === -1 || d.p === carry.p || d.n === 0) && d.n < shelfCap()) out.push({ key: 'shelf' + sh.i, pos: { x: sh.x, y: 0.9, z: sh.z - 0.25 }, label: carry.open ? `Place ${PRODUCTS[carry.p].name} (${d.n}/${shelfCap()})` : `Open the box first`, act: carry.open ? 'useTool' : 'flaps', alt: carry.open ? 'interact' : null, hold: carry.open, run: () => carry.open ? placeItem(sh) : toggleFlaps(), size: 0.9, boost: 0.15 });
    if (d.p >= 0) out.push({ key: 'tag' + sh.i, pos: { x: sh.tagPos.x, y: sh.tagPos.y, z: sh.tagPos.z }, label: `Set price · ${PRODUCTS[d.p].name} ${money(s.prices[d.p])}`, act: 'interact', run: () => openPrice(d.p), size: 0.12 });
  });
  const c = G.checkout;
  if (c.customer && c.customer.state === 'counter') {
    c.items.forEach(it => { if (!it.scanned) out.push({ key: 'item', pos: { x: it.mesh.position.x, y: it.mesh.position.y + 0.05, z: it.mesh.position.z }, label: 'Scan item', act: 'useTool', alt: 'interact', run: () => scanItem(it), size: 0.12 }); });
    if (c.items.length && c.items.every(x => x.scanned)) out.push({ key: 'pay', pos: { x: P.checkout.x + 0.2, y: 1.3, z: P.checkout.z + 0.85 }, label: 'Take payment', act: 'interact', alt: 'useTool', run: openPay, size: 0.6 });
  }
  if (carry && carry.n === 0) out.push({ key: 'dumpster', pos: { x: P.dumpster.x, y: 1.0, z: P.dumpster.z }, label: 'Toss empty box (+$2)', act: 'interact', alt: 'pickDrop', run: tossBox, size: 0.9, reach: 2.4 });
  G.trash.forEach(t => out.push({ key: 'trash', pos: { x: t.x, y: 0.1, z: t.z }, label: 'Clean up trash (+$15, +5 Aura)', act: 'interact', run: () => cleanTrash(t), size: 0.25 }));
  out.push({ key: 'trophy', pos: { x: P.trophy.x, y: 1.6, z: P.trophy.z }, label: 'View milestones', act: 'interact', run: () => openLaptop(4), size: 1.0 });
  out.push({ key: 'mirror', pos: { x: P.mirror.x, y: 1.3, z: P.mirror.z }, label: 'Open Drip Locker', act: 'interact', run: () => openWardrobe(), size: 0.6 });
  if (P.arcade) out.push({ key: 'arcade', pos: { x: P.arcade.x, y: 1.4, z: P.arcade.z }, label: 'Play Arcade Cabinet', act: 'interact', run: openArcade, size: 0.5 });
  return out;
}
function findTarget() {
  const pl = G.player, pad = G.inputMode === 'pad', ex = pl.x, ey = pl.y + 1.55, ez = pl.z;
  const cp = Math.cos(pl.pitch), fx = -Math.sin(pl.yaw) * cp, fy = Math.sin(pl.pitch), fz = -Math.cos(pl.yaw) * cp;
  let best = null, bs = 1e9;
  for (const t of targets()) {
    const dx = t.pos.x - ex, dy = t.pos.y - ey, dz = t.pos.z - ez, hd = Math.hypot(dx, dz), d = Math.hypot(dx, dy, dz);
    const reach = (t.reach || 2.0) + (pad && G.ctrl.aimAssist ? 0.2 : 0);
    if (hd > reach) continue;
    const cos = (dx * fx + dy * fy + dz * fz) / Math.max(0.001, d), ang = Math.acos(clamp(cos, -1, 1)), allow = Math.atan2((t.size || 0.35), d) + (pad && G.ctrl.aimAssist ? 0.42 : 0.2);
    if (ang > allow) continue;
    if (segBlocked(ex, ey, ez, t.pos.x, t.pos.y, t.pos.z, G.allCols, ['wall', 'lintel'])) continue;
    const sc = ang / allow + d * 0.08 - (t.boost || 0); if (sc < bs) { bs = sc; best = t; }
  }
  return best;
}
function toggleOpen() { G.state.open = !G.state.open; drawDoorSign(); G.sound.play(G.state.open ? 'ding' : 'click'); toast(G.state.open ? '🟢 Store is OPEN — customers are on the way' : '🔴 Store is CLOSED'); if (G.state.open) { G.spawnT = Math.min(G.spawnT, 3); tutorialEvent('open'); } requestSave(); drawRegister(); }
/* ---------- Tutorial ---------- */
const TUT = [
  { text: 'Open the Store Laptop', hint: () => `Walk to the laptop and press ${B('interact')}, or press ${B('laptop')} anywhere`, target: () => ({ x: G.P.laptop.x, y: 1.1, z: G.P.laptop.z }) },
  { text: 'Order a box of Sneakers', hint: () => 'Laptop → Orders → Sneakers → <b>Order 1 box</b>', target: () => ({ x: G.P.laptop.x, y: 1.1, z: G.P.laptop.z }) },
  { text: 'Pick up the box at the Delivery Dock', hint: () => G.state.dock.length ? `Look at the box and press ${B('interact')}` : 'Your delivery is on the way…', target: () => ({ x: G.P.dock.x, y: 0.5, z: G.P.dock.z }) },
  { text: 'Open the box and stock a shelf', hint: () => topCarry()?.open ? `Aim at a shelf and ${B('useTool')} (hold) to place items · ${G.tutStock || 0}/6` : `Press ${B('flaps')} to open the box flaps`, target: () => { const sh = G.shelves.find(x => G.state.shelves[x.i].p === 1 && G.state.shelves[x.i].n < shelfCap()) || G.shelves.find(x => G.state.shelves[x.i].n === 0) || G.shelves[0]; return { x: sh.x, y: 1.0, z: sh.z - 0.3 }; } },
  { text: 'Set the shelf price tag', hint: () => `Aim at the yellow price tag and press ${B('interact')}`, target: () => { const sh = G.shelves.find(x => G.state.shelves[x.i].p >= 0) || G.shelves[0]; return { ...sh.tagPos }; } },
  { text: 'Flip the front door sign to OPEN', hint: () => `Look at the red sign by the door and press ${B('interact')}`, target: () => ({ ...G.P.sign }) },
  { text: 'Scan your first customer at checkout', hint: () => G.checkout.customer ? `Stand behind the counter. ${B('useTool')} to scan, then take payment` : 'A customer is coming. Head to the checkout.', target: () => ({ x: G.P.checkout.x, y: 1.2, z: G.P.checkout.z }) }
];
function tutorialEvent(ev, data) {
  const s = G.state, st = s.tutorial; if (st < 0 || st >= 7) return;
  const adv = () => { s.tutorial++; G.sound.play('buy'); if (s.tutorial >= 7) { earn(50, { x: G.player.x, y: 2, z: G.player.z + 1 }, 'bonus'); toast('🎉 Tutorial complete! <b>+$50 bonus</b>. Upgrade your empire from the laptop.', 'gold'); G.sound.play('fanfare'); G.nextEvent = 60; } else toast(`✅ ${TUT[st].text}`, 'good'); renderQuest(); requestSave(); };
  if (st === 0 && ev === 'laptop') adv();
  else if (st === 1 && ev === 'order') adv();
  else if (st === 2 && ev === 'carry') adv();
  else if (st === 3 && ev === 'stock') { G.tutStock = (G.tutStock || 0) + 1; if (G.tutStock >= 6 || (topCarry() && topCarry().n === 0)) adv(); else renderQuest(); }
  else if (st === 4 && ev === 'price') adv();
  else if (st === 5 && ev === 'open') { adv(); if (!G.npcs.some(n => n.state !== 'walkby')) G.tutCustomerT = 1.5; }
  else if (st === 6 && ev === 'sale') adv();
}
function tutorialAuto() { // keep progress sensible if the player skips ahead
  const s = G.state; if (s.tutorial < 0 || s.tutorial >= 7) return;
  if (s.tutorial === 1 && (s.orders.length || s.dock.length)) tutorialEvent('order');
  if (s.tutorial === 2 && s.carry.length) tutorialEvent('carry');
  if (s.tutorial === 5 && s.open) tutorialEvent('open');
  if (s.tutorial === 6 && !G.checkout.customer && !G.npcs.some(n => !['walkby', 'exit', 'leaving', 'leave'].includes(n.state))) { G.tutCustomerT = (G.tutCustomerT ?? 2) - G.dt; if (G.tutCustomerT <= 0) { G.tutCustomerT = 9; spawnCustomer('shopper', { at: { x: 4, z: -2 }, wants: [1] }); } }
}
function renderQuest() {
  const el = $('[data-quest]'), s = G.state; if (!el) return;
  if (s.tutorial < 0 || s.tutorial >= 7 || G.mode !== 'play') { el.hidden = true; G.waypoint.visible = false; return; }
  const st = TUT[s.tutorial];
  el.hidden = false; el.innerHTML = `<div class="rt-qhead"><span>TUTORIAL ${s.tutorial + 1}/7</span><button class="rt-qskip" data-do="skipTutorial">Skip ${B('skip')}</button></div><b>${st.text}</b><p>${st.hint()}</p><div class="rt-bar"><b style="width:${(s.tutorial / 7) * 100}%"></b></div>`;
}
/* ---------- Player ---------- */
function resetPlayer() { const pl = G.player; pl.x = 0; pl.z = 1.6; pl.y = 0; pl.vy = 0; pl.yaw = Math.PI; pl.pitch = -0.08; }
function collide(pl) {
  const r = 0.3;
  for (const c of G.allCols) {
    if (pl.y >= c.maxY - 0.05) continue;
    const nx = clamp(pl.x, c.minX, c.maxX), nz = clamp(pl.z, c.minZ, c.maxZ), dx = pl.x - nx, dz = pl.z - nz, d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      if (d2 > 1e-8) { const d = Math.sqrt(d2); pl.x = nx + dx / d * r; pl.z = nz + dz / d * r; }
      else { const o = [pl.x - c.minX, c.maxX - pl.x, pl.z - c.minZ, c.maxZ - pl.z], m = Math.min(...o); if (m === o[0]) pl.x = c.minX - r; else if (m === o[1]) pl.x = c.maxX + r; else if (m === o[2]) pl.z = c.minZ - r; else pl.z = c.maxZ + r; }
    }
  }
  pl.x = clamp(pl.x, -45, 45); pl.z = clamp(pl.z, -15.5, 20);
}
function updatePlayer(dt) {
  const pl = G.player, k = G.keys, pad = G.pad; let mx = 0, mz = 0;
  if (k.has('w') || k.has('arrowup')) mz -= 1; if (k.has('s') || k.has('arrowdown')) mz += 1; if (k.has('a') || k.has('arrowleft')) mx -= 1; if (k.has('d') || k.has('arrowright')) mx += 1;
  if (G.touch.active) { mx += G.touch.mx; mz += G.touch.mz; }
  if (pad.pad) { mx += pad.lx; mz += pad.ly; const lk = 2.8 * G.ctrl.sens * dt; pl.yaw -= pad.rx * lk; pl.pitch -= pad.ry * lk * (G.ctrl.invertY ? -1 : 1); }
  const m = Math.hypot(mx, mz); if (m > 1) { mx /= m; mz /= m; }
  const speed = 4.2 * (1 + 0.15 * G.state.perks.speed) * (k.has('shift') ? 1.35 : 1), sy = Math.sin(pl.yaw), cy = Math.cos(pl.yaw);
  const vx = (mx * cy + mz * sy) * speed, vz = (-mx * sy + mz * cy) * speed;
  pl.x += vx * dt; pl.z += vz * dt; pl.moving = Math.hypot(vx, vz);
  pl.vy -= 22 * dt; pl.y += pl.vy * dt; if (pl.y <= 0) { pl.y = 0; pl.vy = 0; pl.ground = true; }
  collide(pl); pl.pitch = clamp(pl.pitch, -1.35, 1.35);
}
function jump() { const pl = G.player; if (pl.ground && pl.y <= 0.01) { pl.vy = 7; pl.ground = false; G.sound.play('jump'); } }
function updateCamera(dt) {
  const pl = G.player, cam = G.camera, third = G.settings.third;
  cam.rotation.set(pl.pitch, pl.yaw, 0, 'YXZ');
  const ex = pl.x, ey = pl.y + 1.55 + (pl.moving > 0.2 && !third ? Math.abs(Math.sin(G.clock * 9)) * 0.035 : 0), ez = pl.z;
  if (third) {
    const cp = Math.cos(pl.pitch), bx = Math.sin(pl.yaw) * cp, by = -Math.sin(pl.pitch), bz = Math.cos(pl.yaw) * cp; let dist = 3.6;
    while (dist > 0.6 && segBlocked(ex, ey + 0.3, ez, ex + bx * dist, ey + 0.3 + by * dist, ez + bz * dist, G.allCols, ['wall', 'lintel', 'solid'])) dist -= 0.3;
    cam.position.set(ex + bx * dist + Math.cos(pl.yaw) * 0.5, ey + 0.3 + by * dist, ez + bz * dist - Math.sin(pl.yaw) * 0.5);
  } else cam.position.set(ex, ey, ez);
  const av = pl.av; av.root.visible = third; av.root.position.set(pl.x, pl.y, pl.z); av.root.rotation.y = pl.yaw + Math.PI; av.carrying = G.state.carry.length > 0; av.toolOut = G.state.tool > 0;
  animateAvatar(av, pl.ground ? pl.moving : 0, dt, G.clock);
  G.vm.visible = !third && G.mode === 'play';
  const bob = pl.moving > 0.2 ? Math.sin(G.clock * 9) * 0.02 : 0;
  G.vm.position.set(0, bob, 0);
}
function refreshCarry() {
  const s = G.state, el = $('[data-carry]');
  G.vmBoxes.clear(); G.player.av.carry.clear();
  s.carry.forEach((b, i) => { const m = makeBox(b); m.scale.setScalar(0.7); m.position.set(0.18, -0.66 + i * 0.3, -0.95); m.rotation.y = -0.25; G.vmBoxes.add(m); const m2 = makeBox(b); m2.position.set(0, i * 0.43 - 0.2, 0); G.player.av.carry.add(m2); });
  G.vmArm.visible = !s.carry.length; G.vmTool.visible = !s.carry.length;
  if (el) { const b = topCarry(); el.hidden = !b; if (b) el.innerHTML = `📦 <b>${PRODUCTS[b.p].name}</b> ${b.n}/${PRODUCTS[b.p].per} · ${b.open ? 'Open' : `Sealed — ${B('flaps')} open`}${s.carry.length > 1 ? ` · ${s.carry.length} boxes` : ''} · ${B('pickDrop')} drop`; }
  requestSave(true);
}
function setTool(i) {
  const s = G.state; s.tool = ((i % 4) + 4) % 4; G.sound.play('click');
  G.vmTool.clear(); G.player.av.toolHolder.clear();
  const id = TOOLS[s.tool].id; if (id !== 'hands') { G.vmTool.add(makeTool(id)); G.player.av.toolHolder.add(makeTool(id)); }
  renderHotbar();
}
function renderHotbar() { const el = $('[data-hotbar]'); if (!el) return; el.innerHTML = `${B('prevTool')}` + TOOLS.map((t, i) => `<button class="rt-slot ${G.state.tool === i ? 'on' : ''}" data-do="tool" data-i="${i}"><kbd>${i + 1}</kbd><span>${t.icon}</span><small>${t.name}</small></button>`).join('') + `${B('nextTool')}`; refreshBadges(el); }
function useTool(held) {
  const s = G.state, t = G.target, tool = TOOLS[s.tool].id;
  if (t && (t.act === 'useTool' || t.alt === 'useTool')) { if (held && !t.hold) return; if (t.key === 'item' && tool !== 'scanner' && tool !== 'hands') return t.run(); t.run(); return; }
  if (held) return;
  if (tool === 'paint') paintWall();
  else if (tool === 'grabber') grabber();
  else if (tool === 'scanner') G.sound.play('beep');
}
function paintWall() {
  const pl = G.player; if (!(pl.z > 0 && Math.abs(pl.x) < G.P.hw)) { toast('Paint works on your store walls — head inside.', 'warn'); return; }
  const own = G.state.owned.walls; if (own.length < 2) { toast('🎨 Buy more wall styles in Laptop → Decorate', 'warn'); G.sound.play('error'); return; }
  const k = own.indexOf(G.state.decor.walls); G.state.decor.walls = own[(k + 1) % own.length]; applyDecor(); G.sound.play('spray');
  sparkle({ x: pl.x - Math.sin(pl.yaw) * 1.5, y: 1.6, z: pl.z - Math.cos(pl.yaw) * 1.5 }, 20, 0xff3dbb); toast(`🎨 Walls: ${DECOR.walls.opts[G.state.decor.walls][0]}`); requestSave();
}
function grabber() {
  const pl = G.player;
  if (G.grab) { const b = G.grab, cp = Math.cos(pl.pitch); b.vx = -Math.sin(pl.yaw) * cp * 9; b.vz = -Math.cos(pl.yaw) * cp * 9; b.vy = Math.sin(pl.pitch) * 9 + 2; G.grab = null; G.sound.play('whoosh'); G.pad.rumble(0.5, 90); return; }
  let best = null, bd = 4.5; G.state.floorBoxes.forEach(b => { const d = Math.hypot(b.x - pl.x, b.z - pl.z); const ang = Math.abs(Math.atan2(-(b.x - pl.x), -(b.z - pl.z)) - pl.yaw) % (Math.PI * 2); if (d < bd && (ang < 0.6 || ang > Math.PI * 2 - 0.6)) { bd = d; best = b; } });
  if (best) { G.grab = best; G.sound.play('pop'); } else toast('🧲 Grabber: aim at a box on the floor (drop one with ' + B('pickDrop') + ')', 'warn');
}
function updateGrab() { const b = G.grab; if (!b) return; const pl = G.player, cp = Math.cos(pl.pitch); b.x = lerp(b.x, pl.x - Math.sin(pl.yaw) * cp * 2, 0.3); b.z = lerp(b.z, pl.z - Math.cos(pl.yaw) * cp * 2, 0.3); b.y = lerp(b.y, clamp(pl.y + 1.2 + Math.sin(pl.pitch) * 2, 0, 3), 0.3); b.vx = b.vy = b.vz = 0.001; b._mesh.position.set(b.x, b.y, b.z); }
function doInteract() {
  const t = G.target;
  if (t && (t.act === 'interact' || t.alt === 'interact')) { t.run(); return; }
  if (t && t.act === 'flaps') { toggleFlaps(); return; }
  jump();
}
function doPickDrop() {
  const t = G.target;
  if (G.grab) { G.grab = null; return; }
  if (t && t.alt === 'pickDrop' && (t.key === 'dock' || t.key === 'floorbox' || t.key === 'dumpster')) { t.run(); return; }
  if (G.state.carry.length) { dropCarry(); return; }
}
function insideStore() { const p = G.player; return p.z > 0 && p.z < G.P.D && Math.abs(p.x) < G.P.hw; }
function quickLaptop() { if (!insideStore()) { toast('The laptop shortcut works inside your shop.', 'warn'); return; } openLaptop(); }
/* ---------- HUD ---------- */
function updateHUD(dt) {
  const s = G.state; G.hudT = (G.hudT || 0) - dt; if (G.hudT > 0) return; G.hudT = 0.2;
  $('[data-cash]').textContent = money(s.cash).replace('$', ''); $('[data-aura]').textContent = Math.floor(s.aura); $('[data-rank]').textContent = RANKS[rankOf(s.aura)].name;
  $('[data-clock]').textContent = clockText();
  const pb = $('[data-prestige]'); if (pb) { pb.hidden = !s.rebirths; if (s.rebirths) { const t = `★P${s.rebirths} ${multText(s.rebirths)}`; if (pb.textContent !== t) { pb.textContent = t; pb.title = `Prestige ${s.rebirths}: ${districtOf(s).name}, ${multText(s.rebirths)} cash & Aura`; } } }
  const st = $('[data-status]'); st.textContent = s.open ? '● OPEN' : '● CLOSED'; st.className = 'rt-pill rt-status ' + (s.open ? 'open' : 'closed');
  const ev = $('[data-event]'), b = G.banner || (G.fx.viral > 0 ? { title: '🔥 VIRAL RUSH!', desc: '2x shoppers', t: G.fx.viral, dur: 30 } : null);
  if (b) { ev.hidden = false; const html = `<b>${b.title}</b><span>${b.desc}</span><i><em style="width:${(b.t / b.dur) * 100}%"></em></i><small>${fmtTime(b.t)}</small>`; ev.innerHTML = html; } else ev.hidden = true;
  if (G.settings.fps) { const f = $('[data-fps]'); f.hidden = false; f.textContent = `${Math.round(G.fpsAvg)} FPS · ${Math.round(G.renderer.getPixelRatio() * 100)}% res`; } else $('[data-fps]').hidden = true;
  if (s.tutorial >= 0 && s.tutorial < 7) renderQuest();
  refreshRegisterHUD();
  const lap = topModal(); if (lap && lap.id === 'laptop' && lap.tab === 0) s.orders.forEach((o, k) => { const e = $(`[data-eta="${k}"]`), t = $(`[data-etat="${k}"]`); if (e) e.style.width = `${100 - (o.t / Math.max(1, o.total || 1)) * 100}%`; if (t) t.textContent = o.t > 0 ? fmtTime(o.t) : 'Dock full'; });
  if (lap && lap.id === 'laptop' && lap.tab === 1) { const a = $('[data-autosell]'); if (a) a.textContent = fmtTime(G.autosellT); }
  const pr = $('[data-prompt]'), t = G.target;
  const key = t && G.mode === 'play' && !G.modals.length ? t.key + t.label + G.inputMode : '';
  if (key !== G.promptKey) { G.promptKey = key; pr.hidden = !key; if (key) pr.innerHTML = `${B(t.act)}${t.alt && t.alt !== t.act ? `<span class="rt-or">or</span>${B(t.alt)}` : ''}<span>${esc(t.label)}</span>${t.hold ? '<small>hold</small>' : ''}`; }
}
/* ---------- Save / offline ---------- */
function snapshot() { const s = G.state; s.lastSave = Date.now(); return JSON.stringify(s, (k, v) => k.startsWith('_') || ['mesh', 'vx', 'vy', 'vz', 'warned'].includes(k) ? undefined : v); }
function save(quiet) {
  if (G.mode !== 'play' && !G.forceSave) return; const ok = LS.set(SAVE_KEY, snapshot()); G.lastSaveT = G.clock; G.dirty = false;
  if (!quiet) { if (ok) savedBadge(); else if (!G.warnedLS) { G.warnedLS = true; toast('Browser storage is blocked here — use Settings → Game → Copy save code', 'warn'); } }
}
function requestSave(soft) { G.dirty = true; if (!soft) G.saveSoon = 0.6; }
function offlineCheck() {
  const s = G.state, away = (Date.now() - s.lastSave) / 1000; if (away < 120) return;
  const secs = Math.min(away, 8 * 3600), lines = [], perMin = { base: s.shelves.some(d => d.n > 0) ? 1 + 1.5 * s.tier : 0.25, online: 2.5 * s.tracks.autosell, cashier: s.staff.cashier ? 3 : 0, restock: s.staff.restocker ? 1.5 : 0, traffic: 0.8 * s.tracks.customers };
  const amt = Math.round(Object.values(perMin).reduce((a, b) => a + b, 0) * secs / 60);
  lines.push(`Store traffic ${money(perMin.base * secs / 60)}`); if (perMin.online) lines.push(`Online store ${money(perMin.online * secs / 60)}`); if (perMin.cashier) lines.push(`AI Cashier ${money(perMin.cashier * secs / 60)}`); if (perMin.restock) lines.push(`AI Restocker ${money(perMin.restock * secs / 60)}`);
  s.orders.forEach(o => o.t = 0); if (amt > 0) openWelcome({ secs, amount: amt, lines });
}
/* ---------- Title, intro ---------- */
function showTitle() {
  G.mode = 'title'; G.paused = false; G.modals.slice().forEach(m => closeModal(m.id, true));
  $('.rt-hud').hidden = true; $('[data-cine]').hidden = true; $('[data-title]').hidden = false; G.savedState = loadSaved(); renderTitle();
  if (document.pointerLockElement) document.exitPointerLock?.();
  setTimeout(() => { const b = $('[data-title] [data-autofocus]'); b && focusEl(b, G.inputMode !== 'pad'); }, 30);
}
function startGame(fresh) {
  G.state = fresh ? freshState() : (loadSaved() || freshState()); G.fx = { viral: 0, flash: 0, drop: 0, discount: 0 };
  clearWorldActors(); buildStore(); makeLabels(); resetPlayer(); rebuildPlayerAvatar(); setTool(G.state.tool); refreshCarry(); spawnStaff();
  G.autosellT = autoSellFor(G.state.tracks.autosell) || 30; G.nextEvent = rand(60, 110); G.spawnT = 4;
  $('[data-title]').hidden = true; G.sound.startMusic();
  if (!G.state.introSeen) playIntro(); else enterPlay(!fresh);
}
function enterPlay(checkOffline) {
  G.mode = 'play'; $('[data-cine]').hidden = true; $('.rt-hud').hidden = false; G.state.introSeen = true; renderQuest(); renderHotbar(); G.promptKey = ''; updateHUD(1);
  if (checkOffline) offlineCheck(); save(true); refreshBadges();
  G.root.focus({ preventScroll: true });
}
function playIntro() {
  G.mode = 'intro'; G.introT = 0; $('.rt-hud').hidden = true; $('[data-cine]').hidden = false; $('[data-cine-text]').innerHTML = '';
  const P = G.P;
  G.introPath = new THREE.CatmullRomCurve3([new THREE.Vector3(2.2, 4.5, -15), new THREE.Vector3(0.6, 2.2, -4), new THREE.Vector3(0, 1.8, 1.2), new THREE.Vector3(-0.4, 1.8, P.D * 0.5), new THREE.Vector3(P.laptop.x + 1.2, 1.6, P.laptop.z - 1.6), new THREE.Vector3(0, 1.75, 4.6), new THREE.Vector3(0, 1.55, 1.6)]);
  G.introLook = [new THREE.Vector3(0, 2.5, 0), new THREE.Vector3(0, 1.8, 2), new THREE.Vector3(0, 1.4, P.D * 0.6), new THREE.Vector3(P.laptop.x, 1.0, P.laptop.z), new THREE.Vector3(P.laptop.x, 1.0, P.laptop.z), new THREE.Vector3(0, 1.4, 8), new THREE.Vector3(0, 1.4, 8)];
}
function updateIntro(dt) {
  G.introT += dt; const T = 7.5, t = Math.min(1, G.introT / T), e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  G.camera.position.copy(G.introPath.getPoint(e));
  const f = e * (G.introLook.length - 1), i = Math.min(G.introLook.length - 2, Math.floor(f)); const look = G.introLook[i].clone().lerp(G.introLook[i + 1], f - i); G.camera.lookAt(look);
  const txt = $('[data-cine-text]');
  const want = G.introT > 1.2 && G.introT < 6.2 ? '<b>RESELL TYCOON</b><span>Zero stock. Zero aura. Time to build your resell empire from scratch.</span>' : '';
  if (txt._w !== want) { txt.innerHTML = want; txt._w = want; txt.classList.toggle('on', !!want); }
  if (G.introT >= T) endIntro();
}
function endIntro() { if (G.mode !== 'intro') return; G.player.av.root.visible = false; enterPlay(false); G.sound.play('fanfare'); }
function updateTitleCam(dt) {
  const t = G.clock * 0.12, a = -Math.PI / 2 + Math.sin(t) * 0.85, R = 17, cx = 0, cz = 5;
  G.camera.position.set(cx + Math.cos(a) * R, 5.5 + Math.sin(t * 1.3) * 1.2, cz + Math.sin(a) * R); G.camera.lookAt(0, 2.2, 3);
  const av = G.player.av; av.root.visible = true; av.root.position.set(1.8, 0, -1.6); av.root.rotation.y = -0.6 + Math.sin(G.clock * 0.5) * 0.2; animateAvatar(av, 0, dt, G.clock);
}
function clearWorldActors() {
  (G.npcs || []).forEach(n => { G.scene.remove(n.av.root); n.bubbleEl?.remove(); });
  Object.values(G.staffNPC || {}).forEach(n => { if (n) { G.scene.remove(n.av.root); n.bubbleEl?.remove(); } });
  (G.trash || []).forEach(t => G.scene.remove(t.m)); G.checkout?.items?.forEach(x => x.mesh && G.scene.remove(x.mesh));
  G.npcs = []; G.staffNPC = {}; G.queue = []; G.trash = []; G.checkout = { customer: null, total: 0, items: [] }; G.banner = null; G.vipNPC = null; G.grab = null; G.tutStock = 0;
}
/* ---------- Gamepad UI navigation (focus snapping + virtual cursor) ---------- */
function activeLayer() { const m = topModal(); if (m) return m.el; if (G.mode === 'title') return $('[data-title]'); return null; }
function focusables(layer) { return $$('button:not([disabled]), input[type=range], textarea, [data-focus]', layer).filter(e => e.offsetParent !== null && !e.closest('[hidden]')); }
function navMove(dx, dy) {
  const layer = activeLayer(); if (!layer) return; const list = focusables(layer); if (!list.length) return;
  const cur = list.includes(document.activeElement) ? document.activeElement : layer.querySelector('.gp-focus');
  if (!cur || !list.includes(cur)) { focusEl(list.find(e => e.dataset.autofocus !== undefined) || list[0]); return; }
  if (cur.type === 'range' && dx) { const st = +cur.step || 1; cur.value = clamp(+cur.value + dx * st, +cur.min, +cur.max); cur.dispatchEvent(new Event('input', { bubbles: true })); G.sound.play('hover'); return; }
  const a = cur.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2; let best = null, bs = 1e9;
  for (const el of list) { if (el === cur) continue; const r = el.getBoundingClientRect(), bx = r.left + r.width / 2, by = r.top + r.height / 2, px = (bx - ax) * dx + (by - ay) * dy, sx = Math.abs((bx - ax) * dy) + Math.abs((by - ay) * dx); if (px <= 4) continue; const sc = px + sx * 2.2; if (sc < bs) { bs = sc; best = el; } }
  if (best) { focusEl(best); G.sound.play('hover'); }
}
function navActivate() {
  const vc = G.vcursor; if (vc.on && G.clock - vc.moved < 3) { const el = document.elementFromPoint(vc.x, vc.y); const btn = el?.closest('button, input, [data-focus]'); if (btn && activeLayer()?.contains(btn)) { btn.click(); return; } }
  const layer = activeLayer(), el = document.activeElement; if (layer && el && layer.contains(el) && el.tagName === 'BUTTON') el.click(); else navMove(0, 1);
}
function updateVCursor(dt) {
  const vc = G.vcursor, p = G.pad, el = $('.rt-vcursor'), layer = activeLayer();
  if (!layer || !p.pad) { if (vc.on) { vc.on = false; el.hidden = true; } return; }
  if (Math.hypot(p.rx, p.ry) > 0.05) {
    const rr = G.root.getBoundingClientRect(); if (!vc.on) { vc.on = true; vc.x = rr.left + rr.width / 2; vc.y = rr.top + rr.height / 2; }
    vc.x = clamp(vc.x + p.rx * 900 * dt, rr.left, rr.right - 4); vc.y = clamp(vc.y + p.ry * 900 * dt, rr.top, rr.bottom - 4); vc.moved = G.clock;
    const sc = document.elementFromPoint(vc.x, vc.y)?.closest('.rt-scroll'); if (sc) { const r = sc.getBoundingClientRect(); if (vc.y > r.bottom - 50) sc.scrollTop += 600 * dt; if (vc.y < r.top + 50) sc.scrollTop -= 600 * dt; }
    const hov = document.elementFromPoint(vc.x, vc.y)?.closest('button, input'); if (hov && layer.contains(hov) && hov !== vc.hover) { vc.hover = hov; focusEl(hov); }
  }
  el.hidden = !(vc.on && G.clock - vc.moved < 3); if (!el.hidden) { const rr = G.root.getBoundingClientRect(); el.style.transform = `translate(${vc.x - rr.left}px,${vc.y - rr.top}px)`; }
}
function handlePadUI(dt) {
  const p = G.pad; if (!p.pad || p.listen) return;
  if (p.swallow) { if (!p.cur.some(Boolean)) p.swallow = false; return; }
  if (G.arcadeHold && topModal()?.id === 'arcade') { if (p.pressed(1)) closeTop(); return; }
  const nav = G.navRep; let dx = 0, dy = 0;
  if (p.down(12)) dy = -1; else if (p.down(13)) dy = 1; else if (p.down(14)) dx = -1; else if (p.down(15)) dx = 1;
  else if (Math.abs(p.ly) > 0.55 || Math.abs(p.lx) > 0.55) { if (Math.abs(p.ly) > Math.abs(p.lx)) dy = Math.sign(p.ly); else dx = Math.sign(p.lx); }
  const dirKey = dx + ',' + dy;
  if (dirKey !== '0,0') { if (nav.key !== dirKey) { nav.key = dirKey; nav.t = 0.38; navMove(dx, dy); } else { nav.t -= dt; if (nav.t <= 0) { nav.t = 0.11; navMove(dx, dy); } } } else nav.key = '';
  const top = topModal();
  if (p.pressed(0)) navActivate();
  if (p.pressed(1)) { if (top) closeTop(); }
  if (p.pressed(4) || p.pressed(5)) { if (top && top.opt.tabs) { top.tab = (top.tab + (p.pressed(5) ? 1 : -1) + top.opt.tabs) % top.opt.tabs; top.opt.onTab?.(top.tab); renderModal(top, true); G.sound.play('click'); } }
  if (p.pressed(2)) { if (top?.id === 'price') DO.pMatch(); else if (top?.id === 'welcome') DO.claim2(); }
  if (p.pressed(3)) { if (G.mode === 'title' && !top) toggleFullscreen(); else if (top?.id === 'laptop') closeModal('laptop'); }
  if (p.pressed(9)) { if (top?.id === 'settings') closeModal('settings'); else if (!top || top.id !== 'welcome') openSettings(); }
}
function handlePadPlay(dt) {
  const p = G.pad; if (!p.pad || p.listen) return;
  if (p.swallow) { if (!p.cur.some(Boolean)) p.swallow = false; return; }
  if (p.actPressed('interact')) doInteract();
  if (p.actPressed('useTool')) useTool(false); else if (p.act('useTool')) { G.holdT -= dt; if (G.holdT <= 0) { G.holdT = 0.16; useTool(true); } } else G.holdT = 0.3;
  if (p.actPressed('pickDrop')) doPickDrop();
  if (p.actPressed('flaps')) toggleFlaps();
  if (p.actPressed('cancel')) { if (G.state.carry.length) dropCarry(); }
  if (p.actPressed('laptop')) quickLaptop();
  if (p.actPressed('nextTool')) setTool(G.state.tool + 1);
  if (p.actPressed('prevTool')) setTool(G.state.tool - 1);
  if (p.actPressed('fullscreen')) toggleFullscreen();
  if (p.actPressed('pause')) openSettings();
  if (p.actPressed('skip')) DO.skipTutorial();
  if (p.actPressed('camera')) { G.settings.third = !G.settings.third; saveSettings(); }
}
/* ---------- Fullscreen ---------- */
function inFrame() { try { return window.self !== window.top; } catch (e) { return true; } }
function isNativeFS() { const d = document; return !!(d.fullscreenElement || d.webkitFullscreenElement); }
function isTheater() { return G.root.classList.contains('theater-fullscreen'); }
function setTheater(on) {
  G.root.classList.toggle('theater-fullscreen', on); document.body.classList.toggle('rt-theater-open', on);
  const b = $('[data-fsbtn]'); if (b) b.setAttribute('aria-pressed', String(on || isNativeFS()));
  setTimeout(resize, 30); requestAnimationFrame(resize);
}
/* Native fullscreen first; if the browser or an embedding iframe blocks it (Permissions Policy),
   fall back to "theater mode": the game fills the whole viewport with CSS so the button always works. */
function toggleFullscreen() {
  const d = document; G.sound.play('click');
  if (isTheater()) { setTheater(false); return; }
  if (isNativeFS()) { try { const r = (d.exitFullscreen || d.webkitExitFullscreen)?.call(d); r?.catch?.(() => {}); } catch (e) {} return; }
  const fn = G.root.requestFullscreen || G.root.webkitRequestFullscreen;
  const enabled = d.fullscreenEnabled ?? d.webkitFullscreenEnabled ?? !!fn;
  const fallback = () => { if (!isNativeFS() && !isTheater()) { setTheater(true); toast('Expanded view on (fullscreen is blocked here). Press F11 or Esc to exit.', 'warn'); } };
  if (!fn || !enabled) { fallback(); return; }
  try {
    const r = fn.call(G.root, { navigationUI: 'hide' });
    if (r && typeof r.then === 'function') r.catch(fallback);
    else setTimeout(() => { if (!isNativeFS()) fallback(); }, 250); // old WebKit returns undefined
  } catch (e) { fallback(); }
}
/* ---------- Auto-quality: protects frame rate on Chromebooks / older laptops ----------
   Under 25 FPS for 3+ seconds: shadow map 2048 → 1024 → 512 → shadows off, then render resolution down to 55%.
   Holding 55+ FPS for 8s slowly brings resolution back (shadows stay at the safer setting). */
function autoQuality(real) {
  const q = G.aq ||= { slow: 0, fast: 0, cool: 0 }; q.cool = Math.max(0, q.cool - real);
  if (G.fpsAvg < 25) { q.slow += real; q.fast = 0; } else if (G.fpsAvg > 55) { q.fast += real; q.slow = 0; } else { q.slow = Math.max(0, q.slow - real); q.fast = 0; }
  if (q.slow > 3 && q.cool <= 0) {
    q.slow = 0; q.cool = 2.5; const r = G.renderer, size = G.sun.shadow.mapSize.x;
    if (r.shadowMap.enabled && size > 512) { G.autoShadowCap = size / 2; applySettings(); toast(`⚙️ Auto-quality: shadows ${size / 2}px for smoother FPS`, 'warn'); }
    else if (r.shadowMap.enabled) { G.settings.shadows = false; applySettings(); toast('⚙️ Auto-quality: shadows off for smoother FPS', 'warn'); }
    else if (G.prScale > 0.55) { G.prScale = Math.max(0.55, G.prScale - 0.15); r.setPixelRatio(G.maxPR * G.prScale); resize(); }
  } else if (q.fast > 8 && G.prScale < 1) { q.fast = 0; G.prScale = Math.min(1, G.prScale + 0.1); G.renderer.setPixelRatio(G.maxPR * G.prScale); resize(); }
}
/* ---------- Settings application ---------- */
function saveSettings() { LS.set(SET_KEY, JSON.stringify(G.settings)); LS.set(CTRL_KEY, JSON.stringify(G.ctrl)); applySettings(); }
function applySettings() {
  const st = G.settings, pr = PRESETS[st.preset] || PRESETS.Medium, r = G.renderer;
  G.maxPR = Math.min(window.devicePixelRatio || 1, 2, pr.pr * (window.devicePixelRatio > 1 ? 1.2 : 1)); G.prScale = Math.min(G.prScale || 1, 1);
  r.setPixelRatio(G.maxPR * G.prScale);
  const sh = pr.shadows && st.shadows;
  const shSize = Math.min(pr.shadowSize, G.autoShadowCap || 4096);
  if (r.shadowMap.enabled !== sh || G.sun.shadow.mapSize.x !== shSize) {
    r.shadowMap.enabled = sh; G.sun.castShadow = sh; G.sun.shadow.mapSize.set(shSize, shSize); if (G.sun.shadow.map) { G.sun.shadow.map.dispose(); G.sun.shadow.map = null; }
    G.scene.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.needsUpdate = true); });
  }
  G.camera.far = st.distance + 400; G.scene.fog.near = st.distance * 0.35; G.scene.fog.far = st.distance; G.camera.fov = st.fov; G.camera.updateProjectionMatrix();
  G.sound.s = st; G.sound.apply(); const mu = $('[data-mute]'); if (mu) mu.textContent = st.muted ? '🔇' : '🔊';
  G.pad.c = G.ctrl; resize();
}
function resize() { const r = G.root.getBoundingClientRect(); G.vw = Math.max(1, r.width); G.vh = Math.max(1, r.height); G.renderer.setSize(G.vw, G.vh, false); G.camera.aspect = G.vw / G.vh; G.camera.updateProjectionMatrix(); }
/* ---------- Click / input actions ---------- */
const DO = {
  ...DO_EXTRA,
  close: () => closeTop(), tab: el => { const t = topModal(); if (!t) return; t.tab = +el.dataset.tab; t.opt.onTab?.(t.tab); renderModal(t, true); G.sound.play('click'); },
  openLaptop: () => { if (G.mode === 'play') openLaptop(); }, mute: () => { G.settings.muted = !G.settings.muted; saveSettings(); refreshModal('settings'); }, fullscreen: () => toggleFullscreen(), pause: () => openSettings(),
  order: el => orderStock(+el.dataset.p, +el.dataset.n), track: el => buyTrack(el.dataset.id), curb: el => buyCurb(el.dataset.id), license: el => buyLicense(+el.dataset.i), hire: el => hireStaff(el.dataset.id), perk: el => buyPerk(el.dataset.id), expand: () => expandStore(),
  decor: el => buyDecor(el.dataset.k, +el.dataset.i),
  daily: () => { const s = G.state; if (s.dailyDay === s.day) return; s.dailyDay = s.day; earn(dailyValue()); G.sound.play('cash'); toast(`🎁 Daily reward +${money(dailyValue())}`, 'good'); refreshModal('laptop'); requestSave(); },
  bulkSell: el => { const k = +el.dataset.k, b = G.state.dock[k]; if (!b || b.open) return; G.state.dock.splice(k, 1); const v = bulkValue(b); earn(v, null, null, true); G.state.stats.profit += v - G.state.basis[b.p] * b.n; refreshDock(); G.sound.play('cash'); toast(`🏷️ Bulk buyer paid ${money(v)}`); refreshModal('laptop'); requestSave(); },
  priceFor: el => openPrice(+el.dataset.p),
  pAdj: el => { const e = G.priceEdit, p = PRODUCTS[e.p]; e.v = clamp(e.v + +el.dataset.d, Math.max(1, Math.floor(marketValue(e.p) * 0.5)), Math.ceil(p.value * 3)); G.sound.play('click'); refreshModal('price'); },
  pSlide: el => { G.priceEdit.v = +el.value; refreshModal('price'); },
  pMatch: () => { G.priceEdit.v = marketValue(G.priceEdit.p); G.sound.play('click'); refreshModal('price'); },
  pSave: () => { const e = G.priceEdit; G.state.prices[e.p] = e.v; refreshAllShelves(); closeModal('price', true); G.sound.play('buy'); toast(`🏷️ ${PRODUCTS[e.p].name} priced at ${money(e.v)}`); tutorialEvent('price'); requestSave(); refreshModal('laptop'); },
  key: el => { const p = G.checkout.pay; if (!p) return; const v = el.dataset.v; if (v === 'C') p.entry = ''; else if (v === 'B') p.entry = p.entry.slice(0, -1); else if (p.entry.length < 6) p.entry += v; G.sound.play('click'); refreshModal('pay'); },
  payCard: () => { const c = G.checkout; finishPayment(+c.pay.entry === c.total); if (G.checkout.customer) { c.pay.entry = ''; refreshModal('pay'); } },
  giveBill: el => { const p = G.checkout.pay, v = el.dataset.v; if (v === 'undo') p.give.pop(); else if (v === 'clear') p.give = []; else { p.give.push(+v); G.sound.play('coin'); } refreshModal('pay'); },
  payCash: () => { const c = G.checkout, p = c.pay, given = p.give.reduce((a, b) => a + b, 0); finishPayment(given === p.tender - c.total); if (G.checkout.customer) { p.give = []; refreshModal('pay'); } },
  set: el => { const k = el.dataset.k; let v = el.dataset.v; if (v === 'true' || v === 'false') v = v === 'true'; G.settings[k] = v; if (k === 'preset') { const pr = PRESETS[v]; G.settings.shadows = pr.shadows; G.settings.distance = pr.distance; G.prScale = 1; } saveSettings(); if (k === 'preset' && G.state) { buildStore(); makeLabels(); } refreshModal('settings'); },
  toggle: el => { const k = el.dataset.k; G.settings[k] = !G.settings[k]; saveSettings(); refreshModal('settings'); },
  slide: el => { G.settings[el.dataset.k] = +el.value; el.nextElementSibling.textContent = ({ distance: v => v + 'm', fov: v => v + '°', sens: v => (+v).toFixed(1) + 'x' }[el.dataset.k] || (v => Math.round(v * 100) + '%'))(+el.value); saveSettings(); },
  cset: el => { G.ctrl[el.dataset.k] = el.dataset.v; saveSettings(); refreshModal('settings'); refreshBadges(); renderHotbar(); },
  ctog: el => { G.ctrl[el.dataset.k] = !G.ctrl[el.dataset.k]; saveSettings(); refreshModal('settings'); if (el.dataset.k === 'rumble' && G.ctrl.rumble) G.pad.rumble(0.6, 200); },
  cslide: el => { G.ctrl[el.dataset.k] = +el.value; el.nextElementSibling.textContent = el.dataset.k === 'deadzone' ? (+el.value).toFixed(2) : (+el.value).toFixed(1) + 'x'; saveSettings(); },
  rebind: el => {
    const a = el.dataset.a; if (G.listening === a) { G.listening = null; G.pad.listen = null; refreshModal('settings'); return; }
    G.listening = a; clearTimeout(G.listenTimer); refreshModal('settings');
    const finish = () => { G.listening = null; G.pad.listen = null; refreshModal('settings'); };
    G.listenTimer = setTimeout(() => { if (G.listening === a) { toast('Rebind timed out', 'warn'); finish(); } }, 5000);
    setTimeout(() => { G.pad.listen = i => { clearTimeout(G.listenTimer); G.ctrl.map[a] = i; saveSettings(); toast(`${ACTIONS.find(x => x.id === a).name} → ${G.pad.label(i)}`, 'good'); finish(); refreshBadges(); renderHotbar(); }; }, 150);
  },
  resetControls: () => { const d = defaultControls(); G.ctrl.map = d.map; G.ctrl.sens = d.sens; G.ctrl.deadzone = d.deadzone; G.ctrl.invertY = false; saveSettings(); refreshModal('settings'); refreshBadges(); toast('Controls reset to default'); },
  testSound: () => G.sound.play('cash'),
  replayIntro: () => { if (G.mode !== 'play') { toast('Start a game first'); return; } closeModal('settings'); G.paused = false; playIntro(); },
  restartTutorial: () => { if (!G.state) return; G.state.tutorial = 0; G.tutStock = 0; closeModal('settings'); renderQuest(); toast('Tutorial restarted'); },
  skipTutorial: () => { const s = G.state; if (!s || s.tutorial < 0 || s.tutorial >= 7) return; s.tutorial = -1; renderQuest(); toast('Tutorial skipped. You can restart it in Settings → Game.'); requestSave(); },
  saveNow: () => { save(); toast(LS.ok ? 'Saved ✓' : 'Storage blocked — copy a save code instead', LS.ok ? 'good' : 'warn'); },
  exportCode: () => { const code = encodeSave(JSON.parse(snapshot())); const ta = $('[data-code]'); if (ta) { ta.value = code; ta.select(); } navigator.clipboard?.writeText(code).then(() => toast('Save code copied', 'good'), () => toast('Save code is in the box — copy it manually')); },
  importCode: () => { const ta = $('[data-code]'), s = decodeSave(ta?.value); if (!s) { toast('That save code didn’t work', 'bad'); return; } LS.set(SAVE_KEY, JSON.stringify(s)); closeModal('settings', true); G.paused = false; startGame(false); toast('Save loaded', 'good'); },
  toTitle: () => { save(true); closeModal('settings', true); G.paused = false; clearWorldActors(); showTitle(); },
  askReset: () => confirmBox('Reset progress?', 'This erases your store, cash, upgrades, and trophies. This can’t be undone.', 'Yes, reset', () => { LS.del(SAVE_KEY); G.modals.slice().forEach(m => closeModal(m.id, true)); G.paused = false; startGame(true); }),
  confirmYes: () => { const f = G.confirmYes; closeModal('confirm', true); f && f(); },
  play: () => { G.sound.ensure(); startGame(false); },
  newSave: () => { if (G.savedState) confirmBox('Start a new save?', 'Your current store will be erased.', 'Start fresh', () => { LS.del(SAVE_KEY); startGame(true); }); else startGame(true); },
  titleSettings: () => openSettings(), credits: () => openCredits(),
  skipIntro: () => endIntro(),
  claim: () => { const w = G.welcome; if (!w) return; earn(w.amount); G.sound.play('cash'); G.welcome = null; G.modals.find(m => m.id === 'welcome').opt.locked = false; closeModal('welcome', true); sparkle({ x: G.player.x, y: 2, z: G.player.z + 1 }, 30, 0x4dff88); requestSave(); },
  claim2: () => { const w = G.welcome; if (!w || G.state.boostDay === todayKey()) return; G.state.boostDay = todayKey(); w.amount *= 2; toast('2X BOOST!', 'gold'); DO.claim(); },
  tool: el => setTool(+el.dataset.i),
  testRumble: () => { const pd = G.pad; if (!pd.pad) { toast('🎮 Connect a controller and press any button first.', 'warn'); return; } const ok = pd.rumble(0.9, 450, true); toast(ok ? '📳 Rumble sent — feel it?' : 'This controller or browser doesn’t support rumble (safe to ignore).', ok ? 'good' : 'warn'); }
};
/* Live Controller Monitor (Settings → Controller): updated in place ~10x/second */
function updateMonitor(dt) {
  const t = topModal(); if (!t || t.id !== 'settings' || t.tab !== 2) return;
  G.monT = (G.monT || 0) - dt; if (G.monT > 0) return; G.monT = 0.1;
  const pd = G.pad, el = t.el, q = s => el.querySelector(s); if (!q('[data-mon-ls]')) return;
  const raw = pd.pad ? pd.pad.axes : [0, 0, 0, 0], f = v => (v >= 0 ? ' ' : '') + (+v || 0).toFixed(2);
  q('[data-mon-name]').textContent = pd.pad ? `${BRAND_NAME[pd.brand]} — ${pd.pad.id.slice(0, 60)}` : (pd.blocked ? 'Gamepad access is blocked in this frame' : 'No controller detected — connect one and press any button');
  q('[data-mon-ls]').textContent = `${f(raw[0])}, ${f(raw[1])}`; q('[data-mon-rs]').textContent = `${f(raw[2])}, ${f(raw[3])}`;
  q('[data-mon-lsd]').style.transform = `translate(${(raw[0] || 0) * 14}px,${(raw[1] || 0) * 14}px)`; q('[data-mon-rsd]').style.transform = `translate(${(raw[2] || 0) * 14}px,${(raw[3] || 0) * 14}px)`;
  q('[data-mon-btn]').innerHTML = pd.lastBtn != null ? `#${pd.lastBtn} <span class="rt-pb ${pd.cls(pd.lastBtn)}">${esc(pd.label(pd.lastBtn))}</span>` : '—';
  q('[data-mon-rum]').textContent = !pd.pad ? '—' : pd.canRumble ? (G.ctrl.rumble ? 'Supported' : 'Supported (off)') : 'Not supported';
}
/* ---------- Mount ---------- */
function loadThree() {
  if (window.THREE) return Promise.resolve();
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = new URL('three.min.js', (document.currentScript?.src) || SCRIPT_URL || location.href).href; s.onload = () => window.THREE ? res() : rej(new Error('three.js missing')); s.onerror = () => rej(new Error('three.js failed to load')); document.head.append(s); });
}
const SCRIPT_URL = document.currentScript?.src || '';
function mount(area) {
  let stopped = false, raf = 0;
  area.innerHTML = '<div class="rt-load" role="status">Loading the 3D store…</div>';
  loadThree().then(() => { if (stopped) return; try { init(area); } catch (err) { console.error('[ResellTycoon] init', err); area.innerHTML = '<div class="rt-load">Resell Tycoon hit an error while starting. Try reloading the page.</div>'; } }, (err) => { console.error('[ResellTycoon]', err); if (!stopped) area.innerHTML = '<div class="rt-load">The 3D engine couldn’t load. Check that three.min.js is uploaded next to tycoon.js.</div>'; });
  function init(area) {
    const root = buildUI(area);
    G = { root, keys: new Set(), modals: [], inputMode: 'kbm', npcs: [], staffNPC: {}, queue: [], trash: [], popups: [], particles: [], fx: { viral: 0, flash: 0, drop: 0, discount: 0 }, checkout: { customer: null, total: 0, items: [] }, clock: 0, dt: 0, fpsAvg: 60, prScale: 1, navRep: { key: '', t: 0 }, vcursor: { on: false, x: 0, y: 0, moved: -9 }, touch: { active: false, mx: 0, mz: 0 }, holdT: 0.3, spawnT: 5, pedT: 2, nextEvent: 90, autosellT: 30, saveSoon: 0, lastSaveT: 0 };
    G.settings = loadJSON(SET_KEY, defaultSettings); G.ctrl = loadJSON(CTRL_KEY, defaultControls);
    G.settings.presetProps = (PRESETS[G.settings.preset] || PRESETS.Medium).props;
    G.sound = new SoundManager(G.settings);
    G.pad = new GamepadManager(G.ctrl, { toast: (m, k) => toast(m, k), change: () => { refreshModal('settings'); }, activity: () => setInputMode('pad'), lost: () => setInputMode('kbm') });
    const canvas = $('.rt-canvas');
    let renderer; try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: false }); } catch (e) { area.innerHTML = '<div class="rt-load">WebGL isn’t available on this device, so the 3D store can’t start.</div>'; return; }
    G.renderer = renderer; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.outputColorSpace = THREE.SRGBColorSpace;
    G.scene = new THREE.Scene(); G.scene.fog = new THREE.Fog(0xcdeeff, 25, 70);
    G.camera = new THREE.PerspectiveCamera(72, 1, 0.05, 500); G.scene.add(G.camera);
    G.tex = makeTextures(); G.mats = makeMaterials(G.tex);
    G.state = loadSaved() || freshState();
    buildEnvironment();
    // viewmodel: arm + tool + carried boxes in first person
    G.vm = new THREE.Group(); G.camera.add(G.vm);
    G.vmArm = box(0.16, 0.16, 0.6, lam(0xf5c99b), 0.32, -0.32, -0.45, G.vm, 0, false); G.vmArm.rotation.x = 0.15;
    G.vmTool = new THREE.Group(); G.vmTool.position.set(0.32, -0.25, -0.72); G.vm.add(G.vmTool);
    G.vmBoxes = new THREE.Group(); G.vm.add(G.vmBoxes);
    G.player = { x: 0, z: 1.6, y: 0, vy: 0, yaw: Math.PI, pitch: 0, ground: true, moving: 0, av: makeAvatar(outfitOpts()) };
    G.scene.add(G.player.av.root);
    G.waypoint = new THREE.Group(); { const cone = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.45, 4), new THREE.MeshBasicMaterial({ color: 0xffd23f })); cone.rotation.x = Math.PI; cone.position.y = 0.55; G.waypoint.add(cone); const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.35, depthWrite: false })); beam.position.y = 2.9; G.waypoint.add(beam); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.035, 6, 24), new THREE.MeshBasicMaterial({ color: 0xffffff })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.1; G.waypoint.add(ring); G.waypoint.visible = false; G.scene.add(G.waypoint); }
    buildStore(); makeLabels(); resetPlayer();
    applySettings(); updateSky();
    bindInput();
    showTitle();
    let last = performance.now(), frames = 0, acc = 0;
    const frame = (nowT) => {
      if (stopped) return; raf = requestAnimationFrame(frame);
      let dt = Math.min(0.05, (nowT - last) / 1000); if (document.hidden) { last = nowT; return; }
      const real = Math.min(1, (nowT - last) / 1000); last = nowT;
      G.dt = dt; G.clock += dt; frames++; acc += real; if (acc >= 0.5) { G.fpsAvg = frames / acc; frames = 0; acc = 0; }
      if (G.settings.adaptive && G.mode !== 'title') autoQuality(real);
      tick(dt);
      renderer.render(G.scene, G.camera);
    };
    raf = requestAnimationFrame(frame);
    G.stop = () => { stopped = true; cancelAnimationFrame(raf); };
  }
  function tick(dt) {
    const p = G.pad; p.poll();
    if (p.pad && G.inputMode !== 'pad' && p.cur.some(Boolean)) setInputMode('pad');
    updateVCursor(dt); updateMonitor(dt);
    if (G.modals.length || G.mode === 'title') handlePadUI(dt);
    else if (G.mode === 'intro') { if (p.pressed(0) || p.pressed(9)) endIntro(); }
    else if (G.mode === 'play') handlePadPlay(dt);
    // world simulation
    updateSky();
    G.cars.forEach(c => { c.m.position.x += c.dir * c.speed * dt; if (c.m.position.x > 70) c.m.position.x = -70; if (c.m.position.x < -70) c.m.position.x = 70; });
    G.pedT -= dt; if (G.pedT <= 0) { G.pedT = rand(4, 9); if (G.npcs.filter(n => n.state === 'walkby').length < (G.settings.preset === 'Low' ? 3 : 6)) spawnPedestrian(); }
    if (G.mode === 'play' && !G.paused) simulate(dt); else if (G.mode === 'title') { G.npcs.forEach(n => n.state === 'walkby' && updateNPC(n, dt)); G.npcs = G.npcs.filter(n => { if (n.dead) { G.scene.remove(n.av.root); n.bubbleEl?.remove(); } return !n.dead; }); updateTitleCam(dt); }
    if (G.mode === 'intro') { G.npcs.forEach(n => updateNPC(n, dt)); updateIntro(dt); }
    // doors slide open when anyone is close
    const near = [G.player, ...G.npcs].some(n => Math.abs(n.x) < 2 && Math.abs(n.z) < 2.2) || G.mode === 'intro';
    G.doorOpen = lerp(G.doorOpen, near ? 1 : 0, Math.min(1, dt * 6)); G.doors[0].position.x = -0.5 - G.doorOpen * 0.9; G.doors[1].position.x = 0.5 + G.doorOpen * 0.9;
    (G.spinners || []).forEach(s => s.rotation.y += dt);
    updatePreview(dt); updateTrails(dt);
    updateFX(dt); updateOverlays(dt);
  }
  function simulate(dt) {
    const s = G.state;
    if (!G.modals.length) updatePlayer(dt);
    updateCamera(dt); updateGrab();
    updateClock(dt); updateStonks(dt); updateOrders(dt); updateEvents(dt); updateFloorBoxes(dt); tutorialAuto();
    // customers
    if (s.open) { G.spawnT -= dt * trafficMult(); const inside = G.npcs.filter(n => n.state !== 'walkby' && n.state !== 'exit').length; if (G.spawnT <= 0 && (s.tutorial < 0 || s.tutorial >= 6)) { G.spawnT = rand(16, 26); if (inside < insideCap() && !(s.tutorial === 6 && G.npcs.some(n => n.state !== 'walkby'))) spawnCustomer(); } }
    G.npcs.forEach(n => updateNPC(n, dt));
    G.npcs = G.npcs.filter(n => { if (n.dead) { G.scene.remove(n.av.root); n.bubbleEl?.remove(); } return !n.dead; });
    updateStaff(dt);
    G.target = G.modals.length ? null : findTarget();
    // tutorial waypoint
    if (s.tutorial >= 0 && s.tutorial < 7) { const t = TUT[s.tutorial].target(); G.waypoint.visible = true; G.waypoint.position.set(t.x, t.y + 0.15 + Math.abs(Math.sin(G.clock * 3)) * 0.15, t.z); G.waypoint.rotation.y += dt * 2; } else G.waypoint.visible = false;
    // truck flash at dock
    updateHUD(dt);
    // autosave
    if (G.saveSoon > 0) { G.saveSoon -= dt; if (G.saveSoon <= 0) save(); }
    if (G.clock - G.lastSaveT > 15) save();
  }
  function bindInput() {
    const root = G.root, canvas = $('.rt-canvas');
    const typing = () => ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName) && document.activeElement.type !== 'range';
    G.onKeyDown = e => {
      if (!root.isConnected) return; const k = e.key.toLowerCase();
      if (G.pad.listen && k === 'escape') { e.preventDefault(); e.stopPropagation(); G.pad.listen = null; G.listening = null; refreshModal('settings'); return; }
      if (k === 'f11') { e.preventDefault(); toggleFullscreen(); return; }
      if (k === 'escape') { e.preventDefault(); e.stopPropagation(); if (isTheater() && !G.modals.length) { setTheater(false); return; } if (G.modals.length) closeTop(); else if (G.mode === 'play') openSettings(); else if (G.mode === 'intro') endIntro(); return; }
      if (typing()) return;
      setInputMode('kbm');
      if (G.mode === 'intro') { if (k === ' ' || k === 'enter') { e.preventDefault(); endIntro(); } return; }
      if (G.modals.length || G.mode !== 'play') { if (G.modals.length && (k === 'q' || k === 'e') && topModal().opt.tabs) { const t = topModal(); t.tab = (t.tab + (k === 'e' ? 1 : -1) + t.opt.tabs) % t.opt.tabs; t.opt.onTab?.(t.tab); renderModal(t, true); } if (topModal()?.id === 'price' && k === 'x') DO.pMatch(); if (topModal()?.id === 'pay' && /^[0-9]$/.test(k) && G.checkout.pay?.card) DO.key({ dataset: { v: k } }); if (k === 'enter' && topModal()?.id === 'price') { e.preventDefault(); DO.pSave(); return; } if (k === 'enter' && topModal()?.id === 'pay') { e.preventDefault(); G.checkout.pay?.card ? DO.payCard() : DO.payCash(); return; } if (topModal()?.id === 'pay' && k === 'backspace') DO.key({ dataset: { v: 'B' } }); if (k === 'tab' && topModal()?.id === 'laptop') { e.preventDefault(); closeModal('laptop'); } return; }
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift', ' ', 'tab'].includes(k)) e.preventDefault();
      if (e.repeat) { if (k === 'e' && G.target?.hold) useTool(true); return; }
      G.keys.add(k);
      if (k === 'e') doInteract(); else if (k === ' ') jump(); else if (k === 'f') toggleFlaps(); else if (k === 'g') doPickDrop(); else if (k === 'q') { if (G.state.carry.length) dropCarry(); }
      else if (k === 'tab' || k === 'l') quickLaptop(); else if (k >= '1' && k <= '4') setTool(+k - 1); else if (k === 'v') { G.settings.third = !G.settings.third; saveSettings(); } else if (k === 'm') DO.mute(); else if (k === 'k') DO.skipTutorial(); else if (k === 'p') openSettings();
    };
    G.onKeyUp = e => G.keys.delete(e.key.toLowerCase());
    window.addEventListener('keydown', G.onKeyDown, true); window.addEventListener('keyup', G.onKeyUp, true);
    G.onBlur = () => G.keys.clear(); window.addEventListener('blur', G.onBlur);
    root.addEventListener('click', e => { const el = e.target.closest('[data-do]'); if (!el || el.tagName === 'INPUT') return; e.preventDefault(); G.sound.ensure(); const f = DO[el.dataset.do]; if (f) { f(el); if (!['tab', 'close'].includes(el.dataset.do)) G.sound.play('click'); } });
    root.addEventListener('input', e => { const el = e.target.closest('input[data-do]'); if (el && DO[el.dataset.do]) DO[el.dataset.do](el); });
    root.addEventListener('change', e => { const el = e.target.closest('input[data-do="pSlide"]'); if (el) refreshModal('price'); });
    let drag = null;
    canvas.addEventListener('mousedown', e => {
      G.sound.ensure(); setInputMode('kbm'); if (G.mode !== 'play' || G.modals.length) return;
      if (!document.pointerLockElement && canvas.requestPointerLock) { try { const r = canvas.requestPointerLock(); r?.catch?.(() => {}); } catch (err) {} }
      drag = { x: e.clientX, y: e.clientY };
      if (e.button === 0) { useTool(false); G.mouseHold = true; G.holdT = 0.3; } else if (e.button === 2) doPickDrop();
    });
    G.onMouseUp = () => { drag = null; G.mouseHold = false; }; window.addEventListener('mouseup', G.onMouseUp);
    G.onMouseMove = e => {
      if (Math.abs(e.movementX) + Math.abs(e.movementY) > 2) setInputMode('kbm');
      if (G.mode !== 'play' || G.modals.length) return; const sens = 0.0024 * G.settings.sens, inv = G.settings.invertY ? -1 : 1;
      if (document.pointerLockElement === canvas) { G.player.yaw -= e.movementX * sens; G.player.pitch -= e.movementY * sens * inv; }
      else if (drag) { G.player.yaw -= (e.clientX - drag.x) * sens * 1.3; G.player.pitch -= (e.clientY - drag.y) * sens * 1.3 * inv; drag = { x: e.clientX, y: e.clientY }; }
    };
    window.addEventListener('mousemove', G.onMouseMove);
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('wheel', e => { if (G.mode === 'play' && !G.modals.length) { e.preventDefault(); setTool(G.state.tool + (e.deltaY > 0 ? 1 : -1)); } }, { passive: false });
    G.onPLC = () => { if (!document.pointerLockElement && G.mode === 'play' && !G.modals.length && G.hadLock) openSettings(); G.hadLock = !!document.pointerLockElement; };
    document.addEventListener('pointerlockchange', G.onPLC);
    G.onFS = () => { const fe = document.fullscreenElement || document.webkitFullscreenElement; root.classList.toggle('rt-fs', fe === root); if (fe === root && isTheater()) setTheater(false); $('[data-fsbtn]')?.setAttribute('aria-pressed', String(fe === root || isTheater())); setTimeout(resize, 60); };
    document.addEventListener('fullscreenchange', G.onFS); document.addEventListener('webkitfullscreenchange', G.onFS);
    G.ro = new ResizeObserver(() => resize()); G.ro.observe(root);
    G.onHide = () => { if (document.hidden && G.mode === 'play') save(true); };
    document.addEventListener('visibilitychange', G.onHide);
    // hold-to-place with mouse
    G.holdInterval = setInterval(() => { if (G.mouseHold && G.mode === 'play' && !G.modals.length) useTool(true); }, 170);
    // touch controls
    const touchUI = $('[data-touch]'), stick = $('[data-stick]');
    root.addEventListener('touchstart', () => { if (G.inputMode !== 'touch') { setInputMode('touch'); touchUI.hidden = false; } }, { passive: true });
    let sid = null, sc = null, lid = null, lp = null;
    stick.addEventListener('touchstart', e => { const t = e.changedTouches[0]; sid = t.identifier; const r = stick.getBoundingClientRect(); sc = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; G.touch.active = true; e.preventDefault(); }, { passive: false });
    canvas.addEventListener('touchstart', e => { const t = e.changedTouches[0]; lid = t.identifier; lp = { x: t.clientX, y: t.clientY }; }, { passive: true });
    root.addEventListener('touchmove', e => { for (const t of e.changedTouches) { if (t.identifier === sid) { const dx = clamp((t.clientX - sc.x) / 45, -1, 1), dy = clamp((t.clientY - sc.y) / 45, -1, 1); G.touch.mx = dx; G.touch.mz = dy; stick.firstElementChild.style.transform = `translate(${dx * 28}px,${dy * 28}px)`; } else if (t.identifier === lid && G.mode === 'play' && !G.modals.length) { G.player.yaw -= (t.clientX - lp.x) * 0.006 * G.settings.sens; G.player.pitch -= (t.clientY - lp.y) * 0.006 * G.settings.sens; lp = { x: t.clientX, y: t.clientY }; } } }, { passive: true });
    root.addEventListener('touchend', e => { for (const t of e.changedTouches) { if (t.identifier === sid) { sid = null; G.touch.active = false; G.touch.mx = G.touch.mz = 0; stick.firstElementChild.style.transform = ''; } if (t.identifier === lid) lid = null; } });
    $$('[data-touch-act]').forEach(b => b.addEventListener('touchstart', e => { e.preventDefault(); G.sound.ensure(); const a = b.dataset.touchAct; if (a === 'interact') doInteract(); else if (a === 'useTool') { useTool(false); G.mouseHold = true; } else if (a === 'pickDrop') doPickDrop(); else if (a === 'flaps') toggleFlaps(); else if (a === 'jump') jump(); else if (a === 'tool') setTool(G.state.tool + 1); }, { passive: false }));
    if (window.matchMedia && (matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints > 0 && !matchMedia('(hover: hover)').matches))) { setInputMode('touch'); touchUI.hidden = false; }
    $$('[data-touch-act]').forEach(b => b.addEventListener('touchend', () => { G.mouseHold = false; }));
  }
  return function stop() {
    if (!G) { stopped = true; return; }
    try { if (G.mode === 'play') save(true); } catch (e) {}
    stopped = true; G.stop?.(); G.sound?.destroy(); G.pad?.destroy();
    window.removeEventListener('keydown', G.onKeyDown, true); window.removeEventListener('keyup', G.onKeyUp, true); window.removeEventListener('blur', G.onBlur);
    window.removeEventListener('mouseup', G.onMouseUp); window.removeEventListener('mousemove', G.onMouseMove);
    document.removeEventListener('pointerlockchange', G.onPLC); document.removeEventListener('fullscreenchange', G.onFS); document.removeEventListener('webkitfullscreenchange', G.onFS); document.removeEventListener('visibilitychange', G.onHide);
    document.body.classList.remove('rt-theater-open'); clearInterval(G.holdInterval); G.ro?.disconnect(); if (document.pointerLockElement) document.exitPointerLock?.(); if (document.fullscreenElement) document.exitFullscreen?.().catch?.(() => {});
    try { G.renderer?.dispose(); G.renderer?.forceContextLoss?.(); } catch (e) {}
    G = null;
  };
}
window.ResellTycoon = { mount, debug: () => ({ G, targets, findTarget }), version: VERSION };
})();
