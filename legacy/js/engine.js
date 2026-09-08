/**
 * 훈민바름 engine — IPA → 정본 부호열, 결정적 변환.
 *
 *   ipaToJamos(ipa)      IPA 문자열 → 자모 흐름 (ˈ ˌ * 표시 포함)
 *   jamosToSyllables(j)  자모 흐름 → 음절로 모은 정본 부호열
 *   toRuns(s)            정본 부호열 → 힘주기 무게가 붙은 조각들
 *   convert(ipa)         위를 한 줄로 이은 것
 *
 * 표기규격 v2.0 을 따른다. v1.2 구현과 다른 자리는 세 곳이다.
 *
 *  1. **위치별 자형**(제5조의2 ①). 자음은 초성 자리와 종성 자리에서
 *     서로 다른 부호열을 쓴다. 어느 자리인지는 낱말 안에서 정해진다.
 *     낱말의 마지막 홀소리 뒤에 오는 자음은 모두 종성이다.
 *
 *  2. **원어 종성의 보존**(제5조의2 ④). 어말 자음에 한국어 말음 중화를
 *     적용하지 않는다. /k/→ᆿ, /t/→ᇀ, /p/→ᇁ, /s/→ᆺ 를 그대로 적는다.
 *     자음이 둘 이상 이어지면 첫째만 앞 음절에 얹고 나머지는 종성
 *     자모를 그대로 잇는다(부록 E RV-EN-CLUSTER-01). boost → 부웃ᇀ.
 *
 *  3. **정본과 표시의 분리**. 이 모듈이 내는 것은 정본 부호열이다.
 *     화면에 앉히는 일은 map.js 의 표시 프로파일(toDisplay)이 맡는다.
 *     convert() 는 둘을 다 돌려준다 — canonical 과 text.
 *
 * 모든 판정은 결정적이다. 언어모형이 한글 표기를 직접 내는 일은 없다.
 * 언어모형은 이 모듈 앞에서 IPA 를 대는 데까지만 관여한다.
 */

import {
  IPA_TO_HMBR, IPA_TOKENS, IPA_VOWELS, ONSET_FORM, CODA_FORM,
  S_FORMS, NARROW_AFTER_S, DARK_L, LN_CLUSTER, ENTRY_FOR,
  CHOSEONG_BASE, JUNGSEONG_BASE, JONGSEONG_BASE, SYLLABLE_BASE,
  JUNGSEONG_NUM, JONGSEONG_NUM, JUNGSEONG_FILLER, CHOSEONG_FILLER,
  COMPAT_TO_CHOSEONG, CHOSEONG_TO_JONGSEONG, COMPAT_TO_JONGSEONG,
  HMBR_JONGSEONG_HEADS, TAIL_MARK, toDisplay,
} from './map.js';

const FILLER = String.fromCodePoint(JUNGSEONG_FILLER);
const CHO_FILLER = String.fromCodePoint(CHOSEONG_FILLER);
const ONSET_IEUNG = 'ᄋ'; // U+110B — 홀소리 앞 빈 초성
const STRESS = new Set(['ˈ', 'ˌ']);
const LINK = '‿'; // ‿ 연음 표시 (connected.js 가 넣는다)

export class UnmappedIPAError extends Error {
  constructor(char) {
    super(`IPA character "${char}" is not in the HMBR registry`);
    this.char = char;
  }
}

// ── 1단계 앞머리 — IPA 를 기호 단위로 끊는다 ─────────────────────────
/**
 * 등록부의 표제 기호를 긴 것부터 맞추어 끊는다. tʃ 가 t 와 ʃ 로,
 * iː 가 i 와 ː 로 갈라지지 않게 하려는 것이다(제19조 ①의 음소 단위).
 *
 * @returns {Array<{sym:string, kind:'vowel'|'cons'|'mark'|'break'}>}
 */
