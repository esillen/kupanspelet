import { createWorldConfig } from "./config.js";
import { buildEntities } from "./entities.js";
import { update } from "./gameplay.js";
import { bindInput } from "./input.js";
import { render } from "./render.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const config = createWorldConfig(canvas.width, canvas.height);

const state = {
  entities: [],
  pressed: new Set(),
  lastTime: 0,
};

function restart() {
  state.entities = buildEntities(config.world);
  state.lastTime = 0;
}

bindInput(window, state, restart);

function frame(ts) {
  if (!state.lastTime) state.lastTime = ts;
  const dt = Math.min(0.033, (ts - state.lastTime) / 1000);
  state.lastTime = ts;

  update(state, config, dt);
  render(ctx, state.entities, config);

  requestAnimationFrame(frame);
}

restart();
requestAnimationFrame(frame);
