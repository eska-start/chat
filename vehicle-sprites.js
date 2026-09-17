const vehicleSprite=new Image();
vehicleSprite.src='./cars.svg';
window.drawCar=function(v){
  if(!vehicleSprite.complete||!vehicleSprite.naturalWidth)return;
  const s=v.w/150, drawH=180*s, x=v.x, y=v.wheelY-138*s;
  ctx.save();
  ctx.globalAlpha=v.target?.98:1;
  ctx.shadowColor='rgba(0,0,0,.5)';ctx.shadowBlur=8;ctx.shadowOffsetY=5;
  ctx.drawImage(vehicleSprite,v.type.sprite*150,0,150,180,x,y,v.w,drawH);
  ctx.shadowColor='transparent';
  if(v.target){ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=2;ctx.strokeRect(x+3,y+62*s,v.w-6,82*s)}
  ctx.restore();
};
window.drawEvidenceCar=function(x,y,w,h,v,blur){
  if(!vehicleSprite.complete||!vehicleSprite.naturalWidth)return;
  ectx.save();ectx.translate(x,y);
  if(blur)ectx.filter=`blur(${blur}px)`;
  const s=w/150;
  ectx.drawImage(vehicleSprite,v.type.sprite*150,0,150,180,0,0,w,180*s);
  ectx.filter='none';
  if(blur){ectx.fillStyle=`rgba(150,160,165,${Math.min(.55,blur*.07)})`;ectx.fillRect(0,55,w,110)}
  ectx.restore();
};