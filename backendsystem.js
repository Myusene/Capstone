// ============================================================
//  Ationg's Fruit Shake - backendsystem.js
//  Sections: 1) Login  2) Add product page  3) Product (shake menu) page
//  Every page loads this file, so each page section only runs
//  when that page's elements exist (see the checks at the bottom).
// ============================================================

const LOGIN_PAGE = "index.html"; // change this to your login page's filename


// ============================================================
//  1) LOGIN
// ============================================================

function TestFunction() {
    document.getElementById("demo").innerHTML = "Bakla Joseph Rancio";
}

function attemptLogin(event) {
  event.preventDefault(); // stop the page from refreshing

  const validUsername = "admin";
  const validPassword = "Ationgthebest";

  const enteredUsername = document.getElementById("username").value;
  const enteredPassword = document.getElementById("password").value;
  const messageElement = document.getElementById("loginMessage");

  if (enteredUsername === validUsername && enteredPassword === validPassword) {
    messageElement.style.color = "green";
    messageElement.textContent = "Login successful! Welcome back.";
    sessionStorage.setItem("loggedIn", "true"); // lets the other pages know you logged in
    window.location.href = "landingp.html";
  } else {
    messageElement.style.color = "red";
    messageElement.textContent = "Invalid username or password. Please try again.";
  }
}

// put requireLogin() at the top of any page that needs a login
function requireLogin() {
  if (sessionStorage.getItem("loggedIn") !== "true") {
    window.location.href = LOGIN_PAGE;
  }
}

function logout() {
  sessionStorage.removeItem("loggedIn");
  window.location.href = LOGIN_PAGE;
}


// ============================================================
//  2) ADD PRODUCT PAGE (addproduct.html)
// ============================================================

// each ingredient type has a fixed unit
const TYPE_UNITS = {
  fruits: "g",
  choco_bar: "pcs",
  cheese: "g",     // assumed grams, change if needed
  oatmilk: "ml",
  sugar: "g",
  cups: "pcs",     // assumed pieces, change if needed
  biscuits: "pcs",
  ice: "ml"
};

function handleTypeChange() {
  const type = document.getElementById("productType").value;
  document.getElementById("productUnit").value = TYPE_UNITS[type] || "";
}

function handleAddProduct(event) {
  event.preventDefault();

  const product = {
    table: document.getElementById("productType").value,
    name: document.getElementById("productName").value.trim(),
    sku: document.getElementById("productSku").value.trim(),
    price: Number(document.getElementById("productPrice").value),
    unit_cost: Number(document.getElementById("productUnitCost").value),
    quantity: Number(document.getElementById("productQuantity").value),
    unit: document.getElementById("productUnit").value,
    reorder_level: Number(document.getElementById("productMinStock").value) || 0
  };

  const msg = document.getElementById("message");

  if (!product.name || !product.table || !product.sku) {
    msg.style.color = "red";
    msg.textContent = "Please fill in the product name, type and SKU.";
    return;
  }

  // TODO: save to Supabase here (insert into the table named product.table)
  console.log("Product ready to save:", product);

  msg.style.color = "green";
  msg.textContent = product.name + " is ready to save (database not connected yet).";

  if (document.getElementById("addAnother").checked) {
    document.getElementById("addProductForm").reset();
    document.getElementById("productUnit").value = "";
  } else {
    // window.location.href = "inventory.html"; // turn on once saving works
  }
}


// ============================================================
//  3) PRODUCT PAGE - SHAKE MENU (product.html)
// ============================================================

// fruit amounts are in ml of puree; price is in PHP
const BASE = [
  { name: "Fresh milk",     amount: 100, unit: "ml" },
  { name: "Condensed milk", amount: 20,  unit: "ml" },
  { name: "Crushed ice",    amount: 150, unit: "g"  }
];

const SHAKES = [
  { id: 1, name: "Mango shake",            price: 65, fruits: [{ name: "Mango puree", ml: 120 }] },
  { id: 2, name: "Pineapple shake",        price: 65, fruits: [{ name: "Pineapple puree", ml: 120 }] },
  { id: 3, name: "Passionfruit shake",     price: 75, fruits: [{ name: "Passionfruit puree", ml: 120 }] },
  { id: 4, name: "Mango pineapple",        price: 75, fruits: [{ name: "Mango", ml: 60 }, { name: "Pineapple", ml: 60 }] },
  { id: 5, name: "Mango passionfruit",     price: 85, fruits: [{ name: "Mango", ml: 60 }, { name: "Passionfruit", ml: 60 }] },
  { id: 6, name: "Pineapple passionfruit", price: 85, fruits: [{ name: "Pineapple", ml: 60 }, { name: "Passionfruit", ml: 60 }] }
];

