/**
 * 조음 안내 — articulation notes in the spirit of 훈민정음:
 * letters as visible articulatory instructions.
 *
 * Deterministic data table. Notes are keyed by IPA phoneme (plus two
 * context keys) and derived from the IPA string at runtime — never
 * AI-generated. To revise a note, edit its entry here; nothing else.
 *
 * 카드에 얹는 한글 자형은 모두 map.js 를 거쳐 등록부(제19조 ⑨)에서
 * 온다. 이 파일에 자모를 직접 적어 두지 않는다 — 등록부 값이 바뀌면
 * 카드도 따라 바뀌어야 하기 때문이다. 표기규격 v2.0 부터 /ʃ/ 는
 * 등록부 EN-P-017 (ᅀ, U+1140), /tʃ/ 는 EN-P-020 (ᅉ, U+1149) 으로
 * 갈라 잡혀 있어 v4 에서 적어 둔 충돌 표시는 더 필요 없다.
 *
 * Context keys:
 *   'lFinal' — word-final /l/ (dark L)
 *   'ər'     — /ɜ/ or /ə/ followed by /r,ɹ/ (rhotic colouring)
 */

import {
  IPA_TO_HMBR,
  IPA_VOWELS,
  ONSET_FORM,
  CODA_FORM,
  DARK_L,
  TAIL_MARK,
  CHOSEONG_FILLER,
  JUNGSEONG_FILLER,
  toDisplay,
} from './map.js';

export const PROSODY_NOTE = {
  key: 'prosody',
  symbol: '가나ᅟ',
  ipa: 'ˈ · *',
  role: '강세·운율 표기',
  instruction:
    'Large glyph = primary stress. Medium = unstressed. The small echo syllable marks a glide or vowel length — not a separate syllable.',
  warning:
    '큰 글자 = 강세, 중간 = 무강세, 작은 꼬리 글자 = 활음(glide)·장음 표시. 작은 글자를 온전한 한 음절로 읽지 말 것.',
};

