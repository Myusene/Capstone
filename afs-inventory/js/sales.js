/* Sales page. view() returns this screen's HTML. */
requireLogin();
const TAB="sales";
function view(){
  const st=stats(),td=today(),ts=S.sales.filter(s=>day(s.t)===td),tsum=ts.reduce((x,s)=>x+s.amt,0),c=chart();
  let h="";
  const avg=ts.length?tsum/ts.length:0;h+=`<p class="ey">Sales / ${new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}</p><h1>Sales, at a glance.</h1><p class="l">Follow today’s trade and keep every sale connected to your stock.</p><div class="row"><button class="btn" onclick="expS()">Export sales</button><button class="btn g" onclick="sale()">+ Record sale</button></div>
<div class="grid"><div class="card"><small>Today’s sales</small><div class="n">${P(tsum)}</div></div><div class="card"><small>Transactions</small><div class="n">${ts.length}</div></div><div class="card"><small>Units sold</small><div class="n">${ts.reduce((a,s)=>a+s.q,0)}</div><small>Deducted from stock</small></div><div class="card"><small>Average sale</small><div class="n">${P(avg.toFixed(2))}</div></div></div>
<div class="card"><h3 style="margin:0">Sales trend</h3><select onchange="range=+this.value;render()" style="margin-top:10px"><option value="7" ${range==7?"selected":""}>Last 7 days</option><option value="14" ${range==14?"selected":""}>Last 14 days</option></select>${c.html}</div>`
  return h
}

function sale(){const m=S.recipes.map((r,k)=>`${k+1}. ${r.name} ${P(r.price)}`).join("\n"),k=Number(prompt("Pick a shake:\n"+m))-1,r=S.recipes[k];if(!r)return;const n=num(`How many ${r.name}?`);if(!n)return;
for(const[id,a]of r.ing){const i=S.items.find(x=>x.id==id);if(i&&i.qty<a*n)return toast("Not enough "+i.name)}
r.ing.forEach(([id,a])=>{const i=S.items.find(x=>x.id==id);if(i)i.qty=Math.round((i.qty-a*n)*1000)/1000});S.sales.push({t:Date.now(),name:r.name,q:n,amt:r.price*n});log("Sale",r.name,n);save();render();toast("Sale recorded")}
function expS(){dl("time,item,qty,amount\n"+S.sales.map(s=>[new Date(s.t).toISOString(),s.name,s.q,s.amt].join(",")).join("\n"),"afs-sales.csv","text/csv")}

render();