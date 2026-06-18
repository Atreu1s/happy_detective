/* ============================================================
   ЛОГИКА ИГРЫ — game.html
   ============================================================ */
const $ = s=>document.querySelector(s);
const $$ = s=>document.querySelectorAll(s);

/* ---------- утилиты ---------- */
function norm(s){return (s||"").toLowerCase().replace(/ё/g,"е").replace(/[^a-zа-я0-9]/gi,"").trim();}
function matches(input,answers){const n=norm(input);return answers.some(a=>norm(a)===n);}

function show(id){
  $$(".screen").forEach(s=>s.classList.remove("active"));
  $("#"+id).classList.add("active");
  // нижняя панель видна только внутри дела 2
  const inCase2 = ["s-scene","s-clue"].includes(id);
  $("#bottombar").classList.toggle("show", inCase2);
  window.scrollTo({top:0,behavior:"smooth"});
}

function typeWriter(el,text,done){
  el.textContent="";el.classList.add("caret");let i=0;const speed=16;
  (function tick(){
    if(i<=text.length){el.textContent=text.slice(0,i);i++;setTimeout(tick,speed);}
    else{el.classList.remove("caret");if(done)done();}
  })();
}

/* ---------- состояние ---------- */
const SAVE="mjTrilogy_v1";
let state=load();
function load(){
  try{const r=localStorage.getItem(SAVE);if(r)return JSON.parse(r);}catch(e){}
  return {
    name:"",
    case1:{done:true},                 // дело 1 считается раскрытым (архив)
    case2:{started:false,clueIndex:0,done:false,sceneSeen:{},
           hintsUnlocked:{},hintsShown:{},microSolved:{},evidenceSeen:false},
    notes:"",
    seenNew:false                      // видела ли уже метку NEW на деле 2
  };
}
function save(){try{localStorage.setItem(SAVE,JSON.stringify(state));}catch(e){}}

/* ============================================================
   ХАБ
   ============================================================ */
function renderHub(){
  const list=$("#caseList");list.innerHTML="";
  // Дело 1
  list.appendChild(caseCard({
    n:1,name:"Артефакт Короля",
    desc:"Из закрытого хранилища исчез артефакт Короля поп-музыки. Семь улик, одна истина.",
    stamp:'<span class="stamp solved">Раскрыто</span>',
    onClick:()=>openCase1()
  }));
  // Дело 2
  const c2=state.case2;
  const solvedCount=c2.done?10:c2.clueIndex;
  const dots=Array.from({length:10},(_,i)=>`<i class="${i<solvedCount?'on':''}"></i>`).join("");
  let meta;
  if(c2.done) meta='<span class="stamp solved">Раскрыто</span>';
  else if(c2.started) meta=`<span class="stamp active">В работе</span><div class="progress-dots">${dots}</div>`;
  else meta='<span class="stamp active">Активно</span>';
  const showNew = !state.seenNew && !c2.started;
  list.appendChild(caseCard({
    n:2,name:"Игра Маэстро",
    desc:"Кто-то признался, что подстроил первое дело. Он называет себя Маэстро и зовёт на игру.",
    stamp:meta,
    isNew:showNew,
    onClick:()=>openCase2()
  }));
  // Дело 3 — только если включено
  if(typeof CASE3_ENABLED!=="undefined" && CASE3_ENABLED){
    list.appendChild(caseCard({n:3,name:"???",desc:"Дело засекречено.",stamp:'<span class="stamp active">Новое</span>',onClick:()=>{}}));
  }
}
function caseCard({n,name,desc,stamp,isNew,onClick}){
  const d=document.createElement("div");
  d.className="case-card";d.dataset.case=n;
  d.innerHTML=`<span class="thread"></span>
    <div class="cnum">Дело №${n}</div>
    <div class="cname">${name}</div>
    <div class="cdesc">${desc}</div>
    <div class="cmeta">${stamp}${isNew?'<span class="badge-new">Новое</span>':''}</div>`;
  d.onclick=onClick;
  return d;
}

/* ============================================================
   ДЕЛО 1 (архив)
   ============================================================ */
