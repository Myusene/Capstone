// ============================================================
//  inventory.js - the inventory list page (inventory.html)
//  Uses the functions in backendsystem.js (load that file first)
// ============================================================

let ALL = [];            // every product loaded from storage
let currentTab = "all";  // all | low | out | archived

function showMessage(text, ok) {
  const el = document.getElementById("message");
  el.style.color = ok ? "green" : "red";
  el.textContent = text;
}

function findProduct(table, id) {
  return ALL.find(function (p) { return p.item_table === table && p.id === id; });
}

// ---------- tabs ----------

function setTab(tab) {
  currentTab = tab;
  renderInventory();
}

function handleGlobalSearch() {
  document.getElementById("searchBox").value = document.getElementById("globalSearch").value;
  renderInventory();
}

// ---------- filtering & sorting ----------

function visibleProducts() {
  const keyword = document.getElementById("searchBox").value.toLowerCase();
  const type = document.getElementById("typeFilter").value;
  const status = document.getElementById("statusFilter").value;
  const sort = document.getElementById("sortBy").value;

  let list = ALL.filter(function (p) {
    const st = productStatus(p);
    if (currentTab === "archived") { if (!p.archived) return false; }
    else {
      if (p.archived) return false;
      if (currentTab === "low" && st !== "low") return false;
      if (currentTab === "out" && st !== "out") return false;
    }
    if (type && p.item_table !== type) return false;
    if (status && st !== status) return false;

    const label = TYPE_INFO[p.item_table] ? TYPE_INFO[p.item_table].label : p.item_table;
    const text = (p.name + " " + (p.sku || "") + " " + label).toLowerCase();
    return text.includes(keyword);
  });

  list.sort(function (a, b) {
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "qtyLow") return Number(a.quantity) - Number(b.quantity);
    if (sort === "qtyHigh") return Number(b.quantity) - Number(a.quantity);
    return new Date(b.updated_at) - new Date(a.updated_at); // recently updated
  });

  return list;
}

// ---------- rendering ----------

const STATUS_TEXT = { in: "In stock", low: "Low stock", out: "Out of stock" };

function renderInventory() {
  const list = visibleProducts();
  const body = document.getElementById("inventoryBody");

  if (list.length === 0) {
    body.innerHTML = '<tr><td colspan="7">No products found.</td></tr>';
    return;
  }

  body.innerHTML = list.map(function (p) {
    const t = "'" + p.item_table + "','" + p.id + "'";
    const label = TYPE_INFO[p.item_table] ? TYPE_INFO[p.item_table].label : p.item_table;
    const archiveBtn = p.archived
      ? '<button onclick="handleArchive(' + t + ', false)">Unarchive</button>'
      : '<button onclick="handleArchive(' + t + ', true)">Archive</button>';
    return `
    <tr>
      <td>${esc(p.name)}<br><small>${esc(p.sku || "no SKU")}</small></td>
      <td>${esc(label)}</td>
      <td>${Number(p.quantity)} ${esc(p.unit)}</td>
      <td>${money(p.price)}</td>
      <td>${money(p.unit_cost)}</td>
      <td>${STATUS_TEXT[productStatus(p)]}</td>
      <td>
        <button onclick="handleRestock(${t})">Restock</button>
        <button onclick="handleUse(${t})">Use</button>
        <button onclick="handleSpoiled(${t})">Spoiled</button>
        <button onclick="handleEdit(${t})">Edit</button>
        ${archiveBtn}
        <button onclick="handleDelete(${t})">Delete</button>
      </td>
    </tr>`;
  }).join("");
}

