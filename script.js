Shibuya scramble intersection simulator - complete 2000+ line script.js
渋谷スクランブル交差点シミュレーター - 2000行以上の完全なスクリプト.js
javascript  ジャバスクリプト

/* ═══════════════════════════════════════════════════════════════════
   渋谷スクランブル交差点 — SHIBUYA SCRAMBLE SIMULATOR
   HYPER DETAILED EDITION · script.js
   ─────────────────────────────────────────────────────────────────
   ・リアルタイム信号機サイクル (NS → EW → スクランブル)
   ・自動車 AI (停止線・先行車追従)
   ・歩行者群衆 (スクランブル時に一斉横断)
   ・プレイヤー歩行制御
   ・細密な交差点ジオメトリ / 建物 / 街路家具
   ═══════════════════════════════════════════════════════════════════ */
'use strict';

// ─────────────────────────────────────────────────────────────────
//  §1  世界定数 — WORLD CONSTANTS
// ─────────────────────────────────────────────────────────────────

// 道路 (メートル単位)
const ROAD_HALF     = 13.5;   // 全道路幅の半分 (両方向合計)
const LANE_W        = 3.25;   // 1車線幅
const SIDEWALK_W    = 6.8;    // 歩道幅
const SIDEWALK_H    = 0.18;   // 縁石高さ
const ROAD_LEN      = 75.0;   // 交差点中心からの道路延長
const CURB_W        = 0.18;   // 縁石幅

// 横断歩道
const CW_STRIPE_W   = 0.48;   // シマシマ幅
const CW_STRIPE_GAP = 0.38;   // シマシマ間隔
const CW_DEPTH      = 5.0;    // 横断歩道の奥行き

// 建物オフセット (交差点縁からの距離)
const BLDG_OFFSET   = ROAD_HALF + SIDEWALK_W + 0.8;

// 車両物理
const VEH_STOP_LINE = ROAD_HALF + 2.8;   // 停止線位置
const VEH_SPEED     = 9.2;               // 通常速度 m/s (~33 km/h)
const VEH_ACCEL     = 3.8;
const VEH_DECEL     = 9.5;
const MAX_VEHICLES  = 28;

// 歩行者
const PED_WALK_SPEED = 1.35;   // m/s
const PED_MAX        = 140;
const PED_RUSH_SPEED = 2.20;   // スクランブル時の急ぎ速度

// 信号フェーズ
const PH = {
  NS_GREEN:  0,   // 南北通行
  NS_YELLOW: 1,
  EW_GREEN:  2,   // 東西通行
  EW_YELLOW: 3,
  ALL_RED:   4,   // 全赤 (スクランブル前後)
  SCRAMBLE:  5,   // スクランブル
};
const PH_DURATION = {
  [PH.NS_GREEN]:  32,
  [PH.NS_YELLOW]:  3,
  [PH.EW_GREEN]:  32,
  [PH.EW_YELLOW]:  3,
  [PH.ALL_RED]:    2,
  [PH.SCRAMBLE]:  18,
};
const PH_SEQUENCE = [
  PH.NS_GREEN, PH.NS_YELLOW,
  PH.EW_GREEN, PH.EW_YELLOW,
  PH.ALL_RED,  PH.SCRAMBLE,
  PH.ALL_RED
];

// カラーパレット
const COL = {
  asphalt:      0x181c1f,
  asphaltWorn:  0x1f2325,
  sidewalk:     0xb4aca0,
  sidewalkDk:   0x9e9488,
  curb:         0x8a8880,
  curbWhite:    0xe0ddd8,
  lineWhite:    0xeae8e4,
  lineYellow:   0xf2c018,
  crosswalk:    0xd8d2c4,
  sky:          0x050810,
};

// ─────────────────────────────────────────────────────────────────
//  §2  DOM セットアップ — 全HTMLをJS側で生成
// ─────────────────────────────────────────────────────────────────

// Googleフォント注入
(function injectFonts() {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Bebas+Neue&display=swap';
  document.head.appendChild(link);
})();

// グローバルスタイル
const _style = document.createElement('style');
_style.textContent = `
  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
  html, body { width:100%; height:100%; background:#050810; overflow:hidden; }
  canvas { display:block; }
  body { font-family:'Orbitron', monospace; }

  #hud {
    position:fixed; top:0; left:0; right:0; bottom:0;
    pointer-events:none; z-index:100;
  }

  /* フェーズ表示 */
  #phase-bar {
    position:fixed; top:0; left:0; right:0; height:3px;
    background:rgba(255,255,255,.06); z-index:300;
  }
  #phase-bar-fill {
    height:100%; width:100%; background:#00ee44;
    transition:background .4s;
  }

  #phase-display {
    position:fixed; top:12px; left:50%; transform:translateX(-50%);
    background:rgba(0,2,10,.88); border:1px solid rgba(255,255,255,.12);
    padding:7px 28px 8px; pointer-events:none; text-align:center;
    min-width:220px; white-space:nowrap;
  }
  #phase-label {
    font-size:7px; letter-spacing:5px; color:rgba(255,255,255,.3); margin-bottom:3px;
  }
  #phase-name {
    font-family:'Bebas Neue',cursive; font-size:22px; letter-spacing:8px; color:#00ee44;
  }
  #phase-timer {
    font-size:10px; letter-spacing:3px; color:rgba(255,255,255,.4); margin-top:2px;
  }

  /* 歩行者信号パネル */
  #ped-panel {
    position:fixed; bottom:28px; right:22px;
    background:rgba(0,2,10,.92); border:1px solid rgba(255,255,255,.10);
    padding:14px 20px 12px; text-align:center; min-width:108px;
  }
  #ped-icon {
    font-size:38px; line-height:1; display:block; margin-bottom:4px;
  }
  #ped-count {
    font-family:'Bebas Neue',cursive; font-size:28px; color:#fff; line-height:1;
  }
  #ped-label {
    font-size:7px; letter-spacing:4px; color:rgba(255,255,255,.3);
    margin-top:4px; display:block;
  }

  /* 情報パネル */
  #info-panel {
    position:fixed; top:12px; left:16px;
    background:rgba(0,2,10,.88); border:1px solid rgba(255,255,255,.08);
    padding:10px 16px; line-height:1.9;
  }
  .il { font-size:6px; letter-spacing:4px; color:rgba(255,255,255,.28); }
  .iv { font-size:10px; letter-spacing:2px; color:#d4a017; }

  /* スクランブル演出 */
  #scramble-overlay {
    position:fixed; inset:0; pointer-events:none;
    border:0px solid #00c4ff; opacity:0;
    transition:opacity .4s ease; box-shadow:inset 0 0 60px rgba(0,196,255,0);
  }
  #scramble-overlay.active {
    opacity:1;
    border-width:6px;
    box-shadow:inset 0 0 80px rgba(0,196,255,.25);
  }
  #scramble-text {
    position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
    font-family:'Bebas Neue',cursive; font-size:15vw; letter-spacing:12px;
    color:rgba(0,196,255,.12); pointer-events:none;
    opacity:0; transition:opacity .5s;
  }
  #scramble-text.active { opacity:1; }

  /* カメラ切替ボタン */
  #cam-btn {
    position:fixed; top:12px; right:16px;
    background:rgba(0,2,10,.85); border:1px solid rgba(212,160,23,.35);
    color:#d4a017; font-family:'Orbitron',monospace; font-size:7px;
    letter-spacing:3px; padding:7px 14px; cursor:pointer;
    pointer-events:auto; z-index:200;
    transition:background .2s;
  }
  #cam-btn:hover { background:rgba(212,160,23,.12); }

  /* 操作ヒント */
  #hint {
    position:fixed; bottom:28px; left:22px;
    font-size:7px; letter-spacing:3px;
    color:rgba(255,255,255,.20); line-height:2.2; pointer-events:none;
  }

  /* ダメージフラッシュ(車接触) */
  #dmg-flash {
    position:fixed; inset:0; background:rgba(255,0,0,.0);
    pointer-events:none; transition:background .08s;
  }
`;
document.head.appendChild(_style);

// ─── HUD要素生成 ───────────────────────────────────────────────
const hudEl = document.createElement('div');
hudEl.id = 'hud';
document.body.appendChild(hudEl);

const phaseBarEl = document.createElement('div'); phaseBarEl.id = 'phase-bar';
const phaseBarFill = document.createElement('div'); phaseBarFill.id = 'phase-bar-fill';
phaseBarEl.appendChild(phaseBarFill);
document.body.appendChild(phaseBarEl);

const phaseDisplayEl = document.createElement('div'); phaseDisplayEl.id = 'phase-display';
phaseDisplayEl.innerHTML = `
  <div id="phase-label">SIGNAL PHASE</div>
  <div id="phase-name">N-S GREEN</div>
  <div id="phase-timer">--</div>
`;
hudEl.appendChild(phaseDisplayEl);

const pedPanelEl = document.createElement('div'); pedPanelEl.id = 'ped-panel';
pedPanelEl.innerHTML = `
  <span id="ped-icon">🔴</span>
  <div id="ped-count">--</div>
  <span id="ped-label">PEDESTRIAN</span>
`;
hudEl.appendChild(pedPanelEl);

const infoEl = document.createElement('div'); infoEl.id = 'info-panel';
infoEl.innerHTML = `
  <div class="il">SCENE</div><div class="iv">渋谷スクランブル</div>
  <div class="il" style="margin-top:5px">VEHICLES</div><div class="iv" id="iv-veh">0</div>
  <div class="il" style="margin-top:5px">PEDESTRIANS</div><div class="iv" id="iv-ped">0</div>
  <div class="il" style="margin-top:5px">CYCLE</div><div class="iv" id="iv-cyc">1</div>
  <div class="il" style="margin-top:5px">CAM</div><div class="iv" id="iv-cam">FOLLOW</div>
`;
hudEl.appendChild(infoEl);

const scrambleOverlay = document.createElement('div'); scrambleOverlay.id = 'scramble-overlay';
document.body.appendChild(scrambleOverlay);
const scrambleText = document.createElement('div'); scrambleText.id = 'scramble-text';
scrambleText.textContent = 'SCRAMBLE';
document.body.appendChild(scrambleText);

const camBtnEl = document.createElement('button'); camBtnEl.id = 'cam-btn';
camBtnEl.textContent = 'CAM: FOLLOW'; document.body.appendChild(camBtnEl);

const hintEl = document.createElement('div'); hintEl.id = 'hint';
hintEl.innerHTML = 'WASD / 矢印: 移動<br>Q / E: カメラ切替<br>マウスドラッグ: 自由視点';
hudEl.appendChild(hintEl);

const dmgFlash = document.createElement('div'); dmgFlash.id = 'dmg-flash';
document.body.appendChild(dmgFlash);

// ─────────────────────────────────────────────────────────────────
//  §3  THREE.JS レンダラー & シーン
// ─────────────────────────────────────────────────────────────────

const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(COL.sky);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
document.body.insertBefore(renderer.domElement, hudEl);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x060a16, 0.009);
scene.background = new THREE.Color(0x060a16);

