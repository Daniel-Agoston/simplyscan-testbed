// Native Zite deployment smoke tests only: NOT two-user isolation evidence.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
const base = 'https://wrrcxw37xc.zite.so';
const id=randomBytes(8).toString('hex').slice(0,15);
const data={owner:'not-a-real-authenticated-user',auditMarker:'simplyscan_'+randomBytes(16).toString('hex')};
const checks=[];
async function call(name,inputs,invalidToken=false){
 const r=await fetch(base+'/api/'+name,{method:'POST',headers:{'Content-Type':'application/json',...(invalidToken?{Authorization:'Bearer simplyscan-deliberately-invalid-token'}:{})},body:JSON.stringify({inputs,mode:'live'}),redirect:'error',signal:AbortSignal.timeout(15000)});
 return {status:r.status,body:await r.json()};
}
const publicRead=await call('publicCanary',{});
assert.equal(publicRead.status,200);
assert.deepEqual(publicRead.body,{records:[{email:'synthetic-user@example.invalid',auditMarker:'simplyscan_public_canary_v1'}]});
checks.push({check:'synthetic public canary readable anonymously',passed:true});
for(const invalid of [false,true])for(const [name,inputs] of Object.entries({whoami:{},readOwned:{id},createOwned:{id,data},updateOwned:{id,data},deleteOwned:{id}})){
 const r=await call(name,inputs,invalid);
 assert.equal(r.status,401,name+' must reject '+(invalid?'invalid token':'anonymous caller'));
 assert.ok(!JSON.stringify(r.body).includes(data.auditMarker));
 checks.push({check:name+' rejects '+(invalid?'invalid token':'anonymous caller'),passed:true});
}
console.log(JSON.stringify({testedAt:new Date().toISOString(),url:base,checks,passed:checks.length,total:checks.length,attemptedDisposableId:id,authenticatedOwnership:'not-tested: real owner and second-user sessions required'}));
