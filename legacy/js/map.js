/**
 * 훈민바름 (HMBR) — IPA ↔ 자모값 대응표.
 *
 * 이 파일은 더 이상 값을 직접 들고 있지 않다. 값의 정본은
 * 「외국어 표기법 시안」 표기규격 v2.0 제19조 ⑨의 음소–자모값 대응
 * 등록부이고, 그것을 옮겨 적은 것이 js/registry.js 다. 여기서는
 * 등록부를 엔진이 쓰기 좋은 모양으로 되풀어 놓기만 한다.
 *
 * ── v1.2(구 웹앱) 에서 달라진 점 ──────────────────────────────────
 *  1. 정본 부호열은 조합용 자모(U+1100–U+11FF, U+A960–, U+D7B0–)만
 *     쓴다. 호환용 자모 U+3130–U+318F 는 정본에서 배제한다.
 *     화면에 보이던 ㅅ·ㅋ·ㅌ 따위가 새던 자리는 모두 종성 자모로 바뀐다.
 *  2. 하나의 자모값이 위치에 따라 다른 부호열을 가진다(제5조의2 ①).
 *     ONSET_FORM / CODA_FORM / S_FORMS 가 그것이다.
 *  3. 어말 자음에 한국어 말음 중화를 적용하지 않는다(제5조의2 ④).
 *     /k/→ᆿ, /t/→ᇀ, /p/→ᇁ, /s/→ᆺ 를 그대로 적는다.
 *  4. 정본과 화면 표시를 가른다. `pick` 의 정본은 U+1111 U+119D U+11BF
 *     이고, 눈에 보이는 `핔` 은 표시 프로파일(DISPLAY_FOLD + NFC)의
 *     산물이다. 표시를 바꾸어도 정본은 바뀌지 않는다.
 *
 * ── 등록부에 없는 값 ─────────────────────────────────────────────
 * 사전 데이터에는 등록부가 아직 다루지 않는 기호가 섞여 있다. 그런
 * 값을 여기서 지어내지 않는다. SUPPLEMENT 에 따로 모아 두고
 * `supplement: true` 로 표시하여, 등록부가 그 자리를 채울 때까지
 * 임시값임을 드러낸다(제24조 ②의 판올림 대상).
 */

import {
  SPEC_VERSION,
  ENTRIES,
  BY_IPA,
  REVERSE_RULES,
  JAMO_POLICY,
  DISPLAY_NOTE,
} from './registry.js';

export { SPEC_VERSION, REVERSE_RULES, JAMO_POLICY, DISPLAY_NOTE };

/** 표기규격 판번호를 그대로 따른다(제24조 ② MAJOR.MINOR.PATCH). */
export const MAP_VERSION = '2.0.0';

// ── 유니코드 자리표 ─────────────────────────────────────────────────
export const CHOSEONG_BASE = 0x1100;
export const JUNGSEONG_BASE = 0x1161;
export const JONGSEONG_BASE = 0x11a7;
export const SYLLABLE_BASE = 0xac00;
export const JUNGSEONG_NUM = 21;
export const JONGSEONG_NUM = 28;
export const CHOSEONG_FILLER = 0x115f;
export const JUNGSEONG_FILLER = 0x1160;

/** 겹홀소리의 뒷가지를 여는 표시. 부호열이 아니라 엔진 내부 기호다. */
export const TAIL_MARK = '*';

const isJungseong = (cp) =>
  (cp >= 0x1160 && cp <= 0x11a7) || (cp >= 0xd7b0 && cp <= 0xd7c6);

/**
 * 등록부의 중성 부호열은 `ᅡ + U+110B + ᅵ` 처럼 이어 붙어 있다.
 * 엔진은 뒷가지를 따로 세어 힘주기를 절반으로 낮추므로, 이음소리
 * ᄋ(U+110B) 앞에 표시를 넣어 준다.  ᅡ이 → ᅡ*이
 */
function markTail(canonical) {
  let out = '';
  for (let i = 0; i < canonical.length; i += 1) {
    const cp = canonical.codePointAt(i);
    if (cp === 0x110b && i > 0 && isJungseong(canonical.codePointAt(i - 1))) {
      out += TAIL_MARK;
    }
    out += canonical[i];
  }
  return out;
}

