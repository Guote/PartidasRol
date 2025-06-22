/*****************************************************************************
 * Player Fog Layer · v12-compatible
 * ---------------------------------------------------------------------------
 * ①  Ensures every CanvasLayer instance has a callable activate() method.
 * ②  Registers PlayerFogLayer under the key "playerFogLayer".
 * ③  Provides the minimal _draw() stub required by Foundry VTT 12.
 *****************************************************************************/

export function registerPlayerFogLayer() {
  /* ────────────────────────────────────────────────────────────────────── */
  /* ❶  Patch core if CanvasLayer.activate is missing                      */
  /* ────────────────────────────────────────────────────────────────────── */
  if (typeof CanvasLayer.prototype.activate !== "function") {
    console.warn(
      "Player Fog Manager | CanvasLayer.activate missing – adding fallback."
    );

    CanvasLayer.prototype.activate = function (options) {
      // Mark this layer as active in the UI toolbar
      if (ui?.controls) ui.controls.activeLayer = this.layerOptions?.name;

      // Call the protected hook if the subclass defined one
      if (typeof this._activate === "function") this._activate(options);

      return this; // for chaining
    };
  }

  /* ────────────────────────────────────────────────────────────────────── */
  /* ❷  Only register once (hot-reload safe)                               */
  /* ────────────────────────────────────────────────────────────────────── */
  if (!CONFIG.Canvas.layers.playerFogLayer) {
    class PlayerFogLayer extends CanvasLayer {
      /* layer metadata */
      static get layerOptions() {
        return foundry.utils.mergeObject(super.layerOptions, {
          name: "playerFogLayer", // ← key used by controls.js
          group: "primary", // appears in canvas.layers.primary
          zIndex: 190, // between Lighting (180) & Notes (200)
        });
      }

      /* required draw stub (creates an empty PIXI container) */
      async _draw() {
        this.addChild(new PIXI.Container());
        return this;
      }

      /* optional: runs whenever the layer becomes active */
      _activate() {
        console.log("PlayerFogLayer is now active");
      }
    }

    /* v12 registration object */
    CONFIG.Canvas.layers.playerFogLayer = {
      group: "primary",
      layerClass: PlayerFogLayer,
    };

    console.log("Player Fog Manager | PlayerFogLayer registered");
  }
}