const CUP_SIZE = "16 oz";
const SERVING = "1 serving";

// ---------- helpers ----------
function esc(text) {
  const div = document.createElement("div");
  div.textContent = text == null ? "" : text;
  return div.innerHTML;
}

// "Mango puree · 120 ml"  or  "Mango 60 ml + pineapple 60 ml"
function fruitSummary(shake) {
  if (shake.fruits.length === 1) {
    return shake.fruits[0].name + " · " + shake.fruits[0].ml + " ml";
  }
  return shake.fruits
    .map(function (f, i) {
      const n = i === 0 ? f.name : f.name.toLowerCase();
      return n + " " + f.ml + " ml";
    })
    .join(" + ");
}

function fruitList(shake) {
  return shake.fruits
    .map(function (f) { return "<li>" + esc(f.name) + " - " + f.ml + " ml</li>"; })
    .join("");
}

function baseList() {
  return BASE
    .map(function (b) { return "<li>" + esc(b.name) + " - " + b.amount + " " + b.unit + "</li>"; })
    .join("");
}

// ---------- menu ----------
function renderShakes() {
  const keyword = document.getElementById("shakeSearch").value.toLowerCase();
  const filter = document.getElementById("shakeFilter").value;

  const list = SHAKES.filter(function (s) {
    const text = (s.name + " " + s.fruits.map(function (f) { return f.name; }).join(" ")).toLowerCase();
    const matchSearch = text.includes(keyword);
    const matchFilter =
      filter === "all" ||
      (filter === "single" && s.fruits.length === 1) ||
      (filter === "blend" && s.fruits.length > 1);
    return matchSearch && matchFilter;
  });

  document.getElementById("shakeCount").textContent = list.length;

  const grid = document.getElementById("shakeGrid");
  if (list.length === 0) {
    grid.innerHTML = "<p>No shakes found.</p>";
    return;
  }

  // "View recipe" opens inside the card, so the page doesn't jump
  grid.innerHTML = list.map(function (s) {
    return `
    <div>
      <!-- shake photo goes here -->
      <h3>${esc(s.name)} &nbsp; PHP ${s.price}</h3>
      <p>${esc(fruitSummary(s))}</p>
      <p>${CUP_SIZE} · ${SERVING}</p>
      <details>
        <summary>View recipe →</summary>
        <p><b>Fruit</b></p>
        <ul>${fruitList(s)}</ul>
        <p><b>Base (same for every shake)</b></p>
        <ul>${baseList()}</ul>
      </details>
      <hr>
    </div>`;
  }).join("");
}

function handleAddRecipe() {
  const msg = document.getElementById("message");
  msg.style.color = "red";
  msg.textContent = "Add Recipe is not built yet.";
}

function fillBaseNote() {
  document.getElementById("baseNote").textContent =
    "Add " + BASE[0].amount + " " + BASE[0].unit + " " + BASE[0].name.toLowerCase() + ", " +
    BASE[1].amount + " " + BASE[1].unit + " " + BASE[1].name.toLowerCase() + " and " +
    BASE[2].amount + " " + BASE[2].unit + " " + BASE[2].name.toLowerCase() +
    " to the puree amounts above. Follow the preparation steps alongside.";
}


// ============================================================
//  START-UP: only run a page's code if that page is open
// ============================================================

// product.html has the shake grid; other pages don't
if (document.getElementById("shakeGrid")) {
  // requireLogin();   // turn on when this page is linked from the login flow
  renderShakes();
  fillBaseNote();
}

//inventory.html

// ============================================================
//  inventory.js - the inventory list page (inventory.html)
//  Uses the functions in backendsystem.js (load that file first)
// ============================================================

let ALL = [];            // every product loaded from Supabase
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

    const text = (p.name + " " + (p.sku || "") + " " + TYPE_INFO[p.item_table].label).toLowerCase();
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
  } else {
    body.innerHTML = list.map(function (p) {
      const t = "'" + p.item_table + "','" + p.id + "'";
      const archiveBtn = p.archived
        ? '<button onclick="handleArchive(' + t + ', false)">Unarchive</button>'
        : '<button onclick="handleArchive(' + t + ', true)">Archive</button>';
      return `
      <tr>
        <td>${esc(p.name)}<br><small>${esc(p.sku || "no SKU")}</small></td>
        <td>${esc(TYPE_INFO[p.item_table].label)}</td>
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

  const name = prompt("Product name:", p.name);            if (name === null) return;
  const sku = prompt("SKU:", p.sku || "");                  if (sku === null) return;
  const price = prompt("Price (PHP):", p.price);            if (price === null) return;
  const unitCost = prompt("Unit cost (PHP):", p.unit_cost); if (unitCost === null) return;
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
