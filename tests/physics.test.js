import test from 'node:test';
import assert from 'node:assert/strict';
import {makeTrack,makeCar} from '../src/world.js';
import {CARS,createRacer,stepRacer,aiInput,collideRacers,nearestPoint,resetRacer,standings} from '../src/physics.js';
for(const id of ['coast','harbor'])for(const car of CARS)test(`${id}: ${car.name} AI completes three legitimate laps`,()=>{
 const track=makeTrack(id),r=createRacer(track,car.id,0,'Test');
 for(let tick=0;tick<60*180&&!r.finished;tick++){
  stepRacer(r,aiInput(r,track,tick/60),1/60,track,tick/60);
  assert.ok(Number.isFinite(r.x)&&Number.isFinite(r.z)&&Number.isFinite(r.speed));
 }
 assert.equal(r.finished,true);assert.equal(r.lap,3);assert.equal(r.checkpoints,12);assert.ok(r.finishTime>30);assert.ok(r.bestLap>10);
});
test('Each map has a closed, nonzero-width driveable ribbon',()=>{
 for(const id of ['coast','harbor']){const t=makeTrack(id);assert.equal(t.samples.length,512);assert.ok(t.length>500);assert.ok(t.width>=14);assert.ok(t.curve.getPointAt(0).distanceTo(t.curve.getPointAt(1))<.001);}
});
test('Each class produces a usable 3D car model',()=>{
 for(const c of CARS){const model=makeCar(c.id);assert.ok(model.children.length>15);assert.ok(model.userData.boost);assert.equal(model.userData.boost.visible,false);}
});
test('Pedal release and brakes reduce speed',()=>{
 const t=makeTrack('coast'),r=createRacer(t,'club',0,'Test');
 for(let i=0;i<120;i++)stepRacer(r,aiInput(r,t,i/60),1/60,t,i/60);
 const speed=r.speed;for(let i=0;i<30;i++)stepRacer(r,{gas:false,brake:true,steer:aiInput(r,t,2+i/60).steer},1/60,t,2+i/60);
 assert.ok(speed>15);assert.ok(r.speed<speed*.6);
});
test('Gas and brake while steering charge a drift; release earns a boost',()=>{
 const t=makeTrack('coast'),r=createRacer(t,'club',0,'Test');r.speed=18;
 for(let i=0;i<36;i++)stepRacer(r,{gas:true,brake:true,steer:.4},1/60,t,i/60);
 assert.ok(r.charge>.22);assert.equal(r.drifting,true);
 stepRacer(r,{gas:true,brake:false,steer:0},1/60,t,.7);assert.ok(r.boost>.7);assert.equal(r.charge,0);
});
test('Repeated finish-line crossings cannot farm laps without checkpoints',()=>{
 const t=makeTrack('coast'),r=createRacer(t,'club',0,'Test');
 for(let i=0;i<10;i++){
  const p=t.samples[0];r.x=p.x;r.z=p.z;r.previous=510;r.near=0;r.speed=0;stepRacer(r,{},1/60,t,i);
 }
 assert.equal(r.lap,0);assert.ok(r.checkpoints<4);assert.equal(r.finished,false);
});
test('Boundary collision contains a car and reset returns it to the circuit',()=>{
 const t=makeTrack('coast'),r=createRacer(t,'club',0,'Test');r.x+=30;r.z+=20;r.speed=25;
 stepRacer(r,{gas:true},1/60,t,0);assert.ok(nearestPoint(t,r.x,r.z).dist<=t.width/2+2.1);
 resetRacer(r,t);assert.ok(nearestPoint(t,r.x,r.z).dist<.01);assert.equal(r.speed,0);
});
test('Kart collisions separate bodies without creating speed',()=>{
 const t=makeTrack('coast'),a=createRacer(t,'club',0,'A'),b=createRacer(t,'gt',1,'B');
 b.x=a.x+1;b.z=a.z;a.speed=20;b.speed=10;collideRacers([a,b]);assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>=2.34);assert.ok(a.speed<=20);assert.ok(b.speed<=20);
});
test('Results rank finished racers by finish time, then distance',()=>{
 const rows=[{name:'A',finished:true,finishTime:70},{name:'B',finished:false,travel:1300},{name:'C',finished:true,finishTime:60}];
 assert.deepEqual(standings(rows).map(r=>r.name),['C','A','B']);
});
