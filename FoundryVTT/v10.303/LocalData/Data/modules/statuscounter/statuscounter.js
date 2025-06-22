/**
 * This is the entry file for the FoundryVTT module to manipulate and display 
 * 	counters for status effects.
 * @author Adrian Haberecht
 */

import { registerSettings } from './module/settings.js';
import { redrawEffectCounters, extendEffectRenderer, extendCombatTracker } from './module/rendering.js';
import { registerKeybinds, onEffectKeyDown } from './module/keybinds.js';
import { registerCountdown, registerCountdownSettings } from './module/countdown.js';
import { registerMultiplier } from './module/multiplier.js';
import { ActiveEffectCounter, CounterTypes, EffectCounter } from './module/api.js';
import { synchronizeEffectCounters } from "./module/synchronization.js";

/** Hook to register settings. */
Hooks.once('init', async function() {
	console.log('statuscounter | Initializing statuscounter');

	// Global class registrations
	window.EffectCounter = EffectCounter;
	window.ActiveEffectCounter = ActiveEffectCounter;
	window.CounterTypes = CounterTypes;

	// Register counter types
	CounterTypes.addType("statuscounter.simple");
	registerMultiplier();
    registerCountdown();

    // Register custom module settings
    registerSettings();
    registerCountdownSettings();

    if (game.system.id === "sfrpg") {
        // Override the active effect toggle to prevent duplicates.
        const originalToggle = CONFIG.Token.documentClass.prototype.toggleActiveEffect;
        CONFIG.Token.documentClass.prototype.toggleActiveEffect = async function (effectData, { overlay = false, active } = {}) {
            if (active === true && overlay === false && effectData.id) {
                const existing = this.actor?.effects.find(e => e.getFlag("core", "statusId") === effectData.id);
                if (existing) return true;
            }

            return originalToggle.apply(this, arguments);
        }
    }
});

/** Hook to extend the status effect rendering. */
Hooks.once("setup", function() {
    extendEffectRenderer();
});

/** Hook to register the global key events. */
Hooks.once("ready", function() {
	$(document).on("keydown.statuscounter", onEffectKeyDown);
});

/** Hook to apply custom keybinds to the token HUD. */
Hooks.on("renderTokenHUD", function(tokenHud, html) {
	registerKeybinds(tokenHud, html);
});

/** Hook to render status counters on the combat tracker. */
Hooks.on("renderCombatTracker", function(_combatTracker, html) {
	extendCombatTracker(html);
});

/** Hook to synchronize status counters and effects. */
Hooks.on("preUpdateToken", function(token, changes) {
    synchronizeEffectCounters(token, changes);
});

/** Hook to update status counters without redrawing all effects. */
Hooks.on("updateToken", function(token, changes) {
	if ("effects" in changes || hasProperty(changes, "actorData.effects")) {
        let tokenId = foundry.utils.getProperty(canvas, "tokens.hud.object._id");
		if (tokenId === token.id) {
			canvas.tokens.hud.refreshStatusIcons();
		}
		return;
	}

	if (hasProperty(changes, "flags.statuscounter.effectCounters")) {
		redrawEffectCounters(token.object, EffectCounter.getCounters(token));
		if (token.inCombat) {
			canvas.addPendingOperation("CombatTracker.render", ui.combat.render, ui.combat);
		}
	}
});