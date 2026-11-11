/* Шеф полиции: Участок v2 — живой участок */
const SAVE_KEY="shef-uchastok-v2";
let S, TAB="station", dirty=false, lastTs=0, acc=0, lastView=0;
const $ = s=>document.querySelector(s);
const $$ = s=>[...document.querySelectorAll(s)];

/* ===== audio ===== */
const AU={
  ctx:null, muted:false, musicOn:false, _nodes:[],
  init(){ if(this.ctx) return; try{this.ctx=new (window.AudioContext||window.webkitAudioContext)();}catch(e){} },
  tone(f,d,type="sine",g=0.07,dec=0.16){
    if(this.muted||!this.ctx)return;
    const c=this.ctx,o=c.createOscillator(),a=c.createGain();
    o.type=type;o.frequency.value=f;a.gain.value=g;
    a.gain.exponentialRampToValueAtTime(0.0001,c.currentTime+d+dec);
    o.connect(a).connect(c.destination);o.start();o.stop(c.currentTime+d+dec);
  },
  click(){this.tone(780,0.04,"square",0.03);},
  coin(){this.tone(880,0.05,"square",0.05);setTimeout(()=>this.tone(1170,0.08,"triangle",0.05),50);},
  paper(){this.tone(440,0.07,"triangle",0.04);},
  car(){this.tone(196,0.22,"sawtooth",0.04);setTimeout(()=>this.tone(164,0.25,"sawtooth",0.03),200);},
  ok(){this.tone(523,0.07,"triangle",0.05);setTimeout(()=>this.tone(784,0.12,"triangle",0.05),80);},
  warn(){this.tone(220,0.16,"square",0.05);},
  gacha(){this.tone(392,0.08);setTimeout(()=>this.tone(523,0.08),80);setTimeout(()=>this.tone(784,0.16),180);},
  startMusic(){
    if(this.muted||!this.ctx||this.musicOn)return;
    this.musicOn=true;
    const c=this.ctx, master=c.createGain(); master.gain.value=0.045; master.connect(c.destination);
    this._master=master;
    const seq=[261.63,329.63,392,523.25,392,329.63,293.66,349.23,440,349.23];
    let i=0;
    const tick=()=>{
      if(!this.musicOn||this.muted||!this.ctx)return;
      const o=c.createOscillator(),a=c.createGain();
      o.type="triangle"; o.frequency.value=seq[i%seq.length];
      a.gain.value=0.9; a.gain.exponentialRampToValueAtTime(0.001,c.currentTime+0.35);
      o.connect(a).connect(master); o.start(); o.stop(c.currentTime+0.36);
      i++; this._mTimer=setTimeout(tick, 380);
    };
    tick();
  },
  stopMusic(){ this.musicOn=false; if(this._mTimer) clearTimeout(this._mTimer); }
};

/* ===== state ===== */
function load(){
  try{
    const t=localStorage.getItem(SAVE_KEY);
    if(t){
      const o=JSON.parse(t);
      S=deepMerge(defaultState(),o);
      for(const id of ROOM_ORDER) if(!S.rooms[id]) S.rooms[id]=defaultState().rooms[id];
      for(const id of HERO_ORDER) if(!S.heroes[id]) S.heroes[id]=defaultState().heroes[id];
      if(S.tasks.day!==todayKey()) S.tasks={day:todayKey(),prog:{},claimed:{}};
      S.actors=S.actors||[]; S.bubbles=S.bubbles||[];
      if(!S.car) S.car={state:"idle",t:0};
      return true;
    }
  }catch(e){console.warn(e);}
  S=defaultState();
  S.actors=[]; S.car={state:"idle",t:0};
  return false;
}
function deepMerge(a,b){
  if(!b||typeof b!=="object") return a;
  const o=Array.isArray(a)?a.slice():{...a};
  for(const k of Object.keys(b)){
    if(b[k]&&typeof b[k]==="object"&&!Array.isArray(b[k])&&a[k]&&typeof a[k]==="object") o[k]=deepMerge(a[k],b[k]);
    else o[k]=b[k];
  }
  return o;
}
function save(){
  try{
    const copy={...S, lastSave:Date.now()};
    copy.actors=(S.actors||[]).map(a=>({...a, el:undefined, sayT:a.sayT}));
    localStorage.setItem(SAVE_KEY, JSON.stringify(copy));
    dirty=false;
  }catch(e){}
}
function mark(){dirty=true;}
function addRes(k,n){S[k]=(S[k]||0)+n; if(k==="cash"&&n>0) addStat("cashGot",n); mark(); hud();}
function addStat(k,n){S.stats[k]=(S.stats[k]||0)+n; if(S.tasks.day===todayKey()) S.tasks.prog[k]=(S.tasks.prog[k]||0)+n; mark();}
function toast(msg){
  const t=document.createElement("div"); t.className="toast"; t.textContent=msg;
  $("#toasts").appendChild(t); setTimeout(()=>t.remove(),2600);
}
function pick(arr){return arr[Math.random()*arr.length|0];}

/* ===== layout helpers ===== */
function wingTop(wing){ return wing===1?0:50; }
function posStyle(wing,x,y){
  return {left:x+"%", top:(wingTop(wing)+y*0.5)+"%"};
}
function roomBox(id){
  const L=LAYOUT[id];
  return {left:L.l+"%", top:(wingTop(L.wing)+L.t*0.5)+"%", width:L.w+"%", height:(L.h*0.5)+"%"};
}
function standOf(id){ const L=LAYOUT[id]; return {wing:L.wing,x:L.ax,y:L.ay}; }

/* ===== actors ===== */
let _aid=1;
function addActor(o){
  o.id=o.id||("a"+(++_aid));
  o.phase=o.phase||Math.random()*10;
  o.sayT=o.sayT||0;
  S.actors.push(o);
  return o;
}
function say(a,text,dur){
  a.say=text; a.sayT=dur||2.8;
}
function walkTo(a,x,y,spd){
  a.tx=x; a.ty=y; a.spd=spd||18; a.walk=true;
}

function spawnCitizen(){
  const rec=S.rooms.reception;
  const waiting=S.actors.filter(a=>a.kind==="citizen"&&a.life!==0).length;
  if(waiting>=QUEUE_MAX) return;
  if(rec.in>=QUEUE_MAX+2) return;
  rec.in++;
  const spr=pick(["civ-man","civ-woman","civ-older"]);
  const q=S.actors.filter(x=>x.kind==="citizen"&&x.state!=="leave").length;
  const wx=LAYOUT.reception.px + Math.min(q,2)*7;
  const wy=LAYOUT.reception.py + Math.min(q,2)*3;
  const a=addActor({
    kind:"citizen", spr, wing:1, x:ENTRANCE.x-8, y:ENTRANCE.y+6,
    tx:wx, ty:wy,
    walk:true, spd:16, life:1, state:"arrive"
  });
  walkTo(a, wx, wy, 16);
  setTimeout(()=>{ if(a.life!==0) say(a, pick(SAY.citizen), 3); }, 400);
}

