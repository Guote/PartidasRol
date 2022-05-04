import { ABFDialogs } from "../../../../dialogs/ABFDialogs.js";
export const assertGMActive = () => {
    const tgame = game;
    if (!tgame.users?.find(u => u.isGM && u.active)) {
        const message = tgame.i18n.localize('macros.combat.dialog.error.noGMActive.title');
        ABFDialogs.prompt(message);
        throw new Error(message);
    }
};
