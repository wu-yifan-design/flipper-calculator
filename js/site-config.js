/*
 * Site config: the ONLY place to plug in the analytics/form backend.
 *
 * provider:
 *   "none"     – no network calls; events are logged to console + localStorage
 *                ("flip_debug_events") so you can test locally.
 *   "supabase" – insert rows via Supabase REST (anon key, insert-only RLS):
 *                events -> {supabaseUrl}/rest/v1/events, emails -> {supabaseUrl}/rest/v1/emails.
 *                The anon key is PUBLIC by design (insert-only). NEVER put the metrics
 *                read key (METRICS_KEY) here — it lives only in the reader's env.
 *   "webhook"  – POST each event as JSON (text/plain) to `endpoint` (generic fallback).
 * If the chosen provider is missing its URL/key, it falls back to "none".
 */
(function (root) {
  const SITE_CONFIG = {
    analytics: {
      provider: "supabase", // "none" | "supabase" | "webhook"
      supabaseUrl: "", // e.g. "https://abcdefghijklmno.supabase.co"  (no trailing slash)
      anonKey: "", // Supabase anon/public key (Project Settings -> API). Insert-only via RLS.
      endpoint: "", // only for provider "webhook"
      site: "flipper-calculator",
    },
    // Waitlist products. Day-8 page = add a new HTML file from waitlist-template
    // (see cleaner.html) and set enabled: true here.
    waitlists: {
      "offer-floor-pro": {
        enabled: true,
        title: "Get the pro version first",
        pitch:
          "Saved items, bulk offer checks and rate-change alerts. Join the waitlist — we'll email you once, when it opens.",
        preorderLabel: "Pre-order",
        prices: [], // no price test on the calculator page
      },
      "sold-price-cleaner": {
        enabled: false, // flip to true on day 8
        title: "Sports-card sold-price cleaner",
        pitch:
          "eBay sold listings for cards are flooded with breaks and lots. We filter them out so you see the real single-card sold price.",
        preorderLabel: "Pre-order",
        // Pricing test (no source; for demand testing only). One monthly price is
        // assigned per visitor and kept sticky in localStorage.
        prices: [
          { id: "monthly", variants: [5, 7, 9], label: (p) => `$${p}/month` },
          { id: "lifetime", variants: [29], label: (p) => `$${p} lifetime` },
        ],
      },
    },
  };
  if (typeof module !== "undefined" && module.exports) module.exports = SITE_CONFIG;
  else root.SITE_CONFIG = SITE_CONFIG;
})(typeof self !== "undefined" ? self : this);
