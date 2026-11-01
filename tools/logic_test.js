// node tools/logic_test.js … 入れられる 式を ぜんぶ、せってい・レベル ごとに 解かせて しらべる
const K = require('../src/logic.js');
let n = 0, bad = 0;
const err = (p, S, lv, m) => { bad++; if (bad < 30) console.log('NG', `${p.a}${p.op}${p.b}`, JSON.stringify(S), lv, m); };

// 図（ブロック・数の線）を 画面と おなじ きまりで うごかす
function eligible(f, mv) { const L = f[mv.from]; return L.map((v, i) => i).filter(i => mv.kind === 'move' ? L[i] === mv.color : (L[i] === 'b' || L[i] === 'p')); }
function applyMv(f, mv) {
  const el = eligible(f, mv);
  if (!mv.all && el.length < mv.n) return 'たりない';
  for (const i of (mv.all ? el : el.slice(-mv.n))) {
    if (mv.kind === 'move') { const v = f[mv.from][i]; f[mv.from][i] = ''; const e = f.A.indexOf(''); if (e < 0) return 'あふれた'; f.A[e] = v; }
    else f[mv.from][i] = 'x';
  }
  return null;
}
const cnt = f => [...f.A, ...f.B].filter(v => v === 'b' || v === 'p').length;
// ノートの ある行を 式に もどして 答えを しらべる
function rowText(marks, r) { return [...marks.values()].filter(m => m.r === r && m.k !== 'sak').sort((x, y) => x.c - y.c).map(m => m.t).join(''); }
const ev = s => { const m = /^(\d+)([＋−])(\d+)＝$/.exec(s); return m ? (m[2] === '＋' ? +m[1] + +m[3] : m[1] - m[3]) : null; };

const probs = [];
let rej = 0;
for (const op of ['+', '-']) for (let a = 0; a <= 99; a++) for (let b = 0; b <= 99; b++) { const p = K.parse(`${a}${op}${b}`); if (p.ok) probs.push(p); else if (!(op === '-' && b > a)) rej++; }
if (rej) { bad++; console.log('NG 99までなのに 入れられない 式', rej); }
if (K.parse('100+1').ok || K.parse('5+100').ok) { bad++; console.log('NG 100いじょうが 入る'); }
const SS = [];
for (const split of ['back', 'front']) for (const sub of ['kagen', 'gengen']) for (const big of ['place', 'make']) SS.push({ split, sub, big });

