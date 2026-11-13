/* Шеф полиции: Участок v9 — responsive quest and UI */
const SAVE_KEY="shef-uchastok-v3", SAVE_OLD="shef-uchastok-v2";
let S, TAB="station", dirty=false, lastTs=0, acc=0, lastView=0, bubbleClock=0, labelClock=0, questClock=0;
const $ = s=>document.querySelector(s);
const $$ = s=>[...document.querySelectorAll(s)];

/* ===== audio + juice ===== */
const AU={
  ctx:null, muted:false, musicOn:false,
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
  appear(){this.tone(659,0.08,"triangle",0.06);setTimeout(()=>this.tone(880,0.12,"triangle",0.06),90);setTimeout(()=>this.tone(1046,0.18,"sine",0.05),180);},
  star(){this.tone(784,0.06);setTimeout(()=>this.tone(988,0.06),70);setTimeout(()=>this.tone(1318,0.2),150);},
  startMusic(){
    if(this.muted||!this.ctx||this.musicOn)return;
    this.musicOn=true;
    const c=this.ctx, master=c.createGain(); master.gain.value=0.045; master.connect(c.destination);
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

function shake(){ const g=$("#game"); g.classList.remove("shake"); void g.offsetWidth; g.classList.add("shake"); setTimeout(()=>g.classList.remove("shake"),400); }
function coinBurst(x,y,n,text){
  const fx=$("#fx"); if(!fx) return;
  const cash=$('[data-testid="res-cash"]');
  const r=cash?cash.getBoundingClientRect():{left:innerWidth/2,top:20};
  for(let i=0;i<Math.min(n||6,10);i++){
    const d=document.createElement("div"); d.className="coin-fly";
    d.textContent=text||"💰";
    const ox=x+(Math.random()*40-20), oy=y+(Math.random()*20-10);
    d.style.left=ox+"px"; d.style.top=oy+"px";
    d.style.setProperty("--dx",(r.left-ox)+"px");
    d.style.setProperty("--dy",(r.top-oy)+"px");
    fx.appendChild(d); setTimeout(()=>d.remove(),850);
  }
  AU.coin();
}
function confetti(){
  const fx=$("#fx"); if(!fx) return;
  const colors=["#f0c75e","#ef4444","#22c55e","#4da3ff","#fff"];
  for(let i=0;i<36;i++){
    const d=document.createElement("div"); d.className="confetti";
    d.style.left=(10+Math.random()*80)+"%"; d.style.top=(8+Math.random()*20)+"%";
    d.style.background=colors[i%colors.length];
    d.style.animationDelay=(Math.random()*0.2)+"s";
    fx.appendChild(d); setTimeout(()=>d.remove(),1100);
  }
  AU.star();
}

/* ===== state ===== */
function load(){
  try{
    const t=localStorage.getItem(SAVE_KEY)||localStorage.getItem(SAVE_OLD);
    if(t){
      const o=JSON.parse(t);
      S=deepMerge(defaultState(),o);
      for(const id of ROOM_ORDER) if(!S.rooms[id]) S.rooms[id]=defaultState().rooms[id];
      for(const id of HERO_ORDER){
        if(!S.heroes[id]) S.heroes[id]=defaultState().heroes[id];
        if(!S.heroes[id].outfit) S.heroes[id].outfit="black";
      }
      if(S.tasks.day!==todayKey()) S.tasks={day:todayKey(),prog:{},claimed:{}};
      S.actors=[]; S.bubbles=S.bubbles||[];
      if(!S.car) S.car={state:"idle",t:0};
      if(S.guideDone==null){ S.guideDone = (S.tut||0)>=3; S.guideStep=S.guideDone?99:0; }
      S.docket=S.docket||[]; S.achieves=S.achieves||{}; S.combo=S.combo||0;
      S.assigns=S.stats.assigns||0;
      // reconcile assignment
      for(const id of HERO_ORDER){
        const h=S.heroes[id];
        if(h.assigned && S.rooms[h.assigned]) S.rooms[h.assigned].hero=id;
      }
      for(const id of ROOM_ORDER){
        const hid=S.rooms[id].hero;
        if(hid && S.heroes[hid] && S.heroes[hid].owned) S.heroes[hid].assigned=id;
        else if(hid && (!S.heroes[hid]||!S.heroes[hid].owned)) S.rooms[id].hero=null;
      }
      S.questFlags=S.questFlags||{};
      if(S.questIdx==null) S.questIdx=0;
      return true;
    }
  }catch(e){console.warn(e);}
  S=defaultState();
  S.actors=[]; S.car={state:"idle",t:0}; S.guideStep=0; S.guideDone=false; S.questIdx=0; S.questFlags={};
  S.docket=[]; S.achieves={}; S.combo=0;
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
    copy.actors=[]; // heroes rebuilt on load
    localStorage.setItem(SAVE_KEY, JSON.stringify(copy));
    dirty=false;
  }catch(e){}
}
function mark(){dirty=true;}
function addRes(k,n){S[k]=(S[k]||0)+n; if(k==="cash"&&n>0) addStat("cashGot",n); mark(); hud();}
function addStat(k,n){S.stats[k]=(S.stats[k]||0)+n; if(S.tasks.day===todayKey()) S.tasks.prog[k]=(S.tasks.prog[k]||0)+n; checkAchieves(); mark();}
const TQ={q:[],shown:null,timer:null};
function _norm(s){ return (s||"").toLowerCase().replace(/[«»""!.,;:!?—–-]/g," ").replace(/\s+/g," ").trim(); }
function similarText(a,b){
  const na=_norm(a), nb=_norm(b);
  if(!na||!nb) return false;
  if(na.includes(nb)||nb.includes(na)) return true;
  const wa=new Set(na.split(" ").filter(w=>w.length>4));
  const hit=nb.split(" ").filter(w=>w.length>4 && wa.has(w)).length;
  return hit>=3;
}
function toastRedundant(msg){
  if(!S) return false;
  const st=typeof chainStep==="function"?chainStep():null;
  const tip=($("#nikatiptxt")||{}).textContent||"";
  if(st){
    if(/посадите|села за стол/i.test(msg) && /seat-/.test(st.id||"")) return true;
    if(similarText(st.nika||st.title||"", msg)) return true;
  }
  if(tip && similarText(tip, msg)) return true;
  return false;
}
function toastStale(msg){
  if(/посадите/i.test(msg) && S && S.rooms && S.rooms.detective && S.rooms.detective.hero) return true;
  return false;
}
function dropToasts(pred){
  TQ.q=TQ.q.filter(m=>!pred(m));
  if(TQ.shown && pred(TQ.shown)){
    if(TQ.timer) clearTimeout(TQ.timer);
    TQ.shown=null; TQ.timer=null;
    const box=$("#toasts"); if(box) box.innerHTML="";
    pumpToast();
  }
}
function placeToasts(){
  const box=$("#toasts"); if(!box) return;
  const tip=$("#nikatip");
  const tipOn=tip && !tip.classList.contains("hidden");
  box.classList.toggle("mid", !!tipOn);
}
function pumpToast(){
  if(TQ.shown) return;
  TQ.q=TQ.q.filter(m=>!toastStale(m) && !toastRedundant(m));
  const msg=TQ.q.shift();
  if(!msg) return;
  const box=$("#toasts"); if(!box) return;
  box.innerHTML="";
  const el=document.createElement("div"); el.className="toast"; el.textContent=msg;
  box.appendChild(el);
  TQ.shown=msg;
  placeToasts();
  TQ.timer=setTimeout(()=>{ el.remove(); TQ.shown=null; TQ.timer=null; pumpToast(); }, 1800);
}
function toast(msg){
  if(!msg) return;
  if(toastStale(msg) || toastRedundant(msg)) return;
  if(TQ.shown===msg || TQ.q.includes(msg)) return;
  TQ.q.push(msg);
  pumpToast();
}
function pick(arr){return arr[Math.random()*arr.length|0];}

function checkAchieves(){
  S.stats.maxCombo=Math.max(S.stats.maxCombo||0, S.combo||0);
  S.stats.assigns=S.stats.assigns||0;
  S.stats.bosses=S.stats.bosses||0;
  for(const a of ACHIEVES){
    if(S.achieves[a.id]) continue;
    const have = a.key==="maxCombo"? (S.stats.maxCombo||0) : a.key==="assigns"? (S.stats.assigns||0) : a.key==="bosses"? (S.stats.bosses||0) : (S.stats[a.key]||0);
    if(have>=a.need){
      S.achieves[a.id]=true;
      for(const [k,v] of Object.entries(a.rew)) addRes(k,v);
      toast("Награда: "+a.name+"!");
      confetti();
    }
  }
}

/* ===== layout ===== */
function wingTop(wing){ return wing===1?0:50; }
function posStyle(wing,x,y){ return {left:x+"%", top:(wingTop(wing)+y*0.5)+"%"}; }
function roomBox(id){
  const L=LAYOUT[id];
  return {left:L.l+"%", top:(wingTop(L.wing)+L.t*0.5)+"%", width:L.w+"%", height:(L.h*0.5)+"%"};
}
/* ===== scroll lock: never yank the station while the player is browsing ===== */
const USER_SCROLL_GUARD=6000;
let _userScrollAt=0, _scrollTimer=0, _savedStageScroll=0;

function stageEl(){ return $("#stage"); }
function saveStageScroll(){
  const s=stageEl();
  if(s) _savedStageScroll=s.scrollTop|0;
  return _savedStageScroll;
}
function restoreStageScroll(){
  const s=stageEl();
  if(s) s.scrollTop=_savedStageScroll;
}
function cancelAutoScroll(){
  if(_scrollTimer){ clearTimeout(_scrollTimer); _scrollTimer=0; }
}
function markUserScroll(){
  _userScrollAt=Date.now();
  cancelAutoScroll();
}
function userIsScrolling(){
  return (Date.now()-_userScrollAt) < USER_SCROLL_GUARD;
}
function scrollStageToEl(el, opts){
  const force=opts&&opts.force;
  const smooth=!(opts&&opts.smooth===false);
  const stage=stageEl();
  if(!stage||!el) return;
  if(!force && userIsScrolling()) return;
  const run=()=>{
    if(!force && userIsScrolling()) return;
    const sr=stage.getBoundingClientRect();
    const er=el.getBoundingClientRect();
    if(er.width<2) return;
    const delta=(er.top+er.height/2)-(sr.top+sr.height/2);
    const max=Math.max(0, stage.scrollHeight-stage.clientHeight);
    const next=Math.max(0, Math.min(max, stage.scrollTop+delta));
    if(Math.abs(next-stage.scrollTop)<8) return;
    if(typeof stage.scrollTo==="function"){
      try{ stage.scrollTo({top:next, behavior:smooth?"smooth":"auto"}); }
      catch(e){ stage.scrollTop=next; }
    }else stage.scrollTop=next;
  };
  cancelAutoScroll();
  if(opts&&opts.delay){ _scrollTimer=setTimeout(run, opts.delay); }
  else run();
}
function scrollToRoom(id, opts){
  const el=document.querySelector('[data-testid="room-'+id+'"]');
  if(el) scrollStageToEl(el, opts);
}

/* ===== actors ===== */
let _aid=1;
function addActor(o){
  o.id=o.id||("a"+(++_aid));
  o.phase=o.phase||Math.random()*10;
  o.sayT=o.sayT||0;
  S.actors.push(o);
  return o;
}
function say(a,text,dur){ a.say=text; a.sayT=dur||2.8; }
function walkTo(a,x,y,spd){ a.tx=x; a.ty=y; a.spd=spd||18; a.walk=true; }

function spawnStaff(popHid){
  S.actors=S.actors.filter(a=>a.kind!=="hero");
  // drop leftover hero DOM so pop-in can replay
  $$("#actors [data-hero]").forEach(el=>el.remove());
  for(const id of ROOM_ORDER){
    const hid=S.rooms[id].hero;
    if(!hid || !S.heroes[hid]?.owned) continue;
    if(S.chiefLv<ROOMS[id].unlock) continue;
    const L=LAYOUT[id];
    const a=addActor({kind:"hero", hid, spr:hid, wing:L.wing, x:L.ax, y:L.ay, tx:L.ax, ty:L.ay, walk:false, life:1, roam:id, pop:hid===popHid});
    if(hid===popHid){ say(a, pick(SAY_START), 4); a.quiet=5; }
  }
}

function makeCase(forceBoss){
  const pool = forceBoss? CASES.filter(c=>c.boss) : CASES.filter(c=>!c.boss);
  const t=pick(pool);
  return {cid:"c"+(++_aid), type:t.id, title:t.title, story:t.story, line:t.line, civ:t.civ, suspect:t.suspect, boss:!!t.boss, stage:"arrive"};
}

function spawnCitizen(forced){
  const rec=S.rooms.reception;
  const waiting=S.actors.filter(a=>a.kind==="citizen"&&a.life!==0).length;
  if(!forced && waiting>=QUEUE_MAX) return;
  if(!forced && rec.in>=QUEUE_MAX+2) return;
  rec.in++;
  const cs=makeCase(!!forced?.boss || ((S.stats.interrogs||0)>0 && (S.stats.interrogs+1)%5===0));
  S.docket.push(cs);
  const spr="civ-woman";
  const q=S.actors.filter(x=>x.kind==="citizen"&&x.state!=="leave").length;
  const wx=LAYOUT.reception.px + Math.min(q,2)*7;
  const wy=LAYOUT.reception.py + Math.min(q,2)*3;
  const a=addActor({kind:"citizen", spr, wing:1, x:ENTRANCE.x-8, y:ENTRANCE.y+6, walk:true, spd:16, life:1, state:"arrive", caseId:cs.cid});
  walkTo(a, wx, wy, 16);
  setTimeout(()=>{ if(a.life!==0) say(a, cs.title+"!", 3); }, 400);
  return a;
}

function spawnVip(){
  if(S.actors.some(a=>a.kind==="vip")) return;
  const L=LAYOUT.reception;
  const a=addActor({kind:"vip", spr:"civ-woman", wing:1, x:ENTRANCE.x, y:ENTRANCE.y, life:1, state:"vip"});
  walkTo(a, L.px-6, L.py-4, 14);
  say(a, "Подарок шефу!", 4);
  toast("VIP-гость в приёмной! Нажмите на гостя.");
}

/* ===== simulation ===== */
function startWork(id){
  const r=S.rooms[id], d=ROOMS[id];
  if(r.work) return false;
  if((d.kind==="chain"||d.kind==="patrol") && r.in<=0) return false;
  if(d.kind==="patrol" && S.car.state!=="idle") return false;
  r.work=true; r.prog=0; mark();
  const st=S.actors.find(a=>a.kind==="hero"&&a.roam===id);
  if(st && !st.say && !st.quiet && Math.random()<0.7) say(st, pick(SAY.staff), 2.2);
  guideEvent("start:"+id);
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
      const cs=S.docket.find(c=>c.stage==="arrive"||c.stage==="reception");
      if(cs) cs.stage="docs";
    }
    if(id==="detective"){
      const cs=S.docket.find(c=>c.stage==="detective"||c.stage==="docs");
      if(cs) cs.stage="warrant";
    }
  }else if(d.kind==="patrol"){
    if(d.need) S[d.need]=Math.max(0,S[d.need]-(S[d.need]>=d.needAmt?d.needAmt:0));
    r.in=Math.max(0,r.in-1);
    S.car.state="out"; S.car.t=0;
    addStat("patrols",1); AU.car();
    guideEvent("patrol");
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
    toast(kind==="cash"?"+"+fmt(amt)+" ₪":"+"+amt);
    const hs=document.querySelector('[data-testid="room-'+room+'"]');
    if(hs){ const r=hs.getBoundingClientRect(); coinBurst(r.left+r.width/2, r.top+20, 7, kind==="cash"?"💰":"+"); }
    return;
  }
  if(d.next && ROOMS[d.next]){
    S.rooms[d.next].in+=amt;
    const A=LAYOUT[room], B=LAYOUT[d.next];
    const typ=kind==="suspects"?"suspect":kind==="inmates"?"inmate":"citizen";
    let spr="civ-woman";
    const cs=S.docket.find(c=>c.stage==="warrant"||c.stage==="suspect"||c.stage==="docs"||c.stage==="detective");
    if(typ==="suspect") spr="suspect-f";
    else if(typ==="inmate") spr="suspect-f";
    const a=addActor({kind:typ, spr, wing:A.wing, x:A.ax, y:A.ay, life:1, state:"xfer"});
    if(typ==="suspect" && cs){ cs.stage="interrog"; say(a, cs.line||pick(SAY.suspect), 2.6); }
    if(A.wing===B.wing){ walkTo(a,B.ax,B.ay,20); }
    else { walkTo(a, A.ax, 98, 20); a._then={wing:B.wing,x:B.ax,y:B.ay}; }
  }
  const r=S.rooms[room];
  if(r.out>0) r.out=Math.max(0,r.out-amt);
  mark(); hud();
}

