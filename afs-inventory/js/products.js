/* Product page. view() returns this screen's HTML. */
requireLogin();
const TAB="prod";
function view(){
  const st=stats(),td=today(),ts=S.sales.filter(s=>day(s.t)===td),tsum=ts.reduce((x,s)=>x+s.amt,0),c=chart();
  let h="";
  h+=`<p class="ey">Shake menu & recipes</p><h1>A good shake starts with a recipe.</h1><p class="l">Browse the menu, check the measurements, and blend with confidence.</p><div class="sec"><h3>Shake menu · ${S.recipes.length}</h3></div>`+'<div class="shakes">'+S.recipes.map(r=>`<div class="card shake" style="margin-bottom:12px"><div class="ph">${r.em}</div><div class="b"><div class="t">${esc(r.name)}<span>${P(r.price)}</span></div><small style="color:var(--mut)">${r.ing.map(([id,a])=>{const i=S.items.find(x=>x.id==id);return i?esc(i.name)+" "+Math.round(a*1000)+" ml":""}).join(" · ")}</small></div></div>`).join("")+'</div>'
  return h
}

render();