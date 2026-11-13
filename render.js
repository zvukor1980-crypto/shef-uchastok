/* Живой лаковый участок: Иерусалим, 60fps, реалистичные женщины. */
window.Scene = (() => {
  let cv, ctx, off, W = 0, H = 0, dpr = 1, cacheKey = "";
  let reduce = false, time = 0, baking = false;
  const imgs = Object.create(null);
  let have = null;
  const lamps = [], screens = [];
  let hits = [];
  const skySrc = "assets/scene/jerusalem.webp";
  const SKIN = {
    anna:"#c48a62", marina:"#e6c2ae", olga:"#f0c7a8", darya:"#f3c2a4", elena:"#d7a98a",
    irina:"#8a5a3c", victoria:"#f3d4c6", katya:"#e7b898", sofia:"#c98962", alina:"#f6d7c8",
    natalya:"#c48a5a", polina:"#f0c4a8", liana:"#c9956a", tamar:"#a56b45", yael:"#d7b094",
    noa:"#6b3e2a", miriam:"#c48a62", liora:"#f0cbb8", roni:"#e0b090", shira:"#e8c8b0", maya:"#d0a07a"
  };

  function init(canvas){
    cv = canvas;
    ctx = cv.getContext("2d", {alpha:false});
    off = document.createElement("canvas");
    reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
    const parent = cv.parentElement;
    if(parent && window.ResizeObserver){
      new ResizeObserver(() => resize()).observe(parent);
    }
    resize();
    loadManifest();
  }
  function resize(){
    if(!cv || !cv.parentElement) return;
    const r = cv.parentElement.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    const nw = Math.max(0, r.width), nh = Math.max(0, r.height);
    if(Math.abs(nw - W) < 1 && Math.abs(nh - H) < 1) return;
    W = nw; H = nh;
    if(W < 2 || H < 2) return;
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    cv.style.width = W + "px";
    cv.style.height = H + "px";
    cacheKey = "";
  }
  function known(src){ return !!(have && have.has(src)); }
  function get(src){
    if(!src || !known(src)) return null;
    let im = imgs[src];
    if(!im){
      im = new Image();
      im.decoding = "async";
      im.onload = () => { im._ok = 1; if(src === skySrc) cacheKey = ""; };
      im.onerror = () => { im._bad = 1; };
      im.src = src;
      imgs[src] = im;
    }
    return im._ok ? im : null;
  }
  function loadManifest(){
    fetch("assets/cast/manifest.json").then(r => r.ok ? r.json() : []).then(list => {
      have = new Set(list || []);
      have.add(skySrc);
      get(skySrc);
      if(list) list.forEach(get);
    }).catch(() => { have = null; get(skySrc); });
  }
  function preload(S){
    get(skySrc);
    const ids = HERO_ORDER.concat(["liana","tamar"]);
    const styles = ["patrol","parade","detective","tactical","elite"];
    ids.forEach(id => styles.forEach(s => get("assets/cast/" + id + "/" + s + ".webp")));
    ["yael","noa","miriam","liora"].forEach(id => get("assets/cast/civ/" + id + ".webp"));
    ["roni","shira","maya"].forEach(id => get("assets/cast/suspect/" + id + ".webp"));
    get("assets/cast/dog/rika.webp");
    if(S){ /* touch current outfits so a pinned style is warm */ }
  }
  function heroImage(id, style){
    const order = [style, "elite", "tactical", "detective", "parade", "patrol"].filter(Boolean);
    const seen = new Set();
    for(const s of order){
      if(seen.has(s)) continue;
      seen.add(s);
      const im = get("assets/cast/" + id + "/" + s + ".webp");
      if(im) return im;
    }
    return null;
  }
  function actorImage(a, S){
    if(a.kind === "dog" || a.spr === "rika") return get("assets/cast/dog/rika.webp");
    if(a.kind === "hero"){
      const st = (S.heroes[a.hid] && S.heroes[a.hid].outfit) || "patrol";
      const norm = window.normalizeStyle ? normalizeStyle(st) : st;
      return heroImage(a.hid || a.spr, norm);
    }
    if(a.kind === "ambient") return heroImage(a.spr, "patrol");
    if(a.kind === "citizen" || a.kind === "vip") return get("assets/cast/civ/" + (a.spr || "yael") + ".webp") || get("assets/cast/civ/yael.webp");
    if(a.kind === "suspect" || a.kind === "inmate"){
      return get("assets/cast/suspect/" + (a.spr || "roni") + ".webp") || get("assets/cast/suspect/roni.webp");
    }
    return heroImage(a.spr, "patrol");
  }

  function rr(c, x, y, w, h, r){
    const rad = Math.max(0, Math.min(r || 0, w / 2, h / 2));
    c.beginPath();
    c.moveTo(x + rad, y);
    c.arcTo(x + w, y, x + w, y + h, rad);
    c.arcTo(x + w, y + h, x, y + h, rad);
    c.arcTo(x, y + h, x, y, rad);
    c.arcTo(x, y, x + w, y, rad);
    c.closePath();
  }
  function shade(hex, k){
    const n = parseInt(String(hex).slice(1), 16);
    if(!Number.isFinite(n)) return hex;
    const ch = i => Math.max(0, Math.min(255, ((n >> i) & 255) * k));
    return "rgb(" + (ch(16)|0) + "," + (ch(8)|0) + "," + (ch(0)|0) + ")";
  }
  function fillRR(c, x, y, w, h, r, fill){
    rr(c, x, y, w, h, r); c.fillStyle = fill; c.fill();
  }
  function stone(c, x, y, w, h, lux){
    const g = c.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, lux >= 7 ? "#f8e7c4" : "#f1d7ae");
    g.addColorStop(0.45, "#e4c48f");
    g.addColorStop(1, lux >= 4 ? "#cda56a" : "#c49a62");
    fillRR(c, x, y, w, h, 16, g);
    c.save(); rr(c, x, y, w, h, 16); c.clip();
    const bw = Math.max(18, w / 14), bh = Math.max(10, h / 28);
    for(let yy = y; yy < y + h; yy += bh){
      const shift = ((yy / bh) | 0) % 2 ? bw / 2 : 0;
      for(let xx = x - bw; xx < x + w; xx += bw){
        c.strokeStyle = "rgba(120,80,30,.18)";
        c.strokeRect(xx + shift, yy, bw, bh);
        c.fillStyle = "rgba(255,255,255,.05)";
        c.fillRect(xx + shift, yy, bw, 2);
      }
    }
    const gloss = c.createLinearGradient(x, y, x + w, y + h * 0.4);
    gloss.addColorStop(0, "rgba(255,255,255," + (0.18 + Math.min(lux, 10) * 0.025) + ")");
    gloss.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = gloss; c.fillRect(x, y, w, h * 0.45);
    c.restore();
  }
  function floor(c, x, y, w, h, d){
    const lv = d.level || 1;
    c.save(); rr(c, x, y, w, h, 10); c.clip();
    if(d.marble){
      const g = c.createLinearGradient(x, y, x + w, y + h);
      g.addColorStop(0, "#f7f1e6");
      g.addColorStop(0.5, "#e6d9c6");
      g.addColorStop(1, "#cbbba4");
      c.fillStyle = g; c.fillRect(x, y, w, h);
    }else{
      const g = c.createLinearGradient(x, y, x, y + h);
      g.addColorStop(0, "#6fa0d8");
      g.addColorStop(1, "#3c6eae");
      c.fillStyle = g; c.fillRect(x, y, w, h);
    }
    const ts = Math.max(12, 28 - Math.min(10, lv));
    for(let yy = y; yy < y + h; yy += ts){
      for(let xx = x; xx < x + w; xx += ts){
        const alt = (((xx / ts) | 0) + ((yy / ts) | 0)) & 1;
        c.fillStyle = d.marble
          ? (alt ? "rgba(255,255,255,.2)" : "rgba(90,60,20,.05)")
          : (alt ? "rgba(255,255,255,.22)" : "rgba(8,30,70,.14)");
        c.fillRect(xx, yy, ts, ts);
        if(d.gold){
          c.strokeStyle = "rgba(212,168,74," + (0.35 + lv * 0.03) + ")";
          c.lineWidth = 1;
          c.strokeRect(xx + 0.5, yy + 0.5, ts - 1, ts - 1);
        }
      }
    }
    if(d.medallion){
      c.beginPath();
      c.ellipse(x + w / 2, y + h * 0.62, w * 0.16, h * 0.12, 0, 0, 7);
      c.fillStyle = d.lacquer ? "rgba(70,120,220,.28)" : "rgba(212,168,74,.28)";
      c.fill();
      c.strokeStyle = "#e6c56a"; c.lineWidth = 1.5; c.stroke();
      star(c, x + w / 2, y + h * 0.62, Math.min(w, h) * 0.06, "#e6c56a");
    }
    const sheen = c.createLinearGradient(x, y, x + w * 0.8, y + h);
    sheen.addColorStop(0, "rgba(255,255,255," + d.gloss + ")");
    sheen.addColorStop(0.45, "rgba(255,255,255,0)");
    sheen.addColorStop(0.75, "rgba(255,255,255," + (d.gloss * 0.45) + ")");
    c.fillStyle = sheen; c.fillRect(x, y, w, h);
    c.restore();
  }
  function star(c, x, y, r, color){
    c.save();
    c.translate(x, y);
    c.strokeStyle = color; c.lineWidth = Math.max(1, r * 0.18); c.lineJoin = "round";
    function tri(rot){
      c.beginPath();
      for(let i = 0; i < 3; i++){
        const a = rot + i * Math.PI * 2 / 3 - Math.PI / 2;
        const px = Math.cos(a) * r, py = Math.sin(a) * r;
        i ? c.lineTo(px, py) : c.moveTo(px, py);
      }
      c.closePath(); c.stroke();
    }
    tri(0); tri(Math.PI);
    c.restore();
  }
  function windowView(c, x, y, w, h){
    c.save();
    rr(c, x, y, w, h, 4); c.clip();
    const sky = imgs[skySrc];
    if(sky && sky._ok) c.drawImage(sky, 0, 0, sky.width, sky.height * 0.7, x - w, y - h * 0.2, w * 3, h * 1.8);
    else { c.fillStyle = "#8fd0f2"; c.fillRect(x, y, w, h); }
    c.fillStyle = "rgba(255,255,255,.28)";
    c.fillRect(x, y, w * 0.18, h);
    const gl = c.createLinearGradient(x, y, x + w, y + h);
    gl.addColorStop(0, "rgba(255,255,255,.45)");
    gl.addColorStop(0.5, "rgba(255,255,255,0)");
    c.fillStyle = gl; c.fillRect(x, y, w, h);
    c.restore();
    c.strokeStyle = "rgba(255,255,255,.7)"; c.lineWidth = 1.5;
    rr(c, x, y, w, h, 4); c.stroke();
    if(baking) screens.push({x:x + w / 2, y:y + h / 2, r:Math.max(w, h)});
  }
  function lacquer(c, x, y, w, h, color, d, rad){
    const lv = (d && d.level) || 1;
    rr(c, x, y, w, h, rad || 8);
    const g = c.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, shade(color, 1.28));
    g.addColorStop(0.42, color);
    g.addColorStop(1, shade(color, 0.62));
    c.fillStyle = g; c.fill();
    c.save(); rr(c, x, y, w, h * 0.48, rad || 8); c.clip();
    const s = c.createLinearGradient(x, y, x + w, y + h);
    s.addColorStop(0, "rgba(255,255,255," + Math.min(0.7, 0.28 + lv * 0.04) + ")");
    s.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = s; c.fillRect(x, y, w, h);
    c.restore();
    if(d && d.gold){
      c.strokeStyle = "rgba(230,197,106,.95)"; c.lineWidth = 1.6;
      rr(c, x, y, w, h, rad || 8); c.stroke();
    }
  }
  function plaque(c, cx, y, en, he, d){
    c.save();
    c.font = "800 " + Math.max(8, Math.min(12, W / 34)) + "px Nunito, sans-serif";
    const tw = Math.max(c.measureText(en || "").width, 54);
    const w = tw + 22, h = he ? 28 : 18;
    const x = cx - w / 2;
    lacquer(c, x, y, w, h, (d && d.lacquer) ? "#163e86" : "#1a4f9c", d || {level:1, gold:true}, 8);
    c.fillStyle = "#fff8e8";
    c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText(en || "", cx, y + (he ? 9 : h / 2));
    if(he){
      c.font = "700 " + Math.max(8, Math.min(11, W / 38)) + "px NotoSerifHebrew, sans-serif";
      c.fillStyle = "#ffe7a3";
      c.fillText(he, cx, y + 20);
    }
    c.restore();
  }
  function plant(c, x, y, h){
    c.fillStyle = "#8a5a32";
    rr(c, x - 6, y - 8, 12, 10, 2); c.fill();
    c.fillStyle = "#1f8a45";
    c.beginPath(); c.ellipse(x, y - h * 0.45, h * 0.22, h * 0.28, 0, 0, 7); c.fill();
    c.fillStyle = "#46b86a";
    c.beginPath(); c.ellipse(x - 4, y - h * 0.55, h * 0.12, h * 0.16, 0, 0, 7); c.fill();
    c.fillStyle = "rgba(255,255,255,.35)";
    c.beginPath(); c.ellipse(x - 3, y - h * 0.62, 3, 6, -0.4, 0, 7); c.fill();
  }
  function screen(c, x, y, w, h, d){
    lacquer(c, x, y, w, h, "#101820", d, 3);
    c.fillStyle = "#7fd0ff";
    c.fillRect(x + 2, y + 2, w - 4, h - 6);
    c.fillStyle = "rgba(255,255,255,.55)";
    c.fillRect(x + 3, y + 3, w * 0.35, 2);
    if(baking) screens.push({x:x + w / 2, y:y + h / 2, r:w});
  }
  function lamp(c, x, y, h, d){
    c.strokeStyle = (d && d.gold) ? "#e6c56a" : "#d9dde6";
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + h * 0.45); c.stroke();
    c.fillStyle = "#fff4c8";
    c.beginPath(); c.ellipse(x, y + h * 0.55, 7, 4, 0, 0, 7); c.fill();
    if(baking) lamps.push({x, y:y + h * 0.62, r:28 + ((d && d.level) || 1) * 2});
  }
  function chair(c, x, y, w, h, color){
    lacquer(c, x, y, w, h, color, {level:2, gold:false}, 4);
    c.fillStyle = shade(color, 0.75);
    c.fillRect(x + w * 0.35, y + h * 0.7, w * 0.12, h * 0.35);
    c.fillRect(x + w * 0.62, y + h * 0.7, w * 0.12, h * 0.35);
  }
  function column(c, x, y, h){
    const g = c.createLinearGradient(x, y, x + 10, y);
    g.addColorStop(0, "#8ea6d4");
    g.addColorStop(0.5, "#f4f8ff");
    g.addColorStop(1, "#6d86b8");
    c.fillStyle = g;
    rr(c, x, y, 10, h, 4); c.fill();
    c.fillStyle = "#e6c56a";
    c.fillRect(x - 1, y, 12, 4);
    c.fillRect(x - 1, y + h - 4, 12, 4);
  }
  function chandelier(c, x, y, d){
    c.strokeStyle = "#e6c56a"; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 10); c.stroke();
    c.fillStyle = d.lacquer ? "#9fd0ff" : "#fff1b0";
    for(let i = -1; i <= 1; i++){
      c.beginPath(); c.arc(x + i * 8, y + 14, 3.2, 0, 7); c.fill();
    }
    if(baking) lamps.push({x, y:y + 16, r:46});
  }
  function bars(c, x, y, w, h, d){
    c.fillStyle = "rgba(180,200,220,.25)";
    c.fillRect(x, y, w, h);
    c.strokeStyle = d.lacquer ? "#d7e6ff" : "#c5d0dc";
    c.lineWidth = 2;
    const n = 4 + Math.min(4, d.level || 1);
    for(let i = 0; i <= n; i++){
      const xx = x + (w * i) / n;
      c.beginPath(); c.moveTo(xx, y); c.lineTo(xx, y + h); c.stroke();
    }
    c.strokeStyle = d.gold ? "#e6c56a" : "#9aa7b5";
    c.strokeRect(x, y, w, h);
    if(d.level >= 3){
      lacquer(c, x + 4, y + h * 0.55, w - 8, h * 0.22, "#2a4d86", d, 3);
    }
  }

  function drawRoom(c, id, rect, d, locked){
    const {x, y, w, h} = rect;
    c.save();
    c.shadowColor = "rgba(40,24,8,.28)";
    c.shadowBlur = 12; c.shadowOffsetY = 6;
    rr(c, x, y, w, h, 12); c.fillStyle = "#e7d3aa"; c.fill();
    c.shadowColor = "transparent";
    if(locked){
      stone(c, x, y, w, h, 1);
      c.fillStyle = "rgba(20,30,50,.28)";
      c.fillRect(x, y, w, h);
      const sign = ROOM_SIGNS[id] || {en:id, he:""};
      plaque(c, x + w / 2, y + 6, sign.en, sign.he, {level:1, gold:false});
      c.fillStyle = "#fff";
      c.font = "700 " + Math.max(11, w / 14) + "px Nunito, sans-serif";
      c.textAlign = "center";
      c.fillText("🔒  ур. " + (ROOMS[id].unlock || ""), x + w / 2, y + h * 0.62);
      c.restore();
      return;
    }
    floor(c, x + 3, y + h * 0.22, w - 6, h * 0.76, d);
    stone(c, x, y, w, h * 0.28, d.level);
    const sign = ROOM_SIGNS[id] || {en:id, he:""};
    plaque(c, x + w / 2, y + 4, sign.en, sign.he, d);
    // blue lacquer frame, thicker as the room is upgraded
    c.lineWidth = 3 + Math.min(4, d.level * 0.35);
    c.strokeStyle = d.lacquer ? "#7eb6ff" : d.gold ? "#e6c56a" : "#1a4f9c";
    rr(c, x + 1, y + 1, w - 2, h - 2, 12); c.stroke();
    if(d.level >= 2){
      c.lineWidth = 1.2; c.strokeStyle = "rgba(255,255,255,.55)";
      rr(c, x + 5, y + 5, w - 10, h - 10, 9); c.stroke();
    }
    furnish(c, id, rect, d);
    if(d.columns){
      column(c, x + 6, y + h * 0.2, h * 0.72);
      if(d.columns > 1) column(c, x + w - 16, y + h * 0.2, h * 0.72);
    }
    if(d.chandelier) chandelier(c, x + w * 0.5, y + h * 0.16, d);
    // level studs — one new gold nail each upgrade, so every level reads
    for(let i = 0; i < Math.min(10, d.level); i++){
      const sx = x + 10 + i * ((w - 20) / 10);
      c.fillStyle = i < d.level - 1 ? "#e6c56a" : "#fff6d0";
      c.beginPath(); c.arc(sx, y + h - 7, 2.2, 0, 7); c.fill();
    }
    c.restore();
  }
  function furnish(c, id, rect, d){
    const {x, y, w, h} = rect;
    const lv = d.level;
    if(id === "reception" || id === "chief" || id === "press"){
      windowView(c, x + w * 0.08, y + h * 0.05, w * 0.2, h * 0.14);
      if(lv >= 5) windowView(c, x + w * 0.7, y + h * 0.05, w * 0.18, h * 0.14);
      lacquer(c, x + w * 0.12, y + h * 0.4, w * 0.62, h * 0.26, lv >= 9 ? "#12386f" : "#1a4f9c", d, 12);
      c.fillStyle = "rgba(255,255,255,.45)";
      rr(c, x + w * 0.16, y + h * 0.42, w * 0.28, h * 0.06, 8); c.fill();
      const monitors = d.monitors;
      for(let i = 0; i < monitors; i++){
        screen(c, x + w * (0.22 + i * 0.16), y + h * 0.28, w * 0.14, h * 0.14, d);
      }
      if(lv >= 2) lamp(c, x + w * 0.62, y + h * 0.34, h * 0.2, d);
      for(let i = 0; i < d.plants; i++) plant(c, x + w * (0.1 + i * 0.12), y + h * 0.78, h * 0.28);
      if(d.rug){
        c.fillStyle = d.lacquer ? "rgba(90,140,230,.35)" : "rgba(180,40,70,.28)";
        rr(c, x + w * 0.2, y + h * 0.7, w * 0.46, h * 0.12, 8); c.fill();
      }
      chair(c, x + w * 0.72, y + h * 0.58, w * 0.16, h * 0.2, lv >= 6 ? "#16386a" : "#24548a");
      if(id === "chief" && lv >= 1){
        c.fillStyle = "#12386f";
        rr(c, x + w * 0.78, y + h * 0.08, w * 0.08, h * 0.16, 2); c.fill();
        c.fillStyle = "#fff";
        c.fillRect(x + w * 0.785, y + h * 0.1, w * 0.07, h * 0.04);
        c.fillStyle = "#0038b8";
        c.fillRect(x + w * 0.785, y + h * 0.1, w * 0.07, h * 0.012);
        c.fillRect(x + w * 0.785, y + h * 0.128, w * 0.07, h * 0.012);
      }
    }else if(id === "detective" || id === "suggest" || id === "armory"){
      windowView(c, x + w * 0.62, y + h * 0.05, w * 0.22, h * 0.13);
      // case board
      lacquer(c, x + w * 0.08, y + h * 0.05, w * 0.42, h * 0.16, "#c4a574", d, 4);
      c.strokeStyle = "rgba(120,40,40,.7)"; c.lineWidth = 1;
      c.beginPath();
      c.moveTo(x + w * 0.14, y + h * 0.1); c.lineTo(x + w * 0.4, y + h * 0.16);
      c.moveTo(x + w * 0.18, y + h * 0.16); c.lineTo(x + w * 0.36, y + h * 0.09);
      c.stroke();
      lacquer(c, x + w * 0.14, y + h * 0.42, w * 0.58, h * 0.24, id === "armory" ? "#2c3444" : "#6a4428", d, 8);
      for(let i = 0; i < d.monitors; i++) screen(c, x + w * (0.22 + i * 0.16), y + h * 0.28, w * 0.14, h * 0.14, d);
      if(lv >= 2) lamp(c, x + w * 0.7, y + h * 0.4, h * 0.16, d);
      for(let i = 0; i < Math.min(3, d.plants); i++) plant(c, x + w * (0.84), y + h * (0.55 + i * 0.12), h * 0.18);
      // files grow with level
      for(let i = 0; i < Math.min(5, lv); i++){
        c.fillStyle = ["#1a4f9c","#8a3038","#c4a574","#234"][i % 4];
        c.fillRect(x + w * 0.08 + i * 7, y + h * 0.7, 6, h * 0.12);
      }
      if(d.rug){
        c.fillStyle = "rgba(30,50,90,.25)";
        rr(c, x + w * 0.22, y + h * 0.68, w * 0.4, h * 0.1, 6); c.fill();
      }
    }else if(id === "interrog"){
      lamp(c, x + w * 0.5, y + h * 0.18, h * 0.2, d);
      lacquer(c, x + w * 0.28, y + h * 0.48, w * 0.44, h * 0.14, lv >= 8 ? "#243044" : "#4a5568", d, 4);
      chair(c, x + w * 0.34, y + h * 0.34, w * 0.14, h * 0.12, "#243044");
      chair(c, x + w * 0.52, y + h * 0.66, w * 0.14, h * 0.12, "#1a4f9c");
      if(lv >= 4){
        // one-way mirror
        windowView(c, x + w * 0.06, y + h * 0.08, w * 0.22, h * 0.16);
        c.fillStyle = "rgba(180,220,255,.25)";
        c.fillRect(x + w * 0.06, y + h * 0.08, w * 0.22, h * 0.16);
      }
      if(lv >= 6) screen(c, x + w * 0.74, y + h * 0.4, w * 0.16, h * 0.1, d);
      if(d.rug){
        c.fillStyle = "rgba(255,220,140,.18)";
        c.beginPath(); c.ellipse(x + w / 2, y + h * 0.62, w * 0.2, h * 0.08, 0, 0, 7); c.fill();
      }
    }else if(id === "cells"){
      const cells = 1 + Math.min(3, Math.floor(lv / 2));
      const cw = (w * 0.8) / cells;
      for(let i = 0; i < cells; i++){
        bars(c, x + w * 0.08 + i * (cw + 4), y + h * 0.32, cw - 4, h * 0.55, d);
      }
      if(lv >= 2) lamp(c, x + w * 0.5, y + h * 0.2, h * 0.12, d);
      if(d.plants) plant(c, x + w * 0.9, y + h * 0.7, h * 0.22);
    }else if(id === "garage" || id === "gasstation"){
      // bay lines
      c.strokeStyle = d.gold ? "#e6c56a" : "#f0d56a";
      c.lineWidth = 2; c.setLineDash([8, 6]);
      c.beginPath();
      c.moveTo(x + w * 0.28, y + h * 0.4); c.lineTo(x + w * 0.28, y + h * 0.92);
      c.moveTo(x + w * 0.62, y + h * 0.4); c.lineTo(x + w * 0.62, y + h * 0.92);
      c.stroke(); c.setLineDash([]);
      lacquer(c, x + w * 0.04, y + h * 0.36, w * 0.16, h * 0.4, "#1a4f9c", d, 4);
      if(lv >= 3) lacquer(c, x + w * 0.78, y + h * 0.36, w * 0.16, h * 0.28, "#2c3444", d, 4);
      for(let i = 0; i < Math.min(3, d.plants); i++){
        c.fillStyle = "#222";
        c.beginPath(); c.ellipse(x + w * 0.86, y + h * (0.72 + i * 0.08), 8, 5, 0, 0, 7); c.fill();
      }
      if(lv >= 2) lamp(c, x + w * 0.5, y + h * 0.28, h * 0.1, d);
      if(id === "gasstation"){
        lacquer(c, x + w * 0.3, y + h * 0.42, w * 0.12, h * 0.36, "#d4a017", d, 4);
        lacquer(c, x + w * 0.48, y + h * 0.42, w * 0.12, h * 0.36, "#c0392b", d, 4);
      }
      if(d.glass){
        windowView(c, x + w * 0.34, y + h * 0.08, w * 0.3, h * 0.14);
      }
    }else if(id === "electric"){
      const panels = 2 + Math.min(4, lv);
      for(let i = 0; i < panels; i++){
        const py = y + h * 0.32 + (i % 3) * h * 0.16;
        const px = x + w * 0.1 + Math.floor(i / 3) * w * 0.28;
        lacquer(c, px, py, w * 0.22, h * 0.14, "#1c3a32", d, 3);
        if(baking) lamps.push({x:px + w * 0.11, y:py + h * 0.07, r:10, tiny:true, hue:i % 2 ? "#4ade80" : "#fbbf24"});
      }
      if(lv >= 4) screen(c, x + w * 0.62, y + h * 0.5, w * 0.22, h * 0.16, d);
    }
    if(lv >= 6 && id !== "cells"){
      // crest
      c.fillStyle = "#e6c56a";
      c.beginPath(); c.arc(x + w - 16, y + 16, 6, 0, 7); c.fill();
      star(c, x + w - 16, y + 16, 3.5, "#1a4f9c");
    }
  }

  function paintStatic(S){
    off.width = Math.max(1, Math.round(W * dpr));
    off.height = Math.max(1, Math.round(H * dpr));
    const g = off.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    lamps.length = 0; screens.length = 0;
    baking = true;
    const skyG = g.createLinearGradient(0, 0, 0, H);
    skyG.addColorStop(0, "#69c6f5");
    skyG.addColorStop(0.25, "#d7f0ff");
    skyG.addColorStop(1, "#f6d7a4");
    g.fillStyle = skyG; g.fillRect(0, 0, W, H);
    const sky = imgs[skySrc];
    const wh = H / 2;
    if(sky && sky._ok){
      g.drawImage(sky, 0, 0, sky.width, sky.height, 0, 0, W, wh * 0.42);
      g.drawImage(sky, 0, 0, sky.width, sky.height, 0, wh, W, wh * 0.34);
    }
    [1, 2].forEach(wing => {
      const y0 = (wing - 1) * wh;
      const luxLv = wingLux(S, wing);
      const d = roomDecorTier(luxLv);
      const x = W * 0.02, y = y0 + wh * (wing === 1 ? 0.18 : 0.12), bw = W * 0.96, bh = wh * (wing === 1 ? 0.8 : 0.84);
      stone(g, x, y, bw, bh, luxLv);
      floor(g, x + 8, y + 28, bw - 16, bh - 36, d);
      g.lineWidth = 5 + Math.min(3, luxLv * 0.2);
      g.strokeStyle = d.lacquer ? "#9ec6ff" : "#1a4f9c";
      rr(g, x, y, bw, bh, 18); g.stroke();
      if(d.gold){
        g.lineWidth = 2; g.strokeStyle = "rgba(230,197,106,.9)";
        rr(g, x + 6, y + 6, bw - 12, bh - 12, 14); g.stroke();
      }
      if(wing === 1){
        // steps up to the entrance, like the reference
        for(let i = 0; i < 5; i++){
          g.fillStyle = i % 2 ? "#efd8b0" : "#e2c490";
          g.fillRect(W * 0.0, y0 + wh * (0.34 + i * 0.025), W * 0.07, wh * 0.024);
        }
        plaque(g, W * 0.68, y0 + wh * 0.148, "ISRAEL POLICE", "משטרת ישראל", d);
      }else{
        plaque(g, W * 0.5, y0 + wh * 0.075, "HEADQUARTERS", "המטה", d);
      }
    });
    for(const id of ROOM_ORDER){
      const L = LAYOUT[id];
      const locked = S.chiefLv < ROOMS[id].unlock;
      const d = locked ? roomDecorTier(1) : roomDecorTier(S.rooms[id].level);
      const rect = roomRect(id);
      drawRoom(g, id, rect, d, locked);
    }
    baking = false;
  }
  function wingLux(S, wing){
    let m = 1;
    for(const id of ROOM_ORDER){
      if(LAYOUT[id].wing !== wing) continue;
      if(S.chiefLv < ROOMS[id].unlock) continue;
      m = Math.max(m, S.rooms[id].level | 0);
    }
    return m;
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

  function frame(ts, S){
    if(!cv || !ctx) return;
    resize();
    if(W < 2 || H < 2) return;
    time = ((ts || 0) / 1000) * (reduce ? 0.2 : 1);
    const key = ROOM_ORDER.map(id => (S.rooms[id].level) + (S.chiefLv >= ROOMS[id].unlock ? "o" : "x")).join(".") + "|" + (W|0) + "x" + (H|0) + "@" + dpr;
    if(key !== cacheKey){
      try{ paintStatic(S); cacheKey = key; }
      catch(e){ console.error(e); }
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#8fd0f2";
    ctx.fillRect(0, 0, W, H);
    if(off.width) ctx.drawImage(off, 0, 0, off.width / dpr, off.height / dpr);
    paintLive(ctx, S);
  }

  function paintLive(c, S){
    hits = [];
    const t = time;
    drawClouds(c, t);
    drawPalms(c, t);
    drawFlag(c, W * 0.12, (H / 2) * 0.2, t, Math.max(46, W * 0.16));
    drawFlag(c, W * 0.82, H / 2 + (H / 2) * 0.1, t + 1.2, Math.max(36, W * 0.11));
    // lamps and screen pulse
    for(const l of lamps){
      const pulse = 0.55 + Math.sin(t * 2 + l.x) * 0.2;
      const rad = c.createRadialGradient(l.x, l.y, 2, l.x, l.y, l.r);
      const col = l.hue || "255,214,120";
      if(l.hue){
        rad.addColorStop(0, l.hue);
        rad.addColorStop(1, "rgba(0,0,0,0)");
        c.globalAlpha = 0.55 + Math.sin(t * 6 + l.y) * 0.35;
      }else{
        rad.addColorStop(0, "rgba(255,220,140," + pulse + ")");
        rad.addColorStop(1, "rgba(255,200,80,0)");
        c.globalAlpha = 0.85;
      }
      c.fillStyle = rad;
      c.beginPath(); c.arc(l.x, l.y, l.r, 0, 7); c.fill();
      c.globalAlpha = 1;
    }
    for(const s of screens){
      c.fillStyle = "rgba(140,210,255," + (0.15 + Math.sin(t * 3 + s.x) * 0.08) + ")";
      c.beginPath(); c.arc(s.x, s.y, s.r * 0.8, 0, 7); c.fill();
    }
    // motes
    if(!reduce){
      for(let i = 0; i < 28; i++){
        const u = (i * 0.173 + t * (0.012 + (i % 5) * 0.003)) % 1;
        const x = ((i * 97) % 100) / 100 * W + Math.sin(t + i) * 8;
        const y = u * H;
        c.fillStyle = i % 3 ? "rgba(255,255,255,.75)" : "rgba(255,220,140,.8)";
        c.beginPath(); c.arc(x, y, (i % 4) * 0.4 + 0.6, 0, 7); c.fill();
      }
    }
    const list = [];
    if(S.actors){
      for(const a of S.actors){
        if(a.life === 0) continue;
        const p = pt(a.wing || 1, a.x, a.y);
        list.push({y:p.y, a, p});
      }
    }
    if(S.car){
      const p = pt(1, S.car.x || (LAYOUT.garage && LAYOUT.garage.ax) || 40, S.car.y || (LAYOUT.garage && LAYOUT.garage.ay) || 88);
      list.push({y:p.y, car:true, p});
    }
    list.sort((a, b) => a.y - b.y);
    for(const it of list){
      if(it.car) drawCar(c, it.p.x, it.p.y, t, S.car && S.car.state !== "idle");
      else drawActor(c, it.a, it.p, S, t);
    }
  }

  function drawClouds(c, t){
    const blobs = [[0.15, 0.05, 1, 34],[0.48, 0.08, 0.75, 48],[0.78, 0.04, 1.15, 28],[0.3, 0.55, 0.8, 40],[0.7, 0.58, 1, 32]];
    for(const [fx, fy, s, sp] of blobs){
      const x = ((fx * W + t * sp) % (W + 160)) - 80;
      const y = fy * H;
      c.fillStyle = "rgba(255,255,255,.82)";
      c.beginPath();
      c.ellipse(x, y, 46 * s, 16 * s, 0, 0, 7);
      c.ellipse(x + 26 * s, y + 4, 30 * s, 13 * s, 0, 0, 7);
      c.ellipse(x - 24 * s, y + 5, 26 * s, 12 * s, 0, 0, 7);
      c.fill();
    }
  }
  function drawPalms(c, t){
    const spots = [[W * 0.04, H * 0.2],[W * 0.94, H * 0.18],[W * 0.06, H * 0.62],[W * 0.93, H * 0.6]];
    spots.forEach((p, i) => palm(c, p[0], p[1], t + i, i % 2 ? 0.85 : 1));
  }
  function palm(c, x, y, t, sc){
    c.strokeStyle = "#6b4424"; c.lineWidth = 5 * sc; c.lineCap = "round";
    c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 6, y - 40 * sc, x + Math.sin(t * 0.4) * 3, y - 78 * sc); c.stroke();
    const topx = x + Math.sin(t * 0.4) * 3, topy = y - 78 * sc;
    for(let i = 0; i < 7; i++){
      const a = -2.5 + i * 0.55 + Math.sin(t * 1.7 + i) * 0.22;
      c.strokeStyle = i % 2 ? "#1c7a3a" : "#2fa85a";
      c.lineWidth = 2.4 * sc;
      c.beginPath(); c.moveTo(topx, topy);
      c.quadraticCurveTo(topx + Math.cos(a) * 28 * sc, topy + Math.sin(a) * 8 * sc, topx + Math.cos(a) * 54 * sc, topy + Math.sin(a) * 18 * sc);
      c.stroke();
    }
  }
  function drawFlag(c, x, y, t, h){
    c.strokeStyle = "#efe6d4"; c.lineWidth = 3; c.lineCap = "round";
    c.beginPath(); c.moveTo(x, y + 8); c.lineTo(x, y - h); c.stroke();
    c.fillStyle = "#e6c56a";
    c.beginPath(); c.arc(x, y + 8, 4, 0, 7); c.fill();
    const cols = 14, fw = h * 1.35, fh = h * 0.68;
    const bands = [[0, 0.16, "#0038b8"], [0.16, 0.84, "#ffffff"], [0.84, 1, "#0038b8"]];
    function flagPt(u, v){
      const wave = Math.sin(u * 5.4 + t * 3.6) * u * (h * 0.2) + Math.sin(t * 2.4 + v * 4) * 2.4;
      return {x:x + 4 + u * fw, y:y - h + 4 + v * fh + wave + u * u * 3};
    }
    for(const [v0, v1, colr] of bands){
      for(let col = 0; col < cols; col++){
        const u0 = col / cols, u1 = (col + 1) / cols;
        const a = flagPt(u0, v0), b = flagPt(u1, v0), d = flagPt(u1, v1), e = flagPt(u0, v1);
        c.beginPath();
        c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.lineTo(d.x, d.y); c.lineTo(e.x, e.y);
        c.closePath();
        c.fillStyle = colr; c.fill();
      }
    }
    const mid = flagPt(0.42, 0.5);
    star(c, mid.x, mid.y, fh * 0.2, "#0038b8");
  }

  function jobOf(a, S){
    if(a.kind === "dog") return "dog";
    if(a.walk) return "walk";
    if(a.react > 0) return "react";
    if(a.kind === "hero"){
      const room = a.roam;
      if(S.rooms[room] && S.rooms[room].work){
        if(room === "reception" || room === "press" || room === "chief" || room === "electric") return "type";
        if(room === "detective" || room === "suggest" || room === "armory") return "papers";
        if(room === "garage" || room === "gasstation") return "inspect";
        if(room === "interrog") return "talk";
      }
      if(room === "cells") return "guard";
      return "idle";
    }
    if(a.say) return "talk";
    return "idle";
  }
  function drawActor(c, a, p, S, t){
    const im = actorImage(a, S);
    if(!im) return;
    const dog = a.kind === "dog" || a.spr === "rika";
    const base = Math.max(86, Math.min(132, W * 0.3));
    const dh = dog ? base * 0.62 : (a.kind === "inmate" ? base * 0.86 : base);
    const dw = dh * (im.width / im.height);
    const phase = t * (reduce ? 0 : 1) + (a.phase || 0);
    const mode = jobOf(a, S);
    const hop = a.react > 0 ? Math.sin(Math.min(1, a.react) * Math.PI) * -10 : 0;
    c.save();
    c.translate(p.x, p.y + hop);
    if(a.flip) c.scale(-1, 1);
    // contact shadow
    c.fillStyle = "rgba(30,20,10,.28)";
    c.beginPath(); c.ellipse(0, 2, dw * 0.28, 5.5, 0, 0, 7); c.fill();
    const lv = (a.kind === "hero" && S.heroes[a.hid]) ? S.heroes[a.hid].level : 1;
    if(a.kind === "hero" && lv >= 3){
      const col = lv >= 10 ? "120,190,255" : lv >= 8 ? "190,150,255" : lv >= 6 ? "255,210,90" : "255,230,180";
      const g = c.createRadialGradient(0, -dh * 0.55, 4, 0, -dh * 0.4, dh * 0.65);
      g.addColorStop(0, "rgba(" + col + ",.45)");
      g.addColorStop(1, "rgba(" + col + ",0)");
      c.fillStyle = g;
      c.beginPath(); c.ellipse(0, -dh * 0.45, dw * 0.7, dh * 0.55, 0, 0, 7); c.fill();
    }
    if(dog) drawDog(c, im, dw, dh, phase);
    else deform(c, im, dw, dh, phase, mode);
    // blink
    const blink = reduce ? 0 : blinkAmt((a.id || a.spr || "x"), phase);
    if(blink > 0.35 && !dog){
      const skin = SKIN[a.hid || a.spr] || "#e0b090";
      c.fillStyle = skin;
      c.globalAlpha = Math.min(1, (blink - 0.35) * 2);
      const ey = -dh * 0.86, ex = dw * 0.075, ew = dw * 0.035, eh = Math.max(1.5, dh * 0.012);
      c.beginPath(); c.ellipse(-ex, ey, ew, eh, 0, 0, 7); c.ellipse(ex, ey, ew, eh, 0, 0, 7); c.fill();
      c.globalAlpha = 1;
    }
    if(mode === "papers" || mode === "type"){
      const py = -dh * 0.42 + Math.sin(phase * (mode === "type" ? 8 : 3)) * 3;
      c.fillStyle = "#f7f1e4";
      rr(c, -8, py, 16, 12, 2); c.fill();
      c.strokeStyle = "#d9c8a4"; c.stroke();
    }
    c.restore();
    // name + speech in screen space (not flipped)
    if(a.kind === "hero"){
      const name = (HEROES[a.hid] && HEROES[a.hid].name) || "";
      if(name){
        c.font = "800 9px Nunito, sans-serif";
        c.textAlign = "center"; c.textBaseline = "top";
        const tw = c.measureText(name).width + 10;
        c.fillStyle = "rgba(14,40,80,.82)";
        rr(c, p.x - tw / 2, p.y + 4, tw, 13, 6); c.fill();
        c.fillStyle = "#fff6d8";
        c.fillText(name, p.x, p.y + 5);
      }
    }
    if(a.say) bubble(c, p.x, p.y - dh - 6, a.say);
    hits.push({id:a.id, x:p.x - dw / 2, y:p.y - dh, w:dw, h:dh + 16});
    if(a.react > 0) a.react = Math.max(0, a.react - 0.016);
  }
  function blinkAmt(id, phase){
    let h = 0;
    const s = String(id);
    for(let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) >>> 0;
    const period = 2.8 + (h % 18) / 7;
    const u = (phase + (h % 10)) % period;
    if(u < 0.14) return Math.sin((u / 0.14) * Math.PI);
    return 0;
  }
  function deform(c, im, dw, dh, phase, mode){
    const strips = 16;
    const sw = im.width, sh = im.height;
    const slice = sh / strips;
    const dest = dh / strips;
    const breathe = Math.sin(phase * 2.15);
    const sway = Math.sin(phase * 1.25);
    for(let i = 0; i < strips; i++){
      const v = i / strips;
      let ox = 0, oy = 0;
      if(v < 0.24){
        ox += sway * dw * 0.045 * (0.24 - v) * 4;
        oy += Math.sin(phase * 1.7) * dh * 0.01;
      }
      if(v > 0.2 && v < 0.55) oy += breathe * dh * 0.022 * Math.sin((v - 0.2) * 4);
      if(v > 0.5) ox += Math.sin(phase * 1.5) * dw * 0.02;
      if(mode === "walk"){
        oy += Math.abs(Math.sin(phase * 8)) * -dh * 0.02;
        if(v > 0.55) ox += Math.sin(phase * 8 + v * 5) * dw * 0.07;
      }
      if(mode === "type" && v > 0.22 && v < 0.5) ox += Math.sin(phase * 10 + v * 8) * dw * 0.045;
      if(mode === "papers" && v > 0.25 && v < 0.55) ox += Math.sin(phase * 4 + i) * dw * 0.035;
      if(mode === "inspect" && v < 0.6) ox += dw * 0.03 + sway * dw * 0.01;
      if(mode === "guard") ox += Math.sin(phase * 0.9) * dw * 0.012;
      if(mode === "talk" && v < 0.3) ox += Math.sin(phase * 3) * dw * 0.02;
      if(mode === "react") oy += Math.sin(phase * 6) * dh * 0.006;
      const sy = Math.max(0, Math.floor(i * slice));
      const sheight = Math.min(sh - sy, Math.ceil(slice) + 2);
      c.drawImage(im, 0, sy, sw, sheight, -dw / 2 + ox, -dh + i * dest + oy, dw, dest + dh * 0.01);
    }
  }
  function drawDog(c, im, dw, dh, phase){
    const breathe = Math.sin(phase * 2.4) * dh * 0.012;
    // body without the tail, then the tail wags
    const tailCut = 0.78;
    c.drawImage(im, 0, 0, im.width * tailCut, im.height, -dw / 2, -dh + breathe, dw * tailCut, dh);
    c.save();
    c.translate(-dw / 2 + dw * tailCut, -dh * 0.42);
    c.rotate(Math.sin(phase * 5) * 0.38);
    c.drawImage(im, im.width * (tailCut - 0.02), im.height * 0.15, im.width * (1 - tailCut + 0.02), im.height * 0.7, -dw * 0.02, -dh * 0.2, dw * (1 - tailCut + 0.02), dh * 0.7);
    c.restore();
    // chest breath overlay already in body shift
  }
  function bubble(c, x, y, text){
    c.save();
    c.font = "800 10px Nunito, sans-serif";
    const raw = String(text);
    const shown = raw.length > 42 ? raw.slice(0, 40) + "…" : raw;
    const tw = Math.min(130, c.measureText(shown).width);
    const w = tw + 14, h = 22;
    c.translate(x, y - h);
    c.fillStyle = "#fffdf8";
    rr(c, -w / 2, 0, w, h, 8); c.fill();
    c.strokeStyle = "#e6c56a"; c.lineWidth = 1.4; c.stroke();
    c.beginPath(); c.moveTo(-5, h - 1); c.lineTo(0, h + 6); c.lineTo(5, h - 1); c.fill();
    c.fillStyle = "#1c3358";
    c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText(shown, 0, h / 2);
    c.restore();
  }
  function drawCar(c, x, y, t, moving){
    const w = Math.min(168, W * 0.46), h = w * 0.42;
    const blink = Math.sin(t * (moving ? 16 : 8));
    c.save();
    c.translate(x, y);
    c.fillStyle = "rgba(20,16,10,.3)";
    c.beginPath(); c.ellipse(0, 4, w * 0.4, 7, 0, 0, 7); c.fill();
    // floor light wash
    c.fillStyle = blink > 0 ? "rgba(255,40,40,.35)" : "rgba(40,90,255,.35)";
    c.beginPath(); c.ellipse(blink > 0 ? -w * 0.05 : w * 0.12, 6, 26, 8, 0, 0, 7); c.fill();
    rr(c, -w / 2, -h, w, h * 0.78, h * 0.16);
    const g = c.createLinearGradient(0, -h, 0, -h * 0.15);
    g.addColorStop(0, "#4c92ea");
    g.addColorStop(0.45, "#1a4fa8");
    g.addColorStop(1, "#0c2c6e");
    c.fillStyle = g; c.fill();
    c.fillStyle = "rgba(255,255,255,.32)";
    rr(c, -w * 0.42, -h * 0.92, w * 0.32, h * 0.16, 8); c.fill();
    rr(c, -w * 0.22, -h * 0.98, w * 0.42, h * 0.34, 8);
    c.fillStyle = "#d5eeff"; c.fill();
    c.fillStyle = "rgba(255,255,255,.5)";
    c.fillRect(-w * 0.16, -h * 0.92, w * 0.1, h * 0.12);
    c.fillStyle = "#f7f9fc";
    c.fillRect(-w / 2, -h * 0.48, w, h * 0.09);
    c.fillStyle = "#0e2f72";
    c.font = "800 " + Math.max(8, w * 0.07) + "px Nunito, sans-serif";
    c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText("POLICE", -w * 0.08, -h * 0.435);
    c.font = "700 " + Math.max(7, w * 0.055) + "px NotoSerifHebrew, sans-serif";
    c.fillText("משטרה", w * 0.22, -h * 0.435);
    for(const wx of [-w * 0.3, w * 0.3]){
      c.fillStyle = "#161616";
      c.beginPath(); c.ellipse(wx, -h * 0.12, w * 0.085, h * 0.11, 0, 0, 7); c.fill();
      c.fillStyle = "#d5dbe4";
      c.beginPath(); c.ellipse(wx, -h * 0.12, w * 0.03, h * 0.04, 0, 0, 7); c.fill();
    }
    c.fillStyle = blink > 0 ? "#ff2d2d" : "#2f6bff";
    rr(c, -w * 0.12, -h * 1.08, w * 0.1, h * 0.1, 3); c.fill();
    c.fillStyle = blink > 0 ? "#2f6bff" : "#ff2d2d";
    rr(c, w * 0.02, -h * 1.08, w * 0.1, h * 0.1, 3); c.fill();
    c.globalCompositeOperation = "lighter";
    c.fillStyle = blink > 0 ? "rgba(255,40,40,.55)" : "rgba(40,110,255,.55)";
    c.beginPath(); c.arc(blink > 0 ? -w * 0.07 : w * 0.07, -h, w * 0.16, 0, 7); c.fill();
    c.restore();
    if(moving){
      // dust behind the wheels
      c.fillStyle = "rgba(255,255,255,.35)";
      c.beginPath(); c.ellipse(x - w * 0.2, y - 2, 10 + Math.sin(t * 20) * 3, 4, 0, 0, 7); c.fill();
    }
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
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#8fd4f8");
    g.addColorStop(1, "#f3d7a6");
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    const sky = imgs[skySrc];
    if(sky && sky._ok) c.drawImage(sky, 0, 0, sky.width, sky.height * 0.7, 0, 0, w, h * 0.42);
    const prev = baking; baking = false;
    const saved = {W, H};
    W = w; H = h;
    drawRoom(c, id, {x:12, y:h * 0.16, w:w - 24, h:h * 0.78}, d, false);
    W = saved.W; H = saved.H; baking = prev;
  }

  return {init, resize, frame, pick, paintPreview, preload, heroImage};
})();
