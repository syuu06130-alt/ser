/* =============================================
   NERO — 首都高レーサー · script.js
   16-ROUTE CHAOS EDITION · 30sec AUTO-SWITCH
   ============================================= */
'use strict';

const CAR_W=1.90,CAR_L=4.60,CAR_H=0.55;
const ROAD_W=22;
const ENEMY_COLORS=[0xcc2200,0x0044cc,0xcc9900,0x226633,0x884488,0x006688,0xff6600,0x00aa88];

let bestScore=parseInt(localStorage.getItem('nero_best')||'0');
document.getElementById('hud-best').textContent=bestScore;
document.getElementById('go-best').textContent=bestScore;

let gfxMode='normal';
const GFX={
  flat:  {fog:0.022,maxEnemies:4, buildings:false,windows:false,shadows:false,pixelRatio:1.0,  antialias:false},
  normal:{fog:0.013,maxEnemies:8, buildings:true, windows:true, shadows:false,pixelRatio:Math.min(window.devicePixelRatio,1.5),antialias:true},
  high:  {fog:0.009,maxEnemies:12,buildings:true, windows:true, shadows:true, pixelRatio:Math.min(window.devicePixelRatio,2),  antialias:true},
};

const renderer=new THREE.WebGLRenderer({antialias:GFX[gfxMode].antialias});
renderer.setPixelRatio(GFX[gfxMode].pixelRatio);
renderer.setSize(window.innerWidth,window.innerHeight);
renderer.shadowMap.enabled=GFX[gfxMode].shadows;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.setClearColor(0x010408);
document.body.insertBefore(renderer.domElement,document.getElementById('loading-screen'));

const scene=new THREE.Scene();
scene.fog=new THREE.FogExp2(0x010408,GFX[gfxMode].fog);
const camera=new THREE.PerspectiveCamera(60,window.innerWidth/window.innerHeight,0.1,900);
window.addEventListener('resize',()=>{
  renderer.setSize(window.innerWidth,window.innerHeight);
  camera.aspect=window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
});

scene.add(new THREE.AmbientLight(0x04080e,1.6));
scene.add(new THREE.HemisphereLight(0x060c1c,0x020406,0.5));
const sodiumGroup=new THREE.Group();scene.add(sodiumGroup);
[-40,-20,0,20,40].forEach(zo=>{const pl=new THREE.PointLight(0xffcc55,3.0,52);pl.position.set(0,8,zo);sodiumGroup.add(pl);});
const cityGlowL=new THREE.PointLight(0x1a3a88,2.0,80);
const cityGlowR=new THREE.PointLight(0x112244,1.6,80);
scene.add(cityGlowL);scene.add(cityGlowR);

const ROUTES=[
  {name:'湾岸スーパーオーバル',nameEn:'WANGAN SUPER OVAL',desc:'最大級ハイスピード · 320km/h解放',fogDensity:0.009,accentColor:'#00c4ff',pts:[[0,0],[0,60],[8,125],[28,185],[68,238],[125,275],[195,295],[270,290],[340,270],[398,234],[438,180],[452,115],[448,48],[426,-18],[388,-75],[334,-118],[268,-145],[196,-152],[124,-140],[62,-112],[20,-70],[-2,-24]]},
  {name:'C1タイトループ',nameEn:'C1 TIGHT LOOP',desc:'都心最密 · テクニカルマスター',fogDensity:0.018,accentColor:'#ff4422',pts:[[0,0],[42,14],[74,48],[84,92],[74,138],[48,168],[10,182],[-28,178],[-60,152],[-78,112],[-78,68],[-60,30],[-30,8],[-4,0]]},
  {name:'C2外環ハイスピード',nameEn:'C2 OUTER RING',desc:'広大スイーピング · 連続コーナー',fogDensity:0.010,accentColor:'#22ff88',pts:[[0,0],[-32,75],[-58,165],[-64,262],[-48,355],[0,425],[72,472],[158,490],[246,472],[318,426],[364,352],[378,268],[368,180],[336,100],[278,40],[205,4],[128,-12],[60,-6]]},
  {name:'首都高ジャンクション',nameEn:'JUNCTION FIGURE-8',desc:'全要素 · 複合8の字',fogDensity:0.014,accentColor:'#ffaa00',pts:[[0,0],[75,40],[122,110],[112,185],[55,225],[-8,230],[-70,212],[-118,165],[-130,98],[-84,38],[-18,8],[50,-25],[96,-88],[94,-162],[42,-208],[-24,-222],[-85,-200],[-126,-152],[-128,-84],[-80,-32],[-20,-6]]},
  {name:'レインボーブリッジ',nameEn:'RAINBOW SPIRAL',desc:'海上高架 · 螺旋ループ',fogDensity:0.012,accentColor:'#ff88ff',pts:[[0,0],[35,22],[90,30],[150,22],[200,-8],[242,-50],[268,-105],[275,-162],[260,-218],[225,-262],[175,-288],[118,-295],[62,-280],[14,-250],[-18,-205],[-28,-150],[-16,-96],[16,-50],[50,-20]]},
  {name:'渋谷ヘアピン地獄',nameEn:'SHIBUYA HAIRPIN HELL',desc:'最凶テクニカル · ヘアピン12連',fogDensity:0.020,accentColor:'#ff2266',pts:[[0,0],[28,20],[42,55],[32,90],[0,110],[-34,114],[-58,98],[-65,68],[-55,40],[-30,22],[-4,18],[22,26],[46,46],[56,74],[48,105],[24,130],[0,142],[-26,140],[-48,122],[-56,96],[-46,70],[-22,54],[0,50]]},
  {name:'羽田アクセスライン',nameEn:'HANEDA LONG STRAIGHT',desc:'空港直結 · 最高速アタック',fogDensity:0.008,accentColor:'#00ffcc',pts:[[0,0],[0,90],[0,200],[0,320],[0,450],[0,570],[25,648],[65,705],[118,732],[178,740],[238,720],[285,680],[312,625],[318,560],[300,495],[265,440],[218,398],[165,368],[110,348],[60,330],[18,305],[0,265],[0,180],[0,90]]},
  {name:'台場湾岸サーキット',nameEn:'DAIBA BAY CIRCUIT',desc:'臨海複合 · テクニカルハイスピード',fogDensity:0.013,accentColor:'#44aaff',pts:[[0,0],[65,12],[125,44],[160,98],[152,155],[120,195],[72,210],[24,198],[-16,168],[-38,120],[-36,72],[-12,36],[28,18],[72,12],[125,28],[172,64],[195,118],[188,172],[158,212],[115,240],[65,250],[15,238],[-28,210],[-58,168],[-65,114],[-48,62],[-12,28]]},
  {name:'ドーナツ高速リング',nameEn:'DONUT RING RUSH',desc:'完全円形 · 最大バンク',fogDensity:0.011,accentColor:'#ffcc00',pts:[[140,0],[135,40],[120,76],[97,104],[68,122],[36,128],[4,122],[-24,104],[-46,76],[-56,40],[-56,0],[-46,-40],[-24,-76],[4,-104],[36,-122],[68,-122],[97,-104],[120,-76],[135,-40]]},
  {name:'首都高ダブルループ',nameEn:'DOUBLE LOOP HIGHWAY',desc:'二重螺旋 · 立体交差',fogDensity:0.015,accentColor:'#ff6600',pts:[[0,0],[50,30],[90,80],[100,140],[80,195],[40,230],[0,240],[-40,230],[-80,195],[-100,140],[-90,80],[-50,30],[0,0],[40,-30],[70,-80],[70,-150],[40,-210],[0,-240],[-40,-210],[-70,-150],[-70,-80],[-40,-30]]},
  {name:'スパイラルタワー',nameEn:'SPIRAL TOWER',desc:'内巻きスパイラル · 極限技術',fogDensity:0.017,accentColor:'#aa44ff',pts:[[0,0],[80,0],[140,30],[175,85],[170,150],[130,200],[72,220],[18,210],[-30,180],[-60,138],[-72,88],[-65,42],[-40,8],[-5,-5],[35,-8],[65,10],[88,40],[98,78],[92,112],[72,138],[44,152],[15,150],[-10,136],[-28,112],[-32,84],[-22,58],[-5,40],[15,33],[35,36],[50,48],[58,65],[56,84],[46,98],[30,105]]},
  {name:'深川ハーバーS字',nameEn:'FUKAGAWA HARBOR',desc:'港湾高架 · S字連続',fogDensity:0.014,accentColor:'#00ccff',pts:[[0,0],[40,15],[78,15],[110,-5],[130,-35],[130,-72],[112,-105],[80,-128],[42,-138],[4,-134],[-32,-116],[-58,-86],[-70,-50],[-66,-14],[-48,18],[-20,38],[12,44],[44,36],[70,16],[90,-12],[100,-46],[100,-82],[88,-115],[64,-140],[32,-152],[-4,-150],[-38,-134],[-64,-104],[-78,-66],[-76,-26],[-58,12],[-30,40]]},
  {name:'メビウスバイパス',nameEn:'MOBIUS BYPASS',desc:'捻れ無限ループ · 方向感覚崩壊',fogDensity:0.016,accentColor:'#ff44aa',pts:[[0,0],[60,40],[108,90],[130,150],[125,210],[95,256],[50,280],[0,280],[-50,256],[-80,210],[-75,150],[-48,100],[0,70],[48,70],[88,90],[118,135],[120,190],[95,238],[52,268],[0,268],[-52,254],[-90,225],[-105,180],[-98,130],[-70,85],[-28,52],[18,32],[50,18]]},
  {name:'逆走チャレンジ',nameEn:'GHOST REVERSE RUN',desc:'逆走設計 · 鋭角連続アタック',fogDensity:0.013,accentColor:'#ff1111',pts:[[0,0],[-55,35],[-100,90],[-128,160],[-135,235],[-118,308],[-78,368],[-22,406],[42,418],[108,402],[165,360],[202,300],[218,230],[212,158],[185,96],[142,50],[88,20],[32,5]]},
  {name:'首都高フルマラソン',nameEn:'FULL COURSE MARATHON',desc:'全長最長 · 持久力勝負',fogDensity:0.010,accentColor:'#88ff44',pts:[[0,0],[0,80],[10,175],[35,265],[75,345],[128,410],[195,455],[268,476],[345,472],[415,442],[472,390],[508,322],[522,245],[514,166],[488,95],[446,38],[390,-8],[326,-40],[256,-56],[185,-58],[118,-44],[60,-16],[18,20]]},
  {name:'カオスX',nameEn:'CHAOS X',desc:'予測不能 · 全要素融合地獄',fogDensity:0.018,accentColor:'#ffffff',pts:[[0,0],[55,45],[88,108],[78,178],[28,225],[-38,238],[-95,208],[-128,148],[-120,82],[-72,32],[-8,18],[55,32],[102,72],[120,130],[106,190],[60,228],[0,240],[-55,222],[-92,182],[-100,128],[-70,78],[-18,48],[35,50],[75,78],[95,122],[88,172],[52,208],[0,220],[-46,206],[-78,172],[-85,126],[-60,86],[-20,62],[22,64],[55,85],[65,120]]},
];

