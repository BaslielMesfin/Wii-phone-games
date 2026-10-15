class Events {
 constructor(){this.events={};}
 on(name,fn){(this.events[name]??=[]).push(fn);return this;}
 emit(name,data){for(const fn of this.events[name]||[])fn(data);}
}
class Connection extends Events {
 constructor(peer,id){super();this.peer=peer;this.id=id;this.open=false;}
 send(data){if(this.open)this.peer.send({type:'data',target:this.id,data});}
 close(){if(this.peer.connections.get(this.id)!==this)return;this.peer.send({type:'close',target:this.id});this.closed();}
 closed(){if(this.peer.connections.get(this.id)!==this)return;this.open=false;this.peer.connections.delete(this.id);this.emit('close');}
}
export default class LocalPeer extends Events {
 constructor(id){
  super();this.id=typeof id==='string'?id:'phone';this.connections=new Map();this.destroyed=false;
  // Hex identifiers work on HTTP LAN pages too, without randomUUID.
  if(!this.id.startsWith('apex-'))this.id='phone-'+[...crypto.getRandomValues(new Uint8Array(20))].map(n=>n.toString(16).padStart(2,'0')).join('');
  this.openSocket();
 }
 openSocket(){
  this.socket=new WebSocket(`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/api/relay`);
  this.socket.onopen=()=>this.send({type:'register',id:this.id});
  this.socket.onmessage=e=>{
   const m=JSON.parse(e.data);
   if(m.type==='open')this.emit('open',m.id);
   else if(m.type==='error')this.emit('error',{type:m.error});
   else if(m.type==='connection'){const c=new Connection(this,m.id);c.open=true;this.connections.set(m.id,c);this.emit('connection',c);}
   else if(m.type==='connected'){const c=this.connections.get(m.id);if(c){c.open=true;c.emit('open');}}
   else if(m.type==='data')this.connections.get(m.id)?.emit('data',m.data);
   else if(m.type==='close')this.connections.get(m.id)?.closed();
  };
  this.socket.onclose=()=>{for(const c of [...this.connections.values()])c.closed();if(!this.destroyed)this.emit('disconnected');};
  this.socket.onerror=()=>this.emit('error',{type:'network'});
 }
 send(data){if(this.socket.readyState===WebSocket.OPEN)this.socket.send(JSON.stringify(data));}
 connect(id){const c=new Connection(this,id);this.connections.set(id,c);this.send({type:'connect',target:id});return c;}
 reconnect(){if(this.destroyed||this.retry)return;this.retry=setTimeout(()=>{this.retry=null;if(this.socket.readyState===WebSocket.CLOSED)this.openSocket();},1200);}
 destroy(){this.destroyed=true;clearTimeout(this.retry);this.socket.close();}
}
