# Delivery plan: Test (Infinae site)

Updated 2026-11-26. This repo is PUBLIC: no secrets, no personal data in git.

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

## Unfinished
1. Airtable save path is untested end to end (needs a test base and env vars set in Vercel: AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME). Check: submit a test enquiry on a preview deployment and see one new row. Waiting on Ntsakisi.
2. The contact page sends `interest`, `source`, `ml_group`; only `interest` is stored (as Business Stage). Decide whether Airtable needs an "Area of interest" column. Check: field exists and is filled.
3. Rate limiting on `/api/intake` (spam). Check: 6th post in a minute from one IP gets 429. Needs a store (Vercel KV or Edge Config), so a decision on cost first.
4. Legal pages (privacy, terms, refund) need review by an attorney or the Information Officer (POPIA consent wording). Check: sign-off recorded.
5. Template leftovers: `src/content/blog`, `authors`, `elements.mdx` look like starter content. Check: removed or replaced.
6. Accessibility and phone checks (390 px) with the library UX gate. Check: zero PROBLEM lines.
