/* Calculator page controller. Depends on rates.js, fees.js, site-config.js, analytics.js, waitlist.js. */
(function (root) {
  const doc = root.document;
  const RATES = root.FLIP_RATES;

  class Fmt {
    static usd(x) {
      if (x == null || !Number.isFinite(x)) return "—";
      const s = Math.abs(x).toLocaleString("en-US", { style: "currency", currency: "USD" });
      return x < 0 ? `−${s}` : s;
    }
    static pct(r) {
      return `${+(r * 100).toFixed(2)}%`;
    }
  }

  class InputStore {
    static KEY = "flip_inputs_v1";
    static load() {
      try {
        return JSON.parse((Store.safe() || {}).getItem?.(InputStore.KEY) || "{}");
      } catch (_) {
        return {};
      }
    }
    static save(obj) {
      const s = Store.safe();
      if (s) s.setItem(InputStore.KEY, JSON.stringify(obj));
    }
  }

  class CalculatorPage {
    static FIELDS = ["salePrice", "shipTier", "shipCustom", "shipCharged", "supplies", "adRate", "taxRate",
      "targetProfit", "buyCost", "floorProfit", "offer", "adRateB", "tab"];

    static el(id) {
      return doc.getElementById(id);
    }

    static init() {
      CalculatorPage.renderRatesBanner();
      CalculatorPage.renderShippingOptions();
      CalculatorPage.applyDefaults();
      CalculatorPage.restore();
      CalculatorPage.bind();
      CalculatorPage.update(false);
      Attribution.capture();
      Analytics.track("page_visit", { returning: !!InputStore.load().salePrice });
      WaitlistWidget.mountAll();
      const cl = (root.SITE_CONFIG.waitlists || {})["sold-price-cleaner"];
      if (cl && cl.enabled) CalculatorPage.el("more-tools").hidden = false;
    }

    static renderRatesBanner() {
      const b = CalculatorPage.el("rates-banner");
      const verified = RATES.status === "verified";
      b.className = "rates-banner" + (verified ? " ok" : " warn");
      b.title = RATES.source || "";
      const check = `<svg class="ico" viewBox="0 0 20 20" aria-hidden="true"><path d="M8.2 13.4 4.8 10l-1.1 1.1 4.5 4.5 8.4-8.4-1.1-1.1z" fill="currentColor"/></svg>`;
      b.innerHTML = verified
        ? `${check}<span><strong>Rates verified</strong> · Rates updated ${RATES.updatedAt} · eBay &amp; USPS fee pages</span>`
        : `<span><strong>Placeholder rates — pending verification</strong> · Rates updated ${RATES.updatedAt}</span>`;
    }

    static renderShippingOptions() {
      const sel = CalculatorPage.el("shipTier");
      sel.innerHTML = RATES.shippingTiers
        .map((t) => `<option value="${t.id}">${t.label}${t.cost != null ? ` — ${Fmt.usd(t.cost)}` : ""}</option>`)
        .join("");
    }

    static applyDefaults() {
      const d = {
        shipTier: RATES.defaultShippingTier,
        shipCharged: "0",
        supplies: String(RATES.defaultSuppliesCost),
        adRate: String(RATES.promoted.defaultRate * 100),
        adRateB: String(RATES.promoted.compareRate * 100),
        taxRate: String(RATES.defaultSalesTaxRate * 100),
        targetProfit: "5",
        floorProfit: "3",
      };
      for (const [k, v] of Object.entries(d)) CalculatorPage.el(k).value = v;
    }

    static restore() {
      const saved = InputStore.load();
      for (const k of CalculatorPage.FIELDS) {
        if (k === "tab" || saved[k] == null) continue;
        const e = CalculatorPage.el(k);
        if (e) e.value = saved[k];
      }
      CalculatorPage.showTab(saved.tab || "buy");
    }

    static values() {
      const v = {};
      for (const k of CalculatorPage.FIELDS) if (k !== "tab") v[k] = CalculatorPage.el(k).value;
      v.tab = CalculatorPage.activeTab;
      return v;
    }

    static bind() {
      doc.querySelectorAll("#calc input, #calc select").forEach((e) =>
        e.addEventListener("input", () => CalculatorPage.update(true))
      );
      doc.querySelectorAll("[data-tab]").forEach((b) =>
        b.addEventListener("click", () => {
          CalculatorPage.showTab(b.dataset.tab);
          CalculatorPage.update(false);
        })
      );
      CalculatorPage.el("reset").addEventListener("click", () => {
        InputStore.save({});
        CalculatorPage.applyDefaults();
        ["salePrice", "shipCustom", "buyCost", "offer"].forEach((k) => (CalculatorPage.el(k).value = ""));
        CalculatorPage.update(false);
      });
    }

    static showTab(tab) {
      CalculatorPage.activeTab = tab;
      doc.querySelectorAll("[data-tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === tab)));
      doc.querySelectorAll("[data-panel]").forEach((p) => (p.hidden = p.dataset.panel !== tab));
      // Fields only relevant to some tabs.
      doc.querySelectorAll("[data-show]").forEach((f) => (f.hidden = !f.dataset.show.split(" ").includes(tab)));
    }

    static itemInput(v) {
      const n = (x) => Money.num(x);
      return {
        itemPrice: n(v.salePrice),
        shippingCharged: n(v.shipCharged),
        shippingCost: FeeCalculator.shippingCost(v.shipTier, v.shipCustom, RATES),
        supplies: n(v.supplies),
        adRate: n(v.adRate) / 100,
        salesTaxRate: n(v.taxRate) / 100,
        buyCost: n(v.buyCost),
      };
    }

    static update(userAction) {
      const v = CalculatorPage.values();
      InputStore.save(v);
      CalculatorPage.el("shipCustomWrap").hidden = v.shipTier !== "custom";
      const input = CalculatorPage.itemInput(v);
      let computed = false;
      if (v.tab === "buy") computed = CalculatorPage.renderBuy(input, v);
      if (v.tab === "offer") computed = CalculatorPage.renderOffer(input, v);
      if (v.tab === "promo") computed = CalculatorPage.renderPromo(input, v);
      if (userAction && computed) Analytics.trackCalculatedOnce(v.tab);
    }

    static breakdownRows(b, opts = {}) {
      const r = (label, val, cls = "") => `<tr class="${cls}"><td>${label}</td><td>${val}</td></tr>`;
      const netCls = b.net >= 0 ? "pos" : "neg";
      return `<h3 class="section-title">Fee breakdown</h3><table class="breakdown">
        ${r(opts.priceLabel || "Sale price", Fmt.usd(b.gross - (opts.shipCharged || 0)))}
        ${opts.shipCharged ? r("Shipping charged to buyer", Fmt.usd(opts.shipCharged)) : ""}
        ${r("Shipping label", Fmt.usd(-b.shippingCost), "neg")}
        ${r("Supplies", Fmt.usd(-b.supplies), "neg")}
        ${r(`eBay final value fee <small>${CalculatorPage.fvfNote(b.fvfBase)}</small>`, Fmt.usd(-b.fvfPercent), "neg")}
        ${r("eBay per-order fee", Fmt.usd(-b.perOrderFee), "neg")}
        ${r(`Promoted listing fee <small>${Fmt.pct(b.adFee && b.adBase ? b.adFee / b.adBase : 0)} of ${Fmt.usd(b.adBase)}</small>`, Fmt.usd(-b.adFee), "neg")}
        ${r("Payout after fees &amp; shipping", Fmt.usd(b.netBeforeCost), opts.showCost ? "sub" : "total pos")}
        ${opts.showCost ? r("Your buy cost", Fmt.usd(-b.buyCost), "neg") : ""}
        ${opts.showCost ? r("Net profit", Fmt.usd(b.net), "total " + netCls) : ""}
      </table>`;
    }

    static fvfNote(base) {
      const [t1, t2] = RATES.finalValueFee.tiers;
      const tax = RATES.finalValueFee.includesSalesTax ? " incl. tax" : "";
      if (t2 && t1.upTo != null && base > t1.upTo)
        return `${Fmt.pct(t1.rate)} of ${Fmt.usd(t1.upTo)} + ${Fmt.pct(t2.rate)} of ${Fmt.usd(base - t1.upTo)}${tax}`;
      return `${Fmt.pct(t1.rate)} of ${Fmt.usd(base)}${tax}`;
    }

    static setResult(id, label, value, note, tone = "", badge = "") {
      const badgeCls = tone === "good" ? "badge-success" : tone === "bad" ? "badge-critical" : "";
      CalculatorPage.el(id).innerHTML = `<div class="result ${tone}">
        <div class="r-label">${label}</div>
        <div class="r-value">${value}</div>
        ${badge ? `<span class="badge ${badgeCls}">${badge}</span>` : ""}
        ${note ? `<div class="r-note">${note}</div>` : ""}</div>`;
    }

    static needPrice(target) {
      CalculatorPage.setResult(target, "", "—", "Enter the expected sale price above.");
      CalculatorPage.el(target + "-bd").innerHTML = "";
      return false;
    }

    static renderBuy(input, v) {
      if (!(input.itemPrice > 0)) return CalculatorPage.needPrice("buy-result");
      const res = FeeCalculator.maxBuyPrice(input, v.targetProfit, RATES);
      const t = Money.num(v.targetProfit);
      if (res.profitable) {
        CalculatorPage.setResult("buy-result", "Max buy price", Fmt.usd(res.maxBuy),
          `Pay ${Fmt.usd(res.maxBuy)} or less to make at least ${Fmt.usd(t)}.`, "good", "Profitable");
      } else {
        CalculatorPage.setResult("buy-result", "Max buy price", "Pass", `Even at $0 you'd make ${Fmt.usd(res.breakdown.netBeforeCost)} — below your ${Fmt.usd(t)} target.`, "bad", "Below target");
      }
      CalculatorPage.el("buy-result-bd").innerHTML = CalculatorPage.breakdownRows(res.breakdown, { shipCharged: input.shippingCharged });
      return true;
    }

    static renderOffer(input, v) {
      const res = FeeCalculator.minAcceptableOffer(input, v.floorProfit, RATES);
      const f = Money.num(v.floorProfit);
      if (!res.reachable) {
        CalculatorPage.setResult("offer-result", "Lowest offer to accept", "—", "Can't reach that floor.", "bad", "Unreachable");
        CalculatorPage.el("offer-result-bd").innerHTML = "";
        return false;
      }
      let note = `Accept offers of ${Fmt.usd(res.minOffer)} or more (nets ≥ ${Fmt.usd(f)}). Lower? Counter at ${Fmt.usd(res.minOffer)}.`;
      let tone = "good";
      let badge = `Floor ${Fmt.usd(f)} profit`;
      const offer = Money.num(v.offer, NaN);
      if (Number.isFinite(offer) && offer > 0) {
        const net = FeeCalculator.breakdown({ ...input, itemPrice: offer }, RATES).net;
        if (offer >= res.minOffer) {
          note = `Accept ${Fmt.usd(offer)} — you net ${Fmt.usd(net)}.`;
          badge = "Accept offer";
        }
        else {
          note = `${Fmt.usd(offer)} nets only ${Fmt.usd(net)}. Counter at ${Fmt.usd(res.minOffer)}.`;
          tone = "bad";
          badge = "Counter";
        }
      }
      CalculatorPage.setResult("offer-result", "Lowest offer to accept", Fmt.usd(res.minOffer), note, tone, badge);
      CalculatorPage.el("offer-result-bd").innerHTML = CalculatorPage.breakdownRows(res.breakdown, {
        priceLabel: "Offer (item price)", shipCharged: input.shippingCharged, showCost: true,
      });
      return Money.num(v.buyCost) > 0 || Money.num(v.floorProfit) > 0;
    }

    static renderPromo(input, v) {
      if (!(input.itemPrice > 0)) return CalculatorPage.needPrice("promo-result");
      const a = input.adRate;
      const b = Money.num(v.adRateB) / 100;
      const c = FeeCalculator.compareAdRates(input, a, b, v.floorProfit, RATES);
      const mbA = FeeCalculator.maxBuyPrice({ ...input, adRate: a }, v.targetProfit, RATES).maxBuy;
      const mbB = FeeCalculator.maxBuyPrice({ ...input, adRate: b }, v.targetProfit, RATES).maxBuy;
      const row = (label, x, y, d) =>
        `<tr><td>${label}</td><td>${x}</td><td>${y}</td><td class="${d < 0 ? "neg" : d > 0 ? "up" : ""}">${d == null ? "—" : (d > 0 ? "+" : "") + Fmt.usd(d)}</td></tr>`;
      CalculatorPage.el("promo-result").innerHTML = `<table class="compare">
        <thead><tr><th></th><th>Ad ${Fmt.pct(a)}</th><th>Ad ${Fmt.pct(b)}</th><th>Δ</th></tr></thead>
        <tbody>
        ${row("Promoted fee", Fmt.usd(c.a.breakdown.adFee), Fmt.usd(c.b.breakdown.adFee), c.b.breakdown.adFee - c.a.breakdown.adFee)}
        ${row(`Net profit at ${Fmt.usd(input.itemPrice)}`, Fmt.usd(c.a.breakdown.net), Fmt.usd(c.b.breakdown.net), c.netDelta)}
        ${row("Lowest offer to accept", Fmt.usd(c.a.minOffer.minOffer), Fmt.usd(c.b.minOffer.minOffer), c.minOfferDelta)}
        ${row("Max buy price", Fmt.usd(mbA), Fmt.usd(mbB), mbB - mbA)}
        </tbody></table>
        <p class="r-note">Net profit uses your buy cost (${Fmt.usd(input.buyCost)}); lowest offer uses your floor (${Fmt.usd(Money.num(v.floorProfit))}); max buy uses your target (${Fmt.usd(Money.num(v.targetProfit))}).</p>`;
      CalculatorPage.el("promo-result-bd").innerHTML = "";
      return true;
    }
  }

  root.CalculatorPage = CalculatorPage;
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", CalculatorPage.init);
  else CalculatorPage.init();
})(window);