function collectRoom(id){
  const r=S.rooms[id], d=ROOMS[id];
  if(d.kind==="holding"){
    if(r.pending>0){
      const amt=r.pending|0;
      addRes("cash",amt); toast("+"+fmt(amt)+" ₪"); r.pending=0; AU.coin(); guideEvent("collect:"+id);
      const hs=document.querySelector('[data-testid="room-cells"]');
      if(hs){ const b=hs.getBoundingClientRect(); coinBurst(b.left+b.width/2,b.top+40,8); }
      mark(); hud();
    }
    return;
  }
  if(r.out>0){
    const amt=r.out; r.out=0; deliver(id, d.outKey||d.prod, amt); AU.coin(); guideEvent("collect:"+id);
  }
}

function tick(dt){
  S._spawn=(S._spawn||0)+dt;
  if(!S._nextSp) S._nextSp=S.guideDone? (SPAWN_MIN+Math.random()*(SPAWN_MAX-SPAWN_MIN)) : 99;
  if(S.guideDone && S._spawn>=S._nextSp){
    S._spawn=0;
    const scale=Math.max(0.7, 1-(S.chiefLv-1)*0.03);
    S._nextSp=(SPAWN_MIN+Math.random()*(SPAWN_MAX-SPAWN_MIN))*scale;
    if(S.buffs.fastRec) S._nextSp=Math.max(7, S._nextSp*0.65);
    spawnCitizen();
  }

  S._vip=(S._vip||0)+dt;
  if(S.guideDone && S._vip>90){ S._vip=0; if(Math.random()<0.45) spawnVip(); }

  // day/night
  S._day=(S._day||0)+dt;
  const cyc=(S._day/80)%1;
  const tint=$("#daytint");
  if(tint){
    if(cyc>0.45 && cyc<0.58){ tint.style.background="#e8a050"; tint.style.opacity=".28"; } // dusk
    else if(cyc>=0.58 && cyc<0.82){ tint.style.background="#1a2a68"; tint.style.opacity=".32"; } // night
    else if(cyc>=0.82 && cyc<0.9){ tint.style.background="#f0b070"; tint.style.opacity=".22"; }
    else { tint.style.opacity="0"; }
  }

  if(S.combo>0){ S.comboTimer=(S.comboTimer||0)-dt; if(S.comboTimer<=0) S.combo=0; }

  for(const id of ROOM_ORDER){
    const d=ROOMS[id], r=S.rooms[id];
    if(S.chiefLv<d.unlock) continue;
    if(S.guideDone || d.kind==="resource"){
      if(d.kind==="chain" && !r.work && r.in>0) startWork(id);
      if(d.kind==="patrol" && !r.work && r.in>0 && S.car.state==="idle") startWork(id);
      if(d.kind==="resource" && !r.work) startWork(id);
    }
  }

  const slots=S.secondQueue?1.15:1;
  for(const id of ROOM_ORDER){
    const d=ROOMS[id], r=S.rooms[id];
    if(!r.work||d.kind==="interrog") continue;
    r.prog += dt/roomSpeed(id,S)*slots;
    if(r.prog>=1) finishWork(id);
  }

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
        guideEvent("carback");
      }
    }
  }else { S.car.x=G.ax; S.car.y=G.ay; }

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

  if(S.guideDone){
    S._auto=(S._auto||0)+dt;
    if(S._auto>AUTO_SEND){
      S._auto=0;
      for(const id of ["reception","detective","garage","armory","electric","gasstation"]){
        if(S.rooms[id].out>0) collectRoom(id);
      }
    }
  }

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

  for(const a of S.actors){
    if(a.kind==="hero" && a.roam && !a.walk && Math.random()<0.002){
      const L=LAYOUT[a.roam];
      // stay close to the desk — don't wander off
      walkTo(a, L.ax+(Math.random()*6-3), L.ay+(Math.random()*4-1), 8);
    }
    if(a.kind==="hero"){ if(a.quiet>0) a.quiet-=dt; else if(!a.say && Math.random()<0.0007) say(a, pick(SAY.staff), 2.2); }
    if(a.kind==="inmate" && !a.say && Math.random()<0.0007) say(a, pick(SAY.inmate), 2.2);
  }
  syncInmates();
}

