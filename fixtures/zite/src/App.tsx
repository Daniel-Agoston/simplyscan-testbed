import { useState } from 'react';
import { useAuth } from 'zitejs/auth';
import { publicCanary, whoami } from 'zitejs/api';
export default function App(){
 const {user,isLoading,loginWithRedirect,logout}=useAuth();
 const [result,setResult]=useState('');
 return <main className="p-8 max-w-3xl mx-auto space-y-4">
 <h1 className="text-3xl font-bold">SimplyScan native Zite testbed</h1>
 <p>Dedicated security test fixtures. All data is synthetic. Do not enter real personal data.</p>
 <p>The public canary is deliberately readable. Owned record endpoints require a native Zite login and enforce ownership on the server.</p>
 <p>Cross-user permission tests remain pending until two real test users sign in. This page is not a security certification.</p>
 {isLoading?<p>Checking session…</p>:user?<><p>Test user signed in.</p><button onClick={()=>logout()}>Sign out</button><button onClick={()=>whoami({}).then(r=>setResult('Native identity verified: '+r.id)).catch(()=>setResult('Identity request failed'))}>Check my identity</button></>:<button onClick={()=>loginWithRedirect()}>Sign in as a test user</button>}
 <button className="block border p-2" onClick={()=>publicCanary({}).then(r=>setResult(JSON.stringify(r))).catch(()=>setResult('Canary request failed'))}>Read synthetic public canary</button>
 <pre className="whitespace-pre-wrap">{result}</pre>
 </main>;
}
