/* Шеф полиции: Участок — данные */
const RAR = {
  rare:   {name:"Редкая",       color:"#7ec8ff"},
  epic:   {name:"Эпическая",    color:"#d8a0ff"},
  legend: {name:"Легендарная",  color:"#f0c75e"}
};

const HEROES = {
  anna:     {id:"anna",     name:"Анна",     role:"Дежурная",     room:"reception", rarity:"rare",   suit:"navy",  cap:true,  hair:"#7a4a28", skin:"#e0b090", style:"ponytail", bonus:{speed:0.18}, blurb:"Приветливо встречает жителей и быстро оформляет заявления."},
  marina:   {id:"marina",   name:"Марина",   role:"Детектив",      room:"detective", rarity:"epic",   suit:"navy",  cap:false, hair:"#1a1a1a", skin:"#d4a07c", style:"bun",      bonus:{speed:0.22}, blurb:"Видит связи в деле с первого взгляда. Ордера готовы раньше срока."},
  olga:     {id:"olga",     name:"Ольга",    role:"Надзиратель",   room:"cells",     rarity:"rare",   suit:"navy",  cap:false, hair:"#d4b06a", skin:"#e8c4a0", style:"short",    bonus:{income:0.20}, blurb:"Держит камеры в порядке и снижает риск бунта."},
  darya:    {id:"darya",    name:"Дарья",    role:"Патрульная",    room:"garage",    rarity:"rare",   suit:"navy",  cap:true,  hair:"#c4491a", skin:"#f0c4a8", style:"wavy",     bonus:{speed:0.16}, blurb:"Любит руль и сирену. Патруль возвращается быстрее."},
  elena:    {id:"elena",    name:"Елена",    role:"Шеф",           room:"chief",     rarity:"legend", suit:"navy",  cap:false, hair:"#5a3020", skin:"#d4a07c", style:"wavy",     bonus:{global:0.12}, blurb:"Руководит участком. Повышает доход и скорость всех комнат."},
  irina:    {id:"irina",    name:"Ирина",    role:"Оружейник",     room:"armory",    rarity:"epic",   suit:"navy",  cap:false, hair:"#1a1010", skin:"#6a3a24", style:"braids",   bonus:{prod:0.25},  blurb:"Снаряжает отдел. Оружейная выдаёт больше патронов."},
  victoria: {id:"victoria", name:"Виктория", role:"Следователь",   room:"detective", rarity:"epic",   suit:"shiny", cap:true,  hair:"#0a0a0a", skin:"#f0d0c0", style:"long",     bonus:{speed:0.24}, blurb:"Холодный ум и безупречный стиль. Расследования идут как по маслу."},
  katya:    {id:"katya",    name:"Катя",     role:"Дознаватель",   room:"interrog",  rarity:"epic",   suit:"shiny", cap:false, hair:"#e8c878", skin:"#f0d0b8", style:"ponytail", bonus:{sat:0.25},   blurb:"Умеет и припугнуть, и уговорить. Допросы дают больше удовлетворённости."},
  sofia:    {id:"sofia",    name:"София",    role:"Патруль",       room:"garage",    rarity:"rare",   suit:"shiny", cap:true,  hair:"#a33018", skin:"#e8b898", style:"wavy",     bonus:{speed:0.18}, blurb:"На глянцевом мотоцикле успевает туда, где нужна помощь."},
  alina:    {id:"alina",    name:"Алина",    role:"Пресс-секретарь",room:"press",    rarity:"epic",   suit:"shiny", cap:false, hair:"#e8e0d0", skin:"#f0d8c8", style:"bob",      bonus:{orders:0.2}, blurb:"Голос участка. Приказы шефа действуют сильнее."},
  natalya:  {id:"natalya",  name:"Наталья",  role:"Механик",       room:"garage",    rarity:"rare",   suit:"shiny", cap:false, hair:"#1a1010", skin:"#c48a5a", style:"curly",    bonus:{gas:0.2},    blurb:"Машины после неё не подводят, а бензин расходуется бережнее."},
  polina:   {id:"polina",   name:"Полина",   role:"Командир",      room:"any",       rarity:"legend", suit:"shiny", cap:true,  hair:"#c43818", skin:"#f0d0b8", style:"wavy",     bonus:{global:0.18,speed:0.10}, gold:true, blurb:"Легенда отдела. Куда ни поставьте — участок работает лучше."}
};