function syncInmates(){
  const need=S.rooms.cells.in|0;
  let have=S.actors.filter(a=>a.kind==="inmate"&&a.state==="sit").length;
  const slots=[{x:20,y:72},{x:32,y:70},{x:16,y:78},{x:28,y:76}];
  while(have<need && have<slots.length){
    const s=slots[have];
    addActor({kind:"inmate", spr:"suspect-f", wing:1, x:s.x, y:s.y, tx:s.x, ty:s.y, walk:false, life:1, state:"sit"});
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
let IQ=null;
function nextCaseForIQ(){
  return S.docket.find(c=>c.stage==="interrog") || S.docket.find(c=>c.stage==="suspect") || makeCase(false);
}
function openInterrog(){
  if(S.rooms.interrog.in<=0){ toast("Пока некого допрашивать"); return; }
  const hid=S.rooms.interrog.hero || HERO_ORDER.find(id=>S.heroes[id].owned) || "anna";
  const def=HEROES[hid]||HEROES.anna;
  const cs=nextCaseForIQ();
  IQ={cs, hid, round:1, total: cs.boss?3:3, meter:40, stars:0, hits:0, locked:false};
  renderIQ();
  AU.paper();
}
function renderIQ(){
  if(!IQ) return;
  const def=HEROES[IQ.hid]||HEROES.anna;
  const cs=IQ.cs;
  const spr=heroSprite(def.id, S.heroes[def.id]?.outfit);
  const sus="suspect-f";
  const line = IQ.round===1 ? (cs.line||pick(SAY.iqOpen)) : (IQ.lastLine||pick(SAY.iqOpen));
  $("#iq").classList.remove("hidden");
  $("#iq").style.display="";
  $("#iq").innerHTML=`
    <button type="button" class="close" data-act="iqclose" data-testid="iq-close" aria-label="Закрыть">✕</button>
    <div class="iq-bg"><img src="assets/rooms/interrog-bg.webp" alt=""></div>
    <div class="iq-ui">
      ${cs.boss?'<div class="iq-boss">⚠ ОСОБО ОПАСНЫЙ</div>':''}
      <div class="iq-round">Раунд ${IQ.round} из ${IQ.total} · ${cs.title}</div>
      <div class="iq-meter"><div class="mlab"><span>Давление</span><span>Доверие</span></div><div class="mbar"><i style="width:${IQ.meter}%"></i></div></div>
      <div class="iq-pair">
        <div class="iq-card"><img src="${spr}" alt="${def.name}"><b>${def.name}</b></div>
        <div class="iq-card"><img src="assets/sprites/${sus}.webp" alt=""><b>${cs.boss?"Особо опасный":"Подозреваемая"}</b></div>
      </div>
      <div class="iq-line" id="iqline">${line}</div>
      <div class="iq-clue">${cs.story}</div>
      <div class="timing run" id="timing"><span class="zone"></span><span class="needle"></span></div>
      <div class="iq-actions">
        <button class="btn red" data-act="iqpick" data-arg="scare" data-testid="tactic-scare">😠 Запугать</button>
        <button class="btn" data-act="iqpick" data-arg="talk" data-testid="tactic-talk">🤝 Уговорить</button>
        <button class="btn blue" data-act="iqpick" data-arg="clue" data-testid="tactic-clue">🔎 Улики</button>
      </div>
    </div>`;
}
function timingBonus(){
  const t=$("#timing"), n=t&&t.querySelector(".needle");
  if(!t||!n) return 0;
  t.classList.remove("run");
  const tr=t.getBoundingClientRect(), nr=n.getBoundingClientRect();
  const p=(nr.left+nr.width/2-tr.left)/tr.width;
  // green zone ~38-62%
  return (p>0.36 && p<0.64)? 1 : (p>0.28 && p<0.72)? 0.4 : 0;
}
function iqPick(tactic){
  if(!IQ||IQ.locked) return;
  IQ.locked=true;
  const bonus=timingBonus();
  let d=0, line="";
  if(tactic==="scare"){ d=12+bonus*10; line=pick(SAY.iqScare); if(IQ.cs.boss) d-=4; }
  if(tactic==="talk"){ d=14+bonus*10; line=pick(SAY.iqTalk); }
  if(tactic==="clue"){ d=16+bonus*8; line="Вот улика. Что скажете теперь?"; if(IQ.cs.boss) d+=4; }
  IQ.meter=Math.max(5, Math.min(100, IQ.meter+d));
  if(bonus>=1){ IQ.hits++; toast("Точно!"); AU.ok(); } else if(bonus>0) AU.paper(); else AU.warn();
  IQ.lastLine=line;
  if(IQ.round>=IQ.total){ finishIQ(); return; }
  IQ.round++; IQ.locked=false;
  renderIQ();
  $("#iqline").textContent=line;
}
function finishIQ(){
  const r=S.rooms.interrog;
  if(r.in>0) r.in--;
  const need=IQ.cs.boss?62:48;
  const win=IQ.meter>=need;
  let sat=win?200:80;
  const hid=IQ.hid;
  if(hid && S.heroes[hid]?.owned){
    const def=HEROES[hid];
    sat=Math.round(sat*(1+heroPower(hid,S)*((def.bonus.sat||0)+(def.bonus.global||0))));
  }
  if(IQ.cs.boss && win){ sat=Math.round(sat*1.5); addStat("bosses",1); }
  const stars = !win?1 : (IQ.meter>=85 && IQ.hits>=2)?3 : (IQ.meter>=65 || IQ.hits>=1)?2:1;
  S.sat=(S.sat||0)+sat;
  addStat("interrogs",1);
  if(win){
    S.combo=(S.combo||0)+1; S.comboTimer=25;
    addStat("maxCombo",0);
    const cap=roomCap("cells",S);
    if(S.rooms.cells.in<cap){ S.rooms.cells.in++; spawnTransferInmate(IQ.cs); }
    else S.rooms.interrog.out++;
    if(IQ.cs) IQ.cs.stage="done";
  } else {
    S.combo=0;
    toast("Подозреваемая не раскололся — дело слабое.");
  }
  AU.ok(); shake(); mark(); hud();
  const starStr="★★★".slice(0,stars)+"☆☆☆".slice(stars);
  const dest=win?"Отправляется в камеру.":"Отпущен под подписку.";
  const el=$("#iq");
  const actions=el.querySelector(".iq-actions");
  const lineEl=$("#iqline");
  if(lineEl) lineEl.textContent=IQ.lastLine|| (win?pick(SAY.iqTalk):"Я ничего не скажу.");
  const timing=$("#timing"); if(timing) timing.remove();
  if(actions) actions.innerHTML=`<div class="iq-stars" style="grid-column:1/-1">${starStr}</div>
    <div class="iq-clue" style="grid-column:1/-1">+${sat} удовлетворённости. ${dest}${S.combo>1?" · Серия ×"+S.combo+"!":""}</div>
    <button class="btn wide" data-act="iqclose" data-testid="iq-ok" style="grid-column:1/-1">Готово</button>`;
  if(stars>=3) confetti();
  guideEvent("iqdone");
}
function spawnTransferInmate(cs){
  const A=LAYOUT.interrog, B=LAYOUT.cells;
  const a=addActor({kind:"inmate",spr:"suspect-f",wing:1,x:A.ax,y:A.ay,life:1,state:"xfer"});
  walkTo(a,B.ax,B.ay,18);
  say(a, pick(SAY.inmate), 2);
}
function closeIq(){ const q=$("#iq"); q.classList.add("hidden"); q.style.display=""; q.innerHTML=""; IQ=null; }

function sendRiot(){
  if(!S.riot) return;
  if(S.ammo>=5) S.ammo-=5;
  S.riot=false; S.riotTimer=0; AU.ok(); toast("Бунт подавлен"); mark(); hud();
}

function upgradeRoom(id){
  const r=S.rooms[id], cost=roomCost(id,r.level);
  if(S.cash<cost){toast("Не хватает денег — загляните в магазин");return;}
  S.cash-=cost; r.level++; addStat("upgrades",1);
  AU.ok(); confetti(); toast(ROOMS[id].name+" — уровень "+r.level);
  mark(); hud(); renderHotspots(); renderLabels(); renderRoomModal(id);
  guideEvent("upgrade");
}
function upgradeChief(){
  const c=chiefCost(S.chiefLv);
  if(S.cash<c.cash||S.diamonds<c.diamonds){toast("Не хватает ресурсов — всё есть в магазине бесплатно");return;}
  S.cash-=c.cash; S.diamonds-=c.diamonds; S.chiefLv++;
  const hint=UNLOCK_HINT[S.chiefLv];
  AU.ok(); confetti(); mark(); hud(); renderHotspots(); renderLabels();
  if(hint) showCinema("Новая комната!", "Кабинет шефа — уровень "+S.chiefLv+". Открыто: "+hint, hint);
  else toast("Кабинет шефа — уровень "+S.chiefLv);
  closeModal();
  guideEvent("upgrade");
  guideEvent("upchief");
}
function showCinema(title, text){
  const c=$("#cinema");
  c.classList.remove("hidden");
  c.style.display="";
  c.innerHTML=`<button type="button" class="close" data-act="cinemaclose" aria-label="Закрыть">✕</button><h2>${title}</h2><p>${text}</p><button class="btn gold" data-act="cinemaclose" data-testid="cinema-ok">Отлично</button>`;
}
function closeCinema(){ const c=$("#cinema"); c.classList.add("hidden"); c.style.display=""; c.innerHTML=""; }

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
  let msg="Пока вас не было ("+time+"), участок заработал:\n💰 "+fmt(cash)+" ₪";
  if(ammo) msg+="\n🔫 "+ammo; if(elec) msg+="\n⚡ "+elec; if(gas) msg+="\n⛽ "+gas;
  openModal(`<div class="mh">С возвращением</div><div class="ms" style="white-space:pre-line">${msg}</div><button class="btn wide" data-act="close">Забрать</button>`);
}

function maybeDaily(){
  const day=todayKey();
  if(S.dailyDate===day) return;
  const yesterday=(()=>{ const d=new Date(); d.setDate(d.getDate()-1);
    return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); })();
  S.dailyStreak = S.dailyDate===yesterday ? (S.dailyStreak||0)+1 : 1;
  S.dailyDate=day;
  const cash=1000*S.dailyStreak, dia=20*S.dailyStreak;
  addRes("cash",cash); addRes("diamonds",dia);
  openModal(`<div class="daily"><div class="mh">Ежедневный подарок</div>
    <div class="gift">🎁</div>
    <div class="ms">День ${S.dailyStreak} подряд</div>
    <div class="statg"><div class="stat"><b>${fmt(cash)} ₪</b><span>деньги</span></div>
    <div class="stat"><b>${dia} 💎</b><span>алмазы</span></div></div>
    <button class="btn wide" data-act="close">Забрать</button></div>`);
  confetti(); mark();
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
  const cb=$("#combobadge");
  if(cb){ if(S.combo>1){ cb.classList.remove("hidden"); cb.textContent="×"+S.combo; } else cb.classList.add("hidden"); }
  updateQuest();
}

function renderHotspots(){
  const el=$("#hotspots");
  el.innerHTML=ROOM_ORDER.map(id=>{
    const d=ROOMS[id], locked=S.chiefLv<d.unlock;
    const box=roomBox(id);
    const lock=locked?`<div class="locktag"><span class="lk">🔒</span>${d.name}<br>откроется на ур. ${d.unlock}</div>`:"";
    const tier=locked?"tier-locked":(S.rooms[id].level>=10?"tier-legend":S.rooms[id].level>=7?"tier-diamond":S.rooms[id].level>=4?"tier-gold":S.rooms[id].level>=2?"tier-silver":"tier-base");
    return `<div class="hotspot ${locked?"locked":""} ${tier}" data-act="open" data-arg="${id}" data-testid="room-${id}"
      style="left:${box.left};top:${box.top};width:${box.width};height:${box.height}"><span class="room-glass" aria-hidden="true"><i class="glass-wall"></i><i class="glass-window"></i><i class="glass-desk"></i><i class="glass-lamp"></i></span>${lock}</div>`;
  }).join("");
}
function renderLabels(){
  const el=$("#labels");
  const names={reception:"ПРИЁМНАЯ",detective:"ДЕТЕКТИВ",interrog:"ДОПРОСНАЯ",cells:"КАМЕРЫ",garage:"ГАРАЖ",
    chief:"ШЕФ",armory:"ОРУЖЕЙНАЯ",electric:"ЩИТОВАЯ",suggest:"ПРЕДЛОЖЕНИЯ",gasstation:"ЗАПРАВКА",press:"ПРЕСС-ЦЕНТР"};
  const html=ROOM_ORDER.map(id=>{
    const L=LAYOUT[id], d=ROOMS[id], locked=S.chiefLv<d.unlock;
    const st=posStyle(L.wing,L.lx,L.ly);
    const lv=locked?"":`<span class="lv">${S.rooms[id].level}</span>`;
    const work=(!locked && S.rooms[id].work)?`<i class="wp" style="width:${Math.min(100,S.rooms[id].prog*100)}%"></i>`:"";
    return `<div class="rlab" style="left:${st.left};top:${st.top}">${names[id]}${lv}${work}</div>`;
  }).join("");
  if(el.dataset.sig!==html){el.dataset.sig=html;el.innerHTML=html;}
}