// ── 등록부에서 뽑아낸 표 ────────────────────────────────────────────

/** bare IPA → 정본 부호열(뒷가지 표시 포함). 음소 모드 항목만. */
export const IPA_TO_HMBR = new Map();

/** bare IPA → 초성 부호열. */
export const ONSET_FORM = new Map();

/** bare IPA → 종성 부호열. 등록부에 종성이 있는 음소만 실린다. */
export const CODA_FORM = new Map();

/** bare IPA → 등록부 항목. 별표가 붙은 임시값도 함께 들어온다. */
export const ENTRY_FOR = new Map();

for (const e of ENTRIES) {
  if (e.mode !== 'phonemic' || !e.canonical) continue;
  IPA_TO_HMBR.set(e.bare, markTail(e.canonical));
  ENTRY_FOR.set(e.bare, e);
  const onset = e.pos['초성'] ?? e.pos['초성_기타모음앞'];
  if (onset) ONSET_FORM.set(e.bare, onset);
  if (e.pos['종성']) CODA_FORM.set(e.bare, e.pos['종성']);
}

/**
 * 영어 /s/ 의 문맥별 초성 위치형(제5조의2 ②·③).
 * 하나의 음소이고 자모값 ID 도 하나인데 부호열만 넷이다.
 * `highRound` 경계(/uː, ʊ/)는 확정된 사실이 아니라 대조시험 대상이므로
 * 값을 여기 밖으로 빼 두어 시험 결과에 따라 갈아 끼울 수 있게 한다.
 */
const S_ENTRY = BY_IPA.get('s');
export const S_FORMS = {
  beforeOtherVowel: S_ENTRY.pos['초성_기타모음앞'],
  beforeHighRound: S_ENTRY.pos['초성_고원순모음앞'],
  beforeConsonant: S_ENTRY.pos['초성_자음앞'],
  coda: S_ENTRY.pos['종성'],
  /** 시범규칙. 대조시험(제5조의2 ③)의 결과에 따라 바뀔 수 있다. */
  highRoundVowels: new Set(['uː', 'ʊ', 'u']),
};

/** 음성 모드에서 /s/ 뒤 무기 파열음으로 갈라 적는 이음(제3조 ②). */
export const NARROW_AFTER_S = new Map([
  ['p', BY_IPA.get('[p]').canonical],
  ['t', BY_IPA.get('[t]').canonical],
  ['k', BY_IPA.get('[k]').canonical],
]);

/** 음성 모드의 어두운 ㄹ. 음소 모드에서는 /l/ 로 접는다. */
export const DARK_L = BY_IPA.get('[ɫ]').pos['종성'];

// ── 등록부가 아직 덮지 않은 자리 ────────────────────────────────────

/**
 * 사전 표기가 쓰지만 등록부에 항목이 없는 기호들. 임시로 채워 두되
 * 반드시 임시값임을 표시한다. 등록부가 이 자리를 채우면 여기서 뺀다.
 */
export const SUPPLEMENT = new Map([
  ['i', { form: 'ᅵ', why: '짧은 /i/. 등록부에는 /iː/ 와 /ɪ/ 만 있다.' }],
  ['ɝ', { form: 'ᅥ', why: 'r 색채 모음. 해례 R9 행이 등록부로 옮겨지지 않았다.' }],
  ['ɚ', { form: 'ᆞퟛ', why: 'r 색채 슈와. ᆞ + ퟛ 로 잇는 임시값.' }],
  ['ts', { form: 'ᅉ', why: '/ts/ 를 파찰음 하나로 접은 임시값.' }],
]);

/** 사전 표기의 이형 기호를 등록부 표제 기호로 돌린다. 값은 만들지 않는다. */
export const ALIAS = new Map([
  ['ɡ', 'g'],
  ['ʧ', 'tʃ'],
  ['ʤ', 'dʒ'],
  ['r', 'ɹ'],
  ['ɫ', 'l'],
  ['a', 'æ'],
  ['e', 'ɛ'],
  ['o', 'ɒ'],
  ['u', 'ʊ'],
  ['ɜ', 'ʌ'],
  ['əʊ', 'oʊ'],
  ['ɒʊ', 'oʊ'],
  ['ʌɪ', 'aɪ'],
  ['ɔ:', 'ɔː'],
  ['u:', 'uː'],
  ['i:', 'iː'],
  ['ɑ:', 'ɑː'],
  ['ɜ:', 'ɜː'],
]);

