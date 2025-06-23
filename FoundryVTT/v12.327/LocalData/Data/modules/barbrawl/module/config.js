import * as api from "./api.js";
import { getDefaultResources, setDefaultResources } from "./settings.js";
import { prepareCreation, prepareUpdate } from "./synchronization.js";

/**
 * Constants to use for rendering the bar configuration from any context.
 */
const configConsts = {
    positions: {
        "top-inner": "barbrawl.position.top-inner",
        "top-outer": "barbrawl.position.top-outer",
        "bottom-inner": "barbrawl.position.bottom-inner",
        "bottom-outer": "barbrawl.position.bottom-outer",
        "left-inner": "barbrawl.position.left-inner",
        "left-outer": "barbrawl.position.left-outer",
        "right-inner": "barbrawl.position.right-inner",
        "right-outer": "barbrawl.position.right-outer",
    },
    styles: {
        user: "barbrawl.textStyle.user",
        none: "barbrawl.textStyle.none",
        fraction: "barbrawl.textStyle.fraction",
        percent: "barbrawl.textStyle.percent"
    }
}

/**
 * Extends the way Foundry updates the configuration of the default token. If
 *  available, the libWrapper module is used for better compatibility.
 */
export const extendDefaultTokenConfig = function () {
    if (game.modules.get("lib-wrapper")?.active) {
        // Override using libWrapper: https://github.com/ruipin/fvtt-lib-wrapper
        libWrapper.register("barbrawl", "CONFIG.Token.prototypeSheetClass.prototype._getSubmitData",
            function (wrapped, updateData) {
                return wrapped(ensureAttributeData(updateData));
            }, "WRAPPER");
        libWrapper.register("barbrawl", "DefaultTokenConfig.prototype._getSubmitData",
            function (wrapped, updateData) {
                updateData = ensureAttributeData(updateData);
                const formData = wrapped(updateData);
                prepareUpdate(this.token, formData);
                return formData;
            }, "WRAPPER");
        libWrapper.register("barbrawl", "CONFIG.Token.prototypeSheetClass.prototype._onBarChange", onChangeBarAttribute, "OVERRIDE");
        libWrapper.register("barbrawl", "DefaultTokenConfig.prototype._onBarChange", onChangeBarAttribute, "OVERRIDE");
    } else {
        // Manual override
        const originalGetSubmitData = CONFIG.Token.prototypeSheetClass.prototype._getSubmitData;
        CONFIG.Token.prototypeSheetClass.prototype._getSubmitData = function (updateData) {
            return originalGetSubmitData.call(this, ensureAttributeData(updateData));
        };
        const originalDefaultGetSubmitData = DefaultTokenConfig.prototype._getSubmitData;
        DefaultTokenConfig.prototype._getSubmitData = function (updateData) {
            updateData = ensureAttributeData(updateData);
            const formData = originalDefaultGetSubmitData.call(this, updateData);
            prepareUpdate(this.token, formData);
            return formData;
        };

        CONFIG.Token.prototypeSheetClass.prototype._onBarChange = onChangeBarAttribute;
        DefaultTokenConfig.prototype._onBarChange = onChangeBarAttribute;
    }
}

/**
 * Modifies the given HTML to replace the resource bar configuration with our
 *  own template.
 * @param {TokenConfig} tokenConfig The token configuration object.
 * @param {jQuery} html The jQuery element of the token configuration.
 * @param {Object} data The data of the token configuration.
 */