const camera = new THREE.PerspectiveCamera(56, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 30, 40);
camera.lookAt(0, 0, 0);

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// ─────────────────────────────────────────────────────────────────
//  §4  ライティング — LIGHTING
// ─────────────────────────────────────────────────────────────────

// アンビエント (夜間・低照度)
scene.add(new THREE.AmbientLight(0x040810, 0.9));
scene.add(new THREE.HemisphereLight(0x080e20, 0x020406, 0.55));

// メイン平行光 (月光的)
const moonLight = new THREE.DirectionalLight(0x7788bb, 0.75);
moonLight.position.set(35, 90, 50);
moonLight.castShadow = true;
moonLight.shadow.mapSize.set(2048, 2048);
moonLight.shadow.camera.near = 0.5;
moonLight.shadow.camera.far = 240;
moonLight.shadow.camera.left = -90;
moonLight.shadow.camera.right = 90;
moonLight.shadow.camera.top = 90;
moonLight.shadow.camera.bottom = -90;
moonLight.shadow.bias = -0.0012;
scene.add(moonLight);

// 交差点中央フィル
const isectFill = new THREE.PointLight(0x9999cc, 1.6, 65);
isectFill.position.set(0, 24, 0);
scene.add(isectFill);

// コーナーネオン光源
const neonPLights = [];
function addNeonPL(color, intensity, dist, x, y, z) {
  const pl = new THREE.PointLight(color, intensity, dist);
  pl.position.set(x, y, z);
  scene.add(pl);
  neonPLights.push(pl);
  return pl;
}
addNeonPL(0xff1133, 3.0, 50, -(BLDG_OFFSET + 5), 12, -(BLDG_OFFSET + 5));
addNeonPL(0x1133ff, 2.5, 45,  (BLDG_OFFSET + 5), 14, -(BLDG_OFFSET + 5));
addNeonPL(0xff8800, 2.8, 48, -(BLDG_OFFSET + 5),  9,  (BLDG_OFFSET + 5));
addNeonPL(0x00ffaa, 2.2, 42,  (BLDG_OFFSET + 5), 11,  (BLDG_OFFSET + 5));

const streetLampLights = [];

// ─────────────────────────────────────────────────────────────────
//  §5  マテリアル定義 — MATERIALS
// ─────────────────────────────────────────────────────────────────

const M = {};
// 路面
M.asphalt      = new THREE.MeshStandardMaterial({ color: COL.asphalt,     roughness: 0.94, metalness: 0.04 });
M.asphaltWorn  = new THREE.MeshStandardMaterial({ color: COL.asphaltWorn, roughness: 0.96, metalness: 0.02 });
// 歩道
M.sidewalk     = new THREE.MeshStandardMaterial({ color: COL.sidewalk,    roughness: 0.88 });
M.sidewalkDk   = new THREE.MeshStandardMaterial({ color: COL.sidewalkDk,  roughness: 0.90 });
M.curb         = new THREE.MeshStandardMaterial({ color: COL.curb,        roughness: 0.72, metalness: 0.08 });
M.curbWhite    = new THREE.MeshStandardMaterial({ color: COL.curbWhite,   roughness: 0.75 });
// 路面マーキング
M.lineWhite    = new THREE.MeshBasicMaterial({ color: COL.lineWhite });
M.lineWhiteA   = new THREE.MeshBasicMaterial({ color: COL.lineWhite, transparent: true, opacity: 0.80 });
M.lineYellow   = new THREE.MeshBasicMaterial({ color: COL.lineYellow });
M.crosswalk    = new THREE.MeshStandardMaterial({ color: COL.crosswalk, roughness: 0.87 });
// コンクリート
M.concrete     = new THREE.MeshStandardMaterial({ color: 0x5a6470, roughness: 0.84, metalness: 0.06 });
M.concreteL    = new THREE.MeshStandardMaterial({ color: 0x7a8896, roughness: 0.80, metalness: 0.08 });
// 金属
M.metal        = new THREE.MeshStandardMaterial({ color: 0x8899aa, roughness: 0.38, metalness: 0.72 });
M.metalDk      = new THREE.MeshStandardMaterial({ color: 0x445566, roughness: 0.42, metalness: 0.68 });
M.chrome       = new THREE.MeshStandardMaterial({ color: 0xccddee, roughness: 0.12, metalness: 0.96 });
M.lampPost     = new THREE.MeshStandardMaterial({ color: 0x28303e, roughness: 0.50, metalness: 0.62 });
// ガラス
M.glass        = new THREE.MeshPhysicalMaterial({ color: 0x1a3048, transparent: true, opacity: 0.32, roughness: 0.04, metalness: 0.1 });
M.glassDk      = new THREE.MeshPhysicalMaterial({ color: 0x080e18, transparent: true, opacity: 0.55, roughness: 0.06, metalness: 0.05 });
// 信号機
M.sigHousing   = new THREE.MeshStandardMaterial({ color: 0x0c1014, roughness: 0.78 });
M.sigRed       = new THREE.MeshBasicMaterial({ color: 0xff1100 });
M.sigYellow    = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
M.sigGreen     = new THREE.MeshBasicMaterial({ color: 0x00ee44 });
M.sigRedDim    = new THREE.MeshStandardMaterial({ color: 0x2a0400, roughness: 0.65 });
M.sigYellowDim = new THREE.MeshStandardMaterial({ color: 0x2a2200, roughness: 0.65 });
M.sigGreenDim  = new THREE.MeshStandardMaterial({ color: 0x002a0e, roughness: 0.65 });
// ランプ
M.lampGlow     = new THREE.MeshBasicMaterial({ color: 0xffeebb });
M.lampGlowB    = new THREE.MeshBasicMaterial({ color: 0xddeeff });
// 道路標識
M.signGreen    = new THREE.MeshStandardMaterial({ color: 0x0b3d18, roughness: 0.55, metalness: 0.18 });
M.signWhite    = new THREE.MeshBasicMaterial({ color: 0xffffff });
M.signBlue     = new THREE.MeshStandardMaterial({ color: 0x0c2a5a, roughness: 0.55, metalness: 0.12 });
// 建物
M.bldgA        = new THREE.MeshStandardMaterial({ color: 0x0c1018, roughness: 0.88 });
M.bldgB        = new THREE.MeshStandardMaterial({ color: 0x101420, roughness: 0.82 });
M.bldgC        = new THREE.MeshStandardMaterial({ color: 0x141824, roughness: 0.78 });
M.bldgD        = new THREE.MeshStandardMaterial({ color: 0x181c28, roughness: 0.74 });
M.bldgFacade   = new THREE.MeshStandardMaterial({ color: 0x1c2236, roughness: 0.70 });
M.winYellow    = new THREE.MeshBasicMaterial({ color: 0xffdd88 });
M.winBlue      = new THREE.MeshBasicMaterial({ color: 0x2244aa });
M.winOff       = new THREE.MeshStandardMaterial({ color: 0x060810, roughness: 0.92 });
// ネオン
M.neonR  = new THREE.MeshBasicMaterial({ color: 0xff1133 });
M.neonB  = new THREE.MeshBasicMaterial({ color: 0x0044ff });
M.neonG  = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
M.neonY  = new THREE.MeshBasicMaterial({ color: 0xffdd00 });
M.neonO  = new THREE.MeshBasicMaterial({ color: 0xff6600 });
M.neonP  = new THREE.MeshBasicMaterial({ color: 0xff44aa });
M.neonC  = new THREE.MeshBasicMaterial({ color: 0x00ddff });
M.neonW  = new THREE.MeshBasicMaterial({ color: 0xffffff });
// ペイント / 黄色 / 白
M.yellow       = new THREE.MeshStandardMaterial({ color: 0xf0b800, roughness: 0.50 });
M.white        = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.60 });
M.black        = new THREE.MeshStandardMaterial({ color: 0x040408, roughness: 0.82 });
M.darkPlastic  = new THREE.MeshStandardMaterial({ color: 0x0c1014, roughness: 0.76 });
// 車
M.carBlk = new THREE.MeshStandardMaterial({ color: 0x060a10, roughness: 0.28, metalness: 0.32 });
M.carWht = new THREE.MeshStandardMaterial({ color: 0xe8eaee, roughness: 0.32, metalness: 0.18 });
M.carSlv = new THREE.MeshStandardMaterial({ color: 0x9ea8b4, roughness: 0.28, metalness: 0.38 });
M.carRed = new THREE.MeshStandardMaterial({ color: 0xcc1100, roughness: 0.32, metalness: 0.22 });
M.carBlu = new THREE.MeshStandardMaterial({ color: 0x0a2d8a, roughness: 0.30, metalness: 0.28 });
M.taxi   = new THREE.MeshStandardMaterial({ color: 0xf5c800, roughness: 0.48, metalness: 0.10 });
M.bus    = new THREE.MeshStandardMaterial({ color: 0x0033aa, roughness: 0.50 });
M.truck  = new THREE.MeshStandardMaterial({ color: 0x556677, roughness: 0.62 });
M.rubber = new THREE.MeshStandardMaterial({ color: 0x060608, roughness: 0.98 });
M.rim    = new THREE.MeshStandardMaterial({ color: 0x8899aa, roughness: 0.24, metalness: 0.86 });
// 歩行者
M.pedHead = new THREE.MeshStandardMaterial({ color: 0xc8905a, roughness: 0.95 });
// 自動販売機
M.vendR  = new THREE.MeshStandardMaterial({ color: 0xcc0000, roughness: 0.52 });
M.vendB  = new THREE.MeshStandardMaterial({ color: 0x002299, roughness: 0.52 });
// 木 / 植栽
M.trunk  = new THREE.MeshStandardMaterial({ color: 0x3a2010, roughness: 0.92 });
M.foliage= new THREE.MeshStandardMaterial({ color: 0x1a4a18, roughness: 0.95 });
M.soil   = new THREE.MeshStandardMaterial({ color: 0x2c1a0a, roughness: 0.99 });

// ─────────────────────────────────────────────────────────────────
//  §6  ユーティリティ関数 — HELPERS
// ─────────────────────────────────────────────────────────────────

function mkBox(w, h, d, mat, parent, cx, cy, cz, ry) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  if (cx !== undefined) mesh.position.set(cx, cy, cz);
  if (ry !== undefined) mesh.rotation.y = ry;
  mesh.castShadow = true; mesh.receiveShadow = true;
  if (parent) parent.add(mesh);
  return mesh;
}
function mkCyl(rt, rb, h, seg, mat, parent, cx, cy, cz, rx) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  if (cx !== undefined) mesh.position.set(cx, cy, cz);
  if (rx !== undefined) mesh.rotation.x = rx;
  mesh.castShadow = true;
  if (parent) parent.add(mesh);
  return mesh;
}
function mkPlane(w, d, mat, parent, cx, cy, cz, rx) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
  if (cx !== undefined) mesh.position.set(cx, cy, cz);
  if (rx !== undefined) mesh.rotation.x = rx;
  mesh.receiveShadow = true;
  if (parent) parent.add(mesh);
  return mesh;
}
function rnd(a, b)   { return a + Math.random() * (b - a); }
function rndI(a, b)  { return Math.floor(rnd(a, b + 1)); }
function pick(arr)   { return arr[Math.floor(Math.random() * arr.length)]; }
function deg(d)      { return d * Math.PI / 180; }

