/* Receipts page. view() returns this screen's HTML. */
requireLogin();
const TAB="rec";
let rcpt=0,pend=[];
function view(){
  const st=stats(),td=today(),ts=S.sales.filter(s=>day(s.t)===td),tsum=ts.reduce((x,s)=>x+s.amt,0),c=chart();
  let h="";
  h+=`<p class="ey">Receipts</p><h1>Turn receipts into stock.</h1><p class="l">Upload a supplier receipt, then confirm what arrived.</p><div class="card steps"><span class="${rcpt==0?"on":""}">1 Upload receipt</span><span class="${rcpt==1?"on":""}">2 Review & correct</span><span class="${rcpt==2?"on":""}">3 Confirm stock update</span></div>`;
if(rcpt==0)h+=`<div class="card drop" style="margin-top:14px"><p>Drop a receipt or browse</p><small style="color:var(--mut)">JPG, PNG or PDF · up to 10 MB</small><br><br><input type="file" accept="image/*,.pdf" onchange="pend=S.items.map(i=>({id:i.id,n:i.name,q:0}));rcpt=1;render()"></div>`;
if(rcpt==1)h+=`<div class="card" style="margin-top:14px"><small>Enter the quantity received for each product (OCR is not connected in this demo).</small>${pend.map((p,k)=>`<div class="item"><div class="i">${esc(p.n)}</div><input type="number" min="0" style="width:90px;margin:0" value="${p.q}" onchange="pend[${k}].q=+this.value"></div>`).join("")}</div><button class="btn g" style="margin-top:12px" onclick="rcpt=2;render()">Review</button>`;
if(rcpt==2){const r=pend.filter(p=>p.q>0);h+=`<div class="card" style="margin-top:14px">${r.map(p=>`<div class="item"><div class="i">${esc(p.n)}</div><span class="q">+${p.q}</span></div>`).join("")||"<small>Nothing to add.</small>"}</div><button class="btn g" style="margin-top:12px" onclick="confirmR()">Confirm stock update</button>`}
h+=`<button class="btn" style="margin-top:12px" onclick="rcpt=0;render()">New receipt</button>`
  return h
}

function confirmR(){pend.filter(p=>p.q>0).forEach(p=>{const i=S.items.find(x=>x.id==p.id);i.qty+=p.q;log("Receipt",i.name,"+"+p.q)});save();pend=[];rcpt=0;toast("Stock updated");go("inv")}

render();