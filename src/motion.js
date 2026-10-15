import {clamp} from './physics.js';
export function wheelAngle(g,orientation=0){
 if(!g||![g.x,g.y,g.z].every(Number.isFinite))return null;
 const magnitude=Math.hypot(g.x,g.y,g.z);if(magnitude<1)return null;
 const a=orientation*Math.PI/180;
 return Math.asin(clamp((g.x*Math.cos(a)-g.y*Math.sin(a))/magnitude,-1,1))*180/Math.PI;
}
export function wheelSteer(raw,zero,sensitivity,invert=false){return clamp((raw-zero)/sensitivity,-1,1)*(invert?-1:1);}
