// ===== おたすけ計算：画面 =====
(function () {
  'use strict';
  const K = window.OTASUKE, C = 56, VER = '1.0.0';
  const $ = id => document.getElementById(id);
  const rb = s => String(s).replace(/(\d+(?:[＋−＝]\d+)+＝?)/g, '<span class="nb">$1</span>').replace(/\{([^|}]+)\|([^}]+)\}/g, '<ruby>$1<rt>$2</rt></ruby>');
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // ---- 効果音（ファイルを差しかえるときは ここの名前を そのままに） ----
  const SE_SRC = { ok: 'assets/se/ok.mp3', ng: 'assets/se/ng.mp3', btn: 'assets/se/btn.mp3', pop: 'assets/se/pop.mp3',
    tap: 'assets/se/tap.mp3', cheer: 'assets/se/cheer.mp3', clear: 'assets/se/clear.mp3' };
  const VOL = { ok: .6, ng: .55, btn: .5, pop: .55, tap: .45, cheer: .55, clear: .65 };
  const SE = {};
  for (const k in SE_SRC) { try { SE[k] = new Audio(SE_SRC[k]); SE[k].preload = 'auto'; } catch (e) { } }
  function se(k) {
    if (!S.sound || !SE[k]) return;
    try { const a = SE[k].cloneNode(); a.volume = VOL[k]; const p = a.play(); if (p) p.catch(() => { }); } catch (e) { }
  }

  // ---- せってい・じょうたい ----
  const S = { split: 'back', sub: 'kagen', sound: true, view: 'blk' };
  // mode：'help'（問題おたすけ）／'chal'（問題挑戦）　lv：'many'／'some'／'none'
  const G = { mode: null, kind: null, lv: 'many', queue: [], qi: 0, score: 0, res: [] };
  const st = { phase: 'home', f: '', fmsg: null, prob: null, plan: null, idx: 0, inp: '', post: false, msg: null, timer: null, taps: {}, ct: [], rvFinal: false, scored: null };
  const cur = () => (st.plan && st.idx < st.plan.steps.length ? st.plan.steps[st.idx] : null);
  const SYM = { '+': '＋', '-': '−' };
  const KINDS = [
    ['add0', 'くりあがり なし', 'たし{算|ざん}', 'g-cyan'], ['add1', 'くりあがり あり', 'たし{算|ざん}', 'g-orange'],
    ['sub0', 'くりさがり なし', 'ひき{算|ざん}', 'g-green'], ['sub1', 'くりさがり あり', 'ひき{算|ざん}', 'g-pink']];
  const LVS = [['many', 'たくさん', 'ブロックや さくらんぼで いっしょに', 'g-orange'], ['some', 'すこし', 'こまったら アシストを みる', 'g-cyan'], ['none', 'なし', 'じぶんの ちからで ちょうせん', 'g-navy']];

  // ---- ステージを 画面に あわせる ----
  function fit() {
    const s = Math.min(window.innerWidth / 1600, window.innerHeight / 900);
    $('stage').style.transform = `translate(-50%,-50%) scale(${s})`;
  }
  window.addEventListener('resize', fit);

  // ---- 5mm方眼ノート ----
  function drawGrid() {
    const W = K.COLS * C, Hh = K.ROWS * C, h = C / 2;
    let s = `<rect x="0" y="0" width="${W}" height="${Hh}" fill="#fff"/>`;
    for (let x = h; x < W; x += C) s += `<line x1="${x}" y1="0" x2="${x}" y2="${Hh}" stroke="#9fd3ea" stroke-width="1" stroke-dasharray="2 3"/>`;
    for (let y = h; y < Hh; y += C) s += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#9fd3ea" stroke-width="1" stroke-dasharray="2 3"/>`;
    for (let x = C; x < W; x += C) s += `<line x1="${x}" y1="0" x2="${x}" y2="${Hh}" stroke="#4aaad6" stroke-width="1.6"/>`;
    for (let y = C; y < Hh; y += C) s += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#4aaad6" stroke-width="1.6"/>`;
    s += `<line x1="${C}" y1="0" x2="${C}" y2="${C}" stroke="#2b8fc4" stroke-width="2.4"/>`;
    s += `<rect x="0" y="0" width="${W}" height="${Hh}" fill="none" stroke="#2b8fc4" stroke-width="3.5"/>`;
    const t = (x, y, v, a) => `<text x="${x}" y="${y}" font-size="13" fill="#2b8fc4" text-anchor="${a || 'middle'}" font-family="sans-serif">${v}</text>`;
    for (let u = 5; u * h < W; u += 5) { s += t(u * h, -5, u); s += t(u * h, Hh + 16, u); }
    for (let u = 5; u * h < Hh; u += 5) { s += t(-9, u * h + 4, u); s += t(W + 9, u * h + 4, u); }
    $('grid').innerHTML = s;
  }

  // ---- 印の じょうたい ----
  function ap(m, add) { (add || []).forEach(x => m.set(x.id, x)); }
  function marksAt(idx, withPre) {
    const m = new Map(), P = st.plan, ss = P.steps;
    ap(m, P.base);
    for (let k = 0; k < idx && k < ss.length; k++) { ap(m, ss[k].pre); ap(m, ss[k].add); }
    if (withPre && idx < ss.length) ap(m, ss[idx].pre);
    return m;
  }
  const solving = () => st.phase === 'solve' || st.phase === 'done';

  // ---- かく ----
  function render(o) {
    o = o || {};
    const nw = o.nw || new Set();
    const marks = solving() ? marksAt(st.idx, !st.post) : new Map();
    let h = '', lines = '';
    for (const m of marks.values()) {
      if (m.k === 'sak') { lines += sakSvg(m, nw.has(m.id)); continue; }
      const cls = 'mk ' + m.k + (m.u ? ' u' : '') + (m.cl ? ' ' + m.cl : '') + (nw.has(m.id) ? ' nw' : '');
      h += `<div class="${cls}" style="left:${m.c * C}px;top:${m.r * C}px">${m.t}</div>`;
    }
    $('markL').innerHTML = h;
    $('lineL').innerHTML = lines;
    // 蛍光ペン（よこに ならんだ マスは 1本に）
    let hh = '';
    const s = cur();
    if (st.phase === 'solve' && s && !st.post) {
      const cells = (s.hl || []).slice().sort((p, q) => p[0] - q[0] || p[1] - q[1]);
      const runs = [];
      cells.forEach(([r, c]) => { const l = runs[runs.length - 1]; if (l && l.r === r && l.c2 === c - 1) l.c2 = c; else if (!(l && l.r === r && l.c2 >= c)) runs.push({ r, c1: c, c2: c }); });
      runs.forEach((u, i) => { hh += `<div class="hl" style="left:${u.c1 * C + 3}px;top:${u.r * C + 5}px;width:${(u.c2 - u.c1 + 1) * C - 6}px;height:${C - 10}px;animation-delay:${i * 0.08}s"></div>`; });
    }
    $('hlL').innerHTML = hh;
    renderBox();
    renderFig(o);
    renderSay();
    renderBtns();
    renderTop();
  }
  // さくらんぼ（くき＝黒、まる＝赤）
  function sakSvg(m, isNew) {
    const x0 = m.x0 * C, y0 = C + 6, cls = isNew ? ' class="dr"' : '';
    let s = '';
    m.rings.forEach(([c1, c2], i) => {
      const cx = (c1 + c2 + 1) / 2 * C, rx = (c2 - c1 + 1) * C / 2 + 1, ry = C / 2 - 2, cy = 2.5 * C;
      s += `<line${cls} style="animation-delay:${i * .12}s" x1="${x0}" y1="${y0}" x2="${cx}" y2="${cy - ry}" stroke="#1c2233" stroke-width="3" stroke-linecap="round"/>`;
      s += `<ellipse${isNew ? ' class="pp"' : ''} cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="#e03131" stroke-width="3.2"/>`;
    });
    return s;
  }

  function boxInfo() {
    if (st.phase === 'formula') return { r: 0, c: K.F + 7, w: 8, f: true };
    const s = cur();
    if (st.phase !== 'solve' || !s || st.post || s.type !== 'in') return null;
    return s.box;
  }
  function renderBox(shake) {
    const b = boxInfo(), L = $('boxL');
    if (!b) { L.innerHTML = ''; return; }
    const left = (b.c - b.w + 1) * C, top = b.r * C;
    let inner = '';
    if (b.f) {
      [...st.f].forEach((ch, i) => { inner += `<div class="bd f" style="left:${i * C}px">${SYM[ch] || ch}</div>`; });
      if (st.f.length < b.w) inner += `<div class="caret" style="left:${st.f.length * C + 12}px"></div>`;
    } else {
      const t = st.inp;
      [...t].forEach((ch, i) => { inner += `<div class="bd" style="left:${(b.w - t.length + i) * C}px">${ch}</div>`; });
      if (!t) inner += `<div class="caret" style="left:${(b.w - 1) * C + 12}px"></div>`;
    }
    L.innerHTML = `<div class="box${shake ? ' shake' : ''}" style="left:${left - 4}px;top:${top - 4}px;width:${b.w * C + 8}px;height:${C + 8}px">${inner}</div>`;
  }

  // ---- 図（ブロック・数の線） ----
  const FR = { A: 3, B: 10 }, FROW = 8;
  function eligible(f, mv) { const L = f[mv.from]; return L.map((v, i) => i).filter(i => mv.kind === 'move' ? L[i] === mv.color : (L[i] === 'b' || L[i] === 'p')); }
  function applyMv(f, mv, taps) {
    let list = taps;
    if (!list) { const el = eligible(f, mv); list = mv.all ? el : el.slice(-mv.n); }
    const moved = [];
    for (const i of list) {
      if (mv.kind === 'move') { const v = f[mv.from][i]; f[mv.from][i] = ''; const e = f.A.indexOf(''); f.A[e] = v; moved.push(e); }
      else f[mv.from][i] = 'x';
    }
    return moved;
  }
  // k番目の 手順の ときの 図
  function figAt(k, withCur) {
    const P = st.plan, f = { A: P.fig0.A.slice(), B: P.fig0.B.slice(), arcs: [], mk: P.fig0.mk, nwA: [] };
    for (let j = 0; j < k && j < P.steps.length; j++) {
      const s = P.steps[j];
      if (s.mv) { applyMv(f, s.mv, st.taps[j]); f.arcs.push([s.mv.line[0], s.mv.line[1], s.mv.lab]); }
      if (s.arc) f.arcs.push(s.arc);
    }
    if (withCur && st.ct.length) f.nwA = applyMv(f, P.steps[k].mv, st.ct);
    if (st.phase === 'done' && P.steps.length) { const l = P.steps[P.steps.length - 1]; if (l.arc && !f.arcs.includes(l.arc)) f.arcs.push(l.arc); }
    if (f.arcs.length) f.mk = f.arcs[f.arcs.length - 1][1];
    return f;
  }
  function renderFig(o) {
    o = o || {};
    const show = solving() && G.lv === 'many';
    $('tabs').hidden = !show;
    document.querySelectorAll('#tabs .gb').forEach(b => b.classList.toggle('on', b.dataset.v === S.view));
    const L = $('figL');
    if (!show || S.view === 'sak') { L.innerHTML = ''; return; }
    const s = cur(), act = st.phase === 'solve' && s && !st.post;
    const mv = act && s.type === 'move' ? s.mv : null;
    const f = figAt(st.idx, !!mv);
    const fhl = act ? (s.fhl || {}) : {};
    L.innerHTML = S.view === 'blk' ? blkHtml(f, fhl, mv, o.tapNew) : lineHtml(f, fhl, mv, o.arcNew);
  }
  function blkHtml(f, hl, mv, tapNew) {
    let h = '';
    ['A', 'B'].forEach(k => {
      const full = k === 'A' && f.A.every(v => v === 'b' || v === 'p');
      h += `<div class="frm${full ? ' ten' : ''}" style="left:${FR[k] * C - 6}px;top:${FROW * C - 6}px;width:${5 * C + 12}px;height:${2 * C + 12}px"></div>`;
      if (full) h += `<div class="ftag" style="left:${FR[k] * C}px;top:${(FROW + 2) * C + 10}px">10の まとまり</div>`;
      const el = mv && mv.from === k ? new Set(eligible(f, mv)) : null;
      f[k].forEach((v, i) => {
        const x = (FR[k] + i % 5) * C, y = (FROW + Math.floor(i / 5)) * C, w = hl[k];
        const hi = w && ((w === 'empty' && v === '') || (w === 'all' && (v === 'b' || v === 'p')) || w === v);
        if (hi) h += `<div class="bhl" style="left:${x + 3}px;top:${y + 3}px"></div>`;
        const nw = k === 'A' && tapNew && f.nwA.includes(i);
        h += `<div class="blk ${v || 'e'}${el && el.has(i) ? ' can' : ''}${nw ? ' nw' : ''}" data-f="${k}" data-i="${i}" style="left:${x}px;top:${y}px"></div>`;
      });
    });
    return h;
  }
  const LX = v => 56 + v * 44.8, LY = 9.5 * C;
  function lineHtml(f, hl, mv, arcNew) {
    const INK = '#1c2233';
    let s = `<svg class="lsv" width="1008" height="672"><defs><marker id="la" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="${INK}"/></marker></defs>`;
    s += `<rect class="lband" x="2" y="${7 * C + 2}" width="${K.COLS * C - 4}" height="${4 * C - 4}"/>`;
    if (hl.seg) { const [x, y] = hl.seg; s += `<rect x="${LX(Math.min(x, y)) - 6}" y="${LY - 18}" width="${Math.abs(y - x) * 44.8 + 12}" height="36" rx="10" fill="rgba(255,226,0,.6)"/>`; }
    s += `<line x1="${LX(0) - 24}" y1="${LY}" x2="${LX(20) + 24}" y2="${LY}" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`;
    for (let v = 0; v <= 20; v++) {
      const big = v % 10 === 0, mid = v % 5 === 0, len = big ? 22 : mid ? 16 : 10, col = v === 10 ? '#2b8a3e' : INK;
      s += `<line x1="${LX(v)}" y1="${LY - len}" x2="${LX(v)}" y2="${LY + len}" stroke="${col}" stroke-width="${big ? 4 : 2.5}"/>`;
      s += `<text x="${LX(v)}" y="${LY + 56}" font-size="${v === 10 ? 30 : 26}" text-anchor="middle" fill="${col}">${v}</text>`;
    }
    f.arcs.forEach(([a, b, lab], i) => {
      const x1 = LX(a), x2 = LX(b), hgt = Math.min(130, 40 + Math.abs(b - a) * 9), y = LY - 10, mx = (x1 + x2) / 2;
      const nw = arcNew && i === f.arcs.length - 1;
      s += `<path${nw ? ' class="dr"' : ''} d="M${x1} ${y} Q${mx} ${y - hgt * 2} ${x2 + (b > a ? -3 : 3)} ${y - 2}" fill="none" stroke="${INK}" stroke-width="3.5" marker-end="url(#la)" pathLength="300"/>`;
      s += `<text${nw ? ' class="st"' : ''} x="${mx}" y="${y - hgt - 12}" font-size="30" text-anchor="middle" fill="${INK}">${lab}</text>`;
    });
    s += `<circle cx="${LX(f.mk)}" cy="${LY}" r="12" fill="#183a8c" stroke="#fff" stroke-width="3"/>`;
    if (mv) for (let v = 0; v <= 20; v++) s += `<rect class="tk" data-v="${v}" x="${LX(v) - 22}" y="${LY - 60}" width="44" height="130" fill="transparent"/><circle class="tc" cx="${LX(v)}" cy="${LY}" r="19" fill="transparent" stroke="#ff3b3b" stroke-width="3" stroke-dasharray="5 4" pointer-events="none"/>`;
    return s + '</svg>';
  }
  $('figL').addEventListener('click', e => {
    const s = cur();
    if (st.phase !== 'solve' || !s || s.type !== 'move' || st.post || !$('modal').hidden) return;
    if (S.view === 'blk') {
      const b = e.target.closest('.blk'); if (!b) return;
      if (!b.classList.contains('can')) { se('ng'); shakeChara(); return; }
      const f = figAt(st.idx, true);
      if (s.mv.all) st.ct = eligible(f, s.mv); else st.ct.push(+b.dataset.i);
      se('tap');
      if (s.mv.all || st.ct.length >= s.mv.n) correct(s, false);
      else { renderFig({ tapNew: true }); renderSay(); }
    } else if (S.view === 'line') {
      const t = e.target.closest('[data-v]'); if (!t) return;
      if (+t.dataset.v === s.mv.line[1]) correct(s, false); else wrong(s, +t.dataset.v);
    }
  });
  $('tabs').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || b.dataset.v === S.view) return;
    se('btn'); S.view = b.dataset.v; st.ct = []; st.msg = null; render();
  });

  // ---- ふきだし ----
  function stepSay(s) {
    if (s.type !== 'move') return s.say;
    let t = s.say[S.view === 'blk' ? 'b' : S.view === 'line' ? 'l' : 's'];
    if (S.view === 'blk' && st.ct.length && !s.mv.all) t += `<div class="sub">${st.ct.length}こ ${s.mv.kind === 'move' ? 'うごかしたよ' : 'とったよ'}</div>`;
    return t;
  }
  function renderSay() {
    const el = $('say'), bt = $('sayBtns');
    let html = '', btns = '';
    const s = cur();
    if (st.phase === 'formula') {
      html = st.fmsg ? `<div class="ng">${rb(st.fmsg)}</div>` : rb('{赤|あか}い わくに {式|しき}を {入|い}れよう<div class="sub">れい：8＋5、13−9</div>');
      if (!st.fmsg && st.f) html = rb('{入|い}れたら<br>「けってい」を おそう');
    } else if (st.phase === 'done') {
      html = `<div class="ok">${rb(st.msg || '')}</div>`;
    } else if (st.post) {
      html = `<div class="ok">${rb(st.msg || 'せいかい！')}</div>`;
    } else if (s) {
      const t = stepSay(s);
      html = st.msg ? `<div class="ng">${rb(st.msg)}</div><div class="sub">${rb(t)}</div>` : rb(t);
      if (s.type === 'move' && S.view === 'sak') btns += `<button class="gb g-green sm" data-act="next">つぎへ<svg viewBox="0 0 32 32"><path d="M13 7l9 9-9 9"/></svg></button>`;
      if (s.assist && (s.ask || st.msg)) btns += `<button class="gb g-pink sm" data-act="assist">アシストを みる？</button>`;
    }
    bt.innerHTML = btns;
    el.classList.toggle('btns', !!btns);
    el.innerHTML = `<div>${html}</div>`;
    let fs = 40; el.style.fontSize = fs + 'px';
    while ((el.scrollHeight > el.clientHeight + 1) && fs > 20) { fs -= 2; el.style.fontSize = fs + 'px'; }
  }
  $('sayBtns').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.act === 'next') nextMoveInfo();
    if (b.dataset.act === 'assist') { const s = cur(); if (s && s.assist) openAssist(s.assist); }
  });

  function renderBtns() {
    const s = cur();
    $('bBack').disabled = st.phase === 'formula' || (G.mode === 'chal' && st.phase === 'solve' && st.idx === 0 && !st.post);
    $('bFwd').disabled = st.phase === 'done' || (st.phase === 'formula' && !st.f);
    $('bReset').disabled = st.phase === 'formula' && !st.f;
    const opOn = st.phase === 'formula';
    const numOn = opOn || (st.phase === 'solve' && !st.post && s && s.type === 'in');
    document.querySelectorAll('#pad .gb').forEach(b => {
      const k = b.dataset.k;
      if (k === '+' || k === '-') b.disabled = !opOn;
      else if (k === 'OK') b.disabled = !(opOn || (st.phase === 'solve' && !st.post && s && (s.type === 'in' || (s.type === 'move' && S.view === 'sak'))));
      else b.disabled = !numOn;
    });
  }
  function renderTop() {
    const p = $('prog');
    p.hidden = !(G.mode === 'chal' && solving());
    p.textContent = `${Math.min(G.qi + 1, 10)}／10もん`;
  }

  // ---- テンキー ----
  function buildPad() {
    const P = [['7'], ['8'], ['9'], ['+', '＋', 'op g-orange'], ['4'], ['5'], ['6'], ['-', '−', 'op g-orange'],
      ['1'], ['2'], ['3'], ['0'], ['BS', '⌫', 'w2 g-gray'], ['OK', 'けってい', 'w2 g-green']];
    $('pad').innerHTML = P.map(([k, t, c]) => `<button class="gb ${c && c.includes('g-') ? '' : 'g-pearl'} ${c || ''}" data-k="${k}">${t || k}</button>`).join('');
    $('pad').addEventListener('click', e => { const b = e.target.closest('button'); if (b && !b.disabled) key(b.dataset.k); });
  }

  // ---- 入力 ----
  function key(k) {
    if (!$('modal').hidden || !$('home').hidden) return;
    if (st.phase === 'formula') {
      if (/^\d$/.test(k) || k === '+' || k === '-') addF(k);
      else if (k === 'BS') { st.f = st.f.slice(0, -1); st.fmsg = null; se('tap'); render(); }
      else if (k === 'OK') confirmFormula();
      return;
    }
    if (st.phase !== 'solve' || st.post) return;
    const s = cur(); if (!s) return;
    if (s.type === 'move') { if (k === 'OK' && S.view === 'sak') nextMoveInfo(); return; }
    if (s.type !== 'in') return;
    if (/^\d$/.test(k)) {
      if (st.inp.length >= s.max) { renderBox(true); return; }
      st.inp += k; se('tap'); renderBox();
    } else if (k === 'BS') { st.inp = st.inp.slice(0, -1); se('tap'); renderBox(); }
    else if (k === 'OK') check();
  }
  function addF(k) {
    let [, a, op, b] = /^(\d*)([+\-]?)(\d*)$/.exec(st.f);
    st.fmsg = null;
    if (k === '+' || k === '-') {
      if (!a) { st.fmsg = 'さきに {数|かず}を {入|い}れてね'; return fail(); }
      if (op && b) { st.fmsg = 'きごうは 1つだけだよ'; return fail(); }
      op = k;
    } else if (!op) {
      if (a.length >= 2) { st.fmsg = '{数|かず}は 2けたまでだよ'; return fail(); }
      a = a === '0' ? k : a + k;
    } else {
      if (b.length >= 2) { st.fmsg = '{数|かず}は 2けたまでだよ'; return fail(); }
      b = b === '0' ? k : b + k;
    }
    st.f = a + op + b; se('tap'); render();
  }
  function fail() { se('ng'); render(); renderBox(true); shakeChara(); }

  function confirmFormula() {
    const p = K.parse(st.f);
    if (!p.ok) { st.fmsg = p.msg; return fail(); }
    startPlan(p);
  }
  function startPlan(p) {
    clearTimeout(st.timer); st.timer = null; closeAssist(); hideEnd(); $('fxL').innerHTML = '';
    Object.assign(st, { prob: p, plan: K.build(p, S, G.lv), phase: 'solve', idx: 0, inp: '', msg: null, post: false, fmsg: null, f: '', taps: {}, ct: [], scored: null });
    se('pop');
    const nw = new Set(st.plan.base.map(m => m.id)); (cur().pre || []).forEach(m => nw.add(m.id));
    render({ nw });
  }

  function check() {
    const s = cur();
    if (!s || s.type !== 'in' || st.post) return;
    if (st.inp === '') { renderBox(true); return; }
    if (+st.inp === s.exp) correct(s, false); else wrong(s, +st.inp);
  }
  function correct(s, revealed) {
    se('ok'); hopChara(); closeAssist();
    if (s.type === 'move') { st.taps[st.idx] = (revealed || S.view !== 'blk') ? null : st.ct.slice(); st.ct = []; }
    if (s.final && revealed) st.rvFinal = true;
    st.post = true;
    st.msg = revealed ? (s.type === 'in' ? `こたえは ${s.exp}だよ` : 'こう なるよ') : pick(['せいかい！', 'いいね！', 'そのとおり！', 'ばっちり！']);
    if (!revealed && s.type === 'move' && s.mv.line[1] === 10 && s.mv.kind === 'move') st.msg = '10が できたね！';
    st.idx++; st.inp = '';
    render({ nw: new Set((s.add || []).map(m => m.id)), arcNew: !!(s.mv || s.arc), tapNew: true });
    st.timer = setTimeout(afterCorrect, revealed ? 1500 : 900);
  }
  function afterCorrect() {
    clearTimeout(st.timer); st.timer = null;
    if (!st.post) return;
    st.post = false; st.msg = null;
    if (st.idx >= st.plan.steps.length) return finish();
    const nw = new Set(); (cur().pre || []).forEach(m => nw.add(m.id));
    render({ nw });
  }
  function wrong(s, v) {
    se('ng'); shakeChara();
    st.msg = reason(s, v) || 'もういちど {考|かんが}えて みよう';
    st.inp = '';
    render(); renderBox(true);
    if (s.assist) setTimeout(() => { if (cur() === s && !st.post) openAssist(s.assist); }, 450);
  }
  // まちがえた わけ（答えは 言わない）
  function reason(s, v) {
    const w = s.wr;
    if (s.type === 'move') return `もういちど かぞえて みよう`;
    if (!w || isNaN(v)) return null;
    if (w.k === 'to10') return `${w.a}＋${v}＝${w.a + v}で、10${w.a + v > 10 ? 'を こえるよ' : 'に たりないよ'}`;
    if (w.k === 'split') return v >= w.n ? `${w.n}より {大|おお}きく なるよ` : `${w.k1}と ${v}で ${w.k1 + v}。${w.n}に ならないよ`;
    if (w.k === 'from10') return v > w.t ? `${w.t}より {大|おお}きいよ` : `${w.t}−${v}＝${w.t - v}で、10に ならないよ`;
    if (w.k === 'teen') return `10と ${v}で ${10 + v}。${w.t}に ならないよ`;
    return null;
  }
  function nextMoveInfo() {
    const s = cur(); if (!s || s.type !== 'move' || st.post) return;
    se('btn'); st.taps[st.idx] = null; st.ct = []; st.idx++; st.msg = null;
    const nw = new Set(); (cur() && cur().pre || []).forEach(m => nw.add(m.id));
    render({ nw });
  }
  function finish() {
    st.phase = 'done'; st.post = false; st.idx = st.plan.steps.length;
    const good = !(G.mode === 'chal' && st.rvFinal);
    if (G.mode === 'chal') { G.res.push(good); if (good) G.score++; st.scored = good; }
    st.msg = good ? pick(['せいかい！<br>よく できたね！', 'やったね！<br>ばっちりだよ！', 'すごい！<br>さいごまで できたね！']) : 'こたえを みたね。<br>つぎは じぶんで やって みよう';
    render({ arcNew: true });
    if (good) { se('clear'); setTimeout(() => se('cheer'), 500); hanamaru(); confetti(); jumpChara(); }
    st.timer = setTimeout(showEnd, good ? 1600 : 900);
  }
  function showEnd() {
    if (G.mode === 'chal') {
      const last = G.qi >= 9;
      $('eTxt').innerHTML = `${G.qi + 1}もんめ<br>おわり！`;
      $('bNew').innerHTML = last ? 'けっかを みる' : 'つぎの もんだい';
      $('bStay').style.display = 'none';
    } else {
      $('eTxt').innerHTML = rb('つぎの {式|しき}を<br>{入|い}れる？');
      $('bNew').innerHTML = rb('あたらしい {式|しき}');
      $('bStay').style.display = '';
    }
    $('endCard').hidden = false; $('pad').hidden = true;
  }
  function hideEnd() { $('endCard').hidden = true; $('pad').hidden = false; }

  // ---- ボタン ----
  function back() {
    se('btn'); clearTimeout(st.timer); st.timer = null; closeAssist(); hideEnd(); $('fxL').innerHTML = '';
    if (!solving()) return;
    st.ct = [];
    if (st.phase === 'done') {
      st.phase = 'solve'; st.idx = st.plan.steps.length - 1;
      if (st.scored !== null) { G.res.pop(); if (st.scored) G.score--; st.scored = null; }
    } else if (st.post) { st.post = false; st.idx--; }
    else if (st.idx === 0) {
      if (G.mode === 'chal') return render();
      st.phase = 'formula'; st.f = st.plan.formula.replace(/[＋−]/g, c => (c === '＋' ? '+' : '-')); st.plan = null;
      st.inp = ''; st.msg = null; return render();
    } else st.idx--;
    delete st.taps[st.idx];
    st.inp = ''; st.msg = null; render();
  }
  function fwd() {
    if (st.phase === 'formula') return confirmFormula();
    if (st.phase !== 'solve') return;
    if (st.post) return afterCorrect();
    const s = cur(); if (!s) return;
    if (s.type === 'move' && S.view === 'sak') return nextMoveInfo();
    if (s.type === 'in') st.inp = String(s.exp);
    correct(s, true);
  }
  function resetAll() {
    if (G.mode === 'chal') { const rv = st.rvFinal; startPlan(st.prob); st.rvFinal = rv; return; }
    clearTimeout(st.timer); st.timer = null; closeAssist(); hideEnd(); $('fxL').innerHTML = '';
    Object.assign(st, { phase: 'formula', f: '', fmsg: null, prob: null, plan: null, idx: 0, inp: '', post: false, msg: null, taps: {}, ct: [] });
    render();
  }
  function nextProblem() {
    if (G.mode !== 'chal') return resetAll();
    G.qi++;
    if (G.qi >= 10) return showResult();
    startProblem();
  }
  function startProblem() { st.rvFinal = false; startPlan(G.queue[G.qi]); }

  $('bBack').onclick = back;
  $('bFwd').onclick = () => { se('btn'); fwd(); };
  $('bReset').onclick = () => {
    se('pop');
    const t = G.mode === 'chal' ? 'この もんだいを はじめから やりなおすよ' : 'いまの けいさんは きえるよ';
    modal(`<h2>リセットする？</h2><p>${t}</p>
      <div class="row"><button class="gb g-orange" data-m="yes">リセットする</button><button class="gb g-gray" data-m="no">やめる</button></div>`,
      a => { if (a === 'yes') resetAll(); });
  };
  $('bSet').onclick = () => { se('pop'); openSettings(); };
  $('bNew').onclick = () => { se('btn'); nextProblem(); };
  $('bStay').onclick = () => { se('btn'); hideEnd(); };
  $('boxL').addEventListener('click', e => { if (e.target.closest('.box')) { se('tap'); renderBox(); } });

  // ---- モーダル ----
  let mCb = null, mLock = false;
  function modal(html, cb, lock) { $('mCard').innerHTML = rb(html); $('modal').hidden = false; mCb = cb; mLock = !!lock; }
  function closeModal() { $('modal').hidden = true; mCb = null; }
  $('modal').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) { if (e.target.id === 'modal' && !mLock) { se('btn'); closeModal(); } return; }
    if (b.dataset.m) { se('btn'); const cb = mCb; closeModal(); if (cb) cb(b.dataset.m); }
    if (b.dataset.o) {
      se('tap'); const [k, v] = b.dataset.o.split(':'); const was = S[k];
      S[k] = v === 'true' ? true : v === 'false' ? false : v;
      // わけかたを かえたら、いまの 問題を はじめから
      if ((k === 'split' || k === 'sub') && was !== S[k] && st.phase === 'solve' && G.lv === 'many') { const rv = st.rvFinal; startPlan(st.prob); st.rvFinal = rv; }
      openSettings();
    }
  });
  function openSettings() {
    const seg = (k, opts) => `<div class="seg">${opts.map(([v, t]) => `<button class="gb g-cyan ${String(S[k]) === String(v) ? 'on' : ''}" data-o="${k}:${v}">${t}</button>`).join('')}</div>`;
    modal(`<h2>せってい</h2>
      <div class="opt"><div class="lbl">たし{算|ざん}で わける {数|かず}</div>${seg('split', [['back', 'うしろの {数|かず}'], ['front', 'まえの {数|かず}']])}</div>
      <div class="opt"><div class="lbl">ひき{算|ざん}の やりかた</div>${seg('sub', [['kagen', '10から ひく'], ['gengen', 'ひく{数|かず}を わける']])}</div>
      <div class="opt"><div class="lbl">こうかおん</div>${seg('sound', [[true, 'あり'], [false, 'なし']])}</div>
      <div class="row" style="margin-top:28px"><button class="gb g-green" data-m="close">とじる</button><button class="gb g-gray" data-m="title">タイトルへ</button></div>
      <div class="credit">おたすけ{計算|けいさん} ver ${VER}　つくった{人|ひと}：のち（まなび堂）</div>`, a => {
      if (a === 'title') { se('pop'); modal(`<h2>タイトルに もどる？</h2><p>いまの けいさんは きえるよ</p><div class="row"><button class="gb g-orange" data-m="yes">もどる</button><button class="gb g-gray" data-m="no">やめる</button></div>`, x => { if (x === 'yes') showHome('mode'); }); }
    });
  }

  // ---- けっか ----
  function showResult() {
    Object.assign(st, { phase: 'home', plan: null, msg: null, post: false }); render();
    se('clear'); setTimeout(() => se('cheer'), 500); confetti(); jumpChara();
    const n = G.score, msg = n === 10 ? 'ぜんもん せいかい！ すごい！' : n >= 7 ? 'よく がんばったね！' : 'つぎは もっと できるよ！';
    modal(`<h2>けっか</h2><div class="score">${n}<small>てん</small></div>
      <p>10てん まんてん{中|ちゅう} ${n}てん。${msg}</p>
      <div class="rsRow">${G.res.map(ok => `<span class="${ok ? 'o' : 'x'}">${ok ? '○' : '×'}</span>`).join('')}</div>
      <div class="row r3"><button class="gb g-green" data-m="again">もういちど</button><button class="gb g-cyan" data-m="kind">しゅるいを かえる</button><button class="gb g-gray" data-m="title">タイトルへ</button></div>`,
      a => { if (a === 'again') startChal(); else if (a === 'kind') showHome('kind'); else showHome('mode'); }, true);
  }
  function startChal() {
    Object.assign(G, { queue: shuffle(K.list(G.kind)).slice(0, 10), qi: 0, score: 0, res: [] });
    $('home').hidden = true; startProblem();
  }

  // ---- タイトル（逆転裁判のように ボタンで ページを かえる） ----
  let hPage = 'mode';
  function showHome(page) {
    clearTimeout(st.timer); st.timer = null; closeAssist(); hideEnd(); closeModal();
    Object.assign(st, { phase: 'home', plan: null, f: '', msg: null, post: false });
    render();
    hPage = page; $('home').hidden = false;
    const B = $('hBtns');
    if (page === 'mode') {
      $('hQ').innerHTML = rb('どちらで やる？');
      B.className = 'hBtns c1';
      B.innerHTML = `<button class="gb g-orange" data-h="help"><span class="mt">{問題|もんだい}おたすけモード</span><small>じぶんで {式|しき}を {入|い}れて とく</small></button>
        <button class="gb g-cyan" data-h="chal"><span class="mt">{問題|もんだい}{挑戦|ちょうせん}モード</span><small>10もん ちょうせん！ なんてん とれるかな</small></button>`;
    } else if (page === 'kind') {
      $('hQ').innerHTML = rb('どの {問題|もんだい}に する？');
      B.className = 'hBtns c2';
      B.innerHTML = KINDS.map(([k, a, b, c]) => `<button class="gb ${c}" data-h="k:${k}"><span class="mt">${a}</span><small>${b}</small></button>`).join('');
    } else {
      $('hQ').innerHTML = rb('どのくらい おたすけ する？');
      B.className = 'hBtns c1 n3';
      B.innerHTML = LVS.map(([k, a, b, c]) => `<button class="gb ${c}" data-h="l:${k}"><span class="mt">${a}</span><small>${b}</small></button>`).join('');
    }
    B.innerHTML = rb(B.innerHTML);
    $('hBack').hidden = page === 'mode';
  }
  $('hBtns').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    se('btn');
    const h = b.dataset.h;
    if (h === 'help' || h === 'chal') { G.mode = h; return showHome(h === 'chal' ? 'kind' : 'level'); }
    if (h.startsWith('k:')) { G.kind = h.slice(2); return showHome('level'); }
    if (h.startsWith('l:')) {
      G.lv = h.slice(2);
      if (G.mode === 'chal') return startChal();
      $('home').hidden = true; resetAll();
    }
  });
  $('hBack').onclick = () => { se('btn'); showHome(hPage === 'level' && G.mode === 'chal' ? 'kind' : 'mode'); };

  // ---- アシスト（すこし・なし） ----
  let lastAssist = null;
  function openAssist(a) {
    lastAssist = a; se('pop');
    const el = $('assist');
    el.style.top = '524px';
    const r = assistView(a);
    $('aTitle').innerHTML = rb(r.title);
    $('aBody').innerHTML = r.body;
    el.hidden = false;
    el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  }
  function closeAssist() { $('assist').hidden = true; }
  $('aClose').onclick = () => { se('btn'); closeAssist(); };
  $('aAgain').onclick = () => { if (lastAssist) openAssist(lastAssist); };

  const RED = '#e03131', GRN = '#2b8a3e', INK = '#1c2233', BLU = '#1971c2';
  const T = (x, y, s, o) => `<text x="${x}" y="${y}" font-size="${(o && o.fs) || 40}" text-anchor="${(o && o.a) || 'start'}" fill="${(o && o.c) || INK}">${s}</text>`;
  const gd = (d, inner) => `<g class="st" style="animation-delay:${d}s">${inner}</g>`;
  const R_ = v => `<tspan fill="${RED}">${v}</tspan>`, G_ = v => `<tspan fill="${GRN}">${v}</tspan>`;
  const svgW = s => `<svg class="asv" viewBox="0 0 1000 236">${s}</svg>`;
  const lines = (arr) => arr.map((t, i) => gd(.7 + i * 1.1, T(470, [56, 108, 160, 212][i], t, { fs: 38 }))).join('');
  // 式と さくらんぼ（si＝わける数の ばしょ、gi＝10を つくる ほう）
  function cherry(toks, si, L, Rv, gi) {
    const X = [100, 200, 300];
    let s = toks.map((t, i) => T(X[i], 98, t, { fs: 76, a: 'middle' })).join('');
    const sx = X[si], cL = sx - 56, cR = sx + 56;
    const circ = (cx, v, col, d) => gd(d, `<circle cx="${cx}" cy="190" r="36" fill="${col === GRN ? '#d3f9d8' : '#ffe3e3'}" stroke="${col}" stroke-width="4"/>` + T(cx, 204, v, { a: 'middle', c: col, fs: 40 }));
    const ln = (x2, d) => `<line class="dr" style="animation-delay:${d}s" x1="${sx}" y1="112" x2="${x2}" y2="158" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`;
    s += ln(cL, .3) + ln(cR, .3) + circ(cL, L, RED, .7) + circ(cR, Rv, RED, .7);
    if (gi != null) s += circ(gi === 0 ? cL : cR, gi === 0 ? L : Rv, GRN, 1.8);
    return s;
  }
  function blocksSvg(nb, np, nx) {
    // nb＝青、np＝ピンク、nx＝とる（うしろから）
    let s = '';
    const tot = nb + np;
    for (let i = 0; i < Math.max(10, tot); i++) {
      const x = 40 + (i % 5) * 64 + (i >= 10 ? 0 : 0), y = 40 + Math.floor((i % 10) / 5) * 64 + (i >= 10 ? 140 : 0);
      if (i >= tot && i >= 10) continue;
      const v = i < nb ? 'b' : i < tot ? 'p' : '';
      const taken = v && i >= tot - nx;
      const fill = !v ? 'none' : taken ? '#e9ecef' : v === 'b' ? '#4dabf7' : '#f783ac', st2 = !v ? '#b8c2d1' : taken ? '#adb5bd' : v === 'b' ? '#1864ab' : '#a61e4d';
      s += gd(.05 * i, `<rect x="${x}" y="${y}" width="54" height="54" rx="9" fill="${fill}" stroke="${st2}" stroke-width="3"${!v ? ' stroke-dasharray="6 5"' : ''}/>`);
      if (taken) s += gd(1 + .08 * (i - tot + nx), `<line x1="${x + 10}" y1="${y + 44}" x2="${x + 44}" y2="${y + 10}" stroke="${BLU}" stroke-width="5" stroke-linecap="round"/>`);
    }
    return s;
  }
  function assistView(a) {
    const p = a.p, x = p.a, y = p.b, ans = p.ans, u = x % 10, PL = '＋', MI = '−';
    let s = '', title = 'さくらんぼ けいさん';
    switch (p.cls) {
      case 'add1':
        if (a.split === 'front') { const need = 10 - y, rest = x - need; s = cherry([x, PL, y], 0, rest, need, 1) + lines([`${x}を ${R_(need)}と ${R_(rest)}に わける`, `${y}＋${G_(need)}＝${G_(10)}`, `${G_(10)}＋${R_(rest)}＝${ans}`]); }
        else { const need = 10 - x, rest = y - need; s = cherry([x, PL, y], 2, need, rest, 0) + lines([`${y}を ${R_(need)}と ${R_(rest)}に わける`, `${x}＋${G_(need)}＝${G_(10)}`, `${G_(10)}＋${R_(rest)}＝${ans}`]); }
        title = 'さくらんぼ けいさん（10を つくろう）'; break;
      case 'sub1':
        if (a.sub === 'gengen') { s = cherry([x, MI, y], 2, u, y - u, 0) + lines([`${y}を ${R_(u)}と ${R_(y - u)}に わける`, `${x}−${R_(u)}＝${G_(10)}`, `${G_(10)}−${R_(y - u)}＝${ans}`]); }
        else { s = cherry([x, MI, y], 0, 10, u, 0) + lines([`${x}を ${G_(10)}と ${R_(u)}に わける`, `${G_(10)}−${y}＝${10 - y}`, `${10 - y}＋${R_(u)}＝${ans}`]); }
        title = 'さくらんぼ けいさん（10から ひこう）'; break;
      case 'addT': s = cherry([x, PL, y], 0, 10, u, 0) + lines([`${x}を ${G_(10)}と ${R_(u)}に わける`, `${R_(u)}＋${y}＝${u + y}`, `${G_(10)}＋${u + y}＝${ans}`]); title = '10と ばらに わけよう'; break;
      case 'subT': s = cherry([x, MI, y], 0, 10, u, 0) + lines([`${x}を ${G_(10)}と ${R_(u)}に わける`, `${R_(u)}−${y}＝${u - y}`, `${G_(10)}＋${u - y}＝${ans}`]); title = '10と ばらに わけよう'; break;
      case 'sub10': s = cherry([x, MI, y], 0, 10, u, 0) + lines([`${x}を ${G_(10)}と ${R_(u)}に わける`, `${G_(10)}を とると…`, `${R_(u)}が のこるね`]); title = '10と ばらに わけよう'; break;
      case 'add10': s = blocksSvg(10, 0, 0) + lines([`${G_('10の まとまり')}と`, `ばらが ${y}こ`, 'あわせて いくつかな？']); title = '10と ばら'; break;
      case 'addS': s = blocksSvg(x, y, 0) + lines([`${x}こと ${y}こを`, 'あわせると…', 'ぜんぶ かぞえて みよう']); title = 'ブロックで かんがえよう'; break;
      default: s = blocksSvg(Math.min(x, 10), 0, Math.min(y, 10)) + lines([`${x}こから ${y}こ とると…`, 'のこりを', 'かぞえて みよう']); title = 'ブロックで かんがえよう';
    }
    return { title, body: svgW(s) };
  }

  // ---- うごき ----
  function anim(cls, ms) {
    const el = $('charaW'); el.classList.remove('hop', 'shake', 'jump'); void el.offsetWidth; el.classList.add(cls);
    clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove(cls), ms);
  }
  const hopChara = () => anim('hop', 600), shakeChara = () => anim('shake', 550), jumpChara = () => anim('jump', 1200);

  function hanamaru() {
    const b = st.plan.steps[st.plan.steps.length - 1].box;
    const c1 = b.c - b.w + 1, c2 = b.c, r = b.r;
    const cx = (c1 + c2 + 1) / 2 * C, cy = (r + .5) * C;
    const rx = (c2 - c1 + 1) * C / 2 + 18, ry = C / 2 + 8;
    let d = '', N = 220;
    for (let i = 0; i <= N; i++) {
      const tt = i / N, a = -Math.PI / 2 + tt * Math.PI * 2 * 2.15, k = .55 + .45 * tt;
      d += (i ? 'L' : 'M') + (cx + Math.cos(a) * rx * k).toFixed(1) + ' ' + (cy + Math.sin(a) * ry * k).toFixed(1);
    }
    let f = '', P = 12, M2 = 360;
    for (let i = 0; i <= M2; i++) {
      const a = -Math.PI / 2 + i / M2 * Math.PI * 2, bump = Math.abs(Math.sin(a * P / 2));
      const kx = rx + 8 + 14 * bump, ky = ry + 6 + 12 * bump;
      f += (i ? 'L' : 'M') + (cx + Math.cos(a) * kx).toFixed(1) + ' ' + (cy + Math.sin(a) * ky).toFixed(1);
    }
    $('fxL').innerHTML = `<path class="hana" id="h1" d="${d}"/><path class="hana" id="h2" d="${f}"/>`;
    [['h1', 0, .9], ['h2', .8, 1.1]].forEach(([id, dl, du]) => {
      const p = $(id), L = p.getTotalLength();
      p.style.strokeDasharray = L; p.style.strokeDashoffset = L;
      p.style.transition = `stroke-dashoffset ${du}s ease-in-out ${dl}s`;
      requestAnimationFrame(() => requestAnimationFrame(() => { p.style.strokeDashoffset = 0; }));
    });
  }
  function confetti() {
    const L = $('confL'), cols = ['#ff6b6b', '#ffd43b', '#69db7c', '#4dabf7', '#da77f2', '#ff922b'];
    for (let i = 0; i < 46; i++) {
      const d = document.createElement('div');
      d.className = 'cf';
      d.style.left = Math.random() * 1600 + 'px';
      d.style.background = pick(cols);
      d.style.animationDelay = Math.random() * .7 + 's';
      d.style.animationDuration = 1.6 + Math.random() * 1.2 + 's';
      L.appendChild(d);
      setTimeout(() => d.remove(), 3600);
    }
  }

  // ---- キーボード ----
  document.addEventListener('keydown', e => {
    if (!$('modal').hidden) { if (e.key === 'Escape' && !mLock) closeModal(); return; }
    if (e.key === 'Escape') { closeAssist(); return; }
    let k = null;
    if (/^[0-9]$/.test(e.key)) k = e.key;
    else if (e.key === '+') k = '+';
    else if (e.key === '-') k = '-';
    else if (e.key === 'Backspace' || e.key === 'Delete') k = 'BS';
    else if (e.key === 'Enter' || e.key === '=') k = 'OK';
    if (k) { e.preventDefault(); key(k); }
  });

  // ---- はじめ ----
  window.__otasuke = { st, S, G, key, fwd, back, cur, showHome };
  drawGrid(); buildPad(); fit(); showHome('mode');
  const v = document.createElement('div'); v.className = 'ver'; v.textContent = 'ver ' + VER; $('stage').appendChild(v);
})();
