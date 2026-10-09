/*
 * Pure fee math. No DOM. Works in browser (window.FeeCalculator) and Node.
 *
 * Model (all amounts USD):
 *   gross      = itemPrice + shippingCharged                (what the seller is credited)
 *   tax        = gross * salesTaxRate                       (collected by eBay, not kept)
 *   fvfBase    = itemPrice [+ shippingCharged] [+ tax]      (per rates flags)
 *   fvf        = tiered(fvfBase) + perOrderFee(fvfBase)
 *   adBase     = itemPrice [+ shippingCharged] [+ tax]
 *   adFee      = adBase * adRate
 *   net        = gross - shippingCost - supplies - fvf - adFee - buyCost
 */
(function (root) {
  class Money {
    static round(x) {
      return Math.round((x + Number.EPSILON) * 100) / 100;
    }
    static ceilCents(x) {
      return Math.ceil(Math.round(x * 1e6) / 1e4) / 100;
    }
    static floorCents(x) {
      return Math.floor(Math.round(x * 1e6) / 1e4) / 100;
    }
    static num(v, fallback = 0) {
      const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/[$,%\s]/g, ""));
      return Number.isFinite(n) ? n : fallback;
    }
  }

  class FeeCalculator {
    /** Tiered final value fee (percentage part only). */
    static tieredFvf(base, tiers) {
      let fee = 0;
      let prev = 0;
      for (const t of tiers) {
        const cap = t.upTo == null ? Infinity : t.upTo;
        if (base <= prev) break;
        const portion = Math.min(base, cap) - prev;
        fee += portion * t.rate;
        prev = cap;
      }
      return fee;
    }

    static perOrderFee(base, perOrder) {
      if (base <= 0) return 0;
      for (const p of perOrder) if (p.upTo == null || base <= p.upTo) return p.fee;
      return 0;
    }

    static shippingCost(tierId, customCost, rates) {
      const tier = rates.shippingTiers.find((t) => t.id === tierId);
      if (!tier || tier.cost == null) return Math.max(0, Money.num(customCost));
      return tier.cost;
    }

    /** Fee base for a component given its include flags. */
    static base(itemPrice, shippingCharged, salesTaxRate, flags) {
      let b = itemPrice + (flags.includesShipping ? shippingCharged : 0);
      if (flags.includesSalesTax) b += (itemPrice + shippingCharged) * salesTaxRate;
      return b;
    }

    /**
     * Normalised input:
     * { itemPrice, shippingCharged, shippingCost, supplies, adRate, salesTaxRate, buyCost }
     * Returns an itemised breakdown.
     */
    static breakdown(input, rates) {
      const i = FeeCalculator.normalize(input);
      const fvfFlags = rates.finalValueFee;
      const adFlags = rates.promoted;
      const gross = i.itemPrice + i.shippingCharged;
      const fvfBase = FeeCalculator.base(i.itemPrice, i.shippingCharged, i.salesTaxRate, fvfFlags);
      const fvfPercent = FeeCalculator.tieredFvf(fvfBase, fvfFlags.tiers);
      const perOrder = FeeCalculator.perOrderFee(fvfBase, fvfFlags.perOrder);
      const adBase = FeeCalculator.base(i.itemPrice, i.shippingCharged, i.salesTaxRate, adFlags);
      const adFee = adBase * i.adRate;
      const totalFees = fvfPercent + perOrder + adFee;
      const shippingOut = i.shippingCost + i.supplies;
      const netBeforeCost = gross - shippingOut - totalFees;
      return {
        gross,
        fvfBase,
        fvfPercent,
        perOrderFee: perOrder,
        finalValueFee: fvfPercent + perOrder,
        adBase,
        adFee,
        shippingCost: i.shippingCost,
        supplies: i.supplies,
        totalFees,
        netBeforeCost, // payout after fees & shipping, before what you paid
        buyCost: i.buyCost,
        net: netBeforeCost - i.buyCost,
      };
    }

    static normalize(input) {
      const n = (k, d = 0) => Math.max(0, Money.num(input[k], d));
      return {
        itemPrice: n("itemPrice"),
        shippingCharged: n("shippingCharged"),
        shippingCost: n("shippingCost"),
        supplies: n("supplies"),
        adRate: Math.min(1, n("adRate")),
        salesTaxRate: Math.min(1, n("salesTaxRate")),
        buyCost: n("buyCost"),
      };
    }

    /** Use case 1: highest price you can pay and still net `targetProfit`. */
    static maxBuyPrice(input, targetProfit, rates) {
      const b = FeeCalculator.breakdown({ ...input, buyCost: 0 }, rates);
      const raw = b.netBeforeCost - Math.max(0, Money.num(targetProfit));
      return { maxBuy: Money.floorCents(raw), breakdown: b, profitable: raw > 0 };
    }

    /**
     * Use case 2: lowest item price (offer) that still nets `floorProfit` after
     * paying `buyCost`. Shipping charged to the buyer is unchanged by an offer.
     * Net is piecewise linear in itemPrice (breaks at fee thresholds), so we solve
     * each segment in closed form and return the smallest valid cent amount.
     */
    static minAcceptableOffer(input, floorProfit, rates, maxPrice = 1e6) {
      const target = Money.num(floorProfit);
      const netAt = (p) => FeeCalculator.breakdown({ ...input, itemPrice: p }, rates).net;
      const i = FeeCalculator.normalize(input);

      // Breakpoints in fee-base space -> itemPrice space.
      const fvf = rates.finalValueFee;
      const bases = [
        ...fvf.tiers.filter((t) => t.upTo != null).map((t) => t.upTo),
        ...fvf.perOrder.filter((p) => p.upTo != null).map((p) => p.upTo),
      ];
      const taxMul = fvf.includesSalesTax ? 1 + i.salesTaxRate : 1;
      const shipPart = (fvf.includesShipping ? i.shippingCharged : 0) +
        (fvf.includesSalesTax ? i.shippingCharged * i.salesTaxRate : 0);
      const pts = new Set([0, maxPrice]);
      for (const b of bases) {
        const p = (b - shipPart) / taxMul;
        if (p > 0 && p < maxPrice) pts.add(p);
      }
      const sorted = [...pts].sort((a, b) => a - b);

      for (let k = 0; k < sorted.length - 1; k++) {
        const lo = sorted[k];
        const hi = sorted[k + 1];
        // Sample strictly inside the segment to get its linear form (avoid the jump at lo).
        const a = lo + (hi - lo) * 0.25;
        const c = lo + (hi - lo) * 0.75;
        const na = netAt(a);
        const slope = (netAt(c) - na) / (c - a);
        let p;
        const nLo = na - slope * (a - lo); // linear extension at lo
        if (nLo >= target) p = lo;
        else if (slope > 0) p = lo + (target - nLo) / slope;
        else continue;
        if (p > hi) continue;
        // Round up to a cent and nudge until it actually satisfies the floor.
        let cents = Money.ceilCents(p);
        for (let tries = 0; tries < 5 && netAt(cents) < target - 1e-9; tries++) cents = Money.round(cents + 0.01);
        if (netAt(cents) >= target - 1e-9 && cents <= hi + 0.01) {
          return { minOffer: cents, breakdown: FeeCalculator.breakdown({ ...input, itemPrice: cents }, rates), reachable: true };
        }
      }
      return { minOffer: null, breakdown: null, reachable: false };
    }

    /** Use case 3: compare two ad rates on the same item. */
    static compareAdRates(input, rateA, rateB, floorProfit, rates) {
      const side = (adRate) => {
        const inp = { ...input, adRate };
        return {
          adRate,
          breakdown: FeeCalculator.breakdown(inp, rates),
          minOffer: FeeCalculator.minAcceptableOffer(inp, floorProfit, rates),
        };
      };
      const a = side(Money.num(rateA));
      const b = side(Money.num(rateB));
      return {
        a,
        b,
        netDelta: b.breakdown.net - a.breakdown.net,
        minOfferDelta:
          a.minOffer.reachable && b.minOffer.reachable ? b.minOffer.minOffer - a.minOffer.minOffer : null,
      };
    }
  }

  const api = { FeeCalculator, Money };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else Object.assign(root, api);
})(typeof self !== "undefined" ? self : this);
