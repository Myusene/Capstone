/* Shared code used by every page: data/storage, helpers, header, nav, restock/use/delete/add.
   Each page defines TAB and view(), then calls render().
   Original notes:
   Sections: data/storage -> helpers -> render() screens -> actions (restock, sale, receipts, backup) */
// (each page calls requireLogin() itself)
const KEY="afs-v1";let S,range=7;
const seed=()=>({items:[
{id:1,sku:"FRU-001",name:"Mango Puree",unit:"1L",cat:"Fruit purees",qty:20,cost:150,min:30},
{id:2,sku:"FRU-002",name:"Pineapple Puree",unit:"1L",cat:"Fruit purees",qty:24,cost:130,min:30},
{id:3,sku:"FRU-003",name:"Passionfruit Puree",unit:"1L",cat:"Fruit purees",qty:18,cost:210,min:25},
{id:4,sku:"MLK-001",name:"Fresh Milk",unit:"1L",cat:"Dairy",qty:60,cost:95,min:30},
{id:5,sku:"ICE-001",name:"Ice Cubes",unit:"5kg",cat:"Ice",qty:40,cost:60,min:20},
{id:6,sku:"CUP-001",name:"16 oz Cups",unit:"50 pcs",cat:"Packaging",qty:0,cost:180,min:10}],
recipes:[{id:1,name:"Mango shake",price:65,em:"🥭",ing:[[1,.12],[4,.1],[5,.05]]},
{id:2,name:"Pineapple shake",price:60,em:"🍍",ing:[[2,.12],[4,.1],[5,.05]]},
{id:3,name:"Passionfruit shake",price:70,em:"🍹",ing:[[3,.12],[4,.1],[5,.05]]}],
sales:[],logs:[]});
try{S=JSON.parse(localStorage.getItem(KEY))}catch(e){}
if(!S||!S.items)S=seed();
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}};
const P=n=>"₱"+Number(n).toLocaleString("en",{minimumFractionDigits:0,maximumFractionDigits:2});
const esc=t=>String(t).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const low=()=>S.items.filter(i=>i.qty>0&&i.qty<=i.min),out=()=>S.items.filter(i=>i.qty<=0);
const day=d=>new Date(d).toISOString().slice(0,10),today=()=>day(Date.now());
const log=(a,n,x)=>{S.logs.unshift({t:Date.now(),a,n,x});S.logs=S.logs.slice(0,50)};
function toast(m){const e=document.createElement("div");e.className="toast";e.textContent=m;document.body.append(e);setTimeout(()=>e.remove(),1800)}
function head(){const d=new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"});return `<header><div class="logo">AFS</div><b>AFS: Inventory</b><button class="av" onclick="logout()" aria-label="Log out">JA</button></header><div class="sub"><span>Ationg’s · Fruit Shake</span><span><i>●</i> All changes saved</span></div>`}
function item(i,act){const st=i.qty<=0?'<span class="tag o">Out</span>':i.qty<=i.min?'<span class="tag">Low stock</span>':"";return `<div class="item"><div class="i"><b>${esc(i.name)} · ${esc(i.unit)}</b><small>${i.sku} · ${esc(i.cat)}</small></div><span class="q">${i.qty}</span>${st}${act?`<button class="btn s" onclick="restock(${i.id})">+ Restock</button>`:""}</div>`}
function stats(){const u=S.items.reduce((a,i)=>a+i.qty,0),v=S.items.reduce((a,i)=>a+i.qty*i.cost,0);return{u,v}}
function chart(){const days=[...Array(range)].map((_,k)=>day(Date.now()-(range-1-k)*864e5));const tot=days.map(d=>S.sales.filter(s=>day(s.t)===d).reduce((a,s)=>a+s.amt,0));const m=Math.max(...tot,1);
return {sum:tot.reduce((a,b)=>a+b,0),html:`<div class="bars">${tot.map(v=>`<div style="height:${v/m*100}%" title="${P(v)}"></div>`).join("")}</div><div class="lab">${days.map(d=>`<span>${d.slice(8)}</span>`).join("")}</div>`}}
const app=document.getElementById("app");
const PAGES={dash:"index.html",inv:"inventory.html",prod:"products.html",rec:"receipts.html",sales:"sales.html"};
function go(t,query=""){location.href=PAGES[t]+query}
function render(){
  app.innerHTML=head()+view();
  document.getElementById("nav").innerHTML=`<nav><div>${[["dash","▦","Dashboard"],["inv","▣","Inventory"],["prod","◒","Product"],["rec","▤","Receipts"],["sales","◈","Sales"]].map(([k,i,t])=>`<button class="${TAB==k?"on":""}" onclick="go('${k}')"><span>${i}</span>${t}</button>`).join("")}</div></nav>`;
}
function num(m){const v=prompt(m);if(v===null)return null;const n=Number(v);if(!(n>0)){toast("Enter a number above 0");return null}return n}
function restock(id){const i=S.items.find(x=>x.id==id),n=num(`Restock how many of ${i.name}?`);if(n){i.qty+=n;log("Restock",i.name,"+"+n);save();render();toast("Restocked")}}
function useSt(id,a){const i=S.items.find(x=>x.id==id),n=num(`${a}: how many of ${i.name}? (in stock ${i.qty})`);if(n){if(n>i.qty)return toast("Not enough stock");i.qty-=n;log(a,i.name,"-"+n);save();render()}}
function del(id){const i=S.items.find(x=>x.id==id);if(confirm(`Delete ${i.name}?`)){S.items=S.items.filter(x=>x.id!=id);save();render()}}
function addItem(){const name=prompt("Product name:");if(!name)return;const unit=prompt("Unit (e.g. 1L):","pcs")||"pcs",cat=prompt("Category:","General")||"General",qty=Number(prompt("Quantity:","0"))||0,cost=Number(prompt("Cost per unit (₱):","0"))||0,min=Number(prompt("Low-stock level:","10"))||0;const id=Math.max(0,...S.items.map(i=>i.id))+1;S.items.push({id,sku:"PRD-"+String(id).padStart(3,"0"),name:name.trim(),unit,cat,qty,cost,min});log("Added",name,qty);save();render()}
function dl(txt,name,type){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([txt],{type}));a.download=name;a.click()}