export const NOTES = new Map(Object.entries({
  f: {
    role: '무성 순치 마찰음',
    instruction: 'Lower lip lightly touches the upper teeth; push continuous air friction through the gap.',
    warning: 'ㅍ·프로 발음하지 말 것. 윗니로 아랫입술을 살짝 누르고 바람을 새게 낸다.',
  },
  v: {
    role: '유성 순치 마찰음',
    instruction: 'Same lip–teeth position as /f/, but add voice.',
    warning: 'ㅂ으로 발음하지 말 것. /f/ 자세에 성대를 울린다.',
  },
  'θ': {
    role: '무성 치 마찰음',
    instruction: 'Tongue tip lightly between the teeth (or just behind the upper teeth); voiceless air friction.',
    warning: 'ㅅ·ㅆ·ㄷ으로 발음하지 말 것. 혀끝을 치아 사이/윗니 뒤에 가볍게 두고 바람을 낸다.',
  },
  'ð': {
    role: '유성 치 마찰음',
    instruction: 'Same tongue position as /θ/, but add voice.',
    warning: 'ㄷ·ㄹ로 발음하지 말 것. /θ/ 자세에 성대를 울린다.',
  },
  r: {
    role: '유성 접근음 (rhotic)',
    instruction: 'The tongue never taps like Korean ㄹ — bunch or curl it slightly without touching the roof; lips may round a little.',
    warning: '혀끝을 치지 말 것. 혀를 말거나 뒤로 당겨 공간을 만든다.',
  },
  l: {
    role: '설측 접근음 (clear L)',
    instruction: 'Tongue tip touches the alveolar ridge behind the upper teeth; release cleanly into the vowel.',
    warning: '윗잇몸에 혀끝을 붙인다.',
  },
  lLink: {
    role: '연음 L (linking)',
    instruction: 'In connected speech, a final L links onto the next vowel-initial word as a clear, onset-like L — one flow, no break.',
    warning: '단어 사이를 끊지 말고 ㄹ을 다음 모음의 첫소리로 이어서 낸다. 연음은 화자·스타일에 따라 선택적이다.',
  },
  lFinal: {
    role: '음절말(coda) dark L',
    instruction: 'Hold the tongue contact at the end; the sound is darker and further back. Do not release into an extra vowel.',
    warning: '끝에 “으”를 붙이지 말 것. 혀끝을 붙인 채로 소리를 닫고 뒤쪽 울림을 남긴다.',
  },
  'ʃ': {
    role: '무성 후치경 마찰음',
    instruction: 'Lips slightly rounded, tongue blade raised; air passes through a narrow groove.',
    warning: '단순한 “시”로 내지 말 것. 입술을 살짝 둥글리고 혀 앞쪽으로 바람길을 좁힌다.',
  },
  'tʃ': {
    role: '무성 후치경 파찰음',
    instruction: 'Stop the air, then release it into friction.',
    warning: '막았다가 터뜨리며 마찰을 낸다.',
  },
  'dʒ': {
    role: '유성 후치경 파찰음',
    instruction: 'Same gesture as /tʃ/, but voiced.',
    warning: '/tʃ/보다 성대를 울린다.',
  },
  j: {
    role: '경구개 활음',
    instruction: 'A /j/ glide into the following vowel — one smooth movement, not a separate syllable.',
    warning: '“이”를 따로 세우지 말고 다음 모음으로 미끄러진다.',
  },
  'ɪ': {
    role: '짧고 느슨한 전설 모음',
    instruction: 'Short and lax — mouth slightly more open and relaxed than Korean 이.',
    warning: '이보다 짧고 느슨하게. /iː/와 길이·긴장을 구분할 것.',
  },
  'æ': {
    role: '전설 저모음',
    instruction: 'Mouth wide, tongue front and low — not exactly Korean 애.',
    warning: '애보다 입을 더 열고 앞쪽에서 낸다.',
  },
  'ɑ': {
    role: '후설 개모음',
    instruction: 'Open back vowel — deeper and further back than Korean 아.',
    warning: '입을 크게 열고 목구멍 쪽 공간을 둔다.',
  },
  'ɒ': {
    role: '후설 원순 개모음',
    instruction: 'Open back vowel with light lip rounding.',
    warning: '오보다 입을 더 열고 뒤쪽에서 낸다.',
  },
  'ɔ': {
    role: '후설 원순 중저모음',
    instruction: 'More open than Korean 오, keeping the lip rounding.',
    warning: '오보다 입을 더 열고 둥글림은 유지한다.',
  },
  'ər': {
    role: '중설 모음 + r 색채',
    instruction: 'Central vowel with rhotic colouring — pull or curl the tongue back during the vowel. Never insert a separate 르.',
    warning: '“르”를 따로 넣지 말 것. 어 소리에서 혀를 뒤로 당기거나 말아 r 색채를 만든다.',
  },
  'iː': {
    role: '긴장 장모음',
    instruction: 'Long, tense front vowel. The small echo glyph marks length, not a new syllable.',
    warning: '이보다 길고 팽팽하게. 이 자세를 유지하며 길게 끈다.',
  },
  'uː': {
    role: '긴장 원순 장모음',
    instruction: 'Long, tense rounded back vowel.',
    warning: '우보다 길고 팽팽하게. 입술을 둥글게 유지하며 길게 끈다.',
  },
  'ɪə': {
    role: '중심화 이중모음',
    instruction: 'Glide from 이 toward a central 어/ㆍ quality in one syllable.',
    warning: '이어처럼 두 음절로 끊지 말 것. 작은 꼬리는 활음이다.',
  },
  'ʊə': {
    role: '중심화 이중모음',
    instruction: 'Glide from 우 toward a central 어/ㆍ quality in one syllable.',
    warning: '우어처럼 두 음절로 끊지 말 것.',
  },
  'ɜː': {
    role: '장 중설 모음 (비rhotic)',
    instruction: 'Long central vowel — hold a relaxed 어 quality; no r colouring in RP.',
    warning: '어보다 길게, 혀는 중앙에. “르”를 넣지 말 것.',
  },
  'eɪ': {
    role: '이중모음',
    instruction: 'Glide from 에 toward 이 in one syllable.',
    warning: '에에서 이 쪽으로 미끄러진다. 작은 꼬리는 활음이다.',
  },
  'aɪ': {
    role: '이중모음',
    instruction: 'Glide from 아 toward 이 in one syllable.',
    warning: '아에서 이 쪽으로 미끄러진다.',
  },
  'ɔɪ': {
    role: '이중모음',
    instruction: 'Glide from 오/어 quality toward 이.',
    warning: '오/어 계열에서 이 쪽으로 미끄러진다.',
  },
  'aʊ': {
    role: '이중모음',
    instruction: 'Glide from 아 toward 우.',
    warning: '아에서 우 쪽으로 미끄러진다.',
  },
  'əʊ': {
    role: '이중모음',
    instruction: 'Glide from 오 toward 우.',
    warning: '오에서 우 쪽으로 미끄러진다.',
  },
  'oʊ': {
    role: '이중모음',
    instruction: 'Glide from 오 toward 우.',
    warning: '오에서 우 쪽으로 미끄러진다.',
  },
}));

