import { injectConfig } from "./lib/injectConfig.js";
import { TileHandler } from './handlers/tileHandler.js';
import { RefreshHandler } from './handlers/refreshHandler.js';
import { DrawingHandler } from "./handlers/drawingHandler.js";
import { UIHandler } from "./handlers/uiHandler.js";
import { SightHandler } from "./handlers/sightHandler.js";
import { LightHandler } from "./handlers/lightHandler.js";
import { SoundHandler } from "./handlers/soundHandler.js";
import { NoteHandler } from "./handlers/noteHandler.js";
import { TokenHandler } from "./handlers/tokenHandler.js";
import { TemplateHandler } from "./handlers/templateHandler.js";
import { FoWHandler } from "./handlers/fowHandler.js";
import { BackgroundHandler } from "./handlers/backgroundHandler.js";
import { SettingsHandler } from "./handlers/settingsHandler.js";
import { LevelsAPI } from "./API.js";
import { registerWrappers } from './wrappers.js';
import { inRange,getRangeForDocument, cloneTileMesh, inDistance } from './helpers.js';

//warnings

Hooks.on('ready', () => {
  if(!game.user.isGM) return;
  const recommendedVersion = '10.291';

  if(isNewerVersion(recommendedVersion, game.version)) {
    ui.notifications.error(`Levels recommends Foundry VTT version ${recommendedVersion} or newer. Levels might not work as expected in the currently installed version (${game.version}).`, {permanent: true});
    return;
  }
})

Object.defineProperty(globalThis, "_levels", {
  get: () => {
    console.warn("Levels: _levels is deprecated. Use CONFIG.Levels.API instead.");
    return CONFIG.Levels.API;
  }
})

Object.defineProperty(TileDocument.prototype, "elevation", {
  get: function () {
    if(CONFIG.Levels?.UI?.rangeEnabled && !this.id){
      return parseFloat(CONFIG.Levels.UI.range[0] || 0);
    }
    return this.overhead ? this.flags?.levels?.rangeBottom ?? canvas.scene.foregroundElevation : canvas.primary.background.elevation;
  }
});

Object.defineProperty(DrawingDocument.prototype, "elevation", {
  get: function () {
    if(CONFIG.Levels?.UI?.rangeEnabled && !this.id){
      return parseFloat(CONFIG.Levels.UI.range[0] || 0);
    }
    return this.flags?.levels?.rangeBottom ?? canvas.primary.background.elevation;
  }
});

Object.defineProperty(NoteDocument.prototype, "elevation", {
  get: function () {
    return this.flags?.levels?.rangeBottom ?? canvas.primary.background.elevation;
  }
});

Object.defineProperty(AmbientLightDocument.prototype, "elevation", {
  get: function () {
    if(CONFIG.Levels.UI.rangeEnabled && !this.id){
      return parseFloat(CONFIG.Levels.UI.range[0] || 0);
    }
    return this.flags?.levels?.rangeBottom ?? canvas.primary.background.elevation;
  }
});

Object.defineProperty(AmbientSoundDocument.prototype, "elevation", {
  get: function () {
    if(CONFIG.Levels.UI.rangeEnabled && !this.id){
      return parseFloat(CONFIG.Levels.UI.range[0] || 0);
    }
    if(isNaN(this.flags?.levels?.rangeBottom))return canvas.primary.background.elevation;
    return (this.flags?.levels?.rangeBottom + (this.flags?.levels?.rangeTop ?? this.flags?.levels?.rangeBottom)) / 2;
  }
});

Object.defineProperty(MeasuredTemplateDocument.prototype, "elevation", {
  get: function () {
    return this.flags?.levels?.elevation ?? canvas.primary.background.elevation;
  }
});

Object.defineProperty(WeatherEffects.prototype, "elevation", {
  get: function () {
    return canvas?.scene?.flags?.levels?.weatherElevation ?? Infinity;
  },
  set: function (value) {
    console.error("Cannot set elevation on WeatherEffects. Levels overrides WeatherEffects.prototype.elevation core behaviour. If you wish to set the WeatherEffects elevation, use SceneDocument.flags.levels.weatherElevation");
  }
});

