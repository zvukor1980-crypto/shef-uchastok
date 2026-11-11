/* Шеф полиции: Участок — логика, интерфейс, звук */
const SAVE_KEY="shef-uchastok-v1";
let S, TAB="station", dirty=false, lastTs=0, acc=0;
const cam={x:0,y:0,z:1};
let pointers=new Map(), pan0=null, pinch0=null, moved=false;

const $ = s=>document.querySelector(s);
const $$ = s=>[...document.querySelectorAll(s)];

/* ===== audio ===== */
const AU={
  ctx:null, muted:false,
  init(){ if(this.ctx) return; try{this.ctx=new (window.AudioContext||window.webkitAudioContext)();}catch(e){} },
  tone(f,d,type="sine",g=0.08,dec=0.15){
    if(this.muted||!this.ctx)return;
    const c=this.ctx, o=c.createOscillator(), a=c.createGain();
    o.type=type;o.frequency.value=f;a.gain.value=g;
    a.gain.exponentialRampToValueAtTime(0.0001,c.currentTime+d+dec);
    o.connect(a).connect(c.destination);o.start();o.stop(c.currentTime+d+dec);
  },
  click(){this.tone(720,0.04,"square",0.04);},
  coin(){this.tone(880,0.05,"square",0.06);setTimeout(()=>this.tone(1170,0.08,"square",0.05),50);},
  paper(){this.tone(420,0.07,"triangle",0.05);},
  car(){this.tone(180,0.25,"sawtooth",0.05);setTimeout(()=>this.tone(140,0.3,"sawtooth",0.04),200);},
  ok(){this.tone(523,0.07,"triangle",0.06);setTimeout(()=>this.tone(784,0.12,"triangle",0.06),80);},
  warn(){this.tone(220,0.18,"square",0.07);setTimeout(()=>this.tone(180,0.22,"square",0.07),160);},
  gacha(){this.tone(392,0.08);setTimeout(()=>this.tone(523,0.08),80);setTimeout(()=>this.tone(784,0.16),180);},
  riot(){this.tone(160,0.4,"sawtooth",0.07);}
};

/* ===== state ===== */
function load(){
  try{
    const t=localStorage.getItem(SAVE_KEY);
    if(t){
      const o=JSON.parse(t);
      const d=defaultState();
      S=deepMerge(d,o);
      // sanitize
      for(const id of ROOM_ORDER) if(!S.rooms[id]) S.rooms[id]=d.rooms[id];
      for(const id of HERO_ORDER) if(!S.heroes[id]) S.heroes[id]=d.heroes[id];
      if(S.tasks.day!==todayKey()){S.tasks={day:todayKey(),prog:{},claimed:{}};}
      S.actors=[]; S.bubbles=S.bubbles||[];
      if(!S.car) S.car={state:"idle",t:0,x:4,y:16};
      return true;
    }
  }catch(e){console.warn("load",e);}
  S=defaultState();
  S.actors=[]; S.car={state:"idle",t:0,x:4,y:16};
  return false;
}
function deepMerge(a,b){
  if(!b||typeof b!=="object") return a;
  const o=Array.isArray(a)?a.slice():{...a};
  for(const k of Object.keys(b)){
    if(b[k] && typeof b[k]==="object" && !Array.isArray(b[k]) && a[k] && typeof a[k]==="object") o[k]=deepMerge(a[k],b[k]);
    else o[k]=b[k];
  }
  return o;
}
function save(){
  try{
    const copy={...S, actors:undefined, lastSave:Date.now()};
    localStorage.setItem(SAVE_KEY, JSON.stringify(copy));
    dirty=false;
  }catch(e){}
}
function mark(){dirty=true;}

/* ===== economy helpers ===== */
function addRes(k,n){
  S[k]=(S[k]||0)+n;
  if(k==="cash" && n>0) addStat("cashGot",n);
  mark(); hud();
}
function addStat(k,n){
  S.stats[k]=(S.stats[k]||0)+n;
  if(S.tasks.day===todayKey()) S.tasks.prog[k]=(S.tasks.prog[k]||0)+n;
  mark();
}

function toast(msg){
  const t=document.createElement("div");
  t.className="toast";t.textContent=msg;
  $("#toasts").appendChild(t);
  setTimeout(()=>t.remove(),2600);
}

/* ===== simulation ===== */
function spawnCitizen(){
  const r=ROOMS.reception;
  const a={kind:"citizen", wx:r.gx+4, wy:r.gy+r.gh+2, tx:r.gx+4, ty:r.gy+5.2,
    phase:Math.random()*10, walk:true, color:["#4a7ab0","#7a4a3a","#3a7a5a","#6a5a8a"][Math.random()*4|0],
    hair:["#3a2a1a","#6a4a20","#1a1a1a","#c0a070"][Math.random()*4|0],
    skin:["#e0b090","#d0a07a","#c48a5a","#f0d0b8"][Math.random()*4|0],
    life:1, state:"in"};
  S.actors.push(a);
}
function walkActors(dt){
  for(const a of S.actors){
    a.phase+=(a.walk?8:2)*dt;
    const dx=a.tx-a.wx, dy=a.ty-a.wy;
    const dist=Math.hypot(dx,dy);
    if(dist<0.05){ a.wx=a.tx;a.wy=a.ty;a.walk=false; }
    else{
      const sp=(a.spd||1.6)*dt;
      a.wx+=dx/dist*Math.min(sp,dist);
      a.wy+=dy/dist*Math.min(sp,dist);
      a.walk=true;
    }
  }
  S.actors=S.actors.filter(a=>a.life!==0);
}

function assignedHero(room){
  const hid=S.rooms[room].hero;
  return hid && S.heroes[hid]?.owned ? hid : null;
}

function startWork(id){
  const r=S.rooms[id], d=ROOMS[id];
  if(r.work) return false;
  if(d.kind==="chain"||d.kind==="patrol"||d.kind==="interrog"){
    if(r.in<=0) return false;
    if(d.need && S[d.need]<d.needAmt && d.id==="garage"){
      // still allow, but slower — handled in speed; just warn once
    }
    r.work=true; r.prog=0; mark(); return true;
  }
  if(d.kind==="resource"){
    r.work=true; r.prog=0; mark(); return true;
  }
  return false;
}

function finishWork(id){
  const r=S.rooms[id], d=ROOMS[id];
  r.work=false; r.prog=0;
  if(d.kind==="chain"){
    r.in=Math.max(0,r.in-1);
    r.out++;
    addStat(d.outKey==="docs"?"docs":d.outKey==="warrants"?"warrants":d.outKey,1);
    addBubble(id,d.outKey,1);
    AU.paper();
  }else if(d.kind==="patrol"){
    // start car trip instead of instant out
    if(d.need) S[d.need]=Math.max(0,S[d.need]-(S[d.need]>=d.needAmt?d.needAmt:0));
    r.in=Math.max(0,r.in-1);
    S.car.state="out"; S.car.t=0;
    addStat("patrols",1);
    AU.car();
    // officer already in garage, car leaves
  }else if(d.kind==="interrog"){
    // shouldn't finish automatically — player chooses tactic, unless auto
    r.work=false;
  }else if(d.kind==="resource"){
    const amt=(d.prodAmt||2)+Math.floor((r.level-1)*0.5);
    r.out+=amt;
    addBubble(id,d.prod,amt);
  }
  mark();
}

