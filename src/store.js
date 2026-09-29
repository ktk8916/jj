/* ================= 상태 (localStorage) =================
   state.files에는 사용자가 만든 파일만 들어간다. 예제는 항상 EXAMPLES(원본)에서 읽으므로 지우거나 고칠 수 없다. */
(() => {
  const JJ = window.JJ ??= {};

  const STORAGE_KEY = 't1jjya:v9';
  const LEGACY_KEY = 't1jjya:v8';  // 예제가 사용자 파일과 섞여 저장되던 이전 형식
  const EXAMPLE_NAMES = new Set(EXAMPLES.map(e => e.name));
  const PANES = ['ref', 'examples', 'explorer'];  // 왼쪽 패널: 문법 / 예제 / 탐색기
  const DEFAULT_PANES = { ref: true, examples: true, explorer: false };
  // 음성 읽기 기본값. voice는 voiceURI이며 ''는 "한국어 목소리 자동 선택"
  const SPEECH_DEFAULTS = { voice: '', rate: 1.5, pitch: 1, volume: 1 };
  const SPEECH_RANGE = { rate: [0.5, 3], pitch: [0, 2], volume: [0, 1] };

  const fileBase = (name) => name.split('/').pop();               // '예제/기초/시작하기.jj' → '시작하기.jj'
  const modName = (name) => fileBase(name).replace(/\.jj$/, '');  // → '시작하기'
  const isExample = (name) => EXAMPLE_NAMES.has(name);

  function normalizeSpeech(sp) {
    const out = { ...SPEECH_DEFAULTS };
    if (!sp || typeof sp !== 'object') return out;
    if (typeof sp.voice === 'string') out.voice = sp.voice;
    for (const [k, [min, max]] of Object.entries(SPEECH_RANGE)) {
      const v = Number(sp[k]);
      if (Number.isFinite(v)) out[k] = Math.min(max, Math.max(min, v));
    }
    return out;
  }
  // 저장된 상태가 깨져 있어도(지운 파일이 열려 있는 등) 렌더링이 안전하도록 정리
  function normalize(s) {
    s.files = (Array.isArray(s.files) ? s.files : []).filter(f => f && typeof f.name === 'string' && typeof f.content === 'string' && !isExample(f.name));
    const names = new Set([...EXAMPLE_NAMES, ...s.files.map(f => f.name)]);
    const renamed = (n) => typeof n === 'string' ? n.replace(/^example\//, '예제/') : n;  // 예전 예제 이름
    s.open = (Array.isArray(s.open) ? s.open : []).map(renamed).filter(n => names.has(n));
    s.active = renamed(s.active);
    s.active = s.open.includes(s.active) ? s.active : (s.open[0] ?? null);
    s.closed = (s.closed && typeof s.closed === 'object') ? s.closed : {};
    const panes = (s.panes && typeof s.panes === 'object') ? s.panes : {};
    s.panes = Object.fromEntries(PANES.map(p => [p, typeof panes[p] === 'boolean' ? panes[p] : DEFAULT_PANES[p]]));
    s.speech = normalizeSpeech(s.speech);
    delete s.onboarded;  // 예전 온보딩 흔적
    return s;
  }
  // 처음 온 사람: 내 파일도, 열린 탭도 없이 문법·예제 패널만 펼쳐 둔다
  function fresh() {
    return { files: [], open: [], active: null, closed: {}, panes: { ...DEFAULT_PANES }, speech: { ...SPEECH_DEFAULTS } };
  }
  // v8 → v9: 예제는 더 이상 저장하지 않으므로 사용자 파일만 남긴다
  function migrateLegacy(old) {
    return { ...fresh(), files: old.files, open: old.open, active: old.active, speech: old.speech };
  }
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (s && Array.isArray(s.files)) return normalize(s);
      const old = JSON.parse(localStorage.getItem(LEGACY_KEY));
      if (old && Array.isArray(old.files)) return normalize(migrateLegacy(old));
    } catch (_) {}
    return fresh();
  }
  const state = load();
  function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {} }

  const fileByName = (name) => EXAMPLES.find(f => f.name === name) ?? state.files.find(f => f.name === name);
  const allFiles = () => [...EXAMPLES, ...state.files];
  const activeFile = () => fileByName(state.active);
  const findModule = (mod) => allFiles().find(f => modName(f.name) === mod);

  Object.assign(JJ, { state, save, PANES, SPEECH_DEFAULTS, normalizeSpeech, fileBase, modName, isExample, fileByName, allFiles, activeFile, findModule });
})();
