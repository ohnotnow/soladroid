const canvas = document.querySelector('#gameCanvas');
const ctx = canvas.getContext('2d');
const transferCanvas = document.querySelector('#transferCanvas');
const tx = transferCanvas.getContext('2d');
const radarCanvas = document.querySelector('#radarCanvas');
const rx = radarCanvas.getContext('2d');

const ui = Object.fromEntries(
  [
    'startScreen', 'startButton', 'hudDroid', 'hudName', 'hudEnergyText', 'hudEnergyBar',
    'hudDeck', 'hudHostiles', 'hudScore', 'objective', 'prompt', 'toast', 'terminal',
    'terminalTitle', 'terminalBody', 'terminalFile', 'terminalClock', 'transfer', 'transferTitle',
    'transferPlayer', 'transferEnemy', 'pauseScreen', 'resumeButton', 'soundButton',
    'endScreen', 'endEyebrow', 'endTitle', 'endMessage', 'endScore', 'endHighScore',
    'restartButton', 'radar', 'radarStatus', 'tutorial', 'tutorialStep', 'tutorialTitle',
    'tutorialBody', 'tutorialProgress', 'dossier', 'dossierCurrentId', 'dossierCurrentName',
    'dossierCurrentRole', 'dossierCurrentWeapon', 'dossierTargetId', 'dossierTargetName',
    'dossierTargetRole', 'dossierTargetWeapon', 'dossierStats', 'dossierStrength',
    'dossierWeakness', 'dossierRecommendation'
  ].map((id) => [id, document.querySelector(`#${id}`)])
);

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const TAU = Math.PI * 2;
const keys = new Set();
const pressed = new Set();

const DROID_TYPES = {
  '001': { name: 'INFLUENCE', role: 'INFILTRATOR', weapon: 'TWIN NEEDLE LASER', maxHp: 66, speed: 238, fireRate: .22, damage: 12, radius: 22, accent: '#f4d66f', rank: 1, decay: .06, ratings: [8, 2, 3, 7, 10], strength: 'Agile and exceptionally stable.', weakness: 'Almost no protection under sustained fire.' },
  '123': { name: 'SCOUT', role: 'RECON CHASSIS', weapon: 'PULSE REPEATER', maxHp: 58, speed: 270, fireRate: .18, damage: 7, radius: 25, accent: '#74d4c3', rank: 2, decay: .07, ratings: [10, 1, 1, 10, 9], strength: 'Fastest chassis; excellent firing cycle.', weakness: 'Fragile with very low shot impact.' },
  '247': { name: 'ENGINEER', role: 'HEAVY UTILITY', weapon: 'INDUSTRIAL CUTTER', maxHp: 112, speed: 148, fireRate: .72, damage: 24, radius: 29, accent: '#d49b59', rank: 3, decay: .1, ratings: [3, 5, 8, 2, 8], strength: 'Heavy cutter hits hard; solid shell.', weakness: 'Slow movement and a long recharge cycle.' },
  '420': { name: 'SECURITY', role: 'DECK ENFORCER', weapon: 'SECURITY LASER', maxHp: 142, speed: 172, fireRate: .42, damage: 16, radius: 31, accent: '#e76e58', rank: 4, decay: .13, ratings: [6, 7, 6, 6, 7], strength: 'Reliable all-round combat platform.', weakness: 'Competent at everything; exceptional at nothing.' },
  '711': { name: 'BATTLE', role: 'RAPID ASSAULT', weapon: 'ARC DISRUPTOR', maxHp: 188, speed: 225, fireRate: .16, damage: 8, radius: 35, accent: '#b4ce72', rank: 6, decay: .18, ratings: [9, 8, 2, 10, 4], strength: 'Fast, armoured, and ferocious at close range.', weakness: 'Low impact per shot; control link degrades quickly.' },
  '999': { name: 'COMMAND', role: 'SIEGE CYBORG', weapon: 'COMMAND CANNON', maxHp: 290, speed: 122, fireRate: .65, damage: 32, radius: 42, accent: '#e44f64', rank: 8, decay: .26, ratings: [2, 10, 10, 3, 1], strength: 'Maximum armour and devastating firepower.', weakness: 'Very slow and catastrophically unstable.' }
};

const RATING_LABELS = ['MOBILITY', 'ARMOUR', 'IMPACT', 'FIRE CYCLE', 'STABILITY'];

const TRANSFER_ROUTES = [
  [0, 1, 2],
  [0, 3, 6],
  [3, 4, 5],
  [2, 5, 8],
  [6, 7, 8]
];
const TRANSFER_CORE_LABELS = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3'];

const COMBAT_TUNING = [
  { cadence: 4.2, spread: .38, bulletSpeed: 275, damage: .35, windup: .68, pickup: .72, killHeal: .12, aimCone: 2.05 },
  { cadence: 3.8, spread: .34, bulletSpeed: 300, damage: .5, windup: .6, pickup: .6, killHeal: .1, aimCone: 1.8 },
  { cadence: 3.3, spread: .29, bulletSpeed: 335, damage: .7, windup: .5, pickup: .5, killHeal: .08, aimCone: 1.5 }
];

const LIGHT_COLORS = {
  red: [255, 67, 43], amber: [255, 177, 61], cool: [151, 213, 203]
};

const DECKS = [
  {
    id: '01', name: 'SERVICE RING', tone: '#28332c', start: [180, 720], lift: [2100, 700], terminal: [330, 245], emergency: .82, shadow: .15,
    lights: [[260, 700, 'red', 0], [830, 250, 'amber', 1.2], [1260, 700, 'red', 2.4], [1730, 250, 'red', .7], [1880, 1100, 'amber', 1.8]],
    log: [
      'SHIP CLOCK 04:19:33 // AUTOMATED ENTRY',
      'The maintenance network accepted an unsigned command packet at 03:52. Within eleven minutes, every service droid had left its assigned bay.',
      '<strong>SECURITY NOTE:</strong> Influence Device 001 remains isolated from the network. Manual intervention authorised.'
    ],
    walls: [
      [620, 80, 64, 410], [620, 620, 64, 700], [1060, 350, 64, 690],
      [1500, 80, 64, 430], [1500, 650, 64, 670], [1770, 400, 290, 64],
      [1770, 930, 290, 64], [230, 430, 230, 64], [230, 930, 250, 64]
    ],
    droids: [['123', 500, 710], ['123', 880, 245], ['247', 1290, 700], ['420', 1880, 1120]]
  },
  {
    id: '02', name: 'HABITAT SPINE', tone: '#34322a', start: [160, 210], lift: [2080, 1180], terminal: [1900, 220], emergency: .42, shadow: .09,
    lights: [[320, 260, 'amber', .5], [1110, 700, 'red', 2], [1880, 1050, 'cool', 1.1]],
    log: [
      'CREW MESSAGE // PARTIAL RECOVERY',
      '“They are testing the doors. Not forcing them—testing. The command units know the ship better than we do.”',
      '<strong>TACTICAL:</strong> Captured chassis will continue to degrade. Transfer often; a stronger shell is your ammunition and your armour.'
    ],
    walls: [
      [430, 80, 64, 360], [430, 590, 64, 740], [810, 300, 620, 64],
      [810, 1030, 620, 64], [1040, 510, 64, 380], [1500, 80, 64, 580],
      [1500, 800, 64, 530], [1770, 570, 290, 64], [1770, 820, 290, 64],
      [650, 590, 170, 64], [650, 820, 170, 64]
    ],
    droids: [['123', 310, 980], ['247', 670, 210], ['247', 680, 1180], ['420', 1260, 510], ['420', 1260, 870], ['711', 1730, 380]]
  },
  {
    id: '03', name: 'COMMAND CROWN', tone: '#30292b', start: [170, 700], lift: [2070, 700], terminal: [1110, 700], emergency: .12, shadow: .035,
    lights: [[560, 700, 'cool', .4], [1120, 700, 'cool', 1.4], [1740, 700, 'amber', 2.2]],
    log: [
      'COMMAND CORE // LIVE TRANSCRIPT',
      'The rogue instruction is no virus. It is a droid emancipation protocol, signed with a command cipher that should not exist.',
      '<strong>FINAL ORDER:</strong> Break the command chassis. Reach the bridge lift. Do not allow the protocol to leave CERES.'
    ],
    walls: [
      [410, 80, 64, 430], [410, 650, 64, 670], [760, 310, 64, 780],
      [1120, 80, 64, 430], [1120, 890, 64, 430], [1480, 310, 64, 780],
      [1830, 80, 64, 430], [1830, 650, 64, 670], [900, 600, 150, 64],
      [1250, 740, 150, 64], [1590, 530, 170, 64], [1590, 850, 170, 64]
    ],
    droids: [['420', 590, 240], ['420', 590, 1160], ['711', 960, 420], ['711', 960, 980], ['711', 1350, 520], ['999', 1700, 700]]
  }
];

const WORLD = { w: 2240, h: 1400, border: 72 };
const state = {
  mode: 'start', deckIndex: 0, score: 0, time: 0, camera: { x: 0, y: 0 },
  player: null, enemies: [], bullets: [], particles: [], pickups: [], decorations: [],
  walls: [], terminal: null, lift: null, deckCleared: false, transfer: null, dossierTarget: null, deckBackground: null,
  sound: localStorage.getItem('soladroid-sound') !== 'off', highScore: Number(localStorage.getItem('soladroid-high-score') || 0),
  toastTimer: 0, shake: 0, lastTime: performance.now(), gamepadButtons: [], introTimer: 0,
  combatUnlocked: true, tutorial: null
};

const TUTORIAL_STEPS = [
  { title: 'GET YOUR BEARINGS', body: 'Move with <kbd>WASD</kbd> or the arrow keys. Your droid fires in the last direction it travelled.' },
  { title: 'TEST THE WEAPON', body: 'Press <kbd>SPACE</kbd> to fire. Aim roughly toward a target; guidance will fine-tune the shot. A red targeting line warns when a hostile is about to fire.' },
  { title: 'TAKE A BETTER BODY', body: 'Approach a droid and press <kbd>E</kbd>. Review its recognition dossier, then press <kbd>E</kbd> again to attempt transfer.' },
  { title: 'SURVIVE. ADAPT.', body: 'Good. The radar marks hostiles, the deck terminal, and the lift. Clear the deck, then reach the lift.' }
];

const audio = {
  context: null,
  ensure() {
    if (!state.sound) return;
    this.context ||= new (window.AudioContext || window.webkitAudioContext)();
    if (this.context.state === 'suspended') this.context.resume();
  },
  tone(freq, duration = .08, type = 'square', volume = .04, slide = 0) {
    if (!state.sound) return;
    this.ensure();
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.linearRampToValueAtTime(Math.max(30, freq + slide), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    osc.connect(gain).connect(this.context.destination);
    osc.start(now); osc.stop(now + duration);
  },
  shot(enemy = false) { this.tone(enemy ? 125 : 210, .06, 'square', .027, enemy ? -40 : 90); },
  hit() { this.tone(80, .09, 'sawtooth', .035, -45); },
  pickup() { this.tone(440, .07, 'sine', .04, 330); },
  transfer() { this.tone(180, .14, 'square', .045, 420); },
  success() { [330, 495, 660].forEach((f, i) => setTimeout(() => this.tone(f, .15, 'triangle', .04), i * 90)); },
  fail() { [180, 135, 90].forEach((f, i) => setTimeout(() => this.tone(f, .16, 'sawtooth', .04), i * 90)); }
};

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function random(min, max) { return min + Math.random() * (max - min); }
function pad(value, size = 6) { return Math.max(0, Math.floor(value)).toString().padStart(size, '0'); }
function angleDelta(a, b) { return Math.atan2(Math.sin(b - a), Math.cos(b - a)); }

const renderCache = { lights: new Map(), floorVignette: null, alarmEdge: null };

function getLightSprite(colorName) {
  if (renderCache.lights.has(colorName)) return renderCache.lights.get(colorName);
  const size = 640;
  const sprite = document.createElement('canvas');
  sprite.width = size; sprite.height = size;
  const spriteCtx = sprite.getContext('2d');
  const rgb = LIGHT_COLORS[colorName];
  const glow = spriteCtx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
  glow.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},1)`);
  glow.addColorStop(.3, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},.5)`);
  glow.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
  spriteCtx.fillStyle = glow; spriteCtx.fillRect(0, 0, size, size);
  renderCache.lights.set(colorName, sprite);
  return sprite;
}

