(function(){
  const canvas=document.getElementById('evidenceCanvas');
  if(!canvas)return;
  const originalGetContext=canvas.getContext.bind(canvas);
  canvas.getContext=function(type,options){
    const original=originalGetContext(type,options);
    if(type!=='2d'||!original)return original;
    return new Proxy(original,{
      get(target,prop,receiver){
        const value=Reflect.get(target,prop,receiver);
        if(prop!=='translate'||typeof value!=='function'){
          return typeof value==='function'?value.bind(target):value;
        }
        return function(x,y){
          const stack=(new Error()).stack||'';
          if(/drawEvidenceCar/.test(stack)){
            // The native evidence-car drawing is taller than its nominal
            // frame because the wheels extend below h. Shrink and lift only
            // the vehicle so the roof, body, wheels and plate all remain
            // inside the 720x410 evidence canvas.
            target.translate(x+30,y-35);
            target.scale(.82,.82);
            return;
          }
          return value.call(target,x,y);
        };
      },
      set(target,prop,value){target[prop]=value;return true;}
    });
  };
})();