// ─────────────────────────────────────────────────────────────────
//  §7  交差点ジオメトリ — INTERSECTION GEOMETRY
// ─────────────────────────────────────────────────────────────────

const worldGrp = new THREE.Group(); scene.add(worldGrp);
const roadGrp  = new THREE.Group(); worldGrp.add(roadGrp);

function buildIntersection() {
  buildRoadSurfaces();
  buildSidewalks();
  buildCurbs();
  buildLaneMarkings();
  buildCrosswalks();
  buildStopLines();
  buildCenterHatching();
  buildGutters();
}

function buildRoadSurfaces() {
  // 交差点中央スラブ
  mkPlane(ROAD_HALF * 2, ROAD_HALF * 2, M.asphalt, roadGrp, 0, 0.003, 0, -Math.PI / 2);

  // N-S 道路アーム
  mkPlane(ROAD_HALF * 2, ROAD_LEN * 2, M.asphalt, roadGrp, 0, 0.002, 0, -Math.PI / 2);

  // E-W 道路アーム
  mkPlane(ROAD_LEN * 2, ROAD_HALF * 2, M.asphalt, roadGrp, 0, 0.001, 0, -Math.PI / 2);
}

function buildSidewalks() {
  const sw = SIDEWALK_W;
  const ch = SIDEWALK_H;
  const armLen = ROAD_LEN - ROAD_HALF;
  const armMid = ROAD_HALF + armLen / 2;
  const cSW = ROAD_HALF + sw / 2;

  // コーナー (4隅の歩道プラザ)
  [[-cSW, -cSW], [cSW, -cSW], [-cSW, cSW], [cSW, cSW]].forEach(([x, z]) => {
    const geo = new THREE.BoxGeometry(sw, ch, sw);
    const m = new THREE.Mesh(geo, M.sidewalk);
    m.position.set(x, ch / 2, z);
    m.receiveShadow = true;
    roadGrp.add(m);
  });

  // N/S アーム両側
  [ROAD_HALF + sw / 2, -(ROAD_HALF + sw / 2)].forEach(x => {
    [-armMid, armMid].forEach(z => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sw, ch, armLen), M.sidewalkDk);
      m.position.set(x, ch / 2, z); m.receiveShadow = true; roadGrp.add(m);
    });
  });

  // E/W アーム両側
  [ROAD_HALF + sw / 2, -(ROAD_HALF + sw / 2)].forEach(z => {
    [armMid, -armMid].forEach(x => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(armLen, ch, sw), M.sidewalkDk);
      m.position.set(x, ch / 2, z); m.receiveShadow = true; roadGrp.add(m);
    });
  });
}

function buildCurbs() {
  const ch = SIDEWALK_H;
  const armLen = ROAD_LEN - ROAD_HALF;
  const armMid = ROAD_HALF + armLen / 2;

  // N/S 道路両縁石
  [ROAD_HALF, -ROAD_HALF].forEach(x => {
    [-armMid, armMid].forEach(z => {
      const c = new THREE.Mesh(new THREE.BoxGeometry(CURB_W, ch, armLen), M.curb);
      c.position.set(x, ch / 2, z); roadGrp.add(c);
    });
    // 交差点縁
    ['n', 's'].forEach((_, si) => {
      const cz = si === 0 ? -ROAD_HALF / 2 : ROAD_HALF / 2;
    });
  });

  // E/W 道路両縁石
  [ROAD_HALF, -ROAD_HALF].forEach(z => {
    [armMid, -armMid].forEach(x => {
      const c = new THREE.Mesh(new THREE.BoxGeometry(armLen, ch, CURB_W), M.curb);
      c.position.set(x, ch / 2, z); roadGrp.add(c);
    });
  });

  // コーナー縁石 (白い線)
  [[-ROAD_HALF, -ROAD_HALF], [ROAD_HALF, -ROAD_HALF],
   [-ROAD_HALF,  ROAD_HALF], [ROAD_HALF,  ROAD_HALF]].forEach(([x, z]) => {
    const cH = new THREE.Mesh(new THREE.BoxGeometry(SIDEWALK_W + 0.4, ch, CURB_W * 2), M.curbWhite);
    cH.position.set(x + (x > 0 ? 1 : -1) * SIDEWALK_W / 2, ch / 2, z);
    roadGrp.add(cH);
    const cV = new THREE.Mesh(new THREE.BoxGeometry(CURB_W * 2, ch, SIDEWALK_W + 0.4), M.curbWhite);
    cV.position.set(x, ch / 2, z + (z > 0 ? 1 : -1) * SIDEWALK_W / 2);
    roadGrp.add(cV);
  });
}

function buildLaneMarkings() {
  const y = 0.009;
  const lw = 0.11;
  const dashL = 3.5;
  const dashGap = 4.2;
  const period = dashL + dashGap;

  // 中央線 (黄色ダブルライン) — N-S方向
  for (let z = -ROAD_LEN; z < ROAD_LEN; z += period) {
    if (z > -ROAD_HALF - 2 && z < ROAD_HALF + 2) continue;
    [-0.12, 0.12].forEach(ox => {
      const seg = mkPlane(lw, dashL, M.lineYellow, roadGrp, ox, y, z + dashL / 2, -Math.PI / 2);
    });
  }

  // 中央線 (黄色ダブルライン) — E-W方向
  for (let x = -ROAD_LEN; x < ROAD_LEN; x += period) {
    if (x > -ROAD_HALF - 2 && x < ROAD_HALF + 2) continue;
    [-0.12, 0.12].forEach(oz => {
      mkPlane(dashL, lw, M.lineYellow, roadGrp, x + dashL / 2, y, oz, -Math.PI / 2);
    });
  }

  // 車線区分線 (白い破線) — N-S
  [LANE_W, -LANE_W].forEach(lx => {
    for (let z = -ROAD_LEN; z < ROAD_LEN; z += period) {
      if (z > -ROAD_HALF - 2 && z < ROAD_HALF + 2) continue;
      mkPlane(lw * 0.9, dashL * 0.88, M.lineWhiteA, roadGrp, lx, y + 0.001, z + dashL * 0.44, -Math.PI / 2);
    }
  });

  // 車線区分線 (白い破線) — E-W
  [LANE_W, -LANE_W].forEach(lz => {
    for (let x = -ROAD_LEN; x < ROAD_LEN; x += period) {
      if (x > -ROAD_HALF - 2 && x < ROAD_HALF + 2) continue;
      mkPlane(dashL * 0.88, lw * 0.9, M.lineWhiteA, roadGrp, x + dashL * 0.44, y + 0.001, lz, -Math.PI / 2);
    }
  });
}

function buildCrosswalks() {
  const y = 0.011;
  const totalW = ROAD_HALF * 2;
  const depth = CW_DEPTH;

  // N横断歩道 (交差点の北端)
  buildCwStripes(0, y, -(ROAD_HALF + depth / 2), totalW, depth, true);
  // S横断歩道
  buildCwStripes(0, y,  (ROAD_HALF + depth / 2), totalW, depth, true);
  // E横断歩道
  buildCwStripes( (ROAD_HALF + depth / 2), y, 0, depth, totalW, false);
  // W横断歩道
  buildCwStripes(-(ROAD_HALF + depth / 2), y, 0, depth, totalW, false);
}

function buildCwStripes(cx, y, cz, totalW, depth, nsDir) {
  const period = CW_STRIPE_W + CW_STRIPE_GAP;
  const half = totalW / 2;
  for (let t = -half + CW_STRIPE_W / 2; t < half; t += period) {
    const stripe = new THREE.Mesh(
      new THREE.PlaneGeometry(
        nsDir ? CW_STRIPE_W : depth,
        nsDir ? depth : CW_STRIPE_W
      ),
      M.crosswalk
    );
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(
      nsDir ? cx + t : cx,
      y,
      nsDir ? cz : cz + t
    );
    stripe.receiveShadow = true;
    roadGrp.add(stripe);
  }

  // 外縁の白ライン
  const outline = new THREE.Mesh(
    new THREE.PlaneGeometry(
      nsDir ? totalW : 0.10,
      nsDir ? 0.10 : totalW
    ),
    M.lineWhite
  );
  outline.rotation.x = -Math.PI / 2;
  outline.position.set(cx, y + 0.001, nsDir ? cz - depth / 2 - 0.05 : cz);
  roadGrp.add(outline);
  const outline2 = outline.clone();
  outline2.position.set(cx, y + 0.001, nsDir ? cz + depth / 2 + 0.05 : cz);
  roadGrp.add(outline2);
}

function buildStopLines() {
  const y = 0.012;
  const lw = 0.38;

  // 南向き停止線 (N側)
  mkPlane(ROAD_HALF * 2, lw, M.lineWhite, roadGrp, 0, y, -(VEH_STOP_LINE), -Math.PI / 2);
  // 北向き停止線 (S側)
  mkPlane(ROAD_HALF * 2, lw, M.lineWhite, roadGrp, 0, y,  (VEH_STOP_LINE), -Math.PI / 2);
  // 西向き停止線 (E側)
  mkPlane(lw, ROAD_HALF * 2, M.lineWhite, roadGrp,  (VEH_STOP_LINE), y, 0, -Math.PI / 2);
  // 東向き停止線 (W側)
  mkPlane(lw, ROAD_HALF * 2, M.lineWhite, roadGrp, -(VEH_STOP_LINE), y, 0, -Math.PI / 2);
}

function buildCenterHatching() {
  // 交差点内部の黄色ハッチング
  const hMat = new THREE.MeshBasicMaterial({ color: 0xf4c418, transparent: true, opacity: 0.40 });
  const size = ROAD_HALF * 0.62;
  const hatchW = 0.24;
  for (let t = -size; t <= size; t += 1.6) {
    const h = new THREE.Mesh(new THREE.PlaneGeometry(hatchW, size * 2.9), hMat);
    h.rotation.x = -Math.PI / 2;
    h.rotation.z = -Math.PI / 4;
    h.position.set(t, 0.007, 0);
    roadGrp.add(h);
  }

  // ボックスアウトライン
  const border = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-ROAD_HALF + 0.5, 0.008,  -ROAD_HALF + 0.5),
      new THREE.Vector3( ROAD_HALF - 0.5, 0.008,  -ROAD_HALF + 0.5),
      new THREE.Vector3( ROAD_HALF - 0.5, 0.008,   ROAD_HALF - 0.5),
      new THREE.Vector3(-ROAD_HALF + 0.5, 0.008,   ROAD_HALF - 0.5),
    ]),
    new THREE.LineBasicMaterial({ color: 0xf4c418, transparent: true, opacity: 0.5 })
  );
  roadGrp.add(border);
}

