// ============================================================
//  Ationg's Fruit Shake - backendsystem.js
//  Shared by every page. Sections:
//    1) Login / logout        2) Helpers
//    3) Data layer            4) Add product page
//    5) Shake menu page       6) Start-up
//
//  NOTE: inventory.html's code lives in inventory.js, NOT in this file.
// ============================================================

const LOGIN_PAGE = "index.html";
const HOME_PAGE = "landingp.html";


// ============================================================
//  1) LOGIN
// ============================================================

function attemptLogin(event) {
  event.preventDefault(); // stop the form from refreshing the page

  const validUsername = "admin";
  const validPassword = "Ationgthebest";

  const enteredUsername = document.getElementById("username").value;
  const enteredPassword = document.getElementById("password").value;
  const messageElement = document.getElementById("loginMessage");

  if (enteredUsername === validUsername && enteredPassword === validPassword) {
    messageElement.style.color = "green";
    messageElement.textContent = "Login successful! Welcome back.";
    sessionStorage.setItem("loggedIn", "true");
    window.location.href = HOME_PAGE;
  } else {
    messageElement.style.color = "red";
    messageElement.textContent = "Invalid username or password. Please try again.";
  }
}

// Pages call:  if (!(await requireLogin())) return;
// Returns true when logged in, false (and redirects) when not.
async function requireLogin() {
  if (sessionStorage.getItem("loggedIn") === "true") return true;
  window.location.href = LOGIN_PAGE;
  return false;
}

function logout() {
  sessionStorage.removeItem("loggedIn");
  window.location.href = LOGIN_PAGE;
}


// ============================================================
//  2) HELPERS
// ============================================================

function esc(text) {
  const div = document.createElement("div");
  div.textContent = text == null ? "" : text;
  return div.innerHTML;
}

