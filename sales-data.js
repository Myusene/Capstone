// sales-data.js - simple sales records kept in this browser (localStorage),
// separate from backendsystem.js so your inventory code is not touched.
const SALES_KEY = "afs-sales";

function getSales() {
  try { return JSON.parse(localStorage.getItem(SALES_KEY)) || []; } catch (e) { return []; }
}

function addSale(amount, units) {
  const list = getSales();
  list.push({ at: new Date().toISOString(), amount: Number(amount), units: Number(units) || 1 });
  localStorage.setItem(SALES_KEY, JSON.stringify(list));
}

function dayKey(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

// totals for `days` days ending `back` days ago (back = 0 -> ends today)
function dailyTotals(days, back) {
  const sales = getSales(), out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i - (back || 0));
    const k = dayKey(d);
    const day = sales.filter(function (s) { return dayKey(new Date(s.at)) === k; });
    out.push({ date: d, total: day.reduce(function (a, s) { return a + s.amount; }, 0) });
  }
  return out;
}

function sum(arr) { return arr.reduce(function (a, b) { return a + b.total; }, 0); }

// draws a responsive line chart (this period solid, previous period dashed)
function drawChart(el, cur, prev) {
  const W = 320, H = 150, L = 8, B = 22, T = 8;
  const max = Math.max(1, ...cur.map(function (d) { return d.total; }), ...prev.map(function (d) { return d.total; }));
  const x = function (i) { return L + i * (W - 2 * L) / Math.max(1, cur.length - 1); };
  const y = function (v) { return T + (H - T - B) * (1 - v / max); };
  const pts = function (a) { return a.map(function (d, i) { return x(i).toFixed(1) + "," + y(d.total).toFixed(1); }).join(" "); };
  const step = Math.ceil(cur.length / 7);
  const labels = cur.map(function (d, i) {
    return i % step ? "" : '<text x="' + x(i) + '" y="' + (H - 6) + '" text-anchor="middle">' + d.date.getDate() + "/" + (d.date.getMonth() + 1) + "</text>";
  }).join("");
  el.innerHTML =
    '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Sales trend">' +
    [0, 0.5, 1].map(function (f) { const yy = T + (H - T - B) * f; return '<line x1="0" x2="' + W + '" y1="' + yy + '" y2="' + yy + '" class="grid"/>'; }).join("") +
    '<polygon class="area" points="' + L + "," + (H - B) + " " + pts(cur) + " " + x(cur.length - 1) + "," + (H - B) + '"/>' +
    '<polyline class="prev" points="' + pts(prev) + '"/><polyline class="cur" points="' + pts(cur) + '"/>' + labels + "</svg>" +
    '<p class="legend"><i class="d1"></i>This period <i class="d2"></i>Previous period</p>';
}

function pctChange(cur, prev) {
  if (!prev) return cur ? "new" : "0%";
  const p = (cur - prev) / prev * 100;
  return (p >= 0 ? "\u2191 " : "\u2193 ") + Math.abs(p).toFixed(1) + "%";
}