function buildGutters() {
  // 道路端の排水溝 (リアル感)
  const gutterMat = new THREE.MeshStandardMaterial({ color: 0x101416, roughness: 0.95 });
  const armLen = ROAD_LEN - ROAD_HALF;
  const armMid = ROAD_HALF + armLen / 2;
  const positions = [
    { x: ROAD_HALF - 0.18, z: -armMid, w: 0.28, d: armLen, ns: true },
    { x: -ROAD_HALF + 0.18, z: -armMid, w: 0.28, d: armLen, ns: true },
    { x: ROAD_HALF - 0.18, z: armMid, w: 0.28, d: armLen, ns: true },
    { x: -ROAD_HALF + 0.18, z: armMid, w: 0.28, d: armLen, ns: true },
    { x: armMid,  z: ROAD_HALF - 0.18, w: armLen, d: 0.28, ns: false },
    { x: armMid,  z: -ROAD_HALF + 0.18, w: armLen, d: 0.28, ns: false },
    { x: -armMid, z: ROAD_HALF - 0.18, w: armLen, d: 0.28, ns: false },
    { x: -armMid, z: -ROAD_HALF + 0.18, w: armLen, d: 0.28, ns: false },
  ];
  positions.forEach(p => {
    mkPlane(p.w, p.d, gutterMat, roadGrp, p.x, 0.004, p.z, -Math.PI / 2);
    // グレーチング (格子模様)
    for (let i = 0; i < (p.ns ? p.d : p.w); i += 4.0) {
      const grate = new THREE.Mesh(
        new THREE.BoxGeometry(p.ns ? 0.26 : 0.32, 0.02, p.ns ? 0.32 : 0.26),
        M.metalDk
      );
      grate.position.set(p.x, 0.01, p.z + (p.ns ? -p.d / 2 + i + 2 : 0));
      grate.position.x += p.ns ? 0 : -p.w / 2 + i + 2;
      roadGrp.add(grate);
    }
  });
}

// ─────────────────────────────────────────────────────────────────
//  §8  信号機システム — TRAFFIC SIGNAL SYSTEM
// ─────────────────────────────────────────────────────────────────

const signalGrp = new THREE.Group(); worldGrp.add(signalGrp);
const allLenses = []; // { type, dir, color, mesh }

let signalPhase = PH.NS_GREEN;
let signalTimer = PH_DURATION[PH.NS_GREEN];
let signalCycle = 1;
let phaseSeqIdx = 0;
let lastPhase    = -1;

// 信号ポール建設
function buildSignalPole(x, z, facingAngle, laneDir) {
  const grp = new THREE.Group();
  grp.position.set(x, 0, z);
  grp.rotation.y = facingAngle;
  signalGrp.add(grp);

  // メインポール
  mkCyl(0.065, 0.085, 8.0, 8, M.lampPost, grp, 0, 4.0, 0);

  // 水平アーム (道路をまたぐ)
  const armLen = 5.5;
  mkCyl(0.040, 0.040, armLen, 6, M.lampPost, grp, armLen / 2, 7.5, 0, 0).rotation.z = Math.PI / 2;

  // 車両信号灯ボックス (アーム先端)
  const vBox = buildVehicleSignalBox(laneDir);
  vBox.position.set(armLen, 6.9, 0);
  grp.add(vBox);

  // 歩行者信号 (ポール下部)
  const pBox = buildPedSignalBox(laneDir);
  pBox.position.set(0.3, 4.2, 0.3);
  grp.add(pBox);

  // カウントダウン表示
  const cdBox = buildCountdownBox(laneDir);
  cdBox.position.set(0.3, 3.0, 0.3);
  grp.add(cdBox);

  // 街路灯部分
  mkCyl(0.028, 0.028, 2.0, 6, M.lampPost, grp, -0.9, 8.5, 0).rotation.z = Math.PI / 2;
  const lampHead = mkBox(0.55, 0.22, 0.46, M.metalDk, grp, -1.88, 8.45, 0);
  const lampFace = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.38), M.lampGlow);
  lampFace.rotation.x = Math.PI / 2; lampFace.position.set(-1.88, 8.31, 0); grp.add(lampFace);

  const pl = new THREE.PointLight(0xffeebb, 1.5, 20);
  pl.position.set(x - 1.88 * Math.cos(facingAngle), 8.2, z + 1.88 * Math.sin(facingAngle));
  scene.add(pl); streetLampLights.push(pl);

  // ポール基部 (コンクリート台座)
  mkCyl(0.28, 0.32, 0.24, 8, M.concrete, grp, 0, 0.12, 0);

  return grp;
}

function buildVehicleSignalBox(dir) {
  const grp = new THREE.Group();
  // ハウジング
  mkBox(0.46, 1.45, 0.40, M.sigHousing, grp, 0, 0, 0);
  // バイザー (3つ)
  [-0.45, 0, 0.45].forEach(y => {
    mkBox(0.54, 0.06, 0.24, M.sigHousing, grp, 0, y, 0.30);
  });
  // レンズ3色
  const colors = ['R', 'Y', 'G'];
  const yOff   = [0.45, 0, -0.45];
  const dimMats = [M.sigRedDim, M.sigYellowDim, M.sigGreenDim];
  yOff.forEach((ly, i) => {
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.15, 16), dimMats[i]);
    lens.position.set(0, ly, 0.21); lens.rotation.y = 0;
    grp.add(lens);
    allLenses.push({ type: 'vehicle', dir, color: colors[i], mesh: lens });
  });
  return grp;
}

function buildPedSignalBox(dir) {
  const grp = new THREE.Group();
  mkBox(0.32, 0.56, 0.14, M.sigHousing, grp, 0, 0, 0);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.42), M.sigRedDim);
  face.position.set(0, 0, 0.075);
  grp.add(face);
  allLenses.push({ type: 'ped', dir, color: 'PED', mesh: face });
  // 押しボタン
  mkBox(0.12, 0.09, 0.11, M.metal, grp, 0, -0.35, 0);
  mkBox(0.08, 0.08, 0.08, M.yellow, grp, 0, -0.35, 0.06);
  return grp;
}

function buildCountdownBox(dir) {
  const grp = new THREE.Group();
  mkBox(0.28, 0.24, 0.11, M.sigHousing, grp, 0, 0, 0);
  // オレンジLED風ディスプレイ
  const disp = new THREE.Mesh(new THREE.PlaneGeometry(0.20, 0.16), M.neonO);
  disp.position.set(0, 0, 0.062);
  grp.add(disp);
  return grp;
}

function placeAllSignals() {
  const os = ROAD_HALF + SIDEWALK_W * 0.22 + 0.5;
  // 4コーナーに信号ポール
  buildSignalPole(-os, -os, deg(-45),  'NS');
  buildSignalPole( os, -os, deg(-135), 'EW');
  buildSignalPole(-os,  os, deg(45),   'EW');
  buildSignalPole( os,  os, deg(135),  'NS');

  // 中間の歩行者専用ポール
  buildPedPole(-ROAD_HALF - 1.0, -(ROAD_HALF + 3.8), 'NS');
  buildPedPole( ROAD_HALF + 1.0, -(ROAD_HALF + 3.8), 'NS');
  buildPedPole(-ROAD_HALF - 1.0,  (ROAD_HALF + 3.8), 'NS');
  buildPedPole( ROAD_HALF + 1.0,  (ROAD_HALF + 3.8), 'NS');
  buildPedPole(-(ROAD_HALF + 3.8), -ROAD_HALF - 1.0, 'EW');
  buildPedPole(-(ROAD_HALF + 3.8),  ROAD_HALF + 1.0, 'EW');
  buildPedPole( (ROAD_HALF + 3.8), -ROAD_HALF - 1.0, 'EW');
  buildPedPole( (ROAD_HALF + 3.8),  ROAD_HALF + 1.0, 'EW');
}

function buildPedPole(x, z, dir) {
  const grp = new THREE.Group();
  grp.position.set(x, 0, z);
  signalGrp.add(grp);

  mkCyl(0.044, 0.058, 3.8, 8, M.lampPost, grp, 0, 1.9, 0);
  mkCyl(0.26, 0.30, 0.22, 8, M.concrete, grp, 0, 0.11, 0);

  const housing = mkBox(0.30, 0.50, 0.13, M.sigHousing, grp, 0, 3.9, 0);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.38), M.sigRedDim);
  face.position.set(0, 3.9, 0.075);
  grp.add(face);
  allLenses.push({ type: 'ped', dir, color: 'PED', mesh: face });

  mkBox(0.13, 0.095, 0.11, M.metal, grp, 0, 2.5, 0.06);
  mkBox(0.09, 0.09, 0.09, M.yellow, grp, 0, 2.5, 0.12);
}

function applySignalPhase(ph) {
  allLenses.forEach(l => {
    if (l.type === 'vehicle') {
      const isNS = l.dir === 'NS';
      const isEW = l.dir === 'EW';
      let litColor = 'R';
      if (ph === PH.NS_GREEN)  litColor = isNS ? 'G' : 'R';
      else if (ph === PH.NS_YELLOW) litColor = isNS ? 'Y' : 'R';
      else if (ph === PH.EW_GREEN)  litColor = isEW ? 'G' : 'R';
      else if (ph === PH.EW_YELLOW) litColor = isEW ? 'Y' : 'R';
      else litColor = 'R';

      if (l.color === 'R') l.mesh.material = litColor === 'R' ? M.sigRed    : M.sigRedDim;
      if (l.color === 'Y') l.mesh.material = litColor === 'Y' ? M.sigYellow : M.sigYellowDim;
      if (l.color === 'G') l.mesh.material = litColor === 'G' ? M.sigGreen  : M.sigGreenDim;
    } else {
      // 歩行者信号
      const isNS = l.dir === 'NS';
      const isEW = l.dir === 'EW';
      const walk =
        ph === PH.SCRAMBLE ||
        (ph === PH.NS_GREEN  && isEW) ||  // NS車 走行 → EW歩行者 渡れる
        (ph === PH.EW_GREEN  && isNS);    // EW車 走行 → NS歩行者 渡れる
      l.mesh.material = walk ? M.sigGreen : M.sigRedDim;
    }
  });
}

function advanceSignal() {
  phaseSeqIdx = (phaseSeqIdx + 1) % PH_SEQUENCE.length;
  signalPhase = PH_SEQUENCE[phaseSeqIdx];
  signalTimer = PH_DURATION[signalPhase];
  if (phaseSeqIdx === 0) signalCycle++;
  applySignalPhase(signalPhase);
  updateHUD();
  if (signalPhase === PH.SCRAMBLE) onScrambleStart();
}

function onScrambleStart() {
  scrambleOverlay.classList.add('active');
  scrambleText.classList.add('active');
  setTimeout(() => {
    scrambleText.classList.remove('active');
    scrambleOverlay.classList.remove('active');
  }, 2200);
  // 待機中歩行者を解放
  pedestrians.forEach(p => {
    if (p.state === 'waiting') p.waitTimer = rnd(0, 3.5);
  });
  for (let i = 0; i < 45; i++) spawnPedestrian();
}