const HERO_ORDER = ["anna","marina","olga","darya","elena","irina","victoria","katya","sofia","alina","natalya","polina"];

const ROOMS = {
  reception:  {id:"reception",  name:"Приёмная",           short:"Заявления",  kind:"chain",     unlock:1, gx:0,  gy:0,  gw:8, gh:7,  next:"detective",  inKey:null,        outKey:"docs",      baseTime:5.8, baseCap:8,  color:"#3d7ac7"},
  detective:  {id:"detective",  name:"Кабинет детектива",  short:"Расследование",kind:"chain",   unlock:1, gx:8,  gy:0,  gw:7, gh:7,  next:"garage",     inKey:"docs",       outKey:"warrants",  baseTime:6.2, baseCap:8,  color:"#3a6a9a"},
  cells:      {id:"cells",      name:"Камеры",             short:"Заключённые",kind:"holding",   unlock:1, gx:0,  gy:7,  gw:8, gh:6,  next:null,         inKey:"inmates",    outKey:"cash",      baseTime:4.0, baseCap:4,  color:"#4a5568", income:3},
  interrog:   {id:"interrog",   name:"Допросная",          short:"Допрос",     kind:"interrog",  unlock:1, gx:8,  gy:7,  gw:7, gh:6,  next:"cells",      inKey:"suspects",   outKey:"inmates",   baseTime:6.0, baseCap:5,  color:"#3a3a55"},
  garage:     {id:"garage",     name:"Гараж",              short:"Патруль",    kind:"patrol",    unlock:1, gx:0,  gy:13, gw:8, gh:7,  next:"interrog",   inKey:"warrants",   outKey:"suspects",  baseTime:7.0, baseCap:4,  color:"#4a6a88", need:"gas", needAmt:1},
  chief:      {id:"chief",      name:"Кабинет шефа",       short:"Шеф",        kind:"chief",     unlock:1, gx:17, gy:0,  gw:7, gh:7,  next:null,         inKey:null,        outKey:null,       baseTime:0,   baseCap:0,  color:"#3a5a8a"},
  armory:     {id:"armory",     name:"Оружейная",          short:"Патроны",    kind:"resource",  unlock:2, gx:17, gy:7,  gw:7, gh:6,  next:null,         inKey:null,        outKey:"ammo",      baseTime:6.5, baseCap:20, color:"#4a4a5a", prod:"ammo",  prodAmt:3},
  electric:   {id:"electric",   name:"Электрощитовая",     short:"Электричество",kind:"resource",unlock:3, gx:17, gy:13, gw:7, gh:7,  next:null,         inKey:null,        outKey:"elec",      baseTime:6.5, baseCap:20, color:"#3a5a4a", prod:"elec",  prodAmt:3},
  suggest:    {id:"suggest",    name:"Ящик предложений",   short:"Предложения",kind:"mailbox",   unlock:3, gx:17, gy:20, gw:7, gh:6,  next:null,         inKey:null,        outKey:null,       baseTime:0,   baseCap:0,  color:"#5a4a3a"},
  gasstation: {id:"gasstation", name:"Заправка",           short:"Бензин",     kind:"resource",  unlock:5, gx:17, gy:26, gw:7, gh:6,  next:null,         inKey:null,        outKey:"gas",       baseTime:6.5, baseCap:20, color:"#5a6a3a", prod:"gas",   prodAmt:3},
  press:      {id:"press",      name:"Пресс-центр",        short:"Приказы",    kind:"orders",    unlock:6, gx:24, gy:13, gw:8, gh:13,  next:null,         inKey:null,        outKey:null,       baseTime:0,   baseCap:0,  color:"#3a4a7a"}
};
const ROOM_ORDER = ["reception","detective","interrog","cells","garage","chief","armory","electric","suggest","gasstation","press"];

