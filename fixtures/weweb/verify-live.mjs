// Owner-operated native HTTP audit. Credentials are read from private files,
// used only at the configured WeWeb origin, and never written to the report.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { users, projectId, table } from './build-workflows.mjs';

const [originArg, scannerArg, outputArg] = process.argv.slice(2);
if (!originArg || !scannerArg || !outputArg) {
  console.error('Usage: node verify-live.mjs WEWEB_ORIGIN SCANNER_REPO NEW_OUTPUT_DIRECTORY');
  process.exit(2);
}
const origin = new URL(originArg);
if (origin.protocol !== 'https:' || !origin.hostname.endsWith('.weweb.io') || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/') {
  throw new Error('Use the dedicated published HTTPS WeWeb origin');
}
const base = origin.origin;
if (base !== 'https://laminated-raster-production.weweb.io') throw new Error('Origin does not match this dedicated testbed');
const output = resolve(outputArg);
const scanner = resolve(scannerArg);
await mkdir(output, { mode: 0o700 }); // Refuse an existing output directory.
const denied = { read: false, create: false, update: false, delete: false };
const target = {
  name: 'native_weweb_owned_fixtures', provider: 'http', endpoint: base, resource: table,
  ownerId: users.owner, otherId: users.other, ownershipTests: true,
  ownerField: 'owner', canaryField: 'auditMarker',
  credentials: Object.fromEntries(['admin', 'owner', 'other'].map(role => [role, { env: `WEWEB_${role.toUpperCase()}_TOKEN` }])),
  expected: { anonymous: denied, owner: { read: true, create: true, update: true, delete: true }, other: denied },
  http: {
    platform: 'WeWeb', identity: { path: '/api/simplyscan-audit/whoami', resultPath: ['id'] },
    operations: {
      read: { method: 'POST', path: '/api/simplyscan-audit/read', body: { id: '$id' }, resultPath: ['record'], nullMeansMissing: true },
      create: { method: 'POST', path: '/api/simplyscan-audit/create', body: { id: '$id', data: '$data' } },
      update: { method: 'POST', path: '/api/simplyscan-audit/update', body: { id: '$id', data: '$data' } },
      delete: { method: 'POST', path: '/api/simplyscan-audit/delete', body: { id: '$id' } },
    },
  },
};
const configFile = join(output, 'config.json');
await writeFile(configFile, JSON.stringify({ version: 1, siteUrl: base, authorizedTestEnvironment: true, targets: [target] }, null, 2) + '\n', { mode: 0o600 });
const validation = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e',
  "import { readFileSync } from 'node:fs'; import { validateConfig } from './contracts.ts'; validateConfig(JSON.parse(readFileSync(process.argv[1], 'utf8')));",
  configFile], { cwd: join(scanner, 'scripts/backend-audit'), stdio: 'inherit' });
if (validation.status !== 0) throw new Error('Audit configuration validation failed before sign-in');
const env = { ...process.env };
const sessions = [];
for (const role of ['admin', 'owner', 'other']) {
  const account = JSON.parse(await readFile(join(homedir(), 'simplyscan-testbed-weweb', role + '.json'), 'utf8'));
  if (account.projectId !== projectId || account.email !== `simplyscan-audit-${role}@example.invalid`) throw new Error('Unexpected test account');
  const response = await fetch(base + '/api/auth/sign-in/email', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base },
    body: JSON.stringify({ email: account.email, password: account.password, rememberMe: false }),
    redirect: 'error', signal: AbortSignal.timeout(20000),
  });
  const body = await response.json().catch(() => null);
  const result = { role, status: response.status, hasToken: typeof body?.token === 'string', expectedIdentity: body?.user?.id === users[role] };
  sessions.push(result);
  await writeFile(join(output, 'sessions.json'), JSON.stringify({ origin: base, sessions }, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify(result));
  if (!response.ok || !result.hasToken || !result.expectedIdentity) throw new Error('Native authentication failed; stopped before fixture writes');
  // Native WeWeb authentication uses the cookies issued by this fresh login.
  // Keep these dedicated test sessions in memory; never extract browser cookies.
  const cookie = response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
  if (!cookie) throw new Error('Native sign-in did not issue a session cookie');
  env[`WEWEB_${role.toUpperCase()}_TOKEN`] = cookie;
  const identityResponse = await fetch(base + '/api/simplyscan-audit/whoami', {
    headers: { Cookie: cookie }, redirect: 'error', signal: AbortSignal.timeout(20000),
  });
  const identity = await identityResponse.json().catch(() => null);
  result.identityStatus = identityResponse.status;
  result.identityVerified = identity?.id === users[role];
  await writeFile(join(output, 'sessions.json'), JSON.stringify({ origin: base, sessions }, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify({ role, identityStatus: result.identityStatus, identityVerified: result.identityVerified, responseKeys: identity ? Object.keys(identity) : [] }));
  if (identityResponse.status !== 200 || identity?.id !== users[role]) throw new Error('Native identity endpoint failed; stopped before fixture writes');
}
const child = spawnSync(process.execPath, ['--import', 'tsx', join(dirname(fileURLToPath(import.meta.url)), 'run-matrix.mts'), configFile, scanner, join(output, 'report.json')], {
  cwd: join(scanner, 'scripts/backend-audit'), env, stdio: 'inherit',
});
process.exitCode = child.status ?? 2;
