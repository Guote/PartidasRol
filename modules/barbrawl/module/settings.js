/**
 * Registers the settings used by this module.
 */
export const registerSettings = function () {
    game.settings.register("barbrawl", "barStyle", {
        name: game.i18n.localize("barbrawl.barStyle.name"),
        hint: game.i18n.localize("barbrawl.barStyle.hint"),
        scope: "client",
        config: true,
        type: String,
        choices: {
            "minimal": "barbrawl.barStyle.minimal",
            "default": "barbrawl.barStyle.default",
            "large": "barbrawl.barStyle.large",
            "legacy": "barbrawl.barStyle.legacy"
        },
        default: "default",
        onChange: updateBars
    });

    game.settings.register("barbrawl", "textStyle", {
        name: game.i18n.localize("barbrawl.textStyle.name"),
        hint: game.i18n.localize("barbrawl.textStyle.hint"),
        scope: "client",
        config: true,
        type: String,
        choices: {
            "none": "barbrawl.textStyle.none",
            "fraction": "barbrawl.textStyle.fraction",
            "percent": "barbrawl.textStyle.percent"
        },
        default: "none",
        onChange: updateBars
    });

    game.settings.register("barbrawl", "defaultResources", {
        name: "Default token resources",
        hint: "",
        scope: "world",
        config: false,
        type: Object,
        default: {}
    });

    game.settings.register("barbrawl", "defaultTypeResources", {
        name: "Default actor type resources",
        hint: "",
        scope: "world",
        config: false,
        type: Object,
        default: {}
    });

    game.settings.register("barbrawl", "defaultsPerType", {
        name: game.i18n.localize("barbrawl.defaults.storePerType.name"),
        hint: game.i18n.localize("barbrawl.defaults.storePerType.hint"),
        scope: "world",
        config: true,
        type: Boolean,
        default: false
    });
}

/**
 * Refreshes the bars of all tokens to apply the new style.
 */
function updateBars() {
    for (let token of canvas.tokens.placeables) token.drawBars();
}

/**
 * Fetches the default resource configuration for the given type or globally,
 *  depending on the defaultsPerType setting.
 * @param {string} type The actor type to fetch the settings for.
 * @param {boolean} checkEmpty Indicates whether empty defaults should be returned as null.
 * @returns {Object} An object containing the default resource configuration.
 */
export const getDefaultResources = function (type, checkEmpty = true) {
    let config;
    if (game.settings.get("barbrawl", "defaultsPerType"))
        config = game.settings.get("barbrawl", "defaultTypeResources")?.[type];
    config ??= game.settings.get("barbrawl", "defaultResources") ?? {};
    if (checkEmpty && Object.keys(config).length === 0) return null;
    return config;
}

/**
 * Stores the given resource configuration as the default for the given type or
 *  globally, depending on the defaultsPerType setting.
 * @param {string} type The actor type to set the configuration for.
 * @param {Object} resources The resource configuration to store as default.
 * @returns {Promise} A promise representing the setting update.
 */
export const setDefaultResources = async function (type, resources) {
    if (game.settings.get("barbrawl", "defaultsPerType")) {
        if (!type) return;
        const barConfig = game.settings.get("barbrawl", "defaultResources") ?? {};
        barConfig[type] = resources;
        await game.settings.set("barbrawl", "defaultTypeResources", barConfig);
    } else {
        await game.settings.set("barbrawl", "defaultResources", resources);
    }
    
    ui.notifications.info("Bar Brawl | " + game.i18n.localize("barbrawl.defaults.saveConfirmation"));
}