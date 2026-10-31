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
      <td>${money(p.total_cost)}</td>
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
  const value = active.reduce(function (s, p) { return s + Number(p.total_cost); }, 0);   // each entry's cost, not multiplied by quantity

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

// Restock opens a window (the <dialog id="restockDialog"> in inventory.html)
function handleRestock(table, id) {
  const p = findProduct(table, id);
  document.getElementById("restockTable").value = table;
  document.getElementById("restockId").value = id;
  document.getElementById("restockTitle").textContent = "Restock " + p.name;
  document.getElementById("restockCurrent").textContent =
    "In stock now: " + Number(p.quantity) + " " + p.unit + " | Cost so far: " + money(p.total_cost);
  document.getElementById("restockUnit").textContent = p.unit;
  document.getElementById("restockAmount").value = "";
  document.getElementById("restockCost").value = "";
  document.getElementById("restockError").textContent = "";
  document.getElementById("restockDialog").showModal();
  document.getElementById("restockAmount").focus();
}

function closeRestock() {
  document.getElementById("restockDialog").close();
}

async function handleRestockSubmit(event) {
  event.preventDefault();
  const error = document.getElementById("restockError");
  const table = document.getElementById("restockTable").value;
  const id = document.getElementById("restockId").value;
  const amount = Number(document.getElementById("restockAmount").value);
  const cost = Number(document.getElementById("restockCost").value) || 0;

  if (!(amount > 0)) { error.textContent = "Enter an amount greater than 0."; return; }
  if (cost < 0) { error.textContent = "Cost cannot be negative."; return; }

  const result = await restockProduct(table, id, amount, cost);
  if (!result.ok) { error.textContent = result.message; return; }

  closeRestock();
  showMessage(result.message, true);
  refreshAll();
}

function closeDialog(id) {
  document.getElementById(id).close();
}

// ---------- Use / Spoiled window (<dialog id="stockOutDialog">) ----------

function openStockOut(table, id, reason) {
  const p = findProduct(table, id);
  const spoiled = reason === "SPOILED";
  document.getElementById("stockOutTable").value = table;
  document.getElementById("stockOutId").value = id;
  document.getElementById("stockOutReason").value = reason;
  document.getElementById("stockOutTitle").textContent = (spoiled ? "Record spoiled stock: " : "Use stock: ") + p.name;
  document.getElementById("stockOutCurrent").textContent = "In stock now: " + Number(p.quantity) + " " + p.unit;
  document.getElementById("stockOutLabel").textContent = spoiled ? "Amount spoiled or wasted *" : "Amount used *";
  document.getElementById("stockOutSubmit").textContent = spoiled ? "Record spoiled" : "Use stock";
  document.getElementById("stockOutUnit").textContent = p.unit;
  document.getElementById("stockOutAmount").value = "";
  document.getElementById("stockOutError").textContent = "";
  document.getElementById("stockOutDialog").showModal();
  document.getElementById("stockOutAmount").focus();
}

function handleUse(table, id) {
  openStockOut(table, id, "USED");
}

function handleSpoiled(table, id) {
  openStockOut(table, id, "SPOILED");
}

async function handleStockOutSubmit(event) {
  event.preventDefault();
  const error = document.getElementById("stockOutError");
  const table = document.getElementById("stockOutTable").value;
  const id = document.getElementById("stockOutId").value;
  const reason = document.getElementById("stockOutReason").value;
  const amount = Number(document.getElementById("stockOutAmount").value);

  if (!(amount > 0)) { error.textContent = "Enter an amount greater than 0."; return; }

  const result = await useStock(table, id, amount, reason);
  if (!result.ok) { error.textContent = result.message; return; }

  closeDialog("stockOutDialog");
  showMessage(result.message, true);
  refreshAll();
}

// ---------- Edit window (<dialog id="editDialog">) ----------

function handleEdit(table, id) {
  const p = findProduct(table, id);
  document.getElementById("editTable").value = table;
  document.getElementById("editId").value = id;
  document.getElementById("editTitle").textContent = "Edit " + p.name;
  document.getElementById("editName").value = p.name;
  document.getElementById("editSku").value = p.sku || "";
  document.getElementById("editPrice").value = p.price;
  document.getElementById("editCost").value = p.total_cost;
  document.getElementById("editMinStock").value = p.reorder_level;
  document.getElementById("editMinUnit").textContent = p.unit;
  document.getElementById("editExpiry").value = p.expiry_date || "";
  document.getElementById("editError").textContent = "";
  document.getElementById("editDialog").showModal();
  document.getElementById("editName").focus();
}

async function handleEditSubmit(event) {
  event.preventDefault();
  const error = document.getElementById("editError");
  const table = document.getElementById("editTable").value;
  const id = document.getElementById("editId").value;
  const name = document.getElementById("editName").value.trim();
  const sku = document.getElementById("editSku").value.trim();

  if (!name) { error.textContent = "Product name is required."; return; }
  const skuTaken = sku && ALL.some(function (o) {
    return o.id !== id && (o.sku || "").toLowerCase() === sku.toLowerCase();
  });
  if (skuTaken) { error.textContent = "That SKU is already used by another product."; return; }

  const result = await updateProduct(table, id, {
    name: name,
    sku: sku || null,
    price: Number(document.getElementById("editPrice").value) || 0,
    total_cost: Number(document.getElementById("editCost").value) || 0,
    reorder_level: Number(document.getElementById("editMinStock").value) || 0,
    expiry_date: document.getElementById("editExpiry").value || null
  });
  if (!result.ok) { error.textContent = result.message; return; }

  closeDialog("editDialog");
  showMessage(result.message, true);
  refreshAll();
}

function handleArchive(table, id, archive) {
  runAction(updateProduct(table, id, { archived: archive }));
}

// ---------- Delete window (<dialog id="deleteDialog">) ----------

function handleDelete(table, id) {
  const p = findProduct(table, id);
  document.getElementById("deleteTable").value = table;
  document.getElementById("deleteId").value = id;
  document.getElementById("deleteText").textContent =
    "Delete " + p.name + "? This cannot be undone.";
  // archiving only makes sense for products that are not archived yet
  document.getElementById("deleteArchiveBtn").style.display = p.archived ? "none" : "inline";
  document.getElementById("deleteDialog").showModal();
}

async function handleDeleteSubmit(event) {
  event.preventDefault();
  const result = await deleteProduct(
    document.getElementById("deleteTable").value,
    document.getElementById("deleteId").value
  );
  closeDialog("deleteDialog");
  showMessage(result.message, result.ok);
  if (result.ok) refreshAll();
}

function handleArchiveInstead() {
  const table = document.getElementById("deleteTable").value;
  const id = document.getElementById("deleteId").value;
  closeDialog("deleteDialog");
  handleArchive(table, id, true);
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
