# Native Zite permission testbed

Live app: https://wrrcxw37xc.zite.so
Editor: https://app.zite.com/workspace/c9765f75d3786c79/wrrcxw37xc/edit
Workspace/database: `c9765f75d3786c79`; app: `wrrcxw37xc`.
Published native commit: `367f1520c9f548b02c58cd9846b4d024f1110bf1`;
snapshot `5256598`. This directory mirrors the app's hand-authored files,
not Zite's generated SDK or any credentials.

## Plants and controls

- `publicCanary`: intentionally unauthenticated read of exactly one synthetic
  database row, selected by the fixed `simplyscan_public_canary_v1` fixture ID.
  The fake email is `synthetic-user@example.invalid`. Never put real data here.
- `whoami`: native authenticated identity control.
- `readOwned`, `createOwned`, `updateOwned`, `deleteOwned`: native authenticated
  workflows using `context.user.id`, owner-filtered reads, immutable ownership,
  bounded disposable IDs and markers. No admin bypass or public write route.
- Browser UI offers native sign-in and displays the testing limits.

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

## Not completed

Browser follow-up on 2026-10-16 (London time): connected Chrome control worked.
The live page's public-canary button returned exactly the expected synthetic
canary, and native hosted sign-in opened successfully. The external-users UI
was empty. Two dedicated test email accounts were requested; none were supplied
during this run, so authenticated cross-user tests remain pending. No sign-ups,
invitations, password changes, or paid upgrades were performed.

There are zero native Zite test users. Two genuine signed-in users are needed to
verify working owner access, reverse isolation, and ownership-transfer denial.
The synthetic row's owner label is NOT a login. Native sign-in uses the hosted
Zite flow; do not fabricate sessions or treat mocked identities as live proof.

The generic SimplyScan HTTP audit example is not this app's wire contract.
Zite's SDK uses POST `/api/<endpoint>` with `{inputs,mode:"live"}` and native
session handling; the current generic adapter requires an identity GET and
three authenticated identities, including an admin. A native adapter or an
explicit compatible owner-reviewed contract is still needed for its full matrix.

The app-builder tools started a seven-day free trial ending 2026-10-22. No paid
upgrade was purchased. See Zite's account for ongoing availability.
