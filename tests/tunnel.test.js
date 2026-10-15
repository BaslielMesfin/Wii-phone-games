import test from 'node:test';
import assert from 'node:assert/strict';
import {TunnelOutput} from '../scripts/tunnel-state.mjs';
const event=url=>JSON.stringify({type:'v1.tcpip_forward.register.accepted',data:`tunneled with tls termination, ${url}\r\nQR omitted`})+'\n';
test('HTTPS renewal announces each new live address and ignores duplicate registration',()=>{
 const addresses=[],output=new TunnelOutput(url=>addresses.push(url));
 output.push('Welcome to localhost.run!\n');output.push(event('https://first-test.lhr.life'));
 output.push(event('https://first-test.lhr.life'));output.push(event('https://renewed-test.lhr.life'));
 assert.deepEqual(addresses,['https://first-test.lhr.life','https://renewed-test.lhr.life']);
});
test('Split SSH JSON chunks and independent stderr banners cannot corrupt the invite',()=>{
 const addresses=[],messages=[],stdout=new TunnelOutput(url=>addresses.push(url)),stderr=new TunnelOutput(url=>addresses.push(url),m=>messages.push(m));
 const line=event('https://chunk-test.localhost.run');stdout.push(line.slice(0,34));stderr.push('ssh: Connection reset\n');stdout.push(line.slice(34));
 assert.deepEqual(addresses,['https://chunk-test.localhost.run']);assert.equal(messages.length,1);
 stdout.push('{not valid json}\n');stdout.push(event('https://bad.example.com'));
 assert.equal(addresses.length,1);
});
