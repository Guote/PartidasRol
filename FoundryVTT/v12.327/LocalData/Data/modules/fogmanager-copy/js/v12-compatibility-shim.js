/**
 * FogManager v12 Compatibility Shim — v0.4 (2025‑06‑22)
 * -----------------------------------------------------
 * Bridges legacy FogManager (v10) to Foundry VTT ≥ 12.327.
 *
 *  ➊ Drop this file in `modules/fogmanager/js/`
 *  ➋ Add **first** in `module.json → esmodules`
 *  ➌ Set the manifest block → `"compatibility": { "minimum": "12", "verified": "12.327", "maximum": "12" }`
 *
 * The shim is *temporary*. Once you migrate FogManager to the public v12 API
 * (canvas.fog & canvas.perception) you can delete this file.
 */

/* -------------------------------------------------------------------------
 * 1️⃣   Polyfill migrated globals → foundry.utils.*
 * ---------------------------------------------------------------------- */
Hooks.once("init", () => {
  const u = foundry.utils;
  const aliases = [
    "mergeObject",
    "isNewerVersion",
    "hasProperty",
    "getProperty",
    "setProperty",
    "expandObject",
  ];
  for (const fn of aliases) {
    if (!globalThis[fn]) {
      Object.defineProperty(globalThis, fn, {
        value: u[fn].bind(u),
        configurable: true,
        writable: false,
      });
    }
  }

  /* Scene#fogOverlay → Scene#fog.overlay (removed in v12) */
  if (!Object.getOwnPropertyDescriptor(Scene.prototype, "fogOverlay")) {
    Object.defineProperty(Scene.prototype, "fogOverlay", {
      get() {
        return this.fog?.overlay;
      },
      set(value) {
        return this.update({ "fog.overlay": value });
      },
      configurable: true,
    });
  }
});

/* -------------------------------------------------------------------------
 * 2️⃣  canvas.sight facade & pending container
 * ---------------------------------------------------------------------- */
Hooks.once("canvasInit", () => {
  // Core ≤11 already has the old API → skip
  if (canvas.sight || !canvas.fog) return;

  const fog = canvas.fog;
  const fogSprite = fog.sprite;

  // Saved/explored texture pair expected by v10 code
  const fogSaved = {};
  Object.defineProperty(fogSaved, "texture", {
    get: () => fogSprite.texture,
    set: (t) => (fogSprite.texture = t),
    configurable: true,
  });

  // Legacy brush staging container
  const pending = new PIXI.Container();
  pending.name = "PendingFog (shim)";
  fogSprite.addChild(pending);

  // Fake v10‑style object
  canvas.sight = {
    fog: { saved: fogSaved, explored: fogSprite.texture },
    pending,
    _fogTextures: [],
    _fogUpdated: false,
    loadFog: (...a) => fog.load(...a),
    saveFog: (...a) => fog.save(...a),
    commitFog: (...a) => fog.commit(...a),
    _configureFogResolution: () =>
      fog.textureConfiguration?.width ??
      fog.textureConfiguration?.resolution ??
      canvas.dimensions.sceneWidth,
  };

  // Placeholder for code that still pokes canvas._fog
  if (!canvas._fog)
    canvas._fog = { resolution: canvas.sight._configureFogResolution() };

  /* --------------------------------------------------------------
   * Visibility refresh alias — NO recursion, no obsolete flags
   * ----------------------------------------------------------- */
  const refreshVisibility = () =>
    canvas.perception?.update?.({ refreshOcclusion: true });

  canvas.sight.refresh = refreshVisibility;
  if (canvas.effects?.visibility) {
    canvas.effects.visibility.refresh = refreshVisibility;
  }

  console.info("[FogManager] v12 compatibility shim initialised (v0.4).");
});

/* -------------------------------------------------------------------------
 * 3️⃣  PIXI v8 colour helper (fixes ‘Unable to convert color [object Object]’)
 * ---------------------------------------------------------------------- */
Hooks.once("ready", () => {
  const FM = CONFIG.Canvas?.layers?.FogManagerLayer;
  if (!FM?.prototype?.setFill) return;

  const origSetFill = FM.prototype.setFill;
  FM.prototype.setFill = function (fill, alpha) {
    if (typeof fill === "object" && fill?.toNumber) fill = fill.toNumber();
    return origSetFill.call(this, fill, alpha);
  };
});
