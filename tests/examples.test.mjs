import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { convertWord } from '../js/engine.js';
const ex = JSON.parse(fs.readFileSync(new URL('../data/examples.json', import.meta.url)));

// 제2본 맺음말이 증거로 든 다섯 낱말 — RP·GA가 책과 같이 갈려야 한다
const FIVE = { car: ['kɑː', 'kɑɹ'], go: ['ɡəʊ', 'ɡoʊ'], pass: ['pɑːs', 'pæs'], hot: ['hɒt', 'hɑt'], near: ['nɪə', 'nɪɹ'] };
for (const [w, [rp, ga]] of Object.entries(FIVE)) test(`맺음말 예시 ${w}: RP /${rp}/ · GA /${ga}/`, () => {
  assert.equal(ex.rp[w]?.ipa, rp);
  assert.equal(ex.ga[w]?.ipa, ga);
});

// 제2본 §7 대조표의 낱말은 두 모듈 모두 예시로 등록되어 사전(검수 전)으로 떨어지지 않는다
const SEC7 = 'car four here park short farm better water teacher mother go low boat home note pass bath dance ask half hot stop dog long caught square near cure air'.split(' ');
test('제2본 §7 대조표 낱말이 RP·GA 예시에 모두 있다', () => {
  for (const w of SEC7) { assert.ok(ex.rp[w], `rp ${w}`); assert.ok(ex.ga[w], `ga ${w}`); }
});

// 등록된 예시 IPA는 모두 엔진이 해석한다 (미배당 종성을 가진 낱말은 unavailable 이 정답)
const UNAVAILABLE = new Set(['catch', 'bath', 'mouth', 'judge']);   // 종성 /tʃ θ dʒ/ 미배당 (제2본 §16 미결)
for (const accent of ['rp', 'ga']) for (const [w, v] of Object.entries(ex[accent])) test(`example ${accent} ${w} /${v.ipa}/ parses`, () => {
  const r = convertWord(v.ipa, { accent });
  assert.equal(r.source.ipa, v.ipa);
  if (UNAVAILABLE.has(w)) assert.equal(r.serialization.status, 'unavailable');
  else assert.equal(r.serialization.status, 'available', JSON.stringify(r.issues));
});
