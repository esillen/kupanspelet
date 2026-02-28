const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");

const WORLD = {
  width: canvas.width,
  height: canvas.height,
  gravity: 2400,
  floorY: canvas.height - 48,
};

const PLATFORM = {
  x: WORLD.width * 0.5,
  y: WORLD.height * 0.53,
  w: 300,
  h: 26,
};

const NPC_COUNT = 8;
const EVOLUTION_THRESHOLDS = [2, 4, 7];
const PLAYER_RESPAWN_TIME = 2.2;
const NPC_RESPAWN_TIME = 3.2;

const KEYMAPS = [
  { left: "KeyA", right: "KeyD", jump: "KeyW" },
  { left: "ArrowLeft", right: "ArrowRight", jump: "ArrowUp" },
  { left: "KeyJ", right: "KeyL", jump: "KeyI" },
  { left: "Numpad4", right: "Numpad6", jump: "Numpad8" },
];

const COLORS = ["#ef4444", "#22c55e", "#a78bfa", "#f97316", "#06b6d4", "#eab308", "#f43f5e", "#84cc16"];

const state = {
  entities: [],
  pressed: new Set(),
  gameOver: false,
  gameOverText: "",
  lastTime: 0,
};

window.addEventListener("keydown", (event) => {
  state.pressed.add(event.code);
  if (event.code === "KeyR") restart();
});

window.addEventListener("keyup", (event) => {
  state.pressed.delete(event.code);
});

window.addEventListener("gamepadconnected", () => restart());
window.addEventListener("gamepaddisconnected", () => restart());

function createEntity(id, kind, source = "keyboard") {
  const baseRadius = kind === "npc" ? 19 + Math.random() * 8 : 30;
  return {
    id,
    kind,
    source,
    x: 100 + (id * 129) % (WORLD.width - 180),
    y: WORLD.floorY - baseRadius,
    vx: 0,
    vy: 0,
    radius: baseRadius,
    baseRadius,
    mass: baseRadius * baseRadius,
    alive: true,
    onGround: false,
    jumpHeld: false,
    color: COLORS[id % COLORS.length],
    keyboardMap: KEYMAPS[id] || KEYMAPS[KEYMAPS.length - 1],
    gamepadIndex: null,
    eatenCount: 0,
    evolutionStage: 0,
    respawnTimer: 0,
    invulnTimer: 0,
    ai: {
      jumpCooldown: Math.random() * 0.8,
      roamDir: Math.random() < 0.5 ? -1 : 1,
      roamTimer: 0.8 + Math.random() * 1.2,
    },
  };
}

function getEvolutionStage(eatenCount) {
  let stage = 0;
  for (const threshold of EVOLUTION_THRESHOLDS) {
    if (eatenCount >= threshold) stage += 1;
  }
  return stage;
}

function setEvolvedStats(entity) {
  entity.evolutionStage = getEvolutionStage(entity.eatenCount);
}

function buildEntities() {
  const pads = Array.from(navigator.getGamepads ? navigator.getGamepads() : []).filter(Boolean);
  const playerCount = Math.max(2, pads.length + 1);
  const entities = [];

  for (let i = 0; i < playerCount; i += 1) {
    const player = createEntity(i, "player", "keyboard");
    entities.push(player);
  }

  pads.forEach((pad, idx) => {
    const owner = idx + 2;
    if (!entities[owner]) entities[owner] = createEntity(owner, "player", "gamepad");
    entities[owner].source = "gamepad";
    entities[owner].gamepadIndex = pad.index;
  });

  const offset = entities.length;
  for (let i = 0; i < NPC_COUNT; i += 1) {
    entities.push(createEntity(offset + i, "npc", "ai"));
  }

  return entities;
}

function restart() {
  state.entities = buildEntities();
  state.gameOver = false;
  state.gameOverText = "";
  state.lastTime = 0;
  announceStatus();
}

