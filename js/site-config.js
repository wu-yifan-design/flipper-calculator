/*
 * Site config: the ONLY place to plug in the analytics/form backend.
 *
 * provider:
 *   "none"    – no network calls; events are logged to console + localStorage
 *               ("flip_debug_events") so you can test locally.
 *   "webhook" – POST each event as JSON (Content-Type text/plain, no CORS preflight)
 *               to `endpoint`. Works with the included Google Apps Script
 *               (backend/apps-script/Code.gs), a Cloudflare Worker, Supabase edge
 *               function, etc. Emails go to the same endpoint (event "email_submitted").
 */
(function (root) {
  const SITE_CONFIG = {
    analytics: {
      provider: "none", // "none" | "webhook"
      endpoint: "", // e.g. "https://script.google.com/macros/s/XXXX/exec"
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
