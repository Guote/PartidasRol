import { ActiveEffectCounter, EffectCounter, CounterTypes } from "./api.js";
import { HudContextMenu } from "./hudContextMenu.js";

/**
 * The currently hovered token HUD entity and status icon element.
 */
var activeEffectHud, activeEffectHudIcon;

/**
 * Flag used to block multiple asynchronous create operations.
 */
var creationState = false;

/**
 * Applies keybinds to the given entity to change status counters. Which 
 *  methods are used depends on the configuration. Previously registered 
 *  handlers are unregistered wherever necessary.
 * @param {TokenHUD} entity The Foundry entity associated with the element.
 * @param {jQuery} html The HTML code of the element.
 */
export const registerKeybinds = function (entity, html) {
    let effectHud = html.find(".status-effects");
    if (!effectHud.length) return;

    if (game.settings.get("statuscounter", "rebindMouseButtons")) {
        effectHud.off("click contextmenu", ".effect-control");
        effectHud.on("click.statuscounter", ".effect-control", onEffectClick.bind(entity))
            .on("contextmenu.statuscounter", ".effect-control", onEffectRightClick.bind(entity));
    }

    onFirst(effectHud, "click.statuscounter", ".effect-control", onEffectCtrlClick);

    if (game.settings.get("statuscounter", "rebindNumberKeys")) {
        effectHud.on("mouseover.statuscounter", ".effect-control", onEffectMouseOver.bind(entity))
            .on("mouseout.statuscounter", ".effect-control", onEffectMouseOut.bind(entity));
    }

    createContextMenu(entity.object.document, html);
}

/**
 * Binds an event handler so that it is executed before other handlers on the
 *  same element. Note that handlers defined in the DOM can still run before it.
 * @param {jQuery} element The parent jQuery element to bind the listeners on.
 * @param {String} eventName The name and namespace of the event.
 * @param {String} selector The selector that the event will be active for.
 * @param {Function} eventHandler The handler of the event.
 */
function onFirst(element, eventName, selector, eventHandler) {
    element.on(eventName, selector, eventHandler);

    let handlers = jQuery._data(element[0]).events[eventName.split('.')[0]];
    handlers.unshift(handlers.pop());
}

/**
 * Add a custom context menu to the effect HUD. The menu contains an entry for
 *  each known counter type, allowing the user to change it.
 * @param {TokenDocument} token The token document associated with the HUD.
 * @param {jQuery} effectHud The jQuery element of the HUD.
 */
function createContextMenu(token, effectHud) {
    let entries = [];
    for (let counterType of Object.keys(CounterTypes.types)) {
        entries.push(
            {
                name: counterType,
                icon: "",
                condition: function (contextElement) {
                    let counter = EffectCounter.findCounter(token, contextElement.attr("src"));
                    if (!counter || !counter.allowType(counterType)) return false;

                    this.icon = counter.type === this.name
                        ? "<span class='current-counter-type' style='visibility: inherit;'>&bull;</span>"
                        : "<span class='current-counter-type'>&bull;</span>";
                    return true;
                },
                callback: function (contextElement) {
                    let counter = EffectCounter.findCounter(token, contextElement.attr("src"));
                    if (counter && counter.type !== this.name) {
                        counter.changeType(this.name, token);
                    }
                }
            });
    }

    new HudContextMenu(effectHud, ".effect-control.active", entries, { eventName: "ctrl-click" });
}

/**
 * Handles the click event on a status icon when the CTRL key is pressed by
 *  redrecting the event to a custom "ctrl-click" name and stopping propagation.
 * @param {jQuery.Event} event The mouse click event triggered by jQuery.
 */
function onEffectCtrlClick(event) {
    if (event.ctrlKey || event.metaKey) {
        $(event.currentTarget).trigger("ctrl-click");
        event.stopImmediatePropagation();
        event.preventDefault();
    }
}

/**
 * Handles the click event on a status icon. If the shift key is pressed, the 
 *  status is applied as overlay. Otherwise, the status counter is incremented 
 *  by 1 and the token is updated accordingly.
 * @param {jQuery.Event} event The mouse click event triggered by jQuery.
 */
