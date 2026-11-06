// قعدة فزعة — المهمات الـ12 (واجهة اللاعب)
// إعداد م. إياد حلوبي
'use strict';
window.FZ = window.FZ || {};
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
function h(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
FZ.off = 0;
const sNow = () => Date.now() + FZ.off;
const inp = d => FZ.send({ t: 'in', d });
const P = pid => (FZ.room && FZ.room.players.find(p => p.id === pid)) || { name: '؟', color: '#999', g: 'm' };
const G = (p, m, f) => (p && p.g === 'f' ? f : m);
const vib = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };
function avHTML(p, size) {
  const ph = FZ.photos && FZ.photos[p.id];
  const st = `background-color:${p.color};${ph ? `background-image:url(${ph});` : ''}${size ? `width:${size}px;height:${size}px;font-size:${size * 0.4}px;` : ''}`;
  return `<div class="av" style="${st}">${ph ? '' : esc((p.name || '؟')[0])}</div>`;
}
FZ.avHTML = avHTML;
function flash(color) { const d = document.createElement('div'); d.className = 'flash'; d.style.background = color; document.body.appendChild(d); setTimeout(() => d.remove(), 520); }
function shake(el) { if (!el) return; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
FZ.flash = flash;

// ---------- صوت ----------
let AC = null;
FZ.audio = () => { try { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) {} return AC; };
function tone(f, d = 0.12, type = 'sine', v = 0.25, when = 0) {
  const ac = FZ.audio(); if (!ac) return; const t = ac.currentTime + when;
  const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d); o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + d + 0.02);
}
function noise(d = 0.12, v = 0.3, hp = 800) {
  const ac = FZ.audio(); if (!ac) return; const n = Math.floor(ac.sampleRate * d); const b = ac.createBuffer(1, n, ac.sampleRate); const ch = b.getChannelData(0);
  for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = ac.createBufferSource(); s.buffer = b; const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; const g = ac.createGain(); g.gain.value = v;
  s.connect(f); f.connect(g); g.connect(ac.destination); s.start();
}
FZ.sfx = {
  ok() { tone(880, 0.09, 'square', 0.12); },
  bad() { tone(160, 0.3, 'sawtooth', 0.18); },
  win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, 'triangle', 0.2, i * 0.11)); },
  lose() { [392, 330, 262].forEach((f, i) => tone(f, 0.25, 'sawtooth', 0.15, i * 0.16)); },
  tick() { tone(1200, 0.04, 'square', 0.08); },
  warn(hot) { tone(hot ? 1320 : 990, hot ? 0.12 : 0.08, 'square', hot ? 0.16 : 0.1); if (hot) tone(1760, 0.08, 'square', 0.08, 0.12); },
  click() { tone(1500, 0.05, 'square', 0.25); }
};
// ---------- عشوائي ثابت ----------
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

const GM = {};
FZ.GM = GM;



// ======================= 1. عدّوا سوا =======================
GM.count = {
  icon: '🔢', short: 'عدّوا سوا بلا ما تتفقوا', hard: 'لازم توصلوا لـ30 بدل 20',
  rules: ['كل واحد بيكبس «الرقم الجاي» بأي وقت بدو ياه — ولو ورا بعض بعُشر ثانية، عادي.', 'بس إذا كبستوا بنفس اللحظة بالضبط — من الصفر.', 'وما حدا بيكبس مرتين ورا بعض — من الصفر.', 'ممنوع تتفقوا مين بعد مين. بس إحساس.'],
  mount(root, v) {
    this.root = root; this.seq = -1;
    root.innerHTML = `<div class="bar" style="width:100%"><i id="cb" style="width:0"></i></div>
      <div class="big" id="cn">0</div><div class="sub" id="ct">لازم توصلوا لـ${v.target}</div>
      <div class="taunt hidden" id="cm"></div>
      <button class="tappad" id="ctap">الرقم الجاي</button>`;
    $('#ctap', root).onpointerdown = e => { e.preventDefault(); inp({ a: 'tap', at: Math.round(sNow()) }); vib(20); };
    this.update(v);
  },
  update(v) {
    const r = this.root; $('#cn', r).textContent = v.n; $('#cb', r).style.width = (v.n / v.target * 100) + '%';
    if (v.seq !== this.seq && this.seq !== -1 && v.fx) {
      const m = $('#cm', r);
      if (v.fx.k === 'ok') { FZ.sfx.ok(); m.classList.add('hidden'); $('#cn', r).style.color = P(v.fx.who[0]).color; }
      else {
        FZ.sfx.bad(); flash('#e5383b'); shake($('#cn', r)); m.classList.remove('hidden');
        m.textContent = v.fx.k === 'clash' ? `💥 ${P(v.fx.who[0]).name} و${P(v.fx.who[1]).name} كبسوا بنفس اللحظة — من الصفر` : `🙃 ${P(v.fx.who[0]).name} ${G(P(v.fx.who[0]), 'كبس', 'كبست')} مرتين ورا بعض — من الصفر`;
      }
    }
    this.seq = v.seq;
  }
};

// ======================= 2. الكيبورد المقسوم =======================
const NORM = ch => ({ 'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ى': 'ي', 'ؤ': 'و', 'ئ': 'ي' }[ch] || ch);
GM.keyboard = {
  icon: '⌨️', short: 'اكتبوا الجملة سوا، كل واحد معه حروف', hard: 'جملة أطول بكتير',
  rules: ['في جملة لازم تنكتب حرف حرف.', 'كل حرف بالجملة موجود عند واحد منكن — وفي حروف دخيلة ما إلها دخل.', 'الألف بكل أشكالها (أ إ آ ا) حرف واحد، والياء والألف المقصورة (ي ى) حرف واحد.', 'اللي عنده الحرف الجاي بيكبسه. احكوا مع بعض!', 'كل حرف غلط بياكل ثانيتين من الوقت.'],
  mount(root, v) {
    this.root = root; this.seq = v.seq; this.ver = null;
    root.innerHTML = `<div class="card sentence" id="ks"></div><div class="sub" id="kh">حروفك 👇</div><div class="keys" id="kk"></div>`;
    this.update(v);
  },
  buildKeys(v) {
    const kk = $('#kk', this.root); kk.innerHTML = '';
    v.keys.forEach(ch => { const b = h(`<button class="key">${esc(ch)}</button>`); b.onpointerdown = e => { e.preventDefault(); inp({ a: 'key', ch }); vib(15); b.classList.add('pressed'); setTimeout(() => b.classList.remove('pressed'), 120); }; kk.appendChild(b); });
    this.ver = v.ver;
  },
  update(v) {
    if (this.ver !== v.ver) this.buildKeys(v);
    const t = v.text; let html = '';
    for (let i = 0; i < t.length; i++) { const c = esc(t[i] === ' ' ? ' ' : t[i]); html += i < v.pos ? `<span class="d">${c}</span>` : i === v.pos ? `<span class="n">${c}</span>` : `<span class="r">${c}</span>`; }
    $('#ks', this.root).innerHTML = html;
    const next = NORM(t[v.pos] || ''); const mine = v.keys.includes(next);
    $('#kh', this.root).innerHTML = mine ? '<b style="color:var(--b)">الحرف الجاي عندك! 👇</b>' : 'حروفك 👇';
    $$('.key', this.root).forEach(b => b.classList.toggle('hint', false));
    if (v.seq !== this.seq && v.fx) {
      if (v.fx.k === 'ok') FZ.sfx.ok();
      else { FZ.sfx.bad(); flash('#e5383b'); shake($('#ks', this.root)); FZ.toast(`${P(v.fx.who).name} كبس «${v.fx.ch}» — ناقص ثانيتين ⏳`); }
    }
    this.seq = v.seq;
  }
};


