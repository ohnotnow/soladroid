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
    'tutorialBody', 'tutorialProgress'
  ].map((id) => [id, document.querySelector(`#${id}`)])
);

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const TAU = Math.PI * 2;
const keys = new Set();
const pressed = new Set();

const DROID_TYPES = {
  '001': { name: 'INFLUENCE', maxHp: 66, speed: 218, fireRate: .22, damage: 12, radius: 22, accent: '#f4d66f', rank: 1, decay: .06 },
  '123': { name: 'SCOUT', maxHp: 68, speed: 205, fireRate: .27, damage: 8, radius: 25, accent: '#74d4c3', rank: 2, decay: .08 },
  '247': { name: 'ENGINEER', maxHp: 102, speed: 166, fireRate: .48, damage: 13, radius: 29, accent: '#d49b59', rank: 3, decay: .11 },
  '420': { name: 'SECURITY', maxHp: 142, speed: 145, fireRate: .42, damage: 15, radius: 31, accent: '#e76e58', rank: 4, decay: .14 },
  '711': { name: 'BATTLE', maxHp: 205, speed: 122, fireRate: .58, damage: 22, radius: 35, accent: '#b4ce72', rank: 6, decay: .18 },
  '999': { name: 'COMMAND', maxHp: 290, speed: 105, fireRate: .52, damage: 29, radius: 42, accent: '#e44f64', rank: 8, decay: .22 }
};

const COMBAT_TUNING = [
  { cadence: 4.2, spread: .38, bulletSpeed: 275, damage: .35, windup: .68, pickup: .72, killHeal: .12, aimCone: 2.05 },
  { cadence: 3.2, spread: .27, bulletSpeed: 330, damage: .7, windup: .5, pickup: .5, killHeal: .08, aimCone: 1.45 },
  { cadence: 2.5, spread: .18, bulletSpeed: 390, damage: 1, windup: .36, pickup: .36, killHeal: .05, aimCone: 1.05 }
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
    droids: [['123', 310, 980], ['247', 670, 210], ['247', 680, 1180], ['420', 1260, 510], ['420', 1260, 870], ['711', 1730, 380], ['711', 1870, 1040]]
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
    droids: [['420', 590, 240], ['420', 590, 1160], ['711', 960, 420], ['711', 960, 980], ['711', 1350, 520], ['711', 1350, 900], ['999', 1700, 700]]
  }
];

const WORLD = { w: 2240, h: 1400, border: 72 };
const state = {
  mode: 'start', deckIndex: 0, score: 0, time: 0, camera: { x: 0, y: 0 },
  player: null, enemies: [], bullets: [], particles: [], pickups: [], decorations: [],
  walls: [], terminal: null, lift: null, deckCleared: false, transfer: null,
  sound: localStorage.getItem('paradroid-sound') !== 'off', highScore: Number(localStorage.getItem('paradroid-high-score') || 0),
  toastTimer: 0, shake: 0, lastTime: performance.now(), gamepadButtons: [], introTimer: 0,
  combatUnlocked: true, tutorial: null
};

const TUTORIAL_STEPS = [
  { title: 'GET YOUR BEARINGS', body: 'Move with <kbd>WASD</kbd> or the arrow keys. Your droid fires in the last direction it travelled.' },
  { title: 'TEST THE WEAPON', body: 'Press <kbd>SPACE</kbd> to fire. Aim roughly toward a target; guidance will fine-tune the shot. A red targeting line warns when a hostile is about to fire.' },
  { title: 'TAKE A BETTER BODY', body: 'Approach a droid and press <kbd>E</kbd>. Win the circuit duel to possess its stronger chassis.' },
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
  const needsTutorial = localStorage.getItem('paradroid-tutorial') !== 'done';
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
  [ui.startScreen, ui.terminal, ui.transfer, ui.pauseScreen, ui.endScreen].forEach((el) => el.classList.remove('is-visible'));
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
    localStorage.setItem('paradroid-tutorial', 'done');
  }
  audio.tone(300 + step * 90, .08, 'triangle', .025, 80);
  updateTutorialUi();
}

