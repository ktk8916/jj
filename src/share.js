/* ================= 링크 공유 =================
   서버 없이 코드를 URL의 # 뒤에 담는다. #c=… 는 deflate-raw 압축 + base64url, #r=… 는 압축 없이 base64url.
   내용: { v: 1, main: '이름.jj', files: [{ name: '이름.jj', content }, …] }  (main이 먼저, 그 다음 참조하는 내 파일들) */
(() => {
  const JJ = window.JJ ??= {};
  const { byId, esc, openDialog, notify, state, save, modName, isExample, activeFile, findModule,
          codeOf, showPane, setPanel, renderAll, openFile } = JJ;

  /* ---------- 인코딩 ---------- */
  const bytesToB64url = (bytes) => {
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  const b64urlToBytes = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  async function pipeBytes(bytes, Stream) {
    const out = new Blob([bytes]).stream().pipeThrough(new Stream('deflate-raw'));
    return new Uint8Array(await new Response(out).arrayBuffer());
  }
  async function encodeShare(obj) {
    const bytes = new TextEncoder().encode(JSON.stringify(obj));
    if (typeof CompressionStream === 'function') return 'c=' + bytesToB64url(await pipeBytes(bytes, CompressionStream));
    return 'r=' + bytesToB64url(bytes);
  }
  async function decodeShare(hash) {
    const m = hash.match(/^#?(c|r)=([A-Za-z0-9_-]+)$/);
    if (!m) return null;
    let bytes = b64urlToBytes(m[2]);
    if (m[1] === 'c') bytes = await pipeBytes(bytes, DecompressionStream);
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  /* ---------- 링크 만들기 ---------- */
  // 코드가 '파일.함수'로 부르는 내 파일들을 (재귀적으로) 모은다. 예제는 받는 쪽에도 있으므로 뺀다
  function referencedUserFiles(content, seen) {
    for (const line of content.split('\n'))
      for (const t of codeOf(line).split(/\s+/)) {
        const mod = T1JJYA.callTarget(t)?.mod;
        if (!mod || seen.has(mod)) continue;
        const f = findModule(mod);
        if (!f || isExample(f.name)) continue;
        seen.set(mod, f);
        referencedUserFiles(f.content, seen);
      }
    return seen;
  }
  async function shareLink() {
    const f = activeFile();
    if (!f) return;
    const main = modName(f.name) + '.jj';
    const deps = [...referencedUserFiles(f.content, new Map()).values()].filter(d => d.name !== f.name);
    const files = [{ name: main, content: f.content }, ...deps.map(d => ({ name: modName(d.name) + '.jj', content: d.content }))];
    const hash = '#' + await encodeShare({ v: 1, main, files });
    const url = location.href.split('#')[0] + hash;
    try { history.replaceState(null, '', hash); } catch (_) {}
    let copied = false;
    try { await navigator.clipboard.writeText(url); copied = true; } catch (_) {}
    byId('stRun').textContent = copied ? `공유 링크를 복사했습니다 (${url.length.toLocaleString()}자${deps.length ? `, 파일 ${files.length}개` : ''})` : '';
    if (!copied) await openDialog({ title: '공유하기', message: '클립보드에 넣지 못했어요. 아래 링크를 직접 복사하세요.', input: url, cancel: false, okText: '닫기' });
  }

  /* ---------- 링크에서 복구 ---------- */
  // 이름이 겹칠 때 쓸 새 이름: 하노이 → 하노이공유, 하노이공유둘, …
  function uniqueShareName(base) {
    for (const suffix of ['공유', '공유둘', '공유셋', '공유넷', '공유다섯', '공유여섯', '공유일곱', '공유여덟', '공유아홉'])
      if (!findModule(base + suffix)) return base + suffix;
    return null;
  }
  // 페이지를 열 때(또는 주소의 #가 바뀔 때) 링크에 코드가 담겨 있으면 내 파일로 복구해 연다
  async function importFromHash() {
    if (location.hash.length < 3) return;
    let data = null;
    try { data = await decodeShare(location.hash); } catch (_) {}
    try { history.replaceState(null, '', location.pathname + location.search); } catch (_) {}
    if (!data || !Array.isArray(data.files)) { notify('링크 열기', '링크에 담긴 코드를 읽을 수 없어요.'); return; }
    const notes = [];
    let mainName = null;
    for (const file of data.files) {
      if (typeof file.name !== 'string' || typeof file.content !== 'string') continue;
      const base = modName(file.name);
      const isMain = file.name === data.main;
      if (!T1JJYA.isModName(base)) { notes.push(`${file.name}: 파일 이름이 올바르지 않아 건너뜀`); continue; }
      const existing = findModule(base);
      let name;
      if (existing && existing.content === file.content) {
        name = existing.name; notes.push(`${base}.jj: 같은 파일이 이미 있어 그대로 사용`);
      } else if (existing && isMain) {
        const fresh = uniqueShareName(base);
        if (!fresh) { notes.push(`${base}.jj: 이름이 계속 겹쳐 저장하지 못함`); continue; }
        name = fresh + '.jj';
        state.files.push({ name, content: file.content }); notes.push(`${base}.jj: 이름이 겹쳐 ${name}로 저장`);
      } else if (existing) {
        name = existing.name; notes.push(`${base}.jj: 이미 있는 파일과 내용이 달라 가져오지 않음 (기존 파일을 씀)`);
      } else {
        name = base + '.jj';
        state.files.push({ name, content: file.content }); notes.push(`${base}.jj: 내 파일에 저장`);
      }
      if (isMain) mainName = name;
    }
    save();
    if (mainName) openFile(mainName); else renderAll();
    byId('out').innerHTML = '<span class="meta">🔗 링크에서 가져왔습니다</span>\n' + notes.map(esc).join('\n');
    showPane('out');
    setPanel(true);
  }

  byId('shareBtn').addEventListener('click', shareLink);
  window.addEventListener('hashchange', importFromHash);

  Object.assign(JJ, { importFromHash });
})();
