/**
 * Provides methods for accessing and manipulating status effect counters. The
 *  included classes are added to the window to allow using them as an optional
 *  dependency which can be resolved after the Foundry module has been loaded.
 * @module CounterAPI
 */
import { redrawEffectCounters } from "./rendering.js";
export { EffectCounter, ActiveEffectCounter, CounterTypes };

/**
 * Represents a counter for a single status effect.
 */
class EffectCounter {
    tokenId;
    path;
    type;
    visible;
    value;

    /**
     * Initializes this counter.
     * @param {Object | number} value The initial counter value. For numbers, the counter is
     *  initialized as a simple counter. For an object, its properties are
     *  copied to the new EffectCounter and missing values are defaulted.
     * @param {string} path The icon path of the counter.
     * @param {TokenDocument} tokenDoc The token document that the counter is associated with.
     * @param {boolean} delayAssignment Internal flag to prevent the counter from immediately
     *  initializing its type and count.
     */
    constructor(value, path, tokenDoc, delayAssignment) {
        if (typeof value == "number") {
            this.tokenId = tokenDoc.id;
            this.path = path;
            if (!delayAssignment) {
                this.type = this.getDefaultType(tokenDoc);
                counterTypes[this.type]?.setter(this, value, tokenDoc);
            }
        } else {
            Object.assign(this, value);
            if (this.type === undefined) this.type = "statuscounter.simple";
        }
    }

    /**
     * Resolves the parent entity of this counter. If the parameter is omitted
     *  or is not a valid token, the token is searched with the stored token ID.
     * @param {TokenDocument} [parent] The parent entity of this counter.
     *  If omitted, it will be resolved using the token ID.
     * @returns {TokenDocument} The parent token document of the counter.
     */
    findParent(parent) {
        return parent instanceof TokenDocument ? parent : canvas.tokens.get(this.tokenId)?.document;
    }

    /**
     * Retrieves the value of this counter using its type's getter function.
     * @param {TokenDocument | ActiveEffect} [parent] The parent entity of this counter.
     * @returns {Number} The result of the counter's type's value getter.
     */
    getValue(parent) {
        parent = this.findParent(parent);
        if (!parent) return 0;
        return counterTypes[this.type]?.getter(this, parent);
    }

    /**
     * Retrieves the value that should be displayed when rendering the counter.
     * @param {TokenDocument | ActiveEffect} [parent] The parent entity of this counter.
     * @returns {String} The counter value if it is visible, an empty string otherwise.
     */
    getDisplayValue(parent) {
        parent = this.findParent(parent);
        if (!parent) return "";
        return counterTypes[this.type]?.display(this, parent);
    }

    /**
     * Modifies the value of this counter and updates its visibility using its
     *  type's setter function.
     * @param {number} value The value to set.
     * @param {TokenDocument | ActiveEffect} [parent] The parent entity of this counter.
     * @param {boolean} forceUpdate Indicates whether an update should be performed even if the setter declined it.
     *  Defaults to false. This is usually required for changes to counter types that do not define their own setters.
     * @returns {Promise} A promise representing the asynchronous operation.
     */
    async setValue(value, parent, forceUpdate = false) {
        parent = this.findParent(parent);
        if (!parent) return Promise.resolve();

        const update = counterTypes[this.type]?.setter(this, value, parent);
        if (update === null || update === undefined) return this.remove(parent);
        if (update || forceUpdate) return this.update(parent);
    }

    /**
     * Retrieves the font associated with the type of this counter. If none is 
     *  found, the default font is returned instead.
     * @returns {PIXI.TextStyle} The font to use for this counter.
     */
    get font() {
        let counterType = counterTypes[this.type];
        if (!counterType) {
            console.warn(`statuscounters | Type ${this.type} is not registered - using default.`);
            counterType = counterTypes["statuscounter.simple"];
        }
        return counterType.font;
    }

    /**
     * Creates a copy of the font associated with the type of this counter or
     *  the default, scaled relative to the given icon size.
     * @param {number=} iconHeight The height of the effect icon in pixels. Defaults to 20.
     * @returns {PIXI.TextStyle} The scaled font to use for this counter and icon size.
     */
    getScaledFont(iconHeight = 20) {
        let font = this.font;
        if (iconHeight !== 20) {
            font = font.clone();
            font.fontSize = iconHeight / 20 * font.fontSize;
        }

        return font;
    }

