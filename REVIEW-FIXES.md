# ReviewBoost — reviewed authentication fixes

These are edited *copies* of the uploaded files, not a deployed or live-tested Supabase app. The JavaScript was statically checked with Node. No private account was used.

## Before testing
1. Back up your database and check `public.users` and `public.businesses` schemas (especially column types, required columns and defaults).
2. **Only after reviewing** `reviewboost-signup-trigger.sql`, apply it once in Supabase SQL Editor. If an auth-user trigger already exists, modify the existing trigger instead of registering a second one. Test it in a development project first. Failure in this trigger prevents signups.
3. Leave RLS enabled. Verify that authenticated owners can SELECT their own `users` and `businesses` records and access the reviews/customer tables they own. Do not expose the service-role key in any browser script.
4. In Supabase Auth URL Configuration, set your actual Site URL, plus the *exact* `https://<your-site>/update-password.html` and `https://<your-site>/login.html` in Redirect URLs. Also permit localhost URLs if testing locally.
5. Serve the files over http://localhost or HTTPS, not file://. Confirm the external Supabase CDN script loads before `api.js`.
6. Deploy the corrected filename `update-password.html` (the original was misspelled `update-passowrd.html`).

## Changes
- Signup now passes `business_name` in auth metadata and checks returned `data.user` safely. Provisioning is moved to a database trigger, so email confirmation doesn't break RLS.
- Password reset redirect uses a path relative to the current page, rather than assuming the app is hosted at `/`.
- Password-update page checks for a valid auth session before calling `updateUser` and listens for recovery events; confirms completion and attempts sign-out.
- Login and settings links now use the provided `dashboard.html` rather than an absent `dashboard_2.html`.
- Removed duplicate page-specific scripts from dashboard/reviews/analytics.
- Fixed the Facebook review-counting expression in analytics.js.
- Added a clear error if the Supabase CDN browser bundle is unavailable.

## Remaining work and limitations
- The actual Supabase schema, current trigger definitions, RLS policies, and Authentication settings were **not** provided, so SQL migration compatibility cannot be confirmed; carefully review before running it.
- Existing accounts created by an earlier broken signup may have missing users/businesses rows. The trigger only runs for *new* auth.users records. Backfill these manually after verification; don't casually delete valid user accounts.
- Dashboard/analytics/reviews functions depend on the database's table fields and RLS policies. They have not been end-to-end tested against a live Supabase project.
- `settings.html` only displays a simulated save confirmation; it doesn't persist to Supabase.
- `dashboard.html` and `settings.html` contain "Log out" hyperlinks that do not call `supabase.auth.signOut()`. Add real sign-out logic before production.
- `dashboard.js` uses a hard-coded `https://reviewboost.app/feedback.html` URL; ensure it matches the deployed website, or generated feedback links may fail.
- `api.js` contains a public anon key, which is expected for a browser client; a service-role secret must **never** be included there. Keep RLS enabled.
- Review customer/review text rendering for HTML injection, and ensure publicly accessible feedback endpoints are guarded by secure token checks and restrictive RLS/RPC policies.
