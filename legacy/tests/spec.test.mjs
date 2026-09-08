/**
 * 표기규격 v2.0 적합성 시험. 실행: node tests/spec.test.mjs
 *
 * 기준값은 문서다. 여기 적힌 부호열은 「음소–자모값 대응 등록부」(제19조 ⑨,
 * 마스터 표 15 · 별첨 표 11)와 부록 E 의 시범 어휘에서 그대로 옮겨 온 것이며,
 * webapp/hmbr_convert.py 의 자체시험 표와 같은 열넷이다.
 *
 * 눈으로 본 글자꼴이 아니라 부호점으로 적는다. 조합용 자모는 터미널에서
 * 서로 비슷하게 그려지므로 글꼴을 보고 맞다 틀리다 판정하면 안 된다.
 *
 * 비교 대상은 convert() 가 돌려주는 `canonical` — 곧 저장·교환되는 정본
 * 부호열이다. 화면에 보이는 가독형(`text`)은 표시 프로파일의 산물이므로
 * 규격 적합성의 기준이 될 수 없다(정본과 표시의 분리).
 */
import { convert } from '../js/engine.js';
import { hasCompatJamo } from '../js/map.js';

/**
 * 견줄 때는 자모 낱낱으로 푼다(NFD). 엔진은 KS X 1026-1 이 받는 자리에서만
 * 음절을 모으므로, 모인 꼴과 풀린 꼴이 섞여 나온다. 규격이 정한 것은
 * 부호열이지 그 부호열을 어떻게 모아 보이느냐가 아니다.
 */
const J = (...cps) => String.fromCodePoint(...cps);
const nfd = (s) => s.normalize('NFD');

/**
 * [표제어, IPA, 정본 부호열]
 *
 * 부호열을 고른 근거를 한 줄로 붙인다. v1.2 와 달라진 자리가 v2.0 의
 * 개정 내용이고, 그 자리가 바로 이 시험이 지키려는 것이다.
 */
const CASES = [
  // 원어 종성 직접 보존 (제5조의2 ④) — 한국어 말음 중화를 적용하지 않는다.
  ['pick',  '/pɪk/',   [0x1111, 0x119d, 0x11bf]],            // v1.2 ᆨ → v2.0 ᆿ
  ['cup',   '/kʌp/',   [0x110f, 0x1165, 0x11c1]],            // v1.2 ᆸ → v2.0 ᇁ
  ['soot',  '/sʊt/',   [0x1109, 0x116e, 0x11c0]],            // v1.2 ᆮ → v2.0 ᇀ
  ['pass',  '/pæs/',   [0x1111, 0x1162, 0x11ba]],            // v1.2 ᆮ → v2.0 ᆺ
  ['good',  '/gʊd/',   [0x1100, 0x116e, 0x11ae]],            // 바뀌지 않는다
  ['dog',   '/dɔg/',   [0x1103, 0x1182, 0x11a8]],            // 바뀌지 않는다
  ['sing',  '/sɪŋ/',   [0x110a, 0x119d, 0x11bc]],            // /ŋ/ 은 종성 자리만 쓴다

  // /s/ 의 문맥별 초성 위치형 (제5조의2 ②③) — 자모값은 하나, 부호열은 넷.
  ['sun',   '/sʌn/',   [0x110a, 0x1165, 0x11ab]],            // 그 밖의 모음 앞 ᄊ
  ['soon',  '/suːn/',  [0x1109, 0x116e, 0x110b, 0x116e, 0x11ab]], // 고원순모음 앞 ᄉ · 시범규칙
  ['seat',  '/siːt/',  [0x110a, 0x1175, 0x110b, 0x1175, 0x11c0]], // /iː/ 는 고원순이 아니다
  ['sit',   '/sɪt/',   [0x110a, 0x119d, 0x11c0]],

  // 어말 자음군 — v1.2 가 끼워 넣던 모음 음절을 종성열로 편다(RV-EN-CLUSTER-01).
  ['boost', '/buːst/', [0x1107, 0x116e, 0x110b, 0x116e, 0x11ba, 0x11c0]], // v1.2 부웃드
  ['task',  '/tɑːsk/', [0x1110, 0x1161, 0x110b, 0x1161, 0x11ba, 0x11bf]], // v1.2 타앗크
  ['park',  '/pɑːk/',  [0x1111, 0x1161, 0x110b, 0x1161, 0x11bf]],         // v1.2 파악
];

