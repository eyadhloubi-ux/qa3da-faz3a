// قعدة فزعة — التطبيق
// إعداد م. إياد حلوبي · @eyad.hloubi
'use strict';
const IG = 'https://instagram.com/eyad.hloubi';
const S = { ws: null, room: null, me: null, code: null, local: 'home', g: null, gkey: null, endsAt: 0, spectator: false, mounted: null, screenKey: '', taunt: '', join: {} };
FZ.photos = {}; FZ.gphoto = null;
const LS = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }, del(k) { try { localStorage.removeItem(k); } catch (e) {} } };
const app = $('#app');

// ---------- ثيم ----------
(function () { const t = LS.get('fz_theme'); if (t) document.documentElement.dataset.theme = t; $('#bTheme').textContent = t === 'dark' ? '☀️' : '🌙'; })();
$('#bTheme').onclick = () => { const d = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = d; LS.set('fz_theme', d); $('#bTheme').textContent = d === 'dark' ? '☀️' : '🌙'; };

// ---------- توست ومودال ----------
let toastT; FZ.toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2400); };
function modal(html, onMount) { $('#mBody').innerHTML = html; $('#modal').hidden = false; if (onMount) onMount($('#mBody')); }
function closeModal() { $('#modal').hidden = true; $('#mBody').innerHTML = ''; }
$('#mClose').onclick = closeModal; $('#modal').onclick = e => { if (e.target.id === 'modal') closeModal(); };
function confirmBox(msg, yes, cb) { modal(`<h2 class="t" style="margin:20px 0 14px">${msg}</h2><div class="row"><button class="btn warn" id="cy">${yes}</button><button class="btn" id="cn">لأ</button></div>`, b => { $('#cy', b).onclick = () => { closeModal(); cb(); }; $('#cn', b).onclick = closeModal; }); }

// ---------- الاتصال ----------
FZ.send = m => { if (S.ws && S.ws.readyState === 1) S.ws.send(JSON.stringify(m)); };
let offs = [];
function connect() {
  const ws = new WebSocket(location.origin.replace(/^http/, 'ws')); S.ws = ws;
  ws.onopen = () => {
    offs = []; for (let i = 0; i < 5; i++) setTimeout(() => FZ.send({ t: 'ping', c: Date.now() }), i * 250);
    const ss = LS.get('fz_session'); if (ss && ss.code && ss.pid) FZ.send({ t: 'rejoin', code: ss.code, pid: ss.pid });
  };
  ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (er) { return; } onMsg(m); };
  ws.onclose = () => { setTimeout(connect, 1500); };
}
setInterval(() => FZ.send({ t: 'ping', c: Date.now() }), 15000);
function onMsg(m) {
  switch (m.t) {
    case 'pong': { const rtt = Date.now() - m.c; offs.push({ rtt, off: m.s - (m.c + rtt / 2) }); offs.sort((a, b) => a.rtt - b.rtt); FZ.off = offs[0].off; if (offs.length > 8) offs.length = 8; break; }
    case 'you': S.me = FZ.me = m.pid; S.code = m.code; LS.set('fz_session', { code: m.code, pid: m.pid }); break;
    case 'room': S.room = FZ.room = m.room; render(); break;
    case 'photo': if (m.data) FZ.photos[m.pid] = m.data; else delete FZ.photos[m.pid]; if (S.room && S.room.phase !== 'play') render(); break;
    case 'gphoto': FZ.gphoto = m.data; if (S.room && S.room.phase === 'final') render(); break;
    case 'g': onGame(m); break;
    case 'err':
      if (m.code === 'gone') { LS.del('fz_session'); S.room = FZ.room = null; S.local = 'home'; render(); }
      else FZ.toast(m.m); break;
    case 'kicked': LS.del('fz_session'); S.room = FZ.room = null; S.local = 'home'; render(); FZ.toast('الريس طلّعك من القعدة'); break;
    case 'replaced': break;
  }
}

