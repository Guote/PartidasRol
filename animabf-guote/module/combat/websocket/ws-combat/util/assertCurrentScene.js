import { ABFDialogs } from '../../../../dialogs/ABFDialogs.js';
export const assertCurrentScene = () => {
    const tgame = game;
    if (tgame.scenes?.current?.id !== tgame.scenes?.active?.id) {
        const message = tgame.i18n.localize('macros.combat.dialog.error.notInActiveScene.title');
        ABFDialogs.prompt(message);
        throw new Error(message);
    }
};
