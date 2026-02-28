function drawArena(ctx, world, platform) {
  ctx.clearRect(0, 0, world.width, world.height);

  const floorHeight = world.height - world.floorY;
  ctx.fillStyle = "#14532d";
  ctx.fillRect(0, world.floorY, world.width, floorHeight);

  ctx.fillStyle = "#166534";
  ctx.fillRect(0, world.floorY - 10, world.width, 10);

  const px = platform.x - platform.w * 0.5;
  const py = platform.y - platform.h * 0.5;

  ctx.fillStyle = "#78350f";
  ctx.fillRect(px, py, platform.w, platform.h);
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  ctx.fillRect(px, py, platform.w, 6);
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

export function render(ctx, entities, config) {
  drawArena(ctx, config.world, config.platform);
  for (const entity of entities) {
    drawEntity(ctx, entity);
  }
}