// ======================= 3. البرج =======================
GM.tower = {
  icon: '🏗️', short: 'كل واحد إلو حجار باسمه — ابنوا البرج سوا', hard: 'البرج أعلى، الحجر أصغر وبيتمرجح أسرع',
  rules: ['كل واحد إلو حجار مكتوب عليها اسمه، والكل بيلعب — ما حدا بيتفرّج.', 'لما يجي دورك بتطلع حجرتك عم تتمرجح فوق البرج: اكبس بأي مكان بالشاشة لتنزل.', 'اللي بيطلع برّا البرج بينقصّ، وإذا نزلت بالضبط فوق بتاخد «بالضبط» والحجرة بتكبر شوي.', 'إذا ما ركبت أبداً بتوقع، وبترجع حجرتك عالدور لآخر.'],
  mount(root, v) {
    this.root = root; this.v = v; this.seq = v.seq; this.tap = null;
    root.innerHTML = `<div class="towhead"><div id="tw"></div><b id="tn">0/${v.total}</b></div>
      <canvas class="full" id="tc" width="600" height="760" style="max-width:340px"></canvas><div class="sub" id="tq"></div>`;
    const cv = $('#tc', root); this.ctx = cv.getContext('2d');
    cv.onpointerdown = e => { e.preventDefault(); if (this.v.turnPid !== FZ.me || this.tap !== null) return; this.tap = this.swingX(); inp({ a: 'drop', x: +this.tap.toFixed(4) }); vib(25); };
    const loop = () => { if (!this.root) return; this.draw(); this.raf = requestAnimationFrame(loop); }; loop();
    this.update(v);
  },
  swingX() { const v = this.v; return Math.sin((sNow() - v.swingAt) / 1000 * v.speed) * 0.55; },
  update(v) {
    this.v = v; this.tap = null; const p = P(v.turnPid); const mine = v.turnPid === FZ.me;
    $('#tw', this.root).innerHTML = mine ? `<b style="color:var(--b)">دورك! اكبس عالشاشة 👇</b>` : `الدور على <b style="color:${p.color}">${esc(p.name)}</b>`;
    $('#tn', this.root).textContent = v.placed + '/' + v.total;
    $('#tq', this.root).innerHTML = v.next.length ? 'بعدو: ' + v.next.map(x => `<b style="color:${P(x).color}">${esc(P(x).name)}</b>`).join(' ← ') : '';
    if (v.seq !== this.seq && v.fx) {
      if (v.fx.k === 'fall') { FZ.sfx.bad(); flash('#e5383b'); FZ.toast(`حجرة ${P(v.fx.who).name} وقعت 😬 — رجعت عالدور`); }
      else if (v.fx.p) { FZ.sfx.win(); FZ.toast('بالضبط! 🎯'); } else FZ.sfx.ok();
    }
    if (mine && v.seq !== this.seq) vib(60);
    this.seq = v.seq;
  },
  draw() {
    const c = this.ctx, v = this.v, W = 600, H = 760, BH = 44, cs = getComputedStyle(document.documentElement);
    c.clearRect(0, 0, W, H); const n = v.blocks.length; const show = 11; const off = Math.max(0, n - show);
    const X = x => W / 2 + x * (W / 2) * 0.95; const Y = i => H - 40 - (i - off + 1) * BH;
    c.fillStyle = cs.getPropertyValue('--screen'); c.fillRect(0, H - 40, W, 40);
    const blk = (x0, x1, y, col, label, alpha = 1) => { c.globalAlpha = alpha; c.fillStyle = col; c.fillRect(x0, y, x1 - x0, BH - 4); c.lineWidth = 4; c.strokeStyle = '#16161d'; c.strokeRect(x0, y, x1 - x0, BH - 4); if (label && x1 - x0 > 40) { c.fillStyle = '#fff'; c.font = '800 20px Changa'; c.textAlign = 'center'; c.direction = 'rtl'; c.fillText(label, (x0 + x1) / 2, y + 28); } c.globalAlpha = 1; };
    v.blocks.forEach((b, i) => { if (i < off) return; const p = b.pid ? P(b.pid) : null; blk(X(b.x - b.w / 2), X(b.x + b.w / 2), Y(i), i === 0 ? '#16161d' : (b.p ? '#12a36b' : p.color), p ? (b.p ? '🎯 ' : '') + p.name : ''); });
    if (!v.turnPid) return;
    const top = v.blocks[n - 1]; const sx = this.tap !== null ? this.tap : this.swingX(); const p = P(v.turnPid);
    const x0 = X(sx - top.w / 2), x1 = X(sx + top.w / 2);
    blk(x0, x1, Y(n), p.color, '', 0.22);
    blk(x0, x1, Y(n) - 34, p.color, p.name);
  },
  unmount() { cancelAnimationFrame(this.raf); this.root = null; }
};


// ======================= 5. عبّوا الكاسة =======================
GM.glass = {
  icon: '🥛', short: 'الكاسة مخزوقة — عبّوها للخط وضلّوا عليه', hard: 'المي بتنزل من الكاسة أسرع بكتير',
  rules: ['الكاسة عم تنقص طول الوقت.', 'كل واحد معه أداة صبّ مختلفة: إبريق، قنينة، كاسة، معلقة.', 'وصلوا المي للخط وضلّوا عليه 5 ثواني متواصلين.', 'إذا طافت بترجع لنصها. نسّقوا مين بيصب وإيمت.'],
  mount(root, v) {
    this.root = root; this.seq = v.seq;
    const lo = v.lo, hi = v.hi;
    root.innerHTML = `<div class="holdpill" id="gh">ثابتين… 5</div>
      <div class="glassWrap"><div class="glass"><div class="gline" style="bottom:${lo}%;height:${hi - lo}%"></div><div class="water" id="gw" style="height:${v.lvl}%"></div></div><div class="drip"></div></div>
      <button class="btn main" id="gp" style="max-width:320px;font-size:20px;padding:16px">صُبّ ${v.tool ? v.tool.e + ' (' + v.tool.n + ')' : ''}</button>`;
    $('#gp', root).onpointerdown = e => { e.preventDefault(); inp({ a: 'pour' }); vib(15); tone(300 + Math.random() * 200, 0.08, 'sine', 0.15); };
    this.update(v);
  },
  update(v) {
    const r = this.root; $('#gw', r).style.height = Math.min(100, v.lvl) + '%';
    const hp = $('#gh', r); const on = v.lvl >= v.lo && v.lvl <= v.hi; hp.classList.toggle('on', on); hp.textContent = 'ثابتين… ' + Math.max(0, Math.ceil(5 - v.hold));
    if (v.seq !== this.seq && v.fx && v.fx.k === 'spill') { FZ.sfx.bad(); flash('#2b59ff'); FZ.toast(`طافت! 🌊 (${P(v.fx.who).name})`); }
    this.seq = v.seq;
  }
};

// ======================= 6. الجسر =======================
GM.bridge = {
  icon: '🌉', short: 'حطوا الألواح قدّام الراكض بوقتها', hard: 'الراكض أسرع والجسر أطول',
  rules: ['في راكض عم يقطع جسر، وكل لوح إلو صاحب (بلونه) — والترتيب مخربط: ممكن يرجع دورك ورا بعض.', 'حط لوحك لما يكون الراكض عاللوح اللي قبله بالضبط.', 'إذا بكّرت بيوقع اللوح وبتستنى ثانية ونص. إذا تأخرت الراكض بيوقع وبترجعوا من الأول.', 'لازم يقطع الجسر كله قبل ما يخلص الوقت.'],
  mount(root, v) {
    this.root = root; this.v = v; this.at = Date.now(); this.seq = v.seq;
    root.innerHTML = `<canvas class="full" id="brc" width="700" height="300"></canvas><div class="sub" id="brs"></div>
      <button class="btn main" id="brb" style="font-size:22px;padding:18px">حط لوحك 🪵</button>`;
    this.ctx = $('#brc', root).getContext('2d');
    $('#brb', root).onpointerdown = e => { e.preventDefault(); inp({ a: 'place' }); vib(20); };
    const loop = () => { if (!this.root) return; this.draw(); this.raf = requestAnimationFrame(loop); }; loop();
    this.update(v);
  },
  update(v) {
    this.v = v; this.at = Date.now();
    const mineNext = v.owners.findIndex((o, i) => o === FZ.me && !v.placed[i] && i >= Math.ceil(v.r));
    $('#brs', this.root).innerHTML = mineNext >= 0 ? `لوحك الجاي: <b>رقم ${mineNext + 1}</b> — حطه لما يوصل الراكض للوح ${mineNext}` : 'خلصت ألواحك بهالمشوار 👌';
    $('#brb', this.root).disabled = v.cool;
    if (v.seq !== this.seq && v.fx) {
      if (v.fx.k === 'fall') { FZ.sfx.lose(); flash('#2b59ff'); FZ.toast(`الراكض وقع باللوح ${v.fx.i + 1} (${P(v.fx.who).name}) — من الأول`); }
      else if (v.fx.k === 'early') { FZ.sfx.bad(); if (v.fx.who === FZ.me) FZ.toast('بكّرت! وقع اللوح 🙃'); }
      else FZ.sfx.ok();
    }
    this.seq = v.seq;
  },
  draw() {
    const c = this.ctx, v = this.v, W = 700, H = 300, U = 92; const r = Math.min(v.P, v.r + v.v * (Date.now() - this.at) / 1000);
    const cs = getComputedStyle(document.documentElement); const cx = W * 0.62;
    c.clearRect(0, 0, W, H);
    c.fillStyle = cs.getPropertyValue('--screen'); c.fillRect(0, 230, W, 70);
    c.fillStyle = 'rgba(43,89,255,.5)'; for (let i = 0; i < 8; i++) c.fillRect(((i * 120 - Date.now() / 20) % (W + 120) + W + 120) % (W + 120) - 120, 250 + (i % 3) * 16, 70, 6);
    const X = i => cx - (i - r) * U; // من اليمين لليسار
    // البر
    c.fillStyle = '#12a36b'; c.fillRect(X(-0.02), 200, W, 50); c.fillRect(-W, 200, X(v.P) + W, 50);
    for (let i = 0; i < v.P; i++) {
      const x1 = X(i), x0 = X(i + 1); if (x1 < -U || x0 > W + U) continue; const p = P(v.owners[i]); const win = r >= i - 1 && r < i && !v.placed[i];
      c.lineWidth = 4; c.strokeStyle = '#16161d';
      if (v.placed[i]) { c.fillStyle = p.color; c.fillRect(x0 + 3, 200, U - 6, 34); c.strokeRect(x0 + 3, 200, U - 6, 34); }
      else { c.setLineDash([8, 6]); c.strokeStyle = p.color; c.lineWidth = win ? 7 : 4; c.strokeRect(x0 + 3, 200, U - 6, 34); c.setLineDash([]); }
      c.fillStyle = v.placed[i] ? '#fff' : p.color; c.font = '800 22px Changa'; c.textAlign = 'center'; c.fillText((v.owners[i] === FZ.me ? '★' : '') + (i + 1), (x0 + x1) / 2, 225);
      if (win) { c.fillStyle = p.color; c.font = '800 20px Cairo'; c.fillText('هلق! ' + p.name, (x0 + x1) / 2, 186); }
    }
    // الراكض
    const bob = Math.abs(Math.sin(Date.now() / 90)) * 8; c.font = '64px serif'; c.textAlign = 'center'; c.fillText('🏃', cx, 196 - bob);
    c.fillStyle = cs.getPropertyValue('--glow'); c.font = '800 22px Changa'; c.fillText(Math.max(0, Math.floor(r + 1)) + '/' + v.P, 60, 40);
  },
  unmount() { cancelAnimationFrame(this.raf); this.root = null; }
};