const DIPHTHONGS = new Set(['aɪ', 'ʌɪ', 'eɪ', 'ɔɪ', 'aʊ', 'ɒʊ', 'əʊ', 'oʊ', 'ɪə', 'ʊə']);
const STRESS = new Set(['ˈ', 'ˌ']);
const R_CHARS = new Set(['r', 'ɹ']);

const LINK = '‿';
const CHO_FILLER = String.fromCodePoint(CHOSEONG_FILLER);
const FILLER = String.fromCodePoint(JUNGSEONG_FILLER);

const isChoseongCp = (cp) =>
  (cp >= 0x1100 && cp <= 0x115e) || (cp >= 0xa960 && cp <= 0xa97c);
const isJungseongCp = (cp) =>
  (cp >= 0x1161 && cp <= 0x11a7) || (cp >= 0xd7b0 && cp <= 0xd7c6);
const isJongseongCp = (cp) =>
  (cp >= 0x11a8 && cp <= 0x11ff) || (cp >= 0xd7cb && cp <= 0xd7fb);

/**
 * 등록부 부호열을 카드에 얹을 표시형으로 옮긴다.
 *
 * 등록부의 부호열은 자리(초성·중성·종성)가 정해진 조합용 자모라서
 * 낱개로는 한 음절을 이루지 못한다. KS X 1026-1 이 초성만·종성만으로
 * 된 조합을 받지 않으므로 빈자리를 채움문자로 메운 뒤 표시 프로파일을
 * 태운다. 엔진의 displayOf 와 같은 처리다.
 */
function show(seq) {
  const s = String(seq ?? '').split(TAIL_MARK).join('');
  if (!s) return '';
  const cp = s.codePointAt(0);
  const hasNucleus = [...s].some((c) => isJungseongCp(c.codePointAt(0)));
  let out = s;
  if (isJungseongCp(cp)) out = CHO_FILLER + out;
  else if (isJongseongCp(cp)) out = CHO_FILLER + FILLER + out;
  else if (isChoseongCp(cp) && !hasNucleus) out += FILLER;
  return toDisplay(out);
}

