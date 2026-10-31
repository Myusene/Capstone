/* Inventory page. view() returns this screen's HTML. */
requireLogin();
const TAB="inv";
let filt=new URLSearchParams(location.search).get("filter")||"all",q="";
function view(){
  const st=stats(),td=today(),ts=S.sales.filter(s=>day(s.t)===td),tsum=ts.reduce((x,s)=>x+s.amt,0),c=chart();
  let h="";
  let L=S.items.filter(i=>(filt=="all"||(filt=="low"&&i.qty>0&&i.qty<=i.min)||(filt=="out"&&i.qty<=0))&&(i.name+i.sku).toLowerCase().includes(q.toLowerCase()));
h+=`<p class="ey">Your stock, organized</p><h1>Inventory</h1><p class="l">Manage product records, quantities and pricing in one place.</p><button class="btn g" onclick="addItem()">+ Add stocks</button>
<div class="grid"><div class="card"><small>Active products</small><div class="n">${S.items.length}</div></div><div class="card"><small>Units on hand</small><div class="n">${st.u}</div></div><div class="card"><small>Inventory value · at cost</small><div class="n">${P(st.v)}</div></div><div class="card"><small>Below minimum stock</small><div class="n">${low().length}</div></div></div>
<div class="chips">${[["all","All products "+S.items.length],["low","Low stock "+low().length],["out","Out of stock "+out().length]].map(([k,t])=>`<button class="chip ${filt==k?"on":""}" onclick="filt='${k}';render()">${t}</button>`).join("")}</div>
<input id="sq" value="${esc(q)}" placeholder="Search products or SKU…" oninput="q=this.value;render();const e=document.getElementById('sq');e.focus();e.setSelectionRange(q.length,q.length)">
<div class="card">${L.map(i=>item(i,0)+`<div class="row" style="padding-bottom:10px"><button class="btn s" onclick="restock(${i.id})">Restock</button><button class="btn s" onclick="useSt(${i.id},'Used')">Use</button><button class="btn s" onclick="useSt(${i.id},'Spoiled')">Spoiled</button><button class="btn s d" onclick="del(${i.id})">Delete</button></div>`).join("")||"<small>No products match. Try a different search.</small>"}</div>
<div class="sec"><h3>Recent activity</h3>${S.logs.slice(0,6).map(l=>`<small>${new Date(l.t).toLocaleString()} · ${esc(l.a)}: ${esc(l.n)} (${l.x})</small>`).join("")||"<small>No activity yet.</small>"}</div>
<div class="row"><button class="btn" onclick="exp()">Export backup</button><button class="btn" onclick="document.getElementById('imp').click()">Import</button></div><input type="file" id="imp" accept=".json" hidden onchange="imp(event)">`
  return h
}

function exp(){dl(JSON.stringify(S),"afs-backup.json","application/json")}
function imp(e){const f=e.target.files[0];if(!f||!confirm("Importing replaces ALL data. Continue?"))return;const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);if(!d.items)throw 0;S=d;save();render();toast("Imported")}catch(x){toast("Invalid backup file")}};r.readAsText(f)}

render();