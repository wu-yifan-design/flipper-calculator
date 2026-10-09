/*
 * "Add to Home Screen" banner (mobile only).
 *  - Android/Chromium: waits for beforeinstallprompt, shows Install button.
 *  - iOS: shows Share -> Add to Home Screen instructions.
 *  - Hidden in standalone mode and after dismissal (localStorage).
 * Events: a2hs_shown, a2hs_install_click, a2hs_dismissed, app_installed (all carry source attribution).
 */
(function (root) {
  class InstallBanner {
    static KEY = "flip_a2hs_dismissed";
    static deferred = null;
    static platform = "";

    static env(nav = root.navigator, mm = (q) => root.matchMedia && root.matchMedia(q).matches) {
      const ua = nav.userAgent || "";
      const ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && (nav.maxTouchPoints || 0) > 1);
      const android = /Android/i.test(ua);
      const mobile = ios || android || /Mobi/i.test(ua) || (!!mm("(pointer: coarse)") && !!mm("(max-width: 820px)"));
      const standalone = !!mm("(display-mode: standalone)") || nav.standalone === true;
      return { ios, android, mobile, standalone };
    }

    static dismissed() {
      const s = Store.safe();
      return !!(s && s.getItem(InstallBanner.KEY));
    }

    /** Pure decision used by tests: which variant to show, or null. */
    static variant(env, dismissed, hasPrompt) {
      if (!env.mobile || env.standalone || dismissed) return null;
      if (env.ios) return "ios";
      if (hasPrompt) return "android";
      return null;
    }

    static init() {
      if ("serviceWorker" in root.navigator && root.location.protocol === "https:") {
        root.navigator.serviceWorker.register("sw.js").catch(() => {});
      }
      root.addEventListener("appinstalled", () => {
        Analytics.track("app_installed", { platform: InstallBanner.platform || "android" });
        InstallBanner.hide();
      });
      root.addEventListener("beforeinstallprompt", (e) => {
        e.preventDefault();
        InstallBanner.deferred = e;
        InstallBanner.maybeShow();
      });
      InstallBanner.maybeShow();
    }

    static maybeShow() {
      const v = InstallBanner.variant(InstallBanner.env(), InstallBanner.dismissed(), !!InstallBanner.deferred);
      if (!v || root.document.getElementById("a2hs")) return;
      InstallBanner.platform = v;
      InstallBanner.render(v);
      Analytics.track("a2hs_shown", { platform: v });
    }

    static render(v) {
      const shareIcon = `<svg class="ico-inline" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.5 6.5 6l1 1L9.3 5.2V13h1.4V5.2L12.5 7l1-1z" fill="currentColor"/><path d="M5 9h2v1.4H6.4v6.2h7.2v-6.2H13V9h2v9H5z" fill="currentColor"/></svg>`;
      const el = root.document.createElement("aside");
      el.id = "a2hs";
      el.className = "a2hs banner banner-info";
      el.setAttribute("role", "region");
      el.setAttribute("aria-label", "Add Offer Floor to your home screen");
      el.innerHTML = `
        <img class="a2hs-icon" src="assets/icons/icon-192.png" alt="" width="40" height="40">
        <div class="banner-body">
          <p class="banner-title">Add Offer Floor to your home screen</p>
          ${v === "ios"
            ? `<p class="banner-text">Tap ${shareIcon} <strong>Share</strong>, then <strong>Add to Home Screen</strong> — opens like an app, right at the shelf.</p>`
            : `<p class="banner-text">One tap from your home screen when you're at the shelf or answering offers.</p>
               <div class="banner-actions"><button type="button" class="btn btn-sm" data-a2hs="install">Install</button><button type="button" class="btn-plain" data-a2hs="later">Not now</button></div>`}
        </div>
        <button type="button" class="banner-close" data-a2hs="close" aria-label="Dismiss">×</button>`;
      root.document.body.appendChild(el);
      root.document.body.classList.add("has-a2hs");
      el.addEventListener("click", (e) => {
        const a = e.target.closest("[data-a2hs]");
        if (!a) return;
        if (a.dataset.a2hs === "install") InstallBanner.install();
        else InstallBanner.dismiss(a.dataset.a2hs);
      });
    }

    static async install() {
      const ev = InstallBanner.deferred;
      if (!ev) return;
      ev.prompt();
      let outcome = "unknown";
      try {
        outcome = (await ev.userChoice).outcome;
      } catch (_) {}
      Analytics.track("a2hs_install_click", { platform: InstallBanner.platform, outcome });
      InstallBanner.deferred = null;
      InstallBanner.hide();
      if (outcome === "dismissed") InstallBanner.remember();
    }

    static dismiss(via) {
      Analytics.track("a2hs_dismissed", { platform: InstallBanner.platform, via });
      InstallBanner.remember();
      InstallBanner.hide();
    }

    static remember() {
      const s = Store.safe();
      if (s) s.setItem(InstallBanner.KEY, new Date().toISOString());
    }

    static hide() {
      const el = root.document.getElementById("a2hs");
      if (el) el.remove();
      root.document.body.classList.remove("has-a2hs");
    }
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { InstallBanner };
    return;
  }
  root.InstallBanner = InstallBanner;
  if (root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded", InstallBanner.init);
  else InstallBanner.init();
})(typeof self !== "undefined" ? self : this);