function addBubble(room,kind,amt){
  const d=ROOMS[room];
  const existing=S.bubbles.find(b=>b.room===room && b.kind===kind);
  if(existing){existing.amt+=amt;return;}
  S.bubbles.push({id:Date.now()%1e9+Math.random(), room, kind, amt, wx:d.gx+d.gw*0.5+ (Math.random()*0.8-0.4), wy:d.gy+d.gh*0.35});
}

function collectBubble(id){
  const i=S.bubbles.findIndex(b=>b.id===id);
  if(i<0)return;
  const b=S.bubbles[i];
  S.bubbles.splice(i,1);
  if(b.kind==="cash" && b.room==="cells"){
    const amt=S.rooms.cells.pending|0; S.rooms.cells.pending=0;
    if(amt>0){addRes("cash",amt); toast("+"+fmt(amt)+" ₽");}
    AU.coin(); mark(); hud(); return;
  }
  deliver(b.room,b.kind,b.amt);
  AU.coin();
}

function deliver(room,kind,amt){
  const d=ROOMS[room];
  if(kind==="cash" || kind==="gas" || kind==="ammo" || kind==="elec" || kind==="diamonds"){
    addRes(kind,amt);
    if(kind==="cash") toast("+"+fmt(amt)+" ₽");
    else toast("+"+amt+" "+({gas:"бензина",ammo:"патронов",elec:"энергии",diamonds:"алмазов"}[kind]));
    return;
  }
  // transfer to next room input
  if(d.next && ROOMS[d.next]){
    const n=S.rooms[d.next];
    n.in+=amt;
    // visual walker
    spawnTransfer(room,d.next,kind);
  }
  // also reduce out buffer if it was counted there
  const r=S.rooms[room];
  if(r.out>0) r.out=Math.max(0,r.out-amt);
  mark(); hud();
}

function spawnTransfer(from,to,kind){
  const a=ROOMS[from], b=ROOMS[to];
  const typ=kind==="inmates"||kind==="suspects"?(kind==="inmates"?"inmate":"suspect"):"citizen";
  S.actors.push({
    kind: typ==="citizen"?"citizen":typ,
    wx:a.gx+a.gw*0.5, wy:a.gy+a.gh*0.5,
    tx:b.gx+b.gw*0.5, ty:b.gy+b.gh*0.5,
    phase:0, walk:true, life:1, color:"#889", hair:"#333", skin:"#d0a07a",
    onArrive:"drop"
  });
}

function collectRoom(id){
  const r=S.rooms[id], d=ROOMS[id];
  if(d.kind==="holding"){
    if(r.pending>0){ addRes("cash",r.pending|0); toast("+"+fmt(r.pending|0)+" ₽"); r.pending=0; AU.coin(); mark(); hud(); S.bubbles=S.bubbles.filter(b=>!(b.room==="cells"&&b.kind==="cash")); }
    return;
  }
  if(r.out>0){
    const amt=r.out; r.out=0;
    // remove matching bubbles
    S.bubbles=S.bubbles.filter(b=>b.room!==id);
    deliver(id, d.outKey||d.prod, amt);
    AU.coin();
  }
}

function doInterrog(tactic){
  const r=S.rooms.interrog;
  if(r.in<=0){ closeModal(); return; }
  r.in--;
  const hid=assignedHero("interrog");
  let sat=tactic==="scare"?8:14;
  if(hid){
    const def=HEROES[hid];
    sat=Math.round(sat*(1+heroPower(hid,S)*((def.bonus.sat||0)+(def.bonus.global||0))));
  }
  if(tactic==="scare") sat=Math.round(sat*0.85)+2;
  S.sat=Math.min(100,S.sat+sat);
  addStat("interrogs",1);
  // produce inmate if cells have space, else stay in out
  const cap=roomCap("cells",S);
  if(S.rooms.cells.in<cap){
    S.rooms.cells.in++;
    spawnTransfer("interrog","cells","inmates");
  }else{
    S.rooms.interrog.out++;
    toast("Камеры заполнены — заключённый ждёт");
  }
  AU.ok();
  mark(); hud();
  closeModal();
  toast(tactic==="scare"?"Допрос: запугивание":"Допрос: уговор");
}

function sendRiot(){
  if(!S.riot) return;
  if(S.ammo>=5) S.ammo-=5;
  S.riot=false; S.riotTimer=0;
  // maybe lose 1 inmate
  AU.ok();
  toast("Бунт подавлен");
  mark(); hud();
}

function upgradeRoom(id){
  const r=S.rooms[id], cost=roomCost(id,r.level);
  if(S.cash<cost){toast("Не хватает денег — загляните в магазин");return;}
  S.cash-=cost; r.level++; addStat("upgrades",1);
  AU.ok(); toast(ROOMS[id].name+" — уровень "+r.level);
  mark(); hud(); renderRoomModal(id);
}

function upgradeChief(){
  const c=chiefCost(S.chiefLv);
  if(S.cash<c.cash||S.diamonds<c.diamonds){toast("Не хватает ресурсов — всё есть в магазине бесплатно");return;}
  S.cash-=c.cash; S.diamonds-=c.diamonds;
  S.chiefLv++;
  const hint=UNLOCK_HINT[S.chiefLv];
  AU.ok();
  toast(hint?("Участок вырос! Открыто: "+hint):("Кабинет шефа — уровень "+S.chiefLv));
  mark(); hud();
  openRoom("chief");
}