function updateSignals(dt) {
  signalTimer -= dt;
  if (signalTimer <= 0) advanceSignal();

  const pct = Math.max(0, signalTimer / PH_DURATION[signalPhase]);
  phaseBarFill.style.width = (pct * 100) + '%';

  if (signalPhase === PH.SCRAMBLE)   phaseBarFill.style.background = '#00c4ff';
  else if (signalPhase === PH.NS_YELLOW || signalPhase === PH.EW_YELLOW)
                                      phaseBarFill.style.background = '#ffcc00';
  else if (signalPhase === PH.ALL_RED) phaseBarFill.style.background = '#ff2200';
  else                                phaseBarFill.style.background = '#00ee44';

  // 歩行者信号 UI
  const pedWalk = (signalPhase === PH.SCRAMBLE);
  document.getElementById('ped-icon').textContent  = pedWalk ? '🟢' : '🔴';
  document.getElementById('ped-count').textContent = Math.ceil(signalTimer);
  document.getElementById('ped-label').textContent = pedWalk ? 'SCRAMBLE!' : 'WAIT / 待て';

  if (pedWalk) {
    document.getElementById('ped-count').style.color = '#00c4ff';
  } else {
    document.getElementById('ped-count').style.color = '#fff';
  }
}

// ─────────────────────────────────────────────────────────────────
//  §9  建物 — BUILDINGS
// ─────────────────────────────────────────────────────────────────

const bldgGrp = new THREE.Group(); worldGrp.add(bldgGrp);

const NEON_MATS = [M.neonR, M.neonB, M.neonG, M.neonY, M.neonO, M.neonP, M.neonC];

function addWindows(grp, bw, bh, depth, startY, floorH, side) {
  const cols = Math.floor(bw / 2.6);
  const rows = Math.floor(bh / floorH);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (Math.random() > 0.58) {
        const wm = Math.random() > 0.65 ? M.winBlue : M.winYellow;
        const win = new THREE.Mesh(new THREE.PlaneGeometry(1.1, floorH * 0.50), wm);
        win.position.set(
          -bw / 2 + 1.3 + c * (bw / Math.max(cols, 1)),
          startY + r * floorH + floorH * 0.48,
          depth + (side > 0 ? 0.08 : -0.08)
        );
        win.rotation.y = side < 0 ? Math.PI : 0;
        grp.add(win);
      }
    }
  }
}

function buildTsutayaCorner() {
  // NE コーナー — TSUTAYAビル風
  const bx = BLDG_OFFSET + 14, bz = -(BLDG_OFFSET + 9);
  const grp = new THREE.Group(); grp.position.set(bx, 0, bz); bldgGrp.add(grp);

  // タワー本体
  mkBox(26, 62, 22, M.bldgA, grp, 0, 31, 0);
  // ガラスファサード (南面)
  for (let f = 0; f < 14; f++) {
    mkBox(23, 2.9, 0.18, M.glassDk, grp, 0, 8 + f * 4.0, 11.1);
  }
  // 赤ネオン帯
  [4.5, 7.0, 9.5, 12.0, 32.0, 44.0, 56.0].forEach(y => {
    mkBox(26.2, 0.28, 0.14, M.neonR, grp, 0, y, 11.1);
  });
  // 屋上看板
  mkBox(14, 4.5, 0.55, M.bldgB, grp, 0, 63.5, 11.1);
  mkBox(13.8, 0.22, 0.14, M.neonW, grp, 0, 65.8, 11.1);
  addWindows(grp, 26, 50, 11, 4, 3.8, 1);
}

function buildQPlaza() {
  // NW コーナー — Q's EYEビル風 (球体装飾付き)
  const bx = -(BLDG_OFFSET + 12), bz = -(BLDG_OFFSET + 8);
  const grp = new THREE.Group(); grp.position.set(bx, 0, bz); bldgGrp.add(grp);

  mkBox(22, 55, 20, M.bldgC, grp, 0, 27.5, 0);
  // 青ガラスストライプ
  for (let f = 0; f < 12; f++) {
    mkBox(20.5, 0.18, 0.12, M.neonB, grp, 0, 6 + f * 4.2, 10.1);
  }
  // 球体アクセント (屋上)
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(3.4, 16, 12), M.glassDk);
  sphere.position.set(0, 57.5, 0); grp.add(sphere);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.8, 0.22, 8, 28), M.neonB);
  ring.position.set(0, 57.5, 0); ring.rotation.x = Math.PI / 2; grp.add(ring);
  addWindows(grp, 22, 46, 10, 4, 3.5, 1);
}

function buildMagnetBuilding() {
  // SE コーナー — ダークファサード高層
  const bx = BLDG_OFFSET + 10, bz = BLDG_OFFSET + 12;
  const grp = new THREE.Group(); grp.position.set(bx, 0, bz); bldgGrp.add(grp);

  mkBox(24, 70, 22, M.bldgD, grp, 0, 35, 0);
  // 縦ネオン
  [-8, -3, 3, 8].forEach(x => {
    mkBox(0.14, 68, 0.14, M.neonO, grp, x, 34, 11.1);
  });
  // 中層オレンジ帯
  [20, 35, 50].forEach(y => {
    mkBox(24.2, 0.32, 0.14, M.neonO, grp, 0, y, 11.1);
  });
  addWindows(grp, 24, 60, 11, 5, 4.0, 1);
}

function buildSWCornerBlock() {
  // SW コーナー — 低層商業ビル群
  const bx = -(BLDG_OFFSET + 10), bz = BLDG_OFFSET + 10;
  const grp = new THREE.Group(); grp.position.set(bx, 0, bz); bldgGrp.add(grp);

  // メインビル
  mkBox(20, 38, 18, M.bldgA, grp, 0, 19, 0);
  // 低層商業棟
  mkBox(20, 12, 10, M.bldgFacade, grp, 0, 6, 14);
  // グリーンネオン
  [3, 6, 9].forEach(y => {
    mkBox(20.2, 0.18, 0.12, M.neonG, grp, 0, y, 9.1);
  });
  [10, 18, 28].forEach(y => {
    mkBox(20.2, 0.18, 0.12, M.neonP, grp, 0, y, 9.1);
  });
  addWindows(grp, 20, 32, 9, 8, 3.2, 1);
}

function buildBackgroundBuildings() {
  // 奥行きを出す背景ビル群
  const configs = [
    { x:  65, z: -55, w: 18, h: 45, d: 16, mat: M.bldgA },
    { x: -65, z: -50, w: 20, h: 52, d: 18, mat: M.bldgB },
    { x:  60, z:  58, w: 22, h: 38, d: 20, mat: M.bldgC },
    { x: -60, z:  55, w: 16, h: 42, d: 14, mat: M.bldgD },
    { x:  0,  z: -72, w: 30, h: 30, d: 22, mat: M.bldgFacade },
    { x:  0,  z:  72, w: 28, h: 35, d: 20, mat: M.bldgA },
    { x:  72, z:   0, w: 20, h: 28, d: 26, mat: M.bldgB },
    { x: -72, z:   0, w: 18, h: 32, d: 24, mat: M.bldgC },
    { x:  40, z: -70, w: 14, h: 60, d: 12, mat: M.bldgD },
    { x: -40, z: -70, w: 12, h: 55, d: 14, mat: M.bldgA },
    { x:  40, z:  70, w: 16, h: 48, d: 12, mat: M.bldgB },
    { x: -40, z:  70, w: 14, h: 50, d: 16, mat: M.bldgC },
  ];
  configs.forEach(c => {
    const grp = new THREE.Group();
    grp.position.set(c.x, 0, c.z);
    bldgGrp.add(grp);
    mkBox(c.w, c.h, c.d, c.mat, grp, 0, c.h / 2, 0);
    addWindows(grp, c.w, c.h - 4, c.d / 2, 4, rnd(3.0, 4.2), 1);
    addWindows(grp, c.w, c.h - 4, c.d / 2, 4, rnd(3.0, 4.2), -1);
    // ランダムネオン帯
    if (Math.random() > 0.5) {
      const nm = pick(NEON_MATS);
      mkBox(c.w + 0.2, 0.22, 0.12, nm, grp, 0, rnd(8, c.h * 0.6), c.d / 2 + 0.06);
    }
  });
}

// ─────────────────────────────────────────────────────────────────
//  §10  街路家具 — STREET FURNITURE
// ─────────────────────────────────────────────────────────────────

const furnitureGrp = new THREE.Group(); worldGrp.add(furnitureGrp);

function buildStreetFurniture() {
  placeVendingMachines();
  placeTrashCans();
  placeBenches();
  placeTrees();
  placeGuardrails();
  placeBillboards();
  placeOverheadSigns();
  placeManholeCover();
}

function placeVendingMachines() {
  const positions = [
    { x:  ROAD_HALF + 1.8, z: -28, ry: Math.PI },
    { x:  ROAD_HALF + 3.0, z: -28, ry: Math.PI },
    { x: -ROAD_HALF - 1.8, z:  28, ry: 0 },
    { x: -ROAD_HALF - 3.0, z:  28, ry: 0 },
    { x:  20, z:  ROAD_HALF + 2.0, ry: -Math.PI / 2 },
    { x: -20, z: -ROAD_HALF - 2.0, ry:  Math.PI / 2 },
  ];
  positions.forEach(p => {
    const g = new THREE.Group();
    g.position.set(p.x, SIDEWALK_H, p.z);
    g.rotation.y = p.ry;
    furnitureGrp.add(g);
    const col = Math.random() > 0.5 ? M.vendR : M.vendB;
    mkBox(0.72, 1.82, 0.42, col, g, 0, 0.91, 0);
    mkBox(0.64, 0.98, 0.05, M.glassDk, g, 0, 1.10, 0.215);
    mkBox(0.64, 0.36, 0.05, M.metalDk, g, 0, 0.28, 0.215);
    // ランプ
    const pl = new THREE.PointLight(Math.random() > 0.5 ? 0xff2200 : 0x0033ff, 0.8, 5);
    pl.position.set(p.x, SIDEWALK_H + 1.8, p.z); scene.add(pl);
  });
}

function placeTrashCans() {
  const spots = [
    [-ROAD_HALF - 2.2, -22], [ ROAD_HALF + 2.2, 22],
    [-22, -ROAD_HALF - 2.2], [ 22,  ROAD_HALF + 2.2],
    [-ROAD_HALF - 2.2,  12], [ ROAD_HALF + 2.2, -12],
  ];
  spots.forEach(([x, z]) => {
    const g = new THREE.Group(); g.position.set(x, SIDEWALK_H, z); furnitureGrp.add(g);
    mkCyl(0.22, 0.26, 0.85, 10, M.metalDk, g, 0, 0.425, 0);
    mkCyl(0.24, 0.24, 0.06, 10, M.metal,   g, 0, 0.88,  0);
    mkCyl(0.05, 0.05, 0.90, 6,  M.lampPost, g, 0.28, 0.45, 0);
  });
}

function placeBenches() {
  const spots = [
    { x: -ROAD_HALF - 3.5, z: -18, ry: Math.PI / 2 },
    { x:  ROAD_HALF + 3.5, z:  18, ry: Math.PI / 2 },
    { x:  18, z: -ROAD_HALF - 3.5, ry: 0 },
    { x: -18, z:  ROAD_HALF + 3.5, ry: 0 },
  ];
  spots.forEach(p => {
    const g = new THREE.Group(); g.position.set(p.x, SIDEWALK_H, p.z); g.rotation.y = p.ry; furnitureGrp.add(g);
    mkBox(1.80, 0.07, 0.46, M.concreteL, g, 0, 0.44, 0);   // 座面
    mkBox(1.80, 0.46, 0.06, M.concreteL, g, 0, 0.58, -0.20); // 背もたれ
    [-0.72, 0.72].forEach(lx => mkBox(0.08, 0.44, 0.44, M.metal, g, lx, 0.22, 0));
  });
}

