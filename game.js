// CYBER PULSE - Neon Synthwave 3D Perspective Runner
// Pure Canvas 2D + Web Audio API synth sound effects

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// UI Elements
const scoreDisplay = document.getElementById('score-display');
const highScoreDisplay = document.getElementById('high-score-display');
const speedBar = document.getElementById('speed-bar');
const multiplierBadge = document.getElementById('multiplier-badge');
const boostMeterFill = document.getElementById('boost-meter-fill');
const boostStatusText = document.getElementById('boost-status-text');

const startOverlay = document.getElementById('start-overlay');
const gameOverOverlay = document.getElementById('game-over-overlay');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

const finalScore = document.getElementById('final-score');
const finalDistance = document.getElementById('final-distance');
const finalOrbs = document.getElementById('final-orbs');

// Audio Synthesizer (Web Audio API)
class SoundFX {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playJump() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(580, now + 0.18);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  playOrb() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.12);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  playBoost() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.45);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.45);
  }

  playCrash() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.35);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  }
}

const sfx = new SoundFX();

// Game State
let width = window.innerWidth;
let height = window.innerHeight;

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;
}
window.addEventListener('resize', resize);
resize();

// Perspective Constants
const FOV = 280;
const ROAD_LANES = [-1, 0, 1]; // Left, Middle, Right lanes
const LANE_WIDTH_WORLD = 110;
const HORIZON_RATIO = 0.48; // where the horizon sits on screen

let state = {
  active: false,
  score: 0,
  highScore: parseInt(localStorage.getItem('cyberpulse_high_score') || '0', 10),
  distance: 0,
  speed: 380,
  baseSpeed: 380,
  maxSpeed: 850,
  multiplier: 1.0,
  boostEnergy: 0, // 0 to 100
  isBoosting: false,
  boostTimer: 0,
  orbsCollected: 0,
  shakeAmount: 0,
  gridOffset: 0
};

highScoreDisplay.textContent = String(state.highScore).padStart(6, '0');

// Player Setup
const player = {
  lane: 0, // -1: left, 0: center, 1: right
  targetX: 0,
  worldX: 0,
  worldY: 0, // Jump height off ground
  velY: 0,
  isGrounded: true,
  jumpStrength: 520,
  gravity: 1400,
  rollAngle: 0
};

// World Entities
let obstacles = [];
let collectibles = [];
let particles = [];

// Input handling
const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.key.toLowerCase()] = true;

  if (state.active) {
    if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
      moveLane(-1);
    } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
      moveLane(1);
    } else if ((e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') && player.isGrounded) {
      jump();
    } else if (e.key === ' ' || e.code === 'Space') {
      activateBoost();
    }
  }
});

window.addEventListener('keyup', (e) => {
  keys[e.key.toLowerCase()] = false;
});

function moveLane(dir) {
  const nextLane = player.lane + dir;
  if (nextLane >= -1 && nextLane <= 1) {
    player.lane = nextLane;
    player.targetX = player.lane * LANE_WIDTH_WORLD;
    player.rollAngle = -dir * 0.28;
  }
}

function jump() {
  player.velY = player.jumpStrength;
  player.isGrounded = false;
  sfx.playJump();
  createJumpSparks();
}

function activateBoost() {
  if (state.boostEnergy >= 100 && !state.isBoosting) {
    state.isBoosting = true;
    state.boostTimer = 4.0; // 4 seconds of hyper boost
    state.shakeAmount = 14;
    sfx.playBoost();
  }
}

function createJumpSparks() {
  for (let i = 0; i < 15; i++) {
    particles.push({
      x: player.worldX + (Math.random() - 0.5) * 30,
      y: 5,
      z: 100,
      vx: (Math.random() - 0.5) * 200,
      vy: Math.random() * 150 + 50,
      vz: -Math.random() * 200,
      color: '#00f3ff',
      life: 0.45,
      maxLife: 0.45,
      size: 3
    });
  }
}

// Spawning Logic
let spawnTimer = 0;

