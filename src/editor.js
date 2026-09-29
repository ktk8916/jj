/* ================= 편집기 ================= */
(() => {
  const JJ = window.JJ ??= {};
  const { byId, esc, save, activeFile, isExample, fileBase } = JJ;

  const LINE_HEIGHT = 20;  // style.css의 --lh와 같아야 한다
  const EDITOR_PAD = 8;    // .code pre/textarea의 위쪽 padding
  const APP_TITLE = '티~원줴줴이야';
  const src = byId('src'), hl = byId('hl'), gutter = byId('gutter');
  const marks = { err: null, read: null };  // 강조할 줄 번호: 오류가 난 줄, 읽는 중인 줄
  const codeOf = (line) => line.split('#')[0].trim();  // 주석을 뗀 코드 부분

  function highlight(text) {
    return text.split('\n').map(line => {
      const hash = line.indexOf('#');
      const code = hash >= 0 ? line.slice(0, hash) : line;
      const cm = hash >= 0 ? `<span class="t-cm">${esc(line.slice(hash))}</span>` : '';
      const html = code.split(/(\s+)/).map(p =>
        !p || /^\s+$/.test(p) ? p : `<span class="${T1JJYA.tokenClass(p)}">${esc(p)}</span>`
      ).join('');
      return html + cm;
    }).join('\n') + '\n ';
  }

  function cursorPos() {
    const before = src.value.slice(0, src.selectionStart).split('\n');
    return { line: before.length, col: before[before.length - 1].length + 1 };
  }
  const lineTop = (ln) => EDITOR_PAD + (ln - 1) * LINE_HEIGHT;
  function placeMarker(el, ln) {
    el.hidden = !ln;
    if (ln) el.style.top = (lineTop(ln) - src.scrollTop) + 'px';
  }

  function renderEditor() {
    const f = activeFile();
    byId('editor').classList.toggle('empty', !f);
    byId('emptyMsg').hidden = !!f;
    byId('codeWrap').hidden = !f;
    gutter.hidden = !f;
    byId('roBar').hidden = !f || !isExample(f.name);
    byId('shareBtn').hidden = !f;
    if (!f) {
      byId('crumbs').textContent = '';
      byId('title').textContent = `${APP_TITLE} — 플레이그라운드`;
      return;
    }
    src.readOnly = isExample(f.name);
    if (src.value !== f.content) src.value = f.content;
    const root = isExample(f.name) ? '예제' : '내 파일';
    const crumbs = isExample(f.name) ? f.name.split('/').slice(1) : f.name.split('/');
    byId('crumbs').innerHTML = [root, ...crumbs].map(esc).join(' <span>›</span> ');
    byId('title').textContent = `${fileBase(f.name)} — ${APP_TITLE}`;
    refresh();
  }

  // 구문 강조, 줄 번호, 커서 위치를 다시 그린다
  function refresh() {
    hl.innerHTML = highlight(src.value);
    const n = src.value.split('\n').length;
    const { line, col } = cursorPos();
    gutter.innerHTML = Array.from({ length: n }, (_, i) => {
      const ln = i + 1;
      const cls = ln === marks.err ? 'err' : ln === line ? 'cur' : '';
      return `<div class="${cls}">${ln}</div>`;
    }).join('');
    byId('stPos').textContent = `줄 ${line}, 열 ${col}`;
    sync();
  }

  // 스크롤에 맞춰 강조 레이어와 줄 표시를 맞춘다
  function sync() {
    hl.scrollTop = src.scrollTop; hl.scrollLeft = src.scrollLeft;
    gutter.scrollTop = src.scrollTop;
    placeMarker(byId('curLine'), cursorPos().line);
    placeMarker(byId('errLine'), marks.err);
    placeMarker(byId('readLine'), marks.read);
  }

  function scrollToLine(ln) {
    const top = lineTop(ln);
    if (top < src.scrollTop + LINE_HEIGHT || top > src.scrollTop + src.clientHeight - 3 * LINE_HEIGHT)
      src.scrollTop = Math.max(0, top - src.clientHeight / 3);
  }

  /* 이벤트 */
  src.addEventListener('input', () => {
    JJ.stopPlay('user');
    const f = activeFile(); if (!f || isExample(f.name)) return;
    f.content = src.value; marks.err = null; save(); refresh();
  });
  src.addEventListener('scroll', sync);
  ['click', 'keyup', 'select'].forEach(ev => src.addEventListener(ev, refresh));
  src.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || src.readOnly) return;
    e.preventDefault();
    src.setRangeText('  ', src.selectionStart, src.selectionEnd, 'end');
    src.dispatchEvent(new Event('input'));
  });
  window.addEventListener('resize', sync);

  Object.assign(JJ, { APP_TITLE, src, marks, codeOf, highlight, renderEditor, refresh, sync, scrollToLine });
})();