const ROUTE_DURATION=30;
let autoRouteRemain=ROUTE_DURATION;
let _routeSwitchWarned=false;
let _isSwitching=false;

let currentRouteIdx=0;
let routeSpline,ROUTE_LENGTH;
let MINIMAP_PTS=[];
let mmMinX,mmMaxX,mmMinZ,mmMaxZ;

function buildSplineForRoute(idx){
  const route=ROUTES[idx];
  const pts=route.pts.map(([x,z])=>new THREE.Vector3(x,0,z));
  routeSpline=new THREE.CatmullRomCurve3(pts,true,'catmullrom',0.5);
  ROUTE_LENGTH=routeSpline.getLength();
  MINIMAP_PTS=routeSpline.getPoints(400);
  mmMinX=mmMaxX=MINIMAP_PTS[0].x;mmMinZ=mmMaxZ=MINIMAP_PTS[0].z;
  MINIMAP_PTS.forEach(p=>{
    if(p.x<mmMinX)mmMinX=p.x;if(p.x>mmMaxX)mmMaxX=p.x;
    if(p.z<mmMinZ)mmMinZ=p.z;if(p.z>mmMaxZ)mmMaxZ=p.z;
  });
}
buildSplineForRoute(0);

const matRoad    =new THREE.MeshStandardMaterial({color:0x0c1014,roughness:0.22,metalness:0.08,side:THREE.DoubleSide});
const matShoulder=new THREE.MeshStandardMaterial({color:0x141820,roughness:0.80,side:THREE.DoubleSide});
const matConcA   =new THREE.MeshLambertMaterial({color:0xa0a0b0,side:THREE.DoubleSide});
const matConcB   =new THREE.MeshLambertMaterial({color:0x808090,side:THREE.DoubleSide});
const matConcC   =new THREE.MeshLambertMaterial({color:0x5c5c6c,side:THREE.DoubleSide});
const matMetal   =new THREE.MeshPhongMaterial({color:0x8899aa,shininess:50,side:THREE.DoubleSide});
const matLampBody=new THREE.MeshLambertMaterial({color:0x3a3a45});
const matLampGlow=new THREE.MeshBasicMaterial({color:0xffdd88});
const matLine    =new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide});
const matYellow  =new THREE.MeshBasicMaterial({color:0xffdd00,side:THREE.DoubleSide});
const matSignGrn =new THREE.MeshLambertMaterial({color:0x0f3d1a});
const matSignWht =new THREE.MeshBasicMaterial({color:0xffffff});
const matRail    =new THREE.MeshPhongMaterial({color:0xaabbcc,shininess:80,side:THREE.DoubleSide});
const matPillar  =new THREE.MeshLambertMaterial({color:0x505060});

