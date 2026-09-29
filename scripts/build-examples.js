// lang/예제/ 아래의 .jj 파일을 읽어 src/examples.js를 만든다.
// 브라우저는 file://로 열면 .jj 파일을 직접 읽을 수 없으므로 예제를 JS 하나로 묶어 둔다.
// 예제를 고쳤거나 추가했으면 `npm run build`를 다시 실행한다.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const EXAMPLE_DIR = path.join(ROOT, 'lang', '예제');
const OUT = path.join(ROOT, 'src', 'examples.js');

// 탐색기에 보이는 순서(학습 순서). 여기 없는 파일은 경고와 함께 뒤에 붙는다.
const ORDER = [
  '기초/시작하기', '기초/변수', '기초/연산', '기초/조건문', '기초/반복문', '기초/함수',
  '중급/홀짝', '중급/구구단', '중급/피보나치', '중급/팩토리얼', '중급/수학', '중급/제곱',
  '상급/하노이', '상급/스택', '상급/산수',
];

function listJj(dir, prefix = '') {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix + ent.name;
    if (ent.isDirectory()) out.push(...listJj(path.join(dir, ent.name), rel + '/'));
    else if (ent.name.endsWith('.jj')) out.push(rel.replace(/\.jj$/, ''));
  }
  return out;
}

const onDisk = new Set(listJj(EXAMPLE_DIR));
const missing = ORDER.filter(k => !onDisk.has(k));
if (missing.length) {
  console.error('lang/예제/에 없는 파일이 ORDER에 있습니다: ' + missing.join(', '));
  process.exit(1);
}
const extra = [...onDisk].filter(k => !ORDER.includes(k)).sort();
if (extra.length) console.warn('ORDER에 없는 예제를 뒤에 붙입니다: ' + extra.join(', '));

// 앱에서 쓰는 예제 이름은 '예제/기초/시작하기.jj' 꼴이다 (탐색기에서는 앞의 '예제/'를 떼고 보여 준다)
const examples = [...ORDER, ...extra].map(key => ({
  name: `예제/${key}.jj`,
  content: fs.readFileSync(path.join(EXAMPLE_DIR, key + '.jj'), 'utf8').replace(/\r\n/g, '\n'),
}));

const js = `// 자동 생성 파일. 직접 고치지 말고 lang/예제/*.jj를 고친 뒤 \`npm run build\`를 실행하세요.
const EXAMPLES = ${JSON.stringify(examples, null, 2)};
if (typeof module !== 'undefined') module.exports = EXAMPLES;
`;
fs.writeFileSync(OUT, js);
console.log(`src/examples.js: 예제 ${examples.length}개`);
