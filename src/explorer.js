/* ================= 탐색기 · 탭 · 파일 조작 ================= */
(() => {
  const JJ = window.JJ ??= {};
  const { byId, esc, isMobile, askText, askConfirm, notify, state, save, fileBase, modName, isExample, activeFile, findModule,
          src, marks, refresh, renderEditor, closeAllPanes, stopPlay } = JJ;

  const NEW_FILE_TEMPLATE = '티~원\n\n줴줴이야\n';
  const LOCK_SVG = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="3.5" y="7" width="9" height="7" rx="1"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"/></svg>';

  /* ---------- 그리기 ---------- */
  const fileRow = (f, depth) => `
      <li class="${f.name === state.active ? 'on' : ''}" data-name="${esc(f.name)}" tabindex="0" style="padding-left:${24 + depth * 12}px">
        <span class="fi">~</span><span class="nm">${esc(fileBase(f.name))}</span>
        ${isExample(f.name)
          ? `<span class="lock" title="읽기 전용">${LOCK_SVG}</span>`
          : `<button class="icon-btn del" data-del="${esc(f.name)}" title="삭제" aria-label="${esc(fileBase(f.name))} 삭제">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5"/></svg>
        </button>`}
      </li>`;

  // files를 폴더 트리로 그린다. stripPrefix는 이름 앞에서 떼어 낼 폴더 수(예제의 '예제/')
  function renderTree(files, sectionKey, stripPrefix) {
    const tree = { dirs: {}, files: [] };
    for (const f of files) {
      let node = tree;
      for (const d of f.name.split('/').slice(stripPrefix, -1)) node = node.dirs[d] ??= { dirs: {}, files: [] };
      node.files.push(f);
    }
    const html = [];
    const walk = (node, prefix, depth) => {
      for (const [d, child] of Object.entries(node.dirs)) {
        const path = prefix + d;
        const key = sectionKey + ':' + path;
        const closed = !!state.closed[key];
        html.push(`<li class="dir ${closed ? 'closed' : ''}" data-dir="${esc(key)}" tabindex="0" aria-expanded="${!closed}" style="padding-left:${8 + depth * 12}px">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M4 6l4 4 4-4z"/></svg><span class="nm">${esc(d)}</span></li>`);
        if (!closed) walk(child, path + '/', depth + 1);
      }
      html.push(...node.files.map(f => fileRow(f, depth)));
    };
    walk(tree, '', 0);
    return html.join('');
  }

  function renderFiles() {
    byId('filesMine').innerHTML = state.files.length
      ? renderTree(state.files, 'mine', 0)
      : '<li class="hint">아직 파일이 없어요. 위의 새 파일 버튼을 눌러 보세요.</li>';
    byId('filesEx').innerHTML = renderTree(EXAMPLES, 'ex', 1);
  }

  function renderTabs() {
    byId('tablist').innerHTML = state.open.map(name => `
      <div class="tab ${name === state.active ? 'on' : ''}" data-name="${esc(name)}" role="tab" tabindex="0">
        <span class="fi">~</span>${esc(fileBase(name))}${isExample(name) ? `<span class="lock" title="읽기 전용">${LOCK_SVG}</span>` : ''}
        <button class="x" data-close="${esc(name)}" aria-label="${esc(name)} 닫기">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M4 4l8 8M12 4l-8 8"/></svg>
        </button>
      </div>`).join('');
  }

  function renderAll() { renderFiles(); renderTabs(); renderEditor(); }

  /* ---------- 열기 / 닫기 / 삭제 ---------- */
  function openFile(name) {
    if (name !== state.active) stopPlay('user');
    if (!state.open.includes(name)) state.open.push(name);
    state.active = name; marks.err = null; save(); renderAll();
    if (isMobile()) closeAllPanes();
    src.focus();
  }
  function closeTab(name) {
    const i = state.open.indexOf(name);
    if (i < 0) return;
    if (name === state.active) stopPlay('user');
    state.open.splice(i, 1);
    if (state.active === name) state.active = state.open[Math.max(0, i - 1)] ?? null;
    marks.err = null; save(); renderAll();
  }
  async function deleteFile(name) {
    if (isExample(name)) return;
    if (!await askConfirm('파일 삭제', `'${name}' 파일을 삭제할까요? 되돌릴 수 없어요.`, '삭제')) return;
    state.files = state.files.filter(f => f.name !== name);
    closeTab(name);
    save(); renderAll();
  }
  function toggleDir(key) {
    state.closed[key] = !state.closed[key];
    save(); renderFiles();
  }

  /* ---------- 만들기 / 복사 ---------- */
  // 파일 이름을 물어보고 검사한다. 문제가 있으면 이유를 알리고 다시 물어본다. 취소하면 null
  async function askFileName(title, suggested) {
    let value = suggested;
    for (;;) {
      const input = await askText(title, value, '한글만 쓸 수 있어요. 폴더에 넣으려면 폴더/이름');
      if (input === null || !input.trim()) return null;
      value = input.trim();
      const parts = value.replace(/\.jj$/, '').split('/');
      const base = parts.pop();
      let problem = null;
      if (!T1JJYA.isModName(base)) problem = `파일 이름은 예약어가 아닌 한글만 쓸 수 있어요: '${base}'`;
      else if (parts.some(p => !p)) problem = '폴더 이름이 비어 있어요.';
      else if (findModule(base)) problem = `'${base}.jj' 파일이 이미 있어요. 파일 이름은 예제와도, 폴더와 상관없이도 겹칠 수 없어요.`;
      if (!problem) return [...parts, base + '.jj'].join('/');
      await notify('이 이름은 쓸 수 없어요', problem);
    }
  }
  function createFile(name, content) {
    state.files.push({ name, content });
    openFile(name);
  }
  async function newFile() {
    const name = await askFileName('새 파일', '새파일');
    if (!name) return;
    createFile(name, NEW_FILE_TEMPLATE);
    const secondLine = NEW_FILE_TEMPLATE.indexOf('\n') + 1;
    src.setSelectionRange(secondLine, secondLine); refresh();
  }
  // 열려 있는 예제를 내 파일로 복사한다. 예제 이름은 이미 쓰이고 있으므로 '이름복사'를 제안
  async function copyExample() {
    const f = activeFile();
    if (!f || !isExample(f.name)) return;
    const name = await askFileName('내 파일로 복사', modName(f.name) + '복사');
    if (!name) return;
    createFile(name, f.content);
  }

  /* ---------- 이벤트 ---------- */
  byId('panes').addEventListener('click', (e) => {
    const del = e.target.closest('[data-del]');
    if (del) { e.stopPropagation(); deleteFile(del.dataset.del); return; }
    const dir = e.target.closest('[data-dir]');
    if (dir) { toggleDir(dir.dataset.dir); return; }
    const li = e.target.closest('li[data-name]'); if (li) openFile(li.dataset.name);
  });
  byId('panes').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const t = e.target;
    if (t.dataset.dir) { e.preventDefault(); toggleDir(t.dataset.dir); }
    else if (t.dataset.name && e.key === 'Enter') openFile(t.dataset.name);
  });
  byId('tablist').addEventListener('click', (e) => {
    const x = e.target.closest('[data-close]');
    if (x) { e.stopPropagation(); closeTab(x.dataset.close); return; }
    const tab = e.target.closest('.tab'); if (tab) openFile(tab.dataset.name);
  });
  byId('tablist').addEventListener('auxclick', (e) => {
    const tab = e.target.closest('.tab'); if (tab && e.button === 1) closeTab(tab.dataset.name);
  });
  byId('newFile').addEventListener('click', newFile);
  byId('copyEx').addEventListener('click', copyExample);

  Object.assign(JJ, { renderAll, renderFiles, openFile, closeTab, createFile, newFile });
})();