/** HMBR glyph for a note key, from the canonical map. Mode-aware. */
export function glyphFor(key, narrow = false) {
  // 어말 /l/ — 음성 모드에서만 어두운 ㄹ로 갈라 적는다(등록부 [ɫ] 종성).
  if (key === 'lFinal') return show(narrow ? DARK_L : CODA_FORM.get('l'));
  // 연음 L — 다음 낱말의 첫소리 자리로 넘어가므로 초성형으로 보인다.
  if (key === 'lLink') return show(ONSET_FORM.get('l')) + LINK;
  // r 색채 모음. 등록부에 아직 행이 없어 map.js 의 보충값(ɚ)을 빌린다.
  // 해례 R9 의 r 색채 모음 행이 등록부로 옮겨지면 여기도 함께 사라진다.
  if (key === 'ər') return show(IPA_TO_HMBR.get('ɚ') ?? IPA_TO_HMBR.get('ə'));
  const m = IPA_TO_HMBR.get(key);
  if (m) return show(m);
  return key.length === 2 ? show(IPA_TO_HMBR.get(key[0])) : '';
}

/**
 * Tokenize an IPA string into note keys, deterministically, mirroring the
 * engine's two-char-priority reading. Returns ordered unique keys.
 */
export function articulationKeys(ipa) {
  const s = ipa.normalize('NFC');
  const keys = [];
  const seen = new Set();
  let hasProsody = false;

  const push = (k) => {
    if (NOTES.has(k) && !seen.has(k)) { seen.add(k); keys.push(k); }
  };

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const next = i + 1 < s.length ? s[i + 1] : '';
    const after = i + 2 < s.length ? s[i + 2] : '';

    if (STRESS.has(ch)) { hasProsody = true; continue; }
    if (ch === ' ') continue;
    if (ch === '\u203f') {
      if (next === 'l' || next === 'ɫ') { push('lLink'); i++; }
      continue;
    }

    // two-character units first (diphthongs, affricates)
    const two = ch + next;
    if (DIPHTHONGS.has(two) || two === 'tʃ' || two === 'dʒ') {
      if (DIPHTHONGS.has(two)) hasProsody = true;
      push(two);
      i++;
      continue;
    }
    if (ch === 'ʧ') { push('tʃ'); continue; }
    if (ch === 'ʤ') { push('dʒ'); continue; }

    // long vowels
    if ((ch === 'i' || ch === 'u' || ch === 'ɜ') && next === 'ː' && !(ch === 'ɜ' && R_CHARS.has(after))) {
      hasProsody = true;
      push(ch + 'ː');
      i++;
      continue;
    }
    if (ch === 'ː') { hasProsody = true; continue; }

    // rhotic-coloured central vowels: ɜ(ː)r / ər
    if ((ch === 'ɜ' || ch === 'ə') && (R_CHARS.has(next) || (next === 'ː' && R_CHARS.has(after)))) {
      push('ər');
      i += next === 'ː' ? 2 : 1;
      continue;
    }

    if (ch === 'ɫ') { push('lFinal'); continue; }
    // coda /l/ (dark L): not followed by a vowel or a stress-marked syllable
    if (ch === 'l' && (next === '' || next === ' ' ||
        (!IPA_VOWELS.has(next) && !STRESS.has(next) && next !== 'ː'))) {
      push('lFinal');
      continue;
    }

    if (R_CHARS.has(ch)) { push('r'); continue; }

    push(ch);
  }

  return { keys, hasProsody };
}

/** Full card data for an IPA string. Mode-aware: cards mirror the active
 *  transcription mode so the glyph shown always matches the output. */
export function articulationCards(ipa, { narrow = false } = {}) {
  const { keys, hasProsody } = articulationKeys(ipa);
  const cards = keys.map((k) => {
    const card = {
      key: k,
      symbol: glyphFor(k, narrow),
      ipa: k === 'lFinal' ? (narrow ? 'ɫ' : 'l') : k === 'ər' ? 'ər / ɜr' : k === 'lLink' ? 'l‿V' : k,
      ...NOTES.get(k),
    };
    if (k === 'lFinal' && !narrow) card.variant = '좁은 표기 narrow form: ᇐ';
    return card;
  });
  if (hasProsody) cards.push({ ...PROSODY_NOTE });
  return cards;
}

/** Non-vowel sanity export for tests. */
export const _internal = { DIPHTHONGS, IPA_VOWELS };