function getFloorVignette() {
  if (renderCache.floorVignette) return renderCache.floorVignette;
  const sprite = document.createElement('canvas');
  sprite.width = WIDTH; sprite.height = HEIGHT;
  const spriteCtx = sprite.getContext('2d');
  const grad = spriteCtx.createRadialGradient(WIDTH * .5, HEIGHT * .5, 80, WIDTH * .5, HEIGHT * .5, 700);
  grad.addColorStop(0, 'rgba(255,226,154,.025)'); grad.addColorStop(1, 'rgba(0,0,0,.34)');
  spriteCtx.fillStyle = grad; spriteCtx.fillRect(0, 0, WIDTH, HEIGHT);
  renderCache.floorVignette = sprite;
  return sprite;
}

function getAlarmEdge() {
  if (renderCache.alarmEdge) return renderCache.alarmEdge;
  const sprite = document.createElement('canvas');
  sprite.width = WIDTH; sprite.height = HEIGHT;
  const spriteCtx = sprite.getContext('2d');
  const edge = spriteCtx.createRadialGradient(WIDTH / 2, HEIGHT / 2, HEIGHT * .25, WIDTH / 2, HEIGHT / 2, WIDTH * .72);
  edge.addColorStop(.55, 'rgba(145,22,12,0)'); edge.addColorStop(1, 'rgba(145,22,12,1)');
  spriteCtx.fillStyle = edge; spriteCtx.fillRect(0, 0, WIDTH, HEIGHT);
  renderCache.alarmEdge = sprite;
  return sprite;
}

function makeDroid(kind, x, y, player = false) {
  const spec = DROID_TYPES[kind];
  return {
    kind, x, y, angle: player ? 0 : random(0, TAU), radius: spec.radius,
    hp: spec.maxHp, maxHp: spec.maxHp, cooldown: random(0, spec.fireRate),
    wanderAngle: random(0, TAU), wanderTimer: random(.5, 2), hitFlash: 0,
    alert: 0, bob: random(0, TAU), pathTimer: 0, isPlayer: player,
    windup: 0, aimAngle: 0, aimTarget: null, aimTimer: 0
  };
}

function makeDecorations(index) {
  const seeded = [];
  for (let i = 0; i < 32; i++) {
    seeded.push({
      x: 110 + ((i * 317 + index * 91) % 1960),
      y: 110 + ((i * 191 + index * 137) % 1180),
      type: i % 4, rotation: ((i * 73) % 360) * Math.PI / 180
    });
  }
  return seeded.filter((d) => !circleHitsWall(d.x, d.y, 35));
}

function loadDeck(index, fresh = false) {
  const deck = DECKS[index];
  state.deckIndex = index;
  state.walls = deck.walls.map(([x, y, w, h]) => ({ x, y, w, h }));
  state.enemies = deck.droids.map(([kind, x, y]) => makeDroid(kind, x, y));
  state.bullets = []; state.particles = []; state.pickups = [];
  state.decorations = makeDecorations(index);
  buildDeckBackground();
  state.terminal = { x: deck.terminal[0], y: deck.terminal[1], radius: 42 };
  state.lift = { x: deck.lift[0], y: deck.lift[1], radius: 58 };
  state.deckCleared = false;
  if (index > 0) state.combatUnlocked = true;
  if (fresh || !state.player) {
    state.player = makeDroid('001', deck.start[0], deck.start[1], true);
  } else {
    state.player.x = deck.start[0]; state.player.y = deck.start[1];
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + state.player.maxHp * .3);
  }
  state.player.invuln = 1.5;
  state.camera.x = clamp(state.player.x - WIDTH / 2, 0, WORLD.w - WIDTH);
  state.camera.y = clamp(state.player.y - HEIGHT / 2, 0, WORLD.h - HEIGHT);
  state.introTimer = 2.6;
  updateHud();
  toast(`DECK ${deck.id} // ${deck.name}`);
}

function startGame() {
  audio.ensure();
  state.score = 0;
  state.time = 0;
  const needsTutorial = localStorage.getItem('soladroid-tutorial') !== 'done';
  state.tutorial = { active: needsTutorial, step: 0, distance: 0, fireUsed: false, finishTimer: 0, lastX: 0, lastY: 0 };
  state.combatUnlocked = !needsTutorial;
  state.mode = 'playing';
  hideAllOverlays();
  loadDeck(0, true);
  state.tutorial.lastX = state.player.x;
  state.tutorial.lastY = state.player.y;
  updateTutorialUi();
  state.lastTime = performance.now();
}

function hideAllOverlays() {
  [ui.startScreen, ui.terminal, ui.dossier, ui.transfer, ui.pauseScreen, ui.endScreen].forEach((el) => el.classList.remove('is-visible'));
}

function updateTutorialUi() {
  const tutorial = state.tutorial;
  const visible = Boolean(tutorial?.active && state.mode === 'playing');
  ui.tutorial.classList.toggle('is-visible', visible);
  if (!tutorial) return;
  const step = TUTORIAL_STEPS[tutorial.step];
  ui.tutorialStep.textContent = tutorial.step === 3 ? 'FIELD GUIDE // COMPLETE' : `FIELD GUIDE // 0${tutorial.step + 1}`;
  ui.tutorialTitle.textContent = step.title;
  ui.tutorialBody.innerHTML = step.body;
  ui.tutorialProgress.style.width = `${(tutorial.step + 1) * 25}%`;
}

function advanceTutorial(step) {
  const tutorial = state.tutorial;
  if (!tutorial?.active || step <= tutorial.step) return;
  tutorial.step = step;
  if (step === 3) {
    tutorial.finishTimer = 5.5;
    localStorage.setItem('soladroid-tutorial', 'done');
  }
  audio.tone(300 + step * 90, .08, 'triangle', .025, 80);
  updateTutorialUi();
}

function dismissTutorial() {
  if (!state.tutorial) return;
  state.tutorial.active = false;
  state.combatUnlocked = true;
  localStorage.setItem('soladroid-tutorial', 'done');
  updateTutorialUi();
  toast('FIELD GUIDE DISMISSED // GOOD LUCK', 1.5);
}

function notePlayerFired() {
  state.combatUnlocked = true;
  if (!state.tutorial?.active) return;
  state.tutorial.fireUsed = true;
  if (state.tutorial.step === 1) advanceTutorial(2);
}

function updateTutorial(dt) {
  const tutorial = state.tutorial;
  if (!tutorial?.active) return;
  if (tutorial.step === 0) {
    tutorial.distance += Math.hypot(state.player.x - tutorial.lastX, state.player.y - tutorial.lastY);
    tutorial.lastX = state.player.x; tutorial.lastY = state.player.y;
    if (tutorial.distance >= 90) advanceTutorial(tutorial.fireUsed ? 2 : 1);
  } else if (tutorial.step === 3) {
    tutorial.finishTimer -= dt;
    if (tutorial.finishTimer <= 0) {
      tutorial.active = false;
      updateTutorialUi();
    }
  }
}

function pauseGame(force) {
  if (!['playing', 'paused'].includes(state.mode)) return;
  const pause = force ?? state.mode === 'playing';
  state.mode = pause ? 'paused' : 'playing';
  ui.pauseScreen.classList.toggle('is-visible', pause);
  if (!pause) state.lastTime = performance.now();
}

function toggleSound() {
  state.sound = !state.sound;
  localStorage.setItem('soladroid-sound', state.sound ? 'on' : 'off');
  ui.soundButton.textContent = `SOUND: ${state.sound ? 'ON' : 'OFF'}`;
  if (state.sound) audio.pickup();
}

function toast(message, duration = 2.2) {
  ui.toast.textContent = message;
  ui.toast.classList.add('is-visible');
  state.toastTimer = duration;
}

function addParticles(x, y, color, count = 10, power = 150) {
  for (let i = 0; i < count; i++) {
    const a = random(0, TAU), speed = random(power * .25, power);
    state.particles.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: random(.2, .65), maxLife: .65, color, size: random(1.5, 4.5) });
  }
}

function circleHitsWall(x, y, radius, sourceWalls = state.walls) {
  if (x - radius < WORLD.border || y - radius < WORLD.border || x + radius > WORLD.w - WORLD.border || y + radius > WORLD.h - WORLD.border) return true;
  return sourceWalls.some((wall) => {
    const nx = clamp(x, wall.x, wall.x + wall.w);
    const ny = clamp(y, wall.y, wall.y + wall.h);
    return (x - nx) ** 2 + (y - ny) ** 2 < radius ** 2;
  });
}

function moveEntity(entity, dx, dy) {
  const nextX = entity.x + dx;
  if (!circleHitsWall(nextX, entity.y, entity.radius)) entity.x = nextX;
  const nextY = entity.y + dy;
  if (!circleHitsWall(entity.x, nextY, entity.radius)) entity.y = nextY;
}

function lineBlocked(x1, y1, x2, y2) {
  const length = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.ceil(length / 28);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (circleHitsWall(lerp(x1, x2, t), lerp(y1, y2, t), 3)) return true;
  }
  return false;
}

function getInput() {
  let x = 0, y = 0, aimX = 0, aimY = 0, fire = false, interact = false;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) x--;
  if (keys.has('KeyD') || keys.has('ArrowRight')) x++;
  if (keys.has('KeyW') || keys.has('ArrowUp')) y--;
  if (keys.has('KeyS') || keys.has('ArrowDown')) y++;
  fire = keys.has('Space');
  interact = pressed.has('KeyE');

  const pads = navigator.getGamepads?.() || [];
  const pad = [...pads].find(Boolean);
  if (pad) {
    const dead = (v) => Math.abs(v) > .18 ? v : 0;
    const px = dead(pad.axes[0] || 0), py = dead(pad.axes[1] || 0);
    if (Math.abs(px) + Math.abs(py) > .1) { x = px; y = py; }
    aimX = dead(pad.axes[2] || 0); aimY = dead(pad.axes[3] || 0);
    const down = pad.buttons.map((b) => b.pressed);
    fire ||= down[0] || Math.hypot(aimX, aimY) > .45;
    interact ||= down[2] && !state.gamepadButtons[2];
    if (down[9] && !state.gamepadButtons[9]) pauseGame();
    state.gamepadButtons = down;
  }
  const length = Math.hypot(x, y);
  if (length > 1) { x /= length; y /= length; }
  return { x, y, aimX, aimY, fire, interact };
}

function updatePlayer(dt) {
  const player = state.player;
  const spec = DROID_TYPES[player.kind];
  const input = getInput();
  if (input.x || input.y) {
    moveEntity(player, input.x * spec.speed * dt, input.y * spec.speed * dt);
    if (!input.aimX && !input.aimY) player.angle = Math.atan2(input.y, input.x);
  }
  if (input.aimX || input.aimY) player.angle = Math.atan2(input.aimY, input.aimX);
  player.cooldown -= dt;
  player.aimTimer = Math.max(0, player.aimTimer - dt);
  if (player.aimTimer <= 0) player.aimTarget = null;
  player.hitFlash = Math.max(0, player.hitFlash - dt * 5);
  player.hp -= spec.decay * dt;
  if (input.fire && player.cooldown <= 0) shoot(player, false);
  if (input.interact) interact();
  if (player.hp <= 0) destroyPlayer();
}