function spawnStaff(){
  // remove stale hero actors and rebuild for assigned
  S.actors=S.actors.filter(a=>a.kind!=="hero");
  for(const id of ROOM_ORDER){
    const hid=S.rooms[id].hero;
    if(!hid || !S.heroes[hid]?.owned) continue;
    if(S.chiefLv<ROOMS[id].unlock) continue;
    const L=LAYOUT[id];
    addActor({kind:"hero", hid, spr:hid, wing:L.wing, x:L.ax, y:L.ay, tx:L.ax, ty:L.ay, walk:false, life:1, roam:id});
  }
}

/* ===== simulation ===== */
function startWork(id){
  const r=S.rooms[id], d=ROOMS[id];
  if(r.work) return false;
  if((d.kind==="chain"||d.kind==="patrol") && r.in<=0) return false;
  if(d.kind==="patrol" && S.car.state!=="idle") return false;
  r.work=true; r.prog=0; mark();
  const st=S.actors.find(a=>a.kind==="hero"&&a.roam===id);
  if(st && Math.random()<0.7) say(st, pick(SAY.staff), 2.2);
  return true;
}
function finishWork(id){
  const r=S.rooms[id], d=ROOMS[id];
  r.work=false; r.prog=0;
  if(d.kind==="chain"){
    r.in=Math.max(0,r.in-1);
    r.out++;
    addStat(d.outKey==="docs"?"docs":d.outKey==="warrants"?"warrants":d.outKey,1);
    AU.paper();
    if(id==="reception"){
      const civ=S.actors.find(a=>a.kind==="citizen"&&a.state!=="leave");
      if(civ){ civ.state="leave"; walkTo(civ, ENTRANCE.x-10, ENTRANCE.y+8, 16); civ._fade=true; }
    }
  }else if(d.kind==="patrol"){
    if(d.need) S[d.need]=Math.max(0,S[d.need]-(S[d.need]>=d.needAmt?d.needAmt:0));
    r.in=Math.max(0,r.in-1);
    S.car.state="out"; S.car.t=0;
    addStat("patrols",1); AU.car();
  }else if(d.kind==="resource"){
    const amt=(d.prodAmt||2)+Math.floor((r.level-1)*0.5);
    r.out+=amt;
  }
  mark();
}

function deliver(room,kind,amt){
  const d=ROOMS[room];
  if(kind==="cash"||kind==="gas"||kind==="ammo"||kind==="elec"||kind==="diamonds"){
    addRes(kind,amt);
    toast(kind==="cash"?"+"+fmt(amt)+" ₽":"+"+amt);
    return;
  }
  if(d.next && ROOMS[d.next]){
    S.rooms[d.next].in+=amt;
    // walker
    const A=LAYOUT[room], B=LAYOUT[d.next];
    const typ=kind==="suspects"?"suspect":kind==="inmates"?"inmate":"citizen";
    const spr=typ==="suspect"?"suspect-m":typ==="inmate"?"inmate-m":pick(["civ-man","civ-woman"]);
    const a=addActor({kind:typ, spr, wing:A.wing, x:A.ax, y:A.ay, life:1, state:"xfer"});
    // if next is other wing, walk in two steps
    if(A.wing===B.wing){ walkTo(a,B.ax,B.ay,20); a.destWing=B.wing; a.dx=B.ax; a.dy=B.ay; }
    else{
      walkTo(a, A.ax, 98, 20);
      a._then={wing:B.wing,x:B.ax,y:B.ay};
    }
    if(typ==="suspect") say(a, pick(SAY.suspect), 2.4);
  }
  const r=S.rooms[room];
  if(r.out>0) r.out=Math.max(0,r.out-amt);
  mark(); hud();
}

function collectRoom(id){
  const r=S.rooms[id], d=ROOMS[id];
  if(d.kind==="holding"){
    if(r.pending>0){
      addRes("cash",r.pending|0); toast("+"+fmt(r.pending|0)+" ₽"); r.pending=0; AU.coin(); mark(); hud();
    }
    return;
  }
  if(r.out>0){
    const amt=r.out; r.out=0; deliver(id, d.outKey||d.prod, amt); AU.coin();
  }
}