// ---------- أدوات ----------
const G2 = (p, m, f) => (p && p.g === 'f' ? f : m);
const meP = () => S.room && S.room.players.find(p => p.id === S.me);
const isHost = () => S.room && S.room.hostId === S.me;
const pName = id => { const p = S.room && S.room.players.find(x => x.id === id); return p ? p.name : ''; };
function heartsHTML(n) { return [0, 1, 2].map(i => `<span class="${i < n ? '' : 'lost'}">❤️</span>`).join(''); }
function setTick(t) { const el = $('#tickTxt'); if (el.dataset.t !== t) { el.dataset.t = t; el.textContent = t; } }
function fmt(ms) { const s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
const TAUNTS = ['يلا شوفونا 😏', 'مش بطالين لهلق', 'شوي شوي…', 'ركّزوا شوي', 'قرّبتوا؟', 'الوقت ماشي ⏳', 'هالمرة؟ منشوف'];
const mUrl = c => location.origin + '/?c=' + c;

// ---------- صورة: قص وتقريب ----------
function pickPhoto(capture, cb) {
  const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; if (capture) i.capture = 'user';
  i.onchange = () => { const f = i.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => cropper(rd.result, cb); rd.readAsDataURL(f); };
  i.click();
}
function cropper(src, cb) {
  modal(`<h2 class="t" style="margin:8px 0 12px">زبّط صورتك</h2><div class="crop" id="cf"><img id="ci" src="${src}"></div>
    <p class="sub" style="margin:8px 0">اسحب الصورة لتحرّكها، وكبّر من الشريط</p><input type="range" id="cz" min="1" max="4" step="0.01" value="1">
    <button class="btn main" id="cok" style="margin-top:12px">تمام</button>`, b => {
    const img = $('#ci', b), fr = $('#cf', b), F = 220; let sc0 = 1, z = 1, x = 0, y = 0, W = 0, H = 0;
    const clampXY = () => { const s = sc0 * z; x = Math.min(0, Math.max(F - W * s, x)); y = Math.min(0, Math.max(F - H * s, y)); };
    const apply = () => { clampXY(); img.style.transform = `translate(${x}px,${y}px) scale(${sc0 * z})`; };
    img.onload = () => { W = img.naturalWidth; H = img.naturalHeight; sc0 = F / Math.min(W, H); x = (F - W * sc0) / 2; y = (F - H * sc0) / 2; apply(); };
    if (img.complete && img.naturalWidth) img.onload();
    let drag = null;
    fr.onpointerdown = e => { fr.setPointerCapture(e.pointerId); drag = [e.clientX - x, e.clientY - y]; };
    fr.onpointermove = e => { if (drag) { x = e.clientX - drag[0]; y = e.clientY - drag[1]; apply(); } };
    fr.onpointerup = fr.onpointercancel = () => drag = null;
    $('#cz', b).oninput = e => { const cx = F / 2, cy = F / 2, s0 = sc0 * z; z = +e.target.value; const s1 = sc0 * z; x = cx - (cx - x) * s1 / s0; y = cy - (cy - y) * s1 / s0; apply(); };
    $('#cok', b).onclick = () => { const c = document.createElement('canvas'); c.width = c.height = 200; const k = 200 / F; const s = sc0 * z; c.getContext('2d').drawImage(img, -x / s, -y / s, F / s, F / s, 0, 0, 200, 200); closeModal(); cb(c.toDataURL('image/jpeg', 0.8)); void k; };
  });
}

// ---------- الشاشات المحلية ----------
function render() {
  const r = S.room;
  $('#bExit').hidden = !r;
  $('#hearts').innerHTML = r ? heartsHTML(r.hearts) : '';
  if (!r) return renderLocal();
  const key = r.phase + '|' + (r.cur ? r.cur.key : '') + '|' + (r.wheel ? r.wheel.key : '');
  if (r.phase === 'play' && S.screenKey === key) { refreshPlay(); return; }
  if (S.mounted && r.phase !== 'play') { try { S.mounted.unmount && S.mounted.unmount(); } catch (e) {} S.mounted = null; S.gkey = null; }
  S.screenKey = key;
  ({ lobby: scLobby, wheel: scWheel, intro: scIntro, count: scCount, play: scPlay, after: scAfter, final: scFinal })[r.phase]();
  hostGoneBanner();
}
function renderLocal() {
  S.screenKey = 'local:' + S.local;
  if (S.local === 'home') return scHome();
  if (S.local === 'create' || S.local === 'join') return scForm(S.local);
}
function scHome() {
  setTick('📡 بلاغ جديد · 12 مهمة · 3 قلوب للكل · يا منطلع سوا يا منوقع سوا · 📡');
  app.innerHTML = `<div class="screen cover">
    <div>
      <div class="radar"><div class="sweep"></div><span class="blip" style="top:20%;right:27%"></span><span class="blip" style="top:62%;right:66%;animation-delay:.9s"></span><span class="blip" style="top:45%;right:14%;animation-delay:1.7s"></span></div>
      <div class="title">قعدة<br><b>فزعة</b></div>
      <div class="slogan">يا منطلع سوا، يا منوقع سوا</div>
      <div class="screenbox" style="margin-top:16px;font-size:14px">📟 12 مهمة جماعية · 3 قلوب للقعدة كلها · ما في حدا بيربح لحالو</div>
    </div>
    <div>
      <button class="btn main" id="hc">افتح قعدة</button>
      <button class="btn alt" id="hj" style="margin-top:10px">فوت بكود</button>
      <div class="sig" style="margin-top:12px">إعداد م. إياد حلوبي</div>
    </div></div>`;
  $('#hc').onclick = () => { FZ.audio(); S.local = 'create'; S.join = {}; render(); };
  $('#hj').onclick = () => { FZ.audio(); S.local = 'join'; S.join = {}; render(); };
}
function scForm(mode) {
  const j = S.join; const create = mode === 'create';
  setTick(create ? '🛠️ عم نجهّز غرفة العمليات…' : '🚪 فوت عالقعدة بالكود');
  const types = ['شلة', 'رفقة', 'عيلة', 'زملاء'];
  app.innerHTML = `<div class="screen">
    <h2 class="t">${create ? 'افتح قعدة' : 'فوت عالقعدة'}</h2>
    ${create ? `<div class="card">
      <label class="f">اسم القعدة *</label><input class="in" id="fn" maxlength="18" placeholder="مثلاً: سهرة الخميس" value="${esc(j.rname || '')}">
      <label class="f" style="margin-top:12px">نوع القعدة</label>
      <div class="chips" id="ft">${types.map(t => `<button class="chip${(j.rtype || 'شلة') === t ? ' on' : ''}" data-v="${t}">${t}</button>`).join('')}<button class="chip${j.rtype && !types.includes(j.rtype) ? ' on' : ''}" data-v="*">✍️ غير</button></div>
      <input class="in${j.rtype && !types.includes(j.rtype) ? '' : ' hidden'}" id="ftc" maxlength="20" placeholder="اكتبوا نوعها" style="margin-top:8px" value="${esc(j.rtype && !types.includes(j.rtype) ? j.rtype : '')}">
      <label class="f" style="margin-top:12px">الصعوبة (بتتغير قبل كل مهمة)</label>
      <div class="chips" id="fd"><button class="chip${(j.diff || 'easy') === 'easy' ? ' on' : ''}" data-v="easy">😌 سهل · وقت طويل</button><button class="chip${j.diff === 'hard' ? ' on' : ''}" data-v="hard">🔥 صعب · وقت قصير</button></div>
    </div>` : `<div class="card"><label class="f">كود القعدة</label><input class="in" id="fc" maxlength="5" dir="ltr" style="text-transform:uppercase;letter-spacing:6px;font-size:24px;text-align:center" value="${esc(j.code || '')}"></div>`}
    <div class="card">
      <label class="f">اسمك (اختياري)</label><input class="in" id="pn" maxlength="18" value="${esc(j.name || '')}" autocomplete="off">
      <label class="f" style="margin-top:12px">إنت… *</label>
      <div class="gender chips" id="pg"><button class="chip${j.g === 'm' ? ' on' : ''}" data-v="m">شب</button><button class="chip${j.g === 'f' ? ' on' : ''}" data-v="f">صبية</button></div>
      <label class="f" style="margin-top:12px">صورتك (اختياري)</label>
      <div class="row" style="align-items:center">
        <div class="av" style="width:64px;height:64px;flex:0 0 64px;background-color:#ccc;${j.photo ? `background-image:url(${j.photo})` : ''}">${j.photo ? '' : '🙂'}</div>
        <button class="btn sm" id="pp1">🖼️ من الصور</button><button class="btn sm" id="pp2">🤳 سيلفي</button>
      </div>
      ${j.photo ? '<button class="btn sm" id="pp0" style="margin-top:8px">شيل الصورة</button>' : ''}
    </div>
    <button class="btn main" id="fgo">${create ? 'افتح القعدة 🚨' : 'فوت 🚪'}</button>
    <button class="btn" id="fback">رجوع</button>
    <div class="sig">إعداد م. إياد حلوبي</div></div>`;
  const keep = () => { if (create) { j.rname = $('#fn').value; } else j.code = $('#fc').value; j.name = $('#pn').value; };
  if (create) {
    $$('#ft .chip').forEach(b => b.onclick = () => { keep(); if (b.dataset.v === '*') { j.rtype = $('#ftc').value || ' '; } else j.rtype = b.dataset.v; render(); if (b.dataset.v === '*') $('#ftc').focus(); });
    $('#ftc').oninput = e => j.rtype = e.target.value || ' ';
    $$('#fd .chip').forEach(b => b.onclick = () => { keep(); j.diff = b.dataset.v; render(); });
  }
  $$('#pg .chip').forEach(b => b.onclick = () => { keep(); j.g = b.dataset.v; render(); });
  $('#pp1').onclick = () => { keep(); pickPhoto(false, d => { j.photo = d; render(); }); };
  $('#pp2').onclick = () => { keep(); pickPhoto(true, d => { j.photo = d; render(); }); };
  if ($('#pp0')) $('#pp0').onclick = () => { keep(); j.photo = null; render(); };
  $('#fback').onclick = () => { S.local = 'home'; render(); };
  $('#fgo').onclick = () => {
    keep(); FZ.audio();
    if (create && !j.rname.trim()) return FZ.toast('اكتبوا اسم القعدة');
    if (!create && j.code.trim().length < 5) return FZ.toast('الكود 5 أحرف');
    if (!j.g) return FZ.toast('اختار شب ولا صبية');
    if (create) FZ.send({ t: 'create', name: j.name, g: j.g, photo: j.photo, room: { name: j.rname, type: (j.rtype || 'شلة').trim() || 'شلة', diff: j.diff || 'easy' } });
    else FZ.send({ t: 'join', code: j.code.trim().toUpperCase(), name: j.name, g: j.g, photo: j.photo });
  };
}

// ---------- اللاعبين ----------
function playerTile(p, extra = '') {
  return `<div class="pl ${extra}${p.online ? '' : ' off'}" data-id="${p.id}">${S.room.hostId === p.id ? '<span class="crown">👑</span>' : ''}${FZ.avHTML(p)}<div class="nm">${esc(p.name)}${p.id === S.me ? ' (إنت)' : ''}</div></div>`;
}
function playerMenu(p) {
  if (!isHost()) return;
  if (p.id === S.me) return editMe();
  modal(`<div style="text-align:center;margin-top:10px">${FZ.avHTML(p, 80).replace('class="av"', 'class="av" style="margin:0 auto"')}<h2 class="t" style="margin:8px 0 14px">${esc(p.name)}</h2></div>
    <button class="btn" id="mr">✏️ عدّل الاسم</button><button class="btn" id="mh" style="margin-top:8px">👑 خلّي${G2(p, 'ه', 'ها')} الريس</button><button class="btn warn" id="mk" style="margin-top:8px">🚪 طلّع${G2(p, 'ه', 'ها')} من القعدة</button>`, b => {
    $('#mr', b).onclick = () => { closeModal(); modal(`<h2 class="t" style="margin:16px 0">الاسم الجديد</h2><input class="in" id="nn" maxlength="18" value="${esc(p.name)}"><button class="btn main" id="ns" style="margin-top:10px">حفظ</button>`, b2 => { $('#ns', b2).onclick = () => { FZ.send({ t: 'rename', pid: p.id, name: $('#nn', b2).value }); closeModal(); }; }); };
    $('#mh', b).onclick = () => { FZ.send({ t: 'handover', pid: p.id }); closeModal(); };
    $('#mk', b).onclick = () => { closeModal(); confirmBox(`تطلّع ${esc(p.name)}؟`, 'إي، طلّع', () => FZ.send({ t: 'kick', pid: p.id })); };
  });
}
function editMe() {
  const p = meP(); let photo = FZ.photos[S.me] || null;
  const draw = () => modal(`<h2 class="t" style="margin:10px 0">عدّل حالك</h2>
    <label class="f">اسمك</label><input class="in" id="en" maxlength="18" value="${esc(p.name)}">
    <div class="gender chips" style="margin-top:10px" id="eg"><button class="chip${p.g === 'm' ? ' on' : ''}" data-v="m">شب</button><button class="chip${p.g === 'f' ? ' on' : ''}" data-v="f">صبية</button></div>
    <div class="row" style="align-items:center;margin-top:10px"><div class="av" style="width:60px;height:60px;flex:0 0 60px;background-color:${p.color};${photo ? `background-image:url(${photo})` : ''}"></div><button class="btn sm" id="e1">🖼️ صور</button><button class="btn sm" id="e2">🤳 سيلفي</button><button class="btn sm" id="e0">شيل</button></div>
    <button class="btn main" id="es" style="margin-top:12px">حفظ</button>`, b => {
    $$('#eg .chip', b).forEach(c => c.onclick = () => { p.g = c.dataset.v; $$('#eg .chip', b).forEach(x => x.classList.toggle('on', x === c)); });
    const nm = () => p.name = $('#en', b).value;
    $('#e1', b).onclick = () => { nm(); pickPhoto(false, d => { photo = d; draw(); }); };
    $('#e2', b).onclick = () => { nm(); pickPhoto(true, d => { photo = d; draw(); }); };
    $('#e0', b).onclick = () => { nm(); photo = null; draw(); };
    $('#es', b).onclick = () => { FZ.send({ t: 'profile', name: $('#en', b).value, g: p.g, photo: photo || '' }); closeModal(); };
  });
  draw();
}
function bindTiles(root, fn) { $$('.pl', root).forEach(el => { const p = S.room.players.find(x => x.id === el.dataset.id); if (p && fn) { el.classList.add('tap'); el.onclick = () => fn(p); } }); }
function hostGoneBanner() {
  const r = S.room; if (!r || !r.hostGone || isHost() || r.phase === 'final') return;
  const b = h(`<button class="btn warn" style="margin-top:10px">👑 الريس غاب — استلم الريس</button>`); b.onclick = () => FZ.send({ t: 'claim' });
  $('.screen', app) && $('.screen', app).prepend(b);
}

// ---------- لوبي ----------
function scLobby() {
  const r = S.room; const host = isHost(); const on = r.players.filter(p => p.online);
  setTick(`📡 غرفة العمليات مفتوحة · الكود ${r.code} · ${on.length}/12 بالفريق · 📡`);
  app.innerHTML = `<div class="screen">
    <div class="screenbox" style="text-align:center">📟 <b>${esc(r.name)}</b> · ${esc(r.type)}</div>
    <div class="card codebox"><img src="/qr?t=${encodeURIComponent(mUrl(r.code))}" alt="QR"><div style="flex:1;text-align:center"><div class="sub">كود القعدة</div><div class="code">${r.code}</div><button class="btn sm alt" id="ls">📤 ابعت الرابط</button></div></div>
    <div class="hud"><b>الفريق (${on.length}/12)</b>${host ? '<span class="sub">اكبس على حدا لتعدّله</span>' : ''}</div>
    <div class="plist">${r.players.map(p => playerTile(p)).join('')}</div>
    <button class="btn sm" id="lme">✏️ عدّل اسمي وصورتي</button>
    <div style="margin-top:auto"></div>
    ${host ? `<button class="btn main" id="lgo" ${on.length < 2 ? 'disabled' : ''}>يلا نبلّش 🚨</button>${host ? '<button class="btn sm" id="led">⚙️ اسم القعدة ونوعها</button>' : ''}` : `<div class="screenbox" style="text-align:center">⏳ استنّوا الريس ${G2(r.players.find(p => p.id === r.hostId), 'يبلّش', 'تبلّش')}</div>`}
    ${on.length < 2 && host ? '<div class="sub">بدها لاعبين اتنين عالأقل</div>' : ''}
    <div class="sig">إعداد م. إياد حلوبي</div></div>`;
  $('#ls').onclick = async () => { const u = mUrl(r.code); try { if (navigator.share) await navigator.share({ title: 'قعدة فزعة', text: 'فوت عالقعدة: ' + r.code, url: u }); else { await navigator.clipboard.writeText(u); FZ.toast('انسخ الرابط ✅'); } } catch (e) {} };
  $('#lme').onclick = editMe;
  bindTiles(app, host ? playerMenu : null);
  if ($('#lgo')) $('#lgo').onclick = () => { FZ.audio(); FZ.send({ t: 'start' }); };
  if ($('#led')) $('#led').onclick = editRoom;
}
function editRoom() {
  const r = S.room;
  modal(`<h2 class="t" style="margin:10px 0">القعدة</h2><label class="f">اسم القعدة</label><input class="in" id="rn" maxlength="18" value="${esc(r.name)}">
    <label class="f" style="margin-top:10px">النوع</label><input class="in" id="rt" maxlength="20" value="${esc(r.type)}"><button class="btn main" id="rs" style="margin-top:12px">حفظ</button>`, b => {
    $('#rs', b).onclick = () => { const n = $('#rn', b).value.trim(); if (!n) return FZ.toast('اسم القعدة إجباري'); FZ.send({ t: 'roomedit', name: n, type: $('#rt', b).value.trim() || r.type }); closeModal(); };
  });
}

// ---------- الدولاب ----------
function scWheel() {
  const r = S.room; setTick('🎯 الدولاب عم يختار المهمة الجاية · 🎯');
  app.innerHTML = `<div class="screen" style="justify-content:center">
    <h2 class="t">المهمة الجاية…</h2>
    <div class="wheelWrap"><canvas id="wc" width="660" height="660"></canvas><div class="pointer"></div><div class="hub">🎯</div></div>
    <div class="mtitle" id="wn">&nbsp;</div><div class="sub">${r.remaining} مهمات باقية</div></div>`;
  const cv = $('#wc'), c = cv.getContext('2d'), N = r.keys.length, seg = Math.PI * 2 / N;
  const idx = r.keys.indexOf(r.wheel.key); const doneMap = Object.fromEntries(r.done.map(d => [d.key, d.ok]));
  const cols = ['#2b59ff', '#ff6b2c', '#c6f432', '#ffffff'];
  // زاوية الهدف: منتصف شريحة المهمة تحت المؤشر (فوق)
  const target = -Math.PI / 2 - (idx * seg + seg / 2);
  const turns = 5 * Math.PI * 2; const DUR = 4300; const t0 = r.wheel.at;
  const draw = () => {
    if (!cv.isConnected) return;
    const el = Math.min(1, (sNow() - t0) / DUR); const e = 1 - Math.pow(1 - el, 3);
    const ang = target - turns * (1 - e);
    c.clearRect(0, 0, 660, 660); c.save(); c.translate(330, 330);
    for (let i = 0; i < N; i++) {
      const a0 = ang + i * seg; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 320, a0, a0 + seg); c.closePath();
      const k = r.keys[i]; c.fillStyle = doneMap[k] === undefined ? cols[i % 4] : '#9a98a5'; c.fill(); c.lineWidth = 6; c.strokeStyle = '#16161d'; c.stroke();
      c.save(); c.rotate(a0 + seg / 2); c.translate(232, 0); c.rotate(Math.PI / 2); c.font = '46px serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(doneMap[k] === undefined ? FZ.GM[k].icon : (doneMap[k] ? '✅' : '💥'), 0, 0); c.restore();
    }
    c.restore();
    if (el >= 1) { $('#wn').textContent = FZ.GM[r.wheel.key].icon + ' ' + r.names[r.wheel.key]; }
    else { const cur = ((Math.floor(((-Math.PI / 2 - ang) % (Math.PI * 2) + Math.PI * 4) % (Math.PI * 2) / seg)) % N); if (cur !== S._wc) { S._wc = cur; FZ.sfx.tick(); } requestAnimationFrame(draw); }
  };
  draw();
}

