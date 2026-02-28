import {
  EVOLUTION_THRESHOLDS,
  GIANT_SPLIT_SHARD_COUNT,
  HUMAN_PLAYER_COUNT,
  KEYMAPS,
  NPC_COLOR,
  NPC_COUNT,
  NPC_RESPAWN_TIME,
  PLAYER_COLORS,
  PLAYER_RESPAWN_TIME,
  SHARD_BASE_RADIUS,
} from "./config.js";

export function createEntity(id, kind, world) {
  const baseRadius = kind === "npc" ? 15 + Math.random() * 6 : 24;
  const isNpc = kind === "npc";
  const isPlayer = kind === "player";
  return {
    id,
    kind,
    controlSlot: isPlayer ? id : null,
    isShard: false,
    x: 100 + (id * 129) % (world.width - 180),
    y: isNpc ? world.floorY - baseRadius : baseRadius + 8,
    vx: 0,
    vy: 0,
    radius: baseRadius,
    baseRadius,
    mass: baseRadius * baseRadius,
    alive: true,
    onGround: isNpc,
    jumpHeld: false,
    color: kind === "player" ? PLAYER_COLORS[id % PLAYER_COLORS.length] : NPC_COLOR,
    keyboardMap: KEYMAPS[id] || KEYMAPS[KEYMAPS.length - 1],
    gamepadIndex: null,
    eatenCount: 0,
    evolutionStage: 0,
    respawnTimer: 0,
    invulnTimer: 0,
    facing: 1,
    attackHeld: false,
    attackTimer: 0,
    attackCooldown: 0,
    hasArmor: false,
    armorSide: 0,
    doubleJumpCooldown: 0,
    ai: {
      jumpCooldown: Math.random() * 0.8,
      roamDir: Math.random() < 0.5 ? -1 : 1,
      roamTimer: 0.8 + Math.random() * 1.2,
    },
  };
}

export function buildEntities(world) {
  const pads = Array.from(navigator.getGamepads ? navigator.getGamepads() : []).filter(Boolean);
  const entities = [];

  for (let i = 0; i < HUMAN_PLAYER_COUNT; i += 1) {
    entities.push(createEntity(i, "player", world));
  }

  pads.slice(0, HUMAN_PLAYER_COUNT).forEach((pad, idx) => {
    entities[idx].gamepadIndex = pad.index;
  });

  const offset = entities.length;
  for (let i = 0; i < NPC_COUNT; i += 1) {
    entities.push(createEntity(offset + i, "npc", world));
  }

  return entities;
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

export function grow(entity, eatenMass) {
  entity.mass += eatenMass;
  entity.radius = Math.sqrt(entity.mass);
}

export function respawnEntity(entity, world) {
  entity.alive = true;
  entity.vx = 0;
  entity.vy = 0;
  entity.onGround = false;
  entity.jumpHeld = false;
  entity.respawnTimer = 0;
  entity.invulnTimer = 0.8;
  entity.facing = 1;
  entity.attackHeld = false;
  entity.attackTimer = 0;
  entity.attackCooldown = 0;
  entity.hasArmor = false;
  entity.armorSide = 0;
  entity.doubleJumpCooldown = 0;
  entity.mass = entity.baseRadius * entity.baseRadius;
  entity.radius = entity.baseRadius;
  entity.eatenCount = 0;
  entity.evolutionStage = 0;

  if (entity.kind === "player") {
    const slot = entity.controlSlot ?? entity.id;
    entity.x = 100 + (slot * ((world.width - 200) / Math.max(1, HUMAN_PLAYER_COUNT - 1)));
    entity.y = entity.radius + 8;
    return;
  }

  entity.x = 80 + Math.random() * (world.width - 160);
  entity.y = world.floorY - entity.radius;
  entity.onGround = true;
}

export function scheduleRespawn(entity) {
  entity.alive = false;
  entity.respawnTimer = entity.kind === "player" ? PLAYER_RESPAWN_TIME : NPC_RESPAWN_TIME;
}

export function handleEat(eater, victim, options = {}) {
  if (options.skipRespawn) {
    removeWithoutRespawn(victim);
  } else {
    scheduleRespawn(victim);
  }
  grow(eater, victim.mass);
  eater.eatenCount += 1;

  const before = eater.evolutionStage;
  setEvolvedStats(eater);
  if (eater.evolutionStage > before) {
    eater.vy -= 100;
  }

  eater.vy = -Math.max(620, 760 - eater.radius * 2);
}

export function removeWithoutRespawn(victim) {
  victim.alive = false;
  victim.respawnTimer = Number.POSITIVE_INFINITY;
}

export function createSplitShards(victim, world, firstId, count = GIANT_SPLIT_SHARD_COUNT) {
  const shards = [];
  for (let i = 0; i < count; i += 1) {
    const shard = createEntity(firstId + i, "player", world);
    const angle = -Math.PI * 0.85 + (i * Math.PI * 0.85) / Math.max(1, count - 1);
    shard.isShard = true;
    shard.controlSlot = victim.controlSlot ?? victim.id;
    shard.keyboardMap = victim.keyboardMap;
    shard.gamepadIndex = victim.gamepadIndex;
    shard.color = victim.color;
    shard.baseRadius = SHARD_BASE_RADIUS;
    shard.radius = SHARD_BASE_RADIUS;
    shard.mass = SHARD_BASE_RADIUS * SHARD_BASE_RADIUS;
    shard.eatenCount = 0;
    shard.evolutionStage = 0;
    shard.hasArmor = false;
    shard.armorSide = 0;
    shard.x = victim.x + Math.cos(angle) * (victim.radius * 0.25);
    shard.y = Math.max(shard.radius + 8, victim.y - victim.radius * 0.25);
    shard.vx = Math.cos(angle) * 420;
    shard.vy = -380 - Math.sin(angle) * 100;
    shard.onGround = false;
    shard.facing = victim.facing || 1;
    shards.push(shard);
  }
  return shards;
}