const UNLOCK_HINT = {
  2:"Оружейная",
  3:"Электрощитовая и ящик предложений",
  5:"Заправка",
  6:"Пресс-центр и приказы шефа"
};

const ORDERS = [
  {id:"o1", name:"Двойной доход",    icon:"💰", desc:"Камеры приносят вдвое больше денег."},
  {id:"o2", name:"Быстрый приём",    icon:"📝", desc:"Приёмная работает вдвое быстрее."},
  {id:"o3", name:"Полный бак",       icon:"⛽", desc:"Сразу +500 бензина."},
  {id:"o4", name:"Арсенал",          icon:"🔫", desc:"Сразу +500 патронов."},
  {id:"o5", name:"Мотивация",        icon:"⚡", desc:"Все комнаты работают вдвое быстрее."},
  {id:"o6", name:"Срочный набор",    icon:"⭐", desc:"Сразу получаете легендарную героиню."}
];

const TASKS = [
  {id:"t1", name:"Принять 10 заявлений",      key:"docs",      need:10,   rew:{cash:800, diamonds:20}},
  {id:"t2", name:"Расследовать 5 дел",        key:"warrants",  need:5,    rew:{cash:1000, diamonds:25}},
  {id:"t3", name:"Отправить 3 патруля",       key:"patrols",   need:3,    rew:{gas:30, diamonds:20}},
  {id:"t4", name:"Провести 3 допроса",        key:"interrogs", need:3,    rew:{cash:1200, diamonds:25}},
  {id:"t5", name:"Собрать 5 000 ₽",           key:"cashGot",   need:5000, rew:{cash:2000, diamonds:40}},
  {id:"t6", name:"Улучшить любую комнату",    key:"upgrades",  need:1,    rew:{cash:1500, diamonds:30}},
  {id:"t7", name:"Нанять или улучшить героиню",key:"heroActs", need:1,    rew:{diamonds:50}},
  {id:"t8", name:"Заглянуть в магазин",       key:"shopVisits",need:1,    rew:{cash:1000, diamonds:20}}
];

const SHOP = [
  {cat:"Алмазы", items:[
    {id:"d500",  icon:"💎", name:"Горсть алмазов",    sub:"500 алмазов",           give:{diamonds:500}},
    {id:"d2500", icon:"💎", name:"Мешок алмазов",     sub:"2 500 алмазов",         give:{diamonds:2500}},
    {id:"d10k",  icon:"💎", name:"Сундук алмазов",    sub:"10 000 алмазов",        give:{diamonds:10000}},
    {id:"d50k",  icon:"💎", name:"Хранилище алмазов", sub:"50 000 алмазов",        give:{diamonds:50000}}
  ]},
  {cat:"Ресурсы участка", items:[
    {id:"c1", icon:"💰", name:"Пачка денег",     sub:"+10 000 ₽",     give:{cash:10000}},
    {id:"c2", icon:"💰", name:"Сейф денег",      sub:"+50 000 ₽",     give:{cash:50000}},
    {id:"c3", icon:"💰", name:"Резерв участка",  sub:"+200 000 ₽",    give:{cash:200000}},
    {id:"g1", icon:"⛽", name:"Канистры бензина", sub:"+200 бензина",  give:{gas:200}},
    {id:"a1", icon:"🔫", name:"Ящик патронов",    sub:"+200 патронов", give:{ammo:200}},
    {id:"e1", icon:"⚡", name:"Запас энергии",    sub:"+200 электричества", give:{elec:200}}
  ]},
  {cat:"Фонд, пропуска и VIP", items:[
    {id:"fund",   icon:"📈", name:"Фонд роста",           sub:"+50% к доходу камер навсегда", special:"fund"},
    {id:"pass",  icon:"🎫", name:"Ежемесячный пропуск",  sub:"Все 30 ежедневных наград сразу и +20% скорости", special:"pass"},
    {id:"vip",   icon:"👑", name:"VIP-пакет",            sub:"Повышает VIP на 1 уровень и даёт набор наград", special:"vip"},
    {id:"queue", icon:"🏗️", name:"Вторая очередь стройки",sub:"Комнаты обрабатывают по два дела сразу", special:"queue"}
  ]},
  {cat:"Ускорения", items:[
    {id:"skip1", icon:"⏩", name:"Ускорить всё",          sub:"Мгновенно завершает все текущие дела", special:"skip"},
    {id:"boost", icon:"⚡", name:"Заряд скорости",        sub:"Все комнаты ×3 скорость (включается сразу и навсегда)", special:"boost"}
  ]},
  {cat:"Наборы героинь", items:[
    {id:"h1",  icon:"⭐", name:"Обычный набор",      sub:"1 случайная героиня",           special:"gacha", arg:"1"},
    {id:"h10", icon:"🌟", name:"Набор из 10",        sub:"10 героинь, шанс эпической выше", special:"gacha", arg:"10"},
    {id:"he",  icon:"💜", name:"Эпический набор",    sub:"Гарантированно эпическая или лучше", special:"gacha", arg:"epic"},
    {id:"hl",  icon:"🏆", name:"Легендарный набор",  sub:"Гарантированно легендарная героиня", special:"gacha", arg:"legend"}
  ]}
];

