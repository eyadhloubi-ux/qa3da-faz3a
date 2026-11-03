// قعدة فزعة — التطبيق
// إعداد م. إياد حلوبي · @eyad.hloubi
'use strict';
const IG = 'https://instagram.com/eyad.hloubi';
const S = { ws: null, room: null, me: null, code: null, local: 'home', g: null, gkey: null, endsAt: 0, spectator: false, mounted: null, screenKey: '', join: {} };
FZ.photos = {}; FZ.gphoto = null;
const LS = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }, del(k) { try { localStorage.removeItem(k); } catch (e) {} } };
const app = $('#app');

// ---------- ثيم ----------
(function () { const t = LS.get('fz_theme'); if (t) document.documentElement.dataset.theme = t; $('#bTheme').textContent = t === 'dark' ? '☀️' : '🌙'; })();
$('#bTheme').onclick = () => { const d = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = d; LS.set('fz_theme', d); $('#bTheme').textContent = d === 'dark' ? '☀️' : '🌙'; };

// ---------- توست ومودال ----------
let toastT; FZ.toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2400); };
function modal(html, onMount) { $('#mBody').innerHTML = html; $('#modal').hidden = false; S.modalOpen = true; if (onMount) onMount($('#mBody')); }
function closeModal() { $('#modal').hidden = true; $('#mBody').innerHTML = ''; S.modalOpen = false; S.panel = false; }
$('#mClose').onclick = closeModal; $('#modal').onclick = e => { if (e.target.id === 'modal') closeModal(); };
function confirmBox(msg, yes, cb) { modal(`<h2 class="t" style="margin:20px 0 6px">${msg}</h2><div class="row"><button class="btn warn" id="cy">${yes}</button><button class="btn" id="cn">لأ</button></div>`, b => { $('#cy', b).onclick = () => { closeModal(); cb(); }; $('#cn', b).onclick = closeModal; }); }

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
    case 'room': S.room = FZ.room = m.room; render(); if (S.panel) playersPanel(); break;
    case 'photo': if (m.data) FZ.photos[m.pid] = m.data; else delete FZ.photos[m.pid]; if (S.room && S.room.phase !== 'play') render(); break;
    case 'gphoto': FZ.gphoto = m.data || null; if (S.room && S.room.phase === 'final') render(); break;
    case 'g': onGame(m); break;
    case 'fx':
      if (m.k === 'skip') FZ.toast('⏭ مرّرنا «' + (S.room ? S.room.names[m.key] : '') + '» — بلا ما يروح قلب');
      if (m.k === 'retry') { FZ.toast('🔁 منعيد «' + (S.room ? S.room.names[m.key] : '') + '» — النتيجة القديمة انلغت'); S.finalFx = false; }
      break;
    case 'err':
      if (m.code === 'gone') { LS.del('fz_session'); S.room = FZ.room = null; S.local = 'home'; render(); }
      else FZ.toast(m.m); break;
    case 'kicked': LS.del('fz_session'); S.room = FZ.room = null; S.local = 'home'; closeModal(); render(); FZ.toast('الريس طلّعك من القعدة'); break;
  }
}