// ---------- قبل المهمة ----------
function scIntro() {
  const r = S.room, it = r.intro, gm = FZ.GM[it.key], host = isHost(); const act = new Set(it.active), rdy = new Set(it.ready);
  const amActive = act.has(S.me), amReady = rdy.has(S.me);
  setTick(`🚨 مهمة جديدة: ${r.names[it.key]} · ${gm.short} · 🚨`);
  app.innerHTML = `<div class="screen">
    <div class="micon">${gm.icon}</div><div class="mtitle">${r.names[it.key]}</div>
    <div class="screenbox rules">${gm.rules.map(x => '▸ ' + x).join('<br>')}</div>
    <div class="hud"><b>الصعوبة</b><div class="chips" id="idf"><button class="chip${it.diff === 'easy' ? ' on' : ''}" data-v="easy">😌 سهل</button><button class="chip${it.diff === 'hard' ? ' on' : ''}" data-v="hard">🔥 صعب</button></div></div>
    <div class="sub">${it.diff === 'easy' ? 'وقت أطول' : 'وقت أقصر'}${it.cap ? ` · هالمهمة لـ${it.cap} بس والباقي مراقبين 👀` : ''}${host ? ' · اكبس على حدا ليلعب أو يتفرّج' : ''}</div>
    <div class="plist">${r.players.filter(p => p.online).map(p => playerTile(p, (act.has(p.id) ? '' : 'bench') + (rdy.has(p.id) ? ' rdy' : ''))).join('')}</div>
    ${host && it.cap ? '<button class="btn sm" id="ish">🎲 قرعة مين بيلعب</button>' : ''}
    <div style="margin-top:auto"></div>
    ${amActive ? `<button class="btn ${amReady ? '' : 'alt'}" id="ir" ${amReady ? 'disabled' : ''}>${amReady ? 'جاهز ✓ — استنّى الباقيين' : G2(meP(), 'جاهز', 'جاهزة') + ' ✋'}</button>` : `<div class="screenbox" style="text-align:center">👀 إنت مراقب${G2(meP(), '', 'ة')} بهالمهمة</div>`}
    ${host ? '<button class="btn main" id="igo">ابدأ هلق ▶</button>' : ''}
    <div class="sub">بتبلّش لحالها لما الكل يكون جاهز (${[...rdy].filter(x => act.has(x)).length}/${act.size})</div></div>`;
  $$('#idf .chip').forEach(b => { if (host) b.onclick = () => FZ.send({ t: 'diff', v: b.dataset.v }); else b.style.pointerEvents = 'none'; });
  if (host) bindTiles(app, p => FZ.send({ t: 'toggle', pid: p.id }));
  if ($('#ish')) $('#ish').onclick = () => FZ.send({ t: 'shuffleActive' });
  if ($('#ir')) $('#ir').onclick = () => { FZ.audio(); if (it.key === 'balance') FZ.askMotion(); FZ.send({ t: 'ready' }); };
  if ($('#igo')) $('#igo').onclick = () => { FZ.audio(); if (it.key === 'balance') FZ.askMotion(); FZ.send({ t: 'go' }); };
}

