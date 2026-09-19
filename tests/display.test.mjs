import test from 'node:test';
import assert from 'node:assert/strict';
import { convertWord } from '../js/engine.js';
import { linearDisplay } from '../js/display.js';

const show = (ipa, accent = 'rp') => convertWord(ipa, { accent }).display.blocks.map(linearDisplay).join('|');

// 제2본 §9.4 — 금지형(팻·벗·부웃ㅌ·타앗ㅋ)이 화면에 나오지 않는다
test('coda /s/ never composes into a Korean 받침 (제2본 §9.4)', () => {
  assert.equal(show('pæs', 'ga'), '패ㅅ');
  assert.equal(show('bʌs'), '버ㅅ');
  assert.equal(show('buːst'), '부우ㅅㅌ');
  assert.equal(show('tɑːsk'), '타아ㅅㅋ');
});
// 제2본 §12 — /t+s/ 복합값 ㅊ도 독립 요소로 보인다
test('coda /t+s/ shows as loose ㅊ (제2본 §6.6·§12)', () => {
  assert.equal(show('kæts'), '캐ㅊ');
});
// 제2본 §6.1·§6.4 — 단일 종성은 합성, 둘째 종성부터는 독립
test('single coda composes; further codas stay loose (제2본 §6)', () => {
  assert.equal(show('hɒt'), '홑');
  assert.equal(show('hɑt', 'ga'), '핱');
  assert.equal(show('bæŋk'), '뱅ㅋ');
  assert.equal(show('mɪlk'), 'ᄆᆝᆯㅋ');
  assert.equal(show('pɪk'), 'ᄑᆝᆿ');
});
// 제2본 §2.3·§7 — 음절핵이 둘이면 종성은 합성하지 않는다
test('two-element nucleus keeps coda loose (제2본 §7.2)', () => {
  assert.equal(show('kɑː'), '카아');
  assert.equal(show('pɑːk'), '파아ㅋ');
  assert.equal(show('ɡoʊ', 'ga'), '고ᄋᆍ');
  assert.equal(show('boʊt', 'ga'), '보ᄋᆍㅌ');
});
// 제2본 §3 spin ㅅᄈᆝᆫ · §7 stop ㅅ톺 — 앞 초성은 독립, 마지막 초성만 합성
test('leading onsets stay loose; last onset composes (제2본 §3·§7)', () => {
  assert.equal(show('stɒp'), 'ㅅ톺');
  assert.equal(show('spɪn'), 'ㅅᄑᆝᆫ');
});
// 표시 규칙은 직렬화를 바꾸지 않는다
test('display rule leaves serialization (NFD) untouched', () => {
  const r = convertWord('pæs', { accent: 'ga' });
  assert.equal(r.serialization.text, '팻');
  assert.equal(linearDisplay(r.display.blocks[0]), '패ㅅ');
});

import { linearDisplayRuns } from '../js/display.js';
import { proportionalDisplayBlocks } from '../js/display.js';
// 크기 — 핵 100% · 뒤 모음 요소 50% (제2본 §14) · 독립 자음 75%
test('display runs carry sizes: core 1 · nucleus tail .5 · loose consonants .75', () => {
  const runs = convertWord('buːst').display.blocks.map(linearDisplayRuns)[0];
  assert.deepEqual(runs.map(r => [r.text, r.role, r.scale]),
    [['부', 'core', 1], ['우', 'nucleus', 0.5], ['ㅅㅌ', 'coda', 0.75]]);
  const stop = convertWord('stɒp').display.blocks.map(linearDisplayRuns)[0];
  assert.deepEqual(stop.map(r => [r.text, r.role, r.scale]), [['ㅅ', 'onset', 0.75], ['톺', 'core', 1]]);
  const car = convertWord('kɑː').display.blocks.map(linearDisplayRuns)[0];
  assert.deepEqual(car.map(r => [r.text, r.scale]), [['카', 1], ['아', 0.5]]);
});

const proportions = ipa => proportionalDisplayBlocks(convertWord(ipa).display.blocks)
  .flatMap(block => block.runs.map(run => run.scale));

test('career and carrier use absolute 100/75/50 sizes without secondary stress', () => {
  assert.deepEqual(proportions('kəˈrɪə'), [0.75, 1, 0.5]);
  assert.deepEqual(proportions('ˈkærɪə'), [1, 0.75, 0.5]);
  assert.deepEqual(proportions('ˈkarɪə'), [1, 0.75, 0.5]);
});

test('125% primary stress requires secondary stress in the same word', () => {
  assert.deepEqual(proportions('ˌɪntəˈnæʃənəl'), [1, 0.75, 1.25, 0.75, 0.75]);
  assert.deepEqual(proportions('ˈbuːst'), [1, 0.5, 0.75]);
  // Explicit syllables exercise both stressed tails and loose consonants.
  assert.deepEqual(proportions('ˌbuːst.əˈbaʊt'), [1, 0.5, 0.75, 0.75, 1.25, 0.5, 0.75]);
});

test('proportional display preserves source blocks and unstated stress', () => {
  const r = convertWord('kəˈrɪə');
  const before = JSON.stringify(r);
  proportionalDisplayBlocks(r.display.blocks);
  assert.equal(JSON.stringify(r), before);
  assert.deepEqual(proportions('buːst'), [1, 0.5, 0.75]);
  assert.deepEqual(proportions('ˌbuːst'), [1, 0.5, 0.75]);
});

// The author's carrier is presentation only, including old-Hangul tails.
test('silent vowel carriers preserve the nucleus and canonical codepoints', () => {
  for (const [ipa, accent, expected] of [
    ['buːst', 'rp', '부우ㅅㅌ'], ['bluː', 'rp', 'ㅂ루우'],
    ['pleɪ', 'rp', 'ㅍ레ᄋᆝ'], ['ɡoʊ', 'ga', '고ᄋᆍ'],
  ]) {
    const result = convertWord(ipa, { accent });
    const before = JSON.stringify(result);
    assert.equal(linearDisplay(result.display.blocks[0]), expected);
    assert.equal(JSON.stringify(result), before);
    assert.equal(result.canonicalModel.blocks.length, 1);
  }
  assert.equal(convertWord('buːst').serialization.text, '부ᅮᆺᇀ');
  assert.deepEqual(linearDisplayRuns({onset:['ᄇ'], nucleus:['ᅮ','ᅮ','ᆞ'], coda:[]})
    .map(r => [r.text,r.scale]), [['부',1],['우',.5],['ᄋᆞ',.5]]);
});
