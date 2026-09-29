/* ================= 레이아웃: 왼쪽 패널(문법/예제/탐색기)과 터미널 패널 ================= */
(() => {
  const JJ = window.JJ ??= {};
  const { byId, isMobile, state, save, PANES } = JJ;

  // 패널 열림 상태를 화면에 반영한다
  function renderPanes() {
    for (const p of PANES) {
      const open = !!state.panes[p];
      document.querySelector(`.pane[data-view=${p}]`).hidden = !open;
      document.querySelector(`.activity [data-view=${p}]`).classList.toggle('on', open);
    }
  }
  // 한 패널만 열거나 닫는다. 다른 패널은 건드리지 않는다 (모바일에서는 겹쳐 뜨므로 하나만 보이도록 나머지를 닫는다)
  function setPane(pane, open) {
    if (open && isMobile()) for (const p of PANES) state.panes[p] = false;
    state.panes[pane] = open;
    save();
    renderPanes();
  }
  const togglePane = (pane) => setPane(pane, !state.panes[pane]);
  function closeAllPanes() {
    for (const p of PANES) state.panes[p] = false;
    save();
    renderPanes();
  }

  // 터미널 패널(출력/변수/음성)
  function showPane(p) {
    document.querySelectorAll('.panel-tabs [data-p]').forEach(b => b.classList.toggle('on', b.dataset.p === p));
    document.querySelectorAll('[data-pane]').forEach(d => d.hidden = d.dataset.pane !== p);
  }
  function setPanel(show) {
    state.panelClosed = !show; save();
    byId('panel').classList.toggle('closed', !show);
    byId('togglePanel').classList.toggle('on', show);
  }

  /* 이벤트 */
  document.querySelectorAll('.activity [data-view]').forEach(b => b.addEventListener('click', () => togglePane(b.dataset.view)));
  byId('panes').addEventListener('click', (e) => {
    if (e.target.closest('.close-view')) setPane(e.target.closest('.pane').dataset.view, false);
  });
  document.querySelectorAll('.panel-tabs [data-p]').forEach(b => b.addEventListener('click', () => showPane(b.dataset.p)));
  byId('togglePanel').addEventListener('click', () => setPanel(!!state.panelClosed));
  byId('closePanel').addEventListener('click', () => setPanel(false));
  byId('clearOut').addEventListener('click', () => { byId('out').innerHTML = ''; });

  Object.assign(JJ, { renderPanes, setPane, togglePane, closeAllPanes, showPane, setPanel });
})();