// ======================= 6. فكّ القنبلة =======================
const WC = { red: ['أحمر', '#e53935'], blue: ['أزرق', '#2b59ff'], yellow: ['أصفر', '#ffd400'], white: ['أبيض', '#ffffff'], black: ['أسود', '#16161d'], green: ['أخضر', '#12a36b'] };
const MOD_NAMES = { w: '🧵 الشرايط', btn: '🔴 الزر', sym: '🔣 الرموز', num: '🔢 اللوحة', lit: '💡 الأضواء' };
const MANUAL = {
  w: ['🧵 الشرايط', 'عدّوا الشرايط من فوق لتحت. قصّوا شريط واحد بس:', [
    ['3 شرايط', ['ما في ولا أحمر ← قصّ التاني', 'آخر شريط أبيض ← قصّ الأخير', 'في أكتر من أزرق ← قصّ آخر أزرق', 'غير هيك ← قصّ الأخير']],
    ['4 شرايط', ['في أكتر من أحمر ← قصّ آخر أحمر', 'آخر شريط أصفر وما في أحمر ← قصّ الأول', 'في أزرق واحد بالضبط ← قصّ الأول', 'في أكتر من أصفر ← قصّ الأخير', 'غير هيك ← قصّ التاني']],
    ['5 شرايط', ['آخر شريط أسود ← قصّ الرابع', 'في أحمر واحد بالضبط وأكتر من أصفر ← قصّ الأول', 'ما في ولا أسود ← قصّ التاني', 'غير هيك ← قصّ الأول']]]],
  btn: ['🔴 الزر الكبير', 'امشوا عالقواعد بالترتيب، وأول وحدة بتنطبق هي اللي منعملها:', [
    ['كبسة وحدة ولا مطوّلة؟', ['زر أزرق ومكتوب «وقّف» ← مطوّلة', 'زر أبيض ← كبسة وحدة', 'مكتوب «فجّر» ← كبسة وحدة', 'زر أحمر ومكتوب «اضغط» ← كبسة وحدة', 'غير هيك ← مطوّلة']],
    ['المطوّلة', ['خلّي كابس، بيطلع شريط ملوّن تحت الزر', 'أزرق ← فلّت لما المؤقت فيه رقم 4', 'أصفر ← فلّت لما المؤقت فيه رقم 5', 'أحمر أو أبيض ← فلّت لما المؤقت فيه رقم 1']]]],
  num: ['🔢 اللوحة الرقمية', 'عالشاشة رقم، وتحتها 4 أزرار. الأزرار بتنعدّ من اليمين. لازم 3 مراحل صح ورا بعض (الغلط بيرجعها من الأول):', [
    ['شو منكبس؟', ['الشاشة 1 ← الزر التاني من اليمين', 'الشاشة 2 ← الزر المكتوب عليه 4', 'الشاشة 3 ← الزر التالت من اليمين', 'الشاشة 4 ← الزر المكتوب عليه 1']]]]
};
GM.bomb = {
  icon: '💣', short: 'واحد شايف القنبلة والباقي معهم الدليل', hard: '5 أقسام بدل 3 (اللوحة الرقمية والأضواء)',
  rules: ['واحد منكن بيشوف القنبلة، والباقي معهم دليل الفك مقسوم بيناتهن.', 'الحكي مسموح! اللي شايف القنبلة بيوصف، واللي معه الدليل بيقلّه شو يعمل.', 'السهل والمتوسط: 3 أقسام (شرايط، زر، رموز). الصعب: 5 أقسام.', '3 غلطات أو خلص الوقت = القنبلة بتفقع.', 'إذا عددكن قليل، كل واحد معه أكتر من صفحة.'],
  mount(root, v) { this.root = root; this.seq = v.seq; this.built = false; root.style.alignItems = 'stretch'; root.style.justifyContent = 'flex-start'; this.update(v); },
  head(v) { return `<div class="hud"><div class="strikes">${'❌'.repeat(v.strikes)}${'⬜'.repeat(Math.max(0, 3 - v.strikes))}</div><div class="sub">${v.mods.map(m => (v.done[m] ? '✅ ' : '⬜ ') + MOD_NAMES[m].split(' ')[1]).join(' · ')}</div></div>`; },
  update(v) {
    const r = this.root;
    if (v.seq !== this.seq && v.fx) { if (v.fx.k === 'strike') { FZ.sfx.bad(); flash('#e5383b'); vib([80, 50, 80]); FZ.toast('❌ ' + v.fx.why); } else if (v.fx.k === 'ok') FZ.sfx.win(); else FZ.sfx.ok(); }
    this.seq = v.seq;
    if (v.role === 'reader') return this.reader(v);
    if (!this.built) this.build(v);
    $('#bs', r).innerHTML = this.head(v);
    v.mods.forEach(m => $('#m_' + m, r).classList.toggle('done', !!v.done[m]));
    $('#wl', r).innerHTML = v.wires.map((w, i) => `<div class="wire${v.cut[i] ? ' cut' : ''}" data-i="${i}" style="background:${WC[w][1]}"><span>${i + 1}</span></div>`).join('');
    $$('.wire', r).forEach(el => el.onclick = () => { if (!v.done.w && !el.classList.contains('cut')) { inp({ a: 'cut', i: +el.dataset.i }); vib(30); } });
    const bb = $('#bb', r); bb.style.background = WC[v.btn.color][1]; bb.style.color = v.btn.color === 'white' || v.btn.color === 'yellow' ? '#16161d' : '#fff'; bb.textContent = v.btn.word; bb.disabled = !!v.done.btn;
    const st = $('#bstr', r); if (v.btn.holding && v.btn.strip) { st.classList.remove('hidden'); st.style.background = WC[v.btn.strip][1]; } else st.classList.add('hidden');
    $('#sy', r).innerHTML = v.shown.map((s, i) => `<button class="sym${v.symPressed.includes(i) ? ' on' : ''}" data-k="${i}">${s}</button>`).join('');
    $$('.sym', r).forEach(el => el.onclick = () => { if (!v.done.sym) { inp({ a: 'sym', k: +el.dataset.k }); vib(20); } });
    if (v.mods.includes('num')) {
      $('#nd', r).textContent = v.done.num ? '✓' : v.num.display; $('#ns', r).innerHTML = [0, 1, 2].map(i => `<i class="${i < v.num.stage || v.done.num ? 'on' : ''}"></i>`).join('');
      $('#nb', r).innerHTML = v.num.labels.map((l, i) => `<button class="sym" data-k="${i}">${l}</button>`).join('');
      $$('#nb .sym', r).forEach(el => el.onclick = () => { if (!v.done.num) { inp({ a: 'num', k: +el.dataset.k }); vib(20); } });
    }
    if (v.mods.includes('lit')) {
      this.litSeq = v.lit.seq;
      $('#lw', r).innerHTML = v.lit.words.map(w => `<button class="btn sm" data-w="${w}">${w}</button>`).join('');
      $$('#lw button', r).forEach(el => el.onclick = () => { if (!v.done.lit) { inp({ a: 'lit', w: el.dataset.w }); vib(20); } });
    }
  },
  build(v) {
    const r = this.root; this.built = true;
    r.innerHTML = `<div id="bs"></div><div class="screenbox">💣 القنبلة معك! وصفها للقعدة — هنن معهم الدليل.</div>
      <div class="mod" id="m_w"><h4>🧵 الشرايط <small>(من فوق لتحت)</small></h4><div id="wl"></div></div>
      <div class="mod" id="m_btn"><h4>🔴 الزر الكبير</h4><button class="bbtn" id="bb"></button><div class="strip hidden" id="bstr"></div><div class="sub">كبسة وحدة؟ ولا مطوّلة؟</div></div>
      <div class="mod" id="m_sym"><h4>🔣 الرموز</h4><div class="syms glyph" id="sy"></div></div>
      ${v.mods.includes('num') ? '<div class="mod" id="m_num"><h4>🔢 اللوحة الرقمية <span class="stg" id="ns"></span></h4><div class="ndisp" id="nd"></div><div class="syms" id="nb" dir="rtl"></div></div>' : ''}
      ${v.mods.includes('lit') ? '<div class="mod" id="m_lit"><h4>💡 الأضواء</h4><div class="lamp3" id="ll"></div><div class="sub">الضو عم يعيد 3 ألوان. شو الكلمة؟</div><div class="row" id="lw" style="flex-wrap:wrap"></div></div>' : ''}`;
    const bb = $('#bb', r); let tm = null, held = false;
    const leftNow = () => Math.max(0, Math.ceil(((FZ.endsAt || 0) - sNow()) / 1000));
    bb.onpointerdown = e => { e.preventDefault(); bb.setPointerCapture(e.pointerId); held = false; tm = setTimeout(() => { held = true; inp({ a: 'hold' }); vib(40); }, 450); };
    const up = () => { if (tm) clearTimeout(tm); tm = null; if (held) inp({ a: 'release', left: leftNow() }); else inp({ a: 'press' }); held = false; };
    bb.onpointerup = up; bb.onpointercancel = () => { if (tm) clearTimeout(tm); if (held) inp({ a: 'release', left: leftNow() }); held = false; };
    if (v.mods.includes('lit')) {
      const ll = $('#ll', r); const loop = () => { if (!this.root || !ll.isConnected) return; const s = this.litSeq || []; const k = Math.floor(Date.now() / 700) % (s.length + 2); ll.style.background = k < s.length ? WC[s[k]][1] : '#2a2f55'; this.raf = requestAnimationFrame(loop); }; loop();
    }
  },
  reader(v) {
    const r = this.root; const d = P(v.def);
    let html = this.head(v) + `<div class="screenbox">📟 القنبلة مع <b>${esc(d.name)}</b> — اسمع ${G(d, 'وصفه', 'وصفها')} وقلّ${G(d, 'و', 'ا')} شو ${G(d, 'يعمل', 'تعمل')}</div>`;
    v.pages.forEach(pg => {
      if (MANUAL[pg]) { const [t, intro, secs] = MANUAL[pg]; html += `<div class="page"><h4>${t}</h4><p>${intro}</p>${secs.map(([st, li]) => `<b>${st}</b><ol>${li.map(x => `<li>${x}</li>`).join('')}</ol>`).join('')}</div>`; }
      else if (pg === 'sym') html += `<div class="page"><h4>🔣 الرموز</h4><p>دوّروا العمود اللي فيه الرموز الأربعة كلها (عمود واحد بس فيه الأربعة)، واكبسوهن بترتيبهن بالعمود من فوق لتحت.</p><div class="cols glyph">${v.cols.map((col, i) => `<div><small>${i + 1}</small>${col.join('<br>')}</div>`).join('')}</div></div>`;
      else if (pg === 'lit') html += `<div class="page"><h4>💡 الأضواء</h4><p>الضو بيعيد 3 ألوان ورا بعض وبعدين بيطفى شوي. دوّروا الألوان بالجدول واكبسوا الكلمة:</p><table class="ltab">${v.table.map(t => `<tr><td>${t.slice(0, 3).map(c => `<i style="background:${WC[c][1]}" title="${WC[c][0]}"></i>`).join('')}</td><td>${t.slice(0, 3).map(c => WC[c][0]).join(' · ')}</td><td><b>${t[3]}</b></td></tr>`).join('')}</table></div>`;
    });
    r.innerHTML = html;
  },
  unmount() { cancelAnimationFrame(this.raf); this.root = null; }
};