// ---------- العد ----------
function scCount() {
  const r = S.room, gm = FZ.GM[r.cur.key]; setTick('⏱️ استعدوا… ⏱️');
  const act = r.cur.act.includes(S.me);
  app.innerHTML = `<div class="screen" style="justify-content:center;align-items:center">
    <div class="micon">${gm.icon}</div><div class="mtitle">${r.names[r.cur.key]}</div>
    <div class="count" id="cc">3</div><div class="sub">${act ? 'ركّزوا!' : 'إنت مراقب بهالمهمة 👀'} · ${r.cur.diff === 'easy' ? '😌 سهل' : '🔥 صعب'}</div></div>`;
  let last = -1;
  const loop = () => { const el = $('#cc'); if (!el) return; const n = Math.ceil((r.cur.startAt - sNow()) / 1000); const v = Math.max(1, n); if (v !== last) { last = v; el.textContent = v; FZ.sfx.tick(); el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; } if (n > 0) requestAnimationFrame(loop); };
  loop();
}

// ---------- اللعب ----------
function scPlay() {
  const r = S.room, key = r.cur.key, gm = FZ.GM[key];
  setTick(`🚨 ${r.names[key]} · ${gm.short} · 🚨`);
  app.innerHTML = `<div class="screen">
    <div class="hud"><div class="gname">${gm.icon} ${r.names[key]}</div><div class="timer${r.cur.noTimer ? ' hidden' : ''}" id="pt">--</div></div>
    <div class="taunt" id="ptn">${TAUNTS[0]}</div>
    <div class="stage" id="stage"></div></div>`;
  S.mounted = null; S.gkey = null;
  if (S.g && S.gkey0 === key) mountGame();
  clearInterval(S.timerIv); clearInterval(S.tauntIv);
  S.timerIv = setInterval(() => { const t = $('#pt'); if (!t || !S.room || !S.room.cur) return clearInterval(S.timerIv); const left = (S.endsAt || S.room.cur.endsAt) - sNow(); t.textContent = fmt(left); t.classList.toggle('hot', left < 10500); }, 200);
  S.tauntIv = setInterval(() => { const t = $('#ptn'); if (!t) return clearInterval(S.tauntIv); t.textContent = TAUNTS[Math.floor(Math.random() * TAUNTS.length)]; t.style.animation = 'none'; void t.offsetWidth; t.style.animation = ''; }, 7000);
}
function refreshPlay() { $('#hearts').innerHTML = heartsHTML(S.room.hearts); }
function mountGame() {
  const st = $('#stage'); if (!st || !S.g) return; const key = S.gkey0; const gm = FZ.GM[key];
  const v = S.g; const special = key === 'twister' && v.table === S.me;
  if (S.spectator && !special) {
    st.innerHTML = `<div class="spect"><div class="e">👀</div><h2 class="t">إنت مراقب${G2(meP(), '', 'ة')} هالمرة</h2><p class="sub">شجّع الفريق… بس بلا ما تساعد 😏</p></div>`;
    S.mounted = { update() {} }; S.gkey = key; return;
  }
  st.innerHTML = ''; S.mounted = gm; S.gkey = key;
  try { gm.mount(st, v); } catch (e) { console.error(e); }
}
function onGame(m) {
  S.g = m.v; S.gkey0 = m.key; S.endsAt = FZ.endsAt = m.endsAt; S.spectator = m.spectator;
  if (!S.room || S.room.phase !== 'play') return;
  if (S.gkey === m.key && S.mounted) { try { S.mounted.update && S.mounted.update(m.v); } catch (e) { console.error(e); } }
  else mountGame();
}

