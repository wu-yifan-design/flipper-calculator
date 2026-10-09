# Offer Floor — eBay sports-card flip & offer calculator

Static, mobile-first, no build step. Open `index.html` via any static host.

## Files
| Path | What |
|---|---|
| `index.html` | Calculator (3 tabs: Buy it? / Accept offer? / Promote?) + waitlist |
| `js/rates.js` | **All eBay fee + shipping rates — VERIFIED 2026-10-09** (sources: /workspace/PeopleBob/rates-sources.md). Edit here only; bump `updatedAt` on every change. |
| `js/fees.js` | Pure fee math (`FeeCalculator`, `Money`), shared with Node tests |
| `js/site-config.js` | Analytics/form backend switch (`provider`, `endpoint`) + waitlist product copy/prices |
| `js/analytics.js` | `Attribution` (utm/referrer, first+last touch persisted), `Analytics` (events) |
| `js/waitlist.js` | Reusable `WaitlistWidget` (email + Pre-order fake door) |
| `waitlist-template.html` / `js/waitlist-page.js` | Template for any new waitlist page |
| `cleaner.html` | Day-8 "sold-price cleaner" waitlist, pre-built (noindex, unlinked until `enabled:true`) |
| `backend/apps-script/Code.gs` | Free backend: Google Sheet collects events + emails, GET returns daily metrics |
| `scripts/daily-metrics.mjs` | Prints daily metrics by source + kill-line progress |
| `tests/fees.test.js` | `node --test tests/` |

## Math
fees base = item price + shipping charged + buyer sales tax (eBay charges on tax too — flags in rates.js).
`net = item + shipping charged − label − supplies − FVF(tiered) − per-order fee − ad rate × base − buy cost`.
Max buy = payout − target profit. Min offer = smallest cent item price with net ≥ floor (closed-form per fee segment; brute-force verified in tests).

## Events (every event carries source, first_source, utm_*, referrer host, anonymous visitor_id)
`page_visit`, `calculated` (once per page view, `first_ever` flag), `email_submitted` (email goes to the "emails" sheet only), `preorder_click` (product, plan, price).
Source = utm_source, else referrer bucket (reddit / x / google / host), else `direct`. Use links like `?utm_source=reddit&utm_campaign=<post-slug>`.

## Go live (GitHub Pages + Apps Script)
1. Google: sheets.new → Extensions → Apps Script → paste `Code.gs` → Script property `READ_KEY` → Deploy as Web app (Execute as me, Anyone). Copy `/exec` URL.
2. `js/site-config.js`: `provider: "webhook"`, `endpoint: "<exec URL>"`.
3. Push this folder to a public GitHub repo → Settings → Pages → Deploy from branch `main` / root. URL: `https://<user>.github.io/<repo>/`.
4. Daily: `METRICS_URL=<exec> METRICS_KEY=<READ_KEY> node scripts/daily-metrics.mjs 14`.
Local dev with `provider:"none"`: events go to console + `localStorage.flip_debug_events`.
