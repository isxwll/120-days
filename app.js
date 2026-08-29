const START_DATE="2026-09-01";
const END_DATE="2027-01-01";
const RESET_HOUR=3;
const KEY="120days_final_v6";

const COLORS=["#4d9cff","#35d07f","#ff9f43","#ad7cff","#ff4d5f"];
const CATEGORIES=["Moradia","Transporte","Alimentação","Lazer","Outros"];

const RULES=[
  "O desafio começa em 01/09/2026 e termina em 01/01/2027.",
  "A contagem oficial do desafio fica em 0/120 antes do início; os registros pessoais podem ser feitos antes dele começar.",
  "O dia operacional muda às 03:00.",
  "Meta diária de água: 2,5 L.",
  "Seguir o ciclo de treino A → B → C → Descanso e repetir.",
  "Corridas: quinta-feira e domingo; distância e pace ficam registrados somente na área Corrida.",
  "Na musculação, a última série deve chegar perto da falha com técnica controlada.",
  "Se a faixa de repetições ficar fácil, aumentar o peso; técnicas especiais somente na última série."
];

const TRAINING={
  A:[
    ["Supino reto","peito"],["Crucifixo","peito"],["Puxada alta","costas"],
    ["Remada baixa","costas"],["Leg press","pernas"],["Abdômen","abdômen"]
  ],
  B:[
    ["Desenvolvimento de ombros","ombros"],["Elevação lateral","ombros"],["Rosca direta","bíceps"],
    ["Tríceps na polia","tríceps"],["Exercício de perna","pernas"],["Abdômen","abdômen"]
  ],
  C:[
    ["Supino inclinado","peito"],["Crucifixo","peito"],["Puxada supinada","costas"],
    ["Remada unilateral","costas"],["Elevação lateral","ombros"],["Leg press","pernas"],["Abdômen","abdômen"]
  ]
};

const FOOD=[
  ["Proteína","Frango, carne, boi, vaca, camarão, peixe, ovos"],
  ["Vegetais","Brócolis, couve-flor, alface, tomate, couve, legumes"],
  ["Frutas","Banana, maçã, morango, laranja, uva, mamão"],
  ["Carboidratos","Arroz, batata, mandioca, aveia, tapioca, massa"],
  ["Hidratação","Água — meta diária de 2,5 L"]
];

const defaultState=()=>({
  days:{}, finances:[], income:0, expenses:{}, runs:[], photos:[], weights:{}, food:{}, settings:{}
});
let state=loadState();
let page="home";
let trainingView="complete";

