# Offer Floor — eBay sports-card flip & offer calculator

Static, mobile-first, no build step. Open `index.html` via any static host.

## Files
| Path | What |
|---|---|
| `index.html` | Calculator (3 tabs: Buy it? / Accept offer? / Promote?) + waitlist |
| `js/rates.js` | **All eBay fee + shipping rates — VERIFIED 2026-10-09** (sources: /workspace/PeopleBob/rates-sources.md). Edit here only; bump `updatedAt` on every change. |
| `js/fees.js` | Pure fee math (`FeeCalculator`, `Money`), shared with Node tests |
| `js/site-config.js` | Analytics/form backend (`provider:"supabase"`, `supabaseUrl`, `anonKey`) + waitlist product copy/prices |
| `js/analytics.js` | `Attribution` (utm/referrer, first+last touch persisted), `Analytics` (events) |
| `js/waitlist.js` | Reusable `WaitlistWidget` (email + Pre-order fake door) |
| `waitlist-template.html` / `js/waitlist-page.js` | Template for any new waitlist page |
| `cleaner.html` | Day-8 "sold-price cleaner" waitlist, pre-built (noindex, unlinked until `enabled:true`) |
| `backend/supabase/schema.sql` | Supabase tables (insert-only for anon) + `daily_metrics(p_key, p_days)` RPC. Read key is a placeholder — set it in Supabase, never in the repo |
| `scripts/daily-metrics.mjs` | Prints daily metrics by source + kill-line progress (env: SUPABASE_URL, SUPABASE_ANON_KEY, METRICS_KEY) |
| `tests/fees.test.js` | `node --test tests/` |

## Math
fees base = item price + shipping charged + buyer sales tax (eBay charges on tax too — flags in rates.js).
`net = item + shipping charged − label − supplies − FVF(tiered) − per-order fee − ad rate × base − buy cost`.
Max buy = payout − target profit. Min offer = smallest cent item price with net ≥ floor (closed-form per fee segment; brute-force verified in tests).

## Events (every event carries source, first_source, utm_*, referrer host, anonymous visitor_id)
`page_visit`, `calculated` (once per page view, `first_ever` flag), `email_submitted` (email goes to the `emails` table only, never into `events`), `preorder_click` (product, plan, price).
Source = utm_source, else referrer bucket (reddit / x / google / host), else `direct`. Use links like `?utm_source=reddit&utm_campaign=<post-slug>`.

## Backend (Supabase free tier)
1. Run `backend/supabase/schema.sql` in the Supabase SQL editor (with your own read key).
2. `js/site-config.js`: fill `supabaseUrl` and `anonKey` (anon key is public by design; RLS = insert-only). Until both are set, events go to console + `localStorage.flip_debug_events` only.
3. Daily: `SUPABASE_URL=... SUPABASE_ANON_KEY=... METRICS_KEY=... node scripts/daily-metrics.mjs 14` (`--json` for raw rows).
**Never commit METRICS_KEY** — this repo is public.

Hosting: GitHub Pages from `main` / root → https://wu-yifan-design.github.io/flipper-calculator/
