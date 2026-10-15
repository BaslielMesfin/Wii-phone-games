import {WebSocketServer} from '../vendor/ws/wrapper.mjs';

// Same-origin transport: no signaling service, STUN, or router port forwarding.
export function attachRelay(server) {
 const peers=new Map(), wss=new WebSocketServer({noServer:true,maxPayload:4096,perMessageDeflate:false});
 server.on('upgrade',(req,socket,head)=>{
  const origin=req.headers.origin;
  let sameOrigin=!origin;
  try{if(origin)sameOrigin=new URL(origin).host===req.headers.host;}catch{}
  if(req.url!=='/api/relay'||!sameOrigin||wss.clients.size>=64){socket.destroy();return;}
  wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws));
 });
 const send=(ws,data)=>{if(ws?.readyState===1&&ws.bufferedAmount<65536)ws.send(JSON.stringify(data));};
 wss.on('connection',ws=>{
  ws.links=new Set();ws.alive=true;
  const deadline=setTimeout(()=>{if(!ws.id)ws.close();},8000);deadline.unref();
  ws.on('pong',()=>ws.alive=true);
  ws.on('message',raw=>{
   let m;try{m=JSON.parse(raw);}catch{return ws.close(1008,'Invalid message');}
   if(!m||typeof m!=='object')return;
   if(m.type==='register'&&!ws.id){
    if(typeof m.id!=='string'||!/^apex-pocket-v1-[A-Z2-9]{8}$|^phone-[a-f0-9-]{16,80}$/.test(m.id))return ws.close(1008,'Invalid identity');
    if(peers.has(m.id)){send(ws,{type:'error',error:'unavailable-id'});return ws.close();}
    ws.id=m.id;peers.set(ws.id,ws);clearTimeout(deadline);send(ws,{type:'open',id:ws.id});
   }else if(ws.id&&m.type==='connect'){
    const host=peers.get(m.target);
    if(!host||!m.target.startsWith('apex-pocket-v1-')||ws.id.startsWith('apex-pocket-v1-'))return send(ws,{type:'error',error:'peer-unavailable'});
    if(host.links.size>=4&&!host.links.has(ws.id))return send(ws,{type:'error',error:'room-full'});
    if(ws.links.size)return;
    host.links.add(ws.id);ws.links.add(host.id);send(host,{type:'connection',id:ws.id});send(ws,{type:'connected',id:host.id});
   }else if(ws.id&&m.type==='data'&&ws.links.has(m.target)){
    send(peers.get(m.target),{type:'data',id:ws.id,data:m.data});
   }else if(ws.id&&m.type==='close'&&ws.links.has(m.target)){
    ws.links.delete(m.target);peers.get(m.target)?.links.delete(ws.id);send(peers.get(m.target),{type:'close',id:ws.id});
   }
  });
  ws.on('error',()=>{});
  ws.on('close',()=>{clearTimeout(deadline);if(peers.get(ws.id)===ws)peers.delete(ws.id);for(const id of ws.links){const other=peers.get(id);other?.links.delete(ws.id);send(other,{type:'close',id:ws.id});}});
 });
 const heartbeat=setInterval(()=>{for(const ws of wss.clients){if(!ws.alive){ws.terminate();continue;}ws.alive=false;ws.ping();}},10000);heartbeat.unref();
 wss.on('close',()=>clearInterval(heartbeat));
 return wss;
}
