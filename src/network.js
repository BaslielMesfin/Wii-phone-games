import Peer from 'peerjs';
import {clamp} from './physics.js';
import {randomId} from './ids.js';
const PREFIX='apex-pocket-v1-';
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function roomCode(){const bytes=crypto.getRandomValues(new Uint8Array(8));return [...bytes].map(b=>alphabet[b%alphabet.length]).join('');}
export function normalizeCode(s){return s.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8);}
export class HostRoom {
 constructor(callbacks={}){this.callbacks=callbacks;this.players=[];this.code=roomCode();this.running=false;this.capacity=4;this.timer=setInterval(()=>this.tick(),150);this.open();}
 open(){this.peer=new Peer(PREFIX+this.code,{debug:0});this.peer.on('open',()=>this.callbacks.open?.(this.code));this.peer.on('error',e=>{this.callbacks.error?.(e.type==='network'?'Pairing service is unavailable. Check your internet connection.':`Pairing: ${e.type}. Try creating a new room.`);});this.peer.on('disconnected',()=>{this.callbacks.error?.('Pairing service disconnected. Existing controllers may still work.');if(!this.peer.destroyed)this.peer.reconnect();});this.peer.on('connection',c=>this.accept(c));}
 accept(conn){let player=null;const timeout=setTimeout(()=>{if(!player)conn.close();},8000);
  conn.on('data',data=>{
   if(!data||typeof data!=='object')return;
   if(data.type==='join'&&!player){
    if(typeof data.token!=='string'||data.token.length>80)return conn.close();
    player=this.players.find(p=>p.token===data.token);
    if(!player&&(this.running||this.players.length>=this.capacity)){conn.send({type:'reject',message:this.running?'This race has started. Join the next race.':'This room is full (4 drivers maximum).'});setTimeout(()=>conn.close(),250);return;}
    if(!player){player={id:randomId(),token:data.token,name:String(data.name||`Driver ${this.players.length+1}`).replace(/[<>]/g,'').slice(0,18),car:['club','zip','gt'].includes(data.car)?data.car:'club',ready:false,input:{gas:false,brake:false,steer:0},last:performance.now(),connected:true};this.players.push(player);}
    player.conn?.close();player.conn=conn;player.connected=true;player.last=performance.now();clearTimeout(timeout);conn.send({type:'welcome',id:player.id,name:player.name});this.callbacks.change?.();
   } else if(player&&data.type==='input'){
    if(player.conn!==conn)return;const wasConnected=player.connected;player.last=performance.now();player.connected=true;player.input={gas:data.gas===true,brake:data.brake===true,steer:clamp(Number(data.steer)||0,-1,1),reset:data.reset===true};if(!wasConnected)this.callbacks.change?.();
   } else if(player&&data.type==='profile'&&!this.running){player.car=['club','zip','gt'].includes(data.car)?data.car:player.car;player.ready=data.ready===true;this.callbacks.change?.();}
  });
  conn.on('close',()=>{clearTimeout(timeout);if(player?.conn===conn){player.connected=false;player.ready=false;player.input={gas:false,brake:true,steer:0};this.callbacks.change?.();}});
  conn.on('error',()=>{});
 }
 tick(){for(const p of this.players){if(performance.now()-p.last>650){p.input={gas:false,brake:true,steer:0};if(p.connected){p.connected=false;this.callbacks.change?.();}}}this.callbacks.tick?.();}
 remove(id){const p=this.players.find(p=>p.id===id);if(!p)return;p.conn?.send({type:'reject',message:'The host removed you from this room.'});p.conn?.close();this.players=this.players.filter(p=>p.id!==id);this.callbacks.change?.();}
 broadcast(payload){for(const p of this.players)if(p.conn?.open)p.conn.send(payload);}
 destroy(){clearInterval(this.timer);this.peer.destroy();}
}
export class PhoneConnection {
 constructor(code,profile,callbacks={}){this.code=normalizeCode(code);this.profile=profile;this.callbacks=callbacks;this.token=sessionStorage.getItem('apex-token')||randomId();sessionStorage.setItem('apex-token',this.token);this.input={gas:false,brake:false,steer:0};this.peer=new Peer({debug:0});this.peer.on('open',()=>this.connect());this.peer.on('error',e=>this.callbacks.error?.(e.type==='peer-unavailable'?'Room not found. Check the code and keep the laptop lobby open.':`Connection failed (${e.type}). Check Wi-Fi and try again.`));this.peer.on('disconnected',()=>{if(!this.peer.destroyed)this.peer.reconnect();});this.timer=setInterval(()=>{if(this.conn?.open)this.conn.send({type:'input',...this.input});},33);}
 connect(){if(this.stopped)return;clearTimeout(this.retry);this.callbacks.status?.('Connecting…');this.conn=this.peer.connect(PREFIX+this.code,{reliable:false,serialization:'json'});const c=this.conn;const timeout=setTimeout(()=>{if(!c.open){this.callbacks.error?.('Connection timed out. Use the same Wi-Fi, turn off VPNs, and check the room code.');c.close();}},12000);
  c.on('open',()=>{clearTimeout(timeout);c.send({type:'join',token:this.token,...this.profile});});
  c.on('data',d=>{if(d?.type==='reject'){this.stopped=true;this.callbacks.error?.(d.message);c.close();}else if(d?.type==='welcome'){this.id=d.id;this.callbacks.status?.('Connected');this.callbacks.welcome?.(d);}else this.callbacks.data?.(d);});
  c.on('close',()=>{clearTimeout(timeout);if(this.stopped)return;this.callbacks.status?.('Reconnecting…');this.retry=setTimeout(()=>this.connect(),1800);});c.on('error',()=>this.callbacks.error?.('Connection interrupted. Keep both screens open.'));
 }
 profileUpdate(car,ready){this.profile.car=car;this.profile.ready=ready;if(this.conn?.open)this.conn.send({type:'profile',car,ready});}
 destroy(){this.stopped=true;clearTimeout(this.retry);clearInterval(this.timer);this.conn?.close();this.peer.destroy();}
}
