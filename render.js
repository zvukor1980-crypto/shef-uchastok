/* Запасной холст, страница его не подключает.
   Участок на экране собирает game.js из assets/rooms и assets/sprites.
   Не добавляйте этот файл в index.html: схематичные фигурки заменят готовые портреты. */
const TW=56, TH=28, WH=48;

function iso(x,y,z=0){return {x:(x-y)*TW/2, y:(x+y)*TH/2 - z};}
function invIso(sx,sy){
  const wx=(sx/(TW/2)+sy/(TH/2))/2;
  const wy=(sy/(TH/2)-sx/(TW/2))/2;
  return {x:wx,y:wy};
}
function shade(hex, k){
  const n=parseInt(hex.slice(1),16);
  let r=(n>>16)&255,g=(n>>8)&255,b=n&255;
  r=Math.max(0,Math.min(255,r*k+ (k>1?20:0)));
  g=Math.max(0,Math.min(255,g*k+ (k>1?20:0)));
  b=Math.max(0,Math.min(255,b*k+ (k>1?20:0)));
  return `rgb(${r|0},${g|0},${b|0})`;
}
function pth(ctx,pts){
  ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);
  for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i].x,pts[i].y);
  ctx.closePath();
}
function qfill(ctx,pts,fill,stroke,lw){
  pth(ctx,pts);ctx.fillStyle=fill;ctx.fill();
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw||0.7;ctx.stroke();}
}

function box(ctx,x,y,w,d,h,col,opts){
  const top=iso(x,y,h), t2=iso(x+w,y,h), t3=iso(x+w,y+d,h), t4=iso(x,y+d,h);
  const b2=iso(x+w,y,0), b3=iso(x+w,y+d,0), b4=iso(x,y+d,0);
  const L=shade(col,0.72), R=shade(col,0.88), T=shade(col,1.12);
  qfill(ctx,[iso(x,y+d,h),t3,b3,b4],L,shade(col,0.55));
  qfill(ctx,[t2,t3,b3,b2],R,shade(col,0.7));
  qfill(ctx,[top,t2,t3,t4],T,shade(col,0.95));
  if(opts&&opts.top) qfill(ctx,[top,t2,t3,t4],opts.top);
}

function cyl(ctx,x,y,r,h,col){
  const t=iso(x,y,h), b=iso(x,y,0);
  const rx=r*TW/2, ry=r*TH/2;
  ctx.beginPath();ctx.moveTo(t.x-rx,t.y);ctx.lineTo(b.x-rx,b.y);
  ctx.ellipse(b.x,b.y,rx,ry,0,Math.PI,0,true);ctx.lineTo(t.x+rx,t.y);
  ctx.ellipse(t.x,t.y,rx,ry,0,0,Math.PI,true);
  ctx.fillStyle=shade(col,0.85);ctx.fill();
  ctx.beginPath();ctx.ellipse(t.x,t.y,rx,ry,0,0,Math.PI*2);
  ctx.fillStyle=shade(col,1.15);ctx.fill();
}

