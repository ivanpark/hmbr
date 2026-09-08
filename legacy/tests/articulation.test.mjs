/**
 * Articulation panel tests. Run: node tests/articulation.test.mjs
 * Asserts that the required note keys appear for each word's IPA.
 */
import { articulationKeys, articulationCards, NOTES } from '../js/articulation.js';

const cases = [
  // [word, ipa, keys that MUST appear, keys that must NOT appear]
  ['feel',    'fiːl',        ['f', 'iː', 'lFinal'],        ['l']],
  ['fill',    'fɪl',         ['f', 'ɪ', 'lFinal'],         ['iː']],
  ['teacher', 'ˈtiːtʃər',    ['iː', 'tʃ', 'ər'],           ['r']],
  ['beauty',  'ˈbjuːti',     ['j', 'uː'],                  []],
  ['year',    'jɪə',         ['j', 'ɪə'],                  []],   // RP centering diphthong
  ['year-GA', 'jɪr',         ['j', 'ɪ', 'r'],              []],
  ['bird',    'bɜːd',        ['ɜː'],                       ['ər']],  // RP: long central vowel, no rhotic colouring
  ['bird-GA', 'bɜrd',        ['ər'],                       []],
  ['world',   'wɜrld',       ['ər', 'lFinal'],             []],   // final l before d? see note
  ['thin',    'θɪn',         ['θ', 'ɪ'],                   ['ð']],
  ['this',    'ðɪs',         ['ð', 'ɪ'],                   ['θ']],
  ['very',    'ˈvɛri',       ['v', 'r'],                   []],
  ['five',    'faɪv',        ['f', 'aɪ', 'v'],             []],
];

let pass = 0, fail = 0;
for (const [word, ipa, must, mustNot] of cases) {
  const { keys } = articulationKeys(ipa);
  const missing = must.filter((k) => !keys.includes(k));
  const wrong = mustNot.filter((k) => keys.includes(k));
  const ok = missing.length === 0 && wrong.length === 0;
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${word.padEnd(8)} /${ipa}/ → [${keys.join(', ')}]`);
  if (missing.length) console.log(`        missing: ${missing.join(', ')}`);
  if (wrong.length) console.log(`        unexpected: ${wrong.join(', ')}`);
}

// Every card must have all four learner-facing fields.
let bad = 0;
for (const [word, ipa] of cases) {
  for (const c of articulationCards(ipa)) {
    for (const f of ['role', 'instruction', 'warning', 'ipa']) {
      if (!c[f]) { console.log(`FAIL  card field "${f}" empty for ${c.key} (${word})`); bad++; }
    }
  }
}
if (!bad) { console.log('PASS  all cards carry role/instruction/warning/ipa'); pass++; } else fail += bad;

// Prosody card appears when stress or length present.
import('../js/articulation.js').then(() => {});
const withStress = articulationCards('ˈtiːtʃər');
const prosody = withStress.some((c) => c.key === 'prosody');
console.log(`${prosody ? 'PASS' : 'FAIL'}  prosody card present for stressed word`);
prosody ? pass++ : fail++;

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