// ---------- بعد المهمة ----------
function scAfter() {
  const r = S.room, a = r.after, gm = FZ.GM[a.key];
  if (a.ok) { FZ.sfx.win(); confetti(); } else { FZ.sfx.lose(); FZ.flash('#e5383b'); vib([100, 60, 100]); }
  setTick(a.ok ? `✅ المهمة تمّت · ${a.taunt} · ✅` : `💥 المهمة فشلت · راح قلب · ${a.taunt} · 💥`);
  const pulseRes = a.key === 'pulse' && S.g && S.g.res ? `<div class="card"><b>ضبط الإيقاع: ${Math.round(S.g.res.avg * 100)}%</b></div>` : '';
  app.innerHTML = `<div class="screen" style="justify-content:center;text-align:center">
    <div style="font-size:90px">${a.ok ? '✅' : '💥'}</div>
    <h2 class="t" style="font-size:34px">${a.ok ? 'نجحتوا!' : 'فشلتوا…'}</h2>
    <div class="sub">${gm.icon} ${r.names[a.key]}${a.why ? ' · ' + esc(a.why) : ''}</div>
    <div class="taunt">${esc(a.taunt)}</div>${pulseRes}
    <div class="hearts" style="justify-content:center;font-size:40px">${heartsHTML(r.hearts)}</div>
    <div class="screenbox">${r.done.filter(d => d.ok).length} مهمة نجحت · ${r.remaining} باقية</div>
    ${a.last ? '<div class="sub">النتيجة جاية… 🥁</div>' : (isHost() ? '<button class="btn main" id="an">المهمة الجاية 🎯</button><div class="sub">أو بتبلّش لحالها بعد شوي</div>' : '<div class="sub">الدولاب رح يدور بعد شوي…</div>')}</div>`;
  if ($('#an')) $('#an').onclick = () => FZ.send({ t: 'next' });
}
function confetti() {
  const cols = ['#2b59ff', '#ff6b2c', '#c6f432', '#7b2ff7', '#fff']; const box = document.createElement('div'); box.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:45;overflow:hidden';
  for (let i = 0; i < 70; i++) { const d = document.createElement('i'); const s = 6 + Math.random() * 8; d.style.cssText = `position:absolute;top:-20px;left:${Math.random() * 100}%;width:${s}px;height:${s * 1.6}px;background:${cols[i % 5]};border:2px solid #16161d;transform:rotate(${Math.random() * 360}deg);transition:transform 2.2s cubic-bezier(.2,.6,.4,1),top 2.2s cubic-bezier(.2,.6,.4,1)`; box.appendChild(d); setTimeout(() => { d.style.top = (70 + Math.random() * 40) + '%'; d.style.transform = `rotate(${Math.random() * 720}deg)`; }, 30); }
  document.body.appendChild(box); setTimeout(() => box.remove(), 2600);
}