function tick(dt){
  // spawn citizens slowly
  S._spawn=(S._spawn||0)+dt;
  if(!S._nextSp) S._nextSp=SPAWN_MIN+Math.random()*(SPAWN_MAX-SPAWN_MIN);
  if(S._spawn>=S._nextSp){
    S._spawn=0;
    const scale=Math.max(0.7, 1-(S.chiefLv-1)*0.03);
    S._nextSp=(SPAWN_MIN+Math.random()*(SPAWN_MAX-SPAWN_MIN))*scale;
    if(S.buffs.fastRec) S._nextSp=Math.max(7, S._nextSp*0.65);
    spawnCitizen();
  }

  // auto start work (not interrogation)
  for(const id of ROOM_ORDER){
    const d=ROOMS[id], r=S.rooms[id];
    if(S.chiefLv<d.unlock) continue;
    if(d.kind==="chain" && !r.work && r.in>0) startWork(id);
    if(d.kind==="patrol" && !r.work && r.in>0 && S.car.state==="idle") startWork(id);
    if(d.kind==="resource" && !r.work) startWork(id);
  }

  const slots=S.secondQueue?1.15:1;
  for(const id of ROOM_ORDER){
    const d=ROOMS[id], r=S.rooms[id];
    if(!r.work||d.kind==="interrog") continue;
    r.prog += dt/roomSpeed(id,S)*slots;
    if(r.prog>=1) finishWork(id);
  }

  // car trip
  const G=LAYOUT.garage;
  if(S.car.state==="out"||S.car.state==="back"){
    S.car.t+=dt;
    const T=2.1;
    if(S.car.state==="out"){
      const p=Math.min(1,S.car.t/T);
      S.car.x=G.ax+(G.ox-G.ax)*p;
      S.car.y=G.ay+(G.oy-G.ay)*p;
      if(p>=1){S.car.state="back"; S.car.t=0;}
    }else{
      const p=Math.min(1,S.car.t/T);
      S.car.x=G.ox+(G.ax-G.ox)*p;
      S.car.y=G.oy+(G.ay-G.oy)*p;
      if(p>=1){
        S.car.state="idle"; S.car.t=0; S.car.x=G.ax; S.car.y=G.ay;
        S.rooms.garage.out++; AU.ok();
      }
    }
  }else { S.car.x=G.ax; S.car.y=G.ay; }

  // cells income
  const cells=S.rooms.cells;
  if(cells.in>0){
    let rate=ROOMS.cells.income*cells.in*(1+(cells.level-1)*0.12)*incomeMul(S);
    if(S.elec<=0) rate*=0.5;
    else { S._elecT=(S._elecT||0)+dt; if(S._elecT>10){S._elecT=0; S.elec--;} }
    cells.pending+=rate*dt;
  }
  const cap=roomCap("cells",S);
  if(cells.in>=cap && cap>0 && !S.riot){
    S.riotTimer=(S.riotTimer||0)+dt;
    if(S.riotTimer>22){ S.riot=true; S.riotTimer=0; AU.warn(); toast("Бунт в камерах!"); }
  }else if(!S.riot) S.riotTimer=0;

  // auto-send outputs after a long wait (not interrogation, not cash)
  S._auto=(S._auto||0)+dt;
  if(S._auto>AUTO_SEND){
    S._auto=0;
    for(const id of ["reception","detective","garage","armory","electric","gasstation"]){
      if(S.rooms[id].out>0) collectRoom(id);
    }
  }

  // move actors
  for(const a of S.actors){
    a.phase+=dt*(a.walk?10:2);
    if(a.sayT>0){ a.sayT-=dt; if(a.sayT<=0) a.say=null; }
    if(a.tx!=null){
      const dx=a.tx-a.x, dy=a.ty-a.y, dist=Math.hypot(dx,dy);
      if(dist<0.4){
        a.x=a.tx; a.y=a.ty; a.walk=false;
        if(a._then){ a.wing=a._then.wing; a.x=a._then.x; a.y=a._then.y-8; walkTo(a,a._then.x,a._then.y,20); a._then=null; }
        else if(a._fade||a.state==="xfer"||a.state==="leave"){ if(!a.walk) a.life=0; }
      }else{
        const sp=(a.spd||16)*dt;
        a.x+=dx/dist*Math.min(sp,dist);
        a.y+=dy/dist*Math.min(sp,dist);
        a.walk=true;
        a.flip=dx<0;
      }
    }
  }
  S.actors=S.actors.filter(a=>a.life!==0);

  // staff roam + chatter
  for(const a of S.actors){
    if(a.kind==="hero" && a.roam && !a.walk && Math.random()<0.003){
      const L=LAYOUT[a.roam];
      walkTo(a, L.ax+(Math.random()*10-5), L.ay+(Math.random()*8-3), 10);
    }
    if(a.kind==="hero" && !a.say && Math.random()<0.0009) say(a, pick(SAY.staff), 2.2);
    if(a.kind==="inmate" && !a.say && Math.random()<0.0007) say(a, pick(SAY.inmate), 2.2);
  }

  // place inmates visually
  syncInmates();
}

function syncInmates(){
  const need=S.rooms.cells.in|0;
  let have=S.actors.filter(a=>a.kind==="inmate"&&a.state==="sit").length;
  const slots=[{x:20,y:72},{x:32,y:70},{x:16,y:78},{x:28,y:76}];
  while(have<need && have<slots.length){
    const s=slots[have];
    addActor({kind:"inmate", spr:"inmate-m", wing:1, x:s.x, y:s.y, tx:s.x, ty:s.y, walk:false, life:1, state:"sit"});
    have++;
  }
  if(have>need){
    let n=have-need;
    for(let i=S.actors.length-1;i>=0 && n>0;i--){
      if(S.actors[i].kind==="inmate"&&S.actors[i].state==="sit"){ S.actors[i].life=0; n--; }
    }
  }
}

/* ===== interrogation minigame ===== */
function openInterrog(){
  if(S.rooms.interrog.in<=0){ toast("Пока некого допрашивать"); return; }
  const hid=S.rooms.interrog.hero || (HERO_ORDER.find(id=>S.heroes[id].owned)&& "anna");
  const def=HEROES[hid]||HEROES.anna;
  const line=pick(SAY.iqOpen);
  const clue=pick(IQ_CLUES);
  $("#iq").classList.remove("hidden");
  $("#iq").innerHTML=`
    <div class="iq-bg"><img src="assets/rooms/interrog-bg.webp" alt=""><div class="iq-lamp"></div></div>
    <div class="iq-ui">
      <div class="iq-pair">
        <div class="iq-card"><img src="assets/sprites/${def.id}.webp" alt="${def.name}"><b>${def.name}</b></div>
        <div class="iq-card"><img src="assets/sprites/suspect-m.webp" alt="Подозреваемый"><b>Подозреваемый</b></div>
      </div>
      <div class="iq-line" id="iqline">${line}</div>
      <div class="iq-clue">${clue}</div>
      <div class="iq-actions">
        <button class="btn red" data-act="iqpick" data-arg="scare" data-testid="tactic-scare">😠 Запугать</button>
        <button class="btn blue" data-act="iqpick" data-arg="talk" data-testid="tactic-talk">🤝 Уговорить</button>
      </div>
    </div>`;
  AU.paper();
}
function iqPick(tactic){
  const r=S.rooms.interrog;
  if(r.in<=0){ closeIq(); return; }
  r.in--;
  const hid=S.rooms.interrog.hero;
  let sat=200;
  if(hid && S.heroes[hid]?.owned){
    const def=HEROES[hid];
    sat=Math.round(sat*(1+heroPower(hid,S)*((def.bonus.sat||0)+(def.bonus.global||0))));
  }
  if(tactic==="scare") sat=Math.round(sat*0.85);
  else sat=Math.round(sat*1.1);
  S.sat=(S.sat||0)+sat;
  addStat("interrogs",1);
  const line=tactic==="scare"?pick(SAY.iqScare):pick(SAY.iqTalk);
  const cap=roomCap("cells",S);
  let dest="Ждёт камеру…";
  if(S.rooms.cells.in<cap){ S.rooms.cells.in++; dest="Отправляется в камеру."; spawnTransferInmate(); }
  else { S.rooms.interrog.out++; dest="Камеры заполнены — ждёт."; }
  AU.ok(); mark(); hud();
  const el=$("#iq");
  const actions=el.querySelector(".iq-actions");
  const lineEl=$("#iqline");
  if(lineEl) lineEl.textContent=line;
  if(actions) actions.innerHTML=`<div class="iq-clue" style="grid-column:1/-1">+${sat} удовлетворённости. ${dest}</div>
    <button class="btn wide" data-act="iqclose" data-testid="iq-ok" style="grid-column:1/-1">Готово</button>`;
}
function spawnTransferInmate(){
  const A=LAYOUT.interrog, B=LAYOUT.cells;
  const a=addActor({kind:"inmate",spr:"inmate-m",wing:1,x:A.ax,y:A.ay,life:1,state:"xfer"});
  walkTo(a,B.ax,B.ay,18);
  say(a, pick(SAY.inmate), 2);
}
function closeIq(){ $("#iq").classList.add("hidden"); $("#iq").innerHTML=""; }