// ======================= 8. النبض =======================
GM.pulse = {
  noTimerUI: true,
  icon: '💓', short: 'كملوا الإيقاع بعد ما يسكت', hard: 'لازم ضبط 90% (المتوسط 80%، السهل 70%)',
  rules: ['بيشتغل إيقاع 8 دقّات — دقّوا معه.', 'بعدين بيسكت… وكلكن لازم تكملوا تدقّوا عنفس الإيقاع.', 'السهل: 8 دقّات بالسكوت ولازم ضبط 70%. المتوسط: 12 دقة و80%. الصعب: 12 دقة و90%.'],
  mount(root, v) {
    this.root = root; this.v = v; this.lastJ = -99;
    root.innerHTML = `<div class="gname" id="pt">استعدوا…</div><div class="beat" id="pb"></div><button class="tappad" id="pp">دُق</button><div id="pr" style="width:100%"></div>`;
    $('#pp', root).onpointerdown = e => { e.preventDefault(); inp({ a: 'tap', at: Math.round(sNow()) }); vib(15); tone(220, 0.06, 'sine', 0.2); };
    const loop = () => { if (!this.root) return; this.tick(); this.raf = requestAnimationFrame(loop); }; loop();
  },
  tick() {
    const v = this.v, t = sNow(); const j = Math.floor((t - v.start) / v.beat); const b = $('#pb', this.root), tt = $('#pt', this.root);
    if (v.res) return;
    if (t < v.start) { tt.textContent = 'استعدوا… 👂'; b.style.visibility = 'visible'; b.classList.remove('on'); return; }
    if (j < v.L) {
      tt.textContent = 'دقّوا مع الإيقاع (' + (j + 1) + '/' + v.L + ')'; b.style.visibility = 'visible';
      const ph = ((t - v.start) % v.beat) / v.beat; b.classList.toggle('on', ph < 0.25);
      if (j !== this.lastJ) { this.lastJ = j; FZ.sfx.click(); }
    } else if (j < v.L + v.S) { tt.textContent = 'هلق لحالكن! كملوا 🤫'; b.style.visibility = 'hidden'; }
    else { tt.textContent = 'خلصنا… شو طلع معنا؟'; }
  },
  update(v) {
    this.v = v;
    if (v.res) {
      const rows = Object.entries(v.res.per).map(([pid, s]) => { const p = P(pid); return `<div class="row" style="align-items:center;margin:4px 0"><div style="flex:0 0 80px;font-weight:800;font-size:13px">${esc(p.name)}</div><div class="bar" style="flex:1"><i style="width:${s * 100}%;background:${p.color}"></i></div></div>`; }).join('');
      $('#pr', this.root).innerHTML = `<div class="card"><b>الضبط: ${Math.round(v.res.avg * 100)}% · المطلوب ${Math.round(v.res.pass * 100)}%</b>${rows}</div>`;
    }
  },
  unmount() { cancelAnimationFrame(this.raf); this.root = null; }
};

