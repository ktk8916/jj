/* ================= 실행과 결과 표시 ================= */
(() => {
  const JJ = window.JJ ??= {};
  const { byId, esc, notify, modName, findModule, activeFile, src, marks, refresh, showPane, setPanel } = JJ;

  const runOpts = (f, trace) => ({
    name: modName(f.name),
    resolve: (mod) => findModule(mod)?.content ?? null,
    trace,
  });
  function timedRun(f, trace) {
    const t0 = performance.now();
    const result = T1JJYA.run(src.value, runOpts(f, trace));
    return { result, ms: (performance.now() - t0).toFixed(1) };
  }

  function setStatus(isError, runText) {
    byId('statusbar').classList.toggle('err', isError);
    byId('stState').textContent = isError ? '⊘ 1 ⚠ 0' : '⊘ 0 ⚠ 0';
    byId('stRun').textContent = runText;
  }
  function renderMemory(mem) {
    const keys = [...mem.keys()].sort((a, b) => a - b);
    byId('mem').innerHTML = keys.length
      ? `<table class="mem"><tr><th>변수</th><th>값</th></tr>` +
        keys.map(k => `<tr><td>${T1JJYA.varName(k)}</td><td>${mem.get(k)}</td></tr>`).join('') + '</table>'
      : '<span class="muted">본문에서 쓴 변수가 없습니다.</span>';
  }
  function showResult(f, r, ms) {
    const head = `<span class="meta">▶ ${esc(f.name)} 실행</span>\n`;
    const body = esc(r.out) + (r.out && !r.out.endsWith('\n') ? '\n' : '');
    const tail = r.ok
      ? `<span class="meta">✓ 종료 (${r.steps.toLocaleString()}단계, ${ms}ms)</span>`
      : `<span class="error">✗ ${r.line ? r.line + '번째 줄: ' : ''}${esc(r.error)}</span>`;
    byId('out').innerHTML = head + body + tail;
    marks.err = r.ok ? null : r.line;
    setStatus(!r.ok, r.ok ? `✓ ${r.steps.toLocaleString()}단계` : r.line ? `${r.line}번째 줄 오류` : '실행 오류');
    renderMemory(r.mem);
    showPane('out');
    setPanel(true);
    refresh();
    if (r.blocked) notify('출력할 수 없는 숫자입니다', '1557, 1601, 88848, 8884844는 출력할 수 없어요.');
  }
  function runCode() {
    JJ.stopPlay();
    const f = activeFile();
    if (!f) return;
    const { result, ms } = timedRun(f);
    showResult(f, result, ms);
  }

  byId('runBtn').addEventListener('click', runCode);

  Object.assign(JJ, { timedRun, setStatus, showResult, runCode });
})();
