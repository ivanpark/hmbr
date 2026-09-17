import test from 'node:test';
import assert from 'node:assert/strict';
import { inkBox, displayUnits } from '../js/optical.js';
import { convertWord } from '../js/engine.js';
import { proportionalDisplayBlocks } from '../js/display.js';

test('boost keeps its loose consonants at native 75% font size without enlargement', () => {
  // Actual shipped-font bounds read from the live boost SVGs on 2026-09-17.
  // Consonants must not be inflated to 36px ink height. At font size 36px,
  // these glyphs naturally have ink heights of about 18px.
  const bounds = new Map([
    ['부', [15.625, -812.5, 921.875, 937.5]],
    ['ㅜ', [15.625, -406.25, 921.875, 531.25]],
    ['ㅅ', [109.375, -609.375, 734.375, 515.625]],
    ['ㅌ', [125, -593.75, 671.875, 484.375]],
  ]);
  const heights = proportionalDisplayBlocks(convertWord('buːst').display.blocks)
    .flatMap(b => b.runs).flatMap(run => displayUnits(run).map(text => {
      const [x, y, width, height] = bounds.get(text);
      const box = inkBox({ actualBoundingBoxLeft: -x, actualBoundingBoxRight: x + width,
        actualBoundingBoxAscent: -y, actualBoundingBoxDescent: y + height }, run.role);
      return box.heightEm * run.scale * 48;
    }));
  assert.deepEqual(heights, [48, 24, 18.5625, 17.4375]);
});

test('onsets and codas use natural font geometry while vowels keep optical sizing', () => {
  const metrics = { actualBoundingBoxLeft: -125, actualBoundingBoxRight: 796.875,
    actualBoundingBoxAscent: 593.75, actualBoundingBoxDescent: -109.375 };
  for (const role of ['onset', 'coda']) {
    const box = inkBox(metrics, role);
    assert.equal(box.widthEm, 0.671875);
    assert.equal(box.heightEm, 0.484375);
  }
  for (const role of ['core', 'nucleus']) assert.equal(inkBox(metrics, role).heightEm, 1);
});

test('visible sizing removes font whitespace and preserves each shape', () => {
  // A tiny low dot, a tall core and a flat vowel share a unit visible height.
  // Wider glyphs retain their natural aspect ratio instead of being shrunk.
  for (const [left, ascent, right, descent] of [
    [-400, 90, 540, 20], [-50, 900, 760, 70], [-70, 300, 920, -230],
  ]) {
    const b = inkBox({ actualBoundingBoxLeft: left, actualBoundingBoxAscent: ascent,
      actualBoundingBoxRight: right, actualBoundingBoxDescent: descent });
    assert.equal(b.x, -left);
    assert.equal(b.y, -ascent);
    assert.equal(b.heightEm, 1);
    assert.ok(Math.abs(b.widthEm / b.heightEm - b.width / b.height) < 1e-12);
    for (const proportion of [1, .75, .5, 1.25]) {
      assert.equal(b.heightEm * 48 * proportion, 48 * proportion);
    }
  }
});

test('composed old Hangul stays together while loose consonants size independently', () => {
  const runs = ipa => proportionalDisplayBlocks(convertWord(ipa).display.blocks)
    .flatMap(b => b.runs).flatMap(r => displayUnits(r).map(text => [text, r.scale]));
  assert.deepEqual(runs('kəˈrɪə'), [['ᄏᆞ', .75], ['ꥶᆝ', 1], ['ᆞ', .5]]);
  assert.deepEqual(runs('ˈkærɪə'), [['캐', 1], ['ꥶᆝ', .75], ['ᆞ', .5]]);
  assert.deepEqual(runs('buːst'), [['부', 1], ['ㅜ', .5], ['ㅅ', .75], ['ㅌ', .75]]);
});

test('unavailable ink measurements fail instead of displaying NaN or fallback proportions', () => {
  assert.throws(() => inkBox({}), /측정/);
  assert.throws(() => inkBox({ actualBoundingBoxLeft: 0, actualBoundingBoxRight: 0,
    actualBoundingBoxAscent: 0, actualBoundingBoxDescent: 0 }), /측정/);
});