// ======================= 8. الطبلة =======================
const SOUNDS = [{ n: 'طبلة', e: '🥁' }, { n: 'دف', e: '🪘' }, { n: 'صفقة', e: '👏' }, { n: 'جرس', e: '🔔' }, { n: 'صفّارة', e: '📯' }, { n: 'مثلث', e: '🔺' }, { n: 'بيانو', e: '🎹' }, { n: 'جيتار', e: '🎸' }, { n: 'ترومبيت', e: '🎺' }, { n: 'ساكسفون', e: '🎷' }, { n: 'كمان', e: '🎻' }, { n: 'خشخيشة', e: '🪇' }];
const DRUM_SFX = [
  () => { tone(110, 0.28, 'sine', 0.8); noise(0.05, 0.2, 200); },
  () => { noise(0.18, 0.35, 3000); tone(420, 0.1, 'triangle', 0.15); },
  () => { noise(0.08, 0.6, 1200); setTimeout(() => noise(0.06, 0.35, 1500), 15); },
  () => { tone(1320, 0.6, 'sine', 0.3); tone(1980, 0.5, 'sine', 0.12); },
  () => { tone(2100, 0.25, 'square', 0.14); tone(2180, 0.25, 'square', 0.1); },
  () => { tone(2600, 0.7, 'triangle', 0.25); },
  () => { tone(523, 0.5, 'sine', 0.35); tone(1046, 0.35, 'sine', 0.1); },
  () => { tone(196, 0.35, 'sawtooth', 0.22); tone(392, 0.2, 'triangle', 0.1); },
  () => { tone(349, 0.35, 'square', 0.18); tone(698, 0.3, 'square', 0.06); },
  () => { tone(262, 0.4, 'triangle', 0.3); tone(392, 0.4, 'sawtooth', 0.06); },
  () => { tone(659, 0.55, 'sawtooth', 0.12); tone(662, 0.55, 'sawtooth', 0.08); },
  () => { noise(0.06, 0.4, 6000); setTimeout(() => noise(0.06, 0.3, 6000), 90); }
];
GM.drum = {
  icon: '🥁', short: 'كل واحد إلو أداة — عيدوا الإيقاع بالترتيب', hard: 'إيقاع أطول وبلا أرقام ولا عدّاد',
  rules: ['كل واحد إلو أداة لحاله (طبلة، دف، جرس، بيانو…) وما في أداتين متل بعض.', 'بيتعزف الإيقاع مرة — اسمعوا واحفظوا مين بعد مين.', 'بعدين عيدوه بالترتيب: كل واحد بيكبس أداته لما يجي دوره.', 'أي غلطة بترجعكن من الأول والعرض بينعاد. بالصعب ما في أرقام ولا عدّاد.'],
  mount(root, v) {
    this.root = root; this.v = v; this.seq = v.seq; this.lastK = -1;
    const mine = SOUNDS[v.mine];
    root.innerHTML = `<div class="gname" id="dt">اسمعوا 👂</div><div class="pads" id="dp">${v.sounds.map(i => `<div class="pad" data-i="${i}">${SOUNDS[i].e}</div>`).join('')}</div>
      <div class="sub" id="dd"></div>
      ${mine ? `<button class="mypad" id="dm">${mine.e}</button><div class="sub">أداتك: <b>${mine.n}</b></div>` : ''}
      ${FZ.room.hostId === FZ.me ? '<button class="btn sm" id="dr" style="max-width:200px">🔁 عيد العرض</button>' : ''}`;
    if ($('#dm', root)) $('#dm', root).onpointerdown = e => { e.preventDefault(); DRUM_SFX[v.mine](); this.lit(v.mine); inp({ a: 'hit' }); vib(20); };
    if ($('#dr', root)) $('#dr', root).onclick = () => inp({ a: 'replay' });
    const loop = () => { if (!this.root) return; this.tick(); this.raf = requestAnimationFrame(loop); }; loop();
    this.update(v);
  },
  lit(i) { const el = $(`.pad[data-i="${i}"]`, this.root); if (!el) return; el.classList.add('lit'); setTimeout(() => el.classList.remove('lit'), 240); },
  tick() {
    const v = this.v, t = sNow(), end = v.demoAt + v.pattern.length * v.step; const dt = $('#dt', this.root);
    if (t >= v.demoAt && t < end) { const k = Math.floor((t - v.demoAt) / v.step); if (k !== this.lastK) { this.lastK = k; const s = v.pattern[k]; DRUM_SFX[s](); this.lit(s); } dt.textContent = 'اسمعوا واحفظوا 👂' + (v.hideNums ? '' : ' ' + (k + 1) + '/' + v.pattern.length); }
    else if (t >= end) { dt.textContent = 'يلا! عيدوه بالترتيب 🥁'; this.lastK = -1; }
    else dt.textContent = 'استعدوا…';
  },
  update(v) {
    this.v = v;
    $('#dd', this.root).innerHTML = v.hideNums ? '' : Array.from({ length: v.pattern.length }, (_, i) => i < v.idx ? '🟢' : '⚪').join(' ');
    if (v.seq !== this.seq && v.fx) {
      if (v.fx.k === 'ok' && v.fx.who !== FZ.me) { DRUM_SFX[v.fx.snd](); this.lit(v.fx.snd); }
      if (v.fx.k === 'bad') { FZ.sfx.bad(); flash('#e5383b'); FZ.toast(`${P(v.fx.who).name} دقّ ${SOUNDS[v.fx.snd].n} — كان الدور على ${SOUNDS[v.fx.want].e} ${SOUNDS[v.fx.want].n} 🔁`); }
    }
    this.seq = v.seq;
  },
  unmount() { cancelAnimationFrame(this.raf); this.root = null; }
};


