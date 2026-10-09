// Run: node --test tests/
const test = require("node:test");
const assert = require("node:assert/strict");
const RATES = require("../js/rates.js");
const { FeeCalculator, Money } = require("../js/fees.js");

// Fixed rates for deterministic tests (independent of placeholder edits).
const R = {
  ...RATES,
  finalValueFee: {
    tiers: [{ upTo: 7500, rate: 0.1325 }, { upTo: null, rate: 0.0235 }],
    perOrder: [{ upTo: 10, fee: 0.3 }, { upTo: null, fee: 0.4 }],
    includesShipping: true,
    includesSalesTax: true,
  },
  promoted: { ...RATES.promoted, includesShipping: true, includesSalesTax: true },
};
const close = (a, b, eps = 0.005) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test("tiered FVF splits at the tier boundary", () => {
  close(FeeCalculator.tieredFvf(100, R.finalValueFee.tiers), 13.25);
  close(FeeCalculator.tieredFvf(7500, R.finalValueFee.tiers), 993.75);
  close(FeeCalculator.tieredFvf(8500, R.finalValueFee.tiers), 993.75 + 23.5);
});

test("per-order fee threshold", () => {
  assert.equal(FeeCalculator.perOrderFee(10, R.finalValueFee.perOrder), 0.3);
  assert.equal(FeeCalculator.perOrderFee(10.01, R.finalValueFee.perOrder), 0.4);
  assert.equal(FeeCalculator.perOrderFee(0, R.finalValueFee.perOrder), 0);
});

test("breakdown itemises a $50 card, free shipping, 2% ad, 7% tax", () => {
  const b = FeeCalculator.breakdown(
    { itemPrice: 50, shippingCharged: 0, shippingCost: 0.74, supplies: 0.25, adRate: 0.02, salesTaxRate: 0.07, buyCost: 10 },
    R
  );
  close(b.fvfBase, 53.5);
  close(b.fvfPercent, 53.5 * 0.1325); // 7.08875
  assert.equal(b.perOrderFee, 0.4);
  close(b.adFee, 1.07);
  close(b.net, 50 - 0.99 - 7.08875 - 0.4 - 1.07 - 10);
});

test("shipping charged to buyer is in the fee base", () => {
  const b = FeeCalculator.breakdown({ itemPrice: 20, shippingCharged: 5, salesTaxRate: 0, adRate: 0 }, R);
  close(b.fvfBase, 25);
  close(b.finalValueFee, 25 * 0.1325 + 0.4);
});

test("use case 1: max buy price = payout - target profit", () => {
  const inp = { itemPrice: 50, shippingCost: 0.74, supplies: 0.25, adRate: 0.02, salesTaxRate: 0.07 };
  const r = FeeCalculator.maxBuyPrice(inp, 15, R);
  const payout = 50 - 0.99 - 7.08875 - 0.4 - 1.07;
  assert.equal(r.maxBuy, Money.floorCents(payout - 15));
  assert.ok(r.profitable);
  // Buying at maxBuy nets at least the target.
  const check = FeeCalculator.breakdown({ ...inp, buyCost: r.maxBuy }, R);
  assert.ok(check.net >= 15 - 1e-9);
});

test("use case 1: unprofitable when target exceeds payout", () => {
  const r = FeeCalculator.maxBuyPrice({ itemPrice: 3, shippingCost: 4.5, salesTaxRate: 0.07 }, 1, R);
  assert.ok(r.maxBuy < 0);
  assert.equal(r.profitable, false);
});

test("use case 2: min offer is the smallest cent meeting the floor", () => {
  const inp = { shippingCost: 0.74, supplies: 0.25, adRate: 0.02, salesTaxRate: 0.07, buyCost: 8 };
  const r = FeeCalculator.minAcceptableOffer(inp, 5, R);
  assert.ok(r.reachable);
  const at = FeeCalculator.breakdown({ ...inp, itemPrice: r.minOffer }, R).net;
  const below = FeeCalculator.breakdown({ ...inp, itemPrice: Money.round(r.minOffer - 0.01) }, R).net;
  assert.ok(at >= 5 - 1e-9, `net at offer ${at}`);
  assert.ok(below < 5, `net one cent below ${below}`);
});