function loadState(){
  try{
    const raw=localStorage.getItem(KEY);
    if(!raw)return defaultState();
    const x=JSON.parse(raw);
    return {
      ...defaultState(),...x,
      days:x.days&&typeof x.days==="object"?x.days:{},
      finances:Array.isArray(x.finances)?x.finances:[],
      expenses:x.expenses&&typeof x.expenses==="object"?x.expenses:{},
      runs:Array.isArray(x.runs)?x.runs:[],
      photos:Array.isArray(x.photos)?x.photos:[],
      weights:x.weights&&typeof x.weights==="object"?x.weights:{},
      food:x.food&&typeof x.food==="object"?x.food:{},
      settings:x.settings&&typeof x.settings==="object"?x.settings:{}
    };
  }catch{return defaultState()}
}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));return true}catch(e){toast("Não foi possível salvar os dados");return false}}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]))}
function money(v){return "£"+Number(v||0).toLocaleString("en-GB",{minimumFractionDigits:2,maximumFractionDigits:2})}
function pad(n){return String(n).padStart(2,"0")}
function dateKey(d){return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
function fromKey(k){return new Date(`${k}T12:00:00`)}
function dateFmt(k){return fromKey(k).toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric"})}
function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x}
function startDate(){return fromKey(START_DATE)}
function endDate(){return fromKey(END_DATE)}

// Operational date: 03:00 is the daily boundary. Before the official start,
// the same rule applies to personal logs. The official challenge still remains 0/120.
function operationalDate(now=new Date()){
  const d=new Date(now);
  if(d.getHours()<RESET_HOUR)d.setDate(d.getDate()-1);
  return d;
}
function currentKey(){return dateKey(operationalDate())}

function challengeInfo(now=new Date()){
  const op=operationalDate(now), s=startDate(), e=endDate();
  if(op<s)return {started:false,finished:false,day:0,percent:0,limit:0};
  if(op>=e)return {started:false,finished:true,day:120,percent:100,limit:120};
  const day=Math.floor((op-s)/86400000)+1;
  return {started:true,finished:false,day:Math.max(1,Math.min(120,day)),percent:Math.round(Math.max(1,Math.min(120,day))/120*100),limit:Math.max(1,Math.min(120,day))};
}
function challengeDate(day){return addDays(startDate(),day-1)}
function challengeDayForKey(k){
  const d=fromKey(k), s=startDate(), e=endDate();
  if(d<s||d>=e)return 0;
  return Math.floor((d-s)/86400000)+1;
}
function currentOfficialDay(){return challengeInfo().day}

function workoutForDate(d=new Date()){
  const diff=Math.floor((dateOnly(d)-startDate())/86400000);
  const idx=((diff%4)+4)%4;
  return ["A","B","C","DESCANSO"][idx];
}
function dateOnly(d){return fromKey(dateKey(d))}
function workoutItems(type){return type&&TRAINING[type]?TRAINING[type]:[]}
function isRestDay(k){return workoutForDate(fromKey(k))==="DESCANSO"}
function isOfficialKey(k){const n=challengeDayForKey(k);return n>=1&&n<=120}
function isCompleteKey(k){
  if(!isOfficialKey(k))return false;
  const x=state.days[k]||{};
  const water=Number(x.water||0)>=2.5;
  const trainingOK=isRestDay(k)?true:!!x.training;
  return water&&trainingOK;
}
function challengeDaysLimit(){return challengeInfo().limit}

function streakStats(){
  const limit=challengeDaysLimit();
  if(!limit)return {current:0,best:0};
  let best=0,run=0;
  for(let i=1;i<=limit;i++){
    if(isCompleteKey(dateKey(challengeDate(i)))){run++;best=Math.max(best,run)}else run=0;
  }
  let current=0;
  for(let i=limit;i>=1;i--){
    if(isCompleteKey(dateKey(challengeDate(i))))current++;else break;
  }
  return {current,best};
}

function render(){
  document.querySelectorAll("#nav button").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
  document.getElementById("screen").innerHTML=pages()[page]();
  renderDynamic();
  bindPage();
}

function pages(){
  return {
    home:homePage,
    alimentacao:foodPage,
    treino:trainingPage,
    financas:financePage,
    fotos:photosPage,
    desempenho:performancePage
  };
}

function homePage(){
  return `<div class="page">
    <section class="hero">
      <div class="day-row"><div><div class="eyebrow">DIA DO DESAFIO</div><div class="day" id="dayNum">0/120</div></div><div class="percent" id="dayPct">0%</div></div>
      <div class="progress"><i id="dayFill" style="width:0%"></i></div>
      <div class="status muted" id="dayStatus"></div>
    </section>
    <section class="streak">
      <div class="streak-label">SEQUÊNCIA ATUAL</div>
      <div class="streak-row"><div class="streak-number" id="streakNum">0</div><div class="streak-word">DIAS</div></div>
      <div class="streak-best" id="bestStreak">Maior sequência: 0 dias</div>
    </section>
    <h2 class="section-title">Painel geral</h2>
    <div class="grid">
      <div class="stat-card"><div class="muted small">DIAS CONCLUÍDOS</div><b id="homeDone">0 / 120</b></div>
      <div class="stat-card"><div class="muted small">DIAS RESTANTES</div><b id="homeLeft">120</b></div>
      <div class="stat-card"><div class="muted small">PROGRESSO</div><b id="homeProgress">0%</b></div>
      <div class="stat-card"><div class="muted small">MAIOR SEQUÊNCIA</div><b id="homeBest">0 dias</b></div>
    </div>
    <h2 class="section-title">Regras</h2>
    <div class="card rules" id="rulesList"></div>
    <h2 class="section-title">Marcos de hoje</h2>
    <div class="card" id="milestones"></div>
    <h2 class="section-title">Treino de hoje</h2>
    <div id="todayWorkout"></div>
  </div>`;
}

function foodPage(){
  return `<div class="page"><h1 class="section-title">Alimentação</h1>
    <div class="notice">Registro livre antes e durante o desafio. A contagem oficial continua separada.</div>
    <h2 class="section-title">O que ingerir</h2><div class="card" id="foodGuide"></div>
    <h2 class="section-title">Registro de hoje</h2>
    <div class="card"><input id="foodInput" class="input" placeholder="Ex.: frango, fruta, arroz..." value="${esc(state.food[currentKey()]||"")}"><button class="btn" id="saveFood">Salvar alimentação</button></div>
    <div class="card"><div class="row"><span>Água hoje</span><strong>${formatLiters(state.days[currentKey()]?.water||0)} / 2,5 L</strong></div><div class="progress"><i style="width:${Math.min(100,Number(state.days[currentKey()]?.water||0)/2.5*100)}%;background:var(--blue)"></i></div></div>
  </div>`;
}

function trainingPage(){
  return `<div class="page"><h1 class="section-title">Treino</h1>
    <div class="tabs"><button class="tab ${trainingView==="complete"?"active":""}" data-training-view="complete">Treino completo</button><button class="tab ${trainingView==="running"?"active":""}" data-training-view="running">Corrida</button></div>
    <div id="trainingComplete" style="display:${trainingView==="complete"?"block":"none"}">
      <div class="sectionTitle">Treino A</div><div class="card">${workoutList("A")}</div>
      <div class="sectionTitle">Treino B</div><div class="card">${workoutList("B")}</div>
      <div class="sectionTitle">Treino C</div><div class="card">${workoutList("C")}</div>
      <div class="sectionTitle">Descanso</div><div class="card"><div class="tagline">Ciclo: A → B → C → Descanso → A...</div></div>
      <div class="sectionTitle">Treino de hoje</div><div id="trainingToday"></div>
      <div class="sectionTitle">Histórico de treino</div><div id="workoutHistory"></div>
    </div>
    <div id="trainingRunning" style="display:${trainingView==="running"?"block":"none"}">
      <div class="sectionTitle">Registrar corrida</div>
      <div class="card"><form id="runForm" class="form"><div class="two"><input id="runDistance" class="input" type="number" min="0.01" step="0.01" placeholder="Distância (km)" required><input id="runPace" class="input" placeholder="Pace (ex. 5:45)" required></div><button class="btn">Salvar corrida</button></form></div>
      <div class="sectionTitle">Histórico de corrida</div><div class="history" id="runHistory"></div>
    </div>
  </div>`;
}

function workoutList(type){
  return workoutItems(type).map(([name,area])=>`<div class="exercise"><div class="exercise-line"><div><div class="exercise-name">${esc(name)}</div><div class="exercise-area">${esc(area)}</div></div><input class="weight" data-weight-name="${esc(name)}" inputmode="decimal" placeholder="kg" value="${esc(state.weights[name]||"")}"></div></div>`).join("");
}
function workoutCard(type,k){
  if(type==="DESCANSO")return `<div class="card"><span class="pill">DESCANSO</span><h3>Dia de recuperação</h3><div class="tagline">O próximo treino será o Treino A.</div></div>`;
  return `<div class="card"><span class="pill">TREINO ${type}</span>${workoutListForDate(type,k)}</div>`;
}
function workoutListForDate(type,k){
  return workoutItems(type).map(([name,area])=>`<div class="exercise"><div class="exercise-line"><div><div class="exercise-name">${esc(name)}</div><div class="exercise-area">${esc(area)}</div></div><input class="weight" data-weight-name="${esc(name)}" inputmode="decimal" placeholder="kg" value="${esc(state.weights[name]||"")}"></div></div>`).join("");
}

function financePage(){
  return `<div class="page"><h1 class="section-title">Finanças</h1>
    <div class="grid"><div class="stat-card"><div class="muted small">RENDA</div><b id="incomeShow">£0,00</b></div><div class="stat-card"><div class="muted small">GASTOS</div><b id="expenseShow">£0,00</b></div></div>
    <div class="sectionTitle">Gastos por categoria</div>
    <div class="card"><div class="donut-wrap"><svg class="donut" viewBox="0 0 200 200"><circle class="ring" cx="100" cy="100" r="72" stroke="#2c2c30"></circle>${[1,2,3,4,5].map(i=>`<circle id="seg${i}" class="ring" cx="100" cy="100" r="72"></circle>`).join("")}</svg><div class="donut-center"><b id="expenseTotal">£0,00</b><span class="muted">gastos</span></div></div><div class="legend" id="legend"></div></div>
    <div class="sectionTitle">Adicionar renda</div>
    <div class="card"><form id="incomeForm" class="form"><input id="incomeInput" class="input" type="number" min="0.01" step="0.01" placeholder="Valor recebido" required><button class="btn">Adicionar renda</button></form></div>
    <div class="sectionTitle">Adicionar gasto</div>
    <div class="card"><form id="expenseForm" class="form"><select id="expenseCategory" class="input">${CATEGORIES.map(c=>`<option>${c}</option>`).join("")}</select><input id="expenseInput" class="input" type="number" min="0.01" step="0.01" placeholder="Valor gasto" required><button class="btn">Adicionar gasto</button></form></div>
    <div class="sectionTitle">Resumo</div><div class="card"><div class="row"><span>Recebido</span><b id="incomeShow2">£0,00</b></div><div class="row"><span>Gastos</span><b id="expenseShow2">£0,00</b></div><div class="row"><span>Saldo</span><b id="balanceShow">£0,00</b></div></div>
    <div class="sectionTitle">Histórico</div><div class="history" id="financeHistory"></div>
  </div>`;
}

function photosPage(){
  return `<div class="page"><h1 class="section-title">Fotos</h1><div class="card"><input id="photoInput" class="input" type="file" accept="image/*" capture="environment" multiple><div class="tagline">As fotos ficam salvas neste navegador. Fotos anteriores ao início aparecem como pré-desafio.</div></div><div class="sectionTitle">Histórico</div><div class="photo-grid" id="photoGrid"></div></div>`;
}

function performancePage(){
  return `<div class="page"><h1 class="section-title">Desempenho</h1>
    <div class="grid"><div class="stat-card"><div class="muted small">DIAS CONCLUÍDOS</div><b id="perfDays">0 / 120</b></div><div class="stat-card"><div class="muted small">TREINOS CONCLUÍDOS</div><b id="perfTraining">0</b></div><div class="stat-card"><div class="muted small">METAS DE ÁGUA</div><b id="perfWater">0</b></div><div class="stat-card"><div class="muted small">MAIOR SEQUÊNCIA</div><b id="perfBest">0</b></div></div>
    <div class="sectionTitle">Evolução</div><div class="card"><div class="row"><span>Consistência</span><b id="perfConsistency">0%</b></div><div class="row"><span>Água</span><b id="perfWaterPct">0%</b></div><div class="row"><span>Treino</span><b id="perfTrainingPct">0%</b></div><div class="chart" id="evolutionChart"></div><div class="chart-legend"><span class="chart-key"><i class="water"></i>Água</span><span class="chart-key"><i class="training"></i>Treino</span><span class="chart-key"><i class="complete"></i>Dia completo</span></div></div>
    <div class="sectionTitle">Calendário</div><div class="card"><div class="calendar" id="performanceCalendar"></div><div class="calendar-legend"><span>● concluído</span><span>● parcial</span><span>● futuro</span></div></div>
    <div class="sectionTitle">Registros recentes</div><div class="card" id="dailyHistory"></div>
  </div>`;
}

function bindPage(){
  document.querySelectorAll("#nav button").forEach(b=>b.onclick=()=>{page=b.dataset.page;render()});
  document.querySelectorAll("[data-training-view]").forEach(b=>b.onclick=()=>{trainingView=b.dataset.trainingView;render()});
  document.querySelectorAll("[data-weight-name]").forEach(i=>i.onchange=()=>{state.weights[i.dataset.weightName]=i.value.trim();save()});
  const waterBtn=document.getElementById("waterBtn");if(waterBtn)waterBtn.onclick=waterPrompt;
  const workoutBtn=document.getElementById("workoutBtn");if(workoutBtn)workoutBtn.onclick=toggleTraining;
  const saveFood=document.getElementById("saveFood");if(saveFood)saveFood.onclick=saveFoodRecord;
  const runForm=document.getElementById("runForm");if(runForm)runForm.onsubmit=saveRun;
  const incomeForm=document.getElementById("incomeForm");if(incomeForm)incomeForm.onsubmit=addIncome;
  const expenseForm=document.getElementById("expenseForm");if(expenseForm)expenseForm.onsubmit=addExpense;
  const photoInput=document.getElementById("photoInput");if(photoInput)photoInput.onchange=addPhotos;
  document.getElementById("menuBtn").onclick=showMenu;
}

function renderDynamic(){
  renderHeader();
  if(page==="home"){
    renderHome();renderRules();
  }else if(page==="alimentacao")renderFood();
  else if(page==="treino")renderTraining();
  else if(page==="financas")renderFinance();
  else if(page==="fotos")renderPhotos();
  else if(page==="desempenho")renderPerformance();
}

function renderHeader(){
  const c=challengeInfo();
  const n=document.getElementById("dayNum"),p=document.getElementById("dayPct"),f=document.getElementById("dayFill"),s=document.getElementById("dayStatus");
  if(!n)return;
  n.textContent=`${c.day}/120`;p.textContent=`${c.percent}%`;f.style.width=`${c.percent}%`;
  s.textContent=c.finished?"Desafio encerrado em 01/01/2027.":c.started?"Dia oficial em andamento. O dia operacional muda às 03:00.":"O desafio oficial começa em 01/09/2026. O aplicativo já funciona antes do início.";
  const st=streakStats();
  const sn=document.getElementById("streakNum");if(sn)sn.textContent=st.current;
  const sw=document.getElementById("bestStreak");if(sw)sw.textContent=`Maior sequência: ${st.best} ${st.best===1?"dia":"dias"}`;
  const hb=document.getElementById("homeBest");if(hb)hb.textContent=`${st.best} ${st.best===1?"dia":"dias"}`;
}

function renderHome(){
  const c=challengeInfo(),limit=c.limit,st=streakStats();
  let done=0;for(let i=1;i<=limit;i++)if(isCompleteKey(dateKey(challengeDate(i))))done++;
  const hd=document.getElementById("homeDone");if(hd)hd.textContent=`${done} / 120`;
  const hl=document.getElementById("homeLeft");if(hl)hl.textContent=Math.max(0,120-limit);
  const hp=document.getElementById("homeProgress");if(hp)hp.textContent=`${c.percent}%`;
  const today=currentKey(),rec=state.days[today]||{},type=workoutForDate(new Date());
  const milestones=document.getElementById("milestones");
  if(milestones)milestones.innerHTML=`<div class="row"><span>💧 Água — meta 2,5 L</span><div><b>${formatLiters(rec.water||0)} L</b><br><button class="btn ${Number(rec.water||0)>=2.5?"done":""}" id="waterBtn">${Number(rec.water||0)>=2.5?"Concluído":"Registrar"}</button></div></div><div class="divider"></div><div class="row"><span>${type==="DESCANSO"?"😴 Descanso":"🏋️ Treino — "+type}</span><button class="btn ${type==="DESCANSO"||rec.training?"done":""}" id="workoutBtn">${type==="DESCANSO"||rec.training?"Concluído":"Marcar"}</button></div>`;
  const homeWater=document.getElementById("homeWater");if(homeWater)homeWater.textContent=`${formatLiters(rec.water||0)} / 2,5 L`;
  const homeTraining=document.getElementById("homeTraining");if(homeTraining)homeTraining.textContent=type==="DESCANSO"?"Descanso":rec.training?"Concluído":"Pendente";
  const homeBalance=document.getElementById("homeBalance");if(homeBalance)homeBalance.textContent=money(state.income-totalExpenses());
  renderTodayWorkout();
}
function renderRules(){const el=document.getElementById("rulesList");if(el)el.innerHTML=RULES.map((r,i)=>`<div class="rule"><div class="rule-no">${i+1}</div><div>${esc(r)}</div></div>`).join("")}
function renderTodayWorkout(){const el=document.getElementById("todayWorkout");if(!el)return;el.innerHTML=workoutCard(workoutForDate(new Date()),currentKey())}
function renderTraining(){
  const today=document.getElementById("trainingToday");if(today)today.innerHTML=workoutCard(workoutForDate(new Date()),currentKey());
  const h=document.getElementById("workoutHistory");if(h)h.innerHTML=workoutHistoryHTML();
  renderRunHistory();
}
function workoutHistoryHTML(){
  const entries=Object.entries(state.days).filter(([k,v])=>v&&v.training).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,30);
  if(!entries.length)return `<div class="card empty">Nenhum treino salvo ainda.</div>`;
  return `<div class="history">${entries.map(([k,v])=>`<div class="history-item"><div class="history-top"><b>${dateFmt(k)}</b><b>Treino ${esc(v.workout||workoutForDate(fromKey(k)))}</b></div><div class="tagline">${isOfficialKey(k)?`Dia ${challengeDayForKey(k)}`:"Pré-desafio"} · concluído${v.weights?` · ${Object.keys(v.weights).length} cargas`:""}</div></div>`).join("")}</div>`;
}
function renderFood(){const el=document.getElementById("foodGuide");if(el)el.innerHTML=FOOD.map(x=>`<div class="row"><div><b>${esc(x[0])}</b><div class="tagline">${esc(x[1])}</div></div></div>`).join("")}
function renderFinance(){
  const vals=CATEGORIES.map(c=>Number(state.expenses[c]||0)),sum=vals.reduce((a,b)=>a+b,0),circ=2*Math.PI*72;let offset=0;
  [1,2,3,4,5].forEach((n,i)=>{const el=document.getElementById(`seg${n}`);if(!el)return;const len=sum?circ*vals[i]/sum:circ/5;el.style.stroke=COLORS[i];el.style.opacity=sum?"1":".28";el.setAttribute("stroke-dasharray",`${len} ${circ}`);el.setAttribute("stroke-dashoffset",`${-offset}`);offset+=len});
  setText("expenseTotal",money(sum));setText("incomeShow",money(state.income));setText("expenseShow",money(sum));setText("incomeShow2",money(state.income));setText("expenseShow2",money(sum));setText("balanceShow",money(state.income-sum));
  const legend=document.getElementById("legend");if(legend)legend.innerHTML=CATEGORIES.map((c,i)=>`<div class="legend-row"><span><i class="dot c${i+1}"></i>${c}</span><b>${money(vals[i])}</b></div>`).join("");
  const hist=document.getElementById("financeHistory");if(hist){const tx=state.finances.slice().reverse().slice(0,40);hist.innerHTML=tx.length?tx.map(x=>`<div class="history-item"><div class="history-top"><b>${x.type==="income"?"Renda":"Gasto — "+esc(x.category)}</b><b>${x.type==="income"?"+":"−"}${money(x.value)}</b></div><div class="tagline">${dateFmt(x.date)}${x.note?` · ${esc(x.note)}`:""}</div></div>`).join(""):"<div class=\"empty\">Nenhum lançamento ainda.</div>"}
}
function renderPhotos(){const el=document.getElementById("photoGrid");if(!el)return;el.innerHTML=state.photos.length?state.photos.map((p,i)=>`<div><img src="${p.src}" alt="Foto ${i+1}"><div class="tagline" style="padding:5px 2px">${p.day?`Dia ${p.day}`:"Pré-desafio"} · ${dateFmt(p.date)}</div></div>`).join(""):"<div class=\"empty\" style=\"grid-column:1/-1\">Nenhuma foto registrada.</div>"}
function renderRunHistory(){const el=document.getElementById("runHistory");if(!el)return;const arr=state.runs.slice().sort((a,b)=>b.date.localeCompare(a.date));el.innerHTML=arr.length?arr.map(r=>`<div class="history-item"><div class="history-top"><b>${r.day?`Dia ${r.day}`:"Pré-desafio"}</b><b>${Number(r.distance).toFixed(2).replace('.',',')} km</b></div><div class="tagline">${dateFmt(r.date)} · pace ${esc(r.pace)}</div></div>`).join(""):"<div class=\"empty\">Nenhuma corrida registrada ainda.</div>"}
function renderPerformance(){
  const limit=challengeDaysLimit();let done=0,training=0,water=0;
  for(let i=1;i<=limit;i++){const k=dateKey(challengeDate(i)),x=state.days[k]||{};if(isCompleteKey(k))done++;if(x.training)training++;if(Number(x.water||0)>=2.5)water++}
  const denom=limit||1,st=streakStats();
  setText("perfDays",`${done} / 120`);setText("perfTraining",training);setText("perfWater",water);setText("perfBest",st.best);setText("perfConsistency",`${Math.round(done/denom*100)}%`);setText("perfWaterPct",`${Math.round(water/denom*100)}%`);setText("perfTrainingPct",`${Math.round(training/denom*100)}%`);
  renderEvolution();renderCalendar("performanceCalendar");
  const hist=document.getElementById("dailyHistory");if(hist){let rows=[];for(let i=limit;i>=1&&rows.length<30;i--){const k=dateKey(challengeDate(i)),x=state.days[k];if(x)rows.push(`<div class="row"><span>Dia ${i}</span><span>${Number(x.water||0)>=2.5?"💧":"—"} ${x.training?"🏋️":"—"} <b>${isCompleteKey(k)?"Concluído":"Pendente"}</b></span></div>`)}hist.innerHTML=rows.length?rows.join(""):"<div class=\"empty\">O histórico aparecerá conforme você registrar os dias.</div>"}
}
function renderEvolution(){
  const el=document.getElementById("evolutionChart");if(!el)return;let cols="";const today=dateOnly(operationalDate());
  for(let i=13;i>=0;i--){const d=addDays(today,-i),k=dateKey(d),x=state.days[k]||{},water=Math.min(100,Number(x.water||0)/2.5*100),training=x.training?100:0,complete=isCompleteKey(k)?100:0;cols+=`<div class="chart-col" title="${dateFmt(k)}"><div style="width:78%;height:100%;display:flex;align-items:end;gap:2px"><i class="chart-bar water" style="height:${Math.max(3,water)}%"></i><i class="chart-bar training" style="height:${Math.max(3,training)}%"></i><i class="chart-bar complete" style="height:${Math.max(3,complete)}%"></i></div></div>`}
  el.innerHTML=cols;
}
function renderCalendar(id){
  const el=document.getElementById(id);if(!el)return;const s=startDate(),limit=challengeDaysLimit();let html=["S","T","Q","Q","S","S","D"].map(x=>`<div class="weekday">${x}</div>`).join("");const offset=(s.getDay()+6)%7;for(let i=0;i<offset;i++)html+='<div></div>';
  for(let i=1;i<=120;i++){const k=dateKey(challengeDate(i)),x=state.days[k]||{},complete=isCompleteKey(k),partial=!!(x.training||Number(x.water||0)>0),future=i>limit;html+=`<div class="calday ${future?"future":complete?"done":partial?"partial":""} ${i===limit&&limit>0?"today":""}"><span>${i}</span><span class="status-dot"></span></div>`}
  el.innerHTML=html;
}