function openCase1(){
  show("s-case1");
  const who=state.name?state.name:"детектив";
  const sum=`Дело №1 закрыто.

Артефакт Короля поп-музыки был похищен из закрытого хранилища. Семь улик — от первого шифра до имени самого Короля — сложились в одну картину. Расследование провёл(а) ${who}.

Истина: артефакт принадлежал Майклу Джексону. Дело раскрыто и передано в архив.`;
  $("#case1Summary").textContent=sum;
}
$("#case1Evidence").onclick=()=>openDossier(1);
$("#case1Replay").onclick=()=>{
  // переигровка части 1 — отдельный файл рядом
  window.location.href="case1.html";
};

/* ============================================================
   ДЕЛО 2 — вход
   ============================================================ */
function openCase2(){
  state.seenNew=true;save();
  if(state.case2.done){ goCase2Final(true); return; }
  if(!state.name || !state.case2.started){
    show("s-c2name");
    typeWriter($("#c2nameIntro"),CASE2_INTRO,()=>{
      $("#c2nameForm").style.display="block";
      if(state.name) $("#c2nameInput").value=state.name;
      $("#c2nameInput").focus();
    });
  } else {
    // уже в процессе — продолжаем с текущей загадки
    renderClue();
  }
}
$("#c2nameBtn").onclick=submitC2Name;
$("#c2nameInput").addEventListener("keydown",e=>{if(e.key==="Enter")submitC2Name();});
function submitC2Name(){
  const v=$("#c2nameInput").value.trim();
  if(!v){shakeEl($("#c2nameInput"));return;}
  state.name=v;state.case2.started=true;save();
  show("s-c2brief");
  typeWriter($("#c2briefText"),case2Brief(state.name),()=>{$("#c2briefRow").style.display="flex";});
}
$("#c2briefBtn").onclick=()=>{ renderScene(); show("s-scene"); };

/* ============================================================
   МЕСТО ПРЕСТУПЛЕНИЯ
   ============================================================ */
function renderScene(){
  const g=$("#csGrid");g.innerHTML="";
  CRIME_SCENE.forEach(o=>{
    const d=document.createElement("div");
    d.className="cs-obj"+(state.case2.sceneSeen[o.id]?" seen":"");
    d.innerHTML=`<span class="ico">${o.icon}</span><span class="nm">${o.name}</span>`;
    d.onclick=()=>{
      state.case2.sceneSeen[o.id]=true;save();
      d.classList.add("seen");
      showEvDetail({icon:o.icon,name:o.name,caseLabel:"Место преступления",desc:o.text,solvedBy:""});
    };
    g.appendChild(d);
  });
}
$("#sceneStart").onclick=()=>{ renderClue(); };

/* ============================================================
   ЗАГАДКИ
   ============================================================ */
function renderBoard(){
  const b=$("#board");b.innerHTML="";
  CASE2_CLUES.forEach((c,i)=>{
    const p=document.createElement("div");
    p.className="pin"+(i<state.case2.clueIndex?" done":"")+(i===state.case2.clueIndex?" current":"");
    p.textContent=i<state.case2.clueIndex?"✓":(i+1);
    b.appendChild(p);
  });
}

function renderClue(){
  if(state.case2.clueIndex>=CASE2_CLUES.length){goCase2Final(false);return;}
  show("s-clue");
  const idx=state.case2.clueIndex;
  const c=CASE2_CLUES[idx];
  renderBoard();
  $("#clueNum").textContent="Улика "+(idx+1)+" из "+CASE2_CLUES.length;
  $("#clueTitle").textContent=c.title;
  $("#physTag").innerHTML=c.phys?`<span class="phys-tag">${c.phys}</span>`:"";

  // riddle (с поддержкой морзе как отдельной строки)
  const rEl=$("#clueRiddle");
  rEl.className="riddle"+(c.voice?" voice":"");
  rEl.innerHTML="";
  if(c.morse){
    // выделим строку морзе
    const parts=c.riddle.split("\n\n");
    rEl.appendChild(document.createTextNode(parts[0]));
    const m=document.createElement("div");m.className="morse-line";m.textContent=parts[1];
    rEl.appendChild(m);
    if(parts[2]){rEl.appendChild(document.createTextNode(parts[2]));}
  } else {
    rEl.textContent=c.riddle;
  }

  // micro-riddles (загадка 1)
  const mz=$("#microZone");mz.innerHTML="";
  if(c.type==="micro"){ renderMicro(c,idx,mz); }

  // reset answer
  $("#answerInput").value="";
  $("#answerFeedback").textContent="";$("#answerFeedback").className="feedback";
  $("#miniInput").value="";$("#miniFeedback").textContent="";$("#miniFeedback").className="feedback";
  $("#miniQuestion").textContent=c.mini.q;

  const unlocked=state.case2.hintsUnlocked[idx];
  const shown=state.case2.hintsShown[idx]||0;
  $("#miniLock").style.display=unlocked?"none":"block";
  $("#hints").classList.toggle("open",!!unlocked);
  renderHints(idx,shown);

  $("#answerInput").focus();
}

