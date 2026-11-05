
const KEY="hf-tracker-v1";
const START=[
  ["Mortgage",1276],["Auto + home insurance",410],["Property tax sinking fund",585],
  ["Car payment",453],["Student loan",308],["Childcare",802],["Utilities + sewer",325],
  ["Groceries",550],["Dining",400],["Gas",350],["Home/auto maintenance",200],
  ["Parking/tolls",50],["Shopping/personal",200],["Golf",150],["Entertainment",100],
  ["Subscriptions",100],["Travel fund",250],["Alcohol/other",50],
  ["Retirement/investing",700],["Emergency savings",400],["Extra debt/future goals",241]
];
const DEFAULT_GOALS=[
  ["Retirement / investing",0],["Emergency fund",10000],["Travel fund",3000],
  ["Property tax",7018],["Home & auto maintenance",2400],["Extra debt / future goals",0]
];
const GROUPS=["Fixed expenses","Variable expenses","Savings/investing"];
const GROUP_COLORS={
  "Fixed expenses":"#d6a21d",
  "Variable expenses":"#c2413b",
  "Savings/investing":"#16835d"
};
const FIXED_NAMES=[
  "Mortgage","Auto + home insurance","Property tax sinking fund","Car payment",
  "Student loan","Childcare","Utilities + sewer","Subscriptions"
];
const SAVINGS_NAMES=[
  "Travel fund","Retirement/investing","Emergency savings","Extra debt/future goals"
];
const $=id=>document.getElementById(id);
const fmt=n=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(n||0);
const exact=n=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n||0);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function defaultGroup(name){
  if(FIXED_NAMES.includes(name)) return "Fixed expenses";
  if(SAVINGS_NAMES.includes(name)) return "Savings/investing";
  return "Variable expenses";
}
function normalizeData(x){
  if(!x || !Array.isArray(x.budget) || !Array.isArray(x.tx) || !Array.isArray(x.goals)) return null;
  x.budget=x.budget.map(b=>({
    ...b,
    amount:Math.max(0,Number(b.amount)||0),
    group:GROUPS.includes(b.group)?b.group:defaultGroup(b.name)
  }));
  return x;
}
let data=load();
function load(){
  try{
    const x=normalizeData(JSON.parse(localStorage.getItem(KEY)));
    if(x) return x;
  }catch(e){}
  return {
    budget:START.map(([name,amount])=>({name,amount,group:defaultGroup(name)})),
    tx:[],
    goals:DEFAULT_GOALS.map(([name,target])=>({id:crypto.randomUUID(),name,target}))
  };
}
function save(){
  localStorage.setItem(KEY,JSON.stringify(data));
  render();
}
function m(){return $("month").value}
function monthTx(){return data.tx.filter(t=>t.date.slice(0,7)===m())}
function sum(a){return a.reduce((s,x)=>s+Number(x.amount),0)}
function expenses(a){return sum(a.filter(t=>t.type==="Expense"))}
function goalSum(g){return sum(data.tx.filter(t=>t.goalId===g.id&&["Savings","Goal"].includes(t.type)))}
function item(t){
  return `<div class="item" data-edit="${esc(t.id)}"><div><strong>${esc(t.merchant)}</strong><small>${esc(t.date)} · ${esc(t.category)} · ${esc(t.type)}</small></div><span class="amount">${["Income","Refund"].includes(t.type)?"+":"−"}${exact(t.amount)}</span></div>`;
}
function goalHTML(g){
  const n=goalSum(g),pct=g.target?Math.min(100,n/g.target*100):0;
  return `<div style="padding:10px 0"><div class="head"><b>${esc(g.name)}</b><span class="tiny">${fmt(n)}${g.target?" / "+fmt(g.target):""}</span></div>${g.target?`<div class="bar"><span style="width:${pct}%"></span></div>`:`<small>No target set</small>`}</div>`;
}
function fill(){
  $("category").innerHTML=data.budget.map(b=>`<option>${esc(b.name)}</option>`).join("")+"<option>Other</option>";
  $("goal").innerHTML='<option value="">No goal selected</option>'+data.goals.map(g=>`<option value="${esc(g.id)}">${esc(g.name)}</option>`).join("");
}
function budgetProgressHTML(b,a){
  const group=b.group||defaultGroup(b.name);
  const relevant=a.filter(t=>{
    if(group==="Savings/investing") return ["Savings","Goal"].includes(t.type)&&t.category===b.name;
    return t.type==="Expense"&&t.category===b.name;
  });
  const n=sum(relevant),p=b.amount?Math.min(100,n/b.amount*100):0;
  const color=GROUP_COLORS[group];
  return `<div style="margin:12px 0"><div class="head"><b>${esc(b.name)}</b><span class="tiny">${fmt(n)} / ${fmt(b.amount)}</span></div><div class="bar ${n>b.amount?"over":""}" style="background:#e8e8e8"><span style="width:${p}%;background:${color}"></span></div></div>`;
}
function render(){
  const a=monthTx(),spent=expenses(a);
  const saved=sum(a.filter(t=>["Savings","Goal"].includes(t.type)));
  const total=sum(data.budget.map(b=>({amount:b.amount})));
  const remaining=total-spent-saved;
  const remainingText=remaining>0?`+${fmt(Math.abs(remaining))}`:remaining<0?`−${fmt(Math.abs(remaining))}`:fmt(0);
  const remainingClass=remaining>0?"positive":remaining<0?"negative":"";
  $("metrics").innerHTML=[
    ["Budget allocations",fmt(total),"",""],
    ["Expenses",fmt(spent),"",""],
    ["Savings added",fmt(saved),"",""],
    ["Plan remaining",remainingText,remainingClass,""]
  ].map(([l,v,c])=>`<div class="card"><div class="label">${l}</div><div class="value ${c}">${v}</div></div>`).join("");
  $("spentLabel").textContent=fmt(spent)+" spent";
  $("progress").innerHTML=GROUPS.map(group=>{
    const items=data.budget.filter(b=>(b.group||defaultGroup(b.name))===group);
    if(!items.length) return "";
    const color=GROUP_COLORS[group];
    return `<div style="margin:18px 0"><div class="head" style="border-bottom:2px solid ${color};padding-bottom:6px"><b>${group}</b></div>${items.map(b=>budgetProgressHTML(b,a)).join("")}</div>`;
  }).join("");
  const recent=[...a].sort((x,y)=>y.date.localeCompare(x.date)).slice(0,5);
  $("recent").innerHTML=recent.length?recent.map(item).join(""):'<div class="empty">No activity this month.</div>';
  $("goalPreview").innerHTML=data.goals.slice(0,3).map(goalHTML).join("");
  const q=$("search").value.toLowerCase();
  const filtered=[...a].filter(t=>(t.merchant+" "+t.note+" "+t.category).toLowerCase().includes(q)).sort((x,y)=>y.date.localeCompare(x.date));
  $("count").textContent=filtered.length+" entries";
  $("transactions").innerHTML=filtered.length?filtered.map(item).join(""):'<div class="empty">No matching transactions.</div>';
  $("budgetEditor").innerHTML=data.budget.map((b,i)=>`
    <div class="item" style="align-items:center;gap:8px;flex-wrap:wrap">
      <b style="flex:1;min-width:125px">${esc(b.name)}</b>
      <select data-group="${i}" aria-label="Classification for ${esc(b.name)}" style="max-width:175px;padding:8px">
        ${GROUPS.map(g=>`<option value="${g}" ${(b.group||defaultGroup(b.name))===g?"selected":""}>${g}</option>`).join("")}
      </select>
      <input data-budget="${i}" type="number" min="0" step=".01" value="${b.amount}" aria-label="Budget amount for ${esc(b.name)}" style="width:105px;padding:8px">
    </div>`).join("")+`<div class="item"><b>Total</b><b>${fmt(total)}</b></div>`;
  $("goalsList").innerHTML=data.goals.map(g=>`
    <div style="padding:8px 0">${goalHTML(g)}
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="secondary small" data-goal="${esc(g.id)}">Edit goal</button>
        <button class="secondary small" data-delete-goal="${esc(g.id)}">Delete goal</button>
      </div>
    </div>`).join("");
  fill();
}
function tab(id){
  document.querySelectorAll("main>section").forEach(s=>s.classList.toggle("hidden",s.id!==id));
  document.querySelectorAll("nav button").forEach(b=>b.classList.toggle("active",b.dataset.tab===id));
}
document.querySelectorAll("nav button,[data-tab]").forEach(b=>b.onclick=()=>tab(b.dataset.tab));
$("month").value=new Date().toISOString().slice(0,7);
$("month").onchange=render;
$("search").oninput=render;
function openTx(id){
  const t=data.tx.find(x=>x.id===id);
  $("txForm").reset();
  $("txId").value=t?.id||"";
  $("dlgTitle").textContent=t?"Edit transaction":"Add transaction";
  $("delete").classList.toggle("hidden",!t);
  $("date").value=t?.date||new Date().toISOString().slice(0,10);
  $("amount").value=t?.amount||"";
  $("type").value=t?.type||"Expense";
  $("merchant").value=t?.merchant||"";
  $("note").value=t?.note||"";
  fill();
  $("category").value=t?.category||data.budget[0].name;
  $("goal").value=t?.goalId||"";
  $("txDialog").showModal();
}
$("add").onclick=()=>openTx();
$("closeTx").onclick=()=>$("txDialog").close();
$("txForm").onsubmit=e=>{
  e.preventDefault();
  const id=$("txId").value;
  const t={
    id:id||crypto.randomUUID(),date:$("date").value,amount:Number($("amount").value),
    type:$("type").value,category:$("category").value,merchant:$("merchant").value.trim(),
    note:$("note").value,goalId:$("goal").value
  };
  data.tx=id?data.tx.map(x=>x.id===id?t:x):[...data.tx,t];
  $("txDialog").close();
  save();
};
$("delete").onclick=()=>{
  const id=$("txId").value;
  if(confirm("Delete this transaction?")){
    data.tx=data.tx.filter(t=>t.id!==id);
    $("txDialog").close();
    save();
  }
};
document.addEventListener("click",e=>{
  const t=e.target.closest("[data-edit]");
  if(t) openTx(t.dataset.edit);
  const g=e.target.closest("[data-goal]");
  if(g){
    const x=data.goals.find(z=>z.id===g.dataset.goal);
    if(!x) return;
    const name=prompt("Goal name",x.name);
    if(name===null) return;
    const target=prompt("Target amount (0 for none)",x.target);
    if(target===null) return;
    x.name=name.trim()||x.name;
    x.target=Math.max(0,Number(target)||0);
    save();
  }
  const del=e.target.closest("[data-delete-goal]");
  if(del){
    const id=del.dataset.deleteGoal;
    const goal=data.goals.find(x=>x.id===id);
    if(!goal) return;
    if(confirm(`Delete the goal "${goal.name}"? Past transactions will be kept, but will no longer count toward this goal's progress.`)){
      data.goals=data.goals.filter(x=>x.id!==id);
      save();
    }
  }
});
$("budgetEditor").onchange=e=>{
  const amountIndex=e.target.dataset.budget;
  const groupIndex=e.target.dataset.group;
  if(amountIndex!==undefined){
    data.budget[Number(amountIndex)].amount=Math.max(0,Number(e.target.value)||0);
    save();
  }
  if(groupIndex!==undefined){
    data.budget[Number(groupIndex)].group=GROUPS.includes(e.target.value)?e.target.value:defaultGroup(data.budget[Number(groupIndex)].name);
    save();
  }
};
$("reset").onclick=()=>{
  if(confirm("Restore the starting budget amounts and default classifications? Transactions and goals will remain unchanged.")){
    data.budget=START.map(([name,amount])=>({name,amount,group:defaultGroup(name)}));
    save();
  }
};
$("newGoal").onclick=()=>$("goalDialog").showModal();
$("closeGoal").onclick=()=>$("goalDialog").close();
$("goalForm").onsubmit=e=>{
  e.preventDefault();
  data.goals.push({id:crypto.randomUUID(),name:$("goalName").value.trim(),target:Number($("goalTarget").value)});
  $("goalDialog").close();
  save();
};
function dl(name,body,type){
  const a=document.createElement("a"),u=URL.createObjectURL(new Blob([body],{type}));
  a.href=u;a.download=name;a.click();URL.revokeObjectURL(u);
}
$("backup").onclick=()=>dl("household-finance-backup.json",JSON.stringify(data,null,2),"application/json");
$("csv").onclick=()=>{
  const rows=[["Date","Merchant","Amount","Type","Category","Note","Goal ID"],...data.tx.map(t=>[t.date,t.merchant,t.amount,t.type,t.category,t.note,t.goalId])];
  dl("transactions.csv",rows.map(r=>r.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\n"),"text/csv");
};
$("import").onchange=async e=>{
  try{
    const x=normalizeData(JSON.parse(await e.target.files[0].text()));
    if(!x) throw new Error("Invalid backup");
    if(confirm("Replace current data with this backup?")){
      data=x;
      save();
    }
  }catch(err){alert("Invalid backup file");}
  e.target.value="";
};
$("clear").onclick=()=>{
  if(confirm("Clear all local app data? Export a backup first.")){
    localStorage.removeItem(KEY);
    data=load();
    save();
  }
};
if("serviceWorker" in navigator) addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
render();