const Render = (()=>{
  let cv, ctx, W, H, dpr=1;
  let cache=null, cacheKey="", cacheOff={x:0,y:0};
  const CACHE_PAD=80;

  function init(canvas){cv=canvas;ctx=cv.getContext("2d");resize();}
  function resize(){
    const r=cv.parentElement.getBoundingClientRect();
    dpr=Math.min(2, window.devicePixelRatio||1);
    W=r.width; H=r.height;
    cv.width=Math.max(1,W*dpr); cv.height=Math.max(1,H*dpr);
    cv.style.width=W+"px"; cv.style.height=H+"px";
    cache=null; cacheKey="";
  }

  function setCam(cam){
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.translate(cam.x, cam.y);
    ctx.scale(cam.z, cam.z);
  }

  function floorTile(ctx,tx,ty,c1,c2){
    const even=((tx+ty)&1)===0;
    const a=iso(tx,ty),b=iso(tx+1,ty),c=iso(tx+1,ty+1),d=iso(tx,ty+1);
    qfill(ctx,[a,b,c,d], even?c1:c2);
  }

  function roomFloor(ctx,r, locked){
    const light=locked?"#8a96a8":"#d8e6f6";
    const dark=locked?"#6e7a8c":(r.id==="interrog"||r.id==="cells"?"#3d4a63":"#6aa0d8");
    for(let y=r.gy;y<r.gy+r.gh;y++)
      for(let x=r.gx;x<r.gx+r.gw;x++)
        floorTile(ctx,x,y,light,dark);
  }

  function wallSeg(ctx,x0,y0,x1,y1,h,col,gap){
    // wall along a line in tile space, optional gap {from,to} in 0-1 param
    const steps=Math.max(1, Math.round(Math.abs(x1-x0)+Math.abs(y1-y0)));
    for(let i=0;i<steps;i++){
      const t0=i/steps, t1=(i+1)/steps;
      if(gap && t0>=gap[0] && t1<=gap[1]) continue;
      const xa=x0+(x1-x0)*t0, ya=y0+(y1-y0)*t0;
      const xb=x0+(x1-x0)*t1, yb=y0+(y1-y0)*t1;
      const A=iso(xa,ya,h), B=iso(xb,yb,h), C=iso(xb,yb,0), D=iso(xa,ya,0);
      const alongX=Math.abs(x1-x0)>=Math.abs(y1-y0);
      qfill(ctx,[A,B,C,D], alongX?shade(col,0.92):shade(col,0.75), shade(col,0.55),0.6);
    }
    // top cap
    const A=iso(x0,y0,h), B=iso(x1,y1,h);
    ctx.beginPath();ctx.moveTo(A.x,A.y);ctx.lineTo(B.x,B.y);
    ctx.strokeStyle=shade(col,1.15);ctx.lineWidth=1.6;ctx.stroke();
  }

  function roomWalls(ctx,r,locked){
    const col=locked?"#8b94a3":"#c5d0de";
    const x0=r.gx,y0=r.gy,x1=r.gx+r.gw,y1=r.gy+r.gh;
    // north wall (y=y0) and west wall (x=x0) — back walls of dollhouse
    const gapN=[0.38,0.62], gapW=[0.38,0.62];
    wallSeg(ctx,x0,y0,x1,y0,WH,col, r.id==="chief"?null:gapN);
    wallSeg(ctx,x0,y0,x0,y1,WH,col, r.id==="garage"?null:gapW);
    // short front lip (south / east) very low, except garage south = door
    if(r.id!=="garage"){
      // no front walls — cutaway
    }
  }

  const ROOM_LABEL={reception:"ПРИЁМНАЯ",detective:"ДЕТЕКТИВ",cells:"КАМЕРЫ",interrog:"ДОПРОСНАЯ",garage:"ГАРАЖ",chief:"ШЕФ",armory:"ОРУЖЕЙНАЯ",electric:"ЩИТОВАЯ",suggest:"ПРЕДЛОЖЕНИЯ",gasstation:"ЗАПРАВКА",press:"ПРЕСС-ЦЕНТР"};
  function label(ctx,r,locked,level){
    const p=iso(r.gx+r.gw*0.5, r.gy+0.35, WH+8);
    const text=ROOM_LABEL[r.id]||r.name.toUpperCase();
    ctx.save();
    ctx.font="800 11px Nunito,sans-serif";
    const tw=ctx.measureText(text).width;
    const w=tw+14, h=16;
    ctx.translate(p.x,p.y);
    ctx.fillStyle=locked?"#2a3340e6":"#0b1c3ae6";
    roundRect(ctx,-w/2,-h/2,w,h,8);ctx.fill();
    ctx.strokeStyle=locked?"#889":"#9ec4ff";ctx.lineWidth=1;ctx.stroke();
    ctx.fillStyle=locked?"#c8c8c8":"#fff";
    ctx.textAlign="center";ctx.textBaseline="middle";
    ctx.fillText(text,0,0.5);
    ctx.restore();
    // level badge
    if(!locked && level){
      const q=iso(r.gx+r.gw-0.4, r.gy+0.4, WH+2);
      ctx.save();ctx.font="800 9px Nunito,sans-serif";
      ctx.fillStyle="#f0c75e";ctx.beginPath();ctx.arc(q.x,q.y,8,0,7);ctx.fill();
      ctx.fillStyle="#2a1a00";ctx.textAlign="center";ctx.textBaseline="middle";
      ctx.fillText(String(level),q.x,q.y+0.5);
      ctx.restore();
    }
  }

  function roundRect(ctx,x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
  }

  function furnReception(ctx,r){
    // desk
    box(ctx,r.gx+2.0,r.gy+2.4,4.0,1.3,16,"#2f6db5");
    // monitor
    box(ctx,r.gx+3.6,r.gy+2.55,0.9,0.4,12,"#1a1a28");
    box(ctx,r.gx+3.7,r.gy+2.6,0.7,0.15,10,"#7ec8ff");
    // plant
    cyl(ctx,r.gx+0.7,r.gy+0.8,0.28,8,"#8b5a2b");
    cyl(ctx,r.gx+0.7,r.gy+0.8,0.35,18,"#2e8b4a");
    // sofa
    box(ctx,r.gx+1.0,r.gy+5.4,2.6,1.1,10,"#2a5a9a");
    box(ctx,r.gx+1.0,r.gy+5.4,0.25,1.1,16,"#244e86");
    box(ctx,r.gx+3.35,r.gy+5.4,0.25,1.1,16,"#244e86");
    // chairs
    box(ctx,r.gx+5.5,r.gy+5.5,0.9,0.8,8,"#3a7ad0");
    box(ctx,r.gx+6.6,r.gy+5.5,0.9,0.8,8,"#3a7ad0");
  }
  function furnDetective(ctx,r){
    box(ctx,r.gx+1.8,r.gy+2.8,3.2,1.5,16,"#6b4a2a");
    box(ctx,r.gx+2.2,r.gy+2.95,0.8,0.5,10,"#1a1a28");
    box(ctx,r.gx+2.3,r.gy+3.0,0.6,0.2,8,"#8fd0ff");
    // cabinet
    box(ctx,r.gx+5.6,r.gy+0.4,1.2,1.4,28,"#7a7a88");
    box(ctx,r.gx+5.7,r.gy+0.5,1.0,0.15,6,"#999");
    // map on wall — drawn as a quad on north wall
    const a=iso(r.gx+2.2,r.gy+0.05,38), b=iso(r.gx+4.4,r.gy+0.05,38);
    const c=iso(r.gx+4.4,r.gy+0.05,18), d=iso(r.gx+2.2,r.gy+0.05,18);
    qfill(ctx,[a,b,c,d],"#c9b48a","#6a5a3a");
    // chair
    box(ctx,r.gx+2.8,r.gy+4.4,1.1,1.0,12,"#2a2a38");
    // lamp
    cyl(ctx,r.gx+4.6,r.gy+3.2,0.12,22,"#c0c0c8");
  }
  function furnInterrog(ctx,r){
    box(ctx,r.gx+2.2,r.gy+2.3,2.6,1.6,14,"#6a6a78");
    box(ctx,r.gx+2.9,r.gy+1.3,1.0,0.8,10,"#3a3a48");
    box(ctx,r.gx+2.9,r.gy+4.1,1.0,0.8,10,"#3a3a48");
    // hanging lamp
    const p=iso(r.gx+3.5,r.gy+3.1,WH);
    const q=iso(r.gx+3.5,r.gy+3.1,28);
    ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.strokeStyle="#222";ctx.lineWidth=1.2;ctx.stroke();
    ctx.beginPath();ctx.arc(q.x,q.y,5,0,7);ctx.fillStyle="#f7e08a";ctx.fill();
    // light cone
    ctx.beginPath();ctx.moveTo(q.x,q.y);
    const f=iso(r.gx+1.8,r.gy+2.0,0), g=iso(r.gx+5.2,r.gy+4.2,0);
    ctx.lineTo(f.x,f.y);ctx.lineTo(g.x,g.y);ctx.closePath();
    ctx.fillStyle="rgba(255,230,140,0.13)";ctx.fill();
  }
  function furnCells(ctx,r,S){
    // two cells: left and right of a corridor
    const bars=(x0,y0,w,d)=>{
      box(ctx,x0,y0,w,0.12,26,"#6a7380"); // back
      box(ctx,x0,y0+d-0.12,w,0.12,26,"#8a93a0");
      for(let i=0;i<=Math.floor(w*2);i++){
        const x=x0+i*0.5;
        const a=iso(x,y0,26),b=iso(x,y0+d,26),c=iso(x,y0+d,0),e=iso(x,y0,0);
        ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(e.x,e.y);ctx.lineTo(c.x,c.y);ctx.lineTo(b.x,b.y);
        ctx.strokeStyle="#9aa3b0";ctx.lineWidth=1.3;ctx.stroke();
      }
      // bed
      box(ctx,x0+0.3,y0+0.35,w-0.6,d-0.7,6,"#6a7a9a");
      box(ctx,x0+0.3,y0+0.35,w-0.6,0.3,8,"#cfd6e0");
    };
    bars(r.gx+0.3,r.gy+0.5,3.0,2.4);
    bars(r.gx+4.7,r.gy+0.5,3.0,2.4);
    bars(r.gx+0.3,r.gy+3.3,3.0,2.4);
    bars(r.gx+4.7,r.gy+3.3,3.0,2.4);
  }
  function furnGarage(ctx,r){
    // yellow lines
    const a=iso(r.gx+2.5,r.gy+1), b=iso(r.gx+2.5,r.gy+r.gh-0.3);
    const c=iso(r.gx+5.5,r.gy+1), d=iso(r.gx+5.5,r.gy+r.gh-0.3);
    ctx.strokeStyle="#e8d44a";ctx.lineWidth=1.6;ctx.setLineDash([6,4]);
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    ctx.beginPath();ctx.moveTo(c.x,c.y);ctx.lineTo(d.x,d.y);ctx.stroke();
    ctx.setLineDash([]);
    // tool cabinet
    box(ctx,r.gx+0.3,r.gy+0.4,1.3,1.6,26,"#3a6a9a");
    box(ctx,r.gx+6.4,r.gy+0.4,1.3,1.8,22,"#5a5a62");
    // tires
    cyl(ctx,r.gx+6.8,r.gy+3.2,0.45,8,"#222");
    cyl(ctx,r.gx+6.8,r.gy+4.1,0.45,8,"#222");
  }
  function furnChief(ctx,r){
    box(ctx,r.gx+1.8,r.gy+2.6,3.6,1.8,16,"#5a3a1a");
    box(ctx,r.gx+5.6,r.gy+0.4,1.2,1.8,32,"#4a3020");
    // flag
    const p=iso(r.gx+0.7,r.gy+0.7,40), q=iso(r.gx+0.7,r.gy+0.7,0);
    ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.strokeStyle="#ccc";ctx.lineWidth=1.5;ctx.stroke();
    qfill(ctx,[iso(r.gx+0.7,r.gy+0.7,40),iso(r.gx+1.8,r.gy+0.7,36),iso(r.gx+0.7,r.gy+0.7,28)],"#2a5a9a");
    box(ctx,r.gx+2.8,r.gy+4.5,1.2,1.1,14,"#2a2a30");
    // gold badge on wall
    const g=iso(r.gx+3.5,r.gy+0.08,34);
    ctx.beginPath();ctx.arc(g.x,g.y,7,0,7);ctx.fillStyle="#f0c75e";ctx.fill();
  }
  function furnArmory(ctx,r){
    box(ctx,r.gx+0.3,r.gy+0.4,1.4,5.0,24,"#3a3a44");
    box(ctx,r.gx+5.4,r.gy+0.4,1.4,5.0,24,"#3a3a44");
    box(ctx,r.gx+2.2,r.gy+2.4,2.8,1.6,14,"#5a5a66");
    box(ctx,r.gx+2.4,r.gy+2.6,0.8,0.8,8,"#3a7a3a");
    box(ctx,r.gx+3.4,r.gy+2.6,0.8,0.8,8,"#8a3030");
    // targets on wall
    for(let i=0;i<3;i++){
      const p=iso(r.gx+2.2+i*1.4,r.gy+0.08,32);
      ctx.beginPath();ctx.arc(p.x,p.y,6,0,7);ctx.fillStyle="#eee";ctx.fill();
      ctx.beginPath();ctx.arc(p.x,p.y,3,0,7);ctx.fillStyle="#c33";ctx.fill();
    }
  }
  function furnElectric(ctx,r){
    box(ctx,r.gx+0.3,r.gy+0.4,1.6,5.8,30,"#3a4a40");
    box(ctx,r.gx+0.5,r.gy+0.7,1.2,1.4,18,"#2a3a32");
    box(ctx,r.gx+0.5,r.gy+2.4,1.2,1.4,18,"#2a3a32");
    box(ctx,r.gx+0.5,r.gy+4.1,1.2,1.4,18,"#2a3a32");
    // lights
    for(let i=0;i<3;i++){
      const p=iso(r.gx+1.1,r.gy+1.2+i*1.7,22);
      ctx.beginPath();ctx.arc(p.x,p.y,3,0,7);ctx.fillStyle=i%2? "#4ade80":"#fbbf24";ctx.fill();
    }
    box(ctx,r.gx+3.4,r.gy+3.0,2.0,1.6,16,"#2a2a30");
  }
  function furnSuggest(ctx,r){
    box(ctx,r.gx+2.2,r.gy+2.2,2.8,2.2,20,"#8a5a28");
    box(ctx,r.gx+2.6,r.gy+2.5,2.0,0.2,6,"#222"); // slot
    box(ctx,r.gx+0.4,r.gy+0.4,3.6,0.2,28,"#d8c8a0");
  }
  function furnGas(ctx,r){
    box(ctx,r.gx+1.5,r.gy+1.5,1.4,1.4,26,"#d4c430");
    cyl(ctx,r.gx+2.2,r.gy+2.2,0.5,22,"#cc3333");
    cyl(ctx,r.gx+5.0,r.gy+2.0,0.55,14,"#cc7722");
    cyl(ctx,r.gx+5.0,r.gy+3.2,0.55,14,"#cc7722");
    box(ctx,r.gx+0.5,r.gy+0.3,7,0.2,8,"#c0c0c8"); // canopy lip
  }
  function furnPress(ctx,r){
    box(ctx,r.gx+5.5,r.gy+2.0,3.0,2.0,16,"#3a4a6a");
    box(ctx,r.gx+6.2,r.gy+2.3,1.6,1.2,8,"#d8d8e0");
    box(ctx,r.gx+0.5,r.gy+0.3,6,0.2,28,"#1a3a6a");
    cyl(ctx,r.gx+2.0,r.gy+4.2,0.3,16,"#222");
    cyl(ctx,r.gx+3.4,r.gy+4.2,0.3,16,"#222");
  }

  function furniture(ctx,r,S,locked){
    if(locked){
      // cones
      for(let i=0;i<3;i++){
        const x=r.gx+1.5+i*1.8, y=r.gy+r.gh*0.5;
        box(ctx,x,y,0.6,0.6,14,"#e87722");
        box(ctx,x+0.05,y+0.05,0.5,0.5,6,"#fff");
      }
      const p=iso(r.gx+r.gw/2,r.gy+r.gh/2,30);
      ctx.font="28px sans-serif";ctx.textAlign="center";ctx.fillText("🔒",p.x,p.y);
      ctx.font="700 10px Nunito,sans-serif";ctx.fillStyle="#fff";
      ctx.fillText("Шеф ур. "+ROOMS[r.id].unlock, p.x, p.y+16);
      return;
    }
    const f={reception:furnReception,detective:furnDetective,interrog:furnInterrog,
      cells:furnCells,garage:furnGarage,chief:furnChief,armory:furnArmory,
      electric:furnElectric,suggest:furnSuggest,gasstation:furnGas,press:furnPress}[r.id];
    if(f) f(ctx,r,S);
  }

  function slab(ctx,S){
    const pads=[];
    for(const id of ROOM_ORDER){
      const r=ROOMS[id];
      if(S.chiefLv<r.unlock) continue;
      pads.push([r.gx-0.12,r.gy-0.12,r.gw+0.24,r.gh+0.24]);
    }
    pads.push([8,13,7,7]);
    pads.push([-0.2,20,8.4,4]);
    for(const [x,y,w,d] of pads){
      const a=iso(x,y),b=iso(x+w,y),c=iso(x+w,y+d),e=iso(x,y+d);
      ctx.save();ctx.translate(8,10);qfill(ctx,[a,b,c,e],"rgba(0,0,0,0.28)");ctx.restore();
    }
    for(const [x,y,w,d] of pads){
      const a=iso(x,y),b=iso(x+w,y),c=iso(x+w,y+d),e=iso(x,y+d);
      qfill(ctx,[a,b,c,e],"#9aa7b8","#6a7788",1.2);
    }
  }

  function driveway(ctx){
    // внутренний двор справа от гаража
    for(let y=13;y<20;y++)
      for(let x=8;x<15;x++)
        floorTile(ctx,x,y,"#c5cdd6","#8b95a2");
    // эмблема
    const e=iso(11.5,16.3,2);
    ctx.beginPath();ctx.ellipse(e.x,e.y,22,11,0,0,7);ctx.fillStyle="#1d4f9a";ctx.fill();
    ctx.strokeStyle="#f0c75e";ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle="#f0c75e";ctx.font="800 13px Nunito,sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";
    ctx.fillText("★",e.x,e.y+1);
    // короткий выезд из гаража
    qfill(ctx,[iso(0,20),iso(8,20),iso(9,24.5),iso(-1,24.5)],"#6a7380");
    ctx.strokeStyle="#e8d44a";ctx.lineWidth=2;ctx.setLineDash([8,6]);
    const p=iso(4,20.3),q=iso(4,24.2);
    ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();
    ctx.setLineDash([]);
    // клумбы
    cyl(ctx,8.6,13.6,0.35,10,"#2e8b4a");
    cyl(ctx,14.2,13.6,0.35,10,"#2e8b4a");
  }

  function buildCache(S){
    // bounds
    let minx=1e9,miny=1e9,maxx=-1e9,maxy=-1e9;
    const add=(p,pad=0)=>{minx=Math.min(minx,p.x-pad);miny=Math.min(miny,p.y-pad);maxx=Math.max(maxx,p.x+pad);maxy=Math.max(maxy,p.y+pad);};
    add(iso(-1,-1,0),40);add(iso(23,30,0),40);add(iso(0,0,WH+20),20);
    const cw=Math.ceil(maxx-minx+CACHE_PAD*2), ch=Math.ceil(maxy-miny+CACHE_PAD*2);
    const c=document.createElement("canvas");
    c.width=cw*dpr; c.height=ch*dpr;
    const g=c.getContext("2d");
    g.setTransform(dpr,0,0,dpr,-minx+CACHE_PAD,-miny+CACHE_PAD);
    slab(g,S);
    driveway(g);
    // rooms back-to-front
    const list=ROOM_ORDER.map(id=>ROOMS[id]).sort((a,b)=>(a.gx+a.gy)-(b.gx+b.gy));
    for(const r of list){
      const locked=S.chiefLv<r.unlock;
      if(locked) continue;
      roomFloor(g,r,locked);
      roomWalls(g,r,locked);
      furniture(g,r,S,locked);
      label(g,r,locked, locked?0:S.rooms[r.id].level);
    }
    cache=c; cacheOff={x:minx-CACHE_PAD,y:miny-CACHE_PAD};
  }

  function drawPerson(ctx,wx,wy,opt){
    const bob=opt.walk?Math.abs(Math.sin(opt.phase*2))*2.2:Math.sin(opt.phase)*0.6;
    const p=iso(wx,wy,0);
    const sx=p.x, sy=p.y-bob;
    const sc=opt.scale||1;
    ctx.save();ctx.translate(sx,sy);ctx.scale(sc,sc);
    // shadow
    ctx.beginPath();ctx.ellipse(0,2,9,3.5,0,0,7);ctx.fillStyle="rgba(0,0,0,0.28)";ctx.fill();
    const swing=opt.walk?Math.sin(opt.phase)*4.5:0;
    const skin=opt.skin||"#e0b090";
    const suit=opt.suit||"navy";
    const body=suit==="shiny"?"#14141c":suit==="orange"?"#e87830":suit==="civ"? (opt.civ||"#4a7ab0"):"#1b3a6e";
    const body2=suit==="shiny"?"#2a2a38":body;
    // legs
    ctx.strokeStyle=suit==="orange"?"#c45a20":"#1a1a28";
    ctx.lineWidth=3.2;ctx.lineCap="round";
    ctx.beginPath();ctx.moveTo(-2,0);ctx.lineTo(-2+swing*0.15,12);ctx.stroke();
    ctx.beginPath();ctx.moveTo(2,0);ctx.lineTo(2-swing*0.15,12);ctx.stroke();
    // body
    ctx.fillStyle=body;
    roundRect(ctx,-7,-16,14,17,4);ctx.fill();
    if(suit==="shiny"){
      ctx.fillStyle="rgba(255,255,255,0.28)";
      ctx.beginPath();ctx.ellipse(-3,-10,3,6, -0.4,0,7);ctx.fill();
    }
    // badge
    if(suit==="navy"||suit==="shiny"){
      ctx.fillStyle="#f0c75e";ctx.beginPath();ctx.arc(4,-10,2,0,7);ctx.fill();
    }
    // arms
    ctx.strokeStyle=body2;ctx.lineWidth=2.4;
    ctx.beginPath();ctx.moveTo(-7,-12);ctx.lineTo(-9-swing*0.1,-2);ctx.stroke();
    ctx.beginPath();ctx.moveTo(7,-12);ctx.lineTo(9+swing*0.1,-2);ctx.stroke();
    // head
    ctx.beginPath();ctx.arc(0,-22,7.2,0,7);ctx.fillStyle=skin;ctx.fill();
    // hair
    ctx.fillStyle=opt.hair||"#3a2a1a";
    ctx.beginPath();
    if(opt.style==="bun"){
      ctx.arc(0,-26,5.5,Math.PI,0);ctx.fill();
      ctx.beginPath();ctx.arc(0,-30,3.2,0,7);ctx.fill();
    }else if(opt.style==="short"){
      ctx.arc(0,-24,6.5,Math.PI,0);ctx.fill();
    }else if(opt.style==="bob"){
      ctx.arc(0,-23,7.2,Math.PI*1.05, -0.05);ctx.fill();
      roundRect(ctx,-7.5,-22,15,8,3);ctx.fill();
    }else if(opt.style==="curly"){
      ctx.arc(0,-24,7.5,Math.PI,0);ctx.fill();
      ctx.beginPath();ctx.arc(-6,-22,3,0,7);ctx.fill();
      ctx.beginPath();ctx.arc(6,-22,3,0,7);ctx.fill();
    }else if(opt.style==="braids"){
      ctx.arc(0,-24,6.5,Math.PI,0);ctx.fill();
      ctx.fillRect(-7,-22,2.4,10);ctx.fillRect(4.6,-22,2.4,10);
    }else if(opt.style==="long"){
      ctx.arc(0,-24,6.8,Math.PI,0);ctx.fill();
      roundRect(ctx,-7.5,-22,15,14,4);ctx.fill();
    }else{ // ponytail / wavy default
      ctx.arc(0,-24,6.8,Math.PI,0);ctx.fill();
      ctx.beginPath();ctx.ellipse(6,-18,2.4,6,0.5,0,7);ctx.fill();
    }
    // cap
    if(opt.cap){
      ctx.fillStyle=suit==="shiny"?"#111":"#1a3a6e";
      ctx.beginPath();ctx.ellipse(0,-27,8,3.2,0,0,7);ctx.fill();
      ctx.fillRect(-7,-30,14,4);
      ctx.fillStyle="#0a0a0a";ctx.fillRect(-9,-27,8,2);
      ctx.fillStyle="#f0c75e";ctx.beginPath();ctx.arc(0,-29,1.6,0,7);ctx.fill();
    }
    // eyes
    ctx.fillStyle="#1a1a1a";
    ctx.beginPath();ctx.arc(-2.2,-22,0.9,0,7);ctx.arc(2.2,-22,0.9,0,7);ctx.fill();
    ctx.restore();
  }

  function drawCar(ctx,wx,wy,ang,siren){
    // ang 0 = facing +y (down-left), we just place an iso car
    ctx.save();
    const p=iso(wx,wy,0);
    ctx.translate(p.x,p.y);
    // simple iso car as boxes
    // body
    const x=-1.1,y=-0.6,w=2.2,d=1.2;
    // use local iso offsets around 0
    function B(x,y,w,d,h,col){box(ctx, wx+x, wy+y, w, d, h, col);}
    // shadow
    ctx.beginPath();ctx.ellipse(0,6,28,12,0,0,7);ctx.fillStyle="rgba(0,0,0,0.3)";ctx.fill();
    ctx.restore();
    box(ctx,wx-1.15,wy-0.55,2.3,1.15,12,"#1d4f9a");
    box(ctx,wx-1.15,wy-0.55,2.3,1.15,7,"#1d4f9a");
    box(ctx,wx-0.7,wy-0.45,1.4,1.0,18,"#eef3f8"); // cabin
    // light bar
    box(ctx,wx-0.35,wy-0.15,0.7,0.35,22, siren?"#e23":"#2a6adf");
    box(ctx,wx+0.0,wy-0.15,0.35,0.35,22, siren?"#2a6adf":"#e23");
    // wheels
    cyl(ctx,wx-0.7,wy-0.05,0.22,4,"#111");
    cyl(ctx,wx+0.7,wy-0.05,0.22,4,"#111");
    cyl(ctx,wx-0.7,wy+0.55,0.22,4,"#111");
    cyl(ctx,wx+0.7,wy+0.55,0.22,4,"#111");
  }

  function drawBubble(ctx,wx,wy,kind,amt,pulse){
    const p=iso(wx,wy,36);
    const y=p.y - 8 - Math.sin(pulse)*3;
    const icon={docs:"📄",warrants:"🔎",suspects:"🚨",inmates:"⛓️",cash:"💰",gas:"⛽",ammo:"🔫",elec:"⚡",sat:"⭐"}[kind]||"•";
    const text=kind==="cash"?fmt(amt):(amt>1?String(amt):"");
    ctx.save();
    ctx.font="700 11px Nunito,sans-serif";
    const tw=ctx.measureText(text).width;
    const w=Math.max(28, tw+28), h=22;
    ctx.translate(p.x,y);
    ctx.fillStyle="#fff";
    roundRect(ctx,-w/2,-h/2,w,h,11);ctx.fill();
    ctx.strokeStyle="#1d4f9a";ctx.lineWidth=1.4;ctx.stroke();
    // pointer
    ctx.beginPath();ctx.moveTo(-5,h/2-1);ctx.lineTo(0,h/2+6);ctx.lineTo(5,h/2-1);ctx.fillStyle="#fff";ctx.fill();
    ctx.font="13px sans-serif";ctx.textAlign="left";ctx.textBaseline="middle";
    ctx.fillText(icon, -w/2+5, 0);
    if(text){ctx.font="800 11px Nunito,sans-serif";ctx.fillStyle="#0b1c3a";ctx.fillText(text, -w/2+22, 0.5);}
    ctx.restore();
    return {x:p.x, y, w, h};
  }

  function actionBadge(ctx,wx,wy,text,tone,pulse){
    const p=iso(wx,wy,42);
    const y=p.y - Math.sin(pulse)*2;
    ctx.save();
    ctx.font="800 10px Nunito,sans-serif";
    const tw=ctx.measureText(text).width;
    const w=tw+18,h=20;
    ctx.translate(p.x,y);
    ctx.fillStyle=tone==="red"?"#ef4444":tone==="gold"?"#f0c75e":"#fff";
    roundRect(ctx,-w/2,-h/2,w,h,10);ctx.fill();
    ctx.strokeStyle=tone==="gold"?"#8a6a10":"#1d4f9a";ctx.lineWidth=1.2;ctx.stroke();
    ctx.fillStyle=tone==="gold"||tone==="red"?"#fff":"#0b1c3a";
    if(tone==="gold")ctx.fillStyle="#2a1a00";
    if(tone==="red")ctx.fillStyle="#fff";
    ctx.textAlign="center";ctx.textBaseline="middle";
    ctx.fillText(text,0,0.5);
    ctx.restore();
    return {x:p.x,y,w,h};
  }

  function progressBar(ctx,wx,wy,p){
    const q=iso(wx,wy,8);
    ctx.save();
    roundRect(ctx,q.x-16,q.y-3,32,6,3);ctx.fillStyle="#0a1628cc";ctx.fill();
    ctx.fillStyle="#22c55e";
    roundRect(ctx,q.x-16,q.y-3,32*Math.max(0,Math.min(1,p)),6,3);ctx.fill();
    ctx.restore();
  }

  const hits=[]; // last frame hit targets in screen space

  function draw(S,cam,now){
    if(!ctx)return;
    const key=S.chiefLv+"|"+ROOM_ORDER.map(id=>S.rooms[id].level).join(",")+"|"+dpr+"|"+W+"x"+H;
    if(!cache || key!==cacheKey){buildCache(S);cacheKey=key;}

    ctx.setTransform(dpr,0,0,dpr,0,0);
    // background
    const g=ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,"#0a1e40");g.addColorStop(1,"#071018");
    ctx.fillStyle=g;ctx.fillRect(0,0,W,H);

    ctx.save();
    setCam(cam);
    ctx.drawImage(cache, cacheOff.x, cacheOff.y, cache.width/dpr, cache.height/dpr);

    // dynamic: inmates sitting, officers, citizens, car, bubbles, badges, riot
    hits.length=0;
    const pulse=now/250;

    // inmates in cells
    const cellSlots=[
      [1.6,1.5],[5.9,1.5],[1.6,4.3],[5.9,4.3],
      [1.6,2.2],[5.9,2.2]
    ];
    const nIn=S.rooms.cells.in|0;
    const cr=ROOMS.cells;
    for(let i=0;i<Math.min(nIn,cellSlots.length);i++){
      const s=cellSlots[i];
      drawPerson(ctx, cr.gx+s[0], cr.gy+s[1], {suit:"orange", hair:"#3a2a1a", skin:"#d0a07a", style:"short", phase:i, walk:false, scale:0.95});
    }

    // car
    if(S.car){
      drawCar(ctx, S.car.x, S.car.y, 0, S.car.state!=="idle" && ((now/200)|0)%2===0);
    }

    // actors
    if(S.actors){
      const list=S.actors.slice().sort((a,b)=>(a.wy+a.wx)-(b.wy+b.wx));
      for(const a of list){
        if(a.kind==="hero"){
          const def=HEROES[a.hid]||{};
          drawPerson(ctx,a.wx,a.wy,{suit:def.suit,hair:def.hair,skin:def.skin,style:def.style,cap:def.cap,phase:a.phase,walk:a.walk,scale:1.05});
        }else if(a.kind==="citizen"){
          drawPerson(ctx,a.wx,a.wy,{suit:"civ",civ:a.color||"#4a7ab0",hair:a.hair||"#3a2a1a",skin:a.skin||"#e0b090",style:"short",phase:a.phase,walk:a.walk,cap:false});
        }else if(a.kind==="suspect"){
          drawPerson(ctx,a.wx,a.wy,{suit:"civ",civ:"#555",hair:"#2a2a2a",skin:"#d0a07a",style:"short",phase:a.phase,walk:a.walk});
        }else if(a.kind==="inmate"){
          drawPerson(ctx,a.wx,a.wy,{suit:"orange",hair:"#3a2a1a",skin:"#d0a07a",style:"short",phase:a.phase,walk:a.walk});
        }
      }
    }

    // working progress
    for(const id of ROOM_ORDER){
      const r=S.rooms[id], d=ROOMS[id];
      if(S.chiefLv<d.unlock) continue;
      if(r.work) progressBar(ctx, d.gx+d.gw/2, d.gy+d.gh/2, r.prog);
    }

    // riot
    if(S.riot){
      const d=ROOMS.cells;
      const a=iso(d.gx,d.gy),b=iso(d.gx+d.gw,d.gy),c=iso(d.gx+d.gw,d.gy+d.gh),e=iso(d.gx,d.gy+d.gh);
      qfill(ctx,[a,b,c,e],`rgba(220,40,40,${0.18+Math.sin(pulse)*0.08})`);
      actionBadge(ctx,d.gx+d.gw/2,d.gy+d.gh/2,"БУНТ! НАЖМИТЕ", "red", pulse);
    }

    // bubbles + action badges (world), record hits in screen space later in game after transform
    const worldHits=[];
    for(const b of (S.bubbles||[])){
      const hb=drawBubble(ctx,b.wx,b.wy,b.kind,b.amt,pulse+b.id);
      worldHits.push({type:"bubble", id:b.id, wx:b.wx, wy:b.wy, ...hb});
    }

    // ready actions
    const act=(id,text,tone)=>{
      const d=ROOMS[id];
      const hb=actionBadge(ctx,d.gx+d.gw*0.5,d.gy+d.gh*0.55,text,tone,pulse);
      worldHits.push({type:"action",id, wx:d.gx+d.gw*0.5, wy:d.gy+d.gh*0.55, ...hb});
    };
    const rr=S.rooms;
    if(!S.riot){
      if(rr.reception.out>0) act("reception","ДОКУМЕНТЫ ОТПРАВИТЬ","gold");
      if(rr.detective.in>0 && !rr.detective.work) act("detective","ДЕЛО РАССЛЕДОВАТЬ","gold");
      else if(rr.detective.out>0) act("detective","ОРДЕР АКТИВИРОВАТЬ","gold");
      if(rr.garage.in>0 && !rr.garage.work && S.car.state==="idle") act("garage","ПАТРУЛЬ ОТПРАВИТЬ","gold");
      else if(rr.garage.out>0) act("garage","ПОДОЗРЕВАЕМОГО ВЕСТИ","gold");
      if(rr.interrog.in>0 && !rr.interrog.work) act("interrog","ДОПРОС ПРОВЕСТИ","red");
      else if(rr.interrog.out>0) act("interrog","В КАМЕРУ","gold");
      if(rr.cells.pending>0) act("cells","ЗАБРАТЬ "+fmt(rr.cells.pending|0)+" ₽","gold");
      if(rr.armory.out>0 && S.chiefLv>=2) act("armory","ПАТРОНЫ +"+rr.armory.out,"gold");
      if(rr.electric.out>0 && S.chiefLv>=3) act("electric","ЭНЕРГИЯ +"+rr.electric.out,"gold");
      if(rr.gasstation.out>0 && S.chiefLv>=5) act("gasstation","БЕНЗИН +"+rr.gasstation.out,"gold");
      if(S.suggestReady && S.chiefLv>=3) act("suggest","ПРЕДЛОЖЕНИЕ","gold");
    }

    ctx.restore();

    // convert worldHits to screen
    hits.length=0;
    for(const h of worldHits){
      hits.push({type:h.type,id:h.id, x:h.x*cam.z+cam.x, y:h.y*cam.z+cam.y, w:h.w*cam.z, h:h.h*cam.z, room:h.id});
    }
    // rooms for tap
    for(const id of ROOM_ORDER){
      const d=ROOMS[id];
      const c=iso(d.gx+d.gw/2, d.gy+d.gh/2);
      hits.push({type:"room",id, x:c.x*cam.z+cam.x, y:c.y*cam.z+cam.y, w:d.gw*TW*0.4*cam.z, h:d.gh*TH*0.7*cam.z, room:id});
    }
  }

  function hit(sx,sy){
    // prefer bubbles/actions (drawn last, more specific)
    for(let i=hits.length-1;i>=0;i--){
      const h=hits[i];
      if(h.type==="room") continue;
      if(Math.abs(sx-h.x)<(h.w/2+8) && Math.abs(sy-h.y)<(h.h/2+8)) return h;
    }
    // rooms: use iso containment
    return null;
  }
  function hitRoom(sx,sy,cam){
    const w=invIso((sx-cam.x)/cam.z, (sy-cam.y)/cam.z);
    // front-most room first
    const list=ROOM_ORDER.map(id=>ROOMS[id]).sort((a,b)=>(b.gx+b.gy)-(a.gx+a.gy));
    for(const r of list){
      if(w.x>=r.gx && w.x<r.gx+r.gw && w.y>=r.gy && w.y<r.gy+r.gh) return r.id;
    }
    return null;
  }

  function focusOn(cam, id, W, H){
    const d=ROOMS[id];
    const p=iso(d.gx+d.gw/2, d.gy+d.gh/2);
    cam.x = W/2 - p.x*cam.z;
    cam.y = H/2 - p.y*cam.z + 20;
  }

  return {init,resize,draw,hit,hitRoom,focusOn,iso,invIso,TW,TH,getSize:()=>({W,H,dpr})};
})();
