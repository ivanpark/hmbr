import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { convertWord, convertPhrase, validateModel, parseCanonical } from '../js/engine.js';
const vectors=JSON.parse(fs.readFileSync(new URL('./book3-vectors.json',import.meta.url)));
for(const [word,module,ipa,codes] of vectors)for(const accent of module.includes('·')?['rp','ga']:[module.toLowerCase()])test(`Book III: ${word} ${accent}`,()=>{
 const r=convertWord(ipa,{accent});
 const expected=String.fromCodePoint(...codes.replaceAll('|','').trim().split(/\s+/).map(x=>parseInt(x,16)));
 assert.equal(r.serialization.text,expected);
 assert.equal(r.serialization.status,'available');
 assert.equal(r.serialization.text.normalize('NFC').normalize('NFD'),expected);
 assert.equal(parseCanonical(expected).length,r.canonicalModel.blocks.length);
 assert.equal(validateModel(r.canonicalModel),true);
 assert.equal(r.source.ipa,ipa);
});
test('one /uː/ token maps to two JV-U elements',()=>{
 const m=convertWord('buːst').canonicalModel;const t=m.phonemeTokens.filter(t=>t.ipa==='uː');assert.equal(t.length,1);
 const unit=m.mappingUnits.find(u=>u.token_ids.includes(t[0].id));assert.deepEqual(unit.jamo_values,['JV-U','JV-U']);
});
test('/t+s/ consumes two tokens once; /tʃ/ is a different phoneme',()=>{
 const m=convertWord('kæts').canonicalModel;const u=m.mappingUnits.find(u=>u.rule_id==='coda-ts');assert.equal(u.token_ids.length,2);assert.deepEqual(u.jamo_values,['JV-TS']);
 const ch=convertWord('kætʃ');assert.equal(ch.serialization.text,null);assert.equal(ch.canonicalModel.phonemeTokens.at(-1).ipa,'tʃ');
});
for(const c of ['θ','ð','ʒ','tʃ','dʒ'])test(`missing coda /${c}/ preserves structure; no complete text`,()=>{
 const r=convertWord('æ'+c);assert.equal(r.serialization.status,'unavailable');assert.equal(r.serialization.text,null);assert.equal(r.canonicalModel.phonemeTokens.at(-1).ipa,c);assert.ok(r.canonicalModel.blocks[0].coda.length);assert.ok(r.issues.some(e=>e.code==='E-POSITION'));validateModel(r.canonicalModel);
});
test('unresolved GA /ɝ/ is not replaced with a guessed vowel',()=>{
 const r=convertWord('nɝs',{accent:'ga'});assert.equal(r.source.ipa,'nɝs');assert.equal(r.normalized_ipa,null);assert.equal(r.serialization.text,null);assert.ok(r.canonicalModel.phonemeTokens.some(t=>t.ipa==='ɝ'));
});
test('GA /ɚ/ normalization retains source and a rule log',()=>{
 const r=convertWord('ˈwɔ.tɚ',{accent:'ga'});assert.equal(r.source.ipa,'ˈwɔ.tɚ');assert.ok(r.normalization_rules.some(x=>x.rule_id==='ga-schwa-r'));assert.equal(r.serialization.status,'available');assert.ok(r.normalized_ipa.includes('təɹ'));
});
for(const ipa of ['n̩','l̩','m̩'])test(`syllabic ${ipa}: no epenthetic vowel`,()=>{
 const r=convertWord(ipa);assert.equal(r.serialization.text,null);assert.ok(r.canonicalModel.phonemeTokens.some(t=>t.syllabic));assert.ok(r.issues.some(e=>e.code==='E-SYLLABIC'));validateModel(r.canonicalModel);
});
test('intervocalic and initial /l/ are not duplicated',()=>{
 for(const ipa of ['pleɪ','bluː','həˈləʊ','hə.ləʊ']){const r=convertWord(ipa);assert.equal(r.canonicalModel.mappingUnits.flatMap(u=>u.jamo_values).filter(v=>v==='JV-L').length,1);}
});
test('FOOT is not the repeated U nucleus; GA AW is not RP O O',()=>{
 assert.notEqual(convertWord('ʊ').serialization.text,convertWord('uː').serialization.text);
 assert.notEqual(convertWord('ɔ',{accent:'ga'}).serialization.text,convertWord('ɔː',{accent:'rp'}).serialization.text);
});
test('source stress survives in model but not plain text',()=>{
 const a=convertWord('ˈpɪk'),b=convertWord('pɪk');assert.equal(a.serialization.text,b.serialization.text);assert.equal(a.canonicalModel.blocks[0].stress,'primary');assert.equal(b.canonicalModel.blocks[0].stress,'unknown');
});
test('explicit syllable boundary overrides inferred boundary; /t+s/ never crosses it',()=>{
 assert.equal(convertWord('æt.sə').canonicalModel.mappingUnits.some(u=>u.rule_id==='coda-ts'),false);
 const r=convertWord('ɛk.strə');assert.deepEqual(r.canonicalModel.blocks.map(b=>b.ipa),['ɛk','stɹə']);assert.equal(r.analysis.syllabification,'source-boundaries');
});
test('multi-vowel syllabification is visibly inferred',()=>{
 const r=convertWord('vɛɹi');assert.equal(r.analysis.status,'review-needed');assert.ok(r.warnings.some(e=>e.code==='W-SYLLABLE-INFERRED'));
});
test('module-specific vowels are not silently coerced',()=>{
 assert.equal(convertWord('ɡəʊ',{accent:'ga'}).serialization.text,null);assert.equal(convertWord('ɡoʊ',{accent:'rp'}).serialization.text,null);
});
test('unsupported input and diacritics block complete serialization',()=>{
 for(const s of ['pʰɪk','[pɪk]','kʔ','x','pɪk!','ˈ','pɪk.','.pɪk']) assert.equal(convertWord(s).serialization.text,null,s);
});
test('invalid canonical sequences reject fillers, compatibility letters and wrong order',()=>{
 for(const s of ['\u115f\u1160','ㅍㅣㅋ','\u1111\u11c0','\u1111\u1161\u11c0\u1161'])assert.throws(()=>parseCanonical(s),/E-(CHAR|ORDER)/);
});
test('reference and coverage guards reject broken structured records',()=>{
 const source=convertWord('buːst').canonicalModel;
 const a=structuredClone(source);a.blocks[0].nucleus[0]=['absent',0];assert.throws(()=>validateModel(a),/E-REFERENCE/);
 const b=structuredClone(source);b.mappingUnits[1].token_ids.push('t1');assert.throws(()=>validateModel(b),/E-COVERAGE/);
 const c=structuredClone(source);c.blocks[0].onset.push(c.blocks[0].onset[0]);assert.throws(()=>validateModel(c),/E-COVERAGE/);
});
test('phrase export is an ordered record array with original input',()=>{
 const source='/pɪk kætʃ/';const r=convertPhrase(source);assert.equal(r.source_input,source);assert.equal(r.records.length,2);assert.equal(r.records[0].serialization.status,'available');assert.equal(r.records[1].serialization.status,'unavailable');
});
test('bounded input and unsupported modules fail early',()=>{
 assert.throws(()=>convertWord('a'.repeat(1001)));assert.throws(()=>convertPhrase('a '.repeat(101)));assert.throws(()=>convertWord('pɪk',{accent:'xx'}));
});