Hooks.on("init", () => {
  const canvas3d = game.modules.get("levels-3d-preview")?.active;

  CONFIG.Levels = {
    MODULE_ID: "levels"
  }

  Object.defineProperty(CONFIG.Levels, "useCollision3D", {
    get: function () {
      return canvas3d && canvas.scene.flags["levels-3d-preview"]?.object3dSight
    }
  })

  Object.defineProperty(CONFIG.Levels, "currentToken", {
    get: function () {
      return this._currentToken;
    },
    set: function (value) {
      this._currentToken = value;
      Hooks.callAll("levelsPerspectiveChanged", this._currentToken);
    }
  })

  CONFIG.Levels.handlers = {
      TileHandler,
      RefreshHandler,
      DrawingHandler,
      UIHandler,
      SightHandler,
      LightHandler,
      SoundHandler,
      NoteHandler,
      TokenHandler,
      TemplateHandler,
      FoWHandler,
      BackgroundHandler,
      SettingsHandler,

  }

  CONFIG.Levels.helpers = {
      inRange,
      getRangeForDocument,
      cloneTileMesh,
      inDistance
  }

  CONFIG.Levels.API = LevelsAPI;

  CONFIG.Levels.UI = new LevelsUI();

  CONFIG.Levels.settings = new SettingsHandler();

  Hooks.callAll("levelsInit", CONFIG.Levels);

  registerWrappers();

  CONFIG.Levels.FoWHandler = new FoWHandler();
  CONFIG.Levels.handlers.BackgroundHandler.setupElevation();

  Hooks.callAll("levelsReady", CONFIG.Levels);

})

Hooks.once("ready", () => {
  if (game.modules.get("levels-3d-preview")?.active) return;
  // Module title
  const MODULE_ID = CONFIG.Levels.MODULE_ID;
  const MODULE_TITLE = game.modules.get(MODULE_ID).title;

  const FALLBACK_MESSAGE_TITLE = MODULE_TITLE;
  const FALLBACK_MESSAGE = `<large>
  <p><strong>This module may be very complicated for a first timer, be sure to stop by my <a href="https://theripper93.com/">Discord</a> for help and support from the wonderful community as well as many resources</strong></p>

  <p>Thanks to all the patreons supporting the development of this module making continued updates possible!</p>
  <p>If you want to support the development of the module or get customized support in setting up your maps you can do so here : <a href="https://www.patreon.com/theripper93">Patreon</a> </p></large>
  <p><strong>Patreons</strong> get also access to <strong>15+ premium modules</strong></p>
  <p>Is Levels not enough? Go Full 3D</p>
  <h1>3D Canvas</h1>
  <iframe width="385" height="225" src="https://www.youtube.com/embed/hC1QGZFUhcU" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
  <p>Check 3D Canvas and all my other <strong>15+ premium modules <a href="https://theripper93.com/">Here</a></strong></p>
  <p>Special thanks to Baileywiki for the support and feedback and Blair for the amazing UI elements</p>`;

  // Settings key used for the "Don't remind me again" setting
  const DONT_REMIND_AGAIN_KEY = "popup-dont-remind-again-2";

  // Dialog code
  game.settings.register(MODULE_ID, DONT_REMIND_AGAIN_KEY, {
    name: "",
    default: false,
    type: Boolean,
    scope: "world",
    config: false,
  });
  if (game.user.isGM && !game.settings.get(MODULE_ID, DONT_REMIND_AGAIN_KEY)) {
    new Dialog({
      title: FALLBACK_MESSAGE_TITLE,
      content: FALLBACK_MESSAGE,
      buttons: {
        ok: { icon: '<i class="fas fa-check"></i>', label: "Understood" },
        dont_remind: {
          icon: '<i class="fas fa-times"></i>',
          label: "Don't remind me again",
          callback: () =>
            game.settings.set(MODULE_ID, DONT_REMIND_AGAIN_KEY, true),
        },
      },
    }).render(true);
  }
});