export function tokenize(ipa) {
  const s = ipa.normalize('NFC');
  const toks = [];
  let i = 0;

  while (i < s.length) {
    const ch = s[i];

    if (ch === '̩' || ch === '̥') { i += 1; continue; } // 음절주음 표시
    if (ch === ' ') { toks.push({ sym: ' ', kind: 'break' }); i += 1; continue; }
    if (ch === LINK) { toks.push({ sym: LINK, kind: 'break' }); i += 1; continue; }
    if (STRESS.has(ch)) { toks.push({ sym: ch, kind: 'mark' }); i += 1; continue; }

    // 길이표. 앞 홀소리와 묶어 긴 홀소리 한 기호로 다시 읽는다.
    if (ch === 'ː' || ch === ':') {
      const prev = toks[toks.length - 1];
      if (prev && prev.kind === 'vowel') {
        const joined = prev.sym + 'ː';
        if (IPA_TO_HMBR.has(joined)) prev.sym = joined;
        else prev.long = true;
      }
      i += 1;
      continue;
    }

    let hit = null;
    for (const t of IPA_TOKENS) {
      if (t === ' ' || STRESS.has(t)) continue;
      if (s.startsWith(t, i)) { hit = t; break; }
    }
    if (hit === null) throw new UnmappedIPAError(ch);
    toks.push({ sym: hit, kind: IPA_VOWELS.has(hit) ? 'vowel' : 'cons' });
    i += hit.length;
  }
  return toks;
}

/**
 * 자음이 종성 자리인지 표시한다(제5조의2 ①).
 * 낱말의 마지막 홀소리 뒤에 오는 자음은 모두 종성이고, 그 앞의 자음은
 * 뒤에 홀소리가 오므로 모두 초성이다. 낱말 경계는 사이와 연음 표시다.
 */
function markCodas(toks) {
  let start = 0;
  for (let i = 0; i <= toks.length; i += 1) {
    if (i < toks.length && toks[i].kind !== 'break') continue;
    let lastVowel = -1;
    for (let j = start; j < i; j += 1) if (toks[j].kind === 'vowel') lastVowel = j;
    if (lastVowel >= 0) {
      for (let j = lastVowel + 1; j < i; j += 1) {
        if (toks[j].kind === 'cons') toks[j].coda = true;
      }
    }
    start = i + 1;
  }
  return toks;
}

/** 긴 홀소리의 뒷가지. ᅵ이 처럼 등록부가 이미 이어 둔 것은 그대로 쓴다. */
function vowelJamos(tok) {
  let out = IPA_TO_HMBR.get(tok.sym);
  if (out === undefined) throw new UnmappedIPAError(tok.sym);
  if (tok.long && !out.includes(TAIL_MARK)) {
    const nucleus = [...out].filter((c) => {
      const cp = c.codePointAt(0);
      return (cp >= 0x1160 && cp <= 0x11a7) || (cp >= 0xd7b0 && cp <= 0xd7c6);
    });
    const tail = nucleus[nucleus.length - 1];
    if (tail) out += TAIL_MARK + ONSET_IEUNG + tail;
  }
  return out;
}

/** 초성 자리 부호열. 등록부에 초성이 없으면 정본 부호열을 그대로 쓴다. */
function onsetOf(sym) {
  return ONSET_FORM.get(sym) ?? IPA_TO_HMBR.get(sym) ?? '';
}

/**
 * 종성 자리 부호열. /θ/ /ð/ /tʃ/ /dʒ/ 는 종성이 아직 미정이므로
 * (제5조의2 ⑥) 초성 자형을 그대로 두고 표시만 남긴다. 값을 지어내지
 * 않는다는 뜻이고, 등록부가 그 자리를 채우면 여기가 저절로 따라온다.
 */
function codaOf(sym) {
  const coda = CODA_FORM.get(sym);
  if (coda !== undefined) return coda;
  return onsetOf(sym);
}

/** 종성이 등록부에 없어 초성 자형으로 남은 자리인지. */
export function codaUndecided(sym) {
  return !CODA_FORM.has(sym) && ONSET_FORM.has(sym);
}

