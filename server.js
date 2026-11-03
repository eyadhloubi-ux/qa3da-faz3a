// قعدة فزعة — سيرفر اللعبة الجماعية التعاونية
// إعداد م. إياد حلوبي · @eyad.hloubi
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');
const QRCode = require('qrcode');

const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || 'faz3a-admin';
const FAST = process.env.FAST === '1'; // للاختبار فقط: مدد قصيرة
const DATA_DIR = path.join(__dirname, 'data');
const STATS_FILE = path.join(DATA_DIR, 'stats.json');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));
app.get('/qr', async (req, res) => {
  try {
    const svg = await QRCode.toString(String(req.query.t || '').slice(0, 300), { type: 'svg', margin: 1, color: { dark: '#16161d', light: '#ffffff' } });
    res.type('image/svg+xml').send(svg);
  } catch (e) { res.status(400).end(); }
});

// ---------------- إحصائيات ----------------
let stats = { sessions: 0, joins: 0, finals: 0, perfect: 0, games: {}, days: {}, since: Date.now() };
try { if (fs.existsSync(STATS_FILE)) stats = Object.assign(stats, JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'))); } catch (e) {}
function saveStats() { try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(STATS_FILE, JSON.stringify(stats)); } catch (e) {} }
setInterval(saveStats, 30000);
function day() { return new Date().toISOString().slice(0, 10); }
function bump(k) { const d = day(); stats.days[d] = stats.days[d] || { sessions: 0, joins: 0 }; stats.days[d][k]++; }

app.get('/health', (req, res) => res.send('ok'));
app.get('/stats', (req, res) => {
  if (req.query.key !== ADMIN_KEY) return res.status(403).json({ خطأ: 'المفتاح مطلوب' });
  const games = {};
  for (const k of Object.keys(GAMES)) { const g = stats.games[k] || { played: 0, won: 0 }; games[k] = { name: GAMES[k].name, ...g }; }
  res.json({ sessions: stats.sessions, joins: stats.joins, finals: stats.finals, perfect: stats.perfect, games, liveRooms: rooms.size, since: stats.since });
});
app.post('/admin/close', express.json(), (req, res) => {
  if (req.query.key !== ADMIN_KEY) return res.status(403).json({ err: 'key' });
  const r = rooms.get(String(req.query.code || '')); if (!r) return res.json({ ok: false });
  for (const p of r.players.values()) { send(p.ws, { t: 'err', m: 'صاحب اللعبة سكّر هالقعدة', code: 'gone' }); if (p.ws) p.ws.room = null; }
  clearTimeout(r.timer); rooms.delete(r.code); res.json({ ok: true });
});
app.get('/admin/data', (req, res) => {
  if (req.query.key !== ADMIN_KEY) return res.status(403).json({ err: 'key' });
  const live = [...rooms.values()].map(r => ({ code: r.code, name: r.name, type: r.type, phase: r.phase, hearts: r.hearts, done: r.done.length, players: [...r.players.values()].filter(p => p.online).length, created: r.created }));
  const games = {};
  for (const k of Object.keys(GAMES)) { const g = stats.games[k] || { played: 0, won: 0 }; games[k] = { name: GAMES[k].name, ...g }; }
  res.json({ ...stats, games, live });
});

// ---------------- أدوات ----------------
const now = () => Date.now();
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const uid = () => Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
const COLORS = ['#2b59ff', '#ff6b2c', '#7b2ff7', '#e8336d', '#12a36b', '#d99a00', '#1aa3c9', '#b5470c', '#5458d8', '#c21f7a', '#0f766e', '#8b5e34'];
const CODE_CH = 'ABCDEFGHJKMNPQRSTUVWXYZ';

// ---------------- المهمات ----------------
const SENT = ['صار بدها قعدة', 'يا منطلع سوا يا منوقع سوا', 'إيد وحدة ما بتصفق', 'الكاسة مخزوقة يا جماعة', 'فزعة يا شباب فزعة', 'القعدة بتحلى بوجودكن', 'قوموا فزعولنا شوي', 'عالهدا بتوصل يا حلو'];
const AR = 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي'.split('');
const TOOLS = [{ n: 'إبريق', e: '🫖', a: 10 }, { n: 'قنينة', e: '🍶', a: 7 }, { n: 'كاسة', e: '🥛', a: 5 }, { n: 'معلقة', e: '🥄', a: 2 }];
const SOUNDS = [{ n: 'طبلة', e: '🥁' }, { n: 'دف', e: '🪘' }, { n: 'صفقة', e: '👏' }, { n: 'جرس', e: '🔔' }, { n: 'صفّارة', e: '📯' }, { n: 'مثلث', e: '🔺' }];
const SYM = ['★', '☾', '☀', '♣', '♠', '♥', '♦', '✿', '☂', '♫', '⚑', '✈', '☯', '⚓', '✂', '☎', '⌛', '☘', '♛', '⚙', '✉', '☕', '⚡', '❄', '♞', '✦', '◐'];
const BTN_COLORS = ['red', 'blue', 'yellow', 'white'];
const BTN_WORDS = ['فكّ', 'اضغط', 'وقّف', 'فجّر'];
const WIRE_COLORS = ['red', 'blue', 'yellow', 'white', 'black'];

function wiresAnswer(ws) {
  const n = ws.length, cnt = c => ws.filter(x => x === c).length, last = ws[n - 1];
  if (n === 3) { if (!cnt('red')) return 1; if (last === 'white') return 2; if (cnt('blue') > 1) return ws.lastIndexOf('blue'); return 2; }
  if (n === 4) { if (cnt('red') > 1) return ws.lastIndexOf('red'); if (last === 'yellow' && !cnt('red')) return 0; if (cnt('blue') === 1) return 0; if (cnt('yellow') > 1) return 3; return 1; }
  if (last === 'black') return 3; if (cnt('red') === 1 && cnt('yellow') > 1) return 0; if (!cnt('black')) return 1; return 0;
}
function needHold(c, w) { if (c === 'blue' && w === 'وقّف') return true; if (c === 'white') return false; if (w === 'فجّر') return false; if (c === 'red' && w === 'اضغط') return false; return true; }
const RELEASE_DIGIT = { blue: '4', yellow: '5', red: '1', white: '1' };

const GAMES = {
  count: {
    name: 'عدّوا سوا', min: 2, dur: { easy: 90, hard: 45 },
    init(c) { return { n: 0, target: 20, last: null, lastT: 0, fx: null, seq: 0 }; },
    input(c, s, pid, d) {
      if (d.a !== 'tap') return;
      const tn = now(); let t = +d.at || tn; if (Math.abs(t - tn) > 1500) t = tn;
      if (s.n > 0 && pid === s.last) { s.fx = { k: 'twice', who: [pid] }; s.n = 0; s.last = null; s.lastT = t; }
      else if (s.n > 0 && Math.abs(t - s.lastT) < 40) { s.fx = { k: 'clash', who: [s.last, pid] }; s.n = 0; s.last = null; s.lastT = t; }
      else { s.n++; s.last = pid; s.lastT = t; s.fx = { k: 'ok', who: [pid], n: s.n }; }
      s.seq++; s.dirty = true;
      if (s.n >= s.target) return { res: 'win' };
    },
    view(c, s) { return { n: s.n, target: s.target, fx: s.fx, seq: s.seq }; },
    drop(c, s, pid) { if (s.last === pid) s.last = null; },
    why: 'الوقت خلص قبل العشرين'
  },
  keyboard: {
    name: 'الكيبورد المقسوم', min: 2, dur: { easy: 100, hard: 55 },
    init(c) {
      const text = pick(SENT);
      const letters = shuffle([...new Set(text.replace(/ /g, ''))]);
      const keys = {}; c.act.forEach(p => keys[p] = []);
      letters.forEach((ch, i) => keys[c.act[i % c.n]].push(ch));
      const pool = shuffle(AR.filter(x => !letters.includes(x)));
      c.act.forEach(p => { for (let k = 0; k < 2 && pool.length; k++) keys[p].push(pool.pop()); shuffle(keys[p]); });
      return { text, pos: 0, keys, fx: null, seq: 0 };
    },
    input(c, s, pid, d) {
      if (d.a !== 'key' || !s.keys[pid] || !s.keys[pid].includes(d.ch)) return;
      if (d.ch === s.text[s.pos]) {
        s.pos++; while (s.text[s.pos] === ' ') s.pos++;
        s.fx = { k: 'ok', who: pid };
        if (s.pos >= s.text.length) { s.seq++; s.dirty = true; return { res: 'win' }; }
      } else { s.fx = { k: 'bad', who: pid, ch: d.ch }; c.penalty(2000); }
      s.seq++; s.dirty = true;
    },
    view(c, s, pid) { return { text: s.text, pos: s.pos, keys: s.keys[pid] || [], fx: s.fx, seq: s.seq }; },
    drop(c, s, pid) { const ks = s.keys[pid] || []; delete s.keys[pid]; ks.forEach((ch, i) => s.keys[c.act[i % c.n]].push(ch)); s.seq++; s.dirty = true; },
    why: 'الجملة ما كملت'
  },
  balance: {
    name: 'الميزان', min: 2, dur: { easy: 25, hard: 45 }, survival: true, rate: 66,
    init(c) { return { x: 0, y: 0, vx: 0, vy: 0, tilt: {}, wx: 0, wy: 0, ang: Math.random() * 6.28, t: 0 }; },
    tick(c, s, dt) {
      s.t += dt; let ax = 0, ay = 0;
      c.act.forEach(p => { const v = s.tilt[p]; if (v) { ax += v[0]; ay += v[1]; } });
      ax /= c.n; ay /= c.n;
      const wm = 0.3 + 0.015 * s.t;
      s.ang += (Math.random() - 0.5) * 2.4 * dt; s.wx = Math.cos(s.ang) * wm; s.wy = Math.sin(s.ang) * wm;
      s.vx += (ax * 1.8 + s.wx) * dt; s.vy += (ay * 1.8 + s.wy) * dt;
      s.vx *= 0.985; s.vy *= 0.985; s.x += s.vx * dt; s.y += s.vy * dt;
      s.dirty = true;
      if (Math.hypot(s.x, s.y) > 1) return { res: 'lose', why: 'الطابة وقعت عن الصينية' };
    },
    input(c, s, pid, d) { if (d.a === 'tilt') s.tilt[pid] = [clamp(+d.x || 0, -1, 1), clamp(+d.y || 0, -1, 1)]; },
    view(c, s, pid) { return { x: s.x, y: s.y, wx: s.wx, wy: s.wy, mine: s.tilt[pid] || [0, 0] }; },
    drop(c, s, pid) { delete s.tilt[pid]; }
  },
  tower: {
    name: 'البرج', min: 2, dur: { easy: 90, hard: 50 },
    init(c) { return { blocks: [{ x: 0, w: 0.5 }], order: shuffle([...c.act]), turn: 0, swingAt: now() + 400, speed: 1.6, target: 12, fx: null, seq: 0, falls: 0 }; },
    input(c, s, pid, d) {
      if (d.a !== 'drop') return;
      if (pid !== s.order[s.turn % s.order.length]) return;
      const x = clamp(+d.x || 0, -0.8, 0.8), top = s.blocks[s.blocks.length - 1], w = top.w;
      const l = Math.max(top.x - top.w / 2, x - w / 2), r = Math.min(top.x + top.w / 2, x + w / 2), ov = r - l;
      if (ov <= 0.01) { s.fx = { k: 'fall', who: pid }; s.blocks = [{ x: 0, w: 0.5 }]; s.falls++; s.speed = 1.6; }
      else {
        let nb; if (Math.abs(x - top.x) < 0.015) nb = { x: top.x, w: top.w, p: 1 }; else nb = { x: (l + r) / 2, w: ov };
        s.blocks.push(nb); s.fx = { k: 'ok', who: pid, p: nb.p ? 1 : 0 }; s.speed += 0.08;
      }
      s.turn++; s.swingAt = now(); s.seq++; s.dirty = true;
      if (s.blocks.length - 1 >= s.target) return { res: 'win' };
    },
    view(c, s) { return { blocks: s.blocks, turnPid: s.order[s.turn % s.order.length], swingAt: s.swingAt, speed: s.speed, target: s.target, fx: s.fx, seq: s.seq }; },
    drop(c, s, pid) { const cur = s.order[s.turn % s.order.length]; s.order = s.order.filter(x => x !== pid); if (cur === pid) s.swingAt = now(); s.seq++; s.dirty = true; },
    why: 'البرج ما وصل لفوق'
  },
  glass: {
    name: 'عبّوا الكاسة', min: 2, dur: { easy: 60, hard: 35 }, rate: 100,
    init(c) {
      const tl = shuffle([...TOOLS]); const tools = {}; c.act.forEach((p, i) => tools[p] = tl[i % tl.length]);
      return { lvl: 20, hold: 0, tools, last: {}, fx: null, seq: 0, decay: 5 + 1.3 * c.n, lo: 60, hi: 75 };
    },
    tick(c, s, dt) {
      s.lvl = Math.max(0, s.lvl - s.decay * dt);
      if (s.lvl >= s.lo && s.lvl <= s.hi) s.hold += dt; else s.hold = 0;
      s.dirty = true;
      if (s.hold >= 5) return { res: 'win' };
    },
    input(c, s, pid, d) {
      if (d.a !== 'pour' || !s.tools[pid]) return; const t = now();
      if (t - (s.last[pid] || 0) < 280) return; s.last[pid] = t;
      s.lvl += s.tools[pid].a;
      if (s.lvl > 100) { s.lvl = 40; s.hold = 0; s.fx = { k: 'spill', who: pid }; }
      else s.fx = { k: 'pour', who: pid };
      s.seq++; s.dirty = true;
    },
    view(c, s, pid) { return { lvl: s.lvl, hold: s.hold, tool: s.tools[pid], lo: s.lo, hi: s.hi, fx: s.fx, seq: s.seq }; },
    drop(c, s, pid) { delete s.tools[pid]; s.decay = 5 + 1.3 * c.n; },
    why: 'ما ضلّت الكاسة عالخط 5 ثواني'
  },
  bridge: {
    name: 'الجسر', min: 2, dur: { easy: 75, hard: 40 }, rate: 80,
    init(c) {
      const P = Math.min(18, Math.max(12, c.n * 2));
      // ترتيب مخربط: ممكن يرجع دورك ورا بعض، بس كل واحد إلو لوح عالأقل وما في أكتر من 3 ورا بعض لنفس الشخص
      let owners;
      for (let tries = 0; tries < 50; tries++) {
        owners = shuffle([...c.act]).slice(0, Math.min(c.n, P));
        while (owners.length < P) owners.push(pick(c.act));
        shuffle(owners);
        let ok = true; for (let i = 3; i < P; i++) if (owners[i] === owners[i - 1] && owners[i] === owners[i - 2] && owners[i] === owners[i - 3]) ok = false;
        if (ok) break;
      }
      return { P, owners, placed: Array(P).fill(false), r: -1.5, v: 0.8, cool: {}, fx: null, seq: 0, falls: 0 };
    },
    tick(c, s, dt) {
      s.r += s.v * dt; const i = Math.floor(s.r);
      if (i >= 0 && i < s.P && !s.placed[i]) { s.fx = { k: 'fall', i, who: s.owners[i] }; s.seq++; s.r = -1.5; s.placed.fill(false); s.falls++; }
      s.dirty = true;
      if (s.r >= s.P) return { res: 'win' };
    },
    input(c, s, pid, d) {
      if (d.a !== 'place') return; const t = now();
      if ((s.cool[pid] || 0) > t) return;
      // اللوح الجاي إلي قدّام الراكض
      let i = -1; for (let k = Math.max(0, Math.ceil(s.r)); k < s.P; k++) if (s.owners[k] === pid && !s.placed[k]) { i = k; break; }
      if (i < 0) return;
      if (s.r < i - 1) { s.fx = { k: 'early', i, who: pid }; s.cool[pid] = t + 1500; }
      else { s.placed[i] = true; s.fx = { k: 'ok', i, who: pid }; }
      s.seq++; s.dirty = true;
    },
    view(c, s, pid) { return { P: s.P, owners: s.owners, placed: s.placed, r: s.r, v: s.v, at: now(), cool: (s.cool[pid] || 0) > now(), fx: s.fx, seq: s.seq }; },
    drop(c, s, pid) { s.owners = s.owners.map(o => o === pid ? pick(c.act) : o); s.seq++; s.dirty = true; },
    why: 'الراكض ما قطع الجسر'
  },
  bomb: {
    name: 'فكّ القنبلة', min: 2, dur: { easy: 180, hard: 100 },
    init(c) {
      const def = pick(c.act); const readers = c.act.filter(p => p !== def);
      const n = 3 + Math.floor(Math.random() * 3); const wires = []; for (let i = 0; i < n; i++) wires.push(pick(WIRE_COLORS));
      const cols = []; for (let k = 0; k < 6; k++) cols.push(shuffle([...SYM]).slice(0, 7));
      let col, chosen;
      for (let tries = 0; tries < 200; tries++) {
        col = Math.floor(Math.random() * 6); chosen = shuffle([...cols[col]]).slice(0, 4);
        const others = cols.filter((cc, i) => i !== col && chosen.every(x => cc.includes(x)));
        if (!others.length) break;
      }
      const order = cols[col].filter(x => chosen.includes(x));
      const pages = ['w3', 'w4', 'w5', 'btn', 'symA', 'symB'];
      const assign = {}; readers.forEach(p => assign[p] = []);
      const m = Math.max(pages.length, readers.length);
      for (let i = 0; i < m; i++) { const pg = pages[i % pages.length]; const rd = readers[i % readers.length]; if (!assign[rd].includes(pg)) assign[rd].push(pg); }
      return {
        def, assign, cols, strikes: 0, fx: null, seq: 0,
        wires, cut: Array(n).fill(false), wiresDone: false, wAns: wiresAnswer(wires),
        btn: { color: pick(BTN_COLORS), word: pick(BTN_WORDS), holding: false, strip: null }, btnDone: false,
        shown: shuffle([...chosen]), order, symPos: 0, symPressed: [], symDone: false
      };
    },
    input(c, s, pid, d) {
      if (pid !== s.def) return;
      const strike = why => { s.strikes++; s.fx = { k: 'strike', why }; };
      if (d.a === 'cut' && !s.wiresDone) {
        const i = +d.i; if (!(i >= 0 && i < s.wires.length) || s.cut[i]) return; s.cut[i] = true;
        if (i === s.wAns) { s.wiresDone = true; s.fx = { k: 'ok', m: 'wires' }; } else strike('شريط غلط');
      } else if (d.a === 'press' && !s.btnDone) {
        if (!needHold(s.btn.color, s.btn.word)) { s.btnDone = true; s.fx = { k: 'ok', m: 'btn' }; } else strike('كان لازم مطوّلة');
      } else if (d.a === 'hold' && !s.btnDone) {
        s.btn.holding = true; s.btn.strip = pick(['blue', 'yellow', 'red', 'white']);
      } else if (d.a === 'release' && !s.btnDone && s.btn.holding) {
        s.btn.holding = false;
        if (!needHold(s.btn.color, s.btn.word)) strike('كانت كبسة وحدة');
        else {
          const left = Math.max(0, Math.ceil((c.endsAt() - now()) / 1000));
          const str = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0');
          if (str.includes(RELEASE_DIGIT[s.btn.strip])) { s.btnDone = true; s.fx = { k: 'ok', m: 'btn' }; } else strike('فلّتت بوقت غلط');
        }
        s.btn.strip = null;
      } else if (d.a === 'sym' && !s.symDone) {
        const k = +d.k; const sym = s.shown[k]; if (sym === undefined || s.symPressed.includes(k)) return;
        if (sym === s.order[s.symPos]) { s.symPressed.push(k); s.symPos++; if (s.symPos === 4) { s.symDone = true; s.fx = { k: 'ok', m: 'sym' }; } }
        else { s.symPressed = []; s.symPos = 0; strike('رمز غلط'); }
      } else return;
      s.seq++; s.dirty = true;
      if (s.strikes >= 3) return { res: 'lose', why: '3 غلطات… القنبلة فقعت 💥' };
      if (s.wiresDone && s.btnDone && s.symDone) return { res: 'win' };
    },
    view(c, s, pid) {
      const base = { def: s.def, strikes: s.strikes, fx: s.fx, seq: s.seq, done: { w: s.wiresDone, b: s.btnDone, s: s.symDone } };
      if (pid === s.def) return { ...base, role: 'def', wires: s.wires, cut: s.cut, btn: { color: s.btn.color, word: s.btn.word, holding: s.btn.holding, strip: s.btn.strip }, shown: s.shown, symPressed: s.symPressed };
      return { ...base, role: 'reader', pages: s.assign[pid] || [], cols: s.cols };
    },
    drop(c, s, pid) {
      if (pid === s.def) return 'restart';
      const pages = ['w3', 'w4', 'w5', 'btn', 'symA', 'symB']; const readers = c.act.filter(p => p !== s.def); s.assign = {};
      readers.forEach(p => s.assign[p] = []); pages.forEach((pg, i) => s.assign[readers[i % readers.length]].push(pg)); s.seq++; s.dirty = true;
    },
    why: 'الوقت خلص… القنبلة فقعت 💥'
  },
  pulse: {
    name: 'النبض', min: 2, dur: { easy: 15, hard: 20 }, noTimer: true,
    init(c) { const S = c.diff === 'hard' ? 16 : 8; return { beat: 600, start: now() + 1200, L: 8, S, taps: {}, res: null }; },
    tick(c, s) {
      if (s.res) return;
      if (now() > s.start + (s.L + s.S) * s.beat + 800) {
        const per = {}; let sum = 0;
        c.act.forEach(p => {
          const taps = (s.taps[p] || []).slice(); let hits = 0;
          for (let j = s.L; j < s.L + s.S; j++) {
            const bt = s.start + j * s.beat; const idx = taps.findIndex(x => Math.abs(x - bt) <= 150);
            if (idx >= 0) { hits++; taps.splice(idx, 1); }
          }
          per[p] = hits / s.S; sum += per[p];
        });
        const avg = sum / c.n; s.res = { per, avg }; s.dirty = true;
        return avg >= 0.6 ? { res: 'win' } : { res: 'lose', why: 'الإيقاع فلت منكن (' + Math.round(avg * 100) + '%)' };
      }
    },
    input(c, s, pid, d) { if (d.a !== 'tap' || s.res) return; s.taps[pid] = s.taps[pid] || []; if (s.taps[pid].length < 80) s.taps[pid].push(+d.at || now()); },
    view(c, s) { return { beat: s.beat, start: s.start, L: s.L, S: s.S, res: s.res }; },
    drop(c, s, pid) { delete s.taps[pid]; }
  },
  drum: {
    name: 'الطبلة', min: 2, dur: { easy: 70, hard: 40 },
    init(c) {
      const K = Math.min(c.n, 6); const ord = shuffle([...c.act]); const assign = {};
      ord.forEach((p, i) => assign[p] = i % K);
      const L = Math.min(4 + K, 10); const pat = [];
      for (let i = 0; i < K; i++) pat.push(i);
      while (pat.length < L) pat.push(Math.floor(Math.random() * K));
      shuffle(pat);
      return { K, assign, pattern: pat, idx: 0, demoAt: now() + 700, step: 550, fx: null, seq: 0 };
    },
    input(c, s, pid, d) {
      const t = now();
      if (d.a === 'replay' && pid === c.room.hostId) { s.demoAt = t + 400; s.idx = 0; s.fx = { k: 'replay' }; s.seq++; s.dirty = true; return; }
      if (d.a !== 'hit' || s.assign[pid] === undefined) return;
      if (t < s.demoAt + s.pattern.length * s.step) return;
      const snd = s.assign[pid];
      if (snd === s.pattern[s.idx]) { s.idx++; s.fx = { k: 'ok', snd, who: pid }; }
      else { s.idx = 0; s.fx = { k: 'bad', snd, who: pid }; s.demoAt = t + 1200; }
      s.seq++; s.dirty = true;
      if (s.idx >= s.pattern.length) return { res: 'win' };
    },
    view(c, s, pid) { return { K: s.K, pattern: s.pattern, idx: s.idx, demoAt: s.demoAt, step: s.step, mine: s.assign[pid], fx: s.fx, seq: s.seq }; },
    drop() { return 'restart'; },
    why: 'الإيقاع ما كمل'
  },
  puzzle: {
    name: 'البازل المقسوم', min: 2, dur: { easy: 150, hard: 80 },
    init(c) {
      const N = 25; const ord = shuffle([...c.act]); const ids = shuffle([...Array(N).keys()]); const owners = Array(N);
      ids.forEach((id, i) => owners[id] = ord[i % ord.length]);
      return { seed: Math.floor(Math.random() * 1e6), owners, slots: Array(N).fill(-1), fx: null, seq: 0 };
    },
    input(c, s, pid, d) {
      if (d.a !== 'move') return; const p = +d.p, slot = +d.slot;
      if (!(p >= 0 && p < 25) || s.owners[p] !== pid || !(slot >= -1 && slot < 25)) return;
      const cur = s.slots.indexOf(p); if (cur >= 0) s.slots[cur] = -1;
      if (slot >= 0) s.slots[slot] = p;
      s.fx = { k: 'move', who: pid }; s.seq++; s.dirty = true;
      if (s.slots.every((v, i) => v === i)) return { res: 'win' };
    },
    view(c, s) { return { seed: s.seed, owners: s.owners, slots: s.slots, fx: s.fx, seq: s.seq }; },
    drop(c, s, pid) { s.owners = s.owners.map(o => o === pid ? pick(c.act) : o); s.seq++; s.dirty = true; },
    why: 'الصورة ما اكتملت'
  },
  twister: {
    name: 'تويستر الأصابع', min: 2, cap: 6, dur: { easy: 30, hard: 50 }, survival: true,
    init(c) {
      const host = c.room.players.get(c.room.hostId);
      const table = host && host.online ? c.room.hostId : c.act[0];
      return { table, act: c.act, seed: Math.floor(Math.random() * 1e6) };
    },
    input(c, s, pid, d) { if (pid === s.table && d.a === 'fail') return { res: 'lose', why: (c.name(d.who) || 'حدا') + ' فلت إصبعه' }; },
    view(c, s) { return { table: s.table, act: s.act, seed: s.seed }; },
    drop(c, s, pid) { if (pid === s.table) return 'restart'; s.act = s.act.filter(x => x !== pid); s.dirty = true; }
  },
  fire: {
    name: 'الإطفائية', min: 2, dur: { easy: 35, hard: 55 }, survival: true, rate: 100,
    init(c) {
      // كل لاعب إلو بناية، والنار بتولّع بكل البنايات سوا من أول ثانية
      const t = now(); const bld = c.act.map((pid, i) => ({ id: i, pid }));
      const max = 45 + 9 * c.n; const s = { bld, fires: [], id: 1, tank: max, max, next: t + 1500, iv: 3.4 / c.n, faucet: null, nextTap: t + 6000, t: 0 };
      bld.forEach(b => this.spawn(s, b.id));
      return s;
    },
    spawn(s, bid, near) {
      const used = new Set(s.fires.filter(f => f.b === bid).map(f => f.w)); if (used.size >= 12) return;
      let w; if (near !== undefined) { const r = Math.floor(near / 3), col = near % 3; const nb = [[r - 1, col], [r + 1, col], [r, col - 1], [r, col + 1]].filter(([y, x]) => y >= 0 && y < 4 && x >= 0 && x < 3).map(([y, x]) => y * 3 + x).filter(k => !used.has(k)); if (!nb.length) return; w = pick(nb); }
      else { const free = [...Array(12).keys()].filter(k => !used.has(k)); w = pick(free); }
      s.fires.push({ id: s.id++, b: bid, w, size: 28, spread: false });
    },
    tick(c, s, dt) {
      const t = now(); s.t += dt;
      for (const f of s.fires) {
        f.size += 8 * (1 + s.t / 45) * dt;
        if (f.size >= 72 && !f.spread) { f.spread = true; this.spawn(s, f.b, f.w); }
      }
      const burnt = s.fires.find(f => f.size >= 100);
      if (burnt) { const b = s.bld.find(x => x.id === burnt.b); return { res: 'lose', why: 'بناية ' + (c.name(b && b.pid) || 'حدا') + ' احترقت 🔥' }; }
      if (t >= s.next) { this.spawn(s, pick(s.bld).id); s.next = t + s.iv * 1000 * rnd(0.6, 1.4); }
      if (t >= s.nextTap) { s.faucet = { pid: pick(c.act), until: t + 5000 }; s.nextTap = t + 10000; }
      if (s.tank <= 0 && s.fires.length) return { res: 'lose', why: 'خلصت المي 💧' };
      s.dirty = true;
    },
    input(c, s, pid, d) {
      const t = now();
      if (d.a === 'hit') {
        const f = s.fires.find(x => x.id === +d.id); if (!f || s.tank <= 0) return;
        const b = s.bld.find(x => x.id === f.b); if (!b || b.pid !== pid) return;
        s.tank -= 1; f.size -= 20; if (f.size <= 0) s.fires = s.fires.filter(x => x !== f);
      } else if (d.a === 'miss') s.tank = Math.max(0, s.tank - 1);
      else if (d.a === 'fill') { if (s.faucet && s.faucet.pid === pid && t < s.faucet.until) s.tank = Math.min(s.max, s.tank + 3); }
      s.dirty = true;
    },
    view(c, s, pid) {
      const mine = s.bld.filter(b => b.pid === pid).map(b => ({ id: b.id, fires: s.fires.filter(f => f.b === b.id).map(f => ({ id: f.id, w: f.w, size: Math.round(f.size) })) }));
      const city = s.bld.map(b => { const fs = s.fires.filter(f => f.b === b.id); return { id: b.id, pid: b.pid, n: fs.length, max: fs.reduce((m, f) => Math.max(m, f.size), 0) | 0 }; });
      return { tank: s.tank, max: s.max, mine, city, faucet: !!(s.faucet && s.faucet.pid === pid && now() < s.faucet.until) };
    },
    drop(c, s, pid) { s.bld.forEach(b => { if (b.pid === pid) b.pid = pick(c.act); }); s.dirty = true; }
  }
};
const KEYS = Object.keys(GAMES);
if (FAST) for (const k of KEYS) { GAMES[k].dur = { easy: k === 'pulse' ? 15 : 8, hard: k === 'pulse' ? 20 : 6 }; }

// ---------------- الغرف ----------------
const rooms = new Map();
function newCode() { let c; do { c = ''; for (let i = 0; i < 5; i++) c += pick(CODE_CH); } while (rooms.has(c)); return c; }
function onlinePlayers(r) { return r.order.map(id => r.players.get(id)).filter(p => p && p.online); }
function nextColor(r) { const used = new Set([...r.players.values()].map(p => p.color)); return COLORS.find(c => !used.has(c)) || pick(COLORS); }

function publicRoom(r) {
  return {
    code: r.code, hostId: r.hostId, name: r.name, type: r.type, diff: r.diff, phase: r.phase, hearts: r.hearts,
    done: r.done, remaining: r.remaining.length, total: KEYS.length, keys: KEYS, names: Object.fromEntries(KEYS.map(k => [k, GAMES[k].name])),
    wheel: r.wheel, intro: r.intro ? { key: r.intro.key, diff: r.intro.diff, active: [...r.intro.active], ready: [...r.intro.ready], cap: GAMES[r.intro.key].cap || null, dur: GAMES[r.intro.key].dur, retry: !!r.intro.retry } : null,
    canRetry: !!(r.done.length && !r.done[r.done.length - 1].skip && ['after', 'final', 'wheel'].includes(r.phase)),
    cur: r.cur ? { key: r.cur.key, startAt: r.cur.startAt, endsAt: r.cur.endsAt, diff: r.cur.diff, act: r.cur.act, noTimer: !!GAMES[r.cur.key].noTimer } : null,
    after: r.after, hostGone: !!(r.hostGoneAt && now() - r.hostGoneAt > 15000),
    players: r.order.map(id => r.players.get(id)).filter(Boolean).map(p => ({ id: p.id, name: p.name, g: p.g, color: p.color, online: p.online, hasPhoto: !!p.photo })),
    groupPhoto: !!r.groupPhoto, t: now()
  };
}
function send(ws, m) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(m)); }
function broadcast(r, m) { const s = JSON.stringify(m); for (const p of r.players.values()) if (p.ws && p.ws.readyState === 1) p.ws.send(s); }
function pushRoom(r) { broadcast(r, { t: 'room', room: publicRoom(r) }); }

