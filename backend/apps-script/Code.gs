/**
 * Free analytics + waitlist backend on Google Apps Script + Google Sheets.
 *
 * Setup (YIFan's Google account, ~5 min, free):
 *  1. sheets.new -> Extensions -> Apps Script -> paste this file.
 *  2. Project Settings -> Script properties: READ_KEY = <long random string>.
 *  3. Deploy -> New deployment -> Web app; Execute as: Me; Who has access: Anyone.
 *  4. Put the /exec URL in js/site-config.js (provider "webhook", endpoint URL).
 *  5. Give the bot the /exec URL + READ_KEY (read-only metrics via GET).
 *
 * Sheets created automatically: "events" (all events, no emails) and "emails".
 * GET ?key=READ_KEY&action=daily&days=14  -> daily counts by event x source (JSON)
 * GET ?key=READ_KEY&action=emails         -> email list (only if you want the bot to see it)
 */
const EVENT_COLS = ["received_at", "ts", "event", "site", "page", "visitor_id", "source", "first_source",
  "utm_source", "utm_medium", "utm_campaign", "utm_content", "referrer", "use_case", "first_ever", "product", "plan", "price"];
const ALLOWED = ["page_visit", "calculated", "email_submitted", "preorder_click"];

function sheet_(name, cols) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(cols); sh.setFrozenRows(1); }
  return sh;
}

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    if (ALLOWED.indexOf(d.event) < 0) return out_({ ok: false });
    const clip = (v) => String(v == null ? "" : v).slice(0, 200);
    const now = new Date();
    const lock = LockService.getScriptLock(); lock.waitLock(5000);
    try {
      sheet_("events", EVENT_COLS).appendRow(EVENT_COLS.map((c) => c === "received_at" ? now.toISOString() : clip(d[c])));
      if (d.event === "email_submitted" && d.email && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) {
        sheet_("emails", ["received_at", "email", "product", "source", "first_source", "utm_campaign", "visitor_id"])
          .appendRow([now.toISOString(), clip(d.email), clip(d.product), clip(d.source), clip(d.first_source), clip(d.utm_campaign), clip(d.visitor_id)]);
      }
    } finally { lock.releaseLock(); }
    return out_({ ok: true });
  } catch (err) {
    return out_({ ok: false });
  }
}

function doGet(e) {
  const p = e.parameter || {};
  if (!p.key || p.key !== PropertiesService.getScriptProperties().getProperty("READ_KEY")) return out_({ error: "unauthorized" });
  if (p.action === "emails") {
    const v = sheet_("emails", ["received_at"]).getDataRange().getValues();
    return out_({ emails: v.slice(1) });
  }
  // daily: { "2026-10-12": { "reddit": { page_visit: n, calculated_visitors: n, email_submitted: n, preorder_click: n, unique_visitors: n } } }
  const tz = p.tz || "America/New_York";
  const days = Math.min(Number(p.days) || 14, 90);
  const since = new Date(Date.now() - days * 864e5);
  const rows = sheet_("events", EVENT_COLS).getDataRange().getValues();
  const idx = {}; EVENT_COLS.forEach((c, i) => idx[c] = i);
  const agg = {}; const seen = {};
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const t = new Date(r[idx.received_at]); if (t < since) continue;
    const day = Utilities.formatDate(t, tz, "yyyy-MM-dd");
    const src = r[idx.source] || "direct"; const ev = r[idx.event]; const vid = r[idx.visitor_id];
    const product = r[idx.product] || "";
    const b = (((agg[day] = agg[day] || {})[src] = agg[day][src] || { page_visit: 0, unique_visitors: 0, calculated_visitors: 0, email_submitted: 0, preorder_click: 0, by_product: {} }));
    const once = (k) => { const key = day + "|" + src + "|" + k + "|" + vid; if (seen[key]) return false; seen[key] = 1; return true; };
    if (ev === "page_visit") { b.page_visit++; if (once("v")) b.unique_visitors++; }
    if (ev === "calculated" && once("c")) b.calculated_visitors++;
    if (ev === "email_submitted") b.email_submitted++;
    if (ev === "preorder_click") b.preorder_click++;
    if (product && ev !== "page_visit") { const bp = b.by_product[product] = b.by_product[product] || {}; bp[ev] = (bp[ev] || 0) + 1; }
  }
  return out_({ tz: tz, days: days, daily: agg });
}

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