function placeTrees() {
  const spots = [
    [-ROAD_HALF - 4.5, -32], [ ROAD_HALF + 4.5, -32],
    [-ROAD_HALF - 4.5,  32], [ ROAD_HALF + 4.5,  32],
    [-32, -ROAD_HALF - 4.5], [-32,  ROAD_HALF + 4.5],
    [ 32, -ROAD_HALF - 4.5], [ 32,  ROAD_HALF + 4.5],
    [-ROAD_HALF - 4.5,  0 ], [ ROAD_HALF + 4.5,  0 ],
    [  0, -ROAD_HALF - 4.5], [  0,  ROAD_HALF + 4.5],
  ];
  spots.forEach(([x, z]) => {
    const g = new THREE.Group(); g.position.set(x, SIDEWALK_H, z); furnitureGrp.add(g);
    // 植栽枠
    mkBox(1.6, 0.22, 1.6, M.concrete, g, 0, 0.11, 0);
    mkPlane(1.4, 1.4, M.soil, g, 0, 0.23, 0, -Math.PI / 2);
    // 幹
    mkCyl(0.10, 0.14, 3.5, 7, M.trunk, g, 0, 1.97, 0);
    // 樹冠 (複数球)
    [[0, 4.6, 0, 1.5], [-0.6, 4.0, 0.5, 1.1], [0.7, 4.2, -0.4, 1.2],
     [0, 5.5, 0, 1.0], [-0.4, 5.1, -0.6, 0.9]].forEach(([fx, fy, fz, r]) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), M.foliage);
      m.position.set(fx, fy, fz); m.castShadow = true; g.add(m);
    });
  });
}

function placeGuardrails() {
  const railMat = M.chrome;
  function makeRail(x1, z1, x2, z2) {
    const dx = x2 - x1, dz = z2 - z1;
    const len = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dx, dz);
    const g = new THREE.Group();
    g.position.set((x1 + x2) / 2, SIDEWALK_H + 0.55, (z1 + z2) / 2);
    g.rotation.y = angle;
    furnitureGrp.add(g);
    mkBox(len, 0.06, 0.04, railMat, g, 0, 0, 0);
    mkBox(len, 0.06, 0.04, railMat, g, 0, -0.22, 0);
    const posts = Math.round(len / 1.8);
    for (let i = 0; i <= posts; i++) {
      mkBox(0.04, 0.50, 0.04, railMat, g, -len / 2 + i * (len / posts), -0.25, 0);
    }
  }

  const R = ROAD_HALF + 0.3;
  // 横断歩道脇の歩行者柵
  makeRail(-R, -(R + 1.0), -R, -(R + 6.0));
  makeRail( R, -(R + 1.0),  R, -(R + 6.0));
  makeRail(-R,  (R + 1.0), -R,  (R + 6.0));
  makeRail( R,  (R + 1.0),  R,  (R + 6.0));
  makeRail(-(R + 1.0), -R, -(R + 6.0), -R);
  makeRail( (R + 1.0), -R,  (R + 6.0), -R);
  makeRail(-(R + 1.0),  R, -(R + 6.0),  R);
  makeRail( (R + 1.0),  R,  (R + 6.0),  R);
}

function placeBillboards() {
  // 大型広告ビルボード
  [
    { x:  BLDG_OFFSET + 6, y: 20, z: -(BLDG_OFFSET + 3), ry: 0,         col: M.neonR, w: 10, h: 5.5 },
    { x: -(BLDG_OFFSET + 6), y: 18, z: -(BLDG_OFFSET + 3), ry: Math.PI, col: M.neonB, w:  9, h: 4.8 },
    { x:  BLDG_OFFSET + 5, y: 24, z:  (BLDG_OFFSET + 3), ry: Math.PI,  col: M.neonG, w: 11, h: 6.0 },
    { x: -(BLDG_OFFSET + 5), y: 22, z:  (BLDG_OFFSET + 3), ry: 0,        col: M.neonO, w:  8, h: 5.2 },
  ].forEach(b => {
    const g = new THREE.Group(); g.position.set(b.x, b.y, b.z); g.rotation.y = b.ry; furnitureGrp.add(g);
    mkBox(b.w, b.h, 0.24, M.bldgA, g, 0, 0, 0);
    mkBox(b.w - 0.3, b.h - 0.3, 0.05, b.col, g, 0, 0, 0.145);
    // サポート
    [-b.w * 0.35, b.w * 0.35].forEach(px => {
      mkBox(0.14, 4.5, 0.14, M.lampPost, g, px, -b.h / 2 - 2.25, 0);
    });
  });
}

function placeOverheadSigns() {
  // 道路上空の案内標識
  function overheadSign(x, z, ry) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; furnitureGrp.add(g);
    const postH = 8.2;
    [-ROAD_HALF * 0.82, ROAD_HALF * 0.82].forEach(px => {
      mkCyl(0.08, 0.10, postH, 8, M.lampPost, g, px, postH / 2, 0);
    });
    // 横梁
    mkBox(ROAD_HALF * 2 * 0.82 * 2, 0.22, 0.22, M.lampPost, g, 0, postH, 0);
    // 標識パネル
    mkBox(ROAD_HALF * 1.4, 1.5, 0.08, M.signGreen, g, -ROAD_HALF * 0.38, postH + 0.85, 0);
    mkBox(ROAD_HALF * 0.80, 1.3, 0.08, M.signGreen, g,  ROAD_HALF * 0.55, postH + 0.85, 0);
    // 白い文字帯
    mkBox(ROAD_HALF * 1.3, 0.15, 0.05, M.signWhite, g, -ROAD_HALF * 0.38, postH + 0.75, 0.045);
    mkBox(ROAD_HALF * 1.3, 0.15, 0.05, M.signWhite, g, -ROAD_HALF * 0.38, postH + 0.95, 0.045);
  }
  overheadSign(0, -(ROAD_LEN * 0.62), 0);
  overheadSign(0,  (ROAD_LEN * 0.62), Math.PI);
  overheadSign(-(ROAD_LEN * 0.62), 0, Math.PI / 2);
  overheadSign( (ROAD_LEN * 0.62), 0, -Math.PI / 2);
}

function placeManholeCover() {
  // マンホール蓋 (道路上に点在)
  const spots = [[0,0],[-5,-5],[5,8],[-8,4],[6,-6],[0,-10],[10,0],[-6,9]];
  spots.forEach(([x, z]) => {
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.44, 16), M.metalDk);
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.014, z); roadGrp.add(m);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.38, 0.44, 16), M.metal);
    ring.rotation.x = -Math.PI / 2; ring.position.set(x, 0.015, z); roadGrp.add(ring);
  });
}

// ─────────────────────────────────────────────────────────────────
//  §11  車両システム — VEHICLE SYSTEM
// ─────────────────────────────────────────────────────────────────

const vehicles = [];
const vehicleGrp = new THREE.Group(); worldGrp.add(vehicleGrp);

// 走行ルート定義 — [方向, 車線オフセット, 開始Z/X, 終了Z/X]
// 方向: 'N'=北向き, 'S'=南向き, 'E'=東向き, 'W'=西向き
const LANES = [
  { dir: 'N', laneX:  LANE_W * 0.5,            startZ:  ROAD_LEN, endZ: -ROAD_LEN },
  { dir: 'N', laneX:  LANE_W * 1.5,            startZ:  ROAD_LEN, endZ: -ROAD_LEN },
  { dir: 'S', laneX: -LANE_W * 0.5,            startZ: -ROAD_LEN, endZ:  ROAD_LEN },
  { dir: 'S', laneX: -LANE_W * 1.5,            startZ: -ROAD_LEN, endZ:  ROAD_LEN },
  { dir: 'E', laneZ: -LANE_W * 0.5,            startX: -ROAD_LEN, endX:  ROAD_LEN },
  { dir: 'E', laneZ: -LANE_W * 1.5,            startX: -ROAD_LEN, endX:  ROAD_LEN },
  { dir: 'W', laneZ:  LANE_W * 0.5,            startX:  ROAD_LEN, endX: -ROAD_LEN },
  { dir: 'W', laneZ:  LANE_W * 1.5,            startX:  ROAD_LEN, endX: -ROAD_LEN },
];

const CAR_BODIES = [M.carBlk, M.carWht, M.carSlv, M.carRed, M.carBlu, M.taxi];
const VEH_TYPES = ['sedan', 'sedan', 'sedan', 'taxi', 'bus', 'truck'];

function buildCarMesh(type) {
  const g = new THREE.Group();
  const bodyMat = type === 'taxi' ? M.taxi : type === 'bus' ? M.bus : type === 'truck' ? M.truck : pick(CAR_BODIES);

  if (type === 'bus') {
    mkBox(2.5, 2.0, 9.5, bodyMat, g, 0, 1.02, 0);
    mkBox(2.3, 1.5, 9.3, M.glassDk, g, 0, 1.20, 0.01);
    for (let i = -3.8; i <= 3.8; i += 1.5) {
      mkBox(0.8, 0.7, 0.06, M.glassDk, g, 1.26, 1.4, i);
      mkBox(0.8, 0.7, 0.06, M.glassDk, g, -1.26, 1.4, i);
    }
    [[-1.0, 0, -4.6], [1.0, 0, -4.6], [-1.0, 0, 4.6], [1.0, 0, 4.6]].forEach(([wx, wy, wz]) => {
      mkCyl(0.38, 0.38, 0.24, 10, M.rubber, g, wx, 0.38, wz).rotation.z = Math.PI / 2;
      mkCyl(0.28, 0.28, 0.25, 10, M.rim,    g, wx, 0.38, wz).rotation.z = Math.PI / 2;
    });
    return g;
  }

  if (type === 'truck') {
    mkBox(2.4, 1.6, 3.0, bodyMat,  g, 0, 0.82, -2.8);  // キャブ
    mkBox(2.4, 2.2, 6.5, M.metalDk, g, 0, 1.10,  1.6);  // 荷台
    [[-1.05, 0, -3.8], [1.05, 0, -3.8],
     [-1.05, 0,  0.2], [1.05, 0,  0.2],
     [-1.05, 0,  2.8], [1.05, 0,  2.8]].forEach(([wx, wy, wz]) => {
      mkCyl(0.40, 0.40, 0.28, 10, M.rubber, g, wx, 0.40, wz).rotation.z = Math.PI / 2;
      mkCyl(0.28, 0.28, 0.29, 10, M.rim,    g, wx, 0.40, wz).rotation.z = Math.PI / 2;
    });
    return g;
  }

  // セダン / タクシー
  const len = 4.5;
  mkBox(1.9, 0.72, len, bodyMat, g, 0, 0.36, 0);  // 下ボディ
  mkBox(1.72, 0.62, len * 0.56, bodyMat, g, 0, 0.98, -0.12); // 上ボディ
  mkBox(1.62, 0.52, len * 0.50, M.glassDk, g, 0, 0.98, -0.12); // ウィンドウ
  // ヘッドライト
  [[-0.70, 0.36, -(len / 2 + 0.02)], [0.70, 0.36, -(len / 2 + 0.02)]].forEach(([lx, ly, lz]) => {
    const hl = new THREE.Mesh(new THREE.CircleGeometry(0.18, 10), M.lampGlow);
    hl.rotation.x = Math.PI / 2; hl.rotation.z = Math.PI / 2;
    hl.position.set(lx, ly, lz); g.add(hl);
  });
  // テールライト
  [[-0.70, 0.36, len / 2 + 0.02], [0.70, 0.36, len / 2 + 0.02]].forEach(([lx, ly, lz]) => {
    const tl = new THREE.Mesh(new THREE.CircleGeometry(0.15, 8), M.neonR);
    tl.rotation.x = Math.PI / 2; tl.rotation.z = -Math.PI / 2;
    tl.position.set(lx, ly, lz); g.add(tl);
  });
  // タクシー行灯
  if (type === 'taxi') {
    mkBox(0.55, 0.22, 0.28, M.neonY, g, 0, 1.35, 0);
  }
  // ホイール
  [[-0.92, 0, -1.35], [0.92, 0, -1.35], [-0.92, 0, 1.35], [0.92, 0, 1.35]].forEach(([wx, wy, wz]) => {
    mkCyl(0.32, 0.32, 0.22, 10, M.rubber, g, wx, 0.32, wz).rotation.z = Math.PI / 2;
    mkCyl(0.22, 0.22, 0.23, 10, M.rim,    g, wx, 0.32, wz).rotation.z = Math.PI / 2;
  });
  return g;
}

