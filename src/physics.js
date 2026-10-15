export const CARS = [
  {id:'club',name:'Club',tag:'THE ALL-ROUNDER',desc:'A little of everything. A lot of fun.',speed:37,accel:19,grip:2.35,color:'#d7f66e',stats:[4,4,4]},
  {id:'zip',name:'Zip',tag:'THE CORNER CARVER',desc:'Light on its feet. First off the line.',speed:33,accel:24,grip:2.8,color:'#ff987c',stats:[3,5,5]},
  {id:'gt',name:'GT',tag:'THE STRAIGHT-LINE HERO',desc:'Big power. Make every straight count.',speed:43,accel:15,grip:1.95,color:'#98caff',stats:[5,3,3]}
];
export const TRACKS = [
  {id:'coast',name:'Coastal Circuit',tag:'SUN. SEA. FULL THROTTLE.',desc:'Wide bends, salty air, and a lighthouse on the horizon.',difficulty:'FLOWING · BEGINNER',color:'#d7f66e',width:15,points:[[0,0],[70,-16],[125,20],[120,95],[55,120],[-5,90],[-85,115],[-135,55],[-110,-20],[-50,-60]]},
  {id:'harbor',name:'Neon Harbor',tag:'OWN THE NIGHT.',desc:'Dockside hairpins, glowing gates, and one very late apex.',difficulty:'TECHNICAL · INTERMEDIATE',color:'#a3a3ff',width:14,points:[[0,0],[65,-35],[130,-15],[140,55],[90,65],[65,115],[-10,125],[-35,70],[-95,80],[-130,20],[-90,-45],[-35,-55]]}
];
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const angleDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export function nearestPoint(track,x,z,hint=null) {
  let best={dist:Infinity,index:0,x:0,z:0,t:0};
  const n=track.samples.length;
  const scan = hint===null ? n : 45;
  for(let k=0;k<scan;k++) {
    const i=hint===null?k:(hint+k-22+n)%n, a=track.samples[i],b=track.samples[(i+1)%n];
    const dx=b.x-a.x,dz=b.z-a.z,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1);
    const px=a.x+t*dx,pz=a.z+t*dz,dist=Math.hypot(x-px,z-pz);
    if(dist<best.dist) best={dist,index:i,x:px,z:pz,t};
  }
  return best;
}
export function createRacer(track,carId,index,name,human=false) {
 const spec=CARS.find(c=>c.id===carId)||CARS[0], s=track.samples.length-8-Math.floor(index/2)*7;
 const p=track.samples[s], next=track.samples[(s+1)%track.samples.length], heading=Math.atan2(next.x-p.x,next.z-p.z),side=index%2===0?-2.7:2.7;
 return {spec,name,human,index,x:p.x+Math.cos(heading)*side,z:p.z-Math.sin(heading)*side,heading,speed:0,velocityHeading:heading,near:s,previous:s,travel:0,lap:0,checkpoints:0,finished:false,finishTime:0,lapStart:0,bestLap:Infinity,boost:0,charge:0,drifting:false,wasDrifting:false,offroad:false,steering:0,wallHit:0,input:{steer:0,gas:false,brake:false}};
}
export function resetRacer(r,track) {
 const p=track.samples[r.near],q=track.samples[(r.near+1)%track.samples.length];
 r.x=p.x;r.z=p.z;r.heading=Math.atan2(q.x-p.x,q.z-p.z);r.velocityHeading=r.heading;r.speed=0;r.boost=0;r.charge=0;
}
export function stepRacer(r,input,dt,track,time) {
 if(r.finished)input={gas:false,brake:true,steer:0};
 const n=track.samples.length, steer=clamp(Number(input.steer)||0,-1,1),gas=input.gas===true,brake=input.brake===true;
 // Human corrections must catch up quickly, especially when counter-steering.
 r.steering += (steer-r.steering)*Math.min(1,dt*(r.human?30:10));
 r.offroad=nearestPoint(track,r.x,r.z,r.near).dist>track.width/2-1;
 r.drifting=gas&&brake&&Math.abs(steer)>.22&&r.speed>9&&!r.offroad;
 if(r.drifting)r.charge=clamp(r.charge+dt*.5,0,1);
 if(r.wasDrifting&&!r.drifting&&r.charge>.22){r.boost=0.7+r.charge*1.4;r.charge=0;}
 if(!r.drifting)r.charge=Math.max(0,r.charge-dt*.35);
 r.wasDrifting=r.drifting;r.boost=Math.max(0,r.boost-dt);r.wallHit=Math.max(0,r.wallHit-dt);
 const max=r.spec.speed*(r.boost>0?1.35:1)*(r.offroad?.48:1);
 r.speed += ((gas?r.spec.accel*(r.boost>0?1.4:1):0)-r.speed*.23-(brake&&!r.drifting?30:0)-(r.drifting?4:0))*dt;
 r.speed=clamp(r.speed,0,max);
 r.heading += -r.steering*r.spec.grip*clamp(r.speed/16,0,1)*(r.drifting?1.25:1)*dt;
 r.velocityHeading+=angleDiff(r.heading,r.velocityHeading)*Math.min(1,dt*(r.drifting?2.7:11));
 r.x+=Math.sin(r.velocityHeading)*r.speed*dt;r.z+=Math.cos(r.velocityHeading)*r.speed*dt;
 let p=nearestPoint(track,r.x,r.z,r.near);r.near=p.index;
 const wall=track.width/2+2;
 if(p.dist>wall){const dx=r.x-p.x,dz=r.z-p.z;r.x=p.x+dx/p.dist*wall;r.z=p.z+dz/p.dist*wall;r.speed*=Math.pow(.15,dt);r.wallHit=.2;}
 // Ordered quarter-track gates prevent shortcuts and reverse finish-line lap farming.
 const gate=Math.floor(r.near/n*4);
 if(gate===(r.checkpoints%4)&&r.checkpoints<12){r.checkpoints++;}
 if(r.previous>n*.85&&r.near<n*.15&&r.checkpoints>=r.lap*4+4){
   r.lap++;const lapTime=time-r.lapStart;r.lapStart=time;
   if(r.lap>1)r.bestLap=Math.min(r.bestLap,lapTime);
   if(r.lap>=3){r.finished=true;r.finishTime=time;}
 }
 let delta=r.near-r.previous;if(delta>n/2)delta-=n;if(delta<-n/2)delta+=n;
 r.travel+=delta;r.previous=r.near;
 // Painted boost strips: two per circuit, only inside the roadway.
 const f=r.near/n;if((Math.abs(f-.2)<.009||Math.abs(f-.65)<.009)&&!r.offroad)r.boost=Math.max(r.boost,.65);
}
export function aiInput(r,track,time) {
 const n=track.samples.length, ahead=(r.near+8+Math.floor(r.speed*.25))%n,p=track.samples[ahead];
 const target=Math.atan2(p.x-r.x,p.z-r.z),error=angleDiff(target,r.heading);
 return {gas:Math.abs(error)<1.2,brake:Math.abs(error)>.68&&r.speed>17,steer:clamp(-error*1.6,-1,1)};
}
export function collideRacers(racers) {
 for(let i=0;i<racers.length;i++)for(let j=i+1;j<racers.length;j++){
 const a=racers[i],b=racers[j],dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz);
 if(d<2.35&&d>.001&&!a.finished&&!b.finished){const push=(2.35-d)*.5; a.x-=dx/d*push;a.z-=dz/d*push;b.x+=dx/d*push;b.z+=dz/d*push; const av=a.speed;a.speed=a.speed*.96+b.speed*.02;b.speed=b.speed*.96+av*.02;}
 }
}
export function standings(racers){return [...racers].sort((a,b)=>a.finished&&b.finished?a.finishTime-b.finishTime:a.finished?-1:b.finished?1:b.travel-a.travel);}
export function formatTime(t){if(!Number.isFinite(t))return '—';return `${Math.floor(t/60)}:${(t%60).toFixed(2).padStart(5,'0')}`;}