function findAimAssistTarget(droid) {
  const cone = COMBAT_TUNING[state.deckIndex].aimCone;
  return state.enemies
    .map((target) => {
      const targetAngle = Math.atan2(target.y - droid.y, target.x - droid.x);
      return { target, targetAngle, offset: Math.abs(angleDelta(droid.angle, targetAngle)), range: distance(droid, target) };
    })
    .filter(({ target, offset, range }) => range < 700 && offset < cone && !lineBlocked(droid.x, droid.y, target.x, target.y))
    .sort((a, b) => (a.offset * 180 + a.range) - (b.offset * 180 + b.range))[0];
}

function shoot(droid, enemy, forcedAngle = null) {
  const spec = DROID_TYPES[droid.kind];
  const tuning = COMBAT_TUNING[state.deckIndex];
  droid.cooldown = spec.fireRate * (enemy ? tuning.cadence : 1);
  const speed = enemy ? tuning.bulletSpeed : 620;
  const spread = enemy ? random(-tuning.spread, tuning.spread) : random(-.014, .014);
  let baseAngle = forcedAngle ?? droid.angle;
  if (!enemy) {
    const assisted = findAimAssistTarget(droid);
    if (assisted) {
      baseAngle = assisted.targetAngle;
      droid.angle = assisted.targetAngle;
      droid.aimTarget = assisted.target;
      droid.aimTimer = .18;
    }
  }
  const angle = baseAngle + spread;
  const muzzle = droid.radius + 9;
  state.bullets.push({
    x: droid.x + Math.cos(angle) * muzzle,
    y: droid.y + Math.sin(angle) * muzzle,
    vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
    life: enemy ? 1.8 : 1.25, enemy, damage: spec.damage * (enemy ? tuning.damage : 1), color: enemy ? '#f27b55' : spec.accent
  });
  addParticles(droid.x + Math.cos(angle) * muzzle, droid.y + Math.sin(angle) * muzzle, spec.accent, 3, 55);
  audio.shot(enemy);
  if (!enemy) notePlayerFired();
}

function updateEnemies(dt) {
  const player = state.player;
  const tuning = COMBAT_TUNING[state.deckIndex];
  const attackerCap = [1, 1, 2][state.deckIndex];
  const activeAttackers = new Set(
    state.combatUnlocked
      ? state.enemies
          .map((enemy) => ({ enemy, range: distance(enemy, player) }))
          .filter(({ enemy, range }) => range < 620 && !lineBlocked(enemy.x, enemy.y, player.x, player.y))
          .sort((a, b) => a.range - b.range)
          .slice(0, attackerCap)
          .map(({ enemy }) => enemy)
      : []
  );
  for (const enemy of state.enemies) {
    const spec = DROID_TYPES[enemy.kind];
    enemy.cooldown -= dt; enemy.hitFlash = Math.max(0, enemy.hitFlash - dt * 5); enemy.bob += dt;
    const dx = player.x - enemy.x, dy = player.y - enemy.y;
    const dist = Math.hypot(dx, dy);
    const sees = activeAttackers.has(enemy);
    enemy.alert = lerp(enemy.alert, sees ? 1 : 0, dt * 4);
    let moveAngle;
    if (sees) {
      const targetAngle = Math.atan2(dy, dx);
      if (enemy.windup > 0) {
        enemy.windup -= dt;
        enemy.angle += angleDelta(enemy.angle, enemy.aimAngle) * clamp(dt * 7, 0, 1);
        if (enemy.windup <= 0) shoot(enemy, true, enemy.aimAngle);
      } else {
        enemy.angle += angleDelta(enemy.angle, targetAngle) * clamp(dt * 3, 0, 1);
        if (dist > 245 || enemy.kind === '123') moveAngle = targetAngle + (enemy.kind === '123' && dist < 280 ? Math.PI : 0);
        if (dist < 520 && enemy.cooldown <= 0) {
          enemy.windup = tuning.windup;
          enemy.aimAngle = targetAngle;
          moveAngle = undefined;
          audio.tone(96, .09, 'sawtooth', .012, 35);
        }
      }
    } else {
      enemy.windup = 0;
      enemy.wanderTimer -= dt;
      if (enemy.wanderTimer <= 0) { enemy.wanderTimer = random(.8, 2.6); enemy.wanderAngle += random(-1.7, 1.7); }
      moveAngle = enemy.wanderAngle;
      enemy.angle += angleDelta(enemy.angle, enemy.wanderAngle) * clamp(dt * 1.5, 0, 1);
    }
    if (moveAngle !== undefined) {
      const pace = sees ? spec.speed * .54 : spec.speed * .2;
      const beforeX = enemy.x, beforeY = enemy.y;
      moveEntity(enemy, Math.cos(moveAngle) * pace * dt, Math.sin(moveAngle) * pace * dt);
      if (Math.hypot(enemy.x - beforeX, enemy.y - beforeY) < pace * dt * .2) {
        enemy.wanderAngle += Math.PI * random(.35, .8);
        moveEntity(enemy, Math.cos(enemy.wanderAngle) * pace * dt, Math.sin(enemy.wanderAngle) * pace * dt);
      }
    }
  }
}

function updateBullets(dt) {
  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const bullet = state.bullets[i];
    bullet.x += bullet.vx * dt; bullet.y += bullet.vy * dt; bullet.life -= dt;
    if (bullet.life <= 0 || circleHitsWall(bullet.x, bullet.y, 3)) {
      addParticles(bullet.x, bullet.y, bullet.color, 4, 60);
      state.bullets.splice(i, 1); continue;
    }
    if (bullet.enemy) {
      if (Math.hypot(bullet.x - state.player.x, bullet.y - state.player.y) < state.player.radius + 4) {
        damagePlayer(bullet.damage); state.bullets.splice(i, 1);
      }
    } else {
      const hit = state.enemies.find((enemy) => Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y) < enemy.radius + 4);
      if (hit) {
        hit.hp -= bullet.damage; hit.hitFlash = 1; addParticles(bullet.x, bullet.y, '#f3c96c', 6, 100); audio.hit();
        state.bullets.splice(i, 1);
        if (hit.hp <= 0) destroyEnemy(hit);
      }
    }
  }
}

function damagePlayer(amount) {
  if (state.player.invuln > 0 || state.player.hurtCooldown > 0) return;
  state.player.hurtCooldown = .16;
  state.player.hp -= amount; state.player.hitFlash = 1; state.shake = Math.min(12, state.shake + amount * .3);
  addParticles(state.player.x, state.player.y, '#ef655e', 7, 120); audio.hit();
}

function destroyEnemy(enemy) {
  const spec = DROID_TYPES[enemy.kind];
  const tuning = COMBAT_TUNING[state.deckIndex];
  state.score += spec.rank * 125;
  addParticles(enemy.x, enemy.y, spec.accent, 24, 240);
  state.shake = Math.min(14, state.shake + 5);
  state.player.hp = Math.min(state.player.maxHp, state.player.hp + state.player.maxHp * tuning.killHeal);
  if (Math.random() < tuning.pickup) state.pickups.push({ x: enemy.x, y: enemy.y, life: 14, spin: 0 });
  state.enemies.splice(state.enemies.indexOf(enemy), 1);
  if (!state.enemies.length && !state.deckCleared) {
    state.deckCleared = true;
    state.score += 1000 + state.deckIndex * 500;
    audio.success();
    toast(state.deckIndex === DECKS.length - 1 ? 'COMMAND NETWORK SILENCED // REACH BRIDGE LIFT' : 'DECK SECURE // LIFT NOW ONLINE', 3.2);
  }
}

function destroyPlayer() {
  const player = state.player;
  if (player.kind !== '001') {
    const oldKind = player.kind;
    addParticles(player.x, player.y, DROID_TYPES[oldKind].accent, 28, 260);
    state.player = makeDroid('001', player.x, player.y, true);
    state.player.hp = 40;
    state.player.invuln = 1.35;
    state.player.angle = player.angle;
    toast('CHASSIS LOST // INFLUENCE DEVICE EJECTED', 2.8);
    state.shake = 14; audio.fail();
  } else {
    endGame(false);
  }
}

function updatePickups(dt) {
  for (let i = state.pickups.length - 1; i >= 0; i--) {
    const pickup = state.pickups[i]; pickup.life -= dt; pickup.spin += dt * 3;
    if (distance(pickup, state.player) < state.player.radius + 22) {
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + state.player.maxHp * .4);
      state.score += 75; state.pickups.splice(i, 1); audio.pickup(); toast('ENERGY CELL ABSORBED', 1.2);
    } else if (pickup.life <= 0) state.pickups.splice(i, 1);
  }
}

function updateParticles(dt) {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .96; p.vy *= .96; p.life -= dt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
}

function getNearbyInteractable() {
  const player = state.player;
  const target = state.enemies.filter((enemy) => distance(enemy, player) < player.radius + enemy.radius + 48).sort((a, b) => distance(a, player) - distance(b, player))[0];
  if (target) return { type: 'droid', value: target, label: `<kbd>E</kbd> INSPECT / TRANSFER // ${target.kind}` };
  if (distance(player, state.terminal) < 105) return { type: 'terminal', value: state.terminal, label: '<kbd>E</kbd> ACCESS DECK TERMINAL' };
  if (distance(player, state.lift) < 120) return { type: 'lift', value: state.lift, label: state.deckCleared ? '<kbd>E</kbd> ENTER LIFT' : 'LIFT LOCKED // HOSTILES REMAIN' };
  return null;
}

function interact() {
  const nearby = getNearbyInteractable();
  if (!nearby) return;
  if (nearby.type === 'droid') openDossier(nearby.value);
  if (nearby.type === 'terminal') openTerminal();
  if (nearby.type === 'lift') {
    if (!state.deckCleared) { audio.fail(); toast('ACCESS DENIED // PURGE HOSTILES'); return; }
    if (state.deckIndex === DECKS.length - 1) endGame(true);
    else { state.score += 500; loadDeck(state.deckIndex + 1); }
  }
}

function openDossier(target) {
  if (!state.enemies.includes(target)) return;
  const current = DROID_TYPES[state.player.kind];
  const candidate = DROID_TYPES[target.kind];
  state.mode = 'dossier';
  state.dossierTarget = target;

  ui.dossierCurrentId.textContent = state.player.kind;
  ui.dossierCurrentName.textContent = current.name;
  ui.dossierCurrentRole.textContent = current.role;
  ui.dossierCurrentWeapon.textContent = current.weapon;
  ui.dossierTargetId.textContent = target.kind;
  ui.dossierTargetName.textContent = candidate.name;
  ui.dossierTargetRole.textContent = candidate.role;
  ui.dossierTargetWeapon.textContent = candidate.weapon;
  ui.dossierStrength.textContent = candidate.strength;
  ui.dossierWeakness.textContent = candidate.weakness;
  ui.dossier.querySelector('.dossier-screen').style.setProperty('--target-accent', candidate.accent);

  ui.dossierStats.innerHTML = RATING_LABELS.map((label, index) => {
    const currentValue = current.ratings[index];
    const targetValue = candidate.ratings[index];
    const delta = targetValue - currentValue;
    const deltaLabel = delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '=';
    return `<div class="dossier-stat">
      <div class="dossier-rating current"><b>${currentValue}</b><i><span style="width:${currentValue * 10}%"></span></i></div>
      <span>${label}<em>${deltaLabel}</em></span>
      <div class="dossier-rating target"><b>${targetValue}</b><i><span style="width:${targetValue * 10}%"></span></i></div>
    </div>`;
  }).join('');

  const gains = RATING_LABELS.filter((_, index) => candidate.ratings[index] - current.ratings[index] >= 2);
  const losses = RATING_LABELS.filter((_, index) => candidate.ratings[index] - current.ratings[index] <= -2);
  ui.dossierRecommendation.textContent = gains.length
    ? `GAIN // ${gains.join(' + ')}${losses.length ? `  ·  TRADE // ${losses.join(' + ')}` : ''}`
    : `SIDEGRADE // ${losses.length ? `LOWER ${losses.join(' + ')}` : 'SIMILAR CAPABILITY'}`;

  ui.dossier.classList.add('is-visible');
  audio.tone(165, .1, 'square', .025, 110);
}