/** 1단계 — IPA 문자열을 자모 흐름으로 편다. */
export function ipaToJamos(ipa, { narrow = false } = {}) {
  const toks = markCodas(tokenize(ipa));
  let out = '';

  for (let i = 0; i < toks.length; i += 1) {
    const t = toks[i];
    const prev = toks[i - 1];
    const next = toks[i + 1];

    if (t.kind === 'break' || t.kind === 'mark') { out += t.sym; continue; }

    if (t.kind === 'vowel') {
      // 홀소리는 초성 자리를 비울 수 없다. 앞이 초성 자음이 아니면 ᄋ 을 세운다.
      if (!prev || prev.kind !== 'cons' || prev.coda) out += ONSET_IEUNG;
      out += vowelJamos(t);
      continue;
    }

    // ── 종성 자리 ──
    if (t.coda) {
      if (t.sym === 'l' || t.sym === 'ɫ') out += narrow ? DARK_L : codaOf('l');
      else out += codaOf(t.sym);
      continue;
    }

    // ── 초성 자리 ──

    // /s/ 는 하나의 음소인데 부호열이 넷이다(제5조의2 ②·③).
    if (t.sym === 's') {
      if (!next || next.kind !== 'vowel') out += S_FORMS.beforeConsonant;
      else if (S_FORMS.highRoundVowels.has(next.sym)) out += S_FORMS.beforeHighRound;
      else out += S_FORMS.beforeOtherVowel;
      continue;
    }

    // 뒤에 홀소리가 없는 초성은 중성 자리를 채움문자로 메운다.
    // 초성만 있는 조합은 KS X 1026-1 이 받지 않으므로, 채움 중성을
    // 세워 한 음절의 꼴을 갖추게 한다. 등록부의 /s/ 자음앞 위치형
    // (ᄉ + U+1160)이 바로 이 방식이다.
    const lone = !next || next.kind !== 'vowel' ? FILLER : '';

    // 음성 모드 — /s/ 뒤의 무기 파열음(제3조 ②).
    if (narrow && NARROW_AFTER_S.has(t.sym) && prev && prev.sym === 's') {
      out += NARROW_AFTER_S.get(t.sym) + lone;
      continue;
    }

    // 어두 자음군의 ㄹ·ㄴ. 앞 자음에 채움 중성을 두고 종성으로 얹는다.
    // /s/ 의 자음 앞 위치형(ᄉ + U+1160)은 채움 중성을 이미 달고 있으므로
    // 겹쳐 넣지 않는다.
    if ((t.sym === 'l' || t.sym === 'n') && prev && prev.kind === 'cons'
        && !prev.coda && LN_CLUSTER.has(prev.sym)) {
      if (!out.endsWith(FILLER)) out += FILLER;
      out += codaOf(t.sym);
      if (next && next.kind === 'vowel') out += onsetOf(t.sym);
      continue;
    }

    // 홀소리 사이의 /l/ — 앞 음절의 종성이자 뒤 음절의 초성이다.
    if ((t.sym === 'l' || t.sym === 'ɫ') && next && next.kind === 'vowel'
        && prev && prev.kind === 'vowel') {
      out += (narrow ? DARK_L : codaOf('l')) + onsetOf('l');
      continue;
    }

    // 힘주기 표시를 사이에 둔 홀소리–ㄹ–홀소리. 종성은 표시 앞에 둔다.
    // 뒤 음절이 힘을 받으므로 ㄹ 은 그 음절의 초성으로 또렷하게 남고
    // 어두운 ㄹ 로 가지 않는다(hello 는 음성 모드에서도 ᆯ 이다).
    if ((t.sym === 'l' || t.sym === 'ɫ') && next && next.kind === 'vowel'
        && prev && prev.kind === 'mark'
        && toks[i - 2] && toks[i - 2].kind === 'vowel') {
      out = out.slice(0, -prev.sym.length)
        + codaOf('l') + prev.sym + onsetOf('l');
      continue;
    }

    out += onsetOf(t.sym) + lone;
  }
  return out;
}

// ── 유니코드 갈래 ───────────────────────────────────────────────────
const isChoseongCp = (c) =>
  (c >= 0x1100 && c <= 0x115f) ||
  (c >= 0x3131 && c <= 0x314e) || (c >= 0x3165 && c <= 0x3186) ||
  (c >= 0xa960 && c <= 0xa97f);

const isJungseongCp = (c) =>
  (c >= 0x1160 && c <= 0x11a7) ||
  (c >= 0x314f && c <= 0x3163) || (c >= 0x3187 && c <= 0x318e) ||
  (c >= 0xd7b0 && c <= 0xd7c6);

