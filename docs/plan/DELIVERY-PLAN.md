# Delivery plan: Test (Infinae site)

Updated 2026-11-27. This repo is PUBLIC: no secrets, no personal data in git.

## What it is for
An Astro 7 site (Vercel, server output) for "Infinae": luxury advisory pages (advisory, philosophy, language of luxury, experiences, contact) with an intake form that posts to `/api/intake`, which saves to Airtable using environment variables.

## Done on 2026-11-26
| Item | Acceptance check | Status |
| --- | --- | --- |
| Upgrade astro 6 to 7.4.13 and @astrojs/vercel to 11.0.22; override path-to-regexp ^6.3.0 | `npm audit --audit-level=high` exits 0; `npm run build` completes | Verified |
| Server-side validation of the intake form (`src/lib/intake-validate.js`) | `npm test`: 7 pass, including the live field names | Verified |
| Fix intake consent bug: form sends consent=yes, handler only accepted "on", so consent was always saved as false | test "accepts the live contact form field names" | Verified |
| Honeypot `company_website` is now honoured | test "flags the live honeypot field" | Verified |
| CI: install, test, build, audit, gitleaks | Actions run on b9b2ddc: success | Verified |
| Stop tracking .DS_Store files | `git ls-files | grep DS_Store` is empty | Verified |

## Done on 2026-11-27
| Item | Acceptance check | Status |
| --- | --- | --- |
| Template leftovers removed (blog, authors, elements, starter config, unused parsers, hooks, types, content collections) | build passes; no page imports them | Verified 2026-11-27 |
| Privacy, terms and refund pages now use the shared layout (title, meta, lang) | e2e: every page has lang, title, one h1, one main | Verified 2026-11-27 |
| Layout referenced missing /favicon.svg and og-default.jpg; now the real files in /images | e2e: no failed same-origin requests | Verified 2026-11-27 |
| 404 page has nav and footer | e2e on /no-such-page | Verified 2026-11-27 |
| Rate limit on `/api/intake` (in memory, per server instance; settings INTAKE_RATE_MAX default 5, INTAKE_RATE_WINDOW_SECONDS default 60) | `npm test` and e2e: 6th post from one address gets 429 | Verified 2026-11-27 |
| Optional Airtable columns for area of interest, source, group: only sent when AIRTABLE_INTEREST_FIELD, AIRTABLE_SOURCE_FIELD, AIRTABLE_GROUP_FIELD name a column (default: not sent) | `npm test` | Verified by unit test |
| Dry run setting INTAKE_DRY_RUN=1: validates and answers success, saves nothing | e2e runs the server in this mode | Verified 2026-11-27 |
| Contact form status is announced to screen readers and shows field errors; no innerHTML | e2e + axe | Verified 2026-11-27 |
| Production-build e2e walk of every page at 390 and 1280 px (`npm run e2e`): status, lang, title, h1, images, links, sideways scroll, axe WCAG 2.x AA, console errors, form behaviour, API | `npm run e2e` prints `E2E: N checks passed, 0 failed` | Verified 2026-11-27 |
| `.astro/` generated folder no longer tracked | `git ls-files .astro` is empty | Verified |

## Settings (his choices become settings; defaults are safe)
INTAKE_DRY_RUN (default off), INTAKE_RATE_MAX (5), INTAKE_RATE_WINDOW_SECONDS (60), AIRTABLE_INTEREST_FIELD / AIRTABLE_SOURCE_FIELD / AIRTABLE_GROUP_FIELD (unset = not sent), AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME (Vercel environment only).

## Unfinished
1. Airtable save path is untested end to end (needs a test base and env vars set in Vercel). Check: submit a test enquiry on a preview deployment and see one new row. Waiting on Ntsakisi.
2. Area of interest column: built as a setting; turn on by creating the column in Airtable and setting AIRTABLE_INTEREST_FIELD. Waiting on Ntsakisi.
3. Rate limit is per server instance (memory). A shared store (Vercel KV or Edge Config) would make it global: cost decision first.
4. Legal pages (privacy, terms, refund) need review by an attorney or the Information Officer (POPIA consent wording). Wording is not changed here. Check: sign-off recorded.
5. UX gate (2026-11-27): rendered check + axe-core `9 page(s) at 320, 390, 1280px: 0 problems, 0 warnings. UX render check OK`; `E2E: 463 checks passed, 0 failed` (first run found 46 failures: gold text on cream below 4.5:1 contrast, contact page without footer, footer heading jump, small consent box and menu button; all fixed in the site). NOT RUN: the source audit (`ux_audit.py`) reads 0 screens because it does not read .astro files; ui/theme-contrast-test not run (site has no theme tokens file); dark scheme not applicable (no dark theme).
6. Legal sign-off and the Airtable end-to-end test remain with Ntsakisi (items 1 and 4).
