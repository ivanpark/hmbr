import test from 'node:test';
import assert from 'node:assert/strict';
import { convertWord } from '../js/engine.js';
import { createConnectedModel, evaluateConnected, recommendedConnections } from '../js/connected.js';

const model = (entries, accent='rp', tokens=[]) => createConnectedModel(entries.map(([spelling,ipa])=>convertWord(ipa,{spelling,accent})),{accent,tokens});
const pick = () => model([['pick','pɪk'],['it','ɪt'],['up','ʌp']]);

test('suggestions are offered without activating any connection; original records remain unchanged',()=>{
  const m=pick(), before=JSON.stringify(m), initial=evaluateConnected(m);
  assert.deepEqual(initial.applied,[]);assert.equal(initial.connected_ipa,'pɪk ɪt ʌp');
  assert.deepEqual(recommendedConnections(m),['link:0','link:1']);
  assert.equal(evaluateConnected(m,{},['link:1']).connected_ipa,'pɪk ɪt‿ʌp');
  assert.equal(evaluateConnected(m,{},['link:0']).connected_ipa,'pɪk‿ɪt ʌp');
  assert.equal(evaluateConnected(m,{},recommendedConnections(m)).connected_ipa,'pɪk‿ɪt‿ʌp');
  assert.equal(evaluateConnected(m,{},[]).connected_ipa,initial.original_ipa);
  assert.equal(JSON.stringify(m),before);
});

test('punctuation pauses block selected connections and users can explicitly remove them',()=>{
  const m=model([['pick','pɪk'],['it','ɪt'],['up','ʌp']],'rp',['pick,”','it','up']);
  assert.equal(evaluateConnected(m,{},['link:0','link:1']).connected_ipa,'pɪk | ɪt‿ʌp');
  assert.deepEqual(recommendedConnections(m),['link:1']);
  assert.equal(evaluateConnected(m,{pauses:[]},['link:0']).connected_ipa,'pɪk‿ɪt ʌp');
});

test('weak form selection changes both IPA and derived HMBR while preserving the original',()=>{
  const m=model([['we','wiː'],['can','kæn'],['play','pleɪ']]);
  const r=evaluateConnected(m,{},['weak:1']);
  assert.equal(r.connected_ipa,'wiː kən pleɪ');
  assert.notEqual(r.records[1].serialization.text,m.records[1].serialization.text);
  assert.equal(r.records[1].source.provenance.original_ipa,'kæn');
  assert.equal(m.records[1].source.ipa,'kæn');
  assert.deepEqual(recommendedConnections(m,{pace:'slow'}),[]);
  assert.deepEqual(recommendedConnections(m),['weak:1']);
  assert.deepEqual(evaluateConnected(m,{emphasis:[1]},['weak:1']).applied,[]);
  assert.deepEqual(evaluateConnected(m,{pauses:[1]},['weak:1']).applied,[]);
});

test('weak forms require a following word; to and the retain their vowel-before-vowel forms',()=>{
  for(const entries of [[['can','kæn']],[['to','tuː'],['eat','iːt']],[['the','ðiː'],['apple','æpəl']]]) {
    assert.equal(evaluateConnected(model(entries)).candidates.some(c=>c.kind==='weak'),false);
  }
  assert.ok(recommendedConnections(model([['to','tuː'],['play','pleɪ']])).includes('weak:0'));
});

test('n to m assimilation is optional normally, recommended fast, and blocked by emphasis or pause',()=>{
  const m=model([['ten','tɛn'],['men','mɛn']]);
  assert.deepEqual(recommendedConnections(m),[]);
  assert.deepEqual(recommendedConnections(m,{pace:'fast'}),['assim:0']);
  const r=evaluateConnected(m,{},['assim:0']);
  assert.equal(r.connected_ipa,'tɛm‿mɛn');
  assert.equal(r.records[0].serialization.status,'available');
  assert.notEqual(r.records[0].serialization.text,m.records[0].serialization.text);
  for(const opts of [{pauses:[0]},{emphasis:[0]},{emphasis:[1]}])assert.deepEqual(evaluateConnected(m,opts,['assim:0']).applied,[]);
});

test('cluster t/d elision requires consonants on both sides and respects emphasis',()=>{
  const m=model([['next','nɛkst'],['day','deɪ']]);
  assert.deepEqual(recommendedConnections(m),[]);
  assert.deepEqual(recommendedConnections(m,{pace:'fast'}),['elision:0']);
  assert.equal(evaluateConnected(m,{},['elision:0']).connected_ipa,'nɛks‿deɪ');
  assert.equal(evaluateConnected(m,{emphasis:[1]},['elision:0']).connected_ipa,'nɛkst deɪ');
  for(const entries of [[['next','nɛkst'],['up','ʌp']],[['get','ɡɛt'],['back','bæk']]]) {
    assert.equal(evaluateConnected(model(entries)).candidates.some(c=>c.kind==='elision'),false);
  }
});

test('RP linking r requires spelling evidence; GA does not acquire a second r',()=>{
  const rp=model([['far','fɑː'],['away','əˈweɪ']]);
  assert.equal(evaluateConnected(rp,{},['r:0']).connected_ipa,'fɑːɹ‿ə.ˈweɪ');
  const ga=model([['far','fɑɹ'],['away','əˈweɪ']],'ga');
  assert.deepEqual(recommendedConnections(ga),['link:0']);
  assert.equal(evaluateConnected(ga,{},recommendedConnections(ga)).connected_ipa,'fɑɹ‿ə.ˈweɪ');
  assert.deepEqual(recommendedConnections(model([['','fɑː'],['','əˈweɪ']])),[]);
  assert.deepEqual(recommendedConnections(model([['law','lɔː'],['and','ænd']])),[]);
});

test('unresolved and IPA-only input cannot trigger guessed weak forms',()=>{
  const m=model([['catch','kætʃ'],['it','ɪt'],['up','ʌp']]);
  assert.deepEqual(recommendedConnections(m),['link:1']);
  assert.equal(evaluateConnected(m).records[0].serialization.status,'unavailable');
  assert.equal(evaluateConnected(model([['','kæn'],['','pleɪ']])).candidates.some(c=>c.kind==='weak'),false);
  assert.deepEqual(evaluateConnected(model([])).applied,[]);
});

test('weak-form and boundary recommendations compose without overwriting the original records',()=>{
  const m=model([['an','æn'],['apple','æpəl']]);
  const choices=recommendedConnections(m);
  assert.deepEqual(choices,['weak:0','link:0']);
  const r=evaluateConnected(m,{},choices);
  assert.equal(r.connected_ipa,'ən‿æ.pəl');assert.equal(r.original_ipa,'æn æ.pəl');
  assert.equal(evaluateConnected(m,{},['link:0']).connected_ipa,'æn‿æ.pəl');
});
