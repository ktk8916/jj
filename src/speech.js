/* ================= 음성: 읽기 / 읽으면서 실행 / 음성 설정 ================= */
(() => {
  const JJ = window.JJ ??= {};
  const { byId, esc, notify, state, save, SPEECH_DEFAULTS, normalizeSpeech, activeFile,
          src, marks, codeOf, refresh, sync, scrollToLine, showPane, setPanel, setStatus, showResult, timedRun } = JJ;

  const MAX_EVENTS = 20000;  // 읽으면서 실행할 때 기록하는 최대 줄 수
  const TTS = 'speechSynthesis' in window;
  const isKorean = (v) => /^ko/i.test(v.lang);
  const allVoices = () => TTS ? speechSynthesis.getVoices() : [];

  // 설정한 목소리가 있으면 그것, 없거나 사라졌으면 한국어 목소리 중 첫 번째
  function pickVoice() {
    const voices = allVoices();
    return (state.speech.voice && voices.find(v => v.voiceURI === state.speech.voice)) || voices.find(isKorean) || null;
  }
  function makeUtterance(text) {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ko-KR';
    const voice = pickVoice();
    if (voice) u.voice = voice;
    u.rate = state.speech.rate;
    u.pitch = state.speech.pitch;
    u.volume = state.speech.volume;
    return u;
  }
  // 한 줄을 읽어 줄 말로 바꾼다. 물결표(~)는 소리 내지 않는다: 티~원 → 티원, 지~랄 → 지랄, 요이~ → 요이
  function speechText(line) {
    return codeOf(line || '').split(/\s+/).filter(Boolean).map(t => {
      if (T1JJYA.isVar(t)) return '예?';
      const q = T1JJYA.callTarget(t);
      if (q?.mod) return `${q.mod} ${q.name}`;
      return t.replace(/~/g, '');
    }).join(' ');
  }

  /* ---------- 재생 ---------- */
  // 진행 중인 재생: { mode: 'read'|'run', f, lines, events, i, timer, result?, ms?, truncated? }
  let play = null;

  function updatePlayButtons() {
    const set = (id, mode, label) => {
      const b = byId(id), on = play?.mode === mode;
      b.classList.toggle('playing', on);
      b.querySelector('span').textContent = on ? '정지' : label;
    };
    set('readBtn', 'read', '읽기');
    set('runReadBtn', 'run', '읽으면서 실행');
  }

  function stopPlay(reason) {
    if (!play) return;
    const p = play;
    play = null;
    clearTimeout(p.timer);
    if (TTS) speechSynthesis.cancel();
    marks.read = null;
    updatePlayButtons();
    sync();
    if (p.mode === 'run' && reason === 'user') {
      byId('out').insertAdjacentHTML('beforeend', '<span class="meta">■ 중지했습니다</span>');
      byId('stRun').textContent = '중지됨';
    } else if (p.mode === 'read') {
      byId('stRun').textContent = '';
    }
  }

  function speakThen(p, text, next) {
    let done = false;
    const fin = () => { if (done) return; done = true; clearTimeout(p.timer); if (play === p) next(); };
    if (!text) { p.timer = setTimeout(fin, 200); return; }
    const u = makeUtterance(text);
    u.onend = fin; u.onerror = fin;
    p.utter = u;
    speechSynthesis.speak(u);
    // onend가 안 오는 브라우저 대비. 속도 1.7에서 글자당 250ms로 잡고 속도에 반비례
    p.timer = setTimeout(fin, (1500 + text.length * 250) * 1.7 / state.speech.rate);
  }

  function step() {
    const p = play;
    if (!p) return;
    if (p.i >= p.events.length) return finishPlay(p);
    const e = p.events[p.i++];
    marks.read = e.ln;
    scrollToLine(e.ln);
    refresh();
    if (e.out !== undefined) byId('out').insertAdjacentText('beforeend', e.out + '\n');
    byId('stRun').textContent = `🔊 ${p.i.toLocaleString()} / ${p.events.length.toLocaleString()}줄`;
    speakThen(p, speechText(p.lines[e.ln - 1]), step);
  }

  function finishPlay(p) {
    play = null;
    marks.read = null;
    updatePlayButtons();
    if (p.mode === 'run') {
      showResult(p.f, p.result, p.ms);
      if (p.truncated) byId('out').insertAdjacentHTML('beforeend', `\n<span class="meta">읽기는 앞의 ${MAX_EVENTS.toLocaleString()}줄까지만 했습니다</span>`);
    } else {
      byId('stRun').textContent = '';
      refresh();
    }
  }

  function startPlay(mode) {
    if (play?.mode === mode) return stopPlay('user');
    stopPlay();
    if (!TTS) { notify('음성 읽기', '이 브라우저는 음성 읽기를 지원하지 않아요.'); return; }
    const f = activeFile();
    if (!f) return;
    const lines = src.value.split('\n');
    const p = { mode, f, lines, i: 0, events: [], timer: null };
    if (mode === 'read') {
      p.events = lines.flatMap((l, i) => codeOf(l) ? [{ ln: i + 1 }] : []);
    } else {
      const { result, ms } = timedRun(f, (e) => {
        if (p.events.length < MAX_EVENTS) p.events.push(e); else p.truncated = true;
      });
      p.result = result; p.ms = ms;
      marks.err = null;
      setStatus(false, '');
      if (!p.events.length) { showResult(f, result, ms); return; }
      byId('out').innerHTML = `<span class="meta">🔊 ${esc(f.name)} 읽으면서 실행</span>\n`;
      showPane('out');
      setPanel(true);
    }
    speechSynthesis.cancel();
    play = p;
    updatePlayButtons();
    step();
  }

  /* ---------- 음성 설정 화면 ---------- */
  const SPEECH_INPUTS = { rate: 'spRate', pitch: 'spPitch', volume: 'spVolume' };
  const SPEECH_SAMPLE = ['티~원', '예? 마렵네...', '지~랄 예?', '줴줴이야'].map(speechText).join(' ');

  function renderSpeechPane() {
    const sp = state.speech;
    byId('spNoTts').hidden = TTS;
    const voices = allVoices();
    const ordered = [...voices.filter(isKorean), ...voices.filter(v => !isKorean(v))];
    const sel = byId('spVoice');
    sel.innerHTML = ['<option value="">자동 (한국어 목소리)</option>',
      ...ordered.map(v => `<option value="${esc(v.voiceURI)}">${esc(v.name)} (${esc(v.lang)})</option>`)].join('');
    sel.value = voices.some(v => v.voiceURI === sp.voice) ? sp.voice : '';
    sel.disabled = !TTS;
    for (const [k, id] of Object.entries(SPEECH_INPUTS)) {
      byId(id).value = sp[k];
      byId(id).disabled = !TTS;
      byId(id + 'Val').textContent = sp[k].toFixed(1);
    }
  }
  function setSpeech(patch) {
    state.speech = normalizeSpeech({ ...state.speech, ...patch });
    save();
    renderSpeechPane();
  }
  function previewSpeech() {
    if (!TTS) { notify('음성 읽기', '이 브라우저는 음성 읽기를 지원하지 않아요.'); return; }
    stopPlay('user');
    speechSynthesis.cancel();
    speechSynthesis.speak(makeUtterance(SPEECH_SAMPLE));
  }
  function openSettings() {
    renderSpeechPane();
    byId('settings').showModal();
  }

  /* 이벤트 */
  byId('readBtn').addEventListener('click', () => startPlay('read'));
  byId('runReadBtn').addEventListener('click', () => startPlay('run'));
  byId('actSettings').addEventListener('click', openSettings);
  byId('spVoice').addEventListener('change', (e) => setSpeech({ voice: e.target.value }));
  for (const [k, id] of Object.entries(SPEECH_INPUTS))
    byId(id).addEventListener('input', (e) => setSpeech({ [k]: Number(e.target.value) }));
  byId('spTest').addEventListener('click', previewSpeech);
  byId('spReset').addEventListener('click', () => setSpeech(SPEECH_DEFAULTS));
  if (TTS) speechSynthesis.addEventListener?.('voiceschanged', renderSpeechPane);

  Object.assign(JJ, { stopPlay, startPlay, isPlaying: () => !!play, renderSpeechPane });
})();
