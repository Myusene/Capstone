/* Dashboard page. view() returns this screen's HTML. */
requireLogin();
const TAB="dash";
function view(){
  const st=stats(),td=today(),ts=S.sales.filter(s=>day(s.t)===td),tsum=ts.reduce((x,s)=>x+s.amt,0),c=chart();
  let h="";
  h+=`<p class="ey">${new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"})}</p><h1>A clear view of your store.</h1><p class="l">Here’s what’s moving at Ationg’s today.</p><button class="btn g" onclick="go('rec')">+ Scan receipt</button>
<div class="grid"><div class="card"><small>Units in stock</small><div class="n">${st.u}</div><small>${S.items.length} active products</small></div><div class="card"><small>Inventory value</small><div class="n">${P(st.v)}</div><small>At cost</small></div><div class="card"><small>Today’s sales</small><div class="n">${P(tsum)}</div><small>${ts.length} transactions</small></div><div class="card"><small>Low-stock products</small><div class="n">${low().length+out().length}</div><small>Need attention</small></div></div>
<div class="card"><h3 style="margin:0">Sales performance</h3><small>Last ${range} days</small><div class="n">${P(c.sum)}</div>${c.html}<button class="btn" style="margin-top:12px" onclick="go('sales')">View sales</button></div>
<div class="card sec"><h3>A little attention goes a long way</h3><small>Restock these before the next busy hour.</small>${[...out(),...low()].slice(0,3).map(i=>item(i,1)).join("")||'<div class="item"><small>Everything is stocked.</small></div>'}<button class="btn" onclick="go('inv','?filter=low')">View all ${low().length+out().length} low-stock products</button></div>`
  return h
}

render();