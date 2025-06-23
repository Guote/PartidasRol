/**
 * This is the entry file for the FoundryVTT module to configure resource bars.
 * @author Adrian Haberecht
 */

import { extendBarRenderer } from "./module/rendering.js";
import { extendDefaultTokenConfig, extendTokenConfig } from "./module/config.js";
import { extendTokenHud } from "./module/hud.js";
import { getDefaultResources, registerSettings } from "./module/settings.js";
import { prepareCreation, prepareUpdate } from "./module/synchronization.js";
import * as api from "./module/api.js";

/** Hook to register settings. */
Hooks.once('init', async function () {
    console.log('Bar Brawl | Initializing barbrawl');
    game.modules.get("barbrawl").api = window.BarBrawlApi = {
        getBars: api.getBars,
        getBar: api.getBar,
        isBarVisible: api.isBarVisible,
        getActualBarValue: api.getActualBarValue,
        getDefaultBars: getDefaultResources
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

/** Hook to make sure that bars are rendered when any changes are made. */
Hooks.on("updateToken", function (doc, changes) {
    if (foundry.utils.hasProperty(changes, "flags.barbrawl.resourceBars")) {
        doc.object.renderFlags.set({ refreshBars: true });
    }
});

/** Hook to apply changes to the prototype token. */
Hooks.on("preUpdateActor", function (actor, newData) {
    if (newData.prototypeToken) prepareUpdate(actor.prototypeToken, newData.prototypeToken);
});

Hooks.on("preCreateActor", function (doc) {
    if (doc._stats?.createdTime) return; // Actor is a copy, don't touch it.
    if (!doc.prototypeToken) return;

    const barConfig = getDefaultResources(doc.type);
    if (barConfig) doc.updateSource({ "prototypeToken.flags.barbrawl.resourceBars": barConfig }, { recursive: false });

    prepareCreation(doc.prototypeToken);
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