test("use case 2: brute-force agreement across many cases", () => {
  for (const buyCost of [0, 1, 3.5, 12, 80, 900]) {
    for (const floor of [0, 0.5, 2, 10, 50]) {
      for (const shippingCharged of [0, 4.99]) {
        const inp = { shippingCost: 4.5, supplies: 0.3, adRate: 0.05, salesTaxRate: 0.08, buyCost, shippingCharged };
        const r = FeeCalculator.minAcceptableOffer(inp, floor, R);
        let brute = null;
        for (let c = 0; c <= 200000; c++) {
          if (FeeCalculator.breakdown({ ...inp, itemPrice: c / 100 }, R).net >= floor - 1e-9) { brute = c / 100; break; }
        }
        assert.equal(r.minOffer, brute, `buy=${buyCost} floor=${floor} ship=${shippingCharged}`);
      }
    }
  }
});

test("use case 2: across the $7,500 FVF tier", () => {
  const inp = { shippingCost: 10, adRate: 0, salesTaxRate: 0, buyCost: 7000 };
  const r = FeeCalculator.minAcceptableOffer(inp, 500, R);
  const at = FeeCalculator.breakdown({ ...inp, itemPrice: r.minOffer }, R).net;
  const below = FeeCalculator.breakdown({ ...inp, itemPrice: Money.round(r.minOffer - 0.01) }, R).net;
  assert.ok(r.minOffer > 7500);
  assert.ok(at >= 500 && below < 500);
});

test("use case 3: higher ad rate lowers net and raises min offer", () => {
  const inp = { itemPrice: 40, shippingCost: 0.74, supplies: 0.25, salesTaxRate: 0.07, buyCost: 10 };
  const c = FeeCalculator.compareAdRates(inp, 0.02, 0.05, 5, R);
  close(c.netDelta, -40 * 1.07 * 0.03);
  assert.ok(c.minOfferDelta > 0);
});

test("garbage input is treated as zero, not NaN", () => {
  const b = FeeCalculator.breakdown({ itemPrice: "abc", shippingCost: "$1.50", adRate: "", salesTaxRate: null }, R);
  assert.equal(b.shippingCost, 1.5);
  assert.ok(Number.isFinite(b.net));
});

test("rates are verified and carry a source + update date", () => {
  assert.equal(RATES.status, "verified");
  assert.doesNotMatch(RATES.source, /PLACEHOLDER/);
  assert.match(RATES.updatedAt, /^\d{4}-\d{2}-\d{2}$/);
});

test("verified rates reproduce eBay's own worked example ($9,500 card, 6% tax)", () => {
  const b = FeeCalculator.breakdown({ itemPrice: 9500, shippingCharged: 0, salesTaxRate: 0.06, adRate: 0 }, RATES);
  close(b.fvfBase, 10070);
  close(b.finalValueFee, 1054.55);
});

test("Standard Envelope 1/2/3 oz tiers are selectable with verified prices", () => {
  assert.equal(FeeCalculator.shippingCost("ebay_standard_envelope", 0, RATES), 0.78);
  assert.equal(FeeCalculator.shippingCost("ebay_standard_envelope_2oz", 0, RATES), 1.07);
  assert.equal(FeeCalculator.shippingCost("ebay_standard_envelope_3oz", 0, RATES), 1.36);
});

test("Supabase mapping: event row matches schema columns, email never in events", () => {
  const { SupabaseMapper } = require("../js/analytics.js");
  const payload = {
    event: "email_submitted", site: "flipper-calculator", page: "/flipper-calculator/", ts: "2026-10-09T05:00:00Z",
    visitor_id: "v1", source: "reddit", first_source: "x", utm_source: "reddit", utm_medium: "",
    utm_campaign: "howto1", utm_content: "c1", referrer: "www.reddit.com", product: "offer-floor-pro", email: "a@b.co",
  };
  const reqs = SupabaseMapper.requests(payload, "https://abc.supabase.co/");
  assert.deepEqual(reqs.map((r) => r.url), ["https://abc.supabase.co/rest/v1/events", "https://abc.supabase.co/rest/v1/emails"]);
  const ev = reqs[0].body;
  assert.deepEqual(Object.keys(ev).sort(), ["event", "first_source", "page", "props", "referrer_host", "source", "utm_campaign", "utm_medium", "utm_source", "visitor_id"].sort());
  assert.equal(ev.referrer_host, "www.reddit.com");
  assert.equal(ev.utm_medium, null);
  assert.deepEqual(ev.props, { site: "flipper-calculator", ts: "2026-10-09T05:00:00Z", utm_content: "c1", product: "offer-floor-pro" });
  assert.ok(!JSON.stringify(ev).includes("a@b.co"));
  assert.deepEqual(reqs[1].body, { email: "a@b.co", visitor_id: "v1", source: "reddit", product: "offer-floor-pro" });
  const h = SupabaseMapper.headers("ANON");
  assert.equal(h.Authorization, "Bearer ANON");
  assert.equal(h.Prefer, "return=minimal");
  // Non-email events produce one request.
  assert.equal(SupabaseMapper.requests({ ...payload, event: "page_visit", email: undefined }, "https://abc.supabase.co").length, 1);
});

