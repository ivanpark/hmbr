/**
 * 엔진 시험. 실행: node tests/test.mjs
 *
 * 기준값은 「음소–자모값 대응 등록부」(제19조 ⑨)의 부호열을 낱말 차례대로
 * 이어 붙인 것이다. 글자꼴이 아니라 부호점으로 적는다 — 조합용 자모는
 * 터미널에서 서로 비슷하게 그려져 눈으로는 맞다 틀리다를 가릴 수 없다.
 *
 * 규격 적합성 시험은 tests/spec.test.mjs 가 따로 맡는다. 이 파일은 그보다
 * 넓게, 사전에서 흔히 나오는 꼴들이 엔진을 어떻게 지나가는지를 본다.
 */
import { convert, ipaToJamos, jamosToSyllables } from '../js/engine.js';
import { hasCompatJamo } from '../js/map.js';

/**
 * 견줄 때는 자모 낱낱으로 푼다(NFD). 엔진은 KS X 1026-1 이 받는 자리에서만
 * 음절을 모으므로, 같은 부호열이라도 ᇦ 처럼 완성형이 없는 종성이 끼면
 * 모이지 않은 채로 남는다. 그 차이는 표시의 문제이지 값의 문제가 아니다.
 */
const J = (...cps) => String.fromCodePoint(...cps);
const nfd = (s) => s.normalize('NFD');
const cps = (s) =>
  [...s].map((c) => 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join(' ');

/** 힘주기·뒷가지 표시는 자리 정보가 아니므로 견줄 때 떼어 낸다. */
const clean = (s) => s.replace(/[ˈˌ*]/g, '');

/**
 * [표제어, IPA, 정본 부호열]
 *
 * 종성 자리는 모두 원어 자음을 그대로 보존한다(제5조의2 ④). 뒷가지가 붙는
 * 긴 홀소리·겹홀소리는 등록부의 중성 부호열을 그대로 쓴다: /eɪ/ 는
 * ᅦ + U+110B + ᅵ 처럼 이음소리를 사이에 끼운 한 덩이다.
 */
const CASES = [
  ['pun',     'pʌn',      [0x1111, 0x1165, 0x11ab]],
  ['good',    'ɡʊd',      [0x1100, 0x116e, 0x11ae]],                  // ɡ(U+0261) 이형 기호
  ['day',     'deɪ',      [0x1103, 0x1166, 0x110b, 0x1175]],
  ['boy',     'bɔɪ',      [0x1107, 0x1169, 0x110b, 0x1175]],
  ['how',     'haʊ',      [0x1112, 0x1161, 0x110b, 0x116e]],
  ['zoo',     'zuː',      [0x1136, 0x116e, 0x110b, 0x116e]],
  ['bird',    'bɜːd',     [0x1107, 0x1165, 0x110b, 0x1165, 0x11ae]],
  ['moon',    'muːn',     [0x1106, 0x116e, 0x110b, 0x116e, 0x11ab]],
  ['noon',    'nuːn',     [0x1102, 0x116e, 0x110b, 0x116e, 0x11ab]],
  ['happy',   'ˈhæpi',    [0x1112, 0x1162, 0x1111, 0x1175]],          // /p/ 는 홀소리 앞이라 초성
  ['wood',    'wʊd',      [0x1147, 0x116e, 0x11ae]],
  ['young',   'jʌŋ',      [0x1159, 0x1165, 0x11bc]],
  ['tell',    'tɛl',      [0x1110, 0x1166, 0x11af]],
  ['thank',   'θæŋk',     [0x1145, 0x1162, 0x11bc, 0x11bf]],          // 종성 두 자리: ᆼ + ᆿ
  ['they',    'ðeɪ',      [0x1142, 0x1166, 0x110b, 0x1175]],
  ['shine',   'ʃaɪn',     [0x1140, 0x1161, 0x110b, 0x1175, 0x11ab]],
  ['chicken', 'ˈtʃɪkɪn',  [0x1149, 0x119d, 0x110f, 0x119d, 0x11ab]],
  ['very',    'ˈvɛri',    [0x1144, 0x1166, 0xa976, 0x1175]],          // r → /ɹ/ 로 돌린다
  ['rub',     'rʌb',      [0xa976, 0x1165, 0x11b8]],
  ['love',    'lʌv',      [0x1105, 0x1165, 0x11e6]],                  // /v/ 종성은 아직 잠정
  ['measure', 'ˈmɛʒə',    [0x1106, 0x1166, 0x1146, 0x119e]],
  // 뒤에 홀소리가 없는 초성은 채움 중성을 세운다(KS X 1026-1).
  ['friend',  'frɛnd',    [0x114b, 0x1160, 0xa976, 0x1166, 0x11ab, 0x11ae]],
  ['sky',     'skaɪ',     [0x1109, 0x1160, 0x110f, 0x1161, 0x110b, 0x1175]],
  // 종성 부호열이 미정인 음소는 초성형으로 버티고 경고 대상으로 남는다(제5조의2 ⑥).
  ['judge',   'dʒʌdʒ',    [0x1148, 0x1165, 0x1148]],
];

let pass = 0;
let fail = 0;

console.log('── 정본 부호열 ──');
for (const [name, ipa, expected] of CASES) {
  const r = convert(ipa);
  const got = nfd(clean(r.canonical));
  const want = J(...expected);
  const ok = got === want;
  ok ? (pass += 1) : (fail += 1);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(8)} /${ipa}/ → ${got}   표시: ${r.text}`);
  if (!ok) {
    console.log(`        got: ${cps(got)}`);
    console.log(`        exp: ${cps(want)}`);
  }
}

// ── 호환용 자모는 정본에 들어오지 않는다 ──
console.log('\n── 부호 정책 ──');
{
  const dirty = CASES
    .map(([name, ipa]) => [name, convert(ipa).canonical])
    .filter(([, out]) => hasCompatJamo(out));
  const ok = dirty.length === 0;
  ok ? (pass += 1) : (fail += 1);
  console.log(`${ok ? 'PASS' : 'FAIL'}  정본에 호환용 자모가 없다`);
  for (const [name, out] of dirty) console.log(`        ${name}: ${cps(out)}`);
}

// ── 표시 프로파일은 정본을 건드리지 않는다 ──
console.log('\n── 정본과 표시의 분리 ──');
{
  const r = convert('sɪt');
  const same = nfd(clean(r.canonical)) === J(0x110a, 0x119d, 0x11c0);
  const folded = r.text !== r.canonical;
  same ? (pass += 1) : (fail += 1);
  folded ? (pass += 1) : (fail += 1);
  console.log(`${same ? 'PASS' : 'FAIL'}  sit 정본 ${cps(clean(r.canonical))}`);
  console.log(`${folded ? 'PASS' : 'FAIL'}  sit 표시는 ᆝ 를 접는다 ${cps(r.text)}`);
}

// ── 힘주기와 뒷가지 ──
console.log('\n── 힘주기 ──');
{
  const r = convert('ˌɪntəˈpɜːsnəl');
  const units = r.runs.flatMap((run) => run.units);
  const weights = units.map((u) => u.weight);
  const primary = Math.max(...weights);
  const hasPrimary = primary === 1.25;
  const hasSecondary = weights.includes(1.0);
  const tailIsSmaller = units.some((u) => u.weight < 0.75);
  hasPrimary ? (pass += 1) : (fail += 1);
  hasSecondary ? (pass += 1) : (fail += 1);
  tailIsSmaller ? (pass += 1) : (fail += 1);
  console.log(`${hasPrimary ? 'PASS' : 'FAIL'}  으뜸 힘주기 1.25`);
  console.log(`${hasSecondary ? 'PASS' : 'FAIL'}  버금 힘주기 1.0`);
  console.log(`${tailIsSmaller ? 'PASS' : 'FAIL'}  뒷가지는 절반 크기`);
  for (const u of units) console.log(`        ${u.text}  ${u.weight}  ${u.role}`);
}

// ── 눈으로 훑어보는 자리 ──
console.log('\n── 참고 출력 ──');
for (const ipa of ['pleɪ', 'həˈləʊ', 'ˈpɔlə', 'həˈləʊ ˈwɜːld']) {
  const r = convert(ipa);
  console.log(`  /${ipa}/`);
  console.log(`      음절 ${jamosToSyllables(ipaToJamos(ipa))}`);
  console.log(`      정본 ${cps(clean(r.canonical))}`);
  console.log(`      표시 ${r.text}`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