function spawnVehicle() {
  if (vehicles.length >= MAX_VEHICLES) return;
  const lane = pick(LANES);
  const type = pick(VEH_TYPES);
  const mesh = buildCarMesh(type);
  vehicleGrp.add(mesh);

  const isNS = (lane.dir === 'N' || lane.dir === 'S');
  const speed = VEH_SPEED * rnd(0.78, 1.18);

  const veh = {
    mesh, lane, type, speed,
    pos: lane.dir === 'N' || lane.dir === 'S' ? lane.startZ : lane.startX,
    waiting: false,
    waitTimer: 0,
    passed: false,
  };

  // 向き回転
  if (lane.dir === 'N') mesh.rotation.y = Math.PI;
  if (lane.dir === 'S') mesh.rotation.y = 0;
  if (lane.dir === 'E') mesh.rotation.y = Math.PI / 2;
  if (lane.dir === 'W') mesh.rotation.y = -Math.PI / 2;

  vehicles.push(veh);
}

function canVehicleGo(lane) {
  const ns = (lane.dir === 'N' || lane.dir === 'S');
  if (signalPhase === PH.NS_GREEN)  return ns;
  if (signalPhase === PH.EW_GREEN)  return !ns;
  if (signalPhase === PH.NS_YELLOW) return ns;
  if (signalPhase === PH.EW_YELLOW) return !ns;
  return false;  // ALL_RED, SCRAMBLE
}

function updateVehicles(dt) {
  // スポーン
  if (Math.random() < dt * 1.4) spawnVehicle();

  vehicles.forEach((veh, idx) => {
    const ns = (veh.lane.dir === 'N' || veh.lane.dir === 'S');
    const dir = (veh.lane.dir === 'N' || veh.lane.dir === 'E') ? -1 : 1;

    // 停止線チェック
    const stopLine = VEH_STOP_LINE;
    const atLine = ns
      ? (veh.lane.dir === 'N' ? Math.abs(veh.pos - (-stopLine)) < 3 : Math.abs(veh.pos - stopLine) < 3)
      : (veh.lane.dir === 'E' ? Math.abs(veh.pos - (-stopLine)) < 3 : Math.abs(veh.pos - stopLine) < 3);

    // 先行車追従
    let minDist = Infinity;
    vehicles.forEach((other, oi) => {
      if (oi === idx || other.lane !== veh.lane) return;
      const gap = (other.pos - veh.pos) * dir * -1;
      if (gap > 0 && gap < minDist) minDist = gap;
    });

    const tooClose = minDist < 7.5;
    const mustStop = atLine && !canVehicleGo(veh.lane);
    const shouldSlow = mustStop || tooClose;

    if (shouldSlow) {
      veh.speed = Math.max(0, veh.speed - VEH_DECEL * dt);
    } else {
      veh.speed = Math.min(VEH_SPEED * rnd(0.85, 1.12), veh.speed + VEH_ACCEL * dt);
    }

    veh.pos += dir * veh.speed * dt;

    // 位置反映
    const lx = ns ? veh.lane.laneX : veh.pos;
    const lz = ns ? veh.pos : veh.lane.laneZ;
    veh.mesh.position.set(lx, 0, lz);

    // 範囲外で除去
    const limit = ROAD_LEN + 12;
    if (Math.abs(veh.pos) > limit) {
      vehicleGrp.remove(veh.mesh);
      vehicles.splice(idx, 1);
    }
  });
}

// ─────────────────────────────────────────────────────────────────
//  §12  歩行者システム — PEDESTRIAN SYSTEM
// ─────────────────────────────────────────────────────────────────

const pedestrians = [];
const pedGrp = new THREE.Group(); worldGrp.add(pedGrp);

// 歩行者メッシュ (シンプルカプセル人形)
function buildPedMesh() {
  const g = new THREE.Group();
  const bodyCol = new THREE.MeshStandardMaterial({
    color: new THREE.Color(rnd(0.05, 0.25), rnd(0.05, 0.25), rnd(0.05, 0.35)),
    roughness: 0.85,
  });
  const skinTone = [0xc8905a, 0xf0c8a0, 0x8a5a38, 0xe8b888];
  const skinMat = new THREE.MeshStandardMaterial({ color: pick(skinTone), roughness: 0.9 });

  // 胴体
  mkBox(0.30, 0.52, 0.20, bodyCol, g, 0, 1.06, 0);
  // 脚
  mkBox(0.12, 0.48, 0.15, bodyCol, g, -0.10, 0.54, 0);
  mkBox(0.12, 0.48, 0.15, bodyCol, g,  0.10, 0.54, 0);
  // 頭
  mkCyl(0.13, 0.13, 0.28, 8, skinMat, g, 0, 1.50, 0);
  // 腕
  mkBox(0.10, 0.38, 0.10, bodyCol, g, -0.22, 1.02, 0);
  mkBox(0.10, 0.38, 0.10, bodyCol, g,  0.22, 1.02, 0);

  // ランダム傘
  if (Math.random() < 0.18) {
    const umbrellaCol = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(Math.random(), 0.7, 0.5) });
    mkCyl(0.80, 0.80, 0.06, 12, umbrellaCol, g, 0.3, 1.95, 0);
    mkCyl(0.02, 0.02, 1.10, 5, M.metal, g, 0.3, 1.40, 0);
  }
  g.scale.set(rnd(0.85, 1.05), rnd(0.92, 1.08), rnd(0.85, 1.05));
  return g;
}

// 歩行者スポーン地点 (歩道上、交差点の4隅付近)
const PED_SPAWN_ZONES = [
  // [xMin, xMax, zMin, zMax, dir] dir=横断方向
  { x1: -(ROAD_HALF + SIDEWALK_W), x2: -ROAD_HALF - 0.5, z1: -(ROAD_HALF + 8), z2: -(ROAD_HALF + 2), dir: 'E' },
  { x1:  ROAD_HALF + 0.5,  x2: ROAD_HALF + SIDEWALK_W,   z1: -(ROAD_HALF + 8), z2: -(ROAD_HALF + 2), dir: 'W' },
  { x1: -(ROAD_HALF + SIDEWALK_W), x2: -ROAD_HALF - 0.5, z1:  ROAD_HALF + 2,   z2:  ROAD_HALF + 8,   dir: 'E' },
  { x1:  ROAD_HALF + 0.5,  x2: ROAD_HALF + SIDEWALK_W,   z1:  ROAD_HALF + 2,   z2:  ROAD_HALF + 8,   dir: 'W' },
  { x1: -(ROAD_HALF + 8),  x2: -(ROAD_HALF + 2),          z1: -(ROAD_HALF + SIDEWALK_W), z2: -ROAD_HALF - 0.5, dir: 'S' },
  { x1:  ROAD_HALF + 2,    x2:  ROAD_HALF + 8,            z1: -(ROAD_HALF + SIDEWALK_W), z2: -ROAD_HALF - 0.5, dir: 'N' },
  { x1: -(ROAD_HALF + 8),  x2: -(ROAD_HALF + 2),          z1:  ROAD_HALF + 0.5,          z2:  ROAD_HALF + SIDEWALK_W, dir: 'S' },
  { x1:  ROAD_HALF + 2,    x2:  ROAD_HALF + 8,            z1:  ROAD_HALF + 0.5,          z2:  ROAD_HALF + SIDEWALK_W, dir: 'N' },
];

function spawnPedestrian(forceScramble = false) {
  if (pedestrians.length >= PED_MAX) return;
  const zone = pick(PED_SPAWN_ZONES);
  const mesh = buildPedMesh();
  pedGrp.add(mesh);

  const startX = rnd(zone.x1, zone.x2);
  const startZ = rnd(zone.z1, zone.z2);
  mesh.position.set(startX, SIDEWALK_H, startZ);

  // 向き
  const angles = { N: 0, S: Math.PI, E: Math.PI / 2, W: -Math.PI / 2 };
  mesh.rotation.y = angles[zone.dir] + rnd(-0.2, 0.2);

  const scramble = forceScramble || signalPhase === PH.SCRAMBLE;

  pedestrians.push({
    mesh,
    zone,
    x: startX,
    z: startZ,
    dir: zone.dir,
    speed: scramble ? PED_RUSH_SPEED * rnd(0.8, 1.2) : PED_WALK_SPEED * rnd(0.7, 1.15),
    state: scramble ? 'crossing' : 'waiting',
    waitTimer: scramble ? rnd(0, 2.0) : rnd(2, 12),
    legPhase: Math.random() * Math.PI * 2,
    stepAmp: rnd(0.06, 0.12),
    done: false,
  });
}