Hooks.on("init", () => {
  game.settings.register(CONFIG.Levels.MODULE_ID, "tokenElevScale", {
    name: game.i18n.localize("levels.settings.tokenElevScale.name"),
    hint: game.i18n.localize("levels.settings.tokenElevScale.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: () => {
      CONFIG.Levels.settings.cacheSettings()
    },
  });

  game.settings.register(CONFIG.Levels.MODULE_ID, "tokenElevScaleMultiSett", {
    name: game.i18n.localize("levels.settings.tokenElevScaleMultiSett.name"),
    hint: game.i18n.localize("levels.settings.tokenElevScaleMultiSett.hint"),
    scope: "world",
    config: true,
    type: Number,
    range: {
      min: 0.1,
      max: 2,
      step: 0.1,
    },
    default: 1,
    onChange: () => {
      CONFIG.Levels.settings.cacheSettings()
    },
  });

  game.settings.register(CONFIG.Levels.MODULE_ID, "fogHiding", {
    name: game.i18n.localize("levels.settings.fogHiding.name"),
    hint: game.i18n.localize("levels.settings.fogHiding.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => {
      CONFIG.Levels.settings.cacheSettings()
    },
  });

  game.settings.register(CONFIG.Levels.MODULE_ID, "revealTokenInFog", {
    name: game.i18n.localize("levels.settings.revealTokenInFog.name"),
    hint: game.i18n.localize("levels.settings.revealTokenInFog.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: () => {
      CONFIG.Levels.settings.cacheSettings()
    },
  });

  game.settings.register(CONFIG.Levels.MODULE_ID, "lockElevation", {
    name: game.i18n.localize("levels.settings.lockElevation.name"),
    hint: game.i18n.localize("levels.settings.lockElevation.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: () => {
      CONFIG.Levels.settings.cacheSettings()
    },
  });

  game.settings.register(CONFIG.Levels.MODULE_ID, "hideElevation", {
    name: game.i18n.localize("levels.settings.hideElevation.name"),
    hint: game.i18n.localize("levels.settings.hideElevation.hint"),
    scope: "world",
    config: true,
    type: Number,
    choices: {
      0: game.i18n.localize("levels.settings.hideElevation.opt0"),
      1: game.i18n.localize("levels.settings.hideElevation.opt1"),
      2: game.i18n.localize("levels.settings.hideElevation.opt2"),
    },
    default: 0,
    onChange: () => {
      CONFIG.Levels.settings.cacheSettings()
    },
  });

  game.settings.register(CONFIG.Levels.MODULE_ID, "enableTooltips", {
    name: game.i18n.localize("levels.settings.enableTooltips.name"),
    hint: game.i18n.localize("levels.settings.enableTooltips.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => {
      CONFIG.Levels.settings.cacheSettings()
    },
  });

  game.settings.register(CONFIG.Levels.MODULE_ID, "preciseTokenVisibility", {
    name: game.i18n.localize("levels.settings.preciseTokenVisibility.name"),
    hint: game.i18n.localize("levels.settings.preciseTokenVisibility.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => {
      CONFIG.Levels.settings.cacheSettings()
    },
  });

  game.settings.register(CONFIG.Levels.MODULE_ID, "exactTokenVisibility", {
    name: game.i18n.localize("levels.settings.exactTokenVisibility.name"),
    hint: game.i18n.localize("levels.settings.exactTokenVisibility.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: () => {
      CONFIG.Levels.settings.cacheSettings()
    },
  });
});

Hooks.on("updateTile", (tile, updates) => {
  if(updates?.flags?.levels?.allWallBlockSight !== undefined){
    canvas.walls.placeables.forEach(w => w.identifyInteriorState())
    WallHeight.schedulePerceptionUpdate()
  }
})

Hooks.on("renderTileConfig", (app, html, data) => {
  const isInjected = html.find(`input[name="flags.${CONFIG.Levels.MODULE_ID}.rangeTop"]`).length > 0;
  if(isInjected) return;

  const injHtml = injectConfig.inject(app, html, {
      moduleId: "levels",
      tab: {
          name: "levels",
          label: "Levels",
          icon: "fas fa-layer-group",
      },
      rangeTop: {
          type: "number",
          label: game.i18n.localize("levels.tilecoonfig.rangeTop.name"),
          units: game.i18n.localize("levels.tilecoonfig.range.unit"),
          default: "",
          placeholder: "Infinity",
          step: "any",
      },
      rangeBottom: {
          type: "number",
          label: game.i18n.localize("levels.tilecoonfig.rangeBottom.name"),
          units: game.i18n.localize("levels.tilecoonfig.range.unit"),
          default: "",
          placeholder: "-Infinity",
          step: "any",
      },
      showIfAbove: {
          type: "checkbox",
          label: game.i18n.localize("levels.tilecoonfig.showIfAbove.name"),
          notes: game.i18n.localize("levels.tilecoonfig.showIfAbove.hint"),
      },
      showAboveRange: {
          type: "number",
          label: game.i18n.localize("levels.tilecoonfig.showAboveRange.name"),
          notes: game.i18n.localize("levels.tilecoonfig.showAboveRange.hint"),
          units: game.i18n.localize("levels.tilecoonfig.range.unit"),
          default: "",
          placeholder: "Infinity",
      },
      noCollision: {
          type: "checkbox",
          label: game.i18n.localize("levels.tilecoonfig.noCollision.name"),
          notes: game.i18n.localize("levels.tilecoonfig.noCollision.hint"),
      },
      noFogHide: {
          type: "checkbox",
          label: game.i18n.localize("levels.tilecoonfig.noFogHide.name"),
          notes: game.i18n.localize("levels.tilecoonfig.noFogHide.hint"),
      },
      isBasement: {
          type: "checkbox",
          label: game.i18n.localize("levels.tilecoonfig.isBasement.name"),
          notes: game.i18n.localize("levels.tilecoonfig.isBasement.hint"),
      },
      allWallBlockSight: {
          type: "checkbox",
          label: game.i18n.localize("levels.tilecoonfig.allWallBlockSight.name"),
          notes: game.i18n.localize("levels.tilecoonfig.allWallBlockSight.hint"),
          default: true,
      },
  });
  injHtml.find(`input[name="flags.${CONFIG.Levels.MODULE_ID}.rangeTop"]`).closest(".form-group").before(`
  <p class="notes" style="color: red" id="no-overhead-warning">${game.i18n.localize("levels.tilecoonfig.noOverhead")}</>
  `);
  html.on("change", "input", (e) => {
    const isOverhead = html.find(`input[name="overhead"]`).is(":checked");
    const isShowIfAbove = injHtml.find(`input[name="flags.levels.showIfAbove"]`).is(":checked");
    injHtml.find("input").prop("disabled", !isOverhead);
    injHtml.find("input[name='flags.levels.showAboveRange']").closest(".form-group").toggle(isShowIfAbove);
    html.find("#no-overhead-warning").toggle(!isOverhead);
    app.setPosition({ height: "auto" });
  })
  html.find(`input[name="overhead"]`).trigger("change");
  app.setPosition({ height: "auto" });
});

