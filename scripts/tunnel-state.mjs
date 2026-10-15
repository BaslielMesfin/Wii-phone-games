export class TunnelOutput {
 constructor(onAddress,onMessage=()=>{}){this.onAddress=onAddress;this.onMessage=onMessage;this.buffer='';this.origin=null;}
 push(chunk){
  this.buffer+=chunk.toString();let end;
  while((end=this.buffer.indexOf('\n'))!==-1){
   const line=this.buffer.slice(0,end).trim();this.buffer=this.buffer.slice(end+1);
   let event;try{event=JSON.parse(line);}catch{if(/^(?:ssh:|Permission denied|Error:|Timeout)|Connection (?:closed|timed out|reset)/i.test(line))this.onMessage(line);continue;}
   if(event.type!=='v1.tcpip_forward.register.accepted')continue;
   const origin=typeof event.data==='string'?event.data.match(/https:\/\/[a-z0-9-]+\.(?:lhr\.life|localhost\.run)/i)?.[0]:null;
   if(origin&&origin!==this.origin){this.origin=origin;this.onAddress(origin);}
  }
  if(this.buffer.length>65536)this.buffer='';
 }
}