function tick(dt){
  // spawn citizens
  S._spawn=(S._spawn||0)+dt;
  const rec=S.rooms.reception;
  const spawnEvery=Math.max(1.2, 3.5/(1+(rec.level-1)*0.15));
  if(S._spawn>=spawnEvery){
    S._spawn=0;
    if(rec.in<roomCap("reception",S)+4){
      rec.in++;
      spawnCitizen();
      // auto-start
    }
  }

  // auto start work for rooms
  for(const id of ROOM_ORDER){
    const d=ROOMS[id], r=S.rooms[id];
    if(S.chiefLv<d.unlock) continue;
    if(d.kind==="chain"){
      if(!r.work && (d.inKey? r.in>0 : rec.in>0)){
        if(!d.inKey && rec.in>0){ /* reception uses in as waiting citizens */ }
        startWork(id);
      }
    }else if(d.kind==="patrol"){
      if(!r.work && r.in>0 && S.car.state==="idle") startWork(id);
    }else if(d.kind==="resource"){
      if(!r.work) startWork(id);
    }
    // interrog waits for player unless heroine assigned — then auto after short delay
  }

  // progress work
  const slots=S.secondQueue?2:1;
  for(const id of ROOM_ORDER){
    const d=ROOMS[id], r=S.rooms[id];
    if(!r.work) continue;
    if(d.kind==="interrog") continue;
    const t=roomSpeed(id,S);
    r.prog += dt/t * (slots>1 && d.kind!=="holding"?1.15:1);
    if(r.prog>=1){
      // reception consumes a waiting citizen
      if(id==="reception" && r.in>0){ /* consumed in finish */ }
      finishWork(id);
      if(id==="reception"){
        const civ=S.actors.find(a=>a.kind==="citizen"&&!a.walk);
        if(civ){civ.tx=civ.wx+1; civ.ty=civ.wy+4; civ.life=2; civ._fade=true;}
      }
    }
  }

  // car trip
  if(S.car.state==="out" || S.car.state==="back"){
    S.car.t+=dt;
    if(S.car.state==="out"){
      const p=Math.min(1,S.car.t/1.6);
      S.car.x=4; S.car.y=16+p*12;
      if(p>=1){S.car.state="back"; S.car.t=0;}
    }else{
      const p=Math.min(1,S.car.t/1.6);
      S.car.x=4; S.car.y=28-p*12;
      if(p>=1){
        S.car.state="idle"; S.car.t=0; S.car.x=4; S.car.y=16;
        S.rooms.garage.out++;
        addBubble("garage","suspects",1);
        AU.ok();
      }
    }
  }else{
    S.car.x=4; S.car.y=16;
  }

  // auto-interrogate if heroine assigned and suspects waiting
  const iq=S.rooms.interrog;
  if(iq.in>0 && assignedHero("interrog") && !S._iqlock){
    S._iqwait=(S._iqwait||0)+dt;
    if(S._iqwait>1.6){
      S._iqwait=0;
      // auto, prefer persuade
      doInterrogAuto("talk");
    }
  }else S._iqwait=0;

  // cells income
  const cells=S.rooms.cells;
  if(cells.in>0 && S.chiefLv>=1){
    let rate=ROOMS.cells.income * cells.in * (1+(cells.level-1)*0.12) * incomeMul(S);
    if(S.elec<=0) rate*=0.5;
    else S._elecT=(S._elecT||0)+dt;
    if(S._elecT>8){S._elecT=0; if(S.elec>0)S.elec--;}
    cells.pending += rate*dt;
    if(cells.pending>=25 && !S.bubbles.some(b=>b.room==="cells"&&b.kind==="cash")){
      addBubble("cells","cash",cells.pending|0);
      // bubble amt tracks via pending; we'll sync
    }
    // update cash bubble amount
    const cb=S.bubbles.find(b=>b.room==="cells"&&b.kind==="cash");
    if(cb) cb.amt=cells.pending|0;
  }

  // overcrowding riot
  const cap=roomCap("cells",S);
  if(cells.in>=cap && cap>0 && !S.riot){
    S.riotTimer=(S.riotTimer||0)+dt;
    if(S.riotTimer>18){
      S.riot=true; S.riotTimer=0; AU.riot(); toast("Бунт в камерах! Нажмите, чтобы подавить");
    }
  }else if(!S.riot) S.riotTimer=0;

  // auto-collect resource bubbles after 4s? keep until tap — but auto-start next is enough
  // auto transfer chain outputs after 5s so idle works
  S._auto=(S._auto||0)+dt;
  if(S._auto>5){
    S._auto=0;
    for(const id of ["reception","detective","garage","interrog","armory","electric","gasstation"]){
      const r=S.rooms[id];
      if(r.out>0) collectRoom(id);
    }
  }

  // actors expire after leaving
  for(const a of S.actors){
    if(a._fade && !a.walk) a.life=0;
    if(a.onArrive==="drop" && !a.walk) a.life=0;
  }
  walkActors(dt);

  // keep a few staff walking inside rooms
  ensureStaff();
}

function doInterrogAuto(tactic){
  // same as doInterrog but no modal
  const r=S.rooms.interrog;
  if(r.in<=0) return;
  r.in--;
  const hid=assignedHero("interrog");
  let sat=tactic==="scare"?8:14;
  if(hid){const def=HEROES[hid];sat=Math.round(sat*(1+heroPower(hid,S)*((def.bonus.sat||0)+(def.bonus.global||0))));}
  S.sat=Math.min(100,S.sat+sat);
  addStat("interrogs",1);
  const cap=roomCap("cells",S);
  if(S.rooms.cells.in<cap){S.rooms.cells.in++; spawnTransfer("interrog","cells","inmates");}
  else S.rooms.interrog.out++;
  mark();
}

function ensureStaff(){
  // one officer per assigned room, plus wandering
  const have=new Set(S.actors.filter(a=>a.kind==="hero").map(a=>a.hid));
  for(const id of ROOM_ORDER){
    const hid=S.rooms[id].hero;
    if(!hid || !S.heroes[hid]?.owned) continue;
    if(S.chiefLv<ROOMS[id].unlock) continue;
    if(have.has(hid)) continue;
    const d=ROOMS[id];
    S.actors.push({kind:"hero", hid, wx:d.gx+d.gw*0.45, wy:d.gy+d.gh*0.6,
      tx:d.gx+d.gw*0.45, ty:d.gy+d.gh*0.6, phase:Math.random()*8, walk:false, life:1, roam:id});
  }
  // roam occasionally
  for(const a of S.actors){
    if(a.kind==="hero" && a.roam && !a.walk && Math.random()<0.004){
      const d=ROOMS[a.roam];
      a.tx=d.gx+1+Math.random()*(d.gw-2);
      a.ty=d.gy+1.5+Math.random()*(d.gh-2.5);
    }
  }
}

/* ===== offline ===== */
function applyOffline(){
  const now=Date.now();
  const last=S.lastSave||now;
  const dt=Math.min(12*3600, Math.max(0,(now-last)/1000));
  if(dt<20) return;
  // estimate income
  const cells=S.rooms.cells.in||0;
  const rate=ROOMS.cells.income * Math.max(1,cells) * (1+(S.rooms.cells.level-1)*0.12) * incomeMul(S);
  const cash=Math.floor(rate*dt);
  const resTick=dt/5;
  const ammo=S.chiefLv>=2?Math.floor((ROOMS.armory.prodAmt+S.rooms.armory.level)*resTick):0;
  const elec=S.chiefLv>=3?Math.floor((ROOMS.electric.prodAmt+S.rooms.electric.level)*resTick):0;
  const gas=S.chiefLv>=5?Math.floor((ROOMS.gasstation.prodAmt+S.rooms.gasstation.level)*resTick):0;
  if(cash+ammo+elec+gas<=0 && dt<60) return;
  S.cash+=cash; S.ammo+=ammo; S.elec+=elec; S.gas+=gas;
  if(cash>0) addStat("cashGot",cash);
  const h=Math.floor(dt/3600), m=Math.floor((dt%3600)/60);
  const time=h?h+" ч "+m+" мин":m+" мин";
  let msg="Пока вас не было ("+time+"), участок заработал:\n💰 "+fmt(cash)+" ₽";
  if(ammo) msg+="\n🔫 "+ammo+" патронов";
  if(elec) msg+="\n⚡ "+elec+" энергии";
  if(gas) msg+="\n⛽ "+gas+" бензина";
  openModal(`<div class="mh">С возвращением</div><div class="ms" style="white-space:pre-line">${msg}</div><button class="btn wide" data-act="close">Забрать</button>`);
}

