/* Boot for standalone waitlist pages (cleaner.html etc.). */
(function (root) {
  class WaitlistPage {
    static init() {
      Attribution.capture();
      const el = root.document.querySelector("[data-waitlist]");
      Analytics.track("page_visit", { product: el ? el.dataset.waitlist : "" });
      WaitlistWidget.mountAll();
    }
  }
  if (root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded", WaitlistPage.init);
  else WaitlistPage.init();
})(window);