function makeRibbon(spline,lOff,rOff,y,N){
  N=N||320;const pos=new Float32Array(N*6),idx=[];
  for(let i=0;i<N;i++){
    const t=i/N,pt=spline.getPointAt(t),tan=spline.getTangentAt(t);
    const rL=Math.sqrt(tan.x*tan.x+tan.z*tan.z)||1,rx=-tan.z/rL,rz=tan.x/rL,b=i*6;
    pos[b]=pt.x+rx*lOff;pos[b+1]=y;pos[b+2]=pt.z+rz*lOff;
    pos[b+3]=pt.x+rx*rOff;pos[b+4]=y;pos[b+5]=pt.z+rz*rOff;
    const vi=i*2,nvi=((i+1)%N)*2;idx.push(vi,nvi,vi+1,nvi,nvi+1,vi+1);
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();return geo;
}
function makeWall(spline,off,yBot,yTop,N){
  N=N||320;const pos=new Float32Array(N*6),idx=[];
  for(let i=0;i<N;i++){
    const t=i/N,pt=spline.getPointAt(t),tan=spline.getTangentAt(t);
    const rL=Math.sqrt(tan.x*tan.x+tan.z*tan.z)||1,rx=-tan.z/rL,rz=tan.x/rL;
    const bx=pt.x+rx*off,bz=pt.z+rz*off,b=i*6;
    pos[b]=bx;pos[b+1]=yBot;pos[b+2]=bz;pos[b+3]=bx;pos[b+4]=yTop;pos[b+5]=bz;
    const vi=i*2,nvi=((i+1)%N)*2;idx.push(vi,vi+1,nvi,vi+1,nvi+1,nvi);
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();return geo;
}
function makeDashedRibbon(spline,lOff,rOff,y,dashLen,gapLen,N){
  N=N||600;const totalLen=spline.getLength(),period=dashLen+gapLen,posArr=[],idxArr=[];let vi=0;
  for(let i=0;i<N;i++){
    const t0=i/N,arc0=t0*totalLen;if((arc0%period)>dashLen)continue;
    const t1=(i+1)/N,pt0=spline.getPointAt(t0),tan0=spline.getTangentAt(t0);
    const r0=Math.sqrt(tan0.x*tan0.x+tan0.z*tan0.z)||1,rx0=-tan0.z/r0,rz0=tan0.x/r0;
    const pt1=spline.getPointAt(t1),tan1=spline.getTangentAt(t1);
    const r1=Math.sqrt(tan1.x*tan1.x+tan1.z*tan1.z)||1,rx1=-tan1.z/r1,rz1=tan1.x/r1;
    posArr.push(pt0.x+rx0*lOff,y,pt0.z+rz0*lOff,pt0.x+rx0*rOff,y,pt0.z+rz0*rOff,pt1.x+rx1*lOff,y,pt1.z+rz1*lOff,pt1.x+rx1*rOff,y,pt1.z+rz1*rOff);
    idxArr.push(vi,vi+2,vi+1,vi+1,vi+2,vi+3);vi+=4;
  }
  if(!posArr.length)return null;
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(posArr,3));geo.setIndex(idxArr);geo.computeVertexNormals();return geo;
}

const roadGroup=new THREE.Group();scene.add(roadGroup);
const cityGroup=new THREE.Group();scene.add(cityGroup);
function addR(geo,mat){if(!geo)return;roadGroup.add(new THREE.Mesh(geo,mat));}

function buildRoad(){
  const sp=routeSpline,N=gfxMode==='flat'?180:320;
  addR(makeRibbon(sp,-ROAD_W/2,ROAD_W/2,0.005,N),matRoad);
  addR(makeRibbon(sp,ROAD_W/2,ROAD_W/2+2.6,0.002,N),matShoulder);
  addR(makeRibbon(sp,-ROAD_W/2-2.6,-ROAD_W/2,0.002,N),matShoulder);
  addR(makeRibbon(sp,ROAD_W/2-0.28,ROAD_W/2-0.12,0.012,N),matYellow);
  addR(makeRibbon(sp,-ROAD_W/2+0.12,-ROAD_W/2+0.28,0.012,N),matYellow);
  addR(makeDashedRibbon(sp,-ROAD_W/6-0.07,-ROAD_W/6+0.07,0.014,6,10,N*2),matLine);
  addR(makeDashedRibbon(sp,ROAD_W/6-0.07,ROAD_W/6+0.07,0.014,6,10,N*2),matLine);
  [-(ROAD_W/2+2.2),(ROAD_W/2+2.2)].forEach(bx=>{
    addR(makeRibbon(sp,bx-0.28,bx+0.28,0.26,N),matConcA);
    addR(makeWall(sp,bx-0.28,0,0.26,N),matConcA);addR(makeWall(sp,bx+0.28,0,0.26,N),matConcA);
    addR(makeRibbon(sp,bx-0.19,bx+0.19,0.56,N),matConcB);
    addR(makeWall(sp,bx-0.19,0.26,0.56,N),matConcB);addR(makeWall(sp,bx+0.19,0.26,0.56,N),matConcB);
    addR(makeRibbon(sp,bx-0.11,bx+0.11,0.98,N),matConcA);
    addR(makeWall(sp,bx-0.11,0.56,0.98,N),matConcA);addR(makeWall(sp,bx+0.11,0.56,0.98,N),matConcA);
    addR(makeWall(sp,bx,0.98,1.12,N),matRail);
  });
  if(gfxMode!=='flat'){
    addR(makeWall(sp,-(ROAD_W/2+4.8),0,5.5,N),matConcC);
    addR(makeWall(sp,(ROAD_W/2+4.8),0,5.5,N),matConcC);
  }
  buildProps();buildCityBackdrop();
}

function buildProps(){
  const sp=routeSpline,PN=200;
  for(let i=0;i<PN;i++){
    const t=i/PN,pt=sp.getPointAt(t),tan=sp.getTangentAt(t).normalize();
    const rx=-tan.z,rz=tan.x,angle=Math.atan2(tan.x,tan.z);
    function place(geo,mat,ox,oy,oz){
      const m=new THREE.Mesh(geo,mat);m.position.set(pt.x+rx*ox+tan.x*oz,oy,pt.z+rz*ox+tan.z*oz);m.rotation.y=angle;roadGroup.add(m);
    }
    if(i%4===0&&gfxMode!=='flat'){[-(ROAD_W/2+7),(ROAD_W/2+7)].forEach(px=>{place(new THREE.BoxGeometry(0.9,7.5,0.7),matPillar,px,-3.75,0);});}
    if(i%15===0&&gfxMode!=='flat'){
      const H=8;
      [-(ROAD_W/2+4.8),(ROAD_W/2+4.8)].forEach(cx=>{place(new THREE.CylinderGeometry(0.12,0.12,H,6),matMetal,cx,H/2,0);});
      place(new THREE.BoxGeometry(ROAD_W+11,0.32,0.32),matMetal,0,H,0);
      [-(ROAD_W/2-1.5),-(ROAD_W/6),0,(ROAD_W/6),(ROAD_W/2-1.5)].forEach(lx=>{
        place(new THREE.BoxGeometry(0.68,0.20,0.85),matLampBody,lx,H-0.55,0);
        place(new THREE.BoxGeometry(0.54,0.02,0.70),matLampGlow,lx,H-0.68,0);
      });
      place(new THREE.BoxGeometry(9.2,2.0,0.12),matSignGrn,0,H+1.1,0);
      place(new THREE.BoxGeometry(9.5,2.24,0.08),matSignWht,0,H+1.1,0);
    }
    if(i%8<2){
      const side=i%16<8?1:-1,lx=side*(ROAD_W/2+3.5);
      place(new THREE.CylinderGeometry(0.08,0.10,10,6),matMetal,lx,5,0);
      place(new THREE.BoxGeometry(2.5,0.10,0.10),matMetal,lx+side*1.25,9.8,0);
      place(new THREE.BoxGeometry(0.60,0.18,0.55),matLampBody,lx+side*2.4,9.5,0);
      place(new THREE.BoxGeometry(0.50,0.02,0.45),matLampGlow,lx+side*2.4,9.38,0);
    }
  }
}

function buildCityBackdrop(){
  const r=n=>Math.abs(Math.sin(n*234.5));
  for(let i=0;i<100;i++){
    const t=i/100,pt=routeSpline.getPointAt(t),tan=routeSpline.getTangentAt(t);
    const right=new THREE.Vector3(-tan.z,0,tan.x),side=i%2===0?1:-1,dist=24+r(i*7)*35;
    const bw=8+r(i*3)*20,bh=15+r(i*3+1)*60,bd=5+r(i)*14;
    const bpos=pt.clone().addScaledVector(right,side*dist);bpos.y=bh/2;
    const bld=new THREE.Mesh(new THREE.BoxGeometry(bw,bh,bd),new THREE.MeshLambertMaterial({color:0x060b14}));
    bld.position.copy(bpos);cityGroup.add(bld);
    if(GFX[gfxMode].windows){
      const rows=Math.floor(bh/4),cols=Math.floor(bw/3);
      for(let wr=0;wr<rows;wr++)for(let wc=0;wc<cols;wc++){
        if(r(wr*100+wc+i*1000)>0.52){
          const wm=new THREE.MeshBasicMaterial({color:r(wr*200+wc)>0.65?0xffcc44:0x2244aa});
          const win=new THREE.Mesh(new THREE.PlaneGeometry(0.9,1.1),wm);
          win.rotation.y=Math.atan2(right.x,right.z)+(side>0?0:Math.PI);
          win.position.set(bpos.x+side*(bw/2+0.01),wr*4+2.5,bpos.z-bw/3+wc*3);cityGroup.add(win);
        }
      }
    }
  }
}

function clearRoad(){
  [roadGroup,cityGroup].forEach(g=>{
    while(g.children.length>0){const c=g.children[0];if(c.geometry)c.geometry.dispose();g.remove(c);}
  });
}

const playerCar=new THREE.Group(),playerCarBody=new THREE.Group();
playerCar.add(playerCarBody);scene.add(playerCar);
const wheelNodes=[];

function buildLamborghini(){
  const paintBlack=new THREE.MeshPhongMaterial({color:0x040407,shininess:240,specular:0x4444aa});
  const paintGold=new THREE.MeshPhongMaterial({color:0xd4a017,shininess:260,specular:0xffe066});
  const carbon=new THREE.MeshPhongMaterial({color:0x0b0b0e,shininess:30,specular:0x222222});
  const glass=new THREE.MeshPhongMaterial({color:0x14202c,transparent:true,opacity:0.38,shininess:320,specular:0x8899bb});
  const chrome=new THREE.MeshPhongMaterial({color:0xe0e0ee,shininess:500,specular:0xffffff});
  const headMat=new THREE.MeshBasicMaterial({color:0xffffff});
  const drlMat=new THREE.MeshBasicMaterial({color:0xddeeff});
  const ambMat=new THREE.MeshBasicMaterial({color:0xffaa00});
  const tailMat=new THREE.MeshBasicMaterial({color:0xff0d00});
  const tailDim=new THREE.MeshBasicMaterial({color:0x440200});
  const rubber=new THREE.MeshPhongMaterial({color:0x060606,shininess:5});
  const rimMat=new THREE.MeshPhongMaterial({color:0xbbbbbb,shininess:320,specular:0xffffff});
  const rimGold=new THREE.MeshPhongMaterial({color:0xd4a017,shininess:250});
  const blkMat=new THREE.MeshBasicMaterial({color:0x000000});
  function add(geo,mat,px,py,pz,rx,ry,rz){
    const m=new THREE.Mesh(geo,mat);m.position.set(px,py,pz);
    if(rx!==undefined)m.rotation.x=rx;if(ry!==undefined)m.rotation.y=ry;if(rz!==undefined)m.rotation.z=rz;
    m.castShadow=true;playerCarBody.add(m);return m;
  }
  if(gfxMode==='flat'){
    add(new THREE.BoxGeometry(CAR_W,CAR_H*2,CAR_L),new THREE.MeshPhongMaterial({color:0x101015,shininess:60}),0,0.37,0);
    add(new THREE.BoxGeometry(CAR_W*0.7,0.45,CAR_L*0.55),new THREE.MeshPhongMaterial({color:0x080810}),0,0.90,0);
    [{x:-CAR_W*0.52,z:CAR_L*0.33,f:true},{x:CAR_W*0.52,z:CAR_L*0.33,f:true},{x:-CAR_W*0.52,z:-CAR_L*0.31,f:false},{x:CAR_W*0.52,z:-CAR_L*0.31,f:false}].forEach(wd=>{
      const piv=new THREE.Group();piv.position.set(wd.x,0.30,wd.z);playerCarBody.add(piv);
      const sp=new THREE.Group();piv.add(sp);
      const t=new THREE.Mesh(new THREE.CylinderGeometry(0.30,0.30,0.22,12),rubber);t.rotation.z=Math.PI/2;sp.add(t);
      const rr=new THREE.Mesh(new THREE.CylinderGeometry(0.20,0.20,0.22,8),rimMat);rr.rotation.z=Math.PI/2;sp.add(rr);
      wheelNodes.push({pivot:piv,spin:sp,front:wd.f});
    });
    return;
  }
  add(new THREE.BoxGeometry(CAR_W*0.98,0.07,CAR_L),carbon,0,0.07,0);
  add(new THREE.BoxGeometry(CAR_W*0.93,CAR_H,CAR_L*0.84),paintBlack,0,0.37,0);
  [-1,1].forEach(s=>{
    add(new THREE.BoxGeometry(0.28,0.62,1.85),paintBlack,s*(CAR_W*0.49+0.12),0.51,-0.28);
    add(new THREE.BoxGeometry(0.12,0.18,1.72),paintBlack,s*(CAR_W*0.53+0.04),0.22,-0.28);
    add(new THREE.BoxGeometry(0.04,0.06,1.64),paintGold,s*(CAR_W*0.50+0.16),0.82,-0.28);
    add(new THREE.BoxGeometry(0.22,0.50,1.28),paintBlack,s*(CAR_W*0.49+0.08),0.44,CAR_L*0.26);
    add(new THREE.BoxGeometry(0.04,0.05,1.18),paintGold,s*(CAR_W*0.50+0.14),0.78,CAR_L*0.26);
  });
  add(new THREE.BoxGeometry(CAR_W*0.84,0.09,CAR_L*0.44),paintBlack,0,0.68,CAR_L*0.18);
  add(new THREE.BoxGeometry(CAR_W*0.82,0.22,0.30),paintBlack,0,0.54,CAR_L*0.43,-0.50);
  add(new THREE.BoxGeometry(0.44,0.07,CAR_L*0.28),carbon,0,0.73,CAR_L*0.10);
  add(new THREE.BoxGeometry(CAR_W*0.74,0.56,1.65),paintBlack,0,0.92,-0.02);
  add(new THREE.BoxGeometry(CAR_W*0.64,0.10,1.42),paintBlack,0,1.24,-0.04);
  const wsm=new THREE.Mesh(new THREE.BoxGeometry(CAR_W*0.68,0.52,0.08),glass);wsm.position.set(0,0.96,CAR_L*0.16);wsm.rotation.x=0.50;playerCarBody.add(wsm);
  const rwm=new THREE.Mesh(new THREE.BoxGeometry(CAR_W*0.54,0.42,0.08),glass);rwm.position.set(0,0.98,-CAR_L*0.13);rwm.rotation.x=-0.30;playerCarBody.add(rwm);
  [-1,1].forEach(s=>{
    const sw=new THREE.Mesh(new THREE.BoxGeometry(0.06,0.38,1.28),glass);sw.position.set(s*CAR_W*0.40,0.97,-0.01);playerCarBody.add(sw);
    add(new THREE.BoxGeometry(0.06,0.08,0.26),carbon,s*(CAR_W*0.40+0.09),1.20,CAR_L*0.12);
    add(new THREE.BoxGeometry(0.06,0.22,CAR_L*0.76),carbon,s*CAR_W*0.50,0.17,-0.02);
    add(new THREE.BoxGeometry(0.04,0.04,CAR_L*0.66),paintGold,s*CAR_W*0.53,0.30,-0.02);
  });
  add(new THREE.BoxGeometry(CAR_W*0.90,0.26,0.09),carbon,0,0.24,CAR_L*0.445);
  add(new THREE.BoxGeometry(0.64,0.22,0.10),carbon,0,0.20,CAR_L*0.445);
  add(new THREE.BoxGeometry(0.58,0.16,0.07),blkMat,0,0.20,CAR_L*0.445+0.04);
  [-1,1].forEach(s=>{
    add(new THREE.BoxGeometry(0.44,0.14,0.09),new THREE.MeshPhongMaterial({color:0x1a1a24,shininess:200}),s*0.62,0.58,CAR_L*0.445);
    add(new THREE.BoxGeometry(0.40,0.04,0.08),drlMat,s*0.62,0.65,CAR_L*0.445);
    add(new THREE.BoxGeometry(0.28,0.08,0.07),headMat,s*0.60,0.58,CAR_L*0.445);
    add(new THREE.BoxGeometry(0.14,0.07,0.07),ambMat,s*0.60,0.49,CAR_L*0.445);
    add(new THREE.BoxGeometry(0.36,0.025,0.07),drlMat,s*0.60,0.54,CAR_L*0.444);
  });
  add(new THREE.BoxGeometry(CAR_W*0.88,0.28,0.22),carbon,0,0.17,-CAR_L*0.444);
  add(new THREE.BoxGeometry(CAR_W*1.14,0.07,0.32),carbon,0,1.08,-CAR_L*0.42);
  add(new THREE.BoxGeometry(CAR_W*1.10,0.04,0.28),paintBlack,0,1.12,-CAR_L*0.42);
  [-1,1].forEach(s=>{
    add(new THREE.BoxGeometry(0.07,0.42,0.30),carbon,s*CAR_W*0.58,0.89,-CAR_L*0.42);
    add(new THREE.BoxGeometry(0.48,0.09,0.08),tailMat,s*0.62,0.58,-CAR_L*0.444);
    add(new THREE.BoxGeometry(0.22,0.07,0.08),paintGold,s*0.62,0.51,-CAR_L*0.444);
    add(new THREE.BoxGeometry(0.44,0.06,0.07),tailDim,s*0.62,0.44,-CAR_L*0.444);
  });
  add(new THREE.BoxGeometry(CAR_W*0.88,0.04,0.07),tailMat,0,0.59,-CAR_L*0.444);
  [-0.40,0.40].forEach(x=>{
    const pipe=new THREE.Mesh(new THREE.CylinderGeometry(0.065,0.055,0.18,12),chrome);
    pipe.rotation.x=Math.PI/2;pipe.position.set(x,0.21,-CAR_L*0.445);playerCarBody.add(pipe);
  });
  [{x:-CAR_W*0.52,z:CAR_L*0.33,f:true},{x:CAR_W*0.52,z:CAR_L*0.33,f:true},{x:-CAR_W*0.52,z:-CAR_L*0.31,f:false},{x:CAR_W*0.52,z:-CAR_L*0.31,f:false}].forEach(wd=>{
    const piv=new THREE.Group();piv.position.set(wd.x,0.30,wd.z);playerCarBody.add(piv);
    const sp=new THREE.Group();piv.add(sp);
    const tR=wd.f?0.30:0.31,tW=wd.f?0.22:0.27;
    const t=new THREE.Mesh(new THREE.CylinderGeometry(tR,tR,tW,24),rubber);t.rotation.z=Math.PI/2;sp.add(t);
    [-1,1].forEach(si=>{
      const bd=new THREE.Mesh(new THREE.TorusGeometry(tR-0.025,0.016,5,20),new THREE.MeshPhongMaterial({color:0x111111,shininess:4}));
      bd.rotation.y=Math.PI/2;bd.position.x=si*tW*0.44;sp.add(bd);
    });
    const barrel=new THREE.Mesh(new THREE.CylinderGeometry(tR-0.04,tR-0.04,tW-0.01,20),new THREE.MeshPhongMaterial({color:0x1a1a1e}));barrel.rotation.z=Math.PI/2;sp.add(barrel);
    const face=new THREE.Mesh(new THREE.CylinderGeometry(tR*0.72,tR*0.72,tW+0.01,12),rimMat);face.rotation.z=Math.PI/2;sp.add(face);
    for(let si=0;si<10;si++){
      const spk=new THREE.Mesh(new THREE.BoxGeometry(0.038,0.18,tW+0.01),rimMat);
      spk.rotation.z=Math.PI/2;spk.rotation.x=(si/10)*Math.PI*2;sp.add(spk);
    }
    const hub=new THREE.Mesh(new THREE.CylinderGeometry(0.066,0.066,tW+0.02,10),chrome);hub.rotation.z=Math.PI/2;sp.add(hub);
    const badge=new THREE.Mesh(new THREE.CylinderGeometry(0.038,0.038,tW+0.03,6),rimGold);badge.rotation.z=Math.PI/2;sp.add(badge);
    const cali=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.16,tW-0.02),rimGold);cali.rotation.z=Math.PI/2;cali.position.y=tR*0.50;sp.add(cali);
    const disc=new THREE.Mesh(new THREE.CylinderGeometry(tR*0.60,tR*0.60,0.04,14),new THREE.MeshPhongMaterial({color:0x2a2a2e,shininess:40}));disc.rotation.z=Math.PI/2;sp.add(disc);
    wheelNodes.push({pivot:piv,spin:sp,front:wd.f});
  });
}