/* ===== UI ===== */
function hud(){
  const pills=[
    ["cash","💰",fmt(S.cash)],
    ["gas","⛽",fmt(S.gas)],
    ["ammo","🔫",fmt(S.ammo)],
    ["elec","⚡",fmt(S.elec)],
    ["diamonds","💎",fmt(S.diamonds)]
  ];
  $("#resrow").innerHTML=pills.map(([k,ic,v])=>`<div class="rpill" data-testid="res-${k}"><span class="ic">${ic}</span>${v}<button class="plus" data-act="tab" data-arg="shop" aria-label="Магазин">+</button></div>`).join("");
  $("#chiefLv").textContent=S.chiefLv;
  $("#satfill").style.width=Math.max(0,Math.min(100,S.sat))+"%";
  $("#satn").textContent=Math.round(S.sat)+"%";
  $("#btnMute").textContent=S.muted?"🔇":"🔊";
}

function setTab(t){
  TAB=t;
  $$("#tabs .tab").forEach(b=>b.classList.toggle("on", b.dataset.arg===t));
  const sheet=$("#sheet");
  if(t==="station"){sheet.classList.add("hidden");sheet.innerHTML="";}
  else{
    sheet.classList.remove("hidden");
    if(t==="heroes") renderHeroes();
    else if(t==="tasks") renderTasks();
    else if(t==="shop"){ addStat("shopVisits",1); renderShop(); }
  }
}

function renderShop(){
  const el=$("#sheet");
  el.innerHTML=`<div class="sheet-h">Магазин</div><div class="sheet-sub">Всё бесплатно, без таймеров и ограничений. Берите сколько нужно.</div>`+
    SHOP.map(sec=>`<div class="sec">${sec.cat}</div>`+sec.items.map(it=>`
      <div class="si" data-testid="shop-${it.id}">
        <div class="sic">${it.icon}</div>
        <div class="sn"><b>${it.name}</b><span>${it.sub}</span></div>
        <button class="btn" data-act="buy" data-arg="${it.id}" data-testid="buy-${it.id}">БЕСПЛАТНО</button>
      </div>`).join("")).join("");
}

function buy(id){
  let item=null;
  for(const s of SHOP){item=s.items.find(i=>i.id===id); if(item) break;}
  if(!item) return;
  AU.ok();
  if(item.give){
    for(const [k,v] of Object.entries(item.give)) addRes(k,v);
    toast("Получено: "+item.name);
  }else if(item.special==="fund"){
    if(!S.fund){S.fund=true;toast("Фонд роста активен: +50% к доходу");}
    else{addRes("cash",15000);toast("Фонд уже активен, дополнительно +15 000 ₽");}
  }else if(item.special==="pass"){
    S.pass=true;
    addRes("cash",15000); addRes("diamonds",1500); addRes("gas",200); addRes("ammo",200); addRes("elec",200);
    toast("Пропуск активирован: все 30 наград получены, скорость +20%");
  }else if(item.special==="vip"){
    S.vip=Math.min(10,S.vip+1);
    addRes("cash",5000*S.vip); addRes("diamonds",200*S.vip);
    toast("VIP "+S.vip+"! Награда получена");
  }else if(item.special==="queue"){
    S.secondQueue=true; toast("Вторая очередь включена: комнаты работают быстрее");
  }else if(item.special==="skip"){
    skipAll(); toast("Все дела завершены");
  }else if(item.special==="boost"){
    S.buffs.boost=true; toast("Заряд скорости навсегда");
  }else if(item.special==="gacha"){
    doGacha(item.arg);
    return;
  }
  mark(); hud();
  if(TAB==="shop") renderShop();
}

function skipAll(){
  for(const id of ROOM_ORDER){
    const r=S.rooms[id], d=ROOMS[id];
    if(r.work && d.kind!=="interrog"){ r.prog=1; finishWork(id); }
  }
  if(S.car.state==="out"||S.car.state==="back"){
    S.car.state="idle"; S.car.x=4; S.car.y=16;
    S.rooms.garage.out++; addBubble("garage","suspects",1);
  }
  mark();
}

function rarityPool(mode){
  const ids=HERO_ORDER.slice();
  if(mode==="legend") return ids.filter(i=>HEROES[i].rarity==="legend");
  if(mode==="epic") return ids.filter(i=>HEROES[i].rarity!=="rare");
  return ids;
}
function rollOne(mode){
  let pool;
  if(mode==="legend") pool=rarityPool("legend");
  else if(mode==="epic"){
    pool=Math.random()<0.3?rarityPool("legend"):rarityPool("epic").filter(i=>HEROES[i].rarity==="epic");
    if(!pool.length) pool=rarityPool("epic");
  }else{
    const r=Math.random();
    pool=r<0.05?rarityPool("legend"):r<0.30?HERO_ORDER.filter(i=>HEROES[i].rarity==="epic"):HERO_ORDER.filter(i=>HEROES[i].rarity==="rare");
  }
  return pool[Math.random()*pool.length|0];
}
function giveHero(id){
  const h=S.heroes[id];
  addStat("heroActs",1);
  if(!h.owned){
    h.owned=true; h.level=1; h.stars=0;
    return {id, neu:true};
  }else{
    h.frags=(h.frags||0)+10;
    if(h.frags>=10 && h.stars<5){h.frags-=10;h.stars++; return {id, neu:false, star:true};}
    if(h.stars>=5){h.level=Math.min(50,h.level+3); return {id, neu:false, lvl:true};}
    return {id, neu:false};
  }
}
function doGacha(mode){
  const n=mode==="10"?10:1;
  const got=[];
  for(let i=0;i<n;i++) got.push(giveHero(rollOne(mode==="10"?"1":mode)));
  AU.gacha();
  mark();
  const first=got[0];
  const def=HEROES[first.id];
  const rar=RAR[def.rarity];
  let extra=got.length>1?`<div class="ms">И ещё ${got.length-1}: ${got.slice(1).map(g=>HEROES[g.id].name).join(", ")}</div>`:"";
  const how=first.neu?"Новая сотрудница присоединилась к отделу!":first.star?"Дубликат: звезда повышена!":first.lvl?"Дубликат: уровень вырос!":"Дубликат: осколки добавлены.";
  openModal(`<div class="reveal">
    <div class="mh">Набор героинь</div>
    <img src="assets/heroes/${def.id}.webp" alt="${def.name}">
    <div class="rn">${def.name}</div>
    <div class="rr" style="color:${rar.color}">${rar.name} · ${def.role}</div>
    <div class="ms">${how}</div>${extra}
    <button class="btn wide" data-act="close">Отлично</button>
  </div>`);
  if(TAB==="heroes") renderHeroes();
}

