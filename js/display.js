// 표시층 · 제2본의 선형 시범 조자법(§3·§6·§7·§9.4)과 같은 모양으로 한 음절블록을 보인다.
// 이 함수는 화면 표시만 바꾼다. 층 2 직렬화(NFD 조합형 자모 연쇄)와 복사·저장 값은 건드리지 않는다.
//
// 규칙 (제2본 정본 예에서 읽어 낸 것)
//  1. 마지막 초성 + 첫 중성 (+ 첫 종성) 만 한 음절로 합성한다.        예 뱅ㅋ · 홑 · ㅅ톺
//  2. 음절핵에 모음 요소가 둘 이상이면 종성은 합성하지 않는다.          예 파ㅏㅋ · 보ᆍᇀ
//  3. 종성 /s/(ᆺ)와 /t+s/(ᆾ)는 언제나 합성하지 않는다 — §9.4 금지형 방지.  예 패ㅅ · 캐ㅊ (팻·캧이 아님)
//  4. 합성하지 않는 자모는 호환 자모가 있으면 그것으로, 없으면 조합형 그대로 보인다.  예 ㅋ ㅅ ㅌ ㅏ ㅜ / ᆝ ᆍ ᆞ ퟛ
//  5. 크기 — 합성된 핵 100% · 뒤 모음 요소 50% (제2본 §14 「뒤 요소 50% 크기」) · 독립 자음 75%.  예 부ㅜㅅㅌ = 부(100) ㅜ(50) ㅅㅌ(75)

const NO_COMPOSE_CODA = new Set(['ᆺ', 'ᆾ']);   // ᆺ /s/ · ᆾ /t+s/

const COMPAT = new Map([
  // 초성
  ['ᄀ','ㄱ'],['ᄁ','ㄲ'],['ᄂ','ㄴ'],['ᄃ','ㄷ'],['ᄄ','ㄸ'],['ᄅ','ㄹ'],['ᄆ','ㅁ'],
  ['ᄇ','ㅂ'],['ᄈ','ㅃ'],['ᄉ','ㅅ'],['ᄊ','ㅆ'],['ᄋ','ㅇ'],['ᄌ','ㅈ'],['ᄍ','ㅉ'],
  ['ᄎ','ㅊ'],['ᄏ','ㅋ'],['ᄐ','ㅌ'],['ᄑ','ㅍ'],['ᄒ','ㅎ'],
  // 중성
  ['ᅡ','ㅏ'],['ᅢ','ㅐ'],['ᅣ','ㅑ'],['ᅤ','ㅒ'],['ᅥ','ㅓ'],['ᅦ','ㅔ'],['ᅧ','ㅕ'],
  ['ᅨ','ㅖ'],['ᅩ','ㅗ'],['ᅪ','ㅘ'],['ᅫ','ㅙ'],['ᅬ','ㅚ'],['ᅭ','ㅛ'],['ᅮ','ㅜ'],
  ['ᅯ','ㅝ'],['ᅰ','ㅞ'],['ᅱ','ㅟ'],['ᅲ','ㅠ'],['ᅳ','ㅡ'],['ᅴ','ㅢ'],['ᅵ','ㅣ'],
  // 종성
  ['ᆨ','ㄱ'],['ᆩ','ㄲ'],['ᆫ','ㄴ'],['ᆮ','ㄷ'],['ᆯ','ㄹ'],['ᆷ','ㅁ'],['ᆸ','ㅂ'],
  ['ᆺ','ㅅ'],['ᆻ','ㅆ'],['ᆼ','ㅇ'],['ᆽ','ㅈ'],['ᆾ','ㅊ'],['ᆿ','ㅋ'],['ᇀ','ㅌ'],
  ['ᇁ','ㅍ'],['ᇂ','ㅎ'],
]);

const loose = ch => COMPAT.get(ch) ?? ch;

export const SCALE = { core: 1, onset: 0.75, nucleus: 0.5, coda: 0.75 };

/** 한 블록의 표시 조각. 각 조각은 { text, role, scale } — role ∈ core·onset·nucleus·coda.
 *  block = { onset:[], nucleus:[], coda:[] } (조합형 문자, 미결 자리표지 포함) */
export function linearDisplayRuns(block) {
  const onset = block.onset ?? [], nucleus = block.nucleus ?? [], coda = block.coda ?? [];
  const runs = [];
  const push = (text, role) => { if (text) runs.push({ text, role, scale: SCALE[role] }); };
  push(onset.slice(0, -1).map(loose).join(''), 'onset');
  let core = (onset.at(-1) ?? '') + (nucleus[0] ?? '');
  let codaStart = 0;
  if (nucleus.length === 1 && coda.length && !NO_COMPOSE_CODA.has(coda[0]) && coda[0].length === 1) {
    core += coda[0]; codaStart = 1;
  }
  // NFC는 현대 완성자 범위에서만 합성되며, 옛한글 자모는 셰이핑 단계에서 합성된다.
  push(core.normalize('NFC'), 'core');
  push(nucleus.slice(1).map(loose).join(''), 'nucleus');
  push(coda.slice(codaStart).map(loose).join(''), 'coda');
  return runs;
}

/** 한 블록의 표시 문자열 (크기 정보 없음). */
export function linearDisplay(block) {
  return linearDisplayRuns(block).map(r => r.text).join('');
}

/** Word-level stress sizes, all relative to the user's base font size.
 *  Only a word containing secondary stress promotes its primary core to 125%.
 *  Tails (50%) and loose consonants (75%) never inherit a stress multiplier. */
export function proportionalDisplayBlocks(blocks) {
  const hasSecondaryStress = blocks.some(block => block.stress === 'secondary');
  return blocks.map(block => ({
    ...block,
    runs: linearDisplayRuns(block).map(run => ({
      ...run,
      scale: run.role !== 'core' ? run.scale
        : block.stress === 'none' ? 0.75
        : block.stress === 'primary' && hasSecondaryStress ? 1.25 : 1,
    })),
  }));
}

export const DISPLAY_PROFILE = 'linear-trial-v4-optical';