    /**
     * Calls the selector associated with the given type to determine whether
     *  that type may be selected in the status context menu.
     * @param {string} type The target type to check against.
     * @param {TokenDocument | ActiveEffect} [parent] The parent entity of this counter.
     * @returns {boolean} False if the type does not exist, true if the selector is not set,
     *  the return value of the selector otherwise.
     */
    allowType(type, parent) {
        const counterType = counterTypes[type];
        if (!counterType) return false;

        const selector = counterType.selector;
        if (!selector) return true;

        parent = this.findParent(parent);
        if (!parent) return false;

        return selector(this, parent);
    }

    /**
     * Resolves the default type of this counter using its icon path.
     * @param {TokenDocument} [parent] The parent entity of this counter.
     * @returns {string} The name of the counter's default type.
     */
    getDefaultType(parent) {
        const defaultType = counterDefaults[this.path] ?? game.settings.get("statuscounter", "defaultType");
        if (defaultType && this.allowType(defaultType, parent)) return defaultType;
        return "statuscounter.simple";
    }

    /**
     * Modifies the type of the counter and resets its value using the old
     *  getter and the new setter.
     * @param {string} type The new type of the counter.
     * @param {TokenDocument | ActiveEffect} [parent] The parent entity of this counter.
     * @returns {Promise} A promise representing the asynchronous operation.
     */
    async changeType(type, parent) {
        if (this.type === type) return Promise.resolve();

        parent = this.findParent(parent);
        if (!parent) return Promise.resolve();

        const value = this.getValue(parent);
        this.type = type;
        if (value) return this.setValue(value, parent, true);
    }

    /**
     * Adds or replaces this counter for the given token. This function always
     *  updates without checking if any changes occured.
     * @param {TokenDocument} [parent] The parent entity of this counter.
     * @returns {Promise} A promise representing the asynchronous operation.
     */
    async update(parent) {
        const token = this.findParent(parent);
        if (!token) return Promise.resolve();

        const counters = EffectCounter.getCounters(token);
        const counterIndex = counters.findIndex(counter => this.path === counter.path);

        if (counterIndex < 0) counters.push(this);
        else counters[counterIndex] = this;

        return token.update({ flags: { statuscounter: { effectCounters: counters } } }, { diff: false });
    }

    /**
     * Removes this counter and its effect from its token.
     * @param {TokenDocument} [parent] The parent entity of this counter.
     * @returns {Promise} A promise representing the asynchronous operation.
     */
    async remove(parent) {
        const token = this.findParent(parent);
        if (!token) return Promise.resolve();

        const counters = EffectCounter.getCounters(token);
        const counterIndex = counters.findIndex(counter => this.path === counter.path);
        if (counterIndex < 0) return Promise.resolve();

        counters.splice(counterIndex, 1);
        return token.update({ flags: { statuscounter: { effectCounters: counters } } }, { diff: false });
    }

    /**
     * Retrieves the counter for the effect with the given icon path for the
     *  given token.
     * @param {TokenDocument} tokenDoc The token document to search for the path.
     * @param {string} iconPath The icon path of the effect to search the counter for.
     * @returns {EffectCounter} The counter object if it exists, undefined otherwise.
     */
    static findCounter(tokenDoc, iconPath) {
        const actorEffect = tokenDoc.actor?.effects.find(effect => effect.icon == iconPath);
        return actorEffect
            ? ActiveEffectCounter.getCounter(actorEffect)
            : EffectCounter.getCounters(tokenDoc).find(counter => counter.path === iconPath);
    }

    /**
     * Retrieves the value of the counter for the effect with the given icon
     *  path for the given token.
     * @param {TokenDocument} tokenDoc The token document to search for the path.
     * @param {string} iconPath The icon path of the effect to search the counter for.
     * @returns {number} The value of the counter if it exists, undefined otherwise.
     */
    static findCounterValue(tokenDoc, iconPath) {
        return EffectCounter.findCounter(tokenDoc, iconPath)?.getValue(tokenDoc);
    }

    /**
     * Retrieves the array of effect counters of the given token. If the token
     *  does not have the flag, creates a single stack counter per effect.
     *  Note that the counters are created from data copies, so modifications
     *  will not be applied until the counters are updated.
     * @param {TokenDocument} tokenDoc The token document to fetch the counters for.
     * @returns {EffectCounter[]} An array of effect counter objects.
     */
    static getCounters(tokenDoc) {
        const tokenCounters = tokenDoc.getFlag("statuscounter", "effectCounters");
        return Array.isArray(tokenCounters)
            ? tokenCounters.map(effectCounter => new EffectCounter(effectCounter))
            : tokenDoc.effects.map(effectPath => new EffectCounter(1, effectPath, tokenDoc));
    }

