/*
 * Minimal service worker — exists only so Chromium offers the install prompt.
 * NO CACHING of any kind (rates.js and all JS are always fresh from the network).
 * Only top-level page navigations are handled (network-first, tiny offline notice
 * on failure). Everything else — scripts, rates, Supabase analytics POSTs — is not
 * intercepted at all and goes straight to the network.
 */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.mode !== "navigate" || req.method !== "GET") return; // pass-through, no respondWith
  event.respondWith(
    fetch(req).catch(
      () =>
        new Response(
          '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title>' +
            '<body style="font-family:system-ui;padding:24px;color:#f5f5f7;background:#0a0a0a">' +
            "<h1 style=\"font-size:20px\">You're offline</h1><p>Offer Floor needs a connection to load current eBay rates. Reconnect and reload.</p>",
          { headers: { "Content-Type": "text/html; charset=utf-8" } }
        )
    )
  );
});