function inputForPlayer(entity) {
  const input = { move: 0, jump: false };

  const map = entity.keyboardMap;
  if (state.pressed.has(map.left)) input.move -= 1;
  if (state.pressed.has(map.right)) input.move += 1;
  if (state.pressed.has(map.jump)) input.jump = true;

  if (entity.source === "gamepad" && entity.gamepadIndex !== null) {
    const pad = navigator.getGamepads()[entity.gamepadIndex];
    if (pad) {
      const axis = pad.axes[0] || 0;
      if (axis < -0.2) input.move = -1;
      if (axis > 0.2) input.move = 1;
      const jumpPressed =
        (pad.buttons[0] && pad.buttons[0].pressed) ||
        (pad.buttons[1] && pad.buttons[1].pressed) ||
        (pad.buttons[11] && pad.buttons[11].pressed);
      if (jumpPressed) input.jump = true;
    }
  }

  return input;
}

function inputForNpc(entity, dt) {
  const input = { move: 0, jump: false };
  const aliveOthers = state.entities.filter((p) => p.alive && p.id !== entity.id);
  if (!aliveOthers.length) return input;

  let target = aliveOthers[0];
  let bestDist = Infinity;
  for (const other of aliveOthers) {
    const dist = Math.abs(other.x - entity.x) + Math.abs(other.y - entity.y) * 0.45;
    if (dist < bestDist) {
      bestDist = dist;
      target = other;
    }
  }

  const dx = target.x - entity.x;
  if (Math.abs(dx) > 14) {
    input.move = dx < 0 ? -1 : 1;
  }

  entity.ai.jumpCooldown -= dt;
  entity.ai.roamTimer -= dt;

  if (entity.ai.roamTimer <= 0) {
    entity.ai.roamTimer = 0.8 + Math.random() * 1.2;
    entity.ai.roamDir = Math.random() < 0.5 ? -1 : 1;
  }

  if (Math.abs(dx) < 100 && target.y < entity.y - 8 && entity.ai.jumpCooldown <= 0) {
    input.jump = true;
    entity.ai.jumpCooldown = 0.55 + Math.random() * 0.4;
  } else if (entity.onGround && entity.ai.jumpCooldown <= -0.2 && Math.random() < 0.012) {
    input.jump = true;
    entity.ai.jumpCooldown = 0.7 + Math.random() * 0.5;
  }

  if (!input.move && Math.random() < 0.1) {
    input.move = entity.ai.roamDir;
  }

  return input;
}

function inputForEntity(entity, dt) {
  if (entity.kind === "npc") return inputForNpc(entity, dt);
  return inputForPlayer(entity);
}

function grow(entity, eatenMass) {
  entity.mass += eatenMass;
  entity.radius = Math.sqrt(entity.mass);
}

function respawnEntity(entity) {
  entity.alive = true;
  entity.vx = 0;
  entity.vy = 0;
  entity.onGround = false;
  entity.jumpHeld = false;
  entity.respawnTimer = 0;
  entity.invulnTimer = 0.8;
  entity.mass = entity.baseRadius * entity.baseRadius;
  entity.radius = entity.baseRadius;
  entity.eatenCount = 0;
  entity.evolutionStage = 0;

  if (entity.kind === "player") {
    entity.x = 90 + (entity.id * 180) % (WORLD.width - 180);
    entity.y = entity.radius + 8;
    return;
  }

  entity.x = 80 + Math.random() * (WORLD.width - 160);
  entity.y = WORLD.floorY - entity.radius;
  entity.onGround = true;
}

function scheduleRespawn(entity) {
  entity.alive = false;
  entity.respawnTimer = entity.kind === "player" ? PLAYER_RESPAWN_TIME : NPC_RESPAWN_TIME;
}

function evolveIfNeeded(entity) {
  const before = entity.evolutionStage;
  setEvolvedStats(entity);
  if (entity.evolutionStage > before) {
    entity.vy -= 100;
  }
}

function handleEat(eater, victim) {
  scheduleRespawn(victim);
  grow(eater, victim.mass);
  eater.eatenCount += 1;
  evolveIfNeeded(eater);
  eater.vy = -Math.max(620, 760 - eater.radius * 2);
}