Hooks.on("renderAmbientLightConfig", (app, html, data) => {
  const injHtml = injectConfig.inject(app, html, {
      moduleId: "levels",
      inject: 'input[name="config.dim"]',
      rangeTop: {
          type: "number",
          label: game.i18n.localize("levels.tilecoonfig.rangeTop.name"),
          units: game.i18n.localize("levels.tilecoonfig.range.unit"),
          default: "",
          placeholder: "Infinity",
          step: "any",
      },
      rangeBottom: {
          type: "number",
          label: game.i18n.localize("levels.tilecoonfig.rangeBottom.name"),
          units: game.i18n.localize("levels.tilecoonfig.range.unit"),
          default: "",
          placeholder: "-Infinity",
          step: "any",
      },
  });
});

Hooks.on("renderNoteConfig", (app, html, data) => {
  const injHtml = injectConfig.inject(app, html, {
      moduleId: "levels",
      inject: 'select[name="textAnchor"]',
      rangeTop: {
          type: "number",
          label: game.i18n.localize("levels.tilecoonfig.rangeTop.name"),
          units: game.i18n.localize("levels.tilecoonfig.range.unit"),
          default: "",
          placeholder: "Infinity",
          step: "any",
      },
      rangeBottom: {
          type: "number",
          label: game.i18n.localize("levels.tilecoonfig.rangeBottom.name"),
          units: game.i18n.localize("levels.tilecoonfig.range.unit"),
          default: "",
          placeholder: "-Infinity",
          step: "any",
      },
  });
});

Hooks.on("renderAmbientSoundConfig", (app, html, data) => {
  const injHtml = injectConfig.inject(app, html, {
      moduleId: "levels",
      inject: 'input[name="radius"]',
      rangeTop: {
          type: "number",
          label: game.i18n.localize("levels.tilecoonfig.rangeTop.name"),
          units: game.i18n.localize("levels.tilecoonfig.range.unit"),
          default: "",
          placeholder: "Infinity",
          step: "any",
      },
      rangeBottom: {
          type: "number",
          label: game.i18n.localize("levels.tilecoonfig.rangeBottom.name"),
          units: game.i18n.localize("levels.tilecoonfig.range.unit"),
          default: "",
          placeholder: "-Infinity",
          step: "any",
      },
  });
});

