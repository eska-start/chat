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
            target.translate(250,170);
            target.scale(.68,.68);
            return;
          }
          return value.call(target,x,y);
        };
      },
      set(target,prop,value){target[prop]=value;return true;}
    });
  };
})();
