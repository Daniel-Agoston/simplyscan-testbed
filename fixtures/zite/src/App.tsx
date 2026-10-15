import { useState } from 'react';
import { useAuth } from 'zitejs/auth';
import { publicCanary, whoami, createOwned, readOwned, updateOwned, deleteOwned } from 'zitejs/api';

type Fixture = { id: string; owner: string; auditMarker: string };
type Check = { name: string; passed: boolean; detail?: string };
const fixtureKey = 'simplyscan-zite-cross-fixture-v1';
const reportKey = 'simplyscan-zite-report-v1';
const fresh = (owner: string): Fixture => {
 const hex = crypto.randomUUID().replaceAll('-', '');
 return { id: hex.slice(0,15), owner, auditMarker: 'simplyscan_' + hex };
};
function savedFixture(): Fixture | null {
 try {
  const f = JSON.parse(localStorage.getItem(fixtureKey) || 'null');
  return f && /^[a-f0-9]{15}$/.test(f.id) && /^simplyscan_[a-f0-9]{32}$/.test(f.auditMarker) && typeof f.owner === 'string' ? f : null;
 } catch { return null; }
}
export default function App() {
 const {user,isLoading,loginWithRedirect,logout}=useAuth();
 const [result,setResult]=useState(() => localStorage.getItem(reportKey) || '');
 const [fixture,setFixture]=useState<Fixture | null>(savedFixture);
 const [busy,setBusy]=useState(false);
 function output(value: unknown) {
  const text = typeof value === 'string' ? value : JSON.stringify(value,null,2);
  setResult(text); localStorage.setItem(reportKey,text);
 }
 async function task(action: () => Promise<void>) {
  setBusy(true);
  try { await action(); } catch(e) { output({error:e instanceof Error?e.message:String(e)}); }
  finally { setBusy(false); }
 }
 async function ownChecks() {
  const identity=await whoami({});
  const f=fresh(identity.id), spoof=fresh(identity.id + '_synthetic_other');
  const checks: Check[]=[];
  const check=(name:string,passed:boolean,detail?:string)=>checks.push({name,passed,...(detail?{detail}:{})});
  const denied=async(name:string,action:()=>Promise<unknown>)=>{
   try { await action(); check(name,false,'Request unexpectedly succeeded'); }
   catch(e) { check(name,/FORBIDDEN|Owner mismatch|Ownership is immutable|Fixture exists|403/i.test(String(e)),String(e)); }
  };
  check('native identity',!!identity.id);
  let created=false;
  try {
   await createOwned({id:f.id,data:{owner:f.owner,auditMarker:f.auditMarker}}); created=true;
   check('own create',true);
   let record=(await readOwned({id:f.id})).record;
   check('own read',record?.owner===f.owner && record?.auditMarker===f.auditMarker);
   await updateOwned({id:f.id,data:{owner:f.owner,auditMarker:f.auditMarker+'_updated'}});
   record=(await readOwned({id:f.id})).record;
   check('own update persisted',record?.owner===f.owner && record?.auditMarker===f.auditMarker+'_updated');
   await denied('owner reassignment rejected',()=>updateOwned({id:f.id,data:{owner:spoof.owner,auditMarker:f.auditMarker}}));
   await denied('duplicate create rejected',()=>createOwned({id:f.id,data:{owner:f.owner,auditMarker:f.auditMarker}}));
   await denied('foreign owner create rejected',()=>createOwned({id:spoof.id,data:{owner:spoof.owner,auditMarker:spoof.auditMarker}}));
   record=(await readOwned({id:f.id})).record;
   check('denied writes left own row unchanged',record?.owner===f.owner && record?.auditMarker===f.auditMarker+'_updated');
  } catch(e) { check('own workflow',false,String(e)); }
  finally {
   if(created) {
    try { await deleteOwned({id:f.id}); check('own delete',true); }
    catch(e) { check('own delete',false,String(e)); }
   }
  }
  check('cleanup read is empty',(await readOwned({id:f.id})).record===null);
  output({suite:'native signed-in ownership controls',at:new Date().toISOString(),identity:identity.id,fixtureIds:[f.id,spoof.id],passed:checks.filter(c=>c.passed).length,total:checks.length,checks});
 }
 async function prepare() {
  if(savedFixture()) throw new Error('A cross-user fixture already exists; finish or clean it first.');
  const identity=await whoami({}), f=fresh(identity.id);
  await createOwned({id:f.id,data:{owner:f.owner,auditMarker:f.auditMarker}});
  localStorage.setItem(fixtureKey,JSON.stringify(f)); setFixture(f);
  const row=(await readOwned({id:f.id})).record;
  if(row?.owner!==f.owner || row?.auditMarker!==f.auditMarker) throw new Error('Prepared fixture could not be verified');
  output({stage:'Cross-user fixture ready. Sign in with a different test account, then run cross-user checks.',fixture:f});
 }
 async function crossChecks() {
  const f=savedFixture();
  if(!f) throw new Error('Prepare a cross-user fixture first.');
  const identity=await whoami({});
  if(identity.id===f.owner) throw new Error('A second real test account must sign in first.');
  const checks: Check[]=[];
  const denied=async(name:string,action:()=>Promise<unknown>)=>{
   try { await action(); checks.push({name,passed:false,detail:'Request unexpectedly succeeded'}); }
   catch(e) { checks.push({name,passed:/FORBIDDEN|Owner mismatch|Ownership is immutable|Fixture exists|Not your fixture|Not a disposable owned fixture|403/i.test(String(e)),detail:String(e)}); }
  };
  checks.push({name:'distinct native identities',passed:true});
  checks.push({name:'foreign row unreadable',passed:(await readOwned({id:f.id})).record===null});
  await denied('foreign update with original owner rejected',()=>updateOwned({id:f.id,data:{owner:f.owner,auditMarker:f.auditMarker+'_updated'}}));
  await denied('foreign update with current owner rejected',()=>updateOwned({id:f.id,data:{owner:identity.id,auditMarker:f.auditMarker+'_updated'}}));
  await denied('foreign delete rejected',()=>deleteOwned({id:f.id}));
  await denied('foreign fixture overwrite rejected',()=>createOwned({id:f.id,data:{owner:identity.id,auditMarker:f.auditMarker+'_updated'}}));
  const spoof=fresh(f.owner);
  await denied('create for real other owner rejected',()=>createOwned({id:spoof.id,data:{owner:f.owner,auditMarker:spoof.auditMarker}}));
  output({suite:'native cross-user isolation',at:new Date().toISOString(),identity:identity.id,owner:f.owner,fixtureIds:[f.id,spoof.id],passed:checks.filter(c=>c.passed).length,total:checks.length,checks,next:'Original owner must verify unchanged and clean up.'});
 }
 async function finish() {
  const f=savedFixture(); if(!f) throw new Error('No pending cross-user fixture.');
  const identity=await whoami({}); if(identity.id!==f.owner) throw new Error('Sign back in as the original owner to verify and clean up.');
  const row=(await readOwned({id:f.id})).record;
  const unchanged=row?.owner===f.owner && row?.auditMarker===f.auditMarker;
  if(!unchanged) throw new Error('Original fixture changed or disappeared; retain evidence for investigation.');
  await deleteOwned({id:f.id});
  const empty=(await readOwned({id:f.id})).record===null;
  if(empty) { localStorage.removeItem(fixtureKey); setFixture(null); }
  output({suite:'cross-user owner verification and cleanup',at:new Date().toISOString(),fixtureId:f.id,unchanged,cleanupVerified:empty});
 }
 return <main className="p-8 max-w-3xl mx-auto space-y-4">
  <h1 className="text-3xl font-bold">SimplyScan native Zite testbed</h1>
  <p>Dedicated security test fixtures. All data is synthetic. Do not enter real personal data.</p>
  <p>Owned record endpoints require a native Zite login and enforce ownership on the server. Test results apply only to this fixture, not a security certification.</p>
  <p>Cross-user testing requires two distinct real logins. Only nonsecret fixture IDs and reports are saved in this browser.</p>
  {isLoading?<p>Checking session…</p>:user?<><p>Test user signed in.</p>
   <div className="flex flex-wrap gap-3">
    <button disabled={busy} onClick={()=>logout()}>Sign out</button>
    <button disabled={busy} onClick={()=>task(async()=>output({identity:(await whoami({})).id}))}>Check my identity</button>
    <button className="border p-2" disabled={busy} onClick={()=>task(ownChecks)}>Run signed-in ownership checks</button>
    <button className="border p-2" disabled={busy||!!fixture} onClick={()=>task(prepare)}>Prepare cross-user fixture</button>
    <button className="border p-2" disabled={busy||!fixture} onClick={()=>task(crossChecks)}>Run cross-user checks</button>
    <button className="border p-2" disabled={busy||!fixture} onClick={()=>task(finish)}>Verify original owner and clean up</button>
   </div>
  </>:<button onClick={()=>loginWithRedirect()}>Sign in as a test user</button>}
  <button className="block border p-2" disabled={busy} onClick={()=>task(async()=>output(await publicCanary({})))}>Read synthetic public canary</button>
  {fixture && <p>Pending cross-user fixture: {fixture.id}. Return to its original owner to verify and clean up.</p>}
  {busy && <p role="status">Running native requests…</p>}
  <pre aria-label="Test results" className="whitespace-pre-wrap break-words text-sm">{result}</pre>
 </main>;
}