const playerFoot=new THREE.Group();playerFoot.visible=false;scene.add(playerFoot);
function buildPlayer(){
  const ge=new THREE.MeshLambertMaterial({color:0x141418}),su=new THREE.MeshLambertMaterial({color:0x0a0a14});
  const vi=new THREE.MeshBasicMaterial({color:0xd4a017,transparent:true,opacity:0.55}),go=new THREE.MeshBasicMaterial({color:0xd4a017});
  function pa(geo,mat,px,py,pz){const m=new THREE.Mesh(geo,mat);m.position.set(px,py,pz);m.castShadow=true;playerFoot.add(m);}
  pa(new THREE.SphereGeometry(0.22,10,8),ge,0,1.78,0);pa(new THREE.PlaneGeometry(0.32,0.13),vi,0,1.74,0.21);
  pa(new THREE.BoxGeometry(0.44,0.56,0.22),su,0,1.22,0);pa(new THREE.BoxGeometry(0.06,0.46,0.24),go,0,1.22,0);
  [-1,1].forEach(s=>{pa(new THREE.BoxGeometry(0.14,0.50,0.14),su,s*0.31,1.18,0);pa(new THREE.BoxGeometry(0.17,0.54,0.17),su,s*0.12,0.68,0);pa(new THREE.BoxGeometry(0.17,0.10,0.30),ge,s*0.12,0.05,0.05);});
  pa(new THREE.BoxGeometry(0.40,0.09,0.20),ge,0,0.93,0);
}

