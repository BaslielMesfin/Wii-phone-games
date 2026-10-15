import {clamp} from './physics.js';
export function wheelAngle(g,orientation=0){
 if(!g||![g.x,g.y,g.z].every(Number.isFinite))return null;
 const magnitude=Math.hypot(g.x,g.y,g.z);if(magnitude<1)return null;
 const a=orientation*Math.PI/180;
 const horizontal=g.x*Math.cos(a)-g.y*Math.sin(a);
 const vertical=g.x*Math.sin(a)+g.y*Math.cos(a);
 // Measure rotation IN the screen plane. Dividing by total gravity made
 // steering depend on how far the screen was tipped toward the player.
 if(Math.hypot(horizontal,vertical)<magnitude*.12)return null;
 return Math.atan2(horizontal,-vertical)*180/Math.PI;
}
export function wheelSteer(raw,zero,sensitivity,invert=false){
 if(![raw,zero,sensitivity].every(Number.isFinite)||sensitivity<=0)return 0;
 const delta=((raw-zero+540)%360+360)%360-180;
 const dead=1.2,limit=clamp(sensitivity,15,50);
 return Math.sign(delta)*clamp((Math.abs(delta)-dead)/(limit-dead),0,1)*(invert?-1:1);
}
export class WheelMotion {
 constructor(){this.reset();}
 reset(){this.gravity=null;this.orientation=null;this.raw=0;this.zero=0;this.last=null;this.sampleTime=null;this.valid=false;this.calibrated=false;this.reason='waiting';}
 sample(g,orientation,now){
  if(!g||![g.x,g.y,g.z,orientation,now].every(Number.isFinite))return false;
  const changed=this.orientation!==orientation;
  if(changed)this.calibrated=false;
  const first=this.gravity===null||changed;
  // One short sensor filter; adding another filter in the render loop delays turns twice.
  const dt=this.sampleTime===null?0:clamp((now-this.sampleTime)/1000,0,.25),alpha=1-Math.exp(-dt/.018);
  this.sampleTime=now;
  this.gravity=first?{x:g.x,y:g.y,z:g.z}:Object.fromEntries(['x','y','z'].map(k=>[k,this.gravity[k]+(g[k]-this.gravity[k])*alpha]));
  this.orientation=orientation;
  const angle=wheelAngle(this.gravity,orientation);
  this.valid=angle!==null;this.reason=this.valid?'ok':'flat';
  if(!this.valid)return false;
  this.raw=angle;if(!this.calibrated){this.zero=angle;this.calibrated=true;}this.last=now;return true;
 }
 fresh(now){return this.valid&&this.last!==null&&now-this.last<=750;}
 calibrate(now){if(!this.fresh(now))return false;this.zero=this.raw;return true;}
 value(sensitivity,invert,now){return this.fresh(now)?wheelSteer(this.raw,this.zero,sensitivity,invert):0;}
}
