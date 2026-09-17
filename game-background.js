(function(){
  const canvas=document.getElementById('game');
  if(!canvas||!window.__GAME_BG)return;

  // Keep the generated background visible behind the gameplay canvas.
  canvas.style.backgroundImage='url("'+window.__GAME_BG+'")';
  canvas.style.backgroundSize='cover';
  canvas.style.backgroundPosition='center';
  canvas.style.backgroundRepeat='no-repeat';
  canvas.style.backgroundColor='transparent';

  // game.js defines drawSky/drawRoad locally, so replacing window.drawSky
  // does not suppress those functions. Instead, suppress only their canvas
  // painting while leaving cars, camera, aim, effects and UI untouched.
  const originalGetContext=canvas.getContext.bind(canvas);
  canvas.getContext=function(type,options){
    const original=originalGetContext(type,options);
    if(type!=='2d'||!original)return original;
    const blocked=new Set(['fill','stroke','fillRect','strokeRect','drawImage','clearRect']);
    return new Proxy(original,{
      get(target,prop,receiver){
        const value=Reflect.get(target,prop,receiver);
        if(typeof value!=='function')return value;
        if(!blocked.has(prop))return value.bind(target);
        return function(){
          const stack=(new Error()).stack||'';
          if(/drawSky|drawRoad/.test(stack))return;
          return value.apply(target,arguments);
        };
      },
      set(target,prop,value){
        target[prop]=value;
        return true;
      }
    });
  };
})();
