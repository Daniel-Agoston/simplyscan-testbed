// Run the existing SimplyScan CLI against the dedicated native Zite testbed.
// Node >=22.18; session files remain private and credentials never enter reports.
import { readFile, mkdir, writeFile, lstat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { FIXTURE_ADMIN_ID, NORMAL_USER_IDS } from './src/fixturePolicy.ts';

const [sessionsArg, scannerArg, outputArg]=process.argv.slice(2);
if(!sessionsArg||!scannerArg||!outputArg)throw new Error('Usage: node verify-live.mjs PRIVATE_SESSION_DIRECTORY SCANNER_REPO NEW_OUTPUT_DIRECTORY');
if(!FIXTURE_ADMIN_ID||NORMAL_USER_IDS.includes(FIXTURE_ADMIN_ID))throw new Error('Configure a verified, separate native fixture-admin identity first');
const origin='https://wrrcxw37xc.zite.so';
const identities={admin:FIXTURE_ADMIN_ID,owner:NORMAL_USER_IDS[0],other:NORMAL_USER_IDS[1]};
const sessionDir=resolve(sessionsArg), scanner=resolve(scannerArg), output=resolve(outputArg);
const dirStat=await lstat(sessionDir);
if(!dirStat.isDirectory()||dirStat.isSymbolicLink()||(dirStat.mode&0o077)!==0)throw new Error('Session directory must be private (0700)');
const env={...process.env}, verified=[];
for(const role of ['admin','owner','other']){
 const path=join(sessionDir,role+'.json'), stat=await lstat(path);
 if(!stat.isFile()||stat.isSymbolicLink()||(stat.mode&0o077)!==0||stat.size>16384)throw new Error('Session inputs must be private, bounded regular files (0600)');
 const session=JSON.parse(await readFile(path,'utf8'));
 if(session.origin!==origin||session.id!==identities[role]||typeof session.cookie!=='string'
  ||!/^__Secure-better-auth\.session_token=[\x21-\x3A\x3C-\x7E]+$/.test(session.cookie))throw new Error('Unexpected native test session');
 env['ZITE_'+role.toUpperCase()+'_COOKIE']=session.cookie;
 const response=await fetch(origin+'/api/whoami',{method:'POST',headers:{'Content-Type':'application/json',Cookie:session.cookie},
  body:JSON.stringify({inputs:{},mode:'live'}),redirect:'error',signal:AbortSignal.timeout(15000)});
 const identity=await response.json().catch(()=>null);
 if(response.status!==200||identity?.id!==identities[role])throw new Error('Native identity preflight failed for '+role+'; no fixture writes performed');
 verified.push({role,status:response.status,identity:identity.id,verified:true});
}
if(new Set(['admin','owner','other'].map(role=>env['ZITE_'+role.toUpperCase()+'_COOKIE'])).size!==3)throw new Error('Three distinct native sessions required');
const denied={read:false,create:false,update:false,delete:false};
const config={version:1,siteUrl:origin,authorizedTestEnvironment:true,targets:[{
 name:'native_zite_owned_fixtures',provider:'http',endpoint:origin,resource:'simplyscan_audit_owned',
 ownerId:identities.owner,otherId:identities.other,ownershipTests:true,ownerField:'owner',canaryField:'auditMarker',
 credentials:Object.fromEntries(['admin','owner','other'].map(role=>[role,{env:'ZITE_'+role.toUpperCase()+'_COOKIE',header:'Cookie',bearer:false}])),
 expected:{anonymous:denied,owner:{read:true,create:true,update:true,delete:true},other:denied},
 http:{platform:'Zite',envelope:'zite-live',identity:{method:'POST',path:'/api/whoami',resultPath:['id']},
 operations:{
  read:{method:'POST',path:'/api/readOwned',body:{id:'$id'},resultPath:['record'],nullMeansMissing:true},
  create:{method:'POST',path:'/api/createOwned',body:{id:'$id',data:'$data'}},
  update:{method:'POST',path:'/api/updateOwned',body:{id:'$id',data:'$data'}},
  delete:{method:'POST',path:'/api/deleteOwned',body:{id:'$id'}}
 }}}]};
await mkdir(output,{mode:0o700}); // Refuse existing output before any writes.
await writeFile(join(output,'config.json'),JSON.stringify(config,null,2)+'\n',{mode:0o600,flag:'wx'});
await writeFile(join(output,'sessions.json'),JSON.stringify({origin,verified},null,2)+'\n',{mode:0o600,flag:'wx'});
const child=spawnSync(process.execPath,['--import','tsx',join(scanner,'scripts/backend-audit/cli.ts'),join(output,'config.json'),'--allow-disposable-writes','--output',join(output,'report.json')],{
 cwd:join(scanner,'scripts/backend-audit'),env,stdio:'inherit'
});
process.exitCode=child.status??2;
