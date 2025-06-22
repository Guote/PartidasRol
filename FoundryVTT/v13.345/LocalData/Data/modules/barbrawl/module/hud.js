import { getVisibleBars } from "./api.js";

/**
 * Modifies the given HTML to render additional resource input fields.
 * @param {TokenHUD} tokenHud The HUD object.
 * @param {HTMLElement} html The element of the token HUD.
 * @param {Object} data The data of the token HUD.
 */
export const extendTokenHud = async function (tokenHud, html, data) {
    const visibleBars = getVisibleBars(tokenHud.object.document, false);

    // Group bars by side.
    data.bars = {
        "top-inner": [],
        "top-outer": [],
        "bottom-inner": [],
        "bottom-outer": [],
        "left-inner": [],
        "left-outer": [],
        "right-inner": [],
        "right-outer": []
    };
    visibleBars
        .filter(bar => !bar.hideHud)
        .forEach(bar => data.bars[bar.position].push(bar));

    const middleColumn = html.querySelector(".col.middle");
    middleColumn.querySelectorAll("div.attribute").forEach(el => el.remove());

    const topBars = data.bars["top-outer"].reverse().concat(data.bars["top-inner"]);
    if (topBars.length) middleColumn.insertAdjacentHTML("afterbegin", await renderBarInputs(topBars, "bar2"));

    const bottomBars = data.bars["bottom-inner"].reverse().concat(data.bars["bottom-outer"]);
    if (bottomBars.length) middleColumn.insertAdjacentHTML("beforeend", await renderBarInputs(bottomBars, "bar1"));

    const leftBars = data.bars["left-outer"].reverse().concat(data.bars["left-inner"]);
    if (leftBars.length) html.querySelector(".col.left").insertAdjacentHTML("afterbegin", await renderBarInputs(leftBars, "left-bars"));

    const rightBars = data.bars["right-inner"].reverse().concat(data.bars["right-outer"]);
    if (rightBars.length) html.querySelector(".col.right").insertAdjacentHTML("beforeend", await renderBarInputs(rightBars, "right-bars"));

    for (const input of html.querySelectorAll(".attribute > input")) {
        input.addEventListener("focus", _ => input.select());
    }
}

/**
 * Renders the input template for the given bars.
 * @param {Object[]} bars The bars to render inputs for.
 * @param {string} css The CSS classes of the input container.
 * @returns {Promise.<string>} A promise representing the rendered inputs as HTML string.
 */
function renderBarInputs(bars, css) {
    if (game.settings.get("barbrawl", "compactHud")) css += " compact";
    return foundry.applications.handlebars.renderTemplate("modules/barbrawl/templates/resource-hud.hbs", { bars, css });
}