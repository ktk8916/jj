/* ================= 시작: 단축키 · 온보딩 · 초기화 ================= */
(() => {
  const JJ = window.JJ;
  const { byId, isMobile, state, save, PANES, renderPanes, togglePane, setPanel, runCode, stopPlay, isPlaying,
          renderAll, renderSpeechPane, highlight, importFromHash, openFile, newFile } = JJ;

  /* 온보딩: 네 단계짜리 안내. 단계마다 실제로 해 볼 수 있는 버튼이 있다 */
  const ob = byId('onboard');
  const obSteps = [...ob.querySelectorAll('.ob-step')];
  let obStep = 0;
  function showObStep(n) {
    obStep = Math.max(0, Math.min(obSteps.length - 1, n));
    obSteps.forEach((s, i) => { s.hidden = i !== obStep; });
    byId('obDots').innerHTML = obSteps.map((_, i) => `<i class="${i === obStep ? 'on' : ''}"></i>`).join('');
    byId('obPrev').hidden = obStep === 0;
    byId('obSkip').hidden = obStep === obSteps.length - 1;
    byId('obNext').textContent = obStep === obSteps.length - 1 ? '시작하기' : '다음';
  }
  function showOnboarding() {
    showObStep(0);
    ob.onclose = () => { state.onboarded = true; save(); };
    ob.showModal();
  }
  byId('obPrev').addEventListener('click', () => showObStep(obStep - 1));
  byId('obNext').addEventListener('click', () => { if (obStep === obSteps.length - 1) ob.close(); else showObStep(obStep + 1); });
  byId('obSkip').addEventListener('click', () => ob.close());
  ob.addEventListener('click', (e) => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'open-hello') { openFile('예제/기초/시작하기.jj'); runCode(); showObStep(obStep + 1); }
    if (action === 'new-file') { ob.close(); newFile(); }
  });

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
  byId('actHelp').addEventListener('click', showOnboarding);

  /* 초기화 */
  if (isMobile()) for (const p of PANES) state.panes[p] = false;  // 모바일은 항상 접힌 채 시작
  renderPanes();
  byId('panel').classList.toggle('closed', !!state.panelClosed);
  byId('togglePanel').classList.toggle('on', !state.panelClosed);
  document.querySelectorAll('.ref pre, .onboard pre').forEach(pre => { pre.innerHTML = highlight(pre.textContent).replace(/\n $/, ''); });
  renderSpeechPane();
  renderAll();
  importFromHash().then(() => { if (!state.onboarded) showOnboarding(); });
})();
