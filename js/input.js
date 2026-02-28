export function bindInput(win, state, restart) {
  win.addEventListener("keydown", (event) => {
    state.pressed.add(event.code);
    if (event.code === "KeyR") restart();
  });

  win.addEventListener("keyup", (event) => {
    state.pressed.delete(event.code);
  });

  win.addEventListener("gamepadconnected", () => restart());
  win.addEventListener("gamepaddisconnected", () => restart());
}

export function inputForPlayer(entity, state) {
  const input = { move: 0, jump: false };

  const map = entity.keyboardMap;
  if (state.pressed.has(map.left)) input.move -= 1;
  if (state.pressed.has(map.right)) input.move += 1;
  if (state.pressed.has(map.jump)) input.jump = true;

  if (entity.gamepadIndex !== null) {
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

export function inputForNpc(entity, entities, dt) {
  const input = { move: 0, jump: false };
  const aliveOthers = entities.filter((p) => p.alive && p.id !== entity.id);
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

export function inputForEntity(entity, state, dt) {
  if (entity.kind === "npc") return inputForNpc(entity, state.entities, dt);
  return inputForPlayer(entity, state);
}