function sendRiot(){
  if(!S.riot) return;
  if(S.ammo>=5) S.ammo-=5;
  S.riot=false; S.riotTimer=0; AU.ok(); toast("Бунт подавлен"); mark(); hud();
}

function upgradeRoom(id){
  const r=S.rooms[id], cost=roomCost(id,r.level);
  if(S.cash<cost){toast("Не хватает денег — загляните в магазин");return;}
  S.cash-=cost; r.level++; addStat("upgrades",1);
  AU.ok(); toast(ROOMS[id].name+" — уровень "+r.level);
  mark(); hud(); renderLabels(); renderRoomModal(id);
}
function upgradeChief(){
  const c=chiefCost(S.chiefLv);
  if(S.cash<c.cash||S.diamonds<c.diamonds){toast("Не хватает ресурсов — всё есть в магазине бесплатно");return;}
  S.cash-=c.cash; S.diamonds-=c.diamonds; S.chiefLv++;
  const hint=UNLOCK_HINT[S.chiefLv];
  AU.ok(); toast(hint?("Открыто: "+hint):("Кабинет шефа — уровень "+S.chiefLv));
  mark(); hud(); renderHotspots(); renderLabels(); openRoom("chief");
}

function applyOffline(){
  const now=Date.now(), last=S.lastSave||now;
  const dt=Math.min(12*3600, Math.max(0,(now-last)/1000));
  if(dt<20) return;
  const cells=S.rooms.cells.in||0;
  const rate=ROOMS.cells.income*Math.max(1,cells)*(1+(S.rooms.cells.level-1)*0.12)*incomeMul(S);
  const cash=Math.floor(rate*dt);
  const resTick=dt/5;
  const ammo=S.chiefLv>=2?Math.floor((ROOMS.armory.prodAmt+S.rooms.armory.level)*resTick):0;
  const elec=S.chiefLv>=3?Math.floor((ROOMS.electric.prodAmt+S.rooms.electric.level)*resTick):0;
  const gas=S.chiefLv>=5?Math.floor((ROOMS.gasstation.prodAmt+S.rooms.gasstation.level)*resTick):0;
  S.cash+=cash; S.ammo+=ammo; S.elec+=elec; S.gas+=gas;
  if(cash>0) addStat("cashGot",cash);
  const h=Math.floor(dt/3600), m=Math.floor((dt%3600)/60);
  const time=h?h+" ч "+m+" мин":m+" мин";
  let msg="Пока вас не было ("+time+"), участок заработал:\n💰 "+fmt(cash)+" ₽";
  if(ammo) msg+="\n🔫 "+ammo; if(elec) msg+="\n⚡ "+elec; if(gas) msg+="\n⛽ "+gas;
  openModal(`<div class="mh">С возвращением</div><div class="ms" style="white-space:pre-line">${msg}</div><button class="btn wide" data-act="close">Забрать</button>`);
}

/* ===== view ===== */
function hud(){
  const pills=[["cash","💰",fmt(S.cash)],["gas","⛽",fmt(S.gas)],["ammo","🔫",fmt(S.ammo)],["elec","⚡",fmt(S.elec)],["diamonds","💎",fmt(S.diamonds)]];
  $("#resrow").innerHTML=pills.map(([k,ic,v])=>`<div class="rpill" data-act="tab" data-arg="shop" data-testid="res-${k}"><span class="ic">${ic}</span>${v}<button class="plus" data-act="tab" data-arg="shop" aria-label="Магазин">+</button></div>`).join("");
  $("#chiefLv").textContent=S.chiefLv;
  const sat=S.sat||0;
  $("#satfill").style.width=Math.min(100, sat/20)+"%";
  $("#satn").textContent=fmt(sat);
  $("#btnMute").textContent=S.muted?"🔇":"🔊";
}

function renderHotspots(){
  const el=$("#hotspots");
  el.innerHTML=ROOM_ORDER.map(id=>{
    const d=ROOMS[id], L=LAYOUT[id], locked=S.chiefLv<d.unlock;
    const box=roomBox(id);
    const lock=locked?`<div class="locktag"><span class="lk">🔒</span>${d.name}<br>откроется на ур. ${d.unlock}</div>`:"";
    return `<div class="hotspot ${locked?"locked":""}" data-act="open" data-arg="${id}" data-testid="room-${id}"
      style="left:${box.left};top:${box.top};width:${box.width};height:${box.height}">${lock}</div>`;
  }).join("");
}
function renderLabels(){
  const el=$("#labels");
  const names={reception:"ПРИЁМНАЯ",detective:"ДЕТЕКТИВ",interrog:"ДОПРОСНАЯ",cells:"КАМЕРЫ",garage:"ГАРАЖ",
    chief:"ШЕФ",armory:"ОРУЖЕЙНАЯ",electric:"ЩИТОВАЯ",suggest:"ПРЕДЛОЖЕНИЯ",gasstation:"ЗАПРАВКА",press:"ПРЕСС-ЦЕНТР"};
  el.innerHTML=ROOM_ORDER.map(id=>{
    const L=LAYOUT[id], d=ROOMS[id], locked=S.chiefLv<d.unlock;
    const st=posStyle(L.wing,L.lx,L.ly);
    const lv=locked?"":`<span class="lv">${S.rooms[id].level}</span>`;
    const work=(!locked && S.rooms[id].work)?`<i class="wp" style="width:${Math.min(100,S.rooms[id].prog*100)}%"></i>`:"";
    return `<div class="rlab" style="left:${st.left};top:${st.top}">${names[id]}${lv}${work}</div>`;
  }).join("");
}