// ---------- النتيجة النهائية ----------
function groupTitle(w) { return w >= 12 ? 'فزعة ولا أحلى' : w >= 9 ? 'فريق طوارئ' : w >= 6 ? 'منعتمد عليكن' : w >= 3 ? 'نص فزعة' : 'بدها تمرين'; }
function scFinal() {
  const r = S.room; const wins = r.done.filter(d => d.ok).length; const host = isHost();
  S.story = S.story || { lay: 0, dark: false };
  setTick(`🏁 انتهت العمليات · ${wins}/12 مهمة · ${groupTitle(wins)} · 🏁`);
  if (!S.finalFx) { S.finalFx = true; if (wins >= 6) { confetti(); FZ.sfx.win(); } }
  const doneMap = Object.fromEntries(r.done.map(d => [d.key, d.ok]));
  app.innerHTML = `<div class="screen">
    <div class="screenbox" style="text-align:center">📟 <b>${esc(r.name)}</b> · ${esc(r.type)}</div>
    <div style="text-align:center"><div class="sub">لقب القعدة</div><div class="title" style="font-size:38px;margin-top:4px"><b>${groupTitle(wins)}</b></div></div>
    <div class="row" style="text-align:center"><div class="card"><div class="big" style="font-size:44px">${wins}<span style="font-size:20px">/12</span></div><div class="sub">مهمة نجحت</div></div><div class="card"><div class="hearts" style="justify-content:center;font-size:30px;margin:8px 0">${heartsHTML(r.hearts)}</div><div class="sub">قلوب باقية</div></div></div>
    <div class="mgrid">${r.keys.map(k => `<div class="mg ${doneMap[k] === undefined ? 'na' : doneMap[k] ? 'ok' : 'no'}"><div class="e">${FZ.GM[k].icon}</div>${r.names[k]}</div>`).join('')}</div>
    <div class="plist">${r.players.map(p => playerTile(p)).join('')}</div>
    <h2 class="t" style="margin-top:6px">صورة الستوري 📸</h2>
    <div class="chips" style="justify-content:center" id="sl">${['بلاغ', 'رادار', 'شارة'].map((n, i) => `<button class="chip${S.story.lay === i ? ' on' : ''}" data-v="${i}">${n}</button>`).join('')}</div>
    <div class="chips" style="justify-content:center" id="sd"><button class="chip${!S.story.dark ? ' on' : ''}" data-v="0">☀️ فاتح</button><button class="chip${S.story.dark ? ' on' : ''}" data-v="1">🌙 داكن</button></div>
    <canvas class="story" id="sc" width="1080" height="1920"></canvas>
    <div class="row"><button class="btn main" id="sdl">⬇️ نزّل الصورة</button><button class="btn alt" id="ssh">📤 شاركها</button></div>
    ${host ? `<div class="row"><button class="btn sm" id="sg1">👥 صورة جماعية</button><button class="btn sm" id="sg2">🤳 سيلفي جماعي</button>${FZ.gphoto ? '<button class="btn sm" id="sg0">شيلها</button>' : ''}</div><button class="btn sm" id="sre">✏️ اسم القعدة</button>` : ''}
    <button class="btn" id="sig">💬 شارك مع صحابك</button>
    <div class="card hidden" id="inst"><b>📲 نزّل اللعبة عموبايلك</b><p class="sub" id="instT" style="text-align:right;margin:6px 0">بتفتح متل التطبيق بكبسة وحدة</p><button class="btn sm main" id="instB">نزّلها</button></div>
    <button class="btn warn" id="snew">قعدة جديدة 🔁</button>
    <div class="sig"><span dir="ltr">@eyad.hloubi</span> · صار بدها قعدة.</div></div>`;
  $$('#sl .chip').forEach(b => b.onclick = () => { S.story.lay = +b.dataset.v; scFinal(); });
  $$('#sd .chip').forEach(b => b.onclick = () => { S.story.dark = b.dataset.v === '1'; scFinal(); });
  drawStory($('#sc'), wins);
  $('#sdl').onclick = () => { $('#sc').toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'qa3da-faz3a.png'; a.click(); }, 'image/png'); };
  $('#ssh').onclick = () => { $('#sc').toBlob(async b => { const f = new File([b], 'qa3da-faz3a.png', { type: 'image/png' }); try { if (navigator.canShare && navigator.canShare({ files: [f] })) await navigator.share({ files: [f], title: 'قعدة فزعة' }); else $('#sdl').click(); } catch (e) {} }, 'image/png'); };
  $('#sig').onclick = async () => { try { if (navigator.share) await navigator.share({ title: 'صار بدها قعدة', url: IG }); else window.open(IG, '_blank'); } catch (e) {} };
  if (host) {
    $('#sg1').onclick = () => pickPhoto(false, d => FZ.send({ t: 'gphoto', data: d }));
    $('#sg2').onclick = () => pickPhoto(true, d => FZ.send({ t: 'gphoto', data: d }));
    if ($('#sg0')) $('#sg0').onclick = () => FZ.send({ t: 'gphoto', data: '' });
    $('#sre').onclick = editRoom;
  }
  bindTiles(app, null);
  $('#snew').onclick = () => newSession();
  setupInstall();
}
function newSession() { FZ.send({ t: 'leave' }); LS.del('fz_session'); S.room = FZ.room = null; S.finalFx = false; S.story = null; FZ.gphoto = null; FZ.photos = {}; S.local = 'home'; render(); }

