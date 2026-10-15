import {cp,mkdir,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const target=resolve(root,'dist');
await rm(target,{recursive:true,force:true});await mkdir(target,{recursive:true});
for(const item of ['index.html','src','vendor'])await cp(resolve(root,item),resolve(target,item),{recursive:true});
console.log(`Static game copied to ${target}. Publish this folder with an HTTPS static host.`);
