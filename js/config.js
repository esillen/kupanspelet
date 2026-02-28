export const HUMAN_PLAYER_COUNT = 4;
export const NPC_COUNT = 8;
export const EVOLUTION_THRESHOLDS = [2, 4, 7];
export const PLAYER_RESPAWN_TIME = 0;
export const NPC_RESPAWN_TIME = 2.0;
export const ARMOR_RESPAWN_TIME = 6.0;
export const ARMOR_PICKUP_RADIUS = 14;

export const KEYMAPS = [
  { left: "KeyA", right: "KeyD", jump: "KeyW", attack: "KeyB" },
  { left: "ArrowLeft", right: "ArrowRight", jump: "ArrowUp", attack: "Slash" },
  { left: "KeyJ", right: "KeyL", jump: "KeyI", attack: "KeyO" },
  { left: "Numpad4", right: "Numpad6", jump: "Numpad8", attack: "Numpad9" },
];

export const PLAYER_COLORS = ["#ff2d55", "#00e5ff", "#ffd60a", "#00f57a"];
export const NPC_COLOR = "#8b93a6";

export function createWorldConfig(width, height) {
  const world = {
    width,
    height,
    gravity: 2400,
    floorY: height - 48,
  };

  const platforms = [
    { x: world.width * 0.5, y: world.height * 0.53, w: 380, h: 26 },
    { x: world.width * 0.25, y: world.height * 0.68, w: 270, h: 24 },
    { x: world.width * 0.75, y: world.height * 0.68, w: 270, h: 24 },
    { x: world.width * 0.5, y: world.height * 0.36, w: 220, h: 22 },
  ];

  return { world, platforms };
}
