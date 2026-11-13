/* v19: one glossy dollhouse precinct. No photo cutouts, no room frames. */
window.Scene = (() => {
  let cv, ctx, off, W = 0, H = 0, dpr = 1, cacheKey = "";
  let reduce = false, time = 0, baking = false;
  const lamps = [], hits = [];

  const LOOK = {
    anna:     {skin:"#e8b48e", hair:"#7a4324", hairStyle:"pony",  eyes:"#5c3a28", lip:"#c45b62"},
    marina:   {skin:"#f2ccb6", hair:"#161616", hairStyle:"bun",   eyes:"#3a5c8a", lip:"#c47a7c"},
    olga:     {skin:"#f6d2b6", hair:"#e2b15a", hairStyle:"bob",   eyes:"#2f7a62", lip:"#d48478"},
    darya:    {skin:"#f7c9aa", hair:"#d4531e", hairStyle:"wavy",  eyes:"#3d6a30", lip:"#e08a6e", freckles:true},
    elena:    {skin:"#d9aa8c", hair:"#4a2c24", hairStyle:"waves", eyes:"#4a322c", lip:"#a85a58", streak:"#e4ddd2"},
    irina:    {skin:"#8d5b3c", hair:"#140e0c", hairStyle:"braids",eyes:"#241810", lip:"#8a403c"},
    victoria: {skin:"#f7e0d4", hair:"#141414", hairStyle:"long",  eyes:"#6a7080", lip:"#c98b92"},
    katya:    {skin:"#f4d4ba", hair:"#e6c15e", hairStyle:"pony",  eyes:"#c47a22", lip:"#d4786c"},
    sofia:    {skin:"#e2b090", hair:"#9a3018", hairStyle:"wavy",  eyes:"#5a3828", lip:"#c06058"},
    alina:    {skin:"#f8e4d8", hair:"#ece6dc", hairStyle:"bob",   eyes:"#3a78b4", lip:"#d09098"},
    natalya:  {skin:"#c48a5c", hair:"#1a100c", hairStyle:"curly", eyes:"#4a3020", lip:"#a06050"},
    polina:   {skin:"#f6d2ba", hair:"#c43c18", hairStyle:"waves", eyes:"#2a7a48", lip:"#d07068", freckles:true},
    liana:    {skin:"#d4a47c", hair:"#3a2218", hairStyle:"pony",  eyes:"#3a2820", lip:"#b06058"},
    tamar:    {skin:"#a86e48", hair:"#1a100c", hairStyle:"braids",eyes:"#2a1810", lip:"#8a4038"},
    yael:     {skin:"#e8c4a4", hair:"#5a3020", hairStyle:"wavy",  eyes:"#4a3028", lip:"#c07068", dress:"#f08a78"},
    noa:      {skin:"#6e422e", hair:"#140c08", hairStyle:"curly", eyes:"#2a1810", lip:"#7a3830", dress:"#2f9a96"},
    miriam:   {skin:"#c99570", hair:"#6a4030", hairStyle:"bun",   eyes:"#3a2820", lip:"#a06058", dress:"#c46a8a"},
    liora:    {skin:"#f4d6c6", hair:"#c9a06a", hairStyle:"long",  eyes:"#5a4838", lip:"#d09088", dress:"#e6b44a"},
    roni:     {skin:"#e6ba9a", hair:"#2a1810", hairStyle:"pony",  eyes:"#3a2820", lip:"#b06860", dress:"#5c6e80"},
    shira:    {skin:"#f1d2be", hair:"#1a120c", hairStyle:"bob",   eyes:"#4a3828", lip:"#c07870", dress:"#6a5a8a"},
    maya:     {skin:"#d4a888", hair:"#4a1428", hairStyle:"long",  eyes:"#6a2030", lip:"#a04048", dress:"#3a3038"},
    nika:     {skin:"#e8c2a6", hair:"#3a2418", hairStyle:"waves", eyes:"#4a3428", lip:"#c07068"}
  };
  const ROOM_FACE = {
    reception:"anna", detective:"marina", interrog:"katya", cells:"olga", garage:"darya",
    chief:"elena", armory:"irina", electric:"tamar", suggest:"yael", gasstation:"natalya", press:"alina"
  };

  function init(canvas){
    cv = canvas;
    ctx = cv.getContext("2d", {alpha:false});
    off = document.createElement("canvas");
    reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
    const parent = cv.parentElement;
    if(parent && window.ResizeObserver) new ResizeObserver(() => resize()).observe(parent);
    resize();
  }
  function resize(){
    if(!cv || !cv.parentElement) return;
    const r = cv.parentElement.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    const nw = Math.max(0, r.width), nh = Math.max(0, r.height);
    if(Math.abs(nw - W) < 1 && Math.abs(nh - H) < 1 && cv.width) return;
    W = nw; H = nh;
    if(W < 2 || H < 2) return;
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    cv.style.width = W + "px";
    cv.style.height = H + "px";
    cacheKey = "";
  }
  function preload(){}
  function heroImage(){ return null; }

  function rr(c, x, y, w, h, r){
    const rad = Math.max(0, Math.min(r || 0, Math.abs(w) / 2, Math.abs(h) / 2));
    c.beginPath();
    c.moveTo(x + rad, y);
    c.arcTo(x + w, y, x + w, y + h, rad);
    c.arcTo(x + w, y + h, x, y + h, rad);
    c.arcTo(x, y + h, x, y, rad);
    c.arcTo(x, y, x + w, y, rad);
    c.closePath();
  }
  function shade(hex, k){
    const n = parseInt(String(hex).replace("#",""), 16);
    if(!Number.isFinite(n) || String(hex).length < 7) return hex;
    const ch = i => Math.max(0, Math.min(255, ((n >> i) & 255) * k)) | 0;
    return "rgb(" + ch(16) + "," + ch(8) + "," + ch(0) + ")";
  }
  function gloss(c, x, y, w, h, a){
    const g = c.createLinearGradient(x, y, x + w * 0.2, y + h);
    g.addColorStop(0, "rgba(255,255,255," + a + ")");
    g.addColorStop(0.45, "rgba(255,255,255,0)");
    c.fillStyle = g;
    c.fillRect(x, y, w, h);
  }

  function kit(style, look){
    if(style === "civ" || style === "vip"){
      const col = (look && look.dress) || (style === "vip" ? "#e6b44a" : "#f08a78");
      return {jacket:col, shirt:"#fff8f2", pants:shade(col, 0.78), trim:"#fff", cap:false, dress:true, cape:style === "vip"};
    }
    if(style === "suspect") return {jacket:(look && look.dress) || "#5c6e80", shirt:"#f4efe8", pants:"#3c4652", trim:"#e6d2b0", cap:false};
    if(style === "inmate") return {jacket:"#6d8cb8", shirt:"#e7eef6", pants:"#5e7da8", trim:"#f4f7fb", cap:false};
    if(style === "parade") return {jacket:"#173f8c", shirt:"#f7f9ff", pants:"#14367a", trim:"#f0d060", cap:true, medals:true};
    if(style === "detective") return {jacket:"#3e3832", shirt:"#f7f1e6", pants:"#2c2824", trim:"#d7b57a", cap:false, blazer:true};
    if(style === "tactical") return {jacket:"#1c2836", shirt:"#2a3848", pants:"#161e28", trim:"#9eb0c4", cap:false, vest:true};
    if(style === "elite") return {jacket:"#102e66", shirt:"#f8f4ff", pants:"#0e2754", trim:"#f2d78a", cap:true, medals:true, cape:true};
    return {jacket:"#1a56b0", shirt:"#d7ecff", pants:"#163e86", trim:"#f4f8ff", cap:true};
  }

  function star(c, x, y, r, color){
    c.save();
    c.translate(x, y);
    c.strokeStyle = color;
    c.fillStyle = color;
    c.lineWidth = Math.max(1.2, r * 0.18);
    c.lineJoin = "round";
    const tri = rot => {
      c.beginPath();
      for(let i = 0; i < 3; i++){
        const a = rot + i * Math.PI * 2 / 3 - Math.PI / 2;
        const px = Math.cos(a) * r, py = Math.sin(a) * r;
        i ? c.lineTo(px, py) : c.moveTo(px, py);
      }
      c.closePath();
      c.stroke();
    };
    tri(0); tri(Math.PI);
    c.restore();
  }

  function stone(c, x, y, w, h, lux){
    if(w < 2 || h < 2) return;
    const g = c.createLinearGradient(x, y, x + w * 0.15, y + h);
    g.addColorStop(0, lux >= 7 ? "#fff0d2" : "#f6e2c2");
    g.addColorStop(0.45, "#e8cb98");
    g.addColorStop(1, lux >= 4 ? "#d7b27a" : "#cda56a");
    c.fillStyle = g;
    rr(c, x, y, w, h, 18);
    c.fill();
    c.save();
    rr(c, x, y, w, h, 18);
    c.clip();
    c.strokeStyle = "rgba(120,78,28,.14)";
    c.lineWidth = 1;
    const bw = 26, bh = 13;
    for(let yy = y; yy < y + h; yy += bh){
      const shift = ((yy / bh) | 0) % 2 ? bw / 2 : 0;
      for(let xx = x - bw; xx < x + w; xx += bw) c.strokeRect(xx + shift + 0.5, yy + 0.5, bw, bh);
    }
    gloss(c, x, y, w, h * 0.55, lux >= 7 ? 0.38 : 0.22);
    c.restore();
  }

  function floor(c, x, y, w, h, d){
    if(w < 2 || h < 2) return;
    c.save();
    rr(c, x, y, w, h, 12);
    c.clip();
    const lv = d.level || 1;
    let a = "#4e92dc", b = "#2f68b4";
    if(d.marble){ a = "#d5e4f6"; b = "#8fb4de"; }
    if(d.lacquer){ a = "#3a78d8"; b = "#163e86"; }
    const g = c.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, a);
    g.addColorStop(1, b);
    c.fillStyle = g;
    c.fillRect(x, y, w, h);
    const ts = Math.max(12, 22 - Math.min(8, lv));
    for(let yy = y; yy < y + h; yy += ts){
      for(let xx = x; xx < x + w; xx += ts){
        const alt = (((xx / ts) | 0) + ((yy / ts) | 0)) & 1;
        c.fillStyle = alt ? "rgba(255,255,255,.2)" : "rgba(10,30,70,.1)";
        c.fillRect(xx, yy, ts - 1, ts - 1);
        if(d.gold){
          c.strokeStyle = "rgba(240,200,90,.55)";
          c.lineWidth = 1;
          c.strokeRect(xx + 0.5, yy + 0.5, ts - 1.5, ts - 1.5);
        }
      }
    }
    if(d.medallion){
      c.beginPath();
      c.ellipse(x + w / 2, y + h * 0.58, w * 0.16, h * 0.16, 0, 0, 7);
      c.fillStyle = "rgba(240,210,120,.28)";
      c.fill();
      c.strokeStyle = "#f0d060";
      c.lineWidth = 1.5;
      c.stroke();
      star(c, x + w / 2, y + h * 0.58, Math.min(w, h) * 0.08, "#f0d060");
    }
    if(d.rug){
      c.fillStyle = d.lacquer ? "rgba(90,150,255,.28)" : "rgba(180,50,80,.22)";
      rr(c, x + w * 0.22, y + h * 0.62, w * 0.4, h * 0.16, 8);
      c.fill();
    }
    gloss(c, x, y, w, h, d.gloss || 0.2);
    if(d.lacquer){
      c.fillStyle = "rgba(255,255,255,.28)";
      c.beginPath();
      c.ellipse(x + w * 0.35, y + h * 0.28, w * 0.22, h * 0.1, -0.4, 0, 7);
      c.fill();
    }
    c.restore();
  }

  function windowView(c, x, y, w, h){
    if(w < 8 || h < 8) return;
    c.save();
    rr(c, x, y, w, h, 5);
    c.clip();
    const g = c.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, "#7ecfff");
    g.addColorStop(0.55, "#e7f6ff");
    g.addColorStop(1, "#f6e2b0");
    c.fillStyle = g;
    c.fillRect(x, y, w, h);
    c.fillStyle = "#3aa0d0";
    c.fillRect(x, y + h * 0.62, w * 0.35, h * 0.38);
    c.fillStyle = "#f0d060";
    c.beginPath();
    c.arc(x + w * 0.62, y + h * 0.7, Math.min(w, h) * 0.18, Math.PI, 0);
    c.fill();
    c.fillStyle = "#f4e2c4";
    c.fillRect(x + w * 0.4, y + h * 0.58, w * 0.18, h * 0.28);
    c.fillStyle = "rgba(255,255,255,.4)";
    c.fillRect(x, y, w * 0.16, h);
    c.restore();
    c.strokeStyle = "rgba(255,255,255,.9)";
    c.lineWidth = 2;
    rr(c, x, y, w, h, 5);
    c.stroke();
    c.beginPath();
    c.moveTo(x + w / 2, y + 2);
    c.lineTo(x + w / 2, y + h - 2);
    c.stroke();
  }

  function plaque(c, cx, y, en, he, d, maxW){
    c.save();
    const limit = Math.max(48, maxW || 150);
    let size = 12;
    c.font = "800 " + size + "px Nunito, sans-serif";
    let enW = c.measureText(en || "").width;
    while(enW > limit - 14 && size > 7){
      size -= 0.5;
      c.font = "800 " + size + "px Nunito, sans-serif";
      enW = c.measureText(en || "").width;
    }
    let hsize = Math.min(11, size);
    c.font = "700 " + hsize + "px NotoSerifHebrew, serif";
    let heW = he ? c.measureText(he).width : 0;
    while(he && heW > limit - 14 && hsize > 7){
      hsize -= 0.5;
      c.font = "700 " + hsize + "px NotoSerifHebrew, serif";
      heW = c.measureText(he).width;
    }
    const inner = Math.max(enW, heW);
    const w = Math.min(limit, Math.max(36, inner + 16)), h = he ? 30 : 18;
    const x = cx - w / 2;
    const fit = inner > w - 12 ? (w - 12) / inner : 1;
    const col = (d && d.lacquer) ? "#12386f" : "#1a4f9c";
    const g = c.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, shade(col, 1.35));
    g.addColorStop(0.45, col);
    g.addColorStop(1, shade(col, 0.65));
    c.fillStyle = g;
    rr(c, x, y, w, h, 8);
    c.fill();
    gloss(c, x, y, w, h * 0.6, 0.35);
    if(d && d.gold){
      c.strokeStyle = "rgba(240,210,110,.95)";
      c.lineWidth = 1.4;
      rr(c, x + 0.5, y + 0.5, w - 1, h - 1, 8);
      c.stroke();
    }
    c.fillStyle = "#fffaf0";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.translate(cx, 0);
    c.scale(fit, 1);
    c.font = "800 " + size + "px Nunito, sans-serif";
    c.fillText(en || "", 0, y + (he ? 10 : h / 2));
    if(he){
      c.font = "700 " + hsize + "px NotoSerifHebrew, serif";
      c.fillStyle = "#ffe7a3";
      c.fillText(he, 0, y + 21);
    }
    c.restore();
  }

  function desk(c, x, y, w, h, color, d){
    const g = c.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, shade(color, 1.3));
    g.addColorStop(0.4, color);
    g.addColorStop(1, shade(color, 0.62));
    c.fillStyle = g;
    rr(c, x, y, w, h, Math.min(14, h));
    c.fill();
    c.fillStyle = "rgba(255,255,255,.38)";
    rr(c, x + w * 0.08, y + h * 0.16, w * 0.46, h * 0.28, 8);
    c.fill();
    if(d && d.gold){
      c.strokeStyle = "rgba(240,210,110,.9)";
      c.lineWidth = 1.5;
      rr(c, x, y, w, h, Math.min(14, h));
      c.stroke();
    }
  }
  function monitor(c, x, y, w, h){
    c.fillStyle = "#102033";
    rr(c, x, y, w, h, 3);
    c.fill();
    const g = c.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, "#b7ecff");
    g.addColorStop(1, "#3a8fd0");
    c.fillStyle = g;
    c.fillRect(x + 2, y + 2, w - 4, h - 6);
    c.fillStyle = "rgba(255,255,255,.55)";
    c.fillRect(x + 3, y + 3, w * 0.32, 2);
    if(baking) lamps.push({x:x + w / 2, y:y + h / 2, r:Math.max(w, 18), cool:true});
  }
  function plant(c, x, y, s){
    c.fillStyle = "#8a5a32";
    rr(c, x - s * 0.28, y - s * 0.22, s * 0.56, s * 0.28, 3);
    c.fill();
    c.fillStyle = "#1e8a42";
    c.beginPath();
    c.ellipse(x, y - s * 0.55, s * 0.38, s * 0.42, 0, 0, 7);
    c.fill();
    c.fillStyle = "#46c06e";
    c.beginPath();
    c.ellipse(x - s * 0.16, y - s * 0.7, s * 0.2, s * 0.24, -0.4, 0, 7);
    c.fill();
    c.fillStyle = "rgba(255,255,255,.35)";
    c.beginPath();
    c.ellipse(x - s * 0.18, y - s * 0.78, s * 0.08, s * 0.14, -0.5, 0, 7);
    c.fill();
  }
  function lamp(c, x, y, h, d){
    c.strokeStyle = (d && d.gold) ? "#f0d060" : "#f4f7fb";
    c.lineWidth = 2;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x, y + h * 0.45);
    c.stroke();
    c.fillStyle = "#fff4c2";
    c.beginPath();
    c.ellipse(x, y + h * 0.55, 8, 4.5, 0, 0, 7);
    c.fill();
    if(baking) lamps.push({x, y:y + h * 0.62, r:26 + ((d && d.level) || 1)});
  }
  function chair(c, x, y, w, h, color){
    const g = c.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, shade(color, 1.25));
    g.addColorStop(1, shade(color, 0.7));
    c.fillStyle = g;
    rr(c, x, y, w, h * 0.7, 5);
    c.fill();
    c.fillStyle = shade(color, 0.65);
    c.fillRect(x + w * 0.18, y + h * 0.62, w * 0.14, h * 0.38);
    c.fillRect(x + w * 0.66, y + h * 0.62, w * 0.14, h * 0.38);
  }
  function bars(c, x, y, w, h, d){
    c.fillStyle = "rgba(190,214,236,.22)";
    rr(c, x, y, w, h, 4);
    c.fill();
    c.strokeStyle = d.gold ? "#f0d060" : "#e7eef6";
    c.lineWidth = 2.2;
    c.lineCap = "round";
    const n = 3 + Math.min(3, (d.level || 1) >> 1);
    for(let i = 0; i <= n; i++){
      const xx = x + (w * i) / n;
      c.beginPath();
      c.moveTo(xx, y);
      c.lineTo(xx, y + h);
      c.stroke();
    }
    c.strokeStyle = d.lacquer ? "#d7e6ff" : "#b7c6d6";
    rr(c, x, y, w, h, 4);
    c.stroke();
    if((d.level || 1) >= 3){
      c.fillStyle = "#1a4f9c";
      rr(c, x + 4, y + h * 0.62, w - 8, h * 0.16, 3);
      c.fill();
    }
  }
  function padlock(c, x, y, s){
    c.strokeStyle = "#fff6dc";
    c.lineWidth = Math.max(2, s * 0.12);
    c.lineCap = "round";
    c.beginPath();
    c.arc(x, y, s * 0.38, Math.PI, 0);
    c.stroke();
    const g = c.createLinearGradient(x - s, y, x + s, y + s);
    g.addColorStop(0, "#ffe08a");
    g.addColorStop(1, "#e0a020");
    c.fillStyle = g;
    rr(c, x - s * 0.46, y, s * 0.92, s * 0.72, s * 0.16);
    c.fill();
    gloss(c, x - s * 0.46, y, s * 0.92, s * 0.4, 0.45);
  }

  function furnish(c, id, r, d){
    const {x, y, w, h} = r;
    const lv = d.level || 1;
    if(id === "reception" || id === "chief" || id === "press"){
      windowView(c, x + w * 0.68, y + h * 0.22, w * 0.2, h * 0.14);
      if(lv >= 5) windowView(c, x + w * 0.08, y + h * 0.22, w * 0.16, h * 0.12);
      desk(c, x + w * 0.16, y + h * 0.4, w * 0.58, h * 0.22, lv >= 9 ? "#102e66" : "#1a56b0", d);
      const n = Math.min(3, d.monitors || 1);
      for(let i = 0; i < n; i++) monitor(c, x + w * (0.24 + i * 0.14), y + h * 0.28, w * 0.12, h * 0.12);
      if(lv >= 2) lamp(c, x + w * 0.68, y + h * 0.32, h * 0.16, d);
      chair(c, x + w * 0.74, y + h * 0.55, w * 0.14, h * 0.2, "#163e7a");
      for(let i = 0; i < Math.min(3, d.plants || 0); i++) plant(c, x + w * (0.1 + i * 0.12), y + h * 0.78, h * 0.22);
      if(id === "chief"){
        c.fillStyle = "#12386f";
        rr(c, x + w * 0.84, y + h * 0.08, w * 0.08, h * 0.16, 2);
        c.fill();
        c.fillStyle = "#fff";
        c.fillRect(x + w * 0.848, y + h * 0.1, w * 0.064, h * 0.045);
        c.fillStyle = "#0038b8";
        c.fillRect(x + w * 0.848, y + h * 0.1, w * 0.064, h * 0.012);
        c.fillRect(x + w * 0.848, y + h * 0.128, w * 0.064, h * 0.012);
        star(c, x + w * 0.88, y + h * 0.15, w * 0.012, "#0038b8");
      }
    }else if(id === "detective" || id === "suggest" || id === "armory"){
      windowView(c, x + w * 0.7, y + h * 0.22, w * 0.18, h * 0.12);
      c.fillStyle = "#d7b07a";
      rr(c, x + w * 0.08, y + h * 0.05, w * 0.46, h * 0.16, 4);
      c.fill();
      c.strokeStyle = "rgba(140,40,40,.75)";
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(x + w * 0.14, y + h * 0.09);
      c.lineTo(x + w * 0.42, y + h * 0.16);
      c.moveTo(x + w * 0.2, y + h * 0.16);
      c.lineTo(x + w * 0.4, y + h * 0.08);
      c.stroke();
      c.fillStyle = "#f7f1e2";
      c.fillRect(x + w * 0.16, y + h * 0.08, w * 0.08, h * 0.05);
      c.fillRect(x + w * 0.32, y + h * 0.12, w * 0.08, h * 0.05);
      desk(c, x + w * 0.14, y + h * 0.42, w * 0.56, h * 0.2, id === "armory" ? "#2c3648" : "#6a4428", d);
      const n = Math.min(3, d.monitors || 1);
      for(let i = 0; i < n; i++) monitor(c, x + w * (0.22 + i * 0.14), y + h * 0.28, w * 0.12, h * 0.12);
      if(lv >= 2) lamp(c, x + w * 0.72, y + h * 0.36, h * 0.14, d);
      for(let i = 0; i < Math.min(4, lv); i++){
        c.fillStyle = ["#1a4f9c", "#8a3038", "#e0b050", "#234"][i % 4];
        rr(c, x + w * 0.08 + i * (w * 0.045), y + h * 0.7, w * 0.035, h * 0.14, 2);
        c.fill();
      }
      if(d.plants) plant(c, x + w * 0.88, y + h * 0.72, h * 0.2);
      if(id === "suggest"){
        c.fillStyle = "#8a5a32";
        rr(c, x + w * 0.78, y + h * 0.48, w * 0.14, h * 0.22, 4);
        c.fill();
        c.fillStyle = "#1a4f9c";
        c.fillRect(x + w * 0.8, y + h * 0.56, w * 0.1, h * 0.035);
      }
    }else if(id === "interrog"){
      lamp(c, x + w * 0.5, y + h * 0.08, h * 0.22, d);
      desk(c, x + w * 0.28, y + h * 0.48, w * 0.44, h * 0.12, lv >= 8 ? "#243044" : "#4a5568", d);
      chair(c, x + w * 0.32, y + h * 0.32, w * 0.14, h * 0.14, "#243044");
      chair(c, x + w * 0.54, y + h * 0.64, w * 0.14, h * 0.14, "#1a4f9c");
      if(lv >= 4){
        windowView(c, x + w * 0.06, y + h * 0.22, w * 0.18, h * 0.14);
        c.fillStyle = "rgba(190,220,255,.22)";
        c.fillRect(x + w * 0.06, y + h * 0.08, w * 0.2, h * 0.16);
      }
      if(lv >= 6) monitor(c, x + w * 0.74, y + h * 0.4, w * 0.16, h * 0.1);
    }else if(id === "cells"){
      const cells = 1 + Math.min(3, Math.floor(lv / 2));
      const cw = (w * 0.86) / cells;
      for(let i = 0; i < cells; i++) bars(c, x + w * 0.06 + i * cw, y + h * 0.28, cw - 6, h * 0.58, d);
      if(lv >= 2) lamp(c, x + w * 0.5, y + h * 0.12, h * 0.12, d);
      if(d.plants) plant(c, x + w * 0.9, y + h * 0.7, h * 0.18);
    }else if(id === "garage" || id === "gasstation"){
      c.save();
      c.strokeStyle = d.gold ? "#f0d060" : "#f7e7a0";
      c.lineWidth = 2;
      c.setLineDash([8, 6]);
      c.beginPath();
      c.moveTo(x + w * 0.34, y + h * 0.42);
      c.lineTo(x + w * 0.34, y + h * 0.92);
      c.moveTo(x + w * 0.66, y + h * 0.42);
      c.lineTo(x + w * 0.66, y + h * 0.92);
      c.stroke();
      c.restore();
      desk(c, x + w * 0.04, y + h * 0.38, w * 0.14, h * 0.36, "#1a4f9c", d);
      if(lv >= 3) desk(c, x + w * 0.8, y + h * 0.4, w * 0.14, h * 0.28, "#2c3644", d);
      if(lv >= 2) lamp(c, x + w * 0.5, y + h * 0.16, h * 0.12, d);
      if(id === "gasstation"){
        desk(c, x + w * 0.3, y + h * 0.4, w * 0.1, h * 0.36, "#e0a020", d);
        desk(c, x + w * 0.46, y + h * 0.4, w * 0.1, h * 0.36, "#c0392b", d);
        c.fillStyle = "#222";
        c.fillRect(x + w * 0.33, y + h * 0.28, w * 0.04, h * 0.14);
        c.fillRect(x + w * 0.49, y + h * 0.28, w * 0.04, h * 0.14);
      }
      if(d.glass) windowView(c, x + w * 0.36, y + h * 0.2, w * 0.26, h * 0.1);
      for(let i = 0; i < Math.min(2, d.plants || 0); i++) plant(c, x + w * (0.9), y + h * (0.7 + i * 0.02), h * 0.16);
    }else if(id === "electric"){
      const panels = 2 + Math.min(4, lv);
      for(let i = 0; i < panels; i++){
        const py = y + h * 0.32 + (i % 3) * h * 0.16;
        const px = x + w * 0.1 + Math.floor(i / 3) * w * 0.28;
        desk(c, px, py, w * 0.22, h * 0.13, "#1c3a32", d);
        if(baking) lamps.push({x:px + w * 0.11, y:py + h * 0.06, r:12, hue:i % 2 ? "#4ade80" : "#fbbf24"});
      }
      if(lv >= 4) monitor(c, x + w * 0.64, y + h * 0.48, w * 0.22, h * 0.16);
    }
    if(d.chandelier){
      const cx = x + w * 0.5, cy = y + h * 0.02;
      c.strokeStyle = "#f0d060";
      c.lineWidth = 1.6;
      c.beginPath();
      c.moveTo(cx, cy);
      c.lineTo(cx, cy + 12);
      c.stroke();
      c.fillStyle = d.lacquer ? "#b7dcff" : "#fff3c0";
      for(let i = -1; i <= 1; i++){
        c.beginPath();
        c.arc(cx + i * 9, cy + 16, 3.4, 0, 7);
        c.fill();
      }
      if(baking) lamps.push({x:cx, y:cy + 18, r:48});
    }
    if(d.columns){
      column(c, x + 8, y + h * 0.2, h * 0.7);
      if(d.columns > 1) column(c, x + w - 16, y + h * 0.2, h * 0.7);
    }
  }
  function column(c, x, y, h){
    const g = c.createLinearGradient(x, y, x + 10, y);
    g.addColorStop(0, "#8ea6d4");
    g.addColorStop(0.5, "#f7fbff");
    g.addColorStop(1, "#6d86b8");
    c.fillStyle = g;
    rr(c, x, y, 9, h, 4);
    c.fill();
    c.fillStyle = "#f0d060";
    c.fillRect(x - 2, y, 13, 4);
    c.fillRect(x - 2, y + h - 4, 13, 4);
  }

  function clusterRows(wing){
    const rows = [];
    for(const id of ROOM_ORDER){
      if(LAYOUT[id].wing !== wing) continue;
      const r = roomRect(id);
      let row = rows.find(rw => Math.abs(rw.y - r.y) < 20);
      if(!row){
        row = {y:r.y, h:r.h, rooms:[]};
        rows.push(row);
      }
      row.y = Math.min(row.y, r.y);
      row.h = Math.max(row.h, r.h);
      row.rooms.push({id, r});
    }
    rows.forEach(rw => rw.rooms.sort((a, b) => a.r.x - b.r.x));
    rows.sort((a, b) => a.y - b.y);
    return rows;
  }
  function roomRect(id){
    const L = LAYOUT[id];
    const wh = H / 2, y0 = (L.wing - 1) * wh;
    return {x:L.l / 100 * W, y:y0 + L.t / 100 * wh, w:L.w / 100 * W, h:L.h / 100 * wh};
  }
  function pt(wing, x, y){
    const wh = H / 2;
    return {x:(x / 100) * W, y:(wing - 1) * wh + (y / 100) * wh};
  }

  function drawSky(c, x, y, w, h){
    const g = c.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, "#4eb4f8");
    g.addColorStop(0.42, "#b9e6ff");
    g.addColorStop(1, "#f8e4b4");
    c.fillStyle = g;
    c.fillRect(x, y, w, h);
    const sun = c.createRadialGradient(x + w * 0.78, y + h * 0.22, 8, x + w * 0.78, y + h * 0.22, w * 0.28);
    sun.addColorStop(0, "rgba(255,248,210,.95)");
    sun.addColorStop(1, "rgba(255,248,210,0)");
    c.fillStyle = sun;
    c.fillRect(x, y, w, h);
    c.fillStyle = "#3aa6dc";
    c.beginPath();
    c.moveTo(x, y + h * 0.72);
    c.quadraticCurveTo(x + w * 0.16, y + h * 0.6, x + w * 0.34, y + h * 0.8);
    c.lineTo(x, y + h);
    c.fill();
    c.fillStyle = "rgba(255,255,255,.4)";
    for(let i = 0; i < 4; i++) c.fillRect(x + 10 + i * 22, y + h * 0.78 + (i % 2) * 4, 16, 2);
    const base = y + h * 0.8;
    const cols = [[0.4, 0.26], [0.47, 0.36], [0.54, 0.22], [0.6, 0.42], [0.67, 0.28], [0.74, 0.34], [0.82, 0.2]];
    cols.forEach(([fx, fh], i) => {
      const bw = w * 0.07, bh = h * fh, bx = x + w * fx, by = base - bh;
      c.fillStyle = i % 2 ? "#f6e4c6" : "#ead3a6";
      rr(c, bx, by, bw, bh + 6, 2);
      c.fill();
      c.fillStyle = "rgba(80,130,180,.5)";
      for(let wy = by + 6; wy < base - 4; wy += 8){
        c.fillRect(bx + 4, wy, 3, 3);
        c.fillRect(bx + bw - 8, wy, 3, 3);
      }
    });
    const dx = x + w * 0.63;
    c.fillStyle = "#ecd9b4";
    c.beginPath();
    c.moveTo(dx - w * 0.055, base);
    c.lineTo(dx - w * 0.04, base - h * 0.16);
    c.lineTo(dx + w * 0.04, base - h * 0.16);
    c.lineTo(dx + w * 0.055, base);
    c.fill();
    const dome = c.createLinearGradient(dx - 30, base - h * 0.4, dx + 20, base);
    dome.addColorStop(0, "#fff1b8");
    dome.addColorStop(0.55, "#f0c14a");
    dome.addColorStop(1, "#d4922a");
    c.fillStyle = dome;
    c.beginPath();
    c.arc(dx, base - h * 0.16, Math.min(w, h) * 0.1, Math.PI, 0);
    c.fill();
    c.fillStyle = "rgba(255,255,255,.55)";
    c.beginPath();
    c.ellipse(dx - 8, base - h * 0.24, 10, 6, -0.7, 0, 7);
    c.fill();
    c.fillStyle = "#f4e6cc";
    c.fillRect(x + w * 0.72, base - h * 0.46, w * 0.02, h * 0.46);
    c.beginPath();
    c.arc(x + w * 0.73, base - h * 0.46, w * 0.018, Math.PI, 0);
    c.fill();
  }
  function drawGarden(c, x, y, w, h){
    const g = c.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, "#8ed86a");
    g.addColorStop(1, "#2f8a3c");
    c.fillStyle = g;
    c.fillRect(x, y, w, h);
    const petals = ["#ff7b9e", "#ffd15c", "#fff", "#ff8d5a", "#f48ad0"];
    for(let i = 0; i < 16; i++){
      const fx = x + ((i * 67) % 100) / 100 * w;
      const fy = y + h * 0.15 + ((i * 41) % 80) / 100 * h;
      if(fx > w * 0.08 && fx < w * 0.92 && fy > y + h * 0.2 && fy < y + h * 0.85) continue;
      c.strokeStyle = "#217a34";
      c.lineWidth = 1.4;
      c.beginPath();
      c.moveTo(fx, fy + 7);
      c.lineTo(fx, fy);
      c.stroke();
      c.fillStyle = petals[i % petals.length];
      c.beginPath();
      c.arc(fx, fy, 3.1, 0, 7);
      c.fill();
    }
  }

  function drawRow(c, row, S){
    const rooms = row.rooms;
    const x0 = rooms[0].r.x;
    const last = rooms[rooms.length - 1].r;
    const x1 = last.x + last.w;
    const y = row.y, h = row.h;
    let lux = 1;
    rooms.forEach(o => {
      if(S.chiefLv >= (ROOMS[o.id].unlock || 1)) lux = Math.max(lux, S.rooms[o.id].level | 0);
    });
    c.save();
    c.shadowColor = "rgba(50,30,10,.22)";
    c.shadowBlur = 18;
    c.shadowOffsetY = 8;
    c.fillStyle = "#e7c896";
    rr(c, x0 - 8, y, x1 - x0 + 16, h, 20);
    c.fill();
    c.restore();
    stone(c, x0 - 8, y, x1 - x0 + 16, h, lux);
    rooms.forEach(o => {
      const locked = S.chiefLv < (ROOMS[o.id].unlock || 1);
      const d = locked ? roomDecorTier(1) : roomDecorTier(S.rooms[o.id].level);
      if(!locked) floor(c, o.r.x + 3, y + h * 0.34, o.r.w - 6, h * 0.6, d);
      else {
        c.save();
        c.globalAlpha = 0.35;
        c.fillStyle = "#2a241c";
        c.fillRect(o.r.x + 3, y + h * 0.34, o.r.w - 6, h * 0.6);
        c.restore();
      }
    });
    for(let i = 0; i < rooms.length - 1; i++){
      const a = rooms[i].r, b = rooms[i + 1].r;
      const gx = a.x + a.w, gw = Math.max(6, b.x - gx);
      stone(c, gx, y + 4, gw, h - 8, lux);
    }
    const lip = c.createLinearGradient(0, y + h - 10, 0, y + h + 8);
    lip.addColorStop(0, "rgba(255,236,200,.55)");
    lip.addColorStop(1, "rgba(120,80,30,.35)");
    c.fillStyle = lip;
    rr(c, x0 - 4, y + h - 8, x1 - x0 + 8, 12, 6);
    c.fill();
    rooms.forEach(o => {
      const locked = S.chiefLv < (ROOMS[o.id].unlock || 1);
      const d = locked ? roomDecorTier(1) : roomDecorTier(S.rooms[o.id].level);
      if(locked){
        padlock(c, o.r.x + o.r.w / 2, y + h * 0.58, Math.min(o.r.w, h) * 0.12);
        c.fillStyle = "#fffaf0";
        c.font = "800 " + Math.max(11, o.r.w / 16) + "px Nunito, sans-serif";
        c.textAlign = "center";
        c.fillText("ур. " + (ROOMS[o.id].unlock || ""), o.r.x + o.r.w / 2, y + h * 0.78);
      }else{
        furnish(c, o.id, {x:o.r.x, y, w:o.r.w, h}, d);
        if(d.gold){
          c.strokeStyle = "rgba(240,210,110,.85)";
          c.lineWidth = 2;
          c.beginPath();
          c.moveTo(o.r.x + 10, y + h - 14);
          c.lineTo(o.r.x + o.r.w - 10, y + h - 14);
          c.stroke();
        }
        const n = Math.min(10, d.level);
        for(let i = 0; i < n; i++){
          const sx = o.r.x + 14 + i * ((o.r.w - 28) / 10);
          c.fillStyle = i === n - 1 ? "#fff6d0" : "#f0d060";
          c.beginPath();
          c.arc(sx, y + h - 16, 2.3, 0, 7);
          c.fill();
        }
      }
    });
    if(rooms.some(o => o.id === "reception")){
      const rec = rooms.find(o => o.id === "reception").r;
      const bw = Math.min(78, rec.w * 0.42), bh = 64;
      const bx = rec.x + 8, by = y + h * 0.46;
      const g = c.createLinearGradient(bx, by, bx, by + bh);
      g.addColorStop(0, "#3d7ad8");
      g.addColorStop(1, "#143e86");
      c.fillStyle = g;
      rr(c, bx, by, bw, bh, 8);
      c.fill();
      gloss(c, bx, by, bw, bh * 0.5, 0.3);
      star(c, bx + 16, by + 16, 7, "#fff");
      c.fillStyle = "#fff";
      c.font = "800 8px Nunito, sans-serif";
      c.textAlign = "left";
      c.fillText("ISRAEL POLICE", bx + 28, by + 18);
      c.fillStyle = "#ffe7a3";
      c.font = "700 11px NotoSerifHebrew, serif";
      c.fillText("משטרת ישראל", bx + 8, by + 40);
    }
  }

  function paintStatic(S){
    off.width = Math.max(1, Math.round(W * dpr));
    off.height = Math.max(1, Math.round(H * dpr));
    const g = off.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.lineJoin = "round";
    g.lineCap = "round";
    lamps.length = 0;
    baking = true;
    const wh = H / 2;
    for(const wing of [1, 2]){
      const y0 = (wing - 1) * wh;
      drawGarden(g, 0, y0, W, wh);
      drawSky(g, 0, y0, W, wh * (wing === 1 ? 0.3 : 0.24));
      clusterRows(wing).forEach(row => drawRow(g, row, S));
      if(wing === 1){
        const sy = y0 + wh * 0.5;
        for(let i = 0; i < 5; i++){
          g.fillStyle = i % 2 ? "#f6e6c8" : "#e7c896";
          rr(g, 2, sy + i * wh * 0.03, W * 0.055 - i, wh * 0.028, 3);
          g.fill();
        }
      }
    }
    baking = false;
  }

  function limb(c, x, y, len, thick, ang, color, shoe){
    c.save();
    c.translate(x, y);
    c.rotate(ang);
    const g = c.createLinearGradient(-thick, 0, thick, len);
    g.addColorStop(0, shade(color, 1.25));
    g.addColorStop(0.45, color);
    g.addColorStop(1, shade(color, 0.7));
    c.fillStyle = g;
    rr(c, -thick / 2, -thick * 0.45, thick, len + thick * 0.45, thick / 2);
    c.fill();
    c.fillStyle = "rgba(255,255,255,.28)";
    c.fillRect(-thick / 2, 0, thick * 0.28, len * 0.7);
    if(shoe){
      c.fillStyle = "#1a1a1a";
      c.beginPath();
      c.ellipse(thick * 0.12, len - thick * 0.05, thick * 0.78, thick * 0.34, 0, 0, 7);
      c.fill();
      c.fillStyle = "#3a3a3a";
      c.fillRect(-thick * 0.15, len - thick * 0.45, thick * 0.45, thick * 0.16);
    }
    c.restore();
  }
  function arm(c, x, y, len, thick, ang, color, skin, bend){
    c.save();
    c.translate(x, y);
    c.rotate(ang);
    limb(c, 0, 0, len * 0.56, thick, 0, color);
    c.translate(0, len * 0.42);
    c.beginPath();
    c.fillStyle = shade(color, 0.9);
    c.arc(0, 0, thick * 0.55, 0, 7);
    c.fill();
    c.rotate(bend);
    limb(c, 0, 0, len * 0.5, thick * 0.86, 0, color);
    c.translate(0, len * 0.48);
    const hg = c.createRadialGradient(-thick * 0.1, -thick * 0.1, 1, 0, 0, thick * 0.5);
    hg.addColorStop(0, shade(skin, 1.12));
    hg.addColorStop(1, shade(skin, 0.86));
    c.fillStyle = hg;
    c.beginPath();
    c.arc(0, 0, thick * 0.48, 0, 7);
    c.fill();
    c.restore();
  }
  function eyes(c, look, headY, headR, blink){
    const open = blink > 0.55 ? 0.14 : 1;
    const y = headY + headR * 0.02;
    const dx = headR * 0.36;
    c.lineCap = "round";
    for(const s of [-1, 1]){
      c.save();
      c.translate(s * dx, y);
      c.fillStyle = "#fff";
      c.beginPath();
      c.ellipse(0, 0, headR * 0.26, headR * 0.28 * open, 0, 0, 7);
      c.fill();
      if(open > 0.4){
        c.fillStyle = look.eyes;
        c.beginPath();
        c.ellipse(s * headR * 0.03, headR * 0.03, headR * 0.13, headR * 0.15, 0, 0, 7);
        c.fill();
        c.fillStyle = "#1a120c";
        c.beginPath();
        c.arc(s * headR * 0.04, headR * 0.04, headR * 0.065, 0, 7);
        c.fill();
        c.fillStyle = "#fff";
        c.beginPath();
        c.arc(-headR * 0.04, -headR * 0.05, headR * 0.04, 0, 7);
        c.fill();
      }
      c.strokeStyle = "#2a1c14";
      c.lineWidth = Math.max(1, headR * 0.055);
      c.beginPath();
      c.arc(0, headR * 0.02, headR * 0.26, Math.PI * 1.08, Math.PI * 1.92);
      c.stroke();
      c.restore();
    }
    c.strokeStyle = shade(look.hair, 0.85);
    c.lineWidth = Math.max(1, headR * 0.07);
    c.beginPath();
    c.moveTo(-dx - headR * 0.2, y - headR * 0.34);
    c.quadraticCurveTo(-dx, y - headR * 0.5, -dx + headR * 0.22, y - headR * 0.32);
    c.moveTo(dx - headR * 0.22, y - headR * 0.32);
    c.quadraticCurveTo(dx, y - headR * 0.5, dx + headR * 0.2, y - headR * 0.34);
    c.stroke();
  }
  function mouth(c, look, headY, headR, mode, phase){
    const y = headY + headR * 0.48;
    c.lineCap = "round";
    if(mode === "talk" && Math.sin(phase * 6) > 0){
      c.fillStyle = look.lip;
      c.beginPath();
      c.ellipse(0, y, headR * 0.14, headR * 0.11, 0, 0, 7);
      c.fill();
    }else{
      c.strokeStyle = look.lip;
      c.lineWidth = Math.max(1.2, headR * 0.08);
      c.beginPath();
      c.arc(0, y - headR * 0.1, headR * 0.2, 0.18 * Math.PI, 0.82 * Math.PI);
      c.stroke();
    }
  }
  function hairBehind(c, look, headY, headR, phase, cap){
    c.fillStyle = look.hair;
    const pony = look.hairStyle === "pony" || look.hairStyle === "wavy" || look.hairStyle === "waves" || look.hairStyle === "long";
    if(pony){
      c.save();
      c.translate(headR * 0.1, headY + headR * 0.2);
      c.rotate(Math.sin(phase * 1.8) * 0.12);
      c.beginPath();
      c.ellipse(0, headR * (look.hairStyle === "long" || look.hairStyle === "waves" ? 1.15 : 0.85), headR * 0.48, headR * (look.hairStyle === "bob" ? 0.4 : 1.05), 0.15, 0, 7);
      c.fill();
      c.fillStyle = "rgba(255,255,255,.2)";
      c.beginPath();
      c.ellipse(-headR * 0.08, headR * 0.55, headR * 0.12, headR * 0.4, 0.2, 0, 7);
      c.fill();
      c.restore();
    }
    if(look.hairStyle === "braids"){
      c.fillStyle = look.hair;
      rr(c, -headR * 1.15, headY, headR * 0.32, headR * 1.7, headR * 0.16);
      c.fill();
      rr(c, headR * 0.82, headY, headR * 0.32, headR * 1.7, headR * 0.16);
      c.fill();
    }
    if(look.hairStyle === "bun"){
      c.fillStyle = look.hair;
      c.beginPath();
      c.arc(0, headY - headR * 1.05, headR * 0.46, 0, 7);
      c.fill();
      c.fillStyle = "rgba(255,255,255,.22)";
      c.beginPath();
      c.arc(-headR * 0.12, headY - headR * 1.18, headR * 0.14, 0, 7);
      c.fill();
    }
    if(!cap && look.hairStyle === "curly"){
      c.fillStyle = look.hair;
      for(let i = 0; i < 6; i++){
        const a = -2.4 + i * 0.55;
        c.beginPath();
        c.arc(Math.cos(a) * headR * 0.95, headY + Math.sin(a) * headR * 0.2, headR * 0.38, 0, 7);
        c.fill();
      }
    }
  }
  function hairFront(c, look, headY, headR, cap){
    c.fillStyle = look.hair;
    if(cap){
      c.beginPath();
      c.ellipse(-headR * 0.78, headY + headR * 0.15, headR * 0.28, headR * 0.42, 0.4, 0, 7);
      c.fill();
      c.beginPath();
      c.ellipse(headR * 0.78, headY + headR * 0.15, headR * 0.28, headR * 0.42, -0.4, 0, 7);
      c.fill();
    }else if(look.hairStyle === "bob"){
      c.beginPath();
      c.ellipse(0, headY + headR * 0.05, headR * 1.08, headR * 1.02, 0, 0, 7);
      c.fill();
    }else{
      c.beginPath();
      c.ellipse(0, headY - headR * 0.25, headR * 1.05, headR * 0.78, 0, Math.PI, 0, true);
      c.fill();
      c.beginPath();
      c.ellipse(-headR * 0.72, headY + headR * 0.15, headR * 0.32, headR * 0.55, 0.3, 0, 7);
      c.fill();
      c.beginPath();
      c.ellipse(headR * 0.72, headY + headR * 0.15, headR * 0.32, headR * 0.55, -0.3, 0, 7);
      c.fill();
    }
    if(look.streak){
      c.fillStyle = look.streak;
      c.beginPath();
      c.ellipse(headR * 0.32, headY - headR * 0.15, headR * 0.12, headR * 0.5, 0.35, 0, 7);
      c.fill();
    }
    c.fillStyle = "rgba(255,255,255,.32)";
    c.beginPath();
    c.ellipse(-headR * 0.32, headY - headR * 0.55, headR * 0.22, headR * 0.1, -0.6, 0, 7);
    c.fill();
  }
  function cap(c, k, headY, headR){
    c.fillStyle = shade(k.jacket, 0.9);
    c.beginPath();
    c.ellipse(0, headY - headR * 0.15, headR * 1.15, headR * 0.72, 0, Math.PI, 0, true);
    c.fill();
    c.fillStyle = shade(k.jacket, 0.72);
    c.beginPath();
    c.ellipse(headR * 0.05, headY + headR * 0.02, headR * 1.2, headR * 0.22, 0, 0, 7);
    c.fill();
    c.strokeStyle = k.trim || "#f0d060";
    c.lineWidth = Math.max(1.4, headR * 0.08);
    c.beginPath();
    c.ellipse(0, headY - headR * 0.08, headR * 0.95, headR * 0.2, 0, 0, Math.PI);
    c.stroke();
    c.fillStyle = "#f0d060";
    c.beginPath();
    c.arc(0, headY - headR * 0.55, headR * 0.16, 0, 7);
    c.fill();
    star(c, 0, headY - headR * 0.55, headR * 0.09, "#1a4f9c");
  }
  function face(c, look, headY, headR, mode, phase, blink){
    const g = c.createRadialGradient(-headR * 0.35, headY - headR * 0.4, headR * 0.2, 0, headY, headR * 1.2);
    g.addColorStop(0, shade(look.skin, 1.16));
    g.addColorStop(0.7, look.skin);
    g.addColorStop(1, shade(look.skin, 0.86));
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(0, headY, headR * 0.9, headR * 1.02, 0, 0, 7);
    c.fill();
    c.fillStyle = "rgba(255,255,255,.28)";
    c.beginPath();
    c.ellipse(-headR * 0.28, headY - headR * 0.35, headR * 0.28, headR * 0.16, -0.6, 0, 7);
    c.fill();
    eyes(c, look, headY, headR, blink);
    c.strokeStyle = shade(look.skin, 0.72);
    c.lineWidth = Math.max(1, headR * 0.05);
    c.beginPath();
    c.moveTo(0, headY + headR * 0.08);
    c.quadraticCurveTo(headR * 0.1, headY + headR * 0.28, 0, headY + headR * 0.3);
    c.stroke();
    c.fillStyle = "rgba(220,90,110,.28)";
    c.beginPath();
    c.ellipse(-headR * 0.48, headY + headR * 0.28, headR * 0.16, headR * 0.09, 0, 0, 7);
    c.ellipse(headR * 0.48, headY + headR * 0.28, headR * 0.16, headR * 0.09, 0, 0, 7);
    c.fill();
    if(look.freckles){
      c.fillStyle = "rgba(150,80,40,.45)";
      for(const [fx, fy] of [[-0.4, 0.22], [-0.28, 0.3], [0.3, 0.24], [0.42, 0.32]]){
        c.beginPath();
        c.arc(fx * headR, headY + fy * headR, Math.max(0.7, headR * 0.035), 0, 7);
        c.fill();
      }
    }
    mouth(c, look, headY, headR, mode, phase);
  }

  function drawWoman(c, look, style, phase, mode, H){
    const k = kit(style, look);
    const bob = mode === "walk" ? -Math.abs(Math.sin(phase * 3)) * 2 : Math.sin(phase * 1.35) * 1.1;
    const sway = mode === "walk" ? Math.sin(phase * 3) * 0.035 : Math.sin(phase * 1.15) * 0.012;
    const step = mode === "walk" ? Math.sin(phase * 3) : mode === "inspect" ? 0.2 : 0;
    c.save();
    c.translate(0, bob);
    c.rotate(sway);
    const hip = -H * 0.46;
    const headR = H * 0.115;
    const headY = -H * 0.8;
    if(k.cape){
      const cg = c.createLinearGradient(0, -H * 0.7, 0, -H * 0.15);
      cg.addColorStop(0, "#f7fbff");
      cg.addColorStop(1, "#c5d8f5");
      c.fillStyle = cg;
      c.beginPath();
      c.moveTo(-H * 0.05, -H * 0.7);
      c.quadraticCurveTo(-H * 0.32, -H * 0.45, -H * 0.2, -H * 0.18);
      c.lineTo(H * 0.2, -H * 0.18);
      c.quadraticCurveTo(H * 0.32, -H * 0.45, H * 0.05, -H * 0.7);
      c.fill();
      c.fillStyle = "#1a4f9c";
      c.fillRect(-H * 0.035, -H * 0.68, H * 0.07, H * 0.48);
    }
    hairBehind(c, look, headY, headR, phase, k.cap);
    const legThick = H * 0.075;
    limb(c, -H * 0.055, hip, H * 0.44, legThick, step * 0.45, k.pants, true);
    limb(c, H * 0.055, hip, H * 0.44, legThick, -step * 0.45, k.pants, true);
    if(k.dress){
      const dg = c.createLinearGradient(0, hip, 0, hip + H * 0.28);
      dg.addColorStop(0, shade(k.jacket, 1.15));
      dg.addColorStop(1, shade(k.jacket, 0.75));
      c.fillStyle = dg;
      c.beginPath();
      c.moveTo(-H * 0.1, hip + H * 0.02);
      c.quadraticCurveTo(-H * 0.22, hip + H * 0.18, -H * 0.16, hip + H * 0.3);
      c.lineTo(H * 0.16, hip + H * 0.3);
      c.quadraticCurveTo(H * 0.22, hip + H * 0.18, H * 0.1, hip + H * 0.02);
      c.closePath();
      c.fill();
      gloss(c, -H * 0.16, hip, H * 0.14, H * 0.28, 0.28);
    }else{
      c.fillStyle = k.pants;
      rr(c, -H * 0.115, hip - H * 0.02, H * 0.23, H * 0.1, H * 0.05);
      c.fill();
    }
    const top = -H * 0.72;
    const tg = c.createLinearGradient(-H * 0.2, top, H * 0.2, hip);
    tg.addColorStop(0, shade(k.jacket, 1.28));
    tg.addColorStop(0.4, k.jacket);
    tg.addColorStop(1, shade(k.jacket, 0.68));
    c.fillStyle = tg;
    c.beginPath();
    c.moveTo(-H * 0.16, top + H * 0.04);
    c.quadraticCurveTo(-H * 0.18, top - H * 0.02, -H * 0.08, top);
    c.lineTo(H * 0.08, top);
    c.quadraticCurveTo(H * 0.18, top - H * 0.02, H * 0.16, top + H * 0.04);
    c.quadraticCurveTo(H * 0.15, -H * 0.58, H * 0.07, -H * 0.56);
    c.quadraticCurveTo(H * 0.16, hip + H * 0.02, H * 0.12, hip + H * 0.04);
    c.lineTo(-H * 0.12, hip + H * 0.04);
    c.quadraticCurveTo(-H * 0.16, hip + H * 0.02, -H * 0.07, -H * 0.56);
    c.quadraticCurveTo(-H * 0.15, -H * 0.58, -H * 0.16, top + H * 0.04);
    c.closePath();
    c.fill();
    c.save();
    c.clip();
    gloss(c, -H * 0.18, top, H * 0.16, H * 0.28, 0.4);
    c.restore();
    const neck = k.blazer ? 0.09 : 0.045;
    c.fillStyle = k.shirt;
    c.beginPath();
    c.moveTo(0, top + H * 0.02);
    c.lineTo(-H * neck, top + H * 0.12);
    c.lineTo(0, top + H * (k.blazer ? 0.2 : 0.15));
    c.lineTo(H * neck, top + H * 0.12);
    c.closePath();
    c.fill();
    c.fillStyle = k.trim;
    c.fillRect(-H * 0.11, hip + H * 0.005, H * 0.22, H * 0.02);
    c.fillStyle = "#f0d060";
    c.beginPath();
    c.arc(0, hip + H * 0.015, H * 0.016, 0, 7);
    c.fill();
    c.fillStyle = "#f0d060";
    c.beginPath();
    c.arc(-H * 0.06, -H * 0.64, H * 0.02, 0, 7);
    c.fill();
    star(c, -H * 0.06, -H * 0.64, H * 0.012, "#1a4f9c");
    if(k.medals){
      c.fillStyle = "#f0d060";
      c.beginPath();
      c.arc(H * 0.05, -H * 0.62, H * 0.016, 0, 7);
      c.fill();
      c.fillStyle = "#e23b4a";
      c.beginPath();
      c.arc(H * 0.08, -H * 0.6, H * 0.014, 0, 7);
      c.fill();
    }
    if(k.vest){
      c.fillStyle = "rgba(16,24,34,.55)";
      rr(c, -H * 0.09, -H * 0.68, H * 0.18, H * 0.2, 6);
      c.fill();
      c.strokeStyle = k.trim;
      c.lineWidth = 1.4;
      c.stroke();
    }
    let bendL = 0.35, bendR = 0.35, angL = 0.15, angR = -0.15;
    if(mode === "walk"){
      angL = -step * 0.7;
      angR = step * 0.7;
      bendL = 0.45;
      bendR = 0.45;
    }else if(mode === "type"){
      angL = -0.9;
      angR = 0.9;
      bendL = 1.15 + Math.sin(phase * 12) * 0.12;
      bendR = 1.15 + Math.sin(phase * 12 + 1) * 0.12;
    }else if(mode === "papers"){
      angL = -0.4;
      angR = 0.7;
      bendL = 0.4;
      bendR = 1.2;
    }else if(mode === "guard"){
      angL = -0.7;
      angR = 0.7;
      bendL = 1.5;
      bendR = 1.5;
    }else if(mode === "talk"){
      angR = 0.55 + Math.sin(phase * 3) * 0.1;
      bendR = 1.05;
    }else if(mode === "inspect"){
      angR = 0.4;
      bendR = 0.8;
    }
    const armLen = H * 0.34, armT = H * 0.055;
    arm(c, -H * 0.15, -H * 0.68, armLen, armT, angL, k.jacket, look.skin, bendL);
    arm(c, H * 0.15, -H * 0.68, armLen, armT, angR, k.jacket, look.skin, bendR);
    if(mode === "type" || mode === "papers"){
      const py = -H * 0.5 + Math.sin(phase * (mode === "type" ? 10 : 3)) * H * 0.01;
      c.fillStyle = "#fffaf2";
      rr(c, -H * 0.07, py, H * 0.14, H * 0.09, 2);
      c.fill();
      c.strokeStyle = "#e2d2b4";
      c.stroke();
    }
    c.fillStyle = look.skin;
    rr(c, -H * 0.03, -H * 0.76, H * 0.06, H * 0.07, 4);
    c.fill();
    face(c, look, headY, headR, mode, phase, blinkAmt(look.hair + look.skin, phase));
    hairFront(c, look, headY, headR, k.cap);
    if(k.cap) cap(c, k, headY, headR);
    if(H > 78){
      c.fillStyle = "#f0d060";
      c.beginPath();
      c.arc(-headR * 0.95, headY + headR * 0.08, Math.max(1.2, H * 0.008), 0, 7);
      c.arc(headR * 0.95, headY + headR * 0.08, Math.max(1.2, H * 0.008), 0, 7);
      c.fill();
    }
    c.restore();
  }

  function drawDog(c, phase, sc){
    const wag = Math.sin(phase * 2.2);
    const step = Math.sin(phase * 8);
    c.fillStyle = "rgba(40,24,8,.25)";
    c.beginPath();
    c.ellipse(0, 3, sc * 0.42, sc * 0.09, 0, 0, 7);
    c.fill();
    c.save();
    c.translate(-sc * 0.32, -sc * 0.28);
    c.rotate(-0.9 + wag * 0.55);
    c.strokeStyle = "#6b4420";
    c.lineWidth = sc * 0.07;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(-sc * 0.16, -sc * 0.08, -sc * 0.05, -sc * 0.28);
    c.stroke();
    c.restore();
    const g = c.createLinearGradient(0, -sc * 0.55, 0, 0);
    g.addColorStop(0, "#e0a84a");
    g.addColorStop(0.45, "#b47830");
    g.addColorStop(1, "#6b4420");
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(-sc * 0.02, -sc * 0.28, sc * 0.36, sc * 0.18, 0, 0, 7);
    c.fill();
    c.fillStyle = "#f0d7a4";
    c.beginPath();
    c.ellipse(sc * 0.16, -sc * 0.22, sc * 0.12, sc * 0.1, 0.4, 0, 7);
    c.fill();
    c.fillStyle = "#3a2a18";
    [[-0.22, step], [-0.06, -step], [0.14, step], [0.26, -step]].forEach(([lx, dy]) => {
      rr(c, sc * lx, -sc * 0.16 + dy * sc * 0.02, sc * 0.07, sc * 0.2, 3);
      c.fill();
    });
    c.save();
    c.translate(sc * 0.3, -sc * 0.42 + Math.sin(phase * 2) * sc * 0.015);
    c.fillStyle = "#3a2a18";
    c.beginPath();
    c.ellipse(-sc * 0.02, -sc * 0.12, sc * 0.07, sc * 0.12, -0.4, 0, 7);
    c.fill();
    c.rotate(Math.sin(phase * 3) * 0.08);
    c.fillStyle = "#e0a84a";
    c.beginPath();
    c.ellipse(0, 0, sc * 0.15, sc * 0.13, 0, 0, 7);
    c.fill();
    c.fillStyle = "#f3ddb4";
    c.beginPath();
    c.ellipse(sc * 0.1, sc * 0.03, sc * 0.08, sc * 0.055, 0, 0, 7);
    c.fill();
    c.fillStyle = "#1a1a1a";
    c.beginPath();
    c.arc(sc * 0.16, sc * 0.02, sc * 0.02, 0, 7);
    c.fill();
    c.beginPath();
    c.arc(sc * 0.02, -sc * 0.02, sc * 0.018, 0, 7);
    c.fill();
    c.fillStyle = "#fff";
    c.beginPath();
    c.arc(sc * 0.026, -sc * 0.026, sc * 0.006, 0, 7);
    c.fill();
    if(Math.sin(phase * 8) > 0){
      c.fillStyle = "#e07070";
      c.beginPath();
      c.ellipse(sc * 0.12, sc * 0.08, sc * 0.02, sc * 0.035, 0, 0, 7);
      c.fill();
    }
    c.fillStyle = "#c0392b";
    rr(c, -sc * 0.02, sc * 0.02, sc * 0.08, sc * 0.035, 2);
    c.fill();
    c.restore();
  }

  function drawCar(c, x, y, t, moving){
    const w = Math.min(W * 0.46, 210), h = w * 0.46;
    const blink = Math.sin(t * (moving ? 18 : 7));
    c.save();
    c.translate(x, y);
    c.fillStyle = "rgba(20,16,10,.28)";
    c.beginPath();
    c.ellipse(0, 6, w * 0.42, 8, 0, 0, 7);
    c.fill();
    c.fillStyle = blink > 0 ? "rgba(255,50,50,.35)" : "rgba(40,100,255,.35)";
    c.beginPath();
    c.ellipse(0, 8, w * 0.36, 10, 0, 0, 7);
    c.fill();
    const body = c.createLinearGradient(0, -h, 0, -h * 0.1);
    body.addColorStop(0, "#6aafff");
    body.addColorStop(0.35, "#1d5ed8");
    body.addColorStop(1, "#0c2f78");
    c.fillStyle = body;
    rr(c, -w / 2, -h * 0.95, w, h * 0.72, h * 0.18);
    c.fill();
    gloss(c, -w / 2, -h * 0.95, w, h * 0.28, 0.4);
    c.fillStyle = "#d7f1ff";
    rr(c, -w * 0.22, -h * 0.98, w * 0.42, h * 0.32, 8);
    c.fill();
    c.fillStyle = "rgba(255,255,255,.55)";
    c.fillRect(-w * 0.16, -h * 0.92, w * 0.08, h * 0.12);
    c.fillStyle = "#f7f9fc";
    c.fillRect(-w / 2, -h * 0.48, w, h * 0.08);
    const checkers = 8;
    for(let i = 0; i < checkers; i++){
      c.fillStyle = i % 2 ? "#1a1a1a" : "#f4f6f8";
      c.fillRect(-w / 2 + (w * i) / checkers, -h * 0.4, w / checkers + 0.5, h * 0.045);
    }
    c.fillStyle = "#0e2f72";
    c.font = "800 " + Math.max(9, w * 0.07) + "px Nunito, sans-serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("POLICE", -w * 0.12, -h * 0.52);
    c.font = "700 " + Math.max(8, w * 0.055) + "px NotoSerifHebrew, serif";
    c.fillText("משטרה", w * 0.22, -h * 0.52);
    for(const wx of [-w * 0.28, w * 0.28]){
      c.fillStyle = "#1a1a1a";
      c.beginPath();
      c.ellipse(wx, -h * 0.16, w * 0.09, h * 0.12, 0, 0, 7);
      c.fill();
      c.fillStyle = "#d5dbe6";
      c.beginPath();
      c.ellipse(wx, -h * 0.16, w * 0.035, h * 0.045, 0, 0, 7);
      c.fill();
    }
    c.fillStyle = blink > 0 ? "#ff2d2d" : "#2f6bff";
    rr(c, -w * 0.16, -h * 1.08, w * 0.12, h * 0.1, 3);
    c.fill();
    c.fillStyle = blink > 0 ? "#2f6bff" : "#ff2d2d";
    rr(c, w * 0.04, -h * 1.08, w * 0.12, h * 0.1, 3);
    c.fill();
    c.globalCompositeOperation = "lighter";
    const glow = blink > 0 ? "rgba(255,40,40,.55)" : "rgba(40,110,255,.5)";
    c.fillStyle = glow;
    c.beginPath();
    c.arc(blink > 0 ? -w * 0.1 : w * 0.1, -h, w * 0.18, 0, 7);
    c.fill();
    c.restore();
  }

  function bubble(c, x, y, text){
    c.save();
    c.font = "800 11px Nunito, sans-serif";
    const raw = String(text);
    const shown = raw.length > 42 ? raw.slice(0, 40) + "…" : raw;
    const tw = Math.min(148, c.measureText(shown).width);
    const w = tw + 16, h = 22;
    c.translate(x, y - h);
    c.fillStyle = "#fffdf8";
    rr(c, -w / 2, 0, w, h, 11);
    c.fill();
    c.strokeStyle = "#f0d060";
    c.lineWidth = 1.5;
    c.stroke();
    c.beginPath();
    c.moveTo(-5, h - 1);
    c.lineTo(0, h + 6);
    c.lineTo(5, h - 1);
    c.fill();
    c.fillStyle = "#1c3358";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(shown, 0, h / 2 + 0.5);
    c.restore();
  }

  function blinkAmt(id, phase){
    let hsh = 0;
    const s = String(id);
    for(let i = 0; i < s.length; i++) hsh = (hsh * 33 + s.charCodeAt(i)) >>> 0;
    const period = 3.1 + (hsh % 17) / 8;
    const u = (phase + (hsh % 9)) % period;
    if(u < 0.12) return Math.sin((u / 0.12) * Math.PI);
    return 0;
  }
  function jobOf(a, S){
    if(a.kind === "dog") return "dog";
    if(a.walk) return "walk";
    if(a.kind === "hero"){
      const room = a.roam;
      if(S.rooms[room] && S.rooms[room].work){
        if(room === "reception" || room === "press" || room === "chief" || room === "electric") return "type";
        if(room === "detective" || room === "suggest" || room === "armory") return "papers";
        if(room === "garage" || room === "gasstation") return "inspect";
        if(room === "interrog") return "talk";
      }
      if(room === "cells") return "guard";
    }
    if(a.say) return "talk";
    return "idle";
  }
  function styleOf(a, S){
    if(a.kind === "hero"){
      const st = S.heroes[a.hid] && S.heroes[a.hid].outfit;
      return (typeof normalizeStyle === "function") ? normalizeStyle(st) : (st || "patrol");
    }
    if(a.kind === "vip") return "vip";
    if(a.kind === "citizen" || a.kind === "ambient" && LOOK[a.spr] && LOOK[a.spr].dress) return "civ";
    if(a.kind === "citizen") return "civ";
    if(a.kind === "suspect") return "suspect";
    if(a.kind === "inmate") return "inmate";
    return "patrol";
  }

  function drawClouds(c, t){
    const wh = H / 2;
    c.save();
    c.beginPath();
    c.rect(0, 0, W, wh * 0.32);
    c.rect(0, wh, W, wh * 0.26);
    c.clip();
    const blobs = [[0.12, 0.08, 1, 28], [0.48, 0.12, 0.8, 36], [0.78, 0.06, 1.1, 22], [0.3, 0.55, 0.85, 30], [0.72, 0.58, 1, 26]];
    blobs.forEach(([fx, fy, s, sp], i) => {
      const x = ((fx * W + t * sp * (reduce ? 0.2 : 1)) % (W + 180)) - 90;
      const y = (i < 3 ? 0 : wh) + fy * wh;
      c.fillStyle = "rgba(255,255,255,.88)";
      c.beginPath();
      c.ellipse(x, y, 48 * s, 16 * s, 0, 0, 7);
      c.ellipse(x + 28 * s, y + 4, 32 * s, 14 * s, 0, 0, 7);
      c.ellipse(x - 26 * s, y + 5, 28 * s, 12 * s, 0, 0, 7);
      c.fill();
    });
    c.restore();
  }
  function palm(c, x, y, t, sc){
    const sway = Math.sin(t * 0.8) * 4 * sc;
    c.strokeStyle = "#6b4424";
    c.lineWidth = 5 * sc;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(x + 8 * sc, y - 36 * sc, x + sway, y - 72 * sc);
    c.stroke();
    const topx = x + sway, topy = y - 72 * sc;
    for(let i = 0; i < 7; i++){
      const a = -2.6 + i * 0.55 + Math.sin(t * 1.6 + i) * 0.18;
      c.strokeStyle = i % 2 ? "#1c7a3a" : "#3cb864";
      c.lineWidth = 3 * sc;
      c.beginPath();
      c.moveTo(topx, topy);
      c.quadraticCurveTo(topx + Math.cos(a) * 26 * sc, topy + Math.sin(a) * 10 * sc, topx + Math.cos(a) * 52 * sc, topy + Math.sin(a) * 20 * sc);
      c.stroke();
    }
  }
  function drawFlag(c, x, y, t, h){
    c.strokeStyle = "#f4efe4";
    c.lineWidth = 3;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(x, y + 6);
    c.lineTo(x, y - h);
    c.stroke();
    c.fillStyle = "#f0d060";
    c.beginPath();
    c.arc(x, y - h, 3.5, 0, 7);
    c.fill();
    const cols = 12, fw = h * 1.45, fh = h * 0.72;
    const wave = reduce ? 0.3 : 1;
    const bands = [[0, 0.18, "#0038b8"], [0.18, 0.82, "#ffffff"], [0.82, 1, "#0038b8"]];
    const flagPt = (u, v) => {
      const wy = Math.sin(u * 5.2 + t * 3.2) * u * h * 0.16 * wave + Math.sin(t * 2.2 + v * 3) * 1.6;
      return {x:x + 3 + u * fw, y:y - h + 6 + v * fh + wy};
    };
    for(const [v0, v1, col] of bands){
      for(let coln = 0; coln < cols; coln++){
        const u0 = coln / cols, u1 = (coln + 1) / cols;
        const a = flagPt(u0, v0), b = flagPt(u1, v0), d = flagPt(u1, v1), e = flagPt(u0, v1);
        c.beginPath();
        c.moveTo(a.x, a.y);
        c.lineTo(b.x, b.y);
        c.lineTo(d.x, d.y);
        c.lineTo(e.x, e.y);
        c.closePath();
        c.fillStyle = col;
        c.fill();
      }
    }
    const mid = flagPt(0.42, 0.5);
    star(c, mid.x, mid.y, fh * 0.18, "#0038b8");
  }

  function paintLive(c, S){
    hits.length = 0;
    const t = time;
    const wh = H / 2;
    drawClouds(c, t);
    [[W * 0.02, wh * 0.46, 1], [W * 0.99, wh * 0.42, 0.9], [W * 0.03, wh + wh * 0.4, 0.85], [W * 0.98, wh + wh * 0.38, 0.8]].forEach((p, i) => {
      palm(c, p[0], p[1], t + i, p[2]);
    });
    drawFlag(c, W * 0.1, wh * 0.2, t, Math.max(42, Math.min(78, W * 0.16)));
    drawFlag(c, W * 0.84, wh + wh * 0.16, t + 1.3, Math.max(34, Math.min(60, W * 0.12)));
    for(const l of lamps){
      const pulse = 0.45 + Math.sin(t * 2.2 + l.x * 0.01) * 0.2;
      const rad = c.createRadialGradient(l.x, l.y, 2, l.x, l.y, l.r);
      if(l.hue){
        rad.addColorStop(0, l.hue);
        rad.addColorStop(1, "rgba(0,0,0,0)");
        c.globalAlpha = 0.45 + Math.sin(t * 6 + l.y) * 0.35;
      }else if(l.cool){
        rad.addColorStop(0, "rgba(150,220,255," + pulse + ")");
        rad.addColorStop(1, "rgba(150,220,255,0)");
        c.globalAlpha = 0.8;
      }else{
        rad.addColorStop(0, "rgba(255,220,140," + pulse + ")");
        rad.addColorStop(1, "rgba(255,200,80,0)");
        c.globalAlpha = 0.9;
      }
      c.fillStyle = rad;
      c.beginPath();
      c.arc(l.x, l.y, l.r, 0, 7);
      c.fill();
      c.globalAlpha = 1;
    }
    if(!reduce){
      for(let i = 0; i < 18; i++){
        const u = (i * 0.17 + t * 0.02) % 1;
        const x = ((i * 97) % 100) / 100 * W + Math.sin(t + i) * 6;
        const y = u * H;
        c.fillStyle = i % 3 ? "rgba(255,255,255,.7)" : "rgba(255,220,140,.75)";
        c.beginPath();
        c.arc(x, y, (i % 3) * 0.45 + 0.7, 0, 7);
        c.fill();
      }
    }
    const list = [];
    const fig = Math.max(64, Math.min(92, wh * 0.118));
    if(S.actors){
      for(const a of S.actors){
        if(a.life === 0) continue;
        const p = pt(a.wing || 1, a.x, a.y);
        list.push({y:p.y, a, p});
      }
    }
    if(S.car){
      const p = pt(1, S.car.x || (LAYOUT.garage && LAYOUT.garage.ax) || 40, S.car.y || (LAYOUT.garage && LAYOUT.garage.ay) || 88);
      list.push({y:p.y + 8, car:true, p});
    }
    list.sort((a, b) => a.y - b.y);
    for(const it of list){
      if(it.car){
        drawCar(c, it.p.x + fig * 0.55, it.p.y, t, S.car && S.car.state !== "idle");
        continue;
      }
      const a = it.a;
      const p = it.p;
      const look = LOOK[a.hid || a.spr] || LOOK.nika;
      const dog = a.kind === "dog" || a.spr === "rika";
      const mode = jobOf(a, S);
      const phase = t * (reduce ? 0.35 : 1) + (a.phase || 0);
      const hop = a.react > 0 ? Math.sin(Math.min(1, a.react) * Math.PI) * -8 : 0;
      const Hh = dog ? fig * 0.72 : (a.kind === "inmate" ? fig * 0.9 : fig);
      c.save();
      c.translate(p.x, p.y + hop);
      if(a.flip) c.scale(-1, 1);
      c.fillStyle = "rgba(30,20,10,.28)";
      c.beginPath();
      c.ellipse(0, 4, Hh * 0.18, 5.5, 0, 0, 7);
      c.fill();
      const lv = a.kind === "hero" && S.heroes[a.hid] ? S.heroes[a.hid].level : 1;
      if(a.kind === "hero" && lv >= 6){
        const col = lv >= 10 ? "120,180,255" : "255,210,90";
        const aura = c.createRadialGradient(0, -Hh * 0.5, 4, 0, -Hh * 0.4, Hh * 0.55);
        aura.addColorStop(0, "rgba(" + col + ",.35)");
        aura.addColorStop(1, "rgba(" + col + ",0)");
        c.fillStyle = aura;
        c.beginPath();
        c.ellipse(0, -Hh * 0.45, Hh * 0.28, Hh * 0.45, 0, 0, 7);
        c.fill();
      }
      if(dog) drawDog(c, phase, Hh);
      else drawWoman(c, look, styleOf(a, S), phase, mode, Hh);
      c.restore();
      if(a.say) bubble(c, p.x, p.y - Hh - 8, a.say);
      hits.push({id:a.id, x:p.x - Hh * 0.22, y:p.y - Hh, w:Hh * 0.44, h:Hh + 12});
      if(a.react > 0) a.react = Math.max(0, a.react - 0.016);
    }
    paintSigns(c, S);
  }
  function paintSigns(c, S){
    if(typeof ROOM_ORDER === "undefined" || typeof roomDecorTier !== "function") return;
    for(const id of ROOM_ORDER){
      const r = roomRect(id);
      const locked = S.chiefLv < (ROOMS[id].unlock || 1);
      const d = locked ? roomDecorTier(1) : roomDecorTier((S.rooms[id] && S.rooms[id].level) || 1);
      const sign = (typeof ROOM_SIGNS !== "undefined" && ROOM_SIGNS[id]) || {en:id, he:""};
      plaque(c, r.x + r.w / 2, r.y + 5, sign.en, sign.he, d, Math.max(48, r.w - 8));
    }
  }

  function frame(ts, S){
    if(!cv || !ctx || !S) return;
    resize();
    if(W < 2 || H < 2) return;
    time = ((ts || 0) / 1000) * (reduce ? 0.35 : 1);
    const key = ROOM_ORDER.map(id => (S.rooms[id] ? S.rooms[id].level : 1) + (S.chiefLv >= ROOMS[id].unlock ? "o" : "x")).join(".") + "|" + (W | 0) + "x" + (H | 0) + "@" + dpr;
    if(key !== cacheKey){
      try { paintStatic(S); cacheKey = key; }
      catch(e){ console.error(e); }
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#7ecfff";
    ctx.fillRect(0, 0, W, H);
    if(off.width) ctx.drawImage(off, 0, 0, off.width / dpr, off.height / dpr);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    try { paintLive(ctx, S); }
    catch(e){ console.error(e); }
  }

  function pick(x, y){
    for(let i = hits.length - 1; i >= 0; i--){
      const h = hits[i];
      if(x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return h.id;
    }
    return null;
  }

  function paintPreview(canvas, id, level){
    if(!canvas || typeof roomDecorTier !== "function") return;
    const c = canvas.getContext("2d");
    const w = canvas.width, h = canvas.height;
    const d = roomDecorTier(level);
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, w, h);
    drawSky(c, 0, 0, w, h * 0.42);
    const rect = {x:16, y:h * 0.18, w:w - 32, h:h * 0.76};
    const prev = baking;
    baking = false;
    c.save();
    c.shadowColor = "rgba(50,30,10,.2)";
    c.shadowBlur = 12;
    c.shadowOffsetY = 6;
    c.fillStyle = "#e7c896";
    rr(c, rect.x, rect.y, rect.w, rect.h, 16);
    c.fill();
    c.restore();
    stone(c, rect.x, rect.y, rect.w, rect.h, level);
    floor(c, rect.x + 6, rect.y + rect.h * 0.32, rect.w - 12, rect.h * 0.62, d);
    const sign = (typeof ROOM_SIGNS !== "undefined" && ROOM_SIGNS[id]) || {en:id, he:""};
    plaque(c, rect.x + rect.w / 2, rect.y + 8, sign.en, sign.he, d, rect.w * 0.8);
    furnish(c, id, rect, d);
    const who = ROOM_FACE[id] || "anna";
    const style = (typeof bestStyle === "function") ? bestStyle(level) : "patrol";
    c.save();
    c.translate(rect.x + rect.w * 0.72, rect.y + rect.h * 0.9);
    drawWoman(c, LOOK[who] || LOOK.anna, style, 0.8, "idle", rect.h * 0.62);
    c.restore();
    baking = prev;
  }

  function drawPortrait(c, w, h, who, style, locked){
    const look = LOOK[who] || LOOK.nika;
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#8fd4ff");
    g.addColorStop(0.45, "#e7f6ff");
    g.addColorStop(1, "#1a4f9c");
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    const rad = c.createRadialGradient(w * 0.45, h * 0.28, 10, w * 0.5, h * 0.4, w * 0.75);
    rad.addColorStop(0, "rgba(255,255,255,.5)");
    rad.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = rad;
    c.fillRect(0, 0, w, h);
    c.lineJoin = "round";
    c.lineCap = "round";
    if(h / w < 1.2){
      const R = Math.min(w, h) * 0.38;
      c.save();
      c.translate(w / 2, h * 0.56);
      const k = kit(style, look);
      c.fillStyle = k.jacket;
      c.beginPath();
      c.ellipse(0, R * 1.15, R * 1.45, R * 0.85, 0, 0, 7);
      c.fill();
      gloss(c, -R, R * 0.7, R * 0.7, R * 0.6, 0.35);
      c.fillStyle = look.skin;
      rr(c, -R * 0.22, R * 0.45, R * 0.44, R * 0.4, 6);
      c.fill();
      hairBehind(c, look, 0, R, 0.4, k.cap);
      face(c, look, 0, R, "idle", 0.4, 0);
      hairFront(c, look, 0, R, k.cap);
      if(k.cap) cap(c, k, 0, R);
      c.restore();
    }else{
      c.save();
      c.translate(w / 2, h * 0.94);
      drawWoman(c, look, style, 0.6, "idle", h * 0.84);
      c.restore();
    }
    if(locked){
      c.fillStyle = "rgba(12,22,40,.5)";
      c.fillRect(0, 0, w, h);
      c.fillStyle = "#fff";
      c.font = "700 " + Math.round(h * 0.16) + "px Nunito, sans-serif";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText("🔒", w / 2, h * 0.56);
    }
  }
  function paintFaces(root){
    const scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll("canvas.face").forEach(node => {
      const w = node.width || 360, h = node.height || 440;
      const c = node.getContext("2d");
      if(!c) return;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, w, h);
      const raw = node.dataset.style || "patrol";
      const special = raw === "civ" || raw === "suspect" || raw === "inmate" || raw === "vip";
      const style = special ? raw : ((typeof normalizeStyle === "function") ? normalizeStyle(raw) : raw);
      drawPortrait(c, w, h, node.dataset.who || "nika", style, node.dataset.locked === "1");
    });
  }

  return {init, resize, frame, pick, paintPreview, preload, heroImage, paintFaces};
})();
