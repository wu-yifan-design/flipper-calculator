#!/usr/bin/env node
// Daily metrics reader for the Apps Script backend.
// Usage: METRICS_URL=https://script.google.com/macros/s/XXX/exec METRICS_KEY=... node scripts/daily-metrics.mjs [days] [--json]
// Prints per-day, per-source: visits, unique visitors, visitors who calculated, emails, pre-order clicks,
// plus running totals against the kill line (50 emails AND 10 pre-order clicks in 14 days).
const url = process.env.METRICS_URL;
const key = process.env.METRICS_KEY;
const days = Number(process.argv[2]) || 14;
if (!url || !key) {
  console.error("Set METRICS_URL and METRICS_KEY");
  process.exit(1);
}
const res = await fetch(`${url}?action=daily&days=${days}&tz=Asia/Shanghai&key=${encodeURIComponent(key)}`, { redirect: "follow" });
const data = await res.json();
if (data.error) { console.error(data.error); process.exit(1); }
if (process.argv.includes("--json")) { console.log(JSON.stringify(data, null, 2)); process.exit(0); }

class Report {
  static rows(daily) {
    const out = [];
    for (const day of Object.keys(daily).sort())
      for (const [src, m] of Object.entries(daily[day]))
        out.push({ day, source: src, visits: m.page_visit, uniques: m.unique_visitors, calculated: m.calculated_visitors,
          calc_rate: m.unique_visitors ? `${Math.round((100 * m.calculated_visitors) / m.unique_visitors)}%` : "-",
          emails: m.email_submitted, preorders: m.preorder_click });
    return out;
  }
}
const rows = Report.rows(data.daily);
console.table(rows);
const tot = rows.reduce((a, r) => ({ emails: a.emails + r.emails, preorders: a.preorders + r.preorders }), { emails: 0, preorders: 0 });
console.log(`Totals (${days}d): emails ${tot.emails}/50, pre-order clicks ${tot.preorders}/10`);
