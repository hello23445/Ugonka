(()=>{'use strict';
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d'),$=id=>document.getElementById(id);
let W=1,H=1,running=false,paused=false,last=0,lastFrame=0,accumulated=0,score=0,wanted=0,escapeTimer=0;
const qualityProfiles={low:{scale:.55,rays:120,distance:650,shade:.65,shadows:false},medium:{scale:.75,rays:220,distance:1000,shade:.82,shadows:false},high:{scale:1,rays:360,distance:1500,shade:1,shadows:true},ultra:{scale:1.25,rays:560,distance:2200,shade:1,shadows:true}};
let graphicsMode='auto',fpsMode='auto',distanceMode='normal',graphics=qualityProfiles.medium,targetFps=60,frameInterval=1000/60;
const keys={},player={x:350,y:330,a:0,inCar:false,car:null},cars=[],police=[],buildings=[];
let joy={x:0,y:0},lookTouch=null,gas=false,brake=false;
player.pitch=0;
const worldW=2400,worldH=1800,rand=(a,b)=>a+Math.random()*(b-a);
function applyGraphics(){const autoLow=(navigator.deviceMemory&&navigator.deviceMemory<=4)||(navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=4);graphics={...qualityProfiles[graphicsMode==='auto'?(autoLow?'low':'high'):graphicsMode]};if(distanceMode==='near')graphics.distance=Math.min(graphics.distance,650);if(distanceMode==='normal')graphics.distance=Math.min(graphics.distance,1100);if(distanceMode==='far')graphics.distance=Math.max(graphics.distance,1800);targetFps=fpsMode==='auto'?(autoLow?30:60):Number(fpsMode);frameInterval=1000/targetFps;const labels={low:'Экономный режим: сниженная детализация и разрешение.',medium:'Баланс качества изображения и производительности.',high:'Повышенная чёткость и дальность прорисовки.',ultra:'Максимальная детализация. Может снижать FPS на слабых устройствах.'};$('graphicsDescription').textContent=graphicsMode==='auto'?'Автовыбор: '+(autoLow?'экономный режим':'высокое качество')+' по возможностям устройства.':labels[graphicsMode];resize()}
function resize(){const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,1.5)*(graphics?.scale||.75);W=canvas.width=Math.max(1,Math.round(r.width*d));H=canvas.height=Math.max(1,Math.round(r.height*d))}
addEventListener('resize',resize);resize();
for(let y=0;y<worldH;y+=300)for(let x=0;x<worldW;x+=320)buildings.push({x:x+105,y:y+95,w:rand(145,190),h:rand(125,165),c:['#65747a','#778080','#52646a','#89908a'][Math.floor(rand(0,4))]});
const colors=['#e9b44c','#d86c57','#5e9ab5','#a7b66a','#8c82b5'];
function blocked(x,y,p=10){return x<p||y<p||x>worldW-p||y>worldH-p||buildings.some(b=>x>b.x-p&&x<b.x+b.w+p&&y>b.y-p&&y<b.y+b.h+p)}
for(let i=0;i<30;i++){let x,y,n=0;do{x=rand(120,worldW-120);y=rand(120,worldH-120)}while(blocked(x,y,28)&&n++<100);cars.push({x,y,a:rand(-Math.PI,Math.PI),color:colors[i%colors.length],taken:false,s:0})}
function toast(t){$('toast').textContent=t}
function action(){if(!running||paused)return;if(player.inCar){const c=player.car;player.inCar=false;c.taken=false;player.x=c.x+Math.cos(c.a+Math.PI/2)*35;player.y=c.y+Math.sin(c.a+Math.PI/2)*35;player.car=null;$('vehicle').textContent='Пешком';toast('Вы вышли из автомобиля');return}
let best=null,dmin=95;for(const c of cars){const d=Math.hypot(c.x-player.x,c.y-player.y);if(!c.taken&&d<dmin){best=c;dmin=d}}if(best){best.taken=true;best.s=0;player.car=best;player.inCar=true;player.x=best.x;player.y=best.y;player.a=best.a;wanted=Math.max(1,wanted);score+=100;$('vehicle').textContent='За рулём';toast('Ты за рулём! Полиция получила сигнал');spawnPolice()}else toast('Подойди ближе к автомобилю')}
function spawnPolice(){while(police.length<3){const a=rand(-Math.PI,Math.PI);police.push({x:player.x+Math.cos(a)*480,y:player.y+Math.sin(a)*480,a})}}
function setKey(k,v){keys[k.toLowerCase()]=v}
addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();setKey(k,true);if(k==='e'&&!e.repeat)action();if(k==='escape')togglePause()});
addEventListener('keyup',e=>setKey(e.key,false));addEventListener('blur',()=>{Object.keys(keys).forEach(k=>keys[k]=false);joy={x:0,y:0};gas=brake=false});
$('mobileAction').addEventListener('pointerdown',e=>{e.preventDefault();action()});
function bindHold(id,fn){const b=$(id);b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);fn(true)});['pointerup','pointercancel','lostpointercapture'].forEach(n=>b.addEventListener(n,()=>fn(false)))}
bindHold('gasBtn',v=>gas=v);bindHold('brakeBtn',v=>brake=v);
const movePad=$('movePad'),knob=$('stickKnob');let moveId=null;
function moveStick(e){const r=movePad.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy,len=Math.hypot(dx,dy),max=36,k=Math.min(1,max/(len||1));joy={x:dx*k/max,y:dy*k/max};knob.style.transform='translate('+dx*k+'px,'+dy*k+'px)'}
movePad.addEventListener('pointerdown',e=>{e.preventDefault();moveId=e.pointerId;movePad.setPointerCapture(moveId);moveStick(e)});movePad.addEventListener('pointermove',e=>{if(e.pointerId===moveId)moveStick(e)});function resetJoy(){moveId=null;joy={x:0,y:0};knob.style.transform='translate(0,0)'}['pointerup','pointercancel','lostpointercapture'].forEach(n=>movePad.addEventListener(n,resetJoy));
const gameWrap=document.querySelector('.game-wrap');
// Drag anywhere on the playable view to turn the camera. Virtual controls retain their own gestures.
gameWrap.addEventListener('pointerdown',e=>{if(!running||paused||e.target.closest('.mobile-controls,button,select,input,.settings-panel,.overlay'))return;if(e.pointerType==='mouse'&&e.button!==0)return;lookTouch={id:e.pointerId,x:e.clientX,y:e.clientY}});
document.addEventListener('pointermove',e=>{if(!lookTouch||e.pointerId!==lookTouch.id)return;const dx=e.clientX-lookTouch.x,dy=e.clientY-lookTouch.y;player.a+=dx*.009;player.pitch=Math.max(-H*.16,Math.min(H*.16,player.pitch+dy*.65));lookTouch.x=e.clientX;lookTouch.y=e.clientY});
['pointerup','pointercancel'].forEach(n=>document.addEventListener(n,e=>{if(lookTouch&&e.pointerId===lookTouch.id)lookTouch=null}));

