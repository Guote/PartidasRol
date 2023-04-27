import { convertBarVisibility, getDefaultBar } from "./api.js";

/**
 * Generates the data for an update that overrides the current resource
 *  configuration for a token or an actor.
 * @param {Object} resources The resources to apply.
 * @param {boolean=} prototype Indicates whether the update is for an actor. Defaults to false.
 * @returns {Object} An object containing the data of the update.
 */
export const createOverrideData = function (resources, prototype = false) {
    return prototype ? {
        "prototypeToken.flags.barbrawl.resourceBars": resources,
        "prototypeToken.bar1.attribute": resources.bar1?.attribute ?? null,
        "prototypeToken.bar2.attribute": resources.bar2?.attribute ?? null
    } : {
        "flags.barbrawl.resourceBars": resources,
        "bar1.attribute": resources.bar1?.attribute ?? null,
        "bar2.attribute": resources.bar2?.attribute ?? null
    };
}

/**
 * Prepares the update of a token (or a prototype token) by removing invalid
 *  resources and synchronizing with FoundryVTT's resource format.
 * @param {TokenDocument} tokenDoc The data to merge the new data into.
 * @param {Object} newData The data to be merged into the token data.
 */
export const prepareUpdate = function (tokenDoc, newData) {
    // Always make the bar container visible.
    if (tokenDoc._source.displayBars !== CONST.TOKEN_DISPLAY_MODES.ALWAYS) {
        newData["displayBars"] = CONST.TOKEN_DISPLAY_MODES.ALWAYS;
    }

    const changedBars = foundry.utils.getProperty(newData, "flags.barbrawl.resourceBars");
    if (changedBars) {
        for (let barId of Object.keys(changedBars)) {
            // Remove bars that were explicitly set to "None" attribute.
            if (barId.startsWith("-=")) continue; // Already queued for removal

            // Remove bars without attribute.
            const bar = changedBars[barId];
            if (bar.attribute === "") {
                delete changedBars[barId];
                changedBars["-=" + barId] = null;
            }

            // Convert legacy visibility.
            if (bar.hasOwnProperty("visibility")) convertBarVisibility(bar);

            const barData = (foundry.utils.getProperty(tokenDoc, "flags.barbrawl.resourceBars") ?? {})[barId];

            // Validate update.
            if (!bar.id && !barData?.id) {
                console.warn("Bar Brawl | Skipping invalid bar update. This may indicate a compatibility issue.");
                delete changedBars[barId];
                continue;
            }

            // Clamp values.
            if (bar.hasOwnProperty("value")) {
                if (barData && !barData.ignoreMin) bar.value = Math.max(0, bar.value);
                if (barData && !barData.ignoreMax && barData.max) bar.value = Math.min(barData.max, bar.value);
            }
        }
    }
    synchronizeBars(tokenDoc, newData);
}

/**
 * Synchronizes resource bars to and from FoundryVTT's format with Bar Brawl.
 * @param {Object} tokenData The data to merge the new data into.
 * @param {Object} newData The data to be merged into the token data.
 */
function synchronizeBars(tokenData, newData) {
    let hasLegacyBars = newData.hasOwnProperty("bar1") || newData.hasOwnProperty("bar2");
    let hasBrawlBars = hasProperty(newData, "flags.barbrawl.resourceBars");

    if (hasBrawlBars) {
        synchronizeBrawlBar("bar1", newData);
        synchronizeBrawlBar("bar2", newData);
    }

    if (hasLegacyBars) {
        if (!hasBrawlBars) foundry.utils.setProperty(newData, "flags.barbrawl.resourceBars", {});

        synchronizeLegacyBar("bar1", tokenData, newData);
        synchronizeLegacyBar("bar2", tokenData, newData);
    }
}

/**
 * Merges the state of a changed Bar Brawl resource bar into FoundryVTT.
 * @param {String} barId The name of the bar to synchronize.
 * @param {Object} newData The data to be merged into the token data.
 */
function synchronizeBrawlBar(barId, newData) {
    let brawlBarData = newData.flags.barbrawl.resourceBars[barId];
    if (brawlBarData?.attribute) {
        newData[barId] = { attribute: brawlBarData.attribute === "custom" ? null : brawlBarData.attribute };
    } else if (newData.flags.barbrawl.resourceBars["-=" + barId] === null) {
        newData[barId] = { attribute: null };
    }
}

/**
 * Merges the state of a changed FoundryVTT resource bar with Bar Brawl.
 * @param {String} barId The name of the bar to synchronize.
 * @param {Object} tokenData The data to merge the new data into.
 * @param {Object} newData The data to be merged into the token data.
 */
function synchronizeLegacyBar(barId, tokenData, newData) {
    const foundryBarData = newData[barId];
    if (!foundryBarData) return;

    const brawlBars = foundry.utils.getProperty(tokenData, "flags.barbrawl.resourceBars") ?? {};
    const brawlBarChanges = newData.flags.barbrawl.resourceBars;
    if (!brawlBarChanges[barId]) return; // Already queued for removal.
    if (foundryBarData.attribute === null && brawlBarChanges[barId].attribute === "custom") return;

    const brawlBarData = brawlBars[barId];
    const remove = Object.keys(foundryBarData).length === 0 || foundryBarData.attribute === null;

    if (brawlBarData) {
        if (remove) {
            // Remove the bar
            brawlBarChanges["-=" + barId] = null;
            delete brawlBarChanges[barId];
        } else {
            // Change the attribute
            foundry.utils.setProperty(brawlBarChanges, barId + ".attribute", foundryBarData.attribute);
        }
    } else if (!remove) {
        // Create a new bar with default values
        brawlBarChanges[barId] ??= getDefaultBar(barId, foundryBarData.attribute, tokenData._source.displayBars);
    }
}