const enemies=[];
function buildEnemyCar(colorHex){
  const grp=new THREE.Group(),bodyGrp=new THREE.Group();grp.add(bodyGrp);
  const paint=new THREE.MeshPhongMaterial({color:colorHex,shininess:110});
  const dark=new THREE.MeshLambertMaterial({color:0x0e0e0e});
  const glass=new THREE.MeshPhongMaterial({color:0x1a3048,transparent:true,opacity:0.44});
  const wRub=new THREE.MeshPhongMaterial({color:0x080808,shininess:5}),wRim=new THREE.MeshPhongMaterial({color:0xbbbbbb,shininess:180});
  const hlMat=new THREE.MeshBasicMaterial({color:0xddeeff}),tlMat=new THREE.MeshBasicMaterial({color:0xff0d00});
  function b(w,h,d,mat,px,py,pz){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(px,py,pz);m.castShadow=true;bodyGrp.add(m);}
  b(1.72,0.43,3.85,paint,0,0.36,0);b(1.56,0.54,1.72,paint,0,0.86,0.1);
  b(0.06,0.19,3.65,dark,-0.90,0.26,0);b(0.06,0.19,3.65,dark,0.90,0.26,0);
  const wsF=new THREE.Mesh(new THREE.BoxGeometry(1.30,0.44,0.07),glass);wsF.position.set(0,0.88,0.90);wsF.rotation.x=0.25;bodyGrp.add(wsF);
  [-0.60,0.60].forEach(x=>{
    const hl=new THREE.Mesh(new THREE.BoxGeometry(0.32,0.09,0.06),hlMat);hl.position.set(x,0.55,1.93);bodyGrp.add(hl);
    const tl=new THREE.Mesh(new THREE.BoxGeometry(0.36,0.08,0.06),tlMat);tl.position.set(x,0.54,-1.93);bodyGrp.add(tl);
  });
  const tlBar=new THREE.Mesh(new THREE.BoxGeometry(1.52,0.04,0.06),tlMat);tlBar.position.set(0,0.59,-1.93);bodyGrp.add(tlBar);
  grp._wheels=[];
  [[-0.94,1.28],[0.94,1.28],[-0.94,-1.28],[0.94,-1.28]].forEach(([wx,wz])=>{
    const sp=new THREE.Group();sp.position.set(wx,0.28,wz);
    const tt=new THREE.Mesh(new THREE.CylinderGeometry(0.28,0.28,0.21,16),wRub);tt.rotation.z=Math.PI/2;sp.add(tt);
    const rr=new THREE.Mesh(new THREE.CylinderGeometry(0.19,0.19,0.22,8),wRim);rr.rotation.z=Math.PI/2;sp.add(rr);
    bodyGrp.add(sp);grp._wheels.push(sp);
  });
  return grp;
}
function spawnEnemy(){
  if(enemies.length>=GFX[gfxMode].maxEnemies)return;
  const spT=(phys.routeT+0.05+Math.random()*0.18)%1;
  const pt=routeSpline.getPointAt(spT),tan=routeSpline.getTangentAt(spT);
  const right=new THREE.Vector3(-tan.z,0,tan.x),lane=(Math.floor(Math.random()*3)-1)*(ROAD_W/3.5);
  const grp=buildEnemyCar(ENEMY_COLORS[Math.floor(Math.random()*ENEMY_COLORS.length)]);
  grp.position.copy(pt).addScaledVector(right,lane);
  grp._routeT=spT;grp._routeSpeed=(18+Math.random()*22)/ROUTE_LENGTH;
  grp._lane=lane;grp._laneT=Math.random()*100;grp._lastPos=grp.position.clone();
  scene.add(grp);enemies.push(grp);
}
function updateEnemies(dt){
  for(let i=enemies.length-1;i>=0;i--){
    const e=enemies[i];
    e._routeT=(e._routeT+e._routeSpeed*dt)%1;e._laneT+=dt;
    const pt=routeSpline.getPointAt(e._routeT),tan=routeSpline.getTangentAt(e._routeT);
    const right=new THREE.Vector3(-tan.z,0,tan.x),tLane=e._lane+Math.sin(e._laneT*0.35)*2.0;
    e.position.lerp(pt.clone().addScaledVector(right,tLane),0.10);
    const mov=new THREE.Vector3().subVectors(e.position,e._lastPos);
    if(mov.lengthSq()>0.0001)e.rotation.y=Math.atan2(mov.x,mov.z);
    e._lastPos.copy(e.position);
    if(e._wheels)e._wheels.forEach(w=>{w.rotation.x+=e._routeSpeed*ROUTE_LENGTH/0.28*dt;});
    const dT=((e._routeT-phys.routeT)+1)%1;
    if(dT<0.015||dT>0.88){scene.remove(e);enemies.splice(i,1);}
  }
  if(gameState.playing&&enemies.length<GFX[gfxMode].maxEnemies&&Math.random()<0.03)spawnEnemy();
}

const phys={position:new THREE.Vector3(),yaw:0,speed:0,steer:0,spinAngle:0,suspY:0,suspVY:0,routeT:0};
const GEAR_MAX_KMH=[0,68,118,175,238,285,320];
const GEAR_OPT_MIN=[0,0,38,88,140,188,238];
let transMode='AT';
const trans={gear:1,rpm:800,redlineRPM:8500,idleRPM:800};
const C={ACCEL:18,BRAKE:50,FRICTION:2.5,HANDBRAKE:62,MAX_FWD:88.89,MAX_REV:14,WHEELBASE:2.72,MAX_STEER:0.46,STEER_IN:2.6,STEER_OUT:4.0,SPEED_UNDER:0.024,WHEEL_R:0.30,SPRING:55,DAMP:9,CAM_LAG:5,CAM_DIST:9,CAM_H:4.0,WALK_SPEED:4,WALK_STEER:2.2};
function atTF(k){if(k<70)return 1.25;if(k<140)return 1.05;if(k<220)return 0.80;if(k<285)return 0.52;return 0.30;}
function mtTF(g,k){if(g<1||g>6)return 0.4;const mx=GEAR_MAX_KMH[g],mn=GEAR_OPT_MIN[g];if(k>=mx*1.01)return 0;if(k<mn)return 0.35+0.65*(k/Math.max(mn,1));return 1.15-0.25*(k-mn)/(mx-mn);}
function autoGear(k){for(let g=1;g<=6;g++){if(k<GEAR_MAX_KMH[g])return g;}return 6;}
function shiftUp(){if(trans.gear<6){trans.gear++;updateGearButtons();}}
function shiftDown(){if(trans.gear>1){trans.gear--;updateGearButtons();}}
function updateGearButtons(){document.querySelectorAll('.gb').forEach(b=>b.classList.toggle('active',parseInt(b.dataset.g)===trans.gear));}
const gameState={playing:false,inCar:true,score:0,health:100,elapsed:0};

const K={};
window.addEventListener('keydown',e=>{
  K[e.code]=true;
  if(gameState.playing&&transMode==='MT'){
    if(e.code==='KeyX')shiftUp();if(e.code==='KeyZ')shiftDown();
    const m=e.code.match(/^Digit([1-6])$/);if(m){trans.gear=parseInt(m[1]);updateGearButtons();}
  }
  e.preventDefault();
});
window.addEventListener('keyup',e=>{K[e.code]=false;});
document.querySelectorAll('.gb').forEach(b=>{
  b.style.pointerEvents='auto';
  b.addEventListener('click',()=>{if(gameState.playing&&transMode==='MT'){trans.gear=parseInt(b.dataset.g);updateGearButtons();}});
});
const touchData={fwd:false,rev:false,left:false,right:false,hb:false};
function buildTouchControls(){
  const ui=document.createElement('div');
  ui.style.cssText='position:fixed;bottom:0;left:0;right:0;height:200px;z-index:500;pointer-events:none;display:flex;justify-content:space-between;align-items:flex-end;padding:12px 16px;';
  const bs='background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.17);color:#fff;font-size:20px;border-radius:8px;touch-action:none;cursor:pointer;';
  ui.innerHTML='<div style="pointer-events:auto;display:grid;grid-template-columns:58px 58px 58px;grid-template-rows:58px 58px;gap:5px;"><div></div><button id="t-fwd" style="'+bs+'">▲</button><div></div><button id="t-left" style="'+bs+'">◄</button><button id="t-rev" style="'+bs+'">▼</button><button id="t-right" style="'+bs+'">►</button></div><button id="t-hb" style="pointer-events:auto;background:rgba(212,160,23,.2);border:1px solid rgba(212,160,23,.4);color:#d4a017;font-family:monospace;font-size:11px;padding:14px 22px;border-radius:8px;letter-spacing:2px;touch-action:none;">HB</button>';
  document.body.appendChild(ui);
  function bind(id,key){const el=document.getElementById(id);el.addEventListener('touchstart',e=>{touchData[key]=true;e.preventDefault();},{passive:false});el.addEventListener('touchend',e=>{touchData[key]=false;e.preventDefault();},{passive:false});}
  bind('t-fwd','fwd');bind('t-rev','rev');bind('t-left','left');bind('t-right','right');bind('t-hb','hb');
}
function getInput(){return{fwd:K.ArrowUp||K.KeyW||touchData.fwd,rev:K.ArrowDown||K.KeyS||touchData.rev,left:K.ArrowLeft||K.KeyA||touchData.left,right:K.ArrowRight||K.KeyD||touchData.right,hb:K.Space||touchData.hb,e:K.KeyE};}

function stepCarPhysics(dt,inp){
  const tS=inp.left?-C.MAX_STEER:inp.right?C.MAX_STEER:0;
  phys.steer+=(tS-phys.steer)*Math.min((inp.left||inp.right?C.STEER_IN:C.STEER_OUT)*dt,1);
  const kmh=Math.abs(phys.speed)*3.6,tf=transMode==='AT'?atTF(kmh):mtTF(trans.gear,kmh);
  let ac=0;
  if(inp.fwd)ac=phys.speed>=0?C.ACCEL*tf:C.BRAKE;else if(inp.rev)ac=phys.speed>0.5?-C.BRAKE:-C.ACCEL*0.50;
  if(inp.hb){const hb=C.HANDBRAKE*dt;phys.speed=phys.speed>0?Math.max(0,phys.speed-hb):Math.min(0,phys.speed+hb);}
  phys.speed+=ac*dt;
  if(!inp.fwd&&!inp.rev&&!inp.hb){const f=C.FRICTION*dt;phys.speed=Math.abs(phys.speed)<f?0:phys.speed-Math.sign(phys.speed)*f;}
  if(transMode==='MT'&&phys.speed>0){const mx=GEAR_MAX_KMH[trans.gear]/3.6;if(phys.speed>mx)phys.speed=mx;}
  phys.speed=THREE.MathUtils.clamp(phys.speed,-C.MAX_REV,C.MAX_FWD);
  if(transMode==='AT')trans.gear=autoGear(Math.abs(phys.speed)*3.6);
  const effS=phys.steer/(1+Math.abs(phys.speed)*C.SPEED_UNDER);
  phys.yaw+=(phys.speed/C.WHEELBASE)*Math.tan(effS)*dt;
  phys.position.x+=Math.sin(phys.yaw)*phys.speed*dt;phys.position.z+=Math.cos(phys.yaw)*phys.speed*dt;
  const cp=routeSpline.getPointAt(phys.routeT),tan=routeSpline.getTangentAt(phys.routeT);
  const right=new THREE.Vector3(-tan.z,0,tan.x),lat=new THREE.Vector3(phys.position.x-cp.x,0,phys.position.z-cp.z);
  const latD=lat.dot(right);
  if(Math.abs(latD)>ROAD_W/2-1.2){const ex=latD-Math.sign(latD)*(ROAD_W/2-1.2);phys.position.x-=right.x*ex;phys.position.z-=right.z*ex;phys.speed*=0.5;}
  phys.routeT=(phys.routeT+phys.speed/ROUTE_LENGTH*dt+1)%1;
  const sf=(0-phys.suspY)*C.SPRING,df=phys.suspVY*C.DAMP;phys.suspVY+=(sf-df)*dt;phys.suspY+=phys.suspVY*dt;
  phys.spinAngle+=phys.speed/C.WHEEL_R*dt;
  trans.rpm=Math.max(trans.idleRPM,Math.min(trans.redlineRPM,(Math.abs(phys.speed)*3.6/GEAR_MAX_KMH[trans.gear])*trans.redlineRPM));
}
const walkState={x:0,z:0,yaw:0};
function stepWalkPhysics(dt,inp){
  if(inp.left)walkState.yaw+=C.WALK_STEER*dt;if(inp.right)walkState.yaw-=C.WALK_STEER*dt;
  if(inp.fwd){walkState.x+=Math.sin(walkState.yaw)*C.WALK_SPEED*dt;walkState.z+=Math.cos(walkState.yaw)*C.WALK_SPEED*dt;}
  if(inp.rev){walkState.x-=Math.sin(walkState.yaw)*C.WALK_SPEED*0.6*dt;walkState.z-=Math.cos(walkState.yaw)*C.WALK_SPEED*0.6*dt;}
}