// ---------- أدوات ----------
const G2 = (p, m, f) => (p && p.g === 'f' ? f : m);
const meP = () => S.room && S.room.players.find(p => p.id === S.me);
const isHost = () => S.room && S.room.hostId === S.me;
function heartsHTML(n) { return [0, 1, 2].map(i => `<span class="${i < n ? '' : 'lost'}">❤️</span>`).join(''); }
function setTick(t) { const el = $('#tickTxt'); if (el.dataset.t !== t) { el.dataset.t = t; el.textContent = t; } }
function fmt(ms) { const s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
const TAUNTS = ['يلا شوفونا', 'مش بطالين لهلق', 'شوي شوي…', 'ركّزوا شوي', 'قرّبتوا؟', 'الوقت ماشي ⏳', 'هالمرة؟ منشوف', 'مرة تانية؟'];
const mUrl = c => location.origin + '/?c=' + c;
const doneMap = r => Object.fromEntries(r.done.map(d => [d.key, d.skip ? 'sk' : d.ok ? 'ok' : 'no']));
function score(r) { const wins = r.done.filter(d => d.ok).length, skipped = r.done.filter(d => d.skip).length; return { wins, skipped, total: 12 - skipped }; }

// ---------- صورة شخصية: قص وتقريب ----------
function pickFile(capture, cb) {
  const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; if (capture) i.capture = capture;
  i.onchange = () => { const f = i.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => cb(rd.result); rd.readAsDataURL(f); };
  i.click();
}
function pickPhoto(capture, cb) { pickFile(capture ? 'user' : null, src => cropper(src, cb)); }
function cropper(src, cb) {
  modal(`<h2 class="t" style="margin:8px 0 4px">زبّط صورتك</h2><div class="crop" id="cf"><img id="ci" src="${src}"></div>
    <p class="sub">اسحب الصورة لتحرّكها، وكبّر من الشريط</p><input type="range" id="cz" min="1" max="4" step="0.01" value="1">
    <button class="btn main" id="cok">تمام</button>`, b => {
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
    $('#cok', b).onclick = () => { const c = document.createElement('canvas'); c.width = c.height = 200; const s = sc0 * z; c.getContext('2d').drawImage(img, -x / s, -y / s, F / s, F / s, 0, 0, 200, 200); closeModal(); cb(c.toDataURL('image/jpeg', 0.8)); };
  });
}
// الصورة الجماعية: بلا قص — بس لفّ وتحويل طول/عرض
function pickGroup(capture, cb) {
  pickFile(capture ? 'environment' : null, src => {
    const img = new Image(); img.onload = () => {
      let rot = 0;
      const draw = () => {
        const sw = rot % 180 ? img.height : img.width, sh = rot % 180 ? img.width : img.height; const k = Math.min(1, 1100 / Math.max(sw, sh));
        const c = document.createElement('canvas'); c.width = Math.round(sw * k); c.height = Math.round(sh * k); const x = c.getContext('2d');
        x.translate(c.width / 2, c.height / 2); x.rotate(rot * Math.PI / 180); x.drawImage(img, -img.width * k / 2, -img.height * k / 2, img.width * k, img.height * k);
        return c;
      };
      const show = () => {
        const c = draw(); const url = c.toDataURL('image/jpeg', 0.82);
        modal(`<h2 class="t" style="margin:8px 0 4px">صورة الشلة 📸</h2><p class="sub">الصورة بتطلع كاملة بلا قص · ${c.width > c.height ? 'بالعرض ↔' : c.width < c.height ? 'بالطول ↕' : 'مربعة'}</p>
          <img src="${url}" style="max-width:100%;max-height:46vh;margin:0 auto;display:block;border:3px solid var(--line);border-radius:12px">
          <div class="row"><button class="btn sm" id="gr1">↺ لفّ</button><button class="btn sm" id="gr2">↻ لفّ</button></div>
          <button class="btn main" id="gok">اعتمدها</button>`, b => {
          $('#gr1', b).onclick = () => { rot = (rot + 270) % 360; show(); };
          $('#gr2', b).onclick = () => { rot = (rot + 90) % 360; show(); };
          $('#gok', b).onclick = () => { let q = 0.82, out = url; while (out.length > 650000 && q > 0.4) { q -= 0.1; out = c.toDataURL('image/jpeg', q); } closeModal(); cb(out); };
        });
      };
      show();
    }; img.src = src;
  });
}

// ---------- العرض ----------
function render() {
  const r = S.room;
  $('#bPlayers').hidden = !r;
  $('#bHome').hidden = !r && S.local === 'home';
  $('#hearts').innerHTML = r ? heartsHTML(r.hearts) : '';
  renderRail();
  if (!r) return renderLocal();
  const key = r.phase + '|' + (r.cur ? r.cur.key + r.cur.startAt : '') + '|' + (r.wheel ? r.wheel.key + r.wheel.at : '');
  if (r.phase === 'play' && S.screenKey === key) { refreshPlay(); return; }
  if (S.mounted && r.phase !== 'play') { try { S.mounted.unmount && S.mounted.unmount(); } catch (e) {} S.mounted = null; S.gkey = null; }
  if (r.phase === 'play' && S.mounted && S.screenKey !== key) { try { S.mounted.unmount && S.mounted.unmount(); } catch (e) {} S.mounted = null; S.gkey = null; }
  if (r.phase !== 'final') S.finalFx = false;
  S.screenKey = key;
  ({ lobby: scLobby, wheel: scWheel, intro: scIntro, count: scCount, play: scPlay, after: scAfter, final: scFinal })[r.phase]();
  hostGoneBanner();
}
function renderRail() {
  const r = S.room, el = $('#rail');
  if (!r || r.phase === 'lobby') { el.innerHTML = ''; return; }
  const dm = doneMap(r); const cur = r.cur ? r.cur.key : r.intro ? r.intro.key : r.wheel ? null : null;
  el.innerHTML = r.done.map(d => `<i class="${d.skip ? 'sk' : d.ok ? 'ok' : 'no'}"></i>`).join('') + (cur && !dm[cur] ? '<i class="now"></i>' : '') + '<i></i>'.repeat(Math.max(0, 12 - r.done.length - (cur && !dm[cur] ? 1 : 0)));
}
function renderLocal() {
  S.screenKey = 'local:' + S.local;
  if (S.local === 'home') return scHome();
  return scForm(S.local);
}
function scHome() {
  setTick('📡 بلاغ جديد · 12 مهمة جماعية · 3 قلوب للقعدة كلها · يا منطلع سوا يا منوقع سوا · 📡');
  app.innerHTML = `<div class="screen cover">
    <div>
      <div class="radar"><div class="cross"></div><div class="sweep"></div><span class="blip" style="top:20%;right:27%"></span><span class="blip" style="top:62%;right:66%;animation-delay:.9s"></span><span class="blip" style="top:45%;right:14%;animation-delay:1.7s"></span></div>
      <div class="logo"><span class="q">قعدة</span><span class="n">فزعة</span></div>
      <div class="slogan">يا منطلع سوا، يا منوقع سوا</div>
      <div class="stats3"><div><b>12</b>مهمة</div><div><b>❤️ 3</b>للقعدة كلها</div><div><b>2 لـ12</b>لاعب</div></div>
    </div>
    <div>
      <button class="btn main" id="hc">🚨 افتح قعدة</button>
      <button class="btn alt" id="hj" style="margin-top:10px">🚪 فوت بكود</button>
      <div class="sig" style="margin-top:12px">إعداد م. إياد حلوبي</div>
    </div></div>`;
  $('#hc').onclick = () => { FZ.audio(); S.local = 'create'; S.join = {}; render(); };
  $('#hj').onclick = () => { FZ.audio(); S.local = 'join'; S.join = {}; render(); };
}
function scForm(mode) {
  const j = S.join; const create = mode === 'create';
  setTick(create ? '🛠️ عم نجهّز غرفة العمليات…' : '🚪 فوت عالقعدة بالكود');
  const types = ['شلة', 'رفقة', 'عيلة', 'زملاء'];
  const custom = j.rtype && !types.includes(j.rtype);
  app.innerHTML = `<div class="screen">
    <h2 class="t">${create ? 'افتح قعدة' : 'فوت عالقعدة'}</h2>
    ${create ? `<div class="card">
      <label class="f">اسم القعدة / العيلة / الرفقة *</label><input class="in" id="fn" maxlength="18" placeholder="مثلاً: سهرة الخميس" value="${esc(j.rname || '')}">
      <div class="sub" style="text-align:right;margin-top:4px">هالاسم بيطلع بصورة الستوري</div>
      <label class="f" style="margin-top:12px">نوع القعدة</label>
      <div class="chips" id="ft">${types.map(t => `<button class="chip${(j.rtype || 'شلة') === t ? ' on' : ''}" data-v="${t}">${t}</button>`).join('')}<button class="chip${custom ? ' on' : ''}" data-v="*">✍️ غير</button></div>
      <input class="in${custom ? '' : ' hidden'}" id="ftc" maxlength="20" placeholder="اكتبوا نوعها" style="margin-top:8px" value="${esc(custom ? j.rtype.trim() : '')}">
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
      ${j.photo ? '<button class="btn xs" id="pp0" style="margin-top:8px">شيل الصورة</button>' : ''}
    </div>
    <button class="btn main" id="fgo">${create ? '🚨 افتح القعدة' : '🚪 فوت'}</button>
    <button class="btn" id="fback">رجوع</button>
    <div class="sig">إعداد م. إياد حلوبي</div></div>`;
  const keep = () => { if (create) { j.rname = $('#fn').value; } else j.code = $('#fc').value; j.name = $('#pn').value; };
  if (create) {
    $$('#ft .chip').forEach(b => b.onclick = () => { keep(); if (b.dataset.v === '*') { j.rtype = ($('#ftc').value || '') + ' '; } else j.rtype = b.dataset.v; render(); if (b.dataset.v === '*') $('#ftc').focus(); });
    $('#ftc').oninput = e => j.rtype = e.target.value + ' ';
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
    if (create) FZ.send({ t: 'create', name: j.name, g: j.g, photo: j.photo, room: { name: j.rname, type: (j.rtype || 'شلة').trim() || 'شلة' } });
    else FZ.send({ t: 'join', code: j.code.trim().toUpperCase(), name: j.name, g: j.g, photo: j.photo });
  };
}

// ---------- اللاعبين ----------
function playerTile(p, extra = '') {
  return `<div class="pl ${extra}${p.online ? '' : ' off'}" data-id="${p.id}">${S.room.hostId === p.id ? '<span class="crown">👑</span>' : ''}${FZ.avHTML(p)}<div class="nm">${esc(p.name)}${p.id === S.me ? ' (إنت)' : ''}</div></div>`;
}
function bindTiles(root, fn) { $$('.pl', root).forEach(el => { const p = S.room.players.find(x => x.id === el.dataset.id); if (p && fn) { el.classList.add('tap'); el.onclick = () => fn(p); } }); }
// لوحة المشاركين — بأي وقت من الزر 👥
function playersPanel() {
  const r = S.room; if (!r) return; const host = isHost(); S.panel = true;
  const inMission = r.cur ? new Set(r.cur.act) : r.intro ? new Set(r.intro.active) : null;
  modal(`<h2 class="t" style="margin:4px 0">المشاركين (${r.players.filter(p => p.online).length}/12)</h2>
    ${host ? '<div class="sub">إنت الريس: فيك تعدّل أو تطلّع أي حدا بأي وقت</div>' : ''}
    ${r.players.map(p => `<div class="prow${p.online ? '' : ' off'}">${FZ.avHTML(p)}<div class="nm">${r.hostId === p.id ? '👑 ' : ''}${esc(p.name)}${p.id === S.me ? ' (إنت)' : ''}<small>${!p.online ? 'غايب' : inMission ? (inMission.has(p.id) ? 'عم يلعب' : 'مراقب 👀') : 'بالقعدة'}</small></div>
      ${p.id === S.me ? '<button class="btn xs" data-a="me">✏️</button>' : host ? `<button class="btn xs" data-a="ren" data-id="${p.id}">✏️</button><button class="btn xs" data-a="crown" data-id="${p.id}" ${p.online ? '' : 'disabled'}>👑</button><button class="btn xs warn" data-a="kick" data-id="${p.id}">طلّع</button>` : ''}</div>`).join('')}
    ${r.phase === 'lobby' ? `<button class="btn sm alt" id="ppInv">📤 ابعت رابط القعدة</button>` : ''}`, b => {
    $$('button[data-a]', b).forEach(bt => bt.onclick = () => {
      const p = r.players.find(x => x.id === bt.dataset.id);
      if (bt.dataset.a === 'me') return editMe();
      if (bt.dataset.a === 'ren') return modal(`<h2 class="t" style="margin:16px 0 4px">الاسم الجديد</h2><input class="in" id="nn" maxlength="18" value="${esc(p.name)}"><button class="btn main" id="ns">حفظ</button>`, b2 => { $('#ns', b2).onclick = () => { FZ.send({ t: 'rename', pid: p.id, name: $('#nn', b2).value }); playersPanel(); }; });
      if (bt.dataset.a === 'crown') return confirmBox(`تسلّم الريس لـ${esc(p.name)}؟`, 'إي', () => FZ.send({ t: 'handover', pid: p.id }));
      if (bt.dataset.a === 'kick') return confirmBox(`تطلّع ${esc(p.name)} من القعدة؟`, 'إي، طلّع', () => { FZ.send({ t: 'kick', pid: p.id }); setTimeout(playersPanel, 250); });
    });
    if ($('#ppInv', b)) $('#ppInv', b).onclick = shareLink;
  });
}
$('#bPlayers').onclick = playersPanel;
async function shareLink() { const u = mUrl(S.room.code); try { if (navigator.share) await navigator.share({ title: 'قعدة فزعة', text: 'فوت عالقعدة: ' + S.room.code, url: u }); else { await navigator.clipboard.writeText(u); FZ.toast('انسخ الرابط ✅'); } } catch (e) {} }
function editMe() {
  const p = meP(); let photo = FZ.photos[S.me] || null; let g = p.g, name = p.name;
  const draw = () => modal(`<h2 class="t" style="margin:10px 0 4px">عدّل حالك</h2>
    <label class="f">اسمك</label><input class="in" id="en" maxlength="18" value="${esc(name)}">
    <div class="gender chips" id="eg"><button class="chip${g === 'm' ? ' on' : ''}" data-v="m">شب</button><button class="chip${g === 'f' ? ' on' : ''}" data-v="f">صبية</button></div>
    <div class="row" style="align-items:center"><div class="av" style="width:60px;height:60px;flex:0 0 60px;background-color:${p.color};${photo ? `background-image:url(${photo})` : ''}"></div><button class="btn sm" id="e1">🖼️ صور</button><button class="btn sm" id="e2">🤳 سيلفي</button><button class="btn sm" id="e0">شيل</button></div>
    <button class="btn main" id="es">حفظ</button>`, b => {
    $$('#eg .chip', b).forEach(c => c.onclick = () => { g = c.dataset.v; $$('#eg .chip', b).forEach(x => x.classList.toggle('on', x === c)); });
    const nm = () => name = $('#en', b).value;
    $('#e1', b).onclick = () => { nm(); pickPhoto(false, d => { photo = d; draw(); }); };
    $('#e2', b).onclick = () => { nm(); pickPhoto(true, d => { photo = d; draw(); }); };
    $('#e0', b).onclick = () => { nm(); photo = null; draw(); };
    $('#es', b).onclick = () => { FZ.send({ t: 'profile', name: $('#en', b).value, g, photo: photo || '' }); closeModal(); };
  });
  draw();
}
function hostGoneBanner() {
  const r = S.room; if (!r || !r.hostGone || isHost() || r.phase === 'final') return;
  const b = h(`<button class="btn warn">👑 الريس غاب — استلم الريس</button>`); b.onclick = () => FZ.send({ t: 'claim' });
  $('.screen', app) && $('.screen', app).prepend(b);
}

// ---------- لوبي ----------
function scLobby() {
  const r = S.room; const host = isHost(); const on = r.players.filter(p => p.online);
  setTick(`📡 غرفة العمليات مفتوحة · الكود ${r.code} · ${on.length}/12 بالفريق · 📡`);
  app.innerHTML = `<div class="screen">
    <div class="screenbox" style="text-align:center;font-size:17px">📟 <b>${esc(r.name)}</b> · ${esc(r.type)}</div>
    <div class="card codebox"><img src="/qr?t=${encodeURIComponent(mUrl(r.code))}" alt="QR"><div style="flex:1;text-align:center"><div class="lbl" style="justify-content:center">كود القعدة</div><div class="code">${r.code}</div><button class="btn sm alt" id="ls">📤 ابعت الرابط</button></div></div>
    <div class="row" style="align-items:center"><div class="lbl">الفريق · ${on.length}/12</div>${host ? '<div class="sub" style="text-align:left">اكبس على حدا لتعدّله</div>' : ''}</div>
    <div class="plist">${r.players.map(p => playerTile(p)).join('')}</div>
    <button class="btn sm" id="lme">✏️ عدّل اسمي وصورتي</button>
    <div style="margin-top:auto"></div>
    ${host ? `<button class="btn main" id="lgo" ${on.length < 2 ? 'disabled' : ''}>🚨 يلا نبلّش</button><button class="btn sm" id="led">⚙️ اسم القعدة ونوعها</button>${on.length < 2 ? '<div class="sub">بدها لاعبين اتنين عالأقل</div>' : ''}` : `<div class="screenbox" style="text-align:center">⏳ استنّوا الريس ${G2(r.players.find(p => p.id === r.hostId), 'يبلّش', 'تبلّش')}</div>`}
    <div class="sig">إعداد م. إياد حلوبي</div></div>`;
  $('#ls').onclick = shareLink;
  $('#lme').onclick = editMe;
  bindTiles(app, host ? () => playersPanel() : null);
  if ($('#lgo')) $('#lgo').onclick = () => { FZ.audio(); FZ.send({ t: 'start' }); };
  if ($('#led')) $('#led').onclick = editRoom;
}
function editRoom() {
  const r = S.room;
  modal(`<h2 class="t" style="margin:10px 0 4px">القعدة</h2><label class="f">اسم القعدة / العيلة / الرفقة</label><input class="in" id="rn" maxlength="18" value="${esc(r.name)}">
    <label class="f">النوع</label><input class="in" id="rt" maxlength="20" value="${esc(r.type)}"><button class="btn main" id="rs">حفظ</button>`, b => {
    $('#rs', b).onclick = () => { const n = $('#rn', b).value.trim(); if (!n) return FZ.toast('اسم القعدة إجباري'); FZ.send({ t: 'roomedit', name: n, type: $('#rt', b).value.trim() || r.type }); closeModal(); };
  });
}

// ---------- الدولاب ----------
function scWheel() {
  const r = S.room; setTick('🎯 الدولاب عم يختار المهمة الجاية · 🎯');
  app.innerHTML = `<div class="screen" style="justify-content:center">
    <div class="lbl" style="justify-content:center">المهمة الجاية</div>
    <div class="wheelWrap"><canvas id="wc" width="660" height="660"></canvas><div class="pointer"></div><div class="hub">🎯</div></div>
    <div class="mtitle" id="wn">&nbsp;</div><div class="sub">${r.remaining} مهمات باقية</div></div>`;
  const cv = $('#wc'), c = cv.getContext('2d'), N = r.keys.length, seg = Math.PI * 2 / N;
  const idx = r.keys.indexOf(r.wheel.key); const dm = doneMap(r);
  const cols = ['#2b59ff', '#ff6b2c', '#c6f432', '#ffffff'];
  const target = -Math.PI / 2 - (idx * seg + seg / 2);
  const turns = 5 * Math.PI * 2; const DUR = 4300; const t0 = r.wheel.at;
  const draw = () => {
    if (!cv.isConnected) return;
    const el = Math.min(1, (sNow() - t0) / DUR); const e = 1 - Math.pow(1 - el, 3);
    const ang = target - turns * (1 - e);
    c.clearRect(0, 0, 660, 660); c.save(); c.translate(330, 330);
    for (let i = 0; i < N; i++) {
      const a0 = ang + i * seg; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 320, a0, a0 + seg); c.closePath();
      const k = r.keys[i]; c.fillStyle = dm[k] ? '#9a98a5' : cols[i % 4]; c.fill(); c.lineWidth = 6; c.strokeStyle = '#16161d'; c.stroke();
      c.save(); c.rotate(a0 + seg / 2); c.translate(232, 0); c.rotate(Math.PI / 2); c.font = '46px serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(!dm[k] ? FZ.GM[k].icon : ({ ok: '✅', no: '💥', sk: '⏭' })[dm[k]], 0, 0); c.restore();
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
  const d = it.dur || { easy: 0, hard: 0 }; const surv = gm.survival;
  app.innerHTML = `<div class="screen">
    ${it.retry ? '<div class="retryTag">🔁 إعادة — النتيجة القديمة انلغت</div>' : ''}
    <div class="mhead"><div class="mtile">${gm.icon}</div><div><div class="mt">${r.names[it.key]}</div><div class="ms">${gm.short}</div></div></div>
    <div class="screenbox"><ul class="rulelist">${gm.rules.map((x, i) => `<li><i>${i + 1}</i><span>${x}</span></li>`).join('')}</ul></div>
    <div class="lbl">الصعوبة ${host ? '' : '· الريس بيختار'}</div>
    <div class="seg" id="idf"><button class="${it.diff === 'easy' ? 'on' : ''}" data-v="easy">😌 سهل<small>${surv ? 'صمود ' : ''}${d.easy} ثانية</small></button><button class="${it.diff === 'hard' ? 'on h' : ''}" data-v="hard">🔥 صعب<small>${surv ? 'صمود ' : ''}${d.hard} ثانية</small></button></div>
    <div class="row" style="align-items:center"><div class="lbl">مين بيلعب${it.cap ? ` · ${it.cap} بالأكتر` : ''}</div>${host ? '<div class="sub" style="text-align:left">اكبس على حدا ليلعب أو يتفرّج</div>' : ''}</div>
    <div class="plist">${r.players.filter(p => p.online).map(p => playerTile(p, (act.has(p.id) ? '' : 'bench') + (rdy.has(p.id) ? ' rdy' : ''))).join('')}</div>
    <div style="margin-top:auto"></div>
    ${amActive ? `<button class="btn ${amReady ? '' : 'alt'}" id="ir" ${amReady ? 'disabled' : ''}>${amReady ? '✓ جاهز — استنّى الباقيين' : '✋ ' + G2(meP(), 'جاهز', 'جاهزة')}</button>` : `<div class="screenbox" style="text-align:center">👀 إنت مراقب${G2(meP(), '', 'ة')} بهالمهمة</div>`}
    ${host ? `<button class="btn main" id="igo">▶ ابدأ هلق</button>
      <div class="hostbar"><button class="btn sm" id="isk">⏭ مرّر هالمهمة</button>${it.cap ? '<button class="btn sm" id="ish">🎲 قرعة مين بيلعب</button>' : ''}</div>` : ''}
    <div class="sub">بتبلّش لحالها لما الكل يكون جاهز (${[...rdy].filter(x => act.has(x)).length}/${act.size})</div></div>`;
  $$('#idf button').forEach(b => { if (host) b.onclick = () => FZ.send({ t: 'diff', v: b.dataset.v }); else b.style.pointerEvents = 'none'; });
  if (host) bindTiles(app, p => FZ.send({ t: 'toggle', pid: p.id }));
  if ($('#ish')) $('#ish').onclick = () => FZ.send({ t: 'shuffleActive' });
  if ($('#isk')) $('#isk').onclick = () => confirmBox('تمرّر «' + r.names[it.key] + '»؟<div class="sub" style="margin-top:6px">بتطلع من الدولاب وما بتاخد قلب</div>', '⏭ مرّر', () => FZ.send({ t: 'skip' }));
  if ($('#ir')) $('#ir').onclick = () => { FZ.audio(); if (it.key === 'balance') FZ.askMotion(); FZ.send({ t: 'ready' }); };
  if ($('#igo')) $('#igo').onclick = () => { FZ.audio(); if (it.key === 'balance') FZ.askMotion(); FZ.send({ t: 'go' }); };
}

// ---------- العد ----------
function scCount() {
  const r = S.room, gm = FZ.GM[r.cur.key]; setTick('⏱️ استعدوا… ⏱️');
  const act = r.cur.act.includes(S.me);
  app.innerHTML = `<div class="screen" style="justify-content:center;align-items:center">
    <div class="mhead"><div class="mtile">${gm.icon}</div><div class="mt">${r.names[r.cur.key]}</div></div>
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
    <div class="console"><div class="ci">${gm.icon}</div><div class="cn"><b>${r.names[key]}</b><small>${r.cur.diff === 'easy' ? '😌 سهل' : '🔥 صعب'} · ${gm.short}</small></div><div class="timer${r.cur.noTimer ? ' hidden' : ''}" id="pt">--</div></div>
    <div class="taunt" id="ptn">${TAUNTS[0]}</div>
    <div class="stage" id="stage"></div>
    ${isHost() ? '<div class="hostbar"><span class="lbl">الريس</span><button class="btn xs" id="hre">🔁 عيد المهمة</button><button class="btn xs" id="hsk">⏭ مرّر</button></div>' : ''}</div>`;
  S.mounted = null; S.gkey = null;
  if (S.g && S.gkey0 === key) mountGame();
  if ($('#hre')) $('#hre').onclick = () => confirmBox('نعيد المهمة من الأول؟', '🔁 عيد', () => FZ.send({ t: 'retry' }));
  if ($('#hsk')) $('#hsk').onclick = () => confirmBox('نمرّر هالمهمة؟<div class="sub" style="margin-top:6px">ما بتاخد قلب</div>', '⏭ مرّر', () => FZ.send({ t: 'skip' }));
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
  S.g = m.v; S.gkey0 = m.key; S.endsAt = FZ.endsAt = m.endsAt;
  const wasSpect = S.spectator; S.spectator = m.spectator;
  if (!S.room || S.room.phase !== 'play') return;
  if (S.gkey === m.key && S.mounted && wasSpect === m.spectator) { try { S.mounted.update && S.mounted.update(m.v); } catch (e) { console.error(e); } }
  else { if (S.mounted && S.mounted.unmount) try { S.mounted.unmount(); } catch (e) {} mountGame(); }
}

// ---------- بعد المهمة ----------
function scAfter() {
  const r = S.room, a = r.after, gm = FZ.GM[a.key], host = isHost();
  if (a.ok) { FZ.sfx.win(); confetti(); } else { FZ.sfx.lose(); FZ.flash('#e5383b'); vib([100, 60, 100]); }
  setTick(a.ok ? `✅ المهمة تمّت · ${a.taunt} · ✅` : `💥 المهمة فشلت · راح قلب · ${a.taunt} · 💥`);
  const pulseRes = a.key === 'pulse' && S.g && S.g.res ? `<div class="card" style="text-align:center"><b>ضبط الإيقاع: ${Math.round(S.g.res.avg * 100)}%</b></div>` : '';
  const sc = score(r);
  app.innerHTML = `<div class="screen" style="justify-content:center;text-align:center">
    <div class="mhead" style="justify-content:center"><div class="mtile">${gm.icon}</div><div class="mt">${r.names[a.key]}</div></div>
    <div class="stamp ${a.ok ? 'ok' : 'no'}">${a.ok ? 'تمّت المهمة ✓' : 'فشلت المهمة ✗'}</div>
    ${a.why ? `<div class="sub">${esc(a.why)}</div>` : ''}
    <div class="taunt">${esc(a.taunt)}</div>${pulseRes}
    <div class="hearts" style="justify-content:center;font-size:40px">${heartsHTML(r.hearts)}</div>
    <div class="screenbox">✅ ${sc.wins} نجحت · 💥 ${r.done.filter(d => !d.ok && !d.skip).length} فشلت${sc.skipped ? ' · ⏭ ' + sc.skipped + ' مرّرناها' : ''} · ${r.remaining} باقية</div>
    ${host ? `${a.last ? '' : '<button class="btn main" id="an">🎯 المهمة الجاية</button>'}
      <button class="btn ${a.ok ? '' : 'alt'}" id="are">🔁 عيد المهمة${a.ok ? '' : ' ويرجع القلب ❤️'}</button>` : ''}
    ${a.last ? '<div class="sub">النتيجة جاية… 🥁</div>' : a.autoAt ? `<div class="sub">${host ? 'أو' : ''} الدولاب بيدور لحاله بعد شوي</div><div class="autoline"><i id="al"></i></div>` : ''}</div>`;
  if ($('#an')) $('#an').onclick = () => FZ.send({ t: 'next' });
  if ($('#are')) $('#are').onclick = () => FZ.send({ t: 'retry' });
  if (a.autoAt && $('#al')) { const tot = a.autoAt - sNow(); const el = $('#al'); const tk = () => { if (!el.isConnected) return; const k = Math.max(0, (a.autoAt - sNow()) / Math.max(1, tot)); el.style.transform = `scaleX(${k})`; if (k > 0) requestAnimationFrame(tk); }; tk(); }
}
function confetti() {
  const cols = ['#2b59ff', '#ff6b2c', '#c6f432', '#7b2ff7', '#fff']; const box = document.createElement('div'); box.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:45;overflow:hidden';
  for (let i = 0; i < 70; i++) { const d = document.createElement('i'); const s = 6 + Math.random() * 8; d.style.cssText = `position:absolute;top:-20px;left:${Math.random() * 100}%;width:${s}px;height:${s * 1.6}px;background:${cols[i % 5]};border:2px solid #16161d;transform:rotate(${Math.random() * 360}deg);transition:transform 2.2s cubic-bezier(.2,.6,.4,1),top 2.2s cubic-bezier(.2,.6,.4,1)`; box.appendChild(d); setTimeout(() => { d.style.top = (70 + Math.random() * 40) + '%'; d.style.transform = `rotate(${Math.random() * 720}deg)`; }, 30); }
  document.body.appendChild(box); setTimeout(() => box.remove(), 2600);
}

// ---------- النتيجة النهائية ----------
function groupTitle(wins, total) { const k = total ? wins / total : 0; return k >= 1 ? 'فزعة ولا أحلى' : k >= 0.75 ? 'فريق طوارئ' : k >= 0.5 ? 'منعتمد عليكن' : k >= 0.25 ? 'نص فزعة' : 'بدها تمرين'; }
function scFinal() {
  const r = S.room; const sc = score(r); const host = isHost(); const title = groupTitle(sc.wins, sc.total);
  S.story = S.story || { lay: 0, dark: false };
  setTick(`🏁 انتهت العمليات · ${sc.wins}/${sc.total} مهمة · ${title} · 🏁`);
  if (!S.finalFx) { S.finalFx = true; if (sc.wins >= sc.total / 2) { confetti(); FZ.sfx.win(); } }
  const dm = doneMap(r); const last = r.done[r.done.length - 1];
  app.innerHTML = `<div class="screen">
    <div class="screenbox" style="text-align:center;font-size:17px">📟 <b>${esc(r.name)}</b> · ${esc(r.type)}</div>
    <div style="text-align:center"><div class="lbl" style="justify-content:center">لقب القعدة</div><div class="logo" style="margin-top:4px"><span class="n" style="font-size:40px">${title}</span></div></div>
    <div class="row" style="text-align:center"><div class="card"><div class="big" style="font-size:44px">${sc.wins}<span style="font-size:20px">/${sc.total}</span></div><div class="sub">مهمة نجحت${sc.skipped ? ` · ⏭ ${sc.skipped}` : ''}</div></div><div class="card"><div class="hearts" style="justify-content:center;font-size:30px;margin:8px 0">${heartsHTML(r.hearts)}</div><div class="sub">قلوب باقية</div></div></div>
    ${host && r.canRetry && last && !last.ok ? `<button class="btn alt" id="fre">🔁 عيد آخر مهمة (${r.names[last.key]}) ويرجع القلب</button>` : ''}
    <div class="mgrid">${r.keys.map(k => `<div class="mg ${dm[k] || 'na'}"><div class="e">${FZ.GM[k].icon}</div>${r.names[k]}</div>`).join('')}</div>
    <div class="plist">${r.players.map(p => playerTile(p)).join('')}</div>
    <h2 class="t" style="margin-top:6px">صورة الستوري 📸</h2>
    ${host ? `<div class="card" style="padding:10px"><div class="lbl">صورة الشلة (بتطلع كاملة بلا قص)</div><div class="row" style="margin-top:8px"><button class="btn sm" id="sg1">👥 من الصور</button><button class="btn sm" id="sg2">📷 صوّروا هلق</button>${FZ.gphoto ? '<button class="btn sm" id="sg0">شيلها</button>' : ''}</div></div>` : (FZ.gphoto ? '' : '<div class="sub">الريس بيقدر يحط صورة الشلة 📷</div>')}
    <div class="chips" style="justify-content:center" id="sl">${['بلاغ', 'رادار', 'شهادة'].map((n, i) => `<button class="chip${S.story.lay === i ? ' on' : ''}" data-v="${i}">${n}</button>`).join('')}</div>
    <div class="chips" style="justify-content:center" id="sd"><button class="chip${!S.story.dark ? ' on' : ''}" data-v="0">☀️ فاتح</button><button class="chip${S.story.dark ? ' on' : ''}" data-v="1">🌙 داكن</button></div>
    <canvas class="story" id="sc" width="1080" height="1920"></canvas>
    <div class="row"><button class="btn main" id="sdl">⬇️ نزّل الصورة</button><button class="btn alt" id="ssh">📤 شاركها</button></div>
    ${host ? '<button class="btn sm" id="sre">✏️ اسم القعدة</button>' : ''}
    <button class="btn" id="sig">💬 شارك مع صحابك</button>
    <div class="card hidden" id="inst"><b>📲 نزّل اللعبة عموبايلك</b><p class="sub" id="instT" style="text-align:right;margin:6px 0">بتفتح متل التطبيق بكبسة وحدة</p><button class="btn sm main" id="instB">نزّلها</button></div>
    <button class="btn warn" id="snew">🏠 قعدة جديدة</button>
    <div class="sig"><span dir="ltr">@eyad.hloubi</span> · صار بدها قعدة.</div></div>`;
  $$('#sl .chip').forEach(b => b.onclick = () => { S.story.lay = +b.dataset.v; scFinal(); });
  $$('#sd .chip').forEach(b => b.onclick = () => { S.story.dark = b.dataset.v === '1'; scFinal(); });
  drawStory($('#sc'), sc, title);
  $('#sdl').onclick = () => { $('#sc').toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'qa3da-faz3a.png'; a.click(); }, 'image/png'); };
  $('#ssh').onclick = () => { $('#sc').toBlob(async b => { const f = new File([b], 'qa3da-faz3a.png', { type: 'image/png' }); try { if (navigator.canShare && navigator.canShare({ files: [f] })) await navigator.share({ files: [f], title: 'قعدة فزعة' }); else $('#sdl').click(); } catch (e) {} }, 'image/png'); };
  $('#sig').onclick = async () => { try { if (navigator.share) await navigator.share({ title: 'صار بدها قعدة', url: IG }); else window.open(IG, '_blank'); } catch (e) {} };
  if ($('#fre')) $('#fre').onclick = () => FZ.send({ t: 'retry' });
  if (host) {
    $('#sg1').onclick = () => pickGroup(false, d => FZ.send({ t: 'gphoto', data: d }));
    $('#sg2').onclick = () => pickGroup(true, d => FZ.send({ t: 'gphoto', data: d }));
    if ($('#sg0')) $('#sg0').onclick = () => FZ.send({ t: 'gphoto', data: '' });
    $('#sre').onclick = editRoom;
  }
  $('#snew').onclick = () => newSession();
  setupInstall();
}
function newSession() { FZ.send({ t: 'leave' }); LS.del('fz_session'); S.room = FZ.room = null; S.finalFx = false; S.story = null; FZ.gphoto = null; FZ.photos = {}; S.local = 'home'; closeModal(); render(); }