function ctxFor(r) {
  const cur = r.cur;
  return {
    room: r, act: cur.act, n: cur.act.length, diff: cur.diff,
    penalty: ms => { cur.endsAt -= ms; cur.timeDirty = true; },
    endsAt: () => cur.endsAt,
    name: pid => { const p = r.players.get(pid); return p ? p.name : ''; }
  };
}
function pushGame(r) {
  const cur = r.cur; if (!cur || !cur.st) return; const g = GAMES[cur.key]; const c = ctxFor(r);
  for (const p of r.players.values()) {
    if (!p.ws || p.ws.readyState !== 1) continue;
    let v; try { v = g.view(c, cur.st, p.id); } catch (e) { v = {}; }
    p.ws.send(JSON.stringify({ t: 'g', key: cur.key, v, endsAt: cur.endsAt, spectator: !cur.act.includes(p.id) }));
  }
  cur.st.dirty = false; cur.lastPush = now();
  if (cur.timeDirty) { cur.timeDirty = false; pushRoom(r); }
}

function pickActive(r, key) {
  const on = onlinePlayers(r).map(p => p.id); const cap = GAMES[key].cap;
  if (!cap || on.length <= cap) return new Set(on);
  // الأقل لعباً بالمهمات المحدودة أولاً
  const sorted = shuffle([...on]).sort((a, b) => (r.players.get(a).capPlayed || 0) - (r.players.get(b).capPlayed || 0));
  return new Set(sorted.slice(0, cap));
}