for (const p of probs) for (const S of SS) for (const lv of ['many', 'some', 'none']) {
  n++;
  const P = K.build(p, S, lv);
  if (p.ans !== (p.op === '+' ? p.a + p.b : p.a - p.b) || p.ans < 0 || p.ans > 198) err(p, S, lv, '答え');
  const big = !!P.big;
  const marks = new Map(); P.base.forEach(m => marks.set(m.id, m));
  const f = { A: P.fig0.A.slice(), B: P.fig0.B.slice() };
  if (f.A.length !== 10 || f.B.length !== 10) err(p, S, lv, 'わくの 大きさ');
  if (!big && lv === 'many' && cnt(f) !== (p.op === '+' ? p.a + p.b : p.a)) err(p, S, lv, `はじめの ブロック ${cnt(f)}`);
  let mk = big ? p.a : P.fig0.mk, finals = 0;
  const rings = {}; // 行ごとの さくらんぼの まるの マス
  for (const s of P.steps) {
    for (const m of s.pre || []) {
      if (m.k !== 'sak' && marks.has(m.id)) err(p, S, lv, `かさなり ${m.id}`);
      if (m.k === 'sak') {
        if (marks.has(m.id)) err(p, S, lv, 'さくらんぼが 2つ おなじ 名前');
        const rr = m.rr || 2; rings[rr] = rings[rr] || new Set();
        for (const [c1, c2] of m.rings) for (let c = c1; c <= c2; c++) { if (c < 0 || c >= K.COLS) err(p, S, lv, 'まるが はみ出す'); if (rings[rr].has(c)) err(p, S, lv, `まるが かさなる ${rr}_${c}`); rings[rr].add(c); }
      }
      marks.set(m.id, m);
    }
    if (s.type === 'in') {
      const b = s.box;
      if (b.r < 0 || b.r >= K.ROWS || b.c >= K.COLS || b.c - b.w + 1 < 0) err(p, S, lv, 'わくが はみ出す');
      for (let c = b.c - b.w + 1; c <= b.c; c++) if (marks.has(`m${b.r}_${c}`)) err(p, S, lv, 'わくの 下に 字');
      if (String(s.exp).length !== b.w) err(p, S, lv, 'わくの はば');
      if (b.r === 2 || b.r === 3) for (let c = b.c - b.w + 1; c <= b.c; c++) if (!(rings[b.r] && rings[b.r].has(c))) err(p, S, lv, 'わくが まるの 外');
      if (b.r >= 4 && b.r <= 6) { const v = ev(rowText(marks, b.r)); if (v !== s.exp) err(p, S, lv, `式の行 ${rowText(marks, b.r)}${s.exp}`); }
      if (!s.say) err(p, S, lv, 'セリフ');
      if (s.final) { finals++; if (s.exp !== p.ans) err(p, S, lv, '最後の 答え'); }
      if (s.wr) {
        const w = s.wr, ok = w.k === 'to10' ? w.a + s.exp === 10 : w.k === 'split' ? w.k1 + s.exp === w.n : w.k === 'from10' ? w.t - s.exp === 10 : w.k === 'teen' ? 10 + s.exp === w.t
          : w.k === 'toT' ? w.a + s.exp === w.t && w.t % 10 === 0 : w.k === 'fromT' ? w.t - s.exp === w.T && w.T % 10 === 0 : w.k === 'tens' ? s.exp % 10 === 0 && s.exp <= w.n && w.n - s.exp < 10 : false;
        if (!ok) err(p, S, lv, 'さくらんぼの 数');
      }
    }
    if (s.type === 'move') {
      if (!s.say.b || !s.say.l || !s.say.s) err(p, S, lv, 'セリフ（図）');
      const e = applyMv(f, s.mv); if (e) err(p, S, lv, 'ブロック ' + e);
      if (s.mv.line[1] < 0 || s.mv.line[1] > 20) err(p, S, lv, '数の線');
      mk = s.mv.line[1];
      const want = s.mv.line[1];
      if (s.mv.kind === 'take' && cnt(f) !== want && !(p.cls === 'sub1' && S.sub !== 'gengen')) err(p, S, lv, `とったあと ${cnt(f)}`);
      if (s.mv.kind === 'move' && f.A.filter(v => v).length !== Math.min(10, want)) err(p, S, lv, 'うごかしたあと');
    }
    if (s.arc) { if (s.arc[0] !== mk) err(p, S, lv, '矢印が つながらない'); mk = s.arc[1]; }
    if (s.arcs) { if (s.arcs[0][0] !== mk) err(p, S, lv, '矢印が つながらない'); mk = s.arcs[s.arcs.length - 1][1]; }
    if (big && lv === 'many' && !s.bf) err(p, S, lv, '図が ない');
    for (const m of s.add || []) { if (marks.has(m.id)) err(p, S, lv, `かさなり ${m.id}`); marks.set(m.id, m); }
  }
  for (const m of marks.values()) if (m.k !== 'sak' && (m.r < 0 || m.r >= 7 || m.c < 0 || m.c >= K.COLS)) err(p, S, lv, `はみ出し ${m.id}`);
  if (finals !== 1 || !P.steps[P.steps.length - 1].final) err(p, S, lv, '最後の 手順');
  if (rowText(marks, 0) !== P.formula + '＝' + p.ans) err(p, S, lv, '式の行 ' + rowText(marks, 0));
  if (lv === 'many' && big) {
    const g = P.bfEnd.g, live = x => x.rods.filter(v => v === 'n').length * 10 + x.units.filter(v => v === 'n').length;
    const left = p.op === '+' ? live(g[0]) + live(g[1]) : live(g[0]);
    if (left !== p.ans) err(p, S, lv, `さいごの ぼうと ばら ${left}`);
    for (const x of g) if (x.rods.length > 10 || x.units.length > 20) err(p, S, lv, 'ぼう・ばらが おおすぎ');
    if (P.steps.some(s => s.arc || s.arcs) && mk !== p.ans && !(p.op === '-' && P.steps.every(s => !s.arc && !s.arcs))) err(p, S, lv, `数の線の さいご ${mk}`);
  } else if (lv === 'many') {
    if (cnt(f) !== p.ans && !(p.cls === 'sub1' && S.sub !== 'gengen' && cnt(f) === p.ans)) err(p, S, lv, `さいごの ブロック ${cnt(f)}`);
    const hasLine = P.steps.some(s => s.mv || s.arc);
    if (hasLine && mk !== p.ans) err(p, S, lv, `数の線の さいご ${mk}`);
  }
}
const L = {}, L99 = {}; for (const k of ['add0', 'add1', 'sub0', 'sub1']) { L[k] = K.list(k, '20').length; L99[k] = K.list(k, '99').length; }
console.log('挑戦モードの 問題数　20まで', JSON.stringify(L), '　99まで', JSON.stringify(L99));
if (Object.values(L99).some(v => v < 100)) { bad++; console.log('NG 99までの 問題が すくない'); }
if (L.add0 !== 90 || L.add1 !== 36 || L.sub0 !== 99 || L.sub1 !== 36) { bad++; console.log('NG 問題数'); }
console.log(`${probs.length}式 × せってい8 × レベル3 = ${n}通り　NG ${bad}`);
process.exit(bad ? 1 : 0);