// ---------- صورة الستوري ----------
function loadImg(src) { return new Promise(res => { if (!src) return res(null); const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }); }
async function drawStory(cv, wins) {
  const r = S.room, c = cv.getContext('2d'), W = 1080, H = 1920, dark = S.story.dark, lay = S.story.lay;
  try { await document.fonts.load('800 40px Changa'); await document.fonts.load('800 40px Cairo'); } catch (e) {}
  const me = meP() || r.players[0]; const meImg = await loadImg(FZ.photos[me.id]); const gImg = await loadImg(FZ.gphoto);
  const imgs = {}; for (const p of r.players) imgs[p.id] = await loadImg(FZ.photos[p.id]);
  const BG = dark ? '#10132a' : '#f7f4ec', TX = dark ? '#f3f1ff' : '#16161d', CARD = dark ? '#1c2147' : '#ffffff', LN = dark ? '#e9ecff' : '#16161d', SH = dark ? '#000' : '#16161d';
  const A = '#2b59ff', B = '#ff6b2c', C = '#c6f432', SCR = '#141a3a';
  c.direction = 'rtl'; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  c.fillStyle = BG; c.fillRect(0, 0, W, H);
  const box = (x, y, w, h, fill, rad = 34, sh = 12) => { c.fillStyle = SH; rr(x + sh, y + sh, w, h, rad); c.fill(); c.fillStyle = fill; rr(x, y, w, h, rad); c.fill(); c.lineWidth = 8; c.strokeStyle = LN; c.stroke(); };
  function rr(x, y, w, h, rd) { c.beginPath(); c.moveTo(x + rd, y); c.arcTo(x + w, y, x + w, y + h, rd); c.arcTo(x + w, y + h, x, y + h, rd); c.arcTo(x, y + h, x, y, rd); c.arcTo(x, y, x + w, y, rd); c.closePath(); }
  const circ = (img, p, x, y, rad, ring) => { c.save(); c.beginPath(); c.arc(x, y, rad, 0, 7); c.fillStyle = p.color; c.fill(); c.clip(); if (img) c.drawImage(img, x - rad, y - rad, rad * 2, rad * 2); else { c.fillStyle = '#fff'; c.font = `800 ${rad}px Changa`; c.textBaseline = 'middle'; c.fillText((p.name || '؟')[0], x, y + rad * 0.05); c.textBaseline = 'alphabetic'; } c.restore(); c.beginPath(); c.arc(x, y, rad, 0, 7); c.lineWidth = ring || 8; c.strokeStyle = LN; c.stroke(); };
  const text = (t, x, y, size, color, w = 800, font = 'Changa') => { c.font = `${w} ${size}px ${font}`; c.fillStyle = color; c.fillText(t, x, y); };
  const tag = (t, x, y, size, bg, fg, rot = -0.05) => { c.save(); c.translate(x, y); c.rotate(rot); c.font = `800 ${size}px Changa`; const tw = c.measureText(t).width + size; box(-tw / 2, -size * 1.05, tw, size * 1.5, bg, 16, 10); c.fillStyle = fg; c.fillText(t, 0, size * 0.2); c.restore(); };
  // شريط علوي
  c.fillStyle = SCR; c.fillRect(0, 0, W, 90); c.fillStyle = C; c.font = '800 38px Changa'; c.fillText('📡 قعدة فزعة · ' + r.name + ' · ' + r.type, W / 2, 60);
  for (let i = 0; i < 40; i++) { c.fillStyle = i % 2 ? '#16161d' : '#ffd400'; c.beginPath(); c.moveTo(i * 60, 90); c.lineTo(i * 60 + 30, 90); c.lineTo(i * 60, 120); c.lineTo(i * 60 - 30, 120); c.fill(); }
  const mission = () => { const doneMap = Object.fromEntries(r.done.map(d => [d.key, d.ok])); return r.keys.map(k => doneMap[k] === undefined ? '⬜' : doneMap[k] ? '✅' : '💥'); };
  const team = (y, rad) => { const ps = r.players.slice(0, 12); const per = Math.min(ps.length, 6); const gap = Math.min(150, (W - 120) / per); ps.forEach((p, i) => { const row = Math.floor(i / 6), col = i % 6, cnt = Math.min(6, ps.length - row * 6); const x = W / 2 + (col - (cnt - 1) / 2) * gap; circ(imgs[p.id], p, x, y + row * (rad * 2 + 30), p.id === me.id ? rad * 1.12 : rad, p.id === me.id ? 12 : 6); if (p.id === me.id) { c.beginPath(); c.arc(x, y + row * (rad * 2 + 30), rad * 1.12 + 12, 0, 7); c.lineWidth = 8; c.strokeStyle = B; c.stroke(); } }); };
  const footer = () => { c.direction = 'ltr'; text('@eyad.hloubi', W / 2, H - 110, 48, TX); c.direction = 'rtl'; text('صار بدها قعدة.', W / 2, H - 50, 36, dark ? '#a6a9cc' : '#6b6a75', 700, 'Cairo'); };
  const hearts = (y) => text([0, 1, 2].map(i => i < r.hearts ? '❤️' : '🤍').join(' '), W / 2, y, 64, TX, 400, 'serif');
  if (lay === 0) { // بلاغ
    if (gImg) { box(90, 170, 900, 560, CARD, 34); c.save(); rr(90, 170, 900, 560, 34); c.clip(); const s = Math.max(900 / gImg.width, 560 / gImg.height); c.drawImage(gImg, 540 - gImg.width * s / 2, 450 - gImg.height * s / 2, gImg.width * s, gImg.height * s); c.restore(); rr(90, 170, 900, 560, 34); c.lineWidth = 8; c.strokeStyle = LN; c.stroke(); circ(meImg, me, 540, 760, 150, 12); }
    else { c.fillStyle = SCR; c.beginPath(); c.arc(540, 520, 330, 0, 7); c.fill(); c.lineWidth = 10; c.strokeStyle = LN; c.stroke(); c.strokeStyle = 'rgba(198,244,50,.4)'; c.lineWidth = 5; [230, 130].forEach(q => { c.beginPath(); c.arc(540, 520, q, 0, 7); c.stroke(); }); circ(meImg, me, 540, 560, 230, 12); }
    const ny = gImg ? 990 : 960; tag(me.name, 540, ny, 84, B, '#fff');
    text('لقب القعدة', 540, ny + 130, 40, dark ? '#a6a9cc' : '#6b6a75', 700, 'Cairo');
    text(groupTitle(wins), 540, ny + 220, 96, A);
    box(110, ny + 270, 860, 230, SCR, 30); text(`${wins}/12 مهمة`, 540, ny + 365, 74, C); hearts(ny + 455);
    text(mission().join(''), 540, ny + 600, 52, TX, 400, 'serif');
    team(ny + 720, 52);
  } else if (lay === 1) { // رادار
    text('قعدة', 540, 250, 90, TX); tag('فزعة', 540, 360, 100, B, '#fff');
    c.fillStyle = SCR; c.beginPath(); c.arc(540, 880, 400, 0, 7); c.fill(); c.lineWidth = 10; c.strokeStyle = LN; c.stroke();
    c.save(); c.beginPath(); c.arc(540, 880, 400, 0, 7); c.clip(); const g = c.createConicGradient ? c.createConicGradient(-1, 540, 880) : null; if (g) { g.addColorStop(0, 'rgba(198,244,50,.45)'); g.addColorStop(0.18, 'rgba(198,244,50,0)'); g.addColorStop(1, 'rgba(198,244,50,0)'); c.fillStyle = g; c.fillRect(140, 480, 800, 800); } c.restore();
    c.strokeStyle = 'rgba(198,244,50,.4)'; c.lineWidth = 5; [300, 200].forEach(q => { c.beginPath(); c.arc(540, 880, q, 0, 7); c.stroke(); });
    circ(gImg || meImg, me, 540, 880, 170, 12);
    const others = r.players.filter(p => p.id !== me.id).slice(0, 11); others.forEach((p, i) => { const a = -Math.PI / 2 + (i + 0.5) * (Math.PI * 2 / Math.max(others.length, 1)); circ(imgs[p.id], p, 540 + Math.cos(a) * 305, 880 + Math.sin(a) * 305, 50, 6); });
    tag(me.name, 540, 1395, 76, C, '#16161d', 0.03);
    text(groupTitle(wins), 540, 1530, 92, A); text(`${wins}/12 مهمة`, 540, 1620, 60, TX); hearts(1700);
  } else { // شارة
    box(80, 170, 920, 1520, CARD, 50, 16);
    c.save(); c.translate(830, 850); c.rotate(-0.22); c.lineWidth = 8; c.strokeStyle = wins >= 6 ? '#12a36b' : B; c.strokeRect(-150, -55, 300, 110); c.fillStyle = c.strokeStyle; c.font = '800 46px Changa'; c.fillText(wins >= 6 ? 'تمّت المهمة' : 'بدها إعادة', 0, 16); c.restore();
    text('شهادة فزعة', 540, 330, 70, TX);
    circ(meImg, me, 540, 640, 230, 14); tag(me.name, 540, 950, 80, A, '#fff', -0.03);
    text('بتشهد القعدة إنو', 540, 1090, 42, dark ? '#a6a9cc' : '#6b6a75', 700, 'Cairo');
    text(G2(me, 'كان من فريق', 'كانت من فريق'), 540, 1150, 46, TX, 800, 'Cairo');
    text('«' + groupTitle(wins) + '»', 540, 1250, 86, B);
    text(`${wins}/12 مهمة · ` + [0, 1, 2].map(i => i < r.hearts ? '❤️' : '🤍').join(''), 540, 1350, 54, TX);
    if (gImg) { c.save(); rr(250, 1400, 580, 240, 26); c.clip(); const s = Math.max(580 / gImg.width, 240 / gImg.height); c.drawImage(gImg, 540 - gImg.width * s / 2, 1520 - gImg.height * s / 2, gImg.width * s, gImg.height * s); c.restore(); rr(250, 1400, 580, 240, 26); c.lineWidth = 6; c.strokeStyle = LN; c.stroke(); }
    else team(1480, 46);
  }
  footer();
}