const _b1=new THREE.Box3(),_b2=new THREE.Box3(),pBS=new THREE.Vector3(CAR_W,CAR_H,CAR_L);
function checkCollisions(){
  _b1.setFromCenterAndSize(new THREE.Vector3(phys.position.x,phys.suspY+CAR_H/2,phys.position.z),pBS);
  for(let i=enemies.length-1;i>=0;i--){
    const e=enemies[i];
    _b2.setFromCenterAndSize(new THREE.Vector3(e.position.x,CAR_H/2,e.position.z),new THREE.Vector3(1.85,0.92,4.0));
    if(_b1.intersectsBox(_b2)){
      applyDamage(Math.abs(phys.speed-e._routeSpeed*ROUTE_LENGTH)*1.5);phys.speed*=-0.25;
      const df=document.getElementById('damage-flash');df.style.opacity='1';setTimeout(()=>{df.style.opacity='0';},120);
      e._routeT=(e._routeT-0.005+1)%1;
    }
  }
}
function applyDamage(dmg){
  gameState.health=Math.max(0,gameState.health-dmg);
  const fill=document.getElementById('hud-dmg-fill');
  fill.style.width=gameState.health+'%';fill.style.background=gameState.health>60?'#2ecc71':gameState.health>30?'#f39c12':'#e74c3c';
  if(gameState.health<=0)triggerGameOver();
}
function syncCarMesh(){
  playerCar.position.set(phys.position.x,phys.suspY,phys.position.z);playerCar.rotation.y=phys.yaw;
  const pitch=THREE.MathUtils.clamp(phys.suspVY*0.02,-0.07,0.07);
  playerCarBody.rotation.x=THREE.MathUtils.lerp(playerCarBody.rotation.x,pitch,0.1);
  wheelNodes.forEach(w=>{if(w.front)w.pivot.rotation.y=phys.steer;w.spin.rotation.x=phys.spinAngle;});
}

const camPos=new THREE.Vector3(0,6,12),camLook=new THREE.Vector3(),camWalk=new THREE.Vector3();
function stepCamera(dt){
  const lag=Math.min(C.CAM_LAG*dt,1);
  if(gameState.inCar){
    const spd=Math.abs(phys.speed),dist=C.CAM_DIST+spd*0.12,hgt=C.CAM_H+spd*0.04;
    camPos.lerp(new THREE.Vector3(phys.position.x-Math.sin(phys.yaw)*dist,phys.suspY+hgt,phys.position.z-Math.cos(phys.yaw)*dist),lag);
    camLook.lerp(new THREE.Vector3(phys.position.x+Math.sin(phys.yaw)*(3+spd*0.08),phys.suspY+1.0,phys.position.z+Math.cos(phys.yaw)*(3+spd*0.08)),lag*1.5);
  } else {
    camWalk.lerp(new THREE.Vector3(walkState.x-Math.sin(walkState.yaw)*4,3.5,walkState.z-Math.cos(walkState.yaw)*4),lag);
    camPos.copy(camWalk);camLook.set(walkState.x,1.5,walkState.z);
  }
  camera.position.copy(camPos);camera.lookAt(camLook);
}

let _lastScoreTick=0,_shiftTimer=0;
const speedoCtx=document.getElementById('speedo-canvas').getContext('2d');
const minimapCtx=document.getElementById('minimap-canvas').getContext('2d');

const routeNameEl=document.createElement('div');
routeNameEl.style.cssText='position:fixed;top:54px;left:50%;transform:translateX(-50%);font-family:"Orbitron",monospace;font-size:10px;letter-spacing:5px;color:#d4a017;background:rgba(0,2,10,.85);border:1px solid rgba(212,160,23,.3);padding:4px 16px;pointer-events:none;opacity:0;transition:opacity .5s;z-index:150;';
document.getElementById('hud').appendChild(routeNameEl);

const autoBarOuter=document.createElement('div');
autoBarOuter.style.cssText='position:fixed;top:0;left:0;right:0;height:3px;background:rgba(255,255,255,.05);z-index:300;pointer-events:none;';
const autoBarFill=document.createElement('div');
autoBarFill.style.cssText='height:100%;width:100%;background:#d4a017;transition:background .3s;';
autoBarOuter.appendChild(autoBarFill);
document.getElementById('hud').appendChild(autoBarOuter);

const routeInfoPanel=document.createElement('div');
routeInfoPanel.style.cssText='position:fixed;top:8px;right:8px;font-family:"Orbitron",monospace;font-size:8px;letter-spacing:3px;color:rgba(212,160,23,.8);background:rgba(0,2,10,.75);border:1px solid rgba(212,160,23,.2);padding:5px 10px;pointer-events:none;z-index:150;text-align:right;line-height:1.6;';
document.getElementById('hud').appendChild(routeInfoPanel);

const routeChangeOverlay=document.createElement('div');
routeChangeOverlay.id='route-change-overlay';
routeChangeOverlay.style.cssText='position:fixed;inset:0;z-index:8000;pointer-events:none;display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:0;transition:opacity .25s;background:rgba(0,0,0,0);';
routeChangeOverlay.innerHTML='<div id="rco-scanline" style="position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(0,0,0,.15) 0px,rgba(0,0,0,.15) 1px,transparent 1px,transparent 3px);pointer-events:none;"></div><div id="rco-num" style="font-family:\'Bebas Neue\',cursive;font-size:18vw;color:rgba(212,160,23,.08);line-height:1;position:absolute;letter-spacing:-4px;"></div><div id="rco-en" style="font-family:\'Bebas Neue\',cursive;font-size:9vw;color:#d4a017;letter-spacing:10px;position:relative;text-shadow:0 0 40px rgba(212,160,23,.4);"></div><div id="rco-jp" style="font-family:\'Orbitron\',monospace;font-size:11px;letter-spacing:6px;color:#00c4ff;margin-top:10px;position:relative;"></div><div id="rco-desc" style="font-family:\'Orbitron\',monospace;font-size:9px;letter-spacing:4px;color:rgba(255,255,255,.4);margin-top:6px;position:relative;"></div><div style="position:absolute;bottom:32px;left:50%;transform:translateX(-50%);display:flex;gap:5px;flex-wrap:wrap;justify-content:center;max-width:400px;" id="rco-dots"></div>';
document.body.appendChild(routeChangeOverlay);

function buildDots(current){
  const container=document.getElementById('rco-dots');container.innerHTML='';
  for(let i=0;i<16;i++){
    const d=document.createElement('div');
    d.style.cssText='width:'+(i===current?14:4)+'px;height:4px;border-radius:2px;background:'+(i===current?'#d4a017':'rgba(255,255,255,.18)')+';transition:all .3s;';
    container.appendChild(d);
  }
}

const warnBanner=document.createElement('div');
warnBanner.style.cssText='position:fixed;bottom:220px;left:50%;transform:translateX(-50%);font-family:"Orbitron",monospace;font-size:9px;letter-spacing:5px;color:#ff4422;background:rgba(0,0,0,.88);border:1px solid rgba(255,68,34,.45);padding:5px 18px;pointer-events:none;opacity:0;transition:opacity .3s;z-index:200;white-space:nowrap;';
document.getElementById('hud').appendChild(warnBanner);

function triggerRouteSwitch(){
  if(_isSwitching)return;_isSwitching=true;
  const nextIdx=(currentRouteIdx+1)%ROUTES.length;
  const route=ROUTES[nextIdx],accent=route.accentColor||'#d4a017';
  const ov=routeChangeOverlay;
  ov.style.background='rgba(0,2,8,.92)';
  document.getElementById('rco-num').textContent=String(nextIdx+1).padStart(2,'0');
  document.getElementById('rco-en').textContent=route.nameEn;
  document.getElementById('rco-en').style.color=accent;
  document.getElementById('rco-en').style.textShadow='0 0 40px '+accent+'66';
  document.getElementById('rco-jp').textContent=route.name;
  document.getElementById('rco-desc').textContent=route.desc;
  buildDots(nextIdx);ov.style.opacity='1';
  const bar=document.createElement('div');
  bar.style.cssText='position:absolute;bottom:0;left:0;height:2px;width:0%;background:'+accent+';transition:width 1.1s linear;';
  ov.appendChild(bar);requestAnimationFrame(()=>{bar.style.width='100%';});
  setTimeout(()=>{
    currentRouteIdx=nextIdx;clearRoad();buildSplineForRoute(currentRouteIdx);buildRoad();
    scene.fog.density=GFX[gfxMode].fog;
    const sp=routeSpline.getPointAt(0),tan=routeSpline.getTangentAt(0);
    phys.position.set(sp.x,0,sp.z);phys.yaw=Math.atan2(tan.x,tan.z);phys.routeT=0;
    walkState.x=sp.x;walkState.z=sp.z;walkState.yaw=phys.yaw;
    enemies.forEach(e=>scene.remove(e));enemies.length=0;for(let i=0;i<6;i++)spawnEnemy();
    autoRouteRemain=ROUTE_DURATION;_routeSwitchWarned=false;
    setTimeout(()=>{ov.style.opacity='0';ov.style.background='rgba(0,0,0,0)';setTimeout(()=>{bar.remove();_isSwitching=false;},300);},480);
  },1100);
}

