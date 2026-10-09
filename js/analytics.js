/*
 * Attribution + analytics. Events: page_visit, calculated (first per page view
 * and first-ever flag), email_submitted, preorder_click.
 * Every event carries the first-touch AND last-touch source so the daily report
 * can split by utm_source / referrer.
 */
(function (root) {
  class Attribution {
    static KEY_FIRST = "flip_first_touch";
    static KEY_LAST = "flip_last_touch";
    static UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

    static parse(loc = root.location, referrer = root.document ? root.document.referrer : "") {
      const q = new URLSearchParams(loc.search || "");
      const touch = {};
      for (const k of Attribution.UTM) if (q.get(k)) touch[k] = q.get(k).slice(0, 100);
      let refHost = "";
      try {
        refHost = referrer ? new URL(referrer).hostname : "";
      } catch (_) {}
      if (refHost && loc.hostname && refHost === loc.hostname) refHost = ""; // internal nav
      touch.referrer = refHost;
      touch.landing = loc.pathname || "/";
      touch.source = Attribution.sourceLabel(touch);
      touch.at = new Date().toISOString();
      return touch;
    }

    /** Single bucket for reporting: utm_source, else referrer host, else "direct". */
    static sourceLabel(t) {
      if (t.utm_source) return t.utm_source.toLowerCase();
      if (!t.referrer) return "direct";
      const h = t.referrer.replace(/^www\./, "");
      if (/reddit\.com$|^redd\.it$/.test(h)) return "reddit";
      if (/(^|\.)x\.com$|twitter\.com$|^t\.co$/.test(h)) return "x";
      if (/google\./.test(h)) return "google";
      return h;
    }

    /** Persist on landing. First touch never overwritten; last touch updated only when there's a real source. */
    static capture() {
      const t = Attribution.parse();
      const store = Store.safe();
      if (!store) return { first: t, last: t };
      if (!store.getItem(Attribution.KEY_FIRST)) store.setItem(Attribution.KEY_FIRST, JSON.stringify(t));
      const hasSignal = t.utm_source || t.referrer;
      if (hasSignal || !store.getItem(Attribution.KEY_LAST)) store.setItem(Attribution.KEY_LAST, JSON.stringify(t));
      return Attribution.current();
    }

    static current() {
      const store = Store.safe();
      const read = (k) => {
        try {
          return JSON.parse(store.getItem(k)) || {};
        } catch (_) {
          return {};
        }
      };
      return store ? { first: read(Attribution.KEY_FIRST), last: read(Attribution.KEY_LAST) } : { first: {}, last: {} };
    }
  }

  class Store {
    static safe() {
      try {
        const s = root.localStorage;
        s.setItem("__t", "1");
        s.removeItem("__t");
        return s;
      } catch (_) {
        return null;
      }
    }
    static id(key) {
      const s = Store.safe();
      let v = s && s.getItem(key);
      if (!v) {
        v = (root.crypto && root.crypto.randomUUID ? root.crypto.randomUUID() : String(Math.random()).slice(2) + Date.now());
        if (s) s.setItem(key, v);
      }
      return v;
    }
  }

  class Analytics {
    static config() {
      return (root.SITE_CONFIG && root.SITE_CONFIG.analytics) || { provider: "none" };
    }

    static payload(event, props = {}) {
      const { first, last } = Attribution.current();
      return {
        event,
        site: Analytics.config().site || "",
        page: root.location.pathname,
        ts: new Date().toISOString(),
        visitor_id: Store.id("flip_visitor_id"), // random, anonymous
        source: last.source || "direct",
        first_source: first.source || "direct",
        utm_source: last.utm_source || "",
        utm_medium: last.utm_medium || "",
        utm_campaign: last.utm_campaign || "",
        utm_content: last.utm_content || "",
        referrer: last.referrer || "",
        ...props,
      };
    }

    /** Fire-and-forget. Returns a promise resolving true if handed to the network. */
    static async track(event, props = {}) {
      const data = Analytics.payload(event, props);
      const cfg = Analytics.config();
      if (cfg.provider !== "webhook" || !cfg.endpoint) {
        Analytics.debugLog(data);
        return false;
      }
      const body = JSON.stringify(data);
      try {
        if (!props.email && root.navigator && root.navigator.sendBeacon) {
          if (root.navigator.sendBeacon(cfg.endpoint, new Blob([body], { type: "text/plain" }))) return true;
        }
        await fetch(cfg.endpoint, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain" }, body, keepalive: true });
        return true;
      } catch (e) {
        Analytics.debugLog({ ...data, error: String(e) });
        return false;
      }
    }

    static debugLog(data) {
      const s = Store.safe();
      if (s) {
        const arr = JSON.parse(s.getItem("flip_debug_events") || "[]");
        arr.push(data);
        s.setItem("flip_debug_events", JSON.stringify(arr.slice(-200)));
      }
      if (root.console) console.info("[analytics:dev]", data.event, data);
    }

    /** "Calculated at least once": once per page view, plus a first_ever flag per visitor. */
    static trackCalculatedOnce(useCase) {
      if (Analytics._calculated) return;
      Analytics._calculated = true;
      const s = Store.safe();
      const firstEver = s ? !s.getItem("flip_calculated_ever") : true;
      if (s) s.setItem("flip_calculated_ever", "1");
      Analytics.track("calculated", { use_case: useCase, first_ever: firstEver });
    }
  }

  const api = { Attribution, Analytics, Store };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else Object.assign(root, api);
})(typeof self !== "undefined" ? self : this);