function startWheel(r) {
  if (!r.remaining.length || r.hearts <= 0) return toFinal(r);
  const ord = (process.env.ORDER || '').split(',').filter(k => r.remaining.includes(k));
  const key = ord.length ? ord[0] : pick(r.remaining);
  r.phase = 'wheel'; r.wheel = { key, at: now() }; r.after = null; r.intro = null; r.cur = null;
  r.timer = setTimeout(() => toIntro(r, key), FAST ? 2500 : 5200);
  pushRoom(r);
}
function toIntro(r, key) {
  clearTimeout(r.timer);
  r.phase = 'intro'; r.intro = { key, diff: r.diff, active: pickActive(r, key), ready: new Set() };
  pushRoom(r);
}
function checkIntroReady(r) {
  if (r.phase !== 'intro') return;
  const act = [...r.intro.active].filter(id => { const p = r.players.get(id); return p && p.online; });
  if (act.length >= GAMES[r.intro.key].min && act.every(id => r.intro.ready.has(id))) startMission(r);
}
function startMission(r) {
  if (r.phase !== 'intro') return;
  const key = r.intro.key; const g = GAMES[key];
  const act = [...r.intro.active].filter(id => { const p = r.players.get(id); return p && p.online; });
  if (act.length < g.min) return send(r.players.get(r.hostId)?.ws, { t: 'err', m: 'بدها ' + g.min + ' لاعبين عالأقل' });
  const diff = r.intro.diff;
  if (g.cap) act.forEach(id => { const p = r.players.get(id); p.capPlayed = (p.capPlayed || 0) + 1; });
  const startAt = now() + 3500;
  r.cur = { key, act, diff, startAt, endsAt: startAt + g.dur[diff] * 1000, st: null, lastPush: 0 };
  r.phase = 'count'; r.intro = null;
  stats.games[key] = stats.games[key] || { played: 0, won: 0 }; stats.games[key].played++;
  pushRoom(r);
}
function endMission(r, res, why) {
  if (r.phase !== 'play') return;
  const key = r.cur.key; const ok = res === 'win';
  if (ok) stats.games[key].won++; else r.hearts--;
  r.remaining = r.remaining.filter(k => k !== key);
  r.done.push({ key, ok, diff: r.cur.diff });
  const W = ['مش بطالين', 'ماشي… هالمرة', 'طيب، طلعتوا قدّها', 'حظ؟ يمكن', 'حلو، كمّلوا'];
  const L = ['قرّبتوا… بس لأ', 'مرة تانية؟', 'ولا يهمكن', 'راح قلب 💔', 'بتصير'];
  r.after = { key, ok, why: ok ? '' : (why || GAMES[key].why || 'الوقت خلص'), taunt: pick(ok ? W : L), last: r.hearts <= 0 || !r.remaining.length };
  r.phase = 'after';
  pushGame(r);
  r.cur.st = null;
  if (r.after.last) r.timer = setTimeout(() => toFinal(r), FAST ? 500 : 4500);
  else { r.after.autoAt = now() + (FAST ? 3000 : 15000); r.timer = setTimeout(() => { if (r.phase === "after") startWheel(r); }, FAST ? 3000 : 15000); }
  pushRoom(r);
}
// تمرير: المهمة بتطلع من الدولاب بلا ما تاخد قلب
function skipMission(r) {
  if (!['intro', 'count', 'play'].includes(r.phase)) return;
  const key = r.phase === 'intro' ? r.intro.key : r.cur.key;
  clearTimeout(r.timer); if (r.cur) r.cur.st = null;
  r.remaining = r.remaining.filter(k => k !== key); r.done.push({ key, skip: true });
  r.cur = null; r.intro = null; r.after = null;
  broadcast(r, { t: 'fx', k: 'skip', key });
  startWheel(r);
}
// عيد: بأي لحظة، والنتيجة السابقة بتنلغى (والقلب بيرجع إذا كانت فشل)
function retryMission(r) {
  let key, act, diff;
  if (r.phase === 'count' || r.phase === 'play') { key = r.cur.key; act = r.cur.act; diff = r.cur.diff; r.cur.st = null; }
  else if (r.phase === 'after' || r.phase === 'final' || r.phase === 'wheel') {
    const last = r.done[r.done.length - 1]; if (!last || last.skip) return;
    r.done.pop(); if (!last.ok) r.hearts = Math.min(3, r.hearts + 1); else if (stats.games[last.key]) stats.games[last.key].won--;
    if (r.phase === 'final') stats.finals = Math.max(0, stats.finals - 1);
    if (!r.remaining.includes(last.key)) r.remaining.push(last.key);
    key = last.key; diff = last.diff || r.diff; act = null;
  } else return;
  clearTimeout(r.timer);
  r.cur = null; r.after = null; r.wheel = null;
  r.phase = 'intro';
  const on = onlinePlayers(r).map(p => p.id);
  r.intro = { key, diff, active: act ? new Set(act.filter(id => on.includes(id))) : pickActive(r, key), ready: new Set(), retry: true };
  broadcast(r, { t: 'fx', k: 'retry', key });
  pushRoom(r);
}
function restartForDrop(r) { const key = r.cur.key, diff = r.cur.diff, act = r.cur.act; r.cur.st = null; r.cur = null; r.phase = 'intro'; r.intro = { key, diff, active: new Set(act), ready: new Set(), retry: true }; pushRoom(r); }
function dropFromMission(r, pid) {
  if (r.intro) { r.intro.active.delete(pid); r.intro.ready.delete(pid); }
  if (!r.cur) return;
  r.cur.act = r.cur.act.filter(x => x !== pid);
  if (r.phase === 'play' && r.cur.st) {
    const g = GAMES[r.cur.key];
    if (r.cur.act.length < g.min) return restartForDrop(r);
    let out; try { if (g.drop) out = g.drop(ctxFor(r), r.cur.st, pid); } catch (e) { console.error(e); }
    if (out === 'restart') return restartForDrop(r);
    pushGame(r);
  }
}
function toFinal(r) {
  clearTimeout(r.timer);
  if (r.phase === 'final') return;
  r.phase = 'final'; r.cur = null; r.intro = null; r.wheel = null;
  stats.finals++; if (r.done.length === KEYS.length && r.done.every(d => d.ok)) stats.perfect++;
  pushRoom(r);
}