function renderActors(){
  const el=$("#actors");
  // car + people
  let html="";
  // car
  if(S.car){
    const st=posStyle(1, S.car.x||LAYOUT.garage.ax, S.car.y||LAYOUT.garage.ay);
    const moving=S.car.state!=="idle";
    const siren=moving?" walk siren":" idle";
    html+=`<div class="actor wide${siren}" style="left:${st.left};top:${st.top}"><img src="assets/sprites/car-police.webp" alt="Патруль"></div>`;
  }
  for(const a of S.actors){
    const st=posStyle(a.wing||1, a.x, a.y);
    const flip=a.flip?' style="transform:scaleX(-1)"':'';
    const cls="actor "+(a.walk?"walk":"idle");
    const sayH=a.say?`<div class="say">${a.say}</div>`:"";
    html+=`<div class="${cls}" style="left:${st.left};top:${st.top}">${sayH}<img src="assets/sprites/${a.spr}.webp" alt=""${flip}></div>`;
  }
  el.innerHTML=html;
}

function renderBubbles(){
  const el=$("#bubbles");
  const bits=[];
  const add=(id,text,cls,act,arg)=>{
    const L=LAYOUT[id];
    const st=posStyle(L.wing, L.lx, Math.min(95,L.ly+14));
    bits.push(`<button class="abub ${cls||""}" data-act="${act}" data-arg="${arg||id}" style="left:${st.left};top:${st.top}">${text}</button>`);
  };
  const rr=S.rooms;
  if(S.riot) add("cells","БУНТ! НАЖМИТЕ","red","open","cells");
  else{
    if(rr.reception.out>0) add("reception","ДОКУМЕНТЫ<small>отправить детективу</small>","gold","collect","reception");
    if(rr.detective.out>0) add("detective","ОРДЕР<small>активировать</small>","gold","collect","detective");
    if(rr.detective.in>0 && !rr.detective.work) add("detective","РАССЛЕДОВАТЬ","gold","open","detective");
    if(rr.garage.in>0 && !rr.garage.work && S.car.state==="idle") add("garage","ПАТРУЛЬ<small>отправить машину</small>","gold","startpatrol","garage");
    if(rr.garage.out>0) add("garage","ПОДОЗРЕВАЕМЫЙ<small>вести на допрос</small>","gold","collect","garage");
    if(rr.interrog.in>0) add("interrog","ДОПРОС ПРОВЕСТИ","red","iq","");
    if(rr.interrog.out>0) add("interrog","В КАМЕРУ","gold","tocell","");
    if(rr.cells.pending>=20) add("cells","ЗАБРАТЬ "+fmt(rr.cells.pending|0)+" ₽","gold","collect","cells");
    if(rr.armory.out>0 && S.chiefLv>=2) add("armory","ПАТРОНЫ +"+rr.armory.out,"gold","collect","armory");
    if(rr.electric.out>0 && S.chiefLv>=3) add("electric","ЭНЕРГИЯ +"+rr.electric.out,"gold","collect","electric");
    if(rr.gasstation.out>0 && S.chiefLv>=5) add("gasstation","БЕНЗИН +"+rr.gasstation.out,"gold","collect","gasstation");
    if(S.suggestReady && S.chiefLv>=3) add("suggest","ПРЕДЛОЖЕНИЕ","gold","suggest","");
  }
  el.innerHTML=bits.join("");
}

