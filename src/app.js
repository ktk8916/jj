/* ================= 시작: 단축키 · 초기화 ================= */
(() => {
  const JJ = window.JJ;
  const { byId, isMobile, state, save, PANES, renderPanes, togglePane, setPanel, runCode, stopPlay, isPlaying,
          renderAll, renderSpeechPane, highlight, importFromHash } = JJ;

  /* 단축키 */
  document.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();
    let handled = true;
    if (e.key === 'F5' || (mod && e.key === 'Enter')) runCode();
    else if (mod && key === 'j') setPanel(!!state.panelClosed);
    else if (mod && key === 'b') togglePane('ref');
    else if (mod && key === 's') { save(); byId('stRun').textContent = '저장됨'; }
    else if (e.key === 'Escape' && isPlaying()) stopPlay('user');
    else handled = false;
    if (handled) e.preventDefault();
  });

  /* 초기화 */
  if (isMobile()) for (const p of PANES) state.panes[p] = false;  // 모바일은 항상 접힌 채 시작
  renderPanes();
  byId('panel').classList.toggle('closed', !!state.panelClosed);
  byId('togglePanel').classList.toggle('on', !state.panelClosed);
  document.querySelectorAll('.ref pre').forEach(pre => { pre.innerHTML = highlight(pre.textContent).replace(/\n $/, ''); });
  renderSpeechPane();
  renderAll();
  importFromHash();
})();
