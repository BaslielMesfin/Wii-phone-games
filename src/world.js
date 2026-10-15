import * as THREE from '../vendor/three.module.js';
import {TRACKS,CARS,clamp} from './physics.js';
const Y=new THREE.Vector3(0,1,0);
const mats=new Map();
function mat(color,extra={}){const key=color+JSON.stringify(extra);if(!mats.has(key))mats.set(key,new THREE.MeshStandardMaterial({color,roughness:.78,...extra}));return mats.get(key);}
function box(parent,w,h,d,color,x=0,y=0,z=0,extra={}){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color,extra));m.position.set(x,y,z);parent.add(m);return m;}
function cylinder(parent,r1,r2,h,color,x,y,z,sides=8){const m=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,sides),mat(color));m.position.set(x,y,z);parent.add(m);return m;}
function seeded(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
export function makeTrack(id){const def=TRACKS.find(t=>t.id===id)||TRACKS[0];const curve=new THREE.CatmullRomCurve3(def.points.map(([x,z])=>new THREE.Vector3(x,0,z)),true,'catmullrom',.35);return {...def,curve,samples:Array.from({length:512},(_,i)=>curve.getPointAt(i/512)),length:curve.getLength()};}
function ribbon(track,width,y,color,offset=0){const positions=[],indices=[];const n=track.samples.length;
 for(let i=0;i<=n;i++){const p=track.samples[i%n],q=track.samples[(i+1)%n],t=new THREE.Vector3().subVectors(q,p).normalize(),normal=new THREE.Vector3(t.z,0,-t.x);for(const side of [-1,1])positions.push(p.x+normal.x*(offset+side*width/2),y,p.z+normal.z*(offset+side*width/2));if(i<n){let k=i*2;indices.push(k,k+2,k+1,k+1,k+2,k+3);}}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();const m=new THREE.Mesh(geo,mat(color,{side:THREE.DoubleSide}));return m;}
export function makeCar(carId,colorOverride){const spec=CARS.find(c=>c.id===carId)||CARS[0],color=colorOverride||spec.color,g=new THREE.Group();
 const gt=spec.id==='gt',zip=spec.id==='zip';
 box(g,gt?1.85:1.65,.38,gt?3.2:2.8,'#172329',0,.62,0);
 box(g,gt?1.92:1.7,.52,gt?2.85:zip?2.15:2.5,color,0,.98,gt?0:.1);
 box(g,1.22,.55,1.12,color,0,1.4,-.25);
 box(g,1.25,.42,.07,'#163841',0,1.47,.33,{metalness:.3,roughness:.15});
 box(g,1.25,.4,.07,'#163841',0,1.47,-.85);
 box(g,.6,.025,2.6,'#faf6e9',0,1.255,.15);
 box(g,1.2,.035,.75,color,0,1.69,-.25);
 if(gt||zip){box(g,2.15,.12,.42,'#202d35',0,1.44,-1.38);box(g,.12,.5,.12,'#202d35',-.65,1.19,-1.38);box(g,.12,.5,.12,'#202d35',.65,1.19,-1.38);}
 for(const x of [-.92,.92])for(const z of [-.92,.91]){
 const wheel=cylinder(g,.4,.4,.28,'#172027',x,.47,z,12);wheel.rotation.z=Math.PI/2;
 const hub=cylinder(g,.22,.22,.3,'#a9b4ad',x,.47,z,8);hub.rotation.z=Math.PI/2;
 }
 for(const x of [-.56,.56]){box(g,.34,.18,.07,'#fff6c1',x,1,gt?1.46:1.36,{emissive:'#fff0b2',emissiveIntensity:.4});box(g,.34,.14,.07,'#f96765',x,.97,gt?-1.45:-1.26,{emissive:'#f44336',emissiveIntensity:.4});}
 const shadow=new THREE.Mesh(new THREE.CircleGeometry(1.9,24),new THREE.MeshBasicMaterial({color:'#061b1d',transparent:true,opacity:.22,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.scale.y=.65;shadow.position.y=.04;g.add(shadow);
 const glow=new THREE.Mesh(new THREE.ConeGeometry(.35,1.8,6),new THREE.MeshBasicMaterial({color:'#a4e7ff'}));glow.rotation.x=-Math.PI/2;glow.position.set(0,.6,-2);glow.visible=false;g.add(glow);g.userData.boost=glow;return g;}
export class World {
 constructor(container){
  this.container=container;this.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.6));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.setClearColor('#c1e4df');this.renderer.domElement.id='world';container.prepend(this.renderer.domElement);
  this.scene=new THREE.Scene();this.menuCamera=new THREE.PerspectiveCamera(42,1,.1,900);this.cameras=[];this.models=[];this.target=new THREE.Vector3();this.resize();window.addEventListener('resize',()=>this.resize());this.setTrack('coast');
 }
 resize(){this.w=window.innerWidth;this.h=window.innerHeight;this.renderer.setSize(this.w,this.h);this.menuCamera.aspect=this.w/this.h;this.menuCamera.updateProjectionMatrix();}
 setTrack(id){
  this.track=makeTrack(id);while(this.scene.children.length){const child=this.scene.children[0];this.scene.remove(child);child.traverse(n=>n.geometry?.dispose());}
  const night=id==='harbor';this.night=night;
  this.scene.background=new THREE.Color(night?'#111c32':'#bbdfdc');this.scene.fog=new THREE.Fog(night?'#111c32':'#bbdfdc',150,450);
  this.scene.add(new THREE.HemisphereLight(night?'#b5c9ff':'#fffae6',night?'#243148':'#688f79',night?2:2.7));const sun=new THREE.DirectionalLight(night?'#a2baff':'#fff0cd',night?1.5:2.6);sun.position.set(90,150,50);this.scene.add(sun);
  if(night)box(this.scene,700,2,700,'#253549',0,-1.2,0);
  this.scene.add(ribbon(this.track,this.track.width+5,-.1,night?'#3a4660':'#acb694'));
  this.scene.add(ribbon(this.track,this.track.width,.01,night?'#323e53':'#647675'));
  this.scene.add(ribbon(this.track,.16,.04,night?'#a5b4cc':'#f4ebd0',-this.track.width/2+.3));this.scene.add(ribbon(this.track,.16,.04,night?'#a5b4cc':'#f4ebd0',this.track.width/2-.3));
  const dummy=new THREE.Object3D();
  for(const side of [-1,1]){
   const curbA=new THREE.InstancedMesh(new THREE.BoxGeometry(.9,.2,1.55),mat(night?'#9b83ff':'#e97d61'),256),curbB=new THREE.InstancedMesh(new THREE.BoxGeometry(.9,.2,1.55),mat('#eee9da'),256);let ca=0,cb=0;
   for(let i=0;i<512;i++){const p=this.track.samples[i],q=this.track.samples[(i+1)%512],a=Math.atan2(q.x-p.x,q.z-p.z);dummy.position.set(p.x+Math.cos(a)*(this.track.width/2)*side,.1,p.z-Math.sin(a)*(this.track.width/2)*side);dummy.rotation.set(0,a,0);dummy.updateMatrix();(i%2?curbA:curbB).setMatrixAt(i%2?ca++:cb++,dummy.matrix);}
   this.scene.add(curbA,curbB);
  }
  for(let i=0;i<512;i+=9){const p=this.track.samples[i],q=this.track.samples[(i+1)%512],a=Math.atan2(q.x-p.x,q.z-p.z);const dash=box(this.scene,.14,.025,2.2,night?'#758297':'#d5d9c7',p.x,.055,p.z);dash.rotation.y=a;}
  const gateIndex=0,p=this.track.samples[gateIndex],q=this.track.samples[1],a=Math.atan2(q.x-p.x,q.z-p.z),gate=new THREE.Group();gate.position.copy(p);gate.rotation.y=a;
  for(let x=-7;x<7;x++)for(let z=0;z<2;z++)box(gate,1,.03,1,(x+z)%2?'#eee9da':'#263332',x+.5,.065,z-.5);
  for(const side of [-1,1])box(gate,.6,8,.7,night?'#a395ff':'#344d48',side*(this.track.width/2+1),4,0);
  box(gate,this.track.width+3,1.3,.65,night?'#a395ff':'#344d48',0,8,0,{emissive:night?'#a395ff':'#000000',emissiveIntensity:.5});
  this.scene.add(gate);
  for(const fraction of [.2,.65]){
   const i=Math.floor(512*fraction),p=this.track.samples[i],q=this.track.samples[(i+1)%512],a=Math.atan2(q.x-p.x,q.z-p.z),pad=new THREE.Group();pad.position.copy(p);pad.rotation.y=a;
   box(pad,this.track.width-2,.035,5,night?'#a494ff':'#d7f66e',0,.07,0,{emissive:night?'#7d63ff':'#9abd37',emissiveIntensity:.5});
   for(const z of [-1.4,0,1.4]){for(const sign of [-1,1]){const stripe=box(pad,2,.03,.35,'#344b43',sign*.7,.1,z);stripe.rotation.y=sign*-.6;}}
   this.scene.add(pad);
  }
  const rand=seeded(night?98:47);
  const near=(x,z)=>{let d=Infinity;for(let i=0;i<512;i+=4)d=Math.min(d,Math.hypot(x-this.track.samples[i].x,z-this.track.samples[i].z));return d;};
  if(!night){
   // Water surrounds an island; the playable circuit remains on dry land.
   box(this.scene,850,.1,850,'#6fbab6',0,-.85,0);
   cylinder(this.scene,207,215,1,'#e5d5ae',0,-.6,30,64);
   for(let i=0;i<180;i++){
    const x=(rand()-.5)*370,z=(rand()-.5)*320,d=near(x,z);if(d<13||Math.hypot(x,z-30)>195)continue;
    if(rand()<.48){const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(2+rand()*4,0),mat('#a8b3a1'));rock.position.set(x,1,z);rock.scale.y=.5;this.scene.add(rock);}else{
     const palm=new THREE.Group();palm.position.set(x,0,z);palm.rotation.y=rand()*6.28;const h=7+rand()*5;cylinder(palm,.35,.6,h,'#937860',0,h/2,0,7);
     for(let j=0;j<6;j++){const leaf=box(palm,1,.25,7,'#527e5b',0,h,2);leaf.rotation.y=j*Math.PI/3;leaf.position.x=Math.sin(j*Math.PI/3)*2;leaf.position.z=Math.cos(j*Math.PI/3)*2;leaf.rotation.x=.2;}this.scene.add(palm);
    }
   }
   for(let i=0;i<10;i++){const hill=new THREE.Mesh(new THREE.ConeGeometry(18+rand()*18,12+rand()*24,7),mat(i%2?'#82a18b':'#a0b19a'));hill.position.set((rand()-.5)*110,4,(rand()-.5)*70);if(near(hill.position.x,hill.position.z)>23)this.scene.add(hill);}
   const tower=new THREE.Group();tower.position.set(-162,0,64);cylinder(tower,3,5,21,'#f5edda',0,10.5,0,12);cylinder(tower,3.15,3.5,4,'#e78064',0,18,0,12);cylinder(tower,3.5,3.5,3,'#34555c',0,23,0,12);cylinder(tower,0,4,4,'#e78064',0,26,0,12);this.scene.add(tower);
  }else{
   box(this.scene,700,.1,120,'#142a41',0,-.08,218);
   const palette=['#67758a','#af626e','#476e79','#a68a65','#665b94'];
   for(let i=0;i<105;i++){const x=(rand()-.5)*350,z=(rand()-.5)*310;if(near(x,z)<17)continue;const h=4+Math.floor(rand()*3)*3;const c=box(this.scene,8,h,16,palette[i%5],x,h/2,z);if(rand()>.5)c.rotation.y=Math.PI/2;for(let j=-3;j<=3;j+=2)box(c,.1,h+.02,16.05,'#334457',j,0,0);}
   for(let i=0;i<512;i+=32){const p=this.track.samples[i],q=this.track.samples[(i+1)%512],a=Math.atan2(q.x-p.x,q.z-p.z);for(const side of [-1,1]){const x=p.x+Math.cos(a)*11*side,z=p.z-Math.sin(a)*11*side;box(this.scene,.18,9,.18,'#52657c',x,4.5,z);box(this.scene,1.5,.12,1.5,'#cccbff',x,9,z,{emissive:'#a798ff',emissiveIntensity:2});}}
   for(let i=0;i<4;i++){const crane=new THREE.Group();crane.position.set(-100+i*65,0,180);box(crane,2,42,2,'#8e6576',0,21,0);box(crane,45,2,2,'#8e6576',10,42,0);box(crane,.12,24,.12,'#778ba5',30,29,0);this.scene.add(crane);}
  }
  this.models=[];
 }
 addRacers(racers){this.racers=racers;this.models=racers.map((r,i)=>{const car=makeCar(r.spec.id);this.scene.add(car);return car;});this.cameras=racers.filter(r=>r.human).map(()=>new THREE.PerspectiveCamera(67,1,.15,380));this.cameras.forEach(c=>c.userData.initial=true);}
 updateModels(time){this.racers?.forEach((r,i)=>{const m=this.models[i];m.position.set(r.x,.05,r.z);m.rotation.y=r.heading;m.rotation.z=r.steering*clamp(r.speed/35,0,1)*-.055;m.userData.boost.visible=r.boost>0;m.userData.boost.scale.y=.75+Math.sin(time*45)*.25;});}
 renderMenu(t){const angle=.55+Math.sin(t*.08)*.14;this.menuCamera.position.set(Math.sin(angle)*215,195,Math.cos(angle)*215);this.menuCamera.lookAt(0,0,20);this.renderer.setScissorTest(false);this.renderer.setViewport(0,0,this.w,this.h);this.renderer.render(this.scene,this.menuCamera);}
 renderRace(dt){const humans=this.racers.filter(r=>r.human),count=humans.length;this.renderer.setScissorTest(true);
  humans.forEach((r,i)=>{let x=0,y=0,w=this.w,h=this.h;if(count===2){w=this.w/2;x=i*w;}else if(count>=3){w=this.w/2;h=this.h/2;x=(i%2)*w;y=i<2?h:0;}
   const cam=this.cameras[i],back=new THREE.Vector3(Math.sin(r.heading),0,Math.cos(r.heading)),desired=new THREE.Vector3(r.x,7.3,r.z).addScaledVector(back,-11.5-r.speed*.06);
   if(cam.userData.initial){cam.position.copy(desired);cam.userData.initial=false;}else cam.position.lerp(desired,1-Math.exp(-dt*7));
   const look=new THREE.Vector3(r.x,1.3,r.z).addScaledVector(back,9);cam.lookAt(look);cam.fov=67+(r.boost>0?6:0);cam.aspect=w/h;cam.updateProjectionMatrix();this.renderer.setViewport(x,y,w,h);this.renderer.setScissor(x,y,w,h);this.renderer.render(this.scene,cam);
  });
  if(count===3){const w=this.w/2,h=this.h/2;this.renderer.setViewport(w,0,w,h);this.renderer.setScissor(w,0,w,h);this.menuCamera.aspect=w/h;this.menuCamera.updateProjectionMatrix();this.renderer.render(this.scene,this.menuCamera);this.menuCamera.aspect=this.w/this.h;this.menuCamera.updateProjectionMatrix();}
  this.renderer.setScissorTest(false);
 }
}
