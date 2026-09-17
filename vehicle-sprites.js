const vehicleSprite=new Image();
vehicleSprite.src='./cars.svg';
const spriteIndex={sedan:0,suv:1,hatch:2,van:3,sports:4,pickup:5};
window.drawCar=function(v){
  if(!vehicleSprite.complete||!vehicleSprite.naturalWidth)return;
  const idx=spriteIndex[v.type.kind]??0,s=v.w/150,drawH=180*s,x=v.x,y=v.wheelY-138*s;
  ctx.save();ctx.globalAlpha=v.target?.98:1;ctx.shadowColor='rgba(0,0,0,.5)';ctx.shadowBlur=8;ctx.shadowOffsetY=5;
  ctx.drawImage(vehicleSprite,idx*150,0,150,180,x,y,v.w,drawH);ctx.shadowColor='transparent';
  if(v.target){ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=2;ctx.strokeRect(x+3,y+62*s,v.w-6,82*s)}ctx.restore();
};
window.drawEvidenceCar=function(x,y,w,h,v,blur){
  if(!vehicleSprite.complete||!vehicleSprite.naturalWidth)return;
  const idx=spriteIndex[v.type.kind]??0,s=w/150;ectx.save();ectx.translate(x,y);if(blur)ectx.filter=`blur(${blur}px)`;
  ectx.drawImage(vehicleSprite,idx*150,0,150,180,0,0,w,180*s);ectx.filter='none';
  if(blur){ectx.fillStyle=`rgba(150,160,165,${Math.min(.55,blur*.07)})`;ectx.fillRect(0,55,w,110)}ectx.restore();
};