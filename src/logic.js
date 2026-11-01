// ===== おたすけ計算：手順づくり（画面とは わける） =====
// 99までの たし算・ひき算。20までは ブロックを うごかして、2けたは 10の ぼうと ばらで 考える。
(function (root) {
  'use strict';
  const COLS = 18, ROWS = 12, F = 3; // F＝式を かきはじめる 列
  const PL = '＋', MI = '−', EQ = '＝', OPS = { '+': PL, '-': MI };
  const OUT = 'この アプリでは 20までの {数|かず}で やろう', OUT99 = 'この アプリでは 99までの {数|かず}で やろう';
  const KIND = { addS: 'add0', add10: 'add0', addT: 'add0', add1: 'add1', subS: 'sub0', subT: 'sub0', sub10: 'sub0', sub1: 'sub1' };

  // ---- 式の しゅるい ----
  // 20までは これまでの しゅるい、それより 大きい 式は A2（たし算）・S2（ひき算）
  function classify(a, op, b) {
    if (a > 99 || b > 99) return { ok: false, msg: OUT99 };
    if (op === '-' && b > a) return { ok: false, msg: `${a}から ${b}は ひけないよ` };
    const s = small(a, op, b);
    return s.ok ? s : { ok: true, cls: op === '+' ? 'A2' : 'S2' };
  }
  function small(a, op, b) {
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
    const big = c.cls === 'A2' || c.cls === 'S2';
    const kind = KIND[c.cls] || (op === '+' ? (a % 10 + b % 10 >= 10 ? 'add1' : 'add0') : (b % 10 > a % 10 ? 'sub1' : 'sub0'));
    return { ok: true, a, op, b, cls: c.cls, kind, size: big ? '99' : '20', ans: op === '+' ? a + b : a - b };
  }

  // ---- 挑戦モードの 問題（0は つかわない・答えも 1いじょう）　size：'20'／'99' ----
  function list(kind, size) {
    const out = [], N = size === '99' ? 99 : 19;
    size = size || '20';
    for (const op of ['+', '-'])
      for (let a = 1; a <= N; a++)
        for (let b = 1; b <= N; b++) {
          const p = parse(`${a}${op}${b}`);
          if (p.ok && p.kind === kind && p.size === size && p.ans >= 1) out.push(p);
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
  // さくらんぼ（x0＝わける数の まんなか［マス］、rings＝下の まる、rr＝まるの 行）
  const sak = (x0, rings, rr, id) => ({ id: id || 'sak', k: 'sak', r: 1, c: 0, x0, rings, rr: rr || 2 });
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
      fig0: { A: fill(0), B: fill(0), mk: a }, assist: { type: 'sak', p: { a, op, b, ans, cls }, split: S.split || 'back', sub: S.sub || 'kagen', big: S.big || 'place' } };
    const fin = (say, o) => inStep(0, fm.next, ans, Object.assign({ say, final: true }, o || {}));
    P.ansBox = fin('').box;
    // さいごの 式の 答え＝式の 答え のときは、もう1回 書かせずに 式へ とばす
    const copyUp = () => {
      const l = steps[steps.length - 1], f = fin('');
      if (!l || l.type !== 'in' || l.exp !== ans) return steps.push(fin('こたえを {式|しき}に かこう', { hl: lastCells(steps) }));
      l.final = true; l.copy = { from: l.cells, to: f.cells }; l.add = l.add.concat(f.add);
    };
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
    if (cls === 'A2' || cls === 'S2') return big2(p, S, P, { ca, cb, fin, copyUp, eq, H, steps, zero });

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
      copyUp();
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
      copyUp();
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
      copyUp();
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
    copyUp();
    return P;
  }
  // ---- 2けた（20より 大きい）：10の ぼうと ばら ----
  // S.big：'place'（10と ばらに わける）／'make'（なんじゅうを つくる。くりあがり・くりさがりの ときだけ）
  function big2(p, S, P, o) {
    const { a, op, b, ans } = p, { ca, cb, fin, copyUp, eq, H, steps, zero } = o;
    const A = Math.floor(a / 10), ua = a % 10, B = Math.floor(b / 10), vb = b % 10;
    const grp = (n, c) => ({ c, rods: Array(Math.floor(n / 10)).fill('n'), units: Array(n % 10).fill('n') });
    const bs = op === '+' ? [grp(a, 'b'), grp(b, 'p')] : [grp(a, 'b')];
    const snap = hl => ({ g: JSON.parse(JSON.stringify(bs)), hl: hl || [] });
    const g0 = bs[0];
    const crossR = k => { for (let i = g0.rods.length - 1; i >= 0 && k > 0; i--) if (g0.rods[i] === 'n') { g0.rods[i] = 'x'; k--; } };
    const crossU = m => { for (let i = g0.units.length - 1; i >= 0 && m > 0; i--) if (g0.units[i] === 'n') { g0.units[i] = 'x'; m--; } };
    const brk = () => { const i = g0.rods.indexOf('n'); g0.rods.splice(i, 1); for (let k = 0; k < 10; k++) g0.units.push('n'); };
    P.big = true; P.mk0 = a;
    const push = (s, hl) => { s.bf = snap(hl); steps.push(s); return s; };
    const end = () => { P.bfEnd = snap(); steps.forEach(s => { if (!s.bf) s.bf = snap(); }); return P; };
    if (zero) { push(fin('0は「なにも ない」ことだよ。<br>こたえを {式|しき}に かこう', { hl: H([...ca, ...cb]) })); return end(); }
    let er = 4;
    const eqs = [];
    const E = (toks, v, say, x, hl) => { const s = push(eq(er++, toks, v, say, x), hl); eqs.push(s); return s; };
    const carry = op === '+' ? ua + vb >= 10 : vb > ua;
    const make = S.big === 'make' && carry && ua > 0;
    const aC = ca[0], bC = cb[0], bE = cb[cb.length - 1];
    const cells = rg => { const o2 = []; for (let c = rg[0]; c <= rg[1]; c++) o2.push(c); return o2; };
    const RC = (r, rg) => cells(rg).map(c => [r, c]);
    const red = (r, c0, v) => [...String(v)].map((ch, i) => mk(r, c0 + i, ch, 'd', { cl: 'rd' }));

    if (op === '+') {
      if (make) {
        // なんじゅうを つくる：38＋25 → 25を 2と 23、38＋2＝40、40＋23＝63
        const t = 10 * (A + 1), need = 10 - ua, rest = b - need;
        const L = [bC - 1, bC - 1], R = [bE + 1, bE + String(rest).length];
        push(inStep(2, L[0], need, { say: `${a}は あと いくつで ${t}？`, pre: [sak((bC + bE + 1) / 2, [L, R])], hl: H(ca), wr: { k: 'toT', a, t } }), ['0u']);
        push(inStep(2, R[0], rest, { say: `${b}を ${need}と いくつに わける？`, hl: [...H(cb), ...RC(2, L)], wr: { k: 'split', n: b, k1: need } }), ['1r', '1u']);
        E([a, PL, need, EQ], t, `${a}＋${need}は？`, { hl: [...H(ca), ...RC(2, L)], arc: [a, t, PL + need] }, ['0u']);
        // ばらが 10こ そろって 10の ぼうに なる
        const g1 = bs[1]; let n = need;
        while (n > 0) { if (!g1.units.length) { g1.rods.pop(); for (let k = 0; k < 10; k++) g1.units.push('n'); } g1.units.pop(); n--; }
        g0.units = []; g0.rods.push('n');
        E([t, PL, rest, EQ], ans, `${t}と ${rest}で いくつ？`, { hl: RC(2, R), arc: [t, ans, PL + rest] }, ['0r', '1r', '1u']);
        copyUp(); return end();
      }
      // 10と ばらに わける：38＋25 → 30＋20＝50、8＋5＝13、50＋13＝63
      const sA = a >= 10 && ua > 0, sB = b >= 10 && vb > 0;
      if (sA) {
        const L = [aC - 2, aC - 1], R = [aC + 1, aC + 1];
        push(inStep(2, L[0], 10 * A, { say: `${a}を なんじゅうと いくつに わけよう。<br>なんじゅう？`, pre: [sak(aC + 1, [L, R], 2, 'sakA')], hl: H(ca), wr: { k: 'tens', n: a } }), ['0r']);
        push(inStep(2, R[0], ua, { say: `${10 * A}と いくつで ${a}？`, hl: [...H(ca), ...RC(2, L)], wr: { k: 'split', n: a, k1: 10 * A } }), ['0u']);
      }
      if (sB) {
        const rr = sA ? 3 : 2, L = sA ? [bC, bC + 1] : [bC - 2, bC - 1], R = sA ? [bE + 2, bE + 2] : [bE + 1, bE + 1];
        push(inStep(rr, L[0], 10 * B, { say: `${b}を なんじゅうと いくつに わけよう。<br>なんじゅう？`, pre: [sak(bC + 1, [L, R], rr, 'sakB')], hl: H(cb), wr: { k: 'tens', n: b } }), ['1r']);
        push(inStep(rr, R[0], vb, { say: `${10 * B}と いくつで ${b}？`, hl: [...H(cb), ...RC(rr, L)], wr: { k: 'split', n: b, k1: 10 * B } }), ['1u']);
      }
      const T = 10 * (A + B), O = ua + vb;
      if (A > 0 && B > 0) E([10 * A, PL, 10 * B, EQ], T, `${10 * A}＋${10 * B}は？<div class="sub">10が ${A + B}こ</div>`, {}, ['0r', '1r']);
      if (ua > 0 && vb > 0) E([ua, PL, vb, EQ], O, `ばらを たそう。<br>${ua}＋${vb}は？`, {}, ['0u', '1u']);
      if (T > 0 && O > 0) E([T, PL, O, EQ], ans, `${T}と ${O}で いくつ？`, {}, ['0r', '1r', '0u', '1u']);
      lineArcs(eqs, a, B > 0 && vb > 0 ? [[a, a + 10 * B, PL + 10 * B], [a + 10 * B, ans, PL + vb]] : [[a, ans, PL + b]]);
      copyUp(); return end();
    }
    // ---- ひき算 ----
    if (make) {
      // なんじゅうを つくる：63−25 → 25を 3と 22、63−3＝60、60−22＝38
      const t = 10 * A, r2 = b - ua;
      const L = [bC - 1, bC - 1], R = [bE + 1, bE + String(r2).length];
      push(inStep(2, L[0], ua, { say: `${a}から いくつ ひくと ${t}？`, pre: [sak((bC + bE + 1) / 2, [L, R])], hl: H(ca), wr: { k: 'fromT', t: a, T: t } }), ['0u']);
      push(inStep(2, R[0], r2, { say: `${b}を ${ua}と いくつに わける？`, hl: [...H(cb), ...RC(2, L)], wr: { k: 'split', n: b, k1: ua } }));
      E([a, MI, ua, EQ], t, `${a}−${ua}は？`, { hl: [...H(ca), ...RC(2, L)], arc: [a, t, MI + ua] }, ['0u']);
      crossU(ua);
      const k = Math.floor(r2 / 10), m = r2 % 10;
      E([t, MI, r2, EQ], ans, `${t}−${r2}は？`, { hl: RC(2, R), arc: [t, ans, MI + r2] }, ['0r']);
      if (m) { brk(); crossU(m); }
      crossR(k);
      copyUp(); return end();
    }
    const sB = b >= 10 && vb > 0;
    let T, O, aTens;
    if (carry) {
      // ばらから ひけない：63を 50と 13に わける
      aTens = 10 * (A - 1);
      const L = [aC - 2, aC - 1], R = [aC + 1, aC + 2];
      push(inStep(2, R[0], 10 + ua, { say: `${ua}から ${vb}は ひけないね。<br>${a}を ${aTens}と いくつに わける？`, pre: [sak(aC + 1, [L, R], 2, 'sakA'), ...red(2, L[0], aTens)], hl: H(ca), wr: { k: 'split', n: a, k1: aTens } }), ['0r', '0u']);
      brk();
      T = aTens - 10 * B; O = 10 + ua - vb;
    } else {
      aTens = 10 * A;
      if (a >= 10 && ua > 0) {
        const L = [aC - 2, aC - 1], R = [aC + 1, aC + 1];
        push(inStep(2, L[0], aTens, { say: `${a}を なんじゅうと いくつに わけよう。<br>なんじゅう？`, pre: [sak(aC + 1, [L, R], 2, 'sakA')], hl: H(ca), wr: { k: 'tens', n: a } }), ['0r']);
        push(inStep(2, R[0], ua, { say: `${aTens}と いくつで ${a}？`, hl: [...H(ca), ...RC(2, L)], wr: { k: 'split', n: a, k1: aTens } }), ['0u']);
      }
      T = aTens - 10 * B; O = ua - vb;
    }
    const aSplit = steps.length > 0;
    if (sB) {
      const rr = aSplit ? 3 : 2, L = aSplit ? [bC, bC + 1] : [bC - 2, bC - 1], R = aSplit ? [bE + 2, bE + 2] : [bE + 1, bE + 1];
      push(inStep(rr, L[0], 10 * B, { say: `${b}を なんじゅうと いくつに わけよう。<br>なんじゅう？`, pre: [sak(bC + 1, [L, R], rr, 'sakB')], hl: H(cb), wr: { k: 'tens', n: b } }));
      push(inStep(rr, R[0], vb, { say: `${10 * B}と いくつで ${b}？`, hl: [...H(cb), ...RC(rr, L)], wr: { k: 'split', n: b, k1: 10 * B } }));
    }
    const onesA = carry ? 10 + ua : ua;
    if (B > 0) { E([aTens, MI, 10 * B, EQ], T, `${aTens}−${10 * B}は？<div class="sub">10が ${aTens / 10 - B}こ</div>`, {}, ['0r']); crossR(B); }
    if (vb > 0) { E([onesA, MI, vb, EQ], O, `ばらを ひこう。<br>${onesA}−${vb}は？`, {}, ['0u']); crossU(vb); }
    if (T > 0 && O > 0) E([T, PL, O, EQ], ans, `${T}と ${O}で いくつ？`, {}, ['0r', '0u']);
    lineArcs(eqs, a, B > 0 && vb > 0 ? [[a, a - 10 * B, MI + 10 * B], [a - 10 * B, ans, MI + vb]] : [[a, ans, MI + b]]);
    copyUp(); return end();
  }
  // 数の線の 矢印：はじめの 式と さいごの 式に つける
  function lineArcs(eqs, a, arcs) {
    if (!eqs.length) return;
    const last = eqs[eqs.length - 1];
    if (arcs.length === 1) last.arc = arcs[0];
    else if (eqs.length >= 2) { eqs[0].arc = arcs[0]; last.arc = arcs[1]; }
    else last.arcs = arcs;
  }
  function move(say, mv, hl) { return { type: 'move', say, mv, hl: hl || [] }; }
  function lastCells(steps) { for (let i = steps.length - 1; i >= 0; i--) if (steps[i].type === 'in') return steps[i].cells; return []; }

  const API = { COLS, ROWS, F, parse, classify, list, build, KIND };
  if (typeof module !== 'undefined') module.exports = API; else root.OTASUKE = API;
})(this);