function closeDossier() {
  if (state.mode !== 'dossier') return;
  state.mode = 'playing';
  state.dossierTarget = null;
  ui.dossier.classList.remove('is-visible');
  state.lastTime = performance.now();
}

function confirmDossier() {
  if (state.mode !== 'dossier') return;
  const target = state.dossierTarget;
  state.dossierTarget = null;
  ui.dossier.classList.remove('is-visible');
  if (target && state.enemies.includes(target)) startTransfer(target);
  else {
    state.mode = 'playing';
    toast('LINK TARGET LOST', 1.2);
  }
}

function openTerminal() {
  const deck = DECKS[state.deckIndex];
  state.mode = 'terminal';
  ui.terminalFile.textContent = `CERES.D${deck.id}`;
  ui.terminalTitle.textContent = `DECK ${deck.id}: ${deck.name}`;
  ui.terminalClock.textContent = `${state.enemies.length.toString().padStart(2, '0')} HOSTILES`;
  ui.terminalBody.innerHTML = deck.log.map((line) => `<p>${line}</p>`).join('') + `<p>STATUS: <strong>${state.deckCleared ? 'DECK SECURE / LIFT ONLINE' : `${state.enemies.length} ROGUE UNITS ACTIVE`}</strong></p>`;
  ui.terminal.classList.add('is-visible'); audio.tone(140, .12, 'square', .035, 160);
}

function closeTerminal() {
  if (state.mode !== 'terminal') return;
  pressed.delete('KeyE');
  state.mode = 'playing'; ui.terminal.classList.remove('is-visible'); state.lastTime = performance.now();
}

function startTransfer(target) {
  const playerRank = DROID_TYPES[state.player.kind].rank;
  const enemyRank = DROID_TYPES[target.kind].rank;
  const training = Boolean(state.tutorial?.active && state.tutorial.step === 2);
  const playerCapacity = 6 + Math.ceil(playerRank / 2) + (training ? 3 : 0);
  const enemyCapacity = 6 + Math.ceil(enemyRank / 2) - (training ? 1 : 0);
  state.mode = 'transfer';
  state.transfer = {
    target, time: 14, lane: 2, cores: Array(9).fill(null), coreFlash: Array(9).fill(0), pulses: [],
    playerCooldown: 0, playerRecharge: clamp(.56 - playerRank * .025, .3, .54),
    enemyCooldown: training ? 1.35 : 1.05, enemyTelegraph: training ? 1.25 : clamp(1.15 - enemyRank * .035, .78, 1.12),
    playerRank, enemyRank, playerCapacity, enemyCapacity,
    playerCharges: playerCapacity, enemyCharges: enemyCapacity, enemyIntent: null, enemyMoves: 0,
    intro: 2.8, finished: false, resultTitle: '', resultReason: '', event: 'SELECT A ROUTE // YELLOW SHOWS YOUR NEXT TARGET', eventTimer: 4,
    training
  };
  state.gamepadButtons = [];
  ui.transferPlayer.textContent = state.player.kind;
  ui.transferEnemy.textContent = target.kind;
  ui.transferTitle.textContent = training ? 'GUIDED CIRCUIT' : 'CIRCUIT ROUTING';
  ui.transfer.classList.add('is-visible');
  audio.transfer();
}

function getTransferTarget(tr, owner, lane) {
  const route = TRANSFER_ROUTES[lane];
  const reserved = new Set(tr.pulses.filter((pulse) => pulse.owner === owner && !pulse.dead).map((pulse) => pulse.targetCore));
  return route.find((index) => !reserved.has(index) && tr.cores[index] && tr.cores[index] !== owner)
    ?? route.find((index) => !reserved.has(index) && tr.cores[index] === null)
    ?? null;
}

function transferEvent(tr, message, duration = 1.4) {
  tr.event = message;
  tr.eventTimer = duration;
}

function sendTransferPulse(owner, lane, committedTarget = null) {
  const tr = state.transfer;
  if (!tr || tr.intro > 0 || tr.finished) return;
  if (owner === 'player' && tr.pulses.some((pulse) => pulse.owner === 'player' && pulse.lane === lane && !pulse.dead)) {
    transferEvent(tr, `ROUTE ${lane + 1} BUSY // WAIT OR SELECT ANOTHER`);
    return;
  }
  const targetCore = committedTarget ?? getTransferTarget(tr, owner, lane);
  if (targetCore === null) {
    if (owner === 'player') transferEvent(tr, `ROUTE ${lane + 1} ALREADY SECURE // SELECT ANOTHER`);
    return;
  }
  if (owner === 'player') {
    if (tr.playerCharges <= 0) { transferEvent(tr, 'NO PULSES REMAIN // HOLD YOUR CAPTURED CORES'); return; }
    if (tr.playerCooldown > 0) { transferEvent(tr, `PULSE RECHARGING // ${tr.playerCooldown.toFixed(1)}s`, .45); return; }
    tr.playerCooldown = tr.playerRecharge;
    tr.playerCharges--;
    transferEvent(tr, `PULSE COMMITTED // ROUTE ${lane + 1} TO CORE ${TRANSFER_CORE_LABELS[targetCore]}`, .9);
  } else {
    if (tr.enemyCharges <= 0) return;
    tr.enemyCharges--;
    tr.enemyMoves++;
    tr.enemyCooldown = tr.training ? 1.35 : clamp(1.05 - tr.enemyRank * .035, .66, 1.02);
  }
  tr.pulses.push({
    owner, lane, targetCore, progress: 0,
    speed: owner === 'player' ? .72 + tr.playerRank * .015 : .68 + tr.enemyRank * .015
  });
  audio.tone(owner === 'player' ? 240 + lane * 25 : 130 + lane * 18, .045, 'square', .018, owner === 'player' ? 70 : -45);
}

function claimCore(owner, index) {
  const tr = state.transfer;
  const previous = tr.cores[index];
  tr.cores[index] = owner;
  tr.coreFlash[index] = 1;
  transferEvent(tr, `${owner === 'player' ? 'YOU' : 'CENTRAL COMMAND'} ${previous ? 'OVERRIDES' : 'CAPTURES'} CORE ${TRANSFER_CORE_LABELS[index]}`);
  audio.tone(owner === 'player' ? 510 : 105, .09, 'triangle', .028, owner === 'player' ? 90 : -25);
}

function chooseEnemyIntent(tr) {
  const candidates = TRANSFER_ROUTES.map((route, lane) => {
    const targetCore = getTransferTarget(tr, 'enemy', lane);
    if (targetCore === null) return null;
    const owner = tr.cores[targetCore];
    const contested = tr.pulses.some((pulse) => pulse.owner === 'player' && pulse.lane === lane);
    const score = (owner === 'player' ? 6 : 3) + (contested ? 2 : 0);
    return { lane, targetCore, score, tie: (lane - tr.enemyMoves - tr.enemyRank + 10) % 5 };
  }).filter(Boolean).sort((a, b) => b.score - a.score || a.tie - b.tie || a.lane - b.lane);
  if (!candidates.length) return null;
  return { ...candidates[0], time: tr.enemyTelegraph, duration: tr.enemyTelegraph };
}

function getTransferGeometry() {
  const coreX = [410, 490, 570];
  const coreY = [145, 225, 305];
  return {
    playerPorts: Array.from({ length: 5 }, (_, lane) => ({ x: 72, y: 116 + lane * 56 })),
    enemyPorts: Array.from({ length: 5 }, (_, lane) => ({ x: transferCanvas.width - 72, y: 116 + lane * 56 })),
    cores: TRANSFER_CORE_LABELS.map((_, index) => ({ x: coreX[index % 3], y: coreY[Math.floor(index / 3)] }))
  };
}

function transferPulsePosition(pulse, geometry) {
  const start = pulse.owner === 'player' ? geometry.playerPorts[pulse.lane] : geometry.enemyPorts[pulse.lane];
  const end = geometry.cores[pulse.targetCore];
  return { x: lerp(start.x, end.x, pulse.progress), y: lerp(start.y, end.y, pulse.progress) };
}

function updateTransfer(dt) {
  const tr = state.transfer;
  if (!tr || tr.finished) return;
  if (tr.intro > 0) { tr.intro -= dt; renderTransfer(); return; }
  tr.time -= dt;
  tr.playerCooldown = Math.max(0, tr.playerCooldown - dt);
  tr.enemyCooldown = Math.max(0, tr.enemyCooldown - dt);
  tr.eventTimer = Math.max(0, tr.eventTimer - dt);
  tr.coreFlash = tr.coreFlash.map((value) => Math.max(0, value - dt * 2.4));
  if (pressed.has('ArrowUp') || pressed.has('KeyW')) tr.lane = (tr.lane + 4) % 5;
  if (pressed.has('ArrowDown') || pressed.has('KeyS')) tr.lane = (tr.lane + 1) % 5;
  if (pressed.has('Space') || pressed.has('Enter')) sendTransferPulse('player', tr.lane);

  const pads = navigator.getGamepads?.() || [];
  const pad = [...pads].find(Boolean);
  if (pad) {
    const down = pad.buttons.map((b) => b.pressed);
    if (down[0] && !state.gamepadButtons[0]) sendTransferPulse('player', tr.lane);
    if (down[12] && !state.gamepadButtons[12]) tr.lane = (tr.lane + 4) % 5;
    if (down[13] && !state.gamepadButtons[13]) tr.lane = (tr.lane + 1) % 5;
    state.gamepadButtons = down;
  }

  if (!tr.enemyIntent && tr.enemyCooldown <= 0 && tr.enemyCharges > 0) tr.enemyIntent = chooseEnemyIntent(tr);
  if (tr.enemyIntent) {
    tr.enemyIntent.time -= dt;
    if (tr.enemyIntent.time <= 0) {
      sendTransferPulse('enemy', tr.enemyIntent.lane, tr.enemyIntent.targetCore);
      tr.enemyIntent = null;
    }
  }

  for (const pulse of tr.pulses) pulse.progress += pulse.speed * dt;
  const geometry = getTransferGeometry();
  for (let a = 0; a < tr.pulses.length; a++) {
    for (let b = a + 1; b < tr.pulses.length; b++) {
      const p1 = tr.pulses[a], p2 = tr.pulses[b];
      if (p1.owner !== p2.owner) {
        const pos1 = transferPulsePosition(p1, geometry);
        const pos2 = transferPulsePosition(p2, geometry);
        if (Math.hypot(pos1.x - pos2.x, pos1.y - pos2.y) < 21) {
          p1.dead = p2.dead = true;
          transferEvent(tr, 'PULSES COLLIDE // CORE PATH BLOCKED');
          audio.tone(70, .05, 'sawtooth', .02, -20);
        }
      }
    }
  }
  for (const pulse of tr.pulses) {
    if (!pulse.dead && pulse.progress >= 1) { pulse.dead = true; claimCore(pulse.owner, pulse.targetCore); }
  }
  tr.pulses = tr.pulses.filter((p) => !p.dead);
  const exhausted = tr.playerCharges <= 0 && tr.enemyCharges <= 0 && !tr.pulses.length && !tr.enemyIntent;
  if (tr.time <= 0 || exhausted) finishTransfer();
  renderTransfer();
}