/* ===== sheets / shop / heroes (same economy) ===== */
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
  $("#sheet").innerHTML=`<div class="sheet-h">Магазин</div><div class="sheet-sub">Всё бесплатно, без таймеров и ограничений. Берите сколько нужно.</div>`+
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
  if(item.give){ for(const [k,v] of Object.entries(item.give)) addRes(k,v); toast("Получено: "+item.name); }
  else if(item.special==="fund"){ if(!S.fund){S.fund=true;toast("Фонд роста активен: +50% к доходу");} else {addRes("cash",15000);toast("Фонд уже активен, +15 000 ₽");} }
  else if(item.special==="pass"){ S.pass=true; addRes("cash",15000); addRes("diamonds",1500); addRes("gas",200); addRes("ammo",200); addRes("elec",200); toast("Пропуск активирован, все награды получены"); }
  else if(item.special==="vip"){ S.vip=Math.min(10,S.vip+1); addRes("cash",5000*S.vip); addRes("diamonds",200*S.vip); toast("VIP "+S.vip+"!"); }
  else if(item.special==="queue"){ S.secondQueue=true; toast("Вторая очередь включена"); }
  else if(item.special==="skip"){ skipAll(); toast("Все дела завершены"); }
  else if(item.special==="boost"){ S.buffs.boost=true; toast("Заряд скорости навсегда"); }
  else if(item.special==="gacha"){ doGacha(item.arg); return; }
  mark(); hud(); if(TAB==="shop") renderShop();
}
function skipAll(){
  for(const id of ROOM_ORDER){
    const r=S.rooms[id], d=ROOMS[id];
    if(r.work && d.kind!=="interrog"){ r.prog=1; finishWork(id); }
  }
  if(S.car.state==="out"||S.car.state==="back"){
    S.car.state="idle"; S.car.x=LAYOUT.garage.ax; S.car.y=LAYOUT.garage.ay;
    S.rooms.garage.out++;
  }
  mark();
}
function rarityPool(mode){
  if(mode==="legend") return HERO_ORDER.filter(i=>HEROES[i].rarity==="legend");
  if(mode==="epic") return HERO_ORDER.filter(i=>HEROES[i].rarity!=="rare");
  return HERO_ORDER.slice();
}
function rollOne(mode){
  let pool;
  if(mode==="legend") pool=rarityPool("legend");
  else if(mode==="epic"){ pool=Math.random()<0.3?rarityPool("legend"):HERO_ORDER.filter(i=>HEROES[i].rarity==="epic"); if(!pool.length) pool=rarityPool("epic"); }
  else{ const r=Math.random(); pool=r<0.05?rarityPool("legend"):r<0.30?HERO_ORDER.filter(i=>HEROES[i].rarity==="epic"):HERO_ORDER.filter(i=>HEROES[i].rarity==="rare"); }
  return pool[Math.random()*pool.length|0];
}
function giveHero(id){
  const h=S.heroes[id]; addStat("heroActs",1);
  if(!h.owned){ h.owned=true; h.level=1; h.stars=0; return {id,neu:true}; }
  h.frags=(h.frags||0)+10;
  if(h.frags>=10 && h.stars<5){h.frags-=10;h.stars++; return {id,neu:false,star:true};}
  if(h.stars>=5){h.level=Math.min(50,h.level+3); return {id,neu:false,lvl:true};}
  return {id,neu:false};
}
function doGacha(mode){
  const n=mode==="10"?10:1, got=[];
  for(let i=0;i<n;i++) got.push(giveHero(rollOne(mode==="10"?"1":mode)));
  AU.gacha(); mark(); spawnStaff();
  const first=got[0], def=HEROES[first.id], rar=RAR[def.rarity];
  const extra=got.length>1?`<div class="ms">И ещё ${got.length-1}: ${got.slice(1).map(g=>HEROES[g.id].name).join(", ")}</div>`:"";
  const how=first.neu?"Новая сотрудница присоединилась к отделу!":first.star?"Дубликат: звезда повышена!":first.lvl?"Дубликат: уровень вырос!":"Дубликат: осколки добавлены.";
  openModal(`<div class="reveal"><div class="mh">Набор героинь</div>
    <img src="assets/heroes/${def.id}.webp" alt="${def.name}">
    <div class="rn">${def.name}</div>
    <div class="rr" style="color:${rar.color}">${rar.name} · ${def.role}</div>
    <div class="ms">${how}</div>${extra}
    <button class="btn wide" data-act="close">Отлично</button></div>`);
  if(TAB==="heroes") renderHeroes();
}
function renderHeroes(){
  const owned=HERO_ORDER.filter(id=>S.heroes[id].owned).length;
  $("#sheet").innerHTML=`<div class="sheet-h">Героини</div>
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
        <div class="hb"><div class="hn">${def.name}</div><div class="hr">${def.role}</div></div></div>`;
      const stars="★".repeat(h.stars||0)+"☆".repeat(5-(h.stars||0));
      return `<div class="hcard" data-act="hero" data-arg="${id}" data-testid="hero-${id}">
        <img src="assets/heroes/${id}.webp" alt="${def.name}">
        <div class="tag" style="background:#0008;color:${rar.color}">${rar.name}</div>
        <div class="lv">ур. ${h.level}</div>
        <div class="hb"><div class="hn">${def.name}</div><div class="hr">${def.role}${h.assigned?" · "+ROOMS[h.assigned].name:""}</div>
        <div class="stars">${stars}</div></div></div>`;
    }).join("")}</div>`;
}
function openHero(id){
  const def=HEROES[id], h=S.heroes[id], rar=RAR[def.rarity];
  if(!h.owned){
    openModal(`<div class="mh">${def.name}</div><div class="ms" style="color:${rar.color}">${rar.name} · ${def.role}</div>
      <img src="assets/heroes/${id}.webp" alt="" style="width:140px;height:140px;border-radius:16px;margin:8px auto;object-fit:cover">
      <div class="ms">${def.blurb}</div>
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
    <div class="ms" style="color:${rar.color}">${rar.name} · ${def.role} · ур. ${h.level}</div>
    <img src="assets/sprites/${id}.webp" alt="" style="width:120px;height:auto;margin:8px auto">
    <div class="ms">${def.blurb}</div>
    <div class="statg"><div class="stat"><b>${h.level}</b><span>уровень</span></div><div class="stat"><b>${h.stars||0}/5</b><span>звёзды</span></div></div>
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
  AU.ok(); toast(HEROES[id].name+" — уровень "+h.level); mark(); hud(); openHero(id);
}
function assignHero(arg){
  const [id,room]=arg.split("|");
  const h=S.heroes[id]; if(!h?.owned)return;
  for(const hid of HERO_ORDER){ if(S.heroes[hid].assigned===room) S.heroes[hid].assigned=null; }
  if(h.assigned && S.rooms[h.assigned]) S.rooms[h.assigned].hero=null;
  h.assigned=room; S.rooms[room].hero=id;
  AU.ok(); toast(HEROES[id].name+" назначена: "+ROOMS[room].name);
  mark(); spawnStaff(); openHero(id);
}
function renderTasks(){
  if(S.tasks.day!==todayKey()) S.tasks={day:todayKey(),prog:{},claimed:{}};
  $("#sheet").innerHTML=`<div class="sheet-h">Задания</div>
    <div class="sheet-sub">Ежедневные поручения. Награды можно забирать сразу.</div>`+
    TASKS.map(t=>{
      const have=S.tasks.prog[t.key]||0, done=have>=t.need, claimed=!!S.tasks.claimed[t.id];
      const pct=Math.min(100,have/t.need*100);
      const rew=[t.rew.cash?"💰 "+fmt(t.rew.cash):"",t.rew.diamonds?"💎 "+t.rew.diamonds:"",t.rew.gas?"⛽ "+t.rew.gas:""].filter(Boolean).join(" · ");
      return `<div class="task" data-testid="task-${t.id}">
        <div class="tn">${t.name}</div>
        <div class="tp"><i style="width:${pct}%"></i></div>
        <div class="tr"><span>${Math.min(have,t.need)} / ${t.need} · ${rew}</span>
          ${claimed?'<button class="btn grey sm" disabled>Готово</button>':
            `<button class="btn sm" data-act="claim" data-arg="${t.id}" ${done?"":"disabled"} style="${done?"":"opacity:.5"}" data-testid="claim-${t.id}">Забрать</button>`}
        </div></div>`;
    }).join("")+`<button class="btn grey wide" data-act="claimall">Забрать всё выполненное</button>`;
}
function claimTask(id){
  const t=TASKS.find(x=>x.id===id); if(!t||S.tasks.claimed[t.id]) return;
  if((S.tasks.prog[t.key]||0)<t.need){toast("Ещё не выполнено");return;}
  S.tasks.claimed[t.id]=true;
  for(const [k,v] of Object.entries(t.rew)) addRes(k,v);
  AU.coin(); toast("Награда получена"); mark(); renderTasks();
}
function claimAll(){
  let n=0;
  for(const t of TASKS){
    if(!S.tasks.claimed[t.id] && (S.tasks.prog[t.key]||0)>=t.need){
      S.tasks.claimed[t.id]=true; n++;
      for(const [k,v] of Object.entries(t.rew)) addRes(k,v);
    }
  }
  if(n){AU.coin();toast("Забрано заданий: "+n);renderTasks();} else toast("Пока нечего забирать");
}

