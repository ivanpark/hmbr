import test from 'node:test';
import assert from 'node:assert/strict';
import {convertWord} from '../js/engine.js';
import {createConnectedModel,evaluateConnected,recommendedConnections} from '../js/connected.js';
const model=(entries,accent='ga')=>createConnectedModel(entries.map(([spelling,ipa])=>convertWord(ipa,{spelling,accent})),{accent});
const candidate=(m,kind,opts={})=>evaluateConnected(m,opts).candidates.find(c=>c.kind===kind);

test('GA button uses a separate surface annotation and never invents HMBR glyphs',()=>{
 const m=model([['button','ˈbʌtən']]),before=JSON.stringify(m),c=candidate(m,'glottal');
 assert.ok(c);assert.deepEqual(evaluateConnected(m).applied,[]);
 const r=evaluateConnected(m,{},[c.id]);
 assert.equal(r.connected_ipa,'ˈbʌ.ʔn̩');
 assert.equal(r.records[0],m.records[0]);
 assert.equal(r.surface_records[0].display_status,'broad-reference');
 assert.equal(r.surface_annotations[0].underlying_ipa,'tən');
 assert.ok(r.surface_annotations[0].token_ids.every(id=>m.records[0].canonicalModel.phonemeTokens.some(t=>t.id===id)));
 assert.equal(JSON.stringify(m),before);assert.deepEqual(recommendedConnections(m),[c.id]);
 assert.deepEqual(recommendedConnections(m,{pace:'slow'}),[]);
 assert.equal(candidate(model([['button','ˈbʌtən']],'rp'),'glottal'),undefined);
});

test('n t deletion is optional before an unstressed vowel and creates derived HMBR',()=>{
 const m=model([['winter','ˈwɪntəɹ']]),c=candidate(m,'ntdrop');
 assert.ok(c);assert.deepEqual(recommendedConnections(m),[]);
 assert.deepEqual(recommendedConnections(m,{pace:'fast'}),[c.id]);
 const r=evaluateConnected(m,{},[c.id]);assert.equal(r.connected_ipa,'ˈwɪn.əɹ');
 assert.notEqual(r.records[0].serialization.text,m.records[0].serialization.text);
 assert.deepEqual(evaluateConnected(m,{emphasis:[0]},[c.id]).applied,[]);
 for(const ipa of ['wɪnˈtɛɹ','wɪntəɹ','ˈmɑntən'])assert.equal(candidate(model([['test',ipa]]),'ntdrop'),undefined);
});

test('preconsonantal glottal and unreleased t are distinct and last selection wins',()=>{
 const m=model([['get','ɡɛt'],['me','miː']]),g=candidate(m,'glottal'),u=candidate(m,'unreleased');
 assert.ok(g&&u);assert.deepEqual(recommendedConnections(m),[g.id]);
 assert.equal(evaluateConnected(m,{},[u.id,g.id]).connected_ipa,'ɡɛʔ‿miː');
 assert.equal(evaluateConnected(m,{},[g.id,u.id]).connected_ipa,'ɡɛt̚‿miː');
 assert.deepEqual(evaluateConnected(m,{},[g.id,u.id]).applied,[u.id]);
 assert.deepEqual(recommendedConnections(m,{emphasis:[0]}),[]);
 assert.equal(candidate(model([['get','ɡɛt'],['up','ʌp']]),'glottal'),undefined);
});

test('a pause stops connections but allows manual phrase-final t variants',()=>{
 const m=model([['get','ɡɛt'],['me','miː']]),g=candidate(m,'glottal',{pauses:[0]});
 assert.ok(g);assert.deepEqual(recommendedConnections(m,{pauses:[0],pace:'fast'}),[]);
 assert.equal(evaluateConnected(m,{pauses:[0]},[g.id]).connected_ipa,'ɡɛʔ | miː');
 assert.ok(candidate(model([['get','ɡɛt']]),'unreleased'));
});

test('cluster deletion competes with glottalisation at the same underlying t',()=>{
 const m=model([['want','wɑnt'],['more','mɔɹ']]),g=candidate(m,'glottal');
 assert.ok(g);const ids=recommendedConnections(m,{pace:'fast'});
 assert.deepEqual(ids,[g.id]);
 assert.equal(evaluateConnected(m,{},[g.id,'elision:0']).connected_ipa,'wɑn‿mɔɹ');
 assert.equal(evaluateConnected(m,{},['elision:0',g.id]).connected_ipa,'wɑnʔ‿mɔɹ');
});

test('internal t annotations compose across words without changing originals',()=>{
 const m=model([['winter','ˈwɪntəɹ'],['button','ˈbʌtən']]),before=JSON.stringify(m);
 const r=evaluateConnected(m,{pace:'fast'},recommendedConnections(m,{pace:'fast'}));
 assert.equal(r.surface_annotations.length,2);assert.equal(r.connected_ipa,'ˈwɪn.əɹ ˈbʌ.ʔn̩');
 assert.equal(JSON.stringify(m),before);
 assert.equal(candidate(model([['water','ˈwɔtəɹ']]),'glottal'),undefined);
 // An affricate's t must never consume the offset of a later /t/ token.
 const affricate=model([['chat','tʃæt']]),u=candidate(affricate,'unreleased');
 assert.equal(evaluateConnected(affricate,{},[u.id]).connected_ipa,'tʃæt̚');
 const overlap=model([['button','ˈbʌtən'],['man','mæn']]),g=candidate(overlap,'glottal');
 const compared=evaluateConnected(overlap,{pace:'fast'},[g.id,'assim:0']);
 assert.deepEqual(compared.applied,[g.id]);
 assert.equal(compared.records[0],overlap.records[0]);
 assert.ok(compared.candidates.find(c=>c.id==='assim:0').blocked);
});
