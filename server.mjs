import http from 'node:http';
import https from 'node:https';
import {readFile,stat} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {networkInterfaces} from 'node:os';
import {execFile} from 'node:child_process';
import {attachRelay} from './scripts/relay.mjs';
const root=dirname(fileURLToPath(import.meta.url));
const args=process.argv.slice(2),value=(key,fallback)=>{const i=args.indexOf(key);return i===-1?fallback:args[i+1];};
const port=Number(value('--port','4173')),hostname=value('--host','0.0.0.0');
if(!Number.isInteger(port)||port<1||port>65535)throw Error('Port must be a number between 1 and 65535.');
const cert=value('--cert',null),key=value('--key',null),secure=!!(cert&&key);
const publicOriginFile=value('--public-origin-file',null);
let addresses=[];
try{addresses=Object.values(networkInterfaces()).flat().filter(n=>n.family==='IPv4'&&!n.internal).map(n=>n.address);}catch{console.warn('LAN address discovery unavailable; use localhost for keyboard play.');}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8'};
async function handler(req,res){
 try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(pathname==='/api/config'){
   let controllerOrigin=process.env.APEX_PUBLIC_ORIGIN||(addresses.length?`${secure?'https':'http'}://${addresses[0]}:${port}`:null),tunnelState=null;
   if(publicOriginFile){let state;try{state=JSON.parse(await readFile(publicOriginFile,'utf8'));}catch{}controllerOrigin=state?.status==='ready'?state.origin:null;tunnelState=state?.status||'connecting';}
   res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify({transport:'local',controllerOrigin,secure,tunnelState}));return;
  }
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end('Method not allowed');return;}
  const allowed=pathname==='/'||pathname==='/index.html'||pathname==='/src/style.css'||/^\/src\/[a-z-]+\.js$/.test(pathname)||pathname.startsWith('/vendor/');
  if(!allowed){res.writeHead(404);res.end('Not found');return;}
  const path=resolve(root,'.'+pathname);const relative=path.slice(root.length+1);
  if((!path.startsWith(root+sep)&&path!==root)||relative.split(/[\\/]/).some(p=>p.startsWith('.'))||['.pem','.key'].includes(extname(path))){res.writeHead(403);res.end('Forbidden');return;}
  let file=path;const info=await stat(file);if(info.isDirectory())file=resolve(file,'index.html');const content=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'});res.end(req.method==='HEAD'?undefined:content);
 }catch{res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');}
}
const server=secure?https.createServer({cert:await readFile(cert),key:await readFile(key)},handler):http.createServer(handler);
attachRelay(server);
server.listen(port,hostname,()=>{const url=`${secure?'https':'http'}://localhost:${port}`;console.log(`\nAPEX / POCKET\nLaptop: ${url}`);addresses.forEach(a=>console.log(`Phone / LAN: ${secure?'https':'http'}://${a}:${port}`));console.log('\nKeep this window open while playing. Ctrl+C stops the server.');if(!secure)console.log('Phone tilt requires trusted HTTPS. HTTP supports keyboard and phone touch controls only.');if(args.includes('--open')&&process.platform==='win32')execFile('cmd',['/c','start','',url],()=>{});});
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?`Port ${port} is in use. Close the other game window or use --port 4174.`:e.message);process.exitCode=1;});