function renderHeroes(){
  const el=$("#sheet");
  const owned=HERO_ORDER.filter(id=>S.heroes[id].owned).length;
  el.innerHTML=`<div class="sheet-h">Героини</div>
    <div class="sheet-sub">В отделе ${owned} из ${HERO_ORDER.length}. Назначьте сотрудницу в комнату — и она даст бонус.</div>
    <div class="gacha">
      <div class="gbtn"><b>Обычный набор</b><span>случайная героиня</span><button class="btn" data-act="buy" data-arg="h1" data-testid="gacha-1">БЕСПЛАТНО</button></div>
      <div class="gbtn"><b>Набор из 10</b><span>выше шанс эпической</span><button class="btn" data-act="buy" data-arg="h10" data-testid="gacha-10">БЕСПЛАТНО</button></div>
      <div class="gbtn"><b>Эпический</b><span>эпик или легенда</span><button class="btn gold" data-act="buy" data-arg="he">БЕСПЛАТНО</button></div>
      <div class="gbtn"><b>Легендарный</b><span>гарантия легенды</span><button class="btn gold" data-act="buy" data-arg="hl" data-testid="gacha-legend">БЕСПЛАТНО</button></div>
    </div>
    <div class="hero-grid">${HERO_ORDER.map(id=>{
      const def=HEROES[id], h=S.heroes[id], rar=RAR[def.rarity];
      if(!h.owned) return `<div class="hcard locked" data-act="hero" data-arg="${id}">
        <img src="assets/heroes/${id}.webp" alt="">
        <div class="lock">🔒</div>
        <div class="tag" style="background:#0008;color:${rar.color}">${rar.name}</div>
        <div class="hb"><div class="hn">${def.name}</div><div class="hr">${def.role}</div></div>
      </div>`;
      const stars="★".repeat(h.stars||0)+"☆".repeat(5-(h.stars||0));
      return `<div class="hcard" data-act="hero" data-arg="${id}" data-testid="hero-${id}">
        <img src="assets/heroes/${id}.webp" alt="${def.name}">
        <div class="tag" style="background:#0008;color:${rar.color}">${rar.name}</div>
        <div class="lv">ур. ${h.level}</div>
        <div class="hb"><div class="hn">${def.name}</div><div class="hr">${def.role}${h.assigned?" · "+ROOMS[h.assigned].name:""}</div>
        <div class="stars">${stars}</div></div>
      </div>`;
    }).join("")}</div>`;
}

function openHero(id){
  const def=HEROES[id], h=S.heroes[id], rar=RAR[def.rarity];
  if(!h.owned){
    openModal(`<div class="mh">${def.name}</div><div class="ms" style="color:${rar.color}">${rar.name} · ${def.role}</div>
      <img src="assets/heroes/${id}.webp" alt="" style="width:140px;height:140px;border-radius:16px;margin:8px auto;object-fit:cover">
      <div class="ms">${def.blurb}</div>
      <div class="ms">Ещё не в отделе. Возьмите набор — это бесплатно.</div>
      <button class="btn wide" data-act="buy" data-arg="h1">Набрать бесплатно</button>
      <button class="btn grey wide" data-act="close">Закрыть</button>`);
    return;
  }
  const cost=heroCost(h.level);
  const rooms=ROOM_ORDER.filter(r=>S.chiefLv>=ROOMS[r].unlock).map(r=>{
    const on=h.assigned===r;
    return `<button class="btn ${on?"gold":"grey"} sm" data-act="assign" data-arg="${id}|${r}">${on?"✓ ":""}${ROOMS[r].name}</button>`;
  }).join("");
  openModal(`<div class="mh">${def.name}</div>
    <div class="ms" style="color:${rar.color}">${rar.name} · ${def.role} · ур. ${h.level} · ${"★".repeat(h.stars||0)}${"☆".repeat(5-(h.stars||0))}</div>
    <img src="assets/heroes/${id}.webp" alt="" style="width:140px;height:140px;border-radius:16px;margin:8px auto;object-fit:cover">
    <div class="ms">${def.blurb}</div>
    <div class="statg">
      <div class="stat"><b>${h.level}</b><span>уровень</span></div>
      <div class="stat"><b>${h.stars||0}/5</b><span>звёзды</span></div>
    </div>
    <div class="sec">Назначить в комнату</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px">${rooms}</div>
    <button class="btn wide" data-act="uphero" data-arg="${id}" data-testid="up-hero">Улучшить за ${fmt(cost)} ₽</button>
    <button class="btn grey wide" data-act="close">Закрыть</button>`);
}

function upHero(id){
  const h=S.heroes[id]; if(!h?.owned)return;
  const cost=heroCost(h.level);
  if(S.cash<cost){toast("Не хватает денег — возьмите в магазине бесплатно");return;}
  S.cash-=cost; h.level=Math.min(50,h.level+1); addStat("heroActs",1);
  AU.ok(); toast(HEROES[id].name+" — уровень "+h.level);
  mark(); hud(); openHero(id);
}
function assignHero(arg){
  const [id,room]=arg.split("|");
  const h=S.heroes[id]; if(!h?.owned)return;
  // unassign previous occupant of room
  for(const hid of HERO_ORDER){
    if(S.heroes[hid].assigned===room) S.heroes[hid].assigned=null;
  }
  if(h.assigned && S.rooms[h.assigned]) S.rooms[h.assigned].hero=null;
  h.assigned=room;
  S.rooms[room].hero=id;
  // refresh actors
  S.actors=S.actors.filter(a=>a.kind!=="hero" || a.hid!==id);
  AU.ok(); toast(HEROES[id].name+" назначена: "+ROOMS[room].name);
  mark(); openHero(id);
}

