/* ============================================================
   LOGIC3.js — движок Дела 3 (В РАЗРАБОТКЕ)
   Здесь будет: 14 загадок, интерактивные мини-игры,
   расшифровка дневника, арест Маэстро, финал.
   Пока — временная заглушка.
   ============================================================ */
(function(){
  const intro=document.getElementById("s3introText");
  if(intro){
    intro.textContent="⚙️ Дело №3 ещё в разработке. Движок (загадки, дневник, финал) скоро будет добавлен. Пока доступны Дела №1 и №2.";
    const row=document.getElementById("s3introRow");
    if(row){ row.style.display="flex"; row.querySelector("button").textContent="← Вернуться к делам";
      row.querySelector("button").onclick=()=>{window.location.href="index.html";}; }
  }
  // навигация назад
  document.querySelectorAll("[data-back]").forEach(b=>{
    b.onclick=()=>{ if(b.dataset.back==="hub") window.location.href="index.html"; };
  });
  // нижняя панель из shared
  if(window.Trilogy && window.Trilogy.mountBottomBar){ window.Trilogy.mountBottomBar({hub:true}); }
})();