// ---------- تثبيت كتطبيق ----------
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; if ($('#inst')) setupInstall(); });
function setupInstall() {
  const box = $('#inst'); if (!box) return;
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone; if (standalone) return;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (deferredPrompt) { box.classList.remove('hidden'); $('#instB').onclick = async () => { deferredPrompt.prompt(); deferredPrompt = null; box.classList.add('hidden'); }; }
  else if (ios) { box.classList.remove('hidden'); $('#instT').textContent = 'من زر المشاركة ⬆️ اختار «إضافة إلى الشاشة الرئيسية»'; $('#instB').classList.add('hidden'); }
}

// ---------- الأزرار الثابتة ----------
$('#bHelp').onclick = () => {
  const names = S.room ? S.room.names : null;
  modal(`<div class="help"><h2 class="t" style="margin:6px 0">كيف منلعب؟ 🚨</h2>
    <p>قعدة فزعة لعبة جماعية: ما في حدا بيربح لحالو — <b>يا منطلع سوا، يا منوقع سوا</b>.</p>
    <p>▸ الريس بيفتح القعدة والباقي بيفوتوا بالكود أو الـQR، من 2 لـ12 لاعب.<br>▸ الدولاب بيختار المهمة، وكل مهمة الكل بيلعبها سوا كل واحد من موبايله.<br>▸ عندكن 3 قلوب للقعدة كلها. كل مهمة بتفشل بتاخد قلب. إذا خلصوا القلوب، خلصت القعدة.<br>▸ السهل والصعب نفس المهمة — بس الصعب وقته أقصر.<br>▸ بالمهمات الصعبة الريس بيقدر يخلّي كم حدا يتفرّجوا 👀.<br>▸ الريس بيقدر يطلّع حدا أو يسلّم الريس لغيره، وإذا غاب الريس حدا تاني بيستلم.</p>
    ${Object.keys(FZ.GM).map(k => `<h3>${FZ.GM[k].icon} ${names ? names[k] : k}</h3><p>${FZ.GM[k].rules.join(' ')}</p>`).join('')}
    <h3>📚 المرجع</h3><p>مبنية على فكرة الألعاب التعاونية الجماعية (Cooperative Party Games): الفريق كله ضد اللعبة، والنجاح بالتنسيق والتواصل مو بالمنافسة.</p>
    <p style="margin-top:10px"><b>إعداد م. إياد حلوبي</b></p></div>`);
  const names2 = ['عدّوا سوا', 'الكيبورد المقسوم', 'الميزان', 'البرج', 'عبّوا الكاسة', 'الجسر', 'فكّ القنبلة', 'النبض', 'الطبلة', 'البازل المقسوم', 'تويستر الأصابع', 'الإطفائية'];
  if (!names) $$('.help h3', $('#mBody')).forEach((el, i) => { if (i < 12) el.textContent = Object.values(FZ.GM)[i].icon + ' ' + names2[i]; });
};
$('#bExit').onclick = () => {
  const r = S.room; if (!r) return;
  if (r.phase === 'final') return confirmBox('قعدة جديدة؟', 'إي', newSession);
  if (isHost()) modal(`<h2 class="t" style="margin:16px 0">شو بدك؟</h2><button class="btn warn" id="xe">🏁 إنهاء القعدة وعرض النتيجة</button><button class="btn" id="xn" style="margin-top:8px">🔁 قعدة جديدة من الأول</button>`, b => {
    $('#xe', b).onclick = () => { closeModal(); FZ.send({ t: 'end' }); };
    $('#xn', b).onclick = () => { closeModal(); FZ.send({ t: 'end' }); setTimeout(newSession, 300); };
  });
  else confirmBox('تطلع من القعدة؟', 'إي، اطلع', newSession);
};

// ---------- بداية ----------
(function boot() {
  const c = new URLSearchParams(location.search).get('c');
  if (c && !LS.get('fz_session')) { S.local = 'join'; S.join = { code: c.toUpperCase() }; }
  if (c) history.replaceState(null, '', '/');
  render(); connect();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