function spawnWorldObjects(dt) {
  spawnTimer += dt;
  const currentInterval = state.isBoosting ? 0.35 : Math.max(0.48, 1.1 - (state.speed / 1200));

  if (spawnTimer >= currentInterval) {
    spawnTimer = 0;
    const lane = ROAD_LANES[Math.floor(Math.random() * ROAD_LANES.length)];
    const zSpawn = 2200;

    const randType = Math.random();

    if (randType > 0.42) {
      // Spawn Obstacle (Barrier or Energy Wall)
      obstacles.push({
        lane: lane,
        worldX: lane * LANE_WIDTH_WORLD,
        worldZ: zSpawn,
        width: 65,
        height: Math.random() > 0.5 ? 45 : 75, // low hurdles can be jumped, tall walls must be dodged
        isTall: false
      });
      // Flag tall walls
      const lastObstacle = obstacles[obstacles.length - 1];
      if (lastObstacle.height > 60) {
        lastObstacle.isTall = true;
      }
    } else {
      // Spawn Energy Orb
      collectibles.push({
        lane: lane,
        worldX: lane * LANE_WIDTH_WORLD,
        worldZ: zSpawn,
        y: 25,
        radius: 18,
        pulsePhase: Math.random() * Math.PI * 2
      });
    }
  }
}

// Projection helper: Translates 3D world coord to 2D screen coordinate
function project(x, y, z) {
  if (z <= 1) z = 1;
  const horizonY = height * HORIZON_RATIO;
  const scale = FOV / z;
  const screenX = width / 2 + x * scale;
  const screenY = horizonY + (180 - y) * scale;
  return { x: screenX, y: screenY, scale };
}

// Particle update & drawing
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
  }
}

function renderParticles() {
  for (const p of particles) {
    if (p.z <= 10) continue;
    const proj = project(p.x, p.y, p.z);
    const alpha = p.life / p.maxLife;
    ctx.save();
    ctx.fillStyle = p.color;
    ctx.globalAlpha = alpha;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, Math.max(1, p.size * proj.scale), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// Background Grid, Sun & Mountain Skyline
function drawSynthwaveBackground(dt) {
  const horizonY = height * HORIZON_RATIO;

  // Sky Gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
  skyGrad.addColorStop(0, '#060112');
  skyGrad.addColorStop(0.65, '#220038');
  skyGrad.addColorStop(1, '#66004b');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, horizonY);

  // Retro Glowing Sun
  const sunX = width / 2;
  const sunY = horizonY - 20;
  const sunRadius = Math.min(width, height) * 0.16;

  const sunGrad = ctx.createLinearGradient(0, sunY - sunRadius, 0, sunY + sunRadius);
  sunGrad.addColorStop(0, '#ffe600');
  sunGrad.addColorStop(0.5, '#ff007f');
  sunGrad.addColorStop(1, '#8b00ff');

  ctx.save();
  ctx.fillStyle = sunGrad;
  ctx.shadowColor = '#ff007f';
  ctx.shadowBlur = 40;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunRadius, 0, Math.PI, true);
  ctx.fill();

  // Sun horizontal blinds cutouts
  ctx.fillStyle = '#060112';
  for (let i = 0; i < 7; i++) {
    const blindY = sunY - sunRadius * 0.45 + i * (sunRadius * 0.15);
    const blindH = 2 + i * 1.5;
    if (blindY < horizonY) {
      ctx.fillRect(sunX - sunRadius * 1.2, blindY, sunRadius * 2.4, blindH);
    }
  }
  ctx.restore();

  // Synthwave Grid Floor
  state.gridOffset = (state.gridOffset + state.speed * dt * 0.8) % 100;
  const groundGrad = ctx.createLinearGradient(0, horizonY, 0, height);
  groundGrad.addColorStop(0, '#10001e');
  groundGrad.addColorStop(1, '#05000a');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, horizonY, width, height - horizonY);

  // Perspective Floor Grid Lines
  ctx.save();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(255, 0, 127, 0.45)';
  ctx.shadowColor = '#ff007f';
  ctx.shadowBlur = 6;

  // Lateral Road Bounds & Lanes
  const trackHalfWidth = 240;
  const pRoadLeftFar = project(-trackHalfWidth, 0, 2200);
  const pRoadRightFar = project(trackHalfWidth, 0, 2200);
  const pRoadLeftNear = project(-trackHalfWidth, 0, 20);
  const pRoadRightNear = project(trackHalfWidth, 0, 20);

  // Draw Road Surface
  ctx.fillStyle = 'rgba(10, 3, 24, 0.9)';
  ctx.beginPath();
  ctx.moveTo(pRoadLeftFar.x, pRoadLeftFar.y);
  ctx.lineTo(pRoadRightFar.x, pRoadRightFar.y);
  ctx.lineTo(pRoadRightNear.x, pRoadRightNear.y);
  ctx.lineTo(pRoadLeftNear.x, pRoadLeftNear.y);
  ctx.closePath();
  ctx.fill();

  // Road glowing neon borders
  ctx.strokeStyle = '#00f3ff';
  ctx.shadowColor = '#00f3ff';
  ctx.shadowBlur = 12;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(pRoadLeftFar.x, pRoadLeftFar.y);
  ctx.lineTo(pRoadLeftNear.x, pRoadLeftNear.y);
  ctx.moveTo(pRoadRightFar.x, pRoadRightFar.y);
  ctx.lineTo(pRoadRightNear.x, pRoadRightNear.y);
  ctx.stroke();

  // Lane Dividers
  ctx.strokeStyle = 'rgba(0, 243, 255, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.shadowBlur = 4;
  [-55, 55].forEach(laneOffset => {
    const pFar = project(laneOffset, 0, 2200);
    const pNear = project(laneOffset, 0, 20);
    ctx.beginPath();
    ctx.moveTo(pFar.x, pFar.y);
    ctx.lineTo(pNear.x, pNear.y);
    ctx.stroke();
  });

  // Moving Horizontal Ground Grid Lines
  ctx.strokeStyle = 'rgba(255, 0, 127, 0.3)';
  for (let z = 60; z < 2200; z += 90) {
    const adjZ = z - state.gridOffset;
    if (adjZ < 20) continue;
    const p1 = project(-width * 0.9, 0, adjZ);
    const p2 = project(width * 0.9, 0, adjZ);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }
  ctx.restore();
}

