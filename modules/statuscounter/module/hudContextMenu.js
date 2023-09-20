/**
 * Extension for the ContextMenu class to add the menu to the target's parent
 *  container instead of its children. This allows using the menu on buttons,
 *  icons or other elements that do not function as a container.
 */
export class HudContextMenu extends ContextMenu {
    /**
     * Position the menu after the target (instead of inside) and adjust the
     *  layout accordingly.
     * @override
     */
    _setPosition(html, target) {
        const targetRect = target[0].getBoundingClientRect();
        const parentRect = target[0].parentElement.getBoundingClientRect();

        // Insert after target and get the context bounds
        html.css("visibility", "hidden");
        html.insertAfter(target);
        const contextRect = html[0].getBoundingClientRect();

        // Determine whether to expand down or expand up
        const bottomHalf = targetRect.bottom > (window.innerHeight / 2);
        this._expandUp = bottomHalf && ((parentRect.bottom - targetRect.bottom) < contextRect.height);

        // Display the menu
        if (this._expandUp) {
            html.addClass("expand-up");
            html.css("bottom", parentRect.bottom - targetRect.top);
        } else {
            html.addClass("expand-down");
            html.css("top", targetRect.bottom - parentRect.top);
        }
        html.addClass("reset-font");
        html.css("left", targetRect.left - parentRect.left + 2);
        html.css("visibility", "");
        target.addClass("context");
    }
}