function renderTasks(){
  const el=$("#sheet");
  if(S.tasks.day!==todayKey()) S.tasks={day:todayKey(),prog:{},claimed:{}};
  el.innerHTML=`<div class="sheet-h">Задания</div>
    <div class="sheet-sub">Ежедневные поручения. Награды можно забирать сразу, как только условие выполнено.</div>`+
    TASKS.map(t=>{
      const have=S.tasks.prog[t.key]||0;
      const done=have>=t.need;
      const claimed=!!S.tasks.claimed[t.id];
      const pct=Math.min(100,have/t.need*100);
      const rew=[t.rew.cash?"💰 "+fmt(t.rew.cash):"",t.rew.diamonds?"💎 "+t.rew.diamonds:"",t.rew.gas?"⛽ "+t.rew.gas:""].filter(Boolean).join(" · ");
      return `<div class="task" data-testid="task-${t.id}">
        <div class="tn">${t.name}</div>
        <div class="tp"><i style="width:${pct}%"></i></div>
        <div class="tr"><span>${Math.min(have,t.need)} / ${t.need} · ${rew}</span>
          ${claimed?'<button class="btn grey sm" disabled>Готово</button>':
            `<button class="btn sm" data-act="claim" data-arg="${t.id}" ${done?"":"disabled"} style="${done?"":"opacity:.5"}" data-testid="claim-${t.id}">Забрать</button>`}
        </div>
      </div>`;
    }).join("")+
    `<button class="btn grey wide" data-act="claimall">Забрать всё выполненное</button>`;
}
function claimTask(id){
  const t=TASKS.find(x=>x.id===id); if(!t)return;
  if(S.tasks.claimed[t.id]) return;
  const have=S.tasks.prog[t.key]||0;
  if(have<t.need){toast("Ещё не выполнено");return;}
  S.tasks.claimed[t.id]=true;
  for(const [k,v] of Object.entries(t.rew)) addRes(k,v);
  AU.coin(); toast("Награда получена");
  mark(); renderTasks();
}
function claimAll(){
  let n=0;
  for(const t of TASKS){
    if(!S.tasks.claimed[t.id] && (S.tasks.prog[t.key]||0)>=t.need){
      S.tasks.claimed[t.id]=true; n++;
      for(const [k,v] of Object.entries(t.rew)) addRes(k,v);
    }
  }
  if(n){AU.coin();toast("Забрано заданий: "+n);renderTasks();}
  else toast("Пока нечего забирать");
}

/* ===== room modal ===== */
function openRoom(id){
  const d=ROOMS[id];
  if(S.chiefLv<d.unlock){
    openModal(`<div class="mh">${d.name}</div><div class="ms">Комната откроется, когда кабинет шефа достигнет уровня ${d.unlock}.</div>
      <button class="btn wide" data-act="open" data-arg="chief">К кабинету шефа</button>
      <button class="btn grey wide" data-act="close">Закрыть</button>`);
    return;
  }
  if(S.riot && id==="cells"){
    openModal(`<div class="riot-banner">БУНТ В КАМЕРАХ!</div>
      <div class="ms">Заключённые подняли бунт. Отправьте группу подавления.</div>
      <button class="btn red wide" data-act="riot" data-testid="riot-ok">Подавить бунт</button>`);
    return;
  }
  renderRoomModal(id);
}

function renderRoomModal(id){
  const d=ROOMS[id], r=S.rooms[id], cost=roomCost(id,r.level);
  const hid=r.hero, def=hid&&HEROES[hid];
  const cap=roomCap(id,S);
  let body="", actions="";
  if(d.kind==="chain"||d.kind==="patrol"||d.kind==="interrog"){
    const inn=d.inKey?({docs:"документов",warrants:"ордеров",suspects:"подозреваемых"}[d.inKey]||d.inKey):"заявлений";
    const out=({docs:"документы",warrants:"ордера",suspects:"подозреваемые",inmates:"заключённые"}[d.outKey]||d.outKey);
    body=`<div class="statg">
      <div class="stat"><b>${r.level}</b><span>уровень</span></div>
      <div class="stat"><b>${fmt(1/roomSpeed(id,S)*60|0)}</b><span>дел в минуту</span></div>
      <div class="stat"><b>${r.in}</b><span>в работе (${inn})</span></div>
      <div class="stat"><b>${r.out}</b><span>готово: ${out}</span></div>
    </div>`;
    if(r.work) actions+=`<button class="btn gold wide" data-act="skipone" data-arg="${id}" data-testid="skip-room">Ускорить бесплатно</button>`;
    if(r.out>0) actions+=`<button class="btn wide" data-act="collect" data-arg="${id}" data-testid="collect-room">Отправить дальше</button>`;
    if(d.kind==="interrog" && r.in>0){
      actions+=`<div class="rowbtns">
        <button class="tactic" data-act="interrog" data-arg="scare" data-testid="tactic-scare"><span class="em">😠</span>Запугать<div class="ms">быстрее, немного удовлетворённости</div></button>
        <button class="tactic" data-act="interrog" data-arg="talk" data-testid="tactic-talk"><span class="em">🤝</span>Уговорить<div class="ms">больше удовлетворённости</div></button>
      </div>`;
    }
    if(d.kind==="patrol" && r.in>0 && S.car.state==="idle" && !r.work){
      actions+=`<button class="btn wide" data-act="startpatrol" data-arg="${id}" data-testid="patrol">Отправить патруль</button>`;
    }
  }else if(d.kind==="holding"){
    body=`<div class="statg">
      <div class="stat"><b>${r.in} / ${cap}</b><span>заключённые</span></div>
      <div class="stat"><b>${fmt(r.pending|0)} ₽</b><span>можно забрать</span></div>
      <div class="stat"><b>${r.level}</b><span>уровень</span></div>
      <div class="stat"><b>${S.riot?"Бунт!":"Спокойно"}</b><span>обстановка</span></div>
    </div>`;
    if(r.pending>0) actions+=`<button class="btn wide" data-act="collect" data-arg="${id}" data-testid="collect-cash">Забрать ${fmt(r.pending|0)} ₽</button>`;
    if(r.out>0 || S.rooms.interrog.out>0){ /* waiters */ }
    if(S.rooms.interrog.out>0 && r.in<cap){
      actions+=`<button class="btn wide" data-act="tocell">Принять ожидающих в камеру</button>`;
    }
  }else if(d.kind==="resource"){
    body=`<div class="statg">
      <div class="stat"><b>${r.level}</b><span>уровень</span></div>
      <div class="stat"><b>${r.out}</b><span>накоплено</span></div>
    </div><div class="ms">Комната производит ресурс сама. Заберите, когда появится пузырёк, или нажмите кнопку.</div>`;
    if(r.out>0) actions+=`<button class="btn wide" data-act="collect" data-arg="${id}">Забрать</button>`;
    if(r.work) actions+=`<button class="btn gold wide" data-act="skipone" data-arg="${id}">Ускорить бесплатно</button>`;
  }else if(d.kind==="chief"){
    const c=chiefCost(S.chiefLv);
    const next=UNLOCK_HINT[S.chiefLv+1];
    body=`<div class="ms">Уровень кабинета шефа открывает новые комнаты участка.</div>
      <div class="statg"><div class="stat"><b>${S.chiefLv}</b><span>уровень шефа</span></div>
      <div class="stat"><b>${next||"все комнаты открыты"}</b><span>следующее</span></div></div>`;
    actions+=`<button class="btn gold wide" data-act="upchief" data-testid="up-chief">Повысить за ${fmt(c.cash)} ₽ и ${c.diamonds} 💎</button>`;
  }else if(d.kind==="mailbox"){
    body=`<div class="ms">Жители оставляют идеи и благодарности. Заберите награду — это бесплатно и без ограничений.</div>`;
    actions+=`<button class="btn wide" data-act="suggest" data-testid="suggest">Забрать предложение</button>`;
  }else if(d.kind==="orders"){
    body=`<div class="ms">Шесть приказов шефа. Каждый выполняется сразу и бесплатно.</div>`+
      ORDERS.map(o=>{
        const on=S.buffs[{o1:"doubleCash",o2:"fastRec",o5:"motivation"}[o.id]];
        return `<div class="si"><div class="sic">${o.icon}</div><div class="sn"><b>${o.name}</b><span>${o.desc}${on?" · активно":""}</span></div>
          <button class="btn ${on?"grey":""}" data-act="order" data-arg="${o.id}">${on?"Ещё раз":"Выполнить"}</button></div>`;
      }).join("");
  }

  const asg=def?`<div class="assignee"><img src="assets/heroes/${hid}.webp" alt="">
      <div><b>${def.name}</b><div class="ms">${def.role} · ур. ${S.heroes[hid].level}</div></div>
      <button class="btn sm grey" data-act="tab" data-arg="heroes">Сменить</button></div>`
    :`<div class="assignee"><div style="width:52px;height:52px;border-radius:12px;background:#0a1628;display:flex;align-items:center;justify-content:center">⭐</div>
      <div><b>Нет сотрудницы</b><div class="ms">Назначьте героиню для бонуса</div></div>
      <button class="btn sm" data-act="tab" data-arg="heroes">Назначить</button></div>`;

  openModal(`<div class="mh">${d.name}</div>
    <div class="ms">${roomFlavor(id)}</div>
    ${asg}${body}
    ${d.kind!=="mailbox"&&d.kind!=="orders"?`<button class="btn blue wide" data-act="uproom" data-arg="${id}" data-testid="up-room">Улучшить за ${fmt(cost)} ₽</button>`:""}
    ${actions}
    <button class="btn grey wide" data-act="close">Закрыть</button>`);
}