function upsertActor(a, parent, extraClass){
  let el=parent.querySelector('[data-id="'+a.id+'"]');
  const shiny=a.kind==="hero" && HEROES[a.spr] && HEROES[a.spr].suit==="shiny";
  const rank=a.kind==="hero"?(S.heroes[a.hid||a.spr]?.level||1):1;
  const rankStyle=rank>=10?" hero-rank-3":rank>=6?" hero-rank-2":rank>=3?" hero-rank-1":"";
  const cls="actor "+(a.walk?"walk":"idle")+(a.wide?" wide":"")+(a.siren?" siren":"")+(shiny?" shiny":"")+rankStyle+(a.kind==="vip"?" vip":"")+(extraClass?(" "+extraClass):"");
  if(!el){
    el=document.createElement("div");
    el.dataset.id=a.id;
    if(a.kind==="hero") el.dataset.hero=a.hid||a.spr;
    if(a.kind==="vip"){ el.dataset.act="vip"; }
    el.innerHTML=`<div class="say"></div><img alt=""><div class="nametag"></div>`;
    if(a.pop){ el.classList.add("pop-in"); a.pop=false; setTimeout(()=>{ el.classList.remove("pop-in"); },700); }
    parent.appendChild(el);
  }
  if(a.pop){ el.classList.add("pop-in"); a.pop=false; setTimeout(()=>el.classList.remove("pop-in"),700); }
  // keep pop-in class if animation running
  const popping=el.classList.contains("pop-in");
  el.className=cls+(popping?" pop-in":"");
  const st=posStyle(a.wing||1, a.x, a.y);
  el.style.left=st.left; el.style.top=st.top;
  const img=el.querySelector("img");
  let src="assets/sprites/"+(a.spr||"civ-woman")+".webp";
  if(a.kind==="hero") src=heroSprite(a.spr, S.heroes[a.spr]?.outfit);
  if(img.dataset.src!==src){ img.src=src; img.dataset.src=src; }
  img.style.transform=a.flip?"scaleX(-1)":"";
  const sayEl=el.querySelector(".say");
  if(a.say){ sayEl.hidden=false; sayEl.textContent=a.say; } else { sayEl.hidden=true; sayEl.textContent=""; }
  const nt=el.querySelector(".nametag");
  if(a.kind==="hero"){ nt.hidden=false; nt.textContent=(HEROES[a.hid||a.spr]||{}).name||""; }
  else nt.hidden=true;
}

function renderActors(){
  const el=$("#actors");
  const keep=new Set(["car"]);
  // car
  let car=el.querySelector('[data-id="car"]');
  if(!car){
    car=document.createElement("div"); car.dataset.id="car";
    car.innerHTML=`<img alt="Патруль">`;
    el.appendChild(car);
  }
  const moving=S.car && S.car.state!=="idle";
  car.className="actor wide"+(moving?" walk siren":" idle");
  const cst=posStyle(1, (S.car&&S.car.x)||LAYOUT.garage.ax, (S.car&&S.car.y)||LAYOUT.garage.ay);
  car.style.left=cst.left; car.style.top=cst.top;
  const cimg=car.querySelector("img");
  if(cimg.dataset.src!=="assets/sprites/car-police.webp"){ cimg.src="assets/sprites/car-police.webp"; cimg.dataset.src="assets/sprites/car-police.webp"; }

  for(const a of S.actors){ keep.add(a.id); upsertActor(a, el); }
  for(const node of [...el.children]){
    if(!keep.has(node.dataset.id)) node.remove();
  }
}

function renderBubbles(){
  const el=$("#bubbles");
  const bits=[];
  const add=(id,text,cls,act,arg,tid)=>{
    const L=LAYOUT[id];
    const st=posStyle(L.wing, L.lx, Math.min(95,L.ly+14));
    bits.push(`<button class="abub ${cls||""}" data-act="${act}" data-arg="${arg||id}" data-testid="${tid||("bub-"+id)}" style="left:${st.left};top:${st.top}">${text}</button>`);
  };
  const rr=S.rooms;
  if(S.riot) add("cells","БУНТ! НАЖМИТЕ","red","open","cells","bub-riot");
  else{
    if(rr.reception.out>0) add("reception","ДОКУМЕНТЫ<small>отправить детективу</small>","gold","collect","reception","bub-docs");
    if(rr.detective.out>0) add("detective","ОРДЕР<small>активировать</small>","gold","collect","detective","bub-warrant");
    if(!rr.reception.hero) add("reception","ПОСАДИТЬ ДЕЖУРНУЮ<small>за стол</small>","gold","open","reception","bub-seat-rec");
    if(!rr.detective.hero) add("detective","ПОСАДИТЬ ДЕТЕКТИВА<small>за стол</small>","gold","open","detective","bub-seat-det");
    else if(rr.detective.in>0 && !rr.detective.work) add("detective","РАССЛЕДОВАТЬ","gold","open","detective","bub-invest");
    if(rr.garage.in>0 && !rr.garage.work && S.car.state==="idle") add("garage","ПАТРУЛЬ<small>отправить машину</small>","gold","startpatrol","garage","bub-patrol");
    if(rr.garage.out>0) add("garage","ПОДОЗРЕВАЕМАЯ<small>вести на допрос</small>","gold","collect","garage","bub-suspect");
    if(rr.interrog.in>0) add("interrog","ДОПРОС ПРОВЕСТИ","red","iq","","bub-iq");
    if(rr.interrog.out>0) add("interrog","В КАМЕРУ","gold","tocell","","bub-cell");
    if(rr.cells.pending>=20) add("cells","ЗАБРАТЬ "+fmt(rr.cells.pending|0)+" ₪","gold","collect","cells","bub-cash");
    if(rr.armory.out>0 && S.chiefLv>=2) add("armory","ПАТРОНЫ +"+rr.armory.out,"gold","collect","armory");
    if(rr.electric.out>0 && S.chiefLv>=3) add("electric","ЭНЕРГИЯ +"+rr.electric.out,"gold","collect","electric");
    if(rr.gasstation.out>0 && S.chiefLv>=5) add("gasstation","БЕНЗИН +"+rr.gasstation.out,"gold","collect","gasstation");
    if(S.suggestReady && S.chiefLv>=3) add("suggest","ПРЕДЛОЖЕНИЕ","gold","suggest","");
    if(S.actors.some(a=>a.kind==="vip")) add("reception","VIP ГОСТЬ<small>нажмите на гостя</small>","gold","vip","","bub-vip");
  }
  const html=bits.join("");
  if(el.dataset.sig!==html){ el.dataset.sig=html; el.innerHTML=html; }
}