    /**
     * Retrieves an array of all simple and active effect counters of the given
     *  token. Missing counters are added, but not updated.
     *  Note that the counters are created from data copies, so modifications
     *  will not be applied until the counters are updated.
     * @param {TokenDocument} token The token document to fetch the counters for.
     * @returns {EffectCounter[]} An array of (active and regular) effect counter and objects.
     */
    static getAllCounters(token) {
        return EffectCounter.getCounters(token).concat(ActiveEffectCounter.getCounters(token));
    }

    /**
     * Removes all effects from the token. This will also remove permanent
     *  active effects from the actor, but retain temporary ones.
     * @param {TokenDocument} tokenDoc The token to remove effects from.
     * @returns {Promise} A promise representing the removal update.
     */
    static async clearEffects(tokenDoc) {
        if (tokenDoc.getFlag("statuscounter", "effectCounters")?.length) {
            await tokenDoc.setFlag("statuscounter", "effectCounters", []);
        }

        const actor = tokenDoc.actor;
        if (!actor) return;
        return actor.deleteEmbeddedDocuments("ActiveEffect", actor.data.effects.map(effect => effect.id));
    }

    /**
     * Refreshes the given counters for the given token. Note that this will
     *  only redraw existing counters and not create any new rendering objects.
     *  Because any counter update does this automatically, this function should
     *  only be called from custom counter type update logic.
     * @param {Token} token The token document to redraw the counters for.
     * @param {EffectCounter[]} counters The counters to refresh.
     */
    static redrawCounters(token, counters) {
        redrawEffectCounters(token, counters);
    }

    /**
     * Convenience function to draw all counters and refresh the combat UI.
     */
    static drawCounters() {
        for (let token of canvas.tokens.ownedTokens) token.drawEffects();
        if (ui.combat?.combat && ui.combat.combat.combatants.length > 0) ui.combat.render();
    }
}

/**
 * The map of ActiveEffect instances that have not been created yet.
 * @private
 */
const temporaryEffects = {};

/**
 * Represents a counter for a single active effect.
 * @extends EffectCounter
 */
class ActiveEffectCounter extends EffectCounter {
    /**
     * Initializes this counter. If the token does not have an active effect
     *  with the given icon path, a temporary effect is created.
     * @param {Object | number} value The initial counter value. For numbers, the counter is
     *  initialized as a simple counter. For an object, its properties are
     *  copied to the new EffectCounter and missing values are defaulted.
     * @param {string} path The icon path of the counter.
     * @param {TokenDocument | Actor | ActiveEffect} parent The token document, actor or effect that the counter is associated with.
     */
    constructor(value, path, parent) {
        if (!parent) {
            super(value, path, {}, true);
            return;
        }

        let token, actor, effect;
        if (parent instanceof TokenDocument) {
            token = parent;
            actor = parent.actor;
        } else if (parent instanceof Actor) {
            token = parent.token ?? { id: null, data: {} };
            actor = parent;
        } else if (parent instanceof ActiveEffect) {
            actor = parent.parent;
            token = actor?.token ?? { id: null, data: {} };
        }

        super(value, path, token, true);
        if (path && actor) {
            this.actorId = actor.id;
            effect = this.findParent(parent);

            // If it doesn't exist, create it here so it can be accessed before the first update.
            if (!effect) {
                let effectData = CONFIG.statusEffects.find(effect => effect.icon === this.path);

                const createData = duplicate(effectData);
                createData.label = game.i18n.localize(effectData.label);
                foundry.utils.setProperty(createData, "flags.core.statusId", effectData.id);
                delete createData.id;
                createData._id = foundry.utils.randomID();

                const cls = getDocumentClass("ActiveEffect");
                effect = new cls(createData, { parent: actor });
                effect._temporary = true;
                temporaryEffects[actor.uuid + '.' + path] = effect;
            }

            foundry.utils.setProperty(effect, "flags.statuscounter.counter", this);

            // Set type and count after the active effect is available.
            this.type = this.getDefaultType(effect);
            counterTypes[this.type]?.setter(this, value, effect);
        } else {
            // Make sure the type is set even for invalid counters.
            this.type = "statuscounter.simple";
        }
    }