function roomFlavor(id){
  return {
    reception:"Жители подают заявления. Сотрудница оформляет документы и передаёт их детективу.",
    detective:"Детектив изучает документы и готовит ордер на арест.",
    garage:"По ордеру патрульная машина выезжает в город и привозит подозреваемого.",
    interrog:"Выберите тактику допроса: запугать или уговорить. После допроса человек отправляется в камеру.",
    cells:"Заключённые содержатся здесь и приносят участку деньги. Если камеры переполнены, возможен бунт.",
    chief:"Отсюда вы руководите участком. Повышение уровня открывает новые комнаты.",
    armory:"Здесь готовят патроны для отдела и группы подавления бунтов.",
    electric:"Щитовая питает камеры и весь участок электричеством.",
    suggest:"Ящик предложений: жители пишут идеи, а вы забираете благодарности.",
    gasstation:"Заправка пополняет бензин для патрульных машин.",
    press:"Пресс-центр публикует приказы шефа — полезные усиления для участка."
  }[id]||"";
}

function doOrder(id){
  if(id==="o1"){S.buffs.doubleCash=true;toast("Двойной доход камер включён");}
  if(id==="o2"){S.buffs.fastRec=true;toast("Приёмная ускорена");}
  if(id==="o3"){addRes("gas",500);toast("+500 бензина");}
  if(id==="o4"){addRes("ammo",500);toast("+500 патронов");}
  if(id==="o5"){S.buffs.motivation=true;toast("Мотивация: все комнаты быстрее");}
  if(id==="o6"){
    const pool=HERO_ORDER.filter(i=>HEROES[i].rarity==="legend");
    const hid=pool[Math.random()*pool.length|0];
    giveHero(hid);
    toast(HEROES[hid].name+" присоединилась к отделу!");
  }
  AU.ok(); mark(); hud(); renderRoomModal("press");
}
function doSuggest(){
  const opts=[
    ()=>{addRes("cash",2000);return "+2 000 ₽ от благодарного жителя";},
    ()=>{addRes("diamonds",40);return "+40 алмазов";},
    ()=>{addRes("gas",40);return "+40 бензина";},
    ()=>{addRes("ammo",40);return "+40 патронов";},
    ()=>{S.sat=Math.min(100,S.sat+8);return "Удовлетворённость +8%";}
  ];
  const m=opts[Math.random()*opts.length|0]();
  AU.coin(); toast(m); S.suggestReady=true; mark(); hud();
}

/* ===== modal / events ===== */
function openModal(html){const m=$("#modal");m.classList.remove("hidden");m.innerHTML=`<div class="box">${html}<button class="close" data-act="close" aria-label="Закрыть">✕</button></div>`;}
function closeModal(){$("#modal").classList.add("hidden");$("#modal").innerHTML="";}

function onAct(act,arg,el){
  AU.init(); if(AU.ctx&&AU.ctx.state==="suspended") AU.ctx.resume();
  if(act!=="mute") AU.click();
  switch(act){
    case "tab": closeModal(); setTab(arg); break;
    case "close": closeModal(); break;
    case "buy": buy(arg); break;
    case "hero": openHero(arg); break;
    case "uphero": upHero(arg); break;
    case "assign": assignHero(arg); break;
    case "claim": claimTask(arg); break;
    case "claimall": claimAll(); break;
    case "uproom": upgradeRoom(arg); break;
    case "upchief": upgradeChief(); break;
    case "collect": collectRoom(arg); if(arg) renderRoomModal(arg); break;
    case "skipone": {
      const r=S.rooms[arg];
      if(r.work){r.prog=1;}
      closeModal();
      break;
    }
    case "interrog": doInterrog(arg); break;
    case "startpatrol": startWork("garage"); closeModal(); break;
    case "riot": sendRiot(); closeModal(); break;
    case "tocell": {
      const cap=roomCap("cells",S);
      const n=Math.min(S.rooms.interrog.out, cap-S.rooms.cells.in);
      S.rooms.interrog.out-=n; S.rooms.cells.in+=n; mark(); renderRoomModal("cells");
      break;
    }
    case "suggest": doSuggest(); break;
    case "order": doOrder(arg); break;
    case "open": openRoom(arg); break;
    case "mute": S.muted=!S.muted; AU.muted=S.muted; hud(); mark(); break;
    case "tutnext": tutNext(); break;
  }
}

/* ===== tutorial ===== */
const TUTS=[
  "Это ваш полицейский участок. Жители уже несут заявления в приёмную.",
  "Нажимайте на золотые таблички — так дело идёт по цепочке: документы, ордер, патруль, допрос, камера.",
  "Над камерами появляются деньги. Нажмите на пузырёк, чтобы забрать. Комнаты можно улучшать.",
  "В магазине всё бесплатно и без ограничений. Героинь можно набирать и назначать в комнаты. Удачи в службе!"
];
function showTut(){
  if(S.tut>=TUTS.length) return;
  openModal(`<div class="tut"><div class="mh">Добро пожаловать</div>
    <p>${TUTS[S.tut]}</p>
    <button class="btn wide" data-act="tutnext" data-testid="tut-next">${S.tut===TUTS.length-1?"Начать службу":"Дальше"}</button></div>`);
}
function tutNext(){
  S.tut++; mark();
  if(S.tut<TUTS.length) showTut(); else closeModal();
}