// ---------- صورة الستوري ----------
function loadImg(src) { return new Promise(res => { if (!src) return res(null); const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }); }
async function drawStory(cv, sc, title) {
  const r = S.room, c = cv.getContext('2d'), W = 1080, H = 1920, dark = S.story.dark, lay = S.story.lay;
  try { await Promise.all(['800 40px Changa', '800 40px Cairo', '600 40px Cairo'].map(f => document.fonts.load(f, 'قعدة'))); } catch (e) {}
  const me = meP() || r.players[0]; const meImg = await loadImg(FZ.photos[me.id]); const gImg = await loadImg(FZ.gphoto);
  const imgs = {}; for (const p of r.players) imgs[p.id] = await loadImg(FZ.photos[p.id]);
  const BG = dark ? '#0e1126' : '#f4f1e8', TX = dark ? '#f3f1ff' : '#16161d', CARD = dark ? '#1a1f45' : '#ffffff', LN = dark ? '#e9ecff' : '#16161d', SH = dark ? '#000' : '#16161d', MU = dark ? '#a6a9cc' : '#6b6a75';
  const A = '#2b59ff', B = '#ff6b2c', C = '#c6f432', SCR = '#121735';
  c.direction = 'rtl'; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  c.fillStyle = BG; c.fillRect(0, 0, W, H);
  c.strokeStyle = dark ? 'rgba(233,236,255,.05)' : 'rgba(22,22,29,.06)'; c.lineWidth = 2; for (let x = 0; x < W; x += 60) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); } for (let y = 0; y < H; y += 60) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  function rr(x, y, w, h, rd) { c.beginPath(); c.moveTo(x + rd, y); c.arcTo(x + w, y, x + w, y + h, rd); c.arcTo(x + w, y + h, x, y + h, rd); c.arcTo(x, y + h, x, y, rd); c.arcTo(x, y, x + w, y, rd); c.closePath(); }
  const box = (x, y, w, h, fill, rad = 34, sh = 12) => { c.fillStyle = SH; rr(x + sh, y + sh, w, h, rad); c.fill(); c.fillStyle = fill; rr(x, y, w, h, rad); c.fill(); c.lineWidth = 8; c.strokeStyle = LN; c.stroke(); };
  const circ = (img, p, x, y, rad, ring) => { c.save(); c.beginPath(); c.arc(x, y, rad, 0, 7); c.fillStyle = p.color; c.fill(); c.clip(); if (img) c.drawImage(img, x - rad, y - rad, rad * 2, rad * 2); else { c.fillStyle = '#fff'; c.font = `800 ${rad}px Changa`; c.textBaseline = 'middle'; c.fillText((p.name || '؟')[0], x, y + rad * 0.05); c.textBaseline = 'alphabetic'; } c.restore(); c.beginPath(); c.arc(x, y, rad, 0, 7); c.lineWidth = ring || 8; c.strokeStyle = LN; c.stroke(); };
  const text = (t, x, y, size, color, w = 800, font = 'Changa') => { c.font = `${w} ${size}px ${font}`; c.fillStyle = color; c.fillText(t, x, y); };
  const tag = (t, x, y, size, bg, fg, rot = -0.05) => { c.save(); c.translate(x, y); c.rotate(rot); c.font = `800 ${size}px Changa`; const tw = c.measureText(t).width + size; box(-tw / 2, -size * 1.05, tw, size * 1.55, bg, 16, 10); c.fillStyle = fg; c.fillText(t, 0, size * 0.22); c.restore(); };
  // صورة الشلة كاملة (بلا قص) جوّا إطار
  const groupFrame = (x, y, w, h) => {
    const s = Math.min((w - 30) / gImg.width, (h - 30) / gImg.height); const iw = gImg.width * s, ih = gImg.height * s;
    const fx = x + (w - iw) / 2 - 15, fy = y + (h - ih) / 2 - 15; box(fx, fy, iw + 30, ih + 30, '#fff', 22, 12);
    c.drawImage(gImg, fx + 15, fy + 15, iw, ih); c.lineWidth = 4; c.strokeStyle = '#16161d'; c.strokeRect(fx + 15, fy + 15, iw, ih);
    return { x: fx, y: fy, w: iw + 30, h: ih + 30 };
  };
  const team = (y, rad) => { const ps = r.players.slice(0, 12); const gap = Math.min(150, (W - 120) / Math.min(6, ps.length)); ps.forEach((p, i) => { const row = Math.floor(i / 6), col = i % 6, cnt = Math.min(6, ps.length - row * 6); const x = W / 2 + (col - (cnt - 1) / 2) * gap; const yy = y + row * (rad * 2 + 26); const mine = p.id === me.id; circ(imgs[p.id], p, x, yy, mine ? rad * 1.12 : rad, mine ? 10 : 6); if (mine) { c.beginPath(); c.arc(x, yy, rad * 1.12 + 12, 0, 7); c.lineWidth = 8; c.strokeStyle = B; c.stroke(); } }); };
  const mission = () => { const dm = doneMap(r); return r.keys.map(k => ({ ok: '✅', no: '💥', sk: '⏭' })[dm[k]] || '⬜').join(''); };
  const hearts = () => [0, 1, 2].map(i => i < r.hearts ? '❤️' : '🤍').join(' ');
  // الشريط العلوي + شعار قعدة
  c.fillStyle = SCR; c.fillRect(0, 0, W, 96); c.fillStyle = C; c.font = '800 38px Changa'; c.fillText('📡 ' + r.name + ' · ' + r.type, W / 2, 62);
  for (let i = 0; i < 40; i++) { c.fillStyle = i % 2 ? '#16161d' : '#ffd400'; c.beginPath(); c.moveTo(i * 60, 96); c.lineTo(i * 60 + 30, 96); c.lineTo(i * 60, 124); c.lineTo(i * 60 - 30, 124); c.fill(); }
  const logo = (y, k = 1) => { c.save(); c.translate(W / 2, y); c.rotate(0.03); c.font = `800 ${44 * k}px Changa`; let tw = c.measureText('قعدة').width + 40 * k; c.fillStyle = '#16161d'; rr(-tw / 2, -46 * k, tw, 70 * k, 14 * k); c.fill(); c.fillStyle = '#fff'; c.fillText('قعدة', 0, 4 * k); c.restore(); tag('فزعة', W / 2, y + 96 * k, 74 * k, B, '#fff', -0.07); };
  const footer = () => { c.direction = 'ltr'; text('@eyad.hloubi', W / 2, H - 100, 46, TX); c.direction = 'rtl'; text('صار بدها قعدة.', W / 2, H - 44, 34, MU, 600, 'Cairo'); };
  if (lay === 0) { // بلاغ: صورتي كبيرة + صورة الشلة كاملة
    logo(210, 0.75);
    circ(meImg, me, 540, 560, 210, 12); c.beginPath(); c.arc(540, 560, 232, 0, 7); c.lineWidth = 10; c.strokeStyle = B; c.stroke();
    tag(me.name, 540, 860, 76, A, '#fff', -0.04);
    text('لقب القعدة', 540, 980, 38, MU, 600, 'Cairo'); text(title, 540, 1065, 92, B);
    box(140, 1110, 800, 150, SCR, 28); text(`${sc.wins}/${sc.total} مهمة · ${hearts()}`, 540, 1208, 58, C);
    if (gImg) groupFrame(110, 1290, 860, 440); else { text(mission(), 540, 1350, 46, TX, 400, 'serif'); team(1470, 56); }
  } else if (lay === 1) { // رادار: صورتي بالنص، الشلة حولي، وصورة الشلة تحت
    logo(200, 0.8);
    const cy = gImg ? 720 : 860, R = gImg ? 340 : 400;
    c.fillStyle = SCR; c.beginPath(); c.arc(540, cy, R, 0, 7); c.fill(); c.lineWidth = 10; c.strokeStyle = LN; c.stroke();
    c.strokeStyle = 'rgba(198,244,50,.4)'; c.lineWidth = 5; [R * 0.75, R * 0.5].forEach(q => { c.beginPath(); c.arc(540, cy, q, 0, 7); c.stroke(); });
    if (c.createConicGradient) { c.save(); c.beginPath(); c.arc(540, cy, R, 0, 7); c.clip(); const g = c.createConicGradient(-1, 540, cy); g.addColorStop(0, 'rgba(198,244,50,.45)'); g.addColorStop(0.18, 'rgba(198,244,50,0)'); g.addColorStop(1, 'rgba(198,244,50,0)'); c.fillStyle = g; c.fillRect(540 - R, cy - R, 2 * R, 2 * R); c.restore(); }
    circ(meImg, me, 540, cy, R * 0.42, 12);
    const others = r.players.filter(p => p.id !== me.id).slice(0, 11); others.forEach((p, i) => { const a = -Math.PI / 2 + (i + 0.5) * (Math.PI * 2 / Math.max(others.length, 1)); circ(imgs[p.id], p, 540 + Math.cos(a) * R * 0.76, cy + Math.sin(a) * R * 0.76, 44, 6); });
    tag(me.name, 540, cy + R + 70, 70, C, '#16161d', 0.03);
    text(title, 540, cy + R + 190, 84, A); text(`${sc.wins}/${sc.total} مهمة · ${hearts()}`, 540, cy + R + 270, 52, TX);
    if (gImg) groupFrame(170, cy + R + 300, 740, H - (cy + R + 300) - 160);
  } else { // شهادة
    box(70, 160, 940, 1590, CARD, 50, 16);
    text('شهادة فزعة', 540, 290, 70, TX); logo(370, 0.55);
    circ(meImg, me, 540, gImg ? 640 : 700, gImg ? 175 : 230, 14); tag(me.name, 540, gImg ? 880 : 1000, 72, A, '#fff', -0.03);
    const ty = gImg ? 990 : 1130;
    text('بتشهد القعدة إنو ' + G2(me, 'كان من فريق', 'كانت من فريق'), 540, ty, 42, MU, 800, 'Cairo');
    text('«' + title + '»', 540, ty + 95, 84, B);
    text(`${sc.wins}/${sc.total} مهمة · ${hearts()}`, 540, ty + 180, 50, TX);
    c.save(); c.translate(830, gImg ? 760 : 820); c.rotate(-0.22); c.lineWidth = 8; c.strokeStyle = sc.wins >= sc.total / 2 ? '#12a36b' : B; c.strokeRect(-150, -55, 300, 110); c.fillStyle = c.strokeStyle; c.font = '800 46px Changa'; c.fillText(sc.wins >= sc.total / 2 ? 'تمّت المهمة' : 'بدها إعادة', 0, 16); c.restore();
    if (gImg) groupFrame(130, ty + 220, 820, 1720 - (ty + 220)); else team(ty + 320, 50);
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
const NAMES = { count: 'عدّوا سوا', keyboard: 'الكيبورد المقسوم', balance: 'الميزان', tower: 'البرج', glass: 'عبّوا الكاسة', bridge: 'الجسر', bomb: 'فكّ القنبلة', pulse: 'النبض', drum: 'الطبلة', puzzle: 'البازل المقسوم', twister: 'تويستر الأصابع', fire: 'الإطفائية' };
$('#bHelp').onclick = () => {
  modal(`<div class="help"><h2 class="t" style="margin:6px 0">كيف منلعب؟ 🚨</h2>
    <p>قعدة فزعة لعبة جماعية: ما في حدا بيربح لحالو — <b>يا منطلع سوا، يا منوقع سوا</b>.</p>
    <p>▸ الريس بيفتح القعدة والباقي بيفوتوا بالكود أو الـQR، من 2 لـ12 لاعب.<br>▸ الدولاب بيختار المهمة، والكل بيلعبها سوا كل واحد من موبايله.<br>▸ 3 قلوب للقعدة كلها: كل مهمة بتفشل بتاخد قلب، وإذا خلصوا خلصت القعدة.<br>▸ السهل والصعب نفس المهمة — الفرق بالوقت بس.<br>▸ <b>⏭ مرّر</b>: الريس بيطلّع المهمة من الدولاب بلا ما تاخد قلب.<br>▸ <b>🔁 عيد</b>: الريس بيعيد المهمة بأي لحظة، والنتيجة القديمة بتنلغى — وإذا كانت فشل القلب بيرجع.<br>▸ بالمهمات الصعبة الريس بيقدر يخلّي كم حدا يتفرّجوا 👀.<br>▸ من زر 👥 الريس بيطلّع أو بيعدّل أي حدا بأي وقت، أو بيسلّم الريس لغيره. وإذا غاب الريس حدا تاني بيستلم.<br>▸ زر 🏠 فوق: خلّصنا وشوفوا النتيجة، أو قعدة جديدة.</p>
    ${Object.keys(FZ.GM).map(k => `<h3>${FZ.GM[k].icon} ${NAMES[k]}</h3><p>${FZ.GM[k].rules.join(' ')}</p>`).join('')}
    <h3>📚 المرجع</h3><p>مبنية على فكرة الألعاب التعاونية الجماعية (Cooperative Party Games): الفريق كله ضد اللعبة، والنجاح بالتنسيق والتواصل مو بالمنافسة.</p>
    <p style="margin-top:10px"><b>إعداد م. إياد حلوبي</b></p></div>`);
};
$('#bHome').onclick = () => {
  const r = S.room;
  if (!r) { S.local = 'home'; return render(); }
  if (r.phase === 'final') return confirmBox('قعدة جديدة؟', '🏠 إي', newSession);
  if (isHost()) modal(`<h2 class="t" style="margin:12px 0 4px">🏠 شو بدك؟</h2>
    ${r.phase !== 'lobby' ? '<button class="btn alt" id="xe">🏁 خلّصنا — اعرضوا النتيجة لوين وصلنا</button>' : ''}
    <button class="btn warn" id="xn">🔁 قعدة جديدة من الأول</button><button class="btn" id="xc">رجوع للعب</button>`, b => {
    if ($('#xe', b)) $('#xe', b).onclick = () => { closeModal(); FZ.send({ t: 'end' }); };
    $('#xn', b).onclick = () => { closeModal(); if (r.phase !== 'lobby') FZ.send({ t: 'end' }); setTimeout(newSession, 250); };
    $('#xc', b).onclick = closeModal;
  });
  else confirmBox('تطلع من القعدة وتبلّش قعدة جديدة؟', '🏠 إي', newSession);
};

// ---------- بداية ----------
(function boot() {
  const c = new URLSearchParams(location.search).get('c');
  if (c && !LS.get('fz_session')) { S.local = 'join'; S.join = { code: c.toUpperCase() }; }
  if (c) history.replaceState(null, '', '/');
  render(); connect();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