function resolveBlobCollision(a, b) {
  if (!a.alive || !b.alive) return;
  if (a.invulnTimer > 0 || b.invulnTimer > 0) return;

  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distance = Math.hypot(dx, dy);
  const minDistance = a.radius + b.radius;

  if (distance >= minDistance || distance === 0) return;

  const overlap = minDistance - distance;
  const nx = dx / distance;
  const ny = dy / distance;

  a.x -= nx * (overlap * 0.5);
  a.y -= ny * (overlap * 0.5);
  b.x += nx * (overlap * 0.5);
  b.y += ny * (overlap * 0.5);

  const aStomp = a.vy > 220 && a.y < b.y - b.radius * 0.2;
  const bStomp = b.vy > 220 && b.y < a.y - a.radius * 0.2;

  if (aStomp && !bStomp) {
    handleEat(a, b);
  } else if (bStomp && !aStomp) {
    handleEat(b, a);
  } else {
    const bounce = 0.92;
    const tempVx = a.vx;
    const tempVy = a.vy;
    a.vx = b.vx * bounce;
    a.vy = b.vy * bounce;
    b.vx = tempVx * bounce;
    b.vy = tempVy * bounce;
  }
}

function updateMovement(entity, dt) {
  const speedBase = entity.kind === "npc" ? 470 : 520;
  const jumpPower = entity.kind === "npc" ? 930 : 980;

  const input = inputForEntity(entity, dt);
  const maxSpeed = Math.max(230, speedBase - entity.radius * 2.2);

  entity.vx += input.move * 1800 * dt;
  entity.vx *= 0.85;
  entity.vx = Math.max(-maxSpeed, Math.min(maxSpeed, entity.vx));

  if (input.jump && entity.onGround && !entity.jumpHeld) {
    entity.vy = -Math.max(430, jumpPower - entity.radius * 3.2);
    entity.onGround = false;
  }
  entity.jumpHeld = input.jump;

  entity.vy += WORLD.gravity * dt;

  entity.x += entity.vx * dt;
  entity.y += entity.vy * dt;

  if (entity.x < entity.radius) {
    entity.x = entity.radius;
    entity.vx *= -0.35;
  }
  if (entity.x > WORLD.width - entity.radius) {
    entity.x = WORLD.width - entity.radius;
    entity.vx *= -0.35;
  }

  if (entity.y > WORLD.floorY - entity.radius) {
    entity.y = WORLD.floorY - entity.radius;
    entity.vy = 0;
    entity.onGround = true;
  }

  const inPlatformX =
    entity.x + entity.radius > PLATFORM.x - PLATFORM.w * 0.5 &&
    entity.x - entity.radius < PLATFORM.x + PLATFORM.w * 0.5;

  const crossingTop =
    entity.vy >= 0 &&
    entity.y + entity.radius >= PLATFORM.y - PLATFORM.h * 0.5 &&
    entity.y + entity.radius - entity.vy * dt <= PLATFORM.y - PLATFORM.h * 0.5;

  if (inPlatformX && crossingTop) {
    entity.y = PLATFORM.y - PLATFORM.h * 0.5 - entity.radius;
    entity.vy = 0;
    entity.onGround = true;
  }
}

function update(dt) {
  for (const entity of state.entities) {
    if (!entity.alive) {
      entity.respawnTimer -= dt;
      if (entity.respawnTimer <= 0) respawnEntity(entity);
      continue;
    }
    if (entity.invulnTimer > 0) {
      entity.invulnTimer -= dt;
    }
    updateMovement(entity, dt);
  }

  for (let i = 0; i < state.entities.length; i += 1) {
    for (let j = i + 1; j < state.entities.length; j += 1) {
      resolveBlobCollision(state.entities[i], state.entities[j]);
    }
  }

  announceStatus();
}

function drawArena() {
  ctx.clearRect(0, 0, WORLD.width, WORLD.height);

  const floorHeight = WORLD.height - WORLD.floorY;
  ctx.fillStyle = "#14532d";
  ctx.fillRect(0, WORLD.floorY, WORLD.width, floorHeight);

  ctx.fillStyle = "#166534";
  ctx.fillRect(0, WORLD.floorY - 10, WORLD.width, 10);

  const px = PLATFORM.x - PLATFORM.w * 0.5;
  const py = PLATFORM.y - PLATFORM.h * 0.5;

  ctx.fillStyle = "#78350f";
  ctx.fillRect(px, py, PLATFORM.w, PLATFORM.h);
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  ctx.fillRect(px, py, PLATFORM.w, 6);
}