// ======================= 9. البازل المقسوم =======================
// بنك مشاهد: كل مرة مشهد مختلف بالحظ، وكل مشهد بيتلوّن ويتوزّع بشكل جديد
const PZ = {
  pal: ['#2b59ff', '#ff6b2c', '#c6f432', '#7b2ff7', '#12a36b', '#e8336d', '#ffd400', '#1aa3c9'],
  emo(c, e, x, y, s) { c.font = s + 'px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(e, x, y); },
  sky(c, r, a, b) { const g = c.createLinearGradient(0, 0, 0, 600); g.addColorStop(0, a); g.addColorStop(1, b); c.fillStyle = g; c.fillRect(0, 0, 600, 600); },
  city(c, r) {
    const night = r() > 0.5; this.sky(c, r, night ? '#121735' : '#7fb8ff', night ? '#3b2f7a' : '#ffd9a8');
    for (let i = 0; i < 40 && night; i++) { c.fillStyle = '#fff'; c.beginPath(); c.arc(r() * 600, r() * 260, 1 + r() * 2.5, 0, 7); c.fill(); }
    c.fillStyle = night ? '#f3f1ff' : '#ffd400'; c.beginPath(); c.arc(80 + r() * 440, 90, 48, 0, 7); c.fill(); c.lineWidth = 6; c.strokeStyle = '#16161d'; c.stroke();
    let x = 0, k = Math.floor(r() * 8);
    while (x < 600) { const w = 70 + r() * 50, hg = 170 + r() * 170; c.fillStyle = this.pal[k++ % 8]; c.fillRect(x, 480 - hg, w, hg); c.lineWidth = 6; c.strokeStyle = '#16161d'; c.strokeRect(x, 480 - hg, w, hg);
      for (let yy = 480 - hg + 16; yy < 460; yy += 36) for (let xx = x + 12; xx < x + w - 20; xx += 26) { c.fillStyle = r() > 0.35 ? '#ffe9a8' : '#3a3f63'; c.fillRect(xx, yy, 14, 20); c.lineWidth = 3; c.strokeRect(xx, yy, 14, 20); } x += w; }
    c.fillStyle = '#16161d'; c.fillRect(0, 480, 600, 120); c.fillStyle = '#ffd400'; for (let i = 0; i < 7; i++) c.fillRect(20 + i * 90, 535, 50, 10);
    ['🚒', '🚕', '🐈', '🎈', '🚲'].forEach((e, i) => this.emo(c, e, 60 + i * 120 + r() * 30, i === 3 ? 160 : 560, 56));
  },
  sea(c, r) {
    this.sky(c, r, '#8fd3ff', '#fff1c9'); c.fillStyle = '#ffd400'; c.beginPath(); c.arc(100 + r() * 400, 110, 55, 0, 7); c.fill(); c.lineWidth = 6; c.strokeStyle = '#16161d'; c.stroke();
    for (let i = 0; i < 7; i++) { c.fillStyle = ['#1aa3c9', '#2b59ff', '#1c3fd1', '#0f5fa8'][i % 4]; c.fillRect(0, 300 + i * 45, 600, 45); c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 4; c.beginPath(); for (let x = 0; x <= 600; x += 30) c.lineTo(x, 300 + i * 45 + Math.sin(x / 30 + i) * 6); c.stroke(); }
    const bx = 120 + r() * 300; c.fillStyle = this.pal[Math.floor(r() * 8)]; c.beginPath(); c.moveTo(bx - 90, 330); c.lineTo(bx + 90, 330); c.lineTo(bx + 60, 380); c.lineTo(bx - 60, 380); c.fill(); c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(bx, 160); c.lineTo(bx, 320); c.lineTo(bx + 80, 320); c.fill(); c.lineWidth = 5; c.stroke();
    c.fillStyle = '#e53935'; for (let i = 0; i < 5; i++) { c.fillStyle = i % 2 ? '#fff' : '#e53935'; c.fillRect(500, 150 + i * 30, 50, 30); } c.strokeRect(500, 150, 50, 150);
    ['🐟', '🐠', '🐬', '🦀', '🐙', '🕊️', '🐚'].forEach((e, i) => this.emo(c, e, 50 + r() * 500, i === 5 ? 80 + r() * 60 : 420 + r() * 150, 48));
  },
  mountain(c, r) {
    this.sky(c, r, '#a8c8ff', '#e8f1ff');
    [['#5458d8', 380], ['#7b2ff7', 430], ['#12a36b', 490]].forEach(([col, base], j) => { c.fillStyle = col; c.beginPath(); c.moveTo(0, 600); let x = 0; while (x < 600) { const w = 140 + r() * 120; c.lineTo(x + w / 2, base - 150 - r() * 120 + j * 40); c.lineTo(x + w, base); x += w; } c.lineTo(600, 600); c.fill(); c.lineWidth = 5; c.strokeStyle = '#16161d'; c.stroke(); });
    c.fillStyle = '#1aa3c9'; c.beginPath(); c.moveTo(250, 600); c.quadraticCurveTo(330, 520, 300, 470); c.lineTo(330, 470); c.quadraticCurveTo(380, 540, 360, 600); c.fill();
    c.fillStyle = '#e53935'; c.beginPath(); c.moveTo(430, 470); c.lineTo(490, 420); c.lineTo(550, 470); c.fill(); c.stroke(); c.fillStyle = '#fff3d6'; c.fillRect(445, 470, 90, 70); c.strokeRect(445, 470, 90, 70);
    ['🌲', '🌲', '🌲', '🦌', '🦅', '☁️', '⛺'].forEach((e, i) => this.emo(c, e, 40 + r() * 520, i === 4 ? 90 : i === 5 ? 60 + r() * 60 : 460 + r() * 110, 54));
  },
  space(c, r) {
    c.fillStyle = '#0b0e2a'; c.fillRect(0, 0, 600, 600); for (let i = 0; i < 120; i++) { c.fillStyle = r() > .8 ? '#c6f432' : '#fff'; c.beginPath(); c.arc(r() * 600, r() * 600, r() * 2.5, 0, 7); c.fill(); }
    for (let i = 0; i < 4; i++) { const x = 80 + r() * 440, y = 80 + r() * 440, rad = 30 + r() * 60; c.fillStyle = this.pal[(i * 3 + Math.floor(r() * 8)) % 8]; c.beginPath(); c.arc(x, y, rad, 0, 7); c.fill(); c.lineWidth = 6; c.strokeStyle = '#16161d'; c.stroke(); if (i === 1) { c.strokeStyle = '#ffd400'; c.lineWidth = 8; c.beginPath(); c.ellipse(x, y, rad * 1.7, rad * 0.4, -0.3, 0, 7); c.stroke(); } }
    ['🚀', '🛸', '👩‍🚀', '☄️', '🌙', '🛰️'].forEach(e => this.emo(c, e, 60 + r() * 480, 60 + r() * 480, 58));
  },
  garden(c, r) {
    this.sky(c, r, '#bfe7ff', '#fff'); c.fillStyle = '#12a36b'; c.fillRect(0, 320, 600, 280); c.fillStyle = '#ffd400'; c.beginPath(); c.arc(520, 90, 50, 0, 7); c.fill(); c.lineWidth = 6; c.strokeStyle = '#16161d'; c.stroke();
    for (let x = 0; x < 600; x += 40) { c.fillStyle = this.pal[(x / 40) % 8]; c.fillRect(x + 5, 260, 30, 90); c.strokeRect(x + 5, 260, 30, 90); }
    c.fillStyle = '#8b5e34'; c.fillRect(110, 140, 34, 180); c.fillStyle = '#0f766e'; c.beginPath(); c.arc(127, 130, 90, 0, 7); c.fill(); c.stroke();
    const fl = ['🌷', '🌻', '🌼', '🌹', '🌸', '🍄', '🐝', '🦋', '🐞', '🐌']; for (let i = 0; i < 14; i++) this.emo(c, fl[i % fl.length], 30 + r() * 540, 380 + r() * 200, 40 + r() * 16);
    ['🦋', '🐦'].forEach(e => this.emo(c, e, 250 + r() * 200, 100 + r() * 100, 50));
  },
  desert(c, r) {
    this.sky(c, r, '#ffb36b', '#ffe7a8'); c.fillStyle = '#fff3c9'; c.beginPath(); c.arc(150 + r() * 300, 130, 70, 0, 7); c.fill(); c.lineWidth = 6; c.strokeStyle = '#16161d'; c.stroke();
    [['#e9a518', 360], ['#d98e04', 440], ['#b5470c', 520]].forEach(([col, y]) => { c.fillStyle = col; c.beginPath(); c.moveTo(0, 600); c.lineTo(0, y); for (let x = 0; x <= 600; x += 50) c.quadraticCurveTo(x + 25, y - 40 - r() * 40, x + 50, y); c.lineTo(600, 600); c.fill(); c.stroke(); });
    c.fillStyle = '#e9c46a'; c.beginPath(); c.moveTo(380, 360); c.lineTo(470, 220); c.lineTo(560, 360); c.fill(); c.stroke();
    ['🐪', '🐫', '🌴', '🌵', '🦎', '⛺', '🏺'].forEach(e => this.emo(c, e, 50 + r() * 500, 330 + r() * 220, 56));
  },
  pitch(c, r) {
    c.fillStyle = '#2b59ff'; c.fillRect(0, 0, 600, 140); for (let i = 0; i < 160; i++) { c.fillStyle = this.pal[Math.floor(r() * 8)]; c.beginPath(); c.arc(r() * 600, 10 + r() * 120, 6, 0, 7); c.fill(); }
    for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#12a36b' : '#0f8a5a'; c.fillRect(0, 140 + i * 58, 600, 58); }
    c.strokeStyle = '#fff'; c.lineWidth = 6; c.strokeRect(30, 160, 540, 420); c.beginPath(); c.moveTo(300, 160); c.lineTo(300, 580); c.stroke(); c.beginPath(); c.arc(300, 370, 70, 0, 7); c.stroke(); c.strokeRect(30, 290, 80, 160); c.strokeRect(490, 290, 80, 160);
    ['⚽', '🏃', '🏃‍♀️', '🧤', '🏆', '📣', '🥅'].forEach(e => this.emo(c, e, 60 + r() * 480, 190 + r() * 360, 54));
  },
  table(c, r) {
    const a = this.pal[Math.floor(r() * 8)]; for (let y = 0; y < 600; y += 50) for (let x = 0; x < 600; x += 50) { c.fillStyle = (x + y) / 50 % 2 ? '#fff' : a; c.fillRect(x, y, 50, 50); }
    c.fillStyle = '#fff'; c.beginPath(); c.arc(300, 300, 150, 0, 7); c.fill(); c.lineWidth = 8; c.strokeStyle = '#16161d'; c.stroke();
    const fd = ['🍰', '☕', '🍵', '🍉', '🍇', '🥐', '🧁', '🍊', '🫖', '🍪', '🥨', '🍩']; this.emo(c, '🎂', 300, 300, 120);
    for (let i = 0; i < 11; i++) { const a2 = i / 11 * 6.28 + r(); this.emo(c, fd[i % fd.length], 300 + Math.cos(a2) * (200 + r() * 60), 300 + Math.sin(a2) * (200 + r() * 60), 54); }
  }
};
function puzzleImage(seed) {
  const r = rng(seed), cv = document.createElement('canvas'); cv.width = cv.height = 600; const c = cv.getContext('2d');
  const scenes = ['city', 'sea', 'mountain', 'space', 'garden', 'desert', 'pitch', 'table'];
  PZ[scenes[Math.floor(r() * scenes.length)]](c, r);
  return cv;
}
// قطع شكلها متل بعض بالضبط بتنحسب وحدة (متل قطع السما)
function pieceClasses(cv, side) {
  const S = 6, c = document.createElement('canvas'); c.width = c.height = side * S; const x = c.getContext('2d'); x.imageSmoothingEnabled = true; x.drawImage(cv, 0, 0, side * S, side * S);
  const d = x.getImageData(0, 0, side * S, side * S).data; const N = side * side; const vec = [];
  for (let p = 0; p < N; p++) { const px = p % side, py = Math.floor(p / side), v = []; for (let yy = 0; yy < S; yy++) for (let xx = 0; xx < S; xx++) { const i = ((py * S + yy) * side * S + px * S + xx) * 4; v.push(d[i], d[i + 1], d[i + 2]); } vec.push(v); }
  const cls = [...Array(N).keys()];
  for (let a = 0; a < N; a++) for (let b = 0; b < a; b++) { if (cls[b] !== b) continue; let diff = 0; for (let k = 0; k < vec[a].length; k++) diff += Math.abs(vec[a][k] - vec[b][k]); if (diff / vec[a].length < 3) { cls[a] = b; break; } }
  return cls;
}
GM.puzzle = {
  icon: '🧩', short: 'ركّبوا الصورة، كل واحد بيحرّك قطعه بس', hard: '49 قطعة بدل 25',
  rules: ['كل مرة صورة جديدة بالحظ، والصورة الكاملة قدّامكن فوق.', 'كل واحد معه قطع بس هو بيقدر يحرّكها — والقطعة اللي بتحطها ما حدا غيرك بيقدر يشيلها.', 'اكبس قطعة من قطعك، وبعدين اكبس مكانها بالصورة.', 'أول ما تصير الصورة صح بالشكل — نجحتوا، حتى لو قطعتين متل بعض تبدّلوا.', 'السهل والمتوسط 25 قطعة، والصعب 49.'],
  mount(root, v) {
    this.root = root; this.v = v; this.sel = null; this.seq = v.seq;
    const cv = puzzleImage(v.seed); this.img = cv.toDataURL('image/jpeg', 0.88);
    if (FZ.room && FZ.room.hostId === FZ.me) setTimeout(() => inp({ a: 'eq', cls: pieceClasses(cv, v.side) }), 50);
    root.innerHTML = `<div class="pref" id="pzr"><img src="${this.img}"><div><b>هي الصورة اللي لازم توصلولها 🎯</b><div class="sub" style="text-align:right">اكبس لتكبّرها</div></div></div>
      <div class="pboard" id="pzb" style="grid-template-columns:repeat(${v.side},1fr)"></div><div class="sub" id="pzs"></div><div class="tray${v.side > 5 ? ' small' : ''}" id="pzt"></div>`;
    $('#pzr', root).onclick = () => { const o = h(`<div style="position:fixed;inset:0;z-index:55;background:rgba(10,10,20,.8);display:grid;place-items:center" ><img src="${this.img}" style="width:min(90vw,440px);border:4px solid #fff;border-radius:14px"></div>`); o.onclick = () => o.remove(); document.body.appendChild(o); };
    this.update(v);
  },
  bg(id) { const s = this.v.side, x = id % s, y = Math.floor(id / s); return `background-image:url(${this.img});background-size:${s * 100}% ${s * 100}%;background-position:${x * 100 / (s - 1)}% ${y * 100 / (s - 1)}%`; },
  update(v) {
    this.v = v; const r = this.root; const b = $('#pzb', r); b.innerHTML = ''; const N = v.side * v.side;
    if (v.seq !== this.seq && v.fx && v.fx.k === 'taken' && v.fx.who === FZ.me) { FZ.sfx.bad(); FZ.toast('هالمكان فيه قطعة حدا تاني 🔒 — بس صاحبها بيشيلها'); }
    this.seq = v.seq;
    for (let i = 0; i < N; i++) {
      const p = v.slots[i]; const d = document.createElement('div'); const mineHere = p >= 0 && v.owners[p] === FZ.me;
      d.className = 'slot' + (p < 0 ? ' empty' : '') + (mineHere ? ' mine' : p >= 0 ? ' lock' : '') + (p >= 0 && p === this.sel ? ' sel' : '');
      if (p >= 0) d.style.cssText = this.bg(p);
      d.onclick = () => {
        if (this.sel !== null) { inp({ a: 'move', p: this.sel, slot: i }); this.sel = null; vib(15); return; }
        if (mineHere) { this.sel = p; this.update(this.v); }
      };
      b.appendChild(d);
    }
    const mine = v.owners.map((o, i) => o === FZ.me && !v.slots.includes(i) ? i : -1).filter(i => i >= 0);
    const others = v.owners.filter((o, i) => o !== FZ.me && !v.slots.includes(i)).length;
    $('#pzs', r).textContent = this.sel !== null ? 'اكبس مكانها بالصورة 👆 (أو ارجعها للصينية)' : `قطعك 👇 · عند الباقيين ${others} قطعة`;
    const t = $('#pzt', r); t.innerHTML = '';
    mine.forEach(i => { const d = h(`<div class="tp${i === this.sel ? ' sel' : ''}" style="${this.bg(i)}"></div>`); d.onclick = () => { this.sel = this.sel === i ? null : i; this.update(this.v); }; t.appendChild(d); });
    if (this.sel !== null && v.slots.includes(this.sel)) { const back = h(`<button class="btn sm">رجّعها للصينية</button>`); back.onclick = () => { inp({ a: 'move', p: this.sel, slot: -1 }); this.sel = null; }; t.appendChild(back); }
  }
};


// ======================= 10. رجّعوا الكهربا =======================
GM.power = {
  icon: '⚡', short: 'لفّوا الأسلاك ورجّعوا الكهربا للحارة', hard: 'الشبكة 6×6 بدل 4×4',
  rules: ['المولّدة ⚡ بالنص، والأسلاك مقطّعة بكل الحارة.', 'كل خانة إلها صاحب (بلونه) — بس صاحبها بيقدر يلفّها، بكبسة.', 'لفّوا الخانات لحد ما توصل الكهربا لكل الخانات وتضوي كل البيوت 💡.', 'الكل بيشتغل بنفس اللحظة. احكوا: «لفّ يلّي جنبك!»', 'السهل والمتوسط 4×4، والصعب 6×6.'],
  mount(root, v) {
    this.root = root; this.v = v;
    root.innerHTML = `<div class="sub" id="pwh"></div><canvas class="full" id="pwc" width="600" height="600" style="max-width:360px;aspect-ratio:1"></canvas><div class="row" style="align-items:center;justify-content:center;gap:6px" id="pwl"></div>`;
    const cv = $('#pwc', root); this.ctx = cv.getContext('2d');
    cv.onpointerdown = e => { e.preventDefault(); const rc = cv.getBoundingClientRect(); const G = this.v.G; const x = Math.floor((e.clientX - rc.left) / rc.width * G), y = Math.floor((e.clientY - rc.top) / rc.height * G); const i = y * G + x; if (i < 0 || i >= G * G) return; if (this.v.owners[i] !== FZ.me) { { const o = P(this.v.owners[i]); FZ.toast('هاي لـ' + o.name + ' — قلّ' + G(o, 'و', 'ا') + ' ' + G(o, 'يلفّها', 'تلفّها')); } return; } inp({ a: 'rot', i }); vib(12); tone(900, 0.04, 'square', 0.08); };
    this.update(v);
  },
  update(v) {
    this.v = v; const on = v.lit.filter(Boolean).length, N = v.G * v.G;
    $('#pwh', this.root).innerHTML = `💡 ${on}/${N} خانة فيها كهربا · خاناتك بإطار <b style="color:${P(FZ.me).color}">لونك</b>`;
    this.draw();
  },
  draw() {
    const c = this.ctx, v = this.v, G = v.G, S = 600 / G; c.clearRect(0, 0, 600, 600);
    const deg = m => (m & 1) + (m >> 1 & 1) + (m >> 2 & 1) + (m >> 3 & 1);
    for (let i = 0; i < G * G; i++) {
      const x = (i % G) * S, y = Math.floor(i / G) * S, p = P(v.owners[i]), mine = v.owners[i] === FZ.me, lit = v.lit[i];
      c.fillStyle = lit ? '#fff8d6' : '#e9e6f2'; c.fillRect(x, y, S, S);
      c.globalAlpha = mine ? 0.3 : 0.12; c.fillStyle = p.color; c.fillRect(x, y, S, S); c.globalAlpha = 1;
      c.lineWidth = mine ? 7 : 3; c.strokeStyle = mine ? p.color : '#16161d'; c.strokeRect(x + (mine ? 4 : 1), y + (mine ? 4 : 1), S - (mine ? 8 : 2), S - (mine ? 8 : 2));
      const cx = x + S / 2, cy = y + S / 2, m = v.masks[i];
      c.lineCap = 'round';
      [[1, cx, y], [2, x + S, cy], [4, cx, y + S], [8, x, cy]].forEach(([bit, ex, ey]) => { if (!(m & bit)) return; c.strokeStyle = '#16161d'; c.lineWidth = S * 0.2; c.beginPath(); c.moveTo(cx, cy); c.lineTo(ex, ey); c.stroke(); c.strokeStyle = lit ? '#ffd400' : '#6b6a75'; c.lineWidth = S * 0.11; c.beginPath(); c.moveTo(cx, cy); c.lineTo(ex, ey); c.stroke(); });
      if (i === v.src) { c.fillStyle = '#16161d'; c.beginPath(); c.arc(cx, cy, S * 0.3, 0, 7); c.fill(); c.font = (S * 0.4) + 'px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('⚡', cx, cy); }
      else if (deg(m) === 1) { c.font = (S * 0.42) + 'px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(lit ? '💡' : '🏠', cx, cy); }
      else { c.fillStyle = lit ? '#ffd400' : '#6b6a75'; c.beginPath(); c.arc(cx, cy, S * 0.09, 0, 7); c.fill(); }
    }
  }
};


// ======================= 11. برج المراقبة =======================
GM.atc = {
  icon: '✈️', short: 'نزّلوا الطيارات بلا ما يصطدموا عالمدرج', hard: 'طيارات أسرع، شباك نزول أضيق، وبنزين محدود',
  rules: ['كل واحد عنده طيارات جاية لعند المدرج من جهته.', 'لما توصل طيارتك للدايرة وتصير خضرا — اكبس «نزّل».', 'بس المدرج واحد! إذا نزلت والمدرج لسّا مشغول (أحمر) — اصطدام وخسرتوا. احكوا: «أنا نازل!»', 'إذا بكّرت أو فاتك الشباك، الطيارة بتلف لفّة وبترجع.', 'بالصعب: الطيارة اللي بتلف أكتر من مرتين بيخلص بنزينها.'],
  mount(root, v) {
    this.root = root; this.v = v; this.seq = v.seq;
    root.innerHTML = `<div class="sub" id="ath"></div><canvas class="full" id="atc" width="600" height="600" style="max-width:350px;aspect-ratio:1;background:#0b1030"></canvas>
      <button class="btn main" id="atb" style="font-size:24px;padding:18px">✈️ نزّل</button>`;
    this.ctx = $('#atc', root).getContext('2d');
    $('#atb', root).onpointerdown = e => { e.preventDefault(); inp({ a: 'land' }); vib(25); };
    const loop = () => { if (!this.root) return; this.draw(); this.raf = requestAnimationFrame(loop); }; loop();
    this.update(v);
  },
  update(v) {
    this.v = v; const myLeft = v.left[FZ.me] || 0;
    $('#ath', this.root).innerHTML = `🛬 نزل <b>${v.landed}/${v.target}</b> · باقي إلك <b>${myLeft}</b>${v.fuel !== null && v.planes[FZ.me] ? ` · لفّات طيارتك ${v.planes[FZ.me].miss}/${v.fuel}` : ''}`;
    if (v.seq !== this.seq && v.fx) {
      if (v.fx.k === 'land') { tone(520, 0.15, 'triangle', 0.2); if (v.fx.who !== FZ.me) FZ.toast(`🛬 ${P(v.fx.who).name} نزل — المدرج مشغول!`); else FZ.sfx.win(); }
      if (v.fx.k === 'early' && v.fx.who === FZ.me) { FZ.sfx.bad(); FZ.toast('بكّرت! الطيارة لفّت لفّة 🔄'); }
      if (v.fx.k === 'around' && v.fx.who === FZ.me) { FZ.sfx.bad(); FZ.toast('فاتك الشباك — الطيارة رجعت لفّت 🔄'); }
    }
    this.seq = v.seq;
  },
  draw() {
    const c = this.ctx, v = this.v, t = sNow(), C = 300, R = 270, ring = 70;
    c.clearRect(0, 0, 600, 600); c.fillStyle = '#0b1030'; c.fillRect(0, 0, 600, 600);
    c.strokeStyle = 'rgba(198,244,50,.25)'; c.lineWidth = 3; [R, R * 0.66, R * 0.33].forEach(q => { c.beginPath(); c.arc(C, C, q, 0, 7); c.stroke(); });
    const busy = t < v.busyUntil; const bk = busy ? (v.busyUntil - t) / (v.gap * 1000) : 0;
    c.fillStyle = busy ? '#e5383b' : '#12a36b'; c.fillRect(C - 90, C - 18, 180, 36); c.strokeStyle = '#fff'; c.lineWidth = 4; c.strokeRect(C - 90, C - 18, 180, 36);
    c.setLineDash([16, 12]); c.beginPath(); c.moveTo(C - 80, C); c.lineTo(C + 80, C); c.stroke(); c.setLineDash([]);
    c.fillStyle = '#fff'; c.font = '800 22px Changa'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.direction = 'rtl'; c.fillText(busy ? 'مشغول ' + Math.ceil(bk * v.gap) : 'فاضي', C, C - 40);
    if (busy) { c.strokeStyle = '#e5383b'; c.lineWidth = 8; c.beginPath(); c.arc(C, C, ring + 8, -Math.PI / 2, -Math.PI / 2 + bk * 6.283); c.stroke(); }
    c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 3; c.setLineDash([6, 8]); c.beginPath(); c.arc(C, C, ring, 0, 7); c.stroke(); c.setLineDash([]);
    v.order.forEach((pid, i) => {
      const pl = v.planes[pid]; const ang = -Math.PI / 2 + i * 6.283 / v.order.length; const p = P(pid), mine = pid === FZ.me;
      c.strokeStyle = mine ? p.color : 'rgba(255,255,255,.12)'; c.lineWidth = mine ? 4 : 2; c.beginPath(); c.moveTo(C + Math.cos(ang) * ring, C + Math.sin(ang) * ring); c.lineTo(C + Math.cos(ang) * R, C + Math.sin(ang) * R); c.stroke();
      if (!pl) return;
      const k = (t - pl.t0) / pl.A; if (k < 0) return; const inWin = k >= 1;
      const d = inWin ? ring : ring + (R - ring) * (1 - k);
      const x = C + Math.cos(ang) * d, y = C + Math.sin(ang) * d;
      if (inWin) { const left = 1 - (t - pl.t0 - pl.A) / pl.W; c.strokeStyle = '#c6f432'; c.lineWidth = 6; c.beginPath(); c.arc(x, y, 34, -Math.PI / 2, -Math.PI / 2 + Math.max(0, left) * 6.283); c.stroke(); }
      c.fillStyle = p.color; c.beginPath(); c.arc(x, y, mine ? 26 : 19, 0, 7); c.fill(); c.lineWidth = mine ? 5 : 3; c.strokeStyle = inWin ? '#c6f432' : '#fff'; c.stroke();
      c.save(); c.translate(x, y); c.rotate(ang + Math.PI); c.font = (mine ? 28 : 20) + 'px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('✈️', 0, 0); c.restore();
      c.fillStyle = '#fff'; c.font = '800 18px Cairo'; c.textAlign = 'center'; c.fillText(p.name, x, y + (mine ? 44 : 36));
    });
    const me = v.planes[FZ.me]; const btn = $('#atb', this.root);
    if (btn) { const inWin = me && t >= me.t0 + me.A; btn.classList.toggle('alt', !!inWin); btn.classList.toggle('main', !inWin); btn.textContent = !me ? '✅ خلصت طياراتك' : inWin ? (busy ? '⛔ المدرج مشغول!' : '🛬 نزّل هلّق!') : '✈️ نزّل'; btn.disabled = !me; }
  },
  unmount() { cancelAnimationFrame(this.raf); this.root = null; }
};


// ======================= 12. الإطفائية =======================
GM.fire = {
  icon: '🧯', short: 'الحارة عم تحترق — كل واحد بيطفي بنايته', hard: 'النار بتولّع أكتر وبتكبر أسرع',
  rules: ['كل واحد إلو بناية بالحارة، والنار بتولّع بكل البنايات سوا من أول ثانية.', 'اكبس عالشباك اللي عم يحترق لتطفيه — كل كبسة بتاخد مي من الخزان المشترك.', 'النار بتكبر، وإذا كبرت كتير بتنتقل للشباك اللي جنبها. كبسة عالفاضي = مي مهدورة.', 'كل شوي بتطلع حنفية عند حدا: عبّي الخزان للكل.', 'إذا شباك احترق للآخر أو خلصت المي — خسرتوا. صمدوا لآخر الوقت.'],
  mount(root, v) {
    this.root = root; root.style.justifyContent = 'flex-start';
    root.innerHTML = `<div class="city" id="fcity"></div>
      <div class="tankrow"><b>💧</b><div class="bar"><i id="ft"></i></div><b id="ftn" style="font-family:Changa;min-width:34px;text-align:center"></b></div>
      <div class="bwrap" id="fb"></div>
      <button class="btn main faucet hidden" id="fc">🚰 عبّي الخزان للكل!</button>`;
    $('#fc', root).onpointerdown = e => { e.preventDefault(); inp({ a: 'fill' }); vib(10); tone(500, 0.05, 'sine', .1); };
    this.built = ''; this.update(v);
  },
  update(v) {
    const r = this.root; if (!r) return;
    const k = v.tank / v.max; $('#ft', r).style.width = (k * 100) + '%'; $('#ft', r).style.background = k < 0.25 ? 'var(--b)' : 'var(--a)'; $('#ftn', r).textContent = Math.max(0, Math.round(v.tank));
    $('#fc', r).classList.toggle('hidden', !v.faucet);
    $('#fcity', r).innerHTML = v.city.map((b, i) => { const p = P(b.pid); const mine = v.mine.some(m => m.id === b.id); return `<div class="bmini${b.max > 70 ? ' hot' : ''}${mine ? ' me' : ''}" style="background:${p.color};height:${46 + (i * 17) % 26}px">${b.n ? `<span class="fl" style="font-size:${12 + Math.min(b.n, 6) * 3}px">🔥</span>` : ''}${esc((p.name || '؟')[0])}</div>`; }).join('');
    const sig = v.mine.map(m => m.id).join(',');
    if (this.built !== sig) {
      this.built = sig; const fb = $('#fb', r);
      fb.innerHTML = v.mine.map(m => { const p = P(FZ.me); return `<div class="building" data-b="${m.id}" style="background:${p.color}"><div class="roof">🏢 بنايتك</div>${Array.from({ length: 12 }, (_, w) => `<div class="win" data-w="${w}"></div>`).join('')}</div>`; }).join('');
      $$('.win', fb).forEach(el => el.onpointerdown = e => {
        e.preventDefault(); const id = el.dataset.f;
        if (id) { inp({ a: 'hit', id: +id }); vib(10); noise(0.05, 0.15, 2000); el.style.transform = 'scale(.9)'; setTimeout(() => el.style.transform = '', 90); }
        else { inp({ a: 'miss' }); FZ.toast('💧 هدرت مي'); }
      });
    }
    v.mine.forEach(m => {
      const bel = $(`.building[data-b="${m.id}"]`, r); if (!bel) return;
      const byW = {}; m.fires.forEach(f => byW[f.w] = f);
      $$('.win', bel).forEach((el, w) => {
        const f = byW[w];
        if (f) { el.dataset.f = f.id; el.className = 'win burn'; el.innerHTML = `<span class="f" style="font-size:${18 + f.size * 0.32}px">🔥</span>`; }
        else { delete el.dataset.f; el.className = 'win' + ((w * 7 + m.id) % 5 === 0 ? ' dark' : ''); el.innerHTML = ''; }
      });
    });
  },
  unmount() { this.root = null; }
};