test("A2HS banner: shows only on mobile, not standalone, not after dismissal", () => {
  const { InstallBanner } = require("../js/install-banner.js");
  const iosEnv = InstallBanner.env({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit Safari", maxTouchPoints: 5 }, () => false);
  const androidEnv = InstallBanner.env({ userAgent: "Mozilla/5.0 (Linux; Android 15; Pixel 9) Chrome/140 Mobile Safari" }, () => false);
  const desktopEnv = InstallBanner.env({ userAgent: "Mozilla/5.0 (X11; Linux x86_64) Chrome/140", maxTouchPoints: 0 }, () => false);
  const standaloneEnv = InstallBanner.env({ userAgent: "Mozilla/5.0 (Linux; Android 15) Mobile" }, (q) => q.includes("standalone"));
  const ipadEnv = InstallBanner.env({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari", maxTouchPoints: 5 }, () => false);
  assert.equal(InstallBanner.variant(iosEnv, false, false), "ios");
  assert.equal(InstallBanner.variant(ipadEnv, false, false), "ios");
  assert.equal(InstallBanner.variant(androidEnv, false, false), null); // waits for beforeinstallprompt
  assert.equal(InstallBanner.variant(androidEnv, false, true), "android");
  assert.equal(InstallBanner.variant(desktopEnv, false, true), null);
  assert.equal(InstallBanner.variant(standaloneEnv, false, true), null);
  assert.equal(InstallBanner.variant(iosEnv, true, false), null);
});

test("every tracked event is allowed by the Supabase schema; serverEvents ⊆ schema", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const js = ["analytics.js", "app.js", "waitlist.js", "waitlist-page.js", "install-banner.js"]
    .map((f) => fs.readFileSync(path.join(__dirname, "../js", f), "utf8")).join("\n");
  const tracked = new Set([...js.matchAll(/Analytics\.track\("([a-z0-9_]+)"/g)].map((m) => m[1]));
  tracked.add("calculated");
  const schema = fs.readFileSync(path.join(__dirname, "../backend/supabase/schema.sql"), "utf8");
  const migration = fs.readFileSync(path.join(__dirname, "../backend/supabase/migrations/002_a2hs_events.sql"), "utf8");
  for (const e of tracked) {
    assert.ok(schema.includes(`'${e}'`), `schema.sql missing ${e}`);
    assert.ok(migration.includes(`'${e}'`), `migration missing ${e}`);
  }
  const cfg = require("../js/site-config.js");
  for (const e of cfg.analytics.serverEvents) assert.ok(tracked.has(e), `serverEvents has unknown ${e}`);
  for (const e of ["a2hs_shown", "a2hs_install_click", "a2hs_dismissed", "app_installed"]) assert.ok(tracked.has(e));
});

test("manifest is installable-shaped and never points at rates caching", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const m = JSON.parse(fs.readFileSync(path.join(__dirname, "../manifest.webmanifest"), "utf8"));
  assert.ok(m.name && m.short_name && m.start_url && m.display === "standalone");
  const sizes = m.icons.map((i) => i.sizes);
  assert.ok(sizes.includes("192x192") && sizes.includes("512x512"));
  for (const i of m.icons) assert.ok(fs.existsSync(path.join(__dirname, "..", i.src)), i.src);
  const sw = fs.readFileSync(path.join(__dirname, "../sw.js"), "utf8");
  assert.doesNotMatch(sw, /caches\.|cache\.put|addAll/);
});