/* ===== camera / input ===== */
function clampCam(){
  const {W,H}=Render.getSize();
  // keep building roughly in reach
  cam.z=Math.max(0.55, Math.min(1.7, cam.z));
  // loose limits based on iso extents
  const minX=W*0.15 - 700*cam.z, maxX=W*0.85 + 200*cam.z;
  const minY=H*0.1 - 200*cam.z, maxY=H*0.9 + 200*cam.z;
  // actually cam.x is where origin goes; clamp so origin isn't too far
  cam.x=Math.min(W*0.8, Math.max(-900*cam.z+W*0.2, cam.x));
  cam.y=Math.min(H*0.6, Math.max(-800*cam.z+H*0.2, cam.y));
}
function onPointerDown(e){
  AU.init(); if(AU.ctx&&AU.ctx.state==="suspended") AU.ctx.resume();
  cv.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  moved=false;
  if(pointers.size===2){
    const [a,b]=[...pointers.values()];
    pinch0={dist:Math.hypot(a.x-b.x,a.y-b.y), z:cam.z};
    pan0=null;
  }else if(pointers.size===1){
    const r=cv.getBoundingClientRect();
    pan0={x:e.clientX,y:e.clientY, cx:cam.x, cy:cam.y};
  }
}
function onPointerMove(e){
  if(!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===2 && pinch0){
    const [a,b]=[...pointers.values()];
    const d=Math.hypot(a.x-b.x,a.y-b.y);
    const {W,H}=Render.getSize();
    const mx=(a.x+b.x)/2 - cv.getBoundingClientRect().left;
    const my=(a.y+b.y)/2 - cv.getBoundingClientRect().top;
    const nz=pinch0.z * (d/pinch0.dist);
    const wx=(mx-cam.x)/cam.z, wy=(my-cam.y)/cam.z;
    cam.z=nz; clampCam();
    cam.x=mx-wx*cam.z; cam.y=my-wy*cam.z;
    moved=true; clampCam();
  }else if(pan0 && pointers.size===1){
    const dx=e.clientX-pan0.x, dy=e.clientY-pan0.y;
    if(Math.hypot(dx,dy)>6) moved=true;
    cam.x=pan0.cx+dx; cam.y=pan0.cy+dy;
    clampCam();
  }
}
function onPointerUp(e){
  const rect=cv.getBoundingClientRect();
  const sx=e.clientX-rect.left, sy=e.clientY-rect.top;
  pointers.delete(e.pointerId);
  if(pointers.size<2) pinch0=null;
  if(pointers.size===1){
    const p=[...pointers.values()][0];
    pan0={x:p.x,y:p.y,cx:cam.x,cy:cam.y};
  }else pan0=null;
  if(!moved && pointers.size===0){
    // tap
    const h=Render.hit(sx,sy);
    if(h){
      if(h.type==="bubble") collectBubble(h.id);
      else if(h.type==="action"){
        if(S.riot && h.id==="cells"){openRoom("cells");return;}
        const id=h.id;
        if(id==="interrog" && S.rooms.interrog.in>0){openRoom("interrog");return;}
        if(id==="suggest"){doSuggest();return;}
        if(id==="cells" && S.rooms.cells.pending>0){collectRoom("cells");return;}
        collectRoom(id);
        if(id==="garage" && S.rooms.garage.in>0 && S.car.state==="idle") startWork("garage");
        if(id==="detective" && S.rooms.detective.in>0) startWork("detective");
      }
      return;
    }
    const room=Render.hitRoom(sx,sy,cam);
    if(room) openRoom(room);
  }
}

/* ===== loop ===== */
let cv;
function frame(ts){
  const dt=Math.min(0.08,(ts-lastTs)/1000||0.016);
  lastTs=ts;
  tick(dt);
  Render.draw(S,cam,ts);
  acc+=dt;
  if(acc>2 && dirty){save();acc=0;}
  requestAnimationFrame(frame);
}

function bootCam(){
  const {W,H}=Render.getSize();
  if(!W || !H) return;
  cam.z = W<400?0.84:0.92;
  // центр стартового крыла: приёмная, детектив, камеры, допрос, гараж
  const p=Render.iso(6.6, 10.0);
  cam.x = W/2 - p.x*cam.z + 8;
  cam.y = H*0.47 - p.y*cam.z;
  clampCam();
}

/* ===== start ===== */
async function start(){
  const ld=$("#ldfill"), txt=$("#ldtxt");
  const assets=["assets/avatar.webp","apple-touch-icon.png",...HERO_ORDER.map(id=>"assets/heroes/"+id+".webp")];
  let n=0;
  const set=()=>{n++; ld.style.width=Math.round(10+n/assets.length*90)+"%"; txt.textContent="Загрузка "+n+"/"+assets.length;};
  await document.fonts.ready;
  await Promise.all(assets.map(src=>new Promise(res=>{const i=new Image();i.onload=i.onerror=()=>{set();res();};i.src=src;})));
  const existed=load();
  AU.muted=!!S.muted;
  hud();
  cv=$("#cv");
  Render.init(cv);
  bootCam();
  window.addEventListener("resize",()=>{Render.resize();clampCam();});
  cv.addEventListener("pointerdown",onPointerDown);
  cv.addEventListener("pointermove",onPointerMove);
  cv.addEventListener("pointerup",onPointerUp);
  cv.addEventListener("pointercancel",onPointerUp);
  cv.addEventListener("wheel",e=>{
    e.preventDefault();
    const rect=cv.getBoundingClientRect();
    const mx=e.clientX-rect.left, my=e.clientY-rect.top;
    const wx=(mx-cam.x)/cam.z, wy=(my-cam.y)/cam.z;
    cam.z*= e.deltaY>0?0.92:1.08; clampCam();
    cam.x=mx-wx*cam.z; cam.y=my-wy*cam.z; clampCam();
  },{passive:false});

  document.body.addEventListener("click",ev=>{
    const b=ev.target.closest("[data-act]");
    if(!b) return;
    ev.preventDefault();
    onAct(b.dataset.act, b.dataset.arg, b);
  });

  $("#loading").classList.add("hidden");
  $("#game").classList.remove("hidden");
  Render.resize(); bootCam();
  requestAnimationFrame(()=>{Render.resize(); bootCam();});
  requestAnimationFrame(frame);

  if(!existed || S.tut<TUTS.length) setTimeout(showTut,400);
  else setTimeout(applyOffline,500);

  document.addEventListener("visibilitychange",()=>{if(document.hidden) save();});
  window.addEventListener("pagehide",save);
}

start().catch(e=>{console.error(e);$("#ldtxt").textContent="Ошибка загрузки";});
window.__GAME=()=>({S,cam,TAB,collectRoom,skipAll,openRoom,setTab,doInterrog,save,upgradeRoom,buy,closeModal,startWork,addRes});


if("serviceWorker" in navigator){
  window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js"));
}
