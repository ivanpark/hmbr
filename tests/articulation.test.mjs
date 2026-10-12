import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { convertWord } from '../js/engine.js';
import { CONSONANTS, VOWELS } from '../js/registry.js';
import { articulationCards, isolatedJamo } from '../js/articulation.js';
import { HAERYE, ARTICULATION_SOURCE } from '../js/articulation-data.js';

test('published Book II provides 50 source cards with a page for each original haerye', () => {
  assert.equal(Object.keys(HAERYE).length, 50);
  assert.equal(ARTICULATION_SOURCE.docx_sha256, '77507c7f6b42e9723aa5a33d27c096155b06c3bf3da90017f9f6f50b97bfc47c');
  for (const note of Object.values(HAERYE)) {
    assert.ok(note.haerye.endsWith('.'));
    assert.ok(note.practice);
    assert.ok(note.page >= 39 && note.page <= 53);
  }
  assert.match(HAERYE['θ'].haerye, /혀끝을 윗니 사이 또는 윗니 뒤/);
  assert.match(HAERYE['uː'].haerye, /혀 뒤를 높이 올리고 입술을 둥글려/);
});

test('every supported registry sound has a haerye, with component adaptations labelled', () => {
  for (const [ipa, entry] of Object.entries(CONSONANTS)) {
    const record = convertWord(entry.onset ? ipa+'ə' : 'ə'+ipa);
    const card = articulationCards(record).find(c => c.key === ipa);
    assert.ok(card?.note?.haerye, ipa);
  }
  for (const [ipa, entry] of Object.entries(VOWELS)) {
    const accent = ipa === 'ɔ' ? 'ga' : entry.modules[0];
    const card = articulationCards(convertWord('b'+ipa, { accent })).find(c => c.key === ipa);
    assert.ok(card?.note?.haerye, ipa);
    assert.equal(card.note.adapted, ['a','e','i','o','u'].includes(ipa), ipa);
    if (card.note.adapted) assert.ok(card.note.sourceNote);
  }
});

test('all book examples explain every real mapping unit without changing records', () => {
  const examples = JSON.parse(fs.readFileSync(new URL('../data/examples.json', import.meta.url)));
  for (const accent of ['rp','ga']) for (const entry of Object.values(examples[accent])) {
    const record = convertWord(entry.ipa, { accent });
    const before = JSON.stringify(record);
    const cards = articulationCards(record);
    assert.equal(cards.length, record.canonicalModel.mappingUnits.filter(u => u.token_ids.length).length, entry.ipa);
    assert.equal(new Set(cards.map(c => c.unit_id)).size, cards.length);
    assert.ok(cards.every(c => c.note?.haerye), entry.ipa);
    assert.equal(JSON.stringify(record), before);
  }
});

test('boost has four sounds and one long-vowel card, without an extra silent carrier', () => {
  const record = convertWord('buːst');
  const cards = articulationCards(record);
  assert.deepEqual(cards.map(c => c.key), ['b','uː','s','t']);
  assert.equal(cards[1].glyphs.length, 2);
  assert.deepEqual(cards.map(c => c.position), ['onset','nucleus','coda','coda']);
  assert.equal(record.serialization.text, '부ᅮᆺᇀ');
});

test('cats explains /t+s/ once and catch never invents an allocated coda glyph', () => {
  const cats = articulationCards(convertWord('kæts'));
  assert.deepEqual(cats.map(c => c.key), ['k','æ','t+s']);
  assert.deepEqual(cats[2].sounds, ['t','s']);
  assert.match(cats[2].note.haerye, /두 음소의 차례/);
  const catchRecord = convertWord('kætʃ');
  const last = articulationCards(catchRecord).at(-1);
  assert.equal(last.key, 'tʃ');
  assert.equal(last.unresolved, true);
  assert.deepEqual(last.glyphs, []);
  assert.ok(last.note.haerye);
  assert.equal(catchRecord.serialization.text, null);
});

test('GA normalization and position forms come from the current model', () => {
  const record = convertWord('ˈwɔtɚ', { accent:'ga' });
  const cards = articulationCards(record);
  assert.deepEqual(cards.slice(-2).map(c => c.key), ['ə','ɹ']);
  assert.ok(cards.at(-1).glyphs[0].includes('ퟛ'));
  assert.ok(articulationCards(convertWord('ɹɛd'))[0].glyphs[0].includes('ꥶ'));
  assert.equal(record.source.ipa, 'ˈwɔtɚ');
});

test('unallocated nuclei remain in the right syllable even when a sound repeats', () => {
  const record = convertWord('ɝ.ˈbɝd', { accent:'ga' });
  const cards = articulationCards(record);
  assert.deepEqual(cards.map(c => [c.key,c.syllable]), [['ɝ',1],['b',2],['ɝ',2],['d',2]]);
  for (const c of cards.filter(c => c.key === 'ɝ')) {
    assert.equal(c.note, null); assert.equal(c.unresolved, true); assert.deepEqual(c.glyphs, []);
  }
});

test('zero onsets are silent and card display never changes saved text', () => {
  const record = convertWord('ə.ˈbaʊt');
  const text = record.serialization.text;
  assert.deepEqual(articulationCards(record).map(c => [c.key,c.syllable]), [['ə',1],['b',2],['aʊ',2],['t',2]]);
  assert.equal(isolatedJamo('1145'), 'ᅅ');
  assert.equal(isolatedJamo('119D'), 'ᆝ');
  assert.equal(isolatedJamo('D7DB'), 'ퟛ');
  assert.equal(isolatedJamo('11C0'), 'ㅌ');
  assert.equal(record.serialization.text, text);
  assert.ok(!/[ᅟᅠ]/.test(text));
});