canvas.addEventListener('click',()=>{if(running&&!paused&&matchMedia('(pointer:fine)').matches&&document.pointerLockElement!==canvas)canvas.requestPointerLock?.()});
document.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas&&running&&!paused)player.a+=e.movementX*.0025});
$('startBtn').onclick=()=>{ $('startScreen').classList.add('hidden');running=true;last=performance.now();toast('Осмотрись и найди автомобиль')};
function togglePause(){if(!running)return;paused=!paused;$('pauseScreen').classList.toggle('hidden',!paused);if(!paused)last=performance.now();if(paused&&document.pointerLockElement)document.exitPointerLock?.()}
$('pauseBtn').onclick=togglePause;$('resumeBtn').onclick=togglePause;
$('settingsBtn').onclick=()=>$('settingsPanel').classList.toggle('hidden');$('closeSettings').onclick=()=>$('settingsPanel').classList.add('hidden');
function loadGraphicsSettings(){try{const s=JSON.parse(localStorage.getItem('ugonkaGraphics')||'{}');graphicsMode=['auto','low','medium','high','ultra'].includes(s.quality)?s.quality:'auto';fpsMode=['auto','30','60','90','120'].includes(String(s.fps))?String(s.fps):'auto';distanceMode=['near','normal','far'].includes(s.distance)?s.distance:'normal'}catch{}}
function saveGraphicsSettings(){try{localStorage.setItem('ugonkaGraphics',JSON.stringify({quality:graphicsMode,fps:fpsMode,distance:distanceMode}))}catch{}}
loadGraphicsSettings();$('graphicsQuality').value=graphicsMode;$('fpsLimit').value=fpsMode;$('drawDistance').value=distanceMode;applyGraphics();
$('graphicsQuality').addEventListener('change',e=>{graphicsMode=e.target.value;applyGraphics();saveGraphicsSettings()});$('fpsLimit').addEventListener('change',e=>{fpsMode=e.target.value;applyGraphics();saveGraphicsSettings()});$('drawDistance').addEventListener('change',e=>{distanceMode=e.target.value;applyGraphics();saveGraphicsSettings()});
const tg=window.Telegram?.WebApp;
try{tg?.ready?.();tg?.expand?.()}catch{}
function isFullscreen(){return !!(window.Telegram?.WebApp?.isFullscreen||document.fullscreenElement||document.webkitFullscreenElement)}
function syncFullscreen(){const toggle=$('fullscreenToggle');if(toggle)toggle.checked=isFullscreen()}
async function setFullscreen(on){const app=window.Telegram?.WebApp;try{if(on){if(app?.requestFullscreen){await app.requestFullscreen()}else if(document.documentElement.requestFullscreen){await document.documentElement.requestFullscreen()}else if(document.documentElement.webkitRequestFullscreen){document.documentElement.webkitRequestFullscreen()}else{throw new Error('Fullscreen API unavailable')}}else{if(app?.isFullscreen&&app.exitFullscreen){await app.exitFullscreen()}else if(document.fullscreenElement&&document.exitFullscreen){await document.exitFullscreen()}else if(document.webkitFullscreenElement&&document.webkitExitFullscreen){document.webkitExitFullscreen()}}}catch(err){toast('Полный экран не поддерживается этим приложением или браузером')}syncFullscreen()}
$('fullscreenToggle').addEventListener('change',e=>setFullscreen(e.target.checked));
document.addEventListener('fullscreenchange',syncFullscreen);document.addEventListener('webkitfullscreenchange',syncFullscreen);
if(tg?.onEvent){tg.onEvent('fullscreenChanged',syncFullscreen);tg.onEvent('fullscreenFailed',()=>{syncFullscreen();toast('Telegram не разрешил полный экран')})}
window.addEventListener('load',()=>{syncFullscreen();try{screen.orientation?.lock?.('landscape')?.catch?.(()=>{})}catch{}});