export const extendTokenConfig = async function (tokenConfig, html, data) {
    data.constants = configConsts;
    data.brawlBars = api.getBars(tokenConfig.token);
    data.barAttributes.unshift({ value: "custom", label: "barbrawl.attribute.custom" });

    if (tokenConfig instanceof DefaultTokenConfig) {
        // Make sure that the current value exists for selection.
        for (let bar of Object.values(data.brawlBars)) {
            if (!data.barAttributes.some(attr => attr.value === bar.attribute)) {
                data.barAttributes.push({ value: bar.attribute, label: bar.attribute });
            }
        }
    }

    const saveEntries = createSaveEntries(tokenConfig);
    data.canSaveDefaults = saveEntries.length > 0;
    const loadEntries = createLoadEntries(tokenConfig, data.barAttributes);
    data.canLoadDefaults = loadEntries.length > 0;
    const barConfiguration = await renderTemplate("modules/barbrawl/templates/token-resources.hbs", data);

    const resourceTab = html.find("div[data-tab='resources']");
    resourceTab.find("div.form-fields").parent().remove();
    resourceTab.append(barConfiguration);

    resourceTab.on("click", "details > summary", () => setTimeout(() => tokenConfig.setPosition()));
    resourceTab.on("click", ".bar-modifiers .fa-trash", onDeleteBar);
    resourceTab.on("click", ".bar-modifiers .fa-chevron-up", onMoveBarUp);
    resourceTab.on("click", ".bar-modifiers .fa-chevron-down", onMoveBarDown);
    resourceTab.on("change", ".bar-attribute", tokenConfig._onBarChange.bind(tokenConfig));

    resourceTab.find(".brawlbar-add").click(event => onAddResource(event, tokenConfig, data));
    if (data.canSaveDefaults) {
        new ContextMenu(resourceTab, ".brawlbar-save", saveEntries, { eventName: "click" });
    }
    if (data.canLoadDefaults) {
        new ContextMenu(resourceTab, ".brawlbar-load", loadEntries, { eventName: "click" });
    }

    // Refresh diplayed value for all attributes.
    if (game.system.id === "dnde5") return;
    resourceTab.find("select.brawlbar-attribute").each((_, el) => refreshValueInput(tokenConfig.token, el));
}

/**
 * Prepares the given data to ensure that it contains objects for FoundryVTT bar attributes.
 * @param {object?} data The data to prepare. Defaults to empty object.
 * @returns {object} The prepared data.
 */
function ensureAttributeData(data) {
    data ??= {};
    data.bar1 ??= { attribute: "" };
    data.bar2 ??= { attribute: "" };
    return data;
}

/**
 * Handles an attribute selection change event by updating the resource value.
 * @constant {TokenConfig} this The token configuration that fired the event.
 * @param {jQuery.Event} event The event of the selection change.
 */
function onChangeBarAttribute(event) {
    refreshValueInput(this.token, event.target, event.originalEvent);
}

/**
 * Updates the states and values for the current and maximum value inputs.
 * @param {Token} token The token that the bar belongs to.
 * @param {HTMLElement} target The select element that contains the bar's attribute.
 * @param {Event?} event An optional event triggered by changing the target's value.
 */
function refreshValueInput(token, target, event) {
    const barId = target.name.split(".")[3];
    if (!barId) return;
    let form = target.form;
    if (form && !form.classList.contains("brawlbar-configuration")) form = form.querySelector("#" + barId);
    if (!form) return;

    // Set a hidden attribute input to make sure FoundryVTT doesn't override it with null.
    target.nextElementSibling.value = target.value;

    const valueInput = form.querySelector(`input.${barId}-value`);
    const maxInput = form.querySelector(`input.${barId}-max`);
    if (!valueInput || !maxInput) return;

    if (target.value === "custom") {
        valueInput.removeAttribute("disabled");
        maxInput.removeAttribute("disabled");
        if (event && maxInput.value === "") maxInput.value = valueInput.value;
        form.querySelectorAll(`input.ignore-limit`).forEach(el => {
            el.removeAttribute("disabled");
            if (event) el.checked = false;
        });
    } else {
        valueInput.setAttribute("disabled", "");
        form.querySelectorAll(`input.ignore-limit`).forEach(el => {
            el.setAttribute("disabled", "");
            if (event) el.checked = true;
        });

        const resource = token.getBarAttribute(null, { alternative: target.value });
        if (resource === null) {
            valueInput.value = maxInput.value = "";
            maxInput.setAttribute("disabled", "");
        } else if (resource.type === "bar") {
            valueInput.value = resource.value;
            maxInput.value = resource.max;
            maxInput.setAttribute("disabled", "");
        } else {
            valueInput.value = resource.value;
            if (event) maxInput.value = "";
            maxInput.removeAttribute("disabled");
        }
    }
}

/**
 * Removes the bar associated with the event's target from the resources.
 */
function onDeleteBar() {
    const configEl = $(this.parentElement.parentElement.nextElementSibling);
    configEl.parent().hide();
    configEl.find("select.brawlbar-attribute").val("");
}