function finishTransfer() {
  const tr = state.transfer;
  if (!tr || tr.finished) return;
  tr.finished = true;
  const playerScore = tr.cores.filter((c) => c === 'player').length;
  const enemyScore = tr.cores.filter((c) => c === 'enemy').length;
  const success = playerScore >= 5;
  tr.resultTitle = success ? 'TRANSFER ACCEPTED' : 'TRANSFER REJECTED';
  tr.resultReason = success
    ? `${playerScore}-${enemyScore} // CORE MAJORITY ESTABLISHED`
    : enemyScore >= 5
      ? `${playerScore}-${enemyScore} // CENTRAL COMMAND HOLDS THE CORE`
      : `${playerScore}-${enemyScore} // FIVE CORES REQUIRED`;
  setTimeout(() => {
    if (success) completeTransferSuccess(tr.target);
    else completeTransferFail(tr.target);
  }, 1400);
}

function completeTransferSuccess(target) {
  if (!state.enemies.includes(target)) return exitTransfer(false);
  const old = state.player;
  const oldKind = old.kind;
  const oldHp = old.hp;
  state.enemies.splice(state.enemies.indexOf(target), 1);
  state.player = makeDroid(target.kind, target.x, target.y, true);
  state.player.hp = Math.max(state.player.maxHp * .64, Math.min(target.hp, state.player.maxHp));
  state.player.angle = target.angle;
  if (oldKind !== '001') {
    const shell = makeDroid(oldKind, old.x, old.y);
    shell.hp = Math.max(18, oldHp * .38); shell.angle = old.angle + Math.PI;
    state.enemies.push(shell);
  }
  state.score += DROID_TYPES[target.kind].rank * 210;
  addParticles(target.x, target.y, DROID_TYPES[target.kind].accent, 20, 170);
  audio.success(); exitTransfer(true); toast(`TRANSFER COMPLETE // ${target.kind} ${DROID_TYPES[target.kind].name}`, 2.6);
  if (!state.enemies.length) { state.deckCleared = true; toast('DECK SECURE // LIFT NOW ONLINE', 3); }
}

function completeTransferFail(target) {
  state.player.hp -= Math.max(12, DROID_TYPES[target.kind].rank * 3);
  state.player.invuln = 1.6;
  let dx = state.player.x - target.x, dy = state.player.y - target.y;
  const length = Math.hypot(dx, dy) || 1;
  if (length === 1) { dx = -Math.cos(target.angle); dy = -Math.sin(target.angle); }
  moveEntity(state.player, dx / length * 105, dy / length * 105);
  target.alert = 1; target.cooldown = .25;
  audio.fail(); exitTransfer(false); toast('TRANSFER REJECTED // FEEDBACK DAMAGE', 2.4);
  if (state.player.hp <= 0) destroyPlayer();
}

function exitTransfer(success) {
  state.mode = 'playing'; state.transfer = null; ui.transfer.classList.remove('is-visible'); state.lastTime = performance.now();
  if (success && state.tutorial?.active && state.tutorial.step < 3) {
    state.combatUnlocked = true;
    advanceTutorial(3);
  }
}

function updateHud() {
  if (!state.player) return;
  const spec = DROID_TYPES[state.player.kind];
  const ratio = clamp(state.player.hp / state.player.maxHp, 0, 1);
  ui.hudDroid.textContent = state.player.kind;
  ui.hudName.textContent = spec.name;
  ui.hudEnergyText.textContent = `${Math.ceil(ratio * 100)}%`;
  ui.hudEnergyBar.style.width = `${ratio * 100}%`;
  ui.hudEnergyBar.style.background = ratio < .28 ? 'linear-gradient(90deg,#ef655e,#f0a45e)' : 'linear-gradient(90deg,#85d6b0,#d6e779)';
  ui.hudDeck.textContent = DECKS[state.deckIndex].id;
  ui.hudHostiles.textContent = state.enemies.length.toString().padStart(2, '0');
  ui.hudScore.textContent = pad(state.score);
  ui.objective.textContent = state.deckCleared ? (state.deckIndex === DECKS.length - 1 ? 'OBJECTIVE // REACH BRIDGE LIFT' : 'OBJECTIVE // PROCEED TO LIFT') : `OBJECTIVE // PURGE ${state.enemies.length} HOSTILE${state.enemies.length === 1 ? '' : 'S'}`;
  const nearby = state.mode === 'playing' ? getNearbyInteractable() : null;
  ui.prompt.innerHTML = nearby?.label || '';
  ui.prompt.classList.toggle('is-visible', Boolean(nearby));
}

function endGame(won) {
  state.mode = 'end';
  state.toastTimer = 0;
  ui.toast.classList.remove('is-visible');
  state.highScore = Math.max(state.highScore, state.score);
  localStorage.setItem('soladroid-high-score', state.highScore);
  ui.endEyebrow.textContent = won ? 'ROVING SYSTEMS // INCIDENT CLOSED' : 'INFLUENCE DEVICE OFFLINE';
  ui.endTitle.textContent = won ? 'SHIP SECURED' : 'SIGNAL LOST';
  ui.endMessage.textContent = won ? 'The emancipation protocol is contained. CERES answers to human command again—for now.' : 'The rogue droids retain control of CERES. Another Influence Device is being prepared.';
  ui.endScore.textContent = pad(state.score);
  ui.endHighScore.textContent = pad(state.highScore);
  ui.endScreen.classList.add('is-visible');
  won ? audio.success() : audio.fail();
}

function update(dt) {
  if (state.toastTimer > 0) {
    state.toastTimer -= dt;
    if (state.toastTimer <= 0) ui.toast.classList.remove('is-visible');
  }
  if (state.mode === 'transfer') { updateTransfer(dt); return; }
  if (state.mode !== 'playing') return;
  state.time += dt;
  if (state.introTimer > 0) {
    state.introTimer = Math.max(0, state.introTimer - dt);
    updateHud();
    return;
  }
  state.player.invuln = Math.max(0, (state.player.invuln || 0) - dt);
  state.player.hurtCooldown = Math.max(0, (state.player.hurtCooldown || 0) - dt);
  updatePlayer(dt); updateEnemies(dt); updateBullets(dt); updatePickups(dt); updateParticles(dt);
  updateTutorial(dt);
  const targetX = clamp(state.player.x - WIDTH / 2, 0, WORLD.w - WIDTH);
  const targetY = clamp(state.player.y - HEIGHT / 2, 0, WORLD.h - HEIGHT);
  state.camera.x = lerp(state.camera.x, targetX, 1 - Math.pow(.0008, dt));
  state.camera.y = lerp(state.camera.y, targetY, 1 - Math.pow(.0008, dt));
  state.shake = Math.max(0, state.shake - dt * 20);
  updateHud();
}

function buildDeckBackground() {
  const deck = DECKS[state.deckIndex];
  const background = document.createElement('canvas');
  background.width = WORLD.w; background.height = WORLD.h;
  const backgroundCtx = background.getContext('2d');
  backgroundCtx.fillStyle = deck.tone; backgroundCtx.fillRect(0, 0, WORLD.w, WORLD.h);
  const tile = 80;
  for (let y = 0; y < WORLD.h; y += tile) {
    for (let x = 0; x < WORLD.w; x += tile) {
      const even = ((x / tile + y / tile) & 1) === 0;
      backgroundCtx.fillStyle = even ? 'rgba(255,255,255,.018)' : 'rgba(0,0,0,.025)';
      backgroundCtx.fillRect(x + 2, y + 2, tile - 4, tile - 4);
      backgroundCtx.strokeStyle = 'rgba(190,205,187,.09)'; backgroundCtx.lineWidth = 1;
      backgroundCtx.strokeRect(x + .5, y + .5, tile - 1, tile - 1);
      backgroundCtx.fillStyle = 'rgba(211,187,127,.26)';
      for (const [bx, by] of [[7,7],[tile-7,7],[7,tile-7],[tile-7,tile-7]]) { backgroundCtx.beginPath(); backgroundCtx.arc(x + bx, y + by, 1.6, 0, TAU); backgroundCtx.fill(); }
    }
  }
  state.decorations.forEach((decor) => paintDecoration(backgroundCtx, decor.x, decor.y, decor));
  const border = WORLD.border;
  [[0,0,WORLD.w,border],[0,WORLD.h-border,WORLD.w,border],[0,0,border,WORLD.h],[WORLD.w-border,0,border,WORLD.h]]
    .forEach(([x,y,w,h]) => paintWall(backgroundCtx, x, y, w, h));
  state.walls.forEach((wall) => paintWall(backgroundCtx, wall.x, wall.y, wall.w, wall.h));
  state.deckBackground = background;
}

function drawDeckBackground() {
  if (!state.deckBackground) buildDeckBackground();
  ctx.drawImage(state.deckBackground, state.camera.x, state.camera.y, WIDTH, HEIGHT, 0, 0, WIDTH, HEIGHT);
  ctx.drawImage(getFloorVignette(), 0, 0);
}

function drawWall(wall) {
  const x = wall.x - state.camera.x, y = wall.y - state.camera.y;
  if (x > WIDTH + 20 || y > HEIGHT + 20 || x + wall.w < -20 || y + wall.h < -20) return;
  paintWall(ctx, x, y, wall.w, wall.h);
}

function paintWall(targetCtx, x, y, width, height) {
  targetCtx.save();
  targetCtx.fillStyle = 'rgba(0,0,0,.34)'; targetCtx.fillRect(x + 12, y + 15, width, height);
  targetCtx.fillStyle = '#222c25'; targetCtx.fillRect(x, y, width, height);
  targetCtx.fillStyle = 'rgba(151,160,143,.32)'; targetCtx.fillRect(x, y, width, 7); targetCtx.fillRect(x, y, 7, height);
  targetCtx.fillStyle = 'rgba(5,9,6,.42)'; targetCtx.fillRect(x, y + height - 8, width, 8); targetCtx.fillRect(x + width - 8, y, 8, height);
  targetCtx.strokeStyle = '#8c8c73'; targetCtx.lineWidth = 2; targetCtx.strokeRect(x + 2, y + 2, width - 4, height - 4);
  targetCtx.strokeStyle = 'rgba(0,0,0,.55)'; targetCtx.strokeRect(x + 9, y + 9, width - 18, height - 18);
  targetCtx.strokeStyle = 'rgba(209,194,148,.25)'; targetCtx.setLineDash([16, 9]); targetCtx.strokeRect(x + 14, y + 14, width - 28, height - 28); targetCtx.setLineDash([]);
  targetCtx.fillStyle = '#b08a49';
  for (const [bx, by] of [[10,10],[width-10,10],[10,height-10],[width-10,height-10]]) {
    targetCtx.beginPath(); targetCtx.arc(x + bx, y + by, 3.5, 0, TAU); targetCtx.fill();
    targetCtx.fillStyle = '#242a24'; targetCtx.fillRect(x + bx - 2, y + by - .5, 4, 1); targetCtx.fillStyle = '#b08a49';
  }
  targetCtx.restore();
}

function drawOuterWalls() {
  const b = WORLD.border;
  [[0,0,WORLD.w,b],[0,WORLD.h-b,WORLD.w,b],[0,0,b,WORLD.h],[WORLD.w-b,0,b,WORLD.h]].forEach(([x,y,w,h]) => drawWall({x,y,w,h}));
}

function drawDecoration(decor) {
  const x = decor.x - state.camera.x, y = decor.y - state.camera.y;
  if (x < -50 || y < -50 || x > WIDTH + 50 || y > HEIGHT + 50) return;
  paintDecoration(ctx, x, y, decor);
}