function fmt(n){
  n = Math.floor(+n||0);
  if(n>=1e6) return (n/1e6).toFixed(n%1e6===0?0:1).replace(/\.0$/,"")+" млн";
  if(n>=10000) return Math.floor(n/1000)+" тыс.";
  return n.toLocaleString("ru-RU");
}
function roomCost(id, lv){ return Math.floor((ROOMS[id].kind==="chief"?800:180) * Math.pow(1.55, Math.max(0,lv-1))); }
function chiefCost(lv){ return {cash:Math.floor(1500*Math.pow(1.8,lv-1)), diamonds:40*lv}; }
function heroCost(lv){ return Math.floor(400*Math.pow(1.4, lv-1)); }
function roomSpeed(id, S){
  const d = ROOMS[id], r = S.rooms[id];
  let t = d.baseTime / (1 + (r.level-1)*0.12);
  const hid = r.hero, h = hid && S.heroes[hid];
  if(h && h.owned){
    const def = HEROES[hid];
    const mul = 1 + heroPower(hid,S)*((def.bonus.speed||0)+(def.bonus.global||0));
    t /= mul;
  }
  if(S.buffs.motivation || S.buffs.boost) t /= 2;
  if(S.buffs.boost) t /= 1.5;
  if(S.pass) t /= 1.2;
  if(id==="reception" && S.buffs.fastRec) t /= 2;
  if(S.vip) t /= (1+S.vip*0.03);
  return Math.max(0.35, t);
}
function roomCap(id, S){
  const d = ROOMS[id], r = S.rooms[id];
  let c = d.baseCap + (r.level-1)*(d.kind==="holding"?1:2);
  if(S.secondQueue && d.kind!=="holding") c += 2;
  return c;
}
function heroPower(id,S){
  const h = S.heroes[id];
  return (1+(h.level-1)*0.02) * (1+(h.stars||0)*0.15);
}
function incomeMul(S){
  let m = 1;
  if(S.fund) m += 0.5;
  if(S.buffs.doubleCash) m += 1;
  if(S.vip) m += S.vip*0.05;
  const hid = S.rooms.cells.hero;
  if(hid && S.heroes[hid]?.owned){
    const def=HEROES[hid];
    m *= 1 + heroPower(hid,S)*((def.bonus.income||0)+(def.bonus.global||0));
  }
  // global heroes in other rooms
  for(const id of HERO_ORDER){
    const h=S.heroes[id], def=HEROES[id];
    if(h.owned && def.bonus.global && S.rooms[h.assigned]?.hero===id && id!==hid){
      m *= 1+heroPower(id,S)*def.bonus.global*0.5;
    }
  }
  return m;
}
function todayKey(){
  const d=new Date();
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}