/* ===== sheets / shop / heroes ===== */
function setTab(t){
  TAB=t;
  $("#game").dataset.tab=t;
  closeNikaTip();
  $$("#tabs .tab").forEach(b=>b.classList.toggle("on", b.dataset.arg===t));
  const sheet=$("#sheet");
  if(t==="station"){sheet.classList.add("hidden");sheet.innerHTML="";}
  else{
    sheet.classList.remove("hidden");
    if(t==="heroes") renderHeroes();
    else if(t==="tasks") renderTasks();
    else if(t==="shop"){ addStat("shopVisits",1); renderShop(); }
  }
  guideEvent("tab:"+t);
  updateQuest();
}
function renderShop(){
  const outfitBlock=`<div class="sec">Форма героинь</div>
    <div class="ms">Цвета формы бесплатно. Откройте карточку героини и выберите чёрный, красный, фиолетовый или белый.</div>
    <div class="outfits" style="justify-content:center;margin:8px 0 16px">${OUTFIT_COLORS.map(c=>`<button class="osw" data-c="${c.id}" title="${c.name}" style="background:${c.css}" data-act="tab" data-arg="heroes"></button>`).join("")}</div>`;
  $("#sheet").innerHTML=`<div class="sheet-h">Магазин</div><div class="sheet-sub">Всё бесплатно, без таймеров и ограничений. Берите сколько нужно.</div>`+
    outfitBlock+
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
  else if(item.special==="fund"){ if(!S.fund){S.fund=true;toast("Фонд роста активен: +50% к доходу");} else {addRes("cash",15000);toast("Фонд уже активен, +15 000 ₪");} }
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
  if(!h.owned){ h.owned=true; h.level=1; h.stars=0; h.outfit=h.outfit||"black"; return {id,neu:true}; }
  h.frags=(h.frags||0)+10;
  if(h.frags>=10 && h.stars<5){h.frags-=10;h.stars++; return {id,neu:false,star:true};}
  if(h.stars>=5){h.level=Math.min(50,h.level+3); return {id,neu:false,lvl:true};}
  return {id,neu:false};
}
function doGacha(mode){
  const n=mode==="10"?10:1, got=[];
  for(let i=0;i<n;i++) got.push(giveHero(rollOne(mode==="10"?"1":mode)));
  AU.gacha(); mark();
  const first=got[0], def=HEROES[first.id], rar=RAR[def.rarity];
  const extra=got.length>1?`<div class="ms">И ещё ${got.length-1}: ${got.slice(1).map(g=>HEROES[g.id].name).join(", ")}</div>`:"";
  const how=first.neu?"Новая сотрудница присоединилась к отделу!":first.star?"Дубликат: звезда повышена!":first.lvl?"Дубликат: уровень вырос!":"Дубликат: осколки добавлены.";
  openModal(`<div class="reveal"><div class="mh">Набор героинь</div>
    <div class="flip-wrap"><div class="flip-card" id="gflip">
      <div class="flip-face back">★</div>
      <div class="flip-face front"><img src="assets/heroes/${def.id}.webp" alt="${def.name}"></div>
    </div></div>
    <div class="rn" id="gname" style="opacity:0">${def.name}</div>
    <div class="rr" id="grar" style="opacity:0;color:${rar.color}">${rar.name} · ${def.role}</div>
    <div class="ms" id="ghow" style="opacity:0">${how}</div>${extra}
    <button class="btn wide" data-act="close">Отлично</button></div>`);
  setTimeout(()=>{ const f=$("#gflip"); if(f) f.classList.add("on"); }, 280);
  setTimeout(()=>{ ["gname","grar","ghow"].forEach(id=>{ const e=$("#"+id); if(e) e.style.opacity=1; }); AU.appear(); }, 900);
  if(TAB==="heroes") renderHeroes();
}
function heroTier(level){
 if(level>=10)return {id:5,name:"Легенда",next:null,icon:"✦"};
 if(level>=8)return {id:4,name:"Элита",next:10,icon:"✧"};
 if(level>=6)return {id:3,name:"Профи",next:8,icon:"◆"};
 if(level>=3)return {id:2,name:"Офицер",next:6,icon:"★"};
 return {id:1,name:"Новичок",next:3,icon:"☆"};
}
function renderHeroes(){
  const owned=HERO_ORDER.filter(id=>S.heroes[id].owned).length;
  $("#sheet").innerHTML=`<div class="sheet-h">✦ Эволюция героинь</div>
    <div class="sheet-sub">В отделе ${owned} из ${HERO_ORDER.length}. Прокачивайте героинь и открывайте новые образы.</div>
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
      const tier=heroTier(h.level);
      return `<div class="hcard evolution-card tier-${tier.id}" data-act="hero" data-arg="${id}" data-testid="hero-${id}"><div class="evo-stage">${tier.icon} ${tier.name}</div>
        <img src="assets/heroes/${id}.webp" alt="${def.name}">
        <div class="tag" style="background:#0008;color:${rar.color}">${rar.name}</div>
        <div class="lv">ур. ${h.level}</div>
        <div class="hb"><div class="hn">${def.name}</div><div class="hr">${def.role}${h.assigned?" · "+ROOMS[h.assigned].name:""}</div>
        <div class="stars">${stars}</div><div class="evo-progress"><i style="width:${Math.min(100,h.level/10*100)}%"></i></div><button type="button" class="evo-open-btn" data-act="hero" data-arg="${id}" data-testid="open-hero-${id}">Открыть · Прокачать</button></div></div>`;
    }).join("")}</div>`;
}
function openHero(id){
  const def=HEROES[id], h=S.heroes[id], rar=RAR[def.rarity];
  if(!h.owned){
    openModal(`<div class="mh">${def.name}</div><div class="ms" style="color:${rar.color}">${rar.name} · ${def.role}</div>
      <img class="openhero-spr" src="assets/heroes/${id}.webp" alt="" width="140" height="140" style="width:140px;height:140px;max-height:36vh;border-radius:16px;margin:8px auto;object-fit:cover">
      <div class="ms">${def.blurb}</div>
      <button class="btn wide" data-act="buy" data-arg="h1">Набрать бесплатно</button>
      <button class="btn grey wide" data-act="close">Закрыть</button>`);
    return;
  }
  const cost=heroCost(h.level);
  const rooms=ROOM_ORDER.filter(r=>S.chiefLv>=ROOMS[r].unlock).map(r=>{
    const on=h.assigned===r;
    return `<button class="btn ${on?"gold":""} sm" data-act="assign" data-arg="${id}|${r}" data-testid="assign-${id}-${r}">${on?"✓ ":""}Посадить: ${ROOMS[r].name}</button>`;
  }).join("");
  const tier=heroTier(h.level);
  const outfit=h.outfit||"black";
  const swatches=OUTFIT_COLORS.map(c=>`<button class="osw ${outfit===c.id?"on":""}" data-c="${c.id}" data-act="outfit" data-arg="${id}|${c.id}" title="${c.name}" style="background:${c.css}"></button>`).join("");
  openModal(`<div class="mh">${def.name}</div>
    <div class="ms" style="color:${rar.color}">${rar.name} · ${def.role} · ур. ${h.level}</div>
    <div class="evo-showcase tier-${tier.id}"><img class="openhero-spr" src="${heroSprite(id,outfit)}" alt="${def.name}" width="120"><span class="evo-showcase-label">${tier.icon} ${tier.name}</span></div>
    <div class="evo-roadmap"><b>Эволюция образа</b><div class="evo-roadmap-stages">${[1,3,6,8,10].map((lv,i)=>`<span class="${h.level>=lv?"reached":""}">${["Новичок","Офицер","Профи","Элита","Легенда"][i]}<small>ур. ${lv}</small></span>`).join("")}</div><div class="evo-next">${tier.next?"До следующего образа: "+(tier.next-h.level)+" ур.":"Высший образ открыт"}</div></div>
    <div class="ms">${def.blurb}</div>
    <div class="sec">Глянцевый гардероб · бесплатно</div><div class="ms">Выбранный цвет сохраняется. Автоматическая смена действует, пока цвет не выбран вручную.</div>
    <div class="outfits">${swatches}</div>
    <div class="statg"><div class="stat"><b>${h.level}</b><span>уровень</span></div><div class="stat"><b>${h.stars||0}/5</b><span>звёзды</span></div></div>
    <div class="sec">Посадить за стол</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px">${rooms}</div>
    <button class="btn wide" data-act="uphero" data-arg="${id}" data-testid="up-hero">✦ Прокачать за ${fmt(cost)} ₪</button>
    <button class="btn grey wide" data-act="close">Закрыть</button>`);
}
function setOutfit(arg){
  const [id,color]=arg.split("|");
  const h=S.heroes[id]; if(!h?.owned) return;
  if(!OUTFIT_COLORS.some(c=>c.id===color))return;
  h.outfit=color; h.outfitPinned=true; h.autoOutfit=false; AU.ok(); mark();
  spawnStaff(); renderActors(); openHero(id);
  toast(HEROES[id].name+": "+(OUTFIT_COLORS.find(c=>c.id===color)||{}).name+" форма");
}
function upHero(id){
  const h=S.heroes[id]; if(!h?.owned)return;
  if(h.level>=50){toast("Максимальный уровень достигнут");return;}
  const cost=heroCost(h.level);
  if(S.cash<cost){toast("Не хватает денег — возьмите в магазине бесплатно");return;}
  S.cash-=cost; h.level=Math.min(50,h.level+1);
  // Existing outfit artwork evolves automatically unless the player picked a color.
  if(!h.outfitPinned && (!h.outfit || h.outfit==="black" || h.autoOutfit)){
    const newColor=h.level>=10?"white":h.level>=6?"purple":h.level>=3?"red":"black";
    if(h.outfit!==newColor){h.outfit=newColor;h.autoOutfit=true;}
  }
  addStat("heroActs",1);
  AU.ok(); toast(HEROES[id].name+" — уровень "+h.level+(heroTier(h.level).id!==heroTier(h.level-1).id?" · НОВЫЙ ОБРАЗ!":"")); mark(); hud(); spawnStaff(id); renderActors(); openHero(id);
}
function assignHero(arg){
  const [id,room]=arg.split("|");
  const h=S.heroes[id]; if(!h?.owned || !S.rooms[room]){toast("Сотрудница пока недоступна");return;}
  // clear previous occupant of this room + previous room of this hero
  for(const hid of HERO_ORDER){ if(S.heroes[hid].assigned===room) S.heroes[hid].assigned=null; }
  if(h.assigned && S.rooms[h.assigned]) S.rooms[h.assigned].hero=null;
  h.assigned=room; S.rooms[room].hero=id;
  addStat("assigns",1);
  mark();
  closeModal();
  setTab("station");
  spawnStaff(id);
  scrollToRoom(room, {force:true, smooth:true});
  AU.appear();
  dropToasts(m=>/посадите/i.test(m));
  if(S.guideDone) toast(HEROES[id].name+" села за стол: "+ROOMS[room].name);
  const qid=(typeof chainStep==="function" && chainStep()||{}).id;
  if((!S.guideDone || qid==="warrant" || qid==="seat-det") && room==="detective" && S.rooms.detective.in>0){
    if(!S.rooms.detective.work) startWork("detective");
    S.rooms.detective.prog=1; finishWork("detective");
  }
  const just=S.actors.find(x=>x.hid===id);
  if(just){ say(just, pick(SAY_START), 4); just.quiet=6; }
  guideEvent("assign");
  guideEvent("assign:"+room);
  renderActors();
  setTimeout(()=>scrollToRoom(room, {force:true, smooth:true}), 50);
}

function renderTasks(){
  if(S.tasks.day!==todayKey()) S.tasks={day:todayKey(),prog:{},claimed:{}};
  const tasks=TASKS.map(t=>{
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
  }).join("");
  const ach=ACHIEVES.map(a=>{
    const got=!!S.achieves[a.id];
    return `<div class="ach ${got?"got":""}"><div class="ic">${got?"🏆":"🔒"}</div>
      <div class="sn"><b>${a.name}</b><span>${a.desc}</span></div></div>`;
  }).join("");
  $("#sheet").innerHTML=`<div class="mission-card"><span>ТЕКУЩЕЕ ДЕЛО</span><h2>${currentQuest().title}</h2><p>${currentQuest().nika||""}</p><button class="btn wide" data-act="questhelp">Перейти к заданию →</button></div><div class="sheet-h">Задания на сегодня</div>
    <div class="sheet-sub">Ежедневные поручения. Награды можно забирать сразу.</div>`+tasks+
    `<button class="btn grey wide" data-act="claimall">Забрать всё выполненное</button>
    <div class="sec">Достижения</div>`+ach+(!S.guideDone?`<button class="btn grey wide" data-act="guideskip">Завершить обучение</button>`:"");
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
  detective:"Детектив изучает документы и готовит ордер на арест. Посадите сотрудницу за этот стол — она сразу появится в кабинете.",
  garage:"По ордеру патрульная машина выезжает в город и привозит подозреваемую.",
  interrog:"Три раунда допроса: запугать, уговорить или показать улики. Поймайте момент на шкале — будет бонус.",
  cells:"Заключённые содержатся здесь и приносят участку деньги. Если камеры переполнены, возможен бунт.",
  chief:"Отсюда вы руководите участком. Повышение уровня открывает новые комнаты ниже по экрану.",
  armory:"Здесь готовят патроны для отдела и группы подавления бунтов.",
  electric:"Щитовая питает камеры и весь участок электричеством.",
  suggest:"Ящик предложений: жители пишут идеи, а вы забираете благодарности.",
  gasstation:"Заправка пополняет бензин для патрульных машин.",
  press:"Пресс-центр публикует приказы шефа — полезные усиления для участка."
};

