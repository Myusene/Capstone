// ============================================================
//  inventory.js - connects the buttons on inventory.html
//  to the functions in backendsystem.js
//  (load backendsystem.js BEFORE this file)
// ============================================================

requireLogin(); // kicks out anyone who isn't logged in

// ---------- helpers ----------

function showMessage(text, ok) {
  const el = document.getElementById("message");
  el.style.color = ok ? "green" : "red"; // just a text color, not real CSS design
  el.textContent = text;
}

// stops item names from being treated as HTML
function esc(text) {
  const div = document.createElement("div");
  div.textContent = text == null ? "" : text;
  return div.innerHTML;
}

function money(n) {
  return "PHP " + Number(n).toFixed(2);
}

// ---------- ADD ITEM ----------

function handleAddItem(event) {
  event.preventDefault();

  const result = addItem({
    name: document.getElementById("itemName").value,
    category: document.getElementById("itemCategory").value,
    quantity: document.getElementById("itemQuantity").value,
    unit: document.getElementById("itemUnit").value,
    price: document.getElementById("itemPrice").value,
    reorderLevel: document.getElementById("itemReorder").value,
    expiryDate: document.getElementById("itemExpiry").value,
  });

  showMessage(result.message, result.ok);
  if (result.ok) {
    event.target.reset();
    refreshAll();
  }
}

// ---------- ROW BUTTONS ----------

function handleRestock(id) {
  const item = getItem(id);
  const amount = prompt(`Restock how many ${item.unit} of ${item.name}?`);
  if (amount === null) return; // cancelled

  const result = restockItem(id, amount);
  showMessage(result.message, result.ok);
  refreshAll();
}

function handleUse(id) {
  const item = getItem(id);
  const amount = prompt(`Use how many ${item.unit} of ${item.name}? (in stock: ${item.quantity})`);
  if (amount === null) return;

  const result = useStock(id, amount, "USED");
  showMessage(result.message, result.ok);
  refreshAll();
}

function handleSpoiled(id) {
  const item = getItem(id);
  const amount = prompt(`How many ${item.unit} of ${item.name} spoiled/wasted?`);
  if (amount === null) return;

  const result = useStock(id, amount, "SPOILED");
  showMessage(result.message, result.ok);
  refreshAll();
}

function handleEdit(id) {
  const item = getItem(id);

  const name = prompt("Item name:", item.name);
  if (name === null) return;
  const category = prompt("Category:", item.category);
  if (category === null) return;
  const unit = prompt("Unit:", item.unit);
  if (unit === null) return;
  const price = prompt("Price per unit:", item.price);
  if (price === null) return;
  const reorderLevel = prompt("Low-stock level:", item.reorderLevel);
  if (reorderLevel === null) return;
  const expiryDate = prompt("Expiry date (YYYY-MM-DD, blank for none):", item.expiryDate || "");
  if (expiryDate === null) return;

  if (!name.trim()) {
    showMessage("Item name is required.", false);
    return;
  }

  const result = updateItem(id, {
    name: name.trim(),
    category: category.trim() || "Uncategorized",
    unit: unit.trim() || "pcs",
    price: Number(price) || 0,
    reorderLevel: Number(reorderLevel) || 0,
    expiryDate: expiryDate.trim() || null,
  });
  showMessage(result.message, result.ok);
  refreshAll();
}

function handleDelete(id) {
  const item = getItem(id);
  if (!confirm(`Delete ${item.name}? This cannot be undone.`)) return;

  const result = deleteItem(id);
  showMessage(result.message, result.ok);
  refreshAll();
}

// ---------- RENDERING ----------

function renderInventory() {
  const keyword = document.getElementById("searchBox").value;
  const items = searchItems(keyword);
  const body = document.getElementById("inventoryBody");

  if (items.length === 0) {
    body.innerHTML = '<tr><td colspan="8">No items found.</td></tr>';
  } else {
    body.innerHTML = items
      .map((i) => {
        const low = i.quantity <= i.reorderLevel ? " (LOW)" : "";
        return `
        <tr>
          <td>${esc(i.name)}</td>
          <td>${esc(i.category)}</td>
          <td>${i.quantity}${low}</td>
          <td>${esc(i.unit)}</td>
          <td>${money(i.price)}</td>
          <td>${i.reorderLevel}</td>
          <td>${esc(i.expiryDate || "-")}</td>
          <td>
            <button onclick="handleRestock('${i.id}')">Restock</button>
            <button onclick="handleUse('${i.id}')">Use</button>
            <button onclick="handleSpoiled('${i.id}')">Spoiled</button>
            <button onclick="handleEdit('${i.id}')">Edit</button>
            <button onclick="handleDelete('${i.id}')">Delete</button>
          </td>
        </tr>`;
      })
      .join("");
  }

  document.getElementById("totalValue").textContent =
    "Total inventory value: " + money(getTotalInventoryValue());
}

function renderAlerts() {
  const low = getLowStockItems().map((i) => `${i.name} (${i.quantity} ${i.unit})`);
  const exp = getExpiringItems(3).map((i) => `${i.name} (${i.expiryDate})`);

  document.getElementById("lowStockList").textContent = low.length ? low.join(", ") : "None";
  document.getElementById("expiringList").textContent = exp.length ? exp.join(", ") : "None";
}

function renderLogs() {
  const list = document.getElementById("logList");
  const logs = getLogs(20);

  if (logs.length === 0) {
    list.innerHTML = "<li>No activity yet.</li>";
    return;
  }

  list.innerHTML = logs
    .map((l) => {
      const when = new Date(l.date).toLocaleString();
      return `<li>${esc(when)} - ${esc(l.action)}: ${esc(l.itemName)} (${l.amount})</li>`;
    })
    .join("");
}

function refreshAll() {
  renderInventory();
  renderAlerts();
  renderLogs();
}

// ---------- BACKUP ----------

function handleExport() {
  const blob = new Blob([exportData()], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "ationg-inventory-backup.json";
  link.click();
  URL.revokeObjectURL(link.href);
}

function handleImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!confirm("Importing replaces ALL current data. Continue?")) {
    event.target.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const result = importData(reader.result);
    showMessage(result.message, result.ok);
    event.target.value = "";
    refreshAll();
  };
  reader.readAsText(file);
}

// ---------- START ----------

refreshAll();