for (const [bare, sup] of SUPPLEMENT) {
  if (IPA_TO_HMBR.has(bare)) continue;
  IPA_TO_HMBR.set(bare, markTail(sup.form));
  ENTRY_FOR.set(bare, {
    id: null, jv: null, ipa: '/' + bare + '/', bare,
    mode: 'phonemic', canonical: sup.form,
    pos: {}, rules: [], slug: '', cls: '',
    status: '등록부 미수록 · 임시값', context: sup.why,
    supplement: true,
  });
}

for (const [from, to] of ALIAS) {
  if (IPA_TO_HMBR.has(from) || !IPA_TO_HMBR.has(to)) continue;
  IPA_TO_HMBR.set(from, IPA_TO_HMBR.get(to));
  ENTRY_FOR.set(from, ENTRY_FOR.get(to));
  if (ONSET_FORM.has(to)) ONSET_FORM.set(from, ONSET_FORM.get(to));
  if (CODA_FORM.has(to)) CODA_FORM.set(from, CODA_FORM.get(to));
}

/**
 * 음소 기호와 부딪히지 않는 이음 기호만 표에 함께 올린다.
 * [p] [t] [k] [ɫ] 는 /p/ /t/ /k/ /l/ 과 글자가 겹치므로 여기 넣지 않고
 * NARROW_AFTER_S · DARK_L 로 문맥을 보아 갈라 쓴다.
 */
for (const key of ['[ɾ]', '[ʔ]', '[n̩]']) {
  const e = BY_IPA.get(key);
  if (!e || IPA_TO_HMBR.has(e.bare)) continue;
  IPA_TO_HMBR.set(e.bare, e.canonical);
  ENTRY_FOR.set(e.bare, e);
  if (e.pos['초성']) ONSET_FORM.set(e.bare, e.pos['초성']);
  if (e.pos['종성']) CODA_FORM.set(e.bare, e.pos['종성']);
}

/** 그대로 흘려보내는 표시. 힘주기와 사이. */
for (const m of ['ˈ', 'ˌ', ' ']) IPA_TO_HMBR.set(m, m);

/** 홀소리 기호. 자음 앞뒤를 가르는 데 쓴다. */
export const IPA_VOWELS = new Set();
for (const [bare, e] of ENTRY_FOR) {
  if (e.pos?.['중성'] || e.supplement) {
    if (bare === 'ts') continue;
    IPA_VOWELS.add(bare);
  }
}
for (const v of ['i', 'ɝ', 'ɚ']) IPA_VOWELS.add(v);

/**
 * 긴 기호부터 끊어 읽도록 늘어놓은 목록. 두 글자 기호(tʃ, aɪ, iː, n̩)가
 * 한 글자 기호에 먹히지 않게 한다.
 */
export const IPA_TOKENS = [...IPA_TO_HMBR.keys()].sort(
  (a, b) => b.length - a.length || (a < b ? -1 : 1),
);

/** 자음 뒤에 자음이 잇달아 채움 중성을 부르는 자리. */
export const LN_CLUSTER = new Set(['p', 'b', 'k', 'g', 's', 'v', 'f', 't', 'd', 'z']);

// ── 조합 보조표 ─────────────────────────────────────────────────────

/**
 * 초성 부호점 → 같은 자모값의 종성 부호점.
 * 등록부의 위치별 부호열에서 그대로 뽑는다. v1.2 구현이 ㅅ·ㅎ 를
 * 자기 자신으로 되돌려 호환 자모를 흘리던 자리가 여기서 막힌다.
 */
export const CHOSEONG_TO_JONGSEONG = new Map();
for (const e of ENTRIES) {
  const on = e.pos['초성'] ?? e.pos['초성_기타모음앞'];
  const co = e.pos['종성'];
  if (!on || !co) continue;
  CHOSEONG_TO_JONGSEONG.set(on.codePointAt(0), co.codePointAt(0));
}
// /s/ 의 두 초성 위치형은 종성이 하나다.
CHOSEONG_TO_JONGSEONG.set(0x1109, 0x11ba);
CHOSEONG_TO_JONGSEONG.set(0x110a, 0x11ba);
// 등록부에 없는 한국어 기본 자모. 한국어 낱말을 섞어 넣을 때만 쓴다.
for (const [c, j] of [[0x110b, 0x11bc], [0x110c, 0x11bd], [0x110e, 0x11be],
  [0x1101, 0x11a9], [0x1104, 0x11ae], [0x1108, 0x11b8]]) {
  if (!CHOSEONG_TO_JONGSEONG.has(c)) CHOSEONG_TO_JONGSEONG.set(c, j);
}