function seatPicker(roomId){
  const owned=HERO_ORDER.filter(id=>S.heroes[id].owned);
  if(!owned.length) return `<div class="ms">Сначала наберите героиню — в наборе всё бесплатно.</div>
    <button class="btn wide" data-act="tab" data-arg="heroes" data-testid="goto-heroes">К героиням</button>`;
  return `<div class="sec">Кто сядет за этот стол?</div>
    <div class="seat-grid">`+owned.map(id=>{
      const def=HEROES[id], h=S.heroes[id], on=S.rooms[roomId].hero===id;
      return `<button class="seat ${on?"on":""}" data-act="assign" data-arg="${id}|${roomId}" data-testid="seat-${id}">
        <img src="assets/heroes/${id}.webp" alt="${def.name}">
        ${def.name}${on?" · уже здесь":""}<br><span style="font-weight:700;color:#c49220">${on?"✓ За столом":"Посадить за стол"}</span>
      </button>`;
    }).join("")+`</div>`;
}

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
  if(id==="interrog" && S.rooms.interrog.in>0 && S.guideDone){ closeModal(); openInterrog(); return; }
  guideEvent("open:"+id);
  const qid2=(typeof chainStep==="function" && chainStep()||{}).id;
  if(qid2==="client" && id==="reception" && S.rooms.reception.in>0){
    if(!S.rooms.reception.work) startWork("reception");
    S.rooms.reception.prog=1; finishWork("reception");
    closeModal();
    guideEvent("open:reception");
    return;
  }
  renderRoomModal(id);
}
function roomVisualTier(level){
 if(level>=10)return {name:"Легендарный лак",cls:"lux-legend"};
 if(level>=7)return {name:"Золотой люкс",cls:"lux-gold"};
 if(level>=4)return {name:"Неоновый премиум",cls:"lux-neon"};
 if(level>=2)return {name:"Глянцевый ремонт",cls:"lux-gloss"};
 return {name:"Стартовый интерьер",cls:"lux-basic"};
}
const ROOM_DECOR={reception:"✉",detective:"⌕",interrog:"◈",cells:"▦",garage:"🚓",chief:"♛",armory:"⬡",electric:"⚡",suggest:"✿",gasstation:"⛽",press:"◉"};
function roomVisualHTML(id,level){
 const tier=roomVisualTier(level);
 return `<div class="room-visual ${tier.cls}" data-testid="room-visual-${id}" role="img" aria-label="${ROOMS[id].name}: ${tier.name}">
 <div class="rv-sky"><span>חיפה · HAIFA</span><b>✡</b><span>ים תיכון</span></div>
 <div class="rv-windows"><i></i><i></i><i></i></div><div class="rv-ceiling">✦ ━━━━━ ✦</div>
 <div class="rv-furniture"><span>${ROOM_DECOR[id]||"✦"}</span><span>▤</span><span>✦</span></div>
 <div class="rv-floor"></div><div class="rv-caption">✦ ${tier.name} · уровень ${level}</div></div>`;
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
    if(r.out>0) actions+=`<button class="btn wide" data-act="tocell">Отправить в камеру</button>`;
    if(r.in>0) actions+=`<button class="btn red wide" data-act="iq" data-testid="start-iq">Начать допрос</button>`;
  }else if(d.kind==="holding"){
    body=`<div class="statg">
      <div class="stat"><b>${r.in} / ${cap}</b><span>заключённые</span></div>
      <div class="stat"><b>${fmt(r.pending|0)} ₪</b><span>можно забрать</span></div>
    </div>`;
    if(r.pending>0) actions+=`<button class="btn wide" data-act="collect" data-arg="${id}" data-testid="collect-cash">Забрать ${fmt(r.pending|0)} ₪</button>`;
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
    actions+=`<button class="btn gold wide" data-act="upchief" data-testid="up-chief">Повысить за ${fmt(c.cash)} ₪ и ${c.diamonds} 💎</button>`;
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
      <div><b>${def.name}</b><div class="ms">${def.role} · ур. ${S.heroes[hid].level} · за столом</div></div></div>`
    :`<div class="assignee"><div style="width:52px;height:52px;border-radius:12px;background:#e8f3ff;display:flex;align-items:center;justify-content:center">⭐</div>
      <div><b>Стол свободен</b><div class="ms">Посадите сотрудницу — она сразу появится здесь</div></div></div>`;
  openModal(`<div class="mh">${d.name}</div><div class="ms">${FLAVOR[id]||""}</div>
    ${roomVisualHTML(id,r.level)}
    ${asg}
    ${body}
    <div class="room-actions">${actions}</div>
    <details class="staff-picker" ${r.hero?"":"open"}><summary>Назначить сотрудницу</summary>${seatPicker(id)}</details>
    ${d.kind!=="mailbox"&&d.kind!=="orders"?`<button class="btn blue wide" data-act="uproom" data-arg="${id}" data-testid="up-room">✦ Обновить интерьер за ${fmt(cost)} ₪</button>`:""}
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
    ()=>{addRes("cash",2000);return "+2 000 ₪ от жителя";},
    ()=>{addRes("diamonds",40);return "+40 алмазов";},
    ()=>{addRes("gas",40);return "+40 бензина";},
    ()=>{addRes("ammo",40);return "+40 патронов";},
    ()=>{S.sat=(S.sat||0)+80;return "Удовлетворённость +80";}
  ];
  const m=opts[Math.random()*opts.length|0]();
  AU.coin(); toast(m); S.suggestReady=true; mark(); hud();
}
function collectVip(){
  const a=S.actors.find(x=>x.kind==="vip");
  if(!a) return;
  a.life=0; a.state="leave";
  addRes("diamonds",80); addRes("cash",1500);
  toast("VIP оставил подарок!");
  AU.ok(); confetti();
}

function openModal(html){
  saveStageScroll();
  const m=$("#modal");
  m.classList.remove("hidden"); m.style.display="";
  m.innerHTML=`<div class="box" tabindex="-1">${html}<button type="button" class="close" data-act="close" aria-label="Закрыть">✕</button></div>`;
  const box=m.querySelector(".box");
  if(box && box.focus){ try{ box.focus({preventScroll:true}); }catch(e){} }
  placePointer();
  restoreStageScroll();
  requestAnimationFrame(restoreStageScroll);
}
function closeModal(){
  const m=$("#modal");
  m.classList.add("hidden"); m.style.display=""; m.innerHTML="";
  restoreStageScroll();
  requestAnimationFrame(restoreStageScroll);
  placePointer();
}

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
    case "outfit": setOutfit(arg); break;
    case "claim": claimTask(arg); break;
    case "claimall": claimAll(); break;
    case "uproom": upgradeRoom(arg); break;
    case "upchief": upgradeChief(); break;
    case "collect": collectRoom(arg); closeModal(); break;
    case "skipone": { const r=S.rooms[arg]; if(r&&r.work) r.prog=1; closeModal(); break; }
    case "iq": closeModal(); openInterrog(); break;
    case "iqpick": iqPick(arg); break;
    case "iqclose": closeIq(); break;
    case "startpatrol": startWork("garage"); closeModal(); guideEvent("patrol"); break;
    case "riot": sendRiot(); closeModal(); break;
    case "tocell": {
      const cap=roomCap("cells",S);
      const n=Math.max(0,Math.min(S.rooms.interrog.out, cap-S.rooms.cells.in));
      if(!n){ toast("В камерах нет свободных мест. Улучшите камеры."); break; }
      S.rooms.interrog.out-=n; S.rooms.cells.in+=n; mark(); closeModal(); guideEvent("tocell"); break;
    }
    case "suggest": doSuggest(); break;
    case "order": doOrder(arg); break;
    case "open": openRoom(arg); break;
    case "mute":
      S.muted=!S.muted; AU.muted=S.muted;
      if(S.muted) AU.stopMusic(); else { AU.init(); AU.startMusic(); }
      hud(); mark(); break;
    case "guidenext": guideNext(); break;
    case "guideskip": finishGuide(); break;
    case "questhelp": followQuest(); break;
    case "closetip": closeNikaTip(); break;
    case "cinemaclose": closeCinema(); break;
    case "vip": collectVip(); break;
    case "questbar": followQuest(); break;
  }
}

/* ===== v6 step-by-step quests ===== */
const QUEST_CHAIN = [
  {id:"seat-rec", title:"Посади дежурную за стол",
    nika:"Привет! Я Ника. Делаем всё по шагам. Нажмите на ПРИЁМНУЮ и посадите Анну за стол.",
    sel:'[data-testid="bub-seat-rec"], [data-testid="room-reception"], [data-testid="seat-anna"]',
    room:"reception", wait:"assign:reception",
    done:()=>!!S.rooms.reception.hero,
    enter(){ if(!S.heroes.anna.owned) giveHero("anna"); },
    praise:"Анна на месте! Теперь можно принимать заявления.", reward:200},
  {id:"client", title:"Прими первое заявление",
    nika:"К нам идёт житель. Нажмите на ПРИЁМНУЮ, чтобы принять заявление.",
    sel:'[data-testid="room-reception"]',
    room:"reception", wait:"open:reception|collect:reception|start:reception",
    done:()=> (S.stats.docs||0)>0 || S.rooms.reception.out>0,
    enter(){ if(S.rooms.reception.in<=0) spawnCitizen(true); scrollToRoom("reception"); },
    praise:"Заявление принято! Документы готовы.", reward:200},
  {id:"docs", title:"Отправь документы детективу",
    nika:"Нажмите золотую табличку «Документы», чтобы передать дело детективу.",
    sel:'[data-testid="bub-docs"], [data-testid="collect-room"]',
    room:"reception", wait:"collect:reception",
    done:()=> (S.rooms.detective.in>0 || (S.stats.docs||0)>0) && S.rooms.reception.out<=0,
    praise:"Документы у детектива. Теперь нужен сыщик!", reward:200},
  {id:"seat-det", title:"Посади детектива за стол",
    nika:"Нажмите на кабинет детектива и посадите Марину за стол — она сразу появится.",
    sel:'[data-testid="bub-seat-det"], [data-testid="room-detective"], [data-testid="seat-marina"]',
    room:"detective", wait:"assign:detective|assign",
    done:()=>!!S.rooms.detective.hero,
    enter(){ if(!S.heroes.marina.owned) giveHero("marina"); },
    praise:"Марина за столом и сразу берётся за дело!", reward:300},
  {id:"warrant", title:"Активируй ордер",
    nika:"Нажмите золотую табличку «Ордер», чтобы отправить дело в патруль.",
    sel:'[data-testid="bub-warrant"], [data-testid="collect-room"], [data-testid="room-detective"]',
    room:"detective", wait:"collect:detective",
    done:()=> S.rooms.garage.in>0 || ((S.stats.warrants||0)>0 && S.rooms.detective.out<=0),
    enter(){
      if(S.rooms.detective.in>0){
        if(!S.rooms.detective.work) startWork("detective");
        S.rooms.detective.prog=1; finishWork("detective");
      }
    },
    praise:"Ордер готов! Пора отправить патруль.", reward:200},
  {id:"patrol", title:"Отправь патруль",
    nika:"Нажмите табличку «Патруль» — машина выедет за подозреваемым.",
    sel:'[data-testid="bub-patrol"], [data-testid="patrol"], [data-testid="room-garage"]',
    room:"garage", wait:"patrol",
    done:()=> (S.stats.patrols||0)>0 || S.car.state!=="idle" || S.rooms.garage.out>0,
    praise:"Патруль выехал. Подождём, когда машина вернётся.", reward:200},
  {id:"wait-car", title:"Дождись патруль",
    nika:"Машина уже в пути. Как вернётся — нажмите табличку «Подозреваемая».",
    sel:'[data-testid="bub-suspect"], [data-testid="room-garage"]',
    room:"garage", wait:"carback|collect:garage",
    done:()=> S.rooms.garage.out>0 || S.rooms.interrog.in>0,
    praise:"Патруль вернулся с подозреваемым!", reward:100},
  {id:"suspect", title:"Ведите подозреваемую на допрос",
    nika:"Нажмите табличку «Подозреваемая», чтобы отвести его в допросную.",
    sel:'[data-testid="bub-suspect"], [data-testid="collect-room"]',
    room:"garage", wait:"collect:garage",
    done:()=> S.rooms.interrog.in>0,
    praise:"Подозреваемая в допросной. Начинаем допрос!", reward:200},
  {id:"iq", title:"Проведи допрос",
    nika:"Нажмите «Допрос провести». Три раунда: запугать, уговорить или улики. Поймайте зелёную зону!",
    sel:'[data-testid="bub-iq"], [data-testid="start-iq"]',
    room:"interrog", wait:"iqdone",
    done:()=> (S.stats.interrogs||0)>0,
    praise:"Допрос удался! Теперь отправьте его в камеру.", reward:400},
  {id:"cell", title:"Отправь в камеру",
    nika:"Нажмите табличку «В камеру», чтобы разместить задержанную.",
    sel:'[data-testid="bub-cell"], [data-testid="room-interrog"]',
    room:"interrog", wait:"tocell",
    done:()=> (S.rooms.cells.in||0)>0,
    praise:"Камеры работают и приносят доход. Заберите деньги!", reward:200},
  {id:"income", title:"Забери деньги в камерах",
    nika:"Нажмите табличку в камерах (или саму комнату) и заберите доход.",
    sel:'[data-testid="bub-cash"], [data-testid="collect-cash"], [data-testid="room-cells"]',
    room:"cells", wait:"collect:cells",
    done:()=> !!(S.questFlags&&S.questFlags.income),
    enter(){ if((S.rooms.cells.pending||0)<40) S.rooms.cells.pending=(S.rooms.cells.pending||0)+80; },
    praise:"Отличный доход! Давайте улучшим комнату.", reward:300},
  {id:"upgrade", title:"Улучши комнату",
    nika:"Откройте любую комнату и нажмите «Улучшить». Деньги можно взять в магазине бесплатно.",
    sel:'[data-testid="up-room"], [data-testid="room-cells"], [data-testid="room-reception"]',
    room:"cells", wait:"upgrade",
    done:()=> (S.stats.upgrades||0)>0 || ROOM_ORDER.some(id=>S.rooms[id].level>1),
    praise:"Комната стала лучше! Загляните в магазин — там всё бесплатно.", reward:300},
  {id:"shop", title:"Открой бесплатный магазин",
    nika:"Нажмите зелёную вкладку «Магазин» внизу. Всё бесплатно, без ограничений.",
    sel:'[data-testid="tab-shop"]',
    wait:"tab:shop",
    done:()=> (S.stats.shopVisits||0)>0,
    praise:"Берите всё, что нужно! Остался последний шаг обучения.", reward:200},
  {id:"unlock", title:"Открой новую комнату",
    nika:"Листайте участок вниз, откройте кабинет шефа и нажмите «Повысить» — откроется новая комната.",
    sel:'[data-testid="room-chief"], [data-testid="up-chief"]',
    room:"chief", wait:"upchief|upgrade",
    done:()=> S.chiefLv>=2,
    praise:"Новая комната открыта! Листайте вниз. Дальше я буду подсказывать по одному заданию.", reward:500}
];