Hooks.on("renderDrawingConfig", (app, html, data) => {

  const injHtml = injectConfig.inject(app, html, {
      moduleId: "levels",
      inject: 'input[name="z"]',
      drawingMode: {
          type: "select",
          label: game.i18n.localize("levels.drawingconfig.isHole.name"),
          default: 0,
          dType: "Number",
          options: {
              0: game.i18n.localize("levels.drawingconfig.isHole.opt0"),
              2: game.i18n.localize("levels.drawingconfig.isHole.opt2"),
              21: game.i18n.localize("levels.drawingconfig.isHole.opt21"),
              22: game.i18n.localize("levels.drawingconfig.isHole.opt22"),
              3: game.i18n.localize("levels.drawingconfig.isHole.opt3"),
          },
      },
      elevatorFloors: {
          type: "text",
          label: game.i18n.localize("levels.drawingconfig.elevatorFloors.name"),
          notes: game.i18n.localize("levels.drawingconfig.elevatorFloors.hint"),
      },
      rangeTop: {
          type: "number",
          label: game.i18n.localize("levels.tilecoonfig.rangeTop.name"),
          units: game.i18n.localize("levels.tilecoonfig.range.unit"),
          default: "",
          placeholder: "Infinity",
          step: "any",
      },
      rangeBottom: {
          type: "number",
          label: game.i18n.localize("levels.tilecoonfig.rangeBottom.name"),
          units: game.i18n.localize("levels.tilecoonfig.range.unit"),
          default: "",
          placeholder: "-Infinity",
          step: "any",
      },
  });
});

Hooks.on("renderMeasuredTemplateConfig", (app, html, data) => {
  const injHtml = injectConfig.inject(app, html, {
      moduleId: "levels",
      inject: 'input[name="width"]',
      elevation: {
          type: "text",
          dType: "Number",
          label: game.i18n.localize("levels.template.elevation.name"),
          units: game.i18n.localize("levels.tilecoonfig.range.unit"),
          default: Infinity,
          step: "any",
      },
      special: {
          type: "number",
          label: game.i18n.localize("levels.template.depth.name"),
          default: 0,
          dType: "Number",
      },
  });
});

Hooks.on("renderDrawingHUD", (data, hud, drawData) => {
  let drawing = data.object.document;
  if (drawing.getFlag(CONFIG.Levels.MODULE_ID, "drawingMode")) {
    let active = drawing.getFlag(CONFIG.Levels.MODULE_ID, "stairLocked") || false;
    let toggleStairbtn = `<div class="control-icon${
      active ? " active" : ""
    }" id="toggleStair">
              <i class="fas fa-lock" width="36" height="36" title='${game.i18n.localize(
                "levels.drawingHud.title"
              )}'></i>
                              </div>`;
    const controlIcons = hud.find("div.control-icon");
    controlIcons.last().after(toggleStairbtn);
    $(hud.find(`div[id="toggleStair"]`)).on("click", test);
    function test() {
      console.log("test");
      active = !active;
      drawing.setFlag(
        CONFIG.Levels.MODULE_ID,
        "stairLocked",
        !(drawing.getFlag(CONFIG.Levels.MODULE_ID, "stairLocked") || false)
      );
      let hudbtn = hud.find(`div[id="toggleStair"]`);
      if (active) hudbtn.addClass("active");
      else hudbtn.removeClass("active");
    }
  }
});

Hooks.on("renderTokenHUD", (data, hud, drawData) => {
  if (
    CONFIG.Levels.settings.get("lockElevation") &&
    !game.user.isGM
  ) {
    const controlIcons = hud.find(`div[class="attribute elevation"]`);
    $(controlIcons[0]).remove();
  }
});

Hooks.on("preCreateMeasuredTemplate", (template) => {
  const templateData = CONFIG.Levels.handlers.TemplateHandler.getTemplateData();
  if(template.flags?.levels?.elevation) return;
  template.updateSource({
    flags: { levels: { elevation: templateData.elevation, special: templateData.special } },
  });
});

Hooks.on("renderSceneConfig", (app, html, data) => {
  injectConfig.inject(app, html, {
    "moduleId": "levels",
        "inject": 'input[name="foregroundElevation"]',
        "backgroundElevation": {
          type: "number",
          label: game.i18n.localize("levels.sceneconfig.backgroundElevation.name"),
          notes: game.i18n.localize("levels.sceneconfig.backgroundElevation.notes"),
          default: 0,
        },
  });

  injectConfig.inject(app, html, {
    "moduleId": "levels",
        "inject": 'select[name="weather"]',
        "weatherElevation": {
          type: "number",
          label: game.i18n.localize("levels.sceneconfig.weatherElevation.name"),
          notes: game.i18n.localize("levels.sceneconfig.weatherElevation.notes"),
          default: "",
          placeholder: "Infinity"
        },
  });

  injectConfig.inject(app, html, {
    "moduleId": "levels",
        "inject": 'input[name="fogExploration"]',
        "lightMasking": {
          type: "checkbox",
          label: game.i18n.localize("levels.sceneconfig.lightMasking.name"),
          notes: game.i18n.localize("levels.sceneconfig.lightMasking.notes"),
          default: true,
        },
  });
})
