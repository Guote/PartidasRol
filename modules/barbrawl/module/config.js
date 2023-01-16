import * as api from "./api.js";
import BarConfigExtended from "./extendedConfig.js";
import { getDefaultResources, setDefaultResources } from "./settings.js";
import { createOverrideData } from "./synchronization.js";

/**
 * Modifies the given HTML to replace the resource bar configuration with our
 *  own template.
 * @param {TokenConfig} tokenConfig The token configuration object.
 * @param {jQuery} html The jQuery element of the token configuration.
 * @param {Object} data The data of the token configuration.
 */
export const extendTokenConfig = async function (tokenConfig, html, data) {
    data.brawlBars = api.getBars(tokenConfig.token);

    if (tokenConfig instanceof DefaultTokenConfig) {
        // Enable dummy attributes.
        data.dummyAttributes = true;

        // Make sure that the current value exists for selection.
        const attrLists = Object.values(data.barAttributes);
        for (let bar of Object.values(data.brawlBars)) {
            if (!attrLists.some(list => list.includes(bar.attribute))) {
                attrLists[0].push(bar.attribute);
            }
        }
    }

    const barConfiguration = await renderTemplate("modules/barbrawl/templates/token-resources.hbs", data);

    const resourceTab = html.find("div[data-tab='resources']");
    resourceTab.find("div.form-fields").parent().remove();
    resourceTab.append(barConfiguration);
    if (resourceTab.hasClass("active")) adjustConfigHeight(html, data.brawlBars.length);

    resourceTab.on("change", ".brawlbar-attribute", onChangeBarAttribute.bind(tokenConfig.token));
    resourceTab.on("click", ".bar-modifiers .fa-trash", onDeleteBar);
    resourceTab.on("click", ".bar-modifiers .fa-chevron-up", onMoveBarUp);
    resourceTab.on("click", ".bar-modifiers .fa-chevron-down", onMoveBarDown);
    resourceTab.on("click", ".brawlbar-extend", event => onOpenAdvancedConfiguration(event, tokenConfig, data));

    resourceTab.find(".brawlbar-add").click(event => onAddResource(event, tokenConfig, data));
    resourceTab.find(".brawlbar-save").click(() => onSaveDefaults(tokenConfig));
    resourceTab.find(".brawlbar-load").click(() => onLoadDefaults(tokenConfig, data));

    // Trigger change event once to update resource values.
    resourceTab.find("select.brawlbar-attribute").trigger("change");
}

/**
 * Handles an attribute selection change event by updating the resource value.
 * @constant {Token} this The token that this function is bound to.
 * @param {jQuery.Event} event The event of the selection change.
 */
