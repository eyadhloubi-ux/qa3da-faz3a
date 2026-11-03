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
  click() { tone(1500, 0.05, 'square', 0.25); }
};
const DRUM_SFX = [
  () => { tone(110, 0.25, 'sine', 0.7); noise(0.05, 0.2, 200); },
  () => { noise(0.18, 0.35, 3000); tone(420, 0.1, 'triangle', 0.15); },
  () => { noise(0.08, 0.6, 1200); setTimeout(() => noise(0.06, 0.35, 1500), 15); },
  () => { tone(1320, 0.5, 'sine', 0.3); tone(1980, 0.4, 'sine', 0.12); },
  () => { tone(2100, 0.25, 'square', 0.14); tone(2180, 0.25, 'square', 0.1); },
  () => { tone(2600, 0.6, 'triangle', 0.25); }
];
const SOUNDS = [{ n: 'طبلة', e: '🥁' }, { n: 'دف', e: '🪘' }, { n: 'صفقة', e: '👏' }, { n: 'جرس', e: '🔔' }, { n: 'صفّارة', e: '📯' }, { n: 'مثلث', e: '🔺' }];

// ---------- حساس الحركة ----------
FZ.askMotion = async () => {
  try { if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') await DeviceOrientationEvent.requestPermission(); } catch (e) {}
};

// ---------- عشوائي ثابت ----------
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

const GM = {};
FZ.GM = GM;

// ======================= 1. عدّوا سوا =======================
GM.count = {
  icon: '🔢', short: 'عدّوا للعشرين بلا ما تتفقوا',
  rules: ['كل واحد بيكبس «الرقم الجاي» بأي وقت بدو ياه — ولو ورا بعض بعُشر ثانية، عادي.', 'بس إذا كبستوا بنفس اللحظة بالضبط — من الصفر.', 'وما حدا بيكبس مرتين ورا بعض — من الصفر.', 'ممنوع تتفقوا مين بعد مين. بس إحساس.'],
  mount(root, v) {
    this.root = root; this.seq = -1;
    root.innerHTML = `<div class="bar" style="width:100%"><i id="cb" style="width:0"></i></div>
      <div class="big" id="cn">0</div><div class="sub" id="ct">من ${v.target}</div>
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
GM.keyboard = {
  icon: '⌨️', short: 'اكتبوا الجملة سوا، كل واحد معه حروف',
  rules: ['في جملة لازم تنكتب حرف حرف.', 'كل واحد على موبايله في حروف بس — وفي حروف دخيلة ما إلها دخل.', 'اللي عنده الحرف الجاي بيكبسه. احكوا مع بعض!', 'كل حرف غلط بياكل ثانيتين من الوقت.'],
  mount(root, v) {
    this.root = root; this.seq = v.seq;
    root.innerHTML = `<div class="card sentence" id="ks"></div><div class="sub">حروفك 👇</div><div class="keys" id="kk"></div>`;
    const kk = $('#kk', root);
    v.keys.forEach(ch => { const b = h(`<button class="key">${esc(ch)}</button>`); b.onpointerdown = e => { e.preventDefault(); inp({ a: 'key', ch }); vib(15); }; kk.appendChild(b); });
    this.update(v);
  },
  update(v) {
    const t = v.text; let html = '';
    for (let i = 0; i < t.length; i++) { const c = esc(t[i] === ' ' ? ' ' : t[i]); html += i < v.pos ? `<span class="d">${c}</span>` : i === v.pos ? `<span class="n">${c}</span>` : `<span class="r">${c}</span>`; }
    $('#ks', this.root).innerHTML = html;
    if (v.seq !== this.seq && v.fx) {
      if (v.fx.k === 'ok') FZ.sfx.ok();
      else { FZ.sfx.bad(); flash('#e5383b'); shake($('#ks', this.root)); FZ.toast(`${P(v.fx.who).name} كبس «${v.fx.ch}» — ناقص ثانيتين ⏳`); }
    }
    this.seq = v.seq;
  }
};

// ======================= 3. الميزان =======================
GM.balance = {
  icon: '⚖️', short: 'ميّلوا موبايلاتكن وخلّوا الطابة بالنص',
  rules: ['الطابة عالصينية بتتحرك حسب ميلان موبايلات الكل سوا.', 'والهوا عم يدفشها — لازم تعاكسوه.', 'إذا وقعت عن الصينية خسرتوا. ضلّوا لآخر الوقت.', 'إذا الميلان ما اشتغل، اسحب بإصبعك عالصينية.'],
  mount(root, v) {
    this.root = root; this.v = v; this.cur = { x: v.x, y: v.y }; this.tilt = [0, 0]; this.base = null; this.gotOri = false; this.touch = null;
    root.innerHTML = `<canvas class="full" id="bc" width="640" height="640" style="max-width:360px"></canvas><div class="sub" id="bh">ميّل موبايلك 📱</div>`;
    const cv = $('#bc', root); this.cv = cv; this.ctx = cv.getContext('2d');
    this.onOri = e => {
      if (e.beta == null) return; this.gotOri = true;
      if (!this.base) this.base = [e.gamma, e.beta];
      if (this.touch) return;
      this.tilt = [Math.max(-1, Math.min(1, (e.gamma - this.base[0]) / 25)), Math.max(-1, Math.min(1, (e.beta - this.base[1]) / 25))];
    };
    window.addEventListener('deviceorientation', this.onOri);
    const tp = e => { const r = cv.getBoundingClientRect(); const x = ((e.clientX - r.left) / r.width - 0.5) * 2, y = ((e.clientY - r.top) / r.height - 0.5) * 2; this.tilt = [Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y))]; };
    cv.onpointerdown = e => { this.touch = true; cv.setPointerCapture(e.pointerId); tp(e); };
    cv.onpointermove = e => { if (this.touch) tp(e); };
    cv.onpointerup = cv.onpointercancel = () => { this.touch = false; if (!this.gotOri) this.tilt = [0, 0]; };
    this.iv = setInterval(() => inp({ a: 'tilt', x: +this.tilt[0].toFixed(3), y: +this.tilt[1].toFixed(3) }), 100);
    setTimeout(() => { if (!this.gotOri && this.root) $('#bh', root).textContent = 'اسحب إصبعك عالصينية لتميّل 👆'; }, 1500);
    const loop = () => { if (!this.root) return; this.draw(); this.raf = requestAnimationFrame(loop); }; loop();
  },
  update(v) { this.v = v; },
  draw() {
    const c = this.ctx, W = 640, v = this.v, cs = getComputedStyle(document.documentElement);
    this.cur.x += (v.x - this.cur.x) * 0.35; this.cur.y += (v.y - this.cur.y) * 0.35;
    c.clearRect(0, 0, W, W); const R = 280, cx = 320, cy = 320;
    c.fillStyle = cs.getPropertyValue('--screen'); c.beginPath(); c.arc(cx, cy, R + 10, 0, 7); c.fill();
    c.lineWidth = 8; c.strokeStyle = '#16161d'; c.stroke();
    c.strokeStyle = 'rgba(198,244,50,.35)'; c.lineWidth = 3; [0.33, 0.66].forEach(k => { c.beginPath(); c.arc(cx, cy, R * k, 0, 7); c.stroke(); });
    // هوا
    const wl = Math.hypot(v.wx, v.wy); if (wl > 0) { c.save(); c.translate(cx, cy); c.rotate(Math.atan2(v.wy, v.wx)); c.fillStyle = 'rgba(255,107,44,.85)'; const L = 60 + wl * 90; c.fillRect(-L / 2, -7, L, 14); c.beginPath(); c.moveTo(L / 2 + 22, 0); c.lineTo(L / 2, -20); c.lineTo(L / 2, 20); c.fill(); c.restore(); c.fillStyle = '#fff'; c.font = '700 26px Changa'; c.textAlign = 'center'; c.fillText('💨 هوا', cx, 50); }
    // ميلاني
    c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.arc(cx + this.tilt[0] * R, cy + this.tilt[1] * R, 18, 0, 7); c.fill();
    // الطابة
    const bx = cx + this.cur.x * R, by = cy + this.cur.y * R, d = Math.hypot(this.cur.x, this.cur.y);
    c.fillStyle = d > 0.75 ? '#ff6b2c' : '#c6f432'; c.beginPath(); c.arc(bx, by, 34, 0, 7); c.fill(); c.lineWidth = 7; c.strokeStyle = '#16161d'; c.stroke();
  },
  unmount() { window.removeEventListener('deviceorientation', this.onOri); clearInterval(this.iv); cancelAnimationFrame(this.raf); this.root = null; }
};

// ======================= 4. البرج =======================
GM.tower = {
  icon: '🏗️', short: 'ابنوا البرج بالدور لـ12 طابق',
  rules: ['بالدور، كل واحد بينزّل طابق فوق البرج.', 'الطابق عم يتمرجح — اكبس لما يكون فوق البرج بالضبط.', 'اللي بيطلع برّا بينقصّ، والطابق بيصغر.', 'إذا ما ركب أبداً، البرج بيوقع وبترجعوا من الأول. لازم 12 طابق.'],
  mount(root, v) {
    this.root = root; this.v = v; this.seq = v.seq; this.dropping = false;
    root.innerHTML = `<div class="hud" style="width:100%"><div id="tw" class="taunt" style="flex:1"></div><div class="timer" id="tn" style="min-width:64px">0/${v.target}</div></div>
      <canvas class="full" id="tc" width="600" height="760" style="max-width:340px"></canvas>`;
    const cv = $('#tc', root); this.ctx = cv.getContext('2d');
    cv.onpointerdown = e => { e.preventDefault(); if (this.v.turnPid !== FZ.me || this.dropping) return; this.dropping = true; inp({ a: 'drop', x: +this.swingX().toFixed(4) }); vib(25); };
    const loop = () => { if (!this.root) return; this.draw(); this.raf = requestAnimationFrame(loop); }; loop();
    this.update(v);
  },
  swingX() { const v = this.v; return Math.sin((sNow() - v.swingAt) / 1000 * v.speed) * 0.55; },
  update(v) {
    this.v = v; this.dropping = false; const p = P(v.turnPid); const mine = v.turnPid === FZ.me;
    $('#tw', this.root).innerHTML = mine ? `<b style="color:var(--b)">دورك! اكبس عالبرج 👇</b>` : `الدور على <b style="color:${p.color}">${esc(p.name)}</b>`;
    $('#tn', this.root).textContent = (v.blocks.length - 1) + '/' + v.target;
    if (v.seq !== this.seq && v.fx) {
      if (v.fx.k === 'fall') { FZ.sfx.lose(); flash('#e5383b'); FZ.toast('البرج وقع! من الأول 😬'); }
      else if (v.fx.p) { FZ.sfx.win(); FZ.toast('بالضبط! 🎯'); } else FZ.sfx.ok();
      if (mine) vib(60);
    }
    this.seq = v.seq;
  },
  draw() {
    const c = this.ctx, v = this.v, W = 600, H = 760, BH = 44, cs = getComputedStyle(document.documentElement);
    c.clearRect(0, 0, W, H); const n = v.blocks.length; const show = 11; const off = Math.max(0, n - show);
    const X = x => W / 2 + x * (W / 2) * 0.95; const Y = i => H - 40 - (i - off + 1) * BH;
    c.fillStyle = cs.getPropertyValue('--screen'); c.fillRect(0, H - 40, W, 40);
    v.blocks.forEach((b, i) => { if (i < off) return; c.fillStyle = i === 0 ? '#16161d' : (b.p ? '#c6f432' : ['#2b59ff', '#ff6b2c', '#7b2ff7', '#12a36b'][i % 4]); const x0 = X(b.x - b.w / 2), x1 = X(b.x + b.w / 2); c.fillRect(x0, Y(i), x1 - x0, BH - 4); c.lineWidth = 4; c.strokeStyle = '#16161d'; c.strokeRect(x0, Y(i), x1 - x0, BH - 4); });
    const top = v.blocks[n - 1]; const sx = this.swingX(); const p = P(v.turnPid);
    const x0 = X(sx - top.w / 2), x1 = X(sx + top.w / 2), y = Y(n) - 30;
    c.globalAlpha = .25; c.fillStyle = p.color; c.fillRect(x0, Y(n), x1 - x0, BH - 4); c.globalAlpha = 1;
    c.fillStyle = p.color; c.fillRect(x0, y, x1 - x0, BH - 4); c.lineWidth = 4; c.strokeStyle = '#16161d'; c.strokeRect(x0, y, x1 - x0, BH - 4);
    c.fillStyle = '#fff'; c.font = '800 24px Changa'; c.textAlign = 'center'; c.fillText(p.name, (x0 + x1) / 2, y + 30);
  },
  unmount() { cancelAnimationFrame(this.raf); this.root = null; }
};

// ======================= 5. عبّوا الكاسة =======================
GM.glass = {
  icon: '🥛', short: 'الكاسة مخزوقة — عبّوها للخط وضلّوا عليه',
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
  icon: '🌉', short: 'حطوا الألواح قدّام الراكض بوقتها',
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

// ======================= 7. فكّ القنبلة =======================
const WC = { red: ['أحمر', '#e53935'], blue: ['أزرق', '#2b59ff'], yellow: ['أصفر', '#ffd400'], white: ['أبيض', '#ffffff'], black: ['أسود', '#16161d'] };
const PAGES = {
  w3: ['🧵 3 شرايط', ['إذا ما في ولا شريط أحمر ← قصّ التاني.', 'غير هيك، إذا آخر شريط أبيض ← قصّ الأخير.', 'غير هيك، إذا في أكتر من شريط أزرق ← قصّ آخر واحد أزرق.', 'غير هيك ← قصّ الأخير.']],
  w4: ['🧵 4 شرايط', ['إذا في أكتر من شريط أحمر ← قصّ آخر واحد أحمر.', 'غير هيك، إذا آخر شريط أصفر وما في ولا أحمر ← قصّ الأول.', 'غير هيك، إذا في شريط أزرق واحد بالضبط ← قصّ الأول.', 'غير هيك، إذا في أكتر من أصفر ← قصّ الأخير.', 'غير هيك ← قصّ التاني.']],
  w5: ['🧵 5 شرايط', ['إذا آخر شريط أسود ← قصّ الرابع.', 'غير هيك، إذا في أحمر واحد بالضبط وأكتر من أصفر ← قصّ الأول.', 'غير هيك، إذا ما في ولا أسود ← قصّ التاني.', 'غير هيك ← قصّ الأول.']],
  btn: ['🔴 الزر الكبير', ['إذا الزر أزرق ومكتوب عليه «وقّف» ← مطوّلة.', 'غير هيك، إذا الزر أبيض ← كبسة وحدة.', 'غير هيك، إذا مكتوب «فجّر» ← كبسة وحدة.', 'غير هيك، إذا الزر أحمر ومكتوب «اضغط» ← كبسة وحدة.', 'غير هيك ← مطوّلة.', '— المطوّلة: لما يضل كابس بيطلع شريط ملوّن: أزرق ← فلّت لما يكون بالمؤقت رقم 4 · أصفر ← رقم 5 · غير هيك ← رقم 1.']]
};
GM.bomb = {
  icon: '💣', short: 'واحد شايف القنبلة والباقي معهم الدليل',
  rules: ['واحد منكن بيشوف القنبلة، والباقي كل واحد معه صفحات من دليل الفك.', 'الحكي مسموح! اللي شايف القنبلة بيوصف، واللي معه الدليل بيقلّه شو يعمل.', 'فيها 3 أقسام: شرايط، زر كبير، ورموز. لازم تخلصوهن كلهن.', '3 غلطات أو خلص الوقت = القنبلة بتفقع.', 'الشرايط بتنعدّ من فوق لتحت.'],
  mount(root, v) { this.root = root; this.seq = v.seq; this.role = v.role; this.built = false; root.style.alignItems = 'stretch'; this.update(v); },
  update(v) {
    const r = this.root;
    if (v.seq !== this.seq && v.fx) { if (v.fx.k === 'strike') { FZ.sfx.bad(); flash('#e5383b'); vib([80, 50, 80]); FZ.toast('❌ ' + v.fx.why); } else FZ.sfx.win(); }
    this.seq = v.seq;
    const strikes = `<div class="hud"><div class="strikes">${'❌'.repeat(v.strikes)}${'⬜'.repeat(3 - v.strikes)}</div><div class="sub">${v.done.w ? '✅' : '⬜'} شرايط · ${v.done.b ? '✅' : '⬜'} زر · ${v.done.s ? '✅' : '⬜'} رموز</div></div>`;
    if (v.role === 'reader') {
      const d = P(v.def);
      let html = strikes + `<div class="screenbox">📟 القنبلة مع <b>${esc(d.name)}</b> — اسمع ${G(d, 'وصفه', 'وصفها')} وقلّ${G(d, 'و', 'ا')} شو ${G(d, 'يعمل', 'تعمل')}</div>`;
      v.pages.forEach(pg => {
        if (PAGES[pg]) html += `<div class="page"><h4>${PAGES[pg][0]}</h4><ol>${PAGES[pg][1].map(x => `<li>${x}</li>`).join('')}</ol></div>`;
        else { const cols = pg === 'symA' ? [0, 1, 2] : [3, 4, 5]; html += `<div class="page"><h4>🔣 الرموز (أعمدة ${pg === 'symA' ? '1-3' : '4-6'})</h4><p>دوّر العمود اللي فيه الرموز الأربعة كلها، واكبسوهن بترتيب العمود من فوق لتحت.</p><div class="cols">${cols.map(i => `<div>${v.cols[i].join('<br>')}</div>`).join('')}</div></div>`; }
      });
      r.innerHTML = html; r.style.justifyContent = 'flex-start'; return;
    }
    if (!this.built) {
      this.built = true; r.style.justifyContent = 'flex-start';
      r.innerHTML = `<div id="bs"></div><div class="screenbox">💣 القنبلة معك! وصفها للقعدة، هنن معهم الدليل.</div>
        <div class="mod" id="mw"><h4>🧵 الشرايط <span></span></h4><div id="wl"></div></div>
        <div class="mod" id="mb"><h4>🔴 الزر الكبير <span></span></h4><button class="bbtn" id="bb"></button><div class="strip hidden" id="bstr"></div><div class="sub">كبسة وحدة؟ ولا مطوّلة؟</div></div>
        <div class="mod" id="mz"><h4>🔣 الرموز <span></span></h4><div class="syms" id="sy"></div></div>`;
      const bb = $('#bb', r); let tm = null, held = false;
      bb.onpointerdown = e => { e.preventDefault(); bb.setPointerCapture(e.pointerId); held = false; tm = setTimeout(() => { held = true; inp({ a: 'hold' }); vib(40); }, 450); };
      const up = () => { if (tm) clearTimeout(tm); tm = null; if (held) inp({ a: 'release' }); else inp({ a: 'press' }); held = false; };
      bb.onpointerup = up; bb.onpointercancel = () => { if (tm) clearTimeout(tm); if (held) inp({ a: 'release' }); held = false; };
    }
    $('#bs', r).innerHTML = strikes;
    $('#wl', r).innerHTML = v.wires.map((w, i) => `<div class="wire${v.cut[i] ? ' cut' : ''}" data-i="${i}" style="background:${WC[w][1]}"></div>`).join('');
    $$('.wire', r).forEach(el => el.onclick = () => { if (!v.done.w && !el.classList.contains('cut')) { inp({ a: 'cut', i: +el.dataset.i }); vib(30); } });
    $('#mw', r).classList.toggle('done', v.done.w); $('#mb', r).classList.toggle('done', v.done.b); $('#mz', r).classList.toggle('done', v.done.s);
    const bb = $('#bb', r); bb.style.background = WC[v.btn.color][1]; bb.style.color = v.btn.color === 'white' || v.btn.color === 'yellow' ? '#16161d' : '#fff'; bb.textContent = v.btn.word; bb.disabled = v.done.b;
    const st = $('#bstr', r); if (v.btn.holding && v.btn.strip) { st.classList.remove('hidden'); st.style.background = WC[v.btn.strip][1]; } else st.classList.add('hidden');
    $('#sy', r).innerHTML = v.shown.map((s, i) => `<button class="sym${v.symPressed.includes(i) ? ' on' : ''}" data-k="${i}">${s}</button>`).join('');
    $$('.sym', r).forEach(el => el.onclick = () => { if (!v.done.s) { inp({ a: 'sym', k: +el.dataset.k }); vib(20); } });
  }
};

// ======================= 8. النبض =======================
GM.pulse = {
  icon: '💓', short: 'كملوا الإيقاع بعد ما يسكت',
  rules: ['بيشتغل إيقاع 8 دقّات — دقّوا معه.', 'بعدين بيسكت… وكلكن لازم تكملوا تدقّوا عنفس الإيقاع.', 'السهل 8 دقّات بالسكوت، والصعب 16.', 'لازم القعدة كلها تكون مضبوطة 60% عالأقل.'],
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
      $('#pr', this.root).innerHTML = `<div class="card"><b>الضبط: ${Math.round(v.res.avg * 100)}%</b>${rows}</div>`;
    }
  },
  unmount() { cancelAnimationFrame(this.raf); this.root = null; }
};

// ======================= 9. الطبلة =======================
GM.drum = {
  icon: '🥁', short: 'كل واحد صوت — عيدوا الإيقاع بالترتيب',
  rules: ['كل واحد معه صوت واحد بس (طبلة، دف، صفقة، جرس…).', 'بيتعزف إيقاع مرة وحدة — احفظوه!', 'بعدين عيدوه بالترتيب: كل واحد بيكبس صوته لما يجي دوره.', 'أي غلطة بترجعكن من الأول والعرض بينعاد. إذا كنتوا أكتر من 6، اتنين بيتشاركوا الصوت.'],
  mount(root, v) {
    this.root = root; this.v = v; this.seq = v.seq; this.lastK = -1;
    const mine = SOUNDS[v.mine];
    root.innerHTML = `<div class="gname" id="dt">اسمعوا 👂</div><div class="pads" id="dp">${SOUNDS.slice(0, v.K).map((s, i) => `<div class="pad" data-i="${i}">${s.e}</div>`).join('')}</div>
      <div class="sub" id="dd"></div>
      ${mine ? `<button class="mypad" id="dm">${mine.e}</button><div class="sub">صوتك: <b>${mine.n}</b></div>` : ''}
      ${FZ.room.hostId === FZ.me ? '<button class="btn sm" id="dr" style="max-width:200px">🔁 عيد العرض</button>' : ''}`;
    if ($('#dm', root)) $('#dm', root).onpointerdown = e => { e.preventDefault(); DRUM_SFX[v.mine](); this.lit(v.mine); inp({ a: 'hit' }); vib(20); };
    if ($('#dr', root)) $('#dr', root).onclick = () => inp({ a: 'replay' });
    const loop = () => { if (!this.root) return; this.tick(); this.raf = requestAnimationFrame(loop); }; loop();
    this.update(v);
  },
  lit(i) { const el = $(`.pad[data-i="${i}"]`, this.root); if (!el) return; el.classList.add('lit'); setTimeout(() => el.classList.remove('lit'), 220); },
  tick() {
    const v = this.v, t = sNow(), end = v.demoAt + v.pattern.length * v.step;
    if (t >= v.demoAt && t < end) { const k = Math.floor((t - v.demoAt) / v.step); if (k !== this.lastK) { this.lastK = k; const s = v.pattern[k]; DRUM_SFX[s](); this.lit(s); } $('#dt', this.root).textContent = 'اسمعوا واحفظوا 👂 ' + (k + 1) + '/' + v.pattern.length; }
    else if (t >= end) { $('#dt', this.root).textContent = 'يلا! عيدوه بالترتيب 🥁'; this.lastK = -1; }
    else $('#dt', this.root).textContent = 'استعدوا…';
  },
  update(v) {
    this.v = v;
    $('#dd', this.root).innerHTML = Array.from({ length: v.pattern.length }, (_, i) => i < v.idx ? '🟢' : '⚪').join(' ');
    if (v.seq !== this.seq && v.fx) {
      if (v.fx.k === 'ok' && v.fx.who !== FZ.me) { DRUM_SFX[v.fx.snd](); this.lit(v.fx.snd); }
      if (v.fx.k === 'bad') { FZ.sfx.bad(); flash('#e5383b'); FZ.toast(`${P(v.fx.who).name} دقّ بغير وقته — من الأول 🔁`); }
    }
    this.seq = v.seq;
  },
  unmount() { cancelAnimationFrame(this.raf); this.root = null; }
};

// ======================= 10. البازل المقسوم =======================
function puzzleImage(seed) {
  // مشهد «الحارة» — كل قطعة فيها شي مميز لتتعرفوا عليها
  const r = rng(seed), cv = document.createElement('canvas'); cv.width = cv.height = 500; const c = cv.getContext('2d');
  const night = r() > 0.5;
  const sky = c.createLinearGradient(0, 0, 0, 330); sky.addColorStop(0, night ? '#121735' : '#7fb8ff'); sky.addColorStop(1, night ? '#3b2f7a' : '#ffd9a8'); c.fillStyle = sky; c.fillRect(0, 0, 500, 500);
  for (let i = 0; i < 30 && night; i++) { c.fillStyle = '#fff'; c.beginPath(); c.arc(r() * 500, r() * 200, 1 + r() * 2.5, 0, 7); c.fill(); }
  c.fillStyle = night ? '#f3f1ff' : '#ffd400'; c.beginPath(); c.arc(90 + r() * 320, 80, 42, 0, 7); c.fill(); c.lineWidth = 6; c.strokeStyle = '#16161d'; c.stroke();
  c.fillStyle = '#fff'; [[60, 150], [330, 120]].forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 22, 0, 7); c.arc(x + 26, y - 10, 28, 0, 7); c.arc(x + 56, y, 22, 0, 7); c.fill(); });
  const pal = ['#2b59ff', '#ff6b2c', '#c6f432', '#7b2ff7', '#12a36b', '#e8336d'];
  let x = 0; let k = 0;
  while (x < 500) { const w = 70 + r() * 40, hgt = 150 + r() * 130, col = pal[k++ % pal.length];
    c.fillStyle = col; c.fillRect(x, 400 - hgt, w, hgt); c.lineWidth = 6; c.strokeStyle = '#16161d'; c.strokeRect(x, 400 - hgt, w, hgt);
    for (let yy = 400 - hgt + 16; yy < 380; yy += 34) for (let xx = x + 12; xx < x + w - 20; xx += 26) { c.fillStyle = r() > 0.35 ? '#ffe9a8' : '#3a3f63'; c.fillRect(xx, yy, 14, 18); c.lineWidth = 3; c.strokeRect(xx, yy, 14, 18); }
    x += w; }
  c.fillStyle = '#16161d'; c.fillRect(0, 400, 500, 100); c.fillStyle = '#ffd400'; for (let i = 0; i < 6; i++) c.fillRect(20 + i * 85, 445, 50, 10);
  c.fillStyle = '#ff6b2c'; c.save(); c.translate(250, 225); c.rotate(-0.08); c.fillRect(-120, -48, 240, 90); c.lineWidth = 8; c.strokeRect(-120, -48, 240, 90); c.fillStyle = '#fff'; c.font = '800 66px Changa'; c.textAlign = 'center'; c.direction = 'rtl'; c.fillText('فزعة', 0, 24); c.restore();
  c.fillStyle = '#16161d'; c.save(); c.translate(250, 160); c.rotate(0.05); c.fillRect(-62, -26, 124, 46); c.fillStyle = '#fff'; c.font = '800 34px Changa'; c.textAlign = 'center'; c.direction = 'rtl'; c.fillText('قعدة', 0, 10); c.restore();
  c.font = '54px serif'; c.textAlign = 'center'; [['🚒', 110, 470], ['🧯', 400, 470], ['🔥', 60, 330], ['💧', 440, 330], ['🎈', 450, 60], ['🐈', 250, 480]].forEach(([e, xx, yy]) => c.fillText(e, xx, yy));
  return cv.toDataURL('image/jpeg', 0.88);
}
GM.puzzle = {
  icon: '🧩', short: 'ركّبوا الصورة، كل واحد بيحرّك قطعه بس',
  rules: ['صورة وحدة مقسومة 25 قطعة، والصورة الكاملة قدّامكن فوق لتعرفوا لوين لازم توصلوا.', 'كل واحد معه قطع بس هو بيقدر يحرّكها.', 'اكبس قطعة من قطعك، وبعدين اكبس مكانها بالصورة.', 'احكوا مع بعض: «هاد طرف الدايرة، إلك؟»', 'لازم الصورة تكمل قبل ما يخلص الوقت.'],
  mount(root, v) {
    this.root = root; this.v = v; this.sel = null; this.img = puzzleImage(v.seed);
    root.innerHTML = `<div class="pref" id="pzr"><img src="${this.img}"><div><b>هي الصورة اللي لازم توصلولها 🎯</b><div class="sub" style="text-align:right">اكبس لتكبّرها</div></div></div>
      <div class="pboard" id="pzb"></div><div class="sub" id="pzs"></div><div class="tray" id="pzt"></div>`;
    $('#pzr', root).onclick = () => { const o = h(`<div style="position:fixed;inset:0;z-index:55;background:rgba(10,10,20,.8);display:grid;place-items:center" ><img src="${this.img}" style="width:min(90vw,420px);border:4px solid #fff;border-radius:14px"></div>`); o.onclick = () => o.remove(); document.body.appendChild(o); };
    this.update(v);
  },
  bg(id) { const x = id % 5, y = Math.floor(id / 5); return `background-image:url(${this.img});background-position:${x * 25}% ${y * 25}%`; },
  update(v) {
    this.v = v; const r = this.root; const b = $('#pzb', r); b.innerHTML = '';
    for (let i = 0; i < 25; i++) {
      const p = v.slots[i]; const d = document.createElement('div'); d.className = 'slot' + (p < 0 ? ' empty' : '') + (p >= 0 && v.owners[p] === FZ.me ? ' mine' : '') + (p >= 0 && p === this.sel ? ' sel' : '');
      if (p >= 0) d.style.cssText = this.bg(p);
      d.onclick = () => {
        if (this.sel !== null) { inp({ a: 'move', p: this.sel, slot: i }); this.sel = null; vib(15); return; }
        if (p >= 0 && v.owners[p] === FZ.me) { this.sel = p; this.update(this.v); }
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

// ======================= 11. تويستر الأصابع =======================
GM.twister = {
  icon: '🖐️', short: 'أصابعكن كلها على موبايل واحد',
  rules: ['موبايل واحد عالطاولة (موبايل الريس)، وكل لاعب إلو دايرة بلونه.', 'حط إصبعك على دايرتك وضلّك حاطه.', 'كل شوي دايرة حدا بتنقل لمكان جديد — بسرعة حط إصبعك عليها.', 'إذا دايرة ضلت فاضية أكتر من ثانية — خسرتوا. 6 لاعبين بالأكتر والباقي مراقبين.'],
  mount(root, v) {
    this.root = root; this.v = v;
    if (v.table !== FZ.me) {
      const t = P(v.table), me = P(FZ.me), mine = v.act.includes(FZ.me);
      root.innerHTML = mine ? `<div class="spect"><div style="width:150px;height:150px;border-radius:50%;margin:0 auto 16px;border:4px solid var(--line);background:${me.color};box-shadow:6px 6px 0 var(--sh)"></div>
        <h2 class="t">روح لعند موبايل ${esc(t.name)} 🏃</h2><p class="sub">حط إصبعك عالدايرة اللي بلونك وضلّك حاطه</p></div>`
        : `<div class="spect"><div class="e">👀</div><h2 class="t">تفرّج عالفوضى</h2></div>`;
      return;
    }
    const ov = h(`<div id="twist"><canvas></canvas></div>`); document.body.appendChild(ov); this.ov = ov;
    const cv = $('canvas', ov); const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = innerWidth, H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; const c = cv.getContext('2d'); c.scale(dpr, dpr);
    this.pts = new Map(); const put = e => this.pts.set(e.pointerId, [e.clientX, e.clientY]);
    cv.addEventListener('pointerdown', e => { e.preventDefault(); put(e); });
    cv.addEventListener('pointermove', e => { if (this.pts.has(e.pointerId)) put(e); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(n => cv.addEventListener(n, e => this.pts.delete(e.pointerId)));
    const R = Math.min(52, W / 8); const rand = rng(v.seed);
    const spot = () => { for (let k = 0; k < 40; k++) { const x = R + 10 + rand() * (W - 2 * R - 20), y = 90 + R + rand() * (H - 2 * R - 140); if (this.circles.every(o => Math.hypot(o.x - x, o.y - y) > R * 2.4)) return [x, y]; } return [W / 2, H / 2]; };
    this.circles = []; const t0 = Date.now();
    v.act.forEach(pid => { const [x, y] = spot(); this.circles.push({ pid, x, y, born: t0, grace: 4500, cov: false, lost: 0 }); });
    this.nextMove = t0 + 5000; this.failed = false; let lastMoved = null;
    const loop = () => {
      if (!this.root) return; const t = Date.now();
      if (t >= this.nextMove && this.circles.length) {
        const cand = this.circles.filter(o => o.pid !== lastMoved); const o = cand[Math.floor(rand() * cand.length)] || this.circles[0]; lastMoved = o.pid;
        const old = [o.x, o.y]; o.x = -999; const [x, y] = spot(); o.x = x; o.y = y; o.born = t; o.grace = 2200; o.cov = false; o.lost = 0; o.from = old;
        tone(700, 0.12, 'triangle', 0.2); this.nextMove = t + 2400 + rand() * 900;
      }
      c.clearRect(0, 0, W, H); const cs = getComputedStyle(document.documentElement);
      c.fillStyle = cs.getPropertyValue('--bg'); c.fillRect(0, 0, W, H);
      c.fillStyle = cs.getPropertyValue('--txt'); c.font = '800 20px Changa'; c.textAlign = 'center'; c.fillText('🖐️ ما حدا يشيل إصبعه!', W / 2, 40);
      const left = Math.max(0, Math.ceil(((FZ.endsAt || 0) - sNow()) / 1000)); c.font = '800 26px Changa'; c.fillStyle = '#ff6b2c'; c.fillText('⏱ ' + Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0'), W / 2, 74);
      for (const o of this.circles) {
        const covered = [...this.pts.values()].some(([x, y]) => Math.hypot(x - o.x, y - o.y) < R * 1.15);
        if (covered) { o.cov = true; o.lost = 0; } else if (o.cov && !o.lost) o.lost = t;
        const inGrace = t - o.born < o.grace; let bad = false;
        if (!covered && !inGrace && !o.cov) bad = true;
        if (o.lost && t - o.lost > 1000) bad = true;
        if (bad && !this.failed) { this.failed = true; inp({ a: 'fail', who: o.pid }); FZ.sfx.lose(); }
        const p = P(o.pid);
        c.beginPath(); c.arc(o.x, o.y, R, 0, 7); c.fillStyle = p.color; c.globalAlpha = covered ? 1 : 0.55 + 0.45 * Math.abs(Math.sin(t / 150)); c.fill(); c.globalAlpha = 1;
        c.lineWidth = covered ? 8 : 5; c.strokeStyle = covered ? '#c6f432' : '#16161d'; c.stroke();
        if (!covered && (inGrace || o.lost)) { const left = o.lost ? 1 - (t - o.lost) / 1000 : 1 - (t - o.born) / o.grace; c.beginPath(); c.arc(o.x, o.y, R + 10, -Math.PI / 2, -Math.PI / 2 + left * 6.283); c.lineWidth = 6; c.strokeStyle = '#ff6b2c'; c.stroke(); }
        c.fillStyle = '#fff'; c.font = '800 18px Cairo'; c.fillText(p.name, o.x, o.y + 6);
      }
      this.raf = requestAnimationFrame(loop);
    }; loop();
  },
  update(v) { this.v = v; if (this.circles) this.circles = this.circles.filter(o => v.act.includes(o.pid)); },
  unmount() { cancelAnimationFrame(this.raf); if (this.ov) this.ov.remove(); this.ov = null; this.root = null; }
};

// ======================= 12. الإطفائية =======================
GM.fire = {
  icon: '🧯', short: 'الحارة عم تحترق — كل واحد بيطفي بنايته',
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
