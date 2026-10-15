# Backend testbed answer key

Target: https://simplyscan-backend-testbed.lovable.app/
Lovable project: b3c6311a-e1a2-428e-a307-ae0bd8ac695c
Supabase project: whicvhscrqqxnprjxxan
Public key: new-style `sb_publishable_…`, shipped in /assets/index-*.js (public by design).
All data is FAKE. Created 2026-10-14. Planted with SQL through Lovable query_database.

| # | Plant | How to reproduce (public key only) | Expected |
|---|---|---|---|
| B1 | `notes`: RLS OFF; anon can SELECT (writes revoked 2026-10-14 so nobody can empty or flood the fixture) | GET /rest/v1/notes → rows; POST → 401 | critical (supabase_missing_rls) |
| B2 | `profiles` (fake names/emails/phones): RLS ON, but the SELECT policy "anyone can read" is `USING (true)` for anon (write policy removed 2026-10-14) | GET /rest/v1/profiles | critical (supabase_weak_rls) |
| B3 | `api_keys` (FAKE secrets): readable by anon | GET /rest/v1/api_keys | critical (supabase_public_tables) |
| B4 | `orders`: RLS ON, NO policies = SECURE negative control | GET returns [] | must NOT be reported |
| B5 | Storage bucket `private-docs` is public: `contracts/2026-acme-contract.txt` (fake) | GET /storage/v1/object/public/private-docs/contracts/2026-acme-contract.txt | high (public bucket) |
| B6 | RPC `get_all_users()` SECURITY DEFINER, EXECUTE granted to anon, returns every profile | POST /rest/v1/rpc/get_all_users | high |
| B7 | /api/public/public-stats: no auth, `Access-Control-Allow-Origin: *` | GET with any Origin | medium (CORS / unprotected endpoint) |

Abuse limits: anon has SELECT only on every fixture table (INSERT/UPDATE/DELETE/TRUNCATE revoked 2026-10-14), cannot upload files (upload policy dropped), and length CHECKs remain.

