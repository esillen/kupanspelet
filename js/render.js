function drawArena(ctx, world, platforms) {
  ctx.clearRect(0, 0, world.width, world.height);

  const floorHeight = world.height - world.floorY;
  ctx.fillStyle = "#14532d";
  ctx.fillRect(0, world.floorY, world.width, floorHeight);

  ctx.fillStyle = "#166534";
  ctx.fillRect(0, world.floorY - 10, world.width, 10);

  for (const platform of platforms) {
    const px = platform.x - platform.w * 0.5;
    const py = platform.y - platform.h * 0.5;

    ctx.fillStyle = "#78350f";
    ctx.fillRect(px, py, platform.w, platform.h);
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.fillRect(px, py, platform.w, 6);
  }
}

function drawArmorPickup(ctx, armor) {
  if (!armor || !armor.active) return;

  const bob = Math.sin(armor.phase) * 3;
  const x = armor.x;
  const y = armor.y + bob;
  const r = armor.radius;

  ctx.fillStyle = "#94a3b8";
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.72, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#334155";
  ctx.fillRect(x - r * 0.25, y - r * 0.72, r * 0.5, r * 0.42);
}

function drawEvolutionParts(ctx, entity) {
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

function drawSword(ctx, entity) {
  if (entity.evolutionStage < 1) return;

  const facing = entity.facing || 1;
  const swingProgress = Math.max(0, Math.min(1, entity.attackTimer / 0.16));
  const swing = Math.sin(swingProgress * Math.PI) * 0.95;
  const baseAngle = facing > 0 ? -0.25 : Math.PI + 0.25;
  const angle = baseAngle + (facing > 0 ? -swing : swing);

  const handX = entity.x + facing * entity.radius * 0.55;
  const handY = entity.y + entity.radius * 0.05;
  const bladeLen = entity.radius * 1.2;
  const tipX = handX + Math.cos(angle) * bladeLen;
  const tipY = handY + Math.sin(angle) * bladeLen;

  ctx.strokeStyle = "#f8fafc";
  ctx.lineWidth = Math.max(3, entity.radius * 0.14);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(handX, handY);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();

  const hiltLen = entity.radius * 0.35;
  const nx = Math.cos(angle + Math.PI / 2) * hiltLen * 0.5;
  const ny = Math.sin(angle + Math.PI / 2) * hiltLen * 0.5;
  ctx.strokeStyle = "#7f1d1d";
  ctx.lineWidth = Math.max(3, entity.radius * 0.18);
  ctx.beginPath();
  ctx.moveTo(handX - nx, handY - ny);
  ctx.lineTo(handX + nx, handY + ny);
  ctx.stroke();
}

function drawEquippedArmor(ctx, entity) {
  if (!entity.hasArmor) return;

  const side = entity.armorSide || 1;
  const cx = entity.x + side * entity.radius * 0.42;
  const cy = entity.y + entity.radius * 0.06;
  const rr = entity.radius * 0.58;

  ctx.fillStyle = "rgba(148,163,184,0.9)";
  ctx.beginPath();
  ctx.arc(cx, cy, rr, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#f8fafc";
  ctx.lineWidth = Math.max(2, entity.radius * 0.09);
  ctx.beginPath();
  ctx.arc(cx, cy, rr * 0.6, 0, Math.PI * 2);
  ctx.stroke();
}

function drawEntity(ctx, entity) {
  if (!entity.alive) return;

  if (entity.kind === "player") {
    ctx.beginPath();
    ctx.arc(entity.x, entity.y, entity.radius * 1.45, 0, Math.PI * 2);
    ctx.fillStyle = `${entity.color}33`;
    ctx.fill();
    ctx.shadowColor = entity.color;
    ctx.shadowBlur = 18;
  } else {
    ctx.shadowBlur = 0;
  }

  drawEvolutionParts(ctx, entity);

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
  ctx.shadowBlur = 0;

  drawEquippedArmor(ctx, entity);
  drawSword(ctx, entity);

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

export function render(ctx, state, config) {
  drawArena(ctx, config.world, config.platforms);
  drawArmorPickup(ctx, state.armorPickup);
  for (const entity of state.entities) {
    drawEntity(ctx, entity);
  }
}