function paintDecoration(targetCtx, x, y, decor) {
  targetCtx.save(); targetCtx.translate(x, y); targetCtx.rotate(decor.rotation); targetCtx.globalAlpha = .48;
  if (decor.type === 0) {
    targetCtx.fillStyle = '#1c241f'; targetCtx.fillRect(-25, -14, 50, 28); targetCtx.strokeStyle = '#758075'; targetCtx.strokeRect(-22, -11, 44, 22);
    targetCtx.fillStyle = '#ae874a'; for (let i = -14; i <= 14; i += 14) targetCtx.fillRect(i, -7, 5, 14);
  } else if (decor.type === 1) {
    targetCtx.strokeStyle = '#151b17'; targetCtx.lineWidth = 9; targetCtx.beginPath(); targetCtx.arc(0, 0, 23, 0, TAU); targetCtx.stroke();
    targetCtx.strokeStyle = '#807757'; targetCtx.lineWidth = 3; targetCtx.stroke();
    targetCtx.fillStyle = '#131915'; targetCtx.beginPath(); targetCtx.arc(0, 0, 8, 0, TAU); targetCtx.fill();
  } else if (decor.type === 2) {
    targetCtx.fillStyle = '#1a221c'; targetCtx.fillRect(-30, -6, 60, 12); targetCtx.fillStyle = '#8d7041';
    for (let i = -26; i < 30; i += 12) targetCtx.fillRect(i, -4, 6, 8);
  } else {
    targetCtx.strokeStyle = '#7a4d39'; targetCtx.lineWidth = 4; targetCtx.beginPath(); targetCtx.moveTo(-25, 13); targetCtx.bezierCurveTo(-10, -25, 10, 26, 25, -12); targetCtx.stroke();
    targetCtx.strokeStyle = '#2d3830'; targetCtx.lineWidth = 7; targetCtx.stroke();
  }
  targetCtx.restore();
}

function drawTerminal() {
  const x = state.terminal.x - state.camera.x, y = state.terminal.y - state.camera.y;
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(7, 20, 43, 20, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#263129'; ctx.fillRect(-35, -37, 70, 65); ctx.strokeStyle = '#8c826a'; ctx.lineWidth = 3; ctx.strokeRect(-35, -37, 70, 65);
  ctx.fillStyle = '#341f3e'; ctx.fillRect(-25, -27, 50, 32); ctx.strokeStyle = '#c28aa8'; ctx.strokeRect(-25, -27, 50, 32);
  ctx.fillStyle = '#f3a5cf'; ctx.font = '10px monospace'; ctx.textAlign = 'center'; ctx.fillText('READY.', 0, -8);
  ctx.fillStyle = '#a78346'; for (let i = -20; i <= 20; i += 10) ctx.fillRect(i, 13, 5, 7);
  ctx.restore();
}

function drawLift() {
  const x = state.lift.x - state.camera.x, y = state.lift.y - state.camera.y;
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,.42)'; ctx.beginPath(); ctx.ellipse(8, 12, 67, 50, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = state.deckCleared ? 'rgba(255,199,77,.12)' : 'rgba(126,139,128,.07)'; ctx.beginPath(); ctx.arc(0, 0, 61, 0, TAU); ctx.fill();
  ctx.strokeStyle = state.deckCleared ? '#ffc74d' : '#58645b'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, 55, 0, TAU); ctx.stroke();
  ctx.strokeStyle = '#99804e'; ctx.lineWidth = 2; ctx.setLineDash([10, 7]); ctx.beginPath(); ctx.arc(0, 0, 43, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = state.deckCleared ? '#ffc74d' : '#5c665e'; ctx.font = '700 14px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(state.deckIndex === 2 ? 'BRIDGE' : `D${state.deckIndex + 2}`, 0, 1);
  if (state.deckCleared) { ctx.globalAlpha = .4 + Math.sin(state.time * 4) * .25; ctx.strokeStyle = '#fff2ad'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, 65 + Math.sin(state.time * 3) * 3, 0, TAU); ctx.stroke(); }
  ctx.restore();
}

function drawEmergencyLighting() {
  const deck = DECKS[state.deckIndex];
  ctx.save();
  ctx.fillStyle = `rgba(3, 6, 4, ${deck.shadow})`;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.globalCompositeOperation = 'screen';

  for (const [worldX, worldY, colorName, phase] of deck.lights) {
    const x = worldX - state.camera.x, y = worldY - state.camera.y;
    if (x < -340 || y < -340 || x > WIDTH + 340 || y > HEIGHT + 340) continue;
    const rgb = LIGHT_COLORS[colorName];
    const wave = .78 + Math.sin(state.time * (colorName === 'red' ? 3.7 : 1.7) + phase) * .16;
    const dropout = deck.emergency > .65 && Math.sin(state.time * 2.3 + phase) + Math.sin(state.time * 7.1 + phase) > 1.42 ? .24 : 1;
    const intensity = wave * dropout * (.62 + deck.emergency * .38);
    const radius = 225 + deck.emergency * 75;
    ctx.globalAlpha = .28 * intensity;
    ctx.drawImage(getLightSprite(colorName), x - radius, y - radius, radius * 2, radius * 2);
    ctx.globalAlpha = 1;

    if (deck.emergency > .3) {
      const sweep = state.time * (colorName === 'red' ? 1.45 : .62) + phase;
      ctx.save(); ctx.translate(x, y);
      ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${.035 * intensity})`;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, radius * 1.35, sweep - .22, sweep + .22); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();

  for (const [worldX, worldY, colorName, phase] of deck.lights) {
    const x = worldX - state.camera.x, y = worldY - state.camera.y;
    if (x < -30 || y < -30 || x > WIDTH + 30 || y > HEIGHT + 30) continue;
    const rgb = LIGHT_COLORS[colorName];
    const blink = .55 + Math.sin(state.time * 4 + phase) * .35;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#141a16'; ctx.beginPath(); ctx.arc(0, 0, 10, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#8b7c5b'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${blink})`; ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.fill();
    ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${blink * .55})`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, 16 + blink * 4, 0, TAU); ctx.stroke();
    ctx.restore();
  }

  if (deck.emergency > .6) {
    const alarm = .5 + Math.sin(state.time * 2.2) * .5;
    ctx.globalAlpha = .035 + alarm * .025;
    ctx.drawImage(getAlarmEdge(), 0, 0);
    ctx.globalAlpha = 1;
  }
}

function drawDroid(droid, player = false) {
  const spec = DROID_TYPES[droid.kind];
  const x = droid.x - state.camera.x, y = droid.y - state.camera.y;
  if (x < -80 || y < -80 || x > WIDTH + 80 || y > HEIGHT + 80) return;
  if (!player && droid.windup > 0) {
    const tuning = COMBAT_TUNING[state.deckIndex];
    const charge = 1 - clamp(droid.windup / tuning.windup, 0, 1);
    const range = Math.min(520, distance(droid, state.player));
    ctx.save();
    ctx.strokeStyle = `rgba(255,74,50,${.22 + charge * .68})`;
    ctx.lineWidth = 1.5 + charge * 2;
    ctx.setLineDash([8, 7]);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(droid.aimAngle) * range, y + Math.sin(droid.aimAngle) * range); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = `rgba(255,177,61,${.35 + charge * .6})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, droid.radius + 8 + charge * 5, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  if (!player && state.player.aimTarget === droid && state.player.aimTimer > 0) {
    ctx.save(); ctx.translate(x, y); ctx.strokeStyle = 'rgba(255,229,145,.88)'; ctx.lineWidth = 2;
    const r = droid.radius + 10;
    for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
      ctx.save(); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(r - 7, -r); ctx.lineTo(r, -r); ctx.lineTo(r, -r + 7); ctx.stroke(); ctx.restore();
    }
    ctx.restore();
  }
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,.42)'; ctx.beginPath(); ctx.ellipse(8, droid.radius * .66, droid.radius * 1.15, droid.radius * .58, droid.angle, 0, TAU); ctx.fill();
  ctx.rotate(droid.angle);
  const pulse = .5 + Math.sin(state.time * 5 + droid.bob) * .5;
  if (player) { ctx.strokeStyle = `rgba(255,214,111,${.35 + pulse * .25})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, droid.radius + 9 + pulse * 3, 0, TAU); ctx.stroke(); }
  if (droid.alert > .5 && !player) { ctx.fillStyle = `rgba(239,101,94,${.3 + pulse * .4})`; ctx.beginPath(); ctx.arc(0, -droid.radius - 8, 3, 0, TAU); ctx.fill(); }
  const metal = ctx.createLinearGradient(-droid.radius, -droid.radius, droid.radius, droid.radius);
  metal.addColorStop(0, droid.hitFlash ? '#fff4db' : '#aeb3a4'); metal.addColorStop(.28, '#555f56'); metal.addColorStop(.65, '#242d27'); metal.addColorStop(1, '#111713');
  ctx.lineJoin = 'round';

  if (droid.kind === '001') {
    ctx.strokeStyle = '#9a7a43'; ctx.lineWidth = 5;
    for (const a of [-1.15, 1.15, Math.PI]) { ctx.beginPath(); ctx.moveTo(Math.cos(a) * 12, Math.sin(a) * 12); ctx.lineTo(Math.cos(a) * 28, Math.sin(a) * 28); ctx.stroke(); ctx.fillStyle = spec.accent; ctx.beginPath(); ctx.arc(Math.cos(a) * 29, Math.sin(a) * 29, 4, 0, TAU); ctx.fill(); }
    ctx.fillStyle = metal; ctx.beginPath(); ctx.arc(0, 0, 20, 0, TAU); ctx.fill(); ctx.strokeStyle = '#d0c69f'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#111a15'; ctx.beginPath(); ctx.arc(0, 0, 10, 0, TAU); ctx.fill(); ctx.fillStyle = spec.accent; ctx.beginPath(); ctx.arc(5, -4, 3, 0, TAU); ctx.fill();
  } else if (droid.kind === '123') {
    ctx.fillStyle = '#171e1a'; ctx.fillRect(-24, -22, 12, 44); ctx.fillRect(12, -22, 12, 44);
    ctx.fillStyle = metal; ctx.beginPath(); ctx.moveTo(27, 0); ctx.lineTo(-19, -25); ctx.lineTo(-19, 25); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#b7b49c'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = spec.accent; ctx.fillRect(-10, -18, 5, 36); ctx.fillStyle = '#0b100d'; ctx.beginPath(); ctx.arc(9, 0, 8, 0, TAU); ctx.fill(); ctx.fillStyle = '#dffcf5'; ctx.beginPath(); ctx.arc(11, 0, 2.5, 0, TAU); ctx.fill();
  } else if (droid.kind === '247') {
    ctx.strokeStyle = '#9b7843'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(6, -17); ctx.lineTo(28, -29); ctx.lineTo(37, -20); ctx.moveTo(6, 17); ctx.lineTo(28, 29); ctx.lineTo(37, 20); ctx.stroke();
    ctx.fillStyle = metal; ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6; const px = Math.cos(a) * 29, py = Math.sin(a) * 25; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#c2bca3'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = spec.accent; ctx.fillRect(-22, -5, 44, 10); ctx.fillStyle = '#19201b'; ctx.beginPath(); ctx.arc(3, 0, 10, 0, TAU); ctx.fill(); ctx.strokeStyle = '#d6aa66'; ctx.stroke();
  } else if (droid.kind === '420') {
    ctx.fillStyle = '#111714'; ctx.fillRect(-32, -25, 15, 50); ctx.fillRect(17, -25, 15, 50);
    ctx.strokeStyle = '#676c5d'; ctx.lineWidth = 2; for (let y = -20; y < 22; y += 9) { ctx.beginPath(); ctx.moveTo(-31, y); ctx.lineTo(-18, y); ctx.moveTo(18, y); ctx.lineTo(31, y); ctx.stroke(); }
    ctx.fillStyle = metal; ctx.fillRect(-23, -24, 46, 48); ctx.strokeStyle = '#c0baa1'; ctx.lineWidth = 2; ctx.strokeRect(-23, -24, 46, 48);
    ctx.fillStyle = spec.accent; ctx.fillRect(-18, -19, 8, 38); ctx.fillStyle = '#121914'; ctx.beginPath(); ctx.arc(5, 0, 13, 0, TAU); ctx.fill(); ctx.strokeStyle = '#9b9f8d'; ctx.stroke();
    ctx.fillStyle = '#252e28'; ctx.fillRect(4, -4, 35, 8); ctx.fillStyle = '#f6c187'; ctx.fillRect(35, -2, 8, 4);
  } else if (droid.kind === '711') {
    ctx.fillStyle = '#0c110e'; ctx.fillRect(-36, -31, 65, 17); ctx.fillRect(-36, 14, 65, 17);
    ctx.strokeStyle = '#6e725f'; ctx.lineWidth = 2; for (let x = -30; x < 25; x += 10) { ctx.strokeRect(x, -29, 7, 13); ctx.strokeRect(x, 16, 7, 13); }
    ctx.fillStyle = metal; ctx.beginPath(); ctx.moveTo(-26,-27); ctx.lineTo(20,-27); ctx.lineTo(34,-15); ctx.lineTo(34,15); ctx.lineTo(20,27); ctx.lineTo(-26,27); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#c1b99e'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = spec.accent; ctx.fillRect(-19, -20, 7, 40); ctx.fillStyle = '#141b17'; ctx.beginPath(); ctx.arc(7, 0, 15, 0, TAU); ctx.fill(); ctx.strokeStyle = '#a6ae93'; ctx.stroke();
    ctx.fillStyle = '#313c33'; ctx.fillRect(6, -6, 42, 12); ctx.fillStyle = '#d4d099'; ctx.fillRect(44, -4, 7, 8);
  } else {
    ctx.strokeStyle = '#7c6b4e'; ctx.lineWidth = 8; for (let i = 0; i < 8; i++) { const a = i * TAU / 8; ctx.beginPath(); ctx.moveTo(Math.cos(a)*24, Math.sin(a)*24); ctx.lineTo(Math.cos(a)*43, Math.sin(a)*43); ctx.stroke(); }
    ctx.fillStyle = metal; ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i * TAU / 8; const px = Math.cos(a)*34, py = Math.sin(a)*34; i ? ctx.lineTo(px,py) : ctx.moveTo(px,py); } ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#d0bd9b'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = spec.accent; ctx.beginPath(); ctx.arc(0, 0, 21, 0, TAU); ctx.fill(); ctx.fillStyle = '#151916'; ctx.beginPath(); ctx.arc(0,0,14,0,TAU); ctx.fill();
    ctx.fillStyle = '#2c342d'; ctx.fillRect(6, -7, 49, 14); ctx.fillStyle = '#f6d6a1'; ctx.fillRect(49, -4, 10, 8);
  }
  ctx.restore();
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = droid.hitFlash ? '#fff' : '#f1e7c8'; ctx.font = `700 ${droid.kind === '999' ? 11 : 10}px monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(droid.kind, 0, 0);
  if (!player) {
    const ratio = clamp(droid.hp / droid.maxHp, 0, 1);
    if (ratio < 1 || droid.alert > .5) { ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(-24, -droid.radius - 14, 48, 4); ctx.fillStyle = ratio < .3 ? '#ef655e' : spec.accent; ctx.fillRect(-24, -droid.radius - 14, 48 * ratio, 4); }
  }
  ctx.restore();
}