function updateAutoRouteTimer(dt){
  if(!gameState.playing||_isSwitching)return;
  autoRouteRemain-=dt;
  const pct=Math.max(0,autoRouteRemain/ROUTE_DURATION);
  autoBarFill.style.width=(pct*100)+'%';
  if(pct<0.2)autoBarFill.style.background='#ff2200';else if(pct<0.5)autoBarFill.style.background='#ff8800';else autoBarFill.style.background='#d4a017';
  const sec=Math.max(0,Math.ceil(autoRouteRemain)),nextIdx=(currentRouteIdx+1)%ROUTES.length,nextRoute=ROUTES[nextIdx];
  const accent=ROUTES[currentRouteIdx].accentColor||'#d4a017';
  routeInfoPanel.innerHTML='ROUTE <span style="color:'+accent+'">'+String(currentRouteIdx+1).padStart(2,'0')+'</span><span style="color:rgba(255,255,255,.3)">/16</span><br><span style="color:rgba(255,255,255,.4);font-size:7px;">'+ROUTES[currentRouteIdx].nameEn+'</span><br><span style="color:'+(sec<=5?'#ff2200':sec<=10?'#ff8800':'rgba(0,196,255,.7)')+'">NEXT '+sec+'s</span>';
  if(autoRouteRemain<=5&&!_routeSwitchWarned){
    _routeSwitchWarned=true;
    warnBanner.textContent='ROUTE CHANGE  '+nextRoute.nameEn;
    warnBanner.style.opacity='1';setTimeout(()=>{warnBanner.style.opacity='0';},4000);
  }
  if(autoRouteRemain<=0)triggerRouteSwitch();
}

function showRouteFlash(route){
  routeNameEl.textContent=route.name+'  ·  '+route.nameEn;
  routeNameEl.style.opacity='1';setTimeout(()=>{routeNameEl.style.opacity='0';},3500);
}

function updateHUD(dt){
  if(!gameState.playing)return;
  const kmh=Math.abs(phys.speed)*3.6;
  if(gameState.inCar){gameState.elapsed+=dt;_lastScoreTick+=dt;if(_lastScoreTick>0.1){gameState.score+=Math.floor(kmh*0.04+0.5);_lastScoreTick=0;}}
  document.getElementById('hud-score').textContent=gameState.score;
  const min=Math.floor(gameState.elapsed/60),sec=Math.floor(gameState.elapsed%60).toString().padStart(2,'0');
  document.getElementById('hud-time').textContent=min+':'+sec;
  drawSpeedo(kmh);
  const ge=document.getElementById('speedo-gear'),dg=transMode==='AT'?autoGear(kmh):trans.gear;
  if(phys.speed<-0.5){ge.textContent='R';ge.style.color='#ff7700';}else if(kmh<1){ge.textContent='N';ge.style.color='#cccc00';}else{ge.textContent=dg;ge.style.color='#d4a017';}
  if(transMode==='MT'&&trans.gear<6){
    const sh=document.getElementById('shift-hint');
    if(phys.speed>GEAR_MAX_KMH[trans.gear]/3.6*0.94){sh.classList.remove('hidden');_shiftTimer=0.5;}
    else{_shiftTimer-=dt;if(_shiftTimer<=0)sh.classList.add('hidden');}
  }
  const st=document.getElementById('hud-status'),inp=getInput();
  if(inp.hb&&Math.abs(phys.speed)>1)st.textContent='HANDBRAKE';else if(phys.speed<-0.5)st.textContent='REVERSE';else if(Math.abs(phys.speed)<0.5)st.textContent='STOPPED';else if(kmh>250)st.textContent='★ SONIC ★';else if(kmh>180)st.textContent='>>> ZONE';else st.textContent='DRIVE';
  if(!gameState.inCar){const d=Math.hypot(walkState.x-phys.position.x,walkState.z-phys.position.z);document.getElementById('enter-hint').classList.toggle('hidden',d>6);document.getElementById('exit-hint').classList.add('hidden');}
  else{document.getElementById('exit-hint').classList.remove('hidden');document.getElementById('enter-hint').classList.add('hidden');}
  updateAutoRouteTimer(dt);drawMinimap();
}

function drawSpeedo(kmh){
  const w=160,h=160,cx=80,cy=80,r=66;speedoCtx.clearRect(0,0,w,h);
  const rA=Math.PI*0.75,rpmR=(trans.rpm-trans.idleRPM)/(trans.redlineRPM-trans.idleRPM);
  speedoCtx.beginPath();speedoCtx.arc(cx,cy,r-15,rA,rA+Math.PI*1.5);speedoCtx.strokeStyle='rgba(255,255,255,.04)';speedoCtx.lineWidth=5;speedoCtx.stroke();
  if(rpmR>0){speedoCtx.beginPath();speedoCtx.arc(cx,cy,r-15,rA,rA+Math.PI*1.5*rpmR);speedoCtx.strokeStyle=trans.rpm>7500?'#ff3322':trans.rpm>6000?'#ff9922':'#555';speedoCtx.lineWidth=5;speedoCtx.lineCap='round';speedoCtx.stroke();}
  speedoCtx.beginPath();speedoCtx.arc(cx,cy,r,0,Math.PI*2);speedoCtx.strokeStyle='rgba(255,255,255,.05)';speedoCtx.lineWidth=8;speedoCtx.stroke();
  if(kmh>0.5){speedoCtx.beginPath();speedoCtx.arc(cx,cy,r,rA,rA+Math.PI*1.5*Math.min(kmh/320,1));speedoCtx.strokeStyle=kmh>240?'#e74c3c':kmh>160?'#f39c12':'#00c4ff';speedoCtx.lineWidth=7;speedoCtx.lineCap='round';speedoCtx.stroke();}
  for(let v=0;v<=320;v+=40){const a=rA+Math.PI*1.5*(v/320),big=v%80===0;speedoCtx.beginPath();speedoCtx.moveTo(cx+(r-(big?16:11))*Math.cos(a),cy+(r-(big?16:11))*Math.sin(a));speedoCtx.lineTo(cx+r*Math.cos(a),cy+r*Math.sin(a));speedoCtx.strokeStyle=big?'rgba(255,255,255,.35)':'rgba(255,255,255,.15)';speedoCtx.lineWidth=big?1.8:1.2;speedoCtx.stroke();}
  const na=rA+Math.PI*1.5*Math.min(kmh/320,1);speedoCtx.beginPath();speedoCtx.moveTo(cx,cy);speedoCtx.lineTo(cx+(r-18)*Math.cos(na),cy+(r-18)*Math.sin(na));speedoCtx.strokeStyle='#fff';speedoCtx.lineWidth=1.6;speedoCtx.stroke();
  document.getElementById('speedo-num').textContent=Math.round(kmh);
}

function drawMinimap(){
  const W=130,H=130;minimapCtx.clearRect(0,0,W,H);minimapCtx.fillStyle='rgba(2,5,16,.95)';minimapCtx.fillRect(0,0,W,H);
  const margin=10,rangeX=mmMaxX-mmMinX,rangeZ=mmMaxZ-mmMinZ;
  const scale=Math.min((W-margin*2)/Math.max(rangeX,1),(H-margin*2)/Math.max(rangeZ,1));
  const offX=margin+(W-margin*2-rangeX*scale)/2-mmMinX*scale,offZ=margin+(H-margin*2-rangeZ*scale)/2-mmMinZ*scale;
  function tm(x,z){return[x*scale+offX,z*scale+offZ];}
  const accent=ROUTES[currentRouteIdx].accentColor||'#d4a017';
  minimapCtx.fillStyle=accent;minimapCtx.font='bold 8px monospace';minimapCtx.textAlign='left';minimapCtx.fillText('R'+String(currentRouteIdx+1).padStart(2,'0')+'/16',3,11);
  minimapCtx.beginPath();MINIMAP_PTS.forEach((p,i)=>{const[mx,mz]=tm(p.x,p.z);i===0?minimapCtx.moveTo(mx,mz):minimapCtx.lineTo(mx,mz);});minimapCtx.closePath();minimapCtx.strokeStyle='rgba(30,50,90,1)';minimapCtx.lineWidth=5;minimapCtx.stroke();
  minimapCtx.beginPath();MINIMAP_PTS.forEach((p,i)=>{const[mx,mz]=tm(p.x,p.z);i===0?minimapCtx.moveTo(mx,mz):minimapCtx.lineTo(mx,mz);});minimapCtx.closePath();minimapCtx.strokeStyle=accent;minimapCtx.globalAlpha=0.55;minimapCtx.lineWidth=1.5;minimapCtx.stroke();minimapCtx.globalAlpha=1;
  enemies.forEach(e=>{const[ex,ez]=tm(e.position.x,e.position.z);minimapCtx.fillStyle='#e74c3c';minimapCtx.fillRect(ex-2,ez-2,4,4);});
  const[px,pz]=tm(phys.position.x,phys.position.z);minimapCtx.fillStyle='#d4a017';minimapCtx.beginPath();minimapCtx.arc(px,pz,5,0,Math.PI*2);minimapCtx.fill();
  minimapCtx.save();minimapCtx.translate(px,pz);minimapCtx.rotate(-phys.yaw);minimapCtx.fillStyle='#00c4ff';minimapCtx.beginPath();minimapCtx.moveTo(0,-8);minimapCtx.lineTo(-3,3);minimapCtx.lineTo(3,3);minimapCtx.closePath();minimapCtx.fill();minimapCtx.restore();
  const tr=Math.max(0,autoRouteRemain/ROUTE_DURATION);
  minimapCtx.beginPath();minimapCtx.arc(W-11,11,8,0,Math.PI*2);minimapCtx.strokeStyle='rgba(255,255,255,.08)';minimapCtx.lineWidth=2;minimapCtx.stroke();
  minimapCtx.beginPath();minimapCtx.arc(W-11,11,8,-Math.PI/2,-Math.PI/2+Math.PI*2*(1-tr));minimapCtx.strokeStyle=tr<0.2?'#ff2200':tr<0.5?'#ff8800':accent;minimapCtx.lineWidth=2.5;minimapCtx.lineCap='round';minimapCtx.stroke();
}

