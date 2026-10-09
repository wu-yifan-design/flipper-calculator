#!/usr/bin/env node
// Daily metrics reader (Supabase RPC daily_metrics). Secrets come from env ONLY — never commit them.
// Usage:
//   SUPABASE_URL=https://xxxx.supabase.co SUPABASE_ANON_KEY=... METRICS_KEY=... node scripts/daily-metrics.mjs [days] [--json]
// Prints per day (Asia/Shanghai) x source: visits, unique visitors, visitors who calculated, emails,
// pre-order clicks, plus running totals vs the kill line (50 emails AND 10 pre-order clicks in 14 days).
const { SUPABASE_URL, SUPABASE_ANON_KEY, METRICS_KEY } = process.env;
const days = Number(process.argv.slice(2).find((a) => /^\d+$/.test(a))) || 14;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !METRICS_KEY) {
  console.error("Set SUPABASE_URL, SUPABASE_ANON_KEY and METRICS_KEY in the environment.");
  process.exit(1);
}

class Report {
  /** rows: [{day, source, event, events, visitors}] -> per day/source summary. */
  static pivot(rows) {
    const out = new Map();
    for (const r of rows) {
      const k = `${r.day}|${r.source}`;
      const m = out.get(k) || { day: r.day, source: r.source, visits: 0, uniques: 0, calculated: 0, calc_rate: "-", emails: 0, preorders: 0, a2hs_shown: 0, installs: 0 };
      const n = Number(r.events), v = Number(r.visitors);
      if (r.event === "page_visit") { m.visits = n; m.uniques = v; }
      if (r.event === "calculated") m.calculated = v;
      if (r.event === "email_submitted") m.emails = n;
      if (r.event === "preorder_click") m.preorders = n;
      if (r.event === "a2hs_shown") m.a2hs_shown = v;
      if (r.event === "app_installed") m.installs = n;
      out.set(k, m);
    }
    const list = [...out.values()].sort((a, b) => (a.day + a.source).localeCompare(b.day + b.source));
    for (const m of list) m.calc_rate = m.uniques ? `${Math.round((100 * m.calculated) / m.uniques)}%` : "-";
    return list;
  }

  static async fetchRows() {
    const res = await fetch(`${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/rpc/daily_metrics`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_key: METRICS_KEY, p_days: days }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${body && (body.message || JSON.stringify(body))}`);
    return body;
  }
}

try {
  const rows = await Report.fetchRows();
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(rows, null, 2));
  } else {
    const table = Report.pivot(rows);
    console.table(table);
    const tot = table.reduce((a, r) => ({ emails: a.emails + r.emails, preorders: a.preorders + r.preorders }), { emails: 0, preorders: 0 });
    console.log(`Totals (${days}d): emails ${tot.emails}/50, pre-order clicks ${tot.preorders}/10`);
  }
} catch (e) {
  console.error(String(e.message || e));
  process.exit(1);
}