    /**
     * Resolves the parent entity of this counter. If the parameter is a valid
     *  active effect, it is returned immediately. If the parameter is a token
     *  document, its active effects are searched for the icon path. Otherwise,
     *  both the document and its effects are resolved from the object tree.
     * @param {TokenDocument | Actor | ActiveEffect} [parent] The parent entity of this counter.
     *  If omitted, it will be resolved using the token ID and the icon path.
     * @returns {ActiveEffect} The parent active effect of the counter.
     * @override
     */
    findParent(parent) {
        let actor;
        if (parent) {
            if (parent instanceof ActiveEffect) return parent;
            if (parent instanceof Actor) actor = parent;
            else if (parent instanceof TokenDocument || parent instanceof Token) actor = parent.actor;
        } else {
            if (this.tokenId) actor = game.actors.tokens[this.tokenId];
            if (!actor && canvas.ready) actor = canvas.tokens?.get(this.tokenId)?.actor;
            if (!actor && this.actorId) actor = game.actors.get(this.actorId);
        }

        if (!actor) return;

        const tmpEffect = temporaryEffects[actor.uuid + '.' + this.path];
        if (tmpEffect) return tmpEffect;

        return actor.effects.find(effect => effect.icon === this.path);
    }

    /**
     * Retrieves the status effect ID from the flags of this parent's document.
     * @param {TokenDocument | Actor | ActiveEffect} parent The parent document of this counter.
     * @returns {string} The effect ID that this counter belongs to.
     */
    findStatusId(parent) {
        return this.findParent(parent)?.getFlag("core", "statusId");
    }

    /**
     * Adds or updates this counter from the associated active effect stored
     *  in the token's actor.
     * @param {ActiveEffect} [parent] The parent entity of this counter.
     * @returns {Promise} A promise representing the asynchronous operation.
     * @override
     */
    async update(parent) {
        const effect = this.findParent(parent);
        if (!effect) return Promise.resolve();

        if (effect._temporary) {
            delete temporaryEffects[effect.parent.uuid + '.' + this.path];
            foundry.utils.setProperty(effect._source, "flags.statuscounter.counter", this);
            const cls = getDocumentClass("ActiveEffect");
            const actorEffect = await cls.create(effect.toObject(), { parent: effect.parent });

            // Provide compatibility with Starfinder.
            if (game.system.id === "sfrpg" && actorEffect.parent instanceof game.actors.documentClass) {
                await actorEffect.parent.setCondition(this.findStatusId(parent), true);
            }
            return;
        }

        return effect.setFlag("statuscounter", "counter", this);
    }

    /**
     * Removes this counter and its effect from its token's actor.
     * @param {ActiveEffect} [parent] The parent entity of this counter.
     * @returns {Promise} A promise representing the asynchronous operation.
     * @override
     */
    async remove(parent) {
        const effect = this.findParent(parent);
        if (!effect) return Promise.resolve();

        if (effect._temporary) {
            delete temporaryEffects[effect.parent.uuid + '.' + this.path];
        } else {
            await effect.delete();

            // Provide compatibility with Starfinder.
            if (game.system.id === "sfrpg" && effect.parent instanceof game.actors.documentClass) {
                await effect.parent.setCondition(this.findStatusId(parent), false);
            }
        }
    }

    /**
     * Retrieves the counter for the effect with the given ID for the given actor.
     * @param {Actor} actor The actor document to search for the effect.
     * @param {string} statusId The status ID of the effect to search the counter for.
     * @returns {ActiveEffectCounter?} The counter object if it exists, null otherwise.
     */
    static findCounter(actor, statusId) {
        const effect = actor.effects.find(effect => effect.getFlag("core", "statusId") === statusId);
        if (!effect) return null;
        return this.getCounter(effect);
    }

    /**
     * Retrieves the value of the counter for the effect with the given ID for
     *  the given actor.
     * @param {Actor} actor The actor document to search for the effect.
     * @param {string} statusId The status ID of the effect to search the counter for.
     * @returns {number} The value of the counter if it exists, undefined otherwise.
     */
    static findCounterValue(actor, statusId) {
        return ActiveEffectCounter.findCounter(actor, statusId)?.getValue(actor);
    }

    /**
     * Retrieves the counter of the given active effect.
     * @param {ActiveEffect} effect The active effect to retrieve the counter for.
     * @returns {ActiveEffectCounter?} The counter of the effect or null.
     */
    static getCounter(effect) {
        if (effect.getFlag("core", "overlay") || !effect.icon) return null;
        const counter = effect.getFlag("statuscounter", "counter");
        return counter ? new ActiveEffectCounter(counter) : new ActiveEffectCounter(1, effect.icon, effect);
    }

    /**
     * Retrieves the array of active effect counters of the token's actor. If
     *  the token does not have an actor, an empty array is returned. For each
     *  effect that does not have a counter, a single stack counter is created.
     * @param {TokenDocument | Actor} parent The token or actor to fetch the counters for.
     * @returns {ActiveEffectCounter[]} An array of effect counter objects.
     */
    static getCounters(parent) {
        const actor = parent instanceof TokenDocument || parent instanceof Token ? parent.actor : parent;
        if (!actor) return [];
        return actor.effects.map(effect => this.getCounter(effect)).filter(Boolean);
    }
}

/**
 * The map of counter types to their respective PIXI.TextStyle fonts.
 * @private
 */
const counterTypes = {};

/**
 * The map of icon paths to their default counter type.
 * @private
 */
const counterDefaults = {};

/**
 * Utility methods for manipulating counter types.
 */
class CounterTypes {
    /**
     * Retrieves the map of type names and their configurations.
     * @returns {Object} The font, getter, setter and selector for each type.
     */
    static get types() { return counterTypes; }

    /**
     * Retrieves the map of icon paths and their default type names.
     * @returns {Object} The default type for each icon.
     */
    static get defaults() { return counterDefaults; }

    /**
     * Adds a new type and associates a font that counters of that type will be 
     *  rendered with.
     * @param {String} type The fully qualified counter type to apply the font to. This name is
     *  kept internally, but localized for the user interface.
     * @param {Function} [valueGetter] The function to call when accessing the counter.
     *  It should take a single EffectCounter and its parent as input
     *  parameters and return a number.
     * @param {Function} [valueSetter] The function to call when changing the counter.
     *  It should take a single EffectCounter, a number and its parent
     *  as input parameters and return true if it should be updated or null if
     *  it should be removed.
     * @param {Function} [allowSelector] The function to call when determining which types can be selected.
     *  It should take a single EffectCounter and its parent as input parameters
     *  and return true if the type can be selected for that counter.
     *  If no function is provided, the type can always be selected.
     * @param {Function} [valueDisplay] The function to call when displaying the counter.
     *  It should take a single EffectCounter and its parent as input parameters
     *  and return a string.
     */
    static addType(type, valueGetter, valueSetter, allowSelector, valueDisplay) {
        if (type) {
            counterTypes[type] = {
                font: CONFIG.canvasTextStyle.clone(),
                getter: valueGetter ?? defaultGetValue,
                setter: valueSetter ?? defaultSetValue,
                display: valueDisplay ?? defaultGetDisplayValue,
                selector: allowSelector
            };
        }
        else {
            console.error("Type and font must not be empty.");
        }
    }

    /**
     * Changes the font for the given counter type.
     * @param {string} type The fully qualified counter type to apply the font to.
     * @param {PIXI.TextStyle} font The PIXI font to use for the type.
     */
    static setFont(type, font) {
        let counterType = counterTypes[type];
        if (counterType) counterType.font = font;
    }

    /**
     * Changes the default counter type for all effects with the given path.
     *  The types of existing counters will not change.
     * @param {string} path The icon path of the effect.
     * @param {string} type The fully qualified counter type.
     */
    static setDefaultType(path, type) {
        counterDefaults[path] = type;
    }
}

/**
 * Retrieves the counter's value.
 *  Default getter if the counter type doesn't specify its own.
 * @param {EffectCounter} counter The counter to get the value for.
 * @returns {number} The value of the counter.
 * @private
 */
function defaultGetValue(counter) {
    return counter.value;
}

/**
 * Retrieves the value that should be displayed when rendering the counter.
 * @param {EffectCounter} counter The counter to display the value for.
 * @param {TokenDocument | ActiveEffect} [parent] The parent entity of the counter.
 * @returns {string} The counter value if it is visible, an empty string otherwise.
 * @private
 */
function defaultGetDisplayValue(counter, parent) {
    return counter.visible ? counter.getValue(parent) : "";
}

/**
 * Sets the counter's value and updates its visibility.
 *  Default setter if the counter type doesn't specify its own.
 * @param {EffectCounter} counter The counter to set the value for.
 * @param {number} value The value to set.
 * @private
 */
function defaultSetValue(counter, value) {
    if (value <= 0) return null;

    let previousVisible = counter.visible;
    if (value === 1) {
        switch (game.settings.get("statuscounter", "displayOne")) {
            case "always":
                counter.visible = true;
                break;
            case "never":
                counter.visible = false;
                break;
            case "countdown":
                counter.visible = counter.value !== undefined;
                break;
        }
    } else {
        counter.visible = true;
    }

    if (counter.value === value && previousVisible === counter.visible) return false;

    counter.value = value;
    return true;
}
