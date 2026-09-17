(function(){
  const canvas=document.getElementById('game');
  if(!canvas||!window.__GAME_BG)return;
  canvas.style.backgroundImage='url("'+window.__GAME_BG+'")';
  canvas.style.backgroundSize='cover';
  canvas.style.backgroundPosition='center';
  canvas.style.backgroundRepeat='no-repeat';
  window.drawSky=function(){};
  window.drawRoad=function(){};
})();