const isJongseongCp = (c) =>
  (c >= 0x11a8 && c <= 0x11ff) || (c >= 0xd7cb && c <= 0xd7fb);

const isModernSyllableCp = (c) => c >= 0xac00 && c <= 0xd7a3;

const compatToChoseong = (c) => COMPAT_TO_CHOSEONG.get(c) ?? c;

function compatToJungseong(c) {
  if (c === 0x318d) return 0x119e;                    // ㆍ 아래아
  if (c === JUNGSEONG_FILLER) return c;
  if (c >= 0x1161 && c <= 0x11a7) return c;
  if (c >= 0xd7b0 && c <= 0xd7c6) return c;
  return JUNGSEONG_BASE + c - 0x314f;
}

function compatToJongseong(c) {
  if (c === 0) return 0;
  if (isJongseongCp(c)) return c;
  if (COMPAT_TO_JONGSEONG.has(c)) return COMPAT_TO_JONGSEONG.get(c);
  return CHOSEONG_TO_JONGSEONG.get(c) ?? c;
}

const isModernTriple = (cho, jung, jong) =>
  cho >= 0x1100 && cho <= 0x1112 &&
  jung >= 0x1161 && jung <= 0x1175 &&
  ((jong >= 0x11a8 && jong <= 0x11c2) || jong === 0);

function composeSyllable(cho, jung, jong) {
  cho = compatToChoseong(cho);
  jung = compatToJungseong(jung);
  jong = compatToJongseong(jong);

  if (isModernTriple(cho, jung, jong)) {
    if (jong === 0) jong = JONGSEONG_BASE;
    const cp = SYLLABLE_BASE +
      (((cho - CHOSEONG_BASE) * JUNGSEONG_NUM) + (jung - JUNGSEONG_BASE)) * JONGSEONG_NUM +
      (jong - JONGSEONG_BASE);
    return String.fromCodePoint(cp);
  }

  // 옛한글 자리. 자모를 그대로 잇는다. 채움 중성도 지우지 않는다 —
  // 그것이 초성만 있는 음절을 KS X 1026-1 이 받아들이는 방식이다.
  let ret = String.fromCodePoint(cho) + String.fromCodePoint(jung);
  if (jong !== JONGSEONG_BASE && jong !== 0) ret += String.fromCodePoint(jong);
  return ret;
}

/**
 * 2단계 — 자모 흐름을 음절로 모은다.
 *
 * v1.2 구현은 겹홀소리 뒷가지에 붙는 종성을 울림소리로 제한하여
 * 파열음 종성을 홀로 세워 두었다(파아ㅋ). v2.0 은 원어 종성을 그대로
 * 보존하므로 그 빗장을 걷는다. 파앜 이 된다.
 */
export function jamosToSyllables(jamos) {
  let i = 0;
  const len = jamos.length;
  let ret = '';

  while (i + 1 < len) {
    const c1 = jamos.codePointAt(i);
    const c2 = jamos.codePointAt(i + 1);
    const c3 = i + 2 < len ? jamos.codePointAt(i + 2) : 0;

    if (c1 === 0x2a) { ret += TAIL_MARK; i += 1; continue; }

    const jongOk = isJongseongCp(c3) && HMBR_JONGSEONG_HEADS.has(c3);

    if (isChoseongCp(c1) && isJungseongCp(c2) && jongOk) {
      ret += composeSyllable(c1, c2, c3);
      i += 3;
    } else if (isChoseongCp(c1) && isJungseongCp(c2)) {
      ret += composeSyllable(c1, c2, 0);
      i += 2;
    } else {
      ret += String.fromCodePoint(c1);
      i += 1;
    }
  }
  if (i === len - 1) ret += jamos.charAt(i);
  return ret;
}

// ── 3단계 — 힘주기 무게가 붙은 조각 ─────────────────────────────────
/**
 * 크기 모형(20230925 §5)을 em 무게로 옮긴 것.
 *   힘주기 표시가 하나인 낱말: 힘준 음절 1.0, 그 밖 0.75
 *   표시가 둘 이상인 낱말:     첫째 1.25, 둘째 1.0, 그 밖 0.75
 *   겹홀소리 뒷가지:            앞가지 무게의 0.5배
 */
