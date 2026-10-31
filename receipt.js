// ============================================================
//  receipt.js - receipt intake page (receipt.html)
//  Photo/upload -> read the text -> review -> add to inventory.
//  Uses the functions in backendsystem.js (load that file first).
//  The photo is read inside your browser; it is never uploaded.
// ============================================================

let ALL = [];   // current products, used for matching receipt lines

function $(id) { return document.getElementById(id); }

function say(text, ok) {
  const el = $("message");
  el.style.color = ok ? "green" : "red";
  el.textContent = text;
}

async function loadProducts() {
  ALL = (await getAllProducts()).filter(function (p) { return !p.archived; });
}


// ---------- 1) PHOTO ----------

// shrink + grayscale + more contrast so the scanner reads it better
function preprocess(src) {
  const maxW = 1600;
  const w0 = src.videoWidth || src.naturalWidth || src.width;
  const h0 = src.videoHeight || src.naturalHeight || src.height;
  const scale = Math.min(1, maxW / w0);
  const c = document.createElement("canvas");
  c.width = Math.round(w0 * scale);
  c.height = Math.round(h0 * scale);
  const ctx = c.getContext("2d");
  ctx.drawImage(src, 0, 0, c.width, c.height);
  const d = ctx.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < d.data.length; i += 4) {
    const g = 0.299 * d.data[i] + 0.587 * d.data[i + 1] + 0.114 * d.data[i + 2];
    const v = Math.max(0, Math.min(255, (g - 128) * 1.4 + 128));
    d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
  }
  ctx.putImageData(d, 0, 0);
  return c;
}

async function scan(src) {
  if (typeof Tesseract === "undefined") {
    $("status").textContent = "The scanner could not load. Check your internet connection and reload.";
    return;
  }
  $("status").textContent = "Preparing image...";
  $("bar").style.display = "inline";
  $("bar").value = 0;

  try {
    const result = await Tesseract.recognize(preprocess(src), "eng", {
      logger: function (m) {
        if (m.status === "recognizing text") {
          $("bar").value = m.progress;
          $("status").textContent = "Reading receipt... " + Math.round(m.progress * 100) + "%";
        } else {
          $("status").textContent = m.status + "...";
        }
      }
    });

    const text = result.data.text;
    $("rawText").textContent = text;
    await loadProducts();
    const items = parseReceipt(text);
    showReview(items);
    $("status").textContent = items.length
      ? "Found " + items.length + " item(s). Please check them below."
      : "No items found. Try a clearer photo, or add rows by hand.";
  } catch (e) {
    console.error(e);
    $("status").textContent = "Could not read the receipt: " + e.message;
  } finally {
    $("bar").style.display = "none";
  }
}

$("receiptFile").addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) return;
  const img = new Image();
  img.onload = function () {
    $("preview").src = img.src;
    $("preview").style.display = "block";
    scan(img);
  };
  img.src = URL.createObjectURL(file);
  e.target.value = "";
});

// live camera (needs https:// or localhost)
let stream = null;

$("camBtn").addEventListener("click", async function () {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    $("status").textContent = "Live camera needs https:// or localhost. Use the photo/upload button instead.";
    return;
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    $("video").srcObject = stream;
    $("video").style.display = "block";
    $("snapBtn").style.display = "inline";
  } catch (e) {
    $("status").textContent = "Camera not available: " + e.message;
  }
});

$("snapBtn").addEventListener("click", function () {
  const v = $("video");
  const c = document.createElement("canvas");
  c.width = v.videoWidth;
  c.height = v.videoHeight;
  c.getContext("2d").drawImage(v, 0, 0);
  stream.getTracks().forEach(function (t) { t.stop(); });
  v.style.display = "none";
  $("snapBtn").style.display = "none";
  $("preview").src = c.toDataURL("image/jpeg", 0.9);
  $("preview").style.display = "block";
  scan(c);
});


// ---------- 2) READING THE TEXT ----------

// lines containing these words are not products
const SKIP_WORDS = /\b(sub\s?total|total|tax|vat|change|cash|card|visa|master|amount|balance|discount|tender|payment|thank|receipt|invoice|tel|date|time|cashier|order|table|tip|service)\b/i;