/* микрозагадки загадки 1 */
function renderMicro(c,idx,container){
  if(!state.case2.microSolved[idx]) state.case2.microSolved[idx]={};
  const solved=state.case2.microSolved[idx];

  // декодер символов визитки ◆ ▲ ● ■ ●
  const order=["◆","▲","●","■","●"];
  const decoder=document.createElement("div");decoder.className="symbol-decoder";
  function letterFor(sym){
    const m=c.micro.find(x=>x.symbol===sym);
    return (m && solved[sym])?m.letter:"?";
  }
  function refreshDecoder(){
    decoder.innerHTML="";
    order.forEach(sym=>{
      const m=c.micro.find(x=>x.symbol===sym);
      const open=!!solved[sym];
      const sd=document.createElement("div");
      sd.className="sd"+(open?" open":"");
      sd.innerHTML=`<span class="s">${sym}</span><span class="l">${open?m.letter:"?"}</span>`;
      decoder.appendChild(sd);
    });
  }
  refreshDecoder();
  container.appendChild(decoder);

  const wrap=document.createElement("div");wrap.className="micro-wrap";
  c.micro.forEach(m=>{
    const el=document.createElement("div");
    const isSolved=!!solved[m.symbol];
    el.className="micro"+(isSolved?" solved":"");
    el.innerHTML=`<span class="msym">${m.symbol}</span>
      <div class="mq">${m.q}</div>
      <div class="mrow"><input class="field msolve" placeholder="Ответ…" autocomplete="off" style="flex:1"/>
      <button class="btn ghost sm mbtn">→</button></div>
      <div class="mres">✓ Символ ${m.symbol} = ${m.letter}</div>`;
    const inp=el.querySelector(".msolve");const btn=el.querySelector(".mbtn");
    function trySolve(){
      if(matches(inp.value,m.answers)){
        solved[m.symbol]=true;save();
        el.classList.add("solved");
        refreshDecoder();
      } else { shakeEl(inp); }
    }
    btn.onclick=trySolve;
    inp.addEventListener("keydown",e=>{if(e.key==="Enter")trySolve();});
    wrap.appendChild(el);
  });
  container.appendChild(wrap);
}

function renderHints(idx,shown){
  const c=CASE2_CLUES[idx];
  [0,1,2].forEach(i=>{
    const h=$("#hint"+i);
    h.innerHTML=`<b style="color:var(--gold)">Подсказка ${i+1}.</b> ${c.hints[i]}`;
    h.classList.toggle("show",i<shown);
  });
  $("#hintMoreRow").style.display=shown>=3?"none":"flex";
}

/* проверка ответа */
$("#answerBtn").onclick=submitAnswer;
$("#answerInput").addEventListener("keydown",e=>{if(e.key==="Enter")submitAnswer();});
function submitAnswer(){
  const idx=state.case2.clueIndex;
  const c=CASE2_CLUES[idx];
  const fb=$("#answerFeedback");
  if(matches($("#answerInput").value,c.answers)){
    fb.textContent="Улика раскрыта. Маэстро доволен.";fb.className="feedback good";
    // выдать улику в досье
    awardEvidence(idx);
    state.case2.clueIndex++;save();
    renderHubBadge();
    setTimeout(renderClue,1000);
  } else {
    fb.textContent="Не то, детектив. Маэстро ждёт.";fb.className="feedback bad";
    shakeEl($("#answerInput"));
  }
}