/**
 * Decreases the order of the bar associated with the event's target by 1 and
 *  moves its element accordingly.
 */
function onMoveBarUp() {
    const barEl = this.parentElement.parentElement.parentElement;
    const prevBarEl = barEl.previousElementSibling;
    if (!prevBarEl || prevBarEl.tagName !== "DETAILS") return;
    moveBarElement(barEl, prevBarEl);
    swapButtonState("a.fa-chevron-down", this.parentElement, prevBarEl);
    swapButtonState("a.fa-chevron-up", prevBarEl, this.parentElement);
}

/**
 * Increases the order of the bar associated with the event's target by 1 and
 *  moves its element accordingly.
 */
function onMoveBarDown() {
    const barEl = this.parentElement.parentElement.parentElement;
    const nextBarEl = barEl.nextElementSibling;
    if (!nextBarEl || nextBarEl.tagName !== "DETAILS") return;
    moveBarElement(nextBarEl, barEl);
    swapButtonState("a.fa-chevron-down", nextBarEl, this.parentElement);
    swapButtonState("a.fa-chevron-up", this.parentElement, nextBarEl);
}

/**
 * Moves the first bar element in front of the second bar element, effectively
 *  swapping their positions relative to each other. This also swaps their
 *  configured order.
 * @param {HTMLElement} firstElement The details DOM element containing the bar to move.
 * @param {HTMLElement} secondElement The details DOM element containing the pivot bar.
 */
function moveBarElement(firstElement, secondElement) {
    firstElement.parentElement.insertBefore(firstElement, secondElement);
    const firstId = firstElement.lastElementChild.id;
    const firstOrderEl = firstElement.querySelector(`input[name="flags.barbrawl.resourceBars.${firstId}.order"]`);
    const firstOrder = firstOrderEl.value;

    const secondId = secondElement.lastElementChild.id;
    const secondOrderEl = secondElement.querySelector(`input[name="flags.barbrawl.resourceBars.${secondId}.order"]`);
    const secondOrder = secondOrderEl.value;

    firstOrderEl.value = secondOrder;
    secondOrderEl.value = firstOrder;
}

/**
 * Swaps the disabled class of the elements identified by the given selector
 *  within the two given parent elements.
 * @param {string} selector The query selector that uniquely identifies the button.
 * @param {HTMLElement} firstElement The parent of the element to read the disabled state from.
 * @param {HTMLElement} secondElement The parent of the element to swap the disabled state with.
 */
function swapButtonState(selector, firstElement, secondElement) {
    const button = firstElement.querySelector(selector);
    if (button.classList.contains("disabled")) {
        secondElement.querySelector(selector).classList.add("disabled");
        button.classList.remove("disabled");
    }
}

/**
 * Handles an add button click event by adding another resource.
 * @param {jQuery.Event} event The event of the button click.
 * @param {TokenConfig} tokenConfig The token configuration object.
 * @param {Object} data The data of the token configuration.
 */
async function onAddResource(event, tokenConfig, data) {
    const container = event.currentTarget.parentElement.querySelector(".bar-container");
    const allBarEls = $(container).find("> details");
    const barEls = allBarEls.filter(":visible");

    // Create raw bar data.
    const newBar = api.getDefaultBar(api.getNewBarId(barEls), "custom");
    data.brawlBars.push(newBar);

    // Remove insibible elements with the same ID.
    if (allBarEls.length !== barEls.length) allBarEls.find("div#" + newBar.id).parent().remove();

    container.insertAdjacentHTML("beforeend", await renderTemplate("modules/barbrawl/templates/bar-config.hbs", {
        constants: configConsts,
        brawlBars: [newBar],
        barAttributes: data.barAttributes,
    }));
    const barConfiguration = container.lastElementChild;

    if (game.system.id === "dnd5e" && tokenConfig._prepareResourceLabels) tokenConfig._prepareResourceLabels(barConfiguration);
    if (barEls.length) {
        const prevBarConf = barEls[barEls.length - 1];
        prevBarConf.removeAttribute("open");
        prevBarConf.querySelector("a.fa-chevron-down").classList.remove("disabled");

        barConfiguration.querySelector(`input[name="flags.barbrawl.resourceBars.${newBar.id}.order"]`).value = barEls.length;
        barConfiguration.querySelector("a.fa-chevron-up").classList.remove("disabled");
    }

    tokenConfig.setPosition();
}