function dismissTutorial() {
  if (!state.tutorial) return;
  state.tutorial.active = false;
  state.combatUnlocked = true;
  localStorage.setItem('paradroid-tutorial', 'done');
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
  localStorage.setItem('paradroid-sound', state.sound ? 'on' : 'off');
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
  const attackerCap = [1, 2, 3][state.deckIndex];
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
  if (target) return { type: 'droid', value: target, label: `<kbd>E</kbd> INITIATE TRANSFER // ${target.kind}` };
  if (distance(player, state.terminal) < 105) return { type: 'terminal', value: state.terminal, label: '<kbd>E</kbd> ACCESS DECK TERMINAL' };
  if (distance(player, state.lift) < 120) return { type: 'lift', value: state.lift, label: state.deckCleared ? '<kbd>E</kbd> ENTER LIFT' : 'LIFT LOCKED // HOSTILES REMAIN' };
  return null;
}

function interact() {
  const nearby = getNearbyInteractable();
  if (!nearby) return;
  if (nearby.type === 'droid') startTransfer(nearby.value);
  if (nearby.type === 'terminal') openTerminal();
  if (nearby.type === 'lift') {
    if (!state.deckCleared) { audio.fail(); toast('ACCESS DENIED // PURGE HOSTILES'); return; }
    if (state.deckIndex === DECKS.length - 1) endGame(true);
    else { state.score += 500; loadDeck(state.deckIndex + 1); }
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
  state.mode = 'transfer';
  state.transfer = {
    target, time: 12, lane: 2, cores: Array(9).fill(null), pulses: [],
    playerCooldown: 0, enemyCooldown: .5, playerRank, enemyRank,
    intro: 1.25, finished: false,
    training: Boolean(state.tutorial?.active && state.tutorial.step === 2), playerPulsesSent: 0
  };
  ui.transferPlayer.textContent = state.player.kind;
  ui.transferEnemy.textContent = target.kind;
  ui.transferTitle.textContent = state.transfer.training ? 'GUIDED CIRCUIT' : 'CIRCUIT DUEL';
  ui.transfer.classList.add('is-visible');
  audio.transfer();
}

function sendTransferPulse(owner, lane) {
  const tr = state.transfer;
  if (!tr || tr.intro > 0 || tr.finished) return;
  if (owner === 'player') {
    if (tr.playerCooldown > 0) return;
    tr.playerCooldown = clamp(.48 - tr.playerRank * .025, .25, .48);
    tr.playerPulsesSent++;
  } else {
    if (tr.enemyCooldown > 0) return;
    tr.enemyCooldown = tr.training ? 1.05 : clamp(.86 - tr.enemyRank * .025, .55, .86);
  }
  tr.pulses.push({ owner, lane, progress: owner === 'player' ? 0 : 1, speed: owner === 'player' ? .58 + tr.playerRank * .012 : -.52 - tr.enemyRank * .016 });
  audio.tone(owner === 'player' ? 240 + lane * 25 : 130 + lane * 18, .045, 'square', .018, owner === 'player' ? 70 : -45);
}

function claimCore(owner) {
  const cores = state.transfer.cores;
  const order = owner === 'player' ? [...cores.keys()] : [...cores.keys()].reverse();
  const open = order.find((i) => cores[i] === null);
  if (open !== undefined) cores[open] = owner;
  else {
    const victim = order.find((i) => cores[i] !== owner);
    if (victim !== undefined) cores[victim] = owner;
  }
  audio.tone(owner === 'player' ? 510 : 105, .09, 'triangle', .028, owner === 'player' ? 90 : -25);
}

function updateTransfer(dt) {
  const tr = state.transfer;
  if (!tr || tr.finished) return;
  if (tr.intro > 0) { tr.intro -= dt; renderTransfer(); return; }
  tr.time -= dt; tr.playerCooldown -= dt; tr.enemyCooldown -= dt;
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

  if (tr.enemyCooldown <= 0) {
    const incoming = tr.pulses.filter((p) => p.owner === 'player' && p.progress > .52).sort((a, b) => b.progress - a.progress)[0];
    const lane = incoming && Math.random() < .36 ? incoming.lane : Math.floor(Math.random() * 5);
    sendTransferPulse('enemy', lane);
  }

  for (const pulse of tr.pulses) pulse.progress += pulse.speed * dt;
  for (let a = 0; a < tr.pulses.length; a++) {
    for (let b = a + 1; b < tr.pulses.length; b++) {
      const p1 = tr.pulses[a], p2 = tr.pulses[b];
      if (p1.lane === p2.lane && p1.owner !== p2.owner && Math.abs(p1.progress - p2.progress) < .045) {
        p1.dead = p2.dead = true; audio.tone(70, .05, 'sawtooth', .02, -20);
      }
    }
  }
  for (const pulse of tr.pulses) {
    if (!pulse.dead && pulse.owner === 'player' && pulse.progress >= 1) { pulse.dead = true; claimCore('player'); }
    if (!pulse.dead && pulse.owner === 'enemy' && pulse.progress <= 0) { pulse.dead = true; claimCore('enemy'); }
  }
  tr.pulses = tr.pulses.filter((p) => !p.dead);
  if (tr.time <= 0) finishTransfer();
  renderTransfer();
}

function finishTransfer() {
  const tr = state.transfer;
  if (!tr || tr.finished) return;
  tr.finished = true;
  let playerScore = tr.cores.filter((c) => c === 'player').length;
  let enemyScore = tr.cores.filter((c) => c === 'enemy').length;
  if (tr.training && tr.playerPulsesSent >= 3) {
    while (playerScore <= enemyScore) {
      const assisted = tr.cores.findIndex((core) => core !== 'player');
      if (assisted < 0) break;
      tr.cores[assisted] = 'player';
      playerScore = tr.cores.filter((c) => c === 'player').length;
      enemyScore = tr.cores.filter((c) => c === 'enemy').length;
    }
  }
  const success = playerScore > enemyScore;
  setTimeout(() => {
    if (success) completeTransferSuccess(tr.target);
    else completeTransferFail(tr.target);
  }, 700);
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
  localStorage.setItem('paradroid-high-score', state.highScore);
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

function drawFloor() {
  const deck = DECKS[state.deckIndex];
  ctx.fillStyle = deck.tone; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const tile = 80;
  const startX = Math.floor(state.camera.x / tile) * tile;
  const startY = Math.floor(state.camera.y / tile) * tile;
  for (let y = startY; y < state.camera.y + HEIGHT + tile; y += tile) {
    for (let x = startX; x < state.camera.x + WIDTH + tile; x += tile) {
      const sx = x - state.camera.x, sy = y - state.camera.y;
      const even = ((x / tile + y / tile) & 1) === 0;
      ctx.fillStyle = even ? 'rgba(255,255,255,.018)' : 'rgba(0,0,0,.025)';
      ctx.fillRect(sx + 2, sy + 2, tile - 4, tile - 4);
      ctx.strokeStyle = 'rgba(190,205,187,.09)'; ctx.lineWidth = 1;
      ctx.strokeRect(sx + .5, sy + .5, tile - 1, tile - 1);
      ctx.fillStyle = 'rgba(211,187,127,.26)';
      for (const [bx, by] of [[7,7],[tile-7,7],[7,tile-7],[tile-7,tile-7]]) { ctx.beginPath(); ctx.arc(sx + bx, sy + by, 1.6, 0, TAU); ctx.fill(); }
    }
  }
  const grad = ctx.createRadialGradient(WIDTH * .5, HEIGHT * .5, 80, WIDTH * .5, HEIGHT * .5, 700);
  grad.addColorStop(0, 'rgba(255,226,154,.025)'); grad.addColorStop(1, 'rgba(0,0,0,.34)');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function drawWall(wall) {
  const x = wall.x - state.camera.x, y = wall.y - state.camera.y;
  if (x > WIDTH + 20 || y > HEIGHT + 20 || x + wall.w < -20 || y + wall.h < -20) return;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.34)'; ctx.fillRect(x + 12, y + 15, wall.w, wall.h);
  const grad = ctx.createLinearGradient(x, y, x + Math.min(wall.w, 80), y + Math.min(wall.h, 80));
  grad.addColorStop(0, '#6b7469'); grad.addColorStop(.18, '#313b34'); grad.addColorStop(.72, '#1b241e'); grad.addColorStop(1, '#0e1511');
  ctx.fillStyle = grad; ctx.fillRect(x, y, wall.w, wall.h);
  ctx.strokeStyle = '#8c8c73'; ctx.lineWidth = 2; ctx.strokeRect(x + 2, y + 2, wall.w - 4, wall.h - 4);
  ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.strokeRect(x + 9, y + 9, wall.w - 18, wall.h - 18);
  ctx.strokeStyle = 'rgba(209,194,148,.25)'; ctx.setLineDash([16, 9]); ctx.strokeRect(x + 14, y + 14, wall.w - 28, wall.h - 28); ctx.setLineDash([]);
  ctx.fillStyle = '#b08a49';
  for (const [bx, by] of [[10,10],[wall.w-10,10],[10,wall.h-10],[wall.w-10,wall.h-10]]) { ctx.beginPath(); ctx.arc(x + bx, y + by, 3.5, 0, TAU); ctx.fill(); ctx.fillStyle = '#242a24'; ctx.fillRect(x + bx - 2, y + by - .5, 4, 1); ctx.fillStyle = '#b08a49'; }
  ctx.restore();
}

function drawOuterWalls() {
  const b = WORLD.border;
  [[0,0,WORLD.w,b],[0,WORLD.h-b,WORLD.w,b],[0,0,b,WORLD.h],[WORLD.w-b,0,b,WORLD.h]].forEach(([x,y,w,h]) => drawWall({x,y,w,h}));
}

function drawDecoration(decor) {
  const x = decor.x - state.camera.x, y = decor.y - state.camera.y;
  if (x < -50 || y < -50 || x > WIDTH + 50 || y > HEIGHT + 50) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(decor.rotation); ctx.globalAlpha = .48;
  if (decor.type === 0) {
    ctx.fillStyle = '#1c241f'; ctx.fillRect(-25, -14, 50, 28); ctx.strokeStyle = '#758075'; ctx.strokeRect(-22, -11, 44, 22);
    ctx.fillStyle = '#ae874a'; for (let i = -14; i <= 14; i += 14) ctx.fillRect(i, -7, 5, 14);
  } else if (decor.type === 1) {
    ctx.strokeStyle = '#151b17'; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(0, 0, 23, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#807757'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#131915'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, TAU); ctx.fill();
  } else if (decor.type === 2) {
    ctx.fillStyle = '#1a221c'; ctx.fillRect(-30, -6, 60, 12); ctx.fillStyle = '#8d7041';
    for (let i = -26; i < 30; i += 12) ctx.fillRect(i, -4, 6, 8);
  } else {
    ctx.strokeStyle = '#7a4d39'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-25, 13); ctx.bezierCurveTo(-10, -25, 10, 26, 25, -12); ctx.stroke();
    ctx.strokeStyle = '#2d3830'; ctx.lineWidth = 7; ctx.stroke();
  }
  ctx.restore();
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
    const glow = ctx.createRadialGradient(x, y, 4, x, y, radius);
    glow.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${.28 * intensity})`);
    glow.addColorStop(.3, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${.14 * intensity})`);
    glow.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
    ctx.fillStyle = glow; ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);

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
    const edge = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, HEIGHT * .25, WIDTH / 2, HEIGHT / 2, WIDTH * .72);
    edge.addColorStop(.55, 'rgba(120,20,10,0)'); edge.addColorStop(1, `rgba(145,22,12,${.035 + alarm * .025})`);
    ctx.fillStyle = edge; ctx.fillRect(0, 0, WIDTH, HEIGHT);
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
  drawFloor();
  state.decorations.forEach(drawDecoration);
  drawOuterWalls(); state.walls.forEach(drawWall);
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
  tx.fillStyle = '#121915'; tx.fillRect(0,0,w,h);
  tx.strokeStyle = 'rgba(154,170,156,.08)'; tx.lineWidth = 1;
  for (let x = 0; x < w; x += 40) { tx.beginPath(); tx.moveTo(x,0); tx.lineTo(x,h); tx.stroke(); }
  for (let y = 0; y < h; y += 40) { tx.beginPath(); tx.moveTo(0,y); tx.lineTo(w,y); tx.stroke(); }
  const left = 100, right = w - 100, top = 80, gap = 65;
  tx.font = '12px monospace'; tx.textBaseline = 'middle';
  for (let lane = 0; lane < 5; lane++) {
    const y = top + lane * gap;
    tx.strokeStyle = lane === tr.lane ? '#f3d06d' : '#59675c'; tx.lineWidth = lane === tr.lane ? 4 : 2;
    tx.beginPath(); tx.moveTo(left,y); tx.lineTo(right,y); tx.stroke();
    for (let x = left + 60; x < right - 40; x += 90) { tx.fillStyle = '#263129'; tx.beginPath(); tx.arc(x,y,6,0,TAU); tx.fill(); tx.strokeStyle = '#7e876f'; tx.lineWidth = 1; tx.stroke(); }
    tx.fillStyle = lane === tr.lane ? '#ffc74d' : '#7a887d'; tx.fillText(`BUS ${lane + 1}`, 25, y);
  }
  tx.fillStyle = '#263128'; tx.fillRect(w/2 - 38, 30, 76, h-60); tx.strokeStyle = '#a4844c'; tx.lineWidth = 2; tx.strokeRect(w/2 - 38,30,76,h-60);
  tr.cores.forEach((owner, i) => {
    const y = 52 + i * 42;
    tx.fillStyle = owner === 'player' ? '#f4d66f' : owner === 'enemy' ? '#e45f5f' : '#111713';
    tx.fillRect(w/2 - 22, y, 44, 26); tx.strokeStyle = '#a79b78'; tx.strokeRect(w/2 - 22,y,44,26);
    if (owner) { tx.fillStyle = '#172018'; tx.font = '700 11px monospace'; tx.textAlign = 'center'; tx.fillText(owner === 'player' ? '001' : 'CPU', w/2, y+13); }
  });
  tx.textAlign = 'left';
  for (const pulse of tr.pulses) {
    const x = lerp(left, right, pulse.progress), y = top + pulse.lane * gap;
    const color = pulse.owner === 'player' ? '#ffdb70' : '#ed655e';
    tx.shadowColor = color; tx.shadowBlur = 14; tx.fillStyle = color;
    tx.beginPath(); tx.moveTo(x + (pulse.owner === 'player' ? 12 : -12), y); tx.lineTo(x - (pulse.owner === 'player' ? 8 : -8), y-8); tx.lineTo(x - (pulse.owner === 'player' ? 8 : -8), y+8); tx.closePath(); tx.fill(); tx.shadowBlur = 0;
  }
  const pCount = tr.cores.filter((c) => c === 'player').length, eCount = tr.cores.filter((c) => c === 'enemy').length;
  tx.font = '700 24px monospace'; tx.fillStyle = '#f4d66f'; tx.textAlign = 'left'; tx.fillText(`YOU ${pCount}`, 28, 30);
  tx.fillStyle = '#ed655e'; tx.textAlign = 'right'; tx.fillText(`${eCount} CPU`, w-28, 30);
  tx.textAlign = 'center'; tx.fillStyle = tr.time < 3 ? '#ef655e' : '#eae2c8'; tx.font = '700 28px monospace'; tx.fillText(Math.max(0,tr.time).toFixed(1), w/2, h-18);
  if (tr.intro > 0) { tx.fillStyle = 'rgba(8,12,9,.82)'; tx.fillRect(0,0,w,h); tx.fillStyle = '#ffc74d'; tx.font = '700 34px monospace'; tx.fillText('LINKING...', w/2, h/2); }
  if (tr.finished) { const won = pCount > eCount; tx.fillStyle = 'rgba(8,12,9,.86)'; tx.fillRect(0,0,w,h); tx.fillStyle = won ? '#9ee0af' : '#ef655e'; tx.font = '700 36px monospace'; tx.fillText(won ? 'TRANSFER ACCEPTED' : 'TRANSFER REJECTED', w/2,h/2); }
}

function frame(now) {
  const dt = clamp((now - state.lastTime) / 1000, 0, .033);
  state.lastTime = now;
  update(dt);
  render();
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
  else if (event.code === 'KeyT' && state.mode === 'playing' && state.tutorial?.active) dismissTutorial();
  else if ((event.code === 'KeyP' || event.code === 'Escape') && ['playing','paused'].includes(state.mode)) pauseGame();
});
document.addEventListener('keyup', (event) => keys.delete(event.code));
window.addEventListener('blur', () => { keys.clear(); if (state.mode === 'playing') pauseGame(true); });

ui.startButton.addEventListener('click', startGame);
ui.restartButton.addEventListener('click', startGame);
ui.resumeButton.addEventListener('click', () => pauseGame(false));
ui.soundButton.addEventListener('click', toggleSound);

window.__PARADROID__ = {
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
