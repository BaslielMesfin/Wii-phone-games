import {clamp} from './physics.js';
export class HeldControls {
 constructor(){this.pointers=new Map();}
 press(button,id){if(!this.pointers.has(button))this.pointers.set(button,new Set());this.pointers.get(button).add(id);}
 release(button,id){this.pointers.get(button)?.delete(id);}
 down(button){return (this.pointers.get(button)?.size||0)>0;}
 clear(){this.pointers.clear();}
 get steer(){return Number(this.down('steer-right'))-Number(this.down('steer-left'));}
}
export function drivingInput(held,{active,enabled,motionFresh=true,steer=0}){
 if(!active||!enabled)return {gas:false,brake:false,steer:0};
 if(!motionFresh)return {gas:false,brake:true,steer:0};
 return {gas:held.down('gas'),brake:held.down('brake'),steer:clamp(steer,-1,1)};
}