// Render futuristic player speeder vehicle
function drawPlayer() {
  const p = project(player.worldX, player.worldY, 140);
  const scale = p.scale * 1.5;

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(player.rollAngle);

  // Thruster Glow & Particles
  const thrusterColor = state.isBoosting ? '#ffe600' : '#00f3ff';
  ctx.shadowColor = thrusterColor;
  ctx.shadowBlur = state.isBoosting ? 30 : 15;

  // Rear Thruster exhaust flame
  const flameLength = (state.isBoosting ? 50 : 25) + Math.sin(Date.now() * 0.05) * 8;
  const flameGrad = ctx.createLinearGradient(0, 15, 0, 15 + flameLength);
  flameGrad.addColorStop(0, thrusterColor);
  flameGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = flameGrad;
  ctx.beginPath();
  ctx.moveTo(-12 * scale, 10 * scale);
  ctx.lineTo(0, (15 + flameLength) * scale);
  ctx.lineTo(12 * scale, 10 * scale);
  ctx.closePath();
  ctx.fill();

  // Ship Main Hull (Chiseled Cybercraft)
  ctx.fillStyle = '#0f0920';
  ctx.strokeStyle = state.isBoosting ? '#ffe600' : '#ff007f';
  ctx.lineWidth = 2.5;

  ctx.beginPath();
  ctx.moveTo(0, -32 * scale); // Nose
  ctx.lineTo(26 * scale, 14 * scale); // Right Wingtip
  ctx.lineTo(14 * scale, 18 * scale);
  ctx.lineTo(0, 10 * scale); // Center Tail
  ctx.lineTo(-14 * scale, 18 * scale);
  ctx.lineTo(-26 * scale, 14 * scale); // Left Wingtip
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Glowing Cockpit Canopy
  ctx.fillStyle = '#00f3ff';
  ctx.shadowColor = '#00f3ff';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(0, -22 * scale);
  ctx.lineTo(8 * scale, 2 * scale);
  ctx.lineTo(0, 6 * scale);
  ctx.lineTo(-8 * scale, 2 * scale);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// Render dynamic Obstacles & Collectibles
function drawWorldObjects() {
  // Sort by depth (far to near) for correct painter's algorithm
  const allObjects = [
    ...obstacles.map(o => ({ type: 'obstacle', data: o, z: o.worldZ })),
    ...collectibles.map(c => ({ type: 'collectible', data: c, z: c.worldZ }))
  ].sort((a, b) => b.z - a.z);

  for (const obj of allObjects) {
    if (obj.type === 'obstacle') {
      const obs = obj.data;
      const p = project(obs.worldX, 0, obs.worldZ);
      const widthProj = obs.width * p.scale;
      const heightProj = obs.height * p.scale;

      ctx.save();
      const obsColor = obs.isTall ? '#ff0055' : '#ff7700';
      ctx.shadowColor = obsColor;
      ctx.shadowBlur = 16;
      ctx.strokeStyle = obsColor;
      ctx.lineWidth = Math.max(2, 3 * p.scale);
      ctx.fillStyle = 'rgba(255, 0, 85, 0.22)';

      // Draw 3D barrier cube/wall
      ctx.strokeRect(p.x - widthProj / 2, p.y - heightProj, widthProj, heightProj);
      ctx.fillRect(p.x - widthProj / 2, p.y - heightProj, widthProj, heightProj);

      // Warning hazard stripes inside
      ctx.beginPath();
      ctx.moveTo(p.x - widthProj / 2, p.y);
      ctx.lineTo(p.x + widthProj / 2, p.y - heightProj);
      ctx.stroke();

      ctx.restore();
    } else if (obj.type === 'collectible') {
      const orb = obj.data;
      orb.pulsePhase += 0.08;
      const floatY = orb.y + Math.sin(orb.pulsePhase) * 6;
      const p = project(orb.worldX, floatY, orb.worldZ);
      const r = orb.radius * p.scale;

      ctx.save();
      ctx.shadowColor = '#00f3ff';
      ctx.shadowBlur = 22;
      ctx.fillStyle = '#00f3ff';

      // Glowing pulsating sphere
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(3, r), 0, Math.PI * 2);
      ctx.fill();

      // Outer halo
      ctx.strokeStyle = '#ffe600';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(5, r * 1.5), 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }
  }
}