export const onChangeBarAttribute = function (event) {
    const barId = event.target.name.split(".")[3];
    if (!barId) return;
    let form = event.target.form;
    if (!form.classList.contains("brawlbar-configuration")) form = form.querySelector("#" + barId);
    if (!form) return;

    const valueInput = form.querySelector(`input.${barId}-value`);
    const maxInput = form.querySelector(`input.${barId}-max`);

    if (event.target.value === "custom") {
        valueInput.removeAttribute("disabled");
        maxInput.removeAttribute("disabled");
        if (event.originalEvent && maxInput.value === "") maxInput.value = valueInput.value;
        form.querySelectorAll(`input.ignore-limit`).forEach(el => {
            el.removeAttribute("disabled");
            el.checked = false;
        });
    } else {
        valueInput.setAttribute("disabled", "");
        form.querySelectorAll(`input.ignore-limit`).forEach(el => {
            el.setAttribute("disabled", "");
            el.checked = true;
        });

        const resource = this.getBarAttribute(null, { alternative: event.target.value });
        if (resource === null) {
            valueInput.value = maxInput.value = "";
            maxInput.setAttribute("disabled", "");
        } else if (resource.type === "bar") {
            valueInput.value = resource.value;
            maxInput.value = resource.max;
            maxInput.setAttribute("disabled", "");
        } else {
            valueInput.value = resource.value;
            if (event.originalEvent) maxInput.value = "";
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
 * Opens an application with additional configuration options.
 * @param {jQuery.Event} event The event of the button click.
 * @param {TokenConfig} tokenConfig The token configuration object.
 * @param {Object} data The data of the request.
 */
function onOpenAdvancedConfiguration(event, tokenConfig, data) {
    const barId = event.currentTarget.parentElement.parentElement.id;
    let barData = api.getBar(tokenConfig.token, barId) ?? {};

    // Parse form data and merge with stored data.
    let formData = tokenConfig._getSubmitData();
    formData = foundry.utils.expandObject(formData).flags.barbrawl.resourceBars[barId];
    barData = foundry.utils.mergeObject(barData, formData, { inplace: false });

    new BarConfigExtended(barData, {
        parent: tokenConfig.token,
        displayModes: data.displayModes,
        barAttributes: data.barAttributes,
        isDefaultToken: tokenConfig instanceof DefaultTokenConfig
    }).render(true);
    return false;
}

/**
 * Handles an add button click event by adding another resource.
 * @param {jQuery.Event} event The event of the button click.
 * @param {TokenConfig} tokenConfig The token configuration object.
 * @param {Object} data The data of the token configuration.
 */
async function onAddResource(event, tokenConfig, data) {
    const barControls = $(event.currentTarget.parentElement);
    const allBarEls = barControls.siblings("details");
    const barEls = allBarEls.filter(":visible");

    // Create raw bar data.
    const newBar = api.getDefaultBar(api.getNewBarId(barEls), "custom");
    data.brawlBars.push(newBar);

    // Remove insibible elements with the same ID.
    if (allBarEls.length !== barEls.length) allBarEls.find("div#" + newBar.id).parent().remove();

    const barConfiguration = $(await renderTemplate("modules/barbrawl/templates/bar-config.hbs", {
        brawlBars: [newBar],
        displayModes: data.displayModes,
        barAttributes: data.barAttributes
    }));

    if (barEls.length) {
        const prevBarConf = barEls[barEls.length - 1];
        prevBarConf.removeAttribute("open");
        prevBarConf.querySelector("a.fa-chevron-down").classList.remove("disabled");

        const newBarConf = barConfiguration[0];
        newBarConf.querySelector(`input[name="flags.barbrawl.resourceBars.${newBar.id}.order"]`).value = barEls.length;
        newBarConf.querySelector("a.fa-chevron-up").classList.remove("disabled");
    }

    adjustConfigHeight(tokenConfig.element, barEls.length + 1);
    barControls.before(barConfiguration);
}

/**
 * Handles a save button click by storing the current resource configuration in
 *  the user configuration.
 * @param {TokenConfig} tokenConfig The token configuration object.
 */
async function onSaveDefaults(tokenConfig) {
    const html = tokenConfig.element;
    if (!html?.length) return;

    // Parse form data.
    let data = tokenConfig._getSubmitData();
    data = foundry.utils.expandObject(data).flags.barbrawl.resourceBars;

    // Merge extended bar data without overriding the form.
    const extData = foundry.utils.getProperty(tokenConfig.token.data._source, "flags.barbrawl.resourceBars");
    foundry.utils.mergeObject(data, extData, { insertKeys: false, overwrite: false });

    // Drop bars that were removed.
    for (let id of Object.keys(data)) if (!data[id].attribute) delete data[id];

    await setDefaultResources(tokenConfig.token.actor?.type, data);
}

/**
 * Handles a load button click by updating the token with the default bar
 *  configuration and re-rendering the config application.
 * @param {TokenConfig} tokenConfig The token configuration object.
 * @param {Object} data The data of the token configuration.
 */
async function onLoadDefaults(tokenConfig, data) {
    const defaults = getDefaultResources(tokenConfig.token.actor?.type, false);
    if (tokenConfig instanceof DefaultTokenConfig) {
        const setting = game.settings.get("core", DefaultTokenConfig.SETTING);
        for (let prop of Object.entries(createOverrideData(defaults))) {
            foundry.utils.setProperty(setting, prop[0], prop[1]);
        }
        await game.settings.set("core", DefaultTokenConfig.SETTING, setting);
    } else if (tokenConfig.token instanceof PrototypeTokenDocument) {
        await tokenConfig.token.actor.update(createOverrideData(defaults, true), { diff: false });
    } else {
        await tokenConfig.token.update(createOverrideData(defaults), { diff: false });
    }

    // Replace rendered resource configuration.
    const barData = Object.values(defaults);
    const resourceTab = tokenConfig.element.find("div[data-tab='resources']");
    resourceTab.find("details").remove();
    resourceTab.prepend(await renderTemplate("modules/barbrawl/templates/bar-config.hbs", {
        brawlBars: barData,
        displayModes: data.displayModes,
        barAttributes: data.barAttributes
    }));
    if (resourceTab.hasClass("active")) adjustConfigHeight(tokenConfig.element, barData.length);
}

/**
 * Adjusts the height of the given container to account for additional bar
 *  configuration sections.
 * @param {jQuery.Element} html The JQuery element of the token configuration.
 * @param {number} barCount The number of additional bars to account for.
 */
function adjustConfigHeight(html, barCount) {
    if (barCount <= 0) return;
    if (html[0].tagName === "FORM") html = html.parent().parent(); // Fix parent when force render is false.
    const height = parseInt(html.css("height"), 10);
    html.css("height", Math.max(height, barCount * 17 + 415) + "px");
}