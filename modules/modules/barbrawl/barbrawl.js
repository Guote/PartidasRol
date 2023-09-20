/**
 * This is the entry file for the FoundryVTT module to configure resource bars.
 * @author Adrian Haberecht
 */

import { extendBarRenderer } from "./module/rendering.js";
import { extendDefaultTokenConfig, extendTokenConfig } from "./module/config.js";
import { extendTokenHud } from "./module/hud.js";
import { getDefaultResources, registerSettings } from "./module/settings.js";
import { createOverrideData, prepareUpdate } from "./module/synchronization.js";
import * as api from "./module/api.js";

/** Hook to register settings. */
Hooks.once('init', async function () {
    console.log('Bar Brawl | Initializing barbrawl');
    window.BarBrawlApi = {
        getBars: api.getBars,
        getBar: api.getBar,
        isBarVisible: api.isBarVisible,
        getActualBarValue: api.getActualBarValue
    }

    registerSettings();
    Handlebars.registerHelper("barbrawl-concat", function () {
        let output = "";
        for (let input of arguments) {
            if (typeof input !== "object") output += input;
        }
        return output;
    });

    loadTemplates(["modules/barbrawl/templates/bar-config.hbs"]);
    extendDefaultTokenConfig();
});

/** Hooks to replace UI elements. */
Hooks.once("setup", extendBarRenderer);
Hooks.on("renderTokenHUD", extendTokenHud);
Hooks.on("renderTokenConfig", extendTokenConfig);

/** Hook to remove bars and synchronize legacy bars. */
Hooks.on("preUpdateToken", function (doc, changes) {
    prepareUpdate(doc, changes);
});

/** Hook to apply changes to the prototype token. */
Hooks.on("preUpdateActor", function (actor, newData) {
    if (!hasProperty(newData, "prototypeToken.flags.barbrawl.resourceBars")) return;
    prepareUpdate(actor.prototypeToken, newData.prototypeToken);
});

/** Hooks to initialize tokens and actors with default bars. */
Hooks.on("preCreateToken", function (doc, data) {
    // Always make the bar container visible.
    doc.updateSource({ displayBars: CONST.TOKEN_DISPLAY_MODES.ALWAYS });

    const actor = game.actors.get(data.actorId);
    if (!actor || hasProperty(actor, "prototypeToken.flags.barbrawl.resourceBars")) return; // Don't override prototype.

    const barConfig = getDefaultResources(actor.type);
    if (!barConfig) return;
    doc.updateSource(createOverrideData(barConfig));
});

Hooks.on("preCreateActor", function (doc) {
    if (!doc.prototypeToken || foundry.utils.hasProperty(doc.prototypeToken, "flags.barbrawl.resourceBars")) return;

    const barConfig = getDefaultResources(doc.type);
    if (!barConfig) return;
    doc.updateSource(createOverrideData(barConfig, true));
});

/** Hook to update bar visibility. */
Hooks.on("hoverToken", api.refreshBarVisibility);
Hooks.on("controlToken", api.refreshBarVisibility);
Hooks.on("createCombatant", function (combatant) {
    const token = combatant.token?.object;
    if (token) api.refreshBarVisibility(token);
});
Hooks.on("deleteCombatant", function (combatant) {
    const token = combatant.token?.object;
    if (token) api.refreshBarVisibility(token);
})