// Game Loop Update
let lastTimestamp = 0;

function gameLoop(timestamp) {
  if (!lastTimestamp) lastTimestamp = timestamp;
  const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.1);
  lastTimestamp = timestamp;

  if (state.active) {
    update(dt);
  }

  render(dt);
  requestAnimationFrame(gameLoop);
}

function update(dt) {
  // Speed curve
  if (state.isBoosting) {
    state.boostTimer -= dt;
    state.speed = state.maxSpeed;
    if (state.boostTimer <= 0) {
      state.isBoosting = false;
      state.speed = state.baseSpeed;
    }
  } else {
    state.baseSpeed = Math.min(state.maxSpeed * 0.85, state.baseSpeed + dt * 10);
    state.speed = state.baseSpeed;
  }

  // Smooth lane interpolation
  player.worldX += (player.targetX - player.worldX) * 16 * dt;
  player.rollAngle *= 0.86; // decay roll

  // Gravity & jumping
  if (!player.isGrounded) {
    player.velY -= player.gravity * dt;
    player.worldY += player.velY * dt;
    if (player.worldY <= 0) {
      player.worldY = 0;
      player.velY = 0;
      player.isGrounded = true;
    }
  }

  // Camera Shake Decay
  if (state.shakeAmount > 0) {
    state.shakeAmount = Math.max(0, state.shakeAmount - dt * 25);
  }

  // Score & Distance accumulation
  state.distance += state.speed * dt * 0.1;
  state.score += Math.round(state.speed * dt * state.multiplier * 0.4);

  // Multiplier logic
  state.multiplier = (1.0 + (state.speed - 380) / 300).toFixed(1);

  // Spawn obstacles & collectibles
  spawnWorldObjects(dt);

  // Update Obstacles position & collision
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obs = obstacles[i];
    obs.worldZ -= state.speed * dt;

    // Collision detection with player (Player worldZ is ~140)
    if (obs.worldZ < 170 && obs.worldZ > 90) {
      const xDiff = Math.abs(obs.worldX - player.worldX);
      if (xDiff < 45) {
        // Check if player jumped clear over low hurdle
        if (!obs.isTall && player.worldY > obs.height * 0.7) {
          // Cleared hurdle! Award bonus
          state.score += 50;
        } else {
          // If in boost mode, smash right through!
          if (state.isBoosting) {
            // Smash obstacle
            sfx.playCrash();
            state.shakeAmount = 18;
            for (let k = 0; k < 20; k++) {
              particles.push({
                x: obs.worldX,
                y: obs.height / 2,
                z: obs.worldZ,
                vx: (Math.random() - 0.5) * 350,
                vy: Math.random() * 250,
                vz: (Math.random() - 0.5) * 350,
                color: '#ff0055',
                life: 0.5,
                maxLife: 0.5,
                size: 4
              });
            }
            obstacles.splice(i, 1);
            continue;
          } else {
            // Lethal crash
            triggerGameOver();
            return;
          }
        }
      }
    }

    if (obs.worldZ < 20) {
      obstacles.splice(i, 1);
    }
  }

  // Update Collectibles position & collision
  for (let i = collectibles.length - 1; i >= 0; i--) {
    const orb = collectibles[i];
    orb.worldZ -= state.speed * dt;

    if (orb.worldZ < 180 && orb.worldZ > 80) {
      const xDiff = Math.abs(orb.worldX - player.worldX);
      if (xDiff < 50) {
        // Collected!
        state.orbsCollected++;
        state.score += 200;
        state.boostEnergy = Math.min(100, state.boostEnergy + 20);
        sfx.playOrb();

        // Particles on pickup
        for (let k = 0; k < 12; k++) {
          particles.push({
            x: orb.worldX,
            y: orb.y,
            z: orb.worldZ,
            vx: (Math.random() - 0.5) * 200,
            vy: (Math.random() - 0.5) * 200,
            vz: -Math.random() * 150,
            color: '#00f3ff',
            life: 0.4,
            maxLife: 0.4,
            size: 3
          });
        }

        collectibles.splice(i, 1);
        continue;
      }
    }

    if (orb.worldZ < 20) {
      collectibles.splice(i, 1);
    }
  }

  updateParticles(dt);
  updateUI();
}

