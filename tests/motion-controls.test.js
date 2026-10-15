import test from 'node:test';
import assert from 'node:assert/strict';
import {wheelAngle,wheelSteer,WheelMotion} from '../src/motion.js';
import {HeldControls,drivingInput} from '../src/controls.js';
import {CARS,createRacer,stepRacer} from '../src/physics.js';
import {makeTrack} from '../src/world.js';
const rad=n=>n*Math.PI/180;
// Rotate an upright screen's gravity into device axes, then incline the screen.
function gravity(turn,pitch,orientation){
 const x=9.81*Math.sin(rad(turn))*Math.cos(rad(pitch)),y=-9.81*Math.cos(rad(turn))*Math.cos(rad(pitch)),a=rad(orientation);
 return {x:x*Math.cos(a)+y*Math.sin(a),y:-x*Math.sin(a)+y*Math.cos(a),z:9.81*Math.sin(rad(pitch))};
}
test('Wheel turns have equal direction/range in both landscapes and all usable grip inclinations',()=>{
 for(const orientation of [0,90,180,270])for(const pitch of [0,30,60,75])for(const turn of [-45,-30,-12,0,12,30,45]){
  const raw=wheelAngle(gravity(turn,pitch,orientation),orientation);
  assert.ok(Math.abs(raw-turn)<1e-8,JSON.stringify({orientation,pitch,turn,raw}));
 }
});
test('Tilting the screen toward/away after calibration cannot steer a centered wheel',()=>{
 for(const orientation of [90,270])for(const turn of [-20,0,20]){
  const zero=wheelAngle(gravity(turn,30,orientation),orientation);
  for(const pitch of [0,45,60,75])assert.equal(wheelSteer(wheelAngle(gravity(turn,pitch,orientation),orientation),zero,30),0);
 }
});
test('Landscape grip still distinguishes both turns when a browser reports portrait angle zero',()=>{
 for(const actualOrientation of [90,270])for(const pitch of [0,45,70]){
  const zero=wheelAngle(gravity(0,pitch,actualOrientation),0);
  for(const turn of [-30,-15,15,30]){
   const input=wheelSteer(wheelAngle(gravity(turn,pitch,actualOrientation),0),zero,30);
   assert.equal(Math.sign(input),Math.sign(turn));
   assert.ok(Math.abs(input)>.4);
  }
 }
});
test('Calibration wraps at 180 degrees, rejects bad sensitivity, and has a small center dead zone',()=>{
 assert.equal(wheelSteer(-179,179,30)>0,true);
 assert.equal(wheelSteer(179,-179,30)<0,true);
 assert.equal(wheelSteer(.8,0,30),0);assert.equal(wheelSteer(0,0,0),0);assert.equal(wheelSteer(NaN,0,30),0);
 assert.equal(wheelSteer(30,0,30),1);assert.equal(wheelSteer(-30,0,30),-1);
});
test('Sensor lifecycle centers on rotation, filters noise, calibrates, and fails safe on missing/flat samples',()=>{
 const wheel=new WheelMotion();assert.equal(wheel.fresh(0),false);assert.equal(wheel.calibrate(0),false);
 wheel.sample(gravity(10,60,90),90,0);assert.equal(wheel.value(30,false,0),0);
 for(let i=1;i<=50;i++)wheel.sample(gravity(30,60,90),90,i*16);
 assert.ok(wheel.value(30,false,800)>.6);assert.ok(wheel.calibrate(800));assert.equal(wheel.value(30,false,800),0);
 wheel.sample(gravity(-15,60,270),270,816);assert.equal(wheel.value(30,false,816),0);
 assert.equal(wheel.fresh(1700),false);assert.equal(wheel.value(30,false,1700),0);
 wheel.reset();assert.equal(wheel.sample({x:0,y:0,z:9.81},90,1800),false);assert.equal(wheel.reason,'flat');
 assert.equal(wheel.sample({x:null,y:0,z:9.81},90,1816),false);
 for(let i=0;i<50;i++)wheel.sample(gravity(5,45,90),90,1900+i*16);
 assert.ok(wheel.fresh(2684));assert.ok(wheel.calibrate(2684));
});
test('Real browser sensor axes are prototype getters, not enumerable own properties',()=>{
 class BrowserAcceleration {
  get x(){return -8.4957;}
  get y(){return -4.905;}
  get z(){return 0;}
 }
 const sample=new BrowserAcceleration();assert.deepEqual(Object.keys(sample),[]);
 const wheel=new WheelMotion();assert.ok(wheel.sample(sample,90,100));assert.ok(wheel.fresh(100));
 assert.ok(Math.abs(wheel.raw-30)<.01);assert.ok(wheel.calibrate(100));assert.equal(wheel.value(30,false,100),0);
 wheel.sample(sample,90,116);assert.ok(wheel.fresh(116));assert.ok(Number.isFinite(wheel.gravity.x));
});
test('Human steering reaches 80% of a wheel correction within 100 ms, including counter-steering',()=>{
 const dt=1/60,track=makeTrack('coast');
 for(const car of CARS)for(const orientation of [90,270]){
  const wheel=new WheelMotion(),r=createRacer(track,car.id,0,'Response test',true);
  wheel.sample(gravity(0,60,orientation),orientation,0);
  let now=0;
  for(const turn of [20,-20,0]){
   const start=r.steering,target=wheelSteer(turn,0,30);
   let reached=null;
   for(let frame=1;frame<=30;frame++){
    now+=dt*1000;wheel.sample(gravity(turn,60,orientation),orientation,now);
    stepRacer(r,{steer:wheel.value(30,false,now)},dt,track,now/1000);
    if(reached===null&&Math.abs(target-r.steering)<=Math.abs(target-start)*.2)reached=frame*dt*1000;
   }
   assert.ok(reached<=100,`${car.id}/${orientation}/${turn}: ${reached} ms`);
   assert.ok(Math.abs(r.steering-target)<.001);
  }
 }
});
test('Small alternating sensor noise stays inside the steering dead zone',()=>{
 const wheel=new WheelMotion();wheel.sample(gravity(0,45,90),90,0);
 for(let i=1;i<=120;i++){
  wheel.sample(gravity(i%2?.8:-.8,45,90),90,i*1000/60);
  assert.equal(Math.abs(wheel.value(30,false,i*1000/60)),0);
 }
});
test('Independent fingers preserve gas/brake through release, cancel, and duplicate lost-capture events',()=>{
 const held=new HeldControls();held.press('gas',11);held.press('brake',22);
 assert.deepEqual(drivingInput(held,{active:true,enabled:true}),{gas:true,brake:true,steer:0});
 held.release('brake',22);held.release('brake',22);assert.ok(held.down('gas'));assert.equal(held.down('brake'),false);
 held.press('gas',33);held.release('gas',11);assert.ok(held.down('gas'));held.release('gas',33);assert.equal(held.down('gas'),false);
 held.press('steer-left',44);held.press('steer-right',55);assert.equal(held.steer,0);held.release('steer-left',44);assert.equal(held.steer,1);
 held.clear();assert.equal(held.steer,0);assert.equal(held.down('gas'),false);
});
test('Holding gas through countdown works at GO; settings, stale sensors, and focus loss suppress driving',()=>{
 const held=new HeldControls();held.press('gas',1);
 assert.equal(drivingInput(held,{active:false,enabled:true}).gas,false);
 assert.equal(drivingInput(held,{active:true,enabled:true}).gas,true);
 assert.deepEqual(drivingInput(held,{active:true,enabled:false,steer:1}),{gas:false,brake:false,steer:0});
 assert.deepEqual(drivingInput(held,{active:true,enabled:true,motionFresh:false,steer:1}),{gas:false,brake:true,steer:0});
 held.clear();assert.equal(drivingInput(held,{active:true,enabled:true}).gas,false);
});