const W = { UNSTRESSED: 0.75, STRESSED: 1.0, PRIMARY: 1.25, SECONDARY: 1.0 };

/**
 * 조각 하나가 화면에 앉을 모습. 홀로 선 종성은 채움문자 둘을 앞세워
 * 글자꼴을 갖추고, 홀로 선 초성은 채움 중성을 뒤에 세운다.
 * 정본 값은 건드리지 않는다 — canonical 필드에 그대로 남는다.
 */
function displayOf(canonical) {
  let s = canonical;
  if (s.length === 1) {
    const cp = s.codePointAt(0);
    if (isJongseongCp(cp)) s = CHO_FILLER + FILLER + s;
    else if (isChoseongCp(cp)) s = s + FILLER;
  }
  return toDisplay(s);
}

/**
 * @returns {Array<{type:'word'|'space', units?:Array<{text:string, canonical:string, weight:number, role:string}>}>}
 */
export function toRuns(syllableString) {
  const words = syllableString.split(' ');
  const runs = [];

  words.forEach((word, wi) => {
    if (wi > 0) runs.push({ type: 'space' });
    if (!word) return;

    const marks = (word.match(/[ˈˌ]/g) || []).length;
    const multi = marks > 1;

    const units = [];
    let pendingStress = null;   // 'primary' | 'secondary'
    let pendingDiphthong = false;
    let lastVowelUnit = null;

    let i = 0;
    while (i < word.length) {
      const cp = word.codePointAt(i);
      const ch = word[i];

      if (ch === LINK) {
        units.push({ text: LINK, canonical: LINK, weight: 0.45, role: 'link' });
        i += 1; continue;
      }
      if (ch === 'ˈ') { pendingStress = 'primary'; i += 1; continue; }
      if (ch === 'ˌ') { pendingStress = 'secondary'; i += 1; continue; }
      if (ch === TAIL_MARK) { pendingDiphthong = true; i += 1; continue; }

      let text = '';
      let hasVowel = false;

      if (isModernSyllableCp(cp)) {
        text = word[i];
        hasVowel = true;
        i += 1;
      } else if (isChoseongCp(cp) && i + 1 < word.length && isJungseongCp(word.codePointAt(i + 1))) {
        text = word.substring(i, i + 2);
        hasVowel = word.codePointAt(i + 1) !== JUNGSEONG_FILLER;
        i += 2;
        if (i < word.length && isJongseongCp(word.codePointAt(i))) {
          text += word[i];
          i += 1;
        }
      } else {
        text = word[i];
        i += 1;
      }

      const unit = {
        text: displayOf(text),
        canonical: text,
        weight: W.UNSTRESSED,
        role: 'plain',
      };

      if (hasVowel) {
        if (pendingDiphthong) {
          const head = lastVowelUnit ?? unit;
          unit.weight = (head === unit ? W.UNSTRESSED : head.weight) * 0.5;
          unit.role = 'diphthong';
          pendingDiphthong = false;
        } else if (pendingStress) {
          unit.weight = pendingStress === 'primary'
            ? (multi ? W.PRIMARY : W.STRESSED)
            : (multi ? W.SECONDARY : W.STRESSED);
          unit.role = pendingStress;
          pendingStress = null;
        }
        lastVowelUnit = unit;
      }
      units.push(unit);
    }

    runs.push({ type: 'word', units });
  });

  return runs;
}

/** 화면에 보이는 대로의 문자열. 베껴 쓰기 단추가 이것을 준다. */
export function runsToText(runs) {
  return runs
    .map((r) => (r.type === 'space' ? ' ' : r.units.map((u) => u.text).join('')))
    .join('');
}

/** 정본 부호열. 표시용 채움문자도 접기도 들어 있지 않다. */
export function runsToCanonical(runs) {
  return runs
    .map((r) => (r.type === 'space' ? ' ' : r.units.map((u) => u.canonical).join('')))
    .join('');
}

/** 한 줄로 이은 것. */
export function convert(ipa, opts = {}) {
  const jamos = ipaToJamos(ipa, opts);
  const syllables = jamosToSyllables(jamos);
  const runs = toRuns(syllables);
  return {
    jamos,
    syllables,
    runs,
    text: runsToText(runs),
    canonical: runsToCanonical(runs),
  };
}
