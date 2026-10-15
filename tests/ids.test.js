import test from 'node:test';
import assert from 'node:assert/strict';
import {randomId} from '../src/ids.js';
test('Reconnect tokens work without the secure-context randomUUID API',()=>{
 const native=crypto.randomUUID;
 try{
  crypto.randomUUID=undefined;
  const tokens=Array.from({length:100},()=>randomId());
  assert.equal(new Set(tokens).size,100);
  assert.ok(tokens.every(t=>/^[a-f0-9]{32}$/.test(t)));
 }finally{crypto.randomUUID=native;}
});
