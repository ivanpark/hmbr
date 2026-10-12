import { HAERYE, ARTICULATION_SOURCE } from './articulation-data.js';
import { isolatedJamoDisplay } from './display.js?v=20261012-haerye';

export { ARTICULATION_SOURCE };

// These five entries extract the tongue/lip position of a vowel component.
// They are explicitly labelled adaptations, rather than quotations for a
// separate phoneme which has no independent card in the published book.
const COMPONENTS = {
  i: { from: 'iː', role: '전설·평순 모음 요소', haerye: '혀 앞을 높이 올리고 입술을 펴며 내는 소리라.' },
  u: { from: 'uː', role: '후설·원순 모음 요소', haerye: '혀 뒤를 높이 올리고 입술을 둥글려 내는 소리라.' },
  e: { from: 'eɪ', role: '전설 모음 요소', haerye: '혀 앞을 중간 높이에 두고 내는 소리라.' },
  a: { from: 'aɪ', role: '저설 모음 요소', haerye: '혀를 낮은 자리에 두고 내는 소리라.' },
  o: { from: 'oʊ', role: '중후설·원순 모음 요소', haerye: '혀 뒤를 중간 높이에 두고 입술을 둥글려 내는 소리라.' },
};

function noteFor(ipa) {
  if (HAERYE[ipa]) return { ...HAERYE[ipa], adapted: false };
  const component = COMPONENTS[ipa];
  if (!component) return null;
  const source = HAERYE[component.from];
  return { role: component.role, haerye: component.haerye, practice: '',
    page: source.page, adapted: true,
    sourceNote: `${source.source_ipa} 해례에서 모음 요소의 혀·입술 위치를 풀어 쓴 설명입니다. 길이와 이동은 입력 IPA를 따릅니다.` };
}

// Reuse the output's loose-jamo shapes. This is a card label, not serialization.
export function isolatedJamo(code) {
  return isolatedJamoDisplay(String.fromCodePoint(Number.parseInt(code, 16)));
}

/** Follow the current engine's mapping units, not a second IPA tokenizer.
 * This preserves /t+s/, normalized /ɚ/, position-specific glyphs and missing
 * allocations. A display-only vowel carrier is never treated as a phoneme. */
export function articulationCards(record) {
  const model = record.canonicalModel;
  const tokens = new Map(model.phonemeTokens.map(t => [t.id, t]));
  const units = new Map(model.mappingUnits.map(u => [u.id, u]));
  const cards = [];
  let cursor = 0;
  model.blocks.forEach((block, index) => {
    const blockTokens = []; let ipa = '';
    while (ipa.length < block.ipa.length && cursor < model.phonemeTokens.length) {
      const token = model.phonemeTokens[cursor++]; blockTokens.push(token); ipa += token.ipa;
    }
    const owned = new Set(blockTokens.map(t => t.id));
    const nucleus = blockTokens.findIndex(t => t.kind === 'nucleus');
    for (const position of ['onset', 'nucleus', 'coda']) {
      const seen = new Set();
      for (const [id] of block[position]) {
        if (seen.has(id)) continue;
        seen.add(id);
        const unit = units.get(id);
        if (!unit.token_ids.length) continue; // silent onset, not a sound
        const sounds = unit.token_ids.map(t => tokens.get(t).ipa);
        const key = unit.rule_id === 'coda-ts' ? 't+s' : sounds[0];
        const note = noteFor(key);
        cards.push({ unit_id: id, key, sounds, syllable: index + 1, position,
          glyphs: unit.codepoints.every(Boolean) && unit.codepoints.length
            ? unit.codepoints.map(isolatedJamo) : [],
          note, unresolved: !unit.codepoints.length || unit.codepoints.some(cp => !cp) });
      }
    }
    // Unresolved nuclei/phones may have no allocated jamo elements. They still
    // retain a mapping unit and deserve an explanation of their current state.
    for (const unit of model.mappingUnits) {
      if (!unit.token_ids.length || unit.jamo_values.length || cards.some(c => c.unit_id === unit.id)) continue;
      const sounds = unit.token_ids.map(t => tokens.get(t).ipa);
      if (!owned.has(unit.token_ids[0])) continue;
      const tokenIndex = blockTokens.findIndex(t => t.id === unit.token_ids[0]);
      cards.push({ unit_id: unit.id, key: sounds[0], sounds, syllable: index + 1,
        position: tokenIndex === nucleus ? 'nucleus' : tokenIndex < nucleus ? 'onset' : 'coda',
        glyphs: [], note: noteFor(sounds[0]), unresolved: true });
    }
  });
  // Mapping units are created in pronunciation order, including empty ones.
  const order = new Map(model.mappingUnits.map((u, i) => [u.id, i]));
  return cards.sort((a, b) => order.get(a.unit_id) - order.get(b.unit_id));
}
