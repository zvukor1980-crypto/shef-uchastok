const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const dummy={classList:{add(){},remove(){},toggle(){},contains(){return true}},style:{},dataset:{},getBoundingClientRect(){return {left:0,top:0,width:1,bottom:0}},querySelector(){return dummy},querySelectorAll(){return []}};
let timers=[];
const ctx=vm.createContext({console,Date,Math,JSON,Set,localStorage:{getItem(){return null},setItem(){}},document:{querySelector(){return dummy},querySelectorAll(){return []},body:dummy},window:{addEventListener(){}},navigator:{},setTimeout(fn){timers.push(fn);return timers.length},clearTimeout(){},requestAnimationFrame(){},innerWidth:390,innerHeight:844});
vm.runInContext(fs.readFileSync('data.js','utf8'),ctx);
let code=fs.readFileSync('game.js','utf8').replace(/start\(\)\.catch\([^\n]+\);/,'');
vm.runInContext(code,ctx);
function run(s){return vm.runInContext(s,ctx)}
run(`hud=()=>{};placePointer=()=>{};showNikaTip=()=>{};coinBurst=()=>{};confetti=()=>{};toast=()=>{};enterQuest=()=>{};renderActors=()=>{};renderBubbles=()=>{};renderLabels=()=>{};S=defaultState();S.achieves={}; S.questFlags={};S.questIdx=0;S.guideDone=false;S.actors=[];S.car={state:'idle'};`);
function flush(){const t=timers;timers=[];t.forEach(f=>f())}
// Reproduce consumed prerequisite: an earlier suspect no longer waits in interrogation.
run(`S.questIdx=9;S.rooms.interrog.in=0;S.stats.interrogs=1;syncQuestFromState()`);
assert.equal(run('S.questIdx'),9,'must not rewind after interrogation');
run(`S.guideDone=true;syncQuestFromState()`);assert.equal(run('S.guideDone'),true,'skip survives restart');
run(`S=defaultState();S.achieves={};S.questIdx=0;S.questFlags={};S.guideDone=false;S.actors=[];S.car={state:'idle'};`);
// Traverse real completion conditions for every step, consuming earlier inputs.
const states=[`S.rooms.reception.hero='anna'`,`S.stats.docs=1;S.rooms.reception.out=1`,`S.rooms.reception.out=0;S.rooms.detective.in=1`,`S.rooms.detective.hero='marina'`,`S.rooms.detective.in=0;S.rooms.garage.in=1`,`S.stats.patrols=1;S.car.state='out'`,`S.car.state='idle';S.rooms.garage.out=1`,`S.rooms.garage.out=0;S.rooms.interrog.in=1`,`S.rooms.interrog.in=0;S.stats.interrogs=1`,`S.rooms.cells.in=1`,`S.questFlags.income=true`,`S.stats.upgrades=1`,`S.stats.shopVisits=1`,`S.chiefLv=2`];
for(let i=0;i<states.length;i++){run(states[i]);run('completeQuest()');flush();assert.equal(run('S.questIdx'),i+1,`step ${i+1}`);run('syncQuestFromState()');assert.equal(run('S.questIdx'),i+1,'reload keeps progress');}
assert.equal(run('S.guideDone'),true);
const cash=run('S.cash');run('updateQuest();completeQuest()');assert.equal(run('S.cash'),cash,'no repeat reward');
// Opening a room cannot complete the statement step without a finished document.
run(`S=defaultState();S.achieves={};S.questIdx=1;S.questFlags={completed:{'seat-rec':true}};S.guideDone=false;guideEvent('open:reception')`);flush();assert.equal(run('S.questIdx'),1);
// Help opens the destination, not only a scroll animation.
run(`let opened='';closeNikaTip=closeModal=closeIq=closeCinema=()=>{};setTab=t=>{TAB=t};scrollToRoom=()=>{};cancelAutoScroll=()=>{};openRoom=id=>{opened=id};followQuest()`);assert.equal(run('opened'),'reception');
console.log('PASS: 14 quest steps, consumed prerequisites, reload/skip, reward once, false event, direct navigation');