// optional quantity at the start, name in the middle, price at the end
const LINE_PATTERN = /^(?:(\d{1,3})\s*[xX@]?\s+)?(.*?[A-Za-z].*?)\s+[₱$€£P]?\s*(\d{1,3}(?:,\d{3})*[.,]\d{2})\s*[A-Za-z]?$/;

function parseReceipt(text) {
  const items = [];
  text.split("\n").forEach(function (raw) {
    const line = raw.replace(/[|_~]/g, " ").replace(/\s+/g, " ").trim();
    if (line.length < 4 || SKIP_WORDS.test(line)) return;
    const m = line.match(LINE_PATTERN);
    if (!m) return;
    const name = m[2].replace(/[^A-Za-z0-9 .\-&'\/()]/g, "").trim();
    if (name.length < 2) return;
    const total = parseFloat(m[3].replace(/,(?=\d{3})/g, "").replace(",", "."));
    items.push({ name: name, qty: m[1] ? parseInt(m[1], 10) : 1, total: total });
  });
  return items;
}

// guess the ingredient type from the item name (you can change it in the table)
const TYPE_WORDS = {
  fruits:    ["mango", "pineapple", "passion", "banana", "strawberry", "avocado", "papaya", "fruit", "puree"],
  choco_bar: ["choco", "chocolate", "cocoa"],
  cheese:    ["cheese", "keso"],
  oatmilk:   ["oat"],
  sugar:     ["sugar", "asukal"],
  cups:      ["cup", "lid", "straw"],
  biscuits:  ["biscuit", "cookie", "cracker", "graham", "oreo"],
  ice:       ["ice", "yelo"]
};

function guessType(name) {
  const n = name.toLowerCase();
  for (const type in TYPE_WORDS) {
    if (TYPE_WORDS[type].some(function (w) { return n.includes(w); })) return type;
  }
  return "";
}

function normalize(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

// find the existing product that best fits a receipt name
function findMatch(name) {
  const n = normalize(name);
  if (n.length < 3) return null;
  let best = null;
  ALL.forEach(function (p) {
    const pn = normalize(p.name);
    if (pn === n) best = p;
    else if (!best && pn.length >= 3 && (pn.includes(n) || n.includes(pn))) best = p;
  });
  return best;
}


// ---------- 3) REVIEW TABLE ----------

function typeOptionsHtml(selected) {
  let html = '<option value="">Select type</option>';
  for (const key in TYPE_INFO) {
    html += '<option value="' + key + '"' + (key === selected ? " selected" : "") + ">" +
            esc(TYPE_INFO[key].label) + "</option>";
  }
  return html;
}

function productOptionsHtml(selectedId) {
  let html = '<option value="">+ New product</option>';
  ALL.forEach(function (p) {
    html += '<option value="' + esc(p.id) + '"' + (p.id === selectedId ? " selected" : "") + ">" +
            esc(p.name) + " (" + esc(TYPE_INFO[p.item_table] ? TYPE_INFO[p.item_table].label : p.item_table) + ")</option>";
  });
  return html;
}

function makeRow(item) {
  item = item || { name: "", qty: 1, total: 0 };
  const match = findMatch(item.name);

  const tr = document.createElement("tr");
  tr.innerHTML =
    '<td><input type="text" class="rName"></td>' +
    '<td><select class="rMatch">' + productOptionsHtml(match ? match.id : "") + "</select></td>" +
    '<td><select class="rType">' + typeOptionsHtml(match ? match.item_table : guessType(item.name)) + "</select></td>" +
    '<td><input type="number" class="rQty" min="0" step="any" style="width:90px"> <span class="rUnit"></span></td>' +
    '<td><input type="number" class="rTotal" min="0" step="any" style="width:100px"></td>' +
    '<td><button type="button" class="rDel">Remove</button></td>';

  tr.querySelector(".rName").value = item.name;
  tr.querySelector(".rQty").value = item.qty;
  tr.querySelector(".rTotal").value = item.total;

  const nameEl = tr.querySelector(".rName");
  const matchEl = tr.querySelector(".rMatch");
  const typeEl = tr.querySelector(".rType");

  function syncUnit() {
    const p = ALL.find(function (x) { return x.id === matchEl.value; });
    if (p) typeEl.value = p.item_table;
    typeEl.disabled = !!p;   // an existing product keeps its own type
    const t = TYPE_INFO[typeEl.value];
    tr.querySelector(".rUnit").textContent = p ? p.unit : (t ? t.unit : "");
  }

  nameEl.addEventListener("change", function () {
    const m = findMatch(nameEl.value);
    matchEl.value = m ? m.id : "";
    if (!m && !typeEl.value) typeEl.value = guessType(nameEl.value);
    syncUnit();
  });
  matchEl.addEventListener("change", syncUnit);
  typeEl.addEventListener("change", syncUnit);
  tr.querySelector(".rDel").addEventListener("click", function () { tr.remove(); });

  syncUnit();
  return tr;
}

function showReview(items) {
  const body = $("reviewBody");
  body.innerHTML = "";
  items.forEach(function (it) { body.appendChild(makeRow(it)); });
  $("reviewBox").style.display = "block";
}

$("addRowBtn").addEventListener("click", function () {
  $("reviewBody").appendChild(makeRow());
});


// ---------- 4) SAVE TO INVENTORY ----------

function round4(n) { return Math.round(n * 10000) / 10000; }

// make a SKU like FRU-001 that is not used yet
function makeSku(type) {
  const prefix = type.replace(/[^a-z]/g, "").slice(0, 3).toUpperCase();
  const used = ALL.map(function (p) { return (p.sku || "").toLowerCase(); });
  let n = 1;
  let sku;
  do {
    sku = prefix + "-" + String(n).padStart(3, "0");
    n++;
  } while (used.includes(sku.toLowerCase()));
  return sku;
}

$("saveBtn").addEventListener("click", async function () {
  const rows = Array.from($("reviewBody").children);
  if (rows.length === 0) { say("There is nothing to add yet.", false); return; }

  await loadProducts();
  let restocked = 0, created = 0;
  const problems = [];

  for (const tr of rows) {
    const name = tr.querySelector(".rName").value.trim();
    const qty = Number(tr.querySelector(".rQty").value);
    const total = Number(tr.querySelector(".rTotal").value) || 0;
    const matchId = tr.querySelector(".rMatch").value;
    const type = tr.querySelector(".rType").value;
    const label = name || "(unnamed row)";

    if (!name || !(qty > 0)) { problems.push(label + ": needs a name and an amount above 0"); continue; }

    const unitCost = round4(total / qty);   // cost per g / ml / piece
    const existing = ALL.find(function (p) { return p.id === matchId; });

    if (existing) {
      const oldQty = Number(existing.quantity);
      const oldCost = Number(existing.unit_cost);
      const r = await restockProduct(existing.item_table, existing.id, qty);
      if (!r.ok) { problems.push(label + ": " + r.message); continue; }
      if (total > 0) {
        // average the old and new cost so inventory value stays fair
        const avg = round4((oldQty * oldCost + qty * unitCost) / (oldQty + qty));
        await updateProduct(existing.item_table, existing.id, { unit_cost: avg });
      }
      restocked++;
    } else {
      if (!type) { problems.push(label + ": choose a type for the new product"); continue; }
      const r = await saveProduct({
        item_table: type,
        name: name,
        sku: makeSku(type),
        price: 0,                       // ingredients are not sold directly
        unit_cost: unitCost,
        quantity: qty,
        unit: TYPE_INFO[type].unit,
        reorder_level: 0,
        expiry_date: null
      });
      if (!r.ok) { problems.push(label + ": " + r.message); continue; }
      created++;
      await loadProducts();             // so the next row can match this new product
    }
    tr.dataset.done = "1";
  }

  // remove saved rows, keep the ones that need fixing
  rows.forEach(function (tr) { if (tr.dataset.done) tr.remove(); });
  await loadProducts();

  const summary = restocked + " restocked, " + created + " new product(s) added.";
  if (problems.length) {
    say(summary + " Fix these and press the button again: " + problems.join("; ") + ".", false);
  } else {
    say(summary + " Opening the inventory...", true);
    setTimeout(function () { window.location.href = "inventory.html"; }, 1200);
  }
});


// ---------- start ----------

(async function start() {
  if (!(await requireLogin())) return;
  await loadProducts();
})();