function setText(id,value){const el=document.getElementById(id);if(el)el.textContent=value}
function formatLiters(v){return Number(v||0).toFixed(1).replace('.',',')}
function waterPrompt(){
  const k=currentKey(),current=Number(state.days[k]?.water||0),raw=prompt("Quanto de água você bebeu hoje? (litros)",String(current).replace('.',','));
  if(raw===null)return;const n=Math.max(0,Number(String(raw).replace(',','.'))||0);state.days[k]={...(state.days[k]||{}),water:n};save();render();toast("Água registrada");
}
function toggleTraining(){
  const k=currentKey(),type=workoutForDate(new Date());if(type==="DESCANSO"){toast("Hoje é dia de descanso");return}
  const old=state.days[k]||{};state.days[k]={...old,training:!old.training,workout:type};save();render();toast(state.days[k].training?"Treino marcado":"Treino desmarcado");
}
function saveFoodRecord(){const k=currentKey();state.food[k]=document.getElementById("foodInput").value.trim();save();toast("Alimentação salva");render()}
function validPace(p){return /^\d{1,2}:[0-5]\d$/.test(p)}
function saveRun(e){e.preventDefault();const distance=Number(document.getElementById("runDistance").value),pace=document.getElementById("runPace").value.trim();if(!(distance>0)||!validPace(pace)){alert("Use uma distância válida e pace no formato 5:45.");return}const k=currentKey();const day=challengeDayForKey(k);state.runs.push({date:k,recordDate:k,day,distance,pace});state.days[k]={...(state.days[k]||{}),run:true};save();render();toast("Corrida salva");setTimeout(()=>{trainingView="running";render()},0)}
function addIncome(e){e.preventDefault();const v=Number(document.getElementById("incomeInput").value);if(!(v>0))return;const k=currentKey();state.income+=v;state.finances.push({type:"income",value:v,date:k});save();render();toast("Renda adicionada")}
function addExpense(e){e.preventDefault();const v=Number(document.getElementById("expenseInput").value),cat=document.getElementById("expenseCategory").value;if(!(v>0))return;const k=currentKey();state.expenses[cat]=(state.expenses[cat]||0)+v;state.finances.push({type:"expense",value:v,category:cat,date:k});save();render();toast("Gasto adicionado")}
function totalExpenses(){return CATEGORIES.reduce((a,c)=>a+Number(state.expenses[c]||0),0)}