function chainStep(){
  if(!S || S.guideDone) return null;
  const i=S.questIdx||0;
  return QUEST_CHAIN[i]||null;
}
function syncQuestFromState(){
  if(!S) return;
  S.questFlags=S.questFlags||{};
  S.questFlags.completed=S.questFlags.completed||{};
  // Completed steps stay completed after their documents or suspects move on.
  let idx=Math.max(0,Math.min(QUEST_CHAIN.length,Number(S.questIdx)||0));
  if(!S.questFlags.migratedV8){
    if((S.stats.interrogs||0)>0) idx=Math.max(idx,9);
    if(S.rooms.cells.in>0) idx=Math.max(idx,10);
    S.questFlags.migratedV8=true;
  }
  if(S.guideDone) idx=QUEST_CHAIN.length;
  for(let i=0;i<idx;i++) S.questFlags.completed[QUEST_CHAIN[i].id]=true;
  while(idx<QUEST_CHAIN.length && S.questFlags.completed[QUEST_CHAIN[idx].id]) idx++;
  S.questIdx=idx;
  S.guideDone=idx>=QUEST_CHAIN.length;
  if(S.guideDone) S.tut=99;
}
function ongoingQuest(){
  const rr=S.rooms;
  if(S.riot) return {title:"Подави бунт в камерах", nika:"В камерах бунт! Нажмите красную табличку и подавите его.", sel:'[data-testid="bub-riot"], [data-testid="room-cells"]', room:"cells"};
  if(!rr.reception.hero) return {title:"Посади дежурную за стол", nika:"В приёмной пустой стол. Откройте комнату и посадите сотрудницу.", sel:'[data-testid="bub-seat-rec"], [data-testid="room-reception"]', room:"reception"};
  if(!rr.detective.hero) return {title:"Посади детектива за стол", nika:"Детективу нужен сыщик. Откройте кабинет и посадите героиню.", sel:'[data-testid="bub-seat-det"], [data-testid="room-detective"]', room:"detective"};
  if(rr.interrog.in>0) return {title:"Проведи допрос", nika:"Подозреваемая ждёт. Нажмите «Допрос провести».", sel:'[data-testid="bub-iq"], [data-testid="start-iq"]', room:"interrog"};
  if(rr.interrog.out>0) return {title:"Отправь в камеру", nika:"Допрос окончен. Нажмите «В камеру».", sel:'[data-testid="bub-cell"]', room:"interrog"};
  if(rr.garage.out>0) return {title:"Ведите подозреваемую на допрос", nika:"Патруль вернулся. Нажмите табличку «Подозреваемая».", sel:'[data-testid="bub-suspect"]', room:"garage"};
  if(rr.garage.in>0 && S.car.state==="idle") return {title:"Отправь патруль", nika:"Ордер готов. Нажмите табличку «Патруль».", sel:'[data-testid="bub-patrol"]', room:"garage"};
  if(rr.detective.out>0) return {title:"Активируй ордер", nika:"Нажмите золотую табличку «Ордер».", sel:'[data-testid="bub-warrant"]', room:"detective"};
  if(rr.reception.out>0) return {title:"Отправь документы детективу", nika:"Нажмите табличку «Документы».", sel:'[data-testid="bub-docs"]', room:"reception"};
  if((rr.cells.pending||0)>=20) return {title:"Забери деньги в камерах", nika:"В камерах накопился доход. Заберите его.", sel:'[data-testid="bub-cash"], [data-testid="room-cells"]', room:"cells"};
  if(S.actors.some(a=>a.kind==="vip")) return {title:"Прими VIP-гостя", nika:"VIP в приёмной — нажмите на гостя.", sel:'[data-testid="bub-vip"]', room:"reception"};
  if(rr.reception.in>0) return {title:"Дождись окончания приёма", nika:"В приёмной оформляют заявление. Можно открыть комнату и ускорить.", sel:'[data-testid="room-reception"]', room:"reception"};
  if(S.chiefLv<6) return {title:"Открой новую комнату", nika:"Улучшите кабинет шефа, чтобы открыть новые комнаты внизу участка.", sel:'[data-testid="room-chief"], [data-testid="up-chief"]', room:"chief"};
  return {title:"Жди жителя или улучши участок", nika:"Следующий житель скоро придёт. А в магазине всё бесплатно.", sel:null};
}
function currentQuest(){
  return chainStep() || ongoingQuest();
}
function questInfo(){
  const q=currentQuest()||{};
  return {text:q.title||"", sel:q.sel, room:q.room, nika:q.nika, id:q.id, title:q.title};
}
let _questLock=false;
function completeQuest(force){
  if(_questLock) return;
  const st=chainStep();
  if(!st){ updateQuest(); return; }
  try{ if(!force && st.done && !st.done()) return; }catch(e){}
  _questLock=true;
  S.questFlags.completed=S.questFlags.completed||{};
  S.questFlags.completed[st.id]=true;
  S.questIdx=(S.questIdx||0)+1;
  if(st.reward){
    addRes("cash", st.reward);
    const hs=document.querySelector("#questbar")||document.body;
    const r=hs.getBoundingClientRect();
    coinBurst(r.left+r.width/2, r.bottom+8, 8);
    AU.star();
  }
  if(st.praise) showNikaTip(st.praise+(st.reward?(" +"+fmt(st.reward)+" ₪"):""));
  syncQuestFromState();
  if(S.guideDone){
    const sk=$("#questskip"); if(sk) sk.classList.add("hidden");
    S._nextSp=SPAWN_MIN+Math.random()*(SPAWN_MAX-SPAWN_MIN);
  }else{
    enterQuest();
  }
  updateQuest();
  mark();
  setTimeout(()=>{ _questLock=false; }, 350);
}
function enterQuest(){
  const st=chainStep();
  if(!st) return;
  try{ if(st.enter) st.enter(); }catch(e){ console.warn(e); }
  setTimeout(()=>{ if(chainStep()?.id===st.id && st.nika) showNikaTip(st.nika); }, 200);
}
function showNikaTip(text){
  const box=$("#nikatip"), p=$("#nikatiptxt");
  if(!box||!p||!text) return;
  p.textContent=text;
  box.classList.remove("hidden");
  box.style.display="";
  if(S._tipTimer) clearTimeout(S._tipTimer);
  S._tipTimer=setTimeout(()=>closeNikaTip(), 4200);
  placeToasts();
}
function closeNikaTip(){
  const box=$("#nikatip");
  if(box){ box.classList.add("hidden"); box.style.display=""; }
  if(S && S._tipTimer){ clearTimeout(S._tipTimer); S._tipTimer=0; }
  placeToasts();
}
function showGuide(){ // kept name: start or refresh the current step
  const box=$("#coach"); if(box){ box.classList.add("hidden"); box.style.display=""; }
  syncQuestFromState();
  const sk=$("#questskip");
  if(sk) sk.classList.toggle("hidden", !!S.guideDone);
  if(!S.guideDone) enterQuest();
  updateQuest();
}
function guideNext(){ /* intro clicks no longer used */ }
function onEnterGuide(){ enterQuest(); }
function guideEvent(ev){
  if(ev==="collect:cells"){ S.questFlags=S.questFlags||{}; S.questFlags.income=true; }
  const st=chainStep();
  if(!st){ updateQuest(); return; }
  const waits=(st.wait||"").split("|");
  if(waits.includes(ev)){
    // give state a tick, then complete if done (or if the wait itself is the completion)
    setTimeout(()=>{
      try{
        if(!chainStep() || chainStep().id!==st.id) return;
        if(!st.done || st.done()) completeQuest();
      }catch(e){ completeQuest(); }
    }, 30);
    return;
  }
  updateQuest();
}
function finishGuide(){
  S.guideDone=true; S.questIdx=QUEST_CHAIN.length; S.guideStep=99; S.tut=99;
  const box=$("#coach"); if(box){ box.classList.add("hidden"); box.style.display=""; }
  const ptr=$("#pointer"); if(ptr) ptr.classList.add("hidden");
  const ring=$("#pulsering"); if(ring) ring.classList.add("hidden");
  const sk=$("#questskip"); if(sk) sk.classList.add("hidden");
  closeNikaTip();
  S._nextSp=SPAWN_MIN+Math.random()*(SPAWN_MAX-SPAWN_MIN);
  placePointer();
  updateQuest();
  showNikaTip("Обучение пропущено. Нажмите «Перейти» — откроется комната текущего задания.");
  mark();
}
window.__skipGuide=finishGuide;

