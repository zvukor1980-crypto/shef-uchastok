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
  {id:"t5", name:"Собрать 5 000 ₪",           key:"cashGot",   need:5000, rew:{cash:2000, diamonds:40}},
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
    {id:"c1", icon:"💰", name:"Пачка денег",     sub:"+10 000 ₪",     give:{cash:10000}},
    {id:"c2", icon:"💰", name:"Сейф денег",      sub:"+50 000 ₪",     give:{cash:50000}},
    {id:"c3", icon:"💰", name:"Резерв участка",  sub:"+200 000 ₪",    give:{cash:200000}},
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
  rooms.reception.hero=null;
  const heroes={};
  for(const id of HERO_ORDER) heroes[id]={owned:false, level:1, stars:0, assigned:null, frags:0, outfit:"patrol"};
  heroes.anna={owned:true, level:1, stars:0, assigned:null, frags:0, outfit:"patrol"};
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
  reception:  {wing:1, l:4,  t:22, w:44, h:22, lx:26, ly:32, ax:22, ay:40, px:14, py:38},
  detective:  {wing:1, l:52, t:22, w:44, h:22, lx:74, ly:32, ax:74, ay:40},
  interrog:   {wing:1, l:4,  t:48, w:44, h:20, lx:26, ly:56, ax:20, ay:64},
  cells:      {wing:1, l:52, t:48, w:44, h:20, lx:74, ly:56, ax:76, ay:64},
  garage:     {wing:1, l:8,  t:72, w:84, h:24, lx:50, ly:80, ax:38, ay:90, ox:90, oy:94},
  chief:      {wing:2, l:4,  t:16, w:44, h:24, lx:26, ly:28, ax:24, ay:36},
  armory:     {wing:2, l:52, t:16, w:44, h:24, lx:74, ly:28, ax:74, ay:36},
  electric:   {wing:2, l:4,  t:44, w:44, h:22, lx:26, ly:54, ax:24, ay:62},
  suggest:    {wing:2, l:52, t:44, w:44, h:22, lx:74, ly:54, ax:74, ay:62},
  gasstation: {wing:2, l:4,  t:70, w:44, h:26, lx:26, ly:82, ax:24, ay:90},
  press:      {wing:2, l:52, t:70, w:44, h:26, lx:74, ly:82, ax:74, ay:90}
};
// вход посетительниц (доля крыла 1)
const ENTRANCE = {x:6, y:42};

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

const OUTFIT_COLORS = [
  {id:"black",  name:"Чёрная",  css:"#111"},
  {id:"red",    name:"Красная", css:"#9b1b2e"},
  {id:"purple", name:"Фиолетовая", css:"#6b21a8"},
  {id:"white",  name:"Белая",   css:"#e8e8f0"}
];

const OUTFIT_STYLES = [
  {id:"patrol", name:"Патрульная", minLevel:1, blurb:"Повседневная форма участка"},
  {id:"parade", name:"Парадная", minLevel:3, blurb:"Золотой кант, галстук, медали"},
  {id:"detective", name:"Детективная", minLevel:6, blurb:"Пиджак следовательницы без фуражки"},
  {id:"tactical", name:"Тактическая", minLevel:8, blurb:"Жилет, ботинки, полевой комплект"},
  {id:"elite", name:"Элитный лак", minLevel:10, blurb:"Сапфирово-золотой парадный блеск"}
];
const STYLE_LEGACY = {black:"patrol", red:"parade", purple:"detective", white:"elite"};
function normalizeStyle(outfit){
  const s = STYLE_LEGACY[outfit] || outfit || "patrol";
  return OUTFIT_STYLES.some(x => x.id === s) ? s : "patrol";
}
function stylesUnlocked(level){
  const lv = Math.max(1, level|0);
  return OUTFIT_STYLES.filter(s => lv >= s.minLevel);
}
function bestStyle(level){
  const u = stylesUnlocked(level);
  return u[u.length - 1].id;
}
function heroSprite(id, outfit){
  return "assets/cast/" + id + "/" + normalizeStyle(outfit) + ".webp";
}
function roomDecorTier(level){
  const lv = Math.max(1, level|0);
  const tier = lv >= 10 ? 5 : lv >= 7 ? 4 : lv >= 4 ? 3 : lv >= 2 ? 2 : 1;
  return {
    level: lv,
    tier,
    marble: lv >= 2,
    brass: lv >= 2,
    gold: lv >= 4,
    rug: lv >= 5,
    glass: lv >= 6,
    medallion: lv >= 5,
    chandelier: lv >= 7,
    columns: lv >= 10 ? 2 : lv >= 8 ? 1 : 0,
    lacquer: lv >= 10,
    plants: Math.min(4, Math.floor(lv / 2)),
    monitors: 1 + Math.floor((lv - 1) / 3),
    lamps: 1 + Math.floor(lv / 3),
    gloss: Math.min(0.72, 0.16 + lv * 0.055),
    name: lv >= 10 ? "Сапфировый лак" : lv >= 7 ? "Золотой люкс" : lv >= 4 ? "Мрамор и золото" : lv >= 2 ? "Лаковый ремонт" : "Иерусалимский камень"
  };
}
const ROOM_SIGNS = {
  reception: {en:"RECEPTION HALL", he:"אולם קבלה"},
  detective: {en:"DETECTIVE OFFICE", he:"משרד בילוש"},
  interrog: {en:"INTERROGATION", he:"חדר חקירות"},
  cells: {en:"HOLDING CELLS", he:"תאי מעצר"},
  garage: {en:"PATROL GARAGE", he:"מוסך סיור"},
  chief: {en:"CHIEF", he:"לשכת המפקדת"},
  armory: {en:"ARMORY", he:"נשקייה"},
  electric: {en:"POWER", he:"חדר חשמל"},
  suggest: {en:"IDEAS", he:"תיבת רעיונות"},
  gasstation: {en:"FUEL", he:"תחנת דלק"},
  press: {en:"PRESS", he:"דוברות"}
};
const CIV_WOMEN = ["yael","noa","miriam","liora"];
const SUS_WOMEN = ["roni","shira"];
const BOSS_WOMAN = "maya";
const FACES = {
  anna:"оливковая кожа, каштановый хвост, карие глаза",
  marina:"светлая кожа, чёрный пучок, острые скулы",
  olga:"золотистое каре, зелёно-голубые глаза",
  darya:"веснушки, медные волны, зелёные глаза",
  elena:"серебряная прядь, властный овал",
  irina:"тёмная кожа, коробчатые косы",
  victoria:"фарфор, прямые чёрные волосы, серые глаза",
  katya:"медовый хвост, янтарные глаза",
  sofia:"средиземноморская олива, тёмно-рыжие волны",
  alina:"платиновое каре, ледяные голубые глаза",
  natalya:"загар, тёмные кудри, тёплые глаза",
  polina:"медные волны, веснушки, зелёные глаза"
};
for(const _id of HERO_ORDER){
  HEROES[_id].gender = "f";
  HEROES[_id].face = FACES[_id];
}