/* мини-загадка для подсказок */
$("#miniBtn").onclick=submitMini;
$("#miniInput").addEventListener("keydown",e=>{if(e.key==="Enter")submitMini();});
function submitMini(){
  const idx=state.case2.clueIndex;
  const c=CASE2_CLUES[idx];
  if(matches($("#miniInput").value,c.mini.answers)){
    state.case2.hintsUnlocked[idx]=true;
    if(!state.case2.hintsShown[idx])state.case2.hintsShown[idx]=1;
    save();
    $("#miniLock").style.display="none";
    $("#hints").classList.add("open");
    renderHints(idx,state.case2.hintsShown[idx]);
  } else {
    $("#miniFeedback").textContent="Ключ не подошёл.";$("#miniFeedback").className="feedback bad";
    shakeEl($("#miniInput"));
  }
}

/* следующая подсказка + подтверждение перед 3-й */
$("#hintMoreBtn").onclick=()=>{
  const idx=state.case2.clueIndex;
  let shown=state.case2.hintsShown[idx]||1;
  if(shown===2){
    if(!confirm("Детектив, ты уверена? Маэстро сочтёт это слабостью. Раскрыть последнюю наводку?")) return;
  }
  shown=Math.min(3,shown+1);
  state.case2.hintsShown[idx]=shown;save();
  renderHints(idx,shown);
};

/* выдача улики */
function awardEvidence(clueIdx){
  const ev=CASE2_EVIDENCE.find(e=>e.unlockedAtClue===clueIdx);
  if(ev) showToast(ev);
}

/* ============================================================
   ФИНАЛ ДЕЛА 2
   ============================================================ */
function goCase2Final(replaying){
  state.case2.done=true;save();
  renderHubBadge();
  show("s-c2final");
  $("#c2revealBox").style.display="none";
  typeWriter($("#c2finalText"),case2Final(state.name),()=>{$("#c2revealRow").style.display="flex";});
  if(!replaying) launchConfetti();
}
$("#c2revealBtn").onclick=()=>{
  $("#c2revealText").innerHTML=CASE2_REVEAL;
  $("#c2revealBox").style.display="block";
  $("#c2revealBox").scrollIntoView({behavior:"smooth"});
  launchConfetti();
};

/* ============================================================
   ДОСЬЕ
   ============================================================ */
let dossierTab=1;
function openDossier(tab){
  dossierTab=tab||dossierTab||(state.case2.started?2:1);
  renderDossier();
  $("#dossierModal").classList.add("open");
}
function renderDossier(){
  const tabs=$("#dossierTabs");tabs.innerHTML="";
  const tabDefs=[{n:1,label:"Дело 1"},{n:2,label:"Дело 2"}];
  tabDefs.forEach(t=>{
    const b=document.createElement("button");
    b.className="tab"+(dossierTab===t.n?" active":"");
    b.textContent=t.label;
    b.onclick=()=>{dossierTab=t.n;renderDossier();};
    tabs.appendChild(b);
  });
  const grid=$("#evGrid");grid.innerHTML="";
  if(dossierTab===1){
    CASE1_EVIDENCE.forEach(ev=>grid.appendChild(evCard(ev,1,true)));
  } else {
    const solvedCount=state.case2.done?10:state.case2.clueIndex;
    let any=false;
    CASE2_EVIDENCE.forEach(ev=>{
      const open=ev.unlockedAtClue<solvedCount;
      if(open)any=true;
      grid.appendChild(evCard(ev,2,open));
    });
    if(!any){
      const e=document.createElement("div");e.className="ev-empty";
      e.textContent="Пока пусто. Раскрывай загадки Маэстро — улики появятся здесь.";
      grid.appendChild(e);
    }
  }
}
function evCard(ev,caseN,open){
  const d=document.createElement("div");
  d.className="ev-card"+(open?"":" locked");
  d.innerHTML=`<span class="ei">${open?ev.icon:"❔"}</span><span class="en">${open?ev.name:"???"}</span>`;
  if(open){
    d.onclick=()=>showEvDetail({icon:ev.icon,name:ev.name,caseLabel:"Дело №"+caseN,desc:ev.desc,solvedBy:ev.solvedBy});
  }
  return d;
}
function showEvDetail({icon,name,caseLabel,desc,solvedBy}){
  $("#evdIcon").textContent=icon;
  $("#evdName").textContent=name;
  $("#evdCase").textContent=caseLabel;
  $("#evdDesc").textContent=desc;
  const sb=$("#evdSolved");
  if(solvedBy){sb.style.display="block";sb.textContent=solvedBy + (state.name?(" · "+state.name):"");}
  else sb.style.display="none";
  $("#evDetail").classList.add("open");
}

