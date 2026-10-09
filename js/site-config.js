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
      supabaseUrl: "https://nsdptlgueawdsqluwmoy.supabase.co", // e.g. "https://abcdefghijklmno.supabase.co"  (no trailing slash)
      anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zZHB0bGd1ZWF3ZHNxbHV3bW95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1MjA1NjgsImV4cCI6MjEwNzA5NjU2OH0._eb_zeq2bhO91YgAAcPhXJMnIbXbCWe3XbQDXgKSocE", // Supabase anon/public key (Project Settings -> API). Insert-only via RLS.
      endpoint: "", // only for provider "webhook"
      // Events the backend accepts. The Supabase events table has a CHECK constraint on
      // `event`; events not listed here are only logged locally (no failing 400s).
      // a2hs_* / app_installed enabled after migrations/002_a2hs_events.sql (applied 2026-10-09):
      //   "a2hs_shown", "a2hs_install_click", "a2hs_dismissed", "app_installed"
      serverEvents: ["page_visit", "calculated", "email_submitted", "preorder_click",
        "a2hs_shown", "a2hs_install_click", "a2hs_dismissed", "app_installed"],
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