window.selectMode=function(mode){transMode=mode;document.getElementById('btn-mode-at').classList.toggle('active',mode==='AT');document.getElementById('btn-mode-mt').classList.toggle('active',mode==='MT');};
window.selectGfx=function(mode){
  gfxMode=mode;['flat','normal','high'].forEach(m=>{document.getElementById('btn-gfx-'+m).classList.toggle('active',m===mode);});
  scene.fog.density=GFX[mode].fog;renderer.setPixelRatio(GFX[mode].pixelRatio);
  const warn=document.getElementById('gfx-warn');warn.textContent=mode==='high'?'※ 高グラフィックはラグが発生する場合があります':mode==='flat'?'※ フラットモード：低スペック端末向け':'';
};
window.openSettings=function(){document.getElementById('settings-screen').classList.remove('hidden');};
window.closeSettings=function(){document.getElementById('settings-screen').classList.add('hidden');};

function enterCar(){gameState.inCar=true;playerCar.visible=true;playerFoot.visible=false;phys.position.x=walkState.x;phys.position.z=walkState.z;}
function exitCar(){gameState.inCar=false;phys.speed=0;walkState.x=phys.position.x-Math.sin(phys.yaw)*2.5;walkState.z=phys.position.z-Math.cos(phys.yaw)*2.5;walkState.yaw=phys.yaw;playerFoot.visible=true;playerCar.visible=true;}

function startGame(){
  currentRouteIdx=Math.floor(Math.random()*ROUTES.length);
  autoRouteRemain=ROUTE_DURATION;_routeSwitchWarned=false;_isSwitching=false;
  const loadEl=document.createElement('div');
  loadEl.style.cssText='position:fixed;inset:0;background:#000;z-index:9000;display:flex;flex-direction:column;align-items:center;justify-content:center;';
  const route=ROUTES[currentRouteIdx],accent=route.accentColor||'#d4a017';
  buildDots(currentRouteIdx);
  loadEl.innerHTML='<div style="font-family:\'Bebas Neue\',cursive;font-size:10px;letter-spacing:12px;color:rgba(255,255,255,.25);margin-bottom:8px;">16 ROUTES  ·  30 SEC AUTO CHANGE</div><div style="font-family:\'Bebas Neue\',cursive;font-size:72px;letter-spacing:12px;color:'+accent+';line-height:1;text-shadow:0 0 60px '+accent+'55;">'+route.nameEn+'</div><div style="font-family:\'Orbitron\',monospace;font-size:11px;letter-spacing:6px;color:rgba(255,255,255,.3);margin-top:6px;">'+route.name+' · '+route.desc+'</div><div style="width:240px;height:2px;background:rgba(255,255,255,.07);margin:28px auto 8px;overflow:hidden;"><div id="rl-bar" style="height:100%;width:0%;background:linear-gradient(90deg,'+accent+',#00c4ff);transition:width .2s;"></div></div><div id="rl-pct" style="font-family:\'Orbitron\',monospace;font-size:10px;color:rgba(255,255,255,.3);letter-spacing:2px;">0%</div>';
  document.body.appendChild(loadEl);
  const rlBar=loadEl.querySelector('#rl-bar'),rlPct=loadEl.querySelector('#rl-pct');
  function setProgress(p){rlBar.style.width=p+'%';rlPct.textContent=p+'%';}
  setTimeout(()=>{setProgress(10);setTimeout(()=>{clearRoad();buildSplineForRoute(currentRouteIdx);setProgress(40);setTimeout(()=>{buildRoad();setProgress(80);setTimeout(()=>{
    setProgress(100);scene.fog.density=GFX[gfxMode].fog;
    gameState.playing=true;gameState.inCar=true;gameState.score=0;gameState.health=100;gameState.elapsed=0;
    const sp=routeSpline.getPointAt(0),tan=routeSpline.getTangentAt(0);
    phys.position.set(sp.x,0,sp.z);phys.yaw=Math.atan2(tan.x,tan.z);
    phys.speed=0;phys.steer=0;phys.routeT=0;phys.suspY=0;phys.suspVY=0;
    walkState.x=sp.x;walkState.z=sp.z;walkState.yaw=phys.yaw;
    trans.gear=1;trans.rpm=trans.idleRPM;if(transMode==='MT')updateGearButtons();
    document.getElementById('hud-dmg-fill').style.width='100%';document.getElementById('hud-dmg-fill').style.background='#2ecc71';
    playerCar.visible=true;playerFoot.visible=false;
    const gp=document.getElementById('gear-panel'),cm=document.getElementById('ctrl-mt-rows');
    if(transMode==='MT'){gp.classList.remove('hidden');cm.classList.remove('hidden');updateGearButtons();}else{gp.classList.add('hidden');cm.classList.add('hidden');}
    document.getElementById('mode-badge').textContent=transMode;
    enemies.forEach(e=>scene.remove(e));enemies.length=0;for(let i=0;i<6;i++)spawnEnemy();
    document.getElementById('hud').classList.remove('hidden');document.getElementById('title-screen').classList.add('hidden');document.getElementById('gameover-screen').classList.add('hidden');document.getElementById('settings-screen').classList.add('hidden');
    setTimeout(()=>{loadEl.style.transition='opacity .5s';loadEl.style.opacity='0';setTimeout(()=>{loadEl.remove();showRouteFlash(route);},520);},150);
  },120);},200);},80);},50);
}

function triggerGameOver(){
  gameState.playing=false;
  if(gameState.score>bestScore){bestScore=gameState.score;localStorage.setItem('nero_best',bestScore);}
  document.getElementById('go-score').textContent=gameState.score;document.getElementById('go-best').textContent=bestScore;document.getElementById('hud-best').textContent=bestScore;
  document.getElementById('gameover-screen').classList.remove('hidden');document.getElementById('hud').classList.add('hidden');
}

let lastT=0,prevE=false;
function loop(ts){
  requestAnimationFrame(loop);const dt=Math.min((ts-lastT)/1000,0.05);lastT=ts;if(dt<=0)return;
  if(gameState.playing){
    const inp=getInput(),eN=inp.e;
    if(eN&&!prevE){if(gameState.inCar)exitCar();else{const d=Math.hypot(walkState.x-phys.position.x,walkState.z-phys.position.z);if(d<6)enterCar();}}
    prevE=eN;
    if(gameState.inCar){stepCarPhysics(dt,inp);syncCarMesh();checkCollisions();}
    else{stepWalkPhysics(dt,inp);playerFoot.position.set(walkState.x,0,walkState.z);playerFoot.rotation.y=walkState.yaw;}
    updateEnemies(dt);
    sodiumGroup.position.set(phys.position.x,0,phys.position.z);
    cityGlowL.position.set(phys.position.x-(ROAD_W+18),12,phys.position.z);cityGlowR.position.set(phys.position.x+(ROAD_W+18),12,phys.position.z);
    updateHUD(dt);stepCamera(dt);
  }
  renderer.render(scene,camera);
}

function init(){
  const bar=document.getElementById('loading-bar'),pct=document.getElementById('loading-pct');
  const steps=[['16ルート建設中…',buildRoad],['ランボルギーニ構築中…',buildLamborghini],['ドライバー配置中…',buildPlayer],['交通配置中…',()=>{for(let i=0;i<6;i++)spawnEnemy();}],['コントロール構築中…',buildTouchControls]];
  currentRouteIdx=Math.floor(Math.random()*ROUTES.length);buildSplineForRoute(currentRouteIdx);
  let i=0;
  function doStep(){
    if(i>=steps.length){bar.style.width='100%';pct.textContent='100%';setTimeout(()=>{const ls=document.getElementById('loading-screen');ls.style.opacity='0';setTimeout(()=>{ls.remove();document.getElementById('title-screen').classList.remove('hidden');},600);},200);return;}
    bar.style.width=Math.round((i/steps.length)*100)+'%';pct.textContent=Math.round((i/steps.length)*100)+'%';
    steps[i][1]();i++;setTimeout(doStep,100);
  }
  doStep();
  camPos.set(0,C.CAM_H+3,C.CAM_DIST+3);camera.position.copy(camPos);camera.lookAt(0,0,0);
  document.getElementById('btn-start').addEventListener('click',startGame);
  document.getElementById('btn-retry').addEventListener('click',startGame);
  requestAnimationFrame(ts=>{lastT=ts;loop(ts);});
}
init();