function updateQuest(){
  const q=questInfo();
  const t=$("#questtxt"); if(t) t.textContent=q.title||q.text||"";
  const step=$("#queststep");
  if(step){
    if(!S.guideDone && (S.questIdx||0)<QUEST_CHAIN.length){
      step.textContent="Шаг "+((S.questIdx||0)+1)+" из "+QUEST_CHAIN.length;
    }else{
      step.textContent="Задание";
    }
  }
  const sk=$("#questskip");
  if(sk) sk.classList.toggle("hidden", !!S.guideDone);
  S._questSel=q.sel;
  S._questRoom=q.room;
  // auto-advance if the current chain step is already done
  const st=chainStep();
  if(st && st.done && !_questLock){
    try{ if(st.done()){ completeQuest(); return; } }catch(e){}
  }
  placePointer();
}
function followQuest(silent){
  if(silent)return;
  const q=questInfo();
  closeNikaTip();closeModal();closeIq();closeCinema();
  if(q.id==="shop"){setTab("shop");toast("Задание: открой бесплатный магазин");return;}
  setTab("station");
  if(q.room){
    _userScrollAt=0;cancelAutoScroll();
    scrollToRoom(q.room,{force:true,smooth:false});
    openRoom(q.room);
    const box=$("#modal .box");
    if(box){
      const help=document.createElement("div");help.className="quest-focus";
      const heading=document.createElement("strong");heading.textContent="ТВОЁ ЗАДАНИЕ";
      const desc=document.createElement("p");desc.textContent=q.nika||q.title||"";
      help.append(heading,desc);
      const hero=q.id==="seat-rec"?"anna":q.id==="seat-det"?"marina":null;
      if(hero && S.heroes[hero]?.owned && !S.rooms[q.room].hero){
        const b=document.createElement("button");b.className="btn gold wide quest-do";
        b.textContent="Назначить "+HEROES[hero].name+" и продолжить";
        b.dataset.act="assign";b.dataset.arg=hero+"|"+q.room;help.appendChild(b);
      }
      box.prepend(help);box.scrollTop=0;
    }
    toast("Открыто: "+q.title);
  }else if(q.nika)showNikaTip(q.nika);
}
function placePointer(){
  const p=$("#pointer"), ring=$("#pulsering");
  const hide=()=>{ if(p) p.classList.add("hidden"); if(ring) ring.classList.add("hidden"); };
  if(!p) return;
  if(TAB!=="station" || !$("#modal").classList.contains("hidden")){ hide(); return; }
  if(!$("#iq").classList.contains("hidden") || !$("#cinema").classList.contains("hidden")){
    hide(); return;
  }
  const box=$("#coach"); if(box) box.classList.add("hidden");
  const sel=S && S._questSel;
  if(!sel){ hide(); return; }
  let el=null;
  for(const s of sel.split(",")){
    const n=document.querySelector(s.trim());
    if(!n) continue;
    const r=n.getBoundingClientRect();
    const vis=r.width>2 && r.height>2 && r.bottom>60 && r.top<innerHeight-50 && getComputedStyle(n).display!=="none" && getComputedStyle(n).visibility!=="hidden";
    if(vis){ el=n; break; }
    if(!el) el=n;
  }
  if(!el){ hide(); return; }
  const r=el.getBoundingClientRect();
  if(r.width<2){ hide(); return; }
  p.classList.remove("hidden");
  p.style.left=(r.left+r.width/2)+"px";
  p.style.top=(r.bottom-6)+"px";
  if(ring){
    const pad=10;
    ring.classList.remove("hidden");
    ring.style.left=(r.left-pad)+"px";
    ring.style.top=(r.top-pad)+"px";
    ring.style.width=(r.width+pad*2)+"px";
    ring.style.height=(r.height+pad*2)+"px";
  }
}
function layoutCoach(){ placeToasts(); }

let _frameErrorAt=0;
function frame(ts){
  const dt=Math.min(0.08,(ts-lastTs)/1000||0.016);
  lastTs=ts;
  if(document.hidden){requestAnimationFrame(frame);return;}
  try{
    tick(dt);
    lastView+=dt;bubbleClock+=dt;labelClock+=dt;questClock+=dt;
    if(TAB==="station"&&lastView>=0.12){lastView=0;renderActors();}
    if(TAB==="station"&&bubbleClock>=0.25){bubbleClock=0;renderBubbles();placePointer();}
    if(TAB==="station"&&labelClock>=0.65){labelClock=0;renderLabels();}
    if(questClock>=0.35){
      questClock=0;const st=chainStep();
      if(st&&st.done&&!_questLock){try{if(st.done())completeQuest();}catch(e){console.warn(e);}}
    }
    acc+=dt;if(acc>2&&dirty){save();acc=0;}
  }catch(e){if(Date.now()-_frameErrorAt>10000){_frameErrorAt=Date.now();console.error("Game loop error:",e);toast("Игра восстановилась после ошибки");}}
  requestAnimationFrame(frame);
}
async function start(){
  const ld=$("#ldfill"), txt=$("#ldtxt");
  // Decode first screen only; additional portraits load when needed.
  const assets=[
    "assets/avatar.webp","apple-touch-icon.png",
    "assets/rooms/wing-start.webp","assets/rooms/wing-more.webp",
    "assets/sprites/car-police.webp","assets/sprites/civ-woman.webp",
    "assets/sprites/suspect-f.webp","assets/heroes/nika.webp",
    "assets/heroes/anna.webp","assets/sprites/anna.webp"
  ];
  let n=0;
  const set=()=>{n++; ld.style.width=Math.round(10+n/assets.length*90)+"%"; txt.textContent="Загрузка "+n+"/"+assets.length;};
  await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,1500))]);
  await Promise.all(assets.map(src=>new Promise(res=>{const i=new Image();let done=false;const finish=()=>{if(done)return;done=true;clearTimeout(timer);set();res();};const timer=setTimeout(finish,5000);i.onload=i.onerror=finish;i.src=src;})));
  const existed=load();
  document.documentElement.dataset.design="israel-gloss";
  AU.muted=!!S.muted;
  hud();
  spawnStaff();
  renderHotspots();
  renderLabels();
  renderActors();
  renderBubbles();

  const stage=$("#stage"), hint=$("#hint");
  const hideHint=()=>{ if(stage && stage.scrollTop>40 && hint) hint.classList.add("gone"); };
  const onUserBrowse=()=>{ markUserScroll(); hideHint(); };
  if(stage){
    stage.addEventListener("scroll", onUserBrowse, {passive:true});
    stage.addEventListener("touchstart", markUserScroll, {passive:true});
    stage.addEventListener("touchmove", markUserScroll, {passive:true});
    stage.addEventListener("wheel", markUserScroll, {passive:true});
    stage.addEventListener("pointerdown", ev=>{ if(ev.pointerType!=="mouse"||ev.buttons) markUserScroll(); }, {passive:true});
  }

  // On iOS a touch gesture can lose its synthesized click. Handle pointerup
  // and deduplicate the later click without stealing drags/scrolls.
  let tapStart=null,lastTapEl=null,lastTapAt=0;
  const activationTarget=ev=>{
    const t=ev.target?.nodeType===1?ev.target:ev.target?.parentElement;
    return t?.closest?.("[data-act]")||null;
  };
  document.body.addEventListener("pointerdown",ev=>{
    if(ev.pointerType==="touch"||ev.pointerType==="pen")tapStart={id:ev.pointerId,x:ev.clientX,y:ev.clientY};
  },true);
  document.body.addEventListener("pointercancel",()=>{tapStart=null;},true);
  const activate=ev=>{
    if(ev.type==="pointerup"){
      if(ev.pointerType==="mouse")return;
      const t=tapStart;tapStart=null;
      if(!t||t.id!==ev.pointerId||Math.hypot(ev.clientX-t.x,ev.clientY-t.y)>14)return;
    }
    const b=activationTarget(ev);
    if(!b||b.disabled)return;
    ev.preventDefault();
    const now=Date.now();
    if(b===lastTapEl&&now-lastTapAt<420)return;
    lastTapEl=b;lastTapAt=now;
    try{onAct(b.dataset.act,b.dataset.arg);}
    catch(e){console.error("Action failed:",b.dataset.act,e);toast("Не удалось выполнить действие — повторите");}
  };
  document.body.addEventListener("pointerup",activate,true);
  document.body.addEventListener("click",activate,true);
  const qb=$("#questbar");
  if(qb) qb.addEventListener("click", ev=>{ if(ev.target.closest("[data-act]")) return; ev.preventDefault(); followQuest(); });

  const md=$("#modal");
  if(md && !md.dataset.backdrop){
    md.dataset.backdrop="1";
    md.addEventListener("click", ev=>{ if(ev.target===md) closeModal(); });
  }
  const cn=$("#cinema");
  if(cn && !cn.dataset.backdrop){
    cn.dataset.backdrop="1";
    cn.addEventListener("click", ev=>{ if(ev.target===cn) closeCinema(); });
  }

  $("#loading").classList.add("hidden");
  $("#game").classList.remove("hidden");
  requestAnimationFrame(frame);

  syncQuestFromState();
  setTimeout(()=>{ showGuide(); }, 400);
  if(S.guideDone){
    setTimeout(()=>{ applyOffline(); maybeDaily(); }, 600);
  }

  document.addEventListener("visibilitychange",()=>{if(document.hidden) save();});
  window.addEventListener("pagehide",save);
}

start().catch(e=>{console.error(e);const t=$("#ldtxt");if(t)t.textContent="Ошибка загрузки · обновите страницу";});
window.__GAME=()=>({S,TAB,collectRoom,skipAll,openRoom,setTab,save,upgradeRoom,buy,closeModal,startWork,addRes,openInterrog,iqPick,assignHero,spawnStaff,giveHero,spawnCitizen,guideEvent,showGuide,followQuest,currentQuest,chainStep,syncQuestFromState,completeQuest,finishGuide,QUEST_CHAIN,scrollToRoom,markUserScroll,saveStageScroll,restoreStageScroll});

if("serviceWorker" in navigator){
  window.addEventListener("load",()=>{
    let refreshing=false;
    navigator.serviceWorker.addEventListener("controllerchange",()=>{
      if(refreshing) return; refreshing=true; if(S) save(); location.reload();
    });
    navigator.serviceWorker.register("sw.js?v=13").then(reg=>{
      setInterval(()=>reg.update(), 60*1000);
      reg.addEventListener("updatefound",()=>{
        const w=reg.installing;
        if(!w) return;
        w.addEventListener("statechange",()=>{
          if(w.state==="installed" && navigator.serviceWorker.controller){
            w.postMessage({type:"SKIP"});
          }
        });
      });
    });
  });
}
