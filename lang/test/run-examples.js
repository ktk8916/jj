// 언어 회귀 테스트. 플레이그라운드와 무관하게 lang/ 안에서만 돈다.
//   node lang/test/run-examples.js            예제 출력을 test/expected/<이름>.txt 와 비교하고 오류 메시지·구문 강조를 검사
//   node lang/test/run-examples.js --update   기대 출력 갱신 (예제 출력이 의도적으로 바뀌었을 때만)
'use strict';
const fs = require('fs');
const path = require('path');
const T1JJYA = require('../interpreter.js');

const LANG_DIR = path.join(__dirname, '..');
const EXAMPLE_DIR = path.join(LANG_DIR, '예제');
const EXPECTED_DIR = path.join(__dirname, 'expected');
const update = process.argv.includes('--update');

// lang/예제/**/*.jj → [{ name: '기초/시작하기', content }]
function listExamples(dir, prefix = '') {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'ko'))) {
    if (ent.isDirectory()) out.push(...listExamples(path.join(dir, ent.name), prefix + ent.name + '/'));
    else if (ent.name.endsWith('.jj'))
      out.push({ name: prefix + ent.name.replace(/\.jj$/, ''), content: fs.readFileSync(path.join(dir, ent.name), 'utf8').replace(/\r\n/g, '\n') });
  }
  return out;
}
const EXAMPLES = listExamples(EXAMPLE_DIR);
const modName = (name) => name.split('/').pop();
const resolve = (mod) => EXAMPLES.find(x => modName(x.name) === mod)?.content ?? null;

let failed = 0, passed = 0;
const report = (ok, label, detail) => {
  if (ok) { passed++; console.log('  ok   ' + label); }
  else { failed++; console.log('  FAIL ' + label + (detail ? '\n       ' + detail : '')); }
};

/* ---------- 예제 골든 출력 ---------- */
console.log('예제 출력 비교');
if (update) fs.mkdirSync(EXPECTED_DIR, { recursive: true });
for (const ex of EXAMPLES) {
  const name = modName(ex.name);
  const r = T1JJYA.run(ex.content, { name, resolve });
  const actual = (r.ok ? 'OK\n' : `ERR ${r.line}: ${r.error}\n`) + r.out;
  const file = path.join(EXPECTED_DIR, name + '.txt');
  if (update) { fs.writeFileSync(file, actual); report(true, `${ex.name} (갱신)`); continue; }
  if (!fs.existsSync(file)) { report(false, ex.name, `기대 파일이 없습니다: ${file}`); continue; }
  const expected = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  report(actual === expected, ex.name, actual === expected ? '' : `기대와 다릅니다 (${file})`);
}

/* ---------- 오류 메시지 ---------- */
console.log('오류 처리');
const errorCases = [
  { label: '빈 프로그램', src: '', line: 1, msg: '비어 있습니다' },
  { label: '티~원으로 시작하지 않음', src: '예? 마렵네\n줴줴이야', line: 1, msg: "'티~원'으로 시작" },
  { label: '숫자 사용', src: '티~원\n예? 3\n줴줴이야', line: 2, msg: '숫자는 쓸 수 없습니다' },
  { label: '점 네 개', src: '티~원\n예? 마렵네....\n줴줴이야', line: 2, msg: '세 개까지' },
  { label: '닫히지 않은 블록', src: '티~원\n예? 마렵네', line: 1, msg: "닫는 '줴줴이야'가 없습니다" },
  { label: '함수 밖 요이~', src: '티~원\n예? 요이~\n줴줴이야', line: 2, msg: '함수 안에서만' },
  { label: '없는 함수', src: '티~원\n예? 없는것 예?\n줴줴이야', line: 2, msg: "'없는것' 함수가 없습니다" },
  { label: '없는 파일', src: '티~원\n예? 없는파일.곱 예?\n줴줴이야', line: 2, msg: "'없는파일.jj' 파일이 없습니다" },
  { label: '내보내지 않은 함수', src: '티~원\n예? 하노이.먼저 예? 예?\n줴줴이야', line: 2, msg: '넌나가라로 내보내지 않은' },
  { label: '인자 개수', src: '티~원\n예? 수학.곱 예?\n줴줴이야', line: 2, msg: '인자 2개를 받는데 1개' },
  { label: '무한 반복', src: '티~원\n예? 마렵네\n앙기모링 예?\n티~원\n예?? 마렵네\n줴줴이야\n줴줴이야', line: 5, msg: '단계를 넘어' },
  { label: '출력 금지 숫자', src: '티~원\n' + '예? 마렵네...\n'.repeat(519) + '지~랄 예?\n줴줴이야', line: 521, msg: '출력할 수 없는', blocked: true },
];
for (const c of errorCases) {
  const r = T1JJYA.run(c.src, { name: '테스트', resolve });
  const ok = !r.ok && r.line === c.line && r.error.includes(c.msg) && (!c.blocked || r.blocked === true);
  report(ok, c.label, ok ? '' : `결과: ok=${r.ok} line=${r.line} error=${r.error}`);
}

/* ---------- 구문 강조 ---------- */
console.log('구문 강조');
const classCases = [
  ['티~원', 't-brace'], ['엄', 't-kw'], ['랄로톤으로', 't-decl'], ['지~랄', 't-print'],
  ['마렵네...', 't-step'], ['마렵네....', 't-bad'], ['예???', 't-var'], ['수학.곱', 't-fn'], ['곱', 't-fn'],
  ['123', 't-bad'], ['constructor', 't-bad'],
];
for (const [tok, cls] of classCases) {
  const got = T1JJYA.tokenClass(tok);
  report(got === cls, `${tok} → ${cls}`, got === cls ? '' : `실제: ${got}`);
}

console.log(`\n통과 ${passed}, 실패 ${failed}`);
process.exit(failed ? 1 : 0);
