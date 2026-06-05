/**
 * Attaches a click handler that opens the sheet for the item identified by `getId`.
 *
 * @param {jQuery} html - The rendered dialog HTML (jQuery object).
 * @param {string} selector - CSS selector for the button, e.g. ".open-spell-sheet".
 * @param {object} actor - The actor whose items collection is searched.
 * @param {function(): string|undefined} getId - Returns the item _id to look up.
 */
export function attachItemSheetHandler(html, selector, actor, getId) {
  html.find(selector).click(() => {
    const id = getId();
    if (!id) return;
    actor.items.get(id)?.sheet?.render(true);
  });
}
