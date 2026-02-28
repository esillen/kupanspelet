import { createWorldConfig } from "./config.js";
import { buildEntities } from "./entities.js";
import { createArmorPickup, update } from "./gameplay.js";
import { bindInput } from "./input.js";
import { render } from "./render.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const config = createWorldConfig(canvas.width, canvas.height);

function randomChaosDelay() {
  return 8 + Math.random() * 10;
}

const state = {
  entities: [],
  nextEntityId: 0,
  armorPickup: null,
  pressed: new Set(),
  lastTime: 0,
  chaos: {
    timerUntilFlip: randomChaosDelay(),
    upsideDown: false,
    holdTimer: 0,
    angle: 0,
  },
};

function restart() {
  state.entities = buildEntities(config.world);
  state.nextEntityId = state.entities.reduce((maxId, entity) => Math.max(maxId, entity.id), -1) + 1;
  state.armorPickup = createArmorPickup(config);
  state.lastTime = 0;
  state.chaos.timerUntilFlip = randomChaosDelay();
  state.chaos.upsideDown = false;
  state.chaos.holdTimer = 0;
  state.chaos.angle = 0;
}

bindInput(window, state, restart);

function updateChaos(dt) {
  const chaos = state.chaos;

  if (!chaos.upsideDown) {
    chaos.timerUntilFlip -= dt;
    if (chaos.timerUntilFlip <= 0) {
      chaos.upsideDown = true;
      chaos.holdTimer = 2.4 + Math.random() * 1.8;
    }
  } else {
    chaos.holdTimer -= dt;
    if (chaos.holdTimer <= 0) {
      chaos.upsideDown = false;
      chaos.timerUntilFlip = randomChaosDelay();
    }
  }

  const targetAngle = chaos.upsideDown ? Math.PI : 0;
  chaos.angle += (targetAngle - chaos.angle) * Math.min(1, dt * 7);
}

function frame(ts) {
  if (!state.lastTime) state.lastTime = ts;
  const dt = Math.min(0.033, (ts - state.lastTime) / 1000);
  state.lastTime = ts;

  update(state, config, dt);
  updateChaos(dt);

  ctx.save();
  ctx.translate(config.world.width * 0.5, config.world.height * 0.5);
  ctx.rotate(state.chaos.angle);
  ctx.translate(-config.world.width * 0.5, -config.world.height * 0.5);
  render(ctx, state, config);
  ctx.restore();

  requestAnimationFrame(frame);
}

restart();
requestAnimationFrame(frame);
