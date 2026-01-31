import { ABFDialogs } from "../../../../dialogs/ABFDialogs.js";
export function getSelectedToken(game) {
    const selectedTokens = game.canvas.tokens?.controlled ?? [];
    if (selectedTokens.length !== 1) {
        const msg = game.i18n.localize(selectedTokens.length > 0 ? 'anima.macros.combat.dialog.error.multipleSelectedToken.title' : 'anima.macros.combat.dialog.error.noSelectedToken.title');
        ABFDialogs.prompt(msg);
        throw new Error(msg);
    }
    return selectedTokens[0].document;
}