function updatePedestrians(dt) {
  if (Math.random() < dt * 1.8) spawnPedestrian();

  pedestrians.forEach((p, idx) => {
    if (p.done) return;
    p.legPhase += dt * (p.state === 'crossing' ? 6.5 : 3.5);

    if (p.state === 'waiting') {
      // スクランブル時 or 信号に応じて待機解除
      const ns = (p.dir === 'N' || p.dir === 'S');
      const pedWalk =
        signalPhase === PH.SCRAMBLE ||
        (signalPhase === PH.NS_GREEN && !ns) ||
        (signalPhase === PH.EW_GREEN && ns);
      if (pedWalk) {
        p.waitTimer -= dt;
        if (p.waitTimer <= 0) {
          p.state = 'crossing';
          p.speed = (signalPhase === PH.SCRAMBLE ? PED_RUSH_SPEED : PED_WALK_SPEED) * rnd(0.75, 1.2);
        }
      }
      // わずかに揺れる (待機アニメ)
      p.mesh.position.y = SIDEWALK_H + Math.abs(Math.sin(p.legPhase * 0.4)) * 0.02;
      return;
    }

    // 歩行
    const step = p.speed * dt;
    if (p.dir === 'N') p.z -= step;
    if (p.dir === 'S') p.z += step;
    if (p.dir === 'E') p.x += step;
    if (p.dir === 'W') p.x -= step;

    p.mesh.position.set(p.x, SIDEWALK_H + Math.abs(Math.sin(p.legPhase)) * p.stepAmp, p.z);

    // 足踏みアニメ (脚揺らし)
    const legSwing = Math.sin(p.legPhase) * 0.18;
    if (p.mesh.children[1]) p.mesh.children[1].rotation.x =  legSwing;
    if (p.mesh.children[2]) p.mesh.children[2].rotation.x = -legSwing;

    // 端に到達で削除
    const limit = ROAD_HALF + SIDEWALK_W + 6;
    if (Math.abs(p.x) > limit || Math.abs(p.z) > limit) {
      pedGrp.remove(p.mesh);
      pedestrians.splice(idx, 1);
    }
  });
}

// ─────────────────────────────────────────────────────────────────
//  §13  プレイヤー制御 — PLAYER CONTROL
// ─────────────────────────────────────────────────────────────────

const player = {
  x: ROAD_HALF + 3.5, y: SIDEWALK_H + 0.9, z: ROAD_HALF + 3.5,
  speed: 5.2, rotY: -Math.PI * 0.75,
  mesh: null,
};

function buildPlayerMesh() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a44aa, roughness: 0.75 });
  mkBox(0.34, 0.56, 0.22, bodyMat, g, 0, 0.28, 0);
  mkBox(0.14, 0.50, 0.16, bodyMat, g, -0.11, -0.25, 0);
  mkBox(0.14, 0.50, 0.16, bodyMat, g,  0.11, -0.25, 0);
  mkCyl(0.14, 0.14, 0.30, 8, M.pedHead, g, 0, 0.72, 0);
  g.scale.set(1.1, 1.1, 1.1);
  return g;
}

const keys = {};
window.addEventListener('keydown', e => { keys[e.code] = true; });
window.addEventListener('keyup',   e => { keys[e.code] = false; });

// カメラモード
let camMode = 0;   // 0=追従, 1=俯瞰固定, 2=自由
const CAM_MODES = ['FOLLOW', 'BIRD', 'FREE'];

camBtnEl.addEventListener('click', () => {
  camMode = (camMode + 1) % 3;
  camBtnEl.textContent = 'CAM: ' + CAM_MODES[camMode];
  document.getElementById('iv-cam').textContent = CAM_MODES[camMode];
});

window.addEventListener('keydown', e => {
  if (e.code === 'KeyQ') { camMode = (camMode + 3 - 1) % 3; updateCamButton(); }
  if (e.code === 'KeyE') { camMode = (camMode + 1) % 3; updateCamButton(); }
});
function updateCamButton() {
  camBtnEl.textContent = 'CAM: ' + CAM_MODES[camMode];
  document.getElementById('iv-cam').textContent = CAM_MODES[camMode];
}

// マウスドラッグ (自由視点)
let freeCam = { phi: 0.8, theta: 0.2, radius: 52, dragging: false, lastX: 0, lastY: 0 };
renderer.domElement.addEventListener('mousedown', e => { freeCam.dragging = true; freeCam.lastX = e.clientX; freeCam.lastY = e.clientY; });
window.addEventListener('mouseup', () => { freeCam.dragging = false; });
window.addEventListener('mousemove', e => {
  if (!freeCam.dragging || camMode !== 2) return;
  freeCam.theta -= (e.clientX - freeCam.lastX) * 0.005;
  freeCam.phi   = Math.max(0.12, Math.min(Math.PI / 2 - 0.05, freeCam.phi - (e.clientY - freeCam.lastY) * 0.005));
  freeCam.lastX = e.clientX; freeCam.lastY = e.clientY;
});
renderer.domElement.addEventListener('wheel', e => {
  if (camMode === 2) freeCam.radius = Math.max(10, Math.min(150, freeCam.radius + e.deltaY * 0.08));
});

function updatePlayer(dt) {
  const spd = player.speed * dt;
  let moved = false;

  if (keys['KeyW'] || keys['ArrowUp'])    { player.z -= Math.cos(player.rotY) * spd; player.x -= Math.sin(player.rotY) * spd; moved = true; }
  if (keys['KeyS'] || keys['ArrowDown'])  { player.z += Math.cos(player.rotY) * spd; player.x += Math.sin(player.rotY) * spd; moved = true; }
  if (keys['KeyA'] || keys['ArrowLeft'])  { player.rotY += 1.8 * dt; }
  if (keys['KeyD'] || keys['ArrowRight']) { player.rotY -= 1.8 * dt; }

  if (player.mesh) {
    player.mesh.position.set(player.x, player.y, player.z);
    player.mesh.rotation.y = player.rotY;
  }

  // 車との接触判定
  vehicles.forEach(v => {
    const dx = v.mesh.position.x - player.x;
    const dz = v.mesh.position.z - player.z;
    if (Math.sqrt(dx * dx + dz * dz) < 2.2) {
      dmgFlash.style.background = 'rgba(255,0,0,0.52)';
      setTimeout(() => { dmgFlash.style.background = 'rgba(255,0,0,0)'; }, 90);
    }
  });
}

function updateCamera(dt) {
  if (camMode === 0) {
    // 追従カメラ
    const behind = 12, above = 8;
    const tx = player.x + Math.sin(player.rotY) * behind;
    const tz = player.z + Math.cos(player.rotY) * behind;
    camera.position.lerp(new THREE.Vector3(tx, player.y + above, tz), 6.5 * dt);
    camera.lookAt(player.x, player.y + 0.5, player.z);
  } else if (camMode === 1) {
    // 俯瞰固定
    camera.position.lerp(new THREE.Vector3(0, 72, 28), 3.5 * dt);
    camera.lookAt(0, 0, 0);
  } else {
    // 自由視点 (球座標)
    const cx = freeCam.radius * Math.sin(freeCam.phi) * Math.sin(freeCam.theta);
    const cy = freeCam.radius * Math.cos(freeCam.phi);
    const cz = freeCam.radius * Math.sin(freeCam.phi) * Math.cos(freeCam.theta);
    camera.position.set(cx, cy, cz);
    camera.lookAt(0, 2, 0);
  }
}

// ─────────────────────────────────────────────────────────────────
//  §14  HUD更新 — HUD UPDATE
// ─────────────────────────────────────────────────────────────────

const PHASE_NAMES = {
  [PH.NS_GREEN]:  'N-S GREEN',
  [PH.NS_YELLOW]: 'N-S YELLOW',
  [PH.EW_GREEN]:  'E-W GREEN',
  [PH.EW_YELLOW]: 'E-W YELLOW',
  [PH.ALL_RED]:   'ALL RED',
  [PH.SCRAMBLE]:  'SCRAMBLE !!',
};
const PHASE_COLORS = {
  [PH.NS_GREEN]:  '#00ee44',
  [PH.NS_YELLOW]: '#ffcc00',
  [PH.EW_GREEN]:  '#00ee44',
  [PH.EW_YELLOW]: '#ffcc00',
  [PH.ALL_RED]:   '#ff2200',
  [PH.SCRAMBLE]:  '#00c4ff',
};

function updateHUD() {
  document.getElementById('phase-name').textContent  = PHASE_NAMES[signalPhase] || '---';
  document.getElementById('phase-name').style.color  = PHASE_COLORS[signalPhase] || '#fff';
  document.getElementById('iv-veh').textContent  = vehicles.length;
  document.getElementById('iv-ped').textContent  = pedestrians.length;
  document.getElementById('iv-cyc').textContent  = signalCycle;
}

// ─────────────────────────────────────────────────────────────────
//  §15  ネオン点滅アニメ — NEON FLICKER
// ─────────────────────────────────────────────────────────────────

let neonFlickerT = 0;
const NEON_PL_BASE = [3.0, 2.5, 2.8, 2.2];

function updateNeonFlicker(dt) {
  neonFlickerT += dt;
  neonPLights.forEach((pl, i) => {
    const base = NEON_PL_BASE[i] || 2.0;
    const flicker = Math.sin(neonFlickerT * (3.5 + i * 1.2)) * 0.18 +
                    Math.sin(neonFlickerT * (11.0 + i * 2.4)) * 0.08;
    pl.intensity = Math.max(0.4, base + flicker);
  });

  // 交差点フィルの搖動
  isectFill.intensity = 1.4 + Math.sin(neonFlickerT * 0.9) * 0.22;
}

// ─────────────────────────────────────────────────────────────────
//  §16  LOD / カリング補助 — SIMPLE PERFORMANCE
// ─────────────────────────────────────────────────────────────────

function updateLOD() {
  // 遠方の背景ビルはシャドウを無効化
  bldgGrp.children.forEach(grp => {
    const dist = grp.position.distanceTo(camera.position);
    grp.traverse(o => {
      if (o.isMesh) {
        o.castShadow    = dist < 80;
        o.receiveShadow = dist < 100;
      }
    });
  });
}

// ─────────────────────────────────────────────────────────────────
//  §17  初期化 — INITIALIZATION
// ─────────────────────────────────────────────────────────────────

function init() {
  // 交差点
  buildIntersection();

  // 信号機
  placeAllSignals();
  applySignalPhase(signalPhase);

  // 建物
  buildTsutayaCorner();
  buildQPlaza();
  buildMagnetBuilding();
  buildSWCornerBlock();
  buildBackgroundBuildings();

  // 街路家具
  buildStreetFurniture();

  // プレイヤーメッシュ
  player.mesh = buildPlayerMesh();
  player.mesh.position.set(player.x, player.y, player.z);
  player.mesh.rotation.y = player.rotY;
  worldGrp.add(player.mesh);

  // 初期車両
  for (let i = 0; i < 10; i++) spawnVehicle();

  // 初期歩行者
  for (let i = 0; i < 38; i++) spawnPedestrian();

  updateHUD();
}

// ─────────────────────────────────────────────────────────────────
//  §18  メインループ — MAIN LOOP
// ─────────────────────────────────────────────────────────────────

const clock = new THREE.Clock();
let frameCount = 0;

function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.05);  // 最大 50ms でクリップ
  frameCount++;

  // サブシステム更新
  updateSignals(dt);
  updateVehicles(dt);
  updatePedestrians(dt);
  updatePlayer(dt);
  updateCamera(dt);
  updateNeonFlicker(dt);

  // HUD 毎10フレーム
  if (frameCount % 10 === 0) updateHUD();

  // LOD 毎60フレーム
  if (frameCount % 60 === 0) updateLOD();

  // フェーズタイマー表示
  document.getElementById('phase-timer').textContent =
    Math.ceil(signalTimer).toString().padStart(2, '0') + 's';

  renderer.render(scene, camera);
}

// ─── 起動 ──────────────────────────────────────────────────────
init();
animate();
