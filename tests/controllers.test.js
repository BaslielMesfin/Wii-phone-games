import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {EventEmitter} from 'node:events';
import {setTimeout as delay} from 'node:timers/promises';
import WebSocket from '../vendor/ws/wrapper.mjs';
import {attachRelay} from '../scripts/relay.mjs';
import {wheelAngle,wheelSteer} from '../src/motion.js';

test('Tilt maps both landscape orientations, calibration, inversion, and missing sensors',()=>{
 const g={x:-8.4957,y:-4.905,z:0};
 assert.ok(Math.abs(wheelAngle(g,90)-30)<.01);
 assert.ok(Math.abs(wheelAngle({x:8.4957,y:4.905,z:0},270)-30)<.01);
 assert.equal(wheelAngle({x:null,y:0,z:9.8}),null);
 assert.equal(wheelAngle({x:0,y:0,z:0}),null);
 assert.equal(wheelSteer(25,25,30),0);
 assert.equal(wheelSteer(55,25,30),1);
 assert.equal(wheelSteer(55,25,30,true),-1);
 assert.equal(wheelSteer(-90,0,15),-1);
});

test('Relay pairs four controllers, routes inputs privately, rejects fifth and closes links',async()=>{
 const server=http.createServer();const relay=attachRelay(server);server.listen(0,'127.0.0.1');await once(server,'listening');
 const url=`ws://127.0.0.1:${server.address().port}/api/relay`,sockets=[];
 async function client(id){const ws=new WebSocket(url);sockets.push(ws);const messages=[];ws.on('message',raw=>messages.push(JSON.parse(raw)));await once(ws,'open');ws.send(JSON.stringify({type:'register',id}));await until(()=>messages.some(m=>m.type==='open'));return {ws,messages,send:m=>ws.send(JSON.stringify(m))};}
 async function until(check){for(let i=0;i<100;i++){if(check())return;await delay(10);}throw Error('Expected relay event was not received');}
 try{
  const host=await client('apex-pocket-v1-ABCDEFGH'),phones=[];
  for(let i=0;i<4;i++){const phone=await client('phone-'+String(i+1).repeat(20));phone.send({type:'connect',target:'apex-pocket-v1-ABCDEFGH'});await until(()=>phone.messages.some(m=>m.type==='connected'));phones.push(phone);}
  assert.equal(host.messages.filter(m=>m.type==='connection').length,4);
  const fifth=await client('phone-'+ '5'.repeat(20));fifth.send({type:'connect',target:'apex-pocket-v1-ABCDEFGH'});await until(()=>fifth.messages.some(m=>m.error==='room-full'));
  phones[0].send({type:'data',target:'apex-pocket-v1-ABCDEFGH',data:{type:'input',gas:true,steer:.7}});
  await until(()=>host.messages.some(m=>m.type==='data'));assert.equal(host.messages.find(m=>m.type==='data').data.steer,.7);
  assert.ok(phones.slice(1).every(p=>!p.messages.some(m=>m.type==='data')));
  fifth.send({type:'data',target:'apex-pocket-v1-ABCDEFGH',data:{forged:true}});await delay(25);assert.ok(!host.messages.some(m=>m.data?.forged));
  phones[0].ws.close();await until(()=>host.messages.some(m=>m.type==='close'));
  fifth.send({type:'connect',target:'apex-pocket-v1-ABCDEFGH'});await until(()=>fifth.messages.some(m=>m.type==='connected'));
  host.ws.close();await until(()=>fifth.messages.some(m=>m.type==='close'));
 }finally{for(const ws of sockets)ws.terminate();await new Promise(r=>relay.close(r));await new Promise(r=>server.close(r));}
});

test('WebSocket upgrade rejects foreign and malformed Origins',async()=>{
 const server=http.createServer(),relay=attachRelay(server);server.listen(0,'127.0.0.1');await once(server,'listening');
 try{for(const origin of ['https://other.example','invalid-origin']){
  const ws=new WebSocket(`ws://127.0.0.1:${server.address().port}/api/relay`,{origin});
  const [e]=await once(ws,'error');assert.ok(e);ws.terminate();
 }}finally{await new Promise(r=>relay.close(r));await new Promise(r=>server.close(r));}
});

test('Host brakes stale inputs and reconnects the same driver without stale-socket takeover',async()=>{
 const originalFetch=globalThis.fetch;
 globalThis.fetch=async()=>({json:async()=>({transport:'local'})});
 let HostRoom;try{({HostRoom}=await import('../src/network.js'));}finally{globalThis.fetch=originalFetch;}
 const host=Object.assign(Object.create(HostRoom.prototype),{players:[],callbacks:{},capacity:4,running:false});
 class Connection extends EventEmitter{constructor(){super();this.open=true;this.messages=[];}send(m){this.messages.push(m);}close(){this.open=false;this.emit('close');}}
 const first=new Connection();host.accept(first);first.emit('data',{type:'join',token:'persistent-controller',name:'Test',car:'gt'});
 const id=host.players[0].id;first.emit('data',{type:'input',gas:true,steer:2});assert.equal(host.players[0].input.steer,1);
 first.emit('data',{type:'ping',sent:123});assert.deepEqual(first.messages.at(-1),{type:'pong',sent:123});
 host.players[0].last=performance.now()-700;host.tick();assert.deepEqual(host.players[0].input,{gas:false,brake:true,steer:0});assert.equal(host.players[0].connected,false);
 host.running=true;
 const second=new Connection();host.accept(second);second.emit('data',{type:'join',token:'persistent-controller',name:'New name',car:'club'});
 assert.equal(host.players.length,1);assert.equal(host.players[0].id,id);assert.equal(host.players[0].car,'gt');assert.equal(host.players[0].connected,true);
 first.emit('data',{type:'input',gas:true,steer:-1});assert.equal(host.players[0].input.gas,false);
 const sent=first.messages.length;first.emit('data',{type:'ping',sent:456});assert.equal(first.messages.length,sent);
 second.emit('data',{type:'input',gas:true,steer:.5});assert.equal(host.players[0].input.gas,true);
 host.running=false;first.emit('data',{type:'profile',car:'zip',ready:true});assert.equal(host.players[0].car,'gt');
 second.emit('data',{type:'controller',status:{version:2,mode:'tilt',orientation:90,landscape:true,raw:12,zero:3,steer:5,gas:true,brake:true,motionFresh:true,gravity:{x:1,y:2,z:3}}});
 assert.equal(host.players[0].controller.orientation,90);assert.equal(host.players[0].controller.steer,1);assert.equal(host.players[0].controller.brake,true);
 first.emit('data',{type:'controller',status:{orientation:0}});assert.equal(host.players[0].controller.orientation,90);
 second.close();assert.equal(host.players[0].connected,false);assert.equal(host.players[0].input.brake,true);
});
