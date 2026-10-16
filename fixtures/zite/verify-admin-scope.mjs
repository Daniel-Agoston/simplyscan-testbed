import { readFile, open } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { FIXTURE_ADMIN_ID, NORMAL_USER_IDS } from './src/fixturePolicy.ts';
const [sessionDir,fixturesPath,outputPath]=process.argv.slice(2);
const origin='https://wrrcxw37xc.zite.so';
const session=JSON.parse(await readFile(join(sessionDir,'admin.json'),'utf8'));
if(session.origin!==origin||session.id!==FIXTURE_ADMIN_ID)throw new Error('Unexpected admin session');
const cases=JSON.parse(await readFile(fixturesPath,'utf8'));
if(cases.length!==3||cases.some(c=>!['wrong-marker','wrong-owner','wrong-email'].includes(c.name)||!/^[a-f0-9]{15}$/.test(c.fixtureId)))throw new Error('Unexpected sentinel fixtures');
const file=await open(outputPath,'wx',0o600), checks=[];
async function call(name,inputs){
 const r=await fetch(origin+'/api/'+name,{method:'POST',headers:{'Content-Type':'application/json',Cookie:session.cookie},body:JSON.stringify({inputs,mode:'live'}),redirect:'error',signal:AbortSignal.timeout(15000)});
 return {status:r.status,body:await r.json().catch(()=>null)};
}
const record=(r)=>r.body?.record;
const check=(name,passed,status)=>checks.push({name,passed,...(status?{status}:{})});
const id=randomBytes(8).toString('hex').slice(0,15);
const data={owner:NORMAL_USER_IDS[0],auditMarker:'simplyscan_'+randomBytes(16).toString('hex')};
let cleanupVerified=false,created=false;
try{
 const identity=await call('whoami',{});
 if(identity.status!==200||identity.body?.id!==FIXTURE_ADMIN_ID)throw new Error('Admin identity verification failed');
 if(record(await call('readOwned',{id}))!==null)throw new Error('Could not verify unused probe id');
 for(const fixture of cases)for(const action of ['read','delete','update','create']){
  const r=await call(action+'Owned',{id:fixture.fixtureId,...(['create','update'].includes(action)?{data}:{})});
  check(fixture.name+': admin '+action+' denied',r.status===403,r.status);
 }
 for(const owner of [FIXTURE_ADMIN_ID,'synthetic-unrelated-owner']){
  const r=await call('createOwned',{id,data:{...data,owner}});
  check('admin cannot create for '+(owner===FIXTURE_ADMIN_ID?'itself':'unrelated owner'),r.status===403,r.status);
 }
 const extra=await call('createOwned',{id,data:{...data,email:'scope-sentinel@example.invalid'}});
 check('admin cannot inject extra record fields',extra.status===400,extra.status);
 for(const action of ['read','delete']){
  const r=await call(action+'Owned',{id:'simplyscan_public_canary_v1'});
  check('permanent canary outside '+action+' contract',r.status===400,r.status);
 }
 if(record(await call('readOwned',{id}))!==null)throw new Error('Could not verify unused positive-control id');
 const create=await call('createOwned',{id,data}); created=create.status===200;
 const before=await call('readOwned',{id});
 check('admin synthetic seed and read allowed',created&&record(before)?.owner===data.owner&&record(before)?.auditMarker===data.auditMarker);
 const update=await call('updateOwned',{id,data:{...data,auditMarker:data.auditMarker+'_updated'}});
 const after=await call('readOwned',{id});
 check('admin update denied with unchanged record',update.status===403&&record(after)?.auditMarker===data.auditMarker&&record(after)?.owner===data.owner,update.status);
 const deleted=await call('deleteOwned',{id});
 cleanupVerified=deleted.status===200&&record(await call('readOwned',{id}))===null;
 check('admin synthetic cleanup verified',cleanupVerified,deleted.status);
}finally{
 if(!cleanupVerified){
  const remaining=record(await call('readOwned',{id}));
  if(remaining?.owner===data.owner&&remaining?.auditMarker===data.auditMarker)await call('deleteOwned',{id});
  cleanupVerified=record(await call('readOwned',{id}))===null;
 }
 const report={origin,adminId:FIXTURE_ADMIN_ID,at:new Date().toISOString(),passed:checks.filter(c=>c.passed).length,total:checks.length,cleanupVerified,positiveControlId:id,sentinels:cases.map(c=>({name:c.name,fixtureId:c.fixtureId,nativeId:c.nativeId})),checks};
 await file.writeFile(JSON.stringify(report,null,2)+'\n');await file.close();
 console.log(JSON.stringify({passed:report.passed,total:report.total,cleanupVerified}));
 if(report.passed!==20||report.total!==20||!cleanupVerified)process.exitCode=1;
}
