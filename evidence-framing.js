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
            // Scale only the vehicle drawing, not the evidence photo itself.
            // This leaves enough margin for the roof, body, wheels and plate.
            target.translate(x+21,y+11);
            target.scale(.88,.88);
            return;
          }
          return value.call(target,x,y);
        };
      },
      set(target,prop,value){target[prop]=value;return true;}
    });
  };
})();