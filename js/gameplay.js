import { inputForEntity } from "./input.js";
import { handleEat, respawnEntity } from "./entities.js";

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
  const jumpPower = entity.kind === "npc" ? 930 : 980;
  const maxSpeed = Math.max(230, speedBase - entity.radius * 2.2);

  entity.vx += input.move * 1800 * dt;
  entity.vx *= 0.85;
  entity.vx = Math.max(-maxSpeed, Math.min(maxSpeed, entity.vx));

  if (input.jump && entity.onGround && !entity.jumpHeld) {
    entity.vy = -Math.max(430, jumpPower - entity.radius * 3.2);
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

    const input = inputForEntity(entity, state, dt);
    updateMovement(entity, input, dt, config.world, config.platforms);
  }

  for (let i = 0; i < state.entities.length; i += 1) {
    for (let j = i + 1; j < state.entities.length; j += 1) {
      resolveBlobCollision(state.entities[i], state.entities[j]);
    }
  }
}
