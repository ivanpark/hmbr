import test from 'node:test';
import assert from 'node:assert/strict';
import {loadJSON} from '../js/dict.js';

test('stalled dictionary request times out and a later attempt succeeds', async t => {
  t.mock.timers.enable({apis:['setTimeout']});
  t.mock.method(globalThis,'fetch',(_url,{signal}) => new Promise((_resolve,reject) => {
    signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true});
  }));
  const failure=assert.rejects(loadJSON('../data/timeout-test.json'),/사전 응답이 늦어지고/);
  t.mock.timers.tick(20000);
  await failure;
  globalThis.fetch=async()=>({ok:true,json:async()=>({recovered:true})});
  assert.deepEqual(await loadJSON('../data/timeout-test.json'),{recovered:true});
});

test('concurrent lookups share one request and keep a successful result cached',async t=>{
  let calls=0;
  t.mock.method(globalThis,'fetch',async()=>{calls++;return {ok:true,json:async()=>({ok:true})};});
  const [a,b]=await Promise.all([loadJSON('../data/shared-test.json'),loadJSON('../data/shared-test.json')]);
  assert.deepEqual(a,b);
  await loadJSON('../data/shared-test.json');
  assert.equal(calls,1);
});

test('invalid JSON is evicted so the next request can recover',async t=>{
  let calls=0;
  t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>{if(++calls===1)throw new SyntaxError('Invalid JSON');return {ok:true};}}));
  await assert.rejects(loadJSON('../data/invalid-test.json'),SyntaxError);
  assert.deepEqual(await loadJSON('../data/invalid-test.json'),{ok:true});
});
