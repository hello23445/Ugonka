(() => {
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const el = id => document.getElementById(id);
let W=960,H=540, worldW=2400,worldH=1800,running=false,paused=false,last=0,score=0,wanted=0,escapeTimer=0;
const keys={};
const player={x:350,y:330,a:0,inCar:false,car:null};
const cars=[],police=[],buildings=[];
const rand=(a,b)=>a+Math.random()*(b-a);
function resize(){
 const r=canvas.getBoundingClientRect(),d=Math.min(window.devicePixelRatio||1,2);
 canvas.width=Math.max(1,Math.round(r.width*d));canvas.height=Math.max(1,Math.round(r.height*d));
 W=canvas.width;H=canvas.height;
}
window.addEventListener('resize',resize);resize();
function nearBuilding(x,y,p=0){return buildings.some(b=>x>b.x-p&&x<b.x+b.w+p&&y>b.y-p&&y<b.y+b.h+p)}
for(let y=0;y<worldH;y+=300)for(let x=0;x<worldW;x+=320)buildings.push({x:x+105,y:y+95,w:rand(145,190),h:rand(125,165),c:['#53616b','#626d72','#485861','#6a7477'][Math.floor(rand(0,4))]});
const colors=['#e9b44c','#d86c57','#5e9ab5','#a7b66a','#8c82b5'];
for(let i=0;i<26;i++){let x,y;do{x=rand(120,worldW-120);y=rand(120,worldH-120)}while(nearBuilding(x,y,25));cars.push({x,y,a:rand(0,6.28),color:colors[i%colors.length],taken:false,s:0})}
function toast(t){el('toast').textContent=t}
function action(){
 if(!running||paused)return;
 if(player.inCar){player.inCar=false;player.car.taken=false;player.x+=Math.cos(player.a+Math.PI/2)*28;player.y+=Math.sin(player.a+Math.PI/2)*28;player.car=null;el('vehicle').textContent='Пешком';toast('Вы вышли из автомобиля');return}
 let best=null,dist=65;for(const c of cars){let d=Math.hypot(c.x-player.x,c.y-player.y);if(!c.taken&&d<dist){dist=d;best=c}}
 if(best){best.taken=true;player.car=best;player.inCar=true;player.x=best.x;player.y=best.y;player.a=best.a;wanted=Math.max(1,wanted);score+=100;el('vehicle').textContent='Автомобиль';toast('Ты за рулём! Полиция получила сигнал');spawnPolice()}
 else toast('Подойди ближе к автомобилю');
}
function spawnPolice(){while(police.length<2){let a=rand(0,6.28);police.push({x:player.x+Math.cos(a)*500,y:player.y+Math.sin(a)*500,a:0})}}
function setKey(k,v){keys[k.toLowerCase()]=v}
window.addEventListener('keydown',e=>{let k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();setKey(k,true);if(k==='e'&&!e.repeat)action();if(k==='escape')togglePause()});
window.addEventListener('keyup',e=>setKey(e.key,false));
window.addEventListener('blur',()=>Object.keys(keys).forEach(k=>keys[k]=false));
document.querySelectorAll('[data-key]').forEach(btn=>{
 const k=btn.dataset.key.toLowerCase();
 btn.addEventListener('pointerdown',e=>{e.preventDefault();btn.setPointerCapture(e.pointerId);setKey(k,true)});
 const release=e=>{e.preventDefault();setKey(k,false)};
 btn.addEventListener('pointerup',release);btn.addEventListener('pointercancel',release);btn.addEventListener('lostpointercapture',()=>setKey(k,false));
});
el('mobileAction').addEventListener('pointerdown',e=>{e.preventDefault();action()});
el('startBtn').onclick=()=>{el('startScreen').classList.add('hidden');running=true;last=performance.now();toast('Найди автомобиль и нажми E')};
function togglePause(){if(!running)return;paused=!paused;el('pauseScreen').classList.toggle('hidden',!paused);if(!paused)last=performance.now()}
el('pauseBtn').onclick=togglePause;el('resumeBtn').onclick=togglePause;
function update(dt){
 const up=keys.w||keys.arrowup,down=keys.s||keys.arrowdown,left=keys.a||keys.arrowleft,right=keys.d||keys.arrowright;
 if(player.inCar){
  const c=player.car;
  if(up)c.s=Math.min(260,c.s+220*dt);else if(down)c.s=Math.max(-100,c.s-260*dt);else c.s*=Math.pow(.12,dt);
  if(left)c.a-=2.5*dt*(.35+Math.abs(c.s)/180);if(right)c.a+=2.5*dt*(.35+Math.abs(c.s)/180);
  const nx=c.x+Math.cos(c.a)*c.s*dt,ny=c.y+Math.sin(c.a)*c.s*dt;
  if(!nearBuilding(nx,ny,13)){c.x=nx;c.y=ny}else c.s*=-.2;
  player.x=c.x;player.y=c.y;player.a=c.a;
  if(Math.abs(c.s)>35){wanted=Math.min(5,Math.max(1,wanted+dt*.025));score+=Math.floor(Math.abs(c.s)*dt*.03)}
 }else{
  let dx=(right?1:0)-(left?1:0),dy=(down?1:0)-(up?1:0);
  if(dx||dy){let l=Math.hypot(dx,dy);dx/=l;dy/=l;player.a=Math.atan2(dy,dx);let nx=player.x+dx*145*dt,ny=player.y+dy*145*dt;if(!nearBuilding(nx,ny,8)){player.x=nx;player.y=ny}}
 }
 player.x=Math.max(20,Math.min(worldW-20,player.x));player.y=Math.max(20,Math.min(worldH-20,player.y));
 for(const p of police){let a=Math.atan2(player.y-p.y,player.x-p.x);p.a=a;p.x+=Math.cos(a)*(125+wanted*16)*dt;p.y+=Math.sin(a)*(125+wanted*16)*dt;if(Math.hypot(player.x-p.x,player.y-p.y)<34){wanted=Math.min(5,wanted+1);score=Math.max(0,score-50);p.x-=Math.cos(a)*220;p.y-=Math.sin(a)*220;toast('Патруль рядом! Продолжай движение')}}
 if(wanted>0){let nearest=police.reduce((m,p)=>Math.min(m,Math.hypot(player.x-p.x,player.y-p.y)),Infinity);if(nearest>420){escapeTimer+=dt;if(escapeTimer>9){wanted=0;police.length=0;escapeTimer=0;score+=500;toast('Погоня завершена! +500 очков')}}else escapeTimer=0}
 el('stars').textContent='★'.repeat(Math.ceil(wanted))+'☆'.repeat(5-Math.ceil(wanted));el('stars').classList.toggle('active',wanted>0);
 el('wantedText').textContent=wanted?'Патрули ищут тебя':'Полиция спокойна';el('score').innerHTML=score+' <small>₽</small>';
}
function drawCar(x,y,a,color,isPolice){
 ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.fillStyle='#101820';ctx.fillRect(-16,-10,34,20);
 ctx.fillStyle=isPolice?'#e8edf2':color;ctx.fillRect(-15,-9,30,18);ctx.fillStyle=isPolice?'#3b82f6':'#263b4a';ctx.fillRect(-5,-7,12,14);
 ctx.fillStyle='#17212b';ctx.fillRect(-12,-11,7,3);ctx.fillRect(7,-11,7,3);ctx.fillRect(-12,8,7,3);ctx.fillRect(7,8,7,3);
 if(isPolice){ctx.fillStyle='#ef4444';ctx.fillRect(-3,-10,5,3);ctx.fillStyle='#3b82f6';ctx.fillRect(2,-10,5,3)}ctx.restore();
}
function render(){
 const scale=Math.min(W/960,H/540),vw=W/scale,vh=H/scale;
 const camX=Math.max(0,Math.min(worldW-vw,player.x-vw/2)),camY=Math.max(0,Math.min(worldH-vh,player.y-vh/2));
 ctx.setTransform(scale,0,0,scale,0,0);ctx.clearRect(0,0,vw,vh);ctx.save();ctx.translate(-camX,-camY);
 ctx.fillStyle='#71816e';ctx.fillRect(0,0,worldW,worldH);
 for(let y=0;y<worldH;y+=300){ctx.fillStyle='#3e484c';ctx.fillRect(0,y,worldW,95);ctx.fillStyle='#d3c9a4';for(let x=0;x<worldW;x+=70)ctx.fillRect(x+12,y+46,32,2)}
 for(let x=0;x<worldW;x+=320){ctx.fillStyle='#3e484c';ctx.fillRect(x,0,105,worldH);ctx.fillStyle='#d3c9a4';for(let y=0;y<worldH;y+=70)ctx.fillRect(x+51,y+12,2,32)}
 for(const b of buildings){ctx.fillStyle='#0003';ctx.fillRect(b.x+7,b.y+9,b.w,b.h);ctx.fillStyle=b.c;ctx.fillRect(b.x,b.y,b.w,b.h);ctx.fillStyle='#ffffff18';ctx.fillRect(b.x+7,b.y+7,b.w-14,7);ctx.fillStyle='#a9c1bd';for(let x=b.x+15;x<b.x+b.w-10;x+=25)for(let y=b.y+24;y<b.y+b.h-10;y+=25)ctx.fillRect(x,y,9,8)}
 for(const c of cars)if(!c.taken)drawCar(c.x,c.y,c.a,c.color,false);
 for(const p of police)drawCar(p.x,p.y,p.a,'#eee',true);
 if(!player.inCar){ctx.fillStyle='#17212b';ctx.beginPath();ctx.arc(player.x,player.y,9,0,Math.PI*2);ctx.fill();ctx.fillStyle='#b9f36b';ctx.beginPath();ctx.arc(player.x,player.y-2,6,0,Math.PI*2);ctx.fill()}else drawCar(player.x,player.y,player.a,player.car.color,false);
 ctx.restore();
}
function loop(t){if(running&&!paused){let dt=Math.min((t-last)/1000,.04);last=t;update(dt)}render();requestAnimationFrame(loop)}
requestAnimationFrame(loop);
})();