function drawEvolutionParts(entity) {
  const stage = entity.evolutionStage;

  if (stage >= 1) {
    ctx.fillStyle = entity.color;
    ctx.beginPath();
    ctx.ellipse(entity.x - entity.radius * 0.36, entity.y + entity.radius * 0.92, entity.radius * 0.24, entity.radius * 0.38, 0.2, 0, Math.PI * 2);
    ctx.ellipse(entity.x + entity.radius * 0.36, entity.y + entity.radius * 0.92, entity.radius * 0.24, entity.radius * 0.38, -0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  if (stage >= 2) {
    ctx.fillStyle = entity.color;
    ctx.beginPath();
    ctx.ellipse(entity.x - entity.radius * 1.04, entity.y + entity.radius * 0.05, entity.radius * 0.36, entity.radius * 0.22, -0.4, 0, Math.PI * 2);
    ctx.ellipse(entity.x + entity.radius * 1.04, entity.y + entity.radius * 0.05, entity.radius * 0.36, entity.radius * 0.22, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  if (stage >= 3) {
    ctx.strokeStyle = "rgba(15, 23, 42, 0.7)";
    ctx.lineWidth = Math.max(2, entity.radius * 0.08);
    ctx.beginPath();
    ctx.moveTo(entity.x - entity.radius * 0.32, entity.y - entity.radius * 0.85);
    ctx.quadraticCurveTo(entity.x - entity.radius * 0.5, entity.y - entity.radius * 1.35, entity.x - entity.radius * 0.12, entity.y - entity.radius * 1.45);
    ctx.moveTo(entity.x + entity.radius * 0.32, entity.y - entity.radius * 0.85);
    ctx.quadraticCurveTo(entity.x + entity.radius * 0.5, entity.y - entity.radius * 1.35, entity.x + entity.radius * 0.12, entity.y - entity.radius * 1.45);
    ctx.stroke();
  }
}

function drawEntity(entity) {
  if (!entity.alive) return;

  drawEvolutionParts(entity);

  const grd = ctx.createRadialGradient(
    entity.x - entity.radius * 0.35,
    entity.y - entity.radius * 0.35,
    entity.radius * 0.2,
    entity.x,
    entity.y,
    entity.radius
  );
  grd.addColorStop(0, "rgba(255,255,255,0.9)");
  grd.addColorStop(0.2, entity.color);
  grd.addColorStop(1, "rgba(0,0,0,0.32)");

  ctx.beginPath();
  ctx.arc(entity.x, entity.y, entity.radius, 0, Math.PI * 2);
  ctx.fillStyle = grd;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(entity.x - entity.radius * 0.22, entity.y - entity.radius * 0.17, entity.radius * 0.11, 0, Math.PI * 2);
  ctx.arc(entity.x + entity.radius * 0.22, entity.y - entity.radius * 0.17, entity.radius * 0.11, 0, Math.PI * 2);
  ctx.fillStyle = "#111827";
  ctx.fill();

  const tag = entity.kind === "npc" ? "NPC" : `P${entity.id + 1}`;
  ctx.fillStyle = "rgba(15, 23, 42, 0.65)";
  ctx.font = `${Math.max(12, entity.radius * 0.42)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(tag, entity.x, entity.y + entity.radius * 0.18);
}

function render() {
  drawArena();
  for (const entity of state.entities) {
    drawEntity(entity);
  }
}

function playerStatsText(player) {
  const life = player.alive ? "levande" : "ute";
  return `P${player.id + 1}: lvl ${player.evolutionStage + 1}, ate ${player.eatenCount}, ${life}`;
}

function announceStatus() {
  if (!statusEl) return;

  const players = state.entities.filter((e) => e.kind === "player");
  const npcsAlive = state.entities.filter((e) => e.kind === "npc" && e.alive).length;
  const playersText = players.map(playerStatsText).join(" | ");

  if (state.gameOver) {
    statusEl.textContent = `${state.gameOverText} NPC kvar: ${npcsAlive}. ${playersText}`;
    return;
  }

  statusEl.textContent = `NPC kvar: ${npcsAlive}. Evolvera vid ${EVOLUTION_THRESHOLDS.join("/")} eats. ${playersText}`;
}

function frame(ts) {
  if (!state.lastTime) state.lastTime = ts;
  const dt = Math.min(0.033, (ts - state.lastTime) / 1000);
  state.lastTime = ts;

  update(dt);
  render();

  requestAnimationFrame(frame);
}

restart();
requestAnimationFrame(frame);