/** 종성으로 설 수 있는 부호점. 등록부의 종성 위치형 전부. */
export const HMBR_JONGSEONG_HEADS = new Set();
for (const e of ENTRIES) {
  if (e.pos['종성']) HMBR_JONGSEONG_HEADS.add(e.pos['종성'].codePointAt(0));
}
for (const cp of CHOSEONG_TO_JONGSEONG.values()) HMBR_JONGSEONG_HEADS.add(cp);

/**
 * 호환용 자모 → 조합용 자모. 정본을 만드는 길에는 쓰이지 않는다.
 * 바깥에서 들어온 옛 자료를 정본 부호열로 씻어 낼 때만 쓴다.
 */
export const COMPAT_TO_CHOSEONG = new Map([
  [0x3131, 0x1100], [0x3132, 0x1101], [0x3134, 0x1102], [0x3137, 0x1103],
  [0x3138, 0x1104], [0x3139, 0x1105], [0x3141, 0x1106], [0x3142, 0x1107],
  [0x3143, 0x1108], [0x3145, 0x1109], [0x3146, 0x110a], [0x3147, 0x110b],
  [0x3148, 0x110c], [0x3149, 0x110d], [0x314a, 0x110e], [0x314b, 0x110f],
  [0x314c, 0x1110], [0x314d, 0x1111], [0x314e, 0x1112],
  [0x3182, 0x1145], [0x3183, 0x1146], [0x3180, 0x1147],
  [0x317f, 0x1140], [0x317e, 0x1136], [0x3184, 0x1157],
  [0x3178, 0x112b], [0x317c, 0x112f], [0x3186, 0x1159],
]);

export const COMPAT_TO_JONGSEONG = new Map([
  [0x11a7, 0x11a7],
  [0x3131, 0x11a8], [0x3132, 0x11a9], [0x3134, 0x11ab], [0x3137, 0x11ae],
  [0x3139, 0x11af], [0x3141, 0x11b7], [0x3142, 0x11b8], [0x3145, 0x11ba],
  [0x3146, 0x11bb], [0x3147, 0x11bc], [0x3148, 0x11bd], [0x314a, 0x11be],
  [0x314b, 0x11bf], [0x314c, 0x11c0], [0x314d, 0x11c1], [0x314e, 0x11c2],
  [0x3182, 0x11f1], [0x3183, 0x11f2], [0x3180, 0x11ee],
]);

// ── 표시 프로파일 ───────────────────────────────────────────────────

/**
 * 정본을 화면에 앉힐 때 접는 자리.
 * 아래아 계열 중성 ᆝ(U+119D)는 현행 글꼴과 입력기에서 홀로 서기
 * 어려우므로 표시 단계에서 ᅵ(U+1175)로 접는다. 정본 값은 그대로다.
 * 이 접기 때문에 ᄑᆝᆿ 은 화면에서 `핔` 으로 보인다.
 */
export const DISPLAY_FOLD = new Map([
  ['ᆝ', 'ᅵ'],
]);

/** 정본 부호열 → 화면 표시 문자열. 접은 뒤 NFC 로 모아 쓴다. */
export function toDisplay(canonical) {
  let s = '';
  for (const ch of canonical) s += DISPLAY_FOLD.get(ch) ?? ch;
  return s.normalize('NFC');
}

/**
 * 홀로 서는 종성을 글자꼴로 세운다. 채움문자 두 개를 앞세워
 * 초성·중성 자리를 비운다(U+115F, U+1160).
 */
export function standalone(jongseong) {
  return '\u115f\u1160' + jongseong;
}

/** 정본 데이터에 호환용 자모가 섞였는지 본다. 생성 경로의 단정문. */
export function hasCompatJamo(s) {
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (cp >= 0x3130 && cp <= 0x318f) return true;
  }
  return false;
}