/**
 * Retrieves the currently rendered resource settings.
 * @param {TokenConfig} app The configuration window containing the resources.
 * @returns {object} An object containing the current resoures.
 */
function getCurrentResources(app) {
    if (!app.element?.length) return {};

    // Parse form data.
    let data = app._getSubmitData();
    data = data.flags ?? foundry.utils.expandObject(data).flags;
    data = data?.barbrawl?.resourceBars ?? {};

    // Drop bars that were removed.
    for (let id of Object.keys(data)) if (!data[id].attribute) delete data[id];
    return data;
}

/**
 * Creates menu entries for saving the current resource configuration in various locations.
 * @param {TokenConfig} tokenConfig The token configuration to create the entries for.
 * @returns {object[]} An array of menu entries for saving resources.
 */
function createSaveEntries(tokenConfig) {
    let actor = tokenConfig.token.baseActor;
    if (!actor?.isOwner) actor = tokenConfig.token.actor;
    if (!actor) return [];

    const entries = [];
    if (game.user.isGM) {
        if (!(tokenConfig instanceof DefaultTokenConfig)) {
            entries.push({
                name: "barbrawl.defaults.defaultToken",
                icon: '<i class="fas fa-cogs"></i>',
                callback: () => replaceDefaultTokenResources(getCurrentResources(tokenConfig)),
            });
        }

        const typeLabel = game.i18n.format(
            "barbrawl.defaults.typeDefaults",
            { type: game.i18n.localize(CONFIG.Actor.typeLabels[actor.type]) });
        entries.push({
            name: typeLabel,
            icon: '<i class="fas fa-users"></i>',
            callback: () => setDefaultResources(actor.type, getCurrentResources(tokenConfig), typeLabel),
        });
    }

    if (actor.isOwner && !(tokenConfig.token instanceof foundry.data.PrototypeToken)) {
        const actorLabel = game.i18n.format("barbrawl.defaults.prototypeToken", { name: actor.name });
        entries.push({
            name: actorLabel,
            icon: '<i class="fas fa-user"></i>',
            callback: () => replaceActorResources(actor, getCurrentResources(tokenConfig), actorLabel),
        });
    }

    let tokens = actor.getActiveTokens(false, true).filter(t => t.isOwner && t !== tokenConfig.token);
    if (tokens.length > 1) {
        const tokenLabel = game.i18n.format("barbrawl.defaults.activeTokens", { name: actor.name });
        entries.push({
            name: tokenLabel,
            icon: '<i class="fas fa-user-circle"></i>',
            callback: () => replaceTokenResources(tokens, getCurrentResources(tokenConfig), tokenLabel),
        });
    }

    return entries;
}

/**
 * Replaces the resource configuration of the global default token with the given resources.
 * @param {object} resources The resource configuration to store.
 * @returns {Promise} A promise representing the default token update.
 */
async function replaceDefaultTokenResources(resources) {
    const defaultTokenData = game.settings.get("core", DefaultTokenConfig.SETTING) ?? {};
    foundry.utils.setProperty(defaultTokenData, "flags.barbrawl.resourceBars", resources);
    await game.settings.set("core", DefaultTokenConfig.SETTING, defaultTokenData);

    const target = game.i18n.localize("barbrawl.defaults.defaultToken");
    ui.notifications.info("Bar Brawl | " + game.i18n.format("barbrawl.defaults.saveConfirmation", { target }));
}

/**
 * Replaces the given actor's prototype token resources with the given resource configuration.
 * @param {Actor} actor The actor to store the resources in.
 * @param {object} resources The resource configuration to store.
 * @param {string} label The human readable name of the type setting.
 * @returns {Promise} A promise representing the actor update.
 */
async function replaceActorResources(actor, resources, label) {
    await actor.update(
        { "prototypeToken.flags.barbrawl.resourceBars": resources },
        { recursive: false, diff: false }
    );

    ui.notifications.info("Bar Brawl | " + game.i18n.format("barbrawl.defaults.saveConfirmation", { target: label }));
}