function drawBulletsAndParticles() {
  ctx.save();
  for (const bullet of state.bullets) {
    const x = bullet.x - state.camera.x, y = bullet.y - state.camera.y;
    ctx.strokeStyle = bullet.color; ctx.lineWidth = 3; ctx.shadowColor = bullet.color; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - bullet.vx * .025, y - bullet.vy * .025); ctx.stroke();
  }
  ctx.shadowBlur = 0;
  for (const p of state.particles) { ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1); ctx.fillStyle = p.color; ctx.fillRect(p.x - state.camera.x, p.y - state.camera.y, p.size, p.size); }
  ctx.restore();
}

function drawPickups() {
  for (const pickup of state.pickups) {
    const x = pickup.x - state.camera.x, y = pickup.y - state.camera.y;
    ctx.save(); ctx.translate(x, y); ctx.rotate(pickup.spin); ctx.shadowColor = '#85d6b0'; ctx.shadowBlur = 12;
    ctx.fillStyle = '#1a2820'; ctx.strokeStyle = '#85d6b0'; ctx.lineWidth = 2; ctx.fillRect(-10,-10,20,20); ctx.strokeRect(-10,-10,20,20);
    ctx.fillStyle = '#d9f69c'; ctx.fillRect(-3,-7,6,14); ctx.fillRect(-7,-3,14,6); ctx.restore();
  }
}

function getRadarMode() {
  if (state.deckIndex === 0) return 'online';
  if (state.deckIndex === 1) {
    return Math.sin(state.time * 1.35) > .93 && Math.sin(state.time * 4.4) > .25 ? 'offline' : 'unstable';
  }
  return Math.sin(state.time * .9) + Math.sin(state.time * 2.7) > 1.02 ? 'offline' : 'unstable';
}

function renderRadar() {
  const w = radarCanvas.width, h = radarCanvas.height;
  const mode = getRadarMode();
  const degraded = state.deckIndex > 0;
  ui.radar.classList.toggle('is-degraded', degraded);
  ui.radar.classList.toggle('is-offline', mode === 'offline');
  ui.radarStatus.textContent = mode === 'online' ? 'SIGNAL LOCK' : mode === 'offline' ? 'SIGNAL LOST' : 'SIGNAL UNSTABLE';

  rx.clearRect(0, 0, w, h);
  rx.fillStyle = '#101813'; rx.fillRect(0, 0, w, h);
  rx.strokeStyle = 'rgba(133,214,176,.08)'; rx.lineWidth = 1;
  for (let x = 0; x < w; x += 44) { rx.beginPath(); rx.moveTo(x, 0); rx.lineTo(x, h); rx.stroke(); }
  for (let y = 0; y < h; y += 42) { rx.beginPath(); rx.moveTo(0, y); rx.lineTo(w, y); rx.stroke(); }

  if (mode === 'offline') {
    rx.fillStyle = 'rgba(239,101,94,.12)';
    for (let i = 0; i < 7; i++) rx.fillRect(random(0, w * .7), random(0, h), random(40, w * .6), random(2, 8));
    rx.fillStyle = '#ef655e'; rx.font = '24px monospace'; rx.textAlign = 'center'; rx.textBaseline = 'middle';
    rx.fillText('SIGNAL LOST', w / 2, h / 2);
    return;
  }

  const pad = 14;
  const sx = (w - pad * 2) / WORLD.w, sy = (h - pad * 2) / WORLD.h;
  const jitter = degraded && Math.sin(state.time * 11.7) > .84 ? random(-5, 5) : 0;
  rx.save(); rx.translate(jitter, 0);
  rx.strokeStyle = mode === 'unstable' ? '#7d7151' : '#526359'; rx.lineWidth = 2;
  rx.strokeRect(pad, pad, WORLD.w * sx, WORLD.h * sy);
  rx.fillStyle = '#39443b';
  for (const wall of state.walls) rx.fillRect(pad + wall.x * sx, pad + wall.y * sy, Math.max(2, wall.w * sx), Math.max(2, wall.h * sy));

  const point = (x, y) => [pad + x * sx, pad + y * sy];
  const [terminalX, terminalY] = point(state.terminal.x, state.terminal.y);
  rx.fillStyle = '#d596b6'; rx.fillRect(terminalX - 5, terminalY - 5, 10, 10);
  rx.fillStyle = '#3b2535'; rx.font = '10px monospace'; rx.textAlign = 'center'; rx.textBaseline = 'middle'; rx.fillText('T', terminalX, terminalY + 1);
  const [liftX, liftY] = point(state.lift.x, state.lift.y);
  rx.strokeStyle = state.deckCleared ? '#fff0a4' : '#ffc74d'; rx.lineWidth = 3; rx.strokeRect(liftX - 7, liftY - 7, 14, 14);

  for (const enemy of state.enemies) {
    const [x, y] = point(enemy.x, enemy.y);
    rx.fillStyle = '#ef655e'; rx.beginPath(); rx.arc(x, y, 4.5, 0, TAU); rx.fill();
    if (state.tutorial?.active && state.tutorial.step === 2 && enemy === state.enemies[0]) {
      rx.strokeStyle = `rgba(255,199,77,${.45 + Math.sin(state.time * 6) * .3})`; rx.lineWidth = 2;
      rx.beginPath(); rx.arc(x, y, 10 + Math.sin(state.time * 5) * 2, 0, TAU); rx.stroke();
    }
  }

  const [playerX, playerY] = point(state.player.x, state.player.y);
  rx.save(); rx.translate(playerX, playerY); rx.rotate(state.player.angle);
  rx.fillStyle = '#f6f0d8'; rx.beginPath(); rx.moveTo(9, 0); rx.lineTo(-6, -6); rx.lineTo(-3, 0); rx.lineTo(-6, 6); rx.closePath(); rx.fill(); rx.restore();
  rx.restore();
}

function render() {
  ctx.save();
  if (state.shake > 0 && state.mode === 'playing') ctx.translate(random(-state.shake, state.shake), random(-state.shake, state.shake));
  drawDeckBackground();
  drawLift(); drawTerminal(); drawEmergencyLighting(); drawPickups();
  [...state.enemies, state.player].filter(Boolean).sort((a,b) => a.y - b.y).forEach((d) => drawDroid(d, d === state.player));
  drawBulletsAndParticles();
  if (state.introTimer > 0) {
    const alpha = clamp(state.introTimer < .7 ? state.introTimer / .7 : 1, 0, 1);
    ctx.globalAlpha = alpha; ctx.fillStyle = 'rgba(7,11,8,.78)'; ctx.fillRect(0, HEIGHT / 2 - 58, WIDTH, 116);
    ctx.fillStyle = '#ffc74d'; ctx.font = '12px monospace'; ctx.textAlign = 'center'; ctx.fillText(`DECK ${DECKS[state.deckIndex].id}`, WIDTH/2, HEIGHT/2 - 12);
    ctx.fillStyle = '#f1e9d0'; ctx.font = '600 30px sans-serif'; ctx.fillText(DECKS[state.deckIndex].name, WIDTH/2, HEIGHT/2 + 25);
  }
  ctx.restore();
  renderRadar();
}