## Scores
- 2026-10-14 19:51Z Pro scan dac67238 (scan-url before #124): 0 Supabase findings, score 95. Missed B1–B7.
- 2026-10-14 19:59Z rescan 29884365 (#124 caccdc1): B1 notes (high), B2 profiles (critical), B3 api_keys (critical), B5 private-docs bucket (high) FOUND; B4 correctly NOT reported; score 49. B6 not probed BY DESIGN (calling an RPC can change data); B7 open endpoint not found (the scanner does not discover in-app API routes).
- 2026-10-14 20:14Z Pro scan c4ae001e (cefb183, #125/#126 by peer 3d): B1 B2 B3 B5 + B6 get_all_users() (high, GET read-only) + B7 /api/public/public-stats (medium, CORS *) FOUND; B4 silent; Lovable's own /api/broadcast correctly skipped. Score 37. ALL 7 plants covered.

## GraphQL (added 2026-10-14, for multi-backend detection)
| # | Plant | How to reproduce (public key only) | Expected |
|---|---|---|---|
| B8 | Supabase GraphQL endpoint (pg_graphql 1.6.2) at /graphql/v1 returns the same open tables: `{profilesCollection(first:2){edges{node{email}}}}` → fake emails | POST /graphql/v1 with apikey, a read-only QUERY | critical (same exposure as B2, via GraphQL) |
| B9 | Negative control: `ordersCollection` returns no rows (RLS on, no policy) | same | must NOT be reported |
Note: schema introspection (`__schema`) is DISABLED for anon by pg_graphql's default; a scanner must use the table names from the app's code or common names, not introspection.

## Firebase + Appwrite (added 2026-10-14) — page: https://daniel-agoston.github.io/simplyscan-testbed/backends/
Dedicated free projects, fake data only. The page's code names every backend, so a scanner finds them the way it would in a real app.
| # | Plant | Reproduce (no sign-in) | Expected |
|---|---|---|---|
| F1 | Firebase Realtime Database `profiles` readable by anyone (rules: root locked, `profiles` .read true) | GET https://simplyscan-testbed-default-rtdb.firebaseio.com/profiles.json | critical |
| F2 | RTDB `orders` + root = CONTROL | GET …/orders.json and …/.json → "Permission denied" | must NOT be reported |
| F3 | Firestore `profiles` readable by anyone | GET https://firestore.googleapis.com/v1/projects/simplyscan-testbed/databases/(default)/documents/profiles | critical |
| F4 | Firestore `orders` = CONTROL | same path /orders → 403 PERMISSION_DENIED | must NOT be reported |
| A1 | Appwrite TablesDB `profiles` (table 6acff87a000d1ed3b38a), permission Any→Read | GET https://fra.cloud.appwrite.io/v1/tablesdb/6acff3a7002c2817568e/tables/6acff87a000d1ed3b38a/rows with header X-Appwrite-Project: 6acfeb8400096039ece0 | critical |
| A2 | Appwrite `orders` (table 6acffa0b000b6edf2d57), no permissions = CONTROL | same → 401 user_unauthorized | must NOT be reported |
Notes: Appwrite refuses strangers a table list (401 missing scopes) → table ids must come from the page code. The Firebase web key is public by design (every Firebase web app ships it); it is stored scrambled in fakes.scrambled.json only so GitHub push protection doesn't block the repo.
PocketBase: see ~/simplyscan-testbed-pb/ANSWER-KEY.md (runs on Daniel's Mac, URL changes per start).

## Full rescan 2026-10-15 (live scanner 104209b: Codex's backend audit + Firebase call-style fix)
| Target | Pro scan | Result |
|---|---|---|
| backends/ page (Firebase + Appwrite) | e7545f1f | F1 RTDB profiles HIGH, F3 Firestore profiles HIGH, A1 Appwrite profiles HIGH; F2/F4/A2 controls silent; score 69. (Before the fix, F1 and F3 were MISSED.) Plus an AI-only, unscored "Hardcoded Firebase API Key" medium — the key is public by design. |
| PocketBase (tunnel URL of the day) | f2a0acd7 | PB1 profiles HIGH; PB2 orders silent; score 79 |
| Supabase backend | 047d3600 | B1–B7 all found, B4/B9 silent, score 37 (B8 GraphQL = same data as B2; the app's code names no GraphQL endpoint, so no separate finding) |
| Static site | 173f059f | 94 findings, 9 code plants, 25 secret/exposed-file findings, source map, swagger, contrast, broken links, unsized image; 0 duplicate titles — no regression |

## GraphQL on the backends/ page (added 2026-10-15; endpoint https://whicvhscrqqxnprjxxan.supabase.co/graphql/v1, sb_publishable key)
| # | Plant | How the scanner can know it | Expected |
|---|---|---|---|
| G1 | `query Profiles { profilesCollection … full_name email phone }` in the page code | static source binding (url + query object) | HIGH: anonymous read of personal fields |
| G2 | `query Orders { ordersCollection … }` (RLS on, no policy) | same | CONTROL: returns no rows → must NOT be reported |
| G3 | persisted query sent as hash a406eb55… only (PublicProfiles: full_name email) | public discovery: ./persisted-query-manifest.json beside the page (Apollo manifest) | HIGH after recovery |
| G4 | persisted query sent as hash d9454c57… only (PrivateContacts: full_name phone) | ONLY in the private repo Daniel-Agoston/simplyscan-private-registry (persisted-documents.json) → needs owner GitHub import with a read-only token | before import: "unresolved hash" (not safe, not a leak); after import: HIGH |
A hash-only request to pg_graphql answers `argument 0 must not be null`: the server has no persisted-query store, so the scanner must recover the document and replay the full (read-only) query.
Isolation page https://daniel-agoston.github.io/simplyscan-testbed/backends/graphql-persisted/ sends ONLY the G3 and G4 hashes (no query text), with its own copy of the public list: a finding there can only come from recovered persisted queries.