const FLAVOR={
  reception:"Жители подают заявления. Дежурная оформляет документы и передаёт их детективу.",
  detective:"Детектив изучает документы и готовит ордер на арест.",
  garage:"По ордеру патрульная машина выезжает в город и привозит подозреваемого.",
  interrog:"Выберите тактику допроса. После признания человек отправляется в камеру, а участок получает удовлетворённость.",
  cells:"Заключённые содержатся здесь и приносят участку деньги. Если камеры переполнены, возможен бунт.",
  chief:"Отсюда вы руководите участком. Повышение уровня открывает новые комнаты ниже по экрану.",
  armory:"Здесь готовят патроны для отдела и группы подавления бунтов.",
  electric:"Щитовая питает камеры и весь участок электричеством.",
  suggest:"Ящик предложений: жители пишут идеи, а вы забираете благодарности.",
  gasstation:"Заправка пополняет бензин для патрульных машин.",
  press:"Пресс-центр публикует приказы шефа — полезные усиления для участка."
};
function openRoom(id){
  const d=ROOMS[id];
  if(S.chiefLv<d.unlock){
    openModal(`<div class="mh">${d.name}</div><div class="ms">Комната откроется, когда кабинет шефа достигнет уровня ${d.unlock}. Листайте участок вниз и улучшайте кабинет шефа.</div>
      <button class="btn wide" data-act="open" data-arg="chief">К кабинету шефа</button>
      <button class="btn grey wide" data-act="close">Закрыть</button>`);
    return;
  }
  if(S.riot && id==="cells"){
    openModal(`<div class="riot-banner">БУНТ В КАМЕРАХ!</div>
      <div class="ms">Отправьте группу подавления.</div>
      <button class="btn red wide" data-act="riot" data-testid="riot-ok">Подавить бунт</button>`);
    return;
  }
  if(id==="interrog" && S.rooms.interrog.in>0){ closeModal(); openInterrog(); return; }
  renderRoomModal(id);
}
function renderRoomModal(id){
  const d=ROOMS[id], r=S.rooms[id], cost=roomCost(id,r.level);
  const hid=r.hero, def=hid&&HEROES[hid];
  const cap=roomCap(id,S);
  let body="", actions="";
  if(d.kind==="chain"||d.kind==="patrol"){
    body=`<div class="statg">
      <div class="stat"><b>${r.level}</b><span>уровень</span></div>
      <div class="stat"><b>${r.in}</b><span>в работе</span></div>
      <div class="stat"><b>${r.out}</b><span>готово к отправке</span></div>
      <div class="stat"><b>${fmt(1/roomSpeed(id,S)*60|0)}</b><span>дел в минуту</span></div>
    </div>`;
    if(r.work) actions+=`<button class="btn gold wide" data-act="skipone" data-arg="${id}" data-testid="skip-room">Ускорить бесплатно</button>`;
    if(r.out>0) actions+=`<button class="btn wide" data-act="collect" data-arg="${id}" data-testid="collect-room">Отправить дальше</button>`;
    if(d.kind==="patrol" && r.in>0 && S.car.state==="idle" && !r.work)
      actions+=`<button class="btn wide" data-act="startpatrol" data-arg="${id}" data-testid="patrol">Отправить патруль</button>`;
  }else if(d.kind==="interrog"){
    body=`<div class="statg"><div class="stat"><b>${r.in}</b><span>ждут допроса</span></div><div class="stat"><b>${r.level}</b><span>уровень</span></div></div>`;
    if(r.in>0) actions+=`<button class="btn red wide" data-act="iq" data-testid="start-iq">Начать допрос</button>`;
  }else if(d.kind==="holding"){
    body=`<div class="statg">
      <div class="stat"><b>${r.in} / ${cap}</b><span>заключённые</span></div>
      <div class="stat"><b>${fmt(r.pending|0)} ₽</b><span>можно забрать</span></div>
    </div>`;
    if(r.pending>0) actions+=`<button class="btn wide" data-act="collect" data-arg="${id}" data-testid="collect-cash">Забрать ${fmt(r.pending|0)} ₽</button>`;
    if(S.rooms.interrog.out>0 && r.in<cap) actions+=`<button class="btn wide" data-act="tocell">Принять ожидающих</button>`;
  }else if(d.kind==="resource"){
    body=`<div class="statg"><div class="stat"><b>${r.level}</b><span>уровень</span></div><div class="stat"><b>${r.out}</b><span>накоплено</span></div></div>`;
    if(r.out>0) actions+=`<button class="btn wide" data-act="collect" data-arg="${id}">Забрать</button>`;
    if(r.work) actions+=`<button class="btn gold wide" data-act="skipone" data-arg="${id}">Ускорить бесплатно</button>`;
  }else if(d.kind==="chief"){
    const c=chiefCost(S.chiefLv);
    const next=UNLOCK_HINT[S.chiefLv+1];
    body=`<div class="statg"><div class="stat"><b>${S.chiefLv}</b><span>уровень шефа</span></div>
      <div class="stat"><b>${next||"все комнаты открыты"}</b><span>следующее</span></div></div>`;
    actions+=`<button class="btn gold wide" data-act="upchief" data-testid="up-chief">Повысить за ${fmt(c.cash)} ₽ и ${c.diamonds} 💎</button>`;
  }else if(d.kind==="mailbox"){
    body=`<div class="ms">Жители оставляют идеи. Заберите награду — бесплатно и без ограничений.</div>`;
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
    :`<div class="assignee"><div style="width:52px;height:52px;border-radius:12px;background:#e8f3ff;display:flex;align-items:center;justify-content:center">⭐</div>
      <div><b>Нет сотрудницы</b><div class="ms">Назначьте героиню для бонуса</div></div>
      <button class="btn sm" data-act="tab" data-arg="heroes">Назначить</button></div>`;
  openModal(`<div class="mh">${d.name}</div><div class="ms">${FLAVOR[id]||""}</div>
    ${asg}${body}
    ${d.kind!=="mailbox"&&d.kind!=="orders"?`<button class="btn blue wide" data-act="uproom" data-arg="${id}" data-testid="up-room">Улучшить за ${fmt(cost)} ₽</button>`:""}
    ${actions}
    <button class="btn grey wide" data-act="close">Закрыть</button>`);
}
function doOrder(id){
  if(id==="o1"){S.buffs.doubleCash=true;toast("Двойной доход камер включён");}
  if(id==="o2"){S.buffs.fastRec=true;toast("Приёмная ускорена");}
  if(id==="o3"){addRes("gas",500);toast("+500 бензина");}
  if(id==="o4"){addRes("ammo",500);toast("+500 патронов");}
  if(id==="o5"){S.buffs.motivation=true;toast("Мотивация: все комнаты быстрее");}
  if(id==="o6"){ const pool=HERO_ORDER.filter(i=>HEROES[i].rarity==="legend"); const hid=pool[Math.random()*pool.length|0]; giveHero(hid); toast(HEROES[hid].name+" в отделе!"); spawnStaff(); }
  AU.ok(); mark(); hud(); renderRoomModal("press");
}
function doSuggest(){
  const opts=[
    ()=>{addRes("cash",2000);return "+2 000 ₽ от жителя";},
    ()=>{addRes("diamonds",40);return "+40 алмазов";},
    ()=>{addRes("gas",40);return "+40 бензина";},
    ()=>{addRes("ammo",40);return "+40 патронов";},
    ()=>{S.sat=(S.sat||0)+80;return "Удовлетворённость +80";}
  ];
  const m=opts[Math.random()*opts.length|0]();
  AU.coin(); toast(m); S.suggestReady=true; mark(); hud();
}

function openModal(html){const m=$("#modal");m.classList.remove("hidden");m.innerHTML=`<div class="box">${html}<button class="close" data-act="close" aria-label="Закрыть">✕</button></div>`;}
function closeModal(){$("#modal").classList.add("hidden");$("#modal").innerHTML="";}

function onAct(act,arg){
  AU.init(); if(AU.ctx&&AU.ctx.state==="suspended") AU.ctx.resume();
  if(S && !S.muted) AU.startMusic();
  if(act!=="mute") AU.click();
  switch(act){
    case "tab": closeModal(); closeIq(); setTab(arg); break;
    case "close": closeModal(); break;
    case "buy": buy(arg); break;
    case "hero": openHero(arg); break;
    case "uphero": upHero(arg); break;
    case "assign": assignHero(arg); break;
    case "claim": claimTask(arg); break;
    case "claimall": claimAll(); break;
    case "uproom": upgradeRoom(arg); break;
    case "upchief": upgradeChief(); break;
    case "collect": collectRoom(arg); if(arg && $("#modal:not(.hidden)")) { /* stay */ } break;
    case "skipone": { const r=S.rooms[arg]; if(r.work) r.prog=1; closeModal(); break; }
    case "iq": closeModal(); openInterrog(); break;
    case "iqpick": iqPick(arg); break;
    case "iqclose": closeIq(); break;
    case "startpatrol": startWork("garage"); closeModal(); break;
    case "riot": sendRiot(); closeModal(); break;
    case "tocell": {
      const cap=roomCap("cells",S);
      const n=Math.min(S.rooms.interrog.out, cap-S.rooms.cells.in);
      S.rooms.interrog.out-=n; S.rooms.cells.in+=n; mark(); closeModal(); break;
    }
    case "suggest": doSuggest(); break;
    case "order": doOrder(arg); break;
    case "open": openRoom(arg); break;
    case "mute":
      S.muted=!S.muted; AU.muted=S.muted;
      if(S.muted) AU.stopMusic(); else { AU.init(); AU.startMusic(); }
      hud(); mark(); break;
    case "tutnext": tutNext(); break;
  }
}

const TUTS=[
  "Это ваш участок. Он целиком помещается по ширине экрана — если нужно, просто листните вниз пальцем.",
  "Жители ненадолго заходят в приёмную и оставляют заявления. Нажимайте на золотые таблички — так дело идёт по цепочке: документы, ордер, патруль, допрос, камера.",
  "Допрос — отдельная сцена: выберите, запугать или уговорить. В магазине всё бесплатно. Приятной службы!"
];
function showTut(){
  if(S.tut>=TUTS.length) return;
  openModal(`<div class="tut"><div class="mh">Добро пожаловать</div>
    <p>${TUTS[S.tut]}</p>
    <button class="btn wide" data-act="tutnext" data-testid="tut-next">${S.tut===TUTS.length-1?"Начать службу":"Дальше"}</button></div>`);
}
function tutNext(){ S.tut++; mark(); if(S.tut<TUTS.length) showTut(); else closeModal(); }

function frame(ts){
  const dt=Math.min(0.08,(ts-lastTs)/1000||0.016);
  lastTs=ts;
  tick(dt);
  lastView+=dt;
  if(lastView>0.08){ lastView=0; renderActors(); renderBubbles(); renderLabels(); }
  acc+=dt;
  if(acc>2 && dirty){save();acc=0;}
  requestAnimationFrame(frame);
}

async function start(){
  const ld=$("#ldfill"), txt=$("#ldtxt");
  const assets=[
    "assets/avatar.webp","apple-touch-icon.png",
    "assets/rooms/wing-start.webp","assets/rooms/wing-more.webp","assets/rooms/interrog-bg.webp",
    "assets/sprites/car-police.webp","assets/sprites/civ-man.webp","assets/sprites/civ-woman.webp",
    "assets/sprites/civ-older.webp","assets/sprites/suspect-m.webp","assets/sprites/inmate-m.webp",
    ...HERO_ORDER.map(id=>"assets/heroes/"+id+".webp"),
    ...HERO_ORDER.map(id=>"assets/sprites/"+id+".webp")
  ];
  let n=0;
  const set=()=>{n++; ld.style.width=Math.round(10+n/assets.length*90)+"%"; txt.textContent="Загрузка "+n+"/"+assets.length;};
  await document.fonts.ready;
  await Promise.all(assets.map(src=>new Promise(res=>{const i=new Image();i.onload=i.onerror=()=>{set();res();};i.src=src;})));
  const existed=load();
  AU.muted=!!S.muted;
  hud();
  spawnStaff();
  renderHotspots();
  renderLabels();
  renderActors();
  renderBubbles();

  const stage=$("#stage"), hint=$("#hint");
  const hideHint=()=>{ if(stage.scrollTop>40 && hint) hint.classList.add("gone"); };
  stage.addEventListener("scroll", hideHint, {passive:true});

  document.body.addEventListener("click",ev=>{
    const b=ev.target.closest("[data-act]");
    if(!b) return;
    ev.preventDefault();
    onAct(b.dataset.act, b.dataset.arg);
  });

  $("#loading").classList.add("hidden");
  $("#game").classList.remove("hidden");
  requestAnimationFrame(frame);

  setTimeout(()=>{ if((S.actors.filter(a=>a.kind==="citizen").length)===0) spawnCitizen(); }, 3500);
  if(!existed || S.tut<TUTS.length) setTimeout(showTut,400);
  else setTimeout(applyOffline,500);

  document.addEventListener("visibilitychange",()=>{if(document.hidden) save();});
  window.addEventListener("pagehide",save);
}

start().catch(e=>{console.error(e);$("#ldtxt").textContent="Ошибка загрузки";});
window.__GAME=()=>({S,TAB,collectRoom,skipAll,openRoom,setTab,save,upgradeRoom,buy,closeModal,startWork,addRes,openInterrog,iqPick});

if("serviceWorker" in navigator){
  window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js"));
}
