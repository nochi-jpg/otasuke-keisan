// ===== おたすけ計算：手順づくり（画面とは わける） =====
// 20までの たし算・ひき算。くりあがり・くりさがりは 1回まで。
(function (root) {
  'use strict';
  const COLS = 18, ROWS = 12, F = 3; // F＝式を かきはじめる 列
  const PL = '＋', MI = '−', EQ = '＝', OPS = { '+': PL, '-': MI };
  const OUT = 'この アプリでは 20までの {数|かず}で やろう';
  const KIND = { addS: 'add0', add10: 'add0', addT: 'add0', add1: 'add1', subS: 'sub0', subT: 'sub0', sub10: 'sub0', sub1: 'sub1' };

  // ---- 式の しゅるい ----
  function classify(a, op, b) {
    if (op === '+') {
      if (a <= 9 && b <= 9) return { ok: true, cls: a + b >= 11 ? 'add1' : 'addS' };
      if (a === 10 && b <= 9) return { ok: true, cls: 'add10' };
      if (a >= 11 && a <= 19 && b <= 9) return a % 10 + b <= 9 ? { ok: true, cls: 'addT' } : { ok: false, msg: OUT };
      if (a <= 9 && b >= 10 && b <= 19) return { ok: false, msg: '{大|おお}きい {数|かず}を {前|まえ}に して みよう' };
      return { ok: false, msg: OUT };
    }
    if (a > 19 || b > 19) return { ok: false, msg: OUT };
    if (b > a) return { ok: false, msg: `${a}から ${b}は ひけないよ` };
    if (a <= 10) return { ok: true, cls: 'subS' };
    if (b === 10) return { ok: true, cls: 'sub10' };
    if (b > 10) return { ok: false, msg: OUT };
    return { ok: true, cls: b > a % 10 ? 'sub1' : 'subT' };
  }
  function parse(f) {
    const m = /^(\d{1,2})([+\-])(\d{1,2})$/.exec(f);
    if (!m) return { ok: false, msg: '「{数|かず} ＋ {数|かず}」の かたちで {入|い}れてね' };
    const a = +m[1], op = m[2], b = +m[3], c = classify(a, op, b);
    if (!c.ok) return c;
    return { ok: true, a, op, b, cls: c.cls, kind: KIND[c.cls], ans: op === '+' ? a + b : a - b };
  }

  // ---- 挑戦モードの 問題（0は つかわない・答えも 1いじょう） ----
  function list(kind) {
    const out = [];
    for (const op of ['+', '-'])
      for (let a = 1; a <= 19; a++)
        for (let b = 1; b <= 19; b++) {
          const p = parse(`${a}${op}${b}`);
          if (p.ok && p.kind === kind && p.ans >= 1) out.push(p);
        }
    return out;
  }

  // ---- ノートに かく ----
  const mk = (r, c, t, k, o) => Object.assign({ id: `m${r}_${c}`, r, c, t: String(t), k: k || 'f' }, o || {});
  // 1行に ならべる（数は 1けたずつ 1マス）
  function row(r, toks, c0) {
    const marks = [], cols = [];
    let c = c0;
    toks.forEach(t => {
      const s = String(t), cc = [];
      for (const ch of s) { marks.push(mk(r, c, ch, 'f')); cc.push(c); c++; }
      cols.push(cc);
    });
    return { marks, cols, next: c };
  }
  // 赤い わく（数を 書く ところ）
  function inStep(r, c0, v, o) {
    const s = String(v), w = s.length;
    const add = [...s].map((ch, i) => mk(r, c0 + i, ch, 'd', { u: true }));
    return Object.assign({ type: 'in', box: { r, c: c0 + w - 1, w }, exp: v, max: w, add, cells: add.map(m => [r, m.c]) }, o || {});
  }
  // さくらんぼ（x0＝わける数の まんなか［マス］、rings＝下の まる）
  const sak = (x0, rings) => ({ id: 'sak', k: 'sak', r: 1, c: 0, x0, rings });
  const ten = (c) => [mk(2, c, '1', 'd', { cl: 'rd' }), mk(2, c + 1, '0', 'd', { cl: 'rd' })];
  const fill = (n, v) => { const a = Array(10).fill(''); for (let i = 0; i < n; i++) a[i] = v; return a; };
  const cat = (x, y) => x.concat(y).slice(0, 10).concat(Array(Math.max(0, 10 - x.length - y.length)).fill(''));

  // ---- 手順を つくる ----
  // S.split：'back'（後ろの数を わける）／'front'（前の数を わける）
  // S.sub：'kagen'（減加法）／'gengen'（減減法）
  // lv：'many'（たくさん）／'some'（すこし）／'none'（なし）
  function build(p, S, lv) {
    S = S || {}; lv = lv || 'many';
    const { a, op, b, ans, cls } = p;
    const fm = row(0, [a, OPS[op], b, EQ], F);
    const ca = fm.cols[0], cb = fm.cols[2];
    const P = { formula: `${a}${OPS[op]}${b}`, base: fm.marks, steps: [], fin: [], ans, cls,
      fig0: { A: fill(0), B: fill(0), mk: a }, assist: { type: 'sak', p: { a, op, b, ans, cls }, split: S.split || 'back', sub: S.sub || 'kagen' } };
    const fin = (say, o) => inStep(0, fm.next, ans, Object.assign({ say, final: true }, o || {}));
    const eq = (r, toks, v, say, o) => {
      const e = row(r, toks, F);
      return inStep(r, e.next, v, Object.assign({ say, pre: e.marks }, o || {}));
    };
    const H = cs => cs.map(c => [0, c]);
    const steps = P.steps;

    // すこし・なし：答えだけ
    if (lv !== 'many') {
      steps.push(fin('こたえは いくつ？<br>{赤|あか}い わくに かこう', { assist: P.assist, ask: lv === 'some', hl: H([...ca, ...cb]) }));
      return P;
    }
    const zero = a === 0 || b === 0;
    const u = a % 10;

    if (cls === 'add1') {
      if (S.split === 'front') {
        // 前の数を わける：3＋9 → 3を 2と 1、9＋1＝10、10＋2
        const need = 10 - b, rest = a - need, c = ca[0];
        P.fig0 = { A: fill(b, 'p'), B: fill(a, 'b'), mk: b };
        steps.push(inStep(2, c + 1, need, { say: `${b}は あと いくつで 10？`, pre: [sak(c + .5, [[c - 1, c - 1], [c + 1, c + 1]])], hl: H(cb), fhl: { A: 'empty', seg: [b, 10] }, wr: { k: 'to10', a: b } }));
        steps.push(inStep(2, c - 1, rest, { say: `${a}を ${need}と いくつに わける？`, hl: [[0, c], [2, c + 1]], wr: { k: 'split', n: a, k1: need } }));
        steps.push(move({ b: `${a}から ${need}こ うごかして、10を つくろう`, l: `${b}から ${need} すすむと？<br>{数|かず}の {線|せん}を タップ`, s: `${b}に ${need}を たすと 10だね` },
          { kind: 'move', from: 'B', color: 'b', n: need, line: [b, 10], lab: PL + need }, [[2, c + 1]]));
        steps.push(eq(4, [b, PL, need, EQ], 10, `${b}＋${need}は？`, { hl: [[0, ...cb], [2, c + 1]] }));
        steps.push(eq(5, [10, PL, rest, EQ], ans, `10と ${rest}で いくつ？`, { hl: [[2, c - 1]], arc: [10, ans, PL + rest] }));
      } else {
        // 後ろの数を わける：8＋5 → 5を 2と 3、8＋2＝10、10＋3
        const need = 10 - a, rest = b - need, c = cb[0];
        P.fig0 = { A: fill(a, 'b'), B: fill(b, 'p'), mk: a };
        steps.push(inStep(2, c - 1, need, { say: `${a}は あと いくつで 10？`, pre: [sak(c + .5, [[c - 1, c - 1], [c + 1, c + 1]])], hl: H(ca), fhl: { A: 'empty', seg: [a, 10] }, wr: { k: 'to10', a } }));
        steps.push(inStep(2, c + 1, rest, { say: `${b}を ${need}と いくつに わける？`, hl: [[0, c], [2, c - 1]], wr: { k: 'split', n: b, k1: need } }));
        steps.push(move({ b: `${b}から ${need}こ うごかして、10を つくろう`, l: `${a}から ${need} すすむと？<br>{数|かず}の {線|せん}を タップ`, s: `${a}に ${need}を たすと 10だね` },
          { kind: 'move', from: 'B', color: 'p', n: need, line: [a, 10], lab: PL + need }, [[2, c - 1]]));
        steps.push(eq(4, [a, PL, need, EQ], 10, `${a}＋${need}は？`, { hl: [[0, ca[0]], [2, c - 1]] }));
        steps.push(eq(5, [10, PL, rest, EQ], ans, `10と ${rest}で いくつ？`, { hl: [[2, c + 1]], arc: [10, ans, PL + rest] }));
      }
      steps.push(fin('こたえを {式|しき}に かこう', { hl: lastCells(steps) }));
      return P;
    }

    if (zero) {
      // 0の けいさん（おたすけモードだけ）
      P.fig0 = a <= 10 ? { A: fill(a, 'b'), B: fill(op === '+' ? b : 0, 'p'), mk: a } : { A: fill(10, 'b'), B: fill(u, 'b'), mk: a };
      steps.push(fin(`0は「なにも ない」ことだよ。<br>こたえを {式|しき}に かこう`, { hl: H([...ca, ...cb]) }));
      return P;
    }

    if (cls === 'addS') {
      P.fig0 = { A: fill(a, 'b'), B: fill(b, 'p'), mk: a };
      steps.push(move({ b: `${b}こを ${a}の ほうへ うごかそう`, l: `${a}から ${b} すすむと？<br>{数|かず}の {線|せん}を タップ`, s: `${a}と ${b}を あわせよう` },
        { kind: 'move', from: 'B', color: 'p', n: b, line: [a, ans], lab: PL + b }, H([...ca, ...cb])));
      steps.push(fin('ぜんぶで いくつ？<br>{式|しき}に かこう', {}));
      return P;
    }
    if (cls === 'add10') {
      P.fig0 = { A: fill(10, 'b'), B: fill(b, 'p'), mk: 10 };
      steps.push(fin(`10と ${b}で いくつ？<br>{式|しき}に かこう`, { hl: H([...ca, ...cb]), fhl: { B: 'all' }, arc: [10, ans, PL + b] }));
      return P;
    }
    if (cls === 'subS') {
      P.fig0 = { A: fill(a, 'b'), B: fill(0), mk: a };
      steps.push(move({ b: `${a}こから ${b}こ とろう<br>ブロックを タップ`, l: `${a}から ${b} もどると？<br>{数|かず}の {線|せん}を タップ`, s: `${a}から ${b}を とろう` },
        { kind: 'take', from: 'A', n: b, line: [a, ans], lab: MI + b }, H([...ca, ...cb])));
      steps.push(fin('のこりは いくつ？<br>{式|しき}に かこう', {}));
      return P;
    }

    // ここから下は 十いくつ（11〜19）を 10と いくつに わける
    const c0 = ca[0], teenSak = () => [sak(c0 + 1, [[c0 - 1, c0], [c0 + 2, c0 + 2]]), ...ten(c0 - 1)];
    const split = (o) => inStep(2, c0 + 2, u, Object.assign({ say: `${a}を 10と いくつに わける？`, pre: teenSak(), hl: H(ca), fhl: { A: 'all', seg: [10, a] }, wr: { k: 'teen', t: a } }, o || {}));

    if (cls === 'addT') {
      P.fig0 = { A: fill(10, 'b'), B: cat(fill(u, 'b').slice(0, u), fill(b, 'p').slice(0, b)), mk: a };
      steps.push(split({ fhl: { A: 'all', seg: [10, a] } }));
      steps.push(eq(4, [u, PL, b, EQ], u + b, `${u}＋${b}は？`, { hl: [[2, c0 + 2], [0, cb[0]]], fhl: { B: 'all' } }));
      steps.push(eq(5, [10, PL, u + b, EQ], ans, `10と ${u + b}で いくつ？`, { hl: [[2, c0 - 1], [2, c0]], arc: [a, ans, PL + b] }));
      steps.push(fin('こたえを {式|しき}に かこう', { hl: lastCells(steps) }));
      return P;
    }
    // ひき算は 10と ばらで ならべる
    P.fig0 = { A: fill(10, 'b'), B: fill(u, 'b'), mk: a };
    if (cls === 'sub10') {
      steps.push(split());
      steps.push(move({ b: '10の まとまりを タップして とろう', l: `${a}から 10 もどると？<br>{数|かず}の {線|せん}を タップ`, s: `${a}から 10を とろう` },
        { kind: 'take', from: 'A', n: 10, all: true, line: [a, ans], lab: MI + 10 }, [[2, c0 - 1], [2, c0]]));
      steps.push(fin('のこりは いくつ？<br>{式|しき}に かこう', { hl: [[2, c0 + 2]] }));
      return P;
    }
    if (cls === 'subT') {
      steps.push(split());
      steps.push(move({ b: `ばらの ${u}こから ${b}こ とろう<br>ブロックを タップ`, l: `${a}から ${b} もどると？<br>{数|かず}の {線|せん}を タップ`, s: `ばらの ${u}から ${b}を とろう` },
        { kind: 'take', from: 'B', n: b, line: [a, ans], lab: MI + b }, [[2, c0 + 2], [0, cb[0]]]));
      steps.push(eq(4, [u, MI, b, EQ], u - b, `${u}−${b}は？`, { hl: [[2, c0 + 2], [0, cb[0]]] }));
      steps.push(eq(5, [10, PL, u - b, EQ], ans, `10と ${u - b}で いくつ？`, { hl: [[2, c0 - 1], [2, c0]] }));
      steps.push(fin('こたえを {式|しき}に かこう', { hl: lastCells(steps) }));
      return P;
    }
    // sub1：くりさがり あり
    if (S.sub === 'gengen') {
      // 減減法：13−9 → 9を 3と 6、13−3＝10、10−6＝4
      const c = cb[0], r2 = b - u;
      steps.push(inStep(2, c - 1, u, { say: `${a}から いくつ ひくと 10？`, pre: [sak(c + .5, [[c - 1, c - 1], [c + 1, c + 1]])], hl: H(ca), fhl: { B: 'all', seg: [10, a] }, wr: { k: 'from10', t: a } }));
      steps.push(inStep(2, c + 1, r2, { say: `${b}を ${u}と いくつに わける？`, hl: [[0, c], [2, c - 1]], wr: { k: 'split', n: b, k1: u } }));
      steps.push(move({ b: `ばらの ${u}こを ぜんぶ とろう<br>ブロックを タップ`, l: `${a}から ${u} もどると？<br>{数|かず}の {線|せん}を タップ`, s: `${a}から ${u}を とると 10だね` },
        { kind: 'take', from: 'B', n: u, line: [a, 10], lab: MI + u }, [[2, c - 1]]));
      steps.push(eq(4, [a, MI, u, EQ], 10, `${a}−${u}は？`, { hl: [[0, ...ca], [2, c - 1]] }));
      steps.push(move({ b: `10から ${r2}こ とろう<br>ブロックを タップ`, l: `10から ${r2} もどると？<br>{数|かず}の {線|せん}を タップ`, s: `10から ${r2}を とろう` },
        { kind: 'take', from: 'A', n: r2, line: [10, ans], lab: MI + r2 }, [[2, c + 1]]));
      steps.push(eq(5, [10, MI, r2, EQ], ans, `10−${r2}は？`, { hl: [[2, c + 1]] }));
    } else {
      // 減加法：13−9 → 13を 10と 3、10−9＝1、1＋3＝4
      const w = 10 - b;
      steps.push(split());
      steps.push(move({ b: `10の ほうから ${b}こ とろう<br>ブロックを タップ`, l: `10から ${b} もどると？<br>{数|かず}の {線|せん}を タップ`, s: `10から ${b}を とろう` },
        { kind: 'take', from: 'A', n: b, line: [10, w], lab: MI + b }, [[2, c0 - 1], [2, c0], [0, cb[0]]]));
      steps.push(eq(4, [10, MI, b, EQ], w, `10−${b}は？`, { hl: [[2, c0 - 1], [2, c0], [0, cb[0]]] }));
      steps.push(eq(5, [w, PL, u, EQ], ans, `${w}と ${u}で いくつ？`, { hl: [...lastCells(steps), [2, c0 + 2]], arc: [w, ans, PL + u] }));
    }
    steps.push(fin('こたえを {式|しき}に かこう', { hl: lastCells(steps) }));
    return P;
  }
  function move(say, mv, hl) { return { type: 'move', say, mv, hl: hl || [] }; }
  function lastCells(steps) { for (let i = steps.length - 1; i >= 0; i--) if (steps[i].type === 'in') return steps[i].cells; return []; }

  const API = { COLS, ROWS, F, parse, classify, list, build, KIND };
  if (typeof module !== 'undefined') module.exports = API; else root.OTASUKE = API;
})(this);
