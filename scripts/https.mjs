import {spawn,execFile} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const tools=resolve(root,'.tools');await mkdir(tools,{recursive:true});
const port=process.env.APEX_HTTPS_PORT||'4174';
if(!/^\d+$/.test(port)||Number(port)<1||Number(port)>65535)throw Error('APEX_HTTPS_PORT must be between 1 and 65535.');
console.log('Opening a temporary public HTTPS address for APEX Pocket using localhost.run.');
console.log('Anyone with your room invite can join. Keep this window open while playing.');
const args=['-4','-T','-F','none','-o','BatchMode=yes','-o','IdentityFile=none','-o','IdentitiesOnly=yes','-o','IdentityAgent=none','-o','StrictHostKeyChecking=accept-new','-o',`UserKnownHostsFile=${resolve(tools,'known_hosts')}`,'-o','ConnectTimeout=20','-o','ServerAliveInterval=30','-o','ServerAliveCountMax=6','-o','ExitOnForwardFailure=yes','-R',`80:127.0.0.1:${port}`,'nokey@localhost.run','--','--output','json'];
const tunnel=spawn(process.platform==='win32'?'ssh.exe':'ssh',args,{cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe']});
let game,started=false,output='';
const cleanup=()=>{game?.kill();tunnel.kill();};
process.on('SIGINT',()=>{cleanup();process.exit();});process.on('SIGTERM',()=>{cleanup();process.exit();});process.on('exit',cleanup);
const deadline=setTimeout(()=>{console.error('HTTPS connection timed out. Check internet access or try another network.');cleanup();process.exitCode=1;},90000);
function read(chunk){
 output+=chunk.toString();
 let end;while((end=output.indexOf('\n'))!==-1){
  const line=output.slice(0,end).trim();output=output.slice(end+1);
  let event;try{event=JSON.parse(line);}catch{if(/^(?:ssh:|Permission denied|Error:|Timeout)|Connection (?:closed|timed out|reset)/i.test(line))console.error(line);continue;}
  if(event.type!=='v1.tcpip_forward.register.accepted'||started)continue;
  const url=typeof event.data==='string'?event.data.match(/https:\/\/[a-z0-9-]+\.(?:lhr\.life|localhost\.run)/i)?.[0]:null;
  if(!url)continue;
  started=true;clearTimeout(deadline);
  game=spawn(process.execPath,['server.mjs','--host','127.0.0.1','--port',port],{cwd:root,windowsHide:true,env:{...process.env,APEX_PUBLIC_ORIGIN:url},stdio:['ignore','pipe','inherit']});
  game.stdout.on('data',data=>{if(data.toString().includes('Laptop:')){
   console.log(`\nAPEX Pocket — HTTPS ready\nOpen on laptop: ${url}\nCreate a race, then scan its QR with up to four phones.\nKeep this window open. Ctrl+C stops both game and HTTPS link.\n`);
   if(!process.argv.includes('--no-open')){
    if(process.platform==='win32')execFile('cmd',['/c','start','',url],()=>{});
    else if(process.platform==='darwin')execFile('open',[url],()=>{});
    else execFile('xdg-open',[url],()=>{});
   }
  }});
  game.on('error',e=>{console.error(e.message);cleanup();process.exitCode=1;});
  game.on('exit',code=>{if(code){console.error('Game server failed.');tunnel.kill();process.exitCode=code;}});
 }
 if(output.length>65536)output='';
}
tunnel.stdout.on('data',read);tunnel.stderr.on('data',read);
tunnel.on('error',e=>{clearTimeout(deadline);console.error(`${e.message}\nInstall Windows OpenSSH Client (Optional features) if ssh.exe is missing.`);process.exitCode=1;});
tunnel.on('exit',code=>{clearTimeout(deadline);game?.kill();console.log(`HTTPS link closed (SSH exit ${code}). Relaunch START-PHONE-HTTPS.bat for a new address.`);if(code)process.exitCode=code;});
