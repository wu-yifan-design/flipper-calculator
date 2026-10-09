/*
 * eBay fee + shipping rates config — PROPOSED VERIFIED REPLACEMENT for js/rates.js
 * Prepared by People Bob, 2026-10-09 (Asia/Shanghai). Sources + "seen" dates: rates-sources.md
 *
 * Verified live against official pages on 2026-10-09:
 *   - eBay Selling fees help page (FVF %, $7,500 breakpoint, per-order fee, fee base)
 *   - eBay General campaign strategy help page (ad rate 2%–100%, ad fee base)
 *   - eBay Seller Center "eBay standard envelope" page (prices, size/weight limits)
 *   - USPS Notice 123 price list, effective October 04, 2026 (stamps, Ground Advantage)
 * NOT eBay/USPS numbers (user estimates, flagged below): defaultSalesTaxRate,
 * defaultSuppliesCost, promoted.compareRate, and the choice of USPS zone for Ground tiers.
 *
 * This is the ONLY file that should need editing when eBay changes fees.
 * Works in the browser (window.FLIP_RATES) and in Node (module.exports).
 */
(function (root) {
  const RATES = {
    status: "verified", // "placeholder" | "verified"
    updatedAt: "2026-10-09", // shown on the page as "Rates updated"
    source:
      "ebay.com/help Selling fees (id=4822) + General campaign strategy (id=4164); ebay.com/sellercenter eBay standard envelope; USPS Notice 123 (eff. 2026-10-04). Checked 2026-10-09.",
    currency: "USD",

    // Final value fee (FVF) for Trading Cards. VERIFIED: applies to Sports Mem, Cards & Fan Shop >
    // Sports Trading Cards, Non-Sport Trading Cards, Toys & Hobbies > Collectible Card Games,
    // Comic Books & Memorabilia. (Most other categories are 13.6% — not used here.)
    finalValueFee: {
      tiers: [
        { upTo: 7500, rate: 0.1325 }, // VERIFIED: 13.25% on total amount of the sale up to $7,500, per item
        { upTo: null, rate: 0.0235 }, // VERIFIED: 2.35% on the portion of the sale over $7,500
      ],
      // Per-order fee, chosen by order total. VERIFIED: "$10.00 or less → $0.30; over $10.00 → $0.40".
      // NOTE: eBay applies this per ORDER (same buyer, same checkout, same shipping method), not per item.
      perOrder: [
        { upTo: 10, fee: 0.3 }, // VERIFIED
        { upTo: null, fee: 0.4 }, // VERIFIED
      ],
      // VERIFIED: "total amount of the sale includes the item price, any handling charges, any shipping
      // costs collected from the buyer (some exceptions apply), sales tax, and any other applicable fees."
      includesShipping: true, // VERIFIED (exceptions: 1-day / international shipping options)
      includesSalesTax: true, // VERIFIED
      // Not modeled: Below Standard sellers pay an extra 6% on FVF (VERIFIED on same page).
    },

    // Promoted Listings General (cost-per-sale) ad fee.
    promoted: {
      defaultRate: 0.02, // = official minimum; eBay publishes no "typical" rate (suggested rate is per-listing)
      compareRate: 0.05, // EXAMPLE (not an eBay default): 5% = the minimum some sellers saw in eBay's Oct 1–2, 2026 test
      minRate: 0.02, // VERIFIED: "You choose an ad rate between 2% - 100%". eBay staff (2026-10-06): no increase announced
      maxRate: 1.0, // VERIFIED
      includesShipping: true, // VERIFIED: "% of an item's total sale amount (including shipping and any other applicable fees or taxes)"
      includesSalesTax: true, // VERIFIED
    },

    // Average US sales tax eBay collects from buyers (affects fee base only;
    // the seller never receives the tax). User-editable on the page.
    // NOT VERIFIED — varies by buyer state. 6% matches the illustrative rate in eBay's own fee examples.
    defaultSalesTaxRate: 0.06,

    // Shipping cost tiers for cards (seller's label/postage cost, excluding supplies).
    // USPS Ground Advantage values = USPS Notice 123 Commercial prices (eff. 2026-10-04), using the
    // WORST-CASE zone (8/9) so max-buy / min-offer stay conservative. eBay Labels may price lower — not verified.
    shippingTiers: [
      { id: "pwe", label: "Plain envelope + stamp (PWE, ≤1 oz)", cost: 0.82, note: "USPS stamped letter 1 oz $0.82; +$0.49 nonmachinable surcharge if rigid/lumpy; no tracking, no eBay protection" },
      { id: "ebay_standard_envelope", label: "eBay Standard Envelope (≤1 oz, tracked)", cost: 0.78, note: "VERIFIED eBay Seller Center: 1 oz $0.78" },
      { id: "ebay_standard_envelope_2oz", label: "eBay Standard Envelope (≤2 oz, tracked)", cost: 1.07, note: "VERIFIED eBay Seller Center: 2 oz $1.07" },
      { id: "ebay_standard_envelope_3oz", label: "eBay Standard Envelope (≤3 oz, tracked)", cost: 1.36, note: "VERIFIED eBay Seller Center: 3 oz $1.36; max 3 oz, ≤1/4 in thick, ≤6.125×11.5 in" },
      { id: "ground_4oz", label: "USPS Ground Advantage bubble mailer (≤4 oz)", cost: 8.95, note: "USPS Commercial zone 8/9 worst case; zone 1 = $7.33" },
      { id: "ground_8oz", label: "USPS Ground Advantage small box (≤8 oz)", cost: 8.95, note: "USPS Commercial: same price as 4 oz in the 2026-10-04 table (zone 1 $7.33 – zone 8 $8.95)" },
      { id: "ground_1lb", label: "USPS Ground Advantage (1 lb, lots / graded slabs)", cost: 11.22, note: "USPS Commercial 1 lb zone 8/9; zone 1 = $8.01. Under 16 oz uses the 15.999 oz price ($7.33–$8.95)" },
      { id: "custom", label: "Custom — enter my own cost", cost: null, note: "" },
    ],
    defaultShippingTier: "ebay_standard_envelope",
    defaultSuppliesCost: 0.25, // NOT VERIFIED — user estimate: sleeve + top loader + envelope
  };

  if (typeof module !== "undefined" && module.exports) module.exports = RATES;
  else root.FLIP_RATES = RATES;
})(typeof self !== "undefined" ? self : this);