function compressImage(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=reject;reader.onload=()=>{const img=new Image();img.onerror=reject;img.onload=()=>{const max=1000,scale=Math.min(1,max/Math.max(img.width,img.height)),canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL("image/jpeg",.82))};img.src=reader.result}});}
async function addPhotos(e){for(const file of [...e.target.files]){if(!file.type.startsWith("image/"))continue;try{const src=await compressImage(file),k=currentKey(),day=challengeDayForKey(k);state.photos.unshift({src,date:k,day});}catch(err){console.warn(err)}}state.photos=state.photos.slice(0,80);save();render();e.target.value="";toast("Foto salva")}

function showMenu(){
  const modal=document.getElementById("modal");
  modal.innerHTML=`<div class="sheet"><div class="row"><div class="sheet-title">Menu</div><button class="btn secondary" id="closeMenu">Fechar</button></div><div class="sheet-actions"><button class="btn secondary" id="exportData">Exportar dados</button><button class="btn secondary" id="importData">Importar backup</button><button class="btn danger" id="resetData">Apagar todos os dados</button></div><input id="importFile" type="file" accept="application/json,.json" hidden></div>`;
  modal.classList.remove("hidden");modal.setAttribute("aria-hidden","false");
  document.getElementById("closeMenu").onclick=closeMenu;
  document.getElementById("exportData").onclick=exportData;
  document.getElementById("importData").onclick=()=>document.getElementById("importFile").click();
  document.getElementById("importFile").onchange=importData;
  document.getElementById("resetData").onclick=resetData;
}
function closeMenu(){const m=document.getElementById("modal");m.classList.add("hidden");m.setAttribute("aria-hidden","true")}
function exportData(){const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="120-days-backup.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);toast("Backup exportado")}
function importData(e){const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);if(!x||typeof x!=="object")throw new Error();state={...defaultState(),...x};save();closeMenu();render();toast("Backup importado")}catch{toast("Arquivo inválido")}};r.readAsText(file)}
function resetData(){if(!confirm("Apagar todos os dados do 120 DAYS?"))return;state=defaultState();save();closeMenu();render();toast("Dados apagados")}
function toast(text){const old=document.querySelector(".toast");if(old)old.remove();const el=document.createElement("div");el.className="toast";el.textContent=text;document.body.appendChild(el);setTimeout(()=>el.remove(),1700)}

render();
setInterval(()=>{renderDynamic();bindPage()},30000);
if("serviceWorker" in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}))}
