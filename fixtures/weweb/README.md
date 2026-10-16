# Native WeWeb permission testbed

Published fixture: https://laminated-raster-production.weweb.io

On 2026-10-16 (London time), the native production fixture passed all **18 live
permission checks**: anonymous/owner/other CRUD, the second user's positive
control, reverse isolation, and two ownership-transfer attempts. All three
dedicated accounts signed in through native WeWeb authentication and returned
their expected identities. Cleanup was verified by the matrix and by the empty
production table in the WeWeb editor. See `evidence/2026-10-16-report.json` and
`evidence/2026-10-16-sessions.json`; neither contains credentials.

The original editor debug tests bypassed HTTP access gates and were not evidence
of real-session permissions. Publishing exposed two transport issues: WeWeb
adds `/api` to workflow paths, and the native session endpoint accepts issued
session cookies rather than the generic adapter's bearer header. The fixture
now uses distinct POST routes with named body parameters. Its existing owner
guards, immutable ownership and bounded disposable IDs/markers are preserved.

The original `run-matrix.mts` supplied native cookie transport to the scanner repository's
existing `auditPermissions` matrix. It verifies exact account identities before
writes, restricts requests to this testbed, rejects redirects, bounds responses,
and reserves a new report file before writes. Authentication cookies come only
from fresh HTTP logins using the dedicated credentials, never from the browser.

The 2026-10-16 follow-up moves `verify-live.mjs` onto the scanner's reusable
HTTP CLI, configured with explicit Cookie credentials and POST operations.
Fresh native logins and all **18/18 live checks passed again**, with cleanup
verified and zero leftover IDs. See `evidence/2026-10-16-generic-cli-report.json`.
The old adapter remains for historical reproducibility; the runner no longer
requires its fixture-specific transport. The scanner checkout must include the
Cookie-session HTTP adapter changes. This live fixture evidence is separate
from production scanner deployment verification.

Run with the existing private credential files in
`~/simplyscan-testbed-weweb/{admin,owner,other}.json`:

```sh
node fixtures/weweb/verify-live.mjs \
  https://laminated-raster-production.weweb.io \
  /path/to/simplyscan \
  /path/to/new-evidence-directory
```

The scanner checkout needs its `scripts/backend-audit` dependencies installed.
The output directory must not already exist. Secrets remain in process memory
and are not written to evidence. The fixture workflow safety suite is:

```sh
node --test fixtures/weweb/workflows.test.mjs
```

No upgrade was purchased. This tests the dedicated published native fixture,
not all WeWeb permission configurations. Staging was not available in the UI
and was not tested. Policy extraction remains unavailable. Public SimplyScan
scans still do not run authenticated writes or award a native permission pass.