function updateUI() {
  scoreDisplay.textContent = String(state.score).padStart(6, '0');
  multiplierBadge.textContent = `${state.multiplier}x`;

  const speedPct = Math.min(100, Math.round(((state.speed - 380) / (state.maxSpeed - 380)) * 100));
  speedBar.style.width = `${Math.max(15, speedPct)}%`;

  boostMeterFill.style.width = `${state.boostEnergy}%`;
  if (state.isBoosting) {
    boostStatusText.textContent = 'HYPER ACTIVE!';
    boostStatusText.style.color = '#ffe600';
  } else if (state.boostEnergy >= 100) {
    boostStatusText.textContent = 'READY! [SPACE]';
    boostStatusText.style.color = '#00f3ff';
  } else {
    boostStatusText.textContent = 'SPACE: BOOST';
    boostStatusText.style.color = '#8b87a8';
  }
}

function render(dt) {
  ctx.save();

  // Screen shake on boost or smash
  if (state.shakeAmount > 0) {
    const rx = (Math.random() - 0.5) * state.shakeAmount;
    const ry = (Math.random() - 0.5) * state.shakeAmount;
    ctx.translate(rx, ry);
  }

  // Draw background, highway, sun
  drawSynthwaveBackground(dt);

  // Draw items and obstacles
  drawWorldObjects();

  // Draw player synthcraft
  drawPlayer();

  // Draw particle system
  renderParticles();

  ctx.restore();
}

// Game Flow Management
function startGame() {
  sfx.init();
  startOverlay.classList.remove('active');
  gameOverOverlay.classList.remove('active');

  // Reset state
  state.active = true;
  state.score = 0;
  state.distance = 0;
  state.speed = 380;
  state.baseSpeed = 380;
  state.multiplier = 1.0;
  state.boostEnergy = 20;
  state.isBoosting = false;
  state.orbsCollected = 0;
  state.shakeAmount = 0;

  player.lane = 0;
  player.worldX = 0;
  player.targetX = 0;
  player.worldY = 0;
  player.velY = 0;
  player.isGrounded = true;

  obstacles = [];
  collectibles = [];
  particles = [];
}

function triggerGameOver() {
  state.active = false;
  sfx.playCrash();

  // Update High Score
  if (state.score > state.highScore) {
    state.highScore = state.score;
    localStorage.setItem('cyberpulse_high_score', state.highScore);
    highScoreDisplay.textContent = String(state.highScore).padStart(6, '0');
  }

  finalScore.textContent = state.score.toLocaleString();
  finalDistance.textContent = `${Math.floor(state.distance)}m`;
  finalOrbs.textContent = state.orbsCollected;

  gameOverOverlay.classList.add('active');
}

// Event Listeners
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

// Start game loop
requestAnimationFrame(gameLoop);