/* ============================================================
   ЗАМЕТКИ
   ============================================================ */
function openNotes(){
  $("#notesArea").value=state.notes||"";
  $("#notesModal").classList.add("open");
  $("#notesArea").focus();
}
$("#notesArea").addEventListener("input",e=>{state.notes=e.target.value;save();});

/* ============================================================
   TOAST
   ============================================================ */
let toastTimer=null;
function showToast(ev){
  $("#toastIcon").textContent=ev.icon;
  $("#toastName").textContent=ev.name;
  const t=$("#toast");
  t.classList.add("show");
  t.onclick=()=>{ t.classList.remove("show"); openDossier(2); };
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.classList.remove("show"),4200);
}

/* ============================================================
   МОДАЛКИ / НАВИГАЦИЯ
   ============================================================ */
$$("[data-close]").forEach(b=>{
  b.onclick=()=>{
    const w=b.dataset.close;
    if(w==="dossier")$("#dossierModal").classList.remove("open");
    if(w==="notes")$("#notesModal").classList.remove("open");
    if(w==="evdetail")$("#evDetail").classList.remove("open");
  };
});
// клик по фону оверлея закрывает
["dossierModal","notesModal","evDetail"].forEach(id=>{
  $("#"+id).addEventListener("click",e=>{ if(e.target===$("#"+id)) $("#"+id).classList.remove("open"); });
});
$$("[data-back]").forEach(b=>{
  b.onclick=()=>{
    const w=b.dataset.back;
    if(w==="hub"){renderHub();show("s-hub");}
    if(w==="clue"){renderClue();}
  };
});

/* нижняя панель */
$("#bbScene").onclick=()=>{renderScene();show("s-scene");};
$("#bbDossier").onclick=()=>openDossier(2);
$("#bbNotes").onclick=openNotes;
$("#bbHub").onclick=()=>{renderHub();show("s-hub");};

function renderHubBadge(){/* placeholder: hub перерисуется при заходе */}

/* ---------- helpers ---------- */
function shakeEl(el){el.classList.add("shake");setTimeout(()=>el.classList.remove("shake"),450);}

/* ============================================================
   КОНФЕТТИ
   ============================================================ */
let confettiRAF=null;
function launchConfetti(){
  const cv=$("#confetti"),ctx=cv.getContext("2d");
  cv.width=innerWidth;cv.height=innerHeight;
  const colors=["#d4af37","#f5d97a","#b94a4a","#e8e0d0","#c0392b"];
  const pieces=[];
  for(let i=0;i<130;i++)pieces.push({x:Math.random()*cv.width,y:-20-Math.random()*cv.height*0.5,
    r:4+Math.random()*6,c:colors[i%colors.length],vy:2+Math.random()*4,vx:-2+Math.random()*4,rot:Math.random()*6,vrot:-0.2+Math.random()*0.4});
  let frames=0;cancelAnimationFrame(confettiRAF);
  (function draw(){
    ctx.clearRect(0,0,cv.width,cv.height);
    pieces.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.rot+=p.vrot;
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.fillStyle=p.c;ctx.fillRect(-p.r/2,-p.r/2,p.r,p.r*0.6);ctx.restore();});
    frames++;
    if(frames<260)confettiRAF=requestAnimationFrame(draw);
    else ctx.clearRect(0,0,cv.width,cv.height);
  })();
}
addEventListener("resize",()=>{const cv=$("#confetti");cv.width=innerWidth;cv.height=innerHeight;});

/* ============================================================
   СБРОС
   ============================================================ */
$("#resetBtn").onclick=()=>{
  if(confirm("Сбросить весь прогресс трилогии? Это нельзя отменить.")){
    localStorage.removeItem(SAVE);state=load();renderHub();show("s-hub");
  }
};

/* ============================================================
   СТАРТ
   ============================================================ */
(function init(){
  renderHub();
  // если игрок был внутри дела 2 — можно вернуть его в хаб (безопасный старт)
  show("s-hub");
})();
