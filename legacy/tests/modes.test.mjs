/**
 * 두 축 — 넓은/좁은 표기 × 낱말/이어말하기. 실행: node tests/modes.test.mjs
 *
 * 기대값을 글자로 적지 않고 등록부(map.js 를 거쳐 registry.js)에서 끌어온다.
 * 조합용 자모는 터미널에서 서로 비슷하게 그려져 눈으로는 가려낼 수 없고,
 * 등록부 값이 바뀌면 시험도 함께 따라가야 하기 때문이다. 부호점을 찍어
 * 보여 주는 일만 이 파일이 한다.
 */
import { convert, ipaToJamos, jamosToSyllables } from '../js/engine.js';
import { applyConnectedSpeech } from '../js/connected.js';
import { articulationCards, glyphFor } from '../js/articulation.js';
import {
  ONSET_FORM,
  CODA_FORM,
  DARK_L,
  S_FORMS,
  NARROW_AFTER_S,
  hasCompatJamo,
} from '../js/map.js';

const syl = (ipa, opts) => jamosToSyllables(ipaToJamos(ipa, opts));
const cps = (s) =>
  [...s].map((c) => 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join(' ');

let pass = 0;
let fail = 0;

const check = (name, cond, detail = '') => {
  cond ? (pass += 1) : (fail += 1);
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
};
const eq = (name, got, want) => {
  const ok = got === want;
  ok ? (pass += 1) : (fail += 1);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: ${got}`);
  if (!ok) console.log(`        got: ${cps(got)}\n        exp: ${cps(want)}`);
};
/**
 * 부호열이 그 안에 들어 있는지 본다. 엔진은 KS X 1026-1 이 받는 자리에서
 * 음절을 모아 버리므로, 모인 꼴 그대로는 낱 자모를 찾을 수 없다. 양쪽을
 * 자모 낱낱으로 풀어(NFD) 견준다.
 */
const nfd = (s) => s.normalize('NFD');
const has = (name, s, part, want = true) =>
  check(name, nfd(s).includes(nfd(part)) === want, cps(s));

const CLEAR_L = CODA_FORM.get('l');

// ── 어말 /l/ — 어두운 ㄹ은 좁은 표기에만 나온다(제3조 ②) ──
console.log('── 어말 /l/ ──');
for (const [word, ipa] of [
  ['tell', 'tɛl'],
  ['fill', 'fɪl'],
  ['feel', 'fiːl'],
  ['pull', 'pʊl'],
  ['milk', 'mɪlk'],
  ['killer', 'ˈkɪlə'],
  ['solar', 'ˈsəʊlə'],
]) {
  const broad = syl(ipa);
  const narrow = syl(ipa, { narrow: true });
  has(`${word} 넓은 표기 — 어두운 ㄹ 없음`, broad, DARK_L, false);
  has(`${word} 넓은 표기 — 맑은 ㄹ 종성`, broad, CLEAR_L, true);
  has(`${word} 좁은 표기 — 어두운 ㄹ`, narrow, DARK_L, true);
}

// 첫소리 자리의 /l/ 은 어느 모드에서도 어둡게 적지 않는다.
eq('hello — 첫소리 ㄹ은 좁은 표기에서도 그대로',
  syl('həˈləʊ', { narrow: true }), syl('həˈləʊ'));
has('light — 첫소리 ㄹ에 어두운 ㄹ이 섞이지 않는다',
  syl('lʌɪt', { narrow: true }), DARK_L, false);

// 사전이 [ɫ] 로 적어 와도 음소 모드에서는 /l/ 로 접는다.
eq('[ɫ] 는 넓은 표기에서 /l/ 로 접힌다', syl('tɛɫ'), syl('tɛl'));
eq('[ɫ] 는 좁은 표기에서 어두운 ㄹ', syl('tɛɫ', { narrow: true }), syl('tɛl', { narrow: true }));

// ── /s/ 뒤 무기 파열음 — 좁은 표기에서만 갈라 적는다 ──
console.log('\n── /s/ 뒤 파열음 ──');
for (const [word, ipa, sym] of [
  ['sky', 'skʌɪ', 'k'],
  ['spy', 'spʌɪ', 'p'],
  ['star', 'stɑː', 't'],
]) {
  const narrow = syl(ipa, { narrow: true });
  const broad = syl(ipa);
  has(`${word} 좁은 표기 — 이음 자모`, narrow, NARROW_AFTER_S.get(sym), true);
  has(`${word} 넓은 표기 — 이음 자모 없음`, broad, NARROW_AFTER_S.get(sym), false);
  has(`${word} — 자음 앞 /s/ 위치형`, broad, S_FORMS.beforeConsonant, true);
}

// ── /s/ 의 문맥별 초성 위치형(제5조의2 ②③) ──
console.log('\n── /s/ 위치형 ──');
has('sun — 그 밖의 모음 앞', syl('sʌn'), S_FORMS.beforeOtherVowel, true);
has('soon — 고원순모음 앞(시범규칙)', syl('suːn'), S_FORMS.beforeHighRound, true);
has('soot — 고원순모음 앞(시범규칙)', syl('sʊt'), S_FORMS.beforeHighRound, true);
has('seat — /iː/ 는 고원순이 아니다', syl('siːt'), S_FORMS.beforeOtherVowel, true);
has('pass — 종성 /s/ 는 그대로 보존', syl('pæs'), S_FORMS.coda, true);

// ── 이어말하기: 연음 L ──
console.log('\n── 이어말하기 ──');
const linked = applyConnectedSpeech('fʊl əv');
eq('connected.js 가 연음 자리를 잡는다', linked, 'fʊ‿ləv');
eq('자음 앞에서는 연음이 일어나지 않는다', applyConnectedSpeech('fʊl tuː'), 'fʊl tuː');

const wordMode = convert('fʊl əv', { narrow: true });
const phraseMode = convert(linked, { narrow: true });
has('낱말 모드는 어두운 ㄹ을 지킨다', wordMode.canonical, DARK_L, true);
has('이어말하기는 어두운 ㄹ을 풀어 준다', phraseMode.canonical, DARK_L, false);
has('이어말하기 결과에 연음 표시가 남는다', phraseMode.text, '‿', true);
has('연음 ㄹ이 다음 홀소리의 첫소리가 된다', phraseMode.canonical, ONSET_FORM.get('l'), true);

// ── 조음 카드가 모드를 따라간다 ──
console.log('\n── 조음 안내 카드 ──');
{
  const broadCards = articulationCards('fiːl', { narrow: false });
  const narrowCards = articulationCards('fiːl', { narrow: true });
  const bl = broadCards.find((c) => c.key === 'lFinal');
  const nl = narrowCards.find((c) => c.key === 'lFinal');
  check('넓은 표기 카드는 맑은 ㄹ', bl?.symbol === glyphFor('lFinal', false), cps(bl?.symbol ?? ''));
  check('좁은 표기 카드는 어두운 ㄹ', nl?.symbol === glyphFor('lFinal', true), cps(nl?.symbol ?? ''));
  check('두 자형이 실제로 다르다', glyphFor('lFinal', false) !== glyphFor('lFinal', true));
  check('넓은 표기 카드에 좁은 표기 자형을 덧붙여 알린다', Boolean(bl?.variant));
  check('좁은 표기 카드에는 군더더기 꼬리표가 없다', nl?.variant === undefined);

  const linkCards = articulationCards(linked, { narrow: true });
  check('연음된 IPA 는 lLink 카드를 낸다',
    linkCards.some((c) => c.key === 'lLink') && !linkCards.some((c) => c.key === 'lFinal'));
}

// ── 부호 정책은 모드와 무관하게 지켜진다 ──
console.log('\n── 부호 정책 ──');
{
  const words = ['tɛl', 'fiːl', 'skʌɪ', 'suːn', 'ˈkɪlə', 'həˈləʊ ˈwɜːld', linked];
  const dirty = [];
  for (const ipa of words) {
    for (const narrow of [false, true]) {
      const out = convert(ipa, { narrow }).canonical;
      if (hasCompatJamo(out)) dirty.push(`${ipa}${narrow ? ' (narrow)' : ''} → ${cps(out)}`);
    }
  }
  check('정본에 호환용 자모가 섞이지 않는다', dirty.length === 0);
  for (const d of dirty) console.log(`        ${d}`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
