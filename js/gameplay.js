import { inputForEntity } from "./input.js";
import { handleEat, respawnEntity } from "./entities.js";
import { ARMOR_PICKUP_RADIUS, ARMOR_RESPAWN_TIME } from "./config.js";

function randomArmorSpawn(config) {
  const onPlatform = Math.random() < 0.72 && config.platforms.length > 0;
  if (onPlatform) {
    const platform = config.platforms[Math.floor(Math.random() * config.platforms.length)];
    const margin = Math.min(56, platform.w * 0.35);
    const x = platform.x + (Math.random() * 2 - 1) * (platform.w * 0.5 - margin);
    const y = platform.y - platform.h * 0.5 - ARMOR_PICKUP_RADIUS;
    return { x, y };
  }

  const x = 90 + Math.random() * (config.world.width - 180);
  const y = config.world.floorY - ARMOR_PICKUP_RADIUS;
  return { x, y };
}

export function createArmorPickup(config) {
  const spawn = randomArmorSpawn(config);
  return {
    x: spawn.x,
    y: spawn.y,
    radius: ARMOR_PICKUP_RADIUS,
    active: true,
    respawnTimer: 0,
    phase: Math.random() * Math.PI * 2,
  };
}

function placeArmor(armor, config) {
  const spawn = randomArmorSpawn(config);
  armor.x = spawn.x;
  armor.y = spawn.y;
}

function isBlockedByArmor(attacker, victim) {
  if (!victim.hasArmor) return false;
  const incomingSide = attacker.x < victim.x ? -1 : 1;
  return victim.armorSide === incomingSide;
}

function canUseSword(entity) {
  return entity.evolutionStage >= 1;
}

function trySwordAttack(attacker, entities) {
  if (!canUseSword(attacker) || attacker.attackCooldown > 0) return;

  const facing = attacker.facing || 1;
  const range = attacker.radius + 56;
  let target = null;
  let bestDistance = Infinity;

  for (const victim of entities) {
    if (!victim.alive || victim.id === attacker.id) continue;
    if (victim.invulnTimer > 0) continue;

    const dx = victim.x - attacker.x;
    const dy = victim.y - attacker.y;
    if (dx * facing <= 0) continue;
    if (Math.abs(dx) > range) continue;
    if (Math.abs(dy) > attacker.radius * 1.1) continue;

    const dist = Math.hypot(dx, dy);
    if (dist < bestDistance) {
      bestDistance = dist;
      target = victim;
    }
  }

  attacker.attackTimer = 0.16;
  attacker.attackCooldown = 0.45;
  if (target) {
    if (isBlockedByArmor(attacker, target)) return;
    handleEat(attacker, target);
  }
}

function updateArmorPickup(state, config, dt) {
  const armor = state.armorPickup;
  if (!armor) return;

  armor.phase += dt * 2.4;

  if (!armor.active) {
    armor.respawnTimer -= dt;
    if (armor.respawnTimer <= 0) {
      placeArmor(armor, config);
      armor.active = true;
    }
    return;
  }

  for (const entity of state.entities) {
    if (!entity.alive) continue;
    const dx = entity.x - armor.x;
    const dy = entity.y - armor.y;
    const pickupDistance = entity.radius + armor.radius + 4;
    if (dx * dx + dy * dy > pickupDistance * pickupDistance) continue;

    entity.hasArmor = true;
    entity.armorSide = entity.facing || 1;
    armor.active = false;
    armor.respawnTimer = ARMOR_RESPAWN_TIME;
    break;
  }
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

function updateMovement(entity, input, dt, world, platforms) {
  const speedBase = entity.kind === "npc" ? 470 : 520;
  const jumpBase = entity.kind === "npc" ? 980 : 1040;
  const jumpSizePenalty = entity.kind === "npc" ? 4.4 : 4.8;
  const maxSpeed = Math.max(230, speedBase - entity.radius * 2.2);

  entity.vx += input.move * 1800 * dt;
  entity.vx *= 0.85;
  entity.vx = Math.max(-maxSpeed, Math.min(maxSpeed, entity.vx));

  if (input.jump && entity.onGround && !entity.jumpHeld) {
    entity.vy = -Math.max(430, jumpBase - entity.radius * jumpSizePenalty);
    entity.onGround = false;
  }
  entity.jumpHeld = input.jump;

  entity.vy += world.gravity * dt;

  entity.x += entity.vx * dt;
  entity.y += entity.vy * dt;

  if (entity.x < entity.radius) {
    entity.x = entity.radius;
    entity.vx *= -0.35;
  }
  if (entity.x > world.width - entity.radius) {
    entity.x = world.width - entity.radius;
    entity.vx *= -0.35;
  }

  if (entity.y > world.floorY - entity.radius) {
    entity.y = world.floorY - entity.radius;
    entity.vy = 0;
    entity.onGround = true;
  }

  let landingY = Infinity;
  for (const platform of platforms) {
    const inPlatformX =
      entity.x + entity.radius > platform.x - platform.w * 0.5 &&
      entity.x - entity.radius < platform.x + platform.w * 0.5;

    const topY = platform.y - platform.h * 0.5;
    const crossingTop =
      entity.vy >= 0 &&
      entity.y + entity.radius >= topY &&
      entity.y + entity.radius - entity.vy * dt <= topY;

    if (inPlatformX && crossingTop) {
      landingY = Math.min(landingY, topY - entity.radius);
    }
  }

  if (landingY !== Infinity) {
    entity.y = landingY;
    entity.vy = 0;
    entity.onGround = true;
  }
}

export function update(state, config, dt) {
  for (const entity of state.entities) {
    if (!entity.alive) {
      entity.respawnTimer -= dt;
      if (entity.respawnTimer <= 0) respawnEntity(entity, config.world);
      continue;
    }

    if (entity.invulnTimer > 0) {
      entity.invulnTimer -= dt;
    }
    if (entity.attackCooldown > 0) {
      entity.attackCooldown -= dt;
    }
    if (entity.attackTimer > 0) {
      entity.attackTimer -= dt;
    }

    const input = inputForEntity(entity, state, dt);
    if (input.move !== 0) {
      entity.facing = input.move > 0 ? 1 : -1;
    }
    updateMovement(entity, input, dt, config.world, config.platforms);

    if (input.attack && !entity.attackHeld) {
      trySwordAttack(entity, state.entities);
    }
    entity.attackHeld = input.attack;
  }

  for (let i = 0; i < state.entities.length; i += 1) {
    for (let j = i + 1; j < state.entities.length; j += 1) {
      resolveBlobCollision(state.entities[i], state.entities[j]);
    }
  }

  updateArmorPickup(state, config, dt);
}