function money(n) {
  return "PHP " + Number(n || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}


// ============================================================
//  3) DATA LAYER
//  Stored in this browser's localStorage so the site works right
//  now. To move to Supabase later, only replace the functions in
//  this section - the pages don't need to change.
// ============================================================

// label + fixed unit for each ingredient type
const TYPE_INFO = {
  fruits:    { label: "Fruits",    unit: "g"   },
  choco_bar: { label: "Choco bar", unit: "pcs" },
  cheese:    { label: "Cheese",    unit: "g"   },  // assumed grams, change if needed
  oatmilk:   { label: "Oat milk",  unit: "ml"  },
  sugar:     { label: "Sugar",     unit: "g"   },
  cups:      { label: "Cups",      unit: "pcs" },  // assumed pieces, change if needed
  biscuits:  { label: "Biscuits",  unit: "pcs" },
  ice:       { label: "Ice",       unit: "ml"  }
};

const PRODUCTS_KEY = "afs-products";
const LOGS_KEY = "afs-logs";

function readList(key) {
  let list;
  try { list = JSON.parse(localStorage.getItem(key)) || []; }
  catch (e) { return []; }
  if (key === PRODUCTS_KEY) list.forEach(upgradeProduct);
  return list;
}

// COST RULE: every entry stores the TOTAL cost of the stock entered (total_cost).
// It is never multiplied by the quantity. Quantity is only an amount in
// g, ml or pcs. The inventory value is simply the sum of every entry's cost.
// Older entries stored a "unit_cost": the number that was typed in is kept as-is.
function upgradeProduct(p) {
  if (p.total_cost === undefined) {
    p.total_cost = Number(p.unit_cost) || 0;
  }
  delete p.unit_cost;
}
function writeList(key, list) {
  localStorage.setItem(key, JSON.stringify(list));
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function addLog(action, itemName, amount) {
  const logs = readList(LOGS_KEY);
  logs.unshift({
    created_at: new Date().toISOString(),
    action: action,
    item_name: itemName,
    amount: Number(amount) || 0
  });
  writeList(LOGS_KEY, logs.slice(0, 200));
}

function findIndexOf(list, table, id) {
  return list.findIndex(function (p) { return p.item_table === table && p.id === id; });
}

async function getAllProducts() {
  return readList(PRODUCTS_KEY);
}

async function getLogs(limit) {
  return readList(LOGS_KEY).slice(0, limit || 20);
}

// in = fine, low = below minimum stock, out = nothing left
function productStatus(p) {
  const qty = Number(p.quantity);
  if (qty <= 0) return "out";
  if (qty < Number(p.reorder_level || 0)) return "low";
  return "in";
}

// products that expire within `days` days (or are already expired)
function getExpiring(list, days) {
  const limit = new Date();
  limit.setHours(0, 0, 0, 0);
  limit.setDate(limit.getDate() + days);
  return list.filter(function (p) {
    return p.expiry_date && new Date(p.expiry_date + "T00:00:00") <= limit;
  });
}

async function getSummary() {
  const active = (await getAllProducts()).filter(function (p) { return !p.archived; });
  return {
    totalItems: active.length,
    totalValue: active.reduce(function (s, p) {
      return s + Number(p.total_cost);   // each entry's cost, not multiplied by quantity
    }, 0),
    lowStockCount: active.filter(function (p) { return productStatus(p) === "low"; }).length,
    expiringCount: getExpiring(active, 3).length
  };
}

// product = { item_table, name, sku, price (selling price), total_cost (what this
//             stock cost in total), quantity (g / ml / pcs), unit, reorder_level, expiry_date }
async function saveProduct(product) {
  const list = readList(PRODUCTS_KEY);
  const sku = product.sku.toLowerCase();
  if (list.some(function (p) { return (p.sku || "").toLowerCase() === sku; })) {
    return { ok: false, message: "SKU " + product.sku + " is already used by another product." };
  }
  list.push(Object.assign({}, product, {
    id: newId(),
    archived: false,
    updated_at: new Date().toISOString()
  }));
  writeList(PRODUCTS_KEY, list);
  addLog("ADDED", product.name, product.quantity);
  return { ok: true, message: product.name + " was added to the inventory." };
}

// amount = how much arrived (g / ml / pcs), cost = what that delivery cost in total.
// The delivery's cost is added to the product's cost as one more entry.
async function restockProduct(table, id, amount, cost) {
  amount = Number(amount);
  cost = Number(cost) || 0;
  if (!(amount > 0)) return { ok: false, message: "Enter a number greater than 0." };
  if (cost < 0) return { ok: false, message: "Cost cannot be negative." };
  const list = readList(PRODUCTS_KEY);
  const i = findIndexOf(list, table, id);
  if (i < 0) return { ok: false, message: "Product not found." };
  list[i].quantity = Number(list[i].quantity) + amount;
  list[i].total_cost = Number(list[i].total_cost) + cost;
  list[i].updated_at = new Date().toISOString();
  writeList(PRODUCTS_KEY, list);
  addLog("RESTOCKED", list[i].name, amount);
  return { ok: true, message: "Restocked " + amount + " " + list[i].unit + " of " + list[i].name + "." };
}

// action is "USED" or "SPOILED"
async function useStock(table, id, amount, action) {
  amount = Number(amount);
  if (!(amount > 0)) return { ok: false, message: "Enter a number greater than 0." };
  const list = readList(PRODUCTS_KEY);
  const i = findIndexOf(list, table, id);
  if (i < 0) return { ok: false, message: "Product not found." };
  if (amount > Number(list[i].quantity)) {
    return { ok: false, message: "Only " + list[i].quantity + " " + list[i].unit + " of " + list[i].name + " in stock." };
  }
  list[i].quantity = Number(list[i].quantity) - amount;
  list[i].updated_at = new Date().toISOString();
  writeList(PRODUCTS_KEY, list);
  addLog(action, list[i].name, amount);
  return { ok: true, message: action + ": " + amount + " " + list[i].unit + " of " + list[i].name + "." };
}

async function updateProduct(table, id, changes) {
  const list = readList(PRODUCTS_KEY);
  const i = findIndexOf(list, table, id);
  if (i < 0) return { ok: false, message: "Product not found." };
  Object.assign(list[i], changes, { updated_at: new Date().toISOString() });
  writeList(PRODUCTS_KEY, list);
  addLog("UPDATED", list[i].name, 0);
  return { ok: true, message: list[i].name + " was updated." };
}

async function deleteProduct(table, id) {
  const list = readList(PRODUCTS_KEY);
  const i = findIndexOf(list, table, id);
  if (i < 0) return { ok: false, message: "Product not found." };
  const removed = list.splice(i, 1)[0];
  writeList(PRODUCTS_KEY, list);
  addLog("DELETED", removed.name, 0);
  return { ok: true, message: removed.name + " was deleted." };
}


// ============================================================
//  4) ADD PRODUCT PAGE (add_product.html)
// ============================================================

function handleTypeChange() {
  const type = document.getElementById("productType").value;
  document.getElementById("productUnit").value = TYPE_INFO[type] ? TYPE_INFO[type].unit : "";
}

async function handleAddProduct(event) {
  event.preventDefault();

  const product = {
    item_table: document.getElementById("productType").value,
    name: document.getElementById("productName").value.trim(),
    sku: document.getElementById("productSku").value.trim(),
    price: Number(document.getElementById("productPrice").value),
    total_cost: Number(document.getElementById("productCost").value) || 0,
    quantity: Number(document.getElementById("productQuantity").value),
    unit: document.getElementById("productUnit").value,
    reorder_level: Number(document.getElementById("productMinStock").value) || 0,
    expiry_date: document.getElementById("productExpiry").value || null
  };

  const msg = document.getElementById("message");

  if (!product.name || !product.item_table || !product.sku) {
    msg.style.color = "red";
    msg.textContent = "Please fill in the product name, type and SKU.";
    return;
  }

  const result = await saveProduct(product);
  msg.style.color = result.ok ? "green" : "red";
  msg.textContent = result.message;
  if (!result.ok) return;

  if (document.getElementById("addAnother").checked) {
    document.getElementById("addProductForm").reset();
    document.getElementById("productUnit").value = "";
  } else {
    window.location.href = "inventory.html";
  }
}


// ============================================================
//  5) PRODUCT PAGE - SHAKE MENU (product.html)
// ============================================================

// base amounts are the same for every shake
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
//  6) START-UP
//  Each page only runs its own code, and only if logged in.
//  The login page (index.html) has neither element, so it never
//  gets redirected - that was what caused the endless refresh.
// ============================================================

(async function startUp() {
  if (document.getElementById("shakeGrid")) {        // product.html
    if (!(await requireLogin())) return;
    renderShakes();
    fillBaseNote();
  }
  if (document.getElementById("addProductForm")) {   // add_product.html
    await requireLogin();
  }
})();
