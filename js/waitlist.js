/*
 * Reusable waitlist widget: email form + Pre-order (fake door) button.
 * Usage: <section data-waitlist="sold-price-cleaner"></section>, then
 *        WaitlistWidget.mountAll()
 * Product copy/prices live in js/site-config.js -> waitlists.
 */
(function (root) {
  class WaitlistWidget {
    static EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    static mountAll(doc = root.document) {
      doc.querySelectorAll("[data-waitlist]").forEach((el) => WaitlistWidget.mount(el));
    }

    static product(id) {
      return (root.SITE_CONFIG.waitlists || {})[id];
    }

    /** Sticky per-visitor price variant for pricing tests. */
    static priceVariant(productId, price) {
      const key = `flip_price_${productId}_${price.id}`;
      const s = Store.safe();
      let v = s && s.getItem(key);
      if (!v || !price.variants.includes(Number(v))) {
        v = String(price.variants[Math.floor(Math.random() * price.variants.length)]);
        if (s) s.setItem(key, v);
      }
      return Number(v);
    }

    static esc(s) {
      return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    }

    static mount(el) {
      const id = el.dataset.waitlist;
      const p = WaitlistWidget.product(id);
      if (!p) return;
      const prices = (p.prices || []).map((pr) => {
        const amount = WaitlistWidget.priceVariant(id, pr);
        return { id: pr.id, amount, label: pr.label(amount) };
      });
      const priceHtml = prices.length
        ? `<div class="price-row">${prices
            .map(
              (pr) =>
                `<button type="button" class="btn btn-outline preorder" data-plan="${pr.id}" data-amount="${pr.amount}">${WaitlistWidget.esc(p.preorderLabel)} · ${WaitlistWidget.esc(pr.label)}</button>`
            )
            .join("")}</div><p class="fine"><span class="badge badge-attention">Test pricing</span> Not final. No charge today.</p>`
        : `<button type="button" class="btn btn-outline preorder" data-plan="default" data-amount="">${WaitlistWidget.esc(p.preorderLabel)}</button>`;

      el.classList.add("card", "waitlist");
      el.innerHTML = `
        <span class="badge badge-info">Early access</span>
        <h2>${WaitlistWidget.esc(p.title)}</h2>
        <p class="wl-pitch">${WaitlistWidget.esc(p.pitch)}</p>
        <form class="wl-form" novalidate>
          <label class="sr-only" for="wl-email-${id}">Email</label>
          <span class="input"><input id="wl-email-${id}" type="email" name="email" inputmode="email" autocomplete="email" placeholder="you@example.com" required></span>
          <button class="btn" type="submit">Join waitlist</button>
        </form>
        <p class="wl-msg" role="status" aria-live="polite"></p>
        <div class="divider"></div>
        ${priceHtml}
        <p class="wl-pre-msg" role="status" aria-live="polite"></p>
        <p class="fine">We only use your email to tell you when this opens. No spam, unsubscribe anytime.</p>`;

      const form = el.querySelector(".wl-form");
      const msg = el.querySelector(".wl-msg");
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = form.email.value.trim();
        if (!WaitlistWidget.EMAIL_RE.test(email)) {
          msg.textContent = "Please enter a valid email.";
          msg.className = "wl-msg err";
          return;
        }
        form.querySelector("button").disabled = true;
        await Analytics.track("email_submitted", { product: id, email });
        msg.textContent = "You're on the list. Thanks!";
        msg.className = "wl-msg ok";
        form.reset();
        form.querySelector("button").disabled = false;
      });

      const preMsg = el.querySelector(".wl-pre-msg");
      el.querySelectorAll(".preorder").forEach((btn) =>
        btn.addEventListener("click", () => {
          Analytics.track("preorder_click", { product: id, plan: btn.dataset.plan, price: btn.dataset.amount });
          preMsg.textContent = "Coming soon! Pre-orders aren't open yet — join the waitlist above and we'll email you first.";
          preMsg.className = "wl-pre-msg ok";
        })
      );
    }
  }
  root.WaitlistWidget = WaitlistWidget;
})(typeof self !== "undefined" ? self : this);