const cps = (s) =>
  [...s].map((c) => 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join(' ');

let pass = 0;
let fail = 0;

console.log('── 등록부 시범 어휘 14건 (정본 부호열) ──');
for (const [word, ipa, expected] of CASES) {
  const got = nfd(convert(ipa.replace(/\//g, '')).canonical);
  const want = J(...expected);
  const ok = got === want;
  ok ? (pass += 1) : (fail += 1);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${word.padEnd(6)} ${ipa.padEnd(9)} → ${got}`);
  if (!ok) {
    console.log(`        got: ${cps(got)}`);
    console.log(`        exp: ${cps(want)}`);
  }
}

/**
 * 부호 정책. 정본은 조합용 자모만 쓰고 호환용 자모 U+3130–U+318F 는
 * 배제한다. 호환용 자모가 섞이면 자리(초성·중성·종성) 정보가 사라져
 * 역변환도 정규화도 무너진다.
 */
console.log('\n── 부호 정책: 정본에 호환용 자모가 없어야 한다 ──');
{
  const dirty = [];
  for (const [word, ipa] of CASES) {
    for (const narrow of [false, true]) {
      const out = convert(ipa.replace(/\//g, ''), { narrow }).canonical;
      if (hasCompatJamo(out)) dirty.push(`${word}${narrow ? ' (narrow)' : ''} → ${cps(out)}`);
    }
  }
  const ok = dirty.length === 0;
  ok ? (pass += 1) : (fail += 1);
  console.log(`${ok ? 'PASS' : 'FAIL'}  호환용 자모 배제`);
  for (const d of dirty) console.log(`        ${d}`);
}

/**
 * 두 표기 모드가 갈라져 있는지 본다(제3조 ②). 이음은 좁은 표기에서만
 * 나타나야 하고, 넓은 표기의 결과에 섞여 들어오면 안 된다.
 */
console.log('\n── 넓은 표기와 좁은 표기의 분리 ──');
{
  const DARK_L_CP = 0x11d0; // 등록부 EN-P-030 [ɫ] 종성
  const broad = convert('fiːl').canonical;
  const narrow = convert('fiːl', { narrow: true }).canonical;
  const a = !broad.includes(String.fromCodePoint(DARK_L_CP));
  const b = narrow.includes(String.fromCodePoint(DARK_L_CP));
  a ? (pass += 1) : (fail += 1);
  b ? (pass += 1) : (fail += 1);
  console.log(`${a ? 'PASS' : 'FAIL'}  넓은 표기에는 어두운 ㄹ이 없다  ${cps(broad)}`);
  console.log(`${b ? 'PASS' : 'FAIL'}  좁은 표기에는 어두운 ㄹ이 있다  ${cps(narrow)}`);
}

/**
 * 왕복. 화면 표시는 ᆝ 를 ᅵ 로 접으므로 되돌릴 수 없다. 정본을 그대로
 * 들고 다녀야 하는 이유이고, 이 시험은 그 차이가 실제로 존재함을 못박는다.
 */
console.log('\n── 정본과 표시가 실제로 다르다 ──');
{
  const r = convert('pɪk');
  const differs = r.canonical !== r.text;
  differs ? (pass += 1) : (fail += 1);
  console.log(`${differs ? 'PASS' : 'FAIL'}  pick 정본 ${cps(r.canonical)} · 표시 ${cps(r.text)}`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
