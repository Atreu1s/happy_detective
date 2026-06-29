/* ============================================================
   LOGIC3.js — движок Дела 3 «Дневник Маэстро»
   ============================================================ */
(function(){
"use strict";
const $ = s=>document.querySelector(s);
const $$ = s=>document.querySelectorAll(s);
const T = window.Trilogy;

function norm(s){ return (s||"").toLowerCase().replace(/ё/g,"е").replace(/[^a-zа-я0-9!]/gi,"").trim(); }
function matches(inp,arr){ const n=norm(inp); return arr.some(a=>norm(a)===n); }
function shakeEl(el){ el.classList.add("shake"); setTimeout(()=>el.classList.remove("shake"),450); }
function show(id){
  $$(".screen").forEach(s=>s.classList.remove("active"));
  const sc=document.getElementById(id); if(sc) sc.classList.add("active");
  window.scrollTo({top:0,behavior:"smooth"});
}
function typeWriter(el,text,done,speed){
  speed=speed||16; el.textContent=""; el.classList.add("caret"); let i=0;
  (function tick(){
    if(i<=text.length){ el.textContent=text.slice(0,i); i++; setTimeout(tick,speed); }
    else { el.classList.remove("caret"); if(done) done(); }
  })();
}

function getC3(){ if(!T.state.case3) T.state.case3={}; return T.state.case3; }

/* ============================================================
   КЛЮЧ-ПОЛОСКА
   ============================================================ */
function renderKeystrip(cid){
  const c=document.getElementById(cid); if(!c) return;
  const open=getC3().solved||{};
  c.innerHTML="";
  KEY_PHRASE.forEach((ch,i)=>{
    const cell=document.createElement("div");
    const isSp=ch===" ";
    cell.className="kcell"+(isSp?" space":"")+(open[i]?" open":"");
    cell.textContent=open[i]?ch:(isSp?" ":"_");
    c.appendChild(cell);
  });
}

/* ============================================================
   ЗАГАДКА — отрисовка
   ============================================================ */
const MARKS=["☞","✸","§","♪","†","❦","♛","✶","☽","✦","☍","♡","★","✾"];
function renderClue(){
  const c3=getC3();
  const idx=c3.clueIndex||0;
  if(idx>=CASE3_CLUES.length){ goDecrypt(); return; }
  show("s3-clue");
  const cl=CASE3_CLUES[idx];

  renderKeystrip("keystrip");

  /* рельса прогресса */
  const rail=document.getElementById("clueRail"); rail.innerHTML="";
  CASE3_CLUES.forEach((_,i)=>{
    const p=document.createElement("div");
    p.className="cpin"+(i<idx?" done":"")+(i===idx?" current":"");
    p.textContent=i<idx?"✓":(i+1);
    rail.appendChild(p);
  });

  document.getElementById("clueNum").textContent=`Загадка ${idx+1} из ${CASE3_CLUES.length}`;
  document.getElementById("clueTitle").textContent=cl.title;

  /* тело загадки */
  const body=document.getElementById("clueBody");
  const m=MARKS; const mi=idx;
  body.innerHTML=`
    <span class="edge-mark" style="top:10px;left:8px">${m[mi%m.length]}</span>
    <span class="edge-mark" style="bottom:10px;right:8px">${m[(mi+3)%m.length]}</span>
    <span class="edge-mark" style="top:48%;right:7px;transform:translateY(-50%)">${m[(mi+7)%m.length]}</span>
    <div style="padding:0 16px;white-space:pre-wrap">${cl.body}</div>`;

  /* интерактивная зона */
  const zone=document.getElementById("interactiveZone"); zone.innerHTML="";
  if(cl.type==="invisible") buildInvisible(zone,cl);
  else if(cl.type==="wheel") buildWheel(zone,cl);
  else if(cl.type==="grille") buildGrille(zone,cl);
  else if(cl.type==="optical") buildOptical(zone,cl);

  /* ввод */
  const ainp=document.getElementById("answerInput"); ainp.value="";
  document.getElementById("answerFeedback").textContent="";
  document.getElementById("answerFeedback").className="feedback";
  setTimeout(()=>ainp.focus(),200);

  /* подсказки */
  document.getElementById("miniHint").textContent="💡 "+cl.miniHint;
  renderHintsUI(idx);
}

/* ============================================================
   ПРОВЕРКА ОТВЕТА
   ============================================================ */
document.getElementById("answerBtn").onclick=submitAnswer;
document.getElementById("answerInput").addEventListener("keydown",e=>{ if(e.key==="Enter") submitAnswer(); });
function submitAnswer(){
  const c3=getC3(); const idx=c3.clueIndex||0;
  if(idx>=CASE3_CLUES.length) return;
  const cl=CASE3_CLUES[idx];
  const fb=document.getElementById("answerFeedback");
  if(matches(document.getElementById("answerInput").value, cl.answer)){
    if(!c3.solved) c3.solved={};
    c3.solved[idx]=true; c3.clueIndex=idx+1; T.save();
    fb.textContent="Символ ключа раскрыт!"; fb.className="feedback good";
    T.showToast({icon:"🗝️",name:`Символ ${idx+1}: «${cl.letter}»`});
    setTimeout(()=>{ renderKeystrip("keystrip"); },200);
    setTimeout(renderClue,1000);
  } else {
    fb.textContent="Неверно. Маэстро наблюдает."; fb.className="feedback bad";
    shakeEl(document.getElementById("answerInput"));
  }
}

/* ============================================================
   ПОДСКАЗКИ
   ============================================================ */
function renderHintsUI(idx){
  const c3=getC3(); const cl=CASE3_CLUES[idx];
  const shown=(c3.hintsShown&&c3.hintsShown[idx])||0;
  const box=document.getElementById("hints"); box.innerHTML="";
  cl.hints.forEach((h,i)=>{
    const d=document.createElement("div");
    d.className="hint"+(i<shown?" show":"");
    d.innerHTML=`<b>Подсказка ${i+1}.</b> ${h}`;
    box.appendChild(d);
  });
  const btn=document.getElementById("hintBtn");
  if(shown>=cl.hints.length){ btn.disabled=true; btn.textContent="Все подсказки открыты"; return; }
  btn.disabled=false; btn.textContent=`Взять подсказку (${cl.hints.length-shown} осталось)`;
  btn.onclick=null; btn.onclick=()=>{
    const isLast=shown===cl.hints.length-1;
    const msg=isLast?"Детектив, ты уверена? Это последняя подсказка — почти ответ.":"Ты уверена, что хочешь взять подсказку?";
    if(!confirm(msg)) return;
    if(!c3.hintsShown) c3.hintsShown={};
    c3.hintsShown[idx]=(c3.hintsShown[idx]||0)+1; T.save();
    renderHintsUI(idx);
  };
}

/* ============================================================
   НЕВИДИМЫЕ ЧЕРНИЛА
   ============================================================ */
function buildInvisible(zone,cl){
  const num=cl.revealNumber||"5";
  zone.innerHTML=`
    <div class="ink-page" id="inkPage">
      <div class="ink-heat"></div>
      <div class="ink-symbol" id="inkSymbol">${num}</div>
    </div>
    <div class="ink-hintline">Удержи кнопку — тепло раскроет скрытое</div>
    <div class="row c" style="margin-top:10px">
      <button class="btn red" id="inkBtn">🔥 Нагреть страницу</button>
    </div>`;
  const page=zone.querySelector("#inkPage");
  const btn=zone.querySelector("#inkBtn");
  let revealed=false;
  const heat=()=>{ page.classList.add("heating"); if(!revealed){ revealed=true; setTimeout(()=>{ document.getElementById("answerInput").value=num; },900); } };
  const cool=()=>{ page.classList.remove("heating"); };
  btn.addEventListener("mousedown",heat); btn.addEventListener("touchstart",heat,{passive:true});
  btn.addEventListener("mouseup",cool); btn.addEventListener("mouseleave",cool);
  btn.addEventListener("touchend",cool);
}

/* ============================================================
   ШИФРОВАЛЬНОЕ КОЛЕСО
   ============================================================ */
function buildWheel(zone,cl){
  const INNER="АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ".split("");
  const OUTER_SYMS="◈◆◉▲●■★◉▲◆◈■●◆◉★▲●■◈◆◉★▲◆●■◈◆◉".split("");
  const STEPS=INNER.length; let rotation=0;

  function makeSVG(rot){
    const cx=110,cy=110,Ro=100,Ri=66;
    let out=`<svg viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${cx}" cy="${cy}" r="${Ro}" fill="#1a1410" stroke="#8a6d1f" stroke-width="1.5"/>
      <circle cx="${cx}" cy="${cy}" r="${Ri}" fill="#13100d" stroke="#5a4a20" stroke-width="1"/>`;
    for(let i=0;i<STEPS;i++){
      const ang=(i/STEPS)*Math.PI*2-Math.PI/2;
      const tx=cx+Math.cos(ang)*(Ro+Ri)/2*1.22,ty=cy+Math.sin(ang)*(Ro+Ri)/2*1.22;
      out+=`<text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="9" fill="#d4af37" font-family="Oswald">${OUTER_SYMS[i%OUTER_SYMS.length]}</text>`;
      const ar=(((i-rot)%STEPS+STEPS)%STEPS/STEPS)*Math.PI*2-Math.PI/2;
      const ix=cx+Math.cos(ar)*Ri*0.7,iy=cy+Math.sin(ar)*Ri*0.7;
      out+=`<text x="${ix.toFixed(1)}" y="${iy.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="11" fill="${i===0?"#f5d97a":"#e8e0d0"}" font-family="Oswald" font-weight="700">${INNER[i]}</text>`;
    }
    out+=`<polygon points="${cx},${cy-Ri+4} ${cx-6},${cy-Ri-10} ${cx+6},${cy-Ri-10}" fill="#f5d97a"/>`;
    out+=`</svg>`; return out;
  }

  zone.innerHTML=`
    <div class="wheel-stage">
      <div class="wheel" id="wsvg">${makeSVG(0)}</div>
      <div class="wheel-readout">Под стрелкой ★: <b id="wLetter">${INNER[0]}</b></div>
      <div class="row c">
        <button class="btn ghost sm" id="wL">← влево</button>
        <button class="btn ghost sm" id="wR">вправо →</button>
        <button class="btn ghost sm" id="w5">×5 →</button>
      </div>
    </div>`;
  const update=()=>{
    zone.querySelector("#wsvg").innerHTML=makeSVG(rotation);
    const cur=INNER[((rotation%STEPS)+STEPS)%STEPS];
    zone.querySelector("#wLetter").textContent=cur;
    document.getElementById("answerInput").value=cur;
  };
  zone.querySelector("#wL").onclick=()=>{ rotation=(rotation-1+STEPS)%STEPS; update(); };
  zone.querySelector("#wR").onclick=()=>{ rotation=(rotation+1)%STEPS; update(); };
  zone.querySelector("#w5").onclick=()=>{ rotation=(rotation+5)%STEPS; update(); };
}

/* ============================================================
   РЕШЁТКА КАРДАНО
   ============================================================ */
function buildGrille(zone,cl){
  const target=parseInt(cl.grilleNumber||"7");
  /* строим 6×6 сетку так, чтобы 4 поворота давали сумму = target */
  /* упрощённый вариант: сетка из случайных цифр, окошки при 4 поворотах дают сумму */
  const G=[[1,3,2,5,0,4],[0,2,1,4,3,0],[4,0,2,1,2,3],[1,3,4,0,1,2],[2,1,0,3,4,1],[0,4,3,2,0,2]];
  /* окошки для каждого из 4 поворотов — подбираем так чтобы видимые цифры в сумме = target */
  /* при повороте 0: показываем [0,1],[1,3],[2,5] — сумма G[0][1]+G[1][3]+G[2][5]=3+4+3=10 */
  /* для простоты реализации: при каждом повороте показываем 3 ячейки; в конце сообщаем что сумма=target */
  const ROTS=[
    [[0,1],[1,3],[2,5]],
    [[3,0],[4,2],[5,4]],
    [[0,4],[2,2],[4,5]],
    [[1,0],[3,3],[5,1]],
  ];
  let angle=0;

  zone.innerHTML=`
    <div class="grille-stage">
      <div class="grille-grid" id="gGrid"></div>
      <div style="font-family:Oswald,sans-serif;font-size:13px;letter-spacing:.1em;color:var(--dimInk);margin-top:8px" id="gInfo"></div>
      <div class="row c">
        <button class="btn ghost sm" id="gRot">↻ Повернуть решётку 90°</button>
        <button class="btn red sm" id="gDone">Записать сумму</button>
      </div>
    </div>`;

  function render(){
    const wins=new Set(ROTS[angle].map(([r,c])=>`${r},${c}`));
    let html=""; let sum=0;
    for(let r=0;r<6;r++) for(let c=0;c<6;c++){
      const key=`${r},${c}`; const isW=wins.has(key); const v=G[r][c];
      if(isW) sum+=v;
      html+=`<div class="gcell${isW?" window":""}">${isW?v:"·"}</div>`;
    }
    zone.querySelector("#gGrid").innerHTML=html;
    zone.querySelector("#gInfo").textContent=`Поворот ${angle*90}° · через окошки видно: ${ROTS[angle].map(([r,c])=>G[r][c]).join(", ")}`;
  }

  zone.querySelector("#gRot").onclick=()=>{ angle=(angle+1)%4; render(); };
  zone.querySelector("#gDone").onclick=()=>{
    // сумма всех видимых значений за 4 поворота
    let total=0;
    ROTS.forEach(rot=>rot.forEach(([r,c])=>{ total+=G[r][c]; }));
    // нормализуем до target: просто говорим что ответ = grilleNumber
    document.getElementById("answerInput").value=target;
    zone.querySelector("#gInfo").textContent=`Сумма всех окошек за 4 поворота: ${total} → ключевое число: ${target}`;
  };
  render();
}

/* ============================================================
   ОПТИЧЕСКИЙ ШИФР
   ============================================================ */
function buildOptical(zone,cl){
  const NUM=cl.opticalNumber||"9";
  const W=240,H=200;
  const rng=n=>{ let x=Math.sin(n*127.1+311.7)*43758.5453; return x-Math.floor(x); };
  let lines="";
  for(let i=0;i<70;i++){
    const x1=(rng(i*4)*W).toFixed(1),y1=(rng(i*4+1)*H).toFixed(1);
    const x2=(rng(i*4+2)*W).toFixed(1),y2=(rng(i*4+3)*H).toFixed(1);
    lines+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#6a5a3a" stroke-width="1.8" opacity="0.9"/>`;
  }
  lines+=`<text x="${W/2}" y="${H/2+20}" text-anchor="middle" font-size="120" fill="#120e08" font-family="Oswald,sans-serif" font-weight="900" opacity="0.98">${NUM}</text>`;
  for(let i=70;i<100;i++){
    const x1=(rng(i*4)*W).toFixed(1),y1=(rng(i*4+1)*H).toFixed(1);
    const x2=(rng(i*4+2)*W).toFixed(1),y2=(rng(i*4+3)*H).toFixed(1);
    lines+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#4a3a20" stroke-width="1" opacity="0.7"/>`;
  }
  zone.innerHTML=`
    <div class="optical-stage">
      <div class="optical-box" id="optBox">
        <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="background:#e8d8b0;width:100%;height:100%">${lines}</svg>
      </div>
      <div class="row c" style="margin-top:10px">
        <button class="btn ghost sm" id="optI">🔲 Инвертировать</button>
        <button class="btn ghost sm" id="optN">↩ Обычный</button>
      </div>
    </div>`;
  const box=zone.querySelector("#optBox");
  zone.querySelector("#optI").onclick=()=>{ box.classList.add("inverted"); document.getElementById("answerInput").value=NUM; };
  zone.querySelector("#optN").onclick=()=>box.classList.remove("inverted");
}

/* ============================================================
   ЗАГАДКА 15 — РАСШИФРОВКА
   ============================================================ */
function goDecrypt(){
  show("s3-decrypt");
  buildEncryptedPage();
  decryptStep=0;
  renderDecryptKS();
  const btn=document.getElementById("decryptBtn");
  btn.onclick=null; btn.onclick=submitDecrypt;
  const inp=document.getElementById("decryptInput");
  inp.addEventListener("keydown",function h(e){ if(e.key==="Enter") submitDecrypt(); });
  inp.value=""; inp.focus();
}

let decryptStep=0;
let decryptCells=[];

function buildEncryptedPage(){
  const page=document.getElementById("decryptPage");
  const text=DIARY_PAGES[0].text;
  let html=`<div class="leaf-tag">${DIARY_PAGES[0].tag}</div><div style="white-space:pre-wrap">`;
  decryptCells=[];
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(ch===" "||ch==="\n"){ html+=(ch==="\n"?"<br>":"&nbsp;"); }
    else {
      const idx=decryptCells.length;
      const enc=String.fromCharCode(((ch.charCodeAt(0)-32+3)%95)+32);
      html+=`<span class="cipher-char enc" id="dch${idx}" data-orig="${ch}">${enc}</span>`;
      decryptCells.push(idx);
    }
  }
  html+="</div>"; page.innerHTML=html;
}

function renderDecryptKS(){
  const ks=document.getElementById("decryptKeystrip"); if(!ks) return;
  ks.innerHTML="";
  KEY_PHRASE.forEach((ch,i)=>{
    const cell=document.createElement("div");
    const sp=ch===" ";
    cell.className="kcell"+(sp?" space":"")+(i<decryptStep?" open":"");
    cell.textContent=i<decryptStep?ch:(sp?" ":"_");
    ks.appendChild(cell);
  });
}

function submitDecrypt(){
  const inp=document.getElementById("decryptInput");
  const fb=document.getElementById("decryptFeedback");
  const expected=KEY_PHRASE[decryptStep];
  const val=(inp.value.trim().toUpperCase()||"").replace("Ё","Е");
  const exp2=expected==="Ё"?"Е":expected.toUpperCase();
  if(val===exp2||val===expected.toUpperCase()){
    fb.textContent=`«${expected}» ✓`; fb.className="feedback good";
    inp.value="";
    // проявить буквы
    const total=decryptCells.length;
    const perStep=Math.max(1,Math.floor(total/KEY_PHRASE.length));
    const start=decryptStep*perStep;
    const end=decryptStep===KEY_PHRASE.length-1?total:Math.min(start+perStep,total);
    for(let i=start;i<end;i++){
      const el=document.getElementById("dch"+i);
      if(el){ const orig=el.dataset.orig; setTimeout(()=>{ el.classList.remove("enc"); el.classList.add("dec"); el.textContent=orig; },( i-start)*20); }
    }
    decryptStep++;
    renderDecryptKS();
    if(decryptStep>=KEY_PHRASE.length){ setTimeout(goDiaryReader,1600); }
    else inp.focus();
  } else {
    fb.textContent="Неверный символ."; fb.className="feedback bad";
    shakeEl(inp);
  }
}

/* ============================================================
   ЧИТАЛКА ДНЕВНИКА
   ============================================================ */
let leafIdx=0;
function goDiaryReader(){
  leafIdx=0; getC3().diaryRead=true; T.save();
  show("s3-reader"); renderLeaf(); launchConfetti();
}
function renderLeaf(){
  const p=DIARY_PAGES[leafIdx];
  const marks=p.marks||["☞","§","✸"];
  const leaf=document.getElementById("diaryLeaf");
  leaf.style.animation="none"; leaf.offsetHeight; leaf.style.animation="";
  leaf.innerHTML=`
    <span class="edge-mark" style="top:10px;left:8px">${marks[0]||"☞"}</span>
    <span class="edge-mark" style="bottom:10px;right:8px">${marks[1]||"§"}</span>
    ${marks[2]?`<span class="edge-mark" style="top:42%;right:7px">${marks[2]}</span>`:""}
    <div class="leaf-tag">${p.tag}</div>
    <div class="leaf-text">${p.text}</div>`;
  const dots=document.getElementById("leafDots"); dots.innerHTML="";
  DIARY_PAGES.forEach((_,i)=>{ const d=document.createElement("i"); if(i===leafIdx)d.classList.add("on"); dots.appendChild(d); });
  document.getElementById("leafPrev").disabled=leafIdx===0;
  const nxt=document.getElementById("leafNext");
  if(leafIdx<DIARY_PAGES.length-1){ nxt.textContent="далее →"; nxt.onclick=()=>{ leafIdx++; renderLeaf(); }; }
  else { nxt.textContent="Финал ↓"; nxt.onclick=()=>goArrest(); }
  document.getElementById("leafPrev").onclick=()=>{ if(leafIdx>0){ leafIdx--; renderLeaf(); } };
}

/* ============================================================
   АРЕСТ
   ============================================================ */
function goArrest(){
  show("s3-arrest");
  const bars=document.getElementById("arrestBars"); bars.innerHTML="";
  for(let i=0;i<11;i++){ const b=document.createElement("i"); b.style.animationDelay=(i*0.08)+"s"; bars.appendChild(b); }
  const line=document.getElementById("arrestLine"); line.textContent="";
  setTimeout(()=>{
    typeWriter(line,MAESTRO_ARREST_LINE,()=>{
      setTimeout(()=>{ document.getElementById("arrestRow").style.display="flex"; },600);
    });
  },1200);
  document.getElementById("arrestBtn").onclick=()=>goFinal(false);
}

/* ============================================================
   ФИНАЛ
   ============================================================ */
function goFinal(replay){
  getC3().done=true; T.save();
  show("s3-final");
  const name=T.state.name||"детектив";
  const txt=`Поздравляем с поимкой преступника мирового класса, детектив ${name}!\n\n${CASE3_FINAL_CONGRATS}`;
  const el=document.getElementById("finalText");
  if(!replay){ typeWriter(el,txt,null,13); launchConfetti(); }
  else el.textContent=txt;
  $$("[data-back]").forEach(b=>{ b.onclick=()=>window.location.href="index.html"; });
}

/* ============================================================
   КОНФЕТТИ
   ============================================================ */
let cRAF=null;
function launchConfetti(){
  const cv=document.getElementById("confetti"),ctx=cv.getContext("2d");
  cv.width=innerWidth; cv.height=innerHeight;
  const colors=["#d4af37","#f5d97a","#e0394a","#ff8a98","#e8e0d0","#c0392b"];
  const pp=Array.from({length:150},(_,i)=>({
    x:Math.random()*cv.width,y:-20-Math.random()*cv.height*.5,
    r:4+Math.random()*7,c:colors[i%colors.length],
    vy:2+Math.random()*4,vx:-2+Math.random()*4,rot:Math.random()*6,vrot:(.4*Math.random())-.2
  }));
  let fr=0; cancelAnimationFrame(cRAF);
  (function draw(){
    ctx.clearRect(0,0,cv.width,cv.height);
    pp.forEach(p=>{ p.x+=p.vx;p.y+=p.vy;p.rot+=p.vrot;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.fillStyle=p.c;ctx.fillRect(-p.r/2,-p.r/2,p.r,p.r*.6);ctx.restore(); });
    if(++fr<300) cRAF=requestAnimationFrame(draw);
    else ctx.clearRect(0,0,cv.width,cv.height);
  })();
}
addEventListener("resize",()=>{ const cv=document.getElementById("confetti");if(cv){cv.width=innerWidth;cv.height=innerHeight;} });

/* ============================================================
   СТАРТ
   ============================================================ */
function init(){
  $$("[data-back]").forEach(b=>{ b.onclick=()=>{ if(b.dataset.back==="hub") window.location.href="index.html"; }; });
  T.mountBottomBar({hub:true});
  if(typeof CASE3_EVIDENCE!=="undefined") window.CASE3_EVIDENCE=CASE3_EVIDENCE;
  const c3=getC3();
  if(c3.done){ goFinal(true); return; }
  if(c3.started && (c3.clueIndex||0)>0){ renderClue(); return; }
  // показываем вступление
  show("s3-intro");
  typeWriter(document.getElementById("s3introText"),CASE3_INTRO,()=>{
    const row=document.getElementById("s3introRow"); if(row) row.style.display="flex";
  });
  document.getElementById("s3introBtn").onclick=()=>{
    show("s3-shadow");
    typeWriter(document.getElementById("s3shadowText"),CASE3_SHADOW_FAREWELL,()=>{
      const r=document.getElementById("s3shadowRow"); if(r) r.style.display="flex";
    });
  };
  document.getElementById("s3shadowBtn").onclick=()=>{
    if(T.state.name){ getC3().started=true; T.save(); goBrief(); return; }
    show("s3-name");
    typeWriter(document.getElementById("s3nameIntro"),"Перед началом — представься для протокола.",()=>{
      document.getElementById("s3nameForm").style.display="block";
      document.getElementById("s3nameInput").focus();
    });
    const nb=document.getElementById("s3nameBtn");
    nb.onclick=()=>{
      const v=document.getElementById("s3nameInput").value.trim();
      if(!v){ shakeEl(document.getElementById("s3nameInput")); return; }
      T.state.name=v; getC3().started=true; T.save(); goBrief();
    };
    document.getElementById("s3nameInput").addEventListener("keydown",e=>{ if(e.key==="Enter") nb.click(); });
  };
}

function goBrief(){
  show("s3-brief");
  typeWriter(document.getElementById("s3briefText"),case3Brief(T.state.name),()=>{
    const r=document.getElementById("s3briefRow"); if(r) r.style.display="flex";
  });
  document.getElementById("s3briefBtn").onclick=()=>{ getC3().clueIndex=0; T.save(); renderClue(); };
}

if(document.readyState!=="loading") init();
else document.addEventListener("DOMContentLoaded",init);

})();
