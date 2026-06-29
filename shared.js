/* ============================================================
   SHARED.js — общий модуль трилогии
   Подключается на каждой странице (хаб + дела).
   Отвечает за: общее состояние (localStorage), досье, заметки,
   нижнюю панель навигации, всплывашку-индикатор улик.
   Требует, чтобы на странице был подключён data.js (CASE1_EVIDENCE,
   CASE2_EVIDENCE, и опционально CASE3_EVIDENCE).
   ============================================================ */
(function(){
  "use strict";

  const SAVE = "mjTrilogy_v1";

  /* ---------- состояние ---------- */
  function defaultState(){
    return {
      name:"",
      case1:{done:true},
      case2:{started:true,clueIndex:10,done:true,sceneSeen:{},
             hintsUnlocked:{},hintsShown:{},microSolved:{},evidenceSeen:false},
      case3:{started:false,solved:{},lettersOpen:{},done:false},
      notes:"",
      seenNew:false
    };
  }
  function loadState(){
    try{ const r=localStorage.getItem(SAVE); if(r){ const s=JSON.parse(r); const merged=Object.assign(defaultState(),s);
      // Дело 2 всегда считается раскрытым (архив, как Дело 1)
      if(!merged.case2) merged.case2={};
      merged.case2.done=true; merged.case2.started=true;
      if(!merged.case2.clueIndex || merged.case2.clueIndex<10) merged.case2.clueIndex=10;
      return merged; } }catch(e){}
    return defaultState();
  }
  function saveState(s){ try{ localStorage.setItem(SAVE,JSON.stringify(s)); }catch(e){} }

  // глобальный доступ
  window.Trilogy = {
    SAVE,
    state: loadState(),
    save(){ saveState(this.state); },
    reload(){ this.state = loadState(); }
  };
  const T = window.Trilogy;

  /* ---------- утилиты ---------- */
  function el(tag,cls,html){ const e=document.createElement(tag); if(cls)e.className=cls; if(html!=null)e.innerHTML=html; return e; }
  function q(s){ return document.querySelector(s); }

  /* ============================================================
     DOM-каркас оверлеев (вставляется один раз на любой странице)
     ============================================================ */
  function injectChrome(){
    if(document.getElementById("triDossier")) return; // уже есть

    const wrap = el("div","tri-chrome");
    wrap.innerHTML = `
      <!-- DOSSIER -->
      <div class="tri-overlay" id="triDossier">
        <div class="tri-modal">
          <button class="tri-close" data-tri-close="triDossier">×</button>
          <div class="tri-eyebrow">Досье</div>
          <div class="tri-h1">Улики</div>
          <div class="tri-tabs" id="triTabs"></div>
          <div class="tri-evgrid" id="triEvGrid"></div>
        </div>
      </div>
      <!-- EVIDENCE DETAIL -->
      <div class="tri-detail" id="triEvDetail">
        <div class="tri-detail-card">
          <span class="tri-big" id="triEvdIcon"></span>
          <h3 id="triEvdName"></h3>
          <div class="tri-meta" id="triEvdCase"></div>
          <p id="triEvdDesc"></p>
          <div class="tri-solved" id="triEvdSolved"></div>
          <div class="tri-row-c"><button class="tri-btn ghost sm" data-tri-close="triEvDetail">Закрыть</button></div>
        </div>
      </div>
      <!-- NOTES -->
      <div class="tri-overlay" id="triNotes">
        <div class="tri-modal">
          <button class="tri-close" data-tri-close="triNotes">×</button>
          <div class="tri-eyebrow">Записная книжка детектива</div>
          <div class="tri-h1">Заметки</div>
          <textarea class="tri-notes" id="triNotesArea" placeholder="Здесь можно записывать догадки, коды, имена…"></textarea>
          <p class="tri-notehint">Заметки сохраняются автоматически и доступны во всех делах.</p>
        </div>
      </div>
      <!-- TOAST -->
      <div class="tri-toast" id="triToast">
        <span class="tri-ti" id="triToastIcon">🗂️</span>
        <div><div class="tri-tt">Новая улика в досье</div><div class="tri-ts" id="triToastName"></div></div>
      </div>
    `;
    document.body.appendChild(wrap);

    // закрытие по фону и крестикам
    wrap.querySelectorAll("[data-tri-close]").forEach(b=>{
      b.addEventListener("click",()=>{ document.getElementById(b.dataset.triClose).classList.remove("open"); });
    });
    ["triDossier","triNotes","triEvDetail"].forEach(id=>{
      const o=document.getElementById(id);
      o.addEventListener("click",e=>{ if(e.target===o) o.classList.remove("open"); });
    });

    // заметки автосейв
    const ta=document.getElementById("triNotesArea");
    ta.addEventListener("input",e=>{ T.state.notes=e.target.value; T.save(); });
  }

  /* ============================================================
     ДОСЬЕ
     ============================================================ */
  let dossierTab = 1;
  function evidenceForCase(n){
    if(n===1) return (typeof CASE1_EVIDENCE!=="undefined")?CASE1_EVIDENCE:[];
    if(n===2) return (typeof CASE2_EVIDENCE!=="undefined")?CASE2_EVIDENCE:[];
    if(n===3) return (typeof CASE3_EVIDENCE!=="undefined")?CASE3_EVIDENCE:[];
    return [];
  }
  function isCase3Visible(){
    return (typeof CASE3_ENABLED!=="undefined" && CASE3_ENABLED);
  }
  function openDossier(tab){
    injectChrome();
    dossierTab = tab || dossierTab || (T.state.case2.started?2:1);
    renderDossier();
    document.getElementById("triDossier").classList.add("open");
  }
  function renderDossier(){
    const tabs=document.getElementById("triTabs"); tabs.innerHTML="";
    const defs=[{n:1,label:"Дело 1"},{n:2,label:"Дело 2"}];
    if(isCase3Visible()) defs.push({n:3,label:"Дело 3"});
    defs.forEach(d=>{
      const b=el("button","tri-tab"+(dossierTab===d.n?" active":""),d.label);
      b.onclick=()=>{ dossierTab=d.n; renderDossier(); };
      tabs.appendChild(b);
    });
    const grid=document.getElementById("triEvGrid"); grid.innerHTML="";
    const list=evidenceForCase(dossierTab);

    // определить, сколько улик раскрыто
    let solvedCount;
    if(dossierTab===1) solvedCount=Infinity;            // дело 1 — всё раскрыто (архив)
    else if(dossierTab===2) solvedCount=T.state.case2.done?999:T.state.case2.clueIndex;
    else solvedCount=T.state.case3.done?999:Object.keys(T.state.case3.solved||{}).length;

    let any=false;
    list.forEach(ev=>{
      let open;
      if(dossierTab===1) open=true;
      else if(dossierTab===2) open=(ev.unlockedAtClue<solvedCount) || (ev.forensic && T.state.case2.done);
      else open = !!(T.state.case3.solved && T.state.case3.solved[ev.id]) || T.state.case3.done;
      if(open) any=true;
      grid.appendChild(evCard(ev,dossierTab,open));
    });
    if(!any){
      grid.appendChild(el("div","tri-evempty","Пока пусто. Раскрывай загадки — улики появятся здесь."));
    }
  }
  function evCard(ev,caseN,open){
    const d=el("div","tri-evcard"+(open?"":" locked"),
      `<span class="tri-ei">${open?ev.icon:"❔"}</span><span class="tri-en">${open?ev.name:"???"}</span>`);
    if(open){
      d.onclick=()=>showEvDetail({icon:ev.icon,name:ev.name,caseLabel:"Дело №"+caseN,desc:ev.desc,solvedBy:ev.solvedBy});
    }
    return d;
  }
  function showEvDetail({icon,name,caseLabel,desc,solvedBy}){
    injectChrome();
    document.getElementById("triEvdIcon").textContent=icon;
    document.getElementById("triEvdName").textContent=name;
    document.getElementById("triEvdCase").textContent=caseLabel;
    document.getElementById("triEvdDesc").textContent=desc;
    const sb=document.getElementById("triEvdSolved");
    if(solvedBy){ sb.style.display="block"; sb.textContent=solvedBy + (T.state.name?(" · "+T.state.name):""); }
    else sb.style.display="none";
    document.getElementById("triEvDetail").classList.add("open");
  }

  /* ============================================================
     ЗАМЕТКИ
     ============================================================ */
  function openNotes(){
    injectChrome();
    document.getElementById("triNotesArea").value=T.state.notes||"";
    document.getElementById("triNotes").classList.add("open");
    document.getElementById("triNotesArea").focus();
  }

  /* ============================================================
     TOAST — индикатор новой улики
     ============================================================ */
  let toastTimer=null;
  function showToast(ev){
    injectChrome();
    document.getElementById("triToastIcon").textContent=ev.icon;
    document.getElementById("triToastName").textContent=ev.name;
    const t=document.getElementById("triToast");
    t.classList.add("show");
    t.onclick=()=>{ t.classList.remove("show"); openDossier(dossierTab); };
    clearTimeout(toastTimer);
    toastTimer=setTimeout(()=>t.classList.remove("show"),4200);
  }

  /* ============================================================
     НИЖНЯЯ ПАНЕЛЬ (опционально вызывается страницей дела)
     opts: {scene:fn|null, hub:true}
     ============================================================ */
  function mountBottomBar(opts){
    injectChrome();
    opts=opts||{};
    if(document.getElementById("triBottombar")) document.getElementById("triBottombar").remove();
    const bar=el("div","tri-bottombar"); bar.id="triBottombar";
    let inner='<div class="tri-bb-inner">';
    if(opts.scene) inner+='<button class="tri-bb-btn" data-tri-bb="scene"><span class="tri-bi">🔍</span>Место</button>';
    inner+='<button class="tri-bb-btn" data-tri-bb="dossier"><span class="tri-bi">🗂️</span>Досье</button>';
    inner+='<button class="tri-bb-btn" data-tri-bb="notes"><span class="tri-bi">📓</span>Заметки</button>';
    inner+='<button class="tri-bb-btn" data-tri-bb="hub"><span class="tri-bi">🏛️</span>Дела</button>';
    inner+='</div>';
    bar.innerHTML=inner;
    document.body.appendChild(bar);
    bar.querySelectorAll("[data-tri-bb]").forEach(b=>{
      b.addEventListener("click",()=>{
        const a=b.dataset.triBb;
        if(a==="scene" && opts.scene) opts.scene();
        if(a==="dossier") openDossier(T.state.case2.started?2:1);
        if(a==="notes") openNotes();
        if(a==="hub") window.location.href="index.html";
      });
    });
  }

  /* ---------- экспорт ---------- */
  T.openDossier = openDossier;
  T.openNotes = openNotes;
  T.showToast = showToast;
  T.showEvDetail = showEvDetail;
  T.mountBottomBar = mountBottomBar;
  T.injectChrome = injectChrome;

  // авто-инъекция каркаса как только DOM готов
  if(document.readyState!=="loading") injectChrome();
  else document.addEventListener("DOMContentLoaded",injectChrome);

})();