function onEffectClick(event) {
    if (event.shiftKey) {
        const icon = event.currentTarget.getAttribute("src");
        this.object.toggleEffect(icon, { overlay: true });
        //this._onToggleEffect(event, { overlay: true });
    } else {
        return changeIconCounter(event, this, 1, true);
    }

}

/**
 * Handles the contextmenu event on a status icon by decrementing the status 
 *  counter by 1 and updating the token accordingly.
 * @param {jQuery.Event} event The mouse right click event triggered by jQuery.
 */
function onEffectRightClick(event) {
    if (ui.context) ui.context.close();
    changeIconCounter(event, this, -1, true);
}

/**
 * Handles the mouseover event onto a status icon to store the active entity so 
 *  that it can be accessed by the global key event handler.
 * @param {jQuery.Event} event The mouse over event triggered by jQuery.
 */
function onEffectMouseOver(event) {
    activeEffectHud = this;
    activeEffectHudIcon = event.currentTarget;
}

/**
 * Handles the mouseout event off a status icon to reset the active entity so 
 *  that it can no longer be accessed by the global key event handler.
 */
function onEffectMouseOut() {
    if (activeEffectHud === this) {
        activeEffectHud = activeEffectHudIcon = null;
    }
}

/**
 * Handles the keydown event for the currently active status icon HUD element. 
 *  If none is active or the key is not a digit, this handler returns 
 *  immediately. Otherwise, the pressed digit is set as the counter for the 
 *  active status icon and the associated token is updated accordingly.
 *  Note that this handler modifies the event target and stops propagation if 
 *  any counters are changed.
 * @param {jQuery.Event} event The key down event triggered by jQuery.
 */
export const onEffectKeyDown = function (event) {
    if (!activeEffectHud || !activeEffectHud.object.visible) return;

    let keyValue = parseInt(event.key);
    if (Number.isNaN(keyValue)) return;

    event.currentTarget = activeEffectHudIcon;
    event.stopPropagation();
    changeIconCounter(event, activeEffectHud, keyValue, false);
}

/**
 * Attempts to retreive the source image path from the event target.
 * @param {jQuery.Event} event The event triggered by jQuery.
 */
function findIconPath(event) {
    return $(event.currentTarget).attr("src");
}

/**
 * Modifies a status counter by adding, subtracting or setting the new value 
 *  based on the element associated with the event. If the status is inactive, 
 *  it is toggled or applied as an overlay (replicating the default Foundry 
 *  behavior).
 * @param {jQuery.Event} event The event triggered by jQuery.
 * @param {TokenHUD} tokenHud The Foundry entity associated with the event.
 * @param {Number} value The counter value to apply. This can be negative for incremental usage.
 * @param {Boolean} incremental Flag to indicate whether the value should be set or added.
 */
function changeIconCounter(event, tokenHud, value, incremental) {
    // Don't increment by 0
    if (incremental && value == 0) return;

    const iconPath = findIconPath(event);
    const token = tokenHud.object.document;
    const effectIsActive = token.effects.includes(iconPath);
    let effectCounter = EffectCounter.findCounter(token, iconPath);

    // Don't initialize with negative or 0 values
    if (value <= 0 && !effectCounter) {
        if (effectIsActive) {
            tokenHud._onToggleEffect(event);
        } else if (incremental) {
            tokenHud._onToggleEffect(event, { overlay: true });
        }
        return;
    }

    if (!effectCounter) {
        // Do not allow parallel execution of effect creation to prevent inconsistent data.
        if (creationState) return console.warn("statuscounter | Prevented parallel effect creation.");
        effectCounter = event.currentTarget.dataset.statusId
            ? new ActiveEffectCounter(value, iconPath, token)
            : new EffectCounter(value, iconPath, token);
        creationState = true;
        effectCounter.update(token).finally(() => creationState = false);
    } else {
        if (incremental) value += effectCounter.getValue(token) ?? 0;
        effectCounter.setValue(value, token);
    }
    return false;
}