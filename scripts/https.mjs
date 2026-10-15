import {spawn,execFile} from 'node:child_process';
import {mkdirSync,writeFileSync,renameSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {TunnelOutput} from './tunnel-state.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),tools=resolve(root,'.tools');mkdirSync(tools,{recursive:true});
const stateFile=resolve(tools,'public-origin.json'),port=process.env.APEX_HTTPS_PORT||'4174';
if(!/^\d+$/.test(port)||Number(port)<1||Number(port)>65535)throw Error('APEX_HTTPS_PORT must be between 1 and 65535.');
let tunnel,game,retry,deadline,stopping=false,currentOrigin=null,opened=false,attempt=0;
function save(origin,status){const temp=stateFile+'.tmp';writeFileSync(temp,JSON.stringify({origin,status,pid:tunnel?.pid||null,updatedAt:new Date().toISOString()}));renameSync(temp,stateFile);}
function cleanup(){stopping=true;clearTimeout(retry);clearTimeout(deadline);save(null,'stopped');tunnel?.kill();game?.kill();}
process.on('SIGINT',()=>{cleanup();process.exit();});process.on('SIGTERM',()=>{cleanup();process.exit();});process.on('exit',()=>{if(!stopping)cleanup();});
function openBrowser(url){if(process.argv.includes('--no-open'))return;if(process.platform==='win32')execFile('cmd',['/c','start','',url],()=>{});else execFile(process.platform==='darwin'?'open':'xdg-open',[url],()=>{});}
function startTunnel(){
 if(stopping)return;
 currentOrigin=null;save(null,'connecting');console.log('Connecting phone HTTPS link…');
 const args=['-4','-T','-F','none','-o','BatchMode=yes','-o','IdentityFile=none','-o','IdentitiesOnly=yes','-o','IdentityAgent=none','-o','StrictHostKeyChecking=accept-new','-o',`UserKnownHostsFile=${resolve(tools,'known_hosts')}`,'-o','ConnectTimeout=20','-o','ServerAliveInterval=30','-o','ServerAliveCountMax=6','-o','ExitOnForwardFailure=yes','-R',`80:127.0.0.1:${port}`,'nokey@localhost.run','--','--output','json'];
 const child=spawn(process.platform==='win32'?'ssh.exe':'ssh',args,{cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe']});tunnel=child;
 const ready=origin=>{
  if(stopping||tunnel!==child||origin===currentOrigin)return;
  const changed=currentOrigin!==null;currentOrigin=origin;attempt=0;clearTimeout(deadline);save(origin,'ready');
  console.log(`\n${changed?'Phone link renewed':'Phone HTTPS ready'}: ${origin}\nLaptop: http://localhost:${port}\nScan the CURRENT laptop QR. Keep this window open. Ctrl+C stops the game.\n`);
  if(!opened){opened=true;openBrowser(`http://localhost:${port}`);}
 };
 // Keep stdout/stderr chunk buffers separate; either stream may contain events.
 const stdout=new TunnelOutput(ready,m=>console.error(m)),stderr=new TunnelOutput(ready,m=>console.error(m));
 child.stdout.on('data',chunk=>stdout.push(chunk));child.stderr.on('data',chunk=>stderr.push(chunk));
 deadline=setTimeout(()=>{console.error('Phone link timed out; retrying. The laptop game stays open.');child.kill();},90000);
 child.on('error',e=>{console.error(e.message);if(e.code==='ENOENT'){console.error('Install Windows OpenSSH Client (Optional features).');cleanup();process.exitCode=1;}});
 child.on('close',()=>{
  clearTimeout(deadline);if(stopping||tunnel!==child)return;
  currentOrigin=null;save(null,'connecting');console.log('Phone link disconnected. Reconnecting; watch the laptop for the updated QR.');
  retry=setTimeout(startTunnel,Math.min(15000,2000*2**Math.min(attempt++,3)));
 });
}
save(null,'connecting');
console.log('APEX Pocket: local game + temporary public phone HTTPS link. Anyone with the room invite can join.');
game=spawn(process.execPath,['server.mjs','--host','127.0.0.1','--port',port,'--public-origin-file',stateFile],{cwd:root,windowsHide:true,stdio:['ignore','pipe','inherit']});
let serverOutput='',serverReady=false;
game.stdout.on('data',chunk=>{serverOutput=(serverOutput+chunk.toString()).slice(-4000);if(!serverReady&&serverOutput.includes('Laptop:')){serverReady=true;console.log(`Laptop game: http://localhost:${port}`);startTunnel();}});
game.on('error',e=>{console.error(e.message);cleanup();process.exitCode=1;});
game.on('close',code=>{if(!stopping){console.error('Game server stopped.');cleanup();process.exitCode=code||1;}});