function update(dt){
let f=(keys.w||keys.arrowup?1:0)-(keys.s||keys.arrowdown?1:0)-joy.y,r=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0)+joy.x;
if(player.inCar){const c=player.car;if(gas||f>0)c.s=Math.min(300,c.s+245*dt);else if(brake||f<0)c.s=Math.max(-95,c.s-330*dt);else c.s*=Math.pow(.16,dt);if(Math.abs(c.s)>3)c.a+=r*2.45*dt*(.3+Math.abs(c.s)/170);const nx=c.x+Math.cos(c.a)*c.s*dt,ny=c.y+Math.sin(c.a)*c.s*dt;if(!blocked(nx,ny,15)){c.x=nx;c.y=ny}else c.s*=-.18;player.x=c.x;player.y=c.y;player.a=c.a;if(Math.abs(c.s)>35){wanted=Math.min(5,Math.max(1,wanted+dt*.03));score+=Math.floor(Math.abs(c.s)*dt*.035)}}else{player.a+=r*2.25*dt;const speed=155*dt,nx=player.x+Math.cos(player.a)*f*speed,ny=player.y+Math.sin(player.a)*f*speed;if(!blocked(nx,ny,10)){player.x=nx;player.y=ny}}
for(const p of police){const a=Math.atan2(player.y-p.y,player.x-p.x);p.a=a;p.x+=Math.cos(a)*(135+wanted*20)*dt;p.y+=Math.sin(a)*(135+wanted*20)*dt;if(Math.hypot(player.x-p.x,player.y-p.y)<35){wanted=Math.min(5,wanted+1);score=Math.max(0,score-50);p.x-=Math.cos(a)*220;p.y-=Math.sin(a)*220;toast('Патруль рядом! Уходи от погони')}}
if(wanted){const nearest=police.reduce((m,p)=>Math.min(m,Math.hypot(player.x-p.x,player.y-p.y)),Infinity);if(nearest>440){escapeTimer+=dt;if(escapeTimer>10){wanted=0;police.length=0;escapeTimer=0;score+=500;toast('Погоня завершена! +500 очков')}}else escapeTimer=0}
$('stars').textContent='★'.repeat(Math.ceil(wanted))+'☆'.repeat(5-Math.ceil(wanted));$('stars').classList.toggle('active',wanted>0);$('wantedText').textContent=wanted?'Патрули ищут тебя':'Полиция спокойна';$('score').innerHTML=score+' <small>₽</small>';
}
function rayBox(ox,oy,dx,dy,b){let tmin=0,tmax=1e9;for(const [o,d,lo,hi] of [[ox,dx,b.x,b.x+b.w],[oy,dy,b.y,b.y+b.h]]){if(Math.abs(d)<1e-8){if(o<lo||o>hi)return Infinity}else{let a=(lo-o)/d,c=(hi-o)/d;if(a>c)[a,c]=[c,a];tmin=Math.max(tmin,a);tmax=Math.min(tmax,c);if(tmax<tmin)return Infinity}}return tmin>0?tmin:tmax}
function drawBillboard(obj,color,policeCar=false){const dx=obj.x-player.x,dy=obj.y-player.y,dist=Math.hypot(dx,dy);if(dist<10)return;let da=Math.atan2(dy,dx)-player.a;while(da>Math.PI)da-=Math.PI*2;while(da<-Math.PI)da+=Math.PI*2;if(Math.abs(da)>.9)return;const focal=W/(2*Math.tan(.58)),sx=W/2+Math.tan(da)*focal,size=Math.min(H*1.2,focal*42/dist);if(graphics.shadows){ctx.fillStyle='#0006';ctx.beginPath();ctx.ellipse(sx,H*.62-size*.055,size*.48,size*.12,0,0,Math.PI*2);ctx.fill()}else{ctx.fillStyle='#0005';ctx.fillRect(sx-size*.38,H*.62-size*.12,size*.76,size*.24)}ctx.fillStyle=color;ctx.fillRect(sx-size*.42,H*.62-size*.24,size*.84,size*.32);ctx.fillStyle='#263b4a';ctx.fillRect(sx-size*.18,H*.62-size*.22,size*.36,size*.23);if(policeCar){ctx.fillStyle='#e33';ctx.fillRect(sx-size*.12,H*.62-size*.29,size*.12,size*.07);ctx.fillStyle='#38f';ctx.fillRect(sx,H*.62-size*.29,size*.12,size*.07)}}
function render(){ctx.setTransform(1,0,0,1,0,0);const horizon=Math.max(H*.28,Math.min(H*.68,H*.48+player.pitch));let sky=ctx.createLinearGradient(0,0,0,horizon);sky.addColorStop(0,'#6d9bb5');sky.addColorStop(1,'#d2c7a6');ctx.fillStyle=sky;ctx.fillRect(0,0,W,horizon);let ground=ctx.createLinearGradient(0,horizon,0,H);ground.addColorStop(0,'#58645a');ground.addColorStop(1,'#202a27');ctx.fillStyle=ground;ctx.fillRect(0,horizon,W,H-horizon);
const fov=1.12,rays=Math.max(80,Math.min(graphics.rays,Math.floor(W/1.5))),slice=W/rays,zbuf=new Float32Array(rays);
for(let i=0;i<rays;i++){const cam=(i/rays-.5)*fov,angle=player.a+cam,dx=Math.cos(angle),dy=Math.sin(angle);let near=graphics.distance,hit=null;for(const b of buildings){const t=rayBox(player.x,player.y,dx,dy,b);if(t<near){near=t;hit=b}}const corrected=near*Math.cos(cam);zbuf[i]=corrected;const wallH=Math.min(H*2,H*1.05/(corrected/180));const top=horizon-wallH/2;let shade=Math.max(.25,1-corrected/1200)*graphics.shade;ctx.fillStyle=hit?shadeColor(hit.c,shade):'#53645b';ctx.fillRect(i*slice,top,slice+1,wallH);ctx.fillStyle='#ffffff18';ctx.fillRect(i*slice,top,slice+1,Math.max(1,wallH*.025));ctx.fillStyle='#0002';ctx.fillRect(i*slice,top+wallH*.9,slice+1,wallH*.1)}
// Perspective road markings
for(let lane=-2;lane<=2;lane++){const x=W/2+lane*W*.18;ctx.strokeStyle='#d9d0a7aa';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(W/2+(x-W/2)*.08,horizon+8);ctx.lineTo(x,H);ctx.stroke()}
const objects=[...cars.filter(c=>!c.taken).map(c=>({o:c,col:c.color,p:false})),...police.map(p=>({o:p,col:'#e9edf0',p:true}))].sort((a,b)=>Math.hypot(b.o.x-player.x,b.o.y-player.y)-Math.hypot(a.o.x-player.x,a.o.y-player.y));
for(const item of objects)if(Math.hypot(item.o.x-player.x,item.o.y-player.y)<graphics.distance)drawBillboard(item.o,item.col,item.p);
if(player.inCar){ctx.fillStyle='#111c25';ctx.beginPath();ctx.moveTo(0,H);ctx.lineTo(W*.17,H*.82);ctx.lineTo(W*.83,H*.82);ctx.lineTo(W,H);ctx.fill();ctx.fillStyle='#263d48';ctx.fillRect(W*.36,H*.89,W*.28,H*.035);ctx.fillStyle='#0b1118';ctx.fillRect(W*.43,H*.86,W*.14,H*.06)}
}
function shadeColor(hex,k){const n=parseInt(hex.slice(1),16),r=Math.floor(((n>>16)&255)*k),g=Math.floor(((n>>8)&255)*k),b=Math.floor((n&255)*k);return 'rgb('+r+','+g+','+b+')'}
function loop(t){const elapsed=Math.min((t-last)/1000,.1);last=t;accumulated+=elapsed;if(t-lastFrame>=frameInterval){const dt=accumulated;accumulated=0;lastFrame=t;if(running&&!paused)update(dt);render()}requestAnimationFrame(loop)}requestAnimationFrame(loop);
})();