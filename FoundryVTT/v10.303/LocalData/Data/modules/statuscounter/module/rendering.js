import { EffectCounter } from "./api.js";

/**
 * Extends required rendering functions. If available, the libWrapper module
 *  is used for better compatibility.
 */
export const extendEffectRenderer = function () {
    if(game.modules.get("lib-wrapper")?.active) {
        // Override using libWrapper: https://github.com/ruipin/fvtt-lib-wrapper
        libWrapper.register("statuscounter", "Token.prototype.drawEffects", async function (wrapped, ...args) {
            await wrapped(...args);
            drawEffectCounters(this);
        }, "WRAPPER");
        libWrapper.register("statuscounter", "Token.prototype._drawEffect", async function (wrapped, src, ...args) {
            const icon = await wrapped(src, ...args);
            if (icon) icon.name = src;
            return icon;
        }, "WRAPPER");
    } else {
        // Manual override
        const originalDrawEffects = Token.prototype.drawEffects;
        Token.prototype.drawEffects = async function () {
            await originalDrawEffects.apply(this, arguments);
            drawEffectCounters(this);
        }

        const originalDrawEffect = Token.prototype._drawEffect;
        Token.prototype._drawEffect = async function (src) {
            const icon = await originalDrawEffect.apply(this, arguments);
            if (icon) icon.name = src;
            return icon;
        };
    }
}

/**
 * Modifies the given HTML to draw effect counters on top of each token's
 *  status effects. The font color is determined by the type. Other font
 *  attributes are ignored.
 * @param {HTMLElement} html The HTML DOM of the combat tracker.
 */
export const extendCombatTracker = function (html) {
    $(html).find("li.combatant").each(function () {
        const element = $(this);
        const token = game.combat?.combatants.get(element.attr("data-combatant-id"))?.token;
        if (!token) return;

        const effectCounters = EffectCounter.getAllCounters(token);

        element.find("*:not(.status-icon-wrapper) > .token-effect")
            .wrap("<div class='status-icon-wrapper'></div>")
            .after(function () {
                let counter = effectCounters.find(counter => $(this).attr("src").includes(counter.path));
                if (!counter || !counter.visible) return;

                let fontColor = counter.font.fill;
                return `<div class='status-icon-counter' style='color: ${fontColor};'>${counter.getDisplayValue()}</div>`;
            });
    });
}

/**
 * Updates the existing counters without creating new ones. The effects are 
 *  searched by their name (set during creation).
 * @param {Token} token The token to update the effect counters for.
 * @param {EffectCounter[]} effectCounters The collection of status counters.
 */
export const redrawEffectCounters = function(token, effectCounters) {
    const iconSize = token.effects.children.find(effect => effect.isSprite && effect.name)?.height ?? 20;
    const counterContainer = token.effectCounters;
    if (!counterContainer || !counterContainer.name === "effectCounters") return;
    for (let counter of effectCounters) {
        const textSprite = counterContainer.children.find(sprite => sprite.name === counter.path);
        if (textSprite) {
            textSprite.text = counter.getDisplayValue();
            textSprite.style = counter.getScaledFont(iconSize);
        }
    }
}

/**
 * Creates rendering objects for every effect sprite that matches any of the 
 *  active status icons. The text is added as an additional effect on top of 
 *  the original sprite.
 * @param {Token} token The token to draw the effect counters for.
 */
function drawEffectCounters(token) {
    const tokenDoc = token.document;
    const effectCounters = EffectCounter.getAllCounters(tokenDoc);

    if (token.effectCounters) {
        token.effectCounters.removeChildren().forEach(c => c.destroy());
    }

    // The child may have been removed due to redrawing the token entirely.
    if (!token.children.find(c => c.name === "effectCounters")) {
        const counterContainer = new PIXI.Container();
        counterContainer.name = "effectCounters";
        token.effectCounters = token.addChild(counterContainer);
    }

    for (let sprite of token.effects.children.filter(effect => effect.isSprite && effect.name)) {
        const counter = effectCounters.find(effect => sprite.name === effect.path);
        if (counter) token.effectCounters.addChild(createEffectCounter(tokenDoc, counter, sprite));
    }
}

/**
 * Creates a rendering object for a single counter displaying the given number.
 *  The counter is placed on top of the bottom right corner of the given sprite.
 * @param {TokenDocument} tokenDoc The document of the token to create the counter for.
 * @param {EffectCounter} counter The internal effect counter object.
 * @param {PIXI.Graphics} effectIcon The sprite on top of which to place the counter.
 * @returns The PIXI object representing the counter.
 */
function createEffectCounter(tokenDoc, counter, effectIcon) {
    const counterText = new PIXI.Text(counter.getDisplayValue(tokenDoc), counter.getScaledFont(effectIcon.height));
    counterText.name = counter.path;
    counterText.anchor.set(1); // Align to bottom right

    const sizeRatio = effectIcon.height / 20;
    counterText.x = effectIcon.x + effectIcon.width + 1 * sizeRatio;
    counterText.y = effectIcon.y + effectIcon.height + 3 * sizeRatio;
    counterText.resolution = Math.max(1, 1 / sizeRatio * 1.5);
    return counterText;
}