/**
 * Replaces the resource configuration of the given tokens within the current scene.
 * @param {TokenDocument[]} tokens The tokens to store the resources in.
 * @param {object} resources The resource configuration to store.
 * @param {string} label The human readable name of the type setting.
 * @returns {Promise} A promise representing the scene update.
 */
async function replaceTokenResources(tokens, resources, label) {
    const update = tokens.map(t => ({ _id: t.id, "flags.barbrawl.resourceBars": resources }));
    await canvas.scene.updateEmbeddedDocuments("Token", update, { recursive: false, diff: false });

    ui.notifications.info("Bar Brawl | " + game.i18n.format("barbrawl.defaults.saveConfirmation", { target: label }));
}

/**
 * Replaces the resource configuration of the given token configuration with the given resources.
 * @param {TokenConfig} app The token configuration to render the entries into.
 * @param {object} attributes The bar attributes required for rendering the resources.
 * @param {object} resources The resource configuration to render.
 * @returns {Promise} A promise representing the rendering process.
 */
async function setCurrentResources(app, attributes, resources) {
    const barData = Object.values(resources);
    const container = app.element[0].querySelector("div[data-tab='resources'] .bar-container");

    // Remove current bars.
    container.querySelectorAll(".indent-details").forEach(el => {
        if (!el.id) return;
        if (!resources[el.id]) {
            // Bar no longer exists, flag it for removal in the next update.
            el.parentElement.hidden = true;
            el.querySelector("select.brawlbar-attribute").value = "";
        } else {
            // Bar still exists, so it will be rerendered.
            el.parentElement.remove();
        }
    });

    if (barData.length === 0) {
        app.setPosition();
        return;
    }

    // Render and insert bars.
    container.insertAdjacentHTML("afterbegin", await renderTemplate("modules/barbrawl/templates/bar-config.hbs", {
        constants: configConsts,
        brawlBars: barData,
        barAttributes: attributes,
    }));
    if (container.parentElement.parentElement.classList.contains("active")) app.setPosition();
    container.querySelectorAll("select.brawlbar-attribute").forEach(el => refreshValueInput(app.token, el));
    if (game.system.id === "dnd5e") app._prepareResourceLabels(container);
}

/**
 * Creates menu entries for loading resource configurations stored in various locations.
 * @param {TokenConfig} tokenConfig The token configuration to create the entries for.
 * @param {object} attributes The bar attributes for rerendering resources.
 * @returns {object[]} An array of menu entries for loading resources.
 */
function createLoadEntries(tokenConfig, attributes) {
    const actor = tokenConfig.token.actor;
    if (!actor) return [];

    const entries = [];
    if (!(tokenConfig instanceof DefaultTokenConfig)) {
        entries.push({
            name: "barbrawl.defaults.defaultToken",
            icon: '<i class="fas fa-cogs"></i>',
            callback: () => setCurrentResources(tokenConfig, attributes, getDefaultTokenResources()),
        });
    }

    entries.push({
        name: game.i18n.format("barbrawl.defaults.typeDefaults", { type: game.i18n.localize(CONFIG.Actor.typeLabels[actor.type]) }),
        icon: '<i class="fas fa-users"></i>',
        callback: () => setCurrentResources(tokenConfig, attributes, getDefaultResources(actor.type, false)),
    });

    if (!(tokenConfig.token instanceof foundry.data.PrototypeToken)) {
        entries.push({
            name: game.i18n.format("barbrawl.defaults.prototypeToken", { name: actor.name }),
            icon: '<i class="fas fa-user"></i>',
            callback: () => setCurrentResources(tokenConfig, attributes, actor.prototypeToken.flags?.barbrawl?.resourceBars ?? {}),
        });
    }

    return entries;
}

/**
 * Retrieves the resource configuration of the global default token.
 * @returns {object} The default resource configuration for all new tokens.
 */
function getDefaultTokenResources() {
    const defaultTokenData = game.settings.get("core", DefaultTokenConfig.SETTING) ?? {};
    const tokenClass = getDocumentClass("Token");
    const token = new tokenClass({ name: "Default Token", ...defaultTokenData }, { actor: null, strict: false });
    prepareCreation(token);
    return token._source.flags?.barbrawl?.resourceBars ?? {};
}
