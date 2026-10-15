// Native WeWeb session transport for the existing SimplyScan ownership matrix.
// This is an owner-run fixture script, not part of the public scanner service.
import { readFile, open } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { users, table } from './build-workflows.mjs';

const [configPath, scannerPath, outputPath] = process.argv.slice(2);
const moduleUrl = (name: string) => pathToFileURL(join(scannerPath, 'scripts/backend-audit', name)).href;
const { validateConfig } = await import(moduleUrl('contracts.ts'));
const { auditPermissions } = await import(moduleUrl('matrix.ts'));
const { renderHttpBody } = await import(moduleUrl('httpConfig.ts'));
const config = validateConfig(JSON.parse(await readFile(configPath, 'utf8')));
const target = config.targets[0];
if (config.targets.length !== 1 || target.endpoint !== 'https://laminated-raster-production.weweb.io' || target.resource !== table
  || target.ownerId !== users.owner || target.otherId !== users.other || target.ownershipTests !== true) {
  throw new Error('Only the established native WeWeb fixture is allowed');
}
const cookies = Object.fromEntries(['admin', 'owner', 'other'].map(role => {
  const value = process.env[target.credentials[role].env];
  if (!value || /[\r\n]/.test(value)) throw new Error('Missing native test session');
  return [role, value];
}));
if (new Set(Object.values(cookies)).size !== 3) throw new Error('Three distinct native sessions are required');
const request = async (actor: string, path: string, method = 'GET', body?: unknown) => {
  if (!/^\/api\/simplyscan-audit\/(whoami|read|create|update|delete)$/.test(path)) throw new Error('Unexpected fixture endpoint');
  const response = await fetch(target.endpoint + path, {
    method, headers: { 'Content-Type': 'application/json', Origin: target.endpoint, ...(actor === 'anonymous' ? {} : { Cookie: cookies[actor] }) },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(10000),
  });
  const reader = response.body?.getReader();
  let length = 0, raw = '';
  const decoder = new TextDecoder();
  if (reader) try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 1048576) throw new Error('Response exceeded fixture limit');
      raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode();
  } finally { await reader.cancel().catch(() => {}); }
  let data;
  try { data = JSON.parse(raw); } catch { /* Non-JSON is not permission evidence. */ }
  return { status: response.status, data };
};
for (const actor of ['admin', 'owner', 'other']) {
  const r = await request(actor, '/api/simplyscan-audit/whoami');
  if (r.status !== 200 || r.data?.id !== users[actor]) throw new Error('Native identity preflight failed before writes');
}
const operation = async (actor: string, action: string, id: string, data: object = {}) => {
  if (!/^[a-f0-9]{15}$/.test(id)) throw new Error('Invalid disposable record ID');
  const op = target.http.operations[action];
  if (op.method !== 'POST' || op.path !== `/api/simplyscan-audit/${action}`) throw new Error('Unexpected native operation');
  return request(actor, op.path, op.method, renderHttpBody(op.body, id, data));
};
const adapter = {
  async read(actor: string, id: string) {
    const r = await operation(actor, 'read', id);
    const record = r.data?.record;
    if (record && typeof record === 'object' && !Array.isArray(record)) return { status: 'record', value: record };
    if ([401, 403].includes(r.status)) return { status: 'denied' };
    if (r.status === 200 && record === null && !r.data.error) return { status: 'missing' };
    return { status: 'error' };
  },
  async write(actor: string, action: string, id: string, data: object) {
    const r = await operation(actor, action, id, data);
    if ([401, 403].includes(r.status)) return 'denied';
    return r.status >= 200 && r.status < 300 ? 'accepted' : 'error';
  },
  async policy() { return { status: 'unavailable', details: { reason: 'Native workflow authorization; this matrix tests configured runtime behavior and does not certify all policies.' } }; },
  async close() {},
};
// Reserve output before writes so cleanup evidence cannot be lost to overwrite.
const output = await open(outputPath, 'wx', 0o600);
const controller = new AbortController();
process.once('SIGINT', () => controller.abort());
process.once('SIGTERM', () => controller.abort());
let report;
try {
  try { report = await auditPermissions(target, adapter, controller.signal); }
  catch (error) {
    report = error?.report;
    process.exitCode = 1;
    console.error('Native audit interrupted; inspect the sanitized report and cleanup status.');
  }
  const checks = [...(report?.checks ?? []), ...(report?.isolation ?? [])];
  const complete = report?.checks.length === 12 && report?.isolation?.length === 6;
  const passed = checks.filter(check => check.outcome === 'passed').length;
  const success = complete && passed === 18 && report.cleanup === 'verified';
  await output.writeFile(JSON.stringify({
    format: 'simplyscan-connected-audit', version: 1, siteUrl: config.siteUrl,
    generatedAt: new Date().toISOString(), provenance: 'owner-run-unverified',
    coverage: 'Native WeWeb cookie sessions, configured fixture workflows, and disposable records only.',
    complete, targets: report ? [report] : [],
  }, null, 2) + '\n');
  console.log(JSON.stringify({ complete, passed, total: checks.length, cleanup: report?.cleanup, leftoverIds: report?.leftoverIds ?? [] }));
  if (!success) process.exitCode = 1;
} finally { await output.close(); }
