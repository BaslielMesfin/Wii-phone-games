import {readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
for(const f of await readdir('src'))if(f.endsWith('.js'))execFileSync(process.execPath,['--check',`src/${f}`],{stdio:'inherit'});
execFileSync(process.execPath,['--check','server.mjs'],{stdio:'inherit'});
console.log('All application JavaScript passed syntax checks.');
