import { registerPlayerFogLayer } from "./js/player-fog-layer.js";
import { registerFogControls } from "./js/controls.js";

Hooks.once("init", () => {
  console.log("Player Fog Manager | init");
  registerPlayerFogLayer();
  registerFogControls();
});

Hooks.once("canvasReady", () => {
  console.log("playerFogLayer on canvas =", canvas.playerFogLayer);
});
