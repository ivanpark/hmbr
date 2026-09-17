import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {lookup} from '../js/dict.js';
import {convertWord} from '../js/engine.js';
import {proportionalDisplayBlocks} from '../js/display.js';
let failRP=true;
globalThis.fetch=async url=>{
 if(url.pathname.endsWith('dict-rp.json') && failRP){failRP=false;return {ok:false};}
 return {ok:true,json:async()=>JSON.parse(fs.readFileSync(url))};
};
test('document examples have named provenance, not invented dictionary verification',async()=>{
 const result=await lookup('boost play cats','ga');assert.deepEqual(result.missing,[]);assert.equal(result.entries.length,3);assert.ok(result.entries.every(e=>e.provenance.kind==='document-example'));assert.equal(result.entries[0].ipa,'buːst');
});
test('failed dictionary requests can retry; raw dictionary IPA and review status survive',async()=>{
 await assert.rejects(lookup('hello','rp'),/사전 파일/);
 const result=await lookup('hello','rp');assert.equal(result.entries[0].ipa,'hɛˈləʊ');assert.equal(result.entries[0].provenance.review_status,'unreviewed');
});
test('unknown terms remain missing rather than receive guessed pronunciations',async()=>{
 const result=await lookup('boost zznotawordxyz','ga');assert.deepEqual(result.missing,['zznotawordxyz']);assert.equal(result.entries.length,1);
});
test('punctuation and original phrase are retained',async()=>{
 const result=await lookup('“play,” boost!','rp');assert.deepEqual(result.entries.map(e=>e.spelling),['play','boost']);assert.equal(result.source_input,'“play,” boost!');
});

test('RP international lookup retains both stress levels for every spelling case',async()=>{
 const result=await lookup('international International INTERNATIONAL,','rp');
 assert.deepEqual(result.missing,[]);
 for(const entry of result.entries){
  assert.equal(entry.ipa,'ˌɪntəˈnæʃənəl');
  assert.equal(entry.provenance.kind,'dictionary-correction');
  assert.equal(entry.provenance.original_ipa,'ɪntəˈnæʃənəl');
  assert.equal(entry.provenance.reference_ipa,'ˌɪntəˈnæʃnəl');
  assert.equal(entry.provenance.review_scope,'secondary-stress-only');
  assert.equal(entry.provenance.review_status,'unreviewed');
  const record=convertWord(entry.ipa,{accent:'rp',provenance:entry.provenance});
  assert.deepEqual(record.display.blocks.map(b=>b.stress),['secondary','none','primary','none','none']);
  assert.deepEqual(proportionalDisplayBlocks(record.display.blocks).flatMap(b=>b.runs.map(r=>r.scale)),[1,.75,1.25,.75,.75]);
 }
});

test('a stress correction does not change GA or unrelated dictionary entries',async()=>{
 const ga=await lookup('international','ga');
 assert.equal(ga.entries[0].ipa,'ˌɪntəˈnaʃənəl');
 assert.equal(ga.entries[0].provenance.kind,'supplied-dictionary');
 const rp=await lookup('international career','rp');
 assert.equal(rp.entries[1].ipa,'kəˈrɪə');
 assert.equal(rp.entries[1].provenance.kind,'supplied-dictionary');
});