function renderStats() {
  const active = ALL.filter(function (p) { return !p.archived; });
  const low = active.filter(function (p) { return productStatus(p) === "low"; });
  const out = active.filter(function (p) { return productStatus(p) === "out"; });
  const expiring = getExpiring(active, 3);
  const value = active.reduce(function (s, p) { return s + Number(p.quantity) * Number(p.unit_cost); }, 0);

  document.getElementById("statActive").textContent = active.length;
  document.getElementById("statActiveNote").textContent = (low.length + out.length) + " products need attention today";
  document.getElementById("statUnits").textContent = expiring.length;
  document.getElementById("statValue").textContent = money(value);
  document.getElementById("statLow").textContent = low.length;
  document.getElementById("statLowNote").textContent = low.length + " need attention today";

  document.getElementById("countAll").textContent = active.length;
  document.getElementById("navProductCount").textContent = active.length;
  document.getElementById("countLow").textContent = low.length;
  document.getElementById("countOut").textContent = out.length;

  document.getElementById("lowStockList").textContent =
    low.length ? low.map(function (p) { return p.name + " (" + p.quantity + " " + p.unit + ")"; }).join(", ") : "None";
  document.getElementById("expiringList").textContent =
    expiring.length ? expiring.map(function (p) { return p.name + " (" + p.expiry_date + ")"; }).join(", ") : "None";
}

async function renderLogs() {
  const list = document.getElementById("logList");
  try {
    const logs = await getLogs(20);
    list.innerHTML = logs.length
      ? logs.map(function (l) {
          return "<li>" + esc(new Date(l.created_at).toLocaleString()) + " - " + esc(l.action) + ": " +
                 esc(l.item_name) + " (" + Number(l.amount) + ")</li>";
        }).join("")
      : "<li>No activity yet.</li>";
  } catch (e) {
    list.innerHTML = "<li>Could not load activity.</li>";
  }
}

async function refreshAll() {
  try {
    ALL = await getAllProducts();
    renderStats();
    renderInventory();
    renderLogs();
  } catch (e) {
    showMessage(e.message, false);
  }
}

// ---------- row buttons ----------

async function runAction(promise) {
  const result = await promise;
  showMessage(result.message, result.ok);
  if (result.ok) refreshAll();
}

function handleRestock(table, id) {
  const p = findProduct(table, id);
  const amount = prompt("Restock how many " + p.unit + " of " + p.name + "?");
  if (amount === null) return;
  runAction(restockProduct(table, id, amount));
}

function handleUse(table, id) {
  const p = findProduct(table, id);
  const amount = prompt("Use how many " + p.unit + " of " + p.name + "? (in stock: " + p.quantity + ")");
  if (amount === null) return;
  runAction(useStock(table, id, amount, "USED"));
}

function handleSpoiled(table, id) {
  const p = findProduct(table, id);
  const amount = prompt("How many " + p.unit + " of " + p.name + " spoiled or were wasted?");
  if (amount === null) return;
  runAction(useStock(table, id, amount, "SPOILED"));
}

function handleEdit(table, id) {
  const p = findProduct(table, id);

  const name = prompt("Product name:", p.name);              if (name === null) return;
  const sku = prompt("SKU:", p.sku || "");                    if (sku === null) return;
  const price = prompt("Price (PHP):", p.price);              if (price === null) return;
  const unitCost = prompt("Unit cost (PHP):", p.unit_cost);   if (unitCost === null) return;
  const minStock = prompt("Minimum stock:", p.reorder_level); if (minStock === null) return;
  const expiry = prompt("Expiry date (YYYY-MM-DD, blank for none):", p.expiry_date || ""); if (expiry === null) return;

  if (!name.trim()) { showMessage("Product name is required.", false); return; }

  runAction(updateProduct(table, id, {
    name: name.trim(),
    sku: sku.trim() || null,
    price: Number(price) || 0,
    unit_cost: Number(unitCost) || 0,
    reorder_level: Number(minStock) || 0,
    expiry_date: expiry.trim() || null
  }));
}

function handleArchive(table, id, archive) {
  runAction(updateProduct(table, id, { archived: archive }));
}

function handleDelete(table, id) {
  const p = findProduct(table, id);
  if (!confirm("Delete " + p.name + "? This cannot be undone. (Archive keeps it instead.)")) return;
  runAction(deleteProduct(table, id));
}

// ---------- backup ----------

function handleExport() {
  const blob = new Blob([JSON.stringify(ALL, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "ationg-inventory-" + new Date().toISOString().slice(0, 10) + ".json";
  link.click();
  URL.revokeObjectURL(link.href);
}

// ---------- start ----------

(async function start() {
  if (!(await requireLogin())) return;
  setTab("all");
  refreshAll();
})();
