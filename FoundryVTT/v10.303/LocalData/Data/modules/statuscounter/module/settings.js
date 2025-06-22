import { CounterTypes, EffectCounter } from './api.js';
import { updateCountdownFont } from "./countdown.js";

const noMouseSupportSystems = ["pf2e"]

/**
 * Registers the settings used by this module. These include key binds and 
 * 	counter display customization.
 */
export const registerSettings = function() {
	game.settings.register("statuscounter", "rebindMouseButtons", {
		name: game.i18n.localize("statuscounter.rebindMouseButtons.name"),
		hint: game.i18n.localize("statuscounter.rebindMouseButtons.hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: !noMouseSupportSystems.some(systemId => game.system.id === systemId),
		onChange: updateTokenHud
	});

	game.settings.register("statuscounter", "rebindNumberKeys", {
		name: game.i18n.localize("statuscounter.rebindNumberKeys.name"),
		hint: game.i18n.localize("statuscounter.rebindNumberKeys.hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: true,
		onChange: updateTokenHud
	});

	game.settings.register("statuscounter", "displayOne", {
		name: game.i18n.localize("statuscounter.displayOne.name"),
		hint: game.i18n.localize("statuscounter.displayOne.hint"),
		scope: "world",
		config: true,
		type: String,
		choices: {
			"always": "statuscounter.displayOne.always",
			"countdown": "statuscounter.displayOne.countdown",
			"never": "statuscounter.displayOne.never"
		},
		default: "countdown",
		onChange: updateVisibility
	});
	
	game.settings.register("statuscounter", "counterFontSize", {
		name: game.i18n.localize("statuscounter.counterFontSize.name"),
		hint: game.i18n.localize("statuscounter.counterFontSize.hint"),
		scope: "world",
		config: true,
		type: Number,
		default: 16,
		onChange: updateCounters
	});
	
	game.settings.register("statuscounter", "counterColor", {
		name: game.i18n.localize("statuscounter.counterColor.name"),
		hint: game.i18n.localize("statuscounter.counterColor.hint"),
		scope: "world",
		config: true,
		type: String,
		default: "00ffff",
		onChange: updateCounters
	});

    game.settings.register("statuscounter", "defaultType", {
        name: game.i18n.localize("statuscounter.defaultType.name"),
        hint: game.i18n.localize("statuscounter.defaultType.hint"),
        scope: "world",
        config: true,
        type: String,
        choices: Object.keys(CounterTypes.types).reduce((choices, type) => {
            choices[type] = game.i18n.localize(type);
            return choices;
        }, {}),
        default: "statuscounter.simple"
    });

	updateFont();
}

/**
 * Refreshes the HUD of the token layer to reload the settings.
 */
function updateTokenHud() {
	canvas.tokens.hud.render();
}

/**
 * Updates the visibility of all counters with one stack. When set to countdown
 * 	only, it is hidden by default (since we don't know the previous value).
 */
function updateVisibility() {
	let defaultVisibility = game.settings.get("statuscounter", "displayOne") === "always";
	for (let token of canvas.tokens.ownedTokens) {
        for (let counter of foundry.utils.getProperty(token, "flags.statuscounter.effectCounters") ?? []) {
			if (counter.value <= 1) counter.visible = defaultVisibility;
		}

		for (let effect of token.actor?.effects ?? []) {
            let counter = foundry.utils.getProperty(effect, "flags.statuscounter.counter");
			if (counter && counter.value <= 1) counter.visible = defaultVisibility;
		}
		
		token.drawEffects();
	}
}

/**
 * Redraws the status effects (and counters) to display new settings.
 */
function updateCounters() {
	updateFont();
	updateCountdownFont();
	EffectCounter.drawCounters();
}

/**
 * Updates the font size and color for the default type from the configuration.
 */
function updateFont() {
	let font = CONFIG.canvasTextStyle.clone();
    font.fontSize = game.settings.get("statuscounter", "counterFontSize");
	font.fill = '#' + game.settings.get("statuscounter", "counterColor").replace('#', '');
	CounterTypes.setFont("statuscounter.simple", font);
	CounterTypes.setFont("statuscounter.multiplier", font);
}
