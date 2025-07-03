import { registerSettings } from "./utils/registerSettings.js";
import { Logger } from "./utils/log.js";
import { preloadTemplates } from "./utils/preloadTemplates.js";
import ABFActorSheet from "./module/actor/ABFActorSheet.js";
import ABFFoundryRoll from "./module/rolls/ABFFoundryRoll.js";
import ABFCombat from "./module/combat/ABFCombat.js";
import { ABFActor } from "./module/actor/ABFActor.js";
import { registerHelpers } from "./utils/handlebars-helpers/registerHelpers.js";
import ABFItemSheet from "./module/items/ABFItemSheet.js";
import { ABFConfig } from "./module/ABFConfig.js";
import ABFItem from "./module/items/ABFItem.js";
import ABFActorDirectory from "./module/SidebarDirectories/ABFActorDirectory.js";
import { registerCombatWebsocketRoutes } from "./module/combat/websocket/registerCombatWebsocketRoutes.js";
import { attachCustomMacroBar } from "./utils/attachCustomMacroBar.js";
import { applyMigrations } from "./module/migration/migrate.js";
import ABFSimpleActorSheet from "./module/actor/ABFSimpleActorSheet.js";

/* empty css                  */
Hooks.once("init", async () => {
  Logger.log("Initializing system");
  CONFIG.Actor.documentClass = ABFActor;
  CONFIG.config = ABFConfig;
  window.ABFFoundryRoll = ABFFoundryRoll;
  CONFIG.Dice.rolls = [ABFFoundryRoll, ...CONFIG.Dice.rolls];
  CONFIG.Combat.documentClass = ABFCombat;
  CONFIG.Combat.initiative = {
    formula: "1d100Initiative",
    decimals: 2,
  };
  CONFIG.Item.documentClass = ABFItem;
  CONFIG.ui.actors = ABFActorDirectory;
  /* CONFIG.statusEffects = (CONFIG.statusEffects ?? []).concat(
    statusEffects.map((effect) => ({
      ...effect,
      id: effect.id,
      flags: {
        core: { statusId: effect.id },
      },
    }))
  ); */

  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("abf", ABFActorSheet, { makeDefault: true });
  Actors.registerSheet("abf", ABFSimpleActorSheet);
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("abf", ABFItemSheet, {
    makeDefault: true,
  });
  registerSettings();
  registerHelpers();
  await preloadTemplates();
});
Hooks.once("setup", () => {});
Hooks.once("ready", () => {
  registerActiveEffects();
  registerCombatWebsocketRoutes();
  attachCustomMacroBar();
  applyMigrations();
});

Handlebars.JavaScriptCompiler.prototype.nameLookup = function (parent, name) {
  if (name.indexOf("xRoot") === 0) {
    return "data.root";
  }
  if (/^[0-9]+$/.test(name)) {
    return `${parent}[${name}]`;
  }
  if (Handlebars.JavaScriptCompiler.isValidJavaScriptVariableName(name)) {
    return `${parent}.${name}`;
  }
  return `${parent}['${name}']`;
};