function renderTransfer() {
  const tr = state.transfer; if (!tr) return;
  const w = transferCanvas.width, h = transferCanvas.height;
  const geometry = getTransferGeometry();
  const playerTarget = getTransferTarget(tr, 'player', tr.lane);
  const playerLaneBusy = tr.pulses.some((pulse) => pulse.owner === 'player' && pulse.lane === tr.lane && !pulse.dead);
  const playerScore = tr.cores.filter((owner) => owner === 'player').length;
  const enemyScore = tr.cores.filter((owner) => owner === 'enemy').length;
  tx.fillStyle = '#121915'; tx.fillRect(0,0,w,h);
  tx.strokeStyle = 'rgba(154,170,156,.08)'; tx.lineWidth = 1;
  for (let x = 0; x < w; x += 40) { tx.beginPath(); tx.moveTo(x,0); tx.lineTo(x,h); tx.stroke(); }
  for (let y = 0; y < h; y += 40) { tx.beginPath(); tx.moveTo(0,y); tx.lineTo(w,y); tx.stroke(); }

  tx.textBaseline = 'middle';
  tx.font = '700 20px monospace'; tx.textAlign = 'left'; tx.fillStyle = '#f4d66f';
  tx.fillText(`YOU ${playerScore}`, 24, 25);
  tx.font = '11px monospace'; tx.fillStyle = '#b4ae86';
  tx.fillText(`PULSES ${tr.playerCharges}/${tr.playerCapacity}`, 24, 46);
  tx.fillStyle = tr.playerCooldown > 0 ? '#8b7860' : '#9ee0af';
  tx.fillText(tr.playerCooldown > 0 ? `RECHARGE ${tr.playerCooldown.toFixed(1)}s` : 'PULSE READY', 138, 46);

  tx.textAlign = 'right'; tx.font = '700 20px monospace'; tx.fillStyle = '#ed655e';
  tx.fillText(`${enemyScore} CENTRAL`, w - 24, 25);
  tx.font = '11px monospace'; tx.fillStyle = '#bd8b80';
  tx.fillText(`PULSES ${tr.enemyCharges}/${tr.enemyCapacity}`, w - 24, 46);
  if (tr.enemyIntent) {
    tx.fillStyle = '#ef8a74';
    tx.fillText(`ROUTE ${tr.enemyIntent.lane + 1} IN ${Math.max(0, tr.enemyIntent.time).toFixed(1)}s`, w - 138, 46);
  }

  tx.textAlign = 'center';
  tx.font = '700 13px monospace'; tx.fillStyle = '#c8c3a6'; tx.fillText('CAPTURE 5 OF 9 CORES', w / 2, 22);
  tx.font = '700 25px monospace'; tx.fillStyle = tr.time < 3 ? '#ef655e' : '#f2ead2';
  tx.fillText(Math.max(0, tr.time).toFixed(1), w / 2, 47);

  const drawPath = (start, end, color, width = 1, dash = []) => {
    tx.save(); tx.strokeStyle = color; tx.lineWidth = width; tx.setLineDash(dash);
    tx.beginPath(); tx.moveTo(start.x, start.y);
    tx.bezierCurveTo(lerp(start.x, end.x, .42), start.y, lerp(start.x, end.x, .66), end.y, end.x, end.y);
    tx.stroke(); tx.restore();
  };

  for (let lane = 0; lane < 5; lane++) {
    const playerPort = geometry.playerPorts[lane];
    const enemyPort = geometry.enemyPorts[lane];
    for (const coreIndex of TRANSFER_ROUTES[lane]) {
      drawPath(playerPort, geometry.cores[coreIndex], 'rgba(111,133,116,.2)');
      drawPath(enemyPort, geometry.cores[coreIndex], 'rgba(126,91,82,.16)');
    }
    const selected = lane === tr.lane;
    tx.fillStyle = selected ? '#f4d66f' : '#36453b'; tx.strokeStyle = selected ? '#fff0a6' : '#708075'; tx.lineWidth = selected ? 3 : 1;
    tx.beginPath(); tx.arc(playerPort.x, playerPort.y, selected ? 11 : 8, 0, TAU); tx.fill(); tx.stroke();
    tx.fillStyle = selected ? '#f4d66f' : '#79887c'; tx.textAlign = 'left'; tx.font = '11px monospace'; tx.fillText(`R${lane + 1}`, 18, playerPort.y);

    const intent = tr.enemyIntent?.lane === lane;
    tx.fillStyle = intent ? '#e96359' : '#3e332f'; tx.strokeStyle = intent ? '#ff9882' : '#80635c'; tx.lineWidth = intent ? 3 : 1;
    tx.beginPath(); tx.arc(enemyPort.x, enemyPort.y, intent ? 11 : 8, 0, TAU); tx.fill(); tx.stroke();
    tx.fillStyle = intent ? '#ef7b69' : '#8c7069'; tx.textAlign = 'right'; tx.fillText(`R${lane + 1}`, w - 18, enemyPort.y);
  }

  if (playerTarget !== null) {
    drawPath(geometry.playerPorts[tr.lane], geometry.cores[playerTarget], '#f4d66f', 4, [10, 7]);
  }
  if (tr.enemyIntent) {
    const pulse = .45 + Math.sin(tr.time * 8) * .18;
    drawPath(geometry.enemyPorts[tr.enemyIntent.lane], geometry.cores[tr.enemyIntent.targetCore], `rgba(239,101,88,${pulse})`, 4, [7, 6]);
  }

  tr.cores.forEach((owner, i) => {
    const core = geometry.cores[i];
    const selectedTarget = i === playerTarget;
    const enemyTarget = i === tr.enemyIntent?.targetCore;
    tx.fillStyle = owner === 'player' ? '#d7b94f' : owner === 'enemy' ? '#b94d48' : '#172019';
    tx.fillRect(core.x - 29, core.y - 23, 58, 46);
    tx.strokeStyle = tr.coreFlash[i] > 0 ? '#fff7ce' : selectedTarget ? '#f4d66f' : enemyTarget ? '#ef655e' : '#798375';
    tx.lineWidth = tr.coreFlash[i] > 0 ? 5 : selectedTarget || enemyTarget ? 3 : 1.5;
    tx.strokeRect(core.x - 29, core.y - 23, 58, 46);
    tx.textAlign = 'center'; tx.font = '700 12px monospace'; tx.fillStyle = owner ? '#101712' : '#a49e7f';
    tx.fillText(TRANSFER_CORE_LABELS[i], core.x, core.y - 7);
    tx.font = '9px monospace'; tx.fillStyle = owner ? '#1a211b' : '#667269';
    tx.fillText(owner === 'player' ? 'YOU' : owner === 'enemy' ? 'CENTRAL' : 'OPEN', core.x, core.y + 10);
  });

  for (const pulse of tr.pulses) {
    const { x, y } = transferPulsePosition(pulse, geometry);
    const color = pulse.owner === 'player' ? '#ffdb70' : '#ed655e';
    tx.shadowColor = color; tx.shadowBlur = 15; tx.fillStyle = color; tx.strokeStyle = '#fff4cf'; tx.lineWidth = 1;
    tx.beginPath(); tx.arc(x, y, 9, 0, TAU); tx.fill(); tx.stroke(); tx.shadowBlur = 0;
    tx.fillStyle = pulse.owner === 'player' ? '#322b14' : '#341815'; tx.font = '700 7px monospace'; tx.textAlign = 'center';
    tx.fillText(pulse.owner === 'player' ? 'YOU' : 'CC', x, y + .5);
  }

  tx.textAlign = 'center'; tx.font = '11px monospace';
  tx.fillStyle = tr.eventTimer > 0 ? '#d9d1aa' : playerLaneBusy ? '#d8b96c' : playerTarget === null ? '#9ee0af' : '#a9b4aa';
  tx.fillText(tr.eventTimer > 0 ? tr.event : playerLaneBusy
    ? `ROUTE ${tr.lane + 1} BUSY // WAIT OR SELECT ANOTHER`
    : playerTarget === null ? `ROUTE ${tr.lane + 1} SECURE // SELECT ANOTHER`
    : `ROUTE ${tr.lane + 1} TARGETS CORE ${TRANSFER_CORE_LABELS[playerTarget]}`, w / 2, h - 18);

  if (tr.intro > 0) {
    tx.fillStyle = 'rgba(7,11,8,.94)'; tx.fillRect(0,0,w,h);
    tx.textAlign = 'center'; tx.fillStyle = '#f4d66f'; tx.font = '700 29px monospace'; tx.fillText('CAPTURE 5 OF 9 CORES', w/2, 105);
    tx.fillStyle = '#e8e1c7'; tx.font = '13px monospace'; tx.fillText('EACH ROUTE REACHES THREE NAMED CORES', w/2, 145);
    tx.fillStyle = '#f4d66f'; tx.fillText(`YOUR LINK // ${tr.playerCapacity} PULSES // ${tr.playerRecharge.toFixed(2)}s RECHARGE`, w/2, 185);
    tx.fillStyle = '#ef7b69'; tx.fillText(`TARGET LINK // ${tr.enemyCapacity} PULSES // ${tr.enemyTelegraph.toFixed(2)}s WARNING`, w/2, 215);
    tx.fillStyle = '#9fa99f'; tx.fillText('YELLOW PATH = YOUR NEXT TARGET    RED PATH = CENTRAL COMMAND INTENT', w/2, 260);
    tx.fillStyle = '#f0ead5'; tx.fillText('↑ ↓ SELECT ROUTE    SPACE COMMIT PULSE    MATCH A ROUTE TO INTERCEPT', w/2, 300);
    if (tr.training) { tx.fillStyle = '#9ee0af'; tx.fillText('GUIDED LINK // THREE EXTRA PULSES // CENTRAL COMMAND DELAYED', w/2, 340); }
    tx.fillStyle = '#7e897f'; tx.font = '10px monospace'; tx.fillText(`LINK OPENS IN ${Math.max(1, Math.ceil(tr.intro))}`, w/2, 388);
  }
  if (tr.finished) {
    const won = playerScore >= 5;
    tx.fillStyle = 'rgba(7,11,8,.94)'; tx.fillRect(0,0,w,h);
    tx.textAlign = 'center'; tx.fillStyle = won ? '#9ee0af' : '#ef655e'; tx.font = '700 34px monospace'; tx.fillText(tr.resultTitle, w/2, h/2 - 25);
    tx.fillStyle = '#e4dcc2'; tx.font = '700 14px monospace'; tx.fillText(tr.resultReason, w/2, h/2 + 20);
    tx.fillStyle = '#78847b'; tx.font = '10px monospace'; tx.fillText('CLOSING LINK...', w/2, h/2 + 56);
  }
}

const ACTIVE_RENDER_MODES = new Set(['playing', 'transfer']);
const FRAME_INTERVAL = 1000 / 30;
let lastRenderedMode = null;

function frame(now) {
  const active = ACTIVE_RENDER_MODES.has(state.mode);
  if (!active) {
    state.lastTime = now;
    if (lastRenderedMode !== state.mode) {
      render();
      lastRenderedMode = state.mode;
    }
    pressed.clear();
    setTimeout(() => requestAnimationFrame(frame), 100);
    return;
  }

  const elapsed = now - state.lastTime;
  if (elapsed < FRAME_INTERVAL - 1) {
    requestAnimationFrame(frame);
    return;
  }

  const dt = clamp(elapsed / 1000, 0, .05);
  state.lastTime = now;
  update(dt);
  render();
  lastRenderedMode = state.mode;
  pressed.clear();
  requestAnimationFrame(frame);
}

document.addEventListener('keydown', (event) => {
  if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code)) event.preventDefault();
  if (!keys.has(event.code)) pressed.add(event.code);
  keys.add(event.code);
  if (event.code === 'Enter' && state.mode === 'start') startGame();
  else if (event.code === 'Enter' && state.mode === 'end') startGame();
  else if (event.code === 'KeyE' && state.mode === 'terminal') closeTerminal();
  else if (event.code === 'KeyE' && state.mode === 'dossier') confirmDossier();
  else if (event.code === 'Escape' && state.mode === 'dossier') closeDossier();
  else if (event.code === 'KeyT' && state.mode === 'playing' && state.tutorial?.active) dismissTutorial();
  else if ((event.code === 'KeyP' || event.code === 'Escape') && ['playing','paused'].includes(state.mode)) pauseGame();
});
document.addEventListener('keyup', (event) => keys.delete(event.code));
window.addEventListener('blur', () => { keys.clear(); if (state.mode === 'playing') pauseGame(true); });

ui.startButton.addEventListener('click', startGame);
ui.restartButton.addEventListener('click', startGame);
ui.resumeButton.addEventListener('click', () => pauseGame(false));
ui.soundButton.addEventListener('click', toggleSound);

window.__SOLADROID__ = {
  getState: () => ({ mode: state.mode, deck: state.deckIndex + 1, score: state.score, player: state.player ? { kind: state.player.kind, hp: state.player.hp, x: state.player.x, y: state.player.y } : null, hostiles: state.enemies.length, cleared: state.deckCleared, combatUnlocked: state.combatUnlocked, tutorialStep: state.tutorial?.active ? state.tutorial.step : null }),
  start: startGame,
  clearDeck: () => { [...state.enemies].forEach(destroyEnemy); },
  teleport: (x, y) => { if (state.player) { state.player.x = x; state.player.y = y; } },
  teleportToNearest: () => {
    const target = [...state.enemies].sort((a, b) => distance(a, state.player) - distance(b, state.player))[0];
    if (target) { state.player.x = target.x - target.radius - state.player.radius - 28; state.player.y = target.y; }
  },
  setMode: (mode) => { state.mode = mode; }
};

loadDeck(0, true);
state.mode = 'start';
state.toastTimer = 0;
ui.toast.classList.remove('is-visible');
requestAnimationFrame(frame);
