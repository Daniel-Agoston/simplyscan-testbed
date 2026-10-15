# Native Zite permission testbed

Live app: https://wrrcxw37xc.zite.so
Editor: https://app.zite.com/workspace/c9765f75d3786c79/wrrcxw37xc/edit
Workspace/database: `c9765f75d3786c79`; app: `wrrcxw37xc`.
Published native commit: `762b3db2a3a75481bac14c29ed56a38f2963e636`;
snapshot `5257565`. This directory mirrors the app's hand-authored files,
not Zite's generated SDK or any credentials.

## Plants and controls

- `publicCanary`: intentionally unauthenticated read of exactly one synthetic
  database row, selected by the fixed `simplyscan_public_canary_v1` fixture ID.
  The fake email is `synthetic-user@example.invalid`. Never put real data here.
- `whoami`: native authenticated identity control.
- `readOwned`, `createOwned`, `updateOwned`, `deleteOwned`: native authenticated
  workflows using `context.user.id`, owner-filtered reads, immutable ownership,
  bounded disposable IDs and markers. No admin bypass or public write route.
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

## Remaining cross-user work

One genuine test user is now available. A second genuine signed-in user is needed
to verify cross-user access denial and reverse isolation. One disposable owner
record is prepared for that handoff; see `evidence/2026-10-16-cross-pending.json`.
Use the same browser profile so the nonsecret fixture metadata remains available.
Sign in as the second user and run both signed-in and cross-user checks; save each
report before the next button replaces it. Return to the original owner and use
"Verify original owner and clean up". Then repeat with the two roles reversed.
Do not count the staged cross-user UI as executed evidence until both real users
complete it. No invitations, password changes, or paid upgrades were performed.

The synthetic row's owner label is NOT a login. Native sign-in uses the hosted
Zite flow; do not fabricate sessions or treat mocked identities as live proof.

The generic SimplyScan HTTP audit example is not this app's wire contract.
Zite's SDK uses POST `/api/<endpoint>` with `{inputs,mode:"live"}` and native
session handling; the current generic adapter requires an identity GET and
three authenticated identities, including an admin. A native adapter or an
explicit compatible owner-reviewed contract is still needed for its full matrix.

The app-builder tools started a seven-day free trial ending 2026-10-22. No paid
upgrade was purchased. See Zite's account for ongoing availability.
