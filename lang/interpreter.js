/* ================= 티~원줴줴이야 인터프리터 =================
   브라우저에서는 전역 T1JJYA로, Node에서는 module.exports로 쓴다.
   DOM에 의존하지 않으므로 그대로 테스트할 수 있다. */
const T1JJYA = (() => {
  const MAX_STEPS = 5_000_000;
  const MAX_DEPTH = 1000;
  const MAX_DOTS = 3;
  const BLOCKED = new Set([1557, 1601, 88848, 8884844]);

  // 예약어 → 구문 강조 클래스. 예약어 목록의 단일 출처
  const KEYWORD_CLASS = new Map([
    ['티~원', 't-brace'], ['줴줴이야', 't-brace'],
    ['엄', 't-kw'], ['아뇨아뇨아뇨', 't-kw'], ['앙기모링', 't-kw'], ['요이~', 't-kw'],
    ['랄로톤으로', 't-decl'], ['넌나가라', 't-decl'],
    ['지~랄', 't-print'],
  ]);
  const KW = new Set(KEYWORD_CLASS.keys());
  const RE_QUAL = /^([가-힣]+)\.([가-힣]+)$/;
  const RE_VAR = /^예\?+$/;
  const RE_STEP = /^(마렵네|어흐어흐)(\.*)$/;
  const RE_NAME = /^[가-힣]+$/;

  const varName = (k) => '예' + '?'.repeat(k);
  const isVar = (t) => RE_VAR.test(t);
  const isFuncName = (t) => RE_NAME.test(t) && !KW.has(t) && !RE_STEP.test(t);
  const isModName = isFuncName;
  // '곱' → {mod:null, name:'곱'}, '수학.곱' → {mod:'수학', name:'곱'}, 그 외 null
  const callTarget = (t) => {
    const m = t.match(RE_QUAL);
    if (m && isModName(m[1]) && isFuncName(m[2])) return { mod: m[1], name: m[2] };
    if (isFuncName(t)) return { mod: null, name: t };
    return null;
  };

  class T1Error extends Error {
    constructor(line, msg, blocked = false, mod = null) {
      super(msg); this.line = line; this.blocked = blocked; this.mod = mod;
    }
  }
  class Return { constructor(v) { this.v = v; } }

  /* ---------- 토큰화 ---------- */
  function tokenize(src) {
    const lines = [];
    src.split('\n').forEach((raw, i) => {
      const code = raw.split('#')[0].trim();
      if (code) lines.push({ ln: i + 1, toks: code.split(/\s+/) });
    });
    return lines;
  }

  /* ---------- 구문 분석 ----------
     결과: { main: Block, funcs: Map<이름, Func>, exports: Map<이름, 줄> }
     Block: { stmts, openLn, closeLn, owner }  (owner는 link 단계에서 채움)
     Func:  { name, params, ln, body: Block } */
  function parse(src) {
    const L = tokenize(src);
    if (!L.length) throw new T1Error(1, "프로그램이 비어 있습니다. '티~원'으로 시작하세요.");
    for (const { ln, toks } of L)
      for (const b of ['티~원', '줴줴이야'])
        if (toks.includes(b) && toks.length > 1) throw new T1Error(ln, `${b === '티~원' ? "'티~원'은" : "'줴줴이야'는"} 혼자 한 줄에 써야 합니다.`);
    if (L[0].toks[0] !== '티~원') throw new T1Error(L[0].ln, "프로그램은 '티~원'으로 시작해야 합니다.");

    const funcs = new Map();
    const exports = new Map();
    let i = 0;

    const bad = (ln, t, ctx) => /[0-9]/.test(t)
      ? new T1Error(ln, `숫자는 쓸 수 없습니다('${t}'). 값은 마렵네와 어흐어흐로 만드세요.`)
      : new T1Error(ln, ctx ? `${ctx}: '${t}'` : `알 수 없는 말투 '${t}'`);

    function needVar(ln, t, what) {
      if (t === undefined) throw new T1Error(ln, `${what} 뒤에 변수(예?, 예??, …)가 필요합니다.`);
      if (!isVar(t)) throw bad(ln, t, `${what} 자리에는 변수(예?, 예??, …)만 올 수 있습니다`);
      return t.length - 1;
    }
    function noExtra(ln, toks, n) {
      if (toks.length > n) throw new T1Error(ln, `이 줄에 필요 없는 말이 더 있습니다: '${toks.slice(n).join(' ')}'`);
    }

    function block(depth, inFunc) {
      const open = L[i]; i++;
      const stmts = [];
      for (;;) {
        if (i >= L.length) throw new T1Error(open.ln, "이 '티~원'을 닫는 '줴줴이야'가 없습니다.");
        if (L[i].toks[0] === '줴줴이야') {
          const closeLn = L[i].ln; i++;
          return { stmts, openLn: open.ln, closeLn, owner: null };
        }
        const s = stmt(depth, inFunc);
        if (s) stmts.push(s);
      }
    }
    function expectBlock(ln, what, depth, inFunc) {
      if (i >= L.length || L[i].toks[0] !== '티~원')
        throw new T1Error(L[i]?.ln ?? ln, `'${what}' 다음 줄에는 '티~원'이 와야 합니다.`);
      return block(depth + 1, inFunc);
    }

    function stmt(depth, inFunc) {
      const { ln, toks } = L[i];
      const h = toks[0];

      if (h === '티~원')
        throw new T1Error(ln, "'티~원'은 엄, 아뇨아뇨아뇨, 앙기모링, 랄로톤으로 다음 줄에만 올 수 있습니다.");

      if (h === '랄로톤으로') {
        if (depth !== 0) throw new T1Error(ln, '함수는 프로그램 맨 바깥에서만 정의할 수 있습니다.');
        const name = toks[1];
        if (!name) throw new T1Error(ln, '랄로톤으로 뒤에 함수 이름이 필요합니다.');
        if (!isFuncName(name)) throw new T1Error(ln, `함수 이름은 예약어가 아닌 한글이어야 합니다: '${name}'`);
        if (funcs.has(name)) throw new T1Error(ln, `'${name}' 함수가 이미 있습니다.`);
        const params = toks.slice(2).map(t => needVar(ln, t, '매개변수'));
        if (new Set(params).size !== params.length) throw new T1Error(ln, '같은 매개변수를 두 번 쓸 수 없습니다.');
        const fn = { name, params, ln, body: null };
        funcs.set(name, fn);
        i++;
        fn.body = expectBlock(ln, '랄로톤으로', depth, true);
        return null;
      }

      if (h === '넌나가라') {
        if (depth !== 0) throw new T1Error(ln, '넌나가라는 프로그램 맨 바깥에서만 쓸 수 있습니다.');
        const name = toks[1];
        if (!name) throw new T1Error(ln, '넌나가라 뒤에 내보낼 함수 이름이 필요합니다.');
        if (!isFuncName(name)) throw new T1Error(ln, `넌나가라 뒤에는 이 파일의 함수 이름만 올 수 있습니다: '${name}'`);
        noExtra(ln, toks, 2);
        exports.set(name, ln);
        i++;
        return null;
      }

      if (h === '엄') {
        const v = needVar(ln, toks[1], '엄'); noExtra(ln, toks, 2);
        i++;
        const branches = [{ v, ln, body: expectBlock(ln, '엄', depth, inFunc) }];
        let elseBody = null, elseLn = null;
        while (i < L.length && L[i].toks[0] === '아뇨아뇨아뇨') {
          const { ln: l2, toks: t2 } = L[i];
          if (t2.length === 1) { i++; elseBody = expectBlock(l2, '아뇨아뇨아뇨', depth, inFunc); elseLn = l2; break; }
          if (t2[1] !== '엄') throw new T1Error(l2, "'아뇨아뇨아뇨' 뒤에는 아무것도 없거나 '엄 변수'만 올 수 있습니다.");
          const v2 = needVar(l2, t2[2], '아뇨아뇨아뇨 엄'); noExtra(l2, t2, 3);
          i++;
          branches.push({ v: v2, ln: l2, body: expectBlock(l2, '아뇨아뇨아뇨 엄', depth, inFunc) });
        }
        return { k: 'if', ln, branches, elseBody, elseLn };
      }
      if (h === '아뇨아뇨아뇨') throw new T1Error(ln, "'아뇨아뇨아뇨'는 '엄' 블록이 끝난 바로 다음 줄에만 올 수 있습니다.");

      if (h === '앙기모링') {
        const v = needVar(ln, toks[1], '앙기모링'); noExtra(ln, toks, 2);
        i++;
        return { k: 'while', ln, v, body: expectBlock(ln, '앙기모링', depth, inFunc) };
      }

      if (h === '지~랄') {
        const v = needVar(ln, toks[1], '지~랄'); noExtra(ln, toks, 2);
        i++;
        return { k: 'print', ln, v };
      }

      if (h === '요이~' || RE_STEP.test(h))
        throw new T1Error(ln, `'${h.replace(/\.+$/, '')}'는 변수 뒤에 씁니다. 예: '예? ${h}'`);

      if (isVar(h)) {
        const v = h.length - 1;
        const op = toks[1];
        if (op === undefined)
          throw new T1Error(ln, `'${h}' 뒤에 마렵네, 어흐어흐, 요이~ 또는 함수 이름이 와야 합니다.`);
        const m = op.match(RE_STEP);
        if (m) {
          noExtra(ln, toks, 2);
          const dots = m[2].length;
          if (dots > MAX_DOTS) throw new T1Error(ln, `점은 세 개까지만 붙일 수 있습니다: '${op}'`);
          i++;
          return { k: 'add', ln, v, n: (m[1] === '마렵네' ? 1 : -1) * Math.max(1, dots) };
        }
        if (op === '요이~') {
          if (!inFunc) throw new T1Error(ln, '요이~는 함수 안에서만 쓸 수 있습니다.');
          noExtra(ln, toks, 2);
          i++;
          return { k: 'ret', ln, v };
        }
        const tgt = callTarget(op);
        if (tgt) {
          const args = toks.slice(2).map(t => needVar(ln, t, '함수 인자'));
          i++;
          return { k: 'call', ln, ...tgt, args, dst: v };
        }
        throw bad(ln, op);
      }

      const tgt = callTarget(h);
      if (tgt) {
        const args = toks.slice(1).map(t => needVar(ln, t, '함수 인자'));
        i++;
        return { k: 'call', ln, ...tgt, args, dst: null };
      }

      throw bad(ln, h);
    }

    const main = block(0, false);
    if (i < L.length) throw new T1Error(L[i].ln, "프로그램 끝 '줴줴이야' 뒤에는 아무것도 올 수 없습니다.");

    for (const [name, eln] of exports)
      if (!funcs.has(name)) throw new T1Error(eln, `'${name}' 함수가 이 파일에 없어서 내보낼 수 없습니다.`);
    return { main, funcs, exports };
  }

  /* ---------- 연결 ----------
     호출문(call)을 실제 함수 객체에 연결하고, 블록/문장마다 소속 파일(owner)을 적는다.
     다른 파일은 resolve(파일명) → 소스 문자열 로 불러와 파싱한다. */
  function link(entryName, entry, resolve) {
    const mods = new Map([[entryName, entry]]);
    const pending = [];
    const loadMod = (name, atLn, fromMod) => {
      if (mods.has(name)) return mods.get(name);
      const src = resolve ? resolve(name) : null;
      if (src == null) throw new T1Error(atLn, `'${name}.jj' 파일이 없습니다.`, false, fromMod);
      let m;
      try { m = parse(src); }
      catch (e) {
        if (e instanceof T1Error) throw new T1Error(atLn, `${name}.jj ${e.line}번째 줄: ${e.message}`, false, fromMod);
        throw e;
      }
      mods.set(name, m);
      for (const fn of m.funcs.values()) pending.push([name, fn.body]);
      return m;
    };
    const resolveCall = (s, modName) => {
      const mod = mods.get(modName);
      let fn;
      if (s.mod === null) {
        fn = mod.funcs.get(s.name);
        if (!fn) throw new T1Error(s.ln, `'${s.name}' 함수가 없습니다.`, false, modName);
      } else {
        const target = loadMod(s.mod, s.ln, modName);
        fn = target.funcs.get(s.name);
        if (!fn) throw new T1Error(s.ln, `${s.mod}.jj에 '${s.name}' 함수가 없습니다.`, false, modName);
        if (s.mod !== modName && !target.exports.has(s.name))
          throw new T1Error(s.ln, `${s.mod}.jj의 '${s.name}'는 넌나가라로 내보내지 않은 함수입니다.`, false, modName);
      }
      if (fn.params.length !== s.args.length)
        throw new T1Error(s.ln, `'${s.name}' 함수는 인자 ${fn.params.length}개를 받는데 ${s.args.length}개를 넘겼습니다.`, false, modName);
      return fn;
    };
    const walk = (modName, blk) => {
      blk.owner = modName;
      for (const s of blk.stmts) {
        s.owner = modName;
        if (s.k === 'call') s.fn = resolveCall(s, modName);
        if (s.k === 'if') { s.branches.forEach(b => walk(modName, b.body)); if (s.elseBody) walk(modName, s.elseBody); }
        if (s.k === 'while') walk(modName, s.body);
      }
    };
    pending.push([entryName, entry.main]);
    for (const fn of entry.funcs.values()) pending.push([entryName, fn.body]);
    while (pending.length) { const [n, b] = pending.pop(); walk(n, b); }
  }

  /* ---------- 실행 ----------
     opts.name    : 이 파일의 이름(확장자 없이). 다른 파일 오류를 구분하는 데 쓴다
     opts.resolve : (파일명) → 소스 문자열 | null
     opts.trace   : ({ln, out?}) => void. 이 파일에서 실행된 줄을 순서대로 알려준다 (읽으면서 실행)
     결과: { ok, out, mem: Map<변수번호, 값>, steps, error?, line?, blocked? } */
  function run(src, opts = {}) {
    const entryName = opts.name ?? '';
    const mainVars = new Map();
    let out = '', steps = 0, depth = 0;
    const tick = (s) => {
      if (++steps > MAX_STEPS)
        throw new T1Error(s.ln, `${MAX_STEPS.toLocaleString()}단계를 넘어 멈췄습니다. 끝나지 않는 반복인지 확인하세요.`, false, s.owner);
    };
    const get = (vars, k) => vars.get(k) ?? 0;
    const emit = (owner, ln, extra) => { if (opts.trace && owner === entryName && ln) opts.trace({ ln, ...extra }); };

    try {
      const entry = parse(src);
      link(entryName, entry, opts.resolve);

      const call = (fn, vals, s) => {
        if (++depth > MAX_DEPTH)
          throw new T1Error(s.ln, `함수 호출이 ${MAX_DEPTH}번 넘게 겹쳤습니다. 재귀가 끝나는지 확인하세요.`, false, s.owner);
        const vars = new Map();
        fn.params.forEach((p, j) => vars.set(p, vals[j]));
        try { block(fn.body, vars); return 0; }
        catch (e) { if (e instanceof Return) return e.v; throw e; }
        finally { depth--; }
      };

      const block = (blk, vars) => {
        emit(blk.owner, blk.openLn);
        exec(blk.stmts, vars);
        emit(blk.owner, blk.closeLn);
      };

      const exec = (stmts, vars) => {
        for (const s of stmts) {
          tick(s);
          if (s.k !== 'print' && s.k !== 'if') emit(s.owner, s.ln);
          switch (s.k) {
            case 'add': vars.set(s.v, get(vars, s.v) + s.n); break;
            case 'print': {
              const x = get(vars, s.v);
              if (BLOCKED.has(x)) { emit(s.owner, s.ln); throw new T1Error(s.ln, '출력할 수 없는 숫자입니다.', true, s.owner); }
              out += x + '\n';
              emit(s.owner, s.ln, { out: x });
              break;
            }
            case 'if': {
              let hit = null;
              for (const b of s.branches) {
                emit(s.owner, b.ln);
                if (get(vars, b.v) !== 0) { hit = b; break; }
              }
              if (hit) block(hit.body, vars);
              else if (s.elseBody) { emit(s.owner, s.elseLn); block(s.elseBody, vars); }
              break;
            }
            case 'while':
              while (get(vars, s.v) !== 0) { block(s.body, vars); tick(s); emit(s.owner, s.ln); }
              break;
            case 'ret': throw new Return(get(vars, s.v));
            case 'call': {
              const r = call(s.fn, s.args.map(a => get(vars, a)), s);
              if (s.dst !== null) vars.set(s.dst, r);
              break;
            }
          }
        }
      };

      block(entry.main, mainVars);
      return { ok: true, out, mem: mainVars, steps };
    } catch (e) {
      const partial = { ok: false, out, mem: mainVars, steps };
      if (e instanceof RangeError)
        return { ...partial, error: '함수 호출이 너무 깊어져 멈췄습니다.', line: null };
      if (!(e instanceof T1Error)) throw e;
      const here = e.mod === null || e.mod === entryName;
      return {
        ...partial,
        error: here ? e.message : `${e.mod}.jj ${e.line}번째 줄: ${e.message}`,
        line: here ? e.line : null,
        blocked: e.blocked,
      };
    }
  }

  /* ---------- 구문 강조 ---------- */
  function tokenClass(t) {
    if (KEYWORD_CLASS.has(t)) return KEYWORD_CLASS.get(t);
    const m = t.match(RE_STEP);
    if (m) return m[2].length <= MAX_DOTS ? 't-step' : 't-bad';
    if (isVar(t)) return 't-var';
    if (callTarget(t)) return 't-fn';
    return 't-bad';
  }

  return { parse, run, tokenClass, varName, isVar, isModName, callTarget };
})();
if (typeof module !== 'undefined') module.exports = T1JJYA;