// حلقة اللعب
setInterval(() => {
  const t = now();
  for (const r of rooms.values()) {
    if (r.phase === 'count' && t >= r.cur.startAt) {
      r.phase = 'play'; const g = GAMES[r.cur.key];
      try { r.cur.st = g.init(ctxFor(r)); } catch (e) { console.error(e); r.cur.st = {}; }
      r.cur.lastTick = t; pushRoom(r); pushGame(r); continue;
    }
    if (r.phase === 'play' && r.cur && r.cur.st) {
      const g = GAMES[r.cur.key]; const dt = Math.min(0.2, (t - r.cur.lastTick) / 1000); r.cur.lastTick = t;
      let out; try { if (g.tick) out = g.tick(ctxFor(r), r.cur.st, dt); } catch (e) { console.error(e); }
      if (out) { endMission(r, out.res, out.why); continue; }
      if (t >= r.cur.endsAt && !g.noTimer) { endMission(r, g.survival ? 'win' : 'lose'); continue; }
      if (t >= r.cur.endsAt + 4000 && g.noTimer) { endMission(r, 'lose'); continue; }
      const rate = g.rate || 0;
      if (r.cur.st.dirty && (!rate || t - r.cur.lastPush >= rate)) pushGame(r);
    }
    // الريس غايب
    if (r.hostGoneAt && !r.hostGoneSent && t - r.hostGoneAt > 15000) { r.hostGoneSent = true; pushRoom(r); }
    // تنظيف الغرف الفاضية
    if (!onlinePlayers(r).length && t - (r.emptyAt || t) > 30 * 60000) rooms.delete(r.code);
  }
}, 40);