const CASES = [
  {id:"bag",title:"Сумочка на Кармеле",story:"У жительницы Хайфы возле киоска пропала яркая сумочка.",civ:"yael",suspect:"roni",line:"Я только подняла её, чтобы найти хозяйку!"},
  {id:"scooter",title:"Самокат на набережной",story:"На набережной Бат-Галим пропал электросамокат.",civ:"yael",suspect:"roni",line:"Я собиралась вернуть его у следующего кафе!"},
  {id:"graf",title:"Граффити у участка",story:"Возле участка появилось огромное фиолетовое граффити.",civ:"yael",suspect:"roni",line:"Это искусство, я просто хотела добавить красок!"},
  {id:"cat",title:"Кошка Мика пропала",story:"Кошка Мика не вернулась домой с прогулки по Хайфе.",civ:"yael",suspect:"roni",line:"Она сама забежала в подъезд, я помогла ей!"},
  {id:"noise",title:"Караоке до утра",story:"Соседка устроила громкое караоке после полуночи.",civ:"yael",suspect:"roni",line:"Я не знала, что музыка слышна во всём доме!"},
  {id:"wallet",title:"Кошелёк на рынке",story:"На рынке Вади-Ниснас пропал кошелёк между прилавками.",civ:"yael",suspect:"roni",line:"Я хотела отнести его в бюро находок!"},
  {id:"cake",title:"Спор из-за торта",story:"Две покупательницы не поделили последний торт в пекарне.",civ:"yael",suspect:"roni",line:"Я стояла в очереди первой!"},
  {id:"bike",title:"Велосипед «на минутку»",story:"Велосипед одолжили «на минутку», но он не вернулся.",civ:"yael",suspect:"roni",line:"Цепь слетела, я чинила его весь вечер."},
  {id:"boss",title:"Большое дело",story:"В Иерусалиме объявилась известная нарушительница. Особое дело!",civ:"liora",suspect:"maya",boss:true,line:"У вас против меня только догадки!"}
];
const ACHIEVES = [
  {id:"a1", name:"Первое дело",        desc:"Закройте первый допрос",           key:"interrogs", need:1,  rew:{diamonds:40, cash:500}},
  {id:"a2", name:"Следователь",        desc:"Закройте 5 дел",                   key:"interrogs", need:5,  rew:{diamonds:80, cash:2000}},
  {id:"a3", name:"Быстрый шеф",        desc:"Соберите серию из 3 дел подряд",   key:"maxCombo",  need:3,  rew:{diamonds:60}},
  {id:"a4", name:"Команда мечты",      desc:"Назначьте 3 героинь за столы",     key:"assigns",   need:3,  rew:{diamonds:70}},
  {id:"a5", name:"Уютный участок",     desc:"Улучшите комнаты 5 раз",           key:"upgrades",  need:5,  rew:{cash:3000, diamonds:50}},
  {id:"a6", name:"Щедрая касса",       desc:"Соберите 10 000 ₪",                key:"cashGot",   need:10000, rew:{diamonds:80}},
  {id:"a7", name:"Звезда отдела",      desc:"Наберите любую героиню",           key:"heroActs",  need:1,  rew:{diamonds:50}},
  {id:"a8", name:"Особый улов",        desc:"Поймайте особо опасную",          key:"bosses",    need:1,  rew:{diamonds:120, cash:4000}}
];

const VIP_LINES = ["Инспекция с подарком!","Знаменитость заглянула в участок!","Тайный благотворитель."];

const SAY_START = ["Приступаю, шеф!","За стол, как приказали!","Я на месте.","Можно начинать!"];
