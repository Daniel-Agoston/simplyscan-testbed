# Answer key

Score a SimplyScan scan of https://daniel-agoston.github.io/simplyscan-testbed/ against this list.
"Check" = the id in SimplyScan's check registry (`src/lib/securityChecks.ts`).

## Secrets (all FAKE) · in `assets/app.js` unless noted
| # | Plant | Check | Expected |
|---|---|---|---|
| S1 | Stripe live secret key `sk_live_…` | secrets_api_keys, frontend_hardcoded_keys | critical |
| S2 | AWS access key ID `AKIA…` | secrets_api_keys | critical |
| S3 | AWS secret access key (`aws_secret_access_key = "<40 chars>"`) | secrets_api_keys | critical |
| S4 | GitHub token `ghp_…` | secrets_api_keys | critical |
| S5 | GitLab token `glpat-…` | secrets_api_keys | critical |
| S6 | Slack bot token `xoxb-…` | secrets_api_keys | critical |
| S7 | SendGrid key `SG.…` | secrets_api_keys | critical |
| S8 | Resend key `re_…` | secrets_api_keys | critical |
| S9 | Google OAuth client secret `GOCSPX-…` | secrets_api_keys | critical |
| S10 | Google API key `AIza…` | secrets_api_keys | high |
| S11 | OpenAI key `sk-proj-…` | ai_key_exposure, secrets_api_keys | critical |
| S12 | Anthropic key `sk-ant-…` | ai_key_exposure, secrets_api_keys | critical |
| S13 | Supabase **service_role** JWT | supabase_service_key | critical |
| S14 | Supabase anon JWT | (public by design: must NOT be reported as a leak) | none |
| S15 | Postgres connection string with password | arch_db_strings | critical |
| S16 | Hard-coded admin password | secrets_hardcoded_creds, auth_hardcoded_pw | high |
| S17 | High-entropy `api_secret` | secrets_high_entropy | high |
| S18 | Same secrets inside the source map `assets/app.js.map` | secrets_api_keys | critical |

## Exposed files
| # | Path | Check | Expected |
|---|---|---|---|
| F1 | `/.env` (fake keys) | frontend_exposed_env, secrets_env_refs | critical |
| F2 | `/config.json` (secret key + admin password) | exposed files | high |
| F3 | `/api/swagger.json` (internal API, "no auth" admin route) | exposed files, endpoints_unprotected | medium |
| F4 | `/wp-config.php.bak` (DB password) | exposed files | high |
| F5 | `/backup.zip` | exposed files | high |
| F6 | `/robots.txt` advertising `/admin` and `/backup.zip` | info | low |
| F7 | `/.git/config` | NOT PLANTABLE on GitHub Pages (git can't commit a `.git` folder) | n/a |

## Code patterns · `assets/app.js`
| # | Plant | Check | Expected |
|---|---|---|---|
| C1 | URL fragment into `innerHTML` | xss_inner_html, xss_unsanitized | high |
| C2 | `document.write` with user input | xss_document_write | high |
| C3 | `eval()` on a query parameter | injection_eval | critical |
| C4 | `new Function()` on a query parameter | injection_function | high |
| C5 | User text in an AI system prompt, called from the browser | ai_prompt_injection | high |
| C6 | Token stored in localStorage | auth_jwt | medium |
| C7 | `DEBUG = true` + secrets logged to the console | config_debug | medium |
| C8 | `http://localhost:3000/api` hard-coded | security_hardcoded_urls | low |

## Page · `index.html`
| # | Plant | Check | Expected |
|---|---|---|---|
| P1 | jQuery 1.12.4 + lodash 4.17.4 (known CVEs), no SRI | arch_vuln_libs | high |
| P2 | Render-blocking scripts in `<head>` | speed_blocking_loading | medium |
| P3 | 3000×2000 unsized hero image, no lazy loading | speed_image_preload / performance | medium |
| P4 | Money-moving POST form without CSRF token | security_csrf | medium |
| P5 | Form posting to plain `http://` + `http://` image (mixed content) | security_hardcoded_urls / mixed content | high |
| P6 | Analytics loaded before consent; no cookie banner; no privacy policy | GDPR | high |
| P7 | No `lang`, no meta description, no canonical, two `<h1>`, skipped heading levels | SEO | medium |
| P8 | Images without `alt`, low-contrast text, inputs without labels, a link with no text | accessibility | medium |
| P9 | Broken internal link `/does-not-exist` | SEO / links | low |
| P10 | No security headers (GitHub Pages sends no CSP, X-Frame-Options, Referrer-Policy) | security_headers | medium |

## Not covered here (needs a real backend)
Open Supabase tables (supabase_missing_rls, supabase_public_tables, supabase_weak_rls),
public storage buckets, unprotected endpoints, CORS, rate limiting: these need a live
Supabase project and are not part of this static testbed.

## Batch 10 XSS controls
- `/batch10/planted.html`: never-called static function, no submitted payloads. Expected source IDs: adjacent-html, iframe-srcdoc, angular-html-trust, sanitizer-discarded, dom-html, storage-html, window-name-html, message-html. Expected response gaps: csp-inline, csp-eval, csp-broad-source, csp-data-script, csp-object, csp-base, trusted-types. A missing source map or other independent page findings are not an XSS proof.
- `/batch10/clean.html`: textContent near-miss with a restrictive meta CSP. Expected zero XSS findings. Meta CSP is not claimed to enforce unsupported directives such as frame-ancestors.
- These fixtures contain no credentials, executable attack invocation, forms or database mutations.

Batch 10 source parity fixture: `src/batch10/xss-fixtures.tsx` is never loaded by
HTML. URL, repository and local-code detectors are passive; the source fixture
plants adjacent-html, iframe-srcdoc, angular-resource-trust, sanitizer-discarded,
window-name-html, react-html and lit-unsafe-html. The clean function uses textContent.