function defaultState(){
  const rooms={};
  for(const id of ROOM_ORDER){
    rooms[id]={level:1, hero:null, in:0, out:0, prog:0, work:false, pending:0};
  }
  rooms.reception.hero="anna";
  const heroes={};
  for(const id of HERO_ORDER) heroes[id]={owned:false, level:1, stars:0, assigned:null, frags:0};
  heroes.anna={owned:true, level:1, stars:0, assigned:"reception", frags:0};
  return {
    cash:2500, gas:40, ammo:25, elec:30, diamonds:150, sat:10,
    chiefLv:1, vip:0, fund:false, pass:false, secondQueue:false,
    buffs:{doubleCash:false, fastRec:false, motivation:false, boost:false},
    rooms, heroes,
    inmates:[], // {t, rate}
    riot:false, riotTimer:0,
    stats:{docs:0,warrants:0,patrols:0,interrogs:0,cashGot:0,upgrades:0,heroActs:0,shopVisits:0},
    tasks:{day:todayKey(), prog:{}, claimed:{}},
    suggestReady:true,
    lastSave:Date.now(),
    muted:false, tut:0,
    people:[], // visual actors filled at runtime, not saved deeply
    car:{state:"idle", t:0},
    bubbles:[]
  };
}

/* Раскладка комнат: проценты от своего крыла (1 = верхнее, 2 = нижнее) */
const LAYOUT = {
  reception:  {wing:1, l:3,  t:8,  w:50, h:37, lx:27, ly:11, ax:22, ay:34, px:14, py:40},
  detective:  {wing:1, l:51, t:7,  w:46, h:30, lx:74, ly:10, ax:64, ay:34},
  interrog:   {wing:1, l:50, t:36, w:48, h:26, lx:82, ly:36, ax:62, ay:56},
  cells:      {wing:1, l:3,  t:47, w:48, h:32, lx:24, ly:51, ax:24, ay:68},
  garage:     {wing:1, l:48, t:60, w:50, h:36, lx:74, ly:63, ax:72, ay:82, ox:88, oy:96},
  chief:      {wing:2, l:3,  t:6,  w:47, h:30, lx:26, ly:9,  ax:28, ay:28},
  armory:     {wing:2, l:51, t:6,  w:46, h:30, lx:74, ly:9,  ax:72, ay:28},
  electric:   {wing:2, l:3,  t:36, w:47, h:26, lx:26, ly:39, ax:24, ay:52},
  suggest:    {wing:2, l:51, t:36, w:46, h:26, lx:74, ly:39, ax:74, ay:52},
  gasstation: {wing:2, l:3,  t:62, w:47, h:34, lx:26, ly:65, ax:26, ay:82},
  press:      {wing:2, l:51, t:62, w:46, h:34, lx:74, ly:65, ax:74, ay:82}
};
// точки входа граждан (доля крыла 1)
const ENTRANCE = {x:8, y:36};

const SAY = {
  citizen:["Помогите, пожалуйста!","Нужно заявление!","У меня пропала сумка!","Сосед шумит всю ночь!","Украли велосипед!","Что-то подозрительное у дома…"],
  staff:["Сейчас оформлю.","Документы готовы!","Ордер подписан.","Выезжаем!","Сейчас разберёмся.","Порядок будет."],
  suspect:["Это не я!","Я всё расскажу!","Подождите!","Я просто проходил мимо.","Не надо в камеру!"],
  inmate:["Тихо тут…","Когда обед?","Я больше не буду."],
  iqOpen:["Это не я, клянусь!","Я просто проходил мимо.","У вас ничего на меня нет.","Давайте поговорим спокойно."],
  iqScare:["Ладно, ладно, я скажу!","Только не кричите…","Хорошо, это был я."],
  iqTalk:["Спасибо, что выслушали.","Я расскажу, как всё было.","Вы добры… вот правда."]
};

const IQ_CLUES = [
  "Заметка: избегает взгляда, руки дрожат.",
  "Заметка: путается в показаниях.",
  "Заметка: похоже, готов говорить за доброе слово.",
  "Заметка: держится вызывающе, но волнуется.",
  "Заметка: в деле есть улика с места."
];

const SPAWN_MIN=10, SPAWN_MAX=14, QUEUE_MAX=3, AUTO_SEND=14;
