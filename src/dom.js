/* ================= DOM 도우미 · 대화상자 =================
   플레이그라운드 모듈은 모두 전역 JJ에 기능을 등록한다. (file://에서도 열리도록 ES 모듈을 쓰지 않는다)
   로드 순서: dom → store → editor → layout → runner → speech → explorer → share → app */
(() => {
  const JJ = window.JJ ??= {};

  const byId = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const MOBILE_MAX = 720;  // style.css의 @media (max-width:720px)와 같아야 한다
  const isMobile = () => window.innerWidth <= MOBILE_MAX;

  /* 브라우저의 prompt/confirm/alert 대신 <dialog>를 쓴다. 임베디드 웹뷰처럼 prompt가 없는 환경에서도 동작한다.
     확인이면 입력값(입력 없는 대화상자는 true), 취소·Esc면 null */
  function openDialog({ title, message = '', input, okText = '확인', cancel = true }) {
    return new Promise(resolve => {
      const d = byId('dlg'), inp = byId('dlgInput');
      byId('dlgTitle').textContent = title;
      byId('dlgMsg').textContent = message; byId('dlgMsg').hidden = !message;
      inp.hidden = input === undefined; inp.value = input ?? '';
      byId('dlgCancel').hidden = !cancel;
      byId('dlgOk').textContent = okText;
      d.onclose = () => resolve(d.returnValue === 'ok' ? (input === undefined ? true : inp.value) : null);
      d.returnValue = '';
      d.showModal();
      if (input !== undefined) { inp.focus(); inp.select(); }
    });
  }
  const askText = (title, value, message) => openDialog({ title, message, input: value });
  const askConfirm = (title, message, okText) => openDialog({ title, message, okText }).then(v => v === true);
  const notify = (title, message) => openDialog({ title, message, cancel: false }).then(() => {});

  byId('dlgCancel').addEventListener('click', () => byId('dlg').close(''));

  // 화면 아래에 잠깐 떴다 사라지는 안내
  let toastTimer = null;
  function toast(message, ms = 2500) {
    const el = byId('toast');
    el.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 8.5l3 3 7-7"/></svg>' + esc(message);
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, ms);
  }

  Object.assign(JJ, { byId, esc, isMobile, openDialog, askText, askConfirm, notify, toast });
})();
