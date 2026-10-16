# Native Zite permission testbed

Live app: https://wrrcxw37xc.zite.so
Editor: https://app.zite.com/workspace/c9765f75d3786c79/wrrcxw37xc/edit
Workspace/database: `c9765f75d3786c79`; app: `wrrcxw37xc`.
Published native commit: `e56646437e0683dbe9d9365c8f70e39985a23083`;
snapshot `5264507`. This directory mirrors the app's hand-authored files,
not Zite's generated SDK or any credentials.

## Plants and controls

- `publicCanary`: intentionally unauthenticated read of exactly one synthetic
  database row, selected by the fixed `simplyscan_public_canary_v1` fixture ID.
  The fake email is `synthetic-user@example.invalid`. Never put real data here.
- `whoami`: native authenticated identity control.
- `readOwned`, `createOwned`, `updateOwned`, `deleteOwned`: native authenticated
  workflows using `context.user.id`, owner-filtered reads, immutable ownership,
  bounded disposable IDs and markers. All remain native-authenticated.
- A third native identity, pinned in `src/fixturePolicy.ts`, has fixture-only
  seed/read/delete access. It can seed records only for the two established test
  owners. Admin reads/deletes require a 15-hex fixture ID, bounded audit marker,
  exact synthetic email and one of those owners. Admin updates are denied.
  Normal users retain owner-filtered reads/deletes and immutable ownership.
- Endpoint execution explicitly parses strict input schemas before database
  access. Zite's declared `inputSchema` alone did not enforce runtime validation.
- Browser UI offers native sign-in, signed-in CRUD checks, and staged cross-user
  checks. Calls use the generated SDK and the real hosted session. It saves only
  nonsecret fixture metadata and the latest report in localStorage.

## Verification on 2026-10-15

Zite `check_app` passed type checking and endpoint bundling; the app was committed,
built and published. `node fixtures/zite/verify-anonymous.mjs` passed 11 live checks:
the synthetic canary was readable; all five protected endpoints rejected both
anonymous and invalid-token requests with HTTP 401. Independent native database
inspection found only the one permanent canary, no disposable records. Live
endpoint error logs were empty, with published and latest snapshots equal.

A production SimplyScan URL scan returned a `Zite platform coverage` advisory,
explicitly stating that native permissions remain unverified. That public scan
does **not** replay arbitrary Zite POST workflows or prove row isolation.

## Signed-in verification on 2026-10-16 (London)

Daniel signed in through native hosted login. **10/10 signed-in checks passed**:
native identity, own create/read/update/delete, immutable owner, duplicate-create
rejection, mismatched-owner create rejection, denied-write integrity and cleanup.
The mismatched owner was a synthetic label; this is not a second real login.
Independent database inspection confirmed only the permanent canary remained.
The 11 anonymous/invalid-token checks passed again on the new published snapshot.
Evidence is in `evidence/2026-10-16-*.json`. Type checking and endpoint bundling
passed. Live execution logs confirmed snapshot `5257565`, including the three
expected 403 failures; published and latest snapshots match.

## Cross-user verification on 2026-10-16 (London)

Two distinct hosted identities are now verified. The second user passed **10/10**
own CRUD checks and **7/7** isolation checks against the first user's real record:
foreign read returned null; update with either owner's ID, delete, overwrite,
and create on behalf of the other owner were rejected with 403. Independent
database inspection confirmed the first user's record was unchanged and no
unexpected rows were created. See the `second-user`, `cross-b-to-a`, and
`cross-b-to-a-integrity` evidence JSON files.

## Completed reverse-direction checks and cleanup

The first user signed back in and passed **7/7** reverse-isolation checks against
the second user's real record. Both records retained their exact original owner
and marker under independent native database inspection. The first owner also
verified its unchanged record, deleted it through the real native session, and
confirmed an empty read. The second cross-user fixture was then deleted through
the administrative MCP data tool after its integrity was verified; that cleanup
is not counted as an authorization test. Each user's own-session delete was
already verified in its ten-check control suite.

**45 fixture checks passed:** 11 anonymous/invalid-token, 10 own-access checks
per real user, and 7 cross-user checks in each direction. The anonymous suite
also passed again on final snapshot `5258612`. This is a fixture-specific
native SDK/browser test, not the generic scanner's 18-check HTTP matrix.
Final native database inspection found only the permanent synthetic public
canary; no disposable rows remained. Browser fixture metadata was cleared.
The `cross-a-to-b`, `cross-final-integrity`, `owner-final-cleanup`,
`final-cleanup`, and `final-execution-logs` evidence files record this closeout.
Native latest/published snapshots match. No invitations, password changes,
policy changes, or paid upgrades were performed.

The synthetic row's owner label is NOT a login. Native sign-in uses the hosted
Zite flow; do not fabricate sessions or treat mocked identities as live proof.

The generic SimplyScan HTTP audit example is not this app's wire contract.
Zite's SDK uses POST `/api/<endpoint>` with `{inputs,mode:"live"}` and native
session handling. The scanner's 2026-10-16 follow-up now supports explicit POST
identity checks, the `zite-live` envelope, and owner-supplied Cookie sessions in
its reusable HTTP adapter. `scripts/backend-audit/zite-example.json` documents
the editable contract. Local protected/leaky protocol fixtures pass; the live
WeWeb deployment also passed the generic Cookie adapter's 18 checks.

## Completed three-role CLI audit

On 2026-10-16, a third genuine hosted identity was created for fixture
administration, separate from both normal users. The reusable scanner CLI passed
**18/18 checks** (12 CRUD + six ownership/isolation), with `complete: true`,
`cleanup: verified`, and no leftover IDs. The final run used snapshot `5264507`.
Three exact native identities were verified before any CLI fixture writes.

Additional live scope tests passed **20/20**: the admin could not read/delete/
update/overwrite three synthetic sentinels with a wrong owner, marker, or email;
could not create for itself or unrelated owners; could not inject extra fields;
and could not access the permanent canary through owned-record routes. Its
valid seed/read/delete controls passed and updates stayed denied. Four local
policy tests passed. An initial scope probe exposed missing runtime schema
validation; the failed report is retained and was superseded by explicit parsing
and the successful final reruns. No malformed fixture was left behind.

Independent database inspection verified all three sentinels unchanged before
administrative removal. Final inspection found only the permanent public canary.
Temporary session files were stored privately, used only at this app origin,
and deleted after verification; no credentials are in the reports or repository.
Tailwind, braces, dependencies, and the shared scanner worktree were not modified.

Evidence: `evidence/2026-10-16-cli-{report,identities,config,final-cleanup}.json`
and `evidence/2026-10-16-admin-scope-{final,integrity}.json`.
To rerun, supply private (0600) `admin.json`, `owner.json`, and `other.json`
in a private (0700) directory, each with `origin`, native `id`, and `cookie`.
Use real active sessions scoped to this app; server logout can revoke them.
```sh
node fixtures/zite/verify-live.mjs PRIVATE_SESSION_DIRECTORY SCANNER_REPO NEW_OUTPUT_DIRECTORY
node --test fixtures/zite/fixture-policy.test.mjs
```
The runner invokes the scanner's existing `scripts/backend-audit/cli.ts`;
it does not replace the matrix or fabricate native identities. Scope probes
use `verify-admin-scope.mjs` with three independently seeded sentinel rows;
inspect them independently and remove them administratively after testing.
Results cover this fixture contract, not all native Zite resources or roles.

The app-builder tools started a seven-day free trial ending 2026-10-22. No paid
upgrade was purchased. See Zite's account for ongoing availability.