// ---------------- الاتصالات ----------------
function cleanName(s) { return String(s || '').replace(/[<>]/g, '').trim().slice(0, 18); }
function cleanPhoto(s, max = 120000) { s = String(s || ''); return s.startsWith('data:image/') && s.length < max ? s : null; }

function attach(ws, r, p) {
  if (p.ws && p.ws !== ws) { try { send(p.ws, { t: 'replaced' }); p.ws.close(); } catch (e) {} }
  p.ws = ws; p.online = true; ws.room = r; ws.pid = p.id; r.emptyAt = null;
  if (r.hostId === p.id) { r.hostGoneAt = null; r.hostGoneSent = false; }
  send(ws, { t: 'you', pid: p.id, code: r.code });
  // كل الصور
  for (const q of r.players.values()) if (q.photo) send(ws, { t: 'photo', pid: q.id, data: q.photo });
  if (r.groupPhoto) send(ws, { t: 'gphoto', data: r.groupPhoto });
  pushRoom(r);
  if (r.phase === 'play') pushGame(r);
}

wss.on('connection', ws => {
  ws.isAlive = true; ws.on('pong', () => ws.isAlive = true);
  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    const t = m.t;
    if (t === 'ping') return send(ws, { t: 'pong', c: m.c, s: now() });

    if (t === 'create') {
      const code = newCode(); const p = { id: uid(), name: cleanName(m.name) || 'الريس', g: m.g === 'f' ? 'f' : 'm', photo: cleanPhoto(m.photo), color: COLORS[0], online: true };
      const r = {
        code, hostId: p.id, name: cleanName(m.room && m.room.name) || 'قعدتنا', type: String((m.room && m.room.type) || 'شلة').slice(0, 20),
        diff: m.room && m.room.diff === 'hard' ? 'hard' : 'easy', players: new Map([[p.id, p]]), order: [p.id], phase: 'lobby', hearts: 3,
        remaining: [...KEYS], done: [], created: now(), wheel: null, intro: null, cur: null, after: null
      };
      rooms.set(code, r); stats.sessions++; stats.joins++; bump('sessions'); bump('joins');
      if (p.photo) broadcast(r, { t: 'photo', pid: p.id, data: p.photo });
      return attach(ws, r, p);
    }
    if (t === 'join') {
      const r = rooms.get(String(m.code || '').toUpperCase().trim());
      if (!r) return send(ws, { t: 'err', m: 'ما في قعدة بهالكود', code: 'nocode' });
      if (r.phase === 'final') return send(ws, { t: 'err', m: 'هالقعدة خلصت', code: 'nocode' });
      if (onlinePlayers(r).length >= 12) return send(ws, { t: 'err', m: 'القعدة مليانة (12 لاعب)', code: 'full' });
      const p = { id: uid(), name: cleanName(m.name) || 'لاعب', g: m.g === 'f' ? 'f' : 'm', photo: cleanPhoto(m.photo), color: nextColor(r), online: true };
      r.players.set(p.id, p); r.order.push(p.id); stats.joins++; bump('joins');
      if (p.photo) broadcast(r, { t: 'photo', pid: p.id, data: p.photo });
      if (r.phase === 'intro' && !GAMES[r.intro.key].cap) r.intro.active.add(p.id);
      return attach(ws, r, p);
    }
    if (t === 'rejoin') {
      const r = rooms.get(String(m.code || '').toUpperCase()); const p = r && r.players.get(m.pid);
      if (!r || !p) return send(ws, { t: 'err', m: 'gone', code: 'gone' });
      return attach(ws, r, p);
    }

    const r = ws.room; if (!r) return; const p = r.players.get(ws.pid); if (!p) return;
    const isHost = r.hostId === p.id;

    switch (t) {
      case 'profile':
        if (m.name !== undefined) p.name = cleanName(m.name) || p.name;
        if (m.g) p.g = m.g === 'f' ? 'f' : 'm';
        if (m.photo !== undefined) { p.photo = cleanPhoto(m.photo); broadcast(r, { t: 'photo', pid: p.id, data: p.photo }); }
        return pushRoom(r);
      case 'start': if (isHost && r.phase === 'lobby') { if (onlinePlayers(r).length < 2) return send(ws, { t: 'err', m: 'بدها لاعبين اتنين عالأقل' }); startWheel(r); } return;
      case 'diff': if (isHost && r.phase === 'intro') { r.intro.diff = m.v === 'hard' ? 'hard' : 'easy'; r.diff = r.intro.diff; r.intro.ready.clear(); pushRoom(r); } return;
      case 'toggle':
        if (isHost && r.phase === 'intro' && r.players.has(m.pid)) {
          const a = r.intro.active; const cap = GAMES[r.intro.key].cap;
          if (a.has(m.pid)) a.delete(m.pid); else { if (cap && a.size >= cap) return send(ws, { t: 'err', m: 'هالمهمة بتاخد ' + cap + ' بس — طلّع حدا أول' }); a.add(m.pid); }
          r.intro.ready.delete(m.pid); pushRoom(r); checkIntroReady(r);
        } return;
      case 'shuffleActive': if (isHost && r.phase === 'intro') { r.intro.active = new Set(shuffle(onlinePlayers(r).map(x => x.id)).slice(0, GAMES[r.intro.key].cap || 12)); r.intro.ready.clear(); pushRoom(r); } return;
      case 'ready': if (r.phase === 'intro' && r.intro.active.has(p.id)) { r.intro.ready.add(p.id); pushRoom(r); checkIntroReady(r); } return;
      case 'go': if (isHost && r.phase === 'intro') startMission(r); return;
      case 'next': if (isHost && r.phase === 'after' && !r.after.last) { clearTimeout(r.timer); startWheel(r); } return;
      case 'skip': if (isHost) skipMission(r); return;
      case 'retry': if (isHost) retryMission(r); return;
      case 'in':
        if (r.phase === 'play' && r.cur && r.cur.st && (r.cur.act.includes(p.id) || (m.d && m.d.a === 'replay'))) {
          let out; try { out = GAMES[r.cur.key].input(ctxFor(r), r.cur.st, p.id, m.d || {}); } catch (e) { console.error(e); }
          if (out) endMission(r, out.res, out.why);
          else { const g = GAMES[r.cur.key]; if (r.cur.st.dirty && !g.rate) pushGame(r); }
        } return;
      case 'kick':
        if (isHost && m.pid !== p.id && r.players.has(m.pid)) {
          const q = r.players.get(m.pid); send(q.ws, { t: 'kicked' }); if (q.ws) q.ws.room = null;
          r.players.delete(m.pid); r.order = r.order.filter(x => x !== m.pid);
          dropFromMission(r, m.pid);
          pushRoom(r); checkIntroReady(r);
        } return;
      case 'rename': if (isHost && r.players.has(m.pid)) { r.players.get(m.pid).name = cleanName(m.name) || r.players.get(m.pid).name; pushRoom(r); } return;
      case 'handover': if (isHost && r.players.has(m.pid) && r.players.get(m.pid).online) { r.hostId = m.pid; r.hostGoneAt = null; r.hostGoneSent = false; pushRoom(r); } return;
      case 'claim': if (!isHost && r.hostGoneAt && now() - r.hostGoneAt > 15000) { r.hostId = p.id; r.hostGoneAt = null; r.hostGoneSent = false; pushRoom(r); } return;
      case 'roomedit': if (isHost) { if (m.name) r.name = cleanName(m.name) || r.name; if (m.type) r.type = String(m.type).slice(0, 20); pushRoom(r); } return;
      case 'gphoto': if (isHost) { r.groupPhoto = cleanPhoto(m.data, 700000); broadcast(r, { t: 'gphoto', data: r.groupPhoto }); pushRoom(r); } return;
      case 'end': if (isHost) { if (r.phase === 'play') { r.cur.st = null; } toFinal(r); } return;
      case 'leave':
        p.online = false; p.ws = null; ws.room = null;
        if (r.phase === 'lobby') { r.players.delete(p.id); r.order = r.order.filter(x => x !== p.id); }
        if (r.hostId === p.id) { const nxt = onlinePlayers(r)[0]; if (nxt) r.hostId = nxt.id; }
        if (r.intro) { r.intro.active.delete(p.id); r.intro.ready.delete(p.id); }
        pushRoom(r); checkIntroReady(r); return;
    }
  });
  ws.on('close', () => {
    const r = ws.room; if (!r) return; const p = r.players.get(ws.pid);
    if (p && p.ws === ws) {
      p.online = false; p.ws = null;
      if (r.hostId === p.id) { r.hostGoneAt = now(); r.hostGoneSent = false; }
      if (!onlinePlayers(r).length) r.emptyAt = now();
      pushRoom(r); checkIntroReady(r);
    }
  });
});
setInterval(() => { wss.clients.forEach(ws => { if (!ws.isAlive) return ws.terminate(); ws.isAlive = false; try { ws.ping(); } catch (e) {} }); }, 25000);

process.on('SIGTERM', () => { saveStats(); process.exit(0); });
server.listen(PORT, () => console.log('قعدة فزعة شغّالة على ' + PORT + (FAST ? ' (FAST)